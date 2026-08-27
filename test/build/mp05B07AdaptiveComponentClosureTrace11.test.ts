import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-adaptive-continuation-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP05 B07 adaptive component-closure trace 11', () => {
  it('uses trace 10 as a source-bound continuation and expands every, and only, newly observed escape direction', () => {
    const out = path.join(temp, 'out');
    execFileSync(process.execPath, [
      '--max-old-space-size=8192', 'scripts/trace_mp05_b07_adaptive_component_closure_10.mjs',
      '--continuation-trace', 'data/world-review/mp05-b07-adaptive-component-closure-trace-10-post-20260828T041000Z/mp05-b07-adaptive-component-closure-trace-10.json',
      '--id', 'MP05-B07-ADAPTIVE-COMPONENT-CLOSURE-TRACE-11', '--report-slug', 'mp05-b07-adaptive-component-closure-trace-11',
      '--out-dir', out, '--markdown-out', path.join(out, 'report.md'), '--generated-at', '2026-08-28T07:25:00.000Z',
    ], { cwd: ROOT, stdio: 'pipe', maxBuffer: 8 * 1024 * 1024 });
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp05-b07-adaptive-component-closure-trace-11.json'), 'utf8'));
    expect(report).toMatchObject({
      id: 'MP05-B07-ADAPTIVE-COMPONENT-CLOSURE-TRACE-11', status: 'SOURCE_BOUND_COMPONENT_ESCAPES_ADAPTIVE_TRACE_SCOPE_NEXT_BOUNDS_DERIVED', mutationAuthority: false,
      bindings: { continuationTrace: { path: 'data/world-review/mp05-b07-adaptive-component-closure-trace-10-post-20260828T041000Z/mp05-b07-adaptive-component-closure-trace-10.json' } },
      trace: {
        bounds: { minX: 2048, maxX: 2335, minY: -64, maxY: 127, minZ: -672, maxZ: -225 },
        volumeCells: 24772608, component: { cellCount: 969630 },
        escapeDirections: ['NEGATIVE_X', 'POSITIVE_X', 'NEGATIVE_Z', 'POSITIVE_Z'], noComponentCellCap: true, queueCapacityEqualsTraceVolume: true,
      },
      result: { closureProved: false, nextExactBounds: { minX: 2032, maxX: 2351, minY: -64, maxY: 127, minZ: -688, maxZ: -209 } },
      safetyBoundary: { readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
    });
    expect(report.trace.componentBoundaryFaces).toMatchObject({
      NEGATIVE_X: { cellCount: 8 }, POSITIVE_X: { cellCount: 1167 }, NEGATIVE_Z: { cellCount: 1975 }, POSITIVE_Z: { cellCount: 2594 },
      NEGATIVE_Y: { cellCount: 0 }, POSITIVE_Y: { cellCount: 0 },
    });
    expect(fs.existsSync(path.join(out, 'mp05-b07-adaptive-component-closure-trace-11.svg'))).toBe(true);
  });
});
