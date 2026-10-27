import { describe, expect, it } from 'vitest';
import type { Marker, Route, Zone } from '@/lib/api';
import { getZoneCenter, resolveRouteWaypoints } from '@/lib/mapDrawing';

function marker(id: string, x: number, z: number): Marker {
  return {
    id,
    name: id,
    kind: 'custom',
    position: { x, y: 64, z },
    tags: [],
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('canonical map records', () => {
  it('resolves route waypoint IDs to marker positions in route order', () => {
    const markers = [marker('mkr_a', 10, 20), marker('mkr_b', -5, 7)];
    const route: Route = {
      id: 'rte_1',
      name: 'Patrol',
      waypointIds: ['mkr_b', 'missing', 'mkr_a'],
      loop: false,
    };

    expect(resolveRouteWaypoints(route, markers)).toEqual([
      { x: -5, y: 64, z: 7 },
      { x: 10, y: 64, z: 20 },
    ]);
  });

  it('derives centers for both canonical zone geometries', () => {
    const rectangle: Zone = {
      id: 'zne_rect',
      name: 'Build area',
      mode: 'build',
      shape: 'rectangle',
      rectangle: { minX: -10, minZ: 4, maxX: 6, maxZ: 12 },
    };
    const circle: Zone = {
      id: 'zne_circle',
      name: 'Guard area',
      mode: 'guard',
      shape: 'circle',
      circle: { x: 3, z: -8, radius: 12 },
    };

    expect(getZoneCenter(rectangle)).toEqual({ x: -2, z: 8 });
    expect(getZoneCenter(circle)).toEqual({ x: 3, z: -8 });
  });
});
