import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_mp09_long_water_acceptance_signature_01.mjs');
const CONTRACT_PATH = path.join(ROOT, 'data/world-review/mp09-long-water-hydrology-ownership-grade-acceptance-contract-01-mp06-post-20260826T143902Z/mp09-long-water-hydrology-ownership-grade-acceptance-contract.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp09-long-water-'));
const sha256 = (value: string | Buffer) => crypto.createHash('sha256').update(value).digest('hex');
const hash = (value: string) => sha256(value);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('MP09 Long Water acceptance-signature validator', () => {
  it('default-denies an open containment signature and accepts only the complete source-bound design input', () => {
    const contractBytes = fs.readFileSync(CONTRACT_PATH);
    const contract = JSON.parse(contractBytes.toString('utf8'));
    const captureManifestSha256 = contract.source.inputSha256[`${contract.source.snapshot}/combined-zones-complete-save-capture.json`];
    const owners = { containment: 'Long Water containment steward', waterDisplacement: 'Long Water water steward', receiverOverflow: 'Long Water receiver steward', northGrade: 'Long Water north grade steward', tempiettoLanding: 'Long Water Tempietto landing steward' };
    const manifest = (role: 'FORWARD' | 'ROLLBACK') => ({ role, contractSha256: sha256(contractBytes), captureManifestSha256, coordinateSetSha256: hash('all-long-water-cells'), cellCount: 777, sourceStateSetSha256: hash('source'), targetStateSetSha256: hash('target'), rollbackStateSetSha256: hash('rollback'), completeCanonicalBlockStates: true, exactForwardRollbackInverseVerified: true, inverseProofSha256: hash('inverse'), ...(role === 'FORWARD' ? { orderedDomains: ['CONTAINMENT_RECEIVER_OVERFLOW', 'WATER_DISPLACEMENT', 'NORTH_GRADE_DECK_TEMPIETTO_LANDING'] } : { reverseOrderedDomains: ['NORTH_GRADE_DECK_TEMPIETTO_LANDING', 'WATER_DISPLACEMENT', 'CONTAINMENT_RECEIVER_OVERFLOW'] }) });
    const write = (name: string, value: unknown) => { const file = path.join(temporaryDirectory, name); const bytes = `${JSON.stringify(value, null, 2)}\n`; fs.writeFileSync(file, bytes); return { path: file, sha256: sha256(bytes) }; };
    const forwardManifest = write('forward.json', manifest('FORWARD'));
    const rollbackManifest = write('rollback.json', manifest('ROLLBACK'));
    const interfaceOwnership = contract.unassignedAcceptanceInterfaces.map((item: { id: string }, index: number) => ({ id: item.id, ownerRole: ['containment', 'waterDisplacement', 'receiverOverflow', 'northGrade', 'tempiettoLanding'][index], owner: Object.values(owners)[index], coordinateSetSha256: hash(`cells-${item.id}`), cellCount: index === 4 ? 6 : index + 100, sourceStateSetSha256: hash(`source-${item.id}`), targetStateSetSha256: hash(`target-${item.id}`), rollbackStateSetSha256: hash(`rollback-${item.id}`), completeCanonicalBlockStates: true, exactForwardRollbackInverseVerified: true }));
    const signature = {
      schemaVersion: 1, id: 'MP09-LONG-WATER-ACCEPTANCE-SIGNATURE-01', contractIdentitySha256: contract.identitySha256, governingContractSha256: sha256(contractBytes),
      source: { snapshot: contract.source.snapshot, captureId: contract.source.captureId, captureManifestSha256, inputSha256: contract.source.inputSha256 }, namedOwners: owners, interfaceOwnership,
      containmentAndHydrology: { containmentOwner: owners.containment, receiverOverflowOwner: owners.receiverOverflow, currentComponentCellCount: 1469, currentComponentCoordinateSetSha256: contract.currentCondition.fluidInteraction.coordinateSetSha256, currentBoundaryFaces: ['maxY', 'minY'], fullSixNeighbourCensusSha256: hash('census'), closedFutureFluidComponentCoordinateSetSha256: hash('future-component'), closedFutureFluidComponentCellCount: 1555, containmentPerimeterCoordinateSetSha256: hash('perimeter'), receiverCoordinateSetSha256: hash('receiver'), overflowCoordinateSetSha256: hash('overflow'), overflowFailureTerminalSha256: hash('terminal'), retainedWaterRecoveryStateSetSha256: hash('retained-water'), futureFluidStateSetSha256: hash('future-fluid'), closedBasinOrControlledOutletsVerified: true, containmentClosedBeforeWaterDisplacement: true, receiverAcceptsNoUncontrolledDischarge: true, overflowHasExactFailureTerminal: true },
      waterDisplacement: { owner: owners.waterDisplacement, seedCellCount: 186, seedCoordinateSetSha256: contract.currentCondition.waterDisplacementSeed.coordinateSetSha256, sourceWaterStateSetSha256: hash('water-source'), targetDisplacementStateSetSha256: hash('water-target'), rollbackWaterRecoveryStateSetSha256: hash('water-rollback'), displacementOrderSha256: hash('water-order'), completeCanonicalBlockStates: true, exactForwardRollbackInverseVerified: true, afterContainmentVerified: true, beforeGradeDeckLandingVerified: true },
      gradeLandingAndReturns: { northGradeOwner: owners.northGrade, tempiettoLandingOwner: owners.tempiettoLanding, reviewedDeckCellCount: 196, reviewedDeckCoordinateSetSha256: contract.currentCondition.reviewedTwoWideDeck.coordinateSetSha256, blockedHeadroomCellCount: 21, blockedHeadroomCoordinateSetSha256: contract.currentCondition.blockedHeadroom.coordinateSetSha256, northApproach: contract.currentCondition.gradeAndLanding.northApproach, tempiettoEntrance: contract.currentCondition.gradeAndLanding.tempiettoEntrance, gradeFootingCoordinateSetSha256: hash('grade'), landingFootingCoordinateSetSha256: hash('landing'), bodyHeadClearanceStateSetSha256: hash('clear'), northToTempiettoPathSha256: hash('north-to-tempietto'), tempiettoToNorthPathSha256: hash('tempietto-to-north'), twoWideTwoClearEverywhere: true, oneStepOrLessGradeVerified: true, supportedNoJumpBidirectionalNormalWalkVerified: true, northReturnAnchor: { ...contract.currentCondition.gradeAndLanding.northApproach, label: 'North approach' }, tempiettoReturnAnchor: { ...contract.currentCondition.gradeAndLanding.tempiettoEntrance, label: 'Tempietto entrance' } },
      forwardManifest, rollbackManifest,
    };
    const rejected = structuredClone(signature);
    rejected.containmentAndHydrology.closedBasinOrControlledOutletsVerified = false;
    const rejectedOut = path.join(temporaryDirectory, 'rejected.json');
    execFileSync(process.execPath, [SCRIPT, '--signature', write('incomplete.json', rejected).path, '--out', rejectedOut, '--generated-at', '2026-08-26T21:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const rejectedDecision = JSON.parse(fs.readFileSync(rejectedOut, 'utf8'));
    expect(rejectedDecision.status).toBe('REJECTED_DESIGN_INPUT_DEFAULT_DENY');
    expect(rejectedDecision.rejectionReasons.join('\n')).toMatch(/finite closed future fluid system/);
    expect(rejectedDecision.safetyBoundary).toMatchObject({ worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 });

    const acceptedOut = path.join(temporaryDirectory, 'accepted.json');
    execFileSync(process.execPath, [SCRIPT, '--signature', write('complete.json', signature).path, '--out', acceptedOut, '--generated-at', '2026-08-26T21:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const accepted = JSON.parse(fs.readFileSync(acceptedOut, 'utf8'));
    expect(accepted).toMatchObject({ status: 'ACCEPTED_DESIGN_INPUT_NOT_RELEASE_AUTHORITY', mutationAuthority: false });
    expect(accepted.safetyBoundary).toMatchObject({ worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 });
  });
});
