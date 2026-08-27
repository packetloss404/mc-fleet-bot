import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..'); const temp: string[] = [];
afterEach(() => temp.splice(0).forEach((item) => fs.rmSync(item, { recursive: true, force: true })));
describe('AG-1 exterior-loop pier/deck support prepare-only compiler', () => {
  it('compiles exact reversible support only and keeps live execution forbidden', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ag1-exterior-loop-')); fs.rmSync(out, { recursive: true, force: true }); temp.push(out);
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/compile_ag1_citywide_exterior_loop_pier_deck_support_01.mjs', '--out', out, '--generated-at', '2026-08-28T08:45:00.000Z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
    expect(result).toMatchObject({ status: 'PREPARED_STATIC_SOURCE_FULL_OFFLINE_KERNEL_PASS_LIVE_EXECUTION_PROHIBITED', mutationAuthority: false, liveExecutionAuthorized: false });
    expect(result.targetCells).toBeGreaterThan(700); expect(result.forwardCommands).toBe(result.rollbackCommands);
    const manifest = JSON.parse(fs.readFileSync(path.join(out, 'ag1-citywide-exterior-loop-pier-deck-support-01.release-manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({ scope: { footprint: { minX: 320, maxX: 335, minZ: -806, maxZ: -784 }, deckSupportY: [82, 83] }, target: { exactInverse: true, desiredStateCensus: { 'minecraft:polished_deepslate': result.targetCells } }, safety: { fluidTargetOrHaloCount: 0, gravityTargetOrHaloCount: 0, protectedInterfaceHits: [], blockEntities: [], entities: [] }, executionAuthority: { authorizedByThisArtifact: false, liveExecutionProhibited: true } });
    expect(manifest.parserAndPreflight.forwardStrictParserOnly.passed).toBe(true); expect(manifest.parserAndPreflight.rollbackStrictParserOnly.passed).toBe(true);
    expect(fs.existsSync(path.join(out, 'buildops/ag1-citywide-exterior-loop-pier-deck-support-01.forward.txt'))).toBe(true);
  }, 30_000);
});
