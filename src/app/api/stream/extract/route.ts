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
    const browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
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
  referer: string;
  timeoutMs: number;
}

const PROVIDERS: Provider[] = [
  {
    name: "vidlink",
    buildUrl: (id, type, season, episode) =>
      type === "movie"
        ? `https://vidlink.pro/movie/${id}?primaryColor=E50914&title=false&poster=false`
        : `https://vidlink.pro/tv/${id}/${season ?? 1}/${episode ?? 1}?primaryColor=E50914&title=false&poster=false`,
    referer: "https://vidlink.pro/",
    timeoutMs: 30000,
  },
  {
    name: "vidsrc",
    buildUrl: (id, type, season, episode) =>
      type === "movie"
        ? `https://vidsrc.to/embed/movie/${id}`
        : `https://vidsrc.to/embed/tv/${id}/${season ?? 1}/${episode ?? 1}`,
    referer: "https://vidsrc.to/",
    timeoutMs: 25000,
  },
  {
    name: "embed.su",
    buildUrl: (id, type, season, episode) =>
      type === "movie"
        ? `https://embed.su/embed/movie/${id}`
        : `https://embed.su/embed/tv/${id}/${season ?? 1}/${episode ?? 1}`,
    referer: "https://embed.su/",
    timeoutMs: 25000,
  },
  {
    name: "2embed",
    buildUrl: (id, type, season, episode) =>
      type === "movie"
        ? `https://www.2embed.cc/embed/${id}`
        : `https://www.2embed.cc/embedtv/${id}&s=${season ?? 1}&e=${episode ?? 1}`,
    referer: "https://www.2embed.cc/",
    timeoutMs: 25000,
  },
];

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// Playwright extraction — provider-agnostic
// ---------------------------------------------------------------------------
async function extractFromProvider(
  provider: Provider,
  embedUrl: string,
): Promise<{ m3u8Url: string; referer: string } | null> {
  const browser = await getBrowser();

  // Fresh context per request: own UA, viewport, and init script to mask webdriver
  const context = await browser.newContext({
    userAgent: DESKTOP_UA,
    viewport: { width: 1280, height: 720 },
    extraHTTPHeaders: { Referer: provider.referer },
  });

  // Mask navigator.webdriver so providers don't detect headless Chromium
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    // @ts-ignore
    delete window.__playwright;
    // @ts-ignore
    delete window.__pwInitScripts;
  });

  const page = await context.newPage();
  let resolved = false;

  try {
    // Only block images/fonts — allow CSS & JS so player can initialise
    await page.route("**/*.{png,jpg,jpeg,gif,webp,ico,woff,woff2,ttf,eot}", (route) =>
      route.abort()
    );

    const found = new Promise<{ m3u8Url: string; referer: string }>((resolve) => {
      // 1. Direct .m3u8 network request (fastest)
      page.on("request", (req) => {
        if (resolved) return;
        if (req.url().includes(".m3u8")) {
          resolved = true;
          resolve({
            m3u8Url: req.url(),
            referer: req.headers()["referer"] ?? provider.referer,
          });
        }
      });

      // 2. Response body scan — catches API responses that embed the URL in JSON
      page.on("response", async (res) => {
        if (resolved) return;
        const ct = res.headers()["content-type"] ?? "";
        if (!ct.includes("json") && !ct.includes("javascript") && !ct.includes("text")) return;
        try {
          const text = await res.text();
          if (resolved) return; // re-check after async gap
          const match = text.match(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/);
          if (match) {
            resolved = true;
            resolve({
              m3u8Url: match[0],
              referer: res.request().headers()["referer"] ?? provider.referer,
            });
          }
        } catch { /* page closed or response unreadable */ }
      });
    });

    page.goto(embedUrl, { timeout: provider.timeoutMs }).catch(() => {});

    const result = await Promise.race([
      found,
      new Promise<null>((res) => setTimeout(() => res(null), provider.timeoutMs)),
    ]);

    return result;
  } finally {
    // context.close() closes the page and all associated resources
    await context.close().catch(() => {});
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
    console.log(`[stream] trying ${provider.name} — ${embedUrl}`);
    try {
      const result = await extractFromProvider(provider, embedUrl);
      if (result) {
        console.log(`[stream] success via ${provider.name}: ${result.m3u8Url}`);
        return result;
      }
      console.log(`[stream] ${provider.name}: no m3u8 found within ${provider.timeoutMs}ms`);
    } catch (err) {
      console.warn(`[stream] ${provider.name} error:`, err);
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
      return NextResponse.json({ proxyUrl: `/api/stream/proxy?token=${token}`, cached: true });
    }

    // 2. Try providers in order until one yields an m3u8
    const result = await extractWithFallbacks(id, type, season ?? undefined, episode ?? undefined);

    if (!result) {
      return NextResponse.json({ error: "Stream not available" }, { status: 404 });
    }

    // 3. Cache the result
    memoryCache.set(key, result);

    await prisma.streamCache.upsert({
      where: {
        tmdbId_mediaType_season_episode: { tmdbId: id, mediaType: type, season: season ?? -1, episode: episode ?? -1 },
      },
      update: { m3u8Url: result.m3u8Url, referer: result.referer, cachedAt: new Date() },
      create: { tmdbId: id, mediaType: type, season: season ?? -1, episode: episode ?? -1, m3u8Url: result.m3u8Url, referer: result.referer },
    });

    const token = signStreamToken(result.m3u8Url, result.referer);
    return NextResponse.json({ proxyUrl: `/api/stream/proxy?token=${token}`, referer: result.referer, cached: false });
  } catch (err) {
    console.error("[stream] extract error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
