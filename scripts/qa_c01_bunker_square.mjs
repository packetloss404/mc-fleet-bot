#!/usr/bin/env node
/**
 * Read-only planning QA for a C01/bunker classification manifest.
 *
 * This tool never connects to Minecraft. It proves that the declared audit
 * volume is completely and uniquely classified, checks the declared route
 * graph, and cross-checks the generated exact-state package/report. It does
 * not claim that a declared route has passed an in-world movement test.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const CATEGORIES = Object.freeze([
  'programmed_room',
  'circulation',
  'stair_lift',
  'service_backroom',
  'structure',
  'deliberate_safety_void',
]);

const WALKABLE_CATEGORIES = new Set([
  'programmed_room',
  'circulation',
  'stair_lift',
  'service_backroom',
]);

const HEATMAP_GLYPHS = Object.freeze({
  programmed_room: 'P',
  circulation: 'C',
  stair_lift: 'T',
  service_backroom: 'B',
  structure: 'S',
  deliberate_safety_void: 'V',
  unlabeled: '.',
  overlap: 'X',
});

function sha256(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function normalizeBox(raw, dimensions = 3) {
  if (!Array.isArray(raw) || raw.length !== dimensions * 2 || raw.some((value) => !Number.isInteger(value))) {
    throw new Error(`box must contain ${dimensions * 2} integer coordinates`);
  }
  if (dimensions === 3) {
    const [x1, y1, z1, x2, y2, z2] = raw;
    return {
      minX: Math.min(x1, x2),
      minY: Math.min(y1, y2),
      minZ: Math.min(z1, z2),
      maxX: Math.max(x1, x2),
      maxY: Math.max(y1, y2),
      maxZ: Math.max(z1, z2),
    };
  }
  const [x1, z1, x2, z2] = raw;
  return {
    minX: Math.min(x1, x2),
    minZ: Math.min(z1, z2),
    maxX: Math.max(x1, x2),
    maxZ: Math.max(z1, z2),
  };
}

function key3(x, y, z) {
  return `${x},${y},${z}`;
}

function key2(x, z) {
  return `${x},${z}`;
}

function pointInBox(point, box) {
  const [x, y, z] = point;
  return x >= box.minX && x <= box.maxX
    && y >= box.minY && y <= box.maxY
    && z >= box.minZ && z <= box.maxZ;
}

function boxesIntersect(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX
    && a.minY <= b.maxY && a.maxY >= b.minY
    && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
}

function boxCellCount(box) {
  return (box.maxX - box.minX + 1)
    * (box.maxY - box.minY + 1)
    * (box.maxZ - box.minZ + 1);
}

function addFailure(failures, gate, message, details = undefined) {
  failures.push({ gate, message, ...(details === undefined ? {} : { details }) });
}

export function parseGuardedOperations(filename) {
  const operations = [];
  let context = {};
  const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const line = lines[lineNumber].trim();
    if (line.startsWith('# phase=')) {
      const match = line.match(/^# phase=(\S+)\s+scope=(\S+)\s+role=(.+)$/);
      context = match
        ? { phase: match[1], scope: match[2], role: match[3] }
        : {};
      continue;
    }
    if (!line.startsWith('REPL ')) continue;
    const fields = line.split(/\s+/);
    if (fields.length !== 9) {
      throw new Error(`invalid REPL at ${filename}:${lineNumber + 1}`);
    }
    const coordinates = fields.slice(1, 7).map(Number);
    if (coordinates.some((value) => !Number.isInteger(value))) {
      throw new Error(`non-integer REPL coordinate at ${filename}:${lineNumber + 1}`);
    }
    operations.push({
      lineNumber: lineNumber + 1,
      ...context,
      box: normalizeBox(coordinates),
      expected: fields[7],
      desired: fields[8],
    });
  }
  return operations;
}

function validateTopLevel(manifest, failures) {
  if (!manifest || typeof manifest !== 'object') {
    addFailure(failures, 'manifest_schema', 'manifest must be a JSON object');
    return;
  }
  if (!Array.isArray(manifest.bunkerScopes) || manifest.bunkerScopes.length === 0) {
    addFailure(failures, 'manifest_schema', 'bunkerScopes must be a non-empty array');
  }
  if (!Array.isArray(manifest.levels) || manifest.levels.length === 0) {
    addFailure(failures, 'manifest_schema', 'levels must be a non-empty array');
  }
  if (!manifest.routeGraph || typeof manifest.routeGraph !== 'object') {
    addFailure(failures, 'manifest_schema', 'routeGraph is required');
  }
}

function collectLevelClassification(level, failures) {
  const volumeOwners = new Map();
  const spaceById = new Map();
  const auditCells = new Set();
  const auditColumns = new Set();
  const overlapCells = new Set();

  if (!Array.isArray(level.auditVolumeBoxes) || level.auditVolumeBoxes.length === 0) {
    addFailure(failures, 'manifest_schema', `level ${level.id} has no auditVolumeBoxes`);
    return {
      volumeOwners,
      spaceById,
      auditCells,
      auditColumns,
      overlapCells,
      unlabeledCells: [],
      columnOwners: new Map(),
    };
  }

  const auditBoxes = [];
  for (const raw of level.auditVolumeBoxes) {
    try {
      auditBoxes.push(normalizeBox(raw));
    } catch (error) {
      addFailure(failures, 'manifest_schema', `level ${level.id}: ${error.message}`);
    }
  }
  for (const box of auditBoxes) {
    for (let y = box.minY; y <= box.maxY; y += 1) {
      for (let z = box.minZ; z <= box.maxZ; z += 1) {
        for (let x = box.minX; x <= box.maxX; x += 1) {
          auditCells.add(key3(x, y, z));
          auditColumns.add(key2(x, z));
        }
      }
    }
  }

  if (!Array.isArray(level.spaces)) {
    addFailure(failures, 'manifest_schema', `level ${level.id} spaces must be an array`);
  } else {
    for (const space of level.spaces) {
      if (!space?.id || spaceById.has(space.id)) {
        addFailure(failures, 'manifest_schema', `level ${level.id} contains a missing or duplicate space id`, space?.id);
        continue;
      }
      spaceById.set(space.id, space);
      if (!CATEGORIES.includes(space.category)) {
        addFailure(failures, 'manifest_schema', `space ${space.id} has invalid category ${space.category}`);
        continue;
      }
      if (space.category === 'deliberate_safety_void'
        && (typeof space.rationale !== 'string' || space.rationale.trim().length < 12)) {
        addFailure(failures, 'deliberate_void_rationale', `space ${space.id} lacks a substantive safety rationale`);
      }
      if (!Array.isArray(space.boxes) || space.boxes.length === 0) {
        addFailure(failures, 'manifest_schema', `space ${space.id} has no boxes`);
        continue;
      }
      for (const raw of space.boxes) {
        let box;
        try {
          box = normalizeBox(raw);
        } catch (error) {
          addFailure(failures, 'manifest_schema', `space ${space.id}: ${error.message}`);
          continue;
        }
        for (let y = box.minY; y <= box.maxY; y += 1) {
          for (let z = box.minZ; z <= box.maxZ; z += 1) {
            for (let x = box.minX; x <= box.maxX; x += 1) {
              const cellKey = key3(x, y, z);
              if (!auditCells.has(cellKey)) {
                addFailure(
                  failures,
                  'classification_inside_audit_volume',
                  `space ${space.id} classifies a cell outside level ${level.id}`,
                  { x, y, z },
                );
                continue;
              }
              const prior = volumeOwners.get(cellKey);
              if (prior && prior.spaceId !== space.id) overlapCells.add(cellKey);
              volumeOwners.set(cellKey, {
                spaceId: prior ? `${prior.spaceId}|${space.id}` : space.id,
                category: prior ? 'overlap' : space.category,
              });
            }
          }
        }
      }
    }
  }

  const unlabeledCells = [];
  for (const cellKey of auditCells) {
    if (!volumeOwners.has(cellKey)) unlabeledCells.push(cellKey);
  }

  const columnOwners = new Map();
  for (const columnKey of auditColumns) {
    const [x, z] = columnKey.split(',').map(Number);
    const owners = new Map();
    for (const box of auditBoxes) {
      if (x < box.minX || x > box.maxX || z < box.minZ || z > box.maxZ) continue;
      for (let y = box.minY; y <= box.maxY; y += 1) {
        const owner = volumeOwners.get(key3(x, y, z));
        if (!owner) owners.set('unlabeled', (owners.get('unlabeled') ?? 0) + 1);
        else owners.set(owner.category, (owners.get(owner.category) ?? 0) + 1);
      }
    }
    const ordered = [...owners.entries()].sort((a, b) => b[1] - a[1]);
    columnOwners.set(columnKey, {
      category: ordered[0]?.[0] ?? 'unlabeled',
      categories: Object.fromEntries(ordered),
    });
  }

  return {
    auditBoxes,
    volumeOwners,
    spaceById,
    auditCells,
    auditColumns,
    overlapCells,
    unlabeledCells,
    columnOwners,
  };
}

function makeHeatmap(level, classification) {
  const columns = [...classification.auditColumns].map((value) => value.split(',').map(Number));
  if (columns.length === 0) return { bounds: null, rowsNorthToSouth: [], legend: HEATMAP_GLYPHS };
  const xs = columns.map(([x]) => x);
  const zs = columns.map(([, z]) => z);
  const bounds = {
    minX: Math.min(...xs),
    minZ: Math.min(...zs),
    maxX: Math.max(...xs),
    maxZ: Math.max(...zs),
  };
  const rowsNorthToSouth = [];
  for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
    let row = '';
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const owner = classification.columnOwners.get(key2(x, z));
      row += owner ? (HEATMAP_GLYPHS[owner.category] ?? '?') : ' ';
    }
    rowsNorthToSouth.push(row);
  }
  return {
    bounds,
    northIsNegativeZ: true,
    rowsNorthToSouth,
    legend: HEATMAP_GLYPHS,
  };
}

function normalizeNodePoint(node, failures) {
  if (!Array.isArray(node.point) || node.point.length !== 3 || node.point.some((value) => !Number.isInteger(value))) {
    addFailure(failures, 'route_graph_schema', `route node ${node.id} needs a three-integer point`);
    return null;
  }
  return node.point;
}

function buildAdjacency(nodes, edges, failures, policy) {
  const adjacency = new Map([...nodes.keys()].map((id) => [id, []]));
  for (const edge of edges) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) {
      addFailure(failures, 'route_graph_schema', `route edge ${edge.id ?? `${edge.from}->${edge.to}`} names an unknown node`);
      continue;
    }
    if (!Number.isFinite(edge.width) || edge.width < 1 || !Number.isFinite(edge.headroom) || edge.headroom < 1) {
      addFailure(failures, 'route_dimensions', `route edge ${edge.id ?? `${edge.from}->${edge.to}`} lacks positive width/headroom`);
    }
    const minimumWidth = edge.kind === 'stair'
      ? (policy.minimumStairWidth ?? policy.minimumRouteWidth ?? 1)
      : edge.kind === 'lift'
        ? (policy.minimumLiftWidth ?? 1)
        : (policy.minimumRouteWidth ?? 1);
    if (edge.width < minimumWidth) {
      addFailure(failures, 'route_dimensions', `edge ${edge.id ?? `${edge.from}->${edge.to}`} width ${edge.width} is below ${minimumWidth}`);
    }
    if (edge.headroom < (policy.minimumHeadroom ?? 2)) {
      addFailure(failures, 'route_dimensions', `edge ${edge.id ?? `${edge.from}->${edge.to}`} headroom ${edge.headroom} is below ${policy.minimumHeadroom ?? 2}`);
    }
    if (edge.bidirectional !== true) {
      addFailure(failures, 'route_bidirectionality', `edge ${edge.id ?? `${edge.from}->${edge.to}`} is not declared bidirectional`);
    }
    adjacency.get(edge.from).push({ node: edge.to, edge });
    if (edge.bidirectional === true) adjacency.get(edge.to).push({ node: edge.from, edge });
  }
  return adjacency;
}

function reachableFrom(start, adjacency) {
  const visited = new Set();
  const queue = start && adjacency.has(start) ? [start] : [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!visited.has(neighbor.node)) queue.push(neighbor.node);
    }
  }
  return visited;
}

function checkRouteGraph(manifest, levelResults, failures) {
  const routeGraph = manifest.routeGraph ?? {};
  const nodes = new Map();
  const allSpaces = new Map();
  for (const [levelId, result] of levelResults) {
    for (const [spaceId, space] of result.spaceById) {
      if (allSpaces.has(spaceId)) {
        addFailure(failures, 'manifest_schema', `space id ${spaceId} is duplicated across levels`);
      }
      allSpaces.set(spaceId, { ...space, levelId });
    }
  }
  for (const node of routeGraph.nodes ?? []) {
    if (!node?.id || nodes.has(node.id)) {
      addFailure(failures, 'route_graph_schema', 'route graph has a missing or duplicate node id', node?.id);
      continue;
    }
    const point = normalizeNodePoint(node, failures);
    const space = allSpaces.get(node.spaceId);
    if (!space) {
      addFailure(failures, 'route_node_space', `route node ${node.id} names unknown space ${node.spaceId}`);
    } else if (point) {
      const inside = (space.boxes ?? []).some((raw) => pointInBox(point, normalizeBox(raw)));
      if (!inside) addFailure(failures, 'route_node_space', `route node ${node.id} is outside space ${node.spaceId}`);
      if (!WALKABLE_CATEGORIES.has(space.category)) {
        addFailure(failures, 'route_node_space', `route node ${node.id} is inside non-walkable ${space.category}`);
      }
    }
    nodes.set(node.id, node);
  }

  const edges = Array.isArray(routeGraph.edges) ? routeGraph.edges : [];
  const policy = manifest.verticalCirculationPolicy ?? {};
  const adjacency = buildAdjacency(nodes, edges, failures, policy);
  const entranceNode = routeGraph.entranceNode;
  if (!nodes.has(entranceNode)) addFailure(failures, 'entrance_node', `entrance node ${entranceNode} is missing`);
  const reachable = reachableFrom(entranceNode, adjacency);

  const nodeIdsBySpace = new Map();
  for (const node of nodes.values()) {
    if (!nodeIdsBySpace.has(node.spaceId)) nodeIdsBySpace.set(node.spaceId, []);
    nodeIdsBySpace.get(node.spaceId).push(node.id);
  }
  const unreachableOccupiedSpaces = [];
  for (const [spaceId, space] of allSpaces) {
    if (space.occupied !== true && space.requiredReachability !== true) continue;
    const spaceNodes = nodeIdsBySpace.get(spaceId) ?? [];
    if (spaceNodes.length === 0 || !spaceNodes.some((nodeId) => reachable.has(nodeId))) {
      unreachableOccupiedSpaces.push(spaceId);
    }
  }
  if (unreachableOccupiedSpaces.length > 0) {
    addFailure(failures, 'occupied_space_reachability', 'occupied/required spaces are unreachable', unreachableOccupiedSpaces);
  }

  const mainLevel = manifest.levels.find((level) => level.mainLevel === true);
  if (!mainLevel) {
    addFailure(failures, 'main_level', 'exactly one mainLevel is required');
  } else if (manifest.levels.filter((level) => level.mainLevel === true).length !== 1) {
    addFailure(failures, 'main_level', 'exactly one mainLevel is required');
  }
  const requiredTags = manifest.acceptance?.requiredMainLevelTags ?? [
    'main_level_room',
    'hangar',
    'overlook',
    'adults_only_wing',
  ];
  const tagResults = {};
  for (const tag of requiredTags) {
    const taggedNodes = [...nodes.values()].filter((node) => node.level === mainLevel?.id && (node.tags ?? []).includes(tag));
    tagResults[tag] = {
      nodes: taggedNodes.map((node) => node.id),
      reachable: taggedNodes.length > 0 && taggedNodes.every((node) => reachable.has(node.id)),
    };
    if (taggedNodes.length === 0) {
      addFailure(failures, 'main_level_required_tags', `main level has no route node tagged ${tag}`);
    } else if (!tagResults[tag].reachable) {
      addFailure(failures, 'main_level_route', `main-level target ${tag} is not reachable from ${entranceNode}`);
    }
  }

  const occupiedLevels = manifest.levels
    .filter((level) => (level.spaces ?? []).some((space) => space.occupied === true))
    .map((level) => level.id);
  const vertical = {};
  for (const levelId of occupiedLevels.filter((id) => id !== mainLevel?.id)) {
    const incident = edges.filter((edge) => {
      const fromLevel = nodes.get(edge.from)?.level;
      const toLevel = nodes.get(edge.to)?.level;
      return fromLevel !== toLevel && (fromLevel === levelId || toLevel === levelId);
    });
    const stairEdges = incident.filter((edge) => edge.kind === 'stair' && edge.bidirectional === true);
    const liftEdges = incident.filter((edge) => edge.kind === 'lift' && edge.bidirectional === true);
    vertical[levelId] = {
      stairEdges: stairEdges.map((edge) => edge.id ?? `${edge.from}->${edge.to}`),
      liftEdges: liftEdges.map((edge) => edge.id ?? `${edge.from}->${edge.to}`),
    };
    if (policy.requireStairAndLiftPerOccupiedLevel !== false && stairEdges.length === 0) {
      addFailure(failures, 'broad_stair_connections', `occupied level ${levelId} has no bidirectional stair edge`);
    }
    if (policy.requireStairAndLiftPerOccupiedLevel !== false && liftEdges.length === 0) {
      addFailure(failures, 'lift_connections', `occupied level ${levelId} has no bidirectional lift edge`);
    }
  }

  const requiredAccessClasses = manifest.acceptance?.requiredAccessClasses ?? [];
  const classEntrances = routeGraph.classEntrances ?? {};
  const accessClassResults = {};
  for (const accessClass of requiredAccessClasses) {
    const classNodes = new Map(
      [...nodes.entries()].filter(([, node]) => (node.accessClasses ?? []).includes(accessClass)),
    );
    const classEdges = edges.filter((edge) => (edge.accessClasses ?? []).includes(accessClass));
    const classFailures = [];
    const classAdjacency = buildAdjacency(
      classNodes,
      classEdges,
      classFailures,
      policy,
    );
    const classEntrance = classEntrances[accessClass]
      ?? (accessClass === 'public' ? entranceNode : null);
    const classReachable = reachableFrom(classEntrance, classAdjacency);
    const exclusiveEdges = classEdges.filter((edge) =>
      Array.isArray(edge.accessClasses) && edge.accessClasses.length === 1);
    accessClassResults[accessClass] = {
      entranceNode: classEntrance,
      nodeCount: classNodes.size,
      edgeCount: classEdges.length,
      exclusiveEdgeCount: exclusiveEdges.length,
      reachableNodeCount: classReachable.size,
    };
    if (!classEntrance || !classNodes.has(classEntrance)) {
      addFailure(failures, 'access_class_routes', `${accessClass} route has no valid class entrance`);
    }
    if (classNodes.size < 2 || classEdges.length === 0 || classReachable.size !== classNodes.size) {
      addFailure(failures, 'access_class_routes', `${accessClass} route is missing or disconnected`, accessClassResults[accessClass]);
    }
    if (exclusiveEdges.length === 0) {
      addFailure(failures, 'access_class_separation', `${accessClass} route has no access-exclusive edge`);
    }
  }

  const backTunnelOnlySpaceTag = manifest.acceptance?.backTunnelOnlySpaceTag;
  let backTunnelOnly = null;
  if (backTunnelOnlySpaceTag) {
    const taggedSpaces = [...allSpaces.entries()]
      .filter(([, space]) => (space.tags ?? []).includes(backTunnelOnlySpaceTag))
      .map(([id]) => id);
    const taggedNodeIds = [...nodes.values()]
      .filter((node) => taggedSpaces.includes(node.spaceId))
      .map((node) => node.id);
    const tunnelEdges = edges.filter((edge) => (edge.accessClasses ?? []).includes('tunnel'));
    const publicEdges = edges.filter((edge) => (edge.accessClasses ?? []).includes('public'));
    const tunnelAdjacency = buildAdjacency(nodes, tunnelEdges, [], policy);
    const publicAdjacency = buildAdjacency(nodes, publicEdges, [], policy);
    const tunnelReachable = reachableFrom(classEntrances.tunnel, tunnelAdjacency);
    const publicReachable = reachableFrom(classEntrances.public ?? entranceNode, publicAdjacency);
    backTunnelOnly = {
      tag: backTunnelOnlySpaceTag,
      spaces: taggedSpaces,
      nodes: taggedNodeIds,
      reachableByTunnel: taggedNodeIds.some((id) => tunnelReachable.has(id)),
      reachableByPublic: taggedNodeIds.some((id) => publicReachable.has(id)),
    };
    if (taggedNodeIds.length === 0 || !backTunnelOnly.reachableByTunnel || backTunnelOnly.reachableByPublic) {
      addFailure(failures, 'back_tunnel_only_connection', 'back tunnel-only connection is missing or leaks into the public route', backTunnelOnly);
    }
  }

  const grandEntryNodeTag = manifest.acceptance?.grandEntryNodeTag;
  const grandEntryNodes = grandEntryNodeTag
    ? [...nodes.values()].filter((node) => (node.tags ?? []).includes(grandEntryNodeTag))
    : [];
  if (grandEntryNodeTag && grandEntryNodes.length !== 1) {
    addFailure(failures, 'grand_main_entry', `expected exactly one route node tagged ${grandEntryNodeTag}`, {
      nodes: grandEntryNodes.map((node) => node.id),
    });
  } else if (grandEntryNodeTag && grandEntryNodes[0]?.id !== entranceNode) {
    addFailure(failures, 'grand_main_entry', 'grand entry tag is not attached to the main entrance node');
  }

  const minimumIndependentEgresses = manifest.egressPolicy?.minimumIndependentEgresses ?? 0;
  const egressNodes = [...new Set(routeGraph.egressNodes ?? [])];
  const reachableEgressNodes = egressNodes.filter((id) => nodes.has(id) && reachable.has(id));
  if (reachableEgressNodes.length < minimumIndependentEgresses) {
    addFailure(failures, 'independent_egress', `only ${reachableEgressNodes.length} declared reachable egresses; ${minimumIndependentEgresses} required`);
  }

  return {
    entranceNode,
    nodeCount: nodes.size,
    edgeCount: edges.length,
    reachableNodeCount: reachable.size,
    unreachableNodes: [...nodes.keys()].filter((id) => !reachable.has(id)),
    unreachableOccupiedSpaces,
    requiredMainLevelTags: tagResults,
    verticalConnections: vertical,
    accessClasses: accessClassResults,
    backTunnelOnly,
    grandEntryNodes: grandEntryNodes.map((node) => node.id),
    egress: {
      required: minimumIndependentEgresses,
      declared: egressNodes,
      reachable: reachableEgressNodes,
    },
  };
}

function checkProgramAndSafety(manifest, failures) {
  const spaces = (manifest.levels ?? []).flatMap((level) => level.spaces ?? []);
  const tagCounts = {};
  for (const space of spaces) {
    for (const tag of space.tags ?? []) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
  }
  const exact = manifest.programRequirements?.exactSpaceTagCounts ?? {};
  const minimum = manifest.programRequirements?.minimumSpaceTagCounts ?? {};
  const required = manifest.programRequirements?.requiredSpaceTags ?? [];
  const prohibited = manifest.programRequirements?.prohibitedContentTags ?? [];
  for (const [tag, count] of Object.entries(exact)) {
    if ((tagCounts[tag] ?? 0) !== count) {
      addFailure(failures, 'exact_program_counts', `tag ${tag} appears ${tagCounts[tag] ?? 0} times; exact count ${count} required`);
    }
  }
  for (const [tag, count] of Object.entries(minimum)) {
    if ((tagCounts[tag] ?? 0) < count) {
      addFailure(failures, 'minimum_program_counts', `tag ${tag} appears ${tagCounts[tag] ?? 0} times; minimum ${count} required`);
    }
  }
  for (const tag of required) {
    if ((tagCounts[tag] ?? 0) === 0) addFailure(failures, 'required_program_tags', `required program tag ${tag} is absent`);
  }
  for (const tag of prohibited) {
    if ((tagCounts[tag] ?? 0) > 0) addFailure(failures, 'non_graphic_content', `prohibited content tag ${tag} is present`);
  }

  const adultPolicy = manifest.adultRoomPolicy;
  const adultTag = adultPolicy?.adultRoomTag ?? 'non_graphic_adult_room';
  const adultRooms = spaces.filter((space) => (space.tags ?? []).includes(adultTag));
  const evidenceCameras = new Map(
    (manifest.evidenceCameras ?? []).map((camera) => [camera.id, camera]),
  );
  const adultRoomDetails = [];
  if (adultRooms.length > 0 && !adultPolicy) {
    addFailure(failures, 'adult_room_detail', 'adult rooms exist but adultRoomPolicy is missing');
  }
  const detailTuples = new Set();
  const coveredRoomTypes = new Set();
  for (const room of adultRooms) {
    const program = room.adultRoomProgram;
    if (!program) {
      addFailure(failures, 'adult_room_detail', `adult room ${room.id} has no adultRoomProgram`);
      continue;
    }
    const requiredIdentifiers = [
      'programId',
      'roomType',
      'themeId',
      'materialPaletteId',
      'lightingId',
      'privacyThresholdId',
    ];
    const missingIdentifiers = requiredIdentifiers.filter((key) =>
      typeof program[key] !== 'string' || program[key].trim() === '');
    if (missingIdentifiers.length > 0) {
      addFailure(failures, 'adult_room_detail', `adult room ${room.id} lacks distinct detail identifiers`, missingIdentifiers);
    }
    const tuple = requiredIdentifiers.map((key) => program[key]).join('|');
    if (detailTuples.has(tuple)) {
      addFailure(failures, 'adult_room_distinctness', `adult room ${room.id} duplicates another room's full program/theme/material/light/privacy identity`);
    }
    detailTuples.add(tuple);
    const furnishings = new Set(program.furnishings ?? []);
    const requiredFunctions = new Set([
      ...(adultPolicy?.requiredFunctionsByType?.[program.roomType] ?? []),
      ...(program.requiredFunctions ?? []),
    ]);
    const missingFunctions = [...requiredFunctions].filter((item) => !furnishings.has(item));
    if (furnishings.size < (adultPolicy?.minimumFurnishingsPerRoom ?? 2)) {
      addFailure(failures, 'adult_room_furnishings', `adult room ${room.id} is a decorative empty/generic shell`);
    }
    if (!furnishings.has(adultPolicy?.themedSilhouetteFurnishingId ?? 'non_graphic_themed_furniture_silhouette')) {
      addFailure(failures, 'adult_room_furnishings', `adult room ${room.id} lacks a non-graphic themed furniture silhouette`);
    }
    if (missingFunctions.length > 0) {
      addFailure(failures, 'adult_room_furnishings', `adult room ${room.id} lacks required furnishings/functions`, missingFunctions);
    }
    const cameras = (program.cameraIds ?? [])
      .map((id) => evidenceCameras.get(id))
      .filter(Boolean);
    const matchedInteriorCameras = cameras.filter((camera) =>
      camera.interior === true && camera.roomType === program.roomType);
    if (matchedInteriorCameras.length === 0) {
      addFailure(failures, 'adult_room_camera_coverage', `adult room ${room.id} has no matched interior camera for type ${program.roomType}`);
    } else {
      coveredRoomTypes.add(program.roomType);
    }
    adultRoomDetails.push({
      id: room.id,
      roomType: program.roomType,
      furnishings: [...furnishings],
      requiredFunctions: [...requiredFunctions],
      cameraIds: matchedInteriorCameras.map((camera) => camera.id),
    });
  }

  const terrain = manifest.terrainSafety;
  if (!terrain) {
    addFailure(failures, 'terrain_fluid_safety', 'terrainSafety evidence is missing');
  } else {
    if (!Number.isInteger(terrain.measuredMinimumCoverBlocks)
      || terrain.measuredMinimumCoverBlocks < (terrain.minimumCoverBlocks ?? 3)) {
      addFailure(failures, 'terrain_fluid_safety', 'measured terrain cover is below the declared minimum', terrain);
    }
    if (!Number.isInteger(terrain.unresolvedFluidCells) || terrain.unresolvedFluidCells !== 0) {
      addFailure(failures, 'terrain_fluid_safety', 'unresolved fluid cells are nonzero or unreported', terrain);
    }
    if (typeof terrain.snapshotSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(terrain.snapshotSha256)) {
      addFailure(failures, 'terrain_fluid_safety', 'terrain safety is not pinned to a snapshot SHA-256');
    }
  }
  return {
    tagCounts,
    exactRequirements: exact,
    minimumRequirements: minimum,
    requiredTags: required,
    prohibitedTags: prohibited,
    adultRooms: {
      roomCount: adultRooms.length,
      roomTypes: [...new Set(adultRoomDetails.map((room) => room.roomType))],
      coveredRoomTypes: [...coveredRoomTypes],
      details: adultRoomDetails,
    },
    terrainSafety: terrain ?? null,
  };
}

function operationCrossCheck(manifest, operations, generatorReport, opsPath, failures) {
  const scopes = new Set(manifest.bunkerScopes ?? []);
  const bunkerOperations = operations.filter((operation) => scopes.has(operation.scope));
  if (bunkerOperations.length === 0) {
    addFailure(failures, 'bunker_operations_present', 'generated operations contain no declared bunker scope');
  }

  if (generatorReport?.operations?.sha256) {
    const actualHash = sha256(opsPath);
    if (actualHash !== generatorReport.operations.sha256) {
      addFailure(failures, 'ops_report_hash', 'ops SHA-256 does not match generator report', {
        expected: generatorReport.operations.sha256,
        actual: actualHash,
      });
    }
  } else {
    addFailure(failures, 'ops_report_hash', 'generator report does not declare operations.sha256');
  }

  const reportScopes = new Set((generatorReport?.operations?.scopeSummary ?? []).map((scope) => scope.scope));
  for (const scope of scopes) {
    if (!reportScopes.has(scope)) {
      addFailure(failures, 'report_scope_summary', `generator report does not summarize bunker scope ${scope}`);
    }
  }

  const protectedEntities = manifest.protectedEntities ?? [];
  const protectedIntersections = [];
  for (const entity of protectedEntities) {
    let box;
    try {
      box = entity.point
        ? normalizeBox([...entity.point, ...entity.point])
        : normalizeBox(entity.bounds);
    } catch (error) {
      addFailure(failures, 'manifest_schema', `protected entity ${entity.id}: ${error.message}`);
      continue;
    }
    for (const operation of operations) {
      if (boxesIntersect(box, operation.box)) {
        protectedIntersections.push({
          entityId: entity.id,
          scope: operation.scope ?? null,
          role: operation.role ?? null,
          operationLine: operation.lineNumber,
        });
      }
    }
  }
  if (protectedIntersections.length > 0) {
    addFailure(failures, 'protected_entities', 'generated operations intersect protected entities', protectedIntersections);
  }

  const bunkerTargetCells = bunkerOperations.reduce((sum, operation) => sum + boxCellCount(operation.box), 0);
  return {
    totalOperationGroups: operations.length,
    bunkerOperationGroups: bunkerOperations.length,
    bunkerTargetCells,
    bunkerScopes: [...scopes],
    protectedEntityCount: protectedEntities.length,
    protectedIntersections,
  };
}

export function auditC01BunkerSquare({
  manifest,
  operations,
  generatorReport,
  opsPath,
  manifestPath = null,
  reportPath = null,
}) {
  const failures = [];
  validateTopLevel(manifest, failures);

  const levelResults = new Map();
  const levelReports = [];
  let totalGrossCells = 0;
  let totalGrossColumns = 0;
  let totalNetCells = 0;
  let totalProgrammedCells = 0;
  let totalUnlabeledCells = 0;
  let totalOverlapCells = 0;

  for (const level of manifest.levels ?? []) {
    const result = collectLevelClassification(level, failures);
    levelResults.set(level.id, result);
    const categoryCellCounts = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
    for (const owner of result.volumeOwners.values()) {
      if (categoryCellCounts[owner.category] !== undefined) categoryCellCounts[owner.category] += 1;
    }
    const categoryColumnCounts = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
    for (const owner of result.columnOwners.values()) {
      if (categoryColumnCounts[owner.category] !== undefined) categoryColumnCounts[owner.category] += 1;
    }
    const grossCells = result.auditCells.size;
    const grossColumns = result.auditColumns.size;
    const netCells = [...WALKABLE_CATEGORIES].reduce((sum, category) => sum + categoryCellCounts[category], 0);
    const programmedCells = categoryCellCounts.programmed_room;
    totalGrossCells += grossCells;
    totalGrossColumns += grossColumns;
    totalNetCells += netCells;
    totalProgrammedCells += programmedCells;
    totalUnlabeledCells += result.unlabeledCells.length;
    totalOverlapCells += result.overlapCells.size;

    if (result.unlabeledCells.length > 0) {
      addFailure(failures, 'zero_unlabeled_cells', `level ${level.id} has ${result.unlabeledCells.length} unlabeled cells`, {
        sample: result.unlabeledCells.slice(0, 25),
      });
    }
    if (result.overlapCells.size > 0) {
      addFailure(failures, 'zero_classification_overlaps', `level ${level.id} has ${result.overlapCells.size} multiply classified cells`, {
        sample: [...result.overlapCells].slice(0, 25),
      });
    }

    levelReports.push({
      id: level.id,
      mainLevel: level.mainLevel === true,
      grossCells,
      grossColumns,
      categoryCellCounts,
      categoryColumnCounts,
      netCells,
      netToGrossRatio: grossCells === 0 ? 0 : netCells / grossCells,
      programmedToNetRatio: netCells === 0 ? 0 : programmedCells / netCells,
      unlabeledCellCount: result.unlabeledCells.length,
      overlapCellCount: result.overlapCells.size,
      heatmap: makeHeatmap(level, result),
    });
  }

  const routeGraph = checkRouteGraph(manifest, levelResults, failures);
  const programAndSafety = checkProgramAndSafety(manifest, failures);
  const operationEvidence = operationCrossCheck(
    manifest,
    operations,
    generatorReport,
    opsPath,
    failures,
  );
  const gateNames = [
    'manifest_schema',
    'classification_inside_audit_volume',
    'deliberate_void_rationale',
    'zero_unlabeled_cells',
    'zero_classification_overlaps',
    'bunker_operations_present',
    'ops_report_hash',
    'report_scope_summary',
    'protected_entities',
    'route_graph_schema',
    'route_node_space',
    'route_dimensions',
    'route_bidirectionality',
    'entrance_node',
    'occupied_space_reachability',
    'main_level',
    'main_level_required_tags',
    'main_level_route',
    'broad_stair_connections',
    'lift_connections',
    'access_class_routes',
    'access_class_separation',
    'back_tunnel_only_connection',
    'grand_main_entry',
    'independent_egress',
    'exact_program_counts',
    'minimum_program_counts',
    'required_program_tags',
    'non_graphic_content',
    'adult_room_detail',
    'adult_room_distinctness',
    'adult_room_furnishings',
    'adult_room_camera_coverage',
    'terrain_fluid_safety',
  ];
  const gates = Object.fromEntries(gateNames.map((gate) => [
    gate,
    failures.every((failure) => failure.gate !== gate),
  ]));

  return {
    schemaVersion: '1.0.0',
    id: `${manifest.id ?? 'c01-bunker'}-square-independent-qa`,
    generatedAtUtc: new Date().toISOString(),
    readOnly: true,
    liveWorldMutated: false,
    status: failures.length === 0
      ? 'PASS_OFFLINE_CLASSIFICATION_AND_DECLARED_ROUTE_GRAPH'
      : 'FAIL',
    limitations: [
      'This proves the classification manifest and declared route graph, not an in-world movement result.',
      'Unchanged final-state cells may be absent from an exact-state operation file; full spatial classification comes from the reviewed manifest.',
      'A live release still requires fresh guards, entity/player clearance, post-state route walking, and matched visual evidence.',
    ],
    inputs: {
      manifest: manifestPath ? { file: manifestPath, sha256: sha256(manifestPath) } : null,
      operations: { file: opsPath, sha256: sha256(opsPath) },
      generatorReport: reportPath ? { file: reportPath, sha256: sha256(reportPath) } : null,
    },
    gates,
    utilization: {
      grossCells: totalGrossCells,
      grossColumns: totalGrossColumns,
      netCells: totalNetCells,
      programmedCells: totalProgrammedCells,
      structuralAndSafetyVoidCells: totalGrossCells - totalNetCells,
      netToGrossRatio: totalGrossCells === 0 ? 0 : totalNetCells / totalGrossCells,
      programmedToNetRatio: totalNetCells === 0 ? 0 : totalProgrammedCells / totalNetCells,
      unlabeledCells: totalUnlabeledCells,
      overlapCells: totalOverlapCells,
    },
    levels: levelReports,
    routeGraph,
    programAndSafety,
    operationEvidence,
    failures,
  };
}

function parseArgs(argv) {
  const args = {
    ops: null,
    report: null,
    manifest: null,
    out: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--ops') args.ops = argv[++index];
    else if (argument === '--report') args.report = argv[++index];
    else if (argument === '--manifest') args.manifest = argv[++index];
    else if (argument === '--out') args.out = argv[++index];
    else if (argument === '--help') args.help = true;
    else throw new Error(`unknown argument ${argument}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.ops || !args.report || !args.manifest) {
    process.stdout.write(
      'Usage: node scripts/qa_c01_bunker_square.mjs --ops <forward.txt> '
      + '--report <generator-report.json> --manifest <classification.json> '
      + '[--out <qa.json>]\n',
    );
    process.exitCode = args.help ? 0 : 2;
    return;
  }
  const opsPath = path.resolve(args.ops);
  const reportPath = path.resolve(args.report);
  const manifestPath = path.resolve(args.manifest);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const generatorReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const operations = parseGuardedOperations(opsPath);
  const result = auditC01BunkerSquare({
    manifest,
    operations,
    generatorReport,
    opsPath,
    manifestPath,
    reportPath,
  });
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (args.out) {
    fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
    fs.writeFileSync(path.resolve(args.out), serialized);
  } else {
    process.stdout.write(serialized);
  }
  if (result.status === 'FAIL') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
