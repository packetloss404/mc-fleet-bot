#!/usr/bin/env node
/**
 * Compile the four exact passive internal ventilation-compartment caps.
 *
 * The complementary north smoke plane is deliberately not emitted: four of
 * its wall cells are face-adjacent to N06's unsupported gravel exception, so
 * a block update could destroy the exact retained source. VENT-A's four 3x3
 * internal caps are the largest remaining selected static-cap construction
 * union that is dry, disjoint, and exactly reversible. No riser is excavated
 * and no ventilation mechanism or operational commissioning is authorized.
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
const values = (flag) => argv.flatMap((entry, index) => (
  entry === flag && argv[index + 1] ? [argv[index + 1]] : []
));
const GENERATED_AT = value('--generated-at', '2026-08-21T19:55:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-r08t-post-20260821T194152Z');
const INTAKE_AUDIT = value('--intake-audit',
  'data/world-review/combined-zones-r08t-live-20260821T194152Z/post-complete-save-intake.json');
const SOURCE_LEDGER = value('--source-release-ledger',
  'data/world-review/combined-zones-r08t-live-20260821T194152Z/evidence-ledger.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r08u-empty-eight-internal-vent-caps');
const MANIFEST_STATUS = value('--manifest-status',
  'COMPILED_FROM_ACCEPTED_R08T_POST_AWAITING_FRESH_EXECUTION_KERNEL');
const RELEASE_ID = 'CZ-R08U-EMPTY-EIGHT-INTERNAL-VENT-CAPS';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const CANONICAL_OWNER = 'OWN-D06-VENT';
const MASTER_SCOPE_OWNER = 'Z02-U1-CONCOURSE-MALL';
const GRAVITY_KEY = 'ee-vent-nw-gravity-safe-internal-cap';
const CAP_KEY = 'ee-vent-four-internal-compartment-caps';
const CAP_STATE = 'minecraft:polished_deepslate';
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
    'data/buildops/combined-zones-r08t-empty-eight-south-smoke-boundary.release-manifest.json',
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
  if (!condition) throw new Error(`R08U internal-vent-cap compiler rejected: ${message}`);
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
const census = (records, selector = (record) => record.state) => {
  const counts = new Map();
  for (const record of records) {
    const state = selector(record);
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].sort((left, right) => right[1] - left[1]
    || left[0].localeCompare(right[0])));
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
      minZ: Math.min(coords[2], coords[5]), maxZ: Math.max(coords[2], coords[5]) } });
  }
  return operations;
}

const emptyEight = readJson(INPUTS.emptyEight);
const lifeSafety = readJson(INPUTS.lifeSafety);
const layerB = readJson(INPUTS.layerB);
const protectedRelics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.standingAuthorization);
const n06 = readJson(INPUTS.n06Finding);
const intake = readJson(INTAKE_AUDIT);
const sourceLedger = readJson(SOURCE_LEDGER);
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not a complete immutable PASS');
invariant(absolute(intake.input?.suppliedWorldRoot) === absolute(SNAPSHOT),
'source intake does not bind the selected snapshot');
invariant(sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.transactionId === 'combined-zones-r08t-empty-eight-south-smoke-boundary'
  && absolute(sourceLedger.postSnapshot.root) === absolute(SNAPSHOT)
  && sourceLedger.postSnapshot.completeSaveSha256 === intake.packageIdentity.completeSaveSha256,
'terminal R08T ledger/post identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R08');

const selected = lifeSafety.d06EmptyEightLifeSafety.ventilationOutletAlternatives.alternatives
  .find(({ id }) => id === 'VENT-A-FOUR-INDEPENDENT-LOCAL-RISERS');
invariant(lifeSafety.d06EmptyEightLifeSafety.ventilationOutletAlternatives.recommendedAlternativeId === selected.id
  && selected.recommendedForSoleAuthorityReview === true && selected.risers.length === 4
  && selected.riserSetsPairwiseDisjoint === true && selected.egressCoreIntersections === 0,
'selected VENT-A alternative drifted');
const capDesigns = selected.risers.map((riser) => ({
  id: riser.id,
  internal: cellsIn(riser.internalCompartmentCap.bounds),
  exterior: cellsIn(riser.exteriorOutletCap.bounds),
  riserReservation: cellsIn(riser.riserReservation.bounds),
  source: riser,
}));
for (const design of capDesigns) {
  invariant(design.internal.length === 9
    && hashCells(design.internal, D06_CELL_PREAMBLE) === design.source.internalCompartmentCap.coordinateSetSha256
    && design.exterior.length === 9
    && hashCells(design.exterior, D06_CELL_PREAMBLE) === design.source.exteriorOutletCap.coordinateSetSha256,
  `${design.id} cap geometry drifted`);
}
const internalCaps = uniqueCells(capDesigns.flatMap(({ internal }) => internal));
const exteriorCaps = uniqueCells(capDesigns.flatMap(({ exterior }) => exterior));
const riserReservations = uniqueCells(capDesigns.flatMap(({ riserReservation }) => riserReservation));
invariant(internalCaps.length === 36 && exteriorCaps.length === 36
  && riserReservations.length === selected.combinedReservation.cellCount
  && hashCells(riserReservations, D06_CELL_PREAMBLE) === selected.combinedReservation.coordinateSetSha256,
'VENT-A union geometry drifted');
const internalKeys = new Set(internalCaps.map(cellKey));
const exteriorKeys = new Set(exteriorCaps.map(cellKey));
const riserKeys = new Set(riserReservations.map(cellKey));
invariant(internalCaps.every((cell) => !riserKeys.has(cellKey(cell)))
  && internalCaps.every((cell) => !exteriorKeys.has(cellKey(cell))),
'internal caps overlap an unowned riser reservation or exterior cap');
const halo = uniqueCells(internalCaps.flatMap((cell) => FACE.map(([dx, dy, dz]) => ({
  x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
}))).filter((cell) => !internalKeys.has(cellKey(cell))));
invariant(halo.length === 120 && hashCells(internalCaps) === '14993e347856c00cd95a2de0fb5490141fa93a994ff3466fcc0b59e310a6aaee'
  && hashCells(halo) === '2e3b8849f49054b1cd803cb2a81b0a874052a448c84d7e5892ac183fd3bbb1a1',
'internal-cap target/halo identity drifted');

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
const haloRecords = [];
const exteriorRecords = [];
for (const cell of internalCaps) targetRecords.push({ cell, state: await stateAt(cell) });
for (const cell of halo) haloRecords.push({ cell, state: await stateAt(cell) });
for (const cell of exteriorCaps) exteriorRecords.push({ cell, state: await stateAt(cell) });
const targetFluid = targetRecords.filter(({ state }) => isFluid(state));
const targetGravity = targetRecords.filter(({ state }) => isGravity(state));
const targetForbidden = targetRecords.filter(({ state }) => isForbidden(state));
const haloFluid = haloRecords.filter(({ state }) => isFluid(state));
const haloGravity = haloRecords.filter(({ state }) => isGravity(state));
const haloForbidden = haloRecords.filter(({ state }) => isForbidden(state));
invariant(targetFluid.length === 0 && targetGravity.length === 1 && targetForbidden.length === 0
  && haloFluid.length === 0 && haloGravity.length === 4 && haloForbidden.length === 0,
'target/halo hazard census drifted');
invariant(exteriorRecords.every(({ state }) => state === CAP_STATE),
'four exterior outlet caps are not already exact polished-deepslate caps');

async function gravityClosure(record, targetSet) {
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
    targetDependencyCount: chain.filter((cell) => targetSet.has(cellKey(cell))).length,
    durablySupported: !isAir(terminalState) && !isFluid(terminalState)
      && !targetSet.has(cellKey(cursor)) };
}
const targetGravityClosure = await gravityClosure(targetGravity[0], new Set());
const haloGravityClosures = [];
for (const record of haloGravity) haloGravityClosures.push(await gravityClosure(record, internalKeys));
invariant(targetGravityClosure.durablySupported === true
  && targetGravityClosure.chain.length === 3
  && targetGravityClosure.terminalSupportState === 'minecraft:andesite'
  && haloGravityClosures.every(({ durablySupported }) => durablySupported),
'target or retained halo gravity closure is not durable');

const n06Cells = n06.targetGravity.findings.map(({ cell }) => cell);
const n06Keys = new Set(n06Cells.map(cellKey));
const n06Intersections = uniqueCells([...internalCaps, ...halo]).filter((cell) => n06Keys.has(cellKey(cell)));
invariant(n06Cells.length === 4 && n06Intersections.length === 0,
'internal caps intersect the N06 exception');
const northSmoke = cellsIn({ minX: 1652, maxX: 1847, minY: 48, maxY: 54, minZ: 50, maxZ: 50 });
const northSmokeKeys = new Set(northSmoke.map(cellKey));
const northFluid = [];
for (const cell of northSmoke) {
  const state = await stateAt(cell);
  if (isFluid(state)) northFluid.push({ cell, state });
}
const n06NorthAdjacencies = n06Cells.flatMap((cell) => FACE.map(([dx, dy, dz]) => ({
  n06Cell: cell, smokeCell: { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz },
})).filter(({ smokeCell }) => northSmokeKeys.has(cellKey(smokeCell))));
invariant(northFluid.length === 6 && n06NorthAdjacencies.length === 4,
'north-smoke local blocker census drifted');

const blockEntities = [];
const savedEntities = [];
const envelopeKeys = new Set([...internalCaps, ...halo].map(cellKey));
const componentEnvelopes = capDesigns.map(({ source }) => ({
  minX: source.internalCompartmentCap.bounds.minX - 1,
  maxX: source.internalCompartmentCap.bounds.maxX + 1,
  minY: source.internalCompartmentCap.bounds.minY - 1,
  maxY: source.internalCompartmentCap.bounds.maxY + 1,
  minZ: source.internalCompartmentCap.bounds.minZ - 1,
  maxZ: source.internalCompartmentCap.bounds.maxZ + 1,
}));
const touchedChunks = uniqueCells(internalCaps.map((cell) => ({
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
    if (componentEnvelopes.some((bounds) => x >= bounds.minX && x < bounds.maxX + 1
      && y >= bounds.minY && y < bounds.maxY + 1
      && z >= bounds.minZ && z < bounds.maxZ + 1)) {
      savedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
    }
  }
}
invariant(blockEntities.length === 0 && savedEntities.length === 0,
'cap envelope contains a block entity or saved movable entity');
const protectedIntersections = protectedRelics.relics.flatMap((relic) => {
  const hits = [...internalCaps, ...halo].filter((cell) => inside(cell, relic.declaredInclusiveBounds));
  return hits.length ? [{ relic: relic.key, ...exactSet(hits) }] : [];
});
invariant(protectedIntersections.length === 0, 'cap envelope intersects a protected relic');
const futureSealKeys = new Set(emptyEight.d06.futureInterfaces.interfaces.flatMap(
  ({ sealDesign }) => cellsIn(sealDesign.bounds),
).map(cellKey));
const futureSealIntersections = [...internalCaps, ...halo]
  .filter((cell) => futureSealKeys.has(cellKey(cell)));
invariant(futureSealIntersections.length === 0, 'cap envelope intersects a future-line seal');
const r08tWall = cellsIn({ minX: 1652, maxX: 1847, minY: 48, maxY: 54, minZ: 150, maxZ: 150 });
const r08tWallKeys = new Set(r08tWall.map(cellKey));
invariant([...internalCaps, ...halo].every((cell) => !r08tWallKeys.has(cellKey(cell))),
'cap envelope intersects R08T');

const priorChecks = [];
const priorHits = [];
for (const manifestPath of INPUTS.priorManifests) {
  const manifest = readJson(manifestPath);
  const union = new Map();
  for (const pkg of manifest.packages ?? []) {
    const declared = manifest.operations?.[pkg.key]
      ?? (manifest.packages.length === 1 && manifest.operations?.forwardSha256 ? manifest.operations : null);
    invariant(declared && sha256(operationBody(pkg.forward)) === declared.forwardSha256,
      `prior operation body drifted: ${manifest.transactionId}/${pkg.key}`);
    for (const operation of parseRepl(pkg.forward)) for (const cell of internalCaps) {
      if (inside(cell, operation.bounds)) union.set(cellKey(cell), cell);
    }
  }
  if (union.size) priorHits.push({ transactionId: manifest.transactionId, ...exactSet([...union.values()]) });
  priorChecks.push({ path: manifestPath, transactionId: manifest.transactionId,
    manifestIdentity: manifest.manifestIdentity ?? null, targetIntersectionCount: union.size });
}
invariant(priorHits.length === 0, 'internal caps intersect an accepted prior release');

const gravityOperation = { cell: targetGravity[0].cell, fromState: targetGravity[0].state, toState: CAP_STATE };
const remainingOperations = targetRecords.filter(({ cell }) => cellKey(cell) !== cellKey(gravityOperation.cell))
  .map(({ cell, state }) => ({ cell, fromState: state, toState: CAP_STATE }))
  .sort((a, b) => a.cell.x - b.cell.x || a.cell.z - b.cell.z || a.cell.y - b.cell.y);
const packageDesigns = [
  { key: GRAVITY_KEY, role: 'replace-one-durably-supported-target-gravel-with-static-cap',
    operations: [gravityOperation] },
  { key: CAP_KEY, role: 'complete-four-passive-internal-compartment-caps',
    operations: remainingOperations },
];
invariant(remainingOperations.length === 35 && new Set(packageDesigns.flatMap(({ operations }) => (
  operations.map(({ cell }) => cellKey(cell))
))).size === 36, 'operation partition is not an exact target bijection');

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const packageArtifacts = [];
for (const pkg of packageDesigns) {
  const forwardBody = `${pkg.operations.map(({ cell, fromState, toState }) => replLine(cell, fromState, toState)).join('\n')}\n`;
  const rollbackBody = `${pkg.operations.slice().reverse().map(({ cell, fromState, toState }) => replLine(cell, toState, fromState)).join('\n')}\n`;
  const forwardSha256 = sha256(forwardBody);
  const rollbackSha256 = sha256(rollbackBody);
  const targetIdentity = exactSet(pkg.operations.map(({ cell }) => cell));
  const forward = path.join('data/buildops', `${BASENAME}.${pkg.key}.forward.txt`);
  const rollback = path.join('data/buildops', `${BASENAME}.${pkg.key}.rollback.txt`);
  const outputForward = path.join(OUT_DIR, path.basename(forward));
  const outputRollback = path.join(OUT_DIR, path.basename(rollback));
  const header = (role, operationSha256) => [
    `# GENERATED FILE - ${RELEASE_ID} (${pkg.key} ${role})`,
    `# source root: ${SNAPSHOT}`,
    `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
    `# target coordinate-set SHA-256: ${targetIdentity.coordinateSetSha256}`,
    `# operation SHA-256: ${operationSha256}`,
    '',
  ].join('\n');
  fs.writeFileSync(absolute(outputForward), `${header('forward', forwardSha256)}${forwardBody}`);
  fs.writeFileSync(absolute(outputRollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);
  packageArtifacts.push({ key: pkg.key, role: pkg.role, forward, rollback,
    forwardSha256, rollbackSha256, commandCount: pkg.operations.length, targetIdentity,
    sourceStateCensus: census(pkg.operations, ({ fromState }) => fromState),
    desiredStateCensus: census(pkg.operations, ({ toState }) => toState) });
}

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1, transactionId: BASENAME, generatedAtUtc: GENERATED_AT,
  status: MANIFEST_STATUS, releaseNodeId: RELEASE_NODE_ID, mvpScope: true,
  scopeIds: [CANONICAL_OWNER, MASTER_SCOPE_OWNER],
  packages: packageArtifacts.map(({ key, forward, rollback }) => ({ key, forward, rollback })),
  executionOrder: {
    forward: [GRAVITY_KEY, CAP_KEY], rollback: [CAP_KEY, GRAVITY_KEY],
    withinPackage: 'one durable gravity-to-static transition first; remaining caps deterministic x/z order; rollback exact reverse packages and lines',
    rationale: 'The sole target gravel is durably supported by an untouched two-gravel chain on andesite. Static replacement precedes the remaining cap field; rollback restores all ordinary geology first and the exact supported gravel last.',
  },
  scope: {
    releaseId: RELEASE_ID, releaseNodeId: RELEASE_NODE_ID, canonicalOwner: CANONICAL_OWNER,
    masterScopeOwner: MASTER_SCOPE_OWNER, mvpScope: true,
    purpose: 'Close the four selected VENT-A internal compartment interfaces without excavating risers or opening outlets.',
    selectedAlternativeId: selected.id,
    capIds: capDesigns.map(({ id }) => `${id}-INTERNAL-COMPARTMENT-CAP`),
    capMaterial: { paletteId: 'EE-P13', block: CAP_STATE, role: 'default-closed future-interface cap' },
    passiveCapsOnly: true, riserExcavationAuthorized: false, exteriorOutletOpened: false,
    ventilationMechanismAuthorized: false, ventilationCommissioned: false,
    geometry: { internalCompartmentCaps: exactSet(internalCaps),
      alreadyClosedExteriorOutletCaps: exactSet(exteriorCaps),
      completePassiveCapUnion: exactSet([...internalCaps, ...exteriorCaps]),
      retainedUnexcavatedRiserReservations: exactSet(riserReservations),
      internalCapsPairwiseDisjoint: true },
  },
  scopeSelection: {
    complementaryNorthSmokeBoundary: {
      disposition: 'LOCAL_BLOCKED_PRESERVE_N06_UNSUPPORTED_GRAVEL_AND_WET_SOURCE',
      exactPlane: exactSet(northSmoke), targetFluidCount: northFluid.length,
      targetFluidFindings: northFluid,
      n06FaceAdjacentCellCount: n06NorthAdjacencies.length,
      n06FaceAdjacencies: n06NorthAdjacencies,
      reason: 'Four required wall cells would update the face-adjacent unsupported N06 gravel exception; exact durable preservation cannot be proved. Six flowing-water targets add a separate ordered-fluid prerequisite.',
      executableOperationsWritten: false,
    },
    passiveBarrierPlanes: { disposition: 'ALREADY_AS_BUILT_OR_ACCEPTED_INTERFACE_OVERLAP_NO_USEFUL_CLEAN_DELTA',
      completePlaneCount: 8, completePlaneCellCount: 1616 },
    selectedNextLargestStaticCapDelta: { internalVentCapCellCount: 36,
      fireServiceCapCandidateCellCount: 35, drainageLocalCapCandidateCellCount: 24,
      selectionRule: 'largest exact selected disjoint incomplete static-cap union with frozen material doctrine and durable rollback' },
  },
  source: {
    snapshotRoot: SNAPSHOT, completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT, intakeStatus: intake.status,
    terminalReleaseLedger: { path: SOURCE_LEDGER, sha256: sha256(fs.readFileSync(absolute(SOURCE_LEDGER))),
      status: sourceLedger.status, transactionId: sourceLedger.transactionId,
      completedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256 },
    exactTargetStateCensus: census(targetRecords), exactHaloStateCensus: census(haloRecords),
    exactExteriorCapStateCensus: census(exteriorRecords), touchedChunks,
  },
  target: { operatedUnion: exactSet(internalCaps), packageTargetsDisjoint: true,
    completeFinalDesiredStateCensus: { [CAP_STATE]: 36 },
    alreadyDesiredExteriorCapCount: exteriorCaps.length,
    packageDesiredStateCensus: Object.fromEntries(packageArtifacts.map((pkg) => [pkg.key, pkg.desiredStateCensus])) },
  operations: Object.fromEntries(packageArtifacts.map((pkg) => [pkg.key, {
    forwardSha256: pkg.forwardSha256, rollbackSha256: pkg.rollbackSha256,
    forwardCommandCount: pkg.commandCount, rollbackCommandCount: pkg.commandCount,
    targetCoordinateSetSha256: pkg.targetIdentity.coordinateSetSha256, exactInverse: true,
  }])),
  isolation: {
    targetFluidIntersectionCount: targetFluid.length, targetGravityIntersectionCount: targetGravity.length,
    targetContainerOrControlIntersectionCount: targetForbidden.length,
    targetGravityClosure, interactionHalo: exactSet(halo),
    interactionHaloFluidCount: haloFluid.length, interactionHaloGravityCount: haloGravity.length,
    interactionHaloContainerOrControlCount: haloForbidden.length,
    retainedGravityHalo: { count: haloGravityClosures.length,
      allDurablySupportedAndUnaffected: haloGravityClosures.every(({ durablySupported }) => durablySupported),
      findings: haloGravityClosures },
    blockEntityInteractionEnvelopeIntersectionCount: blockEntities.length,
    savedEntityInteractionEnvelopeIntersectionCount: savedEntities.length,
    protectedRelicInteractionEnvelopeIntersectionCount: protectedIntersections.length,
    deferredFutureLineSealInteractionEnvelopeIntersectionCount: futureSealIntersections.length,
    acceptedR08TInteractionEnvelopeIntersectionCount: 0,
    isolatedN06Exception: { sourcePath: INPUTS.n06Finding,
      sourceSha256: sha256(fs.readFileSync(absolute(INPUTS.n06Finding))), exactBlockedCellCount: n06Cells.length,
      interactionEnvelopeIntersectionCount: n06Intersections.length, remainsFailClosedAndUnchanged: true },
    checkedPriorManifestCount: priorChecks.length, acceptedPriorManifestChecks: priorChecks,
    undeclaredPriorReleaseIntersectionCount: priorHits.length,
  },
  selectedAlternative: { sourcePath: INPUTS.lifeSafety,
    sourceSha256: sha256(fs.readFileSync(absolute(INPUTS.lifeSafety))),
    id: selected.id, recommended: true, exteriorCapsAlreadyExact: true,
    internalCapsClosedByThisRelease: true, riserConstructionOwnershipClaimed: false },
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
  deferred: { northSmokeBoundary: true, n06RetailShell: true, riserExcavation: true,
    exteriorOutletOpening: true, ventilationMechanisms: true, ventilationCommissioning: true },
  safetyBoundary: { liveCallsPerformed: false, liveEntityClearancePerformed: false,
    worldEditsPerformed: false, executionAuthorizedByThisManifest: false },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({ ...manifestWithoutIdentity, manifestIdentity }, null, 2)}\n`);
console.log(JSON.stringify({ status: MANIFEST_STATUS, manifest: manifestPath, manifestIdentity,
  releaseNodeId: RELEASE_NODE_ID, sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  internalCapCellCount: internalCaps.length, alreadyClosedExteriorCapCellCount: exteriorCaps.length,
  sourceStateCensus: census(targetRecords), targetGravityCount: targetGravity.length,
  retainedGravityHaloCount: haloGravity.length, northSmokeFluidCount: northFluid.length,
  northSmokeN06AdjacencyCount: n06NorthAdjacencies.length,
  packages: packageArtifacts.map(({ key, commandCount, forwardSha256, rollbackSha256 }) => ({
    key, commandCount, forwardSha256, rollbackSha256 })),
  blockEntityIntersectionCount: blockEntities.length, savedEntityIntersectionCount: savedEntities.length,
  protectedRelicIntersectionCount: protectedIntersections.length,
  futureSealIntersectionCount: futureSealIntersections.length,
  undeclaredPriorReleaseIntersectionCount: priorHits.length,
  liveCallsPerformed: false, worldEditsPerformed: false }, null, 2));
