const { prisma } = require("../config/prisma");

async function tenant(req, res, next) {
  const tenantId = req.headers["x-tenant-id"] || req.body.facility || "tenant1";
  
  try {
    // 1. Resolve Tenant ID to DB Schema Name
    const tenants = await prisma.$queryRawUnsafe(`SELECT db_name, name FROM nexus.tenants WHERE id = '${tenantId}' OR code = '${tenantId}'`);
    
    if (tenants && tenants.length > 0) {
      const schemaName = tenants[0].db_name.toLowerCase();
      console.log(`[TENANT] Request for: ${tenants[0].name} | Schema: ${schemaName} | Header ID: ${tenantId}`);
      
      req.tenantId = tenantId;
      req.schemaName = schemaName;
      
      // Force search path as a fallback
      await prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);
      
      next();
    } else {
      console.warn(`[TENANT] Unknown Tenant ID received: ${tenantId}`);
      res.status(404).json({ error: "Tenant shard not found" });
    }
  } catch (err) {
    console.error("[TENANT] Middleware error:", err.message);
    next(err);
  }
}

module.exports = { tenant };