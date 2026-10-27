#!/usr/bin/env node
/** Compile CZ-R07H: maximal straight B09 lower-guideway shell segment 02. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
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
const GENERATED_AT = value('--generated-at', '2026-08-21T18:32:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r07g-post-20260821T181527Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r07g-live-20260821T181527Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r07g-live-20260821T181527Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r07h-b09-lower-guideway-segment-02',
);
const RELEASE_ID = 'CZ-R07H-P1-B09-LOWER-GUIDEWAY-SEGMENT-02';
const RELEASE_NODE_ID = 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK';
const PACKAGE_KEY = 'b09-lower-guideway-segment-02';
const AIR_STATE = 'minecraft:air';
const SHELL_STATE = 'minecraft:polished_diorite';
const FIRST_CENTERLINE_INDEX = 24;
const LAST_CENTERLINE_INDEX = 239;

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
  releaseContract:
    'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  r07dManifest:
    'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
  r07eManifest:
    'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
  r07fManifest:
    'data/buildops/combined-zones-r07f-b09-lower-guideway-segment-01.release-manifest.json',
  r07fQa:
    'data/world-review/combined-zones-r07f-live-20260821T172700Z/r07f-post-release-qa.json',
});

const EXPECTED = Object.freeze({
  sourceCompleteSaveSha256:
    '98086a3bc4584ba82ee287f1425f32435a2f41e1ce5f3a72482a50e225f8b8e4',
  sourceRegionSha256:
    'd3c7f46034a4cab20819c51a4ee505a46be81065fda887c19ebe3638f2d83ad8',
  sourceLedgerSha256:
    'de283824ad70c1b0b1e46d7070c4c3622210f67b703a20a1b0fa791779341689',
  sourceCompletedReleaseIdentitySha256:
    '79b6e5972cfc24770cb402f740407bc7c01113d728d5cca0b765894c0066335e',
  r07fManifestIdentitySha256:
    '0260263944b561a612f786f1fb0fd0345d1afd18da4f5ff13e207cd777687354',
  r07fQaPayloadSha256:
    '516be068e82892c8c0f2b92aeffa901b501dc60eae5544fbbfb4aede64bc8d1c',
  r07fCompletedReleaseIdentitySha256:
    '15facdcd036fdfba27ef0e76a0167b00e1acf118804415da159167e46b4a806e',
  b09TechnicalIdentitySha256:
    'e8738f3932f2afc3ba71e35ccdebf0d5ef444ca7389e81ec31a18e48517d3eba',
  selectedModelIdentitySha256:
    '735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6',
  centerlinePointCount: 561,
  orderedCenterlineSha256:
    'e8905742a77148d13d799362da7d65e9b02bcf96455d580fbee27367b2d24221',
  segmentPointCount: 216,
  segmentOrderedSha256:
    '489d1ec4b963439536fa360905a8c8a7a730afd5792cd0868b7cdd38fa8e8ee6',
  accommodationCellCount: 7800,
  accommodationSha256:
    'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  runningGuidewayCellCount: 7488,
  runningGuidewaySha256:
    'd9de4b923a8002dbd302116f4c928b6794d824ea616811d0ab2a3988ad32bb1f',
  accommodationStateSha256:
    'c68ad8effd7a3f0e258311575fd3414a29c52e363bb793b099487779f03ba561',
  priorSegmentEnvelopeCellCount: 192,
  priorSegmentEnvelopeSha256:
    'd2032cd4a66d1eee3175c498298152002ebea974aadf233a78200d3c7e3daa7a',
  rawSegmentEnvelopeCellCount: 2616,
  rawSegmentEnvelopeSha256:
    '83605996187e457d99e06b2931e73012e8bcc2cc39b61e9b9e0e4aca6e7938b0',
  newSegmentEnvelopeCellCount: 2580,
  newSegmentEnvelopeSha256:
    '36ce941c3cbcefbabad031b261a6fb18110f0f0e018468071e9be9e5e5b249db',
  segmentInteriorCellCount: 428,
  segmentInteriorSha256:
    '9fa768852c203ba4621e5fc01652fc8fe87fd6b4de3c7afab3d83b50766b78ba',
  segmentShellCellCount: 2152,
  segmentShellSha256:
    'e5a7cd983244d917f6a10a2fc85673f10d97460a62a5ac697f621d2330ee2097',
  seamCellCount: 2,
  seamSha256:
    '0ed8967e3b4982f7fe4e1a8d054561552a1c9a21a2c8e2f9ada2f252e8e2cbd7',
  operatedCellCount: 2154,
  operatedSha256:
    'f797de91a3544c0e233cbbaadfd1a08bbc2b9b1141cd1cb1a0159f19710c1d9d',
  priorFarCapCellCount: 12,
  priorFarCapSha256:
    'ffbb546fae81114f50226ac6042fe75d9f057b3543cd3887f10ebbdfcefef333',
  priorFarCapCollarCellCount: 10,
  priorFarCapCollarSha256:
    '3c823874a68900f5e67d354b87439ec8590b3a2f7309a6cf3262608b5346a714',
  farCapCellCount: 12,
  farCapSha256:
    'aca98a89222480d4206b7c408d922ecc4d884d2228920bfbfc04f43d820a92b9',
  futureCurveSeamCellCount: 2,
  futureCurveSeamSha256:
    '6eb7dc1db3f3b65676aee14d6448032a4ffe8fb0e1bccb17f0d4d8f84436ebc4',
  connectedVoidCellCount: 474,
  connectedVoidSha256:
    '33c4566c2030f7e9f5d7cac5a65bb5579a551a2e848a3354f543ef566e969eb1',
  connectedVoidBoundaryCellCount: 1426,
  connectedVoidBoundarySha256:
    '131169b3d54c7781fccd906c83c68d6c90ce50c8e3c0da3cd21f407dfb07b758',
  interactionHaloCellCount: 6522,
  interactionHaloSha256:
    '586f599db9470a2a1adc1516d1ad76d3ca369aed21bdf12015d398a5c3bb6609',
  b08PortalSeamCellCount: 36,
  b08PortalSeamSha256:
    'b28a975b44296fc43739a8af0743066ca58a2c33a99e13da6c2edf89142b33e3',
  summitInterfaceCapCellCount: 12,
  summitInterfaceCapSha256:
    'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
  r07dStateSha256:
    '2dd23b78c1f3d4266b51a3b122751fdda36f3f69502b65286d7a371f519f01d2',
  r07eStateSha256:
    'f2a156e95717a9de1a8143c2623123b5cae99d890714b77369b19090ac196641',
  r07fStateSha256:
    'd95344aa00e05fc26d03a5bd91ca0f310acad4c8896e2c91758c56d2726b30cf',
  b08StateSha256:
    'd9cf79e5430aed1d30c41142e41de75c760fb2d797beb0fb242bcff55eb2e500',
  z11StateSha256:
    '621ea313e08320d2e98fee1433fb0767000d75a348d152ef711b10ec3c5ba59d',
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
  if (!condition) throw new Error(`R07H B09 guideway compiler rejected: ${message}`);
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
  return `${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
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
  while (remaining.size > 0) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    let size = 0;
    while (stack.length > 0) {
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

function expandedManifestTargets(manifest) {
  const records = [];
  for (const pkg of manifest.packages ?? []) {
    for (const raw of fs.readFileSync(absolute(pkg.forward), 'utf8').split(/\r?\n/)) {
      if (!raw || raw.startsWith('#')) continue;
      const fields = raw.split(/\s+/);
      if (fields[0] !== 'REPL' || fields.length !== 9) continue;
      const coordinates = fields.slice(1, 7).map(Number);
      for (let x = Math.min(coordinates[0], coordinates[3]);
        x <= Math.max(coordinates[0], coordinates[3]); x += 1) {
        for (let y = Math.min(coordinates[1], coordinates[4]);
          y <= Math.max(coordinates[1], coordinates[4]); y += 1) {
          for (let z = Math.min(coordinates[2], coordinates[5]);
            z <= Math.max(coordinates[2], coordinates[5]); z += 1) {
            records.push({ cell: { x, y, z }, targetState: fields[8] });
          }
        }
      }
    }
  }
  return records;
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
const sourceLedger = readJson(SOURCE_LEDGER);
const authorization = readJson(INPUTS.standingAuthorization);
const releaseContract = readJson(INPUTS.releaseContract);
const technical = readJson(INPUTS.b09Technical);
const connectors = readJson(INPUTS.connectorGeometry);
const d05 = readJson(INPUTS.d05Alternatives);
const protectedRelics = readJson(INPUTS.protectedRelics);
const r07dManifest = readJson(INPUTS.r07dManifest);
const r07eManifest = readJson(INPUTS.r07eManifest);
const r07fManifest = readJson(INPUTS.r07fManifest);
const r07fQa = readJson(INPUTS.r07fQa);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true
  && samePath(intake.input?.suppliedWorldRoot, SNAPSHOT)
  && intake.packageIdentity?.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256,
'source intake is not the selected complete immutable R07G post save');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
  'source snapshot is missing level.dat');
invariant(fileBinding(SOURCE_LEDGER).sha256 === EXPECTED.sourceLedgerSha256
  && sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.stages?.every(({ status }) => status === 'PASS')
  && samePath(sourceLedger.postSnapshot.root, SNAPSHOT)
  && sourceLedger.postSnapshot.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && sourceLedger.completedReleaseIdentitySha256
    === EXPECTED.sourceCompletedReleaseIdentitySha256,
'R07G terminal ledger is not the selected source predecessor');
const sourceRegionIdentity = readJson(sourceLedger.postSnapshot.identity.path);
invariant(sourceRegionIdentity.sha256 === EXPECTED.sourceRegionSha256
  && samePath(sourceRegionIdentity.directory, path.join(SNAPSHOT, 'region')),
'R07G post region identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes?.includes(RELEASE_NODE_ID)
  && !authorization.mvpBoundary.excludedScopeIds.includes('P1-B09'),
'standing authorization does not cover P1-B09 under R07');
const r07Node = releaseContract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r07Node?.status?.startsWith('PARTIALLY_AS_BUILT'),
'R07 release node is not active for remaining scoped work');
invariant(technical.reportIdentitySha256 === EXPECTED.b09TechnicalIdentitySha256,
'frozen B09 technical-system identity drifted');
invariant(r07fManifest.manifestIdentity === EXPECTED.r07fManifestIdentitySha256
  && r07fQa.status === 'PASS_R07F_B09_LOWER_GUIDEWAY_SEGMENT_01_POST_RELEASE_ACCEPTED'
  && r07fQa.qaPayloadSha256 === EXPECTED.r07fQaPayloadSha256
  && r07fQa.release?.completedReleaseIdentitySha256
    === EXPECTED.r07fCompletedReleaseIdentitySha256,
'accepted R07F segment 01 identity or post QA drifted');

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
invariant(segmentPoints.length === EXPECTED.segmentPointCount
  && orderedCenterlineSha256(segmentPoints) === EXPECTED.segmentOrderedSha256
  && segmentPoints.every((point, index) => (
    point.index === FIRST_CENTERLINE_INDEX + index
    && point.x === 2072 + index
    && point.y === 130
    && point.z === -748
    && point.kind === 'level-station-throat'
  ))
  && centerline[LAST_CENTERLINE_INDEX + 1].index === 240
  && centerline[LAST_CENTERLINE_INDEX + 1].x === 2288
  && centerline[LAST_CENTERLINE_INDEX + 1].z === -748,
'segment 02 is not the maximal straight run before the first curve');

const accommodation = buildB09MinimumReservation(selectedModel.formula, endpoints);
const lowerStationEnvelope = cellsIn(
  technical.exactTechnicalReservationProposals.proposalLayers.lowerStationEnvelope.bounds,
);
const summitStationEnvelope = cellsIn(
  technical.exactTechnicalReservationProposals.proposalLayers.summitStationEnvelope.bounds,
);
const runningGuideway = difference(accommodation, [
  ...lowerStationEnvelope,
  ...summitStationEnvelope,
]);
invariant(accommodation.length === EXPECTED.accommodationCellCount
  && hashCells(accommodation) === EXPECTED.accommodationSha256
  && runningGuideway.length === EXPECTED.runningGuidewayCellCount
  && hashCells(runningGuideway) === EXPECTED.runningGuidewaySha256,
'frozen B09 physical-domain geometry drifted');

const priorSegmentEnvelope = cellsIn(
  r07fManifest.scope.geometry.newSegmentEnvelope.bounds,
);
const rawSegmentEnvelope = dilateCells(segmentPoints.flatMap(({ x, y, z }) => [
  { x, y, z }, { x, y: y + 1, z },
]), 1);
const newSegmentEnvelope = difference(rawSegmentEnvelope, priorSegmentEnvelope);
const segmentInterior = difference(segmentPoints.flatMap(({ x, y, z }) => [
  { x, y, z }, { x, y: y + 1, z },
]), priorSegmentEnvelope);
const segmentShell = difference(newSegmentEnvelope, segmentInterior);
const priorConnectedVoid = cellsIn({
  minX: 2051, maxX: 2072,
  minY: 130, maxY: 131,
  minZ: -748, maxZ: -748,
});
const priorFarCap = cellsIn(r07fManifest.scope.geometry.farIsolationCap.bounds);
const internalSeamOpening = intersection(
  cellsIn({
    minX: 2073, maxX: 2073,
    minY: 130, maxY: 131,
    minZ: -748, maxZ: -748,
  }),
  priorFarCap,
);
const priorFarCapCollar = difference(priorFarCap, internalSeamOpening);
const operatedUnion = uniqueCells([...segmentShell, ...internalSeamOpening]);
const farIsolationCap = segmentShell.filter(({ x }) => x === 2288);
const futureCurveSeam = farIsolationCap.filter(({ y, z }) => (
  y >= 130 && y <= 131 && z === -748
));
const connectedVoid = uniqueCells([
  ...priorConnectedVoid,
  ...internalSeamOpening,
  ...segmentInterior,
]);
const connectedVoidKeys = new Set(connectedVoid.map(cellKey));
const connectedVoidBoundary = uniqueCells(connectedVoid.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))
)).filter((cell) => !connectedVoidKeys.has(cellKey(cell))));
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
const interactionHalo = dilateCells(operatedUnion, 1);
const ownershipKeys = new Set(runningGuideway.map(cellKey));

invariant(priorSegmentEnvelope.length === EXPECTED.priorSegmentEnvelopeCellCount
  && hashCells(priorSegmentEnvelope) === EXPECTED.priorSegmentEnvelopeSha256
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
  && priorFarCap.length === EXPECTED.priorFarCapCellCount
  && hashCells(priorFarCap) === EXPECTED.priorFarCapSha256
  && priorFarCapCollar.length === EXPECTED.priorFarCapCollarCellCount
  && hashCells(priorFarCapCollar) === EXPECTED.priorFarCapCollarSha256
  && farIsolationCap.length === EXPECTED.farCapCellCount
  && hashCells(farIsolationCap) === EXPECTED.farCapSha256
  && futureCurveSeam.length === EXPECTED.futureCurveSeamCellCount
  && hashCells(futureCurveSeam) === EXPECTED.futureCurveSeamSha256
  && connectedVoid.length === EXPECTED.connectedVoidCellCount
  && hashCells(connectedVoid) === EXPECTED.connectedVoidSha256
  && connectedVoidBoundary.length === EXPECTED.connectedVoidBoundaryCellCount
  && hashCells(connectedVoidBoundary) === EXPECTED.connectedVoidBoundarySha256
  && interactionHalo.length === EXPECTED.interactionHaloCellCount
  && hashCells(interactionHalo) === EXPECTED.interactionHaloSha256
  && b08PortalSeam.length === EXPECTED.b08PortalSeamCellCount
  && hashCells(b08PortalSeam) === EXPECTED.b08PortalSeamSha256
  && summitInterfaceCap.length === EXPECTED.summitInterfaceCapCellCount
  && hashCells(summitInterfaceCap) === EXPECTED.summitInterfaceCapSha256,
'guideway segment geometry drifted');
invariant(operatedUnion.every((cell) => ownershipKeys.has(cellKey(cell)))
  && intersection(operatedUnion, b08PortalSeam).length === 0
  && intersection(operatedUnion, summitInterfaceCap).length === 0
  && intersection(segmentShell, internalSeamOpening).length === 0,
'package leaves B09 ownership or touches an external interface');
const connectivity = connectedComponents(connectedVoid);
invariant(connectivity.componentCount === 1
  && connectivity.largestComponentCellCount === connectedVoid.length,
'connected station/segment void is not one component');

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
'latest source does not contain the accepted R07F B09 state');
const byKey = new Map(accommodationRecords.map((record) => [cellKey(record.cell), record.state]));
const recordsFor = (cells) => cells.map((cell) => ({ cell, state: byKey.get(cellKey(cell)) }));
const shellRecords = recordsFor(segmentShell);
const seamRecords = recordsFor(internalSeamOpening);
const interiorRecords = recordsFor([...priorConnectedVoid, ...segmentInterior]);
const priorCollarRecords = recordsFor(priorFarCapCollar);
const farCapRecords = recordsFor(farIsolationCap);
const futureCurveSeamRecords = recordsFor(futureCurveSeam);
const b08Records = recordsFor(b08PortalSeam);
const summitRecords = recordsFor(summitInterfaceCap);
invariant(shellRecords.every(({ state }) => state === AIR_STATE),
'segment shell source is not exact air');
invariant(seamRecords.every(({ state }) => state === SHELL_STATE),
'owned R07F far-cap seam is not exact polished diorite');
invariant(interiorRecords.every(({ state }) => state === AIR_STATE),
'preserved connection interior is obstructed');
invariant(priorCollarRecords.every(({ state }) => state === SHELL_STATE),
'R07F far-cap collar is incomplete');
invariant(farCapRecords.every(({ state }) => state === AIR_STATE)
  && futureCurveSeamRecords.every(({ state }) => state === AIR_STATE),
'new fail-closed cap source is not exact air');
invariant(b08Records.every(({ state }) => state === AIR_STATE || state === SHELL_STATE)
  && summitRecords.every(({ state }) => state === SHELL_STATE),
'B08 or Z11 external interface source drifted');

const r07dRecords = await readStates(expandedManifestTargets(r07dManifest).map(({ cell }) => cell));
const r07eRecords = await readStates(expandedManifestTargets(r07eManifest).map(({ cell }) => cell));
const r07fRecords = await readStates(expandedManifestTargets(r07fManifest).map(({ cell }) => cell));
invariant(stateSetSha256(r07dRecords) === EXPECTED.r07dStateSha256
  && stateSetSha256(r07eRecords) === EXPECTED.r07eStateSha256
  && stateSetSha256(r07fRecords) === EXPECTED.r07fStateSha256
  && stateSetSha256(b08Records) === EXPECTED.b08StateSha256
  && stateSetSha256(summitRecords) === EXPECTED.z11StateSha256,
'accepted B08/Z11/R07D/R07E/R07F source state drifted');

const haloRecords = await readStates(interactionHalo);
const haloViolations = haloRecords.filter(({ state }) => (
  isFluid(state)
  || GRAVITY_BLOCKS.has(blockName(state))
  || blockName(state).endsWith('_concrete_powder')
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
    if (insideBounds(point, haloBounds)) blockEntityHaloIntersections.push({
      id: entity.id ?? null,
      point,
    });
  }
  const entityChunk = await entityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entityChunk?.Entities ?? []) {
    if (savedEntityInside(entity, haloBounds)) savedEntityHaloIntersections.push({
      id: entity.id ?? null,
      position: entity.Pos.slice(0, 3).map(Number),
      chunk: chunkPoint,
    });
  }
}
invariant(blockEntityHaloIntersections.length === 0
  && savedEntityHaloIntersections.length === 0,
'guideway halo intersects a block entity or saved entity');
const protectedRelicHaloIntersections = protectedRelics.relics.filter((relic) => (
  interactionHalo.some((cell) => insideBounds(cell, relic.declaredInclusiveBounds))
));
invariant(protectedRelicHaloIntersections.length === 0,
'guideway halo intersects a protected relic');

const targetKeys = new Set(operatedUnion.map(cellKey));
const targetBounds = boundsOf(operatedUnion);
const priorReleaseIntersections = [];
const priorManifestPaths = fs.readdirSync(absolute('data/buildops'))
  .filter((name) => name.startsWith('combined-zones-') && name.endsWith('.release-manifest.json'))
  .map((name) => path.join('data/buildops', name))
  .filter((filename) => relative(filename) !== relative(path.join(OUT_DIR, `${BASENAME}.release-manifest.json`)))
  .sort();
for (const manifestPath of priorManifestPaths) {
  const priorManifest = readJson(manifestPath);
  if (priorManifest.transactionId === BASENAME) continue;
  for (const pkg of priorManifest.packages ?? []) {
    const declaredHash = priorManifest.operations?.[pkg.key]?.forwardSha256;
    if (declaredHash) {
      invariant(sha256(operationBody(pkg.forward)) === declaredHash,
        `${priorManifest.transactionId}/${pkg.key} operation body drifted`);
    }
    const overlaps = priorOperationIntersections(pkg.forward, targetKeys, targetBounds);
    if (overlaps.length > 0) priorReleaseIntersections.push({
      packageId: `${priorManifest.transactionId}/${pkg.key}`,
      operationPath: pkg.forward,
      ...classManifest(overlaps),
    });
  }
}
const expectedR07fPackageId =
  'combined-zones-r07f-b09-lower-guideway-segment-01/b09-lower-guideway-segment-01';
const declaredInternalSeamIntersections = priorReleaseIntersections.filter((item) => (
  item.packageId === expectedR07fPackageId
  && item.cellCount === EXPECTED.seamCellCount
  && item.coordinateSetSha256 === EXPECTED.seamSha256
));
const undeclaredPriorReleaseIntersections = priorReleaseIntersections.filter((item) => (
  !declaredInternalSeamIntersections.includes(item)
));
invariant(declaredInternalSeamIntersections.length === 1
  && undeclaredPriorReleaseIntersections.length === 0,
`prior-release intersection is not exactly the owned R07F far-cap seam: ${JSON.stringify(priorReleaseIntersections)}`);

const projected = new Map(accommodationRecords.map(({ cell, state }) => [cellKey(cell), state]));
for (const cell of segmentShell) projected.set(cellKey(cell), SHELL_STATE);
for (const cell of internalSeamOpening) projected.set(cellKey(cell), AIR_STATE);
const projectedBoundaryFailures = connectedVoidBoundary.filter((cell) => (
  projected.get(cellKey(cell)) !== SHELL_STATE
));
const projectedInteriorFailures = connectedVoid.filter((cell) => (
  projected.get(cellKey(cell)) !== AIR_STATE
));
invariant(projectedBoundaryFailures.length === 0
  && projectedInteriorFailures.length === 0,
'projected connected guideway is not complete air with a polished-diorite face boundary');

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
  status: 'COMPILED_FROM_LATEST_ACCEPTED_R07G_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B09'],
  packages: [{ key: PACKAGE_KEY, forward, rollback }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'Build all 2,152 shell cells and the complete new cap before opening the two-cell R07F far-cap seam; rollback reseals that seam before removing new shell.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'P1-B09-FUNICULAR-FRAMEWORK',
    purpose: 'Extend accepted B09 Segment 01 through its owned far-cap seam across the maximal remaining dry straight lower guideway, stopping fail-closed before curve index 240.',
    segmentSelection: {
      rule: 'LARGEST_CONTIGUOUS_DRY_STATIC_CARDINAL_RUN_BEFORE_FIRST_DIRECTION_CHANGE',
      firstInclusive: FIRST_CENTERLINE_INDEX,
      lastInclusive: LAST_CENTERLINE_INDEX,
      pointCount: segmentPoints.length,
      orderedSegmentSha256: orderedCenterlineSha256(segmentPoints),
      nextWithheldCenterlineIndex: 240,
      nextWithheldReason: 'FIRST_CURVE_REQUIRES_SEPARATE_DIRECTIONAL_SHELL_AND_CAP_PACKAGE',
      narrowedForFluidCellCount: 0,
      narrowedForGravityCellCount: 0,
      narrowedForEntityOrBlockEntityCount: 0,
      narrowedForRelicOrPriorConflictCount: 0,
    },
    geometry: {
      canonicalB09ConstructionDomain: classManifest(runningGuideway),
      canonicalB09InteractionDomain: classManifest(accommodation),
      priorSegmentEnvelope: classManifest(priorSegmentEnvelope),
      rawSegmentEnvelope: classManifest(rawSegmentEnvelope),
      newSegmentEnvelope: classManifest(newSegmentEnvelope),
      preservedSegmentInterior: classManifest(segmentInterior),
      staticSegmentShell: classManifest(segmentShell),
      ownedPriorFarCapSeamOpening: classManifest(internalSeamOpening),
      retainedPriorFarCapCollar: classManifest(priorFarCapCollar),
      newFarIsolationCap: classManifest(farIsolationCap),
      retainedFutureCurveSeam: classManifest(futureCurveSeam),
      connectedLowerStationAndSegmentsVoid: {
        ...classManifest(connectedVoid),
        ...connectivity,
      },
      connectedVoidFaceBoundary: classManifest(connectedVoidBoundary),
      b08PortalSeam: classManifest(b08PortalSeam),
      summitInterfaceCap: classManifest(summitInterfaceCap),
      interactionHalo: classManifest(interactionHalo),
    },
    ownership: {
      canonicalConstructionCellCount: runningGuideway.length,
      canonicalConstructionSha256: hashCells(runningGuideway),
      canonicalInteractionCellCount: accommodation.length,
      canonicalInteractionSha256: hashCells(accommodation),
      targetConstructionCellCount: operatedUnion.length,
      targetInteractionOnlyCellCount: 0,
      targetOutsideInteractionCellCount: 0,
    },
    materialDoctrine: {
      shellState: SHELL_STATE,
      source: 'R07F_STATIC_NON_GRAVITY_POLISHED_DIORITE_SHELL_DOCTRINE',
    },
    operationalBoundary: {
      priorFarCapOwnedAndOpened: true,
      priorFarCapCollarRetained: true,
      newFarIsolationCapBuiltClosed: true,
      futureCurveSeamBuiltClosed: true,
      firstCurveOpened: false,
      fartherGuidewayOpened: false,
      b08ExternalInterfaceTouched: false,
      summitExternalInterfaceTouched: false,
      r07dOperatedTouched: false,
      r07eOperatedTouched: false,
      r07fOperatedTouchedOnlyAtOwnedSeam: true,
      railOrVehicleInstalled: false,
      powerOrControlInstalled: false,
      brakeOrSafetyControlInstalled: false,
      drainageOrOutfallInstalled: false,
      rescueOrEgressCommissioned: false,
      funicularCommissioned: false,
      exactRollbackResealsPriorSeamFirst: true,
      exactRollbackRestoresR07GPostState: true,
    },
    sourcePartition: {
      operated: classManifest(operatedUnion),
      shellConstruction: classManifest(segmentShell),
      internalSeamOpening: classManifest(internalSeamOpening),
      preservedInterior: classManifest(connectedVoid),
      sourceStateCensus: stateCensus([...shellRecords, ...seamRecords]),
      desiredStateCensus: {
        [SHELL_STATE]: segmentShell.length,
        [AIR_STATE]: internalSeamOpening.length,
      },
      exactPartition: true,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    regionSnapshotSha256: sourceRegionIdentity.sha256,
    intakeAuditPath: INTAKE_AUDIT,
    predecessor: {
      transactionId: sourceLedger.transactionId,
      executionLedger: fileBinding(SOURCE_LEDGER),
      completedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
    },
    acceptedR07f: {
      manifestIdentity: r07fManifest.manifestIdentity,
      postQa: fileBinding(INPUTS.r07fQa),
      qaPayloadSha256: r07fQa.qaPayloadSha256,
      completedReleaseIdentitySha256: r07fQa.release.completedReleaseIdentitySha256,
    },
    b09CurrentState: {
      accommodation: {
        ...classManifest(accommodation),
        stateCensus: stateCensus(accommodationRecords),
        blockStateSetSha256: stateSetSha256(accommodationRecords),
      },
      r07dOperatedStateSetSha256: stateSetSha256(r07dRecords),
      r07eOperatedStateSetSha256: stateSetSha256(r07eRecords),
      r07fOperatedStateSetSha256: stateSetSha256(r07fRecords),
      b08InterfaceStateSetSha256: stateSetSha256(b08Records),
      z11InterfaceStateSetSha256: stateSetSha256(summitRecords),
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
  interfaces: {
    openedOwnedPriorFarCapSeam: classManifest(internalSeamOpening),
    retainedPriorFarCapCollar: classManifest(priorFarCapCollar),
    newFailClosedCap: classManifest(farIsolationCap),
    futureCurveSeamClosed: classManifest(futureCurveSeam),
    b08ExternalInterfaceTargetOverlap: classManifest(intersection(operatedUnion, b08PortalSeam)),
    z11ExternalInterfaceTargetOverlap: classManifest(intersection(operatedUnion, summitInterfaceCap)),
    r07dTargetOverlap: classManifest(intersection(
      operatedUnion,
      expandedManifestTargets(r07dManifest).map(({ cell }) => cell),
    )),
    r07eTargetOverlap: classManifest(intersection(
      operatedUnion,
      expandedManifestTargets(r07eManifest).map(({ cell }) => cell),
    )),
    r07fTargetOverlap: classManifest(intersection(
      operatedUnion,
      expandedManifestTargets(r07fManifest).map(({ cell }) => cell),
    )),
  },
  safetyAudit: {
    interactionHalo: classManifest(interactionHalo),
    haloStateCensus: stateCensus(haloRecords),
    fluidOrWaterloggedCount: haloRecords.filter(({ state }) => isFluid(state)).length,
    gravityCount: haloRecords.filter(({ state }) => (
      GRAVITY_BLOCKS.has(blockName(state)) || blockName(state).endsWith('_concrete_powder')
    )).length,
    forbiddenContainerOrControlCount: haloRecords.filter(({ state }) => (
      FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))
    )).length,
    blockEntityIntersectionCount: blockEntityHaloIntersections.length,
    savedEntityIntersectionCount: savedEntityHaloIntersections.length,
    protectedRelicIntersectionCount: protectedRelicHaloIntersections.length,
    priorReleaseIntersections,
    declaredPriorSeamIntersectionCount: declaredInternalSeamIntersections.length,
    undeclaredPriorReleaseIntersectionCount: undeclaredPriorReleaseIntersections.length,
    projectedInteriorMismatchCount: projectedInteriorFailures.length,
    projectedBoundaryMismatchCount: projectedBoundaryFailures.length,
  },
  hardSafetyKernelNext: [
    'fresh same-invocation complete source save',
    'exact source preflight and strict forward/rollback parser checks',
    'fresh live block-entity and entity clearance',
    'strict-noop execution with compensating rollback',
    'immutable post save and exact rollback-poststate preflight',
    'independent post-release connected-void, cap, interface, and drift QA',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifest = {
  ...manifestWithoutIdentity,
  manifestIdentity: sha256(JSON.stringify(manifestWithoutIdentity)),
};
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifest.status,
  manifest: relative(manifestPath),
  manifestIdentity: manifest.manifestIdentity,
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  centerlineRange: manifest.scope.segmentSelection,
  shellCellCount: segmentShell.length,
  seamOpeningCellCount: internalSeamOpening.length,
  operatedCellCount: operatedUnion.length,
  connectedVoidCellCount: connectedVoid.length,
  connectedBoundaryCellCount: connectedVoidBoundary.length,
  newFarCapCellCount: farIsolationCap.length,
  forward,
  rollback,
}, null, 2));
