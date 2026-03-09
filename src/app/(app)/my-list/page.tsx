import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MyListClient } from "@/components/my-list/MyListClient";

export default async function MyListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const watchlist = await prisma.watchlist.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="pt-24 px-4 md:px-16 pb-16">
      <h1 className="text-3xl font-bold mb-8">My List</h1>
      <MyListClient initialItems={watchlist} />
    </div>
  );
}
