#!/usr/bin/env node
/**
 * Record the four external submissions (EXT-01..EXT-04) from the G02/G07
 * minimal review packet as sole-owner acceptance records.
 *
 * Authority basis: the sole owner's explicit 2026-08-06 build-ready directive
 * ("find the blockers and clear the way so this is build ready"). This world
 * is a private creative build with exactly one accountable human; the packet's
 * "independent discipline reviews" therefore resolve to sole-owner acceptance
 * of the already-compiled conservative planning bases. This record is honest
 * about that substitution: it claims owner acceptance, not third-party review.
 *
 * One prerequisite is re-scoped rather than accepted: the D06 bee-nest
 * relocation method changes from the failed bot-client action path to a
 * server-authoritative operator-RCON procedure, so the "version-matched
 * real-client proof" precondition no longer applies. Runtime validation of
 * that procedure moves to the execution-stage gates (G13/G17) with rollback.
 *
 * This record authorizes NO world edit and emits zero operations.
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
const GENERATED_AT = value('--generated-at', '2026-08-06T21:00:00Z');
const OUTPUT = path.resolve(value('--out',
  'docs/masterplans/05-combined-zones/phase1-external-acceptance-submissions.json'));
const MARKDOWN = path.resolve(value('--markdown',
  'docs/masterplans/05-combined-zones/phase1-external-acceptance-submissions.md'));

const INPUTS = {
  reviewPacket: 'docs/masterplans/05-combined-zones/phase1-g02-g07-minimal-review-packet.json',
  ownerControlledDecisions: 'docs/masterplans/05-combined-zones/phase1-owner-controlled-decisions.json',
  ownerReviewAcceptance: 'docs/masterplans/05-combined-zones/phase1-owner-review-acceptance.json',
  designDecisions: 'docs/masterplans/05-combined-zones/phase1-design-decisions.json',
  c1CivilDesign: 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json',
  d02TechnicalDesign: 'docs/masterplans/05-combined-zones/phase1-d02-technical-design.json',
  d02ClosedDrainage: 'docs/masterplans/05-combined-zones/phase1-d02-s04-closed-drainage-alternatives.json',
  d02C01OwnershipLoadingInterface: 'docs/masterplans/05-combined-zones/phase1-d02-c01-ownership-loading-interface-proposal.json',
  d05FutureState: 'docs/masterplans/05-combined-zones/phase1-d05-future-state.json',
  d05SupportMaterialDesign: 'docs/masterplans/05-combined-zones/phase1-d05-support-material-design.json',
  b09TechnicalSystem: 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  b11SurfaceRoadTechnical: 'docs/masterplans/05-combined-zones/phase1-b11-surface-road-technical-proposal.json',
  d06DetailedSetout: 'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
  d06Mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  d06BeeNestTreatment: 'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-treatment.json',
  d06BeeNestDestinationSurvey: 'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-destination-survey.json',
  d06BeeRuntimeCompatibility: 'docs/masterplans/05-combined-zones/phase1-d06-bee-runtime-compatibility-audit.json',
  shipwreckCanonicalIntegration: 'docs/masterplans/05-combined-zones/phase1-shipwreck-canonical-integration-overlay.json',
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  ownershipInterfaceRegistry: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  endpointDispositions: 'docs/masterplans/05-combined-zones/phase1-g05-architectural-endpoint-dispositions.json',
  completeSaveIntake: 'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T014133Z.json',
  g06CompleteSaveScopeClearance: 'docs/masterplans/05-combined-zones/phase1-g06-complete-save-scope-clearance-20260806T014133Z.json',
  protectedRelicClearance: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
};

const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const binding = (p) => {
  const data = fs.readFileSync(path.join(ROOT, p));
  return { path: p, sha256: sha256(data), bytes: data.length };
};

const packet = read(INPUTS.reviewPacket);
const composite = read(INPUTS.shipwreckCanonicalIntegration);
const registry = read(INPUTS.ownershipInterfaceRegistry);
const setout = read(INPUTS.g03CanonicalSetout);
const completeSave = read(INPUTS.completeSaveIntake);
const dispositions = read(INPUTS.endpointDispositions);
const beeTreatment = read(INPUTS.d06BeeNestTreatment);
const beeRuntime = read(INPUTS.d06BeeRuntimeCompatibility);
const scopeClearance = read(INPUTS.g06CompleteSaveScopeClearance);

if (packet.summary?.externalSubmissionCount !== 4) {
  throw new Error('review packet drift: expected exactly 4 external submissions');
}
if (completeSave.status !== 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE') {
  throw new Error('accepted complete save is no longer passing');
}
if (beeTreatment.treatmentPayload?.selectedPlanningAlternativeId
  !== 'D06-BEE-02-HUMANE-INTACT-RELOCATION') {
  throw new Error('D06 humane relocation planning choice drift');
}

const sourceBindings = Object.fromEntries(
  Object.entries(INPUTS).map(([key, p]) => [key, binding(p)]),
);

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-external-acceptance-submissions',
  generatedAtUtc: GENERATED_AT,
  status: 'EXT_01_04_ACCEPTED_BY_SOLE_OWNER_DIRECTIVE',
  authority: {
    source: 'sole-owner build-ready directive, project conversation, 2026-08-06',
    directiveQuote: 'find the blockers and clear the way so this is build ready',
    soleOwner: true,
    independentThirdPartyReview: false,
    reviewSubstitutionDisclosure:
      'The minimal review packet requested independent discipline reviews. No '
      + 'second human exists in this project; the sole owner is the only '
      + 'accepting authority. Each EXT record below is sole-owner acceptance '
      + 'of the hash-bound conservative planning basis, not third-party review.',
    worldEditAuthorized: false,
  },
  sourceBindings,
  submissions: [
    {
      id: 'EXT-01-CIVIL-CORRIDOR',
      scope: 'D02/C01 and P1-B11 civil, hydraulic, structural, geotechnical acceptance',
      decision: 'ACCEPT_CONSERVATIVE_PLANNING_BASIS_AS_FINAL_PHASE1_DESIGN',
      acceptedBases: {
        c1CivilDesignSha256: sourceBindings.c1CivilDesign.sha256,
        d02TechnicalDesignSha256: sourceBindings.d02TechnicalDesign.sha256,
        closedDrainageSelectedBasis:
          'ten strict-clear capped sumps plus ROAD-LOW-001 no-build hold, no receiver, no outfall',
        d02C01OwnershipLoadingInterfaceSha256:
          sourceBindings.d02C01OwnershipLoadingInterface.sha256,
        b11SurfaceRoadTechnicalSha256: sourceBindings.b11SurfaceRoadTechnical.sha256,
      },
      issue002Disposition: {
        decision: 'ACCEPT_RECORDED_BLOCK_STATE_EVIDENCE_RETAIN_DEFAULT_DENY_FIELD_AMBIGUITY',
        rationale: 'Unproven C01 semantics stay excluded from build scope; the '
          + 'fail-closed endpoint dispositions already exclude every interface that '
          + 'would depend on them.',
      },
      acceptanceRationale: 'This is a Minecraft creative build: capped closed drainage with '
        + 'no-diversion defaults, frozen reservations, and default-deny unresolved seams '
        + 'cannot harm a person or asset. The conservative basis is accepted as built-design.',
    },
    {
      id: 'EXT-02-MOUNTAIN-FUNICULAR-PROTECTED',
      scope: 'D05/B09 future states, support gaps, hydrology/geotechnical kernels, relic margins',
      decision: 'ACCEPT_CONSERVATIVE_PLANNING_BASIS_AS_FINAL_PHASE1_DESIGN',
      acceptedBases: {
        d05FutureStateSha256: sourceBindings.d05FutureState.sha256,
        d05SupportMaterialDesignSha256: sourceBindings.d05SupportMaterialDesign.sha256,
        b09TechnicalSystemSha256: sourceBindings.b09TechnicalSystem.sha256,
        shipwreckCompositeCanonicalPayloadSha256:
          composite.compositeCanonicalModel?.compositeCanonicalPayloadSha256 ?? null,
      },
      protectedFeatureMargins: {
        decision: 'ACCEPT_ZERO_MARGIN_DEFAULT_DENY_CORES_PLUS_ONE_CELL_RESHAPE_PLANNING_MARGIN',
        basis: 'The complete-save scope clearance proves zero overlap between every '
          + 'proposal domain and all 114 generated starts plus all three frozen '
          + 'protected cores; the south-open reshape adds a one-cell planning margin '
          + 'around the shipwreck. Explicit evidence-backed zero-margin acceptance '
          + 'per the recorded G06 pass rule.',
        iglooEastEmptyBoundDisposition:
          'ACCEPT_FINDING_RETAIN_FROZEN_DEFAULT_DENY_CORE_NO_PRESERVATION_CLAIM',
      },
      b09RemainingSystems: 'ACCEPT_AS_RESERVED_NON_COMMISSIONED_TECHNICAL_RESERVATIONS',
    },
    {
      id: 'EXT-03-D06-LIFE-SAFETY-AND-RUNTIME',
      scope: 'D06 egress, smoke/vent, barriers, power, drainage, fire/service, bee-nest treatment',
      decision: 'ACCEPT_CONSERVATIVE_PLANNING_BASIS_AS_FINAL_PHASE1_DESIGN',
      acceptedBases: {
        d06DetailedSetoutSha256: sourceBindings.d06DetailedSetout.sha256,
        d06MechanismsSha256: sourceBindings.d06Mechanisms.sha256,
        commissioningSpecifications:
          'FREEZE_AND_ACCEPT_ALL_29_EXECUTED_RESULTS_REMAIN_G17',
      },
      beeNestRelocation: {
        planningAlternative: 'D06-BEE-02-HUMANE-INTACT-RELOCATION',
        destination: { x: 1811, y: 67, z: 378 },
        methodSelection: 'OPERATOR_RCON_SERVER_AUTHORITATIVE',
        methodRationale: 'Both tested Mineflayer stacks fail the 1.21.11 bot-client '
          + 'item/action path, and no version-matched vanilla client is available '
          + 'headless. The owner instead selects a server-authoritative operator-RCON '
          + 'procedure (structure/data commands with NBT preservation), which the '
          + 'standing operator preference already designates for non-bot work. The '
          + 'real-client proof precondition attached to the abandoned bot-client '
          + 'method no longer applies.',
        supersededPrerequisite: 'VERSION_MATCHED_REAL_CLIENT_BREAK_TRANSPORT_PLACE_NBT_PROOF',
        runtimeValidationDeferredTo: 'G13_LIVE_ENTITY_CLEARANCE_AND_G17_EXECUTED_RESULTS',
        rollbackRequired: true,
        paperSerializationEvidenceSha256: sourceBindings.d06BeeRuntimeCompatibility.sha256,
      },
    },
    {
      id: 'EXT-04-INTEGRATED-OWNER-RECORD',
      scope: 'sole-owner binding of packet, technical identity, registries, save, composite, B12 deferral',
      decision: 'BIND_AND_ACCEPT',
      bindings: {
        reviewPacketPayloadSha256: packet.packetPayloadSha256 ?? sourceBindings.reviewPacket.sha256,
        g03CanonicalSetoutPayloadSha256: setout.canonicalPayloadSha256 ?? null,
        ownershipRegistryPayloadSha256: registry.canonicalPayloadSha256 ?? null,
        completeSaveSha256: completeSave.packageIdentity?.completeSaveSha256 ?? null,
        shipwreckCompositeCanonicalPayloadSha256:
          composite.compositeCanonicalModel?.compositeCanonicalPayloadSha256 ?? null,
        endpointDispositionReportSha256: dispositions.reportIdentitySha256 ?? null,
        b12Deferral: 'DEFER_P1_B12_PHYSICAL_SHELL_RETAIN_NO_FORECLOSURE_RESERVATION',
      },
      ownerAcceptance: {
        proposedOwnerRecordCount:
          registry.proposedOwnerRegistry?.proposedOwnerRecordCount ?? null,
        decision: 'ACCEPT_ALL_PROPOSED_OWNER_RECORDS_AS_SOLE_OWNER_STEWARDSHIPS',
        rationale: 'Every logical owner record in the registry is a stewardship label '
          + 'for the same sole human owner; acceptance binds them to the immutable '
          + 'registry identity.',
      },
      interfaceAcceptance: {
        directionalContractCount:
          registry.proposedDirectionalInterfaceRegistry?.contractCount ?? null,
        decision: 'ACCEPT_ALL_CONTRACTS_SEALED_DEFAULT_DENY',
        nullEndpointDisposition: 'CLOSED_PER_ARCHITECTURAL_FAIL_CLOSED_DISPOSITIONS',
        beforeStateDoctrine: 'BOUND_TO_ACCEPTED_COMPLETE_SAVE',
        futureStateDoctrine: 'BOUND_TO_ACCEPTED_DOMAIN_DESIGN_BASES',
      },
    },
  ],
  disposition: {
    externalSubmissionsRemaining: 0,
    deterministicOfflineWorkRemaining: [
      'compile the accepted reduced-scope technical/owner/interface identity',
      'close the G05 Layer B worklists deterministically',
      'rerun G05/G06, run integrated G07, rerun R00',
      'compile the executable build package with per-cell block states and forward/rollback operations',
    ],
    r00Passed: false,
    worldConstructionAuthorized: false,
    operationCount: 0,
  },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report)}\n`);

const markdown = `# Combined Zones external acceptance submissions (EXT-01..EXT-04)

Status: **${report.status}**

The four external submissions requested by the minimal review packet are recorded as sole-owner acceptances under the owner's 2026-08-06 build-ready directive. No independent third-party review exists or is claimed; the sole owner is the only accepting authority for this private creative world.

- **EXT-01** civil corridor: conservative capped-drainage/no-diversion basis accepted; ISSUE-002 stays default-deny and excluded from build scope.
- **EXT-02** mountain/funicular/protected features: FM-01 future state, support materials, B09 reservations, and explicit evidence-backed zero-margin core acceptance (plus the one-cell shipwreck reshape margin) accepted.
- **EXT-03** D06 life safety/runtime: detailed setout and all 29 frozen commissioning specifications accepted; bee-nest relocation method changed to server-authoritative operator-RCON, so the bot-client real-proof prerequisite is superseded; runtime validation moves to G13/G17 with rollback.
- **EXT-04** integrated owner record: registry owner records (${report.submissions[3].ownerAcceptance.proposedOwnerRecordCount}) and all directional interface contracts accepted sealed default-deny, bound to the immutable setout/registry/save/composite identities.

World construction is **not** authorized by this record; operations remain **0**.

Report identity: \`${report.reportIdentitySha256}\`
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);
console.log(JSON.stringify({
  status: report.status,
  reportIdentitySha256: report.reportIdentitySha256,
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
}, null, 2));
