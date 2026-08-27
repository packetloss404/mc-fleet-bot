import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SURVEY = path.join(ROOT, 'scripts/survey_mp06_full_road_design_03.mjs');
const CONTRACT = path.join(ROOT, 'scripts/generate_mp06_road_route_threshold_contract_01.mjs');
const SNAPSHOT = 'data/worldsnap-mp01-service-staging-anvil-repair-live-post-20260826T163300Z';
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp06-road-route-threshold-'));

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('MP06 existing road route threshold contract', () => {
  it('records the current 207-station route without inventing a paving release', () => {
    const surveyDir = path.join(temporaryDirectory, 'survey');
    const contractDir = path.join(temporaryDirectory, 'contract');
    execFileSync(process.execPath, [SURVEY, '--snapshot', SNAPSHOT, '--out', surveyDir], { cwd: ROOT, stdio: 'pipe' });
    execFileSync(process.execPath, [CONTRACT,
      '--survey', path.join(surveyDir, 'survey.json'),
      '--out-dir', contractDir,
      '--generated-at', '2026-08-26T18:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const contract = JSON.parse(fs.readFileSync(path.join(contractDir, 'mp06-road-route-threshold-contract.json'), 'utf8'));
    expect(contract).toMatchObject({
      id: 'MP06-ROAD-ROUTE-THRESHOLD-CONTRACT-01',
      status: 'SOURCE_BOUND_DEFAULT_DENY_THRESHOLD_CONTRACT_NOT_ACCEPTED',
      mutationAuthority: false,
      source: { snapshot: SNAPSHOT, immutableCopy: true, requiredMemberCount: 130 },
      observedExistingRoute: { routeFound: true, stationCount: 207, maximumAdjacentRise: 1 },
      acceptanceGate: { exactUniqueInterfaceStationCount: 102, ownerSegmentStationCount: 119 },
      widerEnvelopeExclusions: { blockEntityCount: 19, savedEntityCount: 0 },
    });
    expect(contract.exactProtectedInterfaceSegments.map((segment: { owner: string; routeStationCells: { cellCount: number } }) => [segment.owner, segment.routeStationCells.cellCount]))
      .toEqual([['OASIS', 41], ['WESTLIGHT_VENUE', 61], ['LANTERN_HALL', 17]]);
    expect(contract.rejectedFragments).toContain('re-paving or re-releasing the existing 207-station road route');
    expect(fs.readFileSync(path.join(contractDir, 'mp06-road-route-threshold-map.svg'), 'utf8')).toContain('Existing 207-station route');
  }, 60_000);
});
