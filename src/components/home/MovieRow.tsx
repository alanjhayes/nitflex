"use client";

import { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MovieCard } from "./MovieCard";
import type { TMDBResult } from "@/types/tmdb";

interface MovieRowProps {
  title: string;
  items: TMDBResult[];
  mediaType?: "movie" | "tv";
  priorityCount?: number;
}

export function MovieRow({ title, items, mediaType, priorityCount = 0 }: MovieRowProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    dragFree: true,
    slidesToScroll: "auto",
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (!items.length) return null;

  return (
    <div className="group/row mb-8">
      <h2 className="text-xl font-semibold mb-3 px-4 md:px-8">{title}</h2>
      <div className="relative">
        {/* Prev button */}
        <button
          onClick={scrollPrev}
          className="absolute left-0 top-0 bottom-0 z-10 w-12 flex items-center justify-center bg-gradient-to-r from-black/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity hover:from-black"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        <div className="overflow-hidden px-4 md:px-8" ref={emblaRef}>
          <div className="flex gap-2">
            {items.map((item, i) => (
              <div key={`${title}-${item.id}`} className="flex-[0_0_calc(50%-4px)] sm:flex-[0_0_calc(33%-5px)] md:flex-[0_0_calc(20%-6px)] lg:flex-[0_0_calc(16.66%-7px)]">
                <MovieCard item={item} mediaType={mediaType} priority={i < priorityCount} />
              </div>
            ))}
          </div>
        </div>

        {/* Next button */}
        <button
          onClick={scrollNext}
          className="absolute right-0 top-0 bottom-0 z-10 w-12 flex items-center justify-center bg-gradient-to-l from-black/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity hover:from-black"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
}
