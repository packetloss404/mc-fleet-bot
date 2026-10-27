import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const EVIDENCE = path.join(ROOT, 'data/world-review/c01-service-widen-live-20260825T011600Z');
const BUILDOPS = path.join(ROOT, 'data/buildops');
const BASENAME = 'c01-service-corridor-widening';

describe('C01 service corridor widening', () => {
  it('records the executed and verified evidence ledger', () => {
    const ledger = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'evidence-ledger.json'), 'utf8')) as {
      status: string;
      stages: Array<{ stage: string; status: string }>;
    };
    expect(ledger.status).toBe('EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE');
    expect(ledger.stages.filter((s) => s.status !== 'PASS')).toHaveLength(0);
  });

  it('compiled 4 targets (pass 2) with exact inverse', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.release-manifest.json`), 'utf8')) as {
      target: { operatedUnion: { cellCount: number } };
      operations: Record<string, { forwardCommandCount: number; rollbackCommandCount: number; exactInverse: boolean }>;
    };
    expect(manifest.target.operatedUnion.cellCount).toBe(4);
    for (const op of Object.values(manifest.operations)) {
      expect(op.forwardCommandCount).toBe(4);
      expect(op.rollbackCommandCount).toBe(4);
      expect(op.exactInverse).toBe(true);
    }
  });

  it('both execution passes completed with zero failures', () => {
    for (const file of ['corridor-widen.forward-execution.json', 'corridor-widen-2.forward-execution.json']) {
      const exec = JSON.parse(fs.readFileSync(path.join(EVIDENCE, file), 'utf8')) as {
        status: string;
        failedGroups: number;
        noopCommands: number;
        successfulCommands: number;
      };
      expect(exec.status).toBe('complete');
      expect(exec.failedGroups).toBe(0);
      expect(exec.noopCommands).toBe(0);
      expect(exec.successfulCommands).toBe(4);
    }
  });
});
