#!/usr/bin/env node
/**
 * Compile a bounded, connected floor in the frozen Empty Eight fire/service spine.
 *
 * Both end planes are made statically fail-closed before the floor is installed.
 * The deferred wet/N06-adjacent portion of EE-SMOKE-N, EG-B access cap, active
 * mechanism material, tenant faces, and every external route remain untouched.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader, D06_CELL_PREAMBLE, boundsOf, cellKey, cellsIn, hashCells,
  replLine, sha256, stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-21T20:25:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-r08u-post-20260821T201019Z');
const INTAKE_AUDIT = value('--intake-audit',
  'data/world-review/combined-zones-r08u-live-20260821T201019Z/post-complete-save-intake.json');
const SOURCE_LEDGER = value('--source-release-ledger',
  'data/world-review/combined-zones-r08u-live-20260821T201019Z/evidence-ledger.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r08v-empty-eight-fire-service-spine-floor');
const RELEASE_ID = 'CZ-R08V-EMPTY-EIGHT-FIRE-SERVICE-SPINE-FLOOR';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const CANONICAL_OWNER = 'OWN-D06-FIRE';
const MASTER_SCOPE_OWNER = 'Z02-U1-CONCOURSE-MALL';
const CONTAINMENT_KEY = 'ee-fire-spine-static-end-containment';
const FLOOR_KEY = 'ee-fire-spine-connected-floor';
const CAP_STATE = 'minecraft:stone_bricks';
const FLOOR_STATE = 'minecraft:polished_blackstone';
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
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
]);
const CONTROL_PATTERN = /(?:redstone|repeater|comparator|piston|observer|lever|button|pressure_plate|tripwire|rail)/;
const INPUTS = Object.freeze({
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  lifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  layerB: 'docs/masterplans/05-combined-zones/phase1-g05-layer-b-closure.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  n06Finding: 'data/world-review/combined-zones-r08q-n06-gravity-blocker-20260821T184800Z.json',
  r08uManifest: 'data/buildops/combined-zones-r08u-empty-eight-internal-vent-caps.release-manifest.json',
  additions: [
    'data/buildops/combined-zones-r07k-b03-twin-portal-exterior.release-manifest.json',
    'data/buildops/combined-zones-r11d-c1-at-grade-island-521-546.release-manifest.json',
    'data/buildops/combined-zones-r08u-empty-eight-internal-vent-caps.release-manifest.json',
  ],
});

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08V fire/service-spine compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(blockName(state));
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(blockName(state));
const isForbidden = (state) => FORBIDDEN.has(blockName(state))
  || /_shulker_box$/.test(blockName(state)) || CONTROL_PATTERN.test(blockName(state));
const inside = (cell, bounds) => cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
const exactSet = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: boundsOf(exact), coordinateSetSha256: hashCells(exact) };
};
const census = (records, selector = (record) => record.state) => {
  const counts = new Map();
  for (const record of records) {
    const state = selector(record);
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
};
const operationBody = (filename) => `${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
function parseRepl(filename) {
  const operations = [];
  for (const [index, raw] of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).entries()) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9, `${filename}:${index + 1} malformed`);
    const coords = fields.slice(1, 7).map(Number);
    operations.push({ bounds: { minX: Math.min(coords[0], coords[3]), maxX: Math.max(coords[0], coords[3]),
      minY: Math.min(coords[1], coords[4]), maxY: Math.max(coords[1], coords[4]),
      minZ: Math.min(coords[2], coords[5]), maxZ: Math.max(coords[2], coords[5]) },
    fromState: fields[7], toState: fields[8] });
  }
  return operations;
}
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
  return { componentCount: sizes.length, largestComponentCellCount: sizes[0] ?? 0 };
}

const emptyEight = readJson(INPUTS.emptyEight);
const lifeSafety = readJson(INPUTS.lifeSafety);
const layerB = readJson(INPUTS.layerB);
const protectedRelics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.standingAuthorization);
const n06 = readJson(INPUTS.n06Finding);
const r08uManifest = readJson(INPUTS.r08uManifest);
const intake = readJson(INTAKE_AUDIT);
const sourceLedger = readJson(SOURCE_LEDGER);
const sourceIdentity = readJson(sourceLedger.postSnapshot.identity.path);
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not a complete immutable PASS');
invariant(absolute(intake.input?.suppliedWorldRoot) === absolute(SNAPSHOT),
'source intake does not bind the selected snapshot');
invariant(sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.transactionId === 'combined-zones-r08u-empty-eight-internal-vent-caps'
  && absolute(sourceLedger.postSnapshot.root) === absolute(SNAPSHOT)
  && sourceLedger.postSnapshot.completeSaveSha256 === intake.packageIdentity.completeSaveSha256,
'terminal R08U ledger/post identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R08');

const fire = lifeSafety.d06EmptyEightLifeSafety.fireServiceAccessAlternatives;
const fireAlternative = fire.alternatives.find(({ id }) => id === fire.recommendedAlternativeId);
const frozenSpine = emptyEight.d06.lifeSafety.fireAndServiceAccess.internalSpineReservation;
invariant(fire.recommendedAlternativeId === 'FIRE-EG-B' && fireAlternative.recommendedForSoleAuthorityReview
  && fire.internalSpineReservation.cellCount === 3025
  && hashCells(cellsIn(fire.internalSpineReservation.bounds), D06_CELL_PREAMBLE)
    === fire.internalSpineReservation.coordinateSetSha256
  && frozenSpine.cellCount === 3025
  && JSON.stringify(frozenSpine.bounds) === JSON.stringify(fire.internalSpineReservation.bounds),
'frozen fire/service spine or selected FIRE-EG-B alternative drifted');

const floor = cellsIn({ minX: 1844, maxX: 1848, minY: 48, maxY: 48, minZ: 51, maxZ: 149 });
const northEnd = cellsIn({ minX: 1844, maxX: 1848, minY: 48, maxY: 52, minZ: 50, maxZ: 50 });
const southEnd = cellsIn({ minX: 1844, maxX: 1848, minY: 48, maxY: 52, minZ: 150, maxZ: 150 });
const headroom = cellsIn({ minX: 1844, maxX: 1848, minY: 49, maxY: 51, minZ: 51, maxZ: 149 });
const markerLayer = cellsIn({ minX: 1844, maxX: 1848, minY: 52, maxY: 52, minZ: 51, maxZ: 149 });
const ceiling = cellsIn({ minX: 1844, maxX: 1848, minY: 53, maxY: 53, minZ: 51, maxZ: 149 });
const sideWalls = [1843, 1849].flatMap((x) => cellsIn({
  minX: x, maxX: x, minY: 49, maxY: 51, minZ: 51, maxZ: 149,
}));
invariant(floor.length === 495 && headroom.length === 1485 && markerLayer.length === 495
  && ceiling.length === 495 && sideWalls.length === 594
  && [...floor, ...northEnd, ...southEnd, ...headroom, ...markerLayer]
    .every((cell) => inside(cell, frozenSpine.bounds)),
'bounded spine geometry escaped its canonical reservation');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const stateCache = new Map();
async function stateAt(cell) {
  const key = cellKey(cell);
  if (!stateCache.has(key)) stateCache.set(key,
    stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return stateCache.get(key);
}
const records = async (cells) => {
  const output = [];
  for (const cell of cells) output.push({ cell, state: await stateAt(cell) });
  return output;
};
const floorRecords = await records(floor);
const northRecords = await records(northEnd);
const southRecords = await records(southEnd);
const headroomRecords = await records(headroom);
const markerRecords = await records(markerLayer);
const ceilingRecords = await records(ceiling);
const sideWallRecords = await records(sideWalls);
invariant(floorRecords.every(({ state }) => state === 'minecraft:air')
  && northRecords.every(({ state }) => state === 'minecraft:air')
  && southRecords.filter(({ state }) => state === 'minecraft:air').length === 5
  && southRecords.filter(({ state }) => state === CAP_STATE).length === 20,
'floor or end-containment source census drifted');
invariant(headroomRecords.every(({ state }) => state === 'minecraft:air')
  && markerRecords.filter(({ state }) => state === 'minecraft:air').length === 487
  && markerRecords.filter(({ state }) => state === 'minecraft:light_gray_concrete').length === 8
  && ceilingRecords.every(({ state }) => !isAir(state) && !isFluid(state) && !isGravity(state))
  && sideWallRecords.every(({ state }) => !isAir(state) && !isFluid(state)),
'headroom, retained marker, ceiling, or side-containment census drifted');

const containmentOperations = [
  ...northRecords.map(({ cell, state }) => ({ cell, fromState: state, toState: CAP_STATE })),
  ...southRecords.filter(({ state }) => state !== CAP_STATE)
    .map(({ cell, state }) => ({ cell, fromState: state, toState: CAP_STATE })),
].sort((a, b) => a.cell.z - b.cell.z || a.cell.y - b.cell.y || a.cell.x - b.cell.x);
const floorOperations = floorRecords.map(({ cell, state }) => ({ cell, fromState: state, toState: FLOOR_STATE }))
  .sort((a, b) => a.cell.z - b.cell.z || a.cell.x - b.cell.x);
const targetCells = [...containmentOperations, ...floorOperations].map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
invariant(containmentOperations.length === 30 && floorOperations.length === 495
  && targetKeys.size === 525 && components(floor).componentCount === 1,
'operation partition or connected floor geometry drifted');
const halo = uniqueCells(targetCells.flatMap((cell) => FACE.map(([dx, dy, dz]) => ({
  x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
}))).filter((cell) => !targetKeys.has(cellKey(cell))));
const targetRecords = await records(targetCells);
const haloRecords = await records(halo);
const targetFluid = targetRecords.filter(({ state }) => isFluid(state));
const targetGravity = targetRecords.filter(({ state }) => isGravity(state));
const targetForbidden = targetRecords.filter(({ state }) => isForbidden(state));
const haloFluid = haloRecords.filter(({ state }) => isFluid(state));
const haloGravity = haloRecords.filter(({ state }) => isGravity(state));
const haloForbidden = haloRecords.filter(({ state }) => isForbidden(state));
invariant(targetFluid.length === 0 && targetGravity.length === 0 && targetForbidden.length === 0
  && haloFluid.length === 0 && haloGravity.length === 25 && haloForbidden.length === 0,
'target/halo hazard census drifted');

async function gravityClosure(record) {
  const chain = [record.cell];
  let cursor = { ...record.cell, y: record.cell.y - 1 };
  let terminalState = await stateAt(cursor);
  while (isGravity(terminalState)) {
    chain.push(cursor);
    cursor = { ...cursor, y: cursor.y - 1 };
    invariant(chain.length <= 64, `gravity chain below ${cellKey(record.cell)} exceeds 64 cells`);
    terminalState = await stateAt(cursor);
  }
  return { cell: record.cell, state: record.state, chain, dependencyDepth: chain.length,
    terminalSupport: cursor, terminalSupportState: terminalState,
    targetDependencyCount: chain.filter((cell) => targetKeys.has(cellKey(cell))).length,
    durablySupported: !isAir(terminalState) && !isFluid(terminalState)
      && !targetKeys.has(cellKey(cursor)) };
}
const gravityClosures = [];
for (const record of haloGravity) gravityClosures.push(await gravityClosure(record));
invariant(gravityClosures.every(({ durablySupported, targetDependencyCount }) => (
  durablySupported && targetDependencyCount === 0
)), 'retained halo gravity closure is not durable or disjoint');

const n06Cells = n06.targetGravity.findings.map(({ cell }) => cell);
const n06Keys = new Set(n06Cells.map(cellKey));
const n06Intersections = [...targetCells, ...halo].filter((cell) => n06Keys.has(cellKey(cell)));
const northSmoke = cellsIn({ minX: 1652, maxX: 1847, minY: 48, maxY: 54, minZ: 50, maxZ: 50 });
const northSmokeKeys = new Set(northSmoke.map(cellKey));
const touchedNorthSmoke = targetCells.filter((cell) => northSmokeKeys.has(cellKey(cell)));
const wetNorthFindings = [];
for (const cell of northSmoke) {
  const state = await stateAt(cell);
  if (isFluid(state)) wetNorthFindings.push({ cell, state });
}
invariant(n06Cells.length === 4 && n06Intersections.length === 0
  && touchedNorthSmoke.length === 20 && wetNorthFindings.length === 6
  && touchedNorthSmoke.every((cell) => cell.x >= 1844 && cell.x <= 1847),
'local north containment is not disjoint from the wet/N06-adjacent smoke interface');

const fireCap = cellsIn(fireAlternative.normallyClosedSpineInterfaceCap.bounds);
const drainage = lifeSafety.d06EmptyEightLifeSafety.drainageAlternatives.alternatives
  .find(({ id }) => id === 'DRAIN-A-EIGHT-INDEPENDENT-LOCAL-CAPS');
const drainCaps = uniqueCells(drainage.localSumpInterfaceCaps.flatMap(({ cap }) => cellsIn(cap.bounds)));
const fireCapRecords = await records(fireCap);
const drainCapRecords = await records(drainCaps);
invariant(fireCapRecords.length === 35
  && fireCapRecords.every(({ state }) => state === 'minecraft:polished_deepslate')
  && drainCapRecords.length === 24
  && drainCapRecords.every(({ state }) => state === 'minecraft:polished_deepslate'),
'retained fire-service or drainage caps are not already exact');

const blockEntities = [];
const savedEntities = [];
const envelopeKeys = new Set([...targetCells, ...halo].map(cellKey));
const envelopeBounds = boundsOf([...targetCells, ...halo]);
const touchedChunks = uniqueCells(targetCells.map((cell) => ({
  x: Math.floor(cell.x / 16), y: 0, z: Math.floor(cell.z / 16),
}))).map(({ x, z }) => ({ x, z }));
for (const chunkPoint of touchedChunks) {
  const chunk = await reader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (envelopeKeys.has(cellKey(point))) blockEntities.push({ id: entity.id ?? null, point });
  }
  const entities = await entityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entities?.Entities ?? []) {
    if (!Array.isArray(entity.Pos)) continue;
    const [x, y, z] = entity.Pos.map(Number);
    if (x >= envelopeBounds.minX && x < envelopeBounds.maxX + 1
      && y >= envelopeBounds.minY && y < envelopeBounds.maxY + 1
      && z >= envelopeBounds.minZ && z < envelopeBounds.maxZ + 1) {
      savedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
    }
  }
}
invariant(blockEntities.length === 0 && savedEntities.length === 0,
'spine interaction envelope contains a block entity or saved movable entity');
const protectedIntersections = protectedRelics.relics.flatMap((relic) => {
  const hits = [...targetCells, ...halo].filter((cell) => inside(cell, relic.declaredInclusiveBounds));
  return hits.length ? [{ relic: relic.key, ...exactSet(hits) }] : [];
});
invariant(protectedIntersections.length === 0, 'spine envelope intersects a protected relic');
const futureSealKeys = new Set(emptyEight.d06.futureInterfaces.interfaces.flatMap(
  ({ sealDesign }) => cellsIn(sealDesign.bounds),
).map(cellKey));
const futureSealIntersections = [...targetCells, ...halo]
  .filter((cell) => futureSealKeys.has(cellKey(cell)));
invariant(futureSealIntersections.length === 0, 'spine envelope intersects a future-line seal');

const priorPaths = [...r08uManifest.isolation.acceptedPriorManifestChecks.map(({ path: filename }) => filename),
  ...INPUTS.additions];
const distinctPriorPaths = [...new Set(priorPaths)];
const priorChecks = [];
const priorTargetHits = [];
for (const manifestPath of distinctPriorPaths) {
  const prior = readJson(manifestPath);
  const hitMap = new Map();
  for (const pkg of prior.packages ?? []) {
    const declared = prior.operations?.[pkg.key]
      ?? ((prior.packages?.length ?? 0) === 1 && prior.operations?.forwardSha256 ? prior.operations : null);
    invariant(declared && sha256(operationBody(pkg.forward)) === declared.forwardSha256,
      `prior operation body drifted: ${prior.transactionId}/${pkg.key}`);
    for (const operation of parseRepl(pkg.forward)) {
      const minX = Math.max(operation.bounds.minX, 1844);
      const maxX = Math.min(operation.bounds.maxX, 1848);
      const minY = Math.max(operation.bounds.minY, 48);
      const maxY = Math.min(operation.bounds.maxY, 52);
      const minZ = Math.max(operation.bounds.minZ, 50);
      const maxZ = Math.min(operation.bounds.maxZ, 150);
      if (minX > maxX || minY > maxY || minZ > maxZ) continue;
      for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) {
        for (let z = minZ; z <= maxZ; z += 1) {
          const cell = { x, y, z };
          if (targetKeys.has(cellKey(cell))) hitMap.set(cellKey(cell), { cell, toState: operation.toState });
        }
      }
    }
  }
  if (hitMap.size) priorTargetHits.push({ transactionId: prior.transactionId,
    ...exactSet([...hitMap.values()].map(({ cell }) => cell)),
    desiredPriorStates: census([...hitMap.values()], ({ toState }) => toState) });
  priorChecks.push({ path: manifestPath, transactionId: prior.transactionId,
    manifestIdentity: prior.manifestIdentity ?? null, targetIntersectionCount: hitMap.size });
}
invariant(priorTargetHits.length === 1
  && priorTargetHits[0].transactionId === 'combined-zones-r02-d06-shell'
  && priorTargetHits[0].cellCount === 472
  && JSON.stringify(priorTargetHits[0].desiredPriorStates) === JSON.stringify({ 'minecraft:air': 472 }),
`target overlap is not the exact R02 air-reservation supersession: ${JSON.stringify(priorTargetHits)}`);

const r02 = readJson('data/buildops/combined-zones-r02-d06-shell.release-manifest.json');
const activeR02Keys = new Set();
const r02Mechanism = r02.packages.find(({ key }) => key === 'd06-mechanisms');
for (const operation of parseRepl(r02Mechanism.forward)) {
  if (isAir(operation.toState)) continue;
  const minX = Math.max(operation.bounds.minX, envelopeBounds.minX);
  const maxX = Math.min(operation.bounds.maxX, envelopeBounds.maxX);
  const minY = Math.max(operation.bounds.minY, envelopeBounds.minY);
  const maxY = Math.min(operation.bounds.maxY, envelopeBounds.maxY);
  const minZ = Math.max(operation.bounds.minZ, envelopeBounds.minZ);
  const maxZ = Math.min(operation.bounds.maxZ, envelopeBounds.maxZ);
  if (minX > maxX || minY > maxY || minZ > maxZ) continue;
  for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) {
    for (let z = minZ; z <= maxZ; z += 1) activeR02Keys.add(cellKey({ x, y, z }));
  }
}
const activeTargetIntersections = targetCells.filter((cell) => activeR02Keys.has(cellKey(cell)));
invariant(activeTargetIntersections.length === 0,
'spine targets intersect active R02 mechanism material');

const packageDesigns = [
  { key: CONTAINMENT_KEY, role: 'close-dry-north-and-south-spine-ends', operations: containmentOperations },
  { key: FLOOR_KEY, role: 'install-connected-five-wide-static-service-datum', operations: floorOperations },
];
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const packageArtifacts = [];
for (const pkg of packageDesigns) {
  const forwardBody = `${pkg.operations.map(({ cell, fromState, toState }) => replLine(cell, fromState, toState)).join('\n')}\n`;
  const rollbackBody = `${pkg.operations.slice().reverse()
    .map(({ cell, fromState, toState }) => replLine(cell, toState, fromState)).join('\n')}\n`;
  const forwardSha256 = sha256(forwardBody);
  const rollbackSha256 = sha256(rollbackBody);
  const targetIdentity = exactSet(pkg.operations.map(({ cell }) => cell));
  const forward = path.join('data/buildops', `${BASENAME}.${pkg.key}.forward.txt`);
  const rollback = path.join('data/buildops', `${BASENAME}.${pkg.key}.rollback.txt`);
  const header = (role, operationSha256) => [
    `# GENERATED FILE - ${RELEASE_ID} (${pkg.key} ${role})`,
    `# source root: ${SNAPSHOT}`,
    `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
    `# target coordinate-set SHA-256: ${targetIdentity.coordinateSetSha256}`,
    `# operation SHA-256: ${operationSha256}`,
    '',
  ].join('\n');
  fs.writeFileSync(absolute(path.join(OUT_DIR, path.basename(forward))),
    `${header('forward', forwardSha256)}${forwardBody}`);
  fs.writeFileSync(absolute(path.join(OUT_DIR, path.basename(rollback))),
    `${header('rollback', rollbackSha256)}${rollbackBody}`);
  packageArtifacts.push({ key: pkg.key, role: pkg.role, forward, rollback,
    forwardSha256, rollbackSha256, commandCount: pkg.operations.length, targetIdentity,
    sourceStateCensus: census(pkg.operations, ({ fromState }) => fromState),
    desiredStateCensus: census(pkg.operations, ({ toState }) => toState) });
}

const manifestWithoutIdentity = {
  schemaVersion: 1, transactionId: BASENAME, generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R08U_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID, mvpScope: true,
  scopeIds: [CANONICAL_OWNER, MASTER_SCOPE_OWNER],
  packages: packageArtifacts.map(({ key, forward, rollback }) => ({ key, forward, rollback })),
  executionOrder: { forward: [CONTAINMENT_KEY, FLOOR_KEY], rollback: [FLOOR_KEY, CONTAINMENT_KEY],
    rationale: 'Close both bounded spine ends first, then install the static floor. Rollback removes the floor before restoring the original exact open end states.' },
  scope: {
    releaseId: RELEASE_ID, releaseNodeId: RELEASE_NODE_ID, canonicalOwner: CANONICAL_OWNER,
    masterScopeOwner: MASTER_SCOPE_OWNER, mvpScope: true,
    purpose: 'Create a connected static service-datum floor inside the frozen Empty Eight fire/service spine while retaining every access and external interface fail-closed.',
    selectedAlternativeId: fireAlternative.id,
    materialDoctrine: { floor: { paletteId: 'EE-P07', block: FLOOR_STATE,
      role: 'platform-edge and service datum' }, containment: { paletteId: 'EE-P01', block: CAP_STATE,
      role: 'primary lined shell and smoke-rated wall field' } },
    geometry: { frozenFireServiceSpine: exactSet(cellsIn(frozenSpine.bounds)),
      connectedFloor: { ...exactSet(floor), ...components(floor), widthCells: 5, lengthCells: 99 },
      minimumThreeBlockHeadroom: exactSet(headroom), retainedMarkerLayer: exactSet(markerLayer),
      solidCeiling: exactSet(ceiling), retainedSolidSideContainment: exactSet(sideWalls),
      northStaticEnd: exactSet(northEnd), southStaticEnd: exactSet(southEnd),
      operatedEndContainment: exactSet(containmentOperations.map(({ cell }) => cell)),
      operatedUnion: exactSet(targetCells), interactionHalo: exactSet(halo) },
    operationalBoundary: { boundedConnectedSpaceBuilt: true, publicRouteCommissioned: false,
      fireServiceRouteCommissioned: false, egBSpineInterfaceOpened: false,
      northSmokeSystemCommissioned: false, wetNorthSmokeCellsTouched: false,
      n06Touched: false, activeMechanismsTouched: false, tenantOpeningsTouched: false,
      drainageHeaderOrExternalDischargeOpened: false },
  },
  scopeSelection: {
    alreadyExactStaticCandidates: { fireServiceInterfaceCapCellCount: fireCap.length,
      localDrainageCapCellCount: drainCaps.length, alreadyDesiredCellCount: fireCap.length + drainCaps.length,
      operationsWritten: false },
    rejectedConnectedCandidates: {
      fullNorthSmokeBoundary: { disposition: 'LOCAL_BLOCKED_WET_AND_N06_ADJACENT',
        exactFluidCount: wetNorthFindings.length, n06BlockedCellCount: n06Cells.length },
      protectedEgressStairAndLiftReservations: { disposition: 'RESERVATION_ONLY_MECHANISMS_AND_OPENINGS_UNCOMMISSIONED' },
    },
    selected: { frozenSpineReservationCellCount: 3025, exactSourceAirCellCount: 2997,
      floorCellCount: floor.length, containmentOperationCount: containmentOperations.length,
      selectionRule: 'largest useful connected dry static architecture delta with exact source states and independently fail-closed interfaces' },
  },
  source: { snapshotRoot: SNAPSHOT, completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    regionSnapshotSha256: sourceIdentity.sha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT, intakeStatus: intake.status,
    terminalReleaseLedger: { path: SOURCE_LEDGER,
      sha256: sha256(fs.readFileSync(absolute(SOURCE_LEDGER))), status: sourceLedger.status,
      transactionId: sourceLedger.transactionId,
      completedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256 },
    exactTargetStateCensus: census(targetRecords), exactHaloStateCensus: census(haloRecords), touchedChunks },
  target: { operatedUnion: exactSet(targetCells), packageTargetsDisjoint: true,
    completeFinalDesiredStateCensus: { [FLOOR_STATE]: floor.length, [CAP_STATE]: containmentOperations.length },
    retainedAlreadyExactSouthContainmentCount: 20, completeNorthContainmentCount: 25,
    completeSouthContainmentCount: 25, minimumHeadroomAirCount: headroom.length,
    packageDesiredStateCensus: Object.fromEntries(packageArtifacts.map((pkg) => [pkg.key, pkg.desiredStateCensus])) },
  operations: Object.fromEntries(packageArtifacts.map((pkg) => [pkg.key, {
    forwardSha256: pkg.forwardSha256, rollbackSha256: pkg.rollbackSha256,
    forwardCommandCount: pkg.commandCount, rollbackCommandCount: pkg.commandCount,
    targetCoordinateSetSha256: pkg.targetIdentity.coordinateSetSha256, exactInverse: true,
  }])),
  isolation: { targetFluidIntersectionCount: targetFluid.length,
    targetGravityIntersectionCount: targetGravity.length,
    targetContainerOrControlIntersectionCount: targetForbidden.length,
    interactionHalo: exactSet(halo), interactionHaloFluidCount: haloFluid.length,
    interactionHaloGravityCount: haloGravity.length,
    interactionHaloContainerOrControlCount: haloForbidden.length,
    retainedGravityHalo: { count: gravityClosures.length,
      allDurablySupportedAndUnaffected: gravityClosures.every(({ durablySupported }) => durablySupported),
      findings: gravityClosures },
    blockEntityInteractionEnvelopeIntersectionCount: blockEntities.length,
    savedEntityInteractionEnvelopeIntersectionCount: savedEntities.length,
    protectedRelicInteractionEnvelopeIntersectionCount: protectedIntersections.length,
    deferredFutureLineSealInteractionEnvelopeIntersectionCount: futureSealIntersections.length,
    r02AirReservationSupersession: priorTargetHits[0],
    activeR02MechanismMaterialTargetIntersectionCount: activeTargetIntersections.length,
    isolatedN06Exception: { sourcePath: INPUTS.n06Finding,
      sourceSha256: sha256(fs.readFileSync(absolute(INPUTS.n06Finding))),
      exactBlockedCellCount: n06Cells.length, interactionEnvelopeIntersectionCount: n06Intersections.length,
      remainsFailClosedAndUnchanged: true },
    northSmokeLocalContainment: { exactPlaneFluidCount: wetNorthFindings.length,
      selectedDryTargetCount: touchedNorthSmoke.length, selectedFluidTargetCount: 0,
      n06TargetOrHaloIntersectionCount: n06Intersections.length,
      fullBoundaryCommissioned: false },
    retainedFireServiceInterfaceCapCount: fireCap.length,
    retainedLocalDrainageCapCount: drainCaps.length,
    checkedPriorManifestCount: priorChecks.length, acceptedPriorManifestChecks: priorChecks,
    undeclaredPriorReleaseIntersectionCount: priorTargetHits.length - 1,
  },
  upstreamIdentities: Object.fromEntries([
    ['emptyEight', INPUTS.emptyEight], ['lifeSafety', INPUTS.lifeSafety], ['layerB', INPUTS.layerB],
    ['protectedRelics', INPUTS.protectedRelics], ['standingAuthorization', INPUTS.standingAuthorization],
    ['r08uManifest', INPUTS.r08uManifest],
  ].map(([key, filename]) => [key, { path: filename,
    sha256: sha256(fs.readFileSync(absolute(filename))) }])),
  hardSafetyKernelNext: [
    'independent manifest and exact-inverse QA',
    'fresh same-invocation complete-save capture and deterministic recompile',
    'ordered exact source preflight for both packages',
    'strict-noop forward and rollback parser checks',
    'fresh live entity clearance bound to all operation hashes',
    'journaled strict-noop execution in declared order',
    'fresh post snapshot, connected-floor/containment QA, and reverse-order rollback preflight',
  ],
  deferred: { fireServiceInterfaceOpening: true, publicOrFireServiceCommissioning: true,
    northSmokeWetAndN06AdjacentRemainder: true, activeMechanisms: true,
    tenantOpenings: true, drainageHeaderAndExternalDischarge: true },
  safetyBoundary: { liveCallsPerformed: false, liveEntityClearancePerformed: false,
    worldEditsPerformed: false, executionAuthorizedByThisManifest: false },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({ ...manifestWithoutIdentity, manifestIdentity }, null, 2)}\n`);
console.log(JSON.stringify({ status: manifestWithoutIdentity.status, manifest: manifestPath,
  manifestIdentity, releaseNodeId: RELEASE_NODE_ID,
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  targetCellCount: targetCells.length, floorCellCount: floor.length,
  containmentOperationCount: containmentOperations.length, headroomAirCount: headroom.length,
  retainedGravityHaloCount: gravityClosures.length, activeMechanismIntersectionCount: 0,
  packages: packageArtifacts.map(({ key, commandCount, forwardSha256, rollbackSha256 }) => ({
    key, commandCount, forwardSha256, rollbackSha256 })),
  blockEntityIntersectionCount: blockEntities.length,
  savedEntityIntersectionCount: savedEntities.length,
  protectedRelicIntersectionCount: protectedIntersections.length,
  futureSealIntersectionCount: futureSealIntersections.length,
  undeclaredPriorReleaseIntersectionCount: priorTargetHits.length - 1,
  liveCallsPerformed: false, worldEditsPerformed: false }, null, 2));
