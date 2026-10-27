import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'citywide-surface-loop-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('citywide surface rail and promenade network 01', () => {
  it('maps only an exterior, source-bound concept and preserves every town interface', () => {
    const out = path.join(temp, 'network.json'); const map = path.join(temp, 'network.svg'); const markdown = path.join(temp, 'network.md');
    execFileSync(process.execPath, ['scripts/design_citywide_surface_loop_network_01.mjs', '--out', out, '--map', map, '--markdown', markdown, '--generated-at', '2026-08-28T08:00:00.000Z'], { cwd: ROOT, stdio: 'pipe', maxBuffer: 8 * 1024 * 1024 });
    const report = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(report).toMatchObject({
      id: 'CITYWIDE-SURFACE-LOOP-NETWORK-02', status: 'SOURCE_BOUND_CONCEPT_NETWORK_SURVEY_ONLY', mutationAuthority: false,
      source: { immutableCopy: true, requiredMembers: 130 },
      design: { rail: { loopBounds: { minX: -784, maxX: 1631, minZ: -784, maxZ: 383, clearanceFromCatalogUnion: 64 }, segments: expect.any(Array) }, promenade: { minimumConceptualClearWidth: 5 }, externalSurveyGates: expect.any(Array) },
      safetyBoundary: { readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
    });
    expect(report.existingRoadAndPathInventory).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'MP06-APPROACH-ROAD', measuredRouteStations: 207 }),
      expect.objectContaining({ id: 'MP07-RRMSA', stations: 534 }),
      expect.objectContaining({ id: 'SYS01-CROSS-COMPONENT', decision: 'NO_DISJOINT_CITYWIDE_LINK_RELEASE' }),
    ]));
    expect(report.design.rail.segments).toHaveLength(8);
    expect(report.design.externalSurveyGates).toHaveLength(6);
    expect(report.exteriorTerrainScreen).toMatchObject({ sampledColumns: 448, surfaceKinds: { 'fluid-surface': 126, 'no-observed-surface': 73, 'solid-surface': 249 } });
    for (const sample of report.exteriorTerrainScreen.samples) for (const area of report.protectedInterfaces) expect(sample.x < area.bounds.minX || sample.x > area.bounds.maxX || sample.z < area.bounds.minZ || sample.z > area.bounds.maxZ).toBe(true);
    expect(fs.existsSync(map)).toBe(true); expect(fs.existsSync(markdown)).toBe(true);
    expect(fs.readFileSync(map, 'utf8')).not.toMatch(/\b(?:NaN|Infinity|-Infinity)\b/);
  });
});
