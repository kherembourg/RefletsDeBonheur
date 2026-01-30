/**
 * useWebsiteEditor Hook
 *
 * Centralizes all state and logic for the Website Editor.
 * Handles customization, auto-save, live preview, and image uploads.
 */

import { useState, useEffect, useRef, useCallback, useMemo, type RefObject } from 'react';
import type { ThemeId } from '../lib/themes';
import type {
  WeddingCustomization,
  CustomPalette,
  CustomContent,
  CustomImages,
} from '../lib/customization';
import { DEFAULT_CUSTOMIZATION } from '../lib/customization';

// ============================================
// Types
// ============================================

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseWebsiteEditorOptions {
  weddingId: string;
  weddingSlug: string;
  demoMode?: boolean;
  authToken?: string;
  initialCustomization?: WeddingCustomization;
  onSave?: (customization: WeddingCustomization) => Promise<void>;
}

export interface UseWebsiteEditorReturn {
  // State
  customization: WeddingCustomization;
  saveStatus: SaveStatus;
  hasUnsavedChanges: boolean;

  // Actions
  updateTheme: (themeId: ThemeId) => void;
  updateColors: (palette: Partial<CustomPalette>) => void;
  updateContent: (content: Partial<CustomContent>) => void;
  updateImages: (images: Partial<CustomImages>) => void;
  setCustomization: (customization: WeddingCustomization) => void;
  resetToDefault: () => void;
  forceSave: () => Promise<void>;

  // Preview
  previewKey: number;
  isPreviewLoading: boolean;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  refreshPreview: () => void;
  handleIframeLoad: () => void;

  // Upload
  uploadImage: (file: File, key: keyof CustomImages) => Promise<string>;
  uploadProgress: number | null;
}

// localStorage key for live preview sync
const PREVIEW_STORAGE_KEY = 'wedding_preview_customization';

// ============================================
// Hook Implementation
// ============================================

