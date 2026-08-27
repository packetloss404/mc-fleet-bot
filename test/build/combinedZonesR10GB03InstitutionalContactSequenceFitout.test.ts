import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r10g-b03-institutional-contact-sequence-fitout';
const MANIFEST_PATH = path.join(ROOT, 'data/buildops', `${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r10g-b03-institutional-contact-sequence-fitout-offline-20260822T030500Z',
);
const WRAPPER = path.join(ROOT, 'scripts/run_combined_zones_scoped_release.mjs');
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Record<string, any>;
const sha256 = (filename: string) => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r10g-fitout-'));

afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

function operationBody(filename: string) {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/).filter((line) => line.startsWith('REPL '));
}

describe('Combined Zones R10G B03 institutional contact-sequence fit-out', () => {
  it('binds the accepted R12J terminal and compiles deterministically', () => {
    expect(manifest).toMatchObject({
      manifestIdentity: 'f4cba8ea0e4fdb3a8c5e036675c9ca9fac1842b8cffe1a4605e2297fc5d52ea4',
      releaseNodeId: 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
      mvpScope: true,
      source: {
        completeSaveSha256: 'b814512643bc92ef3b0932b35f8fe12c984355dd0edb22c6e61d15130f9d38c9',
        regionSnapshotSha256: 'f8aad22ebf1a95182a3e8989f51f814cbd4217d85c7e73ee85be8b2c6ca4bcfb',
        predecessor: {
          completedReleaseIdentitySha256: '9aae3a36cd327825e85604cf7adfecb92d24ec9ef35db96ef36e048e75fd4c36',
          postQaPayloadSha256: 'c4ae5ead1b20ac18fcb4720f3706f522ca98baaa434c7bcf202088fe898981b1',
        },
      },
    });
    const outDir = path.join(temp, 'buildops');
    const entityReport = path.join(temp, 'evidence', 'immutable-entity-clearance.json');
    const args = [
      path.join(ROOT, 'scripts/compile_combined_zones_r10g_b03_institutional_contact_sequence_fitout.mjs'),
      '--out-dir', outDir,
      '--basename', BASENAME,
      '--entity-report', entityReport,
    ];
    execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
    const firstManifest = sha256(path.join(outDir, `${BASENAME}.release-manifest.json`));
    const firstOperations = fs.readdirSync(outDir).sort().map((name) => [name, sha256(path.join(outDir, name))]);
    execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
    expect(sha256(path.join(outDir, `${BASENAME}.release-manifest.json`))).toBe(firstManifest);
    expect(fs.readdirSync(outDir).sort().map((name) => [name, sha256(path.join(outDir, name))])).toEqual(firstOperations);
  }, 30_000);

  it('has two disjoint exact reverse-order packages', () => {
    expect(manifest.packages.map(({ key }: { key: string }) => key)).toEqual([
      'z08-institutional-contact-sequence-liner',
      'z10-cheyenne-approach-extension-liner',
    ]);
    expect(manifest.executionOrder).toMatchObject({
      forward: ['z08-institutional-contact-sequence-liner', 'z10-cheyenne-approach-extension-liner'],
      rollback: ['z10-cheyenne-approach-extension-liner', 'z08-institutional-contact-sequence-liner'],
    });
    for (const pkg of manifest.packages) {
      const forward = operationBody(path.join(ROOT, pkg.forward));
      const rollback = operationBody(path.join(ROOT, pkg.rollback));
      const expectedRollback = forward.slice().reverse().map((line) => {
        const fields = line.split(' ');
        return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
      });
      expect(rollback).toEqual(expectedRollback);
      expect(forward).toHaveLength(manifest.operations[pkg.key].targetCellCount);
    }
  });

  it('fits the complete frozen institutional range at the exact ownership seam', () => {
    expect(manifest.scope).toMatchObject({
      acceptedCenterlineRange: { firstIndex: 471, lastIndex: 767, pointCount: 297 },
      ownership: {
        contact: {
          canonicalOwner: 'Z08-CONTACT-SEQUENCE-FITOUT',
          firstIndex: 471,
          lastIndex: 759,
          pointCount: 289,
          liner: { cellCount: 5202 },
        },
        cheyenneApproachExtension: {
          canonicalOwner: 'Z10-CHEYENNE-FITOUT',
          firstIndex: 760,
          lastIndex: 767,
          pointCount: 8,
          liner: { cellCount: 144 },
        },
        ownershipOverlapCellCount: 0,
        exactSplitAtZ10MinimumX: true,
      },
    });
    expect(manifest.target).toMatchObject({
      operatedUnion: { cellCount: 5346 },
      packageTargetsDisjoint: true,
      routeVoid: { cellCount: 5940 },
      desiredStateCensus: {
        'minecraft:polished_blackstone_bricks': 18,
        'minecraft:polished_granite': 3799,
        'minecraft:sea_lantern': 49,
        'minecraft:smooth_stone': 1480,
      },
    });
  });

  it('preserves the air route, both seams, and every hard safety boundary', () => {
    expect(manifest.scope.geometry).toMatchObject({
      preservedRouteVoid: { cellCount: 5940 },
      upstreamOpenInteriorSeam: { centerlineIndex: 470, routeVoid: { cellCount: 20 }, statePreserved: true },
      downstreamAcceptedR10aInteriorSeam: { centerlineIndex: 768, routeVoid: { cellCount: 20 }, statePreserved: true },
      securityFrame: { cellCount: 18 },
      passiveFixtures: { cellCount: 49 },
    });
    expect(manifest.preservation).toMatchObject({
      completeCurrentSourceStateGuardCount: 5346,
      acceptedR10aTargetIntersectionCount: 0,
      routeOperationIntersectionCount: 0,
      haloHazardCount: 0,
      blockEntityIntersectionCount: 0,
      savedEntityIntersectionCount: 0,
      protectedRelicIntersectionCount: 0,
    });
    expect(manifest.safetyAudit).toMatchObject({
      halo: { cellCount: 21528 },
      fluidCellCount: 0,
      gravityCellCount: 0,
      forbiddenContainerOrControlCellCount: 0,
      activeMechanismCellCount: 0,
      blockEntityCount: 0,
      savedEntityCount: 0,
      exactAirRoutePreserved: true,
    });
    expect(manifest.scope.operationalBoundary).toMatchObject({
      routeVoidPreserved: true,
      secureOrPublicRouteCommissioned: false,
      accessControlMechanismCommissioned: false,
      activeSystemInstalled: false,
      exteriorOpeningCreated: false,
      chamberOpened: false,
      rescueOrEgressCommissioned: false,
    });
  });

  it('passes every offline release gate and the real wrapper plan', () => {
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'manifest-qa.json'), 'utf8')))
      .toMatchObject({ status: 'PASS', passed: true, totals: { packages: 2, uniqueTargetCells: 5346 } });
    for (const [filename, count] of [
      ['z08-forward-source-preflight.json', 5202],
      ['z10-forward-source-preflight.json', 144],
      ['z10-projected-rollback-preflight.json', 144],
      ['z08-projected-rollback-preflight.json', 5202],
    ] as const) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')))
        .toMatchObject({ status: 'PASS', passed: count, failed: 0 });
    }
    for (const [filename, role, count] of [
      ['z08-forward-strict-dry-run.json', 'forward', 5202],
      ['z08-rollback-strict-dry-run.json', 'rollback', 5202],
      ['z10-forward-strict-dry-run.json', 'forward', 144],
      ['z10-rollback-strict-dry-run.json', 'rollback', 144],
    ] as const) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')))
        .toMatchObject({
          status: 'dry_run', strictNoop: true, operationRole: role,
          sourceOperationCount: count, worldEditLeftoverCount: 0,
        });
    }
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'block-entity-clearance.json'), 'utf8')))
      .toMatchObject({ status: 'PASS', blockingBlockEntityCount: 0 });
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'immutable-entity-clearance.json'), 'utf8')))
      .toMatchObject({ status: 'PASS', blockEntityIntersectionCount: 0, savedEntityIntersectionCount: 0 });
    const plan = JSON.parse(execFileSync(process.execPath, [
      WRAPPER,
      '--manifest', path.relative(ROOT, MANIFEST_PATH),
      '--release-node', 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8' }));
    expect(plan).toEqual(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'wrapper-plan.json'), 'utf8')));
  });

  it('seals a complete 14/14 offline QA result without live mutation', () => {
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'offline-qa.json'), 'utf8')))
      .toMatchObject({
        status: 'PASS_R10G_B03_INSTITUTIONAL_CONTACT_SEQUENCE_FITOUT_OFFLINE_READY',
        manifestIdentity: 'f4cba8ea0e4fdb3a8c5e036675c9ca9fac1842b8cffe1a4605e2297fc5d52ea4',
        targetCellCount: 5346,
        routeVoidCellCount: 5940,
        packageCount: 2,
        packageTargetCounts: [5202, 144],
        centerlinePointCount: 297,
        interactionHaloCellCount: 21528,
        summary: { checkCount: 14, passCount: 14, failCount: 0 },
        liveCallsPerformed: false,
        worldMutationPerformed: false,
      });
  });
});
