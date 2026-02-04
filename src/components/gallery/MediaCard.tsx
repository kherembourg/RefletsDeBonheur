import { useState, memo, useCallback } from 'react';
import { Trash2, Video, Heart, CheckCircle, Circle, Download } from 'lucide-react';
import type { MediaItem, DataService } from '../../lib/services/dataService';

// Default placeholder gradient for items without a pre-generated placeholder
const DEFAULT_PLACEHOLDER = 'linear-gradient(135deg, #f5f0e8 0%, #e8d5d3 50%, #f0e6e4 100%)';

// Generate responsive srcset for Unsplash images
function generateSrcSet(url: string): string | undefined {
  if (!url.includes('unsplash.com')) return undefined;

  const baseUrl = url.split('?')[0];
  const sizes = [320, 480, 640, 800];

  return sizes
    .map(w => `${baseUrl}?w=${w}&q=75&auto=format&fit=crop ${w}w`)
    .join(', ');
}

interface MediaCardProps {
  item: MediaItem;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onClick?: (id: string) => void;  // Pass item id for memoization
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
  dataService?: DataService;
  variant?: 'public' | 'admin';
}

export const MediaCard = memo(function MediaCard({
  item,
  isAdmin,
  onDelete,
  onClick,
  selectionMode = false,
  isSelected = false,
  onToggleSelection,
  isFavorited: isFavoritedProp = false,
  onToggleFavorite,
  dataService,
  variant = 'public'
}: MediaCardProps) {
  const isPublicView = variant === 'public';
  const isAdminView = variant === 'admin';

  // Use prop for favorited state, with local state for optimistic updates
  const [localFavorited, setLocalFavorited] = useState(isFavoritedProp);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  // Sync with prop changes
  if (isFavoritedProp !== localFavorited && !onToggleFavorite) {
    // Only sync if we're not using the callback pattern
  }

  const favorited = onToggleFavorite ? isFavoritedProp : localFavorited;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Supprimer définitivement ce souvenir ?')) {
      onDelete(item.id);
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      // Use callback from parent
      onToggleFavorite(item.id);
    } else if (dataService) {
      // Use dataService directly
      const newState = dataService.syncToggleFavorite(item.id);
      setLocalFavorited(newState);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.url.split('/').pop() || 'souvenir';
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSelection) {
      onToggleSelection(item.id);
    }
  };

  const handleCardClick = () => {
    if (selectionMode && onToggleSelection) {
      onToggleSelection(item.id);
    } else if (onClick) {
      onClick(item.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`media-card relative group cursor-pointer ${
        isSelected ? 'ring-2 ring-burgundy-old ring-offset-2 ring-offset-cream' : ''
      }`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={item.caption || `Photo par ${item.author || 'Anonyme'}`}
    >
      <div
        className={`relative overflow-hidden ${
          isPublicView
            ? 'rounded-2xl bg-white shadow-sm ring-1 ring-black/5'
            : 'rounded-xl bg-white shadow-sm ring-1 ring-black/5'
        }`}
      >
        {item.type === 'video' ? (
          <div className="relative">
            <video
              src={item.url}
              controls
              className={`w-full object-cover ${isAdminView ? 'aspect-[4/3]' : ''}`}
              poster={item.thumbnailUrl}
              width={400}
              height={300}
            />
            <div className="absolute top-3 right-3 bg-charcoal/80 backdrop-blur-xs p-2 text-white">
              <Video size={14} />
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Blur placeholder shown while image loads - uses pre-generated SVG or gradient */}
            {!imageLoaded && (
              item.placeholder ? (
                <img
                  src={item.placeholder}
                  alt=""
                  aria-hidden="true"
                  className={`absolute inset-0 w-full h-full object-cover ${isAdminView ? 'aspect-[4/3]' : 'min-h-[200px]'}`}
                />
              ) : (
                <div
                  className={`absolute inset-0 ${isAdminView ? 'aspect-[4/3]' : 'min-h-[200px]'}`}
                  style={{ background: DEFAULT_PLACEHOLDER }}
                />
              )
            )}
            <img
              src={item.thumbnailUrl || item.url}
              srcSet={generateSrcSet(item.thumbnailUrl || item.url)}
              sizes="(max-width: 640px) 320px, (max-width: 1024px) 480px, 400px"
              alt={item.caption || `Photo par ${item.author}`}
              className={`w-full object-cover transition-opacity duration-300 ${isAdminView ? 'aspect-[4/3]' : ''} ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
              decoding="async"
              width={400}
              height={300}
              onLoad={handleImageLoad}
            />

            {/* Processing indicator overlay for images being processed */}
            {item.status === 'processing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 shadow-sm">
                  <div className="w-3 h-3 border-2 border-charcoal/20 border-t-charcoal/70 rounded-full animate-spin" />
                  <span className="text-xs font-medium text-charcoal/70">Processing...</span>
                </div>
              </div>
            )}

            {isPublicView && (
              <div className={`absolute inset-0 bg-black/5 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
            )}
          </div>
        )}

        {/* Author label (public) */}
        {isPublicView && item.author && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/85 text-charcoal/70 shadow-sm">
            {item.author}
          </div>
        )}

        {/* Action buttons (public) */}
        {isPublicView && !selectionMode && (
          <div className="absolute right-3 bottom-3 md:top-3 md:right-3 md:bottom-auto flex items-center gap-2">
            <button
              onClick={handleFavorite}
              className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-colors ${
                favorited ? 'bg-burgundy-old text-white' : 'bg-white text-charcoal/60 hover:text-charcoal'
              }`}
              aria-label={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart size={16} fill={favorited ? 'currentColor' : 'none'} strokeWidth={1.5} />
            </button>
            {item.type !== 'video' && (
              <button
                onClick={handleDownload}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white text-charcoal/60 hover:text-charcoal shadow-sm"
                aria-label="Télécharger"
              >
                <Download size={16} />
              </button>
            )}
          </div>
        )}

        {/* Selection Checkbox - admin */}
        {isAdminView && selectionMode && (
          <button
            onClick={handleSelection}
            className="absolute top-3 left-3 p-1.5 bg-white/90 backdrop-blur-xs shadow-xs rounded-full transition-all duration-200 hover:bg-white"
            aria-label={isSelected ? 'Désélectionner' : 'Sélectionner'}
          >
            {isSelected ? (
              <CheckCircle size={20} className="text-burgundy-old" fill="currentColor" />
            ) : (
              <Circle size={20} className="text-charcoal/40" />
            )}
          </button>
        )}

        {/* Delete Button (Admin Only) */}
        {isAdminView && isAdmin && !selectionMode && (
          <button
            onClick={handleDelete}
            className={`absolute top-3 right-3 bg-white/90 backdrop-blur-xs text-charcoal/60 p-2 rounded-full transition-all duration-300 hover:bg-burgundy-old hover:text-white shadow-xs ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
            aria-label="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
});
