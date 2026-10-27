#!/usr/bin/env node
/** Compile CZ-R10C: three-cell passive summit-headhouse lighting. Offline only. */

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
const GENERATED_AT = value('--generated-at', '2026-08-21T23:30:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-r10b-post-20260821T230936Z');
const INTAKE = value('--intake-audit', 'data/world-review/combined-zones-r10b-live-20260821T230936Z/post-complete-save-intake.json');
const SOURCE_LEDGER = value('--source-ledger', 'data/world-review/combined-zones-r10b-live-20260821T230936Z/evidence-ledger.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r10c-b09-summit-passive-lighting');
const RELEASE_ID = 'CZ-R10C-P1-B09-SUMMIT-PASSIVE-LIGHTING';
const RELEASE_NODE_ID = 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT';
const PACKAGE_KEY = 'b09-summit-passive-ceiling-lights';
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const LIGHT = 'minecraft:sea_lantern';
const FACE_NEIGHBOURS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const GRAVITY_BLOCKS = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:dragon_egg']);
const ACTIVE_MECHANISMS = new Set(['minecraft:rail', 'minecraft:powered_rail', 'minecraft:detector_rail', 'minecraft:activator_rail', 'minecraft:redstone_wire', 'minecraft:redstone_torch', 'minecraft:redstone_wall_torch', 'minecraft:repeater', 'minecraft:comparator', 'minecraft:piston', 'minecraft:sticky_piston', 'minecraft:observer', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:hopper']);
const INPUTS = Object.freeze({
  technical: 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  currentState: 'docs/masterplans/05-combined-zones/CURRENT-STATE.md',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  authorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  relics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  r07eManifest: 'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
  r10bManifest: 'data/buildops/combined-zones-r10b-b09-summit-internal-approach.release-manifest.json',
  r10bQa: 'data/world-review/combined-zones-r10b-live-20260821T230936Z/r10b-post-release-qa.json',
});
const EXPECTED = Object.freeze({
  sourceComplete: 'e77efef8ec56286435edce99986425028176d40b4737259e4bfc60d1c01eab80',
  sourceRegion: 'a693c537107f172adeb54e170f20448c26c783484a9affc1c0426c12eabb9138',
  sourceLedger: '9feb475e5372a1746f8b82c4029651f7e3c2464b544e9b29d3b0587a1c638709',
  sourceCompleted: '3694fbd41a7312501e54940f7d46a362219706a6759950fa2d1f539963bf7474',
  technicalIdentity: 'e8738f3932f2afc3ba71e35ccdebf0d5ef444ca7389e81ec31a18e48517d3eba',
  modelIdentity: '735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6',
  r10bManifestIdentity: '4de9770f03590755ffb07b51af219ef6d34fdf7a0a12f0da8990af802beaf975',
  r10bQaPayload: '8340189fce3197684041859f91113c791f79992c8d0e681e1ceb84576d4f8e0c',
  summitInteriorHash: '771f8df9ee84b79c8ed5e5b2d2e1c6c828915d8d77102ea3b6d60230e681e72d',
  summitShellHash: '8f1cd67b0d08e1f986c21067af7ba50e1c4f3e8daa52c703309c5734d0979592',
  externalCapHash: 'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
  approachCollarHash: '0f53c2e23365f1cec787382867b16d9d67b5b10c93dceba1dc60266e1cbdb624',
  b09Hash: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  sourceB09StateHash: '23f8adaf3b2035ef88d1445168783f1a60f615597483e061768f4ce2c024c873',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const invariant = (ok, message) => {
  if (!ok) throw new Error(`R10C B09 passive-lighting compiler rejected: ${message}`);
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
  for (let d = 0; d <= faceRun; d += 1) points.push({ x: portal.x + d, y: portal.y, z: portal.z });
  for (let offset = 1; offset <= portal.z - climbZ; offset += 1) points.push({ x: throatX, y: portal.y, z: portal.z - offset });
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
const r07e = readJson(INPUTS.r07eManifest);
const r10b = readJson(INPUTS.r10bManifest);
const r10bQa = readJson(INPUTS.r10bQa);
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
  && r10b.manifestIdentity === EXPECTED.r10bManifestIdentity
  && r10bQa.qaPayloadSha256 === EXPECTED.r10bQaPayload
  && r10bQa.summary.passed, 'frozen B09/R10B identity mismatch');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && !authorization.revoked
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'R10 standing authorization absent');
const r10Node = contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r10Node?.canonicalOwners.includes('Z11-SUMMIT-FITOUT'),
'R10 does not own summit fit-out');
invariant(fs.readFileSync(abs(INPUTS.currentState), 'utf8').includes('R10B · B09 summit internal approach'),
'CURRENT-STATE does not accept the R10B dependency');

const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
invariant(model.modelIdentitySha256 === EXPECTED.modelIdentity, 'selected model drifted');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const centerline = buildCenterline(model.formula, endpoints);
invariant(centerline.length === 561, 'centerline drifted');
const stationPoints = centerline.slice(552, 561);
const railDatum = stationPoints.map(({ x, y, z }) => ({ x, y, z }));
const headroom = stationPoints.map(({ x, y, z }) => ({ x, y: y + 1, z }));
const ceiling = stationPoints.map(({ x, y, z }) => ({ x, y: y + 2, z }));
const fixtureIndices = [552, 556, 560];
const fixtures = fixtureIndices.map((index) => {
  const { x, y, z } = centerline[index];
  return { x, y: y + 2, z };
});
const summitInterior = uniqueCells([...railDatum, ...headroom]);
const summitShell = dilateCells(summitInterior, 1)
  .filter((cell) => !new Set(summitInterior.map(cellKey)).has(cellKey(cell)));
const approachCap = cellsIn(r07e.scope.geometry.guidewayApproachCap.bounds);
const seamKeys = new Set(cellsIn(r10b.scope.geometry.ownedInternalSeam.bounds).map(cellKey));
const approachCollar = approachCap.filter((cell) => !seamKeys.has(cellKey(cell)));
const externalCap = cellsIn(r07e.scope.geometry.summitInterfaceCap.bounds);
invariant(stationPoints.map(({ index }) => index).join(',') === '552,553,554,555,556,557,558,559,560'
  && summitInterior.length === 18 && hashCells(summitInterior) === EXPECTED.summitInteriorHash
  && summitShell.length === 162 && hashCells(summitShell) === EXPECTED.summitShellHash
  && approachCollar.length === 10 && hashCells(approachCollar) === EXPECTED.approachCollarHash
  && externalCap.length === 12 && hashCells(externalCap) === EXPECTED.externalCapHash,
`summit geometry drifted: ${JSON.stringify({
  stationIndices: stationPoints.map(({ index }) => index),
  summitInterior: [summitInterior.length, hashCells(summitInterior)],
  summitShell: [summitShell.length, hashCells(summitShell)],
  approachCollar: [approachCollar.length, hashCells(approachCollar)],
  externalCap: [externalCap.length, hashCells(externalCap)],
})}`);
invariant(fixtures.length === 3
  && fixtures.every((cell) => ceiling.some((candidate) => cellKey(candidate) === cellKey(cell)))
  && new Set(fixtures.map(cellKey)).size === 3
  && fixtures.every((cell) => summitShell.some((candidate) => cellKey(candidate) === cellKey(cell))),
'fixture cadence is not an exact summit-shell ceiling subset');
const maxIndexDistanceToFixture = Math.max(...stationPoints.map(({ index }) => (
  Math.min(...fixtureIndices.map((fixtureIndex) => Math.abs(index - fixtureIndex)))
)));
invariant(maxIndexDistanceToFixture === 2, 'fixture cadence exceeds two station indices');

const accommodation = buildB09MinimumReservation(model.formula, endpoints);
invariant(accommodation.length === 7800 && hashCells(accommodation) === EXPECTED.b09Hash,
'B09 accommodation drifted');
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
async function records(cells) {
  const output = [];
  for (const cell of uniqueCells(cells)) {
    output.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
  }
  return output;
}
const fixtureRecords = await records(fixtures);
const interiorRecords = await records(summitInterior);
const collarRecords = await records(approachCollar);
const externalCapRecords = await records(externalCap);
const currentB09 = await records(accommodation);
invariant(fixtureRecords.every(({ state }) => state === DIORITE)
  && interiorRecords.every(({ state }) => state === AIR)
  && collarRecords.every(({ state }) => state === DIORITE)
  && externalCapRecords.every(({ state }) => state === DIORITE),
'fixture source, summit void, approach collar, or external cap is not exact');
invariant(stateSetHash(currentB09) === EXPECTED.sourceB09StateHash,
'R10B B09 source state drifted');

const priorPaths = fs.readdirSync(abs('data/buildops'))
  .filter((name) => name.startsWith('combined-zones-')
    && name.endsWith('.release-manifest.json') && !name.startsWith(BASENAME))
  .sort()
  .map((name) => `data/buildops/${name}`);
const priorProof = [];
const allPriorHits = [];
const nonR07eHits = [];
for (const manifestPath of priorPaths) {
  const priorManifest = readJson(manifestPath);
  const hits = uniqueCells((priorManifest.packages ?? []).flatMap((pkg) => (
    pkg.forward && fs.existsSync(abs(pkg.forward)) ? operationIntersection(pkg.forward, fixtures) : []
  )));
  allPriorHits.push(...hits);
  if (priorManifest.transactionId !== r07e.transactionId) nonR07eHits.push(...hits);
  priorProof.push({
    transactionId: priorManifest.transactionId,
    manifest: fileBinding(manifestPath),
    targetIntersectionCount: hits.length,
  });
}
const r07eHits = operationIntersection(r07e.packages[0].forward, fixtures);
invariant(uniqueCells(allPriorHits).length === 3 && r07eHits.length === 3
  && uniqueCells(nonR07eHits).length === 0,
'prior overlap is not exactly the reviewed three-cell R07E ceiling migration');

const halo = uniqueCells(fixtures.flatMap((cell) => [
  cell,
  ...FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz })),
]));
const haloRecords = await records(halo);
const haloKeys = new Set(halo.map(cellKey));
const blockEntities = [];
const savedEntities = [];
for (const key of [...new Set(halo.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))]) {
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
  cell.x >= relic.declaredInclusiveBounds.minX && cell.x <= relic.declaredInclusiveBounds.maxX
  && cell.y >= relic.declaredInclusiveBounds.minY && cell.y <= relic.declaredInclusiveBounds.maxY
  && cell.z >= relic.declaredInclusiveBounds.minZ && cell.z <= relic.declaredInclusiveBounds.maxZ
)));
const haloFluids = haloRecords.filter(({ state }) => state.startsWith('minecraft:water') || state.startsWith('minecraft:lava') || state.includes('waterlogged=true'));
const haloGravity = haloRecords.filter(({ state }) => isGravityState(state));
const haloMechanisms = haloRecords.filter(({ state }) => ACTIVE_MECHANISMS.has(stateBase(state)));
invariant(blockEntities.length === 0 && savedEntities.length === 0 && relicHits.length === 0
  && haloFluids.length === 0 && haloGravity.length === 0 && haloMechanisms.length === 0,
'halo entity, relic, fluid, gravity, or active-mechanism hazard');

