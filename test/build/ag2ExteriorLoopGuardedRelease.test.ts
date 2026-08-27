import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..'); const created: string[] = [];
afterEach(() => created.splice(0).forEach((item) => fs.rmSync(item, { recursive: true, force: true })));
describe('AG-2 guarded release kernel', () => {
  it('prepares only from a complete immutable source and records every non-live kernel gate', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ag2-kernel-')); const out = path.join(base, 'out'); created.push(base);
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/run_ag2_exterior_loop_deck_module_01_release.mjs', '--out-dir', out, '--source-snapshot-root', 'data/worldsnap-ag1-exterior-loop-exec-post-20260827T014350Z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
    expect(result).toMatchObject({ status: 'PREPARED_REBOUND_SOURCE_REQUIRES_EXECUTE_FOR_IMMEDIATE_CAPTURE_LIVE_ENTITY_CLEARANCE_AND_GUARDED_MUTATION', mutationAuthority: false });
    const ledger = JSON.parse(fs.readFileSync(path.join(out, 'ag2-guarded-release-ledger.json'), 'utf8'));
    expect(ledger).toMatchObject({ releaseId: 'AG2-CITYWIDE-EXTERIOR-LOOP-DECK-MODULE-01', mode: 'PREPARE_ONLY', mutationAuthority: false, sourceSnapshot: { manifestSha256: expect.any(String) } });
    expect(ledger.stages.filter((stage: { status: string }) => stage.status === 'PASS').map((stage: { stage: string }) => stage.stage)).toEqual(expect.arrayContaining(['source-complete-save-intake', 'fresh-ag2-compiler-rebind', 'exact-forward-source-preflight', 'strict-forward-parser', 'strict-rollback-parser', 'projected-rollback-preflight', 'block-entity-and-protected-core-clearance']));
    expect(ledger.stages.map((stage: { stage: string }) => stage.stage)).not.toContain('same-moment-live-entity-clearance');
  }, 30_000);
  it('keeps independent QA fail-closed without an exact immutable post-release input', () => {
    expect(() => execFileSync(process.execPath, ['scripts/qa_ag2_exterior_loop_deck_module_01_post_release.mjs'], { cwd: ROOT, stdio: 'pipe' })).toThrow();
  });
});
