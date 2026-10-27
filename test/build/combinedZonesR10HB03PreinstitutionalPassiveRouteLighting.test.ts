import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r10h-b03-preinstitutional-passive-route-lighting';
const MANIFEST_PATH = path.join(ROOT, 'data/buildops', `${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r10h-b03-preinstitutional-passive-route-lighting-offline-20260822T040500Z',
);
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Record<string, any>;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r10h-lighting-'));
const sha256 = (filename: string) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');

afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

function operations(filename: string) {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '));
}

describe('Combined Zones R10H B03 passive route-lighting enabler', () => {
  it('binds the accepted R10G post and frozen canonical identity', () => {
    expect(manifest).toMatchObject({
      manifestIdentity: '2b9420ba2e27f7c2c97bffac981abe4974532ea2211b8aacb429b5f5cb355ffc',
      releaseNodeId: 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
      mvpScope: true,
      source: {
        completeSaveSha256: 'b6f7034521acc89a3534e68eec0533566eab67f0240fac9b4bb43ae0db1753cd',
        regionSnapshotSha256: '39e9e446b36381fa0961fa17e788685c983fc683a605b91e2a7b515ab39264fa',
        predecessor: {
          completedReleaseIdentitySha256: '818e098cfa2ce12bfe09748162fa7b3cc7165e98fba6757f8bb73fb58570ca6d',
          postQaPayloadSha256: '45ae703711127ab8c30fae08b7c84f69e872cc374a70f79e1087d44ffb77fbff',
        },
      },
    });
    expect(sha256(MANIFEST_PATH)).toBe('3957c20e00f2210e07db2c2f02a8e647e22f2b0084f1de51a56531713f2fac2a');
  });

  it('compiles deterministically without changing canonical artifacts', () => {
    const outDir = path.join(temp, 'buildops');
    const entityReport = path.join(temp, 'evidence', 'immutable-entity-clearance.json');
    const args = [
      path.join(ROOT, 'scripts/compile_combined_zones_r10h_b03_preinstitutional_passive_route_lighting.mjs'),
      '--out-dir', outDir,
      '--basename', BASENAME,
      '--entity-report', entityReport,
    ];
    execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
    const first = fs.readdirSync(outDir).sort().map((name) => [name, sha256(path.join(outDir, name))]);
    execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
    expect(fs.readdirSync(outDir).sort().map((name) => [name, sha256(path.join(outDir, name))]))
      .toEqual(first);
  }, 30_000);

  it('has one exact 48-cell reverse-order package', () => {
    expect(manifest.packages.map(({ key }: { key: string }) => key)).toEqual([
      'b03-preinstitutional-passive-route-lighting',
    ]);
    const pkg = manifest.packages[0];
    const forward = operations(path.join(ROOT, pkg.forward));
    const rollback = operations(path.join(ROOT, pkg.rollback));
    expect(forward).toHaveLength(48);
    expect(rollback).toEqual(forward.slice().reverse().map((line) => {
      const fields = line.split(' ');
      return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
    }));
    expect(sha256(path.join(ROOT, pkg.forward)))
      .toBe('6f61f5adcb170bb570dabdbd13cd984a2fbc0d68b101eae796e16cbffcbf8e05');
    expect(sha256(path.join(ROOT, pkg.rollback)))
      .toBe('cfe4ae4d62fa2eed58ec83ddc276d39bf60499893b3c7d8d866cfa6a7de9a2ed');
  });

  it('binds the exact route geometry and six-block fixture cadence', () => {
    expect(manifest.scope).toMatchObject({
      acceptedCenterlineRange: { firstIndex: 188, lastIndex: 800, pointCount: 613 },
      passiveLighting: {
        firstFixtureIndex: 188,
        lastNewFixtureIndex: 470,
        interval: 6,
        newFixtures: { cellCount: 48 },
        acceptedDownstreamFixtureCount: 54,
        proposedCompleteFixtureCount: 102,
        proposedCompleteMaximumCenterlineSpacing: 6,
      },
      routeReadinessGeometry: {
        route: { cellCount: 12212 },
        centralClearance: { cellCount: 5505 },
        floor: { cellCount: 3053 },
        ceiling: { cellCount: 3053 },
        upstreamIndex187AirSeam: { cellCount: 20 },
        routeComponentCount: 1,
      },
    });
  });

  it('preserves the explicit upstream obstruction and operational holds', () => {
    expect(manifest.scope.explicitUpstreamHold).toMatchObject({
      excludedCenterlineRange: { firstIndex: 0, lastIndex: 187, pointCount: 188 },
      exactRouteCellCount: 3760,
      exactRouteObstructionCount: 63,
      exactFloorCellCount: 940,
      exactUnsupportedFloorAirCellCount: 14,
    });
    expect(manifest.scope.operationalBoundary).toMatchObject({
      passiveLightingOnly: true,
      routePhysicallyOpened: false,
      secureOrPublicRouteCommissioned: false,
      accessControlMechanismCommissioned: false,
      activeSystemInstalled: false,
      exteriorOpeningCreated: false,
      chamberOpened: false,
      directTerminalLinkOpened: false,
      rescueOrEgressCommissioned: false,
    });
  });

  it('passes the complete offline hard-safety kernel and real wrapper contract', () => {
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'manifest-qa.json'), 'utf8')))
      .toMatchObject({ status: 'PASS', passed: true, totals: { packages: 1, uniqueTargetCells: 48 } });
    for (const filename of ['forward-source-preflight.json', 'projected-rollback-preflight.json']) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')))
        .toMatchObject({ status: 'PASS', passed: 48, failed: 0 });
    }
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'immutable-entity-clearance.json'), 'utf8')))
      .toMatchObject({
        status: 'PASS', targetCellCount: 48, interactionHaloCellCount: 1296,
        blockEntityIntersectionCount: 0, savedEntityIntersectionCount: 0,
      });
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'wrapper-plan.json'), 'utf8')))
      .toMatchObject({
        mode: 'PREPARE_ONLY', globalGateDependency: 'NONE',
        packageOrder: ['b03-preinstitutional-passive-route-lighting'],
      });
  });

  it('seals a complete 13/13 offline readiness result', () => {
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'offline-qa.json'), 'utf8')))
      .toMatchObject({
        status: 'PASS_R10H_B03_PREINSTITUTIONAL_PASSIVE_ROUTE_LIGHTING_OFFLINE_READY',
        manifestIdentity: '2b9420ba2e27f7c2c97bffac981abe4974532ea2211b8aacb429b5f5cb355ffc',
        qaPayloadSha256: '8c86f0399c3eedba19b97c21bc9c69b6f1dc0f25125428b889d24d1c6661cd1b',
        targetCellCount: 48,
        fixtureCountAfterExecution: 102,
        summary: { passed: true, checkCount: 13, passCount: 13, failCount: 0 },
        safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
      });
  });
});
