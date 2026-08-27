import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT,
  'scripts/compile_combined_zones_r08ac_north_smoke_supported_gravity_west_segment.mjs');
const WRAPPER = path.join(ROOT, 'scripts/run_combined_zones_scoped_release.mjs');
const BASENAME = 'combined-zones-r08ac-empty-eight-north-smoke-supported-gravity-west-segment';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08ac-north-smoke-supported-gravity-west-segment-offline');
const KEYS = ['ee-smoke-n-supported-gravity-west-compartment-wall'];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08ac-north-smoke-supported-gravity-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const manifest = () => readJson(MANIFEST);
const paths = (directory: string) => [
  ...KEYS.flatMap((key) => [`${BASENAME}.${key}.forward.txt`, `${BASENAME}.${key}.rollback.txt`]),
  `${BASENAME}.release-manifest.json`,
].map((filename) => path.join(directory, filename));
const compileArgs = [SCRIPT, '--generated-at', '2026-08-22T01:15:00Z',
  '--snapshot', 'data/worldsnap-combined-zones-r08ab-post-20260822T005922Z',
  '--intake-audit', 'data/world-review/combined-zones-r08ab-live-20260822T005922Z/post-complete-save-intake.json',
  '--source-release-ledger', 'data/world-review/combined-zones-r08ab-live-20260822T005922Z/evidence-ledger.json',
  '--out-dir', temp, '--basename', BASENAME];

interface Op { point: string; fromState: string; toState: string }
const operations = (filename: string): Op[] => fs.readFileSync(filename, 'utf8').split(/\r?\n/)
  .filter((line) => line.startsWith('REPL ')).map((line) => {
    const fields = line.split(/\s+/);
    return { point: fields.slice(1, 4).join(','), fromState: fields[7], toState: fields[8] };
  });
