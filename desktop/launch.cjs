const path = require('node:path');
const { spawn } = require('node:child_process');
const electronBinary = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, [path.join(__dirname, 'main.cjs'), ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
