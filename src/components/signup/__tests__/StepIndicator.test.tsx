import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepIndicator, type Step } from '../StepIndicator';

const steps: Step[] = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'URL' },
  { id: 4, label: 'Theme' },
];

describe('StepIndicator', () => {
  it('renders all step labels on desktop', () => {
    render(<StepIndicator steps={steps} currentStep={1} />);

    steps.forEach((step) => {
      expect(screen.getAllByText(step.label).length).toBeGreaterThan(0);
    });
  });

  it('shows current step as active', () => {
    const { container } = render(<StepIndicator steps={steps} currentStep={2} />);

    // Step 2 should be highlighted (has ring class)
    const stepCircles = container.querySelectorAll('.ring-4');
    expect(stepCircles.length).toBe(1);
  });

  it('shows completed steps with checkmark', () => {
    const { container } = render(<StepIndicator steps={steps} currentStep={3} />);

    // Steps 1 and 2 are completed, should have check icons
    // The checkmark is an SVG inside completed steps
    const completedSteps = container.querySelectorAll('.bg-burgundy-old');
    expect(completedSteps.length).toBeGreaterThan(0);
  });

  it('shows mobile progress bar', () => {
    const { container } = render(<StepIndicator steps={steps} currentStep={2} />);

    // Mobile view shows "Step X of Y"
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
  });

  it('updates progress bar width based on current step', () => {
    const { container } = render(<StepIndicator steps={steps} currentStep={3} />);

    // Progress should be 75% (3/4)
    const progressBar = container.querySelector('[style*="width: 75%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <StepIndicator steps={steps} currentStep={1} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
