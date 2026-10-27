import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-adaptive-closure-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP05 B07 adaptive component-closure trace 10', () => {
  it('traces the exact plan-09 shell without a component count cap and derives only observed-direction expansion', () => {
    const out = path.join(temp, 'out');
    execFileSync(process.execPath, ['--max-old-space-size=8192', 'scripts/trace_mp05_b07_adaptive_component_closure_10.mjs', '--out-dir', out, '--markdown-out', path.join(out, 'report.md'), '--generated-at', '2026-08-28T07:10:00.000Z'], { cwd: ROOT, stdio: 'pipe', maxBuffer: 8 * 1024 * 1024 });
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp05-b07-adaptive-component-closure-trace-10.json'), 'utf8'));
    expect(report).toMatchObject({
      status: 'SOURCE_BOUND_COMPONENT_ESCAPES_ADAPTIVE_TRACE_SCOPE_NEXT_BOUNDS_DERIVED',
      mutationAuthority: false,
      trace: {
        bounds: { minX: 2048, maxX: 2319, minY: -64, maxY: 127, minZ: -656, maxZ: -241 },
        volumeCells: 21725184,
        component: { cellCount: 860767 },
        escapeDirections: ['POSITIVE_X', 'NEGATIVE_Z', 'POSITIVE_Z'],
        noComponentCellCap: true,
        queueCapacityEqualsTraceVolume: true,
      },
      result: { closureProved: false, nextExactBounds: { minX: 2048, maxX: 2335, minY: -64, maxY: 127, minZ: -672, maxZ: -225 } },
      safetyBoundary: { readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
    });
    expect(report.trace.componentBoundaryFaces).toMatchObject({
      NEGATIVE_X: { cellCount: 0 }, NEGATIVE_Y: { cellCount: 0 }, POSITIVE_Y: { cellCount: 0 },
      POSITIVE_X: { cellCount: 2796 }, NEGATIVE_Z: { cellCount: 2207 }, POSITIVE_Z: { cellCount: 2328 },
    });
    expect(fs.existsSync(path.join(out, 'mp05-b07-adaptive-component-closure-trace-10.svg'))).toBe(true);
  });
});
