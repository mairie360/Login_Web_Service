import { NextRequest, NextResponse } from "next/server";
import { parseFrontUrl } from "./front-url";

/** Browser authentication mutations must originate from the Login frontend. */
export function rejectUnsafeAuthRequest(request: NextRequest, requireJson = false) {
  const origin = request.headers.get("origin");
  const expectedOrigin = parseFrontUrl(process.env.LOGIN_FRONT_URL)?.origin ?? request.nextUrl.origin;

  if (request.headers.get("sec-fetch-site") !== "same-origin" || (origin && origin !== expectedOrigin)) {
    return NextResponse.json(
      { message: "Cette demande doit être effectuée depuis la page de connexion." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const mediaType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (requireJson && mediaType !== "application/json") {
    return NextResponse.json(
      { message: "La requête doit utiliser le format JSON." },
      { status: 415, headers: { "Cache-Control": "no-store" } },
    );
  }

  return null;
}
