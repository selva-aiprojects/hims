const fs = require('fs');
const lines = fs.readFileSync('client/src/modules/tenant/opd/OPDQueuePage.tsx', 'utf8').split('\n');
for (let i = 182; i < 192; i++) {
  console.log(`Line ${i + 1}: ${JSON.stringify(lines[i])}`);
}
