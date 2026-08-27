#!/usr/bin/env node
/** Replace an invalidated MP02 B08 acceptance claim with exact recovery evidence. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const dir = 'data/world-review/mp02-b08-service-spine-01-live-20260826T102000Z';
const abs = (filename) => path.resolve(ROOT, filename);
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const bind = (filename) => ({ path: filename, sha256: hash(fs.readFileSync(abs(filename))), bytes: fs.statSync(abs(filename)).size });
const read = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const previous = read(`${dir}/evidence-ledger.json`);
const recoveryIntake = read(`${dir}/ownership-recovery-complete-save-intake.json`);
const recoveryPreflight = read(`${dir}/ownership-recovery-forward-equivalence-preflight.json`);
const rollback = read(`${dir}/ownership-recovery-rollback-execution.json`);
if (recoveryIntake.status !== 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE' || recoveryPreflight.status !== 'PASS' || rollback.status !== 'complete' || rollback.strictNoop !== true || rollback.sourceOperationCount !== 729) throw new Error('recovery evidence does not prove exact strict recovery');
const conflictCells = [
  [1948, 71, -625], [1948, 71, -626], [1948, 71, -629], [1949, 72, -625], [1949, 72, -626],
  [1950, 73, -627], [1950, 73, -628], [1950, 73, -629], [1951, 74, -629], [1951, 74, -630],
];
const recovery = {
  schemaVersion: 1,
  id: 'mp02-subtropolis-b08-service-spine-01-ownership-recovery',
  status: 'REJECTED_AND_FULLY_RECOVERED_OWNERSHIP_CONFLICT',
  attemptedTransaction: { forward: previous.operation.forward, rollback: previous.operation.rollback, targetCells: 729 },
  invalidatingOwnership: {
    owner: 'Combined Zones R07C B08 retained route openings',
    overlapCount: conflictCells.length,
    coordinateSetSha256: '7f6bc0df2e23a27b10a51dae149ae8917e2d8dbb00e5c61657959c272e2e1dac',
    cells: conflictCells,
  },
  exactRecovery: {
    strictRollbackExecution: bind(`${dir}/ownership-recovery-rollback-execution.json`),
    liveEntityClearance: bind(`${dir}/pre-rollback-live-entity-clearance.json`),
    postRecoverySnapshot: {
      root: 'data/worldsnap-mp02-b08-ownership-recovery-20260826T102000Z',
      completeSaveSha256: recoveryIntake.packageIdentity.completeSaveSha256,
      regionSha256: read(`${dir}/ownership-recovery-snapshot-identity.json`).sha256,
    },
    originalForwardEquivalence: bind(`${dir}/ownership-recovery-forward-equivalence-preflight.json`),
  },
  result: 'No MP02 B08 floor remains as-built. All 729 original forward guards again pass after the exact inverse.',
};
recovery.recoveryIdentitySha256 = hash(JSON.stringify(recovery));
fs.writeFileSync(abs(`${dir}/ownership-recovery-ledger.json`), `${JSON.stringify(recovery, null, 2)}\n`);
previous.status = recovery.status;
previous.acceptance = { targetCells: 0, asBuiltClaim: false, reason: 'A post-execution ownership audit found ten R07C retained-air conflicts; exact inverse completed and recovery source passed all 729 original guards.' };
previous.supersededByRecovery = bind(`${dir}/ownership-recovery-ledger.json`);
previous.completedReleaseIdentitySha256 = null;
fs.writeFileSync(abs(`${dir}/evidence-ledger.json`), `${JSON.stringify(previous, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: recovery.status, recovery: `${dir}/ownership-recovery-ledger.json` }, null, 2)}\n`);
