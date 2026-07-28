import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import {
  hashSnapshot,
  selectTargets,
} from '../../scripts/generate_wave2_media_release.mjs';
import { validateTargetAim } from '../../scripts/qa_wave2_media_catalog.mjs';

const ROOT = path.resolve(__dirname, '../..');
const SNAPSHOT = path.join(
  ROOT,
  'data/worldsnap-wave2-baseline-4fca1ff3-20260728/region',
);
const SNAPSHOT_SHA256 =
  '4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b';
const SOURCE = path.join(
  ROOT,
  'data/exports/world-catalog-post-2026-07-27',
);
const MEDIA = path.join(
  ROOT,
  'data/exports/redevelopment-media-wave2-2026-07-28',
);
const CATALOG = path.join(
  ROOT,
  'data/exports/world-catalog-wave2-2026-07-28',
);

interface Geometry {
  type: 'bounds' | 'path' | 'point';
  minX?: number;
  minY?: number;
  minZ?: number;
  maxX?: number;
  maxY?: number;
  maxZ?: number;
  points?: Array<{ x: number; y: number; z: number }>;
  position?: { x: number; y: number; z: number };
}

interface Feature {
  id: string;
  externalId: string;
  geometry: Geometry;
}

interface Capture {
  id: string;
  primaryFeatureId: string;
  mode: string;
  eye: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
  width: number;
  height: number;
  output: string;
}

function readJson(filename: string) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

describe('Wave 2 exact-object media release', () => {
  it('is pinned to the immutable 26-region Wave 2 snapshot', () => {
    expect(hashSnapshot(SNAPSHOT)).toMatchObject({
      sha256: SNAPSHOT_SHA256,
      regionFileCount: 26,
      bytes: 122_744_700,
    });
  });

  it('selects the 55 unpictured buildings and 24 physical circulation paths', () => {
    const sourceCatalog = readJson(path.join(SOURCE, 'object-media-index.json'));
    const features = readJson(path.join(SOURCE, 'features.json')).features;
    const selected = selectTargets(sourceCatalog, features);
    const targetIds = [
      ...selected.missingBuildings,
      ...selected.circulation,
    ].map((feature: Feature) => feature.externalId);

    expect(selected.missingBuildings).toHaveLength(55);
    expect(selected.circulation).toHaveLength(24);
    expect(new Set(targetIds).size).toBe(79);
    expect(targetIds.some((externalId) => externalId.startsWith('GATE-A01-')))
      .toBe(false);
  });

  it('publishes 79 unique, target-valid captures with passing image QA', () => {
    const manifest = readJson(path.join(MEDIA, 'capture-manifest.json'));
    const features: Feature[] = readJson(
      path.join(ROOT, manifest.sourceFeatures),
    ).features;
    const featuresByExternalId = new Map(
      features.map((feature) => [feature.externalId, feature]),
    );
    const captures: Capture[] = manifest.cameras;
    const cameraKeys = captures.map((capture) => JSON.stringify([
      capture.mode,
      capture.eye,
      capture.lookAt,
      capture.fov,
      capture.width,
      capture.height,
    ]));
    const qa = readJson(
      path.join(ROOT, 'data/world-review/world-media-wave2-2026-07-28.qa.json'),
    );

    expect(manifest.snapshot.sha256).toBe(SNAPSHOT_SHA256);
    expect(manifest.counts).toMatchObject({
      buildings: 55,
      circulation: 24,
      total: 79,
    });
    expect(new Set(cameraKeys).size).toBe(79);
    expect(new Set(captures.map((capture) => capture.output)).size).toBe(79);
    expect(captures.every((capture) => {
      const feature = featuresByExternalId.get(capture.primaryFeatureId);
      return feature && validateTargetAim(capture, feature).passed;
    })).toBe(true);
    expect(qa).toMatchObject({
      status: 'PASS',
      passed: true,
      counts: {
        manifestCaptures: 79,
        reportCaptures: 79,
        uniqueCameras: 79,
        uniqueOutputs: 79,
        uniqueImageHashes: 79,
        visibleTargetAims: 79,
        visuallyPassingImages: 79,
      },
      failures: [],
    });
  });

  it('closes both building-media gaps with honest per-artifact provenance', () => {
    const atlas = readJson(path.join(CATALOG, 'floorplans/atlas-manifest.json'));
    const catalog = readJson(path.join(CATALOG, 'object-media-index.json'));
    const buildings = catalog.objects.filter(
      (object: { kind: string }) => object.kind === 'building',
    );
    const exactScreenshot = (object: {
      media: Array<{ type: string; relation: string; exists: boolean }>;
    }) => object.media.some((media) => (
      media.type === 'screenshot'
      && media.relation === 'exact_object'
      && media.exists
    ));
    const exactFloorplan = (object: {
      media: Array<{ type: string; relation: string; exists: boolean }>;
    }) => object.media.some((media) => (
      media.type === 'floorplan'
      && media.relation === 'exact_object'
      && media.exists
    ));

    expect(catalog.snapshot.sha256).toBe(SNAPSHOT_SHA256);
    expect(buildings).toHaveLength(69);
    expect(buildings.filter(exactScreenshot)).toHaveLength(69);
    expect(buildings.filter(exactFloorplan)).toHaveLength(69);
    expect(atlas).toMatchObject({
      exactBuildingFloorplans: 69,
      supplement: {
        externalId: 'C01-PUBLIC-PORTAL-RECESSED-PHASE2',
        snapshot: { sha256: SNAPSHOT_SHA256 },
      },
      verification: {
        perArtifactProvenance: true,
      },
    });
  });
});
