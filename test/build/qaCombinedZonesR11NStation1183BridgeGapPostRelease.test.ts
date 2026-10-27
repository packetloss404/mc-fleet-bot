import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r11n-c1-station-1183-bridge-gap';
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r11n-live-20260824T053200Z');

type PostQa = {
  status: string;
  release: { manifestIdentity: string; targetCount: number };
  checks: {
    exactPostStateCount: number;
    exactPostStateMismatchCount: number;
    surfaceCellCount: number;
    combinedSurfaceCellCount: number;
    combinedSurfaceComponentCount: number;
    maximumSurfaceStep: number;
    interactionHaloCellCount: number;
    haloFluidCount: number;
    offTargetDriftCount: number;
  };
};

describe('CZ-R11N C1 station-1183 bridge-gap post release', () => {
  it('reports the accepted post-release QA status', () => {
    const qa = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'r11n-post-release-qa.json'), 'utf8')) as PostQa;
    expect(qa.status).toBe('PASS_R11N_C1_STATION_1183_BRIDGE_GAP_POSTSTATE_VERIFIED_REVERSIBLE');
    expect(qa.release.targetCount).toBe(54);
    expect(qa.checks.exactPostStateCount).toBe(54);
    expect(qa.checks.exactPostStateMismatchCount).toBe(0);
    expect(qa.checks.combinedSurfaceComponentCount).toBe(1);
    expect(qa.checks.maximumSurfaceStep).toBe(1);
    expect(qa.checks.haloFluidCount).toBe(0);
    expect(qa.checks.offTargetDriftCount).toBe(0);
  });

  it('verifies both execution reports completed with zero failures', () => {
    for (const key of ['support-framework', 'deck-structure']) {
      const report = JSON.parse(
        fs.readFileSync(path.join(EVIDENCE, `${key}.forward-execution.json`), 'utf8'),
      ) as { status: string; failedGroups: number; noopCommands: number; successfulCommands: number };
      expect(report.status).toBe('complete');
      expect(report.failedGroups).toBe(0);
      expect(report.noopCommands).toBe(0);
    }
  });

  it('records the immutable post snapshot', () => {
    const postDir = path.join(ROOT, 'data/worldsnap-combined-zones-r11n-post-20260824T053200Z/region');
    const files = fs.readdirSync(postDir).filter((name) => name.endsWith('.mca'));
    expect(files.length).toBeGreaterThanOrEqual(2);
    expect(files).toContain('r.2.-1.mca');
  });
});
