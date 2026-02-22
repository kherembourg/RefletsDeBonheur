import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeStep, type ThemeData } from '../steps/ThemeStep';
import { themeList } from '../../../lib/themes';

describe('ThemeStep', () => {
  const defaultData: ThemeData = {
    themeId: 'classic',
  };

  const mockOnChange = vi.fn();
  const mockOnNext = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all theme options', () => {
    render(
      <ThemeStep
        data={defaultData}
        onChange={mockOnChange}
        onNext={mockOnNext}
        onBack={mockOnBack}
        lang="en"
      />
    );

    // All 6 themes should be displayed
    themeList.forEach((theme) => {
      expect(screen.getByText(theme.name)).toBeInTheDocument();
    });
  });

  it('shows the selected theme as active', () => {
    const { container } = render(
      <ThemeStep
        data={{ themeId: 'luxe' }}
        onChange={mockOnChange}
        onNext={mockOnNext}
        onBack={mockOnBack}
        lang="en"
      />
    );

    // The luxe theme card should have the selected styling
    const luxeCard = screen.getByText('Luxe').closest('button');
    expect(luxeCard).toHaveClass('border-burgundy-old');
  });

  it('calls onChange when a theme is selected', () => {
    render(
      <ThemeStep
        data={defaultData}
        onChange={mockOnChange}
        onNext={mockOnNext}
        onBack={mockOnBack}
        lang="en"
      />
    );

    const cobaltButton = screen.getByText('Cobalt').closest('button');
    if (cobaltButton) {
      fireEvent.click(cobaltButton);
    }

    expect(mockOnChange).toHaveBeenCalledWith({ themeId: 'cobalt' });
  });

  it('calls onNext when form is submitted', () => {
    render(
      <ThemeStep
        data={defaultData}
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
      <ThemeStep
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

  it('shows loading state when loading prop is true', () => {
    render(
      <ThemeStep
        data={defaultData}
        onChange={mockOnChange}
        onNext={mockOnNext}
        onBack={mockOnBack}
        lang="en"
        loading={true}
      />
    );

    // Submit button should show loading text (English)
    expect(screen.getByText(/creating/i)).toBeInTheDocument();
  });

  it('disables back button when loading', () => {
    render(
      <ThemeStep
        data={defaultData}
        onChange={mockOnChange}
        onNext={mockOnNext}
        onBack={mockOnBack}
        lang="en"
        loading={true}
      />
    );

    const backButton = screen.getByRole('button', { name: /back/i });
    expect(backButton).toBeDisabled();
  });

  it('displays theme descriptions', () => {
    render(
      <ThemeStep
        data={defaultData}
        onChange={mockOnChange}
        onNext={mockOnNext}
        onBack={mockOnBack}
        lang="en"
      />
    );

    // At least one theme description should be visible
    expect(screen.getByText(/élégant et intemporel/i)).toBeInTheDocument();
  });

  it('shows terms and privacy links', () => {
    render(
      <ThemeStep
        data={defaultData}
        onChange={mockOnChange}
        onNext={mockOnNext}
        onBack={mockOnBack}
        lang="en"
      />
    );

    expect(screen.getByRole('link', { name: /terms/i })).toHaveAttribute('href', '/cgv');
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/politique-confidentialite');
  });

  it('renders color swatches for each theme', () => {
    const { container } = render(
      <ThemeStep
        data={defaultData}
        onChange={mockOnChange}
        onNext={mockOnNext}
        onBack={mockOnBack}
        lang="en"
      />
    );

    // Each theme card should have color swatches (4 per theme)
    // Plus the check icon in selected theme is also rounded-full
    const colorSwatches = container.querySelectorAll('.rounded-full.w-6.h-6');
    expect(colorSwatches.length).toBeGreaterThanOrEqual(themeList.length * 4);
  });
});
