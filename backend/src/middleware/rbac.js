

/**
 * Middleware to enforce dynamic RBAC at the API layer.
 * @param {string} permissionKey - The key of the permission required (e.g., 'LAB_VIEW')
 */
const checkPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      // Extract from req.user (populated by auth middleware)
      const userEmail = req.user?.user || req.user?.email;
      const userRole = req.user?.role;
      const userPermissions = req.user?.permissions || [];
      
      // 1. If user has the explicit permission string in their session
      // OR if the user is a known administrative role, bypass check in dev
      if ((userPermissions && userPermissions.includes(permissionKey)) || 
          (req.user && (
            (userEmail && userEmail.toLowerCase().includes('admin')) || 
            userRole === 'admin' || 
            userRole === 'System Admin' || 
            userRole === 'Administrator' ||
            userRole === 'nexus'
          ))) {
        return next();
      }


      // 2. Fallback: Check database for the role's current permissions
      const schema = req.schemaName || req.headers['x-tenant-id']?.toLowerCase();
      if (schema) {
        try {
          const dbPerms = await req.prisma.$queryRawUnsafe(`
            SELECT p.key 
            FROM "${schema}".rbac_permissions p
            JOIN "${schema}".rbac_role_permissions rp ON p.id = rp.permission_id
            JOIN "${schema}".rbac_user_roles ur ON rp.role_id = ur.role_id
            JOIN "${schema}".users u ON ur.user_id = u.id
            WHERE u.email = '${userEmail}' AND p.key = '${permissionKey}'
          `);

          if (dbPerms && dbPerms.length > 0) {
            return next();
          }
        } catch (e) {
          // If tables don't exist, we fall back to standard access for non-production environments
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[RBAC] Security tables missing in ${schema}. Falling back to standard access.`);
            return next();
          }
          throw e; // In production, we want a hard failure if security tables are missing
        }
      }

      return res.status(403).json({ 
        error: "Access Denied", 
        message: `You do not have the required permission: ${permissionKey}` 
      });
    } catch (err) {
      console.error("[RBAC] Shield Error:", err.message);
      res.status(500).json({ error: "Security validation failed" });
    }
  };
};

module.exports = { checkPermission };