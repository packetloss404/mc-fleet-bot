import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const EVIDENCE = path.join(ROOT,
  'data/world-review/combined-zones-r12j-live-20260822T025647Z');
const REPORT = path.join(EVIDENCE, 'r12j-post-release-qa.json');
const MARKDOWN = path.join(EVIDENCE, 'r12j-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12j-post-qa-'));
const temporaryReport = path.join(temporaryDirectory, 'qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'qa.md');
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/qa_combined_zones_r12j_b09_r12f_r12g_adjacency_closure_post_release.mjs',
    '--out', temporaryReport, '--markdown', temporaryMarkdown,
    '--generated-at', '2026-08-22T03:04:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R12J independent post-release QA', () => {
  it('regenerates the canonical seal byte-for-byte', () => {
    expect(fs.readFileSync(temporaryReport)).toEqual(fs.readFileSync(REPORT));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(MARKDOWN));
  });

  it('verifies all seven exact operated states, support, and headroom', () => {
    expect(readJson(REPORT).exactPostState).toMatchObject({
      operatedCellCount: 7,
      targetCoordinateSetSha256: 'c5d0c02ec59bcabe84377138635250c16b175b135a04c80a2624a6db28fcb366',
      ascendingWestCellCount: 5, eastWestCellCount: 2,
      supportPassCount: 7, headroomPassCount: 7,
    });
  });

  it('proves the resulting connected unbranched 14-cell component', () => {
    expect(readJson(REPORT).exactPostState.resultingConnectedComponent).toEqual({
      cellCount: 14, componentCount: 1, endpointCount: 2,
      interiorCellCount: 12, branchCellCount: 0,
    });
  });

  it('preserves all prior rails, caps, and bounded B09 state', () => {
    expect(readJson(REPORT).preservation).toMatchObject({
      priorRailCount: 345, lowerCapCellCount: 12, summitCapCellCount: 12,
      haloDeclaredDifferenceCount: 7, haloUndeclaredDifferenceCount: 0,
      b09DeclaredDifferenceCount: 7, b09UndeclaredDifferenceCount: 0,
      postRailCensus: {
        'minecraft:rail[shape=ascending_west,waterlogged=false]': 16,
        'minecraft:rail[shape=east_west,waterlogged=false]': 317,
        'minecraft:rail[shape=north_south,waterlogged=false]': 19,
      },
    });
  });

  it('binds the exact Paper proof and completed release identity', () => {
    expect(readJson(REPORT)).toMatchObject({
      qaPayloadSha256: 'c4ae5ead1b20ac18fcb4720f3706f522ca98baaa434c7bcf202088fe898981b1',
      runtimeProof: {
        proofPayloadSha256: '151ad3cf31b24aa15ecc07f7ca7d61f812316b034d34c479ea166de510229c4d',
        exactProductionPaperVersion: '1.21.11-69-main@94d0c97',
      },
      releaseIdentity: {
        completedReleaseIdentitySha256: '9aae3a36cd327825e85604cf7adfecb92d24ec9ef35db96ef36e048e75fd4c36',
      },
    });
  });

  it('verifies strict lifecycle, journal, and exact inverse', () => {
    expect(readJson(REPORT).lifecycle).toEqual({
      stageCount: 17, evidenceBindingCount: 17, journalEntryCount: 20,
      journalSha256: '5f0160bc03837735128fde08c42d7b7e1fd2d74c8555fbb132ef9d3dab47f7fc',
      rollbackGuardPassCount: 7,
    });
  });

  it('passes every check without commissioning or QA mutation', () => {
    expect(readJson(REPORT)).toMatchObject({
      status: 'PASS_EXACT_SEVEN_CELL_ADJACENCY_CLOSURE_AND_FOURTEEN_CELL_TOPOLOGY_PRESERVED',
      summary: { passed: true, checkCount: 19, passCount: 19, failCount: 0 },
      disposition: {
        passiveRailAdjacencyClosureAsBuilt: true,
        resultingConnectedPassiveRailCellCount: 14,
        funicularCommissioned: false, passengerOrRescueRouteCommissioned: false,
        liveCallsPerformedByQa: false, worldMutationsPerformedByQa: false,
      },
    });
  });
});
