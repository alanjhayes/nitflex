import { Suspense } from "react";
import { getTrending, getTopRated, getPopular, getNowPlaying, getByGenre } from "@/lib/tmdb";
import { HeroBanner } from "@/components/home/HeroBanner";
import { MovieRow } from "@/components/home/MovieRow";

// Movie genre IDs
const MG = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  horror: 27,
  mystery: 9648,
  romance: 10749,
  scifi: 878,
  thriller: 53,
  western: 37,
};

// TV genre IDs
const TVG = {
  action: 10759,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  mystery: 9648,
  reality: 10764,
  scifi: 10765,
  talk: 10767,
};

// Above-the-fold: hero + first 6 rows — renders as soon as these 6 fetches resolve
async function TopSection() {
  const [trending, popularMovies, popularTV, nowPlaying, topMovies, topTV] = await Promise.all([
    getTrending("all"),
    getPopular("movie"),
    getPopular("tv"),
    getNowPlaying(),
    getTopRated("movie"),
    getTopRated("tv"),
  ]);

  return (
    <>
      <HeroBanner items={trending} />
      <div className="relative z-10 -mt-16">
        <MovieRow title="Trending Now" items={trending} priorityCount={6} />
        <MovieRow title="Popular Movies" items={popularMovies} mediaType="movie" />
        <MovieRow title="Popular TV Shows" items={popularTV} mediaType="tv" />
        <MovieRow title="Now Playing in Theaters" items={nowPlaying} mediaType="movie" />
        <MovieRow title="Top Rated Movies" items={topMovies} mediaType="movie" />
        <MovieRow title="Top Rated TV Shows" items={topTV} mediaType="tv" />
      </div>
    </>
  );
}

// Below-the-fold: genre rows — streams in while user is browsing top rows
async function GenreRows() {
  const [
    action, drama, thriller, comedy, horror, scifi, crime,
    animation, fantasy, romance, family, adventure, mystery, documentary, western,
    tvDrama, tvComedy, tvCrime, tvScifi, tvAnimation, tvReality, tvDocumentary, kdrama,
  ] = await Promise.all([
    getByGenre(MG.action, "movie"),
    getByGenre(MG.drama, "movie"),
    getByGenre(MG.thriller, "movie"),
    getByGenre(MG.comedy, "movie"),
    getByGenre(MG.horror, "movie"),
    getByGenre(MG.scifi, "movie"),
    getByGenre(MG.crime, "movie"),
    getByGenre(MG.animation, "movie"),
    getByGenre(MG.fantasy, "movie"),
    getByGenre(MG.romance, "movie"),
    getByGenre(MG.family, "movie"),
    getByGenre(MG.adventure, "movie"),
    getByGenre(MG.mystery, "movie"),
    getByGenre(MG.documentary, "movie"),
    getByGenre(MG.western, "movie"),
    getByGenre(TVG.drama, "tv"),
    getByGenre(TVG.comedy, "tv"),
    getByGenre(TVG.crime, "tv"),
    getByGenre(TVG.scifi, "tv"),
    getByGenre(TVG.animation, "tv"),
    getByGenre(TVG.reality, "tv"),
    getByGenre(TVG.documentary, "tv"),
    getByGenre(TVG.drama, "tv", "&with_original_language=ko"),
  ]);

  return (
    <>
      <MovieRow title="Action & Adventure" items={action} mediaType="movie" />
      <MovieRow title="Drama" items={drama} mediaType="movie" />
      <MovieRow title="Thriller" items={thriller} mediaType="movie" />
      <MovieRow title="Comedy" items={comedy} mediaType="movie" />
      <MovieRow title="Horror" items={horror} mediaType="movie" />
      <MovieRow title="Science Fiction" items={scifi} mediaType="movie" />
      <MovieRow title="Crime" items={crime} mediaType="movie" />
      <MovieRow title="Animation" items={animation} mediaType="movie" />
      <MovieRow title="Fantasy" items={fantasy} mediaType="movie" />
      <MovieRow title="Romance" items={romance} mediaType="movie" />
      <MovieRow title="Family & Kids" items={family} mediaType="movie" />
      <MovieRow title="Adventure" items={adventure} mediaType="movie" />
      <MovieRow title="Mystery" items={mystery} mediaType="movie" />
      <MovieRow title="Documentary" items={documentary} mediaType="movie" />
      <MovieRow title="Western" items={western} mediaType="movie" />
      <MovieRow title="TV Drama Series" items={tvDrama} mediaType="tv" />
      <MovieRow title="TV Comedy" items={tvComedy} mediaType="tv" />
      <MovieRow title="Crime & Investigation TV" items={tvCrime} mediaType="tv" />
      <MovieRow title="Sci-Fi & Fantasy TV" items={tvScifi} mediaType="tv" />
      <MovieRow title="Animated Series" items={tvAnimation} mediaType="tv" />
      <MovieRow title="Reality TV" items={tvReality} mediaType="tv" />
      <MovieRow title="Documentary Series" items={tvDocumentary} mediaType="tv" />
      <MovieRow title="K-Drama" items={kdrama} mediaType="tv" />
    </>
  );
}

export default function HomePage() {
  return (
    <div className="pb-16">
      <Suspense fallback={<div className="h-[56vw] max-h-[80vh] bg-black animate-pulse" />}>
        <TopSection />
      </Suspense>
      <Suspense fallback={null}>
        <GenreRows />
      </Suspense>
    </div>
  );
}
