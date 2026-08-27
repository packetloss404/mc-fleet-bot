import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r08y_north_smoke_central_west_segment.mjs');
const WRAPPER = path.join(ROOT, 'scripts/run_combined_zones_scoped_release.mjs');
const BASENAME = 'combined-zones-r08y-empty-eight-north-smoke-central-west-segment';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08y-north-smoke-central-west-segment-offline');
const KEYS = ['ee-smoke-n-central-west-compartment-wall', 'ee-smoke-n-central-west-static-opening-cap'];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08y-north-smoke-central-west-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const manifest = () => readJson(MANIFEST);
const paths = (directory: string) => [
  ...KEYS.flatMap((key) => [`${BASENAME}.${key}.forward.txt`, `${BASENAME}.${key}.rollback.txt`]),
  `${BASENAME}.release-manifest.json`,
].map((filename) => path.join(directory, filename));
const compileArgs = [SCRIPT, '--generated-at', '2026-08-22T00:20:00Z',
  '--snapshot', 'data/worldsnap-combined-zones-r08x-post-20260822T000635Z',
  '--intake-audit', 'data/world-review/combined-zones-r08x-live-20260822T000635Z/post-complete-save-intake.json',
  '--source-release-ledger', 'data/world-review/combined-zones-r08x-live-20260822T000635Z/evidence-ledger.json',
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

describe('Combined Zones CZ-R08Y Empty Eight north-smoke central-west segment', () => {
  it('regenerates all five artifacts byte-for-byte independent of --out-dir', () => {
    expect(paths(temp).map((filename) => fs.readFileSync(filename))).toEqual(first);
    expect(first).toEqual(paths('data/buildops').map((filename) => fs.readFileSync(path.join(ROOT, filename))));
  });

  it('binds the accepted R08X post and maximal still-unbuilt clean full-height run', () => {
    expect(manifest()).toMatchObject({
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R08X_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      scopeIds: ['OWN-D06-SMOKE', 'Z02-U1-CONCOURSE-MALL'],
      scope: { canonicalOwner: 'OWN-D06-SMOKE', masterScopeOwner: 'Z02-U1-CONCOURSE-MALL',
        geometry: { fullFrozenNorthBoundary: { cellCount: 1372 },
          selectedCentralWestSegment: { cellCount: 231, widthCells: 33, heightCells: 7,
            coordinateSetSha256: '5cb6cc1c0e3dbfced74768d6b7ffaeb0cef4874f796c4d5fa0fc21a8af6e620f',
            topology: { componentCount: 1, largestComponentCellCount: 231 } },
          selectedWallField: { cellCount: 222 }, selectedStaticOpeningCap: { cellCount: 9 },
          interactionHalo: { cellCount: 542 } } },
      scopeSelection: { doctrine: 'MAXIMAL_CONTIGUOUS_FULL_HEIGHT_ZERO_HAZARD_COLUMN_RUN',
        rankedCleanRuns: [
          { minX: 1703, maxX: 1735, widthCells: 33 },
          { minX: 1766, maxX: 1786, widthCells: 21 },
          { minX: 1740, maxX: 1753, widthCells: 14 },
          { minX: 1842, maxX: 1843, widthCells: 2 },
        ],
        selectedRun: { minX: 1703, maxX: 1735, widthCells: 33 },
        exactColumnFindingCount: 196,
        rejectedFullCompletion: { disposition: 'LOCAL_BLOCKED_WET_AND_GRAVITY_INTERFACES',
          exactPlaneFluidCount: 6, exactN06BlockedCellCount: 4 } },
      source: { snapshotRoot: 'data/worldsnap-combined-zones-r08x-post-20260822T000635Z',
        completeSaveSha256: 'be415f76248cc94f8358f4dd2553231726234450e5e4d5102667559a6329ce56',
        regionSnapshotSha256: 'd3ecb8a0e8c8080de4469dcb4bee84369fd9ec99afe5cd32a086afec4d995e87',
        exactTargetStateCensus: { 'minecraft:air': 231 },
        terminalReleaseLedger: { transactionId: 'combined-zones-r08x-empty-eight-north-smoke-east-segment',
          completedReleaseIdentitySha256: 'f149d854213ece928bebc1c13f2c8973ab7f8770a1406eb3e00aee529ba6cf45' } },
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

  it('emits two disjoint exact packages and reverse inverses', () => {
    const release = manifest();
    expect(release.executionOrder.forward).toEqual(KEYS);
    expect(release.executionOrder.rollback).toEqual(KEYS.slice().reverse());
    const expectedCounts = [222, 9];
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
    expect(targets).toHaveLength(231);
    expect(new Set(targets).size).toBe(231);
    expect(operations(path.join(ROOT, release.packages[0].forward))
      .every(({ toState }) => toState === 'minecraft:stone_bricks')).toBe(true);
    expect(operations(path.join(ROOT, release.packages[1].forward))
      .every(({ toState }) => toState === 'minecraft:polished_deepslate')).toBe(true);
  });

  it('proves zero-hazard isolation and keeps the incomplete boundary uncommissioned', () => {
    expect(manifest()).toMatchObject({
      scope: { operationalBoundary: { boundedStaticConstructionAccepted: true,
        completeNorthSmokeBoundaryBuilt: false, passiveNorthSmokeBoundaryCommissioned: false,
        poweredSmokeDoorMechanismAuthorized: false, wetInterfaceTouched: false,
        n06OrGravityInterfaceTouched: false, tenantOpeningCreated: false,
        publicRouteCommissioned: false } },
      isolation: { targetFluidIntersectionCount: 0, targetGravityIntersectionCount: 0,
        targetContainerOrControlIntersectionCount: 0, interactionHalo: { cellCount: 542,
          coordinateSetSha256: '8db77eba7b8ecf12d84c7e3aff8125594e4a8556367e014355ff306f016e2f1f' },
        interactionHaloFluidCount: 0, interactionHaloGravityCount: 0,
        interactionHaloContainerOrControlCount: 0,
        blockEntityInteractionEnvelopeIntersectionCount: 0,
        savedEntityInteractionEnvelopeIntersectionCount: 0,
        protectedRelicInteractionEnvelopeIntersectionCount: 0,
        deferredFutureLineSealInteractionEnvelopeIntersectionCount: 0,
        isolatedN06Exception: { exactBlockedCellCount: 4, interactionEnvelopeIntersectionCount: 0,
          remainsFailClosedAndUnchanged: true },
        r02AirReservationSupersession: { cellCount: 226,
          desiredPriorStates: { 'minecraft:air': 226 } },
        checkedPriorManifestCount: 48, undeclaredPriorReleaseIntersectionCount: 0 },
    });
    const r08x = manifest().isolation.acceptedPriorManifestChecks.find(
      ({ transactionId }: { transactionId: string }) => (
        transactionId === 'combined-zones-r08x-empty-eight-north-smoke-east-segment'
      ),
    );
    expect(r08x).toMatchObject({ targetIntersectionCount: 0 });
  });

  it('passes manifest, ordered source/rollback preflight, parser, and block-entity gates', () => {
    expect(readJson(path.join(EVIDENCE, 'manifest-qa.json'))).toMatchObject({
      status: 'PASS', totals: { packages: 2, passedPackages: 2, uniqueTargetCells: 231,
        crossPackageIntersectionCells: 0 },
    });
    const preflights = [
      ['ee-smoke-n-central-west-compartment-wall.forward-source-preflight.json', 222],
      ['ee-smoke-n-central-west-static-opening-cap.forward-source-preflight.json', 9],
      ['ee-smoke-n-central-west-static-opening-cap.projected-rollback-preflight.json', 9],
      ['ee-smoke-n-central-west-compartment-wall.projected-rollback-preflight.json', 222],
    ] as const;
    for (const [filename, count] of preflights) {
      expect(readJson(path.join(EVIDENCE, filename))).toMatchObject({ status: 'PASS',
        operationCount: count, passed: count, failed: 0,
        regionsSnapshot: { sha256: 'd3ecb8a0e8c8080de4469dcb4bee84369fd9ec99afe5cd32a086afec4d995e87' } });
    }
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json'))).toMatchObject({
      status: 'PASS', operationCount: 231, blockingBlockEntityCount: 0,
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
    expect(manifestIdentity).toBe('e6478ea5acb3487c76e925241efbbdba0ea3432dc3942703410778a3263636a6');
  });
});
