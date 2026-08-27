import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const GENERATOR = path.join(ROOT, 'scripts/generate_mp13_access_egress_acceptance_contract_01.mjs');
const LEDGER = 'data/world-review/mp13-access-class-cell-ledger-01-sys03-post-20260826T153100Z/mp13-access-class-cell-ledger-01.json';
const UPSTREAM = 'data/world-review/mp13-egress-access-contract-03-sys03-post-20260826T153100Z/mp13-egress-access-contract-03.json';
const OUTPUT = fs.mkdtempSync(path.join(os.tmpdir(), 'mp13-access-egress-acceptance-'));

function output(name: string): string {
  return path.join(OUTPUT, name);
}

function generate(destination: string, ledger = LEDGER): void {
  execFileSync(process.execPath, [
    GENERATOR,
    '--ledger', ledger,
    '--upstream-contract', UPSTREAM,
    '--out', destination,
    '--generated-at', '2026-08-26T17:50:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
}

afterAll(() => fs.rmSync(OUTPUT, { recursive: true, force: true }));

describe('MP13 access / egress acceptance contract', () => {
  it('is deterministic and leaves every ownership/access/egress gate default-deny', () => {
    generate(output('first'));
    generate(output('second'));
    const first = fs.readFileSync(path.join(output('first'), 'mp13-access-egress-acceptance-contract-01.json'));
    expect(first).toEqual(fs.readFileSync(path.join(output('second'), 'mp13-access-egress-acceptance-contract-01.json')));
    const contract = JSON.parse(first.toString()) as Record<string, any>;
    expect(contract).toMatchObject({
      id: 'MP13-ACCESS-EGRESS-ACCEPTANCE-CONTRACT-01',
      status: 'SOURCE_BOUND_DEFAULT_DENY_UNACCEPTED_OWNERSHIP_ACCESS_EGRESS_CONTRACT',
      worldMutationPerformed: false,
      rconCalled: false,
      databaseMutated: false,
      operationFiles: [],
      mutationAuthorityGranted: false,
      exactReviewSurface: {
        ledgerCellCount: 3702,
        sourceTransitions: 278,
        directionalFaceReviewsRequired: 556,
        unreviewedCellCount: 3702,
        unreviewedDirectionalFaceCount: 556,
        currentClasses: { U0: 3702 },
      },
      acceptanceGates: {
        allRequiredGatesClosed: true,
        i05PublicStaffSeparation: { accepted: false },
        i06StaffOnlyChangeover: { accepted: false },
        publicEgressProgram: { accepted: false },
      },
    });
    expect(contract.exactSourceRoutes.map((route: Record<string, any>) => route.stations)).toEqual([79, 134, 68]);
    expect(contract.prohibitedInferences.join('\n')).toMatch(/cannot count as public egress/);
    expect(fs.readFileSync(path.join(output('first'), 'mp13-access-egress-acceptance-coordinate-map.svg'), 'utf8')).toMatch(/I06 staff-only/);
  });

  it('refuses a ledger whose source binding no longer matches the upstream contract', () => {
    const changed = path.join(OUTPUT, 'changed-ledger.json');
    const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, LEDGER), 'utf8')) as Record<string, any>;
    ledger.sourceSnapshot.sha256 = '0'.repeat(64);
    fs.writeFileSync(changed, `${JSON.stringify(ledger)}\n`);
    expect(() => generate(output('wrong-source'), changed)).toThrow(/source snapshot hash differs/);
    expect(fs.existsSync(output('wrong-source'))).toBe(false);
  });
});
