import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r08aa_north_smoke_center_segment.mjs');
const WRAPPER = path.join(ROOT, 'scripts/run_combined_zones_scoped_release.mjs');
const BASENAME = 'combined-zones-r08aa-empty-eight-north-smoke-center-segment';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08aa-north-smoke-center-segment-offline');
const KEYS = ['ee-smoke-n-center-compartment-wall'];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08aa-north-smoke-center-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const manifest = () => readJson(MANIFEST);
const paths = (directory: string) => [
  ...KEYS.flatMap((key) => [`${BASENAME}.${key}.forward.txt`, `${BASENAME}.${key}.rollback.txt`]),
  `${BASENAME}.release-manifest.json`,
].map((filename) => path.join(directory, filename));
const compileArgs = [SCRIPT, '--generated-at', '2026-08-22T00:40:00Z',
  '--snapshot', 'data/worldsnap-combined-zones-r08z-post-20260822T003120Z',
  '--intake-audit', 'data/world-review/combined-zones-r08z-live-20260822T003120Z/post-complete-save-intake.json',
  '--source-release-ledger', 'data/world-review/combined-zones-r08z-live-20260822T003120Z/evidence-ledger.json',
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

describe('Combined Zones CZ-R08AA Empty Eight north-smoke center segment', () => {
  it('regenerates all three artifacts byte-for-byte independent of --out-dir', () => {
    expect(paths(temp).map((filename) => fs.readFileSync(filename))).toEqual(first);
    expect(first).toEqual(paths('data/buildops').map((filename) => fs.readFileSync(path.join(ROOT, filename))));
  });

  it('binds the accepted R08Z post and maximal still-unbuilt clean full-height run', () => {
    expect(manifest()).toMatchObject({
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R08Z_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      scopeIds: ['OWN-D06-SMOKE', 'Z02-U1-CONCOURSE-MALL'],
      scope: { canonicalOwner: 'OWN-D06-SMOKE', masterScopeOwner: 'Z02-U1-CONCOURSE-MALL',
        geometry: { fullFrozenNorthBoundary: { cellCount: 1372 },
          selectedCenterSegment: { cellCount: 98, widthCells: 14, heightCells: 7,
            coordinateSetSha256: '3fbb019107872bba4d0a5bd26cc0d67e1c4a6eb1f01b13a2ca82713192ecf492',
            topology: { componentCount: 1, largestComponentCellCount: 98 } },
          selectedWallField: { cellCount: 98 }, selectedOpeningReservationIntersection: { cellCount: 0 },
          interactionHalo: { cellCount: 238 } } },
      scopeSelection: { doctrine: 'MAXIMAL_CONTIGUOUS_FULL_HEIGHT_ZERO_HAZARD_COLUMN_RUN',
        rankedCleanRuns: [
          { minX: 1740, maxX: 1753, widthCells: 14 },
          { minX: 1842, maxX: 1843, widthCells: 2 },
        ],
        selectedRun: { minX: 1740, maxX: 1753, widthCells: 14 },
        exactColumnFindingCount: 196,
        rejectedFullCompletion: { disposition: 'LOCAL_BLOCKED_WET_AND_GRAVITY_INTERFACES',
          exactPlaneFluidCount: 6, exactN06BlockedCellCount: 4 } },
      source: { snapshotRoot: 'data/worldsnap-combined-zones-r08z-post-20260822T003120Z',
        completeSaveSha256: '46b375521f06d7a0770ed272c92556a41bef58d31e05735eb7eec0a59f8747ed',
        regionSnapshotSha256: 'd7a7efaa717435dea1f23aaaa45c982cb97ecdf319dac65e7928e4db965bb4ec',
        exactTargetStateCensus: { 'minecraft:air': 98 },
        terminalReleaseLedger: { transactionId: 'combined-zones-r08z-empty-eight-north-smoke-central-east-segment',
          completedReleaseIdentitySha256: 'be4cbb77f5d2be379fd4b502810de2bf71a10e9ef8612639513615b18e0c1d78' } },
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
    const expectedCounts = [98];
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
    expect(targets).toHaveLength(98);
    expect(new Set(targets).size).toBe(98);
    expect(operations(path.join(ROOT, release.packages[0].forward))
      .every(({ toState }) => toState === 'minecraft:stone_bricks')).toBe(true);
    expect(release.packages).toHaveLength(1);
    expect(release.scope.geometry.selectedOpeningReservationIntersection.cellCount).toBe(0);
  });

  it('proves zero-hazard isolation and keeps the incomplete boundary uncommissioned', () => {
    expect(manifest()).toMatchObject({
      scope: { operationalBoundary: { boundedStaticConstructionAccepted: true,
        completeNorthSmokeBoundaryBuilt: false, passiveNorthSmokeBoundaryCommissioned: false,
        poweredSmokeDoorMechanismAuthorized: false, wetInterfaceTouched: false,
        n06OrGravityInterfaceTouched: false, tenantOpeningCreated: false,
        publicRouteCommissioned: false } },
      isolation: { targetFluidIntersectionCount: 0, targetGravityIntersectionCount: 0,
        targetContainerOrControlIntersectionCount: 0, interactionHalo: { cellCount: 238,
          coordinateSetSha256: '655ec215ca6a3f1834f9482087a11d0c8fc20cbeb47fb7729f01c8deb5c66142' },
        interactionHaloFluidCount: 0, interactionHaloGravityCount: 0,
        interactionHaloContainerOrControlCount: 0,
        blockEntityInteractionEnvelopeIntersectionCount: 0,
        savedEntityInteractionEnvelopeIntersectionCount: 0,
        protectedRelicInteractionEnvelopeIntersectionCount: 0,
        deferredFutureLineSealInteractionEnvelopeIntersectionCount: 0,
        isolatedN06Exception: { exactBlockedCellCount: 4, interactionEnvelopeIntersectionCount: 0,
          remainsFailClosedAndUnchanged: true },
        r02AirReservationSupersession: { cellCount: 86,
          desiredPriorStates: { 'minecraft:air': 86 } },
        checkedPriorManifestCount: 50, undeclaredPriorReleaseIntersectionCount: 0 },
    });
    const r08z = manifest().isolation.acceptedPriorManifestChecks.find(
      ({ transactionId }: { transactionId: string }) => (
        transactionId === 'combined-zones-r08z-empty-eight-north-smoke-central-east-segment'
      ),
    );
    expect(r08z).toMatchObject({ targetIntersectionCount: 0 });
  });

  it('passes manifest, ordered source/rollback preflight, parser, and block-entity gates', () => {
    expect(readJson(path.join(EVIDENCE, 'manifest-qa.json'))).toMatchObject({
      status: 'PASS', totals: { packages: 1, passedPackages: 1, uniqueTargetCells: 98,
        crossPackageIntersectionCells: 0 },
    });
    const preflights = [
      ['ee-smoke-n-center-compartment-wall.forward-source-preflight.json', 98],
      ['ee-smoke-n-center-compartment-wall.projected-rollback-preflight.json', 98],
    ] as const;
    for (const [filename, count] of preflights) {
      expect(readJson(path.join(EVIDENCE, filename))).toMatchObject({ status: 'PASS',
        operationCount: count, passed: count, failed: 0,
        regionsSnapshot: { sha256: 'd7a7efaa717435dea1f23aaaa45c982cb97ecdf319dac65e7928e4db965bb4ec' } });
    }
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json'))).toMatchObject({
      status: 'PASS', operationCount: 98, blockingBlockEntityCount: 0,
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
    expect(manifestIdentity).toBe('5ff8e27225dd2ac78179b4dedc1492096006aa7926ceb14d72e709d5b6016e98');
  });
});

