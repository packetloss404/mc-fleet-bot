#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  'data/exports/box/town-expansion-r1-final-2026-07-28',
);
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  '.html',
  '.json',
  '.md',
  '.pdf',
  '.png',
  '.svg',
  '.txt',
  '.yaml',
  '.yml',
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function ensure(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function copy(sourceRelative, targetRelative) {
  const source = path.join(ROOT, sourceRelative);
  const target = path.join(OUT, targetRelative);
  invariant(fs.existsSync(source), `Missing handoff source ${sourceRelative}`);
  invariant(fs.statSync(source).isFile(), `Handoff source is not a file: ${sourceRelative}`);
  invariant(
    fs.statSync(source).size <= MAX_FILE_BYTES,
    `Handoff source exceeds Box direct-upload limit: ${sourceRelative}`,
  );
  ensure(path.dirname(target));
  fs.copyFileSync(source, target);
}

function copyTree(sourceRelative, targetRelative) {
  const sourceRoot = path.join(ROOT, sourceRelative);
  invariant(fs.existsSync(sourceRoot), `Missing handoff directory ${sourceRelative}`);
  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    const sourceChild = path.join(sourceRelative, entry.name);
    const targetChild = path.join(targetRelative, entry.name);
    if (entry.isDirectory()) {
      copyTree(sourceChild, targetChild);
    } else if (
      entry.isFile()
      && ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    ) {
      copy(sourceChild, targetChild);
    }
  }
}

function hash(filename, algorithm) {
  return crypto.createHash(algorithm).update(fs.readFileSync(filename)).digest('hex');
}

invariant(
  !fs.existsSync(OUT) || fs.statSync(OUT).isDirectory(),
  `Handoff output is not a directory: ${path.relative(ROOT, OUT)}`,
);
ensure(OUT);

copyTree(
  'docs/redevelopment/2026-07-28-town-expansion',
  'documents/redevelopment/2026-07-28-town-expansion',
);
copyTree(
  'world-showcase/public/atlas/town-expansion',
  'media/maps',
);
copyTree(
  'world-showcase/public/screenshots/town-expansion',
  'media/exact-object-screenshots',
);

const machineArtifacts = [
  [
    'data/exports/town-expansion-media-2026-07-28/capture-manifest.json',
    'machine/media/capture-manifest.json',
  ],
  [
    'data/exports/town-expansion-media-2026-07-28/object-media-database-crosswalk.json',
    'machine/media/object-media-database-crosswalk.json',
  ],
  [
    'data/exports/town-expansion-media-2026-07-28/terminal-c39d-render-v6/capture-report.json',
    'machine/media/capture-report.json',
  ],
  [
    'data/world-review/town-expansion-r1-post-release-media-2026-07-28.json',
    'machine/acceptance/post-release-media-qa.json',
  ],
  [
    'data/world-review/town-expansion-r1-post-release-qa-2026-07-28.json',
    'machine/acceptance/post-release-qa.json',
  ],
  [
    'data/world-review/town-expansion-r1-database-closeout-dry-run-2026-07-28.json',
    'machine/database/database-closeout-dry-run.json',
  ],
  [
    'data/world-review/town-expansion-r1-database-closeout-2026-07-28.json',
    'machine/database/database-closeout.json',
  ],
  [
    'data/world-review/town-expansion-r1-database-publication-report-2026-07-28.json',
    'machine/database/database-publication-report.json',
  ],
  [
    'data/world-review/town-expansion-terminal-as-built-route-qa-20260728T1839Z.json',
    'machine/routes/terminal-as-built-route-qa.json',
  ],
  [
    'data/buildops/town-expansion-r1-2026-07-28.report.json',
    'machine/release/design-report.json',
  ],
  [
    'data/buildops/town-expansion-r1-2026-07-28.manifest.json',
    'machine/release/ownership-manifest.json',
  ],
  [
    'data/world-review/town-expansion-r1-atomic-transaction-full-source-restored-retry-20260728.json',
    'machine/release/base-transaction.json',
  ],
  [
    'data/world-review/town-expansion-r1-accessibility-repair-atomic-transaction-attempt2-20260728.json',
    'machine/release/supplement-1-accessibility.json',
  ],
  [
    'data/world-review/citizen-route-live-walk-leaf-clearance-atomic-transaction-20260728.json',
    'machine/release/supplement-2-leaf-clearance.json',
  ],
  [
    'data/world-review/town-expansion-terminal-provenance-and-ridge-recovery-committed-supplement-20260728T1839Z.json',
    'machine/release/supplement-3-terminal-recovery.json',
  ],
  [
    'data/world-review/town-expansion-artifact-manifest-2026-07-28.json',
    'machine/publication/artifact-manifest.json',
  ],
  [
    'data/knowledge-base/redevelopment-release-incidents.json',
    'machine/knowledge-base/release-incidents.json',
  ],
  [
    'data/knowledge-base/redevelopment-kb.report.json',
    'machine/knowledge-base/database-build-report.json',
  ],
  [
    'data/world-review/town-expansion-media-render-memory-remediation-20260728.json',
    'machine/remediation/media-render-memory.json',
  ],
  [
    'world-showcase/public/reports/master-plan-web-publication.json',
    'machine/publication/master-plan-web-publication.json',
  ],
  [
    'world-showcase/public/data/buildings.json',
    'machine/publication/site-buildings.json',
  ],
];

