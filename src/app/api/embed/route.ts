import { NextResponse } from "next/server";

// Ad domains and paths to block
const AD_BLOCK_PATTERNS = [
  "venus",
  "popads",
  "adcash",
  "propellerads",
  "exoclick",
  "trafficstars",
  "hilltopads",
  "adsterra",
  "monetag",
  "richpush",
  "yllix",
  "mgid",
  "revcontent",
  "taboola",
  "outbrain",
  "yandex",
  "mc.yandex",
  "googletagmanager",
  "googlesyndication",
  "doubleclick",
];

// Script injected at the top of <head> to neutralise ads before page JS runs
const BLOCKER_SCRIPT = `<script>
(function() {
  var BLOCKED = ${JSON.stringify(AD_BLOCK_PATTERNS)};
  function isBlocked(s) {
    if (!s) return false;
    s = String(s).toLowerCase();
    return BLOCKED.some(function(p) { return s.indexOf(p) !== -1; });
  }

  // Block window.open popups
  window.open = function() { return null; };

  // Block ad fetch calls
  var _origFetch = window.fetch;
  window.fetch = function(input) {
    var url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
    if (isBlocked(url)) {
      return Promise.resolve(new Response('', { status: 200 }));
    }
    return _origFetch.apply(this, arguments);
  };

  // Block XMLHttpRequest to ad domains
  var _origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (isBlocked(url)) {
      url = 'about:blank';
    }
    return _origOpen.apply(this, arguments);
  };

  // Use MutationObserver to remove ad scripts as they're added to the DOM
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.tagName === 'SCRIPT' && isBlocked(node.src)) {
          node.parentNode && node.parentNode.removeChild(node);
        }
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
</script>`;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url");

  if (!target) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  // Only allow known streaming providers
  const allowedHosts = [
    "vidlink.pro",
    "vidfast.pro",
    "vidrock.net",
    "player.videasy.net",
    "player.vidzee.wtf",
    "www.vidsrc.wtf",
  ];
  if (!allowedHosts.some((h) => targetUrl.hostname === h || targetUrl.hostname.endsWith("." + h))) {
    return new NextResponse("Host not allowed", { status: 403 });
  }

  try {
    const res = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://www.nitflex.app/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      return new NextResponse(`Upstream error: ${res.status}`, { status: res.status });
    }

    const contentType = res.headers.get("content-type") ?? "";

    // Pass through non-HTML responses (JS, CSS, images) unchanged
    if (!contentType.includes("text/html")) {
      const body = await res.arrayBuffer();
      return new NextResponse(body, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    let html = await res.text();
    const base = `${targetUrl.protocol}//${targetUrl.host}`;

    // Rewrite relative URLs → absolute so scripts/CSS/images still load from the origin
    html = html
      .replace(/(href|src)="\//g, `$1="${base}/`)
      .replace(/(href|src)='\//g, `$1='${base}/`);

    // Inject blocker script as the very first thing in <head>
    html = html.replace(/<head([^>]*)>/i, `<head$1>${BLOCKER_SCRIPT}`);

    // Remove known ad script tags entirely
    for (const pattern of AD_BLOCK_PATTERNS) {
      html = html.replace(
        new RegExp(`<script[^>]+src="[^"]*${pattern}[^"]*"[^>]*>(.*?)</script>`, "gis"),
        ""
      );
      html = html.replace(
        new RegExp(`<script[^>]+src='[^']*${pattern}[^']*'[^>]*>(.*?)</script>`, "gis"),
        ""
      );
    }

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "SAMEORIGIN",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    console.error("Embed proxy error:", err);
    return new NextResponse("Proxy error", { status: 502 });
  }
}
