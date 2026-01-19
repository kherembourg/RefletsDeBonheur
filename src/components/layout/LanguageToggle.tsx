import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { languages, type Language, defaultLang } from '../../i18n';

interface LanguageToggleProps {
  currentLang: Language;
  currentPath: string;
}

// Map of URL patterns between languages
const urlMappings: Record<string, Record<Language, string>> = {
  // Pricing page
  '/pricing': { en: '/pricing', fr: '/fr/tarification', es: '/es/precios' },
  '/fr/tarification': { en: '/pricing', fr: '/fr/tarification', es: '/es/precios' },
  '/es/precios': { en: '/pricing', fr: '/fr/tarification', es: '/es/precios' },
};

export function LanguageToggle({ currentLang, currentPath }: LanguageToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate URL for a different language
  const getUrlForLang = (targetLang: Language): string => {
    // Check for specific URL mappings first
    if (urlMappings[currentPath]) {
      return urlMappings[currentPath][targetLang];
    }

    let path = currentPath;

    // Remove current language prefix if exists (for non-default languages)
    const nonDefaultLangs = (Object.keys(languages) as Language[]).filter(l => l !== defaultLang);
    for (const lang of nonDefaultLangs) {
      if (path.startsWith(`/${lang}/`) || path === `/${lang}`) {
        path = path.slice(lang.length + 1) || '/';
        break;
      }
    }

    // Add new language prefix (except for default language which is English)
    if (targetLang !== defaultLang) {
      return `/${targetLang}${path === '/' ? '' : path}`;
    }

    return path || '/';
  };

  const languageOptions = Object.entries(languages).map(([code, name]) => ({
    code: code as Language,
    name,
    flag: getFlagEmoji(code as Language),
  }));

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-charcoal hover:text-[#ae1725] transition-colors rounded-lg hover:bg-gray-100"
        aria-label="Change language"
        aria-expanded={isOpen}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{languages[currentLang]}</span>
        <span className="sm:hidden">{currentLang.toUpperCase()}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
          {languageOptions.map(({ code, name, flag }) => (
            <a
              key={code}
              href={getUrlForLang(code)}
              className={`flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                code === currentLang ? 'text-[#ae1725] bg-gray-50' : 'text-charcoal'
              }`}
              onClick={() => setIsOpen(false)}
            >
              <span className="text-base">{flag}</span>
              <span className="flex-1">{name}</span>
              {code === currentLang && <Check className="w-4 h-4" />}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function getFlagEmoji(lang: Language): string {
  const flags: Record<Language, string> = {
    fr: '🇫🇷',
    en: '🇺🇸',
    es: '🇪🇸',
  };
  return flags[lang] || '🌐';
}
