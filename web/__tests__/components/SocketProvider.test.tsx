import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { SocketProvider } from '@/components/SocketProvider';
import { getSocket } from '@/lib/socket';

// Mock API
vi.mock('@/lib/api', () => ({
  safeFetch: (fetcher: () => Promise<unknown>, fallback: unknown) => fetcher().catch(() => fallback),
  api: {
    getBots: vi.fn().mockResolvedValue({ bots: [] }),
    getWorld: vi.fn().mockResolvedValue({ timeOfDay: 'day', isRaining: false }),
    getPlayers: vi.fn().mockResolvedValue({ players: [] }),
    listCampaigns: vi.fn().mockResolvedValue({ campaigns: [] }),
    getMarkers: vi.fn().mockResolvedValue({ markers: [] }),
    getZones: vi.fn().mockResolvedValue({ zones: [] }),
    getRoutes: vi.fn().mockResolvedValue({ routes: [] }),
    getSquads: vi.fn().mockResolvedValue({ squads: [] }),
    getMissions: vi.fn().mockResolvedValue({ missions: [] }),
    getCommands: vi.fn().mockResolvedValue({ commands: [] }),
    getBuilds: vi.fn().mockResolvedValue({ builds: [] }),
    getChains: vi.fn().mockResolvedValue({ chains: [] }),
    getRoleAssignments: vi.fn().mockResolvedValue({ assignments: [] }),
  },
}));

// Mock the store with individual function mocks
const storeMocks = {
  setBots: vi.fn(),
  updatePosition: vi.fn(),
  updateHealth: vi.fn(),
  updateState: vi.fn(),
  updateInventory: vi.fn(),
  pushEvent: vi.fn(),
  setConnected: vi.fn(),
  setWorld: vi.fn(),
  setPlayers: vi.fn(),
  updatePlayerPosition: vi.fn(),
  addPlayer: vi.fn(),
  removePlayer: vi.fn(),
  incrementUnreadChats: vi.fn(),
};

vi.mock('@/lib/store', () => {
  const auxiliaryStore = () => null;
  auxiliaryStore.getState = () => new Proxy({}, { get: () => vi.fn() });
  return {
    useBotStore: vi.fn(() => storeMocks),
    useControlStore: auxiliaryStore,
    useFleetStore: auxiliaryStore,
    useRoleStore: auxiliaryStore,
    useWorldStore: auxiliaryStore,
    useMissionStore: auxiliaryStore,
    useBuildStore: auxiliaryStore,
    useChainStore: auxiliaryStore,
    useCampaignStore: auxiliaryStore,
    useDecisionStore: auxiliaryStore,
    useMovementTrailStore: auxiliaryStore,
  };
});

import { api } from '@/lib/api';

describe('SocketProvider', () => {
  let mockSocket: Record<string, any>;
  const eventHandlers: Record<string, (...args: unknown[]) => void> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Set up mock socket that captures event handlers
    mockSocket = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        eventHandlers[event] = handler;
      }),
      off: vi.fn(),
      emit: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      connected: false,
      io: { on: vi.fn(), off: vi.fn() },
    };
    vi.mocked(getSocket).mockReturnValue(mockSocket as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children', () => {
    const { getByText } = render(
      <SocketProvider>
        <div>Child Content</div>
      </SocketProvider>,
    );
    expect(getByText('Child Content')).toBeInTheDocument();
  });

  it('fetches initial data on mount', () => {
    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );
    expect(api.getBots).toHaveBeenCalledTimes(1);
    expect(api.getWorld).toHaveBeenCalledTimes(1);
    expect(api.getPlayers).toHaveBeenCalledTimes(1);
  });

  it('registers socket event listeners', () => {
    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('bot:position', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('bot:health', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('bot:state', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('bot:inventory', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('activity', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('player:position', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('bot:decision', expect.any(Function));
  });

  it('calls setConnected(true) on socket connect', () => {
    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );
    eventHandlers['connect']();
    expect(storeMocks.setConnected).toHaveBeenCalledWith(true);
  });

  it('calls setConnected(false) on socket disconnect', () => {
    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );
    eventHandlers['disconnect']();
    expect(storeMocks.setConnected).toHaveBeenCalledWith(false);
  });

  it('dispatches bot:position events to store', () => {
    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );
    eventHandlers['bot:position']({ bot: 'TestBot', x: 10, y: 64, z: -20 });
    expect(storeMocks.updatePosition).toHaveBeenCalledWith('TestBot', 10, 64, -20);
  });

  it('dispatches bot:health events to store', () => {
    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );
    eventHandlers['bot:health']({ bot: 'TestBot', health: 15, food: 18 });
    expect(storeMocks.updateHealth).toHaveBeenCalledWith('TestBot', 15, 18);
  });

  it('polls bots every 15 seconds', () => {
    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );
    // Initial call
    expect(api.getBots).toHaveBeenCalledTimes(1);
    // Advance 15s
    vi.advanceTimersByTime(15000);
    expect(api.getBots).toHaveBeenCalledTimes(2);
    // Advance another 15s
    vi.advanceTimersByTime(15000);
    expect(api.getBots).toHaveBeenCalledTimes(3);
  });

  it('cleans up intervals and socket listeners on unmount', () => {
    const { unmount } = render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );
    unmount();
    expect(mockSocket.off).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('bot:position');
    expect(mockSocket.off).toHaveBeenCalledWith('bot:health');
    expect(mockSocket.off).toHaveBeenCalledWith('bot:state');
    expect(mockSocket.off).toHaveBeenCalledWith('bot:inventory');
    expect(mockSocket.off).toHaveBeenCalledWith('activity');

    // Ensure polling stops (no more calls after unmount)
    const callCount = vi.mocked(api.getBots).mock.calls.length;
    vi.advanceTimersByTime(10000);
    expect(api.getBots).toHaveBeenCalledTimes(callCount);
  });

  it('updates a player position from the supported socket event', () => {
    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );
    eventHandlers['player:position']({ player: 'Alex', x: 1, y: 64, z: 2 });
    expect(storeMocks.updatePlayerPosition).toHaveBeenCalledWith('Alex', 1, 64, 2);
  });
});
