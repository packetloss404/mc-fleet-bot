#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  buildGuardedSourceRecovery,
  hashText,
} from './lib/guarded_source_recovery.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function value(name, fallback = null) {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
}

function requiredPath(name) {
  const supplied = value(name);
  if (!supplied) throw new Error(`missing required ${name} path`);
  return path.resolve(ROOT, supplied);
}

function relative(filename) {
  return path.relative(ROOT, filename);
}

function writeNew(filename, contents) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, contents, { flag: args.includes('--overwrite') ? 'w' : 'wx' });
}

let auditPath = null;
try {
  const opsPath = requiredPath('--ops');
  const preflightPath = requiredPath('--preflight');
  const outputPath = requiredPath('--out');
  auditPath = requiredPath('--audit');
  const verificationPath = requiredPath('--verification');
  for (const filename of [opsPath, preflightPath]) {
    if (!fs.existsSync(filename)) throw new Error(`input does not exist: ${relative(filename)}`);
  }
  const inputs = new Set([opsPath, preflightPath]);
  for (const filename of [outputPath, auditPath, verificationPath]) {
    if (inputs.has(filename)) throw new Error(`output overlaps input: ${relative(filename)}`);
    if (fs.existsSync(filename) && !args.includes('--overwrite')) {
      throw new Error(`output already exists (use --overwrite explicitly): ${relative(filename)}`);
    }
  }

  const opsText = fs.readFileSync(opsPath, 'utf8');
  const preflightText = fs.readFileSync(preflightPath, 'utf8');
  const preflight = JSON.parse(preflightText);
  const plan = buildGuardedSourceRecovery({ opsText, preflight });
  if (plan.recoveryCellCount === 0) {
    throw new Error(
      'all failure points are proven projection cascades; no recovery operation is justified',
    );
  }

  const recoveryText = [
    '# GENERATED — bounded exact guarded source restoration',
    '# OFFLINE OUTPUT ONLY — NOT AN EXECUTION OR RESTORATION CLAIM',
    `# canonical_ops: ${relative(opsPath)}`,
    `# canonical_ops_sha256: ${plan.canonical.sha256}`,
    `# canonical_source_snapshot_sha256: ${plan.canonical.sourceSnapshotSha256}`,
    `# preflight_report: ${relative(preflightPath)}`,
    `# preflight_report_sha256: ${hashText(preflightText)}`,
    `# proven_failure_points: ${plan.provenFailurePointCount}`,
    `# exact_recovery_cells: ${plan.recoveryCellCount}`,
    '# execution_contract: frozen world; fresh entity gate; strict-noop Paper-strict runner',
    '# ordering: removals top-down, then non-air restoration bottom-up',
    '# postcondition: take a new snapshot and rerun the entire canonical preflight',
    '',
    ...plan.operationLines,
    '',
  ].join('\n');
  const verificationText = [
    '# GENERATED — offline source verification for every proven failure point',
    '# DO NOT EXECUTE: identical source/replacement states are preflight assertions',
    `# canonical_ops_sha256: ${plan.canonical.sha256}`,
    `# preflight_report_sha256: ${hashText(preflightText)}`,
    `# verification_cells: ${plan.verificationCells.length}`,
    '',
    ...plan.verificationLines,
    '',
  ].join('\n');
  const audit = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: 'ACCEPTED_OFFLINE_RECOVERY_PLAN_NOT_EXECUTED',
    liveWorldMutated: false,
    inputs: {
      canonicalOps: relative(opsPath),
      canonicalOpsSha256: plan.canonical.sha256,
      canonicalSourceSnapshotSha256: plan.canonical.sourceSnapshotSha256,
      preflightReport: relative(preflightPath),
      preflightReportSha256: hashText(preflightText),
      preflightRegions: preflight.regions,
      preflightRegionsSnapshot: preflight.regionsSnapshot ?? null,
    },
    outputs: {
      recoveryOperations: relative(outputPath),
      recoveryOperationsSha256: hashText(recoveryText),
      sourceVerification: relative(verificationPath),
      sourceVerificationSha256: hashText(verificationText),
    },
    scope: {
      provenFailurePoints: plan.provenFailurePointCount,
      exactRecoveryCells: plan.recoveryCellCount,
      projectionCascadeCellsWithNoWrite: plan.cascadeProofs.length,
      oneCellExactGuardsOnly: true,
      blockEntityRecoveryAllowed: false,
    },
    executionContract: {
      offlineGenerationOnly: true,
      worldMustRemainFrozen: true,
      freshEntityGateRequired: true,
      strictNoopRequired: true,
      paperStrictFillRequired: true,
      parserDryRunRequired: true,
      postRecoverySnapshotRequired: true,
      completeCanonicalPreflightRequired: true,
      automaticLiveExecution: false,
    },
    restorations: plan.restorations,
    projectionCascades: plan.cascadeProofs,
    verificationCells: plan.verificationCells,
  };
  const auditText = `${JSON.stringify(audit, null, 2)}\n`;

  // Write the audit last so its accepted status cannot exist without both
  // byte-identical operation artifacts.
  writeNew(outputPath, recoveryText);
  writeNew(verificationPath, verificationText);
  writeNew(auditPath, auditText);
  console.log(JSON.stringify({
    status: audit.status,
    recovery: relative(outputPath),
    verification: relative(verificationPath),
    audit: relative(auditPath),
    provenFailurePoints: plan.provenFailurePointCount,
    exactRecoveryCells: plan.recoveryCellCount,
    projectionCascades: plan.cascadeProofs.length,
  }, null, 2));
} catch (error) {
  if (auditPath && !fs.existsSync(auditPath)) {
    try {
      writeNew(auditPath, `${JSON.stringify({
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        status: 'REJECTED_OFFLINE_RECOVERY_PLAN',
        liveWorldMutated: false,
        error: error.message,
      }, null, 2)}\n`);
    } catch {
      // Preserve the primary fail-closed error if even the rejected audit
      // cannot be written.
    }
  }
  console.error(`source recovery generation rejected: ${error.message}`);
  process.exitCode = 1;
}
