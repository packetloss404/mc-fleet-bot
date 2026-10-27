import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const created: string[] = [];
afterEach(() => created.splice(0).forEach((item) => fs.rmSync(item, { recursive: true, force: true })));

describe('AG-0 citywide exterior-loop finite segment survey', () => {
  it('selects only a fully dry, supported, unowned/exterior, entity-free source slice and emits no operation', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ag0-exterior-loop-')); fs.rmSync(out, { recursive: true, force: true }); created.push(out);
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/compile_ag0_citywide_exterior_loop_segment_01.mjs', '--out', out, '--generated-at', '2026-08-28T08:30:00.000Z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));
    expect(result).toMatchObject({ status: 'AG0_PASS_FINITE_EXTERIOR_LOOP_SEGMENT_SOURCE_BOUND_SURVEY_ONLY', mutationAuthority: false, operationsCompiled: 0, selectedCandidate: 'SL-02-N-AG0-0576' });
    const report = JSON.parse(fs.readFileSync(path.join(out, 'ag0-citywide-exterior-loop-segment-01.json'), 'utf8'));
    expect(report.selectedCandidate).toMatchObject({ footprint: { minX: 320, maxX: 335, minZ: -806, maxZ: -784 }, ownership: { owner: 'AG0_EXTERIOR_LOOP_SURVEY_STEWARD' } });
    expect(report.terrain.footprintSurfaceCells).toHaveLength(368);
    expect(report.hydrology.oneCellHaloSurfaceCells).toHaveLength(450);
    expect(report.hydrology).toMatchObject({ fluidCells: [], waterloggedCells: [], noObservedSurfaceCells: [] });
    expect(report.foundation).toMatchObject({ allStable: true });
    expect(report.foundation.bearingAndFiveDeepChains).toHaveLength(27);
    expect(report.interaction).toEqual({ savedBlockEntities: [], savedEntities: [], protectedInterfaceHits: [] });
    expect(report.elevatedEnvelope.occupiedCells).toEqual([]);
    expect(fs.existsSync(path.join(out, 'ag0-citywide-exterior-loop-segment-01.svg'))).toBe(true);
  }, 30_000);

  it('allows only an explicit geometry/protected-boundary rebind when a new immutable capture is supplied', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ag0-exterior-loop-rebind-')); fs.rmSync(out, { recursive: true, force: true }); created.push(out);
    const fresh = 'data/worldsnap-ag1-exterior-loop-live-source-20260827T013700Z';
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/compile_ag0_citywide_exterior_loop_segment_01.mjs', '--snapshot', fresh, '--geometry-only-rebind', '--out', out, '--generated-at', '2026-08-28T09:00:00.000Z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));
    expect(result).toMatchObject({ mutationAuthority: false, operationsCompiled: 0 });
    const report = JSON.parse(fs.readFileSync(path.join(out, 'ag0-citywide-exterior-loop-segment-01.json'), 'utf8'));
    expect(report.source).toMatchObject({ root: fresh, captureId: 'combined-zones-5311df8b53b74eaeac9295b813848216', concept: { sourceBinding: 'GEOMETRY_AND_PROTECTED_BOUNDARY_REBOUND_ON_FRESH_SOURCE_ONLY' } });
  }, 30_000);
});
