#!/usr/bin/env node
/**
 * Persist the final Anvil-snapshot interior census as first-class scans and
 * feature observations in world-map.db.
 *
 * Idempotency is keyed by project, snapshot hash, and auditor name.
 */
import fs from 'fs';
import path from 'path';
import process from 'process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { WorldFeatureStore } = require('../dist/world/WorldFeatureStore');

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const censusPath = value(
  '--census',
  'data/world-review/worldwide-interior-final-census-2026-07-27.json',
);
const dbPath = value('--db', 'data/world-map.db');
const output = value(
  '--out',
  'data/world-review/worldwide-interior-final-database-scan-2026-07-27.json',
);

const census = JSON.parse(fs.readFileSync(censusPath, 'utf8'));
const register = JSON.parse(fs.readFileSync(census.register, 'utf8'));
const store = new WorldFeatureStore(dbPath);
const observer = 'offline-anvil-worldwide-interior-auditor';
const snapshotRef = `${census.snapshot.directory}:sha256=${census.snapshot.sha256}`;
const qaRefs = [
  'data/world-review/worldwide-room-fitout-wave4-cross-area-saved-world-qa-2026-07-27.json',
  'data/world-review/worldwide-room-fitout-wave4-ravensreach-saved-world-qa-2026-07-27.json',
  'data/world-review/worldwide-room-fitout-wave4-mainstreet-saved-world-qa-2026-07-27.json',
  'data/world-review/worldwide-room-fitout-wave4-focused-saved-world-qa-2026-07-27.json',
];

function volume(bounds) {
  return (bounds.maxX - bounds.minX + 1)
    * (bounds.maxY - bounds.minY + 1)
    * (bounds.maxZ - bounds.minZ + 1);
}

function scanBounds(area, structures) {
  if (structures.length === 0) {
    return {
      type: 'bounds',
      minX: area.bounds[0],
      minZ: area.bounds[1],
      maxX: area.bounds[2],
      maxZ: area.bounds[3],
    };
  }
  return {
    type: 'bounds',
    minX: Math.min(...structures.map((structure) => structure.bounds.minX)),
    minY: Math.min(...structures.map((structure) => structure.bounds.minY)),
    minZ: Math.min(...structures.map((structure) => structure.bounds.minZ)),
    maxX: Math.max(...structures.map((structure) => structure.bounds.maxX)),
    maxY: Math.max(...structures.map((structure) => structure.bounds.maxY)),
    maxZ: Math.max(...structures.map((structure) => structure.bounds.maxZ)),
  };
}

const results = [];
try {
  for (const area of register.areas) {
    const areaCensus = census.byArea[area.id];
    const structures = census.structures.filter(
      (structure) => structure.areaId === area.id,
    );
    const features = store.listFeatures({ projectId: area.id, limit: 1_000 });
    const byExternalId = new Map(
      features
        .filter((feature) => feature.externalId)
        .map((feature) => [feature.externalId, feature]),
    );
    const existing = store.listScans({
      projectId: area.id,
      status: 'complete',
      limit: 1_000,
    }).find((scan) => (
      scan.snapshotRef === snapshotRef
      && scan.summary?.auditor === observer
      && scan.summary?.census === censusPath
    ));
    if (existing) {
      results.push({
        projectId: area.id,
        scanId: existing.id,
        reused: true,
        observations: store.getScanObservations(existing.id, 5_000).length,
      });
      continue;
    }

    const scan = store.createScan({
      projectId: area.id,
      world: 'world',
      method: 'region_snapshot',
      bounds: scanBounds(area, structures),
      observer,
      snapshotRef,
      summary: {
        auditor: observer,
        census: censusPath,
        qaRefs,
        area: areaCensus,
        policy: register.policies,
      },
    });
    let observationCount = 0;

    const district = features.find(
      (feature) => feature.kind === 'district' && feature.parentId == null,
    );
    if (district) {
      store.recordObservation({
        scanId: scan.id,
        featureId: district.id,
        status: 'complete',
        completionRatio: 1,
        conditionScore: 100,
        details: {
          census: censusPath,
          area: areaCensus,
          snapshotRef,
        },
      });
      observationCount += 1;
    }

    for (const structure of structures) {
      const building = store.getFeature(structure.featureId);
      if (!building) {
        throw new Error(`missing database building ${structure.id}`);
      }
      const conditionScore = structure.findings.length === 0 ? 100 : 95;
      store.recordObservation({
        scanId: scan.id,
        featureId: building.id,
        status: 'complete',
        completionRatio: 1,
        conditionScore,
        expectedBlocks: structure.cellsRead,
        observedBlocks: structure.cellsRead,
        details: {
          census: structure.census,
          findings: structure.findings,
          floors: structure.floors,
          floorCirculation: structure.floorCirculation,
          rooms: structure.rooms.length,
          snapshotRef,
          qaRefs,
        },
      });
      observationCount += 1;

      for (const room of structure.rooms) {
        const roomFeature = store.getFeature(room.featureId);
        if (!roomFeature) throw new Error(`missing database room ${room.id}`);
        const observedCells = volume(room.bounds);
        store.recordObservation({
          scanId: scan.id,
          featureId: roomFeature.id,
          status: 'complete',
          completionRatio: 1,
          conditionScore: 100,
          expectedBlocks: observedCells,
          observedBlocks: observedCells,
          details: {
            census: room.census,
            finding: room.finding,
            snapshotRef,
          },
        });
        observationCount += 1;
      }

      const circulation = byExternalId.get(`${structure.id}:CIRCULATION`);
      if (circulation) {
        store.recordObservation({
          scanId: scan.id,
          featureId: circulation.id,
          status: 'complete',
          completionRatio: 1,
          conditionScore: 100,
          details: {
            mode: 'stairs',
            ladderCount: structure.census.ladders ?? 0,
            floors: structure.floors,
            floorCirculation: structure.floorCirculation,
            qaRefs,
            snapshotRef,
          },
        });
        observationCount += 1;
      }
    }

    // The road area has no rooms by policy, but its primary mapped feature still
    // receives an observation from the same authoritative snapshot.
    if (area.id === 'approach-road') {
      const road = byExternalId.get('APPROACH-ROAD:PRIMARY');
      if (!road) throw new Error('missing APPROACH-ROAD:PRIMARY');
      store.recordObservation({
        scanId: scan.id,
        featureId: road.id,
        status: 'complete',
        completionRatio: 1,
        conditionScore: 100,
        details: {
          interiorExempt: true,
          routeQa: 'builds/manifest.yaml#approach-road',
          snapshotRef,
        },
      });
      observationCount += 1;
    }

    const completed = store.completeScan(scan.id, {
      summary: {
        ...scan.summary,
        observationCount,
        completed: true,
      },
    });
    results.push({
      projectId: area.id,
      scanId: completed.id,
      reused: false,
      observations: observationCount,
    });
  }
} finally {
  store.close();
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  dbPath,
  census: censusPath,
  snapshotRef,
  qaRefs,
  projects: results,
  totals: {
    projects: results.length,
    scansCreated: results.filter((result) => !result.reused).length,
    scansReused: results.filter((result) => result.reused).length,
    observations: results.reduce((sum, result) => sum + result.observations, 0),
  },
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
