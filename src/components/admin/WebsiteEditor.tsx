import { useState, useEffect, useCallback } from 'react';
import { useWebsiteEditor } from '../../hooks/useWebsiteEditor';
import { EditorToolbar, EditorSidebar, PreviewPanel } from './website-editor';
import type { EditorTab, DevicePreview, WebsiteEditorProps } from './website-editor';

export function WebsiteEditor({
  weddingId,
  weddingSlug,
  demoMode = false,
  lang = 'fr',
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

  return (
    <div className="h-screen flex flex-col bg-cream text-charcoal overflow-hidden">
      <EditorToolbar
        weddingSlug={weddingSlug}
        saveStatus={saveStatus}
        hasUnsavedChanges={hasUnsavedChanges}
        devicePreview={devicePreview}
        zoom={zoom}
        lang={lang}
        onBack={handleBack}
        onDeviceChange={setDevicePreview}
        onZoomIn={() => setZoom(Math.min(150, zoom + 10))}
        onZoomOut={() => setZoom(Math.max(50, zoom - 10))}
        onRefresh={refreshPreview}
        onReset={handleReset}
      />

      <div className="flex-1 flex overflow-hidden">
        <EditorSidebar
          activeTab={activeTab}
          collapsed={sidebarCollapsed}
          customization={customization}
          uploadProgress={uploadProgress}
          lang={lang}
          onTabChange={setActiveTab}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onThemeChange={updateTheme}
          onColorsChange={updateColors}
          onContentChange={updateContent}
          onImagesChange={updateImages}
          onUpload={uploadImage}
        />

        <PreviewPanel
          weddingSlug={weddingSlug}
          previewKey={previewKey}
          devicePreview={devicePreview}
          zoom={zoom}
          isPreviewLoading={isPreviewLoading}
          iframeRef={iframeRef}
          lang={lang}
          onIframeLoad={handleIframeLoad}
        />
      </div>
    </div>
  );
}
