import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Upload, Plus, Trash2, Loader2, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { getUsername, setUsername as saveUsername } from '../../lib/auth';
import type { DataService, MediaItem } from '../../lib/services/dataService';
import { t } from '../../i18n/utils';
import type { Language } from '../../i18n/translations';
import { useToast } from '../ui/Toast';

/** Maximum file size allowed: 50 MB */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Format bytes into a human-readable string */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
  caption: string;
  originalName: string;
  uploadProgress?: number;
  uploadStatus?: 'pending' | 'uploading' | 'complete' | 'error';
  sizeError?: boolean;
}

interface UploadFormProps {
  onUploadComplete: (items: MediaItem[]) => void;
  onClose: () => void;
  dataService: DataService;
  lang?: Language;
}

export function UploadForm({ onUploadComplete, onClose, dataService, lang = 'fr' }: UploadFormProps) {
  const [authorName, setAuthorName] = useState(getUsername());
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const uploadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { showToast, ToastContainer } = useToast();

  // Save username to localStorage when it changes
  useEffect(() => {
    if (authorName) {
      saveUsername(authorName);
    }
  }, [authorName]);

  // Revoke all object URLs on unmount to prevent memory leaks
  const queueRef = useRef(queue);
  queueRef.current = queue;
  useEffect(() => {
    return () => {
      queueRef.current.forEach(item => URL.revokeObjectURL(item.preview));
    };
  }, []);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: UploadItem[] = Array.from(files).map(file => {
      const oversized = file.size > MAX_FILE_SIZE;
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith('video') ? 'video' as const : 'image' as const,
        caption: '',
        originalName: file.name,
        sizeError: oversized,
      };
    });
    setQueue(prev => [...prev, ...newItems]);

    // Reset input
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setQueue(prev => {
      const item = prev.find(item => item.id === id);
      if (item) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter(item => item.id !== id);
    });
  };

  const updateCaption = (id: string, text: string) => {
    setQueue(prev => prev.map(item =>
      item.id === id ? { ...item, caption: text } : item
    ));
  };

  const handleUploadAll = async () => {
    if (uploadingRef.current) return;
    if (queue.length === 0) return;
    if (!authorName.trim()) {
      showToast('error', t(lang, 'gallery.authorRequired'));
      return;
    }
    if (!consentGiven) {
      showToast('error', t(lang, 'gallery.consentRequired'));
      return;
    }

    // Filter out oversized files
    const uploadableItems = queue.filter(item => !item.sizeError);
    if (uploadableItems.length === 0) {
      showToast('error', t(lang, 'gallery.noValidFiles'));
      return;
    }

    uploadingRef.current = true;
    setUploading(true);

    // Create an AbortController for this upload session
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Mark uploadable items as pending, keep size errors as-is
    setQueue(prev => prev.map(item =>
      item.sizeError
        ? item
        : { ...item, uploadStatus: 'pending' as const, uploadProgress: 0 }
    ));

    try {
      // Build a mapping from uploadable index to queue index
      const uploadableIndices = queue.reduce<number[]>((acc, item, index) => {
        if (!item.sizeError) acc.push(index);
        return acc;
      }, []);

      // Use DataService for uploads (handles both demo and R2 production modes)
      const items = await dataService.uploadMediaBatch(
        uploadableItems.map(item => ({
          file: item.file,
          caption: item.caption,
        })),
        {
          author: authorName,
          abortSignal: abortController.signal,
          onFileProgress: (fileIndex, progress) => {
            // Map fileIndex back to queue index
            const queueIndex = uploadableIndices[fileIndex];
            setQueue(prev => prev.map((item, index) => {
              if (index === queueIndex) {
                return {
                  ...item,
                  uploadProgress: progress.percentage,
                  uploadStatus: progress.percentage === 100 ? 'complete' as const : 'uploading' as const
                };
              }
              return item;
            }));
          },
          onOverallProgress: (completed, total) => {
            // Could add overall progress tracking here if needed
          },
        }
      );

      onUploadComplete(items);
      // Small delay to show completion before closing
      await new Promise(resolve => setTimeout(resolve, 500));
      setQueue([]);
      onClose();
    } catch (error) {
      if (abortController.signal.aborted) {
        // User cancelled - mark non-complete items as error
        setQueue(prev => prev.map(item =>
          item.uploadStatus === 'complete' || item.sizeError
            ? item
            : { ...item, uploadStatus: 'error' as const }
        ));
      } else {
        console.error('Upload failed:', error);
        showToast('error', t(lang, 'gallery.uploadError'));
        // Mark all non-complete as error
        setQueue(prev => prev.map(item =>
          item.uploadStatus === 'complete' || item.sizeError
            ? item
            : { ...item, uploadStatus: 'error' as const }
        ));
      }
    } finally {
      abortControllerRef.current = null;
      uploadingRef.current = false;
      setUploading(false);
    }
  };

  const handleCancelUpload = () => {
    abortControllerRef.current?.abort();
  };

  return (
    <div className="space-y-6">
      <ToastContainer />
      {/* Author Name Input */}
      <div>
        <label className="block text-sm font-medium text-deep-charcoal mb-1">
          {t(lang, 'gallery.authorLabel')}
        </label>
        <input
          type="text"
          name="author-name"
          autoComplete="given-name"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder={t(lang, 'gallery.authorPlaceholder')}
          className="w-full px-3 py-2 border-2 border-silver-mist rounded-lg focus:ring-2 focus:ring-burgundy-old focus:border-burgundy-old focus:outline-hidden bg-pearl-white transition-colors"
        />
        <p className="text-xs text-warm-taupe mt-1">
          {t(lang, 'gallery.authorHint')}
        </p>
      </div>

      {/* File Upload Zone */}
      <div className="border-2 border-dashed border-silver-mist rounded-xl p-4 text-center bg-pearl-white hover:bg-soft-blush/20 transition-colors relative cursor-pointer">
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={t(lang, 'gallery.addFilesAriaLabel')}
        />
        <div className="flex items-center justify-center gap-2 text-warm-taupe" aria-hidden="true">
          <Plus size={20} />
          <span className="font-medium text-sm">{t(lang, 'gallery.addFiles')}</span>
        </div>
      </div>

      {/* Upload Queue */}
      {queue.length > 0 && (
        <div className="space-y-4">
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-3 bg-pearl-white rounded-lg border border-silver-mist items-start"
            >
              {/* Preview Thumbnail */}
              <div className="w-20 h-20 bg-silver-mist/20 rounded-lg overflow-hidden shrink-0">
                {item.type === 'video' ? (
                  <video src={item.preview} className="w-full h-full object-cover" width={80} height={80} />
                ) : (
                  <img src={item.preview} alt={`${t(lang, 'gallery.previewOf')} ${item.originalName}`} className="w-full h-full object-cover" width={80} height={80} />
                )}
              </div>

              {/* File Info and Caption */}
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs text-warm-taupe truncate max-w-[150px]">
                      {item.originalName}
                    </span>
                    {/* Status Icon */}
                    {item.uploadStatus === 'complete' && (
                      <CheckCircle2 size={14} className="text-green-500" />
                    )}
                    {item.uploadStatus === 'uploading' && (
                      <Loader2 size={14} className="text-burgundy-old animate-spin" />
                    )}
                    {item.uploadStatus === 'error' && (
                      <XCircle size={14} className="text-red-500" />
                    )}
                    {item.sizeError && (
                      <span className="text-xs text-red-500 font-medium" role="alert">
                        {t(lang, 'gallery.tooLarge')} ({formatFileSize(item.file.size)} / {formatFileSize(MAX_FILE_SIZE)} max)
                      </span>
                    )}
                  </div>
                  {!uploading && (
                    <button
                      onClick={() => removeFile(item.id)}
                      className="text-warm-taupe hover:text-red-500 transition-colors"
                      aria-label={t(lang, 'gallery.remove')}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Progress Bar */}
                {item.uploadStatus && item.uploadStatus !== 'pending' && item.uploadProgress !== undefined && (
                  <div className="w-full bg-silver-mist/30 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        item.uploadStatus === 'complete'
                          ? 'bg-green-500'
                          : item.uploadStatus === 'error'
                          ? 'bg-red-500'
                          : 'bg-burgundy-old'
                      }`}
                      style={{ width: `${item.uploadProgress}%` }}
                    />
                  </div>
                )}

                {/* Caption Input (Images Only) */}
                {item.type === 'image' && !uploading && (
                  <input
                    type="text"
                    name={`caption-${item.id}`}
                    value={item.caption}
                    onChange={(e) => updateCaption(item.id, e.target.value)}
                    placeholder={t(lang, 'gallery.captionPlaceholder')}
                    className="flex-1 px-2 py-1 text-sm border border-silver-mist rounded-sm focus:outline-hidden focus:ring-1 focus:ring-burgundy-old bg-ivory"
                    aria-label={`${t(lang, 'gallery.captionFor')} ${item.originalName}`}
                  />
                )}
              </div>
            </div>
          ))}

          {/* GDPR Consent Checkbox */}
          {!uploading && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-silver-mist text-burgundy-old focus:ring-burgundy-old"
                aria-label={t(lang, 'gallery.consentAria')}
              />
              <span className="text-xs text-warm-taupe">
                {t(lang, 'gallery.consentText')}
              </span>
            </label>
          )}

          {/* Upload Button */}
          <div className="pt-2 border-t border-silver-mist space-y-3">
            {/* Overall Progress */}
            {uploading && (() => {
              const uploadableCount = queue.filter(item => !item.sizeError).length;
              const totalProgress = queue.filter(item => !item.sizeError).reduce((sum, item) => sum + (item.uploadProgress || 0), 0);
              const overallProgress = uploadableCount > 0 ? Math.round(totalProgress / uploadableCount) : 0;
              const completedCount = queue.filter(item => item.uploadStatus === 'complete').length;

              return (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-warm-taupe">
                    <span>{t(lang, 'gallery.overallProgress')}</span>
                    <span className="font-semibold">{completedCount}/{uploadableCount} - {overallProgress}%</span>
                  </div>
                  <div className="w-full bg-silver-mist/30 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-burgundy-old to-burgundy-old/80 transition-all duration-300 rounded-full"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Upload / Cancel Buttons */}
            {uploading ? (
              <div className="flex gap-2">
                <button
                  disabled
                  className="flex-1 btn-primary flex justify-center items-center gap-2 opacity-80"
                >
                  <Loader2 className="animate-spin" size={18} />
                  <span>{t(lang, 'gallery.sendingInProgress')}</span>
                </button>
                <button
                  onClick={handleCancelUpload}
                  className="px-4 py-2 border-2 border-red-400 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
                  aria-label={t(lang, 'gallery.cancelAriaLabel')}
                >
                  <Ban size={18} />
                  <span>{t(lang, 'gallery.cancelUpload')}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleUploadAll}
                disabled={!consentGiven || queue.filter(i => !i.sizeError).length === 0}
                className="w-full btn-primary flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={18} />
                <span>{t(lang, 'gallery.sendMemories')} {queue.filter(i => !i.sizeError).length} {queue.filter(i => !i.sizeError).length > 1 ? t(lang, 'gallery.sendMemorySuffixPlural') : t(lang, 'gallery.sendMemorySuffix')}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
