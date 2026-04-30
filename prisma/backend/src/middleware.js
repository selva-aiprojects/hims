const jwt = require("jsonwebtoken");
const { getPrisma } = require("./prisma");

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.sendStatus(401);

  req.user = jwt.verify(token, "secret");
  next();
}

function tenant(req, res, next) {
  const tenantId = req.headers["x-tenant-id"];
  req.prisma = getPrisma(tenantId);
  next();
}

module.exports = { auth, tenant };