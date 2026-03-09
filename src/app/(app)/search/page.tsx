import { searchMulti } from "@/lib/tmdb";
import { SearchPageClient } from "@/components/search/SearchPageClient";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const results = q ? await searchMulti(q) : [];

  return <SearchPageClient initialQuery={q ?? ""} initialResults={results} />;
}
