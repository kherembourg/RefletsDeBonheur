import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StorageUsage } from './StorageUsage';

// Mock the statistics module
vi.mock('../../lib/statistics', () => ({
  formatStorageSize: vi.fn((size: number) => `${size} MB`),
}));

describe('StorageUsage Component', () => {
  const defaultProps = {
    totalMB: 500,
    totalGB: 0.49,
    photoCount: 150,
    videoCount: 5,
    photoVideoRatio: {
      photoPercentage: 75,
      videoPercentage: 25,
    },
  };

  describe('Storage Display', () => {
    it('should display storage in MB when less than 1 GB', () => {
      render(<StorageUsage {...defaultProps} />);

      expect(screen.getByText('500 MB')).toBeInTheDocument();
    });

    it('should display storage in GB when 1 GB or more', () => {
      render(
        <StorageUsage
          {...defaultProps}
          totalMB={2048}
          totalGB={2.0}
        />
      );

      expect(screen.getByText('2.00 GB')).toBeInTheDocument();
    });

    it('should display "Espace utilisé (estimé)" label', () => {
      render(<StorageUsage {...defaultProps} />);

      expect(screen.getByText('Espace utilisé (estimé)')).toBeInTheDocument();
    });
  });

  describe('Photo/Video Breakdown', () => {
    it('should display photo count and percentage', () => {
      render(<StorageUsage {...defaultProps} />);

      expect(screen.getByText('Photos')).toBeInTheDocument();
      expect(screen.getByText('150 • 75%')).toBeInTheDocument();
    });

    it('should display video count and percentage', () => {
      render(<StorageUsage {...defaultProps} />);

      expect(screen.getByText('Vidéos')).toBeInTheDocument();
      expect(screen.getByText('5 • 25%')).toBeInTheDocument();
    });

    it('should handle 100% photos scenario', () => {
      render(
        <StorageUsage
          {...defaultProps}
          photoCount={100}
          videoCount={0}
          photoVideoRatio={{
            photoPercentage: 100,
            videoPercentage: 0,
          }}
        />
      );

      expect(screen.getByText('100 • 100%')).toBeInTheDocument();
      expect(screen.getByText('0 • 0%')).toBeInTheDocument();
    });

    it('should handle equal photo/video split', () => {
      render(
        <StorageUsage
          {...defaultProps}
          photoCount={50}
          videoCount={50}
          photoVideoRatio={{
            photoPercentage: 50,
            videoPercentage: 50,
          }}
        />
      );

      expect(screen.getAllByText('50 • 50%')).toHaveLength(2);
    });
  });

  describe('Progress Bars', () => {
    it('should render progress bars with correct widths', () => {
      const { container } = render(<StorageUsage {...defaultProps} />);

      const progressBars = container.querySelectorAll(
        '.h-full.rounded-full.transition-all'
      );

      expect(progressBars).toHaveLength(2);
      expect(progressBars[0]).toHaveStyle({ width: '75%' });
      expect(progressBars[1]).toHaveStyle({ width: '25%' });
    });
  });

  describe('Info Note', () => {
    it('should display estimation note', () => {
      render(<StorageUsage {...defaultProps} />);

      expect(screen.getByText(/Estimation:/)).toBeInTheDocument();
      expect(screen.getByText(/Photos ~3MB, Vidéos ~50MB/)).toBeInTheDocument();
    });

    it('should display disclaimer about storage variance', () => {
      render(<StorageUsage {...defaultProps} />);

      expect(
        screen.getByText(/Le stockage réel peut varier/)
      ).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero storage', () => {
      render(
        <StorageUsage
          {...defaultProps}
          totalMB={0}
          totalGB={0}
          photoCount={0}
          videoCount={0}
          photoVideoRatio={{
            photoPercentage: 0,
            videoPercentage: 0,
          }}
        />
      );

      expect(screen.getByText('0 MB')).toBeInTheDocument();
      // Both photos and videos show 0 • 0%, so there are 2 elements
      expect(screen.getAllByText('0 • 0%').length).toBe(2);
    });

    it('should handle decimal GB values', () => {
      render(
        <StorageUsage
          {...defaultProps}
          totalMB={1536}
          totalGB={1.5}
        />
      );

      expect(screen.getByText('1.50 GB')).toBeInTheDocument();
    });

    it('should round percentages correctly', () => {
      render(
        <StorageUsage
          {...defaultProps}
          photoVideoRatio={{
            photoPercentage: 66.7,
            videoPercentage: 33.3,
          }}
        />
      );

      // Math.round should be applied
      expect(screen.getByText(/67%/)).toBeInTheDocument();
      expect(screen.getByText(/33%/)).toBeInTheDocument();
    });
  });
});
