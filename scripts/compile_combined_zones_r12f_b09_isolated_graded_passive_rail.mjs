#!/usr/bin/env node
/** Compile CZ-R12F: isolated three-cell graded passive B09 rail. */

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
const GENERATED_AT = value('--generated-at', '2026-08-22T01:45:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-r12e-post-20260822T011943Z');
const INTAKE = value(
  '--intake-audit',
  'data/world-review/combined-zones-r12e-live-20260822T011943Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r12e-live-20260822T011943Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
// The manifest is an execution contract, so its operation references must not
// inherit a caller's scratch output directory. Tests and audits may emit the
// same bytes elsewhere, while the guarded wrapper always resolves the frozen
// operations at their canonical repository-relative locations.
const CANONICAL_BUILDOPS_DIR = 'data/buildops';
const BASENAME = value(
  '--basename',
  'combined-zones-r12f-b09-isolated-three-cell-graded-passive-rail',
);
const RELEASE_ID = 'CZ-R12F-P1-B09-ISOLATED-THREE-CELL-GRADED-PASSIVE-RAIL';
const RELEASE_NODE_ID = 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING';
const PACKAGE_KEY = 'b09-isolated-three-cell-graded-passive-rail';
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const ASCENDING_WEST_RAIL = 'minecraft:rail[shape=ascending_west,waterlogged=false]';
const EAST_WEST_RAIL = 'minecraft:rail[shape=east_west,waterlogged=false]';
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
  r12eManifest:
    'data/buildops/combined-zones-r12e-b09-isolated-upper-level-cardinal-passive-rail.release-manifest.json',
  r12eQa: 'data/world-review/combined-zones-r12e-live-20260822T011943Z/r12e-post-release-qa.json',
  runtimeProof:
    'data/world-review/combined-zones-r12f-b09-graded-rail-runtime-proof-20260822T014000Z/runtime-proof.json',
});
const EXPECTED = Object.freeze({
  sourceComplete: 'fc88874e3037fa37565408fb72bda202416178ae990adf00cb0df462f7dc9484',
  sourceRegion: '980a7636e53a86e1c98c24e05b5b1aadeda1bb5ac7860cf02e02b3ccd4634af9',
  sourceLedger: 'ca0505c5768e25762eca41f7ba77d477ed8eae2a2be55f9acad41caf3ed5f864',
  sourceCompleted: '552ac3c9580c80b248625d6f26676fd491a110ccf707b488b507dea6a1434c9b',
  sourceQa: '31a91b538add45ae838dde976b4d76a3bf101dc4da27cbf68b9ff39c44868685',
  sourceQaPayload: '291ebd7aa3c1e5a80e3067ce1f7a8786c5dc67f67a418de3d840105135f5ee7d',
  runtimeProof: '56bec87a4843ec2a2041503efd20da764a1648da128838862f6945fde1788c36',
  runtimeProofPayload: '9f734939a5217d5bc5bc0616f3dbd78f0ac75275bcc5fd11f16ff35dd696f8be',
  technical: 'f9b57fb317ff983acacbf98cb0a7776246c242025f583d9795594a6a799898c8',
  technicalIdentity: 'e8738f3932f2afc3ba71e35ccdebf0d5ef444ca7389e81ec31a18e48517d3eba',
  connectors: '8bb2dd803c434667dfeee440ccdf8428a115962e21dd1b3b0e6955cce672dc4e',
  d05: '1446c75cec504478130a8e9c5569c68c7a7569a29c4210e9b21ca5d804aeb2f3',
  contract: '64f4432f00bd31fe8e5cd12921cd91bdc84b32c5c16630e62138accdf94ed8e0',
  authorization: 'd3b5f17862074080ae9db81e2932c56f6e96c926979748f8a3bcc09c22b3ad1a',
  relics: '1739502e8bf19283cabfe9930f26011dba97c11e6328da27ee0b7f651f7a0a22',
  r12cManifest: 'de097788b3f93bfb3ac0364e17fc07424801a8eb59cdd769758da9c9831e4a91',
  r12dManifest: 'bba29822282eb5de5276f86f5a11f01a4a8018b288d73a3955f36f089eff0af1',
  r12eManifest: '4c52a6eab1f5a6dc23e869c3cac8d573cfa9e3548b211d64e247bbccb8e4749c',
  r07eManifest: '454fb9a8cf32550ccf7547921ffe23e5b04dc0fa5aa514ae4ba778b428edf28b',
  modelIdentity: '735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6',
  centerline: 'e8905742a77148d13d799362da7d65e9b02bcf96455d580fbee27367b2d24221',
  railDatum: '91b5174e01bde419175c68997f199f01b04ee38cbde13304ab4dd9a0d0d979b8',
  target: '4ef1dd45742537a3300286c1bc3742600626540ec2327bb46a0e6149568cb973',
  support: 'a58fca48a187bc9381cd2cd74692a2449d5d7dd33deff20258ded03148c21c54',
  headroom: '23e0641583e5082e8393c913b8c97810a5ff8a83a6a1dacf01a4a93037482c12',
  isolationGaps: 'b8cd5dbe38335804283d015df2cb69cb08955d927bcc5be4195f01207c4c22d1',
  halo: 'bfd162cce3cee774126c4127ab48e358d5da42c7cda3bf341206a68db30122de',
  haloState: 'abbf21f909c2b37368c6f12d45bd1803f522747b087549aab9215cec02e6bea8',
  accommodation: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  accommodationState: 'f775a927bded347e269b132a3e608798a93b803ee326d44be4cebb72e9d44776',
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
  if (!condition) throw new Error(`R12F B09 passive-rail compiler rejected: ${message}`);
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
const r12e = readJson(INPUTS.r12eManifest);
const r12eQa = readJson(INPUTS.r12eQa);
const runtimeProof = readJson(INPUTS.runtimeProof);
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary.passed && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceComplete
  && abs(intake.input.suppliedWorldRoot) === abs(SNAPSHOT), 'source intake mismatch');
invariant(fileBinding(SOURCE_LEDGER).sha256 === EXPECTED.sourceLedger
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
  && abs(ledger.postSnapshot.root) === abs(SNAPSHOT), 'source ledger mismatch');
invariant(regionIdentity.sha256 === EXPECTED.sourceRegion, 'source region identity mismatch');
invariant(fileBinding(INPUTS.r12eQa).sha256 === EXPECTED.sourceQa
  && r12eQa.qaPayloadSha256 === EXPECTED.sourceQaPayload && r12eQa.summary.passed
  && !r12eQa.disposition.funicularCommissioned, 'R12E post-QA binding drifted');
invariant(fileBinding(INPUTS.r12cManifest).sha256 === EXPECTED.r12cManifest
  && fileBinding(INPUTS.r12dManifest).sha256 === EXPECTED.r12dManifest
  && fileBinding(INPUTS.r12eManifest).sha256 === EXPECTED.r12eManifest
  && ledger.manifest.sha256 === EXPECTED.r12eManifest, 'predecessor manifest binding drifted');
invariant(fileBinding(INPUTS.runtimeProof).sha256 === EXPECTED.runtimeProof
  && runtimeProof.proofPayloadSha256 === EXPECTED.runtimeProofPayload
  && runtimeProof.status === 'PASS_EXACT_PAPER_1_21_11_GRADED_RAIL_STATE_AND_REVERSE_ORDER_INVERSE'
  && runtimeProof.disposition.exactThreeCellGradedRailStateProven
  && runtimeProof.disposition.exactForwardAndReverseOrderRollbackProven
  && !runtimeProof.disposition.productionMutationPerformed,
'exact production-version graded-rail runtime proof drifted');
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
invariant(fs.readFileSync(abs(INPUTS.currentState), 'utf8').includes('R12E · B09 isolated upper level-cardinal rail'),
'CURRENT-STATE does not record R12E');

const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
invariant(model.modelIdentitySha256 === EXPECTED.modelIdentity, 'selected model drifted');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const centerline = buildCenterline(model.formula, endpoints);
const fullRailDatum = centerline.map(({ x, y, z }) => ({ x, y, z }));
invariant(centerline.length === 561 && orderedCenterlineSha256(centerline) === EXPECTED.centerline
  && hashCells(fullRailDatum) === EXPECTED.railDatum, 'accepted B09 centerline drifted');
const selectedPoints = centerline.slice(261, 264);
const target = selectedPoints.map(({ x, y, z }) => ({ x, y, z }));
const support = target.map(({ x, y, z }) => ({ x, y: y - 1, z }));
const headroom = target.map(({ x, y, z }) => ({ x, y: y + 1, z }));
const isolationGaps = [centerline[260], centerline[264]].map(({ x, y, z }) => ({ x, y, z }));
const halo = dilateCells(target, 1);
const accommodation = buildB09MinimumReservation(model.formula, endpoints);
const r12cRail = cellsIn(r12c.target.operatedUnion.bounds);
const r12dRail = cellsIn(r12d.target.operatedUnion.bounds);
const r12eRail = cellsIn(r12e.target.operatedUnion.bounds);
const lowerCap = cellsIn(r12c.scope.geometry.retainedLowerB08Cap.bounds);
const summitManifest = readJson(INPUTS.r07eManifest);
const summitCap = cellsIn(summitManifest.scope.geometry.summitInterfaceCap.bounds);
invariant(target.length === 3 && hashCells(target) === EXPECTED.target
  && support.length === 3 && hashCells(support) === EXPECTED.support
  && headroom.length === 3 && hashCells(headroom) === EXPECTED.headroom
  && isolationGaps.length === 2 && hashCells(isolationGaps) === EXPECTED.isolationGaps
  && halo.length === 57 && hashCells(halo) === EXPECTED.halo
  && accommodation.length === 7_800 && hashCells(accommodation) === EXPECTED.accommodation
  && lowerCap.length === 12 && hashCells(lowerCap) === EXPECTED.lowerCap
  && summitCap.length === 12 && hashCells(summitCap) === EXPECTED.summitCap,
'selected rail geometry or protected interface drifted');
invariant(selectedPoints.every((point, index) => point.index === index + 261
  && point.x === 2287 - index && point.y === 130 + index && point.z === -768),
'selected rail subset is not the exact isolated graded run');

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
const r12eRailRecords = await records(r12eRail);
const lowerCapRecords = await records(lowerCap);
const summitCapRecords = await records(summitCap);
invariant(targetRecords.every(({ state }) => state === AIR)
  && supportRecords.every(({ state }) => state === DIORITE)
  && headroomRecords.every(({ state }) => state === AIR)
  && isolationRecords.every(({ state }) => state === AIR)
  && r12cRailRecords.every(({ state }) => state === EAST_WEST_RAIL)
  && r12dRailRecords.every(({ state }) => state === R12D_RAIL)
  && r12eRailRecords.every(({ state }) => state === EAST_WEST_RAIL)
  && [...lowerCapRecords, ...summitCapRecords].every(({ state }) => state === DIORITE),
'target, support, gap, prior rail, or cap source state drifted');
invariant(stateSetHash(haloRecords) === EXPECTED.haloState
  && stateSetHash(accommodationRecords) === EXPECTED.accommodationState,
'R12E post accommodation or target halo state drifted');

const priorDescriptors = [
  ...r12e.preservation.acceptedPriorReleaseTargetProof,
  { transactionId: r12e.transactionId, manifest: fileBinding(INPUTS.r12eManifest) },
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
const reviewedHaloMechanisms = haloMechanisms.filter(({ cell, state }) => (
  state === R12D_RAIL && cell.x === 2288 && cell.y === 130 && cell.z === -767
));
invariant(blockEntities.length === 0 && savedEntities.length === 0 && relicHits.length === 0
  && haloFluids.length === 0 && haloGravity.length === 0
  && haloMechanisms.length === 1 && reviewedHaloMechanisms.length === 1
  && haloContainers.length === 0,
'target halo contains an entity, relic, fluid, gravity, mechanism, or container hazard');
invariant(target.slice(0, -1).every((cell, index) => target[index + 1].x === cell.x - 1
  && target[index + 1].y === cell.y + 1 && target[index + 1].z === cell.z),
'rail target is not the exact west-rising one-to-one grade');
const desiredLowToHigh = [ASCENDING_WEST_RAIL, ASCENDING_WEST_RAIL, EAST_WEST_RAIL];
const targetSourceByKey = new Map(targetRecords.map((record) => [cellKey(record.cell), record.state]));
const plannedLowToHigh = target.map((cell, index) => ({
  cell,
  state: targetSourceByKey.get(cellKey(cell)),
  desired: desiredLowToHigh[index],
}));
const forwardPlan = plannedLowToHigh.slice().reverse();
const rollbackPlan = forwardPlan.slice().reverse();
const forwardBody = `${forwardPlan.map(({ cell, state, desired }) => (
  replLine(cell, state, desired)
)).join('\n')}\n`;
const rollbackBody = `${rollbackPlan.map(({ cell, state, desired }) => (
  replLine(cell, desired, state)
)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forwardPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const canonicalForwardPath = path.posix.join(
  CANONICAL_BUILDOPS_DIR,
  `${BASENAME}.${PACKAGE_KEY}.forward.txt`,
);
const canonicalRollbackPath = path.posix.join(
  CANONICAL_BUILDOPS_DIR,
  `${BASENAME}.${PACKAGE_KEY}.rollback.txt`,
);
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
  status: 'COMPILED_R12F_ISOLATED_THREE_CELL_GRADED_PASSIVE_RAIL_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B09-ISOLATED-THREE-CELL-GRADED-PASSIVE-RAIL'],
  packages: [{ key: PACKAGE_KEY, forward: canonicalForwardPath, rollback: canonicalRollbackPath }],
  executionOrder: {
    forward: [PACKAGE_KEY], rollback: [PACKAGE_KEY],
    rationale: 'Install upper-to-lower so each descending neighbor sees its already-present upper connection; exact reverse rollback removes lower-to-upper and preserves every guard, as proven on the exact production Paper binary.',
  },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'Z11-FUNICULAR-OPERATIONS',
    material: 'two ascending_west rails plus one east_west upper rail',
    purpose: 'Install the smallest independently isolated west-rising grade whose exact state and neighbor-update order are proven on Paper 1.21.11.',
    geometry: {
      fullFrozenRailDatum: classManifest(fullRailDatum),
      selectedThreeCellGradedRail: classManifest(target),
      exactSupport: classManifest(support),
      retainedHeadroom: classManifest(headroom),
      retainedIsolationGaps: classManifest(isolationGaps),
      preservedR12cRail: classManifest(r12cRail),
      preservedR12dRail: classManifest(r12dRail),
      preservedR12eRail: classManifest(r12eRail),
      retainedLowerB08Cap: classManifest(lowerCap),
      retainedSummitZ11Cap: classManifest(summitCap),
    },
    selection: {
      firstCenterlineIndex: 261, lastCenterlineIndex: 263,
      excludedLeftTurnIndex: 260, excludedRightLevelGapIndex: 264,
      horizontalDirection: 'WEST', risePerStep: 1,
      contiguousOneToOneGrade: true, endpointCount: 2,
    },
    failSafeState: {
      passiveUnpoweredRailOnly: true,
      exactBlockStatesLowToHigh: desiredLowToHigh,
      hairpinTurnGapState: AIR, upperLevelGapState: AIR,
      connectedToPriorRail: false, turnRailInstalled: false, slopeRailInstalled: true,
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
      executedManifest: fileBinding(INPUTS.r12eManifest), postQa: fileBinding(INPUTS.r12eQa),
      postQaPayloadSha256: r12eQa.qaPayloadSha256,
    },
    b09SourceState: { accommodation: classManifest(accommodation),
      blockStateSetSha256: stateSetHash(accommodationRecords), stateCensus: stateCensus(accommodationRecords) },
    targetStateSetSha256: stateSetHash(targetRecords), sourceStateCensus: { [AIR]: target.length },
  },
  target: { operatedUnion: classManifest(target), desiredStateCensus: {
    [ASCENDING_WEST_RAIL]: 2, [EAST_WEST_RAIL]: 1,
  } },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256, rollbackSha256, forwardCommandCount: target.length,
      rollbackCommandCount: target.length, targetCellCount: target.length,
      targetCoordinateSetSha256: hashCells(target), sourceStateCensus: { [AIR]: target.length },
      desiredStateCensus: { [ASCENDING_WEST_RAIL]: 2, [EAST_WEST_RAIL]: 1 }, exactInverse: true,
      reverseOrderInverse: true, oneCellGuards: true,
    },
  },
  runtimeUpdateProof: {
    ...fileBinding(INPUTS.runtimeProof),
    proofPayloadSha256: runtimeProof.proofPayloadSha256,
    exactProductionPaperVersion: runtimeProof.runtime.expectedVersion,
    forwardOrder: runtimeProof.deterministicOrder.forward,
    rollbackExactReverseOrder: runtimeProof.deterministicOrder.rollbackExactReverse,
    forwardStatePassCount: runtimeProof.deterministicOrder.forwardStatePassCount,
    rollbackAirPassCount: runtimeProof.deterministicOrder.rollbackAirPassCount,
    productionMutationPerformed: false,
  },
  preservation: {
    acceptedPriorReleaseTargetProof: priorProof,
    reviewedR07iOperatedTargetIntersection: classManifest(r07iHits),
    undeclaredPriorReleaseIntersectionCount: uniqueCells(unreviewedPriorHits).length,
    exactSupport: { ...classManifest(support), sourceStateCensus: stateCensus(supportRecords) },
    retainedHeadroom: classManifest(headroom), retainedIsolationGaps: classManifest(isolationGaps),
    preservedR12cRail: { ...classManifest(r12cRail), sourceStateCensus: stateCensus(r12cRailRecords) },
    preservedR12dRail: { ...classManifest(r12dRail), sourceStateCensus: stateCensus(r12dRailRecords) },
    preservedR12eRail: { ...classManifest(r12eRail), sourceStateCensus: stateCensus(r12eRailRecords) },
    retainedLowerB08Cap: classManifest(lowerCap), retainedSummitZ11Cap: classManifest(summitCap),
  },
  safetyAudit: {
    halo: { ...classManifest(halo), sourceStateCensus: stateCensus(haloRecords), sourceStateSetSha256: stateSetHash(haloRecords) },
    targetFluidCount: targetRecords.filter(({ state }) => isFluid(state)).length,
    haloFluidCount: haloFluids.length, haloGravityCount: haloGravity.length,
    haloExistingMechanismCount: haloMechanisms.length,
    reviewedAdjacentMechanismCount: reviewedHaloMechanisms.length,
    haloUndeclaredMechanismCount: haloMechanisms.length - reviewedHaloMechanisms.length,
    haloContainerOrControlCount: haloContainers.length,
    haloBlockEntityCount: blockEntities.length, haloSavedEntityCount: savedEntities.length,
    haloProtectedRelicCount: relicHits.length,
    exactSolidSupportCount: supportRecords.filter(({ state }) => state === DIORITE).length,
    exactAirHeadroomCount: headroomRecords.filter(({ state }) => state === AIR).length,
    railUpdateDeterminism: {
      exactOneToOneWestRise: true,
      explicitPropertyStatesLowToHigh: desiredLowToHigh,
      forwardOrder: 'UPPER_TO_LOWER', rollbackOrder: 'LOWER_TO_UPPER_EXACT_REVERSE',
      retainedIsolationGapCount: isolationGaps.length,
      exactProductionVersionRuntimeProofPassed: true,
    },
  },
  standingAuthorization: { ...fileBinding(INPUTS.authorization),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256, releaseNodeAuthorized: true },
  upstreamIdentities: {
    b09Technical: fileBinding(INPUTS.technical), connectors: fileBinding(INPUTS.connectors),
    d05: fileBinding(INPUTS.d05), releaseContract: fileBinding(INPUTS.releaseContract),
    r07eManifest: fileBinding(INPUTS.r07eManifest), r07iManifest: fileBinding(INPUTS.r07iManifest),
    r12cManifest: fileBinding(INPUTS.r12cManifest),
    r12dManifest: fileBinding(INPUTS.r12dManifest),
    r12eManifest: fileBinding(INPUTS.r12eManifest), r12eQa: fileBinding(INPUTS.r12eQa),
    gradedRailRuntimeProof: fileBinding(INPUTS.runtimeProof),
  },
  blockedRailClasses: {
    status: 'LOCAL_HOLD_ONLY_FOR_UNPROVEN_RAIL_UPDATE_CLASSES_AND_STATION_INTERFACE',
    heldClasses: [
      'all three exact turn cells at indices 240, 260, and 500',
      'all graded cells except exact indices 261..263',
      'all remaining singleton level cells between vertical transitions',
      'lower station/portal indices 0..8 without two-sided isolation',
    ],
    nontrivialIsolatedLevelCardinalRunRemainingAfterThisPackage: false,
  },
  residualActiveSystemBlockers: r12e.residualActiveSystemBlockers,
  hardSafetyKernelNext: [
    'rebind to the latest accepted immutable terminal if it has advanced',
    'fresh complete source and exact preflight', 'fresh live entity clearance',
    'strict forward and rollback parser checks', 'journaled strict execution',
    'fresh post and exact two-ascending-west plus one-east-west rail-state QA and rollback preflight',
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
  sourceState: AIR, desiredStates: desiredLowToHigh, isolationGapCount: isolationGaps.length,
  productionVersionRuntimeProof: runtimeProof.status,
  liveCallsPerformed: false, worldEditsPerformed: false,
}, null, 2));
