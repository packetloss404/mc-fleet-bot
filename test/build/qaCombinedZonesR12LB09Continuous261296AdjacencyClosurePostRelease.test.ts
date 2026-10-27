import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r12l-live-20260822T034902Z');
const REPORT = path.join(EVIDENCE, 'r12l-post-release-qa.json');
const MARKDOWN = path.join(EVIDENCE, 'r12l-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12l-post-qa-'));
const temporaryReport = path.join(temporaryDirectory, 'qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'qa.md');
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/qa_combined_zones_r12k_b09_r12h_r12i_adjacency_closure_post_release.mjs',
    '--profile', 'r12l', '--out', temporaryReport, '--markdown', temporaryMarkdown,
    '--generated-at', '2026-08-22T03:55:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R12L independent post-release QA', () => {
  it('regenerates the canonical seal byte-for-byte', () => {
    expect(fs.readFileSync(temporaryReport)).toEqual(fs.readFileSync(REPORT));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(MARKDOWN));
  });

  it('verifies seven exact states, supports, and headroom', () => {
    expect(readJson(REPORT).exactPostState).toMatchObject({ operatedCellCount: 7,
      targetCoordinateSetSha256: '7093da416a6d7dcb650b093ac4c1a8ea8d41d7c904c12be30f4d028a2a52d25d',
      ascendingWestCellCount: 5, eastWestCellCount: 2,
      supportPassCount: 7, headroomPassCount: 7 });
  });

  it('proves the full continuous 261..296 topology', () => {
    expect(readJson(REPORT).exactPostState.resultingConnectedComponent).toEqual({
      cellCount: 36, componentCount: 1, endpointCount: 2,
      interiorCellCount: 34, branchCellCount: 0,
    });
  });

  it('preserves prior rails, caps, and exact bounded diff', () => {
    expect(readJson(REPORT).preservation).toMatchObject({
      priorRailCount: 359, postRailCount: 366,
      lowerCapCellCount: 12, summitCapCellCount: 12,
      haloDeclaredDifferenceCount: 7, haloUndeclaredDifferenceCount: 0,
      b09DeclaredDifferenceCount: 7, b09UndeclaredDifferenceCount: 0,
      postRailCensus: {
        'minecraft:rail[shape=ascending_west,waterlogged=false]': 26,
        'minecraft:rail[shape=east_west,waterlogged=false]': 321,
        'minecraft:rail[shape=north_south,waterlogged=false]': 19,
      },
    });
  });

  it('binds release identity, lifecycle, journal, and inverse', () => {
    expect(readJson(REPORT)).toMatchObject({
      qaPayloadSha256: 'f05d4dde795f7261fcccb7f72ebf2db7129c1574dddf1c9bf3b6f6350c382e68',
      releaseIdentity: { completedReleaseIdentitySha256:
        'efd7eb2c8b89d36a6debccf4025eb1a3ddede922490b0243a7063be8da94aea1' },
      lifecycle: { stageCount: 17, evidenceBindingCount: 17, journalEntryCount: 20,
        rollbackGuardPassCount: 7 },
    });
  });

  it('passes 18/18 without commissioning or QA mutation', () => {
    expect(readJson(REPORT)).toMatchObject({
      status: 'PASS_EXACT_SEVEN_CELL_ADJACENCY_CLOSURE_AND_CONTINUOUS_261_296_TOPOLOGY_PRESERVED',
      summary: { passed: true, checkCount: 18, passCount: 18, failCount: 0 },
      disposition: { resultingConnectedPassiveRailCellCount: 36,
        activeSystemInstalled: false, funicularCommissioned: false,
        passengerOrRescueRouteCommissioned: false,
        liveCallsPerformedByQa: false, worldMutationsPerformedByQa: false },
    });
  });
});
