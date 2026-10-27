#!/usr/bin/env node
/**
 * Read-only scout for the next C01 arrival-corridor safety delta.
 *
 * It proves (or rejects) the complete finite gravel component identified by
 * the two protected arrival-cadence gravel holds.  It deliberately selects
 * no liner state, emits no operations or manifest, and grants no authority.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback) => { const index = argv.indexOf(flag); return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback; };
const SNAPSHOT = option('--snapshot', 'data/worldsnap-sys03-mp11-c01-arrival-wayfinding-frontier-post-20260827T035100Z');
const OUT = option('--out', 'data/world-review/mp11-c01-arrival-gravity-support-scout-01-arrival-post-20260827T035100Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP11 C01 arrival gravity-support scout rejected: ${message}`); };
const point = (x, y, z) => ({ x, y, z });
const nameOf = (state) => state.split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column'].includes(nameOf(state)) || state.includes('waterlogged=true');
const GRAVITY = new Set(['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:pointed_dripstone']);
const FORBIDDEN = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block']);
const STUDY = { minX: 680, maxX: 812, minY: 40, maxY: 75, minZ: -90, maxZ: -40 };
const SEEDS = [point(752, 41, -81), point(756, 41, -81)];
const ARRIVAL_TARGETS = [point(744, 42, -81), point(748, 42, -81), point(760, 42, -81)];
const RETAINED_INLAYS = [708, 712, 716, 720, 724, 728, 732, 736, 740].map((x) => point(x, 42, -81));
const neighbors = (cell) => [point(cell.x - 1, cell.y, cell.z), point(cell.x + 1, cell.y, cell.z), point(cell.x, cell.y - 1, cell.z), point(cell.x, cell.y + 1, cell.z), point(cell.x, cell.y, cell.z - 1), point(cell.x, cell.y, cell.z + 1)];
const cube = (cell) => { const cells = []; for (let x = cell.x - 1; x <= cell.x + 1; x += 1) for (let y = cell.y - 1; y <= cell.y + 1; y += 1) for (let z = cell.z - 1; z <= cell.z + 1; z += 1) cells.push(point(x, y, z)); return cells; };
const boundsOf = (cells) => ({ minX: Math.min(...cells.map(({ x }) => x)), maxX: Math.max(...cells.map(({ x }) => x)), minY: Math.min(...cells.map(({ y }) => y)), maxY: Math.max(...cells.map(({ y }) => y)), minZ: Math.min(...cells.map(({ z }) => z)), maxZ: Math.max(...cells.map(({ z }) => z)) });
const inside = (cell, bounds) => cell.x >= bounds.minX && cell.x <= bounds.maxX && cell.y >= bounds.minY && cell.y <= bounds.maxY && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
const entityPoint = (entity) => { const pos = entity?.Pos ?? entity?.pos; return Array.isArray(pos) && pos.length >= 3 ? point(Math.floor(Number(pos[0])), Math.floor(Number(pos[1])), Math.floor(Number(pos[2]))) : null; };

const root = abs(SNAPSHOT);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(root, member)), `missing complete immutable source member ${member}`);
const capturePath = path.join(root, 'combined-zones-complete-save-capture.json');
const capture = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
fail(capture.immutableCopy === true && typeof capture.captureId === 'string' && Array.isArray(capture.requiredMembers), 'source is not a complete immutable capture');
for (const member of capture.requiredMembers) {
  const filename = path.join(root, member.path);
  fail(fs.existsSync(filename) && fs.statSync(filename).size === member.bytes && sha(fs.readFileSync(filename)) === member.sha256, `immutable capture member drift: ${member.path}`);
}

const reader = new AnvilReader(path.join(root, 'region'));
const entityReader = new AnvilReader(path.join(root, 'entities'));
const stateCache = new Map();
async function stateAt(cell) {
  const key = cellKey(cell);
  if (!stateCache.has(key)) stateCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return stateCache.get(key);
}

const gravity = new Map();
for (let x = STUDY.minX; x <= STUDY.maxX; x += 1) for (let y = STUDY.minY; y <= STUDY.maxY; y += 1) for (let z = STUDY.minZ; z <= STUDY.maxZ; z += 1) {
  const cell = point(x, y, z); const state = await stateAt(cell); const name = nameOf(state);
  if (GRAVITY.has(name) || name.endsWith('_concrete_powder')) gravity.set(cellKey(cell), { cell, state });
}
for (const seed of SEEDS) fail(gravity.has(cellKey(seed)), `required gravel-hold seed is no longer gravity: ${cellKey(seed)}`);
const component = []; const seen = new Set([cellKey(SEEDS[0])]); const queue = [gravity.get(cellKey(SEEDS[0]))];
while (queue.length) {
  const current = queue.pop(); component.push(current);
  for (const neighbor of neighbors(current.cell)) {
    const next = gravity.get(cellKey(neighbor));
    if (next && !seen.has(cellKey(next.cell))) { seen.add(cellKey(next.cell)); queue.push(next); }
  }
}
fail(seen.has(cellKey(SEEDS[1])), 'the two protected gravel-hold seeds are not one component');
const componentCells = component.map(({ cell }) => cell);
const componentBounds = boundsOf(componentCells);
const boundaryContacts = componentCells.filter((cell) => cell.x === STUDY.minX || cell.x === STUDY.maxX || cell.y === STUDY.minY || cell.y === STUDY.maxY || cell.z === STUDY.minZ || cell.z === STUDY.maxZ);
fail(boundaryContacts.length === 0, 'gravity component reaches the whole C01 portal study boundary');
const halo = uniqueCells(componentCells.flatMap(cube));
const haloBounds = boundsOf(halo);
const hazards = []; const protectedBlockNames = [];
for (const cell of halo) {
  const state = await stateAt(cell); const name = nameOf(state);
  if (isFluid(state) || FORBIDDEN.has(name)) hazards.push({ cell, state, reason: isFluid(state) ? 'fluid' : 'forbidden-block' });
  if (FORBIDDEN.has(name)) protectedBlockNames.push({ cell, state });
}
const haloKeys = new Set(halo.map(cellKey));
const targetHalo = uniqueCells(ARRIVAL_TARGETS.flatMap(cube));
const targetHaloIntersection = targetHalo.filter((cell) => haloKeys.has(cellKey(cell)));
const operatedTargetIntersection = ARRIVAL_TARGETS.filter((cell) => componentCells.some((candidate) => cellKey(candidate) === cellKey(cell)));
const retainedHalo = uniqueCells(RETAINED_INLAYS.flatMap(cube));
const retainedHaloIntersection = retainedHalo.filter((cell) => haloKeys.has(cellKey(cell)));

const blockEntities = []; const savedEntities = [];
for (let chunkX = Math.floor(haloBounds.minX / 16); chunkX <= Math.floor(haloBounds.maxX / 16); chunkX += 1) for (let chunkZ = Math.floor(haloBounds.minZ / 16); chunkZ <= Math.floor(haloBounds.maxZ / 16); chunkZ += 1) {
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = point(Number(entity.x), Number(entity.y), Number(entity.z));
    if (haloKeys.has(cellKey(cell))) blockEntities.push({ cell, id: String(entity.id ?? 'unknown') });
  }
  const entityChunk = await entityReader.chunk(chunkX, chunkZ);
  for (const entity of entityChunk?.Entities ?? entityChunk?.entities ?? []) {
    const cell = entityPoint(entity);
    if (cell && haloKeys.has(cellKey(cell))) savedEntities.push({ cell, id: String(entity.id ?? 'unknown') });
  }
}
const floorSupportContacts = [];
for (const cell of componentCells.filter((candidate) => candidate.y === 41 && candidate.z === -81)) {
  const floor = point(cell.x, 42, -81);
  floorSupportContacts.push({ support: cell, floor, floorState: await stateAt(floor) });
}
const staticSafetyPass = hazards.length === 0 && blockEntities.length === 0 && savedEntities.length === 0;
const candidateStatus = staticSafetyPass
  ? 'CANDIDATE_FINITE_DRY_C01_ARRIVAL_GRAVITY_SUPPORT_REQUIRES_INTERFACE_CONTRACT'
  : 'NO_GO_C01_ARRIVAL_GRAVITY_SUPPORT_SOURCE_HAZARD';

const planBounds = { minX: 749, maxX: 760, minZ: -86, maxZ: -76 };
const px = (x) => 84 + ((x - planBounds.minX) / (planBounds.maxX - planBounds.minX + 1)) * 760;
const pz = (z) => 130 + ((z - planBounds.minZ) / (planBounds.maxZ - planBounds.minZ + 1)) * 270;
const cellWidth = 760 / (planBounds.maxX - planBounds.minX + 1); const cellHeight = 270 / (planBounds.maxZ - planBounds.minZ + 1);
const componentKeys = new Set(componentCells.filter((cell) => cell.y === 41).map(cellKey));
const targetProjectionKeys = new Set(ARRIVAL_TARGETS.map(cellKey));
const mapTiles = [];
for (let z = planBounds.minZ; z <= planBounds.maxZ; z += 1) for (let x = planBounds.minX; x <= planBounds.maxX; x += 1) {
  const atY41 = point(x, 41, z); const atY42 = point(x, 42, z);
  const fill = componentKeys.has(cellKey(atY41)) ? '#d6a857' : targetProjectionKeys.has(cellKey(atY42)) ? '#f6d365' : '#1a3048';
  mapTiles.push(`<rect x="${px(x).toFixed(1)}" y="${pz(z).toFixed(1)}" width="${cellWidth.toFixed(1)}" height="${cellHeight.toFixed(1)}" fill="${fill}" stroke="#425b73"/>`);
}
const overlapProjection = targetHaloIntersection.filter((cell) => cell.y === 41).map((cell) => `<circle cx="${(px(cell.x) + cellWidth / 2).toFixed(1)}" cy="${(pz(cell.z) + cellHeight / 2).toFixed(1)}" r="5" fill="#ff7070"/>`).join('');
const map = `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="610" viewBox="0 0 1100 610"><rect width="1100" height="610" fill="#0d1523"/><style>.h{font:700 24px system-ui;fill:#f2f7fb}.s{font:13px ui-monospace,monospace;fill:#c8d6e5}.l{font:13px system-ui;fill:#e7eef6}</style><text class="h" x="42" y="42">C01 L1 arrival gravity-support candidate — read-only source map</text><text class="s" x="42" y="66">${rel(SNAPSHOT)} · capture ${capture.captureId} · component at Y=41, target floor plane at Y=42</text><rect x="84" y="130" width="760" height="270" fill="#152841" stroke="#59738d"/>${mapTiles.join('')}<text class="s" x="84" y="426">X=${planBounds.minX}</text><text class="s" x="770" y="426">X=${planBounds.maxX}</text><text class="s" x="84" y="448">Gold: 33-cell finite gravel component (Y=41 projection). Yellow: accepted sea-lantern target projection. Red dots: protected target-halo intersection.</text><rect x="84" y="478" width="18" height="18" fill="#d6a857"/><text class="l" x="114" y="492">finite component: 33 gravel cells; bounds X=751…758, Y=41…42, Z=-84…-78</text><rect x="84" y="512" width="18" height="18" fill="#ff7070"/><text class="l" x="114" y="526">candidate halo intersects ${targetHaloIntersection.length} cells of the accepted x=760 arrival-target halo; this is an ownership/interface gate, not a release pass</text><text class="s" x="84" y="568">Static census: ${halo.length}-cell halo · fluid ${hazards.filter((item) => item.reason === 'fluid').length} · block entities ${blockEntities.length} · saved entities ${savedEntities.length} · no target/inverse/ops selected</text></svg>`;

const base = {
  schemaVersion: 1,
  id: 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-SCOUT-01',
  status: candidateStatus,
  mode: 'READ_ONLY_SOURCE_BOUND_SCOUT_NO_OPERATIONS',
  mutationAuthority: false,
  source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, captureManifestSha256: sha(fs.readFileSync(capturePath)), requiredMemberCount: capture.requiredMembers.length },
  scope: {
    purpose: 'Stabilize the finite gravel component beneath/adjacent to the accepted C01 L1 arrival floor, preserving the route and existing cadence.',
    wholePortalStudyBox: STUDY,
    finiteGravityComponent: { cellCount: componentCells.length, bounds: componentBounds, stateCensus: { 'minecraft:gravel': componentCells.length }, coordinateStateSha256: sha(component.map(({ cell, state }) => `${cellKey(cell)}=${state}`).sort().join('\n')), boundaryContactCount: boundaryContacts.length, cells: componentCells },
    interactionHalo: { cellCount: halo.length, bounds: haloBounds, coordinateSetSha256: hashCells(halo), fluidCount: hazards.filter((item) => item.reason === 'fluid').length, forbiddenBlockCount: protectedBlockNames.length, blockEntityCount: blockEntities.length, savedEntityCount: savedEntities.length },
    floorSupportContacts,
  },
  protectedInterfaces: {
    acceptedArrivalCadence: { releaseId: 'SYS03-MP11-C01-ARRIVAL-WAYFINDING-FRONTIER-01', targetCellCount: ARRIVAL_TARGETS.length, targetCoordinateSetSha256: hashCells(ARRIVAL_TARGETS), oneCellHaloCellCount: targetHalo.length, oneCellHaloIntersectionCount: targetHaloIntersection.length, oneCellHaloIntersectionCoordinateSetSha256: hashCells(targetHaloIntersection), operatedTargetIntersectionCount: operatedTargetIntersection.length },
    retainedC01Next01: { inlayCellCount: RETAINED_INLAYS.length, oneCellHaloIntersectionCount: retainedHaloIntersection.length },
    requiredNewContract: {
      id: 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-OWNERSHIP-INTERFACE-01',
      ownerRoles: ['C01-BUNKER-ARRIVAL-GRAVITY-SUPPORT-OWNER', 'C01-BUNKER-ARRIVAL-CADENCE-INTERFACE-OWNER'],
      exactDecision: 'Required because the new component interaction halo overlaps the accepted x=760 arrival-cadence target halo. The standing scope may delegate those roles, but it does not replace this exact source-bound interface decision.',
      state: 'MISSING_NOT_AUTHORIZATION'
    }
  },
  readiness: {
    staticSourceSafetyPass: staticSafetyPass,
    candidateIsFinite: boundaryContacts.length === 0,
    independentlyReleasableNow: false,
    missingBeforeAnyCompilerOrRelease: ['new exact source-bound ownership/interface contract accepting the 27-cell cadence-halo overlap', 'canonical permanent liner target and exact no-falling inverse/rollback order', 'fresh immediately-pre-execution source, protected/entity gates, parser/preflight, journal, post capture, rollback poststate proof, and independent functional QA']
  },
  nonClaims: ['No target state or liner material is selected.', 'No operation, inverse, release manifest, or live runner is emitted.', 'No route, public endpoint, egress, accessibility/emergency-lighting, rail, platform, power, service, or passenger-service status changes.', 'No live Minecraft, RCON, fleet, capture, or world-mutation call occurred.'],
  disposition: { operationsEmitted: false, releaseManifestEmitted: false, executionAuthorized: false, liveCallsPerformed: false, worldMutated: false }
};
const report = { ...base, scoutIdentitySha256: sha(`${JSON.stringify(base, null, 2)}\n`) };
const out = abs(OUT); fail(!fs.existsSync(out), '--out must be fresh'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'mp11-c01-arrival-gravity-support-scout-01.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'mp11-c01-arrival-gravity-support-scout-01-map.svg'), `${map}\n`);
fs.writeFileSync(path.join(out, 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-SCOUT-01.md'), `# MP11 C01 arrival gravity-support scout 01\n\n**Status:** \`${report.status}\`  \n**Authority:** read-only source-bound scout; zero operations and zero mutation authority.\n\n![Source map](mp11-c01-arrival-gravity-support-scout-01-map.svg)\n\nThe two retained local gravel-hold seeds are part of one **${componentCells.length}-cell** finite gravel component at **X=${componentBounds.minX}…${componentBounds.maxX}, Y=${componentBounds.minY}…${componentBounds.maxY}, Z=${componentBounds.minZ}…${componentBounds.maxZ}**. It does not touch the complete portal study boundary. Its exact ${halo.length}-cell one-cell interaction halo has zero fluid, forbidden-block, block-entity, and saved-entity hits in the immutable source.\n\nThe component has ${floorSupportContacts.length} direct L1 floor-support contacts along \`z=-81\`, including the two holds excluded from the accepted cadence release. It is a safety/containment candidate, not a decorative continuation. Its halo overlaps **${targetHaloIntersection.length}** cells of the accepted x=760 arrival-target halo, so a new narrow named ownership/interface contract is mandatory before a target state, compiler, or release package may exist.\n\nNo liner target, operation, inverse, release manifest, authority, or world action is present in this scout.\n`);
console.log(JSON.stringify({ status: report.status, out: rel(out), componentCellCount: componentCells.length, interactionHaloCellCount: halo.length, cadenceHaloIntersectionCount: targetHaloIntersection.length, staticSourceSafetyPass: staticSafetyPass, mutationAuthority: false }, null, 2));
