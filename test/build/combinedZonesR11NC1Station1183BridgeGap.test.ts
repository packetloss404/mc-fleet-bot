import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r11n-c1-station-1183-bridge-gap';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const MANIFEST = path.join(BUILDOPS, `${BASENAME}.release-manifest.json`);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r11n-'));
const artifactNames = [
  `${BASENAME}.release-manifest.json`,
  `${BASENAME}.c1-station-1183-support-framework.forward.txt`,
  `${BASENAME}.c1-station-1183-support-framework.rollback.txt`,
  `${BASENAME}.c1-station-1183-deck-structure.forward.txt`,
  `${BASENAME}.c1-station-1183-deck-structure.rollback.txt`,
];

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  releaseNodeId: string;
  packages: Array<{ key: string }>;
  target: {
    operatedUnion: { cellCount: number; coordinateSetSha256: string };
    interactionHalo: { cellCount: number; coordinateSetSha256: string };
  };
  scope: {
    pavementSurface: { cellCount: number };
    combinedSurface: {
      r11mSurfaceCellCount: number;
      r11nSurfaceCellCount: number;
      r11jSurfaceCellCount: number;
      combinedSurfaceCellCount: number;
      combinedSurfaceComponentCount: number;
      maximumStep: number;
    };
    routeCommissioned: boolean;
    hydraulicCapacityCommissioned: boolean;
  };
};

let manifest: Manifest;

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_combined_zones_r11n_c1_station_1183_bridge_gap.mjs',
    '--out-dir', temporaryDirectory,
    '--generated-at', '2026-08-24T03:10:00Z',
  ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
  manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as Manifest;
});

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R11N C1 station-1183 bridge gap', () => {
  it('reproduces all five build artifacts byte-for-byte', () => {
    for (const name of artifactNames) {
      expect(fs.readFileSync(path.join(temporaryDirectory, name)))
        .toEqual(fs.readFileSync(path.join(BUILDOPS, name)));
    }
  });

  it('emits a valid manifest under the R11 corridor node', () => {
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.mvpScope).toBe(true);
    expect(manifest.releaseNodeId).toBe('CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR');
    expect(manifest.packages.map(({ key }) => key)).toEqual([
      'c1-station-1183-support-framework',
      'c1-station-1183-deck-structure',
    ]);
  });

  it('proves one connected max-step-one combined surface', () => {
    expect(manifest.scope.combinedSurface.combinedSurfaceComponentCount).toBe(1);
    expect(manifest.scope.combinedSurface.maximumStep).toBe(1);
    expect(manifest.scope.combinedSurface.combinedSurfaceCellCount).toBe(796);
  });

  it('does not commission a route or hydraulic capacity', () => {
    expect(manifest.scope.routeCommissioned).toBe(false);
    expect(manifest.scope.hydraulicCapacityCommissioned).toBe(false);
  });
});
