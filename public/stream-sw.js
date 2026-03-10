// Service Worker: intercepts HLS segment requests and injects the required Referer.
// Segments stream directly CDN → browser (zero server egress).

const CDN_PATTERNS = [
  // vidlink / videostr CDN
  'vodvidl.site',
  'megafiles.store',
  'nightbreeze17.site',
  // vidrock CDN
  'scrennnifu.click',
  'frostcomet5.pro',
  // videasy / vidfast / vidzee CDNs (catch-all for common streaming TLDs)
  'cdn-sw.net',
  'hlsplay.pro',
];

// Referer stored per-session, set by VideoPlayer after extraction
let storedReferer = 'https://vidrock.net/';

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

  // Prefer the Referer encoded in the URL's ?headers= param (provider-specific),
  // fall back to the stored referer set by the player.
  let fetchReferer = storedReferer;
  let fetchOrigin = new URL(storedReferer).origin;
  try {
    const h = url.searchParams.get('headers');
    if (h) {
      const obj = JSON.parse(h);
      if (obj.referer) fetchReferer = obj.referer;
      if (obj.origin) fetchOrigin = obj.origin;
    }
  } catch { /* ignore malformed params */ }

  event.respondWith(
    fetch(event.request.url, {
      method: event.request.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': fetchReferer,
        'Origin': fetchOrigin,
      },
      referrer: fetchReferer,
      referrerPolicy: 'unsafe-url',
      mode: 'cors',
      credentials: 'omit',
    }).catch(() =>
      // If CORS fails (CDN enforces strict Origin), try without custom headers
      // so the browser uses its own Origin — some CDNs are permissive enough
      fetch(event.request.url, { mode: 'no-cors' })
    )
  );
});
