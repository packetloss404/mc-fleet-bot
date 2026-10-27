import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r08_north_galleria_retail_shells.mjs');
const BASENAME = 'combined-zones-r08r-n09-gravity-ordered-capped-retail-shell';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08r-n09-gravity-ordered-retail-shell-offline');
const KEYS = ['ee-r-n09-gravity-stabilization', 'ee-r-n09-gravity-extraction', 'ee-r-n09-capped-shell'];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08r-n09-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const manifest = () => readJson(MANIFEST);
const paths = (directory: string) => [
  ...KEYS.flatMap((key) => [`${BASENAME}.${key}.forward.txt`, `${BASENAME}.${key}.rollback.txt`]),
  `${BASENAME}.release-manifest.json`,
].map((filename) => path.join(directory, filename));
const compileArgs = [SCRIPT, '--generated-at', '2026-08-21T18:50:00Z',
  '--snapshot', 'data/worldsnap-combined-zones-r08p-post-20260821T184147Z',
  '--intake-audit', 'data/world-review/combined-zones-r08p-live-20260821T184147Z/post-complete-save-intake.json',
  '--source-release-ledger', 'data/world-review/combined-zones-r08p-live-20260821T184147Z/evidence-ledger.json',
  '--out-dir', temp, '--basename', BASENAME,
  '--release-id', 'CZ-R08R-N09-GRAVITY-ORDERED-CAPPED-RETAIL-SHELL',
  '--manifest-status', 'COMPILED_FROM_ACCEPTED_R08P_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  '--shell-id', 'EE-R-N09', '--isolate-target-gravity',
  '--prior-manifest', 'data/buildops/combined-zones-r07g-empty-eight-egress-headhouses.release-manifest.json',
  '--prior-manifest', 'data/buildops/combined-zones-r08-north-galleria-capped-retail-shells.release-manifest.json',
  '--prior-manifest', 'data/buildops/combined-zones-r09d-b07-terminal-crown.release-manifest.json',
  '--prior-manifest', 'data/buildops/combined-zones-r08-south-galleria-capped-retail-shells.release-manifest.json',
  '--prior-manifest', 'data/buildops/combined-zones-r08p-s09-gravity-stabilized-capped-retail-shell.release-manifest.json'];

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

