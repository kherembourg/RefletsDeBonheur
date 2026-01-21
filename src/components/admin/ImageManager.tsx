import { useState, useRef } from 'react';
import { Image, Upload, X, Check, AlertCircle, Link as LinkIcon } from 'lucide-react';
import type { CustomImages } from '../../lib/customization';

interface ImageManagerProps {
  customImages?: CustomImages;
  onChange: (images: CustomImages | undefined) => void;
  onUpload?: (file: File, key: keyof CustomImages) => Promise<string>;
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
    label: 'Image hero principale',
    description: 'Grande image affichée en haut de la page d\'accueil',
    recommendedSize: '1920x1080px',
    aspectRatio: '16:9',
  },
  {
    key: 'heroBackgroundImage',
    label: 'Arrière-plan hero',
    description: 'Image d\'arrière-plan pour la section hero',
    recommendedSize: '1920x1080px',
    aspectRatio: '16:9',
  },
  {
    key: 'couplePhoto',
    label: 'Photo du couple',
    description: 'Photo affichée dans la section "À propos"',
    recommendedSize: '800x800px',
    aspectRatio: '1:1',
  },
  {
    key: 'galleryPlaceholder',
    label: 'Placeholder galerie',
    description: 'Image par défaut pour la galerie vide',
    recommendedSize: '1200x800px',
    aspectRatio: '3:2',
  },
  {
    key: 'logoImage',
    label: 'Logo',
    description: 'Logo affiché dans l\'en-tête',
    recommendedSize: '200x200px',
    aspectRatio: '1:1',
  },
  {
    key: 'faviconUrl',
    label: 'Favicon',
    description: 'Icône affichée dans l\'onglet du navigateur',
    recommendedSize: '32x32px',
    aspectRatio: '1:1',
  },
];

export function ImageManager({ customImages, onChange, onUpload }: ImageManagerProps) {
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
        [key]: 'Erreur lors de l\'upload. Veuillez réessayer.',
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-deep-charcoal flex items-center gap-2">
            <Image className="w-5 h-5 text-burgundy" />
            Gestion des images
          </h3>
          {hasCustomImages && (
            <button
              onClick={handleResetAll}
              className="text-sm text-warm-taupe hover:text-burgundy transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Tout réinitialiser
            </button>
          )}
        </div>
        <p className="text-sm text-warm-taupe">
          Personnalisez les images de votre site de mariage
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <p className="font-medium mb-1">Formats recommandés</p>
          <p>
            Utilisez des images au format JPEG ou PNG. Pour de meilleures
            performances, optimisez vos images avant de les télécharger (max 10 MB).
          </p>
        </div>
      </div>

      {/* Image Fields */}
      <div className="space-y-6">
        {IMAGE_FIELDS.map((field) => {
          const customized = isCustomized(field.key);
          const isUploading = uploadingKey === field.key;
          const error = errors[field.key];
          const imageUrl = editingImages[field.key];
          const isUrlMode = urlInputMode === field.key;

          return (
            <div
              key={field.key}
              className={`border-2 rounded-xl p-4 transition-all ${
                customized
                  ? 'border-green-300 bg-green-50/50'
                  : 'border-silver-mist/30 bg-white'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Image Preview */}
                <div className="w-32 h-32 rounded-lg bg-silver-mist/20 border-2 border-silver-mist/30 overflow-hidden shrink-0 relative">
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt={field.label}
                        className="w-full h-full object-cover"
                      />
                      {customized && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-warm-taupe">
                      <Image className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Field Info & Actions */}
                <div className="flex-1 space-y-3">
                  {/* Label */}
                  <div>
                    <h4 className="text-sm font-semibold text-deep-charcoal flex items-center gap-2">
                      {field.label}
                      {customized && (
                        <span title="Personnalisé">
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-warm-taupe mt-0.5">
                      {field.description}
                    </p>
                    <p className="text-xs text-warm-taupe mt-0.5">
                      <strong>Recommandé :</strong> {field.recommendedSize}
                      {field.aspectRatio && ` (${field.aspectRatio})`}
                    </p>
                  </div>

                  {/* URL Input Mode */}
                  {isUrlMode ? (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        defaultValue={imageUrl || ''}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUrlSubmit(
                              field.key,
                              (e.target as HTMLInputElement).value
                            );
                          }
                        }}
                        className="flex-1 px-3 py-2 rounded-lg border border-silver-mist/30 text-sm"
                        autoFocus
                      />
                      <button
                        onClick={(e) => {
                          const input = (e.target as HTMLElement)
                            .closest('div')
                            ?.querySelector('input');
                          if (input) {
                            handleUrlSubmit(field.key, input.value);
                          }
                        }}
                        className="px-4 py-2 bg-burgundy text-white rounded-lg hover:bg-burgundy-dark transition-colors text-sm"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setUrlInputMode(null)}
                        className="px-4 py-2 bg-silver-mist/30 text-warm-taupe rounded-lg hover:bg-silver-mist/50 transition-colors text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {/* Upload Button */}
                        <button
                          onClick={() => fileInputRefs.current[field.key]?.click()}
                          disabled={isUploading}
                          className="px-4 py-2 bg-burgundy text-white rounded-lg hover:bg-burgundy-dark transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isUploading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Upload...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Télécharger
                            </>
                          )}
                        </button>

                        {/* URL Button */}
                        <button
                          onClick={() => setUrlInputMode(field.key)}
                          className="px-4 py-2 bg-white border border-silver-mist/30 text-warm-taupe rounded-lg hover:border-silver-mist hover:text-deep-charcoal transition-colors text-sm flex items-center gap-2"
                        >
                          <LinkIcon className="w-4 h-4" />
                          URL
                        </button>

                        {/* Remove Button */}
                        {customized && (
                          <button
                            onClick={() => handleImageChange(field.key, '')}
                            className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Supprimer
                          </button>
                        )}
                      </div>

                      {/* Hidden File Input */}
                      <input
                        ref={(el) => (fileInputRefs.current[field.key] = el)}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(field.key, file);
                          }
                        }}
                        className="hidden"
                      />
                    </>
                  )}

                  {/* Error */}
                  {error && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {error}
                    </p>
                  )}

                  {/* Current URL */}
                  {imageUrl && !isUrlMode && (
                    <p className="text-xs text-warm-taupe truncate" title={imageUrl}>
                      <strong>URL :</strong> {imageUrl}
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
