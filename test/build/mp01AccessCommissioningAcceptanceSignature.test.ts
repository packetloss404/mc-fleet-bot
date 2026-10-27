import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_mp01_access_commissioning_acceptance_signature_01.mjs');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp01-access-commissioning-signature-'));

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('MP01 access commissioning acceptance signature', () => {
  it('default-denies a template or incomplete route signature before any survey validation or world action', () => {
    const signature = path.join(ROOT, 'docs/masterplans/01-cheyenne-mountain-complex/MP01-ACCESS-COMMISSIONING-ACCEPTANCE-SIGNATURE-01.template.json');
    const output = path.join(temporaryDirectory, 'decision.json');
    execFileSync(process.execPath, [SCRIPT, '--signature', signature, '--out', output, '--generated-at', '2026-08-26T20:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const decision = JSON.parse(fs.readFileSync(output, 'utf8'));
    expect(decision).toMatchObject({
      id: 'MP01-ACCESS-COMMISSIONING-ACCEPTANCE-DECISION-01',
      status: 'REJECTED_COMMISSIONING_READINESS_DEFAULT_DENY',
      mutationAuthority: false,
      safetyBoundary: { botMovementPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 },
    });
    expect(decision.rejectionReasons.join('\n')).toMatch(/origin.*placeholder/i);
    expect(decision.rejectionReasons.join('\n')).toMatch(/exact normal-walk survey-acceptance path and hash/i);
    expect(decision.rejectionReasons.join('\n')).toMatch(/OFF\/no-actuation/i);
    expect(decision.rejectionReasons.join('\n')).toMatch(/reservoir-wall/i);
  });
});
