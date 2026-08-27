#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const INPUT = value(
  '--input',
  'docs/masterplans/master-plan-railway-report-input.json',
);
const OUT = value('--out', null);
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256Bytes = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sha256File = (filename) => sha256Bytes(fs.readFileSync(absolute(filename)));
const isSha256 = (valueToCheck) => /^[a-f0-9]{64}$/.test(valueToCheck ?? '');
const serialize = (valueToSerialize) => `${JSON.stringify(valueToSerialize, null, 2)}\n`;

function verifyBinding(binding, label, errors, checks) {
  const filename = binding?.path;
  const exists = typeof filename === 'string'
    && fs.existsSync(absolute(filename))
    && fs.statSync(absolute(filename)).isFile();
  const observedSha256 = exists ? sha256File(filename) : null;
  const observedBytes = exists ? fs.statSync(absolute(filename)).size : null;
  const passed = exists
    && isSha256(binding?.sha256)
    && observedSha256 === binding.sha256
    && (binding.bytes === undefined || observedBytes === binding.bytes);
  checks.push({
    label,
    path: filename ?? null,
    expectedSha256: binding?.sha256 ?? null,
    observedSha256,
    expectedBytes: binding?.bytes ?? null,
    observedBytes,
    passed,
  });
  if (!passed) errors.push(`binding-failed:${label}`);
}

