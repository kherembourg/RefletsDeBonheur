/**
 * Image placeholder system for instant loading
 *
 * Generates tiny SVG-based blur placeholders that display instantly
 * while actual images load in the background.
 */

// Wedding-themed color palette for placeholders
const PLACEHOLDER_COLORS = [
  { primary: '#f5f0e8', secondary: '#e8d5d3' }, // Cream to blush
  { primary: '#e8d5d3', secondary: '#d4c4c0' }, // Blush to taupe
  { primary: '#f0e6e4', secondary: '#e0d0cc' }, // Light rose
  { primary: '#efe9e5', secondary: '#e5dcd8' }, // Warm ivory
  { primary: '#f2ebe7', secondary: '#e8ddd8' }, // Soft peach
];

/**
 * Generate a tiny SVG placeholder with a gradient
 * Returns a data URL that can be used directly in img src
 */
export function generatePlaceholderSVG(
  width: number = 400,
  height: number = 300,
  colorIndex: number = 0
): string {
  const colors = PLACEHOLDER_COLORS[colorIndex % PLACEHOLDER_COLORS.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colors.primary}"/>
        <stop offset="100%" stop-color="${colors.secondary}"/>
      </linearGradient>
    </defs>
    <rect fill="url(#g)" width="${width}" height="${height}"/>
  </svg>`;

  // Encode as base64 data URL
  const base64 = typeof btoa !== 'undefined'
    ? btoa(svg)
    : Buffer.from(svg).toString('base64');

  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Generate a blur placeholder CSS gradient (no network request needed)
 */
export function generatePlaceholderGradient(colorIndex: number = 0): string {
  const colors = PLACEHOLDER_COLORS[colorIndex % PLACEHOLDER_COLORS.length];
  return `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`;
}

/**
 * Pre-generated placeholder data URLs for demo images
 * These are embedded directly in the JS bundle for instant display
 */
export const DEMO_PLACEHOLDERS: Record<string, string> = {
  '1': generatePlaceholderSVG(400, 300, 0),
  '2': generatePlaceholderSVG(400, 300, 1),
  '3': generatePlaceholderSVG(400, 300, 2),
  '4': generatePlaceholderSVG(400, 300, 3),
  '5': generatePlaceholderSVG(400, 300, 4),
  '6': generatePlaceholderSVG(400, 300, 0),
  '7': generatePlaceholderSVG(400, 300, 1),
  '8': generatePlaceholderSVG(400, 300, 2),
  '9': generatePlaceholderSVG(400, 300, 3),
  '10': generatePlaceholderSVG(400, 300, 4),
};

/**
 * Get placeholder for a media item
 */
export function getPlaceholder(mediaId: string): string {
  return DEMO_PLACEHOLDERS[mediaId] || generatePlaceholderSVG(400, 300, parseInt(mediaId, 10) || 0);
}

/**
 * Optimized Unsplash URL generator
 * Adds proper sizing, format, and quality parameters
 */
export function optimizeUnsplashUrl(
  url: string,
  options: {
    width?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'jpg';
  } = {}
): string {
  const { width = 400, quality = 75, format = 'auto' } = options;

  // Check if already an Unsplash URL
  if (!url.includes('unsplash.com')) {
    return url;
  }

  // Parse existing URL
  const baseUrl = url.split('?')[0];

  // Build optimized params
  const params = new URLSearchParams({
    w: width.toString(),
    q: quality.toString(),
    auto: 'format',
    fit: 'crop',
  });

  if (format !== 'auto') {
    params.set('fm', format);
  }

  return `${baseUrl}?${params.toString()}`;
}
