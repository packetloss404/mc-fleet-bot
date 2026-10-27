#!/usr/bin/env node
/**
 * MP01 access commissioning acceptance-signature compiler.
 *
 * A completed normal-walk survey alone is not enough to commission the remote
 * MP01 staging interface. This read-only compiler binds that survey to named
 * origin/transit/destination/recovery responsibility and to the exact passive
 * staging, control, door, vestibule, and reservoir conditions. It emits a
 * decision only; it never emits an operation, changes a route/config, moves a
 * bot, or grants world-mutation authority.
 */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
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
const read = (filename) => fs.readFileSync(abs(filename));
const json = (filename) => JSON.parse(read(filename));
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isHash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isNamed = (value) => typeof value === 'string' && value.trim().length >= 3
  && !/^(ASSIGN|TBD|TODO|UNKNOWN|UNASSIGNED|COPY_|OWNER_|NONE$|PLACEHOLDER)/i.test(value.trim());
const validPoint = (value) => Number.isInteger(value?.x) && Number.isInteger(value?.y) && Number.isInteger(value?.z);
const pointKey = (value) => `${value.x},${value.y},${value.z}`;
const samePoint = (left, right) => pointKey(left) === pointKey(right);
const sameKeys = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
const routeHash = (stations) => sha256(`${stations.map((station) => [
  station.feet.x, station.feet.y, station.feet.z, station.ownerId, station.interfaceId,
].join('|')).join('\n')}\n`);

const CONTRACT = option('--contract', 'data/world-review/mp01-access-normal-walk-survey-contract-01-anvil-post-20260826T163300Z/mp01-access-normal-walk-survey-contract-01.json');
const SIGNATURE = option('--signature', 'docs/masterplans/01-cheyenne-mountain-complex/MP01-ACCESS-COMMISSIONING-ACCEPTANCE-SIGNATURE-01.template.json');
const OUT = option('--out', 'data/world-review/mp01-access-commissioning-acceptance-decision-01-anvil-post-20260826T163300Z/mp01-access-commissioning-acceptance-decision.json');
const GENERATED_AT = option('--generated-at', new Date().toISOString());
const SURVEY_VALIDATOR = path.join(ROOT, 'scripts/generate_mp01_access_normal_walk_survey_acceptance_contract_01.mjs');

const contractBytes = read(CONTRACT);
const contract = JSON.parse(contractBytes);
const errors = [];
if (!object(contract)
  || contract.id !== 'MP01-ACCESS-NORMAL-WALK-SURVEY-CONTRACT-01'
  || contract.status !== 'STATIC_SOURCE_BOUND_NONAUTHORIZING_ACCESS_SURVEY_CONTRACT'
  || contract.mutationAuthority !== false
  || !isHash(contract.identitySha256)
  || !object(contract.source)
  || !isHash(contract.source.captureManifestSha256)
  || !isHash(contract.source.destinationProtectedEnvelope?.stateSha256)) {
  errors.push('governing MP01 survey contract is malformed, unauthorized, or lacks the exact immutable source binding');
}

let signatureBytes = null;
let signature = null;
try {
  signatureBytes = fs.existsSync(abs(SIGNATURE)) ? read(SIGNATURE) : null;
  signature = signatureBytes ? JSON.parse(signatureBytes) : null;
} catch {
  errors.push('signature file is not valid JSON');
}

