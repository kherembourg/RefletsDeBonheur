import { translations, defaultLang, languages, type Language } from './translations';

/**
 * Get the current language from the URL path
 * English is default (no prefix), French uses /fr/, Spanish uses /es/
 */
export function getLangFromUrl(url: URL): Language {
  const pathname = url.pathname;

  // Check for language prefixes
  if (pathname.startsWith('/fr/') || pathname === '/fr') {
    return 'fr';
  }
  if (pathname.startsWith('/es/') || pathname === '/es') {
    return 'es';
  }

  // Default to English (no prefix)
  return 'en';
}

/**
 * Get translations for a specific language
 */
export function useTranslations(lang: Language) {
  return translations[lang];
}

/**
 * Get a specific translation key with nested path support
 */
export function t(lang: Language, key: string): string {
  const keys = key.split('.');
  let value: any = translations[lang];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to default language
      value = translations[defaultLang];
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // Return key if not found
        }
      }
      break;
    }
  }

  return typeof value === 'string' ? value : key;
}

/**
 * Get the URL for a different language
 */
export function getLocalizedUrl(currentUrl: URL, targetLang: Language): string {
  const pathname = currentUrl.pathname;
  const currentLang = getLangFromUrl(currentUrl);

  // Remove current language prefix if exists
  let newPathname = pathname;
  if (currentLang !== defaultLang && pathname.startsWith(`/${currentLang}`)) {
    newPathname = pathname.slice(currentLang.length + 1) || '/';
  }

  // Add new language prefix (except for default language)
  if (targetLang !== defaultLang) {
    newPathname = `/${targetLang}${newPathname === '/' ? '' : newPathname}`;
  }

  return newPathname || '/';
}

/**
 * Get all available languages with their labels
 */
export function getLanguages() {
  return Object.entries(languages).map(([code, name]) => ({
    code: code as Language,
    name,
    isDefault: code === defaultLang,
  }));
}

/**
 * Check if a language is supported
 */
export function isValidLanguage(lang: string): lang is Language {
  return lang in languages;
}

/**
 * Get the HTML lang attribute value
 */
export function getHtmlLang(lang: Language): string {
  const langMap: Record<Language, string> = {
    fr: 'fr-FR',
    en: 'en-US',
    es: 'es-ES',
  };
  return langMap[lang] || lang;
}
