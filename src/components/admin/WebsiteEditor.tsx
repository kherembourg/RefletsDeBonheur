import { useState } from 'react';
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
    setCustomization,
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
    <div className="h-screen flex flex-col bg-[#0f0f0f] text-white overflow-hidden">
      {/* Top Toolbar */}
      <header className="h-14 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center justify-between px-4 shrink-0">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <a
            href={weddingSlug ? `/${weddingSlug}/admin` : '/admin'}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Retour</span>
          </a>

          <div className="h-6 w-px bg-[#2a2a2a]" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-burgundy to-rose-gold flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Éditeur de site</h1>
              <p className="text-xs text-gray-500">Personnalisation</p>
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
        <div className="flex items-center gap-1 bg-[#0f0f0f] rounded-lg p-1">
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
                  ? 'bg-[#2a2a2a] text-white'
                  : 'text-gray-500 hover:text-gray-300'
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
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 w-12 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(150, zoom + 10))}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-[#2a2a2a]" />

          {/* Refresh */}
          <button
            onClick={refreshPreview}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-all"
            title="Actualiser l'aperçu"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-all"
            title="Réinitialiser"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Open in new tab */}
          <a
            href={`/${weddingSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-all"
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
          className={`bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col transition-all duration-300 ${
            sidebarCollapsed ? 'w-16' : 'w-[340px]'
          }`}
        >
          {/* Tab Navigation */}
          <nav className="flex border-b border-[#2a2a2a]">
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
                      : 'text-gray-500 hover:text-gray-300'
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
                  onFullUpdate={setCustomization}
                  onUpload={uploadImage}
                  uploadProgress={uploadProgress}
                />
              </div>
            </div>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-3 border-t border-[#2a2a2a] text-gray-500 hover:text-white hover:bg-[#2a2a2a] transition-all flex items-center justify-center gap-2"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            {!sidebarCollapsed && <span className="text-xs">Réduire</span>}
          </button>
        </aside>

        {/* Preview Panel */}
        <main className="flex-1 bg-[#0a0a0a] p-6 flex flex-col overflow-hidden">
          {/* Preview Container */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
          >
            <div
              className={`bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ${
                devicePreview !== 'desktop' ? 'border-8 border-[#1a1a1a] rounded-[2rem]' : ''
              }`}
              style={{
                width: getPreviewWidth(),
                height: devicePreview === 'desktop' ? '100%' : devicePreview === 'tablet' ? '1024px' : '812px',
                maxHeight: '100%',
              }}
            >
              {/* Device frame for mobile/tablet */}
              {devicePreview !== 'desktop' && (
                <div className="h-6 bg-[#1a1a1a] flex items-center justify-center">
                  <div className="w-20 h-1 bg-[#3a3a3a] rounded-full" />
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
            <div className="bg-[#1a1a1a] rounded-full px-4 py-2 flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-gray-500" />
              <span className="text-gray-400">/{weddingSlug}</span>
              <span className="text-gray-600">• Aperçu en direct</span>
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
  onFullUpdate: (customization: WeddingCustomization) => void;
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
  onFullUpdate,
  onUpload,
  uploadProgress,
}: EditorContentProps) {
  // Theme Tab
  if (activeTab === 'theme') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-burgundy" />
            Sélectionner un thème
          </h3>
          <p className="text-xs text-gray-500">
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
                    ? 'border-burgundy bg-burgundy/10'
                    : 'border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#0f0f0f]'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-burgundy flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Theme Preview */}
                <div
                  className="h-16 rounded-lg mb-2 overflow-hidden"
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

                <h4 className="text-sm font-medium text-white mb-1 truncate">
                  {theme.name}
                </h4>

                {/* Color dots */}
                <div className="flex gap-1">
                  {Object.entries(theme.colors)
                    .slice(0, 4)
                    .map(([key, color]) => (
                      <div
                        key={key}
                        className="w-4 h-4 rounded-full border border-[#3a3a3a]"
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
          <div className="mt-4 p-3 bg-[#0f0f0f] rounded-xl border border-[#2a2a2a]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-burgundy/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-burgundy" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white">
                  {themeList.find(t => t.id === customization.themeId)?.name}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
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
