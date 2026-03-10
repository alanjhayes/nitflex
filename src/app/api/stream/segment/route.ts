import { NextResponse } from "next/server";
import { verifyStreamToken } from "@/lib/streamToken";

// Proxies individual HLS segments server-side for CDNs that enforce CORS Origin checks.
// Authenticated by the same signed token as the parent m3u8 to prevent abuse.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const v = searchParams.get("v");

  if (!token || !v) return new NextResponse("Missing params", { status: 400 });

  try {
    verifyStreamToken(token);
  } catch (err) {
    return new NextResponse(String(err), { status: 403 });
  }

  const segmentUrl = Buffer.from(v, "base64url").toString();

  // Extract the Origin/Referer the CDN requires from the ?headers= query param
  let origin = "https://videostr.net";
  let referer = "https://videostr.net/";
  try {
    const parsed = new URL(segmentUrl);
    const h = parsed.searchParams.get("headers");
    if (h) {
      const obj = JSON.parse(h);
      if (obj.origin) origin = obj.origin;
      if (obj.referer) referer = obj.referer;
    }
  } catch { /* use defaults */ }

  try {
    const res = await fetch(segmentUrl, {
      headers: {
        "Origin": origin,
        "Referer": referer,
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) return new NextResponse(`Upstream ${res.status}`, { status: res.status });

    return new NextResponse(res.body, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "video/MP2T",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[segment proxy] error:", err);
    return new NextResponse("Segment proxy error", { status: 502 });
  }
}
