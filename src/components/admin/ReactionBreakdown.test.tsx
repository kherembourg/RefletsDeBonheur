import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactionBreakdown } from './ReactionBreakdown';
import type { ReactionStats } from '../../lib/statistics';

describe('ReactionBreakdown Component', () => {
  const mockReactions: ReactionStats[] = [
    { type: 'love', emoji: '❤️', count: 100, percentage: 50 },
    { type: 'laugh', emoji: '😂', count: 60, percentage: 30 },
    { type: 'wow', emoji: '😮', count: 40, percentage: 20 },
  ];

  describe('Empty State', () => {
    it('should display empty message when no reactions', () => {
      render(<ReactionBreakdown reactions={[]} totalReactions={0} />);

      expect(
        screen.getByText('Aucune réaction pour le moment')
      ).toBeInTheDocument();
    });

    it('should display smiley icon in empty state', () => {
      const { container } = render(
        <ReactionBreakdown reactions={[]} totalReactions={0} />
      );

      // Check for the Smile icon (SVG)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Total Reactions Display', () => {
    it('should display total reactions count', () => {
      render(
        <ReactionBreakdown reactions={mockReactions} totalReactions={200} />
      );

      expect(screen.getByText('200')).toBeInTheDocument();
      expect(screen.getByText('Réactions totales')).toBeInTheDocument();
    });
  });

  describe('Reaction Breakdown', () => {
    it('should display all reaction types', () => {
      render(
        <ReactionBreakdown reactions={mockReactions} totalReactions={200} />
      );

      expect(screen.getByText('love')).toBeInTheDocument();
      expect(screen.getByText('laugh')).toBeInTheDocument();
      expect(screen.getByText('wow')).toBeInTheDocument();
    });

    it('should display reaction emojis', () => {
      render(
        <ReactionBreakdown reactions={mockReactions} totalReactions={200} />
      );

      // Emojis appear in both bar section and badges section
      expect(screen.getAllByText('❤️').length).toBeGreaterThan(0);
      expect(screen.getAllByText('😂').length).toBeGreaterThan(0);
      expect(screen.getAllByText('😮').length).toBeGreaterThan(0);
    });

    it('should display reaction counts', () => {
      render(
        <ReactionBreakdown reactions={mockReactions} totalReactions={200} />
      );

      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();
      expect(screen.getByText('40')).toBeInTheDocument();
    });

    it('should display percentages', () => {
      render(
        <ReactionBreakdown reactions={mockReactions} totalReactions={200} />
      );

      expect(screen.getByText('(50%)')).toBeInTheDocument();
      expect(screen.getByText('(30%)')).toBeInTheDocument();
      expect(screen.getByText('(20%)')).toBeInTheDocument();
    });
  });

  describe('Progress Bars', () => {
    it('should render progress bars for each reaction', () => {
      const { container } = render(
        <ReactionBreakdown reactions={mockReactions} totalReactions={200} />
      );

      const progressBars = container.querySelectorAll(
        '.h-2.bg-silver-mist\\/30'
      );
      expect(progressBars).toHaveLength(3);
    });

    it('should scale bars relative to max count', () => {
      const { container } = render(
        <ReactionBreakdown reactions={mockReactions} totalReactions={200} />
      );

      const innerBars = container.querySelectorAll(
        '.h-full.rounded-full.transition-all'
      );

      // First bar should be 100% (100/100), second 60% (60/100), third 40% (40/100)
      expect(innerBars[0]).toHaveStyle({ width: '100%' });
      expect(innerBars[1]).toHaveStyle({ width: '60%' });
      expect(innerBars[2]).toHaveStyle({ width: '40%' });
    });
  });

  describe('Pie Chart Representation', () => {
    it('should render emoji badges with percentages', () => {
      render(
        <ReactionBreakdown reactions={mockReactions} totalReactions={200} />
      );

      // Check for the percentage badges in the pie chart area
      const percentageTexts = screen.getAllByText(/50%|30%|20%/);
      // Should have duplicates - one in the breakdown and one in the pie chart
      expect(percentageTexts.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single reaction type', () => {
      const singleReaction: ReactionStats[] = [
        { type: 'love', emoji: '❤️', count: 100, percentage: 100 },
      ];

      render(
        <ReactionBreakdown reactions={singleReaction} totalReactions={100} />
      );

      // Emoji appears in both bar section and badges section
      expect(screen.getAllByText('❤️').length).toBeGreaterThan(0);
      expect(screen.getByText('love')).toBeInTheDocument();
    });

    it('should handle reactions with same count', () => {
      const equalReactions: ReactionStats[] = [
        { type: 'love', emoji: '❤️', count: 50, percentage: 50 },
        { type: 'laugh', emoji: '😂', count: 50, percentage: 50 },
      ];

      render(
        <ReactionBreakdown reactions={equalReactions} totalReactions={100} />
      );

      // Both should have 100% bar width since they tie for max
      const { container } = render(
        <ReactionBreakdown reactions={equalReactions} totalReactions={100} />
      );

      const innerBars = container.querySelectorAll(
        '.h-full.rounded-full.transition-all'
      );
      expect(innerBars[0]).toHaveStyle({ width: '100%' });
      expect(innerBars[1]).toHaveStyle({ width: '100%' });
    });

    it('should handle decimal percentages by rounding', () => {
      const decimalReactions: ReactionStats[] = [
        { type: 'love', emoji: '❤️', count: 33, percentage: 33.33 },
        { type: 'laugh', emoji: '😂', count: 33, percentage: 33.33 },
        { type: 'wow', emoji: '😮', count: 34, percentage: 33.34 },
      ];

      render(
        <ReactionBreakdown reactions={decimalReactions} totalReactions={100} />
      );

      // Should round percentages
      expect(screen.getAllByText('(33%)')).toHaveLength(3);
    });
  });

  describe('Color Gradient', () => {
    it('should apply different opacity levels to bars', () => {
      const { container } = render(
        <ReactionBreakdown reactions={mockReactions} totalReactions={200} />
      );

      // Check that bars have varying opacity classes
      const bars = container.querySelectorAll('.h-full.rounded-full');
      expect(bars[0]).toHaveClass('bg-[#ae1725]');
      expect(bars[1]).toHaveClass('bg-[#ae1725]/80');
      expect(bars[2]).toHaveClass('bg-[#ae1725]/60');
    });
  });
});
