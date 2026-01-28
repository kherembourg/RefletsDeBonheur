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
        expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Settings/i }));

      await waitFor(() => {
        const switches = screen.getAllByRole('switch');
        expect(switches.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should render tab navigation', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Guest Responses/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Form Builder/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
      });
    });

    it('should show statistics cards', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('RSVP Stats')).toBeInTheDocument();
      });
    });
  });

  describe('toggle functionality', () => {
    it('should toggle RSVP enabled state', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Settings/i }));

      const toggles = await screen.findAllByRole('switch');
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
        expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Settings/i }));

      const toggles = await screen.findAllByRole('switch');
      fireEvent.click(toggles[0]);

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });
    });
  });

  describe('tab navigation', () => {
    it('should switch to settings tab', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Settings/i }));

      await waitFor(() => {
        expect(screen.getByText('Options générales')).toBeInTheDocument();
      });
    });

    it('should switch to questions tab', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Form Builder/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Form Builder/i }));

      await waitFor(() => {
        expect(screen.getByText('Questions personnalisées')).toBeInTheDocument();
      });
    });

    it('should switch to responses tab', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Guest Responses/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Guest Responses/i }));

      await waitFor(() => {
        expect(screen.getByText('Aucune réponse')).toBeInTheDocument();
      });
    });
  });

  describe('settings tab', () => {
    it('should show RSVP enabled toggle', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Settings/i }));

      await waitFor(() => {
        expect(screen.getByText('RSVP activé')).toBeInTheDocument();
      });
    });

    it('should show plus one toggle', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Settings/i }));

      await waitFor(() => {
        expect(screen.getByText('Autoriser les accompagnants')).toBeInTheDocument();
      });
    });

    it('should show dietary restrictions toggle', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Settings/i }));

      await waitFor(() => {
        expect(screen.getByText('Demander les restrictions alimentaires')).toBeInTheDocument();
      });
    });

    it('should show welcome message field', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Settings/i }));

      await waitFor(() => {
        expect(screen.getByText("Message d'accueil")).toBeInTheDocument();
      });
    });

    it('should show thank you message field', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Settings/i }));

      await waitFor(() => {
        expect(screen.getByText('Message de remerciement')).toBeInTheDocument();
      });
    });
  });

  describe('questions tab', () => {
    it('should show empty state when no questions', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Form Builder/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Form Builder/i }));

      await waitFor(() => {
        expect(screen.getByText('Aucune question personnalisée')).toBeInTheDocument();
      });
    });

    it('should show add question buttons', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Form Builder/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Form Builder/i }));

      await waitFor(() => {
        expect(screen.getByText('Champ texte libre')).toBeInTheDocument();
        expect(screen.getByText('Choix unique')).toBeInTheDocument();
        expect(screen.getByText('Choix multiple')).toBeInTheDocument();
      });
    });
  });

  describe('responses tab', () => {
    const clickResponsesTab = () => {
      fireEvent.click(screen.getByRole('button', { name: /Guest Responses/i }));
    };

    it('should show empty state when no responses', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Guest Responses/i })).toBeInTheDocument();
      });

      clickResponsesTab();

      await waitFor(() => {
        expect(screen.getByText('Aucune réponse')).toBeInTheDocument();
      });
    });

    it('should show search input', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Guest Responses/i })).toBeInTheDocument();
      });

      clickResponsesTab();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Rechercher par nom ou email...')).toBeInTheDocument();
      });
    });

    it('should show attendance filter', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Guest Responses/i })).toBeInTheDocument();
      });

      clickResponsesTab();

      await waitFor(() => {
        expect(screen.getByText('Tous')).toBeInTheDocument();
      });
    });

    it('should show export button', async () => {
      render(<RSVPManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Guest Responses/i })).toBeInTheDocument();
      });

      clickResponsesTab();

      await waitFor(() => {
        expect(screen.getByText('Exporter')).toBeInTheDocument();
      });
    });
  });
});
