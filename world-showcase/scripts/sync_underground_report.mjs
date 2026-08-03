#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const SOURCE = path.join(
  REPO_ROOT,
  'docs/redevelopment/2026-07-28-underground-navigation',
);
const TARGET = path.join(SITE_ROOT, 'public/underground');
const SOURCE_MANIFEST = path.join(SOURCE, 'artifact-manifest.json');
const SOURCE_QA = path.join(SOURCE, 'report-qa.json');
const SOURCE_INVENTORY = path.join(SOURCE, 'underground-inventory.json');

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

for (const filename of [SOURCE_MANIFEST, SOURCE_QA, SOURCE_INVENTORY]) {
  invariant(fs.existsSync(filename), `Missing underground report input: ${filename}`);
}

const sourceManifest = JSON.parse(fs.readFileSync(SOURCE_MANIFEST, 'utf8'));
const sourceQa = JSON.parse(fs.readFileSync(SOURCE_QA, 'utf8'));
const inventory = JSON.parse(fs.readFileSync(SOURCE_INVENTORY, 'utf8'));
invariant(sourceManifest.status === 'PASS', 'Underground artifact manifest did not pass');
invariant(sourceQa.status === 'PASS', 'Underground report QA did not pass');
invariant(inventory.physicalMutation === false, 'Underground report is not read-only');

const expectedTarget = path.join(SITE_ROOT, 'public', 'underground');
invariant(TARGET === expectedTarget, `Refusing unexpected publication target: ${TARGET}`);
fs.rmSync(TARGET, { recursive: true, force: true });
fs.mkdirSync(TARGET, { recursive: true });
fs.cpSync(SOURCE, TARGET, { recursive: true });

for (const artifact of sourceManifest.artifacts) {
  const published = path.join(TARGET, artifact.file);
  invariant(fs.existsSync(published), `Published artifact is missing: ${artifact.file}`);
  invariant(
    fs.statSync(published).size === artifact.bytes,
    `Published artifact size drift: ${artifact.file}`,
  );
  invariant(
    sha256File(published) === artifact.sha256,
    `Published artifact hash drift: ${artifact.file}`,
  );
}

const systems = Object.entries(inventory.systems).map(([id, system]) => ({
  id,
  label: system.name,
  records: system.records,
}));
const featureCountsBySystem = Object.fromEntries(
  systems.map((system) => [system.id, system.records]),
);
const portalSummary = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  status: 'PASS_PORTAL_SUMMARY',
  counts: {
    ...inventory.counts,
    pdfPages: sourceQa.counts.pdfPages,
    featureCountsBySystem,
  },
  truthBoundary: inventory.truthBoundary,
  systems,
  entrances: inventory.entrances,
  c01Levels: inventory.c01.levels.map((level) => ({
    id: level.id,
    label: level.label,
    spaceCount: level.spaces.length,
  })),
  screenshots: inventory.screenshots,
};
fs.writeFileSync(
  path.join(TARGET, 'portal-summary.json'),
  `${JSON.stringify(portalSummary, null, 2)}\n`,
);

const publication = {
  schemaVersion: 1,
  id: 'ianlan-nextgen-underground-navigation-publication',
  generatedAtUtc: new Date().toISOString(),
  status: 'PASS_STATIC_ASSETS_PREPARED',
  source: {
    root: path.relative(REPO_ROOT, SOURCE),
    artifactManifestSha256: sha256File(SOURCE_MANIFEST),
    reportQaSha256: sha256File(SOURCE_QA),
  },
  publication: {
    root: path.relative(REPO_ROOT, TARGET),
    verifiedSourceArtifacts: sourceManifest.artifactCount,
    additionalPortalSummary: 'portal-summary.json',
  },
};
fs.writeFileSync(
  path.join(TARGET, 'publication-manifest.json'),
  `${JSON.stringify(publication, null, 2)}\n`,
);

process.stdout.write(`${JSON.stringify({
  status: publication.status,
  sourceArtifacts: sourceManifest.artifactCount,
  maps: inventory.counts.maps,
  screenshots: inventory.counts.screenshots,
  entrances: inventory.counts.entranceAndAccessRecords,
  target: path.relative(REPO_ROOT, TARGET),
}, null, 2)}\n`);
