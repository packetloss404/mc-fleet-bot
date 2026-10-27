import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r08am_empty_eight_restricted_theatre_club_annex.mjs');
const BASENAME = 'combined-zones-r08am-empty-eight-restricted-theatre-private-club-annex';
const CANONICAL = path.join(ROOT, 'data/buildops', `${BASENAME}.release-manifest.json`);
const OFFLINE_LEDGER = path.join(ROOT, 'data/world-review/combined-zones-r08am-restricted-annex-offline-v3/evidence-ledger.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r08am-annex-'));

function readJson(filename: string): any {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function parseOperations(filename: string): Array<{ point: number[]; fromState: string; toState: string }> {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const fields = line.split(/\s+/);
      expect(fields[0]).toBe('REPL');
      expect(fields).toHaveLength(9);
      expect(fields.slice(1, 4)).toEqual(fields.slice(4, 7));
      return { point: fields.slice(1, 4).map(Number), fromState: fields[7], toState: fields[8] };
    });
}

function bodySha(filename: string): string {
  const body = `${fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
  return crypto.createHash('sha256').update(body).digest('hex');
}

let manifest: any;
let regenerated: any;
let firstArtifacts: Buffer[];
const tempArtifacts = () => [
  path.join(temporaryDirectory, `${BASENAME}.release-manifest.json`),
  ...manifest.packages.flatMap((pkg: any) => [
    path.join(temporaryDirectory, path.basename(pkg.forward)),
    path.join(temporaryDirectory, path.basename(pkg.rollback)),
  ]),
];

beforeAll(() => {
  manifest = readJson(CANONICAL);
  const args = [SCRIPT, '--out-dir', temporaryDirectory, '--basename', BASENAME];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstArtifacts = tempArtifacts().map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  regenerated = readJson(path.join(temporaryDirectory, `${BASENAME}.release-manifest.json`));
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones R08AM restricted theatre/private-club annex', () => {
  it('regenerates all six packages and manifest deterministically', () => {
    expect(tempArtifacts().map((filename) => fs.readFileSync(filename))).toEqual(firstArtifacts);
    expect(manifest.manifestIdentity).toBe('7447f3e05c15e30fd7c1f327a52901d7efdfa28e72e34231ae28fd50a1149ec5');
    expect(regenerated.scope).toEqual(manifest.scope);
    expect(regenerated.source).toEqual(manifest.source);
  }, 60_000);

  it('defines the exact dry grand-stair, theatre, and restricted club program', () => {
    expect(manifest.scope).toMatchObject({
      releaseId: 'CZ-R08AM-EMPTY-EIGHT-RESTRICTED-THEATRE-PRIVATE-CLUB-ANNEX',
      accessBoundary: {
        public: false,
        restrictedAdultsOnly: true,
        securedR08alRearWallDoorCount: 2,
        exactR08alSupersessionCellCount: 8,
        grandStair: { width: 7, longitudinalStepCount: 26, exactStepBlockCount: 182, verticalDrop: 25 },
      },
      annex: {
        bounds: { minX: 1700, maxX: 1789, minY: 24, maxY: 35, minZ: 185, maxZ: 224 },
        dryEnclosed: true,
        theatre: { exactAudienceSeatCount: 100, stageCeilingLightCount: 16, bedCenterpieceNoninteractive: true },
        privateClub: { suiteCount: 4, suiteDoorCount: 4, communalLounge: true,
          simulatedFireplaceCount: 2, nonexplicitSwingSeatCount: 2,
          billiardsTableCount: 1, smallCinemaSeatCount: 6 },
      },
      contentBoundary: {
        consensualAdultsOnlyTheme: true,
        explicitSexualContent: false,
        anatomyOrSexActDepicted: false,
        coercionConfinementOrViolenceDepicted: false,
        occupantsNpcsOrEntitiesIntroduced: 0,
      },
    });
  });

  it('emits 44,366 unique point transitions and exact reverse-order inverses', () => {
    let count = 0;
    for (const pkg of manifest.packages) {
      const forwardPath = path.resolve(ROOT, pkg.forward);
      const rollbackPath = path.resolve(ROOT, pkg.rollback);
      const forward = parseOperations(forwardPath);
      const rollback = parseOperations(rollbackPath);
      count += forward.length;
      expect(new Set(forward.map(({ point }) => point.join(','))).size).toBe(forward.length);
      expect(rollback).toEqual(forward.slice().reverse().map((entry) => ({
        point: entry.point,
        fromState: entry.toState,
        toState: entry.fromState,
      })));
      expect(bodySha(forwardPath)).toBe(manifest.operations[pkg.key].forwardSha256);
      expect(bodySha(rollbackPath)).toBe(manifest.operations[pkg.key].rollbackSha256);
    }
    expect(count).toBe(44366);
    expect(manifest.scope.geometry.targets.cellCount).toBe(44783);
  });

  it('preserves R08AL and every deferred/hazard interface outside the exact seam', () => {
    expect(manifest.scope.retainedBoundaries).toEqual({
      r08alPublicRetailPreserved: true,
      r08alRearWallSupersessionCellCount: 8,
      northRetailShellsCapped: true,
      n06ExceptionUntouched: true,
      futureRailInterfacesOpened: false,
      drainageOpened: false,
      fireServiceSpineOpened: false,
      utilityVentMechanismInterfacesOpened: false,
      activeFireIntroduced: false,
      railOrPlatformBarrierOpened: false,
    });
    expect(manifest.isolation).toMatchObject({
      targetFluidOrWaterloggedCount: 0,
      interactionHaloFluidCount: 0,
      targetForbiddenBlockCount: 0,
      interactionHaloForbiddenBlockCount: 0,
      unstableRetainedHaloGravityCount: 0,
      blockEntityIntersectionCount: 0,
      savedEntityIntersectionCount: 0,
      protectedRelicIntersectionCount: 0,
      futureLineIntersectionCount: 0,
      drainageIntersectionCount: 0,
      fireServiceSpineIntersectionCount: 0,
      northRetailIntersectionCount: 0,
    });
  });

  it('has a complete append-only offline release kernel', () => {
    const ledger = readJson(OFFLINE_LEDGER);
    expect(ledger).toMatchObject({
      status: 'READY_FOR_EXPLICIT_EXECUTION',
      transactionId: BASENAME,
      manifest: { path: `data/buildops/${BASENAME}.release-manifest.json` },
    });
    expect(ledger.packages).toHaveLength(6);
    expect(ledger.evidenceBindings.length).toBeGreaterThanOrEqual(25);
  });
});
