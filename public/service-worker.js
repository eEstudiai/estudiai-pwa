const CACHE_NAME = 'estudiai-shell-v2';
const BASE_PATH = new URL(self.registration.scope).pathname;
const APP_SHELL = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}icons/icon-192.png`,
  `${BASE_PATH}icons/icon-512.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('estudiai-shell-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(BASE_PATH)
  ) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () =>
        (await caches.match(`${BASE_PATH}index.html`)) ||
        (await caches.match(BASE_PATH)),
      ),
    );
    return;
  }

  if (url.pathname.startsWith(`${BASE_PATH}_expo/static/`)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      }),
    );
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = typeof payload.title === 'string'
    ? payload.title
    : 'Novidades do EstudaIA';

  const options = {
    body: typeof payload.body === 'string' ? payload.body : '',
    icon: `${BASE_PATH}icons/icon-192.png`,
    badge: `${BASE_PATH}icons/icon-192.png`,
    data: payload.data && typeof payload.data === 'object' ? payload.data : {},
    tag: typeof payload.tag === 'string' ? payload.tag : 'estudiai-promotional',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const requested = event.notification.data && event.notification.data.url;
  let target = self.registration.scope;

  if (typeof requested === 'string') {
    try {
      const parsed = new URL(requested, self.registration.scope);
      if (
        parsed.origin === self.location.origin &&
        parsed.pathname.startsWith(BASE_PATH)
      ) {
        target = parsed.href;
      }
    } catch {
      // Keep the app home as the safe fallback.
    }
  }

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    for (const client of windows) {
      if (
        new URL(client.url).origin === self.location.origin &&
        new URL(client.url).pathname.startsWith(BASE_PATH)
      ) {
        await client.navigate(target);
        return client.focus();
      }
    }

    return self.clients.openWindow(target);
  })());
});
