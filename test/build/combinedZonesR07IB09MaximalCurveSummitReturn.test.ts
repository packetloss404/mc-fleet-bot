import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r07i_b09_maximal_curve_summit_return.mjs',
);
const BASENAME = 'combined-zones-r07i-b09-maximal-curve-summit-return';
const PACKAGE_KEY = 'b09-maximal-curve-summit-return';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r07i-b09-maximal-curve-summit-return-offline-20260821T190200Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07i-b09-route-'),
);

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
  componentCount?: number;
  largestComponentCellCount?: number;
  componentSizes?: number[];
}

interface ReleaseManifest {
  schemaVersion: number;
  transactionId: string;
  status: string;
  releaseNodeId: string;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    canonicalOwner: string;
    segmentSelection: Record<string, number | string | boolean>;
    geometry: Record<string, ExactSet>;
    ownership: Record<string, number | string>;
    connectivityDoctrine: Record<string, number | string | boolean | number[]>;
    operationalBoundary: Record<string, boolean>;
    sourcePartition: Record<string, unknown>;
  };
  source: Record<string, unknown> & {
    snapshotRoot: string;
    completeSaveSha256: string;
    regionSnapshotSha256: string;
    touchedChunkCount: number;
    predecessor: Record<string, unknown>;
    acceptedR07h: Record<string, unknown>;
    disjointRebaseProof: Record<string, unknown>;
    b09CurrentState: Record<string, unknown>;
  };
  target: { operatedUnion: ExactSet; desiredStateCensus: Record<string, number> };
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
    '--generated-at', '2026-08-21T18:50:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r08p-post-20260821T184147Z',
    '--intake-audit',
    'data/world-review/combined-zones-r08p-live-20260821T184147Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r08p-live-20260821T184147Z/evidence-ledger.json',
    '--out-dir', temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R07I B09 maximal curve/summit-return compiler', () => {
  it('regenerates every guarded artifact byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the accepted disjoint R08P terminal and R07H post-QA state', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_LATEST_ACCEPTED_R08P_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
      scopeIds: ['P1-B09'],
      manifestIdentity:
        'a4cb61ca44395ab97af49fb5075cb428e357a2b5f2724fd74960030b30c3a3f8',
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r08p-post-20260821T184147Z',
        completeSaveSha256:
          'bf3f03362e1c920e89cf6eadbbb46926dbf7a204acd8eeae5f0182951f1a4505',
        regionSnapshotSha256:
          'b0503fc70b8960c2f6a413c620136c5c0ecbd562093362f143e902f7376abc25',
        predecessor: {
          transactionId: 'combined-zones-r08p-s09-gravity-stabilized-capped-retail-shell',
          completedReleaseIdentitySha256:
            'f59ad1ae37ca9a2786c9b3f560bdfdffde250e9d38c000c0d059b39e96c9f9e3',
        },
        acceptedR07h: {
          manifestIdentity:
            'a1797eff976b42649ba9dfc3cfa08112e85a6d06f73ca3a14427f6c3dc586416',
          qaPayloadSha256:
            'b849c99bf162da8bbd3eee063d4bab6699b04acaef73652b84612b07a25ed7ed',
          completedReleaseIdentitySha256:
            '1990844b4371b48ed6e5e851ec986cc908e9d5ed030d9760e226c04d02dfe88f',
        },
        disjointRebaseProof: {
          baseline: 'R07H_POST',
          terminal: 'R08P_POST',
          b09StateSetSha256:
            'b5f545101ceb768cc765daa9e668c2f6ffefa623864faba70db656cafb758b20',
          matchesAcceptedR07hPost: true,
        },
      },
    });
  });

  it('selects the maximal route through both curves and stops at the R07E cap', () => {
    expect(readManifest().scope).toMatchObject({
      canonicalOwner: 'P1-B09-FUNICULAR-FRAMEWORK',
      segmentSelection: {
        rule: 'MAXIMAL_CONTIGUOUS_DRY_STATIC_ROUTE_TO_ACCEPTED_R07E_FAIL_CLOSED_CAP',
        firstInclusive: 240,
        lastInclusive: 550,
        pointCount: 311,
        orderedSegmentSha256:
          '020c118a77b14d85a454293c75ad9a62836bd0119044c5573e2286a1558ce67a',
        withheldSummitApproachIndex: 551,
        retainedApproachCapClosed: true,
      },
      geometry: {
        canonicalB09ConstructionDomain: {
          cellCount: 7488,
          coordinateSetSha256:
            'd9de4b923a8002dbd302116f4c928b6794d824ea616811d0ab2a3988ad32bb1f',
        },
        routeSeeds: {
          cellCount: 622,
          coordinateSetSha256:
            '6297d5963c2209e0d63d0735c7991922c4273da239189ff3e3ebe34c2839f528',
        },
        rawSegmentEnvelope: { cellCount: 4740 },
        newSegmentEnvelope: { cellCount: 4710 },
        preservedNewInterior: { cellCount: 618 },
        staticSegmentShell: {
          cellCount: 4092,
          coordinateSetSha256:
            '2c3a65ea063b9022450b183637ec9921c746a7f1d605900dfdc17c6787cff7aa',
        },
        retainedR07eApproachCap: {
          cellCount: 12,
          coordinateSetSha256:
            '8ef484d874dca406f5a8abbc6dd8306ff2770ab304c10bddbc01db5c4107ad5c',
        },
      },
      ownership: {
        targetConstructionCellCount: 4096,
        targetInteractionOnlyCellCount: 0,
        targetOutsideInteractionCellCount: 0,
        reviewedR07hInternalSeamMigrationCellCount: 4,
      },
    });
  });

  it('hard-binds the two-cell negative control and four-cell connectivity proof', () => {
    expect(readManifest().scope).toMatchObject({
      geometry: {
        nominalR07hTwoCellSeam: {
          cellCount: 2,
          coordinateSetSha256:
            '6eb7dc1db3f3b65676aee14d6448032a4ffe8fb0e1bccb17f0d4d8f84436ebc4',
        },
        requiredTurnApertureExtension: { cellCount: 2 },
        ownedR07hFourCellTurnAperture: {
          cellCount: 4,
          coordinateSetSha256:
            '9991feda6e953dd4e66585d7e23a61723c3319cb59c22782196fab028f2c08bb',
        },
        nominalTwoCellNegativeControl: {
          cellCount: 1094,
          componentCount: 2,
          componentSizes: [618, 476],
        },
        connectedLowerStationAndGuidewayVoid: {
          cellCount: 1096,
          coordinateSetSha256:
            '2f808ddc7b077a2b256c56b96ba90631c0a94d26ac2b18b8e2da5e5660016855',
          componentCount: 1,
          largestComponentCellCount: 1096,
        },
        connectedVoidFaceBoundary: {
          cellCount: 3286,
          coordinateSetSha256:
            '491ab71d982ad1ecce1eb1aea39b7e2bc487d04316c0764e51d6648ea041ab3f',
        },
      },
      connectivityDoctrine: {
        nominalTwoCellSeamRejected: true,
        nominalTwoCellComponentCount: 2,
        nominalTwoCellComponentSizes: [618, 476],
        exactFourCellApertureRequired: true,
        exactFourCellApertureComponentCount: 1,
      },
    });
  });

  it('builds all shell before the aperture and uses an exact reverse-order inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forwardPath = path.join(ROOT, pkg.forward);
    const rollbackPath = path.join(ROOT, pkg.rollback);
    const forward = parseOperations(forwardPath);
    const rollback = parseOperations(rollbackPath);

    expect(forward).toHaveLength(4096);
    expect(rollback).toHaveLength(4096);
    expect(forward.every(({ from, to }) => from.join(',') === to.join(','))).toBe(true);
    expect(forward.slice(0, 4092).every(({ fromState, toState }) => (
      fromState === 'minecraft:air' && toState === 'minecraft:polished_diorite'
    ))).toBe(true);
    expect(forward.slice(4092).every(({ from, fromState, toState }) => (
      from[0] === 2288
      && (from[2] === -749 || from[2] === -748)
      && fromState === 'minecraft:polished_diorite'
      && toState === 'minecraft:air'
    ))).toBe(true);
    expect(rollback.slice(0, 4).every(({ fromState, toState }) => (
      fromState === 'minecraft:air' && toState === 'minecraft:polished_diorite'
    ))).toBe(true);
    expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
      from: operation.from,
      to: operation.to,
      fromState: operation.toState,
      toState: operation.fromState,
    })));
    expect(bodySha256(forwardPath)).toBe(manifest.operations[PACKAGE_KEY].forwardSha256);
    expect(bodySha256(rollbackPath)).toBe(manifest.operations[PACKAGE_KEY].rollbackSha256);
    expect(manifest.operations[PACKAGE_KEY]).toMatchObject({
      forwardSha256: '4c5dc2ad083ab18140088d9f69d56c4ce76bae2b3b9247de3296f9406ebc4501',
      rollbackSha256: 'a9c40fea93624f5a19bea19a317e5b97622bb49bc3c5edb9a5c1333bd83356c7',
      targetCellCount: 4096,
      targetCoordinateSetSha256:
        'f33fd0ef5f5139261e5408429b2111271b1e776c18dd67c3932db2e6becc269b',
      exactInverse: true,
      reverseOrderInverse: true,
      shellBeforeOpening: true,
      rollbackResealsBeforeShellRemoval: true,
    });
  });

  it('preserves R07E fail-closed and excludes all powered or commissioned scope', () => {
    const manifest = readManifest();
    expect(manifest.interfaces).toMatchObject({
      nominalR07hSeam: { cellCount: 2 },
      reviewedR07hApertureExtension: { cellCount: 2 },
      openedOwnedR07hTurnAperture: { cellCount: 4 },
      retainedR07hFarCapCollar: { cellCount: 8 },
      retainedR07eApproachCap: { cellCount: 12 },
      retainedFutureSummitSeam: { cellCount: 2 },
    });
    expect(manifest.scope.operationalBoundary).toMatchObject({
      r07hTurnApertureOpened: true,
      r07hEightCellCollarRetained: true,
      r07eApproachCapTouched: false,
      r07eApproachCapClosed: true,
      summitHeadhouseOpened: false,
      z11InterfaceTouched: false,
      railOrVehicleInstalled: false,
      powerControlOrBrakeInstalled: false,
      drainageOrOutfallInstalled: false,
      rescueOrEgressCommissioned: false,
      funicularCommissioned: false,
    });
  });

  it('has exact source partitions and zero static hazard or undeclared overlap', () => {
    const manifest = readManifest();
    expect(manifest.scope.sourcePartition).toMatchObject({
      sourceStateCensus: {
        'minecraft:air': 4092,
        'minecraft:polished_diorite': 4,
      },
      desiredStateCensus: {
        'minecraft:polished_diorite': 4092,
        'minecraft:air': 4,
      },
      exactPartition: true,
    });
    expect(manifest.safetyAudit).toMatchObject({
      interactionHalo: {
        cellCount: 12692,
        coordinateSetSha256:
          '1843cbf2d74b7b103ac58a769b6ef72c85b5cf09a26c5a2fe520b6282c0faaf1',
      },
      haloStateCensus: {
        'minecraft:air': 9428,
        'minecraft:stone': 2600,
        'minecraft:polished_diorite': 636,
        'minecraft:smooth_stone': 28,
      },
      fluidOrWaterloggedCount: 0,
      gravityCount: 0,
      forbiddenContainerOrControlCount: 0,
      blockEntityIntersectionCount: 0,
      savedEntityIntersectionCount: 0,
      protectedRelicIntersectionCount: 0,
      declaredR07hTurnApertureIntersectionCount: 1,
      undeclaredPriorReleaseIntersectionCount: 0,
      nominalTwoCellNegativeComponentCount: 2,
      projectedConnectedComponentCount: 1,
      projectedInteriorMismatchCount: 0,
      projectedBoundaryMismatchCount: 0,
    });
    expect((manifest.safetyAudit.priorReleaseIntersections as Array<ExactSet>))
      .toMatchObject([{ cellCount: 4, coordinateSetSha256:
        '9991feda6e953dd4e66585d7e23a61723c3319cb59c22782196fab028f2c08bb' }]);
  });

  it('passes exact source, projected rollback, parser, block-entity, and wrapper gates', () => {
    const forward = JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'forward-source-preflight.json'),
      'utf8',
    ));
    const rollback = JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'projected-rollback-preflight.json'),
      'utf8',
    ));
    expect(forward).toMatchObject({
      status: 'PASS',
      operationCount: 4096,
      passed: 4096,
      failed: 0,
      opsSha256: '653c4173be744e2efc3fa2ea632e07b8af1ee8abf92dda4b3f9cfd648ac80c8c',
      regionsSnapshot: {
        sha256: 'b0503fc70b8960c2f6a413c620136c5c0ecbd562093362f143e902f7376abc25',
      },
    });
    expect(rollback).toMatchObject({
      status: 'PASS',
      operationCount: 4096,
      passed: 4096,
      failed: 0,
      opsSha256: '72ea351a4d6b57b4b22989e080fbbbc1aa5be9b1299483a083ead21bae63ed1b',
      regionsSnapshot: {
        sha256: 'b0503fc70b8960c2f6a413c620136c5c0ecbd562093362f143e902f7376abc25',
      },
      sourceOverlays: { operationCount: 4096, passed: 4096, failed: 0 },
    });
    for (const [filename, role, operationSha256] of [
      ['forward-strict-dry-run.json', 'forward',
        '653c4173be744e2efc3fa2ea632e07b8af1ee8abf92dda4b3f9cfd648ac80c8c'],
      ['rollback-strict-dry-run.json', 'rollback',
        '72ea351a4d6b57b4b22989e080fbbbc1aa5be9b1299483a083ead21bae63ed1b'],
    ] as const) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')))
        .toMatchObject({
          status: 'dry_run',
          dryRun: true,
          strictNoop: true,
          operationRole: role,
          operationSha256,
          sourceOperationCount: 4096,
          sourceGroupCount: 4096,
          worldEditLeftoverCount: 0,
        });
    }
    expect(JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'block-entity-clearance.json'),
      'utf8',
    ))).toMatchObject({
      status: 'PASS',
      operationCount: 4096,
      targetChunkCount: 42,
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

  it('binds the manifest payload identity and preserves prepare-only scope', () => {
    const manifest = readManifest();
    const payload = { ...manifest };
    delete (payload as Partial<ReleaseManifest>).manifestIdentity;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifest.manifestIdentity);
    expect(manifest.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
    });
  });
});
