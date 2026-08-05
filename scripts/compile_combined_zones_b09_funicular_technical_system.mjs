#!/usr/bin/env node
/**
 * Compile a deterministic, offline B09 funicular technical-system proposal.
 *
 * This compiler reproduces the selected FM-01 centerline and its exact minimum
 * planning accommodation from already-generated evidence. It derives bounded
 * functional reservations and conflict audits, but it does not accept cells,
 * owners, interfaces, mechanisms, operations, or world edits.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);

function value(flag, fallback) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

const GENERATED_AT = value('--generated-at', '2026-08-05T02:40:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'masterplans/05-combined-zones/phase1-b09-funicular-technical-system.md',
));

const INPUTS = Object.freeze({
  autonomousSelections:
    'masterplans/05-combined-zones/phase1-autonomous-design-selections.json',
  connectorGeometry: 'masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05FutureMountain:
    'masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  d05FutureState: 'masterplans/05-combined-zones/phase1-d05-future-state.json',
  d06Mechanisms: 'masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  protectedRelicClearance:
    'masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  phase0Survey: 'masterplans/05-combined-zones/phase0-survey-evidence.json',
  completeSaveAudit:
    'masterplans/05-combined-zones/phase1-complete-save-intake-audit.json',
});

const COORDINATE_PREAMBLE = 'combined-zones-coordinate-cell-set-v1';
const CENTERLINE_PREAMBLE = 'combined-zones-ordered-centerline-v1';
const TECHNICAL_MANIFEST_PREAMBLE =
  'combined-zones-b09-funicular-technical-reservations-v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`Combined Zones B09 technical proposal rejected: ${message}`);
}

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function binding(relativePath, role) {
  const data = fs.readFileSync(absolute(relativePath));
  return { path: relativePath, bytes: data.length, sha256: sha256(data), role };
}

function compareCells(left, right) {
  return left.x - right.x || left.y - right.y || left.z - right.z;
}

function cellKey({ x, y, z }) {
  return `${x},${y},${z}`;
}

function uniqueCells(cells) {
  const result = new Map();
  for (const cell of cells) result.set(cellKey(cell), { x: cell.x, y: cell.y, z: cell.z });
  return [...result.values()].sort(compareCells);
}

function boundsOf(cells) {
  if (cells.length === 0) return null;
  return {
    minX: Math.min(...cells.map(({ x }) => x)),
    maxX: Math.max(...cells.map(({ x }) => x)),
    minY: Math.min(...cells.map(({ y }) => y)),
    maxY: Math.max(...cells.map(({ y }) => y)),
    minZ: Math.min(...cells.map(({ z }) => z)),
    maxZ: Math.max(...cells.map(({ z }) => z)),
  };
}

function coordinateHash(cells) {
  const exact = uniqueCells(cells);
  const records = exact.map(cellKey).join('\n');
  return sha256(`${COORDINATE_PREAMBLE}\n${records}${records ? '\n' : ''}`);
}

function setRecord(cells, derivation, extra = {}) {
  const exact = uniqueCells(cells);
  return {
    representation: 'EXACT_DETERMINISTIC_CELL_SET_HASH_ONLY',
    derivation,
    cellCount: exact.length,
    bounds: boundsOf(exact),
    coordinateSetSha256: coordinateHash(exact),
    proposalAccepted: false,
    acceptedCellCount: 0,
    ...extra,
  };
}

function cellsIn(bounds) {
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z });
    }
  }
  return cells;
}

function intersection(left, right) {
  const rightKeys = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => rightKeys.has(cellKey(cell))));
}

function union(...sets) {
  return uniqueCells(sets.flat());
}

function difference(left, right) {
  const excluded = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => !excluded.has(cellKey(cell))));
}

function dilate(cells, radius) {
  const result = [];
  for (const cell of uniqueCells(cells)) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dz = -radius; dz <= radius; dz += 1) {
          result.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
        }
      }
    }
  }
  return uniqueCells(result);
}

function boundsDisjoint(left, right) {
  return left.maxX < right.minX || right.maxX < left.minX
    || left.maxY < right.minY || right.maxY < left.minY
    || left.maxZ < right.minZ || right.maxZ < left.minZ;
}

function direction(from, to) {
  return { x: Math.sign(to.x - from.x), z: Math.sign(to.z - from.z) };
}

function orderedCenterlineHash(points) {
  const digest = crypto.createHash('sha256');
  digest.update(`${CENTERLINE_PREAMBLE}\n`);
  for (const point of points) {
    digest.update(`${point.index}:${point.x},${point.y},${point.z}:${point.kind}\n`);
  }
  return digest.digest('hex');
}

function mountainSurface(x, z, model) {
  const dx = x - model.center.x;
  const dz = z - model.center.z;
  const xDenominator = dx < 0 ? model.extents.west : model.extents.east;
  const zDenominator = dz < 0 ? model.extents.north : model.extents.south;
  if (Math.abs(dx) > xDenominator || Math.abs(dz) > zDenominator) return null;
  let numerator;
  let denominator;
  if (Math.abs(dx) * zDenominator >= Math.abs(dz) * xDenominator) {
    numerator = Math.abs(dx);
    denominator = xDenominator;
  } else {
    numerator = Math.abs(dz);
    denominator = zDenominator;
  }
  return model.baseSurfaceY + Math.floor(
    (model.peakSurfaceY - model.baseSurfaceY) * (denominator - numerator) / denominator,
  );
}

function buildSelectedRoute(endpoints) {
  const model = {
    id: 'FM-01-COMPACT-EAST-FACE',
    center: { x: 2048, z: -828 },
    extents: { west: 100, east: 320, north: 240, south: 240 },
    baseSurfaceY: 71,
    peakSurfaceY: 303,
  };
  const portal = endpoints.from;
  const summit = endpoints.to;
  let climbZ = portal.z - 1;
  while (climbZ > summit.z && mountainSurface(portal.x, climbZ - 1, model)
    !== mountainSurface(portal.x, climbZ, model)) {
    climbZ -= 1;
  }
  invariant(climbZ > summit.z, 'selected model has no level summit-approach curve');
  let throatX = null;
  for (let distance = 1; distance <= model.extents.east; distance += 1) {
    const x = portal.x + distance;
    if (mountainSurface(x, climbZ, model) === portal.y - 1
      && mountainSurface(x - 1, climbZ, model) === portal.y - 1) {
      throatX = x;
      break;
    }
  }
  invariant(throatX !== null, 'selected model has no east-face throat');
  const faceRun = throatX - portal.x;
  const points = [];
  for (let distance = 0; distance <= faceRun; distance += 1) {
    points.push({
      x: portal.x + distance,
      y: portal.y,
      z: portal.z,
      kind: distance === 0 ? 'portal-interface' : 'level-station-throat',
    });
  }
  const hairpinRun = portal.z - climbZ;
  for (let offset = 1; offset <= hairpinRun; offset += 1) {
    points.push({ x: throatX, y: portal.y, z: portal.z - offset, kind: 'level-hairpin' });
  }
  for (let distance = 1; distance <= faceRun; distance += 1) {
    const x = throatX - distance;
    points.push({
      x,
      y: mountainSurface(x, climbZ, model) + 1,
      z: climbZ,
      kind: distance === 1 ? 'level-hairpin-exit' : 'face-ascent',
    });
  }
  const northRun = Math.abs(summit.z - climbZ);
  for (let distance = 1; distance <= northRun; distance += 1) {
    const z = climbZ - distance;
    points.push({
      x: summit.x,
      y: mountainSurface(summit.x, z, model) + 1,
      z,
      kind: distance === 1 ? 'level-summit-curve-exit'
        : distance === northRun ? 'summit-interface' : 'summit-ascent',
    });
  }
  points.forEach((point, index) => { point.index = index; });
  const steps = points.slice(1).map((point, index) => ({
    horizontal: Math.abs(point.x - points[index].x) + Math.abs(point.z - points[index].z),
    vertical: point.y - points[index].y,
  }));
  invariant(steps.every(({ horizontal, vertical }) => horizontal === 1
    && Math.abs(vertical) <= 1), 'selected route is not cardinal rail-buildable geometry');
  const curveIndices = [];
  for (let index = 1; index < points.length - 1; index += 1) {
    const before = direction(points[index - 1], points[index]);
    const after = direction(points[index], points[index + 1]);
    if (before.x !== after.x || before.z !== after.z) curveIndices.push(index);
  }
  invariant(curveIndices.every((index) => points[index - 1].y === points[index].y
    && points[index + 1].y === points[index].y), 'selected route contains a sloped curve');
  const railAndHeadroom = uniqueCells(points.flatMap(({ x, y, z }) => [
    { x, y, z },
    { x, y: y + 1, z },
  ]));
  return {
    model,
    points,
    steps,
    curveIndices,
    throat: { x: throatX, y: portal.y, z: portal.z, climbZ },
    railAndHeadroom,
    minimumAccommodation: dilate(railAndHeadroom, 1),
  };
}

function localDirections(points, index) {
  const directions = [];
  if (index > 0) directions.push(direction(points[index - 1], points[index]));
  if (index < points.length - 1) directions.push(direction(points[index], points[index + 1]));
  return [...new Map(directions.map((item) => [`${item.x},${item.z}`, item])).values()];
}

const autonomousSelections = readJson(INPUTS.autonomousSelections);
const connector = readJson(INPUTS.connectorGeometry);
const d05Mountain = readJson(INPUTS.d05FutureMountain);
const d05FutureState = readJson(INPUTS.d05FutureState);
const d06Mechanisms = readJson(INPUTS.d06Mechanisms);
const relicClearance = readJson(INPUTS.protectedRelicClearance);
const phase0Survey = readJson(INPUTS.phase0Survey);
const completeSaveAudit = readJson(INPUTS.completeSaveAudit);

const sourceBindings = Object.fromEntries(Object.entries(INPUTS).map(([key, sourcePath]) => [
  key,
  binding(sourcePath, {
    autonomousSelections: 'selected planning authority; technical acceptance remains false',
    connectorGeometry: 'B08 exact geometry and original B09 endpoint evidence',
    d05FutureMountain: 'selected FM-01 centerline and minimum-accommodation identity',
    d05FutureState: 'current D05 future/support withholding evidence',
    d06Mechanisms: 'current D06 egress/mechanism reservation evidence',
    protectedRelicClearance: 'exact generated-start protected-core evidence',
    phase0Survey: 'observed generated-structure-start inventory',
    completeSaveAudit: 'current complete-save evidence boundary',
  }[key]),
]));

const b09Selection = autonomousSelections.selections.find(
  ({ id }) => id === 'SEL-P1-B09-FUNICULAR-CENTERLINE',
);
invariant(b09Selection?.selection === 'FM-01-COMPACT-EAST-FACE exact B09 centerline and route shell',
  'FM-01 B09 selection is absent or changed');
invariant(b09Selection.technicalAcceptanceClaimed === false,
  'selection unexpectedly claims technical acceptance');
invariant(autonomousSelections.sourceBindings.connectorGeometry.sha256
  === sourceBindings.connectorGeometry.sha256, 'selection connector binding drift');
invariant(autonomousSelections.sourceBindings.d05FutureMountain.sha256
  === sourceBindings.d05FutureMountain.sha256, 'selection D05 future-mountain binding drift');
invariant(d05Mountain.b09FaceComparison.recommendedAlternativeId
  === 'FM-01-COMPACT-EAST-FACE', 'FM-01 recommendation drift');
invariant(d05Mountain.b09FaceComparison.selectedAlternativeId === null,
  'source technical alternative unexpectedly self-selected');
invariant(completeSaveAudit.status === 'HOLD_INCOMPLETE_OR_UNBOUND_SAVE',
  'complete-save evidence boundary changed; re-review required');

const selectedAlternative = d05Mountain.alternatives.find(
  ({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE',
);
invariant(selectedAlternative, 'FM-01 exact alternative missing');
const sourceRoute = selectedAlternative.routeAccommodation.b09Funicular;
const route = buildSelectedRoute(connector.funicularFaceComparison.designEndpoints);
invariant(route.points.length === sourceRoute.pointCount, 'centerline point-count drift');
invariant(orderedCenterlineHash(route.points) === sourceRoute.orderedCenterlineSha256,
  'ordered centerline hash drift');
invariant(JSON.stringify(route.curveIndices) === JSON.stringify(sourceRoute.curveIndices),
  'centerline curve-index drift');
invariant(route.throat.x === sourceRoute.throat.x && route.throat.climbZ === sourceRoute.throat.climbZ,
  'throat geometry drift');
invariant(route.minimumAccommodation.length
  === sourceRoute.minimumPlanningAccommodation.cellCount, 'minimum accommodation count drift');
invariant(coordinateHash(route.minimumAccommodation)
  === sourceRoute.minimumPlanningAccommodation.coordinateSetSha256,
  'minimum accommodation hash drift');
invariant(d05FutureState.exactReservationsAndInterfaces.b09MinimumPlanningAccommodation
  .coordinateSetSha256 === sourceRoute.minimumPlanningAccommodation.coordinateSetSha256,
  'D05 future-state B09 identity drift');

const stationSeedPointCountPerEnd = 9;
const lowerStationPoints = route.points.slice(0, stationSeedPointCountPerEnd);
const summitStationPoints = route.points.slice(-stationSeedPointCountPerEnd);
const stationCells = (points) => dilate(uniqueCells(points.flatMap(({ x, y, z }) => [
  { x, y, z },
  { x, y: y + 1, z },
])), 1);
const lowerStation = stationCells(lowerStationPoints);
const summitStation = stationCells(summitStationPoints);
const stationUnion = union(lowerStation, summitStation);
const guidewayAndSupport = difference(route.minimumAccommodation, stationUnion);
const railCells = uniqueCells(route.points.map(({ x, y, z }) => ({ x, y, z })));
const supportCarrier = uniqueCells(route.points.map(({ x, y, z }) => ({ x, y: y - 1, z })));
const powerControlCarrier = uniqueCells(
  route.points.map(({ x, y, z }) => ({ x, y: y + 2, z })),
);
const maintenanceEgress = [];
for (const point of route.points) {
  for (const tangent of localDirections(route.points, point.index)) {
    const left = { x: -tangent.z, z: tangent.x };
    const right = { x: tangent.z, z: -tangent.x };
    for (const side of [left, right]) {
      maintenanceEgress.push(
        { x: point.x + side.x, y: point.y, z: point.z + side.z },
        { x: point.x + side.x, y: point.y + 1, z: point.z + side.z },
      );
    }
  }
}
const maintenanceEgressCells = uniqueCells(maintenanceEgress);
const rescueTransfer = stationUnion;
const lowerPortalSeal = route.minimumAccommodation.filter((cell) => cell.x === 2047
  && cell.y >= 129 && cell.y <= 132 && cell.z >= -749 && cell.z <= -747);
const summitSeal = route.minimumAccommodation.filter((cell) => cell.z === -829
  && cell.x >= 2047 && cell.x <= 2049 && cell.y >= 303 && cell.y <= 306);

for (const [name, cells] of Object.entries({
  lowerStation,
  summitStation,
  stationUnion,
  guidewayAndSupport,
  railCells,
  supportCarrier,
  powerControlCarrier,
  maintenanceEgressCells,
  rescueTransfer,
  lowerPortalSeal,
  summitSeal,
})) {
  invariant(intersection(cells, route.minimumAccommodation).length === cells.length,
    `${name} escapes the exact minimum planning accommodation`);
}

const b08Cells = [];
for (const point of connector.serviceTunnelCenterline.centerline.points) {
  for (const orientation of point.orientations) {
    for (let lateral = -2; lateral <= 3; lateral += 1) {
      for (let vertical = -1; vertical <= 4; vertical += 1) {
        b08Cells.push(orientation === 'x'
          ? { x: point.x, y: point.y + vertical, z: point.z + lateral }
          : { x: point.x + lateral, y: point.y + vertical, z: point.z });
      }
    }
  }
}
const exactB08 = dilate(b08Cells, 1);
invariant(exactB08.length
  === selectedAlternative.routeAccommodation.b08ServiceTunnelInteractionReservation.cellCount,
  'B08 exact cell count drift');
invariant(coordinateHash(exactB08)
  === selectedAlternative.routeAccommodation.b08ServiceTunnelInteractionReservation
    .coordinateSetSha256, 'B08 exact cell identity drift');
const b08Overlap = intersection(route.minimumAccommodation, exactB08);
invariant(b08Overlap.length === sourceRoute.b08PlanningInterfaceIntersection.cellCount,
  'B08/B09 interface cell-count drift');
invariant(coordinateHash(b08Overlap)
  === sourceRoute.b08PlanningInterfaceIntersection.coordinateSetSha256,
  'B08/B09 interface identity drift');

const relicCoreCells = union(...relicClearance.relics.map((relic) => (
  cellsIn(relic.declaredInclusiveBounds)
)));
const relicOverlap = intersection(route.minimumAccommodation, relicCoreCells);
invariant(relicOverlap.length === 0, 'B09 intersects a protected generated-start core');
invariant(coordinateHash(relicOverlap)
  === sourceRoute.protectedRelicPlanningExclusionIntersection.coordinateSetSha256,
  'protected relic empty-set identity drift');

const d06EgressBounds = [
  ...d06Mechanisms.mechanismDevelopmentPayload.protectedEgressAndLiftSystems.map(
    (item) => item.combinedProtectedCoreReservation.bounds,
  ),
  d06Mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem.exactInteractionUnion.bounds,
];
invariant(d06EgressBounds.every((bounds) => boundsDisjoint(
  sourceRoute.minimumPlanningAccommodation.bounds,
  bounds,
)), 'B09 bounds intersect current D06 egress evidence');
invariant(sourceRoute.d06ExternalContinuationIntersection.cellCount === 0,
  'D05 source reports a D06 continuation conflict');

const generatedStartBoundsOverlaps = phase0Survey.generatedStructureStarts.filter(
  ({ bounds }) => !boundsDisjoint(sourceRoute.minimumPlanningAccommodation.bounds, bounds),
);
invariant(generatedStartBoundsOverlaps.length === 0,
  'B09 minimum accommodation intersects an observed generated start');

const proposalSets = {
  lowerStationEnvelope: setRecord(
    lowerStation,
    'Chebyshev-one shell around rail/headroom seeds for selected centerline indices 0..8.',
    { proposalRole: 'LOWER_STATION_AND_B08_TRANSFER_ENVELOPE' },
  ),
  summitStationEnvelope: setRecord(
    summitStation,
    `Chebyshev-one shell around rail/headroom seeds for selected centerline indices ${route.points.length - stationSeedPointCountPerEnd}..${route.points.length - 1}.`,
    { proposalRole: 'SUMMIT_STATION_AND_Z11_TRANSFER_ENVELOPE' },
  ),
  combinedStationEnvelope: setRecord(
    stationUnion,
    'Exact union of the disjoint lower and summit station proposal envelopes.',
    { proposalRole: 'STATIONS' },
  ),
  runningGuidewayAndSupportEnvelope: setRecord(
    guidewayAndSupport,
    'Exact minimum planning accommodation after subtracting the two proposed station envelopes.',
    { proposalRole: 'GUIDEWAY_SUPPORT_AND_SEPARATION_SHELL' },
  ),
  railDatumReservation: setRecord(
    railCells,
    'One exact rail-datum cell for every selected ordered centerline point.',
    { proposalRole: 'GUIDEWAY_RAIL_DATUM' },
  ),
  maintenanceAndEgressReservation: setRecord(
    maintenanceEgressCells,
    'Two-cell-high one-block side reservations on both perpendicular sides of every local cardinal tangent; curve cells use the union of entering and leaving tangents.',
    { proposalRole: 'MAINTENANCE_AND_UNCOMMISSIONED_EGRESS' },
  ),
  rescueTransferReservation: setRecord(
    rescueTransfer,
    'Exact union of both station envelopes, reserved only as candidate rescue-transfer space; no rescue route or capacity is credited.',
    { proposalRole: 'ENDPOINT_RESCUE_TRANSFER' },
  ),
  powerAndControlCarrierReservation: setRecord(
    powerControlCarrier,
    'One overhead carrier cell at rail Y+2 for each selected centerline point.',
    { proposalRole: 'POWER_AND_CONTROL_CARRIER_ONLY' },
  ),
  drainageCarrierReservation: setRecord(
    supportCarrier,
    'One under-rail carrier cell at rail Y-1 for each selected centerline point.',
    { proposalRole: 'DRAINAGE_CARRIER_ONLY_NO_FLOW_OR_RECEIVER' },
  ),
};

const exactSealedInterfaces = [
  {
    interfaceId: 'IF-B08-B09-PORTAL',
    fromScope: 'B08-SERVICE-TUNNEL',
    toScope: 'B09-FUNICULAR',
    direction: 'B08_TO_B09',
    defaultDeny: true,
    wildcard: false,
    lastWriterWins: false,
    sealedByDefault: true,
    exactCellSet: setRecord(
      b08Overlap,
      'Exact intersection of the bound B08 interaction reservation and selected B09 minimum accommodation.',
    ),
    interfaceAccepted: false,
    acceptedInterfaceCellCount: 0,
  },
  {
    interfaceId: 'IF-B09-Z11-SUMMIT',
    fromScope: 'B09-FUNICULAR',
    toScope: 'Z11-SUMMIT',
    direction: 'B09_TO_Z11',
    defaultDeny: true,
    wildcard: false,
    lastWriterWins: false,
    sealedByDefault: true,
    exactCellSet: setRecord(
      summitSeal,
      'Twelve-cell exterior cap one block north of the final summit-interface rail/headroom seed.',
    ),
    interfaceAccepted: false,
    acceptedInterfaceCellCount: 0,
  },
];

const nullHeldSystemsAndInterfaces = [
  {
    id: 'B09-NULL-01-LINER-FOUNDATION-AND-GROUND-SUPPORT',
    kind: 'TECHNICAL_STATE_AND_INFLUENCE_SET',
    exactCellSet: null,
    status: 'HOLD_GEOTECHNICAL_AND_COMPLETE_SAVE',
    requirement: 'Accepted loads, liner/foundation states, deformation limits, construction influence, and complete-save source guards.',
  },
  {
    id: 'B09-NULL-02-DRIVE-BRAKE-VEHICLE-AND-BARRIER-MECHANISMS',
    kind: 'MECHANISM_CELL_SET',
    exactCellSet: null,
    status: 'HOLD_MECHANISM_ENGINEERING_AND_EXPERT_ACCEPTANCE',
    requirement: 'Drive, cable/haul, braking, overspeed, vehicle, platform-barrier, failure-state, and commissioning designs.',
  },
  {
    id: 'B09-NULL-03-INTERMEDIATE-REFUGE-PASSING-AND-RESCUE-ROUTE',
    kind: 'LIFE_SAFETY_AND_RESCUE_CELL_SET',
    exactCellSet: null,
    status: 'HOLD_LIFE_SAFETY_EXPERT_ACCEPTANCE',
    requirement: 'Passing/refuge spacing, protected route, assisted rescue, accessibility, smoke separation, and exterior discharge acceptance.',
  },
  {
    id: 'B09-NULL-04-POWER-FEED-CIRCUITS-EQUIPMENT-AND-CONTROL-LOGIC',
    kind: 'POWER_CONTROL_MECHANISM_AND_INTERFACE_SET',
    exactCellSet: null,
    status: 'HOLD_MECHANISM_AND_ELECTRICAL_ACCEPTANCE',
    requirement: 'Normal/emergency feeds, independent circuits, equipment rooms, controls, fire mode, and failure behavior.',
  },
  {
    id: 'B09-NULL-05-SUMPS-FLOW-PATHS-OUTFALL-AND-RECEIVER',
    kind: 'HYDROLOGY_AND_DIRECTIONAL_INTERFACE_SET',
    exactCellSet: null,
    status: 'HOLD_HYDROLOGY_GEOTECHNICAL_AND_RECEIVER_ACCEPTANCE',
    requirement: 'Inflow, groundwater, snowmelt, erosion, sump capacity, pumped/gravity flow, discharge state, outfall, and receiver contract.',
  },
  {
    id: 'B09-NULL-06-D05-GUIDEWAY-MOUNTAIN-SUPPORT-INTERFACE',
    kind: 'DIRECTIONAL_INTERFACE_AND_TRANSITION_STATE_SET',
    exactCellSet: null,
    status: 'HOLD_GEOTECHNICAL_HYDROLOGY_AND_OWNER_ACCEPTANCE',
    requirement: 'Exact exterior liner/support boundary, transition states, load transfer, water control, construction influence, and directional owner acceptance.',
  },
  {
    id: 'B09-NULL-07-D06-PROTECTED-EGRESS-RECEIVER',
    kind: 'DIRECTIONAL_LIFE_SAFETY_INTERFACE_SET',
    exactCellSet: null,
    status: 'HOLD_ROUTE_GEOMETRY_MECHANISM_AND_EXPERT_ACCEPTANCE',
    requirement: 'An exact protected egress continuation from B09 to a safe exterior or independently accepted D06 receiver.',
  },
  {
    id: 'B09-NULL-08-COMPLETE-SAVE-ALL-START-ENTITY-POI-GATE',
    kind: 'SOURCE_GUARD_AND_INFLUENCE_SET',
    exactCellSet: null,
    status: 'HOLD_COMPLETE_SAVE',
    requirement: 'One same-moment region/entities/POI/level.dat package and a rerun of all-start/entity/POI conflicts against every proposed influence set.',
  },
];

const technicalSetEntries = Object.entries(proposalSets).sort(([left], [right]) => (
  left.localeCompare(right)
));
const technicalReservationManifestSha256 = sha256([
  TECHNICAL_MANIFEST_PREAMBLE,
  ...technicalSetEntries.map(([id, record]) => (
    `${id}\t${record.proposalRole}\t${record.cellCount}\t${record.coordinateSetSha256}`
  )),
  ...exactSealedInterfaces.map((record) => (
    `${record.interfaceId}\t${record.direction}\t${record.exactCellSet.cellCount}\t`
    + `${record.exactCellSet.coordinateSetSha256}\tSEALED`
  )),
  '',
].join('\n'));

const conflictAudit = {
  b08: {
    status: 'PASS_EXACT_NONZERO_INTERFACE_DEFAULT_DENY',
    sourceReservationCellCount: exactB08.length,
    exactIntersection: setRecord(
      b08Overlap,
      'Recomputed exact B08/B09 reservation intersection.',
    ),
    proposedRoleIntersectionCounts: Object.fromEntries(technicalSetEntries.map(([id, record]) => {
      const sourceCells = {
        lowerStationEnvelope: lowerStation,
        summitStationEnvelope: summitStation,
        combinedStationEnvelope: stationUnion,
        runningGuidewayAndSupportEnvelope: guidewayAndSupport,
        railDatumReservation: railCells,
        maintenanceAndEgressReservation: maintenanceEgressCells,
        rescueTransferReservation: rescueTransfer,
        powerAndControlCarrierReservation: powerControlCarrier,
        drainageCarrierReservation: supportCarrier,
      }[id];
      return [id, intersection(sourceCells, exactB08).length];
    })),
    resolution: 'The exact 36-cell overlap is retained as a sealed B08-to-B09 proposal interface; neither scope receives accepted ownership or opening authority.',
  },
  d05MountainAndSupport: {
    status: 'PASS_EXACT_WITHHOLDING_AND_ZERO_SUPPORT_GAP_INTERSECTION_TECHNICAL_HOLD',
    rawFutureMountainFillConflictCellCount:
      selectedAlternative.sparseAddedSolidIntervals.b09WithheldFillCellCount,
    selectedFutureMountainCandidateConflictAfterWithholdingCellCount: 0,
    supportGapIntersectionCellCount:
      d05FutureState.exactReservationsAndInterfaces.b09MinimumPlanningAccommodation
        .supportGapRawIntersectionCellCount,
    minimumAccommodationCurrentCensus:
      sourceRoute.immutableSourceCensus,
    qualification: 'The exact planning reservation removes the known raw fill conflict. It does not provide liner, foundation, load-transfer, hydrology, or construction-influence acceptance.',
  },
  d06Egress: {
    status: 'PASS_EXACT_CURRENT_RESERVATIONS_DISJOINT_RECEIVER_HOLD',
    comparedReservationCount: d06EgressBounds.length,
    exactIntersection: setRecord([], 'Bounds-disjoint proof against EG-A, EG-B, and B07 exact interaction reservations.'),
    safeExteriorOrProtectedReceiverAccepted: false,
  },
  protectedRelicCores: {
    status: 'PASS_EXACT_GENERATED_START_CORES_DISJOINT_EXPERT_INFLUENCE_HOLD',
    comparedCoreCount: relicClearance.relics.length,
    comparedCoreCellCount: relicCoreCells.length,
    exactIntersection: setRecord(relicOverlap, 'Intersection with all three frozen generated-start protected cores.'),
    positiveMarginAndExpertInfluenceAccepted: false,
  },
  observedGeneratedStarts: {
    status: 'PASS_OBSERVED_START_BOUNDS_DISJOINT_COMPLETE_SAVE_ALL_START_HOLD',
    comparedStartRecordCount: phase0Survey.generatedStructureStarts.length,
    overlappingStartRecordCount: generatedStartBoundsOverlaps.length,
    overlappingStartRecords: generatedStartBoundsOverlaps,
    completeSaveAllStartCensusAccepted: false,
    qualification: 'The observed Phase 0 starts are clear. The incomplete save cannot prove that the inventory is a final all-start/entity/POI source guard.',
  },
};

const passHoldMatrix = [
  {
    id: 'B09-TS-G01-SOURCE-AND-SELECTION-CHAIN',
    status: 'PASS',
    result: 'The owner-delegated FM-01 planning selection and every consumed exact artifact are byte/hash bound; technical acceptance remains false.',
  },
  {
    id: 'B09-TS-G02-CENTERLINE-AND-MINIMUM-ACCOMMODATION',
    status: 'PASS_EXACT_PROPOSAL_ONLY',
    result: `Reproduced ${route.points.length} centerline points and all ${route.minimumAccommodation.length.toLocaleString('en-US')} minimum-accommodation cells exactly.`,
  },
  {
    id: 'B09-TS-G03-FUNCTIONAL-RESERVATION-LAYERS',
    status: 'PASS_EXACT_PROPOSAL_ONLY',
    result: `${technicalSetEntries.length} deterministic station/guideway/maintenance/rescue/power/drainage proposal layers remain entirely inside the selected minimum accommodation.`,
  },
  {
    id: 'B09-TS-G04-B08-INTERFACE',
    status: 'PASS_EXACT_SEALED_PROPOSAL_ONLY',
    result: `The known ${b08Overlap.length}-cell B08/B09 overlap is isolated as an exact sealed default-deny proposal interface.`,
  },
  {
    id: 'B09-TS-G05-D05-MOUNTAIN-AND-SUPPORT',
    status: 'PASS_EXACT_CONFLICT_WITHHELD_TECHNICAL_HOLD',
    result: `${selectedAlternative.sparseAddedSolidIntervals.b09WithheldFillCellCount.toLocaleString('en-US')} raw D05 fill cells are withheld by the B09 reservation; selected fill and below-Y72 support-gap intersections are zero.`,
  },
  {
    id: 'B09-TS-G06-D06-EGRESS-AND-PROTECTED-RELIC',
    status: 'PASS_EXACT_CURRENT_GEOMETRY_EXPERT_HOLD',
    result: 'B09 is disjoint from current D06 egress/B07 reservations and all three protected generated-start cores; no egress receiver or positive expert influence is inferred.',
  },
  {
    id: 'B09-TS-G07-OBSERVED-GENERATED-STARTS',
    status: 'PASS_OBSERVED_COMPLETE_SAVE_HOLD',
    result: `All ${phase0Survey.generatedStructureStarts.length} observed generated-start bounds are disjoint, but complete-save all-start/entity/POI clearance remains unproven.`,
  },
  {
    id: 'B09-TS-G08-MECHANISMS-HYDROLOGY-GEOTECHNICAL-LIFE-SAFETY',
    status: 'HOLD',
    result: `${nullHeldSystemsAndInterfaces.length} technical systems/interfaces remain explicit null/HOLD; carrier reservations are not mechanism, flow, support, or commissioning designs.`,
  },
  {
    id: 'B09-TS-G09-ACCEPTANCE-AND-RELEASE',
    status: 'HOLD',
    result: 'Accepted cells, owners, interfaces, mechanisms, material states, operations, and build authority all remain zero.',
  },
];

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-b09-funicular-technical-system-proposal',
  generatedAtUtc: GENERATED_AT,
  status: 'PARTIAL_PASS_EXACT_B09_TECHNICAL_RESERVATION_PROPOSAL_MECHANISMS_AND_ACCEPTANCE_HOLD',
  purpose: 'Remove B09 geometry ambiguity with exact bounded proposal reservations while preserving complete-save, hydrology, geotechnical, mechanism, life-safety, expert, owner, and interface acceptance gates.',
  sourceBindings,
  authorityBoundary: {
    selectedPlanningAlternative: 'FM-01-COMPACT-EAST-FACE',
    delegatedPlanningSelectionPreserved: true,
    technicalAcceptanceClaimed: false,
    ownerAcceptanceClaimed: false,
    interfaceAcceptanceClaimed: false,
    mechanismAcceptanceClaimed: false,
    constructionOrOperationAuthorityClaimed: false,
  },
  deterministicGeometryContract: {
    coordinateOrder: 'numeric x, then y, then z',
    coordinateSetPreamble: `${COORDINATE_PREAMBLE}\\n`,
    centerlinePreamble: `${CENTERLINE_PREAMBLE}\\n`,
    selectedModelIdentitySha256: selectedAlternative.modelIdentitySha256,
    selectedModelFormulaSha256: selectedAlternative.formulaSha256,
    orderedCenterlineSha256: orderedCenterlineHash(route.points),
    centerlinePointCount: route.points.length,
    horizontalStepCount: route.steps.length,
    curveIndices: route.curveIndices,
    throat: route.throat,
    stationSeedPointCountPerEnd,
    minimumPlanningAccommodation: setRecord(
      route.minimumAccommodation,
      sourceRoute.minimumPlanningAccommodation.derivation,
    ),
    technicalReservationManifestSha256,
  },
  exactTechnicalReservationProposals: {
    status: 'PASS_EXACT_PROPOSAL_ONLY_TECHNICAL_ACCEPTANCE_HOLD',
    proposalLayerCount: technicalSetEntries.length,
    proposalLayers: proposalSets,
    proposalEnvelopeUniqueCellCount: route.minimumAccommodation.length,
    acceptedTechnicalCellCount: 0,
    acceptedOwnerAssignmentCount: 0,
  },
  exactSealedInterfaceProposals: {
    status: 'PASS_EXACT_SEALED_PROPOSAL_ONLY_INTERFACE_ACCEPTANCE_HOLD',
    exactInterfaceCount: exactSealedInterfaces.length,
    interfaces: exactSealedInterfaces,
    acceptedInterfaceCount: 0,
    acceptedInterfaceCellCount: 0,
  },
  conflictAudit,
  nullHeldSystemsAndInterfaces,
  passHoldMatrix,
  ambiguityRemoved: [
    'The selected east-face route is reproduced as one exact 561-point ordered centerline rather than a narrative face choice.',
    'The complete 7,800-cell minimum accommodation is exact and hash-bound.',
    'Two station ends, the running guideway/support shell, side maintenance/egress lanes, endpoint rescue-transfer space, an overhead power/control carrier, and an under-rail drainage carrier now have exact proposal cells.',
    'The 36-cell B08 portal seam and 12-cell summit cap are exact, directional, sealed, default-deny proposals.',
    'The known D05 raw-fill conflict is quantified and withheld; current D06, protected-core, and observed generated-start geometry is conflict-free.',
  ],
  genuineResidualBlockers: nullHeldSystemsAndInterfaces.map(({ id, status, requirement }) => ({
    id,
    status,
    requirement,
  })),
  disposition: {
    exactCenterlineReproduced: true,
    exactMinimumAccommodationReproduced: true,
    exactTechnicalReservationLayersCompiled: true,
    currentExactConflictAuditPassed: true,
    completeSaveAllStartGatePassed: false,
    geotechnicalAndHydrologyAccepted: false,
    mechanismsAccepted: false,
    lifeSafetyAndRescueAccepted: false,
    ownerAndInterfacesAccepted: false,
    b09TechnicallyAccepted: false,
    b09ConstructionReady: false,
    r00Passed: false,
  },
  safetyBoundary: {
    offlineOnly: true,
    liveCallsPerformed: [],
    operations: [],
    operationCellCount: 0,
    materialCellCount: 0,
    futureCellCount: 0,
    constructionCellCount: 0,
    acceptedCellCount: 0,
    acceptedOwnerAssignmentCount: 0,
    acceptedInterfaceCellCount: 0,
    acceptedMechanismCellCount: 0,
    worldEditAuthorized: false,
    physicalBuildAuthorized: false,
    executable: false,
  },
};

report.reportIdentitySha256 = sha256(JSON.stringify({
  id: report.id,
  sourceBindings: report.sourceBindings,
  authorityBoundary: report.authorityBoundary,
  deterministicGeometryContract: report.deterministicGeometryContract,
  exactTechnicalReservationProposals: report.exactTechnicalReservationProposals,
  exactSealedInterfaceProposals: report.exactSealedInterfaceProposals,
  conflictAudit: report.conflictAudit,
  nullHeldSystemsAndInterfaces: report.nullHeldSystemsAndInterfaces,
}));

const proposalRow = ([id, record]) => (
  `| ${id} | ${record.proposalRole} | ${record.cellCount.toLocaleString('en-US')} | \`${record.coordinateSetSha256}\` |`
);
const gateRow = (gate) => `| ${gate.id} | ${gate.status} | ${gate.result} |`;
const markdown = `# Combined Zones Phase 1 B09 funicular technical-system proposal

Status: **${report.status}**

This proposal converts the selected FM-01 east-face B09 planning route into
exact bounded technical reservations. It does not accept a design, mechanism,
owner, interface, material state, operation, or physical build.

## Exact geometry

- Ordered centerline points: **${route.points.length.toLocaleString('en-US')}**
- Horizontal steps: **${route.steps.length.toLocaleString('en-US')}**
- Minimum planning accommodation: **${route.minimumAccommodation.length.toLocaleString('en-US')} cells**
- Proposed reservation layers: **${technicalSetEntries.length}**
- Exact sealed interface proposals: **${exactSealedInterfaces.length}**
- Accepted cells / owners / interfaces / mechanisms / operations: **0 / 0 / 0 / 0 / 0**

## Technical reservation proposals

| Layer | Role | Cells | Coordinate identity |
|---|---|---:|---|
${technicalSetEntries.map(proposalRow).join('\n')}

These layers may overlap because they describe functional reservations inside
one exact envelope. The carrier cells do not prove utilities, flow, structure,
or mechanism states.

## Conflict result

- B08 has one known **${b08Overlap.length}-cell** portal seam. It stays sealed and default-deny.
- D05 raw future fill has **${selectedAlternative.sparseAddedSolidIntervals.b09WithheldFillCellCount.toLocaleString('en-US')}** conflicts, all withheld by the exact B09 reservation. Selected future fill and the below-Y72 support gap intersect B09 at zero cells.
- Current D06 egress/B07 reservations intersect at **0** cells.
- The three protected generated-start cores intersect at **0** cells.
- All ${phase0Survey.generatedStructureStarts.length} observed generated-start bounds intersect at **0** cells. This is not a complete-save all-start proof.

## Ambiguity removed

${report.ambiguityRemoved.map((item) => `- ${item}`).join('\n')}

## Genuine residual blockers

${report.genuineResidualBlockers.map((item) => `- **${item.id}** — ${item.requirement}`).join('\n')}

## PASS/HOLD matrix

| Gate | Status | Result |
|---|---|---|
${passHoldMatrix.map(gateRow).join('\n')}

## Safety boundary

This was a deterministic offline compilation of existing artifacts. No live
call, world edit, material state, mechanism, construction cell, or operation
was created or accepted. Report identity: \`${report.reportIdentitySha256}\`.
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  status: report.status,
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  reportIdentitySha256: report.reportIdentitySha256,
  technicalReservationManifestSha256,
  centerlinePointCount: route.points.length,
  minimumAccommodationCellCount: route.minimumAccommodation.length,
  proposalLayerCount: technicalSetEntries.length,
  exactSealedInterfaceCount: exactSealedInterfaces.length,
  nullHeldSystemAndInterfaceCount: nullHeldSystemsAndInterfaces.length,
  acceptedCellCount: 0,
  acceptedOwnerAssignmentCount: 0,
  acceptedInterfaceCellCount: 0,
  acceptedMechanismCellCount: 0,
  operationCellCount: 0,
}, null, 2));
