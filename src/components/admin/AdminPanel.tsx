import { useState, useEffect, useRef } from 'react';
import {
  Settings,
  ImageIcon,
  MessageSquare,
  DownloadCloud,
  Heart,
  QrCode,
  Palette,
  FolderOpen,
  Loader2,
  Edit3,
  CreditCard,
  UserCheck,
  LayoutDashboard,
  BookOpen,
  User,
  Printer,
  Link2
} from 'lucide-react';
import { SettingsToggle } from './SettingsToggle';
import { QRCodeGenerator } from './QRCodeGenerator';
import { AlbumManager } from './AlbumManager';
import { ThemeSelector } from './ThemeSelector';
import { SubscriptionStatus } from './SubscriptionStatus';
import { RSVPManager } from './rsvp';
import { GalleryGrid } from '../gallery/GalleryGrid';
import { AdminSection, AdminCard, AdminButton } from './ui';
import { requireAuth, isAdmin as checkIsAdmin } from '../../lib/auth';
import { DataService, type Album, type GallerySettings, type WeddingStatistics } from '../../lib/services/dataService';
import { mockAPI, downloadBlob } from '../../lib/api';
import { calculateEnhancedStatistics } from '../../lib/statistics';
import type { ThemeId } from '../../lib/themes';

type AdminView = 'dashboard' | 'rsvp' | 'gallery' | 'settings' | 'account';
type GalleryTab = 'all' | 'albums' | 'settings';

interface AdminPanelProps {
  weddingId?: string;
  weddingSlug?: string;
  profileId?: string;
  demoMode?: boolean;
  initialView?: AdminView;
}

