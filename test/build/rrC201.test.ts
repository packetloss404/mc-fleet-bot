import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'rr-c2-01-cap';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rr-c2-01-'));

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    releaseId: string;
    capMaterial: string;
    capX: number;
    built: { cellCount: number };
    held: { cellCount: number; byReason: Record<string, number> };
    cavernCWetHold: boolean;
    dryCorridorSealed: boolean;
    routeCommissioned: boolean;
  };
  operations: Record<string, {
    forwardCommandCount: number;
    rollbackCommandCount: number;
    exactInverse: boolean;
  }>;
  isolation: {
    sourceHazardCount: number;
    operatedHaloFluidCount: number;
    operatedHaloContainerBlockCount: number;
    blockEntityIntersectionCount: number;
    savedEntityIntersectionCount: number;
  };
};

let manifest: Manifest;

describe('RR-C2-01 Raven Rock C2 fail-closed containment cap', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_rr_c2_01_cap.mjs',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-25T00:00:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 120_000 });
    manifest = JSON.parse(
      fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.release-manifest.json`), 'utf8'),
    ) as Manifest;
  });

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('reproduces the canonical build artifacts byte-for-byte', () => {
    for (const pkg of ['cap']) {
      for (const dir of ['forward', 'rollback']) {
        expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}.${pkg}.${dir}.txt`)))
          .toEqual(fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${pkg}.${dir}.txt`)));
      }
    }
  });

  it('emits a valid manifest under the RAVEN-ROCK scope', () => {
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.mvpScope).toBe(false);
    expect(manifest.scopeIds).toEqual(['RAVEN-ROCK']);
    expect(manifest.scope.releaseId).toBe('RR-C2-01');
    expect(manifest.scope.cavernCWetHold).toBe(true);
    expect(manifest.scope.dryCorridorSealed).toBe(true);
    expect(manifest.scope.routeCommissioned).toBe(false);
  });

  it('emits exactly 60 cap targets with exact inverse and zero hazards', () => {
    expect(manifest.operations.cap.forwardCommandCount).toBe(60);
    expect(manifest.operations.cap.rollbackCommandCount).toBe(60);
    expect(manifest.operations.cap.exactInverse).toBe(true);
    expect(manifest.scope.built.cellCount).toBe(60);
    expect(manifest.scope.held.cellCount).toBe(1);
    expect(manifest.scope.held.byReason['source-not-air=deepslate_gold_ore']).toBe(1);
    expect(manifest.isolation.sourceHazardCount).toBe(0);
    expect(manifest.isolation.operatedHaloContainerBlockCount).toBe(0);
    expect(manifest.isolation.blockEntityIntersectionCount).toBe(0);
    expect(manifest.isolation.savedEntityIntersectionCount).toBe(0);
  });

  it('cap targets are all air at x=-80 and become stone_bricks', () => {
    const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.cap.forward.txt`), 'utf8');
    const lines = forward.split('\n').filter((l) => l.startsWith('REPL'));
    expect(lines.length).toBe(60);
    for (const line of lines) {
      const parts = line.split(/\s+/);
      expect(parts[0]).toBe('REPL');
      expect(Number(parts[1])).toBe(-80);
      expect(parts[7]).toBe('minecraft:air');
      expect(parts[8]).toBe('minecraft:stone_bricks');
    }
    const rollback = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.cap.rollback.txt`), 'utf8');
    const rlines = rollback.split('\n').filter((l) => l.startsWith('REPL'));
    expect(rlines.length).toBe(60);
    for (const line of rlines) {
      const parts = line.split(/\s+/);
      expect(parts[7]).toBe('minecraft:stone_bricks');
      expect(parts[8]).toBe('minecraft:air');
    }
  });

  it('does not operate the north-channel water pool at y=-11', () => {
    const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.cap.forward.txt`), 'utf8');
    const lines = forward.split('\n').filter((l) => l.startsWith('REPL'));
    for (const line of lines) {
      const parts = line.split(/\s+/);
      const y = Number(parts[2]);
      const z = Number(parts[3]);
      const operated = (z >= -15 && z <= -11) || (z <= -16 && z >= -18 && y <= -4 && y >= -10);
      expect(operated).toBe(true);
      expect(y >= -11 && y <= -4).toBe(true);
    }
  });
});
