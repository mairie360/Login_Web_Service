import { NextRequest, NextResponse } from "next/server";

/** Expire the browser cookie after the existing BFF logout proxy has succeeded. */
export function POST(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  if ((fetchSite && fetchSite !== "same-origin") || (origin && origin !== request.nextUrl.origin)) {
    return new NextResponse(null, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const cookieDomain = process.env.COOKIE_DOMAIN?.trim();
  if (process.env.NODE_ENV === "production" && !cookieDomain) {
    return NextResponse.json({ message: "La déconnexion est temporairement indisponible." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  response.cookies.set("accessToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
  response.cookies.set("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
    expires: new Date(0),
    maxAge: 0,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
  return response;
}
