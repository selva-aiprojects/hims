/*
  Reconcile SHARD_Base_Schema.sql declarations against tenant schemas.
  Outputs missing tables, functions, triggers per schema.
*/
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const sqlPath = path.join(__dirname, '..', 'database', 'SHARD_Base_Schema.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('SHARD_Base_Schema.sql not found at', sqlPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // naive regexes to extract identifiers
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?\w+"?\.)?"?(\w+)"?/ig;
  const funcRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+"?(\w+)"?/ig;
  const triggerRegex = /CREATE\s+TRIGGER\s+"?(\w+)"?/ig;

  const tables = new Set();
  const funcs = new Set();
  const triggers = new Set();

  let m;
  while ((m = tableRegex.exec(sql)) !== null) tables.add(m[1]);
  while ((m = funcRegex.exec(sql)) !== null) funcs.add(m[1]);
  while ((m = triggerRegex.exec(sql)) !== null) triggers.add(m[1]);

  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to DB. Gathering tenant schemas...');
    const tenantRes = await client.query(`SELECT id, name, db_name FROM nexus.tenants`);
    const tenants = tenantRes.rows;

    // global functions present
    const funcList = Array.from(funcs);
    const funcStatus = {};
    if (funcList.length) {
      const q = `SELECT proname FROM pg_proc WHERE proname = ANY($1)`;
      const r = await client.query(q, [funcList]);
      const present = new Set(r.rows.map(x => x.proname));
      funcList.forEach(f => funcStatus[f] = present.has(f));
    }

    // triggers may be schema-specific; check information_schema.triggers
    const triggerList = Array.from(triggers);

    const tableList = Array.from(tables);

    for (const t of tenants) {
      const schema = t.db_name;
      console.log(`\n--- Tenant: ${t.name} (schema: ${schema}) ---`);

      // tables
      const missingTables = [];
      for (const tbl of tableList) {
        const r = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2 LIMIT 1`, [schema, tbl]);
        if (r.rowCount === 0) missingTables.push(tbl);
      }
      if (missingTables.length) console.log('Missing tables:', missingTables.join(', ')); else console.log('All declared tables present.');

      // triggers
      const missingTriggers = [];
      for (const trg of triggerList) {
        const r = await client.query(`SELECT 1 FROM information_schema.triggers WHERE trigger_schema = $1 AND trigger_name = $2 LIMIT 1`, [schema, trg]);
        if (r.rowCount === 0) missingTriggers.push(trg);
      }
      if (missingTriggers.length) console.log('Missing triggers:', missingTriggers.join(', ')); else console.log('Triggers present.');

      // functions: check presence in pg_proc across search_path; functions might exist in public or schema
      const missingFuncs = [];
      for (const fn of funcList) {
        const r = await client.query(`SELECT proname FROM pg_proc WHERE proname = $1 LIMIT 1`, [fn]);
        if (r.rowCount === 0) missingFuncs.push(fn);
      }
      if (missingFuncs.length) console.log('Missing functions (global):', missingFuncs.join(', ')); else console.log('Functions present (global).');
    }

  } catch (err) {
    console.error('Error during reconciliation:', err.message);
  } finally {
    await client.end();
  }
}

main();
