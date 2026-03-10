import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([]);

  const items = await prisma.watchlist.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tmdbId, mediaType, title, poster } = body;

  const item = await prisma.watchlist.upsert({
    where: { userId_tmdbId_mediaType: { userId: session.user.id, tmdbId, mediaType } },
    update: {},
    create: { userId: session.user.id, tmdbId, mediaType, title, poster },
  });

  return NextResponse.json(item);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tmdbId, mediaType } = await req.json();

  await prisma.watchlist.deleteMany({
    where: { userId: session.user.id, tmdbId, mediaType },
  });

  return NextResponse.json({ success: true });
}
