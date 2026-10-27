#!/usr/bin/env node
/** Read-only post-release seal for CZ-R08B / EE-PF-08. */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  assignD06CanonicalLayers,
  boundsOf,
  cellKey,
  cellsIn,
  deriveD06DetailedMechanismLayers,
  hashCells,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const QA_LABEL = value('--qa-label', 'R08B');
const PLATFORM_ID = value('--platform-id', 'EE-PF-08');
const PLATFORM_CODE = PLATFORM_ID.match(/^EE-PF-(\d{2})$/)?.[1];
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r08b-live-20260821T162429Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r08-empty-eight-platform-08-fitout.release-manifest.json',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r08b-post-20260821T162429Z',
);
const OUT_PATH = value(
  '--out',
  path.join(EVIDENCE_DIR, `${QA_LABEL.toLowerCase()}-post-release-qa.json`),
);
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, `${QA_LABEL.toLowerCase()}-post-release-qa.md`),
);
const GENERATED_AT = value('--generated-at', '2026-08-21T16:30:00Z');
const AIR_BLOCKS = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`${QA_LABEL} post-release QA rejected: ${message}`);
};
const fileBinding = (filename) => ({
  path: filename,
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const sameClass = (left, right) => (
  left.cellCount === right.cellCount
  && left.coordinateSetSha256 === right.coordinateSetSha256
);
const operationBody = (filename) => `${fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#'))
  .join('\n')}\n`;

function parseOperations(filename) {
  const operations = [];
  for (const line of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const fields = line.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const numbers = fields.slice(1, 7).map(Number);
    invariant(numbers.every(Number.isSafeInteger)
      && numbers[0] === numbers[3]
      && numbers[1] === numbers[4]
      && numbers[2] === numbers[5],
    `${filename} contains a non-point or invalid operation`);
    operations.push({
      cell: { x: numbers[0], y: numbers[1], z: numbers[2] },
      fromState: fields[7],
      toState: fields[8],
    });
  }
  return operations;
}

function connectivity(cells) {
  const remaining = new Set(cells.map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    let size = 0;
    while (stack.length) {
      const key = stack.pop();
      size += 1;
      const [x, y, z] = key.split(',').map(Number);
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const neighbour = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(neighbour)) stack.push(neighbour);
      }
    }
    sizes.push(size);
  }
  sizes.sort((left, right) => right - left);
  return { componentCount: sizes.length, largestComponentCellCount: sizes[0] ?? 0 };
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const postIntakePath = path.join(EVIDENCE_DIR, 'post-complete-save-intake.json');
const postIntake = readJson(postIntakePath);
const emptyEight = readJson('docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json');
const lifeSafety = readJson('docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json');
const mechanisms = readJson('docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json');
const detailed = readJson('docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json');
const materialDecision = readJson('docs/masterplans/05-combined-zones/phase1-r02-d06-scope-and-material-decision.json');

const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload)),
  'manifest payload identity drifted');
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.mode === 'EXECUTE'
  && ledger.transactionId === manifest.transactionId
  && ledger.releaseNodeId === manifest.releaseNodeId
  && ledger.stages.every(({ status }) => status === 'PASS'),
