#!/usr/bin/env node
/**
 * Guarded terminal G18 evidence orchestrator.
 *
 * The default is a read-only dry run. `--execute` is required before this
 * script renders/copies media, creates map artifacts, or writes a database.
 * The execution lane is entirely offline: it reads an immutable Anvil copy,
 * uses the repository-native renderer, writes exactly the frozen eleven PNGs,
 * imports exactly eleven world_features rows in one IMMEDIATE transaction,
 * and runs the existing read-only G18 evidence/acceptance chain.
 */

import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';
import { loadImage } from 'canvas';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const has = (flag) => argv.includes(flag);
const GENERATED_AT = value('--generated-at', '2026-08-22T05:45:00Z');
const EXECUTE = has('--execute');
const CAPTURE_MODE = value('--capture-mode', 'render');
const MAP_MODE = value('--map-mode', 'render');
const SOURCE_SHOT_PLAN = value(
  '--source-shot-plan',
  'data/world-review/combined-zones-r13-g18-terminal-media-shot-plan-current/terminal-media-shot-plan.json',
);
const TERMINAL = value(
  '--terminal-post-acceptance',
  'data/world-review/combined-zones-r13-mvp-publication/terminal-post-acceptance.json',
);
const TERMINAL_REGIONS = value('--terminal-regions');
const CAPTURE_ROOT = value(
  '--capture-root',
  'data/exports/combined-zones-r13-terminal-media',
);
const INGEST_ROOT = value('--ingest-root');
const MAP_ROOT = value(
  '--map-root',
  'data/exports/combined-zones-r13-terminal-map',
);
const MAP_INGEST_ROOT = value('--map-ingest-root');
const DATABASE = value('--database', 'data/world-map.db');
const EXPECTED_DATABASE_SHA256 = value('--expected-database-sha256');
const TERMINAL_LEDGER = value('--terminal-ledger');
const TERMINAL_QA = value('--terminal-qa');
const R13_REPORT = value('--r13-report');
const OUT_ROOT = value(
  '--out-root',
  'data/world-review/combined-zones-r13-g18-terminal-orchestrator-current',
);
const INJECT_FAILURE = value('--inject-failure-stage');
const ALLOW_TEST_INJECTION = has('--allow-test-injection');

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const serialize = (valueToSerialize) => `${JSON.stringify(valueToSerialize, null, 2)}\n`;
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sha256File = (filename) => sha256(fs.readFileSync(absolute(filename)));
const stableHash = (record) => sha256(Buffer.from(serialize(record)));
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`G18 terminal orchestrator rejected: ${message}`);
};
const binding = (filename) => ({
  path: relative(filename),
  sha256: sha256File(filename),
  bytes: fs.statSync(absolute(filename)).size,
});
const maybeBinding = (filename) => filename && fs.existsSync(absolute(filename))
  ? { ...binding(filename), exists: true }
  : { path: filename ? relative(filename) : null, sha256: null, bytes: null, exists: false };
const writeAtomic = (filename, content) => {
  const target = absolute(filename);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, content);
  fs.renameSync(temporary, target);
};
const copyExact = (source, target) => {
  fs.mkdirSync(path.dirname(absolute(target)), { recursive: true });
  fs.copyFileSync(absolute(source), absolute(target), fs.constants.COPYFILE_EXCL);
};
const shellQuote = (token) => `'${String(token).replaceAll("'", "'\\''")}'`;
const commandText = (command, args) => [command, ...args].map(shellQuote).join(' ');
const run = (script, args, timeout = 120_000) => {
  const result = spawnSync(process.execPath, [absolute(script), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout,
  });
  if (result.status !== 0) {
    throw new Error(
      `${path.basename(script)} exited ${result.status}: ${(result.stderr || result.stdout).trim()}`,
    );
  }
  return result.stdout.trim();
};
const failIfInjected = (stage) => {
  if (INJECT_FAILURE === stage) throw new Error(`synthetic injected failure at ${stage}`);
};
const removeSqliteSidecars = (filename) => {
  for (const suffix of ['-wal', '-shm', '-journal']) {
    fs.rmSync(`${absolute(filename)}${suffix}`, { force: true });
  }
};

invariant(['render', 'ingest'].includes(CAPTURE_MODE), '--capture-mode must be render or ingest');
invariant(['render', 'ingest'].includes(MAP_MODE), '--map-mode must be render or ingest');
invariant(!INJECT_FAILURE || ALLOW_TEST_INJECTION,
  '--inject-failure-stage is test-only and requires --allow-test-injection');
invariant(fs.existsSync(absolute(SOURCE_SHOT_PLAN)), 'source shot plan is missing');
const sourcePlan = readJson(SOURCE_SHOT_PLAN);
invariant(sourcePlan.id === 'combined-zones-r13-g18-terminal-media-shot-plan-v1',
  'source shot-plan identity drifted');
invariant(Array.isArray(sourcePlan.shots) && sourcePlan.shots.length === 11,
  'source shot plan must contain exactly eleven shots');
