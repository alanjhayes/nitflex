"use client";

import { Plus, Check } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";

interface WatchlistButtonProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  poster: string | null;
  className?: string;
}

export function WatchlistButton({ tmdbId, mediaType, title, poster, className = "" }: WatchlistButtonProps) {
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const inList = isInWatchlist(tmdbId, mediaType);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inList) {
      removeFromWatchlist(tmdbId, mediaType);
    } else {
      addToWatchlist({ tmdbId, mediaType, title, poster });
    }
  };

  return (
    <button
      onClick={toggle}
      title={inList ? "Remove from My List" : "Add to My List"}
      className={`rounded-full border-2 border-white/70 hover:border-white w-10 h-10 flex items-center justify-center transition-all hover:scale-110 ${className}`}
    >
      {inList ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
    </button>
  );
}
