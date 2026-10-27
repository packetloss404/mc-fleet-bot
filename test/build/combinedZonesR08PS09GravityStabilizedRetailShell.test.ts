import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r08_north_galleria_retail_shells.mjs',
);
const BASENAME = 'combined-zones-r08p-s09-gravity-stabilized-capped-retail-shell';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r08p-s09-gravity-stabilized-retail-shell-offline',
);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'r08p-s09-retail-'));
const PACKAGE_KEYS = [
  'ee-r-s09-gravity-stabilization',
  'ee-r-s09-capped-shell',
];

interface Operation {
  point: string;
  fromState: string;
  toState: string;
}

const compileArgs = (outDir: string) => [
  SCRIPT,
  '--generated-at', '2026-08-21T18:36:00Z',
  '--snapshot', 'data/worldsnap-combined-zones-r08o-post-20260821T182348Z',
  '--intake-audit', 'data/world-review/combined-zones-r08o-live-20260821T182348Z/post-complete-save-intake.json',
  '--source-release-ledger', 'data/world-review/combined-zones-r08o-live-20260821T182348Z/evidence-ledger.json',
  '--out-dir', outDir,
  '--basename', BASENAME,
  '--release-id', 'CZ-R08P-S09-GRAVITY-STABILIZED-CAPPED-RETAIL-SHELL',
  '--manifest-status', 'COMPILED_FROM_ACCEPTED_R08O_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  '--shell-id', 'EE-R-S09',
  '--isolate-target-gravity',
  '--prior-manifest', 'data/buildops/combined-zones-r07g-empty-eight-egress-headhouses.release-manifest.json',
  '--prior-manifest', 'data/buildops/combined-zones-r08-north-galleria-capped-retail-shells.release-manifest.json',
  '--prior-manifest', 'data/buildops/combined-zones-r09d-b07-terminal-crown.release-manifest.json',
  '--prior-manifest', 'data/buildops/combined-zones-r08-south-galleria-capped-retail-shells.release-manifest.json',
];

const artifactPaths = (directory: string) => [
  ...PACKAGE_KEYS.flatMap((key) => [
    `${BASENAME}.${key}.forward.txt`,
    `${BASENAME}.${key}.rollback.txt`,
  ]),
  `${BASENAME}.release-manifest.json`,
].map((filename) => path.join(directory, filename));

const parseOperations = (filename: string): Operation[] => (
  fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '))
    .map((line) => {
      const fields = line.split(/\s+/);
      expect(fields).toHaveLength(9);
      expect(fields.slice(1, 4)).toEqual(fields.slice(4, 7));
      return {
        point: fields.slice(1, 4).join(','),
        fromState: fields[7],
        toState: fields[8],
      };
    })
);

const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const manifest = () => readJson(MANIFEST);
let firstCompile: Buffer[] = [];

