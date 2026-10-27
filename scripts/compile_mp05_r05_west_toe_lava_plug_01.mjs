#!/usr/bin/env node
/**
 * Source-bound, liner-first remediation of the observed R05 west-toe lava
 * seep. This compiler is offline only: it never captures or mutates Minecraft.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp05-b07-surface-receiver-descent-post-20260826T221000Z');
const OUT = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'mp05-r05-west-toe-lava-plug-01');
const GENERATED_AT = value('--generated-at', '2026-08-26T22:30:00.000Z');
const RELEASE_ID = 'MP05-R05-WEST-TOE-LAVA-PLUG-01';
const RELEASE_NODE_ID = 'CZ-MP05-R05-WEST-TOE-LAVA-PLUG';
const AUTHORIZATION = 'docs/masterplans/05-combined-zones/mp05-r05-west-toe-lava-plug-governor-standing-execution-authorization.json';
const TARGET = 'minecraft:deepslate_tiles';
const abs = (f) => path.resolve(ROOT, f);
const rel = (f) => path.relative(ROOT, abs(f)).replaceAll(path.sep, '/');
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`${RELEASE_ID} rejected: ${message}`); };
const exact = (cells) => { const set = uniqueCells(cells); return { cellCount: set.length, bounds: set.length ? boundsOf(set) : null, coordinateSetSha256: hashCells(set) }; };
const name = (state) => state.split('[', 1)[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(name(state));
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const isProtected = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw']);
const six = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const BOUNDARY = { minX: 1880, maxX: 2040, minY: -64, maxY: 180, minZ: -940, maxZ: -700 };
const inBoundary = (c) => c.x >= BOUNDARY.minX && c.x <= BOUNDARY.maxX && c.y >= BOUNDARY.minY && c.y <= BOUNDARY.maxY && c.z >= BOUNDARY.minZ && c.z <= BOUNDARY.maxZ;
const onBoundary = (c) => c.x === BOUNDARY.minX || c.x === BOUNDARY.maxX || c.y === BOUNDARY.minY || c.y === BOUNDARY.maxY || c.z === BOUNDARY.minZ || c.z === BOUNDARY.maxZ;
const census = (records, field) => Object.fromEntries([...records.reduce((m, row) => (m.set(row[field], (m.get(row[field]) ?? 0) + 1), m), new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));

const capturePath = abs(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
fail(fs.existsSync(capturePath), 'complete immutable source capture missing');
const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers), 'source is not an immutable complete capture');
for (const member of capture.requiredMembers) {
  const file = abs(path.join(SNAPSHOT, member.path));
  fail(fs.existsSync(file) && fs.statSync(file).size === member.bytes && sha(fs.readFileSync(file)) === member.sha256, `source member drifted: ${member.path}`);
}
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));

// The one observed source at this coordinate defines the only allowed trace.
const source = { x: 1961, y: 91, z: -815 };
fail((await stateAt(source)) === 'minecraft:lava[level=0]', 'expected west-toe lava source is absent or has drifted');
const queue = [source]; const seen = new Map([[cellKey(source), source]]);
for (let i = 0; i < queue.length; i += 1) {
  for (const [dx, dy, dz] of six) {
    const next = { x: queue[i].x + dx, y: queue[i].y + dy, z: queue[i].z + dz };
    if (!inBoundary(next) || seen.has(cellKey(next)) || name(await stateAt(next)) !== 'minecraft:lava') continue;
    seen.set(cellKey(next), next); queue.push(next);
  }
}
const cells = [...seen.values()]; const boundaryCells = cells.filter(onBoundary);
fail(cells.length === 36, `finite trace expected 36 lava cells, found ${cells.length}`);
fail(boundaryCells.length === 0, 'lava component reaches census boundary');
const records = [];
for (const cell of cells) records.push({ cell, sourceState: await stateAt(cell), targetState: TARGET });
fail(records.filter((r) => r.sourceState === 'minecraft:lava[level=0]').length === 1, 'component has not exactly one known source');
const targetKeys = new Set(cells.map(cellKey));
const halo = uniqueCells(cells.flatMap((cell) => six.map(([dx, dy, dz]) => ({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz })))).filter((cell) => !targetKeys.has(cellKey(cell)));
const haloRecords = await Promise.all(halo.map(async (cell) => ({ cell, state: await stateAt(cell) })));
fail(haloRecords.every(({ state }) => !isFluid(state)), 'finite lava component has a fluid-bearing halo connection');
fail(haloRecords.every(({ state }) => !isProtected.has(name(state))), 'protected core/container type found in target halo');
const envelope = boundsOf([...cells, ...halo]);
const chunks = new Set([...cells, ...halo].map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const blockEntities = []; const savedEntities = [];
for (const id of chunks) {
  const [cx, cz] = id.split(',').map(Number); const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (cell.x >= envelope.minX && cell.x <= envelope.maxX && cell.y >= envelope.minY && cell.y <= envelope.maxY && cell.z >= envelope.minZ && cell.z <= envelope.maxZ) blockEntities.push(cell);
  }
  const chunkEntities = await entityReader.chunk(cx, cz);
  for (const entity of chunkEntities?.Entities ?? []) {
    const p = entity.Pos?.slice(0, 3).map(Number);
    if (p?.length === 3 && p[0] >= envelope.minX && p[0] < envelope.maxX + 1 && p[1] >= envelope.minY && p[1] < envelope.maxY + 1 && p[2] >= envelope.minZ && p[2] < envelope.maxZ + 1) savedEntities.push({ id: entity.id ?? null, position: p });
  }
}
fail(blockEntities.length === 0 && savedEntities.length === 0, 'target/halo is not source-entity-clear');

// Close the low downstream tail first; remove the only level-0 source last.
const ordered = records.slice().sort((a, b) => a.cell.y - b.cell.y || a.cell.z - b.cell.z || a.cell.x - b.cell.x);
const forwardBody = `${ordered.map((r) => replLine(r.cell, r.sourceState, r.targetState)).join('\n')}\n`;
const rollbackBody = `${ordered.slice().reverse().map((r) => replLine(r.cell, r.targetState, r.sourceState)).join('\n')}\n`;
const forwardSha256 = sha(forwardBody); const rollbackSha256 = sha(rollbackBody);
const forward = path.join(OUT, `${BASENAME}.liner.forward.txt`); const rollback = path.join(OUT, `${BASENAME}.liner.rollback.txt`);
const header = (direction, digest) => `# GENERATED FILE - ${RELEASE_ID} (${direction})\n# source root: ${SNAPSHOT}\n# target coordinate-set SHA-256: ${hashCells(cells)}\n# operation SHA-256: ${digest}\n`;
fs.mkdirSync(abs(OUT), { recursive: true }); fs.writeFileSync(abs(forward), `${header('forward', forwardSha256)}${forwardBody}`); fs.writeFileSync(abs(rollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);
const mapPath = path.join(OUT, `${BASENAME}.section.svg`);
const targetSet = new Set(cells.map(cellKey)); const haloSet = new Set(halo.map(cellKey));
const unit = 25; const left = 80; const top = 70;
const mapCells = [];
for (let y = 92; y >= 75; y -= 1) for (let z = -825; z <= -814; z += 1) {
  const atX = [{ x: 1961, y, z }, { x: 1962, y, z }];
  const fill = atX.some((cell) => targetSet.has(cellKey(cell))) ? '#ef6c00' : atX.some((cell) => haloSet.has(cellKey(cell))) ? '#9e9e9e' : '#fafafa';
  const x = left + (z + 825) * unit; const py = top + (92 - y) * unit;
  mapCells.push(`<rect x="${x}" y="${py}" width="${unit}" height="${unit}" fill="${fill}" stroke="#d0d0d0"><title>z=${z}, y=${y}</title></rect>`);
}
const sourceX = left + (-815 + 825) * unit + unit / 2; const sourceY = top + (92 - 91) * unit + unit / 2;
fs.writeFileSync(abs(mapPath), `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="590" viewBox="0 0 760 590"><style>text{font-family:ui-monospace,monospace;fill:#17202a}.title{font-size:17px;font-weight:bold}</style><rect width="100%" height="100%" fill="white"/><text class="title" x="20" y="25">MP05 R05 west-toe finite lava plug — Y/Z section x=1961..1962</text><text x="20" y="45" font-size="11">orange = all 36 observed lava cells; grey = non-fluid interaction halo; red dot = one level-0 source, sealed last</text>${mapCells.join('')}<circle cx="${sourceX}" cy="${sourceY}" r="6" fill="#b71c1c"/><text x="370" y="100" font-size="12">Trace boundary: x=1880..2040, y=-64..180, z=-940..-700</text><text x="370" y="120" font-size="12">Boundary contact: 0 — finite component</text><text x="370" y="140" font-size="12">Forward: tail (low Y) → source (high Y)</text><text x="370" y="160" font-size="12">Rollback: exact reverse</text></svg>`);
const base = {
  schemaVersion: 1, transactionId: BASENAME, generatedAtUtc: GENERATED_AT, status: 'COMPILED_FINITE_LAVA_PLUG_AWAITING_FRESH_EXECUTION_KERNEL', releaseNodeId: RELEASE_NODE_ID, mvpScope: true, scopeIds: ['MP05-A', 'R05-MOUNTAIN', 'R05-WEST-TOE-LAVA-CONTAINMENT'],
  packages: [{ key: 'flow-ordered-lava-liner', forward: rel(forward), rollback: rel(rollback) }], executionOrder: { forward: ['flow-ordered-lava-liner'], rollback: ['flow-ordered-lava-liner'] },
  scopedRunner: { wrapper: 'scripts/run_combined_zones_scoped_release.mjs', authorization: AUTHORIZATION, releaseNodeId: RELEASE_NODE_ID, packagePathsMustRemainUnder: 'data/buildops', defaultMode: 'PREPARE_ONLY', liveExecutionOptIn: '--execute' },
  source: { snapshotRoot: SNAPSHOT, completeSaveCapture: { path: rel(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')), sha256: sha(captureBytes), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, immutableCopy: capture.immutableCopy, verifiedRequiredMemberCount: capture.requiredMembers.length } },
  scope: { releaseId: RELEASE_ID, canonicalOwner: 'MP05-R05-MOUNTAIN-CONTAINMENT', governorDelegatedRoles: { scopeOwner: 'R05 mountain containment lead', hydrologyOwner: 'R05 lava containment lead', safetyAndRecoveryOwner: 'R05 safety/recovery lead', releaseOperator: 'Guarded-release implementation operator' }, purpose: 'Permanently plug the one fully observed, finite west-toe lava seep inside the R05 mountain footprint. The downstream tail is lined before its source is sealed.', linerCells: exact(cells), interactionHalo: exact(halo), fluidComponent: exact(cells), componentTraceBoundary: BOUNDARY, componentBoundaryContactCount: boundaryCells.length, sourceStateCensus: census(records, 'sourceState'), targetState: TARGET, routeOrAccessCommissioned: false },
  target: { operatedUnion: exact(cells), sourceStateCensus: census(records, 'sourceState'), desiredStateCensus: census(records, 'targetState'), packageTargetsDisjoint: true },
  operations: { 'flow-ordered-lava-liner': { forwardSha256, rollbackSha256, forwardCommandCount: ordered.length, rollbackCommandCount: ordered.length, targetCoordinateSetSha256: hashCells(cells), exactInverse: true, flowOrder: 'downstream low-Y tail to upstream level-0 source; exact reverse rollback' } },
  isolation: { finiteSixConnectedLavaComponent: true, componentBoundaryContactCount: boundaryCells.length, sourceBlockEntityCount: blockEntities.length, sourceSavedEntityCount: savedEntities.length, fluidBearingHaloCount: haloRecords.filter(({ state }) => isFluid(state)).length },
  hardStops: { requireFreshImmutableSourceImmediatelyBeforeExecution: true, requireExactSourceGuards: true, requireLiveEntityClearance: true, requireBlockEntityAndProtectedCoreClearance: true, requireStrictNoopForwardAndRollbackParserChecks: true, requireJournaledStrictExecution: true, requireFreshPostSnapshotAndRollbackPoststatePreflight: true, requireReleaseSpecificPostQa: true },
  maps: [{ id: 'R05-WEST-TOE-LAVA-YZ-SECTION', path: rel(mapPath), description: 'Observed finite lava component and non-fluid halo; x=1961..1962 overlay.' }],
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false, nonClaims: ['does not extend R05 mountain geometry', 'does not excavate or open a route', 'does not alter water, terrain, or an unobserved fluid component'] },
};
const manifest = { ...base, manifestIdentity: sha(JSON.stringify(base)) }; const manifestPath = path.join(OUT, `${BASENAME}.release-manifest.json`); fs.writeFileSync(abs(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, manifest: rel(manifestPath), targetCount: cells.length, componentBoundaryContactCount: boundaryCells.length, sourceLavaStates: manifest.target.sourceStateCensus }, null, 2));
