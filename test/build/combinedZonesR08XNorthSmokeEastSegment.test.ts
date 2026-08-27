import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r08x_north_smoke_east_segment.mjs');
const WRAPPER = path.join(ROOT, 'scripts/run_combined_zones_scoped_release.mjs');
const BASENAME = 'combined-zones-r08x-empty-eight-north-smoke-east-segment';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08x-north-smoke-east-segment-offline');
const KEYS = ['ee-smoke-n-east-compartment-wall', 'ee-smoke-n-east-static-opening-cap'];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08x-north-smoke-east-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const manifest = () => readJson(MANIFEST);
const paths = (directory: string) => [
  ...KEYS.flatMap((key) => [`${BASENAME}.${key}.forward.txt`, `${BASENAME}.${key}.rollback.txt`]),
  `${BASENAME}.release-manifest.json`,
].map((filename) => path.join(directory, filename));
const compileArgs = [SCRIPT, '--generated-at', '2026-08-22T00:10:00Z',
  '--snapshot', 'data/worldsnap-combined-zones-r08w-post-20260821T234958Z',
  '--intake-audit', 'data/world-review/combined-zones-r08w-live-20260821T234958Z/post-complete-save-intake.json',
  '--source-release-ledger', 'data/world-review/combined-zones-r08w-live-20260821T234958Z/evidence-ledger.json',
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

describe('Combined Zones CZ-R08X Empty Eight north-smoke east segment', () => {
  it('regenerates all five artifacts byte-for-byte independent of --out-dir', () => {
    expect(paths(temp).map((filename) => fs.readFileSync(filename))).toEqual(first);
    expect(first).toEqual(paths('data/buildops').map((filename) => fs.readFileSync(path.join(ROOT, filename))));
  });

  it('binds the accepted R08W post and maximal still-unbuilt clean full-height run', () => {
    expect(manifest()).toMatchObject({
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R08W_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      scopeIds: ['OWN-D06-SMOKE', 'Z02-U1-CONCOURSE-MALL'],
      scope: { canonicalOwner: 'OWN-D06-SMOKE', masterScopeOwner: 'Z02-U1-CONCOURSE-MALL',
        geometry: { fullFrozenNorthBoundary: { cellCount: 1372 },
          selectedEastSegment: { cellCount: 245, widthCells: 35, heightCells: 7,
            coordinateSetSha256: '9e8de5d464314c54f77a11524cb419e0d23ce55075363bf447b64f0eb59a47f8',
            topology: { componentCount: 1, largestComponentCellCount: 245 } },
          selectedWallField: { cellCount: 236 }, selectedStaticOpeningCap: { cellCount: 9 },
          interactionHalo: { cellCount: 574 } } },
      scopeSelection: { doctrine: 'MAXIMAL_CONTIGUOUS_FULL_HEIGHT_ZERO_HAZARD_COLUMN_RUN',
        rankedCleanRuns: [
          { minX: 1798, maxX: 1832, widthCells: 35 },
          { minX: 1703, maxX: 1735, widthCells: 33 },
          { minX: 1766, maxX: 1786, widthCells: 21 },
          { minX: 1740, maxX: 1753, widthCells: 14 },
          { minX: 1842, maxX: 1843, widthCells: 2 },
        ],
        selectedRun: { minX: 1798, maxX: 1832, widthCells: 35 },
        exactColumnFindingCount: 196,
        rejectedFullCompletion: { disposition: 'LOCAL_BLOCKED_WET_AND_GRAVITY_INTERFACES',
          exactPlaneFluidCount: 6, exactN06BlockedCellCount: 4 } },
      source: { snapshotRoot: 'data/worldsnap-combined-zones-r08w-post-20260821T234958Z',
        completeSaveSha256: 'fb0bc8910c8176f0e1a5aa4c4fa85e5857a6b131fd647d54a11d0a83a58ec377',
        regionSnapshotSha256: '095d596d823559e2790260e20d26338e1745c442374216f5e505818ead419244',
        exactTargetStateCensus: { 'minecraft:air': 245 },
        terminalReleaseLedger: { transactionId: 'combined-zones-r08w-empty-eight-north-smoke-west-segment',
          completedReleaseIdentitySha256: 'cf24047e94f4e7f1eaac0064f83675b4d1bbeac9b0ad2970b9ee398141a168b1' } },
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
    const expectedCounts = [236, 9];
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
    expect(targets).toHaveLength(245);
    expect(new Set(targets).size).toBe(245);
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
        targetContainerOrControlIntersectionCount: 0, interactionHalo: { cellCount: 574,
          coordinateSetSha256: 'dcf41fc61999c20282b8b23b5915c13679b8546349eeffb5988f90c97f301d13' },
        interactionHaloFluidCount: 0, interactionHaloGravityCount: 0,
        interactionHaloContainerOrControlCount: 0,
        blockEntityInteractionEnvelopeIntersectionCount: 0,
        savedEntityInteractionEnvelopeIntersectionCount: 0,
        protectedRelicInteractionEnvelopeIntersectionCount: 0,
        deferredFutureLineSealInteractionEnvelopeIntersectionCount: 0,
        isolatedN06Exception: { exactBlockedCellCount: 4, interactionEnvelopeIntersectionCount: 0,
          remainsFailClosedAndUnchanged: true },
        r02AirReservationSupersession: { cellCount: 235,
          desiredPriorStates: { 'minecraft:air': 235 } },
        checkedPriorManifestCount: 47, undeclaredPriorReleaseIntersectionCount: 0 },
    });
    const r08w = manifest().isolation.acceptedPriorManifestChecks.find(
      ({ transactionId }: { transactionId: string }) => (
        transactionId === 'combined-zones-r08w-empty-eight-north-smoke-west-segment'
      ),
    );
    expect(r08w).toMatchObject({ targetIntersectionCount: 0 });
  });

  it('passes manifest, ordered source/rollback preflight, parser, and block-entity gates', () => {
    expect(readJson(path.join(EVIDENCE, 'manifest-qa.json'))).toMatchObject({
      status: 'PASS', totals: { packages: 2, passedPackages: 2, uniqueTargetCells: 245,
        crossPackageIntersectionCells: 0 },
    });
    const preflights = [
      ['ee-smoke-n-east-compartment-wall.forward-source-preflight.json', 236],
      ['ee-smoke-n-east-static-opening-cap.forward-source-preflight.json', 9],
      ['ee-smoke-n-east-static-opening-cap.projected-rollback-preflight.json', 9],
      ['ee-smoke-n-east-compartment-wall.projected-rollback-preflight.json', 236],
    ] as const;
    for (const [filename, count] of preflights) {
      expect(readJson(path.join(EVIDENCE, filename))).toMatchObject({ status: 'PASS',
        operationCount: count, passed: count, failed: 0,
        regionsSnapshot: { sha256: '095d596d823559e2790260e20d26338e1745c442374216f5e505818ead419244' } });
    }
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json'))).toMatchObject({
      status: 'PASS', operationCount: 245, blockingBlockEntityCount: 0,
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
    expect(manifestIdentity).toBe('56daf423a9603e23342d1a3d7e1b6ac0677e4daaf28d38ba5a6bcc5b95f1ce3d');
  });
});
