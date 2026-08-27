#!/usr/bin/env node
/** Read-only independent post-release QA for CZ-R12G passive B09 rail. */

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
  'data/world-review/combined-zones-r12g-live-20260822T020641Z/evidence-ledger.json',
);
const MANIFEST_PATH =
  'data/buildops/combined-zones-r12g-b09-isolated-four-cell-graded-passive-rail.release-manifest.json';
const PACKAGE_KEY = 'b09-isolated-four-cell-graded-passive-rail';
const INPUTS = Object.freeze({
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  r07dManifest: 'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
  r07eManifest: 'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
  r12cManifest:
    'data/buildops/combined-zones-r12c-b09-isolated-lower-straight-passive-rail-design-freeze.release-manifest.json',
  r12dManifest:
    'data/buildops/combined-zones-r12d-b09-isolated-hairpin-cardinal-passive-rail.release-manifest.json',
  r12eManifest:
    'data/buildops/combined-zones-r12e-b09-isolated-upper-level-cardinal-passive-rail.release-manifest.json',
  r12fManifest:
    'data/buildops/combined-zones-r12f-b09-isolated-three-cell-graded-passive-rail.release-manifest.json',
  r12fQa: 'data/world-review/combined-zones-r12f-live-20260822T014754Z/r12f-post-release-qa.json',
  runtimeProof:
    'data/world-review/combined-zones-r12g-b09-graded-rail-runtime-proof-20260822T020000Z/runtime-proof.json',
});
const EXPECTED = Object.freeze({
  ledger: '536c4a23d7f2f3dc91a446183026c162ed48bff1c3a13b3fcc23a88638bfbe9a',
  manifest: 'e75d6ee3f31bfb483f88bc84ec10637cb09cfe115a443993cec204c517b27b59',
  manifestIdentity: 'd2485b2e6d3185358ee17c2cf40aa7a667f3f7965cf8b3d63df20b08ac6523b3',
  forward: '49d142afeb737a682f5a97350ef76c9508138a1338026e0f867373c9421aa85e',
  rollback: 'd1a686113fc06cdbfdebcba0c804d1279179050c255cc8a9b89fe4443a41eac3',
  sourceComplete: '0b999e6d2f32c16d94d32fca8c39473da83634978052611dbd884bc1da9e8cb8',
  sourceRegion: '1342a7912d077011e43b559192c34e5471169b8dad0c38a8cda55b8082439427',
  postComplete: 'e9674310deb7b7ef41d21b1e8c2cb8597c013c777e3581428de3e0be5aa44141',
  postRegion: 'e3a09c6500d89bfa700a55b83f0cad312b2647d8a826ea1d6f650dc045191ce9',
  completedRelease: 'd553db34ab30a5a03dc290b72c75df7266748de6ceae66bf8596cc652ab1d160',
  journal: 'f998d1e91b5e9a900b8ebd75dd2c50c3b84dbd7c21ac714c0659f4807dc1f28e',
  r12cManifest: 'de097788b3f93bfb3ac0364e17fc07424801a8eb59cdd769758da9c9831e4a91',
  r12dManifest: 'bba29822282eb5de5276f86f5a11f01a4a8018b288d73a3955f36f089eff0af1',
  r12eManifest: '4c52a6eab1f5a6dc23e869c3cac8d573cfa9e3548b211d64e247bbccb8e4749c',
  r12fManifest: 'cdfa0bacc4537e59970e15f59774f0bee2ddccc959a87f8fa1299c849b0fc9c5',
  r12fQa: '3ddbecd1462303a54535fbda32a2c195203243a7b56301b722e1a54c0e5565c8',
  r12fQaPayload: '67427f0f7e0f0cc08829575a128793ea39cf1adb09a9eb0316c7664953449fb8',
  r12fCompleted: '2c9a54aaad0bfd742705ed1015b781db3b0aa7d56a86e6c57ee348c6e9f29f28',
  runtimeProof: 'f133046447aafcfa3780437bfb2882af93615adc60ef2829f0106113c495a47d',
  runtimeProofPayload: '1590009333d22172fa3d0db724b793522a0c6c340c6b0ee997497db1ad45b42d',
  target: 'bb5739a71b664cbe90e166dfcb7d531e18f54138c6965bf0208ec0e79319350d',
  support: '32c8fbd8718782ce52400ce35be75bd73f1e268c262a22029bd4b6cf38138059',
  headroom: '846dda52857ae6063cc7ba41dc0078d9aa1e2dcd67f9d9e2a1d7da0db23cf4f8',
  isolationGaps: 'b1e3c28e724a6c24a0c6caaf3da95e6bf7bc88aa4e7b92af1e7a0446ab6be61b',
  halo: '1e145c0ba9c094587b64925f7fa96067add3acb3460df9a441de9032de2c3475',
  accommodation: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  r12cRail: 'd0ce28ec1df09ee872d9885bd65d858e8a39c1d4c377ca532bfafa481bd91b0f',
  r12dRail: 'd34c55e58763b4e6666edd4a973769e5e468ee185f7ef044334670ffcff41754',
  r12eRail: '71956640b587c6e2b749b168a8c6fe39638c766f323aac657c2f3e95d367456f',
  sourceAccommodationState:
    '5cac855d633287c103593f0d3131c89ec08bf807cc7bafa0f33ea7fed2a46467',
  postAccommodationState: null,
  lowerCap: 'a422d177fb7f1571b8a6243fcbf014fda17a910e60e7c03f7c21051f697a3e96',
  summitCap: 'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
});
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const LIGHT = 'minecraft:sea_lantern';
const RAIL_NS = 'minecraft:rail[shape=north_south,waterlogged=false]';
const RAIL_EW = 'minecraft:rail[shape=east_west,waterlogged=false]';
const RAIL_ASCENDING_WEST = 'minecraft:rail[shape=ascending_west,waterlogged=false]';
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
  if (!condition) throw new Error(`R12G passive-rail post-QA rejected: ${message}`);
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
'ledger or manifest is not the exact completed R12G transaction');
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
const r12eManifest = readJson(INPUTS.r12eManifest);
const r12fManifest = readJson(INPUTS.r12fManifest);
const r12fQa = readJson(INPUTS.r12fQa);
const runtimeProof = readJson(INPUTS.runtimeProof);
invariant(fileBinding(INPUTS.r12cManifest).sha256 === EXPECTED.r12cManifest
  && fileBinding(INPUTS.r12dManifest).sha256 === EXPECTED.r12dManifest
  && fileBinding(INPUTS.r12eManifest).sha256 === EXPECTED.r12eManifest
  && fileBinding(INPUTS.r12fManifest).sha256 === EXPECTED.r12fManifest
  && fileBinding(INPUTS.r12fQa).sha256 === EXPECTED.r12fQa
  && r12fQa.qaPayloadSha256 === EXPECTED.r12fQaPayload
  && r12fQa.summary.passed === true
  && r12fQa.releaseIdentity.completedReleaseIdentitySha256 === EXPECTED.r12fCompleted
  && fileBinding(INPUTS.runtimeProof).sha256 === EXPECTED.runtimeProof
  && runtimeProof.proofPayloadSha256 === EXPECTED.runtimeProofPayload
  && runtimeProof.status
    === 'PASS_EXACT_PAPER_1_21_11_GRADED_RAIL_STATE_AND_REVERSE_ORDER_INVERSE',
'accepted R12F predecessor or exact Paper runtime proof drifted');

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
const expectedForward = [
  { cell: { x: 2274, y: 140, z: -768 }, state: RAIL_EW },
  { cell: { x: 2275, y: 139, z: -768 }, state: RAIL_ASCENDING_WEST },
  { cell: { x: 2276, y: 138, z: -768 }, state: RAIL_ASCENDING_WEST },
  { cell: { x: 2277, y: 137, z: -768 }, state: RAIL_ASCENDING_WEST },
];
invariant(forward.length === 4 && hashCells(targets) === EXPECTED.target
  && forward.every(({ cell, fromState, toState }, index) => (
    cellKey(cell) === cellKey(expectedForward[index].cell)
      && fromState === AIR && toState === expectedForward[index].state
  )), 'forward target set, order, or transition drifted');
