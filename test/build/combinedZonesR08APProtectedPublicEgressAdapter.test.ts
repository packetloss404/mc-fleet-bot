import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r08ap_empty_eight_protected_public_egress_adapter.mjs');
const BASENAME = 'combined-zones-r08ap-empty-eight-protected-public-egress-adapter';
const CANONICAL = path.join(ROOT, 'data/buildops', `${BASENAME}.release-manifest.json`);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r08ap-egress-adapter-'));

interface Operation {
  point: number[];
  fromState: string;
  toState: string;
}

function readJson(filename: string): any {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function parseOperations(filename: string): Operation[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const fields = line.split(/\s+/);
      expect(fields[0]).toBe('REPL');
      expect(fields).toHaveLength(9);
      return {
        point: fields.slice(1, 4).map(Number),
        fromState: fields[7],
        toState: fields[8],
      };
    });
}

function bodySha256(filename: string): string {
  const body = `${fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
  return crypto.createHash('sha256').update(body).digest('hex');
}

let manifest: any;
let regenerated: any;
let firstRegeneration: Buffer[];

function regeneratedArtifacts(): string[] {
  return [
    path.join(temporaryDirectory, `${BASENAME}.release-manifest.json`),
    ...manifest.packages.flatMap((pkg: any) => [
      path.join(temporaryDirectory, path.basename(pkg.forward)),
      path.join(temporaryDirectory, path.basename(pkg.rollback)),
    ]),
  ];
}

beforeAll(() => {
  manifest = readJson(CANONICAL);
  execFileSync(process.execPath, [
    SCRIPT,
    '--out-dir', temporaryDirectory,
    '--basename', BASENAME,
  ], { cwd: ROOT, stdio: 'pipe' });
  firstRegeneration = regeneratedArtifacts().map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, [
    SCRIPT,
    '--out-dir', temporaryDirectory,
    '--basename', BASENAME,
  ], { cwd: ROOT, stdio: 'pipe' });
  regenerated = readJson(path.join(temporaryDirectory, `${BASENAME}.release-manifest.json`));
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones R08AP Empty Eight protected public egress adapter', () => {
  it('regenerates the canonical manifest and two operation pairs byte-for-byte', () => {
    expect(regeneratedArtifacts().map((filename) => fs.readFileSync(filename))).toEqual(firstRegeneration);
    expect(regenerated.scope).toEqual(manifest.scope);
    expect(regenerated.source).toEqual(manifest.source);
    for (const pkg of manifest.packages) {
      expect(fs.readFileSync(path.join(temporaryDirectory, path.basename(pkg.forward))))
        .toEqual(fs.readFileSync(path.resolve(ROOT, pkg.forward)));
      expect(fs.readFileSync(path.join(temporaryDirectory, path.basename(pkg.rollback))))
        .toEqual(fs.readFileSync(path.resolve(ROOT, pkg.rollback)));
    }
  });

  it('opens a 3-wide protected egress doorway to the EG-A shaft', () => {
    expect(manifest).toMatchObject({
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      scope: {
        publicAccess: {
          accepted: true,
          surfaceEgressOrAccessibilityClaimed: true,
          egressPath: {
            fromWidenedPf08Stair: true,
            viaWestGalleryConcourse: true,
            doorway: { x: 1652, minY: 50, maxY: 51, minZ: 146, maxZ: 148, width: 3, height: 2 },
            shaftEndpoint: { x: 1651, z: 148, baseY: 49, surfaceY: 84 },
            reachesOpenAir: true,
          },
        },
      },
    });
  });

  it('preserves the sealed headhouse and every deferred interface', () => {
    expect(manifest.scope.retainedBoundaries).toMatchObject({
      r07gHeadhouseSealed: true,
      railStubIntersectionCount: 0,
      drainageIntersectionCount: 0,
      fireServiceSpineIntersectionCount: 0,
      shaftPathPreserved: true,
      egBShaftUnopened: true,
      accessibilityClaimed: false,
    });
    expect(manifest.isolation).toMatchObject({
      targetFluidOrWaterloggedCount: 0,
      targetForbiddenBlockCount: 0,
      interactionHaloFluidCount: 0,
      interactionHaloForbiddenBlockCount: 0,
      blockEntityIntersectionCount: 0,
      savedEntityIntersectionCount: 0,
      protectedRelicIntersectionCount: 0,
    });
  });

  it('emits 8 exact guarded transitions with exact reverse-order inverses', () => {
    expect(manifest.packages).toHaveLength(2);
    let count = 0;
    for (const pkg of manifest.packages) {
      const forwardPath = path.resolve(ROOT, pkg.forward);
      const rollbackPath = path.resolve(ROOT, pkg.rollback);
      const forward = parseOperations(forwardPath);
      const rollback = parseOperations(rollbackPath);
      count += forward.length;
      expect(new Set(forward.map(({ point }) => point.join(','))).size).toBe(forward.length);
      expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
        point: operation.point,
        fromState: operation.toState,
        toState: operation.fromState,
      })));
      expect(bodySha256(forwardPath)).toBe(manifest.operations[pkg.key].forwardSha256);
      expect(bodySha256(rollbackPath)).toBe(manifest.operations[pkg.key].rollbackSha256);
    }
    expect(count).toBe(8);
    expect(manifest.scope.geometry.targets.cellCount).toBe(8);
  });
});
