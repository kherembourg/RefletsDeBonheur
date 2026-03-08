import { useState, useRef } from 'react';
import { Check, X, AlertCircle, Send, Heart } from 'lucide-react';
import type { AttendanceStatus, WeddingConfig } from '../../lib/types';
import { RSVPService } from '../../lib/rsvp/rsvpService';
import { t } from '../../i18n/utils';
import type { Language } from '../../i18n/translations';

const langToLocale: Record<Language, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
};

interface WeddingRSVPProps {
  weddingId: string;
  config: WeddingConfig;
  lang?: Language;
}

export function WeddingRSVP({ weddingId, config, lang = 'fr' }: WeddingRSVPProps) {
  const [name, setName] = useState('');
  const [attendance, setAttendance] = useState<AttendanceStatus | null>(null);
  const [mealPreference, setMealPreference] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const rsvpServiceRef = useRef<RSVPService | null>(null);
  if (!rsvpServiceRef.current) {
    rsvpServiceRef.current = new RSVPService({ weddingId });
  }

  const primaryColor = config.theme.primaryColor || '#ae1725';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t(lang, 'rsvp.nameRequired'));
      return;
    }

    if (!attendance) {
      setError(t(lang, 'rsvp.attendanceRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      await rsvpServiceRef.current!.submitResponse({
        weddingId,
        respondentName: name.trim(),
        attendance,
        guests: [],
        answers: [],
        message: [
          mealPreference ? `Meal: ${mealPreference}` : '',
          dietaryRestrictions ? `Dietary: ${dietaryRestrictions}` : '',
        ].filter(Boolean).join('; ') || undefined,
      });

      setIsSubmitted(true);
    } catch (err) {
      console.error('RSVP submission failed:', err);
      setError(t(lang, 'rsvp.submitError'));
    } finally {
      setIsSubmitting(false);
    }
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
          {t(lang, 'rsvp.thankYou')}
        </h3>
        <p className="text-charcoal/60">
          {attendance === 'yes'
            ? t(lang, 'rsvp.seeYouSoon')
            : t(lang, 'rsvp.sorryMissYou')}
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
        <p className="text-[10px] uppercase tracking-[0.35em] text-charcoal/40">{t(lang, 'rsvp.weddingInvitation')}</p>
        <h2 className="font-serif text-3xl text-charcoal mt-3">{t(lang, 'rsvp.title')}</h2>
        <p className="text-sm text-charcoal/50 italic mt-1">
          {config.brideName} & {config.groomName}
        </p>
      </div>

      {/* Guest Name */}
      <div>
        <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-widest mb-2">
          {t(lang, 'rsvp.guestName')}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t(lang, 'rsvp.guestNamePlaceholder')}
          className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white text-charcoal/70 focus:outline-none focus:ring-2 focus:ring-[#b08b8b]/30"
          required
        />
      </div>

      {/* Attendance */}
      <div>
        <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-widest mb-2">
          {t(lang, 'rsvp.willYouAttend')}
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
            {t(lang, 'rsvp.accepts')}
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
            {t(lang, 'rsvp.declines')}
          </button>
        </div>
      </div>

      {/* Meal Preference */}
      <div>
        <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-widest mb-2">
          {t(lang, 'rsvp.mealPreference')}
        </label>
        <select
          value={mealPreference}
          onChange={(e) => setMealPreference(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white text-sm text-charcoal/70 focus:outline-none focus:ring-2 focus:ring-[#b08b8b]/30"
        >
          <option value="">{t(lang, 'rsvp.mealPlaceholder')}</option>
          <option value="chicken">{t(lang, 'rsvp.mealChicken')}</option>
          <option value="fish">{t(lang, 'rsvp.mealFish')}</option>
          <option value="vegetarian">{t(lang, 'rsvp.mealVegetarian')}</option>
        </select>
      </div>

      {/* Dietary restrictions */}
      {config.askDietaryRestrictions && (
        <div>
          <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-widest mb-2">
            {t(lang, 'rsvp.dietaryRestrictions')}
          </label>
          <textarea
            value={dietaryRestrictions}
            onChange={(e) => setDietaryRestrictions(e.target.value)}
            placeholder={t(lang, 'rsvp.dietaryPlaceholder')}
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
            <span>{t(lang, 'rsvp.submitting')}</span>
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            <span>{t(lang, 'rsvp.confirmRsvp')}</span>
          </>
        )}
      </button>

      {config.rsvpDeadline && (
        <p className="text-center text-xs text-charcoal/40">
          {t(lang, 'rsvp.respondBy')}{' '}
          <span className="font-medium">
            {new Date(config.rsvpDeadline).toLocaleDateString(langToLocale[lang] || 'fr-FR', {
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
