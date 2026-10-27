#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = process.cwd();
const DEFAULT_CONTRACT = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-release-contract.json',
);

function sha256(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

export function c1PilotCandidateIsReady(evidence) {
  return evidence?.decision?.physicalPilotTargetCellSetMayBeFrozen === true
    && Boolean(evidence?.exactPlanCoordination?.physicalTargetCellSet)
    && Boolean(evidence?.exactPlanCoordination?.interactionCellSet)
    && evidence?.decision?.operationCellCount > 0
    && evidence?.decision?.operationsEmitted === true;
}

export function siteR01PretransactionIsReady(evidence) {
  return evidence?.decision?.constructionReadiness === 'PASS'
    && evidence?.decision?.liveBuildMayProceed === true;
}

const EXPECTED_OWNER_DIRECTIVE = 'remove all that you recommend and implement these 10 changes, then fan out a team of subagents to figure out the next move to build. I do not want to circle jerk and talk about building i want to build.';

function arraysEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function fileBindingPasses(binding, root = ROOT) {
  const filename = path.resolve(root, binding?.path ?? '');
  return isSha256(binding?.sha256)
    && fs.existsSync(filename)
    && fs.statSync(filename).isFile()
    && sha256(filename) === binding.sha256;
}

function releaseDependenciesAreAcyclic(releases) {
  const byId = new Map(releases.map((release) => [release.id, release]));
  const visiting = new Set();
  const visited = new Set();
  const visit = (id) => {
    if (visited.has(id)) return true;
    if (visiting.has(id)) return false;
    const release = byId.get(id);
    if (!release) return false;
    visiting.add(id);
    for (const dependencyId of release.dependsOn ?? []) {
      if (!byId.has(dependencyId) || !visit(dependencyId)) return false;
    }
    visiting.delete(id);
    visited.add(id);
    return true;
  };
  return releases.every((release) => visit(release.id));
}

function dependencyIsComplete(release) {
  return !/^PARTIALLY_/.test(release?.status ?? '')
    && /(?:^|_)(?:COMPLETE|AS_BUILT|MATERIALLY_AS_BUILT)(?:_|$)/.test(
    release?.status ?? '',
    );
}

export function scopeLocalPackageIsExecutionReady(
  release,
  standingAuthorization,
  root = ROOT,
) {
  if (!/(?:EXECUTION_READY|READY_FOR_EXECUTION)/.test(release?.status ?? '')) {
    return false;
  }
  if (!fileBindingPasses(release?.operationManifest, root)) return false;
  if (
    release?.standingAuthorization?.path
      !== 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json'
    || !fileBindingPasses(release.standingAuthorization, root)
  ) {
    return false;
  }
  const expectedKernelIds = (standingAuthorization?.hardSafetyKernel ?? [])
    .filter((item) => item.required === true)
    .map((item) => item.id);
  const evidence = release?.safetyKernelEvidence ?? [];
  if (
    expectedKernelIds.length !== 6
    || evidence.length !== expectedKernelIds.length
    || new Set(evidence.map((item) => item.id)).size !== evidence.length
  ) {
    return false;
  }
  return expectedKernelIds.every((id) => {
    const item = evidence.find((candidate) => candidate.id === id);
    return item?.status === 'PASS'
      && Array.isArray(item.artifacts)
      && item.artifacts.length > 0
      && item.artifacts.every((artifact) => fileBindingPasses(artifact, root));
  });
}

function parseArgs(argv) {
  const options = {
    contract: DEFAULT_CONTRACT,
    out: null,
    requireReady: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--contract') {
      if (!argv[index + 1]) throw new Error('--contract requires a path');
      options.contract = path.resolve(ROOT, argv[index + 1]);
      index += 1;
    } else if (argument === '--out') {
      if (!argv[index + 1]) throw new Error('--out requires a path');
      options.out = path.resolve(ROOT, argv[index + 1]);
      index += 1;
    } else if (argument === '--require-ready') {
      options.requireReady = true;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  return options;
}

export function validateReleaseContract(contractPath = DEFAULT_CONTRACT) {
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const errors = [];
  const bindingChecks = [];

  if (contract.schemaVersion !== 1) errors.push('schemaVersion-must-equal-1');
  if (contract.executable !== false) errors.push('contract-must-be-nonexecutable');
  if (contract.worldEditAuthorized !== true) errors.push('standing-world-edit-authority-required');
  if (
    contract.status
      !== 'BOUNDED_MVP_ACCEPTED_STANDING_SCOPE_LOCAL_BUILD_AUTHORIZED'
  ) {
    errors.push('bounded-mvp-accepted-standing-scope-local-status-required');
  }

  for (const binding of contract.authorityBindings ?? []) {
    const filename = path.resolve(ROOT, binding.path ?? '');
    const exists = fs.existsSync(filename) && fs.statSync(filename).isFile();
    const actualSha256 = exists ? sha256(filename) : null;
    const passed = exists && actualSha256 === binding.sha256;
    bindingChecks.push({
      path: binding.path,
      expectedSha256: binding.sha256,
      actualSha256,
      passed,
    });
    if (!passed) errors.push(`authority-binding-failed:${binding.path}`);
  }
  if (bindingChecks.length === 0) errors.push('authority-bindings-required');

  const authorityBindingByPath = new Map(
    (contract.authorityBindings ?? []).map((binding) => [binding.path, binding]),
  );
  const boundJson = new Map();
  const getBoundJson = (relativePath) => {
    if (!authorityBindingByPath.has(relativePath)) return null;
    if (!boundJson.has(relativePath)) {
      try {
        boundJson.set(relativePath, readJson(path.resolve(ROOT, relativePath)));
      } catch {
        boundJson.set(relativePath, null);
      }
    }
    return boundJson.get(relativePath);
  };

  const authorizationPath = contract.currentState?.standingAuthorization;
  const standingAuthorization = getBoundJson(authorizationPath);
  if (
    authorizationPath
      !== 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json'
    || standingAuthorization?.status !== 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
    || standingAuthorization?.revoked !== false
    || standingAuthorization?.projectId !== 'combined-zones-phase1'
    || standingAuthorization?.ownerDirective?.exactText !== EXPECTED_OWNER_DIRECTIVE
  ) {
    errors.push('standing-authorization-invalid');
  }
  if (
    contract.currentState?.ownerDirective
      !== 'docs/masterplans/05-combined-zones/OWNER-DIRECTIVE.md'
    || contract.currentState?.authoritativeLedger
      !== 'docs/masterplans/05-combined-zones/CURRENT-STATE.md'
    || !authorityBindingByPath.has(contract.currentState?.ownerDirective)
    || !authorityBindingByPath.has(contract.currentState?.authoritativeLedger)
  ) {
    errors.push('current-authority-ledger-bindings-required');
  }

  const contractDeferredScopes = contract.mvpBoundary?.deferredNonBlockingScopes ?? [];
  const authorizationDeferredScopeIds = standingAuthorization?.mvpBoundary
    ?.excludedScopeIds ?? [];
  if (
    contract.mvpBoundary?.status !== 'FROZEN'
    || contractDeferredScopes.length !== 4
    || !arraysEqual(authorizationDeferredScopeIds, [
      'P1-B12',
      'C2',
      'C3',
      'EMPTY-EIGHT-FUTURE-LINE-OPENINGS',
    ])
  ) {
    errors.push('mvp-nonblocking-deferral-boundary-invalid');
  }

  const hardSafetyKernel = contract.hardSafetyKernel ?? [];
  const authorizationKernel = standingAuthorization?.hardSafetyKernel ?? [];
  if (
    hardSafetyKernel.length !== 6
    || authorizationKernel.length !== 6
    || authorizationKernel.some((item) => item.required !== true)
  ) {
    errors.push('six-part-hard-safety-kernel-required');
  }

  const currentSource = contract.currentState?.currentMvpSource;
  const currentSourceReportPath = currentSource?.intakeReport;
  const currentSourceReportExists = typeof currentSourceReportPath === 'string'
    && fs.existsSync(path.resolve(ROOT, currentSourceReportPath));
  const currentSourceReport = currentSourceReportExists
    ? readJson(path.resolve(ROOT, currentSourceReportPath))
    : null;
  if (
    !currentSourceReportExists
    || !isSha256(currentSource?.intakeReportSha256)
    || sha256(path.resolve(ROOT, currentSourceReportPath)) !== currentSource.intakeReportSha256
    || currentSourceReport?.status !== 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
    || currentSourceReport?.packageIdentity?.completeSaveSha256
      !== currentSource?.completeSaveSha256
    || currentSourceReport?.input?.suppliedWorldRoot !== currentSource?.path
    || standingAuthorization?.currentPreparationBaseline?.executionQualification
      !== 'Preparation baseline only. A live --execute invocation must capture a new fresh source snapshot in that same invocation.'
  ) {
    errors.push('current-mvp-source-intake-invalid');
  }

  const gateDefinitions = contract.gateDefinitions ?? [];
  const gateIds = gateDefinitions.map((gate) => gate.id);
  if (gateIds.length !== new Set(gateIds).size) errors.push('duplicate-gate-id');
  if (gateIds.length !== 19) errors.push('nineteen-gates-required');
  const lifecycleGateSets = contract.physicalReleaseLifecycleGateSets ?? {};
  const inheritedR00Baseline = lifecycleGateSets.inheritedR00Baseline ?? [];
  const scopeLocalPrerelease = lifecycleGateSets.scopeLocalPrerelease ?? [];
  const executionGateSet = lifecycleGateSets.execution ?? [];
  const scopeLocalPostrelease = lifecycleGateSets.scopeLocalPostrelease ?? [];
  const mvpConsolidatedAcceptance = lifecycleGateSets.mvpConsolidatedAcceptance ?? [];
  if (!arraysEqual(inheritedR00Baseline, gateIds.slice(0, 2))) {
    errors.push('inherited-r00-baseline-must-be-g01-g02');
  }
  if (!arraysEqual(scopeLocalPrerelease, gateIds.slice(2, 14))) {
    errors.push('scope-local-prerelease-must-be-g03-g14');
  }
  if (
    executionGateSet.length !== 1
    || executionGateSet[0] !== 'G15_ATOMIC_EXECUTION'
  ) {
    errors.push('execution-must-require-only-g15');
  }
  if (!arraysEqual(scopeLocalPostrelease, gateIds.slice(15, 17))) {
    errors.push('scope-local-postrelease-must-be-g16-g17');
  }
  if (!arraysEqual(mvpConsolidatedAcceptance, gateIds.slice(17, 19))) {
    errors.push('mvp-consolidated-acceptance-must-be-g18-g19');
  }

  const releases = contract.releaseSequence ?? [];
  const releaseIds = releases.map((release) => release.id);
  if (releaseIds.length !== new Set(releaseIds).size) errors.push('duplicate-release-id');
  if (releases.length !== 14) errors.push('fourteen-release-nodes-required');
  if (!releaseDependenciesAreAcyclic(releases)) errors.push('release-dependency-dag-invalid');
  releases.forEach((release) => {
    if (
      release.kind.startsWith('physical-')
      && release.requiredGateLifecycle !== 'SCOPE_LOCAL_HARD_SAFETY_KERNEL'
    ) {
      errors.push(`physical-release-missing-scope-local-kernel:${release.id}`);
    }
  });

  const r00 = releases.find((release) => release.id === 'CZ-R00-PHASE1-DESIGN-FREEZE');
  const r01 = releases.find(
    (release) => release.id === 'CZ-R01-PHASE1-BOUNDED-VISUAL-PILOT',
  );
  if (!r00?.requiredGates?.includes('G02_DESIGN_DECISIONS')) {
    errors.push('r00-must-require-g02-design-decisions');
  }
  if (r00?.status !== 'COMPLETE_7_OF_7_PASS') errors.push('r00-must-be-complete');
  if (!arraysEqual(r01?.dependsOn, [r00?.id])) {
    errors.push('r01-must-follow-r00');
  }
  const asBuiltReleases = releases.slice(1, 7);
  if (asBuiltReleases.some((release) => !dependencyIsComplete(release))) {
    errors.push('r01-r06-must-be-materially-as-built');
  }
  if (
    contract.currentState?.r00 !== 'COMPLETE_7_OF_7_PASS'
    || contract.currentState?.r01ThroughR06 !== 'MATERIALLY_EXECUTED_AS_BUILT'
    || contract.currentState?.r07a?.status
      !== 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
    || contract.currentState?.r07ThroughR12
      !== 'BOUNDED_MVP_DEPENDENCIES_COMPLETE_6_OF_6'
    || contract.currentState?.r13
      !== 'PASS_R13_CONSOLIDATED_MVP_ACCEPTED_G16_G19'
    || contract.decisionResolutionBoundary?.g02Closure !== 'COMPLETE_AT_R00'
    || contract.decisionResolutionBoundary?.descendantReleaseEvidenceMayResolveG02
      !== false
  ) {
    errors.push('current-r00-r06-state-invalid');
  }
  if (
    contract.scopeLocalReleasePolicy?.globalSerialDependencyRequired !== false
    || contract.scopeLocalReleasePolicy?.disjointPackagesMayAdvanceInParallel !== true
    || contract.scopeLocalReleasePolicy?.blockerPropagation
      !== 'EXACT_TARGET_AND_DEPENDENT_INTERFACES_ONLY'
    || contract.scopeLocalReleasePolicy?.packageMustBindStandingAuthorization !== true
    || contract.advancementRule?.operator !== 'SCOPE_LOCAL_AND'
    || contract.advancementRule?.allowDisjointParallelExecution !== true
  ) {
    errors.push('scope-local-advancement-policy-invalid');
  }
  const r11 = releases.find(
    (release) => release.id === 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
  );
  if (!arraysEqual(r11?.dependsOn, [r00?.id])) {
    errors.push('r11-must-retain-independent-parallel-eligibility');
  }
  const r07 = releases.find(
    (release) => release.id === 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
  );
  const r07EvidencePath = r07?.realizedAs?.evidenceLedger;
  const r07Evidence = getBoundJson(r07EvidencePath);
  const r07SuccessfulExecutionStages = (r07Evidence?.stages ?? []).filter(
    (stage) => stage.stage?.startsWith('strict-forward-execution:'),
  );
  if (
    r07?.status !== 'BOUNDED_MVP_AS_BUILT_ACCEPTED_R07A_R07K'
    || r07?.realizedAs?.status !== 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
    || r07Evidence?.status !== 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
    || r07Evidence?.sourceSnapshot?.completeSaveSha256
      !== r07?.realizedAs?.preCompleteSaveSha256
    || r07Evidence?.postSnapshot?.completeSaveSha256
      !== r07?.realizedAs?.postCompleteSaveSha256
    || r07SuccessfulExecutionStages.length !== 2
    || r07SuccessfulExecutionStages.some((stage) => stage.status !== 'PASS')
    || (r07Evidence?.rollbackPoststatePreflights ?? []).length !== 2
  ) {
    errors.push('r07a-as-built-evidence-invalid');
  }

  const decisions = contract.designDecisions ?? [];
  const unresolvedDecisionIds = decisions
    .filter((decision) => {
      if (decision.state !== 'RESOLVED') return true;
      const evidence = decision.machineEvidence;
      const boundEvidence = authorityBindingByPath.get(evidence?.path);
      if (!evidence || !boundEvidence || evidence.sha256 !== boundEvidence.sha256) {
        return true;
      }
      const evidenceJson = getBoundJson(evidence.path);
      if (evidence.decisionId) {
        const expectedDecisionId = decision.id?.split('_')[0];
        const evidenceRecord = evidenceJson?.decisions?.find(
          (candidate) => candidate.id === evidence.decisionId,
        );
        return evidence.decisionId !== expectedDecisionId
          || evidenceRecord?.status !== 'RESOLVED';
      }
      if (evidence.gateId) {
        const gate = evidenceJson?.gates?.find(
          (candidate) => candidate.id === evidence.gateId,
        );
        return gate?.status !== 'PASS';
      }
      return true;
    })
    .map((decision) => decision.id);
  if (decisions.length !== 7) errors.push('seven-masterplan-decisions-required');
  if (unresolvedDecisionIds.length > 0) {
    errors.push(...unresolvedDecisionIds.map((id) => `unresolved-current-decision:${id}`));
  }

  const missingToolingIds = (contract.requiredProjectSpecificTooling ?? [])
    .filter((tool) => tool.status === 'MISSING')
    .map((tool) => tool.id);
  if (missingToolingIds.length > 0) {
    errors.push(...missingToolingIds.map((id) => `missing-project-tooling:${id}`));
  }

  const currentGateEvaluations = contract.currentGateEvaluations ?? [];
  const gateEvaluationById = new Map(
    currentGateEvaluations.map((gate) => [gate.id, gate]),
  );
  if (gateEvaluationById.size !== currentGateEvaluations.length) {
    errors.push('duplicate-current-gate-evaluation-id');
  }
  const incompleteGateEvaluationIds = gateIds.slice(0, 7).filter((gateId) => {
    const evaluation = gateEvaluationById.get(gateId);
    if (
      evaluation?.scope !== 'R00'
      || evaluation?.status !== 'PASS'
      || !Array.isArray(evaluation.evidence)
    ) return true;
    return evaluation.evidence.length === 0 || evaluation.evidence.some((item) => {
      const binding = authorityBindingByPath.get(item?.path);
      return !binding || item.sha256 !== binding.sha256;
    });
  });
  if (incompleteGateEvaluationIds.length > 0) {
    errors.push(...incompleteGateEvaluationIds.map((id) => `r00-gate-not-pass:${id}`));
  }

  const localizedBlockers = contract.currentBlockers ?? [];
  if (
    localizedBlockers.some((item) => (
      typeof item !== 'object'
      || typeof item.scope !== 'string'
      || typeof item.blocker !== 'string'
      || typeof item.propagation !== 'string'
      || /project|global/i.test(item.propagation)
    ))
  ) {
    errors.push('current-blockers-must-be-structured-and-scope-local');
  }

  const byReleaseId = new Map(releases.map((release) => [release.id, release]));
  const executionReadyReleases = releases.filter(
    (release) => release.kind.startsWith('physical-')
      && /(?:EXECUTION_READY|READY_FOR_EXECUTION)/.test(release.status ?? ''),
  );
  const unsafeExecutionReadyReleaseIds = executionReadyReleases
    .filter((release) => {
      const dependenciesComplete = (release.dependsOn ?? []).every(
        (id) => dependencyIsComplete(byReleaseId.get(id)),
      );
      return !dependenciesComplete
        || !scopeLocalPackageIsExecutionReady(release, standingAuthorization);
    })
    .map((release) => release.id);
  if (unsafeExecutionReadyReleaseIds.length > 0) {
    errors.push(...unsafeExecutionReadyReleaseIds.map(
      (id) => `unsafe-execution-ready-release:${id}`,
    ));
  }

  const eligibleReleaseIds = releases
    .filter((release) => /ELIGIBLE_AFTER_LOCAL_DEPENDENCIES_AND_KERNEL/.test(
      release.status ?? '',
    ))
    .map((release) => release.id);
  const boundedMvpAccepted = contract.status
      === 'BOUNDED_MVP_ACCEPTED_STANDING_SCOPE_LOCAL_BUILD_AUTHORIZED'
    && releases.find(({ id }) => id === 'CZ-R13-FINAL-CONSOLIDATED-ACCEPTANCE')
      ?.status === 'PASS_R13_CONSOLIDATED_MVP_ACCEPTED';
  const contractValid = errors.length === 0;
  const ready = contractValid && (boundedMvpAccepted || eligibleReleaseIds.length > 0);

  return {
    schemaVersion: 1,
    contract: path.relative(ROOT, contractPath),
    contractSha256: sha256(contractPath),
    status: contractValid ? contract.status : 'CONTRACT_INVALID',
    contractValid,
    ready,
    readyMeaning: boundedMvpAccepted
      ? 'The bounded MVP is accepted. Standing scope-local authority remains available for separately bounded post-MVP work; no future package is approved for live execution without complete bound kernel evidence.'
      : 'At least one scope may enter package-local compilation and safety evaluation; no package is approved for live execution without complete bound kernel evidence.',
    errors,
    bindingChecks,
    unresolvedDecisionIds,
    missingToolingIds,
    incompleteGateEvaluationIds,
    blockerCount: localizedBlockers.length,
    blockers: localizedBlockers,
    eligibleReleaseIds,
    executionReadyReleaseIds: executionReadyReleases.map((release) => release.id),
    unsafeExecutionReadyReleaseIds,
    releaseOrder: releaseIds,
    gateIds,
  };
}

function main(argv) {
  const options = parseArgs(argv);
  const report = validateReleaseContract(options.contract);
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (options.out) {
    fs.mkdirSync(path.dirname(options.out), { recursive: true });
    fs.writeFileSync(options.out, serialized);
  }
  process.stdout.write(serialized);
  if (!report.contractValid || (options.requireReady && !report.ready)) {
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
