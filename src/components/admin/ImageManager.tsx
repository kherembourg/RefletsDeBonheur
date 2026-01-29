import { useState, useRef } from 'react';
import { Image, Upload, X, Check, AlertCircle, Link as LinkIcon, Info } from 'lucide-react';
import type { CustomImages } from '../../lib/customization';

interface ImageManagerProps {
  customImages?: CustomImages;
  onChange: (images: Partial<CustomImages>) => void;
  onUpload?: (file: File, key: keyof CustomImages) => Promise<string>;
  uploadProgress?: number | null;
}

interface ImageField {
  key: keyof CustomImages;
  label: string;
  description: string;
  recommendedSize: string;
  aspectRatio?: string;
}

const IMAGE_FIELDS: ImageField[] = [
  {
    key: 'heroImage',
    label: 'Image hero',
    description: 'Image principale en haut de page',
    recommendedSize: '1920x1080',
    aspectRatio: '16:9',
  },
  {
    key: 'heroBackgroundImage',
    label: 'Arrière-plan hero',
    description: 'Image de fond pour la section hero',
    recommendedSize: '1920x1080',
    aspectRatio: '16:9',
  },
  {
    key: 'couplePhoto',
    label: 'Photo du couple',
    description: 'Photo section "À propos"',
    recommendedSize: '800x800',
    aspectRatio: '1:1',
  },
  {
    key: 'galleryPlaceholder',
    label: 'Placeholder galerie',
    description: 'Image par défaut galerie vide',
    recommendedSize: '1200x800',
    aspectRatio: '3:2',
  },
  {
    key: 'logoImage',
    label: 'Logo',
    description: 'Logo dans l\'en-tête',
    recommendedSize: '200x200',
    aspectRatio: '1:1',
  },
  {
    key: 'faviconUrl',
    label: 'Favicon',
    description: 'Icône de l\'onglet navigateur',
    recommendedSize: '32x32',
    aspectRatio: '1:1',
  },
];

