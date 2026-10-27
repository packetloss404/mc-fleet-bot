import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r07h_b09_lower_guideway_segment_02.mjs',
);
const BASENAME = 'combined-zones-r07h-b09-lower-guideway-segment-02';
const PACKAGE_KEY = 'b09-lower-guideway-segment-02';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r07h-b09-lower-guideway-segment-02-offline-20260821T183200Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07h-b09-guideway-'),
);

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface ReleaseManifest {
  schemaVersion: number;
  transactionId: string;
  status: string;
  releaseNodeId: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    canonicalOwner: string;
    segmentSelection: Record<string, number | string>;
    geometry: Record<string, ExactSet & Record<string, number | string>>;
    ownership: Record<string, number | string>;
    operationalBoundary: Record<string, boolean>;
    sourcePartition: {
      sourceStateCensus: Record<string, number>;
      desiredStateCensus: Record<string, number>;
      exactPartition: boolean;
    };
  };
  source: Record<string, unknown> & {
    snapshotRoot: string;
    completeSaveSha256: string;
    regionSnapshotSha256: string;
    touchedChunkCount: number;
    predecessor: Record<string, string>;
    acceptedR07f: Record<string, unknown>;
    b09CurrentState: Record<string, unknown>;
  };
  target: {
    operatedUnion: ExactSet;
    desiredStateCensus: Record<string, number>;
    packageTargetsDisjoint: boolean;
  };
  operations: Record<string, Record<string, number | string | boolean>>;
  interfaces: Record<string, ExactSet>;
  safetyAudit: Record<string, unknown>;
  safetyBoundary: Record<string, boolean>;
  manifestIdentity: string;
}

interface Operation {
  from: [number, number, number];
  to: [number, number, number];
  fromState: string;
  toState: string;
}

function readManifest(filename = MANIFEST): ReleaseManifest {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as ReleaseManifest;
}

function parseOperations(filename: string): Operation[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '))
    .map((line) => {
      const fields = line.split(/\s+/);
      expect(fields).toHaveLength(9);
      return {
        from: fields.slice(1, 4).map(Number) as [number, number, number],
        to: fields.slice(4, 7).map(Number) as [number, number, number],
        fromState: fields[7],
        toState: fields[8],
      };
    });
}