invariant(sourcePlan.readiness?.shotCount === 11, 'source shot-plan census drifted');
const shotIds = sourcePlan.shots.map(({ id }) => id);
const featureIds = sourcePlan.shots.map(({ featureId }) => featureId);
const filenames = sourcePlan.shots.map(({ expectedRaster }) => expectedRaster?.filename);
invariant(new Set(shotIds).size === 11 && new Set(featureIds).size === 11
  && new Set(filenames).size === 11 && filenames.every((name) => name?.endsWith('.png')),
'shot IDs, feature IDs, and PNG filenames must be exact and unique');
invariant(sourcePlan.shots.every((shot) => (
  Number.isFinite(shot.camera?.x) && Number.isFinite(shot.camera?.y)
  && Number.isFinite(shot.camera?.z) && Number.isFinite(shot.target?.x)
  && Number.isFinite(shot.target?.y) && Number.isFinite(shot.target?.z)
  && ['perspective', 'map'].includes(shot.render?.mode)
  && Number.isSafeInteger(shot.render?.width) && shot.render.width > 0
  && Number.isSafeInteger(shot.render?.height) && shot.render.height > 0
  && shot.matchedMediaProjection?.matchedFeatureIds?.length === 1
  && shot.matchedMediaProjection.matchedFeatureIds[0] === shot.featureId
)), 'every shot requires exact coordinates, declared render dimensions, and one matched feature ID');
const mapShots = sourcePlan.shots.filter(({ render }) => render.mode === 'map');
invariant(mapShots.length === 1
  && mapShots[0].id === 'CZ-G18-SHOT-03-R08-EMPTY-EIGHT-GALLERIA-OVERVIEW'
  && Number.isFinite(mapShots[0].render.center?.x)
  && Number.isFinite(mapShots[0].render.center?.z)
  && Number.isSafeInteger(mapShots[0].render.span) && mapShots[0].render.span > 0
  && Number.isSafeInteger(mapShots[0].render.scale) && mapShots[0].render.scale > 0
  && Number.isSafeInteger(mapShots[0].render.ymax)
  && mapShots[0].render.width === mapShots[0].render.span * mapShots[0].render.scale
  && mapShots[0].render.height === mapShots[0].render.span * mapShots[0].render.scale,
'shot 03 must be one dimensionally exact depth-clipped map render');

const terminal = fs.existsSync(absolute(TERMINAL)) ? readJson(TERMINAL) : null;
const terminalBinding = maybeBinding(TERMINAL);
const terminalCompleteSaveSha256 = terminal?.status === 'PASS_R13_G18_TERMINAL_POST_ACCEPTED'
  ? terminal.terminalCompleteSaveSha256 ?? null : null;
const terminalAccepted = /^[a-f0-9]{64}$/.test(terminalCompleteSaveSha256 ?? '');
const acceptedTerminalRegions = terminal?.terminalPostRoot
  ? path.join(terminal.terminalPostRoot, 'region') : null;
const terminalRegions = TERMINAL_REGIONS
  ?? acceptedTerminalRegions;

const output = {
  plan: path.join(OUT_ROOT, 'terminal-orchestrator-plan.json'),
  report: path.join(OUT_ROOT, 'terminal-orchestrator-report.json'),
  renderManifest: path.join(OUT_ROOT, 'terminal-camera-render-manifest.json'),
  captureReport: path.join(OUT_ROOT, 'terminal-camera-render-report.json'),
  boundShotPlan: path.join(OUT_ROOT, 'terminal-media-shot-plan.json'),
  media: path.join(OUT_ROOT, 'matched-media-evidence.json'),
  mapManifest: path.join(MAP_ROOT, 'map-artifact-manifest.json'),
  mapPng: path.join(MAP_ROOT, 'terminal-map.png'),
  mapIndex: path.join(MAP_ROOT, 'terminal-map-feature-index.json'),
  mapQa: path.join(OUT_ROOT, 'terminal-map-qa-evidence.json'),
  fixture: path.join(OUT_ROOT, 'database-import-fixture.json'),
  databaseQa: path.join(OUT_ROOT, 'database-import-verification.json'),
  databaseTransaction: path.join(OUT_ROOT, 'database-import-transaction.json'),
  publicationRoot: path.join(OUT_ROOT, 'frozen-acceptance-chain'),
};
const captureTargets = sourcePlan.shots.map((shot) => ({
  id: shot.id,
  featureId: shot.featureId,
  camera: shot.camera,
  target: shot.target,
  matchedFeatureIds: [shot.featureId],
  render: shot.render,
  filename: shot.expectedRaster.filename,
  output: path.join(CAPTURE_ROOT, shot.expectedRaster.filename),
  source: CAPTURE_MODE === 'ingest' && INGEST_ROOT
    ? path.join(INGEST_ROOT, shot.expectedRaster.filename) : null,
}));

