import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminBadge } from './AdminBadge';
import { Check } from 'lucide-react';

describe('AdminBadge', () => {
  describe('rendering', () => {
    it('should render with text', () => {
      render(<AdminBadge>Active</AdminBadge>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(<AdminBadge>Badge Content</AdminBadge>);
      expect(screen.getByText('Badge Content')).toBeInTheDocument();
    });

    it('should render as inline element', () => {
      const { container } = render(<AdminBadge>Test</AdminBadge>);
      const badge = screen.getByText('Test');
      expect(badge.className).toContain('inline-flex');
    });
  });

  describe('variant styles', () => {
    it('should apply default variant by default', () => {
      render(<AdminBadge>Default</AdminBadge>);
      const badge = screen.getByText('Default');
      expect(badge.className).toContain('bg-charcoal/10');
      expect(badge.className).toContain('text-charcoal');
    });

    it('should apply primary variant', () => {
      render(<AdminBadge variant="primary">Primary</AdminBadge>);
      const badge = screen.getByText('Primary');
      expect(badge.className).toContain('bg-burgundy-old/10');
      expect(badge.className).toContain('text-burgundy-old');
    });

    it('should apply success variant', () => {
      render(<AdminBadge variant="success">Success</AdminBadge>);
      const badge = screen.getByText('Success');
      expect(badge.className).toContain('bg-green-100');
      expect(badge.className).toContain('text-green-700');
    });

    it('should apply warning variant', () => {
      render(<AdminBadge variant="warning">Warning</AdminBadge>);
      const badge = screen.getByText('Warning');
      expect(badge.className).toContain('bg-yellow-100');
      expect(badge.className).toContain('text-yellow-700');
    });

    it('should apply error variant', () => {
      render(<AdminBadge variant="error">Error</AdminBadge>);
      const badge = screen.getByText('Error');
      expect(badge.className).toContain('bg-red-100');
      expect(badge.className).toContain('text-red-700');
    });

    it('should apply info variant', () => {
      render(<AdminBadge variant="info">Info</AdminBadge>);
      const badge = screen.getByText('Info');
      expect(badge.className).toContain('bg-blue-100');
      expect(badge.className).toContain('text-blue-700');
    });
  });

  describe('size variants', () => {
    it('should apply medium size by default', () => {
      render(<AdminBadge>Medium</AdminBadge>);
      const badge = screen.getByText('Medium');
      expect(badge.className).toContain('px-2.5');
      expect(badge.className).toContain('text-xs');
    });

    it('should apply small size', () => {
      render(<AdminBadge size="sm">Small</AdminBadge>);
      const badge = screen.getByText('Small');
      expect(badge.className).toContain('px-2');
      expect(badge.className).toContain('text-xs');
    });

    it('should apply large size', () => {
      render(<AdminBadge size="lg">Large</AdminBadge>);
      const badge = screen.getByText('Large');
      expect(badge.className).toContain('px-3');
      expect(badge.className).toContain('text-sm');
    });
  });

  describe('icon support', () => {
    it('should render with icon', () => {
      render(
        <AdminBadge icon={<Check data-testid="badge-icon" />}>
          With Icon
        </AdminBadge>
      );
      
      expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('should render without icon', () => {
      render(<AdminBadge>No Icon</AdminBadge>);
      
      expect(screen.getByText('No Icon')).toBeInTheDocument();
      // Should not have icon wrapper
      const badge = screen.getByText('No Icon');
      expect(badge.querySelectorAll('.shrink-0').length).toBe(0);
    });

    it('should position icon correctly with text', () => {
      render(
        <AdminBadge icon={<Check data-testid="icon" />}>
          Text
        </AdminBadge>
      );
      
      const badge = screen.getByText('Text');
      const icon = screen.getByTestId('icon');
      
      // Icon should be before text (in flex layout)
      expect(badge.className).toContain('gap-1');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      render(<AdminBadge className="custom-badge">Custom</AdminBadge>);
      const badge = screen.getByText('Custom');
      expect(badge.className).toContain('custom-badge');
    });

    it('should merge custom className with default classes', () => {
      render(<AdminBadge className="extra-class">Merged</AdminBadge>);
      const badge = screen.getByText('Merged');
      expect(badge.className).toContain('extra-class');
      expect(badge.className).toContain('rounded-full');
    });
  });

  describe('whitespace handling', () => {
    it('should prevent text wrapping', () => {
      render(<AdminBadge>Long Badge Text</AdminBadge>);
      const badge = screen.getByText('Long Badge Text');
      expect(badge.className).toContain('whitespace-nowrap');
    });
  });

  describe('combined props', () => {
    it('should combine variant, size, and icon', () => {
      render(
        <AdminBadge 
          variant="success" 
          size="lg" 
          icon={<Check data-testid="icon" />}
        >
          Complete
        </AdminBadge>
      );
      
      const badge = screen.getByText('Complete');
      expect(badge.className).toContain('bg-green-100');
      expect(badge.className).toContain('px-3');
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should combine all props including custom className', () => {
      render(
        <AdminBadge 
          variant="error" 
          size="sm" 
          icon={<Check data-testid="icon" />}
          className="extra"
        >
          Error
        </AdminBadge>
      );
      
      const badge = screen.getByText('Error');
      expect(badge.className).toContain('bg-red-100');
      expect(badge.className).toContain('px-2');
      expect(badge.className).toContain('extra');
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });
  });

  describe('semantic structure', () => {
    it('should render as span element', () => {
      const { container } = render(<AdminBadge>Badge</AdminBadge>);
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span?.textContent).toBe('Badge');
    });

    it('should have appropriate font weight', () => {
      render(<AdminBadge>Bold</AdminBadge>);
      const badge = screen.getByText('Bold');
      expect(badge.className).toContain('font-medium');
    });

    it('should have rounded corners', () => {
      render(<AdminBadge>Rounded</AdminBadge>);
      const badge = screen.getByText('Rounded');
      expect(badge.className).toContain('rounded-full');
    });
  });
});
