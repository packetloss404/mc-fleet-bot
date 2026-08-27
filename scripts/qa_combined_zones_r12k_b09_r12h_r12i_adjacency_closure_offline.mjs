#!/usr/bin/env node
/** Deterministic offline QA for CZ-R12K R12H/R12I adjacency closure. */

import fs from 'node:fs';
import path from 'node:path';

import { hashCells, sha256 } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const PROFILE = argv.includes('--profile')
  ? argv[argv.indexOf('--profile') + 1]
  : 'r12k';
if (!['r12k', 'r12l', 'r12n', 'r12p', 'r12q'].includes(PROFILE)) throw new Error(`unsupported profile ${PROFILE}`);
const IS_R12L = PROFILE === 'r12l';
const IS_R12N = PROFILE === 'r12n';
const IS_R12P = PROFILE === 'r12p';
const IS_R12Q = PROFILE === 'r12q';
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const EVIDENCE = value('--evidence-dir',
  IS_R12Q
    ? 'data/world-review/combined-zones-r12q-b09-lower-two-turn-rail-closure-offline-20260822T044800Z'
    : IS_R12P
    ? 'data/world-review/combined-zones-r12p-b09-continuous-261-560-summit-return-rail-closure-offline-20260822T042800Z'
    : IS_R12N
    ? 'data/world-review/combined-zones-r12n-b09-continuous-261-499-adjacency-closure-offline-20260822T040800Z'
    : IS_R12L
    ? 'data/world-review/combined-zones-r12l-b09-continuous-261-296-adjacency-closure-offline-20260822T033800Z'
    : 'data/world-review/combined-zones-r12k-b09-r12h-r12i-adjacency-closure-offline-20260822T031200Z');
const OUT = value('--out', path.join(EVIDENCE, `${PROFILE}-offline-readiness.json`));
const MARKDOWN = value('--markdown', path.join(EVIDENCE, `${PROFILE}-offline-readiness.md`));
const GENERATED_AT = value('--generated-at', IS_R12Q ? '2026-08-22T04:48:00Z'
  : IS_R12P ? '2026-08-22T04:28:00Z'
  : IS_R12N ? '2026-08-22T04:08:00Z'
  : IS_R12L ? '2026-08-22T03:38:00Z' : '2026-08-22T03:12:00Z');
const MANIFEST = IS_R12Q
  ? 'data/buildops/combined-zones-r12q-b09-lower-two-turn-rail-closure.release-manifest.json'
  : IS_R12P
  ? 'data/buildops/combined-zones-r12p-b09-continuous-261-560-sixty-one-cell-summit-return-rail-closure.release-manifest.json'
  : IS_R12N
  ? 'data/buildops/combined-zones-r12n-b09-continuous-261-499-one-hundred-twenty-three-cell-rail-adjacency-closure.release-manifest.json'
  : IS_R12L
    ? 'data/buildops/combined-zones-r12l-b09-continuous-261-296-seven-cell-rail-adjacency-closure.release-manifest.json'
    : 'data/buildops/combined-zones-r12k-b09-r12h-r12i-seven-cell-rail-adjacency-closure.release-manifest.json';
const PACKAGE = IS_R12Q
  ? 'b09-lower-two-turn-rail-closure'
  : IS_R12P
  ? 'b09-continuous-261-560-sixty-one-cell-summit-return-rail-closure'
  : IS_R12N
  ? 'b09-continuous-261-499-one-hundred-twenty-three-cell-rail-adjacency-closure'
  : IS_R12L ? 'b09-continuous-261-296-seven-cell-rail-adjacency-closure'
    : 'b09-r12h-r12i-seven-cell-rail-adjacency-closure';
