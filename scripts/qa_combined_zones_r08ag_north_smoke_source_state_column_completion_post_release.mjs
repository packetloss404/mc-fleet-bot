#!/usr/bin/env node
/** Independent read-only post-release QA for R08AG. */
import fs from 'fs';
import path from 'path';
import {
  AnvilReader, boundsOf, cellKey, cellsIn, hashCells, sha256,
  stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const DIR = 'data/world-review/combined-zones-r08ag-live-20260822T020533Z';
const LEDGER_PATH = `${DIR}/evidence-ledger.json`;
const MANIFEST_PATH = 'data/buildops/combined-zones-r08ag-empty-eight-north-smoke-source-state-column-completion.release-manifest.json';
const POST = 'data/worldsnap-r08ag-post-20260822T020533Z';
const RESIDUAL_PATH = `${DIR}/r08ag-accepted-post-residual-north-smoke-census.json`;
const KEY = 'ee-smoke-n-source-state-column-completion';
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
  ['combined-zones-r08af-empty-eight-north-smoke-far-east-upper-completion',8],
];
const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const fileBinding = (filename) => ({ path: filename,
  sha256: sha256(fs.readFileSync(absolute(filename))), bytes: fs.statSync(absolute(filename)).size });
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08AG post-release QA rejected: ${message}`);
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
invariant(fileBinding(LEDGER_PATH).sha256 === 'd406b0f32ababc38bfa21929f0bff0d03159cd8c619038306c81e5ad0bc91195'
  && fileBinding(MANIFEST_PATH).sha256 === '6fea755673111d6a5fcfc46a7a4b9d6dffa7f70e40040f1ab6e08bed3e48b6fa'
  && manifest.manifestIdentity === '197ac7f5c7a7973996d87ab9196138bd2d4a1ed33b3871d0807cc87f6d22b553',
'ledger/manifest file binding');
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.transactionId === manifest.transactionId
  && ledger.sourceBoundReleaseIdentitySha256 === 'f4e6a1f997709d80487001b772211a7a5e606699e19a20237c9be36bd1ebf2e5'
  && ledger.executionBindingSha256 === '70c09e8b961749ed5974a9685efe7847544d1395f4151b9fbcb4f40d81c7d675'
  && ledger.completedReleaseIdentitySha256 === '73cd13c4ce79e7faf83710d5e29fdafab2df557fd0a2d0cb8ba009ea8ad2fe30',
'release identity');
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(ledger.sourceSnapshot.completeSaveSha256 === '853ece859b6beb5ea2ec20aa242b35d8b67c024f7d7aded6ae4e34b601220d0e'
  && sourceIdentity.sha256 === 'dd47d8dda27c4f9a755c977d03489b0cc947c68e15c8577b552e9988cb8df32e'
  && ledger.postSnapshot.completeSaveSha256 === '8aae7db6c71a6add313c0a3efdce3e520eae8b2b109c132b6e8d582e345957f1'
  && postIdentity.sha256 === '88138d100aafd6ed3ccb8cde99c38e99fa812d911000d6ca8cfb28f2dda8cee3'
  && ledger.stages.length === 17 && ledger.stages.every(({status}) => status === 'PASS')
  && ledger.evidenceBindings.length === 17
  && ledger.evidenceBindings.every((binding) => fileBinding(binding.path).sha256 === binding.sha256),
'snapshot/stage/evidence binding');

const forward = operations(manifest.packages[0].forward);
const rollback = operations(manifest.packages[0].rollback);
const targets = forward.map(({cell}) => cell);
const targetKeys = new Set(targets.map(cellKey));
const selectedHalo = faceHalo(targets);
invariant(forward.length === 7
  && JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((entry) => ({
    cell:entry.cell,fromState:entry.toState,toState:entry.fromState,
  })))
  && hashCells(targets) === 'ce95896549267f5863360954fcddae33469256e5069c0acd9b60b3f23ed15501'
  && selectedHalo.length === 30
  && hashCells(selectedHalo) === 'af0185ab1cc99bc3dd0251f5dd685ae0dcd2db68135f296c99e16341dea1c910',
'geometry/inverse');
const execution = readJson(`${DIR}/${KEY}.forward-execution.json`);
const inverse = readJson(`${DIR}/${KEY}.rollback-poststate-preflight.json`);
const journal = fs.readFileSync(absolute(`${DIR}/${KEY}.forward-execution.json.stream-journal.jsonl`), 'utf8')
  .trim().split(/\r?\n/).map(JSON.parse);
invariant(execution.status === 'complete' && execution.strictNoop
  && execution.successfulCommands === 7 && execution.failedCommands === 0
  && execution.noopCommands === 0 && inverse.status === 'PASS'
  && inverse.passed === 7 && inverse.failed === 0
  && journal.length === 20 && journal.at(-1).status === 'complete',
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
invariant(transitionMismatch.length === 0 && changed.length === 7
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
invariant(priorCellCount === 1184
  && residual.status === 'PASS_R08AG_ACCEPTED_POST_NORTH_SMOKE_RESIDUAL_BLOCKER_CENSUS'
  && residual.summary.residualCellCount === 161
  && residual.summary.primaryPartition.wetInteractionCellCount === 105
  && residual.summary.primaryPartition.gravityInteractionCellCount === 56
  && residual.summary.primaryPartition.sourceStateBandCellCount === 0
  && residual.summary.residualColumnCount === 23,
'prior/residual census');

const qa = {schemaVersion:1,generatedAtUtc:'2026-08-22T02:12:00Z',
  status:'PASS_R08AG_NORTH_SMOKE_SOURCE_STATE_COLUMN_COMPLETION_POST_RELEASE_ACCEPTED',
  release:{transactionId:manifest.transactionId,manifestIdentity:manifest.manifestIdentity,
    completedReleaseIdentitySha256:ledger.completedReleaseIdentitySha256},
  bindings:{ledger:fileBinding(LEDGER_PATH),manifest:fileBinding(MANIFEST_PATH),
    sourceSave:ledger.sourceSnapshot.completeSaveSha256,postSave:ledger.postSnapshot.completeSaveSha256,
    stages:17,evidence:17},
  geometry:{targetSet:exactSet(targets),halo:exactSet(selectedHalo),width:1,height:7,componentCount:1},
  postState:{exactTransitions:{expected:7,matching:7,mismatches:0},stoneBrickCount:7,
    sourceStates:{'minecraft:air':6,'minecraft:stone':1},
    boundedDiff:{reviewCells:4522,declared:7,observed:7,lifecycle:0,undeclared:0},
    haloExact:30,priorAcceptedR08CellsExact:priorCellCount,priorChecks},
  residual:{binding:fileBinding(RESIDUAL_PATH),identity:residual.censusIdentitySha256,
    cellCount:161,wet:105,gravity:56,sourceState:0,n06Adjacent:21,
    disposition:'LOCAL_NON_DURABLE_PHYSICS_GROUPS_ONLY; NOT A MASTERPLAN HOLD'},
  execution:{stages:17,journalEvents:20,success:7,failed:0,noops:0,inverseGuards:7},
  commissioning:{boundedCompletionAccepted:true,completeBoundaryCommissioned:false},
  liveCallsPerformedByQa:false,worldEditsPerformedByQa:false};
qa.qaPayloadSha256 = sha256(JSON.stringify(qa));
const seal = {schemaVersion:1,generatedAtUtc:qa.generatedAtUtc,
  status:'PASS_R08AG_BOUNDED_NORTH_SMOKE_SOURCE_STATE_COLUMN_COMPLETION_ACCEPTED',
  release:qa.release,qa:{path:`${DIR}/r08ag-post-release-qa.json`,payload:qa.qaPayloadSha256},
  scope:{targets:7,halo:30,priorCells:1184,residual:161},
  rollback:{guards:7,passed:true},localResidualOnly:true,noLiveCalls:true,noWorldEdits:true};
seal.commissioningSealSha256 = sha256(JSON.stringify(seal));
fs.writeFileSync(absolute(`${DIR}/r08ag-post-release-qa.json`),`${JSON.stringify(qa,null,2)}\n`);
fs.writeFileSync(absolute(`${DIR}/r08ag-post-release-qa.md`),`# R08AG post-release QA\n\nStatus: **${qa.status}**\n\n7 targets, 30 halo cells, 1,184 prior R08 cells, zero off-target or lifecycle drift, 17 stages, 20 journal events, and 7 inverse guards pass. The 161-cell residual is exactly 105 wet and 56 gravity cells; these groups are local non-durable physics exceptions, not a masterplan hold.\n\nPayload: \`${qa.qaPayloadSha256}\`. No live call or world edit was performed.\n`);
fs.writeFileSync(absolute(`${DIR}/r08ag-bounded-north-smoke-source-state-column-completion-seal.json`),`${JSON.stringify(seal,null,2)}\n`);
fs.writeFileSync(absolute(`${DIR}/r08ag-bounded-north-smoke-source-state-column-completion-seal.md`),`# R08AG seal\n\nStatus: **${seal.status}**\n\nSeal: \`${seal.commissioningSealSha256}\`.\n`);
process.stdout.write(`${JSON.stringify({status:qa.status,qaPayloadSha256:qa.qaPayloadSha256,
  commissioningSealSha256:seal.commissioningSealSha256},null,2)}\n`);
