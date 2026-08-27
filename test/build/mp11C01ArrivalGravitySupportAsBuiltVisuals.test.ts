import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const made: string[] = [];
afterEach(() => made.splice(0).forEach((entry) => fs.rmSync(entry, { recursive: true, force: true })));

describe('MP11 C01 arrival gravity-support as-built visuals', () => {
  it('publishes exact post-state plan and section evidence without commissioning', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'c01-arrival-gravity-visuals-')); made.push(out);
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/publish_mp11_c01_arrival_gravity_support_as_built_visuals.mjs', '--out', out], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 }));
    expect(result).toMatchObject({ status: 'PASS_EXECUTED_POSTSTATE_SOURCE_BOUND_NOT_COMMISSIONED', assets: 4, targetCount: 33, interactionHaloCellCount: 219, mutationAuthority: false });
    const evidence = JSON.parse(fs.readFileSync(path.join(out, 'c01-arrival-gravity-support-as-built-evidence.json'), 'utf8'));
    expect(evidence.geometry).toMatchObject({ targetCount: 33, targetState: 'minecraft:polished_deepslate', interactionHaloCellCount: 219, cadenceRetainedOverlapCount: 4, retainedStableGravelCount: 1, planLayer: 41 });
    expect(evidence.asBuiltChecks).toMatchObject({ canonicalTargetCount: 33, canonicalTargetState: 'minecraft:polished_deepslate', floorSupportCount: 7, twoClearHeadroomAtEverySupport: true, forwardAndRollbackExactInverse: true });
    expect(evidence.nonClaims.join(' ')).toMatch(/does not commission/i);
    for (const name of ['c01-arrival-gravity-support-as-built-plan.svg', 'c01-arrival-gravity-support-as-built-section.svg']) {
      const svg = fs.readFileSync(path.join(out, name), 'utf8');
      expect(svg).toContain('<svg');
      expect(svg).toContain('33');
      expect(svg).not.toMatch(/(?:NaN|Infinity)/);
    }
  });
});
