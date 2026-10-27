#!/usr/bin/env node
/** Read-only R08 completion/gap screen after accepted R08AJ. */
import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  cellKey,
  cellsIn,
  sha256,
  stateToCommandString,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const OUT = value(
  '--out-dir',
  'data/world-review/combined-zones-r08ak-empty-eight-static-readiness-gap-screen-20260822T025000Z',
);
const SNAPSHOT = 'data/worldsnap-r08aj-post-20260822T024118Z';
const LEDGER_PATH = 'data/world-review/combined-zones-r08aj-live-20260822T024118Z/evidence-ledger.json';
const AJ_MANIFEST = 'data/buildops/combined-zones-r08aj-empty-eight-eg-b-passive-illumination.release-manifest.json';
const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08AK readiness screen rejected: ${message}`);
};
const census = async (reader, cells) => {
  const counts = {};
  for (const cell of cells) {
    const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
    counts[state] = (counts[state] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort());
};
const operations = (filename) => {
  const output = [];
  for (const line of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('REPL ')) continue;
    const fields = line.split(/\s+/);
    const n = fields.slice(1, 7).map(Number);
    for (let x = Math.min(n[0], n[3]); x <= Math.max(n[0], n[3]); x += 1) {
      for (let y = Math.min(n[1], n[4]); y <= Math.max(n[1], n[4]); y += 1) {
        for (let z = Math.min(n[2], n[5]); z <= Math.max(n[2], n[5]); z += 1) {
          output.push({ x, y, z });
        }
      }
    }
  }
  return output;
};

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(AJ_MANIFEST);
const design = readJson('docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json');
const ventCaps = readJson('data/buildops/combined-zones-r08u-empty-eight-internal-vent-caps.release-manifest.json');
const residual = readJson(
  'data/world-review/combined-zones-r08ag-live-20260822T020533Z/r08ag-accepted-post-residual-north-smoke-census.json',
);
const n06 = readJson('data/world-review/combined-zones-r08q-n06-gravity-blocker-20260821T184800Z.json');
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(
  sha256(fs.readFileSync(absolute(LEDGER_PATH))) === '00231fbefcea5efaad042cf5245286c232d9a44b67f38fece110e68245e13a57'
    && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
    && ledger.completedReleaseIdentitySha256 === '0305e47fbdc23239338a31dfa335cc2332f68bcdde423cce2d09cfe34478d791'
    && ledger.postSnapshot.root === SNAPSHOT
    && ledger.postSnapshot.completeSaveSha256 === '7bd09febc9447b5147e3a5d4a1694943a43ef7cb26104bca582bef1bcb096872'
    && postIdentity.sha256 === 'eb7678a9c6ff3e073e317bc29e11bdbbaf209e3add6f5dad4ce3fdf0dfc9a976',
  'accepted R08AJ source binding',
);

const core = design.d06.lifeSafety.egressCores.find(({ id }) => id === 'EG-B');
invariant(
  core
    && core.surfaceEndpoint === null
    && core.commissionedEgress === false
    && core.commissionedAccessibleRoute === false,
  'EG-B fail-closed design boundary',
);
const bounds = core.internalCoreReservation.bounds;
const floor = cellsIn({ ...bounds, maxY: bounds.minY });
const wall = cellsIn({ ...bounds, minY: bounds.minY + 1, maxY: bounds.maxY - 1 })
  .filter((cell) => (
    cell.x === bounds.minX || cell.x === bounds.maxX
    || cell.z === bounds.minZ || cell.z === bounds.maxZ
  ));
const interior = cellsIn({
  minX: bounds.minX + 1, maxX: bounds.maxX - 1,
  minY: bounds.minY + 1, maxY: bounds.maxY - 1,
  minZ: bounds.minZ + 1, maxZ: bounds.maxZ - 1,
});
const roof = cellsIn({ ...bounds, minY: bounds.maxY });
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const state = {
  floor: await census(reader, floor),
  wall: await census(reader, wall),
  interior: await census(reader, interior),
  roof: await census(reader, roof),
};
invariant(
  floor.length === 49
    && JSON.stringify(state.floor) === JSON.stringify({
      'minecraft:polished_deepslate': 30,
      'minecraft:smooth_stone': 19,
    })
    && wall.length === 264
    && JSON.stringify(state.wall) === JSON.stringify({
      'minecraft:blue_glazed_terracotta[facing=east]': 17,
      'minecraft:blue_glazed_terracotta[facing=north]': 15,
      'minecraft:blue_glazed_terracotta[facing=south]': 15,
      'minecraft:blue_glazed_terracotta[facing=west]': 17,
      'minecraft:stone_bricks': 200,
    })
    && interior.length === 275
    && JSON.stringify(state.interior) === JSON.stringify({ 'minecraft:air': 275 })
    && roof.length === 49
    && JSON.stringify(state.roof) === JSON.stringify({
      'minecraft:sea_lantern': 9,
      'minecraft:smooth_stone': 40,
    }),
  'accepted EG-B static state',
);

const priorPaths = [
  ...manifest.isolation.acceptedPriorManifestChecks.map(({ path: filename }) => filename),
  AJ_MANIFEST,
];
const acceptedR08Transactions = [];
const acceptedR08Cells = new Set();
for (const filename of priorPaths) {
  const prior = readJson(filename);
  if (!prior.transactionId.startsWith('combined-zones-r08')) continue;
  acceptedR08Transactions.push(prior.transactionId);
  for (const pkg of prior.packages ?? []) {
    for (const cell of operations(pkg.forward)) acceptedR08Cells.add(cellKey(cell));
  }
}
invariant(
  acceptedR08Transactions.length === 35 && acceptedR08Cells.size === 44696,
  'accepted R08 manifest union',
);

let residualDrift = 0;
for (const entry of residual.residualCells) {
  const observed = stateToCommandString(await reader.blockState(entry.cell.x, entry.cell.y, entry.cell.z));
  if (observed !== entry.projectedState) residualDrift += 1;
}
let n06Drift = 0;
for (const entry of n06.targetGravity.findings) {
  const observed = stateToCommandString(await reader.blockState(entry.cell.x, entry.cell.y, entry.cell.z));
  const support = stateToCommandString(await reader.blockState(
    entry.immediateSupportCell.x,
    entry.immediateSupportCell.y,
    entry.immediateSupportCell.z,
  ));
  if (observed !== entry.state || support !== entry.immediateSupportState) n06Drift += 1;
}
invariant(
  residual.residualCells.length === 161
    && residual.summary.primaryPartition.wetInteractionCellCount === 105
    && residual.summary.primaryPartition.gravityInteractionCellCount === 56
    && residualDrift === 0
    && n06.targetGravity.count === 4
    && n06Drift === 0
    && ventCaps.scope.geometry.retainedUnexcavatedRiserReservations.cellCount === 900
    && design.d06.futureInterfaces.interfaces.reduce(
      (sum, entry) => sum + entry.sealDesign.cellCount,
      0,
    ) === 200,
  'retained local gaps',
);

const report = {
  schemaVersion: 1,
  generatedAtUtc: '2026-08-22T02:50:00Z',
  status: 'PASS_R08AK_LOCAL_COMPLETION_GAP_SCREEN_NO_NONCOSMETIC_STATIC_PACKAGE',
  releaseId: 'CZ-R08AK-EMPTY-EIGHT-STATIC-READINESS-GAP-SCREEN',
  releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
    regionSnapshotSha256: postIdentity.sha256,
    terminalLedger: {
      path: LEDGER_PATH,
      transactionId: ledger.transactionId,
      completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
    },
  },
  acceptedR08: {
    manifestCount: acceptedR08Transactions.length,
    unionCellCount: acceptedR08Cells.size,
  },
  egBStaticCompletion: {
    reservationCells: core.internalCoreReservation.cellCount,
    wall: { cellCount: wall.length, stateCensus: state.wall, complete: true },
    floor: {
      cellCount: floor.length,
      stateCensus: state.floor,
      retainedFutureMechanismCaps: 30,
      retainedSoffitFloorField: 19,
      completeAndClosed: true,
    },
    roof: {
      cellCount: roof.length,
      stateCensus: state.roof,
      fullCubeClosedCells: 49,
      completeAndClosed: true,
    },
    interior: {
      cellCount: interior.length,
      stateCensus: state.interior,
      reservedForUnbuiltStairLiftAndInternalRoute: true,
    },
    surfaceEndpoint: null,
    egressCommissioned: false,
    accessibleRouteCommissioned: false,
  },
  nonCosmeticStaticCandidate: {
    targetCellCount: 0,
    buildopsEmitted: false,
    reason: 'The accepted wall, floor, closed mechanism caps, roof, fixtures, and wayfinding are complete. Remaining air is the explicit stair/lift/internal-route reservation; modifying accepted static materials would be cosmetic churn or overwrite a fail-closed interface.',
  },
  exactLocalGaps: {
    egBStairReservationCells: core.stairReservation.cellCount,
    egBAccessibleLiftReservationCells: core.accessibleLiftReservation.cellCount,
    egBExternalSurfaceEndpoint: null,
    egBExternalContinuationStatus: core.externalContinuationStatus,
    unexcavatedVentRiserCells: 900,
    futureStubSealCells: 200,
    northSmokeResidual: {
      cells: 161,
      wet: 105,
      gravity: 56,
      acceptedPostDrift: residualDrift,
    },
    n06SuspendedGravel: { cells: 4, acceptedPostDrift: n06Drift },
  },
  disposition: {
    scopeLocalOnly: true,
    r08HeldGlobally: false,
    r08akPhysicalReleaseCompiled: false,
    nextMaterialLane: 'R11 bounded hydraulic/foundation construction',
    noLiveCalls: true,
    noWorldEdits: true,
  },
};
report.reportPayloadSha256 = sha256(JSON.stringify(report));
fs.mkdirSync(absolute(OUT), { recursive: true });
fs.writeFileSync(
  absolute(path.join(OUT, 'r08ak-empty-eight-static-readiness-gap-screen.json')),
  `${JSON.stringify(report, null, 2)}\n`,
);
fs.writeFileSync(
  absolute(path.join(OUT, 'r08ak-empty-eight-static-readiness-gap-screen.md')),
  `# R08AK Empty Eight static-readiness gap screen\n\nStatus: **${report.status}**\n\nEG-B's 264-cell wall, 49-cell retained floor/cap field, 49-cell closed roof, nine passive fixtures, 64-cell wayfinding field, and 275-cell reserved air interior are exact on the accepted R08AJ post. No non-cosmetic static target remains: the next physical EG-B changes require stair/lift, route, mechanism, or external-endpoint evidence.\n\nLocal gaps remain exact and non-global: 161 north-smoke cells, four N06 suspended-gravel cells, 900 unexcavated riser cells, and 200 sealed future-stub cells. No R08AK buildops were emitted. Work switches to a material R11 hydraulic/foundation package.\n\nPayload: \`${report.reportPayloadSha256}\`. No live call or world edit was performed.\n`,
);
process.stdout.write(`${JSON.stringify({
  status: report.status,
  reportPayloadSha256: report.reportPayloadSha256,
  staticTargetCellCount: 0,
  nextMaterialLane: report.disposition.nextMaterialLane,
}, null, 2)}\n`);