for (const [source, target] of machineArtifacts) copy(source, target);

const files = [];
for (const filename of fs.readdirSync(OUT, { recursive: true })) {
  const absolute = path.join(OUT, filename);
  if (!fs.statSync(absolute).isFile()) continue;
  const relative = filename.split(path.sep).join('/');
  if (relative === 'handoff-manifest.json') continue;
  const stat = fs.statSync(absolute);
  invariant(stat.size <= MAX_FILE_BYTES, `Oversize staged file: ${relative}`);
  files.push({
    path: relative,
    bytes: stat.size,
    sha1: hash(absolute, 'sha1'),
    sha256: hash(absolute, 'sha256'),
  });
}
files.sort((left, right) => left.path.localeCompare(right.path));

const maps = files.filter((entry) => entry.path.startsWith('media/maps/'));
const screenshots = files.filter(
  (entry) => entry.path.startsWith('media/exact-object-screenshots/'),
);
invariant(maps.length === 13, `Expected 13 maps, found ${maps.length}`);
invariant(
  screenshots.length === 340,
  `Expected 340 exact-object screenshots, found ${screenshots.length}`,
);

const manifest = {
  schemaVersion: 1,
  id: 'town-expansion-r1-final-box-handoff',
  generatedAtUtc: new Date().toISOString(),
  status: 'PASS_LOCAL_HANDOFF_PREPARED',
  release: {
    packageId: 'town-expansion-r1-2026-07-28',
    terminalSnapshotSha256:
      'c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751',
    postReleaseQaSha256:
      '7200a6d23e838d80f1c21fb5585a72434103056c71793073d68918885f083672',
    mediaQaSha256:
      'e9a287f9c2536ae81701604bd2232262ecb04a4567606da030baf833bfa01226',
    databaseSha256:
      '71876a7ecf73e90475a9b5047938e14f39ea0a20381dea8c5286582059f95f8a',
    sitesSourceCommit: '83902598c0fa6952f07b9600ddc0dafb00536925',
    sitesVersion: 6,
  },
  counts: {
    files: files.length,
    bytes: files.reduce((sum, entry) => sum + entry.bytes, 0),
    maps: maps.length,
    exactObjectScreenshots: screenshots.length,
    documents: files.filter((entry) => entry.path.startsWith('documents/')).length,
    machineArtifacts: files.filter((entry) => entry.path.startsWith('machine/')).length,
    filesOverDirectUploadLimit: 0,
  },
  files,
};
fs.writeFileSync(
  path.join(OUT, 'handoff-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
process.stdout.write(`${JSON.stringify({
  status: manifest.status,
  output: path.relative(ROOT, OUT),
  counts: manifest.counts,
}, null, 2)}\n`);
