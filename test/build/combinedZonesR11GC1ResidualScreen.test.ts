import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const CANONICAL = path.join(
  ROOT, 'data/world-review/combined-zones-r11g-c1-residual-screen-20260822T001500Z.json',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11g-residual-'),
);
const temporaryReport = path.join(temporaryDirectory, 'residual-screen.json');

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R11G C1 residual scope screen', () => {
  it('reproduces the immutable read-only blocker byte-for-byte', () => {
    execFileSync(process.execPath, [
      'scripts/inventory_combined_zones_r11g_c1_residual_screen.mjs',
      '--out', temporaryReport,
      '--generated-at', '2026-08-22T00:15:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(temporaryReport)).toEqual(fs.readFileSync(CANONICAL));
  });

  it('accounts for every station without emitting an empty physical release', () => {
    const report = JSON.parse(fs.readFileSync(CANONICAL, 'utf8')) as {
      status: string;
      residualScreenPayloadSha256: string;
      terminalSource: Record<string, string>;
      design: { stationCount: number; treatmentRunCount: number };
      acceptedHighwayReleases: unknown[];
      residual: {
        acceptedAtGradeStationCount: number;
        remainingAtGradeRunCount: number;
        remainingAtGradeStationCount: number;
        unheldSourceProvenAtGradeRunCount: number;
        nonAtGradeHoldRunCount: number;
        nonAtGradeHoldStationCount: number;
        remainingAtGrade: Array<{
          key: string;
          disposition: string;
          currentTerminalPreservationProof: Record<string, number>;
        }>;
      };
      modeReadiness: Record<string, Record<string, string | number | boolean>>;
      decision: {
        releaseManifestEmitted: boolean;
        operationPackageCount: number;
        wrapperPrintPlanApplicable: boolean;
        emptyPackageProhibited: boolean;
      };
      safetyBoundary: { liveCallsPerformed: boolean; worldEditsPerformed: boolean };
    };
    expect(report).toMatchObject({
      status: 'BLOCKED_NO_SOURCE_PROVEN_UNHELD_R11G_PHYSICAL_SCOPE',
      terminalSource: {
        ledgerSha256:
          '2e021ad9ee6bbab97ccc5150ca240876f0e66956fc676171140084566a2deabe',
        completedReleaseIdentitySha256:
          'a7f8c5d9f9fa81df360c146e79287ed4eba03b2128f6af428490943d3d565c86',
        postCompleteSaveSha256:
          '14f4f7a055d682d77c7e4330514c1b77bc21fc35af52cc99ea5a60bfab29f918',
      },
      design: { stationCount: 1_216, treatmentRunCount: 45 },
      residual: {
        acceptedAtGradeStationCount: 105,
        remainingAtGradeRunCount: 4,
        remainingAtGradeStationCount: 259,
        unheldSourceProvenAtGradeRunCount: 0,
        nonAtGradeHoldRunCount: 31,
        nonAtGradeHoldStationCount: 852,
      },
      decision: {
        releaseManifestEmitted: false,
        operationPackageCount: 0,
        wrapperPrintPlanApplicable: false,
        emptyPackageProhibited: true,
      },
      safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
    });
    expect(report.acceptedHighwayReleases).toHaveLength(6);
    expect(report.residual.remainingAtGrade.map(({ key }) => key)).toEqual([
      'island-0-10',
      'island-952-1139',
      'island-1142-1183',
      'island-1189-1206',
    ]);
    expect(report.residual.remainingAtGrade.every(({ disposition }) => (
      disposition.endsWith('NO_PACKAGE')
    ))).toBe(true);
    expect(report.modeReadiness).toMatchObject({
      highway: { unheldSourceProvenResidualRunCount: 0 },
      passengerRail: { staging: 'EMPTY_RESERVE_FIRST', frozenMaterialCellCount: 0 },
      pedestrian: { separateFrozenPhysicalTargetGeometryPresent: false },
      utilities: { separateFrozenPhysicalTargetGeometryPresent: false },
      drainage: { approvedOutfallCount: 0 },
      dataDistrictInterchange: {
        status: 'COORDINATION_ENVELOPE_PASS_STRUCTURAL_DESIGN_HOLD',
      },
    });
    expect(report.residual.remainingAtGrade.every((range) => (
      Object.values(range.currentTerminalPreservationProof).every(
        (value) => typeof value !== 'number' || value >= 0,
      )
    ))).toBe(true);
  });

  it('freezes the canonical blocker identity', () => {
    expect(crypto.createHash('sha256').update(fs.readFileSync(CANONICAL)).digest('hex'))
      .toBe('2a92efa5c0b3e2f31d155e7b70345e58862ee17278e77710fc834125bd65502e');
  });
});
