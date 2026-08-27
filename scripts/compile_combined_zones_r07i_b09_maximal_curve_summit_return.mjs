#!/usr/bin/env node
/** Compile CZ-R07I: maximal B09 curve, face-ascent, and summit-return shell. */

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
const GENERATED_AT = value('--generated-at', '2026-08-21T18:50:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r08p-post-20260821T184147Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r08p-live-20260821T184147Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r08p-live-20260821T184147Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r07i-b09-maximal-curve-summit-return',
);
const RELEASE_ID = 'CZ-R07I-P1-B09-MAXIMAL-CURVE-SUMMIT-RETURN';
const RELEASE_NODE_ID = 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK';
const PACKAGE_KEY = 'b09-maximal-curve-summit-return';
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const FIRST_INDEX = 240;
const LAST_INDEX = 550;

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
  r07hManifest:
    'data/buildops/combined-zones-r07h-b09-lower-guideway-segment-02.release-manifest.json',
  r07hQa:
    'data/world-review/combined-zones-r07h-live-20260821T183544Z/r07h-post-release-qa.json',
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
  r07hManifestIdentitySha256:
    'a1797eff976b42649ba9dfc3cfa08112e85a6d06f73ca3a14427f6c3dc586416',
  r07hQaFileSha256:
    'b126e1c8acdfa6fd92cbae74d125c60e4f6fe9ebf137338e890fadb1d5f9c992',
  r07hQaPayloadSha256:
    'b849c99bf162da8bbd3eee063d4bab6699b04acaef73652b84612b07a25ed7ed',
  r07hCompletedReleaseIdentitySha256:
    '1990844b4371b48ed6e5e851ec986cc908e9d5ed030d9760e226c04d02dfe88f',
  b09TechnicalIdentitySha256:
    'e8738f3932f2afc3ba71e35ccdebf0d5ef444ca7389e81ec31a18e48517d3eba',
  selectedModelIdentitySha256:
    '735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6',
  centerlinePointCount: 561,
  centerlineSha256:
    'e8905742a77148d13d799362da7d65e9b02bcf96455d580fbee27367b2d24221',
  segmentPointCount: 311,
  segmentSha256:
    '020c118a77b14d85a454293c75ad9a62836bd0119044c5573e2286a1558ce67a',
  accommodationCellCount: 7800,
  accommodationSha256:
    'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  accommodationStateSha256:
    'b5f545101ceb768cc765daa9e668c2f6ffefa623864faba70db656cafb758b20',
  constructionCellCount: 7488,
  constructionSha256:
    'd9de4b923a8002dbd302116f4c928b6794d824ea616811d0ab2a3988ad32bb1f',
  routeSeedCellCount: 622,
  routeSeedSha256:
    '6297d5963c2209e0d63d0735c7991922c4273da239189ff3e3ebe34c2839f528',
  rawEnvelopeCellCount: 4740,
  rawEnvelopeSha256:
    '458ffbf146f525f25e5ceb87f663ab144099da2c514fe01364b00939972e3e54',
  newEnvelopeCellCount: 4710,
  newEnvelopeSha256:
    '2560e2ee80a39d6f5a9cc44c101b6c6c8fd06b96a558003a3c2295a8adb9cfca',
  newInteriorCellCount: 618,
  shellCellCount: 4092,
  shellSha256:
    '2c3a65ea063b9022450b183637ec9921c746a7f1d605900dfdc17c6787cff7aa',
  nominalSeamCellCount: 2,
  nominalSeamSha256:
    '6eb7dc1db3f3b65676aee14d6448032a4ffe8fb0e1bccb17f0d4d8f84436ebc4',
  turnApertureCellCount: 4,
  turnApertureSha256:
    '9991feda6e953dd4e66585d7e23a61723c3319cb59c22782196fab028f2c08bb',
  operatedCellCount: 4096,
  operatedSha256:
    'f33fd0ef5f5139261e5408429b2111271b1e776c18dd67c3932db2e6becc269b',
  connectedVoidCellCount: 1096,
  connectedVoidSha256:
    '2f808ddc7b077a2b256c56b96ba90631c0a94d26ac2b18b8e2da5e5660016855',
  boundaryCellCount: 3286,
  boundarySha256:
    '491ab71d982ad1ecce1eb1aea39b7e2bc487d04316c0764e51d6648ea041ab3f',
  summitCapCellCount: 12,
  summitCapSha256:
    '8ef484d874dca406f5a8abbc6dd8306ff2770ab304c10bddbc01db5c4107ad5c',
  haloCellCount: 12692,
  haloSha256:
    '1843cbf2d74b7b103ac58a769b6ef72c85b5cf09a26c5a2fe520b6282c0faaf1',
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
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:brewing_stand', 'minecraft:beacon',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block',
  'minecraft:jigsaw',
]);

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const samePath = (left, right) => absolute(left) === absolute(right);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R07I compiler rejected: ${message}`);
};
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
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
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => (
  FLUID_BLOCKS.has(blockName(state)) || state.includes('waterlogged=true')
);

function operationBody(filename) {
  return `${fs.readFileSync(absolute(filename), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
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
  return {
    componentCount: sizes.length,
    largestComponentCellCount: sizes[0] ?? 0,
    componentSizes: sizes,
  };
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

function expandedManifestTargets(manifest) {
  const targets = [];
  for (const pkg of manifest.packages ?? []) {
    for (const raw of fs.readFileSync(absolute(pkg.forward), 'utf8').split(/\r?\n/)) {
      if (!raw || raw.startsWith('#')) continue;
      const fields = raw.split(/\s+/);
      invariant(fields[0] === 'REPL' && fields.length === 9,
        `${pkg.forward} is not a pure guarded REPL package`);
      const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
          for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
            targets.push({ x, y, z });
          }
        }
      }
    }
  }
  return uniqueCells(targets);
}

