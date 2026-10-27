import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_mp05_b07_integrated_acceptance_signature.mjs');
const CONTRACT_PATH = path.join(ROOT, 'data/world-review/mp03-b07-vertical-acceptance-contract-01-sys03-post-20260826T153100Z/mp03-b07-vertical-acceptance-contract.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-signature-'));
const hash = (value: string | Buffer) => crypto.createHash('sha256').update(value).digest('hex');

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

const writeManifest = (name: string, content: Record<string, unknown>) => {
  const filename = path.join(temporaryDirectory, name);
  const bytes = `${JSON.stringify(content, null, 2)}\n`;
  fs.writeFileSync(filename, bytes);
  return { path: filename, sha256: hash(bytes) };
};

describe('MP05 B07 integrated acceptance signature compiler', () => {
  it('accepts only a complete source-bound design input and never emits an operation', () => {
    const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
    const sourceCaptureManifestSha256 = contract.source.captureManifestSha256;
    const common = {
      contractIdentitySha256: contract.contractIdentitySha256,
      sourceCaptureManifestSha256,
      cellSetSha256: 'a'.repeat(64),
      canonicalStateCount: 8134,
      completeCanonicalBlockStates: true,
      exactInverseVerified: true,
      integratedDomains: ['FLUID_CONTAINMENT', 'GRAVITY_PERMANENT_SUPPORT', 'R09J_CAP', 'R07J_CAP', 'LOWER_RECEIVER', 'EXTERIOR_RECEIVER', 'NORMAL_WALK_EGRESS'],
    };
    const forward = writeManifest('forward.json', { ...common, role: 'FORWARD' });
    const rollback = writeManifest('rollback.json', { ...common, role: 'ROLLBACK' });
    const egress = writeManifest('egress.json', { ...common, role: 'NORMAL_WALK_EGRESS', normalWalkVerified: true, independentEgressVerified: true });
    const signature = {
      schemaVersion: 1,
      id: 'MP05-B07-INTEGRATED-ACCEPTANCE-SIGNATURE-01',
      contractIdentitySha256: contract.contractIdentitySha256,
      source: {
        captureManifestSha256: sourceCaptureManifestSha256,
        authorityTemplateSha256: contract.source.authorityTemplate.sha256,
        containmentSurveySha256: contract.source.containmentSurvey.sha256,
      },
      namedOwners: {
        b07PrimaryConstructionOwner: 'B07 construction team', hydrologyContainmentOwner: 'Hydrology team', r09jProtectedCapOwner: 'R09J custodian',
        r07jSurfaceReceiverOwner: 'Surface receiver team', lowerLobbyReceiverOwner: 'Lower lobby team', mp03ProgrammeOwner: 'MP03 programme team',
      },
      acceptedSeams: contract.ownershipAndReceiverAcceptance.exactSeams.map((seam: Record<string, unknown>) => ({ ...seam, acceptingCounterpartOwner: 'Counterpart owner' })),
      forwardManifest: forward,
      rollbackManifest: rollback,
      normalWalkAndIndependentEgressManifest: egress,
      fluidContainment: { sourceFutureStateSetSha256: 'b'.repeat(64), componentOwner: 'Hydrology team', receiverOwner: 'Receiver team', componentReferenceSha256: 'c'.repeat(64), freeboardCapacityReferenceSha256: 'd'.repeat(64), overflowFailureTerminalSha256: 'e'.repeat(64) },
      gravity: { exposureCellSetSha256: contract.observedFacts.gravity.broaderExposure.cells.coordinateSetSha256, permanentPostStateReferenceSha256: 'f'.repeat(64), orderedRollbackReferenceSha256: '1'.repeat(64), fallChainReferenceSha256: '2'.repeat(64), noTemporarySupport: true, noFallingRollback: true },
      protectedCaps: { r09j: { cellCount: 2, requiredSourceState: 'minecraft:polished_diorite', reciprocalReplacementAndInverseSha256: '3'.repeat(64) }, r07j: { cellCount: 49, remainSolidUntilExteriorAcceptance: true, headhouseDoorlessUntilExteriorAcceptance: true, surfaceReceiverFaceLandingReturnFailureSha256: '4'.repeat(64) } },
      directedReceivers: { lowerLobbyReceiverApertureReturnSha256: '5'.repeat(64), exteriorReceiverFaceLandingReturnFailureSha256: '6'.repeat(64), lowerLobbyReceiverOwner: 'Lower lobby team', exteriorReceiverOwner: 'Surface receiver team' },
    };
    const signaturePath = path.join(temporaryDirectory, 'signature.json');
    fs.writeFileSync(signaturePath, `${JSON.stringify(signature, null, 2)}\n`);
    const decisionPath = path.join(temporaryDirectory, 'accepted.json');
    execFileSync(process.execPath, [SCRIPT, '--signature', signaturePath, '--out', decisionPath, '--generated-at', '2026-08-26T18:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const decision = JSON.parse(fs.readFileSync(decisionPath, 'utf8'));
    expect(decision).toMatchObject({ status: 'ACCEPTED_DESIGN_INPUT_NOT_RELEASE_AUTHORITY', mutationAuthority: false, safetyBoundary: { forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 } });

    signature.acceptedSeams[0].pairSha256 = '0'.repeat(64);
    fs.writeFileSync(signaturePath, `${JSON.stringify(signature, null, 2)}\n`);
    const rejectedPath = path.join(temporaryDirectory, 'rejected.json');
    execFileSync(process.execPath, [SCRIPT, '--signature', signaturePath, '--out', rejectedPath, '--generated-at', '2026-08-26T18:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const rejected = JSON.parse(fs.readFileSync(rejectedPath, 'utf8'));
    expect(rejected.status).toBe('REJECTED_DESIGN_INPUT_DEFAULT_DENY');
    expect(rejected.rejectionReasons.join('\n')).toMatch(/NEGATIVE_X/);
    expect(rejected.safetyBoundary.forwardOperationFilesEmitted).toBe(0);
  });
});
