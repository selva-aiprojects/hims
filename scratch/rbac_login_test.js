/**
 * RBAC Login API Test — Tests all 6 roles for Millenium Hospitals
 * Run: node scratch/rbac_login_test.js
 * 
 * Calls POST /api/auth/login for each role and validates
 * that the returned menus match the expected matrix.
 */

const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 4000;
const TENANT_ID = 'b7be95f1-98d5-4f0c-a8d0-02d8849ddf93'; // Millenium Hospitals

const EXPECTED = {
  'admin@mhgcl.com': {
    role: 'admin',
    menus: ['Dashboard', 'OPD Registration', "Doctor's Queue", 'Laboratory',
            'Pharmacy Dashboard', 'Stock Inventory', 'Prescription Queue',
            'Invoicing & Billing', 'Hospital Settings (Masters)', 
            'Branding & UI Settings', 'Staff & RBAC']
  },
  'doctor@mhgcl.com': {
    role: 'doctor',
    menus: ['Dashboard', "Doctor's Queue", 'Laboratory']
  },
  'nurse@mhgcl.com': {
    role: 'nurse',
    menus: ['Dashboard']
  },
  'pharmacist@mhgcl.com': {
    role: 'pharmacist',
    menus: ['Dashboard', 'Pharmacy Dashboard', 'Stock Inventory', 'Prescription Queue']
  },
  'labtech@mhgcl.com': {
    role: 'lab_tech',
    menus: ['Dashboard', 'Laboratory']
  },
  'reception@mhgcl.com': {
    role: 'receptionist',
    menus: ['Dashboard', 'OPD Registration']
  }
};

function apiPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
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

const sep = () => console.log('─'.repeat(65));
const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => console.log(`  ❌ ${msg}`);
const info = (msg) => console.log(`  ℹ️  ${msg}`);

async function testRole(email, password) {
  const expected = EXPECTED[email];
  console.log(`\n┌─ Testing: ${email}`);
  console.log(`│  Expected role: ${expected.role}`);

  let res;
  try {
    res = await apiPost('/api/auth/login', {
      type: 'tenant',
      facility: TENANT_ID,
      email,
      password
    });
  } catch (e) {
    fail(`Connection failed: ${e.message}`);
    console.log('└' + '─'.repeat(64));
    return { email, passed: false, error: e.message };
  }

  if (res.status !== 200) {
    fail(`Login failed (HTTP ${res.status}): ${JSON.stringify(res.data)}`);
    console.log('└' + '─'.repeat(64));
    return { email, passed: false, error: res.data?.error };
  }

  const { role, menus = [], tenantPlan } = res.data;
  
  // Role check (case-insensitive — backend may return ADMIN or admin)
  if (role?.toLowerCase() === expected.role.toLowerCase()) {
    pass(`Role: ${role} ✓`);
  } else {
    fail(`Role mismatch — got "${role}", expected "${expected.role}"`);
  }

  info(`Plan: ${tenantPlan} | Menus returned: ${menus.length}`);

  // Menu check
  const actualLabels = menus.map(m => m.label);
  let menuPass = true;

  // Check all expected menus are present
  for (const m of expected.menus) {
    if (actualLabels.includes(m)) {
      pass(`  Menu present: ${m}`);
    } else {
      fail(`  MISSING menu: ${m}`);
      menuPass = false;
    }
  }

  // Check no extra menus that shouldn't be there
  const unexpected = actualLabels.filter(m => !expected.menus.includes(m));
  if (unexpected.length > 0) {
    fail(`  EXTRA menus (should not be visible): ${unexpected.join(', ')}`);
    menuPass = false;
  }

  const passed = role === expected.role && menuPass;
  console.log(`│`);
  console.log(`│  ${passed ? '✅ PASS' : '❌ FAIL'} — ${email}`);
  console.log('└' + '─'.repeat(64));
  return { email, passed, role, menuCount: menus.length };
}

async function main() {
  sep();
  console.log('🔐  RBAC LOGIN API TEST — Millenium Hospitals');
  console.log(`    API: http://${API_HOST}:${API_PORT}`);
  console.log(`    Tenant: ${TENANT_ID}`);
  sep();

  const results = [];

  for (const [email] of Object.entries(EXPECTED)) {
    const result = await testRole(email, 'Admin@123');
    results.push(result);
  }

  sep();
  console.log('\n📋  SUMMARY:\n');
  let allPass = true;
  for (const r of results) {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status}  ${r.email.padEnd(30)} role: ${(r.role || 'N/A').padEnd(15)} menus: ${r.menuCount ?? 'N/A'}`);
    if (!r.passed) allPass = false;
  }

  sep();
  console.log(allPass ? '\n🎉  All roles passed RBAC validation!\n' : '\n⚠️   Some roles failed — check above for details.\n');
  sep();
}

main().catch(console.error);
