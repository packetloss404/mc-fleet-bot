#!/usr/bin/env node
/**
 * Compile a deterministic, offline-only P1-B03 Cheyenne J-curve candidate.
 *
 * This script reads only reconciled planning artifacts. It emits exact review
 * geometry, not construction ownership, material cells, block operations, or
 * authority to edit a world.
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

const GENERATED_AT = value('--generated-at', '2026-08-04T23:00:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.md',
));

const INPUTS = Object.freeze({
  authorityReconciliation: 'masterplans/04-combined-complex/authority-reconciliation.json',
  normalizedCoordinates: 'masterplans/04-combined-complex/02-design/site-coordinates.json',
  coordinateRegistry: 'masterplans/05-combined-zones/site-coordinates.json',
  phase0Evidence: 'masterplans/05-combined-zones/phase0-survey-evidence.json',
  geometryCoordination: 'masterplans/05-combined-zones/phase1-geometry-coordination.json',
  protectedRelicClearance: 'masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  connectorGeometry: 'masterplans/05-combined-zones/phase1-connector-geometry.json',
});

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function binding(relativePath, role) {
  const data = fs.readFileSync(absolute(relativePath));
  return {
    path: relativePath,
    role,
    bytes: data.length,
    sha256: sha256(data),
  };
}

function invariant(condition, message) {
  if (!condition) throw new Error(`P1-B03 input rejected: ${message}`);
}

function key({ x, y, z }) {
  return `${x},${y},${z}`;
}

function numericCoordinateSort(a, b) {
  return a.x - b.x || a.y - b.y || a.z - b.z;
}

function coordinateManifest(cells) {
  const sorted = [...cells].sort(numericCoordinateSort);
  const body = sorted.map(({ x, y, z }) => `${x},${y},${z}\n`).join('');
  return {
    representation: 'explicit-integer-coordinate-set',
    canonicalOrder: 'numeric x, then y, then z',
    cellCount: sorted.length,
    coordinateSetSha256: sha256(`combined-zones-coordinate-cell-set-v1\n${body}`),
    cells: sorted,
  };
}

function centerlineManifest(points) {
  const body = points.map((point) => [
    point.index,
    point.x,
    point.y,
    point.z,
    point.phase,
    point.tangent,
    point.risingFromPrevious ? 1 : 0,
  ].join(',')).join('\n');
  return {
    representation: 'ordered-integer-centerline-v1',
    pointCount: points.length,
    horizontalStepCount: points.length - 1,
    sha256: sha256(`combined-zones-ordered-centerline-v1\n${body}\n`),
    points,
  };
}

function insideInclusive(point, bounds) {
  return point.x >= bounds.minX && point.x <= bounds.maxX
    && point.y >= bounds.minY && point.y <= bounds.maxY
    && point.z >= bounds.minZ && point.z <= bounds.maxZ;
}

function insideHalfOpen(point, bounds) {
  return point.x >= bounds.minXInclusive && point.x < bounds.maxXExclusive
    && point.y >= bounds.minYInclusive && point.y < bounds.maxYExclusive
    && point.z >= bounds.minZInclusive && point.z < bounds.maxZExclusive;
}

function pushStep(points, dx, dz, phase, tangent) {
  const previous = points.at(-1);
  const nextIndex = previous.index + 1;
  const rise = nextIndex <= 180 && nextIndex % 5 === 0 ? 1 : 0;
  points.push({
    index: nextIndex,
    x: previous.x + dx,
    y: previous.y + rise,
    z: previous.z + dz,
    phase,
    tangent,
    risingFromPrevious: rise === 1,
  });
}

function appendRun(points, count, dx, dz, phase, tangent) {
  for (let index = 0; index < count; index += 1) {
    pushStep(points, dx, dz, phase, tangent);
  }
}

const authority = readJson(INPUTS.authorityReconciliation);
const normalized = readJson(INPUTS.normalizedCoordinates);
const coordinates = readJson(INPUTS.coordinateRegistry);
const phase0 = readJson(INPUTS.phase0Evidence);
const geometry = readJson(INPUTS.geometryCoordination);
const relics = readJson(INPUTS.protectedRelicClearance);
const connector = readJson(INPUTS.connectorGeometry);

invariant(authority.planToDevelop?.path === 'masterplans/05-combined-zones/MASTERPLAN.md',
  'unexpected plan of record');
invariant(geometry.status === 'PHASE1_COORDINATION_PARTIAL_PASS_OPERATION_COMPILATION_BLOCKED',
  'unexpected geometry-coordination status');
invariant(connector.status
  === 'PARTIAL_PASS_EXACT_B07_B08_CANDIDATES_B09_PROFILE_ALL_CONSTRUCTION_HOLD',
  'unexpected connector status');
invariant(geometry.blockerMatrix?.some(({ id }) => id === 'P1-B03-CHEYENNE-JCURVE'),
  'P1-B03 is not a declared blocker');
invariant(relics.g06Disposition?.status === 'HOLD', 'G06 must remain HOLD');

const normalizedStart = normalized.key_locations.cheyenne_jcurve_start;
const normalizedEnd = normalized.key_locations.cheyenne_jcurve_end;
const portal = coordinates.zones['10'].outerPortal;
const transformedEnd = geometry.compiledCoordinationGeometry.transformedInterfaceAnchors
  .find(({ id }) => id === 'cheyenne-chamber-center').compiled.setout;
invariant(JSON.stringify(normalizedStart) === JSON.stringify({
  x: 0,
  y: 200,
  z: -420,
  description: normalizedStart.description,
}), 'normalized start coordinate drift');
invariant(normalizedEnd.x === 0 && normalizedEnd.y === 300 && normalizedEnd.z === -540,
  'normalized end coordinate drift');
invariant(portal.x === 2048 && portal.y === 130 && portal.z === -748,
  'world portal coordinate drift');
invariant(transformedEnd.x === 2048 && transformedEnd.y === 166 && transformedEnd.z === -868,
  'world chamber coordinate drift');

const points = [{
  index: 0,
  x: portal.x,
  y: portal.y,
  z: portal.z,
  phase: 'PORTAL',
  tangent: 'EAST',
  risingFromPrevious: false,
}];

// An exact 800-step, two-bend baffle route. The ten-plus-ten cardinal stair
// rasters at each bend are level and keep both endpoints exact.
appendRun(points, 330, 1, 0, 'LEG-1-ROUGH-ROCK', 'EAST');
appendRun(points, 10, 1, 0, 'BEND-1-COARSE-R10', 'EAST');
appendRun(points, 10, 0, -1, 'BEND-1-COARSE-R10', 'NORTH');
appendRun(points, 100, 0, -1, 'LEG-2-CONCRETE-LINER', 'NORTH');
appendRun(points, 10, 0, -1, 'BEND-2-COARSE-R10', 'NORTH');
appendRun(points, 10, -1, 0, 'BEND-2-COARSE-R10', 'WEST');
appendRun(points, 330, -1, 0, 'LEG-3-INSTITUTIONAL', 'WEST');

invariant(points.length === 801, 'centerline must contain 801 points');
invariant(points.at(-1).x === transformedEnd.x
  && points.at(-1).y === transformedEnd.y
  && points.at(-1).z === transformedEnd.z, 'centerline does not meet the chamber anchor');

for (let index = 1; index < points.length; index += 1) {
  const previous = points[index - 1];
  const current = points[index];
  invariant(Math.abs(current.x - previous.x) + Math.abs(current.z - previous.z) === 1,
    `non-cardinal horizontal step at ${index}`);
  invariant(current.y - previous.y === 0 || current.y - previous.y === 1,
    `invalid vertical step at ${index}`);
}

const risingSteps = points.filter(({ risingFromPrevious }) => risingFromPrevious).length;
invariant(risingSteps === 36, 'expected 36 rising steps');
invariant(points.slice(331).every((point, index, array) => (
  index === 0 || point.y === array[index - 1].y
)), 'both curves and later legs must remain level');

const excavationMap = new Map();
for (const point of points) {
  const normalAxis = point.tangent === 'EAST' || point.tangent === 'WEST' ? 'z' : 'x';
  for (let lateral = -2; lateral <= 2; lateral += 1) {
    for (let vertical = 0; vertical <= 3; vertical += 1) {
      const cell = {
        x: point.x + (normalAxis === 'x' ? lateral : 0),
        y: point.y + vertical,
        z: point.z + (normalAxis === 'z' ? lateral : 0),
      };
      excavationMap.set(key(cell), cell);
    }
  }
}
const excavationCells = [...excavationMap.values()];

const interactionMap = new Map();
const excavationKeys = new Set(excavationMap.keys());
const neighbors = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
for (const cell of excavationCells) {
  for (const [dx, dy, dz] of neighbors) {
    const neighbor = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
    if (!excavationKeys.has(key(neighbor))) interactionMap.set(key(neighbor), neighbor);
  }
}
const interactionCells = [...interactionMap.values()];

const mountain = geometry.compiledCoordinationGeometry.normalized04EnvelopeCellSets
  .find(({ id }) => id === 'continuous-mountain').exactCoordinationCellSet.bounds;
const chamber = geometry.compiledCoordinationGeometry.normalized04EnvelopeCellSets
  .find(({ id }) => id === 'cheyenne-chamber').exactCoordinationCellSet.bounds;
invariant(excavationCells.every((cell) => insideHalfOpen(cell, mountain)),
  'candidate excavation leaves the coordination mountain envelope');

const structureIntersections = phase0.generatedStructureStarts.map((structure, index) => {
  const cells = excavationCells.filter((cell) => insideInclusive(cell, structure.bounds));
  return {
    structureIndex: index,
    structureId: structure.id,
    bounds: structure.bounds,
    intersection: coordinateManifest(cells),
  };
}).filter(({ intersection }) => intersection.cellCount > 0);

const relicIntersections = relics.relics.map((relic) => {
  const cells = excavationCells.filter((cell) => insideInclusive(cell, relic.declaredInclusiveBounds));
  return {
    relicKey: relic.key,
    protectedCoreSha256: relic.evidenceBackedDefaultDenyCore.coordinateSetSha256,
    intersection: coordinateManifest(cells),
  };
});

const chamberInterface = coordinateManifest(
  excavationCells.filter((cell) => insideHalfOpen(cell, chamber)),
);
const serviceReservationKeys = new Set();
for (const point of connector.serviceTunnelCenterline.centerline.points) {
  for (const orientation of point.orientations) {
    for (let lateral = -2; lateral <= 3; lateral += 1) {
      for (let vertical = -1; vertical <= 4; vertical += 1) {
        serviceReservationKeys.add(key({
          x: point.x + (orientation === 'z' ? lateral : 0),
          y: point.y + vertical,
          z: point.z + (orientation === 'x' ? lateral : 0),
        }));
      }
    }
  }
}
invariant(serviceReservationKeys.size
  === connector.serviceTunnelCenterline.exactCellSets.excavationReservation.cellCount,
  'B08 service reservation reconstruction drift');
const servicePortalInterface = coordinateManifest(
  excavationCells.filter((cell) => serviceReservationKeys.has(key(cell))),
);

const sourceBindings = Object.fromEntries(Object.entries(INPUTS).map(([id, relativePath]) => [
  id,
  binding(relativePath, {
    authorityReconciliation: '04-to-05 authority and controlling plan',
    normalizedCoordinates: 'normalized J-curve endpoints and 800-block intent',
    coordinateRegistry: 'current-world portal and chamber envelope',
    phase0Evidence: 'generated structure-start bounds',
    geometryCoordination: 'rational transform, envelopes, and blocker declaration',
    protectedRelicClearance: 'exact default-deny relic cores',
    connectorGeometry: 'exact B08 service reservation at the shared portal',
  }[id]),
]));

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-cheyenne-jcurve-geometry',
  generatedAtUtc: GENERATED_AT,
  status: 'PARTIAL_PASS_EXACT_JCURVE_PLANNING_GEOMETRY_P1_B03_TECHNICAL_HOLD',
  executable: false,
  worldEditAuthorized: false,
  operationCellCount: 0,
  materialCellCount: 0,
  sourceBindings,
  authorityBoundary: {
    authorityChain: '01 + 02 + 03 -> 04 normalized architecture -> 05 current-world placement',
    blockerId: 'P1-B03-CHEYENNE-JCURVE',
    normalizedIntent: {
      start: normalizedStart,
      end: normalizedEnd,
      sourceLengthBlocks: 800,
      retainedCharacterStages: [
        'rough rock',
        'concrete liner',
        'polished institutional approach',
      ],
    },
    currentWorldEndpoints: {
      portal,
      chamberAnchor: transformedEnd,
    },
    selectedPlanningBasis: 'EXACT_800_STEP_TWO_BEND_EAST_NORTH_WEST_BAFFLE',
    selectionQualification: 'RECOMMENDATION_READY_FOR_OWNER_DELEGATED_PLANNING_SELECTION_NOT_TECHNICAL_OR_RELEASE_ACCEPTANCE',
  },
  design: {
    crossSection: {
      widthBlocks: 5,
      heightBlocks: 4,
      lateralOffsetsInclusive: [-2, 2],
      verticalOffsetsInclusive: [0, 3],
      datum: 'walkable floor cell',
    },
    segments: [
      { id: 'LEG-1', direction: 'EAST', steps: 330, character: 'rough rock' },
      { id: 'BEND-1', directions: ['EAST', 'NORTH'], steps: 20, radiusDatum: 10, level: true },
      { id: 'LEG-2', direction: 'NORTH', steps: 100, character: 'concrete liner' },
      { id: 'BEND-2', directions: ['NORTH', 'WEST'], steps: 20, radiusDatum: 10, level: true },
      { id: 'LEG-3', direction: 'WEST', steps: 330, character: 'polished institutional' },
    ],
    verticalSchedule: {
      startY: portal.y,
      endY: transformedEnd.y,
      riseBlocks: transformedEnd.y - portal.y,
      risingStepCount: risingSteps,
      rule: 'rise one block after each five horizontal steps through centerline step 180; remain level thereafter',
      maximumAbsoluteStepGrade: 1,
      averageRisePerHorizontalRun: (transformedEnd.y - portal.y) / 800,
      curvesLevel: true,
    },
    sightline: {
      directPortalToChamberExcavationExists: false,
      bendCount: 2,
      reason: 'Parallel east-west legs are separated by 120 Z blocks and joined only through two level coarse-radius transitions at X=2388.',
    },
    centerline: centerlineManifest(points),
    excavationReservation: coordinateManifest(excavationCells),
    oneCellFaceInteractionShell: coordinateManifest(interactionCells),
  },
  collisionAndInterfaceAudit: {
    completeGeneratedStartCount: phase0.generatedStructureStarts.length,
    generatedStructureIntersections: structureIntersections,
    generatedStructureIntersectionCellCount: structureIntersections.reduce(
      (sum, item) => sum + item.intersection.cellCount,
      0,
    ),
    protectedRelicCoreIntersections: relicIntersections,
    protectedRelicCoreIntersectionCellCount: relicIntersections.reduce(
      (sum, item) => sum + item.intersection.cellCount,
      0,
    ),
    intendedInterfaces: [
      {
        id: 'JCURVE-TO-SERVICE-PORTAL',
        status: 'CANDIDATE_EXACT_OVERLAP_OWNER_CONTRACT_HOLD',
        cells: servicePortalInterface,
      },
      {
        id: 'JCURVE-TO-CHEYENNE-CHAMBER',
        status: 'CANDIDATE_EXACT_OVERLAP_CHILD_FIT_AND_OWNER_CONTRACT_HOLD',
        cells: chamberInterface,
      },
    ],
    noOtherPlannedOwnershipClaimed: true,
  },
  readiness: {
    exactIntegerCenterline: 'PASS_PLANNING_GEOMETRY',
    exactCurveRasters: 'PASS_TWO_LEVEL_COARSE_R10_TRANSITIONS',
    verticalStepSchedule: 'PASS_PLANNING_GEOMETRY',
    crossSectionSideBias: 'PASS_ODD_WIDTH_SYMMETRIC',
    mountainEnvelopeContainment: 'PASS_COORDINATION_ENVELOPE_ONLY',
    generatedStartClearance: structureIntersections.length === 0 ? 'PASS_BOUNDING_BOX_AUDIT' : 'HOLD',
    protectedCoreClearance: relicIntersections.every(
      ({ intersection }) => intersection.cellCount === 0,
    ) ? 'PASS_EXACT_DEFAULT_DENY_CORES' : 'HOLD',
    canonicalOwnerAssignment: 'HOLD',
    interfaceContracts: 'HOLD',
    liningDrainageUtilitiesAndEgress: 'HOLD_TECHNICAL_DESIGN',
    futureMountainState: 'HOLD_P1_B10',
    sourceStateAndOperations: 'DEFERRED_G08_G19',
    p1B03Resolved: false,
    reason: 'The route is exact and conservative planning geometry, but B03 cannot close until its owner/interfaces, lining/loading, drainage, utilities, accessibility/egress, future mountain state, and independent technical acceptance exist.',
  },
  safetyBoundary: {
    noLiveSystemsContacted: true,
    noWorldReadOrMutation: true,
    noOperationsEmitted: true,
    noConstructionOwnershipEmitted: true,
    noExpertAcceptanceClaimed: true,
  },
};

invariant(report.collisionAndInterfaceAudit.generatedStructureIntersectionCellCount === 0,
  'candidate intersects a generated structure-start bound');
invariant(report.collisionAndInterfaceAudit.protectedRelicCoreIntersectionCellCount === 0,
  'candidate intersects a protected relic core');
invariant(servicePortalInterface.cellCount > 0, 'service portal interface is empty');
invariant(chamberInterface.cellCount > 0, 'chamber interface is empty');

const markdown = `# Phase 1 Cheyenne J-curve planning geometry\n\n`
  + `Status: **PARTIAL PASS — EXACT P1-B03 PLANNING GEOMETRY — TECHNICAL HOLD — ZERO OPERATIONS**\n\n`
  + `This offline compiler binds the normalized 800-block J-curve intent to the current-world portal and chamber anchors. It produces an exact conservative review recommendation for the owner-delegated selection ledger. It does not create construction ownership, accept a life-safety or drainage design, model the future mountain, or authorize an edit.\n\n`
  + `## Exact candidate\n\n`
  + `- Portal: \`${portal.x},${portal.y},${portal.z}\`.\n`
  + `- Chamber anchor: \`${transformedEnd.x},${transformedEnd.y},${transformedEnd.z}\`.\n`
  + `- Centerline: **800 horizontal steps / 801 points**, two level coarse-radius-10 transitions, hash \`${report.design.centerline.sha256}\`.\n`
  + `- Vertical schedule: **36** one-block rises in the first 180 steps; both bends and the final 620 steps are level.\n`
  + `- Cross-section: symmetric 5×4 around a walkable floor datum.\n`
  + `- Excavation reservation: **${report.design.excavationReservation.cellCount.toLocaleString('en-US')}** cells, hash \`${report.design.excavationReservation.coordinateSetSha256}\`.\n`
  + `- One-cell face-interaction shell: **${report.design.oneCellFaceInteractionShell.cellCount.toLocaleString('en-US')}** cells.\n\n`
  + `The route runs east, north, then west, so its parallel approach legs are separated by 120 blocks and no direct portal-to-chamber excavation sightline exists. This retains the inherited two-bend baffle character while fitting the normalized anchors inside the current Z09 envelope and approaching the shared portal from the side opposite B08.\n\n`
  + `## Collision and interfaces\n\n`
  + `- Generated structure-start bound intersections: **${report.collisionAndInterfaceAudit.generatedStructureIntersectionCellCount}**.\n`
  + `- Protected relic-core intersections: **${report.collisionAndInterfaceAudit.protectedRelicCoreIntersectionCellCount}**.\n`
  + `- Service-portal candidate interface: **${servicePortalInterface.cellCount}** exact overlap cells.\n`
  + `- Chamber candidate interface: **${chamberInterface.cellCount}** exact overlap cells.\n\n`
  + `These two overlaps are proposed seams, not accepted owner transfers. All other ownership remains unassigned.\n\n`
  + `## Remaining HOLDs\n\n`
  + `P1-B03 remains HOLD pending canonical ownership and directional interface contracts; future-mountain/B10 state; lining/loading; drainage and utilities; accessibility, emergency, and egress design; and independent technical acceptance. Source guards, operations, preflight, execution, rollback, and post-state QA remain deferred to G08-G19.\n\n`
  + `No live system or world was contacted, no material or operation cell was emitted, and no world edit is authorized.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

process.stdout.write(`${JSON.stringify({
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  status: report.status,
  centerlinePoints: report.design.centerline.pointCount,
  horizontalSteps: report.design.centerline.horizontalStepCount,
  excavationCells: report.design.excavationReservation.cellCount,
  generatedStructureIntersectionCells:
    report.collisionAndInterfaceAudit.generatedStructureIntersectionCellCount,
  protectedRelicIntersectionCells:
    report.collisionAndInterfaceAudit.protectedRelicCoreIntersectionCellCount,
  operationCellCount: 0,
}, null, 2)}\n`);
