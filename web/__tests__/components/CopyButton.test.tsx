import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { CopyButton } from '@/components/CopyButton';

describe('CopyButton', () => {
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock },
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a button with copy title', () => {
    render(<CopyButton text="hello" />);
    expect(screen.getByTitle('Copy to clipboard')).toBeInTheDocument();
  });

  it('copies text to clipboard on click', async () => {
    render(<CopyButton text="test-value" />);
    fireEvent.click(screen.getByTitle('Copy to clipboard'));
    expect(writeTextMock).toHaveBeenCalledWith('test-value');
  });

  it('shows checkmark icon after copy', async () => {
    const { container } = render(<CopyButton text="copy me" />);

    // Before click: copy icon (has rect element)
    const svgBefore = container.querySelector('svg');
    expect(svgBefore).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Copy to clipboard'));

    // After click: check icon (has polyline with "20 6 9 17 4 12")
    const svgAfter = container.querySelector('svg polyline');
    expect(svgAfter).toBeInTheDocument();
  });

  it('reverts to copy icon after 1.5 seconds', async () => {
    const { container } = render(<CopyButton text="temp" />);

    fireEvent.click(screen.getByTitle('Copy to clipboard'));

    // Check icon visible
    expect(container.querySelector('svg polyline')).toBeInTheDocument();

    // Advance past the 1500ms timeout
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Should revert to copy icon (has rect, no polyline for checkmark)
    expect(container.querySelector('svg rect')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<CopyButton text="x" className="ml-2" />);
    const btn = screen.getByTitle('Copy to clipboard');
    expect(btn.className).toContain('ml-2');
  });

  it('stops event propagation on click', async () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <CopyButton text="no-propagation" />
      </div>,
    );
    fireEvent.click(screen.getByTitle('Copy to clipboard'));
    expect(parentClick).not.toHaveBeenCalled();
  });
});
