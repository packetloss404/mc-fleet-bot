#!/usr/bin/env node
/**
 * SYS03 Cobalt PC-01 surface outward-return scout — read-only evidence.
 *
 * Looks outward from the two candidate 5x5 surface planes through a bounded
 * surface study area.  It records physical normal-walk reach separately from
 * public-route/owner evidence: terrain is never promoted to a public return.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp11-c01-arrival-gravity-support-post-20260827T043000Z');
const CATALOG = option('--catalog', 'data/markers.json');
const OUT = option('--out', 'data/world-review/sys03-cobalt-pc01-surface-outward-return-scout-03-mp11-c01-support-post-20260827T043000Z');
const abs = (p) => path.resolve(ROOT, p);
const rel = (p) => path.relative(ROOT, abs(p)).split(path.sep).join('/');
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const fail = (c, m) => { if (c) throw new Error(`SYS03 PC-01 surface-return scout rejected: ${m}`); };
const point = (x, y, z) => ({ x, y, z });
const block = (s) => s.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air', 'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:fern', 'minecraft:large_fern', 'minecraft:snow']);
const FLUID = new Set(['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column']);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:concrete_powder', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel']);
const RAIL = new Set(['minecraft:rail', 'minecraft:powered_rail', 'minecraft:detector_rail', 'minecraft:activator_rail']);
const FORBIDDEN = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw']);
const key = (p) => `${p.x},${p.y},${p.z}`;
const isAir = (s) => AIR.has(block(s));
const isFluid = (s) => FLUID.has(block(s)) || s.includes('waterlogged=true');
const isGravity = (s) => GRAVITY.has(block(s));
const isRail = (s) => RAIL.has(block(s));
const isForbidden = (s) => FORBIDDEN.has(block(s)) || block(s).endsWith('_shulker_box');
const stations = [
  { id: 'WL-PC01', name: 'Westlight PR-W02', plane: { minX: -256, maxX: -252, y: 66, minZ: -464, maxZ: -460 }, study: { minX: -286, maxX: -222, minY: 60, maxY: 74, minZ: -494, maxZ: -430 }, protected: [{ id: 'COBALT-PASSIVE-RAIL-AND-SERVICE', minX: -260, maxX: -150, minY: 12, maxY: 26, minZ: -470, maxZ: -376 }] },
  { id: 'RR-PC01', name: 'Ravensreach PR-W04', plane: { minX: -155, maxX: -151, y: 62, minZ: -392, maxZ: -388 }, study: { minX: -185, maxX: -121, minY: 56, maxY: 70, minZ: -422, maxZ: -358 }, protected: [{ id: 'RR-SE-1-SERVICE-ONLY', minX: -160, maxX: -154, minY: 12, maxY: 26, minZ: -394, maxZ: -392 }, { id: 'COBALT-PASSIVE-RAIL-AND-SERVICE', minX: -260, maxX: -150, minY: 12, maxY: 26, minZ: -470, maxZ: -376 }] },
];

const snapshotRoot = abs(SNAPSHOT);
for (const required of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(!fs.existsSync(path.join(snapshotRoot, required)), `missing immutable source member ${required}`);
const manifestPath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
const manifestBytes = fs.readFileSync(manifestPath); const manifest = JSON.parse(manifestBytes);
fail(!(manifest.immutableCopy === true && Array.isArray(manifest.requiredMembers) && manifest.requiredMembers.length === 130), 'not a complete 130-member immutable source');
for (const member of manifest.requiredMembers) { const p = path.join(snapshotRoot, member.path); fail(!fs.existsSync(p) || fs.statSync(p).size !== member.bytes || sha(fs.readFileSync(p)) !== member.sha256, `immutable member drift ${member.path}`); }
fail(fs.existsSync(abs(OUT)), '--out must be a fresh directory');
fail(!fs.existsSync(abs(CATALOG)), `missing marker catalog ${CATALOG}`);
const catalogBytes = fs.readFileSync(abs(CATALOG)); const markers = JSON.parse(catalogBytes);
fail(!Array.isArray(markers), 'marker catalog must be an array');
const reader = new AnvilReader(path.join(snapshotRoot, 'region'));
const cache = new Map();
async function stateAt(x, y, z) { const k = `${x},${y},${z}`; if (!cache.has(k)) cache.set(k, stateToCommandString(await reader.blockState(x, y, z))); return cache.get(k); }
function inStudy(p, s) { return p.x >= s.minX && p.x <= s.maxX && p.y >= s.minY && p.y <= s.maxY && p.z >= s.minZ && p.z <= s.maxZ; }
function touchesBoundary(p, s) { return p.x === s.minX || p.x === s.maxX || p.z === s.minZ || p.z === s.maxZ || p.y === s.minY || p.y === s.maxY; }
function inProtected(p, scopes) { return scopes.filter((b) => p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY && p.z >= b.minZ && p.z <= b.maxZ).map((b) => b.id); }
async function nodeAt(p, scopes) {
  const [support, feet, head] = await Promise.all([stateAt(p.x, p.y - 1, p.z), stateAt(p.x, p.y, p.z), stateAt(p.x, p.y + 1, p.z)]);
  const protectedContacts = inProtected(p, scopes);
  return { p, support, feet, head, protectedContacts, walkable: !protectedContacts.length && !isAir(support) && !isFluid(support) && !isGravity(support) && !isRail(support) && !isForbidden(support) && isAir(feet) && !isFluid(feet) && !isGravity(feet) && !isRail(feet) && !isForbidden(feet) && isAir(head) && !isFluid(head) && !isGravity(head) && !isRail(head) && !isForbidden(head) };
}
async function inspectStation(station) {
  const starts = [];
  for (let x = station.plane.minX; x <= station.plane.maxX; x += 1) for (let z = station.plane.minZ; z <= station.plane.maxZ; z += 1) starts.push(point(x, station.plane.y + 1, z));
  const startNodes = await Promise.all(starts.map((p) => nodeAt(p, station.protected)));
  const validStarts = startNodes.filter((n) => n.walkable).map((n) => n.p);
  const queue = [...validStarts]; const visited = new Map(validStarts.map((p) => [key(p), { p, parent: null }])); const hazards = { fluidOrWaterlogged: 0, gravity: 0, rail: 0, forbidden: 0, protected: 0, blockedHeadroomOrSupport: 0 };
  while (queue.length) {
    const here = queue.shift();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const dy of [-1, 0, 1]) {
      const next = point(here.x + dx, here.y + dy, here.z + dz); const k = key(next); if (!inStudy(next, station.study) || visited.has(k)) continue;
      const node = await nodeAt(next, station.protected);
      if (!node.walkable) {
        const all = [node.support, node.feet, node.head];
        if (node.protectedContacts.length) hazards.protected += 1; else if (all.some(isFluid)) hazards.fluidOrWaterlogged += 1; else if (all.some(isGravity)) hazards.gravity += 1; else if (all.some(isRail)) hazards.rail += 1; else if (all.some(isForbidden)) hazards.forbidden += 1; else hazards.blockedHeadroomOrSupport += 1;
        continue;
      }
      visited.set(k, { p: next, parent: key(here) }); queue.push(next);
    }
  }
  const boundary = [...visited.values()].filter(({ p }) => touchesBoundary(p, station.study)).map(({ p }) => p);
  const trace = (end) => { const out = []; for (let k = key(end); k; k = visited.get(k).parent) out.push(visited.get(k).p); return out.reverse(); };
  const representativeBoundaryTraces = boundary.slice(0, 2).map(trace);
  const localMarkers = markers.filter((m) => m?.position && m.position.x >= station.study.minX && m.position.x <= station.study.maxX && m.position.y >= station.study.minY - 8 && m.position.y <= station.study.maxY + 8 && m.position.z >= station.study.minZ && m.position.z <= station.study.maxZ);
  return { station: station.id, name: station.name, surfacePlane: station.plane, studyBounds: station.study, sourceStartFeetCells: starts, validNormalWalkStartFeetCells: validStarts, invalidStartFeetCells: startNodes.filter((n) => !n.walkable).map((n) => ({ cell: n.p, support: n.support, feet: n.feet, head: n.head })), reachableNormalWalkStations: visited.size, studyBoundaryReachableStations: boundary.length, representativeUnownedBoundaryTraces: representativeBoundaryTraces.map((cells) => ({ stationCount: cells.length, coordinateSetSha256: hashCells(cells), start: cells[0], end: cells.at(-1), cells })), studiedHazardOrExclusionContacts: hazards, catalogMarkersInStudy: localMarkers.map((m) => ({ id: m.id, name: m.name, kind: m.kind, position: m.position, tags: m.tags ?? [] })), publicRouteCandidates: [], exactNoRouteFacts: [
    `No marker or catalogued public-route endpoint lies inside the ${station.id} source study bounds.`,
    `The source exposes ${visited.size} reachable normal-walk stations and ${boundary.length} outward study-boundary stations, but none has an owner/interface record or a named public destination.`,
    'A walkable terrain trace to a study boundary is not a public return and cannot satisfy either independent-return requirement.',
  ], ownership: 'UNASSIGNED: no cell-level public route owner/interface chain is present in the immutable save; the external marker catalog supplies no local public destination.' };
}
const observed = [];
for (const station of stations) observed.push(await inspectStation(station));
const result = {
  schemaVersion: 1, id: 'SYS03-COBALT-PC01-SURFACE-OUTWARD-RETURN-SCOUT-03', status: 'NO_SOURCE_BOUND_PUBLIC_SURFACE_RETURN_CANDIDATE__LOCAL_MARKER_AND_OWNER_GAP',
  disposition: { readOnly: true, mutationAuthority: false, operationsCompiled: false, releaseAuthorization: false, rconCalled: false, worldMutated: false, publicStationOpen: false, passengerServiceCommissioned: false },
  source: { snapshot: rel(SNAPSHOT), captureId: manifest.captureId, capturedAtUtc: manifest.capturedAtUtc, captureManifest: rel(manifestPath), captureManifestSha256: sha(manifestBytes), verifiedRequiredMemberCount: manifest.requiredMembers.length, externalMarkerCatalog: { path: rel(CATALOG), sha256: sha(catalogBytes), entryCount: markers.length, limitation: 'Catalog is hash-recorded evidence but is not a member of the immutable world capture.' } },
  stationResults: observed,
  requiredReturns: ['WL surface return A', 'WL surface return B', 'RR surface return A', 'RR surface return B'],
  acceptedPublicSurfaceReturns: 0,
  decisiveBlocker: 'Neither station has a source-bound named public pedestrian-route/marker destination nor a cell-level public owner/interface chain. The outward physical walk census cannot define either of the required independent public surface returns.',
  nextEvidence: ['Name a public destination endpoint for each required return and bind it to the fresh source.', 'Assign an exact public owner/interface chain to every retained and changed cell, explicitly excluding Cobalt rail/service and RR-SE-1.', 'Select two internally independent normal-walk traces per station; then prove bidirectional walk, hazards, container/block-entity separation, target states, inverse, release kernel, and independent post QA.'],
  nonClaims: ['No studied terrain trace is a public corridor, return, egress, station opening, rail route, or passenger service.', 'No target state, inverse, operation, manifest, authorization, RCON call, live interaction, or world mutation is emitted.']
};
result.identitySha256 = sha(`${JSON.stringify(result, null, 2)}\n`);
const map = () => { const cols = ['#60a5fa', '#a78bfa']; const panels = observed.map((o, i) => { const x0 = o.studyBounds.minX, x1 = o.studyBounds.maxX, z0 = o.studyBounds.minZ, z1 = o.studyBounds.maxZ; const sx = (x) => 38 + i * 580 + ((x - x0) / (x1 - x0 + 1)) * 520; const sz = (z) => 132 + ((z - z0) / (z1 - z0 + 1)) * 410; const p = o.surfacePlane; const r = `<rect x="${sx(p.minX)}" y="${sz(p.minZ)}" width="${sx(p.maxX + 1) - sx(p.minX)}" height="${sz(p.maxZ + 1) - sz(p.minZ)}" fill="${cols[i]}99" stroke="#f8fafc"/>`; const traces = o.representativeUnownedBoundaryTraces.map((t) => `<polyline fill="none" stroke="#fbbf24" stroke-width="2" points="${t.cells.map((c) => `${sx(c.x)},${sz(c.z)}`).join(' ')}"/>`).join(''); return `<rect x="${38 + i * 580}" y="132" width="520" height="410" fill="#10263a" stroke="#3d627e"/>${r}${traces}<text x="${38 + i * 580}" y="104" class="label">${o.name}</text><text x="${38 + i * 580}" y="570" class="small">walk reach ${o.reachableNormalWalkStations}; outward boundary ${o.studyBoundaryReachableStations}; local markers ${o.catalogMarkersInStudy.length}</text>`; }).join(''); return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720"><style>.title{font:700 21px system-ui;fill:#f8fafc}.sub{font:13px system-ui;fill:#cbd5e1}.label{font:600 14px system-ui;fill:#f8fafc}.small{font:11px system-ui;fill:#cbd5e1}.note{font:600 12px system-ui;fill:#fde68a}</style><rect width="100%" height="100%" fill="#08131f"/><text x="38" y="40" class="title">SYS03 PC-01 surface outward-return scout 03</text><text x="38" y="64" class="sub">Blue = candidate 5×5 surface plane; amber = representative unowned walk reach to the bounded-study edge.</text>${panels}<text x="38" y="622" class="note">No local named public marker/route or cell owner exists at either station: accepted public surface returns = 0/4.</text><text x="38" y="650" class="small">Map is physical source evidence only. It does not make terrain, rail/service fabric, RR-SE-1, or a study-boundary trace a public route.</text></svg>`; };
fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(path.join(abs(OUT), 'sys03-cobalt-pc01-surface-outward-return-scout-03.json'), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(abs(OUT), 'sys03-cobalt-pc01-surface-outward-return-scout-map.svg'), `${map()}\n`);
fs.writeFileSync(path.join(abs(OUT), 'SYS03-COBALT-PC01-SURFACE-OUTWARD-RETURN-SCOUT-03.md'), `# SYS03 Cobalt PC-01 surface outward-return scout 03\n\n**Status:** ${result.status}\n\n![Surface outward return map](sys03-cobalt-pc01-surface-outward-return-scout-map.svg)\n\nThe fresh immutable support post supplies a bounded normal-walk terrain census outward from both candidate 5×5 surface planes. It finds no source-bound existing public pedestrian-route/marker destination and no cell-level public owner/interface chain at either station. Therefore the census yields **zero** public surface-return candidates, even where a dry physical trace reaches the edge of the local study area.\n\nThe Cobalt passive rail/service fabric and Ravensreach RR-SE-1 remain excluded. This packet emits no target, inverse, operation, authority, interaction, or world change.\n`);
console.log(JSON.stringify({ status: result.status, output: rel(OUT), acceptedPublicSurfaceReturns: 0, stations: observed.map((s) => ({ station: s.station, validStarts: s.validNormalWalkStartFeetCells.length, reach: s.reachableNormalWalkStations, boundary: s.studyBoundaryReachableStations, markers: s.catalogMarkersInStudy.length })), mutationAuthority: false }, null, 2));
