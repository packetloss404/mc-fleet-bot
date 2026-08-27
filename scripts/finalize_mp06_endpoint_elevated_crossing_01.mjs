#!/usr/bin/env node
/**
 * Seal MP06-ENDPOINT-ELEVATED-CROSSING-01 only from complete, immutable
 * guarded-release evidence.  This is an evidence finalizer: no RCON, world,
 * capture, fleet, service, or database action is performed here.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RELEASE_ID = 'MP06-ENDPOINT-ELEVATED-CROSSING-01';
const CONTRACT_ID = 'MP06-ENDPOINT-ELEVATED-CROSSING-01-EXACT-3D-CONTRACT';
const args = process.argv.slice(2);
const option = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : null;
};
const EVIDENCE = option('--evidence');
const SOURCE = option('--source');
const POST = option('--post');
const FORWARD = option('--forward');
const ROLLBACK = option('--rollback');
const MANIFEST = option('--manifest');
const CONTRACT = option('--contract');
const QA = option('--qa');
const OUT = option('--out');
const absolute = (filename) => path.resolve(ROOT, filename);
const bytes = (filename) => fs.readFileSync(absolute(filename));
const read = (filename) => JSON.parse(bytes(filename).toString('utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const bind = (filename) => ({ path: filename, sha256: sha256(bytes(filename)), bytes: fs.statSync(absolute(filename)).size });
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP06 endpoint elevated-crossing finalization refused: ${message}`);
};
const requireOption = (flag, value) => fail(value, `${flag} is required`);
const expectStatus = (filename, status) => {
  const value = read(filename);
  fail(value.status === status, `${filename} status ${value.status ?? 'missing'} != ${status}`);
  return value;
};
const operationBody = (filename) => `${bytes(filename).toString('utf8').split(/\r?\n/).filter((line) => line.startsWith('REPL ')).join('\n')}\n`;
const parseOperation = (filename) => operationBody(filename).trim().split('\n').map((line) => {
  const [, x1, y1, z1, x2, y2, z2, from, to] = line.split(/\s+/);
  fail([x1, y1, z1, x2, y2, z2, from, to].every(Boolean), `cannot parse ${filename}: ${line}`);
  fail(x1 === x2 && y1 === y2 && z1 === z2, `${filename} contains a non-point target`);
  return { point: [Number(x1), Number(y1), Number(z1)], from, to };
});
const operationIdentity = (cells) => cells.map((cell) => `${cell.point.join(',')}|${cell.from}|${cell.to}`).sort();
const completeSaveIdentity = (audit) => {
  const check = audit.checks?.find((item) => item.id === 'CS12-COMPLETE-SAVE-IDENTITY');
  const match = check?.detail?.match(/[a-f0-9]{64}/i);
  fail(match, 'intake audit has no complete-save identity');
  return match[0].toLowerCase();
};

for (const [flag, value] of [['--evidence', EVIDENCE], ['--source', SOURCE], ['--post', POST], ['--forward', FORWARD], ['--rollback', ROLLBACK], ['--manifest', MANIFEST], ['--contract', CONTRACT], ['--qa', QA]]) requireOption(flag, value);
const ledgerOut = OUT ?? `${EVIDENCE}/evidence-ledger.json`;
fail(!fs.existsSync(absolute(ledgerOut)), `refuses to overwrite existing ledger: ${ledgerOut}`);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  fail(fs.existsSync(absolute(path.join(SOURCE, member))), `source capture missing ${member}`);
  fail(fs.existsSync(absolute(path.join(POST, member))), `post capture missing ${member}`);
}

const sourceIntake = expectStatus(`${EVIDENCE}/source-intake-audit.json`, 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE');
const postIntake = expectStatus(`${EVIDENCE}/post-intake-audit.json`, 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE');
for (const audit of [sourceIntake, postIntake]) {
  fail(audit.summary?.passed === true && audit.summary?.holdCount === 0, 'complete-save intake contains a hold');
  fail(audit.summary?.requiredMemberCount === 130, 'complete-save intake lacks the complete 130-member world set');
}

const contract = expectStatus(CONTRACT, 'ACCEPTED_EXACT_3D_BRIDGE_CONTRACT');
const manifest = read(MANIFEST);
fail(contract.contractId === CONTRACT_ID && contract.mutationAuthorityGranted === false, 'accepted contract is invalid or confers execution authority');
fail(manifest.releaseId === RELEASE_ID, 'static manifest release id differs');
fail(manifest.status === 'COMPILED_FROM_ACCEPTED_EXACT_3D_BRIDGE_CONTRACT_AWAITING_FRESH_LIVE_KERNEL', 'static manifest was relabelled as a release');
fail(manifest.ownership?.contractSha256 === sha256(bytes(CONTRACT)), 'static manifest does not bind accepted contract');

const forward = parseOperation(FORWARD);
const rollback = parseOperation(ROLLBACK);
const contractCells = (contract.operationBinding?.cells ?? []).map((cell) => ({ point: cell.point, from: cell.fromState, to: cell.toState }));
const expectedRollback = contractCells.map((cell) => ({ point: cell.point, from: cell.to, to: cell.from }));
fail(forward.length >= 118 && rollback.length === forward.length && contractCells.length === forward.length,
  'release requires the mandatory deck plus exact accepted edge/lighting cells and a one-for-one inverse');
fail(JSON.stringify(operationIdentity(forward)) === JSON.stringify(operationIdentity(contractCells)), 'actual forward package is not the accepted exact contract');
fail(JSON.stringify(operationIdentity(rollback)) === JSON.stringify(operationIdentity(expectedRollback)), 'actual rollback is not the exact state-for-state inverse');
fail(sha256(operationBody(FORWARD)) === manifest.operations?.forward?.sha256, 'forward command-body hash does not match static manifest');
fail(sha256(operationBody(ROLLBACK)) === manifest.operations?.rollback?.sha256, 'rollback command-body hash does not match static manifest');

const forwardParser = expectStatus(`${EVIDENCE}/forward-strict-dry-run.json`, 'dry_run');
const rollbackParser = expectStatus(`${EVIDENCE}/rollback-strict-dry-run.json`, 'dry_run');
for (const parser of [forwardParser, rollbackParser]) {
  fail(parser.strictNoop === true && parser.failedGroups === 0 && parser.noopCommands === 0, 'strict parser contains a failure or no-op');
}
fail(forwardParser.operationRole === 'forward' && rollbackParser.operationRole === 'rollback', 'strict parser operation roles differ');

const sourcePreflight = expectStatus(`${EVIDENCE}/forward-source-preflight.json`, 'PASS');
const projectedRollback = expectStatus(`${EVIDENCE}/rollback-projected-preflight.json`, 'PASS');
const postRollback = expectStatus(`${EVIDENCE}/rollback-poststate-preflight.json`, 'PASS');
for (const preflight of [sourcePreflight, projectedRollback, postRollback]) fail(preflight.opsSha256 === sha256(bytes(preflight === sourcePreflight ? FORWARD : ROLLBACK)), 'preflight does not bind its actual operation bytes');
fail(sourcePreflight.regionsSnapshot?.sha256 === contract.sourceSnapshot?.sha256, 'source preflight region differs from accepted contract');
fail(projectedRollback.regionsSnapshot?.sha256 === contract.sourceSnapshot?.sha256, 'projected inverse source differs from accepted contract');
fail(postRollback.regionsSnapshot?.sha256 !== contract.sourceSnapshot?.sha256, 'post rollback proof unexpectedly uses source region');

for (const name of ['live-entity-clearance-pre-execution.json', 'live-entity-clearance-immediate.json']) {
  const clearance = expectStatus(`${EVIDENCE}/${name}`, 'PASS');
  fail(clearance.passed === true && clearance.blockOrEntityMutation === false, `${name} is not a clear non-mutating entity gate`);
}
const execution = expectStatus(`${EVIDENCE}/forward-execution.json`, 'complete');
fail(execution.operationSha256 === sha256(bytes(FORWARD)), 'execution report does not bind actual forward operation');
fail(execution.strictNoop === true && execution.successfulCommands === forward.length && execution.failedGroups === 0 && execution.noopCommands === 0, 'execution did not strictly change every accepted contract cell');
const journal = `${EVIDENCE}/forward-stream-journal.jsonl`;
fail(execution.streamJournalSha256 === sha256(bytes(journal)), 'execution journal hash differs');

const qa = expectStatus(QA, 'PASS');
for (const [name, passed] of Object.entries(qa.checks ?? {})) fail(passed === true, `independent post QA check ${name} did not pass`);
fail(qa.targetVerification?.expected === forward.length && qa.targetVerification.actual === forward.length && qa.targetVerification.failures?.length === 0, 'QA does not prove exact release target state');
fail(qa.route?.elevated?.expectedStations === 105 && qa.route.elevated.standableStations === 105 && qa.route.elevated.connectedStations === 105, 'QA does not prove all elevated stations');
fail(qa.route?.elevated?.directedPairs?.length === 98 && qa.route.elevated.directedPairs.every((pair) => pair.reachable), 'QA does not prove all 98 directed elevated endpoint pairs');
fail(qa.route?.lower?.expectedStations === 117 && qa.route.lower.standableStations === 117 && qa.route.lower.connectedStations === 117, 'QA does not prove all lower-road stations');

const sourceCapture = `${SOURCE}/combined-zones-complete-save-capture.json`;
const postCapture = `${POST}/combined-zones-complete-save-capture.json`;
const evidenceFiles = [sourceCapture, postCapture, CONTRACT, MANIFEST, FORWARD, ROLLBACK, QA,
  ...fs.readdirSync(absolute(EVIDENCE)).sort().map((name) => `${EVIDENCE}/${name}`)];
const ledger = {
  schemaVersion: 1,
  id: 'mp06-endpoint-elevated-crossing-01-guarded-release',
  status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
  releaseId: RELEASE_ID,
  sourceSnapshot: { root: SOURCE, captureManifestSha256: sha256(bytes(sourceCapture)), completeSaveIdentitySha256: completeSaveIdentity(sourceIntake), regionSha256: sourcePreflight.regionsSnapshot.sha256 },
  postSnapshot: { root: POST, captureManifestSha256: sha256(bytes(postCapture)), completeSaveIdentitySha256: completeSaveIdentity(postIntake), regionSha256: postRollback.regionsSnapshot.sha256 },
  ownershipAndCompiler: { acceptedContract: bind(CONTRACT), exactTargetCells: contractCells, exactInverse: true, compilerStaticManifest: { ...bind(MANIFEST), role: 'static compiler provenance only; it awaited the later guarded live kernel and is not execution authority', semanticForwardCommandBodySha256: manifest.operations.forward.sha256, semanticRollbackCommandBodySha256: manifest.operations.rollback.sha256 } },
  operation: { forward: { ...bind(FORWARD), semanticCommandBodySha256: sha256(operationBody(FORWARD)) }, rollback: { ...bind(ROLLBACK), semanticCommandBodySha256: sha256(operationBody(ROLLBACK)) }, exactInverse: true, strictForwardExecution: bind(`${EVIDENCE}/forward-execution.json`), executionJournal: bind(journal) },
  acceptance: { targetCells: forward.length, elevatedNormalWalkStations: '105/105', directedElevatedEndpointPairs: '98/98', lowerNormalWalkStations: '117/117', protectedLowerRoadCells: 351, nonClaims: ['completion of MP06 beyond this exact endpoint crossing', 'external lower-road endpoint continuity', 'completion of the road programme', 'citywide accessibility or wider Master Plan completion'] },
  evidenceBindings: evidenceFiles.map(bind),
};
ledger.completedReleaseIdentitySha256 = sha256(JSON.stringify({ source: ledger.sourceSnapshot, post: ledger.postSnapshot, contract: ledger.ownershipAndCompiler.acceptedContract.sha256, forward: ledger.operation.forward.sha256, rollback: ledger.operation.rollback.sha256, evidence: ledger.evidenceBindings.map(({ path: filename, sha256: digest }) => ({ path: filename, sha256: digest })) }));
fs.mkdirSync(path.dirname(absolute(ledgerOut)), { recursive: true });
fs.writeFileSync(absolute(ledgerOut), `${JSON.stringify(ledger, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: ledger.status, ledger: ledgerOut, identity: ledger.completedReleaseIdentitySha256 }, null, 2)}\n`);
