import type { TMDBResult, TMDBDetails, TMDBVideo, TMDBCastMember, TMDBSearchResult } from "@/types/tmdb";

const BASE = "https://db.1flex.nl";

const HEADERS = {
  "Referer": "https://www.1flex.nl/",
  "Origin": "https://www.1flex.nl",
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
};

export const tmdbImage = (path: string | null, size = "w500") => {
  if (!path) return "/placeholder-poster.jpg";
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

async function tmdbFetch<T>(endpoint: string, revalidate = 3600): Promise<T> {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: HEADERS,
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${endpoint} (${res.status})`);
  return res.json();
}

export async function getTrending(mediaType: "all" | "movie" | "tv" = "all"): Promise<TMDBResult[]> {
  const data = await tmdbFetch<{ results: TMDBResult[] }>(
    `/trending/${mediaType}/week?language=en-US`
  );
  return data.results;
}

export async function getTopRated(mediaType: "movie" | "tv"): Promise<TMDBResult[]> {
  const data = await tmdbFetch<{ results: TMDBResult[] }>(
    `/${mediaType}/top_rated?language=en-US&page=1`
  );
  return data.results;
}

export async function getByGenre(genreId: number, mediaType: "movie" | "tv"): Promise<TMDBResult[]> {
  const data = await tmdbFetch<{ results: TMDBResult[] }>(
    `/discover/${mediaType}?language=en-US&with_genres=${genreId}&sort_by=popularity.desc&page=1`
  );
  return data.results;
}

export async function searchMulti(query: string): Promise<TMDBSearchResult[]> {
  if (!query) return [];
  const data = await tmdbFetch<{ results: TMDBSearchResult[] }>(
    `/search/multi?language=en-US&query=${encodeURIComponent(query)}&page=1`,
    60
  );
  return data.results.filter((r) => r.media_type !== "person");
}

export async function getVideos(id: number, mediaType: "movie" | "tv"): Promise<TMDBVideo[]> {
  const data = await tmdbFetch<{ results: TMDBVideo[] }>(
    `/${mediaType}/${id}/videos?language=en-US`,
    86400
  );
  return data.results;
}

export async function getDetails(id: number, mediaType: "movie" | "tv"): Promise<TMDBDetails> {
  return tmdbFetch<TMDBDetails>(`/${mediaType}/${id}?language=en-US`, 86400);
}

export async function getCredits(id: number, mediaType: "movie" | "tv"): Promise<TMDBCastMember[]> {
  const endpoint = mediaType === "tv" ? `/${mediaType}/${id}/aggregate_credits` : `/${mediaType}/${id}/credits`;
  const data = await tmdbFetch<{ cast: TMDBCastMember[] }>(endpoint + "?language=en-US", 86400);
  return data.cast.slice(0, 10);
}

export interface TVEpisode {
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  runtime: number | null;
  vote_average: number;
}

export interface TVSeason {
  season_number: number;
  name: string;
  episode_count: number;
  episodes: TVEpisode[];
}

export async function getTVSeason(id: number, season: number): Promise<TVSeason> {
  return tmdbFetch<TVSeason>(`/tv/${id}/season/${season}?language=en-US`, 3600);
}
