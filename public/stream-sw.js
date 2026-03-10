// Service Worker: intercepts HLS segment requests and injects the required Referer.
// Segments stream directly CDN → browser (zero server egress).

const CDN_PATTERNS = [
  'vodvidl.site',
  'megafiles.store',
  'nightbreeze17.site',
  'scrennnifu.click',
  'frostcomet5.pro',
];

let storedReferer = 'https://vidlink.pro/';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SET_REFERER') {
    storedReferer = event.data.referer || storedReferer;
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isCDN = CDN_PATTERNS.some((h) => url.hostname === h || url.hostname.endsWith('.' + h));

  if (!isCDN) return;

  let fetchReferer = storedReferer;
  try {
    const h = url.searchParams.get('headers');
    if (h) {
      const obj = JSON.parse(h);
      if (obj.referer) fetchReferer = obj.referer;
    }
  } catch { /* ignore */ }

  event.respondWith(
    fetch(event.request.url, {
      headers: {
        'Referer': fetchReferer,
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      referrer: fetchReferer,
      referrerPolicy: 'unsafe-url',
    })
  );
});
