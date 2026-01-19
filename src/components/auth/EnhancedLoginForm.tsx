/**
 * Enhanced Login Form
 * Supports both guest code access and client username/password login
 */

import { useState, type FormEvent } from 'react';
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
        setError(result.error || 'Identifiants incorrects.');
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
          <Camera className="text-[#ae1725]" size={40} strokeWidth={2} />
        </div>

        {/* Title */}
        <h1 className="font-serif text-3xl font-bold text-deep-charcoal text-center mb-2">
          Bienvenue
        </h1>
        <p className="text-warm-taupe text-center mb-6">
          Accédez à vos souvenirs de mariage
        </p>

        {/* Mode Tabs */}
        <div className="flex rounded-lg bg-soft-blush/30 p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode('code')}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
              mode === 'code'
                ? 'bg-white text-deep-charcoal shadow-sm'
                : 'text-warm-taupe hover:text-deep-charcoal'
            }`}
          >
            Code invité
          </button>
          <button
            type="button"
            onClick={() => setMode('client')}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
              mode === 'client'
                ? 'bg-white text-deep-charcoal shadow-sm'
                : 'text-warm-taupe hover:text-deep-charcoal'
            }`}
          >
            Espace client
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Code Login Form */}
        {mode === 'code' && (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Code d'accès"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-3 border-2 border-silver-mist rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ae1725] focus:border-[#ae1725] transition-all text-center text-lg tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal bg-pearl-white"
                disabled={loading}
                required
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Votre prénom (optionnel)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-silver-mist rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ae1725] focus:border-[#ae1725] transition-all bg-pearl-white"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Vérification...</span>
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
                  className="font-mono bg-soft-blush/50 hover:bg-soft-blush px-3 py-1 rounded text-xs transition-colors"
                >
                  MARIAGE2026
                </button>
                <button
                  type="button"
                  onClick={() => setCode('ADMIN123')}
                  className="font-mono bg-soft-blush/50 hover:bg-soft-blush px-3 py-1 rounded text-xs transition-colors"
                >
                  ADMIN123
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Client Login Form */}
        {mode === 'client' && (
          <form onSubmit={handleClientSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-warm-taupe mb-1.5">
                Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-mist" size={18} />
                <input
                  id="username"
                  type="email"
                  placeholder="marie@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-silver-mist rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ae1725] focus:border-[#ae1725] transition-all bg-pearl-white"
                  disabled={loading}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-warm-taupe mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-mist" size={18} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border-2 border-silver-mist rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ae1725] focus:border-[#ae1725] transition-all bg-pearl-white"
                  disabled={loading}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-silver-mist hover:text-warm-taupe transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Connexion...</span>
                </>
              ) : (
                'Se connecter'
              )}
            </button>

            {/* Info */}
            <div className="pt-4 border-t border-silver-mist/30">
              <div className="flex items-start gap-2 text-xs text-warm-taupe">
                <Sparkles className="flex-shrink-0 mt-0.5" size={14} />
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
