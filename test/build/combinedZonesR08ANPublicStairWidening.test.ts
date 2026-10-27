import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r08an_empty_eight_public_stair_widening.mjs');
const BASENAME = 'combined-zones-r08an-empty-eight-public-stair-widening';
const CANONICAL = path.join(ROOT, 'data/buildops', `${BASENAME}.release-manifest.json`);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r08an-stair-widening-'));

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
      expect(fields.slice(1, 4)).toEqual(fields.slice(4, 7));
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

describe('Combined Zones R08AN Empty Eight public stair widening', () => {
  it('regenerates the canonical manifest and four operation pairs byte-for-byte', () => {
    expect(regeneratedArtifacts().map((filename) => fs.readFileSync(filename))).toEqual(firstRegeneration);
    expect(manifest.manifestIdentity).toBe('a57a2f41e8a05d18c2a033766b4d2e5c924b90c650f751ad40b2eda375bcd0f7');
    expect(regenerated.scope).toEqual(manifest.scope);
    expect(regenerated.source).toEqual(manifest.source);
    for (const pkg of manifest.packages) {
      const canonicalForward = path.resolve(ROOT, pkg.forward);
      const canonicalRollback = path.resolve(ROOT, pkg.rollback);
      const tempForward = path.join(temporaryDirectory, path.basename(pkg.forward));
      const tempRollback = path.join(temporaryDirectory, path.basename(pkg.rollback));
      expect(fs.readFileSync(tempForward)).toEqual(fs.readFileSync(canonicalForward));
      expect(fs.readFileSync(tempRollback)).toEqual(fs.readFileSync(canonicalRollback));
    }
  });

  it('widens exactly two PF08 stairs to three-wide public grade with 3x3 landings', () => {
    expect(manifest).toMatchObject({
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      scope: {
        publicAccess: {
          accepted: true,
          surfaceEgressOrAccessibilityClaimed: false,
          widenedStairCount: 2,
          headroomClearBlocks: 3,
          landingSize: '3x3',
          bidirectionalWalkQaRequired: true,
        },
      },
    });
    const stairs = manifest.scope.publicAccess.stairs;
    expect(stairs).toHaveLength(2);
    expect(stairs.map(({ centerX }: any) => centerX)).toEqual([1728, 1752]);
    expect(stairs.every(({ width, rise }: any) => width === 3 && rise === 8)).toBe(true);
  });

  it('preserves every deferred or hazardous Empty Eight interface', () => {
    expect(manifest.scope.retainedBoundaries).toMatchObject({
      r08alPublicGalleryPreserved: true,
      r08amRestrictedAnnexPreserved: true,
      railStubIntersectionCount: 0,
      drainageIntersectionCount: 0,
      fireServiceSpineIntersectionCount: 0,
      surfaceEgressOrAccessibilityClaimed: false,
      theatreOrPrivateClubWingIncluded: false,
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

  it('emits 104 exact guarded transitions with exact reverse-order inverses', () => {
    expect(manifest.packages).toHaveLength(4);
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
    expect(count).toBe(104);
    expect(manifest.scope.geometry.targets.cellCount).toBe(186);
    expect(manifest.scope.geometry.operatedTargets.cellCount).toBe(104);
  });
});
