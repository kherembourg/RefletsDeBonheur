import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeddingStep, type WeddingData } from '../steps/WeddingStep';

describe('WeddingStep', () => {
  const defaultData: WeddingData = {
    partner1Name: '',
    partner2Name: '',
    weddingDate: '',
  };

  const mockOnChange = vi.fn();
  const mockOnNext = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(
      <WeddingStep
        data={defaultData}
        onChange={mockOnChange}
        onNext={mockOnNext}
        onBack={mockOnBack}
        lang="en"
      />
    );

    expect(screen.getByLabelText(/partner 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/partner 2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/wedding date/i)).toBeInTheDocument();
  });

  it('calls onChange when partner 1 name is entered', () => {
    render(
      <WeddingStep
        data={defaultData}
        onChange={mockOnChange}
        onNext={mockOnNext}
        onBack={mockOnBack}
        lang="en"
      />
    );

    const partner1Input = screen.getByPlaceholderText('e.g., Marie');
    fireEvent.change(partner1Input, { target: { value: 'Marie' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultData,
      partner1Name: 'Marie',
    });
  });

  it('shows error when partner 1 name is missing', () => {
    render(
      <WeddingStep
        data={{ partner1Name: '', partner2Name: 'Thomas', weddingDate: '' }}
        onChange={mockOnChange}
        onNext={mockOnNext}
        onBack={mockOnBack}
        lang="en"
      />
    );

    const submitButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(submitButton);

    expect(screen.getByText(/first partner name is required/i)).toBeInTheDocument();
    expect(mockOnNext).not.toHaveBeenCalled();
  });

  it('shows error when partner 2 name is missing', () => {
    render(
      <WeddingStep
        data={{ partner1Name: 'Marie', partner2Name: '', weddingDate: '' }}
        onChange={mockOnChange}
        onNext={mockOnNext}
        onBack={mockOnBack}
        lang="en"
      />
    );

    const submitButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(submitButton);

    expect(screen.getByText(/second partner name is required/i)).toBeInTheDocument();
    expect(mockOnNext).not.toHaveBeenCalled();
  });

  it('calls onNext with valid data (date optional)', () => {
    render(
      <WeddingStep
        data={{ partner1Name: 'Marie', partner2Name: 'Thomas', weddingDate: '' }}
        onChange={mockOnChange}
        onNext={mockOnNext}
        onBack={mockOnBack}
        lang="en"
      />
    );

    const submitButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(submitButton);

    expect(mockOnNext).toHaveBeenCalled();
  });

  it('calls onBack when back button is clicked', () => {
    render(
      <WeddingStep
        data={defaultData}
        onChange={mockOnChange}
        onNext={mockOnNext}
        onBack={mockOnBack}
        lang="en"
      />
    );

    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalled();
  });

  it('shows helper text for optional date field', () => {
    render(
      <WeddingStep
        data={defaultData}
        onChange={mockOnChange}
        onNext={mockOnNext}
        onBack={mockOnBack}
        lang="en"
      />
    );

    expect(screen.getByText(/optional - you can add this later/i)).toBeInTheDocument();
  });

  it('accepts a valid wedding date', () => {
    render(
      <WeddingStep
        data={{ partner1Name: 'Marie', partner2Name: 'Thomas', weddingDate: '2026-06-15' }}
        onChange={mockOnChange}
        onNext={mockOnNext}
        onBack={mockOnBack}
        lang="en"
      />
    );

    const submitButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(submitButton);

    expect(mockOnNext).toHaveBeenCalled();
  });
});
