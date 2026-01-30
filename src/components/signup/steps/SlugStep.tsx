import { useState, useEffect, useCallback } from 'react';
import { Link, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { AdminInput } from '../../admin/ui/AdminInput';
import { AdminButton } from '../../admin/ui/AdminButton';
import { t } from '../../../i18n/utils';
import type { Language } from '../../../i18n/translations';

export interface SlugData {
  slug: string;
}

interface SlugStepProps {
  data: SlugData;
  onChange: (data: SlugData) => void;
  onNext: () => void;
  onBack: () => void;
  partner1Name: string;
  partner2Name: string;
  lang: Language;
}

interface SlugCheckResult {
  available: boolean;
  reason?: 'invalid_format' | 'reserved' | 'taken';
  message?: string;
  suggestions?: string[];
}

// Generate slug from names
function generateSlug(name1: string, name2: string): string {
  const base = `${name1}-${name2}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base.slice(0, 30);
}

export function SlugStep({
  data,
  onChange,
  onNext,
  onBack,
  partner1Name,
  partner2Name,
  lang,
}: SlugStepProps) {
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<SlugCheckResult | null>(null);
  const [error, setError] = useState<string>('');

  // Generate initial slug from names if empty
  useEffect(() => {
    if (!data.slug && partner1Name && partner2Name) {
      const suggested = generateSlug(partner1Name, partner2Name);
      onChange({ slug: suggested });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Intentionally excluding data.slug and onChange to only run when partner names change
  }, [partner1Name, partner2Name]);

  // Debounced slug check
  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) {
      setCheckResult(null);
      return;
    }

    setChecking(true);
    try {
      const response = await fetch(`/api/weddings/check-slug?slug=${encodeURIComponent(slug)}`);
      const result: SlugCheckResult = await response.json();
      setCheckResult(result);
    } catch {
      setCheckResult({ available: false, message: 'Unable to check availability' });
    } finally {
      setChecking(false);
    }
  }, []);

  // Debounce effect
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (data.slug) {
        checkSlugAvailability(data.slug);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [data.slug, checkSlugAvailability]);

  const handleSlugChange = (value: string) => {
    // Normalize to lowercase and valid characters
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-/, '');

    onChange({ slug: normalized });
    setError('');
    setCheckResult(null);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange({ slug: suggestion });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!data.slug) {
      setError(t(lang, 'signup.errors.slugRequired'));
      return;
    }

    if (data.slug.length < 3) {
      setError(t(lang, 'signup.errors.slugTooShort'));
      return;
    }

    if (checkResult && !checkResult.available) {
      setError(checkResult.message || t(lang, 'signup.slug.taken'));
      return;
    }

    if (checking) {
      // Still checking, wait
      return;
    }

    onNext();
  };

  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : 'https://reflets-bonheur.fr';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-serif text-2xl text-charcoal mb-2">{t(lang, 'signup.slug.title')}</h2>
        <p className="text-charcoal/60 text-sm">{t(lang, 'signup.slug.subtitle')}</p>
      </div>

      <div className="space-y-2">
        <AdminInput
          label={t(lang, 'signup.slug.label')}
          type="text"
          placeholder={t(lang, 'signup.slug.placeholder')}
          value={data.slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          error={error}
          required
          leftIcon={<Link className="w-5 h-5" />}
          rightIcon={
            checking ? (
              <Loader2 className="w-5 h-5 animate-spin text-charcoal/40" />
            ) : checkResult?.available ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : checkResult && !checkResult.available ? (
              <XCircle className="w-5 h-5 text-red-500" />
            ) : null
          }
          size="lg"
        />

        {/* URL Preview */}
        <p className="text-sm text-charcoal/50 pl-1">
          {t(lang, 'signup.slug.preview')}{' '}
          <span className="font-medium text-charcoal">
            {baseUrl}/{data.slug || 'your-names'}
          </span>
        </p>

        {/* Availability status */}
        {checkResult && !checking && (
          <div
            className={`text-sm px-3 py-2 rounded ${
              checkResult.available
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {checkResult.available ? (
              t(lang, 'signup.slug.available')
            ) : (
              <>
                {checkResult.message}
                {checkResult.suggestions && checkResult.suggestions.length > 0 && (
                  <div className="mt-2">
                    <span className="font-medium">{t(lang, 'signup.slug.suggestions')} </span>
                    {checkResult.suggestions.map((suggestion, index) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="underline hover:no-underline mx-1"
                      >
                        {suggestion}
                        {index < checkResult.suggestions!.length - 1 && ','}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-cream/50 rounded-lg p-4 text-sm text-charcoal/70">
        <p className="font-medium text-charcoal mb-1">{t(lang, 'signup.slug.guidelines.title')}</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>{t(lang, 'signup.slug.guidelines.lowercase')}</li>
          <li>{t(lang, 'signup.slug.guidelines.length')}</li>
          <li>{t(lang, 'signup.slug.guidelines.auto')}</li>
        </ul>
      </div>

      <div className="flex gap-4 pt-4">
        <AdminButton
          type="button"
          variant="outline"
          size="lg"
          onClick={onBack}
          className="flex-1"
        >
          {t(lang, 'signup.navigation.back')}
        </AdminButton>
        <AdminButton
          type="submit"
          variant="primary"
          size="lg"
          className="flex-1"
          disabled={checking || (checkResult !== null && !checkResult.available)}
        >
          {checking ? t(lang, 'signup.navigation.checking') : t(lang, 'signup.navigation.continue')}
        </AdminButton>
      </div>
    </form>
  );
}
