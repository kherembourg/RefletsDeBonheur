import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { AdminInput } from '../../admin/ui/AdminInput';
import { AdminButton } from '../../admin/ui/AdminButton';
import { getPasswordError, getPasswordRequirementsMessage } from '../../../lib/passwordValidation';
import { t } from '../../../i18n/utils';
import type { Language } from '../../../i18n/translations';

export interface AccountData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface AccountStepProps {
  data: AccountData;
  onChange: (data: AccountData) => void;
  onNext: () => void;
  errors?: Record<string, string>;
  lang: Language;
}

export function AccountStep({ data, onChange, onNext, errors = {}, lang }: AccountStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email) {
      newErrors.email = t(lang, 'signup.errors.emailRequired');
    } else if (!emailPattern.test(data.email)) {
      newErrors.email = t(lang, 'signup.errors.emailInvalid');
    }

    // Password validation
    if (!data.password) {
      newErrors.password = t(lang, 'signup.errors.passwordRequired');
    } else {
      const passwordError = getPasswordError(data.password);
      if (passwordError) {
        // Use the actual validation error which is already descriptive
        newErrors.password = passwordError;
      }
    }

    // Confirm password
    if (!data.confirmPassword) {
      newErrors.confirmPassword = t(lang, 'signup.errors.confirmRequired');
    } else if (data.password !== data.confirmPassword) {
      newErrors.confirmPassword = t(lang, 'signup.errors.passwordMismatch');
    }

    setLocalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    }
  };

  const mergedErrors = { ...localErrors, ...errors };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-serif text-2xl text-charcoal mb-2">{t(lang, 'signup.account.title')}</h2>
        <p className="text-charcoal/60 text-sm">{t(lang, 'signup.account.subtitle')}</p>
      </div>

      <AdminInput
        label={t(lang, 'signup.account.email')}
        type="email"
        placeholder={t(lang, 'signup.account.emailPlaceholder')}
        value={data.email}
        onChange={(e) => onChange({ ...data, email: e.target.value })}
        error={mergedErrors.email}
        required
        leftIcon={<Mail className="w-5 h-5" />}
        size="lg"
      />

      <AdminInput
        label={t(lang, 'signup.account.password')}
        type={showPassword ? 'text' : 'password'}
        placeholder={t(lang, 'signup.account.passwordPlaceholder')}
        value={data.password}
        onChange={(e) => onChange({ ...data, password: e.target.value })}
        error={mergedErrors.password}
        required
        leftIcon={<Lock className="w-5 h-5" />}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="hover:text-charcoal/60 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        }
        size="lg"
      />

      <AdminInput
        label={t(lang, 'signup.account.confirmPassword')}
        type={showConfirm ? 'text' : 'password'}
        placeholder={t(lang, 'signup.account.confirmPlaceholder')}
        value={data.confirmPassword}
        onChange={(e) => onChange({ ...data, confirmPassword: e.target.value })}
        error={mergedErrors.confirmPassword}
        required
        leftIcon={<Lock className="w-5 h-5" />}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="hover:text-charcoal/60 transition-colors"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        }
        size="lg"
      />

      <div className="pt-4">
        <AdminButton type="submit" variant="primary" size="lg" fullWidth>
          {t(lang, 'signup.navigation.continue')}
        </AdminButton>
      </div>

      <p className="text-center text-xs text-charcoal/50 mt-4">
        {t(lang, 'signup.account.alreadyHaveAccount')}{' '}
        <a href="/connexion" className="text-burgundy-old hover:underline">
          {t(lang, 'signup.account.signIn')}
        </a>
      </p>
    </form>
  );
}
