#!/usr/bin/env node
/**
 * Compile the first finite MP02 B08 restricted chamber / dry receiver package.
 *
 * This compiler is source-bound and prepare-only.  Its output is deliberately
 * unusable for mutation until the separate projected functional QA, fresh live
 * source, exact clearances, and scoped guarded-release kernel all pass.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const option = (name, fallback = null) => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const ID = 'MP02-B08-RESTRICTED-CHAMBER-DRY-RECEIVER-01';
const NODE = 'CZ-MP02-B08-RESTRICTED-CHAMBER-DRY-RECEIVER';
const AUTH = 'docs/masterplans/02-subtropolis/mp02-b08-restricted-chamber-dry-receiver-governor-standing-execution-authorization.json';
const fail = (message) => { throw new Error(`${ID} rejected: ${message}`); };
const abs = (value) => path.resolve(ROOT, value); const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const cellsIn = ({ minX, maxX, minY, maxY, minZ, maxZ }) => { const cells = []; for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) for (let z = minZ; z <= maxZ; z += 1) cells.push({ x, y, z }); return cells; };
const exact = (cells, includeCells = false) => { const unique = uniqueCells(cells); return { cellCount: unique.length, bounds: unique.length ? boundsOf(unique) : null, coordinateSetSha256: hashCells(unique), ...(includeCells ? { cells: unique } : {}) }; };
const nameOf = (state) => state.split('[', 1)[0];
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:concrete_powder', 'minecraft:scaffolding']);
const PROTECTED = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block']);
const faceHalo = (cells) => uniqueCells(cells.flatMap(({ x, y, z }) => [[x + 1, y, z], [x - 1, y, z], [x, y + 1, z], [x, y - 1, z], [x, y, z + 1], [x, y, z - 1]].map(([nx, ny, nz]) => ({ x: nx, y: ny, z: nz }))));
const census = (records, key) => Object.fromEntries([...records.reduce((map, entry) => map.set(entry[key], (map.get(entry[key]) ?? 0) + 1), new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));

const snapshotArg = option('--snapshot'); const designArg = option('--design'); const outArg = option('--out-dir', 'data/buildops');
const basename = option('--basename', 'mp02-b08-restricted-chamber-dry-receiver-01'); const generatedAt = option('--generated-at', new Date().toISOString());
if (!snapshotArg || !designArg) fail('usage: --snapshot <complete-snapshot> --design <integrated-feasibility.json> [--out-dir <dir>]');
const SNAPSHOT = abs(snapshotArg); const DESIGN = abs(designArg); const OUT = abs(outArg);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) if (!fs.existsSync(path.join(SNAPSHOT, member))) fail(`incomplete snapshot; missing ${member}`);
if (!fs.existsSync(DESIGN)) fail('integrated feasibility input is missing');
const designBytes = fs.readFileSync(DESIGN); const design = JSON.parse(designBytes);
if (design.status !== 'FINITE_DESIGN_CANDIDATE__NO_OPERATION_UNTIL_ALL_ACCEPTANCE_INPUTS_ARE_BOUND' || abs(design.source?.snapshot ?? '') !== SNAPSHOT) fail('design is not an exact source-bound finite candidate');
if (design.mutationAuthority !== false || design.operationCounts?.forward !== 0 || design.operationCounts?.rollback !== 0) fail('feasibility input unexpectedly carries mutation authority');
const capturePath = path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'); const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
if (capture.immutableCopy !== true || !Array.isArray(capture.requiredMembers)) fail('complete immutable source binding missing');
for (const member of capture.requiredMembers) { const filename = path.join(SNAPSHOT, member.path); if (!fs.existsSync(filename) || fs.statSync(filename).size !== member.bytes || sha(fs.readFileSync(filename)) !== member.sha256) fail(`captured member drift: ${member.path}`); }

const chamberInterior = cellsIn({ minX: 2006, maxX: 2011, minY: 129, maxY: 133, minZ: -750, maxZ: -742 });
const chamberEnvelope = cellsIn({ minX: 2005, maxX: 2012, minY: 125, maxY: 134, minZ: -751, maxZ: -741 });
const eastBulkhead = cellsIn({ minX: 2012, maxX: 2012, minY: 129, maxY: 131, minZ: -750, maxZ: -746 });
const northBoundary = cellsIn({ minX: 2006, maxX: 2011, minY: 129, maxY: 135, minZ: -741, maxZ: -741 });
const doors = [
  { x: 2007, y: 129, z: -741, state: 'minecraft:iron_door[facing=north,half=lower,hinge=left,open=true,powered=false]' },
  { x: 2007, y: 130, z: -741, state: 'minecraft:iron_door[facing=north,half=upper,hinge=left,open=true,powered=false]' },
  { x: 2008, y: 129, z: -741, state: 'minecraft:iron_door[facing=north,half=lower,hinge=right,open=true,powered=false]' },
  { x: 2008, y: 130, z: -741, state: 'minecraft:iron_door[facing=north,half=upper,hinge=right,open=true,powered=false]' },
  { x: 2009, y: 129, z: -741, state: 'minecraft:iron_door[facing=north,half=lower,hinge=left,open=true,powered=false]' },
  { x: 2009, y: 130, z: -741, state: 'minecraft:iron_door[facing=north,half=upper,hinge=left,open=true,powered=false]' },
];
const shaftCollar = cellsIn({ minX: 2007, maxX: 2009, minY: 131, maxY: 206, minZ: -749, maxZ: -747 }).filter(({ x, z }) => !(x === 2008 && z === -748));
const shaftCollarKeys = new Set(shaftCollar.map(cellKey));
const roof = cellsIn({ minX: 2006, maxX: 2011, minY: 135, maxY: 135, minZ: -750, maxZ: -742 }).filter((cell) => !shaftCollarKeys.has(cellKey(cell)) && !(cell.x === 2008 && cell.z === -748));
const receiverCore = cellsIn({ minX: 2009, maxX: 2011, minY: 125, maxY: 127, minZ: -750, maxZ: -748 });
const receiverInlet = cellsIn({ minX: 2009, maxX: 2011, minY: 128, maxY: 128, minZ: -750, maxZ: -748 });
const receiverContainment = cellsIn({ minX: 2008, maxX: 2012, minY: 124, maxY: 128, minZ: -751, maxZ: -747 });
const coreKeys = new Set(receiverCore.map(cellKey)); const inletKeys = new Set(receiverInlet.map(cellKey));
const receiverOuter = receiverContainment.filter((cell) => !coreKeys.has(cellKey(cell)) && !inletKeys.has(cellKey(cell)));
const b03Aperture = cellsIn({ minX: 2049, maxX: 2049, minY: 130, maxY: 133, minZ: -750, maxZ: -746 });
const b09Cap = cellsIn({ minX: 2050, maxX: 2050, minY: 129, maxY: 132, minZ: -749, maxZ: -747 });
const b09Guideway = uniqueCells([...cellsIn({ minX: 2058, maxX: 2072, minY: 130, maxY: 130, minZ: -748, maxZ: -748 }), { x: 2057, y: 130, z: -748 }, { x: 2073, y: 130, z: -748 }, { x: 2061, y: 130, z: -747 }, { x: 2070, y: 130, z: -747 }]);
for (const [label, actual, expected] of [
  ['chamber envelope', exact(chamberEnvelope).coordinateSetSha256, design.finiteEnvelope?.constructionEnvelope?.coordinateSetSha256],
  ['shaft isolation collar', exact(shaftCollar).coordinateSetSha256, design.finiteEnvelope?.shaftIsolationCollar?.coordinateSetSha256],
  ['receiver containment', exact(receiverContainment).coordinateSetSha256, design.dryDrainageReceiver?.outerContainment?.coordinateSetSha256],
  ['B03 aperture', exact(b03Aperture).coordinateSetSha256, design.preservation?.b03Aperture?.coordinateSetSha256],
  ['B09 cap', exact(b09Cap).coordinateSetSha256, design.preservation?.b09IsolationCap?.coordinateSetSha256],
]) if (actual !== expected) fail(`${label} geometry drifted from feasibility input`);

const reader = new AnvilReader(path.join(SNAPSHOT, 'region')); const entityReader = new AnvilReader(path.join(SNAPSHOT, 'entities'));
const targetMaps = new Map();
const define = (key, cells, targetState) => { for (const cell of cells) { const mapKey = cellKey(cell); if (targetMaps.has(mapKey)) fail(`duplicate target ${mapKey}`); targetMaps.set(mapKey, { cell, targetState }); } };
define('eastBulkhead', eastBulkhead, 'minecraft:deepslate_tiles');
define('shaftCollar', shaftCollar, 'minecraft:deepslate_tiles');
define('northBoundary', northBoundary, 'minecraft:deepslate_tiles');
for (const entry of doors) { const existing = targetMaps.get(cellKey(entry)); if (!existing) fail(`door is not inside north boundary ${cellKey(entry)}`); targetMaps.set(cellKey(entry), { cell: { x: entry.x, y: entry.y, z: entry.z }, targetState: entry.state }); }
define('roof', roof, 'minecraft:deepslate_tiles');
define('receiverOuter', receiverOuter, 'minecraft:deepslate_tiles');
define('receiverCore', receiverCore, 'minecraft:air');
define('receiverInlet', receiverInlet, 'minecraft:iron_trapdoor[facing=north,half=bottom,open=false,powered=false,waterlogged=false]');
const targetRecords = [];
for (const entry of targetMaps.values()) targetRecords.push({ ...entry, sourceState: stateToCommandString(await reader.blockState(entry.cell.x, entry.cell.y, entry.cell.z)) });
if (targetRecords.some(({ sourceState }) => FLUID.has(nameOf(sourceState)) || GRAVITY.has(nameOf(sourceState)) || /waterlogged=true/.test(sourceState) || PROTECTED.has(nameOf(sourceState)))) fail('target contains fluid/gravity/waterlogged/protected state');
const targetKeys = new Set(targetRecords.map(({ cell }) => cellKey(cell)));
const halo = faceHalo(targetRecords.map(({ cell }) => cell)).filter((cell) => !targetKeys.has(cellKey(cell)));
const haloRecords = [];
for (const cell of halo) haloRecords.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
if (haloRecords.some(({ state }) => FLUID.has(nameOf(state)) || /waterlogged=true/.test(state))) fail('fluid/waterlogged target halo');
for (const { cell, state } of haloRecords.filter(({ state }) => GRAVITY.has(nameOf(state)))) {
  const belowKey = cellKey({ x: cell.x, y: cell.y - 1, z: cell.z }); const below = targetMaps.get(belowKey)?.targetState ?? stateToCommandString(await reader.blockState(cell.x, cell.y - 1, cell.z));
  if (below === 'minecraft:air') fail(`unsupported gravity halo at ${cellKey(cell)}`);
}
const apertureRecords = []; for (const cell of b03Aperture) apertureRecords.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
const capRecords = []; for (const cell of b09Cap) capRecords.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
const guidewayRecords = []; for (const cell of b09Guideway) guidewayRecords.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
if (!apertureRecords.every(({ state }) => state === 'minecraft:air') || !capRecords.every(({ state }) => state === 'minecraft:polished_diorite')) fail('B03/B09 preservation state drifted');
const allStudy = uniqueCells([...targetRecords.map(({ cell }) => cell), ...halo]); const studyKeys = new Set(allStudy.map(cellKey)); const savedBlockEntities = []; const savedEntities = [];
for (const pair of new Set(allStudy.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))) {
  const [x, z] = pair.split(',').map(Number); const blockChunk = await reader.chunk(x, z);
  for (const entity of blockChunk?.block_entities ?? blockChunk?.blockEntities ?? []) { const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) }; if (studyKeys.has(cellKey(cell))) savedBlockEntities.push({ id: entity.id ?? entity.Id ?? null, cell }); }
  const entityChunk = await entityReader.chunk(x, z);
  for (const entity of entityChunk?.Entities ?? []) { if (!Array.isArray(entity.Pos)) continue; const [xPos, yPos, zPos] = entity.Pos.map(Number); const cell = { x: Math.floor(xPos), y: Math.floor(yPos), z: Math.floor(zPos) }; if (studyKeys.has(cellKey(cell))) savedEntities.push({ id: entity.id ?? entity.Id ?? null, cell }); }
}
if (savedBlockEntities.length || savedEntities.length) fail('saved entity or block-entity in exact target/halo');

const ordered = (cells) => cells.map((cell) => targetRecords.find((entry) => cellKey(entry.cell) === cellKey(cell))).filter(Boolean).filter(({ sourceState, targetState }) => sourceState !== targetState).sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
const groupDefinitions = [
  ['receiver-outer-containment', receiverOuter],
  ['east-b03-isolation-bulkhead', eastBulkhead],
  ['shaft-overflow-fire-isolation-collar', shaftCollar],
  ['overhead-containment-roof', roof],
  ['north-fire-boundary-normal-open', northBoundary],
  ['receiver-core-excavation-after-containment', receiverCore],
  ['receiver-inlet-seals-last', receiverInlet],
];
const groups = groupDefinitions.map(([key, cells]) => ({ key, records: ordered(cells) }));
if (groups.some(({ records }) => records.length === 0)) fail(`an exact package is a strict no-op: ${groups.find(({ records }) => records.length === 0).key}`);
const groupTargetKeys = new Set(); for (const group of groups) for (const { cell } of group.records) { if (groupTargetKeys.has(cellKey(cell))) fail(`cross-package target collision ${cellKey(cell)}`); groupTargetKeys.add(cellKey(cell)); }
if (groupTargetKeys.size !== targetRecords.filter(({ sourceState, targetState }) => sourceState !== targetState).length) fail('target group coverage drift');

fs.mkdirSync(OUT, { recursive: true }); const packages = []; const operations = {};
for (const group of groups) {
  const forwardBody = `${group.records.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
  const rollbackBody = `${group.records.slice().reverse().map(({ cell, sourceState, targetState }) => replLine(cell, targetState, sourceState)).join('\n')}\n`;
  const forwardPath = path.join(OUT, `${basename}.${group.key}.forward.txt`); const rollbackPath = path.join(OUT, `${basename}.${group.key}.rollback.txt`);
  fs.writeFileSync(forwardPath, `# GENERATED ${ID} ${group.key} forward\n# source ${rel(SNAPSHOT)}\n${forwardBody}`);
  fs.writeFileSync(rollbackPath, `# GENERATED ${ID} ${group.key} rollback\n# source ${rel(SNAPSHOT)}\n${rollbackBody}`);
  packages.push({ key: group.key, forward: rel(forwardPath), rollback: rel(rollbackPath) });
  operations[group.key] = { forwardSha256: sha(forwardBody), rollbackSha256: sha(rollbackBody), forwardCommandCount: group.records.length, rollbackCommandCount: group.records.length, target: exact(group.records.map(({ cell }) => cell)), exactInverse: true };
}
const scope = {
  releaseId: ID, canonicalOwner: 'MP02-B08-RESTRICTED-SUBTROPOLIS-ACCESS',
  purpose: 'Construct a finite restricted chamber, dry zero-discharge contingency receiver, and controlled north boundary while preserving the existing shaft return and every B03/B09 boundary.',
  chamberInterior: exact(chamberInterior), constructionEnvelope: exact(chamberEnvelope), eastB03IsolationBulkhead: exact(eastBulkhead), northFireBoundary: exact(northBoundary), normalOpenDoorCells: exact(doors.map(({ x, y, z }) => ({ x, y, z }))), retainedShaftOpening: { x: 2008, y: 131, z: -748, requiredSourceState: 'minecraft:ladder[facing=west,waterlogged=false]' },
  dryReceiver: { outerContainment: exact(receiverOuter), core: exact(receiverCore), inletSeals: exact(receiverInlet), passiveOutfall: false, automaticFluidDischarge: false },
  preservedB03Aperture: exact(b03Aperture), preservedB09Cap: exact(b09Cap), preservedB09GuidewayAndControls: exact(b09Guideway),
  publicAccessCommissioned: false, emergencyEgressCommissioned: false, B03B09ConnectionCommissioned: false, railOrControlCommissioned: false,
};
const base = {
  schemaVersion: 1, transactionId: basename, generatedAtUtc: generatedAt, status: 'COMPILED_STATIC_FINITE_PACKAGE_AWAITING_PROJECTED_FUNCTIONAL_QA_AND_FRESH_GUARDED_KERNEL', releaseNodeId: NODE, mvpScope: true, scopeIds: ['MP02-A', 'B08-RESTRICTED-CHAMBER-DRY-RECEIVER'], packages,
  executionOrder: { forward: groups.map(({ key }) => key), rollback: groups.map(({ key }) => key).reverse(), rationale: 'Build the dry receiver outer shell before any core excavation; seal its inlet last. Close the east B03-side bulkhead, then the full shaft overflow/fire collar and roof, before the normal-open north fire boundary. Exact rollback reverses every state in reverse package order.' },
  scopedRunner: { wrapper: 'scripts/run_combined_zones_scoped_release.mjs', authorization: AUTH, releaseNodeId: NODE, packagePathsMustRemainUnder: 'data/buildops', defaultMode: 'PREPARE_ONLY', liveExecutionOptIn: '--execute', executionForbiddenUntil: ['projected-normal-and-single-return-failure-qa-pass', 'fresh-complete-source', 'fresh-live-entity-gate'] },
  source: { snapshotRoot: rel(SNAPSHOT), completeSaveCapture: { path: rel(capturePath), sha256: sha(captureBytes), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, immutableCopy: true }, designInput: { path: rel(DESIGN), sha256: sha(designBytes) } },
  scope, target: { operatedUnion: exact(groups.flatMap(({ records }) => records.map(({ cell }) => cell))), sourceStateCensus: census(groups.flatMap(({ records }) => records), 'sourceState'), desiredStateCensus: census(groups.flatMap(({ records }) => records), 'targetState'), targetHalo: exact(halo), packageTargetsDisjoint: true }, operations,
  staticClearance: { savedBlockEntities, savedEntities, sourceFluidOrGravityHazards: [], B03ApertureCurrentStates: census(apertureRecords, 'state'), B09CapCurrentStates: census(capRecords, 'state'), B09GuidewayCurrentStates: census(guidewayRecords, 'state'), B09GuidewayExactSourceStates: guidewayRecords },
  hardStops: { requiresProjectedNormalAndFailureRouteQa: true, requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true, requiresExactSourceAndRoutePreflight: true, requiresBlockAndLiveEntityClearance: true, requiresStrictNoopForwardAndRollbackParserChecks: true, requiresJournaledStrictExecution: true, requiresFreshPostAndRollbackPoststatePreflight: true, requiresIndependentPostReleaseQa: true },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false, nonClaims: ['No public lobby', 'No public or emergency egress commissioning', 'No B03/B09 opening', 'No B09 receiver, rail, guideway, or control action', 'No automatic fluid outfall or discharge'] },
};
const manifest = { ...base, manifestIdentity: sha(JSON.stringify(base)) }; const manifestPath = path.join(OUT, `${basename}.release-manifest.json`); fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, manifest: rel(manifestPath), groups: Object.fromEntries(groups.map(({ key, records }) => [key, records.length])), operatedCells: manifest.target.operatedUnion.cellCount, hazards: { fluidsOrGravity: 0, blockEntities: savedBlockEntities.length, savedEntities: savedEntities.length }, liveCallsPerformed: false, worldEditsPerformed: false }, null, 2));
