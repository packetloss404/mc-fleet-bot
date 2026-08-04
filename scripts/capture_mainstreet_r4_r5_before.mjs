#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';
import { hashSnapshotDirectory } from './generate_mainstreet_redevelopment_r4_r5.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const value = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const relative = (filename) => path.relative(ROOT, filename).replaceAll(path.sep, '/');
const sha256File = (filename) => createHash('sha256')
  .update(fs.readFileSync(filename))
  .digest('hex');

const regionDir = path.resolve(
  ROOT,
  value(
    '--regions',
    'data/worldsnap-rollbackcheck-64829086424cde6f-20260727/region',
  ),
);
const expectedSnapshotSha256 = value(
  '--expected-snapshot-sha256',
  '64829086424cde6f0bbf8db9166a152daf753ae2c3cf5652ba165dddc8229142',
);
const outputRoot = path.resolve(
  ROOT,
  value(
    '--out',
    'data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe',
  ),
);
const beforeDir = path.join(outputRoot, 'before');
const afterDir = path.join(outputRoot, 'after');
const manifestPath = path.join(outputRoot, 'same-camera-manifest.json');
const width = 1024;
const height = 576;
const fieldOfView = 68;

const cameras = [
  {
    id: 'MSA-R4R5-DISTRICT-MAP',
    role: 'district-overview-map',
    mode: 'map',
    center: [-20, -100],
    span: 400,
    featureTargets: [
      'SITE',
      'R01',
      'R02',
      'R03',
      'R4-ALLEY-W',
      'R4-ALLEY-E',
      'B02',
      'B03',
    ],
  },
  {
    id: 'MSA-R4R5-DISTRICT-OBLIQUE',
    role: 'district-overview-perspective',
    mode: 'persp',
    eye: [140, 150, 95],
    lookAt: [-10, 65, -85],
    distance: 330,
    fieldOfView: 72,
    featureTargets: ['SITE', 'R01', 'R02', 'R03', 'R4-ALLEY-W', 'R4-ALLEY-E'],
  },
  {
    id: 'MSA-R4R5-ALLEY-W-LONG',
    role: 'west-rear-alley-longitudinal',
    mode: 'persp',
    eye: [-82, 112, 88],
    lookAt: [-59, 65, -90],
    distance: 330,
    fieldOfView: 58,
    featureTargets: [
      'R4-ALLEY-W',
      'R4-GAR-H01',
      'R4-GAR-H02',
      'R4-GAR-H03',
      'R4-GAR-H04',
      'R4-GAR-H05',
      'R4-GAR-H06',
    ],
  },
  {
    id: 'MSA-R4R5-ALLEY-E-LONG',
    role: 'east-rear-alley-longitudinal',
    mode: 'persp',
    eye: [85, 118, 88],
    lookAt: [59, 72, -90],
    distance: 330,
    fieldOfView: 58,
    featureTargets: [
      'R4-ALLEY-E',
      'R4-GAR-H07',
      'R4-GAR-H08',
      'R4-GAR-H09',
      'R4-GAR-H10',
      'R4-GAR-H11',
      'R4-GAR-H12',
    ],
  },
  {
    id: 'MSA-R4R5-H03-REAR-RELATION',
    role: 'representative-west-house-garage-relationship',
    mode: 'persp',
    eye: [-90, 84, -15],
    lookAt: [-42, 66, -48],
    distance: 150,
    fieldOfView: 60,
    featureTargets: ['H03', 'R4-GAR-H03', 'R4-ALLEY-W'],
  },
  {
    id: 'MSA-R4R5-H09-REAR-RELATION',
    role: 'representative-east-house-garage-relationship',
    mode: 'persp',
    eye: [92, 105, -90],
    lookAt: [43, 74, -50],
    distance: 170,
    fieldOfView: 60,
    featureTargets: ['H09', 'R4-GAR-H09', 'R4-ALLEY-E'],
  },
  {
    id: 'MSA-R4R5-B02-CULINARY',
    role: 'culinary-forecourt-and-pylon-context',
    mode: 'persp',
    eye: [-62, 80, -95],
    lookAt: [-105, 65, -95],
    distance: 150,
    fieldOfView: 64,
    featureTargets: [
      'B02',
      'R5-B02-CULINARY-FORECOURT',
      'R5-B02-CULINARY-PYLONS',
      'R4-WF-R02-B02-GATE',
    ],
  },
  {
    id: 'MSA-R4R5-B03-SERVICE',
    role: 'service-lane-screen-and-pylon-context',
    mode: 'persp',
    eye: [68, 90, -188],
    lookAt: [0, 65, -245],
    distance: 180,
    fieldOfView: 66,
    featureTargets: [
      'B03',
      'R5-B03-SERVICE-LANE',
      'R5-B03-SERVICE-SCREEN',
      'R5-B03-SERVICE-PYLONS',
    ],
  },
  {
    id: 'MSA-R4R5-R07-CONNECTIONS',
    role: 'south-public-road-and-both-alley-connections',
    mode: 'persp',
    eye: [0, 110, -165],
    lookAt: [0, 64, -218],
    distance: 200,
    fieldOfView: 75,
    featureTargets: [
      'R07',
      'R4-ALLEY-W',
      'R4-ALLEY-E',
      'R4-WF-R01-R07-B03',
      'R4-WF-R02-R07',
      'R4-WF-R03-R07',
    ],
  },
  {
    id: 'MSA-R4R5-CENTRAL-CONNECTIONS',
    role: 'R05-R06-and-main-street-wayfinding-context',
    mode: 'persp',
    eye: [0, 120, 70],
    lookAt: [-5, 64, -50],
    distance: 230,
    fieldOfView: 75,
    featureTargets: [
      'R01',
      'R05',
      'R06',
      'R4-ALLEY-W',
      'R4-ALLEY-E',
      'R4-WF-R01-R05',
      'R4-WF-R01-R06-B02',
    ],
  },
];