const cameraManifest = {
  schemaVersion: 1,
  id: 'combined-zones-r13-g18-terminal-camera-render-manifest-v1',
  generatedAtUtc: GENERATED_AT,
  terminalCompleteSaveSha256,
  postreleaseSnapshot: null,
  capturePolicy: { width: 1920, height: 1080, fieldOfView: 70 },
  cameras: sourcePlan.shots.map((shot) => {
    const common = {
      id: shot.id,
      primaryFeatureId: shot.featureId,
      role: shot.coverageGroup,
      mode: shot.render.mode === 'map' ? 'map' : 'persp',
      width: shot.render.width,
      height: shot.render.height,
      output: shot.expectedRaster.filename,
    };
    return shot.render.mode === 'map' ? {
      ...common,
      center: [shot.render.center.x, shot.render.center.z],
      span: shot.render.span,
      scale: shot.render.scale,
      ymax: shot.render.ymax,
    } : {
      ...common,
      eye: [shot.camera.x, shot.camera.y, shot.camera.z],
      lookAt: [shot.target.x, shot.target.y, shot.target.z],
      fov: shot.render.fovDegrees,
      maxDistance: 320,
    };
  }),
};

const allMapPoints = sourcePlan.shots.flatMap(({ camera, target }) => [camera, target]);
const minMapX = Math.floor(Math.min(...allMapPoints.map(({ x }) => x)));
const maxMapX = Math.ceil(Math.max(...allMapPoints.map(({ x }) => x)));
const minMapZ = Math.floor(Math.min(...allMapPoints.map(({ z }) => z)));
const maxMapZ = Math.ceil(Math.max(...allMapPoints.map(({ z }) => z)));
const mapCenter = [Math.floor((minMapX + maxMapX) / 2), Math.floor((minMapZ + maxMapZ) / 2)];
const mapSpan = 2048;
const mapHalfSpan = mapSpan / 2;
const renderedMapBounds = {
  minX: mapCenter[0] - mapHalfSpan,
  maxX: mapCenter[0] + mapHalfSpan - 1,
  minZ: mapCenter[1] - mapHalfSpan,
  maxZ: mapCenter[1] + mapHalfSpan - 1,
};
invariant(minMapX >= renderedMapBounds.minX && maxMapX <= renderedMapBounds.maxX
  && minMapZ >= renderedMapBounds.minZ && maxMapZ <= renderedMapBounds.maxZ,
'fixed 2048-square terminal map extent does not contain every shot camera and target');
const renderArgs = terminalRegions ? [
  '--manifest', output.renderManifest,
  '--regions', terminalRegions,
  '--out-dir', CAPTURE_ROOT,
  '--report', output.captureReport,
  '--shadows',
] : null;
const mapRenderArgs = terminalRegions ? [
  '--regions', terminalRegions,
  '--mode', 'map',
  '--center', mapCenter.join(','),
  '--span', String(mapSpan),
  '--scale', '1',
  '--out', output.mapPng,
] : null;
const copyReadyCameraCommand = (shot) => {
  const command = [
    'scripts/world_render.mjs', '--regions', terminalRegions ?? '<TERMINAL_REGION_DIRECTORY>',
    '--mode', shot.render.mode === 'map' ? 'map' : 'persp',
  ];
  if (shot.render.mode === 'map') {
    command.push(
      '--center', `${shot.render.center.x},${shot.render.center.z}`,
      '--span', String(shot.render.span), '--scale', String(shot.render.scale),
      '--ymax', String(shot.render.ymax),
    );
  } else {
    command.push(
      '--eye', `${shot.camera.x},${shot.camera.y},${shot.camera.z}`,
      '--look', `${shot.target.x},${shot.target.y},${shot.target.z}`,
      '--dist', '320', '--w', String(shot.render.width), '--h', String(shot.render.height),
      '--fov', String(shot.render.fovDegrees), '--shadows', 'true',
    );
  }
  command.push('--out', path.join(CAPTURE_ROOT, shot.expectedRaster.filename));
  return commandText('node', command);
};
const waitReasons = [];
if (!terminalAccepted) waitReasons.push('Accepted terminal-post acceptance is not available.');
if (!terminalRegions || !fs.existsSync(absolute(terminalRegions))) {
  waitReasons.push('Immutable terminal region directory is not available.');
}
if (terminalAccepted && (!acceptedTerminalRegions
  || absolute(terminalRegions) !== absolute(acceptedTerminalRegions))) {
  waitReasons.push('Terminal region directory is not the terminal-acceptance post root /region.');
}
if (CAPTURE_MODE === 'ingest' && !INGEST_ROOT) waitReasons.push('Ingest mode requires --ingest-root.');
if (MAP_MODE === 'ingest' && !MAP_INGEST_ROOT) waitReasons.push('Map ingest mode requires --map-ingest-root.');
if (!EXPECTED_DATABASE_SHA256) waitReasons.push('Future database write requires --expected-database-sha256.');
if (![TERMINAL_LEDGER, TERMINAL_QA, R13_REPORT].every(Boolean)) {
  waitReasons.push('Frozen acceptance chain requires terminal ledger, terminal QA, and R13 report paths.');
}

const planWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-r13-g18-terminal-orchestrator-plan-v1',
  generatedAtUtc: GENERATED_AT,
  status: waitReasons.length === 0
    ? 'READY_R13_G18_TERMINAL_ORCHESTRATOR_DRY_RUN'
    : 'WAITING_R13_G18_TERMINAL_ORCHESTRATOR_INPUTS',
  mode: EXECUTE ? 'EXECUTE_REQUESTED' : 'DRY_RUN_DEFAULT',
  terminalCompleteSaveSha256,
  terminalAcceptance: terminalBinding,
  sourceShotPlan: { ...binding(SOURCE_SHOT_PLAN), shotPlanPayloadSha256: sourcePlan.shotPlanPayloadSha256 },
  terminalRegions: terminalRegions ? relative(terminalRegions) : null,
  exactContract: {
    shotCount: 11,
    featureCount: 11,
    databaseRecordCount: 11,
    shotIds,
    featureIds,
    filenames,
  },
  capture: {
    mode: CAPTURE_MODE,
    renderer: 'scripts/render_redevelopment_camera_manifest.mjs',
    underlyingRenderer: 'scripts/world_render.mjs',
    outputRoot: relative(CAPTURE_ROOT),
    targets: captureTargets.map((target) => ({ ...target,
      output: relative(target.output), source: target.source ? relative(target.source) : null })),
    rendererCommand: renderArgs
      ? commandText('node', ['scripts/render_redevelopment_camera_manifest.mjs', ...renderArgs])
      : null,
    copyReadyCameraCommands: sourcePlan.shots.map(copyReadyCameraCommand),
  },
  map: {
    mode: MAP_MODE,
    renderer: 'scripts/world_render.mjs',
    center: mapCenter,
    span: mapSpan,
    bounds: { minX: minMapX, maxX: maxMapX, minZ: minMapZ, maxZ: maxMapZ },
    renderedBounds: renderedMapBounds,
    scale: 1,
    width: 2048,
    height: 2048,
    rendererCommand: mapRenderArgs
      ? commandText('node', ['scripts/world_render.mjs', ...mapRenderArgs]) : null,
    outputs: [relative(output.mapPng), relative(output.mapIndex), relative(output.mapManifest)],
  },
  database: {
    path: relative(DATABASE),
    expectedPreImportSha256: EXPECTED_DATABASE_SHA256,
    transaction: 'BEGIN IMMEDIATE; exactly eleven INSERT rows; COMMIT',
    conflictPolicy: 'FAIL_IF_ANY_EXTERNAL_ID_ALREADY_EXISTS_GLOBALLY',
    backupBeforeWrite: true,
    compensateFromBackupIfAnyDownstreamAcceptanceStageFails: true,
    preAndPostFileSha256Required: true,
  },
  frozenAcceptanceChain: [
    'generate_combined_zones_r13_g18_terminal_media_shot_plan.mjs',
    'generate_combined_zones_r13_g18_matched_media_evidence.mjs',
    'generate_combined_zones_r13_g18_terminal_map_qa_evidence.mjs',
    'generate_combined_zones_r13_g18_database_import_verification.mjs',
    'generate_combined_zones_r13_g18_publication_acceptance.mjs',
  ],
  futureExecutionTemplate: commandText('node', [
    'scripts/run_combined_zones_r13_g18_terminal_orchestrator.mjs',
    '--terminal-post-acceptance', '<PASS_TERMINAL_POST_ACCEPTANCE_JSON>',
    '--capture-mode', 'render', '--capture-root', '<FRESH_CAPTURE_DIRECTORY>',
    '--map-mode', 'render', '--map-root', '<FRESH_MAP_DIRECTORY>',
    '--database', 'data/world-map.db',
    '--expected-database-sha256', '<FRESH_PREFLIGHT_DATABASE_SHA256>',
    '--terminal-ledger', '<FINAL_ACTIVE_TRANSACTION_LEDGER_JSON>',
    '--terminal-qa', '<FINAL_ACTIVE_TRANSACTION_POST_QA_JSON>',
    '--r13-report', '<FINAL_R13_READINESS_JSON>',
    '--out-root', '<FRESH_ORCHESTRATOR_EVIDENCE_DIRECTORY>',
    '--execute',
  ]),
  waitReasons,
  safetyBoundary: {
    dryRunByDefault: true,
    currentInvocationExecuted: false,
    liveMinecraftCalls: false,
    serviceMutation: false,
    worldMutation: false,
    databaseMutation: false,
    documentationMutation: false,
    canonicalBuildopsMutation: false,
    externalPublication: false,
  },
};
const plan = { ...planWithoutIdentity, orchestratorPlanPayloadSha256: stableHash(planWithoutIdentity) };
writeAtomic(output.plan, serialize(plan));

if (!EXECUTE) {
  process.stdout.write(`${JSON.stringify({
    status: plan.status,
    mode: plan.mode,
    out: relative(output.plan),
    orchestratorPlanPayloadSha256: plan.orchestratorPlanPayloadSha256,
    shotCount: 11,
    automatedOfflineRasterCaptureAvailable: true,
    mutationPerformed: false,
    waitReasons,
  }, null, 2)}\n`);
  process.exit(0);
}

