require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

async function resetPassword() {
  const newPassword = "Admin@123";
  const email = "admin@wellness.com";
  const schema = "wellness_hyd";

  // Use raw pg since Prisma needs adapter setup
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check current state
    const result = await pool.query(
      `SELECT id, email, password_hash FROM "${schema}".users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log(`No user found with email ${email} in schema ${schema}`);
      return;
    }

    const user = result.rows[0];
    console.log(`Found user: ${user.email}`);
    console.log(`Current password_hash: ${user.password_hash}`);

    // Check if current hash is valid bcrypt
    const isBcryptHash = user.password_hash && user.password_hash.startsWith("$2");
    console.log(`Current hash is valid bcrypt: ${isBcryptHash}`);

    if (!isBcryptHash) {
      console.log("\n*** ROOT CAUSE FOUND ***");
      console.log("The password_hash was stored as PLAIN TEXT instead of a bcrypt hash!");
      console.log("bcrypt.compare() cannot match a plain text value against itself.");
    } else {
      // Try matching the current hash with the password
      const matchesCurrent = await bcrypt.compare(newPassword, user.password_hash);
      console.log(`Does "${newPassword}" match current hash? ${matchesCurrent}`);
      if (matchesCurrent) {
        console.log("Password already matches! The issue might be elsewhere.");
        return;
      }
    }

    // Hash the password properly with bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`\nNew bcrypt hash: ${hashedPassword}`);

    // Update with proper bcrypt hash
    await pool.query(
      `UPDATE "${schema}".users SET password_hash = $1 WHERE LOWER(email) = LOWER($2)`,
      [hashedPassword, email]
    );

    console.log(`\n✅ Password updated successfully for ${email}`);
    console.log(`You can now log in with: ${email} / ${newPassword}`);

    // Verify
    const verify = await bcrypt.compare(newPassword, hashedPassword);
    console.log(`Verification: bcrypt.compare("${newPassword}", newHash) => ${verify}`);

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

resetPassword();
