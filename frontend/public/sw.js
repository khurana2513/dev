/**
 * Service Worker for offline support
 * ✓ Caches static assets
 * ✓ Serves cached content when offline
 * ✓ Gracefully handles API failures with offline message
 *
 * DEPLOYMENT NOTE: Bump CACHE_VERSION on every production deploy so that
 * returning users with an active service worker immediately pick up new
 * asset hashes.  Format: 'v<semver>-<YYYYMMDD>'
 */

const CACHE_VERSION = 'v2-20260311';
const CACHE_NAMES = {
  static: `static-${CACHE_VERSION}`,
  api: `api-${CACHE_VERSION}`,
  dynamic: `dynamic-${CACHE_VERSION}`
};

// Only cache the shell — Vite hashes all other assets, so they never go stale.
// index.html itself is served with no-cache headers by nginx, so we intentionally
// do NOT cache it here to ensure users always reload the latest entry point.
const STATIC_ASSETS = [
  '/favicon.ico'
];

// API routes safe to serve stale while revalidating (non-sensitive, infrequently updated)
const CACHEABLE_APIS = [
  '/api/leaderboard',
  '/api/papers'
];

// Sensitive / session-specific routes that must NEVER be cached
const NEVER_CACHE_APIS = [
  '/api/users/me',
  '/api/users/profile',
  '/api/auth',
  '/api/admin',
  '/api/subscriptions',
  '/api/payments',
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event: any) => {
  console.log('🔧 [SERVICE-WORKER] Installing');
  
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then(cache => {
      console.log('📦 [SERVICE-WORKER] Caching static assets');
      return Promise.allSettled(
        STATIC_ASSETS.map(asset => {
          return cache.add(asset).catch(err => {
            console.warn(`⚠️ [SERVICE-WORKER] Failed to cache ${asset}:`, err);
          });
        })
      );
    }).then(() => {
      // Skip waiting to activate immediately
      return (self as any).skipWaiting();
    })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event: any) => {
  console.log('🚀 [SERVICE-WORKER] Activating');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => !Object.values(CACHE_NAMES).includes(name))
          .map(name => {
            console.log(`🧹 [SERVICE-WORKER] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Claim all clients immediately
      return (self as any).clients.claim();
    })
  );
});

/**
 * Fetch event - network-first with fallback to cache
 */
self.addEventListener('fetch', (event: any) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome extensions and non-http
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle API requests differently from static assets
  if (url.pathname.startsWith('/api/')) {
    return event.respondWith(handleApiRequest(request));
  }
  
  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

/**
 * Handle API requests with network-first strategy
 * Try network first, fall back to cache, then offline page
 */
async function handleApiRequest(request: Request): Promise<Response> {
  // Never cache auth / admin / payment / profile routes
  const isSensitive = NEVER_CACHE_APIS.some(p => request.url.includes(p));
  if (isSensitive) {
    return fetch(request);
  }

  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses for non-sensitive cacheable APIs
    if (networkResponse.ok && CACHEABLE_APIS.some(api => request.url.includes(api))) {
      const cache = await caches.open(CACHE_NAMES.api);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('📡 [SERVICE-WORKER] Network request failed:', error);
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('✓ [SERVICE-WORKER] Serving from cache');
      return cachedResponse;
    }
    
    // Return offline response
    console.log('⚠️ [SERVICE-WORKER] Returning offline response');
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'You appear to be offline. Some features may be unavailable.',
        cached: false
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle static assets with cache-first strategy
 */
async function handleStaticRequest(request: Request): Promise<Response> {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    console.log(`✓ [SERVICE-WORKER] Serving ${request.url} from cache`);
    return cachedResponse;
  }
  
  try {
    // Try network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.dynamic);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('⚠️ [SERVICE-WORKER] Failed to fetch:', request.url);
    
    // Return offline fallback page
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Offline</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
          .container { max-width: 600px; margin: 100px auto; text-align: center; }
          h1 { color: #333; }
          p { color: #666; line-height: 1.6; }
          button { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>You're Offline</h1>
          <p>Looks like you've lost your internet connection. Please check your connection and try again.</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      </body>
      </html>
      `,
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Handle messages from the app
self.addEventListener('message', (event: any) => {
  if (event.data.type === 'CLEAR_CACHES') {
    console.log('🧹 [SERVICE-WORKER] Clearing all caches');
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
});

console.log('✓ [SERVICE-WORKER] Service Worker loaded');
