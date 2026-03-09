"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Info } from "lucide-react";
import { tmdbImage } from "@/lib/tmdb";
import { useMovieModal } from "@/components/movie/MovieModalContext";
import { WatchlistButton } from "@/components/movie/WatchlistButton";
import type { TMDBResult } from "@/types/tmdb";

interface HeroBannerProps {
  items: TMDBResult[];
}

export function HeroBanner({ items }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(Math.floor(Math.random() * Math.min(5, items.length)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { openModal } = useMovieModal();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.min(5, items.length));
    }, 8000);
    return () => clearInterval(interval);
  }, [items.length]);

  const current = items[currentIndex];
  if (!current) return null;

  const title = (current as any).title ?? (current as any).name ?? "";
  const mediaType: "movie" | "tv" = (current as any).title ? "movie" : "tv";

  return (
    <div className="relative h-[56vw] max-h-[85vh] min-h-[400px]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black">
        {current.backdrop_path && (
          <Image
            src={tmdbImage(current.backdrop_path, "w1280")}
            alt={title}
            fill
            className="object-cover opacity-70"
            priority
          />
        )}
      </div>

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#141414] to-transparent" />

      {/* Content */}
      <div className="absolute bottom-[20%] left-4 md:left-16 max-w-lg z-10">
        <h1 className="text-3xl md:text-5xl font-bold mb-3 drop-shadow-lg">{title}</h1>
        {current.overview && (
          <p className="text-sm md:text-base text-gray-200 mb-5 line-clamp-3 drop-shadow">
            {current.overview}
          </p>
        )}
        <div className="flex gap-3">
          <Link
            href={`/watch?tmdbid=${current.id}&type=${mediaType}${mediaType === "tv" ? "&season=1&episode=1" : ""}`}
            className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded font-semibold hover:bg-gray-200 transition"
          >
            <Play className="w-5 h-5 fill-current" />
            Play
          </Link>
          <button
            onClick={() => openModal(current.id, mediaType)}
            className="flex items-center gap-2 bg-gray-500/70 text-white px-6 py-2.5 rounded font-semibold hover:bg-gray-500/90 transition"
          >
            <Info className="w-5 h-5" />
            More Info
          </button>
          <WatchlistButton
            tmdbId={current.id}
            mediaType={mediaType}
            title={title}
            poster={current.poster_path}
          />
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-[12%] right-8 flex gap-2 z-10">
        {items.slice(0, 5).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? "bg-white w-6" : "bg-gray-500"}`}
          />
        ))}
      </div>
    </div>
  );
}
