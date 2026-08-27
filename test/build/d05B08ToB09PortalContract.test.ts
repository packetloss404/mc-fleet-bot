import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const CONTRACT = path.join(ROOT, 'docs/masterplans/05-combined-zones/IF-D05-B08-TO-B09-PORTAL-CONTRACT-TEMPLATE-01.json');

describe('IF-D05-B08-TO-B09 portal contract template', () => {
  it('is source-bound, default-deny, and requires all bilateral functional obligations', () => {
    const stdout = execFileSync(process.execPath, ['scripts/validate_if_d05_b08_to_b09_portal_contract.mjs'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(JSON.parse(stdout)).toMatchObject({
      status: 'PASS_SOURCE_BOUND_NON_AUTHORIZING_TEMPLATE',
      interfaceId: 'IF-D05-B08-TO-B09-PORTAL',
      mutationAuthority: false,
      portalCellCount: 2,
      capCellCount: 12,
      acceptedIndependentProtectedDischarges: 0,
    });

    const contract = JSON.parse(fs.readFileSync(CONTRACT, 'utf8'));
    expect(contract.currentAnvilPostFacts.onlyMappedDoorAperture).toMatchObject({
      coordinateSetSha256: 'f044e5620427cc219b5f4cc8222733491ebcb114c3ff8e078145446a25a2327b',
      currentStateSetSha256: '1eab25ddac42cd0cc10c3646630960177e5b5e05ec8e4d06fd28e27025f24f11',
    });
    expect(contract.mandatoryAcceptancePayload.r12rMinecartPreservationOrMigration)
      .toMatchObject({ broadCleanupProhibited: true, r12rControlRepurposingProhibited: true });
  });
});
