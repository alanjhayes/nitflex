import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // My List requires an account
  if (nextUrl.pathname.startsWith("/my-list") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/sign-in", nextUrl));
  }

  // Skip landing page if already logged in
  if (nextUrl.pathname === "/" && isLoggedIn) {
    return NextResponse.redirect(new URL("/home", nextUrl));
  }

  // Skip auth pages if already logged in
  if ((nextUrl.pathname.startsWith("/sign-in") || nextUrl.pathname.startsWith("/sign-up")) && isLoggedIn) {
    return NextResponse.redirect(new URL("/home", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
