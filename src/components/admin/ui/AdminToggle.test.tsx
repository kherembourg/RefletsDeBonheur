import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminToggle } from './AdminToggle';

describe('AdminToggle', () => {
  describe('rendering', () => {
    it('should render toggle button', () => {
      render(<AdminToggle enabled={false} onChange={() => {}} />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should render label when provided', () => {
      render(
        <AdminToggle
          enabled={false}
          onChange={() => {}}
          label="Enable feature"
        />
      );
      expect(screen.getByText('Enable feature')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(
        <AdminToggle
          enabled={false}
          onChange={() => {}}
          label="Feature"
          description="This is a feature description"
        />
      );
      expect(screen.getByText('This is a feature description')).toBeInTheDocument();
    });
  });

  describe('enabled state', () => {
    it('should reflect enabled=true in aria-checked', () => {
      render(<AdminToggle enabled={true} onChange={() => {}} />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });

    it('should reflect enabled=false in aria-checked', () => {
      render(<AdminToggle enabled={false} onChange={() => {}} />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    });

    it('should apply enabled styles when on', () => {
      render(<AdminToggle enabled={true} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');
      expect(toggle.className).toContain('bg-burgundy-old');
    });

    it('should apply disabled styles when off', () => {
      render(<AdminToggle enabled={false} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');
      expect(toggle.className).toContain('bg-charcoal/20');
    });
  });

  describe('onChange', () => {
    it('should call onChange with true when toggling on', () => {
      const onChange = vi.fn();
      render(<AdminToggle enabled={false} onChange={onChange} />);

      fireEvent.click(screen.getByRole('switch'));
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('should call onChange with false when toggling off', () => {
      const onChange = vi.fn();
      render(<AdminToggle enabled={true} onChange={onChange} />);

      fireEvent.click(screen.getByRole('switch'));
      expect(onChange).toHaveBeenCalledWith(false);
    });

    it('should toggle on Enter key', () => {
      const onChange = vi.fn();
      render(<AdminToggle enabled={false} onChange={onChange} />);

      fireEvent.keyDown(screen.getByRole('switch'), { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('should toggle on Space key', () => {
      const onChange = vi.fn();
      render(<AdminToggle enabled={false} onChange={onChange} />);

      fireEvent.keyDown(screen.getByRole('switch'), { key: ' ' });
      expect(onChange).toHaveBeenCalledWith(true);
    });
  });

  describe('disabled state', () => {
    it('should not call onChange when disabled', () => {
      const onChange = vi.fn();
      render(<AdminToggle enabled={false} onChange={onChange} disabled />);

      fireEvent.click(screen.getByRole('switch'));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<AdminToggle enabled={false} onChange={() => {}} disabled />);
      expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('should apply opacity when disabled', () => {
      render(<AdminToggle enabled={false} onChange={() => {}} disabled />);
      const toggle = screen.getByRole('switch');
      expect(toggle.className).toContain('opacity-50');
    });
  });

  describe('loading state', () => {
    it('should not call onChange when loading', () => {
      const onChange = vi.fn();
      render(<AdminToggle enabled={false} onChange={onChange} loading />);

      fireEvent.click(screen.getByRole('switch'));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should be disabled when loading', () => {
      render(<AdminToggle enabled={false} onChange={() => {}} loading />);
      expect(screen.getByRole('switch')).toBeDisabled();
    });
  });

  describe('sizes', () => {
    it('should apply small size', () => {
      render(<AdminToggle enabled={false} onChange={() => {}} size="sm" />);
      const toggle = screen.getByRole('switch');
      expect(toggle.className).toContain('w-8');
    });

    it('should apply medium size by default', () => {
      render(<AdminToggle enabled={false} onChange={() => {}} />);
      const toggle = screen.getByRole('switch');
      expect(toggle.className).toContain('w-11');
    });

    it('should apply large size', () => {
      render(<AdminToggle enabled={false} onChange={() => {}} size="lg" />);
      const toggle = screen.getByRole('switch');
      expect(toggle.className).toContain('w-14');
    });
  });
});
