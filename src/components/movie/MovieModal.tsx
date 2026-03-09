"use client";

import { useEffect, useState } from "react";
import { X, Star, Clock, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMovieModal } from "./MovieModalContext";
import { WatchlistButton } from "./WatchlistButton";
import type { TMDBDetails, TMDBVideo, TMDBCastMember } from "@/types/tmdb";
import { tmdbImage } from "@/lib/tmdb";

export function MovieModal() {
  const { modalState, closeModal } = useMovieModal();
  const [details, setDetails] = useState<TMDBDetails | null>(null);
  const [videos, setVideos] = useState<TMDBVideo[]>([]);
  const [cast, setCast] = useState<TMDBCastMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!modalState) {
      setDetails(null);
      setVideos([]);
      setCast([]);
      return;
    }

    setLoading(true);
    const { id, mediaType } = modalState;

    Promise.all([
      fetch(`/api/tmdb/details?id=${id}&type=${mediaType}`).then((r) => r.json()),
      fetch(`/api/tmdb/videos?id=${id}&type=${mediaType}`).then((r) => r.json()),
      fetch(`/api/tmdb/credits?id=${id}&type=${mediaType}`).then((r) => r.json()),
    ])
      .then(([d, v, c]) => {
        setDetails(d);
        setVideos(v);
        setCast(c);
      })
      .finally(() => setLoading(false));
  }, [modalState]);

  if (!modalState) return null;

  const trailer = videos.find((v) => v.type === "Trailer" && v.site === "YouTube") ?? videos[0];
  const title = details?.title ?? details?.name ?? "";
  const year = (details?.release_date ?? details?.first_air_date ?? "").slice(0, 4);

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={closeModal}
    >
      <div
        className="relative bg-[#181818] rounded-xl w-full max-w-3xl my-auto overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 z-10 bg-[#181818] rounded-full p-1 hover:bg-[#333] transition"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Trailer / backdrop */}
        <div className="relative aspect-video bg-black">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : trailer ? (
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1`}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          ) : details?.backdrop_path ? (
            <Image
              src={tmdbImage(details.backdrop_path, "w1280")}
              alt={title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[#333] flex items-center justify-center text-gray-500">
              No preview available
            </div>
          )}

          {/* Gradient overlay for text */}
          {!trailer && (
            <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent" />
          )}
        </div>

        {/* Content */}
        <div className="p-6 -mt-12 relative z-10">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">{loading ? "Loading..." : title}</h2>
              {!loading && (
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  {year && <span>{year}</span>}
                  {details?.runtime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
                    </span>
                  )}
                  {details?.number_of_seasons && (
                    <span>{details.number_of_seasons} Season{details.number_of_seasons > 1 ? "s" : ""}</span>
                  )}
                  {details?.vote_average && (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-3 h-3 fill-current" />
                      {details.vote_average.toFixed(1)}
                    </span>
                  )}
                </div>
              )}
            </div>
            {details && (
              <WatchlistButton
                tmdbId={modalState.id}
                mediaType={modalState.mediaType}
                title={title}
                poster={details.poster_path}
                className="flex-shrink-0"
              />
            )}
          </div>

          {/* Watch button */}
          {!loading && (
            <Link
              href={`/watch?tmdbid=${modalState.id}&type=${modalState.mediaType}${modalState.mediaType === "tv" ? "&season=1&episode=1" : ""}`}
              onClick={closeModal}
              className="inline-flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded font-semibold hover:bg-gray-200 transition mb-4"
            >
              <Play className="w-4 h-4 fill-current" />
              Watch Now
            </Link>
          )}

          {details?.tagline && (
            <p className="text-gray-400 italic text-sm mb-3">{details.tagline}</p>
          )}

          {loading ? (
            <div className="space-y-2">
              <div className="h-4 bg-[#333] rounded animate-pulse w-full" />
              <div className="h-4 bg-[#333] rounded animate-pulse w-5/6" />
              <div className="h-4 bg-[#333] rounded animate-pulse w-4/6" />
            </div>
          ) : (
            <p className="text-gray-300 text-sm leading-relaxed mb-4">{details?.overview}</p>
          )}

          {details?.genres && details.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {details.genres.map((g) => (
                <span key={g.id} className="text-xs px-2 py-1 bg-[#333] rounded-full text-gray-300">
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {cast.length > 0 && (
            <div>
              <p className="text-gray-400 text-sm mb-2">
                <span className="text-gray-500">Cast: </span>
                {cast.slice(0, 5).map((c) => c.name).join(", ")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
