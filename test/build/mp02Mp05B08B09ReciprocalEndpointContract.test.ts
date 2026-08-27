import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const made: string[] = [];
afterEach(() => made.splice(0).forEach((entry) => fs.rmSync(entry, { recursive: true, force: true })));

describe('MP02 / MP05 B08–B09 reciprocal endpoint containment/return contract', () => {
  it('binds the restricted post-state while rejecting the 12-cell B09 strip as a receiver or return', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b08-b09-reciprocal-contract-')); made.push(root);
    const out = path.join(root, 'out');
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/design_mp02_mp05_b08_b09_reciprocal_endpoint_contract_01.mjs', '--out', out], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 }));
    expect(result).toMatchObject({ status: 'SOURCE_BOUND_MINIMAL_RECIPROCAL_CONTRACT_PENDING_FINITE_B09_RECEIVER_AND_RETURN', portalCells: 2, portalHaloFluidCells: 0, operationsCompiled: 0, mutationAuthority: false });
    const record = JSON.parse(fs.readFileSync(path.join(out, 'mp02-mp05-b08-b09-reciprocal-endpoint-contract-01.json'), 'utf8'));
    expect(record.disposition).toMatchObject({ executableBuild: false, mutationAuthority: false, operationsCompiled: 0 });
    expect(record.currentFacts).toMatchObject({ b03Aperture: { cellCount: 20, allAir: true }, b09IsolationCap: { cellCount: 12, allPolishedDiorite: true }, onlyPotentialReciprocalPortal: { cellCount: 2, allPolishedDiorite: true }, dryReceiver: { cellCount: 125, fluidCount: 0 } });
    expect(record.minimumReciprocalContract.b09Receiver.currentResult).toMatch(/ABSENT/);
    expect(record.minimumReciprocalContract.return.publicOrEmergencyCredit).toBe(false);
    const svg = fs.readFileSync(path.join(out, 'mp02-mp05-b08-b09-reciprocal-endpoint-contract-01.svg'), 'utf8');
    expect(svg).toContain('<svg');
    expect(svg).not.toMatch(/(?:NaN|Infinity)/);
  });
});
