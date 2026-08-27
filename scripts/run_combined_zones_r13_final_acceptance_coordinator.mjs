#!/usr/bin/env node
/**
 * Append-only offline coordinator for terminal R13 acceptance.
 *
 * Default mode emits a truthful WAIT/dry-run plan. Explicit `--execute` with a
 * fresh `--run-root` and exact input hashes sequences existing frozen tools:
 * terminal physical-post verifier -> prepublication R13 readiness -> terminal
 * acceptance bootstrap -> G18 Anvil render/map/transactional DB acceptance ->
 * final consolidated R13 acceptance. It never calls Minecraft or a service and
 * never publishes externally.
 */

import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const has = (flag) => argv.includes(flag);
const GENERATED_AT = value('--generated-at', '2026-08-22T06:00:00Z');
const EXECUTE = has('--execute');
const PLAN_OUT = value(
  '--plan-out',
  'data/world-review/combined-zones-r13-final-acceptance-coordinator-current/coordinator-plan.json',
);
const RUN_ROOT = value('--run-root');
const FINAL_LEDGER = value(
  '--final-ledger',
  'data/world-review/combined-zones-r12r-live-20260822T053631Z/evidence-ledger.json',
);
const FINAL_POST_QA = value(
  '--final-post-qa',
  'data/world-review/combined-zones-r12r-live-20260822T053631Z/r12r-post-release-qa-v2.json',
);
const R12_COMMISSIONING = value(
  '--r12-commissioning',
  'data/world-review/combined-zones-r12-b09-bounded-transport-commissioning/r12-b09-commissioning.json',
);
const R12Q_LEDGER = value(
  '--r12q-predecessor-ledger',
  'data/world-review/combined-zones-r12q-live-20260822T044855Z/evidence-ledger.json',
);
const R12Q_QA = value(
  '--r12q-predecessor-post-qa',
  'data/world-review/combined-zones-r12q-live-20260822T044855Z/r12q-post-release-qa.json',
);
const R10_CLOSURE = value(
  '--r10-closure',
  'data/world-review/combined-zones-r10-mvp-closure/r10-mvp-closure.json',
);
const SOURCE_SHOT_PLAN = value(
  '--source-shot-plan',
  'data/world-review/combined-zones-r13-g18-terminal-media-shot-plan-current/terminal-media-shot-plan.json',
);
const WORLD_REVIEW_ROOT = value('--world-review-root', 'data/world-review');
const DATABASE = value('--database', 'data/world-map.db');
const CAPTURE_MODE = value('--capture-mode', 'render');
const INGEST_ROOT = value('--ingest-root');
const MAP_MODE = value('--map-mode', 'render');
const MAP_INGEST_ROOT = value('--map-ingest-root');
const EXPECTED = Object.freeze({
  finalLedger: value('--expected-final-ledger-sha256'),
  finalPostQa: value('--expected-final-post-qa-sha256'),
  r12Commissioning: value('--expected-r12-commissioning-sha256'),
  r12qLedger: value('--expected-r12q-ledger-sha256'),
  r12qPostQa: value('--expected-r12q-post-qa-sha256'),
  r10Closure: value('--expected-r10-closure-sha256'),
  database: value('--expected-database-sha256'),
});

