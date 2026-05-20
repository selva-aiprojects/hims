require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set.');
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to DB. Checking for pg_stat_statements...');
    const ext = await client.query("SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'");
    if (ext.rowCount > 0) {
      console.log('pg_stat_statements present — fetching top queries by total_time/total_exec_time');
      // Try different column names across PG versions
      const candidates = [
        `SELECT query, calls, total_time as total_exec_time, mean_time as mean_exec_time, rows FROM pg_stat_statements ORDER BY total_time DESC LIMIT 25`,
        `SELECT query, calls, total_exec_time, mean_exec_time, rows FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 25`,
        `SELECT query, calls, total_time, mean_time, rows FROM pg_stat_statements ORDER BY total_time DESC LIMIT 25`
      ];
      let rows = null;
      for (const q of candidates) {
        try {
          rows = await client.query(q);
          break;
        } catch (e) {
          // try next
        }
      }
      if (!rows) {
        console.warn('Could not query pg_stat_statements with expected columns.');
      } else {
        console.log('Top queries (pg_stat_statements):');
        rows.rows.forEach((r, i) => console.log(i+1, r.calls, Math.round(r.total_exec_time || r.total_time || 0), 'ms', '-', r.query.replace(/\s+/g,' ').slice(0,200)));
      }
    } else {
      console.log('pg_stat_statements not available. Listing currently active long-running queries from pg_stat_activity');
      const q2 = `SELECT pid, now() - query_start AS duration, state, query
                  FROM pg_stat_activity
                  WHERE state <> 'idle' AND query NOT ILIKE '%pg_stat_activity%'
                  ORDER BY duration DESC
                  LIMIT 25`;
      const rows2 = await client.query(q2);
      console.log('Active queries:');
      rows2.rows.forEach((r,i) => console.log(i+1, r.duration, r.state, '-', r.query.replace(/\s+/g,' ').slice(0,200)));
    }
  } catch (err) {
    console.error('Error collecting slow queries:', err.message);
  } finally {
    await client.end();
  }
}

main();
