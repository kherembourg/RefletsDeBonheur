import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminButton } from './AdminButton';
import { Plus } from 'lucide-react';

describe('AdminButton', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(<AdminButton>Click me</AdminButton>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should render as a button element', () => {
      render(<AdminButton>Button</AdminButton>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('should apply primary variant by default', () => {
      render(<AdminButton>Primary</AdminButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-burgundy-old');
    });

    it('should apply secondary variant', () => {
      render(<AdminButton variant="secondary">Secondary</AdminButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-charcoal');
    });

    it('should apply outline variant', () => {
      render(<AdminButton variant="outline">Outline</AdminButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('border-2');
    });

    it('should apply ghost variant', () => {
      render(<AdminButton variant="ghost">Ghost</AdminButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('hover:bg-charcoal/5');
    });

    it('should apply danger variant', () => {
      render(<AdminButton variant="danger">Danger</AdminButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-red-600');
    });

    it('should apply success variant', () => {
      render(<AdminButton variant="success">Success</AdminButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-sage');
    });
  });

  describe('sizes', () => {
    it('should apply medium size by default', () => {
      render(<AdminButton>Medium</AdminButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-4');
    });

    it('should apply extra small size', () => {
      render(<AdminButton size="xs">XS</AdminButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-2.5');
    });

    it('should apply small size', () => {
      render(<AdminButton size="sm">Small</AdminButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-3');
    });

    it('should apply large size', () => {
      render(<AdminButton size="lg">Large</AdminButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-5');
    });

    it('should apply extra large size', () => {
      render(<AdminButton size="xl">XL</AdminButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-6');
    });
  });

  describe('icons', () => {
    it('should render left icon', () => {
      render(
        <AdminButton leftIcon={<Plus data-testid="left-icon" />}>
          With Icon
        </AdminButton>
      );
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('should render right icon', () => {
      render(
        <AdminButton rightIcon={<Plus data-testid="right-icon" />}>
          With Icon
        </AdminButton>
      );
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should render both icons', () => {
      render(
        <AdminButton
          leftIcon={<Plus data-testid="left-icon" />}
          rightIcon={<Plus data-testid="right-icon" />}
        >
          Both Icons
        </AdminButton>
      );
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when loading', () => {
      render(<AdminButton loading>Loading</AdminButton>);
      expect(screen.getByText('Chargement...')).toBeInTheDocument();
    });

    it('should disable button when loading', () => {
      render(<AdminButton loading>Loading</AdminButton>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should hide icons when loading', () => {
      render(
        <AdminButton loading leftIcon={<Plus data-testid="icon" />}>
          Loading
        </AdminButton>
      );
      expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<AdminButton disabled>Disabled</AdminButton>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should not fire onClick when disabled', () => {
      const onClick = vi.fn();
      render(
        <AdminButton disabled onClick={onClick}>
          Disabled
        </AdminButton>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('fullWidth', () => {
    it('should apply full width class', () => {
      render(<AdminButton fullWidth>Full Width</AdminButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('w-full');
    });
  });

  describe('click handler', () => {
    it('should call onClick when clicked', () => {
      const onClick = vi.fn();
      render(<AdminButton onClick={onClick}>Click</AdminButton>);

      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      render(<AdminButton className="custom-class">Custom</AdminButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });
  });

  describe('HTML attributes', () => {
    it('should pass through HTML attributes', () => {
      render(
        <AdminButton type="submit" aria-label="Submit form">
          Submit
        </AdminButton>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('aria-label', 'Submit form');
    });
  });
});
