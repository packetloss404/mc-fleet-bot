import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/resolve_mp01_outer_portal_vertical_contract_02.mjs');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp01-portal-vertical-resolution-'));

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('MP01 outer portal vertical contract resolution', () => {
  it('binds the fresh source and exact rational anchor probe while denying all physical geometry', () => {
    const output = path.join(temporaryDirectory, 'decision');
    execFileSync(process.execPath, [SCRIPT, '--out-dir', output, '--generated-at', '2026-08-27T05:35:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const decision = JSON.parse(fs.readFileSync(path.join(output, 'mp01-outer-portal-vertical-contract-resolution-02.json'), 'utf8'));
    expect(decision).toMatchObject({
      id: 'MP01-OUTER-PORTAL-VERTICAL-CONTRACT-RESOLUTION-02',
      status: 'COORDINATION_ANCHOR_RATIONAL_RESOLVED__BUILD_ACTIVATION_AND_INTERFACE_CELLS_STILL_DENIED',
      disposition: { readOnly: true, mutationAuthority: false, operationsCompiled: false, worldMutated: false },
      source: { verifiedRequiredMemberCount: 130 },
      resolvedCoordinatePolicy: { verticalAnchorOnly: { exactRational: { exact: 130 }, coordinationProbe: { x: 2048, y: 130, z: -748 }, classification: 'EXACT_SOURCE_PROBE_ONLY__NOT_A_BUILD_TARGET' }, activation: { activeForBuild: false } },
      compilerGate: { eligibleNow: false },
      safetyBoundary: { forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 },
    });
    expect(decision.interfaceResolution.retainedConflict).toHaveLength(3);
    expect(decision.nonClaims.join('\n')).toMatch(/No physical target/i);
    expect(fs.readFileSync(path.join(output, 'mp01-outer-portal-vertical-contract-resolution-map.svg'), 'utf8')).toContain('Build cells');
  }, 60_000);
});