'ledger is not a terminal all-PASS R08B execution');
const manifestBinding = fileBinding(MANIFEST_PATH);
invariant(path.resolve(ROOT, ledger.manifest.path) === absolute(MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256
  && ledger.manifest.bytes === manifestBinding.bytes,
'ledger manifest binding drifted');
invariant(path.resolve(ROOT, ledger.postSnapshot.root) === absolute(POST_ROOT)
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.summary?.passed === true
  && postIntake.packageIdentity?.completeSaveSha256 === ledger.postSnapshot.completeSaveSha256,
'post complete-save binding is not accepted');

const packageOperations = [];
for (const pkg of manifest.packages) {
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  const declared = manifest.operations[pkg.key];
  invariant(sha256(operationBody(pkg.forward)) === declared.forwardSha256
    && sha256(operationBody(pkg.rollback)) === declared.rollbackSha256,
  `${pkg.key} operation hash drifted`);
  invariant(forward.length === declared.forwardCommandCount
    && rollback.length === declared.rollbackCommandCount,
  `${pkg.key} operation count drifted`);
  const expectedRollback = forward.slice().reverse().map(({ cell, fromState, toState }) => ({
    cell, fromState: toState, toState: fromState,
  }));
  invariant(JSON.stringify(rollback) === JSON.stringify(expectedRollback),
    `${pkg.key} rollback is not the exact inverse`);
  packageOperations.push(...forward.map((operation) => ({ ...operation, packageKey: pkg.key })));
}
const operatedCells = uniqueCells(packageOperations.map(({ cell }) => cell));
invariant(sameClass(classManifest(operatedCells), manifest.target.operatedUnion),
'operated target identity drifted');
const expectedByCell = new Map(packageOperations.map((record) => [cellKey(record.cell), record.toState]));

const platform = emptyEight.d06.platforms.find(({ id }) => id === PLATFORM_ID);
const barrierRecord = lifeSafety.d06EmptyEightLifeSafety
  .failClosedBarriersAndSmokeInterfaces.platformBarriers.find(({ id }) => id === PLATFORM_ID);
invariant(platform && barrierRecord, 'frozen EE-PF-08 geometry is missing');
const floor = cellsIn(platform.surface.bounds);
const floorBounds = platform.surface.bounds;
const platformMinZ = floorBounds.minZ;
const platformMaxZ = floorBounds.maxZ;
const ceilingY = floorBounds.minY + 5;
const interiorMinY = floorBounds.minY + 1;
const interiorMaxY = ceilingY - 1;
const ceiling = cellsIn({
  minX: floorBounds.minX,
  maxX: floorBounds.maxX,
  minY: ceilingY,
  maxY: ceilingY,
  minZ: platformMinZ,
  maxZ: platformMaxZ,
});
const interior = cellsIn({
  minX: floorBounds.minX,
  maxX: floorBounds.maxX,
  minY: interiorMinY,
  maxY: interiorMaxY,
  minZ: platformMinZ,
  maxZ: platformMaxZ,
});
const chamber = uniqueCells([...floor, ...interior, ...ceiling]);
const gateBays = [1664, 1688, 1712, 1736].flatMap((minX) => cellsIn({
  minX,
  maxX: minX + 2,
  minY: interiorMinY,
  maxY: interiorMinY + 1,
  minZ: platformMinZ,
  maxZ: platformMinZ,
}));
const completeBarrier = cellsIn({
  minX: floorBounds.minX,
  maxX: floorBounds.maxX,
  minY: interiorMinY,
  maxY: interiorMinY + 1,
  minZ: platformMinZ,
  maxZ: platformMinZ,
});
invariant(completeBarrier.length === barrierRecord.completeFailClosedBarrier.cellCount,
  'complete barrier count drifted');
const fixtures = [1660, 1676, 1692, 1708, 1724, 1740, 1748]
  .map((x) => ({ x, y: ceilingY, z: platformMaxZ }));

const { layers, proposalUnion } = deriveD06DetailedMechanismLayers(
  mechanisms.mechanismDevelopmentPayload,
  emptyEight,
  detailed,
);
const layerOwner = assignD06CanonicalLayers(layers, detailed);
const layerStates = materialDecision.decisionPayload.mechanismLayerStates;
const chamberKeys = new Set(chamber.map(cellKey));
const barrierKeys = new Set(completeBarrier.map(cellKey));
const gateKeys = new Set(gateBays.map(cellKey));
const mechanismInChamber = proposalUnion.filter((cell) => chamberKeys.has(cellKey(cell)));
const closedLiftEnvelopeCaps = mechanismInChamber.filter((cell) => (
  barrierKeys.has(cellKey(cell)) && layerOwner.get(cellKey(cell)) === 'egaLiftEnvelope'
));
const closedCapKeys = new Set(closedLiftEnvelopeCaps.map(cellKey));
const preservedMechanisms = mechanismInChamber.filter((cell) => (
  !gateKeys.has(cellKey(cell)) && !closedCapKeys.has(cellKey(cell))
));
const preservedKeys = new Set(preservedMechanisms.map(cellKey));
const clearInterior = interior.filter((cell) => (
  !barrierKeys.has(cellKey(cell)) && !preservedKeys.has(cellKey(cell))
));
invariant(sameClass(classManifest(chamber), manifest.scope.geometry.chamberPrism)
  && sameClass(classManifest(clearInterior), manifest.scope.geometry.clearInterior)
  && sameClass(classManifest(preservedMechanisms), manifest.scope.geometry.preservedR02Mechanisms)
  && sameClass(classManifest(closedLiftEnvelopeCaps),
    manifest.scope.geometry.closedUncommissionedLiftEnvelopeCaps),
'independently reproduced chamber/mechanism geometry drifted');

const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
async function inspect(cells, expectedFor) {
  const records = [];
  for (const cell of cells) {
    const actual = stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z));
    const expected = expectedFor(cell);
    records.push({ cell, expected, actual, matches: actual === expected });
  }
  return records;
}
const operatedRecords = await inspect(operatedCells, (cell) => expectedByCell.get(cellKey(cell)));
const preservedRecords = await inspect(preservedMechanisms, (cell) => (
  layerStates[layerOwner.get(cellKey(cell))]?.state
));
const clearRecords = await inspect(clearInterior, () => 'minecraft:air');
const fixtureRecords = await inspect(fixtures, () => 'minecraft:sea_lantern');
const barrierRecords = await inspect(completeBarrier, (cell) => {
  const operatedState = expectedByCell.get(cellKey(cell));
  if (operatedState) return operatedState;
  return layerStates[layerOwner.get(cellKey(cell))]?.state;
});
const mismatchCount = (records) => records.filter(({ matches }) => !matches).length;
const clearMismatchCount = clearRecords.filter(({ actual }) => (
  !AIR_BLOCKS.has(actual.split('[', 1)[0])
)).length;
const openBarrierCount = barrierRecords.filter(({ actual }) => AIR_BLOCKS.has(actual.split('[', 1)[0])).length;
const clearConnectivity = connectivity(clearInterior);

