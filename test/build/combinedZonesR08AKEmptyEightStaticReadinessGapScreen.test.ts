import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/screen_combined_zones_r08ak_empty_eight_static_readiness.mjs');
const CANONICAL = path.join(
  ROOT,
  'data/world-review/combined-zones-r08ak-empty-eight-static-readiness-gap-screen-20260822T025000Z',
);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'r08ak-'));
const FILES = [
  'r08ak-empty-eight-static-readiness-gap-screen.json',
  'r08ak-empty-eight-static-readiness-gap-screen.md',
];
const read = (directory: string, filename: string) => JSON.parse(
  fs.readFileSync(path.join(directory, filename), 'utf8'),
);

beforeAll(() => {
  execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [SCRIPT, '--out-dir', temporaryDirectory], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('R08AK Empty Eight static-readiness gap screen', () => {
  it('is deterministic across output locations', () => {
    expect(FILES.map((filename) => fs.readFileSync(path.join(temporaryDirectory, filename))))
      .toEqual(FILES.map((filename) => fs.readFileSync(path.join(CANONICAL, filename))));
  });

  it('binds the accepted R08AJ post and complete R08 union', () => {
    expect(read(CANONICAL, FILES[0])).toMatchObject({
      status: 'PASS_R08AK_LOCAL_COMPLETION_GAP_SCREEN_NO_NONCOSMETIC_STATIC_PACKAGE',
      source: {
        completeSaveSha256: '7bd09febc9447b5147e3a5d4a1694943a43ef7cb26104bca582bef1bcb096872',
        terminalLedger: {
          completedReleaseIdentitySha256: '0305e47fbdc23239338a31dfa335cc2332f68bcdde423cce2d09cfe34478d791',
        },
      },
      acceptedR08: { manifestCount: 35, unionCellCount: 44696 },
    });
  });

  it('proves the accepted EG-B static envelope complete', () => {
    expect(read(CANONICAL, FILES[0])).toMatchObject({
      egBStaticCompletion: {
        reservationCells: 637,
        wall: { cellCount: 264, complete: true },
        floor: { cellCount: 49, retainedFutureMechanismCaps: 30, completeAndClosed: true },
        roof: { cellCount: 49, fullCubeClosedCells: 49, completeAndClosed: true },
        interior: { cellCount: 275, stateCensus: { 'minecraft:air': 275 } },
        surfaceEndpoint: null,
        egressCommissioned: false,
        accessibleRouteCommissioned: false,
      },
    });
  });

  it('rejects cosmetic churn and binds every local gap', () => {
    expect(read(CANONICAL, FILES[0])).toMatchObject({
      nonCosmeticStaticCandidate: { targetCellCount: 0, buildopsEmitted: false },
      exactLocalGaps: {
        egBStairReservationCells: 273,
        egBAccessibleLiftReservationCells: 117,
        egBExternalSurfaceEndpoint: null,
        unexcavatedVentRiserCells: 900,
        futureStubSealCells: 200,
        northSmokeResidual: { cells: 161, wet: 105, gravity: 56, acceptedPostDrift: 0 },
        n06SuspendedGravel: { cells: 4, acceptedPostDrift: 0 },
      },
    });
  });

  it('moves only this lane without creating a global hold', () => {
    expect(read(CANONICAL, FILES[0])).toMatchObject({
      disposition: {
        scopeLocalOnly: true,
        r08HeldGlobally: false,
        r08akPhysicalReleaseCompiled: false,
        nextMaterialLane: 'R11 bounded hydraulic/foundation construction',
        noLiveCalls: true,
        noWorldEdits: true,
      },
    });
  });
});
