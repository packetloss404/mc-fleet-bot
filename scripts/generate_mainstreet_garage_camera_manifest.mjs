#!/usr/bin/env node
/** Generate one exact-object acceptance camera for every R4 garage. */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const reportPath = path.resolve(
  ROOT,
  process.argv[2]
    ?? 'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.report.json',
);
const outputPath = path.resolve(
  ROOT,
  process.argv[3]
    ?? 'data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/garage-camera-manifest.json',
);
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const cameras = report.garages.matrix.map((garage) => {
  const [x1, x2, z1, z2] = garage.garageBounds;
  const centerX = (x1 + x2) / 2;
  const centerZ = (z1 + z2) / 2;
  const west = garage.front === 'west';
  return {
    id: `MSA-R4-${garage.garageId}-OBJECT`,
    primaryFeatureId: `R4-GAR-${garage.buildingId}`,
    role: 'exact-object-garage-and-access-relationship',
    eye: [
      west ? x1 - 11 : x2 + 11,
      garage.floorY + 4,
      centerZ,
    ],
    lookAt: [
      west ? x1 : x2,
      garage.floorY + 2,
      centerZ,
    ],
    fov: 68,
    output: `objects/${garage.garageId.toLowerCase()}.after.png`,
  };
});
if (cameras.length !== 18) {
  throw new Error(`expected 18 garage cameras, found ${cameras.length}`);
}
const manifest = {
  schemaVersion: 1,
  id: 'mainstreet-r4-garage-exact-object-after-cameras',
  generatedAtUtc: new Date().toISOString(),
  sourceReport: path.relative(ROOT, reportPath),
  sourceOperationSha256: report.operations.sha256,
  sourceSnapshot: {
    regions: (
      report.source.snapshot.directory
      ?? 'data/worldsnap-rollbackcheck-64829086424cde6f-20260727/region'
    ),
    sha256: report.source.snapshot.sha256,
    expectedSha256: report.source.expectedSnapshotSha256,
    hashMatched: (
      report.source.snapshot.sha256 === report.source.expectedSnapshotSha256
    ),
  },
  capturePolicy: {
    renderer: 'scripts/world_render.mjs',
    width: 1280,
    height: 720,
    fieldOfView: 68,
    exactObjectRelation: true,
    postReleaseOnly: true,
  },
  cameras,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  output: path.relative(ROOT, outputPath),
  cameras: cameras.length,
  sourceOperationSha256: report.operations.sha256,
}, null, 2));
