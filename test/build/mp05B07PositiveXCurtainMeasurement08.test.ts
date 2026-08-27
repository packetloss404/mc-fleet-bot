import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-curtain-measurement-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP05 B07 positive-X curtain / overflow measurement 08', () => {
  it('proves the bilateral two-face pair is not the complete five-face wet curtain and emits only the irreducible measurement contract', () => {
    const out = path.join(temp, 'out');
    execFileSync(process.execPath, ['scripts/design_mp05_b07_positive_x_curtain_measurement_08.mjs', '--out-dir', out, '--markdown-out', path.join(out, 'report.md'), '--generated-at', '2026-08-28T06:15:00.000Z'], { cwd: ROOT, stdio: 'pipe', maxBuffer: 8 * 1024 * 1024 });
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp05-b07-positive-x-curtain-measurement-08.json'), 'utf8'));
    expect(report).toMatchObject({
      status: 'SOURCE_BOUND_POSITIVE_X_CURTAIN_NOT_DESIGNABLE_UNTIL_WET_TARGET_COMPONENT_CLOSURE', mutationAuthority: false,
      completeCurrentCrossingCurtain: { faceCount: 5, exteriorAirPair: { faceCount: 2 }, exteriorFluidSubset: { faceCount: 3 } },
      result: { finiteContainmentSystemDesignable: false, overflowSystemDesignable: false },
      narrowestMissingMeasurementContract: { exactWetTargetSubset: { cellCount: 3 }, exactCurtainTargets: { cellCount: 5 }, mutationAuthority: false },
      safetyBoundary: { readOnly: true, liveCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 },
    });
    expect(report.narrowestMissingMeasurementContract.requiredOutputs.join('\n')).toMatch(/complete component cell set/);
    expect(fs.existsSync(path.join(out, 'mp05-b07-positive-x-curtain-measurement-08.svg'))).toBe(true);
  });
});
