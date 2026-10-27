#!/usr/bin/env node
/**
 * Read-only R12M commissioning seal for the completed B03 institutional route.
 *
 * This accepts bounded passive internal inspection/circulation only. It does
 * not commission secure/public access, controls, the Cheyenne chamber, a
 * terminal connection, transport, or any active mechanism.
 */

import fs from 'node:fs';
import path from 'node:path';

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
const GENERATED_AT = value('--generated-at', '2026-08-22T03:40:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r12m-b03-institutional-route-commissioning-20260822T034000Z',
);
const POST_ROOT = value('--post-root', 'data/worldsnap-r10g-post-20260822T031853Z');
const R10G_EVIDENCE =
  'data/world-review/combined-zones-r10g-live-20260822T031853Z';
const R10G_LEDGER = value('--r10g-ledger', `${R10G_EVIDENCE}/evidence-ledger.json`);
const R10G_QA = value('--r10g-qa', `${R10G_EVIDENCE}/r10g-post-release-qa.json`);
const R10G_MANIFEST = value(
  '--r10g-manifest',
  'data/buildops/combined-zones-r10g-b03-institutional-contact-sequence-fitout.release-manifest.json',
);
const R10A_LEDGER =
  'data/world-review/combined-zones-r10a-live-20260821T163935Z/evidence-ledger.json';
const R10A_QA =
  'data/world-review/combined-zones-r10a-live-20260821T163935Z/r10a-post-release-qa.json';
const R10A_MANIFEST =
  'data/buildops/combined-zones-r10-cheyenne-secure-gallery.release-manifest.json';
const R12A_SEAL =
  'data/world-review/combined-zones-r12a-cheyenne-gallery-commissioning-20260821T165900Z/r12a-commissioning.json';
const GEOMETRY = 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json';
const RELEASE_CONTRACT = 'docs/masterplans/05-combined-zones/phase1-release-contract.json';
const PREFLIGHTS = Object.freeze({
  r10gZ10: `${EVIDENCE_DIR}/r10g-z10-rollback-current-post-preflight.json`,
  r10gZ08: `${EVIDENCE_DIR}/r10g-z08-rollback-current-post-preflight.json`,
  r10a: `${EVIDENCE_DIR}/r10a-rollback-current-post-preflight.json`,
});
const OUT = value('--out', `${EVIDENCE_DIR}/r12m-commissioning.json`);
const MARKDOWN = value('--markdown', `${EVIDENCE_DIR}/r12m-commissioning.md`);

const EXPECTED = Object.freeze({
  ledgerSha256: '5710be3be4e9d9706e35373ab56e892aaae00a546033e986fe56d4ed4ba38f57',
  r10gQaSha256: '934a0759dbc336ac124356bc04de8bfe3b83cf83632c732512c163452130d79d',
  r10gQaPayloadSha256: '45ae703711127ab8c30fae08b7c84f69e872cc374a70f79e1087d44ffb77fbff',
  r10gManifestSha256: 'a7a078df110d10160fb47dcb538067769739db79cc3ba765757b4d4fdf28a73e',
  completedReleaseIdentitySha256:
    '818e098cfa2ce12bfe09748162fa7b3cc7165e98fba6757f8bb73fb58570ca6d',
  postCompleteSaveSha256: 'b6f7034521acc89a3534e68eec0533566eab67f0240fac9b4bb43ae0db1753cd',
  postRegionSha256: '39e9e446b36381fa0961fa17e788685c983fc683a605b91e2a7b515ab39264fa',
  r10aLedgerSha256: '84ddf28bc2127850eaf77546715feac3a3644d40571bc6b170f817b821091058',
  r10aQaSha256: 'ab865fa7729e315f4e58804cbaf98f999e84e7bb3f13aa7b494025091543a0b2',
  r10aManifestSha256: 'd4ad3c70a5454c6cf95262aa006a4c27cd0b7955a32d732ff07005a0e95a00cb',
  r12aSealSha256: 'c2d737da72af469039b0a7a526b4ca505ebea88dd1833bc6c7911ffa9d5d07bf',
  geometrySha256: '216ca18a7dd2a4e06b258dcc817c786b294ac8ebd992dfdb5ab5dba1f46829b1',
  releaseContractSha256: '64f4432f00bd31fe8e5cd12921cd91bdc84b32c5c16630e62138accdf94ed8e0',
  preflightSha256: {
    r10gZ10: '6d94e60ef454db432728867236e6a7e85a6c8f19b05dd7ab5ce9db29b2ed0aef',
    r10gZ08: '84ed4cbb6b2fe28714d298f663f705e5edc0a673b5a25e15436d9b61730a5a9e',
    r10a: '4f0246000a5f1c4f0feeb9ac45b58eead4befb6cc9fca68a6bfae498bf5b93af',
  },
  stationCount: 330,
  routeCellCount: 6600,
  upstreamSeamCellCount: 20,
  routeWithUpstreamCellCount: 6620,
  pedestrianClearanceCellCount: 2970,
  linerCellCount: 5940,
  floorCellCount: 1650,
  ceilingCellCount: 1650,
  fixtureCount: 54,
  terminusCapCellCount: 20,
  haloCellCount: 23904,
  rollbackGuardCount: 5940,
});

