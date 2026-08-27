#!/usr/bin/env node
/**
 * Compile CZ-R07F: first bounded lower B09 guideway framework segment.
 *
 * The package extends the accepted lower-station interior through its exact
 * two-cell internal east seam into 15 blocks of straight level guideway. It
 * builds a static polished-diorite shell and a complete far cap. The B08 and
 * Z11 external interfaces remain untouched and closed. No rail, vehicle,
 * power, control, drainage, rescue, or egress system is commissioned.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  buildB09MinimumReservation,
  cellKey,
  cellsIn,
  dilateCells,
  hashCells,
  mountainSurfaceY,
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

const GENERATED_AT = value('--generated-at', '2026-08-21T17:18:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r08h-liner-post-20260821T171000Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r08h-liner-live-20260821T171000Z/post-complete-save-intake.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r07f-b09-lower-guideway-segment-01';
const RELEASE_ID = 'CZ-R07F-P1-B09-LOWER-GUIDEWAY-SEGMENT-01';
const RELEASE_NODE_ID = 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK';
const PACKAGE_KEY = 'b09-lower-guideway-segment-01';
const AIR_STATE = 'minecraft:air';
const SHELL_STATE = 'minecraft:polished_diorite';
const FIRST_CENTERLINE_INDEX = 9;
const LAST_CENTERLINE_INDEX = 24;

const INPUTS = Object.freeze({
  b09Technical:
    'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  connectorGeometry:
    'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05Alternatives:
    'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  protectedRelics:
    'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization:
    'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  r07dManifest:
    'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
  r07eManifest:
    'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
  r07eQa:
    'data/world-review/combined-zones-r07e-live-20260821T170500Z/r07e-post-release-qa.json',
  sourceLedger:
    'data/world-review/combined-zones-r08h-liner-live-20260821T171000Z/evidence-ledger.json',
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
    'data/buildops/combined-zones-r08-empty-eight-platform-02-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-03-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-04-wet-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-04-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-06-dynamic-fluid-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-07-wet-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-07-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-08-fitout.release-manifest.json',
    'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
    'data/buildops/combined-zones-r10-cheyenne-secure-gallery.release-manifest.json',
    'data/buildops/combined-zones-r11a-c1-east-highway-pilot.release-manifest.json',
  ],
});

const EXPECTED = Object.freeze({
  sourceCompleteSaveSha256:
    '086f1c2add1074fddff040b5f425563806dbba07a7d8af5d56827aab10b0bbde',
  sourceRegionSha256:
    'd2ae86f16d494453b543ed6d3dd94bf96173ff8b5e2d104989e439877a673cbd',
  sourceLedgerSha256:
    '9f1d8f5f35eb523781e98fa2b0a4e027653a901945107d2887d6ed419e5bbe7d',
  sourceCompletedReleaseIdentitySha256:
    'da8f714258d7b1d3254c2c2d408cdee930c4dcac4f3ce73cec3602607efbc6f3',
  r07eQaPayloadSha256:
    '53d4fce9b5e1dd658655ee364cdf50a6b56922e322e2b2174a5f1d732268943d',
  r07eCompletedReleaseIdentitySha256:
    '8ad00954eff48a4d6d5f7b2acb0505bed9169d07ad8c6214818106faec67e953',
  b09TechnicalIdentitySha256:
    'e8738f3932f2afc3ba71e35ccdebf0d5ef444ca7389e81ec31a18e48517d3eba',
  selectedModelIdentitySha256:
    '735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6',
  centerlinePointCount: 561,
  orderedCenterlineSha256:
    'e8905742a77148d13d799362da7d65e9b02bcf96455d580fbee27367b2d24221',
  accommodationCellCount: 7800,
  accommodationSha256:
    'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  accommodationStateSha256:
    'a84911a9e54009f6d3ad4e4f6792c4ff60ee0b9fc8a068d9453f25f1c3e98846',
  lowerStationCellCount: 132,
  lowerStationSha256:
    'd13426cafb5f9cb53de702653532111ef18588af1c28c0f3d8e7cb2956e0801b',
  rawSegmentEnvelopeCellCount: 216,
  rawSegmentEnvelopeSha256:
    'feab1c45f651f62e484c057a67c05b16091d0af4a2f7cb9afd1fb44d71802a8b',
  newSegmentEnvelopeCellCount: 192,
  newSegmentEnvelopeSha256:
    'd2032cd4a66d1eee3175c498298152002ebea974aadf233a78200d3c7e3daa7a',
  segmentInteriorCellCount: 30,
  segmentInteriorSha256:
    '76a52547e89698734a8c1175244a4e5069df7b0e1afb9f9de18a2c965bf52f25',
  segmentShellCellCount: 162,
  segmentShellSha256:
    '7cb64c9af7d0f37695b9a4c30f888bfe373eb315bec4d9530ab915674a567ea6',
  seamCellCount: 2,
  seamSha256:
    '5b6a8c096adadbbd5a5ed0399678c87aed1fa5db20b89adeb8289745f693a75e',
  operatedCellCount: 164,
  operatedSha256:
    '2d0ac7f21afb5835112b47f3fba677939a4d4d2617f497cfe284cc0d11beed96',
  farCapCellCount: 12,
  farCapSha256:
    'ffbb546fae81114f50226ac6042fe75d9f057b3543cd3887f10ebbdfcefef333',
  nearCapRemainderCellCount: 10,
  nearCapRemainderSha256:
    '7065c9fc48e7c9c69a69428e9c25a3cc2a46ef4b599f4939c017a79a63b7dae9',
  connectedVoidCellCount: 44,
  connectedVoidSha256:
    '5eedb05ad65d442f00c56caa04d37f5e29838bd4006df577605a1b6dcc4563e5',
  connectedVoidBoundaryCellCount: 136,
  connectedVoidBoundarySha256:
    '0eb5742bd6dbb6a11959dbe79b5b714a40a575bc69d53a756d54afbebe849697',
  b08PortalSeamCellCount: 36,
  b08PortalSeamSha256:
    'b28a975b44296fc43739a8af0743066ca58a2c33a99e13da6c2edf89142b33e3',
  summitInterfaceCapCellCount: 12,
  summitInterfaceCapSha256:
    'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
});

const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];
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
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:ender_chest',
  'minecraft:barrel', 'minecraft:furnace', 'minecraft:blast_furnace',
  'minecraft:smoker', 'minecraft:hopper', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:shulker_box', 'minecraft:spawner',
  'minecraft:lectern', 'minecraft:brewing_stand', 'minecraft:beacon',
  'minecraft:jukebox', 'minecraft:beehive', 'minecraft:bee_nest',
  'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf',
  'minecraft:crafter', 'minecraft:command_block',
  'minecraft:chain_command_block', 'minecraft:repeating_command_block',
  'minecraft:structure_block',
]);

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R07F B09 guideway compiler rejected: ${message}`);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => (
  FLUID_BLOCKS.has(blockName(state)) || state.includes('waterlogged=true')
);
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const difference = (left, right) => {
  const excluded = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => !excluded.has(cellKey(cell))));
};
const intersection = (left, right) => {
  const included = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => included.has(cellKey(cell))));
};
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});

function operationBody(filename) {
  return `${fs.readFileSync(absolute(filename), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
}

function stateCensus(records) {
  const census = new Map();
  for (const { state } of records) census.set(state, (census.get(state) ?? 0) + 1);
  return Object.fromEntries([...census.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

function stateSetSha256(records) {
  return sha256(`combined-zones-current-block-state-set-v1\n${records.slice()
    .sort((left, right) => (
      left.cell.x - right.cell.x || left.cell.y - right.cell.y || left.cell.z - right.cell.z
    ))
    .map(({ cell, state }) => `${cellKey(cell)}=${state}`)
    .join('\n')}\n`);
}

function orderedCenterlineSha256(points) {
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-ordered-centerline-v1\n');
  for (const point of points) {
    digest.update(`${point.index}:${point.x},${point.y},${point.z}:${point.kind}\n`);
  }
  return digest.digest('hex');
}

function direction(from, to) {
  return { x: Math.sign(to.x - from.x), z: Math.sign(to.z - from.z) };
}

function buildCenterline(model, endpoints) {
  const portal = endpoints.from;
  const summit = endpoints.to;
  let climbZ = portal.z - 1;
  while (climbZ > summit.z
    && mountainSurfaceY(portal.x, climbZ - 1, model)
      !== mountainSurfaceY(portal.x, climbZ, model)) climbZ -= 1;
  invariant(climbZ > summit.z, 'selected model has no level summit approach');
  let throatX = null;
  for (let distance = 1; distance <= model.extents.east; distance += 1) {
    const x = portal.x + distance;
    if (mountainSurfaceY(x, climbZ, model) === portal.y - 1
      && mountainSurfaceY(x - 1, climbZ, model) === portal.y - 1) {
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
  for (let offset = 1; offset <= portal.z - climbZ; offset += 1) {
    points.push({ x: throatX, y: portal.y, z: portal.z - offset, kind: 'level-hairpin' });
  }
  for (let distance = 1; distance <= faceRun; distance += 1) {
    const x = throatX - distance;
    points.push({
      x,
      y: mountainSurfaceY(x, climbZ, model) + 1,
      z: climbZ,
      kind: distance === 1 ? 'level-hairpin-exit' : 'face-ascent',
    });
  }
  const northRun = Math.abs(summit.z - climbZ);
  for (let distance = 1; distance <= northRun; distance += 1) {
    const z = climbZ - distance;
    points.push({
      x: summit.x,
      y: mountainSurfaceY(summit.x, z, model) + 1,
      z,
      kind: distance === 1 ? 'level-summit-curve-exit'
        : distance === northRun ? 'summit-interface' : 'summit-ascent',
    });
  }
  points.forEach((point, index) => { point.index = index; });
  return points;
}

function connectedComponents(cells) {
  const remaining = new Set(cells.map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    let size = 0;
    while (stack.length) {
      const key = stack.pop();
      const [x, y, z] = key.split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const neighbour = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(neighbour)) stack.push(neighbour);
      }
    }
    sizes.push(size);
  }
  sizes.sort((left, right) => right - left);
  return { componentCount: sizes.length, largestComponentCellCount: sizes[0] ?? 0 };
}

function savedEntityInside(entity, bounds) {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= bounds.minX && x < bounds.maxX + 1
    && y >= bounds.minY && y < bounds.maxY + 1
    && z >= bounds.minZ && z < bounds.maxZ + 1;
}

function priorOperationIntersections(filename, targetKeys, targetBounds) {
  const overlaps = new Map();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    if (fields[0] === 'CMD') {
      for (const match of raw.matchAll(
        /(?:if block|data merge block) (-?\d+) (-?\d+) (-?\d+)/g,
      )) {
        const cell = { x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) };
        if (targetKeys.has(cellKey(cell))) overlaps.set(cellKey(cell), cell);
      }
      continue;
    }
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
    const overlapBounds = {
      minX: Math.max(Math.min(x1, x2), targetBounds.minX),
      maxX: Math.min(Math.max(x1, x2), targetBounds.maxX),
      minY: Math.max(Math.min(y1, y2), targetBounds.minY),
      maxY: Math.min(Math.max(y1, y2), targetBounds.maxY),
      minZ: Math.max(Math.min(z1, z2), targetBounds.minZ),
      maxZ: Math.min(Math.max(z1, z2), targetBounds.maxZ),
    };
    if (overlapBounds.minX > overlapBounds.maxX
      || overlapBounds.minY > overlapBounds.maxY
      || overlapBounds.minZ > overlapBounds.maxZ) continue;
    for (const cell of cellsIn(overlapBounds)) {
      if (targetKeys.has(cellKey(cell))) overlaps.set(cellKey(cell), cell);
    }
  }
  return [...overlaps.values()];
}

const intake = readJson(INTAKE_AUDIT);
const authorization = readJson(INPUTS.standingAuthorization);
const technical = readJson(INPUTS.b09Technical);
const connectors = readJson(INPUTS.connectorGeometry);
const d05 = readJson(INPUTS.d05Alternatives);
const protectedRelics = readJson(INPUTS.protectedRelics);
const r07dManifest = readJson(INPUTS.r07dManifest);
const r07eManifest = readJson(INPUTS.r07eManifest);
const r07eQa = readJson(INPUTS.r07eQa);
const sourceLedger = readJson(INPUTS.sourceLedger);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not a complete immutable same-moment PASS');
invariant(samePath(intake.input?.suppliedWorldRoot, SNAPSHOT)
  && intake.packageIdentity?.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256,
'source intake is not bound to the accepted R08H post save');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
  'source snapshot is missing level.dat');
invariant(fileBinding(INPUTS.sourceLedger).sha256 === EXPECTED.sourceLedgerSha256
  && sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.stages?.every(({ status }) => status === 'PASS')
  && samePath(sourceLedger.postSnapshot.root, SNAPSHOT)
  && sourceLedger.postSnapshot.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && sourceLedger.completedReleaseIdentitySha256
    === EXPECTED.sourceCompletedReleaseIdentitySha256,
'R08H terminal ledger is not the source predecessor');
const sourceRegionIdentity = readJson(sourceLedger.postSnapshot.identity.path);
invariant(sourceRegionIdentity.sha256 === EXPECTED.sourceRegionSha256
  && samePath(sourceRegionIdentity.directory, path.join(SNAPSHOT, 'region')),
'R08H post region identity drifted');
invariant(r07eQa.status === 'PASS_R07E_B09_SUMMIT_HEADHOUSE_POST_RELEASE_ACCEPTED'
  && r07eQa.qaPayloadSha256 === EXPECTED.r07eQaPayloadSha256
  && r07eQa.release?.completedReleaseIdentitySha256
    === EXPECTED.r07eCompletedReleaseIdentitySha256,
'R07E B09 post-release acceptance drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes?.includes(RELEASE_NODE_ID)
  && !authorization.mvpBoundary.excludedScopeIds.includes('P1-B09'),
'standing authorization does not cover P1-B09 under the R07 node');
invariant(technical.reportIdentitySha256 === EXPECTED.b09TechnicalIdentitySha256,
'frozen B09 technical-system identity drifted');

const selectedModel = d05.alternatives.find(
  ({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE',
);
invariant(selectedModel?.modelIdentitySha256 === EXPECTED.selectedModelIdentitySha256,
'selected FM-01 identity drifted');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const centerline = buildCenterline(selectedModel.formula, endpoints);
invariant(centerline.length === EXPECTED.centerlinePointCount
  && orderedCenterlineSha256(centerline) === EXPECTED.orderedCenterlineSha256,
'ordered FM-01 centerline drifted');
const segmentPoints = centerline.slice(FIRST_CENTERLINE_INDEX, LAST_CENTERLINE_INDEX + 1);
invariant(segmentPoints.length === 16
  && segmentPoints.every((point, index) => (
    point.index === FIRST_CENTERLINE_INDEX + index
    && point.x === 2057 + index
    && point.y === 130
    && point.z === -748
  )), 'selected segment is not the exact first straight level guideway run');
const accommodation = buildB09MinimumReservation(selectedModel.formula, endpoints);
invariant(accommodation.length === EXPECTED.accommodationCellCount
  && hashCells(accommodation) === EXPECTED.accommodationSha256,
'frozen B09 accommodation drifted');

const lowerStation = cellsIn({
  minX: 2047, maxX: 2057,
  minY: 129, maxY: 132,
  minZ: -749, maxZ: -747,
});
const rawSegmentEnvelope = dilateCells(segmentPoints.flatMap(({ x, y, z }) => [
  { x, y, z }, { x, y: y + 1, z },
]), 1);
const newSegmentEnvelope = difference(rawSegmentEnvelope, lowerStation);
const segmentInterior = difference(segmentPoints.flatMap(({ x, y, z }) => [
  { x, y, z }, { x, y: y + 1, z },
]), lowerStation);
const segmentShell = difference(newSegmentEnvelope, segmentInterior);
const lowerStationInterior = cellsIn({
  minX: 2051, maxX: 2056,
  minY: 130, maxY: 131,
  minZ: -748, maxZ: -748,
});
const internalSeamOpening = intersection(
  segmentPoints.flatMap(({ x, y, z }) => [{ x, y, z }, { x, y: y + 1, z }]),
  r07dManifest.scope.geometry.eastIsolationCap.bounds
    ? cellsIn(r07dManifest.scope.geometry.eastIsolationCap.bounds) : [],
);
const operatedUnion = uniqueCells([...segmentShell, ...internalSeamOpening]);
const farIsolationCap = segmentShell.filter(({ x }) => x === 2073);
const acceptedEastCap = cellsIn(r07dManifest.scope.geometry.eastIsolationCap.bounds);
const nearCapRemainder = difference(acceptedEastCap, internalSeamOpening);
const connectedVoid = uniqueCells([
  ...lowerStationInterior,
  ...internalSeamOpening,
  ...segmentInterior,
]);
const connectedVoidKeys = new Set(connectedVoid.map(cellKey));
const connectedVoidBoundary = uniqueCells(connectedVoid.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))
)).filter((cell) => !connectedVoidKeys.has(cellKey(cell))));
const acceptedFramework = uniqueCells([
  ...cellsIn(r07dManifest.scope.geometry.roughShell.bounds)
    .filter((cell) => !insideBounds(
      cell,
      r07dManifest.scope.geometry.preservedInteriorVoid.bounds,
    )),
  ...segmentShell,
]);
const acceptedFrameworkKeys = new Set(acceptedFramework.map(cellKey));
const b08PortalSeam = cellsIn({
  minX: 2047, maxX: 2049,
  minY: 129, maxY: 132,
  minZ: -749, maxZ: -747,
});
const summitInterfaceCap = cellsIn({
  minX: 2047, maxX: 2049,
  minY: 303, maxY: 306,
  minZ: -829, maxZ: -829,
});
invariant(lowerStation.length === EXPECTED.lowerStationCellCount
  && hashCells(lowerStation) === EXPECTED.lowerStationSha256
  && rawSegmentEnvelope.length === EXPECTED.rawSegmentEnvelopeCellCount
  && hashCells(rawSegmentEnvelope) === EXPECTED.rawSegmentEnvelopeSha256
  && newSegmentEnvelope.length === EXPECTED.newSegmentEnvelopeCellCount
  && hashCells(newSegmentEnvelope) === EXPECTED.newSegmentEnvelopeSha256
  && segmentInterior.length === EXPECTED.segmentInteriorCellCount
  && hashCells(segmentInterior) === EXPECTED.segmentInteriorSha256
  && segmentShell.length === EXPECTED.segmentShellCellCount
  && hashCells(segmentShell) === EXPECTED.segmentShellSha256
  && internalSeamOpening.length === EXPECTED.seamCellCount
  && hashCells(internalSeamOpening) === EXPECTED.seamSha256
  && operatedUnion.length === EXPECTED.operatedCellCount
  && hashCells(operatedUnion) === EXPECTED.operatedSha256
  && farIsolationCap.length === EXPECTED.farCapCellCount
  && hashCells(farIsolationCap) === EXPECTED.farCapSha256
  && nearCapRemainder.length === EXPECTED.nearCapRemainderCellCount
  && hashCells(nearCapRemainder) === EXPECTED.nearCapRemainderSha256
  && connectedVoid.length === EXPECTED.connectedVoidCellCount
  && hashCells(connectedVoid) === EXPECTED.connectedVoidSha256
  && connectedVoidBoundary.length === EXPECTED.connectedVoidBoundaryCellCount
  && hashCells(connectedVoidBoundary) === EXPECTED.connectedVoidBoundarySha256
  && connectedVoidBoundary.every((cell) => acceptedFrameworkKeys.has(cellKey(cell)))
  && b08PortalSeam.length === EXPECTED.b08PortalSeamCellCount
  && hashCells(b08PortalSeam) === EXPECTED.b08PortalSeamSha256
  && summitInterfaceCap.length === EXPECTED.summitInterfaceCapCellCount
  && hashCells(summitInterfaceCap) === EXPECTED.summitInterfaceCapSha256,
'guideway segment geometry or complete enclosure drifted');
const connectedVoidConnectivity = connectedComponents(connectedVoid);
invariant(connectedVoidConnectivity.componentCount === 1
  && connectedVoidConnectivity.largestComponentCellCount === connectedVoid.length,
'station-to-segment void is not one connected component');
invariant(intersection(operatedUnion, b08PortalSeam).length === 0
  && intersection(operatedUnion, summitInterfaceCap).length === 0
  && intersection(segmentShell, internalSeamOpening).length === 0,
'package touches an external interface or overlaps its own shell/opening');

const interactionHalo = dilateCells(operatedUnion, 1);
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
async function readStates(cells) {
  const records = [];
  for (const cell of uniqueCells(cells)) {
    records.push({
      cell,
      state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return records;
}
const accommodationRecords = await readStates(accommodation);
invariant(stateSetSha256(accommodationRecords) === EXPECTED.accommodationStateSha256,
'latest source does not contain the accepted R07E B09 post state');
const accommodationByKey = new Map(
  accommodationRecords.map((record) => [cellKey(record.cell), record.state]),
);
const recordsFor = (cells) => cells.map((cell) => ({
  cell,
  state: accommodationByKey.get(cellKey(cell)),
}));
const shellRecords = recordsFor(segmentShell);
const seamRecords = recordsFor(internalSeamOpening);
const segmentInteriorRecords = recordsFor(segmentInterior);
const stationInteriorRecords = recordsFor(lowerStationInterior);
const nearCapRecords = recordsFor(nearCapRemainder);
const farCapRecords = recordsFor(farIsolationCap);
const b08Records = recordsFor(b08PortalSeam);
const summitCapRecords = recordsFor(summitInterfaceCap);
const unexpectedShellStates = shellRecords.filter(({ state }) => state !== AIR_STATE);
const unexpectedSeamStates = seamRecords.filter(({ state }) => state !== SHELL_STATE);
const obstructedInterior = [...segmentInteriorRecords, ...stationInteriorRecords]
  .filter(({ state }) => state !== AIR_STATE);
const incompleteNearCap = nearCapRecords.filter(({ state }) => state !== SHELL_STATE);
const b08ExternalDrift = b08Records.filter(({ state }) => (
  state !== AIR_STATE && state !== SHELL_STATE
));
const summitExternalDrift = summitCapRecords.filter(({ state }) => state !== SHELL_STATE);
invariant(unexpectedShellStates.length === 0,
  `segment shell source is not exact air: ${JSON.stringify(unexpectedShellStates.slice(0, 20))}`);
invariant(unexpectedSeamStates.length === 0,
  `internal seam source is not exact polished diorite: ${JSON.stringify(unexpectedSeamStates)}`);
invariant(obstructedInterior.length === 0,
  `preserved connection interior is obstructed: ${JSON.stringify(obstructedInterior.slice(0, 20))}`);
invariant(incompleteNearCap.length === 0,
  'internal seam remainder is not a complete polished-diorite collar');
invariant(b08ExternalDrift.length === 0 && summitExternalDrift.length === 0,
  'an external B09 interface has unexpected source state');

const haloRecords = await readStates(interactionHalo);
const haloViolations = haloRecords.filter(({ state }) => (
  isFluid(state)
  || GRAVITY_BLOCKS.has(blockName(state))
  || FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))
));
invariant(haloViolations.length === 0,
  `protected block class exists in guideway halo: ${JSON.stringify(haloViolations.slice(0, 20))}`);
const haloBounds = boundsOf(interactionHalo);
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
    if (insideBounds(point, haloBounds)) {
      blockEntityHaloIntersections.push({ id: entity.id ?? null, point });
    }
  }
  const entityChunk = await entityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entityChunk?.Entities ?? []) {
    if (savedEntityInside(entity, haloBounds)) {
      savedEntityHaloIntersections.push({
        id: entity.id ?? null,
        position: entity.Pos.slice(0, 3).map(Number),
        chunk: chunkPoint,
      });
    }
  }
}
invariant(blockEntityHaloIntersections.length === 0,
  'guideway interaction halo intersects a block entity');
invariant(savedEntityHaloIntersections.length === 0,
  'guideway interaction halo intersects a saved entity');

const protectedRelicHaloIntersections = [];
for (const relic of protectedRelics.relics) {
  const cells = interactionHalo.filter((cell) => insideBounds(cell, relic.declaredInclusiveBounds));
  if (cells.length) protectedRelicHaloIntersections.push({
    relic: relic.key,
    ...classManifest(cells),
  });
}
invariant(protectedRelicHaloIntersections.length === 0,
  'guideway interaction halo intersects a protected relic core');

const targetKeys = new Set(operatedUnion.map(cellKey));
const priorReleaseIntersections = [];
for (const manifestPath of INPUTS.priorManifests) {
  const priorManifest = readJson(manifestPath);
  for (const pkg of priorManifest.packages) {
    const declaredHash = priorManifest.operations?.[pkg.key]?.forwardSha256;
    if (declaredHash) {
      invariant(sha256(operationBody(pkg.forward)) === declaredHash,
        `${priorManifest.transactionId}/${pkg.key} operation body drifted`);
    }
    const overlaps = priorOperationIntersections(
      pkg.forward,
      targetKeys,
      boundsOf(operatedUnion),
    );
    if (overlaps.length) priorReleaseIntersections.push({
      packageId: `${priorManifest.transactionId}/${pkg.key}`,
      operationPath: pkg.forward,
      ...classManifest(overlaps),
    });
  }
}
const expectedR07dPackageId =
  'combined-zones-r07d-b09-lower-station-shell/b09-lower-station-shell';
const declaredInternalSeamIntersections = priorReleaseIntersections.filter((item) => (
  item.packageId === expectedR07dPackageId
  && item.cellCount === EXPECTED.seamCellCount
  && item.coordinateSetSha256 === EXPECTED.seamSha256
));
const undeclaredPriorReleaseIntersections = priorReleaseIntersections.filter((item) => (
  !declaredInternalSeamIntersections.includes(item)
));
invariant(declaredInternalSeamIntersections.length === 1
  && undeclaredPriorReleaseIntersections.length === 0,
`prior-release intersection is not exactly the owned R07D internal seam: ${JSON.stringify(priorReleaseIntersections)}`);

const forwardOperations = [
  ...segmentShell.map((cell) => ({ cell, fromState: AIR_STATE, toState: SHELL_STATE })),
  ...internalSeamOpening.map((cell) => ({
    cell,
    fromState: SHELL_STATE,
    toState: AIR_STATE,
  })),
];
const rollbackOperations = forwardOperations.slice().reverse().map((operation) => ({
  cell: operation.cell,
  fromState: operation.toState,
  toState: operation.fromState,
}));
const forwardBody = `${forwardOperations.map(({ cell, fromState, toState }) => (
  replLine(cell, fromState, toState)
)).join('\n')}\n`;
const rollbackBody = `${rollbackOperations.map(({ cell, fromState, toState }) => (
  replLine(cell, fromState, toState)
)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forward = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# target coordinate-set SHA-256: ${hashCells(operatedUnion)}`,
  `# operation SHA-256: ${operationSha256}`,
  '',
].join('\n');
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}${forwardBody}`);
fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R08H_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B09'],
  packages: [{ key: PACKAGE_KEY, forward, rollback }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'Build the complete new shell before opening the internal station seam; rollback reseals the station before removing the new shell.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'P1-B09-FUNICULAR-FRAMEWORK',
    purpose: 'Extend the accepted lower-station void through its owned internal seam into the first straight level guideway framework segment, with a complete fail-closed far cap.',
    centerlineRange: {
      firstInclusive: FIRST_CENTERLINE_INDEX,
      lastInclusive: LAST_CENTERLINE_INDEX,
      pointCount: segmentPoints.length,
      classification: 'STRAIGHT_LEVEL_LOWER_GUIDEWAY',
    },
    geometry: {
      minimumPlanningAccommodation: classManifest(accommodation),
      lowerStationEnvelope: classManifest(lowerStation),
      rawSegmentEnvelope: classManifest(rawSegmentEnvelope),
      newSegmentEnvelope: classManifest(newSegmentEnvelope),
      preservedSegmentInterior: classManifest(segmentInterior),
      staticSegmentShell: classManifest(segmentShell),
      ownedInternalSeamOpening: classManifest(internalSeamOpening),
      retainedNearCapCollar: classManifest(nearCapRemainder),
      farIsolationCap: classManifest(farIsolationCap),
      connectedLowerStationAndSegmentVoid: {
        ...classManifest(connectedVoid),
        ...connectedVoidConnectivity,
      },
      connectedVoidFaceBoundary: classManifest(connectedVoidBoundary),
      b08PortalSeam: classManifest(b08PortalSeam),
      summitInterfaceCap: classManifest(summitInterfaceCap),
      interactionHalo: classManifest(interactionHalo),
    },
    materialDoctrine: {
      shellState: SHELL_STATE,
      reason: 'Static non-gravity fabric matching accepted R07 B03/B08/B09 framework.',
    },
    operationalBoundary: {
      lowerStationInternalSeamOwnedAndOpened: true,
      retainedNearCapCollarComplete: true,
      farIsolationCapBuiltClosed: true,
      fartherGuidewayOpened: false,
      b08ExternalInterfaceTouched: false,
      b08ExternalInterfaceOpened: false,
      summitExternalInterfaceTouched: false,
      summitExternalInterfaceOpened: false,
      railOrVehicleInstalled: false,
      powerOrControlInstalled: false,
      drainageOrOutfallInstalled: false,
      rescueOrEgressCommissioned: false,
      exactRollbackResealsInternalSeamFirst: true,
      exactRollbackRestoresR08HPostState: true,
    },
    sourcePartition: {
      operated: classManifest(operatedUnion),
      shellConstruction: classManifest(segmentShell),
      internalSeamOpening: classManifest(internalSeamOpening),
      preservedInterior: classManifest(uniqueCells([
        ...lowerStationInterior,
        ...segmentInterior,
      ])),
      sourceStateCensus: stateCensus([...shellRecords, ...seamRecords]),
      desiredStateCensus: {
        [SHELL_STATE]: segmentShell.length,
        [AIR_STATE]: internalSeamOpening.length,
      },
      exactPartition: operatedUnion.length
        === segmentShell.length + internalSeamOpening.length,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    regionSnapshotSha256: sourceRegionIdentity.sha256,
    intakeAuditPath: INTAKE_AUDIT,
    intakeStatus: intake.status,
    predecessor: {
      transactionId: sourceLedger.transactionId,
      executionLedger: fileBinding(INPUTS.sourceLedger),
      completedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
    },
    acceptedB09State: {
      r07ePostReleaseQa: fileBinding(INPUTS.r07eQa),
      completedReleaseIdentitySha256: r07eQa.release.completedReleaseIdentitySha256,
      qaPayloadSha256: r07eQa.qaPayloadSha256,
    },
    b09CurrentStateInventory: {
      minimumAccommodation: {
        ...classManifest(accommodation),
        stateCensus: stateCensus(accommodationRecords),
        blockStateSetSha256: stateSetSha256(accommodationRecords),
      },
      segmentShell: {
        ...classManifest(segmentShell),
        stateCensus: stateCensus(shellRecords),
      },
      internalSeamOpening: {
        ...classManifest(internalSeamOpening),
        stateCensus: stateCensus(seamRecords),
      },
      preservedConnectionInterior: {
        ...classManifest(uniqueCells([...lowerStationInterior, ...segmentInterior])),
        stateCensus: stateCensus([...stationInteriorRecords, ...segmentInteriorRecords]),
      },
      retainedNearCapCollar: {
        ...classManifest(nearCapRemainder),
        stateCensus: stateCensus(nearCapRecords),
      },
      farIsolationCap: {
        ...classManifest(farIsolationCap),
        stateCensus: stateCensus(farCapRecords),
      },
      b08PortalSeam: {
        ...classManifest(b08PortalSeam),
        stateCensus: stateCensus(b08Records),
      },
      summitInterfaceCap: {
        ...classManifest(summitInterfaceCap),
        stateCensus: stateCensus(summitCapRecords),
      },
    },
    touchedChunkCount: touchedChunks.length,
  },
  target: {
    operatedUnion: classManifest(operatedUnion),
    desiredStateCensus: {
      [SHELL_STATE]: segmentShell.length,
      [AIR_STATE]: internalSeamOpening.length,
    },
    packageTargetsDisjoint: true,
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: forwardOperations.length,
      rollbackCommandCount: rollbackOperations.length,
      targetCellCount: operatedUnion.length,
      targetCoordinateSetSha256: hashCells(operatedUnion),
      exactInverse: true,
      reverseOrderInverse: true,
      oneCellGuards: true,
      shellBeforeOpening: true,
      rollbackResealsBeforeShellRemoval: true,
    },
  },
  isolation: {
    fluidTargetIntersectionCount: [...shellRecords, ...seamRecords]
      .filter(({ state }) => isFluid(state)).length,
    fluidHaloIntersectionCount: haloViolations.filter(({ state }) => isFluid(state)).length,
    gravityHaloIntersectionCount: haloViolations
      .filter(({ state }) => GRAVITY_BLOCKS.has(blockName(state))).length,
    forbiddenContainerOrControlHaloCount: haloViolations
      .filter(({ state }) => FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))).length,
    blockEntityHaloIntersectionCount: blockEntityHaloIntersections.length,
    savedEntityHaloIntersectionCount: savedEntityHaloIntersections.length,
    protectedRelicHaloIntersectionCount: protectedRelicHaloIntersections.length,
    priorReleaseIntersections,
    declaredInternalSeamPriorReleaseIntersectionCount:
      declaredInternalSeamIntersections.length,
    undeclaredPriorReleaseIntersectionCount: undeclaredPriorReleaseIntersections.length,
    b08PortalSeamTargetIntersectionCount: intersection(operatedUnion, b08PortalSeam).length,
    summitInterfaceCapTargetIntersectionCount:
      intersection(operatedUnion, summitInterfaceCap).length,
    acceptedR07DLowerShellTargetIntersectionCount:
      intersection(operatedUnion, cellsIn(r07dManifest.scope.geometry.roughShell.bounds)).length,
    acceptedR07DLowerShellTargetRole:
      'EXACT_TWO_CELL_INTERNAL_GUIDEWAY_SEAM_OPENING',
    acceptedR07ESummitShellTargetIntersectionCount:
      intersection(operatedUnion, cellsIn(r07eManifest.scope.geometry.summitHeadhouseShell.bounds))
        .filter((cell) => !insideBounds(cell, r07eManifest.scope.geometry.connectedRailAndHeadroomVoid.bounds))
        .length,
  },
  compileGuards: {
    shellExactSourceState: AIR_STATE,
    seamExactSourceState: SHELL_STATE,
    unexpectedShellStateViolationCount: unexpectedShellStates.length,
    unexpectedSeamStateViolationCount: unexpectedSeamStates.length,
    obstructedPreservedInteriorViolationCount: obstructedInterior.length,
    incompleteNearCapCollarViolationCount: incompleteNearCap.length,
    fluidTargetViolationCount: [...shellRecords, ...seamRecords]
      .filter(({ state }) => isFluid(state)).length,
    fluidHaloViolationCount: haloViolations.filter(({ state }) => isFluid(state)).length,
    gravityHaloViolationCount: haloViolations
      .filter(({ state }) => GRAVITY_BLOCKS.has(blockName(state))).length,
    forbiddenContainerOrControlHaloViolationCount: haloViolations
      .filter(({ state }) => FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))).length,
    blockEntityHaloViolationCount: blockEntityHaloIntersections.length,
    savedEntityHaloViolationCount: savedEntityHaloIntersections.length,
    protectedRelicHaloViolationCount: protectedRelicHaloIntersections.length,
    undeclaredPriorReleaseTargetViolationCount: undeclaredPriorReleaseIntersections.length,
    b08ExternalInterfaceViolationCount: intersection(operatedUnion, b08PortalSeam).length,
    summitExternalInterfaceViolationCount:
      intersection(operatedUnion, summitInterfaceCap).length,
  },
  standingAuthorization: {
    ...fileBinding(INPUTS.standingAuthorization),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
    excludedMvpScopeNamed: false,
  },
  upstreamIdentities: {
    b09Technical: {
      ...fileBinding(INPUTS.b09Technical),
      reportIdentitySha256: technical.reportIdentitySha256,
    },
    d05Alternatives: {
      ...fileBinding(INPUTS.d05Alternatives),
      selectedModelIdentitySha256: selectedModel.modelIdentitySha256,
    },
    connectorGeometry: fileBinding(INPUTS.connectorGeometry),
    protectedRelics: fileBinding(INPUTS.protectedRelics),
    acceptedR07DManifest: fileBinding(INPUTS.r07dManifest),
    acceptedR07EManifest: fileBinding(INPUTS.r07eManifest),
  },
  hardSafetyKernelNext: [
    'independent manifest and exact-inverse QA',
    'fresh same-invocation complete-save capture',
    'fresh block/live-entity clearance',
    'exact mixed-source preflight',
    'strict-noop forward and rollback parser checks',
    'journaled strict-noop execution',
    'fresh post snapshot and rollback post-state preflight',
    'verify connected void, complete far cap, and sealed external interfaces',
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
  transactionId: BASENAME,
  centerlineRange: `${FIRST_CENTERLINE_INDEX}..${LAST_CENTERLINE_INDEX}`,
  shellCells: segmentShell.length,
  internalSeamOpeningCells: internalSeamOpening.length,
  operatedCells: operatedUnion.length,
  connectedVoidCells: connectedVoid.length,
  farCapCells: farIsolationCap.length,
  forwardCommands: forwardOperations.length,
  rollbackCommands: rollbackOperations.length,
  manifestIdentity,
  outputs: {
    manifest: relative(manifestPath),
    forward: relative(forward),
    rollback: relative(rollback),
  },
  safetyBoundary: manifestWithoutIdentity.safetyBoundary,
}, null, 2));
