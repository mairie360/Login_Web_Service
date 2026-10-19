import type { SessionServerConfig } from '@mairie360/lib-components/next';
import { configuredBffUrl } from './bff-user';
import { trustedClientIpHeaders } from './trusted-client-ip';

/** Login coordinates renewal and revocation for the configured frontend origins. */
export const serverSessionConfig: SessionServerConfig = {
  userBffUrl: configuredBffUrl,
  cookieOptions: () => ({
    secure: process.env.NODE_ENV === 'production',
    domain: process.env.COOKIE_DOMAIN?.trim() || undefined,
  }),
  allowedOrigins: () => [
    process.env.LOGIN_FRONT_URL,
    process.env.DASHBOARD_FRONT_URL,
    process.env.PROJECT_FRONT_URL,
    process.env.CALENDAR_FRONT_URL,
    process.env.MESSAGE_FRONT_URL,
    process.env.ELEARNING_FRONT_URL,
    process.env.SETTINGS_FRONT_URL,
    process.env.ADMINISTRATION_FRONT_URL,
  ].filter((value): value is string => Boolean(value?.trim())),
  trustedHeaders: trustedClientIpHeaders,
};
