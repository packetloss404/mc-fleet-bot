import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r12n-live-20260822T040651Z');
const REPORT = path.join(EVIDENCE, 'r12n-post-release-qa.json');
const MARKDOWN = path.join(EVIDENCE, 'r12n-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12n-post-qa-'));
const temporaryReport = path.join(temporaryDirectory, 'qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'qa.md');
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/qa_combined_zones_r12k_b09_r12h_r12i_adjacency_closure_post_release.mjs',
    '--profile', 'r12n', '--out', temporaryReport, '--markdown', temporaryMarkdown,
    '--generated-at', '2026-08-22T04:15:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R12N independent post-release QA', () => {
  it('regenerates the canonical seal byte-for-byte', () => {
    expect(fs.readFileSync(temporaryReport)).toEqual(fs.readFileSync(REPORT));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(MARKDOWN));
  });

  it('verifies all 123 exact states, supports, and headroom cells', () => {
    expect(readJson(REPORT).exactPostState).toMatchObject({ operatedCellCount: 123,
      targetCoordinateSetSha256: '25f09aebcb490dcf1815d172ff04417445aedb495386d7e1011694b33187fcdb',
      ascendingWestCellCount: 90, eastWestCellCount: 33,
      supportPassCount: 123, headroomPassCount: 123 });
  });

  it('proves the full unbranched continuous 261..499 topology', () => {
    expect(readJson(REPORT).exactPostState.resultingConnectedComponent).toEqual({
      cellCount: 239, componentCount: 1, endpointCount: 2,
      interiorCellCount: 237, branchCellCount: 0,
    });
  });

  it('preserves 366 prior rails, caps, and exact bounded diff', () => {
    expect(readJson(REPORT).preservation).toMatchObject({
      priorRailCount: 366, postRailCount: 489,
      lowerCapCellCount: 12, summitCapCellCount: 12,
      haloDeclaredDifferenceCount: 123, haloUndeclaredDifferenceCount: 0,
      b09DeclaredDifferenceCount: 123, b09UndeclaredDifferenceCount: 0,
      postRailCensus: {
        'minecraft:rail[shape=ascending_west,waterlogged=false]': 116,
        'minecraft:rail[shape=east_west,waterlogged=false]': 354,
        'minecraft:rail[shape=north_south,waterlogged=false]': 19,
      },
    });
  });

  it('binds exact identity, lifecycle, journal, and inverse', () => {
    expect(readJson(REPORT)).toMatchObject({
      qaPayloadSha256: '382e39b66da9c29f0cbf128f2b92dc2b81f3e248a4e79f6b825cb273d8d2f5e3',
      releaseIdentity: { completedReleaseIdentitySha256:
        '6b5752472621525ef576b6f5f3c28cfbc2872416afef02706757a18b6b61e982' },
      lifecycle: { stageCount: 17, evidenceBindingCount: 17, journalEntryCount: 252,
        rollbackGuardPassCount: 123 },
    });
  });

  it('passes 18/18 without commissioning or QA mutation', () => {
    expect(readJson(REPORT)).toMatchObject({
      status:
        'PASS_EXACT_ONE_HUNDRED_TWENTY_THREE_CELL_ADJACENCY_CLOSURE_AND_CONTINUOUS_261_499_TOPOLOGY_PRESERVED',
      summary: { passed: true, checkCount: 18, passCount: 18, failCount: 0 },
      disposition: { resultingConnectedPassiveRailCellCount: 239,
        activeSystemInstalled: false, funicularCommissioned: false,
        passengerOrRescueRouteCommissioned: false,
        liveCallsPerformedByQa: false, worldMutationsPerformedByQa: false },
    });
  });
});
