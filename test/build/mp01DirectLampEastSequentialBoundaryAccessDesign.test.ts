import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const DIRECT_LAMP = path.join(ROOT, 'scripts/survey_mp01_direct_lamp_calibration_candidate_01.mjs');
const TOPOLOGY = path.join(ROOT, 'scripts/survey_mp01_direct_lamp_access_return_topology_01.mjs');
const DESIGN = path.join(ROOT, 'scripts/design_mp01_direct_lamp_east_sequential_boundary_access_01.mjs');
const SNAPSHOT = 'data/worldsnap-mp11-bkr-c01-approach-gravity-containment-08-post-20260828T040000Z';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp01-east-boundary-design-'));

afterAll(() => fs.rmSync(directory, { recursive: true, force: true }));

describe('MP01 direct-lamp east sequential restricted-boundary design', () => {
  it('selects only the source-bound two-leaf east boundary and emits no release authority', () => {
    const candidate = path.join(directory, 'candidate.json');
    const topology = path.join(directory, 'topology.json');
    const design = path.join(directory, 'design.json');
    execFileSync(process.execPath, [DIRECT_LAMP,
      '--snapshot', SNAPSHOT, '--out', candidate, '--markdown', path.join(directory, 'candidate.md'), '--map', path.join(directory, 'candidate.svg'),
      '--generated-at', '2026-08-28T04:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    execFileSync(process.execPath, [TOPOLOGY,
      '--snapshot', SNAPSHOT, '--candidate', candidate, '--out', topology, '--markdown', path.join(directory, 'topology.md'), '--map', path.join(directory, 'topology.svg'),
      '--generated-at', '2026-08-28T04:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    execFileSync(process.execPath, [DESIGN,
      '--snapshot', SNAPSHOT, '--candidate', candidate, '--topology', topology, '--out', design, '--markdown', path.join(directory, 'design.md'), '--map', path.join(directory, 'design.svg'),
      '--generated-at', '2026-08-28T04:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const report = JSON.parse(fs.readFileSync(design, 'utf8'));
    expect(report).toMatchObject({
      id: 'MP01-DIRECT-LAMP-EAST-SEQUENTIAL-RESTRICTED-BOUNDARY-DESIGN-01',
      status: 'STATIC_MINIMAL_RESTRICTED_BOUNDARY_DESIGN_AWAITING_GATE_INTERACTION_AND_ROUTE_ACCEPTANCE',
      mutationAuthority: false,
      scope: { target: { cellCount: 4 }, exactInverse: { required: true, operationCellCount: 4 } },
      safetyBoundary: { liveCallsPerformed: false, botMovementPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false },
    });
    expect(report.minimalityProof.northOnly.reachesServiceStudyBoundary).toBe(false);
    expect(report.minimalityProof.westOnly.reachesServiceStudyBoundary).toBe(false);
    expect(report.minimalityProof.eastOnly.reachesServiceStudyBoundary).toBe(false);
    expect(report.minimalityProof.bothEastSequential.reachesServiceStudyBoundary).toBe(true);
    expect(report.restrictedTwoWayTraversalDesign.prohibitedState.bothLeavesOpen).toBe(true);
    expect(report.restrictedTwoWayTraversalDesign.fullOriginOrRecoveryRouteAccepted).toBe(false);
  }, 30_000);
});
