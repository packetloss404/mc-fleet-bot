#!/usr/bin/env node
/**
 * Generate Westlight's 8-sector × 3-band × 2-mode sightline evidence matrix.
 *
 * By default this writes the camera manifest without rendering. Pass --render
 * after a successful live release and point --regions at the immutable
 * post-release snapshot to create all 48 PNGs and attach their hashes.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const regions = path.resolve(
  ROOT,
  value('--regions', 'data/worldsnap-redevelopment-c9e2bf0a-20260727/region'),
);
const outputDir = path.resolve(
  ROOT,
  value('--out', 'data/exports/redevelopment-qa-2026-07-27/westlight/sightlines'),
);
const manifestPath = path.resolve(
  ROOT,
  value('--manifest', path.join(outputDir, 'manifest.json')),
);
const render = args.includes('--render');
const CENTER_X = -360;
const CENTER_Z = -560;
const width = Number(value('--width', '1280'));
const height = Number(value('--height', '720'));
const fov = Number(value('--fov', '75'));
const distance = Number(value('--distance', '110'));
const sectors = [
  ['east', 0],
  ['southeast', 45],
  ['south', 90],
  ['southwest', 135],
  ['west', 180],
  ['northwest', 225],
  ['north', 270],
  ['northeast', 315],
];
const bands = [
  { id: 'lower', radiusX: 30, eyeY: 68 },
  { id: 'middle', radiusX: 42, eyeY: 74 },
  { id: 'upper', radiusX: 56, eyeY: 81 },
];
const modes = [
  { id: 'sports', look: [CENTER_X, 64, CENTER_Z] },
  { id: 'concert', look: [CENTER_X, 64, CENTER_Z - 24] },
];

if (!fs.existsSync(regions)) throw new Error(`regions not found: ${regions}`);
if (![width, height, fov, distance].every(Number.isFinite)) {
  throw new Error('invalid numeric rendering option');
}

function snapshotHash(directory) {
  const hash = crypto.createHash('sha256');
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  for (const filename of files) {
    hash.update(filename);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(directory, filename)));
    hash.update('\0');
  }
  return { sha256: hash.digest('hex'), regionFileCount: files.length };
}

function fileHash(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

const snapshot = snapshotHash(regions);
const views = [];
for (const [sector, degrees] of sectors) {
  const angle = degrees * Math.PI / 180;
  for (const band of bands) {
    const radiusZ = band.radiusX - 8;
    const eye = [
      CENTER_X + Math.round(band.radiusX * Math.cos(angle)),
      band.eyeY,
      CENTER_Z + Math.round(radiusZ * Math.sin(angle)),
    ];
    for (const mode of modes) {
      const id = `${sector}-${band.id}-${mode.id}`;
      const out = path.join(outputDir, `${id}.png`);
      const commandArgs = [
        'scripts/world_render.mjs',
        '--regions', regions,
        '--mode', 'persp',
        `--eye=${eye.join(',')}`,
        `--look=${mode.look.join(',')}`,
        `--dist=${distance}`,
        `--w=${width}`,
        `--h=${height}`,
        `--fov=${fov}`,
        '--shadows=true',
        `--out=${out}`,
      ];
      views.push({
        id,
        sector,
        band: band.id,
        mode: mode.id,
        eye,
        look: mode.look,
        output: path.relative(ROOT, out),
        command: `node ${commandArgs.map((entry) => (
          entry.includes(' ') ? JSON.stringify(entry) : entry
        )).join(' ')}`,
        artifact: null,
      });
    }
  }
}

if (views.length !== 48) throw new Error(`expected 48 views, got ${views.length}`);
if (render) {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const [index, view] of views.entries()) {
    const out = path.resolve(ROOT, view.output);
    const commandArgs = [
      'scripts/world_render.mjs',
      '--regions', regions,
      '--mode', 'persp',
      `--eye=${view.eye.join(',')}`,
      `--look=${view.look.join(',')}`,
      `--dist=${distance}`,
      `--w=${width}`,
      `--h=${height}`,
      `--fov=${fov}`,
      '--shadows=true',
      `--out=${out}`,
    ];
    const result = spawnSync(process.execPath, commandArgs, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    });
    if (result.status !== 0) {
      process.stderr.write(result.stdout);
      process.stderr.write(result.stderr);
      throw new Error(`render failed for ${view.id}`);
    }
    const bytes = fs.statSync(out).size;
    if (bytes < 20_000) throw new Error(`suspicious render ${view.id}: ${bytes} bytes`);
    view.artifact = {
      bytes,
      sha256: fileHash(out),
      dimensions: { width, height },
    };
    process.stdout.write(`[${index + 1}/48] ${view.id} ${bytes} bytes\n`);
  }
}

const manifest = {
  schemaVersion: 1,
  id: 'westlight-sightline-matrix-2026-07-27',
  generatedAtUtc: new Date().toISOString(),
  status: render ? 'rendered-awaiting-visual-acceptance' : 'camera-plan',
  snapshot: {
    regions: path.relative(ROOT, regions),
    ...snapshot,
  },
  venue: {
    projectId: 'westlight-venue',
    featureId: 'WL-BOWL',
    displayFeatureId: 'WL-INFINITY-SCREEN',
    center: [CENTER_X, 77, CENTER_Z],
  },
  matrix: {
    sectors: sectors.map(([id]) => id),
    bands: bands.map(({ id }) => id),
    modes: modes.map(({ id }) => id),
    expectedViews: 48,
    actualViews: views.length,
    renderedViews: views.filter((view) => view.artifact).length,
  },
  camera: { width, height, fov, distance, shadows: true },
  reviewFields: [
    'display face visible',
    'field or stage focal area visible',
    'critical action area unobstructed',
    'canopy clear',
    'aisle and vomitory clear',
    'reviewer note',
  ],
  views,
};
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  manifest: path.relative(ROOT, manifestPath),
  status: manifest.status,
  snapshot: snapshot.sha256,
  views: views.length,
  rendered: manifest.matrix.renderedViews,
}, null, 2));

