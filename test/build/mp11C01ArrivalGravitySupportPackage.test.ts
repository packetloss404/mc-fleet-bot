import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SOURCE = 'data/worldsnap-sys03-mp11-c01-arrival-wayfinding-frontier-post-20260827T035100Z';
const SCOUT = 'data/world-review/mp11-c01-arrival-gravity-support-scout-01-arrival-post-20260827T035100Z/mp11-c01-arrival-gravity-support-scout-01.json';
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-c01-arrival-gravity-package-'));

afterAll(() => fs.rmSync(TEMP, { recursive: true, force: true }));

describe('MP11 C01 arrival gravity-support ownership contract and static guarded package', () => {
  it('binds the finite gravel component, preserves cadence overlap, and emits only an offline inverse package', () => {
    const design = path.join(TEMP, 'design');
    const designResult = JSON.parse(execFileSync(process.execPath, ['scripts/design_mp11_c01_arrival_gravity_support_ownership_interface_01.mjs', '--snapshot', SOURCE, '--scout', SCOUT, '--out', design], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 }));
    const contractPath = path.join(design, 'mp11-c01-arrival-gravity-support-ownership-interface-01.json');
    const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    expect(designResult).toMatchObject({ status: 'ACCEPTED_STANDING_SCOPE_STATIC_CONTRACT_AWAITING_FRESH_GUARDED_KERNEL', targetCount: 33, haloCount: 219, preservedCadenceOverlapCount: 4, mutationAuthority: false });
    expect(contract.authority).toMatchObject({ standingDirectiveAppliesToStaticDesignAndFutureScopedExecution: true, executionAuthorizedByThisContract: false, noBroaderAuthority: true });
    expect(contract.ownership.targetComponent).toMatchObject({ cellCount: 33, canonicalSourceState: 'minecraft:gravel', canonicalTargetState: 'minecraft:polished_deepslate' });
    expect(contract.ownership.arrivalCadenceProtectedInterface).toMatchObject({ retainedOverlapCellCount: 4 });
    expect(contract.ownership.interactionHalo.retainedStableGravity).toEqual([{ cell: { x: 757, y: 41, z: -77 }, sourceState: 'minecraft:gravel', supportCell: { x: 757, y: 40, z: -77 }, supportState: 'minecraft:polished_deepslate' }]);
    expect(fs.existsSync(path.join(design, 'mp11-c01-arrival-gravity-support-ownership-interface-01-map.svg'))).toBe(true);

    const compile = path.join(TEMP, 'compile');
    const compileResult = JSON.parse(execFileSync(process.execPath, ['scripts/compile_mp11_c01_arrival_gravity_support_01.mjs', '--snapshot', SOURCE, '--contract', contractPath, '--out', compile], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 }));
    const manifest = JSON.parse(fs.readFileSync(path.join(compile, 'mp11-c01-arrival-gravity-support-01.manifest.json'), 'utf8'));
    expect(compileResult).toMatchObject({ status: 'OFFLINE_COMPILED_STATIC_GUARDED_PACKAGE_AWAITING_FRESH_KERNEL', targetCount: 33, haloCount: 219, retainedCadenceOverlapCount: 4, mutationAuthority: false });
    expect(manifest).toMatchObject({ mutationAuthority: false, liveCallsPerformed: false, worldEditsPerformed: false });
    expect(manifest.operations.forward).toMatchObject({ commandCount: 33, strictNoopRequired: true });
    expect(manifest.operations.rollback).toMatchObject({ commandCount: 33, strictNoopRequired: true, exactInverseOfForward: true });
    expect(manifest.protectedInterfaces.arrivalCadence).toMatchObject({ retainedOverlapCellCount: 4, directTargetIntersectionCount: 0, mustRemainUntargeted: true });
    expect(manifest.interactionSet).toMatchObject({ sourceFluidCount: 0, sourceUnexpectedGravityCount: 0, sourceRetainedStableGravityCount: 1, sourceBlockEntityCount: 0, sourceSavedEntityCount: 0, projectedUnexpectedGravityCount: 0, projectedRetainedStableGravityCount: 1 });
    expect(manifest.releaseKernel.runnerNotIncludedInThisStaticPackage).toBe(true);
    expect(manifest.releaseKernel.mandatoryFreshStages).toHaveLength(10);
    const forward = fs.readFileSync(path.join(compile, 'mp11-c01-arrival-gravity-support-01.forward.txt'), 'utf8').trim().split('\n');
    const rollback = fs.readFileSync(path.join(compile, 'mp11-c01-arrival-gravity-support-01.rollback.txt'), 'utf8').trim().split('\n');
    expect(forward).toHaveLength(33); expect(rollback).toHaveLength(33);
    expect(forward.some((line) => line.includes('757 41 -77'))).toBe(false);
    expect(rollback.some((line) => line.includes('757 41 -77'))).toBe(false);
  });
});
