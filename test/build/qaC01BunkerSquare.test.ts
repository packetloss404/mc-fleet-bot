import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  auditC01BunkerSquare,
  parseGuardedOperations,
} from '../../scripts/qa_c01_bunker_square.mjs';

const tempDirs: string[] = [];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function makeInputs() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c01-square-qa-'));
  tempDirs.push(tempDir);
  const opsPath = path.join(tempDir, 'forward.txt');
  fs.writeFileSync(
    opsPath,
    [
      '# phase=60 scope=TE-C01-TEST role=test_program',
      'REPL 0 1 0 0 1 0 minecraft:stone minecraft:air',
      '',
    ].join('\n'),
  );
  const hash = crypto.createHash('sha256').update(fs.readFileSync(opsPath)).digest('hex');
  const generatorReport = {
    operations: {
      sha256: hash,
      scopeSummary: [{ scope: 'TE-C01-TEST' }],
    },
  };
  const manifest = {
    schemaVersion: '1.0.0',
    id: 'c01-test',
    bunkerScopes: ['TE-C01-TEST'],
    envelope: {
      boxes: [
        [0, 1, 0, 5, 3, 5],
        [0, -4, 0, 5, -2, 5],
      ],
    },
    levels: [
      {
        id: 'MAIN',
        mainLevel: true,
        auditVolumeBoxes: [[0, 1, 0, 5, 3, 5]],
        spaces: [
          {
            id: 'MAIN-ROOM',
            category: 'programmed_room',
            boxes: [[0, 1, 0, 1, 3, 5]],
            occupied: true,
            requiredReachability: true,
            tags: [
              'main_level_room',
              'hangar',
              'overlook',
              'adults_only_wing',
              'test_suite',
              'non_graphic_adult_room',
            ],
            adultRoomProgram: {
              programId: 'TEST-ADULT-PROGRAM',
              roomType: 'public_exhibition_salon',
              themeId: 'art_deco_salon',
              materialPaletteId: 'red_brick_dark_oak_brass',
              lightingId: 'warm_cove_and_table',
              privacyThresholdId: 'double_acoustic_vestibule',
              furnishings: [
                'lounge_seating',
                'dressing',
                'wash_cleanup',
                'storage',
                'service_refreshment',
                'bar',
                'non_graphic_themed_furniture_silhouette',
              ],
              requiredFunctions: [
                'lounge_seating',
                'dressing',
                'wash_cleanup',
                'storage',
                'service_refreshment',
                'bar',
              ],
              cameraIds: ['CAM-ADULT-SALON'],
            },
          },
          {
            id: 'MAIN-CIRC',
            category: 'circulation',
            boxes: [[2, 1, 0, 2, 3, 5]],
            occupied: true,
            requiredReachability: true,
            tags: ['grand_arrival'],
          },
          {
            id: 'MAIN-VERTICAL',
            category: 'stair_lift',
            boxes: [[3, 1, 0, 3, 3, 5]],
            occupied: true,
            requiredReachability: true,
            tags: ['vertical_core'],
          },
          {
            id: 'MAIN-BACKROOM',
            category: 'service_backroom',
            boxes: [[4, 1, 0, 4, 3, 5]],
            occupied: false,
            tags: ['service'],
          },
          {
            id: 'MAIN-STRUCTURE',
            category: 'structure',
            boxes: [[5, 1, 0, 5, 3, 4]],
            occupied: false,
            tags: ['structure'],
          },
          {
            id: 'MAIN-VOID',
            category: 'deliberate_safety_void',
            boxes: [[5, 1, 5, 5, 3, 5]],
            occupied: false,
            tags: ['safety_void'],
            rationale: 'Isolation gap around the protected ventilation riser.',
          },
        ],
      },
      {
        id: 'LOWER',
        mainLevel: false,
        auditVolumeBoxes: [[0, -4, 0, 5, -2, 5]],
        spaces: [
          {
            id: 'LOWER-ROOM',
            category: 'programmed_room',
            boxes: [[0, -4, 0, 1, -2, 5]],
            occupied: true,
            requiredReachability: true,
            tags: ['back_tunnel_connection'],
          },
          {
            id: 'LOWER-CIRC',
            category: 'circulation',
            boxes: [[2, -4, 0, 2, -2, 5]],
            occupied: true,
            requiredReachability: true,
            tags: ['lower_loop'],
          },
          {
            id: 'LOWER-VERTICAL',
            category: 'stair_lift',
            boxes: [[3, -4, 0, 3, -2, 5]],
            occupied: true,
            requiredReachability: true,
            tags: ['vertical_core'],
          },
          {
            id: 'LOWER-BACKROOM',
            category: 'service_backroom',
            boxes: [[4, -4, 0, 4, -2, 5]],
            occupied: false,
            tags: ['service'],
          },
          {
            id: 'LOWER-STRUCTURE',
            category: 'structure',
            boxes: [[5, -4, 0, 5, -2, 4]],
            occupied: false,
            tags: ['structure'],
          },
          {
            id: 'LOWER-VOID',
            category: 'deliberate_safety_void',
            boxes: [[5, -4, 5, 5, -2, 5]],
            occupied: false,
            tags: ['safety_void'],
            rationale: 'Isolation gap around the protected ventilation riser.',
          },
        ],
      },
    ],
    routeGraph: {
      entranceNode: 'ENTRY',
      classEntrances: {
        public: 'ENTRY',
        owner: 'ENTRY',
        service: 'ENTRY',
        tunnel: 'ENTRY',
      },
      egressNodes: ['ROOM', 'MAIN-STAIR'],
      nodes: [
        {
          id: 'ENTRY',
          spaceId: 'MAIN-CIRC',
          level: 'MAIN',
          point: [2, 1, 0],
          tags: ['grand_entry'],
          accessClasses: ['public', 'owner', 'service', 'tunnel'],
        },
        {
          id: 'ROOM',
          spaceId: 'MAIN-ROOM',
          level: 'MAIN',
          point: [1, 1, 0],
          tags: ['main_level_room', 'hangar', 'overlook', 'adults_only_wing'],
          accessClasses: ['public', 'owner', 'service'],
        },
        {
          id: 'MAIN-STAIR',
          spaceId: 'MAIN-VERTICAL',
          level: 'MAIN',
          point: [3, 1, 0],
          tags: ['stair'],
          accessClasses: ['public'],
        },
        {
          id: 'MAIN-LIFT',
          spaceId: 'MAIN-VERTICAL',
          level: 'MAIN',
          point: [3, 1, 1],
          tags: ['lift'],
          accessClasses: ['public'],
        },
        {
          id: 'LOWER-STAIR',
          spaceId: 'LOWER-VERTICAL',
          level: 'LOWER',
          point: [3, -3, 0],
          tags: ['stair'],
          accessClasses: ['public'],
        },
        {
          id: 'LOWER-LIFT',
          spaceId: 'LOWER-VERTICAL',
          level: 'LOWER',
          point: [3, -3, 1],
          tags: ['lift'],
          accessClasses: ['public'],
        },
        {
          id: 'LOWER-CIRC',
          spaceId: 'LOWER-CIRC',
          level: 'LOWER',
          point: [2, -3, 0],
          tags: ['lower_loop'],
          accessClasses: ['public', 'tunnel'],
        },
        {
          id: 'BACK',
          spaceId: 'LOWER-ROOM',
          level: 'LOWER',
          point: [1, -3, 0],
          tags: ['back_tunnel'],
          accessClasses: ['tunnel'],
        },
      ],
      edges: [
        { id: 'PUBLIC-ROOM', from: 'ENTRY', to: 'ROOM', kind: 'corridor', width: 4, headroom: 3, bidirectional: true, accessClasses: ['public'] },
        { id: 'OWNER-ROOM', from: 'ENTRY', to: 'ROOM', kind: 'corridor', width: 4, headroom: 3, bidirectional: true, accessClasses: ['owner'] },
        { id: 'SERVICE-ROOM', from: 'ENTRY', to: 'ROOM', kind: 'corridor', width: 4, headroom: 3, bidirectional: true, accessClasses: ['service'] },
        { id: 'TO-STAIR', from: 'ENTRY', to: 'MAIN-STAIR', kind: 'corridor', width: 4, headroom: 3, bidirectional: true, accessClasses: ['public'] },
        { id: 'TO-LIFT', from: 'ENTRY', to: 'MAIN-LIFT', kind: 'corridor', width: 4, headroom: 3, bidirectional: true, accessClasses: ['public'] },
        { id: 'STAIR', from: 'MAIN-STAIR', to: 'LOWER-STAIR', kind: 'stair', width: 4, headroom: 3, bidirectional: true, accessClasses: ['public'] },
        { id: 'LIFT', from: 'MAIN-LIFT', to: 'LOWER-LIFT', kind: 'lift', width: 3, headroom: 3, bidirectional: true, accessClasses: ['public'] },
        { id: 'LOWER-LOOP-A', from: 'LOWER-STAIR', to: 'LOWER-CIRC', kind: 'corridor', width: 4, headroom: 3, bidirectional: true, accessClasses: ['public'] },
        { id: 'LOWER-LOOP-B', from: 'LOWER-LIFT', to: 'LOWER-CIRC', kind: 'corridor', width: 4, headroom: 3, bidirectional: true, accessClasses: ['public'] },
        { id: 'TUNNEL-ENTRY', from: 'ENTRY', to: 'LOWER-CIRC', kind: 'tunnel', width: 5, headroom: 5, bidirectional: true, accessClasses: ['tunnel'] },
        { id: 'TUNNEL-BACK', from: 'LOWER-CIRC', to: 'BACK', kind: 'tunnel', width: 5, headroom: 5, bidirectional: true, accessClasses: ['tunnel'] },
      ],
    },
    verticalCirculationPolicy: {
      minimumRouteWidth: 3,
      minimumStairWidth: 4,
      minimumLiftWidth: 3,
      minimumHeadroom: 3,
      requireStairAndLiftPerOccupiedLevel: true,
    },
    egressPolicy: {
      minimumIndependentEgresses: 2,
    },
    programRequirements: {
      exactSpaceTagCounts: { test_suite: 1 },
      minimumSpaceTagCounts: { vertical_core: 2 },
      requiredSpaceTags: ['grand_arrival', 'back_tunnel_connection'],
      prohibitedContentTags: ['explicit_content'],
    },
    adultRoomPolicy: {
      adultRoomTag: 'non_graphic_adult_room',
      minimumFurnishingsPerRoom: 3,
      themedSilhouetteFurnishingId: 'non_graphic_themed_furniture_silhouette',
      requiredFunctionsByType: {
        public_exhibition_salon: [
          'lounge_seating',
          'dressing',
          'wash_cleanup',
          'storage',
          'service_refreshment',
          'bar',
          'non_graphic_themed_furniture_silhouette',
        ],
      },
    },
    evidenceCameras: [
      {
        id: 'CAM-ADULT-SALON',
        roomType: 'public_exhibition_salon',
        interior: true,
        position: [1, 2, 1],
        target: [1, 2, 4],
      },
    ],
    terrainSafety: {
      minimumCoverBlocks: 3,
      measuredMinimumCoverBlocks: 5,
      fluidCells: 0,
      unresolvedFluidCells: 0,
      snapshotSha256: 'a'.repeat(64),
    },
    acceptance: {
      requiredMainLevelTags: ['main_level_room', 'hangar', 'overlook', 'adults_only_wing'],
      requiredAccessClasses: ['public', 'owner', 'service', 'tunnel'],
      backTunnelOnlySpaceTag: 'back_tunnel_connection',
      grandEntryNodeTag: 'grand_entry',
    },
    protectedEntities: [{ id: 'SAFE-CHEST', point: [99, 99, 99] }],
  };
  return { manifest, generatorReport, opsPath };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe('C01 bunker square independent QA', () => {
  it('passes exact classification, utilization, routing, and operation evidence', () => {
    const { manifest, generatorReport, opsPath } = makeInputs();
    const result = auditC01BunkerSquare({
      manifest,
      operations: parseGuardedOperations(opsPath),
      generatorReport,
      opsPath,
    });

    expect(result.status).toBe('PASS_OFFLINE_CLASSIFICATION_AND_DECLARED_ROUTE_GRAPH');
    expect(result.failures).toEqual([]);
    expect(result.utilization).toMatchObject({
      grossCells: 216,
      grossColumns: 72,
      unlabeledCells: 0,
      overlapCells: 0,
    });
    expect(result.levels).toHaveLength(2);
    expect(result.routeGraph.unreachableOccupiedSpaces).toEqual([]);
    expect(result.routeGraph.requiredMainLevelTags.hangar.reachable).toBe(true);
    expect(result.routeGraph.verticalConnections.LOWER.stairEdges).toEqual(['STAIR']);
    expect(result.routeGraph.verticalConnections.LOWER.liftEdges).toEqual(['LIFT']);
    expect(result.routeGraph.backTunnelOnly).toMatchObject({
      reachableByTunnel: true,
      reachableByPublic: false,
    });
    expect(result.programAndSafety.tagCounts.test_suite).toBe(1);
  });

  it('fails holes, overlaps, reachability, counts, safety, and protected-entity conflicts', () => {
    const { manifest: source, generatorReport, opsPath } = makeInputs();
    const manifest = clone(source);
    manifest.levels[0].spaces[0].boxes = [[0, 1, 0, 1, 3, 4]];
    manifest.levels[0].spaces[1].boxes.push([1, 1, 0, 1, 3, 0]);
    manifest.routeGraph.edges = manifest.routeGraph.edges.filter(
      (edge: { id: string }) => !['TUNNEL-BACK', 'STAIR', 'LIFT'].includes(edge.id),
    );
    manifest.programRequirements.exactSpaceTagCounts.test_suite = 2;
    manifest.terrainSafety.measuredMinimumCoverBlocks = 1;
    manifest.terrainSafety.unresolvedFluidCells = 3;
    manifest.protectedEntities = [{ id: 'COLLIDED', point: [0, 1, 0] }];
    manifest.levels[0].spaces[0].adultRoomProgram.furnishings = [];
    manifest.levels[0].spaces[0].adultRoomProgram.cameraIds = [];

    const result = auditC01BunkerSquare({
      manifest,
      operations: parseGuardedOperations(opsPath),
      generatorReport,
      opsPath,
    });
    const failedGates = new Set(result.failures.map((failure) => failure.gate));

    expect(result.status).toBe('FAIL');
    expect(failedGates).toEqual(expect.objectContaining(new Set([
      'zero_unlabeled_cells',
      'zero_classification_overlaps',
      'occupied_space_reachability',
      'broad_stair_connections',
      'lift_connections',
      'back_tunnel_only_connection',
      'exact_program_counts',
      'adult_room_furnishings',
      'adult_room_camera_coverage',
      'terrain_fluid_safety',
      'protected_entities',
    ])));
  });
});
