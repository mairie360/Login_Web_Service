import { parseFrontUrl } from "./front-url";

const FRONT_URL_KEYS = [
  "LOGIN_FRONT_URL",
  "DASHBOARD_FRONT_URL",
  "PROJECT_FRONT_URL",
  "CALENDAR_FRONT_URL",
  "MESSAGE_FRONT_URL",
  "ELEARNING_FRONT_URL",
  "SETTINGS_FRONT_URL",
  "ADMINISTRATION_FRONT_URL",
  "EMAIL_FRONT_URL",
  "FILES_FRONT_URL",
] as const;

export function resolveLoginRedirect(candidate: string | string[] | undefined): string | undefined {
  const fallback = parseFrontUrl(process.env.PROJECT_FRONT_URL)?.href;
  const target = typeof candidate === "string" && /^https?:\/\//i.test(candidate)
    ? parseFrontUrl(candidate)
    : undefined;
  if (!target) return fallback;

  const knownOrigins = FRONT_URL_KEYS.flatMap((key) => {
    const url = parseFrontUrl(process.env[key]);
    return url ? [url.origin] : [];
  });

  return knownOrigins.includes(target.origin) ? target.href : fallback;
}
