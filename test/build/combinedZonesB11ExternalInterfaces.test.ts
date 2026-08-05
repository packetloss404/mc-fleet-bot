import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const JSON_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-b11-external-interface-acceptance.json',
);
const MARKDOWN_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-b11-external-interface-acceptance.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-b11-'));
const regeneratedJson = path.join(tempDir, 'b11.json');
const regeneratedMarkdown = path.join(tempDir, 'b11.md');

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  authority: {
    ownerApprovalRecordedByThisArtifact: boolean;
    acceptancePayloadSha256: string;
    acceptanceStatement: string;
  };
  safetyBoundary: Record<string, unknown>;
  sourceBindings: Record<string, { path: string; sha256: string; bytes: number }>;
  acceptancePayload: {
    grandAvenue: {
      centerlinePointCount: number;
      horizontalStepCount: number;
      start: { x: number; y: number; z: number };
      end: { x: number; y: number; z: number };
      totalRiseBlocks: number;
      riseStations: Array<Record<string, number>>;
      maximumVerticalStep: number;
    };
    interfaceContracts: Array<Record<string, unknown>>;
  };
  evidenceChecks: Record<string, unknown>;
  ownerReview: { approvalStatus: string; doesNotApprove: string[] };
  disposition: Record<string, unknown>;
}

const readReport = (): Report => JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')) as Report;

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/compile_combined_zones_b11_external_interfaces.mjs',
      '--generated-at', '2026-08-04T23:20:00Z',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones P1-B11 external-interface acceptance packet', () => {
  it('regenerates both committed artifacts byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(JSON_PATH));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(MARKDOWN_PATH));
  });

  it('binds every controlling source exactly', () => {
    const report = readReport();
    expect(Object.keys(report.sourceBindings)).toEqual([
      'coordinateRegistry',
      'geometryCoordination',
      'c1CivilDesign',
      'terrainProbe',
      'd06EgressGeometry',
      'releaseContract',
    ]);
    for (const binding of Object.values(report.sourceBindings)) {
      const filename = path.join(ROOT, binding.path);
      expect(fs.statSync(filename).size, binding.path).toBe(binding.bytes);
      expect(crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex'))
        .toBe(binding.sha256);
    }
  });

  it('proposes one exact Grand Avenue profile without terrain substitution', () => {
    const report = readReport();
    expect(report.acceptancePayload.grandAvenue).toMatchObject({
      centerlinePointCount: 299,
      horizontalStepCount: 298,
      start: { x: 1750, y: 68, z: -300 },
      end: { x: 2048, y: 72, z: -328 },
      totalRiseBlocks: 4,
      maximumVerticalStep: 1,
    });
    expect(report.acceptancePayload.grandAvenue.riseStations).toHaveLength(4);
    expect(report.evidenceChecks).toMatchObject({
      duplicateGrandAvenuePoints: 0,
      grandAvenueEightConnected: true,
      grandAvenueMaximumVerticalStep: 1,
      grandAvenueProfileUsesTerrainSubstitution: false,
    });
  });

  it('fails closed for PassageWay and all future openings', () => {
    const report = readReport();
    const contracts = report.acceptancePayload.interfaceContracts;
    expect(contracts).toHaveLength(6);
    expect(contracts.find(({ id }) => id === 'IF-B11-C3-PASSAGEWAY')).toMatchObject({
      state: 'DEFAULT_DENY_ZERO_SET_DEFERRED',
      passageWayEndpoint: null,
      proposedRoute: [],
      proposedInteractionCells: [],
      physicalSeamCellsAccepted: false,
    });
    expect(report.evidenceChecks).toMatchObject({
      passageWayUnevidencedEndpointCompiledToZeroSet: true,
      futureLineWallPointCount: 16,
      allFutureLinesSealed: true,
    });
  });

  it('is reviewable but records neither approval nor release authority', () => {
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-b11-external-interface-acceptance',
      status: 'READY_FOR_SOLE_OWNER_REVIEW_P1_B11_HOLD_UNTIL_HASH_ACCEPTED',
      authority: {
        ownerApprovalRecordedByThisArtifact: false,
      },
      safetyBoundary: {
        operations: [],
        operationCellCount: 0,
        materialCellCount: 0,
        worldEditAuthorized: false,
        physicalBuildAuthorized: false,
      },
      ownerReview: { approvalStatus: 'PENDING' },
      disposition: {
        p1B11ReadyForOwnerApproval: true,
        p1B11Approved: false,
        g03Passed: false,
      },
    });
    expect(report.authority.acceptanceStatement).toContain(
      report.authority.acceptancePayloadSha256,
    );
  });
});
