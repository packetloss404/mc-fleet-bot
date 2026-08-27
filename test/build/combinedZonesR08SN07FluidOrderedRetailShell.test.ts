import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r08_north_galleria_retail_shells.mjs');
const BASENAME = 'combined-zones-r08s-n07-fluid-ordered-capped-retail-shell';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08s-n07-fluid-ordered-retail-shell-offline');
const KEYS = ['ee-r-n07-complete-wet-boundary-liner', 'ee-r-n07-contained-interior-fluid-extraction', 'ee-r-n07-interior-shell-clear'];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08s-n07-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const manifest = () => readJson(MANIFEST);
const paths = (directory: string) => [
  ...KEYS.flatMap((key) => [`${BASENAME}.${key}.forward.txt`, `${BASENAME}.${key}.rollback.txt`]),
  `${BASENAME}.release-manifest.json`,
].map((filename) => path.join(directory, filename));
const compileArgs = [SCRIPT, '--generated-at', '2026-08-21T19:05:00Z',
  '--snapshot', 'data/worldsnap-combined-zones-r08r-post-20260821T185546Z',
  '--intake-audit', 'data/world-review/combined-zones-r08r-live-20260821T185546Z/post-complete-save-intake.json',
  '--source-release-ledger', 'data/world-review/combined-zones-r08r-live-20260821T185546Z/evidence-ledger.json',
  '--out-dir', temp, '--basename', BASENAME,
  '--release-id', 'CZ-R08S-N07-FLUID-ORDERED-CAPPED-RETAIL-SHELL',
  '--manifest-status', 'COMPILED_FROM_ACCEPTED_R08R_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  '--shell-id', 'EE-R-N07', '--isolate-target-fluid',
  '--prior-manifest', 'data/buildops/combined-zones-r08-north-galleria-capped-retail-shells.release-manifest.json',
  '--prior-manifest', 'data/buildops/combined-zones-r08-south-galleria-capped-retail-shells.release-manifest.json',
  '--prior-manifest', 'data/buildops/combined-zones-r08p-s09-gravity-stabilized-capped-retail-shell.release-manifest.json',
  '--prior-manifest', 'data/buildops/combined-zones-r08r-n09-gravity-ordered-capped-retail-shell.release-manifest.json'];

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

