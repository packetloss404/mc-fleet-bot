import {
  boundsOf,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './combined_zones_release_lib.mjs';

export const AIR_BLOCKS = new Set([
  'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
]);
export const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava']);
export const GRAVITY_BLOCKS = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg',
  'minecraft:white_concrete_powder', 'minecraft:orange_concrete_powder',
  'minecraft:magenta_concrete_powder', 'minecraft:light_blue_concrete_powder',
  'minecraft:yellow_concrete_powder', 'minecraft:lime_concrete_powder',
  'minecraft:pink_concrete_powder', 'minecraft:gray_concrete_powder',
  'minecraft:light_gray_concrete_powder', 'minecraft:cyan_concrete_powder',
  'minecraft:purple_concrete_powder', 'minecraft:blue_concrete_powder',
  'minecraft:brown_concrete_powder', 'minecraft:green_concrete_powder',
  'minecraft:red_concrete_powder', 'minecraft:black_concrete_powder',
]);
export const FORBIDDEN_SOURCE_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox',
  'minecraft:beehive', 'minecraft:bee_nest', 'minecraft:decorated_pot',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block',
]);

export const blockName = (state) => state.split('[', 1)[0];
export const stateProperty = (state, property) => {
  const match = state.match(new RegExp(`(?:\\[|,)${property}=([^,\\]]+)`));
  return match?.[1] ?? null;
};
export const isAir = (state) => AIR_BLOCKS.has(blockName(state));
export const isFluid = (state) => (
  FLUID_BLOCKS.has(blockName(state)) || state.includes('waterlogged=true')
);
export const isLeaf = (state) => /_leaves$/.test(blockName(state));
export const isLog = (state) => /_(?:log|wood)$/.test(blockName(state));
export const isReplaceableSupport = (state) => {
  const name = blockName(state);
  return isAir(state)
    || ['minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:leaf_litter',
      'minecraft:bush'].includes(name)
    || /_leaves$/.test(name);
};
export const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
export const census = (records, field) => Object.fromEntries([...records.reduce(
  (result, record) => result.set(record[field], (result.get(record[field]) ?? 0) + 1),
  new Map(),
).entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));

export function tangentAt(stations, index) {
  const previous = stations[Math.max(0, index - 1)];
  const next = stations[Math.min(stations.length - 1, index + 1)];
  const dx = next.x - previous.x;
  const dz = next.z - previous.z;
  const length = Math.hypot(dx, dz);
  if (!(length > 0)) throw new Error(`zero tangent at station ${index}`);
  return { x: dx / length, z: dz / length };
}

export function offsetPoint(point, tangent, offset) {
  return {
    x: point.x + Math.round(offset * -tangent.z),
    z: point.z + Math.round(offset * tangent.x),
  };
}

export function crossfallAdjustment(offset) {
  if (offset <= -5) return 1;
  if (offset <= 5) return 0;
  return -1;
}

export function canonicalSurface(stations, start, end) {
  const byPlanColumn = new Map();
  for (let station = start; station <= end; station += 1) {
    const reference = stations[station];
    const tangent = tangentAt(stations, station);
    for (let offset = -14; offset <= 14; offset += 1) {
      const point = offsetPoint(reference, tangent, offset);
      const key = `${point.x},${point.z}`;
      if (!byPlanColumn.has(key)) byPlanColumn.set(key, {
        ...point,
        y: reference.highwayReferenceY + crossfallAdjustment(offset),
        station,
        offset,
      });
    }
  }
  return [...byPlanColumn.values()];
}

export function selectedOffsetColumns(stations, start, end, offsetFrom, offsetTo) {
  const columns = new Map();
  for (let station = start; station <= end; station += 1) {
    const reference = stations[station];
    const tangent = tangentAt(stations, station);
    for (let offset = offsetFrom; offset <= offsetTo; offset += 1) {
      const point = offsetPoint(reference, tangent, offset);
      if (!columns.has(`${point.x},${point.z}`)) {
        columns.set(`${point.x},${point.z}`, point);
      }
    }
  }
  return [...columns.values()];
}

export function connectedComponents(cells) {
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const unvisited = new Set(byKey.keys());
  const components = [];
  while (unvisited.size) {
    const first = unvisited.values().next().value;
    unvisited.delete(first);
    const queue = [first];
    const component = [];
    while (queue.length) {
      const key = queue.pop();
      const current = byKey.get(key);
      component.push(current);
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dz = -1; dz <= 1; dz += 1) {
            if (!dx && !dy && !dz) continue;
            const neighbour = `${current.x + dx},${current.y + dy},${current.z + dz}`;
            if (unvisited.delete(neighbour)) queue.push(neighbour);
          }
        }
      }
    }
    components.push(component);
  }
  return components.sort((left, right) => right.length - left.length);
}

