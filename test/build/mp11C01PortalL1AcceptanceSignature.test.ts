import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_mp11_c01_portal_l1_acceptance_signature.mjs');
const CONTRACT = path.join(ROOT, 'data/world-review/mp11-c01-portal-l1-current-source-20260826T163300Z/MP11-C01-PORTAL-L1-ROUTE-CONTRACT-02.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-c01-signature-'));
const sha256 = (value: string | Buffer) => crypto.createHash('sha256').update(value).digest('hex');

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

const writeManifest = (name: string, content: Record<string, unknown>) => {
  const filename = path.join(temporaryDirectory, name);
  const bytes = `${JSON.stringify(content, null, 2)}\n`;
  fs.writeFileSync(filename, bytes);
  return { path: filename, sha256: sha256(bytes) };
};

describe('MP11 C01 portal-to-L1 acceptance signature', () => {
  it('requires one finite owner, 5x5 landings, gravity/return proofs, and exact inverses without emitting operations', () => {
    const contractBytes = fs.readFileSync(CONTRACT);
    const contract = JSON.parse(contractBytes.toString('utf8'));
    const contractSha256 = sha256(contractBytes);
    const common = {
      contractSha256,
      captureManifestSha256: contract.source.captureManifestSha256,
      cellSetSha256: 'a'.repeat(64), cellCount: 8421,
      completeCanonicalBlockStates: true, exactInverseVerified: true,
    };
    const inverseProofSha256 = '4'.repeat(64);
    const forward = writeManifest('forward.json', { ...common, role: 'FORWARD', inverseProofSha256 });
    const rollback = writeManifest('rollback.json', { ...common, role: 'ROLLBACK', inverseProofSha256 });
    const signature = {
      schemaVersion: 1, id: 'MP11-C01-PORTAL-L1-ACCEPTANCE-SIGNATURE-01', contractSha256,
      source: { captureManifestSha256: contract.source.captureManifestSha256, c01RegionSha256: contract.source.c01RegionSha256, surveySha256: contract.source.surveySha256 },
      oneRouteOwner: { ownerId: 'C01 controlled-spine owner', acceptsStationRange: { first: 0, last: 126, count: 127 }, acceptsPortalToL1Handoff: true },
      routeDesign: { stationCount: 127, firstStation: 0, lastStation: 126, controlledWidth: 5, controlledHeight: 5, routeCellSetSha256: 'b'.repeat(64), portalEndpoint: contract.observedRoute.start, l1Endpoint: contract.observedRoute.end, handoff: { fromStation: 25, toStation: 26, from: contract.ownershipAndReverseRouteGate.handoff.from, to: contract.ownershipAndReverseRouteGate.handoff.to } },
      landings: [{ station: 17, width: 5, height: 5, coordinateSetSha256: 'c'.repeat(64), returnPathSha256: 'd'.repeat(64), normalWalkBothDirections: true }],
      gravityContainment: { ownerId: 'C01 controlled-spine owner', sourceCellCount: 1686, sourceCellSetSha256: 'e'.repeat(64), containmentSequenceSha256: 'f'.repeat(64), permanentPostStateSha256: '1'.repeat(64), noTemporarySupport: true, noFallingRollback: true },
      returnProof: { ownerId: 'C01 controlled-spine owner', portalEndpoint: contract.observedRoute.start, l1Endpoint: contract.observedRoute.end, portalToL1PathSha256: '2'.repeat(64), l1ToPortalPathSha256: '3'.repeat(64), normalWalkBothDirections: true, crossesExactHandoffBothDirections: true },
      inverseProofSha256, forwardManifest: forward, rollbackManifest: rollback,
    };
    const signaturePath = path.join(temporaryDirectory, 'signature.json');
    fs.writeFileSync(signaturePath, `${JSON.stringify(signature, null, 2)}\n`);
    const acceptedPath = path.join(temporaryDirectory, 'accepted.json');
    execFileSync(process.execPath, [SCRIPT, '--signature', signaturePath, '--out', acceptedPath, '--generated-at', '2026-08-26T19:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const accepted = JSON.parse(fs.readFileSync(acceptedPath, 'utf8'));
    expect(accepted).toMatchObject({ status: 'ACCEPTED_DESIGN_INPUT_NOT_RELEASE_AUTHORITY', mutationAuthority: false, safetyBoundary: { forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 } });

    signature.oneRouteOwner.acceptsStationRange.last = 125;
    fs.writeFileSync(signaturePath, `${JSON.stringify(signature, null, 2)}\n`);
    const rejectedPath = path.join(temporaryDirectory, 'rejected.json');
    execFileSync(process.execPath, [SCRIPT, '--signature', signaturePath, '--out', rejectedPath, '--generated-at', '2026-08-26T19:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const rejected = JSON.parse(fs.readFileSync(rejectedPath, 'utf8'));
    expect(rejected.status).toBe('REJECTED_DESIGN_INPUT_DEFAULT_DENY');
    expect(rejected.rejectionReasons.join('\n')).toMatch(/all 127 stations/);
    expect(rejected.safetyBoundary.forwardOperationFilesEmitted).toBe(0);
  });
});
