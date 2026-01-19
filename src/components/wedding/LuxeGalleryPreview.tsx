import { luxeTheme } from '../../lib/themes';

interface LuxeGalleryPreviewProps {
  slug: string;
}

export function LuxeGalleryPreview({ slug }: LuxeGalleryPreviewProps) {
  const colors = luxeTheme.colors;

  // Placeholder images (in production, these would come from the actual media)
  const placeholderColors = ['#E6E2D6', '#D3D3D3', '#C0C0C0', '#E6E2D6'];

  return (
    <section className="px-5 pb-10">
      {/* Section Title */}
      <h2
        className="text-2xl font-display text-center mb-5"
        style={{ color: colors.text, fontFamily: "'Playfair Display', serif" }}
      >
        En direct
      </h2>

      {/* Masonry Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {placeholderColors.map((color, index) => (
          <a
            key={index}
            href={`/${slug}/photos`}
            className="block rounded-xl overflow-hidden transition-transform hover:scale-[1.02]"
            style={{
              backgroundColor: color,
              height: index === 1 ? '200px' : '150px', // Asymmetry for visual interest
            }}
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
          style={{ color: colors.accent }}
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
