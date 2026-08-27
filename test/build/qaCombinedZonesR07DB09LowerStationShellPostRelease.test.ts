import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r07d_b09_lower_station_shell_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r07d-live-20260821T164505Z',
);
const COMMITTED_JSON = path.join(EVIDENCE, 'r07d-post-release-qa.json');
const COMMITTED_MARKDOWN = path.join(EVIDENCE, 'r07d-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07d-post-qa-'),
);
const regeneratedJson = path.join(temporaryDirectory, 'report.json');
const regeneratedMarkdown = path.join(temporaryDirectory, 'report.md');

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  release: {
    transactionId: string;
    releaseNodeId: string;
    scopeIds: string[];
    manifestIdentity: string;
    completedReleaseIdentitySha256: string;
  };
  bindings: {
    ledger: { sha256: string; status: string };
    manifest: { sha256: string; manifestIdentity: string };
    sourceCompleteSave: {
      completeSaveSha256: string;
      regionSnapshotSha256: string;
    };
    postCompleteSave: {
      completeSaveSha256: string;
      regionSnapshotSha256: string;
    };
  };
  geometry: Record<string, ExactSet>;
  postState: {
    shell: {
      stateCensus: Record<string, number>;
      matchingCellCount: number;
      mismatchCellCount: number;
    };
    preservedInterior: {
      stateCensus: Record<string, number>;
      matchingCellCount: number;
      mismatchCellCount: number;
      connectivity: { componentCount: number; largestComponentCellCount: number };
    };
    b08PortalSeam: {
      sourceStateCensus: Record<string, number>;
      postStateCensus: Record<string, number>;
      unchangedCellCount: number;
      changedCellCount: number;
      westIsolationCapPolishedDioriteCellCount: number;
    };
    summitInterfaceCap: {
      sourceStateCensus: Record<string, number>;
      postStateCensus: Record<string, number>;
      unchangedCellCount: number;
      changedCellCount: number;
      eastIsolationCapPolishedDioriteCellCount: number;
    };
    fullB09Accommodation: {
      sourceStateCensus: Record<string, number>;
      postStateCensus: Record<string, number>;
      changedCellCount: number;
      nonShellChangedCellCount: number;
    };
  };
  executionEvidence: {
    strictForwardExecution: {
      operationSha256: string;
      successfulGroups: number;
      failedGroups: number;
      noopCommands: number;
      passed: boolean;
    };
    rollbackPoststatePreflight: {
      opsSha256: string;
      passedGuards: number;
      failedGuards: number;
      regionSnapshotSha256: string;
      passed: boolean;
    };
    exactReverseOrderInverse: boolean;
  };
  checks: Array<{ id: string; status: string }>;
  summary: Record<string, number | boolean>;
  safetyBoundary: {
    liveCallsPerformed: boolean;
    worldEditsPerformed: boolean;
    readOnlyAnvilInputs: boolean;
  };
}

