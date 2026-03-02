/**
 * Service Worker for offline support
 * ✓ Caches static assets
 * ✓ Serves cached content when offline
 * ✓ Gracefully handles API failures with offline message
 */

const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  static: `static-${CACHE_VERSION}`,
  api: `api-${CACHE_VERSION}`,
  dynamic: `dynamic-${CACHE_VERSION}`
};

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico'
];

// API routes to cache
const CACHEABLE_APIS = [
  '/api/users/profile',
  '/api/leaderboard',
  '/api/papers'
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
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
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
