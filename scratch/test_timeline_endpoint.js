const http = require('http');

const BASE_HOST = 'localhost';
const BASE_PORT = 4000;
const BASE_PATH = '/api';

function req(method, path, token, tenantId, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: BASE_HOST,
      port: BASE_PORT,
      path: `${BASE_PATH}${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) options.headers['x-tenant-id'] = tenantId;

    const r = http.request(options, (res) => {
      let chunks = '';
      res.on('data', (c) => chunks += c);
      res.on('end', () => {
        try {
          const parsed = chunks ? JSON.parse(chunks) : null;
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: chunks });
        }
      });
    });
    r.on('error', (e) => reject(e));
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  try {
    console.log('1) Fetching public tenants...');
    const tenantsRes = await req('GET', '/nexus/tenants/public');
    if (tenantsRes.status !== 200) throw new Error('Failed to fetch tenants: ' + JSON.stringify(tenantsRes));
    const tenant = (tenantsRes.body && tenantsRes.body[0]) || tenantsRes.body;
    if (!tenant) throw new Error('No tenant found in registry');
    const tenantId = tenant.id || tenant.code || tenant.dbName;
    console.log('  -> Using tenant:', tenantId);

    const adminEmail = 'admin@hims-sys.com';
    const adminPass = 'Admin@123';

    console.log('2) Logging in as tenant admin...');
    const loginRes = await req('POST', '/auth/login', null, null, {
      type: 'tenant',
      facility: tenantId,
      email: adminEmail,
      password: adminPass
    });
    if (loginRes.status !== 200) throw new Error('Login failed: ' + JSON.stringify(loginRes));
    const token = loginRes.body.token;
    console.log('  -> Received token, length:', token ? token.length : 0);

    console.log('3) Fetching patients...');
    const patientsRes = await req('GET', '/patients', token, tenantId);
    if (patientsRes.status !== 200) throw new Error('Failed to fetch patients: ' + JSON.stringify(patientsRes));
    const patients = patientsRes.body;
    if (!patients || patients.length === 0) {
      console.log('No patients found in DB');
      return;
    }
    const patient = patients[0];
    console.log('  -> chosen Patient:', patient.name, 'ID:', patient.id);

    console.log('4) Fetching timeline for patient...');
    const timelineRes = await req('GET', `/patients/${patient.id}/timeline`, token, tenantId);
    console.log('  -> GET Status:', timelineRes.status);
    console.log('  -> Timeline Results:');
    console.log(JSON.stringify(timelineRes.body, null, 2));

  } catch (err) {
    console.error('ERROR during API test:', err && err.message ? err.message : err);
  }
}

run();
