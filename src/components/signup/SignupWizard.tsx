import { useState, useEffect } from 'react';
import { StepIndicator, type Step } from './StepIndicator';
import { AccountStep, type AccountData } from './steps/AccountStep';
import { WeddingStep, type WeddingData } from './steps/WeddingStep';
import { SlugStep, type SlugData } from './steps/SlugStep';
import { ThemeStep, type ThemeData } from './steps/ThemeStep';
import { ValidationStep } from './steps/ValidationStep';
import type { ThemeId } from '../../lib/themes';
import { t } from '../../i18n/utils';
import type { Language } from '../../i18n/translations';

const STORAGE_KEY = 'signup_wizard_state';

interface WizardState {
  account: AccountData;
  wedding: WeddingData;
  slug: SlugData;
  theme: ThemeData;
}

const initialState: WizardState = {
  account: { email: '', password: '', confirmPassword: '' },
  wedding: { partner1Name: '', partner2Name: '', weddingDate: '' },
  slug: { slug: '' },
  theme: { themeId: 'classic' as ThemeId },
};

interface SignupWizardProps {
  lang?: Language;
}

export function SignupWizard({ lang = 'en' }: SignupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<WizardState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  // Create steps with translated labels
  const steps: Step[] = [
    { id: 1, label: t(lang, 'signup.steps.account') },
    { id: 2, label: t(lang, 'signup.steps.details') },
    { id: 3, label: t(lang, 'signup.steps.url') },
    { id: 4, label: t(lang, 'signup.steps.theme') },
    { id: 5, label: t(lang, 'signup.steps.validation') },
  ];

  // Load state from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setState(parsed.state || initialState);
        // Don't restore step - always start from beginning for security
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save state to sessionStorage on change (excluding sensitive password fields)
  useEffect(() => {
    try {
      // Create a safe copy without password fields
      const safeState: WizardState = {
        ...state,
        account: {
          email: state.account.email,
          password: '', // Never persist password
          confirmPassword: '', // Never persist confirmPassword
        },
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ state: safeState }));
    } catch {
      // Ignore storage errors
    }
  }, [state]);

  // Clear storage on successful signup
  const clearStorage = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const handleAccountChange = (data: AccountData) => {
    setState((prev) => ({ ...prev, account: data }));
    setApiErrors({});
  };

  const handleWeddingChange = (data: WeddingData) => {
    setState((prev) => ({ ...prev, wedding: data }));
  };

  const handleSlugChange = (data: SlugData) => {
    setState((prev) => ({ ...prev, slug: data }));
    setApiErrors({});
  };

  const handleThemeChange = (data: ThemeData) => {
    setState((prev) => ({ ...prev, theme: data }));
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    setError(null);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Step Indicator */}
      <StepIndicator steps={steps} currentStep={currentStep} className="mb-8" />

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm border border-charcoal/5 p-6 sm:p-8">
        {currentStep === 1 && (
          <AccountStep
            data={state.account}
            onChange={handleAccountChange}
            onNext={() => goToStep(2)}
            errors={apiErrors}
            lang={lang}
          />
        )}

        {currentStep === 2 && (
          <WeddingStep
            data={state.wedding}
            onChange={handleWeddingChange}
            onNext={() => goToStep(3)}
            onBack={() => goToStep(1)}
            lang={lang}
          />
        )}

        {currentStep === 3 && (
          <SlugStep
            data={state.slug}
            onChange={handleSlugChange}
            onNext={() => goToStep(4)}
            onBack={() => goToStep(2)}
            partner1Name={state.wedding.partner1Name}
            partner2Name={state.wedding.partner2Name}
            lang={lang}
          />
        )}

        {currentStep === 4 && (
          <ThemeStep
            data={state.theme}
            onChange={handleThemeChange}
            onNext={() => goToStep(5)}
            onBack={() => goToStep(3)}
            loading={false}
            lang={lang}
          />
        )}

        {currentStep === 5 && (
          <ValidationStep
            data={{
              ...state.account,
              ...state.wedding,
              ...state.slug,
              ...state.theme,
            }}
            onBack={() => goToStep(4)}
            onSuccess={clearStorage}
            lang={lang}
          />
        )}
      </div>

      {/* Features Info (only show before payment step) */}
      {currentStep < 5 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-charcoal/50">
            <span className="font-medium text-burgundy-old">{t(lang, 'signup.features.included')}</span>
            {' '}• {t(lang, 'signup.features.photos')} • {t(lang, 'signup.features.video')} • {t(lang, 'signup.features.support')}
          </p>
        </div>
      )}
    </div>
  );
}
