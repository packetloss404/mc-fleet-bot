#!/usr/bin/env node
/**
 * MP09 Long Water acceptance-signature validator.
 *
 * This is a read-only, fail-closed design-input gate. It never reads a live
 * world, creates an operation, contacts RCON, or grants release authority.
 * A later compiler must renew every commitment against a fresh source and run
 * the complete guarded-release kernel before it may construct anything.
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
const CONTRACT = option('--contract', 'data/world-review/mp09-long-water-hydrology-ownership-grade-acceptance-contract-01-mp06-post-20260826T143902Z/mp09-long-water-hydrology-ownership-grade-acceptance-contract.json');
const SIGNATURE = option('--signature', 'docs/masterplans/09-ravensgate/MP09-LONG-WATER-ACCEPTANCE-SIGNATURE-01.template.json');
const OUT = option('--out', 'data/world-review/mp09-long-water-acceptance-decision-01-mp06-post-20260826T143902Z/mp09-long-water-acceptance-decision.json');
const GENERATED_AT = option('--generated-at', new Date().toISOString());
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const isHash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const named = (value) => typeof value === 'string' && value.trim().length >= 3
  && !/^(ASSIGN|TBD|TODO|UNKNOWN|UNASSIGNED|COPY_|OWNER_|NONE$|PLACEHOLDER)/i.test(value.trim());
const exactPoint = (point, expected) => object(point) && point.x === expected.x && point.y === expected.y && point.z === expected.z;
const sameKeys = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && [...actual].sort().every((entry, index) => entry === [...expected].sort()[index]);

const errors = [];
let contract = null;
let contractBytes = null;
let signature = null;
let signatureBytes = null;
try { contractBytes = fs.readFileSync(abs(CONTRACT)); contract = JSON.parse(contractBytes); } catch { errors.push('governing Long Water contract is absent or not valid JSON'); }
try {
  signatureBytes = fs.existsSync(abs(SIGNATURE)) ? fs.readFileSync(abs(SIGNATURE)) : null;
  signature = signatureBytes ? JSON.parse(signatureBytes) : null;
} catch { errors.push('signature file is not valid JSON'); }

const expectedRoles = ['containment', 'waterDisplacement', 'receiverOverflow', 'northGrade', 'tempiettoLanding'];
const expectedInterfaces = ['LW-HYDRO-01', 'LW-DISPLACEMENT-01', 'LW-HALO-01', 'LW-NORTH-GRADE-01', 'LW-TEMPIETTO-LANDING-01'];
const contractHash = contractBytes ? sha256(contractBytes) : null;
const source = contract?.source ?? {};
const condition = contract?.currentCondition ?? {};
const validContract = object(contract)
  && contract.id === 'MP09-LONG-WATER-HYDROLOGY-OWNERSHIP-GRADE-ACCEPTANCE-CONTRACT-01'
  && contract.status === 'PROPOSED_SOURCE_BOUND_DEFAULT_DENY_NOT_ACCEPTED_NOT_RELEASE_AUTHORITY'
  && contract.mutationAuthority === false
  && source.immutableCopy === true
  && source.verifiedRequiredMembers === 130
  && object(source.inputSha256)
  && condition.reviewedTwoWideDeck?.cells === 196
  && condition.blockedHeadroom?.cells === 21
  && condition.waterDisplacementSeed?.cells === 186
  && condition.fluidInteraction?.haloFluidCells === 593
  && condition.fluidInteraction?.affectedComponentCellsWithinSurveyEnvelope === 1469
  && condition.fluidInteraction?.closedBasinProven === false;
if (!validContract) errors.push('governing Long Water contract is malformed, unexpectedly authorizing, or lacks its exact 196/21/186/593/1,469 source observations');

const readManifest = (reference, expectedRole, label) => {
  if (!object(reference) || typeof reference.path !== 'string' || !isHash(reference.sha256)) {
    errors.push(`${label} manifest reference requires an exact path and SHA-256`);
    return null;
  }
  const filename = abs(reference.path);
  if (!fs.existsSync(filename)) { errors.push(`${label} manifest is absent: ${reference.path}`); return null; }
  const bytes = fs.readFileSync(filename);
  if (sha256(bytes) !== reference.sha256) { errors.push(`${label} manifest SHA-256 mismatch`); return null; }
  let manifest = null;
  try { manifest = JSON.parse(bytes); } catch { errors.push(`${label} manifest is not JSON`); return null; }
  if (manifest.role !== expectedRole) errors.push(`${label} manifest must declare role ${expectedRole}`);
  if (manifest.contractSha256 !== contractHash) errors.push(`${label} manifest does not bind the governing contract bytes`);
  if (manifest.captureManifestSha256 !== source.inputSha256?.[`${source.snapshot}/combined-zones-complete-save-capture.json`]) errors.push(`${label} manifest has the wrong complete-source capture identity`);
  if (!isHash(manifest.coordinateSetSha256) || !Number.isInteger(manifest.cellCount) || manifest.cellCount < 1 || !isHash(manifest.sourceStateSetSha256) || !isHash(manifest.targetStateSetSha256) || !isHash(manifest.rollbackStateSetSha256)) {
    errors.push(`${label} manifest lacks a finite exact canonical state inventory`);
  }
  if (manifest.completeCanonicalBlockStates !== true || manifest.exactForwardRollbackInverseVerified !== true) errors.push(`${label} manifest lacks complete canonical states or exact inverse commitment`);
  return manifest;
};

if (!object(signature)) {
  errors.push('signature file is missing or malformed');
} else {
  if (signature.schemaVersion !== 1 || signature.id !== 'MP09-LONG-WATER-ACCEPTANCE-SIGNATURE-01') errors.push('wrong signature schema or identifier');
  if (signature.contractIdentitySha256 !== contract?.identitySha256 || signature.governingContractSha256 !== contractHash) errors.push('signature does not bind the exact Long Water contract identity and bytes');
  if (signature.source?.snapshot !== source.snapshot || signature.source?.captureId !== source.captureId || signature.source?.captureManifestSha256 !== source.inputSha256?.[`${source.snapshot}/combined-zones-complete-save-capture.json`]) errors.push('signature does not bind the exact immutable source capture');
  for (const [filename, hash] of Object.entries(source.inputSha256 ?? {})) if (signature.source?.inputSha256?.[filename] !== hash) errors.push(`signature source input hash drift: ${filename}`);

  const owners = signature.namedOwners;
  if (!object(owners) || !sameKeys(Object.keys(owners ?? {}), expectedRoles)) errors.push('all and only the five Long Water owner roles are required');
  else {
    for (const role of expectedRoles) if (!named(owners[role])) errors.push(`owner ${role} is missing or a placeholder`);
    if (new Set(expectedRoles.map((role) => owners[role])).size !== expectedRoles.length) errors.push('containment, displacement, receiver/overflow, north-grade, and Tempietto-landing need five distinct named owners');
  }

  const interfaces = signature.interfaceOwnership;
  if (!Array.isArray(interfaces) || interfaces.length !== expectedInterfaces.length || !sameKeys(interfaces.map((item) => item?.id), expectedInterfaces)) {
    errors.push('signature needs exactly the five known Long Water interface ownership records');
  } else {
    for (const entry of interfaces) {
      if (!expectedRoles.includes(entry.ownerRole) || entry.owner !== owners?.[entry.ownerRole] || !isHash(entry.coordinateSetSha256) || !Number.isInteger(entry.cellCount) || entry.cellCount < 1 || !isHash(entry.sourceStateSetSha256) || !isHash(entry.targetStateSetSha256) || !isHash(entry.rollbackStateSetSha256) || entry.completeCanonicalBlockStates !== true || entry.exactForwardRollbackInverseVerified !== true) {
        errors.push(`interface ${entry.id} lacks an exact owner/cell/state/inverse commitment`);
      }
    }
  }

  const containment = signature.containmentAndHydrology;
  if (!object(containment)) errors.push('signature lacks containment and hydrology acceptance');
  else {
    if (containment.containmentOwner !== owners?.containment || containment.receiverOverflowOwner !== owners?.receiverOverflow) errors.push('containment and receiver/overflow owners must match the named owners');
    if (containment.currentComponentCellCount !== 1469 || containment.currentComponentCoordinateSetSha256 !== condition.fluidInteraction?.coordinateSetSha256 || containment.currentBoundaryFaces?.join(',') !== 'maxY,minY') errors.push('containment must bind the current open 1,469-cell component and both observed vertical boundary faces');
    for (const field of ['fullSixNeighbourCensusSha256', 'closedFutureFluidComponentCoordinateSetSha256', 'containmentPerimeterCoordinateSetSha256', 'receiverCoordinateSetSha256', 'overflowCoordinateSetSha256', 'overflowFailureTerminalSha256', 'retainedWaterRecoveryStateSetSha256', 'futureFluidStateSetSha256']) if (!isHash(containment[field])) errors.push(`containment lacks ${field}`);
    if (!Number.isInteger(containment.closedFutureFluidComponentCellCount) || containment.closedFutureFluidComponentCellCount < 1 || containment.closedBasinOrControlledOutletsVerified !== true || containment.containmentClosedBeforeWaterDisplacement !== true || containment.receiverAcceptsNoUncontrolledDischarge !== true || containment.overflowHasExactFailureTerminal !== true) errors.push('containment requires a finite closed future fluid system (or exact controlled outlets), closure-before-displacement, and accepted receiver/overflow terminal');
  }

  const water = signature.waterDisplacement;
  if (!object(water)) errors.push('signature lacks exact water-displacement acceptance');
  else {
    if (water.owner !== owners?.waterDisplacement || water.seedCellCount !== 186 || water.seedCoordinateSetSha256 !== condition.waterDisplacementSeed?.coordinateSetSha256) errors.push('water displacement must bind its named owner and all exact 186 source-water cells');
    for (const field of ['sourceWaterStateSetSha256', 'targetDisplacementStateSetSha256', 'rollbackWaterRecoveryStateSetSha256', 'displacementOrderSha256']) if (!isHash(water[field])) errors.push(`water displacement lacks ${field}`);
    if (water.completeCanonicalBlockStates !== true || water.exactForwardRollbackInverseVerified !== true || water.afterContainmentVerified !== true || water.beforeGradeDeckLandingVerified !== true) errors.push('water displacement requires canonical/inverse states and explicit hydraulic ordering');
  }

  const route = signature.gradeLandingAndReturns;
  if (!object(route)) errors.push('signature lacks north grade, Tempietto landing, and return acceptance');
  else {
    if (route.northGradeOwner !== owners?.northGrade || route.tempiettoLandingOwner !== owners?.tempiettoLanding) errors.push('north grade and Tempietto landing must match their named owners');
    if (route.reviewedDeckCellCount !== 196 || route.reviewedDeckCoordinateSetSha256 !== condition.reviewedTwoWideDeck?.coordinateSetSha256 || route.blockedHeadroomCellCount !== 21 || route.blockedHeadroomCoordinateSetSha256 !== condition.blockedHeadroom?.coordinateSetSha256) errors.push('grade/landing must bind the exact reviewed deck and 21 north headroom defects');
    if (!exactPoint(route.northApproach, condition.gradeAndLanding?.northApproach) || !exactPoint(route.tempiettoEntrance, condition.gradeAndLanding?.tempiettoEntrance)) errors.push('grade/landing must bind the exact north approach and Tempietto entrance');
    for (const field of ['gradeFootingCoordinateSetSha256', 'landingFootingCoordinateSetSha256', 'bodyHeadClearanceStateSetSha256', 'northToTempiettoPathSha256', 'tempiettoToNorthPathSha256']) if (!isHash(route[field])) errors.push(`grade/landing lacks ${field}`);
    if (route.twoWideTwoClearEverywhere !== true || route.oneStepOrLessGradeVerified !== true || route.supportedNoJumpBidirectionalNormalWalkVerified !== true || !named(route.northReturnAnchor?.label) || !named(route.tempiettoReturnAnchor?.label) || !exactPoint(route.northReturnAnchor, condition.gradeAndLanding?.northApproach) || !exactPoint(route.tempiettoReturnAnchor, condition.gradeAndLanding?.tempiettoEntrance)) errors.push('grade/landing requires supported two-wide/two-clear no-jump returns in both directions at the exact anchors');
  }

  const forward = readManifest(signature.forwardManifest, 'FORWARD', 'forward');
  const rollback = readManifest(signature.rollbackManifest, 'ROLLBACK', 'rollback');
  if (forward && rollback) {
    if (forward.coordinateSetSha256 !== rollback.coordinateSetSha256 || forward.cellCount !== rollback.cellCount || forward.inverseProofSha256 !== rollback.inverseProofSha256 || !isHash(forward.inverseProofSha256)) errors.push('forward and rollback must cover the identical exact cell set and share an inverse proof');
    const requiredOrder = ['CONTAINMENT_RECEIVER_OVERFLOW', 'WATER_DISPLACEMENT', 'NORTH_GRADE_DECK_TEMPIETTO_LANDING'];
    const reverseOrder = [...requiredOrder].reverse();
    if (JSON.stringify(forward.orderedDomains) !== JSON.stringify(requiredOrder)
      || JSON.stringify(rollback.reverseOrderedDomains) !== JSON.stringify(reverseOrder)) errors.push('forward must order containment → water → grade/deck/landing and rollback must bind the exact reverse order');
  }
}

const accepted = errors.length === 0;
const base = {
  schemaVersion: 1,
  id: 'MP09-LONG-WATER-ACCEPTANCE-DECISION-01',
  generatedAtUtc: GENERATED_AT,
  status: accepted ? 'ACCEPTED_DESIGN_INPUT_NOT_RELEASE_AUTHORITY' : 'REJECTED_DESIGN_INPUT_DEFAULT_DENY',
  mode: 'READ_ONLY_VALIDATION_NO_WORLD_OPERATION',
  mutationAuthority: false,
  safetyBoundary: { liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
  governingContract: contractBytes ? { path: rel(CONTRACT), sha256: contractHash, identitySha256: contract?.identitySha256 ?? null } : null,
  suppliedSignature: signatureBytes ? { path: rel(SIGNATURE), sha256: sha256(signatureBytes) } : null,
  acceptance: accepted ? { kind: 'LONG_WATER_HYDROLOGY_OWNERSHIP_GRADE_DESIGN_INPUT_ONLY', ownerRoles: expectedRoles, nextStep: 'A separate compiler must renew this evidence on a fresh complete immutable source, then pass the full guarded-release kernel. This decision authorizes no construction, RCON, fluid change, deck, landing, public route, or service opening.' } : null,
  rejectionReasons: accepted ? [] : errors,
  nonClaims: ['No operation, rollback operation, release manifest, or mutation authority is emitted.', 'An accepted signature is design input only and expires when source or bound evidence drifts.', 'The validator never infers an owner, fluid boundary, receiver, overflow, grade, landing, route, or access class.'],
};
const decision = { ...base, decisionIdentitySha256: sha256(`${JSON.stringify(base, null, 2)}\n`) };
fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true });
fs.writeFileSync(abs(OUT), `${JSON.stringify(decision, null, 2)}\n`);
console.log(`${decision.status}: ${rel(OUT)}`);
