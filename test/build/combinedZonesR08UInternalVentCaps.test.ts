import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r08u_internal_vent_caps.mjs');
const BASENAME = 'combined-zones-r08u-empty-eight-internal-vent-caps';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08u-internal-vent-caps-offline');
const KEYS = ['ee-vent-nw-gravity-safe-internal-cap', 'ee-vent-four-internal-compartment-caps'];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08u-vent-caps-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const manifest = () => readJson(MANIFEST);
const paths = (directory: string) => [
  ...KEYS.flatMap((key) => [`${BASENAME}.${key}.forward.txt`, `${BASENAME}.${key}.rollback.txt`]),
  `${BASENAME}.release-manifest.json`,
].map((filename) => path.join(directory, filename));
const compileArgs = [SCRIPT, '--generated-at', '2026-08-21T19:55:00Z',
  '--snapshot', 'data/worldsnap-combined-zones-r08t-post-20260821T194152Z',
  '--intake-audit', 'data/world-review/combined-zones-r08t-live-20260821T194152Z/post-complete-save-intake.json',
  '--source-release-ledger', 'data/world-review/combined-zones-r08t-live-20260821T194152Z/evidence-ledger.json',
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

describe('Combined Zones CZ-R08U Empty Eight internal vent caps', () => {
  it('regenerates all five artifacts byte-for-byte independent of --out-dir', () => {
    expect(paths(temp).map((filename) => fs.readFileSync(filename))).toEqual(first);
    expect(first).toEqual(paths('data/buildops').map((filename) => fs.readFileSync(path.join(ROOT, filename))));
  });

  it('binds the accepted R08T post and selected VENT-A static-cap geometry', () => {
    expect(manifest()).toMatchObject({
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R08T_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      scope: { canonicalOwner: 'OWN-D06-VENT', selectedAlternativeId: 'VENT-A-FOUR-INDEPENDENT-LOCAL-RISERS',
        passiveCapsOnly: true, riserExcavationAuthorized: false, exteriorOutletOpened: false,
        ventilationMechanismAuthorized: false, ventilationCommissioned: false,
        geometry: {
          internalCompartmentCaps: { cellCount: 36,
            coordinateSetSha256: '14993e347856c00cd95a2de0fb5490141fa93a994ff3466fcc0b59e310a6aaee' },
          alreadyClosedExteriorOutletCaps: { cellCount: 36 },
          completePassiveCapUnion: { cellCount: 72 },
          retainedUnexcavatedRiserReservations: { cellCount: 900 },
        } },
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r08t-post-20260821T194152Z',
        completeSaveSha256: 'fcde819dd413b3ec9920d56c81c797d56a92b7f66c0f4216cdbcad23451adbec',
        exactTargetStateCensus: { 'minecraft:stone': 26, 'minecraft:andesite': 5,
          'minecraft:air': 1, 'minecraft:copper_ore': 1, 'minecraft:diorite': 1,
          'minecraft:granite': 1, 'minecraft:gravel': 1 },
        terminalReleaseLedger: { transactionId: 'combined-zones-r08t-empty-eight-south-smoke-boundary',
          completedReleaseIdentitySha256: '0ad2b587ea12f84e1490ce7b32d4a2946e9c593544d05994e9b6dd476630ed8f' },
      },
      target: { operatedUnion: { cellCount: 36 },
        completeFinalDesiredStateCensus: { 'minecraft:polished_deepslate': 36 },
        alreadyDesiredExteriorCapCount: 36 },
    });
  });

  it('orders one durable gravity transition then 35 static-cap transitions with exact inverses', () => {
    const release = manifest();
    expect(release.executionOrder.forward).toEqual(KEYS);
    expect(release.executionOrder.rollback).toEqual(KEYS.slice().reverse());
    const expectedCounts = [1, 35];
    const points: string[] = [];
    release.packages.forEach((pkg: { forward: string; rollback: string }, index: number) => {
      const forward = operations(path.join(ROOT, pkg.forward));
      const rollback = operations(path.join(ROOT, pkg.rollback));
      expect(forward).toHaveLength(expectedCounts[index]);
      expect(forward.every(({ toState }) => toState === 'minecraft:polished_deepslate')).toBe(true);
      expect(rollback).toEqual(forward.slice().reverse().map((entry) => ({
        ...entry, fromState: entry.toState, toState: entry.fromState,
      })));
      points.push(...forward.map(({ point }) => point));
    });
    expect(operations(path.join(ROOT, release.packages[0].forward))[0]).toEqual({
      point: '1643,54,49', fromState: 'minecraft:gravel', toState: 'minecraft:polished_deepslate',
    });
    expect(points).toHaveLength(36);
    expect(new Set(points).size).toBe(36);
  });

  it('proves durable gravity, exact isolation, and the north-smoke local blocker', () => {
    expect(manifest()).toMatchObject({
      scopeSelection: {
        complementaryNorthSmokeBoundary: {
          disposition: 'LOCAL_BLOCKED_PRESERVE_N06_UNSUPPORTED_GRAVEL_AND_WET_SOURCE',
          exactPlane: { cellCount: 1372 }, targetFluidCount: 6,
          n06FaceAdjacentCellCount: 4, executableOperationsWritten: false,
        },
        selectedNextLargestStaticCapDelta: { internalVentCapCellCount: 36,
          fireServiceCapCandidateCellCount: 35, drainageLocalCapCandidateCellCount: 24 },
      },
      isolation: {
        targetFluidIntersectionCount: 0, targetGravityIntersectionCount: 1,
        targetContainerOrControlIntersectionCount: 0,
        targetGravityClosure: { cell: { x: 1643, y: 54, z: 49 }, dependencyDepth: 3,
          terminalSupportState: 'minecraft:andesite', durablySupported: true },
        interactionHalo: { cellCount: 120,
          coordinateSetSha256: '2e3b8849f49054b1cd803cb2a81b0a874052a448c84d7e5892ac183fd3bbb1a1' },
        interactionHaloFluidCount: 0, interactionHaloGravityCount: 4,
        retainedGravityHalo: { count: 4, allDurablySupportedAndUnaffected: true },
        blockEntityInteractionEnvelopeIntersectionCount: 0,
        savedEntityInteractionEnvelopeIntersectionCount: 0,
        protectedRelicInteractionEnvelopeIntersectionCount: 0,
        deferredFutureLineSealInteractionEnvelopeIntersectionCount: 0,
        acceptedR08TInteractionEnvelopeIntersectionCount: 0,
        isolatedN06Exception: { exactBlockedCellCount: 4,
          interactionEnvelopeIntersectionCount: 0, remainsFailClosedAndUnchanged: true },
        checkedPriorManifestCount: 42, undeclaredPriorReleaseIntersectionCount: 0,
      },
    });
  });

  it('passes exact manifest, ordered preflight, parser, and block-entity gates', () => {
    expect(readJson(path.join(EVIDENCE, 'manifest-qa.json'))).toMatchObject({
      status: 'PASS', totals: { packages: 2, passedPackages: 2, uniqueTargetCells: 36,
        crossPackageIntersectionCells: 0 },
    });
    const preflights = [
      ['ee-vent-nw-gravity-safe-internal-cap.forward-source-preflight.json', 1, 0],
      ['ee-vent-four-internal-compartment-caps.forward-source-preflight.json', 35, 1],
      ['ee-vent-four-internal-compartment-caps.projected-rollback-preflight.json', 35, 36],
      ['ee-vent-nw-gravity-safe-internal-cap.projected-rollback-preflight.json', 1, 71],
    ] as const;
    for (const [filename, count, overlay] of preflights) {
      const report = readJson(path.join(EVIDENCE, filename));
      expect(report).toMatchObject({ status: 'PASS', operationCount: count, passed: count, failed: 0,
        regionsSnapshot: { sha256: '42001ae747a852e64aead34dcdcfa67b5c22dd45ba25cd49385b633b40155023' } });
      if (overlay) expect(report.sourceOverlays.operationCount).toBe(overlay);
    }
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json'))).toMatchObject({
      status: 'PASS', operationCount: 36, blockingBlockEntityCount: 0,
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
    expect(manifestIdentity).toBe('066880c728aa2211667833086a58647f27fdc86cb991e5cffce760e62a178863');
  });
});
