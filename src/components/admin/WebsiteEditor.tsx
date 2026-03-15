import { useState, useEffect, useCallback } from 'react';
import { useWebsiteEditor } from '../../hooks/useWebsiteEditor';
import { EditorToolbar, EditorSidebar, PreviewPanel } from './website-editor';
import { AdminModal } from './ui/AdminModal';
import type { EditorTab, DevicePreview, WebsiteEditorProps } from './website-editor';

type ConfirmAction = 'reset' | 'leave' | null;

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
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

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

  const navigateBack = useCallback(() => {
    window.location.href = weddingSlug ? `/${weddingSlug}/admin` : '/admin';
  }, [weddingSlug]);

  const closeConfirmModal = useCallback(() => {
    setConfirmAction(null);
  }, []);

  const handleConfirmAction = useCallback(() => {
    if (confirmAction === 'reset') {
      resetToDefault();
    }

    if (confirmAction === 'leave') {
      navigateBack();
    }

    setConfirmAction(null);
  }, [confirmAction, navigateBack, resetToDefault]);

  const handleReset = () => {
    setConfirmAction('reset');
  };

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      setConfirmAction('leave');
      return;
    }

    navigateBack();
  }, [hasUnsavedChanges, navigateBack]);

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

  const confirmCopy = confirmAction === 'reset'
    ? {
        title: 'Réinitialiser les personnalisations',
        description: 'Toutes vos modifications locales seront supprimées et le site reviendra à son état par défaut.',
        confirmLabel: 'Réinitialiser',
      }
    : {
        title: 'Quitter l’éditeur',
        description: 'Vous avez des modifications non enregistrées. Si vous quittez maintenant, elles seront perdues.',
        confirmLabel: 'Quitter sans enregistrer',
      };

  return (
    <>
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
      <AdminModal
        isOpen={confirmAction !== null}
        onClose={closeConfirmModal}
        title={confirmCopy.title}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={closeConfirmModal}
              className="rounded-lg border border-charcoal/10 px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-charcoal/5"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirmAction}
              className="rounded-lg bg-burgundy-old px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-burgundy-dark"
            >
              {confirmCopy.confirmLabel}
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-charcoal/70">{confirmCopy.description}</p>
      </AdminModal>
    </>
  );
}
