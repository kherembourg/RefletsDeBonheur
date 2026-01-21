import { useState, useEffect, useRef } from 'react';
import { Settings, ImageIcon, MessageSquare, DownloadCloud, Heart, ToggleLeft, ToggleRight, QrCode, Palette, FolderOpen, BarChart3, Loader2, Edit3, CreditCard } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { SettingsToggle } from './SettingsToggle';
import { QRCodeGenerator } from './QRCodeGenerator';
import { EnhancedStatistics } from './EnhancedStatistics';
import { AlbumManager } from './AlbumManager';
import { ThemeSelector } from './ThemeSelector';
import { SubscriptionStatus } from './SubscriptionStatus';
import { requireAuth, isAdmin as checkIsAdmin } from '../../lib/auth';
import { DataService, type GallerySettings, type WeddingStatistics } from '../../lib/services/dataService';
import { mockAPI, downloadBlob } from '../../lib/api';
import { calculateEnhancedStatistics } from '../../lib/statistics';
import type { ThemeId } from '../../lib/themes';

interface AdminPanelProps {
  weddingId?: string;
  profileId?: string;
  demoMode?: boolean;
}

export function AdminPanel({ weddingId, profileId, demoMode = false }: AdminPanelProps) {
  // Create service once using ref
  const serviceRef = useRef<DataService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = new DataService({ demoMode, weddingId });
  }
  const dataService = serviceRef.current;

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
        <Loader2 className="w-8 h-8 text-burgundy-old animate-spin" />
        <span className="ml-3 text-charcoal/60 font-light">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Statistics Overview */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 border border-burgundy-old/20 flex items-center justify-center">
            <BarChart3 className="text-burgundy-old" size={20} />
          </div>
          <div>
            <h2 className="font-serif text-xl text-charcoal font-light">Vue d'ensemble</h2>
            <p className="text-charcoal/50 text-sm font-light">Statistiques de votre espace</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-6 shadow-xs border border-charcoal/5 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-linear-to-br from-burgundy-old/10 to-burgundy-old/5 flex items-center justify-center">
              <ImageIcon className="text-burgundy-old" size={22} />
            </div>
            <p className="font-serif text-3xl text-charcoal font-light">{stats.mediaCount}</p>
            <p className="text-xs text-charcoal/50 uppercase tracking-wide mt-1">Photos</p>
          </div>

          <div className="bg-white p-6 shadow-xs border border-charcoal/5 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-linear-to-br from-burgundy-old/10 to-burgundy-old/5 flex items-center justify-center">
              <MessageSquare className="text-burgundy-old" size={22} />
            </div>
            <p className="font-serif text-3xl text-charcoal font-light">{stats.messageCount}</p>
            <p className="text-xs text-charcoal/50 uppercase tracking-wide mt-1">Messages</p>
          </div>

          <div className="bg-white p-6 shadow-xs border border-charcoal/5 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-linear-to-br from-burgundy-old/10 to-burgundy-old/5 flex items-center justify-center">
              <Heart className="text-burgundy-old" size={22} />
            </div>
            <p className="font-serif text-3xl text-charcoal font-light">{stats.favoriteCount}</p>
            <p className="text-xs text-charcoal/50 uppercase tracking-wide mt-1">Favoris</p>
          </div>
        </div>
      </section>

      {/* Subscription Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 border border-burgundy-old/20 flex items-center justify-center">
            <CreditCard className="text-burgundy-old" size={20} />
          </div>
          <div>
            <h2 className="font-serif text-xl text-charcoal font-light">Abonnement</h2>
            <p className="text-charcoal/50 text-sm font-light">Gérez votre forfait</p>
          </div>
        </div>

        <div className="bg-white shadow-xs border border-charcoal/5 p-6">
          <SubscriptionStatus
            profileId={profileId || ''}
            demoMode={demoMode}
          />
        </div>
      </section>

      {/* Decorative Divider */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex-1 h-px bg-linear-to-r from-transparent via-burgundy-old/20 to-transparent"></div>
        <div className="text-burgundy-old/30 text-lg">❧</div>
        <div className="flex-1 h-px bg-linear-to-r from-transparent via-burgundy-old/20 to-transparent"></div>
      </div>

      {/* Settings Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 border border-burgundy-old/20 flex items-center justify-center">
            <Settings className="text-burgundy-old" size={20} />
          </div>
          <div>
            <h2 className="font-serif text-xl text-charcoal font-light">Paramètres</h2>
            <p className="text-charcoal/50 text-sm font-light">Configuration de votre espace</p>
          </div>
        </div>

        <div className="bg-white shadow-xs border border-charcoal/5">
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
            <button
              onClick={handleBackup}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-3 bg-charcoal hover:bg-charcoal/90 text-white font-medium py-3.5 transition-all duration-300 disabled:opacity-50 tracking-wide text-sm uppercase"
            >
              {exporting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Création en cours...</span>
                </>
              ) : (
                <>
                  <DownloadCloud size={18} />
                  <span>Télécharger la sauvegarde</span>
                </>
              )}
            </button>
            <p className="text-xs text-charcoal/40 text-center mt-3 font-light">
              Archive ZIP contenant toutes les photos et messages
            </p>
          </div>
        </div>
      </section>

      {/* QR Code Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 border border-burgundy-old/20 flex items-center justify-center">
            <QrCode className="text-burgundy-old" size={20} />
          </div>
          <div>
            <h2 className="font-serif text-xl text-charcoal font-light">QR Code</h2>
            <p className="text-charcoal/50 text-sm font-light">Partagez facilement votre espace</p>
          </div>
        </div>

        <div className="bg-white shadow-xs border border-charcoal/5 p-6">
          <QRCodeGenerator />
        </div>
      </section>

      {/* Theme Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 border border-burgundy-old/20 flex items-center justify-center">
            <Palette className="text-burgundy-old" size={20} />
          </div>
          <div>
            <h2 className="font-serif text-xl text-charcoal font-light">Thème</h2>
            <p className="text-charcoal/50 text-sm font-light">Personnalisez l'apparence</p>
          </div>
        </div>

        <div className="bg-white shadow-xs border border-charcoal/5 p-6 space-y-6">
          <ThemeSelector
            currentTheme={currentTheme}
            onThemeChange={setCurrentTheme}
            weddingSlug="julie-thomas"
          />

          {/* Advanced Website Editor */}
          <div className="pt-6 border-t border-charcoal/10">
            <div className="bg-linear-to-br from-burgundy/5 to-purple-50 rounded-xl p-6 border border-burgundy/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-burgundy flex items-center justify-center shrink-0">
                  <Edit3 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-deep-charcoal mb-2">
                    Éditeur de site web avancé
                  </h3>
                  <p className="text-sm text-warm-taupe mb-4">
                    Personnalisez en profondeur l'apparence de votre site : couleurs, textes, images et bien plus encore avec l'éditeur visuel.
                  </p>
                  <a
                    href="/admin/website-editor"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-burgundy text-white rounded-lg hover:bg-burgundy-dark transition-all shadow-md hover:shadow-lg"
                  >
                    <Edit3 className="w-4 h-4" />
                    Ouvrir l'éditeur
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Albums Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 border border-burgundy-old/20 flex items-center justify-center">
            <FolderOpen className="text-burgundy-old" size={20} />
          </div>
          <div>
            <h2 className="font-serif text-xl text-charcoal font-light">Albums</h2>
            <p className="text-charcoal/50 text-sm font-light">Organisez vos photos</p>
          </div>
        </div>

        <div className="bg-white shadow-xs border border-charcoal/5 p-6">
          <AlbumManager dataService={dataService} />
        </div>
      </section>

      {/* Enhanced Statistics */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 border border-burgundy-old/20 flex items-center justify-center">
            <BarChart3 className="text-burgundy-old" size={20} />
          </div>
          <div>
            <h2 className="font-serif text-xl text-charcoal font-light">Statistiques détaillées</h2>
            <p className="text-charcoal/50 text-sm font-light">Analyse approfondie de l'activité</p>
          </div>
        </div>

        <div className="bg-white shadow-xs border border-charcoal/5 p-6">
          {enhancedStats ? (
            <EnhancedStatistics stats={enhancedStats} />
          ) : (
            <div className="text-center py-8 text-charcoal/50 font-light">
              Statistiques détaillées non disponibles
            </div>
          )}
        </div>
      </section>

      {/* Storage Info */}
      <section className="bg-linear-to-br from-cream to-cream-dark p-6 text-center">
        <p className="text-sm font-medium text-charcoal/70">Stockage</p>
        <p className="text-xs text-charcoal/50 mt-1 font-light">
          Géré par Cloudflare R2 en production
        </p>
        <p className="text-xs text-charcoal/40 mt-1 font-light italic">
          Mode démo : stockage local
        </p>
      </section>
    </div>
  );
}
