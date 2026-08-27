import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r12q-live-20260822T044855Z');
const REPORT = path.join(EVIDENCE, 'r12q-post-release-qa.json');
const MARKDOWN = path.join(EVIDENCE, 'r12q-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12q-post-qa-'));
const temporaryReport = path.join(temporaryDirectory, 'qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'qa.md');
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/qa_combined_zones_r12k_b09_r12h_r12i_adjacency_closure_post_release.mjs',
    '--profile', 'r12q', '--out', temporaryReport, '--markdown', temporaryMarkdown,
    '--generated-at', '2026-08-22T04:55:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R12Q independent post-release QA', () => {
  it('regenerates the canonical seal byte-for-byte', () => {
    expect(fs.readFileSync(temporaryReport)).toEqual(fs.readFileSync(REPORT));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(MARKDOWN));
  });

  it('verifies both exact turns, supports, headroom, and four interfaces', () => {
    expect(readJson(REPORT).exactPostState).toMatchObject({ operatedCellCount: 2,
      targetCoordinateSetSha256: '021919255d63bd29c496a22493a9719131890f7c10b793c28ebdb7f1fc940984',
      northWestTurnCellCount: 1, southWestTurnCellCount: 1,
      preservedInterfaceCellCount: 4, supportPassCount: 2, headroomPassCount: 2 });
  });

  it('proves the full unbranched continuous 9..560 topology', () => {
    expect(readJson(REPORT).exactPostState.resultingConnectedComponent).toEqual({
      cellCount: 552, componentCount: 1, endpointCount: 2,
      interiorCellCount: 550, branchCellCount: 0,
    });
  });

  it('preserves 550 prior rails, both caps, and exact bounded diff', () => {
    expect(readJson(REPORT).preservation).toMatchObject({
      priorRailCount: 550, postRailCount: 552,
      lowerCapCellCount: 12, summitCapCellCount: 12,
      haloDeclaredDifferenceCount: 2, haloUndeclaredDifferenceCount: 0,
      b09DeclaredDifferenceCount: 2, b09UndeclaredDifferenceCount: 0,
      postRailCensus: {
        'minecraft:rail[shape=ascending_west,waterlogged=false]': 116,
        'minecraft:rail[shape=east_west,waterlogged=false]': 354,
        'minecraft:rail[shape=north_south,waterlogged=false]': 21,
        'minecraft:rail[shape=ascending_north,waterlogged=false]': 58,
        'minecraft:rail[shape=north_east,waterlogged=false]': 1,
        'minecraft:rail[shape=north_west,waterlogged=false]': 1,
        'minecraft:rail[shape=south_west,waterlogged=false]': 1,
      },
    });
  });

  it('binds exact release identity, journal, inverse, and entity evidence', () => {
    expect(readJson(REPORT)).toMatchObject({
      qaPayloadSha256: '79ac2593021bf1d24becb7c9001f837e30bf0062eb831b3e79af1d2d02423e11',
      releaseIdentity: { completedReleaseIdentitySha256:
        'ee059a2d4ac5f030a392ba275487dd2f0083ba7dd3e1379de8ac656e02a49c91' },
      lifecycle: { stageCount: 17, evidenceBindingCount: 17, journalEntryCount: 10,
        rollbackGuardPassCount: 2 },
      entityEvidence: { blockingBlockEntityCount: 0, blockingEntityHitCount: 0 },
    });
  });

  it('passes 20/20 while keeping active transport closed', () => {
    expect(readJson(REPORT)).toMatchObject({
      status: 'PASS_EXACT_TWO_CELL_LOWER_TURN_CLOSURE_AND_CONTINUOUS_9_560_TOPOLOGY_PRESERVED',
      summary: { passed: true, checkCount: 20, passCount: 20, failCount: 0 },
      disposition: { resultingConnectedPassiveRailCellCount: 552, turnRailInstalled: true,
        activeSystemInstalled: false, funicularCommissioned: false,
        passengerOrRescueRouteCommissioned: false,
        liveCallsPerformedByQa: false, worldMutationsPerformedByQa: false },
    });
  });
});
