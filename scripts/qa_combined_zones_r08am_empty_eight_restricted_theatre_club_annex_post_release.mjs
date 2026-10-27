#!/usr/bin/env node
/** Independent read-only R08AM theatre/private-club annex post-release QA. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
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
const GENERATED_AT = value('--generated-at', '2026-08-22T16:30:00Z');
const EVIDENCE_DIR = value('--evidence-dir', 'data/world-review/combined-zones-r08am-live-20260822T161818Z');
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value('--manifest', 'data/buildops/combined-zones-r08am-empty-eight-restricted-theatre-private-club-annex.release-manifest.json');
const POST_ROOT = value('--post-root', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r08am-post-release-qa.json'));
const MD_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r08am-post-release-qa.md'));
const DESIGN_PATH = 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json';
const R08AL_MANIFEST_PATH = 'data/buildops/combined-zones-r08al-empty-eight-south-public-vacant-retail.release-manifest.json';
const R08AL_QA_PATH = 'data/world-review/combined-zones-r08al-live-20260822T155850Z/r08al-post-release-qa.json';
const BASENAME = 'combined-zones-r08am-empty-eight-restricted-theatre-private-club-annex';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08AM post-release QA rejected: ${message}`);
};
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const exactSet = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: boundsOf(exact), coordinateSetSha256: hashCells(exact) };
};
const operationBody = (filename) => `${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
function parseOperations(filename) {
  return fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const fields = line.split(/\s+/);
      invariant(fields[0] === 'REPL' && fields.length === 9, `${filename} malformed`);
      const values = fields.slice(1, 7).map(Number);
      invariant(values.slice(0, 3).every((entry, index) => entry === values[index + 3]),
        `${filename} is not point-exact`);
      return { cell: { x: values[0], y: values[1], z: values[2] },
        fromState: fields[7], toState: fields[8] };
    });
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const design = readJson(DESIGN_PATH);
const r08alManifest = readJson(R08AL_MANIFEST_PATH);
const r08alQa = readJson(R08AL_QA_PATH);
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.mode === 'EXECUTE'
  && ledger.transactionId === BASENAME
  && ledger.releaseNodeId === RELEASE_NODE_ID,
'terminal release identity failed');
invariant(ledger.manifest.sha256 === fileBinding(MANIFEST_PATH).sha256
  && absolute(ledger.postSnapshot.root) === absolute(POST_ROOT)
  && manifest.transactionId === ledger.transactionId
  && manifest.mvpScope === true,
'manifest/post binding failed');
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && fileBinding(ledger.sourceSnapshot.identity.path).sha256 === ledger.sourceSnapshot.identity.sha256
  && fileBinding(ledger.postSnapshot.identity.path).sha256 === ledger.postSnapshot.identity.sha256,
'source/post immutable save evidence failed');
const evidenceMismatches = ledger.evidenceBindings.filter((binding) => {
  const observed = fileBinding(binding.path);
  return observed.sha256 !== binding.sha256 || observed.bytes !== binding.bytes;
});
invariant(ledger.stages.length === 52 && ledger.stages.every(({ status }) => status === 'PASS')
  && ledger.evidenceBindings.length === 57 && evidenceMismatches.length === 0,
'execution stage/evidence binding failed');

const forwardOrder = manifest.executionOrder.forward;
const rollbackOrder = manifest.executionOrder.rollback;
invariant(JSON.stringify(rollbackOrder) === JSON.stringify([...forwardOrder].reverse()),
'rollback package order failed');
const operations = [];
const packageEvidence = [];
for (const [index, pkg] of manifest.packages.entries()) {
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  const execution = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.forward-execution.json`));
  const rollbackPreflight = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.rollback-poststate-preflight.json`));
  invariant(sha256(operationBody(pkg.forward)) === manifest.operations[pkg.key].forwardSha256
    && sha256(operationBody(pkg.rollback)) === manifest.operations[pkg.key].rollbackSha256
    && ledger.packages[index].forward.sha256 === fileBinding(pkg.forward).sha256
    && ledger.packages[index].rollback.sha256 === fileBinding(pkg.rollback).sha256
    && JSON.stringify(rollback) === JSON.stringify([...forward].reverse().map((entry) => ({
      cell: entry.cell, fromState: entry.toState, toState: entry.fromState,
    }))), `${pkg.key} operation/inverse binding failed`);
  invariant(execution.status === 'complete' && execution.strictNoop === true
    && execution.successfulCommands === forward.length && execution.failedCommands === 0
    && execution.noopCommands === 0 && rollbackPreflight.status === 'PASS'
    && rollbackPreflight.passed === rollback.length && rollbackPreflight.failed === 0,
  `${pkg.key} strict execution or inverse readiness failed`);
  operations.push(...forward.map((entry) => ({ ...entry, packageKey: pkg.key })));
  packageEvidence.push({ key: pkg.key, exactForwardCount: forward.length,
    successfulCount: execution.successfulCommands, exactRollbackReadyCount: rollbackPreflight.passed });
}
invariant(operations.length === 44366 && uniqueCells(operations.map(({ cell }) => cell)).length === 44366,
'operated union is not exactly 44,366 cells');

// Independent final-state reconstruction, including source cells that were
// already in their target state and therefore absent from operation files.
const desired = new Map();
const set = (cell, state) => desired.set(cellKey(cell), { cell, state });
const ANNEX = { minX: 1700, maxX: 1789, minY: 24, maxY: 35, minZ: 185, maxZ: 224 };
for (const cell of cellsIn({ ...ANNEX, minY: 24, maxY: 24 })) set(cell, 'minecraft:polished_deepslate');
for (const cell of cellsIn({ ...ANNEX, minY: 35, maxY: 35 })) set(cell, 'minecraft:smooth_stone');
for (const z of [185, 224]) for (const cell of cellsIn({ minX: 1700, maxX: 1789, minY: 25, maxY: 34, minZ: z, maxZ: z })) set(cell, 'minecraft:light_gray_concrete');
for (const x of [1700, 1789]) for (const cell of cellsIn({ minX: x, maxX: x, minY: 25, maxY: 34, minZ: 186, maxZ: 223 })) set(cell, 'minecraft:light_gray_concrete');
for (const cell of cellsIn({ minX: 1701, maxX: 1788, minY: 25, maxY: 34, minZ: 186, maxZ: 223 })) set(cell, 'minecraft:air');
const stairSteps = [];
const stairLights = [];
for (let index = 0; index <= 25; index += 1) {
  const y = 49 - index;
  const z = 160 + index;
  for (let x = 1740; x <= 1746; x += 1) {
    const cell = { x, y, z };
    stairSteps.push(cell);
    set(cell, 'minecraft:polished_andesite_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]');
    for (let h = 1; h <= 5; h += 1) set({ x, y: y + h, z }, 'minecraft:air');
    set({ x, y: y + 6, z }, 'minecraft:smooth_stone');
  }
  for (const x of [1739, 1747]) for (let wallY = y; wallY <= y + 6; wallY += 1) set({ x, y: wallY, z }, 'minecraft:polished_deepslate');
  if (index % 5 === 2) for (const x of [1739, 1747]) {
    const cell = { x, y: y + 3, z };
    stairLights.push(cell);
    set(cell, 'minecraft:sea_lantern');
  }
}
for (const x of [1742, 1743]) {
  set({ x, y: 50, z: 159 }, 'minecraft:iron_door[facing=south,half=lower,hinge=left,open=false,powered=false]');
  set({ x, y: 51, z: 159 }, 'minecraft:iron_door[facing=south,half=upper,hinge=left,open=false,powered=false]');
}
for (const x of [1741, 1744]) for (const y of [50, 51]) set({ x, y, z: 159 }, 'minecraft:red_terracotta');
for (let x = 1740; x <= 1746; x += 1) for (let y = 25; y <= 30; y += 1) set({ x, y, z: 185 }, 'minecraft:air');
for (const cell of cellsIn({ minX: 1756, maxX: 1756, minY: 25, maxY: 34, minZ: 186, maxZ: 223 })) set(cell, 'minecraft:polished_deepslate');
for (const y of [25, 26]) set({ x: 1756, y, z: 216 }, `minecraft:iron_door[facing=east,half=${y === 25 ? 'lower' : 'upper'},hinge=left,open=false,powered=false]`);
for (const z of [214, 218]) for (const y of [25, 26, 27]) set({ x: 1756, y, z }, 'minecraft:red_terracotta');
for (const cell of cellsIn({ minX: 1747, maxX: 1754, minY: 25, maxY: 25, minZ: 188, maxZ: 221 })) set(cell, 'minecraft:polished_andesite');
for (const cell of cellsIn({ minX: 1755, maxX: 1755, minY: 26, maxY: 33, minZ: 189, maxZ: 220 })) set(cell, 'minecraft:black_concrete');
for (const cell of cellsIn({ minX: 1749, maxX: 1753, minY: 26, maxY: 26, minZ: 201, maxZ: 207 })) set(cell, 'minecraft:red_wool');
for (const cell of cellsIn({ minX: 1752, maxX: 1753, minY: 27, maxY: 27, minZ: 202, maxZ: 206 })) set(cell, 'minecraft:white_wool');
for (const z of [191, 197, 203, 209, 215, 219]) {
  set({ x: 1755, y: 29, z }, 'minecraft:shroomlight');
  set({ x: 1754, y: 29, z }, 'minecraft:red_stained_glass');
}
const theatreSeats = [];
for (let row = 0; row < 10; row += 1) for (let seat = 0; seat < 10; seat += 1) {
  const cell = { x: 1705 + row * 4, y: 25, z: 189 + seat * 3 };
  theatreSeats.push(cell);
  set(cell, 'minecraft:crimson_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]');
}
const theatreLights = [];
for (const x of [1707, 1719, 1731, 1743]) for (const z of [190, 200, 210, 220]) {
  const cell = { x, y: 35, z };
  theatreLights.push(cell);
  set(cell, 'minecraft:sea_lantern');
}
for (const cell of cellsIn({ minX: 1762, maxX: 1762, minY: 25, maxY: 34, minZ: 186, maxZ: 212 })) set(cell, 'minecraft:polished_deepslate');
for (const cell of cellsIn({ minX: 1775, maxX: 1775, minY: 25, maxY: 34, minZ: 186, maxZ: 212 })) set(cell, 'minecraft:polished_deepslate');
for (const z of [199, 212]) for (const cell of cellsIn({ minX: 1763, maxX: 1788, minY: 25, maxY: 34, minZ: z, maxZ: z })) set(cell, 'minecraft:polished_deepslate');
const suiteDoors = [{ x: 1762, z: 191 }, { x: 1775, z: 191 }, { x: 1762, z: 205 }, { x: 1775, z: 205 }];
for (const door of suiteDoors) for (const y of [25, 26]) set({ x: door.x, y, z: door.z },
  `minecraft:crimson_door[facing=east,half=${y === 25 ? 'lower' : 'upper'},hinge=left,open=false,powered=false]`);
const suiteBeds = [
  { minX: 1765, maxX: 1768, minZ: 188, maxZ: 193 }, { minX: 1779, maxX: 1782, minZ: 188, maxZ: 193 },
  { minX: 1765, maxX: 1768, minZ: 202, maxZ: 207 }, { minX: 1779, maxX: 1782, minZ: 202, maxZ: 207 },
];
for (const bed of suiteBeds) {
  for (const cell of cellsIn({ ...bed, minY: 25, maxY: 25 })) set(cell, 'minecraft:red_wool');
  for (const cell of cellsIn({ minX: bed.maxX - 1, maxX: bed.maxX, minY: 26, maxY: 26, minZ: bed.minZ + 1, maxZ: bed.maxZ - 1 })) set(cell, 'minecraft:white_wool');
  set({ x: bed.minX + 1, y: 34, z: bed.maxZ + 2 }, 'minecraft:shroomlight');
}
for (const z of [188, 196, 204, 212, 220]) {
  set({ x: 1759, y: 35, z }, 'minecraft:shroomlight');
  set({ x: 1759, y: 34, z }, 'minecraft:red_stained_glass');
}
for (const cell of cellsIn({ minX: 1764, maxX: 1768, minY: 25, maxY: 29, minZ: 223, maxZ: 223 })) set(cell, 'minecraft:polished_blackstone_bricks');
for (const x of [1765, 1767]) for (const y of [26, 27]) {
  set({ x, y, z: 223 }, 'minecraft:shroomlight');
  set({ x, y, z: 222 }, 'minecraft:orange_stained_glass');
}
const swings = [{ x: 1770, z: 219 }, { x: 1773, z: 219 }];
for (const seat of swings) {
  set({ ...seat, y: 25 }, 'minecraft:crimson_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]');
  for (let y = 26; y <= 34; y += 1) set({ ...seat, y }, 'minecraft:iron_bars[east=false,north=false,south=false,waterlogged=false,west=false]');
}
for (const cell of cellsIn({ minX: 1776, maxX: 1782, minY: 26, maxY: 26, minZ: 215, maxZ: 219 })) set(cell, 'minecraft:green_wool');
for (const x of [1776, 1782]) for (const z of [215, 219]) set({ x, y: 25, z }, 'minecraft:dark_oak_log[axis=y]');
for (const z of [214, 215, 216, 217, 218, 219, 220]) for (let y = 27; y <= 31; y += 1) set({ x: 1788, y, z }, 'minecraft:white_concrete');
const cinemaSeats = [];
for (const x of [1784, 1786]) for (const z of [215, 218, 221]) {
  const cell = { x, y: 25, z };
  cinemaSeats.push(cell);
  set(cell, 'minecraft:crimson_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]');
}
for (const x of [1766, 1774, 1782, 1787]) set({ x, y: 35, z: 218 }, 'minecraft:shroomlight');

const targets = [...desired.values()].map(({ cell }) => cell);
const targetKeys = new Set(targets.map(cellKey));
const halo = uniqueCells(targets.flatMap((cell) => FACE.map(([dx, dy, dz]) => ({
  x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
})))).filter((cell) => !targetKeys.has(cellKey(cell)));
invariant(targets.length === 44783 && hashCells(targets) === manifest.scope.geometry.targets.coordinateSetSha256
  && halo.length === 11088 && hashCells(halo) === manifest.scope.geometry.interactionHalo.coordinateSetSha256,
'independent full target or halo geometry failed');
const operationKeys = new Set(operations.map(({ cell }) => cellKey(cell)));
invariant(operations.every(({ cell }) => targetKeys.has(cellKey(cell))), 'operation outside declared target set');

const sourceReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const sourceStates = new Map();
const postStates = new Map();
async function readBoth(cell) {
  const key = cellKey(cell);
  if (!sourceStates.has(key)) sourceStates.set(key, stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z)));
  if (!postStates.has(key)) postStates.set(key, stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)));
}
for (const cell of uniqueCells([...targets, ...halo])) await readBoth(cell);
const finalMismatch = [...desired].filter(([key, { state }]) => postStates.get(key) !== state);
const transitionMismatch = operations.filter(({ cell, fromState, toState }) => (
  sourceStates.get(cellKey(cell)) !== fromState || postStates.get(cellKey(cell)) !== toState
));
const derivedChanged = [...desired].filter(([key, { state }]) => sourceStates.get(key) !== state).map(([key]) => key);
const haloDrift = halo.filter((cell) => sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
invariant(finalMismatch.length === 0 && transitionMismatch.length === 0
  && derivedChanged.length === 44366 && derivedChanged.every((key) => operationKeys.has(key))
  && haloDrift.length === 0,
'exact target final state/source transition or halo drift failed');

// Preserve prior R08AL operations except the exact eight-cell rear-wall seam.
const seamKeys = new Set([
  ...[1742, 1743].flatMap((x) => [{ x, y: 50, z: 159 }, { x, y: 51, z: 159 }]),
  ...[1741, 1744].flatMap((x) => [{ x, y: 50, z: 159 }, { x, y: 51, z: 159 }]),
].map(cellKey));
const r08alCells = uniqueCells(r08alManifest.packages.flatMap(({ forward }) => parseOperations(forward).map(({ cell }) => cell)));
for (const cell of r08alCells) await readBoth(cell);
const r08alDrift = r08alCells.filter((cell) => !seamKeys.has(cellKey(cell))
  && sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
invariant(r08alQa.status === 'PASS_PUBLIC_VACANT_RETAIL_AND_RESTRICTED_BOH_COMMISSIONED'
  && r08alDrift.length === 0 && [...seamKeys].every((key) => targetKeys.has(key)),
'R08AL preservation or exact seam declaration failed');

const future = uniqueCells(design.d06.futureInterfaces.interfaces.flatMap(({ sealDesign }) => cellsIn(sealDesign.bounds)));
const drainage = uniqueCells([
  ...design.d06.lifeSafety.drainage.trackDrainAndSumpReservations.flatMap(({ channel, sumpReservation }) => [
    ...cellsIn(channel.bounds), ...cellsIn(sumpReservation.bounds),
  ]),
  ...cellsIn(design.d06.lifeSafety.drainage.internalDischargeHeader.bounds),
  ...cellsIn(design.d06.lifeSafety.drainage.sealedBoundaryCap.bounds),
]);
const fireSpine = cellsIn(design.d06.lifeSafety.fireAndServiceAccess.internalSpineReservation.bounds);
const northShells = design.d06.concourseAndRetail.retailShells.filter(({ wing }) => wing === 'north galleria')
  .flatMap(({ bounds }) => cellsIn(bounds));
const retained = uniqueCells([...future, ...drainage, ...fireSpine, ...northShells]);
for (const cell of retained) await readBoth(cell);
const retainedDrift = retained.filter((cell) => sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
invariant(retainedDrift.length === 0 && retained.every((cell) => !targetKeys.has(cellKey(cell))),
'future rail/drainage/fire-service/north retail retained interface failed');

const liveEntities = readJson(path.join(EVIDENCE_DIR, 'live-entity-clearance.json'));
const blockEntities = readJson(path.join(EVIDENCE_DIR, 'block-entity-clearance.json'));
invariant(liveEntities.status === 'PASS' && liveEntities.totals.blockingEntityHits === 0
  && blockEntities.status === 'PASS' && blockEntities.blockingBlockEntityCount === 0,
'entity/block-entity evidence failed');

const payload = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_RESTRICTED_THEATRE_PRIVATE_CLUB_ANNEX_COMMISSIONED',
  releaseNodeId: RELEASE_NODE_ID,
  releaseId: manifest.scope.releaseId,
  transactionId: BASENAME,
  ledger: fileBinding(LEDGER_PATH),
  manifest: fileBinding(MANIFEST_PATH),
  completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  postSnapshot: { root: relative(POST_ROOT), completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
    regionSha256: postIdentity.sha256, identity: fileBinding(ledger.postSnapshot.identity.path),
    completeSaveIntake: fileBinding(ledger.postSnapshot.completeSaveIntake.path) },
  exactTargetStates: { ...exactSet(targets), passed: targets.length, failed: finalMismatch.length,
    operatedTransitions: operations.length, sourceAlreadyTarget: targets.length - operations.length },
  route: {
    status: 'CONNECTED_RESTRICTED_BOH_TO_LOWER_ANNEX',
    public: false,
    adultsOnlyRestricted: true,
    securedUpperDoorCount: 2,
    r08alSeamCellCount: seamKeys.size,
    grandStair: { width: 7, longitudinalStepCount: 26, exactStepBlockCount: stairSteps.length,
      verticalDrop: 25, exactStepContinuity: true, exactHeadroomHeight: 5,
      upperThreshold: { minX: 1740, maxX: 1746, y: 49, z: 160 },
      lowerLanding: { minX: 1740, maxX: 1746, y: 24, z: 185 }, lightCount: stairLights.length },
    rearStageDoorCount: 1,
  },
  theatre: {
    bounds: manifest.scope.annex.theatre.bounds,
    exactAudienceSeatCount: theatreSeats.length,
    finishedStage: true,
    noninteractiveKingSizeBedShapedCenterpiece: true,
    ceilingLightCount: theatreLights.length,
    dramaticFilteredStageLightCount: 6,
  },
  privateClub: {
    bounds: manifest.scope.annex.privateClub.bounds,
    restrictedCorridorContinuous: true,
    suiteCount: suiteBeds.length,
    suiteDoorCount: suiteDoors.length,
    communalPartyLounge: true,
    simulatedFireplaceCount: 2,
    activeFireCount: 0,
    nonexplicitSwingSeatCount: swings.length,
    billiardsTableCount: 1,
    smallCinemaSeatCount: cinemaSeats.length,
  },
  contentBoundary: manifest.scope.contentBoundary,
  preservation: {
    r08alOperationCellCountChecked: r08alCells.length,
    r08alDeclaredSeamCellCount: seamKeys.size,
    r08alOffSeamDriftCount: r08alDrift.length,
    interactionHalo: { ...exactSet(halo), driftCount: haloDrift.length },
    retainedInterfaceCellCount: retained.length,
    retainedInterfaceDriftCount: retainedDrift.length,
    northRetailShellsCapped: true,
    n06ExceptionUntouched: true,
    futureRailInterfacesOpened: false,
    drainageOpened: false,
    fireServiceSpineOpened: false,
    utilityVentMechanismInterfacesOpened: false,
    targetBlockEntityCount: blockEntities.blockingBlockEntityCount,
    liveBlockingEntityCount: liveEntities.totals.blockingEntityHits,
  },
  execution: { stageCount: ledger.stages.length, evidenceBindingCount: ledger.evidenceBindings.length,
    packages: packageEvidence, exactRollbackReadyCount: packageEvidence.reduce((sum, entry) => sum + entry.exactRollbackReadyCount, 0),
    rollbackOrder },
  nonclaims: {
    publicAccess: false,
    occupantsOrNpcsIntroduced: false,
    explicitSexualContent: false,
    coercionOrConfinement: false,
    futureRailUtilityDrainageOrHazardServiceOpened: false,
  },
};
const payloadSha256 = sha256(JSON.stringify(payload));
const report = { ...payload, payloadSha256 };
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MD_PATH), `# R08AM restricted theatre/private-club annex post-release QA\n\n`
  + `Status: **${report.status}**\n\n`
  + `- Exact final targets: ${targets.length.toLocaleString()} (${operations.length.toLocaleString()} operated; ${targets.length - operations.length} already target).\n`
  + `- Route: secured R08AL BOH threshold, seven-wide 25-block grand descent, and enclosed lower landing.\n`
  + `- Theatre: exactly 100 seats, finished stage, noninteractive bed-shaped centerpiece, 16 ceiling and six filtered dramatic lights.\n`
  + `- Private club: four suites, restricted corridor, party lounge, two simulated fireplaces, two non-explicit swing seats, billiards, and six-seat cinema.\n`
  + `- Preservation: zero R08AL off-seam, ${halo.length.toLocaleString()}-cell halo, or retained-interface drift; exact eight-cell R08AL rear-wall seam only.\n`
  + `- Rollback: ${operations.length.toLocaleString()}/${operations.length.toLocaleString()} exact guards pass.\n`
  + `- Boundary: restricted adults-only theme; no explicit acts/anatomy, coercion, confinement, NPCs/entities, active fire, or rail/utility/drainage/hazard opening.\n`
  + `- Payload SHA-256: \`${payloadSha256}\`\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, report: relative(OUT_PATH), markdown: relative(MD_PATH),
  payloadSha256, exactTargetCount: targets.length, operationCount: operations.length,
  haloDriftCount: haloDrift.length, r08alOffSeamDriftCount: r08alDrift.length,
  retainedInterfaceDriftCount: retainedDrift.length }, null, 2)}\n`);
