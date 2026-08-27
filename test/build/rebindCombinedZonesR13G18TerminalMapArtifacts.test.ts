import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createCanvas } from 'canvas';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT, 'scripts/rebind_combined_zones_r13_g18_terminal_map_artifacts.mjs',
);
const SHOT_SCRIPT = path.join(
  ROOT, 'scripts/generate_combined_zones_r13_g18_terminal_media_shot_plan.mjs',
);
const MEDIA_SCRIPT = path.join(
  ROOT, 'scripts/generate_combined_zones_r13_g18_matched_media_evidence.mjs',
);
const MAP_QA_SCRIPT = path.join(
  ROOT, 'scripts/generate_combined_zones_r13_g18_terminal_map_qa_evidence.mjs',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r13-g18-map-rebinder-'),
);

const sha256 = (filename: string) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');
const declaration = (filename: string) => ({
  path: filename,
  sha256: sha256(filename),
  bytes: fs.statSync(filename).size,
});
const repositoryDeclaration = (filename: string) => ({
  path: path.relative(ROOT, filename).split(path.sep).join('/'),
  sha256: sha256(filename),
  bytes: fs.statSync(filename).size,
});
const writeJson = (filename: string, value: unknown) => {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
};
const execute = (script: string, args: string[]) => execFileSync(process.execPath, [
  script,
  ...args,
], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

function createPng(filename: string, width: number, height: number) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.fillStyle = '#16344a';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#e9c46a';
  context.fillRect(64, 64, width - 128, height - 128);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, canvas.toBuffer('image/png'));
}

function createAcceptedFixture(root: string) {
  fs.mkdirSync(root, { recursive: true });
  const terminalHash = 'a'.repeat(64);
  const terminal = path.join(root, 'terminal-post-acceptance.json');
  writeJson(terminal, {
    status: 'PASS_R13_G18_TERMINAL_POST_ACCEPTED',
    terminalCompleteSaveSha256: terminalHash,
    terminalPostRoot: path.join(root, 'terminal-post'),
  });

  const captures = path.join(root, 'captures');
  const unbound = path.join(root, 'unbound-shot-plan.json');
  execute(SHOT_SCRIPT, [
    '--generated-at', '2026-08-22T06:00:00Z',
    '--terminal-post-acceptance', path.join(root, 'absent-terminal.json'),
    '--capture-root', captures,
    '--out', unbound,
  ]);
  const unboundPlan = JSON.parse(fs.readFileSync(unbound, 'utf8'));
  for (const shot of unboundPlan.shots) {
    fs.mkdirSync(captures, { recursive: true });
    fs.writeFileSync(path.join(captures, shot.expectedRaster.filename), Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from(`accepted-${shot.id}`),
    ]));
  }

  const oldPlan = path.join(root, 'old-shot-plan.json');
  const oldMedia = path.join(root, 'old-matched-media.json');
  execute(SHOT_SCRIPT, [
    '--generated-at', '2026-08-22T06:10:00Z',
    '--terminal-post-acceptance', terminal,
    '--capture-root', captures,
    '--out', oldPlan,
  ]);
  execute(MEDIA_SCRIPT, [
    '--generated-at', '2026-08-22T06:10:00Z',
    '--terminal-post-acceptance', terminal,
    '--shot-plan', oldPlan,
    '--out', oldMedia,
  ]);

  const mapPng = path.join(root, 'accepted-map', 'terminal-map.png');
  createPng(mapPng, 2048, 2048);
  const oldIndex = path.join(root, 'accepted-map', 'terminal-map-feature-index.json');
  const oldPlanJson = JSON.parse(fs.readFileSync(oldPlan, 'utf8'));
  writeJson(oldIndex, {
    schemaVersion: 1,
    terminalCompleteSaveSha256: terminalHash,
    coverageFeatureIds: oldPlanJson.shots.map(({ featureId }: { featureId: string }) => featureId),
  });
  const oldManifest = path.join(root, 'accepted-map', 'map-artifact-manifest.json');
  writeJson(oldManifest, {
    schemaVersion: 1,
    terminalCompleteSaveSha256: terminalHash,
    shotPlan: declaration(oldPlan),
    matchedMediaEvidence: declaration(oldMedia),
    coverageFeatureIds: oldPlanJson.shots.map(({ featureId }: { featureId: string }) => featureId),
    artifacts: [
      { id: 'terminal-map-visual', format: 'PNG', ...declaration(mapPng) },
      { id: 'terminal-map-feature-index', format: 'JSON', ...declaration(oldIndex) },
    ],
  });
  const oldMapQa = path.join(root, 'accepted-map-qa.json');
  execute(MAP_QA_SCRIPT, [
    '--generated-at', '2026-08-22T06:10:00Z',
    '--terminal-post-acceptance', terminal,
    '--shot-plan', oldPlan,
    '--matched-media-evidence', oldMedia,
    '--map-artifact-manifest', oldManifest,
    '--out', oldMapQa,
  ]);
  expect(JSON.parse(fs.readFileSync(oldMapQa, 'utf8')).status)
    .toBe('PASS_R13_G18_TERMINAL_MAP_QA_EVIDENCE');

  const shotPlan = path.join(root, 'rebound-shot-plan.json');
  const media = path.join(root, 'rebound-matched-media.json');
  execute(SHOT_SCRIPT, [
    '--generated-at', '2026-08-22T06:30:00Z',
    '--terminal-post-acceptance', terminal,
    '--capture-root', captures,
    '--out', shotPlan,
  ]);
  execute(MEDIA_SCRIPT, [
    '--generated-at', '2026-08-22T06:30:00Z',
    '--terminal-post-acceptance', terminal,
    '--shot-plan', shotPlan,
    '--out', media,
  ]);
  expect(sha256(shotPlan)).not.toBe(sha256(oldPlan));
  expect(sha256(media)).not.toBe(sha256(oldMedia));

  return { terminalHash, terminal, captures, shotPlan, media, mapPng, oldManifest, oldMapQa };
}

