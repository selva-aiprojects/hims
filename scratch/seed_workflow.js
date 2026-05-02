require('dotenv').config();
const { Pool } = require('pg');

async function seedWorkflow(schema) {
  const dbUrl = new URL(process.env.DATABASE_URL);
  dbUrl.searchParams.delete('sslmode');
  const pool = new Pool({ connectionString: dbUrl.toString(), ssl: { rejectUnauthorized: false } });

  try {
    console.log(`\n--- Seeding Workflow Data for: ${schema} ---`);

    // 1. Add Doctor
    const docRes = await pool.query(`
      INSERT INTO "${schema}".users (name, email, role, password_hash) 
      VALUES ('Dr. Sarah Connor', 'dr.sarah@hims.com', 'doctor', 'hashed')
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `);
    const doctorId = docRes.rows[0]?.id || (await pool.query(`SELECT id FROM "${schema}".users WHERE role='doctor' LIMIT 1`)).rows[0].id;

    // 2. Add Patients
    await pool.query(`
      INSERT INTO "${schema}".patients (mrn, name, phone, gender, age, address) VALUES
      ('MRN-2001', 'Arthur Morgan', '9998887771', 'Male', 35, 'Valentine'),
      ('MRN-2002', 'Sadie Adler', '9998887772', 'Female', 28, 'Colter')
      ON CONFLICT (mrn) DO NOTHING
    `);

    // 3. Create Encounters (Queue)
    const patients = await pool.query(`SELECT id, name FROM "${schema}".patients WHERE mrn IN ('MRN-2001', 'MRN-2002')`);
    
    for (const p of patients.rows) {
      await pool.query(`
        INSERT INTO "${schema}".encounters (patient_id, doctor_id, type, status, vitals, complaints)
        VALUES (
          '${p.id}', 
          '${doctorId}', 
          'OPD', 
          'Draft', 
          '{"bp": "120/80", "weight": "70", "temp": "98.6"}', 
          'General checkup for ${p.name}'
        )
      `);
    }

    console.log('Seeding Successful!');

  } catch (err) {
    console.error('Seeding failed:', err.message);
  } finally {
    await pool.end();
  }
}

const target = process.argv[2] || 'mhgcl';
seedWorkflow(target);
