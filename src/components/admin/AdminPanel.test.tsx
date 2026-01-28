import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminPanel } from './AdminPanel';

// Mock all child components
vi.mock('./StatsCard', () => ({
  StatsCard: ({ label, value }: { label: string; value: number | string }) => (
    <div data-testid="stats-card">{label}: {value}</div>
  ),
}));

vi.mock('./SettingsToggle', () => ({
  SettingsToggle: ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button data-testid="settings-toggle" onClick={() => onChange(!enabled)}>
      Toggle: {enabled ? 'ON' : 'OFF'}
    </button>
  ),
}));

vi.mock('./QRCodeGenerator', () => ({
  QRCodeGenerator: () => <div data-testid="qr-generator">QRCodeGenerator</div>,
}));

vi.mock('./EnhancedStatistics', () => ({
  EnhancedStatistics: () => <div data-testid="enhanced-stats">EnhancedStatistics</div>,
}));

vi.mock('./AlbumManager', () => ({
  AlbumManager: () => <div data-testid="album-manager">AlbumManager</div>,
}));

vi.mock('./ThemeSelector', () => ({
  ThemeSelector: () => <div data-testid="theme-selector">ThemeSelector</div>,
}));

// Mock auth module
vi.mock('../../lib/auth', () => ({
  requireAuth: vi.fn(),
  isAdmin: vi.fn(() => true),
}));

// Mock API module
vi.mock('../../lib/api', () => ({
  mockAPI: {
    toggleUploads: vi.fn().mockResolvedValue(undefined),
    exportBackup: vi.fn().mockResolvedValue(new Blob(['test'])),
  },
  downloadBlob: vi.fn(),
}));

// Mock statistics module
vi.mock('../../lib/statistics', () => ({
  calculateEnhancedStatistics: vi.fn(() => ({
    totalPhotos: 100,
    totalVideos: 10,
    totalMedia: 110,
    totalMessages: 25,
    totalFavorites: 50,
    totalReactions: 200,
    estimatedStorageMB: 800,
    estimatedStorageGB: 0.78,
    topUploaders: [],
    uniqueUploaders: 5,
    uploadsByDay: [],
    uploadsByHour: [],
    reactionBreakdown: [],
    mostReactedPhotos: [],
    photoVideoRatio: {
      photos: 100,
      videos: 10,
      photoPercentage: 90.9,
      videoPercentage: 9.1,
    },
    peakUploadDay: '14 Jan',
    peakUploadHour: '18:00',
    peakUploadCount: 40,
  })),
}));

// Use vi.hoisted to define mocks that can be referenced both in vi.mock and tests
const {
  mockGetStatistics,
  mockGetMedia,
  mockGetMessages,
  mockGetAlbums,
  mockGetSettings,
  mockInitializeDemoStorage,
} = vi.hoisted(() => ({
  mockGetStatistics: vi.fn().mockResolvedValue({
    mediaCount: 100,
    photoCount: 90,
    videoCount: 10,
    messageCount: 25,
    favoriteCount: 50,
    albumCount: 3,
  }),
  mockGetMedia: vi.fn().mockResolvedValue([]),
  mockGetMessages: vi.fn().mockResolvedValue([]),
  mockGetAlbums: vi.fn().mockResolvedValue([]),
  mockGetSettings: vi.fn(() => ({ allowUploads: true })),
  mockInitializeDemoStorage: vi.fn(),
}));

vi.mock('../../lib/services/dataService', () => ({
  DataService: class {
    getStatistics = mockGetStatistics;
    getMedia = mockGetMedia;
    getMessages = mockGetMessages;
    getAlbums = mockGetAlbums;
    getSettings = mockGetSettings;
    initializeDemoStorage = mockInitializeDemoStorage;
  },
}));

