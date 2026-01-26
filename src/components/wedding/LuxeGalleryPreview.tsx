import { useMemo } from 'react';
import { luxeTheme } from '../../lib/themes';

interface LuxeGalleryPreviewProps {
  slug: string;
}

// Placeholder colors (module level to avoid recreation)
const PLACEHOLDER_COLORS = ['#E6E2D6', '#D3D3D3', '#C0C0C0', '#E6E2D6'];
const PLACEHOLDER_HEIGHTS = ['150px', '200px', '150px', '150px'];

export function LuxeGalleryPreview({ slug }: LuxeGalleryPreviewProps) {
  const colors = luxeTheme.colors;

  // Memoize style objects
  const styles = useMemo(() => ({
    title: { color: colors.text, fontFamily: "'Playfair Display', serif" } as React.CSSProperties,
    link: { color: colors.accent } as React.CSSProperties,
  }), [colors.text, colors.accent]);

  // Memoize placeholder styles
  const placeholderStyles = useMemo(() =>
    PLACEHOLDER_COLORS.map((color, index) => ({
      backgroundColor: color,
      height: PLACEHOLDER_HEIGHTS[index],
    }))
  , []);

  return (
    <section className="px-5 pb-10">
      {/* Section Title */}
      <h2
        className="text-2xl font-display text-center mb-5"
        style={styles.title}
      >
        En direct
      </h2>

      {/* Masonry Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {placeholderStyles.map((style, index) => (
          <a
            key={index}
            href={`/${slug}/photos`}
            className="block rounded-xl overflow-hidden transition-transform hover:scale-[1.02]"
            style={style}
          >
            {/* In production, this would be an actual image */}
          </a>
        ))}
      </div>

      {/* View All Link */}
      <div className="text-center mt-6">
        <a
          href={`/${slug}/photos`}
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-70"
          style={styles.link}
        >
          Voir toutes les photos
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </section>
  );
}
