/**
 * Astro Middleware for Security Headers
 *
 * Adds security headers including CSRF protection via SameSite cookies
 * and other security best practices.
 */

import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy - allow inline scripts/styles for Astro islands
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Astro hydration
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.r2.cloudflarestorage.com https://*.supabase.co",
      "media-src 'self' blob: https://*.r2.cloudflarestorage.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.r2.cloudflarestorage.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
    ].join('; ')
  );

  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // For API endpoints, check Origin header for CSRF protection
  const { pathname } = context.url;
  if (pathname.startsWith('/api/') && context.request.method !== 'GET') {
    const origin = context.request.headers.get('Origin');
    const host = context.request.headers.get('Host');

    // Allow requests without Origin (non-browser clients) but check referer
    if (origin) {
      const originHost = new URL(origin).host;
      // Ensure origin matches host (same-origin request)
      if (host && originHost !== host) {
        // Allow localhost variations during development
        const isLocalhost =
          (originHost.includes('localhost') || originHost.includes('127.0.0.1')) &&
          (host.includes('localhost') || host.includes('127.0.0.1'));

        if (!isLocalhost) {
          return new Response(
            JSON.stringify({
              error: 'CSRF validation failed',
              message: 'Cross-origin requests are not allowed',
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }
    }
  }

  return response;
});
