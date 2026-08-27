#!/usr/bin/env node
/** Independent read-only post-release QA for CZ-R12K. */

import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, buildB09MinimumReservation, cellKey, cellsIn, dilateCells,
  hashCells, sha256, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const PROFILE = argv.includes('--profile') ? argv[argv.indexOf('--profile') + 1] : 'r12k';
if (!['r12k', 'r12l', 'r12n', 'r12p', 'r12q'].includes(PROFILE)) throw new Error(`unsupported profile ${PROFILE}`);
const IS_R12L = PROFILE === 'r12l';
const IS_R12N = PROFILE === 'r12n';
const IS_R12P = PROFILE === 'r12p';
const IS_R12Q = PROFILE === 'r12q';
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const LEDGER = value('--ledger',
  IS_R12Q
    ? 'data/world-review/combined-zones-r12q-live-20260822T044855Z/evidence-ledger.json'
    : IS_R12P
    ? 'data/world-review/combined-zones-r12p-live-20260822T043204Z/evidence-ledger.json'
    : IS_R12N
    ? 'data/world-review/combined-zones-r12n-live-20260822T040651Z/evidence-ledger.json'
    : IS_R12L
    ? 'data/world-review/combined-zones-r12l-live-20260822T034902Z/evidence-ledger.json'
    : 'data/world-review/combined-zones-r12k-live-20260822T032114Z/evidence-ledger.json');
const EVIDENCE = path.dirname(LEDGER);
const OUT = value('--out', path.join(EVIDENCE, `${PROFILE}-post-release-qa.json`));
const MARKDOWN = value('--markdown', path.join(EVIDENCE, `${PROFILE}-post-release-qa.md`));
const MANIFEST = IS_R12Q
  ? 'data/buildops/combined-zones-r12q-b09-lower-two-turn-rail-closure.release-manifest.json'
  : IS_R12P
  ? 'data/buildops/combined-zones-r12p-b09-continuous-261-560-sixty-one-cell-summit-return-rail-closure.release-manifest.json'
  : IS_R12N
  ? 'data/buildops/combined-zones-r12n-b09-continuous-261-499-one-hundred-twenty-three-cell-rail-adjacency-closure.release-manifest.json'
  : IS_R12L
    ? 'data/buildops/combined-zones-r12l-b09-continuous-261-296-seven-cell-rail-adjacency-closure.release-manifest.json'
    : 'data/buildops/combined-zones-r12k-b09-r12h-r12i-seven-cell-rail-adjacency-closure.release-manifest.json';
const PROOF = IS_R12Q
  ? 'data/world-review/combined-zones-r12q-b09-lower-two-turn-closure-runtime-proof-20260822T044200Z/runtime-proof.json'
  : IS_R12P
  ? 'data/world-review/combined-zones-r12p-b09-continuous-261-560-runtime-proof-20260822T042000Z/runtime-proof.json'
  : IS_R12N
  ? 'data/world-review/combined-zones-r12n-b09-continuous-261-499-runtime-proof-20260822T040200Z/runtime-proof.json'
  : IS_R12L
    ? 'data/world-review/combined-zones-r12l-b09-adjacency-closure-runtime-proof-20260822T033400Z/runtime-proof.json'
    : 'data/world-review/combined-zones-r12k-b09-adjacency-closure-runtime-proof-20260822T030800Z/runtime-proof.json';
const PACKAGE = IS_R12Q
  ? 'b09-lower-two-turn-rail-closure'
  : IS_R12P
  ? 'b09-continuous-261-560-sixty-one-cell-summit-return-rail-closure'
  : IS_R12N
  ? 'b09-continuous-261-499-one-hundred-twenty-three-cell-rail-adjacency-closure'
  : IS_R12L ? 'b09-continuous-261-296-seven-cell-rail-adjacency-closure'
    : 'b09-r12h-r12i-seven-cell-rail-adjacency-closure';
