#!/usr/bin/env node
/** Compile a fixed-light safety increment wholly inside the sealed B07 central bypass. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, replLine, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp05-b07-ice-edge-finite-water-plug-01-post-20260827T234500Z');
const OUT = option('--out', 'data/buildops/mp05-b07-central-bypass-fixed-lighting-01-current-20260827T234500Z');
const RELEASE = 'MP05-B07-CENTRAL-BYPASS-FIXED-LIGHTING-01';
const NODE = 'CZ-MP05-B07-CENTRAL-BYPASS-FIXED-LIGHTING';
const TX = 'mp05-b07-central-bypass-fixed-lighting-01';
const AUTH = 'docs/masterplans/05-combined-zones/mp05-b07-central-bypass-fixed-lighting-governor-standing-execution-authorization.json';
const FIXTURES = [22, 29, 36, 43, 50, 57].map((y) => ({ x: 2106, y, z: -398 }));
const CORE = [];
for (let y = 20; y <= 58; y += 1) for (let x = 2107; x <= 2109; x += 1) for (let z = -399; z <= -398; z += 1) CORE.push({ x, y, z });
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const key = cellKey;
const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE} compiler rejected: ${message}`); };
const name = (state) => String(state).split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const protectedState = (state) => ['minecraft:bedrock', 'minecraft:barrier', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw', 'minecraft:end_portal', 'minecraft:end_gateway'].includes(name(state));
const pointHash = (points) => sha(points.map((point) => `${point.x},${point.y},${point.z}`).sort().join('\n'));
const stateHash = (records) => sha(records.map(({ cell, state }) => `${key(cell)}=${state}`).sort().join('\n'));

const root = abs(SNAPSHOT);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(root, member)), `missing complete immutable source ${member}`);
const capturePath = path.join(root, 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.captureId, 'source is not an immutable complete-save capture');
for (const member of capture.requiredMembers ?? []) { const filename = path.join(root, member.path); fail(fs.existsSync(filename) && fs.statSync(filename).size === member.bytes && sha(fs.readFileSync(filename)) === member.sha256, `source member drifted: ${member.path}`); }
const reader = new AnvilReader(path.join(root, 'region')); const entityReader = new AnvilReader(path.join(root, 'entities')); const cache = new Map();
async function get(cell) { const id = key(cell); if (!cache.has(id)) cache.set(id, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return cache.get(id); }
const halo = new Map();
for (const fixture of FIXTURES) for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) { const cell = { x: fixture.x + dx, y: fixture.y + dy, z: fixture.z + dz }; halo.set(key(cell), cell); }
const sourceRecords = await Promise.all(FIXTURES.map(async (cell) => ({ cell, state: await get(cell) })));
fail(sourceRecords.every(({ state }) => state === 'minecraft:polished_deepslate'), 'every fixture must replace only the sealed polished-deepslate west wall');
const coreStates = await Promise.all(CORE.map(async (cell) => ({ cell, state: await get(cell) })));
fail(coreStates.every(({ state }) => state === 'minecraft:air' || (name(state) === 'minecraft:ladder' && state.includes('waterlogged=false'))), 'central bypass interior is no longer the accepted dry three-wide, two-clear maintenance volume');
const haloRecords = await Promise.all([...halo.values()].map(async (cell) => ({ cell, state: await get(cell) })));
fail(haloRecords.every(({ state }) => !fluid(state) && !protectedState(state)), 'fixture interaction halo contains fluid or protected core');
const minX = Math.min(...FIXTURES.map(({ x }) => x)) - 1; const maxX = Math.max(...FIXTURES.map(({ x }) => x)) + 1;
const minZ = Math.min(...FIXTURES.map(({ z }) => z)) - 1; const maxZ = Math.max(...FIXTURES.map(({ z }) => z)) + 1;
const minY = Math.min(...FIXTURES.map(({ y }) => y)) - 1; const maxY = Math.max(...FIXTURES.map(({ y }) => y)) + 1;
const blockEntities = []; const savedEntities = [];
for (let chunkX = Math.floor(minX / 16); chunkX <= Math.floor(maxX / 16); chunkX += 1) for (let chunkZ = Math.floor(minZ / 16); chunkZ <= Math.floor(maxZ / 16); chunkZ += 1) {
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const entry of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const cell = { x: Number(entry.x), y: Number(entry.y), z: Number(entry.z) }; if (cell.x >= minX && cell.x <= maxX && cell.y >= minY && cell.y <= maxY && cell.z >= minZ && cell.z <= maxZ) blockEntities.push({ cell, id: entry.id ?? entry.Id ?? null }); }
  const entityChunk = await entityReader.chunk(chunkX, chunkZ);
  for (const entry of entityChunk?.Entities ?? entityChunk?.entities ?? []) { if (!Array.isArray(entry.Pos)) continue; const [x, y, z] = entry.Pos.map(Number); if (x >= minX && x <= maxX + 1 && y >= minY && y <= maxY + 1 && z >= minZ && z <= maxZ + 1) savedEntities.push({ id: entry.id ?? entry.Id ?? null, position: [x, y, z] }); }
}
fail(blockEntities.length === 0 && savedEntities.length === 0, 'block or saved entity intersects the exact fixture interaction volume');
const retainedCap = [{ x: 2105, y: 30, z: -397 }, { x: 2105, y: 31, z: -397 }];
fail((await Promise.all(retainedCap.map(get))).every((state) => state === 'minecraft:polished_diorite'), 'retained R09J isolation cap drifted');
const entries = sourceRecords.map(({ cell, state }) => ({ cell, sourceState: state, targetState: 'minecraft:glowstone' })).sort((left, right) => left.cell.y - right.cell.y);
const forwardBody = `${entries.map((entry) => replLine(entry.cell, entry.sourceState, entry.targetState)).join('\n')}\n`;
const rollbackBody = `${[...entries].reverse().map((entry) => replLine(entry.cell, entry.targetState, entry.sourceState)).join('\n')}\n`;
const sourceMap = new Map(sourceRecords.map(({ cell, state }) => [key(cell), state]));
const projected = new Map(entries.map(({ cell, targetState }) => [key(cell), targetState]));
for (const cell of halo.values()) fail(!fluid(projected.get(key(cell)) ?? sourceMap.get(key(cell)) ?? await get(cell)), `projected fixture halo creates or retains fluid at ${key(cell)}`);
const output = abs(OUT); fail(!fs.existsSync(output), '--out must be a fresh directory'); fs.mkdirSync(output, { recursive: true });
const forwardPath = path.join(output, `${TX}.forward.txt`); const rollbackPath = path.join(output, `${TX}.rollback.txt`);
fs.writeFileSync(forwardPath, forwardBody); fs.writeFileSync(rollbackPath, rollbackBody);
const fixtureRows = FIXTURES.map(({ y }) => `<rect x="230" y="${665 - ((y - 20) * 14)}" width="30" height="12" fill="#ffd84a" stroke="#7b5a00"/><text x="272" y="${675 - ((y - 20) * 14)}" class="small">Glowstone y=${y}</text>`).join('');
fs.writeFileSync(path.join(output, 'central-bypass-fixed-lighting-section-x2106.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="730" viewBox="0 0 760 730"><style>.t{font:700 18px Arial}.s{font:12px Arial;fill:#34495e}.small{font:11px monospace;fill:#243746}.wall{fill:#34495e}.core{fill:#eaf5fb;stroke:#7f8c8d}</style><rect width="100%" height="100%" fill="#fff"/><text x="24" y="30" class="t">B07 central bypass — fixed-light safety section</text><text x="24" y="50" class="s">West sealed wall at X=2106 · no core, cap, gravel, water boundary, route, or exterior cell changes</text><rect x="195" y="90" width="34" height="575" class="wall"/><rect x="230" y="90" width="150" height="575" class="core"/><rect x="380" y="90" width="34" height="575" class="wall"/><text x="240" y="108" class="small">dry restricted bypass core (X=2107..2109)</text>${fixtureRows}<text x="24" y="704" class="s">Six full-block, non-waterlogged lights at seven-block maximum vertical spacing; all replace exact polished-deepslate wall cells.</text></svg>`);
fs.writeFileSync(path.join(output, 'central-bypass-fixed-lighting-plan-y43.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="330" viewBox="0 0 700 330"><style>.t{font:700 18px Arial}.s{font:12px Arial;fill:#34495e}.cell{font:700 15px monospace;fill:#fff}.tiny{font:11px monospace;fill:#243746}</style><rect width="100%" height="100%" fill="#fff"/><text x="24" y="30" class="t">B07 central bypass — light plane at Y=43</text><text x="24" y="50" class="s">L = new full-block sealed-wall fixture · clear core and all non-target walls retained</text><rect x="190" y="100" width="62" height="62" fill="#ffd84a" stroke="#7b5a00"/><text x="214" y="138" class="cell">L</text><rect x="253" y="100" width="188" height="62" fill="#eaf5fb" stroke="#7f8c8d"/><text x="274" y="138" class="tiny">dry core X=2107..2109</text><rect x="442" y="100" width="62" height="62" fill="#34495e"/><text x="184" y="187" class="tiny">X=2106 west sealed wall</text><text x="253" y="187" class="tiny">Z=-398/-399 maintenance path</text><text x="24" y="294" class="s">This plane is representative only; the paired section enumerates all six exact fixture elevations.</text></svg>`);
const manifestBase = {
  schemaVersion: 1, id: RELEASE, transactionId: TX, releaseNodeId: NODE, mvpScope: true,
  status: 'OFFLINE_COMPILED_AWAITING_FRESH_GUARDED_KERNEL', mutationAuthority: false,
  scopeIds: ['MP03-A', 'MP05-A', 'SYS-02', 'B07-CENTRAL-SEALED-BYPASS'],
  packages: [{ key: 'sealed-wall-fixed-lighting', forward: rel(forwardPath), rollback: rel(rollbackPath) }],
  executionOrder: { forward: ['sealed-wall-fixed-lighting'], rollback: ['sealed-wall-fixed-lighting'] },
  scopedRunner: { wrapper: 'scripts/run_mp05_b07_central_bypass_fixed_lighting_release.mjs', defaultMode: 'PREPARE_ONLY', liveExecutionOptIn: '--execute' },
  source: { snapshot: rel(SNAPSHOT), captureManifest: rel(capturePath), captureManifestSha256: sha(captureBytes), captureId: capture.captureId, authorization: AUTH },
  scope: { canonicalOwner: 'MP05-B07-CONTAINMENT-IMPLEMENTATION-TEAM', governorDelegatedRoles: { scopeOwner: 'B07 restricted maintenance implementation lead', lightingSafetyOwner: 'PassageWay restricted-route safety lead', releaseOperator: 'Guarded-release implementation operator' }, purpose: 'Install six supported full-block fixed lights in the existing sealed west wall of the accepted B07 central maintenance bypass.', fixtures: FIXTURES, fixtureCellCount: FIXTURES.length, maximumVerticalSpacing: 7, retainedR09JCap: retainedCap, retainedUnsupportedGravelColumn: [27, 28, 29, 30].map((y) => ({ x: 2104, y, z: -396 })), noFluidOrWaterloggedFixtures: true },
  interactionSet: { haloCellCount: halo.size, haloCellSetSha256: pointHash([...halo.values()]), sourceFluidCount: 0, sourceProtectedCoreCount: 0, sourceBlockEntityCount: blockEntities.length, sourceSavedEntityCount: savedEntities.length, retainedHaloStateSha256: stateHash(haloRecords) },
  target: { changedCellCount: entries.length, changedCellSetSha256: pointHash(FIXTURES), canonicalTargetState: 'minecraft:glowstone', sourceState: 'minecraft:polished_deepslate' },
  operations: { forward: { path: rel(forwardPath), sha256: sha(forwardBody), commandCount: entries.length, order: 'bottom-up fixed-light placement' }, rollback: { path: rel(rollbackPath), sha256: sha(rollbackBody), commandCount: entries.length, exactInverseOfForward: true, order: 'top-down exact polished-deepslate restoration' } },
  functionalAcceptance: { classification: 'RESTRICTED_B07_CENTRAL_BYPASS_FIXED_SAFETY_LIGHTING_ONLY', fixedLightCount: entries.length, dryCoreUnchanged: true, sealedWallRemainsSolid: true, publicAccessCommissioned: false, emergencyEgressCommissioned: false, surfaceConnectionCommissioned: false, transportCommissioned: false },
  hardSafetyKernel: { requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true, requiresCompilerRebind: true, requiresExactSourceAndProjectedRollbackPreflight: true, requiresStrictNoopForwardAndRollbackParserChecks: true, requiresBlockAndFreshLiveEntityClearance: true, requiresJournaledStrictExecution: true, requiresFreshPostCaptureAndRollbackPoststatePreflight: true, requiresIndependentPostQa: true },
  nonClaims: ['No water or lava cell is touched or exposed.', 'No R09J cap, unsupported gravel column, route-core, ladder, hatch, exterior receiver, surface connection, public route, emergency egress, or transport state is changed or commissioned.'],
};
const manifest = { ...manifestBase, manifestIdentitySha256: sha(`${JSON.stringify(manifestBase, null, 2)}\n`) };
fs.writeFileSync(path.join(output, `${TX}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, out: rel(output), manifest: rel(path.join(output, `${TX}.manifest.json`)), forwardCommands: entries.length, rollbackCommands: entries.length, haloCells: halo.size, mutationAuthority: false }, null, 2));
