import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RSVPManager } from './RSVPManager';

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('RSVPManager', () => {
  const defaultProps = {
    weddingId: 'test-wedding-123',
    demoMode: true,
  };

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the toggle switch', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument();
      });
    });

    it('should render tab navigation', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Paramètres')).toBeInTheDocument();
        expect(screen.getByText('Questions')).toBeInTheDocument();
        expect(screen.getByText('Réponses')).toBeInTheDocument();
      });
    });

    it('should show statistics cards', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Réponses')).toBeInTheDocument();
        expect(screen.getByText('Présents')).toBeInTheDocument();
        expect(screen.getByText('Absents')).toBeInTheDocument();
        expect(screen.getByText('Convives')).toBeInTheDocument();
      });
    });
  });

  describe('toggle functionality', () => {
    it('should toggle RSVP enabled state', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch');
      const initialState = toggle.getAttribute('aria-checked');

      fireEvent.click(toggle);

      await waitFor(() => {
        expect(toggle.getAttribute('aria-checked')).not.toBe(initialState);
      });
    });

    it('should show save button after making changes', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('switch'));

      await waitFor(() => {
        expect(screen.getByText('Enregistrer')).toBeInTheDocument();
      });
    });
  });

  describe('tab navigation', () => {
    it('should switch to settings tab', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Paramètres')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Paramètres'));

      await waitFor(() => {
        expect(screen.getByText('Options générales')).toBeInTheDocument();
      });
    });

    it('should switch to questions tab', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Questions')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Questions'));

      await waitFor(() => {
        expect(screen.getByText('Questions personnalisées')).toBeInTheDocument();
      });
    });

    it('should switch to responses tab', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Réponses')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Réponses'));

      await waitFor(() => {
        expect(screen.getByText('Aucune réponse')).toBeInTheDocument();
      });
    });
  });

  describe('settings tab', () => {
    it('should show deadline input', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Paramètres')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Paramètres'));

      await waitFor(() => {
        expect(screen.getByText('Date limite de réponse')).toBeInTheDocument();
      });
    });

    it('should show plus one toggle', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Paramètres')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Paramètres'));

      await waitFor(() => {
        expect(screen.getByText('Autoriser les accompagnants')).toBeInTheDocument();
      });
    });

    it('should show dietary restrictions toggle', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Paramètres')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Paramètres'));

      await waitFor(() => {
        expect(screen.getByText('Demander les restrictions alimentaires')).toBeInTheDocument();
      });
    });

    it('should show welcome message field', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Paramètres')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Paramètres'));

      await waitFor(() => {
        expect(screen.getByText("Message d'accueil")).toBeInTheDocument();
      });
    });

    it('should show thank you message field', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Paramètres')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Paramètres'));

      await waitFor(() => {
        expect(screen.getByText('Message de remerciement')).toBeInTheDocument();
      });
    });
  });

  describe('questions tab', () => {
    it('should show empty state when no questions', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Questions')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Questions'));

      await waitFor(() => {
        expect(screen.getByText('Aucune question personnalisée')).toBeInTheDocument();
      });
    });

    it('should show add question buttons', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Questions')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Questions'));

      await waitFor(() => {
        expect(screen.getByText('Champ texte libre')).toBeInTheDocument();
        expect(screen.getByText('Choix unique')).toBeInTheDocument();
        expect(screen.getByText('Choix multiple')).toBeInTheDocument();
      });
    });
  });

  describe('responses tab', () => {
    it('should show empty state when no responses', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Réponses')).toBeInTheDocument();
      });

      // Click on Réponses tab specifically (not the stat card)
      const tabs = screen.getAllByText('Réponses');
      fireEvent.click(tabs[0]); // First one should be the tab

      await waitFor(() => {
        expect(screen.getByText('Aucune réponse')).toBeInTheDocument();
      });
    });

    it('should show search input', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Réponses')).toBeInTheDocument();
      });

      const tabs = screen.getAllByText('Réponses');
      fireEvent.click(tabs[0]);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Rechercher par nom ou email...')).toBeInTheDocument();
      });
    });

    it('should show attendance filter', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Réponses')).toBeInTheDocument();
      });

      const tabs = screen.getAllByText('Réponses');
      fireEvent.click(tabs[0]);

      await waitFor(() => {
        expect(screen.getByText('Tous')).toBeInTheDocument();
      });
    });

    it('should show export button', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Réponses')).toBeInTheDocument();
      });

      const tabs = screen.getAllByText('Réponses');
      fireEvent.click(tabs[0]);

      await waitFor(() => {
        expect(screen.getByText('Exporter')).toBeInTheDocument();
      });
    });
  });
});