const intake = readJson(INTAKE_AUDIT);
const sourceLedger = readJson(SOURCE_LEDGER);
const technical = readJson(INPUTS.b09Technical);
const connectors = readJson(INPUTS.connectorGeometry);
const d05 = readJson(INPUTS.d05Alternatives);
const protectedRelics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.standingAuthorization);
const releaseContract = readJson(INPUTS.releaseContract);
const r07dManifest = readJson(INPUTS.r07dManifest);
const r07eManifest = readJson(INPUTS.r07eManifest);
const r07fManifest = readJson(INPUTS.r07fManifest);
const r07hManifest = readJson(INPUTS.r07hManifest);
const r07hQa = readJson(INPUTS.r07hQa);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true
  && samePath(intake.input?.suppliedWorldRoot, SNAPSHOT)
  && intake.packageIdentity?.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256,
'source intake is not the selected immutable R08P post save');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}
invariant(fileBinding(SOURCE_LEDGER).sha256 === EXPECTED.sourceLedgerSha256
  && sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.completedReleaseIdentitySha256
    === EXPECTED.sourceCompletedReleaseIdentitySha256
  && sourceLedger.postSnapshot?.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256,
'R08P source ledger identity or completion drifted');
const sourceIdentity = readJson(sourceLedger.postSnapshot.identity.path);
invariant(sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
  && samePath(sourceIdentity.directory, path.join(SNAPSHOT, 'region')),
'R08P source region identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes?.includes(RELEASE_NODE_ID)
  && !authorization.mvpBoundary.excludedScopeIds.includes('P1-B09'),
'standing authorization does not cover P1-B09 under R07');
const r07Node = releaseContract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r07Node?.status?.startsWith('PARTIALLY_AS_BUILT'),
'R07 release node is not active for remaining scoped work');
invariant(technical.reportIdentitySha256 === EXPECTED.b09TechnicalIdentitySha256,
'frozen B09 technical identity drifted');
invariant(r07hManifest.manifestIdentity === EXPECTED.r07hManifestIdentitySha256
  && fileBinding(INPUTS.r07hQa).sha256 === EXPECTED.r07hQaFileSha256
  && r07hQa.status === 'PASS_R07H_B09_LOWER_GUIDEWAY_SEGMENT_02_POST_RELEASE_ACCEPTED'
  && r07hQa.qaPayloadSha256 === EXPECTED.r07hQaPayloadSha256
  && r07hQa.release?.completedReleaseIdentitySha256
    === EXPECTED.r07hCompletedReleaseIdentitySha256,
'accepted R07H identity or post-release QA drifted');

