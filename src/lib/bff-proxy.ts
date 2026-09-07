import { NextRequest } from 'next/server';
import contract from '../../contracts/openapi.json';

type RouteContext = { params: Promise<{ path: string[] }> };
type ContractPaths = Record<string, Record<string, unknown>>;

export function configuredBffUrl() {
  return (process.env.BFF_USER_API_URL ??
    process.env.USER_BFF_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
}

export async function forwardToBff(request: NextRequest, baseUrl: string, path: string) {
  const headers = new Headers(request.headers);
  for (const name of ['host', 'connection', 'content-length', 'accept-encoding', 'cookie']) headers.delete(name);
  const accessToken = request.cookies.get('accessToken')?.value;
  if (!headers.has('authorization') && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const target = new URL(`${baseUrl.replace(/\/+$/, '')}${path}`);
  target.search = new URL(request.url).search;
  try {
    const upstream = await fetch(target, {
      method: request.method, headers, cache: 'no-store', redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
      ...(!['GET', 'HEAD'].includes(request.method) ? { body: await request.arrayBuffer() } : {}),
    });
    const responseHeaders = new Headers(upstream.headers);
    for (const name of ['content-encoding', 'content-length', 'transfer-encoding', 'connection']) responseHeaders.delete(name);
    responseHeaders.set('Cache-Control', 'no-store');
    return new Response(request.method === 'HEAD' || [204, 205, 304].includes(upstream.status) ? null : upstream.body, {
      status: upstream.status, statusText: upstream.statusText, headers: responseHeaders,
    });
  } catch {
    return Response.json({ error: { message: 'Le service est indisponible.' } }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function proxyBffRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  if (path.some((part) => !part || part === '.' || part === '..' || part.includes('/'))) {
    return Response.json({ error: { message: 'Chemin invalide.' } }, { status: 400 });
  }
  const route = Object.entries(contract.paths as ContractPaths).find(([template]) => {
    const segments = template.split('/').filter(Boolean);
    return segments.length === path.length && segments.every((part, index) => /^\{[^}]+\}$/.test(part) || part === path[index]);
  });
  const metadata = path.length === 1 && ['openapi.json', 'swagger.json'].includes(path[0]);
  if (!route && !metadata) return Response.json({ error: { message: 'Route inconnue.' } }, { status: 404 });
  const allowed = metadata ? ['GET', 'HEAD'] : Object.keys(route![1]).filter((method) => ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)).map((method) => method.toUpperCase());
  if (allowed.includes('GET') && !allowed.includes('HEAD')) allowed.push('HEAD');
  if (!allowed.includes(request.method)) return Response.json({ error: { message: 'Méthode non autorisée.' } }, { status: 405, headers: { Allow: allowed.join(', ') } });
  return forwardToBff(request, configuredBffUrl(), `/${path.map(encodeURIComponent).join('/')}`);
}
