#!/usr/bin/env node
/** Compile CZ-R10E: passive lower-guideway wayfinding fixtures. Offline only. */

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
const GENERATED_AT = value('--generated-at', '2026-08-22T00:15:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r10d-post-20260821T235524Z',
);
const INTAKE = value(
  '--intake-audit',
  'data/world-review/combined-zones-r10d-live-20260821T235524Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r10d-live-20260821T235524Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r10e-b09-lower-guideway-passive-wayfinding',
);
const RELEASE_ID = 'CZ-R10E-P1-B09-LOWER-GUIDEWAY-PASSIVE-WAYFINDING';
const RELEASE_NODE_ID = 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT';
const PACKAGE_KEY = 'b09-lower-guideway-passive-ceiling-wayfinding';
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
  r07fManifest: 'data/buildops/combined-zones-r07f-b09-lower-guideway-segment-01.release-manifest.json',
  r07hManifest: 'data/buildops/combined-zones-r07h-b09-lower-guideway-segment-02.release-manifest.json',
  r07iManifest: 'data/buildops/combined-zones-r07i-b09-maximal-curve-summit-return.release-manifest.json',
  r10dManifest: 'data/buildops/combined-zones-r10d-b09-lower-station-passive-lighting.release-manifest.json',
  r10dQa: 'data/world-review/combined-zones-r10d-live-20260821T235524Z/r10d-post-release-qa.json',
});
const EXPECTED = Object.freeze({
  sourceComplete: 'f3bdba213805aa601b8bed7f9cb58b75a44a84f27ef643a80a8e0bf6d53672cb',
  sourceRegion: '5ab0829c8d4a5e5b88f7b3b494b36ddc5461cc52cc902fa7223fa2b440ea1284',
  sourceLedger: '4371d975528be948049d4ca31fec234e58029e92f33e72179a4d1b439863addb',
  sourceCompleted: 'f8d324f9adc05de99090c6e511479b13e703f3202bda51c3a1157ea7958e6ff7',
  technicalIdentity: 'e8738f3932f2afc3ba71e35ccdebf0d5ef444ca7389e81ec31a18e48517d3eba',
  modelIdentity: '735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6',
  r07fManifestIdentity: '0260263944b561a612f786f1fb0fd0345d1afd18da4f5ff13e207cd777687354',
  r07hManifestIdentity: 'a1797eff976b42649ba9dfc3cfa08112e85a6d06f73ca3a14427f6c3dc586416',
  r07iManifestIdentity: 'a4cb61ca44395ab97af49fb5075cb428e357a2b5f2724fd74960030b30c3a3f8',
  r10dManifestIdentity: '07b41c9651562cc01e5ae6d072dca626ddff443d6ba24fbf247120e2bccfb601',
  r10dQaPayload: 'e6e78f778774bb1bb6b0df6bf1bd594bc39fc50f9cddb1304e118f81f94eff03',
  targetHash: '81625f2011e725b624a699ad7176ee2c3d85f065f3f9e1589ec3cd96f1cb705f',
  lowerRouteHash: '33c4566c2030f7e9f5d7cac5a65bb5579a551a2e848a3354f543ef566e969eb1',
  lowerBoundaryHash: '131169b3d54c7781fccd906c83c68d6c90ce50c8e3c0da3cd21f407dfb07b758',
  westCapHash: 'a422d177fb7f1571b8a6243fcbf014fda17a910e60e7c03f7c21051f697a3e96',
  curveApertureHash: '9991feda6e953dd4e66585d7e23a61723c3319cb59c22782196fab028f2c08bb',
  curveCollarHash: '5d96ac6cef022abbbb1be498188c65b9f4032572f83980cb1460ba1e8b2e6c99',
  haloHash: 'd474cf24909f624368a26bd7daf38536375fe4936e19513f835c9b5a6a20383a',
  b09Hash: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  sourceB09StateHash: '085b77456806ea0496343cd9eb47107da9c37872a67632ebb630a563914937ca',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const invariant = (ok, message) => {
  if (!ok) throw new Error(`R10E B09 lower-guideway compiler rejected: ${message}`);
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
const r07f = readJson(INPUTS.r07fManifest);
const r07h = readJson(INPUTS.r07hManifest);
const r07i = readJson(INPUTS.r07iManifest);
const r10d = readJson(INPUTS.r10dManifest);
const r10dQa = readJson(INPUTS.r10dQa);
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
  && r07f.manifestIdentity === EXPECTED.r07fManifestIdentity
  && r07h.manifestIdentity === EXPECTED.r07hManifestIdentity
  && r07i.manifestIdentity === EXPECTED.r07iManifestIdentity
  && r10d.manifestIdentity === EXPECTED.r10dManifestIdentity
  && r10dQa.qaPayloadSha256 === EXPECTED.r10dQaPayload
  && r10dQa.summary.passed, 'frozen B09/R07/R10D identity mismatch');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && !authorization.revoked
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'R10 standing authorization absent');
const r10Node = contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r10Node?.canonicalOwners.includes('Z11-SUMMIT-FITOUT'),
'R10 does not own B09/Z11 fit-out');
invariant(fs.readFileSync(abs(INPUTS.currentState), 'utf8')
  .includes('R10D · B09 lower-station passive lighting'),
'CURRENT-STATE does not accept the R10D dependency');

