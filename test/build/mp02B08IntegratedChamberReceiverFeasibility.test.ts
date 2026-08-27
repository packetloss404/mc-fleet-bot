import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SNAPSHOT = 'data/worldsnap-mp02-b08-surface-recovery-landing-post-20260827T005500Z';
const SURVEY = 'data/world-review/mp02-b08-successor-integrated-audit-20260827T012500Z/successor-survey/mp02-b08-current-successor-survey.json';
const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true })));

describe('MP02 B08 integrated chamber / dry receiver feasibility', () => {
  it('bounds a substantive chamber, dry receiver, two source-reachable return witnesses, and B03/B09 preservation without emitting operations', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mp02-b08-chamber-receiver-'));
    fs.rmSync(out, { recursive: true, force: true });
    temporary.push(out);
    const stdout = execFileSync(process.execPath, [
      'scripts/design_mp02_b08_integrated_chamber_receiver_01.mjs',
      '--snapshot', SNAPSHOT,
      '--survey', SURVEY,
      '--out', out,
      '--generated-at', '2026-08-27T01:40:00.000Z',
    ], { cwd: ROOT, encoding: 'utf8' });
    expect(JSON.parse(stdout)).toMatchObject({
      mutationAuthority: false,
      operationsCompiled: 0,
      chamberEnvelopeCells: 880,
      receiverContainmentCells: 125,
      currentHazards: 0,
      b03ApertureCells: 20,
      b09CapCells: 12,
      b09GuidewayCells: 19,
      returnWitnesses: [
        { id: 'north-return-to-accepted-handoff', passed: true },
        { id: 'shaft-return-to-guarded-surface-landing', passed: true },
      ],
    });
    const design = JSON.parse(fs.readFileSync(path.join(out, 'mp02-b08-integrated-chamber-receiver-feasibility-01.json'), 'utf8'));
    expect(design.status).toBe('FINITE_DESIGN_CANDIDATE__NO_OPERATION_UNTIL_ALL_ACCEPTANCE_INPUTS_ARE_BOUND');
    expect(design.operationCounts).toEqual({ forward: 0, rollback: 0 });
    expect(design.firstPackageEligibility).toBe(false);
    expect(design.dryDrainageReceiver).toMatchObject({
      designRule: expect.stringContaining('zero-discharge'),
      overflow: { bounded: true },
      outfall: { passiveFluidPathExists: false, bounded: true },
    });
    expect(design.returns.nonCommonFailureProof).toMatchObject({ passedForSourceTopology: true, acceptedForRelease: false, externalLegIntersection: [] });
    expect(design.preservation).toMatchObject({
      b03Aperture: { cellCount: 20, requiredState: 'minecraft:air' },
      b09IsolationCap: { cellCount: 12, requiredState: 'minecraft:polished_diorite' },
      b09ProtectedGuidewayAndControls: { cellCount: 19 },
    });
    expect(fs.existsSync(path.join(out, 'mp02-b08-integrated-chamber-receiver-feasibility-01.svg'))).toBe(true);
  });
});
