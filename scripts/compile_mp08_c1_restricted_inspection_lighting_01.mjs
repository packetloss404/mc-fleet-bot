#!/usr/bin/env node
/** Offline-only fixed lighting for the sealed MP08 C1 restricted corridor. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, boundsOf, hashCells, replLine, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const SNAPSHOT = value('--snapshot', 'data/worldsnap-cobalt-wl-controlled-rail-inspection-transfer-post-20260826T233000Z');
const OUT = value('--out-dir', 'data/buildops');
const BASE = value('--basename', 'mp08-c1-restricted-inspection-lighting-01');
const RELEASE_NODE = 'MP08-C1-RESTRICTED-INSPECTION-LIGHTING';
const AUTHORIZATION = 'docs/masterplans/08-raven-rock/mp08-c1-restricted-inspection-lighting-governor-standing-execution-authorization.json';
const abs = (file) => path.resolve(ROOT, file);
const rel = (file) => path.relative(ROOT, abs(file)).split(path.sep).join('/');
const sha = (input) => crypto.createHash('sha256').update(input).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`MP08 C1 lighting rejected: ${message}`); };
const box = (b) => { const cells = []; for (let x = b.minX; x <= b.maxX; x += 1) for (let y = b.minY; y <= b.maxY; y += 1) for (let z = b.minZ; z <= b.maxZ; z += 1) cells.push({ x, y, z }); return cells; };
const cellKey = ({ x, y, z }) => `${x},${y},${z}`;
const isFluid = (state) => /^(minecraft:(water|lava|bubble_column))/.test(state) || state.includes('waterlogged=true');
const isGravity = (state) => /minecraft:(gravel|sand|red_sand|suspicious_sand|suspicious_gravel|anvil|chipped_anvil|damaged_anvil|pointed_dripstone)/.test(state) || state.includes('_concrete_powder');

const capturePath = path.join(abs(SNAPSHOT), 'combined-zones-complete-save-capture.json');
fail(fs.existsSync(capturePath), 'complete immutable source capture missing');
const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers), 'source is not an immutable complete capture');
for (const member of capture.requiredMembers) {
  const file = path.join(abs(SNAPSHOT), member.path); const bytes = fs.existsSync(file) ? fs.readFileSync(file) : null;
  fail(bytes && bytes.length === member.bytes && sha(bytes) === member.sha256, `source member drifted: ${member.path}`);
}
const reader = new AnvilReader(path.join(abs(SNAPSHOT), 'region'));
const entityReader = new AnvilReader(path.join(abs(SNAPSHOT), 'entities'));
const state = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));

// Alternating inner-wall fixtures: full cubes outside the x=-1..1 walk lane.
const targets = [16, 24, 32, 40, 48, 56, 64, 72].map((z, index) => ({ x: index % 2 ? -2 : 2, y: -9, z }));
const targetStates = await Promise.all(targets.map(state));
fail(targetStates.every((entry) => entry === 'minecraft:polished_deepslate'), 'fixture target is not retained polished-deepslate wall fabric');
const clearRoute = box({ minX: -1, maxX: 1, minY: -11, maxY: -8, minZ: 12, maxZ: 73 });
const targetKeys = new Set(targets.map(cellKey));
fail(clearRoute.every((cell) => !targetKeys.has(cellKey(cell))), 'fixture intersects retained three-wide clearance');
const halo = [...new Map(targets.flatMap((cell) => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
  .map(([dx, dy, dz]) => ({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz }))).map((cell) => [cellKey(cell), cell])).values()]
  .filter((cell) => !targetKeys.has(cellKey(cell)));
const haloStates = await Promise.all(halo.map(state));
fail(haloStates.every((entry) => !isFluid(entry) && !isGravity(entry)), 'fixture interaction halo has fluid or gravity hazard');
const envelope = boundsOf([...targets, ...halo]);
const chunks = new Set([...targets, ...halo].map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const blockEntities = []; const savedEntities = [];
for (const chunkId of chunks) {
  const [x, z] = chunkId.split(',').map(Number); const chunk = await reader.chunk(x, z); const entities = await entityReader.chunk(x, z);
  for (const entry of chunk?.block_entities ?? chunk?.blockEntities ?? []) if (entry.x >= envelope.minX && entry.x <= envelope.maxX && entry.y >= envelope.minY && entry.y <= envelope.maxY && entry.z >= envelope.minZ && entry.z <= envelope.maxZ) blockEntities.push(entry);
  for (const entry of entities?.Entities ?? []) { const p = entry.Pos?.slice(0, 3).map(Number); if (p?.length === 3 && p[0] >= envelope.minX && p[0] <= envelope.maxX && p[1] >= envelope.minY && p[1] <= envelope.maxY && p[2] >= envelope.minZ && p[2] <= envelope.maxZ) savedEntities.push(entry); }
}
fail(blockEntities.length === 0 && savedEntities.length === 0, 'fixture target/halo contains a block entity or saved entity');
const desired = 'minecraft:sea_lantern';
const forwardBody = `${targets.map((cell, index) => replLine(cell, targetStates[index], desired)).join('\n')}\n`;
const rollbackBody = `${targets.slice().reverse().map((cell, reverseIndex) => replLine(cell, desired, targetStates[targets.length - 1 - reverseIndex])).join('\n')}\n`;
const forward = path.join(OUT, `${BASE}.forward.txt`); const rollback = path.join(OUT, `${BASE}.rollback.txt`);
fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(abs(forward), `# GENERATED OFFLINE — MP08 C1 restricted inspection lighting forward\n${forwardBody}`);
fs.writeFileSync(abs(rollback), `# GENERATED OFFLINE — MP08 C1 restricted inspection lighting rollback\n${rollbackBody}`);
const base = {
  schemaVersion: 1, transactionId: BASE, status: 'COMPILED_OFFLINE_AWAITING_FRESH_GUARDED_RELEASE_KERNEL', releaseNodeId: RELEASE_NODE, mvpScope: false, scopeIds: ['MP08-A', 'SYS-02'],
  source: { snapshotRoot: SNAPSHOT, captureManifest: rel(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')), captureManifestSha256: sha(captureBytes), immutableMemberCount: capture.requiredMembers.length },
  scope: { releaseId: 'MP08-C1-RESTRICTED-INSPECTION-LIGHTING-01', canonicalOwner: 'MP08-RAVEN-ROCK-IMPLEMENTATION-TEAM', governorDelegatedRoles: { scopeOwner: 'Raven Rock containment implementation lead', counterpartOwner: 'Cavern A/Cavern B containment counterpart', safetyAndRecoveryOwner: 'PassageWay safety and recovery lead', releaseOperator: 'Guarded-release implementation operator' }, purpose: 'Add static, non-powered wayfinding light to the already sealed C1 restricted inspection corridor without changing its three-wide clear route or either closed vestibule.', fixtures: { cellCount: targets.length, bounds: boundsOf(targets), coordinateSetSha256: hashCells(targets), desiredState: desired }, retainedThreeWideClearance: { cellCount: clearRoute.length, bounds: boundsOf(clearRoute), modified: false }, excluded: ['C2', 'Cavern C', 'RR-N6', 'T4', 'water displacement', 'fluid outfall', 'public access', 'emergency egress', 'transport', 'rail power', 'signals'] },
  target: { operatedUnion: { cellCount: targets.length, bounds: boundsOf(targets), coordinateSetSha256: hashCells(targets) }, sourceStateCensus: { 'minecraft:polished_deepslate': targets.length }, desiredStateCensus: { [desired]: targets.length }, packageTargetsDisjoint: true },
  packages: [{ key: 'static-wall-lighting', forward: rel(forward), rollback: rel(rollback) }], executionOrder: { forward: ['static-wall-lighting'], rollback: ['static-wall-lighting'] }, scopedRunner: { wrapper: 'scripts/run_combined_zones_scoped_release.mjs', authorization: AUTHORIZATION, releaseNodeId: RELEASE_NODE, defaultMode: 'PREPARE_ONLY', liveExecutionOptIn: '--execute' },
  operations: { 'static-wall-lighting': { forwardSha256: sha(forwardBody), rollbackSha256: sha(rollbackBody), forwardCommandCount: targets.length, rollbackCommandCount: targets.length, exactInverse: true } },
  isolation: { interactionHalo: { cellCount: halo.length, bounds: boundsOf(halo), coordinateSetSha256: hashCells(halo) }, fluidOrWaterloggedHaloCount: haloStates.filter(isFluid).length, gravityHaloCount: haloStates.filter(isGravity).length, blockEntityCount: blockEntities.length, savedEntityCount: savedEntities.length },
  hardStops: { requireFreshImmutableSourceImmediatelyBeforeExecution: true, requireExactSourceGuards: true, requireLiveEntityClearance: true, requireBlockEntityAndProtectedCoreClearance: true, requireStrictNoopForwardAndRollbackParserChecks: true, requireJournaledExecution: true, requireFreshPostSnapshotAndRollbackPoststatePreflight: true, requireIndependentPostRouteAndFixtureQa: true },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, mutationAuthority: false, nonClaims: ['not a public route', 'not egress', 'not transport commissioning', 'does not open either C1 vestibule', 'does not alter fluids or gravity'] },
};
const manifest = { ...base, manifestIdentity: sha(JSON.stringify(base)) };
fs.writeFileSync(abs(path.join(OUT, `${BASE}.release-manifest.json`)), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, manifest: rel(path.join(OUT, `${BASE}.release-manifest.json`)), fixtures: targets.length, halo: halo.length, mutationAuthority: false }, null, 2));
