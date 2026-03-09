"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, SkipForward } from "lucide-react";
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

const AUTOPLAY_COUNTDOWN = 60;

interface AutoPlay {
  nextSeason: number;
  nextEpisode: number;
  secondsLeft: number;
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
  const [autoPlay, setAutoPlay] = useState<AutoPlay | null>(null);

  const title = details.title ?? details.name ?? "Unknown";

  const fetchSeason = useCallback(async (s: number): Promise<TVSeason | null> => {
    if (loadedSeasons[s]) return loadedSeasons[s];
    try {
      const res = await fetch(`/api/tmdb/season?id=${details.id}&season=${s}`);
      const data: TVSeason = await res.json();
      setLoadedSeasons((prev) => ({ ...prev, [s]: data }));
      return data;
    } catch {
      return null;
    }
  }, [details.id, loadedSeasons]);

  const loadSeason = useCallback(async (s: number) => {
    if (loadedSeasons[s]) {
      setCurrentSeason(s);
      setCurrentEpisode(1);
      return;
    }
    setLoadingSeason(true);
    try {
      const data = await fetchSeason(s);
      if (data) {
        setCurrentSeason(s);
        setCurrentEpisode(1);
      }
    } finally {
      setLoadingSeason(false);
    }
  }, [fetchSeason, loadedSeasons]);

  const selectEpisode = (ep: number) => {
    setAutoPlay(null);
    setCurrentEpisode(ep);
    setShowEpisodes(false);
  };

  // Called when the video finishes playing
  const handleEpisodeEnded = useCallback(async () => {
    if (mediaType !== "tv") return;

    const sData = loadedSeasons[currentSeason];
    if (!sData) return;

    const episodes = sData.episodes;
    const lastEpNum = episodes[episodes.length - 1]?.episode_number ?? currentEpisode;

    let nextSeason = currentSeason;
    let nextEpisode = currentEpisode + 1;

    if (nextEpisode > lastEpNum) {
      if (currentSeason < totalSeasons) {
        nextSeason = currentSeason + 1;
        nextEpisode = 1;
        // Pre-fetch next season data so we can show the episode name in the overlay
        fetchSeason(nextSeason);
      } else {
        // End of series — nothing to auto-play
        return;
      }
    }

    setAutoPlay({ nextSeason, nextEpisode, secondsLeft: AUTOPLAY_COUNTDOWN });
  }, [mediaType, currentSeason, currentEpisode, loadedSeasons, totalSeasons, fetchSeason]);

  // Tick the countdown
  useEffect(() => {
    if (!autoPlay) return;
    if (autoPlay.secondsLeft <= 0) {
      const { nextSeason, nextEpisode } = autoPlay;
      setAutoPlay(null);
      setCurrentSeason(nextSeason);
      setCurrentEpisode(nextEpisode);
      return;
    }
    const t = setTimeout(
      () => setAutoPlay((p) => p ? { ...p, secondsLeft: p.secondsLeft - 1 } : null),
      1000
    );
    return () => clearTimeout(t);
  }, [autoPlay]);

  const playNow = useCallback(() => {
    if (!autoPlay) return;
    const { nextSeason, nextEpisode } = autoPlay;
    setAutoPlay(null);
    setCurrentSeason(nextSeason);
    setCurrentEpisode(nextEpisode);
  }, [autoPlay]);

  const currentSeasonData = loadedSeasons[currentSeason];
  const currentEpisodeData = currentSeasonData?.episodes.find(
    (e) => e.episode_number === currentEpisode
  );

  // Info for the auto-play overlay
  const nextEpisodeData = autoPlay
    ? loadedSeasons[autoPlay.nextSeason]?.episodes.find(
        (e) => e.episode_number === autoPlay.nextEpisode
      )
    : null;

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
          onEnded={handleEpisodeEnded}
        />

        {/* Auto-play next episode overlay */}
        {autoPlay && (
          <div className="absolute bottom-16 right-4 sm:right-8 z-30 w-64 sm:w-72 bg-black/90 border border-white/10 rounded-lg overflow-hidden shadow-2xl">
            {/* Progress bar */}
            <div className="h-1 bg-white/20">
              <div
                className="h-full bg-[#e50914] transition-none"
                style={{ width: `${((AUTOPLAY_COUNTDOWN - autoPlay.secondsLeft) / AUTOPLAY_COUNTDOWN) * 100}%` }}
              />
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Up Next</p>
              <p className="text-sm font-semibold leading-snug mb-0.5">
                S{autoPlay.nextSeason} E{autoPlay.nextEpisode}
                {nextEpisodeData ? ` — ${nextEpisodeData.name}` : ""}
              </p>
              {nextEpisodeData?.runtime && (
                <p className="text-xs text-gray-500 mb-3">{nextEpisodeData.runtime}m</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={playNow}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white text-black text-sm font-semibold py-2 rounded hover:bg-gray-200 transition"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Play Now
                </button>
                <button
                  onClick={() => setAutoPlay(null)}
                  className="px-3 py-2 text-sm text-gray-400 hover:text-white border border-white/20 rounded transition"
                >
                  Cancel
                </button>
              </div>
              <p className="text-center text-xs text-gray-500 mt-2">
                Playing in {autoPlay.secondsLeft}s
              </p>
            </div>
          </div>
        )}
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