const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
invariant(model.modelIdentitySha256 === EXPECTED.modelIdentity, 'selected model drifted');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const centerline = buildCenterline(model.formula, endpoints);
invariant(centerline.length === 561, 'centerline drifted');
const lowerPoints = centerline.slice(3, 240);
const lowerRoute = uniqueCells(lowerPoints.flatMap(({ x, y, z }) => [
  { x, y, z }, { x, y: y + 1, z },
]));
const routeKeys = new Set(lowerRoute.map(cellKey));
const lowerBoundary = uniqueCells(lowerRoute.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx,
    y: cell.y + dy,
    z: cell.z + dz,
  }))
)).filter((cell) => !routeKeys.has(cellKey(cell))));
const fixtureIndices = Array.from({ length: 15 }, (_, index) => 15 + index * 16);
const fixtures = fixtureIndices.map((index) => {
  const { x, y, z } = centerline[index];
  return { x, y: y + 2, z };
});
const westCap = cellsIn(r07d.scope.geometry.westIsolationCap.bounds);
const curveAperture = cellsIn(r07i.scope.geometry.ownedR07hFourCellTurnAperture.bounds);
const curveApertureKeys = new Set(curveAperture.map(cellKey));
const curveCollar = cellsIn(r07h.scope.geometry.newFarIsolationCap.bounds)
  .filter((cell) => !curveApertureKeys.has(cellKey(cell)));
const acceptedFixtureIndices = [4, 7, ...fixtureIndices];
const maximumIndexDistanceToFixture = Math.max(...lowerPoints.map(({ index }) => (
  Math.min(...acceptedFixtureIndices.map((fixtureIndex) => Math.abs(index - fixtureIndex)))
)));
invariant(lowerRoute.length === 474 && hashCells(lowerRoute) === EXPECTED.lowerRouteHash
  && lowerBoundary.length === 1426 && hashCells(lowerBoundary) === EXPECTED.lowerBoundaryHash
  && fixtures.length === 15 && hashCells(fixtures) === EXPECTED.targetHash
  && fixtures.every((cell) => lowerBoundary.some((candidate) => (
    cellKey(candidate) === cellKey(cell)
  )))
  && fixtures.every((cell) => !routeKeys.has(cellKey(cell)))
  && westCap.length === 12 && hashCells(westCap) === EXPECTED.westCapHash
  && curveAperture.length === 4 && hashCells(curveAperture) === EXPECTED.curveApertureHash
  && curveCollar.length === 8 && hashCells(curveCollar) === EXPECTED.curveCollarHash
  && maximumIndexDistanceToFixture === 8,
'lower-guideway route, boundary, cadence, or caps drifted');

const accommodation = buildB09MinimumReservation(model.formula, endpoints);
invariant(accommodation.length === 7800 && hashCells(accommodation) === EXPECTED.b09Hash,
'B09 accommodation drifted');
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
const routeRecords = await records(lowerRoute);
const boundaryRecords = await records(lowerBoundary);
const westCapRecords = await records(westCap);
const curveApertureRecords = await records(curveAperture);
const curveCollarRecords = await records(curveCollar);
const currentB09 = await records(accommodation);
invariant(fixtureRecords.every(({ state }) => state === DIORITE)
  && routeRecords.every(({ state }) => state === AIR)
  && westCapRecords.every(({ state }) => state === DIORITE)
  && curveApertureRecords.every(({ state }) => state === AIR)
  && curveCollarRecords.every(({ state }) => state === DIORITE),
'fixture source, route, B08 cap, curve aperture, or curve collar is not exact');
invariant(boundaryRecords.filter(({ state }) => state === DIORITE).length === 1422
  && boundaryRecords.filter(({ state }) => state === LIGHT).length === 2
  && boundaryRecords.filter(({ state }) => state === AIR).length === 2,
'accepted lower-route boundary is not exact 1422-diorite/2-light/2-aperture-air');
invariant(stateSetHash(currentB09) === EXPECTED.sourceB09StateHash,
'R10D B09 source state drifted');

