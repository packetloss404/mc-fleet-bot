import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SNAPSHOT = 'data/worldsnap-mp05-r05-west-toe-lava-plug-post-20260826T223500Z';
const SURVEY = 'data/world-review/mp02-b08-terminus-current-source-20260826T223500Z/successor-survey/mp02-b08-current-successor-survey.json';
const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true })));

describe('MP02 B08 terminus control and egress whole-scope design', () => {
  it('binds the fresh source, retains the egress intercept, and default-denies physical work', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mp02-b08-terminus-design-'));
    fs.rmSync(out, { recursive: true, force: true }); temporary.push(out);
    const stdout = execFileSync(process.execPath, ['scripts/compile_mp02_b08_terminus_control_egress_design_01.mjs', '--snapshot', SNAPSHOT, '--survey', SURVEY, '--out', out, '--generated-at', '2026-08-26T23:00:00.000Z'], { cwd: ROOT, encoding: 'utf8' });
    expect(JSON.parse(stdout)).toMatchObject({ mutationAuthority: false, operationsCompiled: false, rawContinuationCells: 584, rawContinuationClearCells: 582, egressInterceptCells: 2, b03ApertureCells: 20, b09CapCells: 12, independentReturnEgress: { required: 2, accepted: 0 } });
    const design = JSON.parse(fs.readFileSync(path.join(out, 'mp02-b08-terminus-control-egress-design-01.json'), 'utf8'));
    expect(design.disposition).toMatchObject({ defaultDeny: true, forwardOperationCount: 0, rollbackOperationCount: 0 });
    expect(design.ownershipAndInterfaces.accountableRoles).toMatchObject({ terminusScopeOwner: 'MP02_B08_TERMINUS_SCOPE_OWNER', b03Counterpart: 'B03_ACCESS_CONTROL_COUNTERPART', b09Counterpart: 'B09_RECEIVER_PROTECTED_CORE_COUNTERPART' });
    expect(design.currentInterfaceFacts.egressShaftIntercept.currentStates.map((entry: { state: string }) => entry.state)).toEqual(['minecraft:polished_diorite', 'minecraft:ladder[facing=west,waterlogged=false]']);
    expect(design.mandatoryFunctionalAcceptance.independentReturnAndEgress).toMatchObject({ requiredCount: 2, acceptedCount: 0, existingEgressFixtureIsNotWholeScopeAcceptance: true });
    expect(design.mandatoryFunctionalAcceptance.drainageAndReceiver).toMatchObject({ accepted: false, receiverId: null, drainageOutfall: null });
    expect(design.firstPhysicalPackageCondition.permittedPhysicalPackage).toBeNull();
    expect(fs.existsSync(path.join(out, 'mp02-b08-terminus-control-egress-design-01.svg'))).toBe(true);
  });
});
