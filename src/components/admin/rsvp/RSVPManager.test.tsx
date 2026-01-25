import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RSVPManager } from './RSVPManager';

// Note: localStorage mock is provided by the global test setup (src/test/setup.ts)
// which clears it before each test

describe('RSVPManager', () => {
  const defaultProps = {
    weddingId: 'test-wedding-123',
    demoMode: true,
  };

  describe('rendering', () => {
    it('should render the toggle switch', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        // Multiple switches exist (main toggle + settings toggles)
        const switches = screen.getAllByRole('switch');
        expect(switches.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should render tab navigation', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        // Tab buttons with text - Paramètres, Questions tabs
        expect(screen.getByRole('button', { name: /Paramètres/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Questions/i })).toBeInTheDocument();
      });
    });

    it('should show statistics cards', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        // Statistics labels appear on the page
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
        const switches = screen.getAllByRole('switch');
        expect(switches.length).toBeGreaterThanOrEqual(1);
      });

      // First switch is the main RSVP enabled toggle
      const toggles = screen.getAllByRole('switch');
      const mainToggle = toggles[0];
      const initialState = mainToggle.getAttribute('aria-checked');

      fireEvent.click(mainToggle);

      await waitFor(() => {
        expect(mainToggle.getAttribute('aria-checked')).not.toBe(initialState);
      });
    });

    it('should show save button after making changes', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        const switches = screen.getAllByRole('switch');
        expect(switches.length).toBeGreaterThanOrEqual(1);
      });

      // First switch is the main RSVP enabled toggle
      const toggles = screen.getAllByRole('switch');
      fireEvent.click(toggles[0]);

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
        // Find the tab button with Réponses text (in the nav)
        expect(screen.getByRole('button', { name: /Réponses/i })).toBeInTheDocument();
      });

      // Click the Réponses tab button
      fireEvent.click(screen.getByRole('button', { name: /Réponses/i }));

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
    const clickResponsesTab = () => {
      fireEvent.click(screen.getByRole('button', { name: /Réponses/i }));
    };

    it('should show empty state when no responses', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Réponses/i })).toBeInTheDocument();
      });

      clickResponsesTab();

      await waitFor(() => {
        expect(screen.getByText('Aucune réponse')).toBeInTheDocument();
      });
    });

    it('should show search input', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Réponses/i })).toBeInTheDocument();
      });

      clickResponsesTab();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Rechercher par nom ou email...')).toBeInTheDocument();
      });
    });

    it('should show attendance filter', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Réponses/i })).toBeInTheDocument();
      });

      clickResponsesTab();

      await waitFor(() => {
        expect(screen.getByText('Tous')).toBeInTheDocument();
      });
    });

    it('should show export button', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Réponses/i })).toBeInTheDocument();
      });

      clickResponsesTab();

      await waitFor(() => {
        expect(screen.getByText('Exporter')).toBeInTheDocument();
      });
    });
  });
});
