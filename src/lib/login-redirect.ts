const DEFAULT_PROJECT_FRONT_URL = "http://localhost:5001/";

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

export function resolveLoginRedirect(candidate: string | string[] | undefined): string {
  const fallback = process.env.PROJECT_FRONT_URL || DEFAULT_PROJECT_FRONT_URL;
  if (typeof candidate !== "string" || !/^https?:\/\//i.test(candidate) || !URL.canParse(candidate)) return fallback;
  if (!URL.canParse(fallback)) return fallback;

  const target = new URL(candidate);
  if (target.username || target.password) return fallback;

  const knownOrigins = FRONT_URL_KEYS.flatMap((key) => {
    const configured = process.env[key];
    if (!configured || !URL.canParse(configured)) return [];
    const url = new URL(configured);
    return url.protocol === "http:" || url.protocol === "https:" ? [url.origin] : [];
  });
  knownOrigins.push(new URL(fallback).origin);

  return knownOrigins.includes(target.origin) ? target.href : fallback;
}
