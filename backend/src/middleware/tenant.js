const { getPrisma } = require("../config/prisma");

function tenant(req, res, next) {
  const tenantId = req.headers["x-tenant-id"] || req.body.facility || "tenant1";
  req.tenantId = tenantId;
  req.prisma = getPrisma(tenantId);
  next();
}

module.exports = { tenant };