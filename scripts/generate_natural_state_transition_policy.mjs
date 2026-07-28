#!/usr/bin/env node
/**
 * Generate an exact-point rollback-only natural copper transition policy from
 * one complete, order-aware failed preflight.
 *
 * The generator is deliberately all-or-nothing. Every unexpected cell in the
 * evidence must be a same-family forward oxidation of the operation's sole
 * canonical source with identical properties. Unsupported drift is reported
 * in the audit and prevents policy output.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isNaturalCopperOxidationEvolution,
  loadNaturalStateTransitionPolicy,
  validateNaturalStateTransitionPolicy,
} from './lib/natural_state_transition_policy.mjs';
import {
  parseOperationText,
} from './qa_town_expansion_post_release.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHA256 = /^[a-f0-9]{64}$/;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function resolveRoot(filename) {
  return path.isAbsolute(filename) ? filename : path.resolve(ROOT, filename);
}

function relativeRoot(filename) {
  const relative = path.relative(ROOT, filename);
  return (relative.startsWith('..') ? path.resolve(filename) : relative)
    .split(path.sep)
    .join('/');
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function normalizedBox(box) {
  return [
    Math.min(box[0], box[3]),
    Math.min(box[1], box[4]),
    Math.min(box[2], box[5]),
    Math.max(box[0], box[3]),
    Math.max(box[1], box[4]),
    Math.max(box[2], box[5]),
  ];
}

function sameBox(left, right) {
  return JSON.stringify(normalizedBox(left)) === JSON.stringify(normalizedBox(right));
}

function pointKey(point) {
  return point.join(',');
}

function comparePoints(left, right) {
  return left[0] - right[0]
    || left[1] - right[1]
    || left[2] - right[2];
}

function validateEvidenceHeader(evidence, evidencePath, operationPath, operationSha256) {
  const failures = [];
  const fail = (reason, details = {}) => failures.push({ reason, ...details });
  if (Number(evidence.schemaVersion) < 2) fail('evidence-schema-too-old');
  if (evidence.status !== 'FAIL') fail('evidence-must-be-an-unpolicy-fail');
  if (evidence.orderAwareProjection !== true) fail('evidence-not-order-aware');
  if (evidence.failurePointsComplete !== true) fail('evidence-points-incomplete');
  if (!Array.isArray(evidence.partialMasks) || evidence.partialMasks.length !== 0) {
    fail('evidence-has-partial-masks');
  }
  if (evidence.opsSha256 !== operationSha256) {
    fail('evidence-operation-hash-mismatch', {
      expected: operationSha256,
      actual: evidence.opsSha256 ?? null,
    });
  }
  if (
    typeof evidence.opsPath !== 'string'
    || resolveRoot(evidence.opsPath) !== operationPath
  ) {
    fail('evidence-operation-path-mismatch', {
      expected: relativeRoot(operationPath),
      actual: evidence.opsPath ?? null,
    });
  }
  if (!SHA256.test(String(evidence.regionsSnapshot?.sha256 ?? ''))) {
    fail('evidence-snapshot-hash-missing');
  }
  if (
    !Array.isArray(evidence.failures)
    || evidence.failed !== evidence.failures.length
    || evidence.failed < 1
  ) {
    fail('evidence-failure-cardinality-mismatch');
  }
  return {
    evidencePath: relativeRoot(evidencePath),
    evidenceSha256: sha256(fs.readFileSync(evidencePath)),
    failures,
  };
}

export function generateNaturalStateTransitionPolicy({
  evidencePath,
  operationPath,
  policyId,
  policyPath = null,
}) {
  const resolvedEvidencePath = resolveRoot(evidencePath);
  const resolvedOperationPath = resolveRoot(operationPath);
  const evidence = readJson(resolvedEvidencePath);
  const operationBytes = fs.readFileSync(resolvedOperationPath);
  const operationSha256 = sha256(operationBytes);
  const parsed = parseOperationText(operationBytes.toString('utf8'), operationPath);
  const operationByLine = new Map(parsed.repl.map((operation) => [
    operation.line,
    operation,
  ]));
  const header = validateEvidenceHeader(
    evidence,
    resolvedEvidencePath,
    resolvedOperationPath,
    operationSha256,
  );
  const failures = [...header.failures];
  if (parsed.unsupported.length > 0) {
    failures.push({
      reason: 'operation-file-has-unsupported-lines',
      count: parsed.unsupported.length,
      examples: parsed.unsupported.slice(0, 20),
    });
  }

  const observedKeys = new Set();
  const rules = [];
  const unsupportedTransitions = [];
  let observedPoints = 0;
  let naturalTransitionPoints = 0;
  for (const failure of evidence.failures ?? []) {
    const operation = operationByLine.get(failure.line);
    if (!operation) {
      failures.push({
        reason: 'evidence-line-not-found',
        line: failure.line,
      });
      continue;
    }
    if (
      operation.sources.length !== 1
      || !Array.isArray(failure.box)
      || failure.box.length !== 6
      || !sameBox(failure.box, operation.box)
      || JSON.stringify(failure.expected) !== JSON.stringify(operation.sources)
      || failure.unexpectedComplete !== true
      || failure.unexpectedCount !== failure.unexpected?.length
    ) {
      failures.push({
        reason: 'evidence-operation-contract-mismatch',
        line: failure.line,
      });
      continue;
    }

    const allowedActualStates = new Set();
    const points = [];
    for (const unexpected of failure.unexpected) {
      observedPoints += 1;
      const key = `${failure.line}:${pointKey(unexpected.point)}`;
      if (observedKeys.has(key)) {
        failures.push({
          reason: 'duplicate-evidence-point',
          line: failure.line,
          point: unexpected.point,
        });
        continue;
      }
      observedKeys.add(key);
      if (!isNaturalCopperOxidationEvolution(
        operation.sources[0],
        unexpected.actual,
      )) {
        unsupportedTransitions.push({
          line: failure.line,
          point: unexpected.point,
          canonicalSource: operation.sources[0],
          actual: unexpected.actual,
          replacement: operation.desired,
        });
        continue;
      }
      naturalTransitionPoints += 1;
      allowedActualStates.add(unexpected.actual);
      points.push([...unexpected.point]);
    }
    if (points.length > 0) {
      rules.push({
        id: `natural-copper-transition-line-${failure.line}`,
        line: failure.line,
        box: [...operation.box],
        canonicalSource: operation.sources[0],
        allowedActualStates: [...allowedActualStates].sort(),
        points: points.sort(comparePoints),
      });
    }
  }
  if (unsupportedTransitions.length > 0) {
    failures.push({
      reason: 'unsupported-non-natural-transition-evidence',
      count: unsupportedTransitions.length,
    });
  }
  if (naturalTransitionPoints + unsupportedTransitions.length !== observedPoints) {
    failures.push({
      reason: 'evidence-point-accounting-mismatch',
      observedPoints,
      naturalTransitionPoints,
      unsupportedPoints: unsupportedTransitions.length,
    });
  }

  const policy = {
    schemaVersion: 1,
    policyId,
    kind: 'natural-block-state-transition',
    executionRole: 'rollback',
    matchMode: 'exact-declared-points',
    propertyPolicy: 'identical',
    operation: {
      path: relativeRoot(resolvedOperationPath),
      sha256: operationSha256,
    },
    evidence: {
      preflightPath: relativeRoot(resolvedEvidencePath),
      preflightSha256: header.evidenceSha256,
      snapshotSha256: evidence.regionsSnapshot?.sha256 ?? null,
    },
    rules,
  };
  if (failures.length === 0) {
    try {
      validateNaturalStateTransitionPolicy(policy, {
        operationSha256,
        operationPath: resolvedOperationPath,
        operations: parsed.repl,
        policyPath: policyPath ? resolveRoot(policyPath) : resolvedEvidencePath,
        requireEvidence: true,
      });
    } catch (error) {
      failures.push({
        reason: 'generated-policy-self-validation-failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const audit = {
    schemaVersion: 1,
    id: 'natural-state-transition-policy-generation-audit',
    generatedAtUtc: new Date().toISOString(),
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    passed: failures.length === 0,
    policyId,
    operation: policy.operation,
    evidence: {
      ...policy.evidence,
      failedOperationGroups: evidence.failed ?? null,
      failureArrayLength: evidence.failures?.length ?? null,
      observedPoints,
    },
    classification: {
      naturalTransitionPoints,
      unsupportedPoints: unsupportedTransitions.length,
      ruleCount: rules.length,
      allEvidencePointsAccountedFor:
        naturalTransitionPoints + unsupportedTransitions.length === observedPoints,
    },
    naturalCandidate: {
      acceptedPolicy: failures.length === 0,
      candidateSha256: sha256(JSON.stringify(policy)),
      ruleSummaries: rules.map((rule) => ({
        id: rule.id,
        line: rule.line,
        canonicalSource: rule.canonicalSource,
        allowedActualStates: rule.allowedActualStates,
        pointCount: rule.points.length,
      })),
    },
    unsupportedTransitions,
    failures,
  };
  return { passed: failures.length === 0, policy, audit };
}

function valueAfter(argv, flag, required = false) {
  const index = argv.indexOf(flag);
  const value = index >= 0 ? argv[index + 1] : null;
  if (required && (!value || value.startsWith('--'))) {
    throw new Error(`${flag} is required`);
  }
  return value;
}

function writeNewJson(filename, value) {
  if (fs.existsSync(filename)) {
    throw new Error(`refusing to overwrite existing artifact: ${filename}`);
  }
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  const evidencePath = resolveRoot(valueAfter(argv, '--evidence', true));
  const operationPath = resolveRoot(valueAfter(argv, '--operation', true));
  const outputPath = resolveRoot(valueAfter(argv, '--out', true));
  const auditPath = resolveRoot(valueAfter(argv, '--audit', true));
  const snapshotSha256 = readJson(evidencePath).regionsSnapshot?.sha256;
  const policyId = valueAfter(argv, '--policy-id')
    ?? `rollback-natural-copper-${String(snapshotSha256).slice(0, 12)}`;
  const result = generateNaturalStateTransitionPolicy({
    evidencePath,
    operationPath,
    policyId,
    policyPath: outputPath,
  });
  writeNewJson(auditPath, result.audit);
  if (!result.passed) {
    process.stdout.write(`${JSON.stringify({
      status: 'FAIL',
      policyWritten: false,
      audit: relativeRoot(auditPath),
      classification: result.audit.classification,
      failures: result.audit.failures,
    }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  writeNewJson(outputPath, result.policy);
  loadNaturalStateTransitionPolicy(outputPath, {
    operationSha256: result.policy.operation.sha256,
    operationPath,
    operations: parseOperationText(
      fs.readFileSync(operationPath, 'utf8'),
      operationPath,
    ).repl,
  });
  process.stdout.write(`${JSON.stringify({
    status: 'PASS',
    policy: relativeRoot(outputPath),
    policySha256: sha256(fs.readFileSync(outputPath)),
    audit: relativeRoot(auditPath),
    classification: result.audit.classification,
  }, null, 2)}\n`);
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
