#!/usr/bin/env node
/** Read-only as-built commissioning seal for the B03 indices 188..800 route. */

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
const GENERATED_AT = value('--generated-at', '2026-08-22T04:10:00Z');
const POST_ROOT = value('--post-root', 'data/worldsnap-r10h-post-20260822T035805Z');
const EVIDENCE = value('--evidence-dir', 'data/world-review/combined-zones-r12o-b03-complete-enclosed-route-commissioning-20260822T041000Z');
const OUT = value('--out', `${EVIDENCE}/r12o-commissioning.json`);
const MARKDOWN = value('--markdown', `${EVIDENCE}/r12o-commissioning.md`);
const INPUTS = Object.freeze({
  r10hLedger: 'data/world-review/combined-zones-r10h-live-20260822T035805Z/evidence-ledger.json',
  r10hQa: 'data/world-review/combined-zones-r10h-live-20260822T035805Z/r10h-post-release-qa.json',
  r10hManifest: 'data/buildops/combined-zones-r10h-b03-preinstitutional-passive-route-lighting.release-manifest.json',
  r10hRollbackPreflight: 'data/world-review/combined-zones-r10h-live-20260822T035805Z/b03-preinstitutional-passive-route-lighting.rollback-poststate-preflight.json',
  r10gManifest: 'data/buildops/combined-zones-r10g-b03-institutional-contact-sequence-fitout.release-manifest.json',
  r10aManifest: 'data/buildops/combined-zones-r10-cheyenne-secure-gallery.release-manifest.json',
  r12mSeal: 'data/world-review/combined-zones-r12m-b03-institutional-route-commissioning-20260822T034000Z/r12m-commissioning.json',
  geometry: 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
});
const PREFLIGHTS = Object.freeze({
  r10gZ10: `${EVIDENCE}/r10g-z10-rollback-current-post-preflight.json`,
  r10gZ08: `${EVIDENCE}/r10g-z08-rollback-current-post-preflight.json`,
  r10a: `${EVIDENCE}/r10a-rollback-current-post-preflight.json`,
});
const EXPECTED = Object.freeze({
  r10hLedgerSha256: '4b941b36e71de03cb40d73edc7a526de24ee786550eb02d4b8a8b866b0eec8bc',
  r10hQaSha256: '0219243e1e1a649ee7dd5b3f0f57efc3beb1778a28d22a805e8d8020c1b9b11c',
  r10hQaPayloadSha256: '19346d2a8d599e92b5deedbc78569d1deb2b0b5d54d86286f28208474d52bee9',
  r10hManifestSha256: '3957c20e00f2210e07db2c2f02a8e647e22f2b0084f1de51a56531713f2fac2a',
  r10hManifestIdentity: '2b9420ba2e27f7c2c97bffac981abe4974532ea2211b8aacb429b5f5cb355ffc',
  r10hCompletedReleaseIdentitySha256: '731d4b4c669ac1bccf3c1f2fd32dc5f67c2f70922700d8fb7f3c1ac50f62b364',
  postCompleteSaveSha256: '86bdbd6875a18cffc2707334633f79c9089aecb9fb45074fb16111bfd87fda4b',
  postRegionSha256: '4a05db8475820894ad5c5043b84f13c27611acf0899cc41e5a1f4b9f17878268',
  r10hRollbackPreflightSha256: '8a305aa2e99f4b1270d6a6fecb782f6b7c872ff1c8f6253d4c553981ea910c3d',
  r10gManifestSha256: 'a7a078df110d10160fb47dcb538067769739db79cc3ba765757b4d4fdf28a73e',
  r10aManifestSha256: 'd4ad3c70a5454c6cf95262aa006a4c27cd0b7955a32d732ff07005a0e95a00cb',
  r12mSealSha256: '81b87d67c45d085fe44115fd5e29762b4c1e2af08c175145b079e6329e5d2db8',
  r12mPayloadSha256: '7dd8bf69850cd661d4e912579be5fd6870c6c795f78e99634a51b12756cb7628',
  geometrySha256: '216ca18a7dd2a4e06b258dcc817c786b294ac8ebd992dfdb5ab5dba1f46829b1',
  releaseContractSha256: '64f4432f00bd31fe8e5cd12921cd91bdc84b32c5c16630e62138accdf94ed8e0',
  preflightSha256: {
    r10gZ10: '5204decd26ca3c10d83c6f72be6deb574ced9e002f23f93b390d3b33b7debbd4',
    r10gZ08: '35ec0ace46c95d5f238f027086dd98a07d065a435e1d1cb2ba926666b55e7e64',
    r10a: '474c30259c64c493bc659a9c955349fedcc409e02ebe13e5fd4da422b057725e',
  },
  stationCount: 613,
  routeCount: 12212,
  routeHash: 'd176926aa1f7710617b93769eab140bc529da4ad71aeb4e4462e7b9a7f3c7d01',
  routeWithUpstreamCount: 12232,
  routeWithUpstreamHash: 'f46f0096badf0560dd6ba3da11fe025a37c9094075014aac0c96b25011998346',
  clearanceCount: 5505,
  clearanceHash: '1df5ba4c9c7a36308a60aaacee659d1b82d482ef154962e0df74b31370989e42',
  floorCount: 3053,
  floorHash: '1be45f3e8a611106daddbbd2e67903d41a26b4f643e837cdeca2a9181a0fd146',
  ceilingCount: 3053,
  ceilingHash: 'ce5246deb30e88e7041a02460b37fb6bda1013d3917e64876e9d3da81dc5d612',
  boundaryCount: 4856,
  boundaryHash: '52d58e4fbbc6aff55b37f44d4042ab38dcb6122b838ffaeaa6550263c2b48f5a',
  interactionCount: 41652,
  interactionHash: 'fa2866325bbd558fe948388903540660d4897c8ccd3d55d4cb97d6d99dea34fa',
  fixtureCount: 102,
  earlyRouteCount: 3760,
  earlyRouteObstructionCount: 63,
  earlyFloorCount: 940,
  earlyFloorAirCount: 14,
  rollbackCount: 5988,
});

