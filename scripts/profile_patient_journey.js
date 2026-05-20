require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { getPrisma } = require('../backend/src/config/prisma.js');

async function profile() {
  const prisma = getPrisma();
  try {
    const tenants = await prisma.$queryRawUnsafe('SELECT id, name, code, db_name FROM nexus.tenants');
    for (const tenant of tenants) {
      const schema = tenant.db_name;
      console.log(`\n--- Schema: ${schema} ---`);
      // encounters paginated query
      const pageSize = 50;
      const page = 1;
      const offset = (page - 1) * pageSize;
      const encountersQuery = `
        SELECT e.id, e.patient_id, e.doctor_id, e.status, e.type, e.created_at,
               p.name as patient_name, u.name as doctor_name,
               latest.event_type as latest_event, latest.start_time
        FROM "${schema}".encounters e
        JOIN "${schema}".patients p ON e.patient_id = p.id
        JOIN "${schema}".users u ON e.doctor_id = u.id
        LEFT JOIN LATERAL (
          SELECT ce.event_type, ce.created_at as start_time
          FROM "${schema}".consultation_events ce
          WHERE ce.encounter_id = e.id
          ORDER BY ce.created_at DESC
          LIMIT 1
        ) latest ON true
        WHERE e.status = 'Active'
        ORDER BY e.created_at ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      let t0 = Date.now();
      try {
        const rows = await prisma.$queryRawUnsafe(encountersQuery);
        console.log('Encounters query rows:', rows.length, 'took', Date.now() - t0, 'ms');
      } catch (e) {
        console.log('Encounters query failed:', e.message);
      }

      // ipd_admissions query
      const ipdQuery = `
        SELECT a.id, a.patient_id, a.admitted_at, p.name as patient_name, b.bed_number, w.name as ward_name
        FROM "${schema}".ipd_admissions a
        JOIN "${schema}".patients p ON a.patient_id = p.id
        LEFT JOIN "${schema}".beds b ON a.bed_id = b.id
        LEFT JOIN "${schema}".wards w ON a.ward_id = w.id
        WHERE a.status = 'Admitted'
        ORDER BY a.admitted_at DESC
        LIMIT ${pageSize}
      `;

      t0 = Date.now();
      try {
        const rows2 = await prisma.$queryRawUnsafe(ipdQuery);
        console.log('IPD admissions rows:', rows2.length, 'took', Date.now() - t0, 'ms');
      } catch (e) {
        console.log('IPD query failed:', e.message);
      }
    }
  } catch (err) {
    console.error('Profiling error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

profile();
