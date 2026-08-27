import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  TRANSACTION_ID,
  compensationStages,
  composedPlan,
  runStateMachine,
} from '../../scripts/run_combined_zones_r12r_b09_active_shuttle_release.mjs';

const ROOT = path.resolve(__dirname, '../..');

const actions = (failAt?: string) => {
  const events: string[] = [];
  const action = (name: string) => async () => {
    events.push(name);
    if (failAt === name) throw new Error(`${name}-injected`);
  };
  return {
    events,
    api: {
      prepare: action('prepare'),
      acquireLease: action('acquireLease'),
      acquireRecoveryLease: action('acquireRecoveryLease'),
      controlsForward: action('controlsForward'),
      trackForward: action('trackForward'),
      entityForward: action('entityForward'),
      functional: action('functional'),
      loadedCheckpoint: action('loadedCheckpoint'),
      releaseLease: action('releaseLease'),
      finalPost: action('finalPost'),
      postQa: action('postQa'),
      compensate: async (stage: string) => events.push(`compensate:${stage}`),
      recoveryCheckpoint: action('recoveryCheckpoint'),
      finalRecovery: action('finalRecovery'),
    },
  };
};

describe('R12R B09 composed active shuttle coordinator', () => {
  it('emits a read-only plan with exact block/entity/chunk boundaries', () => {
    const plan = composedPlan();
    expect(plan).toMatchObject({
      transactionId: TRANSACTION_ID,
      mode: 'PREPARE_ONLY_NO_RCON_CONNECTION',
      exactBlockTargetCount: 19,
      requiredTemporaryChunks: [{ x: 128, z: -47 }, { x: 129, z: -47 }],
      safetyBoundary: {
        defaultConnectsRcon: false,
        existingBlockWrapperModified: false,
        entityCompensationBeforeBlockRollback: true,
        broadEntityCleanupAllowed: false,
        tagOnlyEntityCleanupAllowed: false,
        noForceLoadRemoveAll: true,
      },
    });
    const output = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_r12r_b09_active_shuttle_release.mjs', '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8' }));
    expect(output.mode).toBe('PREPARE_ONLY_NO_RCON_CONNECTION');
    expect(output.planPayloadSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('orders exact entity compensation before track then controls', () => {
    expect(compensationStages({
      controlsAttempted: true, trackAttempted: true, entityCommitted: true,
    })).toEqual([
      'entity-exact-uuid-rollback', 'track-block-rollback', 'controls-block-rollback',
    ]);
  });

  it('entity-forward failure rolls track then controls after executor self-compensation', async () => {
    const scenario = actions('entityForward');
    const result = await runStateMachine(scenario.api);
    expect(result.status).toBe('COMPOSED_FAILED_COMPENSATED_AND_RECOVERY_VERIFIED');
    expect(scenario.events.filter((entry) => entry.startsWith('compensate:'))).toEqual([
      'compensate:track-block-rollback', 'compensate:controls-block-rollback',
    ]);
  });

  it('functional failure decommissions exact UUID before block inverse', async () => {
    const scenario = actions('functional');
    const result = await runStateMachine(scenario.api);
    expect(scenario.events.filter((entry) => entry.startsWith('compensate:'))).toEqual([
      'compensate:entity-exact-uuid-rollback',
      'compensate:track-block-rollback',
      'compensate:controls-block-rollback',
    ]);
    expect(result.leaseActive).toBe(false);
  });

  it('terminal checkpoint failure compensates while the original chunk lease is held', async () => {
    const scenario = actions('loadedCheckpoint');
    await runStateMachine(scenario.api);
    expect(scenario.events).not.toContain('acquireRecoveryLease');
    expect(scenario.events.indexOf('compensate:entity-exact-uuid-rollback'))
      .toBeLessThan(scenario.events.indexOf('releaseLease'));
  });

  it('final post failure reacquires chunks before entity-first compensation', async () => {
    const scenario = actions('finalPost');
    await runStateMachine(scenario.api);
    expect(scenario.events.indexOf('acquireRecoveryLease'))
      .toBeLessThan(scenario.events.indexOf('compensate:entity-exact-uuid-rollback'));
  });

  it('compensation failure records manual review, stops dependent inverse, and attempts lease release', async () => {
    const scenario = actions('functional');
    scenario.api.compensate = async (stage: string) => {
      scenario.events.push(`compensate:${stage}`);
      if (stage === 'entity-exact-uuid-rollback') throw new Error('exact rollback unavailable');
    };
    const result = await runStateMachine(scenario.api);
    expect(result.status).toBe('COMPOSED_COMPENSATION_INCOMPLETE_MANUAL_INTERVENTION_REQUIRED');
    expect(result.recoveryErrors).toContainEqual({
      stage: 'entity-exact-uuid-rollback', error: 'exact rollback unavailable',
    });
    expect(scenario.events).toContain('releaseLease');
    expect(scenario.events).not.toContain('compensate:track-block-rollback');
    expect(scenario.events).not.toContain('compensate:controls-block-rollback');
  });

  it('refuses wrong production confirmation and existing evidence output', () => {
    const wrong = spawnSync(process.execPath, [
      'scripts/run_combined_zones_r12r_b09_active_shuttle_release.mjs', '--execute',
      '--confirm-production', 'wrong',
    ], { cwd: ROOT, encoding: 'utf8' });
    expect(wrong.status).not.toBe(0);
    expect(wrong.stderr).toContain('--confirm-production must exactly equal transactionId');

    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'r12r-existing-'));
    const existing = spawnSync(process.execPath, [
      'scripts/run_combined_zones_r12r_b09_active_shuttle_release.mjs', '--execute',
      '--confirm-production', TRANSACTION_ID, '--out-dir', directory,
    ], { cwd: ROOT, encoding: 'utf8' });
    expect(existing.status).not.toBe(0);
    expect(existing.stderr).toContain('--out-dir already exists');
  });
});
