/**
 * MessageList Component Tests
 * Tests the guestbook message list display
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageList } from './MessageList';
import type { GuestbookEntry } from '../../lib/services/dataService';

const mockMessages: GuestbookEntry[] = [
  {
    id: '1',
    author: 'Jean et Marie',
    text: 'Félicitations pour ce beau mariage ! Nous vous souhaitons tout le bonheur du monde.',
    createdAt: new Date('2026-01-15T14:00:00'),
  },
  {
    id: '2',
    author: 'Pierre Dupont',
    text: 'Quelle magnifique cérémonie ! Longue vie aux mariés.',
    createdAt: new Date('2026-01-16T10:30:00'),
  },
  {
    id: '3',
    author: 'Sophie Martin',
    text: 'Un jour inoubliable, merci de nous avoir permis de partager ce moment.',
    createdAt: new Date('2026-01-17T16:45:00'),
  },
];

describe('MessageList Component', () => {
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('With Messages', () => {
    it('should render all messages', () => {
      render(
        <MessageList
          messages={mockMessages}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      // Check all authors are displayed
      expect(screen.getByText('Jean et Marie')).toBeInTheDocument();
      expect(screen.getByText('Pierre Dupont')).toBeInTheDocument();
      expect(screen.getByText('Sophie Martin')).toBeInTheDocument();
    });

    it('should render message text with quotes', () => {
      render(
        <MessageList
          messages={mockMessages}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      // Messages are wrapped in quotes
      expect(screen.getByText(/Félicitations pour ce beau mariage/)).toBeInTheDocument();
      expect(screen.getByText(/Quelle magnifique cérémonie/)).toBeInTheDocument();
    });

    it('should render author initials', () => {
      render(
        <MessageList
          messages={mockMessages}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      // First letter of author names
      expect(screen.getByText('J')).toBeInTheDocument(); // Jean et Marie
      expect(screen.getByText('P')).toBeInTheDocument(); // Pierre Dupont
      expect(screen.getByText('S')).toBeInTheDocument(); // Sophie Martin
    });

    it('should format dates in French', () => {
      render(
        <MessageList
          messages={mockMessages}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      // Dates should be formatted - use getAllByText since multiple messages have dates
      const dateElements = screen.getAllByText(/janvier 2026/);
      expect(dateElements.length).toBeGreaterThan(0);
    });

    it('should not show delete buttons for non-admin users', () => {
      render(
        <MessageList
          messages={mockMessages}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      const deleteButtons = screen.queryAllByRole('button', { name: /supprimer/i });
      expect(deleteButtons.length).toBe(0);
    });

    it('should show delete buttons for admin users', () => {
      render(
        <MessageList
          messages={mockMessages}
          isAdmin={true}
          onDelete={mockOnDelete}
        />
      );

      const deleteButtons = screen.getAllByRole('button', { name: /supprimer/i });
      expect(deleteButtons.length).toBe(3);
    });

    it('should call onDelete with message id when delete button clicked', () => {
      // Mock confirm to return true
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <MessageList
          messages={mockMessages}
          isAdmin={true}
          onDelete={mockOnDelete}
        />
      );

      const deleteButtons = screen.getAllByRole('button', { name: /supprimer/i });
      fireEvent.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith('Supprimer ce message ?');
      expect(mockOnDelete).toHaveBeenCalledWith('1');
    });

    it('should not call onDelete when delete is cancelled', () => {
      // Mock confirm to return false
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <MessageList
          messages={mockMessages}
          isAdmin={true}
          onDelete={mockOnDelete}
        />
      );

      const deleteButtons = screen.getAllByRole('button', { name: /supprimer/i });
      fireEvent.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no messages', () => {
      render(
        <MessageList
          messages={[]}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      // Check for empty state message
      expect(screen.getByText("Le livre d'or vous attend")).toBeInTheDocument();
      expect(screen.getByText(/Soyez le premier à laisser un message/)).toBeInTheDocument();
    });

    it('should not render grid when no messages', () => {
      const { container } = render(
        <MessageList
          messages={[]}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      // Grid should not exist
      expect(container.querySelector('.grid')).toBeNull();
    });

    it('should have decorative elements in empty state', () => {
      render(
        <MessageList
          messages={[]}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      // Check for hearts (decorative elements)
      expect(screen.getAllByText('❤').length).toBeGreaterThan(0);
    });
  });

  describe('Styling', () => {
    it('should apply animation delays to cards', () => {
      const { container } = render(
        <MessageList
          messages={mockMessages}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      const cards = container.querySelectorAll('.greeting-card');
      expect(cards.length).toBe(3);

      // Check animation delays are progressive
      cards.forEach((card, index) => {
        const style = card.getAttribute('style');
        expect(style).toContain(`animation-delay: ${index * 0.1}s`);
      });
    });

    it('should use different card colors', () => {
      const { container } = render(
        <MessageList
          messages={mockMessages}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      // Cards should have gradient backgrounds
      const gradientCards = container.querySelectorAll('[class*="bg-gradient"]');
      expect(gradientCards.length).toBeGreaterThan(0);
    });
  });
});

describe('MessageList - Edge Cases', () => {
  const mockOnDelete = vi.fn();

  it('should handle single message', () => {
    render(
      <MessageList
        messages={[mockMessages[0]]}
        isAdmin={false}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Jean et Marie')).toBeInTheDocument();
  });

  it('should handle message with special characters', () => {
    const specialMessage: GuestbookEntry = {
      id: 'special',
      author: "L'Équipe & Co.",
      text: 'Message avec des caractères spéciaux: é è à ù ç !',
      createdAt: new Date(),
    };

    render(
      <MessageList
        messages={[specialMessage]}
        isAdmin={false}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText("L'Équipe & Co.")).toBeInTheDocument();
  });

  it('should handle long message text', () => {
    const longMessage: GuestbookEntry = {
      id: 'long',
      author: 'Author',
      text: 'A'.repeat(500),
      createdAt: new Date(),
    };

    render(
      <MessageList
        messages={[longMessage]}
        isAdmin={false}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(`"${'A'.repeat(500)}"`)).toBeInTheDocument();
  });
});
