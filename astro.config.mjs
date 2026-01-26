import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [
    react(),
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
    plugins: [tailwindcss()],
    optimizeDeps: {
      // Include lucide-react for tree-shaking optimization
      include: ['lucide-react'],
    },
    ssr: {
      // Ensure lucide-react is bundled for SSR (enables tree-shaking)
      noExternal: ['lucide-react'],
    },
    server: {
      allowedHosts: ['b41896afb08b.ngrok-free.app'],
    },
  },
});