let first: Buffer[] = [];
beforeAll(() => {
  execFileSync(process.execPath, compileArgs, { cwd: ROOT, stdio: 'pipe' });
  first = paths(temp).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, compileArgs, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones CZ-R08AC Empty Eight north-smoke supported-gravity west segment', () => {
  it('regenerates all three artifacts byte-for-byte independent of --out-dir', () => {
    expect(paths(temp).map((filename) => fs.readFileSync(filename))).toEqual(first);
    expect(first).toEqual(paths('data/buildops').map((filename) => fs.readFileSync(path.join(ROOT, filename))));
  });

  it('binds the accepted R08AB post and maximal durably supported gravity-adjacent full-height run', () => {
    expect(manifest()).toMatchObject({
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R08AB_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      scopeIds: ['OWN-D06-SMOKE', 'Z02-U1-CONCOURSE-MALL'],
      scope: { canonicalOwner: 'OWN-D06-SMOKE', masterScopeOwner: 'Z02-U1-CONCOURSE-MALL',
        geometry: { fullFrozenNorthBoundary: { cellCount: 1372 },
          selectedSupportedGravityWestSegment: { cellCount: 35, widthCells: 5, heightCells: 7,
            coordinateSetSha256: 'b5db94035c1c48956f60e8aed3e2290502fbc18a89dd21739253bff66265e99b',
            topology: { componentCount: 1, largestComponentCellCount: 35 } },
          selectedWallField: { cellCount: 35 }, selectedOpeningReservationIntersection: { cellCount: 0 },
          interactionHalo: { cellCount: 94 } } },
      scopeSelection: { doctrine: 'MAXIMAL_CONTIGUOUS_FULL_HEIGHT_DURABLY_SUPPORTED_GRAVITY_ADJACENT_RUN',
        rankedSupportedGravityRuns: [
          { minX: 1787, maxX: 1791, widthCells: 5 },
          { minX: 1796, maxX: 1797, widthCells: 2 },
        ],
        selectedRun: { minX: 1787, maxX: 1791, widthCells: 5 },
        exactColumnFindingCount: 196,
        rejectedFullCompletion: { disposition: 'LOCAL_BLOCKED_WET_AND_GRAVITY_INTERFACES',
          exactPlaneFluidCount: 6, exactN06BlockedCellCount: 4 } },
      source: { snapshotRoot: 'data/worldsnap-combined-zones-r08ab-post-20260822T005922Z',
        completeSaveSha256: 'f9612be6c862f1693ce9c7be60e3fcc5eeb5e7a305d5ca62632d10b22bb606cb',
        regionSnapshotSha256: '4d0fc4568f8cded612e3d552520cc640056ad8c9a962379746e3069f8fe6bf7a',
        exactTargetStateCensus: { 'minecraft:air': 35 },
        terminalReleaseLedger: { transactionId: 'combined-zones-r08ab-empty-eight-north-smoke-far-east-segment',
          completedReleaseIdentitySha256: '478d681e6df3255cf3f28742a8a00220b668754f9747777c4eab617a9d13c6e3' } },
    });
  });

  it('passes the scoped wrapper read-only plan contract before handoff', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [WRAPPER,
      '--manifest', path.relative(ROOT, MANIFEST),
      '--release-node', 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      '--print-plan'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    expect(plan).toMatchObject({
      mode: 'PREPARE_ONLY',
      globalGateDependency: 'NONE',
      packageOrder: KEYS,
    });
    expect(plan.stages).toContain('exact-release-manifest-qa');
  });

  it('emits one exact wall-only package and its reverse inverse', () => {
    const release = manifest();
    expect(release.executionOrder.forward).toEqual(KEYS);
    expect(release.executionOrder.rollback).toEqual(KEYS.slice().reverse());
    const expectedCounts = [35];
    const targets: string[] = [];
    release.packages.forEach((pkg: { forward: string; rollback: string }, index: number) => {
      const forward = operations(path.join(ROOT, pkg.forward));
      const rollback = operations(path.join(ROOT, pkg.rollback));
      expect(forward).toHaveLength(expectedCounts[index]);
      expect(forward.every(({ fromState }) => fromState === 'minecraft:air')).toBe(true);
      expect(rollback).toEqual(forward.slice().reverse().map((entry) => ({
        ...entry, fromState: entry.toState, toState: entry.fromState,
      })));
      targets.push(...forward.map(({ point }) => point));
    });
    expect(targets).toHaveLength(35);
    expect(new Set(targets).size).toBe(35);
    expect(operations(path.join(ROOT, release.packages[0].forward))
      .every(({ toState }) => toState === 'minecraft:stone_bricks')).toBe(true);
    expect(release.packages).toHaveLength(1);
    expect(release.scope.geometry.selectedOpeningReservationIntersection.cellCount).toBe(0);
  });

  it('proves exact durable retained-gravity closure and keeps the boundary uncommissioned', () => {
    expect(manifest()).toMatchObject({
      scope: { operationalBoundary: { boundedStaticConstructionAccepted: true,
        completeNorthSmokeBoundaryBuilt: false, passiveNorthSmokeBoundaryCommissioned: false,
        poweredSmokeDoorMechanismAuthorized: false, wetInterfaceTouched: false,
        n06OrGravityInterfaceTouched: false, tenantOpeningCreated: false,
        publicRouteCommissioned: false } },
      isolation: { targetFluidIntersectionCount: 0, targetGravityIntersectionCount: 0,
        targetContainerOrControlIntersectionCount: 0, interactionHalo: { cellCount: 94,
          coordinateSetSha256: 'dc0cf7a4bd279a5f6e0ee6dc346508aa850f3ccb4d798ab7158e80b859b3fc8f' },
        interactionHaloFluidCount: 0, interactionHaloGravityCount: 22,
        interactionHaloContainerOrControlCount: 0,
        retainedGravitySupportClosure: {
          sourceGravityCellSet: { cellCount: 22,
            coordinateSetSha256: 'f850e96fa6aa6294ec30749346ef7a9da747f17940ccfd827bb4d7b92f320c2f' },
          dependencyGravityCellSet: { cellCount: 22,
            coordinateSetSha256: 'f850e96fa6aa6294ec30749346ef7a9da747f17940ccfd827bb4d7b92f320c2f' },
          closureCount: 22, durableTerminalSupportCount: 22,
          targetOrOperationIntersectionCount: 0 },
        blockEntityInteractionEnvelopeIntersectionCount: 0,
        savedEntityInteractionEnvelopeIntersectionCount: 0,
        protectedRelicInteractionEnvelopeIntersectionCount: 0,
        deferredFutureLineSealInteractionEnvelopeIntersectionCount: 0,
        isolatedN06Exception: { exactBlockedCellCount: 4, interactionEnvelopeIntersectionCount: 0,
          remainsFailClosedAndUnchanged: true },
        r02AirReservationSupersession: { cellCount: 35,
          desiredPriorStates: { 'minecraft:air': 35 } },
        checkedPriorManifestCount: 52, undeclaredPriorReleaseIntersectionCount: 0 },
    });
    const r08ab = manifest().isolation.acceptedPriorManifestChecks.find(
      ({ transactionId }: { transactionId: string }) => (
        transactionId === 'combined-zones-r08ab-empty-eight-north-smoke-far-east-segment'
      ),
    );
    expect(r08ab).toMatchObject({ targetIntersectionCount: 0 });
  });

  it('passes manifest, ordered source/rollback preflight, parser, and block-entity gates', () => {
    expect(readJson(path.join(EVIDENCE, 'manifest-qa.json'))).toMatchObject({
      status: 'PASS', totals: { packages: 1, passedPackages: 1, uniqueTargetCells: 35,
        crossPackageIntersectionCells: 0 },
    });
    const preflights = [
      ['ee-smoke-n-supported-gravity-west-compartment-wall.forward-source-preflight.json', 35],
      ['ee-smoke-n-supported-gravity-west-compartment-wall.projected-rollback-preflight.json', 35],
    ] as const;
    for (const [filename, count] of preflights) {
      expect(readJson(path.join(EVIDENCE, filename))).toMatchObject({ status: 'PASS',
        operationCount: count, passed: count, failed: 0,
        regionsSnapshot: { sha256: '4d0fc4568f8cded612e3d552520cc640056ad8c9a962379746e3069f8fe6bf7a' } });
    }
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json'))).toMatchObject({
      status: 'PASS', operationCount: 35, blockingBlockEntityCount: 0,
    });
    for (const key of KEYS) for (const role of ['forward', 'rollback']) {
      expect(readJson(path.join(EVIDENCE, `${key}.${role}-strict-dry-run.json`))).toMatchObject({
        status: 'dry_run', strictNoop: true, operationRole: role, worldEditLeftoverCount: 0,
      });
    }
  });

  it('binds the complete deterministic manifest payload', () => {
    const release = manifest();
    const { manifestIdentity, ...payload } = release;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')).toBe(manifestIdentity);
    expect(manifestIdentity).toBe('3509c4b5df3e01e5c64741a3e395eebf04269cd6fc6a8db14ab3daad2b7cfb96');
  });
});

