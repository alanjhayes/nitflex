"use client";

import Image from "next/image";
import { Play, Info } from "lucide-react";
import { tmdbImage } from "@/lib/tmdb";
import { useMovieModal } from "@/components/movie/MovieModalContext";
import { WatchlistButton } from "@/components/movie/WatchlistButton";
import type { TMDBResult } from "@/types/tmdb";

const BLUR_DATA_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%23222222'/%3E%3C/svg%3E";

interface MovieCardProps {
  item: TMDBResult;
  mediaType?: "movie" | "tv";
  priority?: boolean;
}

export function MovieCard({ item, mediaType, priority = false }: MovieCardProps) {
  const { openModal } = useMovieModal();

  const detectedType = mediaType ?? ((item as any).title ? "movie" : "tv");
  const title = (item as any).title ?? (item as any).name ?? "Unknown";
  const poster = item.poster_path;
  const rating = item.vote_average;

  return (
    <div
      className="group relative flex-shrink-0 cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-10"
      onClick={() => openModal(item.id, detectedType)}
    >
      <div className="relative aspect-[2/3] rounded overflow-hidden bg-[#333]">
        {poster ? (
          <Image
            src={tmdbImage(poster, "w342")}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 40vw, (max-width: 1024px) 20vw, 15vw"
            priority={priority}
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm text-center px-2">
            {title}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300" />

        {/* Hover info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black to-transparent">
          <p className="text-sm font-semibold truncate mb-1">{title}</p>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); openModal(item.id, detectedType); }}
                className="bg-white text-black rounded-full w-7 h-7 flex items-center justify-center hover:bg-gray-200 transition"
              >
                <Play className="w-3 h-3 fill-current ml-0.5" />
              </button>
              <WatchlistButton
                tmdbId={item.id}
                mediaType={detectedType}
                title={title}
                poster={poster}
                className="w-7 h-7 text-sm"
              />
            </div>
            {rating > 0 && (
              <span className="text-xs text-green-400 font-semibold">
                {Math.round(rating * 10)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
