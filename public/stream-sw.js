// Service Worker: intercepts HLS segment requests and injects the required Referer.
// Segments stream directly CDN → browser (zero server egress).
// The correct Referer/Origin are encoded in the CDN URL's ?headers= param.

const CDN_HOSTS = [
  'storm.vodvidl.site',
  'vodvidl.site',
  'megafiles.store',
  'nightbreeze17.site',
];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isCDN = CDN_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith('.' + h));

  if (!isCDN) return;

  // Read the Referer the CDN requires directly from the URL's ?headers= param.
  // This is more reliable than a stored referer since each CDN URL encodes its own requirements.
  let fetchReferer = 'https://videostr.net/';
  try {
    const h = url.searchParams.get('headers');
    if (h) {
      const obj = JSON.parse(h);
      if (obj.referer) fetchReferer = obj.referer;
    }
  } catch { /* ignore malformed params */ }

  event.respondWith(
    fetch(event.request.url, {
      method: event.request.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': fetchReferer,
      },
      referrer: fetchReferer,
      referrerPolicy: 'unsafe-url',
    })
  );
});
