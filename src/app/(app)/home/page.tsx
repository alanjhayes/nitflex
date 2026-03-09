import { getTrending, getTopRated, getByGenre } from "@/lib/tmdb";
import { HeroBanner } from "@/components/home/HeroBanner";
import { MovieRow } from "@/components/home/MovieRow";

// Genre IDs
const GENRES = {
  action: 28,
  comedy: 35,
  horror: 27,
  scifi: 878,
  romance: 10749,
  documentary: 99,
};

export default async function HomePage() {
  const [trending, topMovies, topTV, action, comedy, horror, scifi] = await Promise.all([
    getTrending("all"),
    getTopRated("movie"),
    getTopRated("tv"),
    getByGenre(GENRES.action, "movie"),
    getByGenre(GENRES.comedy, "movie"),
    getByGenre(GENRES.horror, "movie"),
    getByGenre(GENRES.scifi, "movie"),
  ]);

  return (
    <div className="pb-16">
      <HeroBanner items={trending} />
      <div className="relative z-10 -mt-16">
        <MovieRow title="Trending Now" items={trending} priorityCount={6} />
        <MovieRow title="Top Rated Movies" items={topMovies} mediaType="movie" />
        <MovieRow title="Top Rated TV Shows" items={topTV} mediaType="tv" />
        <MovieRow title="Action & Adventure" items={action} mediaType="movie" />
        <MovieRow title="Comedy" items={comedy} mediaType="movie" />
        <MovieRow title="Horror" items={horror} mediaType="movie" />
        <MovieRow title="Science Fiction" items={scifi} mediaType="movie" />
      </div>
    </div>
  );
}
