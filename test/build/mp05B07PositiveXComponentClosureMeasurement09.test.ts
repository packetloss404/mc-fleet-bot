import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-component-closure-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP05 B07 positive-X component-closure measurement plan 09', () => {
  it('derives only the three observed escape-direction shell and full-height local update envelope from the uncapped trace', () => {
    const out = path.join(temp, 'out');
    execFileSync(process.execPath, ['scripts/plan_mp05_b07_positive_x_component_closure_measurement_09.mjs', '--out-dir', out, '--markdown-out', path.join(out, 'report.md'), '--generated-at', '2026-08-28T06:50:00.000Z'], { cwd: ROOT, stdio: 'pipe', maxBuffer: 8 * 1024 * 1024 });
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp05-b07-positive-x-component-closure-measurement-09.json'), 'utf8'));
    expect(report).toMatchObject({
      status: 'SOURCE_BOUND_COMPONENT_CLOSURE_MEASUREMENT_PLAN_REQUIRED_COMPONENT_EXITS_CURRENT_TRACE_SCOPE', mutationAuthority: false,
      observedTraceEscalation: { capped500k: { componentCells: 500000, capReached: true }, uncapped1m: { component: { cellCount: 718008 }, capReached: false, disposition: 'COMPONENT_REACHES_FINITE_ENVELOPE_BOUNDARY_TOPOLOGY_INCOMPLETE' } },
      nextComponentClosureTrace: { nextMinimumBounds: { minX: 2048, maxX: 2319, minY: -64, maxY: 127, minZ: -656, maxZ: -241 }, nextChunkColumns: { chunkColumnCount: 442 } },
      localWaterUpdateEnvelope: { curtainTargets: { cellCount: 5 }, wetExteriorTargets: { cellCount: 3 }, bounds: { minX: 2096, maxX: 2143, minY: -64, maxY: 319, minZ: -416, maxZ: -369 }, chunkColumns: { chunkColumnCount: 9 } },
      safetyBoundary: { readOnly: true, liveCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 },
    });
    expect(report.explicitNonClaims.join('\n')).toMatch(/No live capture/);
    expect(fs.existsSync(path.join(out, 'mp05-b07-positive-x-component-closure-measurement-09.svg'))).toBe(true);
  });
});
