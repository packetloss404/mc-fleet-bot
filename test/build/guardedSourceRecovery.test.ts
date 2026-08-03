import { describe, expect, it } from 'vitest';

interface FailureEntry {
  line: number;
  box: number[];
  expected: string[];
  replacement: string;
  volume: number;
  matched: number;
  partialMask: boolean;
  passed: false;
  unexpectedCount: number;
  unexpectedComplete: true;
  unexpected: Array<{ point: number[]; actual: string }>;
}

function preflight(
  opsText: string,
  operationCount: number,
  failures: FailureEntry[],
) {
  return import('../../scripts/lib/guarded_source_recovery.mjs').then(
    ({ hashText }) => ({
      schemaVersion: 2,
      opsSha256: hashText(opsText),
      orderAwareProjection: true,
      failurePointsComplete: true,
      partialMasks: [],
      regions: 'synthetic/region',
      regionsSnapshot: {
        algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
        sha256: '1'.repeat(64),
        regionFileCount: 1,
        members: [{
          file: 'r.0.0.mca',
          bytes: 1,
          sha256: '2'.repeat(64),
        }],
      },
      operationCount,
      passed: operationCount - failures.length,
      failed: failures.length,
      failures,
    }),
  );
}

function failure(
  line: number,
  box: number[],
  expected: string,
  replacement: string,
  unexpected: Array<{ point: number[]; actual: string }>,
): FailureEntry {
  const volume = (
    (Math.abs(box[3] - box[0]) + 1)
    * (Math.abs(box[4] - box[1]) + 1)
    * (Math.abs(box[5] - box[2]) + 1)
  );
  return {
    line,
    box,
    expected: [expected],
    replacement,
    volume,
    matched: volume - unexpected.length,
    partialMask: false,
    passed: false,
    unexpectedCount: unexpected.length,
    unexpectedComplete: true,
    unexpected,
  };
}

