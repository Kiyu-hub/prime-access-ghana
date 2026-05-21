/* ============================================================
   Clasikal Homes — Service Worker
   Cache-first for the app shell (HTML/CSS/JS/images/fonts).
   Network-first for Supabase + Cloudinary (with offline fallback to cache where possible).
   Skips non-GET requests entirely.
   ============================================================ */

const VERSION = 'ch-v4.0.2';
const SHELL_CACHE   = VERSION + '-shell';
const RUNTIME_CACHE = VERSION + '-runtime';

const SHELL = [
    './',
    './index.html',
    './dashboard.html',
    './manifest.webmanifest',
    './assets/logo.png',
    './assets/catalog-reference.jpeg',
    './scripts/config.js',
    './scripts/supabase-client.js',
    './scripts/cloudinary.js',
    './scripts/auth.js',
    './scripts/dashboard.js',
    './scripts/ui.js',
    './scripts/install.js',
    './scripts/pdf-export.js',
];

self.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data.type === 'GET_VERSION' && event.ports && event.ports[0]) {
        event.ports[0].postMessage({ version: VERSION });
    }
});

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL).catch(() => {
            // Some files might 404 on a fresh clone — that's OK, just cache what we can
            return Promise.all(SHELL.map((url) => cache.add(url).catch(() => null)));
        }))
    );
    // Do NOT call skipWaiting() here. The new SW must wait until the user
    // explicitly clicks "Reload now" in the dialog (which sends SKIP_WAITING).
    // Otherwise the new SW takes over silently → controllerchange fires →
    // the page reloads in the middle of the user's work.
});

self.addEventListener('activate', (event) => {
    // Clean up old caches, but DO NOT call self.clients.claim().
    // Claiming open tabs fires controllerchange, which historically caused page reloads.
    // The new SW only takes control naturally on the next full navigation — never mid-task.
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
                    .map((k) => caches.delete(k))
            )
        )
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // Never cache Supabase or Cloudinary API responses — always go to network
    if (url.hostname.endsWith('.supabase.co') || url.hostname === 'api.cloudinary.com') {
        return; // let the browser handle it
    }

    // Cloudinary delivery (res.cloudinary.com): cache for offline product images
    if (url.hostname.endsWith('res.cloudinary.com')) {
        event.respondWith(staleWhileRevalidate(req));
        return;
    }

    // Google Fonts: cache-first (fonts rarely change)
    if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
        event.respondWith(cacheFirst(req));
        return;
    }

    // jsDelivr / cdn assets: cache-first with version-busting via URL
    if (url.hostname.endsWith('cdn.jsdelivr.net') || url.hostname.endsWith('unpkg.com')) {
        event.respondWith(cacheFirst(req));
        return;
    }

    // Same-origin: network-first for HTML/JS/CSS so PWA gets new code instantly,
    // fall back to cache when offline.
    if (url.origin === self.location.origin) {
        const isAppCode = /\.(html|js|css|webmanifest|json)$/i.test(url.pathname) || url.pathname === '/' || url.pathname.endsWith('/');
        if (isAppCode) {
            event.respondWith(networkFirst(req));
        } else {
            event.respondWith(staleWhileRevalidate(req));
        }
        return;
    }

    // Default: just network
});

async function networkFirst(req) {
    try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(req, fresh.clone());
        }
        return fresh;
    } catch (e) {
        const cached = await caches.match(req);
        if (cached) return cached;
        throw e;
    }
}

async function cacheFirst(req) {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(req, fresh.clone());
        }
        return fresh;
    } catch (e) {
        return cached || new Response('', { status: 504 });
    }
}

async function staleWhileRevalidate(req) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(req);
    const networkPromise = fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
    }).catch(() => cached);
    return cached || networkPromise;
}
