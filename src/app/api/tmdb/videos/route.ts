import { getVideos } from "@/lib/tmdb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  const type = url.searchParams.get("type") as "movie" | "tv";

  if (!id || !type) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  try {
    const data = await getVideos(id, type);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
