import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/generate_mp01_access_normal_walk_survey_acceptance_contract_01.mjs');
const SNAPSHOT = 'data/worldsnap-mp01-service-staging-anvil-repair-live-post-20260826T163300Z';
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp01-access-survey-contract-'));

function run(...extra: string[]): void {
  execFileSync(process.execPath, [SCRIPT, '--snapshot', SNAPSHOT, '--out', temporaryDirectory, ...extra], {
    cwd: ROOT,
    stdio: 'pipe',
  });
}

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('MP01 normal-walk survey acceptance contract', () => {
  it('binds the latest complete MP01 post-save but does not invent an access route or movement authority', () => {
    run('--generated-at', '2026-08-26T16:40:00.000Z');
    const contract = JSON.parse(fs.readFileSync(path.join(temporaryDirectory, 'mp01-access-normal-walk-survey-contract-01.json'), 'utf8'));
    expect(contract).toMatchObject({
      id: 'MP01-ACCESS-NORMAL-WALK-SURVEY-CONTRACT-01',
      status: 'STATIC_SOURCE_BOUND_NONAUTHORIZING_ACCESS_SURVEY_CONTRACT',
      mutationAuthority: false,
      source: { requiredMemberCount: 130, immutableCopy: true },
      destination: {
        stagingFeetCells: { cellCount: 3 },
        interactionOnlyControlBoundary: { cellCount: 7 },
        protectedManualBoundary: {
          closedDoorCells: { cellCount: 4 },
          dryVestibuleCells: { cellCount: 6 },
          retainedReservoirWallCells: { cellCount: 96 },
        },
      },
    });
    expect(contract.nonClaims).toContain('No route has been surveyed or accepted.');
    expect(contract.safetyBoundary).toMatchObject({ botMovementPerformed: false, configOrCatalogMutationPerformed: false });
  }, 30_000);

  it('fails closed when an acceptance omits owners, anchors, and exact route evidence', () => {
    const contract = JSON.parse(fs.readFileSync(path.join(temporaryDirectory, 'mp01-access-normal-walk-survey-contract-01.json'), 'utf8'));
    const invalidPath = path.join(temporaryDirectory, 'invalid-acceptance.json');
    fs.writeFileSync(invalidPath, `${JSON.stringify({
      schemaVersion: 1,
      id: 'MP01-ACCESS-NORMAL-WALK-SURVEY-ACCEPTANCE-01',
      contractIdentitySha256: contract.identitySha256,
      source: {
        snapshot: contract.source.snapshot,
        captureManifestSha256: contract.source.captureManifestSha256,
        destinationProtectedEnvelopeStateSha256: contract.source.destinationProtectedEnvelope.stateSha256,
        sourceFiles: contract.source.sourceFiles,
      },
      owners: [],
      anchors: {},
      routes: { outbound: [], return: [] },
    }, null, 2)}\n`);
    run('--validate-acceptance', invalidPath, '--generated-at', '2026-08-26T16:40:00.000Z');
    const result = JSON.parse(fs.readFileSync(path.join(temporaryDirectory, 'acceptance-validation.json'), 'utf8'));
    expect(result.status).toBe('REJECTED_INCOMPLETE_OR_DRIFTED_NORMAL_WALK_SURVEY_ACCEPTANCE');
    expect(result.mutationAuthority).toBe(false);
    expect(result.errors.join('\n')).toMatch(/three named owner roles are required/);
    expect(result.errors.join('\n')).toMatch(/outbound must contain at least two stations/);
  }, 30_000);
});