const D05 = 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json';
const CONNECTORS = 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json';
const R12K_EXPECTED = Object.freeze({
  ledger: 'cb177afa39c74212059f327dc2f0a9d904864291b807652700ba1e6e03f4d2dd',
  manifest: 'bcf8dae5d7d54912bb8d0fc330123240152cc8707720c8bc3db66499ad8cd0fd',
  identity: '20a73facf7718b89a43ea1050924a5894d7ec759306d744267d9e17d1a7704bb',
  sourceBound: '21a5929088a0b916e049c3c34c82507eca896d6d77a2f48c27c51a360e59dc9a',
  completed: 'c26cd8ddad126c9a15e92935d6b11ea9d8b258f09bddad42e7b5b05f412921d2',
  sourceComplete: '5931964fdf44f52ccd2a38eb73861a37918359528935ca61cad4287b89a0e888',
  sourceRegion: '3db3ec3dedb3bc1f54233c1149d29a0ce9f7f26306087163690f1525e4d78ab8',
  postComplete: '75fa7fd46dd3fc7ab606735b14d9cada3bb0b6f1cd217cc81b6d7a9c62d8247a',
  postRegion: 'e478096bef5637c329b62a5955e1e8d700788762de432720e99abe37b55a748a',
  forward: 'cd26ca670b6008e8e695bc15904a490767ccd7a71dcaa0face5d5a9efaa38a84',
  rollback: 'fc1d53d6905c9c05b94ec1096b4337b9efdbfe84f4747fff8fd1aba2ab8f7398',
  execution: '9f895ca2eb802b30e2fe0967e522359997a613f392e5ce428305227afd1ab364',
  journal: 'e09612b5bf1ce81b8be7ff26912beef9e0addafa62828eaf6ad993df78224ff5',
  rollbackPreflight: '93be0bacd301caa86c7a2f8e237534dd5cd17b2aa41eb6efffbfb39b850123e0',
  proof: '128774523d63255b3fc11f07ad72c6aa3ad1462bf8f4ec0bf4503886b6fcb1f8',
  proofPayload: '0b18785f201fb7533f8752fb9c3ad7bbaeff87ecab93e65beff9fd638cbe19f1',
  target: 'ddb53df35589e76f7fddfbba92dc76a13d682a99cbd87afe2131accf9ccf9849',
});
const R12L_EXPECTED = Object.freeze({
  ledger: 'ab2f6b19d44f1180e2fe9566696e11acae0dfd8b85974d383beb339df4814f65',
  manifest: '67fce2b7acc25a82a9df3a2f31068292f2d67d1d5837da2cbc7b60571e47d7e8',
  identity: 'd68e9311db9368f4078674461a1a53f24c7bb93f96a0b9c0018832399e4fd669',
  sourceBound: '1ca2e531289cdf30038ea1ac4435fef2a02c361f77b3c9ea10efd1450efcbe3c',
  completed: 'efd7eb2c8b89d36a6debccf4025eb1a3ddede922490b0243a7063be8da94aea1',
  sourceComplete: '203110fdff4dc9e26629c4fb412a5554c2dd180881f808118ddb253289e1a47b',
  sourceRegion: '5056dc29a5fd124a53efdf3083f4ad4f63d5349b87b174f729c0e99d718ed695',
  postComplete: 'aca20b199c0b4449af8d71d1e4beb745737485316676c6e026c6494e22a5c4c5',
  postRegion: 'f90f87dbd4b716eb44530794fe26a713109c67dee0f364a1f6a4903bc70611e9',
  forward: 'bdf299192a3c605cdcca5792796d2839e492d742a8e90f705e513d852fd5a997',
  rollback: '78a984be561b53d6dcd43d2a8de63021c33a6176f6768367cad8613f9e0f5ae9',
  execution: 'a8671856771200e887389ecc2141ab259025a19f41d7eaea96ec69bd1773c710',
  journal: '02736286ec9bf34b168715ff98c2a423ae135e4d01656afca34778bc09caab36',
  rollbackPreflight: '867e7e4d00e0dfa6eec862b6461bf23e140fbf698f4d700bfd59182fa4f37411',
  proof: '8c7a47a6317394db2b6cae8e0236af484aba2923a26a3a767d003ac927c09234',
  proofPayload: '0ae94eca43a1b080011e428098451af70caf5db2a38332702985561baf8c9be4',
  target: '7093da416a6d7dcb650b093ac4c1a8ea8d41d7c904c12be30f4d028a2a52d25d',
});
const R12N_EXPECTED = Object.freeze({
  ledger: '6987da40b3f50cfe98cd2ac456fe2dfaba083b13f434a482924968606e7746c7',
  manifest: '1153754d5bc8b43d67fa9371a5de668d3b778a0db0f06e67f72257fd2afbe43b',
  identity: '055c65a9f9794fd5f36025991ab997c3a6adea94f6e742038e33238b35182eb8',
  sourceBound: '3619369041da40aaeb0c2c1004fd3ea9864186e7920e77ec10348094fc5be222',
  completed: '6b5752472621525ef576b6f5f3c28cfbc2872416afef02706757a18b6b61e982',
  sourceComplete: '44333a0dc77e44798ee028a4ac3c5f15a882c8860611459e5e5a67d7708ad03b',
  sourceRegion: 'cbc1be3afbe7e1c659cc9f598ae379a8a47a7b287b3b572a3fc0886304b7389d',
  postComplete: '940245ec1329f9dd672e3aff70d3084aacd4d632896c0d2e8bc2d62a8776f1ca',
  postRegion: 'cc6a76257c31208a0e1252a84c92df806fc8d5da9c22c8bd4d892f58b92975fc',
  forward: '1109ba42b4f451dae8ef09f346e858f59cea8a91a56d31adbee77654320fd511',
  rollback: '3e6dc7bc27b819288e52e5399e760a8ba5c77524bffe3d7ed81e5dca9224474b',
  execution: '4261a31721288363d5bb6c71b9bdd75351d91a99ab73bf5430f9217139f7461d',
  journal: 'd0d1815d8468f5f57b9b89f50ae3324af6abe574c5dd8f17c7fb4e55e8e2b827',
  rollbackPreflight: '60418623248b95e64a5443706021330dd8716867d05d9f0780ec19ab1c0743b6',
  proof: '87196d8c6de39711c06582131435653c3c31cba1f131987e6865846fc001469e',
  proofPayload: 'b7f3360f304f0b99f6e9829970f3e807aebd1795bcfb99d82063ab95648db713',
  target: '25f09aebcb490dcf1815d172ff04417445aedb495386d7e1011694b33187fcdb',
});
const R12P_EXPECTED = Object.freeze({
  ledger: '722353496b712a0a9044209085038295d0248d97055a7752caeababb3914d7ae',
  manifest: '47322de4686b577fc7c6b4230bea70f3536a8cff5b014919fcf5acbdbe0c6319',
  identity: 'b92a85b057adf11e38f690b9d254162bb7243c5929d14cb78033092901bfc86b',
  sourceBound: '1673cecc450ad21596b9652c96741637b0379dbd7ae457391d55bae68b4025e3',
  completed: 'dd8ab0fd4cf218281125c233c59e602d2d10c4c9573ca298220ac8efa27c3f64',
  sourceComplete: '8d6986dcc723e0027db385eb5c729b3d71c17f9668750b1a60a25490fbdf58e5',
  sourceRegion: '84939f636b49a3b110afb10161eb86715fac6a7bd4933b26156cfc0abcb2b415',
  postComplete: 'ba310ac8e4163fd95fb6b765b57e9d7ff577867f0f10fd29870f5655c63656ad',
  postRegion: '18ae22394785467bbb9dc284fe2975c55cb4631ff1ef0830422182eaf5131702',
  forward: '8a43d8d438a8a9d7559886d07fe9917c03df149445c14cbf6a95ab1038b37cbe',
  rollback: '34d3ba3ea120b1cc7642285e4ee5995c891cf9d10c054d3891bee8f8be0f3a70',
  execution: '91b0ccd2ccd7621f74dbc05a30ca1002da1b72043ecd4c0f5fabbdf12a9232e4',
  journal: 'cef662f45a38edc9ab21cc0301d7ce5f3e806bdab67cc719b84e5073df4207c3',
  rollbackPreflight: 'a87f415dceb0886f3debc1d1e8d97c17e050121a24661bb1a122275aac94ec47',
  proof: 'e0c7b9868593c91f3b9aab89d0bb5fbcd680dcdb3fc06c32940164b1da15aee5',
  proofPayload: '8ffe8ba98ddbb46fad9a1adf72c8ed36cad97bcc579c4bee6be19c0de4d3d7e1',
  target: 'ade4597321fc40ebba2313b282b240c19fdabfeae5cc86f6887cf3ce5392b603',
});
const R12Q_EXPECTED = Object.freeze({
  ledger: '9c2bb1ebd3bdb7f6f121769f53d66d55aee4b8d4ab384a6395e94548e0985b8e',
  manifest: 'c2d559b6fe904f9729be2227c5b20959090d6f42bebca500425ea33ef704dbcc',
  identity: '0c4a20f3b6c7f3fe2d848fb13f6085ac5559e0d3fa0185c8b3976097c4278341',
  sourceBound: '114d90124109d55022017a42df141b176856c4a5f81270fa3b75fb681d79dc29',
  completed: 'ee059a2d4ac5f030a392ba275487dd2f0083ba7dd3e1379de8ac656e02a49c91',
  sourceComplete: '7e9abb3c03b10b99be25c2dfeaa6ff142517b1ec1877ca220c60f904e93e315c',
  sourceRegion: 'e04ba448a19fd8dc234ecf7e65a58b3423356fd687532946da271246bc27afc0',
  postComplete: 'ff40e5e40c7f144694b80ede6e600a21ed266f0ad4b5069a36c8c78b35478e55',
  postRegion: '1732b30ba39b6b81dd88d0985b9018ba399c41bec295d12397004e20fbe97274',
  forward: '402fd53bf3c249125c8d556d6dd304f0b225b69ec271e31f9c668ea9a1d01c7b',
  rollback: '547b97c3d05279ae38a8539f887f4fa84e89acc4e9f8a474d530da345c818e7b',
  execution: '36c6c5309aa6de89aba94b090baf733a1c391be7c1235e9b5ca345ced1644506',
  journal: '2d64b104d8395a04ba8786d8fbc5d39683bddcb4c82e97990d42e87c4534bc81',
  rollbackPreflight: 'd89280782fcbbf50a6105f3ffcc0da956f30d8bae7b8f2dc55574386a15a3465',
  proof: 'e749c20546f6773801ecff318a70c59af4c947673f0c27a402ba26e63929a54c',
  proofPayload: '7100e594e3f0bb4c62464a3ff9a6ffbe137ef9927135b4504082974bce460310',
  target: '021919255d63bd29c496a22493a9719131890f7c10b793c28ebdb7f1fc940984',
  blockEntity: '789c9e3977c45e1b80f9c676b074241125c53da90b60262bbff22af72e5fd6a3',
  liveEntity: 'f89d90cfc0d1b98638943f79260b2d778d7e24e4668c60ac5cf6e37bb99dd560',
  sameMomentEntity: '7c16ce5a1eae8cb85b1dff397ee779f64932cca121781194d56110970d384ff7',
});
const EXPECTED = IS_R12Q ? R12Q_EXPECTED : IS_R12P ? R12P_EXPECTED
  : IS_R12N ? R12N_EXPECTED : IS_R12L ? R12L_EXPECTED : R12K_EXPECTED;
const AIR = 'minecraft:air';
const PD = 'minecraft:polished_diorite';
const ASC = 'minecraft:rail[shape=ascending_west,waterlogged=false]';
const EW = 'minecraft:rail[shape=east_west,waterlogged=false]';
const NS = 'minecraft:rail[shape=north_south,waterlogged=false]';
const ASC_NORTH = 'minecraft:rail[shape=ascending_north,waterlogged=false]';
const NORTH_EAST = 'minecraft:rail[shape=north_east,waterlogged=false]';
const NORTH_WEST = 'minecraft:rail[shape=north_west,waterlogged=false]';
const SOUTH_WEST = 'minecraft:rail[shape=south_west,waterlogged=false]';
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const binding = (filename) => ({ path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))), bytes: fs.statSync(absolute(filename)).size });
const invariant = (condition, message) => {
  if (!condition) throw new Error(`${PROFILE.toUpperCase()} post-QA rejected: ${message}`);
};
const parse = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
  .filter((line) => line.startsWith('REPL ')).map((line) => {
    const fields = line.split(/\s+/);
    return { cell: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) },
      from: fields[7], to: fields[8] };
  });

const ledger = readJson(LEDGER);
const manifest = readJson(MANIFEST);
const proof = readJson(PROOF);
invariant(binding(LEDGER).sha256 === EXPECTED.ledger
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.sourceBoundReleaseIdentitySha256 === EXPECTED.sourceBound
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completed, 'ledger identity drifted');
invariant(binding(MANIFEST).sha256 === EXPECTED.manifest
  && manifest.manifestIdentity === EXPECTED.identity
  && ledger.manifest.sha256 === EXPECTED.manifest, 'manifest identity drifted');
invariant(binding(PROOF).sha256 === EXPECTED.proof
  && proof.proofPayloadSha256 === EXPECTED.proofPayload
  && proof.disposition[IS_R12Q ? 'exactFiveHundredFiftyTwoCellConnectedPostTopologyProven'
    : IS_R12P ? 'exactThreeHundredCellConnectedPostTopologyProven'
    : IS_R12N ? 'exactTwoHundredThirtyNineCellConnectedPostTopologyProven'
    : IS_R12L ? 'exactThirtySixCellConnectedPostTopologyProven'
      : 'exactFifteenCellConnectedPostTopologyProven'],
  'exact Paper proof drifted');
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceComplete
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postComplete
  && sourceIdentity.sha256 === EXPECTED.sourceRegion && postIdentity.sha256 === EXPECTED.postRegion,
  'immutable source/post binding drifted');

const forwardPath = manifest.packages[0].forward;
const rollbackPath = manifest.packages[0].rollback;
invariant(binding(forwardPath).sha256 === EXPECTED.forward
  && binding(rollbackPath).sha256 === EXPECTED.rollback, 'operation identity drifted');
const forward = parse(forwardPath);
const rollback = parse(rollbackPath);
const targetCount = IS_R12Q ? 2 : IS_R12P ? 61 : IS_R12N ? 123 : 7;
invariant(forward.length === targetCount && rollback.length === targetCount
  && hashCells(forward.map(({ cell }) => cell)) === EXPECTED.target
  && rollback.every((operation, index) => {
    const source = forward[forward.length - 1 - index];
    return cellKey(operation.cell) === cellKey(source.cell)
      && operation.from === source.to && operation.to === source.from;
  }), 'operation order/inverse drifted');
const targets = forward.map(({ cell }) => cell);
const targetKeys = new Set(targets.map(cellKey));
const support = targets.map(({ x, y, z }) => ({ x, y: y - 1, z }));
const headroom = targets.map(({ x, y, z }) => ({ x, y: y + 1, z }));
const halo = dilateCells(targets, 1);
const r12qProduction = (entry) => ({
  x: 2048 + entry.x, y: 66 + entry.y, z: entry.z - 748, state: entry.state,
});
const connectedResult = IS_R12Q ? proof.geometry.exactConnectedStatesLowToHigh.map(r12qProduction)
  : IS_R12P ? proof.geometry.exactConnectedStatesLowToHigh.map((entry) => ({
  x: 2049 + entry.x, y: 65 + entry.y, z: entry.z - 768, state: entry.state,
})) : IS_R12N ? proof.geometry.exactConnectedStatesLowToHigh.map((entry) => ({
  x: 2287 + entry.x, y: 65 + entry.y, z: -768, state: entry.state,
})) : IS_R12L ? proof.geometry.exactConnectedStatesLowToHigh.map((entry, index) => ({
  x: 2287 - index, y: entry.y + 65, z: -768, state: entry.state,
})) : [
  { x: 2266, y: 145, z: -768, state: ASC }, { x: 2265, y: 146, z: -768, state: ASC },
  { x: 2264, y: 147, z: -768, state: ASC }, { x: 2263, y: 148, z: -768, state: EW },
  ...forward.slice().reverse().map(({ cell, to }) => ({ ...cell, state: to })),
  { x: 2255, y: 153, z: -768, state: ASC }, { x: 2254, y: 154, z: -768, state: ASC },
  { x: 2253, y: 155, z: -768, state: ASC }, { x: 2252, y: 156, z: -768, state: EW },
];
const expectedConnectedCount = IS_R12Q ? 552 : IS_R12P ? 300 : IS_R12N ? 239 : IS_R12L ? 36 : 15;
invariant(connectedResult.length === expectedConnectedCount
  && uniqueCells(connectedResult).length === expectedConnectedCount,
  'connected geometry drifted');
const interfaces = IS_R12Q
  ? proof.geometry.exactConnectedStatesLowToHigh
    .filter(({ role }) => ['i239-accepted', 'i241-accepted', 'i259-accepted', 'i261-accepted'].includes(role))
    .map(r12qProduction)
  : [];