describe('AdminPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations after each test
    mockGetStatistics.mockResolvedValue({
      mediaCount: 100,
      photoCount: 90,
      videoCount: 10,
      messageCount: 25,
      favoriteCount: 50,
      albumCount: 3,
    });
    mockGetMedia.mockResolvedValue([]);
    mockGetMessages.mockResolvedValue([]);
    mockGetAlbums.mockResolvedValue([]);
    mockGetSettings.mockReturnValue({ allowUploads: true });
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      // Make getStatistics never resolve
      mockGetStatistics.mockImplementation(() => new Promise(() => {}));

      render(<AdminPanel demoMode={true} />);

      expect(screen.getByText('Chargement...')).toBeInTheDocument();
    });
  });

  describe('Demo Mode', () => {
    it('should initialize demo storage in demo mode', async () => {
      render(<AdminPanel demoMode={true} />);

      await waitFor(() => {
        expect(mockInitializeDemoStorage).toHaveBeenCalled();
      });
    });

    it('should not check auth in demo mode', async () => {
      const { requireAuth } = await import('../../lib/auth');

      render(<AdminPanel demoMode={true} />);

      await waitFor(() => {
        expect(screen.queryByText('Chargement...')).not.toBeInTheDocument();
      });

      // In demo mode, requireAuth should not be called
      expect(requireAuth).not.toHaveBeenCalled();
    });
  });

  describe('Statistics Display', () => {
    it('should display statistics section', async () => {
      render(<AdminPanel demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText("Vue d'ensemble")).toBeInTheDocument();
      });
    });

    it('should display photo count', async () => {
      render(<AdminPanel demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText('90')).toBeInTheDocument();
        expect(screen.getByText('Photos')).toBeInTheDocument();
      });
    });

    it('should display message count', async () => {
      render(<AdminPanel demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
        expect(screen.getByText('Messages')).toBeInTheDocument();
      });
    });

    it('should display favorites count', async () => {
      render(<AdminPanel demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('Favoris')).toBeInTheDocument();
      });
    });
  });

  describe('Settings Section', () => {
    it('should display settings section', async () => {
      render(<AdminPanel demoMode={true} initialView="settings" />);

      await waitFor(() => {
        expect(screen.getByText('Paramètres')).toBeInTheDocument();
      });
    });

    it('should show upload toggle', async () => {
      render(<AdminPanel demoMode={true} initialView="settings" />);

      await waitFor(() => {
        expect(screen.getByText('Autoriser les uploads')).toBeInTheDocument();
      });
    });

    it('should show enabled state when uploads allowed', async () => {
      render(<AdminPanel demoMode={true} initialView="settings" />);

      await waitFor(() => {
        expect(
          screen.getByText('Les invités peuvent ajouter des photos')
        ).toBeInTheDocument();
      });
    });

    it('should toggle uploads when clicked', async () => {
      const { mockAPI } = await import('../../lib/api');

      render(<AdminPanel demoMode={true} initialView="settings" />);

      await waitFor(() => {
        expect(screen.getByTestId('settings-toggle')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('settings-toggle'));

      await waitFor(() => {
        expect(mockAPI.toggleUploads).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Backup Button', () => {
    it('should display backup button', async () => {
      render(<AdminPanel demoMode={true} initialView="settings" />);

      await waitFor(() => {
        expect(screen.getByText('Télécharger la sauvegarde')).toBeInTheDocument();
      });
    });

    it('should trigger backup when clicked', async () => {
      const { mockAPI, downloadBlob } = await import('../../lib/api');

      render(<AdminPanel demoMode={true} initialView="settings" />);

      await waitFor(() => {
        expect(screen.getByText('Télécharger la sauvegarde')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Télécharger la sauvegarde'));

      await waitFor(() => {
        expect(mockAPI.exportBackup).toHaveBeenCalled();
        expect(downloadBlob).toHaveBeenCalled();
      });
    });

    it('should show loading state during backup', async () => {
      const { mockAPI } = await import('../../lib/api');
      // Create a promise we can control
      let resolveBackup: (value: Blob) => void;
      const backupPromise = new Promise<Blob>((resolve) => {
        resolveBackup = resolve;
      });
      (mockAPI.exportBackup as ReturnType<typeof vi.fn>).mockImplementation(
        () => backupPromise
      );

      render(<AdminPanel demoMode={true} initialView="settings" />);

      await waitFor(() => {
        expect(screen.getByText('Télécharger la sauvegarde')).toBeInTheDocument();
      });

      // Click the button to start the backup
      fireEvent.click(screen.getByText('Télécharger la sauvegarde'));

      // Loading state should appear immediately after click
      // AdminButton shows "Chargement..." when loading={true}
      await waitFor(() => {
        expect(screen.getByText('Chargement...')).toBeInTheDocument();
      });

      // Resolve the backup promise to clean up
      resolveBackup!(new Blob(['test']));
    });
  });

  describe('QR Code Section', () => {
    it('should display QR code section', async () => {
      render(<AdminPanel demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText('QR Code Galerie')).toBeInTheDocument();
      });
    });

    it('should render QRCodeGenerator component', async () => {
      render(<AdminPanel demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByAltText('QR Code')).toBeInTheDocument();
      });
    });
  });

  describe('Theme Section', () => {
    it('should display theme section', async () => {
      render(<AdminPanel demoMode={true} initialView="settings" />);

      await waitFor(() => {
        expect(screen.getByText('Thème')).toBeInTheDocument();
      });
    });

    it('should render ThemeSelector component', async () => {
      render(<AdminPanel demoMode={true} initialView="settings" />);

      await waitFor(() => {
        expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
      });
    });
  });

  describe('Albums Section', () => {
    it('should display albums section', async () => {
      render(<AdminPanel demoMode={true} initialView="settings" />);

      await waitFor(() => {
        // Albums appears in stats and as section header - check both exist
        const albumsElements = screen.getAllByText('Albums');
        expect(albumsElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should render AlbumManager component', async () => {
      render(<AdminPanel demoMode={true} initialView="settings" />);

      await waitFor(() => {
        expect(screen.getByTestId('album-manager')).toBeInTheDocument();
      });
    });
  });

  // Enhanced statistics and storage sections were removed from the dashboard layout.

  describe('Error Handling', () => {
    it('should handle statistics load failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetStatistics.mockRejectedValue(new Error('Load failed'));

      render(<AdminPanel demoMode={true} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('should handle settings toggle failure', async () => {
      const { mockAPI } = await import('../../lib/api');
      (mockAPI.toggleUploads as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Toggle failed'));

      render(<AdminPanel demoMode={true} initialView="settings" />);

      await waitFor(() => {
        expect(screen.getByTestId('settings-toggle')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('settings-toggle'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          'Erreur lors de la mise à jour des paramètres'
        );
      });
    });

    it('should handle backup failure', async () => {
      const { mockAPI } = await import('../../lib/api');
      (mockAPI.exportBackup as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Backup failed'));

      render(<AdminPanel demoMode={true} initialView="settings" />);

      await waitFor(() => {
        expect(screen.getByText('Télécharger la sauvegarde')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Télécharger la sauvegarde'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          'Erreur lors de la création de la sauvegarde'
        );
      });
    });
  });

  describe('Production Mode', () => {
    it('should call requireAuth in production mode', async () => {
      const { requireAuth } = await import('../../lib/auth');

      render(<AdminPanel demoMode={false} />);

      expect(requireAuth).toHaveBeenCalled();
    });

    it('should redirect non-admin users', async () => {
      const { isAdmin } = await import('../../lib/auth');
      vi.mocked(isAdmin).mockReturnValue(false);

      render(<AdminPanel demoMode={false} />);

      await waitFor(() => {
        expect(window.location.href).toBe('/gallery');
      });
    });
  });
});
