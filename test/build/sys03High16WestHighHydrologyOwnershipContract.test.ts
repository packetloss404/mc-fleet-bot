import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sys03-high16-west-high-hydrology-'));
const OUT = path.join(DIR, 'contract.json');
const GENERATOR = 'scripts/generate_sys03_high16_west_high_hydrology_ownership_contract.mjs';
const SNAPSHOT = 'data/worldsnap-sys03-high16-descending-post-20260826T153100Z';

afterAll(() => fs.rmSync(DIR, { recursive: true, force: true }));

describe('SYS03 High-16 / West High hydrology ownership contract', () => {
  it('binds exact held water, gravity, existing-scope overlaps, and a default-deny release gate', () => {
    execFileSync(process.execPath, [GENERATOR,
      '--snapshot', SNAPSHOT,
      '--high16-manifest', 'data/buildops/sys03-high16-descending-live-20260826T153100Z.manifest.json',
      '--west-high-manifest', 'data/buildops/rail-s3-r10-west-high-successor-11-live-20260826T082111Z.manifest.json',
      '--cobalt-manifest', 'data/buildops/cobalt-wl-headhouse-01.release-manifest.json',
      '--out', OUT,
    ], { cwd: ROOT, stdio: 'pipe' });
    const contract = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    expect(contract).toMatchObject({
      status: 'SOURCE_BOUND_DEFAULT_DENY_HYDROLOGY_AND_OWNERSHIP_HOLD',
      readOnly: true,
      mutationAuthority: false,
      civilOnly: true,
      railCommissioned: false,
      passengerServiceCommissioned: false,
      sourceBinding: { immutableCopy: true, verifiedRequiredMemberCount: 130 },
      exactHydrology: {
        sourceSeedWater: { count: 16, coordinateSetSha256: '3fbc40be71920ca7f221b1e3bf5ee8b1c952675419b8572d9cb5ddee7c5b1f41' },
        connectedComponent: { count: 2525, coordinateSetSha256: '220cf041351f18cd75e8acfa587a2b29f3eaf29fb821e355d910ee93be31271e' },
        componentTraversalComplete: true,
      },
      exactGravity: { totalTargetCount: 92, unsupportedTargetCount: 0 },
      permittedDefaultState: { disposition: 'RETAIN_EXACT_SOURCE_STATE_ONLY', permittedOperations: [] },
    });
    expect(contract.exactExistingOverlaps.sys03High16ExecutedCivilTargets.count).toBe(0);
    expect(contract.exactExistingOverlaps.westHighPredecessorTargets).toMatchObject({
      count: 156,
      coordinateSetSha256: 'f3370eb608a15ce7687a5dc2f204f437b70e329edda066dad9b39ff64c5bc28e',
    });
    expect(contract.exactExistingOverlaps.cobaltWestlightProtectedTargets.count).toBe(0);
    expect(contract.authorityCounterparts.receiverAndOverflowOwner.status).toBe('UNASSIGNED_DEFAULT_DENY');
    expect(contract.requiredFutureAcceptanceTests.map(({ id }: { id: string }) => id)).toEqual([
      'SOURCE_REBIND_AND_EXACT_CENSUS',
      'BILATERAL_OWNER_COUNTERPARTS',
      'EXACT_RECEIVER_AND_NO_UNINTENDED_DISCHARGE',
      'GRAVITY_AND_SUPPORT_FORWARD_ROLLBACK',
      'EXACT_INVERSE_AND_POSTSTATE_HYDROLOGY',
      'LIVE_ENTITY_AND_BLOCK_ENTITY_CLEARANCE',
    ]);
  }, 30_000);
});
