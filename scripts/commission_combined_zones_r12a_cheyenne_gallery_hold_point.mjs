#!/usr/bin/env node
/**
 * Read-only functional commissioning seal for the completed Cheyenne secure
 * gallery, from the upstream B03 seam to its retained fail-closed hold point.
 *
 * This closes only passive pedestrian circulation inside the finished gallery.
 * It does not open the Cheyenne chamber, commission an access-control
 * mechanism, or create the prohibited secure-circulation direct terminal link.
 * No live call or world mutation is performed.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
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

const GENERATED_AT = value('--generated-at', '2026-08-21T16:59:00Z');
const LATEST_EVIDENCE_DIR = value(
  '--latest-evidence-dir',
  'data/world-review/combined-zones-r08g-live-20260821T170100Z',
);
const LATEST_LEDGER_PATH = value(
  '--latest-ledger',
  path.join(LATEST_EVIDENCE_DIR, 'evidence-ledger.json'),
);
const LATEST_POST_ROOT = value(
  '--latest-post-root',
  'data/worldsnap-combined-zones-r08g-post-20260821T170100Z',
);
const R10_EVIDENCE_DIR = value(
  '--r10-evidence-dir',
  'data/world-review/combined-zones-r10a-live-20260821T163935Z',
);
const R10_LEDGER_PATH = value('--r10-ledger', path.join(R10_EVIDENCE_DIR, 'evidence-ledger.json'));
const R10_QA_PATH = value('--r10-qa', path.join(R10_EVIDENCE_DIR, 'r10a-post-release-qa.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r10-cheyenne-secure-gallery.release-manifest.json',
);
const ROLLBACK_PATH = value(
  '--rollback',
  'data/buildops/combined-zones-r10-cheyenne-secure-gallery.cheyenne-secure-gallery-liner.rollback.txt',
);
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r12a-cheyenne-gallery-commissioning-20260821T165900Z',
);
const ROLLBACK_PREFLIGHT_PATH = value(
  '--rollback-preflight',
  path.join(EVIDENCE_DIR, 'r10a-gallery-rollback-latest-post-preflight.json'),
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r12a-commissioning.json'));
const MARKDOWN_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r12a-commissioning.md'));

const RELEASE_NODE_ID = 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING';
const COMMISSIONING_SCOPE_ID = 'CZ-R12A-Z10-CHEYENNE-GALLERY-HOLD-POINT-CIRCULATION';
const SOURCE_RELEASE_NODE_ID = 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT';
const SOURCE_TRANSACTION_ID = 'combined-zones-r10-cheyenne-secure-gallery';
const LATEST_TRANSACTION_ID = 'combined-zones-r08-empty-eight-platform-07-fitout';
const ACCEPTED_STATE_CUTOFF_UTC = '2026-08-21T16:58:26Z';
const B03_GEOMETRY_PATH = 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json';
const RELEASE_CONTRACT_PATH = 'docs/masterplans/05-combined-zones/phase1-release-contract.json';
const EXPECTED = Object.freeze({
  sourceManifestIdentity: '3f17222f3ee456833429babf50811e604bea50b3f99ab39293b8ba23ffd0fd8c',
  sourceLedgerSha256: '84ddf28bc2127850eaf77546715feac3a3644d40571bc6b170f817b821091058',
  sourceQaFileSha256: 'ab865fa7729e315f4e58804cbaf98f999e84e7bb3f13aa7b494025091543a0b2',
  sourceQaPayloadSha256: '88db997f951847d624608eba8a0a20800c9bb5631b4334ff23bf2f56323ee60a',
  latestLedgerSha256: 'abe19a3b54bab135be81b550838060b6e6f52c3cd3f6f4f316a34e783e1b76df',
  latestCompleteSaveSha256: 'c405342d83f0c4ae8d97a82667542e1d5c22a893cdc9ee2bb0c8b9bfc9f03d8d',
  latestRegionSha256: '1064385570cec59ba3ef62d455664ad84bf23a7074bfd26cfc133dd25b8e52d1',
  rollbackFileSha256: '2c6a24b89d72015e7ab9e7012c2bfc73b4da84ae56e1f310bdcb3913241fd788',
  rollbackPreflightSha256: 'bc206300f374efd15ca85ecdba7cc2c9f3608e297d9f53b3b762cff9e0d7759b',
  routeCellCount: 660,
  routeCoordinateSetSha256: 'eaeb38e78705d7ef7643fa24bb73ad4fa8cf6db2cbf17aaf39db4707e1656e67',
  linerCellCount: 594,
  linerCoordinateSetSha256: 'ff2aa8d4b508943a2f65c86559dbb800bf5758835f455a62cf764f2ca67519e8',
  terminusCellCount: 20,
  terminusCoordinateSetSha256: 'd769b5ca3cea821d9a9d5ea12270cf0946e179ba05d65b3bd312ed41e083db4b',
  upstreamCellCount: 20,
  upstreamCoordinateSetSha256: 'a81b847db2f772e829db60d99ef4b6160007c0a734073964ff72cdff4926c0f9',
  stationCount: 33,
  longitudinalStepCount: 32,
  lightCount: 5,
  maximumLightSpacing: 6,
});
const MATERIALS = Object.freeze({
  wallAndCeiling: 'minecraft:polished_granite',
  floor: 'minecraft:smooth_stone',
  securityFrame: 'minecraft:polished_blackstone_bricks',
  light: 'minecraft:sea_lantern',
  route: 'minecraft:air',
  cap: 'minecraft:stone',
});
const SECURITY_FRAME_X = new Set([2048, 2080]);
const LIGHT_X = new Set([2054, 2060, 2066, 2072, 2078]);
const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava']);
const CONTAINER_OR_CONTROL_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox',
  'minecraft:beehive', 'minecraft:bee_nest', 'minecraft:decorated_pot',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block',
]);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const samePath = (left, right) => absolute(left) === absolute(right);
const blockName = (state) => state.split('[', 1)[0];
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12A Cheyenne gallery commissioning rejected: ${message}`);
};
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
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

function stateCensus(records) {
  const census = new Map();
  for (const record of records) census.set(record.state, (census.get(record.state) ?? 0) + 1);
  return Object.fromEntries([...census.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

function connectedComponentManifest(cells) {
  const remaining = new Set(cells.map(cellKey));
  const components = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    const component = [];
    while (stack.length) {
      const key = stack.pop();
      const [x, y, z] = key.split(',').map(Number);
      component.push({ x, y, z });
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const neighbour = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(neighbour)) stack.push(neighbour);
      }
    }
    components.push(uniqueCells(component));
  }
  components.sort((left, right) => right.length - left.length);
  return {
    componentCount: components.length,
    largestComponentCellCount: components[0]?.length ?? 0,
    componentSetSha256: sha256(components
      .map((component) => `${component.length}:${hashCells(component)}`)
      .sort().join('\n')),
  };
}

function savedEntityInsideBounds(entity, bounds) {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= bounds.minX && x < bounds.maxX + 1
    && y >= bounds.minY && y < bounds.maxY + 1
    && z >= bounds.minZ && z < bounds.maxZ + 1;
}

const latestLedger = readJson(LATEST_LEDGER_PATH);
const latestPostIntakePath = latestLedger.postSnapshot?.completeSaveIntake?.path;
const latestPostIdentityPath = latestLedger.postSnapshot?.identity?.path;
invariant(latestPostIntakePath && latestPostIdentityPath,
  'latest accepted ledger has no complete post-snapshot binding');
const latestPostIntake = readJson(latestPostIntakePath);
const latestPostIdentity = readJson(latestPostIdentityPath);
const sourceLedger = readJson(R10_LEDGER_PATH);
const sourceQa = readJson(R10_QA_PATH);
const manifest = readJson(MANIFEST_PATH);
const rollbackPreflight = readJson(ROLLBACK_PREFLIGHT_PATH);
const b03 = readJson(B03_GEOMETRY_PATH);
const releaseContract = readJson(RELEASE_CONTRACT_PATH);

const bindings = {
  latestLedger: fileBinding(LATEST_LEDGER_PATH),
  latestPostIntake: fileBinding(latestPostIntakePath),
  latestPostIdentity: fileBinding(latestPostIdentityPath),
  sourceLedger: fileBinding(R10_LEDGER_PATH),
  sourcePostQa: fileBinding(R10_QA_PATH),
  sourceManifest: fileBinding(MANIFEST_PATH),
  rollbackOperation: fileBinding(ROLLBACK_PATH),
  rollbackLatestPostPreflight: fileBinding(ROLLBACK_PREFLIGHT_PATH),
  releaseContract: fileBinding(RELEASE_CONTRACT_PATH),
};

invariant(latestLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && latestLedger.mode === 'EXECUTE'
  && latestLedger.transactionId === LATEST_TRANSACTION_ID
  && latestLedger.stages.length > 0
  && latestLedger.stages.every(({ status }) => status === 'PASS'),
'latest physical-state ledger is not terminally accepted');
invariant(bindings.latestLedger.sha256 === EXPECTED.latestLedgerSha256,
  'latest accepted ledger identity drifted');
invariant(samePath(latestLedger.postSnapshot.root, LATEST_POST_ROOT)
  && latestLedger.postSnapshot.completeSaveSha256 === EXPECTED.latestCompleteSaveSha256,
'latest accepted post-save binding drifted');
invariant(latestPostIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && latestPostIntake.summary?.passed === true
  && samePath(latestPostIntake.input?.suppliedWorldRoot, LATEST_POST_ROOT)
  && latestPostIntake.packageIdentity?.completeSaveSha256 === EXPECTED.latestCompleteSaveSha256,
'latest post save is not a complete immutable same-moment PASS');
invariant(samePath(latestPostIdentity.directory, path.join(LATEST_POST_ROOT, 'region'))
  && latestPostIdentity.sha256 === EXPECTED.latestRegionSha256,
'latest region identity drifted');
invariant(latestLedger.postSnapshot.completeSaveIntake.sha256 === bindings.latestPostIntake.sha256
  && latestLedger.postSnapshot.identity.sha256 === bindings.latestPostIdentity.sha256,
'latest ledger file bindings drifted');

invariant(bindings.sourceLedger.sha256 === EXPECTED.sourceLedgerSha256
  && sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.transactionId === SOURCE_TRANSACTION_ID
  && sourceLedger.releaseNodeId === SOURCE_RELEASE_NODE_ID,
'R10A source release is not the accepted terminal release');
invariant(bindings.sourcePostQa.sha256 === EXPECTED.sourceQaFileSha256
  && sourceQa.status === 'PASS_R10A_CHEYENNE_SECURE_GALLERY_POST_RELEASE_ACCEPTED'
  && sourceQa.qaPayloadSha256 === EXPECTED.sourceQaPayloadSha256
  && sourceQa.summary?.passed === true,
'R10A source post-release QA binding drifted');
invariant(manifest.transactionId === SOURCE_TRANSACTION_ID
  && manifest.releaseNodeId === SOURCE_RELEASE_NODE_ID
  && manifest.manifestIdentity === EXPECTED.sourceManifestIdentity,
'R10A source manifest identity drifted');

const r12Node = releaseContract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r12Node?.status === 'WAITING_ONLY_ON_EXACT_COMMISSIONED_SYSTEM_DEPENDENCIES',
'R12 release contract node drifted');
const prohibitedCheyenneInterface = r12Node.prohibitedInitialConnections
  .find((entry) => entry === 'Cheyenne secure circulation direct terminal link');
invariant(prohibitedCheyenneInterface,
'R12 no-open Cheyenne direct-terminal boundary is missing');

// Reproduce the exact completed R10A gallery from frozen B03 geometry.
const centers = b03.design.centerline.points.filter(({ index }) => index >= 768 && index <= 800);
invariant(centers.length === EXPECTED.stationCount && centers.every((point, offset) => (
  point.index === 768 + offset
  && point.x === 2080 - offset
  && point.y === 166
  && point.z === -868
  && point.phase === 'LEG-3-INSTITUTIONAL'
  && point.tangent === 'WEST'
)), 'frozen Cheyenne gallery centerline drifted');

const route = [];
const liner = [];
for (const point of centers) {
  for (let z = point.z - 2; z <= point.z + 2; z += 1) {
    for (let y = point.y; y <= point.y + 3; y += 1) route.push({ x: point.x, y, z });
    liner.push({ x: point.x, y: point.y - 1, z });
    liner.push({ x: point.x, y: point.y + 4, z });
  }
  for (let y = point.y; y <= point.y + 3; y += 1) {
    liner.push({ x: point.x, y, z: point.z - 3 });
    liner.push({ x: point.x, y, z: point.z + 3 });
  }
}
const exactRoute = uniqueCells(route);
const exactLiner = uniqueCells(liner);
const upstreamPlane = [];
const terminusCap = [];
for (let y = 166; y <= 169; y += 1) {
  for (let z = -870; z <= -866; z += 1) {
    upstreamPlane.push({ x: 2081, y, z });
    terminusCap.push({ x: 2047, y, z });
  }
}
invariant(exactRoute.length === EXPECTED.routeCellCount
  && hashCells(exactRoute) === EXPECTED.routeCoordinateSetSha256,
'route geometry identity drifted');
invariant(exactLiner.length === EXPECTED.linerCellCount
  && hashCells(exactLiner) === EXPECTED.linerCoordinateSetSha256,
'liner geometry identity drifted');
invariant(upstreamPlane.length === EXPECTED.upstreamCellCount
  && hashCells(upstreamPlane) === EXPECTED.upstreamCoordinateSetSha256,
'upstream aperture identity drifted');
invariant(terminusCap.length === EXPECTED.terminusCellCount
  && hashCells(terminusCap) === EXPECTED.terminusCoordinateSetSha256,
'fail-closed hold-point identity drifted');

const expectedLinerState = new Map();
for (const cell of exactLiner) {
  let state = cell.y === 165 ? MATERIALS.floor : MATERIALS.wallAndCeiling;
  if (SECURITY_FRAME_X.has(cell.x)) state = MATERIALS.securityFrame;
  else if (cell.y === 170 && cell.z === -868 && LIGHT_X.has(cell.x)) {
    state = MATERIALS.light;
  }
  expectedLinerState.set(cellKey(cell), state);
}

const reader = new AnvilReader(absolute(path.join(LATEST_POST_ROOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(LATEST_POST_ROOT, 'entities')));
async function readRecords(cells, expectedFor) {
  const records = [];
  for (const cell of cells) {
    records.push({
      cell,
      expectedState: expectedFor(cell),
      state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return records;
}
const linerRecords = await readRecords(exactLiner, (cell) => expectedLinerState.get(cellKey(cell)));
const routeRecords = await readRecords(exactRoute, () => MATERIALS.route);
const upstreamRecords = await readRecords(upstreamPlane, () => MATERIALS.route);
const capRecords = await readRecords(terminusCap, () => MATERIALS.cap);
const mismatches = (records) => records.filter(({ state, expectedState }) => state !== expectedState);
const linerMismatches = mismatches(linerRecords);
const routeMismatches = mismatches(routeRecords);
const upstreamMismatches = mismatches(upstreamRecords);
const capMismatches = mismatches(capRecords);

const routeWithUpstream = uniqueCells([...exactRoute, ...upstreamPlane]);
const connectivity = connectedComponentManifest(routeWithUpstream);
const centerlinePath = centers.map(({ x, y, z }) => ({ x, y, z }));
const centerlineRecords = await readRecords(centerlinePath, () => MATERIALS.route);
const centerlinePairDistances = centerlinePath.slice(1).map((cell, index) => (
  Math.abs(cell.x - centerlinePath[index].x)
  + Math.abs(cell.y - centerlinePath[index].y)
  + Math.abs(cell.z - centerlinePath[index].z)
));
const longitudinalPathPass = centerlineRecords.every(({ state }) => state === MATERIALS.route)
  && centerlinePairDistances.length === EXPECTED.longitudinalStepCount
  && centerlinePairDistances.every((distance) => distance === 1);

const pedestrianClearance = [];
for (const point of centers) {
  for (let z = -869; z <= -867; z += 1) {
    for (let y = 166; y <= 168; y += 1) pedestrianClearance.push({ x: point.x, y, z });
  }
}
const exactPedestrianClearance = uniqueCells(pedestrianClearance);
const pedestrianRecords = await readRecords(exactPedestrianClearance, () => MATERIALS.route);
const pedestrianMismatches = mismatches(pedestrianRecords);

const floorCells = exactLiner.filter(({ y }) => y === 165);
const ceilingCells = exactLiner.filter(({ y }) => y === 170);
const floorRecords = linerRecords.filter(({ cell }) => cell.y === 165);
const ceilingRecords = linerRecords.filter(({ cell }) => cell.y === 170);
const acceptedFloorStates = new Set([MATERIALS.floor, MATERIALS.securityFrame]);
const acceptedCeilingStates = new Set([
  MATERIALS.wallAndCeiling, MATERIALS.securityFrame, MATERIALS.light,
]);
const floorPass = floorRecords.length === floorCells.length
  && floorRecords.every(({ state }) => acceptedFloorStates.has(state));
const ceilingPass = ceilingRecords.length === ceilingCells.length
  && ceilingRecords.every(({ state }) => acceptedCeilingStates.has(state));
const observedLights = ceilingRecords
  .filter(({ state }) => state === MATERIALS.light)
  .map(({ cell }) => cell)
  .sort((left, right) => right.x - left.x);
const lightGaps = [2080, ...observedLights.map(({ x }) => x), 2048]
  .slice(1).map((x, index) => Math.abs(x - [2080, ...observedLights.map(({ x: lx }) => lx)][index]));
const maximumLightSpacing = Math.max(...lightGaps);
const lightingPass = observedLights.length === EXPECTED.lightCount
  && observedLights.every(({ y, z }) => y === 170 && z === -868)
  && maximumLightSpacing <= EXPECTED.maximumLightSpacing;

const haloBounds = {
  minX: 2047, maxX: 2081,
  minY: 164, maxY: 171,
  minZ: -872, maxZ: -864,
};
const fluidIntersections = [];
const containerOrControlIntersections = [];
for (let x = haloBounds.minX; x <= haloBounds.maxX; x += 1) {
  for (let y = haloBounds.minY; y <= haloBounds.maxY; y += 1) {
    for (let z = haloBounds.minZ; z <= haloBounds.maxZ; z += 1) {
      const cell = { x, y, z };
      const state = stateToCommandString(await reader.blockState(x, y, z));
      const name = blockName(state);
      if (FLUID_BLOCKS.has(name) || state.includes('waterlogged=true')) {
        fluidIntersections.push({ cell, state });
      }
      if (CONTAINER_OR_CONTROL_BLOCKS.has(name)) {
        containerOrControlIntersections.push({ cell, state });
      }
    }
  }
}
const touchedChunks = [];
for (let x = Math.floor(haloBounds.minX / 16); x <= Math.floor(haloBounds.maxX / 16); x += 1) {
  for (let z = Math.floor(haloBounds.minZ / 16); z <= Math.floor(haloBounds.maxZ / 16); z += 1) {
    touchedChunks.push({ x, z });
  }
}
const blockEntityIntersections = [];
const savedEntityIntersections = [];
for (const chunkPoint of touchedChunks) {
  const chunk = await reader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (insideBounds(point, haloBounds)) {
      blockEntityIntersections.push({ id: entity.id ?? null, point });
    }
  }
  const entityChunk = await entityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entityChunk?.Entities ?? []) {
    if (savedEntityInsideBounds(entity, haloBounds)) {
      savedEntityIntersections.push({
        id: entity.id ?? null,
        position: entity.Pos.slice(0, 3).map(Number),
      });
    }
  }
}

const rollbackPass = bindings.rollbackOperation.sha256 === EXPECTED.rollbackFileSha256
  && bindings.rollbackLatestPostPreflight.sha256 === EXPECTED.rollbackPreflightSha256
  && rollbackPreflight.status === 'PASS'
  && rollbackPreflight.opsSha256 === EXPECTED.rollbackFileSha256
  && samePath(rollbackPreflight.regions, path.join(LATEST_POST_ROOT, 'region'))
  && rollbackPreflight.regionsSnapshot?.sha256 === EXPECTED.latestRegionSha256
  && rollbackPreflight.operationCount === EXPECTED.linerCellCount
  && rollbackPreflight.passed === EXPECTED.linerCellCount
  && rollbackPreflight.failed === 0
  && rollbackPreflight.failurePointsComplete === true
  && rollbackPreflight.sourceOverlays === null
  && rollbackPreflight.naturalStateTransitionPolicy === null;

const checks = [];
const check = (id, passed, detail) => checks.push({ id, status: passed ? 'PASS' : 'FAIL', detail });
check('R12A-COM-01-LATEST-ACCEPTED-SAVE-BOUND',
  bindings.latestLedger.sha256 === EXPECTED.latestLedgerSha256
    && latestPostIntake.packageIdentity.completeSaveSha256 === EXPECTED.latestCompleteSaveSha256
    && latestPostIdentity.sha256 === EXPECTED.latestRegionSha256,
  `R08G terminal ledger at cutoff ${ACCEPTED_STATE_CUTOFF_UTC}; complete save ${EXPECTED.latestCompleteSaveSha256}; region ${EXPECTED.latestRegionSha256}.`);
check('R12A-COM-02-R10A-AS-BUILT-SEAL-BOUND',
  sourceQa.qaPayloadSha256 === EXPECTED.sourceQaPayloadSha256
    && manifest.manifestIdentity === EXPECTED.sourceManifestIdentity,
  `R10A manifest ${EXPECTED.sourceManifestIdentity}; QA ${EXPECTED.sourceQaPayloadSha256}.`);
check('R12A-COM-03-EXACT-FINISH-RETAINED', linerMismatches.length === 0,
  `${linerRecords.length - linerMismatches.length}/${linerRecords.length} exact liner states.`);
check('R12A-COM-04-ROUTE-VOLUME-CLEAR', routeMismatches.length === 0,
  `${routeRecords.length - routeMismatches.length}/${routeRecords.length} route cells are air.`);
check('R12A-COM-05-UPSTREAM-SEAM-OPEN', upstreamMismatches.length === 0,
  `${upstreamRecords.length - upstreamMismatches.length}/${upstreamRecords.length} upstream seam cells are air.`);
check('R12A-COM-06-LONGITUDINAL-PATH-CONTINUOUS',
  longitudinalPathPass && connectivity.componentCount === 1
    && connectivity.largestComponentCellCount === routeWithUpstream.length,
  `${EXPECTED.stationCount} stations / ${EXPECTED.longitudinalStepCount} unit steps; ${connectivity.componentCount} air component.`);
check('R12A-COM-07-PEDESTRIAN-CLEARANCE', pedestrianMismatches.length === 0,
  `${pedestrianRecords.length - pedestrianMismatches.length}/${pedestrianRecords.length} central 3x3 clearance cells are air.`);
check('R12A-COM-08-CONTINUOUS-FLOOR-AND-CEILING', floorPass && ceilingPass,
  `${floorRecords.length}/${floorCells.length} accepted floor cells; ${ceilingRecords.length}/${ceilingCells.length} accepted ceiling cells.`);
check('R12A-COM-09-LIGHT-CADENCE', lightingPass,
  `${observedLights.length}/${EXPECTED.lightCount} ceiling lights; maximum longitudinal spacing ${maximumLightSpacing}.`);
check('R12A-COM-10-FAIL-CLOSED-HOLD-POINT', capMismatches.length === 0,
  `${capRecords.length - capMismatches.length}/${capRecords.length} stone hold-point cells; direct terminal link remains closed.`);
check('R12A-COM-11-DRY-NONINTERACTIVE-ENTITY-CLEAR',
  fluidIntersections.length === 0
    && containerOrControlIntersections.length === 0
    && blockEntityIntersections.length === 0
    && savedEntityIntersections.length === 0,
  `${fluidIntersections.length} fluids; ${containerOrControlIntersections.length} containers/controls; ${blockEntityIntersections.length} block entities; ${savedEntityIntersections.length} saved movable entities.`);
check('R12A-COM-12-LATEST-POST-ROLLBACK-READY', rollbackPass,
  `${rollbackPreflight.passed}/${EXPECTED.linerCellCount} exact rollback guards against latest accepted post state.`);

const failedChecks = checks.filter(({ status }) => status !== 'PASS');
const payload = {
  schemaVersion: 1,
  id: 'combined-zones-r12a-cheyenne-gallery-hold-point-commissioning',
  generatedAtUtc: GENERATED_AT,
  acceptedStateCutoffUtc: ACCEPTED_STATE_CUTOFF_UTC,
  status: failedChecks.length === 0
    ? 'PASS_R12A_CHEYENNE_GALLERY_HOLD_POINT_CIRCULATION_COMMISSIONED'
    : 'FAIL_R12A_CHEYENNE_GALLERY_HOLD_POINT_CIRCULATION',
  release: {
    releaseNodeId: RELEASE_NODE_ID,
    commissioningScopeId: COMMISSIONING_SCOPE_ID,
    mvpScope: true,
    sourceReleaseNodeId: SOURCE_RELEASE_NODE_ID,
    sourceTransactionId: SOURCE_TRANSACTION_ID,
    sourceManifestIdentity: manifest.manifestIdentity,
    functionalDisposition: 'PASSIVE_PEDESTRIAN_CIRCULATION_TO_FAIL_CLOSED_HOLD_POINT',
  },
  bindings: {
    ...bindings,
    latestPhysicalState: {
      root: relative(LATEST_POST_ROOT),
      completeSaveSha256: latestLedger.postSnapshot.completeSaveSha256,
      regionSnapshotSha256: latestPostIdentity.sha256,
    },
    sourceAsBuiltQaPayloadSha256: sourceQa.qaPayloadSha256,
  },
  geometry: {
    centerline: {
      stationCount: centers.length,
      longitudinalStepCount: centerlinePairDistances.length,
      first: centerlinePath[0],
      last: centerlinePath.at(-1),
      orderedSha256: sha256(`${centerlinePath.map(cellKey).join('\n')}\n`),
    },
    route: classManifest(exactRoute),
    upstreamPlane: classManifest(upstreamPlane),
    routeWithUpstream: classManifest(routeWithUpstream),
    pedestrianClearance: classManifest(exactPedestrianClearance),
    liner: classManifest(exactLiner),
    floor: classManifest(floorCells),
    ceiling: classManifest(ceilingCells),
    terminusCap: classManifest(terminusCap),
    haloBounds,
  },
  observedState: {
    liner: {
      matchingCellCount: linerRecords.length - linerMismatches.length,
      mismatchCellCount: linerMismatches.length,
      stateCensus: stateCensus(linerRecords),
      listedMismatches: linerMismatches.slice(0, 100),
    },
    route: {
      matchingCellCount: routeRecords.length - routeMismatches.length,
      mismatchCellCount: routeMismatches.length,
      stateCensus: stateCensus(routeRecords),
    },
    upstreamPlane: {
      matchingCellCount: upstreamRecords.length - upstreamMismatches.length,
      mismatchCellCount: upstreamMismatches.length,
      stateCensus: stateCensus(upstreamRecords),
    },
    terminusCap: {
      matchingCellCount: capRecords.length - capMismatches.length,
      mismatchCellCount: capMismatches.length,
      stateCensus: stateCensus(capRecords),
    },
    routeConnectivity: connectivity,
    pedestrianClearance: {
      matchingCellCount: pedestrianRecords.length - pedestrianMismatches.length,
      mismatchCellCount: pedestrianMismatches.length,
    },
    walkingSurface: {
      cellCount: floorRecords.length,
      stateCensus: stateCensus(floorRecords),
      acceptedContinuousSurface: floorPass,
    },
    ceiling: {
      cellCount: ceilingRecords.length,
      stateCensus: stateCensus(ceilingRecords),
      acceptedContinuousEnclosure: ceilingPass,
    },
    lighting: {
      fixtureCount: observedLights.length,
      fixtureCells: observedLights,
      longitudinalGaps: lightGaps,
      maximumLongitudinalSpacing: maximumLightSpacing,
      maximumAllowedSpacing: EXPECTED.maximumLightSpacing,
    },
    haloClearance: {
      fluidIntersections,
      containerOrControlIntersections,
      blockEntityIntersections,
      savedEntityIntersections,
    },
  },
  rollbackReadiness: {
    status: rollbackPreflight.status,
    operationCount: rollbackPreflight.operationCount,
    passedGuards: rollbackPreflight.passed,
    failedGuards: rollbackPreflight.failed,
    regionSnapshotSha256: rollbackPreflight.regionsSnapshot.sha256,
    exactLatestPostState: rollbackPass,
  },
  boundary: {
    commissioned: [
      'bounded pedestrian circulation from the exact upstream B03 seam through the 33-station finished gallery',
      'continuous central 3x3 clearance, walking surface, enclosure, and deterministic ceiling-light cadence',
      'arrival at the retained fail-closed Cheyenne hold point',
    ],
    explicitlyNotCommissioned: [
      prohibitedCheyenneInterface,
      'Cheyenne chamber excavation or occupancy',
      'access-control mechanism, powered gate, rail, vehicle, signaling, or automatic operation',
      'C2 visitor portal',
      'C3 PassageWay or any PassageWay direct terminal link',
      'Houston pedestrian tunnels direct terminal link',
      'all eight future Empty Eight line stubs',
    ],
    chamberExcavatedOrOpened: false,
    accessControlMechanismCommissioned: false,
    prohibitedDirectTerminalLinkOpened: false,
  },
  checks,
  summary: {
    passed: failedChecks.length === 0,
    checkCount: checks.length,
    passCount: checks.length - failedChecks.length,
    failCount: failedChecks.length,
    routeAirCellCount: routeRecords.length - routeMismatches.length,
    upstreamAirCellCount: upstreamRecords.length - upstreamMismatches.length,
    pedestrianClearanceAirCellCount: pedestrianRecords.length - pedestrianMismatches.length,
    linerExactCellCount: linerRecords.length - linerMismatches.length,
    holdPointStoneCellCount: capRecords.length - capMismatches.length,
    rollbackGuardPassCount: rollbackPreflight.passed,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    serviceMutationsPerformed: false,
    readOnlyImmutableAnvilInputs: true,
  },
};
const commissioningPayloadSha256 = sha256(JSON.stringify(payload));
const report = { ...payload, commissioningPayloadSha256 };

fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MARKDOWN_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);

const markdown = `# CZ-R12A Cheyenne gallery hold-point commissioning

**Status:** ${report.status}  
**Commissioning payload identity:** \`${commissioningPayloadSha256}\`  
**Latest accepted complete save:** \`${EXPECTED.latestCompleteSaveSha256}\`  
**Latest accepted region:** \`${EXPECTED.latestRegionSha256}\`

## Functional result

| Acceptance criterion | Result |
|---|---:|
| Exact finished liner | ${report.summary.linerExactCellCount} / ${EXPECTED.linerCellCount} |
| Clear gallery route | ${report.summary.routeAirCellCount} / ${EXPECTED.routeCellCount} air |
| Clear upstream seam | ${report.summary.upstreamAirCellCount} / ${EXPECTED.upstreamCellCount} air |
| Central pedestrian clearance | ${report.summary.pedestrianClearanceAirCellCount} / ${exactPedestrianClearance.length} air |
| Longitudinal path | ${EXPECTED.stationCount} stations / ${EXPECTED.longitudinalStepCount} unit steps |
| Ceiling lights | ${observedLights.length} fixtures / maximum spacing ${maximumLightSpacing} blocks |
| Fail-closed hold point | ${report.summary.holdPointStoneCellCount} / ${EXPECTED.terminusCellCount} stone |
| Latest-post rollback guards | ${report.summary.rollbackGuardPassCount} / ${EXPECTED.linerCellCount} |

## Checks

| Check | Status | Detail |
|---|---|---|
${checks.map(({ id, status, detail }) => `| ${id} | **${status}** | ${detail} |`).join('\n')}

## Commissioning boundary

This commissions only passive pedestrian circulation through the finished
33-station Cheyenne gallery to its retained stone hold point. The Cheyenne
chamber and direct terminal link remain physically closed. No access-control
mechanism, powered gate, rail, vehicle, signaling, C2/C3 connection,
PassageWay link, Houston direct-terminal link, or Empty Eight future-line stub
is opened or commissioned.

The verifier read only immutable saved-world and hash-bound release evidence.
It made no live call, world edit, or service mutation.
`;
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);

console.log(JSON.stringify({
  status: report.status,
  commissioningPayloadSha256,
  exactLiner: `${report.summary.linerExactCellCount}/${EXPECTED.linerCellCount}`,
  routeAir: `${report.summary.routeAirCellCount}/${EXPECTED.routeCellCount}`,
  upstreamAir: `${report.summary.upstreamAirCellCount}/${EXPECTED.upstreamCellCount}`,
  pedestrianClearanceAir:
    `${report.summary.pedestrianClearanceAirCellCount}/${exactPedestrianClearance.length}`,
  holdPointStone: `${report.summary.holdPointStoneCellCount}/${EXPECTED.terminusCellCount}`,
  rollbackGuards: `${report.summary.rollbackGuardPassCount}/${EXPECTED.linerCellCount}`,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
}, null, 2));
if (failedChecks.length) process.exitCode = 1;
