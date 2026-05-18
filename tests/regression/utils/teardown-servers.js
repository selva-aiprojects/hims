const { execSync } = require('child_process');

function pidsForPort(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    return [...new Set(output
      .split(/\r?\n/)
      .map(line => line.trim().split(/\s+/).pop())
      .filter(pid => pid && pid !== '0'))];
  } catch {
    return [];
  }
}

module.exports = async () => {
  if (process.platform !== 'win32') return;

  for (const port of [4000, 4173]) {
    for (const pid of pidsForPort(port)) {
      try {
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
      } catch {
        // The process may already be gone by the time taskkill runs.
      }
    }
  }
};
