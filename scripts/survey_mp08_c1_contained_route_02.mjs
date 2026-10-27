#!/usr/bin/env node
/**
 * MP08 C1 contained-route screen 02
 *
 * Read-only, source-bound screening of Raven Rock's nominal C1 A–B corridor.
 * It does not emit operations.  A dry walking strip is insufficient: this
 * script rejects the scope unless the same profile has a unique floor, roof,
 * and independently defined end interfaces.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import { AnvilReader, boundsOf, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp07-full-circulation-post-20260826T141000Z');
const OUT = value('--out', 'data/world-review/mp08-c1-contained-route-screen-02-mp07-post-20260826T141000Z');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (content) => crypto.createHash('sha256').update(content).digest('hex');
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand',
  'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil',
  'minecraft:damaged_anvil', 'minecraft:dragon_egg', 'minecraft:pointed_dripstone',
  'minecraft:scaffolding',
]);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:furnace',
  'minecraft:blast_furnace', 'minecraft:smoker', 'minecraft:hopper', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive', 'minecraft:bee_nest',
  'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf', 'minecraft:command_block',
  'minecraft:chain_command_block', 'minecraft:repeating_command_block',
  'minecraft:structure_block', 'minecraft:jigsaw',
]);
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(blockName(state));
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(blockName(state)) || blockName(state).endsWith('_concrete_powder');
const isForbidden = (state) => FORBIDDEN.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const zRange = (start, end) => Array.from({ length: end - start + 1 }, (_, index) => start + index);
const escape = (text) => String(text).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

const capturePath = absolute(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
if (!fs.existsSync(capturePath)) throw new Error(`MP08 C1 screen requires capture manifest: ${capturePath}`);
const capture = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
if (!capture.immutableCopy) throw new Error('MP08 C1 screen requires immutable capture');
const memberKinds = new Set(capture.requiredMembers.map(({ path: memberPath }) => memberPath.split('/', 1)[0]));
for (const required of ['region', 'entities', 'poi']) {
  if (!memberKinds.has(required)) throw new Error(`MP08 C1 screen lacks complete ${required} plane`);
}
if (!capture.requiredMembers.some(({ path: memberPath }) => memberPath === 'level.dat')) throw new Error('MP08 C1 screen lacks level.dat');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const cache = new Map();
const stateAt = async (x, y, z) => {
  const key = `${x},${y},${z}`;
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(x, y, z)));
  return cache.get(key);
};
const stationRecords = [];
for (const z of zRange(15, 70)) {
  const validFloors = [];
  for (let floorY = -20; floorY <= 12; floorY += 1) {
    const triples = await Promise.all([-1, 0, 1].map(async (x) => ({
      support: await stateAt(x, floorY, z),
      feet: await stateAt(x, floorY + 1, z),
      head: await stateAt(x, floorY + 2, z),
    })));
    if (triples.every(({ support, feet, head }) => !isAir(support) && !isFluid(support) && isAir(feet) && isAir(head))) validFloors.push(floorY);
  }
  const canonicalFloorY = z <= 26 ? -12 : z <= 54 ? -11 : -10;
  const verticalOpenCells = [];
  for (let x = -1; x <= 1; x += 1) {
    let clearRun = 0;
    for (let y = canonicalFloorY + 1; y <= canonicalFloorY + 14; y += 1) {
      if (isAir(await stateAt(x, y, z))) clearRun += 1;
      else break;
    }
    if (clearRun >= 3) verticalOpenCells.push({ x, clearRun });
  }
  stationRecords.push({ z, canonicalFloorY, validFloors, verticalOpenCells });
}
const canonicalCells = uniqueCells(stationRecords.flatMap(({ z, canonicalFloorY }) => [-1, 0, 1].flatMap((x) => [
  { x, y: canonicalFloorY, z }, { x, y: canonicalFloorY + 1, z }, { x, y: canonicalFloorY + 2, z },
])));
const canonicalRecords = [];
for (const cell of canonicalCells) canonicalRecords.push({ cell, state: await stateAt(cell.x, cell.y, cell.z) });
const hazards = canonicalRecords.filter(({ state }) => isFluid(state) || isGravity(state) || isForbidden(state));
const ambiguousStations = stationRecords.filter(({ validFloors }) => validFloors.length !== 1);
const roofOpenStations = stationRecords.filter(({ verticalOpenCells }) => verticalOpenCells.length > 0);
const interfaces = [];
for (const { id, z, outwardZ, floorY } of [
  { id: 'Cavern-A / C1 west threshold', z: 15, outwardZ: 14, floorY: -12 },
  { id: 'C1 east / Cavern-B threshold', z: 70, outwardZ: 71, floorY: -10 },
]) {
  const openCrossingCells = [];
  for (let x = -1; x <= 1; x += 1) {
    for (const y of [floorY + 1, floorY + 2]) {
      if (isAir(await stateAt(x, y, outwardZ))) openCrossingCells.push({ x, y, z: outwardZ });
    }
  }
  interfaces.push({ id, canonicalStation: { z, floorY }, outwardZ, openCrossingCells, sealedVestibuleProved: false });
}
const fullCoreBounds = boundsOf(canonicalCells);
const fullCoreKeys = new Set(canonicalCells.map(cellKey));
const chunks = new Set(canonicalCells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const blockEntities = [];
for (const key of chunks) {
  const [chunkX, chunkZ] = key.split(',').map(Number);
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (fullCoreKeys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
  }
}
const db = new Database(absolute('data/world-map.db'), { readonly: true });
const catalogThresholds = db.prepare(`
  SELECT id, name, geometry_json, source, source_ref, confidence, attributes_json
  FROM world_features
  WHERE project_id = 'raven-rock' AND name IN ('C1 / Cavern A Threshold', 'C1 / Cavern B Threshold')
  ORDER BY name
`).all().map((row) => ({
  ...row,
  geometry: JSON.parse(row.geometry_json),
  attributes: JSON.parse(row.attributes_json),
}));
db.close();
const status = 'HOLD_NO_DRY_CONTAINED_C1_COMPONENT';
const report = {
  schemaVersion: 1,
  id: 'MP08-C1-CONTAINED-ROUTE-SCREEN-02',
  generatedAtUtc: new Date().toISOString(),
  status,
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false },
  source: {
    snapshot: relative(SNAPSHOT),
    captureId: capture.captureId,
    capturedAtUtc: capture.capturedAtUtc,
    immutableCopy: capture.immutableCopy,
    completePlanes: ['region', 'entities', 'poi', 'level.dat'],
    requiredMemberCount: capture.requiredMembers.length,
    captureManifestSha256: sha256(fs.readFileSync(capturePath)),
  },
  screen: {
    nominalOwner: 'RR-C1 / A–B Inter-Cavern Corridor',
    profile: { x: [-1, 1], z: [15, 70], expectedStations: 56, canonicalCells: canonicalCells.length, coordinateSetSha256: hashCells(canonicalCells), stations: stationRecords },
    dryThreeWideWalkingEnvelope: { stationsPassingCanonicalSupportAndTwoClear: 56, hazardCount: hazards.length, blockEntityCount: blockEntities.length },
    containment: {
      stationsWithMoreThanOneValidFloor: ambiguousStations.map(({ z, validFloors }) => ({ z, validFloors })),
      verticallyOpenStations: roofOpenStations.map(({ z, canonicalFloorY, verticalOpenCells }) => ({ z, canonicalFloorY, verticalOpenCells })),
      endInterfaces: interfaces,
    },
  },
  authority: {
    catalogThresholds: catalogThresholds.map(({ id, name, geometry, source, source_ref, confidence, attributes }) => ({
      id, name, geometry, source, sourceRef: source_ref, confidence,
      provenanceConfidence: attributes.provenanceConfidence ?? null,
      exact3DOwnershipContractPresent: false,
    })),
    conclusion: 'The catalog names two point thresholds but supplies no accepted exact 3D owner, vestibule, roof, wall, drainage, or return-path contract for C1/Cavern A/Cavern B.',
  },
  decision: {
    releaseCandidate: null,
    blockers: [
      `Canonical three-wide strip is dry at 56/56 stations, but ${ambiguousStations.length} station(s) have multiple valid floor elevations: ${ambiguousStations.map(({ z }) => z).join(', ')}.`,
      `The intended envelope is vertically open above the walking space at ${roofOpenStations.length}/56 stations; it is a cavern volume, not a roofed/contained corridor.`,
      `Both end interfaces are open to Caverns A/B (${interfaces.map(({ id, openCrossingCells }) => `${id}: ${openCrossingCells.length} open crossing cells`).join('; ')}), without a selected vestibule/closure design.`,
      'No accepted exact 3D C1/Cavern A/Cavern B ownership and transition contract is present; threshold catalog points are historical region-scan evidence with creative-approximation provenance, not mutation authority.',
    ],
    requiredIntegratedDesign: [
      'Select and own a unique 3-wide by 3-high C1 profile through every station, including the multi-floor opening stations.',
      'Specify every roof, wall, vestibule/door, drainage, lighting, return-path, and protected-interface cell for both C1/Cavern-A and C1/Cavern-B thresholds.',
      'Bind that design to a fresh complete source, exact forward/rollback states, and normal-walk proof before requesting a guarded release kernel.',
    ],
  },
  nonClaims: [
    'C1 is not commissioned as a contained, public, accessibility, egress, or emergency route.',
    'No C2, Cavern C, RR-N6, T4, water-table, or containment modification is proposed.',
    'This report does not authorize any world mutation.',
  ],
};
report.identitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);

const outputDirectory = absolute(OUT);
fs.mkdirSync(outputDirectory, { recursive: true });
const jsonPath = path.join(outputDirectory, 'mp08-c1-contained-route-screen-02.json');
const svgPath = path.join(outputDirectory, 'mp08-c1-containment-and-interface-map.svg');
const mdPath = path.join(outputDirectory, 'MP08-C1-CONTAINED-ROUTE-SCREEN-02.md');
const stationX = (z) => 70 + ((z - 15) / 55) * 980;
const floorY = (y) => 235 - ((y + 12) * 21);
const floorLine = stationRecords.map(({ z, canonicalFloorY }) => `${stationX(z)},${floorY(canonicalFloorY)}`).join(' ');
const multiDots = ambiguousStations.map(({ z, validFloors }) => validFloors.map((y) => `<circle cx="${stationX(z)}" cy="${floorY(y)}" r="6" fill="#ef4444"/>`).join('')).join('');
const openBars = roofOpenStations.map(({ z, canonicalFloorY }) => `<line x1="${stationX(z)}" y1="${floorY(canonicalFloorY + 1)}" x2="${stationX(z)}" y2="56" stroke="#f59e0b" stroke-width="2" opacity=".45"/>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="390" viewBox="0 0 1120 390" role="img" aria-labelledby="title desc">
<title id="title">MP08 C1 containment screen</title><desc id="desc">Dry three-wide floor profile between Cavern A and Cavern B, with vertical cavern openings and ambiguous floor elevations.</desc>
<rect width="1120" height="390" fill="#101827"/><text x="70" y="32" fill="#f8fafc" font-family="sans-serif" font-size="20" font-weight="700">MP08 C1: dry walking strip is not a contained route</text>
<text x="70" y="57" fill="#cbd5e1" font-family="sans-serif" font-size="13">Current immutable MP07 post source · x = −1..1 · z = 15..70 · no operations emitted</text>
<line x1="70" y1="270" x2="1050" y2="270" stroke="#64748b"/><line x1="70" y1="78" x2="70" y2="270" stroke="#64748b"/>
<text x="20" y="246" fill="#94a3b8" font-family="sans-serif" font-size="12">y −12</text><text x="20" y="225" fill="#94a3b8" font-family="sans-serif" font-size="12">y −11</text><text x="20" y="204" fill="#94a3b8" font-family="sans-serif" font-size="12">y −10</text>
${openBars}<polyline points="${floorLine}" fill="none" stroke="#22c55e" stroke-width="6" stroke-linejoin="round"/>
${multiDots}<line x1="70" y1="235" x2="28" y2="235" stroke="#38bdf8" stroke-width="4"/><line x1="1050" y1="193" x2="1092" y2="193" stroke="#38bdf8" stroke-width="4"/>
<text x="70" y="305" fill="#e2e8f0" font-family="sans-serif" font-size="14">Cavern A open threshold</text><text x="875" y="305" fill="#e2e8f0" font-family="sans-serif" font-size="14">Cavern B open threshold</text>
<text x="70" y="335" fill="#22c55e" font-family="sans-serif" font-size="13">green: 56/56 dry 3-wide support + 2-clear walking stations</text><text x="70" y="358" fill="#f59e0b" font-family="sans-serif" font-size="13">amber: air continues vertically into cavern (no proven roof)</text><text x="650" y="358" fill="#ef4444" font-family="sans-serif" font-size="13">red: multiple valid floor elevations</text>
</svg>\n`;
const markdown = `# MP08 C1 contained-route screen 02 — no package\n\n**Decision:** \`${status}\`\n\nThis is a read-only re-screen against the current complete MP07 post snapshot. It made no live query, capture, RCON call, operation file, or world mutation.\n\n![C1 containment and interface map](mp08-c1-containment-and-interface-map.svg)\n\n## Current source\n\n- Immutable snapshot: \`${report.source.snapshot}\`\n- Capture: \`${report.source.captureId}\`, captured \`${report.source.capturedAtUtc}\`\n- Complete planes: region, entities, POI, level.dat (${report.source.requiredMemberCount} required members)\n- Capture-manifest SHA-256: \`${report.source.captureManifestSha256}\`\n\n## What is physically present\n\nThe nominal C1 centre strip at x = −1..1 and z = 15..70 has a dry three-wide walking envelope at **56/56 stations**, with two clear cells above its selected lower walking plane. Its 504 tested support/feet/head cells contain **${hazards.length} fluid, gravity, container, or control hazards** and **${blockEntities.length} core block entities**. This is a useful condition observation, not a route acceptance.\n\n## Why no candidate exists\n\n- **${ambiguousStations.length} stations have no unique floor:** ${ambiguousStations.map(({ z, validFloors }) => `z=${z} (${validFloors.join(' / ')})`).join(', ')}.\n- **${roofOpenStations.length}/56 stations are vertically open** above the intended walking envelope; there is no shown continuous roof or contained boundary.\n- Both ends remain open crossings into Cavern A/B rather than tested vestibules: ${interfaces.map(({ id, openCrossingCells }) => `${id} = ${openCrossingCells.length} open crossing cells`).join('; ')}.\n- The catalog has only historical point-threshold records, each with \`creative-approximation\` provenance. It has no accepted exact 3D ownership/interface contract for the route, cavern closures, drainage, or returns.\n\n## Required integrated successor\n\n1. Select one exact 3-wide × 3-high profile, including every multi-floor station.\n2. Design/own every roof, wall, vestibule, door, drainage, lighting, and return-path cell at both Cavern A and Cavern B thresholds.\n3. Bind the complete design to a fresh source and prove exact inverse states plus bidirectional normal walking before physical release.\n\nNo C2, Cavern C, RR-N6, T4, or water-table scope is included or authorized.\n`;
fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(svgPath, svg);
fs.writeFileSync(mdPath, markdown);
console.log(JSON.stringify({ status, out: relative(outputDirectory), sourceCapture: report.source.captureId, dryStations: 56, ambiguousStations: ambiguousStations.map(({ z }) => z), verticallyOpenStations: roofOpenStations.length, blockEntityCount: blockEntities.length, identitySha256: report.identitySha256 }, null, 2));
