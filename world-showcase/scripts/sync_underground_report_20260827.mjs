#!/usr/bin/env node
/** Sync the 2026-08-27 underground navigation report into the IANLAN NextGen source. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SITE_ROOT = path.resolve(import.meta.dirname, '..');
const ROOT = path.resolve(SITE_ROOT, '..');
const SOURCE = path.join(ROOT, 'docs/redevelopment/2026-08-27-underground-navigation');
const TARGET = path.join(SITE_ROOT, 'public/underground');
const REQUIRED = [
  'artifact-manifest.json',
  'report-qa.json',
  'underground-navigation-report.html',
  'underground-navigation-report.pdf',
  'underground-inventory.json',
  'underground-access-audit.json',
  'screenshot-manifest.json',
];

const invariant = (condition, message) => { if (!condition) throw new Error(message); };
const sha256File = (filename) => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');

if (fs.existsSync(TARGET)) {
  for (const f of fs.readdirSync(TARGET)) {
    fs.rmSync(path.join(TARGET, f), { recursive: true, force: true });
  }
}
fs.mkdirSync(TARGET, { recursive: true });

for (const required of REQUIRED) {
  const from = path.join(SOURCE, required);
  invariant(fs.existsSync(from), `missing required artifact ${required}`);
  fs.copyFileSync(from, path.join(TARGET, required));
  invariant(sha256File(from) === sha256File(path.join(TARGET, required)), `hash mismatch after copy ${required}`);
}

console.log(JSON.stringify({
  status: 'PASS_UNDERGROUND_NAVIGATION_REPORT_2026_08_27_SYNCED',
  source: SOURCE.replace(ROOT + '/', ''),
  target: 'public/underground',
  artifacts: REQUIRED.length,
  sha256: sha256File(path.join(TARGET, 'artifact-manifest.json')),
}, null, 2));
