import { useState, type FormEvent } from 'react';
import { Camera } from 'lucide-react';
import { authenticate } from '../../lib/auth';

export function LoginForm() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const result = authenticate(code.toUpperCase());

    if (result.success) {
      // Redirect to gallery
      window.location.href = '/gallery';
    } else {
      setError('Code incorrect. Veuillez réessayer.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="bg-ivory p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-silver-mist">
        {/* Icon */}
        <div className="w-20 h-20 bg-soft-blush rounded-full flex items-center justify-center mx-auto mb-6">
          <Camera className="text-burgundy-old" size={40} strokeWidth={2} />
        </div>

        {/* Title */}
        <h1 className="font-serif text-3xl font-bold text-deep-charcoal mb-2">
          Bienvenue
        </h1>
        <p className="text-warm-taupe mb-8">
          Entrez le code invité pour accéder aux souvenirs.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Code d'accès"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-3 border-2 border-silver-mist rounded-lg focus:outline-hidden focus:ring-2 focus:ring-burgundy-old focus:border-burgundy-old transition-all text-center text-lg tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal bg-pearl-white"
              disabled={loading}
              required
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
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
        </form>

        {/* Demo Codes */}
        <div className="mt-6 pt-6 border-t border-silver-mist/30">
          <p className="text-xs text-warm-taupe mb-2">Codes de démonstration :</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setCode('MARIAGE2026')}
              className="font-mono bg-soft-blush/50 hover:bg-soft-blush px-3 py-1 rounded-sm text-xs transition-colors"
            >
              MARIAGE2026
            </button>
            <button
              onClick={() => setCode('ADMIN123')}
              className="font-mono bg-soft-blush/50 hover:bg-soft-blush px-3 py-1 rounded-sm text-xs transition-colors"
            >
              ADMIN123
            </button>
          </div>
          <p className="text-xs text-silver-mist mt-2">
            (Invité / Admin)
          </p>
        </div>
      </div>
    </div>
  );
}
