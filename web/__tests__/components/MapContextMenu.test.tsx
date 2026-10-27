import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MapContextMenu } from '@/components/map/MapContextMenu';
import { useMapOverlayStore } from '@/lib/mapStore';

describe('MapContextMenu', () => {
  it('passes rounded terrain coordinates to build-origin selection', async () => {
    const onSetBuildOrigin = vi.fn();
    useMapOverlayStore.getState().openContextMenu({
      screenX: 100,
      screenY: 120,
      worldX: 12.4,
      worldZ: 33.7,
    });

    render(<MapContextMenu onSetBuildOrigin={onSetBuildOrigin} />);
    await userEvent.click(screen.getByRole('button', { name: /Set build origin here/ }));

    expect(onSetBuildOrigin).toHaveBeenCalledWith(12, 34);
    expect(useMapOverlayStore.getState().contextMenu).toBeNull();
  });
});
