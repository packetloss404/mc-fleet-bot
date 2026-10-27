#!/usr/bin/env node
/** Independent read-only R08AL south public-retail/BOH post-release QA. */

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
const GENERATED_AT = value('--generated-at', '2026-08-22T16:05:00Z');
const EVIDENCE_DIR = value('--evidence-dir', 'data/world-review/combined-zones-r08al-live-20260822T155850Z');
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value('--manifest', 'data/buildops/combined-zones-r08al-empty-eight-south-public-vacant-retail.release-manifest.json');
const POST_ROOT = value('--post-root', 'data/worldsnap-r08al-post-20260822T155850Z');
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r08al-post-release-qa.json'));
const MD_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r08al-post-release-qa.md'));
const DESIGN_PATH = 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json';
const BASENAME = 'combined-zones-r08al-empty-eight-south-public-vacant-retail';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08AL post-release QA rejected: ${message}`);
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
      return {
        cell: { x: values[0], y: values[1], z: values[2] },
        fromState: fields[7],
        toState: fields[8],
      };
    });
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const design = readJson(DESIGN_PATH);
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.mode === 'EXECUTE'
  && ledger.transactionId === BASENAME
  && ledger.releaseNodeId === RELEASE_NODE_ID,
'completed release identity failed');
invariant(ledger.manifest.sha256 === fileBinding(MANIFEST_PATH).sha256
  && absolute(ledger.postSnapshot.root) === absolute(POST_ROOT)
  && manifest.transactionId === ledger.transactionId
  && manifest.mvpScope === true,
'manifest or immutable post binding drifted');
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && fileBinding(ledger.sourceSnapshot.identity.path).sha256 === ledger.sourceSnapshot.identity.sha256
  && fileBinding(ledger.postSnapshot.identity.path).sha256 === ledger.postSnapshot.identity.sha256,
'source/post complete-save evidence failed');
const evidenceMismatches = ledger.evidenceBindings.filter((binding) => {
  const observed = fileBinding(binding.path);
  return observed.sha256 !== binding.sha256 || observed.bytes !== binding.bytes;
});
invariant(ledger.stages.length === 52
  && ledger.stages.every(({ status }) => status === 'PASS')
  && ledger.evidenceBindings.length === 57
  && evidenceMismatches.length === 0,
'execution stages or evidence bindings failed');

const forwardOrder = manifest.executionOrder.forward;
const rollbackOrder = manifest.executionOrder.rollback;
invariant(JSON.stringify(rollbackOrder) === JSON.stringify([...forwardOrder].reverse()),
'rollback package order is not exact reverse order');
const operations = [];
const packageEvidence = [];
for (const [index, pkg] of manifest.packages.entries()) {
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  const declared = manifest.operations[pkg.key];
  const execution = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.forward-execution.json`));
  const rollbackPreflight = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.rollback-poststate-preflight.json`));
  invariant(sha256(operationBody(pkg.forward)) === declared.forwardSha256
    && sha256(operationBody(pkg.rollback)) === declared.rollbackSha256
    && ledger.packages[index].forward.sha256 === fileBinding(pkg.forward).sha256
    && ledger.packages[index].rollback.sha256 === fileBinding(pkg.rollback).sha256
    && JSON.stringify(rollback) === JSON.stringify([...forward].reverse().map((entry) => ({
      cell: entry.cell, fromState: entry.toState, toState: entry.fromState,
    }))), `${pkg.key} operation/inverse binding failed`);
  invariant(execution.status === 'complete' && execution.strictNoop === true
    && execution.successfulCommands === forward.length
    && execution.failedCommands === 0 && execution.noopCommands === 0
    && rollbackPreflight.status === 'PASS' && rollbackPreflight.passed === rollback.length
    && rollbackPreflight.failed === 0,
  `${pkg.key} strict execution or rollback preflight failed`);
  operations.push(...forward.map((entry) => ({ ...entry, packageKey: pkg.key })));
  packageEvidence.push({ key: pkg.key, forwardCount: forward.length,
    executedCount: execution.successfulCommands, rollbackReadyCount: rollbackPreflight.passed });
}
invariant(operations.length === 8553
  && uniqueCells(operations.map(({ cell }) => cell)).length === 8553,
'operated target union is not exactly 8,553 unique cells');

// Independently reconstruct the complete desired target set, including 1,094
// already-target cells omitted from physical operations.
const desired = new Map();
const set = (cell, state) => desired.set(cellKey(cell), { cell, state });
const segments = [
  { minX: 1652, maxX: 1735, iMin: 1653, iMax: 1734, stairX: 1728 },
  { minX: 1748, maxX: 1843, iMin: 1749, iMax: 1842, stairX: 1752 },
];
for (const segment of segments) {
  for (const cell of cellsIn({ minX: segment.iMin, maxX: segment.iMax, minY: 49, maxY: 49, minZ: 145, maxZ: 149 })) set(cell, 'minecraft:polished_andesite');
  for (const cell of cellsIn({ minX: segment.iMin, maxX: segment.iMax, minY: 50, maxY: 52, minZ: 145, maxZ: 149 })) set(cell, 'minecraft:air');
  for (const cell of cellsIn({ minX: segment.iMin, maxX: segment.iMax, minY: 53, maxY: 53, minZ: 145, maxZ: 149 })) set(cell, 'minecraft:smooth_stone');
  for (const cell of cellsIn({ minX: segment.minX, maxX: segment.maxX, minY: 49, maxY: 53, minZ: 144, maxZ: 144 })) set(cell, 'minecraft:stone_bricks');
  for (const x of [segment.minX, segment.maxX]) for (const cell of cellsIn({ minX: x, maxX: x, minY: 49, maxY: 53, minZ: 144, maxZ: 149 })) set(cell, 'minecraft:stone_bricks');
}
const shells = design.d06.concourseAndRetail.retailShells.filter(({ wing }) => wing === 'south galleria');
const publicShells = shells.filter(({ id }) => id !== 'EE-R-S06');
const staffShellIds = new Set(['EE-R-S04', 'EE-R-S09']);
for (const shell of shells) {
  const minX = shell.bounds.minX;
  if (shell.id !== 'EE-R-S06') {
    for (let x = minX + 4; x <= minX + 7; x += 1) for (const y of [50, 51]) set({ x, y, z: 151 }, 'minecraft:air');
    set({ x: minX + 5, y: 50, z: 150 }, 'minecraft:warped_door[facing=south,half=lower,hinge=left,open=false,powered=false]');
    set({ x: minX + 5, y: 51, z: 150 }, 'minecraft:warped_door[facing=south,half=upper,hinge=left,open=false,powered=false]');
    set({ x: minX + 5, y: 52, z: 150 }, 'minecraft:red_terracotta');
    for (const x of [minX + 3, minX + 8]) set({ x, y: 52, z: 153 }, 'minecraft:sea_lantern');
    set({ x: minX + 5, y: 53, z: 147 }, 'minecraft:sea_lantern');
  }
  for (let x = minX + 1; x <= shell.bounds.maxX - 1; x += 1) for (const y of [50, 51]) set({ x, y, z: 154 }, 'minecraft:light_gray_concrete');
  if (staffShellIds.has(shell.id)) {
    set({ x: minX + 5, y: 50, z: 154 }, 'minecraft:iron_door[facing=south,half=lower,hinge=left,open=false,powered=false]');
    set({ x: minX + 5, y: 51, z: 154 }, 'minecraft:iron_door[facing=south,half=upper,hinge=left,open=false,powered=false]');
    for (const x of [minX + 4, minX + 6]) for (const y of [50, 51]) set({ x, y, z: 154 }, 'minecraft:red_terracotta');
  }
  for (let x = minX + 1; x <= shell.bounds.maxX - 1; x += 1) for (const y of [50, 51]) set({ x, y, z: 157 }, 'minecraft:light_gray_concrete');
  set({ x: minX + 5, y: 50, z: 157 }, 'minecraft:iron_door[facing=south,half=lower,hinge=left,open=false,powered=false]');
  set({ x: minX + 5, y: 51, z: 157 }, 'minecraft:iron_door[facing=south,half=upper,hinge=left,open=false,powered=false]');
  for (const z of [155, 156]) for (let x = minX + 1; x <= shell.bounds.maxX - 1; x += 1) for (const y of [50, 51]) set({ x, y, z }, 'minecraft:air');
  for (const x of [minX + 2, minX + 3]) set({ x, y: 50, z: 156 }, 'minecraft:crimson_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]');
  set({ x: minX + 8, y: 52, z: 156 }, 'minecraft:shroomlight');
  set({ x: minX + 5, y: 52, z: 157 }, 'minecraft:red_terracotta');
}
for (const cell of cellsIn({ minX: 1656, maxX: 1843, minY: 49, maxY: 49, minZ: 154, maxZ: 159 })) set(cell, 'minecraft:polished_blackstone');
for (const cell of cellsIn({ minX: 1656, maxX: 1843, minY: 52, maxY: 52, minZ: 154, maxZ: 159 })) set(cell, 'minecraft:smooth_stone');
for (const cell of cellsIn({ minX: 1657, maxX: 1842, minY: 50, maxY: 51, minZ: 158, maxZ: 158 })) set(cell, 'minecraft:air');
for (const cell of cellsIn({ minX: 1656, maxX: 1843, minY: 50, maxY: 51, minZ: 159, maxZ: 159 })) set(cell, 'minecraft:light_gray_concrete');
for (const x of [1656, 1843]) for (const cell of cellsIn({ minX: x, maxX: x, minY: 50, maxY: 51, minZ: 154, maxZ: 159 })) set(cell, 'minecraft:light_gray_concrete');
for (const { stairX } of segments) for (let index = 0; index < 8; index += 1) {
  const stair = { x: stairX, y: 41 + index, z: 153 - index };
  set(stair, 'minecraft:polished_andesite_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]');
  for (const height of [1, 2]) set({ x: stair.x, y: stair.y + height, z: stair.z }, 'minecraft:air');
  for (const x of [stairX - 1, stairX + 1]) {
    if (x === stairX - 1 && index === 0) continue;
    for (let y = stair.y; y <= Math.min(48, stair.y + 2); y += 1) set({ x, y, z: stair.z }, 'minecraft:stone_bricks');
  }
}
const targets = [...desired.values()].map(({ cell }) => cell);
const targetKeys = new Set(targets.map(cellKey));
const halo = uniqueCells(targets.flatMap((cell) => FACE.map(([dx, dy, dz]) => ({
  x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
})))).filter((cell) => !targetKeys.has(cellKey(cell)));
invariant(targets.length === 9647
  && hashCells(targets) === manifest.scope.geometry.targets.coordinateSetSha256
  && halo.length === 8629
  && hashCells(halo) === manifest.scope.geometry.interactionHalo.coordinateSetSha256,
'independent target/halo geometry differs from manifest');
const operationKeys = new Set(operations.map(({ cell }) => cellKey(cell)));
const changedKeys = new Set(operations.map(({ cell }) => cellKey(cell)));
invariant(operations.every(({ cell }) => targetKeys.has(cellKey(cell))), 'operation outside target geometry');

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
const finalTargetMismatch = [...desired].filter(([key, { state }]) => postStates.get(key) !== state);
const declaredTransitionMismatch = operations.filter(({ cell, fromState, toState }) => (
  sourceStates.get(cellKey(cell)) !== fromState || postStates.get(cellKey(cell)) !== toState
));
const derivedChanged = [...desired].filter(([key, { state }]) => sourceStates.get(key) !== state).map(([key]) => key);
const haloDrift = halo.filter((cell) => sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
invariant(finalTargetMismatch.length === 0 && declaredTransitionMismatch.length === 0
  && derivedChanged.length === 8553 && derivedChanged.every((key) => changedKeys.has(key))
  && haloDrift.length === 0,
'target final state, exact source transition, or interaction-halo drift failed');

// Route, frontage, and BOH operational acceptance.
const openingCells = publicShells.flatMap((shell) => cellsIn({
  minX: shell.bounds.minX + 4, maxX: shell.bounds.minX + 7,
  minY: 50, maxY: 51, minZ: 151, maxZ: 151,
}));
const publicDoorCells = publicShells.flatMap((shell) => cellsIn({
  minX: shell.bounds.minX + 5, maxX: shell.bounds.minX + 5,
  minY: 50, maxY: 51, minZ: 150, maxZ: 150,
}));
const normalLights = publicShells.flatMap((shell) => [
  { x: shell.bounds.minX + 3, y: 52, z: 153 },
  { x: shell.bounds.minX + 8, y: 52, z: 153 },
  { x: shell.bounds.minX + 5, y: 53, z: 147 },
]);
const staffDoors = [...staffShellIds].flatMap((id) => {
  const shell = shells.find((entry) => entry.id === id);
  return cellsIn({ minX: shell.bounds.minX + 5, maxX: shell.bounds.minX + 5,
    minY: 50, maxY: 51, minZ: 154, maxZ: 154 });
});
const securedDoors = shells.flatMap((shell) => cellsIn({
  minX: shell.bounds.minX + 5, maxX: shell.bounds.minX + 5,
  minY: 50, maxY: 51, minZ: 157, maxZ: 157,
}));
const serviceSpine = cellsIn({ minX: 1657, maxX: 1842, minY: 50, maxY: 51, minZ: 158, maxZ: 158 });
invariant(openingCells.length === 88 && openingCells.every((cell) => postStates.get(cellKey(cell)) === 'minecraft:air')
  && publicDoorCells.length === 22 && publicDoorCells.every((cell) => postStates.get(cellKey(cell)).startsWith('minecraft:warped_door['))
  && normalLights.length === 33 && normalLights.every((cell) => postStates.get(cellKey(cell)) === 'minecraft:sea_lantern')
  && staffDoors.length === 4 && staffDoors.every((cell) => postStates.get(cellKey(cell)).startsWith('minecraft:iron_door['))
  && securedDoors.length === 24 && securedDoors.every((cell) => postStates.get(cellKey(cell)).startsWith('minecraft:iron_door['))
  && serviceSpine.length === 372 && serviceSpine.every((cell) => postStates.get(cellKey(cell)) === 'minecraft:air'),
'public openings/doors/lights or restricted BOH continuity failed');
const stairProof = segments.map(({ stairX }) => ({
  stairX,
  steps: Array.from({ length: 8 }, (_, index) => ({ x: stairX, y: 41 + index, z: 153 - index })),
}));
invariant(stairProof.every(({ steps }) => steps.every((cell) => (
  postStates.get(cellKey(cell)) === 'minecraft:polished_andesite_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]'
))), 'PF08 public stair continuity failed');

// Retained interface evidence: compare immutable source/post, never assume a
// different commissioned status for these held cells.
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
invariant(retainedDrift.length === 0 && retained.every((cell) => !operationKeys.has(cellKey(cell))),
'future rail/drainage/fire-service/north-shell retained interface drifted');

const liveEntities = readJson(path.join(EVIDENCE_DIR, 'live-entity-clearance.json'));
const blockEntities = readJson(path.join(EVIDENCE_DIR, 'block-entity-clearance.json'));
invariant(liveEntities.status === 'PASS' && liveEntities.totals.blockingEntityHits === 0
  && blockEntities.status === 'PASS' && blockEntities.blockingBlockEntityCount === 0,
'same-release entity/block-entity safety evidence failed');

const payload = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_PUBLIC_VACANT_RETAIL_AND_RESTRICTED_BOH_COMMISSIONED',
  releaseNodeId: RELEASE_NODE_ID,
  transactionId: BASENAME,
  ledger: fileBinding(LEDGER_PATH),
  manifest: fileBinding(MANIFEST_PATH),
  completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  postSnapshot: {
    root: relative(POST_ROOT),
    completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
    regionSha256: postIdentity.sha256,
    identity: fileBinding(ledger.postSnapshot.identity.path),
    completeSaveIntake: fileBinding(ledger.postSnapshot.completeSaveIntake.path),
  },
  exactTargetStates: { ...exactSet(targets), passed: targets.length, failed: finalTargetMismatch.length,
    operatedTransitions: operations.length, sourceAlreadyTarget: targets.length - operations.length },
  publicRetail: {
    status: 'BOUNDED_PUBLIC_EXPLORATION_OPEN',
    exactSouthBayIds: publicShells.map(({ id }) => id),
    vacantBayCount: 11,
    occupiedOrEntityCount: 0,
    openingCount: 11,
    openingDimensionsBlocks: { width: 4, height: 2 },
    openingCellCount: openingCells.length,
    manualSmokeDoorCount: 11,
    normalFixtureCount: normalLights.length,
    roofBayLightCount: 22,
    galleryCeilingLightCount: 11,
    entryCoordinates: manifest.scope.publicAccess.entryFromAcceptedPf08Interior,
    explorationCoordinates: manifest.scope.publicAccess.galleryExploration,
    stairComponents: stairProof.map(({ stairX, steps }) => ({ stairX, stepCount: steps.length,
      bottom: steps[0], top: steps.at(-1), exactHalfStepContinuity: true })),
    retainedCappedSouthShellIds: ['EE-R-S06'],
  },
  backOfHouse: {
    status: 'MAINTAINED_RESTRICTED_NON_PUBLIC',
    roomCount: 12,
    continuousServiceSpineAirCellCount: serviceSpine.length,
    publicToStaffDoorCount: 2,
    publicToStaffDoorCellCount: staffDoors.length,
    securedRoomDoorCount: 12,
    securedRoomDoorCellCount: securedDoors.length,
    warmLightCount: 12,
    boothSeatCount: 24,
    occupantsOrEntitiesIntroduced: 0,
  },
  preservation: {
    retainedUnionCellCount: retained.length,
    retainedUnionDriftCount: retainedDrift.length,
    northRetailShellsCapped: true,
    n06ExceptionUntouched: true,
    futureRailStubCellCount: future.length,
    futureRailStubsOpened: false,
    drainageCellCount: drainage.length,
    drainageOpened: false,
    fireServiceSpineCellCount: fireSpine.length,
    ventUtilityMechanismInterfacesOpened: false,
    interactionHalo: { ...exactSet(halo), driftCount: haloDrift.length },
    targetBlockEntityCount: blockEntities.blockingBlockEntityCount,
    liveBlockingEntityCount: liveEntities.totals.blockingEntityHits,
  },
  execution: {
    stageCount: ledger.stages.length,
    evidenceBindingCount: ledger.evidenceBindings.length,
    packages: packageEvidence,
    exactRollbackReadyCount: packageEvidence.reduce((sum, entry) => sum + entry.rollbackReadyCount, 0),
    rollbackOrder,
  },
  nonclaims: {
    surfaceHeadhouseEgressCommissioned: false,
    futureRailLinesOpened: false,
    utilityDrainageOrHazardServiceOpened: false,
    tenantOccupancyOrCommerceInstalled: false,
    theatreOrPrivateClubAnnexIncluded: false,
  },
};
const payloadSha256 = sha256(JSON.stringify(payload));
const report = { ...payload, payloadSha256 };
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MD_PATH), `# R08AL Empty Eight south public retail / BOH post-release QA\n\n`
  + `Status: **${report.status}**\n\n`
  + `- Exact final targets: ${targets.length.toLocaleString()} (${operations.length.toLocaleString()} operated; ${targets.length - operations.length} already target).\n`
  + `- Public: 11 lit, vacant south bays through two PF08-fed gallery/stair segments; EE-R-S06 remains capped.\n`
  + `- Restricted BOH: 12 rooms, two staff entries, 12 secured room doors, continuous ${serviceSpine.length}-cell service-spine clearance.\n`
  + `- Preservation: ${halo.length.toLocaleString()} interaction-halo cells and ${retained.length.toLocaleString()} held-interface cells show zero source/post drift.\n`
  + `- Rollback: ${operations.length.toLocaleString()}/${operations.length.toLocaleString()} exact inverse guards pass.\n`
  + `- Nonclaims: no surface egress, tenant occupancy, future rail, utility/drainage/hazard-service, or theatre/private-club annex commissioning.\n`
  + `- Payload SHA-256: \`${payloadSha256}\`\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, report: relative(OUT_PATH), markdown: relative(MD_PATH),
  payloadSha256, exactTargetCount: targets.length, operatedTransitionCount: operations.length,
  haloDriftCount: haloDrift.length, retainedDriftCount: retainedDrift.length }, null, 2)}\n`);
