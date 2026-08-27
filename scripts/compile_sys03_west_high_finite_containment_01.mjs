#!/usr/bin/env node
/**
 * Offline compiler for the finite SYS03 West High water/gravity frontier.
 *
 * This is deliberately a containment package, not a corridor, rail, or
 * access release. It solidifies the entire observed closed water component
 * into a permanent deepslate plug, then replaces all local gravity targets
 * with the same supported material. The inverse restores the water volume
 * before restoring gravity, so rollback never creates an open fluid path.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const index = argv.indexOf(name);
  return index < 0 ? fallback : (argv[index + 1] ?? fallback);
};
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp11-bkr-c01-independent-return-01-post-20260827T014500Z');
const CONTRACT = option('--prior-contract', 'data/world-review/sys03-high16-west-high-hydrology-ownership-contract-20260826T153100Z/sys03-high16-west-high-hydrology-ownership-contract-01.json');
const OUT = option('--out-dir', 'data/buildops');
const BASENAME = option('--basename', 'sys03-west-high-finite-containment-01');
const GENERATED_AT = option('--generated-at', '2026-08-27T02:00:00.000Z');
const RELEASE_ID = 'SYS03-WEST-HIGH-FINITE-CONTAINMENT-01';
const AUTHORIZATION = 'docs/masterplans/05-combined-zones/sys03-west-high-finite-containment-governor-standing-execution-authorization.json';
const TARGET = 'minecraft:polished_deepslate';
const TRACE_BOUNDARY = { minX: -240, maxX: -165, minY: 30, maxY: 75, minZ: -510, maxZ: -435 };
const EXPECTED_WATER = { count: 2525, hash: '220cf041351f18cd75e8acfa587a2b29f3eaf29fb821e355d910ee93be31271e' };
const EXPECTED_GRAVITY = { count: 92, hash: '97361427f444bb9db71e093d71432010ad1e4e4f03913ba092cf0c8596c886fa' };
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (condition) throw new Error(`${RELEASE_ID} rejected: ${message}`); };
const point = (x, y, z) => ({ x, y, z });
const stateName = (state) => state.split('[', 1)[0];
const isWaterFamily = (state) => ['minecraft:water', 'minecraft:bubble_column'].includes(stateName(state)) || state.includes('waterlogged=true');
const isFluid = (state) => isWaterFamily(state) || stateName(state) === 'minecraft:lava';
const isGravity = (state) => ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:scaffolding', 'minecraft:anvil'].includes(stateName(state));
const protectedBlocks = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block',
  'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
]);
const neighbours = (cell) => [
  point(cell.x - 1, cell.y, cell.z), point(cell.x + 1, cell.y, cell.z), point(cell.x, cell.y - 1, cell.z),
  point(cell.x, cell.y + 1, cell.z), point(cell.x, cell.y, cell.z - 1), point(cell.x, cell.y, cell.z + 1),
];
const inBoundary = (cell) => cell.x >= TRACE_BOUNDARY.minX && cell.x <= TRACE_BOUNDARY.maxX
  && cell.y >= TRACE_BOUNDARY.minY && cell.y <= TRACE_BOUNDARY.maxY
  && cell.z >= TRACE_BOUNDARY.minZ && cell.z <= TRACE_BOUNDARY.maxZ;
const onBoundary = (cell) => cell.x === TRACE_BOUNDARY.minX || cell.x === TRACE_BOUNDARY.maxX
  || cell.y === TRACE_BOUNDARY.minY || cell.y === TRACE_BOUNDARY.maxY
  || cell.z === TRACE_BOUNDARY.minZ || cell.z === TRACE_BOUNDARY.maxZ;
const census = (records, key) => Object.fromEntries([...records.reduce((all, record) => {
  const value = record[key]; all.set(value, (all.get(value) ?? 0) + 1); return all;
}, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)));
const exact = (cells) => {
  const unique = uniqueCells(cells);
  return { cellCount: unique.length, bounds: unique.length ? boundsOf(unique) : null, coordinateSetSha256: hashCells(unique) };
};
const compareBottomUp = (left, right) => left.cell.y - right.cell.y || left.cell.z - right.cell.z || left.cell.x - right.cell.x;
const compareTopDown = (left, right) => right.cell.y - left.cell.y || left.cell.z - right.cell.z || left.cell.x - right.cell.x;

const capturePath = path.join(abs(SNAPSHOT), 'combined-zones-complete-save-capture.json');
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  fail(!fs.existsSync(path.join(abs(SNAPSHOT), member)), `complete source lacks ${member}`);
}
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy !== true || !Array.isArray(capture.requiredMembers) || capture.requiredMembers.length === 0, 'source is not a complete immutable capture');
for (const member of capture.requiredMembers) {
  const file = path.join(abs(SNAPSHOT), member.path);
  fail(!fs.existsSync(file) || fs.statSync(file).size !== member.bytes || sha(fs.readFileSync(file)) !== member.sha256, `immutable source member drifted: ${member.path}`);
}
const contractBytes = fs.readFileSync(abs(CONTRACT));
const contract = JSON.parse(contractBytes);
const contractGravity = [...contract.exactGravity.core, ...contract.exactGravity.shell, ...contract.exactGravity.halo];
fail(contractGravity.length !== EXPECTED_GRAVITY.count || hashCells(contractGravity.map(({ target }) => target)) !== EXPECTED_GRAVITY.hash, 'prior gravity contract identity drifted');

const reader = new AnvilReader(path.join(abs(SNAPSHOT), 'region'));
const entityReader = new AnvilReader(path.join(abs(SNAPSHOT), 'entities'));
const stateCache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!stateCache.has(key)) stateCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return stateCache.get(key);
};

// The held direct core has exactly sixteen water-family seed cells. They are
// the sole permitted entry to the component trace.
const seeds = [];
for (let x = -214; x <= -210; x += 1) for (let z = -472; z <= -467; z += 1) {
  const cell = point(x, 47, z); const sourceState = await stateAt(cell);
  if (isWaterFamily(sourceState)) seeds.push({ cell, sourceState });
}
fail(seeds.length !== 16, `expected sixteen direct-core water seeds, found ${seeds.length}`);
const queue = seeds.map(({ cell }) => cell);
const seen = new Set(queue.map(cellKey));
const component = [];
for (let index = 0; index < queue.length; index += 1) {
  const cell = queue[index]; const sourceState = await stateAt(cell);
  if (!isWaterFamily(sourceState)) continue;
  component.push({ cell, sourceState, targetState: TARGET });
  for (const next of neighbours(cell)) {
    if (!inBoundary(next) || seen.has(cellKey(next))) continue;
    if (isWaterFamily(await stateAt(next))) { seen.add(cellKey(next)); queue.push(next); }
  }
}
const componentCells = component.map(({ cell }) => cell);
const componentBoundary = componentCells.filter(onBoundary);
fail(component.length !== EXPECTED_WATER.count || hashCells(componentCells) !== EXPECTED_WATER.hash, `water component identity ${component.length}/${hashCells(componentCells)}`);
fail(componentBoundary.length !== 0, 'water component reaches trace boundary');
const waterCensus = census(component, 'sourceState');
fail(waterCensus['minecraft:water[level=0]'] !== 2513 || waterCensus['minecraft:bubble_column[drag=true]'] !== 12 || Object.keys(waterCensus).length !== 2,
  `water source-state census drifted: ${JSON.stringify(waterCensus)}`);
const componentKeys = new Set(componentCells.map(cellKey));
const waterHalo = uniqueCells(componentCells.flatMap(neighbours).filter((cell) => !componentKeys.has(cellKey(cell))));
const waterHaloRecords = await Promise.all(waterHalo.map(async (cell) => ({ cell, state: await stateAt(cell) })));
fail(waterHaloRecords.some(({ state }) => isFluid(state)), 'water component has a fluid-bearing exterior halo');
fail(waterHaloRecords.some(({ state }) => protectedBlocks.has(stateName(state))), 'water component halo touches a protected core or container');

const gravity = [];
for (const expected of contractGravity) {
  const sourceState = await stateAt(expected.target);
  fail(!isGravity(sourceState), `gravity target drifted: ${cellKey(expected.target)}=${sourceState}`);
  const chain = [];
  for (let y = expected.target.y - 1; y >= -64; y -= 1) {
    const cell = point(expected.target.x, y, expected.target.z); const state = await stateAt(cell);
    chain.push({ cell, state });
    if (state !== 'minecraft:gravel') break;
  }
  const terminal = chain.at(-1);
  fail(!terminal || terminal.state === 'minecraft:air' || isFluid(terminal.state), `unsupported gravity terminal at ${cellKey(expected.target)}`);
  gravity.push({ cell: expected.target, sourceState, targetState: TARGET, terminal, chain });
}
const gravityCells = gravity.map(({ cell }) => cell);
fail(new Set(gravityCells.map(cellKey)).size !== EXPECTED_GRAVITY.count, 'gravity target set is not unique');
fail(gravityCells.some((cell) => componentKeys.has(cellKey(cell))), 'water and gravity treatment target sets overlap');
const gravityHalo = uniqueCells(gravityCells.flatMap(neighbours).filter((cell) => !componentKeys.has(cellKey(cell)) && !new Set(gravityCells.map(cellKey)).has(cellKey(cell))));
const gravityHaloRecords = await Promise.all(gravityHalo.map(async (cell) => ({ cell, state: await stateAt(cell) })));
fail(gravityHaloRecords.some(({ state }) => protectedBlocks.has(stateName(state))), 'gravity treatment halo touches a protected core or container');

const operated = uniqueCells([...componentCells, ...gravityCells]);
const envelope = boundsOf(uniqueCells([...operated, ...waterHalo, ...gravityHalo]));
const chunks = new Set(uniqueCells([...operated, ...waterHalo, ...gravityHalo]).map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const blockEntities = []; const savedEntities = [];
for (const id of chunks) {
  const [cx, cz] = id.split(',').map(Number);
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = point(Number(entity.x), Number(entity.y), Number(entity.z));
    if (cell.x >= envelope.minX && cell.x <= envelope.maxX && cell.y >= envelope.minY && cell.y <= envelope.maxY && cell.z >= envelope.minZ && cell.z <= envelope.maxZ) blockEntities.push(cell);
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    const position = entity.Pos?.slice(0, 3).map(Number);
    if (position?.length === 3 && position[0] >= envelope.minX && position[0] < envelope.maxX + 1 && position[1] >= envelope.minY && position[1] < envelope.maxY + 1 && position[2] >= envelope.minZ && position[2] < envelope.maxZ + 1) savedEntities.push({ id: entity.id ?? entity.Id ?? null, position });
  }
}
fail(blockEntities.length !== 0 || savedEntities.length !== 0, 'source envelope is not entity-clear');

const emit = (id, records, comparator) => {
  const ordered = records.slice().sort(comparator);
  const forwardBody = `${ordered.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
  const rollbackBody = `${ordered.slice().reverse().map(({ cell, sourceState, targetState }) => replLine(cell, targetState, sourceState)).join('\n')}\n`;
  const forward = `${OUT}/${BASENAME}.${id}.forward.txt`;
  const rollback = `${OUT}/${BASENAME}.${id}.rollback.txt`;
  fs.writeFileSync(abs(forward), forwardBody); fs.writeFileSync(abs(rollback), rollbackBody);
  return { id, forward, rollback, count: ordered.length, sha256: sha(forwardBody), rollbackSha256: sha(rollbackBody), exactInverse: true };
};
fs.mkdirSync(abs(OUT), { recursive: true });
const stages = [
  // Convert all gravity cells to an immovable structural material first.
  emit('gravity-foundation-lock-bottom-up', gravity, compareBottomUp),
  // Then close all downstream/low cells before high cells; the outer halo is non-fluid.
  emit('finite-water-component-plug-low-to-high', component, compareBottomUp),
];
const map = path.join(OUT, `${BASENAME}.plan-y47.svg`);
const targetSet = new Set(operated.map(cellKey)); const waterSet = new Set(componentCells.map(cellKey)); const size = 12;
const minX = -232; const maxX = -175; const minZ = -502; const maxZ = -441; const y = 47;
const cells = [];
for (let z = minZ; z <= maxZ; z += 1) for (let x = minX; x <= maxX; x += 1) {
  const cell = point(x, y, z); const sourceState = await stateAt(cell);
  const fill = waterSet.has(cellKey(cell)) ? '#1769aa' : targetSet.has(cellKey(cell)) ? '#9b3c28' : sourceState === TARGET ? '#455a64' : '#f5f5f5';
  cells.push(`<rect x="${50 + (x - minX) * size}" y="${70 + (z - minZ) * size}" width="${size}" height="${size}" fill="${fill}"/>`);
}
fs.writeFileSync(abs(map), `<svg xmlns="http://www.w3.org/2000/svg" width="780" height="850" viewBox="0 0 780 850"><style>text{font-family:ui-monospace,monospace;fill:#17202a}.title{font-size:16px;font-weight:bold}</style><rect width="100%" height="100%" fill="white"/><text x="16" y="25" class="title">SYS03 West High finite containment — Y=47 source plan</text><text x="16" y="47" font-size="11">blue = 2,525-cell closed water/bubble component · red = 92-cell gravity lock where present · grey = existing PDS</text>${cells.join('')}<text x="16" y="825" font-size="11">Forward: gravity lock bottom-up, then permanent water plug low-to-high. Rollback restores water plug first, then gravity.</text></svg>`);
const base = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_OFFLINE_FINITE_WATER_AND_GRAVITY_CONTAINMENT_AWAITING_FRESH_KERNEL',
  releaseNodeId: 'SYS03-WEST-HIGH-FINITE-CONTAINMENT',
  mvpScope: true,
  scopeIds: ['SYS-03', 'R10-WEST-HIGH', 'WEST-HIGH-SUCCESSOR-12-HYDROLOGY'],
  source: { snapshotRoot: SNAPSHOT, completeSaveCapture: { path: rel(capturePath), sha256: sha(captureBytes), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, immutableCopy: true, verifiedRequiredMemberCount: capture.requiredMembers.length }, priorContract: { path: CONTRACT, sha256: sha(contractBytes) } },
  scopedRunner: { wrapper: 'scripts/run_combined_zones_scoped_release.mjs', authorization: AUTHORIZATION, releaseNodeId: 'SYS03-WEST-HIGH-FINITE-CONTAINMENT', packagePathsMustRemainUnder: 'data/buildops', defaultMode: 'PREPARE_ONLY', liveExecutionOptIn: '--execute', sourceRebindRule: 'Recompile from the fresh complete source capture used for release preparation; a historical capture-bound manifest is not executable evidence.' },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'SYS03-WEST-HIGH-CONTAINMENT-IMPLEMENTATION-TEAM',
    governorDelegatedRoles: { scopeOwner: 'West High containment lead', hydrologyOwner: 'West High water treatment lead', gravityOwner: 'West High gravity containment lead', safetyAndRecoveryOwner: 'SYS03 safety/recovery lead', releaseOperator: 'Guarded-release implementation operator' },
    purpose: 'Permanently seal the complete observed West High water/bubble component and lock every scoped gravity cell before any future civil-corridor work. The plug is a zero-discharge terminal, not a water diversion or public route.',
    waterTreatment: { kind: 'FULL_COMPONENT_PERMANENT_SEALED_PLUG', sourceComponent: exact(componentCells), traceBoundary: TRACE_BOUNDARY, boundaryContactCount: componentBoundary.length, sourceStateCensus: waterCensus, exteriorNonFluidHalo: exact(waterHalo), exteriorFluidHaloCount: 0, targetState: TARGET },
    receiverAndOverflow: { kind: 'ZERO_DISCHARGE_SEALED_MASS_TERMINAL', retainedOrReleasedFluidCells: 0, exactOutfallOrReceiverCells: 0, rationale: 'Every observed water/bubble cell is replaced by a solid cell; no open receiver, outfall, discharge, or unbounded fluid path is created.' },
    gravityTreatment: { kind: 'PERMANENT_FOUNDATION_LOCK', targets: exact(gravityCells), allCurrentTerminalsNonAirAndNonFluid: true, targetState: TARGET },
    operatedUnion: exact(operated), sourceEnvelope: { bounds: envelope, blockEntityCount: 0, savedEntityCount: 0 },
  },
  packages: stages.map(({ id, forward, rollback }) => ({ key: id, forward, rollback })),
  executionOrder: { forward: stages.map(({ id }) => id), rollback: stages.map(({ id }) => id).reverse(), rationale: 'Lock gravity first, close the finite component from low to high, then on rollback restore the sealed water volume before restoring gravity.' },
  operations: Object.fromEntries(stages.map((stage) => [stage.id, { forwardSha256: stage.sha256, rollbackSha256: stage.rollbackSha256, forwardCommandCount: stage.count, rollbackCommandCount: stage.count, exactInverse: true }])),
  maps: [{ id: 'SYS03-WEST-HIGH-FINITE-CONTAINMENT-Y47', path: rel(map), description: 'Source-state plan of the direct water/gravity frontier; not a rendered world screenshot.' }],
  functionalAcceptance: { classification: 'RESTRICTED_PERMANENT_FLUID_AND_GRAVITY_CONTAINMENT_ONLY', waterOrBubbleCellsRemainingInOperatedUnion: 0, uncontrolledDischargeCommissioned: false, civilCorridorCommissioned: false, railCommissioned: false, publicAccessCommissioned: false, passengerServiceCommissioned: false },
  hardStops: { requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true, requiresSourceRebindOfFull2525CellComponent: true, requiresExactSourceAndRollbackPreflights: true, requiresStrictNoopForwardAndRollbackParserChecks: true, requiresFreshBlockAndLiveEntityClearance: true, requiresJournaledExecutionAndFreshPostCapture: true, requiresIndependentPostQaForZeroFluidTargetsAndGravityLocks: true },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false, nonClaims: ['does not open or clear the held 6x6 civil corridor', 'does not commission rail, public access, service access, or passenger service', 'does not redirect water or create an outfall', 'does not authorize execution without a new fresh complete-source kernel'] },
};
const manifest = { ...base, manifestIdentity: sha(JSON.stringify(base)) };
const manifestPath = path.join(OUT, `${BASENAME}.release-manifest.json`);
fs.writeFileSync(abs(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, manifest: rel(manifestPath), stages: Object.fromEntries(stages.map(({ id, count }) => [id, count])), waterComponent: manifest.scope.waterTreatment.sourceComponent, gravityTargets: manifest.scope.gravityTreatment.targets, operatedUnion: manifest.scope.operatedUnion, operationFiles: stages.length * 2, executionAuthorized: false }, null, 2));
