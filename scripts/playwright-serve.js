const { spawn } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';
const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'client');

function spawnProcess(cwd, args, name) {
  const proc = spawn(npmCmd, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
  });

  proc.on('exit', code => {
    if (code !== 0) {
      console.error(`${name} exited with code ${code}`);
      process.exit(code);
    }
  });

  proc.on('error', error => {
    console.error(`${name} failed to start:`, error);
    process.exit(1);
  });

  return proc;
}

const backend = spawnProcess(rootDir, ['start'], 'backend');
const frontend = spawnProcess(clientDir, ['run', 'dev', '--', '--port', '4173'], 'frontend');

function shutdown() {
  if (!backend.killed) backend.kill();
  if (!frontend.killed) frontend.kill();
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});
process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});
process.on('exit', shutdown);
