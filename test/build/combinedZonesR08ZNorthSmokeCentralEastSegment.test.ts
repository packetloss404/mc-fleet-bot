import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r08z_north_smoke_central_east_segment.mjs');
const WRAPPER = path.join(ROOT, 'scripts/run_combined_zones_scoped_release.mjs');
const BASENAME = 'combined-zones-r08z-empty-eight-north-smoke-central-east-segment';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08z-north-smoke-central-east-segment-offline');
const KEYS = ['ee-smoke-n-central-east-compartment-wall', 'ee-smoke-n-central-east-static-opening-cap'];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08z-north-smoke-central-east-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const manifest = () => readJson(MANIFEST);
const paths = (directory: string) => [
  ...KEYS.flatMap((key) => [`${BASENAME}.${key}.forward.txt`, `${BASENAME}.${key}.rollback.txt`]),
  `${BASENAME}.release-manifest.json`,
].map((filename) => path.join(directory, filename));
const compileArgs = [SCRIPT, '--generated-at', '2026-08-22T00:30:00Z',
  '--snapshot', 'data/worldsnap-combined-zones-r08y-post-20260822T002056Z',
  '--intake-audit', 'data/world-review/combined-zones-r08y-live-20260822T002056Z/post-complete-save-intake.json',
  '--source-release-ledger', 'data/world-review/combined-zones-r08y-live-20260822T002056Z/evidence-ledger.json',
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

describe('Combined Zones CZ-R08Z Empty Eight north-smoke central-east segment', () => {
  it('regenerates all five artifacts byte-for-byte independent of --out-dir', () => {
    expect(paths(temp).map((filename) => fs.readFileSync(filename))).toEqual(first);
    expect(first).toEqual(paths('data/buildops').map((filename) => fs.readFileSync(path.join(ROOT, filename))));
  });

  it('binds the accepted R08Y post and maximal still-unbuilt clean full-height run', () => {
    expect(manifest()).toMatchObject({
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R08Y_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      scopeIds: ['OWN-D06-SMOKE', 'Z02-U1-CONCOURSE-MALL'],
      scope: { canonicalOwner: 'OWN-D06-SMOKE', masterScopeOwner: 'Z02-U1-CONCOURSE-MALL',
        geometry: { fullFrozenNorthBoundary: { cellCount: 1372 },
          selectedCentralEastSegment: { cellCount: 147, widthCells: 21, heightCells: 7,
            coordinateSetSha256: 'caaecae965f23ac574c7d9550d2022bd566b42950cade3bf84b106ecba73d5f5',
            topology: { componentCount: 1, largestComponentCellCount: 147 } },
          selectedWallField: { cellCount: 138 }, selectedStaticOpeningCap: { cellCount: 9 },
          interactionHalo: { cellCount: 350 } } },
      scopeSelection: { doctrine: 'MAXIMAL_CONTIGUOUS_FULL_HEIGHT_ZERO_HAZARD_COLUMN_RUN',
        rankedCleanRuns: [
          { minX: 1766, maxX: 1786, widthCells: 21 },
          { minX: 1740, maxX: 1753, widthCells: 14 },
          { minX: 1842, maxX: 1843, widthCells: 2 },
        ],
        selectedRun: { minX: 1766, maxX: 1786, widthCells: 21 },
        exactColumnFindingCount: 196,
        rejectedFullCompletion: { disposition: 'LOCAL_BLOCKED_WET_AND_GRAVITY_INTERFACES',
          exactPlaneFluidCount: 6, exactN06BlockedCellCount: 4 } },
      source: { snapshotRoot: 'data/worldsnap-combined-zones-r08y-post-20260822T002056Z',
        completeSaveSha256: '0c33e28a59ed52c668f3989a2db9e8b2b0a549d63e3447a1dd04f444810e7196',
        regionSnapshotSha256: '805a90e09710c3a045a292aeefbacb3960ac86d719191da6a563cede6cdbc1a0',
        exactTargetStateCensus: { 'minecraft:air': 147 },
        terminalReleaseLedger: { transactionId: 'combined-zones-r08y-empty-eight-north-smoke-central-west-segment',
          completedReleaseIdentitySha256: '319ca6769a42d7e809e981cdc9ae1e2cbbab86f4ca1fcb26fc7bd3390d0dacdd' } },
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
    const expectedCounts = [138, 9];
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
    expect(targets).toHaveLength(147);
    expect(new Set(targets).size).toBe(147);
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
        targetContainerOrControlIntersectionCount: 0, interactionHalo: { cellCount: 350,
          coordinateSetSha256: '1181c568f86298524cf15976dd8fdb90e73e2a829976c91342c2d947b9327542' },
        interactionHaloFluidCount: 0, interactionHaloGravityCount: 0,
        interactionHaloContainerOrControlCount: 0,
        blockEntityInteractionEnvelopeIntersectionCount: 0,
        savedEntityInteractionEnvelopeIntersectionCount: 0,
        protectedRelicInteractionEnvelopeIntersectionCount: 0,
        deferredFutureLineSealInteractionEnvelopeIntersectionCount: 0,
        isolatedN06Exception: { exactBlockedCellCount: 4, interactionEnvelopeIntersectionCount: 0,
          remainsFailClosedAndUnchanged: true },
        r02AirReservationSupersession: { cellCount: 147,
          desiredPriorStates: { 'minecraft:air': 147 } },
        checkedPriorManifestCount: 49, undeclaredPriorReleaseIntersectionCount: 0 },
    });
    const r08y = manifest().isolation.acceptedPriorManifestChecks.find(
      ({ transactionId }: { transactionId: string }) => (
        transactionId === 'combined-zones-r08y-empty-eight-north-smoke-central-west-segment'
      ),
    );
    expect(r08y).toMatchObject({ targetIntersectionCount: 0 });
  });

  it('passes manifest, ordered source/rollback preflight, parser, and block-entity gates', () => {
    expect(readJson(path.join(EVIDENCE, 'manifest-qa.json'))).toMatchObject({
      status: 'PASS', totals: { packages: 2, passedPackages: 2, uniqueTargetCells: 147,
        crossPackageIntersectionCells: 0 },
    });
    const preflights = [
      ['ee-smoke-n-central-east-compartment-wall.forward-source-preflight.json', 138],
      ['ee-smoke-n-central-east-static-opening-cap.forward-source-preflight.json', 9],
      ['ee-smoke-n-central-east-static-opening-cap.projected-rollback-preflight.json', 9],
      ['ee-smoke-n-central-east-compartment-wall.projected-rollback-preflight.json', 138],
    ] as const;
    for (const [filename, count] of preflights) {
      expect(readJson(path.join(EVIDENCE, filename))).toMatchObject({ status: 'PASS',
        operationCount: count, passed: count, failed: 0,
        regionsSnapshot: { sha256: '805a90e09710c3a045a292aeefbacb3960ac86d719191da6a563cede6cdbc1a0' } });
    }
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json'))).toMatchObject({
      status: 'PASS', operationCount: 147, blockingBlockEntityCount: 0,
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
    expect(manifestIdentity).toBe('b837c8cba2b4788b9350697dac09c538ad9dd8c678513399097a6211efd52580');
  });
});

