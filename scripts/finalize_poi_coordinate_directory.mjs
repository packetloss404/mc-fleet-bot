#!/usr/bin/env node
/** Validate and seal the generated POI coordinate directory after PDF printing. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  'docs/redevelopment/2026-07-29-poi-coordinate-directory',
);
const REQUIRED = [
  'poi-coordinate-directory.html',
  'poi-coordinate-directory.json',
  'poi-coordinate-directory.csv',
  'poi-coordinate-directory.pdf',
  'portal-summary.json',
];

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function writeJson(filename, value) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

for (const filename of REQUIRED) {
  if (!fs.existsSync(path.join(OUT, filename))) {
    throw new Error(`Missing required coordinate report artifact: ${filename}`);
  }
}

const report = JSON.parse(
  fs.readFileSync(path.join(OUT, 'poi-coordinate-directory.json'), 'utf8'),
);
const portal = JSON.parse(
  fs.readFileSync(path.join(OUT, 'portal-summary.json'), 'utf8'),
);
const pdfBuffer = fs.readFileSync(path.join(OUT, 'poi-coordinate-directory.pdf'));
const pdfPages = [
  ...pdfBuffer.toString('latin1').matchAll(/\/Type\s*\/Page\b/g),
].length;
if (pdfPages < 1) {
  throw new Error('Could not determine coordinate directory PDF page count');
}
report.counts.pdfPages = pdfPages;
portal.counts.pdfPages = pdfPages;
writeJson(path.join(OUT, 'poi-coordinate-directory.json'), report);
writeJson(path.join(OUT, 'portal-summary.json'), portal);
const html = fs.readFileSync(
  path.join(OUT, 'poi-coordinate-directory.html'),
  'utf8',
);
const csvLines = fs.readFileSync(
  path.join(OUT, 'poi-coordinate-directory.csv'),
  'utf8',
).trimEnd().split('\n');
const categoryTotal = Object.values(report.counts.byCategory)
  .reduce((sum, count) => sum + count, 0);
const checks = {
  sourceCount: report.records.length === report.counts.records,
  allSourceRecordsPresent: report.counts.records === 1215,
  uniqueIds: new Set(report.records.map((record) => record.id)).size === report.counts.records,
  categoryPartition: categoryTotal === report.counts.records,
  allCategoryGroupsPresent: report.categories.length === 6
    && report.categories.every((category) => html.includes(category.label)),
  allTpCommandsCopyReady: report.records.every(
    (record) => /^\/tp @s -?\d+ (?:~|-?\d+) -?\d+$/.test(record.reference.tp),
  ),
  relativeYIsExplicit: report.records.every(
    (record) => record.reference.y !== null || record.reference.tp.includes(' ~ '),
  ),
  portalCount: portal.records.length === report.counts.records,
  csvCount: csvLines.length - 1 === report.counts.records,
  htmlIsSearchable: html.includes('id="search"')
    && html.includes('navigator.clipboard.writeText'),
  sourceSnapshotBound: report.source.snapshot.sha256
    === 'c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751',
  pdfPresent: pdfBuffer.length > 100_000,
  pdfPagesPresent: report.counts.pdfPages === pdfPages && pdfPages > 1,
};
const status = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';
const qa = {
  schemaVersion: 1,
  id: 'ianlan-poi-coordinate-directory-qa-2026-07-29',
  generatedAt: new Date().toISOString(),
  status,
  checks,
  counts: report.counts,
  truthBoundary: report.truthBoundary,
};
writeJson(path.join(OUT, 'report-qa.json'), qa);
if (status !== 'PASS') {
  throw new Error(`Coordinate report QA failed: ${JSON.stringify(checks)}`);
}

const artifactNames = [...REQUIRED, 'report-qa.json'];
const manifest = {
  schemaVersion: 1,
  id: 'ianlan-poi-coordinate-directory-artifacts-2026-07-29',
  generatedAt: new Date().toISOString(),
  status: 'SEALED',
  source: report.source,
  counts: report.counts,
  artifacts: artifactNames.map((filename) => ({
    path: filename,
    bytes: fs.statSync(path.join(OUT, filename)).size,
    sha256: sha256File(path.join(OUT, filename)),
  })),
};
writeJson(path.join(OUT, 'artifact-manifest.json'), manifest);
process.stdout.write(`${JSON.stringify({
  status,
  records: report.counts.records,
  pdfPages,
  artifactCount: manifest.artifacts.length,
  out: path.relative(ROOT, OUT),
}, null, 2)}\n`);