invariant(waitReasons.length === 0, `execute prerequisites are incomplete: ${waitReasons.join(' ')}`);
invariant(EXPECTED_DATABASE_SHA256 === sha256File(DATABASE), 'database pre-import SHA-256 drifted');
invariant(fs.statSync(absolute(DATABASE)).isFile(), 'database target is not a regular file');
invariant(!fs.lstatSync(absolute(DATABASE)).isSymbolicLink(), 'database target must not be a symlink');
for (const required of [TERMINAL_LEDGER, TERMINAL_QA, R13_REPORT]) {
  invariant(fs.existsSync(absolute(required)), `acceptance-chain input is missing: ${required}`);
}

let backupPath = null;
let databasePostSha256 = null;
let databaseCompensated = false;
let committed = false;
let databaseCheckpoint = null;
const executionStages = [];
try {
  if (CAPTURE_MODE === 'render') {
    const regionFiles = fs.readdirSync(absolute(terminalRegions)).filter((name) => name.endsWith('.mca')).sort();
    invariant(regionFiles.length > 0, 'terminal region directory contains no Anvil files');
    const regionHash = crypto.createHash('sha256');
    let regionBytes = 0;
    for (const filename of regionFiles) {
      const bytes = fs.readFileSync(path.join(absolute(terminalRegions), filename));
      regionHash.update(filename); regionHash.update('\0'); regionHash.update(bytes); regionHash.update('\0');
      regionBytes += bytes.length;
    }
    cameraManifest.postreleaseSnapshot = {
      path: relative(terminalRegions), sha256: regionHash.digest('hex'),
      regionFileCount: regionFiles.length, bytes: regionBytes,
    };
    writeAtomic(output.renderManifest, serialize(cameraManifest));
    run('scripts/render_redevelopment_camera_manifest.mjs', renderArgs, 30 * 60_000);
  } else {
    invariant(fs.existsSync(absolute(INGEST_ROOT)), 'capture ingest root does not exist');
    invariant(!fs.existsSync(absolute(CAPTURE_ROOT)), 'capture output root must be fresh for exact ingest');
    for (const target of captureTargets) {
      invariant(fs.existsSync(absolute(target.source)), `${target.id}: ingest PNG is missing`);
      copyExact(target.source, target.output);
    }
  }
  executionStages.push('EXACT_ELEVEN_RASTERS_ACQUIRED');
  failIfInjected('after-capture');

  for (const target of captureTargets) {
    invariant(fs.existsSync(absolute(target.output)), `${target.id}: output PNG missing`);
    const bytes = fs.readFileSync(absolute(target.output));
    invariant(bytes.length >= 8_000, `${target.id}: output PNG is suspiciously small`);
    invariant(bytes.subarray(0, 8).equals(Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ])), `${target.id}: output is not PNG`);
    const image = await loadImage(absolute(target.output));
    invariant(image.width === target.render.width && image.height === target.render.height,
      `${target.id}: raster must be exactly ${target.render.width}x${target.render.height}`);
  }
  const actualPngNames = fs.readdirSync(absolute(CAPTURE_ROOT)).filter((name) => name.endsWith('.png')).sort();
  invariant(JSON.stringify(actualPngNames) === JSON.stringify([...filenames].sort()),
    'capture root does not contain exactly the eleven planned PNG filenames');
  executionStages.push('EXACT_RASTER_SIGNATURE_DIMENSION_AND_CENSUS_PASS');

  run('scripts/generate_combined_zones_r13_g18_terminal_media_shot_plan.mjs', [
    '--generated-at', GENERATED_AT, '--terminal-post-acceptance', TERMINAL,
    '--capture-root', CAPTURE_ROOT, '--out', output.boundShotPlan,
  ]);
  const boundPlan = readJson(output.boundShotPlan);
  invariant(boundPlan.terminalPostBinding?.terminalCompleteSaveSha256 === terminalCompleteSaveSha256
    && boundPlan.readiness?.presentCaptureCount === 11,
  'regenerated shot plan did not bind the terminal and all eleven rasters');
  invariant(JSON.stringify(boundPlan.shots.map(({ id }) => id)) === JSON.stringify(shotIds)
    && JSON.stringify(boundPlan.shots.map(({ camera }) => camera))
      === JSON.stringify(sourcePlan.shots.map(({ camera }) => camera))
    && JSON.stringify(boundPlan.shots.map(({ target }) => target))
      === JSON.stringify(sourcePlan.shots.map(({ target }) => target))
    && JSON.stringify(boundPlan.shots.map(({ render }) => render))
      === JSON.stringify(sourcePlan.shots.map(({ render }) => render)),
'bound shot-plan IDs, coordinates, or render contracts drifted');
  run('scripts/generate_combined_zones_r13_g18_matched_media_evidence.mjs', [
    '--generated-at', GENERATED_AT, '--shot-plan', output.boundShotPlan,
    '--terminal-post-acceptance', TERMINAL, '--out', output.media,
  ]);
  invariant(readJson(output.media).status === 'PASS_R13_G18_MATCHED_MEDIA_EVIDENCE',
    'matched-media evidence did not pass');
  executionStages.push('MATCHED_MEDIA_PASS');
  failIfInjected('after-media');

  fs.mkdirSync(absolute(MAP_ROOT), { recursive: true });
  if (MAP_MODE === 'render') {
    run('scripts/world_render.mjs', mapRenderArgs, 30 * 60_000);
  } else {
    const sourceMap = path.join(MAP_INGEST_ROOT, 'terminal-map.png');
    invariant(fs.existsSync(absolute(sourceMap)), 'map ingest PNG is missing');
    invariant(!fs.existsSync(absolute(output.mapPng)), 'map output PNG must be fresh for ingest');
    copyExact(sourceMap, output.mapPng);
  }
  const mapBytes = fs.readFileSync(absolute(output.mapPng));
  invariant(mapBytes.subarray(0, 8).equals(Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ])), 'terminal visual map is not PNG');
  const mapImage = await loadImage(absolute(output.mapPng));
  invariant(mapImage.width === 2048 && mapImage.height === 2048,
    'terminal visual map must be exactly 2048x2048');
  const boundPlanBinding = binding(output.boundShotPlan);
  const mediaBinding = binding(output.media);
  const mapIndex = {
    schemaVersion: 1,
    id: 'combined-zones-r13-g18-terminal-map-feature-index-v1',
    generatedAtUtc: GENERATED_AT,
    terminalCompleteSaveSha256,
    shotPlan: boundPlanBinding,
    coverageFeatureIds: featureIds,
    features: boundPlan.shots.map((shot) => ({
      featureId: shot.featureId, shotId: shot.id, coverageGroup: shot.coverageGroup,
      camera: shot.camera, target: shot.target, matchedFeatureIds: [shot.featureId],
    })),
  };
  writeAtomic(output.mapIndex, serialize({ ...mapIndex, mapIndexPayloadSha256: stableHash(mapIndex) }));
  const mapManifest = {
    schemaVersion: 1,
    terminalCompleteSaveSha256,
    shotPlan: boundPlanBinding,
    matchedMediaEvidence: mediaBinding,
    coverageFeatureIds: featureIds,
    artifacts: [
      { id: 'terminal-map-visual', format: 'PNG', ...binding(output.mapPng) },
      { id: 'terminal-map-feature-index', format: 'JSON', ...binding(output.mapIndex) },
    ],
  };
  writeAtomic(output.mapManifest, serialize(mapManifest));
  run('scripts/generate_combined_zones_r13_g18_terminal_map_qa_evidence.mjs', [
    '--generated-at', GENERATED_AT, '--shot-plan', output.boundShotPlan,
    '--terminal-post-acceptance', TERMINAL, '--matched-media-evidence', output.media,
    '--map-artifact-manifest', output.mapManifest, '--out', output.mapQa,
  ]);
  invariant(readJson(output.mapQa).status === 'PASS_R13_G18_TERMINAL_MAP_QA_EVIDENCE',
    'terminal-map QA evidence did not pass');
  executionStages.push('TERMINAL_MAP_QA_PASS');
  failIfInjected('after-map');

  run('scripts/generate_combined_zones_r13_g18_database_import_verification.mjs', [
    '--generated-at', GENERATED_AT, '--shot-plan', output.boundShotPlan,
    '--terminal-post-acceptance', TERMINAL, '--database', DATABASE,
    '--fixture-out', output.fixture, '--out', output.databaseQa,
  ]);
  const fixture = readJson(output.fixture);
  invariant(fixture.status === 'READY_R13_G18_TERMINAL_DATABASE_IMPORT_FIXTURE'
    && fixture.recordCount === 11 && fixture.records.length === 11,
  'database fixture is not terminal-bound and exactly eleven records');

  backupPath = path.join(OUT_ROOT, `world-map-pre-g18-${EXPECTED_DATABASE_SHA256.slice(0, 16)}.db`);
  invariant(!fs.existsSync(absolute(backupPath)), 'database backup path already exists');
  fs.mkdirSync(path.dirname(absolute(backupPath)), { recursive: true });
  const backupSource = new Database(absolute(DATABASE), { readonly: true, fileMustExist: true });
  invariant(backupSource.pragma('integrity_check', { simple: true }) === 'ok',
    'database integrity check failed before byte-exact backup');
  backupSource.close();
  fs.copyFileSync(absolute(DATABASE), absolute(backupPath), fs.constants.COPYFILE_EXCL);
  invariant(sha256File(backupPath) === EXPECTED_DATABASE_SHA256,
    'database changed while creating the byte-exact recovery backup');
  const writable = new Database(absolute(DATABASE), { fileMustExist: true });
  try {
    invariant(writable.pragma('integrity_check', { simple: true }) === 'ok',
      'database integrity check failed before import');
    const columns = new Set(writable.prepare('PRAGMA table_info(world_features)').all()
      .map(({ name }) => name));
    for (const required of ['id', 'project_id', 'external_id', 'world', 'name', 'kind',
      'status', 'geometry_json', 'min_x', 'max_x', 'min_z', 'max_z', 'source',
      'source_ref', 'confidence', 'completion_ratio', 'tags_json', 'attributes_json',
      'observed_at', 'revision', 'created_at', 'updated_at']) {
      invariant(columns.has(required), `world_features.${required} is missing`);
    }
    writable.exec('BEGIN IMMEDIATE');
    const lookup = writable.prepare(
      'SELECT id, project_id FROM world_features WHERE external_id = ?',
    );
    const insert = writable.prepare(`INSERT INTO world_features (
      id, project_id, external_id, parent_id, world, name, kind, status,
      geometry_json, min_x, max_x, min_z, max_z, source, source_ref,
      confidence, completion_ratio, condition_score, tags_json, attributes_json,
      observed_at, revision, created_at, updated_at
    ) VALUES (
      @id, @projectId, @externalId, NULL, @world, @name, @kind, @status,
      @geometryJson, @x, @x, @z, @z, @source, @sourceRef,
      1, 1, NULL, @tagsJson, @attributesJson,
      @timestamp, 1, @timestamp, @timestamp
    )`);
    const timestamp = Date.parse(GENERATED_AT);
    invariant(Number.isSafeInteger(timestamp), '--generated-at must parse to a stable timestamp');
    for (const record of fixture.records) {
      invariant(!lookup.get(record.externalId),
        `database external ID already exists: ${record.externalId}`);
      insert.run({
        id: `wft_${sha256(Buffer.from(`${record.projectId}\0${record.externalId}`)).slice(0, 24)}`,
        projectId: record.projectId, externalId: record.externalId,
        world: record.world, name: record.name, kind: record.kind, status: record.status,
        geometryJson: JSON.stringify(record.geometry), x: record.geometry.x, z: record.geometry.z,
        source: record.source, sourceRef: record.sourceRef,
        tagsJson: JSON.stringify(record.tags), attributesJson: JSON.stringify(record.attributes),
        timestamp,
      });
    }
    failIfInjected('inside-database-transaction');
    writable.exec('COMMIT');
    committed = true;
    const journalMode = writable.pragma('journal_mode', { simple: true });
    const [checkpoint] = writable.pragma('wal_checkpoint(TRUNCATE)');
    invariant(checkpoint && Number.isSafeInteger(checkpoint.busy)
      && Number.isSafeInteger(checkpoint.log) && Number.isSafeInteger(checkpoint.checkpointed),
    'SQLite WAL checkpoint did not return exact page accounting');
    invariant(checkpoint.busy === 0 && checkpoint.log === checkpoint.checkpointed,
      `SQLite WAL checkpoint was incomplete: busy=${checkpoint.busy}, `
      + `log=${checkpoint.log}, checkpointed=${checkpoint.checkpointed}`);
    databaseCheckpoint = {
      journalMode,
      operation: 'wal_checkpoint(TRUNCATE)',
      busy: checkpoint.busy,
      log: checkpoint.log,
      checkpointed: checkpoint.checkpointed,
      fullCheckpoint: true,
      requiredForWalMode: journalMode === 'wal',
    };
  } catch (error) {
    if (writable.inTransaction) writable.exec('ROLLBACK');
    throw error;
  } finally {
    writable.close();
  }
  databaseCheckpoint.sidecarsAfterWriterClose = Object.fromEntries(
    ['-wal', '-shm', '-journal'].map((suffix) => {
      const filename = `${absolute(DATABASE)}${suffix}`;
      return [suffix, {
        exists: fs.existsSync(filename),
        bytes: fs.existsSync(filename) ? fs.statSync(filename).size : 0,
      }];
    }),
  );
  databaseCheckpoint.successPathSidecarsRemoved = false;
  databasePostSha256 = sha256File(DATABASE);
  invariant(databasePostSha256 !== EXPECTED_DATABASE_SHA256,
    'database hash did not change after exact eleven-record import');
  const transaction = {
    schemaVersion: 1,
    id: 'combined-zones-r13-g18-terminal-database-import-transaction-v1',
    generatedAtUtc: GENERATED_AT,
    status: 'COMMITTED_PENDING_FROZEN_ACCEPTANCE_CHAIN',
    terminalCompleteSaveSha256,
    fixture: binding(output.fixture),
    database: { path: relative(DATABASE), preSha256: EXPECTED_DATABASE_SHA256,
      postSha256: databasePostSha256 },
    checkpoint: databaseCheckpoint,
    backup: binding(backupPath),
    exactImportedRecordCount: 11,
    recoveryContract: {
      trigger: 'ANY_DOWNSTREAM_ACCEPTANCE_FAILURE',
      action: 'close SQLite handles, remove sidecars, restore exact backup over database',
      expectedRecoveredSha256: EXPECTED_DATABASE_SHA256,
    },
  };
  writeAtomic(output.databaseTransaction, serialize(transaction));
  executionStages.push('DATABASE_EXACT_ELEVEN_COMMITTED_WITH_BACKUP');
  failIfInjected('after-database-import');

  run('scripts/generate_combined_zones_r13_g18_database_import_verification.mjs', [
    '--generated-at', GENERATED_AT, '--shot-plan', output.boundShotPlan,
    '--terminal-post-acceptance', TERMINAL, '--database', DATABASE,
    '--fixture-out', output.fixture, '--out', output.databaseQa,
  ]);
  invariant(readJson(output.databaseQa).status === 'PASS_R13_G18_DATABASE_IMPORT_VERIFICATION',
    'database import verification did not pass');
  executionStages.push('DATABASE_READ_ONLY_VERIFICATION_PASS');
  failIfInjected('after-database-verification');

  run('scripts/generate_combined_zones_r13_g18_publication_acceptance.mjs', [
    '--generated-at', GENERATED_AT, '--out-root', output.publicationRoot,
    '--binding-root', output.publicationRoot, '--r13-report', R13_REPORT,
    '--terminal-ledger', TERMINAL_LEDGER, '--terminal-qa', TERMINAL_QA,
    '--media-evidence', output.media, '--map-evidence', output.mapQa,
    '--database-import-evidence', output.databaseQa,
  ]);
  const publication = readJson(path.join(output.publicationRoot, 'publication-manifest.json'));
  invariant(publication.status === 'PASS_R13_G18_MEDIA_AND_PUBLICATION_ACCEPTED',
    'frozen G18 publication acceptance chain did not pass');
  executionStages.push('FROZEN_ACCEPTANCE_CHAIN_PASS');
  failIfInjected('after-acceptance');

  const reportWithoutIdentity = {
    schemaVersion: 1,
    id: 'combined-zones-r13-g18-terminal-orchestrator-execution-v1',
    generatedAtUtc: GENERATED_AT,
    status: 'PASS_R13_G18_TERMINAL_ORCHESTRATION',
    terminalCompleteSaveSha256,
    plan: binding(output.plan),
    exactShotCount: 11,
    exactDatabaseRecordCount: 11,
    executionStages,
    captures: captureTargets.map(({ id, featureId, output: filename }) => ({
      id, featureId, ...binding(filename), matchedFeatureIds: [featureId],
    })),
    mapArtifacts: binding(output.mapManifest),
    databaseTransaction: binding(output.databaseTransaction),
    databaseVerification: binding(output.databaseQa),
    publicationAcceptance: binding(path.join(output.publicationRoot, 'publication-manifest.json')),
    mutationBoundary: {
      liveMinecraftCalls: false, worldMutation: false, serviceMutation: false,
      externalPublication: false, databaseWritten: true, mediaWritten: true,
    },
  };
  const report = { ...reportWithoutIdentity,
    orchestratorExecutionPayloadSha256: stableHash(reportWithoutIdentity) };
  writeAtomic(output.report, serialize(report));
  process.stdout.write(`${JSON.stringify({ status: report.status, out: relative(output.report),
    orchestratorExecutionPayloadSha256: report.orchestratorExecutionPayloadSha256,
    exactShotCount: 11, exactDatabaseRecordCount: 11,
    databasePreSha256: EXPECTED_DATABASE_SHA256, databasePostSha256,
  }, null, 2)}\n`);
} catch (error) {
  const databaseNeedsCompensation = backupPath && fs.existsSync(absolute(backupPath))
    && fs.existsSync(absolute(DATABASE))
    && (committed || sha256File(DATABASE) !== EXPECTED_DATABASE_SHA256);
  if (databaseNeedsCompensation) {
    removeSqliteSidecars(DATABASE);
    fs.copyFileSync(absolute(backupPath), absolute(DATABASE));
    removeSqliteSidecars(DATABASE);
    invariant(sha256File(DATABASE) === EXPECTED_DATABASE_SHA256,
      'database compensation did not restore the exact pre-import SHA-256');
    databaseCompensated = true;
  }
  const failure = {
    schemaVersion: 1,
    id: 'combined-zones-r13-g18-terminal-orchestrator-execution-v1',
    generatedAtUtc: GENERATED_AT,
    status: databaseCompensated
      ? 'FAILED_R13_G18_ORCHESTRATION_DATABASE_COMPENSATED'
      : 'FAILED_R13_G18_ORCHESTRATION_NO_COMMITTED_DATABASE_MUTATION',
    error: error.message,
    terminalCompleteSaveSha256,
    executionStages,
    database: {
      path: relative(DATABASE), expectedPreSha256: EXPECTED_DATABASE_SHA256,
      observedSha256: fs.existsSync(absolute(DATABASE)) ? sha256File(DATABASE) : null,
      committed, compensated: databaseCompensated,
      checkpoint: databaseCheckpoint,
      backup: backupPath && fs.existsSync(absolute(backupPath)) ? binding(backupPath) : null,
    },
    liveMinecraftCalls: false,
    worldMutation: false,
    serviceMutation: false,
    externalPublication: false,
  };
  writeAtomic(output.report, serialize(failure));
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
}
