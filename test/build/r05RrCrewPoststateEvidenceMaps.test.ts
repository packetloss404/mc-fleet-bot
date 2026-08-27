import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'r05-rr-crew-evidence-maps-'));
let mapbook: any;

describe('R05 lava plug and Ravensreach crew post-state evidence maps', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/generate_r05_rr_crew_evidence_maps_01.mjs',
      '--out-dir', OUT,
    ], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    mapbook = JSON.parse(fs.readFileSync(path.join(OUT, 'evidence-mapbook-manifest.json'), 'utf8'));
  }, 190_000);

  afterAll(() => fs.rmSync(OUT, { recursive: true, force: true }));

  it('binds maps to executed, immutable post-state evidence only', () => {
    expect(mapbook.status).toBe('PASS_EXECUTED_POSTSTATE_SOURCE_MAPS_ONLY');
    expect(mapbook.safetyBoundary).toMatchObject({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      executionAuthorized: false,
      snapshotOnly: true,
    });
    expect(mapbook.sources.r05.postSnapshot).toContain('mp05-r05-west-toe-lava-plug-post-20260826T223500Z');
    expect(mapbook.sources.crew.postSnapshot).toContain('cobalt-rr-midshaft-recovery-lighting-post-20260826T232000Z');
  });

  it('renders all requested coordinate-level scopes with exact fluid boundaries', () => {
    expect(mapbook.exactPostState).toEqual({
      r05LavaPlugCells: 36,
      historicalWaterBandObservedWaterCells: 76,
      crossoverAndLaddersWaterOrLavaCells: 0,
    });
    expect(Object.keys(mapbook.maps)).toEqual([
      'r05LavaPlugSection',
      'crewPlan',
      'crewNiche',
      'crewCrossover',
      'waterExclusion',
    ]);
    for (const filename of Object.values(mapbook.maps) as string[]) {
      const output = path.join(ROOT, filename.replace(/^data\/world-review\/r05-rr-crew-evidence-maps-20260826T232000Z/, OUT));
      expect(fs.existsSync(output)).toBe(true);
      expect(fs.readFileSync(output, 'utf8')).toContain('<svg');
    }
  });

  it('records the evidence-only non-claims', () => {
    expect(mapbook.nonClaims).toEqual(expect.arrayContaining([
      'not a live screenshot',
      'does not authorize any Minecraft mutation',
    ]));
  });
});
