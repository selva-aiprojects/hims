require('dotenv').config();
const { Pool } = require('pg');

async function patchMasters(schema) {
  const dbUrl = new URL(process.env.DATABASE_URL);
  dbUrl.searchParams.delete('sslmode');
  const pool = new Pool({ connectionString: dbUrl.toString(), ssl: { rejectUnauthorized: false } });

  try {
    console.log(`\n--- Patching Masters for: ${schema} ---`);

    // 1. Treatments
    await pool.query(`
      INSERT INTO "${schema}".treatments (name, price, cpt_code, estimated_duration, description) VALUES
      ('General Consultation', 500, '99213', 20, 'Routine outpatient consultation'),
      ('Specialist Consultation', 1000, '99214', 30, 'Senior consultant review'),
      ('Wound Dressing', 350, '12001', 15, 'Standard surgical dressing')
      ON CONFLICT DO NOTHING;
    `);

    // 2. Services
    await pool.query(`
      INSERT INTO "${schema}".services (name, price, category, service_code, tax_percent) VALUES
      ('Registration Fee', 100, 'Administrative', 'REG01', 0),
      ('Nursing Charges', 200, 'Clinical', 'NUR01', 0)
      ON CONFLICT DO NOTHING;
    `);

    // 3. Modes
    await pool.query(`
      INSERT INTO "${schema}".consultation_modes (name, surcharge_percent, is_virtual) VALUES
      ('Physical Visit', 0, FALSE),
      ('Video Consult', 10, TRUE)
      ON CONFLICT DO NOTHING;
    `);

    console.log('Patch Applied Successfully!');

  } catch (err) {
    console.error('Patch failed:', err.message);
  } finally {
    await pool.end();
  }
}

const target = process.argv[2] || 'mhgcl';
patchMasters(target);
