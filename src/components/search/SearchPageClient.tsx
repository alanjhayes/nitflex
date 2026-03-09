"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { MovieCard } from "@/components/home/MovieCard";
import type { TMDBSearchResult } from "@/types/tmdb";

export function SearchPageClient() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [results, setResults] = useState<TMDBSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 400);
  const router = useRouter();

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      router.replace("/search");
      return;
    }
    setLoading(true);
    router.replace(`/search?q=${encodeURIComponent(debouncedQuery)}`);
    fetch(`/api/tmdb/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setResults(data); })
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  return (
    <div className="pt-24 px-4 md:px-16 pb-16">
      <div className="relative max-w-xl mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for movies, TV shows..."
          autoFocus
          className="w-full bg-[#333] text-white pl-12 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-gray-500"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-[#333] rounded animate-pulse" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <>
          <p className="text-gray-400 text-sm mb-4">{results.length} results for &ldquo;{query}&rdquo;</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {results.map((item) => (
              <MovieCard
                key={`${item.id}-${item.media_type}`}
                item={item as any}
                mediaType={item.media_type === "tv" ? "tv" : "movie"}
              />
            ))}
          </div>
        </>
      ) : query ? (
        <div className="text-center text-gray-500 mt-16">
          <p className="text-xl mb-2">No results found</p>
          <p className="text-sm">Try a different search term</p>
        </div>
      ) : (
        <div className="text-center text-gray-500 mt-16">
          <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-xl">Search for movies and TV shows</p>
        </div>
      )}
    </div>
  );
}
