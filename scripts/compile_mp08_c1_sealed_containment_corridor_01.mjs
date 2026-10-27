#!/usr/bin/env node
/**
 * Compile the bounded MP08 C1 sealed-containment corridor.
 *
 * This is intentionally an offline compiler. It seals the already-dry C1
 * route from both caverns with a floor-supported polished-deepslate envelope,
 * sealed underfloor liner, and two closed unpowered manual door planes. It
 * never opens a cave, creates a fluid outfall, or authorizes execution.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const RELEASE_ID = 'MP08-C1-SEALED-CONTAINMENT-CORRIDOR-01';
const RELEASE_NODE_ID = 'MP08-C1-SEALED-CONTAINMENT-CORRIDOR';
const argv = process.argv.slice(2);
const option = (flag, fallback = null) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = option('--snapshot');
const OUT_DIR = option('--out-dir', 'data/buildops');
const BASENAME = option('--basename', 'mp08-c1-sealed-containment-corridor-01');
const GENERATED_AT = option('--generated-at', new Date().toISOString());
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE_ID} rejected: ${message}`); };
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, index) => a + index);
const cells = (x1, x2, y1, y2, z1, z2) => {
  const out = [];
  for (const x of range(x1, x2)) for (const y of range(y1, y2)) for (const z of range(z1, z2)) out.push({ x, y, z });
  return out;
};
const stateName = (state) => state.split('[', 1)[0];
const PD = 'minecraft:polished_deepslate';
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding']);
const PROTECTED = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw', 'minecraft:end_portal', 'minecraft:end_gateway']);
const sameCell = (left, right) => cellKey(left) === cellKey(right);
const exact = (set) => {
  const unique = uniqueCells(set);
  return { cellCount: unique.length, bounds: boundsOf(unique), coordinateSetSha256: hashCells(unique) };
};
const stateSetSha = (records) => sha256(`${records.slice().sort((a, b) => cellKey(a.cell).localeCompare(cellKey(b.cell))).map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);
const isHazard = (state) => FLUID.has(stateName(state)) || state.includes('waterlogged=true') || GRAVITY.has(stateName(state)) || stateName(state).endsWith('_concrete_powder') || PROTECTED.has(stateName(state)) || stateName(state).endsWith('_shulker_box');
const halo = (set) => uniqueCells(set.flatMap(({ x, y, z }) => cells(x - 1, x + 1, y - 1, y + 1, z - 1, z + 1)));
const profile = range(15, 70).map((z) => ({ z, floorY: z <= 26 ? -12 : z <= 54 ? -11 : -10 }));
const coreShell = uniqueCells(profile.flatMap(({ z, floorY }) => [
  ...cells(-2, -2, floorY, floorY + 3, z, z),
  ...cells(2, 2, floorY, floorY + 3, z, z),
  ...cells(-1, 1, floorY + 3, floorY + 3, z, z),
]));
const coreLiner = uniqueCells(profile.flatMap(({ z, floorY }) => cells(-1, 1, floorY - 1, floorY - 1, z, z)));
const coreClear = uniqueCells(profile.flatMap(({ z, floorY }) => cells(-1, 1, floorY + 1, floorY + 2, z, z)));
function vestibule(id, fromZ, toZ, floorY, doorZ, facing) {
  const door = uniqueCells(range(-1, 1).flatMap((x) => [
    { x, y: floorY + 1, z: doorZ }, { x, y: floorY + 2, z: doorZ },
  ]));
  const doorSet = new Set(door.map(cellKey));
  const structure = uniqueCells([
    ...cells(-2, 2, floorY, floorY, fromZ, toZ),
    ...cells(-2, -2, floorY + 1, floorY + 3, fromZ, toZ),
    ...cells(2, 2, floorY + 1, floorY + 3, fromZ, toZ),
    ...cells(-1, 1, floorY + 3, floorY + 3, fromZ, toZ),
  ].filter((cell) => !doorSet.has(cellKey(cell))));
  const liner = cells(-1, 1, floorY - 1, floorY - 1, fromZ, toZ);
  const clear = cells(-1, 1, floorY + 1, floorY + 2, fromZ, toZ).filter((cell) => !doorSet.has(cellKey(cell)));
  // In this server version iron doors have no waterlogged property. The
  // finite halo census below proves the no-water condition instead.
  const desiredDoor = door.map((cell) => ({ cell, state: `minecraft:iron_door[facing=${facing},half=${cell.y === floorY + 1 ? 'lower' : 'upper'},hinge=${cell.x === -1 ? 'left' : 'right'},open=false,powered=false]` }));
  return { id, structure, liner, door, desiredDoor, clear };
}
const cavernA = vestibule('cavern-a-vestibule', 11, 14, -12, 11, 'north');
const cavernB = vestibule('cavern-b-vestibule', 71, 74, -10, 74, 'south');
const packages = [
  { key: 'c1-core-liner', cells: uniqueCells([...coreShell, ...coreLiner]), desired: () => PD },
  { key: cavernA.id, cells: uniqueCells([...cavernA.structure, ...cavernA.liner, ...cavernA.door]), desired: (cell) => cavernA.desiredDoor.find(({ cell: point }) => sameCell(point, cell))?.state ?? PD },
  { key: cavernB.id, cells: uniqueCells([...cavernB.structure, ...cavernB.liner, ...cavernB.door]), desired: (cell) => cavernB.desiredDoor.find(({ cell: point }) => sameCell(point, cell))?.state ?? PD },
];

function operationBytes(direction, entries, source) {
  const body = `${entries.map(({ cell, from, to }) => replLine(cell, direction === 'forward' ? from : to, direction === 'forward' ? to : from)).join('\n')}\n`;
  const bodySha = sha256(body);
  return { bytes: [
    `# GENERATED FILE — ${RELEASE_ID} (${direction})`,
    `# immutable offline source: ${rel(source)}`,
    '# offline package only; fresh complete source and scoped guarded kernel are mandatory before execution.',
    `# operation SHA-256: ${bodySha}`,
    body.trimEnd(), '',
  ].join('\n'), bodySha };
}

async function main() {
  fail(SNAPSHOT, '--snapshot is required');
  const source = abs(SNAPSHOT);
  for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(source, member)), `complete immutable source missing ${member}`);
  const captureBytes = fs.readFileSync(path.join(source, 'combined-zones-complete-save-capture.json'));
  const capture = JSON.parse(captureBytes);
  fail(capture.immutableCopy === true, 'source capture is not immutable');
  const reader = new AnvilReader(path.join(source, 'region'));
  const entityReader = new AnvilReader(path.join(source, 'entities'));
  const allTargets = uniqueCells(packages.flatMap((pkg) => pkg.cells));
  fail(allTargets.length === packages.reduce((total, pkg) => total + pkg.cells.length, 0), 'packages overlap');
  const allHalo = halo(allTargets);
  const cache = new Map();
  const get = async (cell) => {
    const id = cellKey(cell);
    if (!cache.has(id)) cache.set(id, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
    return cache.get(id);
  };
  const haloRecords = await Promise.all(allHalo.map(async (cell) => ({ cell, state: await get(cell) })));
  const hazards = haloRecords.filter(({ state }) => isHazard(state));
  fail(hazards.length === 0, `fluid, gravity, container, control, or protected state exists in finite target halo: ${JSON.stringify(hazards.slice(0, 8))}`);
  const targetKeys = new Set(allHalo.map(cellKey));
  const chunkKeys = [...new Set(allHalo.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
  const blockEntities = [];
  const savedEntities = [];
  for (const chunkKey of chunkKeys) {
    const [x, z] = chunkKey.split(',').map(Number);
    const chunk = await reader.chunk(x, z);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (targetKeys.has(cellKey(cell))) blockEntities.push({ cell, id: entity.id ?? entity.Id ?? null });
    }
    const entityChunk = await entityReader.chunk(x, z);
    for (const entity of entityChunk?.Entities ?? entityChunk?.entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const cell = { x: Math.floor(Number(entity.Pos[0])), y: Math.floor(Number(entity.Pos[1])), z: Math.floor(Number(entity.Pos[2])) };
      if (targetKeys.has(cellKey(cell))) savedEntities.push({ cell, id: entity.id ?? entity.Id ?? null });
    }
  }
  fail(blockEntities.length === 0 && savedEntities.length === 0, 'block or saved entity exists in finite target halo');
  const output = abs(OUT_DIR);
  fs.mkdirSync(output, { recursive: true });
  const operationDetails = {};
  const manifestPackages = [];
  for (const pkg of packages) {
    const sourceRecords = await Promise.all(pkg.cells.map(async (cell) => ({ cell, state: await get(cell) })));
    const entries = sourceRecords.map(({ cell, state }) => ({ cell, from: state, to: pkg.desired(cell) })).filter(({ from, to }) => from !== to);
    fail(entries.length > 0, `${pkg.key} has no exact source-to-target changes; do not duplicate-build`);
    const forward = operationBytes('forward', entries, source);
    const rollback = operationBytes('rollback', entries, source);
    const forwardPath = path.join(output, `${BASENAME}.${pkg.key}.forward.txt`);
    const rollbackPath = path.join(output, `${BASENAME}.${pkg.key}.rollback.txt`);
    fs.writeFileSync(forwardPath, forward.bytes);
    fs.writeFileSync(rollbackPath, rollback.bytes);
    operationDetails[pkg.key] = {
      forwardSha256: forward.bodySha, rollbackSha256: rollback.bodySha,
      forwardCommandCount: entries.length, rollbackCommandCount: entries.length,
      target: exact(pkg.cells), operated: exact(entries.map(({ cell }) => cell)),
      sourceStateSetSha256: stateSetSha(sourceRecords), targetStateSetSha256: stateSetSha(entries.map(({ cell, to }) => ({ cell, state: to }))), exactInverse: true,
    };
    manifestPackages.push({ key: pkg.key, forward: rel(forwardPath), rollback: rel(rollbackPath) });
  }
  const retained = uniqueCells([...coreClear, ...cavernA.clear, ...cavernB.clear]);
  const retainedRecords = await Promise.all(retained.map(async (cell) => ({ cell, state: await get(cell) })));
  fail(retainedRecords.every(({ state }) => AIR.has(stateName(state))), 'retained C1 / vestibule route core is not entirely air');
  const manifest = {
    schemaVersion: 1,
    transactionId: 'mp08-c1-sealed-containment-corridor-01', generatedAtUtc: GENERATED_AT,
    status: 'COMPILED_FROM_COMPLETE_SOURCE_AWAITING_FRESH_GUARDED_KERNEL', releaseNodeId: RELEASE_NODE_ID,
    mvpScope: false, scopeIds: ['MP08-A', 'SYS-02'], packages: manifestPackages,
    executionOrder: { forward: packages.map(({ key }) => key), rollback: packages.map(({ key }) => key).reverse() },
    scopedRunner: { wrapper: 'scripts/run_combined_zones_scoped_release.mjs', authorization: 'docs/masterplans/08-raven-rock/mp08-c1-sealed-containment-governor-standing-execution-authorization.json', releaseNodeId: RELEASE_NODE_ID, defaultMode: 'PREPARE_ONLY', liveExecutionOptIn: '--execute' },
    source: { snapshotRoot: rel(source), completeSaveCapture: { path: rel(path.join(source, 'combined-zones-complete-save-capture.json')), sha256: sha256(captureBytes), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, immutableCopy: true } },
    scope: {
      releaseId: RELEASE_ID, canonicalOwner: 'MP08-RAVEN-ROCK-IMPLEMENTATION-TEAM',
      governorDelegatedRoles: { c1ScopeOwner: 'Raven Rock containment implementation lead', cavernAInterfaceOwner: 'Cavern A containment counterpart', cavernBInterfaceOwner: 'Cavern B containment counterpart', safetyRecoveryOwner: 'PassageWay safety and recovery lead', releaseOperator: 'Guarded-release implementation operator' },
      purpose: 'Convert the existing dry 56-station C1 strip into a bounded, dry, sealed restricted inspection corridor. Both cavern interfaces finish closed, manual, unpowered, no-NBT, and no-discharge.',
      excluded: ['C2', 'Cavern C', 'RR-N6', 'T4', 'public access', 'emergency egress', 'transport', 'water displacement', 'fluid outfall', 'cavern receiver excavation'],
      coreShell: exact(coreShell), coreLiner: exact(coreLiner), vestibuleA: { structure: exact(cavernA.structure), liner: exact(cavernA.liner), closedDoor: exact(cavernA.door) }, vestibuleB: { structure: exact(cavernB.structure), liner: exact(cavernB.liner), closedDoor: exact(cavernB.door) }, retainedClearRoute: exact(retained), targetHalo: exact(allHalo),
    },
    target: { operatedUnion: exact(allTargets), sourceStateCensus: Object.fromEntries(haloRecords.filter(({ cell }) => new Set(allTargets.map(cellKey)).has(cellKey(cell))).reduce((map, { state }) => map.set(state, (map.get(state) ?? 0) + 1), new Map())), desiredStates: [PD, 'minecraft:iron_door[facing=north,half=lower,hinge=left,open=false,powered=false]', 'minecraft:iron_door[facing=south,half=lower,hinge=left,open=false,powered=false]'], packageTargetsDisjoint: true },
    operations: operationDetails,
    functionalAcceptance: { classification: 'RESTRICTED_PASSIVE_INSPECTION_CORRIDOR_ONLY', routeWidth: 3, clearHeight: 2, stations: 62, closedManualDoors: 2, sealedUnderfloorNoDischarge: true, fluidOrLavaWithinTargetHalo: 0, gravityWithinTargetHalo: 0, blockEntitiesWithinTargetHalo: 0, savedEntitiesWithinTargetHalo: 0 },
    hardStops: { requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true, requiresTargetAndHaloToRemainFluidGravityContainerAndProtectedCoreFree: true, requiresBlockEntityAndLiveEntityClearance: true, requiresStrictNoopForwardAndRollbackChecks: true, requiresExactSourcePreflight: true, requiresJournaledStrictExecution: true, requiresFreshPostSnapshotAndRollbackPoststatePreflight: true, requiresIndependentSealedCorridorQa: true },
    safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false, noExternalSignaturesRequired: true },
  };
  manifest.manifestIdentity = sha256(JSON.stringify(manifest));
  const manifestPath = path.join(output, `${BASENAME}.release-manifest.json`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ status: 'COMPILED', manifest: rel(manifestPath), releaseId: RELEASE_ID, operatedCells: Object.values(operationDetails).reduce((sum, item) => sum + item.forwardCommandCount, 0), targetCells: allTargets.length }, null, 2)}\n`);
}
await main();
