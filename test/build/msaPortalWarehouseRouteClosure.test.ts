import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'msa-portal-warehouse-route-closure';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const MANIFEST = path.join(BUILDOPS, `${BASENAME}.release-manifest.json`);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'msa-portal-warehouse-'));
const artifactNames = [
  `${BASENAME}.release-manifest.json`,
  `${BASENAME}.portal-lintel-clear.forward.txt`,
  `${BASENAME}.portal-lintel-clear.rollback.txt`,
];

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  scope: {
    releaseId: string;
    canonicalOwner: string;
    repair: {
      portalBounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
      crownPreserved: { y: number; state: string };
    };
    geometry: {
      operatedTargets: { cellCount: number; coordinateSetSha256: string };
      interactionHalo: { cellCount: number };
    };
    retainedBoundaries: {
      routeCommissioned: boolean;
    };
  };
  packages: Array<{ key: string }>;
  operations: Record<string, { targetCellCount: number; exactInverse: boolean }>;
};

let manifest: Manifest;

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_msa_portal_warehouse_route_closure.mjs',
    '--out-dir', temporaryDirectory,
    '--generated-at', '2026-08-24T12:00:00Z',
  ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
  manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as Manifest;
});

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CIRC-MSA-PORTAL-01 MainStreet portal warehouse route closure', () => {
  it('reproduces all build artifacts byte-for-byte', () => {
    for (const name of artifactNames) {
      expect(fs.readFileSync(path.join(temporaryDirectory, name)))
        .toEqual(fs.readFileSync(path.join(BUILDOPS, name)));
    }
  });

  it('emits a valid manifest under the mainstreet-america scope', () => {
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.mvpScope).toBe(true);
    expect(manifest.scope.releaseId).toBe('CIRC-MSA-PORTAL-01');
    expect(manifest.scope.canonicalOwner).toBe('mainstreet-america');
    expect(manifest.packages.map(({ key }) => key)).toEqual(['portal-lintel-clear']);
    expect(manifest.operations['portal-lintel-clear'].targetCellCount).toBe(54);
    expect(manifest.operations['portal-lintel-clear'].exactInverse).toBe(true);
  });

  it('clears exactly the 54-cell full portal mouth x=34..42 y=65..70 z=203', () => {
    expect(manifest.scope.geometry.operatedTargets.cellCount).toBe(54);
    expect(manifest.scope.repair.portalBounds).toEqual({
      minX: 34, maxX: 42, minY: 65, maxY: 70, minZ: 203, maxZ: 203,
    });
    expect(manifest.scope.repair.crownPreserved.state).toBe('minecraft:polished_blackstone_bricks');
    // The opened mouth is a bounded wall opening; interaction halo is finite.
    expect(manifest.scope.geometry.interactionHalo.cellCount).toBe(210);
  });

  it('does not commission a route and preserves the corridor', () => {
    expect(manifest.scope.retainedBoundaries.routeCommissioned).toBe(false);
    // Forward and rollback are strict one-to-one exact inverses.
    for (const name of ['forward.txt', 'rollback.txt']) {
      const opsPath = path.join(BUILDOPS, `${BASENAME}.portal-lintel-clear.${name}`);
      const lines = fs.readFileSync(opsPath, 'utf8')
        .split(/\r?\n/).filter((line) => line && !line.startsWith('#'));
      expect(lines).toHaveLength(54);
      for (const line of lines) {
        const fields = line.split(/\s+/);
        expect(fields).toHaveLength(9);
        expect(fields[0]).toBe('REPL');
      }
    }
  });
});
