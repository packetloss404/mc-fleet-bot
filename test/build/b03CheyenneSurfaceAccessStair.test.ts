import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const EVIDENCE = path.join(ROOT, 'data/world-review/b03-access-live-20260825T003100Z');
const BUILDOPS = path.join(ROOT, 'data/buildops');
const BASENAME = 'b03-cheyenne-surface-access-stair';

describe('BKR-B03-ACCESS-01 Cheyenne surface access stair', () => {
  it('records the executed and verified evidence ledger', () => {
    const ledger = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'evidence-ledger.json'), 'utf8')) as {
      status: string;
      stages: Array<{ stage: string; status: string }>;
    };
    expect(ledger.status).toBe('EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE');
    expect(ledger.stages.filter((s) => s.status !== 'PASS')).toHaveLength(0);
  });

  it('compiled 78 targets with exact inverse', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.release-manifest.json`), 'utf8')) as {
      target: { operatedUnion: { cellCount: number } };
      operations: Record<string, { forwardCommandCount: number; rollbackCommandCount: number; exactInverse: boolean }>;
    };
    expect(manifest.target.operatedUnion.cellCount).toBe(78);
    for (const op of Object.values(manifest.operations)) {
      expect(op.forwardCommandCount).toBe(78);
      expect(op.rollbackCommandCount).toBe(78);
      expect(op.exactInverse).toBe(true);
    }
  });

  it('forward execution completed with zero failures', () => {
    const exec = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'access-stair.forward-execution.json'), 'utf8')) as {
      status: string;
      failedGroups: number;
      noopCommands: number;
      successfulCommands: number;
    };
    expect(exec.status).toBe('complete');
    expect(exec.failedGroups).toBe(0);
    expect(exec.noopCommands).toBe(0);
    expect(exec.successfulCommands).toBe(78);
  });
});
