/**
 * RBAC Middleware Factory
 * 
 * Usage:
 *   router.get('/lab/orders', requireRole(['lab_assistant', 'admin']), handler)
 *   router.post('/pharmacy/dispense', requireRole(['pharmacist', 'admin']), handler)
 * 
 * Role hierarchy:
 *   admin        – Full access to everything
 *   doctor       – OPD consultations, prescriptions, lab ordering
 *   lab_assistant – Lab orders queue, result entry only
 *   pharmacist   – Pharmacy inventory, prescription queue, dispensing
 *   receptionist – OPD registration, appointment management
 *   staff        – Read-only access to most modules
 */

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    // req.user is populated by the auth middleware
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({ 
        error: "Authentication required",
        code: "UNAUTHENTICATED"
      });
    }

    // Admin always passes
    if (userRole === 'admin' || allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({ 
      error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${userRole}`,
      code: "INSUFFICIENT_ROLE",
      requiredRoles: allowedRoles,
      currentRole: userRole
    });
  };
}

module.exports = { requireRole };