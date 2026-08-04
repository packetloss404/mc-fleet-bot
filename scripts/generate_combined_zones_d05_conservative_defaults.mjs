#!/usr/bin/env node
/**
 * Compile a deterministic, offline-only owner recommendation for D05.
 *
 * This generator does not decode new world data. It binds and narrows the
 * current immutable D05/relic evidence into conservative defaults that the
 * sole project authority can review. It emits no construction or operation
 * cells and cannot resolve D05 or G06.
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

const GENERATED_AT = value('--generated-at', '2026-08-04T19:30:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'masterplans/05-combined-zones/phase1-d05-conservative-defaults.md',
));

const INPUTS = Object.freeze({
  phase0Evidence: 'masterplans/05-combined-zones/phase0-survey-evidence.json',
  designDecisions: 'masterplans/05-combined-zones/phase1-design-decisions.json',
  geometryCoordination: 'masterplans/05-combined-zones/phase1-geometry-coordination.json',
  protectedRelicClearance: 'masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  d05HydrologyRelicDesign:
    'masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.json',
});

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
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
  if (!condition) throw new Error(`D05 conservative-default input rejected: ${message}`);
}

const phase0 = readJson(INPUTS.phase0Evidence);
const decisions = readJson(INPUTS.designDecisions);
const geometry = readJson(INPUTS.geometryCoordination);
const relics = readJson(INPUTS.protectedRelicClearance);
const d05 = readJson(INPUTS.d05HydrologyRelicDesign);
const d05Decision = decisions.decisions?.find((decision) => decision.id === 'D05');
const sources = Object.fromEntries(
  Object.entries(INPUTS).map(([key, relativePath]) => [key, binding(relativePath)]),
);

invariant(phase0.id === 'combined-zones-phase0-survey-evidence', 'unexpected Phase 0 evidence');
invariant(phase0.status === 'PASS_REVISED_SITING_PHASE0', 'Phase 0 evidence is not accepted');
invariant(d05Decision?.status === 'HOLD', 'D05 decision must remain HOLD');
invariant(d05.id === 'combined-zones-phase1-d05-hydrology-relic-buffer-design',
  'unexpected D05 design evidence');
invariant(d05.d05Disposition?.status === 'HOLD', 'D05 design evidence must remain HOLD');
invariant(relics.id === 'combined-zones-phase1-protected-relic-clearance',
  'unexpected relic-clearance evidence');
invariant(relics.g06Disposition?.status === 'HOLD', 'G06 must remain HOLD');
invariant(geometry.gates?.worldEditAuthorized === false, 'geometry evidence is not fail-closed');
invariant(d05.worldEditAuthorized === false && d05.operationCellCount === 0,
  'D05 evidence unexpectedly authorizes or emits operations');
invariant(relics.worldEditAuthorized === false && relics.operationCellCount === 0,
  'relic evidence unexpectedly authorizes or emits operations');
invariant(d05.sourceBindings?.phase0SurveyEvidence?.sha256 === sources.phase0Evidence.sha256,
  'D05 evidence has a stale Phase 0 binding');
invariant(d05.sourceBindings?.phase1DesignDecisions?.sha256 === sources.designDecisions.sha256,
  'D05 evidence has a stale design-decision binding');
invariant(d05.sourceBindings?.phase1GeometryCoordination?.sha256
  === sources.geometryCoordination.sha256,
  'D05 evidence has a stale geometry binding');
invariant(d05.sourceBindings?.protectedRelicClearance?.sha256
  === sources.protectedRelicClearance.sha256,
  'D05 evidence has a stale relic-clearance binding');
invariant(relics.sourceBindings?.phase0SurveyEvidence?.sha256 === sources.phase0Evidence.sha256,
  'relic evidence has a stale Phase 0 binding');
invariant(relics.sourceBindings?.phase1GeometryCoordination?.sha256
  === sources.geometryCoordination.sha256,
  'relic evidence has a stale geometry binding');

const phase0Snapshot = phase0.snapshots?.postGeneration;
const d05Snapshot = d05.sourceBindings?.immutablePhase0PostRegionSnapshot;
const relicSnapshot = relics.sourceBindings?.immutablePhase0PostRegionSnapshot;
invariant(phase0Snapshot?.sha256 === d05Snapshot?.sha256,
  'D05 snapshot identity does not match Phase 0');
invariant(phase0Snapshot?.sha256 === relicSnapshot?.sha256,
  'relic snapshot identity does not match Phase 0');

const expectedRelicKeys = ['igloo-east', 'igloo-west', 'shipwreck'];
invariant(d05.protectedRelicBufferCandidates?.length === expectedRelicKeys.length,
  'expected exactly three D05 relic candidates');
invariant(relics.relics?.length === expectedRelicKeys.length,
  'expected exactly three protected relic records');

const recommendedRelics = expectedRelicKeys.map((relicKey) => {
  const candidate = d05.protectedRelicBufferCandidates.find((item) => item.relicKey === relicKey);
  const clearance = relics.relics.find((item) => item.key === relicKey);
  invariant(candidate, `missing D05 candidate ${relicKey}`);
  invariant(clearance, `missing clearance record ${relicKey}`);
  invariant(candidate.protectedCore.coordinateSetSha256
    === clearance.evidenceBackedDefaultDenyCore.coordinateSetSha256,
  `protected core hash mismatch for ${relicKey}`);
  invariant(candidate.minimumAdjacencyBufferCandidate.status
    === 'EXACT_CANDIDATE_NOT_REVIEWED',
  `adjacency shell for ${relicKey} is no longer an unreviewed candidate`);
  invariant(candidate.exactReviewedBufferCellSet === null,
    `reviewed buffer unexpectedly exists for ${relicKey}`);

  const eastIgloo = relicKey === 'igloo-east';
  return {
    relicKey,
    structureId: candidate.structureId,
    currentFinding: candidate.presentCellFinding,
    recommendedDisposition: eastIgloo
      ? 'ABSENT_FABRIC_RECORDED_SITE_RESERVED_IN_PLACE'
      : 'PRESENT_RELIC_PRESERVE_IN_PLACE_NO_PUBLIC_ACCESS_COMMISSIONED',
    protectedCore: candidate.protectedCore,
    minimumPlanningExclusionShell: {
      positiveMarginBlocks: candidate.minimumAdjacencyBufferCandidate.positiveMarginBlocks,
      expandedBounds: candidate.minimumAdjacencyBufferCandidate.expandedBounds,
      cellCount: candidate.minimumAdjacencyBufferCandidate.cellCount,
      coordinateSetSha256:
        candidate.minimumAdjacencyBufferCandidate.coordinateSetSha256,
    },
    recommendedRule:
      'Reserve the union of the exact recorded core and exact one-cell shell. Do not construct, excavate, fill, stage, route access, or assign another scope inside it.',
    engineeringQualification:
      'This is a minimum planning exclusion, not a structural, groundwater, entrance-safety, exhibit-access, or construction-influence distance.',
    reconstructionAuthorized: false,
    relocationAuthorized: false,
    removalAuthorized: false,
    observationAccessAuthorized: false,
  };
});

const families = d05.immutableThreeDimensionalCensus?.families;
const routing = d05.drainageCoordinationModel?.topographicRoutingCandidate;
invariant(families?.water?.cellCount === 1_929_621, 'water census drifted');
invariant(families?.lava?.cellCount === 85_088, 'lava census drifted');
invariant(families?.frozen?.cellCount === 182_791, 'frozen census drifted');
invariant(families?.snow?.cellCount === 359_830, 'snow census drifted');
invariant(routing?.routesToBoundary?.columnCount + routing?.routesToInternalSink?.columnCount
  === routing?.columnCount, 'D8 routing partition is incomplete');

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d05-conservative-defaults',
  generatedAtUtc: GENERATED_AT,
  status: 'RECOMMENDATION_READY_D05_AND_G06_HOLD',
  purpose:
    'A deterministic recommendation packet for the sole project authority; not an accepted design, expert certification, release gate, or construction package.',
  sourceBindings: sources,
  immutableEvidenceIdentity: {
    snapshot: phase0Snapshot,
    mountainCoordinationVolume: d05.scope.mountainCoordinationVolume,
    fullHeightHydrologySurveyPrism: d05.scope.fullHeightHydrologySurveyPrism,
  },
  machineProvableFacts: {
    protectedRelicRecordCount: relics.relics.length,
    presentRelicFabricCount: relics.preservationFindings.relicBoundsWithPresentCells,
    absentRecordedRelicSites: relics.preservationFindings.relicBoundsWithoutPresentCells,
    exactCurrentFamilies: Object.fromEntries(
      Object.entries(families).map(([key, family]) => [key, {
        cellCount: family.cellCount,
        coordinateSetSha256: family.coordinateSetSha256,
        blockStateSetSha256: family.blockStateSetSha256,
      }]),
    ),
    waterComponentCount: d05.immutableThreeDimensionalCensus.waterComponents.componentCount,
    waterComponentManifestSha256:
      d05.immutableThreeDimensionalCensus.waterComponents.manifestSha256,
    lavaComponentCount: d05.immutableThreeDimensionalCensus.lavaComponents.componentCount,
    lavaComponentManifestSha256:
      d05.immutableThreeDimensionalCensus.lavaComponents.manifestSha256,
    d8SurfaceRoutingCandidate: {
      columnCount: routing.columnCount,
      routingRelationSha256: routing.routingRelationSha256,
      routesToBoundaryColumnCount: routing.routesToBoundary.columnCount,
      routesToInternalSinkColumnCount: routing.routesToInternalSink.columnCount,
      qualification:
        'A copied-surface topographic partition only; not rainfall, infiltration, groundwater, snowmelt, erosion, depression filling, or Minecraft fluid simulation.',
    },
  },
  soleAuthorityRecommendations: {
    adoptionState: 'PROPOSED_NOT_ACCEPTED',
    bufferPolicy: {
      id: 'CZ05-RELIC-MINIMUM-PLANNING-EXCLUSION-V1',
      recommendation:
        'Adopt each exact recorded structure-start core plus its exact one-cell Chebyshev shell as the minimum planning exclusion.',
      relics: recommendedRelics,
      defaultForUnknownEngineeringInfluence:
        'DEFAULT_DENY. No larger distance is inferred; any physical package remains blocked until its exact expert-reviewed construction and physics-influence cells clear the planning exclusions.',
      replacesExpertBufferDesign: false,
    },
    eastIglooDisposition: {
      recommendation: 'RESERVE_RECORDED_SITE_WITHOUT_RECONSTRUCTION_OR_EXHIBIT_CLAIM',
      rationale:
        'The immutable census proves that all 280 cells inside the recorded generated-start bound are air. Preserving the record and its one-cell planning exclusion avoids fabricating either a relic or permission to reuse the site.',
      futureConditionSurveyMayChangeDisposition: true,
      constructionAuthorized: false,
    },
    logicalOwnershipAndInterfaces: {
      recommendation: 'ADOPT_LOGICAL_CONTROL_OWNERS_PENDING_EXACT_CELL_COMPILATION',
      owners: [
        {
          ownerId: 'CZ05-PROTECTED-RELIC-CONTROL',
          ownsWhenAccepted:
            'the three exact protected cores and minimum planning-exclusion shells',
          precedence: 'VETO_OVER_CONSTRUCTION_AND_HYDROLOGY_INTERACTION',
        },
        {
          ownerId: 'CZ05-MOUNTAIN-HYDROLOGY-CONTROL',
          ownsWhenAccepted:
            'accepted current/future fluid, cryosphere, drainage, discharge, sump, retaining-water, erosion, dewatering, and hydrology-influence cell sets',
          precedence: 'VETO_OVER_UNCONTRACTED_CONSTRUCTION_INTERACTION',
        },
        {
          ownerId: 'CZ05-SCOPE-CONSTRUCTION-CONTROL',
          ownsWhenAccepted:
            'only exact direct construction cells assigned to each compiled scope',
          precedence: 'MUST_YIELD_AT_RELIC_AND_HYDROLOGY_INTERFACES',
        },
      ],
      interfaceRules: [
        'Every exact cell has at most one canonical owner; an interface contract never creates shared ownership.',
        'Relic-control cells are default-deny and cannot be transferred by a broad envelope or last-writer-wins rule.',
        'Every construction scope must submit direct, staging, access, and physics-influence sets to hydrology and relic control.',
        'No cross-boundary water, lava, snowmelt, sump, or discharge path is accepted without an exact receiver/outfall contract.',
        'An overlap is a HOLD requiring an exact redesign or explicitly accepted exception; it is never silently clipped.',
      ],
      exactCellOwnershipFrozen: false,
    },
    futureTerrainAndInfluenceModel: {
      modelId: 'CZ05-FUTURE-MOUNTAIN-STATE-V1',
      recommendation:
        'Require one deterministic exact-cell pre/post mountain model after the remaining geometry decisions close.',
      requiredExactSetFamilies: [
        'native-solid-retained',
        'excavation-direct',
        'fill-direct',
        'liner-and-retaining-direct',
        'surface-finish-direct',
        'construction-staging-and-access',
        'water-and-lava-direct-interaction',
        'frozen-and-snow-direct-interaction',
        'dewatering-and-sump-influence',
        'drainage-and-discharge-influence',
        'groundwater-infiltration-and-erosion-influence',
        'protected-relic-support-and-access-influence',
      ],
      rules: [
        'Every set is an explicit sorted integer cell set with a SHA-256 identity and one canonical owner.',
        'The proposed post-state solid function is total over every directly changed column; no rectangular coordination envelope is treated as material.',
        'No generic radius, terrain elevation, D8 direction, or current fluid component is promoted into an influence cell without authored deterministic rules.',
        'Unknown influence is default-deny and blocks compilation rather than becoming an empty set.',
        'The union of all direct and influence sets is checked against every protected core, planning exclusion, hydrology family, boundary interface, and relevant generated start.',
      ],
      exactModelAvailable: false,
    },
    preservationAndNoDiversionCriteria: {
      recommendation: 'ADOPT_ZERO_UNDECLARED_CHANGE_AND_DEFAULT_NO_DIVERSION',
      preR00DesignCriteria: [
        'No proposed direct, staging, access, or influence cell intersects a protected core or minimum planning exclusion.',
        'The default design changes zero current water, waterlogged, lava, frozen, or snow cells.',
        'The default design creates, removes, merges, splits, reroutes, blocks, exposes, heats, freezes, or discharges no fluid or cryosphere component.',
        'Every current boundary-touching component remains unmodified unless an exact receiver and interface contract is separately accepted.',
        'Every intended exception is enumerated by exact before/after cell sets, component accounting, owner, receiver, and acceptance test before D05 can resolve.',
        'Absence of evidence, an empty east-igloo bound, or a dry D8 candidate is never treated as construction clearance.',
      ],
      releaseLifecycleCriteria: [
        'Later G03-G19 evidence must bind the accepted design identity, exact operations, immutable source/post snapshots, rollback, and post-state accounting.',
        'Later execution and post-state evidence validates the accepted design but cannot retroactively resolve pre-R00 D05.',
      ],
      allowsNarrativeWaiver: false,
    },
  },
  remainingReadOnlySurveyAndDesignEvidence: [
    {
      id: 'D05-S01-RELIC-CONDITION-AND-ACCESS',
      classification: 'READ_ONLY_SURVEY',
      requirement:
        'Review the west igloo and shipwreck beyond their start bounds for template condition, support, entrances, surrounding voids, and any possible observation route; independently confirm the east recorded site remains fabric-absent.',
      canBeDerivedFromCurrentBoundedCensus: false,
    },
    {
      id: 'D05-S02-EXACT-FUTURE-MOUNTAIN-STATE',
      classification: 'DEPENDENT_OFFLINE_DESIGN',
      requirement:
        'Compile the exact future terrain, excavation, fill, retaining, surface, staging, access, and influence sets after the eleven geometry choices and integer setout close.',
      canBeDerivedFromCurrentBoundedCensus: false,
    },
    {
      id: 'D05-S03-HYDROLOGY-AND-GEOTECHNICAL-REVIEW',
      classification: 'EXPERT_DESIGN_ACCEPTANCE',
      requirement:
        'Review the exact future model for groundwater, infiltration, snowmelt, erosion, dewatering, sumps, retaining loads, discharge receivers, relic support, and no-diversion accounting.',
      canBeDerivedFromCurrentBoundedCensus: false,
    },
    {
      id: 'D05-S04-GLOBAL-EXACT-CLEARANCE',
      classification: 'DEPENDENT_OFFLINE_AUDIT',
      requirement:
        'Intersect the final exact direct and influence sets with all accepted relic exclusions and all 50 relevant generated-structure starts.',
      canBeDerivedFromCurrentBoundedCensus: false,
    },
  ],
  evidenceBoundary: {
    d05Resolved: false,
    g02Passed: false,
    g06Passed: false,
    g07Passed: false,
    ownerAcceptanceRecorded: false,
    expertAcceptanceRecorded: false,
    exactFutureInfluenceCellsAvailable: false,
    exactConstructionCellsAvailable: false,
    worldEditAuthorized: false,
    constructionOwnershipAuthorized: false,
    operationCellCount: 0,
    materialCellCount: 0,
  },
};

function markdownFor(current) {
  const familyRows = Object.entries(current.machineProvableFacts.exactCurrentFamilies)
    .map(([family, item]) => `| ${family} | ${item.cellCount.toLocaleString('en-US')} | \`${item.coordinateSetSha256}\` |`)
    .join('\n');
  const relicRows = current.soleAuthorityRecommendations.bufferPolicy.relics
    .map((relic) => `| ${relic.relicKey} | ${relic.currentFinding} | ${relic.protectedCore.cellCount.toLocaleString('en-US')} | ${relic.minimumPlanningExclusionShell.cellCount.toLocaleString('en-US')} | ${relic.recommendedDisposition} |`)
    .join('\n');
  const ownerRows = current.soleAuthorityRecommendations.logicalOwnershipAndInterfaces.owners
    .map((owner) => `| \`${owner.ownerId}\` | ${owner.ownsWhenAccepted} | ${owner.precedence} |`)
    .join('\n');
  const surveys = current.remainingReadOnlySurveyAndDesignEvidence
    .map((item) => `- **${item.id} · ${item.classification}:** ${item.requirement}`)
    .join('\n');

  return `# D05 conservative defaults for sole-authority review

Status: **RECOMMENDATION READY — D05, G02, G06, AND G07 REMAIN HOLD — OFFLINE ONLY**

This package converts the current immutable hydrology and protected-relic evidence into a conservative recommendation for the sole project authority. It does not accept its own recommendations, replace expert review, assign construction cells, emit operations, or authorize a world edit.

## What the copied snapshot proves

Bound post-snapshot: \`${current.immutableEvidenceIdentity.snapshot.sha256}\`.

| Family | Exact current cells | Coordinate-set SHA-256 |
|---|---:|---|
${familyRows}

There are ${current.machineProvableFacts.waterComponentCount.toLocaleString('en-US')} exact water components and ${current.machineProvableFacts.lavaComponentCount.toLocaleString('en-US')} exact lava components. The D8 relation partitions ${current.machineProvableFacts.d8SurfaceRoutingCandidate.columnCount.toLocaleString('en-US')} copied-surface columns, but remains a topographic candidate rather than rainfall, groundwater, snowmelt, erosion, or Minecraft-fluid simulation.

## Recommended relic policy

Adopt the exact recorded core plus exact one-cell Chebyshev shell as the **minimum planning exclusion**, not as an engineering safety distance.

| Relic | Current finding | Core cells | Shell cells | Recommended disposition |
|---|---|---:|---:|---|
${relicRows}

The east igloo should be recorded as an **absent-fabric reserved site**. Preserve its generated-start record and planning exclusion, but do not reconstruct it, claim an exhibit, relocate it, remove it, or reuse the site. The west igloo and shipwreck remain preserve-in-place records with no observation access commissioned.

Any structural, groundwater, entrance, exhibit, support, or construction-influence extent outside the one-cell shell remains unknown and default-deny until it is expressed as an exact reviewed set.

## Recommended logical ownership

These are design-control roles, not additional human decision-makers and not current cell ownership.

| Logical control owner | Future responsibility | Precedence |
|---|---|---|
${ownerRows}

Every cell may have at most one canonical owner. Protected-relic control vetoes construction and hydrology interaction; hydrology control vetoes uncontracted fluid, cryosphere, drainage, sump, discharge, or influence interaction. Overlaps remain HOLD rather than being clipped or assigned last-writer-wins.

## Recommended future-state model

After the outstanding geometry choices close, compile \`${current.soleAuthorityRecommendations.futureTerrainAndInfluenceModel.modelId}\` as explicit, sorted, hash-bound cell sets for retained native solid, direct excavation/fill/liner/surface work, staging/access, hydrology and cryosphere interaction, dewatering/sump/drainage/discharge, groundwater/infiltration/erosion, and relic support/access influence. Unknown influence is never an empty set.

The conservative baseline is **zero undeclared change and no diversion**: change no current fluid or cryosphere cells; merge, split, expose, block, reroute, heat, freeze, create, or remove no component; and cross no boundary without an exact receiver contract. A necessary exception must be exact, owned, modelled, and separately accepted before D05 can resolve.

## Evidence still needed

${surveys}

The first survey is a read-only condition/access review. The remaining work depends on the future exact geometry and cannot be truthfully derived from the present bounded census.

## Gate boundary

- D05 remains **HOLD**.
- G02, G06, and G07 remain **HOLD**.
- Sole-authority acceptance and expert acceptance are not recorded by this generator.
- Exact future influence and construction cells do not yet exist.
- Operation cells: **0**.
- Material cells: **0**.
- World edit authorized: **no**.

Reproduce with:

\`\`\`bash
node scripts/generate_combined_zones_d05_conservative_defaults.mjs
\`\`\`
`;
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdownFor(report));

console.log(JSON.stringify({
  status: report.status,
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  d05Resolved: report.evidenceBoundary.d05Resolved,
  operationCellCount: report.evidenceBoundary.operationCellCount,
  worldEditAuthorized: report.evidenceBoundary.worldEditAuthorized,
}, null, 2));
