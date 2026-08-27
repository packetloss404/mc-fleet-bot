#!/usr/bin/env node
/**
 * Compile the exact EE-SMOKE-S passive fail-closed compartment boundary.
 *
 * The frozen life-safety alternative retains the 1,336-cell boundary field
 * and statically caps four reserved 3x3 door bays. No powered smoke-door,
 * detection, ventilation, or commissioning claim is made. This compiler is
 * offline only: it reads an immutable save and writes guarded build artifacts.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  D06_CELL_PREAMBLE,
  boundsOf,
  cellKey,
  cellsIn,
  hashCells,
  rawCoordinateHash,
  replLine,
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
const values = (flag) => argv.flatMap((entry, index) => (
  entry === flag && argv[index + 1] ? [argv[index + 1]] : []
));

const GENERATED_AT = value('--generated-at', '2026-08-21T19:30:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-r08s-post-20260821T191247Z');
const INTAKE_AUDIT = value('--intake-audit',
  'data/world-review/combined-zones-r08s-live-20260821T191247Z/post-complete-save-intake.json');
const SOURCE_LEDGER = value('--source-release-ledger',
  'data/world-review/combined-zones-r08s-live-20260821T191247Z/evidence-ledger.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r08t-empty-eight-south-smoke-boundary');
const MANIFEST_STATUS = value('--manifest-status',
  'COMPILED_FROM_ACCEPTED_R08S_POST_AWAITING_FRESH_EXECUTION_KERNEL');
const RELEASE_ID = 'CZ-R08T-EMPTY-EIGHT-SOUTH-SMOKE-BOUNDARY';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const CANONICAL_OWNER = 'OWN-D06-SMOKE';
const MASTER_SCOPE_OWNER = 'Z02-U1-CONCOURSE-MALL';
const WALL_KEY = 'ee-smoke-s-compartment-wall';
const CAP_KEY = 'ee-smoke-s-static-opening-caps';
const MATERIALS = Object.freeze({
  wall: 'minecraft:stone_bricks',
  cap: 'minecraft:polished_deepslate',
});
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
  ...['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray',
    'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black']
    .map((colour) => `minecraft:${colour}_concrete_powder`),
]);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block',
  'minecraft:jigsaw',
]);
const INPUTS = Object.freeze({
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  lifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  layerB: 'docs/masterplans/05-combined-zones/phase1-g05-layer-b-closure.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  n06Finding: 'data/world-review/combined-zones-r08q-n06-gravity-blocker-20260821T184800Z.json',
  priorManifests: [
    'data/buildops/combined-zones-r01-b11-road.release-manifest.json',
    'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
    'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
    'data/buildops/combined-zones-r05-mountain.release-manifest.json',
    'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
    'data/buildops/combined-zones-r07-b03-portal-tube.release-manifest.json',
    'data/buildops/combined-zones-r07b-b03-viaduct-bents.release-manifest.json',
    'data/buildops/combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z.release-manifest.json',
    'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
    'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
    'data/buildops/combined-zones-r07f-b09-lower-guideway-segment-01.release-manifest.json',
    'data/buildops/combined-zones-r07g-empty-eight-egress-headhouses.release-manifest.json',
    'data/buildops/combined-zones-r07h-b09-lower-guideway-segment-02.release-manifest.json',
    'data/buildops/combined-zones-r07i-b09-maximal-curve-summit-return.release-manifest.json',
    'data/buildops/combined-zones-r07j-b07-supported-surface-headhouse.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-03-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-08-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-02-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-04-wet-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-04-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-07-wet-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-07-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-06-dynamic-fluid-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-06-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-05-flow-ordered-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-05-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-01-partitioned-fluid-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-01-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-north-galleria-capped-retail-shells.release-manifest.json',
    'data/buildops/combined-zones-r08-south-galleria-capped-retail-shells.release-manifest.json',
    'data/buildops/combined-zones-r08p-s09-gravity-stabilized-capped-retail-shell.release-manifest.json',
    'data/buildops/combined-zones-r08r-n09-gravity-ordered-capped-retail-shell.release-manifest.json',
    'data/buildops/combined-zones-r08s-n07-fluid-ordered-capped-retail-shell.release-manifest.json',
    'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
    'data/buildops/combined-zones-r09b-b07-lower-spiral-stair.release-manifest.json',
    'data/buildops/combined-zones-r09c-b07-stair-safety-completion.release-manifest.json',
    'data/buildops/combined-zones-r09d-b07-terminal-crown.release-manifest.json',
    'data/buildops/combined-zones-r10-cheyenne-secure-gallery.release-manifest.json',
    'data/buildops/combined-zones-r11a-c1-east-highway-pilot.release-manifest.json',
    'data/buildops/combined-zones-r11b-c1-west-highway-extension.release-manifest.json',
    'data/buildops/combined-zones-r11c-c1-east-highway-completion.release-manifest.json',
    ...values('--prior-manifest'),
  ],
});

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08T south-smoke compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(blockName(state));
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(blockName(state));
const isForbidden = (state) => FORBIDDEN.has(blockName(state)) || /_shulker_box$/.test(blockName(state));
const inside = (cell, bounds) => cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
const exactSet = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: boundsOf(exact), coordinateSetSha256: hashCells(exact) };
};
const operationBody = (filename) => `${fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/).filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
const census = (records, selector = (record) => record.state) => {
  const counts = new Map();
  for (const record of records) {
    const state = selector(record);
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].sort((left, right) => right[1] - left[1]
    || left[0].localeCompare(right[0])));
};

function components(cells) {
  const remaining = new Set(uniqueCells(cells).map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    let size = 0;
    while (stack.length) {
      const [x, y, z] = stack.pop().split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE) {
        const key = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(key)) stack.push(key);
      }
    }
    sizes.push(size);
  }
  sizes.sort((a, b) => b - a);
  return { componentCount: sizes.length, largestComponentCellCount: sizes[0] ?? 0,
    componentSizes: sizes };
}

function parseRepl(filename) {
  const operations = [];
  for (const [lineIndex, raw] of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).entries()) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename}:${lineIndex + 1} is not a guarded REPL`);
    const coords = fields.slice(1, 7).map(Number);
    invariant(coords.every(Number.isSafeInteger), `${filename}:${lineIndex + 1} has invalid coordinates`);
    operations.push({
      bounds: { minX: Math.min(coords[0], coords[3]), maxX: Math.max(coords[0], coords[3]),
        minY: Math.min(coords[1], coords[4]), maxY: Math.max(coords[1], coords[4]),
        minZ: Math.min(coords[2], coords[5]), maxZ: Math.max(coords[2], coords[5]) },
      fromState: fields[7], toState: fields[8],
    });
  }
  return operations;
}

const emptyEight = readJson(INPUTS.emptyEight);
const lifeSafety = readJson(INPUTS.lifeSafety);
const layerB = readJson(INPUTS.layerB);
const protectedRelics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.standingAuthorization);
const n06Finding = readJson(INPUTS.n06Finding);
const intake = readJson(INTAKE_AUDIT);
const sourceLedger = readJson(SOURCE_LEDGER);
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not an immutable complete-save PASS');
invariant(absolute(intake.input?.suppliedWorldRoot) === absolute(SNAPSHOT),
'source intake is not bound to the selected snapshot');
for (const member of ['region', 'entities', 'poi']) invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
  `source snapshot is missing ${member}`);
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))), 'source snapshot is missing level.dat');
invariant(sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.transactionId === 'combined-zones-r08s-n07-fluid-ordered-capped-retail-shell'
  && absolute(sourceLedger.postSnapshot.root) === absolute(SNAPSHOT)
  && sourceLedger.postSnapshot.completeSaveSha256 === intake.packageIdentity.completeSaveSha256,
'terminal R08S ledger/post identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R08');

const smokeSource = emptyEight.d06.lifeSafety.smokeBoundaries.find(({ id }) => id === 'EE-SMOKE-S');
const smokeAlternative = lifeSafety.d06EmptyEightLifeSafety.failClosedBarriersAndSmokeInterfaces
  .smokeBoundaries.find(({ id }) => id === 'EE-SMOKE-S');
invariant(smokeSource && smokeAlternative && smokeSource.smokeDoorMechanismAuthorized === false
  && smokeAlternative.smokeDoorMechanism === null
  && smokeAlternative.operationallyAuthorized === false,
'frozen passive EE-SMOKE-S doctrine drifted');
const openingCells = [1670, 1720, 1770, 1820].flatMap((minX) => cellsIn({
  minX, maxX: minX + 2, minY: 49, maxY: 51, minZ: 150, maxZ: 150,
}));
const openingKeys = new Set(openingCells.map(cellKey));
const fullPlane = cellsIn({ minX: 1652, maxX: 1847, minY: 48, maxY: 54, minZ: 150, maxZ: 150 });
const wallCells = fullPlane.filter((cell) => !openingKeys.has(cellKey(cell)));
invariant(wallCells.length === smokeSource.boundaryPlane.cellCount
  && rawCoordinateHash(wallCells) === smokeSource.boundaryPlane.cellSetSha256
  && openingCells.length === smokeSource.smokeDoorOpeningReservations.cellCount
  && rawCoordinateHash(openingCells) === smokeSource.smokeDoorOpeningReservations.cellSetSha256,
'frozen geology smoke-boundary geometry drifted');
invariant(hashCells(wallCells, D06_CELL_PREAMBLE) === smokeAlternative.retainedBoundaryPlane.coordinateSetSha256
  && hashCells(openingCells, D06_CELL_PREAMBLE) === smokeAlternative.staticOpeningCaps.coordinateSetSha256
  && hashCells(fullPlane, D06_CELL_PREAMBLE) === smokeAlternative.completeFailClosedBoundary.coordinateSetSha256,
'frozen fail-closed life-safety geometry drifted');
invariant(components(wallCells).componentCount === 1 && components(openingCells).componentCount === 4
  && components(openingCells).componentSizes.every((count) => count === 9)
  && components(fullPlane).componentCount === 1,
'smoke-boundary topology drifted');

const interfaceContract = layerB.contracts.find(({ contractId }) => (
  contractId === 'IF-D06-EE-SMOKE-S-COMPARTMENT'
));
invariant(layerB.status === 'PASS_LAYER_B_CLOSED_ADDITIVE_RECORD_REGISTRY_UNMODIFIED'
  && interfaceContract?.acceptance?.accepted === true
  && interfaceContract.fromOwnerId === CANONICAL_OWNER
  && interfaceContract.interfaceCellCount === fullPlane.length
  && interfaceContract.pairManifestClosure?.classification === 'TERMINAL_CAP'
  && interfaceContract.futureState?.doctrine === 'ACCEPTED_DESIGN_BASIS_SEALED_DEFAULT_DENY'
  && interfaceContract.beforeState?.coordinateSetSha256 === hashCells(fullPlane, D06_CELL_PREAMBLE),
'accepted terminal smoke-interface contract drifted');

const targetKeys = new Set(fullPlane.map(cellKey));
const faceHalo = uniqueCells(fullPlane.flatMap((cell) => FACE.map(([dx, dy, dz]) => ({
  x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
}))).filter((cell) => !targetKeys.has(cellKey(cell))));
const envelope = uniqueCells([...fullPlane, ...faceHalo]);
const envelopeBounds = boundsOf(envelope);
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const stateCache = new Map();
async function stateAt(cell) {
  const key = cellKey(cell);
  if (!stateCache.has(key)) stateCache.set(key,
    stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return stateCache.get(key);
}
const targetRecords = [];
for (const cell of fullPlane) targetRecords.push({ cell, state: await stateAt(cell) });
const targetHazards = targetRecords.filter(({ state }) => isFluid(state) || isGravity(state) || isForbidden(state));
invariant(targetHazards.length === 0, 'target intersects fluid, gravity, container, or control state');
const wallOperations = wallCells.map((cell) => ({ cell, fromState: stateCache.get(cellKey(cell)), toState: MATERIALS.wall }))
  .sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
const capOperations = openingCells.map((cell) => ({ cell, fromState: stateCache.get(cellKey(cell)), toState: MATERIALS.cap }))
  .sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
invariant(wallOperations.length === 1336 && capOperations.length === 36
  && new Set([...wallOperations, ...capOperations].map(({ cell }) => cellKey(cell))).size === 1372,
'operation partition is not a target bijection');

const haloRecords = [];
for (const cell of faceHalo) haloRecords.push({ cell, state: await stateAt(cell) });
const haloFluid = haloRecords.filter(({ state }) => isFluid(state));
const haloForbidden = haloRecords.filter(({ state }) => isForbidden(state));
const haloGravity = haloRecords.filter(({ state }) => isGravity(state));
invariant(haloFluid.length === 0 && haloForbidden.length === 0,
'interaction halo contains fluid, container, or control state');
const gravityFindings = [];
for (const record of haloGravity) {
  const chain = [record.cell];
  let cursor = { ...record.cell, y: record.cell.y - 1 };
  let supportState = await stateAt(cursor);
  while (isGravity(supportState)) {
    chain.push(cursor);
    cursor = { ...cursor, y: cursor.y - 1 };
    invariant(chain.length <= 64, `gravity chain below ${cellKey(record.cell)} exceeds 64 cells`);
    supportState = await stateAt(cursor);
  }
  const stable = !isAir(supportState) && !isFluid(supportState)
    && !targetKeys.has(cellKey(cursor)) && chain.every((cell) => !targetKeys.has(cellKey(cell)));
  gravityFindings.push({ cell: record.cell, state: record.state, dependencyDepth: chain.length,
    terminalSupport: cursor, terminalSupportState: supportState,
    dependencyTouchesTarget: !stable, stableAndUnaffected: stable });
}
invariant(gravityFindings.every(({ stableAndUnaffected }) => stableAndUnaffected),
'retained halo gravity dependency is unstable or target-dependent');

const blockEntities = [];
const savedEntities = [];
const touchedChunks = [];
for (let cx = Math.floor(envelopeBounds.minX / 16); cx <= Math.floor(envelopeBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(envelopeBounds.minZ / 16); cz <= Math.floor(envelopeBounds.maxZ / 16); cz += 1) {
    touchedChunks.push({ x: cx, z: cz });
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (targetKeys.has(cellKey(point)) || faceHalo.some((cell) => cellKey(cell) === cellKey(point))) {
        blockEntities.push({ id: entity.id ?? null, point });
      }
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const position = entity.Pos.slice(0, 3).map(Number);
      if (position[0] >= envelopeBounds.minX && position[0] < envelopeBounds.maxX + 1
        && position[1] >= envelopeBounds.minY && position[1] < envelopeBounds.maxY + 1
        && position[2] >= envelopeBounds.minZ && position[2] < envelopeBounds.maxZ + 1) {
        savedEntities.push({ id: entity.id ?? null, position, chunk: { x: cx, z: cz } });
      }
    }
  }
}
invariant(blockEntities.length === 0 && savedEntities.length === 0,
'interaction envelope contains a block entity or saved movable entity');
const protectedIntersections = protectedRelics.relics.flatMap((relic) => {
  const hits = envelope.filter((cell) => inside(cell, relic.declaredInclusiveBounds));
  return hits.length ? [{ relic: relic.key, ...exactSet(hits) }] : [];
});
invariant(protectedIntersections.length === 0, 'interaction envelope intersects a protected relic');
const futureSealKeys = new Set(emptyEight.d06.futureInterfaces.interfaces.flatMap(
  ({ sealDesign }) => cellsIn(sealDesign.bounds),
).map(cellKey));
const futureSealIntersections = envelope.filter((cell) => futureSealKeys.has(cellKey(cell)));
invariant(futureSealIntersections.length === 0, 'interaction envelope intersects a deferred line seal');

const priorChecks = [];
const priorHits = [];
const r02Projected = new Map();
for (const manifestPath of INPUTS.priorManifests) {
  invariant(fs.existsSync(absolute(manifestPath)), `prior manifest missing: ${manifestPath}`);
  const manifest = readJson(manifestPath);
  const manifestUnion = new Map();
  for (const pkg of manifest.packages ?? []) {
    const declared = manifest.operations?.[pkg.key]
      ?? (manifest.packages.length === 1 && manifest.operations?.forwardSha256 ? manifest.operations : null);
    invariant(declared && sha256(operationBody(pkg.forward)) === declared.forwardSha256,
      `prior operation body drifted: ${manifest.transactionId}/${pkg.key}`);
    const packageHits = new Map();
    for (const operation of parseRepl(pkg.forward)) {
      if (operation.bounds.maxX < 1652 || operation.bounds.minX > 1847
        || operation.bounds.maxY < 48 || operation.bounds.minY > 54
        || operation.bounds.maxZ < 150 || operation.bounds.minZ > 150) continue;
      for (const cell of fullPlane) if (inside(cell, operation.bounds)) {
        packageHits.set(cellKey(cell), cell);
        manifestUnion.set(cellKey(cell), cell);
        if (manifest.transactionId === 'combined-zones-r02-d06-shell') {
          r02Projected.set(cellKey(cell), operation.toState);
        }
      }
    }
    if (packageHits.size) priorHits.push({ transactionId: manifest.transactionId,
      packageKey: pkg.key, operationPath: pkg.forward, ...exactSet([...packageHits.values()]) });
  }
  priorChecks.push({ path: manifestPath, transactionId: manifest.transactionId,
    manifestIdentity: manifest.manifestIdentity ?? null, targetIntersection: exactSet([...manifestUnion.values()]) });
}
const undeclaredPriorHits = priorHits.filter(({ transactionId }) => transactionId !== 'combined-zones-r02-d06-shell');
const r02ReservationHit = priorHits.find(({ transactionId, packageKey }) => transactionId === 'combined-zones-r02-d06-shell'
  && packageKey === 'd06-reservations');
const r02MechanismHit = priorHits.find(({ transactionId, packageKey }) => transactionId === 'combined-zones-r02-d06-shell'
  && packageKey === 'd06-mechanisms');
invariant(undeclaredPriorHits.length === 0 && r02ReservationHit?.cellCount === 1260
  && r02ReservationHit.coordinateSetSha256 === 'bd59e491951938f84f9c648d65175fabf2009e25d7eb139f3b9706af3a02c36b'
  && r02MechanismHit?.cellCount === 60
  && r02MechanismHit.coordinateSetSha256 === '1f62e9385a239bb3276f9993ea47a0a23e0c7e16b1956b7ed04fc4758892f970'
  && r02Projected.size === 1320,
'prior-release overlap is not the exact declared R02 reservation transition');
const r02StateMismatches = [...r02Projected].filter(([key, state]) => stateCache.get(key) !== state);
invariant(r02StateMismatches.length === 0, 'accepted R02 reservation source states drifted');
const unownedSource = fullPlane.filter((cell) => !r02Projected.has(cellKey(cell)));
invariant(unownedSource.length === 52 && unownedSource.every((cell) => isAir(stateCache.get(cellKey(cell)))),
'52-cell non-R02 source remainder is not unchanged air');

const deliveredShellIds = emptyEight.d06.concourseAndRetail.retailShells
  .map(({ id }) => id).filter((id) => id !== 'EE-R-N06');
const deliveredShellCells = uniqueCells(emptyEight.d06.concourseAndRetail.retailShells
  .filter(({ id }) => deliveredShellIds.includes(id)).flatMap(({ bounds }) => cellsIn(bounds)));
const deliveredShellKeys = new Set(deliveredShellCells.map(cellKey));
const deliveredTargetOverlap = fullPlane.filter((cell) => deliveredShellKeys.has(cellKey(cell)));
const deliveredHaloInterface = faceHalo.filter((cell) => deliveredShellKeys.has(cellKey(cell)));
invariant(deliveredShellIds.length === 23 && deliveredShellCells.length === 9936
  && deliveredTargetOverlap.length === 0 && deliveredHaloInterface.length === 576,
'23-shell preservation/interface geometry drifted');
const deliveredStateViolations = [];
for (const shell of emptyEight.d06.concourseAndRetail.retailShells.filter(({ id }) => deliveredShellIds.includes(id))) {
  for (const cell of cellsIn(shell.bounds)) {
    const boundary = cell.x === shell.bounds.minX || cell.x === shell.bounds.maxX
      || cell.y === shell.bounds.minY || cell.y === shell.bounds.maxY
      || cell.z === shell.bounds.minZ || cell.z === shell.bounds.maxZ;
    const expected = boundary ? 'minecraft:light_gray_concrete' : 'minecraft:air';
    const observed = await stateAt(cell);
    if (observed !== expected) deliveredStateViolations.push({ shellId: shell.id, cell, expected, observed });
  }
}
invariant(deliveredStateViolations.length === 0, 'an accepted capped retail shell is not in its commissioned state');
const n06Cells = n06Finding.targetGravity.findings.map(({ cell }) => cell);
const n06EnvelopeIntersections = envelope.filter((cell) => new Set(n06Cells.map(cellKey)).has(cellKey(cell)));
invariant(n06Cells.length === 4 && n06EnvelopeIntersections.length === 0,
'local N06 fail-closed exception intersects this release envelope');

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const packageDesigns = [
  { key: WALL_KEY, operations: wallOperations, role: 'passive-smoke-compartment-wall-field' },
  { key: CAP_KEY, operations: capOperations, role: 'static-default-closed-future-door-caps' },
];
const packageArtifacts = [];
for (const pkg of packageDesigns) {
  const forwardBody = `${pkg.operations.map(({ cell, fromState, toState }) => replLine(cell, fromState, toState)).join('\n')}\n`;
  const rollbackBody = `${pkg.operations.slice().reverse().map(({ cell, fromState, toState }) => replLine(cell, toState, fromState)).join('\n')}\n`;
  const forwardSha256 = sha256(forwardBody);
  const rollbackSha256 = sha256(rollbackBody);
  const targetIdentity = exactSet(pkg.operations.map(({ cell }) => cell));
  // The manifest is a canonical release contract, so its paths must not vary
  // with the compiler's physical output directory. Tests compile into a temp
  // directory while retaining the exact production artifact identities.
  const forward = path.join('data/buildops', `${BASENAME}.${pkg.key}.forward.txt`);
  const rollback = path.join('data/buildops', `${BASENAME}.${pkg.key}.rollback.txt`);
  const outputForward = path.join(OUT_DIR, path.basename(forward));
  const outputRollback = path.join(OUT_DIR, path.basename(rollback));
  const header = (operationRole, operationSha256) => [
    `# GENERATED FILE - ${RELEASE_ID} (${pkg.key} ${operationRole})`,
    `# source root: ${SNAPSHOT}`,
    `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
    `# target coordinate-set SHA-256: ${targetIdentity.coordinateSetSha256}`,
    `# operation SHA-256: ${operationSha256}`,
    '',
  ].join('\n');
  fs.writeFileSync(absolute(outputForward), `${header('forward', forwardSha256)}${forwardBody}`);
  fs.writeFileSync(absolute(outputRollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);
  packageArtifacts.push({ key: pkg.key, role: pkg.role, forward, rollback, forwardSha256,
    rollbackSha256, commandCount: pkg.operations.length, targetIdentity,
    sourceStateCensus: census(pkg.operations, ({ fromState }) => fromState),
    desiredStateCensus: census(pkg.operations, ({ toState }) => toState) });
}

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: MANIFEST_STATUS,
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: [CANONICAL_OWNER, MASTER_SCOPE_OWNER],
  packages: packageArtifacts.map(({ key, forward, rollback }) => ({ key, forward, rollback })),
  executionOrder: {
    forward: [WALL_KEY, CAP_KEY],
    rollback: [CAP_KEY, WALL_KEY],
    withinPackage: 'bottom-up forward; exact reverse-line rollback',
    rationale: 'Build the connected passive wall field, then close only the four declared door bays with static caps. Rollback opens only those bays before restoring the R02 reservation plane.',
  },
  scope: {
    releaseId: RELEASE_ID, releaseNodeId: RELEASE_NODE_ID, canonicalOwner: CANONICAL_OWNER,
    masterScopeOwner: MASTER_SCOPE_OWNER, mvpScope: true,
    purpose: 'Deliver the accepted EE-SMOKE-S passive fail-closed compartment plane without powered mechanisms or operational commissioning.',
    smokeBoundaryId: 'EE-SMOKE-S', interfaceContractId: interfaceContract.contractId,
    passiveBoundaryOnly: true, smokeDoorMechanismAuthorized: false,
    smokeSystemCommissioned: false, ventilationCommissioned: false,
    materialDoctrine: {
      wall: { paletteId: 'EE-P01', block: MATERIALS.wall, role: 'primary smoke-rated wall field' },
      staticCaps: { paletteId: 'EE-P13', block: MATERIALS.cap, role: 'default-closed future-interface cap' },
    },
    geometry: {
      retainedBoundaryPlane: exactSet(wallCells), staticOpeningCaps: exactSet(openingCells),
      completeFailClosedBoundary: exactSet(fullPlane),
      d06CoordinateSetSha256: hashCells(fullPlane, D06_CELL_PREAMBLE),
      sourceRawCoordinateSetSha256: rawCoordinateHash(fullPlane),
      wallTopology: components(wallCells), staticCapTopology: components(openingCells),
      completeBoundaryTopology: components(fullPlane),
      openingReservations: [1670, 1720, 1770, 1820].map((minX) => ({
        minX, maxX: minX + 2, minY: 49, maxY: 51, z: 150,
      })),
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT, intakeStatus: intake.status,
    terminalReleaseLedger: { path: SOURCE_LEDGER, sha256: sha256(fs.readFileSync(absolute(SOURCE_LEDGER))),
      status: sourceLedger.status, transactionId: sourceLedger.transactionId,
      completedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256 },
    exactTargetStateCensus: census(targetRecords),
    exactFaceHaloStateCensus: census(haloRecords),
    touchedChunks,
  },
  target: {
    operatedUnion: exactSet(fullPlane), packageTargetsDisjoint: true,
    completeFinalDesiredStateCensus: { [MATERIALS.wall]: 1336, [MATERIALS.cap]: 36 },
    packageDesiredStateCensus: Object.fromEntries(packageArtifacts.map((pkg) => [pkg.key, pkg.desiredStateCensus])),
  },
  operations: Object.fromEntries(packageArtifacts.map((pkg) => [pkg.key, {
    forwardSha256: pkg.forwardSha256, rollbackSha256: pkg.rollbackSha256,
    forwardCommandCount: pkg.commandCount, rollbackCommandCount: pkg.commandCount,
    targetCoordinateSetSha256: pkg.targetIdentity.coordinateSetSha256, exactInverse: true,
  }])),
  lifeSafetyContract: {
    sourcePath: INPUTS.layerB, sourceSha256: sha256(fs.readFileSync(absolute(INPUTS.layerB))),
    contractId: interfaceContract.contractId, interfaceCellCount: interfaceContract.interfaceCellCount,
    classification: interfaceContract.pairManifestClosure.classification,
    futureStateDoctrine: interfaceContract.futureState.doctrine,
    accepted: true, acceptedBy: interfaceContract.acceptance.acceptedBy,
    acceptedAtUtc: interfaceContract.acceptance.acceptedAtUtc,
  },
  priorReleaseTransition: {
    declaredTransitionId: 'R02_D06_RESERVATION_TO_R08T_PASSIVE_FAIL_CLOSED_BOUNDARY',
    acceptedR02TargetUnion: exactSet([...r02Projected].map(([key]) => {
      const [x, y, z] = key.split(',').map(Number); return { x, y, z };
    })),
    reservationPackageIntersection: r02ReservationHit,
    mechanismPackageIntersection: r02MechanismHit,
    sourceStatesStillMatchR02PostState: true,
    unownedSourceRemainder: { ...exactSet(unownedSource), exactStateCensus: census(unownedSource.map((cell) => ({ cell, state: stateCache.get(cellKey(cell)) }))) },
    checkedPriorManifestCount: priorChecks.length,
    checkedPriorManifests: priorChecks,
    undeclaredPriorReleaseIntersectionCount: undeclaredPriorHits.length,
  },
  isolation: {
    targetFluidIntersectionCount: targetRecords.filter(({ state }) => isFluid(state)).length,
    targetGravityIntersectionCount: targetRecords.filter(({ state }) => isGravity(state)).length,
    targetContainerOrControlIntersectionCount: targetRecords.filter(({ state }) => isForbidden(state)).length,
    faceInteractionHalo: exactSet(faceHalo), interactionHaloFluidCount: haloFluid.length,
    interactionHaloContainerOrControlCount: haloForbidden.length,
    retainedGravityHalo: { count: gravityFindings.length,
      allStablySupportedAndUnaffected: gravityFindings.every(({ stableAndUnaffected }) => stableAndUnaffected),
      maximumDependencyDepth: Math.max(0, ...gravityFindings.map(({ dependencyDepth }) => dependencyDepth)),
      findings: gravityFindings },
    blockEntityInteractionEnvelopeIntersectionCount: blockEntities.length,
    savedEntityInteractionEnvelopeIntersectionCount: savedEntities.length,
    protectedRelicInteractionEnvelopeIntersectionCount: protectedIntersections.length,
    deferredFutureLineSealInteractionEnvelopeIntersectionCount: futureSealIntersections.length,
    commissionedRetailShellPreservation: { shellCount: deliveredShellIds.length, shellIds: deliveredShellIds,
      fullCells: exactSet(deliveredShellCells), targetIntersectionCount: deliveredTargetOverlap.length,
      faceHaloInterface: exactSet(deliveredHaloInterface), exactStateViolationCount: deliveredStateViolations.length,
      allUntouched: true },
    isolatedN06Exception: { sourcePath: INPUTS.n06Finding,
      sourceSha256: sha256(fs.readFileSync(absolute(INPUTS.n06Finding))), exactBlockedCellCount: n06Cells.length,
      interactionEnvelopeIntersectionCount: n06EnvelopeIntersections.length,
      remainsFailClosedAndUnchanged: true },
  },
  upstreamIdentities: Object.fromEntries([
    ['emptyEight', INPUTS.emptyEight], ['lifeSafety', INPUTS.lifeSafety], ['layerB', INPUTS.layerB],
    ['protectedRelics', INPUTS.protectedRelics], ['standingAuthorization', INPUTS.standingAuthorization],
  ].map(([key, filename]) => [key, { path: filename, sha256: sha256(fs.readFileSync(absolute(filename))) }])),
  hardSafetyKernelNext: [
    'independent manifest and exact-inverse QA',
    'fresh same-invocation complete-save capture and deterministic recompile',
    'ordered exact source preflight for both packages',
    'strict-noop forward and rollback parser checks',
    'fresh live entity clearance bound to all operation hashes',
    'journaled strict-noop execution in declared order',
    'fresh post snapshot, exact post-state QA, and reverse-order rollback preflight',
  ],
  deferred: { poweredSmokeDoors: true, detectionAndControl: true, ventilation: true,
    smokeModelValidation: true, operationalCommissioning: true, futureDoorOpenings: true },
  safetyBoundary: { liveCallsPerformed: false, liveEntityClearancePerformed: false,
    worldEditsPerformed: false, executionAuthorizedByThisManifest: false },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({ ...manifestWithoutIdentity, manifestIdentity }, null, 2)}\n`);

console.log(JSON.stringify({ status: MANIFEST_STATUS, manifest: manifestPath, manifestIdentity,
  releaseNodeId: RELEASE_NODE_ID, sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  targetCellCount: fullPlane.length, wallCellCount: wallCells.length, staticCapCellCount: openingCells.length,
  sourceStateCensus: census(targetRecords), faceHaloCellCount: faceHalo.length,
  retainedStableGravityHaloCount: gravityFindings.length,
  declaredR02TransitionCellCount: r02Projected.size,
  unownedAirRemainderCellCount: unownedSource.length,
  commissionedRetailShellsPreserved: deliveredShellIds.length,
  packages: packageArtifacts.map(({ key, commandCount, forwardSha256, rollbackSha256 }) => ({ key, commandCount, forwardSha256, rollbackSha256 })),
  blockEntityIntersectionCount: blockEntities.length, savedEntityIntersectionCount: savedEntities.length,
  protectedRelicIntersectionCount: protectedIntersections.length,
  futureSealIntersectionCount: futureSealIntersections.length,
  undeclaredPriorReleaseIntersectionCount: undeclaredPriorHits.length,
  liveCallsPerformed: false, worldEditsPerformed: false }, null, 2));