const selectedModel = d05.alternatives.find(
  ({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE',
);
invariant(selectedModel?.modelIdentitySha256 === EXPECTED.selectedModelIdentitySha256,
'selected FM-01 identity drifted');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const centerline = buildCenterline(selectedModel.formula, endpoints);
invariant(centerline.length === EXPECTED.centerlinePointCount
  && orderedCenterlineSha256(centerline) === EXPECTED.centerlineSha256,
'ordered FM-01 centerline drifted');
const segmentPoints = centerline.slice(FIRST_INDEX, LAST_INDEX + 1);
invariant(segmentPoints.length === EXPECTED.segmentPointCount
  && orderedCenterlineSha256(segmentPoints) === EXPECTED.segmentSha256
  && centerline[LAST_INDEX + 1].index === 551
  && centerline[LAST_INDEX + 1].x === 2048
  && centerline[LAST_INDEX + 1].y === 295
  && centerline[LAST_INDEX + 1].z === -819,
'maximal curve/summit-return selection drifted');

const accommodation = buildB09MinimumReservation(selectedModel.formula, endpoints);
const lowerEnvelope = cellsIn(
  technical.exactTechnicalReservationProposals.proposalLayers.lowerStationEnvelope.bounds,
);
const summitEnvelope = cellsIn(
  technical.exactTechnicalReservationProposals.proposalLayers.summitStationEnvelope.bounds,
);
const constructionDomain = difference(accommodation, [...lowerEnvelope, ...summitEnvelope]);
const r07hEnvelope = cellsIn(r07hManifest.scope.geometry.newSegmentEnvelope.bounds);
const routeSeeds = uniqueCells(segmentPoints.flatMap(({ x, y, z }) => [
  { x, y, z }, { x, y: y + 1, z },
]));
const rawEnvelope = dilateCells(routeSeeds, 1);
const newEnvelope = difference(rawEnvelope, [...r07hEnvelope, ...summitEnvelope]);
const newInterior = difference(routeSeeds, [...r07hEnvelope, ...summitEnvelope]);
const shell = difference(newEnvelope, routeSeeds);
const nominalR07hSeam = cellsIn({
  minX: 2288, maxX: 2288,
  minY: 130, maxY: 131,
  minZ: -748, maxZ: -748,
});
const turnAperture = cellsIn({
  minX: 2288, maxX: 2288,
  minY: 130, maxY: 131,
  minZ: -749, maxZ: -748,
});
const apertureExtension = difference(turnAperture, nominalR07hSeam);
const r07hFarCap = cellsIn(r07hManifest.scope.geometry.newFarIsolationCap.bounds);
const retainedR07hCollar = difference(r07hFarCap, turnAperture);
const operated = uniqueCells([...shell, ...turnAperture]);
const priorConnectedVoid = cellsIn({
  minX: 2051, maxX: 2287,
  minY: 130, maxY: 131,
  minZ: -748, maxZ: -748,
});
const connectedVoid = uniqueCells([...priorConnectedVoid, ...routeSeeds]);
const negativeTwoCellVoid = uniqueCells([
  ...priorConnectedVoid,
  ...nominalR07hSeam,
  ...newInterior,
]);
const connectedVoidKeys = new Set(connectedVoid.map(cellKey));
const boundary = uniqueCells(connectedVoid.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))
)).filter((cell) => !connectedVoidKeys.has(cellKey(cell))));
const summitApproachCap = cellsIn(
  r07eManifest.scope.geometry.guidewayApproachCap.bounds,
);
const retainedSummitSeam = cellsIn({
  minX: 2048, maxX: 2048,
  minY: 295, maxY: 296,
  minZ: -819, maxZ: -819,
});
const halo = dilateCells(operated, 1);
const connectivity = connectedComponents(connectedVoid);
const negativeConnectivity = connectedComponents(negativeTwoCellVoid);
const constructionKeys = new Set(constructionDomain.map(cellKey));

