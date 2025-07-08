const CACHE_NAME = 'vocabswipe-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/theme-bright.svg',
    '/theme-night.svg',
    '/unmute-bright.svg',
    '/mute-bright.svg',
    '/unmute-night.svg',
    '/mute-night.svg',
    '/information-bright.svg',
    '/information-night.svg',
    '/shuffle-bright.svg',
    '/shuffle-night.svg',
    '/reset-bright.svg',
    '/reset-night.svg',
    '/bag-bright.svg',
    '/bag-night.svg',
    '/loading-bright.gif',
    '/loading-night.gif'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).then(networkResponse => {
                if (event.request.url.includes('data/')) {
                    return networkResponse;
                }
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            });
        }).catch(() => {
            return caches.match('/index.html');
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
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
