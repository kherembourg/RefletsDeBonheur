// Reflets de Bonheur - Service Worker
// Version 1.0.0

const CACHE_VERSION = 'reflets-v1.0.4';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const FONT_CACHE = 'reflets-fonts-v1'; // Fonts cache persists across versions

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/gallery',
  '/guestbook',
  '/admin',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old versions, but keep font cache (fonts rarely change)
              return cacheName.startsWith('reflets-') &&
                     cacheName !== STATIC_CACHE &&
                     cacheName !== RUNTIME_CACHE &&
                     cacheName !== IMAGE_CACHE &&
                     cacheName !== FONT_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle font requests (Google Fonts) - cache aggressively
  if (url.hostname === 'fonts.gstatic.com' ||
      (url.hostname === 'fonts.googleapis.com' && request.destination === 'style')) {
    event.respondWith(handleFontRequest(request));
    return;
  }

  // Handle image requests
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle other requests (CSS, JS)
  event.respondWith(handleResourceRequest(request));
});

// Font caching strategy: Cache first, very long TTL (fonts rarely change)
async function handleFontRequest(request) {
  try {
    const cache = await caches.open(FONT_CACHE);
    const cached = await cache.match(request);

    if (cached) {
      console.log('[SW] Serving cached font:', request.url);
      return cached;
    }

    console.log('[SW] Fetching font:', request.url);
    const response = await fetch(request);

    if (response.ok) {
      // Cache fonts for a long time - they don't change
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Font fetch failed:', error);
    // Try to find in cache as last resort
    const cached = await caches.match(request);
    return cached || new Response('', { status: 404, statusText: 'Font not found' });
  }
}

// Image caching strategy: Cache first, network fallback
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(IMAGE_CACHE);
    const cached = await cache.match(request);

    if (cached) {
      console.log('[SW] Serving cached image:', request.url);
      return cached;
    }

    console.log('[SW] Fetching image:', request.url);
    const response = await fetch(request);

    if (response.ok) {
      // Only cache successful responses
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Image fetch failed:', error);
    // Return a placeholder or nothing
    return new Response('', { status: 404, statusText: 'Image not found' });
  }
}

// Navigation caching strategy: Network first, cache fallback, offline page
async function handleNavigationRequest(request) {
  try {
    console.log('[SW] Fetching navigation:', request.url);
    const response = await fetch(request);

    // Cache successful navigation responses
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    // Try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Try static cache
    const staticCached = await caches.match(request, { cacheName: STATIC_CACHE });
    if (staticCached) {
      return staticCached;
    }

    // Fallback to offline page
    console.log('[SW] Showing offline page');
    const offlinePage = await caches.match('/offline');
    if (offlinePage) {
      return offlinePage;
    }

    // Last resort: basic offline message
    return new Response(
      `<!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hors ligne - Reflets de Bonheur</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #FFFFF0 0%, #F5E6D3 100%);
            color: #2C2C2C;
            text-align: center;
            padding: 20px;
          }
          .container {
            max-width: 400px;
          }
          h1 {
            color: #D4AF37;
            font-size: 2rem;
            margin-bottom: 1rem;
          }
          p {
            font-size: 1.125rem;
            line-height: 1.6;
            margin-bottom: 1.5rem;
          }
          button {
            background: #D4AF37;
            color: #2C2C2C;
            border: none;
            padding: 12px 24px;
            font-size: 1rem;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
          }
          button:hover {
            background: #c19d2f;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📴 Vous êtes hors ligne</h1>
          <p>Impossible de se connecter au réseau. Veuillez vérifier votre connexion Internet.</p>
          <button onclick="window.location.reload()">Réessayer</button>
        </div>
      </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
        status: 503,
        statusText: 'Service Unavailable'
      }
    );
  }
}

// Resource caching strategy: Cache first, network fallback
async function handleResourceRequest(request) {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);

    if (cached) {
      console.log('[SW] Serving cached resource:', request.url);
      // Return cached, but update in background
      fetch(request).then((response) => {
        if (response.ok) {
          cache.put(request, response);
        }
      }).catch(() => {
        // Ignore background fetch errors
      });
      return cached;
    }

    console.log('[SW] Fetching resource:', request.url);
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Resource fetch failed:', error);

    // Try to find in any cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    return new Response('', { status: 404, statusText: 'Not found' });
  }
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('reflets-')) {
              console.log('[SW] Clearing cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }
});