export function AdminPanel({
  weddingId,
  weddingSlug,
  profileId,
  demoMode = false,
  initialView
}: AdminPanelProps) {
  // Create service once using ref
  const serviceRef = useRef<DataService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = new DataService({ demoMode, weddingId });
  }
  const dataService = serviceRef.current;

  const [currentView, setCurrentView] = useState<AdminView>(initialView ?? 'dashboard');
  const [galleryTab, setGalleryTab] = useState<GalleryTab>('all');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [stats, setStats] = useState<WeddingStatistics>({
    mediaCount: 0,
    photoCount: 0,
    videoCount: 0,
    messageCount: 0,
    favoriteCount: 0,
    albumCount: 0,
  });
  const [dashboardAlbums, setDashboardAlbums] = useState<Album[]>([]);
  const [enhancedStats, setEnhancedStats] = useState<ReturnType<typeof calculateEnhancedStatistics> | null>(null);
  const [settings, setSettingsState] = useState<GallerySettings>(dataService.getSettings());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('classic');

  useEffect(() => {
    // Check authentication and admin status (skip in demo mode)
    if (!demoMode) {
      requireAuth();
      if (!checkIsAdmin()) {
        window.location.href = '/gallery';
      }
    }

    // Initialize demo storage if needed
    if (demoMode) {
      dataService.initializeDemoStorage();
    }

    // Load statistics
    const loadStats = async () => {
      try {
        const [weddingStats, albums] = await Promise.all([
          dataService.getStatistics(),
          dataService.getAlbums(),
        ]);
        setStats(weddingStats);
        setDashboardAlbums(albums);

        // For enhanced statistics, we need the raw data
        // In demo mode, fetch media and messages for the enhanced stats calculation
        if (demoMode) {
          const media = await dataService.getMedia();
          const messages = await dataService.getMessages();
          // Convert to the format expected by calculateEnhancedStatistics
          const mediaForStats = media.map(m => ({
            id: m.id,
            url: m.url,
            type: m.type,
            author: m.author || 'Anonyme',
            createdAt: m.createdAt,
            reactions: m.reactions ? Object.entries(m.reactions).map(([type, count]) => ({
              type: type as any,
              count: count as number
            })) : [],
          }));
          const messagesForStats = messages.map(m => ({
            id: m.id,
            author: m.author,
            text: m.text,
            createdAt: m.createdAt,
          }));
          setEnhancedStats(calculateEnhancedStatistics(mediaForStats as any, messagesForStats as any));
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to load statistics:', error);
        setLoading(false);
      }
    };

    loadStats();
  }, [demoMode, dataService]);

  const [settingsLoading, setSettingsLoading] = useState(false);

  const toggleUploads = async (enabled: boolean) => {
    setSettingsLoading(true);
    try {
      await mockAPI.toggleUploads(enabled);
      // Update local settings state
      setSettingsState(prev => ({ ...prev, allowUploads: enabled }));
    } catch (error) {
      console.error('Settings update failed:', error);
      alert('Erreur lors de la mise à jour des paramètres');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleBackup = async () => {
    setExporting(true);
    try {
      const blob = await mockAPI.exportBackup();
      const filename = `reflets-de-bonheur-backup-${new Date().toISOString().split('T')[0]}.zip`;
      downloadBlob(blob, filename);
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Erreur lors de la création de la sauvegarde');
    } finally {
      setExporting(false);
    }
  };

  const profileLabel = settings.coupleName || weddingSlug || 'Profil';
  const initials = profileLabel
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const storageLimit = 5;
  const storageUsed = Math.max(
    0.1,
    enhancedStats?.estimatedStorageGB ?? stats.mediaCount * 0.01
  );
  const storagePercent = Math.min(100, (storageUsed / storageLimit) * 100);

  const shareUrl = weddingSlug ? `/${weddingSlug}/photos` : '/demo_gallery';

  const navItems: Array<{
    id: AdminView;
    label: string;
    icon: typeof LayoutDashboard;
    type: 'view';
  } | {
    id: 'website' | 'guestbook';
    label: string;
    icon: typeof LayoutDashboard;
    type: 'link';
    href: string;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, type: 'view' },
    { id: 'rsvp', label: 'RSVPs', icon: UserCheck, type: 'view' },
    {
      id: 'website',
      label: 'Website Editor',
      icon: Edit3,
      type: 'link',
      href: weddingSlug ? `/${weddingSlug}/admin/website-editor` : '/admin/website-editor'
    },
    { id: 'gallery', label: 'Photo Gallery', icon: ImageIcon, type: 'view' },
    {
      id: 'guestbook',
      label: "Guestbook",
      icon: BookOpen,
      type: 'link',
      href: weddingSlug ? `/${weddingSlug}/livre-or` : '/guestbook'
    },
    { id: 'settings', label: 'Settings', icon: Settings, type: 'view' },
    { id: 'account', label: 'Account', icon: User, type: 'view' },
  ];

  const handleCopyGalleryUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('URL copiée dans le presse-papiers.');
    } catch (error) {
      console.error('Copy failed', error);
      alert('Impossible de copier l’URL.');
    }
  };

  const handleOpenAlbums = () => {
    setCurrentView('gallery');
    setGalleryTab('albums');
  };

  const renderDashboardContent = () => (
    <div className="space-y-10">
      <header>
        <h1 className="font-serif text-3xl sm:text-4xl text-charcoal">Welcome back</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          <section>
            <h2 className="font-serif text-xl text-charcoal mb-4">Vue d'ensemble</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Photos', value: stats.photoCount, icon: ImageIcon },
                { label: 'Messages', value: stats.messageCount, icon: MessageSquare },
                { label: 'Favoris', value: stats.favoriteCount, icon: Heart },
                { label: 'Albums', value: stats.albumCount, icon: FolderOpen },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-white rounded-xl border border-charcoal/5 shadow-xs p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 rounded-full bg-[#b08b8b] text-white flex items-center justify-center mb-2">
                    <item.icon size={18} />
                  </div>
                  <span className="text-2xl font-semibold text-charcoal">{item.value}</span>
                  <span className="text-[10px] font-semibold tracking-widest text-charcoal/40 uppercase mt-1">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-xl text-charcoal mb-4">Actions rapides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setCurrentView('rsvp')}
                className="group bg-white rounded-xl border border-charcoal/5 shadow-xs p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow"
              >
                <div className="mb-4 w-40 h-24 rounded-2xl bg-gradient-to-br from-[#efe7ea] to-[#f7f1f4] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute -left-6 -top-6 w-20 h-20 rounded-full bg-[#d4b7b7]/50"></div>
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-[#c9a8a8]/40"></div>
                  <UserCheck className="w-10 h-10 text-[#b08b8b]" />
                </div>
                <h3 className="font-semibold text-charcoal mb-2 font-serif">Gestion RSVP</h3>
                <p className="text-xs text-charcoal/50 leading-relaxed max-w-[220px]">
                  Configurez les questions et suivez les réponses en un clin d'œil.
                </p>
              </button>

              <a
                href={weddingSlug ? `/${weddingSlug}/admin/website-editor` : '/admin/website-editor'}
                className="group bg-white rounded-xl border border-charcoal/5 shadow-xs p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow"
              >
                <div className="mb-4 w-40 h-24 rounded-2xl bg-gradient-to-br from-[#f2e9ec] to-[#f8f4f6] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute left-4 top-4 w-8 h-8 rounded-full bg-[#d9bebe]/60"></div>
                  <div className="absolute right-6 bottom-4 w-14 h-14 rounded-full bg-[#c7a1a1]/40"></div>
                  <Edit3 className="w-10 h-10 text-[#b08b8b]" />
                </div>
                <h3 className="font-semibold text-charcoal mb-2 font-serif">Éditeur de site</h3>
                <p className="text-xs text-charcoal/50 leading-relaxed max-w-[220px]">
                  Personnalisez votre site et les sections clés du mariage.
                </p>
              </a>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-xl text-charcoal mb-4">Albums</h2>
            <div className="bg-white rounded-xl border border-charcoal/5 shadow-xs p-6">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="relative w-full sm:w-auto">
                  <label className="block text-xs font-semibold text-charcoal mb-1 ml-1">Recherche</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-charcoal/40">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <input
                      className="pl-9 pr-4 py-2 border border-charcoal/10 rounded-lg text-sm text-charcoal w-full sm:w-64 focus:ring-[#b08b8b] focus:border-[#b08b8b] placeholder-charcoal/30"
                      placeholder="Rechercher"
                      type="text"
                    />
                  </div>
                </div>
                <button
                  onClick={handleOpenAlbums}
                  className="bg-[#b08b8b] hover:bg-[#967272] text-white text-xs font-medium px-6 py-2.5 rounded-lg transition-colors"
                >
                  Nouvel Album
                </button>
              </div>

              <div className="space-y-4">
                {dashboardAlbums.length === 0 ? (
                  <div className="text-sm text-charcoal/50 text-center py-6">
                    Aucun album pour le moment.
                  </div>
                ) : (
                  dashboardAlbums.slice(0, 4).map((album, index) => (
                    <div key={album.id}>
                      <div className="flex items-center justify-between p-2 hover:bg-charcoal/[0.03] rounded-lg transition-colors">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-lg"
                            style={{ backgroundColor: album.color || '#e6d5d5' }}
                          />
                          <div>
                            <h4 className="text-sm font-semibold text-charcoal">{album.name}</h4>
                            <p className="text-xs text-charcoal/50">{album.photoCount || 0} photos</p>
                          </div>
                        </div>
                        <button className="text-charcoal/40 hover:text-charcoal p-2 rounded-full hover:bg-charcoal/5">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                          </svg>
                        </button>
                      </div>
                      {index < Math.min(dashboardAlbums.length, 4) - 1 && (
                        <div className="border-t border-charcoal/5" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-white rounded-xl border border-charcoal/10 shadow-sm p-6 flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-2">
              <h3 className="font-serif text-lg text-charcoal">QR Code Galerie</h3>
              <QrCode className="w-5 h-5 text-charcoal/40" />
            </div>
            <span className="text-[10px] text-charcoal/40 mb-6 truncate w-full text-center">
              {shareUrl}
            </span>
            <img
              alt="QR Code"
              className="w-40 h-40 mb-6 object-contain rounded-xl bg-white border border-charcoal/5"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`}
            />
            <div className="w-full mb-4">
              <label className="block text-xs font-semibold text-charcoal mb-1">Sentiaeprint :</label>
              <div className="relative">
                <select className="block w-full text-xs text-charcoal border-charcoal/20 rounded-md focus:border-[#b08b8b] focus:ring-[#b08b8b] py-2 pl-3 pr-8 bg-white shadow-sm appearance-none">
                  <option>Automatique</option>
                  <option>Manuel</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-charcoal/60">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="w-full space-y-3">
              <button
                className="w-full bg-[#b08b8b] hover:bg-[#967272] text-white text-xs font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <DownloadCloud className="w-4 h-4" /> Télécharger
              </button>
              <button
                className="w-full border border-charcoal/10 text-charcoal/70 hover:bg-charcoal/5 text-xs font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors bg-transparent"
              >
                <Printer className="w-4 h-4" /> Imprimer
              </button>
              <button
                onClick={handleCopyGalleryUrl}
                className="w-full border border-charcoal/10 text-charcoal/70 hover:bg-charcoal/5 text-xs font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors bg-transparent"
              >
                <Link2 className="w-4 h-4" /> Copier URL
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettingsContent = () => (
    <div className="space-y-8">
      <AdminSection
        title="Paramètres"
        description="Configuration de votre espace"
        icon={Settings}
      >
        <AdminCard padding="none">
          <div className="flex items-center justify-between p-6 border-b border-charcoal/5">
            <div>
              <h3 className="font-medium text-charcoal">
                Autoriser les uploads
              </h3>
              <p className="text-sm text-charcoal/50 font-light mt-1">
                {settings.allowUploads
                  ? 'Les invités peuvent ajouter des photos'
                  : 'Les uploads sont actuellement désactivés'}
              </p>
            </div>
            <SettingsToggle
              enabled={settings.allowUploads}
              onChange={toggleUploads}
              loading={settingsLoading}
            />
          </div>
          <div className="p-6">
            <AdminButton
              variant="secondary"
              fullWidth
              leftIcon={<DownloadCloud size={18} />}
              loading={exporting}
              onClick={handleBackup}
            >
              {exporting ? 'Création en cours...' : 'Télécharger la sauvegarde'}
            </AdminButton>
            <p className="text-xs text-charcoal/40 text-center mt-3 font-light">
              Archive ZIP contenant toutes les photos et messages
            </p>
          </div>
        </AdminCard>
      </AdminSection>

      <AdminSection
        title="Thème"
        description="Personnalisez l'apparence"
        icon={Palette}
      >
        <AdminCard>
          <ThemeSelector
            currentTheme={currentTheme}
            onThemeChange={setCurrentTheme}
            weddingSlug="julie-thomas"
          />
        </AdminCard>
      </AdminSection>

      <AdminSection
        title="Albums"
        description="Organisez vos photos"
        icon={FolderOpen}
      >
        <AdminCard>
          <AlbumManager dataService={dataService} />
        </AdminCard>
      </AdminSection>

      <AdminSection
        title="Abonnement"
        description="Gérez votre forfait"
        icon={CreditCard}
      >
        <AdminCard>
          <SubscriptionStatus
            profileId={profileId || ''}
            demoMode={demoMode}
          />
        </AdminCard>
      </AdminSection>
    </div>
  );

  const renderGalleryContent = () => (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-charcoal/40">Photo Gallery</p>
        <h1 className="font-serif text-2xl text-charcoal mt-2">Galerie photos</h1>
      </div>

      <div className="flex flex-wrap items-center gap-6 border-b border-charcoal/10 pb-3 text-sm">
        <button
          onClick={() => setGalleryTab('all')}
          className={`pb-2 transition-colors ${
            galleryTab === 'all' ? 'text-charcoal border-b border-charcoal' : 'text-charcoal/50 hover:text-charcoal'
          }`}
        >
          Toutes les photos
        </button>
        <button
          onClick={() => setGalleryTab('albums')}
          className={`pb-2 transition-colors ${
            galleryTab === 'albums' ? 'text-charcoal border-b border-charcoal' : 'text-charcoal/50 hover:text-charcoal'
          }`}
        >
          Albums
        </button>
        <button
          onClick={() => setGalleryTab('settings')}
          className={`pb-2 transition-colors ${
            galleryTab === 'settings' ? 'text-charcoal border-b border-charcoal' : 'text-charcoal/50 hover:text-charcoal'
          }`}
        >
          Paramètres
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-6">
          {galleryTab === 'all' && (
            <GalleryGrid weddingId={weddingId} demoMode={demoMode} variant="admin" />
          )}
          {galleryTab === 'albums' && (
            <AdminCard>
              <AlbumManager dataService={dataService} />
            </AdminCard>
          )}
          {galleryTab === 'settings' && (
            <div className="space-y-6">
              <AdminCard padding="none">
                <div className="flex items-center justify-between p-6 border-b border-charcoal/5">
                  <div>
                    <h3 className="font-medium text-charcoal">
                      Autoriser les uploads
                    </h3>
                    <p className="text-sm text-charcoal/50 font-light mt-1">
                      {settings.allowUploads
                        ? 'Les invités peuvent ajouter des photos'
                        : 'Les uploads sont actuellement désactivés'}
                    </p>
                  </div>
                  <SettingsToggle
                    enabled={settings.allowUploads}
                    onChange={toggleUploads}
                    loading={settingsLoading}
                  />
                </div>
                <div className="p-6">
                  <AdminButton
                    variant="secondary"
                    fullWidth
                    leftIcon={<DownloadCloud size={18} />}
                    loading={exporting}
                    onClick={handleBackup}
                  >
                    {exporting ? 'Création en cours...' : 'Télécharger la sauvegarde'}
                  </AdminButton>
                  <p className="text-xs text-charcoal/40 text-center mt-3 font-light">
                    Archive ZIP contenant toutes les photos et messages
                  </p>
                </div>
              </AdminCard>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl bg-white border border-charcoal/10 shadow-sm p-5">
            <h3 className="text-sm font-medium text-charcoal/70 mb-4">Statistiques galerie</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-charcoal/40">Stockage utilisé</p>
                <p className="text-lg font-semibold text-charcoal mt-1">
                  {storageUsed.toFixed(1)} GB / {storageLimit} GB
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-charcoal/10 overflow-hidden">
                  <div className="h-full bg-burgundy-old" style={{ width: `${storagePercent}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-charcoal/60">
                <span>Photos</span>
                <span className="text-charcoal">{stats.photoCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-charcoal/60">
                <span>Albums</span>
                <span className="text-charcoal">{stats.albumCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-charcoal/60">
                <span>Favoris</span>
                <span className="text-charcoal">{stats.favoriteCount}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-charcoal/10 shadow-sm p-5">
            <h3 className="text-sm font-medium text-charcoal/70 mb-4">Partager la galerie</h3>
            <div className="rounded-xl bg-cream/70 px-3 py-2 text-xs text-charcoal/60 break-all">
              {shareUrl}
            </div>
            <div className="mt-4 flex justify-center">
              <QRCodeGenerator />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );

  const renderAccountContent = () => (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-charcoal/40">Compte</p>
        <h1 className="font-serif text-2xl text-charcoal mt-2">Profil & accès</h1>
      </div>
      <AdminCard>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-burgundy-old/10 text-burgundy-old flex items-center justify-center font-semibold">
            {initials}
          </div>
          <div>
            <p className="text-lg font-medium text-charcoal">{profileLabel}</p>
            <p className="text-sm text-charcoal/50">Administrateur</p>
          </div>
        </div>
        <div className="mt-6 text-sm text-charcoal/60">
          Gérez les accès, les codes invités et les préférences de sécurité depuis cet espace.
        </div>
      </AdminCard>
    </div>
  );

  let mainContent = renderDashboardContent();

  if (loading) {
    mainContent = (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 animate-spin">
          <Loader2 className="w-full h-full text-burgundy-old" />
        </div>
        <span className="ml-3 text-charcoal/60 font-light">Chargement...</span>
      </div>
    );
  } else if (currentView === 'rsvp') {
    mainContent = (
      <RSVPManager weddingId={weddingId || 'demo'} weddingSlug={weddingSlug} demoMode={demoMode} />
    );
  } else if (currentView === 'gallery') {
    mainContent = renderGalleryContent();
  } else if (currentView === 'settings') {
    mainContent = renderSettingsContent();
  } else if (currentView === 'account') {
    mainContent = renderAccountContent();
  }

  return (
    <div className="min-h-screen h-screen bg-[#f3f0f4] flex relative overflow-hidden">
      <div className="w-full h-full bg-white overflow-hidden flex flex-col md:flex-row">
        <aside className="hidden md:flex w-64 bg-[#eeebf0] flex-col justify-between border-r border-charcoal/5">
          <div>
            <div className="p-8 pb-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-[#b08b8b] flex items-center justify-center text-[#b08b8b]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-serif text-xl font-semibold text-charcoal">Logo</span>
            </div>

            <nav className="px-4 mt-6 space-y-2">
              {navItems.map((item) => {
                const isActive = item.type === 'view' && item.id === currentView;
                const itemClasses = `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#b08b8b] text-white shadow-md'
                    : 'text-charcoal/50 hover:bg-charcoal/10 hover:text-charcoal'
                }`;
                if (item.type === 'link') {
                  return (
                    <a key={item.id} href={item.href} className={itemClasses}>
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </a>
                  );
                }
                return (
                  <button key={item.id} onClick={() => setCurrentView(item.id)} className={itemClasses}>
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6 border-t border-charcoal/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-charcoal/10 flex items-center justify-center text-xs text-charcoal/50">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-charcoal truncate">Profile</p>
              <p className="text-xs text-charcoal/50 truncate">{profileLabel}</p>
            </div>
            <svg className="w-4 h-4 text-charcoal/40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </aside>

        <main className="flex-1 bg-white h-full overflow-y-auto overflow-x-hidden px-6 py-8 lg:px-12 lg:py-10">
          <div className="md:hidden flex items-center justify-between mb-6">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="w-10 h-10 rounded-full bg-white border border-charcoal/10 flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-charcoal/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-serif text-lg text-charcoal">Administration</span>
            <div className="w-10 h-10 rounded-full bg-white border border-charcoal/10 flex items-center justify-center text-xs text-charcoal/50">
              {initials}
            </div>
          </div>

          {mainContent}
        </main>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/30" onClick={() => setMobileNavOpen(false)}>
          <div className="h-full w-72 bg-white shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <span className="font-serif text-lg text-charcoal">Navigation</span>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="w-8 h-8 rounded-full border border-charcoal/10 flex items-center justify-center text-charcoal/60"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {navItems.map((item) => {
                const isActive = item.type === 'view' && item.id === currentView;
                const itemClasses = `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive
                    ? 'bg-[#b08b8b] text-white'
                    : 'text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5'
                }`;
                if (item.type === 'link') {
                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      className={itemClasses}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </a>
                  );
                }
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={itemClasses}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
