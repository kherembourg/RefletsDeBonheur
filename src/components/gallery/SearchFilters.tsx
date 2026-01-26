import { useState } from 'react';
import { Search, X, Image, Video, SortAsc, Heart, FolderOpen } from 'lucide-react';
import type { Album } from '../../lib/services/dataService';

export type MediaType = 'all' | 'image' | 'video';
export type SortOption = 'newest' | 'oldest' | 'author';

interface SearchFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  mediaType: MediaType;
  onMediaTypeChange: (type: MediaType) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  showFavoritesOnly: boolean;
  onShowFavoritesChange: (show: boolean) => void;
  selectedAlbumId: string | null;
  onAlbumChange: (albumId: string | null) => void;
  albums: Album[];
  resultCount: number;
  totalCount: number;
}

export function SearchFilters({
  searchQuery,
  onSearchChange,
  mediaType,
  onMediaTypeChange,
  sortBy,
  onSortChange,
  showFavoritesOnly,
  onShowFavoritesChange,
  selectedAlbumId,
  onAlbumChange,
  albums,
  resultCount,
  totalCount
}: SearchFiltersProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const hasActiveFilters = searchQuery || mediaType !== 'all' || sortBy !== 'newest' || showFavoritesOnly || selectedAlbumId !== null;

  const clearFilters = () => {
    onSearchChange('');
    onMediaTypeChange('all');
    onSortChange('newest');
    onShowFavoritesChange(false);
    onAlbumChange(null);
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Search Bar */}
      <div className="relative">
        <div
          className={`flex items-center gap-2 bg-ivory border-2 rounded-xl px-4 py-3 transition-all ${
            isSearchFocused
              ? 'border-burgundy-old shadow-md'
              : 'border-silver-mist hover:border-burgundy-old/50'
          }`}
        >
          <Search className="text-warm-taupe" size={20} aria-hidden="true" />
          <input
            type="search"
            name="gallery-search"
            placeholder="Rechercher par texte ou auteur..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="flex-1 bg-transparent border-none outline-hidden text-deep-charcoal placeholder-warm-taupe"
            aria-label="Rechercher dans la galerie"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="text-warm-taupe hover:text-deep-charcoal transition-colors"
              aria-label="Effacer la recherche"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips and Sort */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMediaTypeChange('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              mediaType === 'all'
                ? 'bg-burgundy-old text-white shadow-xs'
                : 'bg-silver-mist/30 text-warm-taupe hover:bg-silver-mist/50'
            }`}
          >
            Tout
          </button>
          <button
            onClick={() => onMediaTypeChange('image')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-1.5 ${
              mediaType === 'image'
                ? 'bg-burgundy-old text-white shadow-xs'
                : 'bg-silver-mist/30 text-warm-taupe hover:bg-silver-mist/50'
            }`}
          >
            <Image size={16} />
            Photos
          </button>
          <button
            onClick={() => onMediaTypeChange('video')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-1.5 ${
              mediaType === 'video'
                ? 'bg-burgundy-old text-white shadow-xs'
                : 'bg-silver-mist/30 text-warm-taupe hover:bg-silver-mist/50'
            }`}
          >
            <Video size={16} />
            Vidéos
          </button>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-silver-mist hidden sm:block" />

        {/* Favorites Filter */}
        <button
          onClick={() => onShowFavoritesChange(!showFavoritesOnly)}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-1.5 ${
            showFavoritesOnly
              ? 'bg-red-500 text-ivory shadow-xs'
              : 'bg-silver-mist/30 text-warm-taupe hover:bg-silver-mist/50'
          }`}
        >
          <Heart size={16} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
          Favoris
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-silver-mist hidden sm:block" />

        {/* Album Filter */}
        {albums.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <FolderOpen className="text-warm-taupe" size={18} aria-hidden="true" />
              <label htmlFor="album-filter" className="sr-only">Filtrer par album</label>
              <select
                id="album-filter"
                value={selectedAlbumId || ''}
                onChange={(e) => onAlbumChange(e.target.value || null)}
                className="px-3 py-2 bg-ivory border border-silver-mist rounded-lg text-sm text-deep-charcoal font-medium focus:ring-2 focus:ring-burgundy-old focus:border-burgundy-old transition-colors cursor-pointer"
              >
                <option value="">Tous les albums</option>
                {albums.map(album => (
                  <option key={album.id} value={album.id}>
                    {album.name} ({album.photoCount || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-silver-mist hidden sm:block" />
          </>
        )}

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <SortAsc className="text-warm-taupe" size={18} aria-hidden="true" />
          <label htmlFor="sort-by" className="sr-only">Trier par</label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="px-3 py-2 bg-ivory border border-silver-mist rounded-lg text-sm text-deep-charcoal font-medium focus:ring-2 focus:ring-burgundy-old focus:border-burgundy-old transition-colors cursor-pointer"
          >
            <option value="newest">Plus récent</option>
            <option value="oldest">Plus ancien</option>
            <option value="author">Par auteur</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <>
            <div className="h-8 w-px bg-silver-mist hidden sm:block" />
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-warm-taupe hover:text-deep-charcoal text-sm font-medium transition-colors flex items-center gap-1"
            >
              <X size={16} />
              Réinitialiser
            </button>
          </>
        )}
      </div>

      {/* Results Counter */}
      {hasActiveFilters && (
        <div className="text-sm text-warm-taupe">
          {resultCount === 0 ? (
            <span>Aucun résultat trouvé</span>
          ) : resultCount === totalCount ? (
            <span>{totalCount} résultat{totalCount > 1 ? 's' : ''}</span>
          ) : (
            <span>
              {resultCount} résultat{resultCount > 1 ? 's' : ''} sur {totalCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
