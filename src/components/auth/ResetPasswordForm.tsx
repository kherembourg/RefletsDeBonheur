import { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase/client';
import { getPasswordErrorKey } from '../../lib/passwordValidation';
import { t } from '../../i18n/utils';
import type { Language } from '../../i18n/translations';

interface ResetPasswordFormProps {
  lang?: Language;
}

export function ResetPasswordForm({ lang = 'fr' }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured()) {
      setError('La réinitialisation de mot de passe n’est pas disponible en mode démo.');
      return;
    }

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted && data.session) {
        setReady(true);
      }
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription?.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const passwordErrorKey = getPasswordErrorKey(password);
    if (passwordErrorKey) {
      setError(t(lang, passwordErrorKey));
      return;
    }

    if (password !== confirmPassword) {
      setError(t(lang, 'signup.errors.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        setError('La réinitialisation de mot de passe n’est pas disponible en mode démo.');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error('Password reset failed:', err);
      setError(t(lang, 'common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="font-serif text-3xl text-charcoal">Mot de passe mis à jour</h1>
        <p className="mt-3 text-sm leading-relaxed text-charcoal/65">
          Votre mot de passe a bien été défini. Vous pouvez maintenant vous connecter à votre espace client.
        </p>
        <a
          href="/connexion?mode=client"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-burgundy-old px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-burgundy-dark"
        >
          Aller à la connexion
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-charcoal/5 bg-white p-8 shadow-sm">
      <div className="text-center">
        <h1 className="font-serif text-3xl text-charcoal">Définissez votre nouveau mot de passe</h1>
        <p className="mt-3 text-sm leading-relaxed text-charcoal/65">
          Choisissez un mot de passe solide pour sécuriser l’accès à votre espace mariage.
        </p>
      </div>

      {!ready && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ouvrez cette page depuis le lien reçu par email pour finaliser votre mot de passe.
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal/70" htmlFor="new-password">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/35" />
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-charcoal/10 px-10 py-3 pr-12 text-sm text-charcoal outline-hidden transition-colors focus:border-burgundy-old"
              placeholder="Au moins 8 caractères"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/35"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal/70" htmlFor="confirm-password">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/35" />
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-charcoal/10 px-10 py-3 pr-12 text-sm text-charcoal outline-hidden transition-colors focus:border-burgundy-old"
              placeholder="Retapez votre mot de passe"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/35"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={!ready || loading}
          className="inline-flex w-full items-center justify-center rounded-lg bg-burgundy-old px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-burgundy-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Mise à jour…' : 'Mettre à jour mon mot de passe'}
        </button>
      </form>
    </div>
  );
}
