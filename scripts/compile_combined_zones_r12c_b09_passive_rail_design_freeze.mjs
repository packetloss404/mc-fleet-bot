#!/usr/bin/env node
/** Compile CZ-R12C: isolated passive B09 lower-guideway rail design freeze. */

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
const GENERATED_AT = value('--generated-at', '2026-08-22T00:40:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r10e-post-20260822T001339Z',
);
const INTAKE = value(
  '--intake-audit',
  'data/world-review/combined-zones-r10e-live-20260822T001339Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r10e-live-20260822T001339Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r12c-b09-isolated-lower-straight-passive-rail-design-freeze',
);
const RELEASE_ID = 'CZ-R12C-P1-B09-ISOLATED-LOWER-STRAIGHT-PASSIVE-RAIL';
const RELEASE_NODE_ID = 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING';
const PACKAGE_KEY = 'b09-isolated-lower-straight-passive-rail';
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const PASSIVE_RAIL = 'minecraft:rail[shape=east_west,waterlogged=false]';
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
  r07dManifest: 'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
  r07fManifest: 'data/buildops/combined-zones-r07f-b09-lower-guideway-segment-01.release-manifest.json',
  r07hManifest: 'data/buildops/combined-zones-r07h-b09-lower-guideway-segment-02.release-manifest.json',
  r07iManifest: 'data/buildops/combined-zones-r07i-b09-maximal-curve-summit-return.release-manifest.json',
  r10eQa: 'data/world-review/combined-zones-r10e-live-20260822T001339Z/r10e-post-release-qa.json',
  r12bSeal:
    'data/world-review/combined-zones-r12b-b09-static-readiness-r10e-20260822T002500Z/r12b-readiness.json',
});
const EXPECTED = Object.freeze({
  sourceComplete: '4705f8c8b5e25de25af862071f117573bc7c0aff9dd0edb0e0c4b7fd369c0cf0',
  sourceRegion: '8c41238e78e061a7ac3aafd58712f81fb7c66e9a6b41b2afdaa2ac3d26848443',
  sourceLedger: 'dc97d41cce9f162920fb76813061de071f387a16a1c19672595190399dda180c',
  sourceCompleted: '6c40b77e68ae455330eab4658c0c859132f3e60570b1a98c97decd4134c192f5',
  r10eQa: '6c28d303646407e9590aa61b3aa5ff86550820443d60ff03b8c232f20ebdc6ee',
  r10eQaPayload: '4a5baf32340813da6979d4bb4741e42edb214f54229c57d1743c4a4e4c6cca2e',
  r12bSeal: '46959a8314aa920891ec23a3a87c27a20dc3c5dd6302511ee32cbf67ca250db8',
  r12bPayload: 'bf2a1a6a93ca51c2a2ba3e6bbdbb95ec7ff3a8f97434205abaa899edd9269044',
  technical: 'f9b57fb317ff983acacbf98cb0a7776246c242025f583d9795594a6a799898c8',
  technicalIdentity: 'e8738f3932f2afc3ba71e35ccdebf0d5ef444ca7389e81ec31a18e48517d3eba',
  connectors: '8bb2dd803c434667dfeee440ccdf8428a115962e21dd1b3b0e6955cce672dc4e',
  d05: '1446c75cec504478130a8e9c5569c68c7a7569a29c4210e9b21ca5d804aeb2f3',
  contract: '64f4432f00bd31fe8e5cd12921cd91bdc84b32c5c16630e62138accdf94ed8e0',
  authorization: 'd3b5f17862074080ae9db81e2932c56f6e96c926979748f8a3bcc09c22b3ad1a',
  relics: '1739502e8bf19283cabfe9930f26011dba97c11e6328da27ee0b7f651f7a0a22',
  modelIdentity: '735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6',
  centerline: 'e8905742a77148d13d799362da7d65e9b02bcf96455d580fbee27367b2d24221',
  railDatum: '91b5174e01bde419175c68997f199f01b04ee38cbde13304ab4dd9a0d0d979b8',
  target: 'd0ce28ec1df09ee872d9885bd65d858e8a39c1d4c377ca532bfafa481bd91b0f',
  support: 'ca3a506b07876b43ed8151d5101552395e274c8f9f1d951035cdd3fcf2cf21c2',
  headroom: 'edde9c1e8d6355b0f4aa56331d74299867d6211c34d06b6301c54667e04814d8',
  isolationGaps: '747357ace842f6b4a3dc16cc5b838294d042204a17416a6306e50097365958e6',
  halo: '834616ef9b187577d267ac796e5cbbe9ed4ec7222121db61a174a25fc1905618',
  accommodation: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  accommodationState: 'c35c3de3dcfa24e3f588749aef0f8bfa09e26d6e9235a0a93c1b36afb5a4deef',
  lowerCap: 'a422d177fb7f1571b8a6243fcbf014fda17a910e60e7c03f7c21051f697a3e96',
  curveAperture: '9991feda6e953dd4e66585d7e23a61723c3319cb59c22782196fab028f2c08bb',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12C B09 passive-rail compiler rejected: ${message}`);
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
const r07d = readJson(INPUTS.r07dManifest);
const r07f = readJson(INPUTS.r07fManifest);
const r07h = readJson(INPUTS.r07hManifest);
const r07i = readJson(INPUTS.r07iManifest);
const r10eQa = readJson(INPUTS.r10eQa);
const r12b = readJson(INPUTS.r12bSeal);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary.passed
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceComplete
  && abs(intake.input.suppliedWorldRoot) === abs(SNAPSHOT), 'source intake mismatch');
invariant(fileBinding(SOURCE_LEDGER).sha256 === EXPECTED.sourceLedger
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
  && abs(ledger.postSnapshot.root) === abs(SNAPSHOT), 'source ledger mismatch');
invariant(regionIdentity.sha256 === EXPECTED.sourceRegion, 'source region identity mismatch');
invariant(fileBinding(INPUTS.r10eQa).sha256 === EXPECTED.r10eQa
  && r10eQa.qaPayloadSha256 === EXPECTED.r10eQaPayload
  && r10eQa.summary.passed
  && r10eQa.disposition.funicularCommissioned === false,
'R10E post-QA binding drifted');
invariant(fileBinding(INPUTS.r12bSeal).sha256 === EXPECTED.r12bSeal
  && r12b.commissioningPayloadSha256 === EXPECTED.r12bPayload
  && r12b.status === 'PASS_B09_STATIC_ENCLOSURE_AND_MECHANISM_INSTALLATION_READINESS_ACCEPTED'
  && r12b.commissioningBoundary.funicularCommissioned === false,
'R12B readiness binding drifted');
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
invariant(fs.readFileSync(abs(INPUTS.currentState), 'utf8')
  .includes('R12B · B09 static enclosure readiness'),
'CURRENT-STATE does not accept the R12B dependency');

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

// Indices 9..239 are the maximal straight cardinal subset after the lower
// station envelope and before the first curve. The retained air cells at 8
// and 240 keep both interfaces physically disconnected and fail-closed.
const selectedPoints = centerline.slice(9, 240);
const target = selectedPoints.map(({ x, y, z }) => ({ x, y, z }));
const support = target.map(({ x, y, z }) => ({ x, y: y - 1, z }));
const headroom = target.map(({ x, y, z }) => ({ x, y: y + 1, z }));
const isolationGaps = [centerline[8], centerline[240]].map(({ x, y, z }) => ({ x, y, z }));
const halo = dilateCells(target, 1);
const accommodation = buildB09MinimumReservation(model.formula, endpoints);
const lowerCap = cellsIn(r07d.scope.geometry.westIsolationCap.bounds);
const curveAperture = cellsIn(r07i.scope.geometry.ownedR07hFourCellTurnAperture.bounds);
invariant(target.length === 231 && hashCells(target) === EXPECTED.target
  && support.length === 231 && hashCells(support) === EXPECTED.support
  && headroom.length === 231 && hashCells(headroom) === EXPECTED.headroom
  && isolationGaps.length === 2 && hashCells(isolationGaps) === EXPECTED.isolationGaps
  && halo.length === 2_097 && hashCells(halo) === EXPECTED.halo
  && accommodation.length === 7_800 && hashCells(accommodation) === EXPECTED.accommodation
  && lowerCap.length === 12 && hashCells(lowerCap) === EXPECTED.lowerCap
  && curveAperture.length === 4 && hashCells(curveAperture) === EXPECTED.curveAperture,
'selected rail geometry or protected interface drifted');
invariant(selectedPoints.every((point, index) => (
  point.index === index + 9
    && point.y === 130 && point.z === -748
    && (index === 0 || point.x === selectedPoints[index - 1].x + 1)
)), 'selected rail subset is not one exact east-west cardinal run');
const targetKeys = new Set(target.map(cellKey));
invariant(target.every((cell) => fullRailDatum.some((candidate) => cellKey(candidate) === cellKey(cell)))
  && isolationGaps.every((cell) => !targetKeys.has(cellKey(cell))),
'selected target escapes its rail datum or consumes an isolation gap');

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
invariant(targetRecords.every(({ state }) => state === AIR)
  && supportRecords.every(({ state }) => state === DIORITE)
  && headroomRecords.every(({ state }) => state === AIR)
  && isolationRecords.every(({ state }) => state === AIR)
  && lowerCapRecords.every(({ state }) => state === DIORITE)
  && curveApertureRecords.every(({ state }) => state === AIR),
'target, support, headroom, gaps, or retained interface source state drifted');
invariant(stateSetHash(accommodationRecords) === EXPECTED.accommodationState,
'R10E B09 accommodation state drifted');

const priorPaths = fs.readdirSync(abs('data/buildops'))
  .filter((name) => name.startsWith('combined-zones-')
    && name.endsWith('.release-manifest.json') && !name.startsWith(BASENAME))
  .sort()
  .map((name) => `data/buildops/${name}`);
const priorProof = [];
const allPriorHits = [];
const unreviewedPriorHits = [];
for (const manifestPath of priorPaths) {
  const manifest = readJson(manifestPath);
  const hits = uniqueCells((manifest.packages ?? []).flatMap((pkg) => (
    pkg.forward && fs.existsSync(abs(pkg.forward))
      ? operationIntersection(pkg.forward, target) : []
  )));
  allPriorHits.push(...hits);
  if (![r07d.transactionId, r07f.transactionId, r07h.transactionId]
    .includes(manifest.transactionId)) {
    unreviewedPriorHits.push(...hits);
  }
  priorProof.push({
    transactionId: manifest.transactionId,
    manifest: fileBinding(manifestPath),
    targetIntersectionCount: hits.length,
  });
}
const r07dHits = operationIntersection(r07d.packages[0].forward, target);
const r07fHits = operationIntersection(r07f.packages[0].forward, target);
const r07hHits = operationIntersection(r07h.packages[0].forward, target);
invariant(uniqueCells(allPriorHits).length === 2
  && r07dHits.length === 1 && r07fHits.length === 2 && r07hHits.length === 1
  && uniqueCells([...r07dHits, ...r07fHits, ...r07hHits]).length === 2
  && uniqueCells(unreviewedPriorHits).length === 0,
'prior overlap is not exactly the reviewed R07D/R07F/R07H seam migration');

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
invariant(blockEntities.length === 0 && savedEntities.length === 0 && relicHits.length === 0
  && haloFluids.length === 0 && haloGravity.length === 0
  && haloMechanisms.length === 0 && haloContainers.length === 0,
'target halo contains an entity, relic, fluid, gravity, mechanism, or container hazard');

const targetNeighbourCounts = target.map((cell) => (
  target.filter((candidate) => candidate.y === cell.y && candidate.z === cell.z
    && Math.abs(candidate.x - cell.x) === 1).length
));
invariant(targetNeighbourCounts.filter((count) => count === 1).length === 2
  && targetNeighbourCounts.filter((count) => count === 2).length === target.length - 2
  && targetNeighbourCounts.every((count) => count === 1 || count === 2),
'rail target is branched, disconnected, or has ambiguous rail-update adjacency');

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
  status: 'COMPILED_R12C_PASSIVE_RAIL_DESIGN_FREEZE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B09-ISOLATED-LOWER-STRAIGHT-PASSIVE-RAIL'],
  packages: [{ key: PACKAGE_KEY, forward: rel(forwardPath), rollback: rel(rollbackPath) }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'One west-to-east exact passive-rail run; rollback removes it east-to-west so every remaining endpoint rail retains an east-west neighbour until removed.',
  },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'Z11-FUNICULAR-OPERATIONS',
    material: PASSIVE_RAIL,
    purpose: 'Freeze and compile the maximal straight cardinal passive-rail subset between the lower-station and first-curve isolation gaps.',
    geometry: {
      fullFrozenRailDatum: classManifest(fullRailDatum),
      selectedStraightRail: classManifest(target),
      exactSupport: classManifest(support),
      retainedHeadroom: classManifest(headroom),
      retainedIsolationGaps: classManifest(isolationGaps),
      retainedLowerB08Cap: classManifest(lowerCap),
      retainedR07iCurveAperture: classManifest(curveAperture),
    },
    selection: {
      firstCenterlineIndex: 9,
      lastCenterlineIndex: 239,
      excludedLowerStationLastIndex: 8,
      excludedFirstCurveIndex: 240,
      axis: 'EAST_WEST',
      contiguousCardinalRun: true,
      branchCount: 0,
      endpointCount: 2,
    },
    failSafeState: {
      passiveUnpoweredRailOnly: true,
      exactBlockState: PASSIVE_RAIL,
      westIsolationGapState: AIR,
      eastIsolationGapState: AIR,
      stationRailInstalled: false,
      curveRailInstalled: false,
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
      platformBarrierDesignedOrInstalled: false,
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
      postQa: fileBinding(INPUTS.r10eQa),
      postQaPayloadSha256: r10eQa.qaPayloadSha256,
      r12bReadinessSeal: fileBinding(INPUTS.r12bSeal),
      r12bReadinessPayloadSha256: r12b.commissioningPayloadSha256,
    },
    b09SourceState: {
      accommodation: classManifest(accommodation),
      blockStateSetSha256: stateSetHash(accommodationRecords),
    },
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
    reviewedR07dLowerShellMigration: classManifest(r07dHits),
    reviewedR07fAirRouteMigration: classManifest(r07fHits),
    reviewedR07hAirRouteMigration: classManifest(r07hHits),
    undeclaredPriorReleaseIntersectionCount: uniqueCells(unreviewedPriorHits).length,
    exactSupport: {
      ...classManifest(support),
      sourceStateCensus: stateCensus(supportRecords),
    },
    retainedHeadroom: classManifest(headroom),
    retainedIsolationGaps: classManifest(isolationGaps),
    retainedLowerB08Cap: classManifest(lowerCap),
    retainedR07iCurveAperture: classManifest(curveAperture),
  },
  safetyAudit: {
    halo: { ...classManifest(halo), sourceStateCensus: stateCensus(haloRecords) },
    targetFluidCount: targetRecords.filter(({ state }) => isFluid(state)).length,
    haloFluidCount: haloFluids.length,
    haloGravityCount: haloGravity.length,
    haloExistingMechanismCount: haloMechanisms.length,
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
      forwardOrder: 'WEST_TO_EAST',
      rollbackOrder: 'EAST_TO_WEST',
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
    r07dManifest: fileBinding(INPUTS.r07dManifest),
    r07fManifest: fileBinding(INPUTS.r07fManifest),
    r07hManifest: fileBinding(INPUTS.r07hManifest),
    r07iManifest: fileBinding(INPUTS.r07iManifest),
    r10eQa: fileBinding(INPUTS.r10eQa),
    r12bSeal: fileBinding(INPUTS.r12bSeal),
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
    'fresh post and exact east-west rail-state plus rollback preflight QA',
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
  residualDesignedSystemBlockerCount: payload.residualActiveSystemBlockers.exactAbsentCellSets.length,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
