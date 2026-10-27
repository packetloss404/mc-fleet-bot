import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r08t_south_smoke_boundary.mjs');
const BASENAME = 'combined-zones-r08t-empty-eight-south-smoke-boundary';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08t-south-smoke-boundary-offline');
const KEYS = ['ee-smoke-s-compartment-wall', 'ee-smoke-s-static-opening-caps'];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08t-smoke-s-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const manifest = () => readJson(MANIFEST);
const paths = (directory: string) => [
  ...KEYS.flatMap((key) => [`${BASENAME}.${key}.forward.txt`, `${BASENAME}.${key}.rollback.txt`]),
  `${BASENAME}.release-manifest.json`,
].map((filename) => path.join(directory, filename));
const compileArgs = [SCRIPT, '--generated-at', '2026-08-21T19:30:00Z',
  '--snapshot', 'data/worldsnap-combined-zones-r08s-post-20260821T191247Z',
  '--intake-audit', 'data/world-review/combined-zones-r08s-live-20260821T191247Z/post-complete-save-intake.json',
  '--source-release-ledger', 'data/world-review/combined-zones-r08s-live-20260821T191247Z/evidence-ledger.json',
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

describe('Combined Zones CZ-R08T Empty Eight south smoke boundary', () => {
  it('regenerates the two-package release deterministically', () => {
    expect(paths(temp).map((filename) => fs.readFileSync(filename))).toEqual(first);
    expect(first).toEqual(paths('data/buildops')
      .map((filename) => fs.readFileSync(path.join(ROOT, filename))));
  });

  it('binds the accepted R08S post and exact passive life-safety contract', () => {
    expect(manifest()).toMatchObject({
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R08S_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      scope: {
        smokeBoundaryId: 'EE-SMOKE-S', canonicalOwner: 'OWN-D06-SMOKE',
        passiveBoundaryOnly: true, smokeDoorMechanismAuthorized: false,
        smokeSystemCommissioned: false,
        geometry: {
          retainedBoundaryPlane: { cellCount: 1336 }, staticOpeningCaps: { cellCount: 36 },
          completeFailClosedBoundary: { cellCount: 1372,
            coordinateSetSha256: '51d63bc45fdd53230f5ed9c3ed0df6777668eecc45a2017baa1eba6ed38c7a1e' },
          d06CoordinateSetSha256: '7055645cb0c309d8f57ae81fba68e933ca64f7f038259ec501e8b8c21402796f',
          completeBoundaryTopology: { componentCount: 1, largestComponentCellCount: 1372 },
          staticCapTopology: { componentCount: 4, componentSizes: [9, 9, 9, 9] },
        },
      },
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r08s-post-20260821T191247Z',
        completeSaveSha256: '71969f7c558ded938c6e8007b475bd3d8d6430642ee0d2c08e0d43a88741fd64',
        exactTargetStateCensus: { 'minecraft:air': 1368, 'minecraft:smooth_stone': 4 },
        terminalReleaseLedger: {
          transactionId: 'combined-zones-r08s-n07-fluid-ordered-capped-retail-shell',
          completedReleaseIdentitySha256: '97cdc01930456d6cad36457ece95abb8f87232b3c19e5d4c76dfb7cf846b6bf3',
        },
      },
      lifeSafetyContract: { contractId: 'IF-D06-EE-SMOKE-S-COMPARTMENT',
        classification: 'TERMINAL_CAP', accepted: true },
    });
  });

  it('builds 1,336 wall cells then 36 static caps with exact inverses', () => {
    const release = manifest();
    expect(release.executionOrder.forward).toEqual(KEYS);
    expect(release.executionOrder.rollback).toEqual(KEYS.slice().reverse());
    const expected = [
      { count: 1336, target: 'minecraft:stone_bricks' },
      { count: 36, target: 'minecraft:polished_deepslate' },
    ];
    const points: string[] = [];
    release.packages.forEach((pkg: { forward: string; rollback: string }, index: number) => {
      const forward = operations(path.join(ROOT, pkg.forward));
      const rollback = operations(path.join(ROOT, pkg.rollback));
      expect(forward).toHaveLength(expected[index].count);
      expect(forward.every(({ toState }) => toState === expected[index].target)).toBe(true);
      expect(rollback).toEqual(forward.slice().reverse().map((entry) => ({
        ...entry, fromState: entry.toState, toState: entry.fromState,
      })));
      points.push(...forward.map(({ point }) => point));
    });
    expect(points).toHaveLength(1372);
    expect(new Set(points).size).toBe(1372);
  });

  it('declares only the exact R02 reservation transition', () => {
    expect(manifest().priorReleaseTransition).toMatchObject({
      declaredTransitionId: 'R02_D06_RESERVATION_TO_R08T_PASSIVE_FAIL_CLOSED_BOUNDARY',
      acceptedR02TargetUnion: { cellCount: 1320 },
      reservationPackageIntersection: { cellCount: 1260,
        coordinateSetSha256: 'bd59e491951938f84f9c648d65175fabf2009e25d7eb139f3b9706af3a02c36b' },
      mechanismPackageIntersection: { cellCount: 60,
        coordinateSetSha256: '1f62e9385a239bb3276f9993ea47a0a23e0c7e16b1956b7ed04fc4758892f970' },
      sourceStatesStillMatchR02PostState: true,
      unownedSourceRemainder: { cellCount: 52, exactStateCensus: { 'minecraft:air': 52 } },
      checkedPriorManifestCount: 41, undeclaredPriorReleaseIntersectionCount: 0,
    });
  });

  it('preserves the halo, all 23 commissioned shells, N06, and protected interfaces', () => {
    expect(manifest().isolation).toMatchObject({
      targetFluidIntersectionCount: 0, targetGravityIntersectionCount: 0,
      targetContainerOrControlIntersectionCount: 0,
      faceInteractionHalo: { cellCount: 3150,
        coordinateSetSha256: '48901cc6c463551a9864407322fe4281374e4636a617c84fae907f7498d31918' },
      interactionHaloFluidCount: 0, interactionHaloContainerOrControlCount: 0,
      retainedGravityHalo: { count: 27, allStablySupportedAndUnaffected: true, maximumDependencyDepth: 4 },
      blockEntityInteractionEnvelopeIntersectionCount: 0,
      savedEntityInteractionEnvelopeIntersectionCount: 0,
      protectedRelicInteractionEnvelopeIntersectionCount: 0,
      deferredFutureLineSealInteractionEnvelopeIntersectionCount: 0,
      commissionedRetailShellPreservation: { shellCount: 23,
        fullCells: { cellCount: 9936 }, targetIntersectionCount: 0,
        faceHaloInterface: { cellCount: 576 }, exactStateViolationCount: 0, allUntouched: true },
      isolatedN06Exception: { exactBlockedCellCount: 4,
        interactionEnvelopeIntersectionCount: 0, remainsFailClosedAndUnchanged: true },
    });
  });

  it('passes exact manifest, ordered preflight, parser, and block-entity gates', () => {
    expect(readJson(path.join(EVIDENCE, 'manifest-qa.json'))).toMatchObject({
      status: 'PASS', totals: { packages: 2, passedPackages: 2, uniqueTargetCells: 1372,
        crossPackageIntersectionCells: 0 },
    });
    const preflights = [
      ['ee-smoke-s-compartment-wall.forward-source-preflight.json', 1336, 0],
      ['ee-smoke-s-static-opening-caps.forward-source-preflight.json', 36, 1336],
      ['ee-smoke-s-static-opening-caps.projected-rollback-preflight.json', 36, 1372],
      ['ee-smoke-s-compartment-wall.projected-rollback-preflight.json', 1336, 1408],
    ] as const;
    for (const [filename, count, overlay] of preflights) {
      const report = readJson(path.join(EVIDENCE, filename));
      expect(report).toMatchObject({ status: 'PASS', operationCount: count, passed: count, failed: 0,
        regionsSnapshot: { sha256: 'c47b325944bcfdb6327c775cec2c04cc58327295c5e6b1a00e775e1e4f1ad8e2' } });
      if (overlay) expect(report.sourceOverlays.operationCount).toBe(overlay);
    }
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json'))).toMatchObject({
      status: 'PASS', operationCount: 1372, blockingBlockEntityCount: 0,
    });
    for (const key of KEYS) for (const role of ['forward', 'rollback']) {
      expect(readJson(path.join(EVIDENCE, `${key}.${role}-strict-dry-run.json`))).toMatchObject({
        status: 'dry_run', strictNoop: true, operationRole: role, worldEditLeftoverCount: 0,
      });
    }
    const release = manifest();
    const { manifestIdentity, ...payload } = release;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')).toBe(manifestIdentity);
    expect(manifestIdentity).toBe('d8b75ef1c7df83fea7cfb9e4ac389dd4f001a8ebcd7ea6ccfaeb56e723a414da');
  });
});