const roles = ['origin', 'transit', 'destination', 'recovery'];
let survey = null;
if (!object(signature)) {
  errors.push('signature file is missing or malformed');
} else {
  if (signature.schemaVersion !== 1 || signature.id !== 'MP01-ACCESS-COMMISSIONING-ACCEPTANCE-SIGNATURE-01') {
    errors.push('wrong signature schema or identifier');
  }
  if (signature.contractIdentitySha256 !== contract.identitySha256) errors.push('signature contract identity does not match governing survey contract');
  if (signature.governingContractSha256 !== sha256(contractBytes)) errors.push('signature does not bind the exact governing-contract file');
  for (const field of ['snapshot', 'captureId', 'captureManifestSha256', 'destinationProtectedEnvelopeStateSha256']) {
    const expected = field === 'destinationProtectedEnvelopeStateSha256'
      ? contract.source.destinationProtectedEnvelope?.stateSha256 : contract.source?.[field];
    if (signature.source?.[field] !== expected) errors.push(`signature source.${field} does not exactly match the contract source`);
  }
  if (JSON.stringify(signature.source?.sourceFiles) !== JSON.stringify(contract.source?.sourceFiles)) errors.push('signature source.sourceFiles does not exactly match the contract source');

  const owners = signature.namedOwners;
  if (!object(owners) || !sameKeys(Object.keys(owners ?? {}), roles)) {
    errors.push('signature requires all and only named origin, transit, destination, and recovery owners');
  } else {
    for (const role of roles) if (!isNamed(owners[role])) errors.push(`owner ${role} is missing or a placeholder`);
    if (new Set(roles.map((role) => owners[role])).size !== roles.length) errors.push('origin, transit, destination, and recovery owners must be distinct named parties');
  }

  const anchors = signature.anchors;
  if (!object(anchors) || !sameKeys(Object.keys(anchors ?? {}), ['origin', 'recovery', 'destination'])) {
    errors.push('signature requires exact origin, distinct recovery, and MP01 destination anchors');
  } else {
    for (const role of ['origin', 'recovery', 'destination']) {
      if (!isNamed(anchors[role]?.id) || !validPoint(anchors[role]?.feet)) errors.push(`${role} anchor lacks a named exact feet cell`);
      if (anchors[role]?.owner !== owners?.[role === 'destination' ? 'destination' : role]) errors.push(`${role} anchor is not accepted by its named owner`);
    }
    if (validPoint(anchors.origin?.feet) && validPoint(anchors.recovery?.feet) && samePoint(anchors.origin.feet, anchors.recovery.feet)) errors.push('recovery anchor must differ from origin anchor');
    const staging = contract.destination?.stagingFeetCells?.cells ?? [];
    if (validPoint(anchors.destination?.feet) && !staging.some((cell) => samePoint(cell, anchors.destination.feet))) errors.push('destination anchor is not one of the exact MP01 staging feet cells');
  }

  const destination = signature.destinationAcceptance;
  if (!object(destination)) {
    errors.push('signature lacks complete staging/control/manual-boundary/reservoir acceptance');
  } else {
    const staging = destination.staging;
    if (!object(staging) || staging.supportCoordinateSetSha256 !== contract.destination?.stagingSupportCells?.coordinateSetSha256
      || staging.headroomCoordinateSetSha256 !== contract.destination?.stagingHeadroomCells?.coordinateSetSha256
      || staging.supportsPolishedAndesite !== true || staging.twoClearAirCells !== true) {
      errors.push('staging acceptance does not retain the exact support and two-air-cell clearance condition');
    }
    const controls = destination.controls;
    if (!object(controls) || controls.coordinateSetSha256 !== contract.destination?.interactionOnlyControlBoundary?.coordinateSetSha256
      || controls.sourceStateSha256 !== contract.destination?.interactionOnlyControlBoundary?.currentStateSha256
      || controls.retainOffNoActuation !== true) {
      errors.push('control acceptance does not retain the exact seven-cell OFF/no-actuation condition');
    }
    const boundary = destination.manualBoundary;
    if (!object(boundary)
      || boundary.closedDoorCoordinateSetSha256 !== contract.destination?.protectedManualBoundary?.closedDoorCells?.coordinateSetSha256
      || boundary.dryVestibuleCoordinateSetSha256 !== contract.destination?.protectedManualBoundary?.dryVestibuleCells?.coordinateSetSha256
      || boundary.reservoirWallCoordinateSetSha256 !== contract.destination?.protectedManualBoundary?.retainedReservoirWallCells?.coordinateSetSha256
      || boundary.doorsClosedUnpoweredManual !== true || boundary.dryVestibuleClear !== true
      || boundary.reservoirWallRetained !== true || boundary.noBoundaryCrossing !== true) {
      errors.push('manual-door, dry-vestibule, reservoir-wall, or no-crossing acceptance is incomplete or drifted');
    }
  }

  const surveyBinding = signature.routeSurvey;
  if (!object(surveyBinding) || !isNamed(surveyBinding.acceptancePath) || !isHash(surveyBinding.acceptanceSha256)) {
    errors.push('signature lacks an exact normal-walk survey-acceptance path and hash');
  } else if (!fs.existsSync(abs(surveyBinding.acceptancePath))) {
    errors.push('named normal-walk survey acceptance file is absent');
  } else {
    try {
      const surveyBytes = read(surveyBinding.acceptancePath);
      if (sha256(surveyBytes) !== surveyBinding.acceptanceSha256) errors.push('normal-walk survey acceptance hash drifted');
      survey = JSON.parse(surveyBytes);
      const outbound = survey.routes?.outbound;
      const inbound = survey.routes?.return;
      if (!Array.isArray(outbound) || !Array.isArray(inbound)) errors.push('normal-walk survey does not provide outbound and return station arrays');
      if (object(surveyBinding.outbound) && Array.isArray(outbound)
        && (surveyBinding.outbound.stationCount !== outbound.length || surveyBinding.outbound.stationsSha256 !== routeHash(outbound))) errors.push('outbound route signature does not match the exact survey stations');
      else if (!object(surveyBinding.outbound)) errors.push('signature lacks outbound route station count/hash');
      if (object(surveyBinding.return) && Array.isArray(inbound)
        && (surveyBinding.return.stationCount !== inbound.length || surveyBinding.return.stationsSha256 !== routeHash(inbound))) errors.push('return route signature does not match the exact survey stations');
      else if (!object(surveyBinding.return)) errors.push('signature lacks return route station count/hash');

      const surveyedRoles = new Map((survey.owners ?? []).map((owner) => [owner.role, owner.id]));
      for (const role of ['origin', 'transit', 'destination']) if (surveyedRoles.get(role) !== owners?.[role]) errors.push(`survey ${role} owner does not match the named commissioning owner`);
      if (Array.isArray(outbound) && Array.isArray(inbound) && object(anchors)) {
        if (!samePoint(survey.anchors?.origin?.feet ?? {}, anchors.origin?.feet ?? {})) errors.push('survey origin anchor does not match signature');
        if (!samePoint(survey.anchors?.recovery?.feet ?? {}, anchors.recovery?.feet ?? {})) errors.push('survey recovery anchor does not match signature');
        if (!samePoint(survey.anchors?.destination?.feet ?? {}, anchors.destination?.feet ?? {})) errors.push('survey destination anchor does not match signature');
        const declaredOwners = new Set(Object.values(owners ?? {}));
        for (const station of [...outbound, ...inbound]) if (!declaredOwners.has(station?.ownerId)) errors.push(`survey station ${pointKey(station?.feet ?? {})} is not covered by a named commissioning owner`);
        if (outbound.length && outbound[0]?.ownerId !== owners?.origin) errors.push('outbound first station is not owned by named origin owner');
        if (outbound.length && outbound.at(-1)?.ownerId !== owners?.destination) errors.push('outbound last station is not owned by named destination owner');
        if (inbound.length && inbound[0]?.ownerId !== owners?.destination) errors.push('return first station is not owned by named destination owner');
        if (inbound.length && inbound.at(-1)?.ownerId !== owners?.recovery) errors.push('return final station is not owned by named recovery owner');
        if (![...outbound, ...inbound].some((station) => station?.ownerId === owners?.transit)) errors.push('no surveyed station is accepted by the named transit owner');
      }
    } catch {
      errors.push('normal-walk survey acceptance cannot be read as valid JSON');
    }
  }
}

