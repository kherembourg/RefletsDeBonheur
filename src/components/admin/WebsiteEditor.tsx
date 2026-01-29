import { useState, useEffect, useRef, useCallback } from 'react';
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
import type { ThemeId } from '../../lib/themes';
import { themeList, type Theme } from '../../lib/themes';
import type { WeddingCustomization } from '../../lib/customization';
import { DEFAULT_CUSTOMIZATION } from '../../lib/customization';
import { ColorPaletteEditor } from './ColorPaletteEditor';
import { ContentEditor } from './ContentEditor';
import { ImageManager } from './ImageManager';

interface WebsiteEditorProps {
  weddingId: string;
  weddingSlug: string;
  demoMode?: boolean;
  initialCustomization?: WeddingCustomization;
  onSave?: (customization: WeddingCustomization) => Promise<void>;
}

type EditorTab = 'theme' | 'colors' | 'content' | 'images';
type DevicePreview = 'desktop' | 'tablet' | 'mobile';

// localStorage key for live preview
const PREVIEW_STORAGE_KEY = 'wedding_preview_customization';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function WebsiteEditor({
  weddingId,
  weddingSlug,
  demoMode = false,
  initialCustomization,
  onSave,
}: WebsiteEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('theme');
  const [customization, setCustomization] = useState<WeddingCustomization>(
    initialCustomization || DEFAULT_CUSTOMIZATION
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [previewKey, setPreviewKey] = useState(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [devicePreview, setDevicePreview] = useState<DevicePreview>('desktop');
  const [zoom, setZoom] = useState(100);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>(JSON.stringify(initialCustomization || DEFAULT_CUSTOMIZATION));

  // Use demoMode prop (passed from Astro page based on Supabase configuration)
  const isDemoMode = demoMode;

  // Load saved customization from localStorage on mount (demo mode)
  useEffect(() => {
    if (!isDemoMode) return;

    const storageKey = `wedding_customization_${weddingSlug}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedCustomization = JSON.parse(saved) as WeddingCustomization;
        setCustomization(parsedCustomization);
        lastSavedRef.current = saved;
      }
    } catch (error) {
      console.warn('Failed to load saved customization from localStorage:', error);
    }
  }, [isDemoMode, weddingSlug]);

  // Store customization in localStorage for live preview
  useEffect(() => {
    const previewData = {
      weddingSlug,
      customization,
      timestamp: Date.now(),
    };
    localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(previewData));

    // Notify iframe of changes via postMessage
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'CUSTOMIZATION_UPDATE', customization },
        '*'
      );
    }
  }, [customization, weddingSlug]);

  // Save customization - localStorage for demo, API for production
  const saveToApi = useCallback(async (data: WeddingCustomization) => {
    // In demo mode, save to localStorage instead of API
    if (isDemoMode) {
      const storageKey = `wedding_customization_${weddingSlug}`;
      localStorage.setItem(storageKey, JSON.stringify(data));
      return { success: true, message: 'Customization saved to local storage (demo mode)' };
    }

    // Production mode: save to API
    const response = await fetch('/api/customization/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weddingId, customization: data }),
    });

    if (!response.ok) {
      throw new Error('Failed to save customization');
    }

    return response.json();
  }, [weddingId, weddingSlug, isDemoMode]);

  // Ref to track current customization for debounced save
  const customizationRef = useRef(customization);
  useEffect(() => {
    customizationRef.current = customization;
  }, [customization]);

  // Debounced auto-save (2 seconds after changes)
  const performSave = useCallback(async () => {
    const currentCustomization = customizationRef.current;
    const currentJson = JSON.stringify(currentCustomization);
    if (currentJson === lastSavedRef.current) {
      return; // No actual changes to save
    }

    try {
      setSaveStatus('saving');
      const dataToSave = {
        ...currentCustomization,
        lastUpdated: new Date().toISOString(),
      };

      // Use provided onSave or default to API call
      if (onSave) {
        await onSave(dataToSave);
      } else {
        await saveToApi(dataToSave);
      }

      lastSavedRef.current = currentJson;
      setSaveStatus('saved');

      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save customization:', error);
      setSaveStatus('error');
      // Reset to idle after 3 seconds on error
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [onSave, saveToApi]);

  // Trigger debounced save when customization changes
  useEffect(() => {
    const currentJson = JSON.stringify(customization);
    const initialJson = JSON.stringify(initialCustomization || DEFAULT_CUSTOMIZATION);

    // Don't save if it matches initial state and we haven't saved before
    if (currentJson === initialJson && lastSavedRef.current === initialJson) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [customization, initialCustomization, performSave]);

  // Debounce customization changes → trigger preview reload
  const isInitialMount = useRef(true);
  useEffect(() => {
    // Skip initial render to avoid unnecessary reload on mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setPreviewKey((prev) => prev + 1);
    }, 500);

    return () => clearTimeout(timer);
  }, [customization]);

  // Set loading when preview key changes
  useEffect(() => {
    if (previewKey > 0) {
      setIsPreviewLoading(true);
    }
  }, [previewKey]);

  // Handle iframe load - hide loading overlay
  const handleIframeLoad = useCallback(() => {
    setIsPreviewLoading(false);
  }, []);

  // Cleanup localStorage on unmount
  useEffect(() => {
    return () => {
      localStorage.removeItem(PREVIEW_STORAGE_KEY);
    };
  }, []);

  // Handle reset
  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser toutes les personnalisations ?')) {
      const resetValue = initialCustomization || DEFAULT_CUSTOMIZATION;
      setCustomization(resetValue);
      lastSavedRef.current = JSON.stringify(resetValue);
    }
  };

  // Refresh preview
  const refreshPreview = () => {
    setPreviewKey((prev) => prev + 1);
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(customization) !== lastSavedRef.current;

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
                  onUpdate={setCustomization}
                  weddingSlug={weddingSlug}
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

        {/* Preview Panel - Takes most of the space */}
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
                  src={`/${weddingSlug}?preview=true&t=${Date.now()}`}
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
// EDITOR CONTENT COMPONENT
// ============================================

interface EditorContentProps {
  activeTab: EditorTab;
  customization: WeddingCustomization;
  onUpdate: (customization: WeddingCustomization) => void;
  weddingSlug: string;
}

function EditorContent({ activeTab, customization, onUpdate, weddingSlug }: EditorContentProps) {
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
                onClick={() => onUpdate({ ...customization, themeId: theme.id })}
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
        onChange={(palette) => onUpdate({ ...customization, customPalette: palette })}
      />
    );
  }

  // Content Tab
  if (activeTab === 'content') {
    return (
      <ContentEditor
        customContent={customization.customContent}
        onChange={(content) => onUpdate({ ...customization, customContent: content })}
      />
    );
  }

  // Images Tab
  if (activeTab === 'images') {
    return (
      <ImageManager
        customImages={customization.customImages}
        onChange={(images) => onUpdate({ ...customization, customImages: images })}
        onUpload={async (file, key) => {
          // TODO: Implement actual upload to R2
          console.log('Upload file:', file, 'for key:', key);
          // For now, return a placeholder URL
          return URL.createObjectURL(file);
        }}
      />
    );
  }

  return null;
}