const priorPaths = fs.readdirSync(abs('data/buildops'))
  .filter((name) => name.startsWith('combined-zones-')
    && name.endsWith('.release-manifest.json') && !name.startsWith(BASENAME))
  .sort()
  .map((name) => `data/buildops/${name}`);
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
  if (![r07f.transactionId, r07h.transactionId].includes(priorManifest.transactionId)) {
    unreviewedPriorHits.push(...hits);
  }
  priorProof.push({
    transactionId: priorManifest.transactionId,
    manifest: fileBinding(manifestPath),
    targetIntersectionCount: hits.length,
  });
}
const r07fHits = operationIntersection(r07f.packages[0].forward, fixtures);
const r07hHits = operationIntersection(r07h.packages[0].forward, fixtures);
invariant(uniqueCells(allPriorHits).length === 15
  && r07fHits.length === 1 && r07hHits.length === 14
  && uniqueCells(unreviewedPriorHits).length === 0,
'prior overlap is not exactly the reviewed R07F/R07H ceiling migration');

const halo = uniqueCells(fixtures.flatMap((cell) => [
  cell,
  ...FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx,
    y: cell.y + dy,
    z: cell.z + dz,
  })),
]));
invariant(halo.length === 105 && hashCells(halo) === EXPECTED.haloHash,
'fixture halo drifted');
const haloRecords = await records(halo);
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
  status: 'COMPILED_FROM_ACCEPTED_R10D_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B09-LOWER-GUIDEWAY-PASSIVE-WAYFINDING', 'Z11-SUMMIT-FITOUT'],
  packages: [{ key: PACKAGE_KEY, forward: rel(forwardPath), rollback: rel(rollbackPath) }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'One static full-cube lower-guideway ceiling-wayfinding package; rollback restores the R07F/R07H ceiling fabric in exact reverse order.',
  },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'Z11-SUMMIT-FITOUT',
    material: LIGHT,
    purpose: 'Install a passive 16-index visual wayfinding cadence along the complete accepted lower straight guideway without altering its route or curve aperture.',
    geometry: {
      acceptedLowerStationAndStraightRoute: classManifest(lowerRoute),
      acceptedLowerRouteFaceBoundary: classManifest(lowerBoundary),
      passiveCeilingWayfindingFixtures: classManifest(fixtures),
      retainedB08WestCap: classManifest(westCap),
      retainedR07iCurveAperture: classManifest(curveAperture),
      retainedCurveApertureCollar: classManifest(curveCollar),
    },
    fixtureCadence: {
      centerlineIndices: fixtureIndices,
      firstRouteCenterlineIndex: 3,
      lastRouteCenterlineIndex: 239,
      acceptedPredecessorFixtureIndices: [4, 7],
      maximumRouteIndexDistanceToAcceptedFixture: maximumIndexDistanceToFixture,
      maximumNewFixtureSpacingInIndices: 16,
      photometricEmergencyOrLifeSafetyLightingClaimed: false,
    },
    ownership: {
      exactReviewedPriorMigration: {
        priorOwners: [
          'P1-B09-FUNICULAR-FRAMEWORK/R07F',
          'P1-B09-FUNICULAR-FRAMEWORK/R07H',
        ],
        newOwner: 'Z11-SUMMIT-FITOUT/PASSIVE-B09-TRANSPORT-FITOUT',
        cellSet: classManifest(fixtures),
        r07fTargetIntersectionCount: r07fHits.length,
        r07hTargetIntersectionCount: r07hHits.length,
        otherPriorTargetIntersectionCount: uniqueCells(unreviewedPriorHits).length,
      },
    },
    operationalBoundary: {
      routeVoidChanged: false,
      enclosureOpened: false,
      b08ExternalInterfaceOpened: false,
      curveApertureChanged: false,
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
      postQa: fileBinding(INPUTS.r10dQa),
      postQaPayloadSha256: r10dQa.qaPayloadSha256,
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
    exactOwnedR07fOverlap: classManifest(r07fHits),
    exactOwnedR07hOverlap: classManifest(r07hHits),
    undeclaredPriorReleaseIntersectionCount: uniqueCells(unreviewedPriorHits).length,
    retainedLowerRoute: classManifest(lowerRoute),
    retainedLowerBoundary: {
      ...classManifest(lowerBoundary),
      sourceStateCensus: stateCensus(boundaryRecords),
    },
    retainedB08WestCap: classManifest(westCap),
    retainedR07iCurveAperture: classManifest(curveAperture),
    retainedCurveApertureCollar: classManifest(curveCollar),
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
    r07fManifest: fileBinding(INPUTS.r07fManifest),
    r07hManifest: fileBinding(INPUTS.r07hManifest),
    r07iManifest: fileBinding(INPUTS.r07iManifest),
    r10dManifest: fileBinding(INPUTS.r10dManifest),
    r10dQa: fileBinding(INPUTS.r10dQa),
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
    'independent fixture, route, aperture, boundary, and no-drift QA',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
    b08ExternalInterfaceOpened: false,
    curveApertureChanged: false,
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
  routeCells: lowerRoute.length,
  boundaryCells: lowerBoundary.length,
  maximumIndexDistanceToFixture,
  activeTransportBlocked: true,
  liveCallsPerformed: false,
}, null, 2));
