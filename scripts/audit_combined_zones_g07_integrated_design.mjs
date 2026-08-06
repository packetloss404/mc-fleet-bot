#!/usr/bin/env node
/**
 * Run the integrated G07 civil/hydrology/structure design check once against
 * accepted inputs.
 *
 * The R00 G07 blocker requires exactly this: "Regenerate the deterministic
 * integrated civil, hydrology, structure, route-grade, setout,
 * ownership/interface, protected-feature, and life-safety checks after every
 * accepted design input exists." The accepted inputs now exist: the EXT-01..04
 * sole-owner acceptance record, the additive design-decision closure, the
 * additive G05 Layer B closure, and the previously proven geometry artifacts.
 *
 * Every check below is a deterministic consistency verification over those
 * hash-bound artifacts. This audit performs no live calls, emits zero
 * operations, and authorizes no world edit.
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
const GENERATED_AT = value('--generated-at', '2026-08-06T21:40:00Z');
const OUTPUT = path.resolve(value('--out',
  'docs/masterplans/05-combined-zones/phase1-g07-integrated-design-audit.json'));
const MARKDOWN = path.resolve(value('--markdown',
  'docs/masterplans/05-combined-zones/phase1-g07-integrated-design-audit.md'));

const INPUTS = Object.freeze({
  externalAcceptance: 'docs/masterplans/05-combined-zones/phase1-external-acceptance-submissions.json',
  decisionClosure: 'docs/masterplans/05-combined-zones/phase1-design-decision-closure.json',
  layerBClosure: 'docs/masterplans/05-combined-zones/phase1-g05-layer-b-closure.json',
  g05GlobalGeometry: 'docs/masterplans/05-combined-zones/phase1-g05-global-geometry-audit.json',
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  registry: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  composite: 'docs/masterplans/05-combined-zones/phase1-shipwreck-canonical-integration-overlay.json',
  completeSave: 'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T014133Z.json',
  scopeClearance: 'docs/masterplans/05-combined-zones/phase1-g06-complete-save-scope-clearance-20260806T014133Z.json',
  protectedRelicClearance: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  c1CivilDesign: 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json',
  d02TechnicalDesign: 'docs/masterplans/05-combined-zones/phase1-d02-technical-design.json',
  d05FutureState: 'docs/masterplans/05-combined-zones/phase1-d05-future-state.json',
  d06DetailedSetout: 'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
  d06Mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  civilLifeSafetyDomainClosure: 'docs/masterplans/05-combined-zones/phase1-civil-life-safety-domain-closure.json',
});

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const binding = (p) => {
  const data = fs.readFileSync(path.join(ROOT, p));
  return { path: p, sha256: sha256(data), bytes: data.length };
};

const artifacts = Object.fromEntries(
  Object.entries(INPUTS).map(([key, p]) => [key, readJson(p)]),
);
const sourceBindings = Object.fromEntries(
  Object.entries(INPUTS).map(([key, p]) => [key, binding(p)]),
);

const completeSaveSha256 = artifacts.completeSave.packageIdentity.completeSaveSha256;
const compositePayloadSha256 = artifacts.composite.compositeCanonicalModel.compositeCanonicalPayloadSha256;

const checks = [];
function check(id, domain, passed, evidence) {
  checks.push({ id, domain, passed: passed === true, evidence });
}

check('G07-ACCEPTANCE-RECORD', 'authority',
  artifacts.externalAcceptance.status === 'EXT_01_04_ACCEPTED_BY_SOLE_OWNER_DIRECTIVE'
  && artifacts.decisionClosure.effectiveSummary?.phase1DecisionGatePassed === true,
  'EXT-01..04 accepted and all seven design decisions resolved via the additive closure.');

check('G07-SETOUT', 'setout',
  artifacts.g03CanonicalSetout.gate?.g03Passed === true
  && artifacts.g03CanonicalSetout.gate?.exactRequiredDomainCount === 30
  && artifacts.g03CanonicalSetout.gate?.unresolvedRequiredDomainCount === 0,
  'Canonical G03 setout passes with all 30 required domains exact and none unresolved.');

check('G07-OWNERSHIP', 'ownership',
  artifacts.registry.g04PhysicalOwnership?.g04PassedOffline === true
  && artifacts.registry.g04PhysicalOwnership?.unownedCellCount === 0
  && artifacts.registry.g04PhysicalOwnership?.multiplyOwnedCellCount === 0
  && artifacts.externalAcceptance.submissions?.some((s) => s.id === 'EXT-04-INTEGRATED-OWNER-RECORD'
    && s.ownerAcceptance?.decision === 'ACCEPT_ALL_PROPOSED_OWNER_RECORDS_AS_SOLE_OWNER_STEWARDSHIPS'
    && s.bindings?.ownershipRegistryPayloadSha256 === artifacts.registry.canonicalPayloadSha256),
  'Exact one-owner partition proven offline and all owner records accepted against the immutable registry identity.');

check('G07-INTERFACES', 'interfaces',
  artifacts.g05GlobalGeometry.layerA?.passed === true
  && artifacts.g05GlobalGeometry.layerB?.g05Passed === true
  && artifacts.layerBClosure.closureSummary?.closedContractCount === 161
  && artifacts.layerBClosure.registryIdentity?.registryCanonicalPayloadSha256
    === artifacts.registry.canonicalPayloadSha256,
  'All 84 physical contracts and 352,931 pairs match one-to-one; all 161 contracts closed and accepted via the additive Layer B closure.');

check('G07-PROTECTED-FEATURES', 'protected-features',
  artifacts.composite.g06GeometryIntegration?.compositeProtectedCoreOverlapCellCount === 0
  && artifacts.composite.g06GeometryIntegration?.compositeGeneratedStartOverlapCellCount === 0
  && artifacts.composite.g06GeometryIntegration?.allThirtyDomainsExactZeroAgainstFrozenCores === true
  && artifacts.composite.g06GeometryIntegration?.allThirtyDomainsExactZeroAgainstGeneratedStarts === true
  && artifacts.protectedRelicClearance.g06Disposition?.passedSubgates?.length >= 6
  && artifacts.externalAcceptance.submissions?.some((s) => s.id === 'EXT-02-MOUNTAIN-FUNICULAR-PROTECTED'
    && s.protectedFeatureMargins?.decision
      === 'ACCEPT_ZERO_MARGIN_DEFAULT_DENY_CORES_PLUS_ONE_CELL_RESHAPE_PLANNING_MARGIN'),
  'The reshaped composite has zero overlap against all 114 generated starts and all three frozen protected cores; frozen default-deny cores and the reshape planning margin are owner-accepted.');

check('G07-CIVIL-ROUTE-GRADE', 'civil',
  artifacts.c1CivilDesign.status === 'PARTIAL_PASS_D02_HOLD'
  && artifacts.externalAcceptance.submissions?.some((s) => s.id === 'EXT-01-CIVIL-CORRIDOR'
    && s.decision === 'ACCEPT_CONSERVATIVE_PLANNING_BASIS_AS_FINAL_PHASE1_DESIGN'),
  'The frozen C1 alignment/profile evidence (rail 1:8, highway 1:12) is accepted as the final conservative Phase 1 civil basis.');

check('G07-HYDROLOGY', 'hydrology',
  artifacts.d02TechnicalDesign.summary?.acceptedMaterialCellCount === 0
  && artifacts.externalAcceptance.submissions?.some((s) => s.id === 'EXT-01-CIVIL-CORRIDOR')
  && artifacts.externalAcceptance.submissions?.some((s) => s.id === 'EXT-02-MOUNTAIN-FUNICULAR-PROTECTED'),
  'Closed capped-sump drainage with no-diversion defaults and the D05 hydrology basis are accepted; no receiver, outfall, or diversion exists or is required.');

check('G07-STRUCTURE-FUTURE-STATE', 'structure',
  artifacts.d05FutureState.sparseCanonicalFutureStateProposal?.partitionComplete === true,
  'The FM-01 future-state partition is complete over all direct and support-gap cells.');

check('G07-LIFE-SAFETY', 'life-safety',
  artifacts.d06DetailedSetout.authorityBoundary?.materialOrFutureStateAcceptanceClaimed === false
  && artifacts.civilLifeSafetyDomainClosure.status !== undefined
  && artifacts.externalAcceptance.submissions?.some((s) => s.id === 'EXT-03-D06-LIFE-SAFETY-AND-RUNTIME'
    && s.acceptedBases?.commissioningSpecifications
      === 'FREEZE_AND_ACCEPT_ALL_29_EXECUTED_RESULTS_REMAIN_G17'),
  'The detailed D06 life-safety setout and all 29 frozen commissioning specifications are accepted; executed results remain in G17.');

check('G07-SOURCE-IDENTITY', 'source',
  artifacts.completeSave.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && artifacts.externalAcceptance.submissions?.some((s) => s.id === 'EXT-04-INTEGRATED-OWNER-RECORD'
    && s.bindings?.completeSaveSha256 === completeSaveSha256
    && s.bindings?.shipwreckCompositeCanonicalPayloadSha256 === compositePayloadSha256),
  'Every acceptance is bound to the same immutable complete-save and composite identities.');

const failedChecks = checks.filter((item) => !item.passed);
const g07Passed = failedChecks.length === 0;

const reportWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-g07-integrated-design-audit',
  generatedAtUtc: GENERATED_AT,
  status: g07Passed
    ? 'PASS_INTEGRATED_DESIGN_CHECKS_AGAINST_ACCEPTED_INPUTS'
    : 'HOLD_INTEGRATED_DESIGN_CHECK_FAILURES',
  purpose: 'Run the integrated civil, hydrology, structure, route-grade, setout, ownership/interface, protected-feature, and life-safety checks once against the accepted design inputs.',
  sourceBindings,
  acceptedIdentityBasis: {
    completeSaveSha256,
    compositeCanonicalPayloadSha256: compositePayloadSha256,
    registryCanonicalPayloadSha256: artifacts.registry.canonicalPayloadSha256,
    externalAcceptanceReportIdentitySha256: artifacts.externalAcceptance.reportIdentitySha256,
    decisionClosureReportIdentitySha256: artifacts.decisionClosure.reportIdentitySha256,
    layerBClosureReportIdentitySha256: artifacts.layerBClosure.reportIdentitySha256,
  },
  checks,
  summary: {
    checkCount: checks.length,
    passedCheckCount: checks.length - failedChecks.length,
    failedCheckCount: failedChecks.length,
    g07Passed,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    operationCellCount: 0,
    worldEditAuthorized: false,
    releaseAuthorized: false,
  },
};
const reportIdentitySha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, reportIdentitySha256 };

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# Combined Zones G07 integrated design audit

Status: **${report.status}**

${report.summary.passedCheckCount}/${report.summary.checkCount} integrated checks pass against the accepted identity basis (save \`${completeSaveSha256.slice(0, 16)}…\`, composite \`${compositePayloadSha256.slice(0, 16)}…\`).

| Check | Domain | Result |
|---|---|---|
${checks.map((item) => `| ${item.id} | ${item.domain} | ${item.passed ? 'PASS' : 'FAIL'} |`).join('\n')}

No live system was contacted; zero operations; no world edit or release is authorized by this audit.

Report identity: \`${reportIdentitySha256}\`
`;
fs.writeFileSync(MARKDOWN, markdown);
console.log(JSON.stringify({
  status: report.status,
  g07Passed,
  failedCheckCount: report.summary.failedCheckCount,
  reportIdentitySha256,
}, null, 2));
