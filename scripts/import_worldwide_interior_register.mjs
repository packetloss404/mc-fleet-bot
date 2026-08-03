#!/usr/bin/env node
/**
 * Promote the active worldwide interior register into world-map.db.
 *
 * Idempotent feature imports are keyed by (projectId, externalId). Districts,
 * buildings, named functional rooms, and vertical-circulation records become
 * first-class map objects instead of living only in Markdown/build scripts.
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
const registerPath = value(
  '--register',
  'data/world-review/active-interior-register-2026-07-27.json',
);
const dbPath = value('--db', 'data/world-map.db');
const output = value(
  '--out',
  'data/world-review/worldwide-interior-programs-2026-07-27.json',
);
const reportPath = value(
  '--report',
  'data/world-review/worldwide-interior-database-import-2026-07-27.json',
);

const FLOOR_PROGRAMS = {
  'RR-B1': [
    ['Situation Room', 'Map Archive', 'Duty Offices'],
    ['Operations Floor', 'Briefing Theatre', 'Secure Records'],
    ['Director Suite', 'Crisis Room', 'Observation Gallery'],
  ],
  'RR-B2': [
    ['Equipment Hall', 'Radio Bay', 'Message Center'],
    ['Signals Operations', 'Cryptography Office', 'Technical Control'],
    ['Antenna Control', 'Dispatch Office', 'Communications Archive'],
  ],
  'RR-B3': [
    ['Dining Hall', 'Galley'],
    ['Dormitory', 'Day Room'],
    ['Infirmary', 'Laundry and Pharmacy'],
  ],
  'RR-B4': [
    ['Generator Hall', 'Fuel and Switchgear'],
    ['Ventilation Plant', 'Maintenance Workshop'],
  ],
  'RRCH-LIBRARY': [
    ['Rare-Book Vault'],
    ['Closed Archive'],
    ['General Stacks'],
    ['Entrance Hall', 'Issue Desk'],
    ['Reading Room'],
    ['Rare Books', 'Map Room'],
  ],
  'RRCH-MOOT': [
    ['Sanctum Nave'],
    ['Processional Corridor'],
    ['B2 Council Chamber', 'B2 Service Gallery'],
    ['B1 Archive', 'B1 Assembly Hall'],
    ['Ground Moot Chamber', 'Public Foyer'],
    ['First-Floor Offices', 'Committee Room'],
    ['Second-Floor Gallery', 'Clerks Hall'],
    ['Third-Floor Library', 'Meeting Room'],
    ['Penthouse Hall', 'Attic Store'],
  ],
  'RRCH-MARKET': [
    ['Market Nave', 'Garden Court'],
    ['Works Terrace'],
    ['East Loft', 'West Loft'],
  ],
  'RRCH-GRANGE': [
    ['Main Hall', 'Garden Court', 'Still Room'],
    ['Wall-Walk Balcony'],
    ['Craft Loft'],
  ],
  'RRCH-ARCHITECT': [['Architect Living Room', 'Architect Studio']],
  'RRCH-MASON': [['Mason Living Room', 'Mason Workshop']],
  'RRCH-SURVEYOR': [['Surveyor Living Room', 'Map Office']],
  'RRCH-STEWARD': [['Steward Living Room', 'Steward Office']],
  'RRCH-SCOUT': [['Scout Living Room', 'Field-Gear Room']],
  'RRCH-STOREHOUSE': [['Receiving Bay', 'Dry-Goods Store']],
  'RG-STOA': [['South Stoa Walk']],
  'RG-LOGGIA': [['Library Loggia']],
  'RG-BELL': [
    ['Gate Hall'],
    ['Bell-Keeper Landing'],
    ['Belfry'],
    ['Lantern Room'],
  ],
  'RG-TEMPIETTO': [['Long Water Rotunda']],
  'WL-THEATRE': [
    ['Lower Lobby', 'Backstage Service'],
    ['Orchestra Lobby', 'Auditorium Parterre'],
    ['Upper Lobby', 'Balcony'],
  ],
  'WL-BOWL': [
    ['Field Level', 'Service Ring'],
    ['Main Concourse', 'South Vomitory'],
    ['Upper Concourse', 'Members Terrace'],
    ['Crown Walk', 'Press Gallery'],
  ],
  'WL-CLUB': [
    ['Members Lounge', 'Bar and Dance Floor'],
    ['Private Balcony', 'Club Landing'],
  ],
  'WD-GATEHEAD': [
    ['Visitor Reception', 'Map Library'],
    ['District Office', 'Planning Room'],
  ],
  'WD-LANTERN': [['Lantern Hall']],
  'WD-FERRY': [['Ferry Bell Room']],
  'WD-SHOP-A': [['Cartographer Shop'], ['Cartographer Apartment']],
  'WD-SHOP-B': [['Stoneworker Shop'], ['Stoneworker Apartment']],
  'WD-SHOP-C': [['Textile Shop'], ['Textile Apartment']],
  'WD-SHOP-D': [['Smithy Shop'], ['Smith Apartment']],
  'WD-SHOP-E': [['Provisioner Shop'], ['Provisioner Apartment']],
  'WD-SHOP-F': [['Fletcher Shop'], ['Fletcher Apartment']],
  'WD-SHOP-G': [['Craft Shop'], ['Craftworker Apartment']],
  'WD-FIELD': [['Field House Pavilion']],
  'WD-INN': [
    ['Lobby', 'Taproom'],
    ['Guest Floor One'],
    ['Owner Suite', 'Private Library'],
    ['Lower Tower Lounge'],
    ['Beacon Keeper Room'],
    ['Beacon Lookout'],
  ],
  'WD-BREW': [
    ['Working Taproom', 'Brewhouse'],
    ['Music Loft', 'Private Tasting Room'],
  ],
  'WD-SKIFF': [['Skiff House Workshop']],
};

const NO_ROOM_PROGRAM = new Set([
  'RR-Z5',
  'RRCH-TOWN-HALL',
]);

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function boundsGeometry(bounds) {
  return {
    type: 'bounds',
    minX: bounds[0],
    minY: bounds[1],
    minZ: bounds[2],
    maxX: bounds[3],
    maxY: bounds[4],
    maxZ: bounds[5],
  };
}

function areaGeometry(bounds) {
  return {
    type: 'bounds',
    minX: bounds[0],
    minZ: bounds[1],
    maxX: bounds[2],
    maxZ: bounds[3],
  };
}

function roomGeometries(structure, names, floorIndex) {
  const [minX, , minZ, maxX, maxY, maxZ] = structure.bounds;
  const floorY = structure.floors[floorIndex];
  const nextFloor = structure.floors[floorIndex + 1];
  const roomMinY = floorY + 1;
  const roomMaxY = Math.max(
    roomMinY + 1,
    Math.min(maxY - 1, nextFloor == null ? floorY + 6 : nextFloor - 1),
  );
  // Beacon Inn's upper three levels occupy its 9x9 mast, not the full inn
  // footprint. Keeping the database bounds on that actual tower prevents roof
  // mass from being mislabeled as rooms.
  const towerLevel = structure.id === 'WD-INN' && floorIndex >= 3;
  const x1 = towerLevel ? -419 : minX + 1;
  const x2 = towerLevel ? -413 : maxX - 1;
  const z1 = towerLevel ? -489 : minZ + 1;
  const z2 = towerLevel ? -483 : maxZ - 1;
  const splitX = (x2 - x1) >= (z2 - z1);
  const start = splitX ? x1 : z1;
  const end = splitX ? x2 : z2;
  const span = end - start + 1;
  return names.map((name, index) => {
    const segmentStart = start + Math.floor((span * index) / names.length);
    const segmentEnd = start + Math.floor((span * (index + 1)) / names.length) - 1;
    return {
      name,
      geometry: {
        type: 'bounds',
        minX: splitX ? segmentStart : x1,
        maxX: splitX ? segmentEnd : x2,
        minY: roomMinY,
        maxY: roomMaxY,
        minZ: splitX ? z1 : segmentStart,
        maxZ: splitX ? z2 : segmentEnd,
      },
    };
  });
}

const register = JSON.parse(fs.readFileSync(registerPath, 'utf8'));
const store = new WorldFeatureStore(dbPath);
const imported = {
  districts: [],
  buildings: [],
  rooms: [],
  circulation: [],
  infrastructure: [],
};
try {
  for (const area of register.areas) {
    if (area.id === 'mainstreet-america') continue;
    const district = store.upsertFeature({
      projectId: area.id,
      externalId: `${area.id}:DISTRICT`,
      name: area.name,
      kind: 'district',
      status: 'complete',
      geometry: areaGeometry(area.bounds),
      source: 'manifest',
      sourceRef: registerPath,
      confidence: 1,
      completionRatio: 1,
      conditionScore: 95,
      tags: ['active-area', 'interior-inventory', 'worldwide-review'],
      attributes: {
        review: area.review,
        interiorExempt: area.interiorExempt === true,
        policies: register.policies,
      },
    });
    imported.districts.push(district.externalId);

    for (const structure of area.structures ?? []) {
      const building = store.upsertFeature({
        projectId: area.id,
        externalId: structure.id,
        parentId: district.id,
        name: structure.name,
        kind: 'building',
        status: 'complete',
        geometry: boundsGeometry(structure.bounds),
        source: 'manifest',
        sourceRef: registerPath,
        confidence: 1,
        completionRatio: 1,
        conditionScore: 95,
        tags: [
          'as-built',
          'interior-inventory',
          structure.floors.length > 1 ? 'multi-floor' : 'single-floor',
        ],
        attributes: {
          floorsY: structure.floors,
          entrance: structure.entrance,
          floorCount: structure.floors.length,
          interiorProgramVersion: '2026-07-27',
        },
      });
      imported.buildings.push(building.externalId);

      if (structure.floors.length > 1) {
        const circulation = store.upsertFeature({
          projectId: area.id,
          externalId: `${structure.id}:CIRCULATION`,
          parentId: building.id,
          name: `${structure.name} vertical circulation`,
          kind: 'custom',
          status: 'complete',
          geometry: boundsGeometry(structure.bounds),
          source: 'region_scan',
          sourceRef: 'data/world-review/worldwide-interior-wave3-post-census-2026-07-27.json',
          confidence: 1,
          completionRatio: 1,
          conditionScore: 100,
          tags: ['vertical-circulation', 'stairs-only', 'bidirectional-qa'],
          attributes: {
            mode: 'stairs',
            floorsY: structure.floors,
            ladderCount: 0,
            policy: register.policies.verticalCirculation,
            qaRefs: [
              'data/world-review/worldwide-interior-wave1-post-route-qa-2026-07-27.json',
              'data/world-review/ravensreach-ladderless-wave3-post-route-qa-2026-07-27.json',
            ],
          },
        });
        imported.circulation.push(circulation.externalId);
      }

      if (NO_ROOM_PROGRAM.has(structure.id)) continue;
      const floorPrograms = FLOOR_PROGRAMS[structure.id];
      if (!floorPrograms) {
        throw new Error(`missing floor program for ${structure.id}`);
      }
      if (floorPrograms.length !== structure.floors.length) {
        throw new Error(
          `${structure.id} has ${structure.floors.length} floors but `
          + `${floorPrograms.length} floor programs`,
        );
      }
      for (let floorIndex = 0; floorIndex < floorPrograms.length; floorIndex += 1) {
        const desiredRoomIds = new Set();
        const geometries = roomGeometries(
          structure,
          floorPrograms[floorIndex],
          floorIndex,
        );
        for (const room of geometries) {
          const externalId = `${structure.id}:ROOM:${floorIndex + 1}:${slug(room.name)}`;
          desiredRoomIds.add(externalId);
          const feature = store.upsertFeature({
            projectId: area.id,
            externalId,
            parentId: building.id,
            name: `${structure.name} — ${room.name}`,
            kind: 'room',
            status: 'complete',
            geometry: room.geometry,
            source: 'manifest',
            sourceRef: output,
            confidence: 0.95,
            completionRatio: 1,
            conditionScore: 92,
            tags: [
              'interior-program',
              `floor-${floorIndex + 1}`,
              'worldwide-review',
            ],
            attributes: {
              structureId: structure.id,
              areaId: area.id,
              floorIndex: floorIndex + 1,
              floorSupportY: structure.floors[floorIndex],
              programName: room.name,
              geometryModel: 'functional zone divided within measured as-built floor',
              circulationPolicy: register.policies.verticalCirculation,
              scoringProfile: structure.id === 'RG-BELL'
                ? 'circulation-landing'
                : 'standard',
            },
          });
          imported.rooms.push(feature.externalId);
        }
        // Room IDs are managed by this manifest import. Remove superseded
        // programs (for example Beacon Inn's former full-footprint roof rooms)
        // without touching rooms owned by another building/project.
        const currentRooms = store.listFeatures({
          projectId: area.id,
          kind: 'room',
          parentId: building.id,
          limit: 1_000,
        });
        for (const currentRoom of currentRooms) {
          const currentFloor = currentRoom.attributes?.floorIndex;
          if (
            currentFloor === floorIndex + 1
            && currentRoom.externalId
            && !desiredRoomIds.has(currentRoom.externalId)
          ) {
            store.deleteFeature(currentRoom.id);
          }
        }
      }
    }

    if (area.id === 'approach-road') {
      const road = store.upsertFeature({
        projectId: area.id,
        externalId: 'APPROACH-ROAD:PRIMARY',
        parentId: district.id,
        name: 'Ravensgate to Westlight Approach Road',
        kind: 'road',
        status: 'complete',
        geometry: {
          type: 'path',
          width: 7,
          points: [
            { x: -148, y: 68, z: -500 },
            { x: -170, y: 72, z: -506 },
            { x: -224, y: 70, z: -496 },
            { x: -305, y: 73, z: -497 },
            { x: -322, y: 68, z: -497 },
            { x: -344, y: 68, z: -486 },
          ],
        },
        source: 'manifest',
        sourceRef: 'builds/manifest.yaml#approach-road',
        confidence: 1,
        completionRatio: 1,
        conditionScore: 95,
        tags: ['bidirectional-qa', 'district-connector', 'interior-exempt'],
        attributes: {
          route: [
            'Ravensgate',
            'Millstone',
            'Panorama',
            'White Bridge',
            'Gatehead',
          ],
        },
      });
      imported.infrastructure.push(road.externalId);
    }
  }
} finally {
  store.close();
}

const programs = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  register: registerPath,
  roomPrograms: FLOOR_PROGRAMS,
  noRoomProgram: [...NO_ROOM_PROGRAM],
  geometryModel: {
    method: 'named functional zones divided within measured as-built floor bounds',
    confidence: 0.95,
    note: 'Zones are database floor-plan regions; physical walls and authored circulation remain snapshot-audited.',
  },
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(programs, null, 2)}\n`);

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  dbPath,
  register: registerPath,
  programArtifact: output,
  importedCounts: Object.fromEntries(
    Object.entries(imported).map(([kind, values]) => [kind, values.length]),
  ),
  imported,
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
