import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const made: string[] = [];
afterEach(() => made.splice(0).forEach((entry) => fs.rmSync(entry, { recursive: true, force: true })));

describe('SYS03 Cobalt disjoint station-pair readiness', () => {
  it('selects the exact Westlight/Ravensreach pair while excluding both R10 hold envelopes', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sys03-cobalt-pair-'));
    made.push(temp);
    const out = path.join(temp, 'readiness');
    const stdout = execFileSync(process.execPath, ['scripts/design_sys03_cobalt_disjoint_station_pair_readiness_01.mjs', '--out', out], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
    const result = JSON.parse(stdout);
    const design = JSON.parse(fs.readFileSync(path.join(out, 'sys03-cobalt-wl-rr-disjoint-station-pair-readiness-01.json'), 'utf8'));
    expect(result).toMatchObject({ status: 'SOURCE_BOUND_CANDIDATE_ONLY__PC01_TO_PC08_UNACCEPTED', candidate: 'Westlight (PR-W02) ↔ Ravensreach (PR-W04)', acceptedGateCount: 0, mutationAuthority: false });
    expect(design.disposition).toMatchObject({ readOnly: true, operationsCompiled: false, releaseAuthorization: false, rconCalled: false, worldMutated: false, passengerServiceCommissioned: false });
    expect(design.disjointHeldScopes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'R10-NORMAL-ALIGNMENT-FLUID-GRAVITY-HOLD', candidateOverlap: false, candidateXSeparation: 75 }),
      expect.objectContaining({ id: 'R10-NORTH-TURN-WATER-BUBBLE-HOLD', candidateOverlap: false, candidateXSeparation: 175 }),
    ]));
    expect(design.currentPhysicalFacts).toMatchObject({ exactPassiveRailCells: 36, exactPassiveRailPostFailures: [], passiveOnly: true });
    expect(design.missingAcceptanceGates).toHaveLength(8);
    expect(design.missingAcceptanceGates.every((gate: { accepted: boolean }) => gate.accepted === false)).toBe(true);
    expect(fs.existsSync(path.join(out, 'sys03-cobalt-wl-rr-disjoint-station-pair-readiness-map.svg'))).toBe(true);
  }, 60000);
});
