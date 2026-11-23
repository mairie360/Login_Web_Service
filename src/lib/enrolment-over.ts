import { NextResponse } from "next/server";
import { NO_STORE } from "./bff-refusal";
import { clearTwoFactorSetupToken } from "./two-factor-token";

/** The enrolment session is over (token expired or burnt, or the account got a factor meanwhile): back to the password. */
export function enrolmentOver(message = "Votre session de connexion a expiré.", status = 401) {
  const response = NextResponse.json({ message, restartLogin: true }, { status, headers: NO_STORE });
  clearTwoFactorSetupToken(response);
  return response;
}
