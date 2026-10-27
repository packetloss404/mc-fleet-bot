import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const QA = path.join(ROOT, 'scripts/qa_mp06_endpoint_elevated_crossing_independent_post.mjs');
const FINALIZER = path.join(ROOT, 'scripts/finalize_mp06_endpoint_elevated_crossing_01.mjs');

describe('MP06 endpoint elevated-crossing release protocol', () => {
  it('has syntactically valid independent post QA and evidence finalizer scripts', () => {
    expect(() => execFileSync(process.execPath, ['--check', QA], { cwd: ROOT, stdio: 'pipe' })).not.toThrow();
    expect(() => execFileSync(process.execPath, ['--check', FINALIZER], { cwd: ROOT, stdio: 'pipe' })).not.toThrow();
  });

  it('requires immutable-post two-level verification rather than compiler reuse', () => {
    const source = fs.readFileSync(QA, 'utf8');
    expect(source).not.toContain("compile_mp06_endpoint_elevated_crossing_01");
    expect(source).toContain('allExactAcceptedReleaseTargetsAtDesiredState');
    expect(source).toContain('all105ElevatedNormalWalkStationsConnected');
    expect(source).toContain('all98DirectedElevatedEndpointPairsReachable');
    expect(source).toContain('all117LowerNormalWalkStationsConnected');
    expect(source).toContain('protectedLowerRoadFloorAndTwoBlockClearway');
  });

  it('refuses to finalize without the full evidence kernel and never relabels the static compiler as authority', () => {
    const source = fs.readFileSync(FINALIZER, 'utf8');
    expect(source).toContain('refuses to overwrite existing ledger');
    expect(source).toContain('PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE');
    expect(source).toContain('live-entity-clearance-pre-execution.json');
    expect(source).toContain('live-entity-clearance-immediate.json');
    expect(source).toContain('forward-stream-journal.jsonl');
    expect(source).toContain('EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE');
    expect(source).toContain('static compiler provenance only');
  });
});
