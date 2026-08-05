#!/usr/bin/env node
/**
 * Compile the deterministic, offline-only D05 owner-acceptance packet.
 *
 * This packet organizes the already selected FM-01 planning basis into a
 * reviewable policy and exact closure contract. It does not self-accept the
 * policy, invent technical evidence, materialize future cells, or authorize a
 * world edit.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);

function value(flag, fallback) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

const GENERATED_AT = value('--generated-at', '2026-08-04T23:45:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-d05-owner-acceptance-packet.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-d05-owner-acceptance-packet.md',
));

const INPUTS = Object.freeze({
  authorityReconciliation:
    'docs/masterplans/04-combined-complex/authority-reconciliation.json',
  d05HydrologyBaseline:
    'docs/masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.json',
  d05ConservativeDefaults:
    'docs/masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
  d05RelicConditionAccess:
    'docs/masterplans/05-combined-zones/phase1-d05-relic-condition-access-survey.json',
  d05FutureStateContract:
    'docs/masterplans/05-combined-zones/phase1-d05-future-state-compiler-contract.json',
  d05FutureMountain:
    'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  connectorGeometry:
    'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  autonomousSelections:
    'docs/masterplans/05-combined-zones/phase1-autonomous-design-selections.json',
});

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function binding(relativePath) {
  const data = fs.readFileSync(absolute(relativePath));
  return {
    path: relativePath,
    bytes: data.length,
    sha256: sha256(data),
  };
}

function invariant(condition, message) {
  if (!condition) throw new Error(`D05 owner-acceptance input rejected: ${message}`);
}

function exactSelection(selections, id) {
  const selection = selections.selections?.find((item) => item.id === id);
  invariant(selection, `missing delegated selection ${id}`);
  invariant(selection.technicalAcceptanceClaimed === false,
    `${id} unexpectedly claims technical acceptance`);
  return selection;
}

function claim(id, classification, statement, evidence, limitation = null) {
  return { id, classification, statement, evidence, limitation };
}

function offsetSetHash(offsets) {
  const preamble = 'combined-zones-finite-offset-set-v1\n';
  return sha256(preamble + offsets.map(({ x, y, z }) => `${x},${y},${z}\n`).join(''));
}

const authority = readJson(INPUTS.authorityReconciliation);
const baseline = readJson(INPUTS.d05HydrologyBaseline);
const defaults = readJson(INPUTS.d05ConservativeDefaults);
const relicSurvey = readJson(INPUTS.d05RelicConditionAccess);
const futureContract = readJson(INPUTS.d05FutureStateContract);
const futureMountain = readJson(INPUTS.d05FutureMountain);
const connector = readJson(INPUTS.connectorGeometry);
const selections = readJson(INPUTS.autonomousSelections);
const sourceBindings = Object.fromEntries(
  Object.entries(INPUTS).map(([id, relativePath]) => [id, binding(relativePath)]),
);

invariant(authority.id === 'masterplan-04-to-05-authority-reconciliation',
  'unexpected authority reconciliation');
invariant(authority.status === 'RECONCILED_FOR_DETAILED_DESIGN_NOT_AUTHORIZED_FOR_WORLD_EDITS',
  'authority reconciliation is not the detailed-design authority');
invariant(authority.planToDevelop?.path === 'docs/masterplans/05-combined-zones/MASTERPLAN.md',
  'Masterplan 05 is not the plan to develop');
invariant(baseline.id === 'combined-zones-phase1-d05-hydrology-relic-buffer-design',
  'unexpected D05 baseline');
invariant(baseline.d05Disposition?.status === 'HOLD', 'D05 baseline is not HOLD');
invariant(defaults.id === 'combined-zones-phase1-d05-conservative-defaults',
  'unexpected D05 defaults');
invariant(defaults.evidenceBoundary?.ownerAcceptanceRecorded === false,
  'D05 defaults unexpectedly record owner acceptance');
invariant(relicSurvey.id === 'combined-zones-phase1-d05-relic-condition-access-survey',
  'unexpected D05 relic survey');
invariant(relicSurvey.status === 'D05_S01_OFFLINE_SURVEY_COMPLETE_D05_G06_HOLD'
  && relicSurvey.d05S01Disposition?.status === 'PASS_OFFLINE_SURVEY_EVIDENCE',
  'D05-S01 survey is not complete-and-held');
invariant(futureContract.id === 'combined-zones-phase1-d05-future-state-compiler-contract',
  'unexpected D05-S02 contract');
invariant(futureContract.readinessDisposition?.contractSchemaPassed === true,
  'D05-S02 contract schema is not passing');
invariant(futureContract.futureCellCount === 0 && futureContract.constructionCellCount === 0,
  'D05-S02 unexpectedly emits future or construction cells');
invariant(futureMountain.id === 'combined-zones-phase1-d05-future-mountain-alternatives',
  'unexpected future-mountain evidence');
invariant(futureMountain.status
  === 'PARTIAL_PASS_EXACT_FUTURE_MOUNTAIN_ALTERNATIVES_RECOMMENDATION_ONLY_D05_G02_HOLD',
  'future-mountain alternatives do not remain recommendation-only');
invariant(connector.id === 'combined-zones-phase1-connector-geometry',
  'unexpected connector geometry');
invariant(selections.id === 'combined-zones-phase1-autonomous-design-selections',
  'unexpected delegated selection ledger');
invariant(selections.disposition?.d05Resolved === false && selections.disposition?.r00G02Passed === false,
  'delegated selections unexpectedly resolve D05 or G02');

invariant(futureMountain.sourceBindings?.d05HydrologyBaseline?.sha256
  === sourceBindings.d05HydrologyBaseline.sha256,
  'future mountain has stale D05 baseline binding');
invariant(futureMountain.sourceBindings?.d05ConservativeDefaults?.sha256
  === sourceBindings.d05ConservativeDefaults.sha256,
  'future mountain has stale defaults binding');
invariant(futureMountain.sourceBindings?.d05RelicConditionAccess?.sha256
  === sourceBindings.d05RelicConditionAccess.sha256,
  'future mountain has stale relic-survey binding');
invariant(futureMountain.sourceBindings?.d05FutureStateContract?.sha256
  === sourceBindings.d05FutureStateContract.sha256,
  'future mountain has stale S02 binding');
invariant(futureMountain.sourceBindings?.connectorGeometry?.sha256
  === sourceBindings.connectorGeometry.sha256,
  'future mountain has stale connector binding');
invariant(selections.sourceBindings?.d05FutureMountain?.sha256
  === sourceBindings.d05FutureMountain.sha256,
  'selection ledger has stale future-mountain binding');

const requiredSelectionIds = [
  'SEL-D05-RELIC-MINIMUM-EXCLUSION',
  'SEL-D05-EAST-IGLOO-DISPOSITION',
  'SEL-D05-LOGICAL-CONTROL-MODEL',
  'SEL-D05-FUTURE-STATE-SCHEMA',
  'SEL-D05-ZERO-UNDECLARED-CHANGE',
  'SEL-P1-B09-FUNICULAR-CENTERLINE',
  'SEL-P1-B10-MOUNTAIN-SOLID-AND-RELIC-VOIDS',
];
const boundSelections = requiredSelectionIds.map((id) => exactSelection(selections, id));

const fm01 = futureMountain.alternatives?.find(
  (alternative) => alternative.modelId === 'FM-01-COMPACT-EAST-FACE',
);
invariant(fm01, 'FM-01 alternative is missing');
invariant(futureMountain.b09FaceComparison?.recommendedAlternativeId === fm01.modelId,
  'FM-01 is no longer the deterministic recommendation');
invariant(futureMountain.b09FaceComparison?.selectedAlternativeId === null,
  'raw alternative artifact unexpectedly self-selected a face');
invariant(fm01.sparseAddedSolidIntervals?.candidateAddedSolidCellCount === 14_768_553,
  'FM-01 candidate added-solid count drifted');
invariant(fm01.belowCoordinationSupportGap?.cellCount === 754_224,
  'FM-01 support-gap count drifted');
invariant(fm01.belowCoordinationSupportGap?.columnCount === 107_345,
  'FM-01 support-gap column count drifted');
invariant(fm01.sparseAddedSolidIntervals?.canonicalMaterialState === null,
  'FM-01 unexpectedly has a canonical material state');
invariant(fm01.routeAccommodation?.b09Funicular?.pointCount === 561,
  'FM-01 B09 route point count drifted');
invariant(fm01.routeAccommodation?.b09Funicular?.minimumPlanningAccommodation?.cellCount === 7_800,
  'FM-01 B09 accommodation count drifted');
invariant(fm01.routeAccommodation?.b09Funicular?.b08PlanningInterfaceIntersection?.cellCount === 36,
  'FM-01 B08/B09 planning interface count drifted');
invariant(futureMountain.protectedRelicVoidPolicy?.union?.cellCount === 4_890,
  'protected core-plus-one union count drifted');

const contact = authority.coordinateCrosswalk?.find((item) => item.id === 'service-contact');
invariant(contact?.worldStudy?.y === 130, 'world-study material-transition Y drifted');
const b09Endpoints = connector.funicularFaceComparison?.designEndpoints;
invariant(b09Endpoints?.from?.x === 2048 && b09Endpoints?.from?.y === 130
  && b09Endpoints?.from?.z === -748, 'B09 lower endpoint drifted');
invariant(b09Endpoints?.to?.x === 2048 && b09Endpoints?.to?.y === 304
  && b09Endpoints?.to?.z === -828, 'B09 summit endpoint drifted');

const planningOffsets = [];
for (let x = -1; x <= 1; x += 1) {
  for (let y = -1; y <= 1; y += 1) {
    for (let z = -1; z <= 1; z += 1) planningOffsets.push({ x, y, z });
  }
}

const materialStateClasses = [
  {
    id: 'MAT-CURRENT-STATE-RETAINED',
    classification: 'OWNER_POLICY_CHOICE',
    appliesWhen: 'an exact model record is unchanged and explicitly retained',
    futureCanonicalState: 'PRESERVE_EXPECTED_CURRENT_CANONICAL_STATE',
    status: 'READY_FOR_OWNER_POLICY_ACCEPTANCE',
    qualification: 'The immutable source state is copied exactly; this token is not a Minecraft state.',
  },
  {
    id: 'MAT-BULK-STRUCTURAL-FILL-CANDIDATE',
    classification: 'OWNER_POLICY_CHOICE_REQUIRES_TECHNICAL_ACCEPTANCE',
    appliesWhen: 'an exact accepted fill cell is internal, non-finish, non-liner, and non-support-special',
    futureCanonicalState: 'minecraft:stone',
    status: 'PROPOSED_NOT_ASSIGNABLE',
    qualification: 'A deterministic candidate state only; geotechnical acceptance and exact cell records are absent.',
  },
  {
    id: 'MAT-LOWER-ARCHITECTURAL-FINISH-CANDIDATE',
    classification: 'OWNER_POLICY_CHOICE_REQUIRES_TECHNICAL_ACCEPTANCE',
    appliesWhen: 'an exact accepted exposed finish cell lies below world-study Y=130',
    futureCanonicalState: 'minecraft:smooth_stone',
    status: 'PROPOSED_NOT_ASSIGNABLE',
    qualification: 'Architectural limestone-style contrast only; it is not a natural-contact or age claim.',
  },
  {
    id: 'MAT-UPPER-ARCHITECTURAL-FINISH-CANDIDATE',
    classification: 'OWNER_POLICY_CHOICE_REQUIRES_TECHNICAL_ACCEPTANCE',
    appliesWhen: 'an exact accepted exposed finish cell lies at or above world-study Y=130',
    futureCanonicalState: 'minecraft:polished_diorite',
    status: 'PROPOSED_NOT_ASSIGNABLE',
    qualification: 'Architectural granite-style contrast only; it is not a natural-contact or age claim.',
  },
  {
    id: 'MAT-ROUTE-PASSABLE-CANDIDATE',
    classification: 'OWNER_POLICY_CHOICE_REQUIRES_TECHNICAL_ACCEPTANCE',
    appliesWhen: 'an exact accepted excavation record is typed as passable route clearance',
    futureCanonicalState: 'minecraft:air',
    status: 'PROPOSED_NOT_ASSIGNABLE',
    qualification: 'Does not define lining, support, drainage, headroom, guideway, or mechanism cells.',
  },
  {
    id: 'MAT-SUPPORT-LINER-RETAINING',
    classification: 'TECHNICAL_GAP',
    appliesWhen: 'a cell performs support, waterproofing, lining, foundation, bridge, or retaining work',
    futureCanonicalState: null,
    status: 'HOLD_NO_ACCEPTED_STATE',
    qualification: 'State selection follows exact geotechnical/hydrology treatment, never a bulk-fill default.',
  },
  {
    id: 'MAT-SURFACE-CAP-CRYOSPHERE-LANDSCAPE',
    classification: 'TECHNICAL_GAP',
    appliesWhen: 'a cell is an exposed cap, soil, vegetation, snow/ice, drainage, or erosion-control finish',
    futureCanonicalState: null,
    status: 'HOLD_NO_ACCEPTED_STATE',
    qualification: 'Current adjacency counts do not authorize a future snow, ice, soil, or drainage state.',
  },
  {
    id: 'MAT-B09-GUIDEWAY-STATION-MECHANISM',
    classification: 'TECHNICAL_GAP',
    appliesWhen: 'a cell belongs to B09 rail, station, maintenance, egress, power, barrier, control, or rescue systems',
    futureCanonicalState: null,
    status: 'HOLD_NO_ACCEPTED_STATE',
    qualification: 'The exact centerline is planning geometry, not a commissioned transport design.',
  },
];

const ownerRoles = [
  {
    ownerId: 'CZ05-PROTECTED-RELIC-CONTROL',
    role: 'Canonical veto owner for accepted protected cores, minimum exclusions, and later expert support/access influence cells.',
    exactCellAssignmentsAccepted: false,
  },
  {
    ownerId: 'CZ05-MOUNTAIN-HYDROLOGY-CONTROL',
    role: 'Canonical owner for accepted direct fluid/cryosphere interactions, drainage/discharge, dewatering, and hydrology influence cells.',
    exactCellAssignmentsAccepted: false,
  },
  {
    ownerId: 'CZ05-SCOPE-CONSTRUCTION-CONTROL',
    role: 'Owner class for accepted direct mountain, support, finish, staging, and access cells after relic/hydrology vetoes.',
    exactCellAssignmentsAccepted: false,
  },
  {
    ownerId: 'CZ05-Z11-FUNICULAR-CONTROL',
    role: 'Proposed subordinate scope owner for B09 guideway, stations, maintenance/egress, and mechanisms under exact interfaces.',
    exactCellAssignmentsAccepted: false,
  },
];

const packetPolicyIdentity = {
  packetId: 'CZ05-D05-OWNER-ACCEPTANCE-PACKET-V1',
  selectedModelId: fm01.modelId,
  selectedModelIdentitySha256: fm01.modelIdentitySha256,
  futureStateContractId: futureContract.deterministicCompilerContract?.contractId,
  protectedRelicUnionSha256:
    futureMountain.protectedRelicVoidPolicy.union.coordinateSetSha256,
  b09CenterlineSha256:
    fm01.routeAccommodation.b09Funicular.orderedCenterlineSha256,
  materialStatePlanId: 'CZ05-FM01-CANONICAL-MATERIAL-STATE-PLAN-V1',
  supportGapPolicyId: 'CZ05-FM01-SUPPORT-GAP-DEFAULT-DENY-V1',
  ownerRoleIds: ownerRoles.map(({ ownerId }) => ownerId),
};

const policyIdentitySha256 = sha256(JSON.stringify(packetPolicyIdentity));
const ownerAcceptedScope = [
  'FM-01 remains the B09/B10 planning basis.',
  'The proposed deterministic material-state classification policy may guide exact technical development.',
  'The support-gap, zero-undeclared-change, relic minimum-exclusion, owner-role, and interface rules are binding default-deny criteria.',
  'Every PASS/HOLD row remains independently enforceable.',
];
const ownerAcceptanceNeverImplies = [
  'accepted future, construction, influence, material, mechanism, or operation cells',
  'expert hydrology, geotechnical, structural, life-safety, or transport acceptance',
  'D05 or G02 PASS',
  'construction ownership, release authorization, or a world edit',
];
const ownerAcceptancePayload = {
  schemaVersion: 1,
  id: 'CZ05-D05-CONDITIONAL-PLANNING-POLICY-ACCEPTANCE-PAYLOAD-V1',
  decision: 'ACCEPT_CONDITIONAL_PLANNING_POLICY',
  policyIdentitySha256,
  selectedModelId: fm01.modelId,
  selectedModelIdentitySha256: fm01.modelIdentitySha256,
  acceptedScope: ownerAcceptedScope,
  limitationsAcknowledged: ownerAcceptanceNeverImplies,
};
const ownerAcceptancePayloadSha256 = sha256(JSON.stringify(ownerAcceptancePayload));
const copyableSoleOwnerAcceptanceStatement =
  `I, [SOLE OWNER NAME], accept only the conditional D05 planning policy bound by owner-acceptance payload SHA-256 ${ownerAcceptancePayloadSha256}, policy identity SHA-256 ${policyIdentitySha256}, and FM-01 model identity SHA-256 ${fm01.modelIdentitySha256}. I accept FM-01 as the B09/B10 planning basis and the payload's default-deny criteria for continued exact technical development. I do not accept any future, construction, influence, material, mechanism, or operation cell; I do not record expert hydrology, geotechnical, structural, life-safety, or transport acceptance; and I do not pass D05 or R00 G02 or authorize construction ownership, release, or a world edit. My separate acceptance JSON will bind the final packet SHA-256 [FINAL PACKET SHA-256], this payload hash, my identity, and a UTC timestamp.`;

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d05-owner-acceptance-packet',
  generatedAtUtc: GENERATED_AT,
  status: 'OWNER_ACCEPTANCE_PACKET_READY_POLICY_AND_TECHNICAL_D05_G02_HOLD',
  purpose:
    'Hash-bind the selected FM-01 planning basis, proposed owner-policy decisions, and exact technical closure contract without accepting future cells, expert conclusions, construction ownership, or world edits.',
  worldEditAuthorized: false,
  constructionOwnershipAuthorized: false,
  futureStateAuthorized: false,
  ownerAcceptanceRecorded: false,
  expertAcceptanceRecorded: false,
  executable: false,
  operationCellCount: 0,
  materialCellCount: 0,
  futureCellCount: 0,
  constructionCellCount: 0,
  sourceBindings,
  immutableEvidenceIdentity: {
    snapshot: futureMountain.sourceBindings.immutablePhase0PostRegionSnapshot,
    currentSurface: futureMountain.immutableCurrentSurface,
    modelIdentity: {
      modelId: fm01.modelId,
      modelIdentitySha256: fm01.modelIdentitySha256,
      formulaSha256: fm01.formulaSha256,
      designSurfaceManifestSha256: fm01.designSurface.columnManifestSha256,
      sparseIntervalManifestSha256:
        fm01.sparseAddedSolidIntervals.intervalManifestSha256,
      supportGapManifestSha256:
        fm01.belowCoordinationSupportGap.intervalManifestSha256,
    },
  },
  authorityBoundary: {
    decisionAuthority: 'sole human project owner',
    delegatedPlanningAuthority:
      'Owner-directed autonomous research, design, and conservative planning selection.',
    alreadySelectedPlanningBasis: boundSelections.map(({ id, scope, selection }) => ({
      id,
      scope,
      selection,
    })),
    packetMayBeAcceptedAs:
      'A conditional owner planning policy and technical acceptance checklist only.',
    packetCannotAccept: [
      'canonical future or construction cells that have not been emitted',
      'support or geotechnical treatment for the 754,224 held cells',
      'hydrology, groundwater, erosion, snowmelt, dewatering, or discharge conclusions',
      'expert relic support/access influence cells',
      'B09 station, maintenance/egress, mechanism, or commissioning design',
      'exact cell ownership or directional interface contracts',
      'R00 G02, any later gate, an operation, or a world edit',
    ],
    d07FactualBoundary:
      'World-study Y=130 is an architectural material transition only. Legacy natural-contact, thrust/overthrust, laccolith, geologically-honest, and 270 Ma claims are forbidden in material labels, signage, compiler output, and release evidence.',
  },
  claimRegister: {
    classifications: {
      BOUND_FACT: 'Copied or cross-checked from a hash-bound source; no new world inference.',
      DETERMINISTIC_DERIVATION: 'Produced by a declared exact formula or set operation over bound facts.',
      OWNER_POLICY_CHOICE: 'A reversible planning rule the sole owner may accept; not technical proof.',
      TECHNICAL_GAP: 'Missing evidence that remains default-deny and cannot be inferred by this packet.',
    },
    claims: [
      claim('D05-CLAIM-001', 'BOUND_FACT',
        'FM-01 is the selected owner-delegated B09/B10 planning basis.',
        'SEL-P1-B09-FUNICULAR-CENTERLINE and SEL-P1-B10-MOUNTAIN-SOLID-AND-RELIC-VOIDS',
        'Selection does not accept materials, support, hydrology, owners, or mechanisms.'),
      claim('D05-CLAIM-002', 'DETERMINISTIC_DERIVATION',
        'FM-01 contains 14,768,553 candidate added-solid cells in its sparse interval model.',
        fm01.sparseAddedSolidIntervals.intervalManifestSha256,
        'Candidate intervals are not materialized future or construction cells.'),
      claim('D05-CLAIM-003', 'DETERMINISTIC_DERIVATION',
        'FM-01 exposes 754,224 below-Y72 support-gap cells across 107,345 columns.',
        fm01.belowCoordinationSupportGap.intervalManifestSha256,
        'No treatment is selected.'),
      claim('D05-CLAIM-004', 'BOUND_FACT',
        'The exact current D05 census contains 1,929,621 water/waterlogged, 85,088 lava, 182,791 frozen, and 359,830 snow cells.',
        sourceBindings.d05HydrologyBaseline.sha256,
        'Current-state facts do not predict future behavior.'),
      claim('D05-CLAIM-005', 'DETERMINISTIC_DERIVATION',
        'The exact core-plus-one-cell preserve-current-state union contains 4,890 cells.',
        futureMountain.protectedRelicVoidPolicy.union.coordinateSetSha256,
        'It is a minimum planning exclusion, not an expert influence distance.'),
      claim('D05-CLAIM-006', 'DETERMINISTIC_DERIVATION',
        'The selected B09 route has 561 ordered points, 560 cardinal steps, and 7,800 minimum planning-accommodation cells.',
        fm01.routeAccommodation.b09Funicular.orderedCenterlineSha256,
        'It does not define stations, evacuation, guideway structure, or mechanisms.'),
      claim('D05-CLAIM-007', 'OWNER_POLICY_CHOICE',
        'Unknown direct, support, hydrology, relic, ownership, and interface influence remains default-deny.',
        'SEL-D05-ZERO-UNDECLARED-CHANGE',
        'Owner policy cannot replace technical evidence.'),
      claim('D05-CLAIM-008', 'TECHNICAL_GAP',
        'No complete canonical proposed-state registry exists.',
        sourceBindings.d05FutureStateContract.sha256),
      claim('D05-CLAIM-009', 'TECHNICAL_GAP',
        'No accepted support treatment or finite expert hydrology/geotechnical kernel exists.',
        sourceBindings.d05FutureMountain.sha256),
      claim('D05-CLAIM-010', 'TECHNICAL_GAP',
        'No exact B09 station, maintenance/egress, mechanism, or commissioning cell set exists.',
        sourceBindings.d05FutureMountain.sha256),
    ],
  },
  selectedFm01PlanningBasis: {
    selectionStatus: 'SELECTED_FOR_CONDITIONAL_OWNER_POLICY_REVIEW',
    modelId: fm01.modelId,
    classification: fm01.classification,
    formula: fm01.formula,
    directlyModelledColumnCount: fm01.directlyModelledColumnCount,
    designSurface: fm01.designSurface,
    candidateAddedSolidIntervals: fm01.sparseAddedSolidIntervals,
    acceptedFutureCellCount: 0,
    acceptedConstructionCellCount: 0,
    qualification:
      'The analytic surface and sparse intervals are exact planning derivations. No interval becomes a material or owned construction cell until all packet HOLD criteria pass.',
  },
  canonicalMaterialStatePlan: {
    planId: packetPolicyIdentity.materialStatePlanId,
    status: 'OWNER_POLICY_READY_EXACT_STATE_REGISTRY_HOLD',
    architecturalTransitionWorldStudyY: 130,
    transitionQualification:
      'A design/material threshold only; never a claim that the two analogue rocks form one natural contact.',
    deterministicClassificationOrder: [
      'preserve exact immutable current state inside protected relic preserve-current-state cells',
      'apply accepted route/station/mechanism records',
      'apply accepted support/liner/retaining records',
      'apply accepted exposed finish classification',
      'apply accepted internal bulk fill classification',
      'retain every explicitly modelled unchanged current state',
      'reject duplicate, unclassified, or implicitly changed coordinates',
    ],
    stateClasses: materialStateClasses,
    proposedStateRegistryContract: futureContract.requiredInputSchemas.proposedStateRegistry,
    completeRegistryAvailable: false,
    acceptedRecordCount: 0,
    acceptedCoordinateSetSha256: null,
    acceptedBlockStateSetSha256: null,
    ownerPolicyAcceptanceDoesNotAssignCells: true,
  },
  constructionAndInfluenceCellSetMethod: {
    status: 'METHOD_FROZEN_OUTPUT_SETS_HOLD',
    contractId: futureContract.deterministicCompilerContract.contractId,
    coordinateOrder: futureContract.deterministicCompilerContract.coordinateOrder,
    requiredSetFamilies: futureContract.setFamilies.map((family) => ({
      id: family.id,
      group: family.group,
      ownerClass: family.ownerClass,
      compilationRule: family.compilationRule,
      influenceRuleId: family.influenceRuleId,
      status: 'HOLD_NO_ACCEPTED_SET',
    })),
    compilationOrder: [
      'bind the immutable snapshot and FM-01 formula/surface/interval identities',
      'materialize unique sorted direct records with exact current and proposed canonical states',
      'withhold the 4,890-cell relic preserve-current-state union and accepted B08/B09 reservations from bulk fill',
      'classify every below-Y72 support-gap interval before any support/fill is admitted',
      'compile exact staging, access, equipment-sweep, and restoration cells without width inference',
      'intersect direct/staging cells with exact current water/lava/frozen/snow sets and component identities',
      'expand only accepted finite expert kernels and exact directed drainage graphs',
      'assign exactly one owner per direct and influence cell',
      'match every cross-owner transition to exactly one directional interface contract',
      'emit typed coordinate/state/owner hashes and reject any unknown, duplicate, gap, overlap, or stale binding',
    ],
    hashing: futureContract.deterministicCompilerContract,
    currentDisposition: {
      acceptedDirectSetCount: 0,
      acceptedInfluenceSetCount: 0,
      futureCellCount: 0,
      constructionCellCount: 0,
      readyToCompile: false,
    },
  },
  belowCoordinationSupportGapPlan: {
    policyId: packetPolicyIdentity.supportGapPolicyId,
    classification: 'DETERMINISTIC_DERIVATION_WITH_TECHNICAL_GAP',
    status: 'HOLD_DEFAULT_DENY_NO_TREATMENT_SELECTED',
    exactGap: fm01.belowCoordinationSupportGap,
    permittedTreatmentClasses: [
      {
        id: 'SUPPORT-RETAIN-VOID',
        requirement: 'Exact accepted stability, hydrology, access, and no-collapse/no-flow evidence; no cell is changed.',
      },
      {
        id: 'SUPPORT-ENGINEERED-FILL',
        requirement: 'Exact cells, canonical states, source guards, loads, fluid/component treatment, owner, and interfaces.',
      },
      {
        id: 'SUPPORT-BRIDGE-RETAINING-FOUNDATION',
        requirement: 'Exact structural members, foundations, swept volumes, water treatment, owner, and interfaces.',
      },
      {
        id: 'SUPPORT-REDESIGN-FM01-SURFACE',
        requirement: 'New deterministic surface/interval hashes and complete re-audit against all bound evidence.',
      },
    ],
    forbiddenDefaults: [
      'silently fill below Y=72',
      'treat current air or water as competent support',
      'clip a support or hydrology influence at the coordination boundary',
      'use a bounding box, percentage, narrative radius, or visual review as a cell classification',
    ],
    passCriteria: [
      'Every one of the 754,224 gap cells belongs to exactly one accepted treatment record or to an exact accepted no-change void record.',
      'Treatment-group cell counts sum exactly to 754,224 and reproduce the bound gap manifest.',
      'Every changed/support/influence cell has a canonical state, exact owner, and required interface contract.',
      'Geotechnical and hydrology reviewers accept the treatment criteria and results against the same FM-01 identity.',
    ],
  },
  hydrologyAndGeotechnicalAcceptancePlan: {
    status: 'HOLD_EXPERT_CRITERIA_AND_EXACT_INFLUENCE_SETS_MISSING',
    boundCurrentFacts: {
      fullHeightFamilies: Object.fromEntries(
        Object.entries(baseline.immutableThreeDimensionalCensus.families)
          .map(([id, family]) => [id, {
            cellCount: family.cellCount,
            coordinateSetSha256: family.coordinateSetSha256,
            blockStateSetSha256: family.blockStateSetSha256,
          }]),
      ),
      waterComponentCount:
        baseline.immutableThreeDimensionalCensus.waterComponents.componentCount,
      lavaComponentCount:
        baseline.immutableThreeDimensionalCensus.lavaComponents.componentCount,
      fm01RaisedColumnSurfaceAdjacency:
        fm01.exactCurrentSurfaceAdjacency.raisedColumnSurfaceFamilyCounts,
      adjacencyQualification: fm01.exactCurrentSurfaceAdjacency.qualification,
    },
    ownerPolicy: [
      'zero undeclared water, waterlogged, lava, frozen, snow, component, sink, receiver, or discharge change',
      'unknown influence is HOLD, never an accepted empty set',
      'every intended exception requires exact before/after cells, component accounting, receiver, owner, interface, and acceptance test',
      'current D8/top-cell adjacency is diagnostic only and cannot prove groundwater, infiltration, erosion, snowmelt, stability, or drainage capacity',
    ],
    requiredTechnicalInputs: [
      'accepted stability/load/foundation/support criteria and exact treatment for all support-gap intervals',
      'accepted finite treatment-class kernels for groundwater, infiltration, erosion, dewatering, sump, and relic support/access influence',
      'accepted exact drainage graph including collection, conduit, sump, overflow, outlet, receiver, maintenance, and boundary contracts',
      'future water/lava/frozen/snow component accounting and explicit zero-undeclared-change results',
      'accepted erosion, slope, retaining, surface-cap, snow/ice, maintenance, and failure-mode criteria',
    ],
    deterministicPassCriteria: [
      'All exact direct/staging/access sets are intersected with every bound current fluid and cryosphere family.',
      'Every touched six-connected component has an exact accepted future disposition and before/after accounting.',
      'Every finite kernel records exact offsets, seed hash, boundary rule, component closure rule, owner, and acceptance.',
      'No influence is clipped at a scope boundary and every terminal has an exact receiver/interface contract.',
      'All technical checks bind the same snapshot, FM-01 model, material registry, owner registry, and interface identities.',
    ],
  },
  protectedRelicInfluencePlan: {
    status: 'MINIMUM_PLANNING_KERNEL_FROZEN_EXPERT_KERNELS_HOLD',
    minimumPlanningKernel: {
      kernelId: 'CZ05-RELIC-CORE-PLUS-ONE-CHEBYSHEV-V1',
      classification: 'OWNER_POLICY_CHOICE_NOT_ENGINEERING_KERNEL',
      distance: 'one-cell Chebyshev expansion around each exact recorded core',
      integerOffsets: planningOffsets,
      offsetSetSha256: offsetSetHash(planningOffsets),
      acceptedPlanningUse:
        'Default-deny preserve-current-state minimum only; no construction, fill, staging, access, or ownership transfer.',
      expertInfluenceClaimed: false,
    },
    exactPreserveCurrentStateUnion: futureMountain.protectedRelicVoidPolicy.union,
    relics: futureMountain.protectedRelicVoidPolicy.relics.map((relic) => ({
      relicKey: relic.relicKey,
      currentFinding: relic.currentFinding,
      disposition: relic.disposition,
      protectedCore: relic.protectedCore,
      exactOneCellMinimumPlanningExclusion:
        relic.exactOneCellMinimumPlanningExclusion,
      exactPreserveCurrentStateCellSet: relic.exactPreserveCurrentStateCellSet,
      observationAccessAuthorized: false,
    })),
    expertKernelRegistry: {
      contract: futureContract.requiredInputSchemas.influenceKernelRegistry,
      requiredClasses: [
        'structural support and settlement',
        'groundwater/infiltration and erosion',
        'entrance/fall/exhibit and emergency access',
        'construction staging/equipment sweep and restoration',
      ],
      acceptedKernelCount: 0,
      status: 'HOLD',
    },
    passCriteria: [
      'The final direct/staging/access/influence union has zero intersection with every preserve-current-state cell.',
      'Every larger expert influence kernel is finite, exact, hash-bound, owner-assigned, and accepted against D05-S01 condition evidence.',
      'Observation route candidates remain excluded unless separately designed, owned, technically accepted, and released.',
      'All 50 relevant generated starts are checked against the complete accepted construction/interaction union.',
    ],
  },
  b09B10SystemPlan: {
    status: 'EXACT_PLANNING_GEOMETRY_SELECTED_SYSTEM_ACCEPTANCE_HOLD',
    b10Mountain: {
      modelId: fm01.modelId,
      modelIdentitySha256: fm01.modelIdentitySha256,
      protectedRelicAccommodation: fm01.protectedRelicVoidAccommodation,
      materialStatePlanId: packetPolicyIdentity.materialStatePlanId,
      acceptedFutureCellCount: 0,
    },
    b09Route: {
      from: b09Endpoints.from,
      to: b09Endpoints.to,
      face: fm01.routeAccommodation.b09Funicular.face,
      throat: fm01.routeAccommodation.b09Funicular.throat,
      pointCount: fm01.routeAccommodation.b09Funicular.pointCount,
      horizontalStepCount:
        fm01.routeAccommodation.b09Funicular.horizontalStepCount,
      orderedCenterlineSha256:
        fm01.routeAccommodation.b09Funicular.orderedCenterlineSha256,
      ascendingStepCount:
        fm01.routeAccommodation.b09Funicular.ascendingStepCount,
      levelStepCount: fm01.routeAccommodation.b09Funicular.levelStepCount,
      everyStepCardinalAndRailBuildable:
        fm01.routeAccommodation.b09Funicular.everyStepCardinalAndRailBuildable,
      everyCurveLevel: fm01.routeAccommodation.b09Funicular.everyCurveLevel,
      minimumPlanningAccommodation:
        fm01.routeAccommodation.b09Funicular.minimumPlanningAccommodation,
      technicalAcceptanceClaimed: false,
    },
    stations: [
      {
        id: 'B09-LOWER-PORTAL-INTERFACE',
        anchor: b09Endpoints.from,
        exactStationCellSet: null,
        status: 'HOLD',
        requirement: 'Exact lower station, transfer, barrier, accessible route, rescue, maintenance, drainage, and owner/interface cells.',
      },
      {
        id: 'B09-EAST-LEVEL-THROAT',
        anchor: {
          x: fm01.routeAccommodation.b09Funicular.throat.x,
          y: fm01.routeAccommodation.b09Funicular.throat.y,
          z: fm01.routeAccommodation.b09Funicular.throat.z,
        },
        exactStationCellSet: null,
        status: 'HOLD',
        requirement: 'Exact level throat and any passing/turnback/maintenance function; no function is inferred from the centerline.',
      },
      {
        id: 'B09-SUMMIT-INTERFACE',
        anchor: b09Endpoints.to,
        exactStationCellSet: null,
        status: 'HOLD',
        requirement: 'Exact summit station, platform, return-road, accessible/egress, rescue, weather, drainage, and interface cells.',
      },
    ],
    interfaces: [
      {
        id: 'IF-B08-B09-PORTAL',
        planningIntersection:
          fm01.routeAccommodation.b09Funicular.b08PlanningInterfaceIntersection,
        exactAcceptedContract: null,
        status: 'HOLD',
      },
      {
        id: 'IF-B09-B10-GUIDEWAY-MOUNTAIN',
        planningReservation:
          fm01.routeAccommodation.b09Funicular.minimumPlanningAccommodation,
        exactAcceptedContract: null,
        status: 'HOLD',
      },
      {
        id: 'IF-B09-Z11-SUMMIT',
        planningAnchor: b09Endpoints.to,
        exactAcceptedContract: null,
        status: 'HOLD',
      },
      {
        id: 'IF-B09-RELIC-D06-CLEARANCE',
        protectedRelicIntersection:
          fm01.routeAccommodation.b09Funicular
            .protectedRelicPlanningExclusionIntersection,
        d06Intersection:
          fm01.routeAccommodation.b09Funicular.d06ExternalContinuationIntersection,
        exactAcceptedContract: null,
        status: 'PASS_PLANNING_INTERSECTION_ZERO_TECHNICAL_CLEARANCE_HOLD',
      },
    ],
    maintenanceAndEgress: {
      status: 'HOLD_NO_EXACT_ACCEPTED_CELLSETS',
      required: [
        'exact maintainable guideway envelope, work positions, access paths, equipment sweeps, isolation points, and restoration cells',
        'accepted accessible/egress and rescue paths from every occupied station and vehicle position to exact safe endpoints',
        'exact fire/service access, emergency lighting/communications, weather/snow/ice, drainage, fall/barrier, and failure-mode treatment',
        'bidirectional route and no-dig/no-tower acceptance criteria for later validation',
      ],
    },
    mechanisms: {
      status: 'HOLD_NO_CANONICAL_STATES_OR_COMMISSIONING_CRITERIA',
      requiredPackages: [
        'guideway/rail and structural support',
        'traction or propulsion plus fail-safe stopping/braking',
        'station stopping, platform/barrier/gate, and accessible boarding',
        'power, isolation, controls, detection, communications, and emergency operation',
        'drainage, snow/ice/weather protection, lighting, fire/service, and rescue',
      ],
      exactMechanismCellSet: null,
      exactBlockStateSet: null,
      commissioningCriteriaAccepted: false,
    },
  },
  ownershipAndInterfacePlan: {
    status: 'OWNER_ROLES_PROPOSED_EXACT_ASSIGNMENTS_AND_CONTRACTS_HOLD',
    ownerRoles,
    ownershipRegistryContract: futureContract.requiredInputSchemas.ownershipRegistry,
    interfaceContract: futureContract.requiredInputSchemas.interfaceContracts,
    rules: [
      'Every physical direct or influence cell has exactly one canonical owner.',
      'Relic and hydrology control veto uncontracted construction interaction; veto is not shared ownership.',
      'B09 subordinate scope ownership yields at accepted B10, hydrology, relic, station, and summit interfaces.',
      'Every observed cross-owner adjacency or transition matches exactly one directional contract.',
      'Bounding boxes, wildcard approvals, broad overlaps, clipping, and last-writer-wins are invalid.',
    ],
    currentDisposition: {
      exactCellAssignmentCount: 0,
      exactInterfaceContractCount: 0,
      unownedCellCount: null,
      multiplyOwnedCellCount: null,
      undeclaredInterfaceCount: null,
      accepted: false,
    },
  },
  passHoldMatrix: [
    {
      id: 'D05-OA-01-SOURCE-CHAIN',
      status: 'PASS',
      pass: 'Every packet source exists and matches its declared SHA-256.',
      hold: 'Any missing or hash-drifted source.',
    },
    {
      id: 'D05-OA-02-FM01-PLANNING-SELECTION',
      status: 'PASS',
      pass: 'The owner-delegated ledger selects FM-01/B09/B10 without claiming technical acceptance.',
      hold: 'Selection missing, ambiguous, stale, or represented as technical proof.',
    },
    {
      id: 'D05-OA-03-OWNER-ACCEPTANCE-RECORD',
      status: 'HOLD',
      pass: 'A separate non-self-issued record binds this packet SHA-256 and policy identity and selects ACCEPT_CONDITIONAL_PLANNING_POLICY.',
      hold: 'No valid separate acceptance record exists.',
    },
    {
      id: 'D05-TECH-01-CANONICAL-FUTURE-STATES',
      status: 'HOLD',
      pass: 'Every directly modelled current/future record has exact canonical states, type, owner, source design, and complete hashes.',
      hold: 'Any null state, implicit change, unclassified coordinate, or missing registry hash.',
    },
    {
      id: 'D05-TECH-02-SUPPORT-GAPS',
      status: 'HOLD',
      pass: 'All 754,224 cells reproduce the gap manifest and have exactly one accepted treatment or accepted no-change record.',
      hold: 'Any unclassified, unsupported, silently filled, or technically unaccepted gap cell.',
    },
    {
      id: 'D05-TECH-03-HYDROLOGY-GEOTECHNICAL',
      status: 'HOLD',
      pass: 'Expert criteria, finite kernels, exact fluid/cryosphere accounting, stability/support checks, and receiver contracts all pass one identity.',
      hold: 'Any missing criterion, unknown influence, undeclared change, or unaccepted receiver.',
    },
    {
      id: 'D05-TECH-04-RELIC-INFLUENCE',
      status: 'HOLD',
      pass: 'Final direct/influence sets clear the 4,890 preserve-current-state cells and accepted expert support/access kernels.',
      hold: 'Any overlap, auto-promoted observation route, missing kernel, or incomplete all-start clearance.',
    },
    {
      id: 'D05-TECH-05-B09-SYSTEM',
      status: 'HOLD',
      pass: 'Route, stations, maintenance/egress, mechanisms, rescue, drainage, owners, interfaces, and technical checks are exact and accepted.',
      hold: 'Planning centerline is the only complete B09 geometry or any system cell set remains null.',
    },
    {
      id: 'D05-TECH-06-OWNERSHIP-INTERFACES',
      status: 'HOLD',
      pass: 'Complete union has zero unowned/multiply owned cells and zero undeclared cross-owner interfaces.',
      hold: 'Any missing assignment, overlap, gap, broad contract, or unmatched interface.',
    },
    {
      id: 'D05-G02-CLOSURE',
      status: 'HOLD',
      pass: 'All D05-OA and D05-TECH rows pass against one immutable pre-R00 design identity.',
      hold: 'Any row remains HOLD; later operations or post-state evidence may not cure it.',
    },
  ],
  ownerAcceptanceRecordTemplate: {
    status: 'SEPARATE_RECORD_REQUIRED_NOT_PRESENT',
    policyIdentity: packetPolicyIdentity,
    policyIdentitySha256,
    acceptancePayload: ownerAcceptancePayload,
    acceptancePayloadSha256: ownerAcceptancePayloadSha256,
    copyableSoleOwnerAcceptanceStatement,
    requiredFields: [
      'schemaVersion',
      'id',
      'decision',
      'acceptedBy',
      'acceptedAtUtc',
      'packetPath',
      'packetSha256',
      'policyIdentitySha256',
      'acceptancePayloadSha256',
      'acceptedScope',
      'limitationsAcknowledged',
    ],
    allowedDecisions: [
      'ACCEPT_CONDITIONAL_PLANNING_POLICY',
      'RETURN_FOR_REVISION',
    ],
    acceptedScopeIfApproved: ownerAcceptedScope,
    acceptanceNeverImplies: ownerAcceptanceNeverImplies,
    currentRecord: null,
  },
  limitations: [
    'The immutable evidence is region-only and does not become a complete same-moment saved-world package through this packet.',
    'FM-01 is an analytic comparison surface, not a surveyed future terrain or engineering model.',
    'Candidate added-solid and support-gap counts are deterministic diagnostics, not quantities approved for construction.',
    'Current top-cell adjacency and D8 routing are not groundwater, infiltration, erosion, snowmelt, or Minecraft fluid simulation.',
    'Core plus one cell is a minimum planning exclusion, not an engineering buffer or access approval.',
    'The exact B09 centerline and 7,800-cell accommodation are not station, evacuation, guideway, mechanism, or commissioning design.',
    'No narrative, percentage, visual review, bounding box, or later release evidence may substitute for an exact missing pre-R00 set or acceptance.',
  ],
  disposition: {
    ownerPacketContentComplete: true,
    ownerPolicyAccepted: false,
    technicalInputsComplete: false,
    readyToCompileFutureState: false,
    readyToEmitConstructionCells: false,
    d05Resolved: false,
    r00G02Passed: false,
    autonomousOfflineTechnicalWorkMayContinue: true,
    physicalWorkMayStart: false,
  },
  safetyBoundary: {
    offlineOnly: true,
    liveCallsPerformed: [],
    operations: [],
    operationCellCount: 0,
    materialCellCount: 0,
    futureCellCount: 0,
    constructionCellCount: 0,
    worldEditAuthorized: false,
    physicalBuildAuthorized: false,
  },
};

function markdown(reportData) {
  const fm = reportData.selectedFm01PlanningBasis;
  const b09 = reportData.b09B10SystemPlan.b09Route;
  const claims = reportData.claimRegister.claims.map((item) => (
    `| ${item.id} | ${item.classification} | ${item.statement} | ${item.limitation ?? '—'} |`
  )).join('\n');
  const materials = reportData.canonicalMaterialStatePlan.stateClasses.map((item) => (
    `| ${item.id} | ${item.futureCanonicalState ?? 'HOLD / null'} | ${item.status} | ${item.qualification} |`
  )).join('\n');
  const owners = reportData.ownershipAndInterfacePlan.ownerRoles.map((item) => (
    `| ${item.ownerId} | ${item.role} | ${item.exactCellAssignmentsAccepted ? 'yes' : 'no'} |`
  )).join('\n');
  const gates = reportData.passHoldMatrix.map((item) => (
    `| ${item.id} | **${item.status}** | ${item.pass} | ${item.hold} |`
  )).join('\n');
  const sources = Object.values(reportData.sourceBindings).map((item) => (
    `| \`${item.path}\` | \`${item.sha256}\` |`
  )).join('\n');

  return `# Combined Zones D05 owner-acceptance packet

Status: **OWNER ACCEPTANCE PACKET READY — D05 AND R00 G02 HOLD — OFFLINE ONLY — ZERO FUTURE/CONSTRUCTION/OPERATION CELLS**

This is the exact human companion to the machine packet. It organizes the already selected \`${fm.modelId}\` planning basis into a conditional owner-policy decision and a fail-closed technical acceptance contract. It does **not** self-issue owner acceptance, invent expert evidence, accept a future cell, assign construction ownership, or authorize a world edit.

## Recommended owner decision

The sole owner may accept **the conditional planning policy**: keep FM-01 as the B09/B10 basis; use the deterministic material-classification method below; retain zero undeclared hydrology change, exact core-plus-one minimum exclusions, one owner per cell, and default-deny interfaces; and require every HOLD row to pass before D05 can close.

That decision does not accept the mountain, guideway, materials, support, hydrology, relic influence distances, mechanisms, or construction. A separate record must bind this packet's final SHA-256 and policy identity \`${reportData.ownerAcceptanceRecordTemplate.policyIdentitySha256}\`.

### Copyable sole-owner acceptance statement

> ${reportData.ownerAcceptanceRecordTemplate.copyableSoleOwnerAcceptanceStatement}

Acceptance-payload SHA-256: \`${reportData.ownerAcceptanceRecordTemplate.acceptancePayloadSha256}\`. Replace both bracketed fields, compute the final JSON packet SHA-256 after deterministic generation, and record the completed statement in a separate acceptance JSON. The statement is deliberately limited to the proposed planning basis and criteria; it cannot turn any technical HOLD or zero-count future/construction set into PASS.

## Bound source package

| Source | SHA-256 |
|---|---|
${sources}

The bound copied-region snapshot is \`${reportData.immutableEvidenceIdentity.snapshot.sha256}\`. It remains read-only evidence and is not promoted into a complete same-moment saved-world package.

## Facts, derivations, choices, and gaps

| Claim | Classification | Statement | Limitation |
|---|---|---|---|
${claims}

## FM-01 selected planning basis

- Model identity: \`${fm.modelIdentitySha256}\`.
- Deterministically modelled columns: **${fm.directlyModelledColumnCount.toLocaleString()}**.
- Candidate added-solid cells: **${fm.candidateAddedSolidIntervals.candidateAddedSolidCellCount.toLocaleString()}**.
- Accepted future/construction cells: **0 / 0**.
- Design surface: Y **${fm.designSurface.minimumY}…${fm.designSurface.maximumY}**.
- Support gap below the Y72 coordination floor: **${reportData.belowCoordinationSupportGapPlan.exactGap.cellCount.toLocaleString()} cells across ${reportData.belowCoordinationSupportGapPlan.exactGap.columnCount.toLocaleString()} columns**.

These are exact planning derivations, not material quantities or engineering acceptance.

## Canonical material-state plan

The plan uses one deterministic role classification, then exact canonical Minecraft states. It never randomizes a palette or treats the whole planning envelope as material.

| Class | Proposed canonical state | Current status | Qualification |
|---|---|---|---|
${materials}

The lower/upper finish split at world-study Y130 preserves architectural contrast only. It must not reintroduce the superseded natural-contact, thrust/overthrust, laccolith, “geologically honest,” or \`270 Ma\` claims. Support, liner, retaining, surface-cap, cryosphere, B09 station, and mechanism states remain null until exact technical design is accepted.

## Exact construction and influence method

1. Bind the immutable snapshot and the FM-01 formula, surface, interval, and support-gap hashes.
2. Materialize unique sorted direct records with exact before/future states and typed roles.
3. Preserve the exact 4,890-cell relic union and withhold accepted B08/B09 reservations from bulk fill.
4. Classify every support-gap interval before admitting any support or fill.
5. Author exact staging, access, equipment-sweep, and restoration cells—never an inferred width.
6. Intersect direct/staging sets with every exact current fluid and cryosphere family and component identity.
7. Expand only accepted finite expert kernels and exact directed drainage graphs.
8. Assign exactly one owner per direct or influence cell and match every cross-owner transition to one directional contract.
9. Reject unknown, duplicated, unowned, multiply owned, unmatched, stale, or implicitly changed records.

All twelve D05-S02 set families remain at **0 accepted cells**.

## The 754,224 support-gap cells

Default disposition: **HOLD**. Each cell must be assigned exactly once to accepted no-change void, engineered fill, bridge/retaining/foundation, or an FM-01 redesign. Treatment counts must sum exactly to 754,224 and reproduce \`${reportData.belowCoordinationSupportGapPlan.exactGap.intervalManifestSha256}\`.

No process may silently fill below Y72, call air/water competent support, clip influence at the coordination boundary, or replace exact classification with a percentage, bounding box, narrative radius, or visual review.

## Hydrology and geotechnical acceptance

The immutable full-height facts are water/waterlogged **${reportData.hydrologyAndGeotechnicalAcceptancePlan.boundCurrentFacts.fullHeightFamilies.water.cellCount.toLocaleString()}**, lava **${reportData.hydrologyAndGeotechnicalAcceptancePlan.boundCurrentFacts.fullHeightFamilies.lava.cellCount.toLocaleString()}**, frozen **${reportData.hydrologyAndGeotechnicalAcceptancePlan.boundCurrentFacts.fullHeightFamilies.frozen.cellCount.toLocaleString()}**, and snow **${reportData.hydrologyAndGeotechnicalAcceptancePlan.boundCurrentFacts.fullHeightFamilies.snow.cellCount.toLocaleString()}** cells. FM-01's raised columns currently touch ${fm.candidateAddedSolidIntervals.status === 'EXACT_UNMATERIALIZED_PLANNING_INTERVALS_NOT_CONSTRUCTION_CELLS' ? 'top cells classified by the bound adjacency census' : 'an unexpected state'}; this is not groundwater, infiltration, erosion, snowmelt, stability, drainage capacity, or fluid simulation.

D05 requires accepted support/load/foundation criteria, finite treatment-class kernels, exact drainage/receiver graphs, component before/after accounting, erosion/slope/retaining/snow/ice criteria, and one shared snapshot/model/state/owner/interface identity. Unknown influence is HOLD, never an empty set.

## Relic core-plus-one and expert influence

The minimum kernel is the exact one-cell Chebyshev expansion with offset hash \`${reportData.protectedRelicInfluencePlan.minimumPlanningKernel.offsetSetSha256}\`. Its three preserve-current-state sets total **${reportData.protectedRelicInfluencePlan.exactPreserveCurrentStateUnion.cellCount.toLocaleString()} cells**. This freezes a default-deny minimum only; it is not a structural, groundwater, entrance, fall, exhibit, observation, emergency-access, or construction-sweep distance.

Expert support/access kernels remain **HOLD** and must use finite exact offsets, exact seeds, boundary/component rules, owners, and interfaces. D05-S01 observation candidates are never promoted automatically.

## B09 / B10 system

- B10: FM-01 analytic mountain, accepted future cells **0**.
- B09: \`${b09.from.x},${b09.from.y},${b09.from.z}\` to \`${b09.to.x},${b09.to.y},${b09.to.z}\`, east face, **${b09.pointCount} points / ${b09.horizontalStepCount} steps**, ordered hash \`${b09.orderedCenterlineSha256}\`.
- Planning accommodation: **${b09.minimumPlanningAccommodation.cellCount.toLocaleString()} cells**; exact guideway/ownership acceptance **no**.
- Stations: lower portal, east level throat, and summit anchors are exact points only. Every station cell set remains null.
- B08/B09 planning intersection: **${reportData.b09B10SystemPlan.interfaces[0].planningIntersection.cellCount} cells**, with no accepted interface contract.
- Maintenance/egress, guideway support, barriers, power, controls, drainage/weather protection, emergency operation, rescue, and commissioning all remain HOLD.

## Proposed owner roles

| Owner | Role | Exact cell assignments accepted? |
|---|---|---:|
${owners}

Roles are proposed planning boundaries only. Exact assignments remain zero; unowned, multiply owned, and undeclared-interface counts are unknown until the complete registry and global gate run.

## Explicit PASS / HOLD matrix

| Gate | Status now | PASS only when | HOLD when |
|---|---|---|---|
${gates}

## Acceptance record boundary

A valid owner decision is a **separate**, non-self-issued JSON record with the final packet path/SHA-256, policy identity SHA-256, acceptance-payload SHA-256, decision, owner identity, timestamp, accepted scope, and acknowledged limitations. The only positive decision is \`ACCEPT_CONDITIONAL_PLANNING_POLICY\`. Even that leaves D05 and R00 G02 on HOLD until every technical row passes.

## Safety boundary

No live system was contacted. Future, construction, material, and operation cell counts are all **0**. No physical work, release, or world edit is authorized.
`;
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown(report));

console.log(JSON.stringify({
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  status: report.status,
  selectedModelId: report.selectedFm01PlanningBasis.modelId,
  candidateAddedSolidCellCount:
    report.selectedFm01PlanningBasis.candidateAddedSolidIntervals.candidateAddedSolidCellCount,
  supportGapCellCount: report.belowCoordinationSupportGapPlan.exactGap.cellCount,
  protectedRelicCellCount:
    report.protectedRelicInfluencePlan.exactPreserveCurrentStateUnion.cellCount,
  b09PointCount: report.b09B10SystemPlan.b09Route.pointCount,
  ownerAcceptanceRecorded: report.ownerAcceptanceRecorded,
  futureCellCount: report.futureCellCount,
  operationCellCount: report.operationCellCount,
  worldEditAuthorized: report.worldEditAuthorized,
}, null, 2));