const R12K_EXPECTED = Object.freeze({
  manifest: 'bcf8dae5d7d54912bb8d0fc330123240152cc8707720c8bc3db66499ad8cd0fd',
  identity: '20a73facf7718b89a43ea1050924a5894d7ec759306d744267d9e17d1a7704bb',
  forward: 'cd26ca670b6008e8e695bc15904a490767ccd7a71dcaa0face5d5a9efaa38a84',
  rollback: 'fc1d53d6905c9c05b94ec1096b4337b9efdbfe84f4747fff8fd1aba2ab8f7398',
  manifestGate: 'b2b6f8eadfb9269533bb7e012ac8298c4d47c9a50cacaf4e47c4d4c456d5186f',
  forwardPreflight: '5029265047232f7b041352dcea1a8891d057082071c8ccccf43eed5b2b575f22',
  rollbackPreflight: 'fd4ef927bacd8d69f8f2d231ad95eca11ea46a414fa744cdd142c2fe2cb312e2',
  forwardParser: '0d744757eeeaa35c282493a2441595b4eff9fbd8f190f2ab5ac62c93c1421c6e',
  rollbackParser: '7f36fb054772a84a4871ccabd4779164f521ff93066f5441a8570b9e67d15023',
  blockEntity: 'cec4fed7cc2680a4d5fd369d7258dee59e12cf6236a23880b6437f30faf19c8d',
  wrapper: '04ec2e36f0077fa9668e32edc374787c1f21f52cb24afc7109ef2148b23e41f8',
  sourceRegion: 'f8aad22ebf1a95182a3e8989f51f814cbd4217d85c7e73ee85be8b2c6ca4bcfb',
  sourceComplete: 'b814512643bc92ef3b0932b35f8fe12c984355dd0edb22c6e61d15130f9d38c9',
  sourceCompleted: '9aae3a36cd327825e85604cf7adfecb92d24ec9ef35db96ef36e048e75fd4c36',
  sourceQaPayload: 'c4ae5ead1b20ac18fcb4720f3706f522ca98baaa434c7bcf202088fe898981b1',
  proofPayload: '0b18785f201fb7533f8752fb9c3ad7bbaeff87ecab93e65beff9fd638cbe19f1',
  target: 'ddb53df35589e76f7fddfbba92dc76a13d682a99cbd87afe2131accf9ccf9849',
});
const R12L_EXPECTED = Object.freeze({
  manifest: '67fce2b7acc25a82a9df3a2f31068292f2d67d1d5837da2cbc7b60571e47d7e8',
  identity: 'd68e9311db9368f4078674461a1a53f24c7bb93f96a0b9c0018832399e4fd669',
  forward: 'bdf299192a3c605cdcca5792796d2839e492d742a8e90f705e513d852fd5a997',
  rollback: '78a984be561b53d6dcd43d2a8de63021c33a6176f6768367cad8613f9e0f5ae9',
  manifestGate: '921e8955e383e369ca14a9e5014d2592e50363ff07ab45f50c1b37b276751803',
  forwardPreflight: '03c9ecc75aa0e7080b16af51a1e8f520a253b4ff2309468fcdb91c442db3eeae',
  rollbackPreflight: '9019d4bb23b8fd42ff63a14d4e89aef80b981f354c6fc88743eb506c55a98380',
  forwardParser: '6b82028a6df1bf133d33f823ccd662375c6106463e93ca4c16f34f0cd16a41fe',
  rollbackParser: '03363dde8f8f254b7ab922b3e14c0b450b789e757f6acdf8850d27001f10684c',
  blockEntity: '09d4934259b73b5763fc4ba6654f6164f7e763d7f147caae0149bf0c6165bab8',
  wrapper: 'dddb9cca132f8852f2c0b66cd14e05a5f7836bfbfd8f19bbf3128d1c2cd5a7f1',
  sourceRegion: 'e478096bef5637c329b62a5955e1e8d700788762de432720e99abe37b55a748a',
  sourceComplete: '75fa7fd46dd3fc7ab606735b14d9cada3bb0b6f1cd217cc81b6d7a9c62d8247a',
  sourceCompleted: 'c26cd8ddad126c9a15e92935d6b11ea9d8b258f09bddad42e7b5b05f412921d2',
  sourceQaPayload: '4f068e52dc9cbc320cdc513d3f2c0bc8f1a489bef06dc3e1c8eebc5bc4a3e283',
  proofPayload: '0ae94eca43a1b080011e428098451af70caf5db2a38332702985561baf8c9be4',
  target: '7093da416a6d7dcb650b093ac4c1a8ea8d41d7c904c12be30f4d028a2a52d25d',
});
const R12N_EXPECTED = Object.freeze({
  manifest: '1153754d5bc8b43d67fa9371a5de668d3b778a0db0f06e67f72257fd2afbe43b',
  identity: '055c65a9f9794fd5f36025991ab997c3a6adea94f6e742038e33238b35182eb8',
  forward: '1109ba42b4f451dae8ef09f346e858f59cea8a91a56d31adbee77654320fd511',
  rollback: '3e6dc7bc27b819288e52e5399e760a8ba5c77524bffe3d7ed81e5dca9224474b',
  manifestGate: 'c4d27c97a3a7d26f9dde81205076deb4ebb50b517bfe99163a19a646dffaaa0c',
  forwardPreflight: 'e71db9037d4614ade8a6b2b7274fdcef768a3f090667c6071a976cd3ab9cf83e',
  rollbackPreflight: 'de9016607686e5818a6906fa12bb2393519f449701a322a99c9e296b8955bbfe',
  forwardParser: '133eeee281accc5d17db339e7d02c1b0cc97744af52e0186607163f6c11c0b3a',
  rollbackParser: '02727876c3296590d7b07e60339aae012745050e267f99e8d03db767d7da6e43',
  blockEntity: '3ec84aa185c059a6fd055b6e0a6021c2fab2a9d5613c018433d8a67213472ef8',
  wrapper: 'ac621baa7520679eddd902db67629f82c2973fbc0e747e5b98dbbd776da5b495',
  sourceRegion: 'f90f87dbd4b716eb44530794fe26a713109c67dee0f364a1f6a4903bc70611e9',
  sourceComplete: 'aca20b199c0b4449af8d71d1e4beb745737485316676c6e026c6494e22a5c4c5',
  sourceCompleted: 'efd7eb2c8b89d36a6debccf4025eb1a3ddede922490b0243a7063be8da94aea1',
  sourceQaPayload: 'f05d4dde795f7261fcccb7f72ebf2db7129c1574dddf1c9bf3b6f6350c382e68',
  proofPayload: 'b7f3360f304f0b99f6e9829970f3e807aebd1795bcfb99d82063ab95648db713',
  target: '25f09aebcb490dcf1815d172ff04417445aedb495386d7e1011694b33187fcdb',
});
const R12P_EXPECTED = Object.freeze({
  manifest: '47322de4686b577fc7c6b4230bea70f3536a8cff5b014919fcf5acbdbe0c6319',
  identity: 'b92a85b057adf11e38f690b9d254162bb7243c5929d14cb78033092901bfc86b',
  forward: '8a43d8d438a8a9d7559886d07fe9917c03df149445c14cbf6a95ab1038b37cbe',
  rollback: '34d3ba3ea120b1cc7642285e4ee5995c891cf9d10c054d3891bee8f8be0f3a70',
  manifestGate: '83a76cf37e304300c446c174b5791d0eb6606c02b25580750d29bc956dcf0dec',
  forwardPreflight: '02c420f1a8594f9a3ae414bd79a6425251e7b8edb28fd5a980c55ae1d46f32ce',
  rollbackPreflight: '1ea37b9c87a56f43fd55a52de2cdcbf39dfe9f0df5afb3611cfb948eca14315c',
  forwardParser: '16d93f8d3f04be24eda2a5a32355f88fe92782daf73479eb1161edff0ddb989b',
  rollbackParser: '3cfb81235d793d1212f9dfd789a5b73dd0988ba5e5d883f488de9fc38c63d5aa',
  blockEntity: '4ab15911574fb05f5f6b9986d8d1491d50a5a203450e3db7673be69a16785026',
  wrapper: 'd0e23bac097e2a6fef01d7f916076efe0d3127a757bd84753e068b4626ac366c',
  sourceRegion: 'cc6a76257c31208a0e1252a84c92df806fc8d5da9c22c8bd4d892f58b92975fc',
  sourceComplete: '940245ec1329f9dd672e3aff70d3084aacd4d632896c0d2e8bc2d62a8776f1ca',
  sourceCompleted: '6b5752472621525ef576b6f5f3c28cfbc2872416afef02706757a18b6b61e982',
  sourceQaPayload: '382e39b66da9c29f0cbf128f2b92dc2b81f3e248a4e79f6b825cb273d8d2f5e3',
  proofPayload: '8ffe8ba98ddbb46fad9a1adf72c8ed36cad97bcc579c4bee6be19c0de4d3d7e1',
  target: 'ade4597321fc40ebba2313b282b240c19fdabfeae5cc86f6887cf3ce5392b603',
});
const R12Q_EXPECTED = Object.freeze({
  manifest: 'c2d559b6fe904f9729be2227c5b20959090d6f42bebca500425ea33ef704dbcc',
  identity: '0c4a20f3b6c7f3fe2d848fb13f6085ac5559e0d3fa0185c8b3976097c4278341',
  forward: '402fd53bf3c249125c8d556d6dd304f0b225b69ec271e31f9c668ea9a1d01c7b',
  rollback: '547b97c3d05279ae38a8539f887f4fa84e89acc4e9f8a474d530da345c818e7b',
  manifestGate: '3306daccbd5b92d108a441ac066eb82a2a6df09ffa5bbcc1000bdfbc64bef9b8',
  forwardPreflight: '1b73df1842596c6fe1ef091dad33d1e17336ce44765d4ea3097e947053b30b1b',
  rollbackPreflight: '3066d52ad953bf54233f7aeb23e38551da7f5d0d8b68280b1d18c7dcbe6b9c11',
  forwardParser: '02449c38c298ca01394c75c9309f17683a4b4016487d9ed4edc76b7910682919',
  rollbackParser: '4d7553046d0f5219840974147c4c9d5dec77cd7f9c3a473f29f05493cdbb54b2',
  blockEntity: '5a52d913faf8f738d4e24862b0a1b822365feb30393ae450f9fa4a420781c3c9',
  wrapper: '7ae193a12304b4c3ae2438a2179223734f145d1363b00055af08eb459266847f',
  sourceRegion: '18ae22394785467bbb9dc284fe2975c55cb4631ff1ef0830422182eaf5131702',
  sourceComplete: 'ba310ac8e4163fd95fb6b765b57e9d7ff577867f0f10fd29870f5655c63656ad',
  sourceCompleted: 'dd8ab0fd4cf218281125c233c59e602d2d10c4c9573ca298220ac8efa27c3f64',
  sourceQaPayload: '175015618e055cf3429c120d03c6fa6d8095d1ec90ab44cbae1dea008d412e08',
  proofPayload: '7100e594e3f0bb4c62464a3ff9a6ffbe137ef9927135b4504082974bce460310',
  target: '021919255d63bd29c496a22493a9719131890f7c10b793c28ebdb7f1fc940984',
});
const EXPECTED = IS_R12Q ? R12Q_EXPECTED : IS_R12P ? R12P_EXPECTED
  : IS_R12N ? R12N_EXPECTED : IS_R12L ? R12L_EXPECTED : R12K_EXPECTED;
