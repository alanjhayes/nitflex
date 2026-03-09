import { auth } from "@/auth";
import { Navbar } from "@/components/layout/Navbar";
import { MovieModalProvider } from "@/components/movie/MovieModalContext";
import { MovieModal } from "@/components/movie/MovieModal";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <MovieModalProvider>
      <Navbar userName={session?.user?.name} userImage={session?.user?.image} />
      <main className="min-h-screen">
        {children}
      </main>
      <MovieModal />
    </MovieModalProvider>
  );
}
