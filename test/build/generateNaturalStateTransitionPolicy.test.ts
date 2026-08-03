import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';

import {
  generateNaturalStateTransitionPolicy,
} from '../../scripts/generate_natural_state_transition_policy.mjs';

function sha256(value: Buffer | string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function fixture(includeUnsupported = false) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-generator-'));
  const operationPath = path.join(directory, 'rollback.txt');
  const evidencePath = path.join(directory, 'preflight.json');
  const canonical = (
    'minecraft:cut_copper_stairs['
    + 'facing=north,half=bottom,shape=straight,waterlogged=false]'
  );
  const evolved = (
    'minecraft:exposed_cut_copper_stairs['
    + 'facing=north,half=bottom,shape=straight,waterlogged=false]'
  );
  const operation = [
    `REPL 1 64 1 2 64 1 ${canonical} minecraft:air`,
    ...(includeUnsupported
      ? ['REPL 5 64 5 5 64 5 minecraft:red_carpet minecraft:stone']
      : []),
    '',
  ].join('\n');
  fs.writeFileSync(operationPath, operation);
  const failures = [{
    line: 1,
    box: [1, 64, 1, 2, 64, 1],
    expected: [canonical],
    replacement: 'minecraft:air',
    unexpectedComplete: true,
    unexpectedCount: 1,
    unexpected: [{ point: [2, 64, 1], actual: evolved }],
  }];
  if (includeUnsupported) {
    failures.push({
      line: 2,
      box: [5, 64, 5, 5, 64, 5],
      expected: ['minecraft:red_carpet'],
      replacement: 'minecraft:stone',
      unexpectedComplete: true,
      unexpectedCount: 1,
      unexpected: [{ point: [5, 64, 5], actual: 'minecraft:air' }],
    });
  }
  fs.writeFileSync(evidencePath, `${JSON.stringify({
    schemaVersion: 2,
    status: 'FAIL',
    opsPath: operationPath,
    opsSha256: sha256(operation),
    regionsSnapshot: { sha256: 'a'.repeat(64) },
    orderAwareProjection: true,
    failurePointsComplete: true,
    partialMasks: [],
    failed: failures.length,
    failures,
  })}\n`);
  return { directory, evidencePath, operationPath };
}

describe('natural transition policy generator', () => {
  it('generates an exact evidence-bound rule for every natural point', () => {
    const value = fixture();
    try {
      const result = generateNaturalStateTransitionPolicy({
        evidencePath: value.evidencePath,
        operationPath: value.operationPath,
        policyId: 'synthetic-natural-copper',
      });
      expect(result.passed).toBe(true);
      expect(result.audit).toMatchObject({
        status: 'PASS',
        classification: {
          naturalTransitionPoints: 1,
          unsupportedPoints: 0,
          ruleCount: 1,
          allEvidencePointsAccountedFor: true,
        },
      });
      expect(result.policy).toMatchObject({
        operation: { sha256: sha256(fs.readFileSync(value.operationPath)) },
        evidence: {
          preflightSha256: sha256(fs.readFileSync(value.evidencePath)),
          snapshotSha256: 'a'.repeat(64),
        },
        rules: [{
          line: 1,
          points: [[2, 64, 1]],
        }],
      });
    } finally {
      fs.rmSync(value.directory, { recursive: true, force: true });
    }
  });

  it('refuses the entire policy when any evidence point is not natural copper', () => {
    const value = fixture(true);
    try {
      const result = generateNaturalStateTransitionPolicy({
        evidencePath: value.evidencePath,
        operationPath: value.operationPath,
        policyId: 'synthetic-mixed-drift',
      });
      expect(result.passed).toBe(false);
      expect(result.audit).toMatchObject({
        status: 'FAIL',
        classification: {
          naturalTransitionPoints: 1,
          unsupportedPoints: 1,
          allEvidencePointsAccountedFor: true,
        },
        unsupportedTransitions: [{
          line: 2,
          point: [5, 64, 5],
          canonicalSource: 'minecraft:red_carpet',
          actual: 'minecraft:air',
        }],
        failures: [{
          reason: 'unsupported-non-natural-transition-evidence',
          count: 1,
        }],
      });
    } finally {
      fs.rmSync(value.directory, { recursive: true, force: true });
    }
  });
});
