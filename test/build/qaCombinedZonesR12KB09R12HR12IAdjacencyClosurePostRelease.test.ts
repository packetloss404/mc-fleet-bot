import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const EVIDENCE = path.join(ROOT,
  'data/world-review/combined-zones-r12k-live-20260822T032114Z');
const REPORT = path.join(EVIDENCE, 'r12k-post-release-qa.json');
const MARKDOWN = path.join(EVIDENCE, 'r12k-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12k-post-qa-'));
const temporaryReport = path.join(temporaryDirectory, 'qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'qa.md');
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/qa_combined_zones_r12k_b09_r12h_r12i_adjacency_closure_post_release.mjs',
    '--out', temporaryReport, '--markdown', temporaryMarkdown,
    '--generated-at', '2026-08-22T03:30:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R12K independent post-release QA', () => {
  it('regenerates the canonical seal byte-for-byte', () => {
    expect(fs.readFileSync(temporaryReport)).toEqual(fs.readFileSync(REPORT));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(MARKDOWN));
  });

  it('verifies all seven exact operated states, support, and headroom', () => {
    expect(readJson(REPORT).exactPostState).toMatchObject({
      operatedCellCount: 7,
      targetCoordinateSetSha256: 'ddb53df35589e76f7fddfbba92dc76a13d682a99cbd87afe2131accf9ccf9849',
      ascendingWestCellCount: 5, eastWestCellCount: 2,
      supportPassCount: 7, headroomPassCount: 7,
    });
  });

  it('proves one exact unbranched 15-cell component', () => {
    expect(readJson(REPORT).exactPostState.resultingConnectedComponent).toEqual({
      cellCount: 15, componentCount: 1, endpointCount: 2,
      interiorCellCount: 13, branchCellCount: 0,
    });
  });

  it('preserves all prior rails, caps, and bounded B09 state', () => {
    expect(readJson(REPORT).preservation).toMatchObject({
      priorRailCount: 352, postRailCount: 359,
      lowerCapCellCount: 12, summitCapCellCount: 12,
      haloDeclaredDifferenceCount: 7, haloUndeclaredDifferenceCount: 0,
      b09DeclaredDifferenceCount: 7, b09UndeclaredDifferenceCount: 0,
      postRailCensus: {
        'minecraft:rail[shape=ascending_west,waterlogged=false]': 21,
        'minecraft:rail[shape=east_west,waterlogged=false]': 319,
        'minecraft:rail[shape=north_south,waterlogged=false]': 19,
      },
    });
  });

  it('binds exact Paper proof and completed identity', () => {
    expect(readJson(REPORT)).toMatchObject({
      qaPayloadSha256: '4f068e52dc9cbc320cdc513d3f2c0bc8f1a489bef06dc3e1c8eebc5bc4a3e283',
      runtimeProof: {
        proofPayloadSha256: '0b18785f201fb7533f8752fb9c3ad7bbaeff87ecab93e65beff9fd638cbe19f1',
        exactProductionPaperVersion: '1.21.11-69-main@94d0c97',
      },
      releaseIdentity: {
        completedReleaseIdentitySha256: 'c26cd8ddad126c9a15e92935d6b11ea9d8b258f09bddad42e7b5b05f412921d2',
      },
    });
  });

  it('verifies strict lifecycle, journal, and inverse', () => {
    expect(readJson(REPORT).lifecycle).toEqual({
      stageCount: 17, evidenceBindingCount: 17, journalEntryCount: 20,
      journalSha256: 'e09612b5bf1ce81b8be7ff26912beef9e0addafa62828eaf6ad993df78224ff5',
      rollbackGuardPassCount: 7,
    });
  });

  it('passes 18/18 without commissioning or QA mutation', () => {
    expect(readJson(REPORT)).toMatchObject({
      status: 'PASS_EXACT_SEVEN_CELL_ADJACENCY_CLOSURE_AND_FIFTEEN_CELL_TOPOLOGY_PRESERVED',
      summary: { passed: true, checkCount: 18, passCount: 18, failCount: 0 },
      disposition: {
        passiveRailAdjacencyClosureAsBuilt: true,
        resultingConnectedPassiveRailCellCount: 15,
        funicularCommissioned: false, passengerOrRescueRouteCommissioned: false,
        liveCallsPerformedByQa: false, worldMutationsPerformedByQa: false,
      },
    });
  });
});
