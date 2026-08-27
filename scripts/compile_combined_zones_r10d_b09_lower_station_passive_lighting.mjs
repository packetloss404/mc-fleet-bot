#!/usr/bin/env node
/** Compile CZ-R10D: two-cell passive lower-station lighting. Offline only. */

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
const GENERATED_AT = value('--generated-at', '2026-08-21T23:55:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r10c-post-20260821T233530Z',
);
const INTAKE = value(
  '--intake-audit',
  'data/world-review/combined-zones-r10c-live-20260821T233530Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r10c-live-20260821T233530Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r10d-b09-lower-station-passive-lighting',
);
const RELEASE_ID = 'CZ-R10D-P1-B09-LOWER-STATION-PASSIVE-LIGHTING';
const RELEASE_NODE_ID = 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT';
const PACKAGE_KEY = 'b09-lower-station-passive-ceiling-lights';
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
  r10cManifest: 'data/buildops/combined-zones-r10c-b09-summit-passive-lighting.release-manifest.json',
  r10cQa: 'data/world-review/combined-zones-r10c-live-20260821T233530Z/r10c-post-release-qa.json',
});
const EXPECTED = Object.freeze({
  sourceComplete: 'e2ff106a2fc19ae8a175dc31e646eb4cd8e85ff8c5262e98ce0faecbde81b2d7',
  sourceRegion: '3a9089869493c48a0f9dea501044b88c6bc5c271c82a03d3517e4bbd5bc46986',
  sourceLedger: 'd1e27f56639c5df52c4dfd6e7c063baeaf8b76b363efa615216b6d57b5160da6',
  sourceCompleted: 'e3ac73231d641952e4c4bae22f5f54173626b15ee26dfbf2841bf9e776c3eb14',
  technicalIdentity: 'e8738f3932f2afc3ba71e35ccdebf0d5ef444ca7389e81ec31a18e48517d3eba',
  modelIdentity: '735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6',
  r07dManifestIdentity: '1bd7cafaa9f37a9b63e681fd73114b836b77b54544fee586ccabfe64ed19f49a',
  r10cManifestIdentity: 'bee65eec948fcb5c889d0398e3ea835d23b892ab33514f0c7412ebb1ec7e0144',
  r10cQaPayload: '0c3e390a7b1b4a2e9907c50f2a527b6fc2e74eceeaf007d9bfe4a595fe6704cd',
  fixtureHash: '07a255938e33df38d4a3b8381e0aacc5b024a26f8fc38019452ec6f75cd93d73',
  interiorHash: '4062250031378a6fd8ee3a499df1c38cfb9af751e28876bb90c06bf00cd6eae7',
  shellHash: 'e7b44ebf100becffaca355a6b863219738a4c27e0dad83ea21170da35e411e1d',
  ceilingHash: '06f48317c625b2130512ce1264307098804ea50f2ff60f70b7ddfee97cbdbc8b',
  westCapHash: 'a422d177fb7f1571b8a6243fcbf014fda17a910e60e7c03f7c21051f697a3e96',
  eastSeamHash: '5b6a8c096adadbbd5a5ed0399678c87aed1fa5db20b89adeb8289745f693a75e',
  eastCollarHash: '7065c9fc48e7c9c69a69428e9c25a3cc2a46ef4b599f4939c017a79a63b7dae9',
  haloHash: '4f125eced5c23f2f1d937831d12e6448fc5fdaefc1b41b5d7956ee9896f89fc2',
  b09Hash: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  sourceB09StateHash: '8516c1ffb69c6f9ca7eed5aa46e99491042501352289392129e1f8260ff44a79',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const invariant = (ok, message) => {
  if (!ok) throw new Error(`R10D B09 lower-station lighting compiler rejected: ${message}`);
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
const r10c = readJson(INPUTS.r10cManifest);
const r10cQa = readJson(INPUTS.r10cQa);
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
  && r10c.manifestIdentity === EXPECTED.r10cManifestIdentity
  && r10cQa.qaPayloadSha256 === EXPECTED.r10cQaPayload
  && r10cQa.summary.passed, 'frozen B09/R07D/R10C identity mismatch');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && !authorization.revoked
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'R10 standing authorization absent');
const r10Node = contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r10Node?.canonicalOwners.includes('Z11-SUMMIT-FITOUT'),
'R10 does not own B09/Z11 fit-out');
invariant(fs.readFileSync(abs(INPUTS.currentState), 'utf8')
  .includes('R10C · B09 summit passive lighting'),
'CURRENT-STATE does not accept the R10C dependency');

