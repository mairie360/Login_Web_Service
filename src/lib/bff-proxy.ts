import { NextRequest } from 'next/server';
import { proxyPublishedBffRequest } from '@mairie360/lib-components/next';
import contract from '../../contracts/openapi.json';
import { POST as login } from '../app/api/auth/login/route';
import { POST as changePassword } from '../app/api/auth/force-change-password/route';
import { POST as logout } from '../app/api/auth/logout/route';
import { configuredBffUrl } from './bff-user';
import { trustedClientIpHeaders } from './trusted-client-ip';

type RouteContext = { params: Promise<{ path: string[] }> };

export { configuredBffUrl } from './bff-user';

/** Authentication aliases use the same guarded handlers and cookie owner as the UI. */
export async function proxyBffRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  if (request.method === 'POST' && path.length === 2 && path[0] === 'auth') {
    if (path[1] === 'login') return login(request);
    if (path[1] === 'force_change_password') return changePassword(request);
    if (path[1] === 'logout') return logout(request);
  }
  return proxyPublishedBffRequest(request, path, {
    baseUrl: configuredBffUrl,
    paths: contract.paths,
    loginUrl: () => process.env.LOGIN_FRONT_URL?.trim() ?? '',
    frontUrl: () => process.env.LOGIN_FRONT_URL?.trim() ?? '',
    trustedHeaders: trustedClientIpHeaders,
  });
}
