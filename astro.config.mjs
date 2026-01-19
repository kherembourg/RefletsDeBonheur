import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  adapter: node({
    mode: 'standalone',
  }),
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr', 'es'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      allowedHosts: ['b41896afb08b.ngrok-free.app'],
    },
  },
});
