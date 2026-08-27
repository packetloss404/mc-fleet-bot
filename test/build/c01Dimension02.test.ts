import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const HOLD = path.join(
  ROOT,
  'data/world-review/c01-dimension-02-live-20260824T201429Z/c01-dimension-02-hold.json',
);

type HoldReport = {
  schemaVersion: number;
  status: string;
  worldMutationPerformed: boolean;
  segments: Record<string, { verdict: string }>;
  whyNotBuildable: string[];
  widenableForFuturePackage: Array<{ area: string; candidates: Array<{ cell: number[] }> }>;
};

describe('BKR-C01-DIMENSION-02 C01 vertical widening hold', () => {
  const report = JSON.parse(fs.readFileSync(HOLD, 'utf8')) as HoldReport;

  it('is a read-only hold with no world mutation', () => {
    expect(report.schemaVersion).toBe(1);
    expect(report.status).toBe('HOLD_NO_CONFLICT_FREE_WIDENING_SEGMENT');
    expect(report.worldMutationPerformed).toBe(false);
  });

  it('finds NO conflict-free widening segment in any C01 segment', () => {
    expect(report.segments.publicC01.verdict).toBe('NO_CONFLICT_FREE_SEGMENT');
    expect(report.segments.ownerC01.verdict).toBe('NO_CONFLICT_FREE_SEGMENT');
    expect(report.segments.serviceC01.verdict).toBe('NO_CONFLICT_FREE_SEGMENT');
  });

  it('documents why the widening is unsafe in every segment', () => {
    expect(report.whyNotBuildable.length).toBeGreaterThanOrEqual(4);
    const text = JSON.stringify(report.whyNotBuildable);
    expect(text).toMatch(/barrel-bounded|barrels/);
    expect(text).toMatch(/decorated|structural/);
    expect(text).toMatch(/hard-safety kernel|block-entity/);
  });

  it('records the service corridor barrel containers flanking the 1-wide pinches', () => {
    const service = report.segments.serviceC01 as {
      findings: Array<{
        blockedCells: Array<{ cell: number[]; reason: string }>;
        blockEntityCountInSegment?: number;
      }>;
    };
    const barrels = service.findings
      .flatMap((f) => f.blockedCells)
      .filter((c) => c.reason.includes('container'));
    expect(barrels.length).toBeGreaterThanOrEqual(6);
    const counted = service.findings.find((f) => f.blockEntityCountInSegment !== undefined);
    expect(counted?.blockEntityCountInSegment).toBe(69);
  });

  it('records the structural/decorated flanks of the public stairwell', () => {
    const publicSeg = report.segments.publicC01 as {
      findings: Array<{ blockedCells: Array<{ cell: number[]; reason: string }> }>;
    };
    const structural = publicSeg.findings
      .flatMap((f) => f.blockedCells)
      .filter((c) => c.reason.includes('structural') || c.reason.includes('decorative'));
    expect(structural.length).toBeGreaterThanOrEqual(3);
  });
});
