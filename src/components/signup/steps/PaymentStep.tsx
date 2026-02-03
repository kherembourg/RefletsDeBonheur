import { CreditCard, Check } from 'lucide-react';
import { AdminButton } from '../../admin/ui/AdminButton';
import { themeList } from '../../../lib/themes';
import { cn } from '../../../styles/admin-theme';
import { t } from '../../../i18n/utils';
import type { Language } from '../../../i18n/translations';
import { useState } from 'react';
import type { AccountData } from './AccountStep';
import type { WeddingData } from './WeddingStep';
import type { SlugData } from './SlugStep';
import type { ThemeData } from './ThemeStep';

interface PaymentStepProps {
  data: AccountData & WeddingData & SlugData & ThemeData;
  onBack: () => void;
  lang: Language;
}

export function PaymentStep({ data, onBack, lang }: PaymentStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTheme = themeList.find(theme => theme.id === data.themeId);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/signup/create-checkout', {
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
        setError(result.message || t(lang, 'signup.payment.error'));
        setLoading(false);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = result.url;
    } catch (err) {
      console.error('[PaymentStep] Payment error:', err);
      setError(t(lang, 'signup.payment.error'));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handlePayment} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-serif text-2xl text-charcoal mb-2">
          {t(lang, 'signup.payment.title')}
        </h2>
        <p className="text-charcoal/60 text-sm">
          {t(lang, 'signup.payment.subtitle')}
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-cream/50 rounded-lg border border-charcoal/10 p-6 space-y-4">
        <h3 className="font-medium text-charcoal mb-4">
          {t(lang, 'signup.payment.summary')}
        </h3>

        {/* Wedding Info */}
        <div className="space-y-2 pb-4 border-b border-charcoal/10">
          <div className="flex justify-between items-center text-sm">
            <span className="text-charcoal/60">{t(lang, 'signup.payment.couple')}</span>
            <span className="text-charcoal font-medium">
              {data.partner1Name} & {data.partner2Name}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-charcoal/60">{t(lang, 'signup.payment.url')}</span>
            <span className="text-charcoal font-medium font-mono">
              /{data.slug}
            </span>
          </div>
          {selectedTheme && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-charcoal/60">{t(lang, 'signup.payment.theme')}</span>
              <span className="text-charcoal font-medium">{selectedTheme.name}</span>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-charcoal/60 text-sm">
              {t(lang, 'signup.payment.plan')}
            </span>
            <div className="text-right">
              <span className="text-charcoal/40 line-through text-sm mr-2">
                {t(lang, 'signup.payment.priceOriginal')}
              </span>
              <span className="text-burgundy-old font-bold text-lg">
                {t(lang, 'signup.payment.price')}
              </span>
            </div>
          </div>
          <div className="bg-sage/10 rounded-md px-3 py-2">
            <p className="text-sage text-sm font-medium">
              {t(lang, 'signup.payment.savings')}
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="pt-4 border-t border-charcoal/10">
          <p className="text-xs text-charcoal/60 mb-3">
            {t(lang, 'signup.payment.includes')}
          </p>
          <ul className="space-y-2">
            {['unlimited', 'storage', 'customization', 'support'].map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-sage flex-shrink-0 mt-0.5" />
                <span className="text-charcoal/80">
                  {t(lang, `signup.payment.features.${feature}`)}
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
        <CreditCard className="w-4 h-4" />
        <span>{t(lang, 'signup.payment.secure')}</span>
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
          {loading ? t(lang, 'signup.payment.processing') : t(lang, 'signup.payment.button')}
        </AdminButton>
      </div>
    </form>
  );
}
