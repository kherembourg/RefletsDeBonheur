/**
 * God Admin Login Form
 * Handles username/password authentication for super admin
 */

import { useState, type FormEvent } from 'react';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { godLogin } from '../../lib/auth/godAuth';

interface GodLoginProps {
  onLoginSuccess: () => void;
}

export function GodLogin({ onLoginSuccess }: GodLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await godLogin(username, password);

      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-linear-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="bg-gray-800/80 backdrop-blur-xs p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700">
        {/* Icon */}
        <div className="w-20 h-20 bg-linear-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Shield className="text-white" size={40} strokeWidth={2} />
        </div>

        {/* Title */}
        <h1 className="font-serif text-3xl font-bold text-white text-center mb-2">
          God Admin
        </h1>
        <p className="text-gray-400 text-center mb-8">
          Accès restreint - Administration centrale
        </p>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="text-red-400 shrink-0" size={20} />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Nom d'utilisateur
            </label>
            <input
              id="username"
              type="text"
              placeholder="Entrez votre nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
              disabled={loading}
              required
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Entrez votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                disabled={loading}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Authentification...</span>
              </>
            ) : (
              <>
                <Shield size={20} />
                <span>Se connecter</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <p className="text-xs text-gray-500 text-center">
            Cette interface est réservée aux administrateurs autorisés.
            <br />
            Toutes les actions sont enregistrées.
          </p>
        </div>
      </div>
    </div>
  );
}
