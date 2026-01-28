import { useState } from 'react';
import { Check, X, AlertCircle, Send, Heart } from 'lucide-react';
import type { AttendanceStatus, WeddingConfig } from '../../lib/types';

interface WeddingRSVPProps {
  weddingId: string;
  config: WeddingConfig;
}

export function WeddingRSVP({ weddingId, config }: WeddingRSVPProps) {
  const [name, setName] = useState('');
  const [attendance, setAttendance] = useState<AttendanceStatus | null>(null);
  const [mealPreference, setMealPreference] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
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
    //   attendance,
    //   meal_preference: mealPreference,
    //   dietary_restrictions: dietaryRestrictions,
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
        <h3 className="text-2xl font-serif text-charcoal mb-4">
          Merci pour votre réponse !
        </h3>
        <p className="text-charcoal/60">
          {attendance === 'yes'
            ? 'Nous avons hâte de vous voir !'
            : 'Nous sommes désolés que vous ne puissiez pas être présent. Vous serez dans nos pensées.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center mb-2 text-[#b08b8b]">
          <Heart className="w-5 h-5" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.35em] text-charcoal/40">Wedding Invitation</p>
        <h2 className="font-serif text-3xl text-charcoal mt-3">RSVP</h2>
        <p className="text-sm text-charcoal/50 italic mt-1">
          {config.brideName} & {config.groomName}
        </p>
      </div>

      {/* Guest Name */}
      <div>
        <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-widest mb-2">
          Guest name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
          className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white text-charcoal/70 focus:outline-none focus:ring-2 focus:ring-[#b08b8b]/30"
          required
        />
      </div>

      {/* Attendance */}
      <div>
        <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-widest mb-2">
          Will you attend?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAttendance('yes')}
            className={`px-4 py-3 rounded-xl border transition-all text-sm font-medium flex items-center justify-center gap-2 ${
              attendance === 'yes'
                ? 'border-[#b08b8b] bg-[#b08b8b]/10 text-charcoal'
                : 'border-charcoal/10 text-charcoal/50 hover:border-charcoal/30'
            }`}
          >
            <Check className="w-4 h-4" />
            Joyfully Accepts
          </button>
          <button
            type="button"
            onClick={() => setAttendance('no')}
            className={`px-4 py-3 rounded-xl border transition-all text-sm font-medium flex items-center justify-center gap-2 ${
              attendance === 'no'
                ? 'border-[#b08b8b] bg-[#b08b8b]/10 text-charcoal'
                : 'border-charcoal/10 text-charcoal/50 hover:border-charcoal/30'
            }`}
          >
            <X className="w-4 h-4" />
            Regretfully Declines
          </button>
        </div>
      </div>

      {/* Meal Preference */}
      <div>
        <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-widest mb-2">
          Meal preference
        </label>
        <select
          value={mealPreference}
          onChange={(e) => setMealPreference(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white text-sm text-charcoal/70 focus:outline-none focus:ring-2 focus:ring-[#b08b8b]/30"
        >
          <option value="">Please select an option...</option>
          <option value="chicken">Chicken</option>
          <option value="fish">Fish</option>
          <option value="vegetarian">Vegetarian</option>
        </select>
      </div>

      {/* Dietary restrictions */}
      {config.askDietaryRestrictions && (
        <div>
          <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-widest mb-2">
            Any dietary restrictions?
          </label>
          <textarea
            value={dietaryRestrictions}
            onChange={(e) => setDietaryRestrictions(e.target.value)}
            placeholder="Allergies, intolerances, etc."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white text-sm text-charcoal/70 focus:outline-none focus:ring-2 focus:ring-[#b08b8b]/30 resize-none"
          />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-full text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: '#b08b8b' }}
      >
        {isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Envoi en cours...</span>
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            <span>Confirm RSVP</span>
          </>
        )}
      </button>

      {config.rsvpDeadline && (
        <p className="text-center text-xs text-charcoal/40">
          Please respond by{' '}
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
