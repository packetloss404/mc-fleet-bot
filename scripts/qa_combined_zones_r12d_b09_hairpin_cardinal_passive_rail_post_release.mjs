#!/usr/bin/env node
/** Read-only independent post-release QA for CZ-R12D passive B09 rail. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  buildB09MinimumReservation,
  cellKey,
  cellsIn,
  dilateCells,
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
const LEDGER_PATH = value(
  '--ledger',
  'data/world-review/combined-zones-r12d-live-20260822T005835Z/evidence-ledger.json',
);
const MANIFEST_PATH =
  'data/buildops/combined-zones-r12d-b09-isolated-hairpin-cardinal-passive-rail.release-manifest.json';
const PACKAGE_KEY = 'b09-isolated-hairpin-cardinal-passive-rail';
const INPUTS = Object.freeze({
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  r07dManifest: 'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
  r07eManifest: 'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
  r07iManifest: 'data/buildops/combined-zones-r07i-b09-maximal-curve-summit-return.release-manifest.json',
  r12cManifest:
    'data/buildops/combined-zones-r12c-b09-isolated-lower-straight-passive-rail-design-freeze.release-manifest.json',
  r12cQa: 'data/world-review/combined-zones-r12c-live-20260822T004255Z/r12c-post-release-qa.json',
});
const EXPECTED = Object.freeze({
  ledger: '4aae15af18c8d895832808ad6d3062349cc33742b05d386cef0d2a5b9a158b12',
  manifest: 'bba29822282eb5de5276f86f5a11f01a4a8018b288d73a3955f36f089eff0af1',
  manifestIdentity: '4d360dc80d659dc26bd3359f15dcd234d05fdb2a759dab9e1b10021bc41f3cb0',
  forward: '619b38a4ab5e1c0a52ab117b3039f3850f0606b5c3faa3767a1437e35cea884f',
  rollback: 'e03cacaa8593b67b59d7b51579560dfc9b69ac33efc961d184222adb909828f9',
  sourceComplete: 'd8cb93ae18190e7db3ac7923c75d8efcbacacec851a71826cb33a8d946c1028f',
  sourceRegion: 'd6cff082cf612fb0a2fa6fa6e92fdafdd1153b5918bb561c7127efd6a43ab834',
  postComplete: '87966eef0a9e3ca695820f521ca2311c01ad7d6b199ee6ef57c6201cc97ee804',
  postRegion: '28ccb2dd338522e98e2a734d91670c3eb5f52a1adfc695584ba3286f6d8a90f6',
  completedRelease: '97ff44527f857241316f425e563f639bea1c96b52b9b839f1e77089a04b225b2',
  journal: 'b181ce419fbd6fb88eac3fe020e1f03e7fc6867d65ff715bfd7995737329b4eb',
  r12cManifest: 'de097788b3f93bfb3ac0364e17fc07424801a8eb59cdd769758da9c9831e4a91',
  r12cQa: '6d78f3bc4e4b11c96f4636ee8c9798e3f04b4ba0073f378f39a52f406e7b1c52',
  r12cQaPayload: '145dc2e1a30081aa4be1e6fd7204fe6f09b5bbe6828e9dea77f3791fe6d47deb',
  r12cCompleted: '516755fa28b16d5d7d5b1baec7dd63e33be73276ed42d69b8f58bb75cba74480',
  target: 'd34c55e58763b4e6666edd4a973769e5e468ee185f7ef044334670ffcff41754',
  support: '916c10a9828a310625dea3b64ead77bfbd3d9b15d0b41eae46dbe2c069d75e2e',
  headroom: '7dbc06ade50e46a4f131f4e7b8b90c49a6cca3b7c34e0d6e9e982f4eb7e7b295',
  isolationGaps: '021919255d63bd29c496a22493a9719131890f7c10b793c28ebdb7f1fc940984',
  halo: 'aca9feb244b790c02adcd958bfce9a9e2d1b646602ad73c49a6965794aa04fdc',
  accommodation: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  r12cRail: 'd0ce28ec1df09ee872d9885bd65d858e8a39c1d4c377ca532bfafa481bd91b0f',
  sourceAccommodationState:
    'f685ace53187d0c8614e6f3ec7df2ffb56fd130c32d720d48cc7b96d97ce587f',
  postAccommodationState:
    '84c25bde1ce5d62bb2647f4d8cf087b4c6caa44ab02d43efebf1dc2f72765bc4',
  lowerCap: 'a422d177fb7f1571b8a6243fcbf014fda17a910e60e7c03f7c21051f697a3e96',
  summitCap: 'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
  curveAperture: '9991feda6e953dd4e66585d7e23a61723c3319cb59c22782196fab028f2c08bb',
});
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const LIGHT = 'minecraft:sea_lantern';
const RAIL_NS = 'minecraft:rail[shape=north_south,waterlogged=false]';
const RAIL_EW = 'minecraft:rail[shape=east_west,waterlogged=false]';
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

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12D passive-rail post-QA rejected: ${message}`);
};
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
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

function parseOperations(filename) {
  const operations = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields.length === 9, `${filename} contains malformed REPL`);
    const point = fields.slice(1, 4).map(Number);
    invariant(fields.slice(4, 7).map(Number).join(',') === point.join(','),
      `${filename} contains a non-cell guard`);
    operations.push({
      cell: { x: point[0], y: point[1], z: point[2] },
      fromState: fields[7],
      toState: fields[8],
    });
  }
  return operations;
}

function operationBodySha256(filename) {
  const body = `${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
  return sha256(body);
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
invariant(fileBinding(LEDGER_PATH).sha256 === EXPECTED.ledger, 'ledger file identity drifted');
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.transactionId === manifest.transactionId
  && ledger.manifest.sha256 === EXPECTED.manifest
  && fileBinding(MANIFEST_PATH).sha256 === EXPECTED.manifest
  && manifest.manifestIdentity === EXPECTED.manifestIdentity,
'ledger or manifest is not the exact completed R12D transaction');
invariant(ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceComplete
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postComplete
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedRelease,
'source, post, or completed release identity drifted');
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(sourceIdentity.sha256 === EXPECTED.sourceRegion
  && postIdentity.sha256 === EXPECTED.postRegion,
'source or post region identity drifted');
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceComplete
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postComplete,
'source or post complete-save intake is not PASS');
for (const binding of ledger.evidenceBindings) {
  const actual = fileBinding(binding.path);
  invariant(actual.sha256 === binding.sha256 && actual.bytes === binding.bytes,
    `evidence binding drifted: ${binding.path}`);
}
const r12cManifest = readJson(INPUTS.r12cManifest);
const r12cQa = readJson(INPUTS.r12cQa);
invariant(fileBinding(INPUTS.r12cManifest).sha256 === EXPECTED.r12cManifest
  && fileBinding(INPUTS.r12cQa).sha256 === EXPECTED.r12cQa
  && r12cQa.qaPayloadSha256 === EXPECTED.r12cQaPayload
  && r12cQa.summary.passed === true
  && r12cQa.releaseIdentity.completedReleaseIdentitySha256 === EXPECTED.r12cCompleted,
'accepted R12C predecessor evidence drifted');

const pkg = ledger.packages.find(({ key }) => key === PACKAGE_KEY);
invariant(pkg
  && pkg.forward.sha256 === EXPECTED.forward
  && pkg.rollback.sha256 === EXPECTED.rollback
  && fileBinding(pkg.forward.path).sha256 === EXPECTED.forward
  && fileBinding(pkg.rollback.path).sha256 === EXPECTED.rollback,
'operation-file binding drifted');
const forward = parseOperations(pkg.forward.path);
const rollback = parseOperations(pkg.rollback.path);
const targets = forward.map(({ cell }) => cell);
const targetKeys = new Set(targets.map(cellKey));
invariant(forward.length === 19 && hashCells(targets) === EXPECTED.target
  && forward.every(({ cell, fromState, toState }, index) => (
    cell.x === 2288 && cell.y === 130 && cell.z === -767 + index
      && fromState === AIR && toState === RAIL_NS
  )), 'forward target set, order, or transition drifted');
invariant(rollback.length === 19 && rollback.every((operation, index) => {
  const source = forward[forward.length - 1 - index];
  return cellKey(operation.cell) === cellKey(source.cell)
    && operation.fromState === source.toState
    && operation.toState === source.fromState;
}), 'rollback is not the exact reverse-order inverse');
invariant(operationBodySha256(pkg.forward.path) === manifest.operations[PACKAGE_KEY].forwardSha256
  && operationBodySha256(pkg.rollback.path) === manifest.operations[PACKAGE_KEY].rollbackSha256,
'operation body identity drifted');

const support = targets.map(({ x, y, z }) => ({ x, y: y - 1, z }));
const headroom = targets.map(({ x, y, z }) => ({ x, y: y + 1, z }));
const isolationGaps = [{ x: 2288, y: 130, z: -748 }, { x: 2288, y: 130, z: -768 }];
const halo = dilateCells(targets, 1);
const connectors = readJson(INPUTS.connectors);
const d05 = readJson(INPUTS.d05);
const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
const accommodation = buildB09MinimumReservation(
  model.formula,
  connectors.funicularFaceComparison.designEndpoints,
);
const r12cRail = cellsIn(r12cManifest.target.operatedUnion.bounds);
const r12cKeys = new Set(r12cRail.map(cellKey));
const r07d = readJson(INPUTS.r07dManifest);
const r07e = readJson(INPUTS.r07eManifest);
const r07i = readJson(INPUTS.r07iManifest);
const lowerCap = cellsIn(r07d.scope.geometry.westIsolationCap.bounds);
const summitCap = cellsIn(r07e.scope.geometry.summitInterfaceCap.bounds);
const curveAperture = cellsIn(r07i.scope.geometry.ownedR07hFourCellTurnAperture.bounds);
invariant(support.length === 19 && hashCells(support) === EXPECTED.support
  && headroom.length === 19 && hashCells(headroom) === EXPECTED.headroom
  && isolationGaps.length === 2 && hashCells(isolationGaps) === EXPECTED.isolationGaps
  && halo.length === 189 && hashCells(halo) === EXPECTED.halo
  && accommodation.length === 7_800 && hashCells(accommodation) === EXPECTED.accommodation
  && r12cRail.length === 231 && hashCells(r12cRail) === EXPECTED.r12cRail
  && lowerCap.length === 12 && hashCells(lowerCap) === EXPECTED.lowerCap
  && summitCap.length === 12 && hashCells(summitCap) === EXPECTED.summitCap
  && curveAperture.length === 4 && hashCells(curveAperture) === EXPECTED.curveAperture,
'support, gap, halo, accommodation, predecessor, cap, or aperture geometry drifted');

const sourceReader = new AnvilReader(absolute(ledger.sourceSnapshot.regions));
const postReader = new AnvilReader(absolute(ledger.postSnapshot.regions));
const sourceEntityReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'entities')));
const postEntityReader = new AnvilReader(absolute(path.join(ledger.postSnapshot.root, 'entities')));
async function records(reader, cells) {
  const output = [];
  for (const cell of uniqueCells(cells)) {
    output.push({
      cell,
      state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return output;
}
const sourceTargets = await records(sourceReader, targets);
const postTargets = await records(postReader, targets);
const sourceSupport = await records(sourceReader, support);
const postSupport = await records(postReader, support);
const sourceHeadroom = await records(sourceReader, headroom);
const postHeadroom = await records(postReader, headroom);
const sourceGaps = await records(sourceReader, isolationGaps);
const postGaps = await records(postReader, isolationGaps);
const sourceR12c = await records(sourceReader, r12cRail);
const postR12c = await records(postReader, r12cRail);
const sourceCaps = await records(sourceReader, [...lowerCap, ...summitCap]);
const postCaps = await records(postReader, [...lowerCap, ...summitCap]);
const sourceAperture = await records(sourceReader, curveAperture);
const postAperture = await records(postReader, curveAperture);
invariant(sourceTargets.every(({ state }) => state === AIR)
  && postTargets.every(({ state }) => state === RAIL_NS),
'one or more exact rail transitions or final property states failed');
invariant([...sourceSupport, ...postSupport].every(({ state }) => state === DIORITE)
  && [...sourceHeadroom, ...postHeadroom, ...sourceGaps, ...postGaps,
    ...sourceAperture].every(({ state }) => state === AIR)
  && postAperture.every(({ cell, state }) => (
    targetKeys.has(cellKey(cell)) ? state === RAIL_NS : state === AIR
  ))
  && [...sourceR12c, ...postR12c].every(({ state }) => state === RAIL_EW)
  && [...sourceCaps, ...postCaps].every(({ state }) => state === DIORITE),
'support, headroom, turn gap, R12C rail, cap, or aperture was not preserved');

const postTargetByKey = new Map(postTargets.map((record) => [cellKey(record.cell), record.state]));
const neighbourCounts = targets.map((cell) => (
  [[0, 0, -1], [0, 0, 1]].filter(([dx, dy, dz]) => (
    postTargetByKey.get(`${cell.x + dx},${cell.y + dy},${cell.z + dz}`) === RAIL_NS
  )).length
));
invariant(neighbourCounts.filter((count) => count === 1).length === 2
  && neighbourCounts.filter((count) => count === 2).length === 17
  && neighbourCounts.every((count) => count === 1 || count === 2),
'final rail topology is disconnected, branched, or shape-ambiguous');
const cardinalR12cAdjacencyCount = targets.filter((cell) => r12cRail.some((prior) => (
  Math.abs(prior.x - cell.x) + Math.abs(prior.y - cell.y) + Math.abs(prior.z - cell.z) === 1
))).length;
invariant(cardinalR12cAdjacencyCount === 0,
'R12D became cardinally adjacent to R12C despite its retained turn gap');

const sourceHalo = await records(sourceReader, halo);
const postHalo = await records(postReader, halo);
function differences(sourceRecords, postRecords, ownedKeys) {
  const postByKey = new Map(postRecords.map((record) => [cellKey(record.cell), record.state]));
  const changed = [];
  const undeclared = [];
  for (const source of sourceRecords) {
    const postState = postByKey.get(cellKey(source.cell));
    if (source.state === postState) continue;
    const difference = { cell: source.cell, sourceState: source.state, postState };
    changed.push(difference);
    if (!ownedKeys.has(cellKey(source.cell))) undeclared.push(difference);
  }
  return { changed, undeclared };
}
const haloDiff = differences(sourceHalo, postHalo, targetKeys);
invariant(haloDiff.changed.length === 19 && haloDiff.undeclared.length === 0,
'interaction halo contains lifecycle or undeclared drift');

const sourceAccommodation = await records(sourceReader, accommodation);
const postAccommodation = await records(postReader, accommodation);
const accommodationDiff = differences(sourceAccommodation, postAccommodation, targetKeys);
invariant(stateSetHash(sourceAccommodation) === EXPECTED.sourceAccommodationState
  && stateSetHash(postAccommodation) === EXPECTED.postAccommodationState
  && accommodationDiff.changed.length === 19 && accommodationDiff.undeclared.length === 0,
'complete B09 accommodation contains undeclared source-to-post drift');
const sourceB09Census = stateCensus(sourceAccommodation);
const postB09Census = stateCensus(postAccommodation);
invariant(sourceB09Census[AIR] === 924 && sourceB09Census[DIORITE] === 6_606
  && sourceB09Census[LIGHT] === 39 && sourceB09Census[RAIL_EW] === 231
  && postB09Census[AIR] === 905 && postB09Census[DIORITE] === 6_606
  && postB09Census[LIGHT] === 39 && postB09Census[RAIL_EW] === 231
  && postB09Census[RAIL_NS] === 19,
'source or post B09 material census drifted');
invariant(r12cQa.preservation.postB09StateSetSha256 === stateSetHash(sourceAccommodation),
'fresh R12D source does not preserve the accepted R12C B09 post state');
const offTargetRailStates = postAccommodation.filter(({ cell, state }) => (
  stateBase(state) === 'minecraft:rail'
  && !((targetKeys.has(cellKey(cell)) && state === RAIL_NS)
    || (r12cKeys.has(cellKey(cell)) && state === RAIL_EW))
));
invariant(offTargetRailStates.length === 0,
'B09 contains an off-target rail or an unexpected rail property state');

const postUnexpectedFluids = postHalo.filter(({ state }) => isFluid(state));
const postUnexpectedGravity = postHalo.filter(({ state }) => isGravity(state));
const postUnexpectedContainers = postHalo.filter(
  ({ state }) => CONTAINER_OR_CONTROL.has(stateBase(state)),
);
const postUnexpectedMechanisms = postHalo.filter(({ cell, state }) => (
  MECHANISM_BLOCKS.has(stateBase(state))
    && !((targetKeys.has(cellKey(cell)) && state === RAIL_NS)
      || (r12cKeys.has(cellKey(cell)) && state === RAIL_EW))
));
const haloKeys = new Set(halo.map(cellKey));
async function entityIntersections(blockReader, entityReader) {
  const blockEntities = [];
  const savedEntities = [];
  for (const key of [...new Set(halo.map(({ x, z }) => (
    `${Math.floor(x / 16)},${Math.floor(z / 16)}`
  )))]) {
    const [chunkX, chunkZ] = key.split(',').map(Number);
    const chunk = await blockReader.chunk(chunkX, chunkZ);
    for (const blockEntity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      if (haloKeys.has(`${blockEntity.x},${blockEntity.y},${blockEntity.z}`)) {
        blockEntities.push(blockEntity);
      }
    }
    const entityChunk = await entityReader.chunk(chunkX, chunkZ);
    for (const entity of entityChunk?.Entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const cell = {
        x: Math.floor(Number(entity.Pos[0])),
        y: Math.floor(Number(entity.Pos[1])),
        z: Math.floor(Number(entity.Pos[2])),
      };
      if (haloKeys.has(cellKey(cell))) savedEntities.push(entity);
    }
  }
  return { blockEntities, savedEntities };
}
const sourceEntities = await entityIntersections(sourceReader, sourceEntityReader);
const postEntities = await entityIntersections(postReader, postEntityReader);
invariant(postUnexpectedFluids.length === 0 && postUnexpectedGravity.length === 0
  && postUnexpectedContainers.length === 0 && postUnexpectedMechanisms.length === 0
  && sourceEntities.blockEntities.length === 0 && sourceEntities.savedEntities.length === 0
  && postEntities.blockEntities.length === 0 && postEntities.savedEntities.length === 0,
'post halo contains an undeclared hazard, mechanism, block entity, or saved entity');

const evidenceDirectory = path.dirname(LEDGER_PATH);
const executionPath = path.join(evidenceDirectory, `${PACKAGE_KEY}.forward-execution.json`);
const execution = readJson(executionPath);
const journalPath = `${executionPath}.stream-journal.jsonl`;
const journalBinding = fileBinding(journalPath);
const journal = fs.readFileSync(absolute(journalPath), 'utf8').trim().split(/\r?\n/)
  .map((line) => JSON.parse(line));
const rollbackPreflight = readJson(path.join(
  evidenceDirectory,
  `${PACKAGE_KEY}.rollback-poststate-preflight.json`,
));
invariant(execution.status === 'complete' && execution.dryRun === false
  && execution.strictNoop === true && execution.operationRole === 'forward'
  && execution.successfulGroups === 19 && execution.failedGroups === 0
  && execution.noopCommands === 0 && execution.unknownReplyCommands === 0
  && execution.worldEditLeftoverCount === 0
  && execution.forceLoadAudit?.allTemporaryReleased === true
  && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true,
'strict execution evidence is incomplete or unsafe');
invariant(journalBinding.sha256 === EXPECTED.journal
  && execution.streamJournalSha256 === EXPECTED.journal
  && journal.length === 44
  && journal.every((entry, index) => entry.sequence === index + 1)
  && journal.at(-1).status === 'complete'
  && journal.at(-1).batch.status === 'completed-cleaned'
  && journal.at(-1).batch.completedGroupCount === 19,
'stream journal is incomplete or identity-drifted');
invariant(rollbackPreflight.status === 'PASS'
  && rollbackPreflight.operationCount === 19
  && rollbackPreflight.passed === 19 && rollbackPreflight.failed === 0
  && rollbackPreflight.regionsSnapshot.sha256 === EXPECTED.postRegion,
'rollback post-state preflight is not 19/19 PASS');

const requiredStages = [
  'standing-authorization', 'exact-release-manifest-qa',
  'fresh-source-complete-save', 'source-complete-save-intake',
  'source-snapshot-identity', `forward-source-preflight:${PACKAGE_KEY}`,
  `strict-forward-parser-check:${PACKAGE_KEY}`,
  `strict-rollback-parser-check:${PACKAGE_KEY}`,
  `projected-rollback-preflight:${PACKAGE_KEY}`, 'block-entity-clearance',
  'live-entity-clearance', `same-moment-package-entity-clearance:${PACKAGE_KEY}`,
  `strict-forward-execution:${PACKAGE_KEY}`, 'fresh-post-complete-save',
  'post-complete-save-intake', 'post-snapshot-identity',
  `rollback-poststate-preflight:${PACKAGE_KEY}`,
];
invariant(ledger.stages.length === 17
  && new Set(ledger.stages.map(({ stage }) => stage)).size === 17
  && requiredStages.every((stage) => ledger.stages.some((entry) => (
    entry.stage === stage && entry.status === 'PASS'
  ))), 'wrapper is not an exact 17/17 PASS');
const manifestQa = readJson(path.join(evidenceDirectory, 'exact-release-manifest-qa.json'));
const blockEntity = readJson(path.join(evidenceDirectory, 'block-entity-clearance.json'));
const liveEntity = readJson(path.join(evidenceDirectory, 'live-entity-clearance.json'));
const sameMomentEntity = readJson(path.join(
  evidenceDirectory,
  `${PACKAGE_KEY}.same-moment-entity-clearance.json`,
));
invariant(manifestQa.status === 'PASS' && manifestQa.totals.uniqueTargetCells === 19
  && blockEntity.status === 'PASS' && blockEntity.blockingBlockEntityCount === 0
  && liveEntity.status === 'PASS' && liveEntity.totals.blockingEntityHits === 0
  && sameMomentEntity.status === 'PASS'
  && sameMomentEntity.totals.blockingEntityHits === 0,
'manifest, block-entity, or live-entity evidence is not PASS');

const checks = [
  'ledger-manifest-and-completed-identity',
  'source-and-post-complete-save-intakes',
  'all-seventeen-evidence-bindings',
  'accepted-r12c-source-state',
  'exact-19-north-south-rail-transitions',
  'single-19-cell-north-south-component',
  'exact-19-solid-supports',
  'exact-19-air-headroom-cells',
  'two-air-turn-gaps',
  'r12c-231-rail-preservation-and-zero-cardinal-adjacency',
  'external-caps-and-curve-aperture',
  'scope-halo-19-declared-zero-lifecycle-zero-undeclared',
  'b09-accommodation-19-declared-zero-undeclared',
  'b09-exact-rail-shape-and-off-target-census',
  'post-hazard-and-entity-clearance',
  'strict-19-group-execution',
  'complete-44-entry-journal',
  'rollback-19-of-19',
  'wrapper-17-of-17',
  'no-operational-overclaim-or-qa-mutation',
].map((id) => ({ id, status: 'PASS' }));
const reportWithoutIdentity = {
  schemaVersion: 1,
  qaId: 'CZ-R12D-P1-B09-ISOLATED-HAIRPIN-CARDINAL-PASSIVE-RAIL-POST-QA',
  status: 'PASS_EXACT_HAIRPIN_CARDINAL_RAIL_TOPOLOGY_ISOLATION_AND_ROLLBACK_PRESERVED',
  generatedAtUtc: value('--generated-at', '2026-08-22T01:05:00Z'),
  ledger: fileBinding(LEDGER_PATH),
  manifest: fileBinding(MANIFEST_PATH),
  acceptedPredecessor: {
    r12cManifest: fileBinding(INPUTS.r12cManifest),
    r12cPostQa: fileBinding(INPUTS.r12cQa),
    r12cCompletedReleaseIdentitySha256: EXPECTED.r12cCompleted,
    sourceB09StateMatchesR12cPost: true,
  },
  sourceSnapshot: {
    root: ledger.sourceSnapshot.root,
    completeSaveSha256: ledger.sourceSnapshot.completeSaveSha256,
    regionSha256: sourceIdentity.sha256,
  },
  postSnapshot: {
    root: ledger.postSnapshot.root,
    completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
    regionSha256: postIdentity.sha256,
  },
  releaseIdentity: {
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  exactPostState: {
    targetCellCount: targets.length,
    targetCoordinateSetSha256: hashCells(targets),
    desiredState: RAIL_NS,
    exactRailStatePassCount: postTargets.filter(({ state }) => state === RAIL_NS).length,
    exactRailStateFailureCount: postTargets.filter(({ state }) => state !== RAIL_NS).length,
    topology: {
      componentCount: 1,
      largestComponentCellCount: targets.length,
      endpointCount: neighbourCounts.filter((count) => count === 1).length,
      interiorCellCount: neighbourCounts.filter((count) => count === 2).length,
      branchCellCount: neighbourCounts.filter((count) => count > 2).length,
      shapeUpdateMismatchCount: postTargets.filter(({ state }) => state !== RAIL_NS).length,
      cardinalAdjacencyToR12cCount: cardinalR12cAdjacencyCount,
    },
    support: {
      cellCount: support.length,
      coordinateSetSha256: hashCells(support),
      sourceMatchCount: sourceSupport.filter(({ state }) => state === DIORITE).length,
      postMatchCount: postSupport.filter(({ state }) => state === DIORITE).length,
    },
    headroom: {
      cellCount: headroom.length,
      coordinateSetSha256: hashCells(headroom),
      sourceAirCount: sourceHeadroom.filter(({ state }) => state === AIR).length,
      postAirCount: postHeadroom.filter(({ state }) => state === AIR).length,
    },
    isolationTurnGaps: {
      cellCount: isolationGaps.length,
      coordinateSetSha256: hashCells(isolationGaps),
      sourceAirCount: sourceGaps.filter(({ state }) => state === AIR).length,
      postAirCount: postGaps.filter(({ state }) => state === AIR).length,
    },
  },
  preservation: {
    r12cRailCellCount: r12cRail.length,
    r12cRailSourceMatchCount: sourceR12c.filter(({ state }) => state === RAIL_EW).length,
    r12cRailPostMatchCount: postR12c.filter(({ state }) => state === RAIL_EW).length,
    lowerB08CapCellCount: lowerCap.length,
    summitZ11CapCellCount: summitCap.length,
    capSourceMatchCount: sourceCaps.filter(({ state }) => state === DIORITE).length,
    capPostMatchCount: postCaps.filter(({ state }) => state === DIORITE).length,
    curveApertureCellCount: curveAperture.length,
    curveApertureSourceAirCount: sourceAperture.filter(({ state }) => state === AIR).length,
    curveAperturePostAirCount: postAperture.filter(({ state }) => state === AIR).length,
    curveApertureOwnedRailCount: postAperture.filter(({ state }) => state === RAIL_NS).length,
    interactionHaloCellCount: halo.length,
    interactionHaloCoordinateSetSha256: hashCells(halo),
    sourceHaloStateCensus: stateCensus(sourceHalo),
    postHaloStateCensus: stateCensus(postHalo),
    haloDeclaredDifferenceCount: haloDiff.changed.length,
    haloLifecycleDifferenceCount: 0,
    haloUndeclaredDifferenceCount: haloDiff.undeclared.length,
    b09AccommodationCellCount: accommodation.length,
    sourceB09StateSetSha256: stateSetHash(sourceAccommodation),
    postB09StateSetSha256: stateSetHash(postAccommodation),
    sourceB09StateCensus: sourceB09Census,
    postB09StateCensus: postB09Census,
    b09DeclaredDifferenceCount: accommodationDiff.changed.length,
    b09LifecycleDifferenceCount: 0,
    b09UndeclaredDifferenceCount: accommodationDiff.undeclared.length,
    preservedNonTargetB09CellCount: accommodation.length - accommodationDiff.changed.length,
    totalExpectedRailCellCount: 250,
    offTargetOrShapeMismatchRailCount: offTargetRailStates.length,
  },
  hazardsAndEntities: {
    postFluidCount: postUnexpectedFluids.length,
    postGravityCount: postUnexpectedGravity.length,
    postContainerOrControlCount: postUnexpectedContainers.length,
    postUndeclaredMechanismCount: postUnexpectedMechanisms.length,
    sourceBlockEntityIntersectionCount: sourceEntities.blockEntities.length,
    postBlockEntityIntersectionCount: postEntities.blockEntities.length,
    sourceSavedEntityIntersectionCount: sourceEntities.savedEntities.length,
    postSavedEntityIntersectionCount: postEntities.savedEntities.length,
    wrapperBlockEntityClearance: blockEntity.status,
    wrapperLiveEntityClearance: liveEntity.status,
    wrapperSameMomentEntityClearance: sameMomentEntity.status,
  },
  execution: {
    strictForwardGroupPassCount: execution.successfulGroups,
    failedGroupCount: execution.failedGroups,
    noOpCount: execution.noopCommands,
    unknownReplyCount: execution.unknownReplyCommands,
    worldEditLeftoverCount: execution.worldEditLeftoverCount,
    streamJournalEntryCount: journal.length,
    streamJournalSha256: journalBinding.sha256,
    streamJournalFinalStatus: journal.at(-1).status,
    rollbackPoststatePassCount: rollbackPreflight.passed,
    rollbackPoststateFailCount: rollbackPreflight.failed,
    exactReverseOrderInverse: true,
    allTemporaryChunksReleased: execution.forceLoadAudit.allTemporaryReleased,
    finalForceLoadSetRestored: execution.forceLoadAudit.finalSetMatchesPreExistingSet,
  },
  evidence: {
    requiredStageCount: requiredStages.length,
    requiredStagePassCount: requiredStages.length,
    evidenceBindingCount: ledger.evidenceBindings.length,
    evidenceBindingFailureCount: 0,
    manifestQa: manifestQa.status,
    blockEntityClearance: blockEntity.status,
    liveEntityClearance: liveEntity.status,
    sameMomentEntityClearance: sameMomentEntity.status,
  },
  disposition: {
    acceptedScope: '19-cell isolated unpowered north-south B09 hairpin cardinal rail leg only',
    passiveRailMaterialAsBuilt: true,
    bothActualTurnCellsRemainAir: true,
    r12cCardinalConnectionCreated: false,
    curveOrSlopeRailInstalled: false,
    platformBarrierDesignedOrInstalled: false,
    poweredRailDriveBrakeVehicleControlsPowerDrainageInstalled: false,
    funicularCommissioned: false,
    passengerOrRescueRouteCommissioned: false,
    liveCallsPerformedByQa: false,
    worldMutationsPerformedByQa: false,
  },
  checks,
  summary: {
    checkCount: checks.length,
    passCount: checks.length,
    failCount: 0,
    passed: true,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
const out = value('--out', path.join(evidenceDirectory, 'r12d-post-release-qa.json'));
const markdownOut = value('--markdown', path.join(evidenceDirectory, 'r12d-post-release-qa.md'));
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(markdownOut), `# CZ-R12D B09 hairpin cardinal rail post-release QA\n\n`
  + `**Status:** PASS  \n`
  + `**QA payload:** \`${qaPayloadSha256}\`  \n`
  + `**Completed release:** \`${ledger.completedReleaseIdentitySha256}\`\n\n`
  + `All 19 target cells are exact unpowered north-south rails. They form one `
  + `19-cell line with two endpoints, 17 two-neighbour interior cells, zero `
  + `branches, and zero shape-update mismatches.\n\n`
  + `All 19 polished-diorite supports and 19 air headroom cells are unchanged. `
  + `Both actual turn cells remain air. All 231 prior R12C east-west rails are `
  + `unchanged and have zero cardinal adjacency to R12D.\n\n`
  + `The complete 189-cell interaction halo and 7,800-cell B09 accommodation `
  + `each contain exactly 19 declared air-to-rail differences, zero lifecycle `
  + `differences, and zero undeclared drift. The post has exactly 231 accepted `
  + `east-west rails plus 19 R12D north-south rails and no off-target or `
  + `property-mismatched rail.\n\n`
  + `All 17 wrapper stages and evidence bindings pass. The 44-entry journal `
  + `ends complete and cleaned after 19 successful groups; rollback preflight `
  + `passes 19/19.\n\n`
  + `Acceptance is limited to isolated passive rail material. Both curves, all `
  + `slope rail, barriers, powered rail, drive, brake, vehicle, controls, power, `
  + `drainage, passenger/rescue use, and funicular operation remain absent. `
  + `This verifier made no live call and no world mutation.\n`);
console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  output: relative(out),
  markdown: relative(markdownOut),
  railStatePassCount: report.exactPostState.exactRailStatePassCount,
  railShapeMismatchCount: report.exactPostState.topology.shapeUpdateMismatchCount,
  b09UndeclaredDifferenceCount: report.preservation.b09UndeclaredDifferenceCount,
  rollbackPassCount: report.execution.rollbackPoststatePassCount,
  stagePassCount: report.evidence.requiredStagePassCount,
  liveCallsPerformed: false,
}, null, 2));
