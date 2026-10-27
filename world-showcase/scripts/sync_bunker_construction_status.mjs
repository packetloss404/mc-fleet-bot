#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SOURCE_ROOT = path.resolve(REPO_ROOT, value(
  '--source',
  'docs/redevelopment/2026-08-22-bunker-construction-status',
));
const OUTPUT_ROOT = path.resolve(SITE_ROOT, value(
  '--out',
  'public/bunker-construction-status',
));
const REPORT = path.join(SOURCE_ROOT, 'bunker-construction-status.json');
const QA = path.join(SOURCE_ROOT, 'report-qa.json');
const MANIFEST = path.join(SOURCE_ROOT, 'artifact-manifest.json');

const invariant = (condition, message) => {
  if (!condition) throw new Error(`Bunker report sync rejected: ${message}`);
};
const readJson = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const sha256 = (filename) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');

for (const filename of [REPORT, QA, MANIFEST]) {
  invariant(fs.existsSync(filename), `missing ${path.relative(REPO_ROOT, filename)}`);
}
const report = readJson(REPORT);
const qa = readJson(QA);
const manifest = readJson(MANIFEST);
invariant(report.status === 'PASS_CURRENT_PHYSICAL_CONSTRUCTION_SEPARATED_FROM_DESIGN_AND_HISTORY',
  `report is not accepted (${report.status})`);
invariant(qa.status === 'PASS' && qa.passed === qa.total, 'machine QA is not fully PASS');
invariant(qa.report.sha256 === sha256(REPORT), 'QA/report hash binding drifted');
invariant(qa.manifest.sha256 === sha256(MANIFEST), 'QA/manifest hash binding drifted');
for (const artifact of manifest.artifacts) {
  const filename = path.join(SOURCE_ROOT, artifact.path);
  invariant(fs.existsSync(filename), `missing artifact ${artifact.path}`);
  invariant(sha256(filename) === artifact.sha256, `artifact drift ${artifact.path}`);
}

fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
fs.mkdirSync(path.dirname(OUTPUT_ROOT), { recursive: true });
fs.cpSync(SOURCE_ROOT, OUTPUT_ROOT, { recursive: true });

process.stdout.write(`${JSON.stringify({
  status: 'PASS_BUNKER_CONSTRUCTION_STATUS_SYNCED',
  source: path.relative(REPO_ROOT, SOURCE_ROOT),
  output: path.relative(SITE_ROOT, OUTPUT_ROOT),
  reportSha256: sha256(REPORT),
  artifactCount: manifest.artifacts.length,
}, null, 2)}\n`);
