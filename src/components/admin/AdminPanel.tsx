import { useState, useEffect, useRef } from 'react';
import { Settings, ImageIcon, MessageSquare, DownloadCloud, Heart, QrCode, Palette, FolderOpen, BarChart3, Loader2, Edit3, CreditCard, UserCheck, ChevronRight, Users, Calendar } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { SettingsToggle } from './SettingsToggle';
import { QRCodeGenerator } from './QRCodeGenerator';
import { EnhancedStatistics } from './EnhancedStatistics';
import { AlbumManager } from './AlbumManager';
import { ThemeSelector } from './ThemeSelector';
import { SubscriptionStatus } from './SubscriptionStatus';
import { RSVPManager } from './rsvp';
import { AdminSection, AdminDivider, AdminCard, AdminButton, cn } from './ui';
import { requireAuth, isAdmin as checkIsAdmin } from '../../lib/auth';
import { DataService, type GallerySettings, type WeddingStatistics } from '../../lib/services/dataService';
import { mockAPI, downloadBlob } from '../../lib/api';
import { calculateEnhancedStatistics } from '../../lib/statistics';
import type { ThemeId } from '../../lib/themes';

type AdminView = 'dashboard' | 'rsvp';

interface AdminPanelProps {
  weddingId?: string;
  weddingSlug?: string;
  profileId?: string;
  demoMode?: boolean;
}

