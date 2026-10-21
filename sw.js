/* WORKPLAN — service worker: app shell instan & tahan sinyal lemah.
 * Aset statis: stale-while-revalidate (tampil dari cache, diperbarui di latar).
 * js/config.js: network-first (agar perubahan GAS_URL langsung terpakai).
 * Panggilan ke Google Apps Script TIDAK pernah di-cache di sini (data dikelola app). */
const CACHE = 'workplan-shell-v1.3.0';
const ASET = ['./', './index.html', './css/style.css', './js/config.js', './js/icons.js', './js/stat.js', './js/core.js', './js/pages.js', './js/modules.js', './js/app.js', './icon.svg', './manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASET)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  const lokal = url.origin === location.origin, font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!lokal && !font) return;
  if (lokal && url.pathname.endsWith('/js/config.js')) {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); return r; }).catch(() => caches.match(req)));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: req.mode === 'navigate' }) || (req.mode === 'navigate' ? await c.match('./index.html') : null);
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
