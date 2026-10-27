import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SOURCE = 'data/worldsnap-masterplan-frontier-source-20260827T030918Z';
const made: string[] = [];
afterEach(() => made.splice(0).forEach((entry) => fs.rmSync(entry, { recursive: true, force: true })));

describe('SYS03 / MP11 C01 arrival-wayfinding frontier compile and guarded release kernel', () => {
  it('emits the canonical 3-cell sea-lantern cadence and exact inverse from immutable source', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'c01-arrival-compile-')); made.push(temp);
    const contractOut = path.join(temp, 'contract');
    execFileSync(process.execPath, ['scripts/design_sys03_mp11_c01_arrival_wayfinding_ownership_interface_01.mjs', '--snapshot', SOURCE, '--out', contractOut], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/compile_sys03_mp11_c01_arrival_wayfinding_frontier_01.mjs', '--snapshot', SOURCE, '--contract', path.join(contractOut, 'sys03-mp11-c01-arrival-wayfinding-ownership-interface-01.json'), '--out', temp], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const manifest = JSON.parse(fs.readFileSync(path.join(temp, 'sys03-mp11-c01-arrival-wayfinding-frontier-01.release-manifest.json'), 'utf8'));
    expect(result).toMatchObject({ targetCount: 3, haloCount: 81, standingAuthorityApplies: true, mutationAuthority: false });
    expect(manifest.status).toBe('COMPILED_OFFLINE_SOURCE_BOUND_AWAITING_FRESH_GUARDED_KERNEL');
    expect(manifest.source.captureId).toBe('combined-zones-cacae8c7c06e4ac681538303f5fead54');
    expect(manifest.target).toMatchObject({ sourceStateCensus: { 'minecraft:light_blue_concrete': 3 }, desiredStateCensus: { 'minecraft:sea_lantern': 3 } });
    expect(manifest.scope.retainedC01Next01Inlays.cellCount).toBe(9);
    expect(manifest.operations.cadence).toMatchObject({ forwardCommandCount: 3, rollbackCommandCount: 3, exactInverse: true });
    expect(manifest.scope).toMatchObject({ canonicalOwner: 'C01-BUNKER-ARRIVAL-CADENCE-TARGET-OWNER', interactionHaloOwner: 'C01-BUNKER-ARRIVAL-CADENCE-HALO-OWNER' });
    expect(manifest.releaseReadiness).toMatchObject({ status: 'CONDITIONALLY_READY_ONLY_FOR_FRESH_GUARDED_KERNEL', noDirectExecutionFromCompiler: true });
    const forward = fs.readFileSync(path.join(temp, 'sys03-mp11-c01-arrival-wayfinding-frontier-01.cadence.forward.txt'), 'utf8');
    const rollback = fs.readFileSync(path.join(temp, 'sys03-mp11-c01-arrival-wayfinding-frontier-01.cadence.rollback.txt'), 'utf8');
    expect(forward).toMatch(/REPL 744 42 -81 744 42 -81 minecraft:light_blue_concrete minecraft:sea_lantern/);
    expect(forward).toMatch(/REPL 748 42 -81 748 42 -81 minecraft:light_blue_concrete minecraft:sea_lantern/);
    expect(forward).toMatch(/REPL 760 42 -81 760 42 -81 minecraft:light_blue_concrete minecraft:sea_lantern/);
    expect(rollback).toMatch(/minecraft:sea_lantern minecraft:light_blue_concrete/);
  });

  it('passes the source-bound static kernel but does not mutate in prepare-only mode', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'c01-arrival-prepare-')); made.push(temp);
    const contractOut = path.join(temp, 'contract');
    execFileSync(process.execPath, ['scripts/design_sys03_mp11_c01_arrival_wayfinding_ownership_interface_01.mjs', '--snapshot', SOURCE, '--out', contractOut], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
    const out = path.join(temp, 'prepare');
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/run_sys03_mp11_c01_arrival_wayfinding_frontier_01_release.mjs', '--out-dir', out, '--source-snapshot-root', SOURCE, '--contract', path.join(contractOut, 'sys03-mp11-c01-arrival-wayfinding-ownership-interface-01.json')], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const ledger = JSON.parse(fs.readFileSync(path.join(out, 'guarded-release-ledger.json'), 'utf8'));
    expect(result.mutationAuthority).toBe(false);
    expect(ledger.status).toBe('PREPARED_SOURCE_BOUND_STATIC_KERNEL_PASS_REQUIRES_EXECUTE_FOR_FRESH_LIVE_ENTITY_GATE_AND_MUTATION');
    expect(ledger.stages.every((stage: { status: string }) => stage.status === 'PASS')).toBe(true);
  }, 30_000);

  it('rejects a target/halo-mismatched execution authorization before any capture or mutation', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'c01-arrival-bad-auth-')); made.push(temp);
    const authorization = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/masterplans/11-town-expansion-r1/sys03-mp11-c01-arrival-wayfinding-frontier-01-execution-authorization.json'), 'utf8'));
    authorization.scope.targetCoordinateSetSha256 = '0'.repeat(64);
    const authPath = path.join(temp, 'bad-auth.json'); fs.writeFileSync(authPath, `${JSON.stringify(authorization)}\n`);
    expect(() => execFileSync(process.execPath, ['scripts/run_sys03_mp11_c01_arrival_wayfinding_frontier_01_release.mjs', '--execute', '--out-dir', path.join(temp, 'out'), '--source-snapshot-root', path.join(temp, 'source'), '--post-snapshot-root', path.join(temp, 'post'), '--failure-post-snapshot-root', path.join(temp, 'failure'), '--recovery-post-snapshot-root', path.join(temp, 'recovery'), '--contract', path.join(ROOT, 'data/world-review/sys03-mp11-c01-arrival-wayfinding-ownership-interface-01-masterplan-frontier-source-20260827T030918Z/sys03-mp11-c01-arrival-wayfinding-ownership-interface-01.json'), '--execution-authorization', authPath], { cwd: ROOT, stdio: 'pipe' })).toThrow(/authorization must exact-bind/);
    expect(fs.existsSync(path.join(temp, 'source'))).toBe(false);
  });

  it('derives a compensating rollback only for journal-confirmed successful forward groups', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'c01-arrival-recovery-')); made.push(temp);
    const forward = path.join(temp, 'forward.txt'); const rollback = path.join(temp, 'rollback.txt'); const journal = path.join(temp, 'forward.journal.jsonl'); const subset = path.join(temp, 'subset.txt');
    fs.writeFileSync(forward, '# forward\nREPL 744 42 -81 744 42 -81 minecraft:light_blue_concrete minecraft:sea_lantern\nREPL 748 42 -81 748 42 -81 minecraft:light_blue_concrete minecraft:sea_lantern\nREPL 760 42 -81 760 42 -81 minecraft:light_blue_concrete minecraft:sea_lantern\n');
    fs.writeFileSync(rollback, '# reverse\nREPL 760 42 -81 760 42 -81 minecraft:sea_lantern minecraft:light_blue_concrete\nREPL 748 42 -81 748 42 -81 minecraft:sea_lantern minecraft:light_blue_concrete\nREPL 744 42 -81 744 42 -81 minecraft:sea_lantern minecraft:light_blue_concrete\n');
    fs.writeFileSync(journal, `${JSON.stringify({ batch: { status: 'group-intent', activeGroupIndex: 0 } })}\n${JSON.stringify({ batch: { status: 'group-result', activeGroupIndex: 0, activeGroupResult: 'passed' } })}\n${JSON.stringify({ batch: { status: 'group-intent', activeGroupIndex: 1 } })}\n${JSON.stringify({ batch: { status: 'group-result', activeGroupIndex: 1, activeGroupResult: 'failed' } })}\n`);
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/derive_guarded_rollback_subset.mjs', '--forward', forward, '--rollback', rollback, '--journal', journal, '--out', subset], { cwd: ROOT, encoding: 'utf8' }));
    expect(result).toMatchObject({ status: 'EXACT_SUCCESS_JOURNAL_BOUND_ROLLBACK_SUBSET', successfulForwardGroupIndexes: [0], rollbackSubsetCount: 1 });
    const contents = fs.readFileSync(subset, 'utf8');
    expect(contents).toMatch(/REPL 744 42 -81/);
    expect(contents).not.toMatch(/REPL 748 42 -81/);
    expect(contents).not.toMatch(/REPL 760 42 -81/);
  });

  it('rejects unresolved and out-of-order journal mappings instead of guessing a rollback set', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'c01-arrival-journal-')); made.push(temp);
    const forward = path.join(temp, 'forward.txt'); const rollback = path.join(temp, 'rollback.txt'); const journal = path.join(temp, 'journal.jsonl');
    const operations = 'REPL 744 42 -81 744 42 -81 minecraft:light_blue_concrete minecraft:sea_lantern\nREPL 748 42 -81 748 42 -81 minecraft:light_blue_concrete minecraft:sea_lantern\n';
    fs.writeFileSync(forward, operations); fs.writeFileSync(rollback, 'REPL 748 42 -81 748 42 -81 minecraft:sea_lantern minecraft:light_blue_concrete\nREPL 744 42 -81 744 42 -81 minecraft:sea_lantern minecraft:light_blue_concrete\n');
    fs.writeFileSync(journal, `${JSON.stringify({ batch: { status: 'group-intent', activeGroupIndex: 0 } })}\n${JSON.stringify({ batch: { status: 'group-result', activeGroupIndex: 0, activeGroupResult: 'passed' } })}\n${JSON.stringify({ batch: { status: 'group-intent', activeGroupIndex: 1 } })}\n`);
    expect(() => execFileSync(process.execPath, ['scripts/derive_guarded_rollback_subset.mjs', '--forward', forward, '--rollback', rollback, '--journal', journal, '--out', path.join(temp, 'unresolved.txt')], { cwd: ROOT, stdio: 'pipe' })).toThrow(/unresolved group-intent/);
    fs.writeFileSync(journal, `${JSON.stringify({ batch: { status: 'group-intent', activeGroupIndex: 0 } })}\n${JSON.stringify({ batch: { status: 'group-result', activeGroupIndex: 0, activeGroupResult: 'failed' } })}\n${JSON.stringify({ batch: { status: 'group-intent', activeGroupIndex: 1 } })}\n${JSON.stringify({ batch: { status: 'group-result', activeGroupIndex: 1, activeGroupResult: 'passed' } })}\n`);
    expect(() => execFileSync(process.execPath, ['scripts/derive_guarded_rollback_subset.mjs', '--forward', forward, '--rollback', rollback, '--journal', journal, '--out', path.join(temp, 'out-of-order.txt')], { cwd: ROOT, stdio: 'pipe' })).toThrow(/terminal failed|non-terminal result/);
    fs.writeFileSync(journal, `${JSON.stringify({ batch: { status: 'group-intent', activeGroupIndex: 0 } })}\n${JSON.stringify({ batch: { status: 'group-intent', activeGroupIndex: 1 } })}\n${JSON.stringify({ batch: { status: 'group-result', activeGroupIndex: 0, activeGroupResult: 'passed' } })}\n${JSON.stringify({ batch: { status: 'group-result', activeGroupIndex: 1, activeGroupResult: 'failed' } })}\n`);
    expect(() => execFileSync(process.execPath, ['scripts/derive_guarded_rollback_subset.mjs', '--forward', forward, '--rollback', rollback, '--journal', journal, '--out', path.join(temp, 'interleaved.txt')], { cwd: ROOT, stdio: 'pipe' })).toThrow(/interleaved/);
  });

});
