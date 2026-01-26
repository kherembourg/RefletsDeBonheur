import { useState, memo } from 'react';
import { Trash2, Video, Heart, CheckCircle, Circle, Maximize2 } from 'lucide-react';
import type { MediaItem, DataService } from '../../lib/services/dataService';
import ReactionsPanel from './ReactionsPanel';

interface MediaCardProps {
  item: MediaItem;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onClick?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
  dataService?: DataService;
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
  dataService
}: MediaCardProps) {
  // Use prop for favorited state, with local state for optimistic updates
  const [localFavorited, setLocalFavorited] = useState(isFavoritedProp);
  const [favoriteCount, setFavoriteCount] = useState(item.favoriteCount || 0);
  const [isHovered, setIsHovered] = useState(false);

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
      setFavoriteCount((prev: number) => prev + (newState ? 1 : -1));
    }
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
      onClick();
    }
  };

  return (
    <div
      className={`media-card break-inside-avoid relative group cursor-pointer ${
        isSelected ? 'ring-2 ring-burgundy-old ring-offset-2 ring-offset-cream' : ''
      }`}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Elegant frame container */}
      <div className="relative overflow-hidden bg-white shadow-xs transition-all duration-500 ease-out group-hover:shadow-xl">
        {/* Subtle border frame */}
        <div className="absolute inset-0 border border-charcoal/5 z-10 pointer-events-none transition-all duration-500 group-hover:border-burgundy-old/20" />

        {/* Image container with padding for frame effect */}
        <div className="relative p-2 sm:p-3">
          {/* Inner frame border */}
          <div className="absolute inset-2 sm:inset-3 border border-charcoal/3 pointer-events-none z-10" />

          {/* Media Display */}
          {item.type === 'video' ? (
            <div className="relative overflow-hidden">
              <video
                src={item.url}
                controls
                className="w-full h-auto object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                poster={item.thumbnailUrl}
              />
              <div className="absolute top-3 right-3 bg-charcoal/80 backdrop-blur-xs p-2 text-white z-20">
                <Video size={14} />
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden">
              <img
                src={item.url}
                alt={item.caption || `Photo par ${item.author}`}
                className="w-full h-auto object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                loading="lazy"
              />

              {/* Elegant hover overlay */}
              <div
                className={`absolute inset-0 bg-linear-to-t from-charcoal/80 via-charcoal/20 to-transparent transition-opacity duration-500 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Expand icon on hover */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
                  isHovered && !selectionMode ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="w-12 h-12 border border-white/50 flex items-center justify-center backdrop-blur-xs bg-white/10 transition-transform duration-300 group-hover:scale-110">
                  <Maximize2 className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Caption area - elegant typography */}
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-1">
          {item.caption && (
            <p className="font-serif text-sm text-charcoal/80 italic line-clamp-2 mb-1 leading-relaxed">
              "{item.caption}"
            </p>
          )}
          <p className="text-xs text-charcoal/50 font-light tracking-wide uppercase">
            {item.author || 'Anonyme'}
          </p>
        </div>

        {/* Reactions Panel (visible on hover) */}
        {!selectionMode && isHovered && (
          <div
            className="absolute bottom-16 left-3 right-3 z-20 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white/95 backdrop-blur-xs p-2 shadow-lg">
              <ReactionsPanel mediaId={item.id} dataService={dataService} compact={true} />
            </div>
          </div>
        )}

        {/* Favorite Button - elegant minimal style */}
        <button
          onClick={handleFavorite}
          className={`absolute top-4 right-4 sm:top-5 sm:right-5 p-2 transition-all duration-300 z-20 ${
            favorited
              ? 'bg-burgundy-old text-white shadow-md'
              : `bg-white/90 backdrop-blur-xs text-charcoal/60 shadow-xs ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                } hover:bg-white hover:text-burgundy-old`
          }`}
          aria-label={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart
            size={16}
            fill={favorited ? 'currentColor' : 'none'}
            strokeWidth={1.5}
          />
        </button>

        {/* Favorite Count Badge */}
        {favoriteCount > 0 && !selectionMode && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 translate-x-1/2 -translate-y-1/2 bg-burgundy-old text-white text-[10px] font-medium w-5 h-5 flex items-center justify-center pointer-events-none z-30">
            {favoriteCount}
          </div>
        )}

        {/* Selection Checkbox - elegant style */}
        {selectionMode && (
          <button
            onClick={handleSelection}
            className="absolute top-4 left-4 sm:top-5 sm:left-5 p-1 bg-white/90 backdrop-blur-xs shadow-xs transition-all duration-200 hover:bg-white z-20"
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
        {isAdmin && !selectionMode && (
          <button
            onClick={handleDelete}
            className={`absolute top-4 left-4 sm:top-5 sm:left-5 bg-white/90 backdrop-blur-xs text-charcoal/60 p-2 transition-all duration-300 hover:bg-burgundy-old hover:text-white shadow-xs z-20 ${
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
