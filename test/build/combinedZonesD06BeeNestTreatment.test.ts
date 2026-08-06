import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_d06_bee_nest_treatment.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-treatment.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-treatment.md',
);
const tempDirectory = fs.mkdtempSync(path.join(
  os.tmpdir(),
  'combined-zones-d06-bee-nest-',
));
const regeneratedJson = path.join(tempDirectory, 'treatment.json');
const regeneratedMarkdown = path.join(tempDirectory, 'treatment.md');

type JsonRecord = Record<string, any>;

function sha256(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-06T03:15:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
});

afterAll(() => {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
});

describe('Combined Zones D06 occupied bee-nest treatment', () => {
  it('regenerates the committed evidence byte-for-byte', () => {
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

  it('selects intact relocation while retaining every technical and physical hold', () => {
    const report = JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
    expect(report).toMatchObject({
      schemaVersion: 1,
      status:
        'PARTIAL_PASS_EXACT_OCCUPIED_NEST_BOUND_HUMANE_INTACT_RELOCATION_SELECTED_TECHNICAL_AND_RELEASE_HOLD',
      treatmentPayload: {
        sourceCell: {
          cellCount: 1,
          bounds: {
            minX: 1849,
            maxX: 1849,
            minY: 66,
            maxY: 66,
            minZ: 145,
            maxZ: 145,
          },
        },
        sourceState: {
          blockState: {
            name: 'minecraft:bee_nest',
            properties: { facing: 'south', honey_level: '0' },
          },
          embeddedOccupantCount: 2,
          linkedExternalEntityCount: 1,
          colonyMemberCount: 3,
        },
        selectedPlanningAlternativeId: 'D06-BEE-02-HUMANE-INTACT-RELOCATION',
        destinationCellSet: null,
        acceptedTechnicalTreatmentContract: null,
        exactForwardOperation: null,
        exactRollbackOperation: null,
      },
      disposition: {
        exactSourceAndColonyStateBound: true,
        transientAnimalRelocationWorkCreated: false,
        planningTreatmentSelected: true,
        destinationSelected: false,
        technicalTreatmentAccepted: false,
        geometryRebuildRequired: false,
        readyForDestinationSurveyAndTechnicalDevelopment: true,
      },
      safetyBoundary: {
        operationCellCount: 0,
        entityRelocationCount: 0,
        blockEditCount: 0,
        physicalReleaseAuthorized: false,
        entityRelocationAuthorized: false,
        worldEditAuthorized: false,
        executable: false,
      },
    });
    expect(report.treatmentPayload.alternatives).toHaveLength(3);
    expect(report.treatmentPayload.closureRequirements).toHaveLength(6);
  });
});
