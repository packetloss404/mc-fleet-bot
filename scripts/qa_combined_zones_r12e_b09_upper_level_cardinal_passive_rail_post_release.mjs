#!/usr/bin/env node
/** Read-only independent post-release QA for CZ-R12E passive B09 rail. */

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
  'data/world-review/combined-zones-r12e-live-20260822T011943Z/evidence-ledger.json',
);
const MANIFEST_PATH =
  'data/buildops/combined-zones-r12e-b09-isolated-upper-level-cardinal-passive-rail.release-manifest.json';
const PACKAGE_KEY = 'b09-isolated-upper-level-cardinal-passive-rail';
const INPUTS = Object.freeze({
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  r07dManifest: 'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
  r07eManifest: 'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
  r12cManifest:
    'data/buildops/combined-zones-r12c-b09-isolated-lower-straight-passive-rail-design-freeze.release-manifest.json',
  r12dManifest:
    'data/buildops/combined-zones-r12d-b09-isolated-hairpin-cardinal-passive-rail.release-manifest.json',
  r12dQa: 'data/world-review/combined-zones-r12d-live-20260822T005835Z/r12d-post-release-qa.json',
});
const EXPECTED = Object.freeze({
  ledger: 'ca0505c5768e25762eca41f7ba77d477ed8eae2a2be55f9acad41caf3ed5f864',
  manifest: '4c52a6eab1f5a6dc23e869c3cac8d573cfa9e3548b211d64e247bbccb8e4749c',
  manifestIdentity: 'e70ac090697d8741c82ed445dd02f26d39255b523d49048bc8d80d2106d5d576',
  forward: '6acaf37b4dd1853e416089df63445d9e3a3f3f136d5551ddf3676a7b05197fb4',
  rollback: 'b225976c8e504e57ee3b860423018197e1212e8d33e9fd8f732c234b409676f9',
  sourceComplete: 'e67267a03d590e88858eca010998dd949a698758c9c2011dde6bccb7aba61633',
  sourceRegion: 'daa2da02ce2aaea64d2d61b2261d03b193dd6805b7b30b501c4a9638b7a50e9c',
  postComplete: 'fc88874e3037fa37565408fb72bda202416178ae990adf00cb0df462f7dc9484',
  postRegion: '980a7636e53a86e1c98c24e05b5b1aadeda1bb5ac7860cf02e02b3ccd4634af9',
  completedRelease: '552ac3c9580c80b248625d6f26676fd491a110ccf707b488b507dea6a1434c9b',
  journal: '60cb39eed371cb8fd6adee313a18f3b6b260b7cc3a00fcd4b01490cd6e8dbea2',
  r12cManifest: 'de097788b3f93bfb3ac0364e17fc07424801a8eb59cdd769758da9c9831e4a91',
  r12dManifest: 'bba29822282eb5de5276f86f5a11f01a4a8018b288d73a3955f36f089eff0af1',
  r12dQa: '4c09c53120024049cb667d67400944593e7314bee5cea901f78c7b1355a82889',
  r12dQaPayload: '56aceba3fa84b1a6508398daf2a34269aee2a992e3fc205dbc0306ad73ac1a4a',
  r12dCompleted: '97ff44527f857241316f425e563f639bea1c96b52b9b839f1e77089a04b225b2',
  target: '71956640b587c6e2b749b168a8c6fe39638c766f323aac657c2f3e95d367456f',
  support: '87d9d86b31be26e360ada4625292f9368a0a90b39b0a80a69114c53f4e0fd376',
  headroom: '91c6eb7567ab5a32c1cfb78895d80a9305beebde989742b6a06ec77091969aa0',
  isolationGaps: '77a4f0337320256a28cd355e9b1427f9b9c192f6526369797be9799de1dd82d8',
  halo: 'b810bd53c0fe08c99fb7e756f8a416cf246d57160b01bfeb86c9e62b7434e7ee',
  accommodation: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  r12cRail: 'd0ce28ec1df09ee872d9885bd65d858e8a39c1d4c377ca532bfafa481bd91b0f',
  r12dRail: 'd34c55e58763b4e6666edd4a973769e5e468ee185f7ef044334670ffcff41754',
  sourceAccommodationState:
    '84c25bde1ce5d62bb2647f4d8cf087b4c6caa44ab02d43efebf1dc2f72765bc4',
  postAccommodationState:
    'f775a927bded347e269b132a3e608798a93b803ee326d44be4cebb72e9d44776',
  lowerCap: 'a422d177fb7f1571b8a6243fcbf014fda17a910e60e7c03f7c21051f697a3e96',
  summitCap: 'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
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
  if (!condition) throw new Error(`R12E passive-rail post-QA rejected: ${message}`);
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
'ledger or manifest is not the exact completed R12E transaction');
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
const r12dManifest = readJson(INPUTS.r12dManifest);
const r12dQa = readJson(INPUTS.r12dQa);
invariant(fileBinding(INPUTS.r12cManifest).sha256 === EXPECTED.r12cManifest
  && fileBinding(INPUTS.r12dManifest).sha256 === EXPECTED.r12dManifest
  && fileBinding(INPUTS.r12dQa).sha256 === EXPECTED.r12dQa
  && r12dQa.qaPayloadSha256 === EXPECTED.r12dQaPayload
  && r12dQa.summary.passed === true
  && r12dQa.releaseIdentity.completedReleaseIdentitySha256 === EXPECTED.r12dCompleted,
'accepted R12C/R12D predecessor evidence drifted');

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
invariant(forward.length === 80 && hashCells(targets) === EXPECTED.target
  && forward.every(({ cell, fromState, toState }, index) => (
    cell.x === 2049 + index && cell.y === 246 && cell.z === -768
      && fromState === AIR && toState === RAIL_EW
  )), 'forward target set, order, or transition drifted');
invariant(rollback.length === 80 && rollback.every((operation, index) => {
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
const isolationGaps = [{ x: 2129, y: 245, z: -768 }, { x: 2048, y: 246, z: -768 }];
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
const r12dRail = cellsIn(r12dManifest.target.operatedUnion.bounds);
const r12dKeys = new Set(r12dRail.map(cellKey));
const r07d = readJson(INPUTS.r07dManifest);
const r07e = readJson(INPUTS.r07eManifest);
const lowerCap = cellsIn(r07d.scope.geometry.westIsolationCap.bounds);
const summitCap = cellsIn(r07e.scope.geometry.summitInterfaceCap.bounds);
invariant(support.length === 80 && hashCells(support) === EXPECTED.support
  && headroom.length === 80 && hashCells(headroom) === EXPECTED.headroom
  && isolationGaps.length === 2 && hashCells(isolationGaps) === EXPECTED.isolationGaps
  && halo.length === 738 && hashCells(halo) === EXPECTED.halo
  && accommodation.length === 7_800 && hashCells(accommodation) === EXPECTED.accommodation
  && r12cRail.length === 231 && hashCells(r12cRail) === EXPECTED.r12cRail
  && r12dRail.length === 19 && hashCells(r12dRail) === EXPECTED.r12dRail
  && lowerCap.length === 12 && hashCells(lowerCap) === EXPECTED.lowerCap
  && summitCap.length === 12 && hashCells(summitCap) === EXPECTED.summitCap,
'support, gap, halo, accommodation, predecessor, or cap geometry drifted');

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
const sourceR12d = await records(sourceReader, r12dRail);
const postR12d = await records(postReader, r12dRail);
const sourceCaps = await records(sourceReader, [...lowerCap, ...summitCap]);
const postCaps = await records(postReader, [...lowerCap, ...summitCap]);
invariant(sourceTargets.every(({ state }) => state === AIR)
  && postTargets.every(({ state }) => state === RAIL_EW),
'one or more exact rail transitions or final property states failed');
invariant([...sourceSupport, ...postSupport].every(({ state }) => state === DIORITE)
  && [...sourceHeadroom, ...postHeadroom, ...sourceGaps, ...postGaps].every(({ state }) => state === AIR)
  && [...sourceR12c, ...postR12c].every(({ state }) => state === RAIL_EW)
  && [...sourceR12d, ...postR12d].every(({ state }) => state === RAIL_NS)
  && [...sourceCaps, ...postCaps].every(({ state }) => state === DIORITE),
'support, headroom, isolation gap, prior rail, or cap was not preserved');

const postTargetByKey = new Map(postTargets.map((record) => [cellKey(record.cell), record.state]));
const neighbourCounts = targets.map((cell) => (
  [[-1, 0, 0], [1, 0, 0]].filter(([dx, dy, dz]) => (
    postTargetByKey.get(`${cell.x + dx},${cell.y + dy},${cell.z + dz}`) === RAIL_EW
  )).length
));
invariant(neighbourCounts.filter((count) => count === 1).length === 2
  && neighbourCounts.filter((count) => count === 2).length === 78
  && neighbourCounts.every((count) => count === 1 || count === 2),
'final rail topology is disconnected, branched, or shape-ambiguous');
const priorRail = [...r12cRail, ...r12dRail];
const cardinalPriorAdjacencyCount = targets.filter((cell) => priorRail.some((prior) => (
  Math.abs(prior.x - cell.x) + Math.abs(prior.y - cell.y) + Math.abs(prior.z - cell.z) === 1
))).length;
invariant(cardinalPriorAdjacencyCount === 0,
'R12E became cardinally adjacent to R12C/R12D despite retained gaps');

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
invariant(haloDiff.changed.length === 80 && haloDiff.undeclared.length === 0,
'interaction halo contains lifecycle or undeclared drift');

const sourceAccommodation = await records(sourceReader, accommodation);
const postAccommodation = await records(postReader, accommodation);
const accommodationDiff = differences(sourceAccommodation, postAccommodation, targetKeys);
invariant(stateSetHash(sourceAccommodation) === EXPECTED.sourceAccommodationState
  && stateSetHash(postAccommodation) === EXPECTED.postAccommodationState
  && accommodationDiff.changed.length === 80 && accommodationDiff.undeclared.length === 0,
'complete B09 accommodation contains undeclared source-to-post drift');
const sourceB09Census = stateCensus(sourceAccommodation);
const postB09Census = stateCensus(postAccommodation);
invariant(sourceB09Census[AIR] === 905 && sourceB09Census[DIORITE] === 6_606
  && sourceB09Census[LIGHT] === 39 && sourceB09Census[RAIL_EW] === 231
  && sourceB09Census[RAIL_NS] === 19
  && postB09Census[AIR] === 825 && postB09Census[DIORITE] === 6_606
  && postB09Census[LIGHT] === 39 && postB09Census[RAIL_EW] === 311
  && postB09Census[RAIL_NS] === 19,
'source or post B09 material census drifted');
invariant(r12dQa.preservation.postB09StateSetSha256 === stateSetHash(sourceAccommodation),
'fresh R12E source does not preserve the accepted R12D B09 post state');
const offTargetRailStates = postAccommodation.filter(({ cell, state }) => (
  stateBase(state) === 'minecraft:rail'
  && !((targetKeys.has(cellKey(cell)) && state === RAIL_EW)
    || (r12cKeys.has(cellKey(cell)) && state === RAIL_EW)
    || (r12dKeys.has(cellKey(cell)) && state === RAIL_NS))
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
    && !((targetKeys.has(cellKey(cell)) && state === RAIL_EW)
      || (r12cKeys.has(cellKey(cell)) && state === RAIL_EW)
      || (r12dKeys.has(cellKey(cell)) && state === RAIL_NS))
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
  && execution.successfulGroups === 80 && execution.failedGroups === 0
  && execution.noopCommands === 0 && execution.unknownReplyCommands === 0
  && execution.worldEditLeftoverCount === 0
  && execution.forceLoadAudit?.allTemporaryReleased === true
  && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true,
'strict execution evidence is incomplete or unsafe');
invariant(journalBinding.sha256 === EXPECTED.journal
  && execution.streamJournalSha256 === EXPECTED.journal
  && journal.length === 166
  && journal.every((entry, index) => entry.sequence === index + 1)
  && journal.at(-1).status === 'complete'
  && journal.at(-1).batch.status === 'completed-cleaned'
  && journal.at(-1).batch.completedGroupCount === 80,
'stream journal is incomplete or identity-drifted');
invariant(rollbackPreflight.status === 'PASS'
  && rollbackPreflight.operationCount === 80
  && rollbackPreflight.passed === 80 && rollbackPreflight.failed === 0
  && rollbackPreflight.regionsSnapshot.sha256 === EXPECTED.postRegion,
'rollback post-state preflight is not 80/80 PASS');

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
invariant(manifestQa.status === 'PASS' && manifestQa.totals.uniqueTargetCells === 80
  && blockEntity.status === 'PASS' && blockEntity.blockingBlockEntityCount === 0
  && liveEntity.status === 'PASS' && liveEntity.totals.blockingEntityHits === 0
  && sameMomentEntity.status === 'PASS'
  && sameMomentEntity.totals.blockingEntityHits === 0,
'manifest, block-entity, or live-entity evidence is not PASS');

const checks = [
  'ledger-manifest-and-completed-identity',
  'source-and-post-complete-save-intakes',
  'all-seventeen-evidence-bindings',
  'accepted-r12d-source-state',
  'exact-80-east-west-rail-transitions',
  'single-80-cell-east-west-component',
  'exact-80-solid-supports',
  'exact-80-air-headroom-cells',
  'two-air-isolation-gaps',
  'r12c-231-and-r12d-19-rail-preservation-and-zero-cardinal-adjacency',
  'external-caps-preserved',
  'scope-halo-80-declared-zero-lifecycle-zero-undeclared',
  'b09-accommodation-80-declared-zero-undeclared',
  'b09-exact-rail-shape-and-off-target-census',
  'post-hazard-and-entity-clearance',
  'strict-80-group-execution',
  'complete-166-entry-journal',
  'rollback-80-of-80',
  'wrapper-17-of-17',
  'no-operational-overclaim-or-qa-mutation',
].map((id) => ({ id, status: 'PASS' }));
const reportWithoutIdentity = {
  schemaVersion: 1,
  qaId: 'CZ-R12E-P1-B09-ISOLATED-UPPER-LEVEL-CARDINAL-PASSIVE-RAIL-POST-QA',
  status: 'PASS_EXACT_UPPER_LEVEL_CARDINAL_RAIL_TOPOLOGY_ISOLATION_AND_ROLLBACK_PRESERVED',
  generatedAtUtc: value('--generated-at', '2026-08-22T01:30:00Z'),
  ledger: fileBinding(LEDGER_PATH),
  manifest: fileBinding(MANIFEST_PATH),
  acceptedPredecessor: {
    r12cManifest: fileBinding(INPUTS.r12cManifest),
    r12dManifest: fileBinding(INPUTS.r12dManifest),
    r12dPostQa: fileBinding(INPUTS.r12dQa),
    r12dCompletedReleaseIdentitySha256: EXPECTED.r12dCompleted,
    sourceB09StateMatchesR12dPost: true,
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
    desiredState: RAIL_EW,
    exactRailStatePassCount: postTargets.filter(({ state }) => state === RAIL_EW).length,
    exactRailStateFailureCount: postTargets.filter(({ state }) => state !== RAIL_EW).length,
    topology: {
      componentCount: 1,
      largestComponentCellCount: targets.length,
      endpointCount: neighbourCounts.filter((count) => count === 1).length,
      interiorCellCount: neighbourCounts.filter((count) => count === 2).length,
      branchCellCount: neighbourCounts.filter((count) => count > 2).length,
      shapeUpdateMismatchCount: postTargets.filter(({ state }) => state !== RAIL_EW).length,
      cardinalAdjacencyToPriorRailCount: cardinalPriorAdjacencyCount,
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
    r12dRailCellCount: r12dRail.length,
    r12dRailSourceMatchCount: sourceR12d.filter(({ state }) => state === RAIL_NS).length,
    r12dRailPostMatchCount: postR12d.filter(({ state }) => state === RAIL_NS).length,
    lowerB08CapCellCount: lowerCap.length,
    summitZ11CapCellCount: summitCap.length,
    capSourceMatchCount: sourceCaps.filter(({ state }) => state === DIORITE).length,
    capPostMatchCount: postCaps.filter(({ state }) => state === DIORITE).length,
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
    totalExpectedRailCellCount: 330,
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
    acceptedScope: '80-cell isolated unpowered east-west B09 upper-level cardinal rail leg only',
    passiveRailMaterialAsBuilt: true,
    lowerGradeAndSummitTurnGapsRemainAir: true,
    priorRailCardinalConnectionCreated: false,
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
const out = value('--out', path.join(evidenceDirectory, 'r12e-post-release-qa.json'));
const markdownOut = value('--markdown', path.join(evidenceDirectory, 'r12e-post-release-qa.md'));
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(markdownOut), `# CZ-R12E B09 upper-level cardinal rail post-release QA\n\n`
  + `**Status:** PASS  \n`
  + `**QA payload:** \`${qaPayloadSha256}\`  \n`
  + `**Completed release:** \`${ledger.completedReleaseIdentitySha256}\`\n\n`
  + `All 80 target cells are exact unpowered east-west rails. They form one `
  + `80-cell line with two endpoints, 78 two-neighbour interior cells, zero `
  + `branches, and zero shape-update mismatches.\n\n`
  + `All 80 polished-diorite supports and 80 air headroom cells are unchanged. `
  + `The grade and summit-turn isolation gaps remain air. All 231 prior R12C `
  + `east-west rails and all 19 R12D north-south rails are unchanged, with zero `
  + `cardinal adjacency to R12E.\n\n`
  + `The complete 738-cell interaction halo and 7,800-cell B09 accommodation `
  + `each contain exactly 80 declared air-to-rail differences, zero lifecycle `
  + `differences, and zero undeclared drift. The post has exactly 311 accepted `
  + `east-west rails plus 19 north-south rails and no off-target or `
  + `property-mismatched rail.\n\n`
  + `All 17 wrapper stages and evidence bindings pass. The 166-entry journal `
  + `ends complete and cleaned after 80 successful groups; rollback preflight `
  + `passes 80/80.\n\n`
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
