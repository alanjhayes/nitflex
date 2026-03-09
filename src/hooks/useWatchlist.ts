"use client";

import { useState, useEffect, useCallback } from "react";

interface WatchlistItem {
  id: string;
  tmdbId: number;
  mediaType: string;
  title: string;
  poster: string | null;
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setWatchlist(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const isInWatchlist = useCallback(
    (tmdbId: number, mediaType: string) =>
      watchlist.some((i) => i.tmdbId === tmdbId && i.mediaType === mediaType),
    [watchlist]
  );

  const addToWatchlist = useCallback(
    async (item: { tmdbId: number; mediaType: string; title: string; poster: string | null }) => {
      const optimistic: WatchlistItem = { id: `temp-${Date.now()}`, ...item };
      setWatchlist((prev) => [...prev, optimistic]);

      try {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        const saved = await res.json();
        setWatchlist((prev) => prev.map((i) => (i.id === optimistic.id ? saved : i)));
      } catch {
        setWatchlist((prev) => prev.filter((i) => i.id !== optimistic.id));
      }
    },
    []
  );

  const removeFromWatchlist = useCallback(async (tmdbId: number, mediaType: string) => {
    setWatchlist((prev) => prev.filter((i) => !(i.tmdbId === tmdbId && i.mediaType === mediaType)));

    try {
      await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, mediaType }),
      });
    } catch {
      // Revert on error - refetch
      fetch("/api/watchlist")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setWatchlist(data); });
    }
  }, []);

  return { watchlist, loading, isInWatchlist, addToWatchlist, removeFromWatchlist };
}
