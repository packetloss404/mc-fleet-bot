#!/usr/bin/env node
/**
 * Compile CZ-R11C: a dry eastern C1 highway pavement extension.
 *
 * The package materializes the full accepted highway cross-section at C1
 * stations 494..517. Those 24 stations are the complete contiguous accepted
 * at-grade run immediately east of R11A, stopping before the next treatment.
 * The operation set stays outside every C01/default-deny and Data District
 * interface. It excludes rail, utilities, drainage, fluids, entities, block
 * entities, containers, protected relics, and every prior release. Exact
 * projected dependency audits prove that neither gravity replacement nor
 * leaf-property stabilization is required by this source-bound package.
 *
 * This compiler is offline. It performs no RCON call and no world edit.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
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

const GENERATED_AT = value('--generated-at', '2026-08-21T18:45:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r08p-post-20260821T184147Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r08p-live-20260821T184147Z/post-complete-save-intake.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r11c-c1-east-highway-completion';
const RELEASE_ID = 'CZ-R11C-C1-EAST-HIGHWAY-COMPLETION';
const RELEASE_NODE_ID = 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR';
const PAVEMENT_KEY = 'c1-east-at-grade-completion';
const START_STATION = 494;
const END_STATION = 517;

const INPUTS = Object.freeze({
  c1Design: 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  standingAuthorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  materialPrecedent: 'docs/masterplans/05-combined-zones/phase1-r01-b11-scope-and-material-decision.json',
  sourceLedger: 'data/world-review/combined-zones-r08p-live-20260821T184147Z/evidence-ledger.json',
  priorManifests: [
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
    'data/buildops/combined-zones-r07g-empty-eight-egress-headhouses.release-manifest.json',
    'data/buildops/combined-zones-r07h-b09-lower-guideway-segment-02.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-01-partitioned-fluid-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-01-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-02-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-03-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-04-wet-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-04-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-05-flow-ordered-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-05-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-06-dynamic-fluid-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-06-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-07-wet-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-07-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-08-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-north-galleria-capped-retail-shells.release-manifest.json',
    'data/buildops/combined-zones-r08-south-galleria-capped-retail-shells.release-manifest.json',
    'data/buildops/combined-zones-r08p-s09-gravity-stabilized-capped-retail-shell.release-manifest.json',
    'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
    'data/buildops/combined-zones-r09b-b07-lower-spiral-stair.release-manifest.json',
    'data/buildops/combined-zones-r09c-b07-stair-safety-completion.release-manifest.json',
    'data/buildops/combined-zones-r09d-b07-terminal-crown.release-manifest.json',
    'data/buildops/combined-zones-r10-cheyenne-secure-gallery.release-manifest.json',
    'data/buildops/combined-zones-r11a-c1-east-highway-pilot.release-manifest.json',
    'data/buildops/combined-zones-r11b-c1-west-highway-extension.release-manifest.json',
  ],
});

const EXPECTED = Object.freeze({
  sourceCompleteSaveSha256:
    'bf3f03362e1c920e89cf6eadbbb46926dbf7a204acd8eeae5f0182951f1a4505',
  sourceRegionSha256:
    'b0503fc70b8960c2f6a413c620136c5c0ecbd562093362f143e902f7376abc25',
  sourceLedgerSha256:
    'ab87277187339f06f2306daf5f24228574d71ae65749fd22fda8bc3ac29c39c1',
  sourceCompletedReleaseIdentitySha256:
    'f59ad1ae37ca9a2786c9b3f560bdfdffde250e9d38c000c0d059b39e96c9f9e3',
  c1ReferencePointCount: 1216,
  c1ReferenceRasterSha256:
    '34fb2d5b349c71421ce2959a4dc0b090f0ab2df139d06ac9d42ff71e3c39f48b',
  highwayColumnSetSha256:
    '42bbb84ced864d25bea6261d677cb14c818d07ad7b8ce290636cfb9c5c859ae8',
  candidateSurfaceCellCount: 462,
  candidateSurfaceCoordinateSetSha256:
    '7327893494b7d4645001b7351d26e073acce37629935acb8b079743fe96ecc4c',
  inheritedR11ASurfaceCellCount: 0,
  inheritedR11ASurfaceCoordinateSetSha256:
    'aa098373ca9e97626d479bd2ab4609c6c8538dfd2e6bbaf82270fc9e65dd9cf4',
  inheritedR11AHeadroomCellCount: 0,
  inheritedR11AHeadroomCoordinateSetSha256:
    'aa098373ca9e97626d479bd2ab4609c6c8538dfd2e6bbaf82270fc9e65dd9cf4',
  inheritedR11ASupportCellCount: 23,
  inheritedR11ASupportCoordinateSetSha256:
    'faab25d6ed2ee368d2296ed49e651979e19b7f6f3632d0f449997e6fecf5d921',
  inheritedR11AFunctionalCellCount: 23,
  inheritedR11AFunctionalCoordinateSetSha256:
    'faab25d6ed2ee368d2296ed49e651979e19b7f6f3632d0f449997e6fecf5d921',
  inheritedR11AEnvelopeConflictCellCount: 1,
  inheritedR11AEnvelopeConflictCoordinateSetSha256:
    '949bf39447c5ca70c077886398a16ff6156544968c407cb892e2cb4582db2926',
  inheritedR11BEnvelopeConflictCellCount: 23,
  inheritedR11BEnvelopeConflictCoordinateSetSha256:
    '8db2a18a7e2f445bc5d4fa1d0787689cdbb823f49a276563f1d5f78b02977632',
  utilityReservationConflictCellCount: 3,
  utilityReservationConflictCoordinateSetSha256:
    '454d9ed2fbaf386c10b244a593027fc3b34b8a8fa7a7be3c262df00adfdaa058',
  gradeShadowedCandidateCellCount: 13,
  gradeShadowedCandidateCoordinateSetSha256:
    'cec12d7786e2d8a0e165f463910fc11f9ce07fabbaf5d745ac1cc34b9c155766',
  intrinsicGradeShadowedCandidateCellCount: 9,
  intrinsicGradeShadowedCandidateCoordinateSetSha256:
    'ec9a9fbfafbd3bcabd18d35a4fd9b8417d499bcef8a39e6df0a910da6c3cee21',
  r11bInducedGradeShadowedCandidateCellCount: 8,
  r11bInducedGradeShadowedCandidateCoordinateSetSha256:
    '850d16a1ec086a302cdb4aa55148da5c7b2dce9b6a83ae3fc89de55c6e45d43a',
  surfaceCellCount: 399,
  surfaceCoordinateSetSha256:
    'd290098f6186f7ed133b1448e4738c37a0e62f42fb7e74755583b6271db87239',
  foundationCellCount: 68,
  foundationCoordinateSetSha256:
    '20de2c236a1dff8d341a57f6ca88bb501a2764e0e4f498049f533175539b2c8e',
  headroomClearCellCount: 642,
  headroomClearCoordinateSetSha256:
    'cf02f54b8a4c73cef101013a6f548ad99e54cb3a889df6f8b82deb2af51f5447',
  fullHeadroomCellCount: 798,
  fullHeadroomCoordinateSetSha256:
    '090f1a1271ffc274006e286270a89aae116e53480d2503e08e46f7e0ad4a1bc4',
  gravityStabilizationCellCount: 0,
  gravityStabilizationCoordinateSetSha256:
    'aa098373ca9e97626d479bd2ab4609c6c8538dfd2e6bbaf82270fc9e65dd9cf4',
  ownedLogRemovalCellCount: 27,
  ownedLogRemovalCoordinateSetSha256:
    '061da78b940ac1b8a405824d11e3a0636600189f9f35851aeb74ed0fe4227a6b',
  removalInfluencedLeafCellCount: 235,
  removalInfluencedLeafCoordinateSetSha256:
    'edf69cab488de9066ee819b228caa5e9c182b056626bed67b89610d67793e165',
  leafStabilizationCellCount: 0,
  leafStabilizationCoordinateSetSha256:
    'aa098373ca9e97626d479bd2ab4609c6c8538dfd2e6bbaf82270fc9e65dd9cf4',
  stabilizationCellCount: 0,
  stabilizationCoordinateSetSha256:
    'aa098373ca9e97626d479bd2ab4609c6c8538dfd2e6bbaf82270fc9e65dd9cf4',
  operatedCellCount: 1109,
  operatedCoordinateSetSha256:
    '2e671a5ae94babdc29c518bacdc167f9e71a23db32b539f98b023903c7bd2a74',
  grayCellCount: 267,
  shoulderCellCount: 84,
  medianCellCount: 48,
  seamAdjacentPairCount: 93,
  seamComponentCount: 3,
  leafDependencyInterfaceIntersections: {
    railReserve: 0,
    railCollection: 0,
    utilityReserve: 0,
    roadCollection: 0,
  },
});

const AIR_BLOCKS = new Set([
  'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
]);
const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava']);
const GRAVITY_BLOCKS = new Set([
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
  if (!condition) throw new Error(`R11C C1 highway compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const stateProperty = (state, property) => {
  const match = state.match(new RegExp(`(?:\\[|,)${property}=([^,\\]]+)`));
  return match?.[1] ?? null;
};
const isLeaf = (state) => /_leaves$/.test(blockName(state));
const isLeafSupportLog = (state) => /_(?:log|wood)$/.test(blockName(state));
const isAir = (state) => AIR_BLOCKS.has(blockName(state));
const isFluid = (state) => (
  FLUID_BLOCKS.has(blockName(state)) || state.includes('waterlogged=true')
);
const isReplaceableSupport = (state) => {
  const name = blockName(state);
  return isAir(state)
    || ['minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:leaf_litter',
      'minecraft:bush'].includes(name)
    || /_leaves$/.test(name);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const inside2d = (cell, extent) => cell.x >= extent.minX && cell.x <= extent.maxX
  && cell.z >= extent.minZ && cell.z <= extent.maxZ;
const inside3d = (cell, bounds) => inside2d(cell, bounds)
  && cell.y >= bounds.minY && cell.y <= bounds.maxY;
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const census = (records, field) => Object.fromEntries([...records.reduce(
  (result, record) => result.set(record[field], (result.get(record[field]) ?? 0) + 1),
  new Map(),
).entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));

function tangentAt(points, index) {
  const previous = points[Math.max(0, index - 1)];
  const next = points[Math.min(points.length - 1, index + 1)];
  const dx = next.x - previous.x;
  const dz = next.z - previous.z;
  const length = Math.hypot(dx, dz);
  invariant(length > 0, `zero tangent at station ${index}`);
  return { x: dx / length, z: dz / length };
}

function offsetPoint(point, tangent, offset) {
  return {
    x: point.x + Math.round(offset * -tangent.z),
    z: point.z + Math.round(offset * tangent.x),
  };
}

function crossfallAdjustment(offset) {
  if (offset <= -5) return 1;
  if (offset <= 5) return 0;
  return -1;
}

function canonicalSurface(stations, start, end) {
  const byPlanColumn = new Map();
  for (let station = start; station <= end; station += 1) {
    const reference = stations[station];
    const tangent = tangentAt(stations, station);
    for (let offset = -14; offset <= 14; offset += 1) {
      const point = offsetPoint(reference, tangent, offset);
      const key = `${point.x},${point.z}`;
      if (!byPlanColumn.has(key)) {
        byPlanColumn.set(key, {
          ...point,
          y: reference.highwayReferenceY + crossfallAdjustment(offset),
          station,
          offset,
        });
      }
    }
  }
  return [...byPlanColumn.values()];
}

function componentCount(cells) {
  const unvisited = new Set(cells.map(({ x, y, z }) => `${x},${y},${z}`));
  let count = 0;
  while (unvisited.size) {
    count += 1;
    const queue = [unvisited.values().next().value];
    unvisited.delete(queue[0]);
    while (queue.length) {
      const current = queue.pop();
      const [x, y, z] = current.split(',').map(Number);
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dz = -1; dz <= 1; dz += 1) {
            if (!dx && !dy && !dz) continue;
            const key = `${x + dx},${y + dy},${z + dz}`;
            if (unvisited.delete(key)) queue.push(key);
          }
        }
      }
    }
  }
  return count;
}

function connectedCellComponents(cells) {
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const unvisited = new Set(byKey.keys());
  const components = [];
  while (unvisited.size) {
    const first = unvisited.values().next().value;
    unvisited.delete(first);
    const queue = [first];
    const component = [];
    while (queue.length) {
      const currentKey = queue.pop();
      const current = byKey.get(currentKey);
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
  return components;
}

function surfaceTarget(offset) {
  if (offset <= -12 || offset >= 12) return 'minecraft:smooth_stone';
  if (offset >= -1 && offset <= 1) return 'minecraft:yellow_concrete';
  return 'minecraft:gray_concrete';
}

function operationBody(filename) {
  return `${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
}

function priorOperationIntersections(filename, targetKeys, targetBounds) {
  const intersections = new Map();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    if (fields[0] === 'CMD') {
      for (const match of raw.matchAll(/(?:if block|data merge block) (-?\d+) (-?\d+) (-?\d+)/g)) {
        const cell = { x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) };
        if (targetKeys.has(cellKey(cell))) intersections.set(cellKey(cell), cell);
      }
      continue;
    }
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    const bounds = {
      minX: Math.min(coordinates[0], coordinates[3]),
      maxX: Math.max(coordinates[0], coordinates[3]),
      minY: Math.min(coordinates[1], coordinates[4]),
      maxY: Math.max(coordinates[1], coordinates[4]),
      minZ: Math.min(coordinates[2], coordinates[5]),
      maxZ: Math.max(coordinates[2], coordinates[5]),
    };
    const overlap = {
      minX: Math.max(bounds.minX, targetBounds.minX),
      maxX: Math.min(bounds.maxX, targetBounds.maxX),
      minY: Math.max(bounds.minY, targetBounds.minY),
      maxY: Math.min(bounds.maxY, targetBounds.maxY),
      minZ: Math.max(bounds.minZ, targetBounds.minZ),
      maxZ: Math.min(bounds.maxZ, targetBounds.maxZ),
    };
    if (overlap.minX > overlap.maxX || overlap.minY > overlap.maxY
      || overlap.minZ > overlap.maxZ) continue;
    for (let x = overlap.minX; x <= overlap.maxX; x += 1) {
      for (let y = overlap.minY; y <= overlap.maxY; y += 1) {
        for (let z = overlap.minZ; z <= overlap.maxZ; z += 1) {
          const cell = { x, y, z };
          if (targetKeys.has(cellKey(cell))) intersections.set(cellKey(cell), cell);
        }
      }
    }
  }
  return [...intersections.values()];
}

function operationTargetCells(filename) {
  const cells = new Map();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    if (fields[0] === 'CMD') {
      for (const match of raw.matchAll(/(?:if block|data merge block) (-?\d+) (-?\d+) (-?\d+)/g)) {
        const cell = { x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) };
        cells.set(cellKey(cell), cell);
      }
      continue;
    }
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    for (let x = Math.min(coordinates[0], coordinates[3]); x <= Math.max(coordinates[0], coordinates[3]); x += 1) {
      for (let y = Math.min(coordinates[1], coordinates[4]); y <= Math.max(coordinates[1], coordinates[4]); y += 1) {
        for (let z = Math.min(coordinates[2], coordinates[5]); z <= Math.max(coordinates[2], coordinates[5]); z += 1) {
          const cell = { x, y, z };
          cells.set(cellKey(cell), cell);
        }
      }
    }
  }
  return [...cells.values()];
}

function savedEntityInside(entity, bounds) {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= bounds.minX && x < bounds.maxX + 1
    && y >= bounds.minY && y < bounds.maxY + 1
    && z >= bounds.minZ && z < bounds.maxZ + 1;
}

const c1 = readJson(INPUTS.c1Design);
const releaseContract = readJson(INPUTS.releaseContract);
const authorization = readJson(INPUTS.standingAuthorization);
const protectedRelics = readJson(INPUTS.protectedRelics);
const materialPrecedent = readJson(INPUTS.materialPrecedent);
const r11bManifest = readJson(
  'data/buildops/combined-zones-r11b-c1-west-highway-extension.release-manifest.json',
);
const sourceLedger = readJson(INPUTS.sourceLedger);
const intake = readJson(INTAKE_AUDIT);
const sourceIdentity = readJson(sourceLedger.postSnapshot.identity.path);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not a complete immutable same-moment PASS');
invariant(samePath(intake.input?.suppliedWorldRoot, SNAPSHOT),
  'source intake is not bound to the requested snapshot');
invariant(intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256,
  'source complete-save identity drifted');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
  'source snapshot is missing level.dat');
invariant(sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.transactionId === 'combined-zones-r08p-s09-gravity-stabilized-capped-retail-shell'
  && samePath(sourceLedger.postSnapshot?.root, SNAPSHOT)
  && sourceLedger.postSnapshot?.completeSaveSha256 === intake.packageIdentity.completeSaveSha256
  && sha256(fs.readFileSync(absolute(INPUTS.sourceLedger))) === EXPECTED.sourceLedgerSha256
  && sourceLedger.completedReleaseIdentitySha256
    === EXPECTED.sourceCompletedReleaseIdentitySha256,
'source ledger is not the accepted R08P post state');
invariant(sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
  && samePath(sourceIdentity.directory, path.join(SNAPSHOT, 'region')),
'source region identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes?.includes(RELEASE_NODE_ID),
'standing authorization does not cover R11');
const r11 = releaseContract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r11?.status === 'ELIGIBLE_AFTER_LOCAL_DEPENDENCIES_AND_KERNEL'
  && r11.canonicalOwners.includes('C1-HIGHWAY'),
'release contract does not expose the C1 highway owner at R11');
invariant(c1.horizontalAlignment.referencePointCount === EXPECTED.c1ReferencePointCount
  && c1.horizontalAlignment.referenceCenterlineColumnSetSha256
    === EXPECTED.c1ReferenceRasterSha256,
'accepted C1 raster identity drifted');
invariant(c1.crossSection.highway.columns.columnSetSha256
  === EXPECTED.highwayColumnSetSha256
  && JSON.stringify(c1.crossSection.highway.offsetsInclusive) === '[-14,14]',
'accepted C1 highway cross-section drifted');
invariant(materialPrecedent.materialDecision.designPrecedent
  === 'town grid-road palette (gray_concrete carriageway, yellow_concrete stripe, stone_bricks curb, smooth_stone sidewalk)',
'accepted road material precedent drifted');

const stations = c1.horizontalAlignment.stations;
const selectedStations = stations.slice(START_STATION, END_STATION + 1);
invariant(selectedStations.length === 24
  && selectedStations.every(({ treatment }) => treatment === 'AT_GRADE_COORDINATION_PASS'),
'selected station slice is not exactly the complete 24-station accepted at-grade run');

// Reproduce the C1 compiler's first-station-owned canonical 2D columns.
const candidateSurface = canonicalSurface(stations, START_STATION, END_STATION);
const r11aSurface = canonicalSurface(stations, 489, 493);
const r11aSurfaceKeys = new Set(r11aSurface.map(cellKey));
const r11aFullHeadroom = uniqueCells(r11aSurface.flatMap((cell) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
]));
const r11aHeadroomKeys = new Set(r11aFullHeadroom.map(cellKey));
const candidateR11AHeadroomOverlap = candidateSurface.filter((cell) => (
  r11aHeadroomKeys.has(cellKey(cell))
));
const r11aDirectSupports = r11aSurface.map((cell) => ({
  x: cell.x, y: cell.y - 1, z: cell.z,
}));
const r11aDirectSupportKeys = new Set(r11aDirectSupports.map(cellKey));
const candidateR11ASupportOverlap = candidateSurface.filter((cell) => (
  r11aDirectSupportKeys.has(cellKey(cell))
));
const r11aFunctionalKeys = new Set([
  ...r11aSurfaceKeys,
  ...r11aHeadroomKeys,
  ...r11aDirectSupportKeys,
]);
const inheritedR11AFunctionalCells = candidateSurface.filter((cell) => (
  r11aFunctionalKeys.has(cellKey(cell))
));
const inheritedR11ASurface = candidateSurface.filter((cell) => r11aSurfaceKeys.has(cellKey(cell)));
const candidateAfterR11AFunctionalExclusion = candidateSurface.filter(
  (cell) => !r11aFunctionalKeys.has(cellKey(cell)),
);
const prospectiveEnvelope = (cell) => [
  cell,
  { x: cell.x, y: cell.y - 1, z: cell.z },
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
];
const r11aEnvelopeConflictCandidate = candidateAfterR11AFunctionalExclusion.filter(
  (cell) => prospectiveEnvelope(cell).some(
    (point) => r11aFunctionalKeys.has(cellKey(point)),
  ),
);
const r11aEnvelopeConflictKeys = new Set(r11aEnvelopeConflictCandidate.map(cellKey));
const candidateAfterR11AEnvelopeExclusion = candidateAfterR11AFunctionalExclusion.filter(
  (cell) => !r11aEnvelopeConflictKeys.has(cellKey(cell)),
);
const r11bOperatedCells = uniqueCells(r11bManifest.packages.flatMap(({ forward }) => (
  operationTargetCells(forward)
)));
const r11bOperatedKeys = new Set(r11bOperatedCells.map(cellKey));
const r11bEnvelopeConflictCandidate = candidateAfterR11AEnvelopeExclusion.filter(
  (cell) => prospectiveEnvelope(cell).some((point) => r11bOperatedKeys.has(cellKey(point))),
);
const r11bEnvelopeConflictKeys = new Set(r11bEnvelopeConflictCandidate.map(cellKey));
const candidateAfterR11BEnvelopeExclusion = candidateAfterR11AEnvelopeExclusion.filter(
  (cell) => !r11bEnvelopeConflictKeys.has(cellKey(cell)),
);
const utilityReservationPlanKeys = new Set(
  selectedOffsetColumns(15, 17).map(({ x, z }) => `${x},${z}`),
);
const utilityReservationConflictCandidate = candidateAfterR11BEnvelopeExclusion.filter(
  ({ x, z }) => utilityReservationPlanKeys.has(`${x},${z}`),
);
const utilityReservationConflictKeys = new Set(
  utilityReservationConflictCandidate.map(cellKey),
);
const candidateAfterUtilityReservationExclusion = candidateAfterR11BEnvelopeExclusion.filter(
  (cell) => !utilityReservationConflictKeys.has(cellKey(cell)),
);
const candidateBeforeR11BEnvelopeAfterUtilityExclusion = candidateAfterR11AEnvelopeExclusion.filter(
  ({ x, z }) => !utilityReservationPlanKeys.has(`${x},${z}`),
);
const preR11BComponents = connectedCellComponents(
  candidateBeforeR11BEnvelopeAfterUtilityExclusion,
);
const candidateComponents = connectedCellComponents(candidateAfterUtilityReservationExclusion);
const stepSafeAdjacentToR11A = (cell) => r11aSurface.some((accepted) => (
  Math.max(Math.abs(cell.x - accepted.x), Math.abs(cell.z - accepted.z)) === 1
  && Math.abs(cell.y - accepted.y) <= 1
));
const surface = candidateComponents.filter(
  (component) => component.some(stepSafeAdjacentToR11A),
).flat();
const r11aGradeShadowedDisconnectedCandidate = candidateComponents.filter(
  (component) => !component.some(stepSafeAdjacentToR11A),
).flat();
const intrinsicGradeShadowedDisconnectedCandidate = preR11BComponents.filter(
  (component) => !component.some(stepSafeAdjacentToR11A),
).flat();
const intrinsicGradeShadowedKeys = new Set(
  intrinsicGradeShadowedDisconnectedCandidate.map(cellKey),
);
const r11bInducedGradeShadowedDisconnectedCandidate = r11aGradeShadowedDisconnectedCandidate.filter(
  (cell) => !intrinsicGradeShadowedKeys.has(cellKey(cell)),
);
const intrinsicGradeNowPreservedByR11BEnvelope = intrinsicGradeShadowedDisconnectedCandidate.filter(
  (cell) => r11bEnvelopeConflictKeys.has(cellKey(cell)),
);
const intrinsicGradeRemainingInFinalShadow = intrinsicGradeShadowedDisconnectedCandidate.filter(
  (cell) => !r11bEnvelopeConflictKeys.has(cellKey(cell)),
);
const preservedCandidateExceptions = uniqueCells([
  ...inheritedR11AFunctionalCells,
  ...r11aEnvelopeConflictCandidate,
  ...r11bEnvelopeConflictCandidate,
  ...utilityReservationConflictCandidate,
  ...r11aGradeShadowedDisconnectedCandidate,
]);
const completeCandidatePartition = uniqueCells([...surface, ...preservedCandidateExceptions]);
invariant(candidateSurface.length === EXPECTED.candidateSurfaceCellCount
  && hashCells(candidateSurface) === EXPECTED.candidateSurfaceCoordinateSetSha256
  && inheritedR11ASurface.length === EXPECTED.inheritedR11ASurfaceCellCount
  && hashCells(inheritedR11ASurface) === EXPECTED.inheritedR11ASurfaceCoordinateSetSha256
  && candidateR11AHeadroomOverlap.length === EXPECTED.inheritedR11AHeadroomCellCount
  && hashCells(candidateR11AHeadroomOverlap)
    === EXPECTED.inheritedR11AHeadroomCoordinateSetSha256
  && inheritedR11AFunctionalCells.length === EXPECTED.inheritedR11AFunctionalCellCount
  && hashCells(inheritedR11AFunctionalCells)
    === EXPECTED.inheritedR11AFunctionalCoordinateSetSha256
  && candidateR11ASupportOverlap.length === EXPECTED.inheritedR11ASupportCellCount
  && hashCells(candidateR11ASupportOverlap)
    === EXPECTED.inheritedR11ASupportCoordinateSetSha256
  && r11aEnvelopeConflictCandidate.length === EXPECTED.inheritedR11AEnvelopeConflictCellCount
  && hashCells(r11aEnvelopeConflictCandidate)
    === EXPECTED.inheritedR11AEnvelopeConflictCoordinateSetSha256
  && r11bEnvelopeConflictCandidate.length === EXPECTED.inheritedR11BEnvelopeConflictCellCount
  && hashCells(r11bEnvelopeConflictCandidate)
    === EXPECTED.inheritedR11BEnvelopeConflictCoordinateSetSha256
  && utilityReservationConflictCandidate.length === EXPECTED.utilityReservationConflictCellCount
  && hashCells(utilityReservationConflictCandidate)
    === EXPECTED.utilityReservationConflictCoordinateSetSha256
  && r11aGradeShadowedDisconnectedCandidate.length
    === EXPECTED.gradeShadowedCandidateCellCount
  && hashCells(r11aGradeShadowedDisconnectedCandidate)
    === EXPECTED.gradeShadowedCandidateCoordinateSetSha256
  && intrinsicGradeShadowedDisconnectedCandidate.length
    === EXPECTED.intrinsicGradeShadowedCandidateCellCount
  && hashCells(intrinsicGradeShadowedDisconnectedCandidate)
    === EXPECTED.intrinsicGradeShadowedCandidateCoordinateSetSha256
  && r11bInducedGradeShadowedDisconnectedCandidate.length
    === EXPECTED.r11bInducedGradeShadowedCandidateCellCount
  && hashCells(r11bInducedGradeShadowedDisconnectedCandidate)
    === EXPECTED.r11bInducedGradeShadowedCandidateCoordinateSetSha256
  && intrinsicGradeNowPreservedByR11BEnvelope.length === 4
  && intrinsicGradeRemainingInFinalShadow.length === 5
  && surface.length === EXPECTED.surfaceCellCount
  && hashCells(surface) === EXPECTED.surfaceCoordinateSetSha256
  && preservedCandidateExceptions.length === 63
  && completeCandidatePartition.length === candidateSurface.length
  && hashCells(completeCandidatePartition) === hashCells(candidateSurface),
`east highway extension surface identity drifted: ${JSON.stringify({
  candidate: classManifest(candidateSurface),
  inheritedSurface: classManifest(inheritedR11ASurface),
  inheritedHeadroom: classManifest(candidateR11AHeadroomOverlap),
  inheritedSupport: classManifest(candidateR11ASupportOverlap),
  inheritedFunctional: classManifest(inheritedR11AFunctionalCells),
  inheritedEnvelopeConflict: classManifest(r11aEnvelopeConflictCandidate),
  inheritedR11BEnvelopeConflict: classManifest(r11bEnvelopeConflictCandidate),
  utilityReservationConflict: classManifest(utilityReservationConflictCandidate),
  gradeShadowedDisconnectedCandidate: classManifest(r11aGradeShadowedDisconnectedCandidate),
  intrinsicGradeShadowedDisconnectedCandidate:
    classManifest(intrinsicGradeShadowedDisconnectedCandidate),
  r11bInducedGradeShadowedDisconnectedCandidate:
    classManifest(r11bInducedGradeShadowedDisconnectedCandidate),
  intrinsicGradeNowPreservedByR11BEnvelope:
    classManifest(intrinsicGradeNowPreservedByR11BEnvelope),
  intrinsicGradeRemainingInFinalShadow:
    classManifest(intrinsicGradeRemainingInFinalShadow),
  preservedCandidateExceptions: classManifest(preservedCandidateExceptions),
  completeCandidatePartition: classManifest(completeCandidatePartition),
  surface: classManifest(surface),
})}`);
const seamPairs = [];
for (const west of surface) {
  for (const east of r11aSurface) {
    if (Math.max(Math.abs(west.x - east.x), Math.abs(west.z - east.z)) === 1
      && Math.abs(west.y - east.y) <= 1) seamPairs.push({ west, east });
  }
}
invariant(seamPairs.length > 0, 'east completion has no step-safe seam to R11A');
const combinedSurface = [...surface, ...r11aSurface];
invariant(componentCount(combinedSurface) === 1,
  'east completion and R11A do not form exactly one surface component');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const r11aSurfaceStateViolations = [];
for (const cell of r11aSurface) {
  const observedState = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  const expectedState = surfaceTarget(cell.offset);
  if (observedState !== expectedState) {
    r11aSurfaceStateViolations.push({ cell, observedState, expectedState });
  }
}
invariant(r11aSurfaceStateViolations.length === 0,
  `accepted R11A seam surface drifted: ${JSON.stringify(r11aSurfaceStateViolations.slice(0, 20))}`);
const r11aHeadroomStateViolations = [];
for (const cell of r11aFullHeadroom) {
  const observedState = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (!isAir(observedState)) r11aHeadroomStateViolations.push({ cell, observedState });
}
invariant(r11aHeadroomStateViolations.length === 0,
  `accepted R11A seam headroom drifted: ${JSON.stringify(r11aHeadroomStateViolations.slice(0, 20))}`);
const sourceSurfaceRecords = [];
const headroomRecordsByCell = new Map();
const foundationRecordsByCell = new Map();
const stabilizationRecordsByCell = new Map();
const supportRecords = [];
const addStabilization = (cell, sourceState, reason) => {
  invariant(blockName(sourceState) === 'minecraft:gravel',
    `gravity dependency is not ordinary gravel at ${cellKey(cell)}: ${sourceState}`);
  const key = cellKey(cell);
  const existing = stabilizationRecordsByCell.get(key);
  if (existing) {
    existing.reasons.add(reason);
    return;
  }
  stabilizationRecordsByCell.set(key, {
    cell,
    sourceState,
    targetState: 'minecraft:stone_bricks',
    reasons: new Set([reason]),
  });
};
for (const cell of surface) {
  const sourceState = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  sourceSurfaceRecords.push({
    cell: { x: cell.x, y: cell.y, z: cell.z },
    station: cell.station,
    offset: cell.offset,
    sourceState,
    targetState: surfaceTarget(cell.offset),
  });
  if (GRAVITY_BLOCKS.has(blockName(sourceState))) {
    addStabilization({ x: cell.x, y: cell.y, z: cell.z }, sourceState, 'pavement-target');
  }
  let supportCell = { x: cell.x, y: cell.y - 1, z: cell.z };
  let supportState = stateToCommandString(await reader.blockState(
    supportCell.x, supportCell.y, supportCell.z,
  ));
  while (isReplaceableSupport(supportState)) {
    foundationRecordsByCell.set(cellKey(supportCell), {
      cell: supportCell,
      sourceState: supportState,
      targetState: 'minecraft:stone_bricks',
    });
    supportCell = { x: supportCell.x, y: supportCell.y - 1, z: supportCell.z };
    supportState = stateToCommandString(await reader.blockState(
      supportCell.x, supportCell.y, supportCell.z,
    ));
  }
  if (GRAVITY_BLOCKS.has(blockName(supportState))) {
    addStabilization(supportCell, supportState, 'load-bearing-contact');
  }
  supportRecords.push({
    cell: supportCell,
    sourceState: GRAVITY_BLOCKS.has(blockName(supportState))
      ? 'minecraft:stone_bricks'
      : supportState,
    originalSourceState: supportState,
    surfaceCell: { x: cell.x, y: cell.y, z: cell.z },
    station: cell.station,
    offset: cell.offset,
  });
  for (let y = cell.y + 1; y <= cell.y + 2; y += 1) {
    const headCell = { x: cell.x, y, z: cell.z };
    const sourceState = stateToCommandString(await reader.blockState(
      headCell.x, headCell.y, headCell.z,
    ));
    if (!isAir(sourceState)) {
      headroomRecordsByCell.set(cellKey(headCell), {
        cell: headCell,
        sourceState,
        targetState: 'minecraft:air',
      });
      if (GRAVITY_BLOCKS.has(blockName(sourceState))) {
        addStabilization(headCell, sourceState, 'headroom-target');
      }
    }
  }
  // A gravity stack immediately above the cleared two-block headroom would
  // otherwise fall into the route. Freeze the complete vertical dependency
  // chain until its first non-gravity state.
  let ceilingCell = { x: cell.x, y: cell.y + 3, z: cell.z };
  let ceilingState = stateToCommandString(await reader.blockState(
    ceilingCell.x, ceilingCell.y, ceilingCell.z,
  ));
  while (GRAVITY_BLOCKS.has(blockName(ceilingState))) {
    addStabilization(ceilingCell, ceilingState, 'headroom-overburden');
    ceilingCell = { x: ceilingCell.x, y: ceilingCell.y + 1, z: ceilingCell.z };
    ceilingState = stateToCommandString(await reader.blockState(
      ceilingCell.x, ceilingCell.y, ceilingCell.z,
    ));
  }
}
const gravityStabilizationRecords = [...stabilizationRecordsByCell.values()].map((record) => ({
  ...record,
  reasons: [...record.reasons].sort(),
}));
const gravityStabilizationKeys = new Set(
  gravityStabilizationRecords.map(({ cell }) => cellKey(cell)),
);
const surfaceRecords = sourceSurfaceRecords.map((record) => ({
  ...record,
  sourceState: gravityStabilizationKeys.has(cellKey(record.cell))
    ? 'minecraft:stone_bricks'
    : record.sourceState,
}));
const headroomRecords = [...headroomRecordsByCell.values()].map((record) => ({
  ...record,
  sourceState: gravityStabilizationKeys.has(cellKey(record.cell))
    ? 'minecraft:stone_bricks'
    : record.sourceState,
}));
const fullHeadroomCells = uniqueCells(surface.flatMap((cell) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
]));
const headroomCutKeys = new Set(headroomRecords.map(({ cell }) => cellKey(cell)));
const sourceAlreadyAirHeadroomCells = fullHeadroomCells.filter((cell) => (
  !headroomCutKeys.has(cellKey(cell))
));
const foundationRecords = [...foundationRecordsByCell.values()];
invariant(foundationRecords.length === EXPECTED.foundationCellCount
  && hashCells(foundationRecords.map(({ cell }) => cell))
    === EXPECTED.foundationCoordinateSetSha256,
`east highway foundation identity drifted: ${JSON.stringify(
  classManifest(foundationRecords.map(({ cell }) => cell)),
)}`);
invariant(headroomRecords.length === EXPECTED.headroomClearCellCount
  && hashCells(headroomRecords.map(({ cell }) => cell))
    === EXPECTED.headroomClearCoordinateSetSha256
  && fullHeadroomCells.length === EXPECTED.fullHeadroomCellCount
  && hashCells(fullHeadroomCells) === EXPECTED.fullHeadroomCoordinateSetSha256,
`east highway headroom-clear identity drifted: ${JSON.stringify({
  cuts: classManifest(headroomRecords.map(({ cell }) => cell)),
  full: classManifest(fullHeadroomCells),
  alreadyAir: classManifest(sourceAlreadyAirHeadroomCells),
})}`);
invariant(gravityStabilizationRecords.length === EXPECTED.gravityStabilizationCellCount
  && hashCells(gravityStabilizationRecords.map(({ cell }) => cell))
    === EXPECTED.gravityStabilizationCoordinateSetSha256,
`east highway gravity dependency closure drifted: ${JSON.stringify(
  classManifest(gravityStabilizationRecords.map(({ cell }) => cell)),
)}`);

const supportViolations = supportRecords.filter(({ sourceState }) => (
  isAir(sourceState) || isFluid(sourceState)
  || GRAVITY_BLOCKS.has(blockName(sourceState))
  || FORBIDDEN_SOURCE_BLOCKS.has(blockName(sourceState))
));
invariant(supportViolations.length === 0,
  `pavement lacks stable support: ${JSON.stringify(supportViolations.slice(0, 20))}`);
const pavementSourceRecords = [
  ...sourceSurfaceRecords,
  ...headroomRecordsByCell.values(),
  ...foundationRecordsByCell.values(),
];
const woodyTargets = pavementSourceRecords.filter(({ sourceState }) => (
  isLeaf(sourceState) || isLeafSupportLog(sourceState)
));
const ownedLogRemovals = pavementSourceRecords.filter(({ sourceState, targetState }) => (
  isLeafSupportLog(sourceState) && !isLeafSupportLog(targetState)
));
const pavementSourceTargetKeys = new Set(pavementSourceRecords.map(({ cell }) => cellKey(cell)));
const sourceStateCache = new Map();
const sourceStateAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceStateCache.has(key)) {
    sourceStateCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  }
  return sourceStateCache.get(key);
};
const LEAF_DIRECTIONS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
// First identify only retained leaves whose current distance can be influenced
// by an R11C-owned log removal. Traversal is six-face, starts at those exact
// logs, and is bounded to Minecraft's six-step leaf-distance propagation.
const removalInfluencedLeaves = new Map();
const removalSearchDepth = new Map(ownedLogRemovals.map(({ cell }) => [cellKey(cell), 0]));
const removalSearchQueue = ownedLogRemovals.map(({ cell }) => ({ cell, depth: 0 }));
while (removalSearchQueue.length) {
  const { cell, depth } = removalSearchQueue.shift();
  if (depth >= 6) continue;
  for (const [dx, dy, dz] of LEAF_DIRECTIONS) {
    const neighbour = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
    const key = cellKey(neighbour);
    const nextDepth = depth + 1;
    if ((removalSearchDepth.get(key) ?? Infinity) <= nextDepth) continue;
    const sourceState = await sourceStateAt(neighbour);
    if (!isLeaf(sourceState)) continue;
    removalSearchDepth.set(key, nextDepth);
    removalSearchQueue.push({ cell: neighbour, depth: nextDepth });
    if (!pavementSourceTargetKeys.has(key)) {
      removalInfluencedLeaves.set(key, { cell: neighbour, sourceState, removalDistance: nextDepth });
    }
  }
}
// Project the route package by treating every pavement target as absent from
// the leaf/log graph. A retained leaf is at decay risk only when its exact
// source distance is <7 and no retained log remains reachable within six
// six-face leaf steps. Unrelated and still-supported canopy is excluded.
const retainedLogDistance = async (start) => {
  const visited = new Set([cellKey(start)]);
  const queue = [{ cell: start, leafDistance: 0 }];
  while (queue.length) {
    const { cell, leafDistance } = queue.shift();
    if (leafDistance >= 6) continue;
    for (const [dx, dy, dz] of LEAF_DIRECTIONS) {
      const neighbour = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
      const key = cellKey(neighbour);
      if (pavementSourceTargetKeys.has(key) || visited.has(key)) continue;
      const sourceState = await sourceStateAt(neighbour);
      if (isLeafSupportLog(sourceState)) return leafDistance + 1;
      if (!isLeaf(sourceState)) continue;
      visited.add(key);
      queue.push({ cell: neighbour, leafDistance: leafDistance + 1 });
    }
  }
  return 7;
};
const leafDependencyByCell = new Map();
const leafRiskProof = [];
for (const [key, record] of removalInfluencedLeaves) {
  const currentDistance = Number(stateProperty(record.sourceState, 'distance'));
  const persistent = stateProperty(record.sourceState, 'persistent');
  const projectedDistance = await retainedLogDistance(record.cell);
  if (persistent !== 'false' || !Number.isInteger(currentDistance)
    || currentDistance >= 7 || projectedDistance < 7) continue;
  const targetState = record.sourceState.replace('persistent=false', 'persistent=true');
  invariant(blockName(targetState) === blockName(record.sourceState)
    && stateProperty(targetState, 'persistent') === 'true'
    && targetState.replace('persistent=true', 'persistent=false') === record.sourceState,
  `leaf dependency is not an exact property-only inverse at ${key}`);
  leafDependencyByCell.set(key, {
    cell: record.cell,
    sourceState: record.sourceState,
    targetState,
    reasons: ['r11c-owned-log-removal-projected-distance-seven'],
  });
  leafRiskProof.push({
    cell: record.cell,
    sourceState: record.sourceState,
    removalDistance: record.removalDistance,
    currentDistance,
    projectedDistance,
    exactOwnedLogRemovalCount: ownedLogRemovals.length,
  });
}
const leafStabilizationRecords = [...leafDependencyByCell.values()];
const stabilizationRecords = [
  ...gravityStabilizationRecords,
  ...leafStabilizationRecords,
];
const stabilizationKeys = new Set(stabilizationRecords.map(({ cell }) => cellKey(cell)));
invariant(ownedLogRemovals.length === EXPECTED.ownedLogRemovalCellCount
  && hashCells(ownedLogRemovals.map(({ cell }) => cell))
    === EXPECTED.ownedLogRemovalCoordinateSetSha256
  && removalInfluencedLeaves.size === EXPECTED.removalInfluencedLeafCellCount
  && hashCells([...removalInfluencedLeaves.values()].map(({ cell }) => cell))
    === EXPECTED.removalInfluencedLeafCoordinateSetSha256
  && leafRiskProof.length === EXPECTED.leafStabilizationCellCount
  && leafStabilizationRecords.length === EXPECTED.leafStabilizationCellCount
  && hashCells(leafStabilizationRecords.map(({ cell }) => cell))
    === EXPECTED.leafStabilizationCoordinateSetSha256
  && stabilizationRecords.length === EXPECTED.stabilizationCellCount
  && hashCells(stabilizationRecords.map(({ cell }) => cell))
    === EXPECTED.stabilizationCoordinateSetSha256,
`east highway retained-leaf dependency closure drifted: ${JSON.stringify({
  ownedLogRemovals: classManifest(ownedLogRemovals.map(({ cell }) => cell)),
  woodyTargets: classManifest(woodyTargets.map(({ cell }) => cell)),
  removalInfluencedLeaves: classManifest([...removalInfluencedLeaves.values()].map(({ cell }) => cell)),
  leafStabilization: classManifest(leafStabilizationRecords.map(({ cell }) => cell)),
  dependencyStabilization: classManifest(stabilizationRecords.map(({ cell }) => cell)),
})}`);

const pavementForwardRecords = [...headroomRecords, ...foundationRecords, ...surfaceRecords];
const forwardRecords = [...stabilizationRecords, ...pavementForwardRecords];
const operatedCells = uniqueCells(forwardRecords.map(({ cell }) => cell));
invariant(operatedCells.length === EXPECTED.operatedCellCount
  && hashCells(operatedCells) === EXPECTED.operatedCoordinateSetSha256,
`operated union identity drifted: ${JSON.stringify(classManifest(operatedCells))}`);
const operatedKeys = new Set(operatedCells.map(cellKey));
const r11aFunctionalEnvelopeIntersections = operatedCells.filter((cell) => (
  r11aFunctionalKeys.has(cellKey(cell))
));
invariant(r11aFunctionalEnvelopeIntersections.length === 0,
  `operated union intersects accepted R11A surface/headroom/support: ${JSON.stringify(r11aFunctionalEnvelopeIntersections)}`);

const halo = uniqueCells(operatedCells.flatMap((cell) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
      }
    }
  }
  return cells;
}));
const haloBounds = boundsOf(halo);
const fluidHaloIntersections = [];
const forbiddenHaloIntersections = [];
const gravityHaloRecords = [];
for (const cell of halo) {
  const sourceState = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  const name = blockName(sourceState);
  if (isFluid(sourceState)) fluidHaloIntersections.push({ cell, sourceState });
  if (FORBIDDEN_SOURCE_BLOCKS.has(name)) forbiddenHaloIntersections.push({ cell, sourceState });
  if (GRAVITY_BLOCKS.has(name)) gravityHaloRecords.push({ cell, sourceState });
}
invariant(fluidHaloIntersections.length === 0,
  `fluid state exists in the exact interaction halo: ${JSON.stringify(fluidHaloIntersections.slice(0, 20))}`);
invariant(forbiddenHaloIntersections.length === 0,
  `container/control state exists in the exact interaction halo: ${JSON.stringify(forbiddenHaloIntersections.slice(0, 20))}`);
const unsupportedGravityKinds = gravityHaloRecords.filter(({ sourceState }) => (
  blockName(sourceState) !== 'minecraft:gravel'
));
invariant(unsupportedGravityKinds.length === 0,
  `non-gravel gravity hazard exists in the exact interaction halo: ${JSON.stringify(unsupportedGravityKinds.slice(0, 20))}`);

const pavementTargetsByCell = new Map(pavementForwardRecords.map((record) => [
  cellKey(record.cell), record.targetState,
]));
const stabilizationTargetsByCell = new Map(stabilizationRecords.map((record) => [
  cellKey(record.cell), record.targetState,
]));
const projectedState = async (cell) => {
  const key = cellKey(cell);
  if (pavementTargetsByCell.has(key)) return pavementTargetsByCell.get(key);
  if (stabilizationTargetsByCell.has(key)) return stabilizationTargetsByCell.get(key);
  return stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
};
const residualGravityRecords = gravityHaloRecords.filter(({ cell }) => (
  !stabilizationKeys.has(cellKey(cell))
));
const residualGravitySupportProof = [];
for (const record of residualGravityRecords) {
  invariant(!operatedKeys.has(cellKey(record.cell)),
    `residual gravel is touched by the release at ${cellKey(record.cell)}`);
  let support = { x: record.cell.x, y: record.cell.y - 1, z: record.cell.z };
  let supportState = await projectedState(support);
  let gravityDepth = 0;
  while (GRAVITY_BLOCKS.has(blockName(supportState))) {
    invariant(blockName(supportState) === 'minecraft:gravel',
      `residual gravel support chain reaches non-gravel gravity at ${cellKey(support)}`);
    gravityDepth += 1;
    invariant(gravityDepth <= 384, `unterminated gravel support chain at ${cellKey(record.cell)}`);
    support = { x: support.x, y: support.y - 1, z: support.z };
    supportState = await projectedState(support);
  }
  invariant(!isAir(supportState) && !isFluid(supportState)
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(supportState)),
  `residual gravel is not stably supported at ${cellKey(record.cell)} by ${cellKey(support)} ${supportState}`);
  residualGravitySupportProof.push({
    cell: record.cell,
    sourceState: record.sourceState,
    terminalSupportCell: support,
    terminalSupportState: supportState,
    interveningGravelCellCount: gravityDepth,
  });
}

const c01HaloIntersections = c1.interfaces.c01.flatMap((entry) => {
  const cells = halo.filter((cell) => inside2d(cell, entry.extent));
  return cells.length ? [{ feature: entry.feature, ...classManifest(cells) }] : [];
});
invariant(c01HaloIntersections.length === 0,
'interaction halo intersects a default-deny C01 extent');
const dataDistrict = c1.interfaces.dataDistrictCrossroad;
invariant(halo.every((cell) => cell.x !== dataDistrict.authoredCrossroadX),
'interaction halo reaches the Data District crossroad plane');

function selectedOffsetColumns(offsetFrom, offsetTo) {
  const result = new Map();
  for (let station = START_STATION; station <= END_STATION; station += 1) {
    const reference = stations[station];
    const tangent = tangentAt(stations, station);
    for (let offset = offsetFrom; offset <= offsetTo; offset += 1) {
      const point = offsetPoint(reference, tangent, offset);
      if (!result.has(`${point.x},${point.z}`)) result.set(`${point.x},${point.z}`, point);
    }
  }
  return [...result.values()];
}
const railReserveColumns = selectedOffsetColumns(-30, -18);
const railDrainColumns = selectedOffsetColumns(-30, -29);
const utilityColumns = selectedOffsetColumns(15, 17);
const roadDrainColumns = selectedOffsetColumns(18, 19);
const dependencyInterfaceIntersections = {};
const pavementInterfaceIntersections = {};
for (const [name, columns] of [
  ['rail reserve', railReserveColumns],
  ['rail collection', railDrainColumns],
  ['utility reserve', utilityColumns],
  ['road collection', roadDrainColumns],
]) {
  const columnKeys = new Set(columns.map(({ x, z }) => `${x},${z}`));
  pavementInterfaceIntersections[name] = pavementForwardRecords.filter(
    ({ cell: { x, z } }) => columnKeys.has(`${x},${z}`),
  );
  dependencyInterfaceIntersections[name] = leafStabilizationRecords.filter(
    ({ cell: { x, z } }) => columnKeys.has(`${x},${z}`),
  );
}
invariant(Object.values(pavementInterfaceIntersections).every((records) => records.length === 0),
`pavement/foundation/headroom plan intersects reserved columns: ${JSON.stringify(
  Object.fromEntries(Object.entries(pavementInterfaceIntersections).map(([name, records]) => [
    name,
    { ...classManifest(records.map(({ cell }) => cell)), records: records.slice(0, 30) },
  ])),
)}`);
const dependencyInterfaceCounts = {
  railReserve: dependencyInterfaceIntersections['rail reserve'].length,
  railCollection: dependencyInterfaceIntersections['rail collection'].length,
  utilityReserve: dependencyInterfaceIntersections['utility reserve'].length,
  roadCollection: dependencyInterfaceIntersections['road collection'].length,
};
invariant(JSON.stringify(dependencyInterfaceCounts)
    === JSON.stringify(EXPECTED.leafDependencyInterfaceIntersections),
`retained-leaf property-only interface projection drifted: ${JSON.stringify(
  dependencyInterfaceCounts,
)}`);

const touchedChunks = [];
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    touchedChunks.push({ x: cx, z: cz });
  }
}
const blockEntityHaloIntersections = [];
const savedEntityHaloIntersections = [];
for (const chunkPoint of touchedChunks) {
  const chunk = await reader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (inside3d(point, haloBounds)) blockEntityHaloIntersections.push({ id: entity.id, point });
  }
  const entityChunk = await entityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entityChunk?.Entities ?? []) {
    if (savedEntityInside(entity, haloBounds)) {
      savedEntityHaloIntersections.push({
        id: entity.id ?? null,
        position: entity.Pos.slice(0, 3).map(Number),
      });
    }
  }
}
invariant(blockEntityHaloIntersections.length === 0,
'interaction halo intersects a block entity');
invariant(savedEntityHaloIntersections.length === 0,
'interaction halo intersects a saved movable entity');

const protectedRelicHaloIntersections = protectedRelics.relics.flatMap((relic) => {
  const cells = halo.filter((cell) => inside3d(cell, relic.declaredInclusiveBounds));
  return cells.length ? [{ relic: relic.key, ...classManifest(cells) }] : [];
});
invariant(protectedRelicHaloIntersections.length === 0,
'interaction halo intersects a protected relic core');

const priorReleaseIntersections = [];
const operatedBounds = boundsOf(operatedCells);
for (const manifestPath of INPUTS.priorManifests) {
  const manifest = readJson(manifestPath);
  for (const pkg of manifest.packages) {
    const declaredHash = manifest.operations?.[pkg.key]?.forwardSha256;
    if (declaredHash) {
      invariant(sha256(operationBody(pkg.forward)) === declaredHash,
        `${manifest.transactionId}/${pkg.key} operation body drifted`);
    }
    const cells = priorOperationIntersections(pkg.forward, operatedKeys, operatedBounds);
    if (cells.length) priorReleaseIntersections.push({
      packageId: `${manifest.transactionId}/${pkg.key}`,
      ...classManifest(cells),
    });
  }
}
invariant(priorReleaseIntersections.length === 0,
  `R11C intersects a prior release: ${JSON.stringify(priorReleaseIntersections)}`);

// The new surface and its accepted R11A union are each exactly one connected
// 26-neighbour component. Every cross-release seam pair steps by at most one.
const surfaceComponentCount = componentCount(surface);
const combinedSurfaceComponentCount = componentCount(combinedSurface);
const seamWestCells = uniqueCells(seamPairs.map(({ west }) => west));
const seamEastCells = uniqueCells(seamPairs.map(({ east }) => east));
const seamComponentCount = componentCount([...seamWestCells, ...seamEastCells]);
const seamMaximumVerticalStep = Math.max(...seamPairs.map(({ west, east }) => (
  Math.abs(west.y - east.y)
)));
invariant(combinedSurfaceComponentCount === 1 && seamMaximumVerticalStep <= 1,
  'R11A seam is not one connected, step-safe surface');
invariant(seamPairs.length === EXPECTED.seamAdjacentPairCount
  && seamComponentCount === EXPECTED.seamComponentCount,
`R11A seam identity drifted: ${JSON.stringify({
  adjacentPairCount: seamPairs.length,
  seamComponentCount,
  west: classManifest(seamWestCells),
  east: classManifest(seamEastCells),
})}`);

const pavementForwardBody = `${pavementForwardRecords.map(({ cell, sourceState, targetState }) => (
  replLine(cell, sourceState, targetState)
)).join('\n')}\n`;
const pavementRollbackRecords = pavementForwardRecords.slice().reverse().map((record) => ({
  cell: record.cell,
  sourceState: record.targetState,
  targetState: record.sourceState,
}));
const pavementRollbackBody = `${pavementRollbackRecords.map(({ cell, sourceState, targetState }) => (
  replLine(cell, sourceState, targetState)
)).join('\n')}\n`;
const pavementForwardSha256 = sha256(pavementForwardBody);
const pavementRollbackSha256 = sha256(pavementRollbackBody);
const pavementForward = path.join(OUT_DIR, `${BASENAME}.${PAVEMENT_KEY}.forward.txt`);
const pavementRollback = path.join(OUT_DIR, `${BASENAME}.${PAVEMENT_KEY}.rollback.txt`);
const header = (role, operationSha256, targetCoordinateSetSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# target coordinate-set SHA-256: ${targetCoordinateSetSha256}`,
  `# operation SHA-256: ${operationSha256}`,
  '',
].join('\n');

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const pavementTargetHash = hashCells(pavementForwardRecords.map(({ cell }) => cell));
fs.writeFileSync(absolute(pavementForward), `${header(
  `${PAVEMENT_KEY} forward`, pavementForwardSha256, pavementTargetHash,
)}${pavementForwardBody}`);
fs.writeFileSync(absolute(pavementRollback), `${header(
  `${PAVEMENT_KEY} rollback`, pavementRollbackSha256, pavementTargetHash,
)}${pavementRollbackBody}`);

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const shoulderCells = surfaceRecords.filter(({ targetState }) => targetState === 'minecraft:smooth_stone').map(({ cell }) => cell);
const medianCells = surfaceRecords.filter(({ targetState }) => targetState === 'minecraft:yellow_concrete').map(({ cell }) => cell);
const carriagewayCells = surfaceRecords.filter(({ targetState }) => targetState === 'minecraft:gray_concrete').map(({ cell }) => cell);
invariant(shoulderCells.length === EXPECTED.shoulderCellCount
  && medianCells.length === EXPECTED.medianCellCount
  && carriagewayCells.length === EXPECTED.grayCellCount,
`material partition drifted: ${JSON.stringify({
  shoulderCellCount: shoulderCells.length,
  medianCellCount: medianCells.length,
  grayCellCount: carriagewayCells.length,
})}`);
const pavementTargetKeys = new Set(pavementForwardRecords.map(({ cell }) => cellKey(cell)));
const orderedPackageOverlap = stabilizationRecords.filter(({ cell }) => (
  pavementTargetKeys.has(cellKey(cell))
));
const finalTargetsByCell = new Map();
for (const record of forwardRecords) finalTargetsByCell.set(cellKey(record.cell), record);
const finalTargetRecords = [...finalTargetsByCell.values()];

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R08P_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['C1-HIGHWAY'],
  packages: [
    {
      key: PAVEMENT_KEY,
      forward: pavementForward,
      rollback: pavementRollback,
    },
  ],
  executionOrder: {
    forward: [PAVEMENT_KEY],
    rollback: [PAVEMENT_KEY],
    rationale: 'The exact source-bound gravity and retained-leaf audits require zero dependency transitions, so pavement/headroom/foundation executes as one exact package and rolls back through its record-reversed inverse.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'C1-HIGHWAY',
    purpose: 'Materialize the complete contiguous usable 24-station at-grade C1 highway run immediately east of R11A while preserving exact R11A/R11B envelopes and local frozen-plan exceptions.',
    stations: {
      start: START_STATION,
      end: END_STATION,
      count: selectedStations.length,
      treatment: 'AT_GRADE_COORDINATION_PASS',
      startReference: { x: selectedStations[0].x, z: selectedStations[0].z },
      endReference: { x: selectedStations.at(-1).x, z: selectedStations.at(-1).z },
    },
    geometry: {
      fullFrozenCrossSectionCandidate: classManifest(candidateSurface),
      inheritedAcceptedR11ASurface: classManifest(inheritedR11ASurface),
      inheritedAcceptedR11AHeadroom: classManifest(candidateR11AHeadroomOverlap),
      inheritedAcceptedR11ASupport: classManifest(candidateR11ASupportOverlap),
      inheritedAcceptedR11AFunctionalEnvelope: classManifest(inheritedR11AFunctionalCells),
      inheritedAcceptedR11AEnvelopeConflict:
        classManifest(r11aEnvelopeConflictCandidate),
      inheritedAcceptedR11BEnvelopeConflict:
        classManifest(r11bEnvelopeConflictCandidate),
      preservedUtilityReservationConflict:
        classManifest(utilityReservationConflictCandidate),
      preservedGradeShadowedDisconnectedCandidate:
        classManifest(r11aGradeShadowedDisconnectedCandidate),
      preservedIntrinsicNineCellGradeShadow:
        classManifest(intrinsicGradeShadowedDisconnectedCandidate),
      preservedR11BEnvelopeInducedGradeShadow:
        classManifest(r11bInducedGradeShadowedDisconnectedCandidate),
      intrinsicGradeShadowNowPreservedByR11BEnvelope:
        classManifest(intrinsicGradeNowPreservedByR11BEnvelope),
      intrinsicGradeShadowRemainingAfterR11BEnvelope:
        classManifest(intrinsicGradeRemainingInFinalShadow),
      preservedCandidateExceptions: classManifest(preservedCandidateExceptions),
      completeCandidatePartition: classManifest(completeCandidatePartition),
      pavementSurface: classManifest(surface),
      carriageway: classManifest(carriagewayCells),
      outerShoulders: classManifest(shoulderCells),
      medianSurface: classManifest(medianCells),
      exactHeadroomCuts: classManifest(headroomRecords.map(({ cell }) => cell)),
      fullTwoBlockHeadroom: classManifest(fullHeadroomCells),
      sourceAlreadyAirHeadroom: classManifest(sourceAlreadyAirHeadroomCells),
      exactFoundationFill: classManifest(foundationRecords.map(({ cell }) => cell)),
      exactGravityStabilization: {
        ...classManifest(gravityStabilizationRecords.map(({ cell }) => cell)),
        sourceStateCensus: census(gravityStabilizationRecords, 'sourceState'),
        targetStateCensus: census(gravityStabilizationRecords, 'targetState'),
        reasonCensus: Object.fromEntries([...gravityStabilizationRecords.flatMap(({ reasons }) => reasons)
          .reduce((result, reason) => result.set(reason, (result.get(reason) ?? 0) + 1), new Map())
          .entries()].sort()),
      },
      retainedLeafDecayAudit: {
        method: 'Six-face traversal seeded only by exact R11C-owned log removals; remove every pavement target from the projected leaf/log graph; admit a property-only transition only for an exact nonpersistent source leaf with current distance below seven and no retained log within six leaf steps.',
        ownedLogRemovals: classManifest(ownedLogRemovals.map(({ cell }) => cell)),
        removalInfluencedRetainedLeaves:
          classManifest([...removalInfluencedLeaves.values()].map(({ cell }) => cell)),
        provenDecayRisk: classManifest(leafRiskProof.map(({ cell }) => cell)),
        requiredPropertyOnlyTransitions:
          classManifest(leafStabilizationRecords.map(({ cell }) => cell)),
        unrelatedCanopyTransitionCount: 0,
        exactSourceBound: true,
      },
      operatedUnion: classManifest(operatedCells),
      stableFoundationContacts: {
        ...classManifest(supportRecords.map(({ cell }) => cell)),
        sourceStateCensus: census(supportRecords, 'sourceState'),
        unsupportedCellCount: supportViolations.length,
      },
      interactionHalo: classManifest(halo),
      connectedSurfaceComponentCount: combinedSurfaceComponentCount,
      newTargetComponentCountBeforeAcceptedR11AFill: surfaceComponentCount,
      r11aSeam: {
        acceptedSurface: classManifest(r11aSurface),
        acceptedSurfaceExactTargetStateCount: r11aSurface.length,
        acceptedFullHeadroom: classManifest(r11aFullHeadroom),
        acceptedFullHeadroomAirStateCount: r11aFullHeadroom.length,
        westSeamCells: classManifest(seamWestCells),
        eastSeamCells: classManifest(seamEastCells),
        adjacentPairCount: seamPairs.length,
        seamComponentCount,
        maximumVerticalStep: seamMaximumVerticalStep,
        combinedSurfaceComponentCount,
      },
    },
    materialDoctrine: {
      carriageway: 'minecraft:gray_concrete',
      outerShoulders: 'minecraft:smooth_stone',
      medianSurface: 'minecraft:yellow_concrete',
      precedent: INPUTS.materialPrecedent,
      note: 'Surface/foundation/headroom completion only. Exact projected audits require zero gravity or leaf-property transitions; barriers, lighting, signing, drainage, rail, utilities, and route commissioning remain later disjoint packages.',
    },
    sourcePartition: {
      surfaceSourceStateCensus: census(sourceSurfaceRecords, 'sourceState'),
      dependencyTransitionSourceStateCensus: census(stabilizationRecords, 'sourceState'),
      foundationSourceStateCensus: census(foundationRecords, 'sourceState'),
      headroomSourceStateCensus: census([...headroomRecordsByCell.values()], 'sourceState'),
      finalDesiredStateCensus: census(finalTargetRecords, 'targetState'),
      operated: classManifest(operatedCells),
      alreadyTarget: classManifest([]),
      orderedTransitionCount: forwardRecords.length,
      orderedOverlap: classManifest(orderedPackageOverlap.map(({ cell }) => cell)),
      exactPartition: forwardRecords.length
        === operatedCells.length + orderedPackageOverlap.length,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT,
    sourceLedgerPath: INPUTS.sourceLedger,
    sourceLedgerCompletedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
    intakeStatus: intake.status,
    touchedChunkCount: touchedChunks.length,
  },
  target: {
    operatedUnion: classManifest(operatedCells),
    desiredStateCensus: census(finalTargetRecords, 'targetState'),
    packageTargetsDisjoint: orderedPackageOverlap.length === 0,
    declaredOrderedOverlap: classManifest(orderedPackageOverlap.map(({ cell }) => cell)),
  },
  operations: {
    [PAVEMENT_KEY]: {
      forwardSha256: pavementForwardSha256,
      rollbackSha256: pavementRollbackSha256,
      forwardCommandCount: pavementForwardRecords.length,
      rollbackCommandCount: pavementRollbackRecords.length,
      targetCellCount: pavementForwardRecords.length,
      targetCoordinateSetSha256: pavementTargetHash,
      exactInverse: true,
    },
    ordering: 'One exact forward package clears two-block route headroom and installs foundations/pavement; its rollback is the exact record-reversed inverse. Dependency audits require zero separate transitions.',
  },
  isolation: {
    fluidHaloIntersectionCount: fluidHaloIntersections.length,
    gravityHaloIntersectionCount: gravityHaloRecords.length,
    declaredGravityStabilizationCount: gravityStabilizationRecords.length,
    ownedLogRemovalCount: ownedLogRemovals.length,
    retainedLeafRemovalInfluenceCount: removalInfluencedLeaves.size,
    retainedLeafProvenDecayRiskCount: leafRiskProof.length,
    declaredLeafPropertyTransitionCount: leafStabilizationRecords.length,
    residualStableUntouchedGravityCount: residualGravityRecords.length,
    residualGravitySupportProof: {
      ...classManifest(residualGravityRecords.map(({ cell }) => cell)),
      proofEntryCount: residualGravitySupportProof.length,
      maximumInterveningGravelDepth: Math.max(
        0, ...residualGravitySupportProof.map(({ interveningGravelCellCount }) => (
          interveningGravelCellCount
        )),
      ),
      unsupportedCount: 0,
      touchedCount: 0,
    },
    unresolvedGravityHazardCount: 0,
    unsupportedGravityKindCount: unsupportedGravityKinds.length,
    forbiddenContainerOrControlHaloCount: forbiddenHaloIntersections.length,
    blockEntityHaloIntersectionCount: blockEntityHaloIntersections.length,
    savedEntityHaloIntersectionCount: savedEntityHaloIntersections.length,
    protectedRelicHaloIntersectionCount: protectedRelicHaloIntersections.length,
    c01DefaultDenyHaloIntersectionCount: c01HaloIntersections.length,
    dataDistrictCrossroadHaloIntersectionCount: 0,
    railReserveOperatedPlanIntersectionCount: 0,
    railCollectionOperatedPlanIntersectionCount: 0,
    utilityReserveOperatedPlanIntersectionCount: 0,
    roadCollectionOperatedPlanIntersectionCount: 0,
    woodyOperatedSourceCount: woodyTargets.length,
    priorReleaseIntersections,
    undeclaredPriorReleaseIntersectionCount: priorReleaseIntersections.length,
  },
  compileGuards: {
    exactC1RasterIdentity: EXPECTED.c1ReferenceRasterSha256,
    exactHighwayCrossSectionIdentity: EXPECTED.highwayColumnSetSha256,
    selectedTreatmentViolationCount: 0,
    unexpectedTargetStateViolationCount: 0,
    unstableFoundationViolationCount: supportViolations.length,
    fluidHaloViolationCount: fluidHaloIntersections.length,
    gravityDependencyClosureMissingCount: 0,
    residualGravityUnsupportedCount: 0,
    residualGravityTouchedCount: 0,
    unsupportedGravityKindViolationCount: unsupportedGravityKinds.length,
    forbiddenContainerOrControlHaloViolationCount: forbiddenHaloIntersections.length,
    blockEntityHaloViolationCount: blockEntityHaloIntersections.length,
    savedEntityHaloViolationCount: savedEntityHaloIntersections.length,
    protectedRelicHaloViolationCount: protectedRelicHaloIntersections.length,
    c01DefaultDenyHaloViolationCount: c01HaloIntersections.length,
    priorReleaseViolationCount: priorReleaseIntersections.length,
    r11aSurfaceTargetStateViolationCount: r11aSurfaceStateViolations.length,
    r11aHeadroomAirStateViolationCount: r11aHeadroomStateViolations.length,
    r11aInheritedSurfaceCellCount: inheritedR11ASurface.length,
    r11aInheritedHeadroomCellCount: candidateR11AHeadroomOverlap.length,
    r11aInheritedSupportCellCount: candidateR11ASupportOverlap.length,
    r11bPreservedEnvelopeConflictCellCount: r11bEnvelopeConflictCandidate.length,
    utilityReservationPreservedConflictCellCount: utilityReservationConflictCandidate.length,
    r11aGradeShadowedDisconnectedCandidateCellCount:
      r11aGradeShadowedDisconnectedCandidate.length,
    preservedCandidateExceptionCellCount: preservedCandidateExceptions.length,
    completeCandidatePartitionCellCount: completeCandidatePartition.length,
    r11aFunctionalEnvelopeIntersectionCount: r11aFunctionalEnvelopeIntersections.length,
    undeclaredR11aTargetOverlapCount: 0,
    r11aSeamMaximumVerticalStep: seamMaximumVerticalStep,
    r11aCombinedSurfaceComponentCount: combinedSurfaceComponentCount,
  },
  standingAuthorization: {
    path: INPUTS.standingAuthorization,
    sha256: sha256(fs.readFileSync(absolute(INPUTS.standingAuthorization))),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
  },
  upstreamIdentities: {
    c1DesignPath: INPUTS.c1Design,
    c1DesignSha256: sha256(fs.readFileSync(absolute(INPUTS.c1Design))),
    releaseContractPath: INPUTS.releaseContract,
    releaseContractIdentity: releaseContract.contractIdentitySha256,
    materialPrecedentPath: INPUTS.materialPrecedent,
    materialPrecedentSha256: sha256(fs.readFileSync(absolute(INPUTS.materialPrecedent))),
  },
  hardSafetyKernelNext: [
    'independent manifest and exact-inverse QA',
    'fresh same-invocation complete-save capture',
    'exact source preflight and strict-noop forward/rollback parser checks',
    'fresh block-entity and same-moment live-entity clearance',
    'journaled strict-noop execution',
    'fresh post snapshot, exact pavement/headroom QA, and rollback post-state preflight',
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
  releaseNodeId: RELEASE_NODE_ID,
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  stationRange: [START_STATION, END_STATION],
  surfaceCellCount: surface.length,
  stabilizationCellCount: stabilizationRecords.length,
  headroomClearCellCount: headroomRecords.length,
  foundationCellCount: foundationRecords.length,
  targetCellCount: operatedCells.length,
  orderedTransitionCount: forwardRecords.length,
  surfaceSourceStateCensus: census(sourceSurfaceRecords, 'sourceState'),
  finalDesiredStateCensus: census(finalTargetRecords, 'targetState'),
  interactionHaloCellCount: halo.length,
  fluidHaloIntersectionCount: fluidHaloIntersections.length,
  gravityHaloIntersectionCount: gravityHaloRecords.length,
  residualStableUntouchedGravityCount: residualGravityRecords.length,
  unresolvedGravityHazardCount: 0,
  blockEntityHaloIntersectionCount: 0,
  savedEntityHaloIntersectionCount: 0,
  protectedRelicHaloIntersectionCount: 0,
  c01DefaultDenyHaloIntersectionCount: 0,
  priorReleaseIntersectionCount: 0,
  r11aSeamAdjacentPairCount: seamPairs.length,
  r11aSeamMaximumVerticalStep: seamMaximumVerticalStep,
  pavementForward,
  pavementRollback,
  pavementForwardSha256,
  pavementRollbackSha256,
}, null, 2));