const AIR = 'minecraft:air';
const LIGHT = 'minecraft:sea_lantern';
const FORBIDDEN = new Set([
  'minecraft:water', 'minecraft:lava', 'minecraft:chest',
  'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:furnace',
  'minecraft:blast_furnace', 'minecraft:smoker', 'minecraft:hopper',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:shulker_box',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:command_block',
  'minecraft:chain_command_block', 'minecraft:repeating_command_block',
  'minecraft:structure_block', 'minecraft:rail', 'minecraft:powered_rail',
  'minecraft:detector_rail', 'minecraft:activator_rail',
  'minecraft:redstone_wire', 'minecraft:redstone_torch',
  'minecraft:redstone_wall_torch', 'minecraft:repeater',
  'minecraft:comparator', 'minecraft:piston', 'minecraft:sticky_piston',
  'minecraft:observer',
]);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel']);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0],
  [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const binding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12O B03 commissioning rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact) };
};
const stateCensus = (records) => Object.fromEntries([...records.reduce(
  (counts, { state }) => counts.set(state, (counts.get(state) ?? 0) + 1),
  new Map(),
).entries()].sort(([left], [right]) => left.localeCompare(right)));

function parseOperations(filename) {
  const operations = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const point = fields.slice(1, 4).map(Number);
    invariant(fields.slice(4, 7).map(Number).join(',') === point.join(','),
      `${filename} contains a non-cell operation`);
    operations.push({ cell: { x: point[0], y: point[1], z: point[2] },
      sourceState: fields[7], targetState: fields[8] });
  }
  return operations;
}

