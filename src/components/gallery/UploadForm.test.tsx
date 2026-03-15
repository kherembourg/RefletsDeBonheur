/**
 * Component Test: UploadForm
 * 
 * Tests for the UploadForm component that handles media uploads.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UploadForm, MAX_FILE_SIZE } from './UploadForm';

// Mock DataService
const mockUploadMediaBatch = vi.fn();
const mockDataService = {
  uploadMediaBatch: mockUploadMediaBatch,
};

// Mock URL.createObjectURL and revokeObjectURL for jsdom
const mockCreateObjectURL = vi.fn((file: File) => `blob:mock/${file.name}`);
const mockRevokeObjectURL = vi.fn();
globalThis.URL.createObjectURL = mockCreateObjectURL;
globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock auth module
vi.mock('../../lib/auth', () => ({
  getUsername: vi.fn(() => 'Sophie'),
  setUsername: vi.fn(),
}));

describe('UploadForm Component', () => {
  const mockOnUploadComplete = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadMediaBatch.mockResolvedValue([
      {
        id: 'media-1',
        url: 'https://example.com/image1.jpg',
        type: 'image',
        author: 'Sophie',
        caption: 'Test caption',
        createdAt: new Date(),
        favoriteCount: 0,
        reactions: [],
        albumIds: [],
      },
    ]);
  });

  describe('Rendering', () => {
    it('should render author name input', () => {
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      expect(screen.getByPlaceholderText(/ex: sophie/i)).toBeInTheDocument();
    });

    it('should render file upload zone', () => {
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      expect(screen.getByLabelText(/ajouter des photos ou vidéos/i)).toBeInTheDocument();
    });

    it('should pre-fill author name from storage', () => {
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const input = screen.getByPlaceholderText(/ex: sophie/i) as HTMLInputElement;
      expect(input.value).toBe('Sophie');
    });

    it('should show file upload description', () => {
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      expect(screen.getByText(/sera mémorisé pour vos prochains envois/i)).toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('should display preview after file selection', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
    });

    it('should handle multiple file selection', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const files = [
        new File(['image1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['image2'], 'test2.jpg', { type: 'image/jpeg' }),
      ];
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(input, files);

      await waitFor(() => {
        expect(screen.getByText('test1.jpg')).toBeInTheDocument();
        expect(screen.getByText('test2.jpg')).toBeInTheDocument();
      });
    });

    it('should show video preview for video files', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('test.mp4')).toBeInTheDocument();
      });
    });

    it('should reset file input after selection', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
  });

  describe('Caption Input', () => {
    it('should show caption input for images', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/légende/i)).toBeInTheDocument();
      });
    });

    it('should not show caption input for videos', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/légende/i)).not.toBeInTheDocument();
      });
    });

    it('should update caption when user types', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/légende/i)).toBeInTheDocument();
      });

      const captionInput = screen.getByPlaceholderText(/légende/i);
      await user.type(captionInput, 'Beautiful sunset');

      expect(captionInput).toHaveValue('Beautiful sunset');
    });

  });

  describe('File Removal', () => {
    it('should remove file when delete button clicked', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      const removeButton = screen.getByLabelText(/retirer/i);
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
      });
    });

    it('should not show remove button during upload', async () => {
      const user = userEvent.setup();
      mockUploadMediaBatch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      // Check consent checkbox before uploading
      const consentCheckbox = screen.getByLabelText(/consentement/i);
      await user.click(consentCheckbox);

      const uploadButton = screen.getByRole('button', { name: /envoyer/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.queryByLabelText(/retirer/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Upload Submission', () => {
    it('should require author name before upload', async () => {
      const user = userEvent.setup();

      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      // Clear author name
      const nameInput = screen.getByPlaceholderText(/ex: sophie/i);
      await user.clear(nameInput);

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      // Check consent checkbox before uploading
      const consentCheckbox = screen.getByLabelText(/consentement/i);
      await user.click(consentCheckbox);

      const uploadButton = screen.getByRole('button', { name: /envoyer/i });
      await user.click(uploadButton);

      expect(screen.getByRole('alert')).toHaveTextContent('Veuillez entrer votre prénom');
    });

    it('should show upload progress', async () => {
      const user = userEvent.setup();
      mockUploadMediaBatch.mockImplementation(async (items, options) => {
        // Simulate progress
        options.onFileProgress(0, { percentage: 50 });
        await new Promise(resolve => setTimeout(resolve, 100));
        options.onFileProgress(0, { percentage: 100 });
        return [{ id: 'media-1', url: 'test.jpg', type: 'image', author: 'Sophie', createdAt: new Date(), reactions: [], albumIds: [], favoriteCount: 0 }];
      });

      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      // Check consent checkbox before uploading
      const consentCheckbox = screen.getByLabelText(/consentement/i);
      await user.click(consentCheckbox);

      const uploadButton = screen.getByRole('button', { name: /envoyer/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/envoi en cours/i)).toBeInTheDocument();
      });
    });

    it('should show overall progress during batch upload', async () => {
      const user = userEvent.setup();
      mockUploadMediaBatch.mockImplementation(async (items, options) => {
        options.onFileProgress(0, { percentage: 100 });
        await new Promise(resolve => setTimeout(resolve, 50));
        options.onFileProgress(1, { percentage: 100 });
        return items.map((_, i) => ({ id: `media-${i}`, url: 'test.jpg', type: 'image', author: 'Sophie', createdAt: new Date(), reactions: [], albumIds: [], favoriteCount: 0 }));
      });

      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const files = [
        new File(['image1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['image2'], 'test2.jpg', { type: 'image/jpeg' }),
      ];
      const fileInput = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(fileInput, files);

      await waitFor(() => {
        expect(screen.getByText('test1.jpg')).toBeInTheDocument();
      });

      // Check consent checkbox before uploading
      const consentCheckbox = screen.getByLabelText(/consentement/i);
      await user.click(consentCheckbox);

      const uploadButton = screen.getByRole('button', { name: /envoyer 2 souvenirs/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/progression globale/i)).toBeInTheDocument();
      });
    });

    it('should call onUploadComplete on success', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      // Check consent checkbox before uploading
      const consentCheckbox = screen.getByLabelText(/consentement/i);
      await user.click(consentCheckbox);

      const uploadButton = screen.getByRole('button', { name: /envoyer/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(mockOnUploadComplete).toHaveBeenCalled();
      });
    });

    it('should call onClose after successful upload', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      // Check consent checkbox before uploading
      const consentCheckbox = screen.getByLabelText(/consentement/i);
      await user.click(consentCheckbox);

      const uploadButton = screen.getByRole('button', { name: /envoyer/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should handle upload errors', async () => {
      const user = userEvent.setup();
      mockUploadMediaBatch.mockRejectedValue(new Error('Upload failed'));

      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      // Check consent checkbox before uploading
      const consentCheckbox = screen.getByLabelText(/consentement/i);
      await user.click(consentCheckbox);

      const uploadButton = screen.getByRole('button', { name: /envoyer/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent("Erreur lors de l'envoi. Veuillez réessayer.");
      });
    });
  });

  describe('GDPR Consent', () => {
    it('should show consent checkbox when files are queued', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByLabelText(/consentement/i)).toBeInTheDocument();
      });
    });

    it('should disable upload button when consent is not given', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;
      await user.upload(input, file);

      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /envoyer/i });
        expect(uploadButton).toBeDisabled();
      });
    });

    it('should enable upload button when consent is given', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByLabelText(/consentement/i)).toBeInTheDocument();
      });

      const consentCheckbox = screen.getByLabelText(/consentement/i);
      await user.click(consentCheckbox);

      const uploadButton = screen.getByRole('button', { name: /envoyer/i });
      expect(uploadButton).not.toBeDisabled();
    });
  });

  describe('Button States', () => {
    it('should disable upload button during upload', async () => {
      const user = userEvent.setup();
      mockUploadMediaBatch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      // Check consent checkbox before uploading
      const consentCheckbox = screen.getByLabelText(/consentement/i);
      await user.click(consentCheckbox);

      const uploadButton = screen.getByRole('button', { name: /envoyer/i });
      await user.click(uploadButton);

      // During upload, the upload button is replaced by a disabled "Envoi en cours" button
      await waitFor(() => {
        const inProgressButton = screen.getByText(/envoi en cours/i).closest('button');
        expect(inProgressButton).toBeDisabled();
      });
    });

    it('should show correct button text for single file', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /envoyer 1 souvenir$/i })).toBeInTheDocument();
      });
    });

    it('should show correct button text for multiple files', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const files = [
        new File(['image1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['image2'], 'test2.jpg', { type: 'image/jpeg' }),
      ];
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(input, files);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /envoyer 2 souvenirs/i })).toBeInTheDocument();
      });
    });

    it('should disable upload button when consent is not given', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /envoyer/i });
      expect(uploadButton).toBeDisabled();
    });
  });

  describe('File Size Validation', () => {
    it('should show error for oversized files', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      // Create a file that exceeds MAX_FILE_SIZE
      const largeContent = new ArrayBuffer(MAX_FILE_SIZE + 1);
      const file = new File([largeContent], 'huge.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('huge.jpg')).toBeInTheDocument();
        expect(screen.getByText(/trop volumineux/i)).toBeInTheDocument();
      });
    });

    it('should not show error for files within size limit', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['small'], 'small.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('small.jpg')).toBeInTheDocument();
      });

      expect(screen.queryByText(/trop volumineux/i)).not.toBeInTheDocument();
    });

    it('should exclude oversized files from upload count', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const largeContent = new ArrayBuffer(MAX_FILE_SIZE + 1);
      const files = [
        new File(['small'], 'small.jpg', { type: 'image/jpeg' }),
        new File([largeContent], 'huge.jpg', { type: 'image/jpeg' }),
      ];
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(input, files);

      await waitFor(() => {
        expect(screen.getByText('small.jpg')).toBeInTheDocument();
        expect(screen.getByText('huge.jpg')).toBeInTheDocument();
      });

      // Button should show count of only valid files
      expect(screen.getByRole('button', { name: /envoyer 1 souvenir$/i })).toBeInTheDocument();
    });

    it('should not upload oversized files', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const largeContent = new ArrayBuffer(MAX_FILE_SIZE + 1);
      const files = [
        new File(['small'], 'small.jpg', { type: 'image/jpeg' }),
        new File([largeContent], 'huge.jpg', { type: 'image/jpeg' }),
      ];
      const fileInput = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(fileInput, files);

      await waitFor(() => {
        expect(screen.getByText('small.jpg')).toBeInTheDocument();
      });

      // Check consent checkbox before uploading
      const consentCheckbox = screen.getByLabelText(/consentement/i);
      await user.click(consentCheckbox);

      const uploadButton = screen.getByRole('button', { name: /envoyer/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(mockUploadMediaBatch).toHaveBeenCalled();
      });

      // Only the small file should have been uploaded
      const uploadedFiles = mockUploadMediaBatch.mock.calls[0][0];
      expect(uploadedFiles).toHaveLength(1);
      expect(uploadedFiles[0].file.name).toBe('small.jpg');
    });

    it('should disable upload button when all files are oversized', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const largeContent = new ArrayBuffer(MAX_FILE_SIZE + 1);
      const file = new File([largeContent], 'huge.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('huge.jpg')).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /envoyer/i });
      expect(uploadButton).toBeDisabled();
    });
  });

  describe('Upload Cancellation', () => {
    it('should show cancel button during upload', async () => {
      const user = userEvent.setup();
      mockUploadMediaBatch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      // Check consent checkbox before uploading
      const consentCheckbox = screen.getByLabelText(/consentement/i);
      await user.click(consentCheckbox);

      const uploadButton = screen.getByRole('button', { name: /envoyer/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/annuler l'envoi/i)).toBeInTheDocument();
      });
    });

    it('should pass abortSignal to dataService', async () => {
      const user = userEvent.setup();
      mockUploadMediaBatch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      // Check consent checkbox before uploading
      const consentCheckbox = screen.getByLabelText(/consentement/i);
      await user.click(consentCheckbox);

      const uploadButton = screen.getByRole('button', { name: /envoyer/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(mockUploadMediaBatch).toHaveBeenCalled();
      });

      const options = mockUploadMediaBatch.mock.calls[0][1];
      expect(options.abortSignal).toBeInstanceOf(AbortSignal);
    });

    it('should not show cancel button when not uploading', async () => {
      const user = userEvent.setup();
      render(
        <UploadForm
          onUploadComplete={mockOnUploadComplete}
          onClose={mockOnClose}
          dataService={mockDataService as any}
        />
      );

      const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText(/ajouter des photos ou vidéos/i) as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      expect(screen.queryByLabelText(/annuler l'envoi/i)).not.toBeInTheDocument();
    });
  });
});