invariant(accommodation.length === EXPECTED.accommodationCellCount
  && hashCells(accommodation) === EXPECTED.accommodationSha256
  && constructionDomain.length === EXPECTED.constructionCellCount
  && hashCells(constructionDomain) === EXPECTED.constructionSha256
  && routeSeeds.length === EXPECTED.routeSeedCellCount
  && hashCells(routeSeeds) === EXPECTED.routeSeedSha256
  && rawEnvelope.length === EXPECTED.rawEnvelopeCellCount
  && hashCells(rawEnvelope) === EXPECTED.rawEnvelopeSha256
  && newEnvelope.length === EXPECTED.newEnvelopeCellCount
  && hashCells(newEnvelope) === EXPECTED.newEnvelopeSha256
  && newInterior.length === EXPECTED.newInteriorCellCount
  && shell.length === EXPECTED.shellCellCount
  && hashCells(shell) === EXPECTED.shellSha256
  && nominalR07hSeam.length === EXPECTED.nominalSeamCellCount
  && hashCells(nominalR07hSeam) === EXPECTED.nominalSeamSha256
  && turnAperture.length === EXPECTED.turnApertureCellCount
  && hashCells(turnAperture) === EXPECTED.turnApertureSha256
  && apertureExtension.length === 2
  && operated.length === EXPECTED.operatedCellCount
  && hashCells(operated) === EXPECTED.operatedSha256
  && connectedVoid.length === EXPECTED.connectedVoidCellCount
  && hashCells(connectedVoid) === EXPECTED.connectedVoidSha256
  && boundary.length === EXPECTED.boundaryCellCount
  && hashCells(boundary) === EXPECTED.boundarySha256
  && summitApproachCap.length === EXPECTED.summitCapCellCount
  && hashCells(summitApproachCap) === EXPECTED.summitCapSha256
  && halo.length === EXPECTED.haloCellCount
  && hashCells(halo) === EXPECTED.haloSha256,
'canonical route, shell, aperture, boundary, or cap geometry drifted');
invariant(connectivity.componentCount === 1
  && connectivity.largestComponentCellCount === connectedVoid.length,
'four-cell turn aperture does not produce one connected route');
invariant(negativeConnectivity.componentCount === 2
  && negativeConnectivity.componentSizes.join(',') === '618,476',
'two-cell negative control no longer proves the disconnected turn');
invariant(operated.every((cell) => constructionKeys.has(cellKey(cell)))
  && intersection(operated, summitApproachCap).length === 0,
'operation leaves B09 construction ownership or touches the R07E approach cap');

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
'R08P post is not exact-state equivalent to accepted R07H across B09');
const byKey = new Map(accommodationRecords.map((record) => [cellKey(record.cell), record.state]));
const recordsFor = (cells) => cells.map((cell) => ({ cell, state: byKey.get(cellKey(cell)) }));
const shellRecords = recordsFor(shell);
const apertureRecords = recordsFor(turnAperture);
const interiorRecords = recordsFor(newInterior);
const retainedCollarRecords = recordsFor(retainedR07hCollar);
const summitCapRecords = recordsFor(summitApproachCap);
invariant(shellRecords.every(({ state }) => state === AIR),
'shell source is not exact air');
invariant(apertureRecords.every(({ state }) => state === DIORITE),
'four-cell R07H turn aperture source is not exact polished diorite');
invariant(interiorRecords.every(({ state }) => state === AIR),
'preserved new route interior is obstructed');
invariant(retainedCollarRecords.every(({ state }) => state === DIORITE),
'retained R07H cap collar is incomplete');
invariant(summitCapRecords.every(({ state }) => state === DIORITE),
'R07E guideway-approach cap is not fail-closed');

const haloRecords = await readStates(halo);
const haloViolations = haloRecords.filter(({ state }) => (
  isFluid(state)
  || GRAVITY_BLOCKS.has(blockName(state))
  || blockName(state).endsWith('_concrete_powder')
  || FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))
));
invariant(haloViolations.length === 0,
  `protected block class exists in route halo: ${JSON.stringify(haloViolations.slice(0, 20))}`);
const haloBounds = boundsOf(halo);
const touchedChunks = [];
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    touchedChunks.push({ x: cx, z: cz });
  }
}
const blockEntityIntersections = [];
const savedEntityIntersections = [];
for (const chunkPoint of touchedChunks) {
  const chunk = await reader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (insideBounds(point, haloBounds)) blockEntityIntersections.push({ id: entity.id, point });
  }
  const entityChunk = await entityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entityChunk?.Entities ?? []) {
    if (savedEntityInside(entity, haloBounds)) savedEntityIntersections.push({
      id: entity.id ?? null,
      position: entity.Pos.slice(0, 3).map(Number),
      chunk: chunkPoint,
    });
  }
}
invariant(blockEntityIntersections.length === 0 && savedEntityIntersections.length === 0,
'route halo intersects a block entity or saved entity');
const relicIntersections = protectedRelics.relics.filter((relic) => (
  halo.some((cell) => insideBounds(cell, relic.declaredInclusiveBounds))
));
invariant(relicIntersections.length === 0, 'route halo intersects a protected relic');

