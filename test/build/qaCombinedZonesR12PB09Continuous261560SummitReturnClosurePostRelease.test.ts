import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r12p-live-20260822T043204Z');
const REPORT = path.join(EVIDENCE, 'r12p-post-release-qa.json');
const MARKDOWN = path.join(EVIDENCE, 'r12p-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12p-post-qa-'));
const temporaryReport = path.join(temporaryDirectory, 'qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'qa.md');
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/qa_combined_zones_r12k_b09_r12h_r12i_adjacency_closure_post_release.mjs',
    '--profile', 'r12p', '--out', temporaryReport, '--markdown', temporaryMarkdown,
    '--generated-at', '2026-08-22T04:38:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R12P independent post-release QA', () => {
  it('regenerates the canonical seal byte-for-byte', () => {
    expect(fs.readFileSync(temporaryReport)).toEqual(fs.readFileSync(REPORT));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(MARKDOWN));
  });

  it('verifies all 61 summit-return states, supports, and headroom cells', () => {
    expect(readJson(REPORT).exactPostState).toMatchObject({ operatedCellCount: 61,
      targetCoordinateSetSha256: 'ade4597321fc40ebba2313b282b240c19fdabfeae5cc86f6887cf3ce5392b603',
      ascendingWestCellCount: 0, eastWestCellCount: 0,
      ascendingNorthCellCount: 58, northSouthCellCount: 2, northEastTurnCellCount: 1,
      supportPassCount: 61, headroomPassCount: 61 });
  });

  it('proves the full unbranched continuous 261..560 topology', () => {
    expect(readJson(REPORT).exactPostState.resultingConnectedComponent).toEqual({
      cellCount: 300, componentCount: 1, endpointCount: 2,
      interiorCellCount: 298, branchCellCount: 0,
    });
  });

  it('preserves 489 prior rails, both caps, and exact bounded diff', () => {
    expect(readJson(REPORT).preservation).toMatchObject({
      priorRailCount: 489, postRailCount: 550,
      lowerCapCellCount: 12, summitCapCellCount: 12,
      haloDeclaredDifferenceCount: 61, haloUndeclaredDifferenceCount: 0,
      b09DeclaredDifferenceCount: 61, b09UndeclaredDifferenceCount: 0,
      postRailCensus: {
        'minecraft:rail[shape=ascending_west,waterlogged=false]': 116,
        'minecraft:rail[shape=east_west,waterlogged=false]': 354,
        'minecraft:rail[shape=north_south,waterlogged=false]': 21,
        'minecraft:rail[shape=ascending_north,waterlogged=false]': 58,
        'minecraft:rail[shape=north_east,waterlogged=false]': 1,
      },
    });
  });

  it('binds exact release identity, journal, and inverse', () => {
    expect(readJson(REPORT)).toMatchObject({
      qaPayloadSha256: '175015618e055cf3429c120d03c6fa6d8095d1ec90ab44cbae1dea008d412e08',
      releaseIdentity: { completedReleaseIdentitySha256:
        'dd8ab0fd4cf218281125c233c59e602d2d10c4c9573ca298220ac8efa27c3f64' },
      lifecycle: { stageCount: 17, evidenceBindingCount: 17, journalEntryCount: 128,
        rollbackGuardPassCount: 61 },
    });
  });

  it('passes 18/18 while keeping active transport closed', () => {
    expect(readJson(REPORT)).toMatchObject({
      status:
        'PASS_EXACT_SIXTY_ONE_CELL_SUMMIT_RETURN_CLOSURE_AND_CONTINUOUS_261_560_TOPOLOGY_PRESERVED',
      summary: { passed: true, checkCount: 18, passCount: 18, failCount: 0 },
      disposition: { resultingConnectedPassiveRailCellCount: 300, turnRailInstalled: true,
        activeSystemInstalled: false, funicularCommissioned: false,
        passengerOrRescueRouteCommissioned: false,
        liveCallsPerformedByQa: false, worldMutationsPerformedByQa: false },
    });
  });
});
