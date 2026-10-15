import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const request = vi.hoisted(() => ({ cookies: {} }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: name => request.cookies[name] === undefined ? undefined : { value: request.cookies[name] } }) }));
vi.mock('@/app/globals.css', () => ({}));
vi.mock('@/app/municipal-theme.css', () => ({}));
vi.mock('next/font/google', () => ({ Geist: options => ({ variable: options.variable }) }));

import RootLayout from '@/app/layout';
import Home from '@/app/page';
import ForgotPasswordPage, { metadata as forgotMetadata } from '@/app/forgot-password/page';
import ResetPasswordPage, { metadata as resetMetadata } from '@/app/reset-password/page';
import LogoutPage from '@/app/logout/page';
import RecoveryLayout from '@/components/RecoveryLayout';

beforeEach(() => {
  request.cookies = {};
  vi.stubEnv('DASHBOARD_FRONT_URL', 'https://dashboard.mairie.test/');
  vi.stubEnv('LOGIN_FRONT_URL', 'https://login.mairie.test/');
  vi.stubEnv('PROJECT_FRONT_URL', 'https://projects.mairie.test/');
});
afterEach(() => vi.unstubAllEnvs());
const home = search => Home({ searchParams: Promise.resolve(search) });

it('only resumes the validated requested frontend and keeps its query', async () => {
  const requested = 'https://projects.mairie.test/?project=42';
  const result = await home({ returnUrl: requested, resumeSession: '1' });
  expect(result.props.redirectUrl).toBe(requested);
  expect(result.props.resumeSession).toBe(true);
  for (const search of [{ redirect: 'https://foreign.test/', resumeSession: '1' }, { redirect: requested }, { redirect: 'https://login.mairie.test/', resumeSession: '1' }]) {
    expect((await home(search)).props.resumeSession).toBe(false);
  }
});
it('renders an actionable unavailable page when the default destination is missing', async () => {
  vi.stubEnv('DASHBOARD_FRONT_URL', '');
  const html = renderToStaticMarkup(await home({ redirect: ['https://foreign.test/'] }));
  expect(html).toContain('Connexion temporairement indisponible');
  expect(html).not.toContain('<form');
});
it('recovery pages validate destinations and reject repeated token parameters', async () => {
  const destination = 'https://projects.mairie.test/?project=42';
  expect((await ForgotPasswordPage({ searchParams: Promise.resolve({ redirect: destination }) })).props.redirectUrl).toBe(destination);
  const valid = await ResetPasswordPage({ searchParams: Promise.resolve({ token: 'single-token', redirect: destination }) });
  expect(valid.props.token).toBe('single-token');
  expect(valid.props.redirectUrl).toBe(destination);
  const repeated = await ResetPasswordPage({ searchParams: Promise.resolve({ token: ['first', 'second'], redirect: 'https://foreign.test/' }) });
  expect(repeated.props.token).toBeUndefined();
  expect(repeated.props.redirectUrl).toBe('https://dashboard.mairie.test/');
  expect(forgotMetadata.referrer).toBe('no-referrer');
  expect(resetMetadata.robots).toEqual({ index: false, follow: false });
  expect(LogoutPage().type.name).toBe('Logout');
});
it('the server layout uses validated public appearance cookies and preserves the standalone content', async () => {
  vi.stubEnv('INSTANCE_TIMEZONE', 'Indian/Reunion');
  let tree = await RootLayout({ children: <RecoveryLayout><p>Recovery content</p></RecoveryLayout> });
  let html = renderToStaticMarkup(tree);
  expect(html).toContain('data-theme="system"');
  expect(html).toContain('data-density="normal"');
  expect(html).toContain('Recovery content');
  expect(html).toContain('alt="Logo Mairie360"');
  request.cookies.mairie360_appearance = encodeURIComponent(JSON.stringify({ v: 1, theme: 'dark', density: 'compact', font_family: 'Arial' }));
  tree = await RootLayout({ children: <span>Retained child</span> });
  html = renderToStaticMarkup(tree);
  expect(html).toContain('data-theme="dark"');
  expect(html).toContain('data-density="compact"');
  expect(html).toContain('Retained child');
});
