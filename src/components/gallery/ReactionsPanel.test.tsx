/**
 * Component Test: ReactionsPanel
 * 
 * Tests for the ReactionsPanel component that displays and manages reactions on media.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ReactionsPanel from './ReactionsPanel';
import { REACTION_EMOJIS } from '../../lib/services/dataService';

// Mock DataService
const mockToggleReaction = vi.fn();
const mockGetUserReaction = vi.fn();
const mockGetReactions = vi.fn();

const mockDataService = {
  toggleReaction: mockToggleReaction,
  getUserReaction: mockGetUserReaction,
  getReactions: mockGetReactions,
};

describe('ReactionsPanel Component', () => {
  const mockReactions = [
    { type: 'heart' as const, count: 5, usernames: ['user1', 'user2'] },
    { type: 'love' as const, count: 3, usernames: ['user3'] },
    { type: 'laugh' as const, count: 1, usernames: ['user4'] },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserReaction.mockReturnValue(null);
    mockGetReactions.mockReturnValue(mockReactions);
    mockToggleReaction.mockReturnValue(true);
  });

  describe('Rendering - Full View', () => {
    it('should render all reaction types', () => {
      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      // Should show all 6 reaction types
      const buttons = screen.getAllByRole('button', { name: /réagir avec/i });
      expect(buttons).toHaveLength(6);
    });

    it('should display reaction emojis', () => {
      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      expect(screen.getByText(REACTION_EMOJIS.heart)).toBeInTheDocument();
      expect(screen.getByText(REACTION_EMOJIS.love)).toBeInTheDocument();
      expect(screen.getByText(REACTION_EMOJIS.laugh)).toBeInTheDocument();
    });

    it('should display reaction counts', () => {
      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should not display count for reactions with zero', () => {
      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      const wowButton = screen.getByLabelText(/réagir avec wow/i);
      expect(wowButton).not.toHaveTextContent(/\d+/);
    });

    it('should show total reaction count', () => {
      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      expect(screen.getByText(/9 réactions/i)).toBeInTheDocument();
    });

    it('should show singular form for single reaction', () => {
      mockGetReactions.mockReturnValue([
        { type: 'heart' as const, count: 1, usernames: ['user1'] },
      ]);

      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      expect(screen.getByText(/1 réaction$/i)).toBeInTheDocument();
    });
  });

  describe('Rendering - Compact View', () => {
    it('should render compact view when specified', () => {
      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
          compact={true}
        />
      );

      // Should only show existing reactions (up to 3)
      const reactionDisplays = screen.getAllByText(/[❤️😍😂]/);
      expect(reactionDisplays.length).toBeLessThanOrEqual(3);
    });

    it('should show add reaction button in compact view', () => {
      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
          compact={true}
        />
      );

      expect(screen.getByLabelText(/ajouter une réaction/i)).toBeInTheDocument();
    });

    it('should limit to 3 reactions in compact view', () => {
      const manyReactions = [
        { type: 'heart' as const, count: 5, usernames: [] },
        { type: 'love' as const, count: 4, usernames: [] },
        { type: 'laugh' as const, count: 3, usernames: [] },
        { type: 'wow' as const, count: 2, usernames: [] },
        { type: 'celebrate' as const, count: 1, usernames: [] },
      ];
      mockGetReactions.mockReturnValue(manyReactions);

      const { container } = render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
          compact={true}
        />
      );

      const reactionElements = container.querySelectorAll('[class*="rounded-full"]');
      // Should be 3 reactions + 1 add button
      expect(reactionElements.length).toBeLessThanOrEqual(4);
    });

    it('should open picker when add button clicked', async () => {
      const user = userEvent.setup();
      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
          compact={true}
        />
      );

      const addButton = screen.getByLabelText(/ajouter une réaction/i);
      await user.click(addButton);

      expect(screen.getByRole('group', { name: /choisir une réaction/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should toggle reaction when button clicked', async () => {
      const user = userEvent.setup();
      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      const heartButton = screen.getByLabelText(/réagir avec heart/i);
      await user.click(heartButton);

      expect(mockToggleReaction).toHaveBeenCalledWith('media-1', 'heart');
    });

    it('should highlight user\'s reaction', () => {
      mockGetUserReaction.mockReturnValue('heart');

      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      const heartButton = screen.getByLabelText(/réagir avec heart/i);
      expect(heartButton).toHaveClass('bg-burgundy-old');
    });

    it('should remove reaction when clicked again', async () => {
      const user = userEvent.setup();
      mockGetUserReaction.mockReturnValue('heart');
      mockToggleReaction.mockReturnValue(false); // Reaction removed

      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      const heartButton = screen.getByLabelText(/réagir avec heart/i);
      await user.click(heartButton);

      expect(mockToggleReaction).toHaveBeenCalledWith('media-1', 'heart');
    });

    it('should update UI after reaction toggle', async () => {
      const user = userEvent.setup();
      mockToggleReaction.mockReturnValue(true);
      mockGetReactions.mockReturnValue([
        { type: 'heart' as const, count: 6, usernames: ['user1', 'user2', 'current'] },
        ...mockReactions.slice(1),
      ]);

      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      const heartButton = screen.getByLabelText(/réagir avec heart/i);
      await user.click(heartButton);

      await waitFor(() => {
        expect(mockGetReactions).toHaveBeenCalled();
      });
    });

    it('should call onReactionChange callback', async () => {
      const user = userEvent.setup();
      const mockOnReactionChange = vi.fn();

      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
          onReactionChange={mockOnReactionChange}
        />
      );

      const heartButton = screen.getByLabelText(/réagir avec heart/i);
      await user.click(heartButton);

      expect(mockOnReactionChange).toHaveBeenCalled();
    });
  });

  describe('Reaction Picker (Compact)', () => {
    it('should show all reactions in picker', async () => {
      const user = userEvent.setup();
      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
          compact={true}
        />
      );

      const addButton = screen.getByLabelText(/ajouter une réaction/i);
      await user.click(addButton);

      const picker = screen.getByRole('group', { name: /choisir une réaction/i });
      const reactionButtons = picker.querySelectorAll('button');
      expect(reactionButtons).toHaveLength(6);
    });

    it('should close picker after selecting reaction', async () => {
      const user = userEvent.setup();
      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
          compact={true}
        />
      );

      const addButton = screen.getByLabelText(/ajouter une réaction/i);
      await user.click(addButton);

      const heartButton = screen.getByLabelText(/réagir avec heart/i);
      await user.click(heartButton);

      await waitFor(() => {
        expect(screen.queryByRole('group', { name: /choisir une réaction/i })).not.toBeInTheDocument();
      });
    });

    it('should close picker when clicking backdrop', async () => {
      const user = userEvent.setup();
      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
          compact={true}
        />
      );

      const addButton = screen.getByLabelText(/ajouter une réaction/i);
      await user.click(addButton);

      expect(screen.getByRole('group', { name: /choisir une réaction/i })).toBeInTheDocument();

      // Click backdrop (the fixed overlay)
      const backdrop = document.querySelector('.fixed.inset-0');
      await user.click(backdrop!);

      await waitFor(() => {
        expect(screen.queryByRole('group', { name: /choisir une réaction/i })).not.toBeInTheDocument();
      });
    });

    it('should highlight user\'s reaction in picker', async () => {
      const user = userEvent.setup();
      mockGetUserReaction.mockReturnValue('love');

      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
          compact={true}
        />
      );

      const addButton = screen.getByLabelText(/ajouter une réaction/i);
      await user.click(addButton);

      const loveButton = screen.getByLabelText(/réagir avec love/i);
      expect(loveButton).toHaveClass('bg-burgundy-old/20');
    });
  });

  describe('Highlighted State', () => {
    it('should show user\'s reaction with special styling', () => {
      mockGetUserReaction.mockReturnValue('heart');

      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      const heartButton = screen.getByLabelText(/réagir avec heart/i);
      expect(heartButton).toHaveClass('bg-burgundy-old');
    });

    it('should show ring around active reaction', () => {
      mockGetUserReaction.mockReturnValue('heart');

      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      const heartButton = screen.getByLabelText(/réagir avec heart/i);
      expect(heartButton).toHaveClass('ring-2');
    });

    it('should show user\'s reaction in compact view', () => {
      mockGetUserReaction.mockReturnValue('heart');

      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
          compact={true}
        />
      );

      const heartReaction = screen.getByText(REACTION_EMOJIS.heart).parentElement;
      expect(heartReaction).toHaveClass('ring-1', 'ring-burgundy-old');
    });
  });

  describe('Demo Mode', () => {
    it('should create default service in demo mode when not provided', () => {
      render(
        <ReactionsPanel
          mediaId="media-1"
          compact={false}
        />
      );

      // Should render without crashing
      expect(screen.getByText(REACTION_EMOJIS.heart)).toBeInTheDocument();
    });

    it('should work with provided dataService', () => {
      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      expect(mockGetUserReaction).toHaveBeenCalledWith('media-1');
      expect(mockGetReactions).toHaveBeenCalledWith('media-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle no reactions', () => {
      mockGetReactions.mockReturnValue([]);

      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      // Should show 0 counts for all reactions
      const buttons = screen.getAllByRole('button', { name: /réagir avec/i });
      buttons.forEach(button => {
        expect(button.textContent).not.toMatch(/[1-9]\d*/);
      });
    });

    it('should not show total count when zero reactions', () => {
      mockGetReactions.mockReturnValue([]);

      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      expect(screen.queryByText(/réaction/i)).not.toBeInTheDocument();
    });

    it('should handle very high reaction counts', () => {
      mockGetReactions.mockReturnValue([
        { type: 'heart' as const, count: 9999, usernames: [] },
      ]);

      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      expect(screen.getByText('9999')).toBeInTheDocument();
    });

    it('should handle missing usernames in reactions', () => {
      mockGetReactions.mockReturnValue([
        { type: 'heart' as const, count: 5 } as any,
      ]);

      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should update when mediaId changes', () => {
      const { rerender } = render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      expect(mockGetUserReaction).toHaveBeenCalledWith('media-1');

      rerender(
        <ReactionsPanel
          mediaId="media-2"
          dataService={mockDataService as any}
        />
      );

      expect(mockGetUserReaction).toHaveBeenCalledWith('media-2');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all reactions', () => {
      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      expect(screen.getByLabelText(/réagir avec heart/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/réagir avec love/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/réagir avec laugh/i)).toBeInTheDocument();
    });

    it('should have proper aria-pressed state', () => {
      mockGetUserReaction.mockReturnValue('heart');

      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
          compact={true}
        />
      );

      const addButton = screen.getByLabelText(/ajouter une réaction/i);
      fireEvent.click(addButton);

      const heartButton = screen.getByLabelText(/réagir avec heart/i);
      expect(heartButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have role group for picker', async () => {
      const user = userEvent.setup();
      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
          compact={true}
        />
      );

      const addButton = screen.getByLabelText(/ajouter une réaction/i);
      await user.click(addButton);

      expect(screen.getByRole('group', { name: /choisir une réaction/i })).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply hover effects', () => {
      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      const heartButton = screen.getByLabelText(/réagir avec heart/i);
      expect(heartButton.className).toContain('hover:');
    });

    it('should show different styles for active reactions', () => {
      mockGetReactions.mockReturnValue([
        { type: 'heart' as const, count: 5, usernames: [] },
        { type: 'love' as const, count: 0, usernames: [] },
      ]);

      render(
        <ReactionsPanel
          mediaId="media-1"
          dataService={mockDataService as any}
        />
      );

      const heartButton = screen.getByLabelText(/réagir avec heart/i);
      const loveButton = screen.getByLabelText(/réagir avec love/i);

      expect(heartButton.className).not.toBe(loveButton.className);
    });
  });
});
