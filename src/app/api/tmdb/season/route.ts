import { getTVSeason } from "@/lib/tmdb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  const season = Number(url.searchParams.get("season"));

  if (!id || !season) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  try {
    const data = await getTVSeason(id, season);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=3600" },
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
