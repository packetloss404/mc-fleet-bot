#!/usr/bin/env node
/**
 * Compile the bounded D02/C01 ownership, loading-reservation, and interface
 * proposal at the C1 / C01 Owner Tunnel stack.
 *
 * This is an offline planning compiler. It emits exact proposed geometry and
 * default-deny interface records, but no material palette, future block state,
 * operation, release authority, or world mutation.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-05T06:20:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-d02-c01-ownership-loading-interface-proposal.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-d02-c01-ownership-loading-interface-proposal.md',
));

const INPUTS = Object.freeze({
  c1Civil: 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json',
  d02Region: 'docs/masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.json',
  d02Hydrology: 'docs/masterplans/05-combined-zones/phase1-d02-s03-hydrology-outfalls.json',
  d02Technical: 'docs/masterplans/05-combined-zones/phase1-d02-technical-design.json',
  d02Authority: 'docs/masterplans/05-combined-zones/phase1-d02-civil-authority-packet.json',
  d02Owner: 'docs/masterplans/05-combined-zones/phase1-d02-owner-acceptance-packet.json',
  completeSave: 'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit.json',
  clearance: 'docs/masterplans/05-combined-zones/corridor-clearance.json',
  c01Engineering:
    'docs/redevelopment/2026-07-28-town-expansion/northeast-datacenter-c01-relocation-engineering.json',
  issue002Closeout:
    'docs/redevelopment/2026-07-28-town-expansion/railway-migration-closeout.json',
});

const ROLES = Object.freeze({
  c1Civil: 'exact C1 alignment, vertical profiles, land take, road, rail, drainage, and C01 coordination facts',
  d02Region: 'region-only C01 and ISSUE-002 evidence with explicit complete-save limitations',
  d02Hydrology: 'exact road/rail collection datums, gravity lows, and unresolved receiver/outfall evidence',
  d02Technical: 'selected 432-cell D02 capped-sump candidate envelope and technical HOLD matrix',
  d02Authority: 'D02 delegated planning boundary and conservative default-deny requirements',
  d02Owner: 'owner-selected D02 planning basis without technical or release acceptance',
  completeSave: 'same-moment region/entities/POI/level.dat intake gate',
  clearance: 'catalogued C01 feature bounds and contested truth boundary',
  c01Engineering: 'design-review-only C01 relocation concept with null acceptance',
  issue002Closeout: 'documentary record keeping ISSUE-002 open at closeout',
});

const CELL_PREAMBLE = 'combined-zones-coordinate-cell-set-v1';
const INTERVAL_PREAMBLE = 'combined-zones-d02-c01-loading-separation-intervals-v1';
const PAIR_PREAMBLE = 'combined-zones-d02-c01-directional-interface-pairs-v1';
const PAYLOAD_PREAMBLE = 'combined-zones-d02-c01-ownership-loading-interface-payload-v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`D02/C01 ownership compiler rejected: ${message}`);
}

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function fileBinding(relativePath, role) {
  const data = fs.readFileSync(absolute(relativePath));
  return { path: relativePath, sha256: sha256(data), bytes: data.length, role };
}

function compareCells(left, right) {
  return left.x - right.x || left.y - right.y || left.z - right.z;
}

function compareColumns(left, right) {
  return left.x - right.x || left.z - right.z;
}

function cellKey({ x, y, z }) {
  return `${x},${y},${z}`;
}

function columnKey({ x, z }) {
  return `${x},${z}`;
}

function bounds(cells) {
  if (!cells.length) return null;
  return {
    minX: Math.min(...cells.map(({ x }) => x)),
    maxX: Math.max(...cells.map(({ x }) => x)),
    minY: Math.min(...cells.map(({ y }) => y)),
    maxY: Math.max(...cells.map(({ y }) => y)),
    minZ: Math.min(...cells.map(({ z }) => z)),
    maxZ: Math.max(...cells.map(({ z }) => z)),
  };
}

function cellHash(cells) {
  const digest = crypto.createHash('sha256');
  digest.update(`${CELL_PREAMBLE}\n`);
  for (const cell of [...cells].sort(compareCells)) {
    digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  }
  return digest.digest('hex');
}

function d02CoordinateHash(cells, preamble) {
  const digest = crypto.createHash('sha256');
  digest.update(`${preamble}-coordinates\n`);
  for (const cell of [...cells].sort(compareCells)) {
    digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  }
  return digest.digest('hex');
}

function cellManifest(cells, derivation, includeCells = true) {
  const ordered = cells.map(({ x, y, z }) => ({ x, y, z })).sort(compareCells);
  return {
    representation: includeCells ? 'EXACT_INLINE_INTEGER_CELL_SET' : 'EXACT_INTEGER_CELL_SET_HASH_ONLY',
    derivation,
    canonicalCoordinatePreamble: `${CELL_PREAMBLE}\\n`,
    cellCount: ordered.length,
    bounds: bounds(ordered),
    coordinateSetSha256: cellHash(ordered),
    ...(includeCells ? { cells: ordered } : {}),
  };
}

function intervalManifest(intervals, derivation, includeIntervals = true) {
  const ordered = intervals.map(({ x, z, minY, maxY }) => ({ x, z, minY, maxY }))
    .sort((left, right) => compareColumns(left, right)
      || left.minY - right.minY || left.maxY - right.maxY);
  const digest = crypto.createHash('sha256');
  digest.update(`${INTERVAL_PREAMBLE}\n`);
  let cellCount = 0;
  for (const interval of ordered) {
    invariant(interval.minY <= interval.maxY, `invalid interval at ${columnKey(interval)}`);
    cellCount += interval.maxY - interval.minY + 1;
    digest.update(`${interval.x},${interval.z}\t${interval.minY}..${interval.maxY}\n`);
  }
  return {
    representation: includeIntervals
      ? 'EXACT_INLINE_VERTICAL_INTEGER_INTERVALS'
      : 'EXACT_VERTICAL_INTEGER_INTERVALS_HASH_ONLY',
    derivation,
    intervalPreamble: `${INTERVAL_PREAMBLE}\\n`,
    intervalRecord: 'x,z<TAB>inclusive-y-start..inclusive-y-end',
    intervalCount: ordered.length,
    cellCount,
    bounds: ordered.length ? {
      minX: Math.min(...ordered.map(({ x }) => x)),
      maxX: Math.max(...ordered.map(({ x }) => x)),
      minY: Math.min(...ordered.map(({ minY }) => minY)),
      maxY: Math.max(...ordered.map(({ maxY }) => maxY)),
      minZ: Math.min(...ordered.map(({ z }) => z)),
      maxZ: Math.max(...ordered.map(({ z }) => z)),
    } : null,
    intervalManifestSha256: digest.digest('hex'),
    ...(includeIntervals ? { intervals: ordered } : {}),
  };
}

function pairManifest(pairs, derivation, includePairs = false) {
  const ordered = [...pairs].sort((left, right) => compareCells(left.from, right.from)
    || compareCells(left.to, right.to));
  const digest = crypto.createHash('sha256');
  digest.update(`${PAIR_PREAMBLE}\n`);
  for (const pair of ordered) {
    digest.update(
      `${pair.from.x},${pair.from.y},${pair.from.z}>${pair.to.x},${pair.to.y},${pair.to.z}\n`,
    );
  }
  const interfaceCells = new Map();
  for (const pair of ordered) {
    interfaceCells.set(cellKey(pair.from), pair.from);
    interfaceCells.set(cellKey(pair.to), pair.to);
  }
  return {
    derivation,
    direction: 'POSITIVE_Y',
    pairPreamble: `${PAIR_PREAMBLE}\\n`,
    transitionPairCount: ordered.length,
    transitionPairManifestSha256: digest.digest('hex'),
    interfaceCellSet: cellManifest([...interfaceCells.values()], derivation, false),
    ...(includePairs ? { pairs: ordered } : {}),
  };
}

function tangentAt(points, index) {
  const previous = index === 0 ? points[0] : points[index - 1];
  const next = index === points.length - 1 ? points.at(-1) : points[index + 1];
  const dx = next.x - previous.x;
  const dz = next.z - previous.z;
  const length = Math.hypot(dx, dz);
  invariant(length > 0, `zero tangent at station ${index}`);
  return { x: dx / length, z: dz / length };
}

function canonicalOffsetColumns(centerline, offsetFrom, offsetTo) {
  const columns = new Map();
  for (let station = 0; station < centerline.length; station += 1) {
    const tangent = tangentAt(centerline, station);
    for (let offset = offsetFrom; offset <= offsetTo; offset += 1) {
      const point = {
        x: centerline[station].x + Math.round(offset * -tangent.z),
        z: centerline[station].z + Math.round(offset * tangent.x),
        station,
        offset,
      };
      if (!columns.has(columnKey(point))) columns.set(columnKey(point), point);
    }
  }
  return [...columns.values()];
}

function crossfallAdjustment(offset) {
  if (offset <= -5) return 1;
  if (offset <= 5) return 0;
  return -1;
}

function inExtent(point, extent) {
  return point.x >= extent.minX && point.x <= extent.maxX
    && point.z >= extent.minZ && point.z <= extent.maxZ;
}

const source = Object.fromEntries(Object.entries(INPUTS).map(([key, filename]) => [key, readJson(filename)]));
const sourceBindings = Object.fromEntries(Object.entries(INPUTS).map(([key, filename]) => [
  key,
  fileBinding(filename, ROLES[key]),
]));

invariant(source.c1Civil.status === 'PARTIAL_PASS_D02_HOLD', 'unexpected C1 civil status');
invariant(
  source.d02Technical.status === 'PARTIAL_PASS_EXACT_D02_TECHNICAL_DEVELOPMENT_D02_G02_HOLD',
  'unexpected D02 technical status',
);
invariant(source.d02Region.status.includes('COMPLETE_SAVE_MISSING'), 'D02 complete-save HOLD missing');
invariant(source.completeSave.status === 'HOLD_INCOMPLETE_OR_UNBOUND_SAVE', 'complete-save gate changed');
invariant(source.c01Engineering.state === 'DESIGN_REVIEW_ONLY_NO_LIVE_MUTATION', 'C01 design state changed');
invariant(source.c01Engineering.acceptance == null, 'C01 engineering was accepted upstream');
invariant(
  source.issue002Closeout.issues?.items?.some((item) => item.includes('ISSUE-002')),
  'ISSUE-002 is absent from closeout',
);

const ownerTunnel = source.c1Civil.interfaces.c01.find(
  ({ feature }) => feature === 'C01 Owner Tunnel Detour',
);
invariant(ownerTunnel, 'C01 Owner Tunnel Detour interface missing');
invariant(ownerTunnel.exactLandTakeOverlapColumnCount === 7803, 'C01 Owner Tunnel overlap drifted');
invariant(ownerTunnel.structuralLoadingAcceptance === false, 'C01 loading unexpectedly accepted');

const stations = source.c1Civil.horizontalAlignment.stations;
const centerline = stations.map(({ x, z }) => ({ x, z }));
invariant(stations.length === 1216, 'C1 reference-station count drifted');

const landTake = canonicalOffsetColumns(centerline, -48, 31).filter((column) => (
  inExtent(column, ownerTunnel.extent)
));
const railStrip = canonicalOffsetColumns(centerline, -30, -18).filter((column) => (
  inExtent(column, ownerTunnel.extent)
));
const highway = canonicalOffsetColumns(centerline, -14, 14).filter((column) => (
  inExtent(column, ownerTunnel.extent)
));
const railDrain = canonicalOffsetColumns(centerline, -30, -29).filter((column) => (
  inExtent(column, ownerTunnel.extent)
));
const roadDrain = canonicalOffsetColumns(centerline, 18, 19).filter((column) => (
  inExtent(column, ownerTunnel.extent)
));

invariant(landTake.length === 7803, 'recomputed Owner Tunnel land-take overlap differs from C1');

const terminalDatumCells = landTake.map((column) => ({
  x: column.x,
  y: column.offset <= -18
    ? stations[column.station].railFormationY
    : stations[column.station].highwayReferenceY,
  z: column.z,
  station: column.station,
  offset: column.offset,
  datumClass: column.offset <= -18 ? 'RAIL_CORRIDOR_DATUM' : 'ROAD_CORRIDOR_DATUM',
}));
const railSurfaceCells = railStrip.map((column) => ({
  x: column.x,
  y: stations[column.station].railFormationY,
  z: column.z,
  station: column.station,
  offset: column.offset,
}));
const roadSurfaceCells = highway.map((column) => ({
  x: column.x,
  y: stations[column.station].highwayReferenceY + crossfallAdjustment(column.offset),
  z: column.z,
  station: column.station,
  offset: column.offset,
}));
const railDrainCells = railDrain.map((column) => ({
  x: column.x,
  y: stations[column.station].railFormationY,
  z: column.z,
  station: column.station,
  offset: column.offset,
}));
const roadDrainCells = roadDrain.map((column) => ({
  x: column.x,
  y: stations[column.station].highwaySouthEdgeY,
  z: column.z,
  station: column.station,
  offset: column.offset,
}));

const loadingIntervals = terminalDatumCells.map((cell) => ({
  x: cell.x,
  z: cell.z,
  minY: ownerTunnel.featureTopY + 1,
  maxY: cell.y - 1,
  station: cell.station,
  offset: cell.offset,
  terminalDatumY: cell.y,
  terminalDatumClass: cell.datumClass,
}));
const loadingByColumn = new Map(loadingIntervals.map((interval) => [columnKey(interval), interval]));

const d02All = source.d02Technical.technicalDevelopmentPayload.selectedBasis
  .exactAggregateCandidateCellManifest.cells;
invariant(d02All.length === 432, 'D02 aggregate candidate count drifted');
invariant(
  d02CoordinateHash(d02All, 'combined-zones-d02-s04-alt-d')
    === source.d02Technical.technicalDevelopmentPayload.selectedBasis
      .exactAggregateCandidateCellManifest.coordinateSetSha256,
  'D02 source coordinate identity drifted',
);
const d02StackCells = d02All.filter((cell) => inExtent(cell, ownerTunnel.extent));

const terminalDomains = [
  {
    ownerId: 'OWN-D02-C1-DRAINAGE-CONTROL',
    domainId: 'D02-CAPPED-SUMP-CANDIDATE-AT-C01-STACK',
    cells: d02StackCells,
    priority: 2,
  },
  {
    ownerId: 'OWN-C1-RAIL-CESS-CONTROL',
    domainId: 'C1-RAIL-COLLECTION-DATUM-AT-C01-STACK',
    cells: railDrainCells,
    priority: 3,
  },
  {
    ownerId: 'OWN-C1-ROAD-COLLECTION-CONTROL',
    domainId: 'C1-ROAD-COLLECTION-DATUM-AT-C01-STACK',
    cells: roadDrainCells,
    priority: 4,
  },
  {
    ownerId: 'OWN-C1-RAIL-FORMATION-CONTROL',
    domainId: 'C1-RAIL-FORMATION-DATUM-AT-C01-STACK',
    cells: railSurfaceCells,
    priority: 5,
  },
  {
    ownerId: 'OWN-C1-ROAD-SURFACE-CONTROL',
    domainId: 'C1-ROAD-SURFACE-DATUM-AT-C01-STACK',
    cells: roadSurfaceCells,
    priority: 6,
  },
  {
    ownerId: 'OWN-C1-RAIL-LAND-TAKE-DATUM-CONTROL',
    domainId: 'C1-RAIL-LAND-TAKE-TERMINAL-DATUM-AT-C01-STACK',
    cells: terminalDatumCells.filter(({ datumClass }) => datumClass === 'RAIL_CORRIDOR_DATUM'),
    priority: 7,
  },
  {
    ownerId: 'OWN-C1-ROAD-LAND-TAKE-DATUM-CONTROL',
    domainId: 'C1-ROAD-LAND-TAKE-TERMINAL-DATUM-AT-C01-STACK',
    cells: terminalDatumCells.filter(({ datumClass }) => datumClass === 'ROAD_CORRIDOR_DATUM'),
    priority: 8,
  },
];

const loadingConflict = d02StackCells.filter((cell) => {
  const interval = loadingByColumn.get(columnKey(cell));
  return interval && cell.y >= interval.minY && cell.y <= interval.maxY;
});
const terminalSeen = new Set();
const ownerAssignments = [];
for (const domain of terminalDomains) {
  const withinLoadingReservation = [];
  const assigned = [];
  const lostToEarlierTerminalOwner = [];
  for (const cell of domain.cells) {
    const interval = loadingByColumn.get(columnKey(cell));
    if (interval && cell.y >= interval.minY && cell.y <= interval.maxY) {
      withinLoadingReservation.push(cell);
    } else if (terminalSeen.has(cellKey(cell))) {
      lostToEarlierTerminalOwner.push(cell);
    } else {
      assigned.push(cell);
      terminalSeen.add(cellKey(cell));
    }
  }
  ownerAssignments.push({
    ...domain,
    rawManifest: cellManifest(domain.cells, `${domain.domainId} exact raw proposed cells`, false),
    assignedManifest: cellManifest(assigned, `${domain.domainId} cells after exact precedence`, true),
    lostToLoadingReservation: cellManifest(
      withinLoadingReservation,
      `${domain.domainId} cells withheld by loading-separation precedence`,
      false,
    ),
    lostToEarlierTerminalOwner: cellManifest(
      lostToEarlierTerminalOwner,
      `${domain.domainId} cells assigned to an earlier exact terminal owner`,
      false,
    ),
  });
}

const allTerminalDatumKeys = new Set(terminalDatumCells.map(cellKey));
invariant(
  [...terminalSeen].every((key) => allTerminalDatumKeys.has(key)),
  'assigned terminal cell falls outside exact C1 land-take datum',
);
invariant(terminalSeen.size === terminalDatumCells.length, 'terminal datum partition is incomplete');
invariant(loadingConflict.length === 45, 'D02 loading-reservation conflict count drifted');

const ownerAssignmentById = new Map(ownerAssignments.map((assignment) => [
  assignment.ownerId,
  assignment,
]));

const loadingManifest = intervalManifest(
  loadingIntervals,
  'For every exact C1 total-land-take column within the C01 Owner Tunnel extent, reserve every integer cell from featureTopY + 1 through terminal datum Y - 1.',
  true,
);

const scopedOwners = [
  {
    priority: 0,
    ownerId: 'OWN-C01-OWNER-TUNNEL-CONTROL',
    role: 'Proposed default-deny C01 Owner Tunnel catalog-boundary steward.',
    proposedAssignment: {
      representation: 'CATALOG_BOUNDS_AND_EXACT_TOP_INTERFACE_ONLY_PHYSICAL_OCCUPANCY_UNPROVEN',
      catalogBounds: {
        ...ownerTunnel.extent,
        minY: ownerTunnel.featureBaseY,
        maxY: ownerTunnel.featureTopY,
      },
      exactPhysicalOccupancyCellSet: null,
      exactTopInterfaceColumnCount: landTake.length,
    },
    accepted: false,
  },
  {
    priority: 1,
    ownerId: 'OWN-C01-C1-LOADING-SEPARATION-RESERVATION-CONTROL',
    role: 'Proposed default-deny vertical separation/load-path reservation steward.',
    proposedAssignment: loadingManifest,
    accepted: false,
  },
  ...ownerAssignments.map((assignment) => ({
    priority: assignment.priority,
    ownerId: assignment.ownerId,
    role: assignment.domainId,
    proposedAssignment: assignment.assignedManifest,
    rawProposal: assignment.rawManifest,
    lostToLoadingReservation: assignment.lostToLoadingReservation,
    lostToEarlierTerminalOwner: assignment.lostToEarlierTerminalOwner,
    accepted: false,
  })),
];

const tunnelLoadingPairs = landTake.map((column) => ({
  from: { x: column.x, y: ownerTunnel.featureTopY, z: column.z },
  to: { x: column.x, y: ownerTunnel.featureTopY + 1, z: column.z },
}));

function upperPairsFor(ownerId) {
  return ownerAssignmentById.get(ownerId).assignedManifest.cells.map((cell) => ({
    from: { x: cell.x, y: cell.y - 1, z: cell.z },
    to: { x: cell.x, y: cell.y, z: cell.z },
  }));
}

function sealedPairRecord(contractId, fromOwnerId, toOwnerId, relationship, pairs) {
  return {
    contractId,
    fromOwnerId,
    toOwnerId,
    direction: 'POSITIVE_Y',
    relationship,
    ...pairManifest(pairs, `${contractId} exact face-adjacent cell pairs`),
    defaultDeny: true,
    sealed: true,
    wildcardAllowed: false,
    lastWriterWinsAllowed: false,
    beforeStateSetSha256: null,
    futureStateSetSha256: null,
    accepted: false,
    acceptedBy: null,
    status: pairs.length
      ? 'HOLD_EXACT_DIRECTIONAL_SEALED_PROPOSAL_NOT_ACCEPTED_STATES_AND_LOADING_MISSING'
      : 'EXACT_ZERO_NO_DIRECTIONAL_INTERFACE_AT_BOUND_STACK',
  };
}

const directionalInterfaces = [
  sealedPairRecord(
    'IF-C01-OWNER-TUNNEL-TO-C1-LOADING-SEPARATION',
    'OWN-C01-OWNER-TUNNEL-CONTROL',
    'OWN-C01-C1-LOADING-SEPARATION-RESERVATION-CONTROL',
    'EXACT_VERTICAL_FACE_ADJACENCY_DEFAULT_DENY_NO_LOAD_OR_FLUID_TRANSFER_CREDIT',
    tunnelLoadingPairs,
  ),
  sealedPairRecord(
    'IF-C1-LOADING-SEPARATION-TO-D02-CAPPED-SUMP-CAPS',
    'OWN-C01-C1-LOADING-SEPARATION-RESERVATION-CONTROL',
    'OWN-D02-C1-DRAINAGE-CONTROL',
    'EXACT_VERTICAL_FACE_ADJACENCY_DEFAULT_DENY_NO_LOADING_OR_DRAINAGE_ACCEPTANCE',
    upperPairsFor('OWN-D02-C1-DRAINAGE-CONTROL'),
  ),
  sealedPairRecord(
    'IF-C1-LOADING-SEPARATION-TO-RAIL-COLLECTION',
    'OWN-C01-C1-LOADING-SEPARATION-RESERVATION-CONTROL',
    'OWN-C1-RAIL-CESS-CONTROL',
    'EXACT_VERTICAL_FACE_ADJACENCY_DEFAULT_DENY_NO_LOADING_OR_FLOW_ACCEPTANCE',
    upperPairsFor('OWN-C1-RAIL-CESS-CONTROL'),
  ),
  sealedPairRecord(
    'IF-C1-LOADING-SEPARATION-TO-ROAD-COLLECTION',
    'OWN-C01-C1-LOADING-SEPARATION-RESERVATION-CONTROL',
    'OWN-C1-ROAD-COLLECTION-CONTROL',
    'EXACT_VERTICAL_FACE_ADJACENCY_DEFAULT_DENY_NO_LOADING_OR_FLOW_ACCEPTANCE',
    upperPairsFor('OWN-C1-ROAD-COLLECTION-CONTROL'),
  ),
  sealedPairRecord(
    'IF-C1-LOADING-SEPARATION-TO-RAIL-FORMATION',
    'OWN-C01-C1-LOADING-SEPARATION-RESERVATION-CONTROL',
    'OWN-C1-RAIL-FORMATION-CONTROL',
    'EXACT_VERTICAL_FACE_ADJACENCY_DEFAULT_DENY_NO_LOADING_ACCEPTANCE',
    upperPairsFor('OWN-C1-RAIL-FORMATION-CONTROL'),
  ),
  sealedPairRecord(
    'IF-C1-LOADING-SEPARATION-TO-ROAD-SURFACE',
    'OWN-C01-C1-LOADING-SEPARATION-RESERVATION-CONTROL',
    'OWN-C1-ROAD-SURFACE-CONTROL',
    'EXACT_VERTICAL_FACE_ADJACENCY_DEFAULT_DENY_NO_LOADING_ACCEPTANCE',
    upperPairsFor('OWN-C1-ROAD-SURFACE-CONTROL'),
  ),
  sealedPairRecord(
    'IF-C1-LOADING-SEPARATION-TO-RAIL-LAND-TAKE-DATUM',
    'OWN-C01-C1-LOADING-SEPARATION-RESERVATION-CONTROL',
    'OWN-C1-RAIL-LAND-TAKE-DATUM-CONTROL',
    'EXACT_VERTICAL_FACE_ADJACENCY_DEFAULT_DENY_NO_LOADING_ACCEPTANCE',
    upperPairsFor('OWN-C1-RAIL-LAND-TAKE-DATUM-CONTROL'),
  ),
  sealedPairRecord(
    'IF-C1-LOADING-SEPARATION-TO-ROAD-LAND-TAKE-DATUM',
    'OWN-C01-C1-LOADING-SEPARATION-RESERVATION-CONTROL',
    'OWN-C1-ROAD-LAND-TAKE-DATUM-CONTROL',
    'EXACT_VERTICAL_FACE_ADJACENCY_DEFAULT_DENY_NO_LOADING_ACCEPTANCE',
    upperPairsFor('OWN-C1-ROAD-LAND-TAKE-DATUM-CONTROL'),
  ),
];

const railLowAsset = source.d02Technical.technicalDevelopmentPayload.exactAssetDesigns.find(
  ({ lowRunId }) => lowRunId === 'RAIL-LOW-001',
);
invariant(railLowAsset?.collectionInlet?.cellManifest?.cellCount === 2,
  'RAIL-LOW-001 source inlet identity drifted');
const railLowInletManifest = railLowAsset.collectionInlet.cellManifest;
invariant(d02CoordinateHash(
  railLowInletManifest.cells,
  'combined-zones-d02-s04-ALT-D02-S04-D-RAIL-LOW-001-inlet',
) === railLowInletManifest.coordinateSetSha256,
  'RAIL-LOW-001 source inlet coordinate identity drifted');

const boundedCollectionInlet = {
  contractId: 'IF-D02-RAIL-LOW-001-COLLECTION-INLET',
  scope: 'D02/C01',
  fromOwnerId: 'OWN-C1-RAIL-CESS-CONTROL',
  toOwnerId: 'OWN-D02-C1-DRAINAGE-CONTROL',
  direction: 'UPSTREAM_COLLECTION_INTO_CAPPED_SUMP',
  relationship: 'EXACT_SHARED_BOUNDARY_INLET_DEFAULT_CLOSED_AND_SEALED_NO_FLOW_CREDIT',
  interfaceCellSet: {
    representation: 'BOUND_EXACT_SOURCE_CELL_SET',
    cellCount: railLowInletManifest.cellCount,
    bounds: railLowInletManifest.bounds,
    coordinateSetSha256: railLowInletManifest.coordinateSetSha256,
    source: `${INPUTS.d02Technical}#${railLowAsset.collectionInlet.interfaceId}`,
  },
  transitionPairCount: null,
  transitionPairManifestSha256: null,
  beforeStateSetSha256: null,
  futureStateSetSha256: null,
  receiverId: null,
  ownershipSemantics: 'CANONICAL_OCCUPANT_OR_BOUNDARY_STEWARD',
  defaultDeny: true,
  wildcardAllowed: false,
  lastWriterWinsAllowed: false,
  accepted: false,
  acceptedBy: null,
  status: 'HOLD_EXACT_DIRECTIONAL_PROPOSAL_STATES_OR_COUNTERPART_ACCEPTANCE_MISSING',
  sealed: true,
  boundedStackQualification:
    'Both inlet cells are assigned to the D02 terminal owner by precedence, but the upstream collection boundary remains closed; no state, flow, storage, receiver, outfall, or acceptance is inferred.',
};

const c01StackLedger = source.c1Civil.interfaces.c01.map((feature) => ({
  feature: feature.feature,
  extent: feature.extent,
  featureBaseY: feature.featureBaseY,
  featureTopY: feature.featureTopY,
  exactLandTakeOverlapColumnCount: feature.exactLandTakeOverlapColumnCount,
  exactLandTakePlanGapBlocksChebyshev: feature.exactLandTakePlanGapBlocksChebyshev,
  interactionDisposition: feature.exactLandTakeOverlapColumnCount
    ? 'EXACT_BOUNDED_INTERACTION_COMPILED_DEFAULT_DENY'
    : 'EXACT_ZERO_PLAN_OVERLAP_NO_INTERACTION_FABRICATED',
  issue002Status: feature.ownershipStatus,
  structuralLoadingAcceptance: false,
}));

const issueEvidence = source.d02Region.d02S02.issue002RegionEvidence;
const unresolvedHolds = [
  {
    id: 'HOLD-LOAD-CAPACITY',
    value: null,
    requirement: 'Accepted cap, span, load, foundation, exclusion, and clearance calculations.',
  },
  {
    id: 'HOLD-SETTLEMENT',
    value: null,
    requirement: 'Accepted settlement/deformation criteria and deterministic check against the proposed load path.',
  },
  {
    id: 'HOLD-STRUCTURAL-ACCEPTANCE',
    value: null,
    requirement: 'Qualified structural acceptance of the C1/C01/D02 stack and every sealed interface.',
  },
  {
    id: 'HOLD-GEOTECHNICAL-ACCEPTANCE',
    value: null,
    requirement: 'Qualified ground model, excavation/support method, groundwater response, and geotechnical acceptance.',
  },
  {
    id: 'HOLD-ISSUE-002-FIELD-CONDITION',
    value: null,
    requirement: 'A complete current field survey and sole-authority disposition for relocation, road, recovered parking, and sunken entrance.',
  },
  {
    id: 'HOLD-COMPLETE-SAVE-ENTITY-POI',
    value: null,
    requirement: 'One same-moment complete save with region, entities, POI, level.dat, and a valid capture manifest.',
  },
  {
    id: 'HOLD-DRAINAGE-CAPACITY-RECEIVER-OUTFALL',
    value: null,
    requirement: 'Accepted inflow, storage, freeboard, failure/recovery, receiver, and outfall design.',
  },
  {
    id: 'HOLD-MATERIAL-AND-FUTURE-STATE',
    value: null,
    requirement: 'Canonical material palette, before-state manifest, future-state manifest, and rollback design.',
  },
  {
    id: 'HOLD-FINAL-ACCEPTANCE',
    value: null,
    requirement: 'Final owner and technical acceptance after all evidence gates pass.',
  },
];

const proposalPayload = {
  boundStack: {
    feature: ownerTunnel.feature,
    layer: ownerTunnel.layer,
    catalogBounds: {
      ...ownerTunnel.extent,
      minY: ownerTunnel.featureBaseY,
      maxY: ownerTunnel.featureTopY,
    },
    exactC1LandTakeOverlapColumnCount: landTake.length,
    minimumCorridorSurfaceDatumAtOverlap: ownerTunnel.minimumCorridorSurfaceDatumAtOverlap,
    minimumSurfaceDatumSeparationAboveFeatureTop:
      ownerTunnel.minimumSurfaceDatumSeparationAboveFeatureTop,
    threeDimensionalSurfaceDatumCollision: ownerTunnel.threeDimensionalSurfaceDatumCollision,
    interpretation:
      'The catalog bounds are a default-deny planning extent, not an exact occupied-block or structural-capacity claim.',
  },
  exactInteractionSets: {
    c1LandTakeTerminalDatum: cellManifest(
      terminalDatumCells,
      'Exact C1 total-land-take terminal datum within the C01 Owner Tunnel plan extent.',
      false,
    ),
    c1RailFormation: cellManifest(
      railSurfaceCells,
      'C1 reserved rail-strip offsets -30..-18 at exact railFormationY, filtered to the Owner Tunnel extent.',
      false,
    ),
    c1RoadSurface: cellManifest(
      roadSurfaceCells,
      'C1 highway offsets -14..14 with exact crossfall, filtered to the Owner Tunnel extent.',
      false,
    ),
    c1RailCollection: cellManifest(
      railDrainCells,
      'C1 rail collection offsets -30..-29 at exact railFormationY, filtered to the Owner Tunnel extent.',
      false,
    ),
    c1RoadCollection: cellManifest(
      roadDrainCells,
      'C1 road collection offsets 18..19 at exact highwaySouthEdgeY, filtered to the Owner Tunnel extent.',
      false,
    ),
    d02CappedSumpCandidate: cellManifest(
      d02StackCells,
      'Selected D02 432-cell candidate envelope filtered to the Owner Tunnel extent.',
      false,
    ),
    loadingSeparationReservation: loadingManifest,
  },
  oneOwnerPrecedence: {
    status: 'PARTIAL_PASS_EXACT_BOUNDED_PROPOSAL_PARTITION_NOT_ACCEPTED',
    rule:
      'C01 tunnel boundary > vertical loading-separation reservation > D02 capped-sump candidate > rail collection > road collection > rail formation > road surface > rail land-take datum > road land-take datum.',
    defaultDeny: true,
    wildcardAllowed: false,
    lastWriterWinsAllowed: false,
    scopedOwners,
    exactConflictAccounting: {
      d02CandidateCellCountAtStack: d02StackCells.length,
      d02CellsWithheldByLoadingSeparation: cellManifest(
        loadingConflict,
        'D02 stack candidate cells inside the exact loading-separation intervals.',
        true,
      ),
      d02TerminalCellsRemainingAfterLoadingPrecedence:
        ownerAssignmentById.get('OWN-D02-C1-DRAINAGE-CONTROL').assignedManifest,
      terminalDatumCellCount: terminalDatumCells.length,
      terminalAssignedCellCount: terminalSeen.size,
      terminalUnassignedCellCount: terminalDatumCells.length - terminalSeen.size,
      oneOwnerPerTerminalCell: terminalDatumCells.length === terminalSeen.size,
    },
    upstreamRegistryContext: {
      descendantRegistryConsumed: false,
      reason: 'This bounded proposal is an upstream source for G03/G04/G05 and cannot hash-bind or derive from those descendant registries.',
      proposedOwnerIds: scopedOwners.map(({ ownerId }) => ownerId),
      acceptedOwnerRecordCount: 0,
    },
  },
  directionalSealedInterfaces: {
    exactFaceAdjacentContracts: directionalInterfaces,
    existingBoundedCollectionInlet: boundedCollectionInlet,
    acceptedContractCount: 0,
    allDefaultDeny: true,
    allSealed: true,
    beforeStateSetSha256: null,
    futureStateSetSha256: null,
  },
  c01StackLedger,
  issue002AndSaveTruth: {
    documentaryStatus: 'OPEN_RELOCATION_ROAD_RECOVERED_PARKING_AND_SUNKEN_ENTRANCE_NOT_DELIVERED',
    closeoutItem: source.issue002Closeout.issues.items.find((item) => item.includes('ISSUE-002')),
    c01EngineeringState: source.c01Engineering.state,
    c01EngineeringAcceptance: source.c01Engineering.acceptance,
    regionEvidence: {
      oldC01SourceVolume: {
        id: issueEvidence.oldC01SourceVolume.id,
        bounds: issueEvidence.oldC01SourceVolume.bounds,
        cellCount: issueEvidence.oldC01SourceVolume.cellCount,
        stateStreamSha256: issueEvidence.oldC01SourceVolume.stateStreamSha256,
        blockEntityCount: issueEvidence.oldC01SourceVolume.blockEntities.count,
      },
      eastStudyVolume: {
        id: issueEvidence.eastStudyVolume.id,
        bounds: issueEvidence.eastStudyVolume.bounds,
        cellCount: issueEvidence.eastStudyVolume.cellCount,
        stateStreamSha256: issueEvidence.eastStudyVolume.stateStreamSha256,
        blockEntityCount: issueEvidence.eastStudyVolume.blockEntities.count,
      },
      portalStudyVolume: {
        id: issueEvidence.portalStudyVolume.id,
        bounds: issueEvidence.portalStudyVolume.bounds,
        cellCount: issueEvidence.portalStudyVolume.cellCount,
        stateStreamSha256: issueEvidence.portalStudyVolume.stateStreamSha256,
      },
      interpretation:
        'Region-only state identities do not prove semantic relocation, usable access, current entities/POI, ownership, or structural acceptance.',
    },
    completeSave: {
      status: source.completeSave.status,
      ...source.completeSave.summary,
      completeSaveEvidenceAccepted: false,
    },
  },
  ambiguityReconciliation: {
    D02: {
      removed:
        'Exact bounded C1 rail, road, collection, terminal datum, vertical reservation, and D02 conflict sets now exist at the Owner Tunnel stack.',
      remains:
        'Load capacity, settlement, structures, geotechnics, hydraulics, maintenance, power/control, receiver, outfall, materials, future states, and ISSUE-002 acceptance remain null/HOLD.',
    },
    G03: {
      removed:
        'The bounded C01-stack portion of D02 interaction geometry is now integer, counted, bounded, and hashed.',
      remains:
        'No accepted whole-D02 canonical interaction union or influence union exists; G03 remains HOLD.',
    },
    G04: {
      removed:
        'Every proposed cell in the bounded vertical-reservation plus terminal-datum union has deterministic one-owner precedence and exact conflict accounting.',
      remains:
        'The records are unaccepted proposals and do not adjudicate global D02/C01 ownership; G04 remains HOLD.',
    },
    G05: {
      removed:
        'Exact positive-Y sealed face-adjacency pair manifests exist from the C01 tunnel boundary through the loading reservation to every nonempty terminal owner; the one sourced rail inlet remains exactly bound and closed.',
      remains:
        'Before/future states, accepted counterpart contracts, maintenance, power/control, overflow, and receiver interfaces remain null; G05 remains HOLD.',
    },
  },
  unresolvedHolds,
};

const proposalPayloadSha256 = sha256(
  `${PAYLOAD_PREAMBLE}\n${JSON.stringify(proposalPayload)}\n`,
);

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d02-c01-ownership-loading-interface-proposal',
  generatedAtUtc: GENERATED_AT,
  status: 'PARTIAL_PASS_EXACT_BOUNDED_D02_C01_PROPOSAL_D02_G03_G04_G05_HOLD',
  purpose:
    'Compile exact proposed C1/D02 interaction, vertical loading-separation, one-owner precedence, and sealed directional interface records at the C01 Owner Tunnel stack without claiming technical or final acceptance.',
  sourceBindings,
  proposalPayload,
  proposalPayloadSha256,
  gate: {
    result: 'HOLD',
    d02Resolved: false,
    g03Passed: false,
    g04Passed: false,
    g05Passed: false,
    structuralLoadingAccepted: false,
    settlementAccepted: false,
    geotechnicalAccepted: false,
    issue002Resolved: false,
    completeSaveAccepted: false,
    materialStatesAccepted: false,
    futureStatesAccepted: false,
    finalAcceptance: null,
    physicalReleaseAuthorized: false,
    operationGenerationAuthorized: false,
    worldEditAuthorized: false,
  },
  safetyBoundary: {
    acceptedConstructionCellCount: 0,
    acceptedMaterialCellCount: 0,
    acceptedFutureStateCellCount: 0,
    operationCellCount: 0,
    constructionOwnershipAuthorized: false,
    physicalReleaseAuthorized: false,
    operationGenerationAuthorized: false,
    worldEditAuthorized: false,
    executable: false,
  },
};

function shortHash(hash) {
  return hash ? `${hash.slice(0, 12)}...` : 'null';
}

const exact = report.proposalPayload.exactInteractionSets;
const assignedRows = ownerAssignments.map((assignment) => (
  `| ${assignment.priority} | ${assignment.ownerId} | ${assignment.rawManifest.cellCount.toLocaleString()} | ${assignment.assignedManifest.cellCount.toLocaleString()} | ${assignment.lostToLoadingReservation.cellCount.toLocaleString()} | ${assignment.lostToEarlierTerminalOwner.cellCount.toLocaleString()} |`
)).join('\n');
const interfaceRows = directionalInterfaces.map((contract) => (
  `| ${contract.contractId} | ${contract.transitionPairCount.toLocaleString()} | ${shortHash(contract.transitionPairManifestSha256)} | ${contract.status} |`
)).join('\n');
const c01Rows = c01StackLedger.map((feature) => (
  `| ${feature.feature} | ${feature.exactLandTakeOverlapColumnCount.toLocaleString()} | ${feature.exactLandTakePlanGapBlocksChebyshev} | ${feature.interactionDisposition} |`
)).join('\n');

const markdown = `# D02 / C01 Ownership, Loading, and Interface Proposal\n\n`
  + `Generated: ${GENERATED_AT}\n\n`
  + `Result: **HOLD**. This package removes bounded geometry and precedence ambiguity at the C01 Owner Tunnel stack. It does not accept structural capacity, settlement, geotechnics, hydraulics, ISSUE-002, materials, future states, or release.\n\n`
  + `## Exact bounded geometry\n\n`
  + `| Domain | Cells | Bounds | SHA-256 |\n`
  + `| --- | ---: | --- | --- |\n`
  + `| C1 land-take terminal datum | ${exact.c1LandTakeTerminalDatum.cellCount.toLocaleString()} | ${JSON.stringify(exact.c1LandTakeTerminalDatum.bounds)} | ${exact.c1LandTakeTerminalDatum.coordinateSetSha256} |\n`
  + `| C1 rail formation | ${exact.c1RailFormation.cellCount.toLocaleString()} | ${JSON.stringify(exact.c1RailFormation.bounds)} | ${exact.c1RailFormation.coordinateSetSha256} |\n`
  + `| C1 road surface | ${exact.c1RoadSurface.cellCount.toLocaleString()} | ${JSON.stringify(exact.c1RoadSurface.bounds)} | ${exact.c1RoadSurface.coordinateSetSha256} |\n`
  + `| C1 rail collection | ${exact.c1RailCollection.cellCount.toLocaleString()} | ${JSON.stringify(exact.c1RailCollection.bounds)} | ${exact.c1RailCollection.coordinateSetSha256} |\n`
  + `| C1 road collection | ${exact.c1RoadCollection.cellCount.toLocaleString()} | ${JSON.stringify(exact.c1RoadCollection.bounds)} | ${exact.c1RoadCollection.coordinateSetSha256} |\n`
  + `| D02 selected candidate at stack | ${exact.d02CappedSumpCandidate.cellCount.toLocaleString()} | ${JSON.stringify(exact.d02CappedSumpCandidate.bounds)} | ${exact.d02CappedSumpCandidate.coordinateSetSha256} |\n`
  + `| Vertical loading/separation reservation | ${exact.loadingSeparationReservation.cellCount.toLocaleString()} | ${JSON.stringify(exact.loadingSeparationReservation.bounds)} | ${exact.loadingSeparationReservation.intervalManifestSha256} |\n\n`
  + `The exact road and road-collection intersections are zero: the Owner Tunnel overlap lies entirely on the rail-side land take. Zero is preserved as an exact set, not replaced with inferred road geometry.\n\n`
  + `## One-owner precedence\n\n`
  + `${report.proposalPayload.oneOwnerPrecedence.rule}\n\n`
  + `| Priority | Proposed owner | Raw cells | Assigned cells | Lost to loading reservation | Lost to earlier terminal owner |\n`
  + `| ---: | --- | ---: | ---: | ---: | ---: |\n`
  + `${assignedRows}\n\n`
  + `Of the 54 selected D02 candidate cells at the stack, 45 fall inside the default-deny vertical loading/separation reservation. The remaining 9 terminal cells are proposed to D02; none are accepted construction cells.\n\n`
  + `## Sealed directional interfaces\n\n`
  + `| Contract | Exact pairs | Pair SHA-256 | Status |\n`
  + `| --- | ---: | --- | --- |\n`
  + `${interfaceRows}\n\n`
  + `The existing two-cell RAIL-LOW-001 collection inlet is also bound exactly and remains sealed/default-closed with no flow credit. It has no accepted transition-state or receiver evidence.\n\n`
  + `## C01 stack\n\n`
  + `| Feature | Land-take overlap columns | Exact plan gap | Disposition |\n`
  + `| --- | ---: | ---: | --- |\n`
  + `${c01Rows}\n\n`
  + `Only C01 Owner Tunnel Detour overlaps the exact C1 total land take. All seven other catalogued C01 scopes remain exact-zero plan overlaps; their ISSUE-002 and structural acceptance states remain HOLD.\n\n`
  + `## What changed and what did not\n\n`
  + `- D02: exact bounded road, rail, drainage, load-path, and D02 conflict geometry now exists. Capacity, settlement, structural/geotechnical acceptance, hydraulics, materials, and ISSUE-002 remain HOLD.\n`
  + `- G03: the bounded C01-stack interaction subset is exact, but whole-D02 interaction and influence unions remain null/HOLD.\n`
  + `- G04: the bounded proposal has exact one-owner precedence; global ownership and every acceptance remain HOLD.\n`
  + `- G05: exact sealed positive-Y pair manifests exist where face adjacency is supported. Transition states, counterpart acceptance, maintenance, power/control, overflow, and receiver interfaces remain HOLD.\n\n`
  + `Complete save: **${source.completeSave.status}** (${source.completeSave.summary.entityFileCount} entity files, ${source.completeSave.summary.poiFileCount} POI files, level.dat present: ${source.completeSave.summary.levelDatPresent}).\n\n`
  + `ISSUE-002: **OPEN**. Region-only blocks and the prior design-review concept do not prove relocation, usable road/entrance, recovered parking, current entities/POI, or acceptance.\n\n`
  + `Physical release: **not authorized**. Operation cells: **0**. World edits: **not authorized**.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  status: report.status,
  loadingReservationCellCount: loadingManifest.cellCount,
  d02StackCandidateCellCount: d02StackCells.length,
  d02LoadingConflictCellCount: loadingConflict.length,
  terminalDatumCellCount: terminalDatumCells.length,
  proposalPayloadSha256,
  worldEditAuthorized: false,
}, null, 2));
