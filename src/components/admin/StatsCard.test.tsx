import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsCard } from './StatsCard';
import { Heart } from 'lucide-react';

describe('StatsCard Component', () => {
  describe('Basic Rendering', () => {
    it('should render label and numeric value', () => {
      render(<StatsCard label="Photos" value={42} />);

      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Photos')).toBeInTheDocument();
    });

    it('should render label and string value', () => {
      render(<StatsCard label="Status" value="Active" />);

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should render zero value correctly', () => {
      render(<StatsCard label="Messages" value={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('Messages')).toBeInTheDocument();
    });
  });

  describe('Icon Rendering', () => {
    it('should render with icon when provided', () => {
      render(
        <StatsCard
          label="Favoris"
          value={10}
          icon={<Heart data-testid="heart-icon" />}
        />
      );

      expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
    });

    it('should render without icon when not provided', () => {
      const { container } = render(<StatsCard label="Count" value={5} />);

      // Should not have the icon container div when no icon
      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have correct base classes', () => {
      const { container } = render(<StatsCard label="Test" value={1} />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-4', 'border-2', 'rounded-lg', 'text-center');
    });

    it('should display value with correct styling', () => {
      render(<StatsCard label="Photos" value={100} />);

      const valueElement = screen.getByText('100');
      expect(valueElement).toHaveClass('text-3xl', 'font-bold');
    });

    it('should display label with correct styling', () => {
      render(<StatsCard label="PHOTOS" value={100} />);

      const labelElement = screen.getByText('PHOTOS');
      expect(labelElement).toHaveClass('text-xs', 'uppercase', 'tracking-wide');
    });
  });

  describe('Large Numbers', () => {
    it('should handle large numeric values', () => {
      render(<StatsCard label="Total" value={1000000} />);

      expect(screen.getByText('1000000')).toBeInTheDocument();
    });

    it('should handle formatted string values', () => {
      render(<StatsCard label="Storage" value="2.5 GB" />);

      expect(screen.getByText('2.5 GB')).toBeInTheDocument();
    });
  });
});
