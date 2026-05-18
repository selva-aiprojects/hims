const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../..');
const backendUrl = 'http://127.0.0.1:4000';
const clientUrl = 'http://127.0.0.1:4173';
const viteBin = path.join(
  rootDir,
  'client',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vite.cmd' : 'vite'
);

function waitForUrl(url, timeoutMs = 120000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, res => {
        res.resume();
        resolve();
      });

      req.on('error', () => {
        if (Date.now() - start >= timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
        } else {
          setTimeout(check, 500);
        }
      });

      req.setTimeout(3000, () => req.destroy());
    };

    check();
  });
}

function spawnServer(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  child.on('exit', code => {
    if (code !== 0) {
      process.exit(code);
    }
  });

  return child;
}

async function start() {
  const children = [];

  const backendAlreadyRunning = await new Promise(resolve => {
    http.get(backendUrl, () => resolve(true)).on('error', () => resolve(false));
  });

  if (!backendAlreadyRunning) {
    console.log('Starting backend server at', backendUrl);
    children.push(
      spawnServer('node', ['index.js'], {
        cwd: rootDir,
        env: { ...process.env, PORT: '4000' },
      })
    );
  } else {
    console.log('Backend already running at', backendUrl);
  }

  const clientAlreadyRunning = await new Promise(resolve => {
    http.get(clientUrl, () => resolve(true)).on('error', () => resolve(false));
  });

  if (!clientAlreadyRunning) {
    console.log('Starting client dev server at', clientUrl);

    if (fs.existsSync(viteBin)) {
      children.push(
        spawnServer(viteBin, ['--host', '0.0.0.0', '--port', '4173'], {
          cwd: path.join(rootDir, 'client'),
        })
      );
    } else {
      if (process.platform === 'win32') {
        children.push(
          spawnServer('cmd.exe', [
            '/c',
            'npm',
            '--prefix',
            'client',
            'run',
            'dev',
            '--',
            '--host',
            '0.0.0.0',
            '--port',
            '4173',
          ], {
            cwd: rootDir,
          })
        );
      } else {
        children.push(
          spawnServer('npm', ['--prefix', 'client', 'run', 'dev', '--', '--host', '0.0.0.0', '--port', '4173'], {
            cwd: rootDir,
          })
        );
      }
    }
  } else {
    console.log('Client dev server already running at', clientUrl);
  }

  const cleanup = () => {
    for (const child of children) {
      if (!child.killed) {
        child.kill('SIGINT');
      }
    }
  };

  const cleanupAndExit = () => {
    cleanup();
    setTimeout(() => process.exit(0), 500);
  };

  process.on('SIGINT', cleanupAndExit);
  process.on('SIGTERM', cleanupAndExit);
  process.on('exit', cleanup);

  await waitForUrl(backendUrl);
  await waitForUrl(clientUrl);

  console.log('Both backend and client servers are ready.');
}

start().catch(error => {
  console.error(error);
  process.exit(1);
});
