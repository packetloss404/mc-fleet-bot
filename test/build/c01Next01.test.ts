import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const EVIDENCE = path.join(ROOT, 'data/world-review/c01-next-live-20260825T090000Z');
const BUILDOPS = path.join(ROOT, 'data/buildops');
const BASENAME = 'c01-next-01-arrival-landing-wayfinding';

describe('C01-NEXT-01 C01 portal-to-L1 arrival-corridor wayfinding cadence', () => {
  it('records the executed and verified evidence ledger', () => {
    const ledger = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'evidence-ledger.json'), 'utf8')) as {
      status: string;
      stages: Array<{ stage: string; status: string }>;
    };
    expect(ledger.status).toBe('EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE');
    expect(ledger.stages.filter((s) => s.status !== 'PASS')).toHaveLength(0);
  });

  it('compiled 9 targets with exact inverse', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.release-manifest.json`), 'utf8')) as {
      target: { operatedUnion: { cellCount: number } };
      operations: Record<string, { forwardCommandCount: number; rollbackCommandCount: number; exactInverse: boolean }>;
    };
    expect(manifest.target.operatedUnion.cellCount).toBe(9);
    for (const op of Object.values(manifest.operations)) {
      expect(op.forwardCommandCount).toBe(9);
      expect(op.rollbackCommandCount).toBe(9);
      expect(op.exactInverse).toBe(true);
    }
  });

  it('forward execution completed with zero failures', () => {
    const exec = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'cadence.forward-execution.json'), 'utf8')) as {
      status: string;
      failedGroups: number;
      noopCommands: number;
      successfulCommands: number;
    };
    expect(exec.status).toBe('complete');
    expect(exec.failedGroups).toBe(0);
    expect(exec.noopCommands).toBe(0);
    expect(exec.successfulCommands).toBe(9);
  });

  it('post-release QA reports PASS_ACCEPTED with exact post state', () => {
    const qa = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'c01-next-post-release-qa.json'), 'utf8')) as {
      status: string;
      operatedTargetsAllPostStateExact: boolean;
      forwardSourceGuardsExact: boolean;
      rollbackExactInverse: boolean;
      preservedCorridorFloorCellCount: number;
      haloUnexpectedDriftCount: number;
    };
    expect(qa.status).toBe('PASS_ACCEPTED');
    expect(qa.operatedTargetsAllPostStateExact).toBe(true);
    expect(qa.forwardSourceGuardsExact).toBe(true);
    expect(qa.rollbackExactInverse).toBe(true);
    expect(qa.preservedCorridorFloorCellCount).toBe(92);
    expect(qa.haloUnexpectedDriftCount).toBe(0);
  });

  it('the release note documents the built package', () => {
    const note = fs.readFileSync(path.join(ROOT, 'docs/masterplans/05-combined-zones/C01-NEXT-01-RELEASE.md'), 'utf8');
    expect(note).toMatch(/C01-NEXT-01/);
    expect(note).toMatch(/EXECUTED, POST-VERIFIED, REVERSIBLE/);
  });
});
