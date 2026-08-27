#!/usr/bin/env node
/** Compile CZ-R10F: passive B09 curve/summit-return wayfinding. Offline only. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  buildB09MinimumReservation,
  cellKey,
  cellsIn,
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
const GENERATED_AT = value('--generated-at', '2026-08-22T00:35:00Z');
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
  'combined-zones-r10f-b09-curve-summit-passive-wayfinding',
);
const RELEASE_ID = 'CZ-R10F-P1-B09-CURVE-SUMMIT-PASSIVE-WAYFINDING';
const RELEASE_NODE_ID = 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT';
const PACKAGE_KEY = 'b09-curve-summit-passive-ceiling-wayfinding';
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const LIGHT = 'minecraft:sea_lantern';
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0],
  [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
const GRAVITY_BLOCKS = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:dragon_egg',
]);
const ACTIVE_MECHANISMS = new Set([
  'minecraft:rail', 'minecraft:powered_rail', 'minecraft:detector_rail',
  'minecraft:activator_rail', 'minecraft:redstone_wire',
  'minecraft:redstone_torch', 'minecraft:redstone_wall_torch',
  'minecraft:repeater', 'minecraft:comparator', 'minecraft:piston',
  'minecraft:sticky_piston', 'minecraft:observer', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:hopper',
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
  r07eManifest: 'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
  r07iManifest: 'data/buildops/combined-zones-r07i-b09-maximal-curve-summit-return.release-manifest.json',
  r10eManifest: 'data/buildops/combined-zones-r10e-b09-lower-guideway-passive-wayfinding.release-manifest.json',
  r10eQa: 'data/world-review/combined-zones-r10e-live-20260822T001339Z/r10e-post-release-qa.json',
});
const EXPECTED = Object.freeze({
  sourceComplete: '4705f8c8b5e25de25af862071f117573bc7c0aff9dd0edb0e0c4b7fd369c0cf0',
  sourceRegion: '8c41238e78e061a7ac3aafd58712f81fb7c66e9a6b41b2afdaa2ac3d26848443',
  sourceLedger: 'dc97d41cce9f162920fb76813061de071f387a16a1c19672595190399dda180c',
  sourceCompleted: '6c40b77e68ae455330eab4658c0c859132f3e60570b1a98c97decd4134c192f5',
  technicalIdentity: 'e8738f3932f2afc3ba71e35ccdebf0d5ef444ca7389e81ec31a18e48517d3eba',
  modelIdentity: '735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6',
  r07dManifestIdentity: '1bd7cafaa9f37a9b63e681fd73114b836b77b54544fee586ccabfe64ed19f49a',
  r07eManifestIdentity: 'e3e0055b807d28c7d52748c93f16b30d1903a719af3b31176b8805b6fcc0472d',
  r07iManifestIdentity: 'a4cb61ca44395ab97af49fb5075cb428e357a2b5f2724fd74960030b30c3a3f8',
  r10eManifestIdentity: '6432084e91ad29a98618059879fcd76d7098f4fa91d9bd9bbe648fe56e93874f',
  r10eQaPayload: '4a5baf32340813da6979d4bb4741e42edb214f54229c57d1743c4a4e4c6cca2e',
  targetHash: 'aff71953450823749a57f808f119ef333712418eb5be1755066c7bc643df61e4',
  segmentRouteHash: '6297d5963c2209e0d63d0735c7991922c4273da239189ff3e3ebe34c2839f528',
  segmentBoundaryHash: 'c9b496f220f312afa540155ae80f03e2df311d502f2467dd51da835ddb32346a',
  fullRouteHash: 'c0e162baf89a1e57db122facfaed2d11ea7ca3263716841caeb8684b8297c4b6',
  fullBoundaryHash: 'ea023f34cd465cb9f54944cb92822a69ed9104b9550be047d5724a33986ac915',
  westCapHash: 'a422d177fb7f1571b8a6243fcbf014fda17a910e60e7c03f7c21051f697a3e96',
  summitCapHash: 'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
  haloHash: 'e0af06050c1878668889aa107aa13c321b8a6b37838f38dc869b3754bd352779',
  b09Hash: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  sourceB09StateHash: 'c35c3de3dcfa24e3f588749aef0f8bfa09e26d6e9235a0a93c1b36afb5a4deef',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const invariant = (ok, message) => {
  if (!ok) throw new Error(`R10F B09 curve/summit wayfinding compiler rejected: ${message}`);
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
const stateSetHash = (records) => sha256(`combined-zones-current-block-state-set-v1\n${records
  .slice()
  .sort((a, b) => a.cell.x - b.cell.x || a.cell.y - b.cell.y || a.cell.z - b.cell.z)
  .map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);
const stateBase = (state) => state.split('[', 1)[0];
const stateCensus = (records) => Object.fromEntries([...records
  .reduce((counts, { state }) => counts.set(state, (counts.get(state) ?? 0) + 1), new Map())
  .entries()].sort(([a], [b]) => a.localeCompare(b)));
const isGravityState = (state) => GRAVITY_BLOCKS.has(stateBase(state))
  || stateBase(state).endsWith('_concrete_powder') || stateBase(state).endsWith('_anvil');

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
  invariant(throatX !== null, 'no accepted east-face throat');
  const faceRun = throatX - portal.x;
  const points = [];
  for (let d = 0; d <= faceRun; d += 1) {
    points.push({ x: portal.x + d, y: portal.y, z: portal.z });
  }
  for (let offset = 1; offset <= portal.z - climbZ; offset += 1) {
    points.push({ x: throatX, y: portal.y, z: portal.z - offset });
  }
  for (let d = 1; d <= faceRun; d += 1) {
    const x = throatX - d;
    points.push({ x, y: mountainSurfaceY(x, climbZ, model) + 1, z: climbZ });
  }
  for (let d = 1; d <= Math.abs(summit.z - climbZ); d += 1) {
    const z = climbZ - d;
    points.push({ x: summit.x, y: mountainSurfaceY(summit.x, z, model) + 1, z });
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
const r07e = readJson(INPUTS.r07eManifest);
const r07i = readJson(INPUTS.r07iManifest);
const r10e = readJson(INPUTS.r10eManifest);
const r10eQa = readJson(INPUTS.r10eQa);
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary.passed
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceComplete
  && abs(intake.input.suppliedWorldRoot) === abs(SNAPSHOT), 'source intake mismatch');
invariant(sha256(fs.readFileSync(abs(SOURCE_LEDGER))) === EXPECTED.sourceLedger
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
  && abs(ledger.postSnapshot.root) === abs(SNAPSHOT), 'source ledger mismatch');
invariant(regionIdentity.sha256 === EXPECTED.sourceRegion, 'source region identity mismatch');
invariant(technical.reportIdentitySha256 === EXPECTED.technicalIdentity
  && r07d.manifestIdentity === EXPECTED.r07dManifestIdentity
  && r07e.manifestIdentity === EXPECTED.r07eManifestIdentity
  && r07i.manifestIdentity === EXPECTED.r07iManifestIdentity
  && r10e.manifestIdentity === EXPECTED.r10eManifestIdentity
  && r10eQa.qaPayloadSha256 === EXPECTED.r10eQaPayload
  && r10eQa.summary.passed, 'frozen B09/R07/R10E identity mismatch');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && !authorization.revoked
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'R10 standing authorization absent');
const r10Node = contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r10Node?.canonicalOwners.includes('Z11-SUMMIT-FITOUT'),
'R10 does not own B09/Z11 fit-out');
invariant(fs.readFileSync(abs(INPUTS.currentState), 'utf8')
  .includes('R10E · B09 lower-guideway passive wayfinding'),
'CURRENT-STATE does not accept the R10E dependency');

const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
invariant(model.modelIdentitySha256 === EXPECTED.modelIdentity, 'selected model drifted');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const centerline = buildCenterline(model.formula, endpoints);
invariant(centerline.length === 561, 'centerline drifted');
const segmentPoints = centerline.slice(240, 551);
const segmentRoute = uniqueCells(segmentPoints.flatMap(({ x, y, z }) => [
  { x, y, z }, { x, y: y + 1, z },
]));
const segmentRouteKeys = new Set(segmentRoute.map(cellKey));
const segmentBoundary = uniqueCells(segmentRoute.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))
)).filter((cell) => !segmentRouteKeys.has(cellKey(cell))));
const fullRoutePoints = centerline.slice(3, 561);
const fullRoute = uniqueCells(fullRoutePoints.flatMap(({ x, y, z }) => [
  { x, y, z }, { x, y: y + 1, z },
]));
const fullRouteKeys = new Set(fullRoute.map(cellKey));
const fullBoundary = uniqueCells(fullRoute.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))
)).filter((cell) => !fullRouteKeys.has(cellKey(cell))));
const fixtureIndices = Array.from({ length: 19 }, (_, index) => 255 + index * 16);
const fixtures = fixtureIndices.map((index) => {
  const { x, y, z } = centerline[index];
  return { x, y: y + 2, z };
});
const acceptedFixtureIndices = [
  4, 7,
  ...Array.from({ length: 15 }, (_, index) => 15 + index * 16),
  ...fixtureIndices,
  552, 556, 560,
];
const maximumIndexDistanceToFixture = Math.max(...fullRoutePoints.map(({ index }) => (
  Math.min(...acceptedFixtureIndices.map((fixtureIndex) => Math.abs(index - fixtureIndex)))
)));
const westCap = cellsIn(r07d.scope.geometry.westIsolationCap.bounds);
const summitExternalCap = cellsIn(r07e.scope.geometry.summitInterfaceCap.bounds);
invariant(segmentRoute.length === 622 && hashCells(segmentRoute) === EXPECTED.segmentRouteHash
  && segmentBoundary.length === 1866 && hashCells(segmentBoundary) === EXPECTED.segmentBoundaryHash
  && fullRoute.length === 1116 && hashCells(fullRoute) === EXPECTED.fullRouteHash
  && fullBoundary.length === 3346 && hashCells(fullBoundary) === EXPECTED.fullBoundaryHash
  && fixtures.length === 19 && hashCells(fixtures) === EXPECTED.targetHash
  && fixtures.every((cell) => segmentBoundary.some((candidate) => (
    cellKey(candidate) === cellKey(cell)
  )))
  && fixtures.every((cell) => !fullRouteKeys.has(cellKey(cell)))
  && westCap.length === 12 && hashCells(westCap) === EXPECTED.westCapHash
  && summitExternalCap.length === 12 && hashCells(summitExternalCap) === EXPECTED.summitCapHash
  && maximumIndexDistanceToFixture === 8,
'curve/summit route, boundary, cadence, or caps drifted');

const accommodation = buildB09MinimumReservation(model.formula, endpoints);
invariant(accommodation.length === 7800 && hashCells(accommodation) === EXPECTED.b09Hash,
'B09 accommodation drifted');
const accommodationKeys = new Set(accommodation.map(cellKey));
invariant(fixtures.every((cell) => accommodationKeys.has(cellKey(cell))),
'fixture leaves canonical B09 accommodation');
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
const fixtureRecords = await records(fixtures);
const segmentRouteRecords = await records(segmentRoute);
const segmentBoundaryRecords = await records(segmentBoundary);
const fullRouteRecords = await records(fullRoute);
const fullBoundaryRecords = await records(fullBoundary);
const westCapRecords = await records(westCap);
const summitCapRecords = await records(summitExternalCap);
const currentB09 = await records(accommodation);
invariant(fixtureRecords.every(({ state }) => state === DIORITE)
  && segmentRouteRecords.every(({ state }) => state === AIR)
  && fullRouteRecords.every(({ state }) => state === AIR)
  && westCapRecords.every(({ state }) => state === DIORITE)
  && summitCapRecords.every(({ state }) => state === DIORITE),
'fixture source, route, B08 cap, or summit external cap is not exact');
invariant(segmentBoundaryRecords.filter(({ state }) => state === DIORITE).length === 1863
  && segmentBoundaryRecords.filter(({ state }) => state === AIR).length === 3,
'accepted curve/summit boundary is not exact 1863-diorite/3-air');
invariant(fullBoundaryRecords.filter(({ state }) => state === DIORITE).length === 3326
  && fullBoundaryRecords.filter(({ state }) => state === LIGHT).length === 20,
'complete accepted route boundary is not exact 3326-diorite/20-light');
invariant(stateSetHash(currentB09) === EXPECTED.sourceB09StateHash,
'R10E B09 source state drifted');

const priorPaths = [...new Set([
  ...(r10e.preservation.acceptedPriorReleaseTargetProof ?? [])
    .map(({ manifest }) => manifest.path),
  INPUTS.r10eManifest,
])].sort();
const priorProof = [];
const allPriorHits = [];
const unreviewedPriorHits = [];
for (const manifestPath of priorPaths) {
  const priorManifest = readJson(manifestPath);
  const hits = uniqueCells((priorManifest.packages ?? []).flatMap((pkg) => (
    pkg.forward && fs.existsSync(abs(pkg.forward))
      ? operationIntersection(pkg.forward, fixtures) : []
  )));
  allPriorHits.push(...hits);
  if (priorManifest.transactionId !== r07i.transactionId) unreviewedPriorHits.push(...hits);
  priorProof.push({
    transactionId: priorManifest.transactionId,
    manifest: fileBinding(manifestPath),
    targetIntersectionCount: hits.length,
  });
}
const r07iHits = operationIntersection(r07i.packages[0].forward, fixtures);
invariant(uniqueCells(allPriorHits).length === 19
  && r07iHits.length === 19
  && uniqueCells(unreviewedPriorHits).length === 0,
'prior overlap is not exactly the reviewed R07I ceiling migration');

const halo = uniqueCells(fixtures.flatMap((cell) => [
  cell,
  ...FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  })),
]));
invariant(halo.length === 133 && hashCells(halo) === EXPECTED.haloHash,
'fixture halo drifted');
const haloRecords = await records(halo);
invariant(haloRecords.filter(({ state }) => state === AIR).length === 38
  && haloRecords.filter(({ state }) => state === DIORITE).length === 95,
'fixture halo source census drifted');
const haloKeys = new Set(halo.map(cellKey));
const blockEntities = [];
const savedEntities = [];
for (const key of [...new Set(halo.map(({ x, z }) => (
  `${Math.floor(x / 16)},${Math.floor(z / 16)}`
)))]) {
  const [cx, cz] = key.split(',').map(Number);
  const chunk = await reader.chunk(cx, cz);
  for (const be of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    if (haloKeys.has(`${be.x},${be.y},${be.z}`)) blockEntities.push(be);
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    if (Array.isArray(entity.Pos) && halo.some((cell) => (
      Math.abs(cell.x - entity.Pos[0]) <= 2
      && Math.abs(cell.y - entity.Pos[1]) <= 3
      && Math.abs(cell.z - entity.Pos[2]) <= 2
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
const haloFluids = haloRecords.filter(({ state }) => state.startsWith('minecraft:water')
  || state.startsWith('minecraft:lava') || state.includes('waterlogged=true'));
const haloGravity = haloRecords.filter(({ state }) => isGravityState(state));
const haloMechanisms = haloRecords.filter(({ state }) => ACTIVE_MECHANISMS.has(stateBase(state)));
invariant(blockEntities.length === 0 && savedEntities.length === 0 && relicHits.length === 0
  && haloFluids.length === 0 && haloGravity.length === 0 && haloMechanisms.length === 0,
'halo entity, relic, fluid, gravity, or active-mechanism hazard');

const forwardBody = `${fixtureRecords
  .map(({ cell, state }) => replLine(cell, state, LIGHT)).join('\n')}\n`;
const rollbackBody = `${fixtureRecords.slice().reverse()
  .map(({ cell, state }) => replLine(cell, LIGHT, state)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forwardPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationHash) => `# GENERATED FILE - ${RELEASE_ID}/${PACKAGE_KEY} (${role})\n`
  + `# source root: ${SNAPSHOT}\n`
  + `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}\n`
  + `# target coordinate-set SHA-256: ${hashCells(fixtures)}\n`
  + `# operation SHA-256: ${operationHash}\n`;
fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.writeFileSync(abs(forwardPath), `${header('forward', forwardSha256)}${forwardBody}`);
fs.writeFileSync(abs(rollbackPath), `${header('rollback', rollbackSha256)}${rollbackBody}`);
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const payload = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R10E_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B09-CURVE-SUMMIT-PASSIVE-WAYFINDING', 'Z11-SUMMIT-FITOUT'],
  packages: [{ key: PACKAGE_KEY, forward: rel(forwardPath), rollback: rel(rollbackPath) }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'One static full-cube curve/summit-return ceiling-wayfinding package; rollback restores the R07I ceiling fabric in exact reverse order.',
  },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'Z11-SUMMIT-FITOUT',
    material: LIGHT,
    purpose: 'Continue the accepted 16-index passive visual cadence across the complete R07I curve and summit return without altering its route or external caps.',
    geometry: {
      acceptedCurveAndSummitReturnRoute: classManifest(segmentRoute),
      acceptedCurveAndSummitReturnFaceBoundary: classManifest(segmentBoundary),
      acceptedCompleteB09Route: classManifest(fullRoute),
      acceptedCompleteB09RouteFaceBoundary: classManifest(fullBoundary),
      passiveCeilingWayfindingFixtures: classManifest(fixtures),
      retainedB08WestCap: classManifest(westCap),
      retainedSummitExternalCap: classManifest(summitExternalCap),
    },
    fixtureCadence: {
      centerlineIndices: fixtureIndices,
      firstCurveCenterlineIndex: 240,
      lastCurveCenterlineIndex: 550,
      acceptedPredecessorFixtureIndices: [
        4, 7,
        ...Array.from({ length: 15 }, (_, index) => 15 + index * 16),
      ],
      acceptedSuccessorFixtureIndices: [552, 556, 560],
      maximumCompleteRouteIndexDistanceToAcceptedFixture: maximumIndexDistanceToFixture,
      maximumNewFixtureSpacingInIndices: 16,
      photometricEmergencyOrLifeSafetyLightingClaimed: false,
    },
    ownership: {
      exactReviewedPriorMigration: {
        priorOwner: 'P1-B09-FUNICULAR-FRAMEWORK/R07I',
        newOwner: 'Z11-SUMMIT-FITOUT/PASSIVE-B09-TRANSPORT-FITOUT',
        cellSet: classManifest(fixtures),
        r07iTargetIntersectionCount: r07iHits.length,
        otherPriorTargetIntersectionCount: uniqueCells(unreviewedPriorHits).length,
      },
    },
    operationalBoundary: {
      routeVoidChanged: false,
      enclosureOpened: false,
      b08ExternalInterfaceOpened: false,
      summitExternalInterfaceOpened: false,
      activeMechanismInstalled: false,
      railInstalled: false,
      driveBrakeVehicleControlsPowerDrainageInstalled: false,
      photometricEmergencyOrLifeSafetyLightingCommissioned: false,
      funicularCommissioned: false,
      pedestrianRouteCommissioned: false,
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
    },
    b09SourceState: {
      accommodation: classManifest(accommodation),
      blockStateSetSha256: stateSetHash(currentB09),
    },
    sourceStateCensus: { [DIORITE]: fixtures.length },
  },
  target: {
    operatedUnion: classManifest(fixtures),
    desiredStateCensus: { [LIGHT]: fixtures.length },
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: fixtures.length,
      rollbackCommandCount: fixtures.length,
      targetCellCount: fixtures.length,
      targetCoordinateSetSha256: hashCells(fixtures),
      sourceStateCensus: { [DIORITE]: fixtures.length },
      desiredStateCensus: { [LIGHT]: fixtures.length },
      exactInverse: true,
      reverseOrderInverse: true,
      oneCellGuards: true,
    },
  },
  preservation: {
    acceptedPriorReleaseTargetProof: priorProof,
    exactOwnedR07iOverlap: classManifest(r07iHits),
    undeclaredPriorReleaseIntersectionCount: uniqueCells(unreviewedPriorHits).length,
    retainedCurveAndSummitReturnRoute: classManifest(segmentRoute),
    retainedCurveAndSummitReturnBoundary: {
      ...classManifest(segmentBoundary),
      sourceStateCensus: stateCensus(segmentBoundaryRecords),
    },
    retainedCompleteB09Route: classManifest(fullRoute),
    retainedCompleteB09Boundary: {
      ...classManifest(fullBoundary),
      sourceStateCensus: stateCensus(fullBoundaryRecords),
    },
    retainedB08WestCap: classManifest(westCap),
    retainedSummitExternalCap: classManifest(summitExternalCap),
  },
  safetyAudit: {
    halo: { ...classManifest(halo), sourceStateCensus: stateCensus(haloRecords) },
    targetFluidCount: 0,
    haloFluidCount: haloFluids.length,
    haloGravityCount: haloGravity.length,
    haloActiveMechanismCount: haloMechanisms.length,
    haloBlockEntityCount: blockEntities.length,
    haloSavedEntityCount: savedEntities.length,
    haloProtectedRelicCount: relicHits.length,
    targetMaterialFullCubeNonGravityNonBlockEntity: true,
    routeClearancePreserved: true,
    enclosureContinuityPreserved: true,
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
    r07eManifest: fileBinding(INPUTS.r07eManifest),
    r07iManifest: fileBinding(INPUTS.r07iManifest),
    r10eManifest: fileBinding(INPUTS.r10eManifest),
    r10eQa: fileBinding(INPUTS.r10eQa),
  },
  activeTransportBlocker: {
    status: 'LOCAL_HOLD_NO_EXACT_ACCEPTED_MECHANISM_GEOMETRY',
    appliesTo: [
      'rail', 'drive', 'brake', 'vehicle', 'barriers',
      'controls', 'power', 'drainage', 'commissioning',
    ],
    source: `${INPUTS.technical}#/nullHeldSystemsAndInterfaces`,
    doesNotBlockThisStaticPassiveWayfindingScope: true,
  },
  hardSafetyKernelNext: [
    'fresh complete source and exact preflight',
    'fresh live entity clearance',
    'strict parser checks',
    'journaled strict execution',
    'fresh post and rollback preflight',
    'independent fixture, route, cap, boundary, and no-drift QA',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
    b08ExternalInterfaceOpened: false,
    summitExternalInterfaceOpened: false,
    activeTransportOrLightingSystemCommissioned: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(payload));
fs.writeFileSync(abs(manifestPath), `${JSON.stringify({ ...payload, manifestIdentity }, null, 2)}\n`);
console.log(JSON.stringify({
  status: payload.status,
  manifest: rel(manifestPath),
  manifestIdentity,
  targets: fixtures.length,
  fixtureIndices,
  curveAndSummitRouteCells: segmentRoute.length,
  fullRouteCells: fullRoute.length,
  fullBoundaryCells: fullBoundary.length,
  maximumIndexDistanceToFixture,
  activeTransportBlocked: true,
  liveCallsPerformed: false,
}, null, 2));