const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
invariant(model.modelIdentitySha256 === EXPECTED.modelIdentity, 'selected model drifted');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const centerline = buildCenterline(model.formula, endpoints);
invariant(centerline.length === 561, 'centerline drifted');
const stationPoints = centerline.slice(3, 9);
const railDatum = stationPoints.map(({ x, y, z }) => ({ x, y, z }));
const headroom = stationPoints.map(({ x, y, z }) => ({ x, y: y + 1, z }));
const ceiling = stationPoints.map(({ x, y, z }) => ({ x, y: y + 2, z }));
const fixtureIndices = [4, 7];
const fixtures = fixtureIndices.map((index) => {
  const { x, y, z } = centerline[index];
  return { x, y: y + 2, z };
});
const lowerInterior = uniqueCells([...railDatum, ...headroom]);
const lowerEnvelope = dilateCells(lowerInterior, 1);
const interiorKeys = new Set(lowerInterior.map(cellKey));
const lowerShell = lowerEnvelope.filter((cell) => !interiorKeys.has(cellKey(cell)));
const westCap = cellsIn(r07d.scope.geometry.westIsolationCap.bounds);
const eastSeam = cellsIn(r07f.scope.geometry.ownedInternalSeamOpening.bounds);
const eastSeamKeys = new Set(eastSeam.map(cellKey));
const eastCap = cellsIn(r07d.scope.geometry.eastIsolationCap.bounds);
const eastCollar = eastCap.filter((cell) => !eastSeamKeys.has(cellKey(cell)));
invariant(stationPoints.map(({ index }) => index).join(',') === '3,4,5,6,7,8'
  && lowerInterior.length === 12 && hashCells(lowerInterior) === EXPECTED.interiorHash
  && lowerShell.length === 84 && hashCells(lowerShell) === EXPECTED.shellHash
  && ceiling.length === 6 && hashCells(ceiling) === EXPECTED.ceilingHash
  && fixtures.length === 2 && hashCells(fixtures) === EXPECTED.fixtureHash
  && westCap.length === 12 && hashCells(westCap) === EXPECTED.westCapHash
  && eastSeam.length === 2 && hashCells(eastSeam) === EXPECTED.eastSeamHash
  && eastCollar.length === 10 && hashCells(eastCollar) === EXPECTED.eastCollarHash,
'lower-station geometry drifted');
invariant(fixtures.every((cell) => ceiling.some((candidate) => cellKey(candidate) === cellKey(cell)))
  && fixtures.every((cell) => lowerShell.some((candidate) => cellKey(candidate) === cellKey(cell)))
  && fixtures.every((cell) => !interiorKeys.has(cellKey(cell))),
'fixtures are not an exact ceiling-shell subset outside the route void');
const maxIndexDistanceToFixture = Math.max(...stationPoints.map(({ index }) => (
  Math.min(...fixtureIndices.map((fixtureIndex) => Math.abs(index - fixtureIndex)))
)));
invariant(maxIndexDistanceToFixture === 1, 'fixture cadence exceeds one station index');

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
const interiorRecords = await records(lowerInterior);
const ceilingRecords = await records(ceiling);
const shellRecords = await records(lowerShell);
const westCapRecords = await records(westCap);
const eastSeamRecords = await records(eastSeam);
const eastCollarRecords = await records(eastCollar);
const currentB09 = await records(accommodation);
invariant(fixtureRecords.every(({ state }) => state === DIORITE)
  && interiorRecords.every(({ state }) => state === AIR)
  && ceilingRecords.every(({ state }) => state === DIORITE)
  && westCapRecords.every(({ state }) => state === DIORITE)
  && eastSeamRecords.every(({ state }) => state === AIR)
  && eastCollarRecords.every(({ state }) => state === DIORITE),
'fixture source, route void, ceiling, cap, seam, or collar is not exact');
invariant(shellRecords.filter(({ state }) => state === DIORITE).length === 82
  && shellRecords.filter(({ state }) => state === AIR).length === 2,
'accepted lower shell is not exact 82-diorite/2-seam-air');
invariant(stateSetHash(currentB09) === EXPECTED.sourceB09StateHash,
'R10C B09 source state drifted');

const priorPaths = fs.readdirSync(abs('data/buildops'))
  .filter((name) => name.startsWith('combined-zones-')
    && name.endsWith('.release-manifest.json') && !name.startsWith(BASENAME))
  .sort()
  .map((name) => `data/buildops/${name}`);
const priorProof = [];
const allPriorHits = [];
const nonR07dHits = [];
for (const manifestPath of priorPaths) {
  const priorManifest = readJson(manifestPath);
  const hits = uniqueCells((priorManifest.packages ?? []).flatMap((pkg) => (
    pkg.forward && fs.existsSync(abs(pkg.forward))
      ? operationIntersection(pkg.forward, fixtures) : []
  )));
  allPriorHits.push(...hits);
  if (priorManifest.transactionId !== r07d.transactionId) nonR07dHits.push(...hits);
  priorProof.push({
    transactionId: priorManifest.transactionId,
    manifest: fileBinding(manifestPath),
    targetIntersectionCount: hits.length,
  });
}
const r07dHits = operationIntersection(r07d.packages[0].forward, fixtures);
invariant(uniqueCells(allPriorHits).length === 2 && r07dHits.length === 2
  && uniqueCells(nonR07dHits).length === 0,
'prior overlap is not exactly the reviewed two-cell R07D ceiling migration');

