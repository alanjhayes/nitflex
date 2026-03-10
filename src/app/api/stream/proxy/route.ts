import { NextResponse } from "next/server";
import { verifyStreamToken } from "@/lib/streamToken";

// Proxies m3u8 playlists server-side (CDN blocks CORS reads of .m3u8 files).
// Segments are left as absolute CDN URLs — the Service Worker injects the correct Referer.
// Master m3u8:  ?token=MASTER          → rewrites m3u8 child URLs through proxy, segments → absolute CDN
// Variant m3u8: ?token=MASTER&v=URL64  → same rewriting
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return new NextResponse("Missing token", { status: 400 });

  let masterUrl: string;
  let referer: string;
  try {
    ({ url: masterUrl, referer } = verifyStreamToken(token));
  } catch (err) {
    return new NextResponse(String(err), { status: 403 });
  }

  // ?v= carries a base64url-encoded child URL (authenticated by the master token above)
  const variantParam = searchParams.get("v");
  const targetUrl = variantParam
    ? Buffer.from(variantParam, "base64url").toString()
    : masterUrl;

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": referer,
      },
    });

    if (!res.ok) {
      return new NextResponse(`Upstream ${res.status}`, { status: res.status });
    }

    let text = await res.text();

    // Rewrite URLs in the playlist:
    // - m3u8 child URLs → proxy through server (CDN blocks CORS reads of .m3u8)
    // - Segment URLs → absolute CDN URLs (Service Worker injects Referer from ?headers= param)
    text = text.replace(/^([^#\s][^\s]*)$/gm, (line) => {
      // Resolve to absolute URL, preserving raw characters (+ and = in CDN paths)
      let absolute: string;
      if (line.startsWith("http")) {
        absolute = line;
      } else if (line.startsWith("/")) {
        absolute = `${parsed.protocol}//${parsed.host}${line}`;
      } else {
        // Relative: resolve against the directory of the current playlist URL
        const base = targetUrl.replace(/\?.*$/, "").replace(/\/[^/]*$/, "/");
        absolute = base + line;
      }

      if (/\.m3u8/.test(absolute)) {
        // Variant m3u8 playlists → server proxy (CORS blocks SW reads)
        const v = Buffer.from(absolute).toString("base64url");
        return `/api/stream/proxy?token=${token}&v=${v}`;
      }

      // Segments from CDNs that enforce Origin checks (e.g. storm.vodvidl.site)
      // encode their required headers in ?headers=. The SW can't spoof Origin,
      // so route these through our server which can set any header.
      try {
        const segUrl = new URL(absolute);
        if (segUrl.searchParams.has("headers")) {
          const v = Buffer.from(absolute).toString("base64url");
          return `/api/stream/segment?token=${token}&v=${v}`;
        }
      } catch { /* not a valid URL — fall through */ }

      // All other segments → absolute CDN URL, Service Worker injects Referer
      return absolute;
    });

    return new NextResponse(text, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("m3u8 proxy error:", err);
    return new NextResponse("Proxy error", { status: 502 });
  }
}
