import { copyFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const bundledWorker = resolve('.sites-worker-bundle/worker.js');
const openNextWorker = resolve('.open-next/worker.js');

if (!existsSync(bundledWorker) || statSync(bundledWorker).size === 0) {
  throw new Error(`Wrangler did not produce a deployable worker at ${bundledWorker}`);
}

if (!existsSync(openNextWorker)) {
  throw new Error(`OpenNext did not produce its worker entrypoint at ${openNextWorker}`);
}

copyFileSync(bundledWorker, openNextWorker);

console.log(
  `Prepared the Sites worker entrypoint (${statSync(openNextWorker).size} bytes).`,
);
