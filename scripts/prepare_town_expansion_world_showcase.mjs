#!/usr/bin/env node
/**
 * Publish the accepted Town Expansion evidence into the existing Sites app.
 *
 * This is a read-only release consumer. It requires the complete canonical
 * capture report, media QA, consolidated post-release QA, and database
 * publication report to pass before it copies any final evidence.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function value(flag, fallback) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function resolveRoot(filename) {
  return path.isAbsolute(filename) ? filename : path.resolve(ROOT, filename);
}

function relativeRoot(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function ensure(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function copy(source, target) {
  invariant(fs.existsSync(source), `missing publication source ${relativeRoot(source)}`);
  ensure(path.dirname(target));
  fs.copyFileSync(source, target);
}

function writeJson(filename, valueToWrite) {
  ensure(path.dirname(filename));
  fs.writeFileSync(filename, `${JSON.stringify(valueToWrite, null, 2)}\n`);
}

function slug(valueToSlug) {
  return String(valueToSlug)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(valueToEscape) {
  return String(valueToEscape)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const paths = {
  site: resolveRoot(value('--site', 'world-showcase')),
  manifest: resolveRoot(value(
    '--manifest',
    'data/exports/town-expansion-media-2026-07-28/capture-manifest.json',
  )),
  crosswalk: resolveRoot(value(
    '--crosswalk',
    'data/exports/town-expansion-media-2026-07-28/'
      + 'object-media-database-crosswalk.json',
  )),
  captureReport: resolveRoot(value(
    '--capture-report',
    'data/exports/town-expansion-media-2026-07-28/'
      + 'terminal-c39d-render-v4/capture-report.json',
  )),
  mediaQa: resolveRoot(value(
    '--media-qa',
    'data/world-review/town-expansion-r1-post-release-media-2026-07-28.json',
  )),
  postQa: resolveRoot(value(
    '--post-qa',
    'data/world-review/town-expansion-r1-post-release-qa-2026-07-28.json',
  )),
  databaseReport: resolveRoot(value(
    '--db-report',
    'data/world-review/'
      + 'town-expansion-r1-database-publication-report-2026-07-28.json',
  )),
  database: resolveRoot(value('--database', 'data/world-map.db')),
  dossier: resolveRoot(value(
    '--dossier',
    'docs/redevelopment/2026-07-28-town-expansion/master-plan.pdf',
  )),
};

for (const [label, filename] of Object.entries(paths)) {
  if (label === 'site' || label === 'dossier') continue;
  invariant(fs.existsSync(filename), `${label} does not exist: ${relativeRoot(filename)}`);
}

const manifest = readJson(paths.manifest);
const crosswalk = readJson(paths.crosswalk);
const captureReport = readJson(paths.captureReport);
const mediaQa = readJson(paths.mediaQa);
const postQa = readJson(paths.postQa);
const databaseReport = readJson(paths.databaseReport);
const manifestSha256 = sha256File(paths.manifest);
const crosswalkSha256 = sha256File(paths.crosswalk);

invariant(manifest.counts?.combinedCaptures === 1178, 'manifest is not the 1178-camera release');
invariant(manifest.counts?.maps === 13, 'manifest does not contain exactly 13 map shots');
invariant(crosswalk.objects?.length === 340, 'crosswalk does not contain 340 exact objects');
invariant(captureReport.status === 'PASS' && captureReport.passed === true, 'capture report failed');
invariant(captureReport.captureCount === 1178, 'capture report is incomplete');
invariant(captureReport.sourceManifestSha256 === manifestSha256, 'capture report manifest drift');
invariant(
  captureReport.cameraSelection?.mode === 'complete',
  'capture report is a shard, not the canonical complete sweep',
);
invariant(mediaQa.passed === true && /^PASS|ACCEPTED/.test(mediaQa.status), 'media QA failed');
invariant(postQa.passed === true && postQa.status === 'PASS', 'post-release QA failed');
invariant(databaseReport.passed === true && databaseReport.status === 'PASS', 'database report failed');
invariant(
  databaseReport.registry?.sha256 === crosswalkSha256,
  'database publication does not bind the selected crosswalk',
);

const snapshotSha256 = captureReport.snapshot?.sha256;
invariant(
  snapshotSha256
    && snapshotSha256 === crosswalk.postreleaseSnapshot?.sha256
    && snapshotSha256 === databaseReport.evidence?.postSnapshotSha256,
  'snapshot identity differs across media, registry, and database publication',
);

const outputRoot = resolveRoot(captureReport.outputDirectory);
const publicRoot = path.join(paths.site, 'public');
const atlasRoot = path.join(publicRoot, 'atlas', 'town-expansion');
const screenshotRoot = path.join(publicRoot, 'screenshots', 'town-expansion');
const reportRoot = path.join(publicRoot, 'reports');
const dataRoot = path.join(publicRoot, 'data');
ensure(atlasRoot);
ensure(screenshotRoot);
ensure(reportRoot);
ensure(dataRoot);

const capturesById = new Map(captureReport.captures.map((capture) => [
  capture.id,
  capture,
]));
for (const capture of captureReport.captures) {
  const filename = path.resolve(outputRoot, capture.output);
  invariant(fs.existsSync(filename), `${capture.id}: capture file is missing`);
  invariant(fs.statSync(filename).size === capture.bytes, `${capture.id}: byte count drift`);
  invariant(sha256File(filename) === capture.sha256, `${capture.id}: file hash drift`);
}

const familyLabels = {
  'town-core': 'Town core',
  'civic-pavilion-library-guild': 'Civic Pavilion, Library & Guild Hall',
  c01: 'C01 bunker complex',
  'owner-estate-portals': 'Owner estate & portal galleries',
  'gilded-owner-corridor': 'Gilded Raven & owner corridor',
  westlight: 'Westlight stadium & waterfront',
  mainstreet: 'MainStreet America',
  'oasis-rv': 'Oasis & RV district',
  'dsm-infobunker': 'DSM campus & InfoBunker',
  'data-district-concord': 'Data district & Concord',
  'cbe-soundstages': 'Concord Broadcast Exchange',
  'manager-vale': 'Manager Vale',
};

const mapCaptures = captureReport.captures.filter((capture) => (
  capture.id.startsWith('MAP-') && capture.id.endsWith('-PASS-1')
));
invariant(mapCaptures.length === 13, 'canonical pass does not contain 13 maps');
const districtMaps = [];
for (const capture of mapCaptures) {
  const source = path.resolve(outputRoot, capture.output);
  const destinationName = `${slug(capture.id.replace(/-PASS-1$/, ''))}.png`;
  const publicPath = `/atlas/town-expansion/${destinationName}`;
  copy(source, path.join(atlasRoot, destinationName));
  if (capture.id === 'MAP-WHOLE-WORLD-OVERVIEW-PASS-1') {
    copy(source, path.join(publicRoot, 'atlas', 'whole-world.png'));
  } else {
    districtMaps.push({
      number: String(districtMaps.length + 2).padStart(2, '0'),
      title: capture.role.replace(/ · evidence pass 1$/, ''),
      image: publicPath,
    });
  }
}

const database = new Database(paths.database, {
  readonly: true,
  fileMustExist: true,
});
let databaseRows;
try {
  databaseRows = database.prepare(`
    SELECT id, project_id, external_id, parent_id, name, kind, status,
           geometry_json, revision, observed_at
    FROM world_features
    WHERE project_id = 'town-expansion-r1'
    ORDER BY external_id, id
  `).all();
} finally {
  database.close();
}
invariant(databaseRows.length === 340, 'database does not contain the 340-object release');
const databaseByExternalId = new Map(databaseRows.map((row) => [
  row.external_id,
  row,
]));

const buildings = crosswalk.objects.map((object) => {
  const pair = object.capturePairs?.[0];
  invariant(pair?.pass1CameraId, `${object.objectId}: missing pass-1 capture relation`);
  const capture = capturesById.get(pair.pass1CameraId);
  invariant(capture, `${object.objectId}: pass-1 capture is absent`);
  const source = path.resolve(outputRoot, capture.output);
  const destinationName = `${slug(object.objectId)}.png`;
  copy(source, path.join(screenshotRoot, destinationName));
  const row = databaseByExternalId.get(object.objectId);
  invariant(row, `${object.objectId}: accepted database row is absent`);
  const bounds = object.bounds;
  const familyId = object.familyIds?.[0] ?? 'town-core';
  return {
    id: `${row.project_id}:${row.external_id}`,
    featureId: row.id,
    externalId: row.external_id,
    name: row.name ?? object.name,
    area: familyLabels[familyId] ?? familyId,
    kind: row.kind ?? object.kind,
    image: `/screenshots/town-expansion/${destinationName}`,
    floorplan: null,
    screenshot: `/screenshots/town-expansion/${destinationName}`,
    status: 'exact verified perspective',
    coordinates:
      `x ${bounds[0]}…${bounds[3]} · y ${bounds[1]}…${bounds[4]}`
      + ` · z ${bounds[2]}…${bounds[5]}`,
    note:
      `Accepted database object with an exact two-pass visual contract. `
      + `This card uses evidence pass 1; pass 2 remains in the release archive.`,
    sourceSnapshot: snapshotSha256,
    familyIds: object.familyIds,
    cameraId: capture.id,
    cameraSha256: capture.sha256,
  };
});

const galleryByFamily = new Map();
for (const object of buildings) {
  const familyId = object.familyIds?.[0] ?? 'town-core';
  if (!galleryByFamily.has(familyId)) {
    galleryByFamily.set(familyId, {
      title: object.name,
      area: object.area,
      image: object.image,
    });
  }
}
const releaseGallery = [...galleryByFamily.values()];

const reportCopies = [
  ['capture-manifest.json', paths.manifest],
  ['object-media-index.json', paths.crosswalk],
  ['object-media-database-crosswalk.json', paths.crosswalk],
  ['post-release-media-qa.json', paths.mediaQa],
  ['post-release-qa.json', paths.postQa],
  ['database-publication-report.json', paths.databaseReport],
  [
    'requirements-traceability.md',
    resolveRoot(
      'docs/redevelopment/2026-07-28-town-expansion/requirements-traceability.md',
    ),
  ],
  [
    'artifact-register.md',
    resolveRoot('docs/redevelopment/2026-07-28-town-expansion/artifact-register.md'),
  ],
  [
    'session-memory.md',
    resolveRoot('docs/redevelopment/2026-07-28-town-expansion/SESSION_MEMORY.md'),
  ],
];
for (const [destination, source] of reportCopies) {
  if (fs.existsSync(source)) copy(source, path.join(reportRoot, destination));
}
if (fs.existsSync(paths.dossier)) {
  copy(paths.dossier, path.join(reportRoot, 'master-plan.pdf'));
}
writeJson(path.join(reportRoot, 'features.json'), databaseRows.map((row) => ({
  ...row,
  geometry_json: JSON.parse(row.geometry_json),
})));

const databaseHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Town Expansion database publication</title>
<style>body{font:16px/1.55 system-ui;margin:0;background:#f4f1e8;color:#18221c}main{max-width:1080px;margin:auto;padding:48px 24px}h1{font-size:clamp(2rem,6vw,5rem);line-height:.95}table{border-collapse:collapse;width:100%;background:white}th,td{border:1px solid #c9c8bd;padding:10px;text-align:left}code{word-break:break-all}.ok{color:#087443;font-weight:800}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card{padding:18px;background:white;border:1px solid #c9c8bd}</style>
</head><body><main><p class="ok">PASS · READ-ONLY PUBLICATION</p><h1>What is in the database?</h1>
<p>The accepted Town Expansion release contributes 340 exact world-feature rows, one accepted scan, 340 observations, and ${databaseReport.publication.mediaRelations} exact media relations.</p>
<div class="grid"><div class="card"><b>${databaseReport.database.counts.worldFeatures}</b><br>all world features</div><div class="card"><b>${databaseReport.publication.features}</b><br>release features</div><div class="card"><b>${databaseReport.publication.observations}</b><br>release observations</div><div class="card"><b>${databaseReport.publication.mediaRelations}</b><br>media relations</div></div>
<h2>Publication identity</h2><table><tbody><tr><th>Database SHA-256</th><td><code>${escapeHtml(databaseReport.database.sha256)}</code></td></tr><tr><th>Snapshot SHA-256</th><td><code>${escapeHtml(snapshotSha256)}</code></td></tr><tr><th>Registry SHA-256</th><td><code>${escapeHtml(crosswalkSha256)}</code></td></tr><tr><th>Integrity</th><td>${escapeHtml(databaseReport.database.integrity)}</td></tr></tbody></table>
<h2>Release census</h2><table><thead><tr><th>Record class</th><th>Count</th></tr></thead><tbody><tr><td>Exact objects</td><td>340</td></tr><tr><td>Accepted scans</td><td>${databaseReport.publication.acceptedScans}</td></tr><tr><td>Feature observations</td><td>${databaseReport.publication.observations}</td></tr><tr><td>Paired visual relations</td><td>${databaseReport.publication.mediaRelations}</td></tr></tbody></table>
<p><a href="database-publication-report.json">Download the machine-readable publication report</a></p></main></body></html>`;
fs.writeFileSync(path.join(reportRoot, 'database-report.html'), databaseHtml);

const byKind = Object.fromEntries(
  [...new Set(buildings.map((object) => object.kind))].sort().map((kind) => [
    kind,
    {
      features: buildings.filter((object) => object.kind === kind).length,
      featuresWithAnyExistingScreenshot:
        buildings.filter((object) => object.kind === kind).length,
      featuresWithExactObjectScreenshot:
        buildings.filter((object) => object.kind === kind).length,
      buildings: kind === 'building'
        ? buildings.filter((object) => object.kind === kind).length
        : 0,
      buildingsWithExactFloorplan: 0,
      buildingsWithAnyExistingScreenshot: kind === 'building'
        ? buildings.filter((object) => object.kind === kind).length
        : 0,
      buildingsWithExactObjectScreenshot: kind === 'building'
        ? buildings.filter((object) => object.kind === kind).length
        : 0,
    },
  ]),
);
const buildingCount = buildings.filter((object) => object.kind === 'building').length;
const payload = {
  generatedAt: new Date().toISOString(),
  sourceGeneratedAt: captureReport.generatedAtUtc,
  snapshot: captureReport.snapshot,
  coverage: {
    features: databaseReport.database.counts.worldFeatures,
    featuresWithAnyExistingScreenshot: buildings.length,
    featuresWithExactObjectScreenshot: buildings.length,
    buildings: buildingCount,
    buildingsWithExactFloorplan: 0,
    buildingsWithAnyExistingScreenshot: buildingCount,
    buildingsWithExactObjectScreenshot: buildingCount,
    inventoriedMediaFiles: captureReport.captureCount,
    linkedInventoriedMediaFiles: databaseReport.publication.mediaRelations,
    byProject: {
      'town-expansion-r1': {
        features: buildings.length,
        featuresWithAnyExistingScreenshot: buildings.length,
        featuresWithExactObjectScreenshot: buildings.length,
        buildings: buildingCount,
        buildingsWithExactFloorplan: 0,
        buildingsWithAnyExistingScreenshot: buildingCount,
        buildingsWithExactObjectScreenshot: buildingCount,
      },
    },
    byKind,
  },
  buildings,
  districtMaps,
  releaseGallery,
  wave2Comparisons: [],
  release: {
    id: 'TOWN-EXPANSION-R1',
    status: 'PASS',
    packages: postQa.totals.packages,
    targetCells: postQa.totals.uniqueTargetCells,
    guardedOperations: postQa.totals.forwardReplGroups,
    routeTests: postQa.totals.routeTests,
    directionalRuns: postQa.totals.routeTests * 2,
    postScreenshots: captureReport.captureCount,
    importedFeatures: databaseReport.publication.features,
    databaseFeatures: databaseReport.database.counts.worldFeatures,
    exactBuildingScreenshots: buildingCount,
    exactBuildingFloorplans: 0,
    exactObjects: buildings.length,
    mapShots: mapCaptures.length,
    postSnapshotSha256: snapshotSha256,
    citizenLifecycleStatus: 'OPEN_FOLLOW_UP_NON_BLOCKING_FOR_ATLAS_RELEASE',
  },
};
writeJson(path.join(dataRoot, 'buildings.json'), payload);

process.stdout.write(`${JSON.stringify({
  status: 'PASS_SITE_PAYLOAD_PREPARED',
  site: relativeRoot(paths.site),
  snapshotSha256,
  databaseFeatures: payload.release.databaseFeatures,
  releaseFeatures: payload.release.importedFeatures,
  exactObjects: payload.release.exactObjects,
  exactScreenshotsCopied: buildings.length,
  mapsCopied: mapCaptures.length,
  galleryItems: releaseGallery.length,
  dossierCopied: fs.existsSync(paths.dossier),
}, null, 2)}\n`);
