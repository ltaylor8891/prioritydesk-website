// Keeps the app's own files so Priority Desk opens with no connection. It never touches OneDrive: requests to
// other sites go straight to the network, so sync always sees live data. It works from wherever the app is
// hosted (for example /app/), using the service worker's own scope as the app's root.
const CACHE = 'prioritydesk-shell-v2';
const ROOT = self.registration.scope;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([ROOT, ROOT + 'manifest.webmanifest', ROOT + 'icon.svg'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !request.url.startsWith(ROOT)) return;
  // The page itself: the network first, so an update is picked up; the saved copy when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(ROOT, copy));
        return response;
      }).catch(() => caches.match(ROOT)));
    return;
  }
  // Built files have a new name whenever they change, so a saved copy is always right.
  event.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })));
});
