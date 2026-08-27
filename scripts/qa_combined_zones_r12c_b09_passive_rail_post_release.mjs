#!/usr/bin/env node
/** Read-only independent post-release QA for CZ-R12C passive B09 rail. */

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
  'data/world-review/combined-zones-r12c-live-20260822T004255Z/evidence-ledger.json',
);
const MANIFEST_PATH =
  'data/buildops/combined-zones-r12c-b09-isolated-lower-straight-passive-rail-design-freeze.release-manifest.json';
const PACKAGE_KEY = 'b09-isolated-lower-straight-passive-rail';
const INPUTS = Object.freeze({
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  r07dManifest: 'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
  r07eManifest: 'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
  r07iManifest: 'data/buildops/combined-zones-r07i-b09-maximal-curve-summit-return.release-manifest.json',
  r10fQa: 'data/world-review/combined-zones-r10f-live-20260822T003320Z/r10f-post-release-qa.json',
});
const EXPECTED = Object.freeze({
  ledger: 'ed2e62dea837a8e6d2290752775f7f49444fe338f4aac6ca1bdec8b19f190db0',
  manifest: 'de097788b3f93bfb3ac0364e17fc07424801a8eb59cdd769758da9c9831e4a91',
  manifestIdentity: 'b786c59a4d68361482b764bff34244aa73637ec859a5647f863636c49e256036',
  forward: 'b8ea1333e261b094e750397077326bd2e9f35fd7824fc38414566f987f7759db',
  rollback: 'da22854d69400e11a0c9a2c9b6066b170e46f13b06fcd2a3a48fe395b09b963c',
  sourceComplete: '36c79003a53923039945800835c7806fef61025f5f3daac9fdcab87e6ecad26a',
  sourceRegion: '64e2ac0fc094820fdbbebf003ee0fc6eb2b26d6346b0e4aab23b5b75a0f45d36',
  postComplete: '1c51b53415dc35060a4aefacaac8e7e8b3ca588a457c3c4ce28329e06f6fb02d',
  postRegion: 'd899d084dd13f27c10ff8cdd40ad509967a3ade5c927cd22bbfdcab44a9ab80d',
  completedRelease: '516755fa28b16d5d7d5b1baec7dd63e33be73276ed42d69b8f58bb75cba74480',
  journal: '04c14c52776dc97a4812e4753c888f77df2d4b5ca064d4aaba1d93adf8b75042',
  r10fQa: 'f5e5e94f3c712404985ebbead8359566880fed3b8807b8d454fa073fb04dd839',
  r10fQaPayload: 'c8e5a92f8f4820eca27ac3343d2e2b53c6c3a8e005f150075a1f5908c2774b51',
  r10fCompleted: '480473cb39bb923fa85b28d1141e6d5344fe3908fb71d9958daabf736c46e17b',
  target: 'd0ce28ec1df09ee872d9885bd65d858e8a39c1d4c377ca532bfafa481bd91b0f',
  support: 'ca3a506b07876b43ed8151d5101552395e274c8f9f1d951035cdd3fcf2cf21c2',
  headroom: 'edde9c1e8d6355b0f4aa56331d74299867d6211c34d06b6301c54667e04814d8',
  isolationGaps: '747357ace842f6b4a3dc16cc5b838294d042204a17416a6306e50097365958e6',
  halo: '834616ef9b187577d267ac796e5cbbe9ed4ec7222121db61a174a25fc1905618',
  accommodation: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  sourceAccommodationState:
    '41cc05ffb0474ca4d5c9f53d48ebc3c1a8629d1d8731752c57b7671932fb8e8b',
  postAccommodationState:
    'f685ace53187d0c8614e6f3ec7df2ffb56fd130c32d720d48cc7b96d97ce587f',
  lowerCap: 'a422d177fb7f1571b8a6243fcbf014fda17a910e60e7c03f7c21051f697a3e96',
  summitCap: 'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
  curveAperture: '9991feda6e953dd4e66585d7e23a61723c3319cb59c22782196fab028f2c08bb',
});
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const LIGHT = 'minecraft:sea_lantern';
const RAIL = 'minecraft:rail[shape=east_west,waterlogged=false]';
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
  if (!condition) throw new Error(`R12C passive-rail post-QA rejected: ${message}`);
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
invariant(fileBinding(LEDGER_PATH).sha256 === EXPECTED.ledger,
'ledger file identity drifted');
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.transactionId === manifest.transactionId
  && ledger.manifest.sha256 === EXPECTED.manifest
  && fileBinding(MANIFEST_PATH).sha256 === EXPECTED.manifest
  && manifest.manifestIdentity === EXPECTED.manifestIdentity,
