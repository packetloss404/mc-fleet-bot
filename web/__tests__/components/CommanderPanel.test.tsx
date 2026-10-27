import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommanderPanel } from '@/components/CommanderPanel';
import { ToastProvider } from '@/components/Toast';
import type { CommanderPlan } from '@/lib/api';

const plan: CommanderPlan = {
  id: 'plan-1',
  input: 'Send Ada to base',
  intent: 'Move Ada to base',
  confidence: 0.9,
  requiresConfirmation: true,
  warnings: [],
  commands: [{ type: 'move_to_marker', botName: 'Ada', params: { markerId: 'base' } }],
  missions: [],
  clarificationQuestions: [],
  needsClarification: false,
  suggestedCommands: [],
  createdAt: new Date(0).toISOString(),
};

vi.mock('@/lib/api', () => ({
  api: {
    commanderParse: vi.fn(),
    commanderExecute: vi.fn().mockResolvedValue({ result: { commands: [], missions: [] } }),
  },
}));

vi.mock('@/lib/store', () => ({
  useBotStore: vi.fn((selector: (state: { botList: unknown[] }) => unknown) => selector({ botList: [{ name: 'Ada' }] })),
}));

import { api } from '@/lib/api';

describe('CommanderPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.commanderParse).mockResolvedValue({ plan });
    vi.mocked(api.commanderExecute).mockResolvedValue({ result: { commands: [], missions: [] } });
  });

  it('parses natural language and previews the resulting plan', async () => {
    const user = userEvent.setup();
    render(<ToastProvider><CommanderPanel /></ToastProvider>);

    await user.type(screen.getByRole('textbox'), 'Send Ada to base');
    await user.click(screen.getByRole('button', { name: 'Parse' }));

    expect(api.commanderParse).toHaveBeenCalledWith('Send Ada to base');
    expect(await screen.findByText('Move Ada to base')).toBeInTheDocument();
    expect(screen.getByText('move_to_marker')).toBeInTheDocument();
    expect(screen.getByText('Commands (1)')).toBeInTheDocument();
  });

  it('executes the previewed plan', async () => {
    const user = userEvent.setup();
    render(<ToastProvider><CommanderPanel /></ToastProvider>);

    await user.type(screen.getByRole('textbox'), 'Send Ada to base');
    await user.click(screen.getByRole('button', { name: 'Parse' }));
    await user.click(await screen.findByRole('button', { name: 'Execute' }));

    await waitFor(() => expect(api.commanderExecute).toHaveBeenCalledWith(plan));
    expect(screen.getByText('Plan executed successfully')).toBeInTheDocument();
  });
});
