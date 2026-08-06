import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(
  ROOT,
  'scripts/survey_combined_zones_d06_bee_nest_destination.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-destination-survey.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-destination-survey.md',
);
const tempDirectory = fs.mkdtempSync(path.join(
  os.tmpdir(),
  'combined-zones-d06-bee-destination-',
));
const regeneratedJson = path.join(tempDirectory, 'survey.json');
const regeneratedMarkdown = path.join(tempDirectory, 'survey.md');

type JsonRecord = Record<string, any>;

function sha256(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-06T03:20:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
});

afterAll(() => {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
});

describe('Combined Zones D06 bee-nest destination survey', () => {
  it('regenerates the committed survey byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(
      fs.readFileSync(COMMITTED_MARKDOWN),
    );
  });

  it('binds every source to its current file identity', () => {
    const report = JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
    for (const source of Object.values(report.sourceBindings) as JsonRecord[]) {
      const filename = path.join(ROOT, source.path);
      expect(fs.existsSync(filename), source.path).toBe(true);
      expect(source.sha256, source.path).toBe(sha256(filename));
      expect(source.bytes, source.path).toBe(fs.statSync(filename).size);
    }
  });

  it('selects the exact conflict-free planning candidate without authority', () => {
    const report = JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
    expect(report).toMatchObject({
      schemaVersion: 1,
      status:
        'PARTIAL_PASS_EXACT_CONFLICT_FREE_DESTINATION_CANDIDATE_SELECTED_OWNERSHIP_HABITAT_METHOD_AND_RELEASE_HOLD',
      surveyPayload: {
        observedFlowerRecordCount: 69,
        passingCandidateCount: 921,
        selectedPlanningCandidate: {
          point: { x: 1811, y: 67, z: 378 },
          desiredFacing: 'south',
          currentBlock: 'minecraft:air',
          supportBlock: 'minecraft:grass_block',
          southEntranceBlock: 'minecraft:air',
          biome: 'minecraft:forest',
          sourceDistance: 236.080495,
          minimumDomainBoundsClearance: 218,
          minimumProtectedCoreBoundsClearance: 1063.523389,
          minimumPlanningZoneBoundsClearance: 78,
          insideEastReserve: false,
          nearbyFlowerCount: 16,
          nearestFlowerDistance: 1,
          intersectedZoneBounds: [],
          intersectedDomainBounds: [],
          intersectedProtectedCoreBounds: [],
          destinationBlockEntityCount: 0,
          destinationPoiRecordCount: 0,
          nearbyEntityRecordCount: 0,
        },
        destinationCellSet: {
          cellCount: 1,
          bounds: {
            minX: 1811,
            maxX: 1811,
            minY: 67,
            maxY: 67,
            minZ: 378,
            maxZ: 378,
          },
        },
        destinationAcceptance: null,
        exactRelocationMethod: null,
        exactForwardOperation: null,
        exactRollbackOperation: null,
      },
      disposition: {
        boundedSearchComplete: true,
        destinationPlanningCandidateSelected: true,
        destinationCellAccepted: false,
        habitatAccepted: false,
        ownershipAccepted: false,
        relocationMethodAccepted: false,
        technicalTreatmentAccepted: false,
      },
      safetyBoundary: {
        acceptedDestinationCellCount: 0,
        operationCellCount: 0,
        entityRelocationCount: 0,
        blockEditCount: 0,
        physicalReleaseAuthorized: false,
        entityRelocationAuthorized: false,
        worldEditAuthorized: false,
        executable: false,
      },
    });
    expect(report.surveyPayload.selectedPlanningCandidate.nearbyFlowers).toHaveLength(16);
  });
});
