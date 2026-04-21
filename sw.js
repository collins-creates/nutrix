// Nutrix Service Worker - Performance Optimization & Caching
const CACHE_NAME = 'nutrix-v1.0.0';
const STATIC_CACHE = 'nutrix-static-v1.0.0';
const DYNAMIC_CACHE = 'nutrix-dynamic-v1.0.0';
const API_CACHE = 'nutrix-api-v1.0.0';

// Cache URLs for static assets
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/api.js',
  '/js/search.js',
  '/js/ui.js',
  '/js/storage.js',
  '/js/compare.js',
  '/robots.txt',
  '/sitemap.xml',
  '/site.webmanifest',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE &&
                cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (url.origin === self.location.origin) {
    // Same-origin requests
    if (url.pathname.startsWith('/api/')) {
      // API requests - Network first with cache fallback
      event.respondWith(apiCacheStrategy(request));
    } else {
      // Static files - Cache first with network fallback
      event.respondWith(staticCacheStrategy(request));
    }
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    // Google Fonts - Cache first
    event.respondWith(fontCacheStrategy(request));
  } else {
    // External requests - Network only
    event.respondWith(fetch(request));
  }
});

// Static cache strategy - Cache first with network fallback
async function staticCacheStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Static cache strategy failed:', error);
    return new Response('Offline - Please check your connection', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// API cache strategy - Network first with cache fallback
async function apiCacheStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API requests
    return new Response(JSON.stringify({
      success: false,
      message: 'Offline - Please check your internet connection',
      data: null
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// Font cache strategy - Cache first
async function fontCacheStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Font cache strategy failed:', error);
    return new Response('Font loading failed', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle background sync tasks
  console.log('Background sync triggered');
}

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'Explore',
          icon: '/images/checkmark.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/images/xmark.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('https://nutrix.com/')
    );
  }
});

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PERFORMANCE_METRICS') {
    // Handle performance metrics from the page
    console.log('Performance metrics received:', event.data.metrics);
  }
});

// Cache cleanup - Remove old API responses periodically
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_CLEANUP') {
    event.waitUntil(cleanupOldCache());
  }
});

async function cleanupOldCache() {
  const cache = await caches.open(API_CACHE);
  const requests = await cache.keys();
  const now = Date.now();
  
  for (const request of requests) {
    const response = await cache.match(request);
    const dateHeader = response.headers.get('date');
    if (dateHeader) {
      const responseDate = new Date(dateHeader).getTime();
      const age = now - responseDate;
      
      // Remove cache entries older than 1 hour for API responses
      if (age > 3600000) {
        await cache.delete(request);
      }
    }
  }
}
