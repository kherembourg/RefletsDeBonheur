import { useState, useEffect, useMemo, useRef, lazy, Suspense, useCallback } from 'react';
import { Upload, Lock, ImageIcon, Loader2, CheckSquare, Trash2, FolderPlus, KeyRound, X } from 'lucide-react';
import { MediaCard } from './MediaCard';
import { UploadModal } from './UploadModal';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { AdminModal } from '../admin/ui/AdminModal';
import { useToast } from '../ui/Toast';

// Lazy load heavy components that are conditionally rendered
const Lightbox = lazy(() => import('./Lightbox').then(m => ({ default: m.Lightbox })));
import { isAdmin as checkIsAdmin, isAuthenticated } from '../../lib/auth';
import { guestLogin } from '../../lib/auth/clientAuth';
import { extractAndSavePinFromUrl, getSavedPin } from '../../lib/auth/pinFromUrl';
import { DataService, type MediaItem, type Album } from '../../lib/services/dataService';
import { t } from '../../i18n/utils';
import type { Language } from '../../i18n/translations';

interface GalleryGridProps {
  weddingId?: string;
  weddingSlug?: string;
  demoMode?: boolean; // Skip auth check for demo page
  variant?: 'public' | 'admin';
  lang?: Language;
}

export function GalleryGrid({ weddingId, weddingSlug, demoMode = false, variant = 'public', lang = 'fr' }: GalleryGridProps) {
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
    let cancelled = false;

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
        if (!cancelled) {
          setMedia(mediaData);
          setAlbums(albumsData);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[GalleryGrid] Error loading data:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
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
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showAddToAlbumModal, setShowAddToAlbumModal] = useState(false);
  const [targetAlbumId, setTargetAlbumId] = useState('');
  const { showToast, ToastContainer } = useToast();

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  useEffect(() => {
    // Extract PIN from URL on mount (for QR code users)
    if (weddingSlug) {
      extractAndSavePinFromUrl(weddingSlug);
    }

    const init = async () => {
      const favorites = await dataService.getFavorites();
      setIsAdmin(demoMode || checkIsAdmin());
      setUserFavorites(favorites);
    };
    init();
  }, [demoMode, dataService, weddingSlug]);

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

  const handleUploadClick = useCallback(async () => {
    // In demo mode, skip auth entirely
    if (demoMode) {
      setShowUploadModal(true);
      return;
    }

    // Already authenticated? Open upload modal directly
    if (isAuthenticated()) {
      setShowUploadModal(true);
      return;
    }

    // Try auto-login with saved PIN (from URL or previous visit)
    if (weddingSlug) {
      const savedPin = getSavedPin(weddingSlug);
      if (savedPin) {
        const result = await guestLogin(savedPin);
        if (result.success) {
          setShowUploadModal(true);
          return;
        }
      }
    }

    // No saved PIN or auto-login failed — show PIN modal
    setPinInput('');
    setPinError('');
    setShowPinModal(true);
  }, [demoMode, weddingSlug]);

  const handlePinSubmit = useCallback(async () => {
    if (!pinInput.trim()) return;

    setPinLoading(true);
    setPinError('');

    const result = await guestLogin(pinInput);

    if (result.success) {
      // Save PIN for future visits
      if (weddingSlug) {
        localStorage.setItem(`reflets_pin_${weddingSlug}`, pinInput.toUpperCase().trim());
      }
      setShowPinModal(false);
      setShowUploadModal(true);
    } else {
      setPinError(result.error || t(lang, 'gallery.pinInvalid'));
    }

    setPinLoading(false);
  }, [pinInput, weddingSlug, lang]);

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

  const refreshAlbums = useCallback(async () => {
    const data = await dataService.getAlbums();
    setAlbums(data);
  }, [dataService]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedItems.size === 0) return;
    await Promise.all([...selectedItems].map(id => dataService.deleteMedia(id)));
    await refresh();
    clearSelection();
  }, [selectedItems, dataService, refresh, clearSelection]);

  const handleAddSelectionToAlbum = useCallback(async () => {
    if (selectedItems.size === 0 || !targetAlbumId) return;

    const addedCount = await dataService.addMediaBatchToAlbum([...selectedItems], targetAlbumId);
    await Promise.all([refresh(), refreshAlbums()]);
    clearSelection();
    setTargetAlbumId('');
    setShowAddToAlbumModal(false);

    if (addedCount > 0) {
      showToast('success', `${addedCount} souvenir${addedCount > 1 ? 's ajoutés' : ' ajouté'} à l'album.`);
    } else {
      showToast('info', 'Les souvenirs sélectionnés sont déjà dans cet album.');
    }
  }, [selectedItems, targetAlbumId, dataService, refresh, refreshAlbums, clearSelection, showToast]);

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
    <ErrorBoundary>
    <div className="space-y-6">
      <ToastContainer />
      {/* Accessibility-only header */}
      <h2 className="sr-only">{t(lang, 'gallery.title')}</h2>

      {/* Public gallery toolbar */}
      {isPublicView && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.35em] text-charcoal/40">{t(lang, 'gallery.label')}</p>
          {albums.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-charcoal/50 hidden sm:inline">{t(lang, 'gallery.filterByAlbum')}</span>
              <select
                value={selectedAlbumId || ''}
                onChange={(e) => setSelectedAlbumId(e.target.value || null)}
                className="px-4 py-2 rounded-full border border-charcoal/10 bg-white text-sm text-charcoal/70 shadow-sm focus:outline-none focus:ring-2 focus:ring-burgundy-old/20"
              >
                <option value="">{t(lang, 'gallery.allAlbums')}</option>
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
              {t(lang, 'gallery.bulkActions')}
            </button>
            {selectionMode && (
              <span className="text-sm text-charcoal/50">
                {selectedItems.size} {selectedItems.size > 1 ? t(lang, 'gallery.selectedCountPlural') : t(lang, 'gallery.selectedCount')}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              disabled={!selectionMode || selectedItems.size === 0}
              className="px-4 py-2 rounded-full border border-charcoal/10 text-sm text-charcoal/70 hover:text-charcoal disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} className="inline-block mr-2" />
              {t(lang, 'common.delete')}
            </button>
            <button
              onClick={() => setShowAddToAlbumModal(true)}
              disabled={!selectionMode || selectedItems.size === 0 || albums.length === 0}
              className="px-4 py-2 rounded-full border border-charcoal/10 text-sm text-charcoal/70 hover:text-charcoal disabled:opacity-40 disabled:cursor-not-allowed"
              title={albums.length === 0 ? 'Créez un album dans l’admin pour classer ces souvenirs.' : undefined}
            >
              <FolderPlus size={16} className="inline-block mr-2" />
              {t(lang, 'gallery.addToAlbum')}
            </button>

            {settings.allowUploads ? (
              <button
                onClick={handleUploadClick}
                className="px-4 py-2 rounded-full bg-burgundy-old text-white text-sm font-medium hover:bg-[#c92a38] transition-colors"
              >
                <Upload size={16} className="inline-block mr-2" />
                {t(lang, 'gallery.upload')}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-charcoal/50 bg-cream px-4 py-2 rounded-full text-sm">
                <Lock size={14} />
                <span>{t(lang, 'gallery.uploadsClosed')}</span>
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
          <p className="text-charcoal/60 font-light">{t(lang, 'gallery.loadingPhotos')}</p>
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
            {t(lang, 'gallery.emptyTitle')}
          </h3>
          <p className="text-charcoal/50 font-light max-w-md mx-auto mb-8 leading-relaxed">
            {t(lang, 'gallery.emptyDescription')}
          </p>

          {settings.allowUploads ? (
            <button
              onClick={handleUploadClick}
              className="inline-flex items-center gap-3 px-8 py-4 bg-burgundy-old text-white rounded-full hover:bg-[#c92a38] transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Upload size={20} />
              <span className="font-medium tracking-wide">{t(lang, 'gallery.contribute')}</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-cream text-charcoal/60 rounded-full">
              <Lock size={16} />
              <span className="font-light">{t(lang, 'gallery.uploadsComingSoon')}</span>
            </div>
          )}
        </div>
      ) : filteredMedia.length === 0 ? (
        /* Empty State - No results from filtering */
        <div className="text-center py-24 border border-dashed border-charcoal/10">
          <div className="w-16 h-16 mx-auto mb-6 border border-charcoal/10 flex items-center justify-center">
            <ImageIcon className="text-charcoal/30" size={28} />
          </div>
          <p className="font-serif text-xl text-charcoal/60 mb-2">{t(lang, 'gallery.noResults')}</p>
          <p className="text-charcoal/40 font-light text-sm">{t(lang, 'gallery.noResultsHint')}</p>
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
                lang={lang}
              />
            </div>
          ))}
        </div>
      )}

      {/* Public CTA */}
      {isPublicView && media.length > 0 && settings.allowUploads && (
        <div className="pt-6 flex justify-center">
          <button
            onClick={handleUploadClick}
            className="px-8 py-3 rounded-full bg-burgundy-old text-white text-sm font-medium tracking-wide hover:bg-[#c92a38] transition-colors shadow-md"
          >
            {t(lang, 'gallery.contribute')}
          </button>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={handleUploadComplete}
        dataService={dataService}
        lang={lang}
      />

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-deep-charcoal/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setShowPinModal(false)}
              className="absolute top-4 right-4 text-charcoal/40 hover:text-charcoal"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-3 bg-burgundy-old/10 rounded-full flex items-center justify-center">
                <KeyRound className="text-burgundy-old" size={24} />
              </div>
              <h3 className="font-serif text-xl text-charcoal">{t(lang, 'gallery.pinTitle')}</h3>
              <p className="text-sm text-charcoal/50 mt-1">
                {t(lang, 'gallery.pinDescription')}
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handlePinSubmit(); }}>
              <input
                type="text"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                placeholder="CODE"
                autoFocus
                className="w-full px-4 py-3 text-center text-lg font-mono tracking-widest border border-charcoal/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-old/30 focus:border-burgundy-old"
              />
              {pinError && (
                <p className="text-red-500 text-sm text-center mt-2">{pinError}</p>
              )}
              <button
                type="submit"
                disabled={pinLoading || !pinInput.trim()}
                className="w-full mt-4 px-6 py-3 bg-burgundy-old text-white rounded-full font-medium hover:bg-[#c92a38] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {pinLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  t(lang, 'gallery.pinSubmit')
                )}
              </button>
            </form>
          </div>
        </div>
      )}

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
            lang={lang}
          />
        </Suspense>
      )}
      <AdminModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title="Supprimer la sélection ?"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setShowBulkDeleteModal(false)}
              className="px-4 py-2 text-sm font-medium text-charcoal/70 hover:text-charcoal"
            >
              Annuler
            </button>
            <button
              onClick={async () => {
                await handleBulkDelete();
                setShowBulkDeleteModal(false);
              }}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Supprimer
            </button>
          </>
        }
      >
        <p className="text-sm text-charcoal/70">
          {t(lang, 'gallery.deleteConfirm')} {selectedItems.size}{' '}
          {selectedItems.size > 1 ? t(lang, 'gallery.deleteConfirmCountPlural') : t(lang, 'gallery.deleteConfirmCount')} ?
        </p>
      </AdminModal>
      <AdminModal
        isOpen={showAddToAlbumModal}
        onClose={() => {
          setShowAddToAlbumModal(false);
          setTargetAlbumId('');
        }}
        title="Ajouter la sélection à un album"
        size="sm"
        footer={
          <>
            <button
              onClick={() => {
                setShowAddToAlbumModal(false);
                setTargetAlbumId('');
              }}
              className="px-4 py-2 text-sm font-medium text-charcoal/70 hover:text-charcoal"
            >
              Annuler
            </button>
            <button
              onClick={async () => {
                await handleAddSelectionToAlbum();
              }}
              disabled={!targetAlbumId}
              className="px-4 py-2 rounded-lg bg-burgundy-old text-white text-sm font-medium hover:bg-[#c92a38] transition-colors disabled:opacity-50"
            >
              Ajouter
            </button>
          </>
        }
      >
        {albums.length === 0 ? (
          <p className="text-sm text-charcoal/70">
            Aucun album disponible pour le moment.
          </p>
        ) : (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-charcoal">Album cible</span>
            <select
              value={targetAlbumId}
              onChange={(event) => setTargetAlbumId(event.target.value)}
              className="w-full rounded-lg border border-charcoal/10 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy-old/20"
            >
              <option value="">Choisir un album</option>
              {albums.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </AdminModal>
    </div>
    </ErrorBoundary>
  );
}
