#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = process.cwd();
const DEFAULT_CONTRACT = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-release-contract.json',
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
  if (contract.worldEditAuthorized !== false) {
    errors.push('contract-must-not-authorize-world-edits');
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

  const gateDefinitions = contract.gateDefinitions ?? [];
  const gateIds = gateDefinitions.map((gate) => gate.id);
  if (gateIds.length !== new Set(gateIds).size) errors.push('duplicate-gate-id');
  if (gateIds.length !== 19) errors.push('nineteen-gates-required');
  const lifecycleGateSets = contract.physicalReleaseLifecycleGateSets ?? {};
  const mayStartTransaction = lifecycleGateSets.mayStartTransaction ?? [];
  const executionGateSet = lifecycleGateSets.execution ?? [];
  const mayBecomeAccepted = lifecycleGateSets.mayBecomeAccepted ?? [];
  if (
    mayStartTransaction.length !== 14
    || mayStartTransaction.some(
      (gateId, index) => gateId !== gateIds[index],
    )
  ) {
    errors.push('transaction-start-must-require-g01-through-g14');
  }
  if (
    executionGateSet.length !== 1
    || executionGateSet[0] !== 'G15_ATOMIC_EXECUTION'
  ) {
    errors.push('execution-must-require-only-g15');
  }
  if (
    mayBecomeAccepted.length !== gateIds.length
    || gateIds.some((gateId, index) => gateId !== mayBecomeAccepted[index])
  ) {
    errors.push('acceptance-must-require-g01-through-g19');
  }

  const releases = contract.releaseSequence ?? [];
  const releaseIds = releases.map((release) => release.id);
  if (releaseIds.length !== new Set(releaseIds).size) errors.push('duplicate-release-id');
  if (releases.length !== 14) errors.push('fourteen-serial-release-nodes-required');
  releases.forEach((release, index) => {
    const expectedDependencies = index === 0 ? [] : [releases[index - 1].id];
    if (JSON.stringify(release.dependsOn) !== JSON.stringify(expectedDependencies)) {
      errors.push(`release-is-not-strictly-serial:${release.id}`);
    }
    if (release.status !== 'BLOCKED') {
      errors.push(`release-must-remain-blocked:${release.id}`);
    }
    if (
      release.kind.startsWith('physical-')
      && release.requiredGateLifecycle !== 'ALL_PHYSICAL_RELEASE_LIFECYCLE_GATES'
    ) {
      errors.push(`physical-release-missing-complete-gate-set:${release.id}`);
    }
  });

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

  const decisions = contract.designDecisions ?? [];
  const unresolvedDecisionIds = decisions
    .filter((decision) => {
      if (decision.state !== 'RESOLVED') return true;
      const evidence = decision.machineEvidence;
      const boundEvidence = authorityBindingByPath.get(evidence?.path);
      const evidenceRecord = getBoundJson(evidence?.path)?.decisions?.find(
        (candidate) => candidate.id === evidence?.decisionId,
      );
      const expectedDecisionId = decision.id?.split('_')[0];
      return !evidence
        || evidence.decisionId !== expectedDecisionId
        || !boundEvidence
        || evidence.sha256 !== boundEvidence.sha256
        || evidenceRecord?.status !== 'RESOLVED';
    })
    .map((decision) => decision.id);
  if (decisions.length !== 7) errors.push('seven-masterplan-decisions-required');

  const missingToolingIds = (contract.requiredProjectSpecificTooling ?? [])
    .filter((tool) => tool.status !== 'COMPLETE')
    .map((tool) => tool.id);

  const relicEvidencePath = 'masterplans/05-combined-zones/phase1-protected-relic-clearance.json';
  const relicEvidence = getBoundJson(relicEvidencePath);
  const relicKeyBySubjectId = {
    'RELIC-IGLOO-WEST': 'igloo-west',
    'RELIC-IGLOO-EAST': 'igloo-east',
    'RELIC-SHIPWRECK': 'shipwreck',
  };
  const exactSetBindsAuthority = (set) => {
    const binding = authorityBindingByPath.get(set?.evidencePath);
    return Number.isInteger(set?.cellCount)
      && set.cellCount > 0
      && isSha256(set?.coordinateSetSha256)
      && binding?.sha256 === set?.evidenceSha256;
  };
  const protectedCoreIsValid = (subject) => {
    const core = subject.exactProtectedCoreCellSet;
    const relic = relicEvidence?.relics?.find(
      (candidate) => candidate.key === relicKeyBySubjectId[subject.id],
    );
    return exactSetBindsAuthority(core)
      && core.evidencePath === relicEvidencePath
      && core.cellCount === relic?.evidenceBackedDefaultDenyCore?.cellCount
      && core.coordinateSetSha256
        === relic?.evidenceBackedDefaultDenyCore?.coordinateSetSha256;
  };
  const reviewedBufferIsValid = (subject) => {
    const buffer = subject.exactReviewedBufferCellSet;
    return exactSetBindsAuthority(buffer)
      && buffer.reviewStatus === 'APPROVED'
      && Number.isInteger(buffer.positiveMarginBlocks)
      && buffer.positiveMarginBlocks >= 0
      && buffer.cellCount >= subject.exactProtectedCoreCellSet?.cellCount;
  };
  const incompleteProtectedSubjects = (contract.protectedNoTouchSubjects ?? [])
    .filter((subject) => !protectedCoreIsValid(subject) || !reviewedBufferIsValid(subject))
    .map((subject) => subject.id);

  const semanticGateBlockers = [];
  const decisionEvidence = getBoundJson(
    'masterplans/05-combined-zones/phase1-design-decisions.json',
  );
  if (decisionEvidence?.summary?.phase1DecisionGatePassed !== true) {
    semanticGateBlockers.push('bound-decision-ledger-not-pass');
  }
  if (relicEvidence?.g06Disposition?.status !== 'PASS') {
    semanticGateBlockers.push('bound-protected-feature-gate-not-pass');
  }
  const c1Evidence = getBoundJson(
    'masterplans/05-combined-zones/phase1-c1-pilot-coordination.json',
  );
  if (
    c1Evidence?.decision?.phase1R01Status !== 'PASS'
    || !c1Evidence?.exactPlanCoordination?.physicalTargetCellSet
    || !c1Evidence?.exactPlanCoordination?.interactionCellSet
    || !(c1Evidence?.decision?.operationCellCount > 0)
    || c1Evidence?.decision?.operationsEmitted !== true
  ) {
    semanticGateBlockers.push('bound-c1-physical-pilot-not-pass');
  }
  const siteGateEvidence = getBoundJson(
    'masterplans/05-combined-zones/phase1-site-gate-audit.json',
  );
  if (
    siteGateEvidence?.decision?.phase1Exit !== 'PASS'
    || siteGateEvidence?.decision?.constructionReadiness !== 'PASS'
    || siteGateEvidence?.decision?.liveBuildMayProceed !== true
  ) {
    semanticGateBlockers.push('bound-site-phase1-exit-not-pass');
  }

  const currentGateEvaluations = contract.currentGateEvaluations ?? [];
  const gateEvaluationById = new Map(
    currentGateEvaluations.map((gate) => [gate.id, gate]),
  );
  if (gateEvaluationById.size !== currentGateEvaluations.length) {
    errors.push('duplicate-current-gate-evaluation-id');
  }
  const incompleteGateEvaluationIds = mayStartTransaction.filter((gateId) => {
    const evaluation = gateEvaluationById.get(gateId);
    if (evaluation?.status !== 'PASS' || !Array.isArray(evaluation.evidence)) return true;
    return evaluation.evidence.length === 0 || evaluation.evidence.some((item) => {
      const binding = authorityBindingByPath.get(item?.path);
      return !binding || item.sha256 !== binding.sha256;
    });
  });
  const declaredBlockers = contract.currentBlockers ?? [];
  const blockers = [
    ...unresolvedDecisionIds.map((id) => `unresolved-design-decision:${id}`),
    ...missingToolingIds.map((id) => `missing-project-tooling:${id}`),
    ...incompleteProtectedSubjects.map(
      (id) => `missing-protected-core-or-reviewed-buffer:${id}`,
    ),
    ...semanticGateBlockers.map((id) => `semantic-gate-blocker:${id}`),
    ...incompleteGateEvaluationIds.map((id) => `current-gate-not-pass:${id}`),
    ...declaredBlockers.map((blocker, index) => `declared-blocker-${index + 1}:${blocker}`),
  ];
  const ready = errors.length === 0 && blockers.length === 0;
  const calculatedStatus = errors.length > 0
    ? 'CONTRACT_INVALID'
    : ready
      ? 'READY_FOR_RELEASE_GATE_EVALUATION'
      : 'CONTRACT_VALID_BUILD_BLOCKED';
  if (contract.status !== calculatedStatus) {
    errors.push(
      `declared-status-mismatch:${contract.status ?? 'missing'}:${calculatedStatus}`,
    );
  }
  if (contract.advancementRule?.currentResult !== (ready ? 'READY' : 'BLOCKED')) {
    errors.push('advancement-result-mismatch');
  }

  return {
    schemaVersion: 1,
    contract: path.relative(ROOT, contractPath),
    contractSha256: sha256(contractPath),
    status: errors.length === 0 ? calculatedStatus : 'CONTRACT_INVALID',
    contractValid: errors.length === 0,
    ready,
    errors,
    bindingChecks,
    unresolvedDecisionIds,
    missingToolingIds,
    incompleteProtectedSubjects,
    semanticGateBlockers,
    incompleteGateEvaluationIds,
    blockerCount: blockers.length,
    blockers,
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