function geometryFor(points) {
  const route = []; const clearance = []; const floor = []; const ceiling = []; const walls = [];
  for (const point of points) {
    const lateralX = point.tangent === 'NORTH' || point.tangent === 'SOUTH';
    for (let offset = -2; offset <= 2; offset += 1) {
      const x = point.x + (lateralX ? offset : 0);
      const z = point.z + (lateralX ? 0 : offset);
      for (let dy = 0; dy <= 3; dy += 1) route.push({ x, y: point.y + dy, z });
      floor.push({ x, y: point.y - 1, z }); ceiling.push({ x, y: point.y + 4, z });
    }
    for (let offset = -1; offset <= 1; offset += 1) {
      const x = point.x + (lateralX ? offset : 0);
      const z = point.z + (lateralX ? 0 : offset);
      for (let dy = 0; dy <= 2; dy += 1) clearance.push({ x, y: point.y + dy, z });
    }
    for (const offset of [-3, 3]) {
      const x = point.x + (lateralX ? offset : 0);
      const z = point.z + (lateralX ? 0 : offset);
      for (let dy = 0; dy <= 3; dy += 1) walls.push({ x, y: point.y + dy, z });
    }
  }
  return { route: uniqueCells(route), clearance: uniqueCells(clearance),
    floor: uniqueCells(floor), ceiling: uniqueCells(ceiling), walls: uniqueCells(walls) };
}

