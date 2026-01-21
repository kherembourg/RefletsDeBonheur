import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopUploaders } from './TopUploaders';
import type { UploaderStats } from '../../lib/statistics';

describe('TopUploaders Component', () => {
  const mockUploaders: UploaderStats[] = [
    {
      name: 'Alice Martin',
      photoCount: 25,
      videoCount: 5,
      totalCount: 30,
      totalReactions: 150,
      percentage: 50,
    },
    {
      name: 'Bob Dupont',
      photoCount: 15,
      videoCount: 3,
      totalCount: 18,
      totalReactions: 90,
      percentage: 30,
    },
    {
      name: 'Claire Bernard',
      photoCount: 10,
      videoCount: 2,
      totalCount: 12,
      totalReactions: 60,
      percentage: 20,
    },
  ];

  describe('Empty State', () => {
    it('should display empty message when no uploaders', () => {
      render(<TopUploaders uploaders={[]} />);

      expect(
        screen.getByText('Aucun uploader pour le moment')
      ).toBeInTheDocument();
    });
  });

  describe('Uploader Display', () => {
    it('should display all uploaders', () => {
      render(<TopUploaders uploaders={mockUploaders} />);

      expect(screen.getByText('Alice Martin')).toBeInTheDocument();
      expect(screen.getByText('Bob Dupont')).toBeInTheDocument();
      expect(screen.getByText('Claire Bernard')).toBeInTheDocument();
    });

    it('should display uploader counts', () => {
      render(<TopUploaders uploaders={mockUploaders} />);

      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should display percentages', () => {
      render(<TopUploaders uploaders={mockUploaders} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument();
      expect(screen.getByText('20%')).toBeInTheDocument();
    });
  });

  describe('Medals', () => {
    it('should display gold medal for first place', () => {
      render(<TopUploaders uploaders={mockUploaders} />);

      expect(screen.getByText('🥇')).toBeInTheDocument();
    });

    it('should display silver medal for second place', () => {
      render(<TopUploaders uploaders={mockUploaders} />);

      expect(screen.getByText('🥈')).toBeInTheDocument();
    });

    it('should display bronze medal for third place', () => {
      render(<TopUploaders uploaders={mockUploaders} />);

      expect(screen.getByText('🥉')).toBeInTheDocument();
    });

    it('should not display medals for positions beyond third', () => {
      const manyUploaders: UploaderStats[] = [
        ...mockUploaders,
        {
          name: 'Fourth User',
          photoCount: 5,
          videoCount: 1,
          totalCount: 6,
          totalReactions: 30,
          percentage: 10,
        },
      ];

      render(<TopUploaders uploaders={manyUploaders} />);

      // Should only have 3 medals
      const medals = screen.getAllByText(/🥇|🥈|🥉/);
      expect(medals).toHaveLength(3);
    });
  });

  describe('Stats Display', () => {
    it('should display photo counts with emoji', () => {
      render(<TopUploaders uploaders={mockUploaders} />);

      // Check for photo emoji and counts
      expect(screen.getAllByText(/📸 25/)).toHaveLength(1);
      expect(screen.getAllByText(/📸 15/)).toHaveLength(1);
    });

    it('should display video counts with emoji', () => {
      render(<TopUploaders uploaders={mockUploaders} />);

      // Check for video emoji and counts
      expect(screen.getAllByText(/🎥 5/)).toHaveLength(1);
      expect(screen.getAllByText(/🎥 3/)).toHaveLength(1);
    });
  });

  describe('Limit Prop', () => {
    it('should respect default limit of 5', () => {
      const manyUploaders: UploaderStats[] = Array.from(
        { length: 10 },
        (_, i) => ({
          name: `User ${i + 1}`,
          photoCount: 10 - i,
          videoCount: 1,
          totalCount: 11 - i,
          totalReactions: 50 - i * 5,
          percentage: 10,
        })
      );

      render(<TopUploaders uploaders={manyUploaders} />);

      // Should only show 5 users
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 5')).toBeInTheDocument();
      expect(screen.queryByText('User 6')).not.toBeInTheDocument();
    });

    it('should respect custom limit', () => {
      render(<TopUploaders uploaders={mockUploaders} limit={2} />);

      expect(screen.getByText('Alice Martin')).toBeInTheDocument();
      expect(screen.getByText('Bob Dupont')).toBeInTheDocument();
      expect(screen.queryByText('Claire Bernard')).not.toBeInTheDocument();
    });

    it('should show "more" indicator when more uploaders exist', () => {
      const manyUploaders: UploaderStats[] = Array.from(
        { length: 8 },
        (_, i) => ({
          name: `User ${i + 1}`,
          photoCount: 10,
          videoCount: 1,
          totalCount: 11,
          totalReactions: 50,
          percentage: 12.5,
        })
      );

      render(<TopUploaders uploaders={manyUploaders} limit={5} />);

      // Should show "+ 3 autres uploaders"
      expect(screen.getByText(/\+ 3 autres uploaders/)).toBeInTheDocument();
    });

    it('should use singular form for "1 autre uploader"', () => {
      const uploaders: UploaderStats[] = Array.from({ length: 6 }, (_, i) => ({
        name: `User ${i + 1}`,
        photoCount: 10,
        videoCount: 1,
        totalCount: 11,
        totalReactions: 50,
        percentage: 16.7,
      }));

      render(<TopUploaders uploaders={uploaders} limit={5} />);

      expect(screen.getByText(/\+ 1 autre uploader$/)).toBeInTheDocument();
    });
  });

  describe('Top Uploader Styling', () => {
    it('should highlight first uploader with special styling', () => {
      const { container } = render(<TopUploaders uploaders={mockUploaders} />);

      // First card should have burgundy-old styling
      const firstCard = container.querySelector('[class*="bg-burgundy-old"]');
      expect(firstCard).toBeInTheDocument();
    });
  });

  describe('Progress Bars', () => {
    it('should render progress bars for each uploader', () => {
      const { container } = render(<TopUploaders uploaders={mockUploaders} />);

      const progressBars = container.querySelectorAll(
        '.h-1\\.5.bg-silver-mist\\/30'
      );
      expect(progressBars).toHaveLength(3);
    });
  });
});
