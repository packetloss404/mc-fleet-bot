import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..'); const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach((item) => fs.rmSync(item, { recursive: true, force: true })));

describe('AG-1 exterior pier/girder guarded-release protocol', () => {
  it('rebinds AG-0 and AG-1 to an audited supplied source in prepare-only mode', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ag1-release-')); fs.rmSync(out, { recursive: true, force: true }); temporary.push(out);
    const source = 'data/worldsnap-mp05-b07-surface-receiver-descent-fixed-lighting-01-post-20260828T020000Z';
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/run_ag1_citywide_exterior_loop_pier_deck_support_01_release.mjs', '--source-snapshot-root', source, '--out-dir', out], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    expect(result).toMatchObject({ mutationAuthority: false, status: 'PREPARED_REBOUND_SOURCE_REQUIRES_EXECUTE_FOR_IMMEDIATE_CAPTURE_LIVE_ENTITY_CLEARANCE_AND_GUARDED_MUTATION' });
    const ledger = JSON.parse(fs.readFileSync(path.join(out, 'ag1-guarded-release-ledger.json'), 'utf8'));
    expect(ledger.mode).toBe('PREPARE_ONLY'); expect(ledger.mutationAuthority).toBe(false);
    expect(ledger.sourceSnapshot).toMatchObject({ root: source });
    for (const stage of ['source-complete-save-intake', 'fresh-ag0-survey-rebind', 'fresh-ag1-compiler-rebind', 'exact-forward-source-preflight', 'strict-forward-parser', 'strict-rollback-parser', 'projected-rollback-preflight', 'block-entity-and-protected-core-clearance']) expect(ledger.stages).toContainEqual(expect.objectContaining({ stage, status: 'PASS' }));
    expect(ledger.stages.some((stage: { stage: string }) => stage.stage === 'strict-forward-execution')).toBe(false);
    expect(ledger.stages.some((stage: { stage: string }) => stage.stage === 'same-moment-live-entity-clearance')).toBe(false);
    const manifest = JSON.parse(fs.readFileSync(path.join(out, 'rebound/ag1/ag1-citywide-exterior-loop-pier-deck-support-01.release-manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({ source: { root: source, ag0: { selectedCandidate: 'SL-02-N-AG0-0576' } }, target: { cellCount: 1165, exactInverse: true } });
  }, 90_000);
});
