import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SOURCE = 'data/worldsnap-sys03-mp11-c01-arrival-wayfinding-frontier-post-20260827T035100Z';
const EXACT_SCOPE_HASHES = {
  targetCoordinateSetSha256: '67b47415d8356b387c0ed3ca269b5d259d788cf9ca5a9e3975721a75692bf831',
  haloCoordinateSetSha256: 'd442685e5ecb757b2bb0cf374669238f4e7f0c771978f99c6b9f088cb6a7b0a6',
  retainedCadenceOverlapStateSha256: '6a18060d9fc736ced71dce7d53af94ea47ef828a3ab62c17d93f81553c6a55f6',
  retainedStableGravityStateSha256: '0436a2e12feed9bceae785c4cf8e25527a55be32425ddd40b18cf26c6d74e5c7',
  forwardOperationSha256: '837afde1893a82e9b016ecff3825369a19693a8195b22399def0e7c0f1ededce',
  rollbackOperationSha256: '8f6561bfd5bad8c9aed43d94ef20bb709d39c2a9e629ffe36b46f51d3ff5ff81',
};
const made: string[] = [];
afterEach(() => made.splice(0).forEach((entry) => fs.rmSync(entry, { recursive: true, force: true })));

describe('MP11 C01 arrival gravity-support guarded runner', () => {
  it('runs the complete static prepare kernel with fresh scout/design/contract/compiler rebinding and no mutation', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'c01-arrival-support-prepare-')); made.push(temp);
    const out = path.join(temp, 'prepare');
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/run_mp11_c01_arrival_gravity_support_01_release.mjs', '--out-dir', out, '--source-snapshot-root', SOURCE], { cwd: ROOT, encoding: 'utf8', timeout: 120_000, maxBuffer: 128 * 1024 * 1024 }));
    const ledger = JSON.parse(fs.readFileSync(path.join(out, 'guarded-release-ledger.json'), 'utf8'));
    expect(result.status).toBe('PREPARED_FULL_STATIC_KERNEL_PASS_REQUIRES_EXECUTE_FOR_FRESH_ENTITY_GATE_AND_MUTATION');
    expect(ledger.stages.every((stage: { status: string }) => stage.status === 'PASS')).toBe(true);
    expect(ledger.stages.map((stage: { stage: string }) => stage.stage)).toEqual(expect.arrayContaining(['storage-sanity', 'fresh-scout-rebind', 'fresh-b07-design-rebind', 'fresh-ownership-contract-rebind', 'fresh-source-compile', 'full-halo-protected-cadence-retained-gravel-assertion']));
    const manifest = JSON.parse(fs.readFileSync(path.join(out, 'rebound/compile/mp11-c01-arrival-gravity-support-01.manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({ mutationAuthority: false, target: { cellCount: 33, canonicalTargetState: 'minecraft:polished_deepslate' }, interactionSet: { haloCellCount: 219, sourceRetainedStableGravityCount: 1 }, protectedInterfaces: { arrivalCadence: { retainedOverlapCellCount: 4 } } });
  }, 120_000);

  it('rebinds an exact authorization in prepare-only mode without treating its stale contract identity as authority scope', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'c01-arrival-support-auth-rebind-')); made.push(temp);
    const auth = path.join(temp, 'exact-auth.json');
    const stalePreissuedContractIdentity = 'f'.repeat(64);
    fs.writeFileSync(auth, JSON.stringify({ releaseId: 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-01', status: 'ACTIVE_CONDITIONAL_ON_FULL_FRESH_GUARDED_KERNEL', executionAuthorized: true, rconAuthorized: true, worldMutationAuthorized: true, revoked: false, noBroaderAuthority: true, requiresFreshSourceAndPost: true, requiresExactSourceBoundRecompile: true, requiresNamedOwnershipInterfaceContract: 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-OWNERSHIP-INTERFACE-01', contractIdentitySha256: stalePreissuedContractIdentity, scope: { targetCount: 33, interactionHaloCellCount: 219, canonicalSourceState: 'minecraft:gravel', canonicalTargetState: 'minecraft:polished_deepslate', retainedCadenceOverlapCellCount: 4, retainedStableGravityCellCount: 1, ...EXACT_SCOPE_HASHES } }));
    const out = path.join(temp, 'prepare');
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/run_mp11_c01_arrival_gravity_support_01_release.mjs', '--out-dir', out, '--source-snapshot-root', SOURCE, '--execution-authorization', auth], { cwd: ROOT, encoding: 'utf8', timeout: 120_000, maxBuffer: 128 * 1024 * 1024 }));
    const ledger = JSON.parse(fs.readFileSync(path.join(out, 'guarded-release-ledger.json'), 'utf8'));
    expect(result.status).toBe('PREPARED_FULL_STATIC_KERNEL_PASS_REQUIRES_EXECUTE_FOR_FRESH_ENTITY_GATE_AND_MUTATION');
    expect(ledger.authorization).toMatchObject({ path: path.relative(ROOT, auth).split(path.sep).join('/'), scope: EXACT_SCOPE_HASHES });
    expect(ledger.authorization.contractIdentitySha256).toBeUndefined();
    expect(ledger.source.contract.identitySha256).not.toBe(stalePreissuedContractIdentity);
    expect(ledger.source.contract.identitySha256).toHaveLength(64);
  }, 120_000);

  it('rejects a bad target-coordinate authorization hash before any live capture destination is created', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'c01-arrival-support-auth-')); made.push(temp);
    const bad = path.join(temp, 'bad-auth.json'); fs.writeFileSync(bad, JSON.stringify({ releaseId: 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-01', status: 'ACTIVE_CONDITIONAL_ON_FULL_FRESH_GUARDED_KERNEL', executionAuthorized: true, rconAuthorized: true, worldMutationAuthorized: true, revoked: false, noBroaderAuthority: true, requiresFreshSourceAndPost: true, requiresExactSourceBoundRecompile: true, requiresNamedOwnershipInterfaceContract: 'MP11-C01-ARRIVAL-GRAVITY-SUPPORT-OWNERSHIP-INTERFACE-01', contractIdentitySha256: '69273d29fd15a7f6d204c905ac4e8fc8f879cd01b2a678a268f269c1f11c6876', scope: { targetCount: 33, interactionHaloCellCount: 219, canonicalSourceState: 'minecraft:gravel', canonicalTargetState: 'minecraft:polished_deepslate', retainedCadenceOverlapCellCount: 4, retainedStableGravityCellCount: 1, ...EXACT_SCOPE_HASHES, targetCoordinateSetSha256: '0'.repeat(64) } }));
    const source = path.join(temp, 'source');
    expect(() => execFileSync(process.execPath, ['scripts/run_mp11_c01_arrival_gravity_support_01_release.mjs', '--execute', '--out-dir', path.join(temp, 'out'), '--source-snapshot-root', source, '--post-snapshot-root', path.join(temp, 'post'), '--failure-post-snapshot-root', path.join(temp, 'failure'), '--recovery-post-snapshot-root', path.join(temp, 'recovery'), '--execution-authorization', bad], { cwd: ROOT, stdio: 'pipe' })).toThrow(/authorization does not exact-bind/);
    expect(fs.existsSync(source)).toBe(false);
    expect(fs.existsSync(path.join(temp, 'out'))).toBe(false);
  });

  it('derives a partial-failure recovery subset only from strict alternating journal results', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'c01-arrival-support-journal-')); made.push(temp);
    const forward = path.join(temp, 'forward.txt'), rollback = path.join(temp, 'rollback.txt'), journal = path.join(temp, 'journal.jsonl'), subset = path.join(temp, 'subset.txt');
    fs.writeFileSync(forward, 'REPL 1 41 1 1 41 1 minecraft:gravel minecraft:polished_deepslate\nREPL 2 41 1 2 41 1 minecraft:gravel minecraft:polished_deepslate\n');
    fs.writeFileSync(rollback, 'REPL 2 41 1 2 41 1 minecraft:polished_deepslate minecraft:gravel\nREPL 1 41 1 1 41 1 minecraft:polished_deepslate minecraft:gravel\n');
    fs.writeFileSync(journal, `${JSON.stringify({ batch: { status: 'group-intent', activeGroupIndex: 0 } })}\n${JSON.stringify({ batch: { status: 'group-result', activeGroupIndex: 0, activeGroupResult: 'passed' } })}\n${JSON.stringify({ batch: { status: 'group-intent', activeGroupIndex: 1 } })}\n${JSON.stringify({ batch: { status: 'group-result', activeGroupIndex: 1, activeGroupResult: 'failed' } })}\n`);
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/derive_guarded_rollback_subset.mjs', '--forward', forward, '--rollback', rollback, '--journal', journal, '--out', subset], { cwd: ROOT, encoding: 'utf8' }));
    expect(result).toMatchObject({ successfulForwardGroupIndexes: [0], terminalFailedGroupIndex: 1, rollbackSubsetCount: 1 });
    expect(fs.readFileSync(subset, 'utf8')).toContain('REPL 1 41 1');
  });
});
