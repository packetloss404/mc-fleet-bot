import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/generate_mp03_b07_vertical_acceptance_contract_01.mjs');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp03-b07-vertical-contract-'));

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('MP03 B07 vertical containment, gravity, and egress acceptance contract', () => {
  it('binds the latest complete source facts but grants no mutation authority', () => {
    execFileSync(process.execPath, [SCRIPT, '--out-dir', temporaryDirectory, '--generated-at', '2026-08-26T17:00:00.000Z'], {
      cwd: ROOT,
      stdio: 'pipe',
    });
    const contract = JSON.parse(fs.readFileSync(path.join(temporaryDirectory, 'mp03-b07-vertical-acceptance-contract.json'), 'utf8'));
    expect(contract).toMatchObject({
      id: 'MP03-B07-VERTICAL-CONTAINMENT-GRAVITY-EGRESS-ACCEPTANCE-01',
      status: 'HOLD_TEMPLATE_NOT_ACCEPTED_B07_VERTICAL_CONTAINMENT_GRAVITY_EGRESS',
      mutationAuthority: false,
      source: { immutableCopy: true, requiredMemberCount: 130 },
      observedFacts: {
        lowerLobby: { stationCount: 63, twoBlockClearCount: 34, twoBlockHeadroomFailureCount: 29 },
        retainedFluidBarrier: { cells: { cellCount: 1034 }, sourceTopology: { touchesDiagnosticBoundary: true } },
        gravity: { unsupportedExposureCount: 11, broaderExposure: { cells: { cellCount: 308 } } },
      },
    });
    expect(contract.observedFacts.gravity.centralUnsupportedChain).toHaveLength(4);
    expect(contract.ownershipAndReceiverAcceptance.exactSeams).toHaveLength(6);
    expect(contract.rejectedFragments).toContain('temporary or gravity-only support');
    expect(contract.nonClaims.join('\n')).toMatch(/No owner, receiver, route, egress path/);
    expect(fs.readFileSync(path.join(temporaryDirectory, 'mp03-b07-vertical-acceptance-map.svg'), 'utf8')).toContain('vertical acceptance map');
  }, 60_000);
});