const targetKeys = new Set(operated.map(cellKey));
const targetBounds = boundsOf(operated);
const priorReleaseIntersections = [];
for (const name of fs.readdirSync(absolute('data/buildops'))
  .filter((entry) => entry.startsWith('combined-zones-')
    && entry.endsWith('.release-manifest.json'))
  .sort()) {
  const priorManifestPath = path.join('data/buildops', name);
  const priorManifest = readJson(priorManifestPath);
  if (priorManifest.transactionId === BASENAME) continue;
  for (const pkg of priorManifest.packages ?? []) {
    const declaredHash = priorManifest.operations?.[pkg.key]?.forwardSha256;
    if (declaredHash) invariant(sha256(operationBody(pkg.forward)) === declaredHash,
      `${priorManifest.transactionId}/${pkg.key} operation body drifted`);
    const overlaps = priorOperationIntersections(pkg.forward, targetKeys, targetBounds);
    if (overlaps.length) priorReleaseIntersections.push({
      packageId: `${priorManifest.transactionId}/${pkg.key}`,
      operationPath: pkg.forward,
      ...classManifest(overlaps),
    });
  }
}
const expectedR07hPackage =
  'combined-zones-r07h-b09-lower-guideway-segment-02/b09-lower-guideway-segment-02';
invariant(priorReleaseIntersections.length === 1
  && priorReleaseIntersections[0].packageId === expectedR07hPackage
  && priorReleaseIntersections[0].cellCount === EXPECTED.turnApertureCellCount
  && priorReleaseIntersections[0].coordinateSetSha256 === EXPECTED.turnApertureSha256,
`prior intersection is not the exact reviewed four-cell R07H turn aperture: ${JSON.stringify(priorReleaseIntersections)}`);

const projected = new Map(accommodationRecords.map(({ cell, state }) => [cellKey(cell), state]));
for (const cell of shell) projected.set(cellKey(cell), DIORITE);
for (const cell of turnAperture) projected.set(cellKey(cell), AIR);
const projectedInteriorFailures = connectedVoid.filter(
  (cell) => projected.get(cellKey(cell)) !== AIR,
);
const projectedBoundaryFailures = boundary.filter(
  (cell) => projected.get(cellKey(cell)) !== DIORITE,
);
invariant(projectedInteriorFailures.length === 0 && projectedBoundaryFailures.length === 0,
'projected route is not connected air behind a complete polished-diorite boundary');
const r07dStateRecords = await readStates(expandedManifestTargets(r07dManifest));
const r07eStateRecords = await readStates(expandedManifestTargets(r07eManifest));
const r07fStateRecords = await readStates(expandedManifestTargets(r07fManifest));
const r07hStateRecords = await readStates(expandedManifestTargets(r07hManifest));

