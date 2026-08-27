#!/usr/bin/env node
/** Compile a second, west-end crew cross-return around the Ravensreach passive-rail termini. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const arg = (name, fallback) => { const index = process.argv.indexOf(name); return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback; };
const SNAPSHOT = arg('--snapshot', 'data/worldsnap-cobalt-rr-crew-recovery-niche-post-20260826T225000Z');
const OUT = arg('--out-dir', 'data/buildops');
const BASE = arg('--basename', 'cobalt-rr-west-crew-cross-return-01');
const STAMP = arg('--generated-at', '2026-08-26T23:15:00.000Z');
const ID = 'COBALT-RR-WEST-CREW-CROSS-RETURN-01';
const NODE = 'CZ-SYS03-COBALT-RR-WEST-CREW-CROSS-RETURN';
const AUTH = 'docs/masterplans/05-combined-zones/sys03-cobalt-rr-west-crew-cross-return-governor-standing-execution-authorization.json';
const AIR = 'minecraft:air'; const PD = 'minecraft:polished_deepslate'; const PA = 'minecraft:polished_andesite'; const RAIL = 'minecraft:rail[shape=east_west,waterlogged=false]';
const abs = (value) => path.resolve(ROOT, value); const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/'); const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (value, message) => { if (!value) throw new Error(`${ID} compiler rejected: ${message}`); };
const base = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(base(state)) || state.includes('waterlogged=true');
const protectedBlocks = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block']);
const box = ({ minX, maxX, minY, maxY, minZ, maxZ }) => { const cells = []; for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) for (let z = minZ; z <= maxZ; z++) cells.push({ x, y, z }); return cells; };
const exact = (cells) => { const unique = uniqueCells(cells); return { cellCount: unique.length, bounds: unique.length ? boundsOf(unique) : null, coordinateSetSha256: hashCells(unique) }; };
const census = (records, field) => Object.fromEntries([...records.reduce((counts, record) => { counts.set(record[field], (counts.get(record[field]) ?? 0) + 1); return counts; }, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)));

const capturePath = abs(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')); const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.requiredMembers?.length > 0, 'complete immutable source missing');
for (const member of capture.requiredMembers) { const filename = abs(path.join(SNAPSHOT, member.path)); fail(fs.existsSync(filename) && fs.statSync(filename).size === member.bytes && sha(fs.readFileSync(filename)) === member.sha256, `source drift ${member.path}`); }
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region'))); const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));

// This runs one cell west of both rail termini. It is the independent counterpart
// to the existing east return bridge: wall first, then a seven-cell floor/clear
// passage which links both crew platforms without rail-walking or rail crossing.
const deck = box({ minX: -182, maxX: -182, minY: 13, maxY: 13, minZ: -384, maxZ: -378 });
const clear = box({ minX: -182, maxX: -182, minY: 14, maxY: 16, minZ: -384, maxZ: -378 });
const outerWall = box({ minX: -183, maxX: -183, minY: 13, maxY: 16, minZ: -384, maxZ: -378 });
const northRail = box({ minX: -181, maxX: -164, minY: 13, maxY: 13, minZ: -386, maxZ: -386 });
const southRail = box({ minX: -181, maxX: -164, minY: 13, maxY: 13, minZ: -380, maxZ: -380 });
const eastBridge = box({ minX: -163, maxX: -163, minY: 13, maxY: 16, minZ: -384, maxZ: -378 });
const interaction = uniqueCells([...deck, ...clear, ...outerWall, ...northRail, ...southRail, ...eastBridge]);
const records = []; const seen = new Set();
for (const [cells, targetState, group] of [[outerWall, PD, 'containment'], [deck, PA, 'cross-return'], [clear, AIR, 'cross-return']]) for (const cell of cells) {
  const key = cellKey(cell); fail(!seen.has(key), `duplicate target ${key}`); seen.add(key);
  const sourceState = await stateAt(cell); fail(!fluid(sourceState) && !protectedBlocks.has(base(sourceState)), `unsafe source ${key} ${sourceState}`);
  if (sourceState !== targetState) records.push({ cell, sourceState, targetState, group });
}
for (const cell of [...northRail, ...southRail]) fail(await stateAt(cell) === RAIL, `retained rail drift ${cellKey(cell)}`);
for (const cell of eastBridge) fail(['minecraft:polished_andesite', 'minecraft:polished_deepslate', 'minecraft:air', 'minecraft:sea_lantern'].includes(await stateAt(cell)), `east return predecessor drift ${cellKey(cell)}`);
const halo = uniqueCells(interaction.flatMap(({ x, y, z }) => [{ x: x + 1, y, z }, { x: x - 1, y, z }, { x, y: y + 1, z }, { x, y: y - 1, z }, { x, y, z: z + 1 }, { x, y, z: z - 1 }]));
for (const cell of halo) { const state = await stateAt(cell); fail(!fluid(state) && !protectedBlocks.has(base(state)), `unsafe interaction halo ${cellKey(cell)} ${state}`); }

const groups = ['containment', 'cross-return']; const packages = []; const operations = {}; fs.mkdirSync(abs(OUT), { recursive: true });
for (const group of groups) {
  const ordered = records.filter((record) => record.group === group).sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x || left.cell.z - right.cell.z);
  const forwardBody = `${ordered.map((record) => replLine(record.cell, record.sourceState, record.targetState)).join('\n')}\n`;
  const rollbackBody = `${ordered.slice().reverse().map((record) => replLine(record.cell, record.targetState, record.sourceState)).join('\n')}\n`;
  const forward = path.join(OUT, `${BASE}.${group}.forward.txt`); const rollback = path.join(OUT, `${BASE}.${group}.rollback.txt`);
  const header = (direction, hash) => `# GENERATED FILE - ${ID} (${group} ${direction})\n# source root: ${SNAPSHOT}\n# target coordinate-set SHA-256: ${hashCells(ordered.map((record) => record.cell))}\n# operation SHA-256: ${hash}`;
  fs.writeFileSync(abs(forward), `${header('forward', sha(forwardBody))}\n${forwardBody}`); fs.writeFileSync(abs(rollback), `${header('rollback', sha(rollbackBody))}\n${rollbackBody}`);
  packages.push({ key: group, forward: rel(forward), rollback: rel(rollback) }); operations[group] = { forwardSha256: sha(forwardBody), rollbackSha256: sha(rollbackBody), forwardCommandCount: ordered.length, rollbackCommandCount: ordered.length, targetCellCount: ordered.length, targetCoordinateSetSha256: hashCells(ordered.map((record) => record.cell)), exactInverse: true };
}
const core = { schemaVersion: 1, transactionId: BASE, generatedAtUtc: STAMP, status: 'COMPILED_FROM_COMPLETE_POSTSOURCE_AWAITING_FRESH_EXECUTION_KERNEL', releaseNodeId: NODE, mvpScope: false, scopeIds: ['SYS-03', 'PASSENGER-RAILWAY'], packages, executionOrder: { forward: groups, rollback: [...groups].reverse(), rationale: 'Build the outer containment wall before opening the clear cross-return. Exact inverse restores the clear passage before the west wall.' }, scopedRunner: { wrapper: 'scripts/run_combined_zones_scoped_release.mjs', authorization: AUTH, releaseNodeId: NODE, packagePathsMustRemainUnder: 'data/buildops', defaultMode: 'PREPARE_ONLY', liveExecutionOptIn: '--execute' }, source: { snapshotRoot: SNAPSHOT, completeSaveCapture: { path: rel(capturePath), sha256: sha(captureBytes), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, immutableCopy: true, verifiedRequiredMemberCount: capture.requiredMembers.length } }, scope: { releaseId: ID, canonicalOwner: 'PASSENGER-RAILWAY', governorDelegatedRoles: { scopeOwner: 'Passenger Railway implementation lead', counterpartOwner: 'Ravensreach civic interface lead', safetyAndRecoveryOwner: 'Passenger Railway safety/recovery lead', releaseOperator: 'Guarded-release implementation operator' }, purpose: 'Create the west-end counterpart to the east crew return: a supported, walled cross-return around both passive-rail termini, allowing crew circulation between the north and south platforms without rail-walking.', westCrossReturnDeck: exact(deck), westCrossReturnClear: exact(clear), westOuterSafetyWall: exact(outerWall), retainedDirectionalRails: exact([...northRail, ...southRail]), retainedEastReturnBridge: exact(eastBridge), independentCrewCrossReturns: 2, crewCirculationConnectedWithoutRailCrossing: true, railPowerCommissioned: false, signalCommissioned: false, publicPlatformCommissioned: false, passengerServiceCommissioned: false }, target: { operatedUnion: exact(records.map((record) => record.cell)), sourceStateCensus: census(records, 'sourceState'), desiredStateCensus: census(records, 'targetState'), packageTargetsDisjoint: true }, operations, hardStops: { requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true, requiresSourceToReproveBothCrewPlatformsAndRetainedRails: true, requiresBlockEntityAndLiveEntityClearance: true, requiresStrictNoopForwardAndRollbackChecks: true, requiresExactSourcePreflight: true, requiresJournaledStrictExecution: true, requiresFreshPostSnapshotAndRollbackPoststatePreflight: true, requiresFunctionalControlledAccessQa: true }, safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false, noExternalSignaturesRequired: true, forbiddenClaims: ['public route', 'passenger boarding', 'passenger rail operation', 'vehicle trial', 'power or signal operation'] } };
const manifest = { ...core, manifestIdentity: sha(JSON.stringify(core)) }; const manifestPath = path.join(OUT, `${BASE}.release-manifest.json`); fs.writeFileSync(abs(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, manifest: rel(manifestPath), operations: Object.fromEntries(groups.map((group) => [group, operations[group].targetCellCount])), retainedDirectionalRails: manifest.scope.retainedDirectionalRails.cellCount, liveCallsPerformed: false, worldEditsPerformed: false }, null, 2));
