const PIN_STORAGE_PREFIX = 'reflets_pin_';

export function extractAndSavePinFromUrl(slug: string): string | null {
  if (typeof window === 'undefined') return null;

  const url = new URL(window.location.href);
  const pin = url.searchParams.get('pin');

  if (pin) {
    localStorage.setItem(`${PIN_STORAGE_PREFIX}${slug}`, pin.toUpperCase().trim());

    // Clean PIN from URL to avoid bookmarking with credentials
    url.searchParams.delete('pin');
    window.history.replaceState({}, '', url.pathname + url.search);

    return pin.toUpperCase().trim();
  }

  return null;
}

export function getSavedPin(slug: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`${PIN_STORAGE_PREFIX}${slug}`);
}
