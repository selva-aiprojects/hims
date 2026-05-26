process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { Pool } = require("pg");

async function checkTimeline() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const schema = "wellness_clinics___standard";

  try {
    // 1. Get first patient from the schema
    const patientRes = await pool.query(`SELECT id, name FROM "${schema}".patients LIMIT 1`);
    if (patientRes.rows.length === 0) {
      console.log("No patients found in schema", schema);
      return;
    }
    const patient = patientRes.rows[0];
    console.log("Found patient:", patient);

    // 2. Query encounters
    try {
      const encounters = await pool.query(`
        SELECT e.*, u.name as doctor_name
        FROM "${schema}".encounters e
        LEFT JOIN "${schema}".users u ON e.doctor_id = u.id
        WHERE e.patient_id = $1
        ORDER BY e.created_at DESC
      `, [patient.id]);
      console.log(`Encounters count: ${encounters.rows.length}`);
    } catch (e) {
      console.error("Encounters query failed:", e.message);
    }

    // 3. Query lab orders
    try {
      const labOrders = await pool.query(`
        SELECT l.*, u.name as doctor_name
        FROM "${schema}".lab_orders l
        LEFT JOIN "${schema}".users u ON l.doctor_id = u.id
        WHERE l.patient_id = $1
        ORDER BY l.created_at DESC
      `, [patient.id]);
      console.log(`Lab Orders count: ${labOrders.rows.length}`);
    } catch (e) {
      console.error("Lab Orders query failed:", e.message);
    }

    // 4. Query IPD admissions
    try {
      const admissions = await pool.query(`
        SELECT a.*, u.name as doctor_name, w.name as ward_name, b.bed_number
        FROM "${schema}".ipd_admissions a
        LEFT JOIN "${schema}".users u ON a.admitting_doctor_id = u.id
        LEFT JOIN "${schema}".wards w ON a.ward_id = w.id
        LEFT JOIN "${schema}".beds b ON a.bed_id = b.id
        WHERE a.patient_id = $1
        ORDER BY a.admitted_at DESC
      `, [patient.id]);
      console.log(`IPD Admissions count: ${admissions.rows.length}`);
    } catch (e) {
      console.error("Admissions query failed:", e.message);
    }

  } catch (err) {
    console.error("Error checking timeline:", err);
  } finally {
    await pool.end();
  }
}

checkTimeline();
