import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r08al_empty_eight_south_public_retail.mjs');
const BASENAME = 'combined-zones-r08al-empty-eight-south-public-vacant-retail';
const CANONICAL = path.join(ROOT, 'data/buildops', `${BASENAME}.release-manifest.json`);
const OFFLINE_LEDGER = path.join(
  ROOT,
  'data/world-review/combined-zones-r08al-south-public-retail-offline/evidence-ledger.json',
);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r08al-public-retail-'));

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

describe('Combined Zones R08AL Empty Eight south public-vacant retail and BOH', () => {
  it('regenerates the canonical manifest and six operation pairs byte-for-byte', () => {
    expect(regeneratedArtifacts().map((filename) => fs.readFileSync(filename))).toEqual(firstRegeneration);
    expect(manifest.manifestIdentity).toBe('8e537410b75457ebb7715f351d1b2d224571e19d1949b59bf6a40c28208fcc5d');
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

  it('opens exactly eleven vacant public shells while retaining S06 capped', () => {
    expect(manifest).toMatchObject({
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      scope: {
        publicAccess: {
          accepted: true,
          surfaceEgressOrAccessibilityClaimed: false,
          publicSmokeDoorCount: 11,
          publicBayCount: 11,
          retainedCappedSouthShellIds: ['EE-R-S06'],
        },
        backOfHouse: {
          nonPublic: true,
          maintained: true,
          restrictedPublicEntryDoorCount: 2,
          backroomCount: 12,
          securedBackroomDoorCount: 12,
          occupantsOrEntitiesIntroduced: 0,
        },
      },
    });
    const bays = manifest.scope.publicAccess.publicBayRecords;
    expect(bays.map(({ shellId }: any) => shellId)).toHaveLength(11);
    expect(bays.some(({ shellId }: any) => shellId === 'EE-R-S06')).toBe(false);
    expect(bays.every(({ portal, occupied, tenantFitoutInstalled }: any) => (
      portal.cellCount === 8 && occupied === false && tenantFitoutInstalled === false
    ))).toBe(true);
  });

  it('preserves every deferred or hazardous Empty Eight interface', () => {
    expect(manifest.scope.retainedBoundaries).toMatchObject({
      northRetailShellsCapped: true,
      n06ExceptionUntouched: true,
      futureRailStubIntersectionCount: 0,
      drainageIntersectionCount: 0,
      fireServiceSpineIntersectionCount: 0,
      southSmokePlaneOriginalCellCount: 1372,
      failClosedDoorSupersessionCellCount: 33,
      southSmokePlaneOtherCellsUntouched: true,
      utilityVentMechanismInterfacesOpened: false,
      railOrPlatformBarrierOpened: false,
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

  it('emits 8,553 exact guarded transitions with exact reverse-order inverses', () => {
    expect(manifest.packages).toHaveLength(6);
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
    expect(count).toBe(8553);
    expect(manifest.scope.geometry.targets.cellCount).toBe(9647);
  });

  it('has a complete reusable offline safety-kernel ledger', () => {
    const ledger = readJson(OFFLINE_LEDGER);
    expect(ledger).toMatchObject({
      status: 'READY_FOR_EXPLICIT_EXECUTION',
      transactionId: manifest.transactionId,
      manifest: {
        path: 'data/buildops/combined-zones-r08al-empty-eight-south-public-vacant-retail.release-manifest.json',
      },
    });
    const canonicalBytes = fs.readFileSync(CANONICAL);
    expect(ledger.manifest.sha256).toBe(crypto.createHash('sha256').update(canonicalBytes).digest('hex'));
    expect(ledger.packages).toHaveLength(6);
    expect(ledger.evidenceBindings.length).toBeGreaterThanOrEqual(25);
  });
});
