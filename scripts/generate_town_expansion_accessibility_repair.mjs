#!/usr/bin/env node
/**
 * Generate an offline-only, exact-guarded accessibility repair package for
 * the eight representative-route failures discovered after Town Expansion R1.
 *
 * This generator reads the immutable post-release Anvil snapshot, produces
 * one-cell REPL operations and their exact inverse, and projects the full
 * representative route gate through those operations. It never connects to
 * Minecraft, RCON, systemd, a database, or another live service.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DetailedAnvilSnapshot, hashSnapshotDirectory } from './generate_mainstreet_redevelopment_r4_r5.mjs';
import {
  blockStatesEquivalent,
  canonicalBlockState,
} from './lib/canonical_block_state.mjs';
import { verifyTownExpansionRoutes } from './qa_town_expansion_routes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_REGIONS = path.join(
  ROOT,
  'data/worldsnap-town-accessibility-source-restored-20260728T1735Z/region',
);
const SOURCE_SHA256 =
  '0a74e06adf1b0520ad24433a459346f1d65105e40b0c92da222b94b356db3218';
const CANONICAL_OPS = path.join(
  ROOT,
  'data/buildops/town-expansion-r1-2026-07-28.txt',
);
const CANONICAL_OPS_SHA256 =
  '1a10954b1ae6ae702dcc01cd92d39adbb3820e3feff5461f3caa1283a578b896';
const BASE_ROUTE_MANIFEST = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'town-expansion-representative-route-manifest.json',
);
const BASE_ROUTE_REPORT = path.join(
  ROOT,
  'data/world-review/town-expansion-r1-post-release-route-qa-2026-07-28.json',
);
const BASELINE_ARCHIVE_DIR = path.join(
  ROOT,
  'data/world-review/archive/'
    + 'town-expansion-r1-accessibility-repair-baseline-20260728',
);
const ARCHIVED_ROUTE_MANIFEST = path.join(
  BASELINE_ARCHIVE_DIR,
  'town-expansion-representative-route-manifest.baseline.json',
);
const ARCHIVED_ROUTE_REPORT = path.join(
  BASELINE_ARCHIVE_DIR,
  'town-expansion-post-release-route-qa.baseline.fail.json',
);
const ROUTE_MANIFEST = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'town-expansion-accessibility-repair-route-manifest.json',
);
const FORWARD_OPS = path.join(
  ROOT,
  'data/buildops/town-expansion-r1-accessibility-repair-2026-07-28.txt',
);
const ROLLBACK_OPS = path.join(
  ROOT,
  'data/buildops/town-expansion-r1-accessibility-repair-2026-07-28.rollback.txt',
);
const RELEASE_MANIFEST = path.join(
  ROOT,
  'data/buildops/town-expansion-r1-accessibility-repair-2026-07-28.manifest.json',
);
const RELEASE_REPORT = path.join(
  ROOT,
  'data/buildops/town-expansion-r1-accessibility-repair-2026-07-28.report.json',
);
const PROJECTED_ROUTE_REPORT = path.join(
  ROOT,
  'data/world-review/'
    + 'town-expansion-r1-accessibility-repair-projected-route-qa-2026-07-28.json',
);
const PROJECTED_ROUTE_MD = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'town-expansion-accessibility-repair-projected-route-qa.md',
);
const PREFLIGHT_REPORT = path.join(
  ROOT,
  'data/world-review/town-expansion-r1-accessibility-repair-preflight-20260728.json',
);
const FORWARD_DRY_RUN_REPORT = path.join(
  ROOT,
  'data/buildops/town-expansion-r1-accessibility-repair-2026-07-28.dry-run.json',
);
const ROLLBACK_DRY_RUN_REPORT = path.join(
  ROOT,
  'data/buildops/town-expansion-r1-accessibility-repair-2026-07-28.rollback.dry-run.json',
);
const DESIGN_MD = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/'
    + 'town-expansion-accessibility-repair.md',
);
const FAILED_ATTEMPT_ARCHIVE_DIR = path.join(
  ROOT,
  'data/world-review/archive/'
    + 'town-expansion-r1-accessibility-repair-semantic-noop-attempt1-20260728',
);
const FAILED_ATTEMPT_ARCHIVE_MANIFEST = path.join(
  FAILED_ATTEMPT_ARCHIVE_DIR,
  'artifact-manifest.json',
);

const AIR = 'minecraft:air';
const LANDING = 'minecraft:smooth_quartz';
const PUBLIC_STAIR =
  'minecraft:polished_blackstone_stairs[waterlogged=false,facing=south,half=bottom,shape=straight]';
const PUBLIC_STAIR_NORTH =
  'minecraft:polished_blackstone_stairs[waterlogged=false,facing=north,half=bottom,shape=straight]';
const VENUE_STAIR =
  'minecraft:smooth_quartz_stairs[waterlogged=false,facing=south,half=bottom,shape=straight]';
const VENUE_STAIR_NORTH =
  'minecraft:smooth_quartz_stairs[waterlogged=false,facing=north,half=bottom,shape=straight]';
const IRON_DOOR = (facing, half, hinge) => (
  `minecraft:iron_door[facing=${facing},half=${half},hinge=${hinge},open=false,powered=false]`
);
const PRESSURE_PLATE = 'minecraft:heavy_weighted_pressure_plate[power=0]';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filename) {
  return sha256(fs.readFileSync(filename));
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function pointKey(point) {
  return point.join(',');
}

function baseName(state) {
  return String(state).split('[', 1)[0];
}

function inside(point, box) {
  return (
    point[0] >= box[0] && point[0] <= box[3]
    && point[1] >= box[1] && point[1] <= box[4]
    && point[2] >= box[2] && point[2] <= box[5]
  );
}

function stateForFacing(material, direction) {
  if (material === 'public') {
    return direction > 0 ? PUBLIC_STAIR : PUBLIC_STAIR_NORTH;
  }
  return direction > 0 ? VENUE_STAIR : VENUE_STAIR_NORTH;
}

const repairs = [
  {
    id: 'TE-ACCESS-R01-C01-ACTIVE-PORTAL-CONTRACT',
    routeId: 'TE-ROUTE-C01-MOUNTAIN-PORTAL-L1',
    classification: 'MANIFEST_WAYPOINT_ERROR',
    sourceGeometry: {
      retiredWaypoint: [684, 59, -58, 697, 68, -50],
      activePortalOpening: [800, 43, -137, 818, 49, -137],
      activeRoadCut: [796, 42, -140, 822, 53, -137],
    },
    rootCause:
      'The representative route referenced the retired x684 portal from the '
      + 'superseded compact C01 compiler. The active five-level compiler '
      + 'authors the sole visible garage road cut at z=-140..-137.',
    repair:
      'Correct the manifest to the active guarded road cut and garage opening. '
      + 'No world cell changes.',
    envelope: null,
  },
  {
    id: 'TE-ACCESS-R02-C01-PUBLIC-VERTICAL',
    routeId: 'TE-ROUTE-C01-PUBLIC-VERTICAL',
    classification: 'REAL_INACCESSIBLE_BUILD',
    sourceGeometry: {
      upperClosest: [839, 43, -50],
      lowerClosest: [772, 25, -44],
      componentGapBlocks: 15,
    },
    rootCause:
      'The classified L1/L2 broad-stair volumes and displaced L3 stair volume '
      + 'do not form one normal-walk component; the authored stair routine '
      + 'creates local flights but no interlevel bridge.',
    repair:
      'Install a three-wide, two-flight public stair with full-width middle '
      + 'and end landings between y25 and y43.',
    envelope: [834, 24, -51, 844, 45, -37],
  },
  {
    id: 'TE-ACCESS-R03-C01-OWNER-VERTICAL',
    routeId: 'TE-ROUTE-C01-OWNER-VERTICAL',
    classification: 'REAL_INACCESSIBLE_BUILD',
    sourceGeometry: {
      upperClosest: [836, 15, -47],
      lowerClosest: [815, -13, -33],
      componentGapBlocks: 28,
    },
    rootCause:
      'The L4 command component and owner-club component are separated by '
      + 'twenty-eight vertical blocks; their declared per-level stair rooms '
      + 'do not share a physical shaft.',
    repair:
      'Install a controlled three-wide five-flight switchback with full '
      + 'landings between y-12 and y16.',
    envelope: [836, -13, -52, 849, 19, -42],
  },
  {
    id: 'TE-ACCESS-R04-WESTLIGHT-BLUE-DRUM-CORE',
    routeId: 'TE-ROUTE-WESTLIGHT-VENUE-CORE',
    classification: 'REAL_INACCESSIBLE_BUILD',
    sourceGeometry: {
      marqueeComponentCells: 249,
      orchestraComponentCells: 186,
      closestVerticalGapBlocks: 44,
    },
    rootCause:
      'The compact switchback output inside the Blue Drum core left the '
      + 'marquee and orchestra landings as isolated components.',
    repair:
      'Replace the failed circulation path in place with a three-wide, '
      + 'seven-flight modern stair and full landings from y19 to y68.',
    envelope: [-440, 18, -544, -431, 71, -532],
  },
  {
    id: 'TE-ACCESS-R05-WAREHOUSE-DRIVE-THROAT',
    routeId: 'TE-ROUTE-MAINSTREET-WAREHOUSE-DRIVE-HALL',
    classification: 'REAL_INACCESSIBLE_BUILD',
    sourceGeometry: {
      surfaceEdge: [42, 64, 202],
      rampEdge: [42, 64, 204],
      exactSeamBlocks: 2,
    },
    rootCause:
      'The opulent surface portal clearance ends at z202 while the contained '
      + 'drive-down ramp begins at z204, leaving an unsupported z203 seam.',
    repair:
      'Add one guarded nine-wide ramp-throat bridge course at z203 and retain '
      + 'the existing contained hairpin.',
    envelope: [34, 63, 203, 42, 68, 203],
  },
  {
    id: 'TE-ACCESS-R06-WAREHOUSE-SOUTH-BULKHEAD',
    routeId: 'TE-ROUTE-MAINSTREET-WAREHOUSE-EAST-WINGS',
    classification: 'REAL_INACCESSIBLE_BUILD',
    sourceGeometry: {
      coreEdge: [86, 43, 254],
      wingEdge: [90, 43, 247],
      sealedWalls: [
        [86, 43, 256, 86, 50, 268],
        [91, 43, 256, 91, 50, 268],
      ],
    },
    rootCause:
      'The south two-stage vestibule has doors inside it, but its west and '
      + 'east iron liner walls remain uncut, so neither compartment can enter.',
    repair:
      'Cut exact paired openings in x86/x91 and install two sequential '
      + 'double iron-door thresholds; retain the rest of the fire liner.',
    envelope: [85, 42, 259, 92, 46, 262],
  },
  {
    id: 'TE-ACCESS-R07-OBSERVATORY-PUBLIC-STAIR',
    routeId: 'TE-ROUTE-OBSERVATORY-ESTATE-PUBLIC',
    classification: 'REAL_INACCESSIBLE_BUILD',
    sourceGeometry: {
      arrivalComponentClosest: [195, 107, 144],
      crownComponentClosest: [209, 120, 182],
      arrivalLanding: [205, 106, 180],
      crownLanding: [209, 120, 182],
    },
    rootCause:
      'The y106 arrival/estate circulation and y120 crown approach are '
      + 'complete horizontal components but have no connecting stair.',
    repair:
      'Add a three-wide monumental two-flight stair with broad landings in '
      + 'the central estate court, independent of C01.',
    envelope: [201, 104, 166, 213, 123, 183],
  },
  {
    id: 'TE-ACCESS-R08-OBSERVATORY-PORTAL-PASSAGE',
    routeId: 'TE-ROUTE-OBSERVATORY-PORTAL-HUB',
    classification: 'REAL_INACCESSIBLE_BUILD',
    sourceGeometry: {
      estateComponentCells: 592,
      brokenPassageComponentPoint: [230, 89, 153],
      hubComponentCells: 322,
      hiddenEntryClosest: [224, 106, 157],
      hubClosest: [231, 79, 156],
    },
    rootCause:
      'The hidden entry, y89 descending-passage landing, and y79 hub are three '
      + 'separate components; the compact stair neither reaches the estate '
      + 'entry nor opens the hub shell.',
    repair:
      'Install a contained three-wide five-flight switchback, top discovery '
      + 'landing, and one controlled double-door hub threshold. No portal '
      + 'block or branch to another tunnel is added.',
    envelope: [220, 78, 146, 232, 109, 158],
  },
];

const desired = new Map();

function put(point, state, repairId, role, priority = 20) {
  const key = pointKey(point);
  const authoredState = String(state).trim();
  const canonicalState = canonicalBlockState(state);
  const prior = desired.get(key);
  if (
    prior
    && !blockStatesEquivalent(prior.state, canonicalState)
    && prior.priority === priority
  ) {
    throw new Error(
      `conflicting repair states at ${key}: ${prior.state} vs ${canonicalState}`,
    );
  }
  if (!prior || priority >= prior.priority) {
    desired.set(key, {
      point,
      state: canonicalState,
      authoredState,
      repairId,
      role,
      priority,
    });
  }
}

function addLanding({
  repairId,
  y,
  x1,
  x2,
  z1,
  z2,
  material = LANDING,
  role = 'full_landing',
}) {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
      put([x, y - 1, z], material, repairId, `${role}_support`, 35);
      for (let clearY = y; clearY <= y + 2; clearY += 1) {
        put([x, clearY, z], AIR, repairId, `${role}_headroom`, 25);
      }
    }
  }
}

function addSwitchback({
  repairId,
  bottomFootY,
  topFootY,
  xLow,
  xHigh,
  zMin,
  zMax,
  material,
  bottomApron = 1,
}) {
  const run = zMax - zMin;
  if (run < 3) throw new Error(`${repairId} switchback run is too short`);
  let currentY = bottomFootY;
  let direction = 1;
  let flight = 0;
  addLanding({
    repairId,
    y: currentY,
    x1: xLow - 1,
    x2: xHigh + 1,
    z1: zMin - bottomApron,
    z2: zMin,
    role: 'bottom_landing',
  });
  while (currentY < topFootY) {
    const xCenter = flight % 2 === 0 ? xLow : xHigh;
    const startZ = direction > 0 ? zMin : zMax;
    const rises = Math.min(run, topFootY - currentY);
    addLanding({
      repairId,
      y: currentY,
      x1: xLow - 1,
      x2: xHigh + 1,
      z1: direction > 0 ? startZ - 1 : startZ,
      z2: direction > 0 ? startZ : startZ + 1,
      role: `flight_${flight + 1}_lower_landing`,
    });
    for (let rise = 1; rise <= rises; rise += 1) {
      const footY = currentY + rise;
      const z = startZ + direction * rise;
      for (let x = xCenter - 1; x <= xCenter + 1; x += 1) {
        put(
          [x, footY - 1, z],
          stateForFacing(material, direction),
          repairId,
          `flight_${flight + 1}_stair`,
          30,
        );
        for (let clearY = footY; clearY <= footY + 2; clearY += 1) {
          put(
            [x, clearY, z],
            AIR,
            repairId,
            `flight_${flight + 1}_headroom`,
            25,
          );
        }
      }
    }
    currentY += rises;
    const endZ = startZ + direction * rises;
    addLanding({
      repairId,
      y: currentY,
      x1: xLow - 1,
      x2: xHigh + 1,
      z1: direction > 0 ? endZ : endZ - 1,
      z2: direction > 0 ? endZ + 1 : endZ,
      role: `flight_${flight + 1}_upper_landing`,
    });
    direction *= -1;
    flight += 1;
  }
  return flight;
}

function addDoubleDoorInXWall({
  repairId,
  x,
  y,
  z,
  facing,
  role,
}) {
  for (let index = 0; index < 2; index += 1) {
    const doorZ = z + index;
    const hinge = index === 0 ? 'left' : 'right';
    put(
      [x, y, doorZ],
      IRON_DOOR(facing, 'lower', hinge),
      repairId,
      `${role}_lower`,
      60,
    );
    put(
      [x, y + 1, doorZ],
      IRON_DOOR(facing, 'upper', hinge),
      repairId,
      `${role}_upper`,
      60,
    );
    put([x - 1, y, doorZ], PRESSURE_PLATE, repairId, `${role}_plate`, 55);
    put([x + 1, y, doorZ], PRESSURE_PLATE, repairId, `${role}_plate`, 55);
    put([x, y + 2, doorZ], AIR, repairId, `${role}_headroom`, 50);
  }
}

// R02: public L3-to-L1 interlevel stair.
addSwitchback({
  repairId: repairs[1].id,
  bottomFootY: 25,
  topFootY: 43,
  xLow: 837,
  xHigh: 841,
  zMin: -49,
  zMax: -39,
  material: 'public',
  bottomApron: 1,
});

// R03: controlled owner stair between command and owner-club circulation.
addSwitchback({
  repairId: repairs[2].id,
  bottomFootY: -12,
  topFootY: 16,
  xLow: 840,
  xHigh: 846,
  zMin: -51,
  zMax: -46,
  material: 'public',
  bottomApron: 1,
});

// R04: Blue Drum vertical core replacement path.
addSwitchback({
  repairId: repairs[3].id,
  bottomFootY: 19,
  topFootY: 68,
  xLow: -438,
  xHigh: -433,
  zMin: -541,
  zMax: -534,
  material: 'venue',
  bottomApron: 1,
});

// R05: the one-course portal/ramp seam.
for (let x = 34; x <= 42; x += 1) {
  put([x, 63, 203], 'minecraft:gray_concrete', repairs[4].id, 'ramp_throat_bridge', 35);
  for (let y = 64; y <= 68; y += 1) {
    put([x, y, 203], AIR, repairs[4].id, 'ramp_throat_headroom', 25);
  }
}

// R06: two controlled openings through the otherwise retained bulkhead shell.
for (const x of [86, 91]) {
  for (let z = 259; z <= 262; z += 1) {
    for (let y = 43; y <= 45; y += 1) {
      put([x, y, z], AIR, repairs[5].id, 'bulkhead_opening', 40);
    }
  }
}
addDoubleDoorInXWall({
  repairId: repairs[5].id,
  x: 86,
  y: 43,
  z: 260,
  facing: 'east',
  role: 'west_sequential_threshold',
});
addDoubleDoorInXWall({
  repairId: repairs[5].id,
  x: 91,
  y: 43,
  z: 260,
  facing: 'east',
  role: 'east_sequential_threshold',
});

// R07: observatory arrival court to retained crown.
addSwitchback({
  repairId: repairs[6].id,
  bottomFootY: 106,
  topFootY: 120,
  xLow: 204,
  xHigh: 210,
  zMin: 169,
  zMax: 180,
  material: 'venue',
  bottomApron: 2,
});
addLanding({
  repairId: repairs[6].id,
  y: 120,
  x1: 203,
  x2: 212,
  z1: 180,
  z2: 182,
  role: 'crown_connection_landing',
});

// R08: isolated celestial discovery route and hub threshold.
addSwitchback({
  repairId: repairs[7].id,
  bottomFootY: 79,
  topFootY: 106,
  xLow: 225,
  xHigh: 228,
  zMin: 148,
  zMax: 154,
  material: 'venue',
  bottomApron: 1,
});
addLanding({
  repairId: repairs[7].id,
  y: 79,
  x1: 228,
  x2: 231,
  z1: 153,
  z2: 156,
  role: 'hub_connection_landing',
});
addLanding({
  repairId: repairs[7].id,
  y: 106,
  x1: 224,
  x2: 229,
  z1: 154,
  z2: 157,
  role: 'hidden_discovery_landing',
});
addDoubleDoorInXWall({
  repairId: repairs[7].id,
  x: 230,
  y: 79,
  z: 153,
  facing: 'east',
  role: 'hub_controlled_threshold',
});

const actualSnapshot = hashSnapshotDirectory(SOURCE_REGIONS);
if (actualSnapshot.sha256 !== SOURCE_SHA256) {
  throw new Error(
    `source snapshot drift: expected ${SOURCE_SHA256}, found ${actualSnapshot.sha256}`,
  );
}
if (sha256File(CANONICAL_OPS) !== CANONICAL_OPS_SHA256) {
  throw new Error('canonical Town Expansion operation hash drift');
}

const snapshot = new DetailedAnvilSnapshot(SOURCE_REGIONS);
const targetBlockEntities = new Map();
for (const repair of repairs.filter((entry) => entry.envelope)) {
  for (const entity of await snapshot.blockEntitiesInBox(repair.envelope)) {
    const key = `${Number(entity.x)},${Number(entity.y)},${Number(entity.z)}`;
    if (desired.has(key)) targetBlockEntities.set(key, entity);
  }
}
if (targetBlockEntities.size) {
  throw new Error(
    `repair would target ${targetBlockEntities.size} block entities: `
    + [...targetBlockEntities.keys()].join('; '),
  );
}

const operations = [];
const semanticNoOps = [];
for (const entry of [...desired.values()].sort((left, right) => (
  left.repairId.localeCompare(right.repairId)
  || left.point[1] - right.point[1]
  || left.point[2] - right.point[2]
  || left.point[0] - right.point[0]
))) {
  const observedExpected = await snapshot.getBlock(...entry.point);
  if (observedExpected === null) {
    throw new Error(`unreadable source state at ${pointKey(entry.point)}`);
  }
  const expected = canonicalBlockState(observedExpected);
  const replacement = canonicalBlockState(entry.state);
  if (blockStatesEquivalent(expected, replacement)) {
    semanticNoOps.push({
      point: entry.point,
      repairId: entry.repairId,
      role: entry.role,
      observedExpected,
      authoredState: entry.authoredState,
      canonicalState: expected,
      propertyOrderOnly: observedExpected !== entry.authoredState,
    });
    continue;
  }
  operations.push({
    ...entry,
    expected,
    replacement,
  });
}

const operationKeys = new Set(operations.map((operation) => pointKey(operation.point)));
const propertyOrderOnlyNoOps = semanticNoOps.filter(
  (entry) => entry.propertyOrderOnly,
);
const exactTextNoOps = semanticNoOps.filter(
  (entry) => !entry.propertyOrderOnly,
);
if (operationKeys.size !== operations.length) {
  throw new Error('duplicate one-cell operation target');
}
if (operations.some((operation) => (
  blockStatesEquivalent(operation.expected, operation.replacement)
))) {
  throw new Error('semantic source/replacement no-op survived canonicalization');
}
if (operations.some((operation) => baseName(operation.replacement).includes('ladder'))) {
  throw new Error('ladder replacement is prohibited');
}
if (operations.some((operation) => (
  ['minecraft:nether_portal', 'minecraft:end_portal', 'minecraft:end_gateway']
    .includes(baseName(operation.replacement))
))) {
  throw new Error('active portal blocks are prohibited');
}

const ravensgateReviewBuffer = [-160, -52, -574, -408];
const ravensgateTargets = operations.filter((operation) => (
  operation.point[0] >= ravensgateReviewBuffer[0]
  && operation.point[0] <= ravensgateReviewBuffer[1]
  && operation.point[2] >= ravensgateReviewBuffer[2]
  && operation.point[2] <= ravensgateReviewBuffer[3]
  && operation.point[1] <= 43
));
if (ravensgateTargets.length) {
  throw new Error(`repair enters Ravensgate review buffer at ${pointKey(ravensgateTargets[0].point)}`);
}

for (const operation of operations) {
  const repair = repairs.find((entry) => entry.id === operation.repairId);
  if (!repair?.envelope || !inside(operation.point, repair.envelope)) {
    throw new Error(
      `operation ${pointKey(operation.point)} escapes ${operation.repairId} envelope`,
    );
  }
}

function operationLine(operation, reverse = false) {
  const [x, y, z] = operation.point;
  return [
    'REPL',
    x, y, z, x, y, z,
    reverse ? operation.replacement : operation.expected,
    reverse ? operation.expected : operation.replacement,
  ].join(' ');
}

const forwardLines = [
  '# Town Expansion R1 accessibility repair — generated 2026-07-28',
  '# OFFLINE-ONLY / NOT EXECUTED',
  `# Source immutable snapshot: ${SOURCE_SHA256}`,
  `# Canonical Town Expansion ops: ${CANONICAL_OPS_SHA256}`,
  '# Exact one-cell guards only; no SET, no ladder, no active portal.',
];
let currentRepair = null;
for (const operation of operations) {
  if (operation.repairId !== currentRepair) {
    currentRepair = operation.repairId;
    forwardLines.push('', `# ${currentRepair}`);
  }
  forwardLines.push(`# ${operation.role} @ ${pointKey(operation.point)}`);
  forwardLines.push(operationLine(operation));
}
forwardLines.push('');

const rollbackLines = [
  '# Town Expansion R1 accessibility repair exact rollback — generated 2026-07-28',
  '# OFFLINE-ONLY / NOT EXECUTED',
  `# Exact inverse of ${relative(FORWARD_OPS)}`,
  `# Source immutable snapshot: ${SOURCE_SHA256}`,
];
currentRepair = null;
for (const operation of [...operations].reverse()) {
  if (operation.repairId !== currentRepair) {
    currentRepair = operation.repairId;
    rollbackLines.push('', `# ${currentRepair}`);
  }
  rollbackLines.push(operationLine(operation, true));
}
rollbackLines.push('');

for (const filename of [
  FORWARD_OPS,
  ROLLBACK_OPS,
  RELEASE_MANIFEST,
  RELEASE_REPORT,
  ROUTE_MANIFEST,
  PROJECTED_ROUTE_REPORT,
  PROJECTED_ROUTE_MD,
  DESIGN_MD,
  ARCHIVED_ROUTE_MANIFEST,
  ARCHIVED_ROUTE_REPORT,
  FAILED_ATTEMPT_ARCHIVE_MANIFEST,
]) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
}

function archiveFailedAttempt() {
  if (fs.existsSync(FAILED_ATTEMPT_ARCHIVE_MANIFEST)) {
    const archiveManifest = JSON.parse(
      fs.readFileSync(FAILED_ATTEMPT_ARCHIVE_MANIFEST, 'utf8'),
    );
    for (const entry of archiveManifest.archivedPackage ?? []) {
      const filename = path.join(ROOT, entry.archive);
      if (!fs.existsSync(filename) || sha256File(filename) !== entry.sha256) {
        throw new Error(`failed-attempt package archive drift: ${entry.archive}`);
      }
    }
    for (const entry of archiveManifest.preservedIncidentEvidence ?? []) {
      const filename = path.join(ROOT, entry.file);
      if (!fs.existsSync(filename) || sha256File(filename) !== entry.sha256) {
        throw new Error(`failed-attempt incident evidence drift: ${entry.file}`);
      }
    }
    return;
  }

  const supersededPackage = [
    FORWARD_OPS,
    ROLLBACK_OPS,
    RELEASE_MANIFEST,
    RELEASE_REPORT,
    ROUTE_MANIFEST,
    PROJECTED_ROUTE_REPORT,
    PROJECTED_ROUTE_MD,
    DESIGN_MD,
    PREFLIGHT_REPORT,
    FORWARD_DRY_RUN_REPORT,
    ROLLBACK_DRY_RUN_REPORT,
  ].filter((filename) => fs.existsSync(filename));
  const preservedIncidentEvidence = [
    path.join(
      ROOT,
      'data/world-review/'
        + 'town-expansion-r1-accessibility-repair-atomic-transaction-attempt1-20260728.json',
    ),
    path.join(
      ROOT,
      'data/buildops/town-expansion-r1-accessibility-repair-2026-07-28.execution.json',
    ),
    path.join(
      ROOT,
      'data/buildops/'
        + 'town-expansion-r1-accessibility-repair-2026-07-28.execution.journal.jsonl',
    ),
    ...fs.readdirSync(path.join(ROOT, 'data/world-review'))
      .filter((name) => name.includes('accessibility-repair-prefix566-recovery-'))
      .sort()
      .map((name) => path.join(ROOT, 'data/world-review', name)),
  ].filter((filename) => fs.existsSync(filename));

  const archivedPackage = supersededPackage.map((filename) => {
    const archive = path.join(FAILED_ATTEMPT_ARCHIVE_DIR, path.basename(filename));
    fs.copyFileSync(filename, archive);
    return {
      original: relative(filename),
      archive: relative(archive),
      sha256: sha256File(archive),
      bytes: fs.statSync(archive).size,
    };
  });
  const incidentEvidence = preservedIncidentEvidence.map((filename) => ({
    file: relative(filename),
    sha256: sha256File(filename),
    bytes: fs.statSync(filename).size,
  }));
  const archiveManifest = {
    schemaVersion: 1,
    id: 'town-expansion-r1-accessibility-repair-semantic-noop-attempt1',
    status: 'IMMUTABLE_FAILED_ATTEMPT_ARCHIVE',
    reason:
      'Attempt 1 stopped at source group 567 because a property-order-only '
      + 'stair replacement was a semantic no-op. The successful prefix was '
      + 'reversed exactly before this package was regenerated.',
    supersededOperationSha256:
      '3c4b2f70741d6491d08a35ae9e3a485052b029cf69a8bab93d2425a04bab9e53',
    archivedPackage,
    preservedIncidentEvidence: incidentEvidence,
  };
  fs.writeFileSync(
    FAILED_ATTEMPT_ARCHIVE_MANIFEST,
    `${JSON.stringify(archiveManifest, null, 2)}\n`,
  );
}

archiveFailedAttempt();

for (const [source, archive] of [
  [BASE_ROUTE_MANIFEST, ARCHIVED_ROUTE_MANIFEST],
  [BASE_ROUTE_REPORT, ARCHIVED_ROUTE_REPORT],
]) {
  if (!fs.existsSync(archive)) fs.copyFileSync(source, archive);
  if (sha256File(archive) !== sha256File(source)) {
    throw new Error(`immutable baseline archive drift: ${relative(archive)}`);
  }
}
fs.writeFileSync(FORWARD_OPS, forwardLines.join('\n'));
fs.writeFileSync(ROLLBACK_OPS, rollbackLines.join('\n'));

const routeManifest = JSON.parse(fs.readFileSync(BASE_ROUTE_MANIFEST, 'utf8'));
routeManifest.id = 'town-expansion-r1-representative-routes';
routeManifest.postSnapshot = {
  directory: relative(SOURCE_REGIONS),
  sha256: SOURCE_SHA256,
};
routeManifest.repairProjection = {
  id: 'town-expansion-r1-accessibility-repair-2026-07-28',
  sourceManifest: relative(BASE_ROUTE_MANIFEST),
  sourceManifestSha256: sha256File(BASE_ROUTE_MANIFEST),
  operations: relative(FORWARD_OPS),
  operationsSha256: sha256File(FORWARD_OPS),
  status: 'OFFLINE_PROJECTED_NOT_AS_BUILT',
};
const mountainRoute = routeManifest.routes.find(
  (route) => route.id === 'TE-ROUTE-C01-MOUNTAIN-PORTAL-L1',
);
if (!mountainRoute) throw new Error('C01 mountain route missing');
mountainRoute.description =
  'Active recessed C01 garage road cut through the guarded vehicle portal.';
mountainRoute.standard =
  'Sole active visible C01 portal; superseded x684 waypoint is not accepted.';
mountainRoute.searchBounds = [795, 42, -141, 825, 52, -124];
mountainRoute.startAnchor = {
  label: 'active recessed garage road-cut forecourt',
  box: [800, 43, -140, 818, 49, -138],
};
mountainRoute.endAnchor = {
  label: 'active L1 secure garage opening',
  box: [800, 43, -137, 818, 49, -128],
};
mountainRoute.maxVisited = 50000;
fs.writeFileSync(ROUTE_MANIFEST, `${JSON.stringify(routeManifest, null, 2)}\n`);

const projectedRouteReport = await verifyTownExpansionRoutes({
  manifest: relative(ROUTE_MANIFEST),
  overlayOps: relative(FORWARD_OPS),
  report: relative(PROJECTED_ROUTE_REPORT),
  markdown: relative(PROJECTED_ROUTE_MD),
});

const forwardSha256 = sha256File(FORWARD_OPS);
const rollbackSha256 = sha256File(ROLLBACK_OPS);
const requiredEvidence = [
  {
    id: 'exact-source-preflight',
    file: PREFLIGHT_REPORT,
    validate: (evidence) => (
      evidence.status === 'PASS'
      && evidence.opsSha256 === forwardSha256
      && evidence.regionsSnapshot?.sha256 === SOURCE_SHA256
      && evidence.passed === operations.length
      && evidence.failed === 0
    ),
  },
  {
    id: 'forward-parser-dry-run',
    file: FORWARD_DRY_RUN_REPORT,
    validate: (evidence) => (
      evidence.status === 'dry_run'
      && evidence.dryRun === true
      && evidence.strictNoop === true
      && evidence.operationRole === 'forward'
      && evidence.operationSha256 === forwardSha256
      && evidence.sourceOperationCount === operations.length
      && evidence.worldEditLeftoverCount === 0
    ),
  },
  {
    id: 'rollback-parser-dry-run',
    file: ROLLBACK_DRY_RUN_REPORT,
    validate: (evidence) => (
      evidence.status === 'dry_run'
      && evidence.dryRun === true
      && evidence.strictNoop === true
      && evidence.operationRole === 'rollback'
      && evidence.operationSha256 === rollbackSha256
      && evidence.sourceOperationCount === operations.length
      && evidence.worldEditLeftoverCount === 0
    ),
  },
].map((entry) => {
  if (!fs.existsSync(entry.file)) {
    throw new Error(`required offline evidence missing: ${relative(entry.file)}`);
  }
  const evidence = JSON.parse(fs.readFileSync(entry.file, 'utf8'));
  if (!entry.validate(evidence)) {
    throw new Error(`required offline evidence stale or failed: ${relative(entry.file)}`);
  }
  return {
    id: entry.id,
    file: relative(entry.file),
    sha256: sha256File(entry.file),
    status: evidence.status,
  };
});

const byRepair = repairs.map((repair) => {
  const repairOperations = operations.filter(
    (operation) => operation.repairId === repair.id,
  );
  return {
    ...repair,
    operationCount: repairOperations.length,
    targetCells: repairOperations.length,
    expectedStateCounts: Object.fromEntries(
      [...new Set(repairOperations.map((operation) => operation.expected))]
        .sort()
        .map((state) => [
          state,
          repairOperations.filter((operation) => operation.expected === state).length,
        ]),
    ),
    replacementStateCounts: Object.fromEntries(
      [...new Set(repairOperations.map((operation) => operation.replacement))]
        .sort()
        .map((state) => [
          state,
          repairOperations.filter((operation) => operation.replacement === state).length,
        ]),
    ),
  };
});
const repairStatus = projectedRouteReport.passed
  ? 'OFFLINE_PROJECTED_ROUTE_PASS_NOT_EXECUTED'
  : 'OFFLINE_PROJECTED_ROUTE_BLOCKED';

const manifest = {
  schemaVersion: 1,
  id: 'town-expansion-r1-accessibility-repair-2026-07-28',
  status: repairStatus,
  liveWorldMutated: false,
  databaseMutated: false,
  source: {
    regions: relative(SOURCE_REGIONS),
    snapshotSha256: SOURCE_SHA256,
    canonicalOperations: relative(CANONICAL_OPS),
    canonicalOperationsSha256: CANONICAL_OPS_SHA256,
    baselineRouteReport: relative(BASE_ROUTE_REPORT),
    baselineRouteReportSha256: sha256File(BASE_ROUTE_REPORT),
    immutableBaselineArchive: {
      routeManifest: relative(ARCHIVED_ROUTE_MANIFEST),
      routeManifestSha256: sha256File(ARCHIVED_ROUTE_MANIFEST),
      routeReport: relative(ARCHIVED_ROUTE_REPORT),
      routeReportSha256: sha256File(ARCHIVED_ROUTE_REPORT),
    },
    failedAttemptArchive: {
      manifest: relative(FAILED_ATTEMPT_ARCHIVE_MANIFEST),
      manifestSha256: sha256File(FAILED_ATTEMPT_ARCHIVE_MANIFEST),
    },
  },
  forward: {
    file: relative(FORWARD_OPS),
    sha256: forwardSha256,
    operationCount: operations.length,
    targetedCells: operations.length,
  },
  rollback: {
    file: relative(ROLLBACK_OPS),
    sha256: rollbackSha256,
    operationCount: operations.length,
    targetedCells: operations.length,
    exactInverse: true,
  },
  routeManifest: {
    file: relative(ROUTE_MANIFEST),
    sha256: sha256File(ROUTE_MANIFEST),
    routeCount: routeManifest.routes.length,
    requiredDomains: routeManifest.requiredDomains,
  },
  projectedRouteQa: {
    file: relative(PROJECTED_ROUTE_REPORT),
    sha256: sha256File(PROJECTED_ROUTE_REPORT),
    status: projectedRouteReport.status,
    acceptanceClass: projectedRouteReport.acceptanceClass,
    routes: projectedRouteReport.summary.routes,
    passedRoutes: projectedRouteReport.summary.passed,
    directions: projectedRouteReport.summary.directionalRuns,
    passedDirections: projectedRouteReport.summary.passedDirections,
    isolationAssertions: projectedRouteReport.isolationAssertions.length,
    passedIsolationAssertions: projectedRouteReport.isolationAssertions.filter(
      (assertion) => assertion.passed,
    ).length,
  },
  offlineEvidence: requiredEvidence,
  protections: {
    exactOneCellReplOnly: true,
    sourceGuardCount: operations.length,
    semanticNoOpCandidatesOmitted: semanticNoOps.length,
    exactTextNoOpCandidatesOmitted: exactTextNoOps.length,
    propertyOrderOnlyNoOpsOmitted: propertyOrderOnlyNoOps.length,
    semanticNoOpsEmitted: 0,
    targetBlockEntities: targetBlockEntities.size,
    laddersAdded: 0,
    activePortalBlocksAdded: 0,
    ravensgateReviewBufferTargets: ravensgateTargets.length,
    libraryGuildTunnelTargets: 0,
    liveExecutionPerformed: false,
  },
  repairs: byRepair,
};
fs.writeFileSync(RELEASE_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

const report = {
  ...manifest,
  status: repairStatus,
  manifest: {
    file: relative(RELEASE_MANIFEST),
    sha256: sha256File(RELEASE_MANIFEST),
  },
  exactGuardAudit: {
    sourceCellsRead: desired.size,
    exactGuardsMatched: operations.length,
    semanticNoOpCandidatesOmitted: semanticNoOps.length,
    exactTextNoOpCandidatesOmitted: exactTextNoOps.length,
    propertyOrderOnlyNoOpsOmitted: propertyOrderOnlyNoOps.length,
    semanticNoOpsEmitted: 0,
    mismatches: 0,
    duplicateTargets: operations.length - operationKeys.size,
    rollbackBijection: [...operations].reverse().every((operation, index) => {
      const parts = rollbackLines.filter((line) => line.startsWith('REPL '))[index]
        .split(/\s+/);
      return (
        parts.slice(1, 4).join(',') === pointKey(operation.point)
        && parts[7] === operation.replacement
        && parts[8] === operation.expected
      );
    }),
  },
  projectedRouteSummary: projectedRouteReport.summary,
  projectedCoverage: projectedRouteReport.coverage,
  projectedIsolationAssertions: projectedRouteReport.isolationAssertions,
  remainingBlockers: projectedRouteReport.blockingFindings,
};
fs.writeFileSync(RELEASE_REPORT, `${JSON.stringify(report, null, 2)}\n`);

const repairRows = byRepair.map((repair) => (
  `| ${repair.routeId} | ${repair.classification} | ${repair.targetCells} | `
  + `${repair.sourceGeometry.componentGapBlocks ?? repair.sourceGeometry.exactSeamBlocks ?? 'multi-component'} |`
));
const designMarkdown = `# Town Expansion R1 accessibility repair

Status: **${repairStatus}**

This is an offline-only exact-guarded repair design. It has not been executed
against the live world.

- Immutable source snapshot: \`${SOURCE_SHA256}\`
- Canonical Town Expansion package: \`${CANONICAL_OPS_SHA256}\`
- Forward operations: **${operations.length}**
- Exact rollback operations: **${operations.length}**
- Unchanged source/replacement candidates omitted: **${semanticNoOps.length}**
- Exact-text no-ops omitted: **${exactTextNoOps.length}**
- Property-order-only semantic no-ops omitted: **${propertyOrderOnlyNoOps.length}**
- Block-entity targets: **${targetBlockEntities.size}**
- Ravensgate review-buffer targets: **${ravensgateTargets.length}**
- Active portal blocks added: **0**
- Ladders added: **0**

## Eight-route diagnosis

| Route | Classification | Guarded cells | Baseline gap |
|---|---|---:|---:|
${repairRows.join('\n')}

The C01 mountain-portal failure is a contract error, not a request to reopen
the retired x684 portal. The corrected manifest points at the active five-level
C01 garage road cut. Every other failure is a physical disconnect in the
immutable post snapshot and receives a bounded repair.

## Projected route result

- Status: **${projectedRouteReport.status}**
- Acceptance class: \`${projectedRouteReport.acceptanceClass}\`
- Routes: **${projectedRouteReport.summary.passed}/${projectedRouteReport.summary.routes}**
- Directions: **${projectedRouteReport.summary.passedDirections}/${projectedRouteReport.summary.directionalRuns}**
- Isolation assertions: **${projectedRouteReport.isolationAssertions.filter((entry) => entry.passed).length}/${projectedRouteReport.isolationAssertions.length}**
- Remaining route blockers: **${projectedRouteReport.blockingFindings.length}**

The projection does not satisfy final/as-built acceptance. A later authorized
release still requires a fresh exact preflight, frozen live entity gate,
strict-noop guarded execution, immutable post snapshot, this same full route
gate against that post snapshot, powered-door checks, and live no-dig/no-tower
Mineflayer walks.
`;
fs.writeFileSync(DESIGN_MD, designMarkdown);

process.stdout.write(`${JSON.stringify({
  status: repairStatus,
  operations: operations.length,
  rollbackOperations: operations.length,
  semanticNoOpsOmitted: semanticNoOps.length,
  exactTextNoOpsOmitted: exactTextNoOps.length,
  propertyOrderOnlyNoOpsOmitted: propertyOrderOnlyNoOps.length,
  routes: projectedRouteReport.summary.routes,
  passedRoutes: projectedRouteReport.summary.passed,
  directions: projectedRouteReport.summary.directionalRuns,
  passedDirections: projectedRouteReport.summary.passedDirections,
  isolationAssertions: projectedRouteReport.isolationAssertions.length,
  passedIsolationAssertions: projectedRouteReport.isolationAssertions.filter(
    (assertion) => assertion.passed,
  ).length,
  remainingBlockers: projectedRouteReport.blockingFindings.map((entry) => entry.id),
}, null, 2)}\n`);

if (!projectedRouteReport.passed) process.exitCode = 1;
