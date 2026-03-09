"use client";

import { BookMarked } from "lucide-react";
import { useMovieModal } from "@/components/movie/MovieModalContext";
import { tmdbImage } from "@/lib/tmdb";
import Image from "next/image";

interface WatchlistItem {
  id: string;
  tmdbId: number;
  mediaType: string;
  title: string;
  poster: string | null;
}

export function MyListClient({ initialItems }: { initialItems: WatchlistItem[] }) {
  const { openModal } = useMovieModal();

  if (initialItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-500">
        <BookMarked className="w-20 h-20 mb-4 opacity-30" />
        <p className="text-xl">Your list is empty</p>
        <p className="text-sm mt-2">Add movies and shows to watch later</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {initialItems.map((item) => (
        <div
          key={item.id}
          className="group relative cursor-pointer"
          onClick={() => openModal(item.tmdbId, item.mediaType as "movie" | "tv")}
        >
          <div className="relative aspect-[2/3] rounded overflow-hidden bg-[#333]">
            {item.poster ? (
              <Image
                src={tmdbImage(item.poster, "w342")}
                alt={item.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm text-center px-2">
                {item.title}
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
          </div>
          <p className="mt-2 text-sm text-gray-300 truncate">{item.title}</p>
        </div>
      ))}
    </div>
  );
}
