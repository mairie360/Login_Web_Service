import type { AppShellProps } from "@mairie360/lib-components";
import { parseFrontUrl } from "./front-url";

export function loginShellHrefs(): AppShellProps["hrefs"] {
  const configuredFront = (key: string) => parseFrontUrl(process.env[key])?.href;
  const settingsUrl = configuredFront("SETTINGS_FRONT_URL");

  return {
    dashboard: configuredFront("DASHBOARD_FRONT_URL"),
    projects: configuredFront("PROJECT_FRONT_URL"),
    messages: configuredFront("MESSAGE_FRONT_URL"),
    training: configuredFront("ELEARNING_FRONT_URL"),
    calendar: configuredFront("CALENDAR_FRONT_URL"),
    settings: settingsUrl,
    profile: settingsUrl,
    admin: configuredFront("ADMINISTRATION_FRONT_URL"),
  };
}
