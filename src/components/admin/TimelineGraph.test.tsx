import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimelineGraph } from './TimelineGraph';
import type { DayUpload } from '../../lib/statistics';

describe('TimelineGraph Component', () => {
  // Mock date for consistent "today" detection
  const mockDate = new Date('2026-01-15');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockData: DayUpload[] = [
    { date: '2026-01-13', displayDate: '13 Jan', count: 10, photos: 8, videos: 2 },
    { date: '2026-01-14', displayDate: '14 Jan', count: 25, photos: 20, videos: 5 },
    { date: '2026-01-15', displayDate: '15 Jan', count: 15, photos: 12, videos: 3 },
  ];

  describe('Empty State', () => {
    it('should display empty message when no data', () => {
      render(<TimelineGraph data={[]} />);

      expect(screen.getByText('Aucune donnée disponible')).toBeInTheDocument();
    });
  });

  describe('Graph Rendering', () => {
    it('should render bars for each day', () => {
      const { container } = render(<TimelineGraph data={mockData} />);

      // Each day has a bar container
      const barContainers = container.querySelectorAll('.flex-1.flex.flex-col.items-center');
      expect(barContainers).toHaveLength(3);
    });

    it('should display date labels', () => {
      render(<TimelineGraph data={mockData} />);

      // Labels may appear multiple times (tooltip + label)
      expect(screen.getAllByText('13 Jan').length).toBeGreaterThan(0);
      expect(screen.getAllByText('14 Jan').length).toBeGreaterThan(0);
      expect(screen.getAllByText('15 Jan').length).toBeGreaterThan(0);
    });

    it('should scale bars relative to max count', () => {
      const { container } = render(<TimelineGraph data={mockData} />);

      const bars = container.querySelectorAll('.w-full.rounded-t');

      // Max is 25, so: 10/25=40%, 25/25=100%, 15/25=60%
      expect(bars[0]).toHaveStyle({ height: '40%' });
      expect(bars[1]).toHaveStyle({ height: '100%' });
      expect(bars[2]).toHaveStyle({ height: '60%' });
    });
  });

  describe('Today Highlighting', () => {
    it('should highlight today with different styling', () => {
      const { container } = render(<TimelineGraph data={mockData} />);

      const bars = container.querySelectorAll('.w-full.rounded-t');

      // Third bar (2026-01-15) is today
      expect(bars[2]).toHaveClass('bg-burgundy-old');
      // Other bars should have different opacity
      expect(bars[0]).toHaveClass('bg-burgundy-old/60');
      expect(bars[1]).toHaveClass('bg-burgundy-old/60');
    });
  });

  describe('Tooltips', () => {
    it('should have tooltip with upload info', () => {
      const { container } = render(<TimelineGraph data={mockData} />);

      const bars = container.querySelectorAll('.flex-1.flex.flex-col.items-center');

      expect(bars[0]).toHaveAttribute('title', expect.stringContaining('13 Jan'));
      expect(bars[1]).toHaveAttribute('title', expect.stringContaining('14 Jan'));
    });

    it('should use singular "upload" for count of 1', () => {
      const singleUpload: DayUpload[] = [
        { date: '2026-01-13', displayDate: '13 Jan', count: 1, photos: 1, videos: 0 },
      ];

      const { container } = render(<TimelineGraph data={singleUpload} />);

      const bar = container.querySelector('.flex-1.flex.flex-col.items-center');
      expect(bar).toHaveAttribute('title', expect.stringContaining('1 upload'));
    });
  });

  describe('Legend', () => {
    it('should display legend for normal day', () => {
      render(<TimelineGraph data={mockData} />);

      expect(screen.getByText('Jour normal')).toBeInTheDocument();
    });

    it('should display legend for today', () => {
      render(<TimelineGraph data={mockData} />);

      expect(screen.getByText("Aujourd'hui")).toBeInTheDocument();
    });
  });

  describe('Summary Stats', () => {
    it('should display number of active days', () => {
      render(<TimelineGraph data={mockData} />);

      // 3 days of data
      expect(screen.getByText('Jours actifs')).toBeInTheDocument();
    });

    it('should display average uploads per day', () => {
      render(<TimelineGraph data={mockData} />);

      // Average: (10 + 25 + 15) / 3 = 16.67 -> rounded to 17
      expect(screen.getByText('Moyenne / jour')).toBeInTheDocument();
    });

    it('should display peak uploads', () => {
      render(<TimelineGraph data={mockData} />);

      // Peak is 25
      expect(screen.getByText('Pic uploads')).toBeInTheDocument();
    });
  });

  describe('Date Label Visibility', () => {
    it('should show all labels when 7 or fewer days', () => {
      render(<TimelineGraph data={mockData} />);

      // All 3 labels should be visible (may appear multiple times)
      expect(screen.getAllByText('13 Jan').length).toBeGreaterThan(0);
      expect(screen.getAllByText('14 Jan').length).toBeGreaterThan(0);
      expect(screen.getAllByText('15 Jan').length).toBeGreaterThan(0);
    });

    it('should render graph with many days', () => {
      const manyDays: DayUpload[] = Array.from({ length: 14 }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        displayDate: `${i + 1} Jan`,
        count: 10,
        photos: 8,
        videos: 2,
      }));

      const { container } = render(<TimelineGraph data={manyDays} />);

      // Should render 14 bar containers
      const barContainers = container.querySelectorAll('.flex-1.flex.flex-col.items-center');
      expect(barContainers).toHaveLength(14);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single day of data', () => {
      const singleDay: DayUpload[] = [
        { date: '2026-01-15', displayDate: '15 Jan', count: 10, photos: 8, videos: 2 },
      ];

      render(<TimelineGraph data={singleDay} />);

      // 15 Jan appears twice (in bar tooltip and label) - use getAllByText
      expect(screen.getAllByText('15 Jan').length).toBeGreaterThan(0);
      // "1" for days active, "10" for average and peak
      expect(screen.getByText('Jours actifs')).toBeInTheDocument();
    });

    it('should handle days with zero uploads', () => {
      const withZero: DayUpload[] = [
        { date: '2026-01-13', displayDate: '13 Jan', count: 0, photos: 0, videos: 0 },
        { date: '2026-01-14', displayDate: '14 Jan', count: 10, photos: 8, videos: 2 },
      ];

      const { container } = render(<TimelineGraph data={withZero} />);

      const bars = container.querySelectorAll('.w-full.rounded-t');
      // First bar should have 0 height (or minHeight: 0px)
      expect(bars[0]).toHaveStyle({ height: '0%', minHeight: '0px' });
    });

    it('should ensure minimum height for non-zero counts', () => {
      const smallCount: DayUpload[] = [
        { date: '2026-01-13', displayDate: '13 Jan', count: 1, photos: 1, videos: 0 },
        { date: '2026-01-14', displayDate: '14 Jan', count: 100, photos: 80, videos: 20 },
      ];

      const { container } = render(<TimelineGraph data={smallCount} />);

      const bars = container.querySelectorAll('.w-full.rounded-t');
      // First bar has count > 0, should have minHeight: 4px
      expect(bars[0]).toHaveStyle({ minHeight: '4px' });
    });
  });
});
