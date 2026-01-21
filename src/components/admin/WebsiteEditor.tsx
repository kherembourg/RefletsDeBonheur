import { useState, useEffect, useRef } from 'react';
import {
  Palette,
  Type,
  Image,
  Eye,
  Save,
  RotateCcw,
  Sparkles,
  RefreshCw,
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
  initialCustomization?: WeddingCustomization;
  onSave?: (customization: WeddingCustomization) => Promise<void>;
}

type EditorTab = 'theme' | 'colors' | 'content' | 'images';

export function WebsiteEditor({
  weddingId,
  weddingSlug,
  initialCustomization,
  onSave,
}: WebsiteEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('theme');
  const [customization, setCustomization] = useState<WeddingCustomization>(
    initialCustomization || DEFAULT_CUSTOMIZATION
  );
  const [isSaving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Track changes
  useEffect(() => {
    const hasChanged = JSON.stringify(customization) !== JSON.stringify(initialCustomization || DEFAULT_CUSTOMIZATION);
    setHasChanges(hasChanged);
  }, [customization, initialCustomization]);

  // Handle save
  const handleSave = async () => {
    if (!onSave) return;

    try {
      setSaving(true);
      await onSave({
        ...customization,
        lastUpdated: new Date().toISOString(),
      });
      setHasChanges(false);
      // Refresh preview
      setPreviewKey((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to save customization:', error);
      alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  // Handle reset
  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser toutes les personnalisations ?')) {
      setCustomization(initialCustomization || DEFAULT_CUSTOMIZATION);
    }
  };

  // Refresh preview
  const refreshPreview = () => {
    setPreviewKey((prev) => prev + 1);
  };

  const tabs = [
    { id: 'theme' as const, label: 'Thème', icon: Sparkles },
    { id: 'colors' as const, label: 'Couleurs', icon: Palette },
    { id: 'content' as const, label: 'Contenu', icon: Type },
    { id: 'images' as const, label: 'Images', icon: Image },
  ];

  return (
    <div className="h-screen flex flex-col bg-linear-to-br from-cream via-white to-blush/30">
      {/* Header */}
      <div className="bg-white border-b border-silver-mist/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-deep-charcoal">
              Éditeur de site web
            </h1>
            <p className="text-sm text-warm-taupe mt-1">
              Personnalisez l'apparence et le contenu de votre site de mariage
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Reset Button */}
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="px-4 py-2 rounded-lg border border-silver-mist/30 text-warm-taupe hover:text-deep-charcoal hover:border-silver-mist transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Réinitialiser les modifications"
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser
            </button>

            {/* Refresh Preview */}
            <button
              onClick={refreshPreview}
              className="px-4 py-2 rounded-lg border border-silver-mist/30 text-warm-taupe hover:text-deep-charcoal hover:border-silver-mist transition-all flex items-center gap-2"
              title="Actualiser l'aperçu"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                hasChanges
                  ? 'bg-burgundy text-white hover:bg-burgundy-dark shadow-lg shadow-burgundy/20'
                  : 'bg-silver-mist/30 text-warm-taupe cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Split Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel - Right Side */}
        <div className="w-[400px] bg-white border-r border-silver-mist/30 flex flex-col">
          {/* Tabs */}
          <div className="border-b border-silver-mist/30">
            <div className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      isActive
                        ? 'bg-linear-to-b from-burgundy/5 to-transparent text-burgundy border-b-2 border-burgundy'
                        : 'text-warm-taupe hover:text-deep-charcoal hover:bg-silver-mist/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <EditorContent
              activeTab={activeTab}
              customization={customization}
              onUpdate={setCustomization}
              weddingSlug={weddingSlug}
            />
          </div>
        </div>

        {/* Preview Panel - Left Side */}
        <div className="flex-1 bg-linear-to-br from-silver-mist/5 to-silver-mist/10 p-6 flex flex-col">
          <div className="bg-white rounded-xl shadow-2xl border border-silver-mist/30 flex-1 flex flex-col overflow-hidden">
            {/* Preview Header */}
            <div className="bg-linear-to-r from-burgundy/5 to-transparent px-6 py-3 border-b border-silver-mist/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-burgundy" />
                <span className="font-medium text-deep-charcoal">
                  Aperçu en temps réel
                </span>
              </div>
              <a
                href={`/${weddingSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-burgundy hover:text-burgundy-dark transition-colors"
              >
                Ouvrir dans un nouvel onglet →
              </a>
            </div>

            {/* Preview Iframe */}
            <div className="flex-1 relative">
              <iframe
                key={previewKey}
                ref={iframeRef}
                src={`/${weddingSlug}?preview=true&t=${Date.now()}`}
                className="absolute inset-0 w-full h-full bg-white"
                title="Aperçu du site"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-200 text-amber-900 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="font-medium">Modifications non enregistrées</span>
        </div>
      )}
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
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-deep-charcoal mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-burgundy" />
            Sélectionner un thème
          </h3>
          <p className="text-sm text-warm-taupe">
            Choisissez le thème de base pour votre site de mariage
          </p>
        </div>

        {/* Theme Cards */}
        <div className="grid gap-4">
          {themeList.map((theme) => {
            const isSelected = customization.themeId === theme.id;

            return (
              <button
                key={theme.id}
                onClick={() => onUpdate({ ...customization, themeId: theme.id })}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-burgundy bg-burgundy/5 shadow-lg'
                    : 'border-silver-mist/30 hover:border-silver-mist'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-burgundy flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className="h-24 rounded-lg mb-3"
                  style={{ backgroundColor: theme.colors.background }}
                >
                  <div className="w-full h-full p-3 flex items-center justify-center">
                    <div className="text-center">
                      <div
                        className="h-3 w-24 rounded-sm mx-auto mb-2"
                        style={{ backgroundColor: theme.colors.text, opacity: 0.3 }}
                      />
                      <div
                        className="h-2 w-16 rounded-sm mx-auto"
                        style={{ backgroundColor: theme.colors.accent, opacity: 0.5 }}
                      />
                    </div>
                  </div>
                </div>

                <h4 className="font-semibold text-deep-charcoal mb-1">
                  {theme.name}
                </h4>
                <p className="text-sm text-warm-taupe mb-3">
                  {theme.description}
                </p>

                <div className="flex gap-1.5">
                  {Object.entries(theme.colors)
                    .slice(0, 5)
                    .map(([key, color]) => (
                      <div
                        key={key}
                        className="w-6 h-6 rounded-full border border-silver-mist/30"
                        style={{ backgroundColor: color }}
                        title={key}
                      />
                    ))}
                </div>
              </button>
            );
          })}
        </div>
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
