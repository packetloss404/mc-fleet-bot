import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  executionPlan,
  normalizeReleaseManifest,
  projectedOverlayPlan,
  requiredRegionNames,
  validateStandingAuthorization,
} from '../../scripts/run_combined_zones_scoped_release.mjs';
import {
  buildTargetChunkIndex,
  matchingTargets,
  parseOperationsText,
} from '../../scripts/audit_guarded_ops_block_entities.mjs';

const ROOT = path.resolve(__dirname, '../..');
const AUTHORIZATION_PATH = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
);
const R07 = 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK';

let tempRoot: string;
let authorization: Record<string, unknown>;

function write(relative: string, body: string): string {
  const filename = path.join(tempRoot, relative);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, body);
  return filename;
}

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    transactionId: 'combined-zones-r07-test-wave',
    releaseNodeId: R07,
    mvpScope: true,
    scopeIds: ['P1-B09'],
    packages: [
      {
        key: 'summit-frame',
        forward: 'data/buildops/r07.forward.txt',
        rollback: 'data/buildops/r07.rollback.txt',
      },
    ],
    ...overrides,
  };
}

beforeAll(() => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-scoped-release-'));
  write(
    'data/buildops/r07.forward.txt',
    'REPL 511 70 -513 513 70 -511 minecraft:stone minecraft:smooth_stone\n',
  );
  write(
    'data/buildops/r07.rollback.txt',
    'REPL 511 70 -513 513 70 -511 minecraft:smooth_stone minecraft:stone\n',
  );
  authorization = JSON.parse(fs.readFileSync(AUTHORIZATION_PATH, 'utf8'));
});

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

describe('Combined Zones standing scoped build authorization', () => {
  it('binds the exact owner directive, the R07-R12 MVP nodes, and all six hard gates', () => {
    expect(validateStandingAuthorization(authorization, R07)).toBe(true);
    expect(authorization).toMatchObject({
      projectId: 'combined-zones-phase1',
      status: 'AUTHORIZED_STANDING_SCOPED_EXECUTION',
      revoked: false,
      operationalControls: {
        defaultMode: 'PREPARE_ONLY',
        liveExecutionOptIn: '--execute',
        globalGateDependency: 'NONE',
      },
    });
    expect((authorization.ownerDirective as { exactText: string }).exactText)
      .toContain('i want to build');
    expect((authorization.hardSafetyKernel as unknown[])).toHaveLength(6);
  });

  it('fails closed on authorization drift or a release outside the exact list', () => {
    expect(() => validateStandingAuthorization(
      { ...authorization, revoked: true },
      R07,
    )).toThrow(/revoked|identity drift/);
    expect(() => validateStandingAuthorization(
      authorization,
      'CZ-R13-FINAL-CONSOLIDATED-ACCEPTANCE',
    )).toThrow(/outside standing authorization/);
  });

  it('keeps the current complete-save intake as preparation evidence, not execution authority', () => {
    expect(authorization.currentPreparationBaseline).toMatchObject({
      worldRoot: 'data/worldsnap-combined-zones-mvp-pre-20260821T152926Z',
      completeSaveSha256: 'ddb1c89efc05a306c0bfe4fc387bdfc3af1c071f82a297118bf1bb2736dd93fe',
      status: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
    });
    const intake = (authorization.currentPreparationBaseline as {
      completeSaveIntake: string;
      completeSaveIntakeSha256: string;
    });
    expect(crypto.createHash('sha256')
      .update(fs.readFileSync(path.join(ROOT, intake.completeSaveIntake)))
      .digest('hex')).toBe(intake.completeSaveIntakeSha256);
  });
});

