import type { Language } from '../../i18n/translations';
import { languages } from '../../i18n/translations';

const supportedLanguages = Object.keys(languages) as Language[];

/**
 * Detect user language from the Accept-Language HTTP header.
 * Falls back to 'fr' (default for this French product).
 */
export function detectLanguageFromRequest(request: Request): Language {
  const acceptLanguage = request.headers.get('accept-language') || '';

  // Parse Accept-Language header (e.g., "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7")
  const parsedLanguages = acceptLanguage
    .split(',')
    .map((entry) => {
      const [lang, quality] = entry.trim().split(';q=');
      return {
        lang: lang.trim().split('-')[0].toLowerCase(), // "fr-FR" → "fr"
        q: quality ? parseFloat(quality) : 1.0,
      };
    })
    .sort((a, b) => b.q - a.q);

  // Find first supported language
  for (const { lang } of parsedLanguages) {
    if (supportedLanguages.includes(lang as Language)) {
      return lang as Language;
    }
  }

  // Default to French
  return 'fr';
}
