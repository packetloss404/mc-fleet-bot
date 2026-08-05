#!/usr/bin/env node
/**
 * Generate the offline-only D02 sole-authority recommendation packet.
 *
 * This generator reads committed planning evidence only. It emits no operation
 * or material cells and never connects to Minecraft or any live service.
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

const GENERATED_AT = value('--generated-at', '2026-08-04T21:45:58Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-d02-civil-authority-packet.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-d02-civil-authority-packet.md',
));

const INPUTS = {
  authority: 'docs/masterplans/04-combined-complex/authority-reconciliation.json',
  decisions: 'docs/masterplans/05-combined-zones/phase1-design-decisions.json',
  c1Civil: 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json',
  c1Pilot: 'docs/masterplans/05-combined-zones/phase1-c1-pilot-coordination.json',
  phase0Evidence: 'docs/masterplans/05-combined-zones/phase0-survey-evidence.json',
  terrainProbe: 'docs/masterplans/05-combined-zones/corridor-terrain-probe.json',
  clearance: 'docs/masterplans/05-combined-zones/corridor-clearance.json',
  coordinates: 'docs/masterplans/05-combined-zones/site-coordinates.json',
  corridorMap: 'docs/masterplans/05-combined-zones/maps/east-corridor-plan.svg',
};

const ROLES = {
  authority: '04-to-05 authority and truth boundary',
  decisions: 'current D02 HOLD and six closure requirements',
  c1Civil: 'exact C1 alignment, profiles, diagnostics, and blocker register',
  c1Pilot: 'post-R00 physical-validation boundary',
  phase0Evidence: 'immutable copied-world snapshot identity and siting evidence',
  terrainProbe: 'accepted surface and rail-profile observations',
  clearance: 'catalog and C01 geometric truth boundary',
  coordinates: 'authored C1 points, radii, cross-section, and interfaces',
  corridorMap: 'human-readable C1 plan context',
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function fileBinding(relativePath, role) {
  const data = fs.readFileSync(path.join(ROOT, relativePath));
  return {
    path: relativePath,
    sha256: sha256(data),
    bytes: data.length,
    role,
  };
}

const authority = readJson(INPUTS.authority);
const decisions = readJson(INPUTS.decisions);
const civil = readJson(INPUTS.c1Civil);
const pilot = readJson(INPUTS.c1Pilot);
const phase0 = readJson(INPUTS.phase0Evidence);

const d02 = decisions.decisions.find((decision) => decision.id === 'D02');
const expectedBlockerIds = ['D02-B01', 'D02-B02', 'D02-B03', 'D02-B04', 'D02-B05', 'D02-B06'];

assert(
  authority.status === 'RECONCILED_FOR_DETAILED_DESIGN_NOT_AUTHORIZED_FOR_WORLD_EDITS'
    && authority.worldEditAuthorized === false,
  'Masterplan authority reconciliation is not in the accepted detailed-design state',
);
assert(d02?.status === 'HOLD', 'D02 must remain HOLD while generating this packet');
assert(d02.closureEvidenceRequired?.length === 6, 'D02 must retain exactly six pre-R00 closure requirements');
assert(JSON.stringify(civil.decisionD02.blockers.map((item) => item.id)) === JSON.stringify(expectedBlockerIds), 'C1 civil D02 blocker identity drift');
assert(civil.status === 'PARTIAL_PASS_D02_HOLD', 'C1 civil evidence must remain partial/HOLD');
assert(civil.offlineSafetyBoundary.operationCells.length === 0, 'C1 civil evidence unexpectedly contains operation cells');
assert(civil.offlineSafetyBoundary.materialCells.length === 0, 'C1 civil evidence unexpectedly contains material cells');
assert(civil.immutableSnapshot.sha256 === phase0.snapshots.postGeneration.sha256, 'C1 civil and Phase 0 snapshot identities disagree');
assert(pilot.decision?.sequencingBoundary?.resolvesD02 === false, 'R01 pilot must not resolve D02');
assert(pilot.decision?.operationCellCount === 0, 'R01 coordination evidence unexpectedly contains operation cells');

const sourceBindings = Object.entries(INPUTS).map(([key, relativePath]) => (
  fileBinding(relativePath, ROLES[key])
));

const surveyProgram = [
  {
    id: 'D02-S01-C1-FULL-HEIGHT-WORLD-CENSUS',
    status: 'REQUIRED_NOT_YET_PERFORMED',
    mode: 'READ_ONLY_IMMUTABLE_COPIED_SAVE',
    purpose: 'Replace surface-only assumptions with exact terrain, fluid, block-entity, generated-structure, and void evidence below and beside the complete C1 land take.',
    minimumScope: [
      'Every plan column in the hash-bound 80-block total land take, full world height Y=-64..319.',
      'A deterministic one-chunk horizontal influence halo around that column union.',
      'Block states, waterlogged properties, fluid connectivity, block entities, POI records, generated-structure starts, and missing/unreadable chunks.',
    ],
    requiredOutputs: [
      'immutable full-save identity including region, entities, poi, and level.dat',
      'exact surveyed-cell and influence-cell hashes',
      'fluid-component and protected-feature collision registers',
      'candidate-specific cut, fill, foundation, retaining, tunnel, bridge, and culvert constraint sets',
    ],
    prohibitedActions: ['live connection', 'chunk generation', 'world mutation', 'operation generation'],
  },
  {
    id: 'D02-S02-C01-ISSUE-002-INTERFACE-SURVEY',
    status: 'REQUIRED_NOT_YET_PERFORMED',
    mode: 'READ_ONLY_CURRENT_FULL_SAVE_AND_CATALOG_RECONCILIATION',
    purpose: 'Establish the current C01 east-stack, owner-tunnel, road, parking, entrance, and surface conditions that catalog geometry cannot prove.',
    minimumScope: [
      'All eight C01 features compared by the civil artifact and the complete C1 overlap/influence columns.',
      'ISSUE-002 road, parking-recovery, relocation, and sunken-entrance assertions.',
      'Present block states, block entities, protected inventory, entities/POI, usable interfaces, exact exclusion cells, and current canonical ownership.',
    ],
    requiredOutputs: [
      'immutable current full-save identity',
      'exact C01 feature and interface cell-set hashes',
      'ISSUE-002 finding-by-finding disposition without inferred relocation or recovery',
      'sole-authority ownership and loading/exclusion acceptance record',
    ],
    prohibitedActions: ['live connection', 'world mutation', 'invented interface coordinates', 'closing ISSUE-002 from catalog bounds alone'],
  },
  {
    id: 'D02-S03-C1-HYDROLOGY-OUTFALL-SURVEY',
    status: 'REQUIRED_NOT_YET_PERFORMED',
    mode: 'READ_ONLY_IMMUTABLE_COPIED_SAVE_MODEL',
    purpose: 'Trace current fluid components and terrain fall before selecting any collection, culvert, bridge, erosion-control, or outfall solution.',
    minimumScope: [
      'The D02-S01 land-take and influence cells.',
      'Every water/lava/waterlogged component touching that scope and every candidate discharge path to a stable receiving component.',
      'The frozen road south-drain and rail north-cess collection geometry.',
    ],
    requiredOutputs: [
      'exact component and catchment hashes',
      'no-diversion/no-unowned-discharge proof for the selected option',
      'capacity assumptions stated as Minecraft-domain design rules',
      'sole-authority outfall owner and preservation acceptance record',
    ],
    prohibitedActions: ['bulk fluid fill', 'unbounded fluid simulation claims', 'world mutation', 'operation generation'],
  },
  {
    id: 'D02-S04-OPTION-SPECIFIC-QUANTITY-TAKEOFF',
    status: 'WAITING_ON_S01_S03_AND_ACCEPTED_TYPOLOGIES',
    mode: 'DETERMINISTIC_OFFLINE_COMPILATION',
    purpose: 'Convert accepted exact formation, structure, slope, unsuitable-material, drainage, and exclusion rules into construction quantities and a mass-haul schedule.',
    minimumScope: [
      'Every selected option-specific design cell and interaction cell, without creating release operations.',
      'Separate cut, fill, lining, structure, drainage, unsuitable, spoil, borrow, and protected/no-touch totals.',
    ],
    requiredOutputs: [
      'one-owner exact design-cell manifest',
      'deterministic quantities with component hashes and zero duplicate ownership',
      'conservative no-credit mass-haul balance and declared staging assumptions',
      'independent recomputation with byte-identical totals',
    ],
    prohibitedActions: ['treating current surface-datum diagnostics as a takeoff', 'world mutation', 'forward or rollback operations'],
  },
];

const recommendations = [
  {
    blockerId: 'D02-B01',
    discipline: 'geotechnical_subsurface_groundwater_foundations',
    readiness: 'HOLD_READ_ONLY_FIELD_SURVEY_REQUIRED',
    recommendedSoleAuthorityDefault: 'Use Minecraft-domain fail-closed ground rules: no unsupported blind excavation, no terrain-strength or groundwater assumption, no bulk fill across fluid or void components, and no foundation type until the full-height influence census selects a hash-bound bridge, retained cut, tunnel, culvert, embankment, or at-grade treatment.',
    currentWorldEvidenceCanEstablish: [
      `The immutable Phase 0 snapshot identity is ${civil.immutableSnapshot.sha256}.`,
      `The exact current alignment has ${civil.horizontalAlignment.referencePointCount} reference points and hash ${civil.horizontalAlignment.referenceCenterlineColumnSetSha256}.`,
      'Surface elevations, surface water observations, exact road/rail profiles, and diagnostic cut/fill depths are reproducible.',
    ],
    currentWorldEvidenceCannotEstablish: [
      'subsurface voids and fluid continuity across the complete civil influence volume',
      'an accepted treatment or foundation type at every station',
      'future excavation/fill effects',
    ],
    requiredSurveyIds: ['D02-S01-C1-FULL-HEIGHT-WORLD-CENSUS'],
    ownerAcceptanceAfterSurvey: 'Accept one exact treatment class and its design criteria for every contiguous treatment run; preserve default-deny where the survey is incomplete.',
  },
  {
    blockerId: 'D02-B02',
    discipline: 'structural_c01_data_district',
    readiness: 'HOLD_READ_ONLY_FIELD_SURVEY_AND_DESIGN_CHECK_REQUIRED',
    recommendedSoleAuthorityDefault: 'Treat structure as Minecraft geometry rather than a real-world code claim: keep the complete offsets -30..-18 rail strip empty, clear-span every crossing, assume no load-transfer permission over C01, use no pier/abutment/utility/drainage cell inside protected strips, and reject any option lacking deterministic headroom, support-shell, collision, route, and independent recomputation checks.',
    currentWorldEvidenceCanEstablish: [
      `The independent highway profile is Y${civil.verticalProfiles.highway.minimumY}..Y${civil.verticalProfiles.highway.maximumY} at maximum grade ${civil.verticalProfiles.highway.maximumStepGrade}.`,
      `The rail profile is Y${civil.verticalProfiles.rail.minimumY}..Y${civil.verticalProfiles.rail.maximumY} at maximum grade ${civil.verticalProfiles.rail.maximumStepGrade}.`,
      `The reserved rail strip is ${civil.crossSection.reservedRailStrip.widthOffsetsInclusive} offsets wide and currently has zero material cells.`,
      'Eight catalogued C01 interfaces have exact plan-gap/overlap and surface-datum comparisons.',
    ],
    currentWorldEvidenceCannotEstablish: [
      'current C01 excavation limits, protected cells, or accepted loading/exclusion rules',
      'bridge, retaining, culvert, and tunnel typologies for the full-height terrain state',
      'usable current-world clearances where ISSUE-002 remains open',
    ],
    requiredSurveyIds: ['D02-S01-C1-FULL-HEIGHT-WORLD-CENSUS', 'D02-S02-C01-ISSUE-002-INTERFACE-SURVEY'],
    ownerAcceptanceAfterSurvey: 'Accept one hash-bound structural geometry and exclusion contract per treatment run, including a separately recomputed Data District clear span and every C01 interface.',
  },
  {
    blockerId: 'D02-B03',
    discipline: 'hydraulic_drainage_outfall',
    readiness: 'HOLD_READ_ONLY_FIELD_SURVEY_REQUIRED',
    recommendedSoleAuthorityDefault: 'Preserve existing fluid components by default: keep road and rail collection separate, permit no bulk diversion or unowned discharge, prefer clear-span/culvert continuity over fill, and accept no outfall until its exact path, receiving component, erosion treatment, owner, and no-adverse-diversion check are hash-bound.',
    currentWorldEvidenceCanEstablish: [
      `Road collection geometry hash ${civil.drainage.roadCollection.columnSetSha256}.`,
      `Rail collection geometry hash ${civil.drainage.railCollection.columnSetSha256}.`,
      `${civil.diagnosticEarthworkVolumes.highway.surfaceWaterColumns} highway surface-water columns and ${civil.diagnosticEarthworkVolumes.railStrip.surfaceWaterColumns} reserved-rail surface-water columns are identified.`,
    ],
    currentWorldEvidenceCannotEstablish: [
      'complete connected fluid components and groundwater-like void behavior below the surface',
      'future grading effects or an accepted discharge path',
      'outfall ownership and preservation acceptance',
    ],
    requiredSurveyIds: ['D02-S01-C1-FULL-HEIGHT-WORLD-CENSUS', 'D02-S03-C1-HYDROLOGY-OUTFALL-SURVEY'],
    ownerAcceptanceAfterSurvey: 'Accept the exact catchment, collection, crossing, outfall, and no-diversion contract; retain HOLD if any receiving component or owner is unknown.',
  },
  {
    blockerId: 'D02-B04',
    discipline: 'issue_002_c01_interface_ownership',
    readiness: 'HOLD_AUTHORITATIVE_READ_ONLY_FIELD_SURVEY_REQUIRED',
    recommendedSoleAuthorityDefault: 'Make C01 default-deny: preserve every catalogued C01 volume plus the exact C1 overlap/influence cells, infer no relocation, recovered parking, road, entrance, load capacity, or permission, and assign no construction ownership across the seam until ISSUE-002 is resolved from a current complete read-only survey.',
    currentWorldEvidenceCanEstablish: [
      'The Owner Tunnel Detour overlaps the C1 land take in plan but has no surface-datum collision in the current model.',
      'The remaining catalogued C01 features have exact plan gaps.',
      'Catalog geometry identifies the contested seam and prevents a false plan-clearance claim.',
    ],
    currentWorldEvidenceCannotEstablish: [
      'the claimed C01 relocation, road, parking recovery, or sunken entrance',
      'present-day protected/block-entity cells and usable interfaces',
      'canonical ownership, loading permission, or excavation clearance',
    ],
    requiredSurveyIds: ['D02-S02-C01-ISSUE-002-INTERFACE-SURVEY'],
    ownerAcceptanceAfterSurvey: 'As sole authority, resolve every ISSUE-002 assertion explicitly and accept exact owner, exclusion, loading, and interface cell sets; silence or an inferred match is a HOLD.',
  },
  {
    blockerId: 'D02-B05',
    discipline: 'curve_visual_staircase',
    readiness: 'READY_FOR_SOLE_AUTHORITY_VISUAL_ACCEPTANCE_FROM_CURRENT_EVIDENCE',
    recommendedSoleAuthorityDefault: 'Accept the R140/R120/R140 exact-radius integer raster as the controlling C1 centerline. Retain the authored 1:16→1:12→1:8→1:6→1:8→1:12→1:16 sequence as a non-controlling surface-detail rhythm that may be fitted inside the frozen reservation without moving the centerline or rail strip.',
    currentWorldEvidenceCanEstablish: [
      `The ${civil.horizontalAlignment.curves.length} curves and their run vectors are frozen in ${INPUTS.c1Civil}.`,
      `The complete centerline is contiguous, has ${civil.horizontalAlignment.referencePointCount} points, and is hash-bound.`,
      `The human plan context is bound at ${INPUTS.corridorMap}.`,
    ],
    currentWorldEvidenceCannotEstablish: [
      'the sole authority\'s subjective visual acceptance',
      'future block palette and roadside detailing, which remain later design choices',
    ],
    requiredSurveyIds: [],
    ownerAcceptanceAfterSurvey: 'No field survey is required. Record explicit sole-authority acceptance of this default or request a revised, hash-bound raster; either choice still authorizes no world edit.',
  },
  {
    blockerId: 'D02-B06',
    discipline: 'quantities_mass_haul',
    readiness: 'HOLD_ACCEPTED_TYPOLOGIES_AND_DETERMINISTIC_TAKEOFF_REQUIRED',
    recommendedSoleAuthorityDefault: 'Use the present prismatic quantities only to compare options. Give no spoil-reuse, bulking, unsuitable-material, borrow, disposal, or terrain-balancing credit until exact design cells exist; then require a byte-reproducible one-owner takeoff and use the conservative no-credit mass-haul balance for planning.',
    currentWorldEvidenceCanEstablish: [
      `Highway surface-datum diagnostic: cut ${civil.diagnosticEarthworkVolumes.highway.cutColumnBlocks}, fill ${civil.diagnosticEarthworkVolumes.highway.fillColumnBlocks}.`,
      `Reserved rail-strip diagnostic: cut ${civil.diagnosticEarthworkVolumes.railStrip.cutColumnBlocks}, fill ${civil.diagnosticEarthworkVolumes.railStrip.fillColumnBlocks}.`,
      `Total-land-take datum diagnostic: cut ${civil.diagnosticEarthworkVolumes.totalLandTakeDatum.cutColumnBlocks}, fill ${civil.diagnosticEarthworkVolumes.totalLandTakeDatum.fillColumnBlocks}.`,
    ],
    currentWorldEvidenceCannotEstablish: [
      'formation thickness, side slopes, selected structures/voids, topsoil, or unsuitable-material handling',
      'exact construction quantities before treatment typologies and design cells are frozen',
      'mass-haul reuse or disposal assumptions',
    ],
    requiredSurveyIds: ['D02-S01-C1-FULL-HEIGHT-WORLD-CENSUS', 'D02-S03-C1-HYDROLOGY-OUTFALL-SURVEY', 'D02-S04-OPTION-SPECIFIC-QUANTITY-TAKEOFF'],
    ownerAcceptanceAfterSurvey: 'Accept the formation, slope, material, quantity, and mass-haul rules together with their exact design-cell and independent-recomputation hashes.',
  },
];

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d02-civil-authority-packet',
  generatedAtUtc: GENERATED_AT,
  status: 'RECOMMENDATIONS_READY_D02_HOLD',
  purpose: 'Conservative recommendation and read-only survey program for the sole human authority to close D02 without confusing pre-R00 design acceptance with R01 physical validation.',
  authorityModel: {
    soleHumanAuthority: 'project owner',
    additionalDecisionMakersRequired: false,
    agentRecommendationsAreAcceptance: false,
    explicitSoleAuthorityAcceptanceRequired: true,
    technicalEvidenceMayBeGeneratedAutonomously: true,
    realWorldEngineeringOrCodeComplianceClaimed: false,
  },
  safetyBoundary: {
    localCommittedInputsOnly: true,
    liveCallsPerformed: [],
    operationCells: [],
    materialCells: [],
    operationCellCount: 0,
    worldEditAuthorized: false,
    physicalBuildAuthorized: false,
    d02Resolved: false,
    r00Accepted: false,
  },
  sourceBindings,
  evidenceIdentity: {
    immutablePhase0Snapshot: civil.immutableSnapshot,
    c1ReferenceCenterline: {
      pointCount: civil.horizontalAlignment.referencePointCount,
      coordinateSetSha256: civil.horizontalAlignment.referenceCenterlineColumnSetSha256,
      endpoints: civil.horizontalAlignment.endpoints,
    },
    currentD02Status: d02.status,
    currentR00G02Status: d02.status,
  },
  acceptanceBoundary: {
    d02MayResolveOnlyFrom: 'PRE_R00_DESIGN_AND_EXTERNAL_ACCEPTANCE_EVIDENCE',
    d02MustRemainHoldInThisPacket: true,
    r00PrerequisiteForPhysicalPilot: true,
    r01ResolvesD02: false,
    deferredToR01AndLater: [
      'source guards',
      'forward and rollback operations',
      'preflight',
      'live entity clearance',
      'authorization',
      'physical pilot',
      'execution',
      'route QA',
      'rollback verification',
      'post-state QA',
    ],
  },
  recommendationSummary: {
    blockerCount: recommendations.length,
    readyForImmediateSoleAuthorityReview: recommendations.filter((item) => item.readiness.startsWith('READY_')).map((item) => item.blockerId),
    readOnlySurveyOrDesignEvidenceStillRequired: recommendations.filter((item) => item.requiredSurveyIds.length > 0).map((item) => item.blockerId),
    recommendedImmediateDecision: 'Accept D02-B05 exact-radius raster as controlling alignment and non-controlling staircase detail, or request a revised raster.',
    recommendedDefaultForAllOtherItems: 'Adopt the stated fail-closed policy now, then accept the item only after its listed read-only survey and deterministic design outputs pass.',
  },
  recommendations,
  readOnlySurveyProgram: surveyProgram,
  nextAutonomousSequence: [
    'Generate D02-S01 full-height C1 world census from a complete immutable copied save.',
    'Generate D02-S02 C01/ISSUE-002 interface survey from the same complete save and catalog evidence.',
    'Generate D02-S03 C1 hydrology/outfall candidate evidence.',
    'Compile and independently check treatment options against the accepted fail-closed defaults.',
    'Generate D02-S04 option-specific quantities only after exact typologies and design cells are selected.',
    'Return one compact sole-authority acceptance sheet; keep D02 HOLD until every acceptance is explicit and hash-bound.',
  ],
  finalGate: {
    status: 'HOLD_D02_NOT_RESOLVED_NO_WORLD_EDITS',
    reason: 'One visual choice is ready for sole-authority review; five acceptances still depend on bounded read-only survey or deterministic design evidence.',
    worldEditAuthorized: false,
  },
};

function markdownList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

const markdown = `# Phase 1 D02 C1 civil sole-authority packet\n\n`
  + `**Status:** ${report.finalGate.status}  \n`
  + `**Generated:** ${GENERATED_AT}  \n`
  + `**Immutable evidence snapshot:** \`${report.evidenceIdentity.immutablePhase0Snapshot.sha256}\`\n\n`
  + `You are the sole human authority. No additional decision-maker is required. This packet gives conservative defaults and turns the remaining technical work into bounded, read-only surveys and deterministic checks. It does **not** accept a choice on your behalf, resolve D02, authorize R00, or authorize a world edit.\n\n`
  + `## Recommended decision now\n\n`
  + `Accept the exact R140/R120/R140 integer raster as the controlling C1 alignment. Keep the authored \`1:16→1:12→1:8→1:6→1:8→1:12→1:16\` staircase only as a non-controlling surface-detail rhythm. This preserves the hash-bound centerline and empty rail strip while allowing later visual detailing. No field survey is needed for this subjective choice.\n\n`
  + `## Six D02 acceptances\n\n`
  + `| Blocker | Readiness | Conservative default | What is still needed |\n`
  + `|---|---|---|---|\n`
  + recommendations.map((item) => {
    const required = item.requiredSurveyIds.length ? item.requiredSurveyIds.join(', ') : 'Explicit sole-authority visual acceptance only';
    return `| ${item.blockerId} | ${item.readiness} | ${item.recommendedSoleAuthorityDefault} | ${required} |`;
  }).join('\n')
  + `\n\n## What the current world evidence proves\n\n`
  + `- Exact C1 reference setout: ${civil.horizontalAlignment.referencePointCount.toLocaleString('en-US')} points, hash \`${civil.horizontalAlignment.referenceCenterlineColumnSetSha256}\`.\n`
  + `- Exact rail profile: Y${civil.verticalProfiles.rail.minimumY}..Y${civil.verticalProfiles.rail.maximumY}, maximum grade ${civil.verticalProfiles.rail.maximumStepGrade}.\n`
  + `- Independent highway profile: Y${civil.verticalProfiles.highway.minimumY}..Y${civil.verticalProfiles.highway.maximumY}, maximum grade ${civil.verticalProfiles.highway.maximumStepGrade}.\n`
  + `- Exact 56-block reservation, 80-block land take, empty 13-block rail strip, surface-derived treatment runs, and diagnostic quantities.\n`
  + `- Exact plan-gap or overlap comparisons for every catalogued C01 interface.\n\n`
  + `It does not prove the full subsurface/influence volume, current C01 conditions under ISSUE-002, accepted structural typologies, fluid/outfall behavior after grading, or construction quantities.\n\n`
  + `## Read-only survey program\n\n`
  + surveyProgram.map((survey) => `### ${survey.id}\n\n**Status:** ${survey.status}  \n**Mode:** ${survey.mode}\n\n${survey.purpose}\n\nMinimum scope:\n\n${markdownList(survey.minimumScope)}\n\nRequired outputs:\n\n${markdownList(survey.requiredOutputs)}`).join('\n\n')
  + `\n\n## Autonomous sequence\n\n`
  + report.nextAutonomousSequence.map((item, index) => `${index + 1}. ${item}`).join('\n')
  + `\n\n## Release boundary\n\nD02 may close only from accepted pre-R00 design evidence. Source guards, operations, preflight, live clearance, authorization, the physical pilot, rollback, route QA, and post-state QA are later gates. R01 validates the accepted design after R00; it cannot resolve D02.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  status: report.status,
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  sourceBindingCount: sourceBindings.length,
  immediateReviewBlockers: report.recommendationSummary.readyForImmediateSoleAuthorityReview,
  operationCellCount: 0,
  d02Resolved: false,
  worldEditAuthorized: false,
}, null, 2));
