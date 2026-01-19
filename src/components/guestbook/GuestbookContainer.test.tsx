/**
 * GuestbookContainer Component Tests
 * Tests the guestbook container with form and message list
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Define mock data
const mockMessages = [
  { id: '1', author: 'Jean', text: 'Félicitations !', createdAt: new Date('2026-01-15') },
  { id: '2', author: 'Marie', text: 'Bravo aux mariés !', createdAt: new Date('2026-01-16') },
];

// Mock functions
const mockAddMessage = vi.fn().mockResolvedValue({});
const mockDeleteMessage = vi.fn().mockResolvedValue(undefined);
const mockGetMessages = vi.fn().mockResolvedValue(mockMessages);
const mockRefresh = vi.fn();

// Control mock state
let mockLoading = false;
let currentMessages = mockMessages;

// Mock the auth module
vi.mock('../../lib/auth', () => ({
  requireAuth: vi.fn(),
  isAdmin: vi.fn(() => false),
  getUsername: vi.fn(() => ''),
  setUsername: vi.fn(),
}));

// Mock Supabase client
vi.mock('../../lib/supabase/client', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
}));

// Mock the DataService module
vi.mock('../../lib/services/dataService', () => ({
  useDataService: vi.fn(() => ({
    addMessage: mockAddMessage,
    deleteMessage: mockDeleteMessage,
    getMessages: mockGetMessages,
  })),
  useGuestbook: vi.fn(() => ({
    messages: currentMessages,
    loading: mockLoading,
    error: null,
    refresh: mockRefresh,
  })),
}));

import { GuestbookContainer } from './GuestbookContainer';

describe('GuestbookContainer Component', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    currentMessages = mockMessages;
    mockLoading = false;

    // Reset useGuestbook mock to default values
    const { useGuestbook } = await import('../../lib/services/dataService');
    (useGuestbook as any).mockReturnValue({
      messages: mockMessages,
      loading: false,
      error: null,
      refresh: mockRefresh,
    });
  });

  describe('Rendering', () => {
    it('should render the guestbook container', async () => {
      render(<GuestbookContainer demoMode={true} />);

      // Should show the section header
      await waitFor(() => {
        expect(screen.getByText('Les mots de vos proches')).toBeInTheDocument();
      });
    });

    it('should render message count', async () => {
      render(<GuestbookContainer demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText(/2 messages de vœux/)).toBeInTheDocument();
      });
    });

    it('should render the GuestbookForm', async () => {
      render(<GuestbookContainer demoMode={true} />);

      // The form should be present (GuestbookForm has input fields)
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Ex: Lucas/i)).toBeInTheDocument();
      });
    });

    it('should render messages from the list', async () => {
      render(<GuestbookContainer demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText('Jean')).toBeInTheDocument();
        expect(screen.getByText('Marie')).toBeInTheDocument();
      });
    });

    it('should render decorative divider', async () => {
      render(<GuestbookContainer demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText('❧')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state', async () => {
      // Set loading state
      currentMessages = [];
      mockLoading = true;

      // Re-import to get fresh mock values
      const { useGuestbook } = await import('../../lib/services/dataService');
      (useGuestbook as any).mockReturnValue({
        messages: [],
        loading: true,
        error: null,
        refresh: mockRefresh,
      });

      render(<GuestbookContainer demoMode={true} />);

      expect(screen.getByText('Chargement des messages...')).toBeInTheDocument();
    });
  });

  describe('Demo Mode', () => {
    it('should not require auth in demo mode', async () => {
      const { requireAuth } = await import('../../lib/auth');

      render(<GuestbookContainer demoMode={true} />);

      expect(requireAuth).not.toHaveBeenCalled();
    });

    it('should have admin features in demo mode', async () => {
      render(<GuestbookContainer demoMode={true} />);

      // In demo mode, isAdmin should be true after useEffect runs
      // The MessageList should render delete buttons
      await waitFor(
        () => {
          const deleteButtons = screen.queryAllByRole('button', { name: /supprimer/i });
          expect(deleteButtons.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Production Mode', () => {
    it('should require auth when not in demo mode', async () => {
      const { requireAuth } = await import('../../lib/auth');

      render(<GuestbookContainer weddingId="test-wedding" />);

      expect(requireAuth).toHaveBeenCalled();
    });
  });
});

describe('GuestbookContainer - Singular/Plural', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use singular "message" for count of 1', async () => {
    // Re-mock for single message
    const { useGuestbook } = await import('../../lib/services/dataService');
    (useGuestbook as any).mockReturnValue({
      messages: [{ id: '1', author: 'Jean', text: 'Félicitations !', createdAt: new Date() }],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<GuestbookContainer demoMode={true} />);

    await waitFor(() => {
      expect(screen.getByText(/1 message de vœux/)).toBeInTheDocument();
    });
  });
});