export function ImageManager({ customImages, onChange, onUpload, uploadProgress }: ImageManagerProps) {
  const [editingImages, setEditingImages] = useState<CustomImages>(customImages || {});
  const [uploadingKey, setUploadingKey] = useState<keyof CustomImages | null>(null);
  const [urlInputMode, setUrlInputMode] = useState<keyof CustomImages | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Handle image change
  const handleImageChange = (key: keyof CustomImages, value: string) => {
    const newImages = {
      ...editingImages,
      [key]: value || undefined,
    };

    // Remove undefined values
    Object.keys(newImages).forEach((k) => {
      if (newImages[k as keyof CustomImages] === undefined) {
        delete newImages[k as keyof CustomImages];
      }
    });

    setEditingImages(newImages);
    onChange(Object.keys(newImages).length > 0 ? newImages : undefined);
  };

  // Handle file upload
  const handleFileUpload = async (key: keyof CustomImages, file: File) => {
    if (!onUpload) {
      alert('La fonctionnalité d\'upload n\'est pas disponible');
      return;
    }

    // Validate file
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, [key]: 'Le fichier doit être une image' }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, [key]: 'L\'image doit faire moins de 10 MB' }));
      return;
    }

    try {
      setUploadingKey(key);
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });

      const url = await onUpload(file, key);
      handleImageChange(key, url);
    } catch (error) {
      console.error('Upload error:', error);
      setErrors((prev) => ({
        ...prev,
        [key]: 'Erreur lors de l\'upload',
      }));
    } finally {
      setUploadingKey(null);
    }
  };

  // Handle URL input
  const handleUrlSubmit = (key: keyof CustomImages, url: string) => {
    if (url && !isValidUrl(url)) {
      setErrors((prev) => ({ ...prev, [key]: 'URL invalide' }));
      return;
    }

    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });

    handleImageChange(key, url);
    setUrlInputMode(null);
  };

  // Validate URL
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Check if image is customized
  const isCustomized = (key: keyof CustomImages): boolean => {
    return !!editingImages[key];
  };

  // Reset all images
  const handleResetAll = () => {
    if (confirm('Réinitialiser toutes les images personnalisées ?')) {
      setEditingImages({});
      onChange(undefined);
      setErrors({});
    }
  };

  const hasCustomImages = Object.keys(editingImages).length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Image className="w-4 h-4 text-burgundy" />
            Images
          </h3>
          {hasCustomImages && (
            <button
              onClick={handleResetAll}
              className="text-xs text-gray-500 hover:text-burgundy transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Reset tout
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Personnalisez les images de votre site
        </p>
      </div>

      {/* Info Tip */}
      <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300">
          JPEG ou PNG recommandés. Max 10 MB.
        </p>
      </div>

      {/* Image Fields */}
      <div className="space-y-3">
        {IMAGE_FIELDS.map((field) => {
          const customized = isCustomized(field.key);
          const isUploading = uploadingKey === field.key;
          const error = errors[field.key];
          const imageUrl = editingImages[field.key];
          const isUrlMode = urlInputMode === field.key;

          return (
            <div
              key={field.key}
              className={`border rounded-xl p-3 transition-all ${
                customized
                  ? 'border-burgundy/50 bg-burgundy/5'
                  : 'border-[#2a2a2a] bg-[#0f0f0f]'
              }`}
            >
              <div className="flex gap-3">
                {/* Image Preview */}
                <div className="w-20 h-20 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] overflow-hidden shrink-0 relative">
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt={field.label}
                        className="w-full h-full object-cover"
                      />
                      {customized && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-burgundy rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <Image className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Field Info & Actions */}
                <div className="flex-1 min-w-0">
                  {/* Label */}
                  <div className="mb-2">
                    <h4 className="text-sm font-medium text-white flex items-center gap-1.5">
                      {field.label}
                      {customized && <Check className="w-3 h-3 text-burgundy" />}
                    </h4>
                    <p className="text-[10px] text-gray-500">
                      {field.recommendedSize} {field.aspectRatio && `• ${field.aspectRatio}`}
                    </p>
                  </div>

                  {/* URL Input Mode */}
                  {isUrlMode ? (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://..."
                        defaultValue={imageUrl || ''}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUrlSubmit(field.key, (e.target as HTMLInputElement).value);
                          } else if (e.key === 'Escape') {
                            setUrlInputMode(null);
                          }
                        }}
                        className="flex-1 px-2 py-1.5 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] text-xs text-white placeholder-gray-600"
                        autoFocus
                      />
                      <button
                        onClick={(e) => {
                          const input = (e.target as HTMLElement).closest('div')?.querySelector('input');
                          if (input) handleUrlSubmit(field.key, input.value);
                        }}
                        className="px-2 py-1.5 bg-burgundy text-white rounded-md text-xs hover:bg-burgundy-light transition-colors"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setUrlInputMode(null)}
                        className="px-2 py-1.5 bg-[#2a2a2a] text-gray-400 rounded-md text-xs hover:bg-[#3a3a3a] transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {/* Upload Button */}
                      <button
                        onClick={() => fileInputRefs.current[field.key]?.click()}
                        disabled={isUploading}
                        className="px-2.5 py-1.5 bg-burgundy text-white rounded-md text-xs hover:bg-burgundy-light transition-colors flex items-center gap-1.5 disabled:opacity-50 relative overflow-hidden min-w-[70px]"
                      >
                        {isUploading ? (
                          <>
                            {/* Progress bar background */}
                            {uploadProgress !== null && uploadProgress !== undefined && (
                              <div
                                className="absolute inset-0 bg-burgundy-light transition-all duration-200"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            )}
                            <span className="relative flex items-center gap-1.5">
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              {uploadProgress !== null && uploadProgress !== undefined
                                ? `${uploadProgress}%`
                                : 'Upload...'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3 h-3" />
                            Upload
                          </>
                        )}
                      </button>

                      {/* URL Button */}
                      <button
                        onClick={() => setUrlInputMode(field.key)}
                        className="px-2.5 py-1.5 bg-[#2a2a2a] text-gray-300 rounded-md text-xs hover:bg-[#3a3a3a] transition-colors flex items-center gap-1.5"
                      >
                        <LinkIcon className="w-3 h-3" />
                        URL
                      </button>

                      {/* Remove Button */}
                      {customized && (
                        <button
                          onClick={() => handleImageChange(field.key, '')}
                          className="px-2.5 py-1.5 bg-red-500/20 text-red-400 rounded-md text-xs hover:bg-red-500/30 transition-colors flex items-center gap-1.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}

                      {/* Hidden File Input */}
                      <input
                        ref={(el) => (fileInputRefs.current[field.key] = el)}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(field.key, file);
                        }}
                        className="hidden"
                      />
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <p className="text-[10px] text-red-400 flex items-center gap-1 mt-1.5">
                      <AlertCircle className="w-3 h-3" />
                      {error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
