import type { SecurityAlert } from '@mairie360/bff-user-openapi/model';
import { NextRequest, NextResponse } from "next/server";
import { bffUserOperations, bffUserUrl } from "../../../lib/bff-user";
import { rejectUnsafeAuthRequest } from "../../../lib/auth-request";
import { NO_STORE } from "../../../lib/bff-refusal";
import { signedInHeaders } from "../../../lib/passkey-registration";

/**
 * MAIR-773 F9: right after a sign-in, the latest use of the agent's session from another device that the agent has not
 * read yet. `{ alert: null }` when there is none, and on any failure: the alert never blocks the sign-in.
 */
export async function GET(request: NextRequest) {
  const rejected = rejectUnsafeAuthRequest(request);
  if (rejected) return rejected;
  const session = signedInHeaders(request);
  if ("refused" in session) return NextResponse.json({ alert: null }, { headers: NO_STORE });

  try {
    const upstreamResponse = await fetch(bffUserUrl(bffUserOperations.getGetUserMeSecurityAlertUrl()), {
      method: "GET",
      headers: session.headers,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (upstreamResponse.status !== 200) return NextResponse.json({ alert: null }, { headers: NO_STORE });
    const alert = (await upstreamResponse.json().catch(() => null)) as SecurityAlert | null;
    if (!alert || typeof alert.id !== "number" || (alert.level !== "certain" && alert.level !== "possible")) {
      return NextResponse.json({ alert: null }, { headers: NO_STORE });
    }
    return NextResponse.json({
      alert: { id: alert.id, level: alert.level, ipAddress: alert.ip_address, deviceInfo: alert.device_info, createdAt: alert.created_at },
    }, { headers: NO_STORE });
  } catch {
    // Unreachable BFF: the sign-in goes on without the screen.
    return NextResponse.json({ alert: null }, { headers: NO_STORE });
  }
}