beforeAll(() => {
  execFileSync(process.execPath, compileArgs(temporaryDirectory), { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, compileArgs(temporaryDirectory), { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R08P S09 gravity-stabilized capped retail shell', () => {
  it('regenerates the distinct two-package release byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
    expect(firstCompile.slice(0, 4)).toEqual(
      artifactPaths('data/buildops').slice(0, 4).map((filename) => (
        fs.readFileSync(path.join(ROOT, filename))
      )),
    );
  });

  it('binds only S09 to the accepted R08O immutable post state', () => {
    expect(manifest()).toMatchObject({
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R08O_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      scopeIds: ['Z02-U1-CONCOURSE-MALL'],
      scope: {
        releaseId: 'CZ-R08P-S09-GRAVITY-STABILIZED-CAPPED-RETAIL-SHELL',
        canonicalOwner: 'Z02-U1-CONCOURSE-MALL',
        shellIds: ['EE-R-S09'],
        shellCount: 1,
        wings: ['south galleria'],
      },
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r08o-post-20260821T182348Z',
        completeSaveSha256: 'fbb5a6ffa459e04beff352e3601268a319358c0affa7f4b6c2686fd61cf06cfe',
        terminalReleaseLedger: {
          transactionId: 'combined-zones-r08-south-galleria-capped-retail-shells',
          completedReleaseIdentitySha256: '873a6e79675265e4190baa9a8728d68120bbcc095eaa3dddad916b474a2e4922',
        },
      },
    });
  });

  it('isolates the one gravel transition before the disjoint 431-cell shell package', () => {
    const release = manifest();
    expect(release.executionOrder).toMatchObject({
      forward: PACKAGE_KEYS,
      rollback: PACKAGE_KEYS.slice().reverse(),
    });
    expect(release.packages.map(({ key }: { key: string }) => key)).toEqual(PACKAGE_KEYS);
    const stabilization = parseOperations(path.join(ROOT, release.packages[0].forward));
    const shell = parseOperations(path.join(ROOT, release.packages[1].forward));
    expect(stabilization).toEqual([{
      point: '1784,52,151',
      fromState: 'minecraft:gravel',
      toState: 'minecraft:light_gray_concrete',
    }]);
    expect(shell).toHaveLength(431);
    expect(shell.map(({ point }) => point)).not.toContain('1784,52,151');
    const all = [...stabilization, ...shell];
    expect(all).toHaveLength(432);
    expect(new Set(all.map(({ point }) => point)).size).toBe(432);
    for (const pkg of release.packages) {
      const forward = parseOperations(path.join(ROOT, pkg.forward));
      const rollback = parseOperations(path.join(ROOT, pkg.rollback));
      expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
        ...operation,
        fromState: operation.toState,
        toState: operation.fromState,
      })));
    }
  });

  it('proves the complete closed shell and exact gravity/support closure', () => {
    expect(manifest()).toMatchObject({
      scope: {
        union: {
          fullPrisms: {
            cellCount: 432,
            coordinateSetSha256: '9de7ea5709dbdca1be8e3201b38421f7333ee8f06c07655106234ee2101232f8',
          },
          completeBoundaries: { cellCount: 292 },
          connectedInteriorVoids: { cellCount: 140 },
          entranceCaps: { cellCount: 12 },
          shellsPairwiseDisjoint: true,
        },
      },
      target: {
        operatedUnion: { cellCount: 432 },
        packageTargetsDisjoint: true,
        completeFinalDesiredStateCensus: {
          'minecraft:light_gray_concrete': 292,
          'minecraft:air': 140,
        },
      },
      isolation: {
        targetFluidIntersectionCount: 0,
        targetGravityIntersectionCount: 1,
        targetContainerOrControlIntersectionCount: 0,
        targetGravityStabilization: {
          count: 1,
          allBecomeStaticLiningBeforeShellExcavation: true,
          forwardOrder: 'bottom-up',
          findings: [{
            cell: { x: 1784, y: 52, z: 151 },
            sourceState: 'minecraft:gravel',
            desiredState: 'minecraft:light_gray_concrete',
            targetDependency: [],
            terminalSupport: {
              cell: { x: 1784, y: 51, z: 151 },
              sourceState: 'minecraft:diorite',
              finalState: 'minecraft:light_gray_concrete',
            },
            stableBottomUpForwardOrder: true,
            exactRollbackRestoresGravityLast: true,
          }],
        },
        interactionHalo: {
          cellCount: 492,
          coordinateSetSha256: '841de7191e5ac1ad0f07025e5f7f33721982a6d11419e1e4f9ffcda4c4825fe2',
        },
        interactionHaloFluidCount: 0,
        interactionHaloContainerOrControlCount: 0,
        retainedStableGravityHalo: {
          count: 22,
          allStablySupportedAndUnaffected: true,
          faceAdjacentTargetCount: 13,
        },
        floorContacts: {
          cellCount: 108,
          gravityStateCount: 0,
          hazardousStateCount: 0,
          unchangedByRelease: true,
        },
        blockEntityInteractionEnvelopeIntersectionCount: 0,
        savedEntityInteractionEnvelopeIntersectionCount: 0,
        protectedRelicInteractionEnvelopeIntersectionCount: 0,
        deferredFutureLineSealInteractionEnvelopeIntersectionCount: 0,
        checkedAcceptedPriorManifestCount: 34,
        undeclaredPriorReleaseIntersectionCount: 0,
      },
    });
    const findings = manifest().isolation.retainedStableGravityHalo.findings;
    expect(findings.every(({ stableAndUnaffected }: { stableAndUnaffected: boolean }) => (
      stableAndUnaffected
    ))).toBe(true);
    expect(findings.filter(({ declaredSolidSupportTransitionCount }: { declaredSolidSupportTransitionCount: number }) => (
      declaredSolidSupportTransitionCount === 1
    ))).toHaveLength(1);
  });

  it('passes independent manifest, source, projected rollback, parser, and block-entity gates', () => {
    expect(readJson(path.join(EVIDENCE, 'manifest-qa.json'))).toMatchObject({
      status: 'PASS',
      totals: {
        packages: 2,
        passedPackages: 2,
        uniqueTargetCells: 432,
        crossPackageIntersectionCells: 0,
      },
    });
    const preflights = [
      ['ee-r-s09-gravity-stabilization.forward-source-preflight.json', 1, 0],
      ['ee-r-s09-capped-shell.forward-source-preflight.json', 431, 1],
      ['ee-r-s09-capped-shell.projected-rollback-preflight.json', 431, 432],
      ['ee-r-s09-gravity-stabilization.projected-rollback-preflight.json', 1, 863],
    ] as const;
    for (const [filename, count, overlayCount] of preflights) {
      expect(readJson(path.join(EVIDENCE, filename))).toMatchObject({
        status: 'PASS',
        operationCount: count,
        passed: count,
        failed: 0,
        regionsSnapshot: {
          sha256: '44aba5593c3177956b6484338f7d07f170c9f8128c4c142cf8bf4a7bb0771b67',
        },
        orderAwareProjection: true,
        sourceOverlays: overlayCount === 0 ? null : {
          operationCount: overlayCount,
          passed: overlayCount,
          failed: 0,
        },
      });
    }
    for (const key of PACKAGE_KEYS) {
      for (const role of ['forward', 'rollback']) {
        const dryRun = readJson(path.join(EVIDENCE, `${key}.${role}-strict-dry-run.json`));
        expect(dryRun).toMatchObject({
          status: 'dry_run',
          strictNoop: true,
          operationRole: role,
          commandCount: key.endsWith('gravity-stabilization') ? 1 : 431,
          worldEditLeftoverCount: 0,
        });
      }
    }
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json'))).toMatchObject({
      status: 'PASS',
      operationCount: 432,
      blockingBlockEntityCount: 0,
    });
  });

  it('binds canonical identity and makes no live or execution claim', () => {
    const release = manifest();
    const { manifestIdentity, ...payload } = release;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
    expect(manifestIdentity).toBe('5df6682203afb52a5dce2386ef5ef7285aab2ccf4d5844856af11fbda4d789a2');
    expect(release.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      liveEntityClearancePerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
    });
  });
});
