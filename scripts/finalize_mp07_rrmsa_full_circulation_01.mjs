#!/usr/bin/env node
/**
 * Seal the MP07 full-circulation release from its existing immutable evidence.
 *
 * This is deliberately a read-only evidence finalizer.  It performs no RCON,
 * capture, world, fleet, or service action.  It refuses to seal unless the
 * exact three-cell contract, actual guarded operation files, complete source
 * and post captures, strict execution journal, rollback proof, and independent
 * 48/48 post QA all agree.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RELEASE = '20260826T140500Z';
const EVIDENCE = `data/world-review/mp07-full-circulation-live-${RELEASE}`;
const SOURCE = 'data/worldsnap-mp07-full-circulation-source-20260826T140500Z';
const POST = 'data/worldsnap-mp07-full-circulation-post-20260826T141000Z';
const FORWARD = `data/buildops/mp07-rrmsa-full-circulation-01-live-${RELEASE}.forward.txt`;
const ROLLBACK = `data/buildops/mp07-rrmsa-full-circulation-01-live-${RELEASE}.rollback.txt`;
const STATIC_MANIFEST = `data/buildops/mp07-rrmsa-full-circulation-01-live-${RELEASE}.release-manifest.json`;
const CONTRACT = `data/world-review/mp07-full-circulation-interface-renewal-${RELEASE}/mp07-rrmsa-full-circulation-interface-01-compiler-contract.json`;
const ACCEPTANCE = `data/world-review/mp07-full-circulation-interface-renewal-${RELEASE}/mp07-steward-west-lane-ownership-interface-acceptance-01-renewal.json`;

const absolute = (filename) => path.resolve(ROOT, filename);
const bytes = (filename) => fs.readFileSync(absolute(filename));
const read = (filename) => JSON.parse(bytes(filename).toString('utf8'));
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const bind = (filename) => ({
  path: filename,
  sha256: sha(bytes(filename)),
  bytes: fs.statSync(absolute(filename)).size,
});
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP07 full-circulation finalization refused: ${message}`);
};
const expectStatus = (filename, status) => {
  const value = read(filename);
  fail(value.status === status, `${filename} status ${value.status ?? 'missing'} != ${status}`);
  return value;
};
const completeSaveIdentity = (audit) => {
  const check = audit.checks?.find((item) => item.id === 'CS12-COMPLETE-SAVE-IDENTITY');
  const match = check?.detail?.match(/[a-f0-9]{64}/i);
  fail(match, 'intake audit has no complete-save identity');
  return match[0].toLowerCase();
};
const operationBody = (filename) => bytes(filename).toString('utf8')
  .split('\n').filter((line) => line.startsWith('REPL ')).join('\n').concat('\n');
const parseOperation = (filename) => operationBody(filename).trim().split('\n').map((line) => {
  const [, x1, y1, z1, x2, y2, z2, from, to] = line.split(/\s+/);
  fail([x1, y1, z1, x2, y2, z2, from, to].every(Boolean), `cannot parse ${filename}: ${line}`);
  fail(x1 === x2 && y1 === y2 && z1 === z2, `${filename} contains a non-point target`);
  return { point: [Number(x1), Number(y1), Number(z1)], from, to };
});
const cellKey = (cell) => `${cell.point.join(',')}|${cell.from}|${cell.to}`;
const sorted = (cells) => cells.map(cellKey).sort();

const sourceIntake = expectStatus(`${EVIDENCE}/source-intake-audit.json`, 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE');
const postIntake = expectStatus(`${EVIDENCE}/post-intake-audit.json`, 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE');
for (const audit of [sourceIntake, postIntake]) {
  fail(audit.summary?.passed === true && audit.summary?.holdCount === 0,
    'complete-save intake contains a hold');
  fail(audit.summary?.requiredMemberCount === 130,
    'complete-save intake does not contain the complete 130-member world set');
}

const contract = expectStatus(CONTRACT, 'ACCEPTED_EXACT_3D_INTERFACE_CONTRACT');
const acceptance = read(ACCEPTANCE);
fail(contract.contractId === 'MP07-RRMSA-FULL-CIRCULATION-INTERFACE-01', 'wrong compiler contract id');
fail(contract.mutationAuthorityGranted === false,
  'ownership contract must not itself be recorded as execution authority');
fail(acceptance.status === 'ACCEPTED_EXACT_INTERFACE_RENEWED_FROM_FRESH_COMPLETE_SOURCE',
  'ownership renewal is not accepted from the fresh complete source');

const staticManifest = read(STATIC_MANIFEST);
fail(staticManifest.releaseId === contract.operationBinding.releaseId,
  'static compiler manifest release id drifts from the contract operation binding');
fail(staticManifest.status === 'COMPILED_FROM_ACCEPTED_3D_INTERFACE_CONTRACT_AWAITING_FRESH_LIVE_KERNEL',
  'static compiler manifest must retain its pre-kernel status');

const forwardCells = parseOperation(FORWARD);
const rollbackCells = parseOperation(ROLLBACK);
const contractCells = contract.operationBinding.cells.map((cell) => ({
  point: cell.point,
  from: cell.fromState,
  to: cell.toState,
}));
const expectedRollback = contractCells.map((cell) => ({ point: cell.point, from: cell.to, to: cell.from }));
fail(forwardCells.length === 3 && rollbackCells.length === 3, 'release must contain exactly three forward and three rollback cells');
fail(JSON.stringify(sorted(forwardCells)) === JSON.stringify(sorted(contractCells)),
  'actual forward operation is not the accepted exact three-cell contract');
fail(JSON.stringify(sorted(rollbackCells)) === JSON.stringify(sorted(expectedRollback)),
  'actual rollback is not the exact inverse of the accepted contract');
fail(sha(operationBody(FORWARD)) === staticManifest.operations.forward.sha256,
  'forward command-body hash does not match the static compiler manifest');
fail(sha(operationBody(ROLLBACK)) === staticManifest.operations.rollback.sha256,
  'rollback command-body hash does not match the static compiler manifest');

const forwardParser = expectStatus(`${EVIDENCE}/forward-strict-dry-run.json`, 'dry_run');
const rollbackParser = expectStatus(`${EVIDENCE}/rollback-strict-dry-run.json`, 'dry_run');
for (const parser of [forwardParser, rollbackParser]) {
  fail(parser.strictNoop === true && parser.failedGroups === 0 && parser.noopCommands === 0,
    'strict parser report contains a failure or no-op');
}
fail(forwardParser.operationRole === 'forward' && rollbackParser.operationRole === 'rollback',
  'strict parser roles do not match operations');

const sourcePreflight = expectStatus(`${EVIDENCE}/forward-source-preflight.json`, 'PASS');
const projectedRollback = expectStatus(`${EVIDENCE}/rollback-projected-preflight.json`, 'PASS');
const postRollback = expectStatus(`${EVIDENCE}/rollback-poststate-preflight.json`, 'PASS');
fail(sourcePreflight.opsSha256 === sha(bytes(FORWARD)), 'source preflight does not bind actual forward operation');
fail(projectedRollback.opsSha256 === sha(bytes(ROLLBACK)), 'projected rollback preflight does not bind actual rollback operation');
fail(postRollback.opsSha256 === sha(bytes(ROLLBACK)), 'post rollback preflight does not bind actual rollback operation');
fail(sourcePreflight.regionsSnapshot?.sha256 === contract.sourceSnapshot.sha256,
  'source preflight region identity differs from accepted contract');
fail(projectedRollback.regionsSnapshot?.sha256 === contract.sourceSnapshot.sha256,
  'projected inverse region identity differs from accepted contract');
fail(postRollback.regionsSnapshot?.sha256 !== contract.sourceSnapshot.sha256,
  'post rollback preflight unexpectedly used the source region');

for (const name of ['live-entity-clearance-pre-execution.json', 'live-entity-clearance-immediate.json']) {
  const clearance = expectStatus(`${EVIDENCE}/${name}`, 'PASS');
  fail(clearance.passed === true && clearance.blockOrEntityMutation === false,
    `${name} is not a clear non-mutating entity gate`);
}

const execution = expectStatus(`${EVIDENCE}/forward-execution.json`, 'complete');
fail(execution.operationSha256 === sha(bytes(FORWARD)), 'execution report does not bind actual forward operation');
fail(execution.strictNoop === true && execution.successfulCommands === 3
  && execution.failedGroups === 0 && execution.noopCommands === 0,
  'execution did not strictly change exactly the three contract commands');
fail(execution.streamJournalSha256 === sha(bytes(`${EVIDENCE}/forward-stream-journal.jsonl`)),
  'execution journal hash does not match its recorded journal');

const qa = expectStatus(`${EVIDENCE}/independent-post-qa.json`, 'PASS');
for (const [key, value] of Object.entries(qa.checks ?? {})) {
  fail(value === true, `independent post QA check ${key} did not pass`);
}
fail(qa.targetVerification?.expected === 3 && qa.targetVerification.actual === 3
  && qa.targetVerification.failures?.length === 0, 'post QA does not prove all three target states');
fail(qa.route?.forward?.length === 48 && qa.route.forward.every((item) => item.passed === true),
  'post QA does not prove 48/48 forward normal-walk paths');
fail(qa.route?.reverse?.length === 48 && qa.route.reverse.every((item) => item.passed === true),
  'post QA does not prove 48/48 reverse normal-walk paths');
fail(qa.width?.minimumContiguousStandableWidth === 3 && qa.width.belowThreeWide?.length === 0,
  'post QA does not prove zero below-three-wide cross-sections');

const sourceCapture = `${SOURCE}/combined-zones-complete-save-capture.json`;
const postCapture = `${POST}/combined-zones-complete-save-capture.json`;
const evidenceFiles = [
  sourceCapture, postCapture, CONTRACT, ACCEPTANCE, STATIC_MANIFEST, FORWARD, ROLLBACK,
  ...fs.readdirSync(absolute(EVIDENCE)).filter((name) => name !== 'evidence-ledger.json').sort()
    .map((name) => `${EVIDENCE}/${name}`),
];
const ledger = {
  schemaVersion: 1,
  id: 'mp07-rrmsa-full-circulation-01-guarded-release',
  status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
  releaseId: 'MP07-RRMSA-FULL-CIRCULATION-01',
  sourceSnapshot: {
    root: SOURCE,
    captureManifestSha256: sha(bytes(sourceCapture)),
    completeSaveIdentitySha256: completeSaveIdentity(sourceIntake),
    regionSha256: sourcePreflight.regionsSnapshot.sha256,
  },
  postSnapshot: {
    root: POST,
    captureManifestSha256: sha(bytes(postCapture)),
    completeSaveIdentitySha256: completeSaveIdentity(postIntake),
    regionSha256: postRollback.regionsSnapshot.sha256,
  },
  ownershipAndCompiler: {
    acceptedContract: bind(CONTRACT),
    acceptedRenewal: bind(ACCEPTANCE),
    exactTargetCells: contractCells,
    exactInverse: true,
    compilerStaticManifest: {
      ...bind(STATIC_MANIFEST),
      role: 'static compiler provenance only; it explicitly awaited the later live guarded kernel and is not retroactively relabelled as execution authority',
      semanticForwardCommandBodySha256: staticManifest.operations.forward.sha256,
      semanticRollbackCommandBodySha256: staticManifest.operations.rollback.sha256,
    },
  },
  operation: {
    forward: { ...bind(FORWARD), semanticCommandBodySha256: sha(operationBody(FORWARD)) },
    rollback: { ...bind(ROLLBACK), semanticCommandBodySha256: sha(operationBody(ROLLBACK)) },
    exactInverse: true,
    strictForwardExecution: bind(`${EVIDENCE}/forward-execution.json`),
    executionJournal: bind(`${EVIDENCE}/forward-stream-journal.jsonl`),
  },
  acceptance: {
    targetCells: 3,
    exactNormalWalkPaths: { forward: '48/48', reverse: '48/48', exactPathCells: 534 },
    minimumContiguousStandableWidth: 3,
    belowThreeWideCrossSections: 0,
    nonClaims: [
      'completion of MainStreet America',
      'whole-district condition recovery',
      'all required interiors or exterior seams',
      'public/staff circulation certification beyond this exact route trace',
      'citywide accessibility or wider Master Plan completion',
    ],
  },
  evidenceBindings: evidenceFiles.map(bind),
};
ledger.completedReleaseIdentitySha256 = sha(JSON.stringify({
  source: ledger.sourceSnapshot,
  post: ledger.postSnapshot,
  contract: ledger.ownershipAndCompiler.acceptedContract.sha256,
  forward: ledger.operation.forward.sha256,
  rollback: ledger.operation.rollback.sha256,
  evidence: ledger.evidenceBindings.map(({ path: filename, sha256 }) => ({ path: filename, sha256 })),
}));

const out = `${EVIDENCE}/evidence-ledger.json`;
fs.writeFileSync(absolute(out), `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({ status: ledger.status, ledger: out, identity: ledger.completedReleaseIdentitySha256 }, null, 2));
