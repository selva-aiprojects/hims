function rbac(requiredRole) {
  return (req, res, next) => {
    if (!requiredRole) {
      return next();
    }

    const roles = req.user?.roles || [];
    if (!roles.includes(requiredRole)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
}

module.exports = { rbac };