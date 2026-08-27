import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMPILER = path.join(ROOT, 'scripts/compile_mp06_endpoint_elevated_crossing_01.mjs');
const SNAPSHOT = 'data/worldsnap-mp07-full-circulation-post-20260826T141000Z';
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp06-endpoint-crossing-'));
const missingContract = path.join(temporaryDirectory, 'missing-input-contract.json');
const acceptedContract = path.join(temporaryDirectory, 'accepted-contract.json');

type Point = [number, number, number];
type Operation = { point: Point; sourceState: string; targetState: string; roles: string[] };

function cellHash(points: Point[]): string {
  const sorted = [...new Map(points.map((point) => [point.join(','), point])).values()]
    .sort((left, right) => left[0] - right[0] || left[1] - right[1] || left[2] - right[2]);
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-coordinate-cell-set-v1\n');
  for (const [x, y, z] of sorted) digest.update(`${x},${y},${z}\n`);
  return digest.digest('hex');
}

function bridgeOperations(): Operation[] {
  const operations: Operation[] = [];
  for (let x = -264; x <= -252; x += 1) for (let z = -501; z <= -493; z += 1) {
    const roles = ['deck', 'structure'];
    if (x === -264 && z === -501) roles.push('cap-transition');
    operations.push({ point: [x, 71, z], sourceState: 'minecraft:air', targetState: 'minecraft:gray_concrete', roles });
  }
  // One purpose-built side fixture carries both edge-safety and lighting; it
  // is outside the normal-walk trace and does not require a fake drain/pier.
  operations.push({
    point: [-264, 72, -502], sourceState: 'minecraft:air', targetState: 'minecraft:sea_lantern', roles: ['edge-safety', 'lighting'],
  });
  return operations;
}

function fullAcceptedContract(): Record<string, unknown> {
  const operations = bridgeOperations();
  const points = operations.map(({ point }) => point);
  const byRole = (role: string) => operations.filter((operation) => operation.roles.includes(role)).map(({ point }) => point);
  const upperForward: Point[] = [[-265, 73, -497]];
  for (let x = -264; x <= -251; x += 1) upperForward.push([x, 72, -497]);
  const lowerForward: Point[] = [];
  for (let x = -264; x <= -252; x += 1) lowerForward.push([x, 69, -497]);
  return {
    schemaVersion: 1,
    contractId: 'MP06-ENDPOINT-ELEVATED-CROSSING-01-EXACT-3D-CONTRACT',
    status: 'ACCEPTED_EXACT_3D_BRIDGE_CONTRACT',
    acceptedAtUtc: '2026-08-26T15:00:00Z',
    mutationAuthorityGranted: false,
    approvals: { ownerApprovals: [{ owner: 'TE-REGIONAL-APPROACH-ROAD' }, { owner: 'LOWER-ROAD-CUSTODIAN' }] },
    sourceSnapshot: {
      algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
      sha256: '0c5ebe1bc973e75398609b570f16abd02076d4a66aae2327432bb7d2a3f42fc1',
      regionFileCount: 52,
      directory: `${SNAPSHOT}/region`,
      completeSaveCapture: `${SNAPSHOT}/combined-zones-complete-save-capture.json`,
    },
    operations,
    ownership: {
      scopeId: 'TE-REGIONAL-APPROACH-ROAD',
      operationCoordinateSetSha256: cellHash(points),
      operationCells: points,
      protectedLowerClearwayCoordinateSetSha256: cellHash(Array.from({ length: 13 * 9 * 3 }, (_, index) => {
        const x = -264 + Math.floor(index / 27);
        const withinX = index % 27;
        return [x, 68 + Math.floor(withinX / 9), -501 + (withinX % 9)] as Point;
      })),
    },
    design: {
      palette: { deckState: 'minecraft:gray_concrete' },
      capTransition: { coordinateSetSha256: cellHash(byRole('cap-transition')) },
      structural: {
        coordinateSetSha256: cellHash(byRole('structure')),
        sideSupport: { mode: 'NONE_REQUIRED_DECK_IS_STRUCTURAL', targetCellCount: 0, targetCoordinateSetSha256: cellHash([]) },
      },
      edgeSafety: { coordinateSetSha256: cellHash(byRole('edge-safety')) },
      lighting: { coordinateSetSha256: cellHash(byRole('lighting')), fixtureCells: byRole('lighting') },
      drainage: {
        mode: 'DRY_NO_FLUID_NO_WATERLOGGED_NO_DISCHARGE',
        targetCellCount: 0,
        targetCoordinateSetSha256: cellHash([]),
        dischargeCells: [],
        noFluidIngress: true,
        noWaterloggedBlocks: true,
        noDischarge: true,
      },
    },
    operationBinding: {
      releaseId: 'MP06-ENDPOINT-ELEVATED-CROSSING-01',
      exactInverseRequired: true,
      targetCoordinateSetSha256: cellHash(points),
      cells: operations.map(({ point, sourceState, targetState }) => ({ point, fromState: sourceState, toState: targetState })),
    },
    projectedDualLevelRouteProof: {
      sourceRegionSha256: '0c5ebe1bc973e75398609b570f16abd02076d4a66aae2327432bb7d2a3f42fc1',
      elevated: { standard: 'NORMAL_WALK_NO_JUMP_NO_SPRINT_NO_DIG_NO_TOWER', forward: upperForward, reverse: [...upperForward].reverse() },
      lower: { standard: 'NORMAL_WALK_NO_JUMP_NO_SPRINT_NO_DIG_NO_TOWER', forward: lowerForward, reverse: [...lowerForward].reverse() },
    },
  };
}

