#!/usr/bin/env node
/** Compile CZ-R12E: isolated upper level-cardinal passive B09 rail. */

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
const GENERATED_AT = value('--generated-at', '2026-08-22T01:10:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-r12d-post-20260822T005835Z');
const INTAKE = value(
  '--intake-audit',
  'data/world-review/combined-zones-r12d-live-20260822T005835Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r12d-live-20260822T005835Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r12e-b09-isolated-upper-level-cardinal-passive-rail',
);
const RELEASE_ID = 'CZ-R12E-P1-B09-ISOLATED-UPPER-LEVEL-CARDINAL-PASSIVE-RAIL';
const RELEASE_NODE_ID = 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING';
const PACKAGE_KEY = 'b09-isolated-upper-level-cardinal-passive-rail';
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const PASSIVE_RAIL = 'minecraft:rail[shape=east_west,waterlogged=false]';
const R12D_RAIL = 'minecraft:rail[shape=north_south,waterlogged=false]';
const GRAVITY_BLOCKS = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:dragon_egg',
]);
const MECHANISM_BLOCKS = new Set([
  'minecraft:rail', 'minecraft:powered_rail', 'minecraft:detector_rail',
  'minecraft:activator_rail', 'minecraft:redstone_wire',
  'minecraft:redstone_torch', 'minecraft:redstone_wall_torch',
  'minecraft:repeater', 'minecraft:comparator', 'minecraft:piston',
  'minecraft:sticky_piston', 'minecraft:observer', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:hopper',
]);
const CONTAINER_OR_CONTROL = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox',
  'minecraft:beehive', 'minecraft:bee_nest', 'minecraft:decorated_pot',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block',
]);
const INPUTS = Object.freeze({
  technical: 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  currentState: 'docs/masterplans/05-combined-zones/CURRENT-STATE.md',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  authorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  relics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  r07eManifest: 'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
  r07iManifest: 'data/buildops/combined-zones-r07i-b09-maximal-curve-summit-return.release-manifest.json',
  r12cManifest:
    'data/buildops/combined-zones-r12c-b09-isolated-lower-straight-passive-rail-design-freeze.release-manifest.json',
  r12dManifest:
    'data/buildops/combined-zones-r12d-b09-isolated-hairpin-cardinal-passive-rail.release-manifest.json',
  r12dQa: 'data/world-review/combined-zones-r12d-live-20260822T005835Z/r12d-post-release-qa.json',
});
const EXPECTED = Object.freeze({
  sourceComplete: '87966eef0a9e3ca695820f521ca2311c01ad7d6b199ee6ef57c6201cc97ee804',
  sourceRegion: '28ccb2dd338522e98e2a734d91670c3eb5f52a1adfc695584ba3286f6d8a90f6',
  sourceLedger: '4aae15af18c8d895832808ad6d3062349cc33742b05d386cef0d2a5b9a158b12',
  sourceCompleted: '97ff44527f857241316f425e563f639bea1c96b52b9b839f1e77089a04b225b2',
  sourceQa: '4c09c53120024049cb667d67400944593e7314bee5cea901f78c7b1355a82889',
  sourceQaPayload: '56aceba3fa84b1a6508398daf2a34269aee2a992e3fc205dbc0306ad73ac1a4a',
  technical: 'f9b57fb317ff983acacbf98cb0a7776246c242025f583d9795594a6a799898c8',
  technicalIdentity: 'e8738f3932f2afc3ba71e35ccdebf0d5ef444ca7389e81ec31a18e48517d3eba',
  connectors: '8bb2dd803c434667dfeee440ccdf8428a115962e21dd1b3b0e6955cce672dc4e',
  d05: '1446c75cec504478130a8e9c5569c68c7a7569a29c4210e9b21ca5d804aeb2f3',
  contract: '64f4432f00bd31fe8e5cd12921cd91bdc84b32c5c16630e62138accdf94ed8e0',
  authorization: 'd3b5f17862074080ae9db81e2932c56f6e96c926979748f8a3bcc09c22b3ad1a',
  relics: '1739502e8bf19283cabfe9930f26011dba97c11e6328da27ee0b7f651f7a0a22',
  r12cManifest: 'de097788b3f93bfb3ac0364e17fc07424801a8eb59cdd769758da9c9831e4a91',
  r12dManifest: 'bba29822282eb5de5276f86f5a11f01a4a8018b288d73a3955f36f089eff0af1',
  r07eManifest: '454fb9a8cf32550ccf7547921ffe23e5b04dc0fa5aa514ae4ba778b428edf28b',
  modelIdentity: '735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6',
  centerline: 'e8905742a77148d13d799362da7d65e9b02bcf96455d580fbee27367b2d24221',
  railDatum: '91b5174e01bde419175c68997f199f01b04ee38cbde13304ab4dd9a0d0d979b8',
  target: '71956640b587c6e2b749b168a8c6fe39638c766f323aac657c2f3e95d367456f',
  support: '87d9d86b31be26e360ada4625292f9368a0a90b39b0a80a69114c53f4e0fd376',
  headroom: '91c6eb7567ab5a32c1cfb78895d80a9305beebde989742b6a06ec77091969aa0',
  isolationGaps: '77a4f0337320256a28cd355e9b1427f9b9c192f6526369797be9799de1dd82d8',
  halo: 'b810bd53c0fe08c99fb7e756f8a416cf246d57160b01bfeb86c9e62b7434e7ee',
  haloState: '555ce3d8eb372bf3f7c620be2cab713a7003159f048903bd999ac22202631ac3',
  accommodation: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  accommodationState: '84c25bde1ce5d62bb2647f4d8cf087b4c6caa44ab02d43efebf1dc2f72765bc4',
  turns: 'e7a5d7a677a739f95f4ed7f07bcd30b272b60d487f3888a43a120545be072151',
  verticalTransitions: 'b40a9549a923bbcc832732f522cb03d790980090636a9c0758fbcf8f1741bb16',
  remainingLowerStationRun: 'd7f9071fd36633f66b9830f6677e6a5c813b1d5ced67157ca84c0b9eaa521920',
  lowerCap: 'a422d177fb7f1571b8a6243fcbf014fda17a910e60e7c03f7c21051f697a3e96',
  summitCap: 'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12E B09 passive-rail compiler rejected: ${message}`);
};
const fileBinding = (filename) => ({
  path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))), bytes: fs.statSync(abs(filename)).size,
});
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null, coordinateSetSha256: hashCells(exact) };
};
const stateBase = (state) => state.split('[', 1)[0];
const stateCensus = (records) => Object.fromEntries([...records.reduce(
  (counts, { state }) => counts.set(state, (counts.get(state) ?? 0) + 1), new Map(),
).entries()].sort(([left], [right]) => left.localeCompare(right)));
const stateSetHash = (records) => sha256(`combined-zones-current-block-state-set-v1\n${records
  .slice().sort((left, right) => left.cell.x - right.cell.x
    || left.cell.y - right.cell.y || left.cell.z - right.cell.z)
  .map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);
const isFluid = (state) => ['minecraft:water', 'minecraft:lava'].includes(stateBase(state))
  || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY_BLOCKS.has(stateBase(state))
  || stateBase(state).endsWith('_concrete_powder') || stateBase(state).endsWith('_anvil');

function orderedCenterlineSha256(points) {
  const lines = points.map((point) => `${point.index}:${point.x},${point.y},${point.z}:${point.kind}`);
  return sha256(`combined-zones-ordered-centerline-v1\n${lines.join('\n')}\n`);
}

function buildCenterline(model, endpoints) {
  const portal = endpoints.from;
  const summit = endpoints.to;
  let climbZ = portal.z - 1;
  while (climbZ > summit.z
    && mountainSurfaceY(portal.x, climbZ - 1, model) !== mountainSurfaceY(portal.x, climbZ, model)) climbZ -= 1;
  let throatX = null;
  for (let distance = 1; distance <= model.extents.east; distance += 1) {
    const x = portal.x + distance;
    if (mountainSurfaceY(x, climbZ, model) === portal.y - 1
      && mountainSurfaceY(x - 1, climbZ, model) === portal.y - 1) {
      throatX = x;
      break;
    }
  }
  invariant(throatX !== null, 'could not reproduce exact east-face throat');
  const faceRun = throatX - portal.x;
  const points = [];
  for (let distance = 0; distance <= faceRun; distance += 1) {
    points.push({ x: portal.x + distance, y: portal.y, z: portal.z,
      kind: distance === 0 ? 'portal-interface' : 'level-station-throat' });
  }
  for (let offset = 1; offset <= portal.z - climbZ; offset += 1) {
    points.push({ x: throatX, y: portal.y, z: portal.z - offset, kind: 'level-hairpin' });
  }
  for (let distance = 1; distance <= faceRun; distance += 1) {
    const x = throatX - distance;
    points.push({ x, y: mountainSurfaceY(x, climbZ, model) + 1, z: climbZ,
      kind: distance === 1 ? 'level-hairpin-exit' : 'face-ascent' });
  }
  for (let distance = 1; distance <= Math.abs(summit.z - climbZ); distance += 1) {
    const z = climbZ - distance;
    points.push({ x: summit.x, y: mountainSurfaceY(summit.x, z, model) + 1, z,
      kind: distance === 1 ? 'level-summit-curve-exit'
        : z === summit.z ? 'summit-interface' : 'summit-ascent' });
  }
  return points.map((point, index) => ({ ...point, index }));
}

function edge(points, index) {
  if (index < 0 || index >= points.length - 1) return null;
  const from = points[index];
  const to = points[index + 1];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  return { dx, dy, dz, axis: dx ? 'X' : dz ? 'Z' : 'NONE', manhattan: Math.abs(dx) + Math.abs(dy) + Math.abs(dz) };
}

function classifyRemainingLevelRuns(points, installedIndices) {
  const excluded = new Map();
  const turnCells = [];
  const verticalTransitionCells = [];
  for (let index = 0; index < points.length; index += 1) {
    const previous = edge(points, index - 1);
    const next = edge(points, index);
    if (previous && next && previous.dy === 0 && next.dy === 0 && previous.axis !== next.axis) {
      excluded.set(index, 'TURN');
      turnCells.push(points[index]);
    }
    if (next && next.dy !== 0) {
      excluded.set(index, 'VERTICAL_TRANSITION_LOWER');
      verticalTransitionCells.push(points[index]);
    }
  }
  const available = points.map((_, index) => !installedIndices.has(index) && !excluded.has(index));
  const runs = [];
  let index = 0;
  while (index < points.length) {
    if (!available[index]) { index += 1; continue; }
    let end = index;
    let axis = null;
    while (end < points.length - 1 && available[end + 1]) {
      const transition = edge(points, end);
      if (transition.dy !== 0 || transition.manhattan !== 1) break;
      if (axis === null) axis = transition.axis;
      if (transition.axis !== axis) break;
      end += 1;
    }
    if (end > index) {
      runs.push({
        firstCenterlineIndex: index,
        lastCenterlineIndex: end,
        cellCount: end - index + 1,
        axis,
        y: points[index].y,
        coordinateSetSha256: hashCells(points.slice(index, end + 1)),
        hasLeftAirGap: index > 0 && !installedIndices.has(index - 1),
        hasRightAirGap: end < points.length - 1 && !installedIndices.has(end + 1),
      });
    }
    index = end + 1;
  }
  return { excluded, turnCells, verticalTransitionCells, runs };
}

function operationIntersection(filename, targetCells) {
  const hits = [];
  for (const raw of fs.readFileSync(abs(filename), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const fields = raw.split(/\s+/);
    const box = fields.slice(1, 7).map(Number);
    for (const cell of targetCells) {
      if (cell.x >= Math.min(box[0], box[3]) && cell.x <= Math.max(box[0], box[3])
        && cell.y >= Math.min(box[1], box[4]) && cell.y <= Math.max(box[1], box[4])
        && cell.z >= Math.min(box[2], box[5]) && cell.z <= Math.max(box[2], box[5])) hits.push(cell);
    }
  }
  return uniqueCells(hits);
}

const intake = readJson(INTAKE);
const ledger = readJson(SOURCE_LEDGER);
const regionIdentity = readJson(ledger.postSnapshot.identity.path);
const technical = readJson(INPUTS.technical);
const connectors = readJson(INPUTS.connectors);
const d05 = readJson(INPUTS.d05);
const contract = readJson(INPUTS.releaseContract);
const authorization = readJson(INPUTS.authorization);
const relics = readJson(INPUTS.relics);
const r07i = readJson(INPUTS.r07iManifest);
const r12c = readJson(INPUTS.r12cManifest);
const r12d = readJson(INPUTS.r12dManifest);
const r12dQa = readJson(INPUTS.r12dQa);
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary.passed && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceComplete
  && abs(intake.input.suppliedWorldRoot) === abs(SNAPSHOT), 'source intake mismatch');
invariant(fileBinding(SOURCE_LEDGER).sha256 === EXPECTED.sourceLedger
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
  && abs(ledger.postSnapshot.root) === abs(SNAPSHOT), 'source ledger mismatch');
invariant(regionIdentity.sha256 === EXPECTED.sourceRegion, 'source region identity mismatch');
invariant(fileBinding(INPUTS.r12dQa).sha256 === EXPECTED.sourceQa
  && r12dQa.qaPayloadSha256 === EXPECTED.sourceQaPayload && r12dQa.summary.passed
  && !r12dQa.disposition.funicularCommissioned, 'R12D post-QA binding drifted');
invariant(fileBinding(INPUTS.r12cManifest).sha256 === EXPECTED.r12cManifest
  && fileBinding(INPUTS.r12dManifest).sha256 === EXPECTED.r12dManifest
  && ledger.manifest.sha256 === EXPECTED.r12dManifest, 'predecessor manifest binding drifted');
invariant(fileBinding(INPUTS.technical).sha256 === EXPECTED.technical
  && technical.reportIdentitySha256 === EXPECTED.technicalIdentity
  && fileBinding(INPUTS.connectors).sha256 === EXPECTED.connectors
  && fileBinding(INPUTS.d05).sha256 === EXPECTED.d05
  && fileBinding(INPUTS.releaseContract).sha256 === EXPECTED.contract
  && fileBinding(INPUTS.authorization).sha256 === EXPECTED.authorization
  && fileBinding(INPUTS.relics).sha256 === EXPECTED.relics
  && fileBinding(INPUTS.r07eManifest).sha256 === EXPECTED.r07eManifest,
'frozen design input identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION' && !authorization.revoked
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID), 'R12 standing authorization absent');
invariant(contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID)
  ?.canonicalOwners.includes('Z11-FUNICULAR-OPERATIONS'), 'R12 canonical ownership absent');
invariant(fs.readFileSync(abs(INPUTS.currentState), 'utf8').includes('R12D · B09 isolated hairpin cardinal rail'),
'CURRENT-STATE does not record R12D');

const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
invariant(model.modelIdentitySha256 === EXPECTED.modelIdentity, 'selected model drifted');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const centerline = buildCenterline(model.formula, endpoints);
const fullRailDatum = centerline.map(({ x, y, z }) => ({ x, y, z }));
invariant(centerline.length === 561 && orderedCenterlineSha256(centerline) === EXPECTED.centerline
  && hashCells(fullRailDatum) === EXPECTED.railDatum, 'accepted B09 centerline drifted');
const installedIndices = new Set([
  ...Array.from({ length: 231 }, (_, index) => index + 9),
  ...Array.from({ length: 19 }, (_, index) => index + 241),
]);
const inventory = classifyRemainingLevelRuns(centerline, installedIndices);
invariant(inventory.turnCells.length === 3 && hashCells(inventory.turnCells) === EXPECTED.turns
  && inventory.verticalTransitionCells.length === 174
  && hashCells(inventory.verticalTransitionCells) === EXPECTED.verticalTransitions
  && inventory.runs.length === 2
  && inventory.runs[0].firstCenterlineIndex === 0 && inventory.runs[0].lastCenterlineIndex === 8
  && inventory.runs[0].coordinateSetSha256 === EXPECTED.remainingLowerStationRun
  && inventory.runs[1].firstCenterlineIndex === 420 && inventory.runs[1].lastCenterlineIndex === 499
  && inventory.runs[1].coordinateSetSha256 === EXPECTED.target,
'remaining level-cardinal inventory drifted');
const isolatedRuns = inventory.runs.filter(({ hasLeftAirGap, hasRightAirGap }) => hasLeftAirGap && hasRightAirGap);
invariant(isolatedRuns.length === 1 && isolatedRuns[0].cellCount === 80,
'selected run is not the unique largest independently isolated level-cardinal run');
const selectedPoints = centerline.slice(420, 500);
const target = selectedPoints.map(({ x, y, z }) => ({ x, y, z }));
const support = target.map(({ x, y, z }) => ({ x, y: y - 1, z }));
const headroom = target.map(({ x, y, z }) => ({ x, y: y + 1, z }));
const isolationGaps = [centerline[419], centerline[500]].map(({ x, y, z }) => ({ x, y, z }));
const halo = dilateCells(target, 1);
const accommodation = buildB09MinimumReservation(model.formula, endpoints);
const r12cRail = cellsIn(r12c.target.operatedUnion.bounds);
const r12dRail = cellsIn(r12d.target.operatedUnion.bounds);
const lowerCap = cellsIn(r12c.scope.geometry.retainedLowerB08Cap.bounds);
const summitManifest = readJson(INPUTS.r07eManifest);
const summitCap = cellsIn(summitManifest.scope.geometry.summitInterfaceCap.bounds);
invariant(target.length === 80 && hashCells(target) === EXPECTED.target
  && support.length === 80 && hashCells(support) === EXPECTED.support
  && headroom.length === 80 && hashCells(headroom) === EXPECTED.headroom
  && isolationGaps.length === 2 && hashCells(isolationGaps) === EXPECTED.isolationGaps
  && halo.length === 738 && hashCells(halo) === EXPECTED.halo
  && accommodation.length === 7_800 && hashCells(accommodation) === EXPECTED.accommodation
  && lowerCap.length === 12 && hashCells(lowerCap) === EXPECTED.lowerCap
  && summitCap.length === 12 && hashCells(summitCap) === EXPECTED.summitCap,
'selected rail geometry or protected interface drifted');
invariant(selectedPoints.every((point, index) => point.index === index + 420
  && point.y === 246 && point.z === -768 && point.x === 2128 - index),
'selected rail subset is not the exact upper level-cardinal run');

const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
async function records(cells) {
  const output = [];
  for (const cell of uniqueCells(cells)) {
    output.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
  }
  return output;
}
const targetRecords = await records(target);
const supportRecords = await records(support);
const headroomRecords = await records(headroom);
const isolationRecords = await records(isolationGaps);
const haloRecords = await records(halo);
const accommodationRecords = await records(accommodation);
const r12cRailRecords = await records(r12cRail);
const r12dRailRecords = await records(r12dRail);
const lowerCapRecords = await records(lowerCap);
const summitCapRecords = await records(summitCap);
invariant(targetRecords.every(({ state }) => state === AIR)
  && supportRecords.every(({ state }) => state === DIORITE)
  && headroomRecords.every(({ state }) => state === AIR)
  && isolationRecords.every(({ state }) => state === AIR)
  && r12cRailRecords.every(({ state }) => state === PASSIVE_RAIL)
  && r12dRailRecords.every(({ state }) => state === R12D_RAIL)
  && [...lowerCapRecords, ...summitCapRecords].every(({ state }) => state === DIORITE),
'target, support, gap, prior rail, or cap source state drifted');
invariant(stateSetHash(haloRecords) === EXPECTED.haloState
  && stateSetHash(accommodationRecords) === EXPECTED.accommodationState,
'R12D post accommodation or target halo state drifted');

const priorDescriptors = [
  ...r12d.preservation.acceptedPriorReleaseTargetProof,
  { transactionId: r12d.transactionId, manifest: fileBinding(INPUTS.r12dManifest) },
];
const priorProof = [];
const allPriorHits = [];
const unreviewedPriorHits = [];
for (const descriptor of priorDescriptors) {
  invariant(fileBinding(descriptor.manifest.path).sha256 === descriptor.manifest.sha256,
    `accepted prior manifest ${descriptor.manifest.path} drifted`);
  const prior = readJson(descriptor.manifest.path);
  const hits = uniqueCells((prior.packages ?? []).flatMap((pkg) => (
    pkg.forward && fs.existsSync(abs(pkg.forward)) ? operationIntersection(pkg.forward, target) : []
  )));
  allPriorHits.push(...hits);
  if (prior.transactionId !== r07i.transactionId) unreviewedPriorHits.push(...hits);
  priorProof.push({ transactionId: prior.transactionId, manifest: fileBinding(descriptor.manifest.path),
    targetIntersectionCount: hits.length,
    targetIntersectionCoordinateSetSha256: hits.length ? hashCells(hits) : null });
}
const r07iHits = operationIntersection(r07i.packages[0].forward, target);
invariant(uniqueCells(allPriorHits).length === 0 && r07iHits.length === 0
  && uniqueCells(unreviewedPriorHits).length === 0,
'selected rail datum has an unexpected prior operated-target overlap');

const haloKeys = new Set(halo.map(cellKey));
const blockEntities = [];
const savedEntities = [];
for (const key of [...new Set(halo.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))]) {
  const [chunkX, chunkZ] = key.split(',').map(Number);
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const blockEntity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    if (haloKeys.has(`${blockEntity.x},${blockEntity.y},${blockEntity.z}`)) blockEntities.push(blockEntity);
  }
  const entityChunk = await entityReader.chunk(chunkX, chunkZ);
  for (const entity of entityChunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    if (halo.some((cell) => Math.abs(cell.x - Number(entity.Pos[0])) <= 2
      && Math.abs(cell.y - Number(entity.Pos[1])) <= 3
      && Math.abs(cell.z - Number(entity.Pos[2])) <= 2)) savedEntities.push(entity);
  }
}
const relicHits = relics.relics.filter((relic) => halo.some((cell) => (
  cell.x >= relic.declaredInclusiveBounds.minX && cell.x <= relic.declaredInclusiveBounds.maxX
  && cell.y >= relic.declaredInclusiveBounds.minY && cell.y <= relic.declaredInclusiveBounds.maxY
  && cell.z >= relic.declaredInclusiveBounds.minZ && cell.z <= relic.declaredInclusiveBounds.maxZ
)));
const haloFluids = haloRecords.filter(({ state }) => isFluid(state));
const haloGravity = haloRecords.filter(({ state }) => isGravity(state));
const haloMechanisms = haloRecords.filter(({ state }) => MECHANISM_BLOCKS.has(stateBase(state)));
const haloContainers = haloRecords.filter(({ state }) => CONTAINER_OR_CONTROL.has(stateBase(state)));
invariant(blockEntities.length === 0 && savedEntities.length === 0 && relicHits.length === 0
  && haloFluids.length === 0 && haloGravity.length === 0
  && haloMechanisms.length === 0 && haloContainers.length === 0,
'target halo contains an entity, relic, fluid, gravity, mechanism, or container hazard');
invariant(target.every((cell, index) => {
  const neighbours = target.filter((candidate) => candidate.y === cell.y
    && Math.abs(candidate.x - cell.x) + Math.abs(candidate.z - cell.z) === 1).length;
  return neighbours === (index === 0 || index === target.length - 1 ? 1 : 2);
}), 'rail target is branched or disconnected');

const forwardBody = `${targetRecords.map(({ cell, state }) => replLine(cell, state, PASSIVE_RAIL)).join('\n')}\n`;
const rollbackBody = `${targetRecords.slice().reverse().map(({ cell, state }) => replLine(cell, PASSIVE_RAIL, state)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forwardPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationHash) => `# GENERATED FILE - ${RELEASE_ID}/${PACKAGE_KEY} (${role})\n`
  + `# source root: ${SNAPSHOT}\n# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}\n`
  + `# target coordinate-set SHA-256: ${hashCells(target)}\n# operation SHA-256: ${operationHash}\n`;
fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.writeFileSync(abs(forwardPath), `${header('forward', forwardSha256)}${forwardBody}`);
fs.writeFileSync(abs(rollbackPath), `${header('rollback', rollbackSha256)}${rollbackBody}`);

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const payload = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_R12E_ISOLATED_UPPER_LEVEL_CARDINAL_PASSIVE_RAIL_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B09-ISOLATED-UPPER-LEVEL-CARDINAL-PASSIVE-RAIL'],
  packages: [{ key: PACKAGE_KEY, forward: rel(forwardPath), rollback: rel(rollbackPath) }],
  executionOrder: {
    forward: [PACKAGE_KEY], rollback: [PACKAGE_KEY],
    rationale: 'Install west-to-east within a retained vertical-transition gap and turn gap; reverse rollback preserves one east-west axis until removal.',
  },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'Z11-FUNICULAR-OPERATIONS',
    material: PASSIVE_RAIL,
    purpose: 'Install the unique largest remaining independently isolated level-cardinal datum while every turn and vertical transition stays air.',
    geometry: {
      fullFrozenRailDatum: classManifest(fullRailDatum),
      selectedUpperLevelCardinalRail: classManifest(target),
      exactSupport: classManifest(support),
      retainedHeadroom: classManifest(headroom),
      retainedIsolationGaps: classManifest(isolationGaps),
      preservedR12cRail: classManifest(r12cRail),
      preservedR12dRail: classManifest(r12dRail),
      retainedLowerB08Cap: classManifest(lowerCap),
      retainedSummitZ11Cap: classManifest(summitCap),
    },
    selection: {
      firstCenterlineIndex: 420, lastCenterlineIndex: 499,
      excludedVerticalTransitionLowerIndex: 419, excludedTurnIndex: 500,
      axis: 'EAST_WEST', y: 246, contiguousCardinalRun: true,
      uniqueLargestRemainingIsolatedLevelRun: true, branchCount: 0, endpointCount: 2,
    },
    failSafeState: {
      passiveUnpoweredRailOnly: true, exactBlockState: PASSIVE_RAIL,
      lowerVerticalTransitionGapState: AIR, summitTurnGapState: AIR,
      connectedToPriorRail: false, turnRailInstalled: false, slopeRailInstalled: false,
      poweredRailInstalled: false, detectorOrActivatorRailInstalled: false,
      vehicleInstalled: false, driveBrakeControlPowerInstalled: false,
      passengerOrRescueUseAuthorized: false,
    },
    operationalBoundary: {
      staticPassiveGuidewayMaterialOnly: true, funicularCommissioned: false,
      routeCommissioned: false, passengerTransportCommissioned: false,
      exteriorInterfaceOpened: false,
    },
  },
  source: {
    snapshotRoot: rel(SNAPSHOT), completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    regionSnapshotSha256: regionIdentity.sha256, intakeAudit: fileBinding(INTAKE),
    predecessor: {
      transactionId: ledger.transactionId, executionLedger: fileBinding(SOURCE_LEDGER),
      completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
      executedManifest: fileBinding(INPUTS.r12dManifest), postQa: fileBinding(INPUTS.r12dQa),
      postQaPayloadSha256: r12dQa.qaPayloadSha256,
    },
    b09SourceState: { accommodation: classManifest(accommodation),
      blockStateSetSha256: stateSetHash(accommodationRecords), stateCensus: stateCensus(accommodationRecords) },
    targetStateSetSha256: stateSetHash(targetRecords), sourceStateCensus: { [AIR]: target.length },
  },
  target: { operatedUnion: classManifest(target), desiredStateCensus: { [PASSIVE_RAIL]: target.length } },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256, rollbackSha256, forwardCommandCount: target.length,
      rollbackCommandCount: target.length, targetCellCount: target.length,
      targetCoordinateSetSha256: hashCells(target), sourceStateCensus: { [AIR]: target.length },
      desiredStateCensus: { [PASSIVE_RAIL]: target.length }, exactInverse: true,
      reverseOrderInverse: true, oneCellGuards: true,
    },
  },
  remainingRailDatumInventory: {
    classificationDoctrine: 'Exclude every turn point and the lower endpoint of every ascending edge; subtract R12C/R12D installed indices; retain only multi-cell same-y single-axis runs.',
    turnCells: classManifest(inventory.turnCells),
    verticalTransitionLowerCells: classManifest(inventory.verticalTransitionCells),
    remainingMultiCellLevelRuns: inventory.runs,
    independentlyIsolatedRunCount: isolatedRuns.length,
    selectedUniqueLargestRun: isolatedRuns[0],
    rejectedLowerStationRun: {
      ...inventory.runs[0],
      reason: 'Indices 0..8 include the lower station/portal interface, lack a left isolation gap, and meet installed R12C rail at index 9.',
    },
  },
  preservation: {
    acceptedPriorReleaseTargetProof: priorProof,
    reviewedR07iOperatedTargetIntersection: classManifest(r07iHits),
    undeclaredPriorReleaseIntersectionCount: uniqueCells(unreviewedPriorHits).length,
    exactSupport: { ...classManifest(support), sourceStateCensus: stateCensus(supportRecords) },
    retainedHeadroom: classManifest(headroom), retainedIsolationGaps: classManifest(isolationGaps),
    preservedR12cRail: { ...classManifest(r12cRail), sourceStateCensus: stateCensus(r12cRailRecords) },
    preservedR12dRail: { ...classManifest(r12dRail), sourceStateCensus: stateCensus(r12dRailRecords) },
    retainedLowerB08Cap: classManifest(lowerCap), retainedSummitZ11Cap: classManifest(summitCap),
  },
  safetyAudit: {
    halo: { ...classManifest(halo), sourceStateCensus: stateCensus(haloRecords), sourceStateSetSha256: stateSetHash(haloRecords) },
    targetFluidCount: targetRecords.filter(({ state }) => isFluid(state)).length,
    haloFluidCount: haloFluids.length, haloGravityCount: haloGravity.length,
    haloExistingMechanismCount: haloMechanisms.length,
    haloContainerOrControlCount: haloContainers.length,
    haloBlockEntityCount: blockEntities.length, haloSavedEntityCount: savedEntities.length,
    haloProtectedRelicCount: relicHits.length,
    exactSolidSupportCount: supportRecords.filter(({ state }) => state === DIORITE).length,
    exactAirHeadroomCount: headroomRecords.filter(({ state }) => state === AIR).length,
    railUpdateDeterminism: {
      straightSingleAxis: true, branchCount: 0, endpointNeighbourCount: 1,
      interiorNeighbourCount: 2, explicitPropertyState: PASSIVE_RAIL,
      forwardOrder: 'WEST_TO_EAST', rollbackOrder: 'EAST_TO_WEST',
      retainedIsolationGapCount: isolationGaps.length, cardinalAdjacencyToPriorRailCount: 0,
    },
  },
  standingAuthorization: { ...fileBinding(INPUTS.authorization),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256, releaseNodeAuthorized: true },
  upstreamIdentities: {
    b09Technical: fileBinding(INPUTS.technical), connectors: fileBinding(INPUTS.connectors),
    d05: fileBinding(INPUTS.d05), releaseContract: fileBinding(INPUTS.releaseContract),
    r07eManifest: fileBinding(INPUTS.r07eManifest), r07iManifest: fileBinding(INPUTS.r07iManifest),
    r12cManifest: fileBinding(INPUTS.r12cManifest),
    r12dManifest: fileBinding(INPUTS.r12dManifest), r12dQa: fileBinding(INPUTS.r12dQa),
  },
  blockedRailClasses: {
    status: 'LOCAL_HOLD_ONLY_FOR_UNPROVEN_RAIL_UPDATE_CLASSES_AND_STATION_INTERFACE',
    heldClasses: [
      'all three exact turn cells at indices 240, 260, and 500',
      'all 174 lower endpoints of vertical transitions',
      'all singleton level cells between vertical transitions',
      'lower station/portal indices 0..8 without two-sided isolation',
    ],
    nontrivialIsolatedLevelCardinalRunRemainingAfterThisPackage: false,
  },
  residualActiveSystemBlockers: r12d.residualActiveSystemBlockers,
  hardSafetyKernelNext: [
    'rebind to the latest accepted immutable terminal if it has advanced',
    'fresh complete source and exact preflight', 'fresh live entity clearance',
    'strict forward and rollback parser checks', 'journaled strict execution',
    'fresh post and exact east-west rail-state plus rollback preflight QA',
  ],
  safetyBoundary: {
    liveCallsPerformed: false, apiCallsPerformed: false, rconCallsPerformed: false,
    serviceMutationsPerformed: false, worldEditsPerformed: false,
    executionAuthorizedByThisOfflineCompile: false, funicularOrRouteCommissioned: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(payload));
fs.writeFileSync(abs(manifestPath), `${JSON.stringify({ ...payload, manifestIdentity }, null, 2)}\n`);
console.log(JSON.stringify({
  status: payload.status, manifest: rel(manifestPath), manifestIdentity,
  targetCellCount: target.length, targetCoordinateSetSha256: hashCells(target),
  sourceState: AIR, desiredState: PASSIVE_RAIL, isolationGapCount: isolationGaps.length,
  remainingNontrivialIsolatedLevelRunCountAfterPackage: 0,
  liveCallsPerformed: false, worldEditsPerformed: false,
}, null, 2));
