#!/usr/bin/env node
/**
 * Record owner-delegated autonomous Phase 1 design selections.
 *
 * This is a planning authority ledger. It binds prior offline recommendation
 * packets, adopts only choices that those packets mark ready, and emits no
 * Minecraft operations or technical/expert acceptance.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-04T22:10:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-autonomous-design-selections.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-autonomous-design-selections.md',
));

const INPUTS = Object.freeze({
  d02: 'docs/masterplans/05-combined-zones/phase1-d02-civil-authority-packet.json',
  d02RegionEvidence: 'docs/masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.json',
  d02ClosedDrainage: 'docs/masterplans/05-combined-zones/phase1-d02-s04-closed-drainage-alternatives.json',
  d05: 'docs/masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
  d05RelicSurvey: 'docs/masterplans/05-combined-zones/phase1-d05-relic-condition-access-survey.json',
  d05FutureMountain: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  d06: 'docs/masterplans/05-combined-zones/phase1-d06-egress-geometry-design.json',
  d06LifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  connectorGeometry: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  cheyenneJcurve: 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
});

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function binding(relativePath, role) {
  const data = fs.readFileSync(path.join(ROOT, relativePath));
  return { path: relativePath, sha256: sha256(data), bytes: data.length, role };
}

const d02 = readJson(INPUTS.d02);
const d02RegionEvidence = readJson(INPUTS.d02RegionEvidence);
const d02ClosedDrainage = readJson(INPUTS.d02ClosedDrainage);
const d05 = readJson(INPUTS.d05);
const d05RelicSurvey = readJson(INPUTS.d05RelicSurvey);
const d05FutureMountain = readJson(INPUTS.d05FutureMountain);
const d06 = readJson(INPUTS.d06);
const d06LifeSafety = readJson(INPUTS.d06LifeSafety);
const connectorGeometry = readJson(INPUTS.connectorGeometry);
const cheyenneJcurve = readJson(INPUTS.cheyenneJcurve);

const d02B05 = d02.recommendations.find(({ blockerId }) => blockerId === 'D02-B05');
const readyGeometry = d06.soleAuthorityRecommendations.geometry.filter(
  ({ disposition }) => disposition === 'READY_FOR_SOLE_AUTHORITY_ACCEPTANCE',
);
if (d02B05?.readiness !== 'READY_FOR_SOLE_AUTHORITY_VISUAL_ACCEPTANCE_FROM_CURRENT_EVIDENCE') {
  throw new Error('D02-B05 is not ready for delegated selection');
}
if (JSON.stringify(readyGeometry.map(({ blockerId }) => blockerId)) !== JSON.stringify([
  'P1-B01-VERTICAL-AUTHORITY-ACTIVATION',
  'P1-B02-CHEYENNE-INTERNAL-FIT',
  'P1-B04-SUBTROPOLIS-NORMALIZATION',
  'P1-B05-SUBTROPOLIS-PILLARS',
  'P1-B06-HOUSTON-GENERIC-PLACEMENT',
])) {
  throw new Error('ready geometry selection set drift');
}
if (!d06.egressDesigns.every(({ designGate }) => designGate.status.startsWith('PASS_'))) {
  throw new Error('D06 surface endpoints are not ready for delegated selection');
}
if (d02RegionEvidence.status !== 'PARTIAL_PASS_REGION_FACTS_COMPLETE_SAVE_MISSING_D02_HOLD') {
  throw new Error('D02 S01/S02 region evidence status drift');
}
if (d05RelicSurvey.status !== 'D05_S01_OFFLINE_SURVEY_COMPLETE_D05_G06_HOLD') {
  throw new Error('D05 S01 relic survey status drift');
}
if (connectorGeometry.serviceTunnelCenterline?.status
    !== 'PARTIAL_PASS_EXACT_RAIL_BUILDABLE_CANDIDATE_B08_REVIEW_HOLD'
  || connectorGeometry.serviceTunnelCenterline?.railConstraintAudit
    ?.everyStepCardinalAndRailBuildable !== true
  || connectorGeometry.serviceTunnelCenterline?.snapshotAndIntersectionAudit
    ?.generatedStructureExcavationIntersections?.length !== 0) {
  throw new Error('B08 connector candidate is not ready for delegated route selection');
}
if (d02ClosedDrainage.status
    !== 'PARTIAL_PASS_PREFERRED_CLOSED_SUMP_PLANNING_GEOMETRY_D02_HOLD'
  || d02ClosedDrainage.preferredPlanningAlternative?.alternativeId
    !== 'ALT-D02-S04-D-HYBRID-CAPPED-SUMPS-WITH-AQUATIC-NO-BUILD-HOLD') {
  throw new Error('D02 closed-drainage recommendation is not ready for delegated selection');
}
if (d05FutureMountain.status
    !== 'PARTIAL_PASS_EXACT_FUTURE_MOUNTAIN_ALTERNATIVES_RECOMMENDATION_ONLY_D05_G02_HOLD'
  || d05FutureMountain.b09FaceComparison?.recommendedAlternativeId
    !== 'FM-01-COMPACT-EAST-FACE'
  || d05FutureMountain.b09FaceComparison?.selectedAlternativeId !== null) {
  throw new Error('D05/B09/B10 recommendation is not ready for delegated selection');
}
if (d06LifeSafety.status
    !== 'PARTIAL_PASS_FAIL_CLOSED_B07_D06_ALTERNATIVES_FROZEN_ALL_RELEASE_AND_COMMISSIONING_HOLD'
  || d06LifeSafety.b07PublicShaftTransfer?.recommendedCandidateId !== 'B07-C-WEST-2'
  || d06LifeSafety.overallDisposition?.recommendationsRequireSoleAuthorityAcceptance !== true) {
  throw new Error('D06/B07 recommendations are not ready for delegated selection');
}
if (cheyenneJcurve.status
    !== 'PARTIAL_PASS_EXACT_JCURVE_PLANNING_GEOMETRY_P1_B03_TECHNICAL_HOLD'
  || cheyenneJcurve.readiness?.exactIntegerCenterline !== 'PASS_PLANNING_GEOMETRY'
  || cheyenneJcurve.readiness?.p1B03Resolved !== false) {
  throw new Error('B03 J-curve recommendation is not ready for delegated selection');
}

const selections = [
  {
    id: 'SEL-D02-B05-C1-RASTER',
    scope: 'D02-B05',
    selection: d02B05.recommendedSoleAuthorityDefault,
    effect: 'The exact R140/R120/R140 raster controls C1 alignment; the staircase rhythm is non-controlling visual detail.',
    technicalAcceptanceClaimed: false,
  },
  {
    id: 'SEL-D05-RELIC-MINIMUM-EXCLUSION',
    scope: 'D05-buffer-policy',
    selection: 'Adopt CZ05-RELIC-MINIMUM-PLANNING-EXCLUSION-V1 as the default-deny planning exclusion for all three recorded relic sites.',
    effect: 'Core plus exact one-cell shell is frozen as a minimum planning exclusion, never represented as an engineering buffer.',
    technicalAcceptanceClaimed: false,
  },
  {
    id: 'SEL-D05-EAST-IGLOO-DISPOSITION',
    scope: 'D05-east-igloo',
    selection: d05.soleAuthorityRecommendations.eastIglooDisposition.recommendation,
    effect: 'The absent-fabric recorded site remains reserved in place; no reconstruction, relocation, removal, access, or reuse is authorized.',
    technicalAcceptanceClaimed: false,
  },
  {
    id: 'SEL-D05-LOGICAL-CONTROL-MODEL',
    scope: 'D05-ownership-interfaces',
    selection: 'Adopt the three proposed logical control roles and fail-closed interface rules as the design-control model.',
    effect: 'This selects role boundaries only; exact construction-cell ownership remains unfrozen and unauthorized.',
    technicalAcceptanceClaimed: false,
  },
  {
    id: 'SEL-D05-FUTURE-STATE-SCHEMA',
    scope: 'D05-future-model',
    selection: 'Require the proposed exact-set future terrain and influence schema before D05 can close.',
    effect: 'The schema is selected; no future-state or influence cellset is yet accepted.',
    technicalAcceptanceClaimed: false,
  },
  {
    id: 'SEL-D05-ZERO-UNDECLARED-CHANGE',
    scope: 'D05-preservation',
    selection: d05.soleAuthorityRecommendations.preservationAndNoDiversionCriteria.recommendation,
    effect: 'Zero undeclared hydrology/cryosphere change and default no-diversion become binding design criteria.',
    technicalAcceptanceClaimed: false,
  },
  {
    id: 'SEL-D06-TWO-EGRESS-ENDPOINTS',
    scope: 'D06-egress',
    selection: d06.soleAuthorityRecommendations.d06.egressSelection,
    effect: 'The two exact disjoint 7x7 cores and surveyed landings are the D06 external egress basis; openings remain sealed.',
    technicalAcceptanceClaimed: false,
  },
  {
    id: 'SEL-D06-LIFE-SAFETY-BASIS',
    scope: 'D06-systems',
    selection: 'Adopt every D06 system recommendation in the bound egress/geometry packet as the design basis.',
    effect: 'Stairs/lifts, independent compartments/outlets, emergency circuits, barriers, capped drainage, service access, and sealed interfaces are selected as requirements; mechanism cellsets and commissioning remain open.',
    technicalAcceptanceClaimed: false,
  },
  {
    id: 'SEL-P1-B08-SERVICE-TUNNEL-CENTERLINE',
    scope: 'P1-B08-SERVICE-TUNNEL-CENTERLINE',
    selection: connectorGeometry.serviceTunnelCenterline.selection,
    effect: 'The exact 220-step east-ramp, north-level-contact, east-level route and declared 6x6 bias control later ownership and technical design; lining, drainage, escape, source, and commissioning remain open.',
    technicalAcceptanceClaimed: false,
  },
  {
    id: 'SEL-D02-S04-CLOSED-DRAINAGE',
    scope: 'D02-S04-closed-drainage',
    selection: d02ClosedDrainage.preferredPlanningAlternative.alternativeId,
    effect: 'Ten strict-clear capped sump candidates are the planning basis; water-interacting ROAD-LOW-001 remains an explicit no-build hold and no receiver/outfall is selected.',
    technicalAcceptanceClaimed: false,
  },
  {
    id: 'SEL-P1-B03-CHEYENNE-JCURVE',
    scope: 'P1-B03-CHEYENNE-JCURVE',
    selection: cheyenneJcurve.authorityBoundary.selectedPlanningBasis,
    effect: 'The exact 800-step east-north-west two-bend baffle controls later ownership and technical design; all lining, drainage, utilities, egress, and future-mountain acceptance remains open.',
    technicalAcceptanceClaimed: false,
  },
  {
    id: 'SEL-P1-B07-PUBLIC-SHAFT-DOGLEG',
    scope: 'P1-B07-PUBLIC-SHAFT-DOGLEG',
    selection: `Adopt ${d06LifeSafety.b07PublicShaftTransfer.recommendedCandidateId} as the exact public-shaft planning centerline and interaction envelope.`,
    effect: 'The two-block west dogleg is the planning basis because its excavation and interaction sets clear the mineshaft bound; fluid, mechanism, structural, smoke, drainage, and egress acceptance remains open.',
    technicalAcceptanceClaimed: false,
  },
  {
    id: 'SEL-P1-B09-FUNICULAR-CENTERLINE',
    scope: 'P1-B09-FUNICULAR-CENTERLINE',
    selection: 'FM-01-COMPACT-EAST-FACE exact B09 centerline and route shell',
    effect: 'The east-face cardinal rail candidate controls later planning; maintenance/egress, station, mechanism, hydrology, support, ownership, and interface acceptance remains open.',
    technicalAcceptanceClaimed: false,
  },
  {
    id: 'SEL-P1-B10-MOUNTAIN-SOLID-AND-RELIC-VOIDS',
    scope: 'P1-B10-MOUNTAIN-SOLID-AND-RELIC-VOIDS',
    selection: `Adopt ${d05FutureMountain.b09FaceComparison.recommendedAlternativeId} as the analytic future-mountain planning surface with exact minimum relic voids.`,
    effect: 'The compact east-face analytic surface and exact core-plus-one-cell relic exclusions become the future-mountain planning basis; no future material cell or expert influence kernel is accepted.',
    technicalAcceptanceClaimed: false,
  },
  {
    id: 'SEL-D06-FAIL-CLOSED-MECHANISM-RESERVATIONS',
    scope: 'D06-mechanism-reservations',
    selection: 'Preserve frozen stair/lift layouts; use four independent capped local vent risers, capped platform/smoke bays, eight sealed sump caps, and sealed EG-B fire-service review interface.',
    effect: 'Exact fail-closed reservations control technical development, but no opening, mechanism, discharge, external route, compliance, or commissioning is accepted.',
    technicalAcceptanceClaimed: false,
  },
  ...readyGeometry.map((item) => ({
    id: `SEL-${item.blockerId}`,
    scope: item.blockerId,
    selection: item.recommendation,
    effect: 'The conservative geometry choice is frozen for subsequent exact-cell compilation and independent checks.',
    technicalAcceptanceClaimed: false,
  })),
];

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-autonomous-design-selections',
  generatedAtUtc: GENERATED_AT,
  status: 'PARTIAL_PASS_OWNER_DELEGATED_SELECTIONS_FROZEN_TECHNICAL_GATES_HOLD',
  authority: {
    decisionAuthority: 'sole human project owner',
    delegationMode: 'OWNER_DIRECTED_AUTONOMOUS_RESEARCH_DESIGN_AND_PLANNING',
    ownerDirective: 'yes, please proceed autmously. if you need to research, design, and plan something, fan out subagents to help.',
    directiveDateUtc: '2026-08-04',
    additionalHumanDecisionMakersRequired: false,
    agentMaySelectReadyConservativePlanningDefaults: true,
    agentMayInventTechnicalEvidence: false,
    agentMayClaimExpertAcceptance: false,
    agentMayAuthorizeWorldEditsFromThisLedger: false,
  },
  sourceBindings: Object.fromEntries(Object.entries(INPUTS).map(([key, relativePath]) => [
    key,
    binding(relativePath, `${key.toUpperCase()} offline recommendation evidence`),
  ])),
  selections,
  technicalEvidenceAdvances: {
    d02S01S02: {
      status: d02RegionEvidence.status,
      copiedSaveCandidatesAudited: d02RegionEvidence.copiedSaveCompletenessAudit.candidateCount,
      completeCopiedSaveCandidates: d02RegionEvidence.copiedSaveCompletenessAudit.completeCandidateCount,
      s01Complete: d02RegionEvidence.safetyBoundary.s01Complete,
      s02Complete: d02RegionEvidence.safetyBoundary.s02Complete,
    },
    d05S01: {
      status: d05RelicSurvey.status,
      relicCount: d05RelicSurvey.relics.length,
      presentFabricCells: Object.fromEntries(d05RelicSurvey.relics.map((relic) => [
        relic.relicKey,
        relic.presentFabricCondition.presentCellCount,
      ])),
      observationCandidateRouteLengths: Object.fromEntries(d05RelicSurvey.relics.map((relic) => [
        relic.relicKey,
        relic.observationCandidateCensus.route.path?.length ?? 0,
      ])),
    },
    d06SurfaceEgress: {
      status: d06.status,
      exactEndpointCount: d06.egressDesigns.length,
      routeSetsDisjoint: d06.independenceProof.exactExternalContinuationSetsDisjoint,
    },
    connectorGeometry: {
      status: connectorGeometry.status,
      b07Status: connectorGeometry.publicShaftDogleg.status,
      b07ExcavationCells: connectorGeometry.publicShaftDogleg.exactCellSets
        .excavationReservation.cellCount,
      b07WaterCells: connectorGeometry.publicShaftDogleg.snapshotAndIntersectionAudit
        .immutableExcavationStateCensus.waterCellCount,
      b08Status: connectorGeometry.serviceTunnelCenterline.status,
      b08HorizontalSteps: connectorGeometry.serviceTunnelCenterline.centerline.horizontalStepCount,
      b08ExcavationCells: connectorGeometry.serviceTunnelCenterline.exactCellSets
        .excavationReservation.cellCount,
      b08Selected: true,
      b09FaceSelected: connectorGeometry.funicularFaceComparison.disposition
        .exactRailCenterlineFrozen,
    },
    d02ClosedDrainage: {
      status: d02ClosedDrainage.status,
      preferredAlternativeId: d02ClosedDrainage.preferredPlanningAlternative.alternativeId,
      candidateCellCount: d02ClosedDrainage.alternatives.find(
        ({ id }) => id === d02ClosedDrainage.preferredPlanningAlternative.alternativeId,
      ).candidateCellManifest.cellCount,
      noBuildLowRunCount: 1,
    },
    d05FutureMountain: {
      status: d05FutureMountain.status,
      recommendedAlternativeId: d05FutureMountain.b09FaceComparison.recommendedAlternativeId,
      recommendationSelectedByThisLedger: true,
      futureCellCount: d05FutureMountain.futureCellCount,
    },
    d06LifeSafety: {
      status: d06LifeSafety.status,
      recommendedB07CandidateId: d06LifeSafety.b07PublicShaftTransfer.recommendedCandidateId,
      ventAlternativeId: d06LifeSafety.d06EmptyEightLifeSafety
        .ventilationOutletAlternatives.recommendedAlternativeId,
    },
    cheyenneJcurve: {
      status: cheyenneJcurve.status,
      horizontalSteps: cheyenneJcurve.design.centerline.horizontalStepCount,
      excavationCells: cheyenneJcurve.design.excavationReservation.cellCount,
      selectedByThisLedger: true,
    },
  },
  disposition: {
    selectionCount: selections.length,
    selectedSubjectiveChoices: [
      'D02-B05',
      'D05 conservative planning controls',
      'D06 egress and system design basis',
      'D02 capped-sump/no-build drainage basis',
      'D05 compact east-face future-mountain basis',
      'D06/B07 fail-closed route and mechanism reservations',
      'P1-B03 exact Cheyenne J-curve',
      'P1-B09 exact east-face funicular planning route',
      ...readyGeometry.map(({ blockerId }) => blockerId),
    ],
    remainingTechnicalWork: [
      'D02-S01 complete immutable full-save C1 census',
      'D02-S02 current C01/ISSUE-002 interface survey',
      'D02-S04 option-specific construction quantities',
      'D02 closed-drainage inflow/storage/failure criteria, future states, technical review, owners, and interfaces',
      'D05 exact canonical future material states, expert influence kernels, support treatment, technical review, owners, and interfaces',
      'D06 mechanism engineering, external discharge/access, technical review, owners, and interfaces',
      'P1-B03, P1-B07, P1-B09, and P1-B10 technical acceptance after their planning geometry selections',
      'P1-B11 exact Grand Avenue/PassageWay/external interface points, profiles, owners, and contracts',
    ],
    d02Resolved: false,
    d05Resolved: false,
    d06Resolved: false,
    r00G02Passed: false,
  },
  safetyBoundary: {
    offlineOnly: true,
    operations: [],
    operationCellCount: 0,
    materialCellCount: 0,
    liveCallsPerformed: [],
    worldEditAuthorized: false,
    physicalBuildAuthorized: false,
  },
};

const markdown = `# Phase 1 owner-delegated autonomous design selections\n\n`
  + `Status: **${report.status} — OFFLINE ONLY — ZERO OPERATIONS**\n\n`
  + `The sole project owner directed the team to proceed autonomously with research, design, and planning. This ledger therefore freezes conservative choices that the bound evidence already marks ready. It does not turn a recommendation into technical proof, claim expert review, or authorize a world edit.\n\n`
  + `## Selections frozen\n\n`
  + `| Selection | Scope | Effect |\n|---|---|---|\n`
  + selections.map((item) => `| ${item.id} | ${item.scope} | ${item.effect} |`).join('\n')
  + `\n\n## What remains technical, not subjective\n\n`
  + report.disposition.remainingTechnicalWork.map((item) => `- ${item}`).join('\n')
  + `\n\nD02, D05, D06, and R00 G02 remain HOLD until that evidence exists and passes. There are no additional human decision-makers; remaining outside inputs are surveys, exact designs, independent technical checks, ownership cellsets, and later release authorization.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

process.stdout.write(`${JSON.stringify({
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  status: report.status,
  selectionCount: selections.length,
  operationCellCount: 0,
}, null, 2)}\n`);
