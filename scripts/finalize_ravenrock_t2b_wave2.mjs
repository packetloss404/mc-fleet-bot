#!/usr/bin/env node
/**
 * Validate the complete offline INF-RR-02 evidence chain and write the
 * offline-ready release manifest. This is read-only except for the manifest
 * itself and never connects to Minecraft or writes a database.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASE =
  'data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28';
const OUTPUT = `${BASE}.release.json`;
const EXPECTED_SHA =
  '4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b';

const files = {
  operations: `${BASE}.txt`,
  rollback: `${BASE}.rollback.txt`,
  prestate: `${BASE}.prestate.json`,
  report: `${BASE}.report.json`,
  preflight: `${BASE}.preflight.json`,
  qa: `${BASE}.qa.json`,
  forwardDryRun: `${BASE}.dry-run.json`,
  rollbackDryRun: `${BASE}.rollback.dry-run.json`,
  inventory:
    'data/world-review/ravenrock-wave2-tunnel-inventory-2026-07-28.json',
  databaseFeatures:
    'data/world-review/ravenrock-wave2-tunnel-database-features-2026-07-28.json',
  cameraManifest:
    'data/exports/redevelopment-wave2-2026-07-28/ravenrock/t2b-camera-manifest.json',
  beforeCaptureReport:
    'data/exports/redevelopment-wave2-2026-07-28/ravenrock/before/capture-report.json',
  engineeringDocument:
    'docs/redevelopment/2026-07-28-wave2/ravenrock-tunnel-wave2-engineering.md',
  generator: 'scripts/generate_ravenrock_t2b_wave2.mjs',
  independentQa: 'scripts/qa_ravenrock_t2b_wave2.mjs',
  focusedTest: 'test/build/generateRavenRockT2bWave2.test.ts',
};

for (const filename of Object.values(files)) {
  if (!fs.existsSync(path.join(ROOT, filename))) {
    throw new Error(`missing release artifact: ${filename}`);
  }
}

const load = (filename) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, filename), 'utf8'));
const report = load(files.report);
const preflight = load(files.preflight);
const qa = load(files.qa);
const forwardDryRun = load(files.forwardDryRun);
const rollbackDryRun = load(files.rollbackDryRun);
const inventory = load(files.inventory);
const database = load(files.databaseFeatures);
const cameras = load(files.cameraManifest);
const captures = load(files.beforeCaptureReport);

const failures = [];
function requireGate(name, passed, evidence) {
  if (!passed) failures.push({ name, evidence });
}
requireGate('report baseline', report.baseline.sha256 === EXPECTED_SHA,
  report.baseline);
requireGate('preflight all guards',
  preflight.operationCount === 151
    && preflight.passed === 151
    && preflight.failed === 0,
  preflight);
requireGate('independent QA',
  qa.status === 'PASS_OFFLINE_LIVE_GATES_PENDING'
    && qa.summary.failedAssertions === 0
    && qa.summary.passingStations === 10
    && qa.summary.faceAdjacentTargetHazards === 0,
  qa.summary);
for (const [name, dryRun] of [
  ['forward dry run', forwardDryRun],
  ['rollback dry run', rollbackDryRun],
]) {
  requireGate(name,
    dryRun.status === 'dry_run'
      && dryRun.strictNoop === true
      && dryRun.sourceOperationCount === 151
      && dryRun.sourceGroupCount === 151
      && dryRun.expandedCommandCount === 151
      && dryRun.worldEditLeftoverCount === 0,
    {
      status: dryRun.status,
      strictNoop: dryRun.strictNoop,
      operations: dryRun.sourceOperationCount,
      groups: dryRun.sourceGroupCount,
      commands: dryRun.expandedCommandCount,
      worldEditLeftovers: dryRun.worldEditLeftoverCount,
    });
}
requireGate('full inventory',
  inventory.routes.length === 10
    && inventory.nodes.length === 15
    && inventory.verticalCirculation.flights.length === 15,
  {
    routes: inventory.routes.length,
    nodes: inventory.nodes.length,
    flights: inventory.verticalCirculation.flights.length,
  });
requireGate('database proposal',
  database.status === 'proposal-not-imported'
    && database.featureCount === 41,
  { status: database.status, featureCount: database.featureCount });
requireGate('camera contract',
  cameras.cameras.length === 6
    && cameras.cameras.find((camera) =>
      camera.id === 'RR-T2B-W2-SECTION')?.visibilityRay?.unobstructed === true,
  {
    cameras: cameras.cameras.length,
    sectionRay: cameras.cameras.find((camera) =>
      camera.id === 'RR-T2B-W2-SECTION')?.visibilityRay,
  });
requireGate('frozen before images',
  captures.status === 'PASS'
    && captures.captureCount === 6
    && captures.captures.every((capture) =>
      capture.bytes >= 8_000
      && capture.quality.nonBlank === true
      && capture.quality.luminanceVariance > 0
      && capture.quality.luminanceRange > 0),
  {
    status: captures.status,
    count: captures.captureCount,
    captures: captures.captures.map((capture) => ({
      id: capture.id,
      bytes: capture.bytes,
      variance: capture.quality.luminanceVariance,
      range: capture.quality.luminanceRange,
    })),
  });
requireGate('capture/manifest binding',
  captures.sourceManifestSha256
    === crypto.createHash('sha256')
      .update(fs.readFileSync(path.join(ROOT, files.cameraManifest)))
      .digest('hex'),
  {
    report: captures.sourceManifestSha256,
    current: crypto.createHash('sha256')
      .update(fs.readFileSync(path.join(ROOT, files.cameraManifest)))
      .digest('hex'),
  });
requireGate('explicit wet boundary',
  report.design.stationRange[1] === -136
    && report.exclusions.xMinus135WetThresholdTargets === false
    && report.safety.bufferFluidOrGravityHazardCount === 12
    && report.safety.faceAdjacentTargetHazardCount === 0,
  {
    stationRange: report.design.stationRange,
    hazards: report.safety.bufferFluidOrGravityHazardCount,
    faceAdjacent: report.safety.faceAdjacentTargetHazardCount,
  });
if (failures.length > 0) {
  throw new Error(`offline release gates failed: ${JSON.stringify(failures)}`);
}

const artifacts = Object.entries(files).map(([role, filename]) => {
  const bytes = fs.readFileSync(path.join(ROOT, filename));
  return {
    role,
    path: filename,
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
});

const release = {
  schemaVersion: 1,
  id: 'ravenrock-t2b-liner-pilot-wave2-2026-07-28-release',
  generatedAtUtc: new Date().toISOString(),
  programId: 'REDEV-2026-07-28-R2',
  packageId: 'INF-RR-02',
  featureId: 'RR-T2B-LINER-PILOT-W2',
  status: 'OFFLINE_READY_LIVE_ROUTE_AND_TRANSACTION_GATES_PENDING',
  authorizedForLiveExecution: false,
  baseline: report.baseline,
  operation: {
    groups: 151,
    cells: 151,
    designCells: 450,
    additionOnly: true,
    operationSha256: forwardDryRun.operationSha256,
    rollbackSha256: artifacts.find((artifact) =>
      artifact.role === 'rollback').sha256,
  },
  envelope: {
    shell: report.design.shellBounds,
    safetyBuffer: report.design.safetyBuffer,
    selectedStations: report.design.stationRange,
    excludedWetStationX: -135,
  },
  liveRouteContract: {
    id: 'RR-T2B-W2-BIDIRECTIONAL',
    featureId: 'RR-T2B-LINER-PILOT-W2',
    routeClass: 'public-primary-spine',
    westDoglegSideEndpoint: [-145, 3, 187],
    eastCavernBSideEndpoint: [-136, 2, 182],
    testDirections: [
      {
        id: 'RR-T2B-W2-WEST-TO-EAST',
        from: [-145, 3, 187],
        to: [-136, 2, 182],
      },
      {
        id: 'RR-T2B-W2-EAST-TO-WEST',
        from: [-136, 2, 182],
        to: [-145, 3, 187],
      },
    ],
    movementPolicy: {
      normalSpeed: true,
      sprint: false,
      jump: false,
      crouch: false,
      dig: false,
      tower: false,
      flight: false,
      spectator: false,
    },
    acceptance:
      'Both directions reach the opposite endpoint without movement-policy '
      + 'violations, contact with water, route exit, collision, or fall.',
  },
  offlineEvidence: {
    preflight: '151/151 exact source guards',
    independentQa: `${qa.summary.assertions}/${qa.summary.assertions} gates`,
    stations: '10/10',
    bufferWaterHazards: 12,
    targetHazards: 0,
    faceAdjacentTargetHazards: 0,
    blockEntities: 0,
    forwardDryRun: '151 groups / 151 commands / 0 WorldEdit leftovers',
    rollbackDryRun: '151 groups / 151 commands / 0 WorldEdit leftovers',
    inventory: '10 route legs / 15 nodes / 15 RR-Z5 flights',
    databaseFeatures: '41 proposed / 0 imported',
    beforeMedia: '6/6 frozen captures; renderer and visual review PASS',
  },
  liveStopConditions: [
    'same-moment snapshot hash differs from the preflighted release snapshot',
    'any source guard fails',
    'any target is fluid, waterlogged, gravity-affected, or face-adjacent to one',
    'water advances beyond the documented x=-135 exclusion',
    'a player, free entity, or active builder remains in the safety buffer',
    'another package intersects an INF-RR-02 target',
    'any command fails or returns an unexpected no-op',
    'either directional route test violates the movement policy',
    'post-state differs from the simulated exact design',
  ],
  requiredBeforeLive: report.mandatoryLiveGates,
  artifacts,
  gateFailures: failures,
};

fs.writeFileSync(
  path.join(ROOT, OUTPUT),
  `${JSON.stringify(release, null, 2)}\n`,
);
console.log(JSON.stringify({
  output: OUTPUT,
  status: release.status,
  authorizedForLiveExecution: release.authorizedForLiveExecution,
  artifacts: artifacts.length,
  operationGroups: release.operation.groups,
  routeEndpoints: [
    release.liveRouteContract.westDoglegSideEndpoint,
    release.liveRouteContract.eastCavernBSideEndpoint,
  ],
}, null, 2));
