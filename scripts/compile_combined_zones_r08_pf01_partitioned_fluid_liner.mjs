#!/usr/bin/env node
/**
 * Compile the exact EE-PF-01 partitioned dynamic-fluid liner.
 *
 * PF01 contains two distant and physics-independent components: 73 stable
 * lava-source cells and a five-cell flowing-water boundary tail. The lava
 * package closes chamber cells before its outer containment row. The water
 * package follows a proven downstream-to-upstream dependency order while
 * retaining all five external feed cells. Rollback reverses both package and
 * intra-package order exactly.
 *
 * This compiler is offline. It performs no live call or world mutation and
 * does not broaden the generic source-fluid compiler.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
  hashCells,
  replLine,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-21T17:32:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r11b-post-20260821T173605Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r11b-live-20260821T173605Z/post-complete-save-intake.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r08-empty-eight-platform-01-partitioned-fluid-liner',
);

const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const RELEASE_ID = 'CZ-R08L-EE-PF-01-PARTITIONED-FLUID-LINER';
const PLATFORM_ID = 'EE-PF-01';
const LAVA_PACKAGE_KEY = 'ee-pf-01-stable-lava-source-liner';
const WATER_PACKAGE_KEY = 'ee-pf-01-flow-ordered-water-boundary-liner';
const LINER_STATE = 'minecraft:deepslate_tiles';
const LAVA_SOURCE_STATE = 'minecraft:lava[level=0]';
const FACE_NEIGHBOURS_2D = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
];
const FACE_NEIGHBOURS_3D = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
const EXPECTED = Object.freeze({
  fluidCellCount: 78,
  fluidCoordinateSetSha256: 'ced3a061ff951b1091130b0a0cab95076dc3408ffd867e8e2e5dd1ce236693f2',
  lavaCellCount: 73,
  lavaCoordinateSetSha256: '352b745a87b9ff224c987ae68f8f4d2b05ae40bbe1883b0aab6c5374d0cc1aed',
  lavaInsideCellCount: 57,
  lavaInsideCoordinateSetSha256: '5c797c516ec0f0c9f20a7f893c05bcd405e3826c5c2863ec0ad470e29ecf71a5',
  lavaContainmentCellCount: 16,
  lavaContainmentCoordinateSetSha256: 'f2c4f3af192ab6bf28db101c46e2a0282075244dac182334cd406e128772ca54',
  lavaForwardOrderedSha256: '35714d9c46bbdc4ddf7136091d836c737d61d36b21cce6762f56856227ffadd6',
  externalLavaSourceCellCount: 16,
  externalLavaSourceCoordinateSetSha256: 'a3f6aec2442f9495c37489700bc1a8bcee15dd79f11a2e802d226dbb11672368',
  waterCellCount: 5,
  waterCoordinateSetSha256: '057314836ffcdfde085252a093305265de6b3fd31a19f14695841739ad4e533f',
  waterDependencyEdgeCount: 4,
  waterDependencyEdgeSetSha256: 'c02998a5b65facf57a628b45f47e3300dae9211cd567ad32ae93bc74c0171c77',
  waterForwardOrderedSha256: 'a77890eb7cefd6d991d5622280a66d31ac8ebbbc9733cd5684a8e14cef956b53',
  retainedWaterFeedCellCount: 5,
  retainedWaterFeedCoordinateSetSha256: 'd9824289b273ef811fed46fe6a57edac06e7ec01ff5c88dd3c764ce078d69d88',
  sourceStateCensus: {
    'minecraft:lava[level=0]': 73,
    'minecraft:water[level=2]': 1,
    'minecraft:water[level=3]': 1,
    'minecraft:water[level=4]': 1,
    'minecraft:water[level=5]': 1,
    'minecraft:water[level=6]': 1,
  },
});
const RETAINED_WATER_FEED = Object.freeze([
  { cell: { x: 1745, y: 40, z: 54 }, state: 'minecraft:water[level=5]' },
  { cell: { x: 1746, y: 40, z: 54 }, state: 'minecraft:water[level=4]' },
  { cell: { x: 1747, y: 40, z: 54 }, state: 'minecraft:water[level=3]' },
  { cell: { x: 1748, y: 40, z: 54 }, state: 'minecraft:water[level=2]' },
  { cell: { x: 1749, y: 40, z: 54 }, state: 'minecraft:water[level=1]' },
]);
const RETAINED_WATER_ROOT = Object.freeze({
  cell: { x: 1750, y: 40, z: 54 },
  state: 'minecraft:water[level=8]',
  role: 'retained-falling-root-adjacent-to-level-1-feed',
});
const INPUTS = Object.freeze({
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  acceptedPriorManifests: [
    'data/buildops/combined-zones-r01-b11-road.release-manifest.json',
    'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
    'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
    'data/buildops/combined-zones-r05-mountain.release-manifest.json',
    'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
    'data/buildops/combined-zones-r07-b03-portal-tube.release-manifest.json',
    'data/buildops/combined-zones-r07b-b03-viaduct-bents.release-manifest.json',
    'data/buildops/combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z.release-manifest.json',
    'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
    'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
    'data/buildops/combined-zones-r07f-b09-lower-guideway-segment-01.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-03-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-08-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-02-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-04-wet-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-04-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-07-wet-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-07-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-06-dynamic-fluid-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-06-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-05-flow-ordered-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-05-fitout.release-manifest.json',
    'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
    'data/buildops/combined-zones-r09b-b07-lower-spiral-stair.release-manifest.json',
    'data/buildops/combined-zones-r10-cheyenne-secure-gallery.release-manifest.json',
    'data/buildops/combined-zones-r11a-c1-east-highway-pilot.release-manifest.json',
    'data/buildops/combined-zones-r11b-c1-west-highway-extension.release-manifest.json',
  ],
});
const FORBIDDEN_SOURCE_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox',
  'minecraft:beehive', 'minecraft:bee_nest', 'minecraft:decorated_pot',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block',
]);

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08 PF01 partitioned-fluid compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => (
  ['minecraft:water', 'minecraft:lava'].includes(blockName(state))
  || state.includes('waterlogged=true')
);
const waterLevel = (state) => {
  const match = state.match(/^minecraft:water\[level=(\d+)\]$/);
  return match ? Number(match[1]) : null;
};
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
const boxesOverlap = (left, right) => !(
  left.maxX < right.minX || left.minX > right.maxX
  || left.maxY < right.minY || left.minY > right.maxY
  || left.maxZ < right.minZ || left.minZ > right.maxZ
);
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const census = (records, field) => {
  const counts = new Map();
  for (const record of records) counts.set(record[field], (counts.get(record[field]) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
};
const savedEntityInside = (entity, bounds) => {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= bounds.minX && x < bounds.maxX + 1
    && y >= bounds.minY && y < bounds.maxY + 1
    && z >= bounds.minZ && z < bounds.maxZ + 1;
};

function targetIntersections(filename, targets) {
  const targetBounds = boundsOf(targets);
  const hits = new Map();
  for (const [lineIndex, raw] of fs.readFileSync(absolute(filename), 'utf8')
    .split(/\r?\n/).entries()) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename}:${lineIndex + 1} is not a guarded REPL operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates.every(Number.isSafeInteger),
      `${filename}:${lineIndex + 1} has an invalid coordinate`);
    const [x1, y1, z1, x2, y2, z2] = coordinates;
    const operationBounds = {
      minX: Math.min(x1, x2), maxX: Math.max(x1, x2),
      minY: Math.min(y1, y2), maxY: Math.max(y1, y2),
      minZ: Math.min(z1, z2), maxZ: Math.max(z1, z2),
    };
    if (!boxesOverlap(targetBounds, operationBounds)) continue;
    for (const cell of targets) {
      if (insideBounds(cell, operationBounds)) hits.set(cellKey(cell), cell);
    }
  }
  return uniqueCells([...hits.values()]);
}

const emptyEight = readJson(INPUTS.emptyEight);
const protectedRelics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.standingAuthorization);
const intake = readJson(INTAKE_AUDIT);
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not a complete immutable same-moment PASS');
invariant(absolute(intake.input?.suppliedWorldRoot) === absolute(SNAPSHOT),
  'source intake is not bound to the selected snapshot');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
  'source snapshot is missing level.dat');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes?.includes(RELEASE_NODE_ID),
'standing authorization does not cover R08');

const platform = emptyEight.d06.platforms.find(({ id }) => id === PLATFORM_ID);
invariant(platform?.assignedTrack === 1, 'frozen PF01 platform metadata drifted');
const floorBounds = platform.surface.bounds;
const chamberBounds = {
  minX: floorBounds.minX,
  maxX: floorBounds.maxX,
  minY: floorBounds.minY,
  maxY: floorBounds.minY + 5,
  minZ: floorBounds.minZ,
  maxZ: floorBounds.maxZ,
};
const haloBounds = {
  minX: chamberBounds.minX - 1,
  maxX: chamberBounds.maxX + 1,
  minY: chamberBounds.minY - 1,
  maxY: chamberBounds.maxY + 1,
  minZ: chamberBounds.minZ - 1,
  maxZ: chamberBounds.maxZ + 1,
};
const interactionBounds = { ...haloBounds, minZ: 54, maxZ: 64 };
const chamberKeys = new Set(cellsIn(chamberBounds).map(cellKey));
const halo = cellsIn(haloBounds);
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const stateCache = new Map();
async function stateAt(cell) {
  const key = cellKey(cell);
  if (!stateCache.has(key)) {
    stateCache.set(key, stateToCommandString(
      await reader.blockState(cell.x, cell.y, cell.z),
    ));
  }
  return stateCache.get(key);
}

const fluidRecords = [];
const forbiddenInteractionBlocks = [];
for (const cell of cellsIn(interactionBounds)) {
  const sourceState = await stateAt(cell);
  if (insideBounds(cell, haloBounds) && isFluid(sourceState)) {
    fluidRecords.push({
      cell,
      sourceState,
      targetState: LINER_STATE,
      insideChamber: chamberKeys.has(cellKey(cell)),
    });
  }
  if (FORBIDDEN_SOURCE_BLOCKS.has(blockName(sourceState))) {
    forbiddenInteractionBlocks.push({ cell, sourceState });
  }
}
const fluidCells = fluidRecords.map(({ cell }) => cell);
const lavaRecords = fluidRecords.filter(({ sourceState }) => sourceState === LAVA_SOURCE_STATE);
const waterRecords = fluidRecords.filter(({ sourceState }) => waterLevel(sourceState) !== null);
const undeclaredFluidRecords = fluidRecords.filter(({ sourceState }) => !(
  sourceState === LAVA_SOURCE_STATE || waterLevel(sourceState) !== null
));
const lavaInsideRecords = lavaRecords.filter(({ insideChamber }) => insideChamber);
const lavaContainmentRecords = lavaRecords.filter(({ insideChamber }) => !insideChamber);
const sourceStateCensus = census(fluidRecords, 'sourceState');
invariant(fluidRecords.length === EXPECTED.fluidCellCount
  && hashCells(fluidCells) === EXPECTED.fluidCoordinateSetSha256,
'PF01 exact fluid set drifted');
invariant(lavaRecords.length === EXPECTED.lavaCellCount
  && hashCells(lavaRecords.map(({ cell }) => cell)) === EXPECTED.lavaCoordinateSetSha256,
'PF01 stable lava-source component drifted');
invariant(lavaRecords.every(({ sourceState }) => sourceState === LAVA_SOURCE_STATE),
'PF01 lava package contains a flowing or undeclared lava state');
invariant(lavaInsideRecords.length === EXPECTED.lavaInsideCellCount
  && hashCells(lavaInsideRecords.map(({ cell }) => cell))
    === EXPECTED.lavaInsideCoordinateSetSha256,
'PF01 chamber-interior lava partition drifted');
invariant(lavaContainmentRecords.length === EXPECTED.lavaContainmentCellCount
  && hashCells(lavaContainmentRecords.map(({ cell }) => cell))
    === EXPECTED.lavaContainmentCoordinateSetSha256,
'PF01 outer lava containment partition drifted');
invariant(waterRecords.length === EXPECTED.waterCellCount
  && hashCells(waterRecords.map(({ cell }) => cell)) === EXPECTED.waterCoordinateSetSha256,
'PF01 flowing-water boundary tail drifted');
invariant(waterRecords.every(({ sourceState, insideChamber }) => {
  const level = waterLevel(sourceState);
  return !insideChamber && Number.isInteger(level) && level >= 2 && level <= 6;
}), 'PF01 water package contains a source, falling, interior, or undeclared state');
invariant(undeclaredFluidRecords.length === 0,
  `PF01 includes undeclared dynamic fluid states: ${JSON.stringify(undeclaredFluidRecords)}`);
invariant(JSON.stringify(sourceStateCensus) === JSON.stringify(EXPECTED.sourceStateCensus),
  `PF01 source-state census drifted: ${JSON.stringify(sourceStateCensus)}`);
invariant(forbiddenInteractionBlocks.length === 0,
'PF01 retained-feed interaction bounds intersect a container or control block');

// Stable source cells cannot be regenerated by the remaining source cells.
// Close chamber cells first and the z=63 containment row last; exact reverse
// rollback restores that row before reopening the chamber component.
const lavaForwardRecords = lavaRecords.slice().sort((left, right) => (
  Number(right.insideChamber) - Number(left.insideChamber)
  || left.cell.z - right.cell.z
  || right.cell.y - left.cell.y
  || left.cell.x - right.cell.x
));
const lavaForwardOrderedSha256 = sha256(
  `${lavaForwardRecords.map(({ cell }) => cellKey(cell)).join('\n')}\n`,
);
invariant(lavaForwardOrderedSha256 === EXPECTED.lavaForwardOrderedSha256,
'PF01 interior-first lava order drifted');
const lavaKeys = new Set(lavaRecords.map(({ cell }) => cellKey(cell)));
const externalLavaSourceMap = new Map();
for (const { cell } of lavaRecords) {
  for (const [dx, dy, dz] of FACE_NEIGHBOURS_3D) {
    const neighbour = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
    if (lavaKeys.has(cellKey(neighbour))) continue;
    if (await stateAt(neighbour) === LAVA_SOURCE_STATE) {
      externalLavaSourceMap.set(cellKey(neighbour), neighbour);
    }
  }
}
const externalLavaSources = uniqueCells([...externalLavaSourceMap.values()]);
invariant(externalLavaSources.length === EXPECTED.externalLavaSourceCellCount
  && hashCells(externalLavaSources) === EXPECTED.externalLavaSourceCoordinateSetSha256,
'PF01 retained external lava-source boundary drifted');
invariant(externalLavaSources.every((cell) => cell.z === 64),
'PF01 retained external lava sources are not solely beyond the closed z=63 row');

// Derive exact water dependencies. Edges point downstream -> upstream.
const waterTargetByKey = new Map(waterRecords.map((record) => [cellKey(record.cell), record]));
const dependencyEdges = [];
const externalWaterUpstream = new Map();
for (const record of waterRecords) {
  const level = waterLevel(record.sourceState);
  const upstream = [];
  for (const [dx, dz] of FACE_NEIGHBOURS_2D) {
    const neighbour = { x: record.cell.x + dx, y: record.cell.y, z: record.cell.z + dz };
    const state = await stateAt(neighbour);
    const neighbourLevel = waterLevel(state);
    if (neighbourLevel !== level - 1) continue;
    upstream.push({ cell: neighbour, state, target: waterTargetByKey.has(cellKey(neighbour)) });
    if (waterTargetByKey.has(cellKey(neighbour))) {
      dependencyEdges.push({ downstream: record.cell, upstream: neighbour });
    } else {
      externalWaterUpstream.set(cellKey(neighbour), { cell: neighbour, state });
    }
  }
  invariant(upstream.length > 0,
    `PF01 water cell ${cellKey(record.cell)} has no exact upstream dependency`);
}
const dependencyEdgeLines = dependencyEdges
  .map(({ downstream, upstream }) => `${cellKey(downstream)}>${cellKey(upstream)}`)
  .sort();
const dependencyEdgeSetSha256 = sha256(`${dependencyEdgeLines.join('\n')}\n`);
invariant(dependencyEdges.length === EXPECTED.waterDependencyEdgeCount
  && dependencyEdgeSetSha256 === EXPECTED.waterDependencyEdgeSetSha256,
'PF01 water dependency graph drifted');
const retainedFeedCells = RETAINED_WATER_FEED.map(({ cell }) => cell);
invariant(externalWaterUpstream.size === EXPECTED.retainedWaterFeedCellCount
  && hashCells([...externalWaterUpstream.values()].map(({ cell }) => cell))
    === EXPECTED.retainedWaterFeedCoordinateSetSha256,
'PF01 water targets do not retain the reviewed five-cell external feed edge');
const retainedWaterFeed = [];
for (const expected of RETAINED_WATER_FEED) {
  const observedState = await stateAt(expected.cell);
  invariant(observedState === expected.state,
    `PF01 retained water feed ${cellKey(expected.cell)} drifted: ${observedState}`);
  invariant(externalWaterUpstream.get(cellKey(expected.cell))?.state === expected.state,
    `PF01 retained water feed ${cellKey(expected.cell)} is no longer a direct dependency`);
  retainedWaterFeed.push({ ...expected, observedState, role: 'retained-direct-boundary-feed' });
}
const retainedWaterRootState = await stateAt(RETAINED_WATER_ROOT.cell);
invariant(retainedWaterRootState === RETAINED_WATER_ROOT.state,
  `PF01 retained water root drifted: ${retainedWaterRootState}`);
const retainedWaterRoot = { ...RETAINED_WATER_ROOT, observedState: retainedWaterRootState };

const incoming = new Map(waterRecords.map(({ cell }) => [cellKey(cell), 0]));
const outgoing = new Map(waterRecords.map(({ cell }) => [cellKey(cell), []]));
for (const { downstream, upstream } of dependencyEdges) {
  const downstreamKey = cellKey(downstream);
  const upstreamKey = cellKey(upstream);
  outgoing.get(downstreamKey).push(upstreamKey);
  incoming.set(upstreamKey, incoming.get(upstreamKey) + 1);
}
const ready = [...incoming.entries()]
  .filter(([, count]) => count === 0).map(([key]) => key).sort();
const waterForwardKeys = [];
while (ready.length) {
  const key = ready.shift();
  waterForwardKeys.push(key);
  for (const upstreamKey of outgoing.get(key)) {
    incoming.set(upstreamKey, incoming.get(upstreamKey) - 1);
    if (incoming.get(upstreamKey) === 0) {
      ready.push(upstreamKey);
      ready.sort();
    }
  }
}
const waterForwardOrderedSha256 = sha256(`${waterForwardKeys.join('\n')}\n`);
invariant(waterForwardKeys.length === waterRecords.length
  && waterForwardOrderedSha256 === EXPECTED.waterForwardOrderedSha256,
'PF01 water graph is cyclic or its downstream-first order drifted');
const waterForwardRecords = waterForwardKeys.map((key) => waterTargetByKey.get(key));

const operatedCells = uniqueCells([...lavaRecords, ...waterRecords].map(({ cell }) => cell));
invariant(operatedCells.length === EXPECTED.fluidCellCount,
'PF01 package targets are not an exact disjoint 78-cell union');
const minimumComponentSeparation = Math.min(...lavaRecords.flatMap(({ cell: lava }) => (
  waterRecords.map(({ cell: water }) => (
    Math.abs(lava.x - water.x) + Math.abs(lava.y - water.y) + Math.abs(lava.z - water.z)
  ))
)));
invariant(minimumComponentSeparation === 42,
'PF01 lava/water component separation drifted');

const blockEntityIntersections = [];
const savedEntityIntersections = [];
const touchedChunks = [];
for (let cx = Math.floor(interactionBounds.minX / 16);
  cx <= Math.floor(interactionBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(interactionBounds.minZ / 16);
    cz <= Math.floor(interactionBounds.maxZ / 16); cz += 1) {
    touchedChunks.push({ x: cx, z: cz });
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (insideBounds(point, interactionBounds)) {
        blockEntityIntersections.push({ id: entity.id ?? null, point });
      }
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      if (savedEntityInside(entity, interactionBounds)) {
        savedEntityIntersections.push({
          id: entity.id ?? null,
          position: entity.Pos.slice(0, 3).map(Number),
        });
      }
    }
  }
}
invariant(blockEntityIntersections.length === 0,
'PF01 interaction bounds intersect a block entity');
invariant(savedEntityIntersections.length === 0,
'PF01 interaction bounds intersect a saved movable entity');

const protectedIntersections = [];
for (const relic of protectedRelics.relics) {
  const cells = operatedCells.filter((cell) => insideBounds(cell, relic.declaredInclusiveBounds));
  if (cells.length) protectedIntersections.push({ relic: relic.key, ...classManifest(cells) });
}
invariant(protectedIntersections.length === 0,
'PF01 targets intersect a protected relic core');

const priorIntersections = [];
for (const manifestPath of INPUTS.acceptedPriorManifests) {
  invariant(fs.existsSync(absolute(manifestPath)), `missing accepted prior manifest ${manifestPath}`);
  const prior = readJson(manifestPath);
  for (const pkg of prior.packages) {
    const cells = targetIntersections(pkg.forward, operatedCells);
    if (cells.length) priorIntersections.push({
      transactionId: prior.transactionId,
      packageKey: pkg.key,
      manifestPath,
      ...classManifest(cells),
    });
  }
}
invariant(priorIntersections.length === 0,
  `PF01 targets intersect accepted prior operations: ${JSON.stringify(priorIntersections)}`);

const makeBodies = (records) => ({
  forwardBody: `${records.map(({ cell, sourceState, targetState }) => (
    replLine(cell, sourceState, targetState)
  )).join('\n')}\n`,
  rollbackBody: `${records.slice().reverse()
    .map(({ cell, sourceState, targetState }) => replLine(cell, targetState, sourceState))
    .join('\n')}\n`,
  targetCells: records.map(({ cell }) => cell),
});
const operations = {
  [LAVA_PACKAGE_KEY]: {
    ...makeBodies(lavaForwardRecords),
    forwardOrderedCellKeySha256: lavaForwardOrderedSha256,
  },
  [WATER_PACKAGE_KEY]: {
    ...makeBodies(waterForwardRecords),
    forwardOrderedCellKeySha256: waterForwardOrderedSha256,
  },
};

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const packages = [];
const operationManifest = {};
for (const [key, definition] of Object.entries(operations)) {
  const forwardSha256 = sha256(definition.forwardBody);
  const rollbackSha256 = sha256(definition.rollbackBody);
  const forward = path.join(OUT_DIR, `${BASENAME}.${key}.forward.txt`);
  const rollback = path.join(OUT_DIR, `${BASENAME}.${key}.rollback.txt`);
  const header = (role, operationSha256) => [
    `# GENERATED FILE - ${RELEASE_ID} (${key} ${role})`,
    `# source root: ${SNAPSHOT}`,
    `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
    `# target coordinate-set SHA-256: ${hashCells(definition.targetCells)}`,
    `# forward order SHA-256: ${definition.forwardOrderedCellKeySha256}`,
    `# operation SHA-256: ${operationSha256}`,
    '',
  ].join('\n');
  fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}${definition.forwardBody}`);
  fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}${definition.rollbackBody}`);
  packages.push({ key, forward, rollback });
  operationManifest[key] = {
    forwardSha256,
    rollbackSha256,
    forwardCommandCount: definition.targetCells.length,
    rollbackCommandCount: definition.targetCells.length,
    targetCellCount: definition.targetCells.length,
    targetCoordinateSetSha256: hashCells(definition.targetCells),
    forwardOrderedCellKeySha256: definition.forwardOrderedCellKeySha256,
    exactInverse: true,
  };
}

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_LATEST_ACCEPTED_POST_STATE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['Z02-U1-PLATFORMS', 'Z02-U1-LIFE-SAFETY-FITOUT'],
  packages,
  executionOrder: {
    forward: [LAVA_PACKAGE_KEY, WATER_PACKAGE_KEY],
    rollback: [WATER_PACKAGE_KEY, LAVA_PACKAGE_KEY],
    intraPackageForward: {
      [LAVA_PACKAGE_KEY]: 'CHAMBER_INTERIOR_FIRST_OUTER_CONTAINMENT_ROW_LAST',
      [WATER_PACKAGE_KEY]: 'DOWNSTREAM_TO_UPSTREAM_TOPOLOGICAL',
    },
    intraPackageRollback: 'EXACT_REVERSE_OF_EACH_FORWARD_PACKAGE',
    rationale: 'Close the independent stable lava pocket before the flowing-water boundary tail; reverse package order restores the tail from retained feeds before reopening the lava containment row.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    platformId: PLATFORM_ID,
    assignedTrack: platform.assignedTrack,
    purpose: 'Create a fail-closed dry PF01 work liner from two exact physics-independent fluid components without opening a future-line interface.',
    geometry: {
      chamber: classManifest(cellsIn(chamberBounds)),
      exactHalo: classManifest(halo),
      retainedFeedInteractionBounds: interactionBounds,
      fluidTargets: classManifest(fluidCells),
      stableLavaTargets: classManifest(lavaRecords.map(({ cell }) => cell)),
      temporaryInteriorLavaLiner: classManifest(lavaInsideRecords.map(({ cell }) => cell)),
      retainedOuterLavaContainmentLiner: classManifest(
        lavaContainmentRecords.map(({ cell }) => cell),
      ),
      retainedExternalLavaSources: classManifest(externalLavaSources),
      flowOrderedWaterBoundaryTargets: classManifest(waterRecords.map(({ cell }) => cell)),
      retainedDirectWaterFeed: classManifest(retainedFeedCells),
      operatedUnion: classManifest(operatedCells),
      minimumFluidComponentManhattanSeparation: minimumComponentSeparation,
    },
    sourceStateDoctrine: {
      stableLavaSourceState: LAVA_SOURCE_STATE,
      stableLavaSourcesAccepted: true,
      flowingLavaAccepted: false,
      sourceWaterTargeted: false,
      fallingWaterTargeted: false,
      flowingWaterLevelsAccepted: [2, 3, 4, 5, 6],
      waterloggedStateAccepted: false,
      undeclaredFluidStateAccepted: false,
      exactAcceptedStateCensus: EXPECTED.sourceStateCensus,
    },
    operationalBoundary: {
      platformFitoutPerformed: false,
      trackCommissioned: false,
      futureLineOpeningCreated: false,
      nearestDeferredFutureLineSealX: 1872,
      targetMaximumX: 1749,
      minimumXSeparationFromDeferredFutureLineSeal: 123,
      retainedExternalLavaSourcesModified: false,
      retainedExternalWaterFeedModified: false,
      rollbackRestoresEveryOriginalState: true,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT,
    intakeStatus: intake.status,
    touchedChunkCount: touchedChunks.length,
    sourceStateCensus,
    retainedWaterFeed,
    retainedWaterRoot,
    retainedExternalLavaSourceState: LAVA_SOURCE_STATE,
  },
  lavaSourceContract: {
    status: 'PASS_STABLE_SOURCES_INTERIOR_FIRST_CONTAINMENT_LAST',
    targetCount: lavaRecords.length,
    allTargetsExactLevelZeroSources: true,
    externalAdjacentSourceCount: externalLavaSources.length,
    externalAdjacentSourceCoordinateSetSha256: hashCells(externalLavaSources),
    forwardOrder: {
      semantic: 'chamber-interior-first-outer-containment-row-last',
      orderedCellKeySha256: lavaForwardOrderedSha256,
      firstCell: lavaForwardRecords[0].cell,
      lastCell: lavaForwardRecords.at(-1).cell,
    },
    rollbackOrder: {
      semantic: 'outer-containment-row-first-then-chamber-interior',
      exactReverseOfForward: true,
      firstCell: lavaForwardRecords.at(-1).cell,
      lastCell: lavaForwardRecords[0].cell,
    },
  },
  waterFlowDependencyContract: {
    status: 'PASS_ACYCLIC_FIVE_RETAINED_DIRECT_FEEDS',
    targetCount: waterRecords.length,
    edgeCount: dependencyEdges.length,
    edgeSetSha256: dependencyEdgeSetSha256,
    retainedDirectFeedCount: externalWaterUpstream.size,
    forwardOrder: {
      semantic: 'downstream-to-upstream',
      orderedCellKeySha256: waterForwardOrderedSha256,
      firstCell: waterForwardRecords[0].cell,
      lastCell: waterForwardRecords.at(-1).cell,
    },
    rollbackOrder: {
      semantic: 'upstream-to-downstream',
      exactReverseOfForward: true,
      firstCell: waterForwardRecords.at(-1).cell,
      lastCell: waterForwardRecords[0].cell,
    },
  },
  target: {
    operatedUnion: classManifest(operatedCells),
    desiredStateCensus: { [LINER_STATE]: operatedCells.length },
    packageTargetsDisjoint: true,
  },
  operations: operationManifest,
  isolation: {
    fluidComponentCount: 2,
    minimumFluidComponentManhattanSeparation: minimumComponentSeparation,
    undeclaredFluidStateCount: undeclaredFluidRecords.length,
    forbiddenContainerOrControlInteractionCount: forbiddenInteractionBlocks.length,
    blockEntityInteractionCount: blockEntityIntersections.length,
    savedEntityInteractionCount: savedEntityIntersections.length,
    protectedRelicCoreIntersectionCount: protectedIntersections.length,
    undeclaredPriorReleaseIntersectionCount: priorIntersections.length,
  },
  physicsContract: {
    status: 'PASS_PARTITIONED_STABLE_LAVA_AND_ACYCLIC_WATER',
    forwardRiskControl: 'The stable level-zero lava sources are replaced without source-family substitution, chamber-first and containment-last. The distant water tail is removed downstream-first while five direct external feeds remain untouched.',
    rollbackRiskControl: 'Exact reverse package and cell order restores the water tail upstream-first from retained feeds, then restores the lava containment row before its chamber sources.',
    residualRuntimeTickRisk: 'Any scheduled tick that changes a not-yet-operated exact state causes strict-noop failure and mandatory compensating rollback; continuation, state-family widening, and unguarded cleanup are forbidden.',
    irreducibleUnsafeComponentCount: 0,
    irreduciblePhysicsRisk: 'NONE_BEYOND_SOURCE_DRIFT_CAUGHT_BY_EXACT_STRICT_GUARDS',
  },
  standingAuthorization: {
    path: INPUTS.standingAuthorization,
    sha256: sha256(fs.readFileSync(absolute(INPUTS.standingAuthorization))),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
    excludedMvpScopeNamed: false,
  },
  hardSafetyKernelNext: [
    'independent manifest, exact-inverse, component-order, and cross-package-disjointness QA',
    'fresh complete-save and exact source preflight for both packages',
    'strict-noop parser checks and ordered projected rollback preflight',
    'block-entity and fresh live-entity clearance across the exact interaction bounds',
    'journaled lava execution followed by water execution, with immediate stop and compensating reverse-order rollback on strict guard drift',
    'fresh post save and exact reverse-order rollback post-state preflight',
    'compile the PF01 fit-out only from the accepted dry-liner post save',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({
  ...manifestWithoutIdentity,
  manifestIdentity,
}, null, 2)}\n`);

console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: manifestPath,
  manifestIdentity,
  platformId: PLATFORM_ID,
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  sourceStateCensus,
  lavaTargetCellCount: lavaRecords.length,
  waterTargetCellCount: waterRecords.length,
  operatedCellCount: operatedCells.length,
  waterDependencyEdgeCount: dependencyEdges.length,
  retainedWaterFeedCellCount: retainedWaterFeed.length,
  retainedExternalLavaSourceCellCount: externalLavaSources.length,
  irreducibleUnsafeComponentCount: 0,
  executionOrder: manifestWithoutIdentity.executionOrder,
}, null, 2));