const SCRIPTS = Object.freeze({
  terminalVerifier: 'scripts/verify_combined_zones_r13_terminal_post_acceptance.mjs',
  consolidatedVerifier: 'scripts/verify_combined_zones_r13_consolidated_mvp_acceptance.mjs',
  publicationAcceptance: 'scripts/generate_combined_zones_r13_g18_publication_acceptance.mjs',
  g18Orchestrator: 'scripts/run_combined_zones_r13_g18_terminal_orchestrator.mjs',
});
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const serialize = (record) => `${JSON.stringify(record, null, 2)}\n`;
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sha256File = (filename) => sha256(fs.readFileSync(absolute(filename)));
const stableHash = (record) => sha256(Buffer.from(serialize(record)));
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const binding = (filename) => ({
  path: relative(filename), sha256: sha256File(filename),
  bytes: fs.statSync(absolute(filename)).size,
});
const maybeBinding = (filename) => fs.existsSync(absolute(filename))
  ? { ...binding(filename), exists: true }
  : { path: relative(filename), sha256: null, bytes: null, exists: false };
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R13 final coordinator rejected: ${message}`);
};
const writeExclusive = (filename, content) => {
  const target = absolute(filename);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, { flag: 'wx' });
};
const writeAtomic = (filename, content) => {
  const target = absolute(filename);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, content);
  fs.renameSync(temporary, target);
};
const shellQuote = (token) => `'${String(token).replaceAll("'", "'\\''")}'`;
const commandText = (command, args) => [command, ...args].map(shellQuote).join(' ');
const run = (script, args, timeout = 120_000) => {
  const result = spawnSync(process.execPath, [absolute(script), ...args], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 24 * 1024 * 1024, timeout,
  });
  if (result.status !== 0) {
    throw new Error(`${path.basename(script)} exited ${result.status}: ${
      (result.stderr || result.stdout).trim()}`);
  }
  return result.stdout.trim();
};

invariant(['render', 'ingest'].includes(CAPTURE_MODE), '--capture-mode must be render or ingest');
invariant(['render', 'ingest'].includes(MAP_MODE), '--map-mode must be render or ingest');
for (const script of Object.values(SCRIPTS)) invariant(fs.existsSync(absolute(script)), `${script} is missing`);

const inputs = {
  finalLedger: FINAL_LEDGER,
  finalPostQa: FINAL_POST_QA,
  r12Commissioning: R12_COMMISSIONING,
  r12qLedger: R12Q_LEDGER,
  r12qPostQa: R12Q_QA,
  r10Closure: R10_CLOSURE,
  database: DATABASE,
};
const inputBindings = Object.fromEntries(Object.entries(inputs).map(
  ([id, filename]) => [id, maybeBinding(filename)],
));
const scriptBindings = Object.fromEntries(Object.entries(SCRIPTS).map(
  ([id, filename]) => [id, binding(filename)],
));
const sourceShotPlanBinding = maybeBinding(SOURCE_SHOT_PLAN);
const waitingReasons = [];
for (const [id, evidence] of Object.entries(inputBindings)) {
  if (!evidence.exists) waitingReasons.push(`${id}: required input does not exist.`);
  if (!EXPECTED[id]) waitingReasons.push(`${id}: exact expected SHA-256 is not supplied.`);
  else if (evidence.exists && evidence.sha256 !== EXPECTED[id]) {
    waitingReasons.push(`${id}: observed SHA-256 does not equal the supplied expected SHA-256.`);
  }
}
if (!sourceShotPlanBinding.exists) waitingReasons.push('sourceShotPlan: required input does not exist.');
if (CAPTURE_MODE === 'ingest' && !INGEST_ROOT) waitingReasons.push('capture ingest mode requires --ingest-root.');
if (MAP_MODE === 'ingest' && !MAP_INGEST_ROOT) waitingReasons.push('map ingest mode requires --map-ingest-root.');
if (EXECUTE && !RUN_ROOT) waitingReasons.push('--execute requires a fresh --run-root.');

const stagePaths = RUN_ROOT ? {
  terminal: path.join(RUN_ROOT, '01-terminal-post-acceptance/r13-terminal-post-acceptance.json'),
  terminalMd: path.join(RUN_ROOT, '01-terminal-post-acceptance/r13-terminal-post-acceptance.md'),
  prepublication: path.join(RUN_ROOT, '02-prepublication-readiness/r13-prepublication-readiness.json'),
  prepublicationMd: path.join(RUN_ROOT, '02-prepublication-readiness/r13-prepublication-readiness.md'),
  bootstrapRoot: path.join(RUN_ROOT, '03-terminal-acceptance-bootstrap'),
  g18Root: path.join(RUN_ROOT, '04-g18-terminal-orchestration'),
  captureRoot: path.join(RUN_ROOT, '04-g18-terminal-orchestration/captures'),
  mapRoot: path.join(RUN_ROOT, '04-g18-terminal-orchestration/map'),
  final: path.join(RUN_ROOT, '05-final-r13-acceptance/r13-final-acceptance.json'),
  finalMd: path.join(RUN_ROOT, '05-final-r13-acceptance/r13-final-acceptance.md'),
  seal: path.join(RUN_ROOT, 'r13-final-acceptance-coordinator-seal.json'),
} : null;
const executionTemplate = commandText('node', [
  SCRIPTS.g18Orchestrator.replace('run_combined_zones_r13_g18_terminal_orchestrator.mjs',
    'run_combined_zones_r13_final_acceptance_coordinator.mjs'),
  '--final-ledger', '<R12R_LEDGER_JSON>',
  '--expected-final-ledger-sha256', '<SHA256>',
  '--final-post-qa', '<R12R_POST_QA_JSON>',
  '--expected-final-post-qa-sha256', '<SHA256>',
  '--r12-commissioning', '<R12_COMMISSIONING_JSON>',
  '--expected-r12-commissioning-sha256', '<SHA256>',
  '--r12q-predecessor-ledger', R12Q_LEDGER,
  '--expected-r12q-ledger-sha256', inputBindings.r12qLedger.sha256 ?? '<SHA256>',
  '--r12q-predecessor-post-qa', R12Q_QA,
  '--expected-r12q-post-qa-sha256', inputBindings.r12qPostQa.sha256 ?? '<SHA256>',
  '--r10-closure', R10_CLOSURE,
  '--expected-r10-closure-sha256', inputBindings.r10Closure.sha256 ?? '<SHA256>',
  '--source-shot-plan', SOURCE_SHOT_PLAN,
  '--database', DATABASE, '--expected-database-sha256', inputBindings.database.sha256 ?? '<SHA256>',
  '--run-root', '<FRESH_APPEND_ONLY_RUN_ROOT>', '--execute',
]);
const planWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-r13-final-acceptance-coordinator-plan-v1',
  generatedAtUtc: GENERATED_AT,
  status: waitingReasons.length === 0
    ? 'READY_R13_FINAL_ACCEPTANCE_COORDINATOR_DRY_RUN'
    : 'WAITING_R13_FINAL_ACCEPTANCE_COORDINATOR_INPUTS',
  mode: EXECUTE ? 'EXECUTE_REQUESTED' : 'DRY_RUN_DEFAULT',
  inputs: inputBindings,
  expectedSha256: EXPECTED,
  frozenScripts: scriptBindings,
  stageOrder: [
    '01_TERMINAL_PHYSICAL_POST_ACCEPTANCE',
    '02_PREPUBLICATION_R13_G16_G17_READINESS',
    '03_G18_TERMINAL_ACCEPTANCE_BOOTSTRAP',
    '04_G18_ANVIL_CAPTURE_MAP_TRANSACTIONAL_DATABASE_AND_PUBLICATION_ACCEPTANCE',
    '05_FINAL_R13_G16_G19_CONSOLIDATED_ACCEPTANCE',
  ],
  appendOnly: {
    requiredFreshRunRoot: true,
    runRoot: RUN_ROOT ? relative(RUN_ROOT) : null,
    existingOutputsOverwritten: false,
  },
  terminalMedia: {
    sourceShotPlan: sourceShotPlanBinding,
    captureMode: CAPTURE_MODE,
    ingestRoot: INGEST_ROOT ? relative(INGEST_ROOT) : null,
    mapMode: MAP_MODE,
    mapIngestRoot: MAP_INGEST_ROOT ? relative(MAP_INGEST_ROOT) : null,
    automatedOfflineAnvilRenderAvailable: true,
  },
  executionTemplate,
  waitingReasons,
  safetyBoundary: {
    dryRunByDefault: true, currentInvocationExecuted: false,
    liveMinecraftCalls: false, worldMutation: false, serviceMutation: false,
    databaseMutation: false, docsMutation: false, canonicalBuildopsMutation: false,
    externalPublication: false,
  },
};
const plan = { ...planWithoutIdentity, coordinatorPlanPayloadSha256: stableHash(planWithoutIdentity) };
writeAtomic(PLAN_OUT, serialize(plan));
if (!EXECUTE) {
  process.stdout.write(`${JSON.stringify({ status: plan.status, out: relative(PLAN_OUT),
    coordinatorPlanPayloadSha256: plan.coordinatorPlanPayloadSha256,
    mutationPerformed: false, waitingReasons }, null, 2)}\n`);
  process.exit(0);
}

invariant(waitingReasons.length === 0, `execution inputs are incomplete: ${waitingReasons.join(' ')}`);
invariant(RUN_ROOT && !fs.existsSync(absolute(RUN_ROOT)), '--run-root must not already exist');
invariant(sourceShotPlanBinding.exists
  && sha256File(SOURCE_SHOT_PLAN) === sourceShotPlanBinding.sha256,
  'source shot plan drifted before execution');
for (const [id, evidence] of Object.entries(inputBindings)) {
  invariant(evidence.sha256 === EXPECTED[id], `${id} SHA-256 drifted before execution`);
}
fs.mkdirSync(absolute(RUN_ROOT), { recursive: false });
const stages = [];
let g18Report = null;
let coordinatorDatabaseCompensated = false;
try {
  run(SCRIPTS.terminalVerifier, [
    '--generated-at', GENERATED_AT, '--out', stagePaths.terminal,
    '--markdown', stagePaths.terminalMd, '--final-ledger', FINAL_LEDGER,
    '--final-post-qa', FINAL_POST_QA, '--r12q-predecessor-ledger', R12Q_LEDGER,
    '--r12q-predecessor-post-qa', R12Q_QA, '--r12-commissioning', R12_COMMISSIONING,
    '--r10-closure', R10_CLOSURE,
    '--world-review-root', WORLD_REVIEW_ROOT,
  ]);
  const terminal = readJson(stagePaths.terminal);
  invariant(terminal.status === 'PASS_R13_TERMINAL_POST_ACCEPTED'
    && terminal.summary?.accepted === true && terminal.summary?.acceptedDependencyCount === 6,
  'terminal physical-post verifier did not accept all six dependencies');
  invariant(terminal.finalLedger?.path === relative(FINAL_LEDGER)
    && terminal.finalLedger?.sha256 === EXPECTED.finalLedger,
  'terminal verifier did not hash-bind the supplied final ledger');
  stages.push({ id: '01_TERMINAL_PHYSICAL_POST_ACCEPTANCE', status: 'PASS',
    evidence: binding(stagePaths.terminal) });

  run(SCRIPTS.consolidatedVerifier, [
    '--generated-at', GENERATED_AT,
    '--evidence-dir', path.dirname(stagePaths.prepublication),
    '--out', stagePaths.prepublication, '--markdown', stagePaths.prepublicationMd,
    '--r12-commissioning', R12_COMMISSIONING,
    '--r10-closure', R10_CLOSURE,
    '--publication-root', path.join(RUN_ROOT, 'prepublication-must-remain-absent'),
    '--publication-mode', 'prepublication',
  ]);
  const prepublication = readJson(stagePaths.prepublication);
  const prepublicationGates = Object.fromEntries(prepublication.gates.map(({ id, status }) => [id, status]));
  invariant(prepublication.status === 'WAITING_R13_CONSOLIDATED_MVP_ACCEPTANCE'
    && prepublication.summary?.passedDependencyCount === 6
    && prepublicationGates.G16_IMMUTABLE_POST_AND_ROLLBACK_PREFLIGHT === 'PASS'
    && prepublicationGates.G17_FUNCTIONAL_POST_QA === 'PASS'
    && prepublicationGates.G18_MEDIA_AND_PUBLICATION === 'WAITING'
    && prepublicationGates.G19_FINAL_ACCEPTANCE === 'WAITING',
  'prepublication readiness must pass six dependencies plus G16/G17 and wait only on G18/G19');
  stages.push({ id: '02_PREPUBLICATION_R13_G16_G17_READINESS', status: 'PASS',
    evidence: binding(stagePaths.prepublication) });

  run(SCRIPTS.publicationAcceptance, [
    '--generated-at', GENERATED_AT, '--out-root', stagePaths.bootstrapRoot,
    '--binding-root', stagePaths.bootstrapRoot, '--r13-report', stagePaths.prepublication,
    '--terminal-ledger', FINAL_LEDGER, '--terminal-qa', FINAL_POST_QA,
  ]);
  const bootstrapTerminalPath = path.join(stagePaths.bootstrapRoot, 'terminal-post-acceptance.json');
  const bootstrapPublicationPath = path.join(stagePaths.bootstrapRoot, 'publication-manifest.json');
  const bootstrapTerminal = readJson(bootstrapTerminalPath);
  const bootstrapPublication = readJson(bootstrapPublicationPath);
  invariant(bootstrapTerminal.status === 'PASS_R13_G18_TERMINAL_POST_ACCEPTED'
    && bootstrapTerminal.terminalCompleteSaveSha256 === terminal.finalLedger.postCompleteSaveSha256,
  `G18 terminal bootstrap did not bind the accepted terminal complete save: ${
    bootstrapTerminal.status}; ${
    (bootstrapTerminal.verification?.waitingReasons ?? []).join('; ')}`);
  invariant(bootstrapPublication.status === 'WAITING_R13_G18_MEDIA_AND_PUBLICATION',
    'bootstrap must remain waiting before G18 media/map/database evidence');
  invariant(bootstrapTerminal.sourceBindings?.ledger?.sha256 === EXPECTED.finalLedger
    && bootstrapTerminal.sourceBindings?.independentPostQa?.sha256 === EXPECTED.finalPostQa,
  'G18 terminal bootstrap did not bind the exact final ledger and QA inputs');
  stages.push({ id: '03_G18_TERMINAL_ACCEPTANCE_BOOTSTRAP', status: 'PASS',
    evidence: binding(bootstrapTerminalPath) });

  const g18Args = [
    '--generated-at', GENERATED_AT, '--terminal-post-acceptance', bootstrapTerminalPath,
    '--source-shot-plan', SOURCE_SHOT_PLAN,
    '--capture-mode', CAPTURE_MODE, '--capture-root', stagePaths.captureRoot,
    '--map-mode', MAP_MODE, '--map-root', stagePaths.mapRoot,
    '--database', DATABASE, '--expected-database-sha256', EXPECTED.database,
    '--terminal-ledger', FINAL_LEDGER, '--terminal-qa', FINAL_POST_QA,
    '--r13-report', stagePaths.prepublication, '--out-root', stagePaths.g18Root,
    '--execute',
  ];
  if (CAPTURE_MODE === 'ingest') g18Args.push('--ingest-root', INGEST_ROOT);
  if (MAP_MODE === 'ingest') g18Args.push('--map-ingest-root', MAP_INGEST_ROOT);
  run(SCRIPTS.g18Orchestrator, g18Args, 60 * 60_000);
  const g18ReportPath = path.join(stagePaths.g18Root, 'terminal-orchestrator-report.json');
  g18Report = readJson(g18ReportPath);
  invariant(g18Report.status === 'PASS_R13_G18_TERMINAL_ORCHESTRATION'
    && g18Report.terminalCompleteSaveSha256 === bootstrapTerminal.terminalCompleteSaveSha256,
  'G18 terminal orchestration did not pass against the bootstrapped terminal');
  const publicationRoot = path.join(stagePaths.g18Root, 'frozen-acceptance-chain');
  const publication = readJson(path.join(publicationRoot, 'publication-manifest.json'));
  invariant(publication.status === 'PASS_R13_G18_MEDIA_AND_PUBLICATION_ACCEPTED',
    'G18 publication acceptance did not pass');
  stages.push({
    id: '04_G18_ANVIL_CAPTURE_MAP_TRANSACTIONAL_DATABASE_AND_PUBLICATION_ACCEPTANCE',
    status: 'PASS', evidence: binding(g18ReportPath),
  });

  run(SCRIPTS.consolidatedVerifier, [
    '--generated-at', GENERATED_AT, '--evidence-dir', path.dirname(stagePaths.final),
    '--out', stagePaths.final, '--markdown', stagePaths.finalMd,
    '--r12-commissioning', R12_COMMISSIONING,
    '--r10-closure', R10_CLOSURE,
    '--publication-root', publicationRoot, '--publication-mode', 'current',
  ]);
  const final = readJson(stagePaths.final);
  const finalGates = Object.fromEntries(final.gates.map(({ id, status }) => [id, status]));
  invariant(final.status === 'PASS_R13_CONSOLIDATED_MVP_ACCEPTED'
    && final.summary?.readyForFinalAcceptance === true
    && final.summary?.passedDependencyCount === 6
    && Object.values(finalGates).every((status) => status === 'PASS'),
  'final consolidated verifier did not accept all dependencies and G16-G19');
  stages.push({ id: '05_FINAL_R13_G16_G19_CONSOLIDATED_ACCEPTANCE', status: 'PASS',
    evidence: binding(stagePaths.final) });

  const sealWithoutIdentity = {
    schemaVersion: 1,
    id: 'combined-zones-r13-final-acceptance-coordinator-seal-v1',
    generatedAtUtc: GENERATED_AT,
    status: 'PASS_R13_FINAL_ACCEPTANCE_COORDINATED',
    terminalCompleteSaveSha256: bootstrapTerminal.terminalCompleteSaveSha256,
    plan: binding(PLAN_OUT),
    exactInputs: inputBindings,
    frozenScripts: scriptBindings,
    stages,
    finalR13Acceptance: binding(stagePaths.final),
    g18PublicationAcceptance: binding(path.join(publicationRoot, 'publication-manifest.json')),
    database: {
      preSha256: EXPECTED.database,
      postSha256: g18Report.databasePostSha256
        ?? g18Report.databaseTransaction?.postSha256 ?? sha256File(DATABASE),
    },
    safetyBoundary: {
      liveMinecraftCalls: false, worldMutation: false, serviceMutation: false,
      docsMutation: false, canonicalBuildopsMutation: false,
      externalPublicationPerformed: false,
    },
  };
  const seal = { ...sealWithoutIdentity,
    coordinatorSealPayloadSha256: stableHash(sealWithoutIdentity) };
  writeExclusive(stagePaths.seal, serialize(seal));
  process.stdout.write(`${JSON.stringify({ status: seal.status, out: relative(stagePaths.seal),
    coordinatorSealPayloadSha256: seal.coordinatorSealPayloadSha256,
    terminalCompleteSaveSha256: seal.terminalCompleteSaveSha256,
    finalR13Acceptance: seal.finalR13Acceptance,
  }, null, 2)}\n`);
} catch (error) {
  if (g18Report?.status === 'PASS_R13_G18_TERMINAL_ORCHESTRATION') {
    const transactionPath = path.join(stagePaths.g18Root, 'database-import-transaction.json');
    if (fs.existsSync(absolute(transactionPath))) {
      const transaction = readJson(transactionPath);
      const backup = transaction.backup?.path;
      if (backup && fs.existsSync(absolute(backup))) {
        for (const suffix of ['-wal', '-shm', '-journal']) {
          fs.rmSync(`${absolute(DATABASE)}${suffix}`, { force: true });
        }
        fs.copyFileSync(absolute(backup), absolute(DATABASE));
        coordinatorDatabaseCompensated = sha256File(DATABASE) === EXPECTED.database;
      }
    }
  }
  const failure = {
    schemaVersion: 1,
    id: 'combined-zones-r13-final-acceptance-coordinator-failure-v1',
    generatedAtUtc: GENERATED_AT,
    status: coordinatorDatabaseCompensated
      ? 'FAILED_R13_FINAL_ACCEPTANCE_DATABASE_COMPENSATED'
      : 'FAILED_R13_FINAL_ACCEPTANCE_NO_COORDINATOR_COMPENSATION_REQUIRED',
    error: error.message,
    stages,
    database: { expectedPreSha256: EXPECTED.database,
      observedSha256: fs.existsSync(absolute(DATABASE)) ? sha256File(DATABASE) : null,
      compensated: coordinatorDatabaseCompensated },
    liveMinecraftCalls: false,
    worldMutation: false,
    serviceMutation: false,
    externalPublicationPerformed: false,
  };
  writeExclusive(stagePaths.seal, serialize(failure));
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
}
