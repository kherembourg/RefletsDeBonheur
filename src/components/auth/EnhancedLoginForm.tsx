/**
 * Enhanced Login Form
 * Supports both guest code access and client username/password login
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, User, Lock, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react';
import { authenticate } from '../../lib/auth';
import { clientLogin, guestLogin } from '../../lib/auth/clientAuth';

type LoginMode = 'code' | 'client';

export function EnhancedLoginForm() {
  const [mode, setMode] = useState<LoginMode>('code');

  // Code login state
  const [code, setCode] = useState('');
  const [guestName, setGuestName] = useState('');

  // Client login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Shared state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const hasUnsavedChanges = Boolean(code || guestName || username || password);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus();
    }
  }, [error]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paramMode = params.get('mode');
    if (paramMode === 'client' || paramMode === 'code') {
      setMode(paramMode);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('mode', mode);
    window.history.replaceState({}, '', url);
  }, [mode]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasUnsavedChanges || loading) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, loading]);

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First try the new Supabase-based guest login
      const result = await guestLogin(code.toUpperCase(), guestName || undefined);

      if (result.success && result.client) {
        // Redirect based on access type
        if (result.accessType === 'admin') {
          window.location.href = `/${result.client.wedding_slug}/admin`;
        } else {
          window.location.href = `/${result.client.wedding_slug}`;
        }
        return;
      }

      // Fallback to demo mode authentication
      const demoResult = authenticate(code.toUpperCase());
      if (demoResult.success) {
        window.location.href = '/demo_gallery';
        return;
      }

      setError(result.error || 'Code incorrect. Veuillez réessayer.');
    } catch (err) {
      console.error('Login error:', err);
      // Fallback to demo mode on error
      const demoResult = authenticate(code.toUpperCase());
      if (demoResult.success) {
        window.location.href = '/demo_gallery';
        return;
      }
      setError('Une erreur s\'est produite. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleClientSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await clientLogin(username, password);

      if (result.success && result.client) {
        // Redirect to client admin dashboard
        window.location.href = `/${result.client.wedding_slug}/admin`;
      } else {
        setError(result.error || 'Identifiants incorrects. Vérifiez votre email et votre mot de passe.');
      }
    } catch (err) {
      console.error('Client login error:', err);
      setError('Une erreur s\'est produite. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="bg-ivory p-8 rounded-2xl shadow-xl max-w-md w-full border border-silver-mist">
        {/* Icon */}
        <div className="w-20 h-20 bg-soft-blush rounded-full flex items-center justify-center mx-auto mb-6">
          <Camera className="text-burgundy-old" size={40} strokeWidth={2} aria-hidden="true" />
        </div>

        {/* Title */}
        <h1 className="font-serif text-3xl font-bold text-deep-charcoal text-center mb-2">
          Bienvenue
        </h1>
        <p className="text-warm-taupe text-center mb-6">
          Accédez à vos souvenirs de mariage
        </p>

        {/* Mode Tabs */}
        <div className="flex rounded-lg bg-soft-blush/30 p-1 mb-6" role="tablist" aria-label="Mode de connexion">
          <button
            type="button"
            onClick={() => setMode('code')}
            id="login-tab-code"
            role="tab"
            aria-selected={mode === 'code'}
            aria-controls="login-panel-code"
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors transition-shadow ${
              mode === 'code'
                ? 'bg-white text-deep-charcoal shadow-xs'
                : 'text-warm-taupe hover:text-deep-charcoal'
            }`}
          >
            Code invité
          </button>
          <button
            type="button"
            onClick={() => setMode('client')}
            id="login-tab-client"
            role="tab"
            aria-selected={mode === 'client'}
            aria-controls="login-panel-client"
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors transition-shadow ${
              mode === 'client'
                ? 'bg-white text-deep-charcoal shadow-xs'
                : 'text-warm-taupe hover:text-deep-charcoal'
            }`}
          >
            Espace client
          </button>
        </div>

        {/* Code Login Form */}
        {mode === 'code' && (
          <form
            onSubmit={handleCodeSubmit}
            className="space-y-4"
            role="tabpanel"
            id="login-panel-code"
            aria-labelledby="login-tab-code"
            aria-busy={loading}
          >
            <div>
              <label htmlFor="access-code" className="sr-only">Code d'accès</label>
              <input
                id="access-code"
                name="accessCode"
                type="text"
                placeholder="Ex. MARIAGE2026…"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-3 border-2 border-silver-mist rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-old focus-visible:border-burgundy-old transition-colors transition-shadow text-center text-lg tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal bg-pearl-white text-deep-charcoal"
                disabled={loading}
                required
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
                aria-describedby={error ? 'login-error' : undefined}
                aria-invalid={Boolean(error)}
              />
            </div>
            {error && (
              <div
                className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
                role="alert"
                aria-live="polite"
                aria-atomic="true"
                tabIndex={-1}
                ref={errorRef}
                id="login-error"
              >
                <AlertCircle className="text-red-500 shrink-0" size={18} aria-hidden="true" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="guest-name" className="sr-only">Votre prénom (optionnel)</label>
              <input
                id="guest-name"
                name="guestName"
                type="text"
                placeholder="Ex. Marie…"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-silver-mist rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-old focus-visible:border-burgundy-old transition-colors transition-shadow bg-pearl-white text-deep-charcoal"
                disabled={loading}
                autoComplete="off"
                inputMode="text"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin motion-reduce:animate-none h-5 w-5" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Vérification…</span>
                </>
              ) : (
                'Entrer'
              )}
            </button>

            {/* Demo Codes */}
            <div className="pt-4 border-t border-silver-mist/30">
              <p className="text-xs text-warm-taupe mb-2 text-center">Codes de démonstration :</p>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => setCode('MARIAGE2026')}
                  className="font-mono bg-soft-blush/50 hover:bg-soft-blush px-3 py-1 rounded-sm text-xs transition-colors"
                >
                  MARIAGE2026
                </button>
                <button
                  type="button"
                  onClick={() => setCode('ADMIN123')}
                  className="font-mono bg-soft-blush/50 hover:bg-soft-blush px-3 py-1 rounded-sm text-xs transition-colors"
                >
                  ADMIN123
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Client Login Form */}
        {mode === 'client' && (
          <form
            onSubmit={handleClientSubmit}
            className="space-y-4"
            role="tabpanel"
            id="login-panel-client"
            aria-labelledby="login-tab-client"
            aria-busy={loading}
          >
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-warm-taupe mb-1.5">
                Email
              </label>
              <div className="relative focus-within:ring-2 focus-within:ring-burgundy-old focus-within:rounded-lg">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-mist" size={18} aria-hidden="true" />
                <input
                  id="username"
                  name="username"
                  type="email"
                  placeholder="marie@example.com…"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-silver-mist rounded-lg focus-visible:outline-none focus-visible:border-burgundy-old transition-colors transition-shadow bg-pearl-white text-deep-charcoal"
                  disabled={loading}
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="email"
                  aria-describedby={error ? 'login-error' : undefined}
                  aria-invalid={Boolean(error)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-warm-taupe mb-1.5">
                Mot de passe
              </label>
              <div className="relative focus-within:ring-2 focus-within:ring-burgundy-old focus-within:rounded-lg">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-mist" size={18} aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••…"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border-2 border-silver-mist rounded-lg focus-visible:outline-none focus-visible:border-burgundy-old transition-colors transition-shadow bg-pearl-white text-deep-charcoal"
                  disabled={loading}
                  required
                  autoComplete="current-password"
                  aria-describedby={error ? 'login-error' : undefined}
                  aria-invalid={Boolean(error)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-silver-mist hover:text-warm-taupe transition-colors"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>
            {error && (
              <div
                className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
                role="alert"
                aria-live="polite"
                aria-atomic="true"
                tabIndex={-1}
                ref={errorRef}
                id="login-error"
              >
                <AlertCircle className="text-red-500 shrink-0" size={18} aria-hidden="true" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin motion-reduce:animate-none h-5 w-5" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Connexion…</span>
                </>
              ) : (
                'Se connecter'
              )}
            </button>

            {/* Info */}
            <div className="pt-4 border-t border-silver-mist/30">
              <div className="flex items-start gap-2 text-xs text-warm-taupe">
                <Sparkles className="shrink-0 mt-0.5" size={14} aria-hidden="true" />
                <p>
                  L'espace client est réservé aux mariés. Si vous êtes invité,
                  utilisez le code d'accès fourni par les mariés.
                </p>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
