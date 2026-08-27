#!/usr/bin/env node
/**
 * MP08 C1 bilateral acceptance-signature compiler.
 *
 * This validates a supplied, source-bound three-owner acceptance into a
 * design-input decision.  It is intentionally not an operation compiler: no
 * RCON, Minecraft connection, operation file, release manifest, or mutation
 * authority is available from this program.
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
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNamed = (value) => typeof value === 'string'
  && value.trim().length >= 3
  && !/^(ASSIGN|TBD|TODO|UNKNOWN|UNASSIGNED|COPY_|OWNER_|NONE$)/i.test(value.trim());
const sameKeys = (actual, expected) => Array.isArray(actual)
  && actual.length === expected.length
  && [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
const integer = (value) => Number.isInteger(value);

const CONTRACT = option('--contract', 'data/world-review/mp08-c1-bilateral-containment-contract-02-mp01-anvil-post-20260826T163300Z/mp08-c1-bilateral-containment-contract-02.json');
const SIGNATURE = option('--signature', 'docs/masterplans/08-raven-rock/MP08-C1-BILATERAL-ACCEPTANCE-SIGNATURE-01.template.json');
const OUT = option('--out', 'data/world-review/mp08-c1-bilateral-acceptance-decision-01-mp01-anvil-post-20260826T163300Z/mp08-c1-bilateral-acceptance-decision.json');
const GENERATED_AT = option('--generated-at', new Date().toISOString());
const readBytes = (filename) => fs.readFileSync(abs(filename));
const readJson = (filename) => JSON.parse(readBytes(filename));

const contractBytes = readBytes(CONTRACT);
const contract = JSON.parse(contractBytes);
const signatureBytes = fs.existsSync(abs(SIGNATURE)) ? readBytes(SIGNATURE) : null;
let signature = null;
const errors = [];
try {
  signature = signatureBytes ? JSON.parse(signatureBytes) : null;
} catch {
  errors.push('signature file is not valid JSON');
}

if (!object(contract)
  || contract.id !== 'MP08-C1-BILATERAL-CONTAINMENT-INTERFACE-CONTRACT-02'
  || contract.status !== 'STATIC_SOURCE_BOUND_NONAUTHORIZING_OWNER_INTERFACE_CONTRACT'
  || contract.mutationAuthority !== false
  || !isHash(contract.identitySha256)
  || !object(contract.source)
  || !isHash(contract.source.captureManifestSha256)
  || !isHash(contract.source.sourceStateSha256)
  || !isHash(contract.source?.sourceEnvelope?.coordinateSetSha256)) {
  errors.push('governing C1 contract is malformed, unauthorized, or lacks its exact immutable source binding');
}

const expectedRoles = ['c1', 'cavernA', 'cavernB'];
const expectedInterfaceRoles = {
  'MP08-C1-CAVERN_A-BILATERAL-INTERFACE-02': 'cavernA',
  'MP08-C1-CAVERN_B-BILATERAL-INTERFACE-02': 'cavernB',
};
const expectedInterfaceIds = Object.keys(expectedInterfaceRoles);
const expectedOwnership = contract.acceptanceTemplate?.ownedCoordinateSets ?? {};
const expectedInterfaces = new Map((contract.interfaces ?? []).map((item) => [item.id, item]));

if (!object(signature)) {
  errors.push('signature file is missing or malformed');
} else {
  if (signature.schemaVersion !== 1 || signature.id !== 'MP08-C1-BILATERAL-ACCEPTANCE-SIGNATURE-01') {
    errors.push('wrong signature schema or identifier');
  }
  if (signature.contractIdentitySha256 !== contract.identitySha256) errors.push('signature contract identity does not match the governing C1 contract');
  if (signature.governingContractSha256 !== sha256(contractBytes)) errors.push('signature does not bind the exact governing-contract file');

  const source = signature.source;
  for (const field of ['snapshot', 'captureId', 'captureManifestSha256', 'sourceStateSha256']) {
    if (source?.[field] !== contract.source?.[field]) errors.push(`signature source.${field} does not exactly match the contract source`);
  }
  if (source?.sourceEnvelopeCoordinateSetSha256 !== contract.source?.sourceEnvelope?.coordinateSetSha256) {
    errors.push('signature source envelope coordinate set does not match the contract');
  }

  const owners = signature.namedOwners;
  if (!object(owners) || !sameKeys(Object.keys(owners ?? {}), expectedRoles)) {
    errors.push('signature needs all and only C1, Cavern A, and Cavern B owner roles');
  } else {
    for (const role of expectedRoles) if (!isNamed(owners[role])) errors.push(`owner ${role} is missing or a placeholder`);
    if (new Set(expectedRoles.map((role) => owners[role])).size !== expectedRoles.length) errors.push('C1 and both Caverns require distinct named owners');
  }

  const commitments = signature.stateCommitments;
  if (!object(commitments) || !sameKeys(Object.keys(commitments ?? {}), expectedRoles)) {
    errors.push('each of C1, Cavern A, and Cavern B needs one exact state commitment');
  } else {
    for (const role of expectedRoles) {
      const commitment = commitments[role];
      const expectedSet = expectedOwnership[role]?.coordinateSetSha256;
      if (!object(commitment) || commitment.owner !== owners?.[role]) {
        errors.push(`${role} state commitment must be made by its named owner`);
        continue;
      }
      if (commitment.ownedCoordinateSetSha256 !== expectedSet) errors.push(`${role} commitment owns the wrong exact coordinate set`);
      if (commitment.sourceEnvelopeStateSha256 !== contract.source?.sourceStateSha256) errors.push(`${role} commitment does not bind the exact source state`);
      for (const field of ['targetStateSetSha256', 'retainedStateSetSha256', 'rollbackStateSetSha256']) {
        if (!isHash(commitment[field])) errors.push(`${role} commitment lacks ${field}`);
      }
      if (commitment.completeCanonicalBlockStates !== true) errors.push(`${role} commitment lacks complete canonical block states`);
      if (commitment.exactForwardRollbackInverseVerified !== true) errors.push(`${role} commitment lacks exact forward/rollback inversion`);
      if (commitment.noContainersOrBlockEntities !== true) errors.push(`${role} commitment does not exclude containers and block entities`);
      if (role === 'c1' && commitment.sealedNoDischargeNoFluidNoOutfall !== true) errors.push('C1 commitment does not preserve the sealed no-discharge liner policy');
    }
  }

  const interfaces = signature.interfaces;
  if (!Array.isArray(interfaces) || !sameKeys(interfaces.map((entry) => entry?.id), expectedInterfaceIds)) {
    errors.push('signature must include exactly the two named Cavern interface acceptances');
  } else {
    for (const interfaceId of expectedInterfaceIds) {
      const entry = interfaces.find((candidate) => candidate?.id === interfaceId);
      const expected = expectedInterfaces.get(interfaceId)?.reciprocalCavernOwner;
      const cavernRole = expectedInterfaceRoles[interfaceId];
      if (!object(entry) || !object(expected)) {
        errors.push(`${interfaceId} cannot be checked against the governing contract`);
        continue;
      }
      if (entry.acceptingOwner !== owners?.[cavernRole]) errors.push(`${interfaceId} is not accepted by the assigned ${cavernRole} owner`);
      if (entry.doorCoordinateSetSha256 !== expected.doorCells?.coordinateSetSha256) errors.push(`${interfaceId} door cell set does not match`);
      if (entry.receiverCoordinateSetSha256 !== expected.exteriorReceiver?.coordinateSetSha256) errors.push(`${interfaceId} receiver cell set does not match`);
      if (entry.closedManualUnpoweredNoNbtNoActuator !== true) errors.push(`${interfaceId} does not accept the closed manual/no-NBT/no-actuator door condition`);
      if (entry.sealedNoDischargeReceiver !== true) errors.push(`${interfaceId} does not accept the sealed no-discharge receiver condition`);
      if (entry.bidirectionalNormalWalkVerified !== true || !isHash(entry.normalWalkProofSha256)) errors.push(`${interfaceId} lacks exact bidirectional normal-walk evidence`);
      if (!object(entry.outerReturnAnchor) || !isNamed(entry.outerReturnAnchor.label)
        || !integer(entry.outerReturnAnchor.x) || !integer(entry.outerReturnAnchor.y) || !integer(entry.outerReturnAnchor.z)) {
        errors.push(`${interfaceId} lacks an exact named outer return anchor`);
      } else if ((cavernRole === 'cavernA' && entry.outerReturnAnchor.z > 9)
        || (cavernRole === 'cavernB' && entry.outerReturnAnchor.z < 76)) {
        errors.push(`${interfaceId} outer return anchor is on the C1 side of its reserved receiver`);
      }
    }
  }
}

const accepted = errors.length === 0;
const decisionWithoutHash = {
  schemaVersion: 1,
  id: 'MP08-C1-BILATERAL-ACCEPTANCE-DECISION-01',
  generatedAtUtc: GENERATED_AT,
  status: accepted ? 'ACCEPTED_DESIGN_INPUT_NOT_RELEASE_AUTHORITY' : 'REJECTED_DESIGN_INPUT_DEFAULT_DENY',
  mode: 'READ_ONLY_VALIDATION_NO_WORLD_OPERATION',
  mutationAuthority: false,
  safetyBoundary: {
    liveCallsPerformed: false,
    rconCallsPerformed: false,
    worldMutationsPerformed: false,
    forwardOperationFilesEmitted: 0,
    rollbackOperationFilesEmitted: 0,
    releaseManifestEmitted: false,
  },
  governingContract: { path: rel(CONTRACT), sha256: sha256(contractBytes), contractIdentitySha256: contract.identitySha256 },
  suppliedSignature: signatureBytes ? { path: rel(SIGNATURE), sha256: sha256(signatureBytes) } : null,
  acceptance: accepted ? {
    kind: 'BILATERAL_C1_CAVERN_DESIGN_INPUT_ONLY',
    ownerRoles: expectedRoles,
    interfaceIds: expectedInterfaceIds,
    nextStep: 'A separately invoked compiler may only evaluate this decision against a fresh complete immutable source and the full guarded release kernel. This decision creates no operations and grants no build, RCON, route-opening, transport, public, or service authority.',
  } : null,
  rejectionReasons: accepted ? [] : errors,
  nonClaims: [
    'No world operation, rollback operation, release manifest, or mutation authority is emitted.',
    'An accepted design input is not a release authorization and expires when the contract or source binding changes.',
    'This compiler never selects an owner, infers a return path, accepts a fluid outlet, or opens a route.',
  ],
};
const decision = { ...decisionWithoutHash, decisionIdentitySha256: sha256(`${JSON.stringify(decisionWithoutHash, null, 2)}\n`) };
const output = abs(OUT);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(decision, null, 2)}\n`);
console.log(`${decision.status}: ${rel(OUT)}`);
