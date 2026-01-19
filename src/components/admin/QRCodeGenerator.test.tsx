import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QRCodeGenerator } from './QRCodeGenerator';

describe('QRCodeGenerator Component', () => {
  // Store original values
  let originalOpen: typeof window.open;
  let originalFetch: typeof window.fetch;
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

  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Store originals
    originalOpen = window.open;
    originalFetch = window.fetch;
    originalLocation = window.location;

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:4321',
        href: 'http://localhost:4321/admin',
      },
      writable: true,
      configurable: true,
    });

    // Mock window.open
    window.open = mockOpen as any;

    // Mock clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true,
    });

    // Mock fetch
    window.fetch = mockFetch as any;
    mockFetch.mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['mock-image'], { type: 'image/png' })),
    });

    // Mock URL methods
    window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-url');
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    // Restore originals
    window.open = originalOpen;
    window.fetch = originalFetch;
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

    it('should render QR code image', () => {
      render(<QRCodeGenerator />);

      const qrImage = screen.getByAltText('QR Code');
      expect(qrImage).toBeInTheDocument();
      expect(qrImage).toHaveAttribute('src');
      expect(qrImage.getAttribute('src')).toContain('api.qrserver.com');
    });

    it('should display current URL', () => {
      render(<QRCodeGenerator />);

      expect(
        screen.getByText('http://localhost:4321/gallery')
      ).toBeInTheDocument();
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

      const qrImage = screen.getByAltText('QR Code');
      expect(qrImage.getAttribute('src')).toContain('size=400x400');
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

      // Find and click the toggle button
      const toggles = screen.getAllByRole('button');
      const accessCodeToggle = toggles.find((btn) =>
        btn.className.includes('rounded-full')
      );

      if (accessCodeToggle) {
        fireEvent.click(accessCodeToggle);
      }

      // Access code input should be hidden
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

    it('should download QR code when download button clicked', async () => {
      render(<QRCodeGenerator />);

      fireEvent.click(screen.getByText('Télécharger'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
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
          'http://localhost:4321/gallery'
        );
      });
    });
  });

  describe('Usage Tips', () => {
    it('should display usage tips', () => {
      render(<QRCodeGenerator />);

      // Text includes emoji: "💡 Conseils d'utilisation"
      expect(screen.getByText(/Conseils d'utilisation/)).toBeInTheDocument();
      expect(
        screen.getByText(/Imprimez le QR code sur les cartons de table/)
      ).toBeInTheDocument();
    });
  });

  describe('QR Code URL Generation', () => {
    it('should use window.location.origin for QR code URL', () => {
      render(<QRCodeGenerator />);

      const qrImage = screen.getByAltText('QR Code');
      // In browser, component uses window.location.origin which we mocked to localhost:4321
      expect(qrImage.getAttribute('src')).toContain(
        encodeURIComponent('http://localhost:4321/gallery')
      );
    });
  });
});
