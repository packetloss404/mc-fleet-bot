#!/usr/bin/env node
/** Independent, read-only acceptance audit for the Wave 2 R08 package. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

import {
  DetailedAnvilSnapshot,
  hashSnapshotDirectory,
} from './generate_mainstreet_redevelopment_r4_r5.mjs';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const ROOT = process.cwd();
const BASE = path.resolve(
  ROOT,
  'data/buildops/mainstreet-wave2-r08-2026-07-28',
);
const PLAN_PATH = path.resolve(
  ROOT,
  'docs/mainstreet-america/planning/redevelopment-wave2-r08.yaml',
);
const REPORT_PATH = `${BASE}.report.json`;
const FORWARD_PATH = `${BASE}.txt`;
const ROLLBACK_PATH = `${BASE}.rollback.txt`;
const PREFLIGHT_PATH = `${BASE}.preflight.json`;
const FORWARD_DRY_RUN_PATH = `${BASE}.forward-dry-run.json`;
const ROLLBACK_DRY_RUN_PATH = `${BASE}.rollback-dry-run.json`;
const MANIFEST_PATH = path.resolve(
  ROOT,
  'data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/'
    + 'same-camera-manifest.json',
);
const CAPTURE_PATH = path.resolve(
  ROOT,
  'data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/'
    + 'before-capture-report.json',
);
const OUTPUT_PATH = path.resolve(
  ROOT,
  process.argv[2]
    ?? 'data/world-review/mainstreet-wave2-r08-independent-qa-2026-07-28.json',
);
const MARKDOWN_PATH = OUTPUT_PATH.replace(/\.json$/, '.md');

function relative(filename) {
  return path.relative(ROOT, filename);
}

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function key3(x, y, z) {
  return `${x},${y},${z}`;
}

function baseName(state) {
  return String(state).split('[', 1)[0];
}

function splitMask(mask) {
  const output = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] === '[') depth += 1;
    else if (mask[index] === ']') depth -= 1;
    else if (mask[index] === ',' && depth === 0) {
      output.push(mask.slice(start, index));
      start = index + 1;
    }
  }
  output.push(mask.slice(start));
  return output;
}

function parseOps(filename) {
  const repl = [];
  const commands = [];
  for (const rawLine of fs.readFileSync(filename, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith('REPL ')) {
      const fields = line.split(/\s+/);
      repl.push({
        point: fields.slice(1, 4).map(Number),
        end: fields.slice(4, 7).map(Number),
        expected: fields[7],
        replacement: fields[8],
        raw: line,
      });
    } else if (line.startsWith('CMD ')) {
      commands.push(line);
    }
  }
  return { repl, commands };
}

function expandTargets(parsed) {
  const targets = new Set();
  for (const operation of parsed.repl) {
    const [x1, y1, z1] = operation.point;
    const [x2, y2, z2] = operation.end;
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
        for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
          targets.add(key3(x, y, z));
        }
      }
    }
  }
  return targets;
}

function bboxContains(feature, point) {
  return (
    point[0] >= feature.min_x
    && point[0] <= feature.max_x
    && point[2] >= feature.min_z
    && point[2] <= feature.max_z
  );
}

const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
const preflight = JSON.parse(fs.readFileSync(PREFLIGHT_PATH, 'utf8'));
const forwardDryRun = JSON.parse(fs.readFileSync(FORWARD_DRY_RUN_PATH, 'utf8'));
const rollbackDryRun = JSON.parse(fs.readFileSync(ROLLBACK_DRY_RUN_PATH, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const capture = JSON.parse(fs.readFileSync(CAPTURE_PATH, 'utf8'));
const forward = parseOps(FORWARD_PATH);
const rollback = parseOps(ROLLBACK_PATH);
const targets = expandTargets(forward);

const checks = [];
function check(id, passed, evidence) {
  checks.push({ id, passed: Boolean(passed), evidence });
}

const snapshotDirectory = path.resolve(ROOT, report.source.snapshot.directory);
const snapshotHash = hashSnapshotDirectory(snapshotDirectory);
check(
  'immutable-snapshot-hash',
  snapshotHash.sha256
    === '4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b'
    && snapshotHash.regionFileCount === 26,
  {
    directory: relative(snapshotDirectory),
    sha256: snapshotHash.sha256,
    regionFileCount: snapshotHash.regionFileCount,
  },
);
check(
  'forward-hash-binding',
  report.operations.sha256 === sha256File(FORWARD_PATH),
  {
    report: report.operations.sha256,
    observed: sha256File(FORWARD_PATH),
  },
);
check(
  'rollback-hash-binding',
  report.operations.rollbackSha256 === sha256File(ROLLBACK_PATH),
  {
    report: report.operations.rollbackSha256,
    observed: sha256File(ROLLBACK_PATH),
  },
);
check(
  'forward-shape',
  forward.repl.length === 736
    && forward.commands.length === 4
    && targets.size === 736,
  {
    replacements: forward.repl.length,
    commands: forward.commands.length,
    uniqueTargets: targets.size,
  },
);
check(
  'one-cell-operations',
  forward.repl.every((operation) =>
    operation.point.join(',') === operation.end.join(',')),
  { nonSingleCell: forward.repl.filter((operation) =>
    operation.point.join(',') !== operation.end.join(',')).length },
);

const inverseErrors = [];
for (let index = 0; index < forward.repl.length; index += 1) {
  const source = forward.repl[index];
  const inverse = rollback.repl[rollback.repl.length - 1 - index];
  const expectedSnapshot = splitMask(source.expected)[0];
  if (
    source.point.join(',') !== inverse.point.join(',')
    || inverse.expected !== source.replacement
    || inverse.replacement !== expectedSnapshot
  ) {
    inverseErrors.push({ index, source, inverse });
  }
}
check(
  'exact-reverse-rollback',
  rollback.repl.length === forward.repl.length && inverseErrors.length === 0,
  { operations: rollback.repl.length, errors: inverseErrors.slice(0, 5) },
);

const fenceOperations = forward.repl.filter((operation) =>
  operation.expected.includes('birch_fence'));
const fenceStates = fenceOperations.flatMap((operation) =>
  splitMask(operation.expected));
check(
  'six-declared-fence-targets',
  fenceOperations.length === 6
    && report.runtimeSafety.gatePhysics.exactFenceTargets.length === 6,
  {
    parsed: fenceOperations.map((operation) => operation.point),
    reported: report.runtimeSafety.gatePhysics.exactFenceTargets
      .map((entry) => entry.point),
  },
);
check(
  'no-material-only-fence-guard',
  fenceStates.every((state) =>
    /^minecraft:birch_fence\[east=(?:true|false),north=(?:true|false),south=(?:true|false),waterlogged=false,west=(?:true|false)\]$/
      .test(state)),
  { exactSources: [...new Set(fenceStates)] },
);
check(
  'finite-union-fence-guards',
  fenceOperations.filter((operation) => splitMask(operation.expected).length > 1)
    .length === 4
    && report.operations.finiteExactStateUnionGuarded === 4,
  {
    parsed: fenceOperations.filter(
      (operation) => splitMask(operation.expected).length > 1,
    ).length,
    reported: report.operations.finiteExactStateUnionGuarded,
  },
);

const snapshot = new DetailedAnvilSnapshot(snapshotDirectory);
const expectedReactive = [
  {
    point: [-8, 65, -124],
    before:
      'minecraft:birch_fence[east=false,north=true,south=true,waterlogged=false,west=false]',
    after:
      'minecraft:birch_fence[east=false,north=false,south=true,waterlogged=false,west=false]',
  },
  {
    point: [8, 65, -128],
    before:
      'minecraft:birch_fence[east=false,north=true,south=true,waterlogged=false,west=false]',
    after:
      'minecraft:birch_fence[east=false,north=true,south=false,waterlogged=false,west=false]',
  },
];
const observedReactive = report.runtimeSafety.gatePhysics.adjacentReactiveFenceCells;
check(
  'adjacent-fence-physics-complete',
  observedReactive.length === 2
    && expectedReactive.every((expected) => {
      const entry = observedReactive.find(
        (candidate) => candidate.point.join(',') === expected.point.join(','),
      );
      return entry
        && entry.snapshotExactState === expected.before
        && entry.projectedForwardExactState === expected.after
        && entry.rollbackExactState === expected.before;
    }),
  { expected: expectedReactive, observed: observedReactive },
);
check(
  'adjacent-fence-source-states',
  (await Promise.all(expectedReactive.map(async (entry) =>
    await snapshot.getBlock(...entry.point))))
    .every((state, index) => state === expectedReactive[index].before),
  {
    observed: await Promise.all(expectedReactive.map(async (entry) => ({
      point: entry.point,
      state: await snapshot.getBlock(...entry.point),
    }))),
  },
);
check(
  'reactive-ordering',
  report.runtimeSafety.reactiveNeighborHazardCount === 0
    && report.runtimeSafety.allReactiveOperationsBeforeSupportMutations,
  {
    hazards: report.runtimeSafety.reactiveNeighborHazardCount,
    beforeSupport: report.runtimeSafety.allReactiveOperationsBeforeSupportMutations,
  },
);

const r1Union = new Set();
const r1Files = report.source.acceptedR1.map((entry) =>
  path.resolve(ROOT, entry.file));
for (const filename of r1Files) {
  for (const target of expandTargets(parseOps(filename))) r1Union.add(target);
}
const r1Overlaps = [...targets].filter((target) => r1Union.has(target));
check(
  'accepted-r1-target-disjoint',
  r1Overlaps.length === 0,
  { acceptedFiles: r1Files.map(relative), overlapCount: r1Overlaps.length },
);
check(
  'r1-alley-endpoints-preserved',
  !targets.has(key3(-58, 64, -124))
    && !targets.has(key3(57, 64, -124)),
  {
    westAlleyCellTargeted: targets.has(key3(-58, 64, -124)),
    eastAlleyCellTargeted: targets.has(key3(57, 64, -124)),
  },
);

const db = new Database(
  path.resolve(ROOT, report.source.database.file),
  { readonly: true, fileMustExist: true },
);
const protectedFeatures = db.prepare(
  `SELECT id, external_id, name, kind, min_x, max_x, min_z, max_z
   FROM world_features
   WHERE kind IN ('building', 'room', 'driveway', 'landscape')
     AND status != 'removed'`,
).all();
const protectedOverlaps = [];
for (const operation of forward.repl) {
  for (const feature of protectedFeatures) {
    if (bboxContains(feature, operation.point)) {
      protectedOverlaps.push({ point: operation.point, feature });
    }
  }
}
check(
  'protected-database-bounds',
  protectedOverlaps.length === 0,
  { overlapCount: protectedOverlaps.length, overlaps: protectedOverlaps.slice(0, 10) },
);
const proposedIds = report.databaseFeatures.features
  .map((feature) => feature.external_id);
const existingProposed = db.prepare(
  `SELECT external_id, name FROM world_features
   WHERE external_id IN (${proposedIds.map(() => '?').join(',')})`,
).all(...proposedIds);
db.close();
check(
  'database-proposal-only-and-unique',
  report.databaseFeatures.mutationPerformed === false
    && proposedIds.length === 10
    && new Set(proposedIds).size === 10
    && existingProposed.length === 0,
  {
    mutationPerformed: report.databaseFeatures.mutationPerformed,
    proposedCount: proposedIds.length,
    existingConflicts: existingProposed,
  },
);

const garageReport = JSON.parse(fs.readFileSync(
  path.resolve(
    ROOT,
    'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.report.json',
  ),
  'utf8',
));
const garageOverlaps = [];
for (const operation of forward.repl) {
  for (const garage of garageReport.garages.matrix) {
    const [minX, maxX, minZ, maxZ] = garage.garageBounds;
    if (
      operation.point[0] >= minX
      && operation.point[0] <= maxX
      && operation.point[2] >= minZ
      && operation.point[2] <= maxZ
    ) garageOverlaps.push({ point: operation.point, garage: garage.garageId });
  }
}
check(
  'r1-garage-bounds',
  garageOverlaps.length === 0,
  { overlapCount: garageOverlaps.length, overlaps: garageOverlaps.slice(0, 10) },
);
check(
  'no-tree-sources',
  forward.repl.every((operation) =>
    !['_log', '_leaves'].some((suffix) => baseName(operation.expected).endsWith(suffix))),
  {
    targets: forward.repl.filter((operation) =>
      ['_log', '_leaves'].some((suffix) =>
        baseName(operation.expected).endsWith(suffix))).map((entry) => entry.point),
  },
);
check(
  'no-existing-targeted-block-entities',
  report.protection.targetedBlockEntities.length === 0,
  { targeted: report.protection.targetedBlockEntities },
);
check(
  'route-bidirectional-flat-clear',
  report.geometry.roadCellCount === 354
    && report.geometry.width === 3
    && report.geometry.grade.maximumAdjacentStep === 0
    && report.protection.routeHeadroomFailures.length === 0
    && report.geometry.routeDirections.every((entry) => entry.connected),
  {
    roadCells: report.geometry.roadCellCount,
    width: report.geometry.width,
    grade: report.geometry.grade,
    headroomFailures: report.protection.routeHeadroomFailures,
    directions: report.geometry.routeDirections,
  },
);
check(
  'r01-remains-connected',
  report.geometry.connectionProof.r01.disconnected === false,
  report.geometry.connectionProof.r01,
);
check(
  'rejected-alternatives-recorded',
  report.decision.rejected_alternatives.length >= 4,
  report.decision.rejected_alternatives,
);
check(
  'c01-westlight-distinct',
  report.wayfinding.namingDecision.includes('cannot be confused')
    && report.wayfinding.pylons.flatMap((pylon) => pylon.lines)
      .includes('WESTLIGHT VENUE')
    && report.wayfinding.pylons.flatMap((pylon) => pylon.lines)
      .includes('C01 VIA E ALLEY'),
  {
    namingDecision: report.wayfinding.namingDecision,
    lines: report.wayfinding.pylons.flatMap((pylon) => pylon.lines),
  },
);
check(
  'guarded-sign-commands',
  forward.commands.length === 4
    && forward.commands.every((command) => command.startsWith('CMD execute if block ')),
  { commands: forward.commands },
);
check(
  'generic-preflight',
  preflight.operationCount === 736
    && preflight.passed === 736
    && preflight.failed === 0
    && preflight.partialMasks.length === 0,
  preflight,
);
check(
  'forward-parser-dry-run',
  forwardDryRun.status === 'dry_run'
    && forwardDryRun.sourceOperationCount === 740
    && forwardDryRun.commandCount === 744
    && forwardDryRun.finiteUnionGroupCount === 4
    && forwardDryRun.worldEditLeftoverCount === 0,
  {
    status: forwardDryRun.status,
    sourceOperations: forwardDryRun.sourceOperationCount,
    commands: forwardDryRun.commandCount,
    finiteUnions: forwardDryRun.finiteUnionGroupCount,
    leftovers: forwardDryRun.worldEditLeftoverCount,
  },
);
check(
  'rollback-parser-dry-run',
  rollbackDryRun.status === 'dry_run'
    && rollbackDryRun.sourceOperationCount === 736
    && rollbackDryRun.commandCount === 736
    && rollbackDryRun.worldEditLeftoverCount === 0,
  {
    status: rollbackDryRun.status,
    sourceOperations: rollbackDryRun.sourceOperationCount,
    commands: rollbackDryRun.commandCount,
    leftovers: rollbackDryRun.worldEditLeftoverCount,
  },
);
check(
  'camera-contract-count-and-identity',
  manifest.cameras.length === 8
    && new Set(manifest.cameras.map((camera) => camera.id)).size === 8
    && manifest.cameras.every((camera) => camera.primaryFeatureId),
  {
    count: manifest.cameras.length,
    ids: manifest.cameras.map((camera) => camera.id),
  },
);
const perspectiveCameras = manifest.cameras.filter((camera) =>
  (camera.mode ?? 'persp') !== 'map');
check(
  'camera-source-visibility',
  perspectiveCameras.length === 7
    && perspectiveCameras.every((camera) =>
      camera.visibilityValidation?.passed
      && camera.visibilityValidation?.eyeClear
      && camera.visibilityValidation?.visibilityRay?.unobstructed),
  perspectiveCameras.map((camera) => ({
    id: camera.id,
    eye: camera.eye,
    lookAt: camera.lookAt,
    validation: camera.visibilityValidation,
  })),
);
check(
  'camera-capture-evidence',
  capture.captures.length === 8
    && capture.captures.every((entry) =>
      entry.quality?.nonBlank
      && entry.bytes >= 8000
      && fs.existsSync(path.resolve(ROOT, entry.output))),
  {
    count: capture.captures.length,
    captures: capture.captures.map((entry) => ({
      id: entry.id,
      output: entry.output,
      bytes: entry.bytes,
      sha256: entry.sha256,
      nonBlank: entry.quality?.nonBlank,
    })),
  },
);
check(
  'all-generator-acceptance-checks',
  report.failedAcceptance.length === 0
    && Object.entries(report.acceptanceChecks)
      .filter(([, value]) => typeof value === 'boolean')
      .every(([, value]) => value === true),
  {
    failedAcceptance: report.failedAcceptance,
    acceptanceChecks: report.acceptanceChecks,
  },
);
check(
  'offline-only-release-state',
  report.liveWorldMutated === false
    && report.releaseDecision.offlineEngineering === 'GO'
    && report.releaseDecision.liveExecution
      === 'NOT_AUTHORIZED_OFFLINE_PACKAGE_ONLY',
  {
    liveWorldMutated: report.liveWorldMutated,
    releaseDecision: report.releaseDecision,
  },
);

const passed = checks.filter((entry) => entry.passed).length;
const failed = checks.filter((entry) => !entry.passed);
const result = {
  schemaVersion: 1,
  id: 'mainstreet-wave2-r08-independent-qa',
  generatedAtUtc: new Date().toISOString(),
  liveWorldContacted: false,
  sources: {
    plan: { file: relative(PLAN_PATH), sha256: sha256File(PLAN_PATH) },
    report: { file: relative(REPORT_PATH), sha256: sha256File(REPORT_PATH) },
    forward: { file: relative(FORWARD_PATH), sha256: sha256File(FORWARD_PATH) },
    rollback: { file: relative(ROLLBACK_PATH), sha256: sha256File(ROLLBACK_PATH) },
    preflight: { file: relative(PREFLIGHT_PATH), sha256: sha256File(PREFLIGHT_PATH) },
    cameraManifest: { file: relative(MANIFEST_PATH), sha256: sha256File(MANIFEST_PATH) },
    captureReport: { file: relative(CAPTURE_PATH), sha256: sha256File(CAPTURE_PATH) },
  },
  summary: {
    checks: checks.length,
    passed,
    failed: failed.length,
    decision: failed.length === 0 ? 'PASS_OFFLINE_ONLY' : 'FAIL',
  },
  checks,
  failedChecks: failed,
  nextGate:
    'No live execution is authorized. A future release must refresh a saved-world snapshot, regenerate, preflight, clear entities, capture before media, execute atomically, and run bidirectional live route QA.',
};

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(MARKDOWN_PATH, `# MainStreet Wave 2 R08 independent QA

Generated: ${result.generatedAtUtc}  
Decision: **${result.summary.decision}**  
Checks: **${passed}/${checks.length} passed**

This audit read the immutable Wave 2 snapshot, database, generated operations,
rollback, preflight, parser reports, camera contract, and rendered capture
evidence. It did not contact or mutate the live world.

| Check | Result |
|---|---|
${checks.map((entry) => `| \`${entry.id}\` | ${entry.passed ? 'PASS' : 'FAIL'} |`).join('\n')}

## Release boundary

${result.nextGate}
`);

console.log(JSON.stringify({
  output: relative(OUTPUT_PATH),
  markdown: relative(MARKDOWN_PATH),
  checks: checks.length,
  passed,
  failed: failed.length,
  decision: result.summary.decision,
}, null, 2));
if (failed.length > 0) process.exitCode = 1;
