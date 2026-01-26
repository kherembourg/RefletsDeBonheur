import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { Upload, Lock, ImageIcon, Play, CheckSquare, Grid3X3, LayoutGrid, Loader2 } from 'lucide-react';
import { MediaCard } from './MediaCard';
import { UploadModal } from './UploadModal';
import { SearchFilters, type MediaType, type SortOption } from './SearchFilters';

// Lazy load heavy components that are conditionally rendered
const Lightbox = lazy(() => import('./Lightbox').then(m => ({ default: m.Lightbox })));
const Slideshow = lazy(() => import('./Slideshow').then(m => ({ default: m.Slideshow })));
import BulkActions from './BulkActions';
import { requireAuth, isAdmin as checkIsAdmin } from '../../lib/auth';
import { DataService, type MediaItem, type Album } from '../../lib/services/dataService';

interface GalleryGridProps {
  weddingId?: string;
  demoMode?: boolean; // Skip auth check for demo page
}

export function GalleryGrid({ weddingId, demoMode = false }: GalleryGridProps) {
  // Create service once using ref
  const serviceRef = useRef<DataService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = new DataService({ demoMode, weddingId });
  }
  const dataService = serviceRef.current;

  // Start with empty state and loading to avoid hydration mismatch
  // Both server and client render the same thing initially
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  const settings = dataService.getSettings();

  // Effect to load data after hydration (client-side only)
  useEffect(() => {
    // Initialize demo storage if needed
    if (demoMode) {
      dataService.initializeDemoStorage();
    }

    // Load media and albums
    const loadData = async () => {
      try {
        const [mediaData, albumsData] = await Promise.all([
          dataService.getMedia(),
          dataService.getAlbums()
        ]);
        setMedia(mediaData);
        setAlbums(albumsData);
      } catch (err) {
        console.error('[GalleryGrid] Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [demoMode, dataService]);

  const refresh = async () => {
    const data = await dataService.getMedia();
    setMedia(data);
  };

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [gridStyle, setGridStyle] = useState<'masonry' | 'grid'>('masonry');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set());

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Run auth check and favorites loading in parallel
    const init = async () => {
      const [, favorites] = await Promise.all([
        // Check authentication (skip in demo mode)
        !demoMode ? requireAuth() : Promise.resolve(),
        // Load user favorites
        dataService.getFavorites()
      ]);
      // Check admin status (in demo mode, allow admin features)
      setIsAdmin(demoMode || checkIsAdmin());
      setUserFavorites(favorites);
    };
    init();
  }, [demoMode, dataService]);

  // Filter and sort media
  const filteredMedia = useMemo(() => {
    let result = [...media];

    // Filter by album
    if (selectedAlbumId) {
      result = result.filter(item => item.albumIds?.includes(selectedAlbumId));
    }

    // Filter by favorites
    if (showFavoritesOnly) {
      result = result.filter(item => userFavorites.has(item.id));
    }

    // Filter by type
    if (mediaType !== 'all') {
      result = result.filter(item => item.type === mediaType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        (item.caption && item.caption.toLowerCase().includes(query)) ||
        (item.author && item.author.toLowerCase().includes(query))
      );
    }

    // Sort (using toSorted for immutability)
    return result.toSorted((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'oldest':
          return a.createdAt.getTime() - b.createdAt.getTime();
        case 'author':
          return (a.author || '').localeCompare(b.author || '');
        default:
          return 0;
      }
    });
  }, [media, selectedAlbumId, mediaType, searchQuery, sortBy, showFavoritesOnly, userFavorites]);

  const handleDelete = async (id: string) => {
    await dataService.deleteMedia(id);
    refresh();
  };

  const handleToggleFavorite = async (id: string) => {
    const newState = await dataService.toggleFavorite(id);
    // Update local state
    setUserFavorites(prev => {
      const newSet = new Set(prev);
      if (newState) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleUploadComplete = async (items: MediaItem[]) => {
    // Items are already saved to the database by the upload process
    // Just refresh the gallery to show them
    refresh();
    setShowUploadModal(false);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedItems(new Set());
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    setSelectionMode(false);
  };

  return (
    <div className="space-y-8">
      {/* Elegant Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-6 border-b border-charcoal/10">
        <div>
          <p className="text-burgundy-old/70 tracking-[0.2em] uppercase text-xs font-sans font-medium mb-2">
            Collection
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl font-light text-charcoal">
            Moments Précieux
          </h2>
          <p className="text-charcoal/50 text-sm font-light mt-1">
            {media.length} souvenir{media.length > 1 ? 's' : ''} partagé{media.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Action Buttons - Elegant Style */}
        <div className="flex items-center gap-3">
          {/* Grid Style Toggle */}
          {media.length > 0 && !selectionMode && (
            <div className="flex border border-charcoal/10 divide-x divide-charcoal/10">
              <button
                onClick={() => setGridStyle('masonry')}
                className={`p-2.5 transition-all duration-200 ${
                  gridStyle === 'masonry'
                    ? 'bg-charcoal text-white'
                    : 'bg-white text-charcoal/60 hover:text-charcoal'
                }`}
                title="Vue mosaïque"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setGridStyle('grid')}
                className={`p-2.5 transition-all duration-200 ${
                  gridStyle === 'grid'
                    ? 'bg-charcoal text-white'
                    : 'bg-white text-charcoal/60 hover:text-charcoal'
                }`}
                title="Vue grille"
              >
                <Grid3X3 size={16} />
              </button>
            </div>
          )}

          {/* Select Mode Button */}
          {media.length > 0 && (
            <button
              onClick={toggleSelectionMode}
              className={`px-4 py-2.5 flex items-center gap-2 transition-all duration-300 font-medium text-sm tracking-wide ${
                selectionMode
                  ? 'bg-burgundy-old text-white'
                  : 'bg-white border border-charcoal/10 text-charcoal/70 hover:border-charcoal/30 hover:text-charcoal'
              }`}
              title={selectionMode ? 'Annuler la sélection' : 'Sélectionner des photos'}
            >
              <CheckSquare size={16} />
              <span className="hidden sm:inline">{selectionMode ? 'Annuler' : 'Sélectionner'}</span>
            </button>
          )}

          {/* Slideshow Button */}
          {media.length > 0 && !selectionMode && (
            <button
              onClick={() => setShowSlideshow(true)}
              className="px-4 py-2.5 bg-charcoal text-white flex items-center gap-2 transition-all duration-300 hover:bg-charcoal/90 font-medium text-sm tracking-wide"
              title="Lancer le diaporama"
            >
              <Play size={16} />
              <span className="hidden sm:inline">Diaporama</span>
            </button>
          )}

          {/* Upload Button or Lock Message */}
          {!selectionMode && (settings.allowUploads ? (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2.5 bg-burgundy-old text-white flex items-center gap-2 transition-all duration-300 hover:bg-[#c92a38] font-medium text-sm tracking-wide"
            >
              <Upload size={16} />
              <span className="hidden sm:inline">Partager</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-charcoal/50 bg-cream px-4 py-2.5 text-sm font-light">
              <Lock size={14} />
              <span>Uploads fermés</span>
            </div>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      {media.length > 0 && (
        <SearchFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          mediaType={mediaType}
          onMediaTypeChange={setMediaType}
          sortBy={sortBy}
          onSortChange={setSortBy}
          showFavoritesOnly={showFavoritesOnly}
          onShowFavoritesChange={setShowFavoritesOnly}
          selectedAlbumId={selectedAlbumId}
          onAlbumChange={setSelectedAlbumId}
          albums={albums}
          resultCount={filteredMedia.length}
          totalCount={media.length}
        />
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-24">
          <div className="w-8 h-8 mx-auto mb-4 animate-spin">
            <Loader2 className="w-full h-full text-burgundy-old" />
          </div>
          <p className="text-charcoal/60 font-light">Chargement des photos...</p>
        </div>
      ) : media.length === 0 ? (
        /* Empty State - No media at all */
        <div className="text-center py-16 sm:py-24 px-4">
          {/* Decorative illustration */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 bg-linear-to-br from-burgundy-old/5 to-burgundy-old/10 rounded-full"></div>
            <div className="absolute inset-4 bg-white rounded-full shadow-inner flex items-center justify-center">
              <ImageIcon className="text-burgundy-old/40" size={36} />
            </div>
            {/* Decorative sparkles */}
            <div className="absolute -top-2 -right-2 w-6 h-6 text-burgundy-old/30">✨</div>
            <div className="absolute -bottom-1 -left-3 w-4 h-4 text-burgundy-old/20">✨</div>
          </div>

          <h3 className="font-serif text-2xl sm:text-3xl text-charcoal mb-3">
            Votre galerie vous attend
          </h3>
          <p className="text-charcoal/50 font-light max-w-md mx-auto mb-8 leading-relaxed">
            Immortalisez les moments précieux de cette journée.
            Partagez vos photos et vidéos pour créer ensemble un album de souvenirs inoubliables.
          </p>

          {settings.allowUploads ? (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-3 px-8 py-4 bg-burgundy-old text-white rounded-none hover:bg-[#c92a38] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Upload size={20} />
              <span className="font-medium tracking-wide">Partager vos premiers souvenirs</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-cream text-charcoal/60 rounded-none">
              <Lock size={16} />
              <span className="font-light">Les uploads seront bientôt disponibles</span>
            </div>
          )}

          {/* Decorative bottom element */}
          <div className="flex items-center justify-center gap-4 mt-12">
            <div className="w-16 h-px bg-linear-to-r from-transparent to-burgundy-old/20"></div>
            <div className="text-burgundy-old/30 text-lg">❧</div>
            <div className="w-16 h-px bg-linear-to-r from-burgundy-old/20 to-transparent"></div>
          </div>
        </div>
      ) : filteredMedia.length === 0 ? (
        /* Empty State - No results from filtering */
        <div className="text-center py-24 border border-dashed border-charcoal/10">
          <div className="w-16 h-16 mx-auto mb-6 border border-charcoal/10 flex items-center justify-center">
            <ImageIcon className="text-charcoal/30" size={28} />
          </div>
          <p className="font-serif text-xl text-charcoal/60 mb-2">Aucun résultat trouvé</p>
          <p className="text-charcoal/40 font-light text-sm">Essayez de modifier vos filtres</p>
        </div>
      ) : (
        /* Gallery Grid */
        <div className={
          gridStyle === 'masonry'
            ? "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6"
            : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6"
        }>
          {filteredMedia.map((item, index) => (
            <div
              key={item.id}
              className={`gallery-item ${gridStyle === 'masonry' ? 'mb-6 break-inside-avoid' : ''}`}
              style={{
                animationDelay: `${Math.min(index * 0.05, 0.5)}s`
              }}
            >
              <MediaCard
                item={item}
                isAdmin={isAdmin}
                onDelete={handleDelete}
                onClick={() => setLightboxIndex(index)}
                selectionMode={selectionMode}
                isSelected={selectedItems.has(item.id)}
                onToggleSelection={toggleItemSelection}
                isFavorited={userFavorites.has(item.id)}
                onToggleFavorite={handleToggleFavorite}
                dataService={dataService}
              />
            </div>
          ))}
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectionMode && (
        <BulkActions
          selectedItems={selectedItems}
          allItems={filteredMedia}
          onClearSelection={clearSelection}
        />
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={handleUploadComplete}
        dataService={dataService}
      />

      {/* Lightbox (lazy loaded) */}
      {lightboxIndex !== null && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-deep-charcoal/95 z-50 flex items-center justify-center">
            <div className="w-8 h-8 animate-spin">
              <Loader2 className="w-full h-full text-white" />
            </div>
          </div>
        }>
          <Lightbox
            media={filteredMedia}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        </Suspense>
      )}

      {/* Slideshow (lazy loaded) */}
      {showSlideshow && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-deep-charcoal/95 z-50 flex items-center justify-center">
            <div className="w-8 h-8 animate-spin">
              <Loader2 className="w-full h-full text-white" />
            </div>
          </div>
        }>
          <Slideshow
            media={filteredMedia.length > 0 ? filteredMedia : media}
            initialIndex={0}
            onClose={() => setShowSlideshow(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
