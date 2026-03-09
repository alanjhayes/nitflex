"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { AdOverlay } from "./AdOverlay";

interface VideoPlayerProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
}

type State =
  | { status: "idle" }
  | { status: "extracting" }
  | { status: "ad"; proxyUrl: string; referer: string }
  | { status: "ready"; proxyUrl: string; referer: string }
  | { status: "error"; message: string };

async function registerSW(referer: string) {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register("/stream-sw.js", { scope: "/" });
    const sw = reg.active ?? reg.installing ?? reg.waiting;
    if (sw) {
      sw.postMessage({ type: "SET_REFERER", referer });
    }
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SET_REFERER", referer });
    }
  } catch (err) {
    console.warn("SW registration failed:", err);
  }
}

export function VideoPlayer({ tmdbId, mediaType, season, episode }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);
  const [state, setState] = useState<State>({ status: "idle" });

  async function load() {
    setState({ status: "extracting" });
    try {
      const params = new URLSearchParams({
        id: String(tmdbId),
        type: mediaType,
        ...(season != null ? { season: String(season) } : {}),
        ...(episode != null ? { episode: String(episode) } : {}),
      });

      const res = await fetch(`/api/stream/extract?${params}`);
      const text = await res.text();
      let data: Record<string, string>;
      try {
        data = JSON.parse(text);
      } catch {
        setState({ status: "error", message: `Server error (${res.status})` });
        return;
      }

      if (!res.ok || data.error) {
        setState({ status: "error", message: data.error ?? "Stream not found" });
        return;
      }

      // Register SW with correct referer before HLS starts fetching segments
      await registerSW(data.referer);

      // Show pre-roll ad before playback
      setState({ status: "ad", proxyUrl: data.proxyUrl, referer: data.referer });
    } catch (err) {
      setState({ status: "error", message: String(err) });
    }
  }

  const startPlayback = useCallback(() => {
    if (state.status !== "ad") return;
    setState({ status: "ready", proxyUrl: state.proxyUrl, referer: state.referer });
  }, [state]);

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
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            setState({ status: "error", message: "Playback error — try again" });
          }
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
      {state.status === "extracting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
          <Loader2 className="w-10 h-10 animate-spin text-[#e50914]" />
          <p className="text-sm text-gray-400">Loading stream&hellip;</p>
        </div>
      )}

      {state.status === "ad" && (
        <AdOverlay
          onComplete={startPlayback}
          duration={15}
          skipAfter={5}
          adIframeUrl="//acceptable.a-ads.com/2429932/?size=Adaptive"
        />
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
      />
    </div>
  );
}