export function useWebsiteEditor(options: UseWebsiteEditorOptions): UseWebsiteEditorReturn {
  const {
    weddingId,
    weddingSlug,
    demoMode = false,
    authToken,
    initialCustomization,
    onSave,
  } = options;

  // ----------------------------------------
  // State
  // ----------------------------------------
  const [customization, setCustomizationState] = useState<WeddingCustomization>(
    initialCustomization || DEFAULT_CUSTOMIZATION
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [previewKey, setPreviewKey] = useState(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // ----------------------------------------
  // Refs
  // ----------------------------------------
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>(
    JSON.stringify(initialCustomization || DEFAULT_CUSTOMIZATION)
  );
  const customizationRef = useRef(customization);
  const blobUrlsRef = useRef<Set<string>>(new Set());

  // Keep ref in sync with state
  useEffect(() => {
    customizationRef.current = customization;
  }, [customization]);

  // ----------------------------------------
  // Computed
  // ----------------------------------------
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(customization) !== lastSavedRef.current,
    [customization]
  );

  // ----------------------------------------
  // Load from localStorage (demo mode)
  // ----------------------------------------
  useEffect(() => {
    if (!demoMode) return;

    const storageKey = `wedding_customization_${weddingSlug}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedCustomization = JSON.parse(saved) as WeddingCustomization;
        setCustomizationState(parsedCustomization);
        lastSavedRef.current = saved;
      }
    } catch (error) {
      console.warn('Failed to load saved customization from localStorage:', error);
    }
  }, [demoMode, weddingSlug]);

  // ----------------------------------------
  // Live Preview Sync (postMessage + localStorage)
  // ----------------------------------------
  const sendPreviewUpdate = useCallback(() => {
    // Store in localStorage for cross-tab sync
    const previewData = {
      weddingSlug,
      customization: customizationRef.current,
      timestamp: Date.now(),
    };
    localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(previewData));

    // Send postMessage to iframe for instant update
    if (iframeRef.current?.contentWindow) {
      // Use origin if available, fallback to '*' in test environments
      const targetOrigin = typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : '*';
      iframeRef.current.contentWindow.postMessage(
        { type: 'CUSTOMIZATION_UPDATE', customization: customizationRef.current },
        targetOrigin
      );
    }
  }, [weddingSlug]);

  // Send preview update whenever customization changes
  useEffect(() => {
    sendPreviewUpdate();
  }, [customization, sendPreviewUpdate]);

  // Cleanup localStorage on unmount
  useEffect(() => {
    return () => {
      localStorage.removeItem(PREVIEW_STORAGE_KEY);
    };
  }, []);

  // ----------------------------------------
  // Save Logic
  // ----------------------------------------
  const saveToApi = useCallback(
    async (data: WeddingCustomization) => {
      // Demo mode: save to localStorage
      if (demoMode) {
        const storageKey = `wedding_customization_${weddingSlug}`;
        localStorage.setItem(storageKey, JSON.stringify(data));
        return { success: true };
      }

      // Production mode: save to API
      const response = await fetch('/api/customization/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({ weddingId, customization: data }),
      });

      if (!response.ok) {
        throw new Error('Failed to save customization');
      }

      return response.json();
    },
    [weddingId, weddingSlug, demoMode, authToken]
  );

  const performSave = useCallback(async () => {
    const currentCustomization = customizationRef.current;
    const currentJson = JSON.stringify(currentCustomization);

    // No changes to save
    if (currentJson === lastSavedRef.current) {
      return;
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

  // Debounced auto-save (2 seconds after last change)
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

  // ----------------------------------------
  // Update Actions
  // ----------------------------------------
  const setCustomization = useCallback((newCustomization: WeddingCustomization) => {
    setCustomizationState(newCustomization);
  }, []);

  const updateTheme = useCallback((themeId: ThemeId) => {
    setCustomizationState((prev) => ({ ...prev, themeId }));
    // Theme changes require iframe reload (structural HTML changes)
    setPreviewKey((prev) => prev + 1);
    setIsPreviewLoading(true);
  }, []);

  const updateColors = useCallback((palette: Partial<CustomPalette>) => {
    setCustomizationState((prev) => ({
      ...prev,
      customPalette: { ...prev.customPalette, ...palette },
    }));
    // Colors: postMessage only, no iframe reload
  }, []);

  const updateContent = useCallback((content: Partial<CustomContent>) => {
    setCustomizationState((prev) => ({
      ...prev,
      customContent: { ...prev.customContent, ...content },
    }));
    // Content: postMessage only, no iframe reload
  }, []);

  const updateImages = useCallback((images: Partial<CustomImages>) => {
    setCustomizationState((prev) => ({
      ...prev,
      customImages: { ...prev.customImages, ...images },
    }));
    // Images: postMessage only, no iframe reload
  }, []);

  const resetToDefault = useCallback(() => {
    const resetValue = initialCustomization || DEFAULT_CUSTOMIZATION;
    setCustomizationState(resetValue);
    lastSavedRef.current = JSON.stringify(resetValue);
    setPreviewKey((prev) => prev + 1);
    setIsPreviewLoading(true);
  }, [initialCustomization]);

  const forceSave = useCallback(async () => {
    await performSave();
  }, [performSave]);

  // ----------------------------------------
  // Preview Controls
  // ----------------------------------------
  const refreshPreview = useCallback(() => {
    setPreviewKey((prev) => prev + 1);
    setIsPreviewLoading(true);
  }, []);

  const handleIframeLoad = useCallback(() => {
    setIsPreviewLoading(false);
  }, []);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current.clear();
    };
  }, []);

  // ----------------------------------------
  // Image Upload (R2)
  // ----------------------------------------
  const uploadImage = useCallback(
    async (file: File, key: keyof CustomImages): Promise<string> => {
      // Demo mode: use blob URL (temporary)
      if (demoMode) {
        // Revoke previous blob URL for this key if it exists
        const prevUrl = customizationRef.current.customImages?.[key];
        if (prevUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(prevUrl);
          blobUrlsRef.current.delete(prevUrl);
        }

        const blobUrl = URL.createObjectURL(file);
        blobUrlsRef.current.add(blobUrl);
        updateImages({ [key]: blobUrl });
        return blobUrl;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          `Type de fichier non supporté. Utilisez JPG, PNG ou WebP.`
        );
      }

      // Validate file size (5MB max for website images)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(
          `Fichier trop volumineux. Maximum 5 Mo.`
        );
      }

      try {
        setUploadProgress(0);

        // Step 1: Get presigned URL
        const presignResponse = await fetch('/api/upload/website-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
          body: JSON.stringify({
            weddingId,
            fileName: file.name,
            contentType: file.type,
            fileSize: file.size,
            imageKey: key,
          }),
        });

        if (!presignResponse.ok) {
          const error = await presignResponse.json();
          throw new Error(error.message || 'Échec de la génération de l\'URL d\'upload');
        }

        const { uploadUrl, publicUrl } = await presignResponse.json();

        // Step 2: Upload file to R2 with progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percentage = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(percentage);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload échoué avec le status ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Erreur réseau pendant l\'upload'));
          });

          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.send(file);
        });

        // Step 3: Update customization with permanent URL
        updateImages({ [key]: publicUrl });
        setUploadProgress(null);

        return publicUrl;
      } catch (error) {
        setUploadProgress(null);
        throw error;
      }
    },
    [weddingId, demoMode, authToken, updateImages]
  );

  // ----------------------------------------
  // Return
  // ----------------------------------------
  return {
    // State
    customization,
    saveStatus,
    hasUnsavedChanges,

    // Actions
    updateTheme,
    updateColors,
    updateContent,
    updateImages,
    setCustomization,
    resetToDefault,
    forceSave,

    // Preview
    previewKey,
    isPreviewLoading,
    iframeRef,
    refreshPreview,
    handleIframeLoad,

    // Upload
    uploadImage,
    uploadProgress,
  };
}
