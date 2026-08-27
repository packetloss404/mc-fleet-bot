#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(SITE, '..');
const SOURCE = path.join(ROOT, 'world-showcase/public/c01-next-01-arrival-landing-wayfinding-as-built');
const TARGET = path.join(SITE, 'public/c01-next-01-arrival-landing-wayfinding-as-built');

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const fail = (x, m) => { if (!x) throw Error(`C01-NEXT-01 visual sync rejected: ${m}`); };
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

fail(fs.existsSync(SOURCE), `missing source ${rel(SOURCE)}`);

// Read all files first
const files = ['README.md', 'as-built-evidence.json', 'as-built-plan.svg', 'as-built-section.svg'];
const fileData = {};
for (const f of files) {
  const from = path.join(SOURCE, f);
  fileData[f] = fs.readFileSync(from);
}

// Clean target
if (fs.existsSync(TARGET)) {
  for (const f of fs.readdirSync(TARGET)) {
    fs.rmSync(path.join(TARGET, f), { recursive: true, force: true });
  }
}
fs.mkdirSync(TARGET, { recursive: true });

const copied = [];
for (const f of files) {
  const to = path.join(TARGET, f);
  fs.writeFileSync(to, fileData[f]);
  const srcHash = sha(path.join(SOURCE, f));
  const dstHash = sha(to);
  fail(srcHash === dstHash, `hash mismatch ${f}`);
  copied.push({ file: f, sha256: dstHash, bytes: fs.statSync(to).size });
}

const manifest = {
  schemaVersion: 1,
  id: 'C01-NEXT-01-VISUAL-SHOWCASE-2026-08-27',
  status: 'PASS_AS_BUILT_VISUAL_SYNCED',
  authority: { worldMutationAuthorized: false, routeOrEgressAuthorized: false },
  publication: { id: 'C01-NEXT-01', name: 'C01 arrival-corridor wayfinding cadence (9 sea_lantern inlays)', source: rel(SOURCE), target: rel(TARGET), files: copied },
};
fs.writeFileSync(path.join(TARGET, 'publication-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ status: manifest.status, files: copied.length }, null, 2));
