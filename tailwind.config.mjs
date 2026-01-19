/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // New elegant French-inspired palette
        'burgundy': '#ae1725',
        'burgundy-light': '#c92a38',
        'burgundy-dark': '#8a121d',
        'olive': '#4A5D4A',
        'olive-light': '#5C6F5C',
        'olive-dark': '#3A4A3A',
        'cream': '#F5F0E8',
        'cream-dark': '#EBE6DE',
        'antique-gold': '#B8860B',
        'gold-light': '#D4A849',
        'charcoal': '#333333',
        'charcoal-light': '#555555',
        'sage': '#8B9D83',
        'sage-light': '#A8B8A0',
        'blush': '#E8D5D3',
        'blush-dark': '#D4BFBC',
        'white': '#FFFFFF',
        'off-white': '#FEFEFE',
        // Keep legacy colors for compatibility
        'champagne-gold': '#B8860B',
        'ivory': '#F5F0E8',
        'deep-charcoal': '#333333',
        'soft-blush': '#E8D5D3',
        'sage-green': '#8B9D83',
        'silver-mist': '#9B9B9B',
        'pearl-white': '#F5F0E8',
        'warm-taupe': '#8B7B70',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
        script: ['Great Vibes', 'Allura', 'cursive'],
      },
      boxShadow: {
        'gold': '0 4px 14px 0 rgba(212, 175, 55, 0.25)',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-soft': 'bounceSoft 0.6s ease-in-out',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
};