const forwardBody = `${fixtureRecords.map(({ cell, state }) => replLine(cell, state, LIGHT)).join('\n')}\n`;
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
  status: 'COMPILED_FROM_ACCEPTED_R10B_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B09-SUMMIT-HEADHOUSE-PASSIVE-LIGHTING', 'Z11-SUMMIT-FITOUT'],
  packages: [{ key: PACKAGE_KEY, forward: rel(forwardPath), rollback: rel(rollbackPath) }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'One static full-cube ceiling-light package; rollback restores the R07E ceiling in exact reverse order.',
  },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'Z11-SUMMIT-FITOUT',
    material: LIGHT,
    purpose: 'Install a three-point passive visual ceiling-light cadence in the accepted summit headhouse without altering its route, enclosure, or external cap.',
    geometry: {
      summitStationRailDatum: classManifest(railDatum),
      summitStationHeadroom: classManifest(headroom),
      acceptedSummitInterior: classManifest(summitInterior),
      acceptedSummitHeadhouseShell: classManifest(summitShell),
      ceilingCandidateLine: classManifest(ceiling),
      passiveCeilingFixtures: classManifest(fixtures),
      retainedApproachCollar: classManifest(approachCollar),
      retainedExternalZ11Cap: classManifest(externalCap),
    },
    fixtureCadence: {
      centerlineIndices: fixtureIndices,
      firstStationCenterlineIndex: 552,
      lastStationCenterlineIndex: 560,
      maximumStationIndexDistanceToFixture: maxIndexDistanceToFixture,
      photometricOrEmergencyLightingCommissioningClaimed: false,
    },
    ownership: {
      exactReviewedPriorMigration: {
        priorOwner: 'P1-B09-FUNICULAR-FRAMEWORK/R07E',
        newOwner: 'Z11-SUMMIT-FITOUT/PASSIVE-LIGHTING',
        cellSet: classManifest(fixtures),
        r07eTargetIntersectionCount: r07eHits.length,
        otherPriorTargetIntersectionCount: uniqueCells(nonR07eHits).length,
      },
    },
    operationalBoundary: {
      routeVoidChanged: false,
      enclosureOpened: false,
      externalZ11InterfaceOpened: false,
      externalZ11CapClosed: true,
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
      postQa: fileBinding(INPUTS.r10bQa),
      postQaPayloadSha256: r10bQa.qaPayloadSha256,
    },
    b09SourceState: {
      accommodation: classManifest(accommodation),
      blockStateSetSha256: stateSetHash(currentB09),
    },
    sourceStateCensus: { [DIORITE]: 3 },
  },
  target: {
    operatedUnion: classManifest(fixtures),
    desiredStateCensus: { [LIGHT]: 3 },
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: 3,
      rollbackCommandCount: 3,
      targetCellCount: 3,
      targetCoordinateSetSha256: hashCells(fixtures),
      sourceStateCensus: { [DIORITE]: 3 },
      desiredStateCensus: { [LIGHT]: 3 },
      exactInverse: true,
      reverseOrderInverse: true,
      oneCellGuards: true,
    },
  },
  preservation: {
    acceptedPriorReleaseTargetProof: priorProof,
    exactOwnedR07eOverlap: classManifest(r07eHits),
    undeclaredPriorReleaseIntersectionCount: uniqueCells(nonR07eHits).length,
    retainedSummitInterior: classManifest(summitInterior),
    retainedApproachCollar: classManifest(approachCollar),
    retainedExternalZ11Cap: classManifest(externalCap),
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
    r07eManifest: fileBinding(INPUTS.r07eManifest),
    r10bManifest: fileBinding(INPUTS.r10bManifest),
    r10bQa: fileBinding(INPUTS.r10bQa),
  },
  activeTransportBlocker: {
    status: 'LOCAL_HOLD_NO_EXACT_ACCEPTED_MECHANISM_GEOMETRY',
    appliesTo: ['rail', 'drive', 'brake', 'vehicle', 'barriers', 'controls', 'power', 'drainage', 'commissioning'],
    source: `${INPUTS.technical}#/nullHeldSystemsAndInterfaces`,
    doesNotBlockThisStaticPassiveFixtureScope: true,
  },
  hardSafetyKernelNext: [
    'fresh complete source and exact preflight',
    'fresh live entity clearance',
    'strict parser checks',
    'journaled strict execution',
    'fresh post and rollback preflight',
    'independent fixture, route, cap, preservation, and no-drift QA',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
    externalZ11InterfaceOpened: false,
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
  retainedExternalCap: externalCap.length,
  activeTransportBlocked: true,
  liveCallsPerformed: false,
}, null, 2));
