import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_d06_bee_nest_relocation_fixture.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-relocation-fixture.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-relocation-fixture.md',
);
const tempDirectory = fs.mkdtempSync(path.join(
  os.tmpdir(),
  'combined-zones-d06-bee-relocation-',
));
const regeneratedJson = path.join(tempDirectory, 'fixture.json');
const regeneratedMarkdown = path.join(tempDirectory, 'fixture.md');

type JsonRecord = Record<string, any>;

function sha256(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-06T03:35:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
});

afterAll(() => {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
});

describe('Combined Zones D06 bee-nest relocation fixture', () => {
  it('regenerates the committed fixture byte-for-byte', () => {
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

  it('passes only the synthetic all-three-embedded state contract', () => {
    const report = JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
    expect(report).toMatchObject({
      schemaVersion: 1,
      status:
        'PASS_SYNTHETIC_THREE_MEMBER_STATE_ROUNDTRIP_CURRENT_CAPTURE_TRANSPORT_REJECTED_RUNTIME_MECHANIC_HOLD',
      fixturePayload: {
        source: { x: 1849, y: 66, z: 145 },
        destination: { x: 1811, y: 67, z: 378 },
        capturedTransportEligibility: {
          passed: false,
          embeddedOccupantCount: 2,
          linkedExternalOccupantCount: 1,
          uniqueOccupantCount: 3,
        },
        consolidatedTransportEligibility: {
          passed: true,
          embeddedOccupantCount: 3,
          linkedExternalOccupantCount: 0,
          uniqueOccupantCount: 3,
        },
      },
      disposition: {
        syntheticStateContractPassed: true,
        currentCapturedStateTransportEligible: false,
        liveConsolidationRequired: true,
        isolatedRuntimeMechanicProofRequired: true,
        runtimeMechanicProven: false,
        technicalTreatmentAccepted: false,
        operationCompilationAuthorized: false,
      },
      safetyBoundary: {
        operationCellCount: 0,
        entityRelocationCount: 0,
        blockEditCount: 0,
        serverStarted: false,
        liveWorldContacted: false,
        physicalReleaseAuthorized: false,
        entityRelocationAuthorized: false,
        worldEditAuthorized: false,
        executable: false,
      },
    });
    expect(Object.keys(report.fixturePayload.checks)).toHaveLength(8);
    expect(Object.values(report.fixturePayload.checks).every(Boolean)).toBe(true);
    expect(report.fixturePayload.negativeFixtures).toHaveLength(5);
    expect(report.fixturePayload.negativeFixtures.every(
      ({ rejected }: JsonRecord) => rejected === true,
    )).toBe(true);
  });
});