const forwardOperations = [
  ...shell.map((cell) => ({ cell, fromState: AIR, toState: DIORITE })),
  ...turnAperture.map((cell) => ({ cell, fromState: DIORITE, toState: AIR })),
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
const forwardBodySha256 = sha256(forwardBody);
const rollbackBodySha256 = sha256(rollbackBody);
const forward = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# target coordinate-set SHA-256: ${hashCells(operated)}`,
  `# operation SHA-256: ${operationSha256}`,
  '',
].join('\n');
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(forward), `${header('forward', forwardBodySha256)}${forwardBody}`);
fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackBodySha256)}${rollbackBody}`);

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_LATEST_ACCEPTED_R08P_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B09'],
  packages: [{ key: PACKAGE_KEY, forward, rollback }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'Build 4,092 shell cells and preserve the R07E approach cap before opening the reviewed four-cell R07H turn aperture; rollback reseals all four aperture cells first.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'P1-B09-FUNICULAR-FRAMEWORK',
    purpose: 'Build the maximal dry B09 curve, face-ascent, and summit-return shell from accepted R07H to the retained fail-closed R07E approach cap.',
    segmentSelection: {
      rule: 'MAXIMAL_CONTIGUOUS_DRY_STATIC_ROUTE_TO_ACCEPTED_R07E_FAIL_CLOSED_CAP',
      firstInclusive: FIRST_INDEX,
      lastInclusive: LAST_INDEX,
      pointCount: segmentPoints.length,
      orderedSegmentSha256: orderedCenterlineSha256(segmentPoints),
      withheldSummitApproachIndex: 551,
      retainedApproachCapClosed: true,
    },
    geometry: {
      canonicalB09ConstructionDomain: classManifest(constructionDomain),
      canonicalB09InteractionDomain: classManifest(accommodation),
      acceptedR07hEnvelope: classManifest(r07hEnvelope),
      acceptedR07eSummitEnvelope: classManifest(summitEnvelope),
      routeSeeds: classManifest(routeSeeds),
      rawSegmentEnvelope: classManifest(rawEnvelope),
      newSegmentEnvelope: classManifest(newEnvelope),
      preservedNewInterior: classManifest(newInterior),
      staticSegmentShell: classManifest(shell),
      nominalR07hTwoCellSeam: classManifest(nominalR07hSeam),
      requiredTurnApertureExtension: classManifest(apertureExtension),
      ownedR07hFourCellTurnAperture: classManifest(turnAperture),
      retainedR07hFarCapCollar: classManifest(retainedR07hCollar),
      connectedLowerStationAndGuidewayVoid: {
        ...classManifest(connectedVoid),
        componentCount: connectivity.componentCount,
        largestComponentCellCount: connectivity.largestComponentCellCount,
      },
      nominalTwoCellNegativeControl: {
        ...classManifest(negativeTwoCellVoid),
        componentCount: negativeConnectivity.componentCount,
        componentSizes: negativeConnectivity.componentSizes,
      },
      connectedVoidFaceBoundary: classManifest(boundary),
      retainedR07eApproachCap: classManifest(summitApproachCap),
      retainedFutureSummitSeam: classManifest(retainedSummitSeam),
      interactionHalo: classManifest(halo),
    },
    ownership: {
      canonicalConstructionCellCount: constructionDomain.length,
      canonicalConstructionSha256: hashCells(constructionDomain),
      canonicalInteractionCellCount: accommodation.length,
      canonicalInteractionSha256: hashCells(accommodation),
      targetConstructionCellCount: operated.filter((cell) => constructionKeys.has(cellKey(cell))).length,
      targetInteractionOnlyCellCount: 0,
      targetOutsideInteractionCellCount: 0,
      reviewedR07hInternalSeamMigrationCellCount: turnAperture.length,
    },
    materialDoctrine: {
      shellState: DIORITE,
      source: 'R07F_R07H_STATIC_NON_GRAVITY_POLISHED_DIORITE_SHELL_DOCTRINE',
    },
    connectivityDoctrine: {
      nominalTwoCellSeamRejected: true,
      nominalTwoCellComponentCount: negativeConnectivity.componentCount,
      nominalTwoCellComponentSizes: negativeConnectivity.componentSizes,
      exactFourCellApertureRequired: true,
      exactFourCellApertureComponentCount: connectivity.componentCount,
      authority: 'INDEPENDENT_ONE_COMPONENT_ROUTE_PROOF_CONTROLS_OVER_NOMINAL_SEAM_LABEL',
    },
    operationalBoundary: {
      r07hTurnApertureOpened: true,
      r07hEightCellCollarRetained: true,
      r07eApproachCapTouched: false,
      r07eApproachCapClosed: true,
      summitHeadhouseOpened: false,
      z11InterfaceTouched: false,
      railOrVehicleInstalled: false,
      powerControlOrBrakeInstalled: false,
      drainageOrOutfallInstalled: false,
      rescueOrEgressCommissioned: false,
      funicularCommissioned: false,
      exactRollbackResealsFourCellApertureFirst: true,
      exactRollbackRestoresR08pPostState: true,
    },
    sourcePartition: {
      operated: classManifest(operated),
      shellConstruction: classManifest(shell),
      internalTurnApertureOpening: classManifest(turnAperture),
      preservedNewInterior: classManifest(newInterior),
      sourceStateCensus: {
        [AIR]: shell.length,
        [DIORITE]: turnAperture.length,
      },
      desiredStateCensus: {
        [DIORITE]: shell.length,
        [AIR]: turnAperture.length,
      },
      exactPartition: true,
    },
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    regionSnapshotSha256: sourceIdentity.sha256,
    intakeAudit: fileBinding(INTAKE_AUDIT),
    predecessor: {
      transactionId: sourceLedger.transactionId,
      executionLedger: fileBinding(SOURCE_LEDGER),
      completedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
    },
    acceptedR07h: {
      manifestIdentity: r07hManifest.manifestIdentity,
      postQa: fileBinding(INPUTS.r07hQa),
      qaPayloadSha256: r07hQa.qaPayloadSha256,
      completedReleaseIdentitySha256: r07hQa.release.completedReleaseIdentitySha256,
    },
    disjointRebaseProof: {
      baseline: 'R07H_POST',
      terminal: 'R08P_POST',
      b09StateSetSha256: stateSetSha256(accommodationRecords),
      matchesAcceptedR07hPost: true,
    },
    b09CurrentState: {
      accommodation: {
        ...classManifest(accommodation),
        stateCensus: stateCensus(accommodationRecords),
        blockStateSetSha256: stateSetSha256(accommodationRecords),
      },
      r07dTargetStateSetSha256: stateSetSha256(r07dStateRecords),
      r07eTargetStateSetSha256: stateSetSha256(r07eStateRecords),
      r07fTargetStateSetSha256: stateSetSha256(r07fStateRecords),
      r07hTargetStateSetSha256: stateSetSha256(r07hStateRecords),
    },
    touchedChunkCount: touchedChunks.length,
  },
  target: {
    operatedUnion: classManifest(operated),
    desiredStateCensus: { [DIORITE]: shell.length, [AIR]: turnAperture.length },
    packageTargetsDisjoint: true,
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256: forwardBodySha256,
      rollbackSha256: rollbackBodySha256,
      forwardCommandCount: forwardOperations.length,
      rollbackCommandCount: rollbackOperations.length,
      targetCellCount: operated.length,
      targetCoordinateSetSha256: hashCells(operated),
      exactInverse: true,
      reverseOrderInverse: true,
      oneCellGuards: true,
      shellBeforeOpening: true,
      rollbackResealsBeforeShellRemoval: true,
    },
  },
  interfaces: {
    nominalR07hSeam: classManifest(nominalR07hSeam),
    reviewedR07hApertureExtension: classManifest(apertureExtension),
    openedOwnedR07hTurnAperture: classManifest(turnAperture),
    retainedR07hFarCapCollar: classManifest(retainedR07hCollar),
    retainedR07eApproachCap: classManifest(summitApproachCap),
    retainedFutureSummitSeam: classManifest(retainedSummitSeam),
  },
  safetyAudit: {
    interactionHalo: classManifest(halo),
    haloStateCensus: stateCensus(haloRecords),
    fluidOrWaterloggedCount: haloRecords.filter(({ state }) => isFluid(state)).length,
    gravityCount: haloRecords.filter(({ state }) => (
      GRAVITY_BLOCKS.has(blockName(state)) || blockName(state).endsWith('_concrete_powder')
    )).length,
    forbiddenContainerOrControlCount: haloRecords.filter(
      ({ state }) => FORBIDDEN_SOURCE_BLOCKS.has(blockName(state)),
    ).length,
    blockEntityIntersectionCount: blockEntityIntersections.length,
    savedEntityIntersectionCount: savedEntityIntersections.length,
    protectedRelicIntersectionCount: relicIntersections.length,
    priorReleaseIntersections,
    declaredR07hTurnApertureIntersectionCount: 1,
    undeclaredPriorReleaseIntersectionCount: 0,
    nominalTwoCellNegativeComponentCount: negativeConnectivity.componentCount,
    projectedConnectedComponentCount: connectivity.componentCount,
    projectedInteriorMismatchCount: projectedInteriorFailures.length,
    projectedBoundaryMismatchCount: projectedBoundaryFailures.length,
  },
  hardSafetyKernelNext: [
    'fresh same-invocation complete source save',
    'exact source preflight and strict forward/rollback parser checks',
    'fresh live block-entity and entity clearance',
    'strict-noop execution with compensating rollback',
    'immutable post save and exact rollback-poststate preflight',
    'independent post-release route, boundary, cap, interface, and drift QA',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
const manifest = { ...manifestWithoutIdentity, manifestIdentity };
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({
  status: manifest.status,
  transactionId: BASENAME,
  manifestIdentity,
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  sourceRegionSha256: sourceIdentity.sha256,
  operationCount: forwardOperations.length,
  shellCellCount: shell.length,
  turnApertureCellCount: turnAperture.length,
  nominalTwoCellNegativeComponents: negativeConnectivity.componentSizes,
  connectedVoidCellCount: connectedVoid.length,
  connectedBoundaryCellCount: boundary.length,
  retainedApproachCapCellCount: summitApproachCap.length,
  haloCellCount: halo.length,
  forward,
  rollback,
  manifest: manifestPath,
}, null, 2));
