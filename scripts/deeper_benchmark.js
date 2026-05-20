require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { getPrisma } = require('../backend/src/config/prisma.js');

async function runQuery(prisma, sql) {
  const t0 = Date.now();
  await prisma.$queryRawUnsafe(sql);
  return Date.now() - t0;
}

async function benchmark() {
  const prisma = getPrisma();
  try {
    const tenants = await prisma.$queryRawUnsafe('SELECT id, name, code, db_name FROM nexus.tenants');
    for (const tenant of tenants) {
      const schema = tenant.db_name;
      console.log(`\n--- Schema: ${schema} ---`);
      const pageSize = 50;
      const page = 1;
      const offset = (page - 1) * pageSize;
      const encountersQuery = `
        SELECT e.id
        FROM "${schema}".encounters e
        ORDER BY e.created_at ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      const ipdQuery = `SELECT a.id FROM "${schema}".ipd_admissions a WHERE a.status = 'Admitted' ORDER BY a.admitted_at DESC LIMIT ${pageSize}`;

      const iterations = 10;
      const encTimes = [];
      const ipdTimes = [];
      for (let i=0;i<iterations;i++) {
        try { encTimes.push(await runQuery(prisma, encountersQuery)); } catch(e) { encTimes.push(null); }
        try { ipdTimes.push(await runQuery(prisma, ipdQuery)); } catch(e) { ipdTimes.push(null); }
      }
      const filterNums = arr => arr.filter(x => typeof x === 'number');
      const stats = arr => {
        const vals = filterNums(arr);
        if (!vals.length) return {count:0,min:null,max:null,avg:null};
        const min = Math.min(...vals); const max = Math.max(...vals); const avg = Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
        return {count:vals.length,min,max,avg};
      };
      console.log('Encounters (ms):', stats(encTimes));
      console.log('IPD admissions (ms):', stats(ipdTimes));
    }
  } catch (err) {
    console.error('Benchmark error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

benchmark();
