import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signStreamToken } from "@/lib/streamToken";
import type { Browser } from "playwright";

// In-memory cache — cleared on server restart (i.e. new session)
const memoryCache = new Map<string, { m3u8Url: string; referer: string }>();

// Persistent browser singleton — eliminates ~3-5s Chromium startup per request
let browserInstance: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance?.isConnected()) return browserInstance;
  if (browserPromise) return browserPromise;

  browserPromise = (async () => {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    browser.on("disconnected", () => {
      browserInstance = null;
      browserPromise = null;
    });
    browserInstance = browser;
    return browser;
  })();

  return browserPromise;
}

function cacheKey(id: number, type: string, season: number | null, episode: number | null) {
  return `${id}:${type}:${season ?? -1}:${episode ?? -1}`;
}

// ---------------------------------------------------------------------------
// Provider definitions — tried in order until one yields an m3u8 URL
// ---------------------------------------------------------------------------
interface Provider {
  name: string;
  buildUrl: (id: number, type: "movie" | "tv", season?: number, episode?: number) => string;
  defaultReferer: string;
  timeoutMs: number;
}

const PROVIDERS: Provider[] = [
  {
    name: "vidlink",
    buildUrl: (id, type, season, episode) =>
      type === "movie"
        ? `https://vidlink.pro/movie/${id}?primaryColor=E50914&title=false&poster=false`
        : `https://vidlink.pro/tv/${id}/${season ?? 1}/${episode ?? 1}?primaryColor=E50914&title=false&poster=false`,
    defaultReferer: "https://vidlink.pro/",
    timeoutMs: 20000,
  },
  {
    name: "vidsrc",
    buildUrl: (id, type, season, episode) =>
      type === "movie"
        ? `https://vidsrc.to/embed/movie/${id}`
        : `https://vidsrc.to/embed/tv/${id}/${season ?? 1}/${episode ?? 1}`,
    defaultReferer: "https://vidsrc.to/",
    timeoutMs: 20000,
  },
  {
    name: "embed.su",
    buildUrl: (id, type, season, episode) =>
      type === "movie"
        ? `https://embed.su/embed/movie/${id}`
        : `https://embed.su/embed/tv/${id}/${season ?? 1}/${episode ?? 1}`,
    defaultReferer: "https://embed.su/",
    timeoutMs: 20000,
  },
  {
    name: "2embed",
    buildUrl: (id, type, season, episode) =>
      type === "movie"
        ? `https://www.2embed.cc/embed/${id}`
        : `https://www.2embed.cc/embedtv/${id}&s=${season ?? 1}&e=${episode ?? 1}`,
    defaultReferer: "https://www.2embed.cc/",
    timeoutMs: 20000,
  },
];

// ---------------------------------------------------------------------------
// Playwright extraction — provider-agnostic
// ---------------------------------------------------------------------------
async function extractFromProvider(
  embedUrl: string,
  defaultReferer: string,
  timeoutMs: number,
): Promise<{ m3u8Url: string; referer: string } | null> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.route("**/*.{png,jpg,jpeg,gif,svg,webp,ico,woff,woff2,ttf,eot,css}", (route) =>
      route.abort()
    );

    let resolved = false;
    const found = new Promise<{ m3u8Url: string; referer: string } | null>((resolve) => {
      // 1. Catch direct .m3u8 network requests (most reliable)
      page.on("request", (req) => {
        if (resolved) return;
        if (req.url().includes(".m3u8")) {
          resolved = true;
          const referer = req.headers()["referer"] ?? defaultReferer;
          resolve({ m3u8Url: req.url(), referer });
        }
      });

      // 2. Catch API responses whose body contains a .m3u8 URL (fires earlier)
      page.on("response", async (res) => {
        if (resolved) return;
        const ct = res.headers()["content-type"] ?? "";
        if (!ct.includes("json") && !ct.includes("javascript") && !ct.includes("text")) return;
        try {
          const text = await res.text();
          const match = text.match(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/);
          if (match) {
            resolved = true;
            const referer = res.request().headers()["referer"] ?? defaultReferer;
            resolve({ m3u8Url: match[0], referer });
          }
        } catch { /* binary or unreadable response */ }
      });
    });

    page.goto(embedUrl, { timeout: timeoutMs }).catch(() => {});

    return await Promise.race([
      found,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } finally {
    await page.close().catch(() => {});
  }
}

async function extractWithFallbacks(
  id: number,
  type: "movie" | "tv",
  season?: number,
  episode?: number,
): Promise<{ m3u8Url: string; referer: string } | null> {
  for (const provider of PROVIDERS) {
    const embedUrl = provider.buildUrl(id, type, season, episode);
    console.log(`[stream] trying provider: ${provider.name} — ${embedUrl}`);
    try {
      const result = await extractFromProvider(embedUrl, provider.defaultReferer, provider.timeoutMs);
      if (result) {
        console.log(`[stream] success via ${provider.name}`);
        return result;
      }
      console.log(`[stream] ${provider.name} returned no m3u8, trying next provider`);
    } catch (err) {
      console.warn(`[stream] ${provider.name} threw:`, err);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    const type = (searchParams.get("type") ?? "movie") as "movie" | "tv";
    const season = searchParams.get("season") ? Number(searchParams.get("season")) : null;
    const episode = searchParams.get("episode") ? Number(searchParams.get("episode")) : null;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const key = cacheKey(id, type, season, episode);

    // 1. Check in-memory cache (same server session only)
    const memoryCached = memoryCache.get(key);
    if (memoryCached) {
      const token = signStreamToken(memoryCached.m3u8Url, memoryCached.referer);
      const proxyUrl = `/api/stream/proxy?token=${token}`;
      return NextResponse.json({ proxyUrl, cached: true });
    }

    // 2. Try providers in order until one yields an m3u8
    const result = await extractWithFallbacks(
      id,
      type,
      season ?? undefined,
      episode ?? undefined,
    );

    if (!result) {
      return NextResponse.json({ error: "Stream not available" }, { status: 404 });
    }

    // 3. Cache the result
    memoryCache.set(key, result);

    await prisma.streamCache.upsert({
      where: {
        tmdbId_mediaType_season_episode: {
          tmdbId: id,
          mediaType: type,
          season: season ?? -1,
          episode: episode ?? -1,
        },
      },
      update: { m3u8Url: result.m3u8Url, referer: result.referer, cachedAt: new Date() },
      create: {
        tmdbId: id,
        mediaType: type,
        season: season ?? -1,
        episode: episode ?? -1,
        m3u8Url: result.m3u8Url,
        referer: result.referer,
      },
    });

    const token = signStreamToken(result.m3u8Url, result.referer);
    const proxyUrl = `/api/stream/proxy?token=${token}`;
    return NextResponse.json({ proxyUrl, referer: result.referer, cached: false });
  } catch (err) {
    console.error("Stream extract error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
