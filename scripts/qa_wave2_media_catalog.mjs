#!/usr/bin/env node
/**
 * Independent offline QA for the Wave 2 exact-object media release.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { pathToFileURL } from 'url';
import { createCanvas, loadImage } from 'canvas';

const ROOT = process.cwd();
const EXPECTED_SNAPSHOT = (
  '4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b'
);

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const mediaDirectory = path.resolve(
  ROOT,
  value('--media', 'data/exports/redevelopment-media-wave2-2026-07-28'),
);
const catalogArgument = path.resolve(
  ROOT,
  value('--catalog', 'data/exports/world-catalog-wave2-2026-07-28'),
);
const catalogPath = fs.existsSync(catalogArgument)
  && fs.statSync(catalogArgument).isDirectory()
  ? path.join(catalogArgument, 'object-media-index.json')
  : catalogArgument;
const floorplanDirectory = path.resolve(
  ROOT,
  value(
    '--floorplans',
    'data/exports/world-catalog-wave2-2026-07-28/floorplans',
  ),
);
const reportPath = path.resolve(
  ROOT,
  value(
    '--out',
    'data/world-review/world-media-wave2-2026-07-28.qa.json',
  ),
);
const expectedSnapshot = value(
  '--expected-snapshot',
  EXPECTED_SNAPSHOT,
);

function relative(filename) {
  return path.relative(ROOT, filename);
}

function fileSha256(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function geometryBounds(geometry) {
  if (geometry?.type === 'bounds') return geometry;
  if (geometry?.type === 'point' && geometry.position) {
    const { x, y, z } = geometry.position;
    return { minX: x, maxX: x, minY: y, maxY: y, minZ: z, maxZ: z };
  }
  if (geometry?.type !== 'path' || !Array.isArray(geometry.points)) return null;
  return {
    minX: Math.min(...geometry.points.map((point) => point.x)),
    maxX: Math.max(...geometry.points.map((point) => point.x)),
    minY: Math.min(...geometry.points.map((point) => point.y)),
    maxY: Math.max(...geometry.points.map((point) => point.y)),
    minZ: Math.min(...geometry.points.map((point) => point.z)),
    maxZ: Math.max(...geometry.points.map((point) => point.z)),
  };
}

export function validateTargetAim(capture, feature) {
  const bounds = geometryBounds(feature.geometry);
  if (!bounds || !Array.isArray(capture.lookAt)) {
    return { passed: false, reason: 'missing target bounds or lookAt' };
  }
  const padding = feature.geometry.type === 'path' ? 2 : 0.01;
  const [x, y, z] = capture.lookAt;
  const inside = (
    x >= bounds.minX - padding
    && x <= bounds.maxX + padding
    && y >= bounds.minY - padding
    && y <= bounds.maxY + padding
    && z >= bounds.minZ - padding
    && z <= bounds.maxZ + padding
  );
  const distance = Math.hypot(
    capture.eye[0] - x,
    capture.eye[1] - y,
    capture.eye[2] - z,
  );
  return {
    passed: inside && distance > 2 && distance < 230,
    aimInsideTargetBounds: inside,
    distance: Number(distance.toFixed(2)),
    bounds,
  };
}

function quantizedColor(red, green, blue) {
  return `${red >> 4},${green >> 4},${blue >> 4}`;
}

export async function analyzeImage(filename) {
  const image = await loadImage(filename);
  const width = 160;
  const height = 90;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const luminances = [];
  const colors = new Map();
  const centerColors = new Map();
  let edgeSamples = 0;
  let edges = 0;
  let centerEdgeSamples = 0;
  let centerEdges = 0;
  const luminanceAt = (x, y) => {
    const offset = (y * width + x) * 4;
    return 0.2126 * pixels[offset]
      + 0.7152 * pixels[offset + 1]
      + 0.0722 * pixels[offset + 2];
  };
  const colorDistanceAt = (x1, y1, x2, y2) => {
    const first = (y1 * width + x1) * 4;
    const second = (y2 * width + x2) * 4;
    return (
      Math.abs(pixels[first] - pixels[second])
      + Math.abs(pixels[first + 1] - pixels[second + 1])
      + Math.abs(pixels[first + 2] - pixels[second + 2])
    );
  };
  // Exclude the renderer's bottom coordinate overlay from visual statistics.
  const analysisHeight = height - 4;
  for (let y = 0; y < analysisHeight; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const key = quantizedColor(
        pixels[offset],
        pixels[offset + 1],
        pixels[offset + 2],
      );
      colors.set(key, (colors.get(key) ?? 0) + 1);
      luminances.push(luminanceAt(x, y));
      const inCenter = (
        x >= width * 0.2
        && x < width * 0.8
        && y >= analysisHeight * 0.18
        && y < analysisHeight * 0.82
      );
      if (inCenter) centerColors.set(key, (centerColors.get(key) ?? 0) + 1);
      if (x + 1 < width) {
        edgeSamples += 1;
        if (colorDistanceAt(x, y, x + 1, y) > 45) edges += 1;
        if (inCenter) {
          centerEdgeSamples += 1;
          if (colorDistanceAt(x, y, x + 1, y) > 45) centerEdges += 1;
        }
      }
      if (y + 1 < analysisHeight) {
        edgeSamples += 1;
        if (colorDistanceAt(x, y, x, y + 1) > 45) edges += 1;
        if (inCenter) {
          centerEdgeSamples += 1;
          if (colorDistanceAt(x, y, x, y + 1) > 45) centerEdges += 1;
        }
      }
    }
  }
  const mean = luminances.reduce((sum, item) => sum + item, 0) / luminances.length;
  const variance = luminances.reduce(
    (sum, item) => sum + (item - mean) ** 2,
    0,
  ) / luminances.length;
  const dominant = Math.max(...colors.values()) / luminances.length;
  const centerTotal = [...centerColors.values()].reduce((sum, item) => sum + item, 0);
  const centerDominant = Math.max(...centerColors.values()) / centerTotal;
  const metrics = {
    width: image.width,
    height: image.height,
    bytes: fs.statSync(filename).size,
    sha256: fileSha256(filename),
    quantizedColorCount: colors.size,
    luminanceMean: Number(mean.toFixed(2)),
    luminanceStandardDeviation: Number(Math.sqrt(variance).toFixed(2)),
    dominantColorRatio: Number(dominant.toFixed(4)),
    centerDominantColorRatio: Number(centerDominant.toFixed(4)),
    edgeRatio: Number((edges / edgeSamples).toFixed(4)),
    centerEdgeRatio: Number((centerEdges / centerEdgeSamples).toFixed(4)),
  };
  const failures = [];
  if (metrics.bytes < 12_000) failures.push('file-under-12KB');
  if (metrics.quantizedColorCount < 24) failures.push('near-zero-color-variance');
  if (metrics.luminanceStandardDeviation < 13) {
    failures.push('near-zero-luminance-variance');
  }
  if (
    metrics.centerDominantColorRatio > 0.62
    && metrics.centerEdgeRatio < 0.035
  ) {
    failures.push('central-flat-surface-or-foreground-occlusion');
  }
  if (metrics.edgeRatio < 0.018) failures.push('near-zero-spatial-detail');
  return { ...metrics, failures, passed: failures.length === 0 };
}

function exactScreenshot(object) {
  return object.media.some((media) => (
    media.exists
    && media.type === 'screenshot'
    && media.relation === 'exact_object'
  ));
}

function exactFloorplan(object) {
  return object.media.some((media) => (
    media.exists
    && media.type === 'floorplan'
    && media.relation === 'exact_object'
  ));
}

async function main() {
  const failures = [];
  const manifestPath = path.join(mediaDirectory, 'capture-manifest.json');
  const captureReportPath = path.join(mediaDirectory, 'capture-report.json');
  const targetRegisterPath = path.join(mediaDirectory, 'target-register.json');
  for (const filename of [manifestPath, captureReportPath, targetRegisterPath]) {
    if (!fs.existsSync(filename)) failures.push(`missing:${relative(filename)}`);
  }
  if (failures.length > 0) throw new Error(failures.join('\n'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const captureReport = JSON.parse(fs.readFileSync(captureReportPath, 'utf8'));
  const targetRegister = JSON.parse(fs.readFileSync(targetRegisterPath, 'utf8'));
  const featuresPath = path.resolve(ROOT, manifest.sourceFeatures);
  const features = JSON.parse(fs.readFileSync(featuresPath, 'utf8')).features;
  const featuresByExternalId = new Map(
    features.map((feature) => [feature.externalId, feature]),
  );

  if (manifest.snapshot.sha256 !== expectedSnapshot) {
    failures.push(`manifest-snapshot:${manifest.snapshot.sha256}`);
  }
  if (captureReport.snapshot.sha256 !== expectedSnapshot) {
    failures.push(`capture-report-snapshot:${captureReport.snapshot.sha256}`);
  }
  if (captureReport.regions !== manifest.snapshot.directory) {
    failures.push('capture-report-region-directory-mismatch');
  }
  if (manifest.counts.total !== 79 || manifest.counts.buildings !== 55) {
    failures.push(`unexpected-manifest-counts:${JSON.stringify(manifest.counts)}`);
  }
  if (
    captureReport.captureCount !== manifest.counts.total
    || captureReport.captures.length !== manifest.cameras.length
  ) {
    failures.push('capture-count-mismatch');
  }
  const cameraKeys = manifest.cameras.map((capture) => JSON.stringify([
    capture.mode,
    capture.eye,
    capture.lookAt,
    capture.fov,
    capture.width,
    capture.height,
  ]));
  if (new Set(cameraKeys).size !== cameraKeys.length) failures.push('duplicate-camera');
  const outputKeys = manifest.cameras.map((capture) => capture.output);
  if (new Set(outputKeys).size !== outputKeys.length) failures.push('duplicate-output');
  const featureKeys = manifest.cameras.map((capture) => capture.primaryFeatureId);
  if (new Set(featureKeys).size !== featureKeys.length) {
    failures.push('duplicate-primary-feature-target');
  }

  const targetChecks = [];
  const imageChecks = [];
  for (const capture of manifest.cameras) {
    const feature = featuresByExternalId.get(capture.primaryFeatureId);
    if (!feature) {
      failures.push(`missing-feature:${capture.primaryFeatureId}`);
      continue;
    }
    const target = validateTargetAim(capture, feature);
    targetChecks.push({
      id: capture.id,
      primaryFeatureId: capture.primaryFeatureId,
      ...target,
    });
    if (!target.passed) failures.push(`target-not-in-view:${capture.id}`);
    const output = path.join(mediaDirectory, capture.output);
    if (!fs.existsSync(output)) {
      failures.push(`missing-image:${capture.id}`);
      continue;
    }
    const analysis = await analyzeImage(output);
    imageChecks.push({
      id: capture.id,
      primaryFeatureId: capture.primaryFeatureId,
      file: relative(output),
      ...analysis,
    });
    for (const failure of analysis.failures) {
      failures.push(`image:${capture.id}:${failure}`);
    }
  }
  const imageHashes = imageChecks.map((image) => image.sha256);
  if (new Set(imageHashes).size !== imageHashes.length) {
    failures.push('duplicate-image-hash');
  }
  for (const reported of captureReport.captures) {
    const expected = manifest.cameras.find((capture) => capture.id === reported.id);
    if (!expected) {
      failures.push(`unmanifested-report-capture:${reported.id}`);
      continue;
    }
    if (reported.primaryFeatureId !== expected.primaryFeatureId) {
      failures.push(`report-target-mismatch:${reported.id}`);
    }
    const image = imageChecks.find((candidate) => candidate.id === reported.id);
    if (!image || image.sha256 !== reported.sha256) {
      failures.push(`report-image-hash-mismatch:${reported.id}`);
    }
  }

  const floorplanManifestPath = path.join(floorplanDirectory, 'atlas-manifest.json');
  const portalPng = path.join(
    floorplanDirectory,
    'structures',
    'mainstreet-america-c01-public-portal-recessed-phase2.png',
  );
  const portalPdf = path.join(
    floorplanDirectory,
    'c01-recessed-public-portal-floorplan.pdf',
  );
  const floorplanChecks = {
    manifest: relative(floorplanManifestPath),
    portalPng: relative(portalPng),
    portalPdf: relative(portalPdf),
    passed: false,
  };
  if (![floorplanManifestPath, portalPng, portalPdf].every(fs.existsSync)) {
    failures.push('portal-floorplan-artifact-missing');
  } else {
    const floorplanManifest = JSON.parse(
      fs.readFileSync(floorplanManifestPath, 'utf8'),
    );
    const supplement = floorplanManifest.supplement;
    const portalImage = await analyzeImage(portalPng);
    floorplanChecks.passed = (
      supplement?.externalId === 'C01-PUBLIC-PORTAL-RECESSED-PHASE2'
      && supplement?.snapshot?.sha256 === expectedSnapshot
      && floorplanManifest.exactBuildingFloorplans === 69
      && floorplanManifest.verification?.perArtifactProvenance === true
      && portalImage.passed
      && fs.statSync(portalPdf).size > 20_000
    );
    floorplanChecks.portalImage = portalImage;
    floorplanChecks.manifestSnapshotMode = floorplanManifest.snapshot?.mode;
    floorplanChecks.perArtifactProvenance = (
      floorplanManifest.verification?.perArtifactProvenance
    );
    if (!floorplanChecks.passed) failures.push('portal-floorplan-validation');
  }

  const catalogChecks = {
    path: relative(catalogPath),
    passed: false,
  };
  if (!fs.existsSync(catalogPath)) {
    failures.push(`missing-catalog:${relative(catalogPath)}`);
  } else {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const buildings = catalog.objects.filter((object) => object.kind === 'building');
    const exactBuildingScreenshots = buildings.filter(exactScreenshot).length;
    const exactBuildingFloorplans = buildings.filter(exactFloorplan).length;
    const exactTargets = new Map(
      catalog.objects.map((object) => [object.externalId, object]),
    );
    let exactLinkedWave2Targets = 0;
    for (const capture of manifest.cameras) {
      const object = exactTargets.get(capture.primaryFeatureId);
      const expectedOutput = relative(path.join(mediaDirectory, capture.output));
      const link = object?.media.find((media) => (
        media.path === expectedOutput
        && media.type === 'screenshot'
        && media.relation === 'exact_object'
        && media.matchMethod === 'capture-report.primaryFeatureId'
        && media.sourceSnapshot?.sha256 === expectedSnapshot
      ));
      if (link) exactLinkedWave2Targets += 1;
      else failures.push(`missing-exact-catalog-link:${capture.primaryFeatureId}`);
    }
    Object.assign(catalogChecks, {
      snapshot: catalog.snapshot,
      features: catalog.coverage.features,
      buildings: buildings.length,
      exactBuildingScreenshots,
      exactBuildingFloorplans,
      exactLinkedWave2Targets,
      remainingBuildingScreenshotQueue: buildings
        .filter((object) => !exactScreenshot(object))
        .map((object) => object.externalId),
      remainingBuildingFloorplanQueue: buildings
        .filter((object) => !exactFloorplan(object))
        .map((object) => object.externalId),
    });
    catalogChecks.passed = (
      catalog.snapshot.sha256 === expectedSnapshot
      && exactBuildingScreenshots === 69
      && exactBuildingFloorplans === 69
      && exactLinkedWave2Targets === 79
      && catalogChecks.remainingBuildingScreenshotQueue.length === 0
      && catalogChecks.remainingBuildingFloorplanQueue.length === 0
    );
    if (!catalogChecks.passed) failures.push('catalog-coverage-validation');
  }

  if (
    targetRegister.expectedCoverageAfterCatalog.buildingExactScreenshotGap !== 0
    || targetRegister.expectedCoverageAfterCatalog.buildingExactFloorplanGap !== 0
  ) {
    failures.push('target-register-expected-gap-not-zero');
  }
  const report = {
    schemaVersion: 1,
    generatedAtUtc: new Date().toISOString(),
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    passed: failures.length === 0,
    liveWorldMutated: false,
    snapshot: captureReport.snapshot,
    counts: {
      manifestCaptures: manifest.cameras.length,
      reportCaptures: captureReport.captures.length,
      uniqueCameras: new Set(cameraKeys).size,
      uniqueOutputs: new Set(outputKeys).size,
      uniqueImageHashes: new Set(imageHashes).size,
      visibleTargetAims: targetChecks.filter((check) => check.passed).length,
      visuallyPassingImages: imageChecks.filter((check) => check.passed).length,
    },
    targetChecks,
    imageChecks,
    floorplanChecks,
    catalogChecks,
    remainingQueue: {
      buildingScreenshots: catalogChecks.remainingBuildingScreenshotQueue ?? null,
      buildingFloorplans: catalogChecks.remainingBuildingFloorplanQueue ?? null,
      allDatabaseFeaturesWithoutExactScreenshot: fs.existsSync(catalogPath)
        ? JSON.parse(fs.readFileSync(catalogPath, 'utf8')).objects
            .filter((object) => !exactScreenshot(object))
            .map((object) => ({
              externalId: object.externalId,
              projectId: object.projectId,
              kind: object.kind,
              name: object.name,
            }))
        : null,
    },
    failures,
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    status: report.status,
    report: relative(reportPath),
    counts: report.counts,
    floorplan: report.floorplanChecks.passed,
    catalog: report.catalogChecks.passed,
    failures: failures.slice(0, 25),
  }, null, 2));
  if (!report.passed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
