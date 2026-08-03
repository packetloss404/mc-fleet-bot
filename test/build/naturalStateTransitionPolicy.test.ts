import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  isNaturalCopperOxidationEvolution,
  loadNaturalStateTransitionPolicy,
  policyAllowsTransition,
} from '../../scripts/lib/natural_state_transition_policy.mjs';

function sha256(value: Buffer | string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'transition-policy-'));
  const operationText = (
    'REPL 1 64 1 2 64 1 '
    + 'minecraft:cut_copper_stairs[facing=north,half=bottom,shape=straight,waterlogged=false] '
    + 'minecraft:air\n'
  );
  const operationPath = path.join(directory, 'rollback.txt');
  fs.writeFileSync(operationPath, operationText);
  const operationSha256 = sha256(operationText);
  const snapshotSha256 = 'a'.repeat(64);
  const canonical = (
    'minecraft:cut_copper_stairs['
    + 'facing=north,half=bottom,shape=straight,waterlogged=false]'
  );
  const evolved = (
    'minecraft:exposed_cut_copper_stairs['
    + 'facing=north,half=bottom,shape=straight,waterlogged=false]'
  );
  const evidence = {
    schemaVersion: 2,
    orderAwareProjection: true,
    failurePointsComplete: true,
    partialMasks: [],
    opsSha256: operationSha256,
    regionsSnapshot: { sha256: snapshotSha256 },
    failed: 1,
    failures: [{
      line: 1,
      unexpectedComplete: true,
      unexpectedCount: 1,
      unexpected: [{ point: [2, 64, 1], actual: evolved }],
    }],
  };
  const evidencePath = path.join(directory, 'evidence.json');
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence)}\n`);
  const policy = {
    schemaVersion: 1,
    kind: 'natural-block-state-transition',
    executionRole: 'rollback',
    matchMode: 'exact-declared-points',
    propertyPolicy: 'identical',
    operation: { path: operationPath, sha256: operationSha256 },
    evidence: {
      preflightPath: evidencePath,
      preflightSha256: sha256(fs.readFileSync(evidencePath)),
      snapshotSha256,
    },
    rules: [{
      id: 'stairs',
      line: 1,
      box: [1, 64, 1, 2, 64, 1],
      canonicalSource: canonical,
      allowedActualStates: [evolved],
      points: [[2, 64, 1]],
    }],
  };
  const policyPath = path.join(directory, 'policy.json');
  fs.writeFileSync(policyPath, `${JSON.stringify(policy)}\n`);
  const operations = [{
    line: 1,
    box: [1, 64, 1, 2, 64, 1],
    expected: [canonical],
    replacement: 'minecraft:air',
  }];
  return {
    canonical,
    directory,
    evolved,
    operationSha256,
    operations,
    policy,
    policyPath,
  };
}

describe('natural block-state transition policy', () => {
  it('accepts only a declared same-family forward copper oxidation point', () => {
    const value = fixture();
    try {
      const loaded = loadNaturalStateTransitionPolicy(value.policyPath, {
        operationSha256: value.operationSha256,
        operationPath: path.join(value.directory, 'rollback.txt'),
        operations: value.operations,
      });
      expect(loaded.declaredPointCount).toBe(1);
      expect(policyAllowsTransition(
        loaded,
        value.operations[0],
        [2, 64, 1],
        value.evolved,
      )).toBe(true);
      expect(policyAllowsTransition(
        loaded,
        value.operations[0],
        [1, 64, 1],
        value.evolved,
      )).toBe(false);
      expect(policyAllowsTransition(
        loaded,
        value.operations[0],
        [2, 64, 1],
        value.evolved.replace('exposed_', 'weathered_'),
      )).toBe(false);
    } finally {
      fs.rmSync(value.directory, { recursive: true, force: true });
    }
  });

  it('requires identical properties and rejects waxed or unrelated families', () => {
    const value = fixture();
    try {
      expect(isNaturalCopperOxidationEvolution(
        value.canonical,
        value.evolved,
      )).toBe(true);
      expect(isNaturalCopperOxidationEvolution(
        value.canonical,
        value.evolved.replace('facing=north', 'facing=south'),
      )).toBe(false);
      expect(isNaturalCopperOxidationEvolution(
        value.canonical,
        value.evolved.replace('exposed_', 'waxed_exposed_'),
      )).toBe(false);
      expect(isNaturalCopperOxidationEvolution(
        value.canonical,
        'minecraft:exposed_cut_copper_slab[type=bottom,waterlogged=false]',
      )).toBe(false);
    } finally {
      fs.rmSync(value.directory, { recursive: true, force: true });
    }
  });

  it('fails closed on an operation hash mismatch', () => {
    const value = fixture();
    try {
      expect(() => loadNaturalStateTransitionPolicy(value.policyPath, {
        operationSha256: 'b'.repeat(64),
        operationPath: path.join(value.directory, 'rollback.txt'),
        operations: value.operations,
      })).toThrow(/does not match/);
    } finally {
      fs.rmSync(value.directory, { recursive: true, force: true });
    }
  });
});
