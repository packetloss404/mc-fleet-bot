import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('citizen route staging failure diagnosis', () => {
  it('reproduces the exact leaf-corner failure and one-cell projection offline', () => {
    const result = spawnSync(
      process.execPath,
      ['scripts/diagnose_citizen_route_staging_failure.mjs'],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 10_000,
      },
    );
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);

    expect(report.status).toBe('PASS_READ_ONLY_REPRODUCTION');
    expect(report.sourceBoundary).toEqual({
      liveWorldRead: false,
      liveWorldMutated: false,
      networkAccess: false,
      serviceRestarted: false,
      botStarted: false,
      filesWritten: false,
    });
    expect(report.snapshot.sha256).toBe(
      '7a6ae13857d598457491b970c4ece8fa29f3afbdc4d47aad6f076c7a69264f48',
    );
    expect(report.start).toEqual([-79, 68, -33]);
    expect(report.source.status).toBe('success');
    expect(report.source.path[0]).toMatchObject({
      point: [-80, 68, -32],
      toBreak: [],
      toPlaceCount: 0,
    });
    expect(report.blockingCorner).toEqual({
      point: [-79, 69, -32],
      state: 'minecraft:oak_leaves[distance=3,persistent=false,waterlogged=false]',
    });
    expect(report.blockStates.clearOrthogonalHead).toBe('minecraft:air');
    expect(report.projection.inMemoryOnly).toBe(true);
    expect(report.projection.result.status).toBe('success');
    expect(report.projection.result.path[0]).toMatchObject({
      point: [-79, 68, -32],
      toBreak: [],
      toPlaceCount: 0,
    });
    expect(
      report.projection.result.path.every(
        (node: { toBreak: unknown[]; toPlaceCount: number }) => (
          node.toBreak.length === 0 && node.toPlaceCount === 0
        ),
      ),
    ).toBe(true);
  });

  it('keeps the forward proposal and rollback exact one-cell inverses', () => {
    const forward = fs.readFileSync(
      path.join(
        root,
        'data/buildops/citizen-route-live-walk-leaf-clearance-repair-2026-07-28.txt',
      ),
      'utf8',
    );
    const rollback = fs.readFileSync(
      path.join(
        root,
        'data/buildops/citizen-route-live-walk-leaf-clearance-repair-2026-07-28.rollback.txt',
      ),
      'utf8',
    );

    expect(forward).toContain(
      'REPL -79 69 -32 -79 69 -32 '
      + 'minecraft:oak_leaves[distance=3,persistent=false,waterlogged=false] '
      + 'minecraft:air',
    );
    expect(rollback).toContain(
      'REPL -79 69 -32 -79 69 -32 minecraft:air '
      + 'minecraft:oak_leaves[distance=3,persistent=false,waterlogged=false]',
    );
  });

  it('preserves a passing exact-source preflight without claiming activation', () => {
    const preflight = JSON.parse(fs.readFileSync(
      path.join(
        root,
        'data/world-review/citizen-route-live-walk-leaf-clearance-repair-preflight-20260728.json',
      ),
      'utf8',
    ));
    const diagnosis = JSON.parse(fs.readFileSync(
      path.join(
        root,
        'data/world-review/citizen-route-live-walk-staging-diagnosis-20260728.json',
      ),
      'utf8',
    ));

    expect(preflight.status).toBe('PASS');
    expect(preflight.operationCount).toBe(1);
    expect(preflight.passed).toBe(1);
    expect(preflight.failed).toBe(0);
    expect(preflight.bounds).toEqual([-79, 69, -32, -79, 69, -32]);
    expect(preflight.regionsSnapshot.sha256).toBe(
      '7a6ae13857d598457491b970c4ece8fa29f3afbdc4d47aad6f076c7a69264f48',
    );
    expect(diagnosis.proposal.status).toBe('PROPOSED_NOT_APPLIED');
    expect(diagnosis.acceptance.citizenActivationGate).toBe('FAIL');
  });
});
