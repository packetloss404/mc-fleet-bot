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
const GENERATED_AT = value('--generated-at', '2026-08-22T16:32:00Z');

const PUBLIC_MAP = path.resolve(
  REPO_ROOT,
  value(
    '--public-map',
    'docs/masterplans/05-combined-zones/maps/empty-eight-r08am-public-retail-boh-sectional-map.png',
  ),
);
const CATALOG_ROOT = path.resolve(
  REPO_ROOT,
  value(
    '--catalog-root',
    'data/exports/world-catalog-empty-eight-r08am-20260822T163200Z',
  ),
);
const R08AL_MANIFEST = path.join(
  REPO_ROOT,
  'data/buildops/combined-zones-r08al-empty-eight-south-public-vacant-retail.release-manifest.json',
);
const R08AL_LEDGER = path.join(
  REPO_ROOT,
  'data/world-review/combined-zones-r08al-live-20260822T155850Z/evidence-ledger.json',
);
const R08AL_QA = path.join(
  REPO_ROOT,
  'data/world-review/combined-zones-r08al-live-20260822T155850Z/r08al-post-release-qa.json',
);
const R08AM_MANIFEST = path.join(
  REPO_ROOT,
  'data/buildops/combined-zones-r08am-empty-eight-restricted-theatre-private-club-annex.release-manifest.json',
);
const R08AM_LEDGER = path.join(
  REPO_ROOT,
  'data/world-review/combined-zones-r08am-live-20260822T161818Z/evidence-ledger.json',
);
const R08AM_QA = path.join(
  REPO_ROOT,
  'data/world-review/combined-zones-r08am-live-20260822T161818Z/r08am-post-release-qa.json',
);
const CATALOG_REPORT = path.join(CATALOG_ROOT, 'database-report.json');
const OUTPUT_ROOT = path.join(SITE_ROOT, 'public/empty-eight');
const OUTPUT_MAP = path.join(OUTPUT_ROOT, 'public-south-galleria.png');
const OUTPUT_CATALOG = path.join(OUTPUT_ROOT, 'catalog.json');
const OUTPUT_MANIFEST = path.join(OUTPUT_ROOT, 'publication-manifest.json');

const invariant = (condition, message) => {
  if (!condition) throw new Error(`Empty Eight publication rejected: ${message}`);
};
const readJson = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const sha256 = (filename) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename))
  .digest('hex');
const relative = (filename) => path.relative(REPO_ROOT, filename).split(path.sep).join('/');
const binding = (filename) => ({
  path: relative(filename),
  sha256: sha256(filename),
  bytes: fs.statSync(filename).size,
});
const writeJson = (filename, payload) => {
  fs.writeFileSync(filename, `${JSON.stringify(payload, null, 2)}\n`);
};

for (const filename of [
  PUBLIC_MAP,
  CATALOG_REPORT,
  R08AL_MANIFEST,
  R08AL_LEDGER,
  R08AL_QA,
  R08AM_MANIFEST,
  R08AM_LEDGER,
  R08AM_QA,
]) {
  invariant(fs.existsSync(filename), `missing input ${relative(filename)}`);
}

const png = fs.readFileSync(PUBLIC_MAP);
invariant(png.length >= 24 && png.toString('ascii', 1, 4) === 'PNG', 'public map is not PNG');
const mapDimensions = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
invariant(mapDimensions.width === 1344 && mapDimensions.height === 1344,
  `public map dimensions ${mapDimensions.width}x${mapDimensions.height} != 1344x1344`);
invariant(sha256(PUBLIC_MAP) === '9201f83c6671c6c8ee208f0d1c96f06e9562aa86008da77fa369c3aba399d69c',
  'reviewed public map identity drifted');

const r08alManifest = readJson(R08AL_MANIFEST);
const r08alLedger = readJson(R08AL_LEDGER);
const r08alQa = readJson(R08AL_QA);
const r08amManifest = readJson(R08AM_MANIFEST);
const r08amLedger = readJson(R08AM_LEDGER);
const r08amQa = readJson(R08AM_QA);
const catalogReport = readJson(CATALOG_REPORT);

invariant(r08alLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'R08AL ledger not accepted');
invariant(r08alQa.status === 'PASS_PUBLIC_VACANT_RETAIL_AND_RESTRICTED_BOH_COMMISSIONED',
  'R08AL post QA not accepted');
invariant(r08amLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'R08AM ledger not accepted');
invariant(r08amQa.status === 'PASS_RESTRICTED_THEATRE_PRIVATE_CLUB_ANNEX_COMMISSIONED',
  'R08AM post QA not accepted');
invariant(r08amLedger.postSnapshot?.completeSaveSha256
  === '0bcbba4fad530b8a5c22bbef295978cc4864270de652acba18372e445b584699',
'R08AM terminal complete-save identity drifted');
invariant(r08amQa.postSnapshot?.regionSha256
  === '30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f',
'R08AM terminal region identity drifted');
invariant(catalogReport.snapshot?.sha256 === r08amQa.postSnapshot.regionSha256,
  'fresh catalog is not bound to the accepted R08AM terminal region');

const publicAccess = r08alManifest.scope?.publicAccess;
const backOfHouse = r08alManifest.scope?.backOfHouse;
const bays = publicAccess?.publicBayRecords ?? [];
invariant(publicAccess?.accepted === true && publicAccess.publicBayCount === 11,
  'R08AL public program is not the accepted eleven-bay program');
