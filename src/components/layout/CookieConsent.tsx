import { useState, useEffect } from 'react';
import { COOKIE_CONSENT_KEY, type CookieConsentValue } from '../../lib/gdpr';

/**
 * CookieConsent - A minimal GDPR cookie consent banner.
 *
 * Renders at the bottom of the page on first visit. Stores the user's choice
 * in localStorage so it only appears once.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!stored) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (e.g. SSR) - don't show
    }
  }, []);

  const handleChoice = (value: CookieConsentValue) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, value);
    } catch {
      // Silently fail if storage is full
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentement aux cookies"
      className="fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-t border-silver-mist shadow-lg px-4 py-4 sm:px-6"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <p className="text-sm text-deep-charcoal flex-1">
          Ce site utilise des cookies essentiels pour son fonctionnement (authentification, preferences).
          Aucun cookie publicitaire n'est utilise.{' '}
          <a href="/politique-confidentialite" className="underline text-burgundy-old hover:text-burgundy-old/80">
            Politique de confidentialite
          </a>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => handleChoice('rejected')}
            className="px-4 py-2 text-sm border border-silver-mist rounded-lg text-warm-taupe hover:bg-silver-mist/20 transition-colors"
          >
            Refuser
          </button>
          <button
            onClick={() => handleChoice('accepted')}
            className="px-4 py-2 text-sm bg-burgundy-old text-white rounded-lg hover:bg-burgundy-old/90 transition-colors"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