'ledger or manifest is not the exact completed R12C transaction');
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
const r10fQa = readJson(INPUTS.r10fQa);
invariant(fileBinding(INPUTS.r10fQa).sha256 === EXPECTED.r10fQa
  && r10fQa.qaPayloadSha256 === EXPECTED.r10fQaPayload
  && r10fQa.summary.passed === true
  && r10fQa.releaseIdentity.completedReleaseIdentitySha256 === EXPECTED.r10fCompleted,
'accepted R10F predecessor QA drifted');

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
invariant(forward.length === 231 && hashCells(targets) === EXPECTED.target
  && forward.every(({ cell, fromState, toState }, index) => (
    cell.x === 2057 + index && cell.y === 130 && cell.z === -748
      && fromState === AIR && toState === RAIL
  )), 'forward target set, order, or transition drifted');
invariant(rollback.length === 231 && rollback.every((operation, index) => {
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
const isolationGaps = [{ x: 2056, y: 130, z: -748 }, { x: 2288, y: 130, z: -748 }];
const halo = dilateCells(targets, 1);
const connectors = readJson(INPUTS.connectors);
const d05 = readJson(INPUTS.d05);
const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
const accommodation = buildB09MinimumReservation(
  model.formula,
  connectors.funicularFaceComparison.designEndpoints,
);
const r07d = readJson(INPUTS.r07dManifest);
const r07e = readJson(INPUTS.r07eManifest);
const r07i = readJson(INPUTS.r07iManifest);
const lowerCap = cellsIn(r07d.scope.geometry.westIsolationCap.bounds);
const summitCap = cellsIn(r07e.scope.geometry.summitInterfaceCap.bounds);
const curveAperture = cellsIn(r07i.scope.geometry.ownedR07hFourCellTurnAperture.bounds);
invariant(support.length === 231 && hashCells(support) === EXPECTED.support
  && headroom.length === 231 && hashCells(headroom) === EXPECTED.headroom
  && isolationGaps.length === 2 && hashCells(isolationGaps) === EXPECTED.isolationGaps
  && halo.length === 2_097 && hashCells(halo) === EXPECTED.halo
  && accommodation.length === 7_800 && hashCells(accommodation) === EXPECTED.accommodation
  && lowerCap.length === 12 && hashCells(lowerCap) === EXPECTED.lowerCap
  && summitCap.length === 12 && hashCells(summitCap) === EXPECTED.summitCap
  && curveAperture.length === 4 && hashCells(curveAperture) === EXPECTED.curveAperture,
'support, headroom, gap, halo, accommodation, cap, or aperture geometry drifted');

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
const sourceCaps = await records(sourceReader, [...lowerCap, ...summitCap]);
const postCaps = await records(postReader, [...lowerCap, ...summitCap]);
const sourceAperture = await records(sourceReader, curveAperture);
const postAperture = await records(postReader, curveAperture);
invariant(sourceTargets.every(({ state }) => state === AIR)
  && postTargets.every(({ state }) => state === RAIL),
'one or more exact rail transitions or final property states failed');
invariant([...sourceSupport, ...postSupport].every(({ state }) => state === DIORITE)
  && [...sourceHeadroom, ...postHeadroom, ...sourceGaps, ...postGaps,
    ...sourceAperture, ...postAperture].every(({ state }) => state === AIR)
  && [...sourceCaps, ...postCaps].every(({ state }) => state === DIORITE),
'support, headroom, isolation gap, cap, or curve aperture was not preserved');

const postTargetByKey = new Map(postTargets.map((record) => [cellKey(record.cell), record.state]));
const neighbourCounts = targets.map((cell) => (
  [[-1, 0, 0], [1, 0, 0]].filter(([dx, dy, dz]) => (
    postTargetByKey.get(`${cell.x + dx},${cell.y + dy},${cell.z + dz}`) === RAIL
  )).length
));
invariant(neighbourCounts.filter((count) => count === 1).length === 2
  && neighbourCounts.filter((count) => count === 2).length === 229
  && neighbourCounts.every((count) => count === 1 || count === 2),
'final rail topology is disconnected, branched, or shape-ambiguous');

const sourceHalo = await records(sourceReader, halo);
const postHalo = await records(postReader, halo);
const haloDifferences = [];
const haloLifecycle = [];
const haloUndeclared = [];
for (let index = 0; index < halo.length; index += 1) {
  if (sourceHalo[index].state === postHalo[index].state) continue;
  const difference = {
    cell: halo[index],
    sourceState: sourceHalo[index].state,
    postState: postHalo[index].state,
  };
  haloDifferences.push(difference);
  if (!targetKeys.has(cellKey(difference.cell))) {
    haloUndeclared.push(difference);
    haloLifecycle.push(difference);
  }
}
invariant(haloDifferences.length === 231 && haloUndeclared.length === 0
  && haloLifecycle.length === 0
  && postHalo.filter(({ state }) => stateBase(state) === 'minecraft:rail').length === 231
  && postHalo.filter(({ cell, state }) => (
    stateBase(state) === 'minecraft:rail' && !targetKeys.has(cellKey(cell))
  )).length === 0,
'scope/halo contains an undeclared, lifecycle, or off-target rail difference');

const sourceAccommodation = await records(sourceReader, accommodation);
const postAccommodation = await records(postReader, accommodation);
const accommodationDifferences = [];
const accommodationUndeclared = [];
for (let index = 0; index < accommodation.length; index += 1) {
  if (sourceAccommodation[index].state === postAccommodation[index].state) continue;
  const difference = {
    cell: accommodation[index],
    sourceState: sourceAccommodation[index].state,
    postState: postAccommodation[index].state,
  };
  accommodationDifferences.push(difference);
  if (!targetKeys.has(cellKey(difference.cell))) accommodationUndeclared.push(difference);
}
invariant(stateSetHash(sourceAccommodation) === EXPECTED.sourceAccommodationState
  && stateSetHash(postAccommodation) === EXPECTED.postAccommodationState
  && accommodationDifferences.length === 231 && accommodationUndeclared.length === 0,
'complete B09 accommodation contains undeclared source-to-post drift');
invariant(stateCensus(sourceAccommodation)[AIR] === 1_155
  && stateCensus(sourceAccommodation)[DIORITE] === 6_606
  && stateCensus(sourceAccommodation)[LIGHT] === 39
  && stateCensus(postAccommodation)[AIR] === 924
  && stateCensus(postAccommodation)[DIORITE] === 6_606
  && stateCensus(postAccommodation)[LIGHT] === 39
  && stateCensus(postAccommodation)[RAIL] === 231,
'source or post B09 material census drifted');
invariant(r10fQa.preservation.postB09StateSetSha256 === stateSetHash(sourceAccommodation),
'fresh R12C source does not preserve the accepted R10F B09 post state');

const postUnexpectedFluids = postHalo.filter(({ state }) => isFluid(state));
const postUnexpectedGravity = postHalo.filter(({ state }) => isGravity(state));
const postUnexpectedContainers = postHalo.filter(
  ({ state }) => CONTAINER_OR_CONTROL.has(stateBase(state)),
);
const postUnexpectedMechanisms = postHalo.filter(({ cell, state }) => (
  MECHANISM_BLOCKS.has(stateBase(state))
    && !(targetKeys.has(cellKey(cell)) && state === RAIL)
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
  && execution.successfulGroups === 231 && execution.failedGroups === 0
  && execution.noopCommands === 0 && execution.unknownReplyCommands === 0
  && execution.worldEditLeftoverCount === 0
  && execution.forceLoadAudit?.allTemporaryReleased === true
  && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true,
'strict execution evidence is incomplete or unsafe');
invariant(journalBinding.sha256 === EXPECTED.journal
  && execution.streamJournalSha256 === EXPECTED.journal
  && journal.length === 468
  && journal.every((entry, index) => entry.sequence === index + 1)
  && journal.at(-1).status === 'complete'
  && journal.at(-1).batch.status === 'completed-cleaned'
  && journal.at(-1).batch.completedGroupCount === 231,
'stream journal is incomplete or identity-drifted');
invariant(rollbackPreflight.status === 'PASS'
  && rollbackPreflight.operationCount === 231
  && rollbackPreflight.passed === 231 && rollbackPreflight.failed === 0
  && rollbackPreflight.regionsSnapshot.sha256 === EXPECTED.postRegion,
'rollback post-state preflight is not 231/231 PASS');

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
invariant(manifestQa.status === 'PASS' && manifestQa.totals.uniqueTargetCells === 231
  && blockEntity.status === 'PASS' && blockEntity.blockingBlockEntityCount === 0
  && liveEntity.status === 'PASS' && liveEntity.totals.blockingEntityHits === 0
  && sameMomentEntity.status === 'PASS'
  && sameMomentEntity.totals.blockingEntityHits === 0,
'manifest, block-entity, or live-entity evidence is not PASS');

const checks = [
  'ledger-manifest-and-completed-identity',
  'source-and-post-complete-save-intakes',
  'all-seventeen-evidence-bindings',
  'accepted-r10f-source-state',
  'exact-231-rail-transitions',
  'single-east-west-rail-component',
  'exact-231-solid-supports',
  'exact-231-air-headroom-cells',
  'two-air-isolation-gaps',
  'lower-and-summit-caps-and-curve-aperture',
  'scope-halo-231-declared-zero-lifecycle-zero-undeclared',
  'b09-accommodation-231-declared-zero-undeclared',
  'post-hazard-and-entity-clearance',
  'strict-231-group-execution',
  'complete-468-entry-journal',
  'rollback-231-of-231',
  'wrapper-17-of-17',
  'no-operational-overclaim-or-qa-mutation',
].map((id) => ({ id, status: 'PASS' }));
const reportWithoutIdentity = {
  schemaVersion: 1,
  qaId: 'CZ-R12C-P1-B09-ISOLATED-LOWER-STRAIGHT-PASSIVE-RAIL-POST-QA',
  status: 'PASS_EXACT_PASSIVE_RAIL_TOPOLOGY_SUPPORT_ISOLATION_AND_ROLLBACK_PRESERVED',
  generatedAtUtc: value('--generated-at', '2026-08-22T00:50:00Z'),
  ledger: fileBinding(LEDGER_PATH),
  manifest: fileBinding(MANIFEST_PATH),
  acceptedPredecessor: {
    r10fPostQa: fileBinding(INPUTS.r10fQa),
    r10fCompletedReleaseIdentitySha256: EXPECTED.r10fCompleted,
    sourceB09StateMatchesR10fPost: true,
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
    desiredState: RAIL,
    exactRailStatePassCount: postTargets.filter(({ state }) => state === RAIL).length,
    exactRailStateFailureCount: postTargets.filter(({ state }) => state !== RAIL).length,
    topology: {
      componentCount: 1,
      largestComponentCellCount: targets.length,
      endpointCount: neighbourCounts.filter((count) => count === 1).length,
      interiorCellCount: neighbourCounts.filter((count) => count === 2).length,
      branchCellCount: neighbourCounts.filter((count) => count > 2).length,
      offTargetRailCellCountInHalo: 0,
      shapeUpdateMismatchCount: postTargets.filter(({ state }) => state !== RAIL).length,
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
    isolationGaps: {
      cellCount: isolationGaps.length,
      coordinateSetSha256: hashCells(isolationGaps),
      sourceAirCount: sourceGaps.filter(({ state }) => state === AIR).length,
      postAirCount: postGaps.filter(({ state }) => state === AIR).length,
    },
  },
  preservation: {
    lowerB08CapCellCount: lowerCap.length,
    summitZ11CapCellCount: summitCap.length,
    capSourceMatchCount: sourceCaps.filter(({ state }) => state === DIORITE).length,
    capPostMatchCount: postCaps.filter(({ state }) => state === DIORITE).length,
    curveApertureCellCount: curveAperture.length,
    curveApertureSourceAirCount: sourceAperture.filter(({ state }) => state === AIR).length,
    curveAperturePostAirCount: postAperture.filter(({ state }) => state === AIR).length,
    interactionHaloCellCount: halo.length,
    interactionHaloCoordinateSetSha256: hashCells(halo),
    sourceHaloStateCensus: stateCensus(sourceHalo),
    postHaloStateCensus: stateCensus(postHalo),
    haloDeclaredDifferenceCount: haloDifferences.length,
    haloLifecycleDifferenceCount: haloLifecycle.length,
    haloUndeclaredDifferenceCount: haloUndeclared.length,
    b09AccommodationCellCount: accommodation.length,
    sourceB09StateSetSha256: stateSetHash(sourceAccommodation),
    postB09StateSetSha256: stateSetHash(postAccommodation),
    sourceB09StateCensus: stateCensus(sourceAccommodation),
    postB09StateCensus: stateCensus(postAccommodation),
    b09DeclaredDifferenceCount: accommodationDifferences.length,
    b09LifecycleDifferenceCount: 0,
    b09UndeclaredDifferenceCount: accommodationUndeclared.length,
    preservedNonTargetB09CellCount: accommodation.length - accommodationDifferences.length,
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
    acceptedScope: '231-cell isolated unpowered east-west B09 passive rail run only',
    passiveRailMaterialAsBuilt: true,
    lowerStationAndFirstCurveIsolationGapsPreserved: true,
    lowerAndSummitExternalCapsPreserved: true,
    stationOrCurveRailInstalled: false,
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
const out = value('--out', path.join(evidenceDirectory, 'r12c-post-release-qa.json'));
const markdownOut = value(
  '--markdown',
  path.join(evidenceDirectory, 'r12c-post-release-qa.md'),
);
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(markdownOut), `# CZ-R12C B09 isolated passive-rail post-release QA\n\n`
  + `**Status:** PASS  \n`
  + `**QA payload:** \`${qaPayloadSha256}\`  \n`
  + `**Completed release:** \`${ledger.completedReleaseIdentitySha256}\`\n\n`
  + `All 231 target cells are exact unpowered east-west rails. They form one `
  + `231-cell line with two endpoints, 229 two-neighbour interior cells, zero `
  + `branches, zero off-target halo rails, and zero shape-update mismatches.\n\n`
  + `All 231 polished-diorite supports and 231 air headroom cells are unchanged. `
  + `Both air isolation gaps, both 12-cell external caps, and the four-cell `
  + `curve aperture are preserved.\n\n`
  + `The complete 2,097-cell interaction halo and 7,800-cell B09 accommodation `
  + `each contain exactly 231 declared air-to-rail differences, zero lifecycle `
  + `differences, and zero undeclared drift. The fresh source exactly matches `
  + `the accepted R10F B09 post state.\n\n`
  + `All 17 wrapper stages and 17 evidence bindings pass. The 468-entry journal `
  + `ends complete and cleaned after 231 successful groups; rollback preflight `
  + `passes 231/231.\n\n`
  + `Acceptance is limited to passive rail material. Station/curve rail, `
  + `barriers, powered rail, drive, brake, vehicle, controls, power, drainage, `
  + `passenger/rescue use, and funicular operation remain uncommissioned. This `
  + `verifier made no live call and no world mutation.\n`);
console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  output: relative(out),
  markdown: relative(markdownOut),
  railStatePassCount: report.exactPostState.exactRailStatePassCount,
  railShapeMismatchCount: report.exactPostState.topology.shapeUpdateMismatchCount,
  haloUndeclaredDifferenceCount: report.preservation.haloUndeclaredDifferenceCount,
  rollbackPassCount: report.execution.rollbackPoststatePassCount,
  stagePassCount: report.evidence.requiredStagePassCount,
  liveCallsPerformed: false,
}, null, 2));
