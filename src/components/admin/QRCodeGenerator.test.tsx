import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QRCodeGenerator } from './QRCodeGenerator';

// Mock qrcode.react to render a testable element
vi.mock('qrcode.react', () => ({
  QRCodeSVG: vi.fn((props: any) => (
    <svg data-testid="qr-svg" data-value={props.value} data-size={props.size}>
      <rect />
    </svg>
  )),
}));

describe('QRCodeGenerator Component', () => {
  let originalOpen: typeof window.open;
  let originalLocation: Location;

  const mockOpen = vi.fn(() => ({
    document: {
      write: vi.fn(),
      close: vi.fn(),
    },
    print: vi.fn(),
  }));

  const mockClipboard = {
    writeText: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    originalOpen = window.open;
    originalLocation = window.location;

    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:4321',
        href: 'http://localhost:4321/admin',
      },
      writable: true,
      configurable: true,
    });

    window.open = mockOpen as any;

    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    window.open = originalOpen;
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  describe('Rendering', () => {
    it('should render QR code generator title', () => {
      render(<QRCodeGenerator />);

      expect(screen.getByText('QR Code Galerie')).toBeInTheDocument();
      expect(
        screen.getByText("Facilitez l'accès à vos invités")
      ).toBeInTheDocument();
    });

    it('should render QRCodeSVG component', () => {
      render(<QRCodeGenerator />);

      expect(screen.getByTestId('qr-svg')).toBeInTheDocument();
    });

    it('should display gallery URL for demo mode (no slug)', () => {
      render(<QRCodeGenerator />);

      expect(
        screen.getByText('http://localhost:4321/demo_gallery')
      ).toBeInTheDocument();
    });

    it('should display correct URL with weddingSlug', () => {
      render(<QRCodeGenerator weddingSlug="julie-thomas" />);

      expect(
        screen.getByText('http://localhost:4321/julie-thomas/photos')
      ).toBeInTheDocument();
    });

    it('should pass correct value to QRCodeSVG', () => {
      render(<QRCodeGenerator weddingSlug="julie-thomas" />);

      const svg = screen.getByTestId('qr-svg');
      expect(svg.getAttribute('data-value')).toBe('http://localhost:4321/julie-thomas/photos');
    });
  });

  describe('Size Selector', () => {
    it('should have size dropdown', () => {
      render(<QRCodeGenerator />);

      expect(screen.getByText('Taille du QR Code')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should have size options', () => {
      render(<QRCodeGenerator />);

      expect(screen.getByText('Petit (200x200)')).toBeInTheDocument();
      expect(screen.getByText('Moyen (300x300)')).toBeInTheDocument();
      expect(screen.getByText('Grand (400x400)')).toBeInTheDocument();
      expect(screen.getByText('Très grand (500x500)')).toBeInTheDocument();
    });

    it('should update QR code size when changed', () => {
      render(<QRCodeGenerator />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '400' } });

      const svg = screen.getByTestId('qr-svg');
      expect(svg.getAttribute('data-size')).toBe('400');
    });
  });

  describe('Access Code Toggle', () => {
    it('should have toggle for including access code', () => {
      render(<QRCodeGenerator />);

      expect(
        screen.getByText("Inclure le code d'accès sur l'impression")
      ).toBeInTheDocument();
    });

    it('should show access code input when toggle is on', () => {
      render(<QRCodeGenerator />);

      expect(screen.getByDisplayValue('MARIAGE2026')).toBeInTheDocument();
    });

    it('should hide access code input when toggle is off', () => {
      render(<QRCodeGenerator />);

      const toggles = screen.getAllByRole('button');
      const accessCodeToggle = toggles.find((btn) =>
        btn.className.includes('rounded-full')
      );

      if (accessCodeToggle) {
        fireEvent.click(accessCodeToggle);
      }

      expect(screen.queryByDisplayValue('MARIAGE2026')).not.toBeInTheDocument();
    });

    it('should allow editing access code', () => {
      render(<QRCodeGenerator />);

      const input = screen.getByDisplayValue('MARIAGE2026');
      fireEvent.change(input, { target: { value: 'NEWCODE2026' } });

      expect(screen.getByDisplayValue('NEWCODE2026')).toBeInTheDocument();
    });

    it('should convert access code to uppercase', () => {
      render(<QRCodeGenerator />);

      const input = screen.getByDisplayValue('MARIAGE2026');
      fireEvent.change(input, { target: { value: 'lowercase' } });

      expect(screen.getByDisplayValue('LOWERCASE')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should have download button', () => {
      render(<QRCodeGenerator />);

      expect(screen.getByText('Télécharger')).toBeInTheDocument();
    });

    it('should have print button', () => {
      render(<QRCodeGenerator />);

      expect(screen.getByText('Imprimer')).toBeInTheDocument();
    });

    it('should have copy URL button', () => {
      render(<QRCodeGenerator />);

      expect(screen.getByText('Copier URL')).toBeInTheDocument();
    });

    it('should open print window when print button clicked', () => {
      render(<QRCodeGenerator />);

      fireEvent.click(screen.getByText('Imprimer'));

      expect(mockOpen).toHaveBeenCalledWith('', '_blank');
    });

    it('should copy URL to clipboard when copy button clicked', async () => {
      render(<QRCodeGenerator />);

      fireEvent.click(screen.getByText('Copier URL'));

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          'http://localhost:4321/demo_gallery'
        );
      });
    });
  });

  describe('Usage Tips', () => {
    it('should display usage tips', () => {
      render(<QRCodeGenerator />);

      expect(screen.getByText(/Conseils d'utilisation/)).toBeInTheDocument();
      expect(
        screen.getByText(/Imprimez le QR code sur les cartons de table/)
      ).toBeInTheDocument();
    });
  });
});
