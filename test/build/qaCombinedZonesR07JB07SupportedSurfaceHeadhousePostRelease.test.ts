import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r07j_b07_supported_surface_headhouse_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r07j-live-20260821T193306Z',
);
const LEDGER = path.join(EVIDENCE, 'evidence-ledger.json');
const COMMITTED_JSON = path.join(EVIDENCE, 'r07j-post-release-qa.json');
const COMMITTED_MARKDOWN = path.join(EVIDENCE, 'r07j-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07j-post-qa-'),
);
const regeneratedJson = path.join(temporaryDirectory, 'report.json');
const regeneratedMarkdown = path.join(temporaryDirectory, 'report.md');

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
  componentCount?: number;
  componentSizes?: number[];
}

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  release: Record<string, string>;
  bindings: Record<string, unknown> & {
    manifest: { sha256: string; manifestIdentity: string };
    ledger: { sha256: string; status: string };
    source: { completeSaveSha256: string; regionSnapshotSha256: string };
    post: { completeSaveSha256: string; regionSnapshotSha256: string };
    evidenceBindingCount: number;
    evidenceBindingFailures: unknown[];
  };
  geometryAndPostState: Record<string, ExactSet & Record<string, unknown>>;
  exactTransitionsAndDrift: Record<string, number | ExactSet>;
  preservation: Record<string, ExactSet & Record<string, unknown>>;
  executionAndRollback: Array<Record<string, unknown>>;
  checks: Array<{ id: string; status: string }>;
  summary: Record<string, number | boolean>;
  commissioningBoundary: Record<string, boolean>;
  safetyBoundary: Record<string, boolean>;
}

function report(): QaReport {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as QaReport;
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--ledger', LEDGER,
    '--generated-at', '2026-08-21T19:35:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R07J B07 supported surface headhouse post-release QA', () => {
  it('regenerates the sealed JSON and Markdown byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds the exact executed release and immutable source/post pair', () => {
    expect(report()).toMatchObject({
      status: 'PASS_R07J_B07_SUPPORTED_SURFACE_HEADHOUSE_POST_RELEASE_ACCEPTED',
      qaPayloadSha256:
        '231fe851ffe2b4037c63cf5165bbc0670705388ccaee51b732d080cc3548be8f',
      release: {
        transactionId: 'combined-zones-r07j-b07-supported-surface-headhouse',
        releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
        canonicalOwner: 'P1-B07',
        manifestIdentity:
          '7714a583c3e659b0f9d2efac228ad8a1c1fb050a3b78b9010ee40c2ed519f223',
        sourceBoundReleaseIdentitySha256:
          'faaadd98cdeaf9bcd63309015980905fc9ab3c8217fd43995b1fd4474a5eadff',
        completedReleaseIdentitySha256:
          '5d40a94c69c54a0ab352683d471cd23263efcfaff484334aaa7341478fa48fde',
      },
      bindings: {
        manifest: {
          sha256: '22e1adc90ea8e8cccb28b46aaef017f60a35f233f353670ca1150ea1a49ebd9b',
        },
        ledger: {
          sha256: 'c74c5d3206e79e2dfb211bbcbe683cd373ccd23b3b3eb2c0293ee01dc3af1aaf',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        source: {
          completeSaveSha256:
            '3d14086d6beae1e4965a08ed978204f443f2f3414512eb2530544a07eb1ad98e',
          regionSnapshotSha256:
            '51c44204b504aeff14e1dfdf070f368890999b45ab0c96ff8c33390104ca864a',
        },
        post: {
          completeSaveSha256:
            '8eff7c27e4346ff3ae1d46396ca0da6da1acd3a7eb6fbdcd62bf8c4494b656ac',
          regionSnapshotSha256:
            'c3606576e8ae37929bc9fc72b08a82a978c61a9211a9cc0953cd7d80bebe7125',
        },
        evidenceBindingCount: 25,
        evidenceBindingFailures: [],
      },
    });
  });

  it('proves the four stable supports, connected deck, and closed 49-cell shaft cap', () => {
    expect(report().geometryAndPostState).toMatchObject({
      exactSevenBySevenTopFace: {
        cellCount: 49,
        closedPolishedDioriteCount: 49,
        openingCount: 0,
      },
      nineByNineDeck: {
        cellCount: 81,
        componentCount: 1,
        componentSizes: [81],
        polishedDioriteCount: 81,
      },
      groundedPiers: {
        cellCount: 35,
        polishedDioriteCount: 35,
        continuousColumnCount: 4,
        unchangedStableGroundContactCount: 4,
      },
    });
  });

  it('proves the shell, connected headroom, and complete collision boundary', () => {
    expect(report().geometryAndPostState).toMatchObject({
      failClosedHeadhouse: {
        cellCount: 121,
        polishedDioriteCount: 121,
        exteriorDoorOrOpeningCount: 0,
      },
      preservedHeadroom: {
        cellCount: 75,
        componentCount: 1,
        componentSizes: [75],
        sourceStateCensus: { 'minecraft:air': 75 },
        postStateCensus: { 'minecraft:air': 75 },
      },
      enclosedHeadroomFaceBoundary: {
        cellCount: 110,
        polishedDioriteCount: 110,
        openingCount: 0,
      },
    });
  });

  it('proves exact changes, tree preservation, and retained R09 hold', () => {
    expect(report()).toMatchObject({
      exactTransitionsAndDrift: {
        declaredTargetCount: 237,
        matchingTargetTransitionCount: 237,
        targetTransitionMismatchCount: 0,
        reviewDomain: { cellCount: 6975 },
        observedChangedCellCount: 237,
        undeclaredChangedCellCount: 0,
        missingDeclaredChangeCount: 0,
      },
      preservation: {
        woodyCells: {
          cellCount: 241,
          driftCount: 0,
          targetIntersectionCount: 0,
        },
        r09bR09cR09d: {
          cellCount: 1848,
          desiredAndUnchangedCount: 1848,
          mismatchCount: 0,
          driftCount: 0,
          retainedUpperHoldPreserved: true,
        },
      },
    });
  });

  it('seals strict execution, exact rollback, and the fail-closed boundary only', () => {
    expect(report().executionAndRollback).toHaveLength(2);
    expect(report().executionAndRollback.every((entry) => (
      entry.exactReverseOrderInverse === true
      && (entry.strictExecution as { passed: boolean }).passed
      && (entry.rollbackPoststate as { passed: boolean }).passed
    ))).toBe(true);
    expect(report().checks).toHaveLength(11);
    expect(report().checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(report()).toMatchObject({
      summary: {
        passed: true,
        passCount: 11,
        failCount: 0,
        exactTargetCount: 237,
        rollbackGuardCount: 237,
      },
      commissioningBoundary: {
        supportedSurfaceArchitectureAccepted: true,
        shaftOrEgressOpened: false,
        exteriorDoorInstalled: false,
        routeBeyondR09RetainedHoldCommissioned: false,
        liftSmokePowerDrainageOrControlsCommissioned: false,
      },
      safetyBoundary: {
        readOnly: true,
        liveCallsPerformed: false,
        worldMutated: false,
        rconInvoked: false,
        serviceMutated: false,
      },
    });
  });
});
