import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-ice-edge-screen-'));
let report: any;

describe('MP05 B07 ice-edge next-continuation hard-stop screen', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/survey_mp05_b07_ice_edge_next_continuation_01.mjs',
      '--out-dir', OUT,
      '--markdown-out', path.join(OUT, 'screen.md'),
      '--generated-at', '2026-08-27T01:10:00.000Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    report = JSON.parse(fs.readFileSync(path.join(OUT, 'ice-edge-next-continuation-screen.json'), 'utf8'));
  });

  afterAll(() => fs.rmSync(OUT, { recursive: true, force: true }));

  it('binds the executed immutable post snapshot and emits no release authority', () => {
    expect(report.status).toBe('SOURCE_BOUND_NO_NEXT_B07_ICE_EDGE_CONTINUATION_OPERATION');
    expect(report.source.postSnapshot.root).toBe('data/worldsnap-mp05-b07-ice-edge-contained-receiver-post-20260827T004000Z');
    expect(report.safetyBoundary).toMatchObject({
      readOnly: true,
      liveCallsPerformed: false,
      worldMutationsPerformed: false,
      forwardOperationFilesEmitted: 0,
      rollbackOperationFilesEmitted: 0,
      executionAuthorityEmitted: false,
    });
  });

  it('proves the sealed bulkhead and retained water make northward access a new fluid-containment scope', () => {
    expect(report.existingFunctionalEndpoint.usableAsRestrictedInspectionEndpoint).toBe(true);
    expect(report.continuationBoundary.sealedBulkhead.cellCount).toBe(20);
    expect(report.continuationBoundary.normalThreeWideTwoHighApertureRequiredToContinueNorth).toMatchObject({ cellCount: 6, allSealedBulkhead: true });
    expect(report.continuationBoundary.immediateNorthFloor.containsFluid).toBe(true);
    expect(report.continuationBoundary.retainedSourcesExact).toBe(true);
    expect(report.continuationBoundary.retainedWaterSources.map((source: any) => source.state)).toEqual([
      'minecraft:water[level=0]', 'minecraft:water[level=0]', 'minecraft:water[level=0]', 'minecraft:water[level=0]',
    ]);
  });
});
