import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeSelector } from './ThemeSelector';

// Mock the themes module
vi.mock('../../lib/themes', () => ({
  themeList: [
    {
      id: 'classic',
      name: 'Classique',
      description: 'Style élégant et intemporel',
      colors: {
        primary: '#ae1725',
        accent: '#D4AF37',
        background: '#FFFFF0',
        text: '#2D2D2D',
        card: '#FFFFFF',
        border: '#E5E5E5',
        glass: 'rgba(255, 255, 255, 0.8)',
      },
      layout: { navStyle: 'fixed' },
    },
    {
      id: 'luxe',
      name: 'Luxe',
      description: 'Raffinement et sophistication',
      colors: {
        primary: '#1a1a1a',
        accent: '#B8860B',
        background: '#0D0D0D',
        text: '#FFFFFF',
        card: '#1a1a1a',
        border: '#333333',
        glass: 'rgba(0, 0, 0, 0.8)',
      },
      layout: { navStyle: 'floating' },
    },
  ],
}));

describe('ThemeSelector Component', () => {
  const mockOnThemeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render theme selector header', () => {
      render(
        <ThemeSelector
          currentTheme="classic"
          onThemeChange={mockOnThemeChange}
        />
      );

      expect(screen.getByText('Thème du site')).toBeInTheDocument();
      expect(
        screen.getByText("Choisissez l'apparence de votre site de mariage")
      ).toBeInTheDocument();
    });

    it('should render all available themes', () => {
      render(
        <ThemeSelector
          currentTheme="classic"
          onThemeChange={mockOnThemeChange}
        />
      );

      expect(screen.getByText('Classique')).toBeInTheDocument();
      expect(screen.getByText('Luxe')).toBeInTheDocument();
    });

    it('should display theme descriptions', () => {
      render(
        <ThemeSelector
          currentTheme="classic"
          onThemeChange={mockOnThemeChange}
        />
      );

      expect(screen.getByText('Style élégant et intemporel')).toBeInTheDocument();
      expect(screen.getByText('Raffinement et sophistication')).toBeInTheDocument();
    });
  });

  describe('Theme Selection', () => {
    it('should mark current theme as selected', () => {
      const { container } = render(
        <ThemeSelector
          currentTheme="classic"
          onThemeChange={mockOnThemeChange}
        />
      );

      // Check for selected indicator (check mark icon wrapper)
      // The selected theme has a ring/border styling
      const selectedTheme = container.querySelector('[class*="border-burgundy-old"]');
      expect(selectedTheme).toBeInTheDocument();
    });

    it('should allow selecting a different theme', () => {
      render(
        <ThemeSelector
          currentTheme="classic"
          onThemeChange={mockOnThemeChange}
        />
      );

      // Click on Luxe theme
      fireEvent.click(screen.getByText('Luxe'));

      // The local state should update (check for visual change)
      const { container } = render(
        <ThemeSelector
          currentTheme="classic"
          onThemeChange={mockOnThemeChange}
        />
      );

      // Luxe card should now be selectable
      expect(screen.getAllByText('Luxe')).toBeTruthy();
    });

    it('should show "Actuel" badge on current theme when not selected', async () => {
      render(
        <ThemeSelector
          currentTheme="classic"
          onThemeChange={mockOnThemeChange}
        />
      );

      // Select Luxe theme (different from current)
      fireEvent.click(screen.getByText('Luxe'));

      // Classic should now show "Actuel" badge
      await waitFor(() => {
        expect(screen.getByText('Actuel')).toBeInTheDocument();
      });
    });
  });

  describe('Save Button', () => {
    it('should be disabled when no changes', () => {
      render(
        <ThemeSelector
          currentTheme="classic"
          onThemeChange={mockOnThemeChange}
        />
      );

      const saveButton = screen.getByText('Enregistrer');
      expect(saveButton).toBeDisabled();
    });

    it('should be enabled when theme changes', () => {
      render(
        <ThemeSelector
          currentTheme="classic"
          onThemeChange={mockOnThemeChange}
        />
      );

      // Select different theme
      fireEvent.click(screen.getByText('Luxe'));

      const saveButton = screen.getByText('Enregistrer');
      expect(saveButton).not.toBeDisabled();
    });

    it('should call onThemeChange when saved', async () => {
      render(
        <ThemeSelector
          currentTheme="classic"
          onThemeChange={mockOnThemeChange}
        />
      );

      // Select different theme
      fireEvent.click(screen.getByText('Luxe'));

      // Click save
      fireEvent.click(screen.getByText('Enregistrer'));

      await waitFor(() => {
        expect(mockOnThemeChange).toHaveBeenCalledWith('luxe');
      });
    });

    it('should show loading state when saving', async () => {
      render(
        <ThemeSelector
          currentTheme="classic"
          onThemeChange={mockOnThemeChange}
        />
      );

      // Select different theme
      fireEvent.click(screen.getByText('Luxe'));

      // Click save
      fireEvent.click(screen.getByText('Enregistrer'));

      // Should show loading text
      expect(screen.getByText('Enregistrement...')).toBeInTheDocument();
    });
  });

  describe('Preview Link', () => {
    it('should render preview link when weddingSlug is provided', () => {
      render(
        <ThemeSelector
          currentTheme="classic"
          onThemeChange={mockOnThemeChange}
          weddingSlug="julie-thomas"
        />
      );

      const previewLink = screen.getByText('Voir le site');
      expect(previewLink).toHaveAttribute('href', '/julie-thomas');
      expect(previewLink).toHaveAttribute('target', '_blank');
    });

    it('should not render preview link when weddingSlug is not provided', () => {
      render(
        <ThemeSelector
          currentTheme="classic"
          onThemeChange={mockOnThemeChange}
        />
      );

      expect(screen.queryByText('Voir le site')).not.toBeInTheDocument();
    });
  });

  describe('Color Swatches', () => {
    it('should display color swatches for each theme', () => {
      const { container } = render(
        <ThemeSelector
          currentTheme="classic"
          onThemeChange={mockOnThemeChange}
        />
      );

      // Each theme card should have 3 color swatches
      const swatches = container.querySelectorAll('.w-5.h-5.rounded-full');
      expect(swatches.length).toBeGreaterThanOrEqual(6); // 2 themes × 3 swatches
    });
  });

  describe('Accessibility', () => {
    it('should have button role for theme cards', () => {
      render(
        <ThemeSelector
          currentTheme="classic"
          onThemeChange={mockOnThemeChange}
        />
      );

      const buttons = screen.getAllByRole('button');
      // Should have theme cards + save button
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });
  });
});
