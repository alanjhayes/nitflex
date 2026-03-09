"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";
import type { TMDBDetails } from "@/types/tmdb";
import type { TVSeason } from "@/lib/tmdb";
import { tmdbImage } from "@/lib/tmdb";
import Image from "next/image";
import { VideoPlayer } from "./VideoPlayer";

interface WatchClientProps {
  details: TMDBDetails;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
  seasonData: TVSeason | null;
  totalSeasons: number;
}

export function WatchClient({
  details,
  mediaType,
  season,
  episode,
  seasonData,
  totalSeasons,
}: WatchClientProps) {
  const router = useRouter();
  const topBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (topBarRef.current) {
      const h = topBarRef.current.offsetHeight;
      window.scrollTo({ top: h, behavior: "instant" });
    }
  }, []);

  const [currentSeason, setCurrentSeason] = useState(season ?? 1);
  const [currentEpisode, setCurrentEpisode] = useState(episode ?? 1);
  const [loadedSeasons, setLoadedSeasons] = useState<Record<number, TVSeason>>({
    ...(seasonData ? { [season ?? 1]: seasonData } : {}),
  });
  const [loadingSeason, setLoadingSeason] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);

  const title = details.title ?? details.name ?? "Unknown";

  const loadSeason = useCallback(async (s: number) => {
    if (loadedSeasons[s]) {
      setCurrentSeason(s);
      setCurrentEpisode(1);
      return;
    }
    setLoadingSeason(true);
    try {
      const res = await fetch(`/api/tmdb/season?id=${details.id}&season=${s}`);
      const data: TVSeason = await res.json();
      setLoadedSeasons((prev) => ({ ...prev, [s]: data }));
      setCurrentSeason(s);
      setCurrentEpisode(1);
    } finally {
      setLoadingSeason(false);
    }
  }, [details.id, loadedSeasons]);

  const selectEpisode = (ep: number) => {
    setCurrentEpisode(ep);
    setShowEpisodes(false);
  };

  const currentSeasonData = loadedSeasons[currentSeason];
  const currentEpisodeData = currentSeasonData?.episodes.find(
    (e) => e.episode_number === currentEpisode
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Top bar */}
      <div ref={topBarRef} className="flex items-center gap-4 px-4 py-3 bg-black/60 backdrop-blur-sm z-20 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm hidden sm:inline">Back</span>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base truncate">{title}</h1>
          {mediaType === "tv" && (
            <p className="text-xs text-gray-400">
              S{currentSeason} · E{currentEpisode}
              {currentEpisodeData ? ` — ${currentEpisodeData.name}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Player */}
      <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
        <VideoPlayer
          tmdbId={details.id}
          mediaType={mediaType}
          season={currentSeason}
          episode={currentEpisode}
        />
      </div>

      {/* Info + episode panel */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* Left: info */}
        <div className="flex-1 px-4 py-4 overflow-y-auto">
          <div className="flex gap-4">
            {details.poster_path && (
              <div className="relative w-24 flex-shrink-0 rounded overflow-hidden aspect-[2/3] hidden sm:block">
                <Image
                  src={tmdbImage(details.poster_path, "w185")}
                  alt={title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg mb-1">{title}</h2>
              <div className="flex flex-wrap gap-3 text-sm text-gray-400 mb-3">
                {(details.release_date ?? details.first_air_date) && (
                  <span>{(details.release_date ?? details.first_air_date ?? "").slice(0, 4)}</span>
                )}
                {details.runtime && (
                  <span>{Math.floor(details.runtime / 60)}h {details.runtime % 60}m</span>
                )}
                {details.number_of_seasons && (
                  <span>{details.number_of_seasons} Season{details.number_of_seasons > 1 ? "s" : ""}</span>
                )}
                {details.vote_average > 0 && (
                  <span className="text-yellow-400">★ {details.vote_average.toFixed(1)}</span>
                )}
              </div>
              {details.genres && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {details.genres.map((g) => (
                    <span key={g.id} className="text-xs px-2 py-0.5 bg-[#222] rounded-full text-gray-400">
                      {g.name}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-300 leading-relaxed line-clamp-4">{details.overview}</p>
            </div>
          </div>
        </div>

        {/* Right: TV episode selector */}
        {mediaType === "tv" && (
          <div className="lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-[#222] flex flex-col">
            <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between">
              <span className="text-sm font-semibold">Episodes</span>
              <div className="relative">
                <button
                  onClick={() => setShowEpisodes(!showEpisodes)}
                  className="flex items-center gap-1 text-sm bg-[#222] hover:bg-[#333] px-3 py-1.5 rounded transition"
                >
                  Season {currentSeason}
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showEpisodes && (
                  <div className="absolute right-0 top-9 bg-[#181818] border border-[#333] rounded shadow-xl z-30 max-h-48 overflow-y-auto min-w-[120px]">
                    {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((s) => (
                      <button
                        key={s}
                        onClick={() => { loadSeason(s); setShowEpisodes(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-[#333] transition ${
                          s === currentSeason ? "text-[#e50914] font-semibold" : "text-gray-300"
                        }`}
                      >
                        Season {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingSeason ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              ) : currentSeasonData ? (
                <div className="divide-y divide-[#1a1a1a]">
                  {currentSeasonData.episodes.map((ep) => (
                    <button
                      key={ep.episode_number}
                      onClick={() => selectEpisode(ep.episode_number)}
                      className={`w-full text-left px-4 py-3 hover:bg-[#1a1a1a] transition flex gap-3 items-start ${
                        ep.episode_number === currentEpisode ? "bg-[#1a1a1a]" : ""
                      }`}
                    >
                      <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                        ep.episode_number === currentEpisode ? "bg-[#e50914] text-white" : "bg-[#333] text-gray-400"
                      }`}>
                        {ep.episode_number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          ep.episode_number === currentEpisode ? "text-white" : "text-gray-300"
                        }`}>
                          {ep.name}
                        </p>
                        {ep.runtime && (
                          <p className="text-xs text-gray-500 mt-0.5">{ep.runtime}m</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
                  No episodes found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
