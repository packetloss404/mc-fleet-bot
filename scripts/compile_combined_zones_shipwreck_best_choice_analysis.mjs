#!/usr/bin/env node
/**
 * Compare the available responses to the P1-B10/shipwreck coordination hold.
 *
 * This is a read-only, decision-quality gate. It distinguishes physical
 * construction/interaction from a nonphysical influence/support reservation,
 * includes no-action and lower-impact alternatives, rejects bookkeeping-only
 * clearance, and emits no geometry, command, or operation.
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

const GENERATED_AT = value('--generated-at', '2026-08-06T04:20:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-shipwreck-best-choice-analysis.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-shipwreck-best-choice-analysis.md',
));
const INPUTS = Object.freeze({
  g03CanonicalSetout:
    'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  g06CompleteSaveScopeClearance:
    'docs/masterplans/05-combined-zones/phase1-g06-complete-save-scope-clearance-20260806T014133Z.json',
  removalAuthorization:
    'docs/masterplans/05-combined-zones/phase1-shipwreck-removal-authorization.json',
  treatmentContract:
    'docs/masterplans/05-combined-zones/phase1-shipwreck-treatment-contract.json',
  protectedRelicClearance:
    'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  releaseContract:
    'docs/masterplans/05-combined-zones/phase1-release-contract.json',
});

function absolute(filename) {
  return path.join(ROOT, filename);
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
}

function binding(filename, role) {
  const data = fs.readFileSync(absolute(filename));
  return {
    path: filename,
    sha256: sha256(data),
    bytes: data.length,
    role,
  };
}

function invariant(condition, message) {
  if (!condition) throw new Error(`Shipwreck best-choice analysis rejected: ${message}`);
}

function sameIntersection(left, right) {
  return left?.cellCount === right?.cellCount
    && left?.coordinateSetSha256 === right?.coordinateSetSha256
    && ['minX', 'maxX', 'minY', 'maxY', 'minZ', 'maxZ']
      .every((key) => left?.bounds?.[key] === right?.bounds?.[key]);
}

const sourceBindings = {
  g03CanonicalSetout: binding(
    INPUTS.g03CanonicalSetout,
    'exact P1-B10 construction, interaction, influence, exclusions, and support-gap evidence',
  ),
  g06CompleteSaveScopeClearance: binding(
    INPUTS.g06CompleteSaveScopeClearance,
    'complete-save-bound exact protected-feature overlap classification',
  ),
  removalAuthorization: binding(
    INPUTS.removalAuthorization,
    'optional controlled-removal planning authority and persistent generated-start rule',
  ),
  treatmentContract: binding(
    INPUTS.treatmentContract,
    'exact 598-cell removal fallback burden and unresolved chest state',
  ),
  protectedRelicClearance: binding(
    INPUTS.protectedRelicClearance,
    'exact 2,268-cell shipwreck core and unfrozen positive-margin hold',
  ),
  releaseContract: binding(
    INPUTS.releaseContract,
    'R00 default-deny and later physical-release boundaries',
  ),
};

const g03 = readJson(INPUTS.g03CanonicalSetout);
const g06 = readJson(INPUTS.g06CompleteSaveScopeClearance);
const authorization = readJson(INPUTS.removalAuthorization);
const treatment = readJson(INPUTS.treatmentContract);
const relicEvidence = readJson(INPUTS.protectedRelicClearance);
const releaseContract = readJson(INPUTS.releaseContract);
const p1b10 = g03.scopeRegistry?.find(({ scopeId }) => scopeId === 'P1-B10');
const generatedOverlaps = g06.exactOverlapSummary?.g03GeneratedStartOverlaps ?? [];
const protectedOverlaps = g06.exactOverlapSummary?.g03ProtectedCoreOverlaps ?? [];
const shipwreckGenerated = generatedOverlaps.filter(
  ({ structureId }) => structureId === 'minecraft:shipwreck',
);
const shipwreckProtected = protectedOverlaps.filter(
  ({ relicKey }) => relicKey === 'shipwreck',
);
const generatedOverlap = shipwreckGenerated[0];
const protectedOverlap = shipwreckProtected[0];
const shipwreckRelic = relicEvidence.relics?.find(({ key }) => key === 'shipwreck');

invariant(
  g03.status
    === 'PASS_G03_V3_ALL_30_PROPOSAL_DOMAINS_EXACT_DOWNSTREAM_AND_PHYSICAL_AUTHORITY_HOLD'
    && g03.gate?.g03Passed === true,
  'G03 source drift',
);
invariant(
  p1b10?.selectedIdentity === 'FM-01-COMPACT-EAST-FACE'
    && p1b10.construction?.cellCount === 14768553
    && p1b10.construction?.bounds?.minY === 72
    && p1b10.construction?.exclusions?.protectedRelicWithheldFillCellCount === 1977
    && p1b10.interaction?.cellCount === 433549
    && p1b10.influence?.cellCount === 1082149
    && p1b10.influence?.semantic
      === 'EXACT_EXTERNAL_SHELL_UNION_SOURCE_BOUND_SUPPORT_GAP_NOT_EXPERT_KERNEL'
    && p1b10.exactSupportGapEvidence?.status === 'HOLD_EXACT_UNSUPPORTED_BELOW_Y72'
    && p1b10.exactSupportGapEvidence?.treatment === null,
  'P1-B10 source-bound geometry drift',
);
invariant(
  g06.completeSaveScopeEvidence?.projectScopeSourceEquivalent === true
    && g06.gate?.exactG03ProtectedCoreOverlapCellCount === 126
    && g06.gate?.acceptedRemovalTechnicalTreatmentContractCount === 0,
  'G06 overlap gate drift',
);
invariant(
  shipwreckGenerated.length === 1
    && shipwreckProtected.length === 1
    && generatedOverlap.domainId === 'P1-B10/influence'
    && protectedOverlap.domainId === 'P1-B10/influence'
    && sameIntersection(generatedOverlap.intersection, protectedOverlap.intersection)
    && generatedOverlap.intersection.cellCount === 126
    && generatedOverlap.intersection.coordinateSetSha256
      === '77350225547fce64783a9d3d3d8953631b847a733e9bc060211c13b952df0e98',
  'shipwreck overlap is not one exact duplicated influence finding',
);
invariant(
  [...shipwreckGenerated, ...shipwreckProtected].every(
    ({ domainId }) => domainId.endsWith('/influence'),
  ),
  'shipwreck has a construction or interaction conflict',
);
invariant(
  authorization.status === 'OWNER_POLICY_APPROVED_RELEASE_NOT_AUTHORIZED'
    && authorization.effectivePlanningDisposition?.controlledRemovalMayBeDesigned === true
    && authorization.effectivePlanningDisposition
      ?.generatedStructureStartMetadataMayBeEditedDirectly === false
    && authorization.effectivePlanningDisposition
      ?.structureStartRecordRemainsEvidenceAfterBlockRemoval === true
    && authorization.safetyBoundary?.worldEditAuthorized === false,
  'removal-policy boundary drift',
);
invariant(
  treatment.status
    === 'PARTIAL_PASS_EXACT_598_FABRIC_TARGET_CANDIDATE_AND_AIR_MAPPING_THREE_LOOT_CHESTS_UNMATERIALIZED_TECHNICAL_AND_RELEASE_HOLD'
    && treatment.treatmentPayload?.attributedRemovalTargetCandidate?.cellCount === 598
    && treatment.treatmentPayload?.chestSalvageContract?.chestCount === 3
    && treatment.treatmentPayload?.chestSalvageContract
      ?.lootTableUnmaterializedCount === 3
    && treatment.treatmentPayload?.chestSalvageContract
      ?.knownInventoryContentCount === 0
    && treatment.disposition?.technicalTreatmentAccepted === false
    && treatment.safetyBoundary?.operationCellCount === 0,
  'removal fallback burden drift',
);
invariant(
  shipwreckRelic?.evidenceBackedDefaultDenyCore?.cellCount === 2268
    && shipwreckRelic.positiveMarginBuffer?.status === 'HOLD_NOT_FROZEN',
  'shipwreck core or positive-margin evidence drift',
);
invariant(
  releaseContract.gateDefinitions?.find(({ id }) => id === 'G06_PROTECTED_FEATURES')
    ?.stage === 'design'
    && releaseContract.worldEditAuthorized === false,
  'release-contract boundary drift',
);

const criteria = [
  {
    id: 'ACTUAL_BLOCKER_RESOLUTION',
    weight: 30,
    rule: 'Resolve the exact 126-cell P1-B10 influence/support hold rather than a different or larger problem.',
  },
  {
    id: 'ROOT_CAUSE_INTEGRITY',
    weight: 20,
    rule: 'Change the geometry/support demand that generated the influence record; never erase evidence to manufacture clearance.',
  },
  {
    id: 'PHYSICAL_SAFETY',
    weight: 20,
    rule: 'Prefer zero live edits, inventory moves, entity interaction, and irreversible fabric change.',
  },
  {
    id: 'REVERSIBILITY',
    weight: 10,
    rule: 'Prefer a planning change that can be regenerated or discarded before physical release.',
  },
  {
    id: 'EVIDENCE_EFFICIENCY',
    weight: 10,
    rule: 'Prefer the smallest defensible evidence burden that does not hide an unresolved condition.',
  },
  {
    id: 'FUTURE_FLEXIBILITY',
    weight: 10,
    rule: 'Preserve later design options and avoid spending optional removal authority without necessity.',
  },
];
invariant(criteria.reduce((sum, { weight }) => sum + weight, 0) === 100,
  'criterion weights do not total 100');

const hardGates = [
  {
    id: 'RESOLVES_ACTUAL_BLOCKER',
    rule: 'The alternative must close or directly redesign the exact influence/support condition.',
  },
  {
    id: 'DOES_NOT_SUPPRESS_SUPPORT_EVIDENCE',
    rule: 'The alternative may not subtract an influence record while leaving its source support demand unchanged.',
  },
  {
    id: 'PRESERVES_GENERATED_START_EVIDENCE',
    rule: 'Generated-start evidence remains immutable even if physical fabric is later removed.',
  },
  {
    id: 'USES_MINIMUM_IRREVERSIBLE_SCOPE',
    rule: 'A physical alternative is ineligible while a credible nonphysical geometry alternative remains.',
  },
  {
    id: 'DOES_NOT_DEPEND_ON_UNKNOWN_INVENTORY',
    rule: 'A current recommendation may not require moving or destroying any of the three unmaterialized loot chests.',
  },
];

function option({
  id,
  label,
  description,
  scores,
  gateResults,
  exactImpact,
  remainingWork,
  fallbackOnly = false,
}) {
  invariant(Object.keys(scores).length === criteria.length,
    `${id} score count drift`);
  const scoreDetails = criteria.map((criterion) => {
    const score = scores[criterion.id];
    invariant(Number.isInteger(score) && score >= 0 && score <= 5,
      `${id}/${criterion.id} score outside 0..5`);
    return {
      criterionId: criterion.id,
      score,
      weightedPoints: (score / 5) * criterion.weight,
    };
  });
  const hardGateResults = hardGates.map((gate) => ({
    gateId: gate.id,
    passed: gateResults[gate.id] === true,
  }));
  return {
    id,
    label,
    description,
    scoreDetails,
    weightedScore: scoreDetails.reduce(
      (sum, { weightedPoints }) => sum + weightedPoints,
      0,
    ),
    hardGateResults,
    eligible: hardGateResults.every(({ passed }) => passed) && !fallbackOnly,
    fallbackOnly,
    exactImpact,
    remainingWork,
  };
}

const alternatives = [
  option({
    id: 'BC-01-PRESERVE-AND-LOCAL-P1-B10-RESHAPE',
    label: 'Preserve and reshape locally',
    description: 'Regenerate FM-01 near the shipwreck so candidate construction no longer creates below-Y72 support demand or any construction, interaction, or influence overlap with the exact core plus a technically selected positive margin.',
    scores: {
      ACTUAL_BLOCKER_RESOLUTION: 5,
      ROOT_CAUSE_INTEGRITY: 5,
      PHYSICAL_SAFETY: 5,
      REVERSIBILITY: 4,
      EVIDENCE_EFFICIENCY: 3,
      FUTURE_FLEXIBILITY: 5,
    },
    gateResults: {
      RESOLVES_ACTUAL_BLOCKER: true,
      DOES_NOT_SUPPRESS_SUPPORT_EVIDENCE: true,
      PRESERVES_GENERATED_START_EVIDENCE: true,
      USES_MINIMUM_IRREVERSIBLE_SCOPE: true,
      DOES_NOT_DEPEND_ON_UNKNOWN_INVENTORY: true,
    },
    exactImpact: {
      physicalTargetCellCount: 0,
      inventoryMoveCount: 0,
      currentOverlapCellCountToEliminateByGeometryRegeneration: 126,
      currentProtectedRelicWithheldConstructionCellCountRetained: 1977,
      outputGeometryCellSet: null,
      reasonOutputIsNull: 'The positive margin and minimal local reshape must be compiled and compared next; this decision gate does not fabricate geometry.',
    },
    remainingWork: [
      'compile bounded positive-margin candidates and a minimal local FM-01 toe/no-build reshape',
      'recompute P1-B10 construction, interaction, influence, and support-gap evidence from source geometry',
      'require zero shipwreck core-plus-margin overlap without deleting an influence record independently of its source',
      'rerun G03, G06, ownership, and interface checks before technical acceptance',
    ],
  }),
  option({
    id: 'BC-02-SUBTRACT-INFLUENCE-ONLY',
    label: 'Subtract the overlap from influence only',
    description: 'Remove the 126 coordinates from the influence registry without changing FM-01 construction or its below-Y72 support demand.',
    scores: {
      ACTUAL_BLOCKER_RESOLUTION: 4,
      ROOT_CAUSE_INTEGRITY: 0,
      PHYSICAL_SAFETY: 5,
      REVERSIBILITY: 5,
      EVIDENCE_EFFICIENCY: 4,
      FUTURE_FLEXIBILITY: 4,
    },
    gateResults: {
      RESOLVES_ACTUAL_BLOCKER: false,
      DOES_NOT_SUPPRESS_SUPPORT_EVIDENCE: false,
      PRESERVES_GENERATED_START_EVIDENCE: true,
      USES_MINIMUM_IRREVERSIBLE_SCOPE: true,
      DOES_NOT_DEPEND_ON_UNKNOWN_INVENTORY: true,
    },
    exactImpact: {
      physicalTargetCellCount: 0,
      inventoryMoveCount: 0,
      ledgerCellsProposedForSubtraction: 126,
      sourceSupportGapTreatment: null,
    },
    remainingWork: [
      'rejected: bookkeeping subtraction would hide rather than resolve the support condition',
    ],
  }),
  option({
    id: 'BC-03-NO-CHANGE',
    label: 'Take no action',
    description: 'Preserve all current planning records and leave the exact G06 hold unresolved.',
    scores: {
      ACTUAL_BLOCKER_RESOLUTION: 0,
      ROOT_CAUSE_INTEGRITY: 2,
      PHYSICAL_SAFETY: 5,
      REVERSIBILITY: 5,
      EVIDENCE_EFFICIENCY: 5,
      FUTURE_FLEXIBILITY: 5,
    },
    gateResults: {
      RESOLVES_ACTUAL_BLOCKER: false,
      DOES_NOT_SUPPRESS_SUPPORT_EVIDENCE: true,
      PRESERVES_GENERATED_START_EVIDENCE: true,
      USES_MINIMUM_IRREVERSIBLE_SCOPE: true,
      DOES_NOT_DEPEND_ON_UNKNOWN_INVENTORY: true,
    },
    exactImpact: {
      physicalTargetCellCount: 0,
      inventoryMoveCount: 0,
      unresolvedInfluenceOverlapCellCount: 126,
    },
    remainingWork: [
      'rejected as the active path because it cannot advance G06',
    ],
  }),
  option({
    id: 'BC-04-FULL-598-CELL-CONTROLLED-REMOVAL',
    label: 'Remove all attributed shipwreck fabric',
    description: 'Develop the exact 598-cell candidate toward controlled removal and candidate air replacement.',
    scores: {
      ACTUAL_BLOCKER_RESOLUTION: 3,
      ROOT_CAUSE_INTEGRITY: 2,
      PHYSICAL_SAFETY: 1,
      REVERSIBILITY: 1,
      EVIDENCE_EFFICIENCY: 0,
      FUTURE_FLEXIBILITY: 1,
    },
    gateResults: {
      RESOLVES_ACTUAL_BLOCKER: false,
      DOES_NOT_SUPPRESS_SUPPORT_EVIDENCE: false,
      PRESERVES_GENERATED_START_EVIDENCE: true,
      USES_MINIMUM_IRREVERSIBLE_SCOPE: false,
      DOES_NOT_DEPEND_ON_UNKNOWN_INVENTORY: false,
    },
    exactImpact: {
      physicalTargetCandidateCellCount: 598,
      acceptedPhysicalTargetCellCount: 0,
      unmaterializedLootChestCount: 3,
      knownInventoryContentCount: 0,
      generatedStartRecordWouldRemainEvidence: true,
      currentInfluenceOverlapWouldStillRequireAcceptedTreatmentOrGeometryChange: true,
    },
    remainingWork: treatment.treatmentPayload.remainingTechnicalHolds,
    fallbackOnly: true,
  }),
].sort((left, right) => right.weightedScore - left.weightedScore
  || left.id.localeCompare(right.id));

const eligible = alternatives.filter(({ eligible: isEligible }) => isEligible);
invariant(eligible.length === 1, 'expected exactly one eligible best choice');
const recommended = eligible[0];
invariant(
  recommended.id === 'BC-01-PRESERVE-AND-LOCAL-P1-B10-RESHAPE'
    && recommended.weightedScore === 94,
  'best-choice recommendation drift',
);

const analysisPayload = {
  actualBlocker: {
    status: 'EXACT_ONE_PHYSICAL_FINDING_RECORDED_TWICE_BY_SUBJECT_REGISTRY',
    scopeId: 'P1-B10',
    domainId: 'P1-B10/influence',
    domainSemantic: p1b10.influence.semantic,
    uniqueOverlapCellCount: generatedOverlap.intersection.cellCount,
    overlapBounds: generatedOverlap.intersection.bounds,
    overlapCoordinateSetSha256: generatedOverlap.intersection.coordinateSetSha256,
    generatedStartRecordCount: shipwreckGenerated.length,
    protectedCoreRecordCount: shipwreckProtected.length,
    recordsDescribeSamePhysicalCellSet: true,
    constructionOverlapCellCount: 0,
    interactionOverlapCellCount: 0,
    influenceOverlapCellCount: 126,
    influenceIsAcceptedExpertKernel: false,
    influenceContainsUnresolvedSupportGapReservation: true,
    sourceSupportGapTreatment: p1b10.exactSupportGapEvidence.treatment,
  },
  decisionContext: {
    selectedMountainAlternativeId: p1b10.selectedIdentity,
    p1b10ConstructionCellCount: p1b10.construction.cellCount,
    p1b10ConstructionMinimumY: p1b10.construction.bounds.minY,
    protectedRelicWithheldConstructionCellCount:
      p1b10.construction.exclusions.protectedRelicWithheldFillCellCount,
    shipwreckCoreCellCount: shipwreckRelic.evidenceBackedDefaultDenyCore.cellCount,
    positiveMarginBlocks: null,
    positiveMarginFrozen: false,
    controlledRemovalMayBeDesigned: true,
    controlledRemovalRequired: false,
    generatedStartMetadataEditable: false,
    generatedStartRemainsEvidenceAfterFabricRemoval: true,
    removalTargetCandidateCellCount:
      treatment.treatmentPayload.attributedRemovalTargetCandidate.cellCount,
    unmaterializedLootChestCount:
      treatment.treatmentPayload.chestSalvageContract.lootTableUnmaterializedCount,
    knownInventoryContentCount:
      treatment.treatmentPayload.chestSalvageContract.knownInventoryContentCount,
  },
  method: {
    id: 'COMBINED_ZONES_BEST_CHOICE_GATE_V1',
    principle: 'Prefer the smallest reversible intervention that resolves the real blocker without suppressing source evidence; irreversible work must be demonstrably superior, not merely authorized.',
    criteria,
    hardGates,
    scoringScale: '0 worst / 5 best; weighted score is advisory, every hard gate is mandatory',
    requiredAlternativeClasses: [
      'no action',
      'bookkeeping-only minimal change',
      'root-cause nonphysical redesign',
      'authorized physical fallback',
    ],
  },
  alternatives,
  recommendation: {
    alternativeId: recommended.id,
    weightedScore: recommended.weightedScore,
    planningDirectionSelectedForNextOfflineDevelopment: true,
    technicallyAcceptedGeometry: false,
    physicalImplementationAuthorized: false,
    removalAuthorizationRetainedAsFallback: true,
    removalIsCurrentPreferredPath: false,
    influenceOnlySubtractionRejectedAsEvidenceSuppression: true,
    reason: 'The only exact conflict is a nonphysical influence/support reservation. Local FM-01 regeneration can address its source while preserving the shipwreck, avoiding three unknown loot inventories and 598 irreversible candidate edits. Fabric removal would not erase the immutable generated-start record and is therefore not the minimum or clearest solution.',
    nextArtifact: 'compile bounded positive-margin alternatives and the minimum local P1-B10 toe/no-build reshape; regenerate construction, interaction, influence, and support evidence from the source geometry and require zero core-plus-margin overlap',
  },
};

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-shipwreck-best-choice-analysis',
  generatedAtUtc: GENERATED_AT,
  status:
    'PASS_BEST_CHOICE_PRESERVE_AND_LOCAL_P1_B10_RESHAPE_SELECTED_REMOVAL_FALLBACK_ONLY',
  purpose: 'Choose the best next response to the exact P1-B10/shipwreck hold before investing in additional technical or physical work.',
  sourceBindings,
  analysisPayload,
  disposition: {
    actualBlockerClassified: true,
    alternativesCompared: alternatives.length,
    noActionIncluded: true,
    lowerImpactAlternativesIncluded: true,
    rootCauseIntegrityGateEnforced: true,
    recommendedAlternativeId: recommended.id,
    recommendationReadyForOfflineDevelopment: true,
    exactReshapeGeometryCompiled: false,
    technicalTreatmentAccepted: false,
    removalPathActive: false,
    removalPathRetainedAsFallback: true,
    operationCompilationAuthorized: false,
  },
  safetyBoundary: {
    proposedGeometryCellCount: 0,
    acceptedGeometryCellCount: 0,
    acceptedRemovalTargetCellCount: 0,
    operationCellCount: 0,
    blockEditCount: 0,
    inventoryMoveCount: 0,
    serverStarted: false,
    liveWorldContacted: false,
    physicalReleaseAuthorized: false,
    worldEditAuthorized: false,
    executable: false,
  },
};
report.analysisPayloadSha256 = sha256(
  `combined-zones-shipwreck-best-choice-payload-v1\n${JSON.stringify(analysisPayload)}\n`,
);
report.reportIdentitySha256 = sha256(
  `combined-zones-shipwreck-best-choice-report-v1\n${JSON.stringify({
    schemaVersion: report.schemaVersion,
    id: report.id,
    generatedAtUtc: report.generatedAtUtc,
    status: report.status,
    sourceBindings: report.sourceBindings,
    analysisPayloadSha256: report.analysisPayloadSha256,
    disposition: report.disposition,
    safetyBoundary: report.safetyBoundary,
  })}\n`,
);

const markdown = `# Combined Zones shipwreck best-choice analysis\n\n`
  + `Generated: ${GENERATED_AT}\n\n`
  + `Status: **${report.status} — READ-ONLY — ZERO OPERATIONS**\n\n`
  + `## Decision\n\n`
  + `**Preserve the shipwreck and locally reshape P1-B10.** The exact conflict is only **126 cells** in \`P1-B10/influence\`; construction and interaction have **zero** shipwreck overlaps. The influence set is an unaccepted external-shell/support-gap reservation, not an expert physical kernel.\n\n`
  + `The construction compiler already withholds **${p1b10.construction.exclusions.protectedRelicWithheldFillCellCount.toLocaleString('en-US')}** protected-relic fill cells. The correct next move is to change the local FM-01 geometry/support demand and regenerate every derived domain—not merely delete 126 ledger entries.\n\n`
  + `## Alternative comparison\n\n`
  + `| Rank | Alternative | Score | Eligible | Physical candidate cells |\n|---:|---|---:|---|---:|\n`
  + alternatives.map((alternative, index) => (
    `| ${index + 1} | ${alternative.label} | ${alternative.weightedScore}/100 | ${alternative.eligible ? 'YES' : 'NO'} | ${alternative.exactImpact.physicalTargetCandidateCellCount ?? alternative.exactImpact.physicalTargetCellCount ?? 0} |`
  )).join('\n')
  + `\n\nThe influence-only subtraction is rejected because the source support-gap treatment is still null; removing its evidence would manufacture clearance. No-change is safe but cannot advance G06. Full removal is fallback-only: it introduces 598 candidate edits and three unknown loot inventories, while the generated-start record remains evidence even after fabric removal.\n\n`
  + `## Next bounded artifact\n\n`
  + `${analysisPayload.recommendation.nextArtifact}.\n\n`
  + `The reshape compiler must compare bounded positive-margin choices, minimize lost mountain volume, regenerate construction/interaction/influence/support from source, and fail unless the core-plus-margin overlap is exactly zero.\n\n`
  + `No geometry was emitted, no server was started, no live world was contacted, and no command or operation was generated.\n\n`
  + `Analysis payload SHA-256: \`${report.analysisPayloadSha256}\`\n\n`
  + `Report identity SHA-256: \`${report.reportIdentitySha256}\`\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

process.stdout.write(`${JSON.stringify({
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  status: report.status,
  actualOverlapClass: report.analysisPayload.actualBlocker.domainId,
  uniqueOverlapCellCount: report.analysisPayload.actualBlocker.uniqueOverlapCellCount,
  constructionOverlapCellCount:
    report.analysisPayload.actualBlocker.constructionOverlapCellCount,
  interactionOverlapCellCount:
    report.analysisPayload.actualBlocker.interactionOverlapCellCount,
  recommendedAlternativeId: report.disposition.recommendedAlternativeId,
  recommendedWeightedScore: recommended.weightedScore,
  operationCellCount: report.safetyBoundary.operationCellCount,
  analysisPayloadSha256: report.analysisPayloadSha256,
  reportIdentitySha256: report.reportIdentitySha256,
}, null, 2)}\n`);
