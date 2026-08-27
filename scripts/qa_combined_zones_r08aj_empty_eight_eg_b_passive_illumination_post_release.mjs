#!/usr/bin/env node
/** Independent read-only post-release QA for R08AJ. */
import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
  hashCells,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const DIR = 'data/world-review/combined-zones-r08aj-live-20260822T024118Z';
const LEDGER_PATH = `${DIR}/evidence-ledger.json`;
const MANIFEST_PATH = 'data/buildops/combined-zones-r08aj-empty-eight-eg-b-passive-illumination.release-manifest.json';
const POST = 'data/worldsnap-r08aj-post-20260822T024118Z';
const KEY = 'ee-eg-b-passive-illumination';
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const fileBinding = (filename) => ({
  path: filename,
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08AJ post-release QA rejected: ${message}`);
};
const exactSet = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: boundsOf(exact), coordinateSetSha256: hashCells(exact) };
};
const faceHalo = (cells) => {
  const keys = new Set(cells.map(cellKey));
  return uniqueCells(cells.flatMap((cell) => FACE.map(([dx, dy, dz]) => ({
    x: cell.x + dx,
    y: cell.y + dy,
    z: cell.z + dz,
  }))).filter((cell) => !keys.has(cellKey(cell))));
};

function operations(filename, expand = false) {
  const output = [];
  for (const line of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('REPL ')) continue;
    const fields = line.split(/\s+/);
    const n = fields.slice(1, 7).map(Number);
    const bounds = {
      minX: Math.min(n[0], n[3]), maxX: Math.max(n[0], n[3]),
      minY: Math.min(n[1], n[4]), maxY: Math.max(n[1], n[4]),
      minZ: Math.min(n[2], n[5]), maxZ: Math.max(n[2], n[5]),
    };
    if (expand) {
      for (const cell of cellsIn(bounds)) {
        output.push({ cell, fromState: fields[7], toState: fields[8] });
      }
    } else {
      output.push({ cell: { x: n[0], y: n[1], z: n[2] }, fromState: fields[7], toState: fields[8] });
    }
  }
  return output;
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
invariant(
  fileBinding(LEDGER_PATH).sha256 === '00231fbefcea5efaad042cf5245286c232d9a44b67f38fece110e68245e13a57'
    && fileBinding(MANIFEST_PATH).sha256 === '530c6ecc601e49a1fd63a0aec201ce86b23a1ea4e8a5dfbc3489a3c9d2645cb2'
    && manifest.manifestIdentity === 'ca665afef01803f8fd35a4c07bd660c9a1e9bf8434bd6cab5e2a822d3566201f',
  'ledger/manifest binding',
);
invariant(
  ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
    && ledger.transactionId === manifest.transactionId
    && ledger.sourceBoundReleaseIdentitySha256 === 'e3915eddc11b84da3e3dbfc791f2c7e9333daeb6295794703f51b4414e8b78b9'
    && ledger.executionBindingSha256 === '49f68ce8fa1fb5161ff679198d2dda91b0f27a212d317959c0d0d25b82c57a0d'
    && ledger.completedReleaseIdentitySha256 === '0305e47fbdc23239338a31dfa335cc2332f68bcdde423cce2d09cfe34478d791',
  'release identity',
);
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(
  ledger.sourceSnapshot.completeSaveSha256 === '73e0803da15665e9197b820327c7cb6ea107d2ed6f080ca178f06ec80e863aa2'
    && sourceIdentity.sha256 === '3d0147c590500faa3b029f4851f3e240dc9ce1241d08a160f96ace92ea608333'
    && ledger.postSnapshot.completeSaveSha256 === '7bd09febc9447b5147e3a5d4a1694943a43ef7cb26104bca582bef1bcb096872'
    && postIdentity.sha256 === 'eb7678a9c6ff3e073e317bc29e11bdbbaf209e3add6f5dad4ce3fdf0dfc9a976'
    && ledger.stages.length === 17
    && ledger.stages.every(({ status }) => status === 'PASS')
    && ledger.evidenceBindings.length === 17
    && ledger.evidenceBindings.every((entry) => fileBinding(entry.path).sha256 === entry.sha256),
  'snapshot/stage/evidence binding',
);

const forward = operations(manifest.packages[0].forward);
const rollback = operations(manifest.packages[0].rollback);
const targets = forward.map(({ cell }) => cell);
const targetKeys = new Set(targets.map(cellKey));
const halo = faceHalo(targets);
const cap = cellsIn({ minX: 1849, maxX: 1855, minY: 54, maxY: 54, minZ: 145, maxZ: 151 });
const retainedCap = cap.filter((cell) => !targetKeys.has(cellKey(cell)));
const core = cellsIn({ minX: 1849, maxX: 1855, minY: 42, maxY: 54, minZ: 145, maxZ: 151 });
const review = uniqueCells([...core, ...halo]);
invariant(
  forward.length === 9
    && JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((entry) => ({
      cell: entry.cell,
      fromState: entry.toState,
      toState: entry.fromState,
    })))
    && hashCells(targets) === '0c6494129a5b5bc3d6ad65e3f2d5fec4d54c822438abf0f7ff584dc8e1071be3'
    && halo.length === 42
    && hashCells(halo) === '0407aec1d4eaa2715c8b19e8dc30d4b26033e1a8c0202ed89eb51e681b8b6a9f'
    && cap.length === 49
    && retainedCap.length === 40
    && review.length === 646,
  'geometry/inverse',
);

const execution = readJson(`${DIR}/${KEY}.forward-execution.json`);
const inverse = readJson(`${DIR}/${KEY}.rollback-poststate-preflight.json`);
const journal = fs.readFileSync(
  absolute(`${DIR}/${KEY}.forward-execution.json.stream-journal.jsonl`),
  'utf8',
).trim().split(/\r?\n/).map(JSON.parse);
invariant(
  execution.status === 'complete'
    && execution.strictNoop
    && execution.successfulCommands === 9
    && execution.failedCommands === 0
    && execution.noopCommands === 0
    && inverse.status === 'PASS'
    && inverse.passed === 9
    && inverse.failed === 0
    && journal.length === 24
    && journal.at(-1).status === 'complete',
  'execution/journal/inverse',
);

const sourceReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST, 'region')));
const sourceStates = new Map();
const postStates = new Map();
async function statePair(cell) {
  const key = cellKey(cell);
  if (!sourceStates.has(key)) {
    sourceStates.set(key, stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z)));
    postStates.set(key, stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)));
  }
  return [sourceStates.get(key), postStates.get(key)];
}
for (const cell of review) await statePair(cell);
const transitionMismatch = forward.filter(({ cell, fromState, toState }) => (
  sourceStates.get(cellKey(cell)) !== fromState || postStates.get(cellKey(cell)) !== toState
));
const changed = review.filter((cell) => sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
const undeclared = changed.filter((cell) => !targetKeys.has(cellKey(cell)));
const haloCensus = {};
for (const cell of halo) {
  const state = postStates.get(cellKey(cell));
  haloCensus[state] = (haloCensus[state] ?? 0) + 1;
}
invariant(
  transitionMismatch.length === 0
    && changed.length === 9
    && undeclared.length === 0
    && targets.every((cell) => postStates.get(cellKey(cell)) === 'minecraft:sea_lantern')
    && retainedCap.every((cell) => postStates.get(cellKey(cell)) === 'minecraft:smooth_stone')
    && JSON.stringify(haloCensus) === JSON.stringify({ 'minecraft:smooth_stone': 24, 'minecraft:air': 18 }),
  'fixtures, closed cap, halo, or bounded diff',
);

const priorR08Keys = new Set();
const priorR08Manifests = [];
for (const check of manifest.isolation.acceptedPriorManifestChecks) {
  const prior = readJson(check.path);
  if (!prior.transactionId.startsWith('combined-zones-r08')) continue;
  priorR08Manifests.push(prior.transactionId);
  for (const pkg of prior.packages ?? []) {
    for (const operation of operations(pkg.forward, true)) priorR08Keys.add(cellKey(operation.cell));
  }
}
invariant(
  priorR08Manifests.length === 34
    && priorR08Keys.size === 44687
    && targets.every((cell) => !priorR08Keys.has(cellKey(cell))),
  'prior R08 set identity/isolation',
);
let priorR08Drift = 0;
for (const key of priorR08Keys) {
  const [x, y, z] = key.split(',').map(Number);
  const [source, post] = await statePair({ x, y, z });
  if (source !== post) priorR08Drift += 1;
}
invariant(priorR08Drift === 0, 'previous R08 preservation');

const r02 = readJson('data/buildops/combined-zones-r02-d06-shell.release-manifest.json');
const r02Operations = r02.packages.flatMap((pkg) => operations(pkg.forward, true));
const r02Keys = new Set(r02Operations.map(({ cell }) => cellKey(cell)));
const r02Target = r02Operations.filter(({ cell }) => targetKeys.has(cellKey(cell)));
invariant(
  r02Keys.size === 17380
    && r02Target.length === 9
    && r02Target.every(({ toState }) => toState === 'minecraft:smooth_stone'),
  'R02 roof-cap provenance',
);
let r02Declared = 0;
let r02Undeclared = 0;
for (const key of r02Keys) {
  const [x, y, z] = key.split(',').map(Number);
  const [source, post] = await statePair({ x, y, z });
  if (source === post) continue;
  if (targetKeys.has(key)) r02Declared += 1;
  else r02Undeclared += 1;
}
invariant(r02Declared === 9 && r02Undeclared === 0, 'R02 source/post preservation');

const qa = {
  schemaVersion: 1,
  generatedAtUtc: '2026-08-22T02:48:00Z',
  status: 'PASS_R08AJ_EMPTY_EIGHT_EG_B_PASSIVE_ILLUMINATION_POST_RELEASE_ACCEPTED',
  release: {
    transactionId: manifest.transactionId,
    manifestIdentity: manifest.manifestIdentity,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  bindings: {
    ledger: fileBinding(LEDGER_PATH),
    manifest: fileBinding(MANIFEST_PATH),
    sourceSave: ledger.sourceSnapshot.completeSaveSha256,
    postSave: ledger.postSnapshot.completeSaveSha256,
    stages: 17,
    evidence: 17,
  },
  geometry: {
    targetSet: exactSet(targets),
    roofCap: exactSet(cap),
    retainedRoofCap: exactSet(retainedCap),
    halo: exactSet(halo),
  },
  postState: {
    exactTransitions: { expected: 9, matching: 9, mismatches: 0 },
    fixtureStateCensus: { 'minecraft:sea_lantern': 9 },
    retainedCapStateCensus: { 'minecraft:smooth_stone': 40 },
    fullCubeClosedCapCells: 49,
    haloStateCensus: haloCensus,
    boundedDiff: { reviewCells: 646, declared: 9, observed: 9, lifecycle: 0, undeclared: 0 },
  },
  prior: {
    previousR08: {
      manifestCount: 34,
      unionCells: 44687,
      targetIntersections: 0,
      preservedCells: 44687,
      drift: 0,
    },
    r02: {
      unionCells: 17380,
      targetSupersessionCells: 9,
      smoothStoneTargetCells: 9,
      undeclaredSourcePostDiff: 0,
    },
  },
  execution: { stages: 17, journalEvents: 24, success: 9, failed: 0, noops: 0, inverseGuards: 9 },
  commissioning: {
    passiveNormalIlluminationAccepted: true,
    roofCapClosed: true,
    photometricValidationClaimed: false,
    emergencyPowerOrLightingCommissioned: false,
    egressCommissioned: false,
    accessibleRouteCommissioned: false,
    externalOpeningAuthorized: false,
  },
  liveCallsPerformedByQa: false,
  worldEditsPerformedByQa: false,
};
qa.qaPayloadSha256 = sha256(JSON.stringify(qa));
const seal = {
  schemaVersion: 1,
  generatedAtUtc: qa.generatedAtUtc,
  status: 'PASS_R08AJ_BOUNDED_EG_B_PASSIVE_ILLUMINATION_ACCEPTED',
  release: qa.release,
  qa: { path: `${DIR}/r08aj-post-release-qa.json`, payload: qa.qaPayloadSha256 },
  scope: {
    targets: 9,
    retainedCapCells: 40,
    fullCubeClosedCapCells: 49,
    halo: 42,
    preservedPriorR08Cells: 44687,
    preservedNonTargetR02Cells: 17371,
  },
  rollback: { guards: 9, passed: true },
  noLiveCalls: true,
  noWorldEdits: true,
};
seal.commissioningSealSha256 = sha256(JSON.stringify(seal));
fs.writeFileSync(absolute(`${DIR}/r08aj-post-release-qa.json`), `${JSON.stringify(qa, null, 2)}\n`);
fs.writeFileSync(absolute(`${DIR}/r08aj-post-release-qa.md`), `# R08AJ post-release QA\n\nStatus: **${qa.status}**\n\nAll nine passive fixtures, 40 retained smooth-stone cap cells, the complete 49-cell closed full-cube cap, 42-cell halo, 44,687 prior R08 cells, and 17,371 non-target R02 cells pass with zero lifecycle or undeclared drift. All 17 stages, 24 journal events, and nine inverse guards pass.\n\nPayload: \`${qa.qaPayloadSha256}\`. No live call or world edit was performed.\n`);
fs.writeFileSync(absolute(`${DIR}/r08aj-bounded-eg-b-passive-illumination-seal.json`), `${JSON.stringify(seal, null, 2)}\n`);
fs.writeFileSync(absolute(`${DIR}/r08aj-bounded-eg-b-passive-illumination-seal.md`), `# R08AJ EG-B passive-illumination seal\n\nStatus: **${seal.status}**\n\nSeal: \`${seal.commissioningSealSha256}\`.\n`);
process.stdout.write(`${JSON.stringify({
  status: qa.status,
  qaPayloadSha256: qa.qaPayloadSha256,
  commissioningSealSha256: seal.commissioningSealSha256,
}, null, 2)}\n`);
