import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_mp09_long_water_west_bank_bypass_01.mjs');
const WRAPPER = path.join(ROOT, 'scripts/run_mp09_long_water_west_bank_bypass_release.mjs');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp09-west-bank-'));
const read = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const sha256 = (value: string | Buffer) => crypto.createHash('sha256').update(value).digest('hex');
afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('MP09 Long Water west-bank bypass', () => {
  it('emits a deterministic exact inverse while retaining the complete closed water component', () => {
    const run = (suffix: string) => {
      const out = path.join(temporaryDirectory, suffix, 'ops');
      const evidence = path.join(temporaryDirectory, suffix, 'evidence');
      execFileSync(process.execPath, [SCRIPT, '--out-dir', out, '--evidence-dir', evidence, '--generated-at', '2026-08-26T22:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
      return { out, evidence, manifest: read(path.join(out, 'mp09-long-water-west-bank-bypass-01.release-manifest.json')) };
    };
    const first = run('one'); const second = run('two');
    expect(first.manifest).toMatchObject({ status: 'COMPILED_OFFLINE_AWAITING_FRESH_RELEASE_KERNEL', mutationAuthority: false, target: { cellCount: 274, completeCanonicalBlockStates: true }, retainedHydrology: { componentCellCount: 1477, boundaryFaces: [], closedComponentProven: true, targetIntersections: 0, sourceFluidMutations: 0, targetFluidMutations: 0, rollbackFluidMutations: 0 }, route: { width: 2, minHeadroom: 2, maxStepRise: 1, fluidDisplacementCells: 0 }, isolation: { blockEntityIntersections: [], savedEntityIntersectionsAtCapture: [] } });
    const forward = fs.readFileSync(path.join(first.out, 'mp09-long-water-west-bank-bypass-01.forward.txt'), 'utf8').split(/\r?\n/).filter((line) => line.startsWith('REPL '));
    const rollback = fs.readFileSync(path.join(first.out, 'mp09-long-water-west-bank-bypass-01.rollback.txt'), 'utf8').split(/\r?\n/).filter((line) => line.startsWith('REPL '));
    expect(forward).toHaveLength(274);
    expect(rollback).toEqual(forward.slice().reverse().map((line) => { const fields = line.split(/\s+/); return [...fields.slice(0, 7), fields[8], fields[7]].join(' '); }));
    for (const filename of ['mp09-long-water-west-bank-bypass-01.forward.txt', 'mp09-long-water-west-bank-bypass-01.rollback.txt']) {
      expect(sha256(fs.readFileSync(path.join(first.out, filename)))).toBe(sha256(fs.readFileSync(path.join(second.out, filename))));
    }
    expect(read(path.join(first.evidence, 'offline-readiness.json')).status).toBe('PASS_COMPILED_DRY_WEST_BANK_BYPASS_RETAINS_CLOSED_LONG_WATER_COMPONENT');
  }, 30000);

  it('runs every offline fresh-kernel stage in prepare-only mode without a live operation', () => {
    const evidence = path.join(temporaryDirectory, 'kernel-evidence');
    execFileSync(process.execPath, [WRAPPER, '--source-snapshot-root', 'data/worldsnap-mp06-endpoint-elevated-crossing-post-20260826T143902Z', '--out-dir', evidence], { cwd: ROOT, stdio: 'pipe' });
    const ledger = read(path.join(evidence, 'fresh-kernel-ledger.json'));
    expect(ledger.status).toBe('PREPARED_STATIC_SOURCE_REQUIRES_EXECUTE_MODE_FOR_FRESH_CAPTURE_AND_LIVE_ENTITY_CLEARANCE');
    expect(ledger.stages.map((stage: { stage: string; status: string }) => [stage.stage, stage.status])).toEqual([
      ['fresh-source-compiler-rebind', 'PASS'], ['forward-source-preflight', 'PASS'], ['projected-rollback-preflight', 'PASS'], ['block-entity-clearance', 'PASS'], ['strict-forward-parser', 'PASS'], ['strict-rollback-parser', 'PASS'],
    ]);
  }, 30000);
});
