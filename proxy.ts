import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = ["/dashboard", "/movimientos", "/usuarios", "/configuracion"];
const adminOnlyPrefixes = ["/usuarios", "/configuracion"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminOnly = adminOnlyPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (isAdminOnly && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard?forbidden=1", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/movimientos/:path*", "/usuarios/:path*", "/configuracion/:path*"],
};
