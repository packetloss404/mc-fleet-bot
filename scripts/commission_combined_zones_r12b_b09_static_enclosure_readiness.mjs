#!/usr/bin/env node
/** Read-only R12B static enclosure and mechanism-installation readiness seal. */

import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  boundsOf,
  buildB09MinimumReservation,
  cellKey,
  cellsIn,
  dilateCells,
  hashCells,
  mountainSurfaceY,
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
const EVIDENCE_DIRECTORY = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r12b-b09-static-readiness-r10e-20260822T002500Z',
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIRECTORY, 'r12b-readiness.json'));
const MARKDOWN_PATH = value('--markdown', path.join(EVIDENCE_DIRECTORY, 'r12b-readiness.md'));
const GENERATED_AT = value('--generated-at', '2026-08-22T00:25:00Z');
const LATEST_LEDGER_PATH = value(
  '--latest-ledger',
  'data/world-review/combined-zones-r10e-live-20260822T001339Z/evidence-ledger.json',
);
const LATEST_QA_PATH =
  'data/world-review/combined-zones-r10e-live-20260822T001339Z/r10e-post-release-qa.json';
const BASELINE_LEDGER_PATH =
  'data/world-review/combined-zones-r10d-live-20260821T235524Z/evidence-ledger.json';
const BASELINE_QA_PATH =
  'data/world-review/combined-zones-r10d-live-20260821T235524Z/r10d-post-release-qa.json';
const LATEST_MANIFEST_PATH =
  'data/buildops/combined-zones-r10e-b09-lower-guideway-passive-wayfinding.release-manifest.json';