export function AdminPanel({ weddingId, weddingSlug, profileId, demoMode = false }: AdminPanelProps) {
  // Create service once using ref
  const serviceRef = useRef<DataService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = new DataService({ demoMode, weddingId });
  }
  const dataService = serviceRef.current;

  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [stats, setStats] = useState<WeddingStatistics>({
    mediaCount: 0,
    photoCount: 0,
    videoCount: 0,
    messageCount: 0,
    favoriteCount: 0,
    albumCount: 0,
  });
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
        const weddingStats = await dataService.getStatistics();
        setStats(weddingStats);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 animate-spin">
          <Loader2 className="w-full h-full text-burgundy-old" />
        </div>
        <span className="ml-3 text-charcoal/60 font-light">Chargement...</span>
      </div>
    );
  }

  // RSVP View
  if (currentView === 'rsvp') {
    return (
      <div className="space-y-6">
        {/* Back navigation */}
        <button
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center gap-2 text-sm text-charcoal/60 hover:text-burgundy-old transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Retour au tableau de bord
        </button>

        {/* RSVP Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-burgundy-old/10 flex items-center justify-center">
            <UserCheck className="w-6 h-6 text-burgundy-old" />
          </div>
          <div>
            <h1 className="font-serif text-2xl text-charcoal font-light">Gestion RSVP</h1>
            <p className="text-charcoal/50 text-sm font-light">
              Configurez le formulaire et consultez les réponses
            </p>
          </div>
        </div>

        <AdminDivider />

        {/* RSVP Manager */}
        <RSVPManager weddingId={weddingId || 'demo'} demoMode={demoMode} />
      </div>
    );
  }

  // Main Dashboard View
  return (
    <div className="space-y-8">
      {/* Statistics Overview */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-burgundy-old/10 flex items-center justify-center">
            <BarChart3 className="text-burgundy-old" size={20} />
          </div>
          <div>
            <h2 className="font-serif text-xl text-charcoal font-light">Vue d'ensemble</h2>
            <p className="text-charcoal/50 text-sm font-light">Statistiques de votre espace</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <AdminCard padding="md" className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-burgundy-old/10 flex items-center justify-center">
              <ImageIcon className="text-burgundy-old" size={22} />
            </div>
            <p className="font-serif text-3xl text-charcoal font-light">{stats.mediaCount}</p>
            <p className="text-xs text-charcoal/50 uppercase tracking-wide mt-1">Photos</p>
          </AdminCard>

          <AdminCard padding="md" className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-burgundy-old/10 flex items-center justify-center">
              <MessageSquare className="text-burgundy-old" size={22} />
            </div>
            <p className="font-serif text-3xl text-charcoal font-light">{stats.messageCount}</p>
            <p className="text-xs text-charcoal/50 uppercase tracking-wide mt-1">Messages</p>
          </AdminCard>

          <AdminCard padding="md" className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-burgundy-old/10 flex items-center justify-center">
              <Heart className="text-burgundy-old" size={22} />
            </div>
            <p className="font-serif text-3xl text-charcoal font-light">{stats.favoriteCount}</p>
            <p className="text-xs text-charcoal/50 uppercase tracking-wide mt-1">Favoris</p>
          </AdminCard>

          <AdminCard padding="md" className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-burgundy-old/10 flex items-center justify-center">
              <FolderOpen className="text-burgundy-old" size={22} />
            </div>
            <p className="font-serif text-3xl text-charcoal font-light">{stats.albumCount}</p>
            <p className="text-xs text-charcoal/50 uppercase tracking-wide mt-1">Albums</p>
          </AdminCard>
        </div>
      </section>

      {/* Quick Actions Grid */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-burgundy-old/10 flex items-center justify-center">
            <Settings className="text-burgundy-old" size={20} />
          </div>
          <div>
            <h2 className="font-serif text-xl text-charcoal font-light">Actions rapides</h2>
            <p className="text-charcoal/50 text-sm font-light">Gérez les fonctionnalités principales</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* RSVP Management Card */}
          <AdminCard
            padding="none"
            hover
            onClick={() => setCurrentView('rsvp')}
            className="group overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-burgundy-old/20 to-burgundy-old/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserCheck className="w-6 h-6 text-burgundy-old" />
                </div>
                <ChevronRight className="w-5 h-5 text-charcoal/30 group-hover:text-burgundy-old group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-semibold text-charcoal mb-1">Gestion RSVP</h3>
              <p className="text-sm text-charcoal/50">
                Configurez les questions et consultez les réponses
              </p>
            </div>
            <div className="px-6 py-3 bg-charcoal/[0.02] border-t border-charcoal/5 flex items-center gap-4 text-xs text-charcoal/50">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                Réponses
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Deadline
              </span>
            </div>
          </AdminCard>

          {/* Website Editor Card */}
          <AdminCard
            padding="none"
            hover
            className="group overflow-hidden"
          >
            <a href={weddingSlug ? `/${weddingSlug}/admin/website-editor` : '/admin/website-editor'} className="block">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-burgundy-old/20 to-burgundy-old/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Edit3 className="w-6 h-6 text-burgundy-old" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-charcoal/30 group-hover:text-burgundy-old group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-semibold text-charcoal mb-1">Éditeur de site</h3>
                <p className="text-sm text-charcoal/50">
                  Personnalisez couleurs, textes et images
                </p>
              </div>
              <div className="px-6 py-3 bg-charcoal/[0.02] border-t border-charcoal/5 flex items-center gap-4 text-xs text-charcoal/50">
                <span className="flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  6 thèmes
                </span>
              </div>
            </a>
          </AdminCard>

          {/* QR Code Card */}
          <AdminCard padding="none" className="overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-burgundy-old/20 to-burgundy-old/10 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-burgundy-old" />
                </div>
              </div>
              <h3 className="font-semibold text-charcoal mb-1">QR Code</h3>
              <p className="text-sm text-charcoal/50">
                Partagez facilement votre espace
              </p>
            </div>
            <div className="px-6 py-4 bg-charcoal/[0.02] border-t border-charcoal/5">
              <QRCodeGenerator />
            </div>
          </AdminCard>
        </div>
      </section>

      {/* Subscription Section */}
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

      <AdminDivider />

      {/* Settings Section */}
      <AdminSection
        title="Paramètres"
        description="Configuration de votre espace"
        icon={Settings}
      >
        <AdminCard padding="none">
          {/* Upload Toggle */}
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

          {/* Backup Button */}
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

      {/* Theme Section */}
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

      {/* Albums Section */}
      <AdminSection
        title="Albums"
        description="Organisez vos photos"
        icon={FolderOpen}
      >
        <AdminCard>
          <AlbumManager dataService={dataService} />
        </AdminCard>
      </AdminSection>

      {/* Enhanced Statistics */}
      <AdminSection
        title="Statistiques détaillées"
        description="Analyse approfondie de l'activité"
        icon={BarChart3}
      >
        <AdminCard>
          {enhancedStats ? (
            <EnhancedStatistics stats={enhancedStats} />
          ) : (
            <div className="text-center py-8 text-charcoal/50 font-light">
              Statistiques détaillées non disponibles
            </div>
          )}
        </AdminCard>
      </AdminSection>

      {/* Storage Info */}
      <AdminCard className="bg-gradient-to-br from-cream to-cream-dark text-center">
        <p className="text-sm font-medium text-charcoal/70">Stockage</p>
        <p className="text-xs text-charcoal/50 mt-1 font-light">
          Géré par Cloudflare R2 en production
        </p>
        {demoMode && (
          <p className="text-xs text-charcoal/40 mt-1 font-light italic">
            Mode démo : stockage local
          </p>
        )}
      </AdminCard>
    </div>
  );
}
