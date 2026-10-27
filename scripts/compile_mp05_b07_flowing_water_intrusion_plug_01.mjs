#!/usr/bin/env node
/**
 * Compile the first B07 water-containment correction under the Governor's
 * acceleration directive.  This does not excavate, open, or commission B07:
 * it converts the five flowing-water cells already *inside* B07-C-WEST-2 into
 * permanent deepslate-tile liner.  The unbounded exterior water body is
 * deliberately retained outside this exact plug.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  replLine,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp06-endpoint-elevated-crossing-post-20260826T143902Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'mp05-b07-flowing-water-intrusion-plug-01');
const GENERATED_AT = value('--generated-at', '2026-08-26T20:00:00.000Z');
const RELEASE_ID = 'MP05-B07-FLOWING-WATER-INTRUSION-PLUG-01';
const RELEASE_NODE_ID = 'CZ-MP05-B07-FLOWING-WATER-INTRUSION-PLUG';
const AUTHORIZATION = 'docs/masterplans/05-combined-zones/mp05-b07-flowing-water-intrusion-plug-governor-standing-execution-authorization.json';
const TARGET = 'minecraft:deepslate_tiles';
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`${RELEASE_ID} compiler rejected: ${message}`);
};
const exact = (cells) => {
  const set = uniqueCells(cells);
  return { cellCount: set.length, bounds: set.length ? boundsOf(set) : null, coordinateSetSha256: hashCells(set) };
};
const block = (state) => state.split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(block(state)) || state.includes('waterlogged=true');
const forbidden = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
]);
const census = (records, field) => Object.fromEntries([...records.reduce((counts, record) => {
  const state = record[field];
  counts.set(state, (counts.get(state) ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));

// This is the exact five-cell B07-C-WEST-2 construction-fluid component from
// the 2026-08-26 complete source.  Its exterior neighbours are not a target.
const FLOWING_INTRUSION = [
  { x: 2110, y: 5, z: -396, source: 'minecraft:water[level=1]' },
  { x: 2111, y: 5, z: -396, source: 'minecraft:water[level=2]' },
  { x: 2110, y: 5, z: -395, source: 'minecraft:water[level=8]' },
  { x: 2111, y: 5, z: -395, source: 'minecraft:water[level=1]' },
  { x: 2110, y: 6, z: -395, source: 'minecraft:water[level=1]' },
];
const six = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const capturePath = abs(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
fail(fs.existsSync(capturePath), 'complete immutable source capture is missing');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers) && capture.requiredMembers.length > 0,
  'source is not a declared complete immutable capture');
for (const member of capture.requiredMembers) {
  const memberPath = abs(path.join(SNAPSHOT, member.path));
  fail(fs.existsSync(memberPath) && fs.statSync(memberPath).size === member.bytes
    && sha256(fs.readFileSync(memberPath)) === member.sha256, `source member drifted: ${member.path}`);
}

const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
const records = [];
for (const target of FLOWING_INTRUSION) {
  const observed = stateToCommandString(await reader.blockState(target.x, target.y, target.z));
  fail(observed === target.source, `canonical flowing-water state drifted at ${cellKey(target)} (${observed})`);
  records.push({ cell: { x: target.x, y: target.y, z: target.z }, sourceState: observed, targetState: TARGET });
}
const targetKeys = new Set(records.map(({ cell }) => cellKey(cell)));
const halo = uniqueCells(records.flatMap(({ cell }) => six.map(([dx, dy, dz]) => ({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz }))))
  .filter((cell) => !targetKeys.has(cellKey(cell)));
const haloRecords = [];
for (const cell of halo) haloRecords.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
fail(haloRecords.every(({ state }) => !forbidden.has(block(state))), 'plug interaction halo contains a protected block entity type');
const retainedExteriorFluid = haloRecords.filter(({ state }) => isFluid(state));
fail(retainedExteriorFluid.length > 0, 'no retained exterior fluid proves this is an actual liner/plug boundary');

const chunks = new Set(halo.concat(records.map(({ cell }) => cell)).map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const envelope = boundsOf(halo.concat(records.map(({ cell }) => cell)));
const blockEntities = [];
const savedEntities = [];
for (const chunkKey of chunks) {
  const [cx, cz] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (cell.x >= envelope.minX && cell.x <= envelope.maxX && cell.y >= envelope.minY && cell.y <= envelope.maxY && cell.z >= envelope.minZ && cell.z <= envelope.maxZ) blockEntities.push(cell);
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    const p = entity.Pos?.slice(0, 3).map(Number);
    if (p?.length === 3 && p[0] >= envelope.minX && p[0] < envelope.maxX + 1 && p[1] >= envelope.minY && p[1] < envelope.maxY + 1 && p[2] >= envelope.minZ && p[2] < envelope.maxZ + 1) savedEntities.push({ id: entity.id ?? null, position: p });
  }
}
fail(blockEntities.length === 0 && savedEntities.length === 0, 'plug target/interaction envelope is not entity-clear on source');

// Forward begins at the upper feed-facing cell then seals the lower cells; the
// rollback is exactly reverse and restores canonical states only after the
// solid liner has been removed in a controlled, finite target sequence.
const ordered = records.slice().sort((a, b) => b.cell.y - a.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
const forwardBody = `${ordered.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
const rollbackBody = `${ordered.slice().reverse().map(({ cell, sourceState, targetState }) => replLine(cell, targetState, sourceState)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forward = path.join(OUT_DIR, `${BASENAME}.liner.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.liner.rollback.txt`);
const header = (direction, hash) => [
  `# GENERATED FILE - ${RELEASE_ID} (${direction})`, `# source root: ${SNAPSHOT}`,
  `# target coordinate-set SHA-256: ${hashCells(records.map(({ cell }) => cell))}`, `# operation SHA-256: ${hash}`,
].join('\n');
fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.writeFileSync(abs(forward), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(abs(rollback), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);

const manifestBase = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_COMPLETE_HISTORICAL_SOURCE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['MP05-A', 'SYS-02', 'B07-FLOWING-WATER-CONTAINMENT'],
  packages: [{ key: 'flowing-water-intrusion-liner', forward: rel(forward), rollback: rel(rollback) }],
  executionOrder: { forward: ['flowing-water-intrusion-liner'], rollback: ['flowing-water-intrusion-liner'] },
  scopedRunner: { wrapper: 'scripts/run_combined_zones_scoped_release.mjs', authorization: AUTHORIZATION, releaseNodeId: RELEASE_NODE_ID, packagePathsMustRemainUnder: 'data/buildops', defaultMode: 'PREPARE_ONLY', liveExecutionOptIn: '--execute' },
  source: { snapshotRoot: SNAPSHOT, completeSaveCapture: { path: rel(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')), sha256: sha256(captureBytes), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, immutableCopy: capture.immutableCopy, verifiedRequiredMemberCount: capture.requiredMembers.length } },
  scope: {
    releaseId: RELEASE_ID, canonicalOwner: 'MP05-B07-CONTAINMENT',
    governorDelegatedRoles: { scopeOwner: 'B07 containment implementation lead', hydrologyOwner: 'B07 hydrology and liner lead', safetyAndRecoveryOwner: 'B07 safety/recovery lead', releaseOperator: 'Guarded-release implementation operator' },
    purpose: 'Permanently line the five flowing-water cells already inside the B07-C-WEST-2 construction reservation. It removes this local intrusion while retaining the external water component outside the exact solid plug.',
    containedRouteCommissioned: false, exteriorOpeningCommissioned: false, publicOrStaffAccessCommissioned: false,
    linerCells: exact(records.map(({ cell }) => cell)), interactionHalo: exact(halo), retainedExteriorFluid: exact(retainedExteriorFluid.map(({ cell }) => cell)),
    sourceFluidStates: census(records, 'sourceState'), targetState: TARGET,
  },
  target: { operatedUnion: exact(records.map(({ cell }) => cell)), sourceStateCensus: census(records, 'sourceState'), desiredStateCensus: census(records, 'targetState'), packageTargetsDisjoint: true },
  operations: { 'flowing-water-intrusion-liner': { forwardSha256, rollbackSha256, forwardCommandCount: ordered.length, rollbackCommandCount: ordered.length, targetCoordinateSetSha256: hashCells(records.map(({ cell }) => cell)), exactInverse: true, flowOrder: 'upper-feed-facing-to-lower; exact reverse rollback' } },
  isolation: { retainedUnboundedExteriorFluidUntouched: true, targetFluidCount: records.length, retainedExteriorFluidHaloCount: retainedExteriorFluid.length, sourceBlockEntityCount: blockEntities.length, sourceSavedEntityCount: savedEntities.length },
  hardStops: { requireFreshImmutableSourceImmediatelyBeforeExecution: true, requireExactSourceGuards: true, requireLiveEntityClearance: true, requireBlockEntityAndProtectedCoreClearance: true, requireStrictNoopForwardAndRollbackParserChecks: true, requireJournaledStrictExecution: true, requireFreshPostSnapshotAndRollbackPoststatePreflight: true, requireReleaseSpecificPostQa: true },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false, nonClaims: ['does not excavate B07', 'does not open the headhouse', 'does not commission a route, egress, or SYS-02 connection', 'does not mutate the retained exterior water component'] },
};
const manifest = { ...manifestBase, manifestIdentity: sha256(JSON.stringify(manifestBase)) };
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
fs.writeFileSync(abs(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: manifest.status, manifest: rel(manifestPath), manifestIdentity: manifest.manifestIdentity, targetCount: records.length, retainedExteriorFluidHaloCount: retainedExteriorFluid.length }, null, 2)}\n`);
