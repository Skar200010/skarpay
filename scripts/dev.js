import { spawn } from 'node:child_process';

function run(name, cmd, args, env = {}) {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: true, env: { ...process.env, ...env } });
  p.on('exit', (code) => console.log(`[${name}] exited ${code}`));
  return p;
}

console.log('Starting SkarPay dev (API + admin + checkout)...');
run('api', 'node', ['apps/api/src/index.js']);
run('admin', 'npm', ['run', 'dev', '--workspace', '@skarpay/admin']);
run('checkout', 'npm', ['run', 'dev', '--workspace', '@skarpay/checkout']);