// The existing survey validator reads the bound snapshot and independently
// verifies footing, headroom, route steps, owner/interface coverage, and both
// endpoints. It is deliberately invoked only after structural signature checks
// pass, so an incomplete template cannot fake a route by merely naming a file.
if (errors.length === 0 && signature && survey) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp01-access-signature-'));
  try {
    execFileSync(process.execPath, [SURVEY_VALIDATOR, '--snapshot', contract.source.snapshot, '--out', tmp,
      '--validate-acceptance', signature.routeSurvey.acceptancePath, '--generated-at', GENERATED_AT], { cwd: ROOT, stdio: 'pipe' });
    const validation = JSON.parse(fs.readFileSync(path.join(tmp, 'acceptance-validation.json'), 'utf8'));
    if (validation.status !== 'ACCEPTED_SOURCE_BOUND_ROUTE_SURVEY_AWAITING_SEPARATE_MOBILITY_PATCH_REVIEW' || validation.mutationAuthority !== false) {
      errors.push('independent immutable-source normal-walk survey validation did not accept the supplied route');
    }
  } catch {
    errors.push('independent immutable-source normal-walk survey validation failed closed');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const accepted = errors.length === 0;
const decisionWithoutHash = {
  schemaVersion: 1,
  id: 'MP01-ACCESS-COMMISSIONING-ACCEPTANCE-DECISION-01',
  generatedAtUtc: GENERATED_AT,
  status: accepted ? 'ACCEPTED_COMMISSIONING_READINESS_INPUT_NOT_RELEASE_AUTHORITY' : 'REJECTED_COMMISSIONING_READINESS_DEFAULT_DENY',
  mode: 'READ_ONLY_VALIDATION_NO_WORLD_OPERATION',
  mutationAuthority: false,
  safetyBoundary: {
    liveCallsPerformed: false, botMovementPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false,
    configOrCatalogMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false,
  },
  governingContract: { path: rel(CONTRACT), sha256: sha256(contractBytes), contractIdentitySha256: contract.identitySha256 },
  suppliedSignature: signatureBytes ? { path: rel(SIGNATURE), sha256: sha256(signatureBytes) } : null,
  acceptance: accepted ? {
    kind: 'MP01_REMOTE_ACCESS_COMMISSIONING_DESIGN_INPUT_ONLY',
    nextStep: 'A separate offline civic-mobility patch review may assess exactly this accepted route. Before any supervised movement, recapture the complete source, rerun the survey and this signature, clear live entities, and compare exact live route/destination state. This decision grants no movement, route/config/catalog mutation, control actuation, RCON, release, public/service access, egress, or MP01-completion authority.',
  } : null,
  rejectionReasons: accepted ? [] : errors,
  nonClaims: [
    'No bot movement, world edit, RCON call, operation file, rollback file, release manifest, or config/catalog change is emitted.',
    'An accepted signature is a design input only; it neither commissions controls nor authorizes travel or a physical release.',
    'The closed manual doors, dry vestibule, reservoir wall, and seven-cell OFF control boundary remain passive protected conditions.',
  ],
};
const decision = { ...decisionWithoutHash, decisionIdentitySha256: sha256(`${JSON.stringify(decisionWithoutHash, null, 2)}\n`) };
fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true });
fs.writeFileSync(abs(OUT), `${JSON.stringify(decision, null, 2)}\n`);
process.stdout.write(`${decision.status}: ${rel(OUT)}\n`);
