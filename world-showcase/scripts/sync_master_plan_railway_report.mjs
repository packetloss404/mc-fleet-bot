#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const INPUT = path.resolve(REPO_ROOT, value(
  '--input',
  'docs/masterplans/master-plan-railway-report-input.json',
));
const NARRATIVE = path.resolve(REPO_ROOT, value(
  '--narrative',
  'docs/masterplans/MASTER-PLAN-RAILWAY.md',
));
const VALIDATION = path.resolve(REPO_ROOT, value(
  '--validation',
  'data/world-review/master-plan-railway-reconciliation-20260822T203000Z/validation.json',
));
const OUTPUT = path.resolve(SITE_ROOT, value('--out-dir', 'public/master-plan-railway'));
const SUPPORT_DOCUMENTS = [
  {
    source: path.resolve(REPO_ROOT, 'docs/masterplans/PASSENGER-RAILWAY-PROGRAM-2026-08-22.md'),
    output: 'PASSENGER-RAILWAY-PROGRAM-2026-08-22.md',
  },
  {
    source: path.resolve(REPO_ROOT, 'docs/masterplans/PASSENGER-RAILWAY-INVENTORY-2026-08-22.md'),
    output: 'PASSENGER-RAILWAY-INVENTORY-2026-08-22.md',
  },
  {
    source: path.resolve(REPO_ROOT, 'docs/masterplans/2026-08-22-passenger-railway-network-design.md'),
    output: '2026-08-22-passenger-railway-network-design.md',
  },
  {
    source: path.resolve(REPO_ROOT, 'docs/masterplans/passenger-railway-stop-register-2026-08-22.json'),
    output: 'passenger-railway-stop-register-2026-08-22.json',
  },
  {
    source: path.resolve(REPO_ROOT, 'docs/masterplans/PASSENGER-RAILWAY-ENGINEERING-STANDARD-2026-08-22.md'),
    output: 'PASSENGER-RAILWAY-ENGINEERING-STANDARD-2026-08-22.md',
  },
  {
    source: path.resolve(REPO_ROOT, 'docs/masterplans/PASSENGER-RAILWAY-BUILDER-PACKETS-2026-08-23.md'),
    output: 'PASSENGER-RAILWAY-BUILDER-PACKETS-2026-08-23.md',
  },
];

const invariant = (condition, message) => {
  if (!condition) throw new Error(`Master Plan publication rejected: ${message}`);
};
const readJson = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const sha256 = (filename) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename))
  .digest('hex');
const binding = (filename) => ({
  path: path.relative(REPO_ROOT, filename).split(path.sep).join('/'),
  sha256: sha256(filename),
  bytes: fs.statSync(filename).size,
});
const outputBinding = (filename) => ({
  file: path.basename(filename),
  sha256: sha256(filename),
  bytes: fs.statSync(filename).size,
});

for (const filename of [INPUT, NARRATIVE, VALIDATION, ...SUPPORT_DOCUMENTS.map(({ source }) => source)]) {
  invariant(fs.existsSync(filename), `missing input ${filename}`);
}

const report = readJson(INPUT);
const validation = readJson(VALIDATION);
const expectedPlanIds = Array.from({ length: 13 }, (_, index) => (
  `MP${String(index + 1).padStart(2, '0')}`
));

invariant(report.schemaVersion === 1, 'unsupported report schema');
invariant(report.status === 'PASS_READ_ONLY_RECONCILIATION_READY_FOR_REPORT', 'input is not report-ready');
invariant(report.authority?.planningOnly === true, 'planning-only authority is absent');
invariant(report.authority?.worldEditAuthorizedByThisArtifact === false, 'input purports to authorize world edits');
invariant(report.authority?.liveCallsPerformed === false, 'input reports live calls');
invariant(report.authority?.worldMutationPerformed === false, 'input reports world mutation');
invariant(report.authority?.databaseMutationPerformed === false, 'input reports database mutation');
invariant(report.authority?.publicationPerformed === false, 'source input already claims publication');
invariant(report.railway?.currentStatus === 'NO_CONTINUOUS_CROSS_TOWN_PASSENGER_RAILWAY_PROVEN',
  'passenger-rail nonclaim drifted');
