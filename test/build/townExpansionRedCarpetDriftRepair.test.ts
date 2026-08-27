import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'town-expansion-r1-red-carpet-drift-repair';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const EVIDENCE = path.join(ROOT, 'data/world-review/town-expansion-redcarpet-live-20260824T220500Z');

describe('TE-R1 red-carpet drift repair', () => {
  it('records the executed and verified evidence ledger', () => {
    const ledger = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'evidence-ledger.json'), 'utf8')) as {
      status: string;
      stages: Array<{ stage: string; status: string }>;
    };
    expect(ledger.status).toBe('EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE');
    const failed = ledger.stages.filter((s) => s.status !== 'PASS');
    expect(failed).toHaveLength(0);
  });

  it('compiled exactly 40 targets with exact inverse', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.release-manifest.json`), 'utf8')) as {
      target: { operatedUnion: { cellCount: number } };
      operations: Record<string, { forwardCommandCount: number; rollbackCommandCount: number; exactInverse: boolean }>;
    };
    expect(manifest.target.operatedUnion.cellCount).toBe(40);
    for (const op of Object.values(manifest.operations)) {
      expect(op.forwardCommandCount).toBe(40);
      expect(op.rollbackCommandCount).toBe(40);
      expect(op.exactInverse).toBe(true);
    }
  });

  it('forward execution completed with zero failures', () => {
    const exec = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'red-carpet-repair.forward-execution.json'), 'utf8')) as {
      status: string;
      failedGroups: number;
      noopCommands: number;
      successfulCommands: number;
    };
    expect(exec.status).toBe('complete');
    expect(exec.failedGroups).toBe(0);
    expect(exec.noopCommands).toBe(0);
    expect(exec.successfulCommands).toBe(40);
  });
});