const INPUTS = Object.freeze({
  technical: 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
});
const EXPECTED = Object.freeze({
  latestLedgerSha256: 'dc97d41cce9f162920fb76813061de071f387a16a1c19672595190399dda180c',
  latestQaSha256: '6c28d303646407e9590aa61b3aa5ff86550820443d60ff03b8c232f20ebdc6ee',
  latestManifestSha256: 'fea2757a99fe42787efe422edc77a3bf5685d246a4a106104cd698d15dcb4f1f',
  latestManifestIdentity: '6432084e91ad29a98618059879fcd76d7098f4fa91d9bd9bbe648fe56e93874f',
  latestCompleteSaveSha256: '4705f8c8b5e25de25af862071f117573bc7c0aff9dd0edb0e0c4b7fd369c0cf0',
  latestRegionSha256: '8c41238e78e061a7ac3aafd58712f81fb7c66e9a6b41b2afdaa2ac3d26848443',
  latestCompletedReleaseIdentitySha256:
    '6c40b77e68ae455330eab4658c0c859132f3e60570b1a98c97decd4134c192f5',
  baselineLedgerSha256: '4371d975528be948049d4ca31fec234e58029e92f33e72179a4d1b439863addb',
  baselineQaSha256: '51414674ee78db58b5091ff7cf9433f42309bef6c4deb18987e89d11bc099465',
  baselineCompleteSaveSha256:
    'f3bdba213805aa601b8bed7f9cb58b75a44a84f27ef643a80a8e0bf6d53672cb',
  baselineRegionSha256: '5ab0829c8d4a5e5b88f7b3b494b36ddc5461cc52cc902fa7223fa2b440ea1284',
  baselineCompletedReleaseIdentitySha256:
    'f8d324f9adc05de99090c6e511479b13e703f3202bda51c3a1157ea7958e6ff7',
  technicalSha256: 'f9b57fb317ff983acacbf98cb0a7776246c242025f583d9795594a6a799898c8',
  connectorsSha256: '8bb2dd803c434667dfeee440ccdf8428a115962e21dd1b3b0e6955cce672dc4e',
  d05Sha256: '1446c75cec504478130a8e9c5569c68c7a7569a29c4210e9b21ca5d804aeb2f3',
  releaseContractSha256: '64f4432f00bd31fe8e5cd12921cd91bdc84b32c5c16630e62138accdf94ed8e0',
  centerlineCount: 561,
  centerlineSha256: 'e8905742a77148d13d799362da7d65e9b02bcf96455d580fbee27367b2d24221',
  routeCount: 1_096,
  routeSha256: '2f808ddc7b077a2b256c56b96ba90631c0a94d26ac2b18b8e2da5e5660016855',
  connectedVoidCount: 1_116,
  connectedVoidSha256: 'c0e162baf89a1e57db122facfaed2d11ea7ca3263716841caeb8684b8297c4b6',
  boundaryCount: 3_346,
  boundarySha256: 'ea023f34cd465cb9f54944cb92822a69ed9104b9550be047d5724a33986ac915',
  accommodationCount: 7_800,
  accommodationSha256: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  accommodationStateSetSha256:
    '085b77456806ea0496343cd9eb47107da9c37872a67632ebb630a563914937ca',
  latestAccommodationStateSetSha256:
    'c35c3de3dcfa24e3f588749aef0f8bfa09e26d6e9235a0a93c1b36afb5a4deef',
  latestTargetCount: 15,
  latestTargetSha256: '81625f2011e725b624a699ad7176ee2c3d85f065f3f9e1589ec3cd96f1cb705f',
  latestHaloCount: 405,
  latestHaloSha256: '1e3af9818dc4de1e33dff5cf2bc95b6015399c6ca1eba4aea50e776e0e350caa',
  lowerCapSha256: 'a422d177fb7f1571b8a6243fcbf014fda17a910e60e7c03f7c21051f697a3e96',
  summitCapSha256: 'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
});
const RELEASES = Object.freeze([
  {
    id: 'R07D',
    manifest: 'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
    manifestSha256: '194f676779446cc7a0ec9f4ebc428910e185246a5c5e3abb268edd258e47c75a',
    qa: 'data/world-review/combined-zones-r07d-live-20260821T164505Z/r07d-post-release-qa.json',
    qaSha256: 'b548009b76b9a14694cee9b7e089cb81c8b03a89f0a1bb5dd0222d7bff958130',
    rollbackEvidence: '09-r07d-rollback-preflight.json',
    rollbackEvidenceSha256: 'aa173a770f00eb5b53170a23aa390a961b91603aa615ade49ad6de907808f077',
    rollbackOrder: 9,
  },
  {
    id: 'R07E',
    manifest: 'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
    manifestSha256: '454fb9a8cf32550ccf7547921ffe23e5b04dc0fa5aa514ae4ba778b428edf28b',
    qa: 'data/world-review/combined-zones-r07e-live-20260821T170500Z/r07e-post-release-qa.json',
    qaSha256: '0c2979a58e397fc5604e0f014ce6b40e1f811f68acd4720483f35af7eb2af12c',
    rollbackEvidence: '08-r07e-rollback-preflight.json',
    rollbackEvidenceSha256: 'f3573c5346dfb5f5e50e07442e317357baaf2b949030d3b5df480187db7825a1',
    rollbackOrder: 8,
  },
  {
    id: 'R07F',
    manifest: 'data/buildops/combined-zones-r07f-b09-lower-guideway-segment-01.release-manifest.json',
    manifestSha256: 'f8ade888c396f8407a40d4450f1dd9a01240a8640f7791185c7d23e253694823',
    qa: 'data/world-review/combined-zones-r07f-live-20260821T172700Z/r07f-post-release-qa.json',
    qaSha256: 'a0d4e81c47fcfb7ebf8db88c8f45c3c5b6d617e78ba043596dab6d8908223aa3',
    rollbackEvidence: '07-r07f-rollback-preflight.json',
    rollbackEvidenceSha256: '32485f8365925172700e5adf62542926a679ac0eda320c289d716abae759ea08',
    rollbackOrder: 7,
  },
  {
    id: 'R07H',
    manifest: 'data/buildops/combined-zones-r07h-b09-lower-guideway-segment-02.release-manifest.json',
    manifestSha256: '63c8189593a9c6974fc5562630aee6ceffa30d268ccc69bec97f7e91dc5ac18e',
    qa: 'data/world-review/combined-zones-r07h-live-20260821T183544Z/r07h-post-release-qa.json',
    qaSha256: 'b126e1c8acdfa6fd92cbae74d125c60e4f6fe9ebf137338e890fadb1d5f9c992',
    rollbackEvidence: '06-r07h-rollback-preflight.json',
    rollbackEvidenceSha256: 'd32bed48b9f009e2b774fda3f5d8b394278c808503b1b3e66fdfd5023bccc0ea',
    rollbackOrder: 6,
  },
  {
    id: 'R07I',
    manifest: 'data/buildops/combined-zones-r07i-b09-maximal-curve-summit-return.release-manifest.json',
    manifestSha256: 'd89fb62731a8d4d3a238d029a43d0be246e1170b3ff222b5e61cc380d5745098',
    qa: 'data/world-review/combined-zones-r07i-live-20260821T190347Z/r07i-post-release-qa.json',
    qaSha256: 'fe20b5727bb42ca82a7bc7847a17a3a5cb15ee95bfc45f041971f4202988265c',
    rollbackEvidence: '05-r07i-rollback-preflight.json',
    rollbackEvidenceSha256: '8f9616b268e0189d1e34f58f55b2efd3bc0627d0dd7c3632cf9343b99e0b30a9',
    rollbackOrder: 5,
  },
  {
    id: 'R10B',
    manifest: 'data/buildops/combined-zones-r10b-b09-summit-internal-approach.release-manifest.json',
    manifestSha256: '0afc5608b73ac59ac44425a16195cd2c603e8a068c67d1140f02faaa115777d5',
    qa: 'data/world-review/combined-zones-r10b-live-20260821T230936Z/r10b-post-release-qa.json',
    qaSha256: 'ed9fc5b95788f987bb399f91e23571d91a8c7132449fbb88418cbf994d7ff836',
    rollbackEvidence: '04-r10b-rollback-preflight.json',
    rollbackEvidenceSha256: '2f44090296f15b708bf9e1f2561699f87f972c9c3732ffc62bed6a57e2dfb153',
    rollbackOrder: 4,
  },
  {
    id: 'R10C',
    manifest: 'data/buildops/combined-zones-r10c-b09-summit-passive-lighting.release-manifest.json',
    manifestSha256: 'f0141a2f4d4c94f51aa8ec992b60cdfb82797efdd1c917741618c79971901698',
    qa: 'data/world-review/combined-zones-r10c-live-20260821T233530Z/r10c-post-release-qa.json',
    qaSha256: 'b56085c1689af4982e199c31a1c0cf7a9079bc2715c4d7654f2acd0990e000ee',
    rollbackEvidence: '03-r10c-rollback-preflight.json',
    rollbackEvidenceSha256: '3db20ae9991023a072b680d9f3df965594dbd37768213c1fab0da2dac4898e18',
    rollbackOrder: 3,
  },
  {
    id: 'R10D',
    manifest: 'data/buildops/combined-zones-r10d-b09-lower-station-passive-lighting.release-manifest.json',
    manifestSha256: '73ff36b566b00ec263e9f6080bca16b235fbde7dcc685b6eb21bc2c3c145c86e',
    qa: BASELINE_QA_PATH,
    qaSha256: EXPECTED.baselineQaSha256,
    rollbackEvidence: '02-r10d-rollback-preflight.json',
    rollbackEvidenceSha256: 'e59605b7b0ae454772a8288f50ffb3d1fbdd3d11e2670c41bb9fc55701b4ea3e',
    rollbackOrder: 2,
  },
  {
    id: 'R10E',
    manifest: LATEST_MANIFEST_PATH,
    manifestSha256: EXPECTED.latestManifestSha256,
    qa: LATEST_QA_PATH,
    qaSha256: EXPECTED.latestQaSha256,
    rollbackEvidence: '01-r10e-rollback-preflight.json',
    rollbackEvidenceSha256: '4ed116366b4fc5da75e2fbdc590718470aa6d21d1966dd2e0e2e029fd695a302',
    rollbackOrder: 1,
  },
]);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0],
  [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const LIGHT = 'minecraft:sea_lantern';
const ACTIVE_MECHANISMS = new Set([
  'minecraft:rail', 'minecraft:powered_rail', 'minecraft:detector_rail',
  'minecraft:activator_rail', 'minecraft:redstone_wire', 'minecraft:redstone_torch',
  'minecraft:redstone_wall_torch', 'minecraft:repeater', 'minecraft:comparator',
  'minecraft:piston', 'minecraft:sticky_piston', 'minecraft:observer',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:hopper',
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
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12B B09 readiness rejected: ${message}`);
};
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const readBoundJson = (filename, expectedSha256) => {
  const binding = fileBinding(filename);
  invariant(binding.sha256 === expectedSha256, `${filename} identity drifted`);
  return JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
};
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const stateBase = (state) => state.split('[', 1)[0];
const stateCensus = (records) => Object.fromEntries([...records.reduce(
  (counts, { state }) => counts.set(state, (counts.get(state) ?? 0) + 1), new Map(),
).entries()].sort(([left], [right]) => left.localeCompare(right)));
const stateSetSha256 = (records) => sha256(`combined-zones-current-block-state-set-v1\n${records
  .slice().sort((left, right) => left.cell.x - right.cell.x
    || left.cell.y - right.cell.y || left.cell.z - right.cell.z)
  .map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);

function orderedCenterlineSha256(points) {
  const lines = points.map((point) => (
    `${point.index}:${point.x},${point.y},${point.z}:${point.kind}`
  ));
  return sha256(`combined-zones-ordered-centerline-v1\n${lines.join('\n')}\n`);
}

function buildCenterline(model, endpoints) {
  const portal = endpoints.from;
  const summit = endpoints.to;
  let climbZ = portal.z - 1;
  while (climbZ > summit.z
    && mountainSurfaceY(portal.x, climbZ - 1, model)
      !== mountainSurfaceY(portal.x, climbZ, model)) climbZ -= 1;
  let throatX = null;
  for (let distance = 1; distance <= model.extents.east; distance += 1) {
    const x = portal.x + distance;
    if (mountainSurfaceY(x, climbZ, model) === portal.y - 1
      && mountainSurfaceY(x - 1, climbZ, model) === portal.y - 1) {
      throatX = x;
      break;
    }
  }
  invariant(throatX !== null, 'could not independently derive the B09 throat');
  const faceRun = throatX - portal.x;
  const points = [];
  for (let distance = 0; distance <= faceRun; distance += 1) {
    points.push({
      x: portal.x + distance,
      y: portal.y,
      z: portal.z,
      kind: distance === 0 ? 'portal-interface' : 'level-station-throat',
    });
  }
  for (let offset = 1; offset <= portal.z - climbZ; offset += 1) {
    points.push({ x: throatX, y: portal.y, z: portal.z - offset, kind: 'level-hairpin' });
  }
  for (let distance = 1; distance <= faceRun; distance += 1) {
    const x = throatX - distance;
    points.push({
      x,
      y: mountainSurfaceY(x, climbZ, model) + 1,
      z: climbZ,
      kind: distance === 1 ? 'level-hairpin-exit' : 'face-ascent',
    });
  }
  const northRun = Math.abs(summit.z - climbZ);
  for (let distance = 1; distance <= northRun; distance += 1) {
    const z = climbZ - distance;
    points.push({
      x: summit.x,
      y: mountainSurfaceY(summit.x, z, model) + 1,
      z,
      kind: distance === 1 ? 'level-summit-curve-exit'
        : distance === northRun ? 'summit-interface' : 'summit-ascent',
    });
  }
  return points.map((point, index) => ({ ...point, index }));
}

function components(cells) {
  const remaining = new Set(uniqueCells(cells).map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    let size = 0;
    while (stack.length) {
      const [x, y, z] = stack.pop().split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const neighbour = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(neighbour)) stack.push(neighbour);
      }
    }
    sizes.push(size);
  }
  sizes.sort((left, right) => right - left);
  return { componentCount: sizes.length, componentSizes: sizes };
}

function operationCells(filename) {
  const cells = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields.length === 9, `${filename} contains a malformed operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    for (let x = Math.min(coordinates[0], coordinates[3]);
      x <= Math.max(coordinates[0], coordinates[3]); x += 1) {
      for (let y = Math.min(coordinates[1], coordinates[4]);
        y <= Math.max(coordinates[1], coordinates[4]); y += 1) {
        for (let z = Math.min(coordinates[2], coordinates[5]);
          z <= Math.max(coordinates[2], coordinates[5]); z += 1) {
          cells.push({ x, y, z });
        }
      }
    }
  }
  return uniqueCells(cells);
}

const latestLedger = readBoundJson(LATEST_LEDGER_PATH, EXPECTED.latestLedgerSha256);
const latestQa = readBoundJson(LATEST_QA_PATH, EXPECTED.latestQaSha256);
const latestManifest = readBoundJson(LATEST_MANIFEST_PATH, EXPECTED.latestManifestSha256);
const latestPostIdentity = readJson(latestLedger.postSnapshot.identity.path);
const latestPostIntake = readJson(latestLedger.postSnapshot.completeSaveIntake.path);
invariant(latestLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && latestLedger.transactionId === latestManifest.transactionId
  && latestLedger.manifest.sha256 === EXPECTED.latestManifestSha256
  && latestManifest.manifestIdentity === EXPECTED.latestManifestIdentity
  && latestLedger.stages.length === 17
  && latestLedger.stages.every(({ status }) => status === 'PASS')
  && latestLedger.evidenceBindings.length === 17
  && latestLedger.completedReleaseIdentitySha256
    === EXPECTED.latestCompletedReleaseIdentitySha256
  && latestQa.summary.passed === true
  && latestQa.releaseIdentity.completedReleaseIdentitySha256
    === EXPECTED.latestCompletedReleaseIdentitySha256
  && latestQa.disposition.funicularCommissioned === false,
'latest R10E wrapper/post-QA evidence is not terminal and intact');
for (const binding of latestLedger.evidenceBindings) {
  const actual = fileBinding(binding.path);
  invariant(actual.sha256 === binding.sha256 && actual.bytes === binding.bytes,
    `latest ledger binding drifted: ${binding.path}`);
}
invariant(latestLedger.postSnapshot.completeSaveSha256 === EXPECTED.latestCompleteSaveSha256
  && latestPostIdentity.sha256 === EXPECTED.latestRegionSha256
  && latestPostIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && latestPostIntake.packageIdentity.completeSaveSha256 === EXPECTED.latestCompleteSaveSha256,
'latest R10E immutable post binding drifted');

const baselineLedger = readBoundJson(BASELINE_LEDGER_PATH, EXPECTED.baselineLedgerSha256);
const baselineQa = readBoundJson(BASELINE_QA_PATH, EXPECTED.baselineQaSha256);
const baselinePostIdentity = readJson(baselineLedger.postSnapshot.identity.path);
invariant(baselineLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && baselineLedger.postSnapshot.completeSaveSha256 === EXPECTED.baselineCompleteSaveSha256
  && baselinePostIdentity.sha256 === EXPECTED.baselineRegionSha256
  && baselineLedger.completedReleaseIdentitySha256
    === EXPECTED.baselineCompletedReleaseIdentitySha256
  && baselineQa.summary.passed === true
  && baselineQa.disposition.funicularCommissioned === false,
'accepted R10D baseline binding drifted');

const technical = readBoundJson(INPUTS.technical, EXPECTED.technicalSha256);
const connectors = readBoundJson(INPUTS.connectors, EXPECTED.connectorsSha256);
const d05 = readBoundJson(INPUTS.d05, EXPECTED.d05Sha256);
const releaseContract = readBoundJson(INPUTS.releaseContract, EXPECTED.releaseContractSha256);
const r12 = releaseContract.releaseSequence.find(
  ({ id }) => id === 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
);
invariant(r12?.canonicalOwners.includes('GA-S1')
  && technical.nullHeldSystemsAndInterfaces.some(
    ({ id }) => id === 'B09-NULL-02-DRIVE-BRAKE-VEHICLE-AND-BARRIER-MECHANISMS',
  ), 'R12/B09 commissioning boundary drifted');

const releaseEvidence = [];
const manifests = new Map();
let rollbackOperationCount = 0;
for (const release of RELEASES) {
  const manifest = readBoundJson(release.manifest, release.manifestSha256);
  const qa = readBoundJson(release.qa, release.qaSha256);
  const rollbackEvidencePath = path.join(EVIDENCE_DIRECTORY, release.rollbackEvidence);
  const rollback = readBoundJson(rollbackEvidencePath, release.rollbackEvidenceSha256);
  invariant(String(qa.status).startsWith('PASS') && qa.summary?.passed === true,
    `${release.id} post-release QA is not accepted`);
  invariant(rollback.status === 'PASS' && rollback.failed === 0
    && rollback.passed === rollback.operationCount
    && rollback.regionsSnapshot.sha256 === EXPECTED.latestRegionSha256,
  `${release.id} ordered rollback preflight failed`);
  const expectedOverlayCount = release.rollbackOrder - 1;
  invariant(expectedOverlayCount === 0
    ? rollback.sourceOverlays === null
    : rollback.sourceOverlays.artifacts.length === expectedOverlayCount
      && rollback.sourceOverlays.failed === 0,
  `${release.id} rollback overlay order drifted`);
  rollbackOperationCount += rollback.operationCount;
  manifests.set(release.id, manifest);
  releaseEvidence.push({
    id: release.id,
    manifest: fileBinding(release.manifest),
    postReleaseQa: fileBinding(release.qa),
    rollbackOrder: release.rollbackOrder,
    rollbackOperationPath: manifest.packages[0].rollback,
    rollbackPreflight: fileBinding(rollbackEvidencePath),
    rollbackOperationCount: rollback.operationCount,
    precedingRollbackOverlayCount: expectedOverlayCount,
    precedingRollbackOperationCount: rollback.sourceOverlays?.operationCount ?? 0,
  });
}
invariant(rollbackOperationCount === 6_604,
'complete B09 rollback operation-group total drifted');

const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const centerline = buildCenterline(model.formula, endpoints);
invariant(centerline.length === EXPECTED.centerlineCount
  && orderedCenterlineSha256(centerline) === EXPECTED.centerlineSha256,
'B09 centerline drifted');
const lowerStraight = [];
for (let x = 2051; x <= 2287; x += 1) {
  for (let y = 130; y <= 131; y += 1) lowerStraight.push({ x, y, z: -748 });
}
const returnSeeds = centerline.slice(240, 551).flatMap(({ x, y, z }) => [
  { x, y, z }, { x, y: y + 1, z },
]);
const route = uniqueCells([...lowerStraight, ...returnSeeds]);
const summitInterior = [];
for (let offset = 8; offset >= 0; offset -= 1) {
  for (let dy = 0; dy <= 1; dy += 1) {
    summitInterior.push({
      x: endpoints.to.x,
      y: endpoints.to.y - offset + dy,
      z: endpoints.to.z + offset,
    });
  }
}
const summitSeam = [{ x: 2048, y: 295, z: -819 }, { x: 2048, y: 296, z: -819 }];
const connectedVoid = uniqueCells([...route, ...summitInterior, ...summitSeam]);
const connectedVoidKeys = new Set(connectedVoid.map(cellKey));
const boundary = uniqueCells(connectedVoid.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))
)).filter((cell) => !connectedVoidKeys.has(cellKey(cell))));
const accommodation = buildB09MinimumReservation(model.formula, endpoints);
const accommodationKeys = new Set(accommodation.map(cellKey));
const fixtureIndices = [
  4, 7, 15, 31, 47, 63, 79, 95, 111, 127,
  143, 159, 175, 191, 207, 223, 239, 552, 556, 560,
];
const fixtures = fixtureIndices.map((index) => {
  const point = centerline[index];
  return { x: point.x, y: point.y + 2, z: point.z };
});
const lowerCap = cellsIn(
  manifests.get('R07D').scope.geometry.westIsolationCap.bounds,
);
const summitCap = cellsIn(
  manifests.get('R07E').scope.geometry.summitInterfaceCap.bounds,
);
invariant(route.length === EXPECTED.routeCount && hashCells(route) === EXPECTED.routeSha256
  && connectedVoid.length === EXPECTED.connectedVoidCount
  && hashCells(connectedVoid) === EXPECTED.connectedVoidSha256
  && components(connectedVoid).componentCount === 1
  && boundary.length === EXPECTED.boundaryCount
  && hashCells(boundary) === EXPECTED.boundarySha256
  && accommodation.length === EXPECTED.accommodationCount
  && hashCells(accommodation) === EXPECTED.accommodationSha256
  && lowerCap.length === 12 && hashCells(lowerCap) === EXPECTED.lowerCapSha256
  && summitCap.length === 12 && hashCells(summitCap) === EXPECTED.summitCapSha256,
'accepted B09 static geometry drifted');

const latestTargetCells = uniqueCells(latestManifest.packages.flatMap(
  ({ forward }) => operationCells(forward),
));
const latestHalo = dilateCells(latestTargetCells, 1);
const boundaryKeys = new Set(boundary.map(cellKey));
invariant(latestTargetCells.length === EXPECTED.latestTargetCount
  && hashCells(latestTargetCells) === EXPECTED.latestTargetSha256
  && latestManifest.target.operatedUnion.coordinateSetSha256 === EXPECTED.latestTargetSha256
  && latestHalo.length === EXPECTED.latestHaloCount
  && hashCells(latestHalo) === EXPECTED.latestHaloSha256
  && latestTargetCells.every((cell) => accommodationKeys.has(cellKey(cell)))
  && latestTargetCells.every((cell) => boundaryKeys.has(cellKey(cell)))
  && latestTargetCells.every((cell) => !connectedVoidKeys.has(cellKey(cell))),
'R10E latest-state delta is not the exact declared B09 boundary fixture set');

const baselineReader = new AnvilReader(absolute(baselineLedger.postSnapshot.regions));
const latestReader = new AnvilReader(absolute(latestLedger.postSnapshot.regions));
const latestEntityReader = new AnvilReader(
  absolute(path.join(latestLedger.postSnapshot.root, 'entities')),
);
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
const baselineAccommodation = await records(baselineReader, accommodation);
const latestAccommodation = await records(latestReader, accommodation);
const latestVoid = await records(latestReader, connectedVoid);
const latestBoundary = await records(latestReader, boundary);
const latestFixtures = await records(latestReader, fixtures);
const latestCaps = await records(latestReader, [...lowerCap, ...summitCap]);
const baselineStateSha256 = stateSetSha256(baselineAccommodation);
const latestStateSha256 = stateSetSha256(latestAccommodation);
const accommodationMismatches = baselineAccommodation.flatMap((baseline, index) => {
  const latest = latestAccommodation[index];
  invariant(cellKey(baseline.cell) === cellKey(latest.cell),
    'B09 baseline/latest accommodation ordering drifted');
  return baseline.state === latest.state ? [] : [{
    cell: latest.cell,
    before: baseline.state,
    after: latest.state,
  }];
});
const accommodationMismatchKeys = new Set(accommodationMismatches.map(({ cell }) => cellKey(cell)));
const latestTargetKeys = new Set(latestTargetCells.map(cellKey));
invariant(baselineStateSha256 === EXPECTED.accommodationStateSetSha256
  && latestStateSha256 === EXPECTED.latestAccommodationStateSetSha256
  && accommodationMismatches.length === EXPECTED.latestTargetCount
  && [...accommodationMismatchKeys].every((key) => latestTargetKeys.has(key))
  && [...latestTargetKeys].every((key) => accommodationMismatchKeys.has(key))
  && accommodationMismatches.every(({ before, after }) => (
    before === DIORITE && after === LIGHT
  )), 'B09 accommodation delta is not exactly the accepted R10E fixture release');
invariant(latestVoid.every(({ state }) => state === AIR)
  && latestBoundary.filter(({ state }) => state === DIORITE).length === 3_326
  && latestBoundary.filter(({ state }) => state === LIGHT).length === 20
  && latestFixtures.every(({ state }) => state === LIGHT)
  && latestCaps.every(({ state }) => state === DIORITE),
'B09 void, enclosure, fixtures, or external caps are not exact');
const accommodationCensus = stateCensus(latestAccommodation);
invariant(accommodationCensus[AIR] === 1_155
  && accommodationCensus[DIORITE] === 6_625
  && accommodationCensus[LIGHT] === 20
  && Object.keys(accommodationCensus).length === 3,
'B09 accommodation contains an undeclared material');
const fluidCount = latestAccommodation.filter(({ state }) => (
  ['minecraft:water', 'minecraft:lava'].includes(stateBase(state))
    || state.includes('waterlogged=true')
)).length;
const activeMechanismCount = latestAccommodation.filter(
  ({ state }) => ACTIVE_MECHANISMS.has(stateBase(state)),
).length;
const containerOrControlCount = latestAccommodation.filter(
  ({ state }) => CONTAINER_OR_CONTROL.has(stateBase(state)),
).length;
invariant(fluidCount === 0 && activeMechanismCount === 0 && containerOrControlCount === 0,
'B09 accommodation contains fluid, active mechanism, or container/control state');

const entityReviewCells = dilateCells(accommodation, 1);
const entityReviewKeys = new Set(entityReviewCells.map(cellKey));
const entityBounds = boundsOf(entityReviewCells);
const blockEntityIntersections = [];
const savedEntityIntersections = [];
for (let chunkX = Math.floor(entityBounds.minX / 16);
  chunkX <= Math.floor(entityBounds.maxX / 16); chunkX += 1) {
  for (let chunkZ = Math.floor(entityBounds.minZ / 16);
    chunkZ <= Math.floor(entityBounds.maxZ / 16); chunkZ += 1) {
    const chunk = await latestReader.chunk(chunkX, chunkZ);
    for (const blockEntity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const key = `${Number(blockEntity.x)},${Number(blockEntity.y)},${Number(blockEntity.z)}`;
      if (entityReviewKeys.has(key)) blockEntityIntersections.push({ id: blockEntity.id, key });
    }
    const entityChunk = await latestEntityReader.chunk(chunkX, chunkZ);
    for (const entity of entityChunk?.Entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const cell = {
        x: Math.floor(Number(entity.Pos[0])),
        y: Math.floor(Number(entity.Pos[1])),
        z: Math.floor(Number(entity.Pos[2])),
      };
      if (entityReviewKeys.has(cellKey(cell))) {
        savedEntityIntersections.push({ id: entity.id ?? null, position: entity.Pos.map(Number) });
      }
    }
  }
}
invariant(blockEntityIntersections.length === 0 && savedEntityIntersections.length === 0,
'B09 accommodation halo contains a block entity or saved movable entity');

const rollbackChain = releaseEvidence.slice().sort(
  (left, right) => left.rollbackOrder - right.rollbackOrder,
);
invariant(rollbackChain.map(({ id }) => id).join(',')
  === 'R10E,R10D,R10C,R10B,R07I,R07H,R07F,R07E,R07D'
  && rollbackChain.at(-1).precedingRollbackOperationCount === 6_598,
'global reverse rollback order drifted');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_B09_STATIC_ENCLOSURE_AND_MECHANISM_INSTALLATION_READINESS_ACCEPTED',
  releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
  commissioningScopeId: 'CZ-R12B-P1-B09-STATIC-ENCLOSURE-AND-INSTALLATION-READINESS',
  mvpScope: true,
  mode: 'READ_ONLY_STATIC_READINESS_SEAL',
  terminalState: {
    ledger: fileBinding(LATEST_LEDGER_PATH),
    transactionId: latestLedger.transactionId,
    completedReleaseIdentitySha256: latestLedger.completedReleaseIdentitySha256,
    postSnapshotRoot: latestLedger.postSnapshot.root,
    postCompleteSaveSha256: latestLedger.postSnapshot.completeSaveSha256,
    postRegionSha256: latestPostIdentity.sha256,
    postReleaseQa: fileBinding(LATEST_QA_PATH),
    r10eTarget: classManifest(latestTargetCells),
    r10eInteractionHalo: classManifest(latestHalo),
    r10eB09TargetIntersectionCount: latestTargetCells.filter(
      (cell) => accommodationKeys.has(cellKey(cell)),
    ).length,
    r10eB09HaloIntersectionCount: latestHalo.filter(
      (cell) => accommodationKeys.has(cellKey(cell)),
    ).length,
  },
  acceptedB09Baseline: {
    ledger: fileBinding(BASELINE_LEDGER_PATH),
    postReleaseQa: fileBinding(BASELINE_QA_PATH),
    completedReleaseIdentitySha256: baselineLedger.completedReleaseIdentitySha256,
    postCompleteSaveSha256: baselineLedger.postSnapshot.completeSaveSha256,
    postRegionSha256: baselinePostIdentity.sha256,
  },
  sourceBindings: {
    technical: fileBinding(INPUTS.technical),
    connectors: fileBinding(INPUTS.connectors),
    d05: fileBinding(INPUTS.d05),
    releaseContract: fileBinding(INPUTS.releaseContract),
    physicalReleases: releaseEvidence,
  },
  geometry: {
    centerlinePointCount: centerline.length,
    centerlineSha256: orderedCenterlineSha256(centerline),
    acceptedGuidewayRoute: classManifest(route),
    connectedLowerToSummitVoid: {
      ...classManifest(connectedVoid),
      ...components(connectedVoid),
      exactAirCellCount: latestVoid.length,
    },
    completeFaceBoundary: {
      ...classManifest(boundary),
      stateCensus: stateCensus(latestBoundary),
      nonSolidCellCount: 0,
    },
    minimumAccommodation: {
      ...classManifest(accommodation),
      stateCensus: accommodationCensus,
      baselineBlockStateSetSha256: baselineStateSha256,
      latestBlockStateSetSha256: latestStateSha256,
      baselineToLatestMismatchCount: accommodationMismatches.length,
      exactDeclaredR10eMismatchCount: accommodationMismatches.length,
      mismatchCoordinateSetSha256: hashCells(accommodationMismatches.map(({ cell }) => cell)),
      mismatchTransitionCensus: {
        'minecraft:polished_diorite->minecraft:sea_lantern': accommodationMismatches.length,
      },
    },
    passiveStationFixtures: {
      ...classManifest(fixtures),
      centerlineIndices: fixtureIndices,
      exactSeaLanternCount: latestFixtures.length,
    },
    retainedLowerB08Cap: {
      ...classManifest(lowerCap),
      exactPolishedDioriteCount: lowerCap.length,
    },
    retainedSummitZ11Cap: {
      ...classManifest(summitCap),
      exactPolishedDioriteCount: summitCap.length,
    },
    entityReviewHalo: classManifest(entityReviewCells),
  },
  safetyAndReadiness: {
    routeObstructionCount: 0,
    boundaryNonSolidCount: 0,
    fluidCellCount: fluidCount,
    activeMechanismCellCount: activeMechanismCount,
    containerOrControlCellCount: containerOrControlCount,
    blockEntityHaloIntersectionCount: blockEntityIntersections.length,
    savedEntityHaloIntersectionCount: savedEntityIntersections.length,
    lowerExternalInterfaceOpen: false,
    summitExternalInterfaceOpen: false,
    staticEnclosureAccepted: true,
    futureMechanismInstallationEnvelopeReady: true,
  },
  rollbackReadiness: {
    status: 'PASS_COMPLETE_GLOBAL_REVERSE_ORDER_PROJECTED_PREFLIGHT',
    sourcePostRegionSha256: latestPostIdentity.sha256,
    releaseCount: rollbackChain.length,
    totalRollbackOperationGroupCount: rollbackOperationCount,
    globalReverseOrder: rollbackChain.map(({ id }) => id),
    chain: rollbackChain,
  },
  commissioningBoundary: {
    acceptedMilestone:
      'Static B09 lower-to-summit enclosure and exact void are ready for a separately compiled mechanism-installation package.',
    funicularCommissioned: false,
    vehicleOrRailInstalled: false,
    passengerTransportCommissioned: false,
    pedestrianOrRescueRouteCommissioned: false,
    powerOrControlsCommissioned: false,
    photometricOrEmergencyLightingCommissioned: false,
    drainageOrOutfallCommissioned: false,
    b08OrZ11ExternalInterfaceOpened: false,
    nextConcreteEvidenceTask:
      'Freeze exact drive/brake/vehicle/barrier, power/control, drainage, and rescue cell sets with fail-safe states; then compile them as separate guarded R10/R12 packages.',
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    apiCallsPerformed: false,
    rconCallsPerformed: false,
    serviceMutationsPerformed: false,
    worldEditsPerformed: false,
  },
};
const commissioningPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, commissioningPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# CZ-R12B B09 static enclosure readiness\n\n`
  + `**Status:** ${report.status}  \n`
  + `**Commissioning payload:** \`${commissioningPayloadSha256}\`\n\n`
  + `- Connected lower-to-summit void: ${connectedVoid.length} exact air cells in one face-connected component.\n`
  + `- Complete enclosure boundary: ${boundary.length} solid cells (${boundary.length - fixtures.length} polished diorite and ${fixtures.length} passive sea lanterns).\n`
  + `- Both external interfaces remain fail-closed: ${lowerCap.length} lower-cap and ${summitCap.length} summit-cap cells.\n`
  + `- Exact B09 accommodation: ${accommodation.length} cells, with exactly ${accommodationMismatches.length} accepted R10E polished-diorite-to-sea-lantern transitions from R10D.\n`
  + `- Global projected rollback: ${rollbackOperationCount} operation groups across nine releases in exact reverse order.\n`
  + `- This is installation readiness only; no transport, pedestrian/rescue, power/control, emergency-lighting, drainage, or external-interface commissioning is claimed.\n`;
fs.mkdirSync(path.dirname(absolute(MARKDOWN_PATH)), { recursive: true });
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);
console.log(JSON.stringify({
  status: report.status,
  output: OUT_PATH,
  markdown: MARKDOWN_PATH,
  commissioningPayloadSha256,
  connectedVoidCellCount: connectedVoid.length,
  completeBoundaryCellCount: boundary.length,
  rollbackOperationGroupCount: rollbackOperationCount,
  latestAccommodationMismatchCount: accommodationMismatches.length,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
