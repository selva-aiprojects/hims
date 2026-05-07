require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');

async function seedData() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  dbUrl.searchParams.delete('sslmode');
  const pool = new Pool({ connectionString: dbUrl.toString(), ssl: { rejectUnauthorized: false } });
  const schema = 'mhgcl';

  try {
    console.log(`\n--- Seeding Verification Data for Schema: ${schema} ---`);

    // 1. Create a Doctor
    const doctorId = crypto.randomUUID();
    const doctorEmail = 'drverify@mhgcl.com';
    await pool.query(`
      INSERT INTO "${schema}".users (id, name, email, password_hash, role, specialization, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET specialization = $6, is_active = $7
    `, [doctorId, 'Dr. Verify', doctorEmail, 'no-hash', 'doctor', 'Cardiology', true]);
    console.log(`✅ Doctor 'Dr. Verify' created/updated.`);

    // 2. Create a Ward
    const wardId = crypto.randomUUID();
    await pool.query(`
      INSERT INTO "${schema}".wards (id, name, type, capacity)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
    `, [wardId, 'Verification Ward', 'General', 5]);
    console.log(`✅ Ward 'Verification Ward' created.`);

    // 3. Create a Bed
    const bedId = crypto.randomUUID();
    await pool.query(`
      INSERT INTO "${schema}".beds (id, ward_id, bed_number, status)
      VALUES ($1, (SELECT id FROM "${schema}".wards WHERE name = 'Verification Ward' LIMIT 1), $2, $3)
      ON CONFLICT DO NOTHING
    `, [bedId, 'V-01', 'Vacant']);
    console.log(`✅ Bed 'V-01' created.`);

    // 4. Create a Patient
    const patientId = crypto.randomUUID();
    const mrn = 'MRN-VERIFY-001';
    await pool.query(`
      INSERT INTO "${schema}".patients (id, mrn, name, phone, gender, age)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [patientId, mrn, 'OPD Flow Test', '9988776655', 'Male', 35]);
    console.log(`✅ Patient 'OPD Flow Test' created.`);

    // 5. Create an Encounter (OPD Flow)
    const encounterId = crypto.randomUUID();
    await pool.query(`
      INSERT INTO "${schema}".encounters (id, patient_id, doctor_id, type, status, complaints)
      VALUES ($1, (SELECT id FROM "${schema}".patients WHERE name = 'OPD Flow Test' LIMIT 1), (SELECT id FROM "${schema}".users WHERE email = 'drverify@mhgcl.com' LIMIT 1), $2, $3, $4)
      ON CONFLICT DO NOTHING
    `, [encounterId, 'OPD', 'Completed', 'Routine checkup for flow verification']);
    console.log(`✅ OPD Encounter created.`);

    // 6. Create an IPD Admission (IPD Flow)
    const admissionId = crypto.randomUUID();
    await pool.query(`
      INSERT INTO "${schema}".ipd_admissions (id, patient_id, bed_id, ward_id, encounter_id, admitting_doctor_id, admission_reason, status)
      VALUES ($1, (SELECT id FROM "${schema}".patients WHERE name = 'OPD Flow Test' LIMIT 1), (SELECT id FROM "${schema}".beds WHERE bed_number = 'V-01' LIMIT 1), (SELECT id FROM "${schema}".wards WHERE name = 'Verification Ward' LIMIT 1), $2, (SELECT id FROM "${schema}".users WHERE email = 'drverify@mhgcl.com' LIMIT 1), $3, $4)
      ON CONFLICT DO NOTHING
    `, [admissionId, encounterId, 'Post-OPD observation', 'Admitted']);
    console.log(`✅ IPD Admission created.`);

    console.log('\n--- Seeding Complete! ---');

  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await pool.end();
  }
}

seedData();