const ASC = 'minecraft:rail[shape=ascending_west,waterlogged=false]';
const ASC_NORTH = 'minecraft:rail[shape=ascending_north,waterlogged=false]';
const EW = 'minecraft:rail[shape=east_west,waterlogged=false]';
const NS = 'minecraft:rail[shape=north_south,waterlogged=false]';
const NORTH_EAST = 'minecraft:rail[shape=north_east,waterlogged=false]';
const NORTH_WEST = 'minecraft:rail[shape=north_west,waterlogged=false]';
const SOUTH_WEST = 'minecraft:rail[shape=south_west,waterlogged=false]';
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const bind = (filename) => ({ path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))), bytes: fs.statSync(absolute(filename)).size });
const invariant = (condition, message) => {
  if (!condition) throw new Error(`${PROFILE.toUpperCase()} offline QA rejected: ${message}`);
};
const boundJson = (filename, expected) => {
  const binding = bind(filename);
  invariant(binding.sha256 === expected, `${filename} identity drifted`);
  return { binding, payload: readJson(filename) };
};
const parse = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
  .filter((line) => line.startsWith('REPL ')).map((line) => {
    const fields = line.split(/\s+/);
    return { cell: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) },
      from: fields[7], to: fields[8] };
  });

const manifestBinding = bind(MANIFEST);
const manifest = readJson(MANIFEST);
invariant(manifestBinding.sha256 === EXPECTED.manifest
  && manifest.manifestIdentity === EXPECTED.identity && manifest.mvpScope === true
  && manifest.packages.length === 1 && manifest.packages[0].key === PACKAGE,
  'manifest contract drifted');
