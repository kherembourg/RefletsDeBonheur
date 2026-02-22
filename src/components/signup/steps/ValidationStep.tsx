import { Check, Shield, Sparkles } from 'lucide-react';
import { AdminButton } from '../../admin/ui/AdminButton';
import { themeList } from '../../../lib/themes';
import { t } from '../../../i18n/utils';
import type { Language } from '../../../i18n/translations';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase/client';
import type { AccountData } from './AccountStep';
import type { WeddingData } from './WeddingStep';
import type { SlugData } from './SlugStep';
import type { ThemeData } from './ThemeStep';

interface ValidationStepProps {
  data: AccountData & WeddingData & SlugData & ThemeData;
  onBack: () => void;
  onSuccess?: () => void;
  lang: Language;
}

export function ValidationStep({ data, onBack, onSuccess, lang }: ValidationStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTheme = themeList.find(theme => theme.id === data.themeId);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/signup/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          partner1_name: data.partner1Name,
          partner2_name: data.partner2Name,
          wedding_date: data.weddingDate,
          slug: data.slug,
          theme_id: data.themeId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || t(lang, 'signup.validation.error'));
        setLoading(false);
        return;
      }

      // Auto-login with the password the user just set
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      // Clear wizard storage before redirect
      onSuccess?.();

      if (signInError) {
        console.error('[ValidationStep] Auto-login failed:', signInError);
        // Account created but auto-login failed — redirect to login page
        window.location.href = `/connexion?email=${encodeURIComponent(data.email)}&message=account_created`;
        return;
      }

      // Redirect to wedding admin dashboard
      window.location.href = `/${result.slug}/admin`;
    } catch (err) {
      console.error('[ValidationStep] Account creation error:', err);
      setError(t(lang, 'signup.validation.error'));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreateAccount} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-serif text-2xl text-charcoal mb-2">
          {t(lang, 'signup.validation.title')}
        </h2>
        <p className="text-charcoal/60 text-sm">
          {t(lang, 'signup.validation.subtitle')}
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-cream/50 rounded-lg border border-charcoal/10 p-6 space-y-4">
        <h3 className="font-medium text-charcoal mb-4">
          {t(lang, 'signup.validation.summary')}
        </h3>

        {/* Wedding Info */}
        <div className="space-y-2 pb-4 border-b border-charcoal/10">
          <div className="flex justify-between items-center text-sm">
            <span className="text-charcoal/60">{t(lang, 'signup.validation.couple')}</span>
            <span className="text-charcoal font-medium">
              {data.partner1Name} & {data.partner2Name}
            </span>
          </div>
          {data.weddingDate && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-charcoal/60">{t(lang, 'signup.validation.date')}</span>
              <span className="text-charcoal font-medium">
                {new Date(data.weddingDate).toLocaleDateString(
                  lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'en-US',
                  { year: 'numeric', month: 'long', day: 'numeric' }
                )}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm">
            <span className="text-charcoal/60">{t(lang, 'signup.validation.url')}</span>
            <span className="text-charcoal font-medium font-mono">
              /{data.slug}
            </span>
          </div>
          {selectedTheme && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-charcoal/60">{t(lang, 'signup.validation.theme')}</span>
              <span className="text-charcoal font-medium">{selectedTheme.name}</span>
            </div>
          )}
        </div>

        {/* Free Trial Badge */}
        <div className="bg-sage/10 rounded-md px-4 py-3 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-sage flex-shrink-0" />
          <div>
            <p className="text-sage font-medium text-sm">
              {t(lang, 'signup.validation.freeTrial')}
            </p>
            <p className="text-sage/70 text-xs mt-0.5">
              {t(lang, 'signup.validation.freeTrialDetail')}
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="pt-4 border-t border-charcoal/10">
          <p className="text-xs text-charcoal/60 mb-3">
            {t(lang, 'signup.validation.includes')}
          </p>
          <ul className="space-y-2">
            {['gallery', 'guestbook', 'website', 'pwa'].map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-sage flex-shrink-0 mt-0.5" />
                <span className="text-charcoal/80">
                  {t(lang, `signup.validation.features.${feature}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-charcoal/50">
        <Shield className="w-4 h-4" />
        <span>{t(lang, 'signup.validation.noCreditCard')}</span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4">
        <AdminButton
          type="button"
          variant="outline"
          size="lg"
          onClick={onBack}
          className="flex-1"
          disabled={loading}
        >
          {t(lang, 'signup.navigation.back')}
        </AdminButton>
        <AdminButton
          type="submit"
          variant="primary"
          size="lg"
          className="flex-1"
          loading={loading}
        >
          {loading ? t(lang, 'signup.validation.creating') : t(lang, 'signup.validation.createButton')}
        </AdminButton>
      </div>
    </form>
  );
}
