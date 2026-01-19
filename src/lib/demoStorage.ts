/**
 * Demo Storage - Persists demo data to localStorage
 * This allows the demo to work properly without a backend,
 * simulating real uploads and guestbook submissions.
 */

import type { MediaItem, GuestbookMessage } from './mockData';

// Storage keys
const DEMO_MEDIA_KEY = 'reflets_demo_media';
const DEMO_MESSAGES_KEY = 'reflets_demo_messages';
const DEMO_INITIALIZED_KEY = 'reflets_demo_initialized';

// Check if running in browser
const isBrowser = typeof window !== 'undefined';

// ============ MEDIA STORAGE ============

/**
 * Get all demo media from localStorage
 */
export function getDemoMedia(): MediaItem[] {
  if (!isBrowser) return [];

  try {
    const stored = localStorage.getItem(DEMO_MEDIA_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    // Convert date strings back to Date objects
    return parsed.map((item: any) => ({
      ...item,
      createdAt: new Date(item.createdAt)
    }));
  } catch (error) {
    console.error('Error loading demo media:', error);
    return [];
  }
}

/**
 * Save media item to localStorage
 */
export function saveDemoMedia(item: MediaItem): void {
  if (!isBrowser) return;

  try {
    const existing = getDemoMedia();
    existing.unshift(item);
    localStorage.setItem(DEMO_MEDIA_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error('Error saving demo media:', error);
  }
}

/**
 * Delete media item from localStorage
 */
export function deleteDemoMedia(id: string): boolean {
  if (!isBrowser) return false;

  try {
    const existing = getDemoMedia();
    const filtered = existing.filter(item => item.id !== id);
    localStorage.setItem(DEMO_MEDIA_KEY, JSON.stringify(filtered));
    return existing.length !== filtered.length;
  } catch (error) {
    console.error('Error deleting demo media:', error);
    return false;
  }
}

/**
 * Clear all demo media
 */
export function clearDemoMedia(): void {
  if (!isBrowser) return;
  localStorage.removeItem(DEMO_MEDIA_KEY);
}

// ============ MESSAGES STORAGE ============

/**
 * Get all demo messages from localStorage
 */
export function getDemoMessages(): GuestbookMessage[] {
  if (!isBrowser) return [];

  try {
    const stored = localStorage.getItem(DEMO_MESSAGES_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    // Convert date strings back to Date objects
    return parsed.map((msg: any) => ({
      ...msg,
      createdAt: new Date(msg.createdAt)
    }));
  } catch (error) {
    console.error('Error loading demo messages:', error);
    return [];
  }
}

/**
 * Save message to localStorage
 */
export function saveDemoMessage(message: GuestbookMessage): void {
  if (!isBrowser) return;

  try {
    const existing = getDemoMessages();
    existing.unshift(message);
    localStorage.setItem(DEMO_MESSAGES_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error('Error saving demo message:', error);
  }
}

/**
 * Delete message from localStorage
 */
export function deleteDemoMessage(id: string): boolean {
  if (!isBrowser) return false;

  try {
    const existing = getDemoMessages();
    const filtered = existing.filter(msg => msg.id !== id);
    localStorage.setItem(DEMO_MESSAGES_KEY, JSON.stringify(filtered));
    return existing.length !== filtered.length;
  } catch (error) {
    console.error('Error deleting demo message:', error);
    return false;
  }
}

/**
 * Clear all demo messages
 */
export function clearDemoMessages(): void {
  if (!isBrowser) return;
  localStorage.removeItem(DEMO_MESSAGES_KEY);
}

// ============ INITIALIZATION ============

/**
 * Check if demo has been initialized
 */
export function isDemoInitialized(): boolean {
  if (!isBrowser) return false;
  return localStorage.getItem(DEMO_INITIALIZED_KEY) === 'true';
}

/**
 * Mark demo as initialized
 */
export function markDemoInitialized(): void {
  if (!isBrowser) return;
  localStorage.setItem(DEMO_INITIALIZED_KEY, 'true');
}

/**
 * Reset demo to initial state
 */
export function resetDemo(): void {
  if (!isBrowser) return;
  localStorage.removeItem(DEMO_MEDIA_KEY);
  localStorage.removeItem(DEMO_MESSAGES_KEY);
  localStorage.removeItem(DEMO_INITIALIZED_KEY);
}

// ============ FILE CONVERSION ============

/**
 * Convert File to data URL (base64)
 * This allows storing the actual image data in localStorage
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compress image before storing (to save localStorage space)
 * Returns a compressed data URL
 */
export function compressImage(dataUrl: string, maxWidth: number = 1200): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Scale down if too large
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Return compressed JPEG
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
