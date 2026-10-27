#!/usr/bin/env node
/**
 * MP05 / B07 integrated acceptance-signature compiler.
 *
 * This is deliberately a design-input gate, not a release compiler. It reads
 * one source-bound signature and can emit only an accepted/rejected design
 * decision. It never opens RCON, writes build operations, or infers an owner.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const isHash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isNamed = (value) => typeof value === 'string'
  && value.trim().length >= 3
  && !/^(ASSIGN|TBD|TODO|UNKNOWN|UNASSIGNED|COPY_)/i.test(value.trim());
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const setEquals = (actual, expected) => actual.length === expected.length
  && [...actual].sort().every((value, index) => value === [...expected].sort()[index]);

const CONTRACT = option('--contract', 'data/world-review/mp03-b07-vertical-acceptance-contract-01-sys03-post-20260826T153100Z/mp03-b07-vertical-acceptance-contract.json');
const SIGNATURE = option('--signature', 'data/world-review/mp05-b07-integrated-release-next-action-sys03-post-20260826T153100Z/B07-INTEGRATED-ACCEPTANCE-SIGNATURE-01.template.json');
const OUT = option('--out', 'data/world-review/mp05-b07-integrated-release-next-action-sys03-post-20260826T153100Z/b07-integrated-acceptance-decision.json');
const GENERATED_AT = option('--generated-at', new Date().toISOString());

const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const readBoundManifest = (reference, expectedRole, binding, errors, label) => {
  if (!object(reference) || typeof reference.path !== 'string' || !isHash(reference.sha256)) {
    errors.push(`${label}: manifest reference needs path and SHA-256`);
    return null;
  }
  const filename = abs(reference.path);
  if (!fs.existsSync(filename)) {
    errors.push(`${label}: manifest file is absent: ${reference.path}`);
    return null;
  }
  const bytes = fs.readFileSync(filename);
  if (sha256(bytes) !== reference.sha256) {
    errors.push(`${label}: manifest SHA-256 does not match supplied reference`);
    return null;
  }
  let manifest;
  try {
    manifest = JSON.parse(bytes);
  } catch {
    errors.push(`${label}: manifest is not JSON`);
    return null;
  }
  if (manifest.role !== expectedRole) errors.push(`${label}: expected role ${expectedRole}`);
  if (manifest.contractIdentitySha256 !== binding.contractIdentitySha256) errors.push(`${label}: wrong contract identity`);
  if (manifest.sourceCaptureManifestSha256 !== binding.sourceCaptureManifestSha256) errors.push(`${label}: wrong source capture identity`);
  if (!isHash(manifest.cellSetSha256) || !Number.isInteger(manifest.canonicalStateCount) || manifest.canonicalStateCount < 1) {
    errors.push(`${label}: missing exact canonical cell-state inventory`);
  }
  if (manifest.completeCanonicalBlockStates !== true) errors.push(`${label}: canonical block states are not complete`);
  return manifest;
};

const contractBytes = fs.readFileSync(abs(CONTRACT));
const contract = JSON.parse(contractBytes);
const signatureBytes = fs.existsSync(abs(SIGNATURE)) ? fs.readFileSync(abs(SIGNATURE)) : null;
const signature = signatureBytes ? JSON.parse(signatureBytes) : null;
const errors = [];

if (!object(contract) || contract.mutationAuthority !== false || !isHash(contract.contractIdentitySha256)) {
  errors.push('the governing vertical contract is missing, malformed, or unexpectedly authorizing');
}
if (!object(signature)) {
  errors.push('signature file is missing or malformed');
}

const expectedOwnerKeys = [
  'b07PrimaryConstructionOwner', 'hydrologyContainmentOwner', 'r09jProtectedCapOwner',
  'r07jSurfaceReceiverOwner', 'lowerLobbyReceiverOwner', 'mp03ProgrammeOwner',
];
const requiredDomains = ['FLUID_CONTAINMENT', 'GRAVITY_PERMANENT_SUPPORT', 'R09J_CAP', 'R07J_CAP', 'LOWER_RECEIVER', 'EXTERIOR_RECEIVER', 'NORMAL_WALK_EGRESS'];
let forward = null;
let rollback = null;
let egress = null;

if (signature) {
  if (signature.schemaVersion !== 1 || signature.id !== 'MP05-B07-INTEGRATED-ACCEPTANCE-SIGNATURE-01') {
    errors.push('wrong signature schema or identifier');
  }
  if (signature.contractIdentitySha256 !== contract.contractIdentitySha256) errors.push('signature does not bind the governing contract identity');
  const source = signature.source;
  if (!object(source)
    || source.captureManifestSha256 !== contract.source?.captureManifestSha256
    || source.authorityTemplateSha256 !== contract.source?.authorityTemplate?.sha256
    || source.containmentSurveySha256 !== contract.source?.containmentSurvey?.sha256) {
    errors.push('signature source identities do not exactly match the governing contract');
  }

  const owners = signature.namedOwners;
  if (!object(owners) || !setEquals(Object.keys(owners ?? {}), expectedOwnerKeys)) {
    errors.push('all and only the six named owner roles are required');
  } else {
    for (const key of expectedOwnerKeys) if (!isNamed(owners[key])) errors.push(`owner role ${key} is unassigned or placeholder`);
  }

  const expectedSeams = contract.ownershipAndReceiverAcceptance?.exactSeams;
  if (!Array.isArray(signature.acceptedSeams) || !Array.isArray(expectedSeams) || signature.acceptedSeams.length !== 6 || expectedSeams.length !== 6) {
    errors.push('exactly six accepted B07 boundary seams are required');
  } else {
    const actualByDirection = new Map(signature.acceptedSeams.map((seam) => [seam?.direction, seam]));
    for (const expected of expectedSeams) {
      const actual = actualByDirection.get(expected.direction);
      if (!actual || actual.transitionCount !== expected.transitionCount || actual.pairSha256 !== expected.pairSha256 || !isNamed(actual.acceptingCounterpartOwner)) {
        errors.push(`seam ${expected.direction} lacks its exact counterpart acceptance`);
      }
    }
    if (actualByDirection.size !== 6) errors.push('seam directions must be unique');
  }

  const binding = { contractIdentitySha256: contract.contractIdentitySha256, sourceCaptureManifestSha256: contract.source?.captureManifestSha256 };
  forward = readBoundManifest(signature.forwardManifest, 'FORWARD', binding, errors, 'forward');
  rollback = readBoundManifest(signature.rollbackManifest, 'ROLLBACK', binding, errors, 'rollback');
  egress = readBoundManifest(signature.normalWalkAndIndependentEgressManifest, 'NORMAL_WALK_EGRESS', binding, errors, 'normal-walk/egress');
  if (forward && rollback) {
    if (forward.cellSetSha256 !== rollback.cellSetSha256) errors.push('forward and rollback manifests cover different cell sets');
    if (forward.exactInverseVerified !== true || rollback.exactInverseVerified !== true) errors.push('forward/rollback exact inverse evidence is absent');
    if (!setEquals(forward.integratedDomains ?? [], requiredDomains) || !setEquals(rollback.integratedDomains ?? [], requiredDomains)) {
      errors.push('forward and rollback manifests must bind every integrated B07 domain');
    }
  }
  if (egress && (egress.normalWalkVerified !== true || egress.independentEgressVerified !== true)) {
    errors.push('normal-walk and independent-egress proof is incomplete');
  }

  const fluid = signature.fluidContainment;
  if (!object(fluid) || !isHash(fluid.sourceFutureStateSetSha256) || !isNamed(fluid.componentOwner)
    || !isNamed(fluid.receiverOwner) || !isHash(fluid.componentReferenceSha256)
    || !isHash(fluid.freeboardCapacityReferenceSha256) || !isHash(fluid.overflowFailureTerminalSha256)) {
    errors.push('fluid containment needs an exact component, owners, receiver/freeboard, overflow terminal, and source/future state set');
  } else if (object(owners) && fluid.componentOwner !== owners.hydrologyContainmentOwner) {
    errors.push('fluid component owner must match the named hydrology-containment owner');
  }

  const gravity = signature.gravity;
  const exposureHash = contract.observedFacts?.gravity?.broaderExposure?.cells?.coordinateSetSha256;
  if (!object(gravity) || gravity.exposureCellSetSha256 !== exposureHash || !isHash(gravity.permanentPostStateReferenceSha256)
    || !isHash(gravity.orderedRollbackReferenceSha256) || !isHash(gravity.fallChainReferenceSha256)
    || gravity.noTemporarySupport !== true || gravity.noFallingRollback !== true) {
    errors.push('gravity acceptance needs the exact 308-cell exposure binding, permanent state, ordered rollback, fall-chain proof, and both no-temporary/no-falling safeguards');
  }

  const caps = signature.protectedCaps;
  if (!object(caps)
    || caps.r09j?.cellCount !== 2 || caps.r09j?.requiredSourceState !== 'minecraft:polished_diorite' || !isHash(caps.r09j?.reciprocalReplacementAndInverseSha256)
    || caps.r07j?.cellCount !== 49 || caps.r07j?.remainSolidUntilExteriorAcceptance !== true || caps.r07j?.headhouseDoorlessUntilExteriorAcceptance !== true || !isHash(caps.r07j?.surfaceReceiverFaceLandingReturnFailureSha256)) {
    errors.push('R09J and R07J caps need their exact retained-state and reciprocal/exterior evidence');
  }

  const terminals = signature.directedReceivers;
  if (!object(terminals) || !isHash(terminals.lowerLobbyReceiverApertureReturnSha256) || !isHash(terminals.exteriorReceiverFaceLandingReturnFailureSha256)
    || !isNamed(terminals.lowerLobbyReceiverOwner) || !isNamed(terminals.exteriorReceiverOwner)) {
    errors.push('lower and exterior directed receivers need exact terminal/return evidence and named accepting owners');
  } else if (object(owners) && (terminals.lowerLobbyReceiverOwner !== owners.lowerLobbyReceiverOwner
    || terminals.exteriorReceiverOwner !== owners.r07jSurfaceReceiverOwner)) {
    errors.push('directed receiver owners must match the named lower-lobby and R07J surface receiver owners');
  }
}

const accepted = errors.length === 0;
const decisionWithoutHash = {
  schemaVersion: 1,
  id: 'MP05-B07-INTEGRATED-ACCEPTANCE-DECISION-01',
  generatedAtUtc: GENERATED_AT,
  status: accepted ? 'ACCEPTED_DESIGN_INPUT_NOT_RELEASE_AUTHORITY' : 'REJECTED_DESIGN_INPUT_DEFAULT_DENY',
  mode: 'READ_ONLY_VALIDATION_NO_WORLD_OPERATION',
  mutationAuthority: false,
  safetyBoundary: {
    liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false,
    forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false,
  },
  governingContract: { path: rel(CONTRACT), sha256: sha256(contractBytes), contractIdentitySha256: contract.contractIdentitySha256 },
  suppliedSignature: signatureBytes ? { path: rel(SIGNATURE), sha256: sha256(signatureBytes) } : null,
  acceptance: accepted ? {
    kind: 'INTEGRATED_B07_DESIGN_INPUT_ONLY',
    requiredDomains,
    nextStep: 'A separately invoked fresh-source guarded release compiler may evaluate this accepted design input; this decision grants no construction, RCON, route-opening, or service authority.',
  } : null,
  rejectionReasons: accepted ? [] : errors,
  nonClaims: [
    'No world operation, rollback operation, release manifest, or mutation authority is emitted.',
    'Accepted design input is not a release authorization and expires when its source capture or any bound evidence changes.',
    'No named owner is inferred by this compiler; it only validates supplied exact names and counterpart signatures.',
  ],
};
const decision = { ...decisionWithoutHash, decisionIdentitySha256: sha256(`${JSON.stringify(decisionWithoutHash, null, 2)}\n`) };
fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true });
fs.writeFileSync(abs(OUT), `${JSON.stringify(decision, null, 2)}\n`);
console.log(`${decision.status}: ${rel(OUT)}`);
