#!/usr/bin/env node
/** Compile CZ-R12D: isolated passive B09 hairpin cardinal rail leg. */

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
const GENERATED_AT = value('--generated-at', '2026-08-22T00:50:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r12c-post-20260822T004255Z',
);
const INTAKE = value(
  '--intake-audit',
  'data/world-review/combined-zones-r12c-live-20260822T004255Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r12c-live-20260822T004255Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r12d-b09-isolated-hairpin-cardinal-passive-rail',
);
const RELEASE_ID = 'CZ-R12D-P1-B09-ISOLATED-HAIRPIN-CARDINAL-PASSIVE-RAIL';
const RELEASE_NODE_ID = 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING';
const PACKAGE_KEY = 'b09-isolated-hairpin-cardinal-passive-rail';
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const PASSIVE_RAIL = 'minecraft:rail[shape=north_south,waterlogged=false]';
const R12C_RAIL = 'minecraft:rail[shape=east_west,waterlogged=false]';
const GRAVITY_BLOCKS = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:dragon_egg',
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
  r07hManifest: 'data/buildops/combined-zones-r07h-b09-lower-guideway-segment-02.release-manifest.json',
  r07iManifest: 'data/buildops/combined-zones-r07i-b09-maximal-curve-summit-return.release-manifest.json',
  r12cManifest:
    'data/buildops/combined-zones-r12c-b09-isolated-lower-straight-passive-rail-design-freeze.release-manifest.json',
  r12cQa: 'data/world-review/combined-zones-r12c-live-20260822T004255Z/r12c-post-release-qa.json',
});
const EXPECTED = Object.freeze({
  sourceComplete: '1c51b53415dc35060a4aefacaac8e7e8b3ca588a457c3c4ce28329e06f6fb02d',
  sourceRegion: 'd899d084dd13f27c10ff8cdd40ad509967a3ade5c927cd22bbfdcab44a9ab80d',
  sourceLedger: 'ed2e62dea837a8e6d2290752775f7f49444fe338f4aac6ca1bdec8b19f190db0',
  sourceCompleted: '516755fa28b16d5d7d5b1baec7dd63e33be73276ed42d69b8f58bb75cba74480',
  technical: 'f9b57fb317ff983acacbf98cb0a7776246c242025f583d9795594a6a799898c8',
  technicalIdentity: 'e8738f3932f2afc3ba71e35ccdebf0d5ef444ca7389e81ec31a18e48517d3eba',
  connectors: '8bb2dd803c434667dfeee440ccdf8428a115962e21dd1b3b0e6955cce672dc4e',
  d05: '1446c75cec504478130a8e9c5569c68c7a7569a29c4210e9b21ca5d804aeb2f3',
  contract: '64f4432f00bd31fe8e5cd12921cd91bdc84b32c5c16630e62138accdf94ed8e0',
  authorization: 'd3b5f17862074080ae9db81e2932c56f6e96c926979748f8a3bcc09c22b3ad1a',
  relics: '1739502e8bf19283cabfe9930f26011dba97c11e6328da27ee0b7f651f7a0a22',
  r12cManifest: 'de097788b3f93bfb3ac0364e17fc07424801a8eb59cdd769758da9c9831e4a91',
  r12cQa: '6d78f3bc4e4b11c96f4636ee8c9798e3f04b4ba0073f378f39a52f406e7b1c52',
  r12cQaPayload: '145dc2e1a30081aa4be1e6fd7204fe6f09b5bbe6828e9dea77f3791fe6d47deb',
  modelIdentity: '735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6',
  centerline: 'e8905742a77148d13d799362da7d65e9b02bcf96455d580fbee27367b2d24221',
  railDatum: '91b5174e01bde419175c68997f199f01b04ee38cbde13304ab4dd9a0d0d979b8',
  target: 'd34c55e58763b4e6666edd4a973769e5e468ee185f7ef044334670ffcff41754',
  support: '916c10a9828a310625dea3b64ead77bfbd3d9b15d0b41eae46dbe2c069d75e2e',
  headroom: '7dbc06ade50e46a4f131f4e7b8b90c49a6cca3b7c34e0d6e9e982f4eb7e7b295',
  isolationGaps: '021919255d63bd29c496a22493a9719131890f7c10b793c28ebdb7f1fc940984',
  halo: 'aca9feb244b790c02adcd958bfce9a9e2d1b646602ad73c49a6965794aa04fdc',
  haloState: 'f5c35cdff876a5db80ad8137b5bf1aead254ae11f1fd60f907e09fb8c294fed3',
  accommodation: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  accommodationState: 'f685ace53187d0c8614e6f3ec7df2ffb56fd130c32d720d48cc7b96d97ce587f',
  lowerCap: 'a422d177fb7f1571b8a6243fcbf014fda17a910e60e7c03f7c21051f697a3e96',
  curveAperture: '9991feda6e953dd4e66585d7e23a61723c3319cb59c22782196fab028f2c08bb',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12D B09 passive-rail compiler rejected: ${message}`);
};
const fileBinding = (filename) => ({
  path: rel(filename),
  sha256: sha256(fs.readFileSync(abs(filename))),
  bytes: fs.statSync(abs(filename)).size,
});
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const stateBase = (state) => state.split('[', 1)[0];
const stateCensus = (records) => Object.fromEntries([...records.reduce(
  (counts, { state }) => counts.set(state, (counts.get(state) ?? 0) + 1),
  new Map(),
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
  const lines = points.map((point) => (
    `${point.index}:${point.x},${point.y},${point.z}:${point.kind}`
  ));
  return sha256(`combined-zones-ordered-centerline-v1\n${lines.join('\n')}\n`);
}

function buildCenterline(model, endpoints) {
  const portal = endpoints.from;
  const summit = endpoints.to;
  let climbZ = portal.z - 1;
  while (climbZ > summit.z
    && mountainSurfaceY(portal.x, climbZ - 1, model)
      !== mountainSurfaceY(portal.x, climbZ, model)) climbZ -= 1;
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
  for (let distance = 1; distance <= Math.abs(summit.z - climbZ); distance += 1) {
    const z = climbZ - distance;
    points.push({
      x: summit.x,
      y: mountainSurfaceY(summit.x, z, model) + 1,
      z,
      kind: distance === 1 ? 'level-summit-curve-exit'
        : z === summit.z ? 'summit-interface' : 'summit-ascent',
    });
  }
  return points.map((point, index) => ({ ...point, index }));
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
        && cell.z >= Math.min(box[2], box[5]) && cell.z <= Math.max(box[2], box[5])) {
        hits.push(cell);
      }
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
const r07h = readJson(INPUTS.r07hManifest);
const r07i = readJson(INPUTS.r07iManifest);
const r12c = readJson(INPUTS.r12cManifest);
const r12cQa = readJson(INPUTS.r12cQa);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary.passed
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceComplete
  && abs(intake.input.suppliedWorldRoot) === abs(SNAPSHOT), 'source intake mismatch');
invariant(fileBinding(SOURCE_LEDGER).sha256 === EXPECTED.sourceLedger
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
  && abs(ledger.postSnapshot.root) === abs(SNAPSHOT), 'source ledger mismatch');
invariant(regionIdentity.sha256 === EXPECTED.sourceRegion, 'source region identity mismatch');
invariant(fileBinding(INPUTS.r12cManifest).sha256 === EXPECTED.r12cManifest
  && ledger.manifest.sha256 === EXPECTED.r12cManifest
  && ledger.transactionId === r12c.transactionId,
'R12C predecessor manifest or execution binding drifted');
invariant(fileBinding(INPUTS.r12cQa).sha256 === EXPECTED.r12cQa
  && r12cQa.qaPayloadSha256 === EXPECTED.r12cQaPayload
  && r12cQa.summary.passed
  && r12cQa.disposition.funicularCommissioned === false,
'R12C post-QA binding drifted');
invariant(fileBinding(INPUTS.technical).sha256 === EXPECTED.technical
  && technical.reportIdentitySha256 === EXPECTED.technicalIdentity
  && fileBinding(INPUTS.connectors).sha256 === EXPECTED.connectors
  && fileBinding(INPUTS.d05).sha256 === EXPECTED.d05
  && fileBinding(INPUTS.releaseContract).sha256 === EXPECTED.contract
  && fileBinding(INPUTS.authorization).sha256 === EXPECTED.authorization
  && fileBinding(INPUTS.relics).sha256 === EXPECTED.relics,
'frozen design input identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && !authorization.revoked
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'R12 standing authorization absent');
const r12Node = contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r12Node?.canonicalOwners.includes('Z11-FUNICULAR-OPERATIONS'),
'R12 release contract does not own funicular operations');
invariant(fs.readFileSync(abs(INPUTS.currentState), 'utf8').includes('R12B · B09 static enclosure readiness'),
'CURRENT-STATE does not retain the accepted R12B dependency');

const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
invariant(model.modelIdentitySha256 === EXPECTED.modelIdentity, 'selected model drifted');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const centerline = buildCenterline(model.formula, endpoints);
invariant(centerline.length === 561
  && orderedCenterlineSha256(centerline) === EXPECTED.centerline,
'accepted B09 centerline drifted');
const fullRailDatum = centerline.map(({ x, y, z }) => ({ x, y, z }));
invariant(hashCells(fullRailDatum) === EXPECTED.railDatum
  && technical.exactTechnicalReservationProposals.proposalLayers
    .railDatumReservation.coordinateSetSha256 === EXPECTED.railDatum,
'frozen rail-datum reservation drifted');

// Indices 241..259 are the complete level north-south cardinal leg between
// two excluded 90-degree turn cells. Both turn cells remain air, so this
// package is physically isolated from R12C and from every ascending datum.
const selectedPoints = centerline.slice(241, 260);
const target = selectedPoints.map(({ x, y, z }) => ({ x, y, z }));
const support = target.map(({ x, y, z }) => ({ x, y: y - 1, z }));
const headroom = target.map(({ x, y, z }) => ({ x, y: y + 1, z }));
const isolationGaps = [centerline[240], centerline[260]].map(({ x, y, z }) => ({ x, y, z }));
const halo = dilateCells(target, 1);
const accommodation = buildB09MinimumReservation(model.formula, endpoints);
const lowerCap = cellsIn(r12c.scope.geometry.retainedLowerB08Cap.bounds);
const curveAperture = cellsIn(r12c.scope.geometry.retainedR07iCurveAperture.bounds);
const r12cRail = cellsIn(r12c.target.operatedUnion.bounds);
invariant(target.length === 19 && hashCells(target) === EXPECTED.target
  && support.length === 19 && hashCells(support) === EXPECTED.support
  && headroom.length === 19 && hashCells(headroom) === EXPECTED.headroom
  && isolationGaps.length === 2 && hashCells(isolationGaps) === EXPECTED.isolationGaps
  && halo.length === 189 && hashCells(halo) === EXPECTED.halo
  && accommodation.length === 7_800 && hashCells(accommodation) === EXPECTED.accommodation
  && lowerCap.length === 12 && hashCells(lowerCap) === EXPECTED.lowerCap
  && curveAperture.length === 4 && hashCells(curveAperture) === EXPECTED.curveAperture
  && r12cRail.length === 231 && hashCells(r12cRail) === r12c.target.operatedUnion.coordinateSetSha256,
'selected rail geometry or protected interface drifted');
invariant(selectedPoints.every((point, index) => (
  point.index === index + 241 && point.x === 2288 && point.y === 130
    && point.z === -749 - index
)), 'selected rail subset is not the exact north-south cardinal leg');

const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
async function records(cells) {
  const output = [];
  for (const cell of uniqueCells(cells)) {
    output.push({
      cell,
      state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return output;
}
const targetRecords = await records(target);
const supportRecords = await records(support);
const headroomRecords = await records(headroom);
const isolationRecords = await records(isolationGaps);
const haloRecords = await records(halo);
const accommodationRecords = await records(accommodation);
const lowerCapRecords = await records(lowerCap);
const curveApertureRecords = await records(curveAperture);
const r12cRailRecords = await records(r12cRail);
invariant(targetRecords.every(({ state }) => state === AIR)
  && supportRecords.every(({ state }) => state === DIORITE)
  && headroomRecords.every(({ state }) => state === AIR)
  && isolationRecords.every(({ state }) => state === AIR)
  && lowerCapRecords.every(({ state }) => state === DIORITE)
  && curveApertureRecords.every(({ state }) => state === AIR)
  && r12cRailRecords.every(({ state }) => state === R12C_RAIL),
'target, support, gaps, interfaces, or R12C predecessor rail state drifted');
invariant(stateSetHash(haloRecords) === EXPECTED.haloState
  && stateSetHash(accommodationRecords) === EXPECTED.accommodationState,
'R12C post accommodation or target halo state drifted');

const priorDescriptors = [
  ...r12c.preservation.acceptedPriorReleaseTargetProof,
  { transactionId: r12c.transactionId, manifest: fileBinding(INPUTS.r12cManifest) },
];
const priorProof = [];
const allPriorHits = [];
const unreviewedPriorHits = [];
for (const descriptor of priorDescriptors) {
  invariant(fileBinding(descriptor.manifest.path).sha256 === descriptor.manifest.sha256,
    `accepted prior manifest ${descriptor.manifest.path} drifted`);
  const manifest = readJson(descriptor.manifest.path);
  const hits = uniqueCells((manifest.packages ?? []).flatMap((pkg) => (
    pkg.forward && fs.existsSync(abs(pkg.forward))
      ? operationIntersection(pkg.forward, target) : []
  )));
  allPriorHits.push(...hits);
  if (![r07h.transactionId, r07i.transactionId].includes(manifest.transactionId)) {
    unreviewedPriorHits.push(...hits);
  }
  priorProof.push({
    transactionId: manifest.transactionId,
    manifest: fileBinding(descriptor.manifest.path),
    targetIntersectionCount: hits.length,
    targetIntersectionCoordinateSetSha256: hits.length ? hashCells(hits) : null,
  });
}
const r07hHits = operationIntersection(r07h.packages[0].forward, target);
const r07iHits = operationIntersection(r07i.packages[0].forward, target);
invariant(uniqueCells(allPriorHits).length === 1
  && r07hHits.length === 1 && r07iHits.length === 1
  && hashCells(r07hHits) === hashCells(r07iHits)
  && uniqueCells(unreviewedPriorHits).length === 0,
'prior overlap is not exactly the reviewed R07H/R07I air-route migration');

const haloKeys = new Set(halo.map(cellKey));
const blockEntities = [];
const savedEntities = [];
for (const key of [...new Set(halo.map(({ x, z }) => (
  `${Math.floor(x / 16)},${Math.floor(z / 16)}`
)))]) {
  const [chunkX, chunkZ] = key.split(',').map(Number);
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const blockEntity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    if (haloKeys.has(`${blockEntity.x},${blockEntity.y},${blockEntity.z}`)) {
      blockEntities.push(blockEntity);
    }
  }
  const entityChunk = await entityReader.chunk(chunkX, chunkZ);
  for (const entity of entityChunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    if (halo.some((cell) => (
      Math.abs(cell.x - Number(entity.Pos[0])) <= 2
      && Math.abs(cell.y - Number(entity.Pos[1])) <= 3
      && Math.abs(cell.z - Number(entity.Pos[2])) <= 2
    ))) savedEntities.push(entity);
  }
}
const relicHits = relics.relics.filter((relic) => halo.some((cell) => (
  cell.x >= relic.declaredInclusiveBounds.minX
  && cell.x <= relic.declaredInclusiveBounds.maxX
  && cell.y >= relic.declaredInclusiveBounds.minY
  && cell.y <= relic.declaredInclusiveBounds.maxY
  && cell.z >= relic.declaredInclusiveBounds.minZ
  && cell.z <= relic.declaredInclusiveBounds.maxZ
)));
const haloFluids = haloRecords.filter(({ state }) => isFluid(state));
const haloGravity = haloRecords.filter(({ state }) => isGravity(state));
const haloMechanisms = haloRecords.filter(({ state }) => MECHANISM_BLOCKS.has(stateBase(state)));
const haloContainers = haloRecords.filter(({ state }) => CONTAINER_OR_CONTROL.has(stateBase(state)));
const reviewedHaloMechanism = haloMechanisms.filter(({ cell, state }) => (
  state === R12C_RAIL && cell.x === 2287 && cell.y === 130 && cell.z === -748
));
invariant(blockEntities.length === 0 && savedEntities.length === 0 && relicHits.length === 0
  && haloFluids.length === 0 && haloGravity.length === 0
  && haloMechanisms.length === 1 && reviewedHaloMechanism.length === 1
  && haloContainers.length === 0,
'target halo contains an undeclared entity, relic, fluid, gravity, mechanism, or container hazard');
invariant(target.every((cell, index) => {
  const cardinalNeighbours = target.filter((candidate) => (
    candidate.y === cell.y
    && Math.abs(candidate.x - cell.x) + Math.abs(candidate.z - cell.z) === 1
  )).length;
  return cardinalNeighbours === (index === 0 || index === target.length - 1 ? 1 : 2);
}), 'rail target is branched, disconnected, or has ambiguous rail adjacency');
invariant(target.every((cell) => r12cRail.every((prior) => (
  Math.abs(prior.x - cell.x) + Math.abs(prior.y - cell.y) + Math.abs(prior.z - cell.z) >= 2
))), 'R12C rail is cardinally adjacent despite the retained turn gap');

const forwardBody = `${targetRecords.map(({ cell, state }) => (
  replLine(cell, state, PASSIVE_RAIL)
)).join('\n')}\n`;
const rollbackBody = `${targetRecords.slice().reverse().map(({ cell, state }) => (
  replLine(cell, PASSIVE_RAIL, state)
)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forwardPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationHash) => `# GENERATED FILE - ${RELEASE_ID}/${PACKAGE_KEY} (${role})\n`
  + `# source root: ${SNAPSHOT}\n`
  + `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}\n`
  + `# target coordinate-set SHA-256: ${hashCells(target)}\n`
  + `# operation SHA-256: ${operationHash}\n`;
fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.writeFileSync(abs(forwardPath), `${header('forward', forwardSha256)}${forwardBody}`);
fs.writeFileSync(abs(rollbackPath), `${header('rollback', rollbackSha256)}${rollbackBody}`);

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const payload = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_R12D_ISOLATED_HAIRPIN_CARDINAL_PASSIVE_RAIL_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B09-ISOLATED-HAIRPIN-CARDINAL-PASSIVE-RAIL'],
  packages: [{ key: PACKAGE_KEY, forward: rel(forwardPath), rollback: rel(rollbackPath) }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'Install north-to-south within two retained air turn gaps; reverse rollback keeps every remaining rail on the single cardinal axis until removal.',
  },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'Z11-FUNICULAR-OPERATIONS',
    material: PASSIVE_RAIL,
    purpose: 'Install only the exact level north-south hairpin leg while both unproven 90-degree turns and the complete ascent remain fail-closed.',
    geometry: {
      fullFrozenRailDatum: classManifest(fullRailDatum),
      selectedHairpinCardinalRail: classManifest(target),
      exactSupport: classManifest(support),
      retainedHeadroom: classManifest(headroom),
      retainedIsolationTurnGaps: classManifest(isolationGaps),
      preservedR12cStraightRail: classManifest(r12cRail),
      retainedLowerB08Cap: classManifest(lowerCap),
      retainedR07iCurveAperture: classManifest(curveAperture),
    },
    selection: {
      firstCenterlineIndex: 241,
      lastCenterlineIndex: 259,
      excludedFirstTurnIndex: 240,
      excludedSecondTurnIndex: 260,
      firstAscendingDatumIndex: 262,
      axis: 'NORTH_SOUTH',
      contiguousCardinalRun: true,
      branchCount: 0,
      endpointCount: 2,
    },
    failSafeState: {
      passiveUnpoweredRailOnly: true,
      exactBlockState: PASSIVE_RAIL,
      northTurnGapState: AIR,
      southTurnGapState: AIR,
      connectedToR12cRail: false,
      curveRailInstalled: false,
      slopeRailInstalled: false,
      poweredRailInstalled: false,
      detectorOrActivatorRailInstalled: false,
      vehicleInstalled: false,
      driveBrakeControlPowerInstalled: false,
      passengerOrRescueUseAuthorized: false,
    },
    operationalBoundary: {
      staticPassiveGuidewayMaterialOnly: true,
      funicularCommissioned: false,
      routeCommissioned: false,
      passengerTransportCommissioned: false,
      exteriorInterfaceOpened: false,
    },
  },
  source: {
    snapshotRoot: rel(SNAPSHOT),
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    regionSnapshotSha256: regionIdentity.sha256,
    intakeAudit: fileBinding(INTAKE),
    predecessor: {
      transactionId: ledger.transactionId,
      executionLedger: fileBinding(SOURCE_LEDGER),
      completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
      executedManifest: fileBinding(INPUTS.r12cManifest),
      postQa: fileBinding(INPUTS.r12cQa),
      postQaPayloadSha256: r12cQa.qaPayloadSha256,
    },
    b09SourceState: {
      accommodation: classManifest(accommodation),
      blockStateSetSha256: stateSetHash(accommodationRecords),
      stateCensus: stateCensus(accommodationRecords),
    },
    targetStateSetSha256: stateSetHash(targetRecords),
    sourceStateCensus: { [AIR]: target.length },
  },
  target: {
    operatedUnion: classManifest(target),
    desiredStateCensus: { [PASSIVE_RAIL]: target.length },
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: target.length,
      rollbackCommandCount: target.length,
      targetCellCount: target.length,
      targetCoordinateSetSha256: hashCells(target),
      sourceStateCensus: { [AIR]: target.length },
      desiredStateCensus: { [PASSIVE_RAIL]: target.length },
      exactInverse: true,
      reverseOrderInverse: true,
      oneCellGuards: true,
    },
  },
  preservation: {
    acceptedPriorReleaseTargetProof: priorProof,
    reviewedR07hAirRouteMigration: classManifest(r07hHits),
    reviewedR07iAirRouteMigration: classManifest(r07iHits),
    undeclaredPriorReleaseIntersectionCount: uniqueCells(unreviewedPriorHits).length,
    exactSupport: { ...classManifest(support), sourceStateCensus: stateCensus(supportRecords) },
    retainedHeadroom: classManifest(headroom),
    retainedIsolationTurnGaps: classManifest(isolationGaps),
    preservedR12cStraightRail: { ...classManifest(r12cRail), sourceStateCensus: stateCensus(r12cRailRecords) },
    retainedLowerB08Cap: classManifest(lowerCap),
    retainedR07iCurveAperture: classManifest(curveAperture),
  },
  safetyAudit: {
    halo: {
      ...classManifest(halo),
      sourceStateCensus: stateCensus(haloRecords),
      sourceStateSetSha256: stateSetHash(haloRecords),
    },
    targetFluidCount: targetRecords.filter(({ state }) => isFluid(state)).length,
    haloFluidCount: haloFluids.length,
    haloGravityCount: haloGravity.length,
    haloExistingMechanismCount: haloMechanisms.length,
    reviewedAdjacentMechanismCount: reviewedHaloMechanism.length,
    reviewedAdjacentMechanism: reviewedHaloMechanism.map(({ cell, state }) => ({ cell, state })),
    haloUndeclaredMechanismCount: haloMechanisms.length - reviewedHaloMechanism.length,
    haloContainerOrControlCount: haloContainers.length,
    haloBlockEntityCount: blockEntities.length,
    haloSavedEntityCount: savedEntities.length,
    haloProtectedRelicCount: relicHits.length,
    exactSolidSupportCount: supportRecords.filter(({ state }) => state === DIORITE).length,
    exactAirHeadroomCount: headroomRecords.filter(({ state }) => state === AIR).length,
    railUpdateDeterminism: {
      straightSingleAxis: true,
      branchCount: 0,
      endpointNeighbourCount: 1,
      interiorNeighbourCount: 2,
      explicitPropertyState: PASSIVE_RAIL,
      forwardOrder: 'NORTH_TO_SOUTH',
      rollbackOrder: 'SOUTH_TO_NORTH',
      retainedTurnGapCount: isolationGaps.length,
      cardinalAdjacencyToPriorRailCount: 0,
      diagonalR12cRailCannotConnectThroughAirGap: true,
    },
  },
  standingAuthorization: {
    ...fileBinding(INPUTS.authorization),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
  },
  upstreamIdentities: {
    b09Technical: fileBinding(INPUTS.technical),
    connectors: fileBinding(INPUTS.connectors),
    d05: fileBinding(INPUTS.d05),
    releaseContract: fileBinding(INPUTS.releaseContract),
    r07hManifest: fileBinding(INPUTS.r07hManifest),
    r07iManifest: fileBinding(INPUTS.r07iManifest),
    r12cManifest: fileBinding(INPUTS.r12cManifest),
    r12cQa: fileBinding(INPUTS.r12cQa),
  },
  blockedRailClasses: {
    status: 'LOCAL_HOLD_ONLY_FOR_UNPROVEN_RAIL_UPDATE_CLASSES',
    excludedCells: [
      { centerlineIndex: 240, reason: '90-degree R12C-to-hairpin turn has no accepted exact rail state/update proof' },
      { centerlineIndex: 260, reason: '90-degree hairpin-to-ascent turn has no accepted exact rail state/update proof' },
      { firstCenterlineIndex: 261, lastCenterlineIndex: 560, reason: 'mixed curve/slope/summit datum requires exact state and neighbor-update simulation' },
    ],
    doesNotBlockThisIsolatedCardinalPackage: true,
  },
  residualActiveSystemBlockers: {
    status: 'LOCAL_HOLD_ONLY_FOR_UNDESIGNED_SYSTEMS',
    exactAbsentCellSets: [
      'platform barriers and gates',
      'drive, brake, overspeed, and vehicle',
      'power feed, controls, and emergency behavior',
      'drainage, sump, outfall, and receiver',
      'protected rescue continuation',
    ],
    source: `${INPUTS.technical}#/nullHeldSystemsAndInterfaces`,
    doesNotBlockThisIsolatedPassiveRailPackage: true,
  },
  hardSafetyKernelNext: [
    'rebind to the latest accepted immutable terminal if it has advanced',
    'fresh complete source and exact preflight',
    'fresh live entity clearance',
    'strict forward and rollback parser checks',
    'journaled strict execution',
    'fresh post and exact north-south rail-state plus rollback preflight QA',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    apiCallsPerformed: false,
    rconCallsPerformed: false,
    serviceMutationsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisOfflineCompile: false,
    funicularOrRouteCommissioned: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(payload));
fs.writeFileSync(abs(manifestPath), `${JSON.stringify({ ...payload, manifestIdentity }, null, 2)}\n`);
console.log(JSON.stringify({
  status: payload.status,
  manifest: rel(manifestPath),
  manifestIdentity,
  targetCellCount: target.length,
  targetCoordinateSetSha256: hashCells(target),
  sourceState: AIR,
  desiredState: PASSIVE_RAIL,
  isolationGapCount: isolationGaps.length,
  existingReviewedHaloMechanismCount: reviewedHaloMechanism.length,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
