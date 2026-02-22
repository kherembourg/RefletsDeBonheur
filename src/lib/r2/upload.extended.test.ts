/**
 * Extended tests for r2/upload.ts
 * Covers the XHR upload flow and uploadMultipleToR2
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadToR2, uploadMultipleToR2 } from './upload';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// XHR event callback storage (shared across instances)
let xhrListeners: Record<string, Array<(event: any) => void>> = {};
let xhrUploadListeners: Record<string, Array<(event: any) => void>> = {};
let xhrStatus = 200;
let xhrTriggerError = false;
let xhrTriggerAbort = false;

function MockXMLHttpRequest(this: any) {
  this.status = xhrStatus;
  this.open = vi.fn();
  this.setRequestHeader = vi.fn();
  this.send = vi.fn().mockImplementation(() => {
    setTimeout(() => {
      if (xhrTriggerError) {
        (xhrListeners['error'] || []).forEach(fn => fn({}));
      } else if (xhrTriggerAbort) {
        (xhrListeners['abort'] || []).forEach(fn => fn({}));
      } else {
        // Trigger progress
        (xhrUploadListeners['progress'] || []).forEach(fn =>
          fn({ lengthComputable: true, loaded: 50, total: 100 })
        );
        // Trigger load
        (xhrListeners['load'] || []).forEach(fn => fn({}));
      }
    }, 0);
  });
  this.addEventListener = vi.fn().mockImplementation((event: string, handler: (e: any) => void) => {
    if (!xhrListeners[event]) xhrListeners[event] = [];
    xhrListeners[event].push(handler);
  });
  this.upload = {
    addEventListener: vi.fn().mockImplementation((event: string, handler: (e: any) => void) => {
      if (!xhrUploadListeners[event]) xhrUploadListeners[event] = [];
      xhrUploadListeners[event].push(handler);
    }),
  };
}

describe('uploadToR2 - XHR upload flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    xhrListeners = {};
    xhrUploadListeners = {};
    xhrStatus = 200;
    xhrTriggerError = false;
    xhrTriggerAbort = false;
    // @ts-ignore - mock XMLHttpRequest as constructor
    global.XMLHttpRequest = MockXMLHttpRequest;
  });

  it('uploads a file successfully and returns MediaItem', async () => {
    const mockMedia = {
      id: 'media-123',
      original_url: 'https://cdn.example.com/file.jpg',
      thumbnail_url: 'https://cdn.example.com/thumb.jpg',
      type: 'image',
      caption: 'Test caption',
      guest_name: 'Alice',
      created_at: '2024-06-15T10:00:00Z',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          uploadUrl: 'https://r2.example.com/presigned',
          key: 'uploads/test.jpg',
          publicUrl: 'https://cdn.example.com/test.jpg',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ media: mockMedia }),
      });

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    const result = await uploadToR2({
      weddingId: 'wedding-123',
      file,
      caption: 'Test caption',
      guestName: 'Alice',
    });

    expect(result.id).toBe('media-123');
    expect(result.url).toBe('https://cdn.example.com/file.jpg');
    expect(result.thumbnailUrl).toBe('https://cdn.example.com/thumb.jpg');
    expect(result.type).toBe('image');
    expect(result.caption).toBe('Test caption');
    expect(result.author).toBe('Alice');
    expect(result.reactions).toEqual({});
    expect(result.albumIds).toEqual([]);
  });

  it('handles file without optional fields', async () => {
    const mockMedia = {
      id: 'media-456',
      original_url: 'https://cdn.example.com/file.mp4',
      thumbnail_url: null,
      type: 'video',
      caption: null,
      guest_name: null,
      created_at: '2024-06-15T10:00:00Z',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          uploadUrl: 'https://r2.example.com/presigned',
          key: 'uploads/test.mp4',
          publicUrl: 'https://cdn.example.com/test.mp4',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ media: mockMedia }),
      });

    const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });

    const result = await uploadToR2({ weddingId: 'wedding-123', file });

    expect(result.id).toBe('media-456');
    expect(result.thumbnailUrl).toBeUndefined();
    expect(result.caption).toBeUndefined();
    expect(result.author).toBeUndefined();
  });

  it('calls progress callback when XHR reports progress', async () => {
    const mockMedia = {
      id: 'media-789',
      original_url: 'https://cdn.example.com/file.jpg',
      thumbnail_url: null,
      type: 'image',
      caption: null,
      guest_name: null,
      created_at: '2024-06-15T10:00:00Z',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          uploadUrl: 'https://r2.example.com/presigned',
          key: 'uploads/test.jpg',
          publicUrl: 'https://cdn.example.com/test.jpg',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ media: mockMedia }),
      });

    const onProgress = vi.fn();
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    await uploadToR2({ weddingId: 'wedding-123', file, onProgress });

    expect(onProgress).toHaveBeenCalledWith({
      loaded: 50,
      total: 100,
      percentage: 50,
    });
  });

  it('throws when XHR returns non-2xx status', async () => {
    xhrStatus = 500;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        uploadUrl: 'https://r2.example.com/presigned',
        key: 'uploads/test.jpg',
        publicUrl: 'https://cdn.example.com/test.jpg',
      }),
    });

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    await expect(uploadToR2({ weddingId: 'wedding-123', file }))
      .rejects.toThrow('Upload failed with status 500');
  });

  it('throws on XHR network error', async () => {
    xhrTriggerError = true;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        uploadUrl: 'https://r2.example.com/presigned',
        key: 'uploads/test.jpg',
        publicUrl: 'https://cdn.example.com/test.jpg',
      }),
    });

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    await expect(uploadToR2({ weddingId: 'wedding-123', file }))
      .rejects.toThrow('Upload failed due to network error');
  });

  it('throws on XHR abort', async () => {
    xhrTriggerAbort = true;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        uploadUrl: 'https://r2.example.com/presigned',
        key: 'uploads/test.jpg',
        publicUrl: 'https://cdn.example.com/test.jpg',
      }),
    });

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    await expect(uploadToR2({ weddingId: 'wedding-123', file }))
      .rejects.toThrow('Upload aborted');
  });

  it('throws when confirm response fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          uploadUrl: 'https://r2.example.com/presigned',
          key: 'uploads/test.jpg',
          publicUrl: 'https://cdn.example.com/test.jpg',
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Database error' }),
      });

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    await expect(uploadToR2({ weddingId: 'wedding-123', file }))
      .rejects.toThrow('Database error');
  });
});

describe('uploadMultipleToR2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    xhrListeners = {};
    xhrUploadListeners = {};
    xhrStatus = 200;
    xhrTriggerError = false;
    xhrTriggerAbort = false;
    // @ts-ignore
    global.XMLHttpRequest = MockXMLHttpRequest;
  });

  it('uploads multiple files and returns array of MediaItems', async () => {
    const makePresignResponse = () => ({
      ok: true,
      json: () => Promise.resolve({
        uploadUrl: 'https://r2.example.com/presigned',
        key: 'uploads/test.jpg',
        publicUrl: 'https://cdn.example.com/test.jpg',
      }),
    });

    const makeConfirmResponse = (id: string) => ({
      ok: true,
      json: () => Promise.resolve({
        media: {
          id,
          original_url: `https://cdn.example.com/${id}.jpg`,
          thumbnail_url: null,
          type: 'image',
          caption: null,
          guest_name: null,
          created_at: '2024-06-15T10:00:00Z',
        },
      }),
    });

    mockFetch
      .mockResolvedValueOnce(makePresignResponse())
      .mockResolvedValueOnce(makeConfirmResponse('media-1'))
      .mockResolvedValueOnce(makePresignResponse())
      .mockResolvedValueOnce(makeConfirmResponse('media-2'));

    const file1 = new File(['content1'], 'file1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['content2'], 'file2.jpg', { type: 'image/jpeg' });

    const onOverallProgress = vi.fn();

    const results = await uploadMultipleToR2({
      weddingId: 'wedding-123',
      files: [
        { file: file1, caption: 'First' },
        { file: file2, caption: 'Second' },
      ],
      onOverallProgress,
    });

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('media-1');
    expect(results[1].id).toBe('media-2');
    expect(onOverallProgress).toHaveBeenCalledWith(1, 2);
    expect(onOverallProgress).toHaveBeenCalledWith(2, 2);
  });

  it('re-throws error when a file upload fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        error: 'Server error',
        message: 'Something went wrong',
      }),
    });

    const file = new File(['content'], 'file.jpg', { type: 'image/jpeg' });

    await expect(uploadMultipleToR2({
      weddingId: 'wedding-123',
      files: [{ file }],
    })).rejects.toThrow('Something went wrong');
  });

  it('calls onFileProgress during upload', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          uploadUrl: 'https://r2.example.com/presigned',
          key: 'uploads/test.jpg',
          publicUrl: 'https://cdn.example.com/test.jpg',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          media: {
            id: 'media-1',
            original_url: 'https://cdn.example.com/media-1.jpg',
            thumbnail_url: null,
            type: 'image',
            caption: null,
            guest_name: null,
            created_at: '2024-06-15T10:00:00Z',
          },
        }),
      });

    const onFileProgress = vi.fn();
    const file = new File(['content'], 'file.jpg', { type: 'image/jpeg' });

    await uploadMultipleToR2({
      weddingId: 'wedding-123',
      files: [{ file }],
      onFileProgress,
    });

    expect(onFileProgress).toHaveBeenCalledWith(0, expect.objectContaining({
      loaded: 50,
      total: 100,
      percentage: 50,
    }));
  });
});
