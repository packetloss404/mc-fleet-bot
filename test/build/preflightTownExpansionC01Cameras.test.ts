import { describe, expect, it } from 'vitest';

import {
  C01_CAMERA_MAX_RENDER_DISTANCE,
  C01_CAMERA_MINIMUM_CLEAR_SIGHT_DISTANCE,
  C01_OBJECT_REPRESENTATIVE_CAMERAS,
  clearSightDistance,
  isCameraEyeClear,
  isCameraRayTransparent,
  resolveC01CameraCandidates,
} from '../../scripts/preflight_town_expansion_c01_cameras.mjs';

describe('Town Expansion C01 camera preflight', () => {
  it('keeps the unchanged visibility contract and all eight object cameras', () => {
    expect(C01_CAMERA_MAX_RENDER_DISTANCE).toBe(128);
    expect(C01_CAMERA_MINIMUM_CLEAR_SIGHT_DISTANCE).toBe(0.75);
    expect(C01_OBJECT_REPRESENTATIVE_CAMERAS).toEqual({
      c01_east_l1_security_garage: 'CAM-l1-secure-vehicle-garage',
      c01_east_l2_living_adult: 'CAM-l2-adult-private-01',
      c01_east_l3_agriculture_water: 'CAM-l3-water-treatment',
      c01_east_l4_command_medical: 'CAM-l4-command-center',
      c01_east_l5_power_escape: 'CAM-l5-power-plant',
      c01_owner_club_arrival: 'CAM-owner-ceremonial-arrival-hall',
      c01_owner_residence: 'CAM-master-living',
      c01_owner_tunnel_detour: 'CAM-owner-tunnel-detour-refuge-01',
    });
  });

  it('distinguishes clear eye cells and renderer-transparent ray cells', () => {
    expect(isCameraEyeClear('minecraft:air')).toBe(true);
    expect(isCameraEyeClear('minecraft:light')).toBe(true);
    expect(isCameraEyeClear('minecraft:glass')).toBe(false);
    expect(isCameraEyeClear('minecraft:reinforced_deepslate')).toBe(false);
    expect(isCameraRayTransparent('minecraft:glass')).toBe(true);
    expect(isCameraRayTransparent('minecraft:oak_fence')).toBe(true);
    expect(isCameraRayTransparent('minecraft:reinforced_deepslate')).toBe(
      false,
    );
  });

  it('reports the first opaque surface along a camera ray', async () => {
    const sight = await clearSightDistance({
      eye: [0, 1.62, 0],
      direction: [1, 0, 0],
      maximumDistance: 12,
      blockNameAt: async (point: number[]) => (
        point[0] >= 5 ? 'minecraft:stone' : 'minecraft:air'
      ),
    });
    expect(sight.distance).toBeGreaterThanOrEqual(5);
    expect(sight.distance).toBeLessThan(5.1);
    expect(sight.firstSurface).toMatchObject({
        point: [5, 1, 0],
        blockName: 'minecraft:stone',
    });
  });

  it('relocates an occupied authored eye and emits a clear look target', async () => {
    const candidates = await resolveC01CameraCandidates({
      cameraId: 'CAM-test',
      originalEye: [0, 1.62, 0],
      originalLookAt: [10, 1.62, 0],
      exactObjectBounds: [-10, -10, -10, 20, 20, 20],
      levelAuditVolumeBoxes: [[-10, -10, -10, 20, 20, 20]],
      blockNameAt: async (point: number[]) => {
        const [x, y, z] = point.map(Math.floor);
        if (x === 0 && y === 1 && z === 0) return 'minecraft:stone';
        if (x >= 8) return 'minecraft:stone';
        return 'minecraft:air';
      },
      maximumCandidates: 4,
    });

    expect(candidates).toHaveLength(4);
    expect(candidates.every((candidate) => (
      JSON.stringify(candidate.eye) !== JSON.stringify([0, 1.62, 0])
      && candidate.eyeBlock === 'minecraft:air'
      && candidate.lookAtBlock === 'minecraft:air'
      && candidate.lookDistance
        >= C01_CAMERA_MINIMUM_CLEAR_SIGHT_DISTANCE
    ))).toBe(true);
  });
});