function rebindArgs(fixture: ReturnType<typeof createAcceptedFixture>, outRoot: string) {
  return [
    '--generated-at', '2026-08-22T06:40:00Z',
    '--terminal-post-acceptance', fixture.terminal,
    '--shot-plan', fixture.shotPlan,
    '--matched-media-evidence', fixture.media,
    '--accepted-map-manifest', fixture.oldManifest,
    '--accepted-map-qa', fixture.oldMapQa,
    '--map-png', fixture.mapPng,
    '--out-root', outRoot,
  ];
}

describe('Combined Zones R13 G18 terminal-map artifact rebinder', () => {
  it('reuses the accepted PNG and emits a consumable fresh two-file map binding', () => {
    const fixture = createAcceptedFixture(path.join(temporaryDirectory, 'accepted'));
    const outRoot = path.join(fixture.terminal, '..', 'rebound-map');
    const mapBefore = {
      sha256: sha256(fixture.mapPng),
      mtimeMs: fs.statSync(fixture.mapPng).mtimeMs,
    };
    const stdout = JSON.parse(execute(SCRIPT, rebindArgs(fixture, outRoot)).toString());
    expect(stdout).toMatchObject({
      status: 'PASS_R13_G18_TERMINAL_MAP_ARTIFACT_REBIND',
      terminalCompleteSaveSha256: fixture.terminalHash,
      featureCount: 11,
      safetyBoundary: {
        appendOnlyFreshOutputs: true,
        visualMapCopiedOrModified: false,
        databaseOpened: false,
        databaseWrittenOrImported: false,
        liveCallsPerformed: false,
      },
    });
    expect(fs.readdirSync(outRoot).sort()).toEqual([
      'map-artifact-manifest.json',
      'terminal-map-feature-index.json',
    ]);
    expect({ sha256: sha256(fixture.mapPng), mtimeMs: fs.statSync(fixture.mapPng).mtimeMs })
      .toEqual(mapBefore);

    const manifest = JSON.parse(fs.readFileSync(
      path.join(outRoot, 'map-artifact-manifest.json'), 'utf8',
    ));
    expect(manifest).toMatchObject({
      terminalCompleteSaveSha256: fixture.terminalHash,
      shotPlan: repositoryDeclaration(fixture.shotPlan),
      matchedMediaEvidence: repositoryDeclaration(fixture.media),
      safetyBoundary: {
        visualMapCopiedOrModified: false,
        mediaCapturedOrModified: false,
        databaseOpened: false,
      },
    });
    expect(manifest.artifacts[0]).toMatchObject({
      id: 'terminal-map-visual',
      format: 'PNG',
      ...repositoryDeclaration(fixture.mapPng),
    });

    const mapQa = path.join(path.dirname(outRoot), 'rebound-map-qa.json');
    execute(MAP_QA_SCRIPT, [
      '--generated-at', '2026-08-22T06:40:00Z',
      '--terminal-post-acceptance', fixture.terminal,
      '--shot-plan', fixture.shotPlan,
      '--matched-media-evidence', fixture.media,
      '--map-artifact-manifest', path.join(outRoot, 'map-artifact-manifest.json'),
      '--out', mapQa,
    ]);
    expect(JSON.parse(fs.readFileSync(mapQa, 'utf8'))).toMatchObject({
      status: 'PASS_R13_G18_TERMINAL_MAP_QA_EVIDENCE',
      coverageComplete: true,
      summary: { passed: true, passCount: 5, checkCount: 5 },
    });
  });

  it('is byte-deterministic for the same logical output path and refuses overwrite', () => {
    const fixture = createAcceptedFixture(path.join(temporaryDirectory, 'deterministic'));
    const outRoot = path.join(temporaryDirectory, 'deterministic-output');
    execute(SCRIPT, rebindArgs(fixture, outRoot));
    const first = fs.readdirSync(outRoot).sort().map((name) => ({
      name,
      bytes: fs.readFileSync(path.join(outRoot, name)),
    }));

    const rejected = spawnSync(process.execPath, [SCRIPT, ...rebindArgs(fixture, outRoot)], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain('--out-root must be a fresh append-only path');
    expect(fs.readdirSync(outRoot).sort().map((name) => fs.readFileSync(path.join(outRoot, name))))
      .toEqual(first.map(({ bytes }) => bytes));

    fs.rmSync(outRoot, { recursive: true });
    execute(SCRIPT, rebindArgs(fixture, outRoot));
    expect(fs.readdirSync(outRoot).sort().map((name) => ({
      name,
      bytes: fs.readFileSync(path.join(outRoot, name)),
    }))).toEqual(first);
  });

  it('fails before output on stale matched-media and unaccepted-map bindings', () => {
    const fixture = createAcceptedFixture(path.join(temporaryDirectory, 'fail-closed'));
    const staleMedia = path.join(path.dirname(fixture.media), 'stale-media.json');
    const stale = JSON.parse(fs.readFileSync(fixture.media, 'utf8'));
    stale.shotPlan.sha256 = '0'.repeat(64);
    writeJson(staleMedia, stale);
    const staleOut = path.join(temporaryDirectory, 'stale-output');
    const staleResult = spawnSync(process.execPath, [SCRIPT, ...rebindArgs({
      ...fixture,
      media: staleMedia,
    }, staleOut)], { cwd: ROOT, encoding: 'utf8' });
    expect(staleResult.status).not.toBe(0);
    expect(staleResult.stderr).toContain('matched-media evidence is not PASS');
    expect(fs.existsSync(staleOut)).toBe(false);

    fs.appendFileSync(fixture.mapPng, 'map-drift');
    const driftOut = path.join(temporaryDirectory, 'map-drift-output');
    const driftResult = spawnSync(process.execPath, [SCRIPT, ...rebindArgs(fixture, driftOut)], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(driftResult.status).not.toBe(0);
    expect(driftResult.stderr).toContain('accepted map manifest does not bind the supplied PNG exactly');
    expect(fs.existsSync(driftOut)).toBe(false);
  });
});