function bodySha256(filename: string): string {
  const body = `${fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
  return crypto.createHash('sha256').update(body).digest('hex');
}

function artifactPaths(directory: string): string[] {
  return [
    `${BASENAME}.${PACKAGE_KEY}.forward.txt`,
    `${BASENAME}.${PACKAGE_KEY}.rollback.txt`,
    `${BASENAME}.release-manifest.json`,
  ].map((filename) => path.join(directory, filename));
}

let firstCompile: Buffer[] = [];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at', '2026-08-21T18:32:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r07g-post-20260821T181527Z',
    '--intake-audit',
    'data/world-review/combined-zones-r07g-live-20260821T181527Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r07g-live-20260821T181527Z/evidence-ledger.json',
    '--out-dir', temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R07H B09 lower guideway segment 02 compiler', () => {
  it('regenerates every guarded artifact byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the latest accepted R07G source and accepted R07F predecessor', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_LATEST_ACCEPTED_R07G_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
      mvpScope: true,
      scopeIds: ['P1-B09'],
      manifestIdentity:
        'a1797eff976b42649ba9dfc3cfa08112e85a6d06f73ca3a14427f6c3dc586416',
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r07g-post-20260821T181527Z',
        completeSaveSha256:
          '98086a3bc4584ba82ee287f1425f32435a2f41e1ce5f3a72482a50e225f8b8e4',
        regionSnapshotSha256:
          'd3c7f46034a4cab20819c51a4ee505a46be81065fda887c19ebe3638f2d83ad8',
        touchedChunkCount: 15,
        predecessor: {
          transactionId: 'combined-zones-r07g-empty-eight-egress-headhouses',
          completedReleaseIdentitySha256:
            '79b6e5972cfc24770cb402f740407bc7c01113d728d5cca0b765894c0066335e',
        },
        acceptedR07f: {
          manifestIdentity:
            '0260263944b561a612f786f1fb0fd0345d1afd18da4f5ff13e207cd777687354',
          qaPayloadSha256:
            '516be068e82892c8c0f2b92aeffa901b501dc60eae5544fbbfb4aede64bc8d1c',
          completedReleaseIdentitySha256:
            '15facdcd036fdfba27ef0e76a0167b00e1acf118804415da159167e46b4a806e',
        },
      },
    });
  });

  it('selects the maximal dry straight run and stops closed before curve 240', () => {
    expect(readManifest().scope).toMatchObject({
      canonicalOwner: 'P1-B09-FUNICULAR-FRAMEWORK',
      segmentSelection: {
        rule: 'LARGEST_CONTIGUOUS_DRY_STATIC_CARDINAL_RUN_BEFORE_FIRST_DIRECTION_CHANGE',
        firstInclusive: 24,
        lastInclusive: 239,
        pointCount: 216,
        orderedSegmentSha256:
          '489d1ec4b963439536fa360905a8c8a7a730afd5792cd0868b7cdd38fa8e8ee6',
        nextWithheldCenterlineIndex: 240,
        nextWithheldReason: 'FIRST_CURVE_REQUIRES_SEPARATE_DIRECTIONAL_SHELL_AND_CAP_PACKAGE',
        narrowedForFluidCellCount: 0,
        narrowedForGravityCellCount: 0,
        narrowedForEntityOrBlockEntityCount: 0,
        narrowedForRelicOrPriorConflictCount: 0,
      },
      geometry: {
        canonicalB09ConstructionDomain: {
          cellCount: 7488,
          coordinateSetSha256:
            'd9de4b923a8002dbd302116f4c928b6794d824ea616811d0ab2a3988ad32bb1f',
        },
        canonicalB09InteractionDomain: {
          cellCount: 7800,
          coordinateSetSha256:
            'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
        },
        rawSegmentEnvelope: {
          cellCount: 2616,
          coordinateSetSha256:
            '83605996187e457d99e06b2931e73012e8bcc2cc39b61e9b9e0e4aca6e7938b0',
        },
        newSegmentEnvelope: {
          cellCount: 2580,
          coordinateSetSha256:
            '36ce941c3cbcefbabad031b261a6fb18110f0f0e018468071e9be9e5e5b249db',
        },
        preservedSegmentInterior: {
          cellCount: 428,
          coordinateSetSha256:
            '9fa768852c203ba4621e5fc01652fc8fe87fd6b4de3c7afab3d83b50766b78ba',
        },
        staticSegmentShell: {
          cellCount: 2152,
          coordinateSetSha256:
            'e5a7cd983244d917f6a10a2fc85673f10d97460a62a5ac697f621d2330ee2097',
        },
        ownedPriorFarCapSeamOpening: {
          cellCount: 2,
          coordinateSetSha256:
            '0ed8967e3b4982f7fe4e1a8d054561552a1c9a21a2c8e2f9ada2f252e8e2cbd7',
        },
        retainedPriorFarCapCollar: { cellCount: 10 },
        newFarIsolationCap: {
          cellCount: 12,
          coordinateSetSha256:
            'aca98a89222480d4206b7c408d922ecc4d884d2228920bfbfc04f43d820a92b9',
        },
        retainedFutureCurveSeam: {
          cellCount: 2,
          coordinateSetSha256:
            '6eb7dc1db3f3b65676aee14d6448032a4ffe8fb0e1bccb17f0d4d8f84436ebc4',
        },
        connectedLowerStationAndSegmentsVoid: {
          cellCount: 474,
          coordinateSetSha256:
            '33c4566c2030f7e9f5d7cac5a65bb5579a551a2e848a3354f543ef566e969eb1',
          componentCount: 1,
          largestComponentCellCount: 474,
        },
        connectedVoidFaceBoundary: {
          cellCount: 1426,
          coordinateSetSha256:
            '131169b3d54c7781fccd906c83c68d6c90ce50c8e3c0da3cd21f407dfb07b758',
        },
      },
      ownership: {
        targetConstructionCellCount: 2154,
        targetInteractionOnlyCellCount: 0,
        targetOutsideInteractionCellCount: 0,
      },
    });
  });

  it('builds all shell before opening and reseals before exact inverse removal', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forwardPath = path.join(ROOT, pkg.forward);
    const rollbackPath = path.join(ROOT, pkg.rollback);
    const forward = parseOperations(forwardPath);
    const rollback = parseOperations(rollbackPath);

    expect(forward).toHaveLength(2154);
    expect(rollback).toHaveLength(2154);
    expect(forward.every(({ from, to }) => from.join(',') === to.join(','))).toBe(true);
    expect(forward.slice(0, 2152).every(({ fromState, toState }) => (
      fromState === 'minecraft:air' && toState === 'minecraft:polished_diorite'
    ))).toBe(true);
    expect(forward.slice(2152).every(({ from, fromState, toState }) => (
      from[0] === 2073
      && fromState === 'minecraft:polished_diorite'
      && toState === 'minecraft:air'
    ))).toBe(true);
    expect(rollback.slice(0, 2).every(({ from, fromState, toState }) => (
      from[0] === 2073
      && fromState === 'minecraft:air'
      && toState === 'minecraft:polished_diorite'
    ))).toBe(true);
    expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
      from: operation.from,
      to: operation.to,
      fromState: operation.toState,
      toState: operation.fromState,
    })));
    expect(bodySha256(forwardPath)).toBe(manifest.operations[PACKAGE_KEY].forwardSha256);
    expect(bodySha256(rollbackPath)).toBe(manifest.operations[PACKAGE_KEY].rollbackSha256);
    expect(manifest.operations[PACKAGE_KEY]).toEqual({
      forwardSha256:
        'cf53593ea03acac302bdb57f2ced8d0b312a9a04e86d6471d4c7922772697cd2',
      rollbackSha256:
        '1dffe6718b6ef82cecf33172bb0fa95d414ec75f5b02ffef0663996f2effd801',
      forwardCommandCount: 2154,
      rollbackCommandCount: 2154,
      targetCellCount: 2154,
      targetCoordinateSetSha256:
        'f797de91a3544c0e233cbbaadfd1a08bbc2b9b1141cd1cb1a0159f19710c1d9d',
      exactInverse: true,
      reverseOrderInverse: true,
      oneCellGuards: true,
      shellBeforeOpening: true,
      rollbackResealsBeforeShellRemoval: true,
    });
  });

  it('preserves every interface and excludes powered or commissioned scope', () => {
    const manifest = readManifest();
    expect(manifest.interfaces).toMatchObject({
      openedOwnedPriorFarCapSeam: { cellCount: 2 },
      retainedPriorFarCapCollar: { cellCount: 10 },
      newFailClosedCap: { cellCount: 12 },
      futureCurveSeamClosed: { cellCount: 2 },
      b08ExternalInterfaceTargetOverlap: { cellCount: 0 },
      z11ExternalInterfaceTargetOverlap: { cellCount: 0 },
      r07dTargetOverlap: { cellCount: 0 },
      r07eTargetOverlap: { cellCount: 0 },
      r07fTargetOverlap: {
        cellCount: 2,
        coordinateSetSha256:
          '0ed8967e3b4982f7fe4e1a8d054561552a1c9a21a2c8e2f9ada2f252e8e2cbd7',
      },
    });
    expect(manifest.scope.operationalBoundary).toMatchObject({
      priorFarCapOwnedAndOpened: true,
      priorFarCapCollarRetained: true,
      newFarIsolationCapBuiltClosed: true,
      futureCurveSeamBuiltClosed: true,
      firstCurveOpened: false,
      fartherGuidewayOpened: false,
      b08ExternalInterfaceTouched: false,
      summitExternalInterfaceTouched: false,
      r07dOperatedTouched: false,
      r07eOperatedTouched: false,
      r07fOperatedTouchedOnlyAtOwnedSeam: true,
      railOrVehicleInstalled: false,
      powerOrControlInstalled: false,
      brakeOrSafetyControlInstalled: false,
      drainageOrOutfallInstalled: false,
      rescueOrEgressCommissioned: false,
      funicularCommissioned: false,
      exactRollbackResealsPriorSeamFirst: true,
      exactRollbackRestoresR07GPostState: true,
    });
  });

  it('hard-clears fluids, gravity, entities, block entities, relics, and conflicts', () => {
    expect(readManifest().safetyAudit).toMatchObject({
      interactionHalo: {
        cellCount: 6522,
        coordinateSetSha256:
          '586f599db9470a2a1adc1516d1ad76d3ca369aed21bdf12015d398a5c3bb6609',
      },
      fluidOrWaterloggedCount: 0,
      gravityCount: 0,
      forbiddenContainerOrControlCount: 0,
      blockEntityIntersectionCount: 0,
      savedEntityIntersectionCount: 0,
      protectedRelicIntersectionCount: 0,
      declaredPriorSeamIntersectionCount: 1,
      undeclaredPriorReleaseIntersectionCount: 0,
      projectedInteriorMismatchCount: 0,
      projectedBoundaryMismatchCount: 0,
    });
    expect(readManifest().safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
    });
  });

  it('passes manifest QA, exact preflights, parsers, block-entity audit, and wrapper plan', () => {
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'manifest-qa.json'), 'utf8')))
      .toMatchObject({
        status: 'PASS',
        passed: true,
        totals: {
          packages: 1,
          passedPackages: 1,
          uniqueTargetCells: 2154,
          crossPackageIntersectionCells: 0,
        },
      });
    const forwardPreflight = JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'forward-source-preflight.json'),
      'utf8',
    ));
    const rollbackPreflight = JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'projected-rollback-preflight.json'),
      'utf8',
    ));
    expect(forwardPreflight).toMatchObject({
      status: 'PASS',
      operationCount: 2154,
      passed: 2154,
      failed: 0,
      opsSha256: 'e0e5d05bb0cbb1ab8b1dd0feb231d0d9238a0f55e6062fb3e73bd5bca3036b53',
      regionsSnapshot: {
        sha256: 'd3c7f46034a4cab20819c51a4ee505a46be81065fda887c19ebe3638f2d83ad8',
      },
    });
    expect(rollbackPreflight).toMatchObject({
      status: 'PASS',
      operationCount: 2154,
      passed: 2154,
      failed: 0,
      opsSha256: 'a61356af44c1326e834bf175f62b3d37ebcd01aad25b382c02f400d847d5daea',
      regionsSnapshot: {
        sha256: 'd3c7f46034a4cab20819c51a4ee505a46be81065fda887c19ebe3638f2d83ad8',
      },
      sourceOverlays: { operationCount: 2154, passed: 2154, failed: 0 },
    });
    for (const [filename, role, operationSha256] of [
      [
        'forward-strict-dry-run.json',
        'forward',
        'e0e5d05bb0cbb1ab8b1dd0feb231d0d9238a0f55e6062fb3e73bd5bca3036b53',
      ],
      [
        'rollback-strict-dry-run.json',
        'rollback',
        'a61356af44c1326e834bf175f62b3d37ebcd01aad25b382c02f400d847d5daea',
      ],
    ] as const) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')))
        .toMatchObject({
          status: 'dry_run',
          dryRun: true,
          strictNoop: true,
          operationRole: role,
          operationSha256,
          sourceOperationCount: 2154,
          sourceGroupCount: 2154,
          worldEditLeftoverCount: 0,
        });
    }
    expect(JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'block-entity-clearance.json'),
      'utf8',
    ))).toMatchObject({
      status: 'PASS',
      operationCount: 2154,
      targetChunkCount: 15,
      blockingBlockEntityCount: 0,
      chunksMissing: 0,
    });
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'wrapper-plan.json'), 'utf8')))
      .toMatchObject({
        mode: 'PREPARE_ONLY',
        globalGateDependency: 'NONE',
        packageOrder: [PACKAGE_KEY],
      });
  });

  it('seals the manifest payload identity', () => {
    const manifest = readManifest();
    const { manifestIdentity, ...payload } = manifest;
    expect(manifestIdentity)
      .toBe('a1797eff976b42649ba9dfc3cfa08112e85a6d06f73ca3a14427f6c3dc586416');
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
  });
});
