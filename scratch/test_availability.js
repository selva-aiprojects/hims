const http = require('http');

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/hospital/doctors/f9c1663d-324d-4700-915a-36641c6ac17f/availability-rules',
  method: 'GET',
  headers: {
    'x-tenant-id': '71820db3-f8f1-4294-8c11-1dc66ab1056e',
    'Authorization': 'Bearer eyJJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoidGVzdEBleGFtcGxlLmNvbSIsInRlbmFudElkIjoiNzE4MjBkYjMtZjhmMS00Mjk0LThjMTEtMWRjNjZhYjEwNTZlIiwidHlwZSI6InRlbmFudCIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc3ODIzMjM5MSwiZXhwIjoxNzc0MjYxMTkxfQ.v_fteZvcOrWXeuDC_uwfQU6liZTToZ5meXrs09JZdM8"',
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log('Status code:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:', data);
    try {
      const jsonData = JSON.parse(data);
      console.log('Parsed JSON:', jsonData);
      console.log('Number of schedules:', jsonData.schedules?.length || 0);
    } catch (e) {
      console.log('Not JSON response');
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();
