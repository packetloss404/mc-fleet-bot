#!/usr/bin/env node
/**
 * Compile the smallest evidence-backed external review handoff for Combined
 * Zones G02/G07. This is a read-only decision-input packet: it cannot issue
 * technical acceptance, owner acceptance, operations, or world-edit authority.
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

const GENERATED_AT = value('--generated-at', '2026-08-06T22:05:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-g02-g07-minimal-review-packet.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-g02-g07-minimal-review-packet.md',
));

const INPUTS = Object.freeze({
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  planningAcceptance: 'docs/masterplans/05-combined-zones/phase1-owner-review-acceptance.json',
  completeSave: 'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T014133Z.json',
  completeSaveScope: 'docs/masterplans/05-combined-zones/phase1-g06-complete-save-scope-clearance-20260806T014133Z.json',
  technicalRefresh: 'docs/masterplans/05-combined-zones/phase1-technical-source-refresh.json',
  composite: 'docs/masterplans/05-combined-zones/phase1-shipwreck-canonical-integration-overlay.json',
  candidateClosure: 'docs/masterplans/05-combined-zones/phase1-r00-candidate-closure.json',
  registry: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  d02Owner: 'docs/masterplans/05-combined-zones/phase1-d02-owner-acceptance-packet.json',
  d02Region: 'docs/masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.json',
  d05Owner: 'docs/masterplans/05-combined-zones/phase1-d05-owner-acceptance-packet.json',
  b09: 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  d06Owner: 'docs/masterplans/05-combined-zones/phase1-d06-owner-acceptance-packet.json',
  d06Detailed: 'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
  d06BeeRuntime: 'docs/masterplans/05-combined-zones/phase1-d06-bee-runtime-compatibility-audit.json',
  b11: 'docs/masterplans/05-combined-zones/phase1-b11-surface-road-technical-proposal.json',
  b12: 'docs/masterplans/05-combined-zones/phase1-grand-avenue-passive-shell-candidate.json',
  externalAcceptance: 'docs/masterplans/05-combined-zones/phase1-external-acceptance-submissions.json',
});

const ROLES = Object.freeze({
  releaseContract: 'authoritative pre-R00 design versus post-release evidence boundary',
  planningAcceptance: 'sole-owner planning acceptance; no technical hold passed',
  completeSave: 'accepted immutable complete same-moment save',
  completeSaveScope: 'source-equivalent proposal-domain all-start, entity, and POI census',
  technicalRefresh: 'additive closure of five stale source rows and commissioning-stage correction',
  composite: 'canonical shipwreck overlay and exact physical-clearance evidence',
  candidateClosure: 'read-only residual owner/interface and endpoint worklist',
  registry: 'proposal-only owner and directional interface registry',
  d02Owner: 'D02 classified technical acceptance criteria',
  d02Region: 'D02/C01 block-state facts with ISSUE-002 semantic hold',
  d05Owner: 'D05 technical pass/hold matrix',
  b09: 'B09 exact proposal and genuine residual systems',
  d06Owner: 'D06 life-safety acceptance criteria',
  d06Detailed: 'D06 detailed setout and remaining mechanism systems',
  d06BeeRuntime: 'exact-runtime bee relocation compatibility evidence',
  b11: 'P1-B11 exact road setout and retained technical holds',
  b12: 'P1-B12 no-build/no-foreclosure passive-shell candidate',
  externalAcceptance: 'EXT-01..04 sole-owner acceptance submissions',
});

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function canonicalJson(input) {
  if (input === null || typeof input !== 'object') return JSON.stringify(input);
  if (Array.isArray(input)) return `[${input.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(input).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalJson(input[key])}`
  )).join(',')}}`;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function binding(relativePath, role) {
  const data = fs.readFileSync(absolute(relativePath));
  return { path: relativePath, sha256: sha256(data), bytes: data.length, role };
}

function invariant(condition, message) {
  if (!condition) throw new Error(`G02/G07 minimal review packet rejected: ${message}`);
}

const inputs = Object.fromEntries(
  Object.entries(INPUTS).map(([key, filename]) => [key, readJson(filename)]),
);
const sourceBindings = Object.fromEntries(
  Object.entries(INPUTS).map(([key, filename]) => [key, binding(filename, ROLES[key])]),
);

const completeSaveSha256 = inputs.completeSave.packageIdentity?.completeSaveSha256;
const compositeCanonicalPayloadSha256 =
  inputs.composite.compositeCanonicalModel?.compositeCanonicalPayloadSha256;
const contracts = inputs.registry.proposedDirectionalInterfaceRegistry?.contracts ?? [];
const ownerRecordCount = inputs.registry.proposedOwnerRegistry?.proposedOwnerRecordCount;
const nullEndpointContractIds = inputs.candidateClosure.unresolved
  .find(({ id }) => id === 'R00-CLOSURE-NULL-ENDPOINT-GEOMETRY')?.contractIds ?? [];

invariant(inputs.releaseContract.decisionResolutionBoundary?.g02Closure
  === 'PRE_R00_DESIGN_ACCEPTANCE_ONLY', 'G02 decision boundary drift');
invariant(inputs.releaseContract.decisionResolutionBoundary
  ?.descendantReleaseEvidenceMayResolveG02 === false,
  'descendant evidence unexpectedly allowed to resolve G02');
invariant(inputs.planningAcceptance.effectivePlanningDisposition
  ?.remainingGeometryChoiceCount === 0, 'planning choices are no longer complete');
invariant(inputs.planningAcceptance.effectivePlanningDisposition
  ?.technicalHoldPassedCount === 0, 'planning acceptance unexpectedly passed a technical hold');
invariant(inputs.completeSave.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
  'complete-save status drift');
invariant(inputs.completeSaveScope.completeSaveScopeEvidence
  ?.completeSaveEvidenceEstablished === true, 'complete-save scoped evidence drift');
invariant(inputs.technicalRefresh.summary?.staleSourceRowPassCount === 5,
  'technical source refresh count drift');
invariant(inputs.technicalRefresh.summary?.commissioningSpecificationCount === 29,
  'D06 commissioning specification count drift');
invariant(inputs.technicalRefresh.summary?.commissioningExecutedResultCount === 0,
  'unexpected pre-release commissioning results appeared');
invariant(inputs.composite.compositeCanonicalModel?.immutableBaselineRewritten === false,
  'shipwreck integration rewrote the immutable baseline');
invariant(inputs.candidateClosure.summary?.totalInterfaceContractCount === 161,
  'candidate interface count drift');
invariant(inputs.candidateClosure.summary?.acceptedContractCount === 0,
  'candidate interface registry unexpectedly accepted');
invariant(contracts.length === 161, 'registry contract count drift');
invariant(ownerRecordCount === 27, 'owner record count drift');
invariant(nullEndpointContractIds.length === 13, 'null endpoint count drift');
invariant(inputs.d02Region.d02S02?.status
  === 'PARTIAL_PASS_REGION_INTERFACE_FACTS_ISSUE_002_REMAINS_OPEN',
  'D02 ISSUE-002 evidence status drift');
invariant(inputs.d06BeeRuntime.conclusion?.isolatedRuntimeMechanicProven === false,
  'D06 real-client mechanic is no longer unresolved');
invariant(inputs.b12.decision?.constructNow === false
  && inputs.b12.decision?.retainNoForeclosureReservation === true,
  'P1-B12 minimum-scope decision basis drift');
invariant(inputs.b12.authorityBoundary?.thisCandidateAcceptedByOwner === false,
  'P1-B12 candidate unexpectedly owner-accepted');

const reviewSubmissions = [
  {
    id: 'EXT-01-CIVIL-CORRIDOR',
    title: 'D02/C01 and P1-B11 civil, hydraulic, structural, and geotechnical review',
    status: 'NOT_SUPPLIED_EXTERNAL_FACTS_AND_ACCEPTANCE_REQUIRED',
    missingFactEvidence: [
      {
        id: 'FACT-ISSUE-002-C01-SEMANTIC-FIELD-DISPOSITION',
        requirement: 'A current, hash-bound field/semantic survey must identify the C01 relocation, road, parking recovery, sunken entrance, protection/loading constraints, owner, and usable interfaces. Existing block-state volumes are not semantic proof.',
        suppliedArtifactPath: null,
        suppliedArtifactSha256: null,
      },
    ],
    criteriaToResolve: [
      'D02-B01', 'D02-B02', 'D02-B03', 'D02-B04', 'D02-B06',
      'P1-B11-H01-MATERIAL-AND-FUTURE-STATE',
      'P1-B11-H02-EARTHWORK-AND-RETAINING',
      'P1-B11-H03-DRAINAGE',
      'P1-B11-H04-UTILITIES',
      'P1-B11-H05-STRUCTURAL-AND-ROAD-LOAD',
      'P1-B11-H06-GEOTECHNICAL',
      'P1-B11-H08-OWNERSHIP-INTERFACES-AND-TECHNICAL-ACCEPTANCE',
    ],
    requiredDesignFacts: [
      'Exact D02 catchments, source/future fluid manifests, peak blocks-per-tick, evaluation ticks, working storage, freeboard, recovery reserve, alarms, failure/reset states, and accepted receiver/outfall or explicit sealed no-receiver disposition.',
      'Exact formation, slopes, excavation, fill, structures, voids, materials, quantities, mass haul, retaining, foundations, spans, loading, clearances, C01/Data District exclusions, and construction influence.',
      'P1-B11 exact material/future states, earthwork/retaining, drainage, dry/wet utility services, crossings/separations, structural road-load transfer, and geotechnical basis.',
    ],
    nullEndpointContractIds: nullEndpointContractIds.filter((id) => (
      id.startsWith('IF-D02-') || id.startsWith('IF-P1-B11-')
    )),
    submission: {
      reviewerIdentity: null,
      competenceScope: null,
      reviewedArtifactHashes: [],
      acceptedCriterionIds: [],
      exceptions: [],
      decision: null,
      reviewedAtUtc: null,
      reviewRecordSha256: null,
    },
  },
  {
    id: 'EXT-02-MOUNTAIN-B09-PROTECTED',
    title: 'D05 mountain, P1-B09 funicular, and protected-relic review',
    status: 'NOT_SUPPLIED_EXTERNAL_DESIGN_AND_ACCEPTANCE_REQUIRED',
    missingFactEvidence: [],
    criteriaToResolve: [
      'D05-TECH-01-CANONICAL-FUTURE-STATES',
      'D05-TECH-02-SUPPORT-GAPS',
      'D05-TECH-03-HYDROLOGY-GEOTECHNICAL',
      'D05-TECH-04-RELIC-INFLUENCE',
      'D05-TECH-05-B09-SYSTEM',
      'D05-TECH-06-OWNERSHIP-INTERFACES',
      ...inputs.b09.genuineResidualBlockers
        .filter(({ id }) => id !== 'B09-NULL-08-COMPLETE-SAVE-ALL-START-ENTITY-POI-GATE')
        .map(({ id }) => id),
    ],
    requiredDesignFacts: [
      'Every directly modelled D05 current/future state and all 754,224 support-gap cells need one accepted treatment or accepted no-change record.',
      'Finite hydrology, cryosphere, geotechnical, stability/support, receiver, maintenance, staging, equipment, restoration, and construction-influence sets.',
      'Independent positive-margin treatment for all three protected relics; the exact shipwreck reshape is integrated but does not supply expert acceptance.',
      'P1-B09 liner/foundation/support; drive/brake/vehicle/barrier; refuge/passing/rescue; normal/emergency power and controls; drainage/outfall; D05 support seam; and D06 protected-egress receiver.',
    ],
    nullEndpointContractIds: nullEndpointContractIds.filter((id) => id.startsWith('IF-D05-')),
    submission: {
      reviewerIdentity: null,
      competenceScope: null,
      reviewedArtifactHashes: [],
      acceptedCriterionIds: [],
      exceptions: [],
      decision: null,
      reviewedAtUtc: null,
      reviewRecordSha256: null,
    },
  },
  {
    id: 'EXT-03-D06-LIFE-SAFETY-RUNTIME',
    title: 'D06 life safety, mechanisms, utilities, and occupied-bee treatment review',
    status: 'NOT_SUPPLIED_EXTERNAL_FACTS_DESIGN_AND_ACCEPTANCE_REQUIRED',
    missingFactEvidence: [
      {
        id: 'FACT-D06-REAL-CLIENT-BEE-RELOCATION-E2E',
        requirement: 'A version-matched real client or independently repaired protocol path must prove break, intact transport, placement, minecraft:bees preservation, habitat/access disposition, and guarded rollback design. The test must be non-production unless separately authorized.',
        suppliedArtifactPath: null,
        suppliedArtifactSha256: null,
      },
    ],
    criteriaToResolve: [
      'D06-AC-03', 'D06-AC-04', 'D06-AC-05', 'D06-AC-06',
      'D06-AC-07', 'D06-AC-08', 'D06-AC-09', 'D06-AC-10', 'D06-AC-11',
      ...inputs.d06Detailed.genuineResidualBlockers.map(({ id }) => id),
    ],
    requiredDesignFacts: [
      'Exact independent protected egress and accessible routes to accepted safe endpoints, refuge/rescue behavior, smoke compartments, vent outlets, barriers, and emergency-service approach.',
      'Actual mechanism states, manual release, controls, failure/reset logic, normal and two genuinely independent emergency circuits/sources, transfer logic, loads, coverage, and common-cause proof.',
      'Exact drainage catchments, storage, freeboard, pump/control states, recovery, outfall/receiver; plus structural, lining, foundation, penetration, material, and construction-influence states.',
      'Freeze and independently accept all 29 commissioning specifications before G02; do not require executed commissioning results until post-release G17.',
    ],
    nullEndpointContractIds: nullEndpointContractIds.filter((id) => id.startsWith('IF-D06-')),
    submission: {
      reviewerIdentity: null,
      competenceScope: null,
      reviewedArtifactHashes: [],
      acceptedCriterionIds: [],
      exceptions: [],
      decision: null,
      reviewedAtUtc: null,
      reviewRecordSha256: null,
    },
  },
];

const submissionsRecorded = inputs.externalAcceptance.status
  === 'EXT_01_04_ACCEPTED_BY_SOLE_OWNER_DIRECTIVE';

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-g02-g07-minimal-review-packet',
  generatedAtUtc: GENERATED_AT,
  status: submissionsRecorded
    ? 'MINIMAL_REVIEW_PACKET_SUBMISSIONS_RECORDED_BY_SOLE_OWNER_ACCEPTANCE'
    : 'MINIMAL_EXTERNAL_REVIEW_PACKET_READY_G02_G07_HOLD_NO_ACCEPTANCE_CLAIMED',
  submissionResolution: submissionsRecorded ? {
    resolvedBy: 'docs/masterplans/05-combined-zones/phase1-external-acceptance-submissions.json',
    externalAcceptanceReportIdentitySha256: inputs.externalAcceptance.reportIdentitySha256,
    independentThirdPartyReview: false,
    soleOwnerAcceptance: true,
    note: 'The four requested submissions resolve as sole-owner acceptances of the conservative planning bases; the packet template below is retained unchanged as the original request record.',
  } : null,
  purpose: 'Provide the smallest legitimate, hash-bound decision-input path for G02/G07 without repeating accepted planning choices or using forbidden release evidence.',
  sourceBindings,
  immutableReviewBasis: {
    completeSaveSha256,
    completeSaveInventorySha256: inputs.completeSave.packageIdentity.canonicalInventorySha256,
    compositeCanonicalPayloadSha256,
    planningAcceptanceRecordPayloadSha256: inputs.planningAcceptance.acceptanceRecordPayloadSha256,
    technicalSourceRefreshReportIdentitySha256: inputs.technicalRefresh.reportIdentitySha256,
    proposedRegistrySha256: sourceBindings.registry.sha256,
    proposedInterfaceContractCount: contracts.length,
    proposedOwnerRecordCount: ownerRecordCount,
  },
  alreadyResolvedDoNotRepeat: {
    planningGeometryChoiceCountRemaining: 0,
    exactCompleteSaveAccepted: true,
    staleSourceRowsClosed: 5,
    exactShipwreckCompositeIntegrated: true,
    repeatedSubjectivePlanningReviewRequired: false,
    preflightOrPostStateEvidenceMayResolveG02: false,
  },
  minimumScopeDecision: {
    id: 'OWNER-SCOPE-P1-B12-DEFER-NOW',
    status: 'OWNER_CONFIRMATION_REQUIRED_NOT_ACCEPTED_BY_THIS_PACKET',
    recommendedDecision: 'DEFER_P1_B12_PHYSICAL_SHELL_RETAIN_NO_FORECLOSURE_RESERVATION',
    existingCandidateFacts: {
      constructNow: inputs.b12.decision.constructNow,
      fitOutNow: inputs.b12.decision.fitOutNow,
      retainNoForeclosureReservation: inputs.b12.decision.retainNoForeclosureReservation,
      candidateAcceptedByOwner: inputs.b12.authorityBoundary.thisCandidateAcceptedByOwner,
    },
    rationale: 'This follows the existing default-deny candidate and avoids engineering or commissioning an unapproved speculative shell while preserving the future corridor.',
    downstreamRule: 'After owner confirmation, regenerate the proposed ownership/interface registry for the reduced physical scope. Remove obsolete B12 construction-state contracts or encode exact sealed/no-change reservation transitions; never waive a contract silently.',
    ownerDecision: null,
    ownerIdentity: null,
    decidedAtUtc: null,
    decisionRecordSha256: null,
  },
  externalReviewSubmissions: reviewSubmissions,
  finalOwnerAcceptanceRecord: {
    id: 'EXT-04-OWNER-INTEGRATED-ACCEPTANCE',
    status: 'NOT_SUPPLIED_EXTERNAL_OWNER_DECISION_REQUIRED_AFTER_EXT_01_THROUGH_EXT_03',
    prerequisites: reviewSubmissions.map(({ id }) => `${id}:ACCEPT`),
    ownerIdentity: null,
    packetPayloadSha256: null,
    acceptedTechnicalIdentitySha256: null,
    acceptedOwnershipRegistrySha256: null,
    acceptedInterfaceRegistrySha256: null,
    acceptedCompleteSaveSha256: null,
    acceptedCompositeCanonicalPayloadSha256: null,
    p1B12Decision: null,
    exceptions: [],
    decision: null,
    statement: null,
    decidedAtUtc: null,
    acceptanceRecordSha256: null,
  },
  deterministicOfflineClosureAfterExternalInputs: [
    'Validate every submission hash, reviewer identity, competence scope, criterion coverage, exception, and explicit ACCEPT/REJECT decision.',
    'Compile one immutable accepted technical identity and the reduced-scope exact one-owner/directional-interface registry; derive complete before/future transition manifests from the accepted save and accepted design.',
    'Rerun the G05 global exact interface gate and G06 protected-feature/entity/POI clearance against the same technical identity.',
    'Rerun the integrated G07 audit, then R00, without treating operations, preflight, execution, rollback, route QA, or post-state QA as G02 evidence.',
  ],
  summary: {
    externalSubmissionCount: 4,
    disciplineReviewSubmissionCount: 3,
    finalOwnerRecordCount: 1,
    separateMissingFactEvidenceCount: reviewSubmissions
      .reduce((sum, item) => sum + item.missingFactEvidence.length, 0),
    nullEndpointContractCount: nullEndpointContractIds.length,
    proposedInterfaceContractCount: contracts.length,
    proposedOwnerRecordCount: ownerRecordCount,
    commissioningSpecificationCountToFreezeAndAccept: 29,
    commissioningExecutedResultCountRequiredForG02: 0,
    b12FullTechnicalReviewAvoidedByRecommendedDeferral: true,
    submissionsRecordedBySoleOwnerAcceptance: submissionsRecorded,
    buildAuthorized: false,
    worldEditAuthorized: false,
  },
  safetyBoundary: {
    readOnly: true,
    operationCount: 0,
    productionContacted: false,
    rconContacted: false,
    fleetApiContacted: false,
    systemdContacted: false,
    acceptanceClaimed: false,
    reviewerIdentityFabricated: false,
    worldEditAuthorized: false,
    physicalBuildAuthorized: false,
  },
  disposition: submissionsRecorded
    ? 'EXT-01 through EXT-04 are recorded as sole-owner acceptances under the build-ready directive; gate results now live in the refreshed R00 readiness audit. Build and world-edit authority remain separate release-stage decisions.'
    : 'Obtain EXT-01 through EXT-03 from competent independent reviewers, then obtain one hash-bound EXT-04 sole-owner decision. Until then G02, G07, R00, build, and world-edit authority remain HOLD.',
};

report.packetPayloadSha256 = sha256(`${canonicalJson(report)}\n`);
report.finalOwnerAcceptanceRecord.packetPayloadSha256 = report.packetPayloadSha256;
report.reportIdentitySha256 = sha256(`${canonicalJson(report)}\n`);

const criteriaCount = reviewSubmissions.reduce(
  (sum, submission) => sum + submission.criteriaToResolve.length,
  0,
);
const markdown = `# Combined Zones G02/G07 Minimal Review Packet

Status: **${report.status}**

This is the smallest defensible external handoff found in the existing evidence. It is read-only and does not accept a design, authorize a build, or contact production.

## Efficient scope choice

Confirm **${report.minimumScopeDecision.recommendedDecision}**. P1-B12 is already modelled as \`constructNow: false\` with a retained no-foreclosure reservation, but that candidate is not owner-accepted. Confirming it avoids full shell engineering now. The reduced-scope registry must still be regenerated exactly; no interface may disappear silently.

No new subjective geometry/style review is needed. The planning record reports zero remaining geometry choices, the complete save is accepted, five stale source rows are closed, and the shipwreck composite is integrated exactly.

## Four external submissions

### EXT-01 — Civil corridor

Independent civil/hydraulic/structural/geotechnical facts and acceptance for D02/C01 and P1-B11. This includes a semantic/field resolution of ISSUE-002; current block-state volumes alone do not prove relocation, road, parking recovery, entrance, ownership, loading, or usability.

### EXT-02 — Mountain, funicular, protected features

Independent D05/B09 design and acceptance: all future states and support-gap treatments, finite hydrology/geotechnical kernels, positive protected-relic margins, and the seven remaining B09 systems.

### EXT-03 — D06 life safety and runtime

Independent D06 design and acceptance for egress, accessibility, smoke/vent, barriers, power redundancy, drainage, fire/service, structure/materials, and the occupied bee-nest treatment. Supply a version-matched real-client end-to-end relocation proof. Freeze and accept the **29 commissioning specifications** now; executed results belong to post-release G17, not G02.

### EXT-04 — Integrated owner record

After EXT-01 through EXT-03 accept, the sole owner binds this packet, the final technical identity, the reduced-scope owner/interface registries, the complete save, the shipwreck composite, and the P1-B12 deferral decision. Every acceptance field in this packet is currently null.

## Exact remaining evidence

- External submissions: **4** (3 discipline reviews + 1 final owner record).
- Separate missing fact records inside those reviews: **${report.summary.separateMissingFactEvidenceCount}** (ISSUE-002 field/semantic disposition and D06 real-client bee relocation proof).
- Technical criterion references grouped for review: **${criteriaCount}**.
- Missing exact endpoint geometries: **${report.summary.nullEndpointContractCount}** (6 civil corridor, 1 D05, 6 D06).
- Proposal registry: **${contracts.length}** directional contracts and **${ownerRecordCount}** owner records, currently unaccepted.

## After valid submissions

The remaining work is deterministic and offline: validate the review records, compile one accepted reduced-scope technical/owner/interface identity, rerun G05/G06, rerun integrated G07, then rerun R00.

${submissionsRecorded ? '- Submissions: **RECORDED** as sole-owner acceptances (see the external-acceptance record and refreshed R00 audit for gate results).' : '- G02: **HOLD**\n- G07: **HOLD**\n- R00: **HOLD**'}
- Build authorized: **NO**
- World edits authorized: **NO**
- Packet payload: \`${report.packetPayloadSha256}\`
- Report identity: \`${report.reportIdentitySha256}\`
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);
console.log(JSON.stringify({
  status: report.status,
  packetPayloadSha256: report.packetPayloadSha256,
  reportIdentitySha256: report.reportIdentitySha256,
  summary: report.summary,
  out: OUTPUT,
  markdown: MARKDOWN,
}, null, 2));
