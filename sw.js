const CACHE_NAME = 'vocabswipe-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/data/vocab3000_database.yaml',
    '/qr_code/VocabSwipe_qr_code.png',
    '/theme-bright.svg',
    '/theme-night.svg',
    '/unmute-bright.svg',
    '/unmute-night.svg',
    '/mute-bright.svg',
    '/mute-night.svg',
    '/information-bright.svg',
    '/information-night.svg',
    '/shuffle-bright.svg',
    '/shuffle-night.svg',
    '/reset-bright.svg',
    '/reset-night.svg',
    '/heart-bright.svg',
    '/heart-night.svg',
    '/loading-bright.gif',
    '/loading-night.gif',
    'https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js',
    'https://hammerjs.github.io/dist/hammer.min.js'
];

self.addEventListener('install', event => {
    console.log('Service Worker: Installing');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .catch(error => console.error('Service Worker: Cache addAll failed:', error))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // For the YAML file, prioritize network to ensure fresh data
                if (event.request.url.includes('vocab3000_database.yaml')) {
                    console.log(`Service Worker: Fetching fresh ${event.request.url}`);
                    return fetch(event.request)
                        .then(networkResponse => {
                            if (!networkResponse.ok) {
                                throw new Error(`Network fetch failed for ${event.request.url}`);
                            }
                            // Update cache with fresh YAML
                            return caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, networkResponse.clone());
                                    console.log(`Service Worker: Cached fresh ${event.request.url}`);
                                    return networkResponse;
                                });
                        })
                        .catch(error => {
                            console.error(`Service Worker: Network fetch failed for ${event.request.url}:`, error);
                            if (cachedResponse) {
                                console.log(`Service Worker: Serving cached ${event.request.url}`);
                                return cachedResponse;
                            }
                            throw error; // Let the app handle the error
                        });
                }
                // For other assets, serve from cache first
                if (cachedResponse) {
                    console.log(`Service Worker: Serving cached ${event.request.url}`);
                    return cachedResponse;
                }
                // Fetch from network if not cached
                console.log(`Service Worker: Fetching ${event.request.url}`);
                return fetch(event.request)
                    .then(networkResponse => {
                        if (!networkResponse.ok) {
                            throw new Error(`Network fetch failed for ${event.request.url}`);
                        }
                        // Cache the new response for future use
                        return caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, networkResponse.clone());
                                console.log(`Service Worker: Cached ${event.request.url}`);
                                return networkResponse;
                            });
                    })
                    .catch(error => {
                        console.error(`Service Worker: Fetch failed for ${event.request.url}:`, error);
                        throw error;
                    });
            })
    );
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Activating');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(cacheName => cacheName !== CACHE_NAME)
                    .map(cacheName => {
                        console.log(`Service Worker: Deleting old cache ${cacheName}`);
                        return caches.delete(cacheName);
                    })
            );
        })
    );
});
