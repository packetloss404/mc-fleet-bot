#!/usr/bin/env node
/**
 * SYS03 Cobalt PC-01 public endpoint / return contract — evidence only.
 *
 * This binds the four smallest previously surveyed endpoint planes to a
 * supplied complete immutable source and makes the currently missing public
 * ownership and return proofs explicit.  It never selects a block target,
 * creates operations, calls RCON, or treats a service sleeve/rail as public
 * circulation.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp11-c01-arrival-gravity-support-post-20260827T043000Z');
const OUT = option('--out', 'data/world-review/sys03-cobalt-pc01-public-endpoint-return-contract-02-mp11-c01-support-post-20260827T043000Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`SYS03 PC-01 public endpoint/return contract rejected: ${message}`); };
const point = (x, y, z) => ({ x, y, z });
const blockName = (state) => state.split('[', 1)[0];
const FLUID = new Set(['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column']);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:concrete_powder', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel']);
const FORBIDDEN = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw']);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(blockName(state));
const isForbidden = (state) => FORBIDDEN.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const boxCells = (bounds) => { const cells = []; for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push(point(x, y, z)); return cells; };
const expand = (bounds) => ({ minX: bounds.minX - 1, maxX: bounds.maxX + 1, minY: bounds.minY - 1, maxY: bounds.maxY + 1, minZ: bounds.minZ - 1, maxZ: bounds.maxZ + 1 });
const overlaps = (a, b) => !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY || a.maxZ < b.minZ || a.minZ > b.maxZ);
const dimensions = (bounds) => ({ x: bounds.maxX - bounds.minX + 1, y: bounds.maxY - bounds.minY + 1, z: bounds.maxZ - bounds.minZ + 1 });
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const endpoints = [
  { id: 'WL-PC01-SURFACE-PUBLIC-5X5', station: 'Westlight PR-W02', role: 'SURFACE_CONCOURSE_FLOOR', bounds: { minX: -256, maxX: -252, minY: 66, maxY: 66, minZ: -464, maxZ: -460 }, owner: 'SYS03-PC01-WL-SURFACE-PUBLIC-ENDPOINT-OWNER', acceptance: 'UNASSIGNED_AND_UNACCEPTED' },
  { id: 'WL-PC01-PLATFORM-PUBLIC-5X5', station: 'Westlight PR-W02', role: 'PLATFORM_INTERFACE_FACE_5W_BY_5H', bounds: { minX: -248, maxX: -244, minY: 19, maxY: 23, minZ: -441, maxZ: -441 }, owner: 'SYS03-PC01-WL-PLATFORM-PUBLIC-ENDPOINT-OWNER', acceptance: 'UNASSIGNED_AND_UNACCEPTED', note: 'A vertical interface face only: the retained platform clear volume is four cells deep, so no 5×5 platform floor is asserted.' },
  { id: 'RR-PC01-SURFACE-PUBLIC-5X5', station: 'Ravensreach PR-W04', role: 'SURFACE_CONCOURSE_FLOOR', bounds: { minX: -155, maxX: -151, minY: 62, maxY: 62, minZ: -392, maxZ: -388 }, owner: 'SYS03-PC01-RR-SURFACE-PUBLIC-ENDPOINT-OWNER', acceptance: 'UNASSIGNED_AND_UNACCEPTED', note: 'Contains the historic RR-SE-2 3×3 pad at X=-153..-151, Z=-390..-388, but does not turn it into a public concourse.' },
  { id: 'RR-PC01-PLATFORM-PUBLIC-5X5', station: 'Ravensreach PR-W04', role: 'PLATFORM_INTERFACE_FACE_5W_BY_5H', bounds: { minX: -154, maxX: -154, minY: 19, maxY: 23, minZ: -392, maxZ: -388 }, owner: 'SYS03-PC01-RR-PLATFORM-PUBLIC-ENDPOINT-OWNER', acceptance: 'UNASSIGNED_AND_UNACCEPTED', note: 'One cell east of the protected RR-SE-1 sleeve boundary; it is not a public platform or an accepted route.' },
];
const protectedScopes = [
  { id: 'RR-SE-1-SERVICE-ONLY', bounds: { minX: -156, maxX: -154, minY: 12, maxY: 26, minZ: -394, maxZ: -392 }, rule: 'Never public access, egress, return, platform, or route evidence.' },
  { id: 'COBALT-PASSIVE-RAIL-AND-SERVICE', bounds: { minX: -260, maxX: -150, minY: 12, maxY: 26, minZ: -470, maxZ: -376 }, rule: 'Existing passive railway/service fabric remains excluded; no rail walking or service-corridor substitution.' },
];
const returnContracts = [
  { id: 'WL-PC01-RETURN-A', station: 'Westlight PR-W02', from: 'WL-PC01-SURFACE-PUBLIC-5X5', to: 'WL-PC01-PLATFORM-PUBLIC-5X5' },
  { id: 'WL-PC01-RETURN-B', station: 'Westlight PR-W02', from: 'WL-PC01-SURFACE-PUBLIC-5X5', to: 'WL-PC01-PLATFORM-PUBLIC-5X5' },
  { id: 'RR-PC01-RETURN-A', station: 'Ravensreach PR-W04', from: 'RR-PC01-SURFACE-PUBLIC-5X5', to: 'RR-PC01-PLATFORM-PUBLIC-5X5' },
  { id: 'RR-PC01-RETURN-B', station: 'Ravensreach PR-W04', from: 'RR-PC01-SURFACE-PUBLIC-5X5', to: 'RR-PC01-PLATFORM-PUBLIC-5X5' },
].map((route) => ({ ...route, class: 'REQUIRED_PUBLIC_NORMAL_WALK_RETURN', exactGeometry: null, owner: null, sourceProof: 'ABSENT', accepted: false, blocker: 'No capture-bound route coordinate sequence, owner, disjointness proof, or bidirectional normal-walk evidence exists. The route cannot be inferred from an endpoint plane, rail, RR-SE-1, or a service corridor.' }));

const snapshotRoot = abs(SNAPSHOT);
for (const required of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(snapshotRoot, required)), `missing immutable source member ${required}`);
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.captureId && Array.isArray(capture.requiredMembers) && capture.requiredMembers.length === 130, 'source is not a 130-member complete immutable capture');
for (const member of capture.requiredMembers) { const file = path.join(snapshotRoot, member.path); fail(fs.existsSync(file) && fs.statSync(file).size === member.bytes && sha(fs.readFileSync(file)) === member.sha256, `immutable source drift ${member.path}`); }
fail(!fs.existsSync(abs(OUT)), '--out must be a fresh path');

const reader = new AnvilReader(path.join(snapshotRoot, 'region'));
const entityReader = new AnvilReader(path.join(snapshotRoot, 'entities'));
const cache = new Map();
async function stateAt(cell) { const key = cellKey(cell); if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return cache.get(key); }
async function census(cells) {
  const records = []; for (const cell of cells) records.push({ ...cell, state: await stateAt(cell) });
  const states = Object.fromEntries([...records.reduce((map, entry) => map.set(entry.state, (map.get(entry.state) ?? 0) + 1), new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
  return { cellCount: records.length, coordinateSetSha256: hashCells(cells), states, hazardCounts: { fluid: records.filter((entry) => isFluid(entry.state)).length, gravity: records.filter((entry) => isGravity(entry.state)).length, forbidden: records.filter((entry) => isForbidden(entry.state)).length } };
}
async function entitiesIn(cells) {
  const keys = new Set(cells.map(cellKey)); const minX = Math.min(...cells.map((cell) => cell.x)); const maxX = Math.max(...cells.map((cell) => cell.x)); const minY = Math.min(...cells.map((cell) => cell.y)); const maxY = Math.max(...cells.map((cell) => cell.y)); const minZ = Math.min(...cells.map((cell) => cell.z)); const maxZ = Math.max(...cells.map((cell) => cell.z));
  const blockEntities = []; const savedEntities = [];
  for (let cx = Math.floor(minX / 16); cx <= Math.floor(maxX / 16); cx += 1) for (let cz = Math.floor(minZ / 16); cz <= Math.floor(maxZ / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz); for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const cell = point(Number(entity.x), Number(entity.y), Number(entity.z)); if (keys.has(cellKey(cell))) blockEntities.push({ id: String(entity.id ?? 'unknown'), cell }); }
    const entityChunk = await entityReader.chunk(cx, cz); for (const entity of entityChunk?.Entities ?? entityChunk?.entities ?? []) { const pos = entity.Pos ?? entity.pos; if (!Array.isArray(pos) || pos.length < 3) continue; const cell = point(Math.floor(Number(pos[0])), Math.floor(Number(pos[1])), Math.floor(Number(pos[2]))); if (cell.x >= minX && cell.x <= maxX && cell.y >= minY && cell.y <= maxY && cell.z >= minZ && cell.z <= maxZ) savedEntities.push({ id: String(entity.id ?? 'unknown'), cell }); }
  }
  return { blockEntities, savedEntities };
}

const observedEndpoints = [];
for (const endpoint of endpoints) {
  const core = boxCells(endpoint.bounds); const coreKeys = new Set(core.map(cellKey)); const halo = uniqueCells(boxCells(expand(endpoint.bounds)).filter((cell) => !coreKeys.has(cellKey(cell))));
  const [coreCensus, haloCensus, entityCensus] = await Promise.all([census(core), census(halo), entitiesIn(uniqueCells([...core, ...halo]))]);
  const size = dimensions(endpoint.bounds); const exactFiveByFive = core.length === 25 && [size.x, size.y, size.z].filter((length) => length === 1).length === 1 && [size.x, size.y, size.z].filter((length) => length === 5).length === 2;
  fail(exactFiveByFive, `${endpoint.id} is not an exact one-cell-thick 5×5 plane`);
  observedEndpoints.push({ ...endpoint, shape: { cellCount: core.length, dimensions: size, exactOneCellThickFiveByFive: true }, sourceCensus: { core: coreCensus, oneCellHalo: haloCensus, blockEntityCount: entityCensus.blockEntities.length, savedEntityCount: entityCensus.savedEntities.length, observedSafetyOnly: coreCensus.hazardCounts.fluid === 0 && coreCensus.hazardCounts.gravity === 0 && coreCensus.hazardCounts.forbidden === 0 && entityCensus.blockEntities.length === 0 }, protectedContacts: protectedScopes.filter((scope) => overlaps(expand(endpoint.bounds), scope.bounds)).map(({ id, rule }) => ({ id, rule })), targetStates: null, exactInverse: null, accepted: false });
}

const map = () => {
  const x0 = -266; const x1 = -144; const z0 = -474; const z1 = -382; const sx = (x) => 70 + ((x - x0) / (x1 - x0)) * 1060; const sz = (z) => 116 + ((z - z0) / (z1 - z0)) * 390;
  const rect = (bounds, fill, stroke, label) => `<rect x="${sx(bounds.minX)}" y="${sz(bounds.minZ)}" width="${sx(bounds.maxX + 1) - sx(bounds.minX)}" height="${sz(bounds.maxZ + 1) - sz(bounds.minZ)}" fill="${fill}" stroke="${stroke}" stroke-width="2"/><text x="${sx(bounds.minX) + 3}" y="${sz(bounds.minZ) + 14}" class="label">${escape(label)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="740" viewBox="0 0 1200 740"><style>.title{font:700 21px system-ui;fill:#f8fafc}.sub{font:13px system-ui;fill:#cbd5e1}.label{font:600 10px system-ui;fill:#f8fafc}.note{font:600 12px system-ui;fill:#fde68a}.small{font:11px system-ui;fill:#cbd5e1}</style><rect width="100%" height="100%" fill="#08131f"/><text x="30" y="38" class="title">SYS03 Cobalt PC-01 — public endpoint / return contract 02</text><text x="30" y="61" class="sub">Fresh immutable source geometry only. No public route, platform, passenger service, or physical scope is accepted.</text><rect x="70" y="116" width="1060" height="390" fill="#10263a" stroke="#3d627e"/>${rect(endpoints[0].bounds, '#60a5fa99', '#dbeafe', 'WL surface 5×5')} ${rect(endpoints[2].bounds, '#60a5fa99', '#dbeafe', 'RR surface 5×5')} ${rect(protectedScopes[0].bounds, '#fb718566', '#fecdd3', 'RR-SE-1 service only')}<line x1="${sx(-246)}" y1="${sz(-441)}" x2="${sx(-246)}" y2="${sz(-441) - 28}" stroke="#86efac" stroke-width="3"/><text x="${sx(-248)}" y="${sz(-441) - 33}" class="label">WL 5W×5H platform face</text><line x1="${sx(-154)}" y1="${sz(-390)}" x2="${sx(-154) + 38}" y2="${sz(-390)}" stroke="#86efac" stroke-width="3"/><text x="${sx(-154) + 42}" y="${sz(-390) + 4}" class="label">RR 5W×5H platform face</text><text x="70" y="552" class="note">Both stations: 2 required public normal-walk returns; accepted return chains = 0/4.</text><text x="70" y="582" class="small">Endpoint planes are source observations, not targets. RR-SE-1, rail, and service fabric are expressly excluded from returns.</text><text x="70" y="608" class="small">Each plane needs an exact owner/interface acceptance; each return needs a coordinate path, protected separation, bidirectional normal-walk proof, and post-state QA.</text><text x="70" y="646" class="small">No operation, release manifest, RCON call, live interaction, world mutation, opening, or service assertion is emitted by this evidence packet.</text></svg>`;
};
const report = {
  schemaVersion: 1,
  id: 'SYS03-COBALT-PC01-PUBLIC-ENDPOINT-RETURN-CONTRACT-02',
  status: 'SOURCE_BOUND_ENDPOINT_GEOMETRY_ONLY__DECISIVE_BLOCKER_ZERO_ACCEPTED_PUBLIC_RETURN_CHAINS',
  disposition: { readOnly: true, mutationAuthority: false, operationsCompiled: false, releaseAuthorization: false, rconCalled: false, worldMutated: false, publicStationOpen: false, passengerServiceCommissioned: false },
  source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, captureManifest: rel(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')), captureManifestSha256: sha(captureBytes), verifiedRequiredMemberCount: capture.requiredMembers.length },
  endpointContracts: observedEndpoints,
  publicReturnContracts: returnContracts,
  contractResult: { exactEndpointPlaneCount: observedEndpoints.length, exactEndpointPlaneOwnerAcceptances: 0, requiredPublicReturnChains: returnContracts.length, acceptedPublicReturnChains: 0, requiredIndependentReturnsPerStation: 2, currentPhysicalScope: 'NONE', decisiveBlocker: 'Four endpoint ownership/interface acceptances and four exact, owner-bound, non-service/non-rail, bidirectional normal-walk return chains are absent. Without their coordinate geometry and proof, no physical PC-01 access/compiler scope exists.', minimumNextEvidence: ['Accept all four exact endpoint owners/interfaces against a fresh complete snapshot.', 'Provide two disjoint coordinate-level public normal-walk returns per station from its surface plane to platform face; exclude rail, passive service fabric, RR-SE-1, fluids, protected cores, and container/block-entity halos.', 'For each return prove normal walking in both directions, then bind any finite physical delta to canonical targets, exact inverse, fresh clearance, guarded execution, and independent post QA.'] },
  exclusions: { rrSe1: 'PROTECTED_SERVICE_ONLY__NOT_A_PUBLIC_RETURN', passiveRailAndService: 'EXCLUDED__NOT_A_PUBLIC_RETURN_OR_PLATFORM_ACCESS', targetStates: 'NONE', inverse: 'NONE', liveEntityClearance: 'NOT_ATTEMPTED__FUTURE_RELEASE_GATE' },
  nonClaims: ['The observed planes do not create public endpoints, concourses, platforms, returns, egresses, passenger routes, rail service, or a station opening.', 'No operation, manifest, runner, authorization, RCON call, live interaction, world mutation, or release scope exists.', 'The source census is evidence only and cannot substitute for a fresh pre-execution source/clearance audit.']
};
report.contractIdentitySha256 = sha(`${JSON.stringify(report, null, 2)}\n`);
fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(path.join(abs(OUT), 'sys03-cobalt-pc01-public-endpoint-return-contract-02.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(abs(OUT), 'sys03-cobalt-pc01-public-endpoint-return-contract-map.svg'), `${map()}\n`);
fs.writeFileSync(path.join(abs(OUT), 'SYS03-COBALT-PC01-PUBLIC-ENDPOINT-RETURN-CONTRACT-02.md'), `# SYS03 Cobalt PC-01 public endpoint / return contract 02\n\n**Status:** \`${report.status}\`\n\n![Endpoint and return gate map](sys03-cobalt-pc01-public-endpoint-return-contract-map.svg)\n\nThis fresh-source evidence packet records the smallest exact PC-01 endpoint geometry: two 5×5 surface-floor planes and two 5-wide × 5-high platform-interface faces. They are **not** construction targets or accepted public spaces.\n\n- Westlight surface: X=-256..-252, Y=66, Z=-464..-460; platform face: X=-248..-244, Y=19..23, Z=-441.\n- Ravensreach surface: X=-155..-151, Y=62, Z=-392..-388; platform face: X=-154, Y=19..23, Z=-392..-388.\n- Exact endpoint ownership/interface acceptances: **0/4**. Required public return chains: **4** (two at each station); accepted: **0/4**.\n\nThe decisive blocker is therefore not a cosmetic or historical audit hold: there is no coordinate-level, owner-bound, bidirectional normal-walk public return from either surface endpoint to its platform interface. RR-SE-1 is protected service-only; passive rail and service fabric cannot count as public access or return evidence. No targets, inverse, operations, authorization, live interaction, or world change are emitted.\n`);
console.log(JSON.stringify({ status: report.status, output: rel(OUT), endpointPlaneCount: observedEndpoints.length, endpointOwnerAcceptances: 0, requiredPublicReturnChains: returnContracts.length, acceptedPublicReturnChains: 0, mutationAuthority: false }, null, 2));
