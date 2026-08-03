#!/usr/bin/env node
/**
 * Generate the exact same-camera before/after contract for the Raven Rock S1
 * standard-section pilot. Camera coordinates are transcribed from the rendered
 * baseline image overlays and bound to the current guarded operation hash.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const OPERATION = path.join(
  ROOT,
  'data/buildops/ravenrock-s1-section-pilot-2026-07-27.txt',
);
const REPORT = path.join(
  ROOT,
  'data/buildops/ravenrock-s1-section-pilot-2026-07-27.report.json',
);
const OUTPUT = path.join(
  ROOT,
  'data/exports/redevelopment-qa-2026-07-27/ravenrock/camera-manifest.json',
);
for (const filename of [OPERATION, REPORT]) {
  if (!fs.existsSync(filename)) throw new Error(`missing source artifact: ${filename}`);
}

const operationSha256 = crypto
  .createHash('sha256')
  .update(fs.readFileSync(OPERATION))
  .digest('hex');
const reportSha256 = crypto
  .createHash('sha256')
  .update(fs.readFileSync(REPORT))
  .digest('hex');
const manifest = {
  schemaVersion: 1,
  id: 'ravenrock-s1-same-camera-before-after',
  generatedAtUtc: new Date().toISOString(),
  packageId: 'INF-RR-01',
  sourceOperation: path.relative(ROOT, OPERATION),
  sourceOperationSha256: operationSha256,
  sourceReport: path.relative(ROOT, REPORT),
  sourceReportSha256: reportSha256,
  capturePolicy: {
    renderer: 'scripts/world_render.mjs',
    width: 1280,
    height: 720,
    fieldOfView: 72,
    sameCameraBeforeAfter: true,
    exactObjectRelation: true,
  },
  baselineEvidence: [
    {
      relation: 'before',
      file: 'data/exports/redevelopment-qa-2026-07-27/ravenrock/before/s1-west-to-east.png',
      cameraId: 'RR-S1-WEST-TO-EAST',
    },
    {
      relation: 'before',
      file: 'data/exports/redevelopment-qa-2026-07-27/ravenrock/before/s1-east-to-west.png',
      cameraId: 'RR-S1-EAST-TO-WEST',
    },
  ],
  cameras: [
    {
      id: 'RR-S1-WEST-TO-EAST',
      primaryFeatureId: 'RR-S1-STANDARD-PILOT',
      role: 'same-camera-west-to-east-section-and-route-proof',
      mode: 'persp',
      eye: [134, -7, -14],
      lookAt: [147, -7, -14],
      fov: 72,
      output: 's1-west-to-east.png',
    },
    {
      id: 'RR-S1-EAST-TO-WEST',
      primaryFeatureId: 'RR-S1-STANDARD-PILOT',
      role: 'same-camera-east-to-west-section-and-route-proof',
      mode: 'persp',
      eye: [152, -7, -14],
      lookAt: [139, -7, -14],
      fov: 72,
      output: 's1-east-to-west.png',
    },
  ],
};

for (const evidence of manifest.baselineEvidence) {
  const filename = path.join(ROOT, evidence.file);
  if (!fs.existsSync(filename) || fs.statSync(filename).size < 8_000) {
    throw new Error(`baseline camera evidence missing or undersized: ${evidence.file}`);
  }
  evidence.bytes = fs.statSync(filename).size;
  evidence.sha256 = crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  output: path.relative(ROOT, OUTPUT),
  operationSha256,
  reportSha256,
  cameras: manifest.cameras.length,
}, null, 2));
