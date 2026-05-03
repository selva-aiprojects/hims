

/**
 * Middleware to enforce dynamic RBAC at the API layer.
 * @param {string} permissionKey - The key of the permission required (e.g., 'LAB_VIEW')
 */
const checkPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const { user, permissions } = req;
      
      // 1. If user has the explicit permission string in their session
      if (permissions && permissions.includes(permissionKey)) {
        return next();
      }

      // 2. Fallback: Check database for the role's current permissions
      const schema = req.headers['x-tenant-id']?.toLowerCase();
      if (schema) {
        try {
          const dbPerms = await req.prisma.$queryRawUnsafe(`
            SELECT p.key 
            FROM "${schema}".rbac_permissions p
            JOIN "${schema}".rbac_role_permissions rp ON p.id = rp.permission_id
            JOIN "${schema}".rbac_user_roles ur ON rp.role_id = ur.role_id
            JOIN "${schema}".users u ON ur.user_id = u.id
            WHERE u.email = '${user}' AND p.key = '${permissionKey}'
          `);

          if (dbPerms && dbPerms.length > 0) {
            return next();
          }
        } catch (e) {
          console.warn(`[RBAC] Security tables missing in ${schema}. Falling back to standard access.`);
          return next(); 
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