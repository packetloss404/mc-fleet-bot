#!/usr/bin/env node
/** Compile CZ-R12K: exact seven-cell R12H/R12I passive-rail adjacency closure. */

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
const PROFILE = value('--profile', 'r12k');
if (!['r12k', 'r12l', 'r12n', 'r12p', 'r12q'].includes(PROFILE)) throw new Error(`unsupported compiler profile ${PROFILE}`);
const IS_R12L = PROFILE === 'r12l';
const IS_R12N = PROFILE === 'r12n';
const IS_R12P = PROFILE === 'r12p';
const IS_R12Q = PROFILE === 'r12q';
const GENERATED_AT = value('--generated-at', IS_R12Q ? '2026-08-22T04:48:00Z'
  : IS_R12P ? '2026-08-22T04:28:00Z'
  : IS_R12N ? '2026-08-22T04:08:00Z'
  : IS_R12L ? '2026-08-22T03:38:00Z' : '2026-08-22T03:12:00Z');
const SNAPSHOT = value('--snapshot', IS_R12Q ? 'data/worldsnap-r12p-post-20260822T043204Z'
  : IS_R12P ? 'data/worldsnap-r12n-post-20260822T040651Z'
  : IS_R12N ? 'data/worldsnap-r12l-post-20260822T034902Z'
  : IS_R12L ? 'data/worldsnap-r12k-post-20260822T032114Z'
    : 'data/worldsnap-r12j-post-20260822T025647Z');
const INTAKE = value('--intake-audit',
  IS_R12Q
    ? 'data/world-review/combined-zones-r12p-live-20260822T043204Z/post-complete-save-intake.json'
    : IS_R12P
    ? 'data/world-review/combined-zones-r12n-live-20260822T040651Z/post-complete-save-intake.json'
    : IS_R12N
    ? 'data/world-review/combined-zones-r12l-live-20260822T034902Z/post-complete-save-intake.json'
    : IS_R12L
    ? 'data/world-review/combined-zones-r12k-live-20260822T032114Z/post-complete-save-intake.json'
    : 'data/world-review/combined-zones-r12j-live-20260822T025647Z/post-complete-save-intake.json');
const SOURCE_LEDGER = value('--source-ledger',
  IS_R12Q
    ? 'data/world-review/combined-zones-r12p-live-20260822T043204Z/evidence-ledger.json'
    : IS_R12P
    ? 'data/world-review/combined-zones-r12n-live-20260822T040651Z/evidence-ledger.json'
    : IS_R12N
    ? 'data/world-review/combined-zones-r12l-live-20260822T034902Z/evidence-ledger.json'
    : IS_R12L
    ? 'data/world-review/combined-zones-r12k-live-20260822T032114Z/evidence-ledger.json'
    : 'data/world-review/combined-zones-r12j-live-20260822T025647Z/evidence-ledger.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const CANONICAL_BUILDOPS_DIR = 'data/buildops';
const BASENAME = value('--basename',
  IS_R12Q
    ? 'combined-zones-r12q-b09-lower-two-turn-rail-closure'
    : IS_R12P
    ? 'combined-zones-r12p-b09-continuous-261-560-sixty-one-cell-summit-return-rail-closure'
    : IS_R12N
    ? 'combined-zones-r12n-b09-continuous-261-499-one-hundred-twenty-three-cell-rail-adjacency-closure'
    : IS_R12L
    ? 'combined-zones-r12l-b09-continuous-261-296-seven-cell-rail-adjacency-closure'
    : 'combined-zones-r12k-b09-r12h-r12i-seven-cell-rail-adjacency-closure');
const RELEASE_ID = IS_R12Q
  ? 'CZ-R12Q-P1-B09-LOWER-TWO-TURN-RAIL-CLOSURE'
  : IS_R12P
  ? 'CZ-R12P-P1-B09-CONTINUOUS-261-560-SIXTY-ONE-CELL-SUMMIT-RETURN-RAIL-CLOSURE'
  : IS_R12N
  ? 'CZ-R12N-P1-B09-CONTINUOUS-261-499-ONE-HUNDRED-TWENTY-THREE-CELL-RAIL-ADJACENCY-CLOSURE'
  : IS_R12L ? 'CZ-R12L-P1-B09-CONTINUOUS-261-296-SEVEN-CELL-RAIL-ADJACENCY-CLOSURE'
    : 'CZ-R12K-P1-B09-R12H-R12I-SEVEN-CELL-RAIL-ADJACENCY-CLOSURE';
const RELEASE_NODE_ID = 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING';
const PACKAGE_KEY = IS_R12Q
  ? 'b09-lower-two-turn-rail-closure'
  : IS_R12P
  ? 'b09-continuous-261-560-sixty-one-cell-summit-return-rail-closure'
  : IS_R12N
  ? 'b09-continuous-261-499-one-hundred-twenty-three-cell-rail-adjacency-closure'
  : IS_R12L ? 'b09-continuous-261-296-seven-cell-rail-adjacency-closure'
    : 'b09-r12h-r12i-seven-cell-rail-adjacency-closure';
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const ASC = 'minecraft:rail[shape=ascending_west,waterlogged=false]';
const ASC_NORTH = 'minecraft:rail[shape=ascending_north,waterlogged=false]';
const EW = 'minecraft:rail[shape=east_west,waterlogged=false]';
const NS = 'minecraft:rail[shape=north_south,waterlogged=false]';
const NORTH_EAST = 'minecraft:rail[shape=north_east,waterlogged=false]';
const NORTH_WEST = 'minecraft:rail[shape=north_west,waterlogged=false]';
const SOUTH_WEST = 'minecraft:rail[shape=south_west,waterlogged=false]';
const INPUTS = Object.freeze({
  d05: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  contract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  authorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  relics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  predecessorManifest: IS_R12Q
    ? 'data/buildops/combined-zones-r12p-b09-continuous-261-560-sixty-one-cell-summit-return-rail-closure.release-manifest.json'
    : IS_R12P
    ? 'data/buildops/combined-zones-r12n-b09-continuous-261-499-one-hundred-twenty-three-cell-rail-adjacency-closure.release-manifest.json'
    : IS_R12N
    ? 'data/buildops/combined-zones-r12l-b09-continuous-261-296-seven-cell-rail-adjacency-closure.release-manifest.json'
    : IS_R12L
      ? 'data/buildops/combined-zones-r12k-b09-r12h-r12i-seven-cell-rail-adjacency-closure.release-manifest.json'
      : 'data/buildops/combined-zones-r12j-b09-r12f-r12g-seven-cell-rail-adjacency-closure.release-manifest.json',
  predecessorQa: IS_R12Q
    ? 'data/world-review/combined-zones-r12p-live-20260822T043204Z/r12p-post-release-qa.json'
    : IS_R12P
    ? 'data/world-review/combined-zones-r12n-live-20260822T040651Z/r12n-post-release-qa.json'
    : IS_R12N
    ? 'data/world-review/combined-zones-r12l-live-20260822T034902Z/r12l-post-release-qa.json'
    : IS_R12L
      ? 'data/world-review/combined-zones-r12k-live-20260822T032114Z/r12k-post-release-qa.json'
      : 'data/world-review/combined-zones-r12j-live-20260822T025647Z/r12j-post-release-qa.json',
  runtimeProof:
    IS_R12Q
      ? 'data/world-review/combined-zones-r12q-b09-lower-two-turn-closure-runtime-proof-20260822T044200Z/runtime-proof.json'
      : IS_R12P
      ? 'data/world-review/combined-zones-r12p-b09-continuous-261-560-runtime-proof-20260822T042000Z/runtime-proof.json'
      : IS_R12N
      ? 'data/world-review/combined-zones-r12n-b09-continuous-261-499-runtime-proof-20260822T040200Z/runtime-proof.json'
      : IS_R12L
      ? 'data/world-review/combined-zones-r12l-b09-adjacency-closure-runtime-proof-20260822T033400Z/runtime-proof.json'
      : 'data/world-review/combined-zones-r12k-b09-adjacency-closure-runtime-proof-20260822T030800Z/runtime-proof.json',
});
const EXPECTED = Object.freeze({
  sourceComplete: IS_R12Q ? 'ba310ac8e4163fd95fb6b765b57e9d7ff577867f0f10fd29870f5655c63656ad'
    : IS_R12P ? '940245ec1329f9dd672e3aff70d3084aacd4d632896c0d2e8bc2d62a8776f1ca'
    : IS_R12N ? 'aca20b199c0b4449af8d71d1e4beb745737485316676c6e026c6494e22a5c4c5'
    : IS_R12L ? '75fa7fd46dd3fc7ab606735b14d9cada3bb0b6f1cd217cc81b6d7a9c62d8247a'
      : 'b814512643bc92ef3b0932b35f8fe12c984355dd0edb22c6e61d15130f9d38c9',
  sourceRegion: IS_R12Q ? '18ae22394785467bbb9dc284fe2975c55cb4631ff1ef0830422182eaf5131702'
    : IS_R12P ? 'cc6a76257c31208a0e1252a84c92df806fc8d5da9c22c8bd4d892f58b92975fc'
    : IS_R12N ? 'f90f87dbd4b716eb44530794fe26a713109c67dee0f364a1f6a4903bc70611e9'
    : IS_R12L ? 'e478096bef5637c329b62a5955e1e8d700788762de432720e99abe37b55a748a'
      : 'f8aad22ebf1a95182a3e8989f51f814cbd4217d85c7e73ee85be8b2c6ca4bcfb',
  sourceLedger: IS_R12Q ? '722353496b712a0a9044209085038295d0248d97055a7752caeababb3914d7ae'
    : IS_R12P ? '6987da40b3f50cfe98cd2ac456fe2dfaba083b13f434a482924968606e7746c7'
    : IS_R12N ? 'ab2f6b19d44f1180e2fe9566696e11acae0dfd8b85974d383beb339df4814f65'
    : IS_R12L ? 'cb177afa39c74212059f327dc2f0a9d904864291b807652700ba1e6e03f4d2dd'
      : 'eb800fa74fad3d8227e355b83c12ac6f19d996cc898ed02ae077c4f6e8d6a75a',
  sourceCompleted: IS_R12Q ? 'dd8ab0fd4cf218281125c233c59e602d2d10c4c9573ca298220ac8efa27c3f64'
    : IS_R12P ? '6b5752472621525ef576b6f5f3c28cfbc2872416afef02706757a18b6b61e982'
    : IS_R12N ? 'efd7eb2c8b89d36a6debccf4025eb1a3ddede922490b0243a7063be8da94aea1'
    : IS_R12L ? 'c26cd8ddad126c9a15e92935d6b11ea9d8b258f09bddad42e7b5b05f412921d2'
      : '9aae3a36cd327825e85604cf7adfecb92d24ec9ef35db96ef36e048e75fd4c36',
  sourceQa: IS_R12Q ? 'c117fc4023ac47ea5b8ac0322d5893e6a552d6a3287030b29b500bfb3c84bfe6'
    : IS_R12P ? 'b68ea5a7e2acb9fa6c8f4a67c24ea92273747c094c18a9a408e2274ab6fe0232'
    : IS_R12N ? '176acb2de9972b9ee1666de579470413281f8524c9777cf900a9c09bd0d96a24'
    : IS_R12L ? '11d5b1f7aa7004eb466f5f0da59d5d4fb2bbda18d8556bd449e33867ae182d38'
      : 'ab5d7134a7e93c2e45d922352bd38dd3eec52d9b6b94eef1c726e7c00f628f2f',
  sourceQaPayload: IS_R12Q ? '175015618e055cf3429c120d03c6fa6d8095d1ec90ab44cbae1dea008d412e08'
    : IS_R12P ? '382e39b66da9c29f0cbf128f2b92dc2b81f3e248a4e79f6b825cb273d8d2f5e3'
    : IS_R12N ? 'f05d4dde795f7261fcccb7f72ebf2db7129c1574dddf1c9bf3b6f6350c382e68'
    : IS_R12L ? '4f068e52dc9cbc320cdc513d3f2c0bc8f1a489bef06dc3e1c8eebc5bc4a3e283'
      : 'c4ae5ead1b20ac18fcb4720f3706f522ca98baaa434c7bcf202088fe898981b1',
  runtimeProof: IS_R12Q ? 'e749c20546f6773801ecff318a70c59af4c947673f0c27a402ba26e63929a54c'
    : IS_R12P ? 'e0c7b9868593c91f3b9aab89d0bb5fbcd680dcdb3fc06c32940164b1da15aee5'
    : IS_R12N ? '87196d8c6de39711c06582131435653c3c31cba1f131987e6865846fc001469e'
    : IS_R12L ? '8c7a47a6317394db2b6cae8e0236af484aba2923a26a3a767d003ac927c09234'
      : '128774523d63255b3fc11f07ad72c6aa3ad1462bf8f4ec0bf4503886b6fcb1f8',
  runtimeProofPayload: IS_R12Q ? '7100e594e3f0bb4c62464a3ff9a6ffbe137ef9927135b4504082974bce460310'
    : IS_R12P ? '8ffe8ba98ddbb46fad9a1adf72c8ed36cad97bcc579c4bee6be19c0de4d3d7e1'
    : IS_R12N ? 'b7f3360f304f0b99f6e9829970f3e807aebd1795bcfb99d82063ab95648db713'
    : IS_R12L ? '0ae94eca43a1b080011e428098451af70caf5db2a38332702985561baf8c9be4'
      : '0b18785f201fb7533f8752fb9c3ad7bbaeff87ecab93e65beff9fd638cbe19f1',
  predecessorManifest: IS_R12Q ? '47322de4686b577fc7c6b4230bea70f3536a8cff5b014919fcf5acbdbe0c6319'
    : IS_R12P ? '1153754d5bc8b43d67fa9371a5de668d3b778a0db0f06e67f72257fd2afbe43b'
    : IS_R12N ? '67fce2b7acc25a82a9df3a2f31068292f2d67d1d5837da2cbc7b60571e47d7e8'
    : IS_R12L ? 'bcf8dae5d7d54912bb8d0fc330123240152cc8707720c8bc3db66499ad8cd0fd'
      : '4f7841a70e52a892fdb8e57480bba3feea7bd24fdf4833c8896a27790dd85eb8',
  d05: '1446c75cec504478130a8e9c5569c68c7a7569a29c4210e9b21ca5d804aeb2f3',
  connectors: '8bb2dd803c434667dfeee440ccdf8428a115962e21dd1b3b0e6955cce672dc4e',
  contract: IS_R12Q || IS_R12P ? '0e13f4ca6a66eb5e61cb51f8845acfb0b0e7194480adeb813c2e474d2e8faa47'
    : '64f4432f00bd31fe8e5cd12921cd91bdc84b32c5c16630e62138accdf94ed8e0',
  authorization: 'd3b5f17862074080ae9db81e2932c56f6e96c926979748f8a3bcc09c22b3ad1a',
  relics: '1739502e8bf19283cabfe9930f26011dba97c11e6328da27ee0b7f651f7a0a22',
  target: IS_R12Q ? '021919255d63bd29c496a22493a9719131890f7c10b793c28ebdb7f1fc940984'
    : IS_R12P ? 'ade4597321fc40ebba2313b282b240c19fdabfeae5cc86f6887cf3ce5392b603'
    : IS_R12N ? '25f09aebcb490dcf1815d172ff04417445aedb495386d7e1011694b33187fcdb'
    : IS_R12L ? '7093da416a6d7dcb650b093ac4c1a8ea8d41d7c904c12be30f4d028a2a52d25d'
      : 'ddb53df35589e76f7fddfbba92dc76a13d682a99cbd87afe2131accf9ccf9849',
  support: IS_R12Q ? 'b118842a5a483077c4c52fe0494d3139d0608653eb269382bf5ce678224862dd'
    : IS_R12P ? '4c7fedb1e072b23fb386a9e8fefa4ce0e4d3837ff53ef5cd1d30650cd9d6f856'
    : IS_R12N ? '5725402145e381c64cf56f286b0f57df8a5f161232075f64ba884ede03ac3a62'
    : IS_R12L ? '08984ce246f16c655ecdd47416dc75d042c88584a0444be83a23111bff24cf1e'
      : 'b77109f66db8a80c3859b7df18b723974061e9cc5e06103a5dddd3f380e647c6',
  headroom: IS_R12Q ? '2cced3bab7d8ec8fd7211b138e4e301e6b411751cd8af5eb6b0acb5c80718b9e'
    : IS_R12P ? '0f543a749801bbbf40f2912fded109f6ef5cfbd47b2028c88a544ded4d5078a7'
    : IS_R12N ? 'd4689fb9509eb30566bb9b4da339bba603fc903cc2265a5ea83a77cfee88d717'
    : IS_R12L ? '265aaeb7085e3e5a13353d8274ae163762d7bffb184253e91d46c636217dd4e2'
      : '9c85d051ef02b916114d592acd178564300fb61eea9f4ae350795bd9536a977a',
  interfaces: IS_R12Q ? '1ffce825ae985eb631cc5673ed12977e64f6886a49b9725c8a317ce27c4c005b'
    : IS_R12P ? 'b9a3ee4806dd4d3315828e9df10439a04d2b340f768620a1d8c696d047161ab8'
    : IS_R12N ? '9334e716e86be3e5ec80864cfdef7996a691aa7c3bfc45c17e163ed3f5489e08'
    : IS_R12L ? '6db81d4b21d0dc58fb2d0d68d7c4dc40e8659bcc2f85d1e026e7cbbdfbecd06b'
      : 'ef0793450ed2d2965dffc0d47597d6e2c3c3e733236941adaeacdb5bc42966cb',
  halo: IS_R12Q ? '00f304a753196c704f879b57c46bdb9d681ac727e487e3673443154dc93b1c9d'
    : IS_R12P ? 'd5ca94465784278255210e8e857d4f78d9368f86315201e441fccaa94c73b41f'
    : IS_R12N ? '246d2fee57293ac0ad19b013e369417c5f6a853bc1c67bc245c01ae4c60bbdbc'
    : IS_R12L ? '45bab59c487098c2f99afed70ed977260c28cb943948096b75f3500a055a9a50'
      : '48042189d0f56b921cefd158049352f7553a87a13d76d2cf7527129b84227f89',
  haloState: IS_R12Q ? '8766542483834f7d16ea8fc6164277124a7b27feaf7dde9d71d45eead4a39832'
    : IS_R12P ? '5f1581fd8c923998282afeccab57740aa8ec82a5727f9cdd03147414ebfa3822'
    : IS_R12N ? '5847d6e7878c303b8c35bdfe2ec397f7e6cb1cca8dd20b11e3cb969eab3945e0'
    : IS_R12L ? '21fc5cb7695a88cfc1f43a2aff19ceade097aa83075dd3ae0c8d9029b22dc4d1'
      : 'e779ac3f87ebb0f33ff79f6f247fe029be9128782304123504e8209fed9c11c5',
  accommodation: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  accommodationState: IS_R12Q ? '7931479fdb5919f07dd720cc283d0e93248320da89a7b20096eca2b215d6b340'
    : IS_R12P ? '84293449d7430ed614ba92450910a8ef8ba1f3875534857a2ac80af9fb4b461b'
    : IS_R12N ? 'ca7465fda6eec8315456efff483f4b2181f651c21cbaa43020b55842fcff59c4'
    : IS_R12L ? 'c13405a299e5a8c261fdc81fdd18c85be5f8be4c1f04a898d6c9d50f522ca774'
      : '6b2e4f6a2353cc8a47f50e06f07bc90ad099b99ff4e64dec4b4a755a6fce88ec',
});
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:dragon_egg']);
const MECHANISM = new Set(['minecraft:rail', 'minecraft:powered_rail',
  'minecraft:detector_rail', 'minecraft:activator_rail', 'minecraft:redstone_wire',
  'minecraft:redstone_torch', 'minecraft:redstone_wall_torch', 'minecraft:repeater',
  'minecraft:comparator', 'minecraft:piston', 'minecraft:sticky_piston', 'minecraft:observer',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:hopper']);
const CONTAINER = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker', 'minecraft:hopper',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:shulker_box', 'minecraft:spawner',
  'minecraft:lectern', 'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox',
  'minecraft:beehive', 'minecraft:bee_nest', 'minecraft:decorated_pot',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block']);

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const fileBinding = (filename) => ({ path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))), bytes: fs.statSync(absolute(filename)).size });
const releaseContractBinding = () => IS_R12Q || IS_R12P ? fileBinding(INPUTS.contract) : ({
  path: relative(INPUTS.contract), sha256: EXPECTED.contract, bytes: 45_462,
});
const invariant = (condition, message) => {
  if (!condition) throw new Error(`${PROFILE.toUpperCase()} adjacency compiler rejected: ${message}`);
};
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact) };
};
const stateBase = (state) => state.split('[', 1)[0];
const stateCensus = (records) => Object.fromEntries([...records.reduce((map, { state }) => (
  map.set(state, (map.get(state) ?? 0) + 1)), new Map()).entries()]
  .sort(([left], [right]) => left.localeCompare(right)));
const stateSetHash = (records) => sha256(`combined-zones-current-block-state-set-v1\n${records
  .slice().sort((left, right) => left.cell.x - right.cell.x
    || left.cell.y - right.cell.y || left.cell.z - right.cell.z)
  .map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);
const isFluid = (state) => ['minecraft:water', 'minecraft:lava'].includes(stateBase(state))
  || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(stateBase(state))
  || stateBase(state).endsWith('_concrete_powder') || stateBase(state).endsWith('_anvil');
function operationIntersection(filename, targetCells) {
  const hits = [];
  for (const line of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('REPL ')) continue;
    const box = line.split(/\s+/).slice(1, 7).map(Number);
    for (const cell of targetCells) if (cell.x >= Math.min(box[0], box[3])
      && cell.x <= Math.max(box[0], box[3]) && cell.y >= Math.min(box[1], box[4])
      && cell.y <= Math.max(box[1], box[4]) && cell.z >= Math.min(box[2], box[5])
      && cell.z <= Math.max(box[2], box[5])) hits.push(cell);
  }
  return uniqueCells(hits);
}

const intake = readJson(INTAKE);
const ledger = readJson(SOURCE_LEDGER);
const regionIdentity = readJson(ledger.postSnapshot.identity.path);
const predecessor = readJson(INPUTS.predecessorManifest);
const predecessorQa = readJson(INPUTS.predecessorQa);
const proof = readJson(INPUTS.runtimeProof);
const d05 = readJson(INPUTS.d05);
const connectors = readJson(INPUTS.connectors);
const authorization = readJson(INPUTS.authorization);
const contract = readJson(INPUTS.contract);
const relics = readJson(INPUTS.relics);
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceComplete
  && absolute(intake.input.suppliedWorldRoot) === absolute(SNAPSHOT), 'source intake drifted');
invariant(fileBinding(SOURCE_LEDGER).sha256 === EXPECTED.sourceLedger
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
  && absolute(ledger.postSnapshot.root) === absolute(SNAPSHOT)
  && regionIdentity.sha256 === EXPECTED.sourceRegion,
  `${IS_R12Q ? 'R12P' : IS_R12P ? 'R12N' : IS_R12N ? 'R12L' : IS_R12L ? 'R12K' : 'R12J'} terminal binding drifted`);
invariant(fileBinding(INPUTS.predecessorManifest).sha256 === EXPECTED.predecessorManifest
  && ledger.manifest.sha256 === EXPECTED.predecessorManifest
  && fileBinding(INPUTS.predecessorQa).sha256 === EXPECTED.sourceQa
  && predecessorQa.qaPayloadSha256 === EXPECTED.sourceQaPayload && predecessorQa.summary.passed,
  `${IS_R12Q ? 'R12P' : IS_R12P ? 'R12N' : IS_R12N ? 'R12L' : IS_R12L ? 'R12K' : 'R12J'} accepted manifest/QA drifted`);
invariant(fileBinding(INPUTS.runtimeProof).sha256 === EXPECTED.runtimeProof
  && proof.proofPayloadSha256 === EXPECTED.runtimeProofPayload
  && (IS_R12Q ? proof.disposition.exactTwoCellLowerTurnClosureStateProven
    : IS_R12P ? proof.disposition.exactSixtyOneCellSummitReturnClosureStateProven
    : IS_R12N ? proof.disposition.exactOneHundredTwentyThreeCellAdjacencyClosureStateProven
    : proof.disposition.exactSevenCellAdjacencyClosureStateProven)
  && (IS_R12Q ? proof.disposition.exactFiveHundredFiftyTwoCellConnectedPostTopologyProven
    : IS_R12P ? proof.disposition.exactThreeHundredCellConnectedPostTopologyProven
    : IS_R12N ? proof.disposition.exactTwoHundredThirtyNineCellConnectedPostTopologyProven
    : IS_R12L ? proof.disposition.exactThirtySixCellConnectedPostTopologyProven
      : proof.disposition.exactFifteenCellConnectedPostTopologyProven)
  && (!IS_R12P || (proof.disposition.exactTurnStateProven
    && proof.disposition.exactAscendingNorthStatesProven))
  && (!IS_R12Q || (proof.disposition.exactNorthWestTurnStateProven
    && proof.disposition.exactSouthWestTurnStateProven))
  && proof.disposition.bothAcceptedPriorSegmentsPreservedAfterForwardAndRollback
  && proof.disposition.exactForwardAndReverseOrderRollbackProven
  && !proof.disposition.productionMutationPerformed, 'exact Paper runtime proof drifted');
invariant(fileBinding(INPUTS.d05).sha256 === EXPECTED.d05
  && fileBinding(INPUTS.connectors).sha256 === EXPECTED.connectors
  && (!(IS_R12Q || IS_R12P) || fileBinding(INPUTS.contract).sha256 === EXPECTED.contract)
  && fileBinding(INPUTS.authorization).sha256 === EXPECTED.authorization
  && fileBinding(INPUTS.relics).sha256 === EXPECTED.relics, 'frozen design input drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION' && !authorization.revoked
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID)
  && contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID)
    ?.canonicalOwners.includes('Z11-FUNICULAR-OPERATIONS'), 'scope authority absent');

const r12nProduction = (entry) => ({ x: 2287 + entry.x, y: 65 + entry.y, z: -768 });
const r12pProduction = (entry) => ({ x: 2049 + entry.x, y: 65 + entry.y, z: entry.z - 768 });
const r12qProduction = (entry) => ({ x: 2048 + entry.x, y: 66 + entry.y, z: entry.z - 748 });
const target = IS_R12Q
  ? proof.geometry.operatedClosureCellsLowToHigh.map(r12qProduction)
  : IS_R12P
  ? proof.geometry.operatedClosureCellsLowToHigh.map(r12pProduction)
  : IS_R12N
  ? proof.geometry.operatedClosureCellsLowToHigh.map(r12nProduction)
  : (IS_R12L ? [
  [2273, 140], [2272, 141], [2271, 142], [2270, 143],
  [2269, 143], [2268, 144], [2267, 145],
] : [
  [2262, 148], [2261, 149], [2260, 150], [2259, 151],
  [2258, 151], [2257, 152], [2256, 153],
]).map(([x, y]) => ({ x, y, z: -768 }));
const desiredLowToHigh = IS_R12Q || IS_R12P || IS_R12N
  ? proof.geometry.operatedClosureCellsLowToHigh.map(({ state }) => state)
  : [ASC, ASC, ASC, EW, ASC, ASC, EW];
const desiredStateCensus = desiredLowToHigh.reduce((counts, state) => ({ ...counts,
  [state]: (counts[state] ?? 0) + 1 }), {});
const support = target.map(({ x, y, z }) => ({ x, y: y - 1, z }));
const headroom = target.map(({ x, y, z }) => ({ x, y: y + 1, z }));
const interfaces = IS_R12Q
  ? ['i239-accepted', 'i241-accepted', 'i259-accepted', 'i261-accepted']
    .map((role) => proof.geometry.exactConnectedStatesLowToHigh.find((entry) => entry.role === role))
    .map(r12qProduction)
  : IS_R12P
  ? [proof.geometry.exactConnectedStatesLowToHigh.find(({ role }) => role === 'i499-accepted')]
    .map(r12pProduction)
  : IS_R12N
  ? [proof.geometry.exactConnectedStatesLowToHigh[35],
    proof.geometry.exactConnectedStatesLowToHigh[159]].map(r12nProduction)
  : IS_R12L
    ? [{ x: 2274, y: 140, z: -768 }, { x: 2266, y: 145, z: -768 }]
    : [{ x: 2263, y: 148, z: -768 }, { x: 2255, y: 153, z: -768 }];
const r12qInterfaceStateByCell = new Map(IS_R12Q
  ? proof.geometry.exactConnectedStatesLowToHigh
    .filter(({ role }) => ['i239-accepted', 'i241-accepted', 'i259-accepted', 'i261-accepted'].includes(role))
    .map((entry) => [cellKey(r12qProduction(entry)), entry.state])
  : []);
const halo = dilateCells(target, 1);
const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
const accommodation = buildB09MinimumReservation(
  model.formula,
  connectors.funicularFaceComparison.designEndpoints,
);
const connectedResult = IS_R12Q
  ? proof.geometry.exactConnectedStatesLowToHigh.map(r12qProduction)
  : IS_R12P
  ? proof.geometry.exactConnectedStatesLowToHigh.map(r12pProduction)
  : IS_R12N
  ? proof.geometry.exactConnectedStatesLowToHigh.map(r12nProduction)
  : IS_R12L ? [
  ...Array.from({ length: 36 }, (_, offset) => {
    const yValues = [130, 131, 132, 132, 133, 134, 135, 135, 136, 137, 137, 138,
      139, 140, 140, 141, 142, 143, 143, 144, 145, 145, 146, 147, 148, 148,
      149, 150, 151, 151, 152, 153, 153, 154, 155, 156];
    return { x: 2287 - offset, y: yValues[offset], z: -768 };
  }),
] : [
  { x: 2266, y: 145, z: -768 }, { x: 2265, y: 146, z: -768 },
  { x: 2264, y: 147, z: -768 }, { x: 2263, y: 148, z: -768 },
  ...target,
  { x: 2255, y: 153, z: -768 }, { x: 2254, y: 154, z: -768 },
  { x: 2253, y: 155, z: -768 }, { x: 2252, y: 156, z: -768 },
];
const lowerCap = cellsIn(predecessor.scope.geometry.retainedLowerB08Cap.bounds);
const summitCap = cellsIn(predecessor.scope.geometry.retainedSummitZ11Cap.bounds);
const targetCount = IS_R12Q ? 2 : IS_R12P ? 61 : IS_R12N ? 123 : 7;
const connectedCount = IS_R12Q ? 552 : IS_R12P ? 300 : IS_R12N ? 239 : IS_R12L ? 36 : 15;
const haloCount = IS_R12Q ? 54 : IS_R12P ? 915 : IS_R12N ? 1_659 : 111;
invariant(target.length === targetCount && hashCells(target) === EXPECTED.target
  && hashCells(support) === EXPECTED.support && hashCells(headroom) === EXPECTED.headroom
  && hashCells(interfaces) === EXPECTED.interfaces && halo.length === haloCount
  && hashCells(halo) === EXPECTED.halo && accommodation.length === 7_800
  && hashCells(accommodation) === EXPECTED.accommodation
  && connectedResult.length === connectedCount
  && (!IS_R12Q || hashCells(connectedResult) === '7eea538b877c3b65b6dd1fc7ad64ce76abd467a5dddcdad45e92aa17e022f6b1'),
  'exact closure geometry drifted');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
async function records(cells) {
  const output = [];
  for (const cell of uniqueCells(cells)) output.push({ cell,
    state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
  return output;
}
const [targetRecords, supportRecords, headroomRecords, interfaceRecords, haloRecords,
  accommodationRecords, capRecords] = await Promise.all([
  records(target), records(support), records(headroom), records(interfaces), records(halo),
  records(accommodation), records([...lowerCap, ...summitCap]),
]);
invariant(targetRecords.every(({ state }) => state === AIR)
  && supportRecords.every(({ state }) => state === DIORITE)
  && headroomRecords.every(({ state }) => state === AIR)
  && interfaceRecords.every(({ cell, state }) => IS_R12Q
    ? state === r12qInterfaceStateByCell.get(cellKey(cell))
    : IS_R12P
    ? cellKey(cell) === cellKey(interfaces[0]) && state === EW
    : (cell.x === interfaces[0].x && state === EW)
      || (cell.x === interfaces[1].x && state === (IS_R12N ? EW : ASC)))
  && capRecords.every(({ state }) => state === DIORITE),
  'target/support/headroom/interface/cap source state drifted');
invariant(stateSetHash(haloRecords) === EXPECTED.haloState
  && stateSetHash(accommodationRecords) === EXPECTED.accommodationState
  && stateCensus(accommodationRecords)[EW] === (IS_R12Q || IS_R12P ? 354 : IS_R12N ? 321 : IS_R12L ? 319 : 317)
  && stateCensus(accommodationRecords)[NS] === (IS_R12Q ? 21 : 19)
  && stateCensus(accommodationRecords)[ASC] === (IS_R12Q || IS_R12P ? 116 : IS_R12N ? 26 : IS_R12L ? 21 : 16)
  && (!IS_R12Q || (stateCensus(accommodationRecords)[ASC_NORTH] === 58
    && stateCensus(accommodationRecords)[NORTH_EAST] === 1)),
  `${IS_R12Q ? 'R12P' : IS_R12P ? 'R12N' : IS_R12N ? 'R12L' : IS_R12L ? 'R12K' : 'R12J'} B09/halo source state drifted`);

const priorDescriptors = [
  ...predecessor.preservation.acceptedPriorReleaseTargetProof,
  { transactionId: predecessor.transactionId, manifest: fileBinding(INPUTS.predecessorManifest) },
];
const priorProof = [];
const reviewedPriorOverlap = new Map(IS_R12Q ? [
  ['combined-zones-r07h-b09-lower-guideway-segment-02', {
    cellCount: 1, coordinateSetSha256: 'af2894bc9ecc2ddbf2fefdb8d1d645671829e6173714e031b75736e492bf3932',
    rationale: 'Exact R07H far-cap cell at centerline index 240 was opened by accepted R07I and is current air; R12Q owns its passive rail datum.' }],
  ['combined-zones-r07i-b09-maximal-curve-summit-return', {
    cellCount: 1, coordinateSetSha256: 'af2894bc9ecc2ddbf2fefdb8d1d645671829e6173714e031b75736e492bf3932',
    rationale: 'Exact accepted R07I internal-turn aperture cell at centerline index 240 is current air and is owned by B09 passive rail fit-out.' }],
] : IS_R12P ? [
  ['combined-zones-r07e-b09-summit-headhouse-shell', {
    cellCount: 1, coordinateSetSha256: '797d5e225c209bb5d88791d528a9b9a28437949caaffde6b89bc1f147c33f79c',
    rationale: 'R10B already opened this exact R07E approach-shell cell into the accepted route; R12P adds its passive rail datum.' }],
  ['combined-zones-r10b-b09-summit-internal-approach', {
    cellCount: 1, coordinateSetSha256: '797d5e225c209bb5d88791d528a9b9a28437949caaffde6b89bc1f147c33f79c',
    rationale: 'Exact accepted R10B internal approach target at centerline index 551 is current air and is owned by the B09 passive rail fit-out.' }],
] : []);
for (const descriptor of priorDescriptors) {
  invariant(fileBinding(descriptor.manifest.path).sha256 === descriptor.manifest.sha256,
    `prior manifest ${descriptor.manifest.path} drifted`);
  const prior = readJson(descriptor.manifest.path);
  const hits = uniqueCells((prior.packages ?? []).flatMap((pkg) => (
    pkg.forward && fs.existsSync(absolute(pkg.forward)) ? operationIntersection(pkg.forward, target) : []
  )));
  const reviewed = reviewedPriorOverlap.get(prior.transactionId);
  invariant(reviewed
    ? hits.length === reviewed.cellCount && hashCells(hits) === reviewed.coordinateSetSha256
    : hits.length === 0, `prior target overlap from ${prior.transactionId}`);
  priorProof.push({ transactionId: prior.transactionId, manifest: fileBinding(descriptor.manifest.path),
    targetIntersectionCount: hits.length,
    targetIntersectionCoordinateSetSha256: hits.length ? hashCells(hits) : null,
    ...(reviewed ? { reviewedLayeredFitoutOverlap: true, rationale: reviewed.rationale } : {}) });
}
const haloKeys = new Set(halo.map(cellKey));
const blockEntities = [];
const savedEntities = [];
for (const chunkKey of [...new Set(halo.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))]) {
  const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    if (haloKeys.has(`${entity.x},${entity.y},${entity.z}`)) blockEntities.push(entity);
  }
  const entityChunk = await entityReader.chunk(chunkX, chunkZ);
  for (const entity of entityChunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const point = `${Math.floor(Number(entity.Pos[0]))},${Math.floor(Number(entity.Pos[1]))},${Math.floor(Number(entity.Pos[2]))}`;
    if (haloKeys.has(point)) savedEntities.push(entity);
  }
}
const relicHits = relics.relics.filter((relic) => halo.some((cell) => (
  cell.x >= relic.declaredInclusiveBounds.minX && cell.x <= relic.declaredInclusiveBounds.maxX
  && cell.y >= relic.declaredInclusiveBounds.minY && cell.y <= relic.declaredInclusiveBounds.maxY
  && cell.z >= relic.declaredInclusiveBounds.minZ && cell.z <= relic.declaredInclusiveBounds.maxZ)));
const haloFluids = haloRecords.filter(({ state }) => isFluid(state));
const haloGravity = haloRecords.filter(({ state }) => isGravity(state));
const haloMechanisms = haloRecords.filter(({ state }) => MECHANISM.has(stateBase(state)));
const interfaceKeys = new Set(interfaces.map(cellKey));
const reviewedMechanisms = haloMechanisms.filter(({ cell, state }) => interfaceKeys.has(cellKey(cell))
  && [ASC, EW, NS].includes(state));
const haloContainers = haloRecords.filter(({ state }) => CONTAINER.has(stateBase(state)));
invariant(blockEntities.length === 0 && savedEntities.length === 0 && relicHits.length === 0
  && haloFluids.length === 0 && haloGravity.length === 0 && haloContainers.length === 0
  && haloMechanisms.length === (IS_R12Q ? 4 : IS_R12P ? 1 : 2)
  && reviewedMechanisms.length === (IS_R12Q ? 4 : IS_R12P ? 1 : 2),
  'halo entity/relic/fluid/gravity/container/mechanism hazard');

const sourceByKey = new Map(targetRecords.map((record) => [cellKey(record.cell), record.state]));
const plannedLowToHigh = target.map((cell, index) => ({ cell,
  source: sourceByKey.get(cellKey(cell)), desired: desiredLowToHigh[index] }));
const forwardPlan = plannedLowToHigh.slice().reverse();
const rollbackPlan = forwardPlan.slice().reverse();
const forwardBody = `${forwardPlan.map(({ cell, source, desired }) => replLine(cell, source, desired)).join('\n')}\n`;
const rollbackBody = `${rollbackPlan.map(({ cell, source, desired }) => replLine(cell, desired, source)).join('\n')}\n`;
const forwardBodySha256 = sha256(forwardBody);
const rollbackBodySha256 = sha256(rollbackBody);
const forwardPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const canonicalForward = path.posix.join(CANONICAL_BUILDOPS_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const canonicalRollback = path.posix.join(CANONICAL_BUILDOPS_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, bodyHash) => `# GENERATED FILE - ${RELEASE_ID}/${PACKAGE_KEY} (${role})\n`
  + `# source root: ${SNAPSHOT}\n# complete-save SHA-256: ${EXPECTED.sourceComplete}\n`
  + `# target coordinate-set SHA-256: ${EXPECTED.target}\n# operation SHA-256: ${bodyHash}\n`;
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(forwardPath), `${header('forward', forwardBodySha256)}${forwardBody}`);
fs.writeFileSync(absolute(rollbackPath), `${header('rollback', rollbackBodySha256)}${rollbackBody}`);

