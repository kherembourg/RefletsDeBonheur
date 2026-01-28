import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SlugStep, type SlugData } from '../steps/SlugStep';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SlugStep', () => {
  const defaultData: SlugData = {
    slug: '',
  };

  const mockOnChange = vi.fn();
  const mockOnNext = vi.fn();
  const mockOnBack = vi.fn();

  const defaultProps = {
    data: defaultData,
    onChange: mockOnChange,
    onNext: mockOnNext,
    onBack: mockOnBack,
    partner1Name: 'Marie',
    partner2Name: 'Thomas',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('renders all form fields', () => {
    render(<SlugStep {...defaultProps} />);

    expect(screen.getByText(/choose your url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/wedding site url/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('auto-generates slug from partner names when slug is empty', () => {
    render(<SlugStep {...defaultProps} />);

    // Should call onChange with generated slug immediately via useEffect
    expect(mockOnChange).toHaveBeenCalledWith({ slug: 'marie-thomas' });
  });

  it('does not auto-generate slug if one already exists', () => {
    render(
      <SlugStep
        {...defaultProps}
        data={{ slug: 'existing-slug' }}
      />
    );

    // Should not overwrite existing slug
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('normalizes input to lowercase and valid characters', () => {
    render(<SlugStep {...defaultProps} data={{ slug: '' }} />);

    // Clear the initial onChange call from useEffect
    mockOnChange.mockClear();

    const input = screen.getByLabelText(/wedding site url/i);
    fireEvent.change(input, { target: { value: 'My Wedding 2024!' } });

    expect(mockOnChange).toHaveBeenCalledWith({ slug: 'my-wedding-2024-' });
  });

  it('shows loading state during API check', async () => {
    vi.useFakeTimers();
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<SlugStep {...defaultProps} data={{ slug: 'test-slug' }} />);

    // Fast-forward debounce timer
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText(/checking/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('shows available status when slug is available', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ available: true }),
    });

    render(<SlugStep {...defaultProps} data={{ slug: 'available-slug' }} />);

    // Wait for debounce + API call
    await waitFor(() => {
      expect(screen.getByText(/this url is available/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('shows taken status with suggestions when slug is taken', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        available: false,
        reason: 'taken',
        message: 'This URL is already in use.',
        suggestions: ['marie-thomas-2024', 'marie-thomas-1'],
      }),
    });

    render(<SlugStep {...defaultProps} data={{ slug: 'taken-slug' }} />);

    await waitFor(() => {
      expect(screen.getByText(/this url is already in use/i)).toBeInTheDocument();
    }, { timeout: 1000 });

    expect(screen.getByText(/try instead/i)).toBeInTheDocument();
    // Use regex to match button text (includes comma in first suggestion)
    expect(screen.getByRole('button', { name: /marie-thomas-2024/ })).toBeInTheDocument();
  });

  it('handles suggestion click', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        available: false,
        reason: 'taken',
        message: 'This URL is already in use.',
        suggestions: ['suggested-slug'],
      }),
    });

    render(<SlugStep {...defaultProps} data={{ slug: 'taken-slug' }} />);

    await waitFor(() => {
      expect(screen.getByText('suggested-slug')).toBeInTheDocument();
    }, { timeout: 1000 });

    const suggestionButton = screen.getByText('suggested-slug');
    fireEvent.click(suggestionButton);

    expect(mockOnChange).toHaveBeenCalledWith({ slug: 'suggested-slug' });
  });

  it('handles API error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<SlugStep {...defaultProps} data={{ slug: 'test-slug' }} />);

    await waitFor(() => {
      expect(screen.getByText(/unable to check availability/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('debounces API calls', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ available: true }),
    });

    const { rerender } = render(
      <SlugStep {...defaultProps} data={{ slug: 'abc' }} />
    );

    // Before debounce - no API call
    expect(mockFetch).not.toHaveBeenCalled();

    // Fast-forward debounce timer
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // API call after debounce
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/weddings/check-slug?slug=abc');

    vi.useRealTimers();
  });

  it('does not check slugs shorter than 3 characters', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ available: true }),
    });

    render(<SlugStep {...defaultProps} data={{ slug: 'ab' }} />);

    // Fast-forward debounce timer
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(mockFetch).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('shows error when submitting without slug', () => {
    render(<SlugStep {...defaultProps} data={{ slug: '' }} />);

    const submitButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(submitButton);

    expect(screen.getByText(/please enter a url/i)).toBeInTheDocument();
    expect(mockOnNext).not.toHaveBeenCalled();
  });

  it('shows error when submitting with short slug', () => {
    render(<SlugStep {...defaultProps} data={{ slug: 'ab' }} />);

    const submitButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(submitButton);

    expect(screen.getByText(/must be at least 3 characters/i)).toBeInTheDocument();
    expect(mockOnNext).not.toHaveBeenCalled();
  });

  it('prevents submission when slug is unavailable', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        available: false,
        reason: 'taken',
        message: 'This URL is already in use.',
      }),
    });

    render(<SlugStep {...defaultProps} data={{ slug: 'taken-slug' }} />);

    // Wait for API check to complete
    await waitFor(() => {
      expect(screen.getByText(/already in use/i)).toBeInTheDocument();
    }, { timeout: 1000 });

    const submitButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(submitButton);

    expect(mockOnNext).not.toHaveBeenCalled();
  });

  it('prevents submission while checking', async () => {
    vi.useFakeTimers();
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<SlugStep {...defaultProps} data={{ slug: 'checking-slug' }} />);

    // Trigger check
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const submitButton = screen.getByRole('button', { name: /checking/i });
    fireEvent.click(submitButton);

    expect(mockOnNext).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('calls onNext with valid available slug', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ available: true }),
    });

    render(<SlugStep {...defaultProps} data={{ slug: 'valid-slug' }} />);

    // Wait for API check
    await waitFor(() => {
      expect(screen.getByText(/this url is available/i)).toBeInTheDocument();
    }, { timeout: 1000 });

    const submitButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(submitButton);

    expect(mockOnNext).toHaveBeenCalled();
  });

  it('calls onBack when back button is clicked', () => {
    render(<SlugStep {...defaultProps} />);

    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalled();
  });

  it('displays URL preview', () => {
    render(<SlugStep {...defaultProps} data={{ slug: 'my-wedding' }} />);

    expect(screen.getByText(/your site will be available at/i)).toBeInTheDocument();
    expect(screen.getByText(/my-wedding/)).toBeInTheDocument();
  });

  it('shows reserved slug error', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        available: false,
        reason: 'reserved',
        message: 'This URL is reserved and cannot be used.',
        suggestions: ['admin-wedding', 'my-admin'],
      }),
    });

    render(<SlugStep {...defaultProps} data={{ slug: 'admin' }} />);

    await waitFor(() => {
      expect(screen.getByText(/reserved and cannot be used/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('shows invalid format error', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        available: false,
        reason: 'invalid_format',
        message: 'Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only.',
      }),
    });

    render(<SlugStep {...defaultProps} data={{ slug: 'bad_slug' }} />);

    await waitFor(() => {
      expect(screen.getByText(/3-50 characters/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('displays URL guidelines', () => {
    render(<SlugStep {...defaultProps} />);

    expect(screen.getByText(/url guidelines/i)).toBeInTheDocument();
    expect(screen.getByText(/lowercase letters, numbers, and hyphens/i)).toBeInTheDocument();
    expect(screen.getByText(/between 3 and 50 characters/i)).toBeInTheDocument();
  });
});
