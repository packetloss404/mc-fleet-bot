import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r08ab_north_smoke_far_east_segment.mjs');
const CENSUS_SCRIPT = path.join(ROOT, 'scripts/census_combined_zones_r08ab_north_smoke_residual_blockers.mjs');
const WRAPPER = path.join(ROOT, 'scripts/run_combined_zones_scoped_release.mjs');
const BASENAME = 'combined-zones-r08ab-empty-eight-north-smoke-far-east-segment';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08ab-north-smoke-far-east-segment-offline');
const CENSUS = path.join(EVIDENCE, 'projected-residual-north-smoke-blocker-census.json');
const CENSUS_MD = path.join(EVIDENCE, 'projected-residual-north-smoke-blocker-census.md');
const KEYS = ['ee-smoke-n-far-east-compartment-wall'];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08ab-north-smoke-far-east-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const manifest = () => readJson(MANIFEST);
const paths = (directory: string) => [
  ...KEYS.flatMap((key) => [`${BASENAME}.${key}.forward.txt`, `${BASENAME}.${key}.rollback.txt`]),
  `${BASENAME}.release-manifest.json`,
].map((filename) => path.join(directory, filename));
const compileArgs = [SCRIPT, '--generated-at', '2026-08-22T01:05:00Z',
  '--snapshot', 'data/worldsnap-combined-zones-r08aa-post-20260822T004356Z',
  '--intake-audit', 'data/world-review/combined-zones-r08aa-live-20260822T004356Z/post-complete-save-intake.json',
  '--source-release-ledger', 'data/world-review/combined-zones-r08aa-live-20260822T004356Z/evidence-ledger.json',
  '--out-dir', temp, '--basename', BASENAME];

interface Op { point: string; fromState: string; toState: string }
const operations = (filename: string): Op[] => fs.readFileSync(filename, 'utf8').split(/\r?\n/)
  .filter((line) => line.startsWith('REPL ')).map((line) => {
    const fields = line.split(/\s+/);
    return { point: fields.slice(1, 4).join(','), fromState: fields[7], toState: fields[8] };
  });