async function imageEvidence(filename) {
  const image = await loadImage(filename);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, image.width, image.height).data;
  const colors = new Set();
  let samples = 0;
  let mean = 0;
  let squareDelta = 0;
  for (let pixel = 0; pixel < pixels.length; pixel += 64) {
    const red = pixels[pixel];
    const green = pixels[pixel + 1];
    const blue = pixels[pixel + 2];
    colors.add(`${red},${green},${blue}`);
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    samples += 1;
    const delta = luminance - mean;
    mean += delta / samples;
    squareDelta += delta * (luminance - mean);
  }
  const luminanceStandardDeviation = Math.sqrt(squareDelta / Math.max(1, samples - 1));
  const bytes = fs.statSync(filename).size;
  return {
    file: relative(filename),
    sha256: sha256File(filename),
    bytes,
    width: image.width,
    height: image.height,
    sampledUniqueColors: colors.size,
    luminanceStandardDeviation: Number(luminanceStandardDeviation.toFixed(3)),
    nonblank: (
      bytes > 20_000
      && colors.size > 20
      && luminanceStandardDeviation > 5
    ),
  };
}

const snapshotEvidence = hashSnapshotDirectory(regionDir);
const observedSnapshotSha256 = snapshotEvidence.sha256;
if (observedSnapshotSha256 !== expectedSnapshotSha256) {
  throw new Error(
    `snapshot hash mismatch: expected ${expectedSnapshotSha256}, `
    + `observed ${observedSnapshotSha256}`,
  );
}
fs.mkdirSync(beforeDir, { recursive: true });
fs.mkdirSync(afterDir, { recursive: true });

