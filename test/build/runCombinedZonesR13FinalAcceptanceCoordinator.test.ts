import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { createCanvas } from 'canvas';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/run_combined_zones_r13_final_acceptance_coordinator.mjs');
const R12Q_LEDGER = path.join(
  ROOT, 'data/world-review/combined-zones-r12q-live-20260822T044855Z/evidence-ledger.json',
);
const R12Q_QA = path.join(
  ROOT, 'data/world-review/combined-zones-r12q-live-20260822T044855Z/r12q-post-release-qa.json',
);
const RELEASE_CONTRACT = path.join(
  ROOT, 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
);
const R10_CLOSURE = path.join(
  ROOT, 'data/world-review/combined-zones-r10-mvp-closure/r10-mvp-closure.json',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r13-final-coordinator-'),
);
const SHOT_PLAN = path.join(temporaryDirectory, 'terminal-media-shot-plan.json');
execFileSync(process.execPath, [
  path.join(ROOT, 'scripts/generate_combined_zones_r13_g18_terminal_media_shot_plan.mjs'),
  '--generated-at', '2026-08-22T06:00:00Z',
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
  path: filename, sha256: sha256(filename), bytes: fs.statSync(filename).size,
});

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

function patternPng(filename: string, width: number, height: number, seed: number) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `hsl(${seed * 31 % 360} 78% 24%)`);
  gradient.addColorStop(0.45, `hsl(${(seed * 31 + 93) % 360} 72% 58%)`);
  gradient.addColorStop(1, `hsl(${(seed * 31 + 191) % 360} 82% 20%)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.fillStyle = 'rgba(255,255,255,0.85)';
  context.font = '68px sans-serif';
  for (let row = 0; row < 12; row += 1) {
    context.fillText(`R13-${seed}-${row}`, 70 + row * 29, 105 + row * 77);
  }
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, canvas.toBuffer('image/png'));
  expect(fs.statSync(filename).size).toBeGreaterThan(8_000);
}

function databaseFixture(filename: string) {
  const database = new Database(filename);
  database.exec(`CREATE TABLE world_features (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, external_id TEXT,
    parent_id TEXT, world TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL,
    status TEXT NOT NULL, geometry_json TEXT NOT NULL,
    min_x REAL NOT NULL, max_x REAL NOT NULL, min_z REAL NOT NULL, max_z REAL NOT NULL,
    source TEXT NOT NULL, source_ref TEXT, confidence REAL, completion_ratio REAL,
    condition_score REAL, tags_json TEXT NOT NULL DEFAULT '[]',
    attributes_json TEXT NOT NULL DEFAULT '{}', observed_at INTEGER,
    revision INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);
  database.close();
}