describe('guarded source recovery', () => {
  it('emits only direct source drift and proves later multi-stage cascades', async () => {
    const { buildGuardedSourceRecovery } = await import(
      '../../scripts/lib/guarded_source_recovery.mjs'
    );
    const opsText = [
      '# source_snapshot_sha256: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'REPL 0 70 0 1 70 0 minecraft:grass_block[snowy=false] minecraft:air',
      'REPL 0 70 0 1 70 0 minecraft:air minecraft:stone',
      '',
    ].join('\n');
    const report = await preflight(opsText, 2, [
      failure(
        2,
        [0, 70, 0, 1, 70, 0],
        'minecraft:grass_block[snowy=false]',
        'minecraft:air',
        [{ point: [0, 70, 0], actual: 'minecraft:dirt' }],
      ),
      failure(
        3,
        [0, 70, 0, 1, 70, 0],
        'minecraft:air',
        'minecraft:stone',
        [
          { point: [0, 70, 0], actual: 'minecraft:dirt' },
          { point: [1, 70, 0], actual: 'minecraft:grass_block[snowy=false]' },
        ],
      ),
    ]);

    const result = buildGuardedSourceRecovery({ opsText, preflight: report });

    expect(result.operationLines).toEqual([
      'REPL 0 70 0 0 70 0 minecraft:dirt minecraft:grass_block[snowy=false]',
    ]);
    expect(result.recoveryCellCount).toBe(1);
    expect(result.provenFailurePointCount).toBe(2);
    expect(result.cascadeProofs.map(({ point }) => point)).toEqual([[1, 70, 0]]);
  });

  it('does not rewrite a raw source proven by earlier passed stages', async () => {
    const { buildGuardedSourceRecovery } = await import(
      '../../scripts/lib/guarded_source_recovery.mjs'
    );
    const opsText = [
      '# source_snapshot_sha256: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'REPL 0 70 0 0 70 0 minecraft:grass_block[snowy=false] minecraft:air',
      'REPL 0 70 0 1 70 0 minecraft:air minecraft:stone',
      'REPL 0 70 0 0 70 0 minecraft:stone minecraft:gold_block',
      '',
    ].join('\n');
    const report = await preflight(opsText, 3, [
      failure(
        3,
        [0, 70, 0, 1, 70, 0],
        'minecraft:air',
        'minecraft:stone',
        [{ point: [1, 70, 0], actual: 'minecraft:dirt' }],
      ),
      failure(
        4,
        [0, 70, 0, 0, 70, 0],
        'minecraft:stone',
        'minecraft:gold_block',
        [{ point: [0, 70, 0], actual: 'minecraft:air' }],
      ),
    ]);

    const result = buildGuardedSourceRecovery({ opsText, preflight: report });

    expect(result.operationLines).toEqual([
      'REPL 1 70 0 1 70 0 minecraft:dirt minecraft:air',
    ]);
    expect(result.cascadeProofs.map(({ point }) => point)).toEqual([[0, 70, 0]]);
  });

  it('fails closed when failure points were truncated', async () => {
    const { buildGuardedSourceRecovery } = await import(
      '../../scripts/lib/guarded_source_recovery.mjs'
    );
    const opsText = [
      '# source_snapshot_sha256: cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      'REPL 0 70 0 0 70 0 minecraft:air minecraft:stone',
      '',
    ].join('\n');
    const report = await preflight(opsText, 1, [
      {
        ...failure(
          2,
          [0, 70, 0, 0, 70, 0],
          'minecraft:air',
          'minecraft:stone',
          [{ point: [0, 70, 0], actual: 'minecraft:dirt' }],
        ),
        unexpectedCount: 2,
      },
    ]);
    expect(() => buildGuardedSourceRecovery({ opsText, preflight: report }))
      .toThrow(/incomplete or inconsistent target evidence/);
  });

  it('fails closed on ambiguous operation chains and block-entity recovery', async () => {
    const { buildGuardedSourceRecovery } = await import(
      '../../scripts/lib/guarded_source_recovery.mjs'
    );
    const brokenChain = [
      '# source_snapshot_sha256: dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      'REPL 0 70 0 0 70 0 minecraft:air minecraft:stone',
      'REPL 0 70 0 0 70 0 minecraft:dirt minecraft:gold_block',
      '',
    ].join('\n');
    const brokenReport = await preflight(brokenChain, 2, [
      failure(
        2,
        [0, 70, 0, 0, 70, 0],
        'minecraft:air',
        'minecraft:stone',
        [{ point: [0, 70, 0], actual: 'minecraft:short_grass' }],
      ),
    ]);
    expect(() => buildGuardedSourceRecovery({
      opsText: brokenChain,
      preflight: brokenReport,
    })).toThrow(/ambiguous\/non-contiguous canonical chain/);

    const blockEntity = [
      '# source_snapshot_sha256: eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      'REPL 0 70 0 0 70 0 minecraft:barrel[facing=north,open=false] minecraft:air',
      '',
    ].join('\n');
    const blockEntityReport = await preflight(blockEntity, 1, [
      failure(
        2,
        [0, 70, 0, 0, 70, 0],
        'minecraft:barrel[facing=north,open=false]',
        'minecraft:air',
        [{ point: [0, 70, 0], actual: 'minecraft:air' }],
      ),
    ]);
    expect(() => buildGuardedSourceRecovery({
      opsText: blockEntity,
      preflight: blockEntityReport,
    })).toThrow(/block-entity NBT/);
  });

  it('binds the report to the exact canonical operation bytes', async () => {
    const { buildGuardedSourceRecovery } = await import(
      '../../scripts/lib/guarded_source_recovery.mjs'
    );
    const opsText = [
      '# source_snapshot_sha256: ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      'REPL 0 70 0 0 70 0 minecraft:air minecraft:stone',
      '',
    ].join('\n');
    const report = await preflight(opsText, 1, [
      failure(
        2,
        [0, 70, 0, 0, 70, 0],
        'minecraft:air',
        'minecraft:stone',
        [{ point: [0, 70, 0], actual: 'minecraft:dirt' }],
      ),
    ]);
    report.opsSha256 = '0'.repeat(64);
    expect(() => buildGuardedSourceRecovery({ opsText, preflight: report }))
      .toThrow(/does not match canonical/);
  });
});
