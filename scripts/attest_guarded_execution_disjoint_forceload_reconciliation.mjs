#!/usr/bin/env node
/**
 * Reconcile a legacy guarded-runner false failure caused only by concurrent,
 * non-owned, spatially disjoint force-load additions.
 *
 * This never contacts Minecraft or changes any file it reads. It is not a
 * general status override: it requires the complete operation journal, exact
 * post QA, complete immutable post intake, preservation of every pre-existing
 * force-load, no leaked owned temporary chunk, and additions outside every
 * command chunk.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : '';
};
const required = ['--execution', '--journal', '--ops', '--post-intake', '--post-qa', '--out'];
for (const flag of required) if (!value(flag)) throw new Error(`missing ${flag}`);
const root = process.cwd();
const resolve = (file) => path.resolve(root, file);
const hashFile = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const executionPath = resolve(value('--execution'));
const journalPath = resolve(value('--journal'));
const operationsPath = resolve(value('--ops'));
const intakePath = resolve(value('--post-intake'));
const qaPath = resolve(value('--post-qa'));
const execution = JSON.parse(fs.readFileSync(executionPath, 'utf8'));
const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
const qa = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
const force = execution.forceLoadAudit ?? {};
const setOf = (points) => new Set((points ?? []).map(([x, z]) => `${x},${z}`));
const before = setOf(force.preExistingChunks);
const final = setOf(force.finalChunks);
const owned = setOf(force.ownedTemporaryChunks);
const removedPreexisting = [...before].filter((point) => !final.has(point));
const concurrentAdded = [...final].filter((point) => !before.has(point) && !owned.has(point));
const operationChunks = new Set();
let operationCount = 0;
for (const [index, raw] of fs.readFileSync(operationsPath, 'utf8').split(/\r?\n/).entries()) {
  const fields = raw.trim().split(/\s+/);
  if (!fields[0] || fields[0].startsWith('#')) continue;
  if (fields[0] !== 'REPL' || fields.length !== 9) throw new Error(`malformed operation at ${operationsPath}:${index + 1}`);
  const [x1, , z1, x2, , z2] = fields.slice(1, 7).map(Number);
  operationCount += 1;
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) operationChunks.add(`${Math.floor(x / 16)},${Math.floor(z / 16)}`);
}
const journalLines = fs.readFileSync(journalPath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const maxCompletedGroups = Math.max(0, ...journalLines.map((event) => Number(event.batch?.completedGroupCount ?? 0)));
const last = journalLines.at(-1) ?? {};
const concurrentAddedRequired = concurrentAdded.filter((point) => operationChunks.has(point));
const checks = {
  legacyFailureOnly: execution.status === 'failed' && (execution.failures ?? []).length === 0 && execution.failedGroups === 0 && execution.stoppedAtFirstFailedGroup === false && force.finalSetMatchesPreExistingSet === false,
  operationHash: hashFile(operationsPath) === execution.operationSha256,
  journalHash: hashFile(journalPath) === execution.streamJournalSha256,
  completeJournal: maxCompletedGroups === operationCount && execution.successfulGroups === operationCount && execution.successfulCommands === operationCount && execution.executedCommandCount === operationCount && last.status === 'failed-or-interrupted',
  forceLoadPreservation: removedPreexisting.length === 0 && force.allTemporaryReleased === true && (force.cleanupErrors ?? []).length === 0 && concurrentAddedRequired.length === 0,
  immutablePost: intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
  postQa: qa.status === 'PASS',
};
const passed = Object.values(checks).every(Boolean);
const report = {
  schemaVersion: 1,
  id: 'guarded-execution-disjoint-forceload-reconciliation',
  generatedAtUtc: new Date().toISOString(),
  status: passed ? 'PASS_RECONCILED_DISJOINT_CONCURRENT_FORCELOAD_ADDITION' : 'FAIL',
  readOnly: true,
  execution: { path: value('--execution'), sha256: hashFile(executionPath), legacyStatus: execution.status, operationSha256: execution.operationSha256, journalSha256: execution.streamJournalSha256 },
  inputs: { operations: { path: value('--ops'), count: operationCount, sha256: hashFile(operationsPath) }, postIntake: { path: value('--post-intake'), status: intake.status }, postQa: { path: value('--post-qa'), status: qa.status } },
  journal: { path: value('--journal'), eventCount: journalLines.length, maxCompletedGroups, finalStatus: last.status },
  forceLoadReconciliation: { preExistingCount: before.size, finalCount: final.size, ownedTemporaryChunks: [...owned].sort(), removedPreexisting, concurrentNonOwnedAddedChunks: concurrentAdded.sort(), concurrentNonOwnedAddedRequiredChunks: concurrentAddedRequired.sort(), rule: 'Every pre-existing chunk remains; every runner-owned temporary chunk is released; concurrent additions are accepted only outside all operation chunks.' },
  checks,
};
fs.mkdirSync(path.dirname(resolve(value('--out'))), { recursive: true });
fs.writeFileSync(resolve(value('--out')), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, checks, forceLoadReconciliation: report.forceLoadReconciliation }, null, 2));
if (!passed) process.exitCode = 1;
