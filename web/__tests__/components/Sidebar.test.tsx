import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/Sidebar';
import { usePathname } from 'next/navigation';
import { useBotStore } from '@/lib/store';

// Mock the store
vi.mock('@/lib/store', () => ({
  useBotStore: vi.fn(),
  useControlStore: vi.fn((selector: any) => {
    const state = {
      selectedBotIds: new Set<string>(),
    };
    return selector(state);
  }),
}));

const defaultBotState = {
  connected: true,
  botList: [{ name: 'Bot1' }, { name: 'Bot2' }],
  playerList: [
    { name: 'Steve', isOnline: true },
    { name: 'Alex', isOnline: false },
  ],
  unreadChats: 0,
};

const mockBotStore = (state: typeof defaultBotState) => {
  (useBotStore as any).mockImplementation((selector: any) => selector(state));
};

describe('Sidebar', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/');
    mockBotStore(defaultBotState);
  });

  it('renders the MC Fleet brand', () => {
    render(<Sidebar />);
    expect(screen.getByText('MC Fleet')).toBeInTheDocument();
    expect(screen.getByText('Control Panel')).toBeInTheDocument();
  });

  it('renders all navigation items', () => {
    render(<Sidebar />);
    const navLabels = ['Dashboard', 'World Map', 'Social', 'Skills', 'Chat', 'Activity', 'Stats', 'Manage'];
    for (const label of navLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('shows Live when connected', () => {
    render(<Sidebar />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('shows Offline when disconnected', () => {
    mockBotStore({ connected: false, botList: [], playerList: [], unreadChats: 0 });
    render(<Sidebar />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('shows bot and player counts when connected', () => {
    render(<Sidebar />);
    expect(screen.getByText('2 bots')).toBeInTheDocument();
    expect(screen.getByText('1 player')).toBeInTheDocument();
  });

  it('highlights the active nav item based on pathname', () => {
    vi.mocked(usePathname).mockReturnValue('/map');
    render(<Sidebar />);
    const mapLink = screen.getByText('World Map').closest('a')!;
    expect(mapLink.className).toContain('text-white');
  });

  it('does not highlight non-active nav items', () => {
    vi.mocked(usePathname).mockReturnValue('/');
    render(<Sidebar />);
    const statsLink = screen.getByText('Stats').closest('a')!;
    expect(statsLink.className).toContain('text-zinc-400');
  });

  it('shows unread chat badge when unreadChats > 0', () => {
    mockBotStore({ connected: true, botList: [], playerList: [], unreadChats: 5 });
    render(<Sidebar />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('caps unread badge display at 9+', () => {
    mockBotStore({ connected: true, botList: [], playerList: [], unreadChats: 15 });
    render(<Sidebar />);
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('renders version in footer', () => {
    render(<Sidebar />);
    expect(screen.getByText('MC Fleet v0.1.0')).toBeInTheDocument();
  });

  it('navigates to correct paths', () => {
    render(<Sidebar />);
    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('World Map').closest('a')).toHaveAttribute('href', '/map');
    expect(screen.getByText('Manage').closest('a')).toHaveAttribute('href', '/manage');
  });
});