function connectivity(cells) {
  const remaining = new Set(cells.map(cellKey)); const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value; remaining.delete(first);
    const stack = [first]; let size = 0;
    while (stack.length) {
      const [x, y, z] = stack.pop().split(',').map(Number); size += 1;
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
  const records = [];
  for (const cell of uniqueCells(cells)) records.push({ cell,
    state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
  return records;
}

async function entityCensus(regionReader, entityReader, cells) {
  const keys = new Set(cells.map(cellKey));
  const chunks = [...new Set(cells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
  const blockEntities = []; const savedEntities = [];
  for (const chunkKey of chunks) {
    const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
    const chunk = await regionReader.chunk(chunkX, chunkZ);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (keys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? null, cell });
    }
    const entityChunk = await entityReader.chunk(chunkX, chunkZ);
    for (const entity of entityChunk?.Entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const [x, y, z] = entity.Pos.map(Number);
      if (keys.has(cellKey({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) }))) {
        savedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
      }
    }
  }
  return { blockEntities, savedEntities };
}

const ledger = readJson(INPUTS.r10hLedger);
const r10hQa = readJson(INPUTS.r10hQa);
const r10h = readJson(INPUTS.r10hManifest);
const r10g = readJson(INPUTS.r10gManifest);
const r10a = readJson(INPUTS.r10aManifest);
const r12m = readJson(INPUTS.r12mSeal);
const geometry = readJson(INPUTS.geometry);
const contract = readJson(INPUTS.releaseContract);
const bindings = Object.fromEntries(Object.entries(INPUTS).map(([key, filename]) => [key, binding(filename)]));
const postIdentity = readJson(ledger.postSnapshot.identity.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
invariant(bindings.r10hLedger.sha256 === EXPECTED.r10hLedgerSha256
  && bindings.r10hQa.sha256 === EXPECTED.r10hQaSha256
  && r10hQa.qaPayloadSha256 === EXPECTED.r10hQaPayloadSha256
  && r10hQa.summary.passed === true
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.r10hCompletedReleaseIdentitySha256,
'accepted R10H ledger or post QA drifted');
invariant(bindings.r10hManifest.sha256 === EXPECTED.r10hManifestSha256
  && r10h.manifestIdentity === EXPECTED.r10hManifestIdentity
  && bindings.r10hRollbackPreflight.sha256 === EXPECTED.r10hRollbackPreflightSha256,
'R10H manifest or inverse evidence drifted');
invariant(absolute(ledger.postSnapshot.root) === absolute(POST_ROOT)
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postCompleteSaveSha256
  && postIdentity.sha256 === EXPECTED.postRegionSha256
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postCompleteSaveSha256,
'accepted R10H immutable post binding drifted');
invariant(bindings.r10gManifest.sha256 === EXPECTED.r10gManifestSha256
  && bindings.r10aManifest.sha256 === EXPECTED.r10aManifestSha256
  && bindings.r12mSeal.sha256 === EXPECTED.r12mSealSha256
  && r12m.commissioningPayloadSha256 === EXPECTED.r12mPayloadSha256
  && bindings.geometry.sha256 === EXPECTED.geometrySha256
  && bindings.releaseContract.sha256 === EXPECTED.releaseContractSha256,
'accepted downstream route or frozen geometry binding drifted');
const r12Node = contract.releaseSequence.find(({ id }) => id === 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING');
invariant(r12Node?.prohibitedInitialConnections.includes('Cheyenne secure circulation direct terminal link'),
'R12 direct-terminal prohibition drifted');

const centers = geometry.design.centerline.points.filter(({ index }) => index >= 188 && index <= 800);
const earlyPoints = geometry.design.centerline.points.filter(({ index }) => index <= 187);
invariant(centers.length === EXPECTED.stationCount
  && centers.every((point, offset) => point.index === 188 + offset)
  && centers.every(({ y }) => y === 166), 'frozen centerline range drifted');
const centerline = centers.map(({ x, y, z }) => ({ x, y, z }));
const steps = centerline.slice(1).map((cell, index) => Math.abs(cell.x - centerline[index].x)
  + Math.abs(cell.y - centerline[index].y) + Math.abs(cell.z - centerline[index].z));
invariant(steps.length === 612 && steps.every((distance) => distance === 1),
'selected centerline is not a contiguous unit-step run');
const selected = geometryFor(centers);
const early = geometryFor(earlyPoints);
const upstream = geometryFor([geometry.design.centerline.points[187]]);
const terminus = geometryFor([{ ...geometry.design.centerline.points[800], x: 2047, index: 801 }]);
const routeKeys = new Set(selected.route.map(cellKey));
const boundary = selected.walls.filter((cell) => !routeKeys.has(cellKey(cell)));
const routeWithUpstream = uniqueCells([...upstream.route, ...selected.route]);
const routeTopology = connectivity(selected.route);
const routeWithUpstreamTopology = connectivity(routeWithUpstream);
const interaction = uniqueCells([...selected.route, ...selected.floor, ...selected.ceiling, ...boundary]
  .flatMap((cell) => {
    const cells = [];
    for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
    return cells;
  }));
invariant(selected.route.length === EXPECTED.routeCount && hashCells(selected.route) === EXPECTED.routeHash
  && routeWithUpstream.length === EXPECTED.routeWithUpstreamCount && hashCells(routeWithUpstream) === EXPECTED.routeWithUpstreamHash
  && selected.clearance.length === EXPECTED.clearanceCount && hashCells(selected.clearance) === EXPECTED.clearanceHash
  && selected.floor.length === EXPECTED.floorCount && hashCells(selected.floor) === EXPECTED.floorHash
  && selected.ceiling.length === EXPECTED.ceilingCount && hashCells(selected.ceiling) === EXPECTED.ceilingHash
  && boundary.length === EXPECTED.boundaryCount && hashCells(boundary) === EXPECTED.boundaryHash
  && interaction.length === EXPECTED.interactionCount && hashCells(interaction) === EXPECTED.interactionHash
  && routeTopology.componentCount === 1 && routeTopology.largestComponentCellCount === EXPECTED.routeCount
  && routeWithUpstreamTopology.componentCount === 1
  && routeWithUpstreamTopology.largestComponentCellCount === EXPECTED.routeWithUpstreamCount,
'route, enclosure, interaction, or topology identity drifted');

const reader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(POST_ROOT, 'entities')));
const [routeStates, clearanceStates, floorStates, ceilingStates, boundaryStates,
  upstreamStates, capStates, interactionStates, earlyRouteStates, earlyFloorStates] = await Promise.all([
  states(reader, selected.route), states(reader, selected.clearance), states(reader, selected.floor),
  states(reader, selected.ceiling), states(reader, boundary), states(reader, upstream.route),
  states(reader, terminus.route), states(reader, interaction), states(reader, early.route), states(reader, early.floor),
]);
const routeMismatches = routeStates.filter(({ state }) => state !== AIR);
const clearanceMismatches = clearanceStates.filter(({ state }) => state !== AIR);
const hazardous = (records, allowAir = false) => records.filter(({ state }) => (
  (!allowAir && state === AIR) || FORBIDDEN.has(blockName(state))
  || GRAVITY.has(blockName(state)) || state.includes('waterlogged=true')
));
const floorHazards = hazardous(floorStates);
const ceilingHazards = hazardous(ceilingStates);
const boundaryHazards = hazardous(boundaryStates);
const upstreamMismatches = upstreamStates.filter(({ state }) => state !== AIR);
const capMismatches = capStates.filter(({ state }) => state !== 'minecraft:stone');
const interactionHazards = hazardous(interactionStates, true);
invariant(routeMismatches.length === 0 && clearanceMismatches.length === 0
  && floorHazards.length === 0 && ceilingHazards.length === 0 && boundaryHazards.length === 0
  && upstreamMismatches.length === 0 && capMismatches.length === 0 && interactionHazards.length === 0,
'as-built route, support, boundary, seam, cap, or domain state failed');
invariant(JSON.stringify(stateCensus(floorStates)) === JSON.stringify({
  'minecraft:polished_blackstone_bricks': 15, 'minecraft:polished_diorite': 1398,
  'minecraft:smooth_stone': 1635, 'minecraft:stone': 5,
}) && JSON.stringify(stateCensus(ceilingStates)) === JSON.stringify({
  'minecraft:polished_blackstone_bricks': 15, 'minecraft:polished_diorite': 1355,
  'minecraft:polished_granite': 1581, 'minecraft:sea_lantern': 102,
}) && JSON.stringify(stateCensus(boundaryStates)) === JSON.stringify({
  'minecraft:polished_blackstone_bricks': 24, 'minecraft:polished_diorite': 2216,
  'minecraft:polished_granite': 2616,
}), 'floor, ceiling, or fall-boundary census drifted');

const fixtureIndices = [];
for (const point of centers) {
  const state = stateToCommandString(await reader.blockState(point.x, point.y + 4, point.z));
  if (state === LIGHT) fixtureIndices.push(point.index);
}
const fixtureGaps = fixtureIndices.slice(1).map((index, offset) => index - fixtureIndices[offset]);
fixtureGaps.push(800 - fixtureIndices.at(-1));
invariant(fixtureIndices.length === EXPECTED.fixtureCount && fixtureIndices[0] === 188
  && fixtureIndices.at(-1) === 794 && fixtureGaps.every((gap) => gap === 6),
'as-built 102-fixture cadence drifted');
const earlyRouteObstructions = earlyRouteStates.filter(({ state }) => state !== AIR);
const earlyFloorAir = earlyFloorStates.filter(({ state }) => state === AIR);
invariant(early.route.length === EXPECTED.earlyRouteCount
  && earlyRouteObstructions.length === EXPECTED.earlyRouteObstructionCount
  && early.floor.length === EXPECTED.earlyFloorCount
  && earlyFloorAir.length === EXPECTED.earlyFloorAirCount,
'indices 0..187 obstruction hold drifted');
const entities = await entityCensus(reader, entityReader, interaction);
invariant(entities.blockEntities.length === 0 && entities.savedEntities.length === 0,
'exact interaction domain contains a block entity or saved entity');

const r10hPackage = r10h.packages[0];
const r10gPackages = r10g.packages.map((pkg) => ({ ...pkg, rollbackOps: parseOperations(pkg.rollback) }));
const r10aPackage = { ...r10a.packages[0], rollbackOps: parseOperations(r10a.packages[0].rollback) };
const rollbackItems = [
  { key: r10hPackage.key, operation: r10hPackage.rollback, report: INPUTS.r10hRollbackPreflight, count: 48 },
  { key: r10gPackages[1].key, operation: r10gPackages[1].rollback, report: PREFLIGHTS.r10gZ10, count: 144 },
  { key: r10gPackages[0].key, operation: r10gPackages[0].rollback, report: PREFLIGHTS.r10gZ08, count: 5202 },
  { key: r10aPackage.key, operation: r10aPackage.rollback, report: PREFLIGHTS.r10a, count: 594 },
];
const rollbackEvidence = rollbackItems.map((item) => {
  const report = readJson(item.report); const operation = binding(item.operation); const reportBinding = binding(item.report);
  const expectedReportSha = item.key === r10hPackage.key ? EXPECTED.r10hRollbackPreflightSha256
    : item.key === r10gPackages[1].key ? EXPECTED.preflightSha256.r10gZ10
      : item.key === r10gPackages[0].key ? EXPECTED.preflightSha256.r10gZ08 : EXPECTED.preflightSha256.r10a;
  const passed = reportBinding.sha256 === expectedReportSha && report.status === 'PASS'
    && report.operationCount === item.count && report.passed === item.count && report.failed === 0
    && report.opsSha256 === operation.sha256 && report.regionsSnapshot?.sha256 === EXPECTED.postRegionSha256
    && report.sourceOverlays === null;
  invariant(passed, `${item.key} rollback preflight failed`);
  return { key: item.key, operation, currentPostPreflight: reportBinding,
    operationCount: item.count, passedGuardCount: report.passed, failedGuardCount: report.failed, passed };
});
const rollbackTargetSets = rollbackItems.map(({ operation }) => new Set(parseOperations(operation).map(({ cell }) => cellKey(cell))));
let rollbackIntersectionCount = 0;
for (let left = 0; left < rollbackTargetSets.length; left += 1) for (let right = left + 1; right < rollbackTargetSets.length; right += 1) {
  for (const key of rollbackTargetSets[left]) if (rollbackTargetSets[right].has(key)) rollbackIntersectionCount += 1;
}
invariant(rollbackIntersectionCount === 0
  && rollbackEvidence.reduce((sum, entry) => sum + entry.passedGuardCount, 0) === EXPECTED.rollbackCount,
'rollback chain is not disjoint exact 5,988/5,988');

const checks = [
  ['R12O-COM-01-ACCEPTED-R10H-POST-AND-QA-BOUND', true],
  ['R12O-COM-02-ACCEPTED-R12M-DOWNSTREAM-SEAL-BOUND', true],
  ['R12O-COM-03-EXACT-613-STATION-CONTIGUOUS-CENTERLINE', true],
  ['R12O-COM-04-EXACT-12212-CONNECTED-ROUTE-AIR', true],
  ['R12O-COM-05-EXACT-5505-CENTRAL-CLEARANCE-AIR', true],
  ['R12O-COM-06-EXACT-3053-SUPPORTED-FLOOR-AND-3053-CEILING', true],
  ['R12O-COM-07-EXACT-4856-CELL-FALL-BOUNDARY', true],
  ['R12O-COM-08-EXACT-102-FIXTURE-SIX-STEP-CADENCE', true],
  ['R12O-COM-09-INDEX187-SEAM-CLEAR-AND-CHEYENNE-CAP-CLOSED', true],
  ['R12O-COM-10-EXACT-41652-CELL-DOMAIN-HAZARD-ENTITY-CLEAR', true],
  ['R12O-COM-11-DISJOINT-5988-GUARD-ROLLBACK-CHAIN', true],
  ['R12O-COM-12-INDICES-0-187-OBSTRUCTION-HOLD-PRESERVED', true],
  ['R12O-COM-13-ACTIVE-SECURE-PUBLIC-CHAMBER-TERMINAL-NONCLAIMS-PRESERVED', true],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
const payload = {
  schemaVersion: 1,
  id: 'combined-zones-r12o-b03-complete-enclosed-route-commissioning',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R12O_B03_INDICES_188_800_PASSIVE_INTERNAL_CIRCULATION_COMMISSIONED',
  release: { releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
    commissioningScopeId: 'CZ-R12O-B03-INDICES-188-800-PASSIVE-INTERNAL-INSPECTION-CIRCULATION',
    mvpScope: true, sourceTransactionId: ledger.transactionId,
    sourceCompletedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
    functionalDisposition: 'PASSIVE_INTERNAL_INSPECTION_CIRCULATION_TO_FAIL_CLOSED_HOLD' },
  bindings: { ...bindings, latestPhysicalState: { root: relative(POST_ROOT),
    completeSaveSha256: ledger.postSnapshot.completeSaveSha256, regionSnapshotSha256: postIdentity.sha256 },
    r10hQaPayloadSha256: r10hQa.qaPayloadSha256, r12mCommissioningPayloadSha256: r12m.commissioningPayloadSha256,
    currentPostRollbackPreflights: Object.fromEntries(Object.entries(PREFLIGHTS).map(([key, filename]) => [key, binding(filename)])) },
  geometry: { centerline: { firstIndex: 188, lastIndex: 800, stationCount: centers.length,
    stepCount: steps.length, orderedSha256: sha256(`${centerline.map(cellKey).join('\n')}\n`) },
    route: classManifest(selected.route), upstreamSeam: classManifest(upstream.route),
    routeWithUpstream: classManifest(routeWithUpstream), centralClearance: classManifest(selected.clearance),
    floor: classManifest(selected.floor), ceiling: classManifest(selected.ceiling),
    fallBoundary: classManifest(boundary), cheyenneTerminusCap: classManifest(terminus.route),
    interactionDomain: classManifest(interaction) },
  observedState: { route: { airCellCount: routeStates.length, mismatchCellCount: routeMismatches.length,
    componentCount: routeTopology.componentCount, largestComponentCellCount: routeTopology.largestComponentCellCount,
    withUpstreamComponentCount: routeWithUpstreamTopology.componentCount,
    withUpstreamLargestComponentCellCount: routeWithUpstreamTopology.largestComponentCellCount },
    centralClearance: { airCellCount: clearanceStates.length, mismatchCellCount: clearanceMismatches.length },
    floor: { stateCensus: stateCensus(floorStates), hazardCellCount: floorHazards.length },
    ceiling: { stateCensus: stateCensus(ceilingStates), hazardCellCount: ceilingHazards.length },
    fallBoundary: { stateCensus: stateCensus(boundaryStates), hazardCellCount: boundaryHazards.length },
    fixtures: { cellCount: fixtureIndices.length, centerlineIndices: fixtureIndices,
      longitudinalGapsIncludingDownstreamEnd: fixtureGaps, maximumLongitudinalSpacing: Math.max(...fixtureGaps) },
    seamsAndCap: { upstreamAirCellCount: upstreamStates.length,
      cheyenneTerminusStoneCellCount: capStates.length },
    interactionDomain: { cellCount: interactionStates.length, hazardCellCount: interactionHazards.length,
      blockEntityCount: entities.blockEntities.length, savedEntityCount: entities.savedEntities.length } },
  rollbackReadiness: { order: rollbackEvidence.map(({ key }) => key), packages: rollbackEvidence,
    crossPackageIntersectionCount: rollbackIntersectionCount,
    totalOperationCount: rollbackEvidence.reduce((sum, entry) => sum + entry.operationCount, 0),
    passedGuardCount: rollbackEvidence.reduce((sum, entry) => sum + entry.passedGuardCount, 0),
    failedGuardCount: rollbackEvidence.reduce((sum, entry) => sum + entry.failedGuardCount, 0),
    currentPostRegionSha256: postIdentity.sha256, exactCurrentPostState: true },
  explicitUpstreamHold: { excludedCenterlineRange: { firstIndex: 0, lastIndex: 187, pointCount: earlyPoints.length },
    exactRouteCellCount: early.route.length, exactRouteObstructionCount: earlyRouteObstructions.length,
    exactFloorCellCount: early.floor.length, exactUnsupportedFloorAirCellCount: earlyFloorAir.length,
    commissioned: false },
  boundary: { commissioned: [
    'bounded passive internal inspection/circulation across exact B03 indices 188..800',
    'continuous route air, central clearance, supported floor, ceiling enclosure, fall boundary, and passive fixture cadence',
    'arrival at the retained fail-closed Cheyenne hold point',
  ], explicitlyNotCommissioned: [
    'indices 0..187 or any portal-to-route connection', 'secure or public access classification',
    'access-control, power, signaling, drive, brake, vehicle, or automatic mechanism',
    'Cheyenne chamber excavation, occupancy, or direct terminal link',
    'exterior opening, rescue/egress service, C2, C3, PassageWay, Houston, or Empty Eight future-line stubs',
  ], secureRouteCommissioned: false, publicRouteCommissioned: false,
    accessControlCommissioned: false, activeMechanismCommissioned: false,
    chamberOpenedOrOccupied: false, directTerminalLinkOpened: false },
  checks,
  summary: { passed: true, checkCount: checks.length, passCount: checks.length, failCount: 0,
    stationCount: centers.length, routeAirCellCount: routeStates.length,
    centralClearanceAirCellCount: clearanceStates.length, floorCellCount: floorStates.length,
    ceilingCellCount: ceilingStates.length, fallBoundaryCellCount: boundaryStates.length,
    fixtureCellCount: fixtureIndices.length, rollbackGuardPassCount: EXPECTED.rollbackCount },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false,
    serviceMutationsPerformed: false, readOnlyImmutableAnvilInputs: true },
};
const commissioningPayloadSha256 = sha256(JSON.stringify(payload));
const report = { ...payload, commissioningPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN), `# CZ-R12O B03 complete enclosed-route commissioning\n\n`
  + `**Status:** PASS — bounded passive internal inspection/circulation commissioned  \n`
  + `**Commissioning payload:** \`${commissioningPayloadSha256}\`  \n`
  + `**Accepted physical state:** \`${ledger.completedReleaseIdentitySha256}\`\n\n`
  + `R12O accepts only the enclosed B03 run from index 188 through index 800. Its ${centers.length} stations form one `
  + `${selected.route.length.toLocaleString('en-US')}-cell air-route component with ${selected.clearance.length.toLocaleString('en-US')} exact central-clearance cells, `
  + `${selected.floor.length.toLocaleString('en-US')} supported floor cells, ${selected.ceiling.length.toLocaleString('en-US')} ceiling cells, `
  + `${boundary.length.toLocaleString('en-US')} fall-boundary cells, and ${fixtureIndices.length} passive fixtures at a six-step maximum cadence.\n\n`
  + `The index-187 seam is exact air, the Cheyenne cap remains exact stone, and the ${interaction.length.toLocaleString('en-US')}-cell domain is hazard/entity clear. `
  + `The exact reverse chain passes ${EXPECTED.rollbackCount.toLocaleString('en-US')}/${EXPECTED.rollbackCount.toLocaleString('en-US')} guards.\n\n`
  + `Indices 0..187 remain uncommissioned behind 63 route obstructions and 14 unsupported floor-air cells. Secure/public access, controls, chamber, terminal, exterior, rescue/egress, and every active mechanism remain closed. The verifier made no live call or mutation.\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, commissioningPayloadSha256,
  stations: report.summary.stationCount, routeAir: report.summary.routeAirCellCount,
  fixtures: report.summary.fixtureCellCount, rollbackGuards: report.summary.rollbackGuardPassCount,
  liveCallsPerformed: false }, null, 2)}\n`);
