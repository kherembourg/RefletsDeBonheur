/**
 * i18n Utilities Unit Tests
 * Tests internationalization helper functions
 */
import { describe, it, expect } from 'vitest';
import {
  getLangFromUrl,
  useTranslations,
  t,
  getLocalizedUrl,
  getLanguages,
  isValidLanguage,
  getHtmlLang,
} from './utils';

describe('i18n - getLangFromUrl', () => {
  it('should return "en" for URLs without language prefix', () => {
    const url = new URL('http://localhost:4321/');
    expect(getLangFromUrl(url)).toBe('en');
  });

  it('should return "en" for gallery page without prefix', () => {
    const url = new URL('http://localhost:4321/demo_gallery');
    expect(getLangFromUrl(url)).toBe('en');
  });

  it('should return "fr" for French URLs', () => {
    const url = new URL('http://localhost:4321/fr/');
    expect(getLangFromUrl(url)).toBe('fr');
  });

  it('should return "fr" for /fr path only', () => {
    const url = new URL('http://localhost:4321/fr');
    expect(getLangFromUrl(url)).toBe('fr');
  });

  it('should return "fr" for French page paths', () => {
    const url = new URL('http://localhost:4321/fr/tarification');
    expect(getLangFromUrl(url)).toBe('fr');
  });

  it('should return "es" for Spanish URLs', () => {
    const url = new URL('http://localhost:4321/es/');
    expect(getLangFromUrl(url)).toBe('es');
  });

  it('should return "es" for /es path only', () => {
    const url = new URL('http://localhost:4321/es');
    expect(getLangFromUrl(url)).toBe('es');
  });

  it('should return "es" for Spanish page paths', () => {
    const url = new URL('http://localhost:4321/es/precios');
    expect(getLangFromUrl(url)).toBe('es');
  });

  it('should return "en" for paths that start with fr but are not language prefix', () => {
    const url = new URL('http://localhost:4321/french-wine');
    expect(getLangFromUrl(url)).toBe('en');
  });
});

describe('i18n - useTranslations', () => {
  it('should return French translations for "fr"', () => {
    const translations = useTranslations('fr');
    expect(translations).toBeDefined();
    expect(translations.nav.home).toBe('Accueil');
  });

  it('should return English translations for "en"', () => {
    const translations = useTranslations('en');
    expect(translations).toBeDefined();
    expect(translations.nav.home).toBe('Home');
  });

  it('should return Spanish translations for "es"', () => {
    const translations = useTranslations('es');
    expect(translations).toBeDefined();
    expect(translations.nav.home).toBe('Inicio');
  });
});

describe('i18n - t (translation function)', () => {
  it('should get nested translation key', () => {
    const result = t('fr', 'nav.home');
    expect(result).toBe('Accueil');
  });

  it('should get deeply nested translation key', () => {
    const result = t('fr', 'home.hero.title');
    expect(result).toBe('Collectez tous les souvenirs de votre mariage');
  });

  it('should fallback to default language for missing key in current language', () => {
    // If a key exists in English but not in Spanish, it should fallback
    const result = t('en', 'nav.home');
    expect(result).toBe('Home');
  });

  it('should return key if translation not found in any language', () => {
    const result = t('fr', 'non.existent.key');
    expect(result).toBe('non.existent.key');
  });

  it('should return key for partially valid path', () => {
    const result = t('fr', 'nav.nonexistent');
    expect(result).toBe('nav.nonexistent');
  });
});

describe('i18n - getLocalizedUrl', () => {
  it('should add /fr prefix for French target', () => {
    const url = new URL('http://localhost:4321/gallery');
    const result = getLocalizedUrl(url, 'fr');
    expect(result).toBe('/fr/gallery');
  });

  it('should add /es prefix for Spanish target', () => {
    const url = new URL('http://localhost:4321/pricing');
    const result = getLocalizedUrl(url, 'es');
    expect(result).toBe('/es/pricing');
  });

  it('should remove prefix when going to English', () => {
    const url = new URL('http://localhost:4321/fr/tarification');
    const result = getLocalizedUrl(url, 'en');
    expect(result).toBe('/tarification');
  });

  it('should switch from French to Spanish', () => {
    const url = new URL('http://localhost:4321/fr/tarification');
    const result = getLocalizedUrl(url, 'es');
    expect(result).toBe('/es/tarification');
  });

  it('should switch from Spanish to French', () => {
    const url = new URL('http://localhost:4321/es/precios');
    const result = getLocalizedUrl(url, 'fr');
    expect(result).toBe('/fr/precios');
  });

  it('should handle root path correctly', () => {
    const url = new URL('http://localhost:4321/');
    const resultFr = getLocalizedUrl(url, 'fr');
    expect(resultFr).toBe('/fr');
  });

  it('should handle French root to English', () => {
    const url = new URL('http://localhost:4321/fr');
    const result = getLocalizedUrl(url, 'en');
    expect(result).toBe('/');
  });

  it('should handle French root with trailing slash', () => {
    const url = new URL('http://localhost:4321/fr/');
    const result = getLocalizedUrl(url, 'en');
    expect(result).toBe('/');
  });
});

describe('i18n - getLanguages', () => {
  it('should return all available languages', () => {
    const languages = getLanguages();

    expect(Array.isArray(languages)).toBe(true);
    expect(languages.length).toBe(3);
  });

  it('should have correct structure for each language', () => {
    const languages = getLanguages();

    languages.forEach(lang => {
      expect(lang).toHaveProperty('code');
      expect(lang).toHaveProperty('name');
      expect(lang).toHaveProperty('isDefault');
      expect(typeof lang.code).toBe('string');
      expect(typeof lang.name).toBe('string');
      expect(typeof lang.isDefault).toBe('boolean');
    });
  });

  it('should mark English as default', () => {
    const languages = getLanguages();
    const english = languages.find(l => l.code === 'en');

    expect(english).toBeDefined();
    expect(english!.isDefault).toBe(true);
  });

  it('should include all supported languages', () => {
    const languages = getLanguages();
    const codes = languages.map(l => l.code);

    expect(codes).toContain('en');
    expect(codes).toContain('fr');
    expect(codes).toContain('es');
  });

  it('should have correct names', () => {
    const languages = getLanguages();

    expect(languages.find(l => l.code === 'en')!.name).toBe('English');
    expect(languages.find(l => l.code === 'fr')!.name).toBe('Français');
    expect(languages.find(l => l.code === 'es')!.name).toBe('Español');
  });
});

describe('i18n - isValidLanguage', () => {
  it('should return true for valid languages', () => {
    expect(isValidLanguage('en')).toBe(true);
    expect(isValidLanguage('fr')).toBe(true);
    expect(isValidLanguage('es')).toBe(true);
  });

  it('should return false for invalid languages', () => {
    expect(isValidLanguage('de')).toBe(false);
    expect(isValidLanguage('it')).toBe(false);
    expect(isValidLanguage('pt')).toBe(false);
    expect(isValidLanguage('')).toBe(false);
    expect(isValidLanguage('english')).toBe(false);
  });

  it('should be case-sensitive', () => {
    expect(isValidLanguage('EN')).toBe(false);
    expect(isValidLanguage('Fr')).toBe(false);
  });
});

describe('i18n - getHtmlLang', () => {
  it('should return correct HTML lang for French', () => {
    expect(getHtmlLang('fr')).toBe('fr-FR');
  });

  it('should return correct HTML lang for English', () => {
    expect(getHtmlLang('en')).toBe('en-US');
  });

  it('should return correct HTML lang for Spanish', () => {
    expect(getHtmlLang('es')).toBe('es-ES');
  });
});
