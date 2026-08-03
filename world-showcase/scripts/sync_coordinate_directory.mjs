#!/usr/bin/env node
/** Sync the sealed POI coordinate directory into the IANLAN NextGen source. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SITE_ROOT = path.resolve(import.meta.dirname, '..');
const ROOT = path.resolve(SITE_ROOT, '..');
const SOURCE = path.join(
  ROOT,
  'docs/redevelopment/2026-07-29-poi-coordinate-directory',
);
const TARGET = path.join(SITE_ROOT, 'public/coordinates');
const REQUIRED = [
  'artifact-manifest.json',
  'poi-coordinate-directory.csv',
  'poi-coordinate-directory.html',
  'poi-coordinate-directory.json',
  'poi-coordinate-directory.pdf',
  'portal-summary.json',
  'report-qa.json',
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

const expectedTarget = path.join(SITE_ROOT, 'public', 'coordinates');
invariant(TARGET === expectedTarget, `Refusing unexpected sync target: ${TARGET}`);
for (const filename of REQUIRED) {
  invariant(
    fs.existsSync(path.join(SOURCE, filename)),
    `Missing coordinate report input: ${filename}`,
  );
}
const qa = JSON.parse(fs.readFileSync(path.join(SOURCE, 'report-qa.json'), 'utf8'));
invariant(qa.status === 'PASS', 'Coordinate report QA must pass before publication');
invariant(qa.counts.records === 1215, 'Coordinate report must contain all 1,215 records');
invariant(qa.counts.pdfPages === 135, 'Coordinate report PDF page count drifted');
invariant(
  qa.truthBoundary.passageWay.includes('proper name'),
  'PassageWay naming contract is missing',
);

const temporary = `${TARGET}.sync-${process.pid}`;
invariant(!fs.existsSync(temporary), `Temporary sync path already exists: ${temporary}`);
fs.mkdirSync(temporary, { recursive: true });
for (const filename of REQUIRED) {
  fs.copyFileSync(path.join(SOURCE, filename), path.join(temporary, filename));
}

if (fs.existsSync(TARGET)) {
  fs.rmSync(TARGET, { recursive: true });
}
fs.renameSync(temporary, TARGET);

const publication = {
  schemaVersion: 1,
  id: 'ianlan-nextgen-poi-coordinate-directory-publication',
  generatedAt: new Date().toISOString(),
  source: path.relative(ROOT, SOURCE),
  status: 'SYNCED',
  counts: qa.counts,
  files: REQUIRED.map((filename) => ({
    path: `public/coordinates/${filename}`,
    bytes: fs.statSync(path.join(TARGET, filename)).size,
    sha256: sha256File(path.join(TARGET, filename)),
  })),
};
fs.writeFileSync(
  path.join(TARGET, 'publication-manifest.json'),
  `${JSON.stringify(publication, null, 2)}\n`,
);
process.stdout.write(`${JSON.stringify({
  status: publication.status,
  records: publication.counts.records,
  pdfPages: publication.counts.pdfPages,
  files: publication.files.length + 1,
  target: path.relative(ROOT, TARGET),
}, null, 2)}\n`);
