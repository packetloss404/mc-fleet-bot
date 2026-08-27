import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const made: string[] = [];
afterEach(() => made.splice(0).forEach((entry) => fs.rmSync(entry, { recursive: true, force: true })));

describe('MP05 / MP08 accepted C01-post safety-delta scout', () => {
  it('rejects stale lighting replay and local B07 fluid boundaries without emitting operations', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-mp08-c01-post-scout-')); made.push(out);
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/scout_mp05_mp08_c01_post_safety_delta_01.mjs', '--out', out], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    expect(result).toMatchObject({ status: 'NO_FINITE_UNBUILT_SAFETY_DELTA_ON_ACCEPTED_C01_POST_SOURCE', maps: 2, b07FixtureCount: 25, c1RevertedFixtureCount: 8, mutationAuthority: false });
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp05-mp08-c01-post-safety-delta-scout-01.json'), 'utf8'));
    expect(report.decision).toMatchObject({ prepareReadyCandidate: null, forwardOperationCount: 0, rollbackOperationCount: 0 });
    expect(report.lightingReconnaissance.mp05B07AcceptedFixtures.observedStateCensus).toEqual({ 'minecraft:glowstone': 25 });
    expect(report.lightingReconnaissance.mp08C1RevertedFixtures).toMatchObject({ candidate: null, observedStateCensus: { 'minecraft:polished_deepslate': 8 } });
    expect(report.b07LocalFluidBoundary).toMatchObject({ constructionTargetFaceCount: 0, candidate: null });
    expect(fs.readdirSync(out).filter((file) => file.endsWith('.txt')).length).toBe(0);
    for (const file of fs.readdirSync(out).filter((file) => file.endsWith('.svg'))) expect(fs.readFileSync(path.join(out, file), 'utf8')).not.toMatch(/(?:NaN|Infinity)/);
  }, 30_000);
});
