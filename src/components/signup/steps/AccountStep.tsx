import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { AdminInput } from '../../admin/ui/AdminInput';
import { AdminButton } from '../../admin/ui/AdminButton';

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
}

export function AccountStep({ data, onChange, onNext, errors = {} }: AccountStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email) {
      newErrors.email = 'Email is required';
    } else if (!emailPattern.test(data.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!data.password) {
      newErrors.password = 'Password is required';
    } else if (data.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Confirm password
    if (!data.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (data.password !== data.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
        <h2 className="font-serif text-2xl text-charcoal mb-2">Create Your Account</h2>
        <p className="text-charcoal/60 text-sm">Start your 1-month free trial. No credit card required.</p>
      </div>

      <AdminInput
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        value={data.email}
        onChange={(e) => onChange({ ...data, email: e.target.value })}
        error={mergedErrors.email}
        required
        leftIcon={<Mail className="w-5 h-5" />}
        size="lg"
      />

      <AdminInput
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="At least 8 characters"
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
        label="Confirm Password"
        type={showConfirm ? 'text' : 'password'}
        placeholder="Re-enter your password"
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
          Continue
        </AdminButton>
      </div>

      <p className="text-center text-xs text-charcoal/50 mt-4">
        Already have an account?{' '}
        <a href="/connexion" className="text-burgundy-old hover:underline">
          Sign in
        </a>
      </p>
    </form>
  );
}
