/**
 * Nexus Login Validation Test
 * Run: node scratch/nexus_login_test.js
 * 
 * Tests:
 * 1. Master admin login → type=nexus → lands on /nexus/dashboard
 * 2. Verifies role = 'nexus', no menus array (static sidebar)
 * 3. Tests that a wrong password is rejected
 */
require('dotenv').config();
const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 4000;

function apiPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: API_HOST, port: API_PORT, path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const ok  = (m) => console.log(`  ✅ ${m}`);
const fail = (m) => console.log(`  ❌ ${m}`);
const sep  = () => console.log('─'.repeat(60));

async function main() {
  sep();
  console.log('🔐  NEXUS LOGIN VALIDATION TEST');
  console.log(`    API: http://${API_HOST}:${API_PORT}`);
  sep();

  let allPass = true;

  // ── TEST 1: Valid Nexus master login ──────────────────────────
  console.log('\n┌─ TEST 1: Master Nexus Login (admin@hims-sys.com)');
  const r1 = await apiPost('/api/auth/login', {
    type: 'nexus',
    email: 'admin@hims-sys.com',
    password: 'Admin@123'
  });

  if (r1.status === 200) {
    ok(`HTTP 200`);
    r1.data.role === 'nexus'         ? ok(`Role: nexus`) : (fail(`Role wrong: ${r1.data.role}`), allPass = false);
    r1.data.type === 'nexus'         ? ok(`Type: nexus`) : (fail(`Type wrong: ${r1.data.type}`), allPass = false);
    r1.data.landingPage === '/nexus/dashboard' ? ok(`Landing: /nexus/dashboard`) : (fail(`Landing wrong: ${r1.data.landingPage}`), allPass = false);
    r1.data.token                    ? ok(`JWT token issued`) : (fail(`No token`), allPass = false);
    !r1.data.menus || r1.data.menus.length === 0
      ? ok(`No dynamic menus (static sidebar — correct)`)
      : fail(`Unexpected menus array returned: ${r1.data.menus.length} items`);
    console.log(`│  Token preview: ${r1.data.token?.substring(0, 40)}...`);
  } else {
    fail(`Login failed (HTTP ${r1.status}): ${JSON.stringify(r1.data)}`);
    allPass = false;
  }
  console.log('└' + '─'.repeat(59));

  // ── TEST 2: Wrong password rejected ──────────────────────────
  console.log('\n┌─ TEST 2: Wrong password should be rejected');
  const r2 = await apiPost('/api/auth/login', {
    type: 'nexus',
    email: 'admin@hims-sys.com',
    password: 'WrongPassword123'
  });
  r2.status === 401
    ? ok(`Correctly rejected (HTTP 401)`)
    : (fail(`Should have returned 401, got ${r2.status}`), allPass = false);
  console.log('└' + '─'.repeat(59));

  // ── TEST 3: Nexus God-Key works for tenant login too ─────────
  console.log('\n┌─ TEST 3: Nexus God-Key as tenant admin login');
  const r3 = await apiPost('/api/auth/login', {
    type: 'tenant',
    facility: 'b7be95f1-98d5-4f0c-a8d0-02d8849ddf93', // Millenium Hospitals
    email: 'admin@hims-sys.com',
    password: 'Admin@123'
  });
  if (r3.status === 200) {
    ok(`HTTP 200`);
    r3.data.role === 'admin'         ? ok(`Role: admin (god-key bypasses to admin)`) : (fail(`Role: ${r3.data.role}`), allPass = false);
    r3.data.type === 'tenant'        ? ok(`Type: tenant`) : (fail(`Type: ${r3.data.type}`), allPass = false);
    console.log(`│  Tenant: ${r3.data.tenantName}`);
  } else {
    fail(`God-key tenant login failed (HTTP ${r3.status})`);
    allPass = false;
  }
  console.log('└' + '─'.repeat(59));

  sep();
  console.log(allPass ? '\n🎉  All Nexus tests passed!\n' : '\n⚠️   Some Nexus tests failed.\n');
  sep();
}

main().catch(console.error);