describe('Combined Zones CZ-R08S N07 fluid-ordered capped retail shell', () => {
  it('regenerates the three-package release deterministically', () => {
    expect(paths(temp).map((filename) => fs.readFileSync(filename))).toEqual(first);
    expect(first.slice(0, 6)).toEqual(paths('data/buildops').slice(0, 6)
      .map((filename) => fs.readFileSync(path.join(ROOT, filename))));
  });

  it('binds N07 and the accepted R08R post exactly', () => {
    expect(manifest()).toMatchObject({
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R08R_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      scope: { shellIds: ['EE-R-N07'], shellCount: 1, canonicalOwner: 'Z02-U1-CONCOURSE-MALL' },
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r08r-post-20260821T185546Z',
        completeSaveSha256: 'd4140700680f5ea6e7e6aea4f421f74788a780a8ca268feed1d4cfee46e06ee7',
        terminalReleaseLedger: {
          transactionId: 'combined-zones-r08r-n09-gravity-ordered-capped-retail-shell',
          completedReleaseIdentitySha256: '0506c0f0c9e89a0ecd00ee1a575623b86f8d98488f2394662a32718a53135936',
        },
      },
      target: {
        fullDesignUnion: { cellCount: 432, coordinateSetSha256: 'aa66292dd9988fce99237a141593707a9c8f9a9eb319e4a940e283df41ecfd4d' },
        operatedUnion: { cellCount: 401, coordinateSetSha256: '56c8db897b309725b91c0431f2d0c1d35202dc511324f0b72fcd62afc9c6ef0b' },
        completeFinalDesiredStateCensus: { 'minecraft:light_gray_concrete': 292, 'minecraft:air': 140 },
      },
    });
  });

  it('orders complete boundary, contained drain, and interior clear with exact inverses', () => {
    const release = manifest();
    expect(release.executionOrder.forward).toEqual(KEYS);
    expect(release.executionOrder.rollback).toEqual(KEYS.slice().reverse());
    const counts = [292, 3, 106];
    const points: string[] = [];
    release.packages.forEach((pkg: { forward: string; rollback: string }, index: number) => {
      const forward = operations(path.join(ROOT, pkg.forward));
      const rollback = operations(path.join(ROOT, pkg.rollback));
      expect(forward).toHaveLength(counts[index]);
      expect(rollback).toEqual(forward.slice().reverse().map((entry) => ({
        ...entry, fromState: entry.toState, toState: entry.fromState,
      })));
      points.push(...forward.map(({ point }) => point));
    });
    expect(points).toHaveLength(401);
    expect(new Set(points).size).toBe(401);
    const boundary = operations(path.join(ROOT, release.packages[0].forward));
    const boundaryKinds = boundary.map(({ fromState }) => (
      fromState === 'minecraft:air' ? 'air' : /^(minecraft:water|minecraft:bubble_column)/.test(fromState) ? 'fluid' : 'solid'
    ));
    expect(boundaryKinds).toEqual([...boundaryKinds].sort((a, b) => ['air', 'fluid', 'solid'].indexOf(a) - ['air', 'fluid', 'solid'].indexOf(b)));
    expect(boundary.filter(({ fromState }) => /^(minecraft:water|minecraft:bubble_column)/.test(fromState))).toHaveLength(23);
  });

  it('proves the exact fluid partition, bubble support, and retained wet halo', () => {
    expect(manifest().isolation).toMatchObject({
      targetFluidIntersectionCount: 26, targetGravityIntersectionCount: 0,
      targetContainerOrControlIntersectionCount: 0,
      targetFluidSequence: {
        totalCount: 26,
        exactSourceStateCensus: { 'minecraft:water[level=0]': 24, 'minecraft:bubble_column[drag=true]': 2 },
        exactTargets: { cellCount: 26, coordinateSetSha256: '14ca1664eec374651b07e986c9ed2a7de28278287a0efa0fbba7653fe6d8f3e6' },
        boundaryCount: 23, interiorCount: 3, completeBoundaryBeforeInteriorExtraction: true,
        bubbleColumnsSupportedByRetainedExactLowerColumns: true,
        rollbackRestoresInteriorFluidBeforeBoundaryFluid: true,
        rollbackRestoresBoundaryAirAfterBoundaryFluid: true,
      },
      retainedFluidHalo: { count: 50, faceAdjacentCellCount: 37, faceAdjacencyCount: 37,
        allUntouched: true, allAdjacentFinalInterfacesStatic: true },
      interactionHalo: { cellCount: 492 }, interactionHaloFluidCount: 50,
      retainedStableGravityHalo: { count: 0, allStablySupportedAndUnaffected: true },
      floorContacts: { cellCount: 108, gravityStateCount: 0, hazardousStateCount: 24,
        unchangedByRelease: true, staticLiningRequiresGravitySupport: false },
      blockEntityInteractionEnvelopeIntersectionCount: 0, savedEntityInteractionEnvelopeIntersectionCount: 0,
      protectedRelicInteractionEnvelopeIntersectionCount: 0,
      deferredFutureLineSealInteractionEnvelopeIntersectionCount: 0,
      undeclaredPriorReleaseIntersectionCount: 0,
    });
  });

  it('passes offline manifest, ordered preflight, parser, and block-entity gates', () => {
    expect(readJson(path.join(EVIDENCE, 'manifest-qa.json'))).toMatchObject({
      status: 'PASS', totals: { packages: 3, passedPackages: 3, uniqueTargetCells: 401, crossPackageIntersectionCells: 0 },
    });
    const preflights = [
      ['ee-r-n07-complete-wet-boundary-liner.forward-source-preflight.json', 292, 0],
      ['ee-r-n07-contained-interior-fluid-extraction.forward-source-preflight.json', 3, 292],
      ['ee-r-n07-interior-shell-clear.forward-source-preflight.json', 106, 295],
      ['ee-r-n07-interior-shell-clear.projected-rollback-preflight.json', 106, 401],
      ['ee-r-n07-contained-interior-fluid-extraction.projected-rollback-preflight.json', 3, 507],
      ['ee-r-n07-complete-wet-boundary-liner.projected-rollback-preflight.json', 292, 510],
    ] as const;
    for (const [filename, count, overlay] of preflights) expect(readJson(path.join(EVIDENCE, filename))).toMatchObject({
      status: 'PASS', operationCount: count, passed: count, failed: 0,
      regionsSnapshot: { sha256: '464303a11a3b091afa7b0504b13b43b49da20f62bf3ef3cc8709321dde837f52' },
      sourceOverlays: overlay ? { operationCount: overlay, passed: overlay, failed: 0 } : null,
    });
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json'))).toMatchObject({
      status: 'PASS', operationCount: 401, blockingBlockEntityCount: 0,
    });
    for (const key of KEYS) for (const role of ['forward', 'rollback']) {
      expect(readJson(path.join(EVIDENCE, `${key}.${role}-strict-dry-run.json`))).toMatchObject({
        status: 'dry_run', strictNoop: true, operationRole: role, worldEditLeftoverCount: 0,
      });
    }
    const release = manifest();
    const { manifestIdentity, ...payload } = release;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')).toBe(manifestIdentity);
    expect(manifestIdentity).toBe('ef3c89c666eb1e5f55b4e48ec0b9f04b6e89bf4464d0df5a995b3a211f7f2b2f');
  });
});
