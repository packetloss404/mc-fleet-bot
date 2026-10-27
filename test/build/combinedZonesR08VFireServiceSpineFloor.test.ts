import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r08v_fire_service_spine_floor.mjs');
const BASENAME = 'combined-zones-r08v-empty-eight-fire-service-spine-floor';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08v-fire-service-spine-floor-offline');
const KEYS = ['ee-fire-spine-static-end-containment', 'ee-fire-spine-connected-floor'];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08v-fire-spine-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const manifest = () => readJson(MANIFEST);
const paths = (directory: string) => [
  ...KEYS.flatMap((key) => [`${BASENAME}.${key}.forward.txt`, `${BASENAME}.${key}.rollback.txt`]),
  `${BASENAME}.release-manifest.json`,
].map((filename) => path.join(directory, filename));
const compileArgs = [SCRIPT, '--generated-at', '2026-08-21T20:25:00Z',
  '--snapshot', 'data/worldsnap-combined-zones-r08u-post-20260821T201019Z',
  '--intake-audit', 'data/world-review/combined-zones-r08u-live-20260821T201019Z/post-complete-save-intake.json',
  '--source-release-ledger', 'data/world-review/combined-zones-r08u-live-20260821T201019Z/evidence-ledger.json',
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

describe('Combined Zones CZ-R08V Empty Eight fire/service spine floor', () => {
  it('regenerates all five artifacts byte-for-byte independent of --out-dir', () => {
    expect(paths(temp).map((filename) => fs.readFileSync(filename))).toEqual(first);
    expect(first).toEqual(paths('data/buildops').map((filename) => fs.readFileSync(path.join(ROOT, filename))));
  });

  it('binds the accepted R08U post and exact frozen fire/service-spine scope', () => {
    expect(manifest()).toMatchObject({
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R08U_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      scope: { canonicalOwner: 'OWN-D06-FIRE', selectedAlternativeId: 'FIRE-EG-B',
        materialDoctrine: {
          floor: { paletteId: 'EE-P07', block: 'minecraft:polished_blackstone' },
          containment: { paletteId: 'EE-P01', block: 'minecraft:stone_bricks' },
        },
        geometry: {
          frozenFireServiceSpine: { cellCount: 3025 },
          connectedFloor: { cellCount: 495, componentCount: 1,
            largestComponentCellCount: 495, widthCells: 5, lengthCells: 99,
            coordinateSetSha256: '6febdc51cfbf2d8eb55c6a9632d0b9a25e83008ba89d48a2856ce29e3660f8a2' },
          minimumThreeBlockHeadroom: { cellCount: 1485 },
          retainedMarkerLayer: { cellCount: 495 }, solidCeiling: { cellCount: 495 },
          retainedSolidSideContainment: { cellCount: 594 },
          northStaticEnd: { cellCount: 25 }, southStaticEnd: { cellCount: 25 },
          operatedEndContainment: { cellCount: 30 }, operatedUnion: { cellCount: 525 },
          interactionHalo: { cellCount: 1271 },
        } },
      source: { snapshotRoot: 'data/worldsnap-combined-zones-r08u-post-20260821T201019Z',
        completeSaveSha256: '6a1c3c12b900f3e646b4930c282ff9da81f213b8b5f49dbfd73233536c0b2f59',
        regionSnapshotSha256: 'dd4e62a6f74c5ce8427313a8fd1a470994926fb1270b3e34170ead06f4026217',
        exactTargetStateCensus: { 'minecraft:air': 525 },
        terminalReleaseLedger: { transactionId: 'combined-zones-r08u-empty-eight-internal-vent-caps',
          completedReleaseIdentitySha256: 'a1e608b0a3a52da11a65f6d87f20f39d292f2ef801bdab3a25fb39f26885ab91' } },
    });
  });

  it('orders exact static containment before the connected floor with reverse inverses', () => {
    const release = manifest();
    expect(release.executionOrder.forward).toEqual(KEYS);
    expect(release.executionOrder.rollback).toEqual(KEYS.slice().reverse());
    const expectedCounts = [30, 495];
    const points: string[] = [];
    release.packages.forEach((pkg: { forward: string; rollback: string }, index: number) => {
      const forward = operations(path.join(ROOT, pkg.forward));
      const rollback = operations(path.join(ROOT, pkg.rollback));
      expect(forward).toHaveLength(expectedCounts[index]);
      expect(forward.every(({ fromState }) => fromState === 'minecraft:air')).toBe(true);
      expect(rollback).toEqual(forward.slice().reverse().map((entry) => ({
        ...entry, fromState: entry.toState, toState: entry.fromState,
      })));
      points.push(...forward.map(({ point }) => point));
    });
    expect(points).toHaveLength(525);
    expect(new Set(points).size).toBe(525);
    expect(operations(path.join(ROOT, release.packages[0].forward))
      .every(({ toState }) => toState === 'minecraft:stone_bricks')).toBe(true);
    expect(operations(path.join(ROOT, release.packages[1].forward))
      .every(({ toState }) => toState === 'minecraft:polished_blackstone')).toBe(true);
  });

  it('proves exact isolation while all active and deferred interfaces remain fail-closed', () => {
    expect(manifest()).toMatchObject({
      scope: { operationalBoundary: { boundedConnectedSpaceBuilt: true,
        publicRouteCommissioned: false, fireServiceRouteCommissioned: false,
        egBSpineInterfaceOpened: false, northSmokeSystemCommissioned: false,
        wetNorthSmokeCellsTouched: false, n06Touched: false, activeMechanismsTouched: false,
        tenantOpeningsTouched: false, drainageHeaderOrExternalDischargeOpened: false } },
      scopeSelection: { alreadyExactStaticCandidates: {
        fireServiceInterfaceCapCellCount: 35, localDrainageCapCellCount: 24,
        alreadyDesiredCellCount: 59, operationsWritten: false },
        rejectedConnectedCandidates: { fullNorthSmokeBoundary: {
          disposition: 'LOCAL_BLOCKED_WET_AND_N06_ADJACENT', exactFluidCount: 6,
          n06BlockedCellCount: 4 } },
        selected: { frozenSpineReservationCellCount: 3025, exactSourceAirCellCount: 2997,
          floorCellCount: 495, containmentOperationCount: 30 } },
      isolation: { targetFluidIntersectionCount: 0, targetGravityIntersectionCount: 0,
        targetContainerOrControlIntersectionCount: 0, interactionHalo: { cellCount: 1271,
          coordinateSetSha256: '497ac00a4ab63ebfff56346cf98f54c68e0f15563dd8f8246c8a5c8b7b4ecb6c' },
        interactionHaloFluidCount: 0, interactionHaloGravityCount: 25,
        interactionHaloContainerOrControlCount: 0,
        retainedGravityHalo: { count: 25, allDurablySupportedAndUnaffected: true },
        blockEntityInteractionEnvelopeIntersectionCount: 0,
        savedEntityInteractionEnvelopeIntersectionCount: 0,
        protectedRelicInteractionEnvelopeIntersectionCount: 0,
        deferredFutureLineSealInteractionEnvelopeIntersectionCount: 0,
        r02AirReservationSupersession: { transactionId: 'combined-zones-r02-d06-shell',
          cellCount: 472, desiredPriorStates: { 'minecraft:air': 472 } },
        activeR02MechanismMaterialTargetIntersectionCount: 0,
        isolatedN06Exception: { exactBlockedCellCount: 4, interactionEnvelopeIntersectionCount: 0,
          remainsFailClosedAndUnchanged: true },
        northSmokeLocalContainment: { exactPlaneFluidCount: 6, selectedDryTargetCount: 20,
          selectedFluidTargetCount: 0, n06TargetOrHaloIntersectionCount: 0,
          fullBoundaryCommissioned: false },
        retainedFireServiceInterfaceCapCount: 35, retainedLocalDrainageCapCount: 24,
        checkedPriorManifestCount: 45, undeclaredPriorReleaseIntersectionCount: 0 },
    });
  });

  it('passes manifest, ordered source/rollback preflight, parser, and block-entity gates', () => {
    expect(readJson(path.join(EVIDENCE, 'manifest-qa.json'))).toMatchObject({
      status: 'PASS', totals: { packages: 2, passedPackages: 2, uniqueTargetCells: 525,
        crossPackageIntersectionCells: 0 },
    });
    const preflights = [
      ['ee-fire-spine-static-end-containment.forward-source-preflight.json', 30],
      ['ee-fire-spine-connected-floor.forward-source-preflight.json', 495],
      ['ee-fire-spine-connected-floor.projected-rollback-preflight.json', 495],
      ['ee-fire-spine-static-end-containment.projected-rollback-preflight.json', 30],
    ] as const;
    for (const [filename, count] of preflights) {
      expect(readJson(path.join(EVIDENCE, filename))).toMatchObject({ status: 'PASS',
        operationCount: count, passed: count, failed: 0,
        regionsSnapshot: { sha256: 'dd4e62a6f74c5ce8427313a8fd1a470994926fb1270b3e34170ead06f4026217' } });
    }
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json'))).toMatchObject({
      status: 'PASS', operationCount: 525, blockingBlockEntityCount: 0,
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
    expect(manifestIdentity).toBe('354ee10ad5e1cd9b3714f67f5b9909eb20fdf2f945c3cf6cfe9c4058e8ad85c0');
  });
});
