import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { createCanvas } from 'canvas';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT, 'scripts/run_combined_zones_r13_g18_terminal_orchestrator.mjs',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r13-g18-terminal-orchestrator-'),
);
const SHOT_PLAN = path.join(temporaryDirectory, 'terminal-media-shot-plan.json');
execFileSync(process.execPath, [
  path.join(ROOT, 'scripts/generate_combined_zones_r13_g18_terminal_media_shot_plan.mjs'),
  '--generated-at', '2026-08-22T05:45:00Z',
  '--terminal-post-acceptance', path.join(temporaryDirectory, 'absent-terminal.json'),
  '--capture-root', path.join(temporaryDirectory, 'absent-captures'),
  '--out', SHOT_PLAN,
], { cwd: ROOT, stdio: 'pipe' });
const sha256 = (filename: string) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');
const writeJson = (filename: string, value: unknown) => {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
};
const declaration = (filename: string) => ({
  path: filename,
  sha256: sha256(filename),
  bytes: fs.statSync(filename).size,
});

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

function writePatternPng(filename: string, width: number, height: number, seed: number) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `hsl(${seed * 29 % 360} 75% 28%)`);
  gradient.addColorStop(0.5, `hsl(${(seed * 29 + 80) % 360} 70% 55%)`);
  gradient.addColorStop(1, `hsl(${(seed * 29 + 170) % 360} 80% 18%)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.fillStyle = 'rgba(255,255,255,0.8)';
  context.font = '72px sans-serif';
  for (let row = 0; row < 12; row += 1) {
    context.fillText(`G18-${seed}-${row}`, 80 + row * 31, 110 + row * 78);
  }
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, canvas.toBuffer('image/png'));
  expect(fs.statSync(filename).size).toBeGreaterThan(8_000);
}

function createDatabase(filename: string, journalMode: 'delete' | 'wal' = 'delete') {
  const database = new Database(filename);
  database.exec(`CREATE TABLE world_features (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    external_id TEXT,
    parent_id TEXT,
    world TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    geometry_json TEXT NOT NULL,
    min_x REAL NOT NULL,
    max_x REAL NOT NULL,
    min_z REAL NOT NULL,
    max_z REAL NOT NULL,
    source TEXT NOT NULL,
    source_ref TEXT,
    confidence REAL,
    completion_ratio REAL,
    condition_score REAL,
    tags_json TEXT NOT NULL DEFAULT '[]',
    attributes_json TEXT NOT NULL DEFAULT '{}',
    observed_at INTEGER,
    revision INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);
  database.pragma(`journal_mode=${journalMode}`);
  database.close();
}