export function surfaceTarget(offset) {
  if (offset <= -12 || offset >= 12) return 'minecraft:smooth_stone';
  if (offset >= -1 && offset <= 1) return 'minecraft:yellow_concrete';
  return 'minecraft:gray_concrete';
}

const DIRECTIONS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

export async function analyzeIsland({
  key, start, end, stations, reader, priorTargetKeys, savedEntityPositions = [],
}) {
  const selected = stations.slice(start, end + 1);
  const candidate = canonicalSurface(stations, start, end);
  const prospectiveEnvelope = (cell) => [
    cell,
    { x: cell.x, y: cell.y - 1, z: cell.z },
    { x: cell.x, y: cell.y + 1, z: cell.z },
    { x: cell.x, y: cell.y + 2, z: cell.z },
  ];
  const priorConflicts = candidate.filter((cell) => prospectiveEnvelope(cell).some(
    (point) => priorTargetKeys.has(cellKey(point)),
  ));
  const priorConflictKeys = new Set(priorConflicts.map(cellKey));
  const afterPrior = candidate.filter((cell) => !priorConflictKeys.has(cellKey(cell)));
  const reservationClasses = [
    ['railReservation', -30, -18],
    ['utilityReservation', 15, 17],
    ['roadCollection', 18, 19],
  ];
  const reservationConflicts = {};
  let afterReservations = afterPrior;
  for (const [name, from, to] of reservationClasses) {
    const columnKeys = new Set(
      selectedOffsetColumns(stations, start, end, from, to)
        .map(({ x, z }) => `${x},${z}`),
    );
    reservationConflicts[name] = afterReservations.filter(
      ({ x, z }) => columnKeys.has(`${x},${z}`),
    );
    const conflicts = new Set(reservationConflicts[name].map(cellKey));
    afterReservations = afterReservations.filter((cell) => !conflicts.has(cellKey(cell)));
  }
  const savedEntityConflicts = afterReservations.filter((cell) => (
    savedEntityPositions.some(([x, y, z]) => (
      x >= cell.x - 1 && x < cell.x + 2
      && y >= cell.y - 1 && y < cell.y + 4
      && z >= cell.z - 1 && z < cell.z + 2
    ))
  ));
  const savedEntityConflictKeys = new Set(savedEntityConflicts.map(cellKey));
  const afterSavedEntityExclusion = afterReservations.filter(
    (cell) => !savedEntityConflictKeys.has(cellKey(cell)),
  );
  const components = connectedComponents(afterSavedEntityExclusion);
  const surface = components[0] ?? [];
  const gradeShadows = uniqueCells(components.slice(1).flat());
  const exceptions = uniqueCells([
    ...priorConflicts,
    ...Object.values(reservationConflicts).flat(),
    ...savedEntityConflicts,
    ...gradeShadows,
  ]);

  const sourceCache = new Map();
  const sourceAt = async (cell) => {
    const pointKey = cellKey(cell);
    if (!sourceCache.has(pointKey)) {
      sourceCache.set(pointKey, stateToCommandString(
        await reader.blockState(cell.x, cell.y, cell.z),
      ));
    }
    return sourceCache.get(pointKey);
  };
  const surfaceSourceRecords = [];
  const foundationByCell = new Map();
  const headroomByCell = new Map();
  const gravityByCell = new Map();
  const supportRecords = [];
  const sourceHazards = [];
  const addGravity = (cell, sourceState, reason) => {
    const name = blockName(sourceState);
    if (name !== 'minecraft:gravel') {
      sourceHazards.push({ kind: 'unsupported-gravity', cell, sourceState, reason });
      return;
    }
    const pointKey = cellKey(cell);
    if (!gravityByCell.has(pointKey)) gravityByCell.set(pointKey, {
      cell, sourceState, targetState: 'minecraft:stone_bricks', reasons: [],
    });
    gravityByCell.get(pointKey).reasons.push(reason);
  };
  for (const cell of surface) {
    const sourceState = await sourceAt(cell);
    const surfaceRecord = {
      cell: { x: cell.x, y: cell.y, z: cell.z },
      station: cell.station,
      offset: cell.offset,
      sourceState,
      targetState: surfaceTarget(cell.offset),
    };
    surfaceSourceRecords.push(surfaceRecord);
    if (isFluid(sourceState) || FORBIDDEN_SOURCE_BLOCKS.has(blockName(sourceState))) {
      sourceHazards.push({ kind: 'surface-source', cell, sourceState });
    }
    if (GRAVITY_BLOCKS.has(blockName(sourceState))) addGravity(cell, sourceState, 'pavement-target');
    let support = { x: cell.x, y: cell.y - 1, z: cell.z };
    let supportState = await sourceAt(support);
    while (isReplaceableSupport(supportState)) {
      foundationByCell.set(cellKey(support), {
        cell: support, sourceState: supportState, targetState: 'minecraft:stone_bricks',
      });
      support = { x: support.x, y: support.y - 1, z: support.z };
      supportState = await sourceAt(support);
    }
    if (GRAVITY_BLOCKS.has(blockName(supportState))) {
      addGravity(support, supportState, 'load-bearing-contact');
    }
    if (isAir(supportState) || isFluid(supportState)
      || FORBIDDEN_SOURCE_BLOCKS.has(blockName(supportState))) {
      sourceHazards.push({ kind: 'unstable-contact', cell: support, sourceState: supportState });
    }
    supportRecords.push({ cell: support, sourceState: supportState, surfaceCell: cell });
    for (let y = cell.y + 1; y <= cell.y + 2; y += 1) {
      const headCell = { x: cell.x, y, z: cell.z };
      const headState = await sourceAt(headCell);
      if (isAir(headState)) continue;
      if (isFluid(headState) || FORBIDDEN_SOURCE_BLOCKS.has(blockName(headState))) {
        sourceHazards.push({ kind: 'headroom-source', cell: headCell, sourceState: headState });
      }
      headroomByCell.set(cellKey(headCell), {
        cell: headCell, sourceState: headState, targetState: 'minecraft:air',
      });
      if (GRAVITY_BLOCKS.has(blockName(headState))) {
        addGravity(headCell, headState, 'headroom-target');
      }
    }
    let ceiling = { x: cell.x, y: cell.y + 3, z: cell.z };
    let ceilingState = await sourceAt(ceiling);
    while (GRAVITY_BLOCKS.has(blockName(ceilingState))) {
      addGravity(ceiling, ceilingState, 'headroom-overburden');
      ceiling = { x: ceiling.x, y: ceiling.y + 1, z: ceiling.z };
      ceilingState = await sourceAt(ceiling);
    }
  }
  const gravityRecords = [...gravityByCell.values()].map((record) => ({
    ...record, reasons: [...new Set(record.reasons)].sort(),
  }));
  const gravityRollbackSupportProof = [];
  for (const record of gravityRecords) {
    let support = { x: record.cell.x, y: record.cell.y - 1, z: record.cell.z };
    let supportState = await sourceAt(support);
    let gravityDepth = 0;
    while (GRAVITY_BLOCKS.has(blockName(supportState))) {
      if (blockName(supportState) !== 'minecraft:gravel') {
        sourceHazards.push({
          kind: 'gravity-rollback-unsupported-chain',
          cell: support,
          sourceState: supportState,
          dependencyCell: record.cell,
        });
        break;
      }
      gravityDepth += 1;
      if (gravityDepth > 384) {
        sourceHazards.push({ kind: 'gravity-rollback-unterminated-chain', cell: record.cell });
        break;
      }
      support = { x: support.x, y: support.y - 1, z: support.z };
      supportState = await sourceAt(support);
    }
    if (isAir(supportState) || isFluid(supportState)
      || FORBIDDEN_SOURCE_BLOCKS.has(blockName(supportState))) {
      sourceHazards.push({
        kind: 'gravity-rollback-unstable-support',
        cell: record.cell,
        support,
        sourceState: supportState,
      });
    }
    gravityRollbackSupportProof.push({
      cell: record.cell,
      terminalSupportCell: support,
      terminalSupportState: supportState,
      interveningGravelCellCount: gravityDepth,
    });
  }
  const gravityKeys = new Set(gravityRecords.map(({ cell }) => cellKey(cell)));
  const surfaceRecords = surfaceSourceRecords.map((record) => ({
    ...record,
    sourceState: gravityKeys.has(cellKey(record.cell))
      ? 'minecraft:stone_bricks' : record.sourceState,
  }));
  const headroomRecords = [...headroomByCell.values()].map((record) => ({
    ...record,
    sourceState: gravityKeys.has(cellKey(record.cell))
      ? 'minecraft:stone_bricks' : record.sourceState,
  }));
  const foundationRecords = [...foundationByCell.values()].map((record) => ({
    ...record,
    sourceState: gravityKeys.has(cellKey(record.cell))
      ? 'minecraft:stone_bricks' : record.sourceState,
  }));
  const pavementSourceRecords = [
    ...surfaceSourceRecords, ...headroomByCell.values(), ...foundationByCell.values(),
  ];
  const ownedLogRemovals = pavementSourceRecords.filter(({ sourceState, targetState }) => (
    isLog(sourceState) && !isLog(targetState)
  ));
  const pavementTargetKeys = new Set(pavementSourceRecords.map(({ cell }) => cellKey(cell)));
  const influenced = new Map();
  const searchDepth = new Map(ownedLogRemovals.map(({ cell }) => [cellKey(cell), 0]));
  const searchQueue = ownedLogRemovals.map(({ cell }) => ({ cell, depth: 0 }));
  while (searchQueue.length) {
    const { cell, depth } = searchQueue.shift();
    if (depth >= 6) continue;
    for (const [dx, dy, dz] of DIRECTIONS) {
      const neighbour = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
      const pointKey = cellKey(neighbour);
      const nextDepth = depth + 1;
      if ((searchDepth.get(pointKey) ?? Infinity) <= nextDepth) continue;
      const sourceState = await sourceAt(neighbour);
      if (!isLeaf(sourceState)) continue;
      searchDepth.set(pointKey, nextDepth);
      searchQueue.push({ cell: neighbour, depth: nextDepth });
      if (!pavementTargetKeys.has(pointKey)) {
        influenced.set(pointKey, { cell: neighbour, sourceState, removalDistance: nextDepth });
      }
    }
  }
  const retainedLogDistance = async (startCell) => {
    const visited = new Set([cellKey(startCell)]);
    const pending = [{ cell: startCell, distance: 0 }];
    while (pending.length) {
      const { cell, distance } = pending.shift();
      if (distance >= 6) continue;
      for (const [dx, dy, dz] of DIRECTIONS) {
        const neighbour = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
        const pointKey = cellKey(neighbour);
        if (pavementTargetKeys.has(pointKey) || visited.has(pointKey)) continue;
        const state = await sourceAt(neighbour);
        if (isLog(state)) return distance + 1;
        if (!isLeaf(state)) continue;
        visited.add(pointKey);
        pending.push({ cell: neighbour, distance: distance + 1 });
      }
    }
    return 7;
  };
  const leafRecords = [];
  const retainedLogDistanceCensus = {};
  for (const record of influenced.values()) {
    const projectedDistance = await retainedLogDistance(record.cell);
    retainedLogDistanceCensus[projectedDistance]
      = (retainedLogDistanceCensus[projectedDistance] ?? 0) + 1;
    const currentDistance = Number(stateProperty(record.sourceState, 'distance'));
    const persistent = stateProperty(record.sourceState, 'persistent');
    if (persistent !== 'false' || !Number.isInteger(currentDistance)
      || currentDistance >= 7 || projectedDistance < 7) continue;
    leafRecords.push({
      cell: record.cell,
      sourceState: record.sourceState,
      targetState: record.sourceState.replace('persistent=false', 'persistent=true'),
      reasons: ['owned-log-removal-projected-distance-seven'],
    });
  }
  const dependencyRecords = [...gravityRecords, ...leafRecords];
  const pavementRecords = [...headroomRecords, ...foundationRecords, ...surfaceRecords];
  const allRecords = [...dependencyRecords, ...pavementRecords];
  const operated = uniqueCells(allRecords.map(({ cell }) => cell));
  const operatedInterfaceIntersections = {};
  for (const [name, from, to] of reservationClasses) {
    const columns = new Set(
      selectedOffsetColumns(stations, start, end, from, to)
        .map(({ x, z }) => `${x},${z}`),
    );
    operatedInterfaceIntersections[name] = operated.filter(
      ({ x, z }) => columns.has(`${x},${z}`),
    );
  }
  const halo = uniqueCells(operated.flatMap((cell) => {
    const points = [];
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dz = -1; dz <= 1; dz += 1) {
          points.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
        }
      }
    }
    return points;
  }));
  const haloHazards = [];
  for (const cell of halo) {
    const state = await sourceAt(cell);
    if (isFluid(state)) haloHazards.push({ kind: 'fluid', cell, sourceState: state });
    if (FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))) {
      haloHazards.push({ kind: 'forbidden-block', cell, sourceState: state });
    }
  }
  const priorIntersections = operated.filter((cell) => priorTargetKeys.has(cellKey(cell)));
  const fullHeadroom = uniqueCells(surface.flatMap((cell) => [
    { x: cell.x, y: cell.y + 1, z: cell.z },
    { x: cell.x, y: cell.y + 2, z: cell.z },
  ]));
  return {
    key, start, end, selected, candidate, priorConflicts, reservationConflicts,
    savedEntityConflicts, gradeShadows, exceptions, surface, sourceHazards, haloHazards,
    surfaceSourceRecords, surfaceRecords, foundationRecords, headroomRecords,
    fullHeadroom, supportRecords, gravityRecords, gravityRollbackSupportProof,
    ownedLogRemovals,
    influencedLeaves: [...influenced.values()], retainedLogDistanceCensus,
    leafRecords, dependencyRecords, pavementRecords, allRecords, operated, halo,
    priorIntersections, operatedInterfaceIntersections,
    safe: surface.length > 0 && sourceHazards.length === 0
      && haloHazards.length === 0 && priorIntersections.length === 0
      && Object.values(operatedInterfaceIntersections)
        .every((intersections) => intersections.length === 0),
  };
}
