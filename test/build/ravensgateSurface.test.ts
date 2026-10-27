import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'ravensgate-surface-nw-garth-connection';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const LIVE = path.join(ROOT, 'data/world-review/ravensgate-surface-live-20260824T211631Z');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ravensgate-surface-'));

const MANIFEST_IDENTITY = '86bd62a3b6a39b8023dfc2999e2b8a0642de29ec20945ab6fa7821384706da2e';
const TARGET_X = [-123, -122, -121, -120, -119, -118, -117, -116, -115];
const TARGET_Z = [-457, -456, -455, -454, -453, -452, -451];

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    releaseId: string;
    geometry: {
      targets: { cellCount: number };
      operatedTargets: { cellCount: number };
      alreadyTarget: { cellCount: number };
    };
    repair: {
      connection: {
        approachRoadEdge: object;
        gravelTrunk: object;
        gap: object;
        northPlaza: object;
        material: string;
      };
    };
  };
  operations: Record<string, {
    forwardCommandCount: number;
    rollbackCommandCount: number;
    exactInverse: boolean;
  }>;
  isolation: {
    targetFluidOrWaterloggedCount: number;
    targetForbiddenBlockCount: number;
    interactionHaloFluidCount: number;
    interactionHaloForbiddenBlockCount: number;
    blockEntityIntersectionCount: number;
    savedEntityIntersectionCount: number;
  };
};

let manifest: Manifest;

describe('CIRC-RG-SURFACE-02 Ravensgate NW Garth pedestrian connection', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_ravensgate_surface_nw_garth_connection.mjs',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-24T21:20:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 120_000 });
    manifest = JSON.parse(
      fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.release-manifest.json`), 'utf8'),
    ) as Manifest;
  });

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('reproduces the canonical build artifacts byte-for-byte', () => {
    for (const dir of ['forward', 'rollback']) {
      expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}.connection-walk.${dir}.txt`)))
        .toEqual(fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.connection-walk.${dir}.txt`)));
    }
  });

  it('emits a valid manifest under the ravensgate scope', () => {
    expect(manifest.manifestIdentity).toBe(MANIFEST_IDENTITY);
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.mvpScope).toBe(true);
    expect(manifest.scopeIds).toEqual(['ravensgate']);
    expect(manifest.scope.releaseId).toBe('CIRC-RG-SURFACE-02');
    expect(manifest.packages.map(({ key }) => key)).toEqual(['connection-walk']);
  });

  it('emits the exact executed 63-cell gap as cobblestone', () => {
    expect(manifest.scope.geometry.targets.cellCount).toBe(63);
    expect(manifest.scope.geometry.operatedTargets.cellCount).toBe(63);
    expect(manifest.scope.geometry.alreadyTarget.cellCount).toBe(0);
    expect(manifest.operations['connection-walk'].forwardCommandCount).toBe(63);
    expect(manifest.operations['connection-walk'].rollbackCommandCount).toBe(63);
    expect(manifest.operations['connection-walk'].exactInverse).toBe(true);
    expect(manifest.scope.repair.connection.material).toBe('minecraft:cobblestone');
  });

  it('confines the gap to the declared x/z window at y=67', () => {
    for (const pkg of manifest.packages) {
      const text = fs.readFileSync(path.join(ROOT, pkg.forward), 'utf8');
      const lines = text.split(/\r?\n/).filter((l) => l.startsWith('REPL '));
      for (const line of lines) {
        const f = line.split(/\s+/);
        const x = Number(f[1]);
        const y = Number(f[2]);
        const z = Number(f[3]);
        expect(TARGET_X).toContain(x);
        expect(TARGET_Z).toContain(z);
        expect(y).toBe(67);
      }
    }
  });

  it('isolates all targets from fluid, containers, block entities, and saved entities', () => {
    expect(manifest.isolation.targetFluidOrWaterloggedCount).toBe(0);
    expect(manifest.isolation.targetForbiddenBlockCount).toBe(0);
    expect(manifest.isolation.interactionHaloFluidCount).toBe(0);
    expect(manifest.isolation.interactionHaloForbiddenBlockCount).toBe(0);
    expect(manifest.isolation.blockEntityIntersectionCount).toBe(0);
    expect(manifest.isolation.savedEntityIntersectionCount).toBe(0);
  });

  it('proves the forward and rollback REPL files are exact inverses', () => {
    const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.connection-walk.forward.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    const rollback = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.connection-walk.rollback.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    expect(forward.length).toBe(rollback.length);
    const forwardSet = new Set(forward);
    for (const line of rollback) {
      const f = line.split(/\s+/);
      const inverted = `REPL ${f[1]} ${f[2]} ${f[3]} ${f[4]} ${f[5]} ${f[6]} ${f[8]} ${f[7]}`;
      expect(forwardSet.has(inverted)).toBe(true);
    }
  });

  it('verifies the executed evidence ledger is post-state verified and reversible', () => {
    const ledger = JSON.parse(fs.readFileSync(path.join(LIVE, 'evidence-ledger.json'), 'utf8'));
    expect(ledger.status).toBe('EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE');
    expect(ledger.targetCellCount).toBe(63);
    expect(ledger.execution.connectionWalk.executedCommandCount).toBe(63);
    expect(ledger.execution.connectionWalk.successfulCommands).toBe(63);
    expect(ledger.execution.connectionWalk.noopCommands).toBe(0);
    expect(ledger.execution.connectionWalk.failedGroups).toBe(0);
    expect(ledger.hardSafetyKernel.liveExecution).toBe('PASS (63/63 changed, 0 failed, 0 no-op)');
    expect(ledger.hardSafetyKernel.rollbackPoststatePreflight).toBe('PASS (63/63)');
    expect(ledger.hardSafetyKernel.postStateVerify).toContain('63/63 targets cobblestone');
  });

  it('retains the documented boundaries (no route commissioning, no underground shortcut)', () => {
    const ledger = JSON.parse(fs.readFileSync(path.join(LIVE, 'evidence-ledger.json'), 'utf8'));
    expect(ledger.boundariesRetained.gravelTrunkPreserved).toBe(true);
    expect(ledger.boundariesRetained.northPlazaPreserved).toBe(true);
    expect(ledger.boundariesRetained.approachRoadEdgePreserved).toBe(true);
    expect(ledger.boundariesRetained.longWaterPondPreserved).toBe(true);
    expect(ledger.boundariesRetained.noUndergroundShortcut).toBe(true);
    expect(ledger.boundariesRetained.routeCommissioned).toBe(false);
  });
});