const captures = [];
for (const camera of cameras) {
  const stem = camera.id.toLowerCase();
  const beforePath = path.join(beforeDir, `${stem}.before.png`);
  const afterPath = path.join(afterDir, `${stem}.after.png`);
  const rendererArgs = [
    path.join(ROOT, 'scripts', 'world_render.mjs'),
    '--regions',
    regionDir,
    '--mode',
    camera.mode,
    '--out',
    beforePath,
  ];
  if (camera.mode === 'map') {
    rendererArgs.push(
      '--center',
      camera.center.join(','),
      '--span',
      String(camera.span),
      '--scale',
      '3',
    );
  } else {
    rendererArgs.push(
      '--eye',
      camera.eye.join(','),
      '--look',
      camera.lookAt.join(','),
      '--dist',
      String(camera.distance),
      '--w',
      String(width),
      '--h',
      String(height),
      '--fov',
      String(camera.fieldOfView ?? fieldOfView),
      '--shadows',
      'true',
    );
  }
  const rendered = spawnSync(process.execPath, rendererArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (rendered.status !== 0) {
    process.stderr.write(rendered.stderr);
    throw new Error(`${camera.id} renderer exited ${rendered.status}`);
  }
  const artifact = await imageEvidence(beforePath);
  if (!artifact.nonblank) {
    throw new Error(`${camera.id} failed nonblank visual evidence checks`);
  }
  const raysHit = Number(
    rendered.stderr.match(/rays hit=(\d+)/)?.[1] ?? 0,
  );
  const chunksLoaded = Number(
    rendered.stderr.match(/chunks loaded=(\d+)/)?.[1] ?? 0,
  );
  if (chunksLoaded === 0 || (camera.mode === 'persp' && raysHit === 0)) {
    throw new Error(`${camera.id} did not render copied-world geometry`);
  }
  captures.push({
    ...camera,
    width: camera.mode === 'map' ? camera.span * 3 : width,
    height: camera.mode === 'map' ? camera.span * 3 : height,
    sameCameraKey: createHash('sha256')
      .update(JSON.stringify(camera))
      .digest('hex'),
    relation: 'before',
    beforeArtifact: artifact,
    afterRequired: {
      file: relative(afterPath),
      status: 'pending-authorized-implementation-and-post-snapshot',
      mustReuseSameCameraKey: true,
      mustReuseLighting: true,
    },
    rendererEvidence: {
      chunksLoaded,
      raysHit: camera.mode === 'persp' ? raysHit : null,
    },
  });
  process.stdout.write(`${camera.id}: ${artifact.file}\n`);
}

const manifest = {
  schemaVersion: 1,
  id: 'mainstreet-r4-r5-same-camera-before-after',
  generatedAtUtc: new Date().toISOString(),
  baseline: {
    regions: relative(regionDir),
    expectedSha256: expectedSnapshotSha256,
    observedSha256: observedSnapshotSha256,
    hashMatched: true,
    immutable: true,
    algorithm: snapshotEvidence.algorithm,
    regionFileCount: snapshotEvidence.regionFileCount,
  },
  package: {
    plan: 'docs/mainstreet-america/planning/redevelopment-r4-r5.yaml',
    report: 'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.report.json',
    sourceOperationSha256: (
      JSON.parse(fs.readFileSync(
        path.join(
          ROOT,
          'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.report.json',
        ),
        'utf8',
      )).operations.sha256
    ),
    databaseFeatureSource: 'report.databaseFeatures',
  },
  capturePolicy: {
    renderer: 'scripts/world_render.mjs',
    sameCameraAfterRequired: true,
    sameLightingAfterRequired: true,
    objectRelationRequired: true,
    beforeCaptured: captures.length,
    afterPending: captures.length,
    acceptance: {
      imageBytesMinimum: 20_000,
      sampledUniqueColorsMinimum: 20,
      luminanceStandardDeviationMinimumExclusive: 5,
      copiedWorldChunksLoadedMinimum: 1,
      perspectiveRayHitsMinimum: 1,
    },
  },
  captures,
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${relative(manifestPath)}: ${captures.length} before captures\n`);