function readReport(): QaReport {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as QaReport;
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-21T16:48:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R07D B09 lower-station shell post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds the terminal ledger, manifest, complete saves, and final identity', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_R07D_B09_LOWER_STATION_SHELL_POST_RELEASE_ACCEPTED',
      qaPayloadSha256:
        '5e3b2f4859e8bcb1832c0dddda3f9baf7607d098af4c9aa87ad4afff3c83ef30',
      release: {
        transactionId: 'combined-zones-r07d-b09-lower-station-shell',
        releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
        scopeIds: ['P1-B09'],
        manifestIdentity:
          '1bd7cafaa9f37a9b63e681fd73114b836b77b54544fee586ccabfe64ed19f49a',
        completedReleaseIdentitySha256:
          'd2e446216f55a7f6b67432c2203e3624a64606eb64b25eb2e5439d8c8d286bfe',
      },
      bindings: {
        ledger: {
          sha256: '2f0dc839868302458a122796782f99f056af58d62d7f1fb29d91366f4cf5a6b1',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256: '194f676779446cc7a0ec9f4ebc428910e185246a5c5e3abb268edd258e47c75a',
        },
        sourceCompleteSave: {
          completeSaveSha256:
            'f2048c5d1dd2349bef2629f2f15ce995cc27cbfaa86121ff10b5ac13bd3ab2a3',
          regionSnapshotSha256:
            'cf46558821d428b4727cca980b845ef43a094998a75b4bb07ed75dbbefed65ad',
        },
        postCompleteSave: {
          completeSaveSha256:
            'fdffaae24e4adb32ac32df7f14a1efef14e70922b6633562f093bbfafca4b858',
          regionSnapshotSha256:
            '5ec31dc503fac970a174056db8459d88aa29ec5ae441f50f6e4744cd58b40e1d',
        },
      },
    });
  });

  it('re-derives the exact shell, interior, and sealed interfaces', () => {
    expect(readReport().geometry).toMatchObject({
      minimumPlanningAccommodation: {
        cellCount: 7800,
        coordinateSetSha256:
          'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
      },
      lowerStationEnvelope: {
        cellCount: 132,
        coordinateSetSha256:
          'd13426cafb5f9cb53de702653532111ef18588af1c28c0f3d8e7cb2956e0801b',
      },
      b08PortalSeam: {
        cellCount: 36,
        coordinateSetSha256:
          'b28a975b44296fc43739a8af0743066ca58a2c33a99e13da6c2edf89142b33e3',
      },
      roughShell: {
        cellCount: 84,
        coordinateSetSha256:
          'e7b44ebf100becffaca355a6b863219738a4c27e0dad83ea21170da35e411e1d',
      },
      preservedInteriorVoid: {
        cellCount: 12,
        coordinateSetSha256:
          '4062250031378a6fd8ee3a499df1c38cfb9af751e28876bb90c06bf00cd6eae7',
      },
      westIsolationCap: { cellCount: 12 },
      eastIsolationCap: { cellCount: 12 },
      summitInterfaceCap: {
        cellCount: 12,
        coordinateSetSha256:
          'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
      },
    });
  });

  it('proves shell and interior states and zero undeclared B09 drift', () => {
    const postState = readReport().postState;
    expect(postState.shell).toMatchObject({
      stateCensus: { 'minecraft:polished_diorite': 84 },
      matchingCellCount: 84,
      mismatchCellCount: 0,
    });
    expect(postState.preservedInterior).toMatchObject({
      stateCensus: { 'minecraft:air': 12 },
      matchingCellCount: 12,
      mismatchCellCount: 0,
      connectivity: { componentCount: 1, largestComponentCellCount: 12 },
    });
    expect(postState.fullB09Accommodation).toMatchObject({
      sourceStateCensus: {
        'minecraft:air': 7797,
        'minecraft:polished_diorite': 3,
      },
      postStateCensus: {
        'minecraft:air': 7713,
        'minecraft:polished_diorite': 87,
      },
      changedCellCount: 84,
      nonShellChangedCellCount: 0,
    });
  });

  it('proves B08 and summit interfaces retained exact source states behind caps', () => {
    const postState = readReport().postState;
    expect(postState.b08PortalSeam).toMatchObject({
      sourceStateCensus: {
        'minecraft:air': 33,
        'minecraft:polished_diorite': 3,
      },
      postStateCensus: {
        'minecraft:air': 33,
        'minecraft:polished_diorite': 3,
      },
      unchangedCellCount: 36,
      changedCellCount: 0,
      westIsolationCapPolishedDioriteCellCount: 12,
    });
    expect(postState.summitInterfaceCap).toMatchObject({
      sourceStateCensus: { 'minecraft:air': 12 },
      postStateCensus: { 'minecraft:air': 12 },
      unchangedCellCount: 12,
      changedCellCount: 0,
      eastIsolationCapPolishedDioriteCellCount: 12,
    });
  });

  it('binds strict execution, exact inverse, and post-state rollback guards', () => {
    expect(readReport().executionEvidence).toEqual({
      strictForwardExecution: {
        path: expect.any(String),
        sha256: '8bcc8335084aee64d8b8a4bb905d45459a88afc5c45cfb744a57f9ed8298fe77',
        bytes: expect.any(Number),
        operationSha256:
          '840bdf9f730741cd8032ffcfe6a6c875391e40e4bc97613eb173e33131bc7ee4',
        successfulGroups: 6,
        failedGroups: 0,
        noopCommands: 0,
        passed: true,
      },
      rollbackPoststatePreflight: {
        path: expect.any(String),
        sha256: 'da3b8d83d8785702d062de36172b9106041ce48fa9d7aa01299916d7833db4f8',
        bytes: expect.any(Number),
        opsSha256:
          '1e0e4bdee190ebf10c1b775e505ec7939dfce2cd9ea74a5895a7d0d61f3b850e',
        passedGuards: 6,
        failedGuards: 0,
        regionSnapshotSha256:
          '5ec31dc503fac970a174056db8459d88aa29ec5ae441f50f6e4744cd58b40e1d',
        passed: true,
      },
      exactReverseOrderInverse: true,
    });
  });

  it('passes all acceptance checks within the read-only boundary', () => {
    const report = readReport();
    expect(report.checks).toHaveLength(11);
    expect(report.checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(report.summary).toEqual({
      passed: true,
      checkCount: 11,
      passCount: 11,
      failCount: 0,
      shellMatchingCellCount: 84,
      interiorAirCellCount: 12,
      b08SeamUnchangedCellCount: 36,
      summitCapUnchangedCellCount: 12,
      westIsolationCapCellCount: 12,
      eastIsolationCapCellCount: 12,
      strictSuccessfulGroupCount: 6,
      rollbackGuardPassCount: 6,
      nonShellB09ChangeCount: 0,
    });
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      readOnlyAnvilInputs: true,
    });
  });
});
