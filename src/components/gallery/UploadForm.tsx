import { useState, useEffect, type ChangeEvent } from 'react';
import { Upload, Plus, Trash2, Sparkles, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { getUsername, setUsername as saveUsername } from '../../lib/auth';
import { mockAPI } from '../../lib/api';
import type { DataService, MediaItem } from '../../lib/services/dataService';

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
  caption: string;
  originalName: string;
  uploadProgress?: number;
  uploadStatus?: 'pending' | 'uploading' | 'complete' | 'error';
}

interface UploadFormProps {
  onUploadComplete: (items: MediaItem[]) => void;
  onClose: () => void;
  dataService: DataService;
}

export function UploadForm({ onUploadComplete, onClose, dataService }: UploadFormProps) {
  const [authorName, setAuthorName] = useState(getUsername());
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Save username to localStorage when it changes
  useEffect(() => {
    if (authorName) {
      saveUsername(authorName);
    }
  }, [authorName]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newItem: UploadItem = {
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview: event.target?.result as string,
          type: file.type.startsWith('video') ? 'video' : 'image',
          caption: '',
          originalName: file.name
        };
        setQueue(prev => [...prev, newItem]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const updateCaption = (id: string, text: string) => {
    setQueue(prev => prev.map(item =>
      item.id === id ? { ...item, caption: text } : item
    ));
  };

  const generateAICaption = async (id: string) => {
    const item = queue.find(q => q.id === id);
    if (!item || item.type === 'video') return;

    setGeneratingFor(id);
    try {
      const caption = await mockAPI.generateCaption(item.preview);
      updateCaption(id, caption);
    } catch (error) {
      console.error('Caption generation failed:', error);
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleUploadAll = async () => {
    if (queue.length === 0) return;
    if (!authorName.trim()) {
      alert('Veuillez entrer votre prénom');
      return;
    }

    setUploading(true);

    // Mark all as pending
    setQueue(prev => prev.map(item => ({ ...item, uploadStatus: 'pending' as const, uploadProgress: 0 })));

    try {
      // Use DataService for uploads (handles both demo and R2 production modes)
      const items = await dataService.uploadMediaBatch(
        queue.map(item => ({
          file: item.file,
          caption: item.caption,
        })),
        {
          author: authorName,
          onFileProgress: (fileIndex, progress) => {
            // Update progress for specific file
            setQueue(prev => prev.map((item, index) => {
              if (index === fileIndex) {
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
      console.error('Upload failed:', error);
      alert('Erreur lors de l\'envoi. Veuillez réessayer.');
      // Mark all as error
      setQueue(prev => prev.map(item => ({ ...item, uploadStatus: 'error' as const })));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Author Name Input */}
      <div>
        <label className="block text-sm font-medium text-deep-charcoal mb-1">
          Votre Prénom
        </label>
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Ex: Sophie"
          className="w-full px-3 py-2 border-2 border-silver-mist rounded-lg focus:ring-2 focus:ring-burgundy-old focus:border-burgundy-old focus:outline-hidden bg-pearl-white transition-colors"
        />
        <p className="text-xs text-warm-taupe mt-1">
          Sera mémorisé pour vos prochains envois.
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
        />
        <div className="flex items-center justify-center gap-2 text-warm-taupe">
          <Plus size={20} />
          <span className="font-medium text-sm">Ajouter des photos/vidéos</span>
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
                  <video src={item.preview} className="w-full h-full object-cover" />
                ) : (
                  <img src={item.preview} alt="preview" className="w-full h-full object-cover" />
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
                  </div>
                  {!uploading && (
                    <button
                      onClick={() => removeFile(item.id)}
                      className="text-warm-taupe hover:text-red-500 transition-colors"
                      aria-label="Retirer"
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
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={item.caption}
                      onChange={(e) => updateCaption(item.id, e.target.value)}
                      placeholder="Légende..."
                      className="flex-1 px-2 py-1 text-sm border border-silver-mist rounded-sm focus:outline-hidden focus:ring-1 focus:ring-burgundy-old bg-ivory"
                    />
                    <button
                      onClick={() => generateAICaption(item.id)}
                      disabled={generatingFor === item.id}
                      className="bg-violet-100 text-violet-600 p-1.5 rounded-sm hover:bg-violet-200 transition-colors disabled:opacity-50"
                      title="Générer une légende IA"
                    >
                      {generatingFor === item.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Sparkles size={16} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Upload Button */}
          <div className="pt-2 border-t border-silver-mist space-y-3">
            {/* Overall Progress */}
            {uploading && (() => {
              const totalProgress = queue.reduce((sum, item) => sum + (item.uploadProgress || 0), 0);
              const overallProgress = Math.round(totalProgress / queue.length);
              const completedCount = queue.filter(item => item.uploadStatus === 'complete').length;

              return (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-warm-taupe">
                    <span>Progression globale</span>
                    <span className="font-semibold">{completedCount}/{queue.length} - {overallProgress}%</span>
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

            {/* Upload Button */}
            <button
              onClick={handleUploadAll}
              disabled={uploading}
              className="w-full btn-primary flex justify-center items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Upload size={18} />
                  <span>Envoyer {queue.length} souvenir{queue.length > 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