const payload = {
  schemaVersion: 1, transactionId: BASENAME, generatedAtUtc: GENERATED_AT,
  status: IS_R12Q
    ? 'COMPILED_R12Q_LOWER_TWO_TURN_RAIL_CLOSURE_AWAITING_FRESH_EXECUTION_KERNEL'
    : IS_R12P
    ? 'COMPILED_R12P_CONTINUOUS_261_560_SIXTY_ONE_CELL_SUMMIT_RETURN_RAIL_CLOSURE_AWAITING_FRESH_EXECUTION_KERNEL'
    : IS_R12N
    ? 'COMPILED_R12N_CONTINUOUS_261_499_ONE_HUNDRED_TWENTY_THREE_CELL_RAIL_ADJACENCY_CLOSURE_AWAITING_FRESH_EXECUTION_KERNEL'
    : IS_R12L
      ? 'COMPILED_R12L_CONTINUOUS_261_296_SEVEN_CELL_RAIL_ADJACENCY_CLOSURE_AWAITING_FRESH_EXECUTION_KERNEL'
      : 'COMPILED_R12K_R12H_R12I_SEVEN_CELL_RAIL_ADJACENCY_CLOSURE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID, mvpScope: true,
  scopeIds: [IS_R12Q
    ? 'P1-B09-LOWER-TWO-TURN-RAIL-CLOSURE'
    : IS_R12P
    ? 'P1-B09-CONTINUOUS-261-560-SIXTY-ONE-CELL-SUMMIT-RETURN-RAIL-CLOSURE'
    : IS_R12N
    ? 'P1-B09-CONTINUOUS-261-499-ONE-HUNDRED-TWENTY-THREE-CELL-RAIL-ADJACENCY-CLOSURE'
    : IS_R12L ? 'P1-B09-CONTINUOUS-261-296-SEVEN-CELL-RAIL-ADJACENCY-CLOSURE'
      : 'P1-B09-R12H-R12I-SEVEN-CELL-RAIL-ADJACENCY-CLOSURE'],
  packages: [{ key: PACKAGE_KEY, forward: canonicalForward, rollback: canonicalRollback }],
  executionOrder: { forward: [PACKAGE_KEY], rollback: [PACKAGE_KEY],
    rationale: IS_R12Q
      ? 'Install the upper index-260 turn before the lower index-240 turn; exact reverse rollback removes index 240 before index 260 and restores both target cells to air while preserving all 550 accepted rails.'
      : IS_R12P
      ? 'Install summit-to-lower across the exact 61-cell return including one proven internal turn; exact reverse rollback restores target air while preserving the complete accepted 261..499 component.'
      : IS_R12N
      ? 'Install upper-to-lower across the exact 123-cell gap; exact reverse rollback restores all target air while preserving both accepted interface segments.'
      : 'Install upper-to-lower across the exact seven-cell gap; exact reverse rollback restores all target air while preserving both accepted interface segments.' },
  scope: { releaseId: RELEASE_ID, canonicalOwner: 'Z11-FUNICULAR-OPERATIONS',
    material: IS_R12Q
      ? 'one north_west turn rail and one south_west turn rail'
      : IS_R12P
      ? 'one north_east turn rail, fifty-eight ascending_north rails, and two north_south landing rails'
      : IS_R12N ? 'ninety ascending_west rails plus thirty-three east_west landing rails'
      : 'five ascending_west rails plus two east_west landing rails',
    purpose: IS_R12Q
      ? 'Close the two exact lower hairpin turn gaps at indices 240 and 260, joining accepted indices 9..239, 241..259, and 261..560 into one 552-cell passive rail component.'
      : IS_R12P
      ? 'Extend accepted continuous indices 261..499 through the exact summit-return turn and ascent to the retained exterior cap as one 300-cell passive rail component.'
      : IS_R12N
      ? 'Join accepted continuous indices 261..296 to accepted R12E indices 420..499 into one exact 239-cell continuous passive rail component.'
      : IS_R12L
        ? 'Join accepted components 261..274 and 282..296 into one exact 36-cell continuous passive rail component.'
        : 'Join accepted R12H and R12I into one exact 15-cell connected passive rail component.',
    geometry: { [IS_R12Q ? 'selectedTwoCellLowerTurnClosure'
      : IS_R12P ? 'selectedSixtyOneCellSummitReturnClosure'
      : IS_R12N ? 'selectedOneHundredTwentyThreeCellAdjacencyClosure'
      : 'selectedSevenCellAdjacencyClosure']: classManifest(target),
      exactSupport: classManifest(support), retainedHeadroom: classManifest(headroom),
      acceptedAdjacencyInterfaces: classManifest(interfaces),
      [IS_R12Q ? 'resultingContinuous9Through560Rail'
        : IS_R12P ? 'resultingContinuous261Through560Rail'
        : IS_R12N ? 'resultingContinuous261Through499Rail'
        : IS_R12L ? 'resultingContinuous261Through296Rail' : 'resultingConnectedR12hThroughR12iRail']:
        classManifest(connectedResult),
      retainedLowerB08Cap: classManifest(lowerCap), retainedSummitZ11Cap: classManifest(summitCap),
      b09Accommodation: classManifest(accommodation) },
    selection: { firstCenterlineIndex: IS_R12Q ? 240 : IS_R12P ? 500 : IS_R12N ? 297 : IS_R12L ? 275 : 286,
      lastCenterlineIndex: IS_R12Q ? 260 : IS_R12P ? 560 : IS_R12N ? 419 : IS_R12L ? 281 : 292,
      acceptedLowerInterfaceIndex: IS_R12Q ? 239 : IS_R12P ? 499 : IS_R12N ? 296 : IS_R12L ? 274 : 285,
      acceptedUpperInterfaceIndex: IS_R12Q ? 261 : IS_R12P ? null : IS_R12N ? 420 : IS_R12L ? 282 : 293,
      ...(IS_R12Q ? { exactTargetCenterlineIndices: [240, 260],
        exactAcceptedInterfaceIndices: [239, 241, 259, 261] } : {}),
      resultingConnectedFirstCenterlineIndex: IS_R12Q ? 9 : IS_R12P || IS_R12N || IS_R12L ? 261 : 282,
      resultingConnectedLastCenterlineIndex: IS_R12Q || IS_R12P ? 560 : IS_R12N ? 499 : 296,
      resultingConnectedCellCount: connectedCount,
      deterministicSelection: IS_R12Q
        ? 'BOTH_EXACT_REMAINING_INTERNAL_TURN_GAPS_JOIN_ALL_ACCEPTED_PASSIVE_RAIL_INDICES_9_560'
        : IS_R12P
        ? 'MAXIMAL_EXACT_REMAINING_SUMMIT_RETURN_BETWEEN_ACCEPTED_INDEX_499_AND_RETAINED_Z11_CAP'
        : IS_R12N
        ? 'MAXIMAL_EXACT_GRADED_GAP_BETWEEN_ACCEPTED_COMPONENTS_261_296_AND_420_499'
        : IS_R12L ? 'EXACT_SEVEN_CELL_GAP_BETWEEN_ACCEPTED_COMPONENTS_261_274_AND_282_296'
          : 'EXACT_SEVEN_CELL_GAP_BETWEEN_ACCEPTED_R12H_AND_R12I' },
    failSafeState: { passiveUnpoweredRailOnly: true,
      exactBlockStatesLowToHigh: desiredLowToHigh,
      lowerInterfaceState: EW, upperInterfaceState: IS_R12P ? null : IS_R12N ? EW : ASC,
      connectedToPriorRail: true, connectedComponentCellCount: connectedCount,
      turnRailInstalled: IS_R12Q || IS_R12P,
      ...(IS_R12Q ? { exactTurnIndices: [240, 260],
        exactTurnStates: { 240: NORTH_WEST, 260: SOUTH_WEST },
        retainedLowerB08CapClosed: true, retainedSummitExteriorCapClosed: true } : {}),
      ...(IS_R12P ? { internalTurnIndex: 500, retainedSummitExteriorCapClosed: true } : {}),
      poweredRailInstalled: false, vehicleInstalled: false,
      driveBrakeControlPowerInstalled: false, passengerOrRescueUseAuthorized: false },
    operationalBoundary: { staticPassiveGuidewayMaterialOnly: true,
      funicularCommissioned: false, routeCommissioned: false,
      passengerTransportCommissioned: false, exteriorInterfaceOpened: false } },
  source: { snapshotRoot: relative(SNAPSHOT), completeSaveSha256: EXPECTED.sourceComplete,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    regionSnapshotSha256: EXPECTED.sourceRegion, intakeAudit: fileBinding(INTAKE),
    predecessor: { transactionId: ledger.transactionId, executionLedger: fileBinding(SOURCE_LEDGER),
      completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
      executedManifest: fileBinding(INPUTS.predecessorManifest),
      postQa: fileBinding(INPUTS.predecessorQa),
      postQaPayloadSha256: predecessorQa.qaPayloadSha256 },
    b09SourceState: { accommodation: classManifest(accommodation),
      blockStateSetSha256: stateSetHash(accommodationRecords), stateCensus: stateCensus(accommodationRecords) },
    targetStateSetSha256: stateSetHash(targetRecords), sourceStateCensus: { [AIR]: targetCount } },
  target: { operatedUnion: classManifest(target),
    desiredStateCensus },
  operations: { [PACKAGE_KEY]: { forwardSha256: forwardBodySha256,
    rollbackSha256: rollbackBodySha256, forwardCommandCount: targetCount,
    rollbackCommandCount: targetCount,
    targetCellCount: targetCount, targetCoordinateSetSha256: EXPECTED.target,
    sourceStateCensus: { [AIR]: targetCount }, desiredStateCensus,
    exactInverse: true, reverseOrderInverse: true, oneCellGuards: true } },
  runtimeUpdateProof: { ...fileBinding(INPUTS.runtimeProof), proofPayloadSha256: proof.proofPayloadSha256,
    exactProductionPaperVersion: proof.runtime.expectedVersion,
    forwardOrder: proof.deterministicOrder.forward,
    rollbackExactReverseOrder: proof.deterministicOrder.rollbackExactReverse,
    forwardStatePassCount: proof.deterministicOrder.forwardStatePassCount,
    rollbackAirPassCount: proof.deterministicOrder.rollbackAirPassCount,
    rollbackPriorStatePassCount: proof.deterministicOrder.rollbackPriorStatePassCount,
    resultingConnectedPostTopologyCellCount: connectedCount,
    productionMutationPerformed: false },
  preservation: { acceptedPriorReleaseTargetProof: priorProof,
    undeclaredPriorReleaseIntersectionCount: 0,
    exactSupport: { ...classManifest(support), sourceStateCensus: stateCensus(supportRecords) },
    retainedHeadroom: classManifest(headroom),
    acceptedAdjacencyInterfaces: { ...classManifest(interfaces), sourceStateCensus: stateCensus(interfaceRecords) },
    acceptedPriorRailCount: IS_R12Q ? 550 : IS_R12P ? 489 : IS_R12N ? 366 : IS_R12L ? 359 : 352,
    retainedLowerB08Cap: classManifest(lowerCap),
    retainedSummitZ11Cap: classManifest(summitCap) },
  safetyAudit: { halo: { ...classManifest(halo), sourceStateCensus: stateCensus(haloRecords),
      sourceStateSetSha256: stateSetHash(haloRecords) },
    targetFluidCount: targetRecords.filter(({ state }) => isFluid(state)).length,
    haloFluidCount: haloFluids.length, haloGravityCount: haloGravity.length,
    haloExistingMechanismCount: haloMechanisms.length,
    reviewedAdjacentMechanismCount: reviewedMechanisms.length,
    haloUndeclaredMechanismCount: haloMechanisms.length - reviewedMechanisms.length,
    haloContainerOrControlCount: haloContainers.length,
    haloBlockEntityCount: blockEntities.length, haloSavedEntityCount: savedEntities.length,
    haloProtectedRelicCount: relicHits.length,
    exactSolidSupportCount: supportRecords.filter(({ state }) => state === DIORITE).length,
    exactAirHeadroomCount: headroomRecords.filter(({ state }) => state === AIR).length,
    railUpdateDeterminism: { exactFrozenCenterlineNeighborGeometry: true,
      oneToOneWestRiseCellCount: desiredStateCensus[ASC], levelLandingCellCount: desiredStateCensus[EW],
      ...(IS_R12P ? { oneToOneNorthRiseCellCount: desiredStateCensus[ASC_NORTH],
        northSouthLandingCellCount: desiredStateCensus[NS],
        northEastTurnCellCount: desiredStateCensus[NORTH_EAST] } : {}),
      ...(IS_R12Q ? { northWestTurnCellCount: desiredStateCensus[NORTH_WEST],
        southWestTurnCellCount: desiredStateCensus[SOUTH_WEST],
        exactTargetCenterlineIndices: [240, 260] } : {}),
      explicitPropertyStatesLowToHigh: desiredLowToHigh,
      forwardOrder: 'UPPER_TO_LOWER', rollbackOrder: 'LOWER_TO_UPPER_EXACT_REVERSE',
      reviewedAcceptedInterfaceCount: IS_R12Q ? 4 : IS_R12P ? 1 : 2,
      resultingConnectedComponentCellCount: connectedCount,
      exactProductionVersionRuntimeProofPassed: true } },
  standingAuthorization: { ...fileBinding(INPUTS.authorization),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true },
  upstreamIdentities: { d05: fileBinding(INPUTS.d05), connectors: fileBinding(INPUTS.connectors),
    releaseContract: releaseContractBinding(),
    [IS_R12Q ? 'r12pManifest' : IS_R12P ? 'r12nManifest' : IS_R12N ? 'r12lManifest' : IS_R12L ? 'r12kManifest' : 'r12jManifest']:
      fileBinding(INPUTS.predecessorManifest),
    [IS_R12Q ? 'r12pQa' : IS_R12P ? 'r12nQa' : IS_R12N ? 'r12lQa' : IS_R12L ? 'r12kQa' : 'r12jQa']:
      fileBinding(INPUTS.predecessorQa),
    adjacencyClosureRuntimeProof: fileBinding(INPUTS.runtimeProof) },
  blockedRailClasses: { status: IS_R12Q
    ? 'NO_INTERNAL_PASSIVE_RAIL_GAP_REMAINS_ACTIVE_SYSTEM_HOLD_ONLY'
    : 'LOCAL_HOLD_ONLY_FOR_REMAINING_UNPROVEN_CONNECTIVITY_CLASSES',
    heldClasses: IS_R12Q
      ? ['lower station/portal indices 0..8',
        'all active rail/drive/brake/vehicle/control/power systems']
      : [IS_R12P ? 'remaining exact turn cells at indices 240 and 260'
        : 'all exact turn cells at indices 240, 260, and 500',
        'all remaining air gaps outside accepted connected components',
        'lower station/portal indices 0..8', 'all active rail/drive/brake/vehicle/control/power systems'],
    [IS_R12Q ? 'lowerTurn240And260GapRemainingAfterThisPackage'
      : IS_R12P ? 'summitReturn500To560GapRemainingAfterThisPackage'
      : IS_R12N ? 'components261To499AdjacencyGapRemainingAfterThisPackage'
      : IS_R12L ? 'components261To296AdjacencyGapRemainingAfterThisPackage'
        : 'r12hR12iAdjacencyGapRemainingAfterThisPackage']: false },
  residualActiveSystemBlockers: predecessor.residualActiveSystemBlockers,
  hardSafetyKernelNext: ['rebind if accepted terminal advances',
    'fresh complete source and exact preflight', 'fresh live entity clearance',
    'strict forward and rollback parser checks', 'journaled strict execution',
    IS_R12Q
      ? 'fresh post exact two-turn state and 552-cell connectivity QA plus rollback preflight'
      : IS_R12P
      ? 'fresh post exact 61-state and 300-cell connectivity QA plus rollback preflight'
      : IS_R12N
      ? 'fresh post exact 123-state and 239-cell connectivity QA plus rollback preflight'
      : `fresh post exact seven-state and ${IS_R12L ? 'thirty-six' : 'fifteen'}-cell connectivity QA plus rollback preflight`],
  safetyBoundary: { liveCallsPerformed: false, apiCallsPerformed: false,
    rconCallsPerformed: false, serviceMutationsPerformed: false,
    worldEditsPerformed: false, executionAuthorizedByThisOfflineCompile: false,
    funicularOrRouteCommissioned: false },
};
const manifestIdentity = sha256(JSON.stringify(payload));
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({ ...payload, manifestIdentity }, null, 2)}\n`);
console.log(JSON.stringify({ status: payload.status, manifest: relative(manifestPath), manifestIdentity,
  targetCellCount: targetCount, targetCoordinateSetSha256: EXPECTED.target,
  resultingConnectedRailCellCount: connectedCount,
  proofPayloadSha256: proof.proofPayloadSha256,
  liveCallsPerformed: false, worldEditsPerformed: false }, null, 2));