export function validateMasterPlanRailway(inputPath = INPUT) {
  const inputBytes = fs.readFileSync(absolute(inputPath));
  const input = JSON.parse(inputBytes.toString('utf8'));
  const errors = [];
  const bindingChecks = [];
  const structuralChecks = [];
  const check = (condition, id) => {
    structuralChecks.push({ id, passed: Boolean(condition) });
    if (!condition) errors.push(id);
  };

  check(input.schemaVersion === 1, 'schema-version-1');
  check(input.status === 'PASS_READ_ONLY_RECONCILIATION_READY_FOR_REPORT', 'input-status-pass');
  check(input.authority?.planningOnly === true, 'planning-only');
  check(input.authority?.worldEditAuthorizedByThisArtifact === false, 'no-world-edit-authority');
  check(input.authority?.liveCallsPerformed === false, 'no-live-calls');
  check(input.authority?.worldMutationPerformed === false, 'no-world-mutation');
  check(input.authority?.databaseMutationPerformed === false, 'no-database-mutation');
  check(input.authority?.publicationPerformed === false, 'no-publication');

  verifyBinding(input.currentEvidence?.worldCatalog, 'current-world-catalog', errors, bindingChecks);
  const latestPost = input.currentEvidence?.latestAcceptedCombinedZonesPost;
  check(
    typeof latestPost?.path === 'string'
      && fs.existsSync(absolute(latestPost.path))
      && fs.statSync(absolute(latestPost.path)).isDirectory()
      && isSha256(latestPost.completeSaveSha256)
      && isSha256(latestPost.regionSha256)
      && isSha256(latestPost.completedReleaseIdentitySha256),
    'latest-accepted-post-binding-shape',
  );

  const expectedPlanIds = Array.from({ length: 13 }, (_, index) => `MP${String(index + 1).padStart(2, '0')}`);
  const plans = input.plans ?? [];
  check(plans.length === 13, 'thirteen-masterplans-required');
  check(JSON.stringify(plans.map(({ id }) => id)) === JSON.stringify(expectedPlanIds), 'masterplan-order-01-through-13');
  check(new Set(plans.map(({ slug }) => slug)).size === 13, 'unique-plan-slugs');
  for (const plan of plans) {
    verifyBinding(plan.sourcePlan, `${plan.id}-source-plan`, errors, bindingChecks);
    for (const [index, evidence] of (plan.evidence ?? []).entries()) {
      verifyBinding(evidence, `${plan.id}-evidence-${index + 1}`, errors, bindingChecks);
    }
    check(typeof plan.deliveryClass === 'string' && plan.deliveryClass.length > 0, `${plan.id}-delivery-class`);
    check(Array.isArray(plan.built) && plan.built.length > 0, `${plan.id}-built-list`);
    check(Array.isArray(plan.unbuiltOrUnproven) && plan.unbuiltOrUnproven.length > 0, `${plan.id}-unbuilt-list`);
    check(Array.isArray(plan.proposedRemainingDesign) && plan.proposedRemainingDesign.length > 0, `${plan.id}-remaining-design-list`);
    check(typeof plan.hardBoundary === 'string' && plan.hardBoundary.length > 20, `${plan.id}-hard-boundary`);
  }

  const census = input.currentEvidence?.catalogCensus ?? [];
  check(census.length === 8, 'eight-current-catalog-census-projects');
  check(census.every((item) => item.total === item.complete + item.removed), 'catalog-census-accounted');

  const railway = input.railway ?? {};
  check(railway.currentStatus === 'NO_CONTINUOUS_CROSS_TOWN_PASSENGER_RAILWAY_PROVEN', 'railway-nonclaim');
  check(railway.proposedDesign?.status === 'PROPOSED_NOT_SET_OUT_NOT_BUILT', 'railway-proposed-only');
  check((railway.acceptedComponents ?? []).length >= 6, 'railway-accepted-component-register');
  check((railway.missingForPassengerRail ?? []).length >= 5, 'railway-gap-register');

  const stages = input.dependencyOrder ?? [];
  const expectedStageIds = Array.from({ length: 10 }, (_, index) => `X${index}`);
  check(JSON.stringify(stages.map(({ id }) => id)) === JSON.stringify(expectedStageIds), 'execution-stages-x0-through-x9');
  const stageOrder = new Map(stages.map(({ id }, index) => [id, index]));
  check(stages.every((stage, index) => (
    stage.order === index
      && (stage.dependsOn ?? []).every((dependency) => (
        stageOrder.has(dependency) && stageOrder.get(dependency) < index
      ))
  )), 'execution-stage-dag');
  check((input.hardExecutionBoundaries ?? []).length >= 8, 'hard-boundary-register');

  const valid = errors.length === 0;
  return {
    schemaVersion: 1,
    status: valid
      ? 'PASS_MASTER_PLAN_RAILWAY_RECONCILIATION_VALID'
      : 'FAIL_MASTER_PLAN_RAILWAY_RECONCILIATION_INVALID',
    valid,
    input: {
      path: relative(inputPath),
      sha256: sha256Bytes(inputBytes),
      bytes: inputBytes.length,
    },
    summary: {
      planCount: plans.length,
      builtClaimCount: plans.reduce((sum, plan) => sum + (plan.built?.length ?? 0), 0),
      unbuiltOrUnprovenClaimCount: plans.reduce((sum, plan) => sum + (plan.unbuiltOrUnproven?.length ?? 0), 0),
      proposedDesignClaimCount: plans.reduce((sum, plan) => sum + (plan.proposedRemainingDesign?.length ?? 0), 0),
      dependencyStageCount: stages.length,
      bindingCheckCount: bindingChecks.length,
      passedBindingCheckCount: bindingChecks.filter(({ passed }) => passed).length,
      structuralCheckCount: structuralChecks.length,
      passedStructuralCheckCount: structuralChecks.filter(({ passed }) => passed).length,
      errorCount: errors.length,
    },
    errors,
    bindingChecks,
    structuralChecks,
    safetyBoundary: {
      readOnlyValidation: true,
      liveCallsPerformed: false,
      worldMutationPerformed: false,
      databaseMutationPerformed: false,
      serviceMutationPerformed: false,
      publicationPerformed: false,
    },
  };
}

const report = validateMasterPlanRailway(INPUT);
const serialized = serialize(report);
if (OUT) {
  const target = absolute(OUT);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, serialized);
}
process.stdout.write(serialized);
if (!report.valid) process.exitCode = 1;