let first: Buffer[] = [];
let censusFirst: Buffer[] = [];
beforeAll(() => {
  execFileSync(process.execPath, compileArgs, { cwd: ROOT, stdio: 'pipe' });
  first = paths(temp).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, compileArgs, { cwd: ROOT, stdio: 'pipe' });
  const censusArgs = [CENSUS_SCRIPT, '--out', path.join(temp, 'census.json'),
    '--md-out', path.join(temp, 'census.md')];
  execFileSync(process.execPath, censusArgs, { cwd: ROOT, stdio: 'pipe' });
  censusFirst = ['census.json', 'census.md'].map((filename) => fs.readFileSync(path.join(temp, filename)));
  execFileSync(process.execPath, censusArgs, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones CZ-R08AB Empty Eight north-smoke far-east segment', () => {
  it('regenerates all three artifacts byte-for-byte independent of --out-dir', () => {
    expect(paths(temp).map((filename) => fs.readFileSync(filename))).toEqual(first);
    expect(first).toEqual(paths('data/buildops').map((filename) => fs.readFileSync(path.join(ROOT, filename))));
  });

  it('binds the accepted R08AA post and unique residual clean full-height run', () => {
    expect(manifest()).toMatchObject({
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R08AA_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      scopeIds: ['OWN-D06-SMOKE', 'Z02-U1-CONCOURSE-MALL'],
      scope: { canonicalOwner: 'OWN-D06-SMOKE', masterScopeOwner: 'Z02-U1-CONCOURSE-MALL',
        geometry: { fullFrozenNorthBoundary: { cellCount: 1372 },
          selectedFarEastSegment: { cellCount: 14, widthCells: 2, heightCells: 7,
            coordinateSetSha256: 'd2edc1b2dd46e577ef7bf45dadc50a911e04792b468a88b3f68de97844fee2fb',
            topology: { componentCount: 1, largestComponentCellCount: 14 } },
          selectedWallField: { cellCount: 14 }, selectedOpeningReservationIntersection: { cellCount: 0 },
          interactionHalo: { cellCount: 46 } } },
      scopeSelection: { doctrine: 'MAXIMAL_CONTIGUOUS_FULL_HEIGHT_ZERO_HAZARD_COLUMN_RUN',
        rankedCleanRuns: [
          { minX: 1842, maxX: 1843, widthCells: 2 },
        ],
        selectedRun: { minX: 1842, maxX: 1843, widthCells: 2 },
        exactColumnFindingCount: 196,
        rejectedFullCompletion: { disposition: 'LOCAL_BLOCKED_WET_AND_GRAVITY_INTERFACES',
          exactPlaneFluidCount: 6, exactN06BlockedCellCount: 4 } },
      source: { snapshotRoot: 'data/worldsnap-combined-zones-r08aa-post-20260822T004356Z',
        completeSaveSha256: 'd0c8278796140888a0801d6152f9fc6d352cc297d388cea5bdf8ce06e4a6d2e6',
        regionSnapshotSha256: 'a52751c2f34f4dfd0931529421a5a235cc5a522b40a3d378fe01e4b5887244f9',
        exactTargetStateCensus: { 'minecraft:air': 14 },
        terminalReleaseLedger: { transactionId: 'combined-zones-r08aa-empty-eight-north-smoke-center-segment',
          completedReleaseIdentitySha256: '04440c644876ffb9736cde25b90cfb9c3f34808970b588575b38f59f00271f63' } },
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

  it('emits a deterministic exact census after the last clean run', () => {
    expect(['census.json', 'census.md'].map((filename) => (
      fs.readFileSync(path.join(temp, filename))
    ))).toEqual(censusFirst);
    expect(censusFirst).toEqual([fs.readFileSync(CENSUS), fs.readFileSync(CENSUS_MD)]);
    expect(readJson(CENSUS)).toMatchObject({
      status: 'PASS_R08AB_PROJECTED_NORTH_SMOKE_RESIDUAL_BLOCKER_CENSUS',
      summary: { fullPlaneCellCount: 1372, acceptedOpeningCapCellCount: 36,
        projectedR08ABCellCount: 14, residualCellCount: 267, residualColumnCount: 41,
        remainingCleanFullHeightRuns: [],
        primaryPartition: { wetInteractionCellCount: 147,
          gravityInteractionCellCount: 105, sourceStateBandCellCount: 15 },
        overlappingAnnotations: { n06GravityAdjacentCellCount: 21,
          openingReservationResidualCellCount: 0 } },
      exactSets: { allResidual: { cellCount: 267 }, wetInteraction: { cellCount: 147 },
        gravityInteraction: { cellCount: 105 }, sourceStateBand: { cellCount: 15 },
        n06GravityAdjacent: { cellCount: 21 }, openingReservationResidual: { cellCount: 0 },
        retainedOpeningCaps: { cellCount: 36 }, exactN06SourceCells: { cellCount: 4 } },
      disposition: { fullPlaneCompletionAuthorized: false, n06RemainsFailClosed: true,
        wetInterfacesRemainUntouched: true, poweredOpeningsRemainStaticCaps: true,
        worldMutationPerformed: false },
    });
    expect(readJson(CENSUS).residualBands).toEqual([
      { minX: 1702, maxX: 1702, widthCells: 1, primaryBlocker: 'WET_INTERACTION_BAND',
        n06Adjacent: false, residualCellCount: 7 },
      { minX: 1736, maxX: 1736, widthCells: 1, primaryBlocker: 'GRAVITY_INTERACTION_BAND',
        n06Adjacent: false, residualCellCount: 7 },
      { minX: 1737, maxX: 1739, widthCells: 3, primaryBlocker: 'GRAVITY_INTERACTION_BAND',
        n06Adjacent: true, residualCellCount: 21 },
      { minX: 1754, maxX: 1764, widthCells: 11, primaryBlocker: 'WET_INTERACTION_BAND',
        n06Adjacent: false, residualCellCount: 77 },
      { minX: 1765, maxX: 1765, widthCells: 1, primaryBlocker: 'SOURCE_STATE_BAND',
        n06Adjacent: false, residualCellCount: 7 },
      { minX: 1787, maxX: 1797, widthCells: 11, primaryBlocker: 'GRAVITY_INTERACTION_BAND',
        n06Adjacent: false, residualCellCount: 77 },
      { minX: 1833, maxX: 1841, widthCells: 9, primaryBlocker: 'WET_INTERACTION_BAND',
        n06Adjacent: false, residualCellCount: 63 },
      { minX: 1844, maxX: 1847, widthCells: 4, primaryBlocker: 'SOURCE_STATE_BAND',
        n06Adjacent: false, residualCellCount: 8 },
    ]);
  });

  it('emits one exact wall-only package and its reverse inverse', () => {
    const release = manifest();
    expect(release.executionOrder.forward).toEqual(KEYS);
    expect(release.executionOrder.rollback).toEqual(KEYS.slice().reverse());
    const expectedCounts = [14];
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
    expect(targets).toHaveLength(14);
    expect(new Set(targets).size).toBe(14);
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
        targetContainerOrControlIntersectionCount: 0, interactionHalo: { cellCount: 46,
          coordinateSetSha256: '890d10f82b23fb8160952168e9b1f4d2d684fb39673bb5924268a9d7ba3b84a2' },
        interactionHaloFluidCount: 0, interactionHaloGravityCount: 0,
        interactionHaloContainerOrControlCount: 0,
        blockEntityInteractionEnvelopeIntersectionCount: 0,
        savedEntityInteractionEnvelopeIntersectionCount: 0,
        protectedRelicInteractionEnvelopeIntersectionCount: 0,
        deferredFutureLineSealInteractionEnvelopeIntersectionCount: 0,
        isolatedN06Exception: { exactBlockedCellCount: 4, interactionEnvelopeIntersectionCount: 0,
          remainsFailClosedAndUnchanged: true },
        r02AirReservationSupersession: { cellCount: 14,
          desiredPriorStates: { 'minecraft:air': 14 } },
        checkedPriorManifestCount: 51, undeclaredPriorReleaseIntersectionCount: 0 },
    });
    const r08aa = manifest().isolation.acceptedPriorManifestChecks.find(
      ({ transactionId }: { transactionId: string }) => (
        transactionId === 'combined-zones-r08aa-empty-eight-north-smoke-center-segment'
      ),
    );
    expect(r08aa).toMatchObject({ targetIntersectionCount: 0 });
  });

  it('passes manifest, ordered source/rollback preflight, parser, and block-entity gates', () => {
    expect(readJson(path.join(EVIDENCE, 'manifest-qa.json'))).toMatchObject({
      status: 'PASS', totals: { packages: 1, passedPackages: 1, uniqueTargetCells: 14,
        crossPackageIntersectionCells: 0 },
    });
    const preflights = [
      ['ee-smoke-n-far-east-compartment-wall.forward-source-preflight.json', 14],
      ['ee-smoke-n-far-east-compartment-wall.projected-rollback-preflight.json', 14],
    ] as const;
    for (const [filename, count] of preflights) {
      expect(readJson(path.join(EVIDENCE, filename))).toMatchObject({ status: 'PASS',
        operationCount: count, passed: count, failed: 0,
        regionsSnapshot: { sha256: 'a52751c2f34f4dfd0931529421a5a235cc5a522b40a3d378fe01e4b5887244f9' } });
    }
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json'))).toMatchObject({
      status: 'PASS', operationCount: 14, blockingBlockEntityCount: 0,
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
    expect(manifestIdentity).toBe('640fef84412a9852db1e0eeb7504557e96ce98378b8d156e347bf6ee02671fbb');
  });
});
