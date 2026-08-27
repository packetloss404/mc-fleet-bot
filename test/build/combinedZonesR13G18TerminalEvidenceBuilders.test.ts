import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SHOT_SCRIPT = path.join(
  ROOT, 'scripts/generate_combined_zones_r13_g18_terminal_media_shot_plan.mjs',
);
const MEDIA_SCRIPT = path.join(
  ROOT, 'scripts/generate_combined_zones_r13_g18_matched_media_evidence.mjs',
);
const MAP_SCRIPT = path.join(
  ROOT, 'scripts/generate_combined_zones_r13_g18_terminal_map_qa_evidence.mjs',
);
const DATABASE_SCRIPT = path.join(
  ROOT, 'scripts/generate_combined_zones_r13_g18_database_import_verification.mjs',
);
const PUBLICATION_SCRIPT = path.join(
  ROOT, 'scripts/generate_combined_zones_r13_g18_publication_acceptance.mjs',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r13-g18-evidence-builders-'),
);
const WAIT_ROOT = path.join(temporaryDirectory, 'generated-wait-evidence');
const WAIT_SHOT_PLAN = path.join(WAIT_ROOT, 'unbound-shot-plan.json');
const TERMINAL_WAIT = path.join(temporaryDirectory, 'absent-terminal-post-acceptance.json');
const ABSENT_CAPTURE_ROOT = path.join(temporaryDirectory, 'absent-captures');
const WAIT_DATABASE = path.join(temporaryDirectory, 'empty-world-map.db');
const sha256 = (filename: string) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');
const declaration = (filename: string) => ({
  path: filename,
  sha256: sha256(filename),
  bytes: fs.statSync(filename).size,
});
const writeJson = (filename: string, value: unknown) => {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
};
const execute = (script: string, args: string[]) => execFileSync(process.execPath, [
  script,
  '--generated-at', '2026-08-22T05:30:00Z',
  ...args,
], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });

const createEmptyWorldMapDatabase = (filename: string) => {
  const sqlite = new Database(filename);
  sqlite.exec(`CREATE TABLE world_features (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    external_id TEXT,
    world TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    geometry_json TEXT NOT NULL,
    source TEXT NOT NULL,
    source_ref TEXT,
    tags_json TEXT NOT NULL,
    attributes_json TEXT NOT NULL
  )`);
  sqlite.close();
};

beforeAll(() => {
  createEmptyWorldMapDatabase(WAIT_DATABASE);
  execute(SHOT_SCRIPT, [
    '--out', WAIT_SHOT_PLAN,
    '--terminal-post-acceptance', TERMINAL_WAIT,
    '--capture-root', ABSENT_CAPTURE_ROOT,
  ]);
  execute(MEDIA_SCRIPT, [
    '--shot-plan', WAIT_SHOT_PLAN,
    '--terminal-post-acceptance', TERMINAL_WAIT,
    '--out', path.join(WAIT_ROOT, 'matched-media-evidence.json'),
  ]);
  execute(MAP_SCRIPT, [
    '--shot-plan', WAIT_SHOT_PLAN,
    '--terminal-post-acceptance', TERMINAL_WAIT,
    '--out', path.join(WAIT_ROOT, 'terminal-map-qa-evidence.json'),
  ]);
  execute(DATABASE_SCRIPT, [
    '--shot-plan', WAIT_SHOT_PLAN,
    '--terminal-post-acceptance', TERMINAL_WAIT,
    '--database', WAIT_DATABASE,
    '--fixture-out', path.join(WAIT_ROOT, 'database-import-fixture.json'),
    '--out', path.join(WAIT_ROOT, 'database-import-verification.json'),
  ]);
});

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

