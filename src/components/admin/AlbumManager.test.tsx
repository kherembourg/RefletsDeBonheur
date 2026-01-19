import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlbumManager } from './AlbumManager';
import { DataService, type Album } from '../../lib/services/dataService';

// Mock DataService
vi.mock('../../lib/services/dataService', () => ({
  DataService: vi.fn(),
}));

describe('AlbumManager Component', () => {
  const mockAlbums: Album[] = [
    {
      id: 'album-1',
      name: 'Cérémonie',
      description: 'Photos de la cérémonie',
      color: '#D4AF37',
      photoCount: 25,
      createdAt: new Date('2026-01-10'),
    },
    {
      id: 'album-2',
      name: 'Réception',
      description: 'Photos de la soirée',
      color: '#8B7355',
      photoCount: 50,
      createdAt: new Date('2026-01-11'),
    },
  ];

  let mockDataService: {
    getAlbums: ReturnType<typeof vi.fn>;
    createAlbum: ReturnType<typeof vi.fn>;
    updateAlbum: ReturnType<typeof vi.fn>;
    deleteAlbum: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDataService = {
      getAlbums: vi.fn().mockResolvedValue(mockAlbums),
      createAlbum: vi.fn().mockResolvedValue({ id: 'new-album' }),
      updateAlbum: vi.fn().mockResolvedValue(undefined),
      deleteAlbum: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      mockDataService.getAlbums.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<AlbumManager dataService={mockDataService as any} />);

      expect(screen.getByText('Chargement des albums...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty message when no albums', async () => {
      mockDataService.getAlbums.mockResolvedValue([]);

      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        expect(screen.getByText('Aucun album créé')).toBeInTheDocument();
      });
    });

    it('should display create first album link in empty state', async () => {
      mockDataService.getAlbums.mockResolvedValue([]);

      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        expect(
          screen.getByText('Créer votre premier album')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Album Display', () => {
    it('should display all albums', async () => {
      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        expect(screen.getByText('Cérémonie')).toBeInTheDocument();
        expect(screen.getByText('Réception')).toBeInTheDocument();
      });
    });

    it('should display album descriptions', async () => {
      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        expect(screen.getByText('Photos de la cérémonie')).toBeInTheDocument();
        expect(screen.getByText('Photos de la soirée')).toBeInTheDocument();
      });
    });

    it('should display photo counts', async () => {
      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        expect(screen.getByText('25 photos')).toBeInTheDocument();
        expect(screen.getByText('50 photos')).toBeInTheDocument();
      });
    });

    it('should use singular "photo" for count of 1', async () => {
      mockDataService.getAlbums.mockResolvedValue([
        { ...mockAlbums[0], photoCount: 1 },
      ]);

      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        expect(screen.getByText('1 photo')).toBeInTheDocument();
      });
    });
  });

  describe('Create Album', () => {
    it('should open create modal when clicking "Nouvel Album"', async () => {
      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        expect(screen.getByText('Albums')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Nouvel Album'));

      expect(screen.getByText('Créer un Album')).toBeInTheDocument();
    });

    it('should have name input in create modal', async () => {
      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Nouvel Album'));
      });

      expect(screen.getByPlaceholderText('Ex: Cérémonie, Réception...')).toBeInTheDocument();
    });

    it('should create album when form is submitted', async () => {
      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Nouvel Album'));
      });

      const nameInput = screen.getByPlaceholderText('Ex: Cérémonie, Réception...');
      fireEvent.change(nameInput, { target: { value: 'Test Album' } });

      fireEvent.click(screen.getByText('Créer'));

      await waitFor(() => {
        expect(mockDataService.createAlbum).toHaveBeenCalledWith({
          name: 'Test Album',
          description: '',
          color: '#D4AF37',
        });
      });
    });

    it('should show alert when name is empty', async () => {
      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Nouvel Album'));
      });

      fireEvent.click(screen.getByText('Créer'));

      expect(window.alert).toHaveBeenCalledWith("Le nom de l'album est requis");
    });

    it('should close modal when cancel is clicked', async () => {
      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Nouvel Album'));
      });

      expect(screen.getByText('Créer un Album')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Annuler'));

      await waitFor(() => {
        expect(screen.queryByText('Créer un Album')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit Album', () => {
    it('should open edit modal when clicking edit button', async () => {
      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        expect(screen.getByText('Cérémonie')).toBeInTheDocument();
      });

      // Click edit button (first one)
      const editButtons = screen.getAllByTitle('Modifier');
      fireEvent.click(editButtons[0]);

      expect(screen.getByText("Modifier l'Album")).toBeInTheDocument();
    });

    it('should populate form with existing album data', async () => {
      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        expect(screen.getByText('Cérémonie')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle('Modifier');
      fireEvent.click(editButtons[0]);

      expect(screen.getByDisplayValue('Cérémonie')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Photos de la cérémonie')).toBeInTheDocument();
    });

    it('should update album when form is submitted', async () => {
      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        expect(screen.getByText('Cérémonie')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle('Modifier');
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue('Cérémonie');
      fireEvent.change(nameInput, { target: { value: 'Cérémonie Mise à Jour' } });

      fireEvent.click(screen.getByText('Enregistrer'));

      await waitFor(() => {
        expect(mockDataService.updateAlbum).toHaveBeenCalledWith('album-1', {
          name: 'Cérémonie Mise à Jour',
          description: 'Photos de la cérémonie',
          color: '#D4AF37',
        });
      });
    });
  });

  describe('Delete Album', () => {
    it('should confirm before deleting', async () => {
      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        expect(screen.getByText('Cérémonie')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Supprimer');
      fireEvent.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Supprimer l\'album "Cérémonie"')
      );
    });

    it('should delete album when confirmed', async () => {
      vi.mocked(window.confirm).mockReturnValue(true);

      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        expect(screen.getByText('Cérémonie')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Supprimer');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockDataService.deleteAlbum).toHaveBeenCalledWith('album-1');
      });
    });

    it('should not delete album when cancelled', async () => {
      vi.mocked(window.confirm).mockReturnValue(false);

      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        expect(screen.getByText('Cérémonie')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Supprimer');
      fireEvent.click(deleteButtons[0]);

      expect(mockDataService.deleteAlbum).not.toHaveBeenCalled();
    });
  });

  describe('Album Selection', () => {
    it('should call onAlbumSelect when view album clicked', async () => {
      const handleAlbumSelect = vi.fn();

      render(
        <AlbumManager
          dataService={mockDataService as any}
          onAlbumSelect={handleAlbumSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cérémonie')).toBeInTheDocument();
      });

      const viewLinks = screen.getAllByText("Voir l'album →");
      fireEvent.click(viewLinks[0]);

      expect(handleAlbumSelect).toHaveBeenCalledWith('album-1');
    });

    it('should not show view album link when onAlbumSelect not provided', async () => {
      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        expect(screen.getByText('Cérémonie')).toBeInTheDocument();
      });

      expect(screen.queryByText("Voir l'album →")).not.toBeInTheDocument();
    });
  });

  describe('Color Selection', () => {
    it('should have color options in create modal', async () => {
      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Nouvel Album'));
      });

      // Should have 7 color options
      const colorButtons = screen.getAllByTitle(/Or|Taupe|Argent|Rose|Bleu|Vert|Violet/);
      expect(colorButtons).toHaveLength(7);
    });
  });

  describe('Error Handling', () => {
    it('should show alert on create error', async () => {
      mockDataService.createAlbum.mockRejectedValue(new Error('Create failed'));

      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Nouvel Album'));
      });

      const nameInput = screen.getByPlaceholderText('Ex: Cérémonie, Réception...');
      fireEvent.change(nameInput, { target: { value: 'Test' } });

      fireEvent.click(screen.getByText('Créer'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          "Erreur lors de la création de l'album"
        );
      });
    });

    it('should log error on load failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDataService.getAlbums.mockRejectedValue(new Error('Load failed'));

      render(<AlbumManager dataService={mockDataService as any} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });
});
