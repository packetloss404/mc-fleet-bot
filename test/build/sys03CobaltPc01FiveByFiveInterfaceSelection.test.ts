import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const made: string[] = [];
afterEach(() => made.splice(0).forEach((entry) => fs.rmSync(entry, { recursive: true, force: true })));

describe('SYS03 PC-01 exact 5x5 interface selection', () => {
  it('binds four unaccepted source planes, retains the RR 3x3 deficit, and emits no authority', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sys03-pc01-5x5-'));
    made.push(temp);
    const out = path.join(temp, 'selection');
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/design_sys03_cobalt_pc01_5x5_interface_selection_01.mjs', '--out', out], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const design = JSON.parse(fs.readFileSync(path.join(out, 'sys03-cobalt-pc01-5x5-interface-selection-01.json'), 'utf8'));
    expect(result).toMatchObject({ status: 'SOURCE_BOUND_5X5_CANDIDATE_PLANES_ONLY__ALL_PUBLIC_ENDPOINTS_UNACCEPTED', publicEndpointCount: 4, allPublicEndpointsAccepted: false, mutationAuthority: false });
    expect(design.disposition).toMatchObject({ readOnly: true, operationsCompiled: false, releaseAuthorization: false, rconCalled: false, worldMutated: false, publicStationOpen: false, passengerServiceCommissioned: false });
    expect(design.candidatePlanes).toHaveLength(4);
    for (const plane of design.candidatePlanes) {
      expect(plane.shape).toMatchObject({ cellCount: 25, exactFiveByFive: true });
      expect(plane.candidateState.observedCoreSafety).toBe('NO_FLUID_NO_GRAVITY_NO_FORBIDDEN_NO_BLOCK_ENTITY');
      expect(plane.accepted).toBe(false);
      expect(plane.requiredFutureLiveGates.length).toBeGreaterThanOrEqual(5);
    }
    const rrSurface = design.candidatePlanes.find((plane: { id: string }) => plane.id === 'RR-PC01-SURFACE-PUBLIC-5X5');
    expect(rrSurface.bounds).toMatchObject({ minX: -155, maxX: -151, minY: 62, maxY: 62, minZ: -392, maxZ: -388 });
    expect(design.selectionContract.exactRRThreeByThreeDeficit.status).toContain('3X3_PAD_CONTAINED_IN_5X5_CANDIDATE');
    expect(design.selectionContract.serviceSeparation.serviceSleeve).toMatchObject({ id: 'RR-SE-1-SERVICE-3X3', status: 'PROTECTED_SERVICE_ONLY' });
    expect(fs.existsSync(path.join(out, 'sys03-cobalt-pc01-5x5-interface-selection-map.svg'))).toBe(true);
  });

  it('fails closed if a different snapshot is substituted for the PC-01-bound immutable post', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sys03-pc01-5x5-stale-'));
    made.push(temp);
    expect(() => execFileSync(process.execPath, [
      'scripts/design_sys03_cobalt_pc01_5x5_interface_selection_01.mjs',
      '--snapshot', 'data/worldsnap-cobalt-rr-post-20260825T061750',
      '--out', path.join(temp, 'selection'),
    ], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' })).toThrow(/not this exact immutable post/);
  });
});