function acceptedFixture(root: string) {
  fs.mkdirSync(root, { recursive: true });
  const terminalHash = 'a'.repeat(64);
  const terminal = path.join(root, 'terminal-acceptance.json');
  writeJson(terminal, {
    status: 'PASS_R13_G18_TERMINAL_POST_ACCEPTED',
    terminalCompleteSaveSha256: terminalHash,
    terminalPostRoot: 'data/worldsnap-synthetic-terminal-post',
  });
  const captureRoot = path.join(root, 'captures');
  fs.mkdirSync(captureRoot, { recursive: true });
  const unboundShotPlan = path.join(root, 'unbound-shot-plan.json');
  execute(SHOT_SCRIPT, [
    '--out', unboundShotPlan,
    '--terminal-post-acceptance', path.join(root, 'absent-terminal-acceptance.json'),
    '--capture-root', captureRoot,
  ]);
  const currentPlan = JSON.parse(fs.readFileSync(unboundShotPlan, 'utf8'));
  for (const shot of currentPlan.shots) {
    fs.writeFileSync(path.join(captureRoot, shot.expectedRaster.filename), Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from(`synthetic-${shot.id}`),
    ]));
  }
  const shotPlan = path.join(root, 'shot-plan.json');
  execute(SHOT_SCRIPT, [
    '--out', shotPlan,
    '--terminal-post-acceptance', terminal,
    '--capture-root', captureRoot,
  ]);
  const media = path.join(root, 'matched-media-evidence.json');
  execute(MEDIA_SCRIPT, [
    '--shot-plan', shotPlan,
    '--terminal-post-acceptance', terminal,
    '--out', media,
  ]);
  const mapSvg = path.join(root, 'terminal-map.svg');
  const mapIndex = path.join(root, 'terminal-map-features.json');
  fs.writeFileSync(mapSvg, '<svg xmlns="http://www.w3.org/2000/svg"></svg>\n');
  writeJson(mapIndex, {
    terminalCompleteSaveSha256: terminalHash,
    featureIds: JSON.parse(fs.readFileSync(shotPlan, 'utf8')).shots.map(
      ({ featureId }: { featureId: string }) => featureId,
    ),
  });
  const mapManifest = path.join(root, 'map-artifact-manifest.json');
  const plan = JSON.parse(fs.readFileSync(shotPlan, 'utf8'));
  writeJson(mapManifest, {
    terminalCompleteSaveSha256: terminalHash,
    shotPlan: declaration(shotPlan),
    matchedMediaEvidence: declaration(media),
    coverageFeatureIds: plan.shots.map(({ featureId }: { featureId: string }) => featureId),
    artifacts: [
      { id: 'terminal-map-visual', format: 'SVG', ...declaration(mapSvg) },
      { id: 'terminal-map-feature-index', format: 'JSON', ...declaration(mapIndex) },
    ],
  });
  const map = path.join(root, 'terminal-map-qa-evidence.json');
  execute(MAP_SCRIPT, [
    '--shot-plan', shotPlan,
    '--terminal-post-acceptance', terminal,
    '--matched-media-evidence', media,
    '--map-artifact-manifest', mapManifest,
    '--out', map,
  ]);

  const database = path.join(root, 'world-map.db');
  createEmptyWorldMapDatabase(database);
  const fixture = path.join(root, 'database-import-fixture.json');
  const databaseEvidence = path.join(root, 'database-import-verification.json');
  execute(DATABASE_SCRIPT, [
    '--shot-plan', shotPlan,
    '--terminal-post-acceptance', terminal,
    '--database', database,
    '--fixture-out', fixture,
    '--out', databaseEvidence,
  ]);
  const importFixture = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  const writable = new Database(database);
  const insert = writable.prepare(`INSERT INTO world_features (
    id, project_id, external_id, world, name, kind, status, geometry_json,
    source, source_ref, tags_json, attributes_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const transaction = writable.transaction(() => {
    for (const [index, record] of importFixture.records.entries()) {
      insert.run(
        `synthetic-${index}`,
        record.projectId,
        record.externalId,
        record.world,
        record.name,
        record.kind,
        record.status,
        JSON.stringify(record.geometry),
        record.source,
        record.sourceRef,
        JSON.stringify(record.tags),
        JSON.stringify(record.attributes),
      );
    }
  });
  transaction();
  writable.close();
  execute(DATABASE_SCRIPT, [
    '--shot-plan', shotPlan,
    '--terminal-post-acceptance', terminal,
    '--database', database,
    '--fixture-out', fixture,
    '--out', databaseEvidence,
  ]);
  return {
    root,
    terminalHash,
    terminal,
    captureRoot,
    shotPlan,
    media,
    map,
    mapManifest,
    database,
    fixture,
    databaseEvidence,
  };
}

function publicationInputs(root: string, terminalHash: string) {
  const r13 = path.join(root, 'r13-ready.json');
  writeJson(r13, {
    status: 'WAITING_R13_CONSOLIDATED_MVP_ACCEPTANCE',
    readinessPayloadSha256: 'b'.repeat(64),
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
  const identity = path.join(root, 'post-identity.json');
  const intake = path.join(root, 'post-intake.json');
  const rollback = path.join(root, 'rollback.json');
  writeJson(identity, { status: 'PASS', sha256: 'c'.repeat(64) });
  writeJson(intake, { status: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE' });
  writeJson(rollback, { status: 'PASS_COMPLETE_POSTSTATE_PREFLIGHT', passed: 11, failed: 0 });
  const ledger = path.join(root, 'terminal-ledger.json');
  writeJson(ledger, {
    status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
    releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
    completedReleaseIdentitySha256: 'd'.repeat(64),
    postSnapshot: {
      root: 'data/worldsnap-synthetic-terminal-post',
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
  return { r13, ledger, qa };
}

describe('Combined Zones R13 G18 terminal acceptance-evidence builders', () => {
  it('reproduces the temp-generated WAIT evidence independently of output paths', () => {
    const media = path.join(temporaryDirectory, 'reproduced-media.json');
    execute(MEDIA_SCRIPT, ['--shot-plan', WAIT_SHOT_PLAN,
      '--terminal-post-acceptance', TERMINAL_WAIT, '--out', media]);
    expect(fs.readFileSync(media)).toEqual(fs.readFileSync(
      path.join(WAIT_ROOT, 'matched-media-evidence.json'),
    ));
    const map = path.join(temporaryDirectory, 'reproduced-map.json');
    execute(MAP_SCRIPT, ['--shot-plan', WAIT_SHOT_PLAN,
      '--terminal-post-acceptance', TERMINAL_WAIT, '--out', map]);
    expect(fs.readFileSync(map)).toEqual(fs.readFileSync(
      path.join(WAIT_ROOT, 'terminal-map-qa-evidence.json'),
    ));
    const fixture = path.join(temporaryDirectory, 'reproduced-fixture.json');
    const database = path.join(temporaryDirectory, 'reproduced-database.json');
    execute(DATABASE_SCRIPT, [
      '--shot-plan', WAIT_SHOT_PLAN,
      '--terminal-post-acceptance', TERMINAL_WAIT,
      '--database', WAIT_DATABASE,
      '--fixture-out', fixture,
      '--fixture-binding-path', path.join(WAIT_ROOT, 'database-import-fixture.json'),
      '--out', database,
    ]);
    expect(fs.readFileSync(fixture)).toEqual(fs.readFileSync(
      path.join(WAIT_ROOT, 'database-import-fixture.json'),
    ));
    expect(fs.readFileSync(database)).toEqual(fs.readFileSync(
      path.join(WAIT_ROOT, 'database-import-verification.json'),
    ));
  });

  it('keeps the temp-generated terminal, media, map, and database chain honestly waiting', () => {
    const media = JSON.parse(fs.readFileSync(path.join(WAIT_ROOT, 'matched-media-evidence.json'), 'utf8'));
    const map = JSON.parse(fs.readFileSync(path.join(WAIT_ROOT, 'terminal-map-qa-evidence.json'), 'utf8'));
    const fixture = JSON.parse(fs.readFileSync(path.join(WAIT_ROOT, 'database-import-fixture.json'), 'utf8'));
    const database = JSON.parse(fs.readFileSync(path.join(WAIT_ROOT, 'database-import-verification.json'), 'utf8'));
    expect(media).toMatchObject({
      status: 'WAITING_R13_G18_MATCHED_MEDIA_EVIDENCE',
      terminalCompleteSaveSha256: null,
      coverageComplete: false,
      summary: { passed: false, plannedItemCount: 11, passedItemCount: 0 },
    });
    expect(map).toMatchObject({
      status: 'WAITING_R13_G18_TERMINAL_MAP_QA_EVIDENCE',
      terminalCompleteSaveSha256: null,
      coverageComplete: false,
      summary: { passed: false, checkCount: 5, passCount: 0 },
    });
    expect(fixture).toMatchObject({
      status: 'WAITING_R13_G18_TERMINAL_DATABASE_IMPORT_FIXTURE',
      terminalCompleteSaveSha256: null,
      recordCount: 11,
      authorityBoundary: { importPerformed: false, databaseWritten: false },
    });
    expect(database).toMatchObject({
      status: 'WAITING_R13_G18_DATABASE_IMPORT_VERIFICATION',
      terminalCompleteSaveSha256: null,
      importedRecordCount: 0,
      mismatchCount: 11,
      safetyBoundary: { databaseWrittenOrImported: false },
    });
  });

  it('builds a complete accepted evidence chain from exact terminal-bound fixtures', () => {
    const fixture = acceptedFixture(path.join(temporaryDirectory, 'accepted-chain'));
    const media = JSON.parse(fs.readFileSync(fixture.media, 'utf8'));
    const map = JSON.parse(fs.readFileSync(fixture.map, 'utf8'));
    const database = JSON.parse(fs.readFileSync(fixture.databaseEvidence, 'utf8'));
    expect(media).toMatchObject({
      status: 'PASS_R13_G18_MATCHED_MEDIA_EVIDENCE',
      terminalCompleteSaveSha256: fixture.terminalHash,
      coverageComplete: true,
      summary: { passed: true, plannedItemCount: 11, passedItemCount: 11 },
    });
    expect(media.items.every(({ rasterSignature, status }: {
      rasterSignature: string;
      status: string;
    }) => rasterSignature === 'PNG' && status === 'PASS')).toBe(true);
    expect(map).toMatchObject({
      status: 'PASS_R13_G18_TERMINAL_MAP_QA_EVIDENCE',
      terminalCompleteSaveSha256: fixture.terminalHash,
      coverageComplete: true,
      summary: { passed: true, checkCount: 5, passCount: 5 },
    });
    expect(database).toMatchObject({
      status: 'PASS_R13_G18_DATABASE_IMPORT_VERIFICATION',
      terminalCompleteSaveSha256: fixture.terminalHash,
      importedRecordCount: 11,
      verifiedRecordCount: 11,
      mismatchCount: 0,
    });
    expect(database.sourceRecordSetSha256).toBe(database.importedRecordSetSha256);
  });

  it('is directly consumable by the existing G18 publication acceptance schema', () => {
    const fixture = acceptedFixture(path.join(temporaryDirectory, 'publication-chain'));
    const terminal = publicationInputs(fixture.root, fixture.terminalHash);
    const outRoot = path.join(fixture.root, 'publication');
    execute(PUBLICATION_SCRIPT, [
      '--out-root', outRoot,
      '--r13-report', terminal.r13,
      '--terminal-ledger', terminal.ledger,
      '--terminal-qa', terminal.qa,
      '--media-evidence', fixture.media,
      '--map-evidence', fixture.map,
      '--database-import-evidence', fixture.databaseEvidence,
    ]);
    expect(JSON.parse(fs.readFileSync(path.join(outRoot, 'publication-manifest.json'), 'utf8')))
      .toMatchObject({
        status: 'PASS_R13_G18_MEDIA_AND_PUBLICATION_ACCEPTED',
        terminalCompleteSaveSha256: fixture.terminalHash,
        publicationAuthorized: true,
        externalPublicationPerformed: false,
      });
  });

  it('fails matched media closed when a raster changes after shot-plan binding', () => {
    const fixture = acceptedFixture(path.join(temporaryDirectory, 'tampered-raster'));
    const shotPlan = JSON.parse(fs.readFileSync(fixture.shotPlan, 'utf8'));
    fs.appendFileSync(path.join(fixture.captureRoot, shotPlan.shots[0].expectedRaster.filename), 'drift');
    const altered = path.join(fixture.root, 'altered-media.json');
    execute(MEDIA_SCRIPT, [
      '--shot-plan', fixture.shotPlan,
      '--terminal-post-acceptance', fixture.terminal,
      '--out', altered,
    ]);
    const media = JSON.parse(fs.readFileSync(altered, 'utf8'));
    expect(media.status).toBe('WAITING_R13_G18_MATCHED_MEDIA_EVIDENCE');
    expect(media.summary).toMatchObject({ passedItemCount: 10, waitingItemCount: 1 });
    expect(media.items[0].reasons).toContain('SHOT_PLAN_RASTER_BINDING_MISMATCH');
  });

  it('fails terminal map QA closed on a stale matched-media binding', () => {
    const fixture = acceptedFixture(path.join(temporaryDirectory, 'stale-map-media'));
    const manifest = JSON.parse(fs.readFileSync(fixture.mapManifest, 'utf8'));
    manifest.matchedMediaEvidence.sha256 = '0'.repeat(64);
    writeJson(fixture.mapManifest, manifest);
    const altered = path.join(fixture.root, 'altered-map-qa.json');
    execute(MAP_SCRIPT, [
      '--shot-plan', fixture.shotPlan,
      '--terminal-post-acceptance', fixture.terminal,
      '--matched-media-evidence', fixture.media,
      '--map-artifact-manifest', fixture.mapManifest,
      '--out', altered,
    ]);
    const map = JSON.parse(fs.readFileSync(altered, 'utf8'));
    expect(map.status).toBe('WAITING_R13_G18_TERMINAL_MAP_QA_EVIDENCE');
    expect(map.checks).toContainEqual({ id: 'map-artifact-manifest-binding', status: 'WAITING' });
  });

  it('opens the canonical database read-only and leaves it byte-identical', () => {
    const database = path.join(ROOT, 'data/world-map.db');
    const before = sha256(database);
    const out = path.join(temporaryDirectory, 'read-only-database-verification.json');
    const fixture = path.join(temporaryDirectory, 'read-only-database-fixture.json');
    execute(DATABASE_SCRIPT, [
      '--database', database,
      '--fixture-out', fixture,
      '--out', out,
    ]);
    expect(sha256(database)).toBe(before);
    expect(JSON.parse(fs.readFileSync(out, 'utf8'))).toMatchObject({
      databaseReadOnlyOpen: true,
      targetTablePresent: true,
      status: 'PASS_R13_G18_DATABASE_IMPORT_VERIFICATION',
      importedRecordCount: 11,
      verifiedRecordCount: 11,
      mismatchCount: 0,
      safetyBoundary: { databaseWrittenOrImported: false },
    });
    const evidence = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(evidence.sourceRecordSetSha256).toBe(evidence.importedRecordSetSha256);
  });
});