const lowerCap = cellsIn(manifest.scope.geometry.retainedLowerB08Cap.bounds);
const summitCap = cellsIn(manifest.scope.geometry.retainedSummitZ11Cap.bounds);
const sourceReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(absolute(path.join(ledger.postSnapshot.root, 'region')));
async function records(reader, cells) {
  const output = [];
  for (const cell of uniqueCells(cells)) output.push({ cell,
    state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
  return output;
}
const [sourceTargets, postTargets, sourceSupport, postSupport, sourceHeadroom, postHeadroom,
  sourceCaps, postCaps, sourceHalo, postHalo, postConnected, sourceInterfaces, postInterfaces] = await Promise.all([
  records(sourceReader, targets), records(postReader, targets),
  records(sourceReader, support), records(postReader, support),
  records(sourceReader, headroom), records(postReader, headroom),
  records(sourceReader, [...lowerCap, ...summitCap]), records(postReader, [...lowerCap, ...summitCap]),
  records(sourceReader, halo), records(postReader, halo), records(postReader, connectedResult),
  records(sourceReader, interfaces), records(postReader, interfaces),
]);
invariant(sourceTargets.every(({ state }) => state === AIR)
  && postTargets.every(({ cell, state }) => forward.some((entry) => (
    cellKey(entry.cell) === cellKey(cell) && entry.to === state)))
  && [...sourceSupport, ...postSupport].every(({ state }) => state === PD)
  && [...sourceHeadroom, ...postHeadroom].every(({ state }) => state === AIR)
  && [...sourceCaps, ...postCaps].every(({ state }) => state === PD),
  'target/support/headroom/cap state failed');
invariant(!IS_R12Q || (interfaces.length === 4
  && [...sourceInterfaces, ...postInterfaces].every(({ cell, state }) => connectedResult.some((rail) => (
    cellKey(rail) === cellKey(cell) && rail.state === state)))),
'four accepted turn interfaces failed');
const haloDiff = sourceHalo.filter((record, index) => record.state !== postHalo[index].state);
invariant(haloDiff.length === targetCount && haloDiff.every(({ cell }) => targetKeys.has(cellKey(cell))),
  'halo drift failed');
invariant(postConnected.every(({ cell, state }) => connectedResult.some((rail) => (
  cellKey(rail) === cellKey(cell) && rail.state === state))), `${expectedConnectedCount} exact states failed`);
const neighbours = connectedResult.map((cell) => connectedResult.filter((other) => (
  cellKey(other) !== cellKey(cell) && Math.abs(other.x - cell.x) + Math.abs(other.z - cell.z) === 1
  && Math.abs(other.y - cell.y) <= 1)).length);
invariant(neighbours.filter((count) => count === 1).length === 2
  && neighbours.filter((count) => count === 2).length === expectedConnectedCount - 2
  && neighbours.every((count) => count >= 1 && count <= 2), `${expectedConnectedCount}-cell topology failed`);

const d05 = readJson(D05);
const connectors = readJson(CONNECTORS);
const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
const accommodation = buildB09MinimumReservation(model.formula,
  connectors.funicularFaceComparison.designEndpoints);
const [sourceB09, postB09] = await Promise.all([
  records(sourceReader, accommodation), records(postReader, accommodation),
]);
const b09Diff = sourceB09.filter((record, index) => record.state !== postB09[index].state);
const sourceRails = sourceB09.filter(({ state }) => state.startsWith('minecraft:rail['));
const postRails = postB09.filter(({ state }) => state.startsWith('minecraft:rail['));
const postRailCensus = postRails.reduce((counts, { state }) => ({ ...counts,
  [state]: (counts[state] ?? 0) + 1 }), {});
const preservedPrior = sourceRails.every(({ cell, state }) => postB09.some((post) => (
  cellKey(post.cell) === cellKey(cell) && post.state === state)));
const expectedPriorRailCount = IS_R12Q ? 550 : IS_R12P ? 489 : IS_R12N ? 366 : IS_R12L ? 359 : 352;
const expectedPostRailCount = expectedPriorRailCount + targetCount;
invariant(accommodation.length === 7_800 && sourceRails.length === expectedPriorRailCount
  && postRails.length === expectedPostRailCount
  && preservedPrior && b09Diff.length === targetCount
  && b09Diff.every(({ cell }) => targetKeys.has(cellKey(cell)))
  && postRailCensus[EW] === (IS_R12Q || IS_R12P ? 354 : IS_R12N ? 354 : IS_R12L ? 321 : 319)
  && postRailCensus[ASC] === (IS_R12Q || IS_R12P ? 116 : IS_R12N ? 116 : IS_R12L ? 26 : 21)
  && postRailCensus[NS] === (IS_R12Q || IS_R12P ? 21 : 19)
  && (!IS_R12P || (postRailCensus[ASC_NORTH] === 58 && postRailCensus[NORTH_EAST] === 1)),
  'prior rail preservation, B09 diff, or shape census failed');
invariant(!IS_R12Q || (postRailCensus[ASC_NORTH] === 58
  && postRailCensus[NORTH_EAST] === 1 && postRailCensus[NORTH_WEST] === 1
  && postRailCensus[SOUTH_WEST] === 1), 'R12Q complete rail shape census failed');

const executionPath = path.join(EVIDENCE, `${PACKAGE}.forward-execution.json`);
const journalPath = `${executionPath}.stream-journal.jsonl`;
const rollbackPreflightPath = path.join(EVIDENCE, `${PACKAGE}.rollback-poststate-preflight.json`);
const execution = readJson(executionPath);
const journal = fs.readFileSync(absolute(journalPath), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const rollbackPreflight = readJson(rollbackPreflightPath);
const blockEntityPath = path.join(EVIDENCE, 'block-entity-clearance.json');
const liveEntityPath = path.join(EVIDENCE, 'live-entity-clearance.json');
const sameMomentEntityPath = path.join(EVIDENCE, `${PACKAGE}.same-moment-entity-clearance.json`);
const blockEntityEvidence = IS_R12Q ? readJson(blockEntityPath) : null;
const liveEntityEvidence = IS_R12Q ? readJson(liveEntityPath) : null;
const sameMomentEntityEvidence = IS_R12Q ? readJson(sameMomentEntityPath) : null;
invariant(binding(executionPath).sha256 === EXPECTED.execution
  && execution.status === 'complete' && execution.strictNoop === true
  && execution.successfulGroups === targetCount && execution.failedGroups === 0
  && execution.noopCommands === 0 && execution.unknownReplyCommands === 0
  && execution.worldEditLeftoverCount === 0 && execution.forceLoadAudit.allTemporaryReleased
  && execution.forceLoadAudit.finalSetMatchesPreExistingSet, 'strict execution failed');
const expectedJournalCount = IS_R12Q ? 10 : IS_R12P ? 128 : IS_R12N ? 252 : 20;
invariant(binding(journalPath).sha256 === EXPECTED.journal
  && execution.streamJournalSha256 === EXPECTED.journal && journal.length === expectedJournalCount
  && journal.every((entry, index) => entry.sequence === index + 1)
  && journal.at(-1).status === 'complete' && journal.at(-1).batch.status === 'completed-cleaned'
  && journal.at(-1).batch.completedGroupCount === targetCount, 'journal failed');
invariant(binding(rollbackPreflightPath).sha256 === EXPECTED.rollbackPreflight
  && rollbackPreflight.status === 'PASS' && rollbackPreflight.operationCount === targetCount
  && rollbackPreflight.passed === targetCount && rollbackPreflight.failed === 0
  && rollbackPreflight.regionsSnapshot.sha256 === EXPECTED.postRegion, 'rollback preflight failed');
invariant(!IS_R12Q || (binding(blockEntityPath).sha256 === EXPECTED.blockEntity
  && blockEntityEvidence.status === 'PASS' && blockEntityEvidence.operationCount === targetCount
  && blockEntityEvidence.blockingBlockEntityCount === 0 && blockEntityEvidence.chunksMissing === 0
  && binding(liveEntityPath).sha256 === EXPECTED.liveEntity
  && binding(sameMomentEntityPath).sha256 === EXPECTED.sameMomentEntity
  && [liveEntityEvidence, sameMomentEntityEvidence].every((evidence) => evidence.status === 'PASS'
    && evidence.totals.packages === 1 && evidence.totals.passed === 1
    && evidence.totals.failed === 0 && evidence.totals.entitiesReturnedInEnvelopes === 0
    && evidence.totals.blockingEntityHits === 0 && evidence.totals.blockerNbtCaptures === 0
    && evidence.totals.blockerNbtCaptureErrors === 0)), 'entity/block-entity evidence failed');
invariant(ledger.stages.length === 17 && ledger.stages.every(({ status }) => status === 'PASS')
  && ledger.evidenceBindings.length === 17
  && ledger.evidenceBindings.every((entry) => binding(entry.path).sha256 === entry.sha256),
  'stages/evidence bindings failed');

const checks = [
  'ledger-manifest-completed-identity', 'source-post-immutable-saves',
  'seventeen-stages-and-evidence-bindings', 'exact-paper-proof',
  IS_R12Q ? 'exact-two-lower-turn-states-and-order'
    : IS_R12P ? 'exact-61-summit-return-states-and-order'
    : IS_R12N ? 'exact-123-states-and-order' : 'exact-seven-states-and-order',
  'reverse-order-inverse', IS_R12Q ? 'two-supports' : IS_R12P ? '61-supports' : IS_R12N ? '123-supports' : 'seven-supports',
  IS_R12Q ? 'two-headroom' : IS_R12P ? '61-headroom' : IS_R12N ? '123-headroom' : 'seven-headroom',
  ...(IS_R12Q ? ['four-accepted-turn-interfaces-preserved'] : []),
  IS_R12Q ? 'continuous-9-560-connected-unbranched-topology'
    : IS_R12P ? 'continuous-261-560-connected-unbranched-topology'
    : IS_R12N ? 'continuous-261-499-connected-unbranched-topology'
    : IS_R12L ? 'continuous-261-296-connected-unbranched-topology'
      : 'fifteen-cell-connected-unbranched-topology',
  `all-${expectedPriorRailCount}-prior-rails-preserved`, 'both-external-caps-preserved',
  IS_R12Q ? 'halo-two-declared-zero-undeclared'
    : IS_R12P ? 'halo-61-declared-zero-undeclared'
    : IS_R12N ? 'halo-123-declared-zero-undeclared' : 'halo-seven-declared-zero-undeclared',
  IS_R12Q ? 'b09-two-declared-zero-undeclared'
    : IS_R12P ? 'b09-61-declared-zero-undeclared'
    : IS_R12N ? 'b09-123-declared-zero-undeclared' : 'b09-seven-declared-zero-undeclared',
  `exact-${expectedPostRailCount}-rail-shape-census`,
  IS_R12Q ? 'strict-two-group-execution'
    : IS_R12P ? 'strict-61-group-execution'
    : IS_R12N ? 'strict-123-group-execution' : 'strict-seven-group-execution',
  IS_R12Q ? 'complete-ten-entry-journal'
    : IS_R12P ? 'complete-128-entry-journal'
    : IS_R12N ? 'complete-252-entry-journal' : 'complete-twenty-entry-journal',
  IS_R12Q ? 'rollback-two-of-two'
    : IS_R12P ? 'rollback-61-of-61'
    : IS_R12N ? 'rollback-123-of-123' : 'rollback-seven-of-seven',
  ...(IS_R12Q ? ['block-and-live-entity-evidence'] : []),
  'no-operational-overclaim-or-qa-mutation',
].map((id) => ({ id, status: 'PASS' }));
const reportWithoutIdentity = {
  schemaVersion: 1,
  qaId: IS_R12Q
    ? 'CZ-R12Q-P1-B09-LOWER-TWO-TURN-RAIL-CLOSURE-POST-QA'
    : IS_R12P
    ? 'CZ-R12P-P1-B09-CONTINUOUS-261-560-SIXTY-ONE-CELL-SUMMIT-RETURN-RAIL-CLOSURE-POST-QA'
    : IS_R12N
    ? 'CZ-R12N-P1-B09-CONTINUOUS-261-499-ONE-HUNDRED-TWENTY-THREE-CELL-RAIL-ADJACENCY-CLOSURE-POST-QA'
    : IS_R12L ? 'CZ-R12L-P1-B09-CONTINUOUS-261-296-SEVEN-CELL-RAIL-ADJACENCY-CLOSURE-POST-QA'
      : 'CZ-R12K-P1-B09-R12H-R12I-SEVEN-CELL-RAIL-ADJACENCY-CLOSURE-POST-QA',
  status: IS_R12Q
    ? 'PASS_EXACT_TWO_CELL_LOWER_TURN_CLOSURE_AND_CONTINUOUS_9_560_TOPOLOGY_PRESERVED'
    : IS_R12P
    ? 'PASS_EXACT_SIXTY_ONE_CELL_SUMMIT_RETURN_CLOSURE_AND_CONTINUOUS_261_560_TOPOLOGY_PRESERVED'
    : IS_R12N
    ? 'PASS_EXACT_ONE_HUNDRED_TWENTY_THREE_CELL_ADJACENCY_CLOSURE_AND_CONTINUOUS_261_499_TOPOLOGY_PRESERVED'
    : IS_R12L ? 'PASS_EXACT_SEVEN_CELL_ADJACENCY_CLOSURE_AND_CONTINUOUS_261_296_TOPOLOGY_PRESERVED'
      : 'PASS_EXACT_SEVEN_CELL_ADJACENCY_CLOSURE_AND_FIFTEEN_CELL_TOPOLOGY_PRESERVED',
  generatedAtUtc: value('--generated-at', IS_R12Q ? '2026-08-22T04:55:00Z'
    : IS_R12P ? '2026-08-22T04:38:00Z'
    : IS_R12N ? '2026-08-22T04:15:00Z'
    : IS_R12L ? '2026-08-22T03:55:00Z' : '2026-08-22T03:30:00Z'),
  ledger: binding(LEDGER), manifest: binding(MANIFEST),
  runtimeProof: { binding: binding(PROOF), proofPayloadSha256: EXPECTED.proofPayload,
    exactProductionPaperVersion: proof.runtime.expectedVersion },
  sourceSnapshot: { root: ledger.sourceSnapshot.root, completeSaveSha256: EXPECTED.sourceComplete,
    regionSha256: EXPECTED.sourceRegion },
  postSnapshot: { root: ledger.postSnapshot.root, completeSaveSha256: EXPECTED.postComplete,
    regionSha256: EXPECTED.postRegion },
  releaseIdentity: { sourceBoundReleaseIdentitySha256: EXPECTED.sourceBound,
    completedReleaseIdentitySha256: EXPECTED.completed },
  exactPostState: { operatedCellCount: targetCount, targetCoordinateSetSha256: EXPECTED.target,
    ascendingWestCellCount: IS_R12Q || IS_R12P ? 0 : IS_R12N ? 90 : 5,
    eastWestCellCount: IS_R12Q || IS_R12P ? 0 : IS_R12N ? 33 : 2,
    ...(IS_R12Q ? { northWestTurnCellCount: 1, southWestTurnCellCount: 1,
      preservedInterfaceCellCount: 4 } : {}),
    ...(IS_R12P ? { ascendingNorthCellCount: 58, northSouthCellCount: 2,
      northEastTurnCellCount: 1 } : {}),
    supportPassCount: targetCount, headroomPassCount: targetCount,
    resultingConnectedComponent: { cellCount: expectedConnectedCount,
      componentCount: 1, endpointCount: 2, interiorCellCount: expectedConnectedCount - 2,
      branchCellCount: 0 } },
  preservation: { priorRailCount: expectedPriorRailCount, postRailCount: expectedPostRailCount,
    lowerCapCellCount: 12, summitCapCellCount: 12,
    haloDeclaredDifferenceCount: targetCount, haloUndeclaredDifferenceCount: 0,
    b09DeclaredDifferenceCount: targetCount, b09UndeclaredDifferenceCount: 0, postRailCensus },
  lifecycle: { stageCount: 17, evidenceBindingCount: 17, journalEntryCount: expectedJournalCount,
    journalSha256: EXPECTED.journal, rollbackGuardPassCount: targetCount },
  ...(IS_R12Q ? { entityEvidence: { blockEntityClearance: binding(blockEntityPath),
    liveEntityClearance: binding(liveEntityPath),
    sameMomentEntityClearance: binding(sameMomentEntityPath),
    blockingBlockEntityCount: 0, blockingEntityHitCount: 0 } } : {}),
  disposition: { passiveRailAdjacencyClosureAsBuilt: true,
    resultingConnectedPassiveRailCellCount: expectedConnectedCount, turnRailInstalled: IS_R12Q || IS_R12P,
    activeSystemInstalled: false, funicularCommissioned: false,
    passengerOrRescueRouteCommissioned: false, liveCallsPerformedByQa: false,
    worldMutationsPerformedByQa: false },
  checks, summary: { passed: true, checkCount: checks.length, passCount: checks.length, failCount: 0 },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN), `# CZ-${PROFILE.toUpperCase()} post-release QA\n\n`
  + `**Status:** ${report.status}  \n**QA payload:** \`${qaPayloadSha256}\`\n\n`
  + `- Exact states/support/headroom: ${targetCount}/${targetCount}; resulting topology: one unbranched ${expectedConnectedCount}-cell component.\n`
  + `- All ${expectedPriorRailCount} prior rails and both caps are preserved; B09/halo drift is zero beyond ${IS_R12Q || IS_R12P ? targetCount : 'seven'} targets.\n`
  + `- Wrapper 17/17, journal${expectedJournalCount}, rollback${targetCount}/${targetCount}. Active systems and transport remain uncommissioned.\n`);
console.log(JSON.stringify({ status: report.status, output: relative(OUT), qaPayloadSha256,
  checkCount: checks.length, liveCallsPerformed: false }, null, 2));
