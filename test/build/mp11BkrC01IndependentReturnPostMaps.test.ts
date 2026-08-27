import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'docs/masterplans/11-town-expansion-r1/02-visuals/mp11-bkr-c01-independent-return-01');

describe('MP11/BKR C01 independent-return immutable-post coordinate maps', () => {
  it('binds the accepted as-built post state, route, and containment evidence', () => {
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/generate_mp11_bkr_c01_independent_return_post_maps_01.mjs'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const evidence = JSON.parse(fs.readFileSync(path.join(OUT, 'c01-independent-return-post-map-evidence.json'), 'utf8'));
    expect(result.status).toBe('PASS_PUBLISHED_READ_ONLY_EXECUTED_POSTSTATE_MAPS');
    expect(evidence.readOnly).toBe(true);
    expect(evidence.worldMutated).toBe(false);
    expect(evidence.geometry.stationCount).toBe(105);
    expect(evidence.geometry.containment.cellCount).toBe(228);
    expect(evidence.postStateEvidence.canonicalPostStateMapMismatches).toEqual([]);
    expect(evidence.postStateEvidence.reconstructedReturnFailures).toEqual([]);
    expect(evidence.postStateEvidence.independentQa).toMatchObject({ normalWalkDirections: 2, normalWalkFailures: 0, haloCells: 6290, haloFailures: 0, blockEntityFailures: 0 });
    expect(fs.existsSync(path.join(OUT, 'c01-independent-return-plan.svg'))).toBe(true);
    expect(fs.existsSync(path.join(OUT, 'c01-independent-return-section.svg'))).toBe(true);
  });
});
