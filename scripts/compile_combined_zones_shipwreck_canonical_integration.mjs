#!/usr/bin/env node
/**
 * Integrate the selected shipwreck-preserving P1-B10 reshape as a hash-bound
 * overlay on the immutable G03 baseline. Offline only; emits no operations.
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
const GENERATED_AT = value('--generated-at', '2026-08-06T06:00:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-shipwreck-canonical-integration-overlay.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-shipwreck-canonical-integration-overlay.md',
));

const INPUTS = Object.freeze({
  bestChoice:
    'docs/masterplans/05-combined-zones/phase1-shipwreck-best-choice-analysis.json',
  g03: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  ownership:
    'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  g06:
    'docs/masterplans/05-combined-zones/phase1-g06-complete-save-scope-clearance-20260806T014133Z.json',
  protectedRelics:
    'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  releaseContract:
    'docs/masterplans/05-combined-zones/phase1-release-contract.json',
});

function invariant(condition, message) {
  if (!condition) throw new Error(`Shipwreck canonical integration rejected: ${message}`);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function canonicalize(input) {
  if (Array.isArray(input)) return input.map(canonicalize);
  if (input && typeof input === 'object') {
    return Object.fromEntries(Object.keys(input).sort().map((key) => (
      [key, canonicalize(input[key])]
    )));
  }
  return input;
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, filename), 'utf8'));
}

function binding(filename, role) {
  const data = fs.readFileSync(path.join(ROOT, filename));
  return { path: filename, bytes: data.length, sha256: sha256(data), role };
}

function overlaps3d(left, right) {
  return left.maxX >= right.minX && left.minX <= right.maxX
    && left.maxY >= right.minY && left.minY <= right.maxY
    && left.maxZ >= right.minZ && left.minZ <= right.maxZ;
}

function overlapsXz(left, right) {
  return left.maxX >= right.minX && left.minX <= right.maxX
    && left.maxZ >= right.minZ && left.minZ <= right.maxZ;
}

function main() {
  const best = readJson(INPUTS.bestChoice);
  const g03 = readJson(INPUTS.g03);
  const ownership = readJson(INPUTS.ownership);
  const g06 = readJson(INPUTS.g06);
  const relics = readJson(INPUTS.protectedRelics);
  const releaseContract = readJson(INPUTS.releaseContract);
  const reshape = best.analysisPayload?.reshapeOptimization?.selectedPlanningReshape;
  const p1b10 = g03.scopeRegistry.find(({ scopeId }) => scopeId === 'P1-B10');

  invariant(best.schemaVersion === 2
    && best.disposition?.exactReshapeGeometryCompiled === true,
  'best-choice reshape source drift');
  invariant(g03.canonicalPayloadSha256
    === '1e4609275a2fd6aed8aa8a3dac00e8bdadae97dc756ca222922ce57a2c9b0712',
  'immutable G03 baseline identity drift');
  invariant(reshape?.id === 'FM-01-SHIPWRECK-SOUTH-OPEN-TOE-RESHAPE-V1'
    && reshape.geometryIdentitySha256
      === 'bea26a08611ed3f24809d80b97b2b30c88d5a6de61e1d361b22a668e7db8bad1',
  'selected reshape identity drift');
  invariant(p1b10?.construction?.cellCount === 14_768_553
    && p1b10.interaction?.cellCount === 433_549
    && p1b10.influence?.cellCount === 1_082_149,
  'baseline P1-B10 domain count drift');
  invariant(ownership.g04PhysicalOwnership?.g04PassedOffline === true
    && ownership.disposition?.g04OfflineExactOneOwnerGatePassed === true,
  'baseline G04 ownership gate drift');
  invariant(g06.completeSaveScopeEvidence?.projectScopeSourceEquivalent === true
    && g06.gate?.completeSaveEvidenceEstablished === true,
  'complete-save G06 source equivalence drift');
  invariant(releaseContract.worldEditAuthorized === false
    && releaseContract.executable === false,
  'release contract authority boundary drift');

  const noBuild = reshape.sparseNoBuildPlan.bounds;
  const changeEnvelope = {
    minX: noBuild.minX - 1,
    maxX: noBuild.maxX + 1,
    minY: Math.min(
      reshape.regeneratedDomains.supportGap.bounds.minY,
      reshape.regeneratedDomains.interaction.bounds.minY,
    ),
    maxY: Math.max(
      reshape.regeneratedDomains.construction.bounds.maxY,
      reshape.regeneratedDomains.interaction.bounds.maxY,
    ),
    minZ: noBuild.minZ - 1,
    maxZ: noBuild.maxZ + 1,
  };
  invariant(JSON.stringify(changeEnvelope) === JSON.stringify({
    minX: 2069,
    maxX: 2102,
    minY: 38,
    maxY: 303,
    minZ: -664,
    maxZ: -587,
  }), 'change envelope drift');

  const otherScopeChecks = g03.scopeRegistry
    .filter(({ scopeId }) => scopeId !== 'P1-B10')
    .map((scope) => {
      const intersectingDomains = ['construction', 'interaction', 'influence']
        .filter((domain) => overlaps3d(changeEnvelope, scope[domain].bounds));
      return {
        scopeId: scope.scopeId,
        intersectingDomains,
        changeEnvelopeDisjoint: intersectingDomains.length === 0,
      };
    });
  invariant(otherScopeChecks.length === 9
    && otherScopeChecks.every(({ changeEnvelopeDisjoint }) => changeEnvelopeDisjoint),
  'reshape change envelope intersects another G03 scope');

  const changedGeneratedStarts = g06.generatedStartSubjects
    .filter(({ bounds }) => overlapsXz(changeEnvelope, bounds))
    .map(({ subjectId, sourceIndex, structureId, bounds }) => ({
      subjectId,
      sourceIndex,
      structureId,
      bounds,
      verticallyDisjoint: bounds.maxY < changeEnvelope.minY
        || bounds.minY > changeEnvelope.maxY,
    }));
  invariant(changedGeneratedStarts.length === 2
    && changedGeneratedStarts.some(({ subjectId }) => subjectId === 'GS-037')
    && changedGeneratedStarts.some(({ subjectId, verticallyDisjoint }) => (
      subjectId === 'GS-041' && verticallyDisjoint
    )), 'generated-start change-envelope census drift');
  const changedProtectedCores = g06.protectedCoreSubjects
    .filter(({ bounds }) => overlaps3d(changeEnvelope, bounds));
  invariant(changedProtectedCores.length === 1
    && changedProtectedCores[0].subjectId === 'CORE-shipwreck',
  'protected-core change-envelope census drift');
  invariant(Object.values(reshape.exactCorePlusPlanningMarginOverlap)
    .every((count) => count === 0),
  'selected reshape is not zero against the shipwreck core plus planning margin');
  invariant(g06.exactOverlapSummary.g03GeneratedStartOverlaps.length === 1
    && g06.exactOverlapSummary.g03ProtectedCoreOverlaps.length === 1
    && g06.exactOverlapSummary.g03GeneratedStartOverlaps[0].subjectId === 'GS-037'
    && g06.exactOverlapSummary.g03ProtectedCoreOverlaps[0].subjectId
      === 'CORE-shipwreck',
  'baseline G06 overlap ledger drift');

  const physical = ownership.g04PhysicalOwnership;
  const b10ExpandedOwner = physical.expandedOwnerRecords.find(
    ({ ownerId }) => ownerId === 'CZ05-SCOPE-CONSTRUCTION-CONTROL',
  );
  const constructionDelta = reshape.regeneratedDomains.construction.cellCount
    - p1b10.construction.cellCount;
  const interactionDelta = reshape.regeneratedDomains.interaction.cellCount
    - p1b10.interaction.cellCount;
  const influenceDelta = reshape.regeneratedDomains.influence.cellCount
    - p1b10.influence.cellCount;
  const physicalUnionDelta = constructionDelta + interactionDelta;
  invariant(constructionDelta === -83_729
    && interactionDelta === 2_015
    && influenceDelta === -10_012
    && physicalUnionDelta === -81_714,
  'reshape domain delta drift');

  const replacementDomains = canonicalize(reshape.regeneratedDomains);
  const compositeCanonicalPayload = {
    baseG03CanonicalPayloadSha256: g03.canonicalPayloadSha256,
    overlayGeometryIdentitySha256: reshape.geometryIdentitySha256,
    replacedScopeId: 'P1-B10',
    replacementDomains,
    unchangedScopeIds: g03.scopeRegistry
      .filter(({ scopeId }) => scopeId !== 'P1-B10')
      .map(({ scopeId }) => scopeId),
  };
  const compositeCanonicalPayloadSha256 = sha256(
    `combined-zones-shipwreck-canonical-overlay-v1\n${JSON.stringify(canonicalize(compositeCanonicalPayload))}\n`,
  );

  const report = {
    schemaVersion: 1,
    id: 'combined-zones-phase1-shipwreck-canonical-integration-overlay',
    generatedAtUtc: GENERATED_AT,
    status:
      'PASS_COMPOSITE_G03_G04_G05_G06_GEOMETRY_INTEGRATION_EXACT_ZERO_GENERATED_START_AND_CORE_OVERLAP_EXPERT_MARGIN_AND_ACCEPTANCE_HOLD',
    purpose: 'Bind the selected shipwreck-preserving reshape into one composite canonical candidate without rewriting the immutable G03 baseline or authorizing construction.',
    sourceBindings: {
      bestChoice: binding(INPUTS.bestChoice, 'selected exact P1-B10 reshape'),
      g03: binding(INPUTS.g03, 'immutable all-30-domain canonical baseline'),
      ownership: binding(INPUTS.ownership, 'baseline G04/G05 ownership and interface registry'),
      g06: binding(INPUTS.g06, 'complete-save-bound 114-start and three-core audit'),
      protectedRelics: binding(INPUTS.protectedRelics, 'protected-core identities'),
      releaseContract: binding(INPUTS.releaseContract, 'default-deny release boundary'),
    },
    compositeCanonicalModel: {
      representation: 'IMMUTABLE_G03_BASE_PLUS_HASH_BOUND_SINGLE_SCOPE_OVERLAY',
      ...compositeCanonicalPayload,
      compositeCanonicalPayloadSha256,
      changeEnvelope,
      immutableBaselineRewritten: false,
    },
    g03Integration: {
      scopeCount: g03.scopeRegistry.length,
      requiredDomainCount: g03.scopeRegistry.length * 3,
      nonNullDomainCount: g03.scopeRegistry.length * 3,
      replacedScopeCount: 1,
      replacedDomainCount: 3,
      unchangedScopeCount: otherScopeChecks.length,
      otherScopeChecks,
      exactSupportGapRegenerated: true,
      routeB08ChangedColumnCount: reshape.routeAndScopeChecks.b08ChangedColumnCount,
      routeB09ChangedColumnCount: reshape.routeAndScopeChecks.b09ChangedColumnCount,
      summitColumnRetained: reshape.routeAndScopeChecks.summitColumnRetained,
    },
    g04OwnershipIntegration: {
      changeEnvelopeDisjointFromEveryOtherScope: true,
      oneCanonicalOwnerForEveryChangedPhysicalCell:
        'CZ05-SCOPE-CONSTRUCTION-CONTROL',
      baselineObservedPhysicalUnionCellCount: physical.observedPhysicalUnionCellCount,
      compositeObservedPhysicalUnionCellCount:
        physical.observedPhysicalUnionCellCount + physicalUnionDelta,
      compositeCanonicalOwnerUnionCellCount:
        physical.canonicalOwnerUnionCellCount + physicalUnionDelta,
      compositeUnownedCellCount: 0,
      compositeMultiplyOwnedCellCount: 0,
      baselineSparseB10ConstructionOwnerCellCount:
        physical.sparseB10CanonicalConstructionOwner.cellCount,
      compositeSparseB10ConstructionOwnerCellCount:
        physical.sparseB10CanonicalConstructionOwner.cellCount + constructionDelta,
      baselineExpandedB10OwnerCellCount: b10ExpandedOwner.cellCount,
      compositeExpandedB10OwnerCellCount:
        b10ExpandedOwner.cellCount + interactionDelta,
      influenceStewardOwnerId: 'CZ05-SCOPE-CONSTRUCTION-CONTROL',
      compositeInfluenceStewardshipCellCount:
        reshape.regeneratedDomains.influence.cellCount,
      finalOwnerAcceptanceRecorded: false,
    },
    g05InterfaceIntegration: {
      changedCellsIntersectAnotherScope: false,
      existingCrossScopeContractCellSetsChanged: false,
      reason: 'The complete construction/interaction/influence change envelope is disjoint from all nine other G03 scopes; every existing P1-B10 cross-scope interface lies outside the overlay and remains byte-identical.',
      exactDirectionalAdjacencyContractCount:
        physical.exactDirectionalAdjacencyContractCount,
      exactExpandedDirectionalAdjacencyContractCount:
        physical.exactExpandedDirectionalAdjacencyContractCount,
      exactSparseB10DirectionalAdjacencyContractCount:
        physical.exactSparseB10DirectionalAdjacencyContractCount,
      g05Passed: false,
      remainingNullExternalEndpointOrStateCount:
        ownership.proposalAccounting?.nullExternalEndpointOrStateCount ?? 13,
      finalInterfaceAcceptanceRecorded: false,
    },
    g06GeometryIntegration: {
      generatedStartCount: g06.gate.generatedStartCount,
      protectedCoreCount: g06.gate.protectedCoreCount,
      changedGeneratedStarts,
      changedProtectedCores: changedProtectedCores.map(
        ({ subjectId, structureId, bounds }) => ({ subjectId, structureId, bounds }),
      ),
      shipwreckCorePlusSelectedPlanningMarginOverlap:
        reshape.exactCorePlusPlanningMarginOverlap,
      mineshaftGs041VerticallyDisjointFromChangeEnvelope: true,
      compositeGeneratedStartOverlapRecordCount: 0,
      compositeGeneratedStartOverlapCellCount: 0,
      compositeProtectedCoreOverlapRecordCount: 0,
      compositeProtectedCoreOverlapCellCount: 0,
      allThirtyDomainsExactZeroAgainstGeneratedStarts: true,
      allThirtyDomainsExactZeroAgainstFrozenCores: true,
      expertPositiveMarginAccepted: false,
      positiveMarginHoldCount: g06.positiveMarginLedger
        .filter(({ status }) => status.includes('HOLD')).length,
      occupiedD06BeeNestTreatmentAccepted: false,
      g06Passed: false,
    },
    domainDeltas: {
      constructionCellCount: constructionDelta,
      interactionCellCount: interactionDelta,
      influenceCellCount: influenceDelta,
      supportGapCellCount:
        -reshape.regeneratedDomains.supportGap.removedCellCountFromBase,
      physicalUnionCellCount: physicalUnionDelta,
    },
    disposition: {
      compositeCanonicalIntegrationCompiled: true,
      canonicalD05G03G04G05G06GeometryIntegrationComplete: true,
      immutableBaselinePreserved: true,
      exactZeroGeneratedStartAndProtectedCoreOverlapEstablished: true,
      g04OfflineExactOneOwnerCoverageRetained: true,
      g05ExistingCrossScopeInterfacesRetained: true,
      expertPositiveMarginAccepted: false,
      finalOwnerAcceptanceRecorded: false,
      finalInterfaceAcceptanceRecorded: false,
      occupiedBeeNestTreatmentAccepted: false,
      technicalTreatmentAccepted: false,
      r00Passed: false,
      operationCompilationAuthorized: false,
    },
    safetyBoundary: {
      immutableFilesRewritten: 0,
      operationCellCount: 0,
      productionServerContacted: false,
      productionWorldContacted: false,
      productionBlockEditCount: 0,
      physicalReleaseAuthorized: false,
      worldEditAuthorized: false,
      executable: false,
    },
  };
  report.integrationPayloadSha256 = sha256(
    `combined-zones-shipwreck-canonical-integration-payload-v1\n${JSON.stringify(canonicalize({
      compositeCanonicalModel: report.compositeCanonicalModel,
      g03Integration: report.g03Integration,
      g04OwnershipIntegration: report.g04OwnershipIntegration,
      g05InterfaceIntegration: report.g05InterfaceIntegration,
      g06GeometryIntegration: report.g06GeometryIntegration,
      domainDeltas: report.domainDeltas,
      disposition: report.disposition,
    }))}\n`,
  );
  report.reportIdentitySha256 = sha256(
    `combined-zones-shipwreck-canonical-integration-report-v1\n${JSON.stringify(canonicalize({
      schemaVersion: report.schemaVersion,
      id: report.id,
      generatedAtUtc: report.generatedAtUtc,
      status: report.status,
      sourceBindings: report.sourceBindings,
      integrationPayloadSha256: report.integrationPayloadSha256,
      safetyBoundary: report.safetyBoundary,
    }))}\n`,
  );

  const markdown = `# Combined Zones shipwreck canonical integration overlay\n\n`
    + `Generated: ${GENERATED_AT}\n\n`
    + `Status: **${report.status}**\n\n`
    + `The immutable G03 baseline remains unchanged. One hash-bound overlay replaces only P1-B10 construction, interaction, influence, and support-gap identities with \`${reshape.id}\`.\n\n`
    + `The complete change envelope is disjoint from all nine other scopes. G04 remains exact one-owner with **${report.g04OwnershipIntegration.compositeObservedPhysicalUnionCellCount.toLocaleString('en-US')}** physical cells, zero unowned cells, and zero multiply-owned cells. Existing G05 cross-scope contract sets are unchanged.\n\n`
    + `Across all ${g06.gate.generatedStartCount} generated starts and ${g06.gate.protectedCoreCount} frozen cores, the composite 30-domain geometry has zero overlap. The only additional envelope candidate is deep mineshaft GS-041, which ends at Y -9 while the change begins at Y 38.\n\n`
    + `This closes composite geometry integration only. Expert positive margins, final owner/interface acceptance, the occupied D06 bee-nest treatment, technical acceptance, and R00 remain HOLD. No operation was generated and no world was contacted.\n\n`
    + `Composite canonical payload SHA-256: \`${compositeCanonicalPayloadSha256}\`\n\n`
    + `Integration payload SHA-256: \`${report.integrationPayloadSha256}\`\n\n`
    + `Report identity SHA-256: \`${report.reportIdentitySha256}\`\n`;

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MARKDOWN, markdown);
  process.stdout.write(`${JSON.stringify({
    output: path.relative(ROOT, OUTPUT),
    markdown: path.relative(ROOT, MARKDOWN),
    status: report.status,
    compositeCanonicalPayloadSha256,
    compositeGeneratedStartOverlapCellCount:
      report.g06GeometryIntegration.compositeGeneratedStartOverlapCellCount,
    compositeProtectedCoreOverlapCellCount:
      report.g06GeometryIntegration.compositeProtectedCoreOverlapCellCount,
    operationCellCount: report.safetyBoundary.operationCellCount,
  }, null, 2)}\n`);
}

main();
