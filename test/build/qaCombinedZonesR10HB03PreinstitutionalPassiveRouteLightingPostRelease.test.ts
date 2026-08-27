import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r10h-live-20260822T035805Z');
const QA = path.join(EVIDENCE, 'r10h-post-release-qa.json');
const report = JSON.parse(fs.readFileSync(QA, 'utf8')) as Record<string, any>;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r10h-post-qa-'));
const sha256 = (filename: string) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');

afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones R10H post-release QA', () => {
  it('reproduces the canonical machine seal deterministically', () => {
    const out = path.join(temp, 'qa.json');
    const markdown = path.join(temp, 'qa.md');
    execFileSync(process.execPath, [
      path.join(ROOT, 'scripts/qa_combined_zones_r10h_b03_preinstitutional_passive_route_lighting_post_release.mjs'),
      '--out', out,
      '--markdown', markdown,
    ], { cwd: ROOT, stdio: 'pipe' });
    expect(sha256(out)).toBe(sha256(QA));
    expect(sha256(QA)).toBe('0219243e1e1a649ee7dd5b3f0f57efc3beb1778a28d22a805e8d8020c1b9b11c');
  }, 30_000);

  it('binds the exact completed release identity and immutable saves', () => {
    expect(report).toMatchObject({
      status: 'PASS_R10H_B03_PREINSTITUTIONAL_PASSIVE_ROUTE_LIGHTING_POSTSTATE_VERIFIED_REVERSIBLE',
      qaPayloadSha256: '19346d2a8d599e92b5deedbc78569d1deb2b0b5d54d86286f28208474d52bee9',
      release: {
        completedReleaseIdentitySha256: '731d4b4c669ac1bccf3c1f2fd32dc5f67c2f70922700d8fb7f3c1ac50f62b364',
      },
    });
  });

  it('proves exactly 48 declared target changes in the 1,296-cell halo', () => {
    expect(report.geometry).toMatchObject({
      targets: { cellCount: 48 },
      exactSparseInteractionHalo: { cellCount: 1296 },
    });
    expect(report.observedTransitions).toMatchObject({
      sourceTargetStateCensus: { 'minecraft:polished_diorite': 48 },
      postTargetStateCensus: { 'minecraft:sea_lantern': 48 },
      exactTargetChangeCount: 48,
      exactHaloChangeCount: 48,
      declaredHaloChangeCount: 48,
      undeclaredHaloChangeCount: 0,
    });
  });

  it('preserves entities and all 5,346 predecessor targets', () => {
    expect(report.entityPreservation).toEqual({
      sourceBlockEntityCount: 0,
      postBlockEntityCount: 0,
      sourceSavedEntityCount: 0,
      postSavedEntityCount: 0,
    });
    expect(report.predecessorPreservation).toMatchObject({
      targetCellCount: 5346,
      targetChangeCount: 0,
      desiredStateFailureCount: 0,
      r10hTargetIntersectionCount: 0,
    });
  });

  it('binds strict execution, complete journal, stages, and inverse', () => {
    expect(report.execution).toMatchObject({
      stageCount: 17,
      stagePassCount: 17,
      successfulGroupCount: 48,
      failedGroupCount: 0,
      successfulCommandCount: 48,
      noOpCommandCount: 0,
      journalRecordCount: 102,
      journalGroupIntentCount: 48,
      journalGroupResultCount: 48,
      forceLoadSetRestored: true,
    });
    expect(report.rollbackReadiness).toMatchObject({
      operationCount: 48,
      passedGuardCount: 48,
      failedGuardCount: 0,
      exactCurrentPostState: true,
    });
    expect(report.summary).toMatchObject({ passed: true, checkCount: 12, passCount: 12, failCount: 0 });
  });
});
