import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/design_mp01_outer_portal_placement_interface_01.mjs');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp01-outer-portal-placement-'));

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('MP01 outer portal placement/interface decision', () => {
  it('binds only the normalized anchor and denies vertical rounding, cells, operations, and authority', () => {
    const output = path.join(temporaryDirectory, 'decision');
    execFileSync(process.execPath, [SCRIPT, '--out-dir', output, '--generated-at', '2026-08-27T06:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const decision = JSON.parse(fs.readFileSync(path.join(output, 'mp01-outer-portal-placement-interface-decision-01.json'), 'utf8'));
    expect(decision).toMatchObject({
      id: 'MP01-OUTER-PORTAL-PLACEMENT-INTERFACE-DECISION-01',
      status: 'HOLD_NORMALIZED_ANCHOR_BOUND__VERTICAL_AND_INTERFACE_GEOMETRY_UNACCEPTED',
      mutationAuthority: false,
      authoritativeAnchorPolicy: { normalizedAnchor: { x: 0, y: 200, z: -420 }, exactCurrentWorldHorizontalMapping: { x: 2048, z: -748 }, verticalStudy: { mathematicalResult: 130, status: 'INACTIVE_FOR_CONSTRUCTION__NO_APPROVED_BLOCK_ROUNDING_POLICY' } },
      nonAnchorGeometryPolicy: { physicalTargetCells: null, physicalInverseCells: null },
      safetyBoundary: { worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 },
    });
    expect(decision.authoritativeAnchorPolicy.prohibitedUse.join('\n')).toMatch(/round.*vertical/i);
    expect(decision.portalAirlockConflict.unresolved.join('\n')).toMatch(/six-wide × twelve-tall/i);
    expect(decision.accessAndOwnershipGates.requiredInputs).toHaveLength(6);
    expect(fs.readFileSync(path.join(output, 'mp01-outer-portal-placement-interface-map.svg'), 'utf8')).toContain('all physical geometry remains default-deny');
  });
});
