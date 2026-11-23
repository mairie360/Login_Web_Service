import { NextResponse } from "next/server";

export const NO_STORE = { "Cache-Control": "no-store" };

type BffRefusal = { error?: { details?: { path?: unknown }[] } };

/**
 * BFF User tells apart the 401 of the second step and of the mandatory enrolment by `error.details[0].path`:
 * `body.code` (backup code already used) and `body.token` (login or enrolment session over); no detail, a wrong code.
 */
export async function refusalPath(response: Response): Promise<string | undefined> {
  try {
    const path = ((await response.json()) as BffRefusal).error?.details?.[0]?.path;
    return typeof path === "string" ? path : undefined;
  } catch {
    return undefined;
  }
}

/** 429 of the BFF: the French message and the `Retry-After` delay the field waits for. */
export function tooManyAttempts(response: Response) {
  const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
  const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined;
  return NextResponse.json(
    { message: "Trop de tentatives.", ...(delay ? { retryAfter: delay } : {}) },
    { status: 429, headers: { ...NO_STORE, ...(delay ? { "Retry-After": String(delay) } : {}) } },
  );
}

/** Any other refusal or failure of the BFF: a French message chosen by status, never the technical English one. */
export function bffFailure(status: number, fallback: string) {
  const unavailable = status >= 500;
  return NextResponse.json(
    { message: unavailable ? "Le service de connexion est indisponible. Veuillez réessayer." : fallback },
    { status, headers: NO_STORE },
  );
}

/** The BFF could not be reached, or took more than the timeout. */
export function bffUnreachable(error: unknown) {
  const timedOut = error instanceof Error && error.name === "TimeoutError";
  return NextResponse.json(
    { message: timedOut ? "Le service de connexion met trop de temps à répondre." : "Le service de connexion est indisponible." },
    { status: timedOut ? 504 : 502, headers: NO_STORE },
  );
}