describe('Combined Zones CZ-R08R N09 gravity-ordered capped retail shell', () => {
  it('regenerates the three-package release deterministically', () => {
    expect(paths(temp).map((filename) => fs.readFileSync(filename))).toEqual(first);
    expect(first.slice(0, 6)).toEqual(paths('data/buildops').slice(0, 6).map((filename) => fs.readFileSync(path.join(ROOT, filename))));
  });

  it('binds N09 and the accepted R08P post exactly', () => {
    expect(manifest()).toMatchObject({
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R08P_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      scope: { shellIds: ['EE-R-N09'], shellCount: 1, canonicalOwner: 'Z02-U1-CONCOURSE-MALL' },
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r08p-post-20260821T184147Z',
        completeSaveSha256: 'bf3f03362e1c920e89cf6eadbbb46926dbf7a204acd8eeae5f0182951f1a4505',
        terminalReleaseLedger: {
          transactionId: 'combined-zones-r08p-s09-gravity-stabilized-capped-retail-shell',
          completedReleaseIdentitySha256: 'f59ad1ae37ca9a2786c9b3f560bdfdffde250e9d38c000c0d059b39e96c9f9e3',
        },
      },
      target: {
        fullDesignUnion: { cellCount: 432, coordinateSetSha256: '3ba8349decbeaaee95a5105342cb1e663eeae6dcae7f751b37d8a2c2e64b627a' },
        completeFinalDesiredStateCensus: { 'minecraft:light_gray_concrete': 292, 'minecraft:air': 140 },
      },
    });
  });

  it('orders 45 stabilization, 12 extraction, and 375 shell transitions with exact inverses', () => {
    const release = manifest();
    expect(release.executionOrder.forward).toEqual(KEYS);
    expect(release.executionOrder.rollback).toEqual(KEYS.slice().reverse());
    const counts = [45, 12, 375];
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
    expect(points).toHaveLength(432);
    expect(new Set(points).size).toBe(432);
    const stabilization = operations(path.join(ROOT, release.packages[0].forward));
    const extraction = operations(path.join(ROOT, release.packages[1].forward));
    expect(stabilization.every(({ fromState, toState }) => fromState === 'minecraft:gravel' && toState === 'minecraft:light_gray_concrete')).toBe(true);
    expect(extraction.every(({ fromState, toState }) => fromState === 'minecraft:gravel' && toState === 'minecraft:air')).toBe(true);
  });

  it('proves durable source support, extraction ordering, and stable retained halo gravel', () => {
    const isolation = manifest().isolation;
    expect(isolation).toMatchObject({
      targetFluidIntersectionCount: 0, targetGravityIntersectionCount: 57,
      targetContainerOrControlIntersectionCount: 0,
      targetGravityStabilization: { count: 45, allBecomeStaticLiningBeforeShellExcavation: true, forwardOrder: 'bottom-up' },
      targetGravityExtraction: { count: 12, allExtractTopDownAfterStaticStabilization: true,
        forwardOrder: 'top-down', gravityAboveViolationCount: 0 },
      interactionHalo: { cellCount: 492 }, interactionHaloFluidCount: 0,
      retainedStableGravityHalo: { count: 26, allStablySupportedAndUnaffected: true },
      floorContacts: { cellCount: 108, gravityStateCount: 0, hazardousStateCount: 0 },
      blockEntityInteractionEnvelopeIntersectionCount: 0, savedEntityInteractionEnvelopeIntersectionCount: 0,
      protectedRelicInteractionEnvelopeIntersectionCount: 0,
      deferredFutureLineSealInteractionEnvelopeIntersectionCount: 0,
      checkedAcceptedPriorManifestCount: 35, undeclaredPriorReleaseIntersectionCount: 0,
    });
    expect([...isolation.targetGravityStabilization.findings, ...isolation.targetGravityExtraction.findings]
      .every(({ sourceGravityChainDurablySupported }: { sourceGravityChainDurablySupported: boolean }) => sourceGravityChainDurablySupported)).toBe(true);
    expect(isolation.retainedStableGravityHalo.findings
      .every(({ stableAndUnaffected }: { stableAndUnaffected: boolean }) => stableAndUnaffected)).toBe(true);
  });

  it('passes offline manifest, ordered preflight, parser, and block-entity gates', () => {
    expect(readJson(path.join(EVIDENCE, 'manifest-qa.json'))).toMatchObject({
      status: 'PASS', totals: { packages: 3, passedPackages: 3, uniqueTargetCells: 432, crossPackageIntersectionCells: 0 },
    });
    const preflights = [
      ['ee-r-n09-gravity-stabilization.forward-source-preflight.json', 45, 0],
      ['ee-r-n09-gravity-extraction.forward-source-preflight.json', 12, 45],
      ['ee-r-n09-capped-shell.forward-source-preflight.json', 375, 57],
      ['ee-r-n09-capped-shell.projected-rollback-preflight.json', 375, 432],
      ['ee-r-n09-gravity-extraction.projected-rollback-preflight.json', 12, 807],
      ['ee-r-n09-gravity-stabilization.projected-rollback-preflight.json', 45, 819],
    ] as const;
    for (const [filename, count, overlay] of preflights) expect(readJson(path.join(EVIDENCE, filename))).toMatchObject({
      status: 'PASS', operationCount: count, passed: count, failed: 0,
      regionsSnapshot: { sha256: 'b0503fc70b8960c2f6a413c620136c5c0ecbd562093362f143e902f7376abc25' },
      sourceOverlays: overlay ? { operationCount: overlay, passed: overlay, failed: 0 } : null,
    });
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json'))).toMatchObject({ status: 'PASS', operationCount: 432, blockingBlockEntityCount: 0 });
    for (const key of KEYS) for (const role of ['forward', 'rollback']) {
      expect(readJson(path.join(EVIDENCE, `${key}.${role}-strict-dry-run.json`))).toMatchObject({
        status: 'dry_run', strictNoop: true, operationRole: role, worldEditLeftoverCount: 0,
      });
    }
    const release = manifest();
    const { manifestIdentity, ...payload } = release;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')).toBe(manifestIdentity);
    expect(manifestIdentity).toBe('e669d6c9517ff10f2f3b9b49cfc57967421c8a5e7f4794c35de8fef577cb953a');
  });
});
