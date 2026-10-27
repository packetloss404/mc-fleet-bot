#!/usr/bin/env node
/** Evidence-only High-16 finalizer. Never contacts Minecraft, RCON, or fleet. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const arg = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : ''; };
const evidence = arg('--evidence'); const manifestPath = arg('--manifest'); const contractPath = arg('--contract');
const adoptionPath = arg('--adoption-record'); const source = arg('--source'); const post = arg('--post'); const out = arg('--out');
if (!evidence || !manifestPath || !contractPath || !adoptionPath || !source || !post || !out) throw new Error('usage: --evidence <dir> --manifest <manifest> --contract <proposal> --adoption-record <accepted-record> --source <snapshot> --post <snapshot> --out <ledger>');
const absolute = (file) => path.resolve(ROOT, file);
const relative = (file) => path.relative(ROOT, absolute(file)).split(path.sep).join('/');
const bytes = (file) => fs.readFileSync(absolute(file));
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (file) => JSON.parse(bytes(file));
const bind = (file) => ({ path: relative(file), sha256: sha(bytes(file)), bytes: fs.statSync(absolute(file)).size });
const fail = (condition, message) => { if (!condition) throw new Error(`SYS-03 High-16 finalization refused: ${message}`); };
const regionIdentity = (snapshot) => {
  const directory = path.join(absolute(snapshot), 'region'); const names = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort(); const hash = crypto.createHash('sha256');
  for (const name of names) { hash.update(name); hash.update('\0'); hash.update(fs.readFileSync(path.join(directory, name))); hash.update('\0'); }
  return { sha256: hash.digest('hex'), regionFileCount: names.length };
};
const captureHash = (snapshot) => sha(bytes(`${snapshot}/combined-zones-complete-save-capture.json`));
const completeSnapshot = (snapshot, name) => {
  for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(absolute(snapshot), member)), `${name} snapshot lacks ${member}`);
  return regionIdentity(snapshot);
};
const pass = (name) => { const value = read(`${evidence}/${name}`); fail(value.status === 'PASS', `${name} is not PASS`); return value; };
const expectedOverlay = (operation) => ({ path: operation.forward, sha256: operation.sha256 });
const preflight = (name, operation, operationRole, snapshotIdentity, overlays) => {
  const value = pass(name); const operationPath = operationRole === 'forward' ? operation.forward : operation.rollback; const operationHash = operationRole === 'forward' ? operation.sha256 : operation.rollbackSha256;
  fail(value.opsPath === operationPath && value.opsSha256 === operationHash, `${name} does not bind the exact ${operation.id} ${operationRole} operation`);
  fail(value.regionsSnapshot?.sha256 === snapshotIdentity.sha256 && value.regionsSnapshot?.regionFileCount === snapshotIdentity.regionFileCount, `${name} snapshot identity drifted`);
  const artifacts = value.sourceOverlays?.artifacts ?? []; fail(artifacts.length === overlays.length, `${name} overlay cardinality drifted`);
  for (let index = 0; index < overlays.length; index += 1) fail(artifacts[index]?.path === overlays[index].path && artifacts[index]?.sha256 === overlays[index].sha256, `${name} overlay ${index} is not the exact preceding stage`);
  if (overlays.length > 0) fail(value.orderAwareProjection === true && value.projectionDependencyFailures?.length === 0, `${name} lacks an order-aware clean projection`);
  return value;
};
const dryRun = (name, operation, role) => { const value = read(`${evidence}/${name}`); const operationHash = role === 'forward' ? operation.sha256 : operation.rollbackSha256; fail(value.status === 'dry_run' && value.strictNoop === true && value.operationRole === role && (value.operationSha256 === operationHash || value.opsSha256 === operationHash) && value.failedGroups === 0 && value.noopCommands === 0, `${name} is not an exact strict ${role} parser proof`); return value; };
const entityGate = (name, operation, interactionHash) => { const value = pass(name); fail(value.passed === true && value.blockOrEntityMutation === false && value.readOnlyFacts === true && value.adapter?.readOnly === true && value.adapter?.worldMutated === false && value.adapter?.rconCalled === false && value.sourceObservation?.sha256?.length === 64 && value.operationSha256 === operation.sha256 && value.stage?.id === operation.id && value.stage?.forward === operation.forward && value.stage?.targetCount === operation.count && value.stage?.operationSha256 === operation.sha256 && value.interactionCoordinateSetSha256 === interactionHash && value.liveEntityHits === 0 && value.entityCount === 0, `${name} is not an exact empty live-entity clearance`); return value; };

fail(absolute(source) !== absolute(post), 'source and post snapshots must be different immutable captures');
fail(!fs.existsSync(absolute(out)), `refuses to overwrite existing ledger: ${out}`);
const sourceRegion = completeSnapshot(source, 'source'); const postRegion = completeSnapshot(post, 'post');
const manifestBytes = bytes(manifestPath); const manifest = read(manifestPath); const proposalBytes = bytes(contractPath); const proposal = read(contractPath); const adoption = read(adoptionPath);
fail(manifest.status === 'COMPILED_OFFLINE_AWAITING_FRESH_RELEASE_KERNEL' && manifest.civilOnly === true && manifest.passengerServiceCommissioned === false, 'manifest is not the exact civil-only static candidate');
fail(manifest.source?.snapshot === source && manifest.source?.completeSaveCaptureManifestSha256 === captureHash(source), 'manifest does not bind supplied source capture');
fail(proposal.mutationAuthority === false && proposal.civilOnly === true && proposal.passengerServiceCommissioned === false && proposal.sourceBinding?.manifest === relative(manifestPath) && proposal.sourceBinding?.manifestSha256 === sha(manifestBytes) && proposal.sourceBinding?.sourceSnapshot === source && proposal.sourceBinding?.sourceCaptureManifestSha256 === captureHash(source), 'proposal is not bound to this manifest and source');
fail(adoption.status === 'ACCEPTED_EXACT_OWNER_INTERFACE_RENEWAL' && adoption.mutationAuthority === false && adoption.sourceBinding?.snapshot === source && adoption.sourceBinding?.captureManifestSha256 === captureHash(source) && adoption.sourceBinding?.manifestSha256 === sha(manifestBytes) && adoption.sourceBinding?.proposalSha256 === sha(proposalBytes), 'adoption record is not exact-source-bound');
const [shell, core] = manifest.stages ?? []; fail(shell?.id === 'shell-gravity-lock' && shell.count === 1638 && shell.exactInverse === true && core?.id === 'core-clear-top-down' && core.count === 3227 && core.exactInverse === true, 'manifest stage contract drifted');
const interactionHash = manifest.geometry?.interaction?.coordinateSetSha256; fail(typeof interactionHash === 'string' && interactionHash.length === 64, 'manifest lacks exact interaction set identity');

for (const [name, snapshot, expectedCapture] of [['source', source, captureHash(source)], ['post', post, captureHash(post)]]) {
  const intake = read(`${evidence}/${name}-complete-save-intake.json`); fail(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE' && intake.summary?.passed === true && intake.summary?.holdCount === 0 && intake.summary?.requiredMemberCount === 130 && intake.input?.suppliedWorldRoot === snapshot && intake.packageIdentity?.captureManifestSha256 === expectedCapture, `${name} intake is not bound complete immutable evidence`);
}
const staticQa = pass('independent-static-qa.json'); fail(staticQa.manifest?.sha256 === sha(manifestBytes) && staticQa.sourceSnapshot === source && staticQa.sourceCaptureManifestSha256 === captureHash(source) && staticQa.readOnly === true && staticQa.worldMutated === false && staticQa.rconCalled === false && Object.values(staticQa.checks ?? {}).every((value) => value === true), 'independent static QA lacks exact source/manifest/capture binding');
preflight('shell-forward-source-preflight.json', shell, 'forward', sourceRegion, []); preflight('core-forward-projected-preflight.json', core, 'forward', sourceRegion, [expectedOverlay(shell)]); preflight('core-projected-rollback-preflight.json', core, 'rollback', sourceRegion, [expectedOverlay(shell), expectedOverlay(core)]); preflight('shell-projected-rollback-preflight.json', shell, 'rollback', sourceRegion, [expectedOverlay(shell)]); preflight('core-rollback-poststate-preflight.json', core, 'rollback', postRegion, []); preflight('shell-rollback-poststate-preflight.json', shell, 'rollback', postRegion, [{ path: core.rollback, sha256: core.rollbackSha256 }]);
dryRun('shell-forward-strict-dry-run.json', shell, 'forward'); dryRun('core-forward-strict-dry-run.json', core, 'forward'); dryRun('core-rollback-strict-dry-run.json', core, 'rollback'); dryRun('shell-rollback-strict-dry-run.json', shell, 'rollback');
const staticEntities = pass('block-entity-clearance.json'); fail(staticEntities.interactionCoordinateSetSha256 === interactionHash && staticEntities.interactionCoordinateCount === manifest.geometry.interaction.count && staticEntities.operations?.forwardTargets === shell.count + core.count && staticEntities.blockEntities?.inInteractionEnvelope === 0 && staticEntities.savedEntitiesAtCapture?.inInteractionEnvelope === 0 && staticEntities.protectedCore?.operationOverlap?.length === 0 && staticEntities.readOnly === true && staticEntities.worldMutated === false && staticEntities.rconCalled === false, 'source block/saved-entity/protected-core clearance is incomplete or unbound'); entityGate('shell-live-entity-clearance.json', shell, interactionHash); entityGate('core-live-entity-clearance.json', core, interactionHash);
for (const operation of [shell, core]) { const execution = read(`${evidence}/${operation.id}-forward-execution.json`); fail(execution.status === 'complete' && execution.strictNoop === true && execution.operationSha256 === operation.sha256 && execution.successfulCommands === operation.count && execution.failedGroups === 0 && execution.noopCommands === 0, `${operation.id} execution is not exact strict completion`); const journal = `${evidence}/${operation.id}-forward-stream-journal.jsonl`; fail(fs.existsSync(absolute(journal)) && execution.streamJournalSha256 === sha(bytes(journal)), `${operation.id} journal is absent or not bound`); }
const qa = pass('independent-post-qa.json'); fail(qa.post === relative(post) && qa.postCaptureManifestSha256 === captureHash(post) && qa.manifestSha256 === sha(manifestBytes) && qa.contractSha256 === sha(proposalBytes) && Object.values(qa.checks ?? {}).every((value) => value === true) && qa.targets?.count === shell.count + core.count && qa.targets?.failures?.length === 0 && qa.postEntities?.blockEntities?.length === 0 && qa.postEntities?.savedEntities?.length === 0, 'independent post QA does not prove exact post/targets/entities');

const evidenceFiles = [manifestPath, contractPath, adoptionPath, ...fs.readdirSync(absolute(evidence)).sort().filter((name) => name !== 'evidence-ledger.json' && fs.statSync(path.join(absolute(evidence), name)).isFile()).map((name) => `${evidence}/${name}`)];
const ledger = { schemaVersion: 2, id: 'sys03-r10-high16-descending-bypass-guarded-release', status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', civilOnly: true, passengerServiceCommissioned: false, sourceSnapshot: { root: relative(source), captureManifestSha256: captureHash(source), regionSha256: sourceRegion.sha256 }, postSnapshot: { root: relative(post), captureManifestSha256: captureHash(post), regionSha256: postRegion.sha256 }, manifest: bind(manifestPath), proposal: bind(contractPath), adoption: bind(adoptionPath), geometry: { core: manifest.route.core, shell: manifest.geometry.shell, halo: manifest.geometry.halo, interaction: manifest.geometry.interaction }, interfaces: { retainedIngress: 30, migration: 36, retainedHigh15Air: 36, retainedHaloGravityChains: 34 }, execution: { shell: shell.count, core: core.count, strictTotal: shell.count + core.count, stagedProjectedRollback: true }, evidenceBindings: evidenceFiles.map(bind), nonClaims: ['rail', 'service opening', 'public route', 'station', 'power', 'signals', 'rescue', 'vehicle trials', 'passenger service'] };
ledger.completedReleaseIdentitySha256 = sha(JSON.stringify({ source: ledger.sourceSnapshot, post: ledger.postSnapshot, manifest: ledger.manifest.sha256, proposal: ledger.proposal.sha256, adoption: ledger.adoption.sha256, evidence: ledger.evidenceBindings.map(({ path: file, sha256 }) => ({ path: file, sha256 })) }));
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true }); fs.writeFileSync(absolute(out), `${JSON.stringify(ledger, null, 2)}\n`); console.log(JSON.stringify({ status: ledger.status, out: relative(out), completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 }, null, 2));
