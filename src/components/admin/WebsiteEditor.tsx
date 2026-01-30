import { useState, useEffect, useCallback } from 'react';
import {
  Palette,
  Type,
  Image,
  Eye,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Monitor,
  Tablet,
  Smartphone,
  ChevronLeft,
  Check,
  Layers,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Cloud,
  CloudOff,
  Loader2,
} from 'lucide-react';
import { themeList } from '../../lib/themes';
import type { WeddingCustomization } from '../../lib/customization';
import { ColorPaletteEditor } from './ColorPaletteEditor';
import { ContentEditor } from './ContentEditor';
import { ImageManager } from './ImageManager';
import { useWebsiteEditor } from '../../hooks/useWebsiteEditor';

// ============================================
// Types
// ============================================

interface WebsiteEditorProps {
  weddingId: string;
  weddingSlug: string;
  demoMode?: boolean;
  initialCustomization?: WeddingCustomization;
  onSave?: (customization: WeddingCustomization) => Promise<void>;
}

type EditorTab = 'theme' | 'colors' | 'content' | 'images';
type DevicePreview = 'desktop' | 'tablet' | 'mobile';

// ============================================
// Main Component
// ============================================

export function WebsiteEditor({
  weddingId,
  weddingSlug,
  demoMode = false,
  initialCustomization,
  onSave,
}: WebsiteEditorProps) {
  // UI-only state (not part of the hook)
  const [activeTab, setActiveTab] = useState<EditorTab>('theme');
  const [devicePreview, setDevicePreview] = useState<DevicePreview>('desktop');
  const [zoom, setZoom] = useState(100);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // All editor logic is in the hook
  const {
    customization,
    saveStatus,
    hasUnsavedChanges,
    updateTheme,
    updateColors,
    updateContent,
    updateImages,
    resetToDefault,
    previewKey,
    isPreviewLoading,
    iframeRef,
    refreshPreview,
    handleIframeLoad,
    uploadImage,
    uploadProgress,
  } = useWebsiteEditor({
    weddingId,
    weddingSlug,
    demoMode,
    initialCustomization,
    onSave,
  });

  // Handle reset with confirmation
  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser toutes les personnalisations ?')) {
      resetToDefault();
    }
  };

  // Handle back navigation with unsaved changes warning
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      if (confirm('Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?')) {
        window.location.href = weddingSlug ? `/${weddingSlug}/admin` : '/admin';
      }
    } else {
      window.location.href = weddingSlug ? `/${weddingSlug}/admin` : '/admin';
    }
  }, [hasUnsavedChanges, weddingSlug]);

  // Warn on browser navigation/refresh with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Get device width for preview
  const getPreviewWidth = () => {
    switch (devicePreview) {
      case 'mobile':
        return 375;
      case 'tablet':
        return 768;
      default:
        return '100%';
    }
  };

  const tabs = [
    { id: 'theme' as const, label: 'Thèmes', icon: Sparkles },
    { id: 'colors' as const, label: 'Couleurs', icon: Palette },
    { id: 'content' as const, label: 'Contenu', icon: Type },
    { id: 'images' as const, label: 'Images', icon: Image },
  ];

  return (
    <div className="h-screen flex flex-col bg-cream text-charcoal overflow-hidden">
      {/* Top Toolbar */}
      <header className="h-14 bg-white border-b border-charcoal/10 flex items-center justify-between px-4 shrink-0 shadow-xs">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-charcoal/60 hover:text-charcoal transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Retour</span>
          </button>

          <div className="h-6 w-px bg-charcoal/10" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-burgundy/10 flex items-center justify-center">
              <Layers className="w-4 h-4 text-burgundy" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-charcoal">Éditeur de site</h1>
              <p className="text-xs text-charcoal/50">Personnalisation</p>
            </div>
          </div>

          {/* Auto-save status indicator */}
          <div className="ml-2 flex items-center gap-1.5">
            {saveStatus === 'saving' && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Enregistrement...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                <Cloud className="w-3 h-3" />
                Enregistré
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full border border-red-500/30 flex items-center gap-1.5">
                <CloudOff className="w-3 h-3" />
                Erreur
              </span>
            )}
            {saveStatus === 'idle' && hasUnsavedChanges && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
                Modifications...
              </span>
            )}
          </div>
        </div>

        {/* Center section - Device Preview */}
        <div className="flex items-center gap-1 bg-charcoal/5 rounded-lg p-1">
          {[
            { id: 'desktop' as const, icon: Monitor, label: 'Bureau' },
            { id: 'tablet' as const, icon: Tablet, label: 'Tablette' },
            { id: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setDevicePreview(id)}
              className={`p-2 rounded-md transition-all ${
                devicePreview === id
                  ? 'bg-white text-charcoal shadow-sm'
                  : 'text-charcoal/50 hover:text-charcoal'
              }`}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              className="p-1.5 rounded text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-charcoal/60 w-12 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(150, zoom + 10))}
              className="p-1.5 rounded text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-charcoal/10" />

          {/* Refresh */}
          <button
            onClick={refreshPreview}
            className="p-2 rounded-lg text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-all"
            title="Actualiser l'aperçu"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="p-2 rounded-lg text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-all"
            title="Réinitialiser"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Open in new tab */}
          <a
            href={`/${weddingSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-all"
            title="Ouvrir dans un nouvel onglet"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Editor Panel */}
        <aside
          className={`bg-white border-r border-charcoal/10 flex flex-col transition-all duration-300 shadow-sm ${
            sidebarCollapsed ? 'w-16' : 'w-[340px]'
          }`}
        >
          {/* Tab Navigation */}
          <nav className="flex border-b border-charcoal/10">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all relative ${
                    isActive
                      ? 'text-burgundy'
                      : 'text-charcoal/50 hover:text-charcoal'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {!sidebarCollapsed && (
                    <span className="text-xs font-medium">{tab.label}</span>
                  )}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-burgundy rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Tab Content */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <EditorContent
                  activeTab={activeTab}
                  customization={customization}
                  onThemeChange={updateTheme}
                  onColorsChange={updateColors}
                  onContentChange={updateContent}
                  onImagesChange={updateImages}
                  onUpload={uploadImage}
                  uploadProgress={uploadProgress}
                />
              </div>
            </div>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-3 border-t border-charcoal/10 text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-all flex items-center justify-center gap-2"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            {!sidebarCollapsed && <span className="text-xs">Réduire</span>}
          </button>
        </aside>

        {/* Preview Panel */}
        <main className="flex-1 bg-charcoal/5 p-6 flex flex-col overflow-hidden">
          {/* Preview Container */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
          >
            <div
              className={`bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ${
                devicePreview !== 'desktop' ? 'border-8 border-charcoal rounded-[2rem]' : ''
              }`}
              style={{
                width: getPreviewWidth(),
                height: devicePreview === 'desktop' ? '100%' : devicePreview === 'tablet' ? '1024px' : '812px',
                maxHeight: '100%',
              }}
            >
              {/* Device frame for mobile/tablet */}
              {devicePreview !== 'desktop' && (
                <div className="h-6 bg-charcoal flex items-center justify-center">
                  <div className="w-20 h-1 bg-charcoal-light rounded-full" />
                </div>
              )}

              {/* Iframe Preview with Loading Overlay */}
              <div className="relative w-full" style={{ height: devicePreview !== 'desktop' ? 'calc(100% - 24px)' : '100%' }}>
                <iframe
                  key={previewKey}
                  ref={iframeRef}
                  src={`/${weddingSlug}?preview=true&v=${previewKey}`}
                  className="w-full h-full bg-white"
                  onLoad={handleIframeLoad}
                  title="Aperçu du site"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />

                {/* Loading overlay */}
                {isPreviewLoading && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview URL bar */}
          <div className="mt-4 flex items-center justify-center">
            <div className="bg-white rounded-full px-4 py-2 flex items-center gap-2 text-sm shadow-sm border border-charcoal/10">
              <Eye className="w-4 h-4 text-charcoal/50" />
              <span className="text-charcoal/70">/{weddingSlug}</span>
              <span className="text-charcoal/40">• Aperçu en direct</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ============================================
// Editor Content Component
// ============================================

interface EditorContentProps {
  activeTab: EditorTab;
  customization: WeddingCustomization;
  onThemeChange: (themeId: string) => void;
  onColorsChange: (palette: Record<string, string | undefined>) => void;
  onContentChange: (content: Record<string, string | undefined>) => void;
  onImagesChange: (images: Record<string, string | undefined>) => void;
  onUpload: (file: File, key: string) => Promise<string>;
  uploadProgress: number | null;
}

function EditorContent({
  activeTab,
  customization,
  onThemeChange,
  onColorsChange,
  onContentChange,
  onImagesChange,
  onUpload,
  uploadProgress,
}: EditorContentProps) {
  // Theme Tab
  if (activeTab === 'theme') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-charcoal mb-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-burgundy" />
            Sélectionner un thème
          </h3>
          <p className="text-xs text-charcoal/50">
            Choisissez le style de base pour votre site
          </p>
        </div>

        {/* Theme Grid */}
        <div className="grid grid-cols-2 gap-3">
          {themeList.map((theme) => {
            const isSelected = customization.themeId === theme.id;

            return (
              <button
                key={theme.id}
                onClick={() => onThemeChange(theme.id)}
                className={`relative p-3 rounded-xl border-2 transition-all text-left group ${
                  isSelected
                    ? 'border-burgundy bg-burgundy/5'
                    : 'border-charcoal/10 hover:border-charcoal/20 bg-charcoal/5'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-burgundy flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Theme Preview */}
                <div
                  className="h-16 rounded-lg mb-2 overflow-hidden border border-charcoal/10"
                  style={{ backgroundColor: theme.colors.background }}
                >
                  <div className="w-full h-full p-2 flex flex-col items-center justify-center">
                    <div
                      className="h-2 w-12 rounded-sm mb-1"
                      style={{ backgroundColor: theme.colors.text, opacity: 0.3 }}
                    />
                    <div
                      className="h-1.5 w-8 rounded-sm"
                      style={{ backgroundColor: theme.colors.accent, opacity: 0.5 }}
                    />
                  </div>
                </div>

                <h4 className="text-sm font-medium text-charcoal mb-1 truncate">
                  {theme.name}
                </h4>

                {/* Color dots */}
                <div className="flex gap-1">
                  {Object.entries(theme.colors)
                    .slice(0, 4)
                    .map(([key, color]) => (
                      <div
                        key={key}
                        className="w-4 h-4 rounded-full border border-charcoal/10"
                        style={{ backgroundColor: color }}
                        title={key}
                      />
                    ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Theme Details */}
        {customization.themeId && (
          <div className="mt-4 p-3 bg-charcoal/5 rounded-xl border border-charcoal/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-burgundy/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-burgundy" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-charcoal">
                  {themeList.find(t => t.id === customization.themeId)?.name}
                </h4>
                <p className="text-xs text-charcoal/50 mt-0.5">
                  {themeList.find(t => t.id === customization.themeId)?.description}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Colors Tab
  if (activeTab === 'colors') {
    return (
      <ColorPaletteEditor
        themeId={customization.themeId}
        customPalette={customization.customPalette}
        onChange={onColorsChange}
      />
    );
  }

  // Content Tab
  if (activeTab === 'content') {
    return (
      <ContentEditor
        customContent={customization.customContent}
        onChange={onContentChange}
      />
    );
  }

  // Images Tab
  if (activeTab === 'images') {
    return (
      <ImageManager
        customImages={customization.customImages}
        onChange={onImagesChange}
        onUpload={onUpload}
        uploadProgress={uploadProgress}
      />
    );
  }

  return null;
}