const forwardBinding = bind(manifest.packages[0].forward);
const rollbackBinding = bind(manifest.packages[0].rollback);
invariant(forwardBinding.sha256 === EXPECTED.forward && rollbackBinding.sha256 === EXPECTED.rollback,
  'operation identity drifted');
const forward = parse(manifest.packages[0].forward);
const rollback = parse(manifest.packages[0].rollback);
const targetCount = IS_R12Q ? 2 : IS_R12P ? 61 : IS_R12N ? 123 : 7;
const connectedCount = IS_R12Q ? 552 : IS_R12P ? 300 : IS_R12N ? 239 : IS_R12L ? 36 : 15;
const priorRailCount = IS_R12Q ? 550 : IS_R12P ? 489 : IS_R12N ? 366 : IS_R12L ? 359 : 352;
invariant(forward.length === targetCount && rollback.length === targetCount
  && hashCells(forward.map(({ cell }) => cell)) === EXPECTED.target
  && rollback.every((operation, index) => {
    const source = forward[forward.length - 1 - index];
    return JSON.stringify(operation.cell) === JSON.stringify(source.cell)
      && operation.from === source.to && operation.to === source.from;
  }), 'operation order/inverse drifted');
const expectedForward = IS_R12Q
  ? readJson(manifest.runtimeUpdateProof.path).geometry.operatedClosureCellsLowToHigh
    .slice().reverse().map(({ x, y, z, state }) => [2048 + x, 66 + y, z - 748, state])
  : IS_R12P
  ? readJson(manifest.runtimeUpdateProof.path).geometry.operatedClosureCellsLowToHigh
    .slice().reverse().map(({ x, y, z, state }) => [2049 + x, 65 + y, z - 768, state])
  : IS_R12N
  ? readJson(manifest.runtimeUpdateProof.path).geometry.operatedClosureCellsLowToHigh
    .slice().reverse().map(({ x, y, state }) => [2287 + x, 65 + y, -768, state])
  : IS_R12L ? [
  [2267, 145, -768, EW], [2268, 144, -768, ASC], [2269, 143, -768, ASC], [2270, 143, -768, EW],
  [2271, 142, -768, ASC], [2272, 141, -768, ASC], [2273, 140, -768, ASC],
] : [
  [2256, 153, -768, EW], [2257, 152, -768, ASC], [2258, 151, -768, ASC], [2259, 151, -768, EW],
  [2260, 150, -768, ASC], [2261, 149, -768, ASC], [2262, 148, -768, ASC],
];
invariant(forward.every(({ cell, from, to }, index) => cell.x === expectedForward[index][0]
  && cell.y === expectedForward[index][1] && cell.z === expectedForward[index][2]
  && from === 'minecraft:air' && to === expectedForward[index][3]), 'exact state sequence drifted');