function run(contract?: string): void {
  const args = [COMPILER, '--snapshot', SNAPSHOT, '--out-dir', temporaryDirectory, '--basename', 'should-not-exist'];
  if (contract) args.push('--contract', contract);
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('MP06 endpoint elevated crossing compiler', () => {
  it('requires an accepted exact 3-D contract before it can derive a package', () => {
    expect(() => run()).toThrow(/--contract is required/);
    expect(fs.existsSync(path.join(temporaryDirectory, 'should-not-exist.forward.txt'))).toBe(false);
  });

  it('rejects the surveyed air-span as insufficient design input, without writing a bare deck package', () => {
    fs.writeFileSync(missingContract, `${JSON.stringify({
      schemaVersion: 1,
      contractId: 'MP06-ENDPOINT-ELEVATED-CROSSING-01-EXACT-3D-CONTRACT',
      status: 'ACCEPTED_EXACT_3D_BRIDGE_CONTRACT',
      acceptedAtUtc: '2026-08-26T15:00:00Z',
      mutationAuthorityGranted: false,
      approvals: { ownerApprovals: [{ owner: 'TE-REGIONAL-APPROACH-ROAD' }, { owner: 'LOWER-ROAD-CUSTODIAN' }] },
      sourceSnapshot: {
        algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
        sha256: '0c5ebe1bc973e75398609b570f16abd02076d4a66aae2327432bb7d2a3f42fc1',
        regionFileCount: 52,
        directory: `${SNAPSHOT}/region`,
        completeSaveCapture: `${SNAPSHOT}/combined-zones-complete-save-capture.json`,
      },
    }, null, 2)}\n`);
    expect(() => run(missingContract)).toThrow(/missing exact operations/);
    expect(fs.existsSync(path.join(temporaryDirectory, 'should-not-exist.forward.txt'))).toBe(false);
    expect(fs.existsSync(path.join(temporaryDirectory, 'should-not-exist.rollback.txt'))).toBe(false);
    expect(fs.existsSync(path.join(temporaryDirectory, 'should-not-exist.release-manifest.json'))).toBe(false);
  });

  it('documents the immutable 13×9 deck and lower-clearway invariants in source code', () => {
    const source = fs.readFileSync(COMPILER, 'utf8');
    expect(source).toContain("const gap = { minX: -264, maxX: -252, y: 71, minZ: -501, maxZ: -493 }");
    expect(source).toContain("const lowerClearway = { minX: gap.minX, maxX: gap.maxX, minY: 68, maxY: 70");
    expect(source).toContain('bare deck fill is prohibited');
    expect(source).toContain('projectedDualLevelRouteProof');
  });

  it('accepts a full exact contract with shared deck/structural/transition roles and zero drainage or side-support cells', () => {
    fs.writeFileSync(acceptedContract, `${JSON.stringify(fullAcceptedContract(), null, 2)}\n`);
    run(acceptedContract);
    const forward = fs.readFileSync(path.join(temporaryDirectory, 'should-not-exist.forward.txt'), 'utf8');
    const manifest = JSON.parse(fs.readFileSync(path.join(temporaryDirectory, 'should-not-exist.release-manifest.json'), 'utf8')) as Record<string, unknown>;
    expect(forward.split(/\r?\n/).filter((line) => line.startsWith('REPL '))).toHaveLength(118);
    expect(forward).toContain('REPL -264 71 -501 -264 71 -501 minecraft:air minecraft:gray_concrete');
    expect(manifest).toMatchObject({
      status: 'COMPILED_FROM_ACCEPTED_EXACT_3D_BRIDGE_CONTRACT_AWAITING_FRESH_LIVE_KERNEL',
      invariants: { bareDeckFillRejected: true },
    });
  }, 30_000);
});
