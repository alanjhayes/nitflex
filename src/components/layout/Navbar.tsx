"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, User, LogOut, LogIn } from "lucide-react";
import { signOut } from "next-auth/react";

interface NavbarProps {
  userName?: string | null;
  userImage?: string | null;
}

export function Navbar({ userName, userImage }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (pathname.startsWith("/watch")) return null;

  const navLinks = [
    { href: "/home", label: "Home" },
    { href: "/search", label: "TV Shows" },
    { href: "/search?q=", label: "Movies" },
    { href: "/my-list", label: "My List" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 md:px-16 py-4 transition-all duration-300 ${
        scrolled ? "bg-[#141414]" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      {/* Logo + Links */}
      <div className="flex items-center gap-8">
        <Link href="/home" className="text-[#e50914] font-black text-2xl tracking-tight flex-shrink-0">
          NITFLEX
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-gray-300 transition ${
                pathname === link.href ? "text-white font-semibold" : "text-gray-300"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <Link href="/search" className="text-gray-300 hover:text-white transition">
          <Search className="w-5 h-5" />
        </Link>
        <Bell className="w-5 h-5 text-gray-300 cursor-pointer hover:text-white transition" />
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded overflow-hidden bg-[#e50914] flex items-center justify-center text-sm font-bold">
              {userImage ? (
                <img src={userImage} alt={userName ?? "User"} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 bg-[#141414] border border-[#333] rounded shadow-lg min-w-[160px] overflow-hidden">
              {userName ? (
                <>
                  <div className="px-4 py-3 border-b border-[#333]">
                    <p className="text-sm font-semibold truncate">{userName}</p>
                  </div>
                  <Link href="/my-list" className="flex items-center gap-2 px-4 py-3 hover:bg-[#333] text-sm transition" onClick={() => setMenuOpen(false)}>
                    My List
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/home" })}
                    className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[#333] text-sm transition text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <Link href="/sign-in" className="flex items-center gap-2 px-4 py-3 hover:bg-[#333] text-sm transition" onClick={() => setMenuOpen(false)}>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
