#!/usr/bin/env node
/**
 * Read-only citywide surface rail + promenade network concept.
 * It uses the current complete snapshot only to census the proposed exterior
 * loop samples.  It deliberately does not turn any conceptual alignment into
 * a block set, operation, public route, or station authority.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const opt = (key, fallback) => { const i = process.argv.indexOf(key); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback; };
const abs = (p) => path.resolve(ROOT, p); const rel = (p) => path.relative(ROOT, abs(p)).split(path.sep).join('/');
const read = (p) => JSON.parse(fs.readFileSync(abs(p), 'utf8')); const hashFile = (p) => crypto.createHash('sha256').update(fs.readFileSync(abs(p))).digest('hex');
const assert = (v, m) => { if (!v) throw new Error(m); };
const SNAPSHOT = opt('--snapshot', 'data/worldsnap-mp05-b07-surface-receiver-descent-fixed-lighting-01-post-20260828T020000Z');
const ROAD = opt('--road-survey', 'data/world-review/mp06-functional-front-audit-20260828T020000Z/full-road-survey/survey.json');
const SYS01 = opt('--sys01', 'data/world-review/sys01-citywide-pedestrian-continuity-02-mp06-post-20260826T143902Z/sys01-citywide-continuity-census.json');
const MP07 = opt('--mp07-route', 'data/world-review/mp07-full-circulation-source-survey-20260826T140500Z/current-source-route-survey.json');
const OUT = opt('--out', 'data/world-review/citywide-surface-loop-network-02-post-20260828T020000Z/citywide-surface-loop-network-02.json');
const MAP = opt('--map', 'data/world-review/citywide-surface-loop-network-02-post-20260828T020000Z/citywide-surface-loop-network-02.svg');
const MD = opt('--markdown', 'docs/masterplans/CITYWIDE-SURFACE-RAIL-AND-PROMENADE-NETWORK-02-2026-08-28.md');
const GENERATED = opt('--generated-at', '2026-08-28T08:00:00.000Z');

for (const f of [path.join(SNAPSHOT, 'region'), path.join(SNAPSHOT, 'entities'), path.join(SNAPSHOT, 'poi'), path.join(SNAPSHOT, 'level.dat'), path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'), ROAD, SYS01, MP07]) assert(fs.existsSync(abs(f)), `missing required input ${f}`);
const capture = read(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')); const road = read(ROAD); const sys01 = read(SYS01); const mp07 = read(MP07);
assert(capture.immutableCopy === true && capture.requiredMembers?.length >= 130, 'requires a complete immutable source');
assert(road.status === 'SOURCE_BOUND_HOLD_ROUTE_PRESENT_NO_CURRENT_DEFECT_OR_OWNED_DELTA' && road.source?.snapshot === rel(SNAPSHOT) && road.endpointRouteGraph?.routeFound === true, 'road evidence must be the same-source successful route census');
assert(sys01.releaseDecision === 'NO_DISJOINT_CITYWIDE_LINK_RELEASE', 'SYS01 must retain its no-link decision');
assert(Array.isArray(mp07.accepted?.exactPath) && mp07.accepted.exactPath.length === 534, 'MP07 route inventory drifted');

// Catalog envelopes are protected planning interfaces, not a claim that the
// entire rectangle is occupied.  The loop stays at least 64 blocks outside
// their union before any terrain/ownership screening begins.
const protectedAreas = [
  { id: 'WESTLIGHT_VENUE', label: 'Westlight Venue', b: { minX: -443, maxX: -272, minZ: -640, maxZ: -488 } },
  { id: 'WESTLIGHT_DISTRICT', label: 'Westlight District', b: { minX: -429, maxX: -260, minZ: -556, maxZ: -445 } },
  { id: 'RAVENSGATE', label: 'Ravensgate', b: { minX: -148, maxX: -64, minZ: -562, maxZ: -420 } },
  { id: 'RAVENSREACH', label: 'Ravensreach', b: { minX: -147, maxX: -39, minZ: -451, maxZ: -323 } },
  { id: 'MANAGER_VALE', label: 'Manager Vale', b: { minX: -145, maxX: -49, minZ: -317, maxZ: -169 } },
  { id: 'MAINSTREET', label: 'MainStreet America', b: { minX: -305, maxX: 305, minZ: -305, maxZ: 312 } },
  { id: 'DATA_CAMPUS', label: 'Data Campus', b: { minX: 720, maxX: 999, minZ: -701, maxZ: -491 } },
  { id: 'CONCORD', label: 'Concord', b: { minX: 600, maxX: 808, minZ: -491, maxZ: -346 } },
  { id: 'C1_EAST', label: 'C1 / Gateway reservation', b: { minX: 430, maxX: 1550, minZ: -250, maxZ: 80 } },
  { id: 'TOWN_EXPANSION_CATALOG', label: 'Town Expansion catalog extent', b: { minX: -714, maxX: 1300, minZ: -719, maxZ: 296 } },
];
const loop = { minX: -784, maxX: 1631, minZ: -784, maxZ: 383, clearanceFromCatalogUnion: 64 };
const railSegments = [
  { id: 'SL-01-NW', from: [-784, -784], to: [-256, -784], direction: 'eastbound pair / promenade south' },
  { id: 'SL-02-N', from: [-256, -784], to: [512, -784], direction: 'eastbound pair / promenade south' },
  { id: 'SL-03-NE', from: [512, -784], to: [1631, -784], direction: 'eastbound pair / promenade south' },
  { id: 'SL-04-E', from: [1631, -784], to: [1631, 383], direction: 'southbound pair / promenade west' },
  { id: 'SL-05-SE', from: [1631, 383], to: [512, 383], direction: 'westbound pair / promenade north' },
  { id: 'SL-06-S', from: [512, 383], to: [-256, 383], direction: 'westbound pair / promenade north' },
  { id: 'SL-07-SW', from: [-256, 383], to: [-784, 383], direction: 'westbound pair / promenade north' },
  { id: 'SL-08-W', from: [-784, 383], to: [-784, -784], direction: 'northbound pair / promenade east' },
];
const gates = [
  { id: 'G-WL', name: 'Westlight external survey gate', at: [-784, -600], serves: 'Westlight / venue / approach road', rule: 'No spur, platform, bridge, or pedestrian ingress is selected.' },
  { id: 'G-RG', name: 'Ravensgate external survey gate', at: [-784, -500], serves: 'Ravensgate', rule: 'Keep Ravensgate underground exclusion and district envelope untouched.' },
  { id: 'G-RR', name: 'Ravensreach external survey gate', at: [-784, -384], serves: 'Ravensreach / Manager Vale', rule: 'No connection to the protected Moot/Library routes.' },
  { id: 'G-MS', name: 'MainStreet south external survey gate', at: [0, 383], serves: 'MainStreet / Arrival', rule: 'No crossing of MainStreet, C01, or portal fabric is selected.' },
  { id: 'G-DD', name: 'Data north external survey gate', at: [900, -784], serves: 'Data Campus / Concord', rule: 'No entry to Data Campus or C1 reservation is selected.' },
  { id: 'G-GW', name: 'Gateway east external survey gate', at: [1631, -250], serves: 'Gateway / future Combined Zones approach', rule: 'No C1, Grand Avenue, or Empty Eight interface is selected.' },
];
const inBox = ([x, z], b) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
const pointsFor = (segment) => {
  const [x1, z1] = segment.from; const [x2, z2] = segment.to; const len = Math.max(Math.abs(x2 - x1), Math.abs(z2 - z1)); const steps = Math.ceil(len / 16); const pts = [];
  for (let i = 0; i <= steps; i += 1) pts.push([Math.round(x1 + ((x2 - x1) * i) / steps), Math.round(z1 + ((z2 - z1) * i) / steps)]);
  return pts;
};
const samplePoints = [...new Map(railSegments.flatMap(pointsFor).map((p) => [p.join(','), p])).values()];
for (const p of samplePoints) assert(!protectedAreas.some(({ b }) => inBox(p, b)), `exterior loop sample enters protected catalog envelope at ${p}`);
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region'))); const air = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']); const state = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const surfaceSamples = []; const census = new Map();
for (const [x, z] of samplePoints) {
  let found = null;
  for (let y = 192; y >= -64; y -= 1) { const s = await state(x, y, z); if (!air.has(s.split('[', 1)[0])) { found = { x, z, y, state: s }; break; } }
  const kind = found ? (found.state.startsWith('minecraft:water') || found.state.startsWith('minecraft:lava') || found.state.startsWith('minecraft:bubble_column') ? 'fluid-surface' : 'solid-surface') : 'no-observed-surface';
  census.set(kind, (census.get(kind) ?? 0) + 1); surfaceSamples.push({ ...found ?? { x, z, y: null, state: null }, kind });
}
const bounds = (points) => ({ minX: Math.min(...points.map((p) => p[0])), maxX: Math.max(...points.map((p) => p[0])), minZ: Math.min(...points.map((p) => p[1])), maxZ: Math.max(...points.map((p) => p[1])) });
const segRows = railSegments.map((s) => ({ ...s, horizontalLength: Math.abs(s.to[0] - s.from[0]) + Math.abs(s.to[1] - s.from[1]), sampleCount: pointsFor(s).length }));
const result = {
  schemaVersion: 1, id: 'CITYWIDE-SURFACE-LOOP-NETWORK-02', generatedAtUtc: GENERATED, status: 'SOURCE_BOUND_CONCEPT_NETWORK_SURVEY_ONLY', mutationAuthority: false,
  source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, immutableCopy: true, requiredMembers: capture.requiredMembers.length },
  bindings: { roadSurvey: { path: rel(ROAD), sha256: hashFile(ROAD) }, sys01: { path: rel(SYS01), sha256: hashFile(SYS01) }, mp07Route: { path: rel(MP07), sha256: hashFile(MP07) } },
  existingRoadAndPathInventory: [
    { id: 'MP06-APPROACH-ROAD', status: 'CURRENT_SOURCE_MEASURED_EXISTING_ROUTE', measuredRouteStations: road.endpointRouteGraph.routeStationCount, bounds: road.endpointRouteGraph.routeBounds, maxAdjacentRise: road.endpointRouteGraph.maximumAdjacentRise, limitation: 'Existing road evidence only; it is not a rail right-of-way or a new interface.' },
    { id: 'MP07-RRMSA', status: 'ACCEPTED_BOUNDED_NORMAL_WALK_TRACE', stations: mp07.accepted.exactPath.length, endpoints: [mp07.accepted.exactPath[0], mp07.accepted.exactPath.at(-1)], limitation: 'The exact accepted trace does not certify a citywide connection.' },
    { id: 'SYS01-CROSS-COMPONENT', status: 'DISJOINT_COMPONENTS_RETAINED', decision: sys01.releaseDecision, limitation: 'The known 302-cell gap remains unsurveyed/unowned and is not bridged by this concept.' },
    { id: 'COBALT-WL-RR', status: 'SUBSURFACE_CIVIL_SEPARATED', limitation: 'Existing sealed civil/maintenance work is not an above-ground passenger loop interface.' },
  ],
  protectedInterfaces: protectedAreas.map(({ id, label, b }) => ({ id, label, bounds: b, rule: 'No loop sample or target enters this envelope. Any future spur needs a separately source-bound exact interface and two-direction pedestrian proof.' })),
  design: { referenceInterpretation: 'Toronto Union-inspired paired directional throat/loop logic translated to a Minecraft exterior belt: two separated guideways, a continuous adjacent promenade, and gated transfer forecourts outside protected town fabric. It is an aesthetic/operational pattern, not copied geometry.', rail: { form: 'two parallel one-way elevated guideways; no rail blocks, support cells, height, station, switch, or operation selected', loopBounds: loop, segments: segRows }, promenade: { form: 'continuous grade-separated walking/bike-style promenade adjacent to, but physically walled off from, the guideways', minimumConceptualClearWidth: 5, separationRule: 'continuous barrier between walk and rail; no crossing except later surveyed gated forecourts', segments: railSegments.map(({ id, from, to }) => ({ id: `${id}-PROM`, from, to })) }, externalSurveyGates: gates },
  exteriorTerrainScreen: { samplingSpacing: 16, sampledColumns: surfaceSamples.length, sampleBounds: bounds(samplePoints), surfaceKinds: Object.fromEntries([...census.entries()].sort()), samples: surfaceSamples, interpretation: 'A top-down immutable-source column census only. It does not prove foundation, water containment, grade, ownership, entity clearance, public walking, or buildability.' },
  requiredBeforeAnyPhysicalSegment: ['fresh immediate source capture for the exact finite segment', 'exact vertical terrain/fluid/gravity/block-entity/entity survey over guideway, promenade, foundation, and water-update halos', 'named owner/counterpart contract at every forecourt or existing-road seam', 'canonical forward/rollback states and strict-noop guarded release kernel', 'normal-walk proof for each new promenade segment; no passenger or public opening claim before separate service/egress design'],
  safetyBoundary: { readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
};
result.identitySha256 = crypto.createHash('sha256').update(`${JSON.stringify(result, null, 2)}\n`).digest('hex');
const W = 1500, H = 1050, margin = 75; const view = { minX: -850, maxX: 1700, minZ: -850, maxZ: 450 }; const xy = ([x, z]) => [margin + (x - view.minX) / (view.maxX - view.minX) * (W - 2 * margin), H - margin - (z - view.minZ) / (view.maxZ - view.minZ) * (H - 2 * margin)];
const rect = (b, cls) => { const [x, y] = xy([b.minX, b.maxZ]); const [x2, y2] = xy([b.maxX, b.minZ]); return `<rect class="${cls}" x="${x}" y="${y}" width="${x2 - x}" height="${y2 - y}"/>`; };
const line = (a, b, cls) => { const [x1, y1] = xy(a), [x2, y2] = xy(b); return `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; };
const asXZ = (point) => Array.isArray(point) ? [point[0], point[2]] : [point.x, point.z];
const projectFinite = (point) => { const [x, y] = xy(asXZ(point)); assert(Number.isFinite(x) && Number.isFinite(y), `non-finite SVG projection for ${JSON.stringify(point)}`); return `${x},${y}`; };
const roadLine = road.endpointRouteGraph.routeStationCells.cells.map(projectFinite).join(' '); const mp07Line = mp07.accepted.exactPath.map(projectFinite).join(' ');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><style>.bg{fill:#08131d}.grid{stroke:#19354b}.p{fill:#4b2d51;stroke:#e879f9;stroke-width:1}.loop{stroke:#38bdf8;stroke-width:7;fill:none}.walk{stroke:#a3e635;stroke-width:4;fill:none;stroke-dasharray:12 8}.road{stroke:#fbbf24;stroke-width:4;fill:none}.path{stroke:#fb923c;stroke-width:3;fill:none}.gate{fill:#f8fafc;stroke:#0f172a;stroke-width:3}.t{fill:#f8fafc;font:700 25px system-ui}.n{fill:#bed3e0;font:15px system-ui}.l{fill:#f8fafc;font:700 14px system-ui}</style><rect class="bg" width="100%" height="100%"/><text class="t" x="75" y="40">Citywide exterior rail loop + adjacent promenade · source-bound concept</text><text class="n" x="75" y="66">cyan: two-direction rail loop candidate · green dashed: segregated promenade candidate · no construction alignment or opening authority</text>${protectedAreas.map(({ b }) => rect(b, 'p')).join('')}${railSegments.map((s) => line(s.from, s.to, 'loop')).join('')}${railSegments.map((s) => line([s.from[0] + (s.from[0] === s.to[0] ? 12 : 0), s.from[1] + (s.from[1] === s.to[1] ? 12 : 0)], [s.to[0] + (s.from[0] === s.to[0] ? 12 : 0), s.to[1] + (s.from[1] === s.to[1] ? 12 : 0)], 'walk')).join('')}<polyline class="road" points="${roadLine}"/><polyline class="path" points="${mp07Line}"/>${gates.map((g) => { const [x, y] = xy(g.at); return `<circle class="gate" cx="${x}" cy="${y}" r="7"/><text class="l" x="${x + 10}" y="${y - 8}">${g.id}</text>`; }).join('')}<rect x="80" y="870" width="1340" height="120" rx="12" fill="#102333" stroke="#356177"/><text class="l" x="105" y="900">Existing inventory: gold = current-source MP06 207-station road trace; orange = accepted 534-station MP07 bounded walk trace.</text><text class="n" x="105" y="928">Purple boxes are protected catalog interfaces. Gates terminate on the exterior loop; they do not enter any town, road, station, C1, portal, or underground system.</text><text class="n" x="105" y="954">Before any finite build: fresh exact terrain/fluid/ownership survey, a vertical/receiver design, an inverse, protected-core/entity clearance, and route QA.</text></svg>\n`;
assert(!/\b(?:NaN|Infinity|-Infinity)\b/.test(svg), 'generated SVG contains a non-finite coordinate');
for (const p of [OUT, MAP, MD]) fs.mkdirSync(path.dirname(abs(p)), { recursive: true }); fs.writeFileSync(abs(OUT), `${JSON.stringify(result, null, 2)}\n`); fs.writeFileSync(abs(MAP), svg);
fs.writeFileSync(abs(MD), `# Citywide surface rail + promenade network 02\n\n**Status:** \`${result.status}\` · **no construction authority**  \n**Immutable source:** \`${result.source.snapshot}\` (capture \`${capture.captureId}\`)\n\n![Source-bound network map](${path.relative(path.dirname(abs(MD)), abs(MAP)).split(path.sep).join('/')})\n\n## What exists and is retained\n\n- MP06 has a current-source **${road.endpointRouteGraph.routeStationCount}-station** measured Approach Road trace (${road.endpointRouteGraph.routeBounds.minX}..${road.endpointRouteGraph.routeBounds.maxX}, Y ${road.endpointRouteGraph.routeBounds.minY}..${road.endpointRouteGraph.routeBounds.maxY}); it is not rail right-of-way.\n- MP07 retains a bounded **${mp07.accepted.exactPath.length}-station** Ravensreach–MainStreet normal-walk trace; it is not citywide continuity.\n- SYS01 retains \`${sys01.releaseDecision}\`: the unsurveyed cross-component gap is not bridged.\n- Existing Cobalt work is separated subsurface civil/maintenance fabric, not a surface-loop connection.\n\n## Concept layout\n\nThe Toronto Union reference is used only for the *pattern*: paired directional guideways around a loop, a continuous adjacent protected promenade, and gated external transfer forecourts. The exterior belt runs outside the catalog union at X \`${loop.minX}..${loop.maxX}\`, Z \`${loop.minZ}..${loop.maxZ}\`, retaining at least ${loop.clearanceFromCatalogUnion} blocks from the published town-expansion extent. It has ${railSegments.length} independent survey/build candidates, not one citywide package.\n\n| Candidate | Extent | Current disposition |\n| --- | --- | --- |\n${segRows.map((s) => `| ${s.id} | (${s.from.join(', ')}) → (${s.to.join(', ')}) · ${s.horizontalLength} horizontal blocks | exterior terrain sampled every 16 blocks; no vertical or ownership approval |`).join('\n')}\n\nThe six labeled gates are **survey terminators only**. No spur, station, road crossing, or public access enters Westlight, Ravensgate, Ravensreach, MainStreet, Data/C1, Gateway, or Combined Zones from this plan.\n\n## Source survey screen\n\nThe exterior loop sampled ${surfaceSamples.length} immutable-source columns at 16-block spacing: ${[...census.entries()].map(([k,v]) => `${v} ${k}`).join(', ')}. This is only a column census; it does not establish foundations, water control, grades, ownership, walking, or buildability.\n\nThe SVG generator rejects non-finite projected coordinates before it writes the map.\n\nNo live call, RCON, operation file, target state, release manifest, or world mutation was produced.\n`);
console.log(JSON.stringify({ status: result.status, report: rel(OUT), map: rel(MAP), markdown: rel(MD), sampledColumns: surfaceSamples.length, surfaceKinds: result.exteriorTerrainScreen.surfaceKinds, identity: result.identitySha256 }, null, 2));
