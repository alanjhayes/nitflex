"use client";

import { useState, useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";

interface AdOverlayProps {
  onComplete: () => void;
  adIframeUrl?: string;
  adImageUrl?: string;
  adVideoUrl?: string;
  adClickUrl?: string;
  adLabel?: string;
  duration?: number;   // total ad duration seconds
  skipAfter?: number;  // seconds before skip available
}

export function AdOverlay({
  onComplete,
  adIframeUrl,
  adImageUrl,
  adVideoUrl,
  adClickUrl,
  adLabel = "Advertisement",
  duration = 15,
  skipAfter = 5,
}: AdOverlayProps) {
  const [secondsLeft, setSecondsLeft] = useState(skipAfter);
  const [canSkip, setCanSkip] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Skip countdown
  useEffect(() => {
    if (secondsLeft <= 0) {
      setCanSkip(true);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  // Auto-complete after duration + tick elapsed for progress bar
  useEffect(() => {
    const t = setTimeout(onComplete, duration * 1000);
    return () => clearTimeout(t);
  }, [duration, onComplete]);

  useEffect(() => {
    if (elapsed >= duration) return;
    const t = setTimeout(() => setElapsed((e) => e + 1), 1000);
    return () => clearTimeout(t);
  }, [elapsed, duration]);

  // Auto-play ad video if provided
  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  return (
    <div className="absolute inset-0 z-20 bg-black flex flex-col">
      {/* Ad content */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {adVideoUrl ? (
          <video
            ref={videoRef}
            src={adVideoUrl}
            className="w-full h-full object-contain"
            muted={false}
            playsInline
            onEnded={onComplete}
          />
        ) : adImageUrl ? (
          <img
            src={adImageUrl}
            alt="Advertisement"
            className="w-full h-full object-contain"
          />
        ) : adIframeUrl ? (
          <iframe
            src={adIframeUrl}
            style={{ border: 0, padding: 0, width: "70%", height: "100%", overflow: "hidden", display: "block", margin: "auto" }}
            scrolling="no"
          />
        ) : (
          /* Placeholder — replace with your actual ad creative */
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-center px-8">
            <p className="text-4xl font-black text-white mb-3">Your Ad Here</p>
            <p className="text-gray-400 text-lg mb-6">Reach millions of viewers on Nitflex</p>
            <p className="text-sm text-gray-500">Contact us to advertise</p>
          </div>
        )}

        {/* Click-through overlay */}
        {adClickUrl && (
          <a
            href={adClickUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

      {/* Ad duration progress bar */}
      <div className="h-1 bg-white/10">
        <div
          className="h-full bg-yellow-400 transition-none"
          style={{ width: `${Math.min((elapsed / duration) * 100, 100)}%` }}
        />
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/80">
        <div className="flex items-center gap-3">
          <span className="text-xs bg-yellow-500 text-black font-bold px-2 py-0.5 rounded">
            AD
          </span>
          <span className="text-xs text-gray-400">{adLabel}</span>
          {adClickUrl && (
            <a
              href={adClickUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
            >
              Learn more <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div>
          {canSkip ? (
            <button
              onClick={onComplete}
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white text-sm px-4 py-1.5 rounded transition"
            >
              Skip Ad →
            </button>
          ) : (
            <div className="text-gray-400 text-sm px-4 py-1.5">
              Skip in {secondsLeft}s
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
