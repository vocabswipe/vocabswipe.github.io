const CACHE_NAME = 'vocabswipe-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
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
    '/data/vocab3000_database.yaml'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching static assets');
                return cache.addAll(urlsToCache);
            })
            .catch(error => console.error('Cache addAll failed:', error))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log(`Serving from cache: ${event.request.url}`);
                    return response;
                }
                return fetch(event.request).catch(error => {
                    console.error(`Fetch failed: ${event.request.url}, ${error}`);
                    return new Response('Network error occurred', { status: 503 });
                });
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log(`Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
