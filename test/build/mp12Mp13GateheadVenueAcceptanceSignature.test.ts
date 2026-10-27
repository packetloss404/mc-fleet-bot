import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_mp12_mp13_gatehead_venue_acceptance_signature_01.mjs');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp12-mp13-i01-signature-'));
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

const invoke = (signature: string, decision: string, template?: string) => {
  const args = [SCRIPT, '--signature', signature, '--out', decision, '--generated-at', '2026-08-26T20:00:00.000Z'];
  if (template) args.push('--template-out', template);
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  return JSON.parse(fs.readFileSync(decision, 'utf8'));
};

describe('MP12 / MP13 Gatehead-to-Venue acceptance signature', () => {
  it('requires every exact boundary cell/face, all four scope owners, returns, and independent egress without emitting operations', () => {
    const templatePath = path.join(temporaryDirectory, 'template.json');
    const initialDecision = path.join(temporaryDirectory, 'initial.json');
    const initial = invoke(templatePath, initialDecision, templatePath);
    expect(initial.status).toBe('REJECTED_DESIGN_INPUT_DEFAULT_DENY');
    const signature = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    const owners = {
      mp12District: 'Westlight District steward', mp13Venue: 'Westlight Venue steward',
      approachRoad: 'Western Approach Road steward', townExpansionWestlightRoad: 'Town Westlight road steward',
    };
    signature.namedOwners = owners;
    for (const role of Object.keys(owners)) signature.participantApprovals[role] = { owner: owners[role as keyof typeof owners], accepted: true, scope: 'INTERFACE_REVIEW_NO_MUTATION' };
    for (const assignment of signature.cellAssignments) {
      const facade = assignment.kinds.includes('PROTECTED_GATEHEAD_FACADE');
      assignment.ownerRole = facade ? 'mp12District' : assignment.references.some((reference: { routeId: string }) => reference.routeId === 'gatehead-to-east-arrival') ? 'mp12District' : 'mp13Venue';
      assignment.accessClass = facade ? 'X0' : assignment.ownerRole === 'mp12District' ? 'P0' : 'P1';
      assignment.accepted = true;
    }
    const ownerAt = new Map(signature.cellAssignments.map((assignment: { point: number[]; ownerRole: string }) => [assignment.point.join(','), assignment.ownerRole]));
    for (const face of signature.directionalFaceAcceptances) {
      face.fromOwnerRole = ownerAt.get(face.from.join(',')); face.toOwnerRole = ownerAt.get(face.to.join(','));
      face.acceptingOwnerRole = 'mp13Venue'; face.normalState = 'OPEN_PUBLIC_NORMAL_WALK'; face.failureState = 'CLOSED_DENY_AND_ABORT'; face.accepted = true;
    }
    signature.publicReturnAndEgress = {
      districtToVenueReturn: { gateheadAnchor: [-338, 68, -484], venueReceiver: [-284, 68, -501], forwardPathSha256: hash('forward'), reversePathSha256: hash('reverse'), normalWalkBothDirections: true },
      publicStaffSeparation: { i05OrI06UsedAsPublicEgress: false, publicCannotReachStaff: true, proofSha256: hash('separation') },
      independentPublicEgresses: [
        { id: 'venue-exit-a', routeSha256: hash('exit-a'), reachesIndependentExteriorReceiver: true, usesWestServiceTower: false },
        { id: 'venue-exit-b', routeSha256: hash('exit-b'), reachesIndependentExteriorReceiver: true, usesWestServiceTower: false },
      ],
    };
    const acceptedSignature = path.join(temporaryDirectory, 'accepted-signature.json');
    fs.writeFileSync(acceptedSignature, `${JSON.stringify(signature, null, 2)}\n`);
    const accepted = invoke(acceptedSignature, path.join(temporaryDirectory, 'accepted.json'));
    expect(accepted).toMatchObject({ status: 'ACCEPTED_DESIGN_INPUT_NOT_RELEASE_AUTHORITY', mutationAuthority: false, safetyBoundary: { forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, worldMutationsPerformed: false } });

    signature.directionalFaceAcceptances.pop();
    const rejectedSignature = path.join(temporaryDirectory, 'rejected-signature.json');
    fs.writeFileSync(rejectedSignature, `${JSON.stringify(signature, null, 2)}\n`);
    const rejected = invoke(rejectedSignature, path.join(temporaryDirectory, 'rejected.json'));
    expect(rejected.status).toBe('REJECTED_DESIGN_INPUT_DEFAULT_DENY');
    expect(rejected.rejectionReasons.join('\n')).toMatch(/directional faces/);
  }, 45_000);
});
