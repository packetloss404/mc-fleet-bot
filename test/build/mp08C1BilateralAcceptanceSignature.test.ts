import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_mp08_c1_bilateral_acceptance_signature.mjs');
const CONTRACT_PATH = path.join(ROOT, 'data/world-review/mp08-c1-bilateral-containment-contract-02-mp01-anvil-post-20260826T163300Z/mp08-c1-bilateral-containment-contract-02.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp08-c1-acceptance-'));
const sha256 = (value: string | Buffer) => crypto.createHash('sha256').update(value).digest('hex');

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

const writeSignature = (signature: Record<string, unknown>) => {
  const filename = path.join(temporaryDirectory, 'signature.json');
  fs.writeFileSync(filename, `${JSON.stringify(signature, null, 2)}\n`);
  return filename;
};

describe('MP08 C1 bilateral acceptance-signature compiler', () => {
  it('default-denies placeholders and only accepts every exact bilateral commitment without emitting operations', () => {
    const contractBytes = fs.readFileSync(CONTRACT_PATH);
    const contract = JSON.parse(contractBytes.toString('utf8'));
    const owners = { c1: 'C1 containment owner', cavernA: 'Cavern A owner', cavernB: 'Cavern B owner' };
    const commitment = (role: keyof typeof owners) => ({
      owner: owners[role],
      ownedCoordinateSetSha256: contract.acceptanceTemplate.ownedCoordinateSets[role].coordinateSetSha256,
      sourceEnvelopeStateSha256: contract.source.sourceStateSha256,
      targetStateSetSha256: sha256(`target:${role}`),
      retainedStateSetSha256: sha256(`retained:${role}`),
      rollbackStateSetSha256: sha256(`rollback:${role}`),
      completeCanonicalBlockStates: true,
      exactForwardRollbackInverseVerified: true,
      noContainersOrBlockEntities: true,
      ...(role === 'c1' ? { sealedNoDischargeNoFluidNoOutfall: true } : {}),
    });
    const interfaceEntry = (id: string, role: 'cavernA' | 'cavernB', anchorZ: number) => {
      const exact = contract.interfaces.find((item: { id: string }) => item.id === id).reciprocalCavernOwner;
      return {
        id,
        acceptingOwner: owners[role],
        doorCoordinateSetSha256: exact.doorCells.coordinateSetSha256,
        receiverCoordinateSetSha256: exact.exteriorReceiver.coordinateSetSha256,
        closedManualUnpoweredNoNbtNoActuator: true,
        sealedNoDischargeReceiver: true,
        bidirectionalNormalWalkVerified: true,
        normalWalkProofSha256: sha256(`walk:${role}`),
        outerReturnAnchor: { label: `${role} exact return`, x: 0, y: role === 'cavernA' ? -11 : -9, z: anchorZ },
      };
    };
    const signature = {
      schemaVersion: 1,
      id: 'MP08-C1-BILATERAL-ACCEPTANCE-SIGNATURE-01',
      contractIdentitySha256: contract.identitySha256,
      governingContractSha256: sha256(contractBytes),
      source: {
        snapshot: contract.source.snapshot,
        captureId: contract.source.captureId,
        captureManifestSha256: contract.source.captureManifestSha256,
        sourceStateSha256: contract.source.sourceStateSha256,
        sourceEnvelopeCoordinateSetSha256: contract.source.sourceEnvelope.coordinateSetSha256,
      },
      namedOwners: { ...owners },
      stateCommitments: { c1: commitment('c1'), cavernA: commitment('cavernA'), cavernB: commitment('cavernB') },
      interfaces: [
        interfaceEntry('MP08-C1-CAVERN_A-BILATERAL-INTERFACE-02', 'cavernA', 9),
        interfaceEntry('MP08-C1-CAVERN_B-BILATERAL-INTERFACE-02', 'cavernB', 76),
      ],
    };
    signature.namedOwners.cavernB = 'ASSIGN_CAVERN_B_OWNER';
    const incompletePath = writeSignature(signature);
    const rejectedPath = path.join(temporaryDirectory, 'rejected.json');
    execFileSync(process.execPath, [SCRIPT, '--signature', incompletePath, '--out', rejectedPath, '--generated-at', '2026-08-26T19:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const rejected = JSON.parse(fs.readFileSync(rejectedPath, 'utf8'));
    expect(rejected.status).toBe('REJECTED_DESIGN_INPUT_DEFAULT_DENY');
    expect(rejected.rejectionReasons.join('\n')).toMatch(/owner cavernB is missing or a placeholder/);
    expect(rejected.safetyBoundary.forwardOperationFilesEmitted).toBe(0);

    signature.namedOwners.cavernB = owners.cavernB;
    const completePath = writeSignature(signature);
    const acceptedPath = path.join(temporaryDirectory, 'accepted.json');
    execFileSync(process.execPath, [SCRIPT, '--signature', completePath, '--out', acceptedPath, '--generated-at', '2026-08-26T19:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const accepted = JSON.parse(fs.readFileSync(acceptedPath, 'utf8'));
    expect(accepted).toMatchObject({ status: 'ACCEPTED_DESIGN_INPUT_NOT_RELEASE_AUTHORITY', mutationAuthority: false });
    expect(accepted.safetyBoundary).toMatchObject({ worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 });
  });
});
