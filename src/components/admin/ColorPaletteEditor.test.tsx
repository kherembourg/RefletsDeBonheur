import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorPaletteEditor } from './ColorPaletteEditor';
import type { CustomPalette } from '../../lib/customization';

describe('ColorPaletteEditor', () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    themeId: 'classic' as const,
    onChange: mockOnChange,
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('rendering', () => {
    it('should render the color palette editor with title', () => {
      render(<ColorPaletteEditor {...defaultProps} />);
      expect(screen.getByText('Palette de couleurs')).toBeInTheDocument();
    });

    it('should render theme name', () => {
      render(<ColorPaletteEditor {...defaultProps} />);
      expect(screen.getByText(/Personnalisez les couleurs du thème/)).toBeInTheDocument();
    });

    it('should render info tip about default colors', () => {
      render(<ColorPaletteEditor {...defaultProps} />);
      expect(screen.getByText(/Laissez vide pour utiliser la couleur par défaut du thème/)).toBeInTheDocument();
    });

    it('should render all color groups', () => {
      render(<ColorPaletteEditor {...defaultProps} />);
      expect(screen.getByText('Couleurs principales')).toBeInTheDocument();
      expect(screen.getByText('Arrière-plans')).toBeInTheDocument();
      expect(screen.getByText('Texte')).toBeInTheDocument();
      expect(screen.getByText('Autres')).toBeInTheDocument();
    });

    it('should render reset button when colors are customized', () => {
      const customPalette: CustomPalette = { primary: '#ff0000' };
      render(<ColorPaletteEditor {...defaultProps} customPalette={customPalette} />);
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    it('should not render reset button when no colors are customized', () => {
      render(<ColorPaletteEditor {...defaultProps} />);
      expect(screen.queryByText('Reset')).not.toBeInTheDocument();
    });
  });

  describe('color groups expansion', () => {
    it('should have primary group expanded by default', () => {
      render(<ColorPaletteEditor {...defaultProps} />);
      
      // Primary group should be expanded by default
      expect(screen.getByText('Couleur principale')).toBeInTheDocument();
    });

    it('should collapse group when clicked', async () => {
      render(<ColorPaletteEditor {...defaultProps} />);
      const user = userEvent.setup();
      
      const primaryButton = screen.getByRole('button', { name: /Couleurs principales/ });
      
      // Primary group starts expanded
      expect(screen.getByText('Couleur principale')).toBeInTheDocument();
      
      // Collapse it
      await user.click(primaryButton);
      expect(screen.queryByText('Couleur principale')).not.toBeInTheDocument();
    });

    it('should expand and collapse group', async () => {
      render(<ColorPaletteEditor {...defaultProps} />);
      const user = userEvent.setup();
      
      const primaryButton = screen.getByRole('button', { name: /Couleurs principales/ });
      
      // Collapse (starts expanded)
      await user.click(primaryButton);
      expect(screen.queryByText('Couleur principale')).not.toBeInTheDocument();
      
      // Expand again
      await user.click(primaryButton);
      expect(screen.getByText('Couleur principale')).toBeInTheDocument();
    });

    it('should show customization badge on groups with custom colors', () => {
      const customPalette: CustomPalette = { 
        primary: '#ff0000',
        primaryHover: '#ee0000',
      };
      render(<ColorPaletteEditor {...defaultProps} customPalette={customPalette} />);
      
      // Should show count of customized colors in this group
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('color picker interaction', () => {
    it('should call onChange when color picker value changes', () => {
      render(<ColorPaletteEditor {...defaultProps} />);
      
      // Primary group is expanded by default
      const colorInputs = screen.getAllByTitle('Couleur principale');
      fireEvent.change(colorInputs[0], { target: { value: '#ff0000' } });
      
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should display customization indicator on modified colors', () => {
      const customPalette: CustomPalette = { primary: '#ff0000' };
      render(<ColorPaletteEditor {...defaultProps} customPalette={customPalette} />);
      
      // Check for customization indicator (the check icon or red dot)
      const checkIcons = document.querySelectorAll('.text-burgundy');
      expect(checkIcons.length).toBeGreaterThan(0);
    });
  });

  describe('text input for hex colors', () => {
    it('should update color value when text input changes', async () => {
      render(<ColorPaletteEditor {...defaultProps} />);
      const user = userEvent.setup();
      
      // Primary group is expanded by default
      const textInputs = screen.getAllByPlaceholderText(/#[0-9a-f]{6}/i);
      await user.type(textInputs[0], '#00ff00');
      
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should validate hex color format', async () => {
      render(<ColorPaletteEditor {...defaultProps} />);
      const user = userEvent.setup();
      
      // Primary group is expanded by default
      const textInputs = screen.getAllByPlaceholderText(/#[0-9a-f]{6}/i);
      await user.type(textInputs[0], 'invalid');
      
      // Check if error styling is applied (border-red-300)
      const hasErrorStyling = textInputs[0].className.includes('border-red');
      expect(hasErrorStyling).toBe(true);
    });

    it('should accept rgba format colors', () => {
      render(<ColorPaletteEditor {...defaultProps} />);
      
      // Primary group is expanded by default
      const textInputs = screen.getAllByPlaceholderText(/#[0-9a-f]{6}/i);
      fireEvent.change(textInputs[0], { target: { value: 'rgba(255, 0, 0, 0.5)' } });
      
      // Should not show error for valid rgba
      expect(textInputs[0].className).not.toContain('border-red');
    });
  });

  describe('reset functionality', () => {
    it('should reset individual color when reset button clicked', async () => {
      const customPalette: CustomPalette = { primary: '#ff0000' };
      render(<ColorPaletteEditor {...defaultProps} customPalette={customPalette} />);
      const user = userEvent.setup();
      
      // Primary group is expanded by default
      const resetButtons = screen.getAllByTitle('Réinitialiser');
      await user.click(resetButtons[0]);
      
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should reset all colors when main reset button clicked', async () => {
      const customPalette: CustomPalette = { 
        primary: '#ff0000',
        background: '#ffffff',
      };
      render(<ColorPaletteEditor {...defaultProps} customPalette={customPalette} />);
      const user = userEvent.setup();
      
      const resetButton = screen.getByText('Reset');
      await user.click(resetButton);
      
      expect(mockOnChange).toHaveBeenCalledWith(undefined);
    });

    it('should clear errors when reset', async () => {
      const customPalette: CustomPalette = { primary: '#ff0000' };
      render(<ColorPaletteEditor {...defaultProps} customPalette={customPalette} />);
      const user = userEvent.setup();
      
      // Click reset
      await user.click(screen.getByText('Reset'));
      
      // Should clear all custom colors
      expect(mockOnChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe('synchronization with props', () => {
    it('should update when customPalette prop changes', () => {
      const { rerender } = render(<ColorPaletteEditor {...defaultProps} />);
      
      const customPalette: CustomPalette = { primary: '#ff0000' };
      rerender(<ColorPaletteEditor {...defaultProps} customPalette={customPalette} />);
      
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    it('should handle undefined customPalette', () => {
      render(<ColorPaletteEditor {...defaultProps} customPalette={undefined} />);
      expect(screen.queryByText('Reset')).not.toBeInTheDocument();
    });

    it('should handle empty customPalette object', () => {
      render(<ColorPaletteEditor {...defaultProps} customPalette={{}} />);
      expect(screen.queryByText('Reset')).not.toBeInTheDocument();
    });
  });

  describe('onChange callback behavior', () => {
    it('should pass undefined when all colors are reset', async () => {
      const customPalette: CustomPalette = { primary: '#ff0000' };
      render(<ColorPaletteEditor {...defaultProps} customPalette={customPalette} />);
      const user = userEvent.setup();
      
      // Primary group is expanded by default
      const resetButtons = screen.getAllByTitle('Réinitialiser');
      await user.click(resetButtons[0]);
      
      // When last color is removed, should pass undefined
      expect(mockOnChange).toHaveBeenCalledWith(undefined);
    });

    it('should pass palette object with only defined colors', () => {
      render(<ColorPaletteEditor {...defaultProps} />);
      
      // Primary group is expanded by default
      const colorInputs = screen.getAllByTitle('Couleur principale');
      fireEvent.change(colorInputs[0], { target: { value: '#ff0000' } });
      
      // Should pass only the changed color
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ primary: '#ff0000' })
      );
    });
  });
});