const AIR = 'minecraft:air';
const STONE = 'minecraft:stone';
const LIGHT = 'minecraft:sea_lantern';
const FLUID_NAMES = new Set(['minecraft:water', 'minecraft:lava']);
const CONTAINER_OR_CONTROL_NAMES = new Set([
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
  [1, 0, 0], [-1, 0, 0], [0, 1, 0],
  [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const samePath = (left, right) => absolute(left) === absolute(right);
const blockName = (state) => state.split('[', 1)[0];
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12M institutional route commissioning rejected: ${message}`);
};
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
const savedEntityInside = (entity, bounds) => {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= bounds.minX && x < bounds.maxX + 1
    && y >= bounds.minY && y < bounds.maxY + 1
    && z >= bounds.minZ && z < bounds.maxZ + 1;
};
const stateCensus = (records) => Object.fromEntries([...records.reduce(
  (counts, { state }) => counts.set(state, (counts.get(state) ?? 0) + 1),
  new Map(),
).entries()].sort(([left], [right]) => left.localeCompare(right)));

function parseOperations(filename) {
  const output = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const point = fields.slice(1, 4).map(Number);
    invariant(fields.slice(4, 7).map(Number).join(',') === point.join(','),
      `${filename} contains a non-cell guard`);
    output.push({
      cell: { x: point[0], y: point[1], z: point[2] },
      sourceState: fields[7],
      targetState: fields[8],
    });
  }
  return output;
}

function connectivity(cells) {
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
  return { componentCount: sizes.length, largestComponentCellCount: sizes[0] ?? 0 };
}

async function states(reader, cells) {
  const output = [];
  for (const cell of uniqueCells(cells)) {
    output.push({
      cell,
      state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return output;
}

async function entityCensus(regionReader, entityReader, bounds) {
  const blockEntities = [];
  const savedEntities = [];
  for (let cx = Math.floor(bounds.minX / 16); cx <= Math.floor(bounds.maxX / 16); cx += 1) {
    for (let cz = Math.floor(bounds.minZ / 16); cz <= Math.floor(bounds.maxZ / 16); cz += 1) {
      const chunk = await regionReader.chunk(cx, cz);
      for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
        const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
        if (insideBounds(point, bounds)) blockEntities.push({ id: entity.id ?? null, point });
      }
      const entityChunk = await entityReader.chunk(cx, cz);
      for (const entity of entityChunk?.Entities ?? []) {
        if (savedEntityInside(entity, bounds)) {
          savedEntities.push({ id: entity.id ?? null, position: entity.Pos.slice(0, 3) });
        }
      }
    }
  }
  return { blockEntities, savedEntities };
}

const ledger = readJson(R10G_LEDGER);
const r10gQa = readJson(R10G_QA);
const r10gManifest = readJson(R10G_MANIFEST);
const r10aLedger = readJson(R10A_LEDGER);
const r10aQa = readJson(R10A_QA);
const r10aManifest = readJson(R10A_MANIFEST);
const r12aSeal = readJson(R12A_SEAL);
const geometry = readJson(GEOMETRY);
const releaseContract = readJson(RELEASE_CONTRACT);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
const bindings = {
  r10gLedger: fileBinding(R10G_LEDGER),
  r10gPostQa: fileBinding(R10G_QA),
  r10gManifest: fileBinding(R10G_MANIFEST),
  r10aLedger: fileBinding(R10A_LEDGER),
  r10aPostQa: fileBinding(R10A_QA),
  r10aManifest: fileBinding(R10A_MANIFEST),
  r12aCommissioningSeal: fileBinding(R12A_SEAL),
  geometry: fileBinding(GEOMETRY),
  releaseContract: fileBinding(RELEASE_CONTRACT),
  postIntake: fileBinding(ledger.postSnapshot.completeSaveIntake.path),
  postIdentity: fileBinding(ledger.postSnapshot.identity.path),
};
invariant(bindings.r10gLedger.sha256 === EXPECTED.ledgerSha256
  && bindings.r10gPostQa.sha256 === EXPECTED.r10gQaSha256
  && bindings.r10gManifest.sha256 === EXPECTED.r10gManifestSha256
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedReleaseIdentitySha256
  && r10gQa.status
    === 'PASS_R10G_B03_INSTITUTIONAL_CONTACT_SEQUENCE_POSTSTATE_VERIFIED_REVERSIBLE_UNCOMMISSIONED'
  && r10gQa.qaPayloadSha256 === EXPECTED.r10gQaPayloadSha256,
'accepted R10G release or post-QA binding drifted');
invariant(samePath(ledger.postSnapshot.root, POST_ROOT)
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postCompleteSaveSha256
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postCompleteSaveSha256
  && postIdentity.sha256 === EXPECTED.postRegionSha256,
'accepted R10G post snapshot binding drifted');
invariant(bindings.r10aLedger.sha256 === EXPECTED.r10aLedgerSha256
  && bindings.r10aPostQa.sha256 === EXPECTED.r10aQaSha256
  && bindings.r10aManifest.sha256 === EXPECTED.r10aManifestSha256
  && r10aLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && r10aQa.status === 'PASS_R10A_CHEYENNE_SECURE_GALLERY_POST_RELEASE_ACCEPTED'
  && bindings.r12aCommissioningSeal.sha256 === EXPECTED.r12aSealSha256
  && r12aSeal.status === 'PASS_R12A_CHEYENNE_GALLERY_HOLD_POINT_CIRCULATION_COMMISSIONED',
'accepted R10A release, post QA, or R12A commissioning binding drifted');
invariant(bindings.geometry.sha256 === EXPECTED.geometrySha256
  && bindings.releaseContract.sha256 === EXPECTED.releaseContractSha256,
'frozen geometry or release contract binding drifted');
const r12Node = releaseContract.releaseSequence.find(({ id }) => (
  id === 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING'
));
invariant(r12Node?.prohibitedInitialConnections
  .includes('Cheyenne secure circulation direct terminal link'),
'Cheyenne direct-terminal prohibition is missing');

const centers = geometry.design.centerline.points.filter(({ index }) => (
  index >= 471 && index <= 800
));
invariant(centers.length === EXPECTED.stationCount && centers.every((point, offset) => (
  point.index === 471 + offset
  && point.x === 2377 - offset
  && point.y === 166
  && point.z === -868
  && point.phase === 'LEG-3-INSTITUTIONAL'
  && point.tangent === 'WEST'
)), 'frozen institutional centerline drifted');
const centerline = centers.map(({ x, y, z }) => ({ x, y, z }));
const longitudinalDistances = centerline.slice(1).map((cell, index) => (
  Math.abs(cell.x - centerline[index].x)
  + Math.abs(cell.y - centerline[index].y)
  + Math.abs(cell.z - centerline[index].z)
));
invariant(longitudinalDistances.length === 329
  && longitudinalDistances.every((distance) => distance === 1),
'institutional centerline is not a contiguous unit-step run');

const route = [];
const liner = [];
const pedestrianClearance = [];
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
  for (let y = 166; y <= 168; y += 1) {
    for (let z = -869; z <= -867; z += 1) {
      pedestrianClearance.push({ x: point.x, y, z });
    }
  }
}
const exactRoute = uniqueCells(route);
const exactLiner = uniqueCells(liner);
const exactClearance = uniqueCells(pedestrianClearance);
const floor = exactLiner.filter(({ y }) => y === 165);
const ceiling = exactLiner.filter(({ y }) => y === 170);
const upstreamSeam = [];
const terminusCap = [];
for (let y = 166; y <= 169; y += 1) {
  for (let z = -870; z <= -866; z += 1) {
    upstreamSeam.push({ x: 2378, y, z });
    terminusCap.push({ x: 2047, y, z });
  }
}
const r10gR10aInterface = exactRoute.filter(({ x }) => x === 2080 || x === 2081);
const z08Z10Interface = exactRoute.filter(({ x }) => x === 2088 || x === 2089);
const routeWithUpstream = uniqueCells([...upstreamSeam, ...exactRoute]);
const routeTopology = connectivity(exactRoute);
const routeWithUpstreamTopology = connectivity(routeWithUpstream);
const halo = [];
for (let x = 2047; x <= 2378; x += 1) {
  for (let y = 164; y <= 171; y += 1) {
    for (let z = -872; z <= -864; z += 1) halo.push({ x, y, z });
  }
}
invariant(exactRoute.length === EXPECTED.routeCellCount
  && routeWithUpstream.length === EXPECTED.routeWithUpstreamCellCount
  && exactClearance.length === EXPECTED.pedestrianClearanceCellCount
  && exactLiner.length === EXPECTED.linerCellCount
  && floor.length === EXPECTED.floorCellCount
  && ceiling.length === EXPECTED.ceilingCellCount
  && upstreamSeam.length === EXPECTED.upstreamSeamCellCount
  && terminusCap.length === EXPECTED.terminusCapCellCount
  && r10gR10aInterface.length === 40 && z08Z10Interface.length === 40
  && halo.length === EXPECTED.haloCellCount
  && routeTopology.componentCount === 1
  && routeTopology.largestComponentCellCount === EXPECTED.routeCellCount
  && routeWithUpstreamTopology.componentCount === 1
  && routeWithUpstreamTopology.largestComponentCellCount === EXPECTED.routeWithUpstreamCellCount,
'institutional route/liner/clearance/seam/cap geometry drifted');

const r10gPackages = r10gManifest.packages.map((pkg) => ({
  key: pkg.key,
  forward: parseOperations(pkg.forward),
  rollback: parseOperations(pkg.rollback),
  rollbackPath: pkg.rollback,
}));
const r10aPackage = {
  key: r10aManifest.packages[0].key,
  forward: parseOperations(r10aManifest.packages[0].forward),
  rollback: parseOperations(r10aManifest.packages[0].rollback),
  rollbackPath: r10aManifest.packages[0].rollback,
};
const buildPackages = [...r10gPackages, r10aPackage];
const targetRecords = buildPackages.flatMap(({ forward }) => forward);
const targetKeys = new Set(targetRecords.map(({ cell }) => cellKey(cell)));
const desiredByKey = new Map(targetRecords.map(({ cell, targetState }) => (
  [cellKey(cell), targetState]
)));
invariant(targetRecords.length === EXPECTED.linerCellCount
  && targetKeys.size === EXPECTED.linerCellCount
  && hashCells(targetRecords.map(({ cell }) => cell)) === hashCells(exactLiner),
'R10G/R10A targets do not exactly reproduce the independently derived liner');

const reader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(POST_ROOT, 'entities')));
const [linerStates, routeStates, clearanceStates, upstreamStates, capStates,
  r10gR10aInterfaceStates, z08Z10InterfaceStates, haloStates] = await Promise.all([
  states(reader, exactLiner), states(reader, exactRoute), states(reader, exactClearance),
  states(reader, upstreamSeam), states(reader, terminusCap),
  states(reader, r10gR10aInterface), states(reader, z08Z10Interface), states(reader, halo),
]);
const linerMismatches = linerStates.filter(({ cell, state }) => (
  desiredByKey.get(cellKey(cell)) !== state
));
const routeMismatches = routeStates.filter(({ state }) => state !== AIR);
const clearanceMismatches = clearanceStates.filter(({ state }) => state !== AIR);
const upstreamMismatches = upstreamStates.filter(({ state }) => state !== AIR);
const capMismatches = capStates.filter(({ state }) => state !== STONE);
const interfaceMismatches = [...r10gR10aInterfaceStates, ...z08Z10InterfaceStates]
  .filter(({ state }) => state !== AIR);
const floorStates = linerStates.filter(({ cell }) => cell.y === 165);
const ceilingStates = linerStates.filter(({ cell }) => cell.y === 170);
const fixtureCells = ceilingStates.filter(({ state }) => state === LIGHT)
  .map(({ cell }) => cell).sort((left, right) => right.x - left.x);
const fixtureIndices = fixtureCells.map(({ x }) => 471 + (2377 - x));
const fixtureGaps = [470, ...fixtureIndices, 800].slice(1).map((index, offset) => (
  index - [470, ...fixtureIndices][offset]
));
const maximumFixtureSpacing = Math.max(...fixtureGaps);
invariant(linerMismatches.length === 0 && routeMismatches.length === 0
  && clearanceMismatches.length === 0 && upstreamMismatches.length === 0
  && capMismatches.length === 0 && interfaceMismatches.length === 0
  && fixtureCells.length === EXPECTED.fixtureCount && maximumFixtureSpacing === 6,
'current liner/route/clearance/seam/cap/fixture state failed');

const haloFluid = haloStates.filter(({ state }) => (
  FLUID_NAMES.has(blockName(state)) || state.includes('waterlogged=true')
));
const haloContainerOrControl = haloStates.filter(({ state }) => (
  CONTAINER_OR_CONTROL_NAMES.has(blockName(state))
));
const entities = await entityCensus(reader, entityReader, boundsOf(halo));
invariant(haloFluid.length === 0 && haloContainerOrControl.length === 0
  && entities.blockEntities.length === 0 && entities.savedEntities.length === 0,
'institutional route domain contains a fluid, container/control, block entity, or saved entity');

const rollbackOrder = [
  { key: r10gPackages[1].key, pkg: r10gPackages[1], preflight: PREFLIGHTS.r10gZ10 },
  { key: r10gPackages[0].key, pkg: r10gPackages[0], preflight: PREFLIGHTS.r10gZ08 },
  { key: r10aPackage.key, pkg: r10aPackage, preflight: PREFLIGHTS.r10a },
];
const rollbackEvidence = rollbackOrder.map(({ key, pkg, preflight }) => {
  const report = readJson(preflight);
  const operation = fileBinding(pkg.rollbackPath);
  const reportBinding = fileBinding(preflight);
  const expectedReportSha = key === r10gPackages[1].key
    ? EXPECTED.preflightSha256.r10gZ10
    : key === r10gPackages[0].key
      ? EXPECTED.preflightSha256.r10gZ08 : EXPECTED.preflightSha256.r10a;
  const passed = reportBinding.sha256 === expectedReportSha
    && report.status === 'PASS'
    && report.opsSha256 === operation.sha256
    && samePath(report.regions, path.join(POST_ROOT, 'region'))
    && report.regionsSnapshot?.sha256 === EXPECTED.postRegionSha256
    && report.operationCount === pkg.rollback.length
    && report.passed === pkg.rollback.length && report.failed === 0
    && report.failurePointsComplete === true
    && report.sourceOverlays === null && report.naturalStateTransitionPolicy === null;
  invariant(passed, `${key} current-post rollback preflight failed`);
  return {
    key,
    rollbackOperation: operation,
    currentPostPreflight: reportBinding,
    operationCount: pkg.rollback.length,
    passedGuards: report.passed,
    failedGuards: report.failed,
    passed,
  };
});
const rollbackTargetSets = rollbackOrder.map(({ pkg }) => new Set(
  pkg.rollback.map(({ cell }) => cellKey(cell)),
));
let rollbackCrossPackageIntersectionCount = 0;
for (let left = 0; left < rollbackTargetSets.length; left += 1) {
  for (let right = left + 1; right < rollbackTargetSets.length; right += 1) {
    for (const key of rollbackTargetSets[left]) {
      if (rollbackTargetSets[right].has(key)) rollbackCrossPackageIntersectionCount += 1;
    }
  }
}
invariant(rollbackCrossPackageIntersectionCount === 0
  && rollbackEvidence.reduce((sum, entry) => sum + entry.passedGuards, 0)
    === EXPECTED.rollbackGuardCount,
'rollback chain is not disjoint exact 5,940/5,940');

const checks = [
  ['R12M-COM-01-ACCEPTED-R10G-POST-AND-QA-BOUND', true],
  ['R12M-COM-02-ACCEPTED-R10A-AND-R12A-BOUND', true],
  ['R12M-COM-03-EXACT-330-STATION-CENTERLINE', centers.length === 330],
  ['R12M-COM-04-EXACT-5940-LINER-STATES', linerMismatches.length === 0],
  ['R12M-COM-05-EXACT-6600-CONNECTED-ROUTE-AIR',
    routeMismatches.length === 0 && routeTopology.componentCount === 1],
  ['R12M-COM-06-EXACT-2970-CENTRAL-CLEARANCE-AIR', clearanceMismatches.length === 0],
  ['R12M-COM-07-EXACT-1650-FLOOR-AND-1650-CEILING',
    floorStates.length === 1650 && ceilingStates.length === 1650],
  ['R12M-COM-08-EXACT-54-FIXTURE-CADENCE',
    fixtureCells.length === 54 && maximumFixtureSpacing === 6],
  ['R12M-COM-09-UPSTREAM-AND-INTERNAL-SEAMS-CLEAR',
    upstreamMismatches.length === 0 && interfaceMismatches.length === 0],
  ['R12M-COM-10-CHEYENNE-TERMINUS-CAP-FAIL-CLOSED', capMismatches.length === 0],
  ['R12M-COM-11-23904-CELL-DOMAIN-HAZARD-AND-ENTITY-CLEAR',
    haloFluid.length === 0 && haloContainerOrControl.length === 0
      && entities.blockEntities.length === 0 && entities.savedEntities.length === 0],
  ['R12M-COM-12-EXACT-DISJOINT-5940-ROLLBACK-CHAIN',
    rollbackCrossPackageIntersectionCount === 0
      && rollbackEvidence.every(({ passed }) => passed)],
  ['R12M-COM-13-SECURE-PUBLIC-CONTROL-CHAMBER-TERMINAL-MECHANISM-CLOSED', true],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
const failedChecks = checks.filter(({ status }) => status === 'FAIL');
invariant(failedChecks.length === 0,
  `checks failed: ${failedChecks.map(({ id }) => id).join(', ')}`);

const payload = {
  schemaVersion: 1,
  id: 'combined-zones-r12m-b03-institutional-route-commissioning',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R12M_B03_INSTITUTIONAL_ROUTE_PASSIVE_INTERNAL_CIRCULATION_COMMISSIONED',
  release: {
    releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
    commissioningScopeId: 'CZ-R12M-B03-INSTITUTIONAL-ROUTE-PASSIVE-INTERNAL-CIRCULATION',
    mvpScope: true,
    sourceTransactionId: ledger.transactionId,
    sourceCompletedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
    functionalDisposition: 'PASSIVE_INTERNAL_INSPECTION_CIRCULATION_TO_FAIL_CLOSED_HOLD',
  },
  bindings: {
    ...bindings,
    latestPhysicalState: {
      root: relative(POST_ROOT),
      completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
      regionSnapshotSha256: postIdentity.sha256,
    },
    r10gQaPayloadSha256: r10gQa.qaPayloadSha256,
    r10aQaPayloadSha256: r10aQa.qaPayloadSha256,
    r12aCommissioningPayloadSha256: r12aSeal.commissioningPayloadSha256,
  },
  geometry: {
    centerline: {
      firstIndex: centers[0].index,
      lastIndex: centers.at(-1).index,
      stationCount: centers.length,
      longitudinalStepCount: longitudinalDistances.length,
      orderedSha256: sha256(`${centerline.map(cellKey).join('\n')}\n`),
    },
    route: classManifest(exactRoute),
    upstreamSeam: classManifest(upstreamSeam),
    routeWithUpstream: classManifest(routeWithUpstream),
    centralPedestrianClearance: classManifest(exactClearance),
    liner: classManifest(exactLiner),
    floor: classManifest(floor),
    ceiling: classManifest(ceiling),
    z08Z10Interface: classManifest(z08Z10Interface),
    r10gR10aInterface: classManifest(r10gR10aInterface),
    cheyenneTerminusCap: classManifest(terminusCap),
    interactionDomain: classManifest(halo),
  },
  observedState: {
    liner: {
      matchingCellCount: linerStates.length - linerMismatches.length,
      mismatchCellCount: linerMismatches.length,
      stateCensus: stateCensus(linerStates),
    },
    route: {
      airCellCount: routeStates.length - routeMismatches.length,
      mismatchCellCount: routeMismatches.length,
      componentCount: routeTopology.componentCount,
      largestComponentCellCount: routeTopology.largestComponentCellCount,
      withUpstreamSeamComponentCount: routeWithUpstreamTopology.componentCount,
      withUpstreamSeamLargestComponentCellCount:
        routeWithUpstreamTopology.largestComponentCellCount,
    },
    centralPedestrianClearance: {
      airCellCount: clearanceStates.length - clearanceMismatches.length,
      mismatchCellCount: clearanceMismatches.length,
    },
    walkingSurface: {
      cellCount: floorStates.length,
      stateCensus: stateCensus(floorStates),
      continuous: true,
    },
    ceiling: {
      cellCount: ceilingStates.length,
      stateCensus: stateCensus(ceilingStates),
      continuous: true,
    },
    fixtures: {
      cellCount: fixtureCells.length,
      cells: fixtureCells,
      centerlineIndices: fixtureIndices,
      longitudinalGapsIncludingEnds: fixtureGaps,
      maximumLongitudinalSpacing: maximumFixtureSpacing,
    },
    seamsAndCap: {
      upstreamAirCellCount: upstreamStates.length - upstreamMismatches.length,
      z08Z10InterfaceAirCellCount: z08Z10InterfaceStates.length,
      r10gR10aInterfaceAirCellCount: r10gR10aInterfaceStates.length,
      cheyenneTerminusStoneCellCount: capStates.length - capMismatches.length,
    },
    interactionDomain: {
      cellCount: haloStates.length,
      fluidCellCount: haloFluid.length,
      containerOrControlCellCount: haloContainerOrControl.length,
      blockEntityCount: entities.blockEntities.length,
      savedEntityCount: entities.savedEntities.length,
    },
  },
  rollbackReadiness: {
    order: rollbackEvidence.map(({ key }) => key),
    packages: rollbackEvidence,
    crossPackageIntersectionCount: rollbackCrossPackageIntersectionCount,
    totalOperationCount: rollbackEvidence.reduce((sum, entry) => sum + entry.operationCount, 0),
    passedGuardCount: rollbackEvidence.reduce((sum, entry) => sum + entry.passedGuards, 0),
    failedGuardCount: rollbackEvidence.reduce((sum, entry) => sum + entry.failedGuards, 0),
    currentPostRegionSha256: postIdentity.sha256,
    exactCurrentPostState: true,
  },
  boundary: {
    commissioned: [
      'bounded passive internal inspection/circulation from the exact index-470 construction seam through indices 471..800',
      'continuous central 3x3 clearance, walking surface, ceiling enclosure, and deterministic passive fixture cadence',
      'arrival at the retained fail-closed Cheyenne hold point',
    ],
    explicitlyNotCommissioned: [
      'secure or public access classification',
      'access-control mechanism, powered gate, signaling, power, or automatic operation',
      'Cheyenne chamber excavation or occupancy',
      'Cheyenne secure circulation direct terminal link',
      'rail, vehicle, drive, brake, or any active transport mechanism',
      'C2, C3, PassageWay, Houston direct-terminal link, or Empty Eight future-line stub',
    ],
    secureRouteCommissioned: false,
    publicRouteCommissioned: false,
    accessControlCommissioned: false,
    chamberOpenedOrOccupied: false,
    directTerminalLinkOpened: false,
    activeMechanismCommissioned: false,
  },
  checks,
  summary: {
    passed: true,
    checkCount: checks.length,
    passCount: checks.length,
    failCount: 0,
    stationCount: centers.length,
    routeAirCellCount: routeStates.length - routeMismatches.length,
    centralClearanceAirCellCount: clearanceStates.length - clearanceMismatches.length,
    floorCellCount: floorStates.length,
    ceilingCellCount: ceilingStates.length,
    fixtureCellCount: fixtureCells.length,
    linerExactCellCount: linerStates.length - linerMismatches.length,
    rollbackGuardPassCount: rollbackEvidence.reduce((sum, entry) => sum + entry.passedGuards, 0),
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
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN), `# CZ-R12M B03 institutional-route commissioning\n\n`
  + `**Status:** PASS  \n`
  + `**Commissioning payload:** \`${commissioningPayloadSha256}\`  \n`
  + `**Accepted physical state:** \`${EXPECTED.completedReleaseIdentitySha256}\`\n\n`
  + `R12M accepts bounded passive internal inspection/circulation across all `
  + `${centers.length} institutional stations, from the exact index-470 construction `
  + `seam through index 800 to the retained Cheyenne hold.\n\n`
  + `The ${exactRoute.length.toLocaleString('en-US')}-cell route is one connected `
  + `air component. All ${exactClearance.length.toLocaleString('en-US')} central `
  + `3×3 clearance cells are air; ${floor.length.toLocaleString('en-US')} floor `
  + `and ${ceiling.length.toLocaleString('en-US')} ceiling cells are exact; all `
  + `${fixtureCells.length} fixtures preserve a maximum six-block cadence. Both `
  + `internal ownership/release seams are clear and the 20-cell Cheyenne cap is `
  + `exact stone.\n\n`
  + `The ${halo.length.toLocaleString('en-US')}-cell interaction domain has zero `
  + `fluid, container/control, block-entity, or saved-entity intersections. The `
  + `disjoint reverse chain passes ${EXPECTED.rollbackGuardCount.toLocaleString('en-US')}/`
  + `${EXPECTED.rollbackGuardCount.toLocaleString('en-US')} guards in physical `
  + `reverse order: R10G Z10, R10G Z08, then R10A.\n\n`
  + `This does not commission secure/public access, controls, chamber use, a direct `
  + `terminal link, or any active mechanism. The verifier made no live call, world `
  + `edit, or service mutation.\n`);
console.log(JSON.stringify({
  status: report.status,
  commissioningPayloadSha256,
  stations: report.summary.stationCount,
  routeAir: report.summary.routeAirCellCount,
  clearanceAir: report.summary.centralClearanceAirCellCount,
  floor: report.summary.floorCellCount,
  ceiling: report.summary.ceilingCellCount,
  fixtures: report.summary.fixtureCellCount,
  rollbackGuards: report.summary.rollbackGuardPassCount,
  output: relative(OUT),
  markdown: relative(MARKDOWN),
  liveCallsPerformed: false,
}, null, 2));
