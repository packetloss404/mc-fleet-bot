#!/usr/bin/env node
/**
 * Read-only town mobility inventory and outer-loop / spur design map.
 *
 * It binds named stations, cataloged road/parcel fabric, and a complete
 * immutable snapshot. It deliberately does not infer permission from dry
 * terrain, emit operations, or certify a public/rail/egress route.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const opt = (flag, fallback) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const SNAPSHOT = opt('--snapshot', 'data/worldsnap-mp11-bkr-c01-approach-gravity-containment-08-post-20260828T040000Z');
const DATABASE = opt('--database', 'data/world-map.db');
const OUT = opt('--out', 'data/world-review/town-outer-loop-spur-network-20260828T040000Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`town outer-loop survey rejected: ${message}`); };

const snapshotRoot = abs(SNAPSHOT);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  fail(fs.existsSync(path.join(snapshotRoot, member)), `incomplete immutable snapshot: ${member}`);
}
fail(fs.existsSync(abs(DATABASE)), `catalog database absent: ${DATABASE}`);
fail(!fs.existsSync(abs(OUT)), '--out must be a fresh directory');
const captureBytes = fs.readFileSync(path.join(snapshotRoot, 'combined-zones-complete-save-capture.json'));
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true, 'source capture is not immutable');
const dbBytes = fs.readFileSync(abs(DATABASE));
const db = new Database(abs(DATABASE), { readonly: true, fileMustExist: true });
const reader = new AnvilReader(path.join(snapshotRoot, 'region'));

const stations = [
  { id: 'ST-MSA-REAR', name: 'MainStreet rear mobility anchor', point: [-82, 65, 90], role: 'existing north-spur terminal reference', owner: 'town-expansion-r1 / mainstreet interface', access: 'existing physical route evidence must be freshly rebound' },
  { id: 'ST-RRCH-UPPER', name: 'Ravensreach Upper Street', point: [-85, 71, -314], role: 'existing town-street interchange', owner: 'RRCH-MV-UPPER-STREET', access: 'registered existing road; preserve' },
  { id: 'ST-RRCH-MOOT', name: 'Ravensreach Moot civic anchor', point: [-85, 68, -370], role: 'civic destination', owner: 'RRCH-MOOT', access: 'building entrance; no station construction implied' },
  { id: 'ST-RG-BELL', name: 'Ravensgate Bell-Gate anchor', point: [-108, 68, -430], role: 'civic district anchor', owner: 'RG-BELL', access: 'building entrance; preserve Bell-Gate fabric' },
  { id: 'ST-AR-EAST', name: 'Approach Road east endpoint', point: [-148, 70, -500], role: 'Ravensgate / approach trunk interface', owner: 'APPROACH-ROAD:PRIMARY', access: 'existing road endpoint; interface rebind required' },
  { id: 'ST-WL-GATEHEAD', name: 'Westlight Gatehead', point: [-338, 68, -484], role: 'Westlight district arrival anchor', owner: 'WD-GATEHEAD', access: 'existing threshold; preserve façade' },
  { id: 'ST-WL-EAST-ARRIVAL', name: 'Westlight East Arrival', point: [-359, 68, -498], role: 'venue-side interface anchor', owner: 'MP12/MP13 joint interface', access: 'normal-walk witness only; not an accepted public route' },
];
const assetIds = [
  'ravensreach:DISTRICT', 'ravensgate:DISTRICT', 'approach-road:DISTRICT', 'APPROACH-ROAD:PRIMARY',
  'westlight-district:DISTRICT', 'westlight-venue:DISTRICT', 'TE-RAVENSREACH-MAINSTREET-STAFF-PATH',
  'RRCH-MV-UPPER-STREET', 'RRCH-MV-EAST-CONNECTOR', 'RRCH-MV-R07-WEST', 'TE-ROAD-01',
  'TE-PAN-RV01-ROAD', 'TE-WL-PARKWAY-EXTENSION', 'TE-WESTLIGHT-CRATER-LAKE', 'TE-WL-HARBORLIGHT',
];
const assetRows = db.prepare(`select project_id, external_id, name, kind, status, min_x, max_x, min_z, max_z, geometry_json, attributes_json from world_features where external_id in (${assetIds.map(() => '?').join(',')})`).all(...assetIds);
fail(assetRows.length === assetIds.length, `catalog feature count drift: expected ${assetIds.length}, found ${assetRows.length}`);
const assets = assetRows.map((row) => ({
  id: row.external_id, project: row.project_id, name: row.name, kind: row.kind, status: row.status,
  bounds: { minX: row.min_x, maxX: row.max_x, minZ: row.min_z, maxZ: row.max_z },
  geometry: JSON.parse(row.geometry_json),
})).sort((a, b) => a.id.localeCompare(b.id));
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
for (const station of stations) {
  const [x, y, z] = station.point;
  station.snapshotCells = {
    footing: stateToCommandString(await reader.blockState(x, y - 1, z)),
    feet: stateToCommandString(await reader.blockState(x, y, z)),
    head: stateToCommandString(await reader.blockState(x, y + 1, z)),
  };
  station.normalWalkWitness = !AIR.has(station.snapshotCells.footing) && AIR.has(station.snapshotCells.feet) && AIR.has(station.snapshotCells.head);
}

const network = {
  existingReferenceTrunks: [
    { id: 'TRUNK-NORTH', from: 'ST-MSA-REAR', to: 'ST-RRCH-UPPER', evidence: 'TE-RAVENSREACH-MAINSTREET-STAFF-PATH', rule: 'Retain/rebind existing route only; no widening or new public classification.' },
    { id: 'TRUNK-RRCH', from: 'ST-RRCH-UPPER', to: 'ST-RRCH-MOOT', evidence: 'RRCH-MV-UPPER-STREET + Ravensreach civic fabric', rule: 'Destination leg only; no internal building edits.' },
    { id: 'TRUNK-WEST', from: 'ST-AR-EAST', to: 'ST-WL-GATEHEAD', evidence: 'APPROACH-ROAD:PRIMARY', rule: 'Existing road geometry only; end-to-end/public acceptance is separate.' },
  ],
  interfaceSpurs: [
    { id: 'SPUR-RRCH-RG', from: 'ST-RRCH-MOOT', to: 'ST-RG-BELL', status: 'INTERFACE_SURVEY_REQUIRED', reason: 'Adjacent civic fabric is cataloged, but this inventory does not prove a public directed transition.' },
    { id: 'SPUR-RG-AR', from: 'ST-RG-BELL', to: 'ST-AR-EAST', status: 'INTERFACE_SURVEY_REQUIRED', reason: 'Ravensgate/Approach endpoint faces and route states are not bound by a common current contract.' },
    { id: 'SPUR-WL-VENUE', from: 'ST-WL-GATEHEAD', to: 'ST-WL-EAST-ARRIVAL', status: 'ACCEPTANCE_SIGNATURE_REQUIRED', reason: 'The known normal-walk witness is not an accepted Gatehead-to-venue public or egress route.' },
  ],
  outerLoopReserve: {
    id: 'OUTER-LOOP-WESTLIGHT-RESERVE',
    retainedFabric: ['TE-PAN-RV01-ROAD', 'TE-WL-PARKWAY-EXTENSION', 'TE-WESTLIGHT-CRATER-LAKE', 'TE-WL-HARBORLIGHT', 'TE-ROAD-01'],
    conclusion: 'The apparent west/south exterior is already registered Town Expansion transport, water, and destination fabric. It is a preservation/rebind corridor, not unowned terrain for an inferred bypass.',
    physicalMutationAuthorized: false,
  },
  stages: [
    { order: 0, id: 'NETWORK-0-INVENTORY', scope: 'Bind source, stations, catalog corridors, and exact ownership boundaries.', physicalWork: false },
    { order: 1, id: 'NETWORK-1-RETAIN-TRUNKS', scope: 'Rebind existing North, Ravensreach, and Approach trunks to a fresh route/return survey.', physicalWork: false },
    { order: 2, id: 'NETWORK-2-OUTER-RESERVE', scope: 'Adopt Town Expansion west/south bands as protected right-of-way and hydrology context; do not overwrite them.', physicalWork: false },
    { order: 3, id: 'NETWORK-3-INTERFACE-CONTRACTS', scope: 'Produce exact directed boundary contracts for Ravensreach↔Ravensgate, Ravensgate↔Approach, and Gatehead↔Venue.', physicalWork: false },
    { order: 4, id: 'NETWORK-4-FIRST-PHYSICAL-DELTA', scope: 'Only a newly source-bound, owner-approved defect package may modify a single interface after stages 0–3.', physicalWork: 'separate guarded release only' },
  ],
};

const svgEscape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
const X0 = -720; const X1 = 110; const Z0 = -690; const Z1 = 120; const W = 1460; const H = 940;
const px = (x) => 80 + ((x - X0) / (X1 - X0)) * 1030;
const py = (z) => 100 + ((z - Z0) / (Z1 - Z0)) * 730;
const assetStyle = (asset) => asset.id.includes('DISTRICT') ? ['#344d67', '#83b5db']
  : asset.id.startsWith('TE-') ? ['#344d3b', '#8bc68a'] : ['#4b455c', '#c3b2e8'];
const rectangles = assets.map((asset) => { const [fill, stroke] = assetStyle(asset); const b = asset.bounds; return `<rect x="${px(b.minX)}" y="${py(b.minZ)}" width="${px(b.maxX) - px(b.minX)}" height="${py(b.maxZ) - py(b.minZ)}" fill="${fill}" fill-opacity="0.55" stroke="${stroke}" stroke-width="1.3"/><text x="${px(b.minX) + 4}" y="${py(b.minZ) + 15}" class="asset">${svgEscape(asset.id)}</text>`; }).join('');
const pointById = (id) => stations.find((station) => station.id === id).point;
const line = (from, to, color, dash = '') => `<line x1="${px(from[0])}" y1="${py(from[2])}" x2="${px(to[0])}" y2="${py(to[2])}" stroke="${color}" stroke-width="4" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
const trunkLines = network.existingReferenceTrunks.map((edge) => line(pointById(edge.from), pointById(edge.to), '#45d4ba')).join('');
const spurLines = network.interfaceSpurs.map((edge) => line(pointById(edge.from), pointById(edge.to), '#ffbd59', '10 7')).join('');
const stationMarks = stations.map((station) => `<circle cx="${px(station.point[0])}" cy="${py(station.point[2])}" r="6" fill="#f8fafc" stroke="#0b1220" stroke-width="2"/><text x="${px(station.point[0]) + 9}" y="${py(station.point[2]) - 8}" class="station">${svgEscape(station.id)}</text>`).join('');
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">Town outer-loop and spur network source-bound inventory</title>
  <desc id="desc">A read-only map of current town anchors, cataloged district and road ownership fabric, preserved existing trunks, and held cross-area interface spurs.</desc>
  <style>.title{font:700 28px system-ui;fill:#eef6ff}.sub{font:15px system-ui;fill:#c9d8e7}.asset{font:10px ui-monospace,monospace;fill:#e4eef8}.station{font:11px ui-monospace,monospace;fill:#f8fafc}.key{font:13px system-ui;fill:#d5e3ee}</style>
  <rect width="${W}" height="${H}" fill="#101923"/>
  <text x="50" y="44" class="title">Town outer-loop / spur network — current-source inventory</text>
  <text x="50" y="70" class="sub">${svgEscape(rel(SNAPSHOT))} • catalog-bound preservation map • north is up (-Z) • no construction authority</text>
  <rect x="60" y="82" width="1080" height="770" fill="#172432" stroke="#60809a"/>
  ${rectangles}${trunkLines}${spurLines}${stationMarks}
  <rect x="1170" y="110" width="250" height="470" rx="12" fill="#1d2a39" stroke="#60809a"/>
  <text x="1195" y="145" class="key">Legend</text>
  <line x1="1195" y1="175" x2="1240" y2="175" stroke="#45d4ba" stroke-width="4"/><text x="1250" y="180" class="key">existing reference trunk</text>
  <line x1="1195" y1="208" x2="1240" y2="208" stroke="#ffbd59" stroke-width="4" stroke-dasharray="10 7"/><text x="1250" y="213" class="key">held interface spur</text>
  <rect x="1195" y="232" width="22" height="15" fill="#344d67" stroke="#83b5db"/><text x="1227" y="245" class="key">district envelope</text>
  <rect x="1195" y="258" width="22" height="15" fill="#344d3b" stroke="#8bc68a"/><text x="1227" y="271" class="key">Town Expansion fabric</text>
  <rect x="1195" y="284" width="22" height="15" fill="#4b455c" stroke="#c3b2e8"/><text x="1227" y="297" class="key">cataloged road/path</text>
  <text x="1195" y="338" class="key">Stage sequence</text>
  <text x="1195" y="363" class="key">0 inventory + bind</text>
  <text x="1195" y="388" class="key">1 retain/rebind trunks</text>
  <text x="1195" y="413" class="key">2 protect outer reserve</text>
  <text x="1195" y="438" class="key">3 contract interfaces</text>
  <text x="1195" y="463" class="key">4 one guarded delta</text>
  <text x="85" y="885" class="sub">Key constraint: the apparent west/south exterior overlaps TE-PAN-RV01-ROAD, TE-WL-PARKWAY-EXTENSION, crater-lake, Harborlight, and TE-ROAD-01 registered fabric. It is not blank terrain.</text>
</svg>\n`;

const base = {
  schemaVersion: 1,
  id: 'TOWN-OUTER-LOOP-SPUR-NETWORK-01',
  status: 'SOURCE_BOUND_STAGED_NETWORK_DESIGN_ONLY',
  source: { snapshot: rel(SNAPSHOT), captureManifestSha256: sha(captureBytes), capturedAtUtc: capture.capturedAtUtc, database: rel(DATABASE), databaseSha256: sha(dbBytes) },
  stations, assets, network,
  nonClaims: ['no current public-route certification', 'no passenger-rail alignment', 'no venue egress certification', 'no ownership transfer', 'no operation package or world mutation'],
  worldMutationsPerformed: false, liveCallsPerformed: false, mutationAuthority: false,
};
const report = { ...base, reportIdentitySha256: sha(`${JSON.stringify(base, null, 2)}\n`) };
fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(path.join(abs(OUT), 'town-outer-loop-spur-network.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(abs(OUT), 'town-outer-loop-spur-network-map.svg'), svg);
const stationRows = stations.map((station) => `| ${station.id} | ${station.point.join(', ')} | ${station.role} | ${station.owner} |`).join('\n');
fs.writeFileSync(path.join(abs(OUT), 'TOWN-OUTER-LOOP-SPUR-NETWORK-01.md'), `# Town outer-loop / spur network 01\n\n**Status:** \`${report.status}\`  \n**Mode:** source-bound, read-only network design; no live query, operation file, or world mutation.\n\n![Town outer-loop / spur inventory](town-outer-loop-spur-network-map.svg)\n\n## Stations\n\n| ID | Coordinate | Function | Current owner/reference |\n| --- | --- | --- | --- |\n${stationRows}\n\n## Network disposition\n\nThe existing North, Ravensreach, and Approach trunks are retained **reference corridors**, not newly commissioned public routes. The three dashed spurs are exact endpoint pairs for separate interface contracts; they are not permission to build through thresholds.\n\nThe apparent west/south exterior is already Town Expansion fabric: \`TE-PAN-RV01-ROAD\`, \`TE-WL-PARKWAY-EXTENSION\`, \`TE-WESTLIGHT-CRATER-LAKE\`, \`TE-WL-HARBORLIGHT\`, and \`TE-ROAD-01\` overlap that search band. The outer-loop proposal therefore preserves/rebinds those records instead of inventing a bypass through them.\n\n## Staged implementation\n\n${network.stages.map((stage) => `${stage.order}. **${stage.id}** — ${stage.scope} (${stage.physicalWork === false ? 'no physical work' : stage.physicalWork}).`).join('\n')}\n\nThe first physical package is intentionally unspecified: it must originate from one accepted interface contract and a fresh exact-state guarded kernel, not from this map.\n`);
db.close();
console.log(JSON.stringify({ status: report.status, out: rel(OUT), stationCount: stations.length, assetCount: assets.length, mutationAuthority: false }, null, 2));
