import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Toast, useToast } from '../../components/ui/Toast';

function ToastHarness() {
  const { showToast, ToastContainer } = useToast();

  return (
    <div>
      <button type="button" onClick={() => showToast('success', 'Action saved')}>
        Show toast
      </button>
      <ToastContainer />
    </div>
  );
}

describe('Toast UI', () => {
  it('renders the toast message and closes on timeout', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(<Toast type="success" message="Saved" onClose={onClose} duration={1200} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Saved');

    vi.advanceTimersByTime(1200);
    expect(onClose).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('shows a toast via the hook', async () => {
    const user = userEvent.setup();
    render(<ToastHarness />);

    await user.click(screen.getByRole('button', { name: 'Show toast' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Action saved');
  });
});
