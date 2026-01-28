import { useState, useEffect } from 'react';
import { StepIndicator, type Step } from './StepIndicator';
import { AccountStep, type AccountData } from './steps/AccountStep';
import { WeddingStep, type WeddingData } from './steps/WeddingStep';
import { SlugStep, type SlugData } from './steps/SlugStep';
import { ThemeStep, type ThemeData } from './steps/ThemeStep';
import type { ThemeId } from '../../lib/themes';

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

const steps: Step[] = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'URL' },
  { id: 4, label: 'Theme' },
];

interface SignupWizardProps {
  lang?: 'en' | 'fr' | 'es';
}

export function SignupWizard({ lang = 'en' }: SignupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<WizardState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

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

  // Save state to sessionStorage on change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ state }));
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

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setApiErrors({});

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.account.email,
          password: state.account.password,
          partner1_name: state.wedding.partner1Name,
          partner2_name: state.wedding.partner2Name,
          wedding_date: state.wedding.weddingDate || null,
          slug: state.slug.slug,
          theme_id: state.theme.themeId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle field-specific errors
        if (result.field) {
          setApiErrors({ [result.field]: result.message });

          // Navigate to the step with the error
          if (result.field === 'email' || result.field === 'password') {
            setCurrentStep(1);
          } else if (result.field === 'slug') {
            setCurrentStep(3);
          }
        } else {
          setError(result.message || 'An error occurred. Please try again.');
        }
        return;
      }

      // Success!
      clearStorage();

      // Store session if provided
      if (result.session) {
        // Store tokens for Supabase client
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          currentSession: {
            access_token: result.session.access_token,
            refresh_token: result.session.refresh_token,
            expires_at: result.session.expires_at,
          },
        }));
      }

      // Redirect to admin dashboard
      window.location.href = result.redirect || `/${state.slug.slug}/admin`;
    } catch (err) {
      console.error('Signup error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
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
          />
        )}

        {currentStep === 2 && (
          <WeddingStep
            data={state.wedding}
            onChange={handleWeddingChange}
            onNext={() => goToStep(3)}
            onBack={() => goToStep(1)}
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
          />
        )}

        {currentStep === 4 && (
          <ThemeStep
            data={state.theme}
            onChange={handleThemeChange}
            onNext={handleSubmit}
            onBack={() => goToStep(3)}
            loading={loading}
          />
        )}
      </div>

      {/* Trial Info */}
      <div className="mt-6 text-center">
        <p className="text-sm text-charcoal/50">
          <span className="font-medium text-burgundy-old">1-month free trial</span>
          {' '}• Up to 50 photos • 1 video • No credit card required
        </p>
      </div>
    </div>
  );
}
