import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const DESIGN = path.join(ROOT, 'scripts/design_mp01_direct_lamp_east_sequential_boundary_access_01.mjs');
const TRACE = path.join(ROOT, 'scripts/survey_mp01_direct_lamp_route_anchor_trace_02.mjs');
const SNAPSHOT = 'data/worldsnap-mp11-c01-arrival-gravity-support-post-20260827T043000Z';
const CANDIDATE = 'data/world-review/mp01-cheyenne-functional-frontier-02-mp11-c01-support-post-20260827T043000Z/direct-lamp-candidate.json';
const TOPOLOGY = 'data/world-review/mp01-cheyenne-functional-frontier-02-mp11-c01-support-post-20260827T043000Z/direct-lamp-access-topology.json';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp01-route-anchor-trace-'));
afterAll(() => fs.rmSync(directory, { recursive: true, force: true }));

describe('MP01 direct-lamp route/anchor trace', () => {
  it('proves the counterfactual component closes yet cannot invent an origin or recovery anchor', () => {
    const boundary = path.join(directory, 'boundary.json'); const report = path.join(directory, 'trace.json');
    execFileSync(process.execPath, [DESIGN, '--snapshot', SNAPSHOT, '--candidate', CANDIDATE, '--topology', TOPOLOGY, '--out', boundary, '--markdown', path.join(directory, 'boundary.md'), '--map', path.join(directory, 'boundary.svg'), '--generated-at', '2026-08-27T05:30:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    execFileSync(process.execPath, [TRACE, '--snapshot', SNAPSHOT, '--candidate', CANDIDATE, '--boundary', boundary, '--markers', 'data/markers.json', '--routes', 'data/routes.json', '--out', report, '--markdown', path.join(directory, 'trace.md'), '--map', path.join(directory, 'trace.svg'), '--generated-at', '2026-08-27T05:35:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const trace = JSON.parse(fs.readFileSync(report, 'utf8'));
    expect(trace).toMatchObject({ id: 'MP01-DIRECT-LAMP-ROUTE-ANCHOR-TRACE-02', status: 'NO_ROUTE_ANCHOR_IN_FINITE_COUNTERFACTUAL_COMPONENT', mutationAuthority: false, anchorCensus: { stagingMarkerCount: 0, componentMarkerCount: 0, componentRouteCount: 0, acceptedOutboundRouteStations: 0, acceptedRecoveryRouteStations: 0 }, safetyBoundary: { readOnly: true, botMovementPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false } });
    expect(trace.trace.serviceAnchorReachableInCounterfactual).toBe(true);
    expect(Object.keys(trace.trace.observedEscapeFaces)).toHaveLength(0);
  }, 120_000);
});
