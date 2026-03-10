"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { AdOverlay } from "./AdOverlay";

interface VideoPlayerProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
  onEnded?: () => void;
}

type State =
  | { status: "idle" }
  | { status: "loading" }   // ad showing + extraction running in parallel
  | { status: "waiting" }   // ad done, still waiting for extraction to finish
  | { status: "ready"; proxyUrl: string }
  | { status: "error"; message: string };

type ExtractResult =
  | { ok: true; proxyUrl: string; referer: string }
  | { ok: false; message: string };

async function registerSW(referer: string) {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register("/stream-sw.js", { scope: "/" });
    const msg = { type: "SET_REFERER", referer };
    (reg.active ?? reg.installing ?? reg.waiting)?.postMessage(msg);
    navigator.serviceWorker.controller?.postMessage(msg);
  } catch { /* non-fatal */ }
}

export function VideoPlayer({ tmdbId, mediaType, season, episode, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);
  const [state, setState] = useState<State>({ status: "idle" });

  const extractResultRef = useRef<ExtractResult | null>(null);

  function load() {
    setState({ status: "loading" });
    extractResultRef.current = null;

    const params = new URLSearchParams({
      id: String(tmdbId),
      type: mediaType,
      ...(season != null ? { season: String(season) } : {}),
      ...(episode != null ? { episode: String(episode) } : {}),
    });

    fetch(`/api/stream/extract?${params}`)
      .then(async (res) => {
        const text = await res.text();
        let data: Record<string, string>;
        try { data = JSON.parse(text); } catch {
          return { ok: false, message: `Server error (${res.status})` } as ExtractResult;
        }
        if (!res.ok || data.error) {
          return { ok: false, message: data.error ?? "Stream not found" } as ExtractResult;
        }
        if (data.referer) await registerSW(data.referer);
        return { ok: true, proxyUrl: data.proxyUrl, referer: data.referer } as ExtractResult;
      })
      .catch((err) => ({ ok: false, message: String(err) } as ExtractResult))
      .then((result) => {
        extractResultRef.current = result;
        if (!result.ok) {
          setState({ status: "error", message: result.message });
          return;
        }
        setState((prev) => {
          if (prev.status === "waiting") {
            return { status: "ready", proxyUrl: (result as { ok: true; proxyUrl: string }).proxyUrl };
          }
          return prev;
        });
      });
  }

  const onAdComplete = useCallback(() => {
    const result = extractResultRef.current;
    if (!result) {
      setState({ status: "waiting" });
      return;
    }
    if (!result.ok) {
      setState({ status: "error", message: result.message });
      return;
    }
    setState({ status: "ready", proxyUrl: (result as { ok: true; proxyUrl: string }).proxyUrl });
  }, []);

  useEffect(() => {
    load();
    return () => { hlsRef.current?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmdbId, mediaType, season, episode]);

  useEffect(() => {
    if (state.status !== "ready" || !videoRef.current) return;
    const video = videoRef.current;

    async function initPlayer() {
      const Hls = (await import("hls.js")).default;
      if (Hls.isSupported()) {
        hlsRef.current?.destroy();
        const hls = new Hls({ enableWorker: false });
        hlsRef.current = hls;
        hls.loadSource((state as { proxyUrl: string }).proxyUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) setState({ status: "error", message: "Playback error — try again" });
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = (state as { proxyUrl: string }).proxyUrl;
        video.play().catch(() => {});
      } else {
        setState({ status: "error", message: "HLS not supported in this browser" });
      }
    }

    initPlayer();
  }, [state]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {state.status === "loading" && (
        <AdOverlay
          onComplete={onAdComplete}
          duration={15}
          skipAfter={5}
          adIframeUrl="//acceptable.a-ads.com/2429932/?size=Adaptive"
        />
      )}

      {state.status === "waiting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
          <Loader2 className="w-10 h-10 animate-spin text-[#e50914]" />
          <p className="text-sm text-gray-400">Loading stream&hellip;</p>
        </div>
      )}

      {state.status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white px-8 text-center">
          <AlertCircle className="w-10 h-10 text-[#e50914]" />
          <p className="text-gray-300">{state.message}</p>
          <button
            onClick={load}
            className="flex items-center gap-2 bg-[#e50914] hover:bg-[#c40712] text-white px-5 py-2 rounded font-semibold transition"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      )}

      <video
        ref={videoRef}
        className={`w-full h-full ${state.status === "ready" ? "block" : "hidden"}`}
        controls
        playsInline
        onEnded={onEnded}
      />
    </div>
  );
}
