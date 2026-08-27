import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SNAPSHOT = 'data/worldsnap-mp02-b08-restricted-chamber-dry-receiver-post-20260827T023000Z';
const created: string[] = [];
afterEach(() => created.splice(0).forEach((item) => fs.rmSync(item, { recursive: true, force: true })));

describe('MP02 B08 post-chamber terminus reconciliation', () => {
  it('retires only the stale raw-void prerequisite while preserving exact receiver, return, B03, and B09 interfaces', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mp02-b08-post-chamber-'));
    fs.rmSync(out, { recursive: true, force: true }); created.push(out);
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/design_mp02_b08_post_chamber_terminus_reconciliation_01.mjs', '--snapshot', SNAPSHOT, '--out', out, '--generated-at', '2026-08-28T06:00:00.000Z'], { cwd: ROOT, encoding: 'utf8' }));
    expect(result).toMatchObject({ status: 'SOURCE_BOUND_RESTRICTED_TERMINUS_RECEIVER_RETURN_RECONCILIATION_INPUT_ONLY', mutationAuthority: false, operationsCompiled: 0, protectedClassifiedCells: 19, receiver: { cellCount: 125, fluidCells: 0, blockEntities: 0, movableEntities: 0 } });
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp02-b08-post-chamber-terminus-reconciliation-01.json'), 'utf8'));
    expect(report.staleRawVoidRequirementRetired.currentObservedBand).toMatchObject({ cellCount: 584, sourceAirFloorCells: 571, classifiedProtectedCells: 19 });
    expect(report.staleRawVoidRequirementRetired.currentObservedBand.classifications).toMatchObject({ northFireBoundary: expect.any(Array), shaftIntercept: expect.any(Array), eastB03Isolation: expect.any(Array) });
    expect(report.exactAsBuiltInterfaces.sealedDryReceiver).toMatchObject({ cellCount: 125, fluids: [], blockEntities: [], movableEntities: [] });
    expect(report.exactAsBuiltInterfaces.b03Aperture).toMatchObject({ cellCount: 20, requiredState: 'minecraft:air' });
    expect(report.exactAsBuiltInterfaces.b09IsolationCap).toMatchObject({ cellCount: 12, requiredState: 'minecraft:polished_diorite' });
    expect(report.remainingHardRequirements).toHaveLength(5);
    expect(fs.existsSync(path.join(out, 'mp02-b08-post-chamber-terminus-reconciliation-01.svg'))).toBe(true);
  });
});
