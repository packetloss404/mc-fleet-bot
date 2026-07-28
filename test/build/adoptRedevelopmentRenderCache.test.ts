import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { createCanvas } from 'canvas';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const ADOPTER = path.join(
  ROOT,
  'scripts/adopt_redevelopment_render_cache.mjs',
);
const temporaryDirectories: string[] = [];

interface SnapshotIdentity {
  sha256: string;
  regionFileCount: number;
  bytes: number;
  algorithm: string;
}

interface Camera {
  id: string;
  mode: 'persp';
  eye: number[];
  lookAt: number[];
  fov: number;
  width: number;
  height: number;
  output: string;
}

function relativeRoot(filename: string) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256File(filename: string) {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(filename))
    .digest('hex');
}

function snapshotHash(directory: string): SnapshotIdentity {
  const files = fs.readdirSync(directory)
    .filter((filename) => filename.endsWith('.mca'))
    .sort();
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for (const filename of files) {
    const content = fs.readFileSync(path.join(directory, filename));
    hash.update(filename);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
    bytes += content.length;
  }
  return {
    sha256: hash.digest('hex'),
    regionFileCount: files.length,
    bytes,
    algorithm:
      'sha256(filename + NUL + bytes + NUL, sorted by filename)',
  };
}

function writeInformativePng(filename: string) {
  const size = 512;
  const canvas = createCanvas(size, size);
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      image.data[offset] = (x * 13 + y * 7) % 256;
      image.data[offset + 1] = (x * 3 + y * 17) % 256;
      image.data[offset + 2] = (x * 19 + y * 5) % 256;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, canvas.toBuffer('image/png'));
  expect(fs.statSync(filename).size).toBeGreaterThan(8_000);
}

function camera(id: string, output: string): Camera {
  return {
    id,
    mode: 'persp',
    eye: [1.5, 2.5, 3.5],
    lookAt: [8, 4, 9],
    fov: 72,
    width: 1280,
    height: 720,
    output,
  };
}

function writeJson(filename: string, value: unknown) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

function fixture() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'redevelopment-cache-adoption-'),
  );
  temporaryDirectories.push(directory);
  const regions = path.join(directory, 'snapshot', 'region');
  fs.mkdirSync(regions, { recursive: true });
  fs.writeFileSync(
    path.join(regions, 'r.0.0.mca'),
    Buffer.from('synthetic immutable region identity'),
  );
  const snapshot = snapshotHash(regions);
  const sourceDirectory = path.join(directory, 'source');
  const targetDirectory = path.join(directory, 'target');
  const oldManifestPath = path.join(directory, 'old-manifest.json');
  const newManifestPath = path.join(directory, 'new-manifest.json');
  const unchanged = camera('CAM-UNCHANGED', 'pass-1/unchanged.png');
  const changedOld = camera('CAM-CHANGED', 'pass-1/changed.png');
  const pending = camera('CAM-PENDING', 'pass-1/pending.png');
  const changedNew = {
    ...changedOld,
    lookAt: [9, 4, 9],
  };
  const added = camera('CAM-ADDED', 'pass-1/added.png');
  const postreleaseSnapshot = {
    path: relativeRoot(regions),
    ...snapshot,
  };
  writeJson(oldManifestPath, {
    postreleaseSnapshot,
    cameras: [unchanged, changedOld, pending],
  });
  writeJson(newManifestPath, {
    postreleaseSnapshot,
    cameras: [unchanged, changedNew, pending, added],
  });
  writeInformativePng(
    path.join(sourceDirectory, unchanged.output),
  );
  writeInformativePng(
    path.join(sourceDirectory, changedOld.output),
  );
  writeJson(path.join(sourceDirectory, '.render-binding.json'), {
    schemaVersion: 1,
    sourceManifest: relativeRoot(oldManifestPath),
    sourceManifestSha256: sha256File(oldManifestPath),
    regions: relativeRoot(regions),
    snapshot,
    outputDirectory: relativeRoot(sourceDirectory),
  });
  const reportPath = path.join(targetDirectory, 'adoption-report.json');
  const command = [
    ADOPTER,
    '--old-manifest', oldManifestPath,
    '--new-manifest', newManifestPath,
    '--regions', regions,
    '--source-dir', sourceDirectory,
    '--target-dir', targetDirectory,
    '--report', reportPath,
  ];
  return {
    command,
    regions,
    sourceDirectory,
    targetDirectory,
    oldManifestPath,
    newManifestPath,
    reportPath,
    snapshot,
    unchanged,
    changedOld,
    pending,
    added,
  };
}

function run(command: string[]) {
  return spawnSync(process.execPath, command, {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('redevelopment render cache adoption', () => {
  it('copies only byte-identical camera contracts and skips changed cameras', () => {
    const state = fixture();
    const result = run(state.command);

    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(fs.readFileSync(state.reportPath, 'utf8'));
    expect(report).toMatchObject({
      status: 'PASS_CACHE_ADOPTION_ONLY',
      passed: true,
      acceptanceClaim: false,
      counts: {
        oldCameras: 3,
        newCameras: 4,
        changedCameraContracts: 2,
        adoptedOutputs: 1,
        unchangedOutputsPendingRender: 1,
        totalPendingRender: 3,
      },
      changedCameraIds: [state.changedOld.id, state.added.id],
      unchangedPendingCameraIds: [state.pending.id],
      adopted: [{
        id: state.unchanged.id,
        output: state.unchanged.output,
      }],
    });
    expect(
      sha256File(path.join(state.targetDirectory, state.unchanged.output)),
    ).toBe(
      sha256File(path.join(state.sourceDirectory, state.unchanged.output)),
    );
    expect(
      fs.existsSync(path.join(
        state.targetDirectory,
        state.changedOld.output,
      )),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(
        state.targetDirectory,
        state.pending.output,
      )),
    ).toBe(false);
    expect(
      JSON.parse(fs.readFileSync(
        path.join(state.targetDirectory, '.render-binding.json'),
        'utf8',
      )),
    ).toMatchObject({
      schemaVersion: 1,
      sourceManifestSha256: sha256File(state.newManifestPath),
      regions: relativeRoot(state.regions),
      snapshot: state.snapshot,
      outputDirectory: relativeRoot(state.targetDirectory),
    });
  });

  it('fails closed when the bound source manifest bytes drift', () => {
    const state = fixture();
    fs.appendFileSync(state.oldManifestPath, '\n');

    const result = run(state.command);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      'source render binding does not match the old manifest and snapshot',
    );
    expect(fs.existsSync(state.targetDirectory)).toBe(false);
  });

  it('fails closed when the selected snapshot drifts', () => {
    const state = fixture();
    fs.appendFileSync(
      path.join(state.regions, 'r.0.0.mca'),
      'post-binding drift',
    );

    const result = run(state.command);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      'old manifest does not bind the selected snapshot',
    );
    expect(fs.existsSync(state.targetDirectory)).toBe(false);
  });

  it('fails closed when the source render binding drifts', () => {
    const state = fixture();
    const bindingPath = path.join(
      state.sourceDirectory,
      '.render-binding.json',
    );
    const binding = JSON.parse(fs.readFileSync(bindingPath, 'utf8'));
    binding.outputDirectory = `${binding.outputDirectory}-drifted`;
    writeJson(bindingPath, binding);

    const result = run(state.command);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      'source render binding does not match the old manifest and snapshot',
    );
    expect(fs.existsSync(state.targetDirectory)).toBe(false);
  });
});
