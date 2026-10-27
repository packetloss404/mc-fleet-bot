#!/usr/bin/env node
/**
 * MP06-ENDPOINT-BRIDGE-CONTRACT-05
 *
 * Produces a read-only, hash-bound proposed 3-D contract for the only direct
 * elevated crossing between the MP06 endpoint components.  It deliberately
 * does not emit an operation file: adoption of the finite ownership contract
 * and a fresh live release kernel are separate decisions.
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
const OUT = option('--out', 'data/world-review/mp06-endpoint-bridge-contract-05-current-20260826T141000Z');
const absolute = (input) => path.resolve(ROOT, input);
const relative = (input) => path.relative(ROOT, absolute(input)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const digestFile = (input) => sha256(fs.readFileSync(absolute(input)));
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const stateName = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(stateName(state));
const isFluid = (state) => FLUID.has(stateName(state)) || state.includes('waterlogged=true');
const pointKey = ({ x, y, z }) => `${x},${y},${z}`;
const sortPoint = (a, b) => a.x - b.x || a.y - b.y || a.z - b.z;
const range = (start, end) => Array.from({ length: end - start + 1 }, (_, index) => start + index);
const cells = ({ minX, maxX, y, minZ, maxZ }) => range(minX, maxX).flatMap((x) => range(minZ, maxZ).map((z) => ({ x, y, z })));
const bridgeBox = { minX: -267, maxX: -249, minY: 62, maxY: 80, minZ: -504, maxZ: -489 };
const deck = { minX: -264, maxX: -252, y: 71, minZ: -501, maxZ: -493 };
const travelZ = { min: -500, max: -494 };
const deckCells = cells(deck);
const travelDeckCells = cells({ ...deck, minZ: travelZ.min, maxZ: travelZ.max });
const parapetCells = [
  ...cells({ ...deck, y: 72, minZ: -501, maxZ: -501 }),
  ...cells({ ...deck, y: 72, minZ: -493, maxZ: -493 }),
];
const lanternCells = [-262, -258, -254].flatMap((x) => [{ x, y: 73, z: -501 }, { x, y: 73, z: -493 }]);
const westStructuralCap = cells({ minX: -265, maxX: -265, y: 71, minZ: -501, maxZ: -493 });
const westTrafficCap = cells({ minX: -265, maxX: -265, y: 72, minZ: -501, maxZ: -493 });
const eastTrafficCap = cells({ minX: -251, maxX: -251, y: 71, minZ: -501, maxZ: -493 });
const eastHeadroomCap = cells({ minX: -251, maxX: -251, y: 72, minZ: -501, maxZ: -493 });
const lowerFloor = cells({ ...deck, y: 68 });
const lowerBody = cells({ ...deck, y: 69 });
const lowerHead = cells({ ...deck, y: 70 });
const allRequired = [...deckCells, ...parapetCells, ...lanternCells];
const within = ({ x, y, z }) => x >= bridgeBox.minX && x <= bridgeBox.maxX && y >= bridgeBox.minY && y <= bridgeBox.maxY && z >= bridgeBox.minZ && z <= bridgeBox.maxZ;

for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(absolute(path.join(SNAPSHOT, member)))) throw new Error(`incomplete snapshot: ${member}`);
}
const capture = JSON.parse(fs.readFileSync(absolute(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')), 'utf8'));
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const stateCache = new Map();
const stateAt = async (x, y, z) => {
  const key = `${x},${y},${z}`;
  if (!stateCache.has(key)) stateCache.set(key, stateToCommandString(await reader.blockState(x, y, z)));
  return stateCache.get(key);
};
const sampled = async (entries) => Promise.all(entries.map(async (point) => ({ ...point, state: await stateAt(point.x, point.y, point.z) })));
const countState = (entries, expected) => entries.filter(({ state }) => state === expected).length;
const countAir = (entries) => entries.filter(({ state }) => isAir(state)).length;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const [sourceDeck, sourceParapets, sourceLanterns, sourceWestStructural, sourceWestTraffic, sourceEastTraffic, sourceEastHeadroom, sourceLowerFloor, sourceLowerBody, sourceLowerHead] = await Promise.all([
  sampled(deckCells), sampled(parapetCells), sampled(lanternCells), sampled(westStructuralCap), sampled(westTrafficCap), sampled(eastTrafficCap), sampled(eastHeadroomCap), sampled(lowerFloor), sampled(lowerBody), sampled(lowerHead),
]);
assert(countAir(sourceDeck) === deckCells.length, 'source drift: the 117-cell elevated deck volume is no longer completely air');
assert(countAir(sourceParapets) === parapetCells.length, 'source drift: a parapet target is not air');
assert(countAir(sourceLanterns) === lanternCells.length, 'source drift: a lantern target is not air');
assert(countState(sourceWestStructural, 'minecraft:stone_bricks') === westStructuralCap.length, 'source drift: west structural cap is not complete stone bricks');
assert(countState(sourceWestTraffic, 'minecraft:gray_concrete') === westTrafficCap.length, 'source drift: west traffic cap is not complete gray concrete');
assert(countState(sourceEastTraffic, 'minecraft:gray_concrete') === eastTrafficCap.length, 'source drift: east traffic cap is not complete gray concrete');
assert(countAir(sourceEastHeadroom) === eastHeadroomCap.length, 'source drift: east traffic cap headroom is not clear');
assert(countState(sourceLowerFloor, 'minecraft:gray_concrete') === lowerFloor.length, 'source drift: lower-road floor is not complete gray concrete');
assert(countAir(sourceLowerBody) === lowerBody.length && countAir(sourceLowerHead) === lowerHead.length, 'source drift: lower-road two-block clearway is not complete');

const blockEntities = [];
const savedEntities = [];
for (let chunkX = Math.floor(bridgeBox.minX / 16); chunkX <= Math.floor(bridgeBox.maxX / 16); chunkX += 1) for (let chunkZ = Math.floor(bridgeBox.minZ / 16); chunkZ <= Math.floor(bridgeBox.maxZ / 16); chunkZ += 1) {
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
const fluidCells = [];
for (let x = bridgeBox.minX; x <= bridgeBox.maxX; x += 1) for (let y = bridgeBox.minY; y <= bridgeBox.maxY; y += 1) for (let z = bridgeBox.minZ; z <= bridgeBox.maxZ; z += 1) {
  const state = await stateAt(x, y, z);
  if (isFluid(state)) fluidCells.push({ x, y, z, state });
}
assert(blockEntities.length === 0 && savedEntities.length === 0 && fluidCells.length === 0, 'source drift: local block entity, saved entity, or fluid exists in the bridge design box');

const intended = [
  ...deckCells.map((point) => ({ ...point, source: 'minecraft:air', desired: 'minecraft:gray_concrete', role: 'elevated_deck' })),
  ...parapetCells.map((point) => ({ ...point, source: 'minecraft:air', desired: 'minecraft:polished_andesite', role: 'edge_parapet' })),
  ...lanternCells.map((point) => ({ ...point, source: 'minecraft:air', desired: 'minecraft:lantern[hanging=false,waterlogged=false]', role: 'edge_lighting' })),
].sort(sortPoint);
const intendedByPoint = new Map(intended.map((entry) => [pointKey(entry), entry.desired]));
const projectedState = async (point) => intendedByPoint.get(pointKey(point)) ?? stateAt(point.x, point.y, point.z);
const projectedAir = async (point) => isAir(await projectedState(point));

const upperNodes = [
  ...range(travelZ.min, travelZ.max).map((z) => ({ x: -265, y: 72, z })),
  ...travelDeckCells,
  ...range(travelZ.min, travelZ.max).map((z) => ({ x: -251, y: 71, z })),
];
const lowerNodes = lowerFloor;
const routeAudit = async (nodes) => {
  const nodeByKey = new Map(nodes.map((point) => [pointKey(point), point]));
  const clear = [];
  for (const point of nodes) {
    const floor = await projectedState(point);
    const body = await projectedAir({ ...point, y: point.y + 1 });
    const head = await projectedAir({ ...point, y: point.y + 2 });
    if (!isAir(floor) && body && head) clear.push(point);
  }
  const clearByKey = new Map(clear.map((point) => [pointKey(point), point]));
  const neighbours = new Map(clear.map((point) => [pointKey(point), []]));
  for (const point of clear) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const candidates = [point.y - 1, point.y, point.y + 1]
      .map((y) => clearByKey.get(pointKey({ x: point.x + dx, y, z: point.z + dz })))
      .filter(Boolean);
    for (const candidate of candidates) neighbours.get(pointKey(point)).push(candidate);
  }
  const component = new Set();
  if (clear.length) {
    const queue = [clear[0]];
    component.add(pointKey(clear[0]));
    while (queue.length) {
      const current = queue.shift();
      for (const next of neighbours.get(pointKey(current))) if (!component.has(pointKey(next))) {
        component.add(pointKey(next)); queue.push(next);
      }
    }
  }
  return {
    candidateStations: nodes.length,
    clearStations: clear.length,
    connectedStations: component.size,
    maximumAdjacentRise: 1,
    prohibitedModes: ['jump', 'sprint', 'dig', 'tower'],
    pass: clear.length === nodes.length && component.size === nodes.length,
    nodeByKey,
    neighbours,
  };
};
const [upperAudit, lowerAudit] = await Promise.all([routeAudit(upperNodes), routeAudit(lowerNodes)]);
assert(upperAudit.pass, 'projected upper route does not have complete normal-walk station/headroom connectivity');
assert(lowerAudit.pass, 'lower-road preserved clearway is not internally connected');
const westEndpoints = upperNodes.filter(({ x }) => x === -265);
const eastEndpoints = upperNodes.filter(({ x }) => x === -251);
const reachable = (audit, from, to) => {
  const visited = new Set([pointKey(from)]); const queue = [from];
  while (queue.length) {
    const current = queue.shift();
    if (pointKey(current) === pointKey(to)) return true;
    for (const next of audit.neighbours.get(pointKey(current)) ?? []) if (!visited.has(pointKey(next))) { visited.add(pointKey(next)); queue.push(next); }
  }
  return false;
};
const directedUpperPairs = [];
for (const west of westEndpoints) for (const east of eastEndpoints) {
  directedUpperPairs.push({ from: west, to: east, reachable: reachable(upperAudit, west, east) });
  directedUpperPairs.push({ from: east, to: west, reachable: reachable(upperAudit, east, west) });
}
assert(directedUpperPairs.every(({ reachable: pass }) => pass), 'projected upper endpoint-pair route proof failed');

const sourceGuards = allRequired.map(({ x, y, z }) => ({ x, y, z, state: 'minecraft:air' })).sort(sortPoint);
const protectedInvariants = {
  westStructuralCap: { bounds: { minX: -265, maxX: -265, y: 71, minZ: -501, maxZ: -493 }, expected: 'minecraft:stone_bricks', cells: westStructuralCap.length },
  westTrafficCap: { bounds: { minX: -265, maxX: -265, y: 72, minZ: -501, maxZ: -493 }, expected: 'minecraft:gray_concrete', cells: westTrafficCap.length },
  eastTrafficCap: { bounds: { minX: -251, maxX: -251, y: 71, minZ: -501, maxZ: -493 }, expected: 'minecraft:gray_concrete', cells: eastTrafficCap.length },
  eastHeadroomCap: { bounds: { minX: -251, maxX: -251, y: 72, minZ: -501, maxZ: -493 }, expected: 'minecraft:air', cells: eastHeadroomCap.length },
  lowerRoadFloor: { bounds: { ...deck, y: 68 }, expected: 'minecraft:gray_concrete', cells: lowerFloor.length },
  lowerRoadBody: { bounds: { ...deck, y: 69 }, expected: 'minecraft:air', cells: lowerBody.length },
  lowerRoadHead: { bounds: { ...deck, y: 70 }, expected: 'minecraft:air', cells: lowerHead.length },
};
const candidateContract = {
  schemaVersion: 1,
  id: 'MP06-ENDPOINT-BRIDGE-CONTRACT-05',
  generatedAtUtc: new Date().toISOString(),
  status: 'PROPOSED_EXACT_3D_CONTRACT_PENDING_OWNER_ADOPTION_NO_OPERATIONS',
  liveWorldMutated: false,
  source: {
    snapshot: relative(SNAPSHOT), completeCaptureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc,
    captureManifestSha256: digestFile(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')),
    completeMembersVerified: ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json'],
    freshnessRule: 'This read-only source is only a design baseline. A new complete capture must prove every source guard and invariant immediately before any operation.',
  },
  ownership: {
    programmeOwnerOnly: 'TE-REGIONAL-APPROACH-ROAD',
    disposition: 'The existing programme attribution is not an adopted 3-D property boundary. This document supplies the exact candidate cell set that a designated owner must adopt unchanged or replace with another hash-bound contract.',
    proposedWorkRightOfWay: { cellCount: intended.length, bounds: { minX: -264, maxX: -252, minY: 71, maxY: 73, minZ: -501, maxZ: -493 }, sourceGuards },
    retainedInterfaces: protectedInvariants,
    excludedCells: [
      'All 117 lower-road floor cells at y=68 and all 234 clearway cells at y=69..70 remain protected, not work cells.',
      'No abutment, pier, drain, fill, or support exists below y=71 inside x=-264..-252, z=-501..-493.',
      'No existing cap cell at x=-265 or x=-251 is changed; the west stone-brick/gray-concrete and east gray-concrete seams remain source-retained.',
    ],
  },
  design: {
    paletteDecision: {
      elevatedDeck: 'minecraft:gray_concrete',
      edgeParapet: 'minecraft:polished_andesite',
      edgeLighting: 'minecraft:lantern[hanging=false,waterlogged=false]',
      seamTreatment: 'The west structural stone-brick cap and its y=72 gray-concrete traffic surface remain untouched; the first new deck column begins at x=-264 in gray concrete. The east gray-concrete cap remains untouched.',
    },
    workClasses: {
      elevatedDeck: { cells: deckCells.length, bounds: deck, desired: 'minecraft:gray_concrete' },
      edgeParapets: { cells: parapetCells.length, bounds: { minX: -264, maxX: -252, y: 72, z: [-501, -493] }, desired: 'minecraft:polished_andesite' },
      lighting: { cells: lanternCells.length, locations: lanternCells, desired: 'minecraft:lantern[hanging=false,waterlogged=false]' },
      sideSupport: { cells: 0, decision: 'No under-deck support is allowed in the lower-road clearway. Minecraft blocks are self-supporting; the 26 edge parapet cells are the only side/edge treatment.' },
      drainage: { cells: 0, decision: 'Dry bridge: no water source, waterlogged state, or discharge is allowed anywhere in the work right-of-way or lower clearway. Rain does not place fluid blocks in vanilla Minecraft.' },
    },
    exactIntent: intended,
    exactIntentSha256: sha256(JSON.stringify(intended)),
    rollbackImplication: {
      exactInverse: 'Every one of the 149 listed work cells must restore its recorded minecraft:air source state. No cap, lower-road, support, drainage, or lighting interface may need a compensating rollback.',
      inverseCellCount: intended.length,
      prohibitedRollbackShortcuts: ['fill', 'mass replacement', 'cap rewrite', 'lower-road reconstruction'],
    },
  },
  dualLevelFunctionalProof: {
    elevated: {
      routeClass: 'seven-wide normal-walk crossing from west y=72 to deck/east y=71',
      westEndpoints: westEndpoints.length, eastEndpoints: eastEndpoints.length,
      stations: upperAudit.candidateStations, clearStations: upperAudit.clearStations, connectedStations: upperAudit.connectedStations,
      directedEndpointPairs: directedUpperPairs.length, reachablePairs: directedUpperPairs.filter(({ reachable: pass }) => pass).length,
      maximumAdjacentRise: upperAudit.maximumAdjacentRise, prohibitedModes: upperAudit.prohibitedModes, pass: upperAudit.pass,
    },
    lower: {
      routeClass: 'preserved 13×9 lower-road clearway; this is an interior clearance proof, not a claim of external lower-road endpoint continuity',
      stations: lowerAudit.candidateStations, clearStations: lowerAudit.clearStations, connectedStations: lowerAudit.connectedStations,
      floorState: 'minecraft:gray_concrete', twoBlockHeadroom: true, pass: lowerAudit.pass,
    },
  },
  sourceSafety: { localFluidCells: fluidCells, localBlockEntities: blockEntities, localSavedEntities: savedEntities },
  adoptionAndReleaseGate: [
    'The named MP06/TE owner must adopt this finite right-of-way, palette, retained-interface set, and no-underdeck-support rule or publish a replacement exact contract.',
    'Take a fresh complete immutable source snapshot and prove all 149 source guards, 351 lower-road invariants, 36 cap/headroom interface states, and zero local fluids/block entities/saved entities.',
    'Compile an exact 149-cell forward operation and one-for-one air inverse; run strict parser, source preflight, projected inverse preflight, block-entity audit, and same-moment live-entity clearance.',
    'Execute only with strict-noop journaling, then take a fresh post capture, prove the actual rollback post-state preflight, and independently rerun both-level route QA including all 98 directed upper endpoint pairs.',
  ],
  decision: {
    operationCount: 0,
    conclusion: 'The crossing now has a finite candidate design and rollback shape, but no adopted 3-D ownership contract or fresh live kernel. This document is acceptance-ready for that contract decision only; it is not a release and does not complete MP06.',
  },
};
// The exact mutable-cell intent has its own hash above.  The full JSON can be
// sealed by the adopting owner after adding their identity/signature; do not
// publish a self-referential file hash here.

const image = createCanvas(980, 820);
const ctx = image.getContext('2d');
ctx.fillStyle = '#101923'; ctx.fillRect(0, 0, image.width, image.height);
ctx.font = 'bold 22px sans-serif'; ctx.fillStyle = '#ffffff'; ctx.fillText('MP06 endpoint bridge — proposed exact 3-D contract', 26, 35);
ctx.font = '14px sans-serif'; ctx.fillStyle = '#c5d0dd'; ctx.fillText('Read-only contract screen: 149 proposed work cells; 351 lower-road cells protected; no operations emitted.', 26, 58);
const mx = (x) => 56 + (x + 267) * 42;
const mz = (z) => 102 + (z + 504) * 23;
ctx.fillStyle = '#1f2f3e'; ctx.fillRect(44, 88, 810, 382);
for (let z = -504; z <= -489; z += 1) {
  ctx.fillStyle = '#9fb0c3'; ctx.font = '12px monospace'; ctx.fillText(String(z), 4, mz(z) + 14);
  for (let x = -267; x <= -249; x += 1) {
    const point = { x, y: 71, z }; const current = await stateAt(x, 71, z);
    let colour = isAir(current) ? '#23384a' : current === 'minecraft:stone_bricks' ? '#8c7d70' : current === 'minecraft:gray_concrete' ? '#7b858d' : '#b86666';
    if (intendedByPoint.has(pointKey(point))) colour = '#4a89a8';
    ctx.fillStyle = colour; ctx.fillRect(mx(x), mz(z), 39, 20);
  }
}
ctx.strokeStyle = '#f1c541'; ctx.lineWidth = 2; ctx.strokeRect(mx(-264), mz(-501), 13 * 42 - 3, 9 * 23 - 3);
ctx.fillStyle = '#f1c541'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('117-cell gray-concrete deck', mx(-264), mz(-502));
for (const point of lanternCells) { ctx.fillStyle = '#ffd764'; ctx.fillRect(mx(point.x) + 14, mz(point.z) + 5, 11, 11); }
ctx.fillStyle = '#c5d0dd'; ctx.font = '11px sans-serif';
ctx.fillText('PLAN y=71: brown = retained west structural cap; gray = retained existing traffic cap; blue = proposed deck; yellow dots = lantern positions above edge parapets.', 26, 500);
ctx.fillText('SECTION at z=-497: west deck is y=72; the proposed/east deck is y=71; lower road y=68 stays gray concrete with y=69–70 fully clear.', 26, 527);
const sy = (y) => 775 - (y - 67) * 32;
for (const y of [68, 69, 70, 71, 72, 73]) {
  ctx.fillStyle = '#9fb0c3'; ctx.font = '12px monospace'; ctx.fillText(`y=${y}`, 4, sy(y) + 14);
  for (let x = -267; x <= -249; x += 1) {
    const point = { x, y, z: -497 }; let state = await stateAt(x, y, -497);
    if (intendedByPoint.has(pointKey(point))) state = intendedByPoint.get(pointKey(point));
    const colour = intendedByPoint.has(pointKey(point)) ? '#4a89a8' : isAir(state) ? '#23384a' : state === 'minecraft:stone_bricks' ? '#8c7d70' : state === 'minecraft:gray_concrete' ? '#7b858d' : stateName(state) === 'minecraft:polished_andesite' ? '#6c7b87' : stateName(state) === 'minecraft:lantern' ? '#ffd764' : '#b86666';
    ctx.fillStyle = colour; ctx.fillRect(mx(x), sy(y), 39, 18);
  }
}
ctx.strokeStyle = '#54d4ee'; ctx.strokeRect(mx(-264), sy(70), 13 * 42 - 3, 49);
ctx.fillStyle = '#54d4ee'; ctx.font = '12px sans-serif'; ctx.fillText('Protected lower clearway y=69–70', mx(-264), sy(69) + 29);
fs.mkdirSync(absolute(OUT), { recursive: true });
fs.writeFileSync(absolute(path.join(OUT, 'mp06-endpoint-bridge-contract.json')), `${JSON.stringify(candidateContract, null, 2)}\n`);
fs.writeFileSync(absolute(path.join(OUT, 'mp06-endpoint-bridge-contract-map.png')), image.toBuffer('image/png'));
const report = [
  '# MP06 endpoint bridge — proposed exact 3-D contract', '',
  `**Status:** \`${candidateContract.status}\`  `,
  `**Source:** \`${candidateContract.source.snapshot}\`  `,
  '**Method:** read-only immutable Anvil/entity inspection and deterministic projected route proof. No capture, RCON, fleet, service, database, or Minecraft mutation occurred.', '',
  '![Proposed elevated-crossing contract plan and section](mp06-endpoint-bridge-contract-map.png)', '',
  '## Exact candidate scope', '',
  `The finite proposed right-of-way contains **${intended.length} cells**: ${deckCells.length} new gray-concrete deck cells at \`x=-264..-252, y=71, z=-501..-493\`; ${parapetCells.length} polished-andesite edge-parapet cells at y=72 on z=-501/-493; and ${lanternCells.length} non-hanging lanterns at y=73. Every work cell is source-air and has a recorded one-for-one inverse to air. The exact intended-cell SHA-256 is \`${candidateContract.design.exactIntentSha256}\`.`, '',
  'The palette is intentional: the new deck is gray concrete, matching the east traffic cap and the y=72 west traffic surface. The west structural stone-brick cap remains untouched beneath that west traffic surface; the existing cap material difference is retained as an explicit seam rather than silently rewritten.', '',
  '## Exact retained interfaces and clearance', '',
  `- West: 9 stone-brick structural cells at x=-265/y=71 and 9 gray-concrete traffic cells at x=-265/y=72 are retained.`,
  `- East: 9 gray-concrete traffic cells at x=-251/y=71 and 9 air headroom cells at x=-251/y=72 are retained.`,
  `- Lower road: all ${lowerFloor.length} gray-concrete floor cells at y=68 and all ${lowerBody.length + lowerHead.length} air clearway cells at y=69–70 remain protected. There are **zero** under-deck supports, piers, drains, fills, or abutments.`,
  `- The complete local design box has ${fluidCells.length} fluid cells, ${blockEntities.length} block entities, and ${savedEntities.length} saved entities in this source. All must be rechecked on the fresh execution source.`, '',
  '## Projected two-level functional proof', '',
  `- Elevated crossing: ${upperAudit.clearStations}/${upperAudit.candidateStations} clear normal-walk stations, all ${upperAudit.connectedStations} connected; ${directedUpperPairs.filter(({ reachable: pass }) => pass).length}/${directedUpperPairs.length} directed west/east lane pairs reachable. It has a one-block west descent/ascent, maximum adjacent rise 1, and prohibits jump, sprint, digging, and towers.`,
  `- Lower road: ${lowerAudit.clearStations}/${lowerAudit.candidateStations} floor/headroom stations remain clear and connected at y=68. This is deliberately only an interior clearance proof: no external lower-road endpoint continuity is claimed.`, '',
  '## Ownership, drainage, support, and rollback', '',
  'The existing \`TE-REGIONAL-APPROACH-ROAD\` attribution remains programme-level only. Adoption must name this exact 149-cell work set and the retained cap/lower-road cell sets as its 3-D contract; this document does not manufacture that adoption. Minecraft does not require under-deck support, and the intact lower-road clearway prohibits it. The bridge is dry by contract: no water source, waterlogged state, drain, or discharge is permitted in the work right-of-way.', '',
  `Rollback is exactly ${intended.length} listed cells to their recorded air source states. It may not use fill, mass replacement, cap rewriting, or lower-road reconstruction.`, '',
  '## Release gate', '',
  'No operation file is emitted. A named owner must first adopt this finite contract or publish an exact replacement. Then a fresh complete source must prove all work guards, cap/headroom interfaces, lower-road invariants, and local entity/fluid clearance; the release must use exact forward/inverse operations, strict parser/preflight and same-moment entity gates, journaled strict-noop execution, fresh post capture, rollback-poststate proof, and independent rerun of the two-level QA.', '',
  'This is acceptance-ready for the ownership/contract decision only. It is not a physical release and does not complete MP06.', '',
];
fs.writeFileSync(absolute(path.join(OUT, 'MP06-ENDPOINT-BRIDGE-CONTRACT-05.md')), report.join('\n'));
console.log(`${candidateContract.status}\ncontract=${relative(path.join(OUT, 'mp06-endpoint-bridge-contract.json'))}\nreport=${relative(path.join(OUT, 'MP06-ENDPOINT-BRIDGE-CONTRACT-05.md'))}\nmap=${relative(path.join(OUT, 'mp06-endpoint-bridge-contract-map.png'))}\nworkCells=${intended.length} upperPairs=${directedUpperPairs.filter(({ reachable: pass }) => pass).length}/${directedUpperPairs.length} lower=${lowerAudit.clearStations}/${lowerAudit.candidateStations}`);