invariant(bays.length === 11 && bays.every(({ publicStatus, occupied, tenantFitoutInstalled }) => (
  publicStatus === 'PUBLICLY_VIEWABLE_VACANT_SHELL'
  && occupied === false
  && tenantFitoutInstalled === false
)), 'public bay truth boundary drifted');
invariant(!bays.some(({ shellId }) => shellId === 'EE-R-S06')
  && publicAccess.retainedCappedSouthShellIds?.join(',') === 'EE-R-S06',
'S06 cap/public exclusion drifted');
invariant(backOfHouse?.nonPublic === true, 'R08AL BOH is not restricted');
invariant(r08amManifest.scope?.accessBoundary?.public === false
  && r08amManifest.scope?.accessBoundary?.restrictedAdultsOnly === true,
'R08AM annex public-access boundary drifted');
invariant(r08alManifest.scope?.retainedBoundaries?.utilityVentMechanismInterfacesOpened === false
  && r08alManifest.scope?.retainedBoundaries?.railOrPlatformBarrierOpened === false,
'closed-system interface truth drifted');

const publishedBays = bays.map((bay) => ({
  id: bay.shellId,
  status: bay.publicStatus,
  bounds: bay.publicBayBounds,
  portal: bay.portal,
  smokeDoor: bay.publicSmokeDoor,
  occupied: false,
  tenantFitoutInstalled: false,
  publicClaim: 'Viewable vacant shell; no tenant or retail operation is claimed.',
}));

fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
fs.copyFileSync(PUBLIC_MAP, OUTPUT_MAP);

const payload = {
  schemaVersion: 1,
  id: 'ianlan-nextgen-empty-eight-public-south-galleria-20260822',
  generatedAtUtc: GENERATED_AT,
  status: 'PUBLIC_SOUTH_GALLERIA_ACCEPTED_RESTRICTED_AREAS_CLOSED',
  title: 'The Empty Eight · South Galleria',
  summary: 'Two lit PF08 stairs open to eleven publicly viewable vacant shells. The retained S06 shell, all BOH space, and the deeper annex remain closed to the public.',
  publicProgram: {
    bayCount: publishedBays.length,
    bayIds: publishedBays.map(({ id }) => id),
    publicSmokeDoors: publicAccess.publicSmokeDoorCount,
    publicLights: 33,
    stairCount: publicAccess.stairs.length,
    stairs: publicAccess.stairs,
    entryFromAcceptedPf08Interior: publicAccess.entryFromAcceptedPf08Interior,
    gallerySegments: publicAccess.gallerySegments,
    bays: publishedBays,
  },
  closedBoundaries: [
    'EE-R-S06 remains capped.',
    'The BOH spine and every backroom remain restricted and non-public.',
    'The R08AM theatre/private-club annex remains restricted and non-public.',
    'North retail, future rail stubs, drainage, fire/service, utility/ventilation, and exterior interfaces remain closed.',
    'No tenant, occupant, retail operation, exterior egress, or accessible-route claim is made.',
  ],
  map: {
    href: '/empty-eight/public-south-galleria.png',
    title: 'Public south galleria and restricted BOH sectional map',
    dimensions: mapDimensions,
    source: binding(PUBLIC_MAP),
    rendering: {
      immutableSnapshot: relative(path.join(REPO_ROOT, r08amQa.postSnapshot.root)),
      center: { x: 1744, z: 150 },
      span: 224,
      scale: 6,
      yRange: { min: 40, max: 51 },
    },
  },
  catalog: {
    source: binding(CATALOG_REPORT),
    snapshotRegionSha256: catalogReport.snapshot.sha256,
    worldFeatureCount: catalogReport.databases.worldMap.tables.world_features,
    scanCount: catalogReport.databases.worldMap.tables.world_scans,
    observationCount: catalogReport.databases.worldMap.tables.feature_observations,
  },
  terminalSnapshot: {
    root: r08amQa.postSnapshot.root,
    completeSaveSha256: r08amQa.postSnapshot.completeSaveSha256,
    regionSha256: r08amQa.postSnapshot.regionSha256,
    completedReleaseIdentitySha256: r08amQa.completedReleaseIdentitySha256,
  },
  evidence: {
    r08alManifest: binding(R08AL_MANIFEST),
    r08alLedger: binding(R08AL_LEDGER),
    r08alPostQa: binding(R08AL_QA),
    r08amManifest: binding(R08AM_MANIFEST),
    r08amLedger: binding(R08AM_LEDGER),
    r08amPostQa: binding(R08AM_QA),
  },
  truthBoundary: {
    publicationScope: 'R08AL public south gallery and eleven vacant bay shells only',
    terminalEvidenceIncludesRestrictedAnnex: true,
    restrictedAnnexPublished: false,
    tenantOrRetailOperationClaimed: false,
    worldMutationPerformedByPublication: false,
  },
};

writeJson(OUTPUT_CATALOG, payload);
const publicationManifest = {
  schemaVersion: 1,
  id: 'ianlan-nextgen-empty-eight-publication-manifest-20260822',
  generatedAtUtc: payload.generatedAtUtc,
  status: 'READY_FOR_WEBSITE_BUILD',
  terminalCompleteSaveSha256: payload.terminalSnapshot.completeSaveSha256,
  assets: [binding(OUTPUT_MAP), binding(OUTPUT_CATALOG)],
  sourceCatalog: binding(CATALOG_REPORT),
  truthBoundary: payload.truthBoundary,
};
writeJson(OUTPUT_MANIFEST, publicationManifest);

process.stdout.write(`${JSON.stringify({
  status: publicationManifest.status,
  output: binding(OUTPUT_MANIFEST),
  assets: publicationManifest.assets,
  publicBayCount: publishedBays.length,
  catalogSnapshot: catalogReport.snapshot.sha256,
}, null, 2)}\n`);
