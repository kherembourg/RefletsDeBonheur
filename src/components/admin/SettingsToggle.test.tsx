import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsToggle } from './SettingsToggle';

describe('SettingsToggle Component', () => {
  describe('Rendering', () => {
    it('should render as a button', () => {
      render(<SettingsToggle enabled={false} onChange={vi.fn()} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have correct aria-label when disabled', () => {
      render(<SettingsToggle enabled={false} onChange={vi.fn()} />);

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Activer les uploads'
      );
    });

    it('should have correct aria-label when enabled', () => {
      render(<SettingsToggle enabled={true} onChange={vi.fn()} />);

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Désactiver les uploads'
      );
    });
  });

  describe('Enabled State', () => {
    it('should apply enabled styling when enabled is true', () => {
      render(<SettingsToggle enabled={true} onChange={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-sage-green');
    });

    it('should apply disabled styling when enabled is false', () => {
      render(<SettingsToggle enabled={false} onChange={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-silver-mist');
    });

    it('should position toggle knob to the right when enabled', () => {
      const { container } = render(
        <SettingsToggle enabled={true} onChange={vi.fn()} />
      );

      const knob = container.querySelector('span');
      expect(knob).toHaveClass('translate-x-6');
    });

    it('should position toggle knob to the left when disabled', () => {
      const { container } = render(
        <SettingsToggle enabled={false} onChange={vi.fn()} />
      );

      const knob = container.querySelector('span');
      expect(knob).toHaveClass('translate-x-1');
    });
  });

  describe('Click Behavior', () => {
    it('should call onChange with true when clicking disabled toggle', () => {
      const handleChange = vi.fn();
      render(<SettingsToggle enabled={false} onChange={handleChange} />);

      fireEvent.click(screen.getByRole('button'));

      expect(handleChange).toHaveBeenCalledWith(true);
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('should call onChange with false when clicking enabled toggle', () => {
      const handleChange = vi.fn();
      render(<SettingsToggle enabled={true} onChange={handleChange} />);

      fireEvent.click(screen.getByRole('button'));

      expect(handleChange).toHaveBeenCalledWith(false);
      expect(handleChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('should be disabled when loading is true', () => {
      render(
        <SettingsToggle enabled={false} onChange={vi.fn()} loading={true} />
      );

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should apply opacity when loading', () => {
      render(
        <SettingsToggle enabled={false} onChange={vi.fn()} loading={true} />
      );

      expect(screen.getByRole('button')).toHaveClass('disabled:opacity-50');
    });

    it('should not call onChange when clicked while loading', () => {
      const handleChange = vi.fn();
      render(
        <SettingsToggle enabled={false} onChange={handleChange} loading={true} />
      );

      fireEvent.click(screen.getByRole('button'));

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('should be enabled when loading is false', () => {
      render(
        <SettingsToggle enabled={false} onChange={vi.fn()} loading={false} />
      );

      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('should default loading to false when not provided', () => {
      render(<SettingsToggle enabled={false} onChange={vi.fn()} />);

      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });
});