let strictSuccesses = 0;
let rollbackGuards = 0;
for (const pkg of manifest.packages) {
  const count = manifest.operations[pkg.key].forwardCommandCount;
  const execution = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.forward-execution.json`));
  invariant(execution.status === 'complete'
    && execution.strictNoop === true
    && execution.successfulGroups === count
    && execution.failedGroups === 0
    && execution.noopCommands === 0,
  `${pkg.key} strict execution report failed acceptance`);
  strictSuccesses += execution.successfulGroups;
  const rollback = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.rollback-poststate-preflight.json`));
  invariant(rollback.status === 'PASS' && rollback.passed === count && rollback.failed === 0,
    `${pkg.key} rollback post-state report failed acceptance`);
  rollbackGuards += rollback.passed;
}

const checks = [
  ['R08B-QA-01-TERMINAL-LEDGER', ledger.stages.every(({ status }) => status === 'PASS')],
  ['R08B-QA-02-MANIFEST-IDENTITY', ledger.manifest.sha256 === manifestBinding.sha256],
  ['R08B-QA-03-POST-COMPLETE-SAVE', postIntake.packageIdentity.completeSaveSha256 === ledger.postSnapshot.completeSaveSha256],
  ['R08B-QA-04-OPERATED-STATES', mismatchCount(operatedRecords) === 0],
  ['R08B-QA-05-PRESERVED-MECHANISMS', mismatchCount(preservedRecords) === 0],
  ['R08B-QA-06-CLEAR-INTERIOR', clearMismatchCount === 0 && clearConnectivity.componentCount === 1],
  ['R08B-QA-07-LIGHTING', mismatchCount(fixtureRecords) === 0],
  ['R08B-QA-08-FAIL-CLOSED-BARRIER', mismatchCount(barrierRecords) === 0 && openBarrierCount === 0],
  ['R08B-QA-09-STRICT-EXECUTION', strictSuccesses === operatedCells.length],
  ['R08B-QA-10-ROLLBACK-POSTSTATE', rollbackGuards === operatedCells.length],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
const failed = checks.filter(({ status }) => status !== 'PASS');
const payload = {
  schemaVersion: 1,
  id: `combined-zones-${QA_LABEL.toLowerCase()}-empty-eight-platform-${PLATFORM_CODE}-post-release-qa`,
  generatedAtUtc: GENERATED_AT,
  status: failed.length === 0
    ? `PASS_${QA_LABEL}_EMPTY_EIGHT_PLATFORM_${PLATFORM_CODE}_POST_RELEASE_ACCEPTED`
    : `FAIL_${QA_LABEL}_EMPTY_EIGHT_PLATFORM_${PLATFORM_CODE}_POST_RELEASE`,
  release: {
    transactionId: manifest.transactionId,
    manifestIdentity: manifest.manifestIdentity,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  bindings: {
    ledger: fileBinding(LEDGER_PATH),
    manifest: manifestBinding,
    postIntake: fileBinding(postIntakePath),
    postCompleteSaveSha256: ledger.postSnapshot.completeSaveSha256,
  },
  geometry: {
    chamber: classManifest(chamber),
    clearInterior: classManifest(clearInterior),
    preservedMechanisms: classManifest(preservedMechanisms),
    closedLiftEnvelopeCaps: classManifest(closedLiftEnvelopeCaps),
    completeBarrier: classManifest(completeBarrier),
    operatedTargets: classManifest(operatedCells),
  },
  result: {
    operatedTargetMatchCount: operatedRecords.length - mismatchCount(operatedRecords),
    operatedTargetMismatchCount: mismatchCount(operatedRecords),
    preservedMechanismMatchCount: preservedRecords.length - mismatchCount(preservedRecords),
    preservedMechanismMismatchCount: mismatchCount(preservedRecords),
    clearInteriorAirCount: clearRecords.length - clearMismatchCount,
    clearInteriorConnectivity: clearConnectivity,
    lightingMatchCount: fixtureRecords.length - mismatchCount(fixtureRecords),
    barrierMatchCount: barrierRecords.length - mismatchCount(barrierRecords),
    openBarrierCellCount: openBarrierCount,
    strictExecutionSuccessCount: strictSuccesses,
    rollbackGuardPassCount: rollbackGuards,
  },
  checks,
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    readOnlyAnvilInputs: true,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(payload));
const report = { ...payload, qaPayloadSha256 };
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# ${QA_LABEL} · Empty Eight ${PLATFORM_ID} post-release QA

**Status:** ${report.status}  
**QA payload:** \`${qaPayloadSha256}\`  
**Post complete save:** \`${ledger.postSnapshot.completeSaveSha256}\`

| Check | Result |
|---|---:|
| Exact operated states | ${report.result.operatedTargetMatchCount} / ${operatedCells.length} |
| Preserved R02 mechanisms | ${report.result.preservedMechanismMatchCount} / ${preservedMechanisms.length} |
| Clear connected interior | ${report.result.clearInteriorAirCount} / ${clearInterior.length}; ${clearConnectivity.componentCount} component |
| Lights | ${report.result.lightingMatchCount} / ${fixtures.length} |
| Fail-closed barrier | ${report.result.barrierMatchCount} / ${completeBarrier.length}; ${openBarrierCount} open cells |
| Strict execution | ${strictSuccesses} / ${operatedCells.length} |
| Rollback guards | ${rollbackGuards} / ${operatedCells.length} |

This verifier read only the immutable post save and bound evidence. It made no
live call and performed no world mutation.
`;
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);
console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  result: report.result,
  output: OUT_PATH,
  markdown: MARKDOWN_PATH,
}, null, 2));
if (failed.length) process.exitCode = 1;
