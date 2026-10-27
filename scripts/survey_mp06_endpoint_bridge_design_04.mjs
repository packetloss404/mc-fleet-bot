#!/usr/bin/env node
/**
 * MP06-ENDPOINT-BRIDGE-DESIGN-04
 *
 * Read-only design screen for the only closest connection between the two
 * strict road-material components containing the catalogued Approach Road
 * endpoints. It does not infer that an elevated surface is owned road, and it
 * never emits operations: a grade-separated span needs a completed interface,
 * palette, structural, drainage, and circulation design before it can become
 * a guarded release.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas } from 'canvas';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp07-full-circulation-post-20260826T141000Z');
const OUT = option('--out', 'data/world-review/mp06-endpoint-bridge-design-04-current-20260826T141000Z');
const absolute = (input) => path.resolve(ROOT, input);
const relative = (input) => path.relative(ROOT, absolute(input)).split(path.sep).join('/');
const digest = (input) => crypto.createHash('sha256').update(fs.readFileSync(absolute(input))).digest('hex');
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const stateName = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(stateName(state));
const isFluid = (state) => FLUID.has(stateName(state)) || state.includes('waterlogged=true');
const box = { minX: -267, maxX: -249, minY: 62, maxY: 80, minZ: -504, maxZ: -489 };
const gap = { minX: -264, maxX: -252, y: 71, minZ: -501, maxZ: -493 };
const lowerClearway = { minX: gap.minX, maxX: gap.maxX, floorY: 68, minZ: gap.minZ, maxZ: gap.maxZ };
const cells = (bounds, y = bounds.y) => {
  const result = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) result.push({ x, y, z });
  return result;
};

for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(absolute(path.join(SNAPSHOT, member)))) throw new Error(`incomplete snapshot: ${member}`);
}
const capture = JSON.parse(fs.readFileSync(absolute(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')), 'utf8'));
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const cache = new Map();
const stateAt = async (x, y, z) => {
  const key = `${x},${y},${z}`;
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(x, y, z)));
  return cache.get(key);
};
const within = (point) => point.x >= box.minX && point.x <= box.maxX && point.y >= box.minY && point.y <= box.maxY && point.z >= box.minZ && point.z <= box.maxZ;

const deckGap = await Promise.all(cells(gap).map(async (cell) => ({ ...cell, state: await stateAt(cell.x, cell.y, cell.z) })));
const lowerFloor = await Promise.all(cells(lowerClearway, lowerClearway.floorY).map(async (cell) => ({ ...cell, state: await stateAt(cell.x, cell.y, cell.z) })));
const lowerBody = await Promise.all(cells(lowerClearway, lowerClearway.floorY + 1).map(async (cell) => ({ ...cell, state: await stateAt(cell.x, cell.y, cell.z) })));
const lowerHead = await Promise.all(cells(lowerClearway, lowerClearway.floorY + 2).map(async (cell) => ({ ...cell, state: await stateAt(cell.x, cell.y, cell.z) })));
const fluidCells = [];
for (let x = box.minX; x <= box.maxX; x += 1) for (let y = box.minY; y <= box.maxY; y += 1) for (let z = box.minZ; z <= box.maxZ; z += 1) {
  const state = await stateAt(x, y, z);
  if (isFluid(state)) fluidCells.push({ x, y, z, state });
}
const blockEntities = [];
const savedEntities = [];
for (let chunkX = Math.floor(box.minX / 16); chunkX <= Math.floor(box.maxX / 16); chunkX += 1) for (let chunkZ = Math.floor(box.minZ / 16); chunkZ <= Math.floor(box.maxZ / 16); chunkZ += 1) {
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (within(point)) blockEntities.push({ id: entity.id ?? entity.Id ?? null, ...point });
  }
  const entityChunk = await entityReader.chunk(chunkX, chunkZ);
  for (const entity of entityChunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const [x, y, z] = entity.Pos.map(Number);
    if (within({ x, y, z })) savedEntities.push({ id: entity.id ?? entity.Id ?? null, x, y, z });
  }
}

const westCap = [];
const eastCap = [];
for (let z = gap.minZ; z <= gap.maxZ; z += 1) {
  westCap.push({ x: -265, y: gap.y, z, state: await stateAt(-265, gap.y, z) });
  eastCap.push({ x: -251, y: gap.y, z, state: await stateAt(-251, gap.y, z) });
}
const all = (entries, expected) => entries.every(({ state }) => state === expected);
const result = {
  schemaVersion: 1,
  id: 'MP06-ENDPOINT-BRIDGE-DESIGN-04',
  generatedAtUtc: new Date().toISOString(),
  status: 'SOURCE_BOUND_INTEGRATED_GRADE_SEPARATION_GATE_NO_OPERATIONS',
  liveWorldMutated: false,
  source: {
    snapshot: relative(SNAPSHOT),
    completeCaptureId: capture.captureId,
    capturedAtUtc: capture.capturedAtUtc,
    captureManifestSha256: digest(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')),
    completeMembersVerified: ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json'],
    freshnessRule: 'This is a read-only design source. A new immediate pre-execution complete capture is mandatory before any operation.',
  },
  bridgeGap: {
    adjacentElevatedDeckCaps: {
      west: { edge: { x: -265, y: 71, minZ: -501, maxZ: -493 }, sourceStates: [...new Set(westCap.map(({ state }) => state))] },
      east: { edge: { x: -251, y: 71, minZ: -501, maxZ: -493 }, sourceStates: [...new Set(eastCap.map(({ state }) => state))] },
    },
    unbuiltSpan: { bounds: gap, cellCount: deckGap.length, sourceAirCells: deckGap.filter(({ state }) => isAir(state)).length, sourceNonAirCells: deckGap.filter(({ state }) => !isAir(state)) },
    lowerRoadInvariance: {
      floor: { y: 68, cellCount: lowerFloor.length, grayConcreteCells: lowerFloor.filter(({ state }) => state === 'minecraft:gray_concrete').length },
      body: { y: 69, cellCount: lowerBody.length, airCells: lowerBody.filter(({ state }) => isAir(state)).length },
      head: { y: 70, cellCount: lowerHead.length, airCells: lowerHead.filter(({ state }) => isAir(state)).length },
      interpretation: 'The lower road needs both y=69 and y=70 to stay empty. No pier, fill, drain, or support may be placed in this 13×9 clearway without a separate lower-road migration and route proof.',
    },
    localHazards: { fluidCells, blockEntities, savedEntities },
  },
  ownershipAndDesign: {
    observedProgrammeOwner: 'TE-REGIONAL-APPROACH-ROAD (broad published programme ownership only)',
    missingExactContract: [
      'An exact 3-D road/bridge right-of-way for all 117 deck cells, adjacent cap interface cells, and the lower-road clearance halo.',
      'An accepted palette/transition decision: the west cap is stone bricks and the east cap is gray concrete; source state alone does not choose a bridge material or a retained seam treatment.',
      'A bridge support/edge/drainage/lighting design that preserves the 13×9 lower road clearance and does not turn its active carriageway into a support footprint.',
      'A route contract proving the elevated deck caps are the intended seven-wide Approach Road alignment rather than unrelated roof/plaza fabric.',
    ],
    exactIntegratedGate: {
      candidateClass: 'whole grade-separated road/bridge/crossing package, never a 117-cell floating deck or a local paving fragment',
      requiredPreconditions: [
        'Publish the 3-D interface/ownership and palette contract above, hash-bound to the immediate complete source.',
        'Freeze the full deck, two cap edges, lower-road floor, two-block lower clearance, drainage discharge, lighting, and any side-support/abutment cells as one operation and inverse.',
        'Exclude/migrate every block entity and prove no fluid can enter either deck or lower-road clearance envelope.',
        'Run projected and post-state normal-walk route QA for both levels, including every grade transition, with no jump/sprint/dig/tower.',
      ],
    },
  },
  decision: {
    operationCount: 0,
    reason: 'The 117-air-cell span is the real endpoint-component discontinuity, but its two caps use different materials and it crosses an intact lower road that depends on the full y=69..70 clearway. The source neither grants a 3-D bridge right-of-way nor derives a structural/palette/drainage design. Emitting only deck fills would create an unreviewed floating fragment and is prohibited.',
  },
};

const map = createCanvas(860, 700);
const ctx = map.getContext('2d');
ctx.fillStyle = '#111a26'; ctx.fillRect(0, 0, map.width, map.height);
ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px sans-serif'; ctx.fillText('MP06 Approach Road — elevated crossing / lower-road section', 26, 33);
ctx.font = '14px sans-serif'; ctx.fillStyle = '#cfd8e5'; ctx.fillText(`immutable source: ${path.basename(SNAPSHOT)} · read-only design screen`, 26, 57);
const mx = (x) => 52 + (x - box.minX) * 38;
const mz = (z) => 100 + (z - (-504)) * 22;
ctx.fillStyle = '#202e3c'; ctx.fillRect(42, 86, 742, 358);
ctx.font = '12px monospace';
for (let z = -504; z <= -489; z += 1) {
  ctx.fillStyle = '#9caec0'; ctx.fillText(String(z), 6, mz(z) + 14);
  for (let x = box.minX; x <= box.maxX; x += 1) {
    const state = await stateAt(x, 71, z);
    const block = stateName(state);
    ctx.fillStyle = block === 'minecraft:gray_concrete' ? '#7b858d' : block === 'minecraft:stone_bricks' ? '#8c7d70' : isAir(state) ? '#223648' : '#ab5757';
    ctx.fillRect(mx(x), mz(z), 35, 19);
  }
}
ctx.strokeStyle = '#f0c431'; ctx.lineWidth = 3; ctx.strokeRect(mx(gap.minX), mz(gap.minZ), (gap.maxX - gap.minX + 1) * 38 - 3, (gap.maxZ - gap.minZ + 1) * 22 - 3);
ctx.fillStyle = '#f0c431'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('117-cell open elevated span', mx(-264), mz(-502));
ctx.fillStyle = '#cfd8e5'; ctx.font = '13px sans-serif'; ctx.fillText('PLAN at y=71 · brown = west stone-brick cap · grey = east gray-concrete cap · blue = air · yellow = required whole-span design area', 26, 472);
ctx.fillText('SECTION along z=-497: y=71 is the missing deck; y=68 is an intact lower gray-concrete road; y=69–70 must remain clear.', 26, 500);
const sy = (y) => 640 - (y - 67) * 24;
for (const y of [68, 69, 70, 71]) {
  ctx.fillStyle = '#9caec0'; ctx.font = '12px monospace'; ctx.fillText(`y=${y}`, 6, sy(y) + 12);
  for (let x = -267; x <= -249; x += 1) {
    const state = await stateAt(x, y, -497);
    const block = stateName(state);
    ctx.fillStyle = block === 'minecraft:gray_concrete' ? '#7b858d' : block === 'minecraft:stone_bricks' ? '#8c7d70' : isAir(state) ? '#223648' : '#ab5757';
    ctx.fillRect(mx(x), sy(y), 35, 14);
  }
}
ctx.strokeStyle = '#f0c431'; ctx.strokeRect(mx(-264), sy(71), 13 * 38 - 3, 14);
ctx.strokeStyle = '#4bc0e8'; ctx.strokeRect(mx(-264), sy(70), 13 * 38 - 3, 31);
fs.mkdirSync(absolute(OUT), { recursive: true });
fs.writeFileSync(absolute(path.join(OUT, 'bridge-design.json')), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(absolute(path.join(OUT, 'mp06-elevated-crossing-section-map.png')), map.toBuffer('image/png'));
const markdown = [
  '# MP06 Approach Road endpoint bridge — current-source integrated design gate', '',
  `**Status:** \`${result.status}\`  `,
  `**Source:** \`${result.source.snapshot}\`  `,
  '**Method:** read-only immutable Anvil/entity inspection. No capture, RCON, fleet, database, service, or Minecraft mutation occurred.', '',
  '## The real discontinuity', '',
  'The two strict road-material components containing the Ravensgate and Gatehead endpoint nodes are nearest across a single elevated gap. At `y=71`, a west stone-brick deck edge at `x=-265, z=-501..-493` faces an east gray-concrete deck edge at `x=-251, z=-501..-493`. The intervening `x=-264..-252, y=71, z=-501..-493` volume is exactly **117 air cells**.', '',
  'This is not the earlier shoulder-fragment lane: it is the only nearest endpoint-component discontinuity. It could only be considered as an all-or-nothing grade-separated road/bridge/crossing package.', '',
  '![Elevated crossing plan and section](mp06-elevated-crossing-section-map.png)', '',
  '## Why a deck fill is not a release', '',
  `- The lower road is intact directly below all ${lowerFloor.length} span cells: y=68 is gray concrete ${lowerFloor.filter(({ state }) => state === 'minecraft:gray_concrete').length}/${lowerFloor.length}; both y=69 and y=70 are clear ${lowerBody.filter(({ state }) => isAir(state)).length}/${lowerBody.length} and ${lowerHead.filter(({ state }) => isAir(state)).length}/${lowerHead.length}. A pier, fill, drain, or support in that two-block volume would obstruct the lower route.`,
  `- The deck caps disagree on material (west ${[...new Set(westCap.map(({ state }) => state))].join(', ')}; east ${[...new Set(eastCap.map(({ state }) => state))].join(', ')}). The source cannot choose the bridge palette, seam, rails, drainage, or lighting treatment.`,
  `- The local span box has ${fluidCells.length} fluid cells, ${blockEntities.length} block entities, and ${savedEntities.length} saved entities in this retained source; that local clearance is not an ownership grant and must be repeated immediately before any operation.`,
  '- Broad `TE-REGIONAL-APPROACH-ROAD` attribution is not an exact 3-D right-of-way for the elevated deck, cap interfaces, lower-road clearance, abutments, or discharge.', '',
  '## Exact integrated gate', '',
  'Before any guarded release, publish one hash-bound bridge contract covering the entire 117-cell deck, both cap interfaces, all rails/edge/drainage/lighting/side-support or abutment cells, and the lower-road floor plus two-block clearway invariants. It must establish a material/seam design and prove both the elevated and lower routes with no jump, sprint, digging, tower, clearance loss, or unresolved water discharge. The subsequent physical package must run the full fresh-capture, exact inverse, entity/container, strict-noop, post-capture, rollback-preflight, and independent functional-QA kernel.', '',
  'No operations were emitted. This does not complete MP06.', '',
];
fs.writeFileSync(absolute(path.join(OUT, 'MP06-ENDPOINT-BRIDGE-INTEGRATED-DESIGN-GATE.md')), `${markdown.join('\n')}\n`);
console.log(`${result.status}\nreport=${relative(path.join(OUT, 'MP06-ENDPOINT-BRIDGE-INTEGRATED-DESIGN-GATE.md'))}\nmap=${relative(path.join(OUT, 'mp06-elevated-crossing-section-map.png'))}\ngapAir=${result.bridgeGap.unbuiltSpan.sourceAirCells}/${deckGap.length} lowerClear=${result.bridgeGap.lowerRoadInvariance.body.airCells}/${lowerBody.length}+${result.bridgeGap.lowerRoadInvariance.head.airCells}/${lowerHead.length}`);
