import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_mp10_rrch_library_perimeter_annex_acceptance_signature_01.mjs');
const CONTRACT_PATH = path.join(ROOT, 'data/world-review/mp10-rrch-library-perimeter-annex-contract-02-mp01-anvil-post-20260826T163300Z/mp10-rrch-library-perimeter-annex-acceptance-contract-02.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp10-library-acceptance-'));
const sha256 = (value: string | Buffer) => crypto.createHash('sha256').update(value).digest('hex');
const hash = (value: string) => sha256(value);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('MP10 library perimeter / annex bilateral acceptance-signature gate', () => {
  it('default-denies a missing protected fixture and accepts only a complete source-bound bilateral design input', () => {
    const contractBytes = fs.readFileSync(CONTRACT_PATH);
    const contract = JSON.parse(contractBytes.toString('utf8'));
    const owners = { library: 'Ravensreach library steward', annexReceiver: 'Perimeter receiver steward', loggia: 'Ravensgate loggia steward' };
    const expectedFixtures = contract.protectedInterior.protectedBlockEntities;
    const inventoryHash = hash(`${expectedFixtures.map((fixture: { id: string; cell: { x: number; y: number; z: number } }) => `${fixture.id}@${fixture.cell.x},${fixture.cell.y},${fixture.cell.z}`).sort().join('\n')}\n`);
    const entries = expectedFixtures.map((fixture: { id: string; cell: { x: number; y: number; z: number } }, index: number) => ({ id: fixture.id, sourceCell: fixture.cell, destinationCell: fixture.cell, disposition: 'RETAIN_IN_PLACE', sourceFixtureStateSha256: hash(`source-${index}`), targetFixtureStateSha256: hash(`target-${index}`), rollbackFixtureStateSha256: hash(`rollback-${index}`) }));
    const signature = {
      schemaVersion: 1,
      id: 'MP10-RRCH-LIBRARY-PERIMETER-ANNEX-ACCEPTANCE-SIGNATURE-01',
      contractIdentitySha256: contract.identitySha256,
      governingContractSha256: sha256(contractBytes),
      source: { snapshot: contract.source.snapshot, captureId: contract.source.captureId, captureManifestSha256: contract.source.captureManifestSha256, libraryRegionSha256: contract.source.libraryRegionSha256 },
      namedOwners: owners,
      design: { targetCoordinateSetSha256: hash('target-cells'), interactionHaloCoordinateSetSha256: hash('halo-cells'), targetCellCount: 99, interactionHaloCellCount: 144, targetSourceStateSetSha256: hash('source-state'), targetStateSetSha256: hash('target-state'), rollbackStateSetSha256: hash('rollback-state'), completeCanonicalBlockStates: true, exactForwardRollbackInverseVerified: true, noUnlistedContainersOrBlockEntities: true, seamInteraction: 'TOUCHES_IF-RRCH-LIBRARY-LOGGIA' },
      fixtureMigration: { sourceFixtureInventorySha256: inventoryHash, fixtureCount: entries.length, completeInventoryListed: true, noFixtureLossOrDuplication: true, exactForwardRollbackInverseVerified: true, targetStateSetSha256: hash('fixture-target'), retainedStateSetSha256: hash('fixture-retained'), rollbackStateSetSha256: hash('fixture-rollback'), entries },
      bilateralLibraryLoggiaInterface: { id: 'IF-RRCH-LIBRARY-LOGGIA', libraryOwner: owners.library, loggiaOwner: owners.loggia, seamCoordinateSetSha256: contract.eastLibraryLoggiaSeam.coordinateSetSha256, seamSourceStateSha256: contract.eastLibraryLoggiaSeam.sourceStateSha256, exactThresholdBehaviorAccepted: true, rollbackOwnershipAccepted: true },
      routeAndReturn: { transitionLandings: [46, 54, 62, 70, 78].map((floorY) => ({ floorY, footingCoordinateSetSha256: hash(`footing-${floorY}`), bodyHeadClearanceStateSha256: hash(`clear-${floorY}`), threeByThreeFootingWithTwoClear: true })), bidirectionalNormalWalkProofSha256: hash('walk'), noJumpBidirectionalVerified: true, libraryReturnAnchor: { label: 'Library entrance return', x: -128, y: 68, z: -424 }, annexReceiverReturnAnchor: { label: 'Annex receiver return', x: -110, y: 68, z: -438 } },
    };
    const write = (name: string, value: unknown) => { const file = path.join(temporaryDirectory, name); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); return file; };
    const rejectedSignature = structuredClone(signature);
    rejectedSignature.fixtureMigration.entries.pop();
    rejectedSignature.fixtureMigration.fixtureCount -= 1;
    const rejectedOut = path.join(temporaryDirectory, 'rejected.json');
    execFileSync(process.execPath, [SCRIPT, '--signature', write('incomplete.json', rejectedSignature), '--out', rejectedOut, '--generated-at', '2026-08-26T20:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const rejected = JSON.parse(fs.readFileSync(rejectedOut, 'utf8'));
    expect(rejected.status).toBe('REJECTED_DESIGN_INPUT_DEFAULT_DENY');
    expect(rejected.rejectionReasons.join('\n')).toMatch(/fixture plan/);
    expect(rejected.safetyBoundary).toMatchObject({ worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 });

    const acceptedOut = path.join(temporaryDirectory, 'accepted.json');
    execFileSync(process.execPath, [SCRIPT, '--signature', write('complete.json', signature), '--out', acceptedOut, '--generated-at', '2026-08-26T20:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const accepted = JSON.parse(fs.readFileSync(acceptedOut, 'utf8'));
    expect(accepted).toMatchObject({ status: 'ACCEPTED_DESIGN_INPUT_NOT_RELEASE_AUTHORITY', mutationAuthority: false });
    expect(accepted.safetyBoundary).toMatchObject({ worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 });
  });
});
