import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const made: string[] = [];
afterEach(() => made.splice(0).forEach((entry) => fs.rmSync(entry, { recursive: true, force: true })));

describe('SYS03 / MP11 C01 arrival-wayfinding as-built visuals', () => {
  it('publishes source-bound plan, section, and non-commissioning evidence from accepted post QA', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'c01-arrival-visuals-')); made.push(out);
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/publish_sys03_mp11_c01_arrival_wayfinding_as_built_visuals.mjs', '--out', out], { cwd: ROOT, encoding: 'utf8' }));
    expect(result).toMatchObject({ status: 'PASS_EXECUTED_POSTSTATE_SOURCE_BOUND_NOT_COMMISSIONED', targetCount: 3, mutationAuthority: false });
    const evidence = JSON.parse(fs.readFileSync(path.join(out, 'c01-arrival-wayfinding-as-built-evidence.json'), 'utf8'));
    expect(evidence.geometry).toMatchObject({ targetCount: 3, interactionHaloCellCount: 81 });
    expect(evidence.asBuiltChecks).toMatchObject({ flatWalkSurface: true, twoClearHeadroom: true, haloUnexpectedDriftCount: 0, blockEntityCount: 0, savedEntityCount: 0, forwardAndRollbackExactInverse: true });
    for (const file of ['c01-arrival-wayfinding-as-built-plan.svg', 'c01-arrival-wayfinding-as-built-section.svg']) {
      const svg = fs.readFileSync(path.join(out, file), 'utf8');
      expect(svg).toContain('<svg');
      expect(svg).not.toMatch(/(?:NaN|Infinity)/);
    }
    expect(fs.readFileSync(path.join(out, 'README.md'), 'utf8')).toMatch(/does not commission a route/i);
  });
});
