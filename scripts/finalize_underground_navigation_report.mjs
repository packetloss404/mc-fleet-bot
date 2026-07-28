#!/usr/bin/env node
/**
 * Validate and seal the generated underground-navigation report package.
 *
 * This finalizer is read-only with respect to Minecraft and the catalog
 * databases. It only validates generated files and writes package metadata.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { loadImage } from 'canvas';

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-underground-navigation',
);
const HTML = path.join(OUT, 'underground-navigation-report.html');
const PDF = path.join(OUT, 'underground-navigation-report.pdf');
const INVENTORY = path.join(OUT, 'underground-inventory.json');
const README = path.join(OUT, 'README.md');
const QA = path.join(OUT, 'report-qa.json');
const MANIFEST = path.join(OUT, 'artifact-manifest.json');

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function writeJson(filename, value) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(filename) : [filename];
  });
}

for (const required of [HTML, PDF, INVENTORY, README]) {
  if (!fs.existsSync(required)) {
    throw new Error(`Required report artifact is missing: ${path.relative(ROOT, required)}`);
  }
}

const inventory = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
const html = fs.readFileSync(HTML, 'utf8');
const localReferences = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((reference) => (
    !reference.startsWith('http://')
    && !reference.startsWith('https://')
    && !reference.startsWith('#')
  ));
const missingReferences = [...new Set(localReferences)].filter(
  (reference) => !fs.existsSync(path.join(OUT, reference)),
);

const mapFiles = walkFiles(path.join(OUT, 'maps'))
  .filter((filename) => filename.endsWith('.png'))
  .sort();
const screenshotFiles = walkFiles(path.join(OUT, 'screenshots'))
  .filter((filename) => filename.endsWith('.png'))
  .sort();
const imageDimensions = [];
for (const filename of [...mapFiles, ...screenshotFiles]) {
  const image = await loadImage(filename);
  imageDimensions.push({
    file: path.relative(OUT, filename),
    width: image.width,
    height: image.height,
    bytes: fs.statSync(filename).size,
    sha256: sha256File(filename),
  });
}

const pdfBuffer = fs.readFileSync(PDF);
const pdfHeaderValid = pdfBuffer.subarray(0, 5).toString('ascii') === '%PDF-';
const pdfPageCount = (
  pdfBuffer.toString('latin1').match(/\/Type \/Page\b/g) ?? []
).length;

const gates = {
  inventoryStatusPass: (
    inventory.status === 'READ_ONLY_NAVIGATION_REPORT'
    && inventory.physicalMutation === false
  ),
  expectedMapCount: mapFiles.length === inventory.counts.maps,
  expectedScreenshotCount: (
    screenshotFiles.length
    === inventory.counts.screenshots + inventory.counts.contactSheets
  ),
  allHtmlReferencesResolve: missingReferences.length === 0,
  allImagesReadable: imageDimensions.every(
    (image) => image.width > 0 && image.height > 0 && image.bytes > 0,
  ),
  pdfHeaderValid,
  pdfHasMultiplePages: pdfPageCount > 1,
  inventoryIncludesEntrances: inventory.counts.entranceAndAccessRecords > 0,
  c01IssueBoundaryPresent: (
    html.includes('ISSUE-002')
    && html.includes('CONTESTED')
    && html.includes('legacy MainStreet portal')
  ),
  noWorldMutationClaimPresent: html.includes(
    'No world command, RCON request, bot movement, database write, or live server mutation was made.',
  ),
};
const failedGates = Object.entries(gates)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);
if (failedGates.length) {
  throw new Error(`Underground report QA failed: ${failedGates.join(', ')}`);
}

const finalizedReadme = fs.readFileSync(README, 'utf8')
  .replace(
    'Status: **READ-ONLY REPORT COMPLETE — PDF/PORTAL PUBLICATION PENDING**',
    'Status: **REPORT PACKAGE COMPLETE — PORTAL PUBLICATION PENDING**',
  )
  .replace(
    '`underground-navigation-report.pdf` (generated after HTML validation)',
    `\`underground-navigation-report.pdf\` (${pdfPageCount} pages; generated after HTML validation)`,
  );
fs.writeFileSync(README, finalizedReadme);

const generatedAt = new Date().toISOString();
const qa = {
  schemaVersion: 1,
  reportId: 'ianlan-nextgen-underground-navigation',
  generatedAt,
  status: 'PASS',
  gates,
  failedGates,
  counts: {
    ...inventory.counts,
    htmlLocalReferences: localReferences.length,
    htmlUniqueLocalReferences: new Set(localReferences).size,
    pdfPages: pdfPageCount,
    generatedPngFiles: imageDimensions.length,
  },
  pdf: {
    file: path.relative(OUT, PDF),
    bytes: fs.statSync(PDF).size,
    sha256: sha256File(PDF),
  },
  missingReferences,
  imageDimensions,
};
writeJson(QA, qa);

const artifacts = walkFiles(OUT)
  .filter((filename) => filename !== MANIFEST)
  .sort()
  .map((filename) => ({
    file: path.relative(OUT, filename),
    bytes: fs.statSync(filename).size,
    sha256: sha256File(filename),
  }));
const manifest = {
  schemaVersion: 1,
  reportId: 'ianlan-nextgen-underground-navigation',
  generatedAt,
  status: 'PASS',
  root: path.relative(ROOT, OUT),
  artifactCount: artifacts.length,
  artifacts,
};
writeJson(MANIFEST, manifest);

console.log(JSON.stringify({
  status: 'PASS',
  report: path.relative(ROOT, OUT),
  maps: mapFiles.length,
  screenshotsAndContactSheets: screenshotFiles.length,
  htmlReferences: localReferences.length,
  pdfPages: pdfPageCount,
  artifacts: artifacts.length,
  manifest: path.relative(ROOT, MANIFEST),
  qa: path.relative(ROOT, QA),
}, null, 2));
