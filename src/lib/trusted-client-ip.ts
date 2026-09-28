/**
 * Client-IP headers are only trustworthy when the frontend can be reached
 * exclusively through an ingress that owns these headers. Keep the opt-in
 * disabled for direct/local requests, where a browser can forge them.
 */
export function trustedClientIpHeaders(request: Pick<Request, 'headers'>): Record<string, string> {
  if (process.env.TRUST_INGRESS_IP_HEADERS !== 'true') return {};

  const headers: Record<string, string> = {};
  for (const name of ['x-forwarded-for', 'x-real-ip']) {
    const value = request.headers.get(name);
    if (value?.trim()) headers[name] = value;
  }
  return headers;
}
