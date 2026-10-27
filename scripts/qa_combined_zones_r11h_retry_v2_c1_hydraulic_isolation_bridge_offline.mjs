#!/usr/bin/env node
/** Independent offline QA for the distinct CZ-R11H retry-v2 package. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';
import { connectedComponents, isFluid } from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r11h-retry-v2-c1-hydraulic-isolation-bridge-1189-1206.release-manifest.json',
);
const OUT_PATH = value(
  '--out',
  'data/world-review/combined-zones-r11h-retry-v2-offline-20260822T033000Z/r11h-retry-v2-offline-qa.json',
);
const MD_PATH = value(
  '--md-out',
  'data/world-review/combined-zones-r11h-retry-v2-offline-20260822T033000Z/r11h-retry-v2-offline-qa.md',
);
const GENERATED_AT = value('--generated-at', '2026-08-22T03:30:00Z');
const V1_MANIFEST =
  'data/buildops/combined-zones-r11h-c1-hydraulic-isolation-bridge-1189-1206.release-manifest.json';
const RECOVERY_ACCEPTANCE =
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/r11h-recovery-acceptance.json';
const EXPECTED = Object.freeze({
  transactionId:
    'combined-zones-r11h-retry-v2-c1-hydraulic-isolation-bridge-1189-1206',
  v1ManifestSha256:
    'b8259982d8e272c953f904248b276bf415449038b805604173962d49cb699f31',
  recoveryAcceptanceSha256:
    'ccc012f2cf5c8d54d3c4fc5aba8b9e5ac58b75f56911f0744f9911902c545e58',
  completeSaveSha256:
    '8cd29097ffa225153be988eb0761639e45eb5ea3964e12e862f6d99bf7e333fe',
  regionSha256:
    '6a57df64e02304baef7d4841c06de3a5aaa54ae31a1459e4abcb53772c93e223',
  targetCount: 1666,
  targetHash: 'ef89661a02a5544a093255ada780e8037200f2b9aa0cd421d30c7bd1fedcf129',
  haloCount: 7120,
  haloHash: '135352f855481660e8e5de62bd46908a2c6e26ecddc6546440ecfc445aabfb28',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11H retry-v2 offline QA rejected: ${message}`);
};
const bodySha256 = (filename) => sha256(`${fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/).filter((line) => line && !line.startsWith('#')).join('\n')}\n`);
function parseOperations(filename) {
  const result = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains malformed operation`);
    result.push({
      cell: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) },
      sourceState: fields[7], targetState: fields[8],
    });
  }
  return result;
}

const manifestBytes = fs.readFileSync(absolute(MANIFEST_PATH));
const manifest = JSON.parse(manifestBytes);
const { manifestIdentity, ...payload } = manifest;
const v1Bytes = fs.readFileSync(absolute(V1_MANIFEST));
const v1 = JSON.parse(v1Bytes);
const recoveryBytes = fs.readFileSync(absolute(RECOVERY_ACCEPTANCE));
const recovery = JSON.parse(recoveryBytes);
invariant(manifestIdentity === sha256(JSON.stringify(payload))
  && manifest.transactionId === EXPECTED.transactionId
  && manifest.mvpScope === true
  && manifest.releaseNodeId === 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR'
  && manifest.status.includes('AWAITING_FRESH_EXECUTION_KERNEL'),
'manifest identity/schema drifted');
invariant(sha256(v1Bytes) === EXPECTED.v1ManifestSha256
  && sha256(recoveryBytes) === EXPECTED.recoveryAcceptanceSha256
  && manifest.source.completeSaveSha256 === EXPECTED.completeSaveSha256
  && manifest.source.sourceRegionSha256 === EXPECTED.regionSha256,
'v1/recovery/source binding drifted');

const reader = new AnvilReader(absolute(path.join(manifest.source.snapshotRoot, 'region')));
const records = [];
const targetKeys = new Set();
let inverseCount = 0;
for (const pkg of manifest.packages) {
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  const operation = manifest.operations[pkg.key];
  invariant(forward.length === operation.targetCellCount
    && rollback.length === forward.length
    && bodySha256(pkg.forward) === operation.forwardSha256
    && bodySha256(pkg.rollback) === operation.rollbackSha256,
  `${pkg.key} operation identity drifted`);
  for (let index = 0; index < forward.length; index += 1) {
    const record = forward[index];
    const inverse = rollback[rollback.length - index - 1];
    invariant(cellKey(record.cell) === cellKey(inverse.cell)
      && record.sourceState === inverse.targetState
      && record.targetState === inverse.sourceState,
    `${pkg.key} inverse drifted at ${index}`);
    const actual = stateToCommandString(
      await reader.blockState(record.cell.x, record.cell.y, record.cell.z),
    );
    invariant(actual === record.sourceState,
      `${pkg.key} source guard drifted at ${cellKey(record.cell)}`);
    invariant(!targetKeys.has(cellKey(record.cell)),
      `cross-package overlap at ${cellKey(record.cell)}`);
    targetKeys.add(cellKey(record.cell));
    records.push({ ...record, packageKey: pkg.key });
    inverseCount += 1;
  }
}
invariant(records.length === EXPECTED.targetCount && inverseCount === EXPECTED.targetCount
  && hashCells(records.map(({ cell }) => cell)) === EXPECTED.targetHash,
'target/source/inverse proof failed');

const halo = uniqueCells(records.flatMap(({ cell }) => {
  const result = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      result.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return result;
}));
let haloFluidCount = 0;
for (const cell of halo) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (isFluid(state)) haloFluidCount += 1;
}
invariant(halo.length === EXPECTED.haloCount && hashCells(halo) === EXPECTED.haloHash
  && haloFluidCount === 0,
'exact retry operated-halo identity/fluid isolation drifted');

const v1Records = new Map();
for (const pkg of v1.packages) {
  for (const record of parseOperations(pkg.forward)) v1Records.set(cellKey(record.cell), record);
}
const changed = records.filter((record) => {
  const previous = v1Records.get(cellKey(record.cell));
  return previous.sourceState !== record.sourceState
    || previous.targetState !== record.targetState;
});
invariant(changed.length === 2
  && changed.every(({ cell, sourceState, targetState }) => (
    ['1529,68,-251', '1540,68,-238'].includes(cellKey(cell))
      && sourceState === 'minecraft:grass_block[snowy=false]'
      && targetState === 'minecraft:air'
  ))
  && manifest.scope.lifecycleRebound.changedRollbackRecordCount === 2,
'retry differs from v1 outside the exact two lifecycle source/inverse states');
const surfaceNames = new Set([
  'minecraft:gray_concrete', 'minecraft:smooth_stone', 'minecraft:yellow_concrete',
]);
const surface = records.filter(({ targetState }) => surfaceNames.has(targetState));
invariant(surface.length === 355
  && connectedComponents(surface.map(({ cell }) => cell)).length === 1
  && manifest.scope.headroomCuts.cellCount === 667
  && manifest.scope.selectedFoundationFill.cellCount === 636
  && manifest.scope.omittedDeepFoundationFill.cellCount === 110
  && manifest.scope.transverseBeam.cellCount === 5,
'identical bridge geometry/support partition drifted');
invariant(recovery.retainedHydraulicReview.recovery.fluidCellCount === 45
  && recovery.retainedHydraulicReview.recovery.fluidCoordinateSetSha256
    === 'ed82013dae3ec27a4b79c8577554279c91b51668795bb952c54a680ce0225df8'
  && recovery.retainedHydraulicReview.recovery.componentCount === 1
  && recovery.retainedHydraulicReview.recovery.minimumTargetChebyshevDistance === 2
  && manifest.scope.retainedHydraulicGraph.fluidCoordinateSetSha256
    === recovery.retainedHydraulicReview.recovery.fluidCoordinateSetSha256
  && manifest.scope.retainedHydraulicGraph.targetHaloFluidCount === 0,
'snapshot-specific retained-fluid baseline drifted');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS',
  mode: 'OFFLINE_READ_ONLY_R11H_RETRY_V2_RECOVERY_REBOUND',
  manifest: {
    path: `data/buildops/${manifest.transactionId}.release-manifest.json`,
    sha256: sha256(manifestBytes),
    manifestIdentitySha256: manifestIdentity,
  },
  source: manifest.source,
  checks: {
    packageCount: manifest.packages.length,
    exactSourceGuardMatchCount: records.length,
    exactInverseRecordCount: inverseCount,
    uniqueTargetCellCount: records.length,
    changedForwardSourceGuardCount: changed.length,
    changedRollbackTargetCount: manifest.scope.lifecycleRebound.changedRollbackRecordCount,
    unchangedTargetCoordinateSet: true,
    surfaceCellCount: surface.length,
    surfaceComponentCount: 1,
    headroomCutCount: manifest.scope.headroomCuts.cellCount,
    selectedFoundationCount: manifest.scope.selectedFoundationFill.cellCount,
    omittedDeepFoundationCount: manifest.scope.omittedDeepFoundationFill.cellCount,
    beamCellCount: manifest.scope.transverseBeam.cellCount,
    retainedFluidBaselineCount: manifest.scope.retainedHydraulicGraph.fluidCellCount,
    retainedFluidComponentCount: manifest.scope.retainedHydraulicGraph.componentCount,
    targetHaloFluidCount: haloFluidCount,
    interactionHaloCellCount: halo.length,
    strictNoopWeakened: false,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
  reboundRecords: changed,
  identities: {
    targetCoordinateSetSha256: hashCells(records.map(({ cell }) => cell)),
    interactionHaloCoordinateSetSha256: hashCells(halo),
    retainedFluidCoordinateSetSha256:
      manifest.scope.retainedHydraulicGraph.fluidCoordinateSetSha256,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MD_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MD_PATH), `# R11H retry-v2 offline QA\n\nStatus: **PASS**\n\nRetry-v2 preserves all ${records.length.toLocaleString('en-US')} target coordinates and the exact two-package ordering. Exactly two source guards and inverse targets are rebound from dirt to the accepted recovery grass states; all other 1,664 records are unchanged.\n\nThe exact ${halo.length.toLocaleString('en-US')}-cell operated halo contains zero recovery fluid. The distinct 45-cell settled lava baseline remains one component at minimum target distance two. All source guards, reverse inverses, bridge geometry, support partition, and strict-noop contracts pass.\n\nQA payload: \`${qaPayloadSha256}\`. No live call or world edit was performed.\n`);
console.log(JSON.stringify({
  status: report.status,
  report: OUT_PATH,
  markdown: MD_PATH,
  qaPayloadSha256,
  checks: report.checks,
}, null, 2));
