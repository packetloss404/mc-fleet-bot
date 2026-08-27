#!/usr/bin/env node
/** Independent read-only post-release QA for R08AF. */
import fs from 'fs';
import path from 'path';
import {
  AnvilReader, boundsOf, cellKey, cellsIn, hashCells, sha256,
  stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const DIR = 'data/world-review/combined-zones-r08af-live-20260822T015129Z';
const LEDGER_PATH = `${DIR}/evidence-ledger.json`;
const MANIFEST_PATH = 'data/buildops/combined-zones-r08af-empty-eight-north-smoke-far-east-upper-completion.release-manifest.json';
const POST = 'data/worldsnap-r08af-post-20260822T015129Z';
const RESIDUAL_PATH = `${DIR}/r08af-accepted-post-residual-north-smoke-census.json`;
const KEY = 'ee-smoke-n-far-east-upper-completion';
const FACE = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const PRIOR = [
  ['combined-zones-r08w-empty-eight-north-smoke-west-segment',350],
  ['combined-zones-r08x-empty-eight-north-smoke-east-segment',245],
  ['combined-zones-r08y-empty-eight-north-smoke-central-west-segment',231],
  ['combined-zones-r08z-empty-eight-north-smoke-central-east-segment',147],
  ['combined-zones-r08aa-empty-eight-north-smoke-center-segment',98],
  ['combined-zones-r08ab-empty-eight-north-smoke-far-east-segment',14],
  ['combined-zones-r08ac-empty-eight-north-smoke-supported-gravity-west-segment',35],
  ['combined-zones-r08ad-empty-eight-north-smoke-supported-gravity-east-segment',14],
  ['combined-zones-r08ae-empty-eight-north-smoke-retained-wet-east-segment',42],
];
const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const fileBinding = (filename) => ({ path: filename,
  sha256: sha256(fs.readFileSync(absolute(filename))), bytes: fs.statSync(absolute(filename)).size });
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08AF post-release QA rejected: ${message}`);
};
const exactSet = (cells) => { const exact = uniqueCells(cells); return { cellCount: exact.length,
  bounds: boundsOf(exact), coordinateSetSha256: hashCells(exact) }; };
const faceHalo = (cells) => { const keys = new Set(cells.map(cellKey)); return uniqueCells(
  cells.flatMap((cell) => FACE.map(([dx,dy,dz]) => (
    {x:cell.x+dx,y:cell.y+dy,z:cell.z+dz}
  ))).filter((cell) => !keys.has(cellKey(cell))),
); };
function operations(filename) {
  return fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL ')).map((line) => {
      const fields = line.split(/\s+/);
      return { cell:{x:+fields[1],y:+fields[2],z:+fields[3]},
        fromState:fields[7],toState:fields[8] };
    });
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const residual = readJson(RESIDUAL_PATH);
invariant(fileBinding(LEDGER_PATH).sha256 === 'cb42caedc4e2cb8a379b776f96c70ae98bfd990193ca423a03b7ac1a4caab44b'
  && fileBinding(MANIFEST_PATH).sha256 === '29e7d8ca897daa712d779562921e7f8b54280c1decd8da51d970a519ede20745'
  && manifest.manifestIdentity === 'b42a0d172ad577ae1b5b2610ed892348174f3ad3a093ffebfcf7c26a1835c68d',
'ledger/manifest file binding');
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.transactionId === manifest.transactionId
  && ledger.sourceBoundReleaseIdentitySha256 === '50a1afd308c780ec2a778f960aa15f23787166c13b82464ac4e71a707867d5cd'
  && ledger.executionBindingSha256 === '2501136c57b3a14eb1fb7642c2e45ac9dad2051d825bf6133e9e6efffce3ed24'
  && ledger.completedReleaseIdentitySha256 === '7730805daa70de27f1ed24f0e0fa9cb8fd195ca4be5fe61c101e2d4c7caf82cd',
'release identity');
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(ledger.sourceSnapshot.completeSaveSha256 === 'a052edeaf62d865422985cfdb91633ca8fa704202763a8b20d22922da69fd086'
  && sourceIdentity.sha256 === 'd6b504a1efe846a089c218ec2a0af77b94ae42818169a8584780d008beac81e7'
  && ledger.postSnapshot.completeSaveSha256 === 'f220bc6d157c5c686bd227ca396f213501437df44f6efc069912ba5b6d7a226f'
  && postIdentity.sha256 === 'f857fce4772588f3aa5c63d2f69cb0caf272c8ada803b150fa151a3d4216fe5b'
  && ledger.stages.length === 17 && ledger.stages.every(({status}) => status === 'PASS')
  && ledger.evidenceBindings.length === 17
  && ledger.evidenceBindings.every((binding) => fileBinding(binding.path).sha256 === binding.sha256),
'snapshot/stage/evidence binding');

const forward = operations(manifest.packages[0].forward);
const rollback = operations(manifest.packages[0].rollback);
const targets = forward.map(({cell}) => cell);
const targetKeys = new Set(targets.map(cellKey));
const selectedHalo = faceHalo(targets);
invariant(forward.length === 8
  && JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((entry) => ({
    cell:entry.cell,fromState:entry.toState,toState:entry.fromState,
  })))
  && hashCells(targets) === 'f27c0fd25faa5715a87bfcdb651574b6db797d85e824308d1db53cc26aab9d42'
  && selectedHalo.length === 28,
'geometry/inverse');
const execution = readJson(`${DIR}/${KEY}.forward-execution.json`);
const inverse = readJson(`${DIR}/${KEY}.rollback-poststate-preflight.json`);
const journal = fs.readFileSync(absolute(`${DIR}/${KEY}.forward-execution.json.stream-journal.jsonl`), 'utf8')
  .trim().split(/\r?\n/).map(JSON.parse);
invariant(execution.status === 'complete' && execution.strictNoop
  && execution.successfulCommands === 8 && execution.failedCommands === 0
  && execution.noopCommands === 0 && inverse.status === 'PASS'
  && inverse.passed === 8 && inverse.failed === 0
  && journal.length === 22 && journal.at(-1).status === 'complete',
'execution/journal/inverse');

const fullPlane = cellsIn({minX:1652,maxX:1847,minY:48,maxY:54,minZ:50,maxZ:50});
const bounded = uniqueCells([...fullPlane,...faceHalo(fullPlane)]);
const sourceReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root,'region')));
const postReader = new AnvilReader(absolute(path.join(POST,'region')));
const sourceStates = new Map();
const postStates = new Map();
for (const cell of bounded) {
  const key = cellKey(cell);
  sourceStates.set(key,stateToCommandString(await sourceReader.blockState(cell.x,cell.y,cell.z)));
  postStates.set(key,stateToCommandString(await postReader.blockState(cell.x,cell.y,cell.z)));
}
const transitionMismatch = forward.filter(({cell,fromState,toState}) => (
  sourceStates.get(cellKey(cell)) !== fromState || postStates.get(cellKey(cell)) !== toState
));
const changed = bounded.filter((cell) => sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
const undeclared = changed.filter((cell) => !targetKeys.has(cellKey(cell)));
const haloDrift = selectedHalo.filter((cell) => sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
invariant(transitionMismatch.length === 0 && changed.length === 8
  && undeclared.length === 0 && haloDrift.length === 0
  && targets.every((cell) => postStates.get(cellKey(cell)) === 'minecraft:stone_bricks'),
'post-state or bounded diff');

let priorCellCount = 0;
const priorChecks = [];
for (const [transactionId, count] of PRIOR) {
  const prior = readJson(`data/buildops/${transactionId}.release-manifest.json`);
  const priorOps = prior.packages.flatMap((pkg) => operations(pkg.forward));
  const mismatch = priorOps.filter(({cell,toState}) => (
    sourceStates.get(cellKey(cell)) !== toState || postStates.get(cellKey(cell)) !== toState
  ));
  invariant(priorOps.length === count && mismatch.length === 0
    && priorOps.every(({cell}) => !targetKeys.has(cellKey(cell))),
  `prior preservation ${transactionId}`);
  priorCellCount += count;
  priorChecks.push({transactionId,cellCount:count,mismatchCount:0});
}
invariant(priorCellCount === 1176
  && residual.status === 'PASS_R08AF_ACCEPTED_POST_NORTH_SMOKE_RESIDUAL_BLOCKER_CENSUS'
  && residual.summary.residualCellCount === 168
  && residual.summary.primaryPartition.wetInteractionCellCount === 105
  && residual.summary.primaryPartition.gravityInteractionCellCount === 56
  && residual.summary.primaryPartition.sourceStateBandCellCount === 7,
'prior/residual census');

const qa = {schemaVersion:1,generatedAtUtc:'2026-08-22T01:56:00Z',
  status:'PASS_R08AF_NORTH_SMOKE_FAR_EAST_UPPER_COMPLETION_POST_RELEASE_ACCEPTED',
  release:{transactionId:manifest.transactionId,manifestIdentity:manifest.manifestIdentity,
    completedReleaseIdentitySha256:ledger.completedReleaseIdentitySha256},
  bindings:{ledger:fileBinding(LEDGER_PATH),manifest:fileBinding(MANIFEST_PATH),
    sourceSave:ledger.sourceSnapshot.completeSaveSha256,postSave:ledger.postSnapshot.completeSaveSha256,
    stages:17,evidence:17},
  geometry:{targetSet:exactSet(targets),halo:exactSet(selectedHalo),width:4,height:2,componentCount:1},
  postState:{exactTransitions:{expected:8,matching:8,mismatches:0},stoneBrickCount:8,
    boundedDiff:{reviewCells:4522,declared:8,observed:8,lifecycle:0,undeclared:0},
    haloExact:28,priorAcceptedR08CellsExact:priorCellCount,priorChecks},
  residual:{binding:fileBinding(RESIDUAL_PATH),identity:residual.censusIdentitySha256,
    cellCount:168,wet:105,gravity:56,sourceState:7,n06Adjacent:21},
  execution:{stages:17,journalEvents:22,success:8,failed:0,noops:0,inverseGuards:8},
  commissioning:{boundedCompletionAccepted:true,completeBoundaryCommissioned:false},
  liveCallsPerformedByQa:false,worldEditsPerformedByQa:false};
qa.qaPayloadSha256 = sha256(JSON.stringify(qa));
const seal = {schemaVersion:1,generatedAtUtc:qa.generatedAtUtc,
  status:'PASS_R08AF_BOUNDED_NORTH_SMOKE_FAR_EAST_UPPER_COMPLETION_ACCEPTED',
  release:qa.release,qa:{path:`${DIR}/r08af-post-release-qa.json`,payload:qa.qaPayloadSha256},
  scope:{targets:8,halo:28,priorCells:1176,residual:168},
  rollback:{guards:8,passed:true},noLiveCalls:true,noWorldEdits:true};
seal.commissioningSealSha256 = sha256(JSON.stringify(seal));
fs.writeFileSync(absolute(`${DIR}/r08af-post-release-qa.json`),`${JSON.stringify(qa,null,2)}\n`);
fs.writeFileSync(absolute(`${DIR}/r08af-post-release-qa.md`),`# R08AF post-release QA\n\nStatus: **${qa.status}**\n\n8 targets, 28 halo cells, 1,176 prior R08 cells, zero off-target drift, 17 stages, 22 journal events, and 8 inverse guards pass. Residual: 168.\n\nPayload: \`${qa.qaPayloadSha256}\`. No live call or world edit was performed.\n`);
fs.writeFileSync(absolute(`${DIR}/r08af-bounded-north-smoke-far-east-upper-completion-seal.json`),`${JSON.stringify(seal,null,2)}\n`);
fs.writeFileSync(absolute(`${DIR}/r08af-bounded-north-smoke-far-east-upper-completion-seal.md`),`# R08AF seal\n\nStatus: **${seal.status}**\n\nSeal: \`${seal.commissioningSealSha256}\`.\n`);
process.stdout.write(`${JSON.stringify({status:qa.status,qaPayloadSha256:qa.qaPayloadSha256,
  commissioningSealSha256:seal.commissioningSealSha256},null,2)}\n`);
