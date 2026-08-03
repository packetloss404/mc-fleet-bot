import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WorldFeatureStore } from '../../src/world/WorldFeatureStore';

describe('WorldFeatureStore', () => {
  let dir: string;
  let dbPath: string;
  let store: WorldFeatureStore;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'world-feature-store-'));
    dbPath = path.join(dir, 'world-map.db');
    store = new WorldFeatureStore(dbPath);
  });

  afterEach(() => {
    store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('stores different feature geometries and queries by spatial overlap', () => {
    const house = store.createFeature({
      projectId: 'mainstreet-america',
      externalId: 'H01',
      name: 'The Alexandria',
      kind: 'building',
      status: 'complete',
      source: 'manifest',
      geometry: {
        type: 'bounds',
        minX: -52,
        maxX: -16,
        minZ: 44,
        maxZ: 66,
        minY: 64,
        maxY: 80,
      },
    });
    store.createFeature({
      projectId: 'mainstreet-america',
      externalId: 'main-road',
      name: 'Main Street',
      kind: 'road',
      status: 'complete',
      source: 'region_scan',
      geometry: {
        type: 'path',
        width: 9,
        points: [
          { x: 0, y: 64, z: 200 },
          { x: 0, y: 64, z: -235 },
        ],
      },
    });

    expect(store.getFeature(house.id)?.name).toBe('The Alexandria');
    expect(store.listFeatures({
      projectId: 'mainstreet-america',
      bounds: { minX: -60, maxX: -10, minZ: 40, maxZ: 70 },
    }).map((feature) => feature.externalId)).toEqual(['H01']);
    expect(store.listFeatures({ kind: 'road' })).toHaveLength(1);
  });

  it('idempotently upserts manifest records by project and external id', () => {
    const first = store.upsertFeature({
      projectId: 'mainstreet-america',
      externalId: 'warehouse',
      name: 'Service Warehouse',
      kind: 'building',
      status: 'partial',
      source: 'manifest',
      geometry: { type: 'bounds', minX: -24, maxX: 23, minZ: -278, maxZ: -232 },
    });
    const second = store.upsertFeature({
      projectId: 'mainstreet-america',
      externalId: 'warehouse',
      name: 'Service Warehouse',
      kind: 'building',
      status: 'complete',
      source: 'region_scan',
      geometry: { type: 'bounds', minX: -24, maxX: 23, minZ: -278, maxZ: -232 },
    });

    expect(second.id).toBe(first.id);
    expect(second.status).toBe('complete');
    expect(second.revision).toBe(2);
    expect(store.listFeatures({ projectId: 'mainstreet-america' })).toHaveLength(1);
  });

  it('rolls back a bulk import when any manifest row is invalid', () => {
    expect(() => store.importFeatures([
      {
        projectId: 'mainstreet-america',
        externalId: 'valid-first-row',
        name: 'Valid Building',
        kind: 'building',
        geometry: { type: 'point', position: { x: 0, y: 64, z: 0 } },
      },
      {
        projectId: 'mainstreet-america',
        externalId: 'invalid-second-row',
        name: '',
        kind: 'building',
        geometry: { type: 'point', position: { x: 1, y: 64, z: 1 } },
      },
    ])).toThrow('name is required');

    expect(store.listFeatures({ projectId: 'mainstreet-america' })).toHaveLength(0);
  });

  it('records scan observations and promotes condition fields onto the feature', () => {
    const fence = store.createFeature({
      projectId: 'mainstreet-america',
      externalId: 'property-fence',
      name: 'White Picket Fence',
      kind: 'fence',
      status: 'planned',
      source: 'manifest',
      geometry: {
        type: 'path',
        width: 1,
        points: [
          { x: -150, y: 64, z: -300 },
          { x: 150, y: 64, z: -300 },
        ],
      },
    });
    const scan = store.createScan({
      projectId: 'mainstreet-america',
      method: 'region_snapshot',
      snapshotRef: 'data/worldsnap/region',
    });

    const observation = store.recordObservation({
      scanId: scan.id,
      featureId: fence.id,
      status: 'partial',
      completionRatio: 0.4,
      conditionScore: 75,
      expectedBlocks: 300,
      observedBlocks: 120,
      details: { missingRuns: 2 },
    });
    const updated = store.getFeature(fence.id)!;

    expect(observation.observedBlocks).toBe(120);
    expect(updated.status).toBe('partial');
    expect(updated.completionRatio).toBe(0.4);
    expect(updated.conditionScore).toBe(75);
    expect(updated.observedAt).toBeTypeOf('number');
    expect(store.getFeatureObservations(fence.id)).toHaveLength(1);

    store.completeScan(scan.id, { summary: { partial: 1 } });
    expect(() => store.recordObservation({
      scanId: scan.id,
      featureId: fence.id,
      status: 'complete',
    })).toThrow('scan is already complete');
  });

  it('persists catalog rows across reopen', () => {
    const feature = store.createFeature({
      projectId: 'mainstreet-america',
      name: 'Guest Center',
      kind: 'building',
      status: 'complete',
      geometry: { type: 'bounds', minX: -72, maxX: 72, minZ: 90, maxZ: 165 },
    });
    store.close();

    store = new WorldFeatureStore(dbPath);
    expect(store.getFeature(feature.id)?.name).toBe('Guest Center');
  });

  it('rejects observations across project boundaries', () => {
    const feature = store.createFeature({
      projectId: 'other-project',
      name: 'Other Building',
      kind: 'building',
      geometry: { type: 'point', position: { x: 0, y: 64, z: 0 } },
    });
    const scan = store.createScan({
      projectId: 'mainstreet-america',
      method: 'manual',
    });

    expect(() => store.recordObservation({
      scanId: scan.id,
      featureId: feature.id,
    })).toThrow('same project and world');
  });
});
