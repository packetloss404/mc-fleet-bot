import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SNAPSHOT = 'data/worldsnap-mp02-b08-restricted-chamber-dry-receiver-post-20260827T023000Z';
const RECONCILIATION = 'data/world-review/mp02-b08-post-chamber-terminus-reconciliation-20260828T060000Z/mp02-b08-post-chamber-terminus-reconciliation-01.json';
const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach((item) => fs.rmSync(item, { recursive: true, force: true })));

describe('MP02 B08 restricted terminus ownership / return interface design', () => {
  it('binds the restricted-only purpose and all cold B03/B09 / receiver interfaces without claiming public egress', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mp02-b08-restricted-terminus-')); fs.rmSync(out, { recursive: true, force: true }); temporary.push(out);
    const summary = JSON.parse(execFileSync(process.execPath, ['scripts/design_mp02_b08_restricted_terminus_ownership_return_interface_01.mjs', '--snapshot', SNAPSHOT, '--reconciliation', RECONCILIATION, '--out', out, '--generated-at', '2026-08-28T06:15:00.000Z'], { cwd: ROOT, encoding: 'utf8' }));
    expect(summary).toMatchObject({ status: 'SOURCE_BOUND_RESTRICTED_TERMINUS_PURPOSE_OWNERSHIP_RETURN_INTERFACE_INPUT_ONLY', mutationAuthority: false, operationsCompiled: 0, restrictedPurpose: 'MP02-B08-RESTRICTED-SERVICE-STAGING-AND-CONTINGENCY-NODE' });
    expect(summary.interfaces).toEqual(expect.arrayContaining([{ id: 'MP02-B03-COLD-AIR-APERTURE', cellCount: 20, access: 'COLD_SEALED_VISUAL_AIR_BOUNDARY__NO_CROSSING' }, { id: 'MP02-B09-PROTECTED-ISOLATION-CAP', cellCount: 12, access: 'COLD_SEALED_PROTECTED_CORE_BOUNDARY__NO_PORTAL' }]));
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp02-b08-restricted-terminus-purpose-ownership-return-interface-01.json'), 'utf8'));
    expect(report.restrictedTerminusPurpose.prohibitedUse).toEqual(expect.arrayContaining(['public platform', 'public/emergency egress commissioning']));
    expect(report.internalAccountableOwnership.roles).toHaveLength(6);
    expect(report.receiverBoundary).toMatchObject({ cellCount: 125, owner: 'MP02_DRY_RECEIVER_CUSTODIAN' });
    expect(report.restrictedReturnContract).toMatchObject({ noPublicEgressClaim: true, noIndependentPublicEgressClaim: true });
    expect(report.nonClaims.join(' ')).toContain('No public terminus');
  });
});
