#!/usr/bin/env node
/** Compile an ordered, reversible retained-water bypass beside the Cobalt south running tube. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const SNAPSHOT = value('--snapshot', '');
const OUT = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'rail-s3-water-bypass-01');
const RELEASE_ID = value('--release-id', 'RAIL-S3-WATER-BYPASS-01');
const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE_ID} compiler rejected: ${message}`); };
fail(SNAPSHOT, 'a fresh complete-save snapshot is required');
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const reader = new AnvilReader(path.resolve(ROOT, SNAPSHOT, 'region'));
const cache = new Map();
const stateAt = async (cell) => {
  const id = cellKey(cell);
  if (!cache.has(id)) cache.set(id, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(id);
};
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(blockName(state)) || state.includes('waterlogged=true');
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state));
const forbidden = new Set(['minecraft:chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon']);
const WATER = [13, 14, 15, 16].map((y) => ({ x: -180, y, z: -454 }));
const temporaryCage = [
  ...[13, 14, 15, 16].map((y) => ({ x: -180, y, z: -455 })),
  ...[-181, -179].flatMap((x) => [13, 14, 15, 16].map((y) => ({ x, y, z: -454 }))),
];
const permanentBypassShell = [
  ...[13, 14, 15, 16].flatMap((y) => [{ x: -180, y, z: -453 }, { x: -180, y, z: -456 }, { x: -180, y, z: -458 }]),
  ...[-181, -179].flatMap((x) => [13, 14, 15, 16].map((y) => ({ x, y, z: -457 }))),
  { x: -180, y: 12, z: -457 }, { x: -180, y: 17, z: -457 },
];
const BYPASS = [13, 14, 15, 16].map((y) => ({ x: -180, y, z: -457 }));
const CONTROLLED_FLUID_LINER = new Set(['-180,16,-453']);
const assertUnique = (cells, label) => {
  const ids = cells.map(cellKey); fail(new Set(ids).size === ids.length, `duplicate ${label} target`);
};
assertUnique([...WATER, ...temporaryCage, ...permanentBypassShell, ...BYPASS], 'bypass');
const source = new Map();
for (const cell of [...WATER, ...temporaryCage, ...permanentBypassShell, ...BYPASS]) source.set(cellKey(cell), await stateAt(cell));
for (const cell of WATER) fail(blockName(source.get(cellKey(cell))) === 'minecraft:water', `source water missing at ${cellKey(cell)}`);
for (const cell of [{ x: -180, y: 12, z: -454 }, { x: -180, y: 17, z: -454 }]) {
  const state = await stateAt(cell);
  fail(!isFluid(state), `original water cage cap has fluid at ${cellKey(cell)}=${state}`);
}
for (const cell of [...temporaryCage, ...permanentBypassShell, ...BYPASS]) {
  const state = source.get(cellKey(cell));
  fail(!isFluid(state) || CONTROLLED_FLUID_LINER.has(cellKey(cell)), `shell or bypass cavity has unexpected fluid at ${cellKey(cell)}=${state}`);
  fail(!forbidden.has(blockName(state)), `forbidden block entity target ${cellKey(cell)}=${state}`);
}
for (const id of CONTROLLED_FLUID_LINER) fail(isFluid(source.get(id)), `reviewed fluid liner is no longer fluid at ${id}`);
const shellRecord = (cell) => ({ cell, from: source.get(cellKey(cell)), to: 'minecraft:polished_deepslate' });
const temporaryForward = temporaryCage.filter((cell) => source.get(cellKey(cell)) !== 'minecraft:polished_deepslate').map(shellRecord);
const permanentForward = permanentBypassShell.filter((cell) => source.get(cellKey(cell)) !== 'minecraft:polished_deepslate').map(shellRecord);
const transferForward = [
  ...BYPASS.map((cell, index) => ({ cell, from: source.get(cellKey(cell)), to: source.get(cellKey(WATER[index])) })),
  ...WATER.map((cell) => ({ cell, from: source.get(cellKey(cell)), to: 'minecraft:air' })),
];
const restorationForward = temporaryForward.slice().reverse().map(({ cell, from }) => ({ cell, from: 'minecraft:polished_deepslate', to: from }));
const packages = [
  { key: 'isolation-shell', records: [...temporaryForward, ...permanentForward] },
  { key: 'retained-water-transfer', records: transferForward },
  { key: 'temporary-cage-restoration', records: restorationForward },
];
const operations = {};
const packageFiles = [];
fs.mkdirSync(path.resolve(ROOT, OUT), { recursive: true });
for (const pkg of packages) {
  fail(pkg.records.length > 0, `${pkg.key} is unexpectedly a no-op`);
  const body = `${pkg.records.map(({ cell, from, to }) => replLine(cell, from, to)).join('\n')}\n`;
  const inverse = `${pkg.records.slice().reverse().map(({ cell, from, to }) => replLine(cell, to, from)).join('\n')}\n`;
  const forward = `data/buildops/${BASENAME}.${pkg.key}.forward.txt`;
  const rollback = `data/buildops/${BASENAME}.${pkg.key}.rollback.txt`;
  const header = (direction, opHash) => `# GENERATED FILE - ${RELEASE_ID} ${pkg.key} (${direction})\n# source root: ${SNAPSHOT}\n# target coordinate-set SHA-256: ${hashCells(pkg.records.map(({ cell }) => cell))}\n# operation SHA-256: ${opHash}`;
  fs.writeFileSync(path.resolve(ROOT, forward), `${header('forward', sha(body))}\n${body}`);
  fs.writeFileSync(path.resolve(ROOT, rollback), `${header('rollback', sha(inverse))}\n${inverse}`);
  packageFiles.push({ key: pkg.key, forward, rollback });
  operations[pkg.key] = { forwardSha256: sha(body), rollbackSha256: sha(inverse), forwardCommandCount: pkg.records.length, rollbackCommandCount: pkg.records.length, targetCellCount: pkg.records.length, targetCoordinateSetSha256: hashCells(pkg.records.map(({ cell }) => cell)), exactInverse: true };
}
const exact = (cells) => { const unique = uniqueCells(cells); return { cellCount: unique.length, bounds: unique.length ? boundsOf(unique) : null, coordinateSetSha256: hashCells(unique) }; };
const manifest = {
  schemaVersion: 1, transactionId: BASENAME, generatedAtUtc: value('--generated-at', new Date().toISOString()),
  status: 'COMPILED_FLOW_ORDERED_RETAINED_WATER_BYPASS_AWAITING_COMPLETE_SAVE_EXECUTION_KERNEL', releaseNodeId: 'PASSENGER-RAILWAY', mvpScope: false, scopeIds: ['SYS-03', 'MP05-B'], packages: packageFiles,
  executionOrder: { forward: packages.map(({ key }) => key), rollback: packages.map(({ key }) => key).reverse() }, source: { snapshotRoot: SNAPSHOT },
  scope: {
    releaseId: RELEASE_ID, canonicalOwner: 'PASSENGER-RAILWAY',
    purpose: 'Flow-ordered transfer of the four-cell south running-tube water column into a separately sealed inter-tube bypass, clearing the original future tube envelope while retaining the water body. One known lateral water cell is converted to the permanent south tube liner; no other fluid target is admitted. No rail, power, vehicle, platform, route, or passenger use.',
    originalWaterColumn: exact(WATER), retainedWaterBypass: exact(BYPASS), permanentContainmentShell: exact(permanentBypassShell), temporaryCage: exact(temporaryCage), controlledFluidLiner: [{ x: -180, y: 16, z: -453, sourceState: source.get('-180,16,-453'), to: 'minecraft:polished_deepslate' }],
    flowOrder: ['complete original-cage and bypass shell', 'fill sealed bypass from exact source states', 'clear original column', 'restore temporary cage to exact source states'], routeCommissioned: false, passengerServiceCommissioned: false,
  },
  target: { operatedUnion: exact([...temporaryCage, ...permanentBypassShell, ...WATER, ...BYPASS]), packageTargetsDisjoint: false, orderedTargetReuse: exact(temporaryForward.map(({ cell }) => cell)) }, operations,
  hardStops: { requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true, requiresExactFluidGravityAndContainerClearance: true, requiresBlockEntityAndLiveEntityClearance: true, requiresStrictNoopForwardAndRollbackChecks: true, requiresJournaledStrictExecution: true, requiresFreshPostSnapshotAndRollbackPoststatePreflight: true },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false },
};
manifest.manifestIdentity = sha(JSON.stringify(manifest));
fs.writeFileSync(path.resolve(ROOT, OUT, `${BASENAME}.release-manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, packageCounts: Object.fromEntries(packages.map(({ key, records }) => [key, records.length])), manifestIdentity: manifest.manifestIdentity }, null, 2));
