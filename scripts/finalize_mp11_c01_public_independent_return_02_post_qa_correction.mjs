#!/usr/bin/env node
/**
 * Read-only C01 Return-02 post-QA correction finalizer.
 * It never rewrites a failed QA report or guarded-release ledger and it never
 * calls RCON.  It issues a separate, hash-bound supersession record only when
 * the immutable post capture and the corrected QA prove the release exactly.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : null; };
const originalQaPath = option('--original-qa');
const correctedQaPath = option('--corrected-qa');
const ledgerPath = option('--ledger');
const manifestPath = option('--manifest');
const snapshot = option('--snapshot');
const postIntakePath = option('--post-intake');
const out = option('--out');
const absolute = (value) => path.resolve(ROOT, value);
const relative = (value) => path.relative(ROOT, absolute(value)).split(path.sep).join('/');
const bytes = (value) => fs.readFileSync(absolute(value));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fileSha256 = (value) => sha256(bytes(value));
const readJson = (value) => JSON.parse(bytes(value).toString('utf8'));
const fail = (condition, message) => { if (!condition) throw new Error(`C01 Return-02 post-QA correction finalization refused: ${message}`); };
const key = (point) => point.join(',');
const allPassed = (checks) => checks.canonicalPostStates?.passed === true
  && checks.dryGravitySafe?.passed === true
  && checks.twentyEightFiveWideFiveClearStations?.passed === true
  && checks.lowerToUpperNormalWalk === true
  && checks.upperToLowerNormalWalk === true
  && checks.endpointAndProtectedSwitchbackInvariants?.passed === true;
const jsonSha256 = (value) => sha256(`${JSON.stringify(value, null, 2)}\n`);
const preQaLedgerProjection = (terminalLedger) => {
  const projection = structuredClone(terminalLedger);
  const terminalQaStages = projection.stages?.filter((entry) => entry.stage === 'independent-immutable-post-qa') ?? [];
  fail(terminalQaStages.length === 1 && terminalQaStages[0].status === 'FAIL', 'terminal ledger does not retain exactly one failed original immutable-QA stage');
  projection.stages = projection.stages.filter((entry) => entry.stage !== 'independent-immutable-post-qa');
  // The runner writes these only in its catch/final status path after the QA
  // subprocess had already hash-bound the pre-QA ledger.
  delete projection.error;
  delete projection.completedAtUtc;
  delete projection.independentPostQa;
  return projection;
};

fail(originalQaPath && correctedQaPath && ledgerPath && manifestPath && snapshot && postIntakePath && out,
  '--original-qa, --corrected-qa, --ledger, --manifest, --snapshot, --post-intake, and --out are required');
for (const required of [originalQaPath, correctedQaPath, ledgerPath, manifestPath, postIntakePath, path.join(snapshot, 'combined-zones-complete-save-capture.json')]) {
  fail(fs.existsSync(absolute(required)), `missing ${required}`);
}
fail(!fs.existsSync(absolute(out)), '--out must be fresh; original artifacts are never overwritten');

const originalQa = readJson(originalQaPath);
const correctedQa = readJson(correctedQaPath);
const ledger = readJson(ledgerPath);
const manifest = readJson(manifestPath);
const postIntake = readJson(postIntakePath);
const capture = readJson(path.join(snapshot, 'combined-zones-complete-save-capture.json'));
const canonicalTargets = new Map((manifest.target?.allCanonicalPostStates ?? []).map((cell) => [key(cell.point), cell.targetState]));
const contractStates = new Map();
for (const contract of Object.values(manifest.ownershipAndInterfaces?.contracts ?? {})) {
  for (const cells of [contract.supportRow?.cells ?? [], contract.clearFace?.cells ?? []]) {
    for (const cell of cells) contractStates.set(key(cell.point), cell.state);
  }
}

fail(manifest.id === 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02' && manifest.route?.stationCount === 28 && manifest.target?.canonicalPostStateCellCount === 768,
  'wrong exact Return-02 manifest');
fail(ledger.releaseId === manifest.id && ledger.status === 'EXECUTED_PENDING_INDEPENDENT_POST_QA' && ledger.sourceSnapshot?.manifestSha256 === fileSha256(manifestPath),
  'guarded release ledger is not the original pending exact release');
for (const stage of ['strict-forward-execution', 'fresh-post-complete-save', 'post-complete-save-intake', 'rollback-poststate-preflight']) {
  fail(ledger.stages?.some((entry) => entry.stage === stage && entry.status === 'PASS'), `original ledger lacks passed ${stage}`);
}
fail(postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE' && postIntake.summary?.passed === true && postIntake.input?.suppliedWorldRoot === relative(snapshot),
  'post capture is not an immutable complete same-moment save');
fail(originalQa.status === 'FAIL_C01_RETURN02_IMMUTABLE_POST_QA' && originalQa.mutationAuthority === false,
  'original QA must remain the original failed read-only report');
fail(originalQa.postSnapshot?.root === relative(snapshot) && originalQa.postSnapshot?.captureId === capture.captureId,
  'original QA does not bind this immutable post capture');
const originalPreQaLedger = preQaLedgerProjection(ledger);
fail(originalQa.bindings?.manifest?.sha256 === fileSha256(manifestPath) && originalQa.bindings?.ledger?.sha256 === jsonSha256(originalPreQaLedger),
  'original QA does not bind the exact reconstructable pre-QA ledger projection');
const originalChecks = originalQa.checks ?? {};
fail(originalChecks.canonicalPostStates?.passed === true && originalChecks.dryGravitySafe?.passed === true
  && originalChecks.twentyEightFiveWideFiveClearStations?.passed === true
  && originalChecks.lowerToUpperNormalWalk === true && originalChecks.upperToLowerNormalWalk === true,
  'original QA failure includes a physical, canonical, dry, station, or walk failure');
const originalEndpoint = originalChecks.endpointAndProtectedSwitchbackInvariants;
fail(originalEndpoint?.passed === false && Array.isArray(originalEndpoint.hits) && originalEndpoint.hits.length > 0,
  'original QA is not an endpoint-only failure');
for (const hit of originalEndpoint.hits) {
  const pointKey = key(hit.point);
  fail(canonicalTargets.get(pointKey) === hit.actual && contractStates.get(pointKey) === hit.expected && hit.actual !== hit.expected,
    `original endpoint failure at ${pointKey} is not an intentional canonical-target overlay conflict`);
}

fail(correctedQa.status === 'PASS_C01_RETURN02_IMMUTABLE_POST_QA' && correctedQa.mutationAuthority === false && correctedQa.readOnly === true && correctedQa.worldMutated === false,
  'corrected QA is not a passing read-only immutable post QA');
fail(correctedQa.postSnapshot?.root === relative(snapshot) && correctedQa.postSnapshot?.captureId === capture.captureId,
  'corrected QA does not bind this immutable post capture');
fail(correctedQa.bindings?.manifest?.sha256 === fileSha256(manifestPath) && correctedQa.bindings?.ledger?.sha256 === fileSha256(ledgerPath),
  'corrected QA bindings drift from source artifacts');
fail(allPassed(correctedQa.checks ?? {}), 'corrected QA does not pass every canonical, dry, station, walk, and endpoint check');
const correctedEndpoint = correctedQa.checks.endpointAndProtectedSwitchbackInvariants;
fail(Array.isArray(correctedEndpoint.hits) && correctedEndpoint.hits.length === 0
  && Number.isInteger(correctedEndpoint.canonicalTargetOverlayCellCount) && correctedEndpoint.canonicalTargetOverlayCellCount > 0
  && correctedEndpoint.canonicalTargetOverlayRule?.includes('canonical target state'),
  'corrected QA does not explicitly prove the canonical target overlay rule');

const base = {
  schemaVersion: 1,
  id: 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02-POST-QA-CORRECTION',
  status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE_BY_CORRECTED_IMMUTABLE_QA',
  correctionKind: 'canonical-target-overlay endpoint-contract interpretation',
  generatedAtUtc: new Date().toISOString(),
  readOnly: true,
  mutationAuthority: false,
  worldMutated: false,
  immutablePostCapture: { root: relative(snapshot), captureId: capture.captureId, completeSaveCaptureSha256: fileSha256(path.join(snapshot, 'combined-zones-complete-save-capture.json')), postIntake: { path: relative(postIntakePath), sha256: fileSha256(postIntakePath), status: postIntake.status } },
  preservedOriginalEvidence: {
    originalQa: { path: relative(originalQaPath), sha256: fileSha256(originalQaPath), status: originalQa.status },
    guardedReleaseLedger: { path: relative(ledgerPath), sha256: fileSha256(ledgerPath), status: ledger.status },
    originalQaLedgerProjection: { sha256: jsonSha256(originalPreQaLedger), stageCount: originalPreQaLedger.stages.length, reconstruction: 'terminal ledger minus the failed independent-immutable-post-qa stage and its catch/final fields' },
    preservationRule: 'Original failed QA and terminal pending guarded-release ledger are retained unchanged; this new record does not overwrite or edit either artifact.',
  },
  correctedEvidence: { qa: { path: relative(correctedQaPath), sha256: fileSha256(correctedQaPath), status: correctedQa.status } },
  correctionScope: {
    originalEndpointOnlyFailureCount: originalEndpoint.hits.length,
    correctedCanonicalTargetOverlayCellCount: correctedEndpoint.canonicalTargetOverlayCellCount,
    rule: correctedEndpoint.canonicalTargetOverlayRule,
    validation: 'Every original endpoint mismatch is exactly a legacy contract expected state replaced by the same-point canonical target state; all canonical, dry, station, bidirectional-walk, protected-route, and endpoint checks now pass from the same immutable post capture.',
  },
  nonClaims: [
    'Does not alter the original execution ledger, failed QA, world, source snapshot, post snapshot, or operations.',
    'Does not authorize further mutation, rollback, opening, public commissioning, or service commissioning.',
  ],
};
const record = { ...base, recordIdentitySha256: sha256(`${JSON.stringify(base, null, 2)}\n`) };
fs.mkdirSync(absolute(out), { recursive: true });
fs.writeFileSync(path.join(absolute(out), 'mp11-c01-public-independent-return-02-post-qa-correction-ledger.json'), `${JSON.stringify(record, null, 2)}\n`);
fs.writeFileSync(path.join(absolute(out), 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02-POST-QA-CORRECTION.md'), `# C01 Return-02 post-QA correction\n\nStatus: \`${record.status}\`\n\nThis is a read-only, hash-bound correction ledger. It preserves the original failed endpoint-only QA and the original pending guarded-release ledger. The corrected immutable QA applies canonical target state on endpoint records that overlap release targets, while retaining legacy endpoint expectations elsewhere.\n\n- Original endpoint-only conflicts: ${record.correctionScope.originalEndpointOnlyFailureCount}\n- Canonical-target overlay records checked: ${record.correctionScope.correctedCanonicalTargetOverlayCellCount}\n- No world mutation, opening, or commissioning is authorized.\n`);
console.log(JSON.stringify({ status: record.status, correctionKind: record.correctionKind, originalEndpointOnlyFailureCount: originalEndpoint.hits.length, mutationAuthority: false, out: relative(out) }, null, 2));
