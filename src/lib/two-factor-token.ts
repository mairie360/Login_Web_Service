import type { NextResponse } from "next/server";

/** Login token of the second step: lives as long as Core keeps it (five minutes), readable by the auth routes only. */
export const TWO_FACTOR_TOKEN_COOKIE = "twoFactorToken";
export const TWO_FACTOR_TOKEN_MAX_AGE = 5 * 60;

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/auth",
});

export function setTwoFactorToken(response: NextResponse, token: string) {
  response.cookies.set(TWO_FACTOR_TOKEN_COOKIE, token, { ...cookieOptions(), maxAge: TWO_FACTOR_TOKEN_MAX_AGE });
}

export function clearTwoFactorToken(response: NextResponse) {
  response.cookies.set(TWO_FACTOR_TOKEN_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}