function activeTerminalFixture(root: string) {
  fs.mkdirSync(root, { recursive: true });
  const scanRoot = path.join(root, 'ledger-scan');
  const sourceIdentity = path.join(root, 'source-identity.json');
  const sourceRegions = path.join(root, 'fresh-source-region');
  const postRoot = path.join(root, 'post-snapshot');
  const postRegions = path.join(postRoot, 'region');
  const postIdentity = path.join(root, 'post-identity.json');
  const postIntake = path.join(root, 'post-intake.json');
  const forward = path.join(root, 'active-shuttle.forward.txt');
  const manifest = path.join(root, 'active-shuttle.release-manifest.json');
  const forwardPreflight = path.join(root, 'active-shuttle.forward-source-preflight.json');
  const rollback = path.join(root, 'rollback-preflight.json');
  const ledger = path.join(root, 'active-shuttle-ledger.json');
  const qa = path.join(root, 'active-shuttle-post-qa.json');
  const commissioning = path.join(root, 'r12-active-shuttle-commissioning.json');
  const r10Closure = path.join(root, 'current-contract-r10-closure.json');
  const predecessor = JSON.parse(fs.readFileSync(R12Q_LEDGER, 'utf8'));
  const predecessorRegion = JSON.parse(fs.readFileSync(
    path.resolve(ROOT, predecessor.postSnapshot.identity.path), 'utf8',
  )).sha256;
  const terminalHash = 'a'.repeat(64);
  const terminalRegionHash = 'b'.repeat(64);
  const completedIdentity = 'c'.repeat(64);
  fs.mkdirSync(scanRoot, { recursive: true });
  fs.mkdirSync(sourceRegions, { recursive: true });
  fs.mkdirSync(postRegions, { recursive: true });
  writeJson(sourceIdentity, { sha256: 'f'.repeat(64) });
  writeJson(postIdentity, { sha256: terminalRegionHash });
  writeJson(postIntake, {
    status: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
    packageIdentity: { completeSaveSha256: terminalHash },
  });
  fs.writeFileSync(forward, 'fill 1 2 3 1 2 3 minecraft:rail replace minecraft:air strict\n');
  writeJson(manifest, {
    transactionId: 'combined-zones-r12r-active-shuttle-commissioning',
    source: {
      completeSaveSha256: predecessor.postSnapshot.completeSaveSha256,
      regionSnapshotSha256: predecessorRegion,
      predecessor: {
        transactionId: predecessor.transactionId,
        executionLedger: { path: R12Q_LEDGER, sha256: sha256(R12Q_LEDGER) },
        postQa: { path: R12Q_QA, sha256: sha256(R12Q_QA) },
        completedReleaseIdentitySha256: predecessor.completedReleaseIdentitySha256,
      },
    },
  });
  writeJson(forwardPreflight, {
    status: 'PASS', failurePointsComplete: true, operationCount: 1,
    passed: 1, failed: 0, opsPath: forward, opsSha256: sha256(forward),
    regions: sourceRegions,
  });
  writeJson(rollback, { status: 'PASS', passed: 1, failed: 0 });
  writeJson(ledger, {
    status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
    releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
    transactionId: 'combined-zones-r12r-active-shuttle-commissioning',
    completedAtUtc: '2026-08-22T06:01:00.000Z',
    manifest: { path: manifest, sha256: sha256(manifest) },
    sourceSnapshot: {
      completeSaveSha256: 'e'.repeat(64), regions: sourceRegions,
      identity: declaration(sourceIdentity),
    },
    postSnapshot: {
      root: postRoot, completeSaveSha256: terminalHash,
      identity: declaration(postIdentity),
      completeSaveIntake: declaration(postIntake),
    },
    completedReleaseIdentitySha256: completedIdentity,
    packages: [{ key: 'active-shuttle', forward: { path: forward, sha256: sha256(forward) },
      rollback: { path: forward, sha256: sha256(forward) } }],
    rollbackPoststatePreflights: [declaration(rollback)],
    evidenceBindings: [{ path: forwardPreflight, sha256: sha256(forwardPreflight) }],
    stages: [{ stage: 'forward-source-preflight:active-shuttle', status: 'PASS',
      command: ['node', 'preflight', '--report', forwardPreflight] }],
  });
  writeJson(qa, {
    status: 'PASS_SYNTHETIC_ACTIVE_SHUTTLE_POST_QA',
    ledger: declaration(ledger),
    postSnapshot: { completeSaveSha256: terminalHash, regionSha256: terminalRegionHash },
    releaseIdentity: { completedReleaseIdentitySha256: completedIdentity },
    qaPayloadSha256: 'd'.repeat(64), summary: { passed: true },
  });
  writeJson(commissioning, {
    status: 'PASS_R12_ACTIVE_SHUTTLE_COMMISSIONED',
    releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
    activeShuttleCommissioned: true,
    terminalPost: { completeSaveSha256: terminalHash },
  });
  const currentContractClosure = JSON.parse(fs.readFileSync(R10_CLOSURE, 'utf8'));
  currentContractClosure.bindings.releaseContract = declaration(RELEASE_CONTRACT);
  writeJson(r10Closure, currentContractClosure);
  const ingest = path.join(root, 'ingest');
  const sourcePlan = JSON.parse(fs.readFileSync(SHOT_PLAN, 'utf8'));
  sourcePlan.shots.forEach((shot: {
    expectedRaster: { filename: string };
    render: { width: number; height: number };
  }, index: number) => {
    patternPng(path.join(ingest, shot.expectedRaster.filename),
      shot.render.width, shot.render.height, index + 1);
  });
  const mapIngest = path.join(root, 'map-ingest');
  patternPng(path.join(mapIngest, 'terminal-map.png'), 2048, 2048, 77);
  const database = path.join(root, 'world-map.db');
  databaseFixture(database);
  return { scanRoot, ledger, qa, commissioning, r10Closure, ingest, mapIngest,
    database, terminalHash };
}

function argumentsFor(fixture: ReturnType<typeof activeTerminalFixture>, root: string) {
  return [
    SCRIPT, '--generated-at', '2026-08-22T06:00:00Z',
    '--source-shot-plan', SHOT_PLAN,
    '--plan-out', path.join(root, 'coordinator-plan.json'),
    '--run-root', path.join(root, 'run'),
    '--final-ledger', fixture.ledger,
    '--expected-final-ledger-sha256', sha256(fixture.ledger),
    '--final-post-qa', fixture.qa,
    '--expected-final-post-qa-sha256', sha256(fixture.qa),
    '--r12-commissioning', fixture.commissioning,
    '--expected-r12-commissioning-sha256', sha256(fixture.commissioning),
    '--r12q-predecessor-ledger', R12Q_LEDGER,
    '--expected-r12q-ledger-sha256', sha256(R12Q_LEDGER),
    '--r12q-predecessor-post-qa', R12Q_QA,
    '--expected-r12q-post-qa-sha256', sha256(R12Q_QA),
    '--r10-closure', fixture.r10Closure,
    '--expected-r10-closure-sha256', sha256(fixture.r10Closure),
    '--world-review-root', fixture.scanRoot,
    '--capture-mode', 'ingest', '--ingest-root', fixture.ingest,
    '--map-mode', 'ingest', '--map-ingest-root', fixture.mapIngest,
    '--database', fixture.database,
    '--expected-database-sha256', sha256(fixture.database),
  ];
}

