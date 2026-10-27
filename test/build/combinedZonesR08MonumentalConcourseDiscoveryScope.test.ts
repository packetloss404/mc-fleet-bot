import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, 'scripts/screen_combined_zones_r08_monumental_concourse_discovery_scope.mjs');

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

describe('Combined Zones R08 monumental-concourse/discovery exact scope screen', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r08-concourse-screen-'));
  const reportPath = path.join(temp, 'screen.json');
  const markdownPath = path.join(temp, 'screen.md');
  const output = execFileSync('node', [
    SCRIPT,
    '--generated-at', '2026-08-22T00:55:00Z',
    '--out', reportPath,
    '--md-out', markdownPath,
  ], { cwd: ROOT, encoding: 'utf8' });
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  it('binds the accepted R08AA immutable post and terminal release identity', () => {
    expect(report.source.snapshotRoot).toBe('data/worldsnap-combined-zones-r08aa-post-20260822T004356Z');
    expect(report.source.completeSaveSha256).toBe('d0c8278796140888a0801d6152f9fc6d352cc297d388cea5bdf8ce06e4a6d2e6');
    expect(report.source.completedReleaseIdentitySha256).toBe('04440c644876ffb9736cde25b90cfb9c3f34808970b588575b38f59f00271f63');
  });

  it('fails closed because the monumental concourse has no authored target cell set', () => {
    expect(report.status).toBe('BLOCKED_NO_EXACT_UNBUILT_ARCHITECTURAL_CELL_SET');
    expect(report.frozenArchitecturalFacts.perimeterMezzanineDesignY).toBe(48);
    expect(report.frozenArchitecturalFacts.monumentalConcourseFloorCellSet).toBeNull();
    expect(report.frozenArchitecturalFacts.monumentalColumnCellSet).toBeNull();
    expect(report.frozenArchitecturalFacts.monumentalPortalCellSet).toBeNull();
    expect(report.frozenArchitecturalFacts.wayfindingCellSet).toBeNull();
    expect(report.frozenArchitecturalFacts.exactConcourseTargetKeys).toEqual([]);
  });

  it('screens the next-largest exact platform geometry and excludes all prior-release cells', () => {
    const candidate = report.screenedCandidatesInOrder[1];
    expect(candidate.candidate).toBe('PLATFORM_SURFACE_WAYFINDING_OVERLAY');
    expect(candidate.exactGeometryCellCount).toBe(5_656);
    expect(candidate.priorReleaseOwnedCellCount).toBe(5_656);
    expect(candidate.independentlyExecutableCellCount).toBe(0);
    expect(candidate.platformRecords).toHaveLength(8);
    for (const platform of candidate.platformRecords) {
      expect(platform.sourceStateCensus).toEqual({
        'minecraft:polished_diorite': 404,
        'minecraft:polished_deepslate': 202,
        'minecraft:smooth_stone': 101,
      });
    }
  });

  it('excludes all 288 retail entrance cells as prior tenant scope or N06', () => {
    const candidate = report.screenedCandidatesInOrder[2];
    expect(candidate.exactGeometryCellCount).toBe(288);
    expect(candidate.priorReleaseOwnedCellCount).toBe(276);
    expect(candidate.n06AndTenantExcludedCellCount).toBe(12);
    expect(candidate.independentlyExecutableCellCount).toBe(0);
    const n06 = candidate.entranceRecords.find(({ shellId }: { shellId: string }) => shellId === 'EE-R-N06');
    expect(n06.sourceStateCensus).toEqual({ 'minecraft:air': 9, 'minecraft:stone': 3 });
  });

  it('proves the only exact discovery cue is already present and has no exact extension', () => {
    const candidate = report.screenedCandidatesInOrder[3];
    expect(candidate.planningEnvelopeCellCount).toBe(2_448);
    expect(candidate.planningEnvelopeIsTargetSet).toBe(false);
    expect(candidate.exactCueCellCount).toBe(5);
    expect(candidate.priorReleaseOwnedCellCount).toBe(5);
    expect(candidate.cueSourceStateCensus).toEqual({ 'minecraft:chiseled_stone_bricks': 5 });
  });

  it('emits no empty package and performs no live mutation', () => {
    expect(report.clearance.executableTargetCellCount).toBe(0);
    expect(report.artifactDisposition.compilerEmitted).toBe(false);
    expect(report.artifactDisposition.operationFilesEmitted).toBe(false);
    expect(report.artifactDisposition.releaseManifestEmitted).toBe(false);
    expect(report.artifactDisposition.wrapperPrintPlanRun).toBe(false);
    expect(report.artifactDisposition.liveCallsPerformed).toBe(false);
    expect(report.artifactDisposition.worldMutationPerformed).toBe(false);
    expect(output).toContain('"exactExecutableTargetCellCount": 0');
  });

  it('seals a deterministic identity and names the next concrete evidence task', () => {
    const { reportIdentitySha256, ...payload } = report;
    expect(reportIdentitySha256).toBe(sha256(JSON.stringify(payload)));
    expect(report.exactLocalBlocker.code).toBe('R08_CONCOURSE_ARCHITECTURAL_TARGET_SET_NOT_AUTHORED');
    expect(report.exactLocalBlocker.requiredNextEvidence).toHaveLength(4);
    expect(fs.readFileSync(markdownPath, 'utf8')).toContain('No operation or release manifest was emitted.');
  });
});