const halo = uniqueCells(fixtures.flatMap((cell) => [
  cell,
  ...FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx,
    y: cell.y + dy,
    z: cell.z + dz,
  })),
]));
invariant(halo.length === 14 && hashCells(halo) === EXPECTED.haloHash,
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
  status: 'COMPILED_FROM_ACCEPTED_R10C_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B09-LOWER-STATION-PASSIVE-LIGHTING', 'Z11-SUMMIT-FITOUT'],
  packages: [{ key: PACKAGE_KEY, forward: rel(forwardPath), rollback: rel(rollbackPath) }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'One static full-cube lower-station ceiling-light package; rollback restores the R07D ceiling in exact reverse order.',
  },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'Z11-SUMMIT-FITOUT',
    material: LIGHT,
    purpose: 'Install two passive visual ceiling fixtures in the accepted B09 lower station without altering route clearance, its B08 cap, or the guideway seam.',
    geometry: {
      lowerStationRailDatum: classManifest(railDatum),
      lowerStationHeadroom: classManifest(headroom),
      acceptedLowerStationInterior: classManifest(lowerInterior),
      acceptedLowerStationShell: classManifest(lowerShell),
      ceilingCandidateLine: classManifest(ceiling),
      passiveCeilingFixtures: classManifest(fixtures),
      retainedB08WestCap: classManifest(westCap),
      retainedGuidewayInternalSeam: classManifest(eastSeam),
      retainedGuidewaySeamCollar: classManifest(eastCollar),
    },
    fixtureCadence: {
      centerlineIndices: fixtureIndices,
      firstStationCenterlineIndex: 3,
      lastStationCenterlineIndex: 8,
      maximumStationIndexDistanceToFixture: maxIndexDistanceToFixture,
      photometricOrEmergencyLightingCommissioningClaimed: false,
    },
    ownership: {
      exactReviewedPriorMigration: {
        priorOwner: 'P1-B09-FUNICULAR-FRAMEWORK/R07D',
        newOwner: 'Z11-SUMMIT-FITOUT/PASSIVE-B09-TRANSPORT-FITOUT',
        cellSet: classManifest(fixtures),
        r07dTargetIntersectionCount: r07dHits.length,
        otherPriorTargetIntersectionCount: uniqueCells(nonR07dHits).length,
      },
    },
    operationalBoundary: {
      routeVoidChanged: false,
      enclosureOpened: false,
      b08ExternalInterfaceOpened: false,
      b08WestCapClosed: true,
      guidewayInternalSeamChanged: false,
      activeMechanismInstalled: false,
      railInstalled: false,
      driveBrakeVehicleControlsPowerDrainageInstalled: false,
      photometricOrEmergencyLightingCommissioned: false,
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
      postQa: fileBinding(INPUTS.r10cQa),
      postQaPayloadSha256: r10cQa.qaPayloadSha256,
    },
    b09SourceState: {
      accommodation: classManifest(accommodation),
      blockStateSetSha256: stateSetHash(currentB09),
    },
    sourceStateCensus: { [DIORITE]: 2 },
  },
  target: {
    operatedUnion: classManifest(fixtures),
    desiredStateCensus: { [LIGHT]: 2 },
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: 2,
      rollbackCommandCount: 2,
      targetCellCount: 2,
      targetCoordinateSetSha256: hashCells(fixtures),
      sourceStateCensus: { [DIORITE]: 2 },
      desiredStateCensus: { [LIGHT]: 2 },
      exactInverse: true,
      reverseOrderInverse: true,
      oneCellGuards: true,
    },
  },
  preservation: {
    acceptedPriorReleaseTargetProof: priorProof,
    exactOwnedR07dOverlap: classManifest(r07dHits),
    undeclaredPriorReleaseIntersectionCount: uniqueCells(nonR07dHits).length,
    retainedLowerStationInterior: classManifest(lowerInterior),
    retainedLowerStationShell: {
      ...classManifest(lowerShell),
      sourceStateCensus: stateCensus(shellRecords),
    },
    retainedB08WestCap: classManifest(westCap),
    retainedGuidewayInternalSeam: classManifest(eastSeam),
    retainedGuidewaySeamCollar: classManifest(eastCollar),
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
    r10cManifest: fileBinding(INPUTS.r10cManifest),
    r10cQa: fileBinding(INPUTS.r10cQa),
  },
  activeTransportBlocker: {
    status: 'LOCAL_HOLD_NO_EXACT_ACCEPTED_MECHANISM_GEOMETRY',
    appliesTo: [
      'rail', 'drive', 'brake', 'vehicle', 'barriers',
      'controls', 'power', 'drainage', 'commissioning',
    ],
    source: `${INPUTS.technical}#/nullHeldSystemsAndInterfaces`,
    doesNotBlockThisStaticPassiveFixtureScope: true,
  },
  hardSafetyKernelNext: [
    'fresh complete source and exact preflight',
    'fresh live entity clearance',
    'strict parser checks',
    'journaled strict execution',
    'fresh post and rollback preflight',
    'independent fixture, route, caps, preservation, and no-drift QA',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
    b08ExternalInterfaceOpened: false,
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
  retainedB08Cap: westCap.length,
  retainedGuidewaySeam: eastSeam.length,
  activeTransportBlocked: true,
  liveCallsPerformed: false,
}, null, 2));