const manifestGate = boundJson(path.join(EVIDENCE, 'exact-release-manifest-qa.json'), EXPECTED.manifestGate);
const forwardPreflight = boundJson(path.join(EVIDENCE, 'forward-preflight.json'), EXPECTED.forwardPreflight);
const rollbackPreflight = boundJson(path.join(EVIDENCE, 'projected-rollback-preflight.json'), EXPECTED.rollbackPreflight);
const forwardParser = boundJson(path.join(EVIDENCE, 'forward-parser-dry-run.json'), EXPECTED.forwardParser);
const rollbackParser = boundJson(path.join(EVIDENCE, 'rollback-parser-dry-run.json'), EXPECTED.rollbackParser);
const blockEntity = boundJson(path.join(EVIDENCE, 'block-entity-clearance.json'), EXPECTED.blockEntity);
const wrapper = boundJson(path.join(EVIDENCE, 'wrapper-print-plan.json'), EXPECTED.wrapper);
invariant(manifestGate.payload.status === 'PASS'
  && manifestGate.payload.totals.uniqueTargetCells === targetCount
  && manifestGate.payload.totals.crossPackageIntersectionCells === 0, 'manifest gate failed');
for (const preflight of [forwardPreflight.payload, rollbackPreflight.payload]) invariant(
  preflight.status === 'PASS' && preflight.operationCount === targetCount
    && preflight.passed === targetCount && preflight.failed === 0
    && preflight.regionsSnapshot.sha256 === EXPECTED.sourceRegion, 'preflight failed');
