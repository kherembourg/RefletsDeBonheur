import { useMemo } from 'react';
import type { WeddingConfig } from '../../lib/types';
import { luxeTheme } from '../../lib/themes';

interface LuxeHeroProps {
  config: WeddingConfig;
}

export function LuxeHero({ config }: LuxeHeroProps) {
  const colors = luxeTheme.colors;

  // Format date
  const weddingDate = new Date(config.weddingDate);
  const day = weddingDate.getDate();
  const month = weddingDate.toLocaleDateString('fr-FR', { month: 'long' });
  const year = weddingDate.getFullYear();

  // Get location from venue
  const location = config.venue?.address?.split(',').pop()?.trim() || 'France';

  // Memoize style objects to prevent recreation on each render
  const styles = useMemo(() => ({
    header: { backgroundColor: colors.background },
    subtitle: { color: colors.textLight },
    title: { color: colors.text, fontFamily: "'Playfair Display', serif" },
    ampersand: { color: colors.accent },
    dateLocation: { color: colors.accent, fontFamily: "'Playfair Display', serif" },
  }), [colors.background, colors.textLight, colors.text, colors.accent]);

  return (
    <header className="text-center px-5 pt-16 pb-10" style={styles.header}>
      {/* Subtitle */}
      <div
        className="text-xs font-medium tracking-[2px] uppercase mb-4"
        style={styles.subtitle}
      >
        Bienvenue au mariage de
      </div>

      {/* Names */}
      <h1
        className="font-display text-[2.8rem] leading-[1.1] mb-2"
        style={styles.title}
      >
        {config.brideName}{' '}
        <span
          className="italic"
          style={styles.ampersand}
        >
          &
        </span>{' '}
        {config.groomName}
      </h1>

      {/* Date & Location */}
      <div
        className="font-display italic text-xl mt-3"
        style={styles.dateLocation}
      >
        {day} {month} {year} • {location}
      </div>
    </header>
  );
}