invariant(report.railway?.proposedDesign?.status === 'PROPOSED_NOT_SET_OUT_NOT_BUILT',
  'proposed railway status drifted');
invariant(Array.isArray(report.plans) && report.plans.length === 13, 'expected thirteen plans');
invariant(report.plans.map(({ id }) => id).join(',') === expectedPlanIds.join(','),
  'MP01..MP13 order drifted');
invariant(report.plans.every((plan) => (
  plan.qualification
  && plan.hardBoundary
  && plan.built?.length > 0
  && plan.unbuiltOrUnproven?.length > 0
  && plan.proposedRemainingDesign?.length > 0
)), 'a plan is missing its truth boundary or claim sets');
invariant(Array.isArray(report.dependencyOrder) && report.dependencyOrder.length === 10,
  'X0..X9 dependency sequence drifted');

invariant(validation.valid === true, 'validator did not pass');
invariant(validation.status === 'PASS_MASTER_PLAN_RAILWAY_RECONCILIATION_VALID',
  'validator status drifted');
invariant(validation.summary?.planCount === 13, 'validator plan count drifted');
invariant(validation.summary?.errorCount === 0, 'validator contains errors');
invariant(validation.input?.sha256 === sha256(INPUT), 'validator is not bound to current input bytes');
invariant(validation.bindingChecks?.every(({ passed }) => passed === true),
  'validator contains failed evidence bindings');
invariant(validation.bindingChecks.every((check) => {
  const filename = path.resolve(REPO_ROOT, check.path);
  return fs.existsSync(filename) && sha256(filename) === check.observedSha256;
}), 'an evidence binding changed after validation');

const expectedOutput = path.join(SITE_ROOT, 'public', 'master-plan-railway');
invariant(
  OUTPUT === expectedOutput || OUTPUT.startsWith(`${path.resolve('/tmp')}${path.sep}`),
  `refusing unexpected output directory ${OUTPUT}`,
);
fs.rmSync(OUTPUT, { recursive: true, force: true });
fs.mkdirSync(OUTPUT, { recursive: true });

const outputInput = path.join(OUTPUT, 'report-input.json');
const outputNarrative = path.join(OUTPUT, 'master-plan.md');
const outputValidation = path.join(OUTPUT, 'validation.json');
fs.copyFileSync(INPUT, outputInput);
fs.copyFileSync(NARRATIVE, outputNarrative);
fs.copyFileSync(VALIDATION, outputValidation);
const outputSupportDocuments = SUPPORT_DOCUMENTS.map(({ source, output }) => {
  const destination = path.join(OUTPUT, output);
  fs.copyFileSync(source, destination);
  return destination;
});

const manifest = {
  schemaVersion: 1,
  id: 'ianlan-nextgen-master-plan-railway-publication',
  generatedAtUtc: report.generatedAtUtc,
  status: 'PASS_STATIC_ACCEPTANCE_LAYER_PREPARED',
  publicationScope: 'Read-only MP01..MP13 reconciliation and proposed Cross-Town Railway sequence',
  authority: {
    planningOnly: true,
    worldEditAuthorized: false,
    passengerRailCommissioned: false,
  },
  counts: {
    plans: report.plans.length,
    builtClaims: validation.summary.builtClaimCount,
    unbuiltOrUnprovenClaims: validation.summary.unbuiltOrUnprovenClaimCount,
    proposedDesignClaims: validation.summary.proposedDesignClaimCount,
    dependencyStages: report.dependencyOrder.length,
    evidenceBindings: validation.summary.bindingCheckCount,
  },
  source: {
    report: binding(INPUT),
    narrative: binding(NARRATIVE),
    validation: binding(VALIDATION),
    passengerRailwaySupport: SUPPORT_DOCUMENTS.map(({ source, output }) => ({
      ...binding(source),
      output,
    })),
  },
  assets: [outputInput, outputNarrative, outputValidation, ...outputSupportDocuments].map(outputBinding),
};
const outputManifest = path.join(OUTPUT, 'publication-manifest.json');
fs.writeFileSync(outputManifest, `${JSON.stringify(manifest, null, 2)}\n`);

process.stdout.write(`${JSON.stringify({
  status: manifest.status,
  output: outputBinding(outputManifest),
  counts: manifest.counts,
}, null, 2)}\n`);