function acceptedInputs(root: string, journalMode: 'delete' | 'wal' = 'delete') {
  fs.mkdirSync(root, { recursive: true });
  const terminalHash = 'a'.repeat(64);
  const terminalPost = path.join(root, 'terminal-post');
  const regions = path.join(terminalPost, 'region');
  fs.mkdirSync(regions, { recursive: true });
  const terminal = path.join(root, 'terminal-post-acceptance.json');
  writeJson(terminal, {
    status: 'PASS_R13_G18_TERMINAL_POST_ACCEPTED',
    terminalCompleteSaveSha256: terminalHash,
    terminalPostRoot: terminalPost,
  });
  const identity = path.join(root, 'post-identity.json');
  const intake = path.join(root, 'post-intake.json');
  const rollback = path.join(root, 'rollback.json');
  writeJson(identity, { status: 'PASS', sha256: 'b'.repeat(64) });
  writeJson(intake, { status: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE' });
  writeJson(rollback, { status: 'PASS_COMPLETE_POSTSTATE_PREFLIGHT', passed: 11, failed: 0 });
  const ledger = path.join(root, 'terminal-ledger.json');
  writeJson(ledger, {
    status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
    releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
    completedReleaseIdentitySha256: 'c'.repeat(64),
    postSnapshot: {
      root: terminalPost,
      completeSaveSha256: terminalHash,
      identity: declaration(identity),
      completeSaveIntake: declaration(intake),
    },
    rollbackPoststatePreflights: [declaration(rollback)],
  });
  const qa = path.join(root, 'terminal-qa.json');
  writeJson(qa, {
    status: 'PASS_SYNTHETIC_TERMINAL_POST_QA',
    summary: { passed: true },
    ledger: declaration(ledger),
    postSnapshot: { completeSaveSha256: terminalHash },
  });
  const r13 = path.join(root, 'r13-ready.json');
  writeJson(r13, {
    status: 'WAITING_R13_CONSOLIDATED_MVP_ACCEPTANCE',
    readinessPayloadSha256: 'd'.repeat(64),
    release: { releaseNodeId: 'CZ-R13-FINAL-CONSOLIDATED-ACCEPTANCE' },
    requiredDependencies: Array.from({ length: 6 }, (_, index) => ({
      releaseNodeId: `SYNTHETIC-${index}`,
      status: 'PASS',
    })),
    gates: [
      { id: 'G16_IMMUTABLE_POST_AND_ROLLBACK_PREFLIGHT', status: 'PASS' },
      { id: 'G17_FUNCTIONAL_POST_QA', status: 'PASS' },
      { id: 'G18_MEDIA_AND_PUBLICATION', status: 'WAITING' },
      { id: 'G19_FINAL_ACCEPTANCE', status: 'WAITING' },
    ],
  });
  const ingest = path.join(root, 'ingest');
  const plan = JSON.parse(fs.readFileSync(SHOT_PLAN, 'utf8'));
  plan.shots.forEach((shot: {
    expectedRaster: { filename: string };
    render: { width: number; height: number };
  }, index: number) => {
    writePatternPng(path.join(ingest, shot.expectedRaster.filename),
      shot.render.width, shot.render.height, index + 1);
  });
  const mapIngest = path.join(root, 'map-ingest');
  writePatternPng(path.join(mapIngest, 'terminal-map.png'), 2048, 2048, 99);
  const database = path.join(root, 'world-map.db');
  createDatabase(database, journalMode);
  return { terminalHash, terminalPost, regions, terminal, ledger, qa, r13,
    ingest, mapIngest, database };
}

function orchestratorArgs(
  fixture: ReturnType<typeof acceptedInputs>,
  root: string,
  extra: string[] = [],
) {
  return [
    SCRIPT,
    '--generated-at', '2026-08-22T05:45:00Z',
    '--source-shot-plan', SHOT_PLAN,
    '--terminal-post-acceptance', fixture.terminal,
    '--terminal-regions', fixture.regions,
    '--capture-mode', 'ingest',
    '--ingest-root', fixture.ingest,
    '--capture-root', path.join(root, 'captures'),
    '--map-mode', 'ingest',
    '--map-ingest-root', fixture.mapIngest,
    '--map-root', path.join(root, 'map'),
    '--database', fixture.database,
    '--expected-database-sha256', sha256(fixture.database),
    '--terminal-ledger', fixture.ledger,
    '--terminal-qa', fixture.qa,
    '--r13-report', fixture.r13,
    '--out-root', path.join(root, 'orchestrator'),
    ...extra,
  ];
}

describe('Combined Zones R13 G18 guarded terminal orchestrator', () => {
  it('defaults to deterministic dry-run and emits exactly eleven copy-ready cameras', () => {
    const first = path.join(temporaryDirectory, 'dry-run-first');
    const run = (outRoot: string) => {
      execFileSync(process.execPath, [
        SCRIPT, '--generated-at', '2026-08-22T05:45:00Z',
        '--source-shot-plan', SHOT_PLAN, '--out-root', outRoot,
      ], { cwd: ROOT, stdio: 'pipe' });
      return JSON.parse(fs.readFileSync(path.join(outRoot, 'terminal-orchestrator-plan.json'), 'utf8'));
    };
    const a = run(first);
    const b = run(first);
    expect(a.status).toBe('WAITING_R13_G18_TERMINAL_ORCHESTRATOR_INPUTS');
    expect(a.mode).toBe('DRY_RUN_DEFAULT');
    expect(a.exactContract).toMatchObject({ shotCount: 11, featureCount: 11, databaseRecordCount: 11 });
    expect(a.capture.copyReadyCameraCommands).toHaveLength(11);
    expect(a.capture.copyReadyCameraCommands.filter((command: string) => (
      command.includes('scripts/world_render.mjs')
      && command.includes('--mode') && command.includes('persp')
      && command.includes('--eye') && command.includes('--look')
    ))).toHaveLength(10);
    expect(a.capture.copyReadyCameraCommands.filter((command: string) => (
      command.includes("'--mode' 'map'")
      && command.includes("'--center' '1749,100'")
      && command.includes("'--span' '256'")
      && command.includes("'--scale' '8'")
      && command.includes("'--ymax' '52'")
      && !command.includes("'--eye'") && !command.includes("'--look'")
    ))).toHaveLength(1);
    expect(a.map).toMatchObject({ span: 2048, scale: 1, width: 2048, height: 2048 });
    expect(a.safetyBoundary).toMatchObject({ currentInvocationExecuted: false,
      databaseMutation: false, worldMutation: false, externalPublication: false });
    expect(a.orchestratorPlanPayloadSha256).toBe(b.orchestratorPlanPayloadSha256);
  });

  it('rejects test failure injection without the explicit test-only gate', () => {
    const result = spawnSync(process.execPath, [
      SCRIPT, '--inject-failure-stage', 'after-media',
      '--out-root', path.join(temporaryDirectory, 'rejected-injection'),
    ], { cwd: ROOT, encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('--allow-test-injection');
  });

  it('runs exact ingest/map/import/acceptance against isolated fixtures', () => {
    const root = path.join(temporaryDirectory, 'complete');
    const fixture = acceptedInputs(path.join(root, 'inputs'), 'wal');
    const before = sha256(fixture.database);
    const database = new Database(fixture.database, { readonly: true });
    expect(database.pragma('journal_mode', { simple: true })).toBe('wal');
    expect(database.prepare('SELECT COUNT(*) AS count FROM world_features').get())
      .toEqual({ count: 0 });
    execFileSync(process.execPath, orchestratorArgs(fixture, root, ['--execute']), {
      cwd: ROOT, stdio: 'pipe', timeout: 120_000,
    });
    const outRoot = path.join(root, 'orchestrator');
    const report = JSON.parse(fs.readFileSync(
      path.join(outRoot, 'terminal-orchestrator-report.json'), 'utf8',
    ));
    expect(report).toMatchObject({
      status: 'PASS_R13_G18_TERMINAL_ORCHESTRATION',
      terminalCompleteSaveSha256: fixture.terminalHash,
      exactShotCount: 11,
      exactDatabaseRecordCount: 11,
      mutationBoundary: { liveMinecraftCalls: false, worldMutation: false,
        serviceMutation: false, externalPublication: false },
    });
    expect(report.captures).toHaveLength(11);
    expect(new Set(report.captures.flatMap(
      ({ matchedFeatureIds }: { matchedFeatureIds: string[] }) => matchedFeatureIds,
    )).size).toBe(11);
    expect(sha256(fixture.database)).not.toBe(before);
    expect(database.prepare(
      "SELECT COUNT(*) AS count FROM world_features WHERE project_id = 'combined-zones-phase1'",
    ).get()).toEqual({ count: 11 });
    database.close();
    expect(JSON.parse(fs.readFileSync(
      path.join(outRoot, 'database-import-transaction.json'), 'utf8',
    )).checkpoint).toMatchObject({
      journalMode: 'wal',
      operation: 'wal_checkpoint(TRUNCATE)',
      busy: 0,
      log: 0,
      checkpointed: 0,
      fullCheckpoint: true,
      requiredForWalMode: true,
      successPathSidecarsRemoved: false,
      sidecarsAfterWriterClose: {
        '-wal': { exists: true, bytes: 0 },
        '-shm': { exists: true },
      },
    });
    expect(JSON.parse(fs.readFileSync(
      path.join(outRoot, 'database-import-verification.json'), 'utf8',
    )).status).toBe('PASS_R13_G18_DATABASE_IMPORT_VERIFICATION');
    expect(JSON.parse(fs.readFileSync(
      path.join(outRoot, 'frozen-acceptance-chain/publication-manifest.json'), 'utf8',
    )).status).toBe('PASS_R13_G18_MEDIA_AND_PUBLICATION_ACCEPTED');
  });

  it('restores the byte-exact database backup after an injected downstream failure', () => {
    const root = path.join(temporaryDirectory, 'compensation');
    const fixture = acceptedInputs(path.join(root, 'inputs'));
    const before = sha256(fixture.database);
    const result = spawnSync(process.execPath, orchestratorArgs(fixture, root, [
      '--execute', '--allow-test-injection', '--inject-failure-stage', 'after-database-import',
    ]), { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
    expect(result.status).not.toBe(0);
    expect(sha256(fixture.database)).toBe(before);
    const report = JSON.parse(fs.readFileSync(
      path.join(root, 'orchestrator/terminal-orchestrator-report.json'), 'utf8',
    ));
    expect(report).toMatchObject({
      status: 'FAILED_R13_G18_ORCHESTRATION_DATABASE_COMPENSATED',
      database: { committed: true, compensated: true, observedSha256: before },
    });
    expect(report.database.backup.sha256).toBe(before);
    const database = new Database(fixture.database, { readonly: true });
    expect(database.prepare('SELECT COUNT(*) AS count FROM world_features').get())
      .toEqual({ count: 0 });
    database.close();
  });

  it('rolls an injected in-transaction failure back without a committed database write', () => {
    const root = path.join(temporaryDirectory, 'transaction-rollback');
    const fixture = acceptedInputs(path.join(root, 'inputs'));
    const before = sha256(fixture.database);
    const result = spawnSync(process.execPath, orchestratorArgs(fixture, root, [
      '--execute', '--allow-test-injection',
      '--inject-failure-stage', 'inside-database-transaction',
    ]), { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
    expect(result.status).not.toBe(0);
    expect(sha256(fixture.database)).toBe(before);
    const report = JSON.parse(fs.readFileSync(
      path.join(root, 'orchestrator/terminal-orchestrator-report.json'), 'utf8',
    ));
    expect(report).toMatchObject({
      status: 'FAILED_R13_G18_ORCHESTRATION_NO_COMMITTED_DATABASE_MUTATION',
      database: { committed: false, compensated: false, observedSha256: before },
    });
  });
});
