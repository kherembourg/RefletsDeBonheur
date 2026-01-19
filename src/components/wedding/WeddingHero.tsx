import { useEffect, useState } from 'react';
import { MapPin, Calendar, Clock } from 'lucide-react';
import type { WeddingConfig } from '../../lib/types';

interface WeddingHeroProps {
  config: WeddingConfig;
}

// Floral decoration SVG component
function FloralCorner({ className = '', flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`${className} ${flip ? 'scale-x-[-1]' : ''}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity="0.6">
        {/* Main floral branch */}
        <path
          d="M10 190 Q50 150 80 120 Q100 100 120 90 Q140 80 160 75"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        {/* Leaves */}
        <path
          d="M40 160 Q55 145 50 130 Q45 145 40 160"
          fill="currentColor"
          opacity="0.4"
        />
        <path
          d="M70 130 Q90 110 82 95 Q75 110 70 130"
          fill="currentColor"
          opacity="0.4"
        />
        <path
          d="M100 105 Q120 85 110 70 Q100 85 100 105"
          fill="currentColor"
          opacity="0.4"
        />
        {/* Flowers */}
        <circle cx="55" cy="145" r="6" fill="currentColor" opacity="0.3" />
        <circle cx="85" cy="115" r="8" fill="currentColor" opacity="0.3" />
        <circle cx="115" cy="90" r="7" fill="currentColor" opacity="0.3" />
        <circle cx="145" cy="78" r="5" fill="currentColor" opacity="0.3" />
        {/* Small buds */}
        <circle cx="35" cy="170" r="3" fill="currentColor" opacity="0.5" />
        <circle cx="130" cy="82" r="4" fill="currentColor" opacity="0.4" />
        <circle cx="160" cy="72" r="3" fill="currentColor" opacity="0.3" />
      </g>
    </svg>
  );
}

// Small floral divider
function FloralDivider({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 80 30" className="w-16 h-6" fill="none">
      <path
        d="M10 15 Q20 5 30 15 Q40 25 50 15 Q60 5 70 15"
        stroke={color}
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
      <circle cx="40" cy="15" r="4" fill={color} opacity="0.3" />
      <circle cx="25" cy="10" r="2" fill={color} opacity="0.3" />
      <circle cx="55" cy="10" r="2" fill={color} opacity="0.3" />
    </svg>
  );
}

export function WeddingHero({ config }: WeddingHeroProps) {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    const weddingDate = new Date(config.weddingDate);
    const today = new Date();
    const diffTime = weddingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDaysLeft(diffDays);
  }, [config.weddingDate]);

  const weddingDate = new Date(config.weddingDate);
  const formattedDate = weddingDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const primaryColor = config.theme.primaryColor || '#ae1725';
  const hasHeroImage = !!config.theme.heroImage;

  return (
    <section
      className="relative min-h-[85vh] flex items-center justify-center text-center px-4 overflow-hidden"
      style={{
        background: hasHeroImage
          ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.45)), url(${config.theme.heroImage}) center/cover`
          : `linear-gradient(180deg, #FFFBF7 0%, #FFF8F0 50%, #FFFBF7 100%)`,
      }}
    >
      {/* Floral corner decorations */}
      <div
        className={`absolute top-0 left-0 w-40 h-40 sm:w-56 sm:h-56 -translate-x-1/4 -translate-y-1/4 ${
          hasHeroImage ? 'text-white/40' : ''
        }`}
        style={{ color: hasHeroImage ? undefined : primaryColor }}
      >
        <FloralCorner className="w-full h-full" />
      </div>
      <div
        className={`absolute top-0 right-0 w-40 h-40 sm:w-56 sm:h-56 translate-x-1/4 -translate-y-1/4 ${
          hasHeroImage ? 'text-white/40' : ''
        }`}
        style={{ color: hasHeroImage ? undefined : primaryColor }}
      >
        <FloralCorner className="w-full h-full" flip />
      </div>
      <div
        className={`absolute bottom-0 left-0 w-40 h-40 sm:w-56 sm:h-56 -translate-x-1/4 translate-y-1/4 rotate-180 ${
          hasHeroImage ? 'text-white/40' : ''
        }`}
        style={{ color: hasHeroImage ? undefined : primaryColor }}
      >
        <FloralCorner className="w-full h-full" flip />
      </div>
      <div
        className={`absolute bottom-0 right-0 w-40 h-40 sm:w-56 sm:h-56 translate-x-1/4 translate-y-1/4 rotate-180 ${
          hasHeroImage ? 'text-white/40' : ''
        }`}
        style={{ color: hasHeroImage ? undefined : primaryColor }}
      >
        <FloralCorner className="w-full h-full" />
      </div>

      {/* Subtle pattern overlay for non-image backgrounds */}
      {!hasHeroImage && (
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='${encodeURIComponent(primaryColor)}' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      )}

      <div className="relative z-10 max-w-3xl mx-auto page-enter">
        {/* Pre-title */}
        <p
          className={`tracking-[0.3em] uppercase text-xs font-sans font-medium mb-6 ${
            hasHeroImage ? 'text-white/70' : 'text-warm-taupe'
          }`}
        >
          Nous nous marions
        </p>

        {/* Names with script font */}
        <h1 className="mb-6">
          <span
            className={`font-script text-5xl sm:text-6xl md:text-7xl lg:text-8xl ${
              hasHeroImage ? 'text-white' : 'text-deep-charcoal'
            }`}
          >
            {config.brideName}
          </span>
          <span
            className={`block font-serif text-2xl sm:text-3xl my-3 ${
              hasHeroImage ? 'text-white/60' : 'opacity-40'
            }`}
            style={{ color: hasHeroImage ? undefined : primaryColor }}
          >
            &
          </span>
          <span
            className={`font-script text-5xl sm:text-6xl md:text-7xl lg:text-8xl ${
              hasHeroImage ? 'text-white' : 'text-deep-charcoal'
            }`}
          >
            {config.groomName}
          </span>
        </h1>

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div
            className={`w-16 h-px ${hasHeroImage ? 'bg-white/30' : ''}`}
            style={{ backgroundColor: hasHeroImage ? undefined : `${primaryColor}30` }}
          />
          <FloralDivider color={hasHeroImage ? 'rgba(255,255,255,0.5)' : primaryColor} />
          <div
            className={`w-16 h-px ${hasHeroImage ? 'bg-white/30' : ''}`}
            style={{ backgroundColor: hasHeroImage ? undefined : `${primaryColor}30` }}
          />
        </div>

        {/* Date with calendar icon */}
        <div
          className={`flex items-center justify-center gap-2 text-lg sm:text-xl mb-4 capitalize font-light ${
            hasHeroImage ? 'text-white/90' : 'text-deep-charcoal/80'
          }`}
        >
          <Calendar size={18} className="opacity-60" />
          <span>{formattedDate}</span>
        </div>

        {/* Venue */}
        {config.venue && (
          <div
            className={`flex items-center justify-center gap-2 text-base mb-8 font-light ${
              hasHeroImage ? 'text-white/80' : 'text-warm-taupe'
            }`}
          >
            <MapPin size={16} className="opacity-60" />
            <span>{config.venue.name}</span>
          </div>
        )}

        {/* Countdown */}
        {config.features.countdown && daysLeft !== null && daysLeft > 0 && (
          <div
            className="inline-flex items-center gap-3 px-8 py-4 font-medium border"
            style={{
              backgroundColor: hasHeroImage ? 'rgba(255,255,255,0.1)' : `${primaryColor}08`,
              borderColor: hasHeroImage ? 'rgba(255,255,255,0.2)' : `${primaryColor}20`,
              color: hasHeroImage ? 'white' : primaryColor,
              backdropFilter: hasHeroImage ? 'blur(10px)' : undefined,
            }}
          >
            <Clock size={18} className="opacity-70" />
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-serif">{daysLeft}</span>
              <span className="text-sm tracking-wide">jour{daysLeft > 1 ? 's' : ''} avant le jour J</span>
            </div>
          </div>
        )}

        {daysLeft !== null && daysLeft === 0 && (
          <div
            className="inline-flex items-center gap-2 px-8 py-4 text-white font-medium"
            style={{ backgroundColor: primaryColor }}
          >
            <span className="text-xl font-serif">C'est aujourd'hui !</span>
          </div>
        )}

        {daysLeft !== null && daysLeft < 0 && (
          <div
            className={`text-center ${hasHeroImage ? 'text-white/90' : 'text-warm-taupe'}`}
          >
            <p className="text-lg font-light italic">
              Merci d'avoir partagé ce moment avec nous
            </p>
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div
          className={`w-6 h-10 border-2 rounded-full flex items-start justify-center p-1 ${
            hasHeroImage ? 'border-white/30' : ''
          }`}
          style={{ borderColor: hasHeroImage ? undefined : `${primaryColor}30` }}
        >
          <div
            className={`w-1.5 h-3 rounded-full animate-bounce ${
              hasHeroImage ? 'bg-white/60' : ''
            }`}
            style={{ backgroundColor: hasHeroImage ? undefined : `${primaryColor}50` }}
          />
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1200 40"
          preserveAspectRatio="none"
          className="w-full h-8 fill-current text-pearl-white"
        >
          <path d="M0,40 L0,20 Q150,0 300,20 T600,20 T900,20 T1200,20 L1200,40 Z" />
        </svg>
      </div>
    </section>
  );
}
