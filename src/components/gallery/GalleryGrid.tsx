import { useState, useEffect, useMemo, useRef, lazy, Suspense, useCallback } from 'react';
import { Upload, Lock, ImageIcon, Loader2, CheckSquare, Trash2, FolderPlus } from 'lucide-react';
import { MediaCard } from './MediaCard';
import { UploadModal } from './UploadModal';

// Lazy load heavy components that are conditionally rendered
const Lightbox = lazy(() => import('./Lightbox').then(m => ({ default: m.Lightbox })));
import { requireAuth, isAdmin as checkIsAdmin } from '../../lib/auth';
import { DataService, type MediaItem, type Album } from '../../lib/services/dataService';

interface GalleryGridProps {
  weddingId?: string;
  demoMode?: boolean; // Skip auth check for demo page
  variant?: 'public' | 'admin';
}

export function GalleryGrid({ weddingId, demoMode = false, variant = 'public' }: GalleryGridProps) {
  // Create service once using ref
  const serviceRef = useRef<DataService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = new DataService({ demoMode, weddingId });
  }
  const dataService = serviceRef.current;

  const isAdminView = variant === 'admin';
  const isPublicView = variant === 'public';

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

  const refresh = useCallback(async () => {
    const data = await dataService.getMedia();
    setMedia(data);
  }, [dataService]);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Filter state
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set());

  // Bulk selection state (admin view)
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

    // Sort newest first
    return result.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [media, selectedAlbumId]);

  // Memoized handlers to prevent breaking MediaCard memo optimization
  const handleDelete = useCallback(async (id: string) => {
    await dataService.deleteMedia(id);
    refresh();
  }, [dataService, refresh]);

  const handleToggleFavorite = useCallback(async (id: string) => {
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
  }, [dataService]);

  const handleUploadComplete = useCallback(async (_items: MediaItem[]) => {
    await refresh();
    setShowUploadModal(false);
  }, [refresh]);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      if (prev) {
        setSelectedItems(new Set());
      }
      return !prev;
    });
  }, []);

  const toggleItemSelection = useCallback((id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    setSelectionMode(false);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedItems.size === 0) return;
    const count = selectedItems.size;
    if (!confirm(`Supprimer ${count} souvenir${count > 1 ? 's' : ''} ?`)) {
      return;
    }
    await Promise.all([...selectedItems].map(id => dataService.deleteMedia(id)));
    await refresh();
    clearSelection();
  }, [selectedItems, dataService, refresh, clearSelection]);

  // Memoized click handler for lightbox - looks up index from id
  const handleMediaClick = useCallback((id: string) => {
    const index = filteredMedia.findIndex(item => item.id === id);
    if (index !== -1) {
      setLightboxIndex(index);
    }
  }, [filteredMedia]);

  const gridClassName = isAdminView
    ? 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6'
    : 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6';

  return (
    <div className="space-y-6">
      {/* Accessibility-only header */}
      <h2 className="sr-only">Galerie Photos</h2>

      {/* Public gallery toolbar */}
      {isPublicView && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.35em] text-charcoal/40">Galerie</p>
          {albums.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-charcoal/50 hidden sm:inline">Filtrer par album</span>
              <select
                value={selectedAlbumId || ''}
                onChange={(e) => setSelectedAlbumId(e.target.value || null)}
                className="px-4 py-2 rounded-full border border-charcoal/10 bg-white text-sm text-charcoal/70 shadow-sm focus:outline-none focus:ring-2 focus:ring-burgundy-old/20"
              >
                <option value="">Tous les albums</option>
                {albums.map(album => (
                  <option key={album.id} value={album.id}>
                    {album.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Admin gallery toolbar */}
      {isAdminView && media.length > 0 && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectionMode}
              className={`px-4 py-2 rounded-full border text-sm font-medium flex items-center gap-2 transition-colors ${
                selectionMode
                  ? 'bg-burgundy-old text-white border-burgundy-old'
                  : 'bg-white text-charcoal/70 border-charcoal/10 hover:border-charcoal/30'
              }`}
            >
              <CheckSquare size={16} />
              Actions groupées
            </button>
            {selectionMode && (
              <span className="text-sm text-charcoal/50">
                {selectedItems.size} sélectionnée{selectedItems.size > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBulkDelete}
              disabled={!selectionMode || selectedItems.size === 0}
              className="px-4 py-2 rounded-full border border-charcoal/10 text-sm text-charcoal/70 hover:text-charcoal disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} className="inline-block mr-2" />
              Supprimer
            </button>
            <button
              disabled
              className="px-4 py-2 rounded-full border border-charcoal/10 text-sm text-charcoal/50 cursor-not-allowed"
              title="Bientôt disponible"
            >
              <FolderPlus size={16} className="inline-block mr-2" />
              Ajouter à un album
            </button>

            {settings.allowUploads ? (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 rounded-full bg-burgundy-old text-white text-sm font-medium hover:bg-[#c92a38] transition-colors"
              >
                <Upload size={16} className="inline-block mr-2" />
                Ajouter des photos
              </button>
            ) : (
              <div className="flex items-center gap-2 text-charcoal/50 bg-cream px-4 py-2 rounded-full text-sm">
                <Lock size={14} />
                <span>Uploads fermés</span>
              </div>
            )}
          </div>
        </div>
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
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 bg-linear-to-br from-burgundy-old/5 to-burgundy-old/10 rounded-full"></div>
            <div className="absolute inset-4 bg-white rounded-full shadow-inner flex items-center justify-center">
              <ImageIcon className="text-burgundy-old/40" size={36} />
            </div>
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
              className="inline-flex items-center gap-3 px-8 py-4 bg-burgundy-old text-white rounded-full hover:bg-[#c92a38] transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Upload size={20} />
              <span className="font-medium tracking-wide">Contribuer à la galerie</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-cream text-charcoal/60 rounded-full">
              <Lock size={16} />
              <span className="font-light">Les uploads seront bientôt disponibles</span>
            </div>
          )}
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
        <div className={gridClassName}>
          {filteredMedia.map((item, index) => (
            <div
              key={item.id}
              className={`gallery-item ${isPublicView ? 'mb-6 break-inside-avoid' : ''}`}
              // Only animate first 12 items (visible on initial load) to reduce object creation
              style={index < 12 ? { animationDelay: `${index * 0.05}s` } : undefined}
            >
              <MediaCard
                item={item}
                isAdmin={isAdmin}
                onDelete={handleDelete}
                onClick={handleMediaClick}
                selectionMode={selectionMode}
                isSelected={selectedItems.has(item.id)}
                onToggleSelection={toggleItemSelection}
                isFavorited={userFavorites.has(item.id)}
                onToggleFavorite={handleToggleFavorite}
                dataService={dataService}
                variant={variant}
              />
            </div>
          ))}
        </div>
      )}

      {/* Public CTA */}
      {isPublicView && media.length > 0 && settings.allowUploads && (
        <div className="pt-6 flex justify-center">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-8 py-3 rounded-full bg-burgundy-old text-white text-sm font-medium tracking-wide hover:bg-[#c92a38] transition-colors shadow-md"
          >
            Contribuer à la galerie
          </button>
        </div>
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
    </div>
  );
}
