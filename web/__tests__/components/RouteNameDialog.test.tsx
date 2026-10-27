import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteNameDialog } from '@/components/map/RouteNameDialog';
import { api, type Marker } from '@/lib/api';
import { useMapOverlayStore } from '@/lib/mapStore';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      createMarker: vi.fn(),
      createRoute: vi.fn(),
      deleteMarker: vi.fn(),
    },
  };
});

function createdMarker(id: string, x: number, z: number): Marker {
  return {
    id,
    name: id,
    kind: 'custom',
    position: { x, y: 64, z },
    tags: ['route-waypoint'],
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('RouteNameDialog', () => {
  beforeEach(() => {
    vi.mocked(api.createMarker).mockReset();
    vi.mocked(api.createRoute).mockReset();
    useMapOverlayStore.setState({
      markers: [],
      routes: [],
      routeWaypoints: [
        { x: 10, y: 64, z: 20 },
        { x: 15, y: 64, z: 25 },
      ],
      showRouteDialog: true,
    });
  });

  it('persists drawn points as markers and sends canonical waypoint IDs', async () => {
    vi.mocked(api.createMarker)
      .mockResolvedValueOnce({ marker: createdMarker('mkr_1', 10, 20) })
      .mockResolvedValueOnce({ marker: createdMarker('mkr_2', 15, 25) });
    vi.mocked(api.createRoute).mockResolvedValue({
      route: { id: 'rte_1', name: 'North patrol', waypointIds: ['mkr_1', 'mkr_2'], loop: false },
    });

    render(<RouteNameDialog />);
    await userEvent.type(screen.getByPlaceholderText('e.g. North Patrol'), 'North patrol');
    await userEvent.click(screen.getByRole('button', { name: 'Create Route' }));

    await waitFor(() => {
      expect(api.createRoute).toHaveBeenCalledWith({
        name: 'North patrol',
        waypointIds: ['mkr_1', 'mkr_2'],
        loop: false,
      });
    });
    expect(useMapOverlayStore.getState().routes[0]?.id).toBe('rte_1');
    expect(useMapOverlayStore.getState().markers.map((marker) => marker.id)).toEqual(['mkr_1', 'mkr_2']);
  });
});
