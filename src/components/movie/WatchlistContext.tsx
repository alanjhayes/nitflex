"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

interface WatchlistItem {
  id: string;
  tmdbId: number;
  mediaType: string;
  title: string;
  poster: string | null;
}

interface WatchlistContextType {
  watchlist: WatchlistItem[];
  loading: boolean;
  isInWatchlist: (tmdbId: number, mediaType: string) => boolean;
  addToWatchlist: (item: { tmdbId: number; mediaType: string; title: string; poster: string | null }) => Promise<void>;
  removeFromWatchlist: (tmdbId: number, mediaType: string) => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextType | null>(null);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setWatchlist(data); })
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
      fetch("/api/watchlist")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setWatchlist(data); });
    }
  }, []);

  return (
    <WatchlistContext.Provider value={{ watchlist, loading, isInWatchlist, addToWatchlist, removeFromWatchlist }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be used within WatchlistProvider");
  return ctx;
}
