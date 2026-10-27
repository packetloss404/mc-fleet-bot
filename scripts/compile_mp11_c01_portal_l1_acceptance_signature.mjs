#!/usr/bin/env node
/**
 * MP11 C01 portal-to-L1 acceptance-signature validator.
 *
 * This is deliberately a read-only design gate. It validates a finite,
 * source-bound signature but never creates operations, calls RCON, edits a
 * world, opens the route, or grants release authority.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const CONTRACT = option('--contract', 'data/world-review/mp11-c01-portal-l1-current-source-20260826T163300Z/MP11-C01-PORTAL-L1-ROUTE-CONTRACT-02.json');
const SIGNATURE = option('--signature', 'data/world-review/mp11-c01-portal-l1-current-source-20260826T163300Z/MP11-C01-PORTAL-L1-ACCEPTANCE-SIGNATURE-01.template.json');
const OUT = option('--out', 'data/world-review/mp11-c01-portal-l1-current-source-20260826T163300Z/mp11-c01-portal-l1-acceptance-decision-01.json');
const GENERATED_AT = option('--generated-at', new Date().toISOString());
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const hash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const named = (value) => typeof value === 'string' && value.trim().length >= 3
  && !/^(ASSIGN|COPY|TBD|TODO|UNKNOWN|UNASSIGNED|OWNER_|PLACEHOLDER)/i.test(value.trim());
const exactPoint = (actual, expected) => Array.isArray(actual) && actual.length === 3
  && actual.every((value, index) => Number.isInteger(value) && value === expected[index]);

const contractBytes = fs.readFileSync(abs(CONTRACT));
const contract = JSON.parse(contractBytes);
const contractSha256 = sha256(contractBytes);
const errors = [];
if (!object(contract) || contract.id !== 'MP11-C01-PORTAL-L1-ROUTE-CONTRACT-02'
  || contract.mutationAuthority !== false || contract.liveWorldMutated !== false) {
  errors.push('governing MP11 route contract is malformed or unexpectedly authorizing');
}
const route = contract.observedRoute ?? {};
const gate = contract.ownershipAndReverseRouteGate ?? {};
const expectedStart = route.start;
const expectedEnd = route.end;
const expectedHandoff = gate.handoff;
const signatureBytes = fs.existsSync(abs(SIGNATURE)) ? fs.readFileSync(abs(SIGNATURE)) : null;
let signature = null;
if (!signatureBytes) errors.push('signature file is absent');
else {
  try { signature = JSON.parse(signatureBytes); } catch { errors.push('signature file is not valid JSON'); }
}

const readManifest = (reference, expectedRole, label) => {
  if (!object(reference) || typeof reference.path !== 'string' || !hash(reference.sha256)) {
    errors.push(`${label} reference needs a path and SHA-256`);
    return null;
  }
  const filename = abs(reference.path);
  if (!fs.existsSync(filename)) { errors.push(`${label} file is absent: ${reference.path}`); return null; }
  const bytes = fs.readFileSync(filename);
  if (sha256(bytes) !== reference.sha256) { errors.push(`${label} SHA-256 mismatch`); return null; }
  let manifest;
  try { manifest = JSON.parse(bytes); } catch { errors.push(`${label} is not JSON`); return null; }
  if (manifest.role !== expectedRole) errors.push(`${label} must have role ${expectedRole}`);
  if (manifest.contractSha256 !== contractSha256) errors.push(`${label} has wrong contract SHA-256`);
  if (manifest.captureManifestSha256 !== contract.source?.captureManifestSha256) errors.push(`${label} has wrong capture identity`);
  if (!hash(manifest.cellSetSha256) || !Number.isInteger(manifest.cellCount) || manifest.cellCount < 1
    || manifest.completeCanonicalBlockStates !== true) {
    errors.push(`${label} lacks a finite complete canonical cell-state inventory`);
  }
  return manifest;
};

if (signature) {
  if (signature.schemaVersion !== 1 || signature.id !== 'MP11-C01-PORTAL-L1-ACCEPTANCE-SIGNATURE-01') {
    errors.push('wrong signature schema or identifier');
  }
  if (signature.contractSha256 !== contractSha256) errors.push('signature does not bind the exact route contract bytes');
  const source = signature.source;
  if (!object(source) || source.captureManifestSha256 !== contract.source?.captureManifestSha256
    || source.c01RegionSha256 !== contract.source?.c01RegionSha256
    || source.surveySha256 !== contract.source?.surveySha256) {
    errors.push('signature source identities do not exactly match the governing contract');
  }

  const owner = signature.oneRouteOwner;
  if (!named(owner?.ownerId)) errors.push('oneRouteOwner.ownerId must be one named non-placeholder owner');
  if (owner?.acceptsStationRange?.first !== 0 || owner?.acceptsStationRange?.last !== 126
    || owner?.acceptsStationRange?.count !== 127 || owner?.acceptsPortalToL1Handoff !== true) {
    errors.push('one route owner must accept all 127 stations and the exact portal-to-L1 handoff');
  }

  const design = signature.routeDesign;
  if (!object(design) || design.stationCount !== 127 || design.firstStation !== 0 || design.lastStation !== 126
    || design.controlledWidth !== 5 || design.controlledHeight !== 5 || !hash(design.routeCellSetSha256)
    || !exactPoint(design.portalEndpoint, expectedStart) || !exactPoint(design.l1Endpoint, expectedEnd)
    || !exactPoint(design.handoff?.from, expectedHandoff?.from) || !exactPoint(design.handoff?.to, expectedHandoff?.to)
    || design.handoff?.fromStation !== 25 || design.handoff?.toStation !== 26) {
    errors.push('route design must bind the finite 127-station 5x5 route, both exact endpoints, and handoff 25->26');
  }

  const landings = signature.landings;
  if (!Array.isArray(landings) || landings.length < 1 || landings.length > 17) {
    errors.push('one to 17 finite accepted landing records are required');
  } else {
    const seenStations = new Set();
    for (const landing of landings) {
      if (!Number.isInteger(landing?.station) || landing.station < 0 || landing.station > 126
        || seenStations.has(landing.station) || landing.width !== 5 || landing.height !== 5
        || !hash(landing.coordinateSetSha256) || !hash(landing.returnPathSha256)
        || landing.normalWalkBothDirections !== true) {
        errors.push('every landing needs a unique route station, exact 5x5 set, and bidirectional return proof');
        break;
      }
      seenStations.add(landing.station);
    }
  }

  const gravity = signature.gravityContainment;
  if (!object(gravity) || gravity.ownerId !== owner?.ownerId || gravity.sourceCellCount !== 1686
    || !hash(gravity.sourceCellSetSha256) || !hash(gravity.containmentSequenceSha256)
    || !hash(gravity.permanentPostStateSha256) || gravity.noTemporarySupport !== true
    || gravity.noFallingRollback !== true) {
    errors.push('gravity containment needs its complete 1,686-cell source set, same owner, ordered sequence, permanent state, and no-temporary/no-falling safeguards');
  }

  const returns = signature.returnProof;
  if (!object(returns) || returns.ownerId !== owner?.ownerId || !exactPoint(returns.portalEndpoint, expectedStart)
    || !exactPoint(returns.l1Endpoint, expectedEnd) || !hash(returns.portalToL1PathSha256)
    || !hash(returns.l1ToPortalPathSha256) || returns.normalWalkBothDirections !== true
    || returns.crossesExactHandoffBothDirections !== true) {
    errors.push('return proof must bind both exact endpoints, both finite route hashes, and the same handoff in both directions');
  }

  const forward = readManifest(signature.forwardManifest, 'FORWARD', 'forward manifest');
  const rollback = readManifest(signature.rollbackManifest, 'ROLLBACK', 'rollback manifest');
  if (forward && rollback) {
    if (forward.cellSetSha256 !== rollback.cellSetSha256 || forward.cellCount !== rollback.cellCount
      || forward.exactInverseVerified !== true || rollback.exactInverseVerified !== true
      || !hash(signature.inverseProofSha256)
      || forward.inverseProofSha256 !== signature.inverseProofSha256
      || rollback.inverseProofSha256 !== signature.inverseProofSha256) {
      errors.push('forward and rollback manifests must be exact finite inverses of the same cell set');
    }
  }
}

const accepted = errors.length === 0;
const decisionBase = {
  schemaVersion: 1,
  id: 'MP11-C01-PORTAL-L1-ACCEPTANCE-DECISION-01',
  generatedAtUtc: GENERATED_AT,
  status: accepted ? 'ACCEPTED_DESIGN_INPUT_NOT_RELEASE_AUTHORITY' : 'REJECTED_DESIGN_INPUT_DEFAULT_DENY',
  mode: 'READ_ONLY_VALIDATION_NO_WORLD_OPERATION',
  mutationAuthority: false,
  safetyBoundary: {
    liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false,
    forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false,
  },
  governingContract: { path: rel(CONTRACT), sha256: contractSha256, id: contract.id },
  suppliedSignature: signatureBytes ? { path: rel(SIGNATURE), sha256: sha256(signatureBytes) } : null,
  acceptance: accepted ? {
    kind: 'ONE_OWNER_C01_PORTAL_L1_DESIGN_INPUT_ONLY',
    nextStep: 'A separately invoked compiler may re-evaluate this design only against a fresh complete source and the full guarded-release kernel. This decision authorizes no construction, route opening, egress, public access, or RCON call.',
  } : null,
  rejectionReasons: accepted ? [] : errors,
  nonClaims: [
    'No operation, rollback operation, release manifest, or mutation authority is emitted.',
    'A validated signature is design input only and expires on source or evidence drift.',
    'This validator never assigns or infers an owner, landing, target cell, route opening, or access class.',
  ],
};
const decision = { ...decisionBase, decisionIdentitySha256: sha256(`${JSON.stringify(decisionBase, null, 2)}\n`) };
fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true });
fs.writeFileSync(abs(OUT), `${JSON.stringify(decision, null, 2)}\n`);
console.log(`${decision.status}: ${rel(OUT)}`);
