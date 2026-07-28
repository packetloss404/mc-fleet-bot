#!/usr/bin/env node
/**
 * Generate the exact, reversible citizen-route ridge stair repair.
 *
 * This is an offline proposal generator. It reads one immutable Anvil
 * snapshot and existing evidence, writes guarded operation/evidence files,
 * and never connects to Minecraft, RCON, the bot API, or systemd.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DetailedAnvilSnapshot,
  hashSnapshotDirectory,
} from './generate_mainstreet_redevelopment_r4_r5.mjs';
import { verifyTownExpansionRoutes } from './qa_town_expansion_routes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = path.join(
  ROOT,
  'data/worldsnap-town-accessibility-citizen-final-20260728T1745Z/region',
);
const SNAPSHOT_SHA256 =
  '71f52acf04f4974557fcc23e7cb02d81d76ed17cbab41bcc78ff9846cba1045d';
const INCIDENT_AUDIT = path.join(
  ROOT,
  'data/runtime-audits/citizen-route-live-walk-20260728T181928Z.json',
);
const ROUTE_REPORT = path.join(
  ROOT,
  'data/world-review/citizen-ravensreach-mainstreet-route-survey-final-20260728T1745Z.json',
);
const ROUTE_MANIFEST = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'town-expansion-accessibility-repair-as-built-route-manifest.json',
);
const FORWARD = path.join(
  ROOT,
  'data/buildops/citizen-route-ridge-stair-repair-2026-07-28.txt',
);
const ROLLBACK = path.join(
  ROOT,
  'data/buildops/citizen-route-ridge-stair-repair-2026-07-28.rollback.txt',
);
const MANIFEST = path.join(
  ROOT,
  'data/buildops/citizen-route-ridge-stair-repair-2026-07-28.manifest.json',
);
const REPORT = path.join(
  ROOT,
  'data/world-review/citizen-route-ridge-stair-repair-proposal-20260728.json',
);
const PROJECTED_ROUTE_QA = path.join(
  ROOT,
  'data/world-review/citizen-route-ridge-stair-repair-projected-route-qa-20260728.json',
);
const SOURCE_PREFLIGHT = path.join(
  ROOT,
  'data/world-review/citizen-route-ridge-stair-repair-source-preflight-20260728.json',
);
const FORWARD_DRY_RUN = path.join(
  ROOT,
  'data/buildops/citizen-route-ridge-stair-repair-2026-07-28.forward-strict-dry-run.json',
);
const ROLLBACK_DRY_RUN = path.join(
  ROOT,
  'data/buildops/citizen-route-ridge-stair-repair-2026-07-28.rollback-strict-dry-run.json',
);
const MARKDOWN = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'citizen-route-ridge-stair-repair-proposal.md',
);

const SOURCE = 'minecraft:polished_andesite';
const REPLACEMENT =
  'minecraft:polished_andesite_stairs'
  + '[facing=north,half=bottom,shape=straight,waterlogged=false]';
const LANES = [-84, -83, -81, -80];
const COURSES = [
  { y: 71, z: 1, role: 'south-lower-half-rise' },
  { y: 72, z: 0, role: 'north-upper-half-rise' },
];

function invariant(condition, message) {
  if (!condition) throw new Error(`citizen ridge repair: ${message}`);
}

function relative(filename) {
  return path.relative(ROOT, filename);
}

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function operationLine(operation) {
  const { x, y, z, expected, replacement } = operation;
  return `REPL ${x} ${y} ${z} ${x} ${y} ${z} ${expected} ${replacement}`;
}

const snapshotIdentity = hashSnapshotDirectory(SNAPSHOT);
invariant(
  snapshotIdentity.sha256 === SNAPSHOT_SHA256,
  `snapshot drift: expected ${SNAPSHOT_SHA256}, found ${snapshotIdentity.sha256}`,
);

const incident = JSON.parse(fs.readFileSync(INCIDENT_AUDIT, 'utf8'));
const failedCheckpoint = incident.reverse?.checkpoints?.find(
  (checkpoint) => (
    checkpoint.index === 13
    && JSON.stringify(checkpoint.target) === JSON.stringify([-83, 72, 1])
  ),
);
invariant(incident.status === 'FAIL', 'incident audit is no longer a FAIL');
invariant(failedCheckpoint?.passed === false, 'reverse checkpoint 13 did not fail');

const snapshot = new DetailedAnvilSnapshot(SNAPSHOT);
const operations = [];
for (const course of COURSES) {
  for (const x of LANES) {
    const observed = await snapshot.getBlock(x, course.y, course.z);
    invariant(
      observed === SOURCE,
      `source mismatch at ${x},${course.y},${course.z}: ${observed}`,
    );
    operations.push({
      id: `ridge-${course.z === 1 ? 'south' : 'north'}-x${x}`,
      x,
      y: course.y,
      z: course.z,
      expected: SOURCE,
      replacement: REPLACEMENT,
      role: course.role,
    });
  }
}
const blockEntities = await snapshot.blockEntitiesInBox([-84, 71, 0, -80, 72, 1]);
invariant(blockEntities.length === 0, 'repair box contains a block entity');
invariant(operations.length === 8, 'repair must contain exactly eight cells');
invariant(
  new Set(operations.map(({ x, y, z }) => `${x},${y},${z}`)).size === 8,
  'repair contains duplicate targets',
);
invariant(
  operations.every((operation) => operation.x !== -82),
  'repair must preserve the yellow-concrete center stripe',
);

fs.mkdirSync(path.dirname(FORWARD), { recursive: true });
fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(FORWARD, [
  '# PROPOSAL ONLY — exact 8-cell citizen-route ridge stair repair.',
  '# Execute only against the pinned frozen source snapshot after entity clearance.',
  ...operations.map(operationLine),
  '',
].join('\n'));
fs.writeFileSync(ROLLBACK, [
  '# Exact inverse of the 8-cell citizen-route ridge stair repair.',
  ...[...operations].reverse().map((operation) => operationLine({
    ...operation,
    expected: operation.replacement,
    replacement: operation.expected,
  })),
  '',
].join('\n'));

const routeQa = await verifyTownExpansionRoutes({
  manifest: relative(ROUTE_MANIFEST),
  overlayOps: relative(FORWARD),
  noWrite: true,
});
invariant(routeQa.status === 'PASS', 'projected route QA did not pass');
invariant(routeQa.summary.passed === 22, 'projected route QA did not pass 22 routes');
fs.writeFileSync(PROJECTED_ROUTE_QA, `${JSON.stringify(routeQa, null, 2)}\n`);

const repeatedAudits = [
  'citizen-route-live-walk-20260728T091945Z.json',
  'citizen-route-live-walk-20260728T092815Z.json',
  'citizen-route-live-walk-20260728T165823Z.json',
  'citizen-route-live-walk-20260728T180433Z.json',
  'citizen-route-live-walk-20260728T181928Z.json',
].map((name) => {
  const filename = path.join(ROOT, 'data/runtime-audits', name);
  const audit = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const checkpoint = audit.reverse?.checkpoints?.find(
    (entry) => entry.index === 13,
  );
  return {
    file: relative(filename),
    sha256: sha256File(filename),
    auditStatus: audit.status,
    checkpointPassed: checkpoint?.passed ?? null,
    attempt: checkpoint?.attempt ?? null,
    arrival: checkpoint?.arrival ?? null,
  };
});

const report = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  id: 'citizen-route-ridge-stair-repair',
  status: 'PASS_OFFLINE_PROPOSAL_NOT_EXECUTED',
  sourceBoundary: {
    immutableSnapshotRead: true,
    liveWorldRead: false,
    liveWorldMutated: false,
    networkAccess: false,
    serviceRestarted: false,
  },
  diagnosis: {
    classification: 'PLANNER_VALID_EXECUTOR_MARGINAL_FULL_BLOCK_RIDGE',
    failedDirection: 'reverse',
    failedCheckpointIndex: 13,
    failedTarget: [-83, 72, 1],
    plannedEdge: [[-83, 71, 2], [-83, 72, 1]],
    nextEdge: [[-83, 72, 1], [-83, 73, 0]],
    ordinaryJumpUpRemainsEnabledWhenParkourIsFalse: true,
    observedLiveFailure: 'repeated path_reset reason=stuck followed by action timeout',
    historicalPassWasMarginal:
      'sole pass took about 21 seconds and logged three stuck-reset cycles',
    repeatedAudits,
  },
  sourceSnapshot: {
    directory: relative(SNAPSHOT),
    sha256: snapshotIdentity.sha256,
    regionFileCount: snapshotIdentity.regionFileCount,
  },
  design: {
    operationCount: operations.length,
    targetCellCount: operations.length,
    lanes: [
      { x: [-84, -83], role: 'west two-wide walking lane' },
      { x: [-81, -80], role: 'east two-wide walking lane' },
    ],
    courses: COURSES,
    preservedCenterStripeX: -82,
    replacement: REPLACEMENT,
    collisionRationale:
      'north-facing bottom stairs place their high collision half on the north '
      + 'side, splitting each northbound full-block rise into half-height treads',
    routeOrArrivalContractChanged: false,
    blockEntitiesTargeted: blockEntities.length,
    operations,
  },
  guardedPackage: {
    forward: {
      file: relative(FORWARD),
      sha256: sha256File(FORWARD),
      operationCount: operations.length,
    },
    rollback: {
      file: relative(ROLLBACK),
      sha256: sha256File(ROLLBACK),
      operationCount: operations.length,
      exactInverse: true,
    },
  },
  routeEvidence: {
    routeReport: {
      file: relative(ROUTE_REPORT),
      sha256: sha256File(ROUTE_REPORT),
    },
    routeManifest: {
      file: relative(ROUTE_MANIFEST),
      sha256: sha256File(ROUTE_MANIFEST),
    },
    projectedQa: {
      file: relative(PROJECTED_ROUTE_QA),
      sha256: sha256File(PROJECTED_ROUTE_QA),
      status: routeQa.status,
      routesPassed: routeQa.summary.passed,
      directionalRunsPassed: routeQa.summary.passedDirections,
      acceptanceClass: routeQa.acceptanceClass,
    },
  },
  rejectionOfContractRelaxation: [
    'GoalNear range expansion could accept a nearby node without crossing the failed rise.',
    'Waypoint removal would weaken the evidence contract instead of repairing the surface.',
    'The production planner already finds the intended no-parkour path.',
  ],
  remainingGates: [
    'Freeze the world and capture a fresh source snapshot with the exact pinned identity.',
    'Require a zero-entity gate over and adjacent to the eight target cells.',
    'Require exact source preflight and strict-noop parser dry-run.',
    'Execute all eight guarded operations atomically; zero failures and zero no-ops.',
    'Capture an immutable post snapshot and require rollback post-state preflight.',
    'Run reverse:13 segment diagnostics for checkpoints 12-14 at least three times.',
    'Run a fresh uncached full staging, forward, and reverse live walk for acceptance.',
  ],
};
fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);

const manifest = {
  schemaVersion: 1,
  generatedAtUtc: report.generatedAtUtc,
  id: report.id,
  status: report.status,
  liveWorldMutated: false,
  source: report.sourceSnapshot,
  scope: {
    bounds: [-84, 71, 0, -80, 72, 1],
    exactTargetCells: operations.map(({ x, y, z }) => [x, y, z]),
    targetCellCount: operations.length,
    centerStripePreserved: true,
    targetBlockEntities: blockEntities.length,
  },
  forward: report.guardedPackage.forward,
  rollback: report.guardedPackage.rollback,
  projectedRouteQa: report.routeEvidence.projectedQa,
  sourcePreflight: fs.existsSync(SOURCE_PREFLIGHT)
    ? (() => {
      const preflight = JSON.parse(fs.readFileSync(SOURCE_PREFLIGHT, 'utf8'));
      return {
        file: relative(SOURCE_PREFLIGHT),
        sha256: sha256File(SOURCE_PREFLIGHT),
        status: preflight.status,
        guardsPassed: preflight.passed,
        guardsFailed: preflight.failed,
        operationSha256: preflight.opsSha256,
      };
    })()
    : null,
  strictParserDryRuns: {
    forward: fs.existsSync(FORWARD_DRY_RUN)
      ? (() => {
        const dryRun = JSON.parse(fs.readFileSync(FORWARD_DRY_RUN, 'utf8'));
        return {
          file: relative(FORWARD_DRY_RUN),
          sha256: sha256File(FORWARD_DRY_RUN),
          status: dryRun.status,
          strictNoop: dryRun.strictNoop,
          operationRole: dryRun.operationRole,
          sourceOperationCount: dryRun.sourceOperationCount,
          commandCount: dryRun.commandCount,
          operationSha256: dryRun.operationSha256,
        };
      })()
      : null,
    rollback: fs.existsSync(ROLLBACK_DRY_RUN)
      ? (() => {
        const dryRun = JSON.parse(fs.readFileSync(ROLLBACK_DRY_RUN, 'utf8'));
        return {
          file: relative(ROLLBACK_DRY_RUN),
          sha256: sha256File(ROLLBACK_DRY_RUN),
          status: dryRun.status,
          strictNoop: dryRun.strictNoop,
          operationRole: dryRun.operationRole,
          sourceOperationCount: dryRun.sourceOperationCount,
          commandCount: dryRun.commandCount,
          operationSha256: dryRun.operationSha256,
        };
      })()
      : null,
  },
  proposalReport: {
    file: relative(REPORT),
    sha256: sha256File(REPORT),
  },
  executionAuthorizedByThisManifest: false,
  finalAcceptanceMayUseCachedSegmentPasses: false,
};
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

const markdown = `# Citizen route ridge stair repair

Status: **PASS — offline proposal only; not executed**

## Finding

The production A* planner accepts the reverse edge
\`[-83,71,2] -> [-83,72,1]\` with parkour, digging, and placement disabled.
The live movement executor is the failing layer: repeated attempts log
\`path_reset: stuck\` and time out on the two consecutive full-block rises.
Even the sole historical pass took about 21 seconds and three stuck resets.

## Exact repair

Replace eight polished-andesite surface cells with north-facing bottom
polished-andesite stairs: x=-84,-83,-81,-80 at y71/z1 and y72/z0. This makes
two two-wide half-step walking lanes and preserves the yellow center stripe at
x=-82. No route waypoint or arrival tolerance changes.

Forward: \`${relative(FORWARD)}\`

Rollback: \`${relative(ROLLBACK)}\`

Projected route QA: ${routeQa.summary.passed}/22 routes and
${routeQa.summary.passedDirections}/44 directions PASS. This is projection
evidence only.

## Controlled verification

1. Freeze and snapshot; require SHA-256 \`${SNAPSHOT_SHA256}\`.
2. Run an entity-clearance gate over the exact eight-cell scope.
3. Run exact source preflight and strict-noop parser dry-run.
4. Execute all 8 guarded operations atomically with zero failures/no-ops.
5. Snapshot post-state and preflight the exact rollback.
6. Run \`node scripts/run_citizen_route_live_walk.mjs --segment reverse:13 --bot Surveyor\`
   three times. It stages at reverse index 11 and exercises checkpoints 12-14.
7. Final acceptance still requires
   \`node scripts/run_citizen_route_live_walk.mjs --execute --bot Surveyor\`;
   cached segment passes are never an end-to-end acceptance substitute.
`;
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  status: report.status,
  forward: manifest.forward,
  rollback: manifest.rollback,
  manifest: {
    file: relative(MANIFEST),
    sha256: sha256File(MANIFEST),
  },
  report: manifest.proposalReport,
  projectedRouteQa: manifest.projectedRouteQa,
}, null, 2));