invariant(rollback.length === 4 && rollback.every((operation, index) => {
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
const isolationGaps = [{ x: 2278, y: 137, z: -768 }, { x: 2273, y: 140, z: -768 }];
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
const r12eRail = cellsIn(r12eManifest.target.operatedUnion.bounds);
const r12eKeys = new Set(r12eRail.map(cellKey));
const r12fRail = [
  { x: 2287, y: 130, z: -768 },
  { x: 2286, y: 131, z: -768 },
  { x: 2285, y: 132, z: -768 },
];
const r12fKeys = new Set(r12fRail.map(cellKey));
const r07d = readJson(INPUTS.r07dManifest);
const r07e = readJson(INPUTS.r07eManifest);
const lowerCap = cellsIn(r07d.scope.geometry.westIsolationCap.bounds);
const summitCap = cellsIn(r07e.scope.geometry.summitInterfaceCap.bounds);
invariant(support.length === 4 && hashCells(support) === EXPECTED.support
  && headroom.length === 4 && hashCells(headroom) === EXPECTED.headroom
  && isolationGaps.length === 2 && hashCells(isolationGaps) === EXPECTED.isolationGaps
  && halo.length === 72 && hashCells(halo) === EXPECTED.halo
  && accommodation.length === 7_800 && hashCells(accommodation) === EXPECTED.accommodation
  && r12cRail.length === 231 && hashCells(r12cRail) === EXPECTED.r12cRail
  && r12dRail.length === 19 && hashCells(r12dRail) === EXPECTED.r12dRail
  && r12eRail.length === 80 && hashCells(r12eRail) === EXPECTED.r12eRail
  && r12fRail.length === 3 && hashCells(r12fRail)
    === r12fManifest.target.operatedUnion.coordinateSetSha256
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
const sourceR12e = await records(sourceReader, r12eRail);
const postR12e = await records(postReader, r12eRail);
const sourceR12f = await records(sourceReader, r12fRail);
const postR12f = await records(postReader, r12fRail);
const sourceCaps = await records(sourceReader, [...lowerCap, ...summitCap]);
const postCaps = await records(postReader, [...lowerCap, ...summitCap]);
invariant(sourceTargets.every(({ state }) => state === AIR)
  && postTargets.every(({ cell, state }) => (
    state === expectedForward.find((entry) => cellKey(entry.cell) === cellKey(cell))?.state
  )),
'one or more exact rail transitions or final property states failed');
invariant([...sourceSupport, ...postSupport].every(({ state }) => state === DIORITE)
  && [...sourceHeadroom, ...postHeadroom, ...sourceGaps, ...postGaps].every(({ state }) => state === AIR)
  && [...sourceR12c, ...postR12c].every(({ state }) => state === RAIL_EW)
  && [...sourceR12d, ...postR12d].every(({ state }) => state === RAIL_NS)
  && [...sourceR12e, ...postR12e].every(({ state }) => state === RAIL_EW)
  && [...sourceR12f, ...postR12f].every(({ cell, state }) => (
    (cell.x === 2285 && state === RAIL_EW)
      || (cell.x !== 2285 && state === RAIL_ASCENDING_WEST)
  ))
  && [...sourceCaps, ...postCaps].every(({ state }) => state === DIORITE),
'support, headroom, isolation gap, prior rail, or cap was not preserved');

const neighbourCounts = targets.map((cell) => targets.filter((candidate) => (
  cellKey(candidate) !== cellKey(cell)
    && Math.abs(candidate.x - cell.x) === 1
    && Math.abs(candidate.y - cell.y) === 1
    && candidate.z === cell.z
)).length);
invariant(neighbourCounts.filter((count) => count === 1).length === 2
  && neighbourCounts.filter((count) => count === 2).length === 2
  && neighbourCounts.every((count) => count === 1 || count === 2),
'final rail topology is disconnected, branched, or shape-ambiguous');
const priorRail = [...r12cRail, ...r12dRail, ...r12eRail, ...r12fRail];
const priorRailConnectionCount = targets.filter((cell) => priorRail.some((prior) => (
  (Math.abs(prior.x - cell.x) + Math.abs(prior.z - cell.z) === 1)
    && Math.abs(prior.y - cell.y) <= 1
))).length;
invariant(priorRailConnectionCount === 0,
'R12G became rail-neighbour adjacent to R12C/R12D/R12E/R12F despite retained gaps');

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
invariant(haloDiff.changed.length === 4 && haloDiff.undeclared.length === 0,
'interaction halo contains lifecycle or undeclared drift');

const sourceAccommodation = await records(sourceReader, accommodation);
const postAccommodation = await records(postReader, accommodation);
const accommodationDiff = differences(sourceAccommodation, postAccommodation, targetKeys);
const postAccommodationState = stateSetHash(postAccommodation);
invariant(stateSetHash(sourceAccommodation) === EXPECTED.sourceAccommodationState
  && accommodationDiff.changed.length === 4 && accommodationDiff.undeclared.length === 0,
'complete B09 accommodation contains undeclared source-to-post drift');
const sourceB09Census = stateCensus(sourceAccommodation);
const postB09Census = stateCensus(postAccommodation);
invariant(sourceB09Census[AIR] === 822 && sourceB09Census[DIORITE] === 6_606
  && sourceB09Census[LIGHT] === 39 && sourceB09Census[RAIL_EW] === 312
  && sourceB09Census[RAIL_NS] === 19 && sourceB09Census[RAIL_ASCENDING_WEST] === 2
  && postB09Census[AIR] === 818 && postB09Census[DIORITE] === 6_606
  && postB09Census[LIGHT] === 39 && postB09Census[RAIL_EW] === 313
  && postB09Census[RAIL_NS] === 19 && postB09Census[RAIL_ASCENDING_WEST] === 5,
'source or post B09 material census drifted');
invariant(r12fQa.preservation.postB09StateSetSha256 === stateSetHash(sourceAccommodation),
'fresh R12G source does not preserve the accepted R12F B09 post state');
const offTargetRailStates = postAccommodation.filter(({ cell, state }) => (
  stateBase(state) === 'minecraft:rail'
  && !((targetKeys.has(cellKey(cell))
      && expectedForward.some((entry) => cellKey(entry.cell) === cellKey(cell)
        && entry.state === state))
    || (r12cKeys.has(cellKey(cell)) && state === RAIL_EW)
    || (r12dKeys.has(cellKey(cell)) && state === RAIL_NS)
    || (r12eKeys.has(cellKey(cell)) && state === RAIL_EW)
    || (r12fKeys.has(cellKey(cell)) && ((cell.x === 2285 && state === RAIL_EW)
      || (cell.x !== 2285 && state === RAIL_ASCENDING_WEST))))
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
    && !((targetKeys.has(cellKey(cell))
        && expectedForward.some((entry) => cellKey(entry.cell) === cellKey(cell)
          && entry.state === state))
      || (r12cKeys.has(cellKey(cell)) && state === RAIL_EW)
      || (r12dKeys.has(cellKey(cell)) && state === RAIL_NS)
      || (r12eKeys.has(cellKey(cell)) && state === RAIL_EW)
      || (r12fKeys.has(cellKey(cell)) && ((cell.x === 2285 && state === RAIL_EW)
        || (cell.x !== 2285 && state === RAIL_ASCENDING_WEST))))
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
  && execution.successfulGroups === 4 && execution.failedGroups === 0
  && execution.noopCommands === 0 && execution.unknownReplyCommands === 0
  && execution.worldEditLeftoverCount === 0
  && execution.forceLoadAudit?.allTemporaryReleased === true
  && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true,
'strict execution evidence is incomplete or unsafe');
invariant(journalBinding.sha256 === EXPECTED.journal
  && execution.streamJournalSha256 === EXPECTED.journal
  && journal.length === 14
  && journal.every((entry, index) => entry.sequence === index + 1)
  && journal.at(-1).status === 'complete'
  && journal.at(-1).batch.status === 'completed-cleaned'
  && journal.at(-1).batch.completedGroupCount === 4,
'stream journal is incomplete or identity-drifted');
invariant(rollbackPreflight.status === 'PASS'
  && rollbackPreflight.operationCount === 4
  && rollbackPreflight.passed === 4 && rollbackPreflight.failed === 0
  && rollbackPreflight.regionsSnapshot.sha256 === EXPECTED.postRegion,
'rollback post-state preflight is not 4/4 PASS');

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
invariant(manifestQa.status === 'PASS' && manifestQa.totals.uniqueTargetCells === 4
  && blockEntity.status === 'PASS' && blockEntity.blockingBlockEntityCount === 0
  && liveEntity.status === 'PASS' && liveEntity.totals.blockingEntityHits === 0
  && sameMomentEntity.status === 'PASS'
  && sameMomentEntity.totals.blockingEntityHits === 0,
'manifest, block-entity, or live-entity evidence is not PASS');

const checks = [
  'ledger-manifest-and-completed-identity',
  'source-and-post-complete-save-intakes',
  'all-seventeen-evidence-bindings',
  'accepted-r12f-source-state',
  'exact-paper-runtime-proof-binding',
  'exact-four-graded-rail-transitions-and-order',
  'single-four-cell-graded-component',
  'exact-four-solid-supports',
  'exact-four-air-headroom-cells',
  'two-air-isolation-gaps',
  'r12c-through-r12f-333-rail-preservation-and-zero-rail-neighbour-adjacency',
  'external-caps-preserved',
  'scope-halo-four-declared-zero-lifecycle-zero-undeclared',
  'b09-accommodation-four-declared-zero-undeclared',
  'b09-exact-rail-shape-and-off-target-census',
  'post-hazard-and-entity-clearance',
  'strict-four-group-execution',
  'complete-14-entry-journal',
  'rollback-four-of-four',
  'wrapper-17-of-17',
  'no-operational-overclaim-or-qa-mutation',
].map((id) => ({ id, status: 'PASS' }));
const reportWithoutIdentity = {
  schemaVersion: 1,
  qaId: 'CZ-R12G-P1-B09-ISOLATED-FOUR-CELL-GRADED-PASSIVE-RAIL-POST-QA',
  status: 'PASS_EXACT_ISOLATED_GRADED_RAIL_TOPOLOGY_ISOLATION_AND_ROLLBACK_PRESERVED',
  generatedAtUtc: value('--generated-at', '2026-08-22T01:30:00Z'),
  ledger: fileBinding(LEDGER_PATH),
  manifest: fileBinding(MANIFEST_PATH),
  acceptedPredecessor: {
    r12cManifest: fileBinding(INPUTS.r12cManifest),
    r12dManifest: fileBinding(INPUTS.r12dManifest),
    r12eManifest: fileBinding(INPUTS.r12eManifest),
    r12fManifest: fileBinding(INPUTS.r12fManifest),
    r12fPostQa: fileBinding(INPUTS.r12fQa),
    r12fCompletedReleaseIdentitySha256: EXPECTED.r12fCompleted,
    sourceB09StateMatchesR12fPost: true,
  },
  runtimeProof: {
    binding: fileBinding(INPUTS.runtimeProof),
    proofPayloadSha256: runtimeProof.proofPayloadSha256,
    exactProductionPaperVersion: runtimeProof.runtime.expectedVersion,
    forwardOrder: runtimeProof.deterministicOrder.forward,
    rollbackExactReverseOrder: runtimeProof.deterministicOrder.rollbackExactReverse,
    forwardStatePassCount: runtimeProof.deterministicOrder.forwardStatePassCount,
    rollbackAirPassCount: runtimeProof.deterministicOrder.rollbackAirPassCount,
    productionMutationPerformed: false,
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
    desiredStatesByForwardOrder: expectedForward,
    exactRailStatePassCount: postTargets.filter(({ cell, state }) => (
      expectedForward.some((entry) => cellKey(entry.cell) === cellKey(cell) && entry.state === state)
    )).length,
    exactRailStateFailureCount: postTargets.filter(({ cell, state }) => (
      !expectedForward.some((entry) => cellKey(entry.cell) === cellKey(cell) && entry.state === state)
    )).length,
    topology: {
      componentCount: 1,
      largestComponentCellCount: targets.length,
      endpointCount: neighbourCounts.filter((count) => count === 1).length,
      interiorCellCount: neighbourCounts.filter((count) => count === 2).length,
      branchCellCount: neighbourCounts.filter((count) => count > 2).length,
      shapeUpdateMismatchCount: postTargets.filter(({ cell, state }) => (
        !expectedForward.some((entry) => cellKey(entry.cell) === cellKey(cell) && entry.state === state)
      )).length,
      railNeighbourAdjacencyToPriorRailCount: priorRailConnectionCount,
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
    r12eRailCellCount: r12eRail.length,
    r12eRailSourceMatchCount: sourceR12e.filter(({ state }) => state === RAIL_EW).length,
    r12eRailPostMatchCount: postR12e.filter(({ state }) => state === RAIL_EW).length,
    r12fRailCellCount: r12fRail.length,
    r12fRailSourceMatchCount: sourceR12f.filter(({ cell, state }) => (
      (cell.x === 2285 && state === RAIL_EW)
        || (cell.x !== 2285 && state === RAIL_ASCENDING_WEST)
    )).length,
    r12fRailPostMatchCount: postR12f.filter(({ cell, state }) => (
      (cell.x === 2285 && state === RAIL_EW)
        || (cell.x !== 2285 && state === RAIL_ASCENDING_WEST)
    )).length,
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
    totalExpectedRailCellCount: 337,
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
    acceptedScope: 'four-cell isolated unpowered B09 ascending-west graded rail pilot only',
    passiveRailMaterialAsBuilt: true,
    hairpinTurnAndUpperIsolationGapsRemainAir: true,
    priorRailConnectionCreated: false,
    turnRailInstalled: false,
    exactFourCellSlopeRailInstalled: true,
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
const out = value('--out', path.join(evidenceDirectory, 'r12g-post-release-qa.json'));
const markdownOut = value('--markdown', path.join(evidenceDirectory, 'r12g-post-release-qa.md'));
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(markdownOut), `# CZ-R12G B09 isolated graded rail post-release QA\n\n`
  + `**Status:** PASS  \n`
  + `**QA payload:** \`${qaPayloadSha256}\`  \n`
  + `**Completed release:** \`${ledger.completedReleaseIdentitySha256}\`\n\n`
  + `All four target cells match the authored production-proven states: three `
  + `ascending-west rails and one east-west upper rail. They form one graded `
  + `component with two endpoints, two interior cells, zero branches, and zero `
  + `shape-update mismatches.\n\n`
  + `All four polished-diorite supports and air headroom cells are unchanged. `
  + `Both isolation gaps remain air. All 333 prior R12C–R12F rails are `
  + `unchanged with zero rail-neighbour connection to R12G.\n\n`
  + `The complete 72-cell interaction halo and 7,800-cell B09 accommodation `
  + `each contain exactly four declared air-to-rail differences, zero lifecycle `
  + `differences, and zero undeclared drift. The post has exactly 337 accepted `
  + `rails and no off-target or property-mismatched rail.\n\n`
  + `The exact Paper 1.21.11 runtime proof is bound. All 17 wrapper stages pass; `
  + `the 14-entry journal ends complete and cleaned after four successful groups; `
  + `rollback preflight passes 4/4.\n\n`
  + `Acceptance is limited to isolated passive graded rail material. Turns, all `
  + `other slope rail, barriers, powered rail, drive, brake, vehicle, controls, power, `
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