describe('Combined Zones R13 final acceptance coordinator', () => {
  it('defaults to a deterministic truthful WAIT plan without mutation', () => {
    const first = path.join(temporaryDirectory, 'dry-first.json');
    const second = path.join(temporaryDirectory, 'dry-second.json');
    for (const out of [first, second]) {
      execFileSync(process.execPath, [SCRIPT, '--plan-out', out,
        '--generated-at', '2026-08-22T06:00:00Z'], { cwd: ROOT, stdio: 'pipe' });
    }
    const a = JSON.parse(fs.readFileSync(first, 'utf8'));
    const b = JSON.parse(fs.readFileSync(second, 'utf8'));
    expect(a).toMatchObject({
      status: 'WAITING_R13_FINAL_ACCEPTANCE_COORDINATOR_INPUTS',
      mode: 'DRY_RUN_DEFAULT',
      appendOnly: { requiredFreshRunRoot: true, runRoot: null,
        existingOutputsOverwritten: false },
      safetyBoundary: { currentInvocationExecuted: false, databaseMutation: false,
        liveMinecraftCalls: false, externalPublication: false },
    });
    expect(a.stageOrder).toHaveLength(5);
    expect(a.coordinatorPlanPayloadSha256).toBe(b.coordinatorPlanPayloadSha256);
  });

  it('runs the complete synthetic terminal-to-G19 chain with exact bindings', () => {
    const root = path.join(temporaryDirectory, 'pass');
    const fixture = activeTerminalFixture(path.join(root, 'inputs'));
    execFileSync(process.execPath, [...argumentsFor(fixture, root), '--execute'], {
      cwd: ROOT, stdio: 'pipe', timeout: 180_000,
    });
    const runRoot = path.join(root, 'run');
    const seal = JSON.parse(fs.readFileSync(
      path.join(runRoot, 'r13-final-acceptance-coordinator-seal.json'), 'utf8',
    ));
    expect(seal).toMatchObject({
      status: 'PASS_R13_FINAL_ACCEPTANCE_COORDINATED',
      terminalCompleteSaveSha256: fixture.terminalHash,
      safetyBoundary: { liveMinecraftCalls: false, worldMutation: false,
        serviceMutation: false, externalPublicationPerformed: false },
    });
    expect(seal.stages.map(({ status }: { status: string }) => status))
      .toEqual(['PASS', 'PASS', 'PASS', 'PASS', 'PASS']);
    const final = JSON.parse(fs.readFileSync(
      path.join(runRoot, '05-final-r13-acceptance/r13-final-acceptance.json'), 'utf8',
    ));
    expect(final).toMatchObject({
      status: 'PASS_R13_CONSOLIDATED_MVP_ACCEPTED',
      summary: { readyForFinalAcceptance: true, passedDependencyCount: 6,
        passedGateCount: 4, waitingGateCount: 0 },
    });
    expect(final.gates.every(({ status }: { status: string }) => status === 'PASS')).toBe(true);
    const database = new Database(fixture.database, { readonly: true });
    expect(database.prepare(
      "SELECT COUNT(*) AS count FROM world_features WHERE project_id = 'combined-zones-phase1'",
    ).get()).toEqual({ count: 11 });
    database.close();
  });

  it('rejects an injected stale input hash before creating the append-only run root', () => {
    const root = path.join(temporaryDirectory, 'stale');
    const fixture = activeTerminalFixture(path.join(root, 'inputs'));
    const args = argumentsFor(fixture, root);
    const hashIndex = args.indexOf('--expected-final-ledger-sha256') + 1;
    args[hashIndex] = '0'.repeat(64);
    const databaseBefore = sha256(fixture.database);
    const result = spawnSync(process.execPath, [...args, '--execute'], {
      cwd: ROOT, encoding: 'utf8', timeout: 60_000,
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      'finalLedger: observed SHA-256 does not equal the supplied expected SHA-256',
    );
    expect(fs.existsSync(path.join(root, 'run'))).toBe(false);
    expect(sha256(fixture.database)).toBe(databaseBefore);
  });
});
