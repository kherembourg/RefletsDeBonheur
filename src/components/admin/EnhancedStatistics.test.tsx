import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnhancedStatistics } from './EnhancedStatistics';
import type { EnhancedStatistics as StatsType } from '../../lib/statistics';

// Mock child components
vi.mock('./TimelineGraph', () => ({
  TimelineGraph: ({ data }: { data: any[] }) => (
    <div data-testid="timeline-graph">TimelineGraph: {data.length} days</div>
  ),
}));

vi.mock('./StorageUsage', () => ({
  StorageUsage: () => <div data-testid="storage-usage">StorageUsage</div>,
}));

vi.mock('./TopUploaders', () => ({
  TopUploaders: ({ uploaders }: { uploaders: any[] }) => (
    <div data-testid="top-uploaders">TopUploaders: {uploaders.length} users</div>
  ),
}));

vi.mock('./ReactionBreakdown', () => ({
  ReactionBreakdown: () => <div data-testid="reaction-breakdown">ReactionBreakdown</div>,
}));

describe('EnhancedStatistics Component', () => {
  const mockStats: StatsType = {
    totalPhotos: 100,
    totalVideos: 10,
    totalMedia: 110,
    totalMessages: 25,
    totalFavorites: 50,
    totalReactions: 200,
    estimatedStorageMB: 800,
    estimatedStorageGB: 0.78,
    topUploaders: [
      {
        name: 'Alice',
        photoCount: 30,
        videoCount: 5,
        totalCount: 35,
        totalReactions: 100,
        percentage: 31.8,
      },
      {
        name: 'Bob',
        photoCount: 25,
        videoCount: 3,
        totalCount: 28,
        totalReactions: 75,
        percentage: 25.5,
      },
    ],
    uniqueUploaders: 5,
    uploadsByDay: [
      { date: '2026-01-13', displayDate: '13 Jan', count: 20, photos: 18, videos: 2 },
      { date: '2026-01-14', displayDate: '14 Jan', count: 35, photos: 30, videos: 5 },
    ],
    uploadsByHour: [
      { hour: 14, displayHour: '14:00', count: 25 },
      { hour: 18, displayHour: '18:00', count: 40 },
    ],
    reactionBreakdown: [
      { type: 'love', emoji: '❤️', count: 120, percentage: 60 },
      { type: 'laugh', emoji: '😂', count: 80, percentage: 40 },
    ],
    mostReactedPhotos: [],
    photoVideoRatio: {
      photos: 100,
      videos: 10,
      photoPercentage: 90.9,
      videoPercentage: 9.1,
    },
    peakUploadDay: '14 Jan',
    peakUploadHour: '18:00',
    peakUploadCount: 40,
  };

  describe('Header', () => {
    it('should render title', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      expect(screen.getByText('Statistiques Avancées')).toBeInTheDocument();
    });
  });

  describe('Quick Stats Overview', () => {
    it('should display unique uploaders count', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Contributeurs')).toBeInTheDocument();
    });

    it('should display total reactions', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      expect(screen.getByText('200')).toBeInTheDocument();
      expect(screen.getByText('Réactions')).toBeInTheDocument();
    });

    it('should display peak upload day', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      expect(screen.getByText('14 Jan')).toBeInTheDocument();
      expect(screen.getByText('Jour le + actif')).toBeInTheDocument();
    });

    it('should display peak upload hour', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      expect(screen.getByText('18:00')).toBeInTheDocument();
      expect(screen.getByText('Heure de pointe')).toBeInTheDocument();
    });
  });

  describe('Collapsible Sections', () => {
    it('should have timeline section expanded by default', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      expect(screen.getByTestId('timeline-graph')).toBeInTheDocument();
    });

    it('should have storage section collapsed by default', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      // StorageUsage should not be visible initially
      expect(screen.queryByTestId('storage-usage')).not.toBeInTheDocument();
    });

    it('should toggle timeline section when clicked', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      // Initially expanded
      expect(screen.getByTestId('timeline-graph')).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(screen.getByText('Timeline des Uploads'));

      // Should be collapsed now
      expect(screen.queryByTestId('timeline-graph')).not.toBeInTheDocument();
    });

    it('should expand storage section when clicked', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      // Initially collapsed
      expect(screen.queryByTestId('storage-usage')).not.toBeInTheDocument();

      // Click to expand
      fireEvent.click(screen.getByText('Stockage & Répartition'));

      // Should be expanded now
      expect(screen.getByTestId('storage-usage')).toBeInTheDocument();
    });

    it('should expand uploaders section when clicked', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      // Click to expand
      fireEvent.click(screen.getByText('Contributeurs les Plus Actifs'));

      // Should be expanded
      expect(screen.getByTestId('top-uploaders')).toBeInTheDocument();
    });

    it('should expand reactions section when clicked', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      // Click to expand
      fireEvent.click(screen.getByText('Répartition des Réactions'));

      // Should be expanded
      expect(screen.getByTestId('reaction-breakdown')).toBeInTheDocument();
    });
  });

  describe('Section Headers', () => {
    it('should have Timeline section header', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      expect(screen.getByText('Timeline des Uploads')).toBeInTheDocument();
    });

    it('should have Storage section header', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      expect(screen.getByText('Stockage & Répartition')).toBeInTheDocument();
    });

    it('should have Uploaders section header', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      expect(screen.getByText('Contributeurs les Plus Actifs')).toBeInTheDocument();
    });

    it('should have Reactions section header', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      expect(screen.getByText('Répartition des Réactions')).toBeInTheDocument();
    });
  });

  describe('Multiple Section Toggle', () => {
    it('should allow multiple sections to be expanded', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      // Timeline is already expanded
      expect(screen.getByTestId('timeline-graph')).toBeInTheDocument();

      // Expand storage
      fireEvent.click(screen.getByText('Stockage & Répartition'));

      // Both should be visible
      expect(screen.getByTestId('timeline-graph')).toBeInTheDocument();
      expect(screen.getByTestId('storage-usage')).toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('should display info footer', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      expect(
        screen.getByText(/Les statistiques sont calculées en temps réel/)
      ).toBeInTheDocument();
    });
  });

  describe('Child Component Props', () => {
    it('should pass correct data to TimelineGraph', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      expect(screen.getByText('TimelineGraph: 2 days')).toBeInTheDocument();
    });

    it('should pass correct uploaders to TopUploaders', () => {
      render(<EnhancedStatistics stats={mockStats} />);

      fireEvent.click(screen.getByText('Contributeurs les Plus Actifs'));

      expect(screen.getByText('TopUploaders: 2 users')).toBeInTheDocument();
    });
  });
});