describe('Combined Zones exact release normalization', () => {
  it('accepts the concrete R07A B03 portal-tube package selected for the next build', () => {
    const filename = path.join(
      ROOT,
      'data/buildops/combined-zones-r07-b03-portal-tube.release-manifest.json',
    );
    const release = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const packages = normalizeReleaseManifest(release, R07, ROOT, authorization);
    expect(packages.map(({ key }) => key)).toEqual([
      'b03-tube-shell',
      'b03-portal-openings',
    ]);
    expect(requiredRegionNames(packages)).toEqual(['r.4.-2.mca']);
    expect(executionPlan(packages, true)).toMatchObject({
      mode: 'EXECUTE',
      globalGateDependency: 'NONE',
      packageOrder: ['b03-tube-shell', 'b03-portal-openings'],
    });
  });

  it('accepts an exact in-buildops R07 manifest and enumerates every touched region', () => {
    const packages = normalizeReleaseManifest(manifest(), R07, tempRoot, authorization);
    expect(packages).toHaveLength(1);
    expect(requiredRegionNames(packages)).toEqual([
      'r.0.-1.mca',
      'r.0.-2.mca',
      'r.1.-1.mca',
      'r.1.-2.mca',
    ]);
  });

  it('rejects path escape, release-node drift, and deferred MVP scopes', () => {
    expect(() => normalizeReleaseManifest(
      manifest({ releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT' }),
      R07,
      tempRoot,
      authorization,
    )).toThrow(/releaseNodeId/);
    expect(() => normalizeReleaseManifest(
      manifest({ scopeIds: ['P1-B12'] }),
      R07,
      tempRoot,
      authorization,
    )).toThrow(/deferred MVP scope/);
    expect(() => normalizeReleaseManifest(
      manifest({
        packages: [{
          key: 'escape',
          forward: '../outside.forward.txt',
          rollback: 'data/buildops/r07.rollback.txt',
        }],
      }),
      R07,
      tempRoot,
      authorization,
    )).toThrow(/must be inside/);
  });

  it('models forward and reverse package state in the correct order', () => {
    const packages = [
      { key: 'a', forward: '/a.forward', rollback: '/a.rollback', policy: null },
      { key: 'b', forward: '/b.forward', rollback: '/b.rollback', policy: null },
      { key: 'c', forward: '/c.forward', rollback: '/c.rollback', policy: null },
    ];
    expect(projectedOverlayPlan(packages)).toEqual({
      forward: [
        { key: 'a', operations: '/a.forward', sourceOverlays: [] },
        { key: 'b', operations: '/b.forward', sourceOverlays: ['/a.forward'] },
        { key: 'c', operations: '/c.forward', sourceOverlays: ['/a.forward', '/b.forward'] },
      ],
      rollback: [
        {
          key: 'c',
          operations: '/c.rollback',
          sourceOverlays: ['/a.forward', '/b.forward', '/c.forward'],
        },
        {
          key: 'b',
          operations: '/b.rollback',
          sourceOverlays: ['/a.forward', '/b.forward', '/c.forward', '/c.rollback'],
        },
        {
          key: 'a',
          operations: '/a.rollback',
          sourceOverlays: ['/a.forward', '/b.forward', '/c.forward', '/c.rollback', '/b.rollback'],
        },
      ],
    });
  });

  it('defaults to preparation and has no G01-G19/global-contract dependency', () => {
    const plan = executionPlan([{ key: 'r07' }], false);
    expect(plan.mode).toBe('PREPARE_ONLY');
    expect(plan.globalGateDependency).toBe('NONE');
    expect(plan.stages).not.toContain('strict-forward-execution');
    expect(fs.readFileSync(
      path.join(ROOT, 'scripts/run_combined_zones_scoped_release.mjs'),
      'utf8',
    )).not.toMatch(/phase1-release-contract\.json/);
  });
});

describe('guarded-operation block-entity targeting', () => {
  it('indexes multi-chunk REPL boxes without treating guarded CMD as replacement', () => {
    const text = [
      'REPL -17 10 15 17 12 33 minecraft:stone minecraft:air',
      'CMD execute if block 1 2 3 minecraft:oak_sign[rotation=0,waterlogged=false] run data merge block 1 2 3 {front_text:{}}',
      '',
    ].join('\n');
    expect(parseOperationsText(text, 'wave.forward.txt')).toHaveLength(1);
    const target = buildTargetChunkIndex([{ file: 'wave.forward.txt', text }]);
    expect(target.operationCount).toBe(1);
    expect(target.regionFiles).toEqual(['r.-1.0.mca', 'r.0.0.mca']);
    expect(matchingTargets([0, 11, 16], target.index.get('0,1') ?? [])).toHaveLength(1);
    expect(matchingTargets([0, 20, 16], target.index.get('0,1') ?? [])).toHaveLength(0);
  });
});
