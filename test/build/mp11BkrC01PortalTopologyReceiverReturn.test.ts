import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-bkr-c01-topology-'));
const out = path.join(temp, 'design');
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP11/BKR C01 portal topology, receiver, and return gate', () => {
  it('proves that portal containers are not the blocker while topology and alternate return remain held', () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/design_mp11_bkr_c01_portal_topology_receiver_return_02.mjs', '--out', out,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp11-bkr-c01-portal-topology-receiver-return-02.json'), 'utf8'));
    expect(result.mutationAuthority).toBe(false);
    expect(report.status).toBe('NO_PORTAL_PHYSICAL_SCOPE_READY_TO_COMPILE');
    expect(report.gravityTopology.cellCount).toBe(1690);
    expect(report.gravityTopology.boundaryTouchingComponentCount).toBeGreaterThan(0);
    expect(report.fluidReceiverInventory.fluidCellCount).toBe(0);
    expect(report.containerBoundary.containerCount).toBe(0);
    expect(report.containerBoundary.disposition).toBe('PORTAL_SCOPE_CAN_AVOID_CONTAINER_MIGRATION');
    expect(report.returnInventory.directReturn.stationCount).toBe(127);
    expect(report.returnInventory.twoIndependentReturnsProven).toBe(false);
    expect(fs.existsSync(path.join(out, 'mp11-bkr-c01-portal-topology-receiver-return-map.svg'))).toBe(true);
  });
});