invariant(rollbackPreflight.payload.sourceOverlays.operationCount === targetCount
  && rollbackPreflight.payload.sourceOverlays.failed === 0, 'projected inverse overlay failed');
for (const [role, parser, expected] of [
  ['forward', forwardParser.payload, EXPECTED.forward],
  ['rollback', rollbackParser.payload, EXPECTED.rollback],
]) invariant(parser.status === 'dry_run' && parser.strictNoop === true
  && parser.operationRole === role && parser.operationSha256 === expected
  && parser.sourceOperationCount === targetCount && parser.commandCount === targetCount
  && parser.worldEditLeftoverCount === 0, `${role} parser failed`);
invariant(blockEntity.payload.status === 'PASS' && blockEntity.payload.operationCount === targetCount
  && blockEntity.payload.blockingBlockEntityCount === 0 && blockEntity.payload.chunksMissing === 0,
  'block-entity gate failed');
invariant(wrapper.payload.mode === 'PREPARE_ONLY' && wrapper.payload.globalGateDependency === 'NONE'
  && wrapper.payload.packageOrder.join(',') === PACKAGE && wrapper.payload.stages.length === 10,
  'real wrapper plan failed');

const checks = [
  [IS_R12Q ? 'R12Q-01-R12P-POST-QA-BINDING'
    : IS_R12P ? 'R12P-01-R12N-POST-QA-BINDING'
    : IS_R12N ? 'R12N-01-R12L-POST-QA-BINDING'
    : IS_R12L ? 'R12L-01-R12K-POST-QA-BINDING' : 'R12K-01-R12J-POST-QA-BINDING', manifest.source.completeSaveSha256 === EXPECTED.sourceComplete
    && manifest.source.regionSnapshotSha256 === EXPECTED.sourceRegion
    && manifest.source.predecessor.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
    && manifest.source.predecessor.postQaPayloadSha256 === EXPECTED.sourceQaPayload],
  [IS_R12Q ? 'R12Q-02-EXACT-TWO-CELL-LOWER-TURN-CLOSURE'
    : IS_R12P ? 'R12P-02-EXACT-SIXTY-ONE-CELL-SUMMIT-RETURN-CLOSURE'
    : IS_R12N ? 'R12N-02-EXACT-ONE-HUNDRED-TWENTY-THREE-CELL-CLOSURE'
    : `${PROFILE.toUpperCase()}-02-EXACT-SEVEN-CELL-CLOSURE`, manifest.target.operatedUnion.cellCount === targetCount
    && manifest.target.operatedUnion.coordinateSetSha256 === EXPECTED.target],
  [`${PROFILE.toUpperCase()}-03-EXACT-REVERSE-INVERSE`, rollback.length === targetCount],
  [`${PROFILE.toUpperCase()}-04-EXACT-PAPER-PROOF`, manifest.runtimeUpdateProof.proofPayloadSha256 === EXPECTED.proofPayload
    && manifest.runtimeUpdateProof.forwardStatePassCount === connectedCount
    && manifest.runtimeUpdateProof.rollbackAirPassCount === targetCount
    && manifest.runtimeUpdateProof.rollbackPriorStatePassCount === (IS_R12Q ? 550 : IS_R12P ? 239 : IS_R12N ? 116 : IS_R12L ? 29 : 8)],
  [`${PROFILE.toUpperCase()}-05-UPPER-TO-LOWER-ORDER`, manifest.safetyAudit.railUpdateDeterminism.forwardOrder === 'UPPER_TO_LOWER'
    && manifest.safetyAudit.railUpdateDeterminism.rollbackOrder === 'LOWER_TO_UPPER_EXACT_REVERSE'],
  [`${PROFILE.toUpperCase()}-06-SUPPORT-HEADROOM-INTERFACES`, manifest.safetyAudit.exactSolidSupportCount === targetCount
    && manifest.safetyAudit.exactAirHeadroomCount === targetCount
    && manifest.preservation.acceptedAdjacencyInterfaces.cellCount === (IS_R12Q ? 4 : IS_R12P ? 1 : 2)],
  [IS_R12Q ? 'R12Q-07-CONTINUOUS-9-560-CONNECTED-RESULT'
    : IS_R12P ? 'R12P-07-CONTINUOUS-261-560-CONNECTED-RESULT'
    : IS_R12N ? 'R12N-07-CONTINUOUS-261-499-CONNECTED-RESULT'
    : IS_R12L ? 'R12L-07-CONTINUOUS-261-296-CONNECTED-RESULT'
      : 'R12K-07-FIFTEEN-CELL-CONNECTED-RESULT',
  (IS_R12Q ? manifest.scope.geometry.resultingContinuous9Through560Rail.cellCount === connectedCount
    : IS_R12P ? manifest.scope.geometry.resultingContinuous261Through560Rail.cellCount === connectedCount
    : IS_R12N ? manifest.scope.geometry.resultingContinuous261Through499Rail.cellCount === connectedCount
    : IS_R12L ? manifest.scope.geometry.resultingContinuous261Through296Rail.cellCount === connectedCount
      : manifest.scope.geometry.resultingConnectedR12hThroughR12iRail.cellCount === connectedCount)
      && manifest.safetyAudit.railUpdateDeterminism.resultingConnectedComponentCellCount === connectedCount],
  [`${PROFILE.toUpperCase()}-08-HAZARD-ENTITY-CLEARANCE`, ['haloFluidCount', 'haloGravityCount',
    'haloUndeclaredMechanismCount', 'haloContainerOrControlCount', 'haloBlockEntityCount',
    'haloSavedEntityCount', 'haloProtectedRelicCount'].every((key) => manifest.safetyAudit[key] === 0)],
  [`${PROFILE.toUpperCase()}-09-PRIOR-RAILS-CAPS`, manifest.preservation.acceptedPriorRailCount === priorRailCount
    && manifest.preservation.retainedLowerB08Cap.cellCount === 12
    && manifest.preservation.retainedSummitZ11Cap.cellCount === 12
    && manifest.preservation.undeclaredPriorReleaseIntersectionCount === 0],
  [`${PROFILE.toUpperCase()}-10-FORWARD-PREFLIGHT`, forwardPreflight.payload.failed === 0],
  [`${PROFILE.toUpperCase()}-11-PROJECTED-ROLLBACK`, rollbackPreflight.payload.failed === 0],
  [`${PROFILE.toUpperCase()}-12-STRICT-PARSERS`, forwardParser.payload.strictNoop && rollbackParser.payload.strictNoop],
  [`${PROFILE.toUpperCase()}-13-BLOCK-ENTITY`, blockEntity.payload.blockingBlockEntityCount === 0],
  [`${PROFILE.toUpperCase()}-14-REAL-WRAPPER-PLAN`, wrapper.payload.mode === 'PREPARE_ONLY'],
  [`${PROFILE.toUpperCase()}-15-NO-COMMISSIONING-OR-LIVE-MUTATION`,
    Object.values(manifest.safetyBoundary).every((entry) => entry === false)],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
invariant(checks.every(({ status }) => status === 'PASS'), 'one or more readiness checks failed');
const reportWithoutIdentity = {
  schemaVersion: 1, generatedAtUtc: GENERATED_AT,
  status: IS_R12Q
    ? 'PASS_R12Q_LOWER_TWO_TURN_RAIL_CLOSURE_OFFLINE_READY'
    : IS_R12P
    ? 'PASS_R12P_CONTINUOUS_261_560_SIXTY_ONE_CELL_SUMMIT_RETURN_RAIL_CLOSURE_OFFLINE_READY'
    : IS_R12N
    ? 'PASS_R12N_CONTINUOUS_261_499_ONE_HUNDRED_TWENTY_THREE_CELL_RAIL_ADJACENCY_CLOSURE_OFFLINE_READY'
    : IS_R12L ? 'PASS_R12L_CONTINUOUS_261_296_SEVEN_CELL_RAIL_ADJACENCY_CLOSURE_OFFLINE_READY'
      : 'PASS_R12K_R12H_R12I_SEVEN_CELL_RAIL_ADJACENCY_CLOSURE_OFFLINE_READY',
  releaseNodeId: manifest.releaseNodeId, mvpScope: true,
  bindings: { manifest: manifestBinding, manifestIdentity: manifest.manifestIdentity,
    forward: forwardBinding, rollback: rollbackBinding,
    exactReleaseManifestQa: manifestGate.binding, forwardPreflight: forwardPreflight.binding,
    projectedRollbackPreflight: rollbackPreflight.binding, forwardParser: forwardParser.binding,
    rollbackParser: rollbackParser.binding, blockEntityClearance: blockEntity.binding,
    wrapperPrintPlan: wrapper.binding },
  result: { targetCellCount: targetCount, targetCoordinateSetSha256: EXPECTED.target,
    desiredStateCensus: IS_R12Q ? { [NORTH_WEST]: 1, [SOUTH_WEST]: 1 }
      : IS_R12P ? { [ASC_NORTH]: 58, [NS]: 2, [NORTH_EAST]: 1 }
      : IS_R12N ? { [ASC]: 90, [EW]: 33 } : { [ASC]: 5, [EW]: 2 },
    acceptedInterfaceCellCount: IS_R12Q ? 4 : IS_R12P ? 1 : 2,
    resultingConnectedRailCellCount: connectedCount, supportCellCount: targetCount,
    headroomCellCount: targetCount, preservedPriorRailCount: priorRailCount,
    forwardPreflightPassed: targetCount, projectedRollbackPreflightPassed: targetCount,
    wrapperMode: wrapper.payload.mode },
  functionalBoundary: { [IS_R12Q ? 'exactContinuous9Through560LowerTurnClosureReady'
    : IS_R12P ? 'exactContinuous261Through560SummitReturnClosureReady'
    : IS_R12N ? 'exactContinuous261Through499AdjacencyClosureReady'
    : IS_R12L ? 'exactContinuous261Through296AdjacencyClosureReady'
      : 'exactR12hR12iAdjacencyClosureReady']: true,
    liveExecutionReadyWithoutFreshKernel: false, rebindRequiredIfAcceptedTerminalAdvances: true,
    turnRailDesignedOrInstalled: IS_R12Q || IS_R12P, funicularCommissioned: false,
    passengerOrRescueRouteCommissioned: false,
    driveBrakeVehicleControlPowerDrainageInstalled: false },
  checks, summary: { passed: true, checkCount: 15, passCount: 15, failCount: 0 },
  safetyBoundary: { liveCallsPerformed: false, apiCallsPerformed: false,
    rconCallsPerformed: false, serviceMutationsPerformed: false, worldEditsPerformed: false },
};
const readinessPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, readinessPayloadSha256 };
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN), `# CZ-${PROFILE.toUpperCase()} ${IS_R12Q ? 'continuous 9..560 lower turns'
  : IS_R12P ? 'continuous 261..560 summit return'
  : IS_R12N ? 'continuous 261..499'
  : IS_R12L ? 'continuous 261..296' : 'R12H/R12I'} adjacency closure readiness\n\n`
  + `**Status:** ${report.status}  \n**Readiness payload:** \`${readinessPayloadSha256}\`\n\n`
  + `- Exact indices ${IS_R12Q ? '240 and 260 join all accepted 9..239, 241..259, and 261..560 rails into one 552-cell'
    : IS_R12P ? '500..560 extend accepted 261..499 through the summit turn into one 300-cell'
    : IS_R12N ? '297..419 join accepted 261..296 and 420..499 into one 239-cell'
    : IS_R12L ? '275..281 join accepted 261..274 and 282..296 into one 36-cell'
      : '286..292 close R12H to R12I into one 15-cell'} passive component.\n`
  + `- Exact Paper proof, ${targetCount}/${targetCount} source guards, projected inverse, parsers, block entities, and wrapper plan pass.\n`
  + `- All ${priorRailCount} prior rails and both external caps remain source-bound. Active systems and transport remain held.\n`);
console.log(JSON.stringify({ status: report.status, output: relative(OUT),
  readinessPayloadSha256, checkCount: 15, liveCallsPerformed: false }, null, 2));
