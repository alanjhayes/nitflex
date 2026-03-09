import { notFound, redirect } from "next/navigation";
import { getDetails, getTVSeason } from "@/lib/tmdb";
import { WatchClient } from "@/components/watch/WatchClient";

interface WatchPageProps {
  searchParams: Promise<{
    tmdbid?: string;
    type?: string;
    season?: string;
    episode?: string;
  }>;
}

export default async function WatchPage({ searchParams }: WatchPageProps) {
  const { tmdbid, type, season, episode } = await searchParams;

  const id = Number(tmdbid);
  const mediaType = type === "tv" ? "tv" : "movie";

  if (!id) notFound();

  const details = await getDetails(id, mediaType).catch(() => null);
  if (!details) notFound();

  const seasonNum = mediaType === "tv" ? Number(season) || 1 : undefined;
  const episodeNum = mediaType === "tv" ? Number(episode) || 1 : undefined;

  // Fetch season data for TV
  const seasonData =
    mediaType === "tv" && seasonNum
      ? await getTVSeason(id, seasonNum).catch(() => null)
      : null;

  // Get total seasons for the selector
  const totalSeasons = details.number_of_seasons ?? 1;

  return (
    <WatchClient
      details={details}
      mediaType={mediaType}
      season={seasonNum}
      episode={episodeNum}
      seasonData={seasonData}
      totalSeasons={totalSeasons}
    />
  );
}
