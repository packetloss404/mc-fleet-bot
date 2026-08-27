#!/usr/bin/env node
/**
 * Read-only MP09 screen for a new Ravensgate route/support micro-scope.
 * It binds the most recent Ravensgate post source, rechecks the sole remaining
 * Stoa-to-Tempietto alignment, and does not emit operations for a hydrologic
 * or interface problem disguised as paving.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, boundsOf, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-sweep3-post-20260825T164707Z');
const OWNERSHIP = value('--ownership', 'data/world-review/ravensgate-ownership-contract-20260825/ravensgate-ownership-contract.json');
const OUT = value('--out', 'data/world-review/mp09-ravensgate-current-micro-scope-02-20260826T091500Z.json');
const GENERATED_AT = value('--generated-at', '2026-08-26T09:15:00Z');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const nameOf = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(nameOf(state));
const isFluid = (state) => FLUID.has(nameOf(state)) || state.includes('waterlogged=true');
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const cache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};

/* The prior compiler's only route-relevant, unbuilt line. The north plaza,
 * NW connection, Bell stair, and Garth surface remain accepted/as-built and
 * are not re-opened as cosmetic candidates. */
const deck = [];
for (let z = -455; z >= -550; z -= 1) for (const x of [-87, -86]) deck.push({ x, y: 67, z });
for (const x of [-87, -86]) deck.push({ x, y: 68, z: -551 }, { x, y: 69, z: -552 });
const liner = [];
for (let z = -458; z >= -550; z -= 1) for (const x of [-87, -86]) liner.push({ x, y: 66, z });
const headroomFailures = [];
const floorFailures = [];
const supportFailures = [];
for (const floor of deck) {
  const [floorState, feet, head, below] = await Promise.all([
    stateAt(floor), stateAt({ x: floor.x, y: floor.y + 1, z: floor.z }),
    stateAt({ x: floor.x, y: floor.y + 2, z: floor.z }), stateAt({ x: floor.x, y: floor.y - 1, z: floor.z }),
  ]);
  if (!isAir(feet) || !isAir(head)) headroomFailures.push({ floor, feet, head });
  if (!['minecraft:grass_block', 'minecraft:dirt', 'minecraft:stone_bricks'].includes(nameOf(floorState))) floorFailures.push({ floor, floorState });
  if (isAir(below) || isFluid(below)) supportFailures.push({ floor, below });
}
const linerStates = [];
for (const cell of liner) linerStates.push({ cell, state: await stateAt(cell) });
const linerWater = linerStates.filter(({ state }) => state === 'minecraft:water[level=0]');
const linerOther = linerStates.filter(({ state }) => state !== 'minecraft:water[level=0]');
const interaction = uniqueCells([...deck, ...liner]);
const halo = uniqueCells(interaction.flatMap((cell) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
  return cells;
})).filter((cell) => !new Set(interaction.map(cellKey)).has(cellKey(cell)));
const haloFluid = [];
for (const cell of halo) {
  const state = await stateAt(cell);
  if (isFluid(state)) haloFluid.push({ cell, state });
}
const interactionKeys = new Set([...interaction, ...halo].map(cellKey));
const storedBlockEntities = [];
const interactionBounds = boundsOf([...interaction, ...halo]);
for (let chunkX = Math.floor(interactionBounds.minX / 16); chunkX <= Math.floor(interactionBounds.maxX / 16); chunkX += 1) {
  for (let chunkZ = Math.floor(interactionBounds.minZ / 16); chunkZ <= Math.floor(interactionBounds.maxZ / 16); chunkZ += 1) {
    const chunk = await reader.chunk(chunkX, chunkZ);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (interactionKeys.has(cellKey(cell))) storedBlockEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
    }
  }
}
const ownership = JSON.parse(fs.readFileSync(absolute(OWNERSHIP), 'utf8'));
const interfaceNames = (ownership.interfaces ?? []).map(({ id, name }) => ({ id, name }));
const longWaterContract = interfaceNames.filter(({ id, name }) => /long|water|tempietto/i.test(`${id} ${name}`));
const entitiesPath = path.join(SNAPSHOT, 'entities');
const hasImmutableEntitiesPlane = fs.existsSync(absolute(entitiesPath));
const routeStations = [];
for (let z = -454; z >= -550; z -= 1) routeStations.push({ x: -87, y: 68, z });
routeStations.push({ x: -87, y: 69, z: -551 }, { x: -87, y: 70, z: -552 });
const gradeTransitions = [];
for (let i = 1; i < routeStations.length; i += 1) {
  const prior = routeStations[i - 1]; const next = routeStations[i];
  gradeTransitions.push({ from: prior, to: next, horizontal: Math.abs(prior.x - next.x) + Math.abs(prior.z - next.z), rise: Math.abs(prior.y - next.y) });
}
const report = {
  schemaVersion: 1,
  id: 'MP09-RAVENSGATE-CURRENT-MICRO-SCOPE-02',
  generatedAtUtc: GENERATED_AT,
  status: 'NO_DRY_OWNED_ROUTE_OR_SUPPORT_MICRO_SCOPE_ON_CURRENT_RAVENSGATE_EVIDENCE',
  source: {
    snapshot: relative(SNAPSHOT),
    role: 'newest Ravensgate post-state (Garth plaza release)',
    regionPresent: fs.existsSync(absolute(path.join(SNAPSHOT, 'region'))),
    entitiesPresent: hasImmutableEntitiesPlane,
    limitation: hasImmutableEntitiesPlane
      ? 'The immutable entities plane supports offline design review, but does not replace a same-moment live-entity clearance for any future operation.'
      : 'The post source covers current block state but has no immutable entities plane for a new package; release-specific historical entity gates do not clear a future operation.',
  },
  preservedCompletedScopes: {
    northWestGarthArrival: 'as-built CIRC-RG-SURFACE-02 / RAVENSGATE-NEXT-01; no defect-backed delta reopened',
    garthStatuePlaza: 'as-built RAVENSGATE-NEXT-02; lighting-only release left route geometry unchanged',
    bellGate: 'as-built CIRC-RG-BELL-01; no defect-backed delta reopened',
  },
  longWaterScreen: {
    routeDeck: { cellCount: deck.length, coordinateSetSha256: hashCells(deck) },
    exactHeadroomFailures: { cellCount: headroomFailures.length, cells: headroomFailures, coordinateSetSha256: hashCells(headroomFailures.map(({ floor }) => floor)) },
    floorFailures,
    supportFailures,
    waterTableLiner: { candidateCellCount: liner.length, exactSourceWaterCells: linerWater.length, nonSourceWaterCells: linerOther, coordinateSetSha256: hashCells(liner) },
    interactionHaloFluid: { cellCount: haloFluid.length, sample: haloFluid.slice(0, 24) },
    storedBlockEntities,
    grade: { transitions: gradeTransitions, normalWalkGeometryOnly: gradeTransitions.every(({ horizontal, rise }) => horizontal === 1 && rise <= 1), limitation: 'Geometry does not cure a blocked northern headroom interface or authorize water displacement/containment.' },
  },
  ownershipAndHydrology: {
    ownershipContract: relative(OWNERSHIP),
    matchingLongWaterInterfaceContracts: longWaterContract,
    status: longWaterContract.length === 0 ? 'NO_EXACT_LONG_WATER_HYDROLOGY_OR_DISPLACEMENT_CONTRACT' : 'REVIEW_REQUIRED',
    rule: 'The existing contract resolves Garth/library/storehouse/pavilion interfaces but does not assign a new water-table liner, side-flow, or Tempietto grade/landing treatment.',
  },
  decision: {
    forwardOperationCount: 0,
    rollbackOperationCount: 0,
    result: 'NO_PACKAGE_EMITTED',
    exactHold: `The only route-relevant unbuilt alignment has structural headroom failures at its northern entry, water occupying the walking/headroom band, and a candidate liner that would replace ${linerWater.length} source-water cells while fluid remains in its interaction halo. There is no exact Long Water hydrology/ownership contract.${hasImmutableEntitiesPlane ? ' The source entities plane is design evidence only; it does not replace immediate live clearance.' : ' The newest block source lacks entities/.'}`,
    nextPrerequisite: 'A fresh complete source (region plus entities) and an owned bridge/grade + closed-basin hydrology design that proves containment, side-flow, landing geometry, inverse, and two-direction route acceptance.',
  },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
report.identitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  report: OUT,
  deckCells: deck.length,
  headroomFailures: headroomFailures.length,
  linerSourceWaterCells: linerWater.length,
  haloFluidCells: haloFluid.length,
  storedBlockEntities: storedBlockEntities.length,
  entitiesPlane: report.source.entitiesPresent,
  longWaterOwnershipContracts: longWaterContract.length,
  operations: 0,
}, null, 2));
