import { useState } from 'react';
import { Check, X, HelpCircle, User, Mail, Users, AlertCircle, Send } from 'lucide-react';
import type { AttendanceStatus, WeddingConfig } from '../../lib/types';

interface WeddingRSVPProps {
  weddingId: string;
  config: WeddingConfig;
}

export function WeddingRSVP({ weddingId, config }: WeddingRSVPProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [attendance, setAttendance] = useState<AttendanceStatus | null>(null);
  const [plusOne, setPlusOne] = useState(false);
  const [plusOneName, setPlusOneName] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const primaryColor = config.theme.primaryColor || '#ae1725';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Veuillez entrer votre nom');
      return;
    }

    if (!attendance) {
      setError('Veuillez indiquer si vous serez présent');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call (replace with actual Supabase call)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In production:
    // await supabase.from('guests_rsvp').insert({
    //   wedding_id: weddingId,
    //   name,
    //   email,
    //   attendance,
    //   plus_one: plusOne,
    //   plus_one_name: plusOneName,
    //   dietary_restrictions: dietaryRestrictions,
    //   message,
    // });

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          <Check className="w-10 h-10" style={{ color: primaryColor }} />
        </div>
        <h3 className="text-2xl font-display font-bold text-deep-charcoal dark:text-ivory mb-4">
          Merci pour votre réponse !
        </h3>
        <p className="text-warm-taupe dark:text-silver-mist">
          {attendance === 'yes'
            ? 'Nous avons hâte de vous voir !'
            : attendance === 'no'
            ? 'Nous sommes désolés que vous ne puissiez pas être présent. Vous serez dans nos pensées.'
            : 'Nous attendons votre confirmation définitive.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
      {/* Welcome message */}
      {config.rsvpMessage && (
        <div
          className="p-4 rounded-lg text-sm"
          style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
        >
          {config.rsvpMessage}
        </div>
      )}

      {/* Attendance selection */}
      <div>
        <label className="block text-sm font-medium text-deep-charcoal dark:text-ivory mb-3">
          Serez-vous présent(e) ? *
        </label>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setAttendance('yes')}
            className={`p-4 rounded-xl border-2 transition-all ${
              attendance === 'yes'
                ? 'border-green-500 bg-green-50 dark:bg-green-500/10'
                : 'border-silver-mist/30 hover:border-silver-mist'
            }`}
          >
            <Check
              className={`w-6 h-6 mx-auto mb-2 ${
                attendance === 'yes' ? 'text-green-500' : 'text-silver-mist'
              }`}
            />
            <span className={`text-sm font-medium ${attendance === 'yes' ? 'text-green-600' : ''}`}>
              Oui
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAttendance('no')}
            className={`p-4 rounded-xl border-2 transition-all ${
              attendance === 'no'
                ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                : 'border-silver-mist/30 hover:border-silver-mist'
            }`}
          >
            <X
              className={`w-6 h-6 mx-auto mb-2 ${
                attendance === 'no' ? 'text-red-500' : 'text-silver-mist'
              }`}
            />
            <span className={`text-sm font-medium ${attendance === 'no' ? 'text-red-600' : ''}`}>
              Non
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAttendance('maybe')}
            className={`p-4 rounded-xl border-2 transition-all ${
              attendance === 'maybe'
                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10'
                : 'border-silver-mist/30 hover:border-silver-mist'
            }`}
          >
            <HelpCircle
              className={`w-6 h-6 mx-auto mb-2 ${
                attendance === 'maybe' ? 'text-yellow-500' : 'text-silver-mist'
              }`}
            />
            <span className={`text-sm font-medium ${attendance === 'maybe' ? 'text-yellow-600' : ''}`}>
              Peut-être
            </span>
          </button>
        </div>
      </div>

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-deep-charcoal dark:text-ivory mb-2">
          Votre nom *
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-warm-taupe" />
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Prénom Nom"
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-silver-mist/30 focus:border-burgundy-old focus:ring-2 focus:ring-burgundy-old/20 outline-hidden transition-all bg-white dark:bg-deep-charcoal/50"
            required
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-deep-charcoal dark:text-ivory mb-2">
          Votre email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-warm-taupe" />
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-silver-mist/30 focus:border-burgundy-old focus:ring-2 focus:ring-burgundy-old/20 outline-hidden transition-all bg-white dark:bg-deep-charcoal/50"
          />
        </div>
      </div>

      {/* Plus One */}
      {config.allowPlusOne && attendance === 'yes' && (
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={plusOne}
              onChange={(e) => setPlusOne(e.target.checked)}
              className="w-5 h-5 rounded-sm border-silver-mist/30 text-burgundy-old focus:ring-burgundy-old/20"
            />
            <span className="text-sm font-medium text-deep-charcoal dark:text-ivory">
              Je viendrai accompagné(e)
            </span>
          </label>

          {plusOne && (
            <div className="mt-3">
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-warm-taupe" />
                <input
                  type="text"
                  value={plusOneName}
                  onChange={(e) => setPlusOneName(e.target.value)}
                  placeholder="Nom de votre accompagnant(e)"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-silver-mist/30 focus:border-burgundy-old focus:ring-2 focus:ring-burgundy-old/20 outline-hidden transition-all bg-white dark:bg-deep-charcoal/50"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dietary restrictions */}
      {config.askDietaryRestrictions && attendance === 'yes' && (
        <div>
          <label htmlFor="dietary" className="block text-sm font-medium text-deep-charcoal dark:text-ivory mb-2">
            Restrictions alimentaires
          </label>
          <input
            type="text"
            id="dietary"
            value={dietaryRestrictions}
            onChange={(e) => setDietaryRestrictions(e.target.value)}
            placeholder="Végétarien, sans gluten, allergies..."
            className="w-full px-4 py-3 rounded-lg border border-silver-mist/30 focus:border-burgundy-old focus:ring-2 focus:ring-burgundy-old/20 outline-hidden transition-all bg-white dark:bg-deep-charcoal/50"
          />
        </div>
      )}

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-deep-charcoal dark:text-ivory mb-2">
          Un petit mot pour les mariés
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Votre message..."
          rows={3}
          className="w-full px-4 py-3 rounded-lg border border-silver-mist/30 focus:border-burgundy-old focus:ring-2 focus:ring-burgundy-old/20 outline-hidden transition-all bg-white dark:bg-deep-charcoal/50 resize-none"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg text-white font-semibold transition-all hover:opacity-90 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: primaryColor }}
      >
        {isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Envoi en cours...</span>
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            <span>Envoyer ma réponse</span>
          </>
        )}
      </button>

      {/* Deadline reminder */}
      {config.rsvpDeadline && (
        <p className="text-center text-sm text-warm-taupe dark:text-silver-mist">
          Merci de répondre avant le{' '}
          <span className="font-medium">
            {new Date(config.rsvpDeadline).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </p>
      )}
    </form>
  );
}
