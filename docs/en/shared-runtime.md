# Shared frontend runtime

All eight frontends import the shared runtime (session refresh, logout and resume, proxy guard, CSP, theme, instance context) from the `next`, `guard`, `browser`, `shared`, `react` and `theme` subpaths of the published `@mairie360/lib-components` (MAIR-126), pinned to the same exact version as the UI components; the former vendored `@mairie360/front-kit` artifact is gone. Each front imports lib subpaths only, never the root entry, so its client build carries only the lib entries its own code uses: `npm run test:bundle` (after `npm run build`, run by the frontend performance workflow) fails when an unused entry or lib server code reaches `.next/static`.

## Session and proxy

The seven authenticated modules use one guard. Missing, opaque, malformed or expired access cookies are invalid. Data requests return JSON 401; document navigation resumes through local `GET /api/auth/resume?next=<local path>`. External, API, internal and ambiguous destinations are rejected. Documentation endpoints remain 404.

An ordinary 401 triggers same-origin `POST /api/auth/refresh`, which actually receives the HttpOnly refreshToken cookie scoped to /api. Concurrent requests share renewal; each business request retries at most once, preserving its body. An explicit Login owner refusal stops renewal; outages remain recoverable errors. JavaScript does not read authentication tokens or put them in URLs or localStorage.

Logout is an explicit origin-checked POST. The Login owner reads the server-side refresh cookie, requests the published revocation and clears cookies after confirmation. An outage is never presented as successful logout. Refreshed cookies remain HttpOnly, Secure in production and SameSite=Strict. The refresh cookie has a 30-day maxAge; effective retention still depends on Core/BFF policy, which this frontend change does not extend.

The proxy enforces published operations, request/response header allowlists and bounded bodies. Authorization comes from the server cookie rather than an arbitrary browser header. Upstream cookies and internal headers cannot pass through freely; only validated session pairs receive the local cookie policy.

## Runtime configuration

Configure LOGIN_FRONT_URL and this module’s own public URL. Links use configured public destinations without localhost fallbacks. Production requires COOKIE_DOMAIN to share sessions and confirmed appearance across subdomains; incomplete session configuration fails before rotation.

INSTANCE_TIMEZONE is the instance-wide IANA zone, for example Indian/Reunion. The documented fallback is UTC. The server layout passes the zone to components; civil dates remain dates and instants use the instance zone. Business server conversion and Calendar recurrence remain API/BFF responsibilities; no such backend code changes here.

The layout reads the JWT role claim to display the Admin entry on first render. One alias table is shared. Missing, unknown or expired claims display Guest. Decoding does not verify the signature or grant authorization: BFFs still decide every operation.

A validated Settings bootstrap or save receipt can cache confirmed appearance (theme, density, font) in a versioned public cookie containing no personal data or secrets. Other modules and tabs consume that cache. Drafts and refusals do not publish a new state; unavailable optional storage does not turn server success into failure.

## Verification

Run npm test, npm run lint, tsc --noEmit --incremental false and npm run contracts:check with Node 24/npm 11. Tests cover artifact integrity, SSR roles, network boundaries, renewal/refusal, revocation and day boundaries. Original native Node coverage remains available; V8 component reports, where used, write separately to coverage/components. A 60% coverage gate is not an RGAA certification. Deployed acceptance, screen-reader testing and exhaustive zoom/text-spacing checks remain outstanding.
