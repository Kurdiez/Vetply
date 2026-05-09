import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const nextBin = join(
  dirname(require.resolve('next/package.json')),
  'dist/bin/next',
);

function start() {
  const child = spawn(process.execPath, [nextBin, 'dev', '--port', '6238'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('close', (code, signal) => {
    if (signal === 'SIGINT' || signal === 'SIGTERM') {
      process.exit(code ?? 0);
    }
    console.error(
      `\n[next dev] exited (code ${code ?? 'unknown'}). Restarting in 1s…\n`,
    );
    setTimeout(start, 1000);
  });
}

start();
