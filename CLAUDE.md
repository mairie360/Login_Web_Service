# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Next.js 15 (App Router, React 19, TypeScript, Tailwind 4) web service for Mairie360 hosting the sign-in page, which issues the `accessToken` cookie used by every other front. The browser only talks to this app's own origin; the Next.js server forwards data calls to **BFF_user**. UI building blocks come from the private package `@mairie360/lib-components`. Docs are bilingual: `docs/en|fr/module.md` (functional) and `docs/en|fr/technical.md` (routes, config, troubleshooting) — update both languages together. `BFF.md` / `BACKEND.md` contain *proposed* backend needs; the OpenAPI snapshot is the source of truth for implemented behaviour.

## Commands

Private `@mairie360/*` packages come from GitHub Packages: `.npmrc` reads `NODE_AUTH_TOKEN`, so export a token with `read:packages` before installing or building images.

```bash
npm ci
npm run dev -- --port 5000         # needs BFF User reachable, see "BFF URL" below
npm run build && npm run start -- --port 5000
npm run lint                             # next lint (next/core-web-vitals + next/typescript)
npm test                                 # node:test on tests/*.test.cjs + lcov in coverage/lcov.info (what CI runs)
npm run test:contracts                   # same tests, no coverage
node --test --test-name-pattern="<name>" tests/proxy.test.cjs   # single test
```

Tests are plain CommonJS `node:test` files. `tests/support/load-ts.cjs` (`requireTs`) transpiles `src/**/*.ts` on the fly with `typescript.transpileModule` through a temporary `require.extensions['.ts']` hook (the older suites inline the same hook). No Jest/Vitest, no DOM tests; new tests must match `tests/*.test.cjs`. The hook does not resolve the `@/*` tsconfig alias, so a module loaded by a test must use relative runtime imports (`import type … from '@/…'` is fine: `transpileModule` erases it). That is why `src/app/[...path]/route.ts` imports `../../lib/bff-proxy`.

`npm test` fails below 60% lines/branches/functions, but Node only counts modules a test actually loads. A new server module under `src/` must be required by a test, or it is silently left out of coverage. `.tsx` components are not measured.

Suites:
- `bff-contract.test.cjs` is the main one. It loads the login and force-change route handlers, the alias and the catch-all route, and runs them with the **real** `fetch` against a fake BFF User. The fake BFF is `tests/support/contract-mock-server.cjs`, a real HTTP server on `127.0.0.1:0` driven by `contracts/openapi.json` through `tests/support/openapi-contract.cjs`. Both are CommonJS ports of `BFFs/BFF_user/tests/support/*.ts`, so keep the logic aligned. The mock records a violation for any request outside the contract (path, method, path/query parameter, JSON body) and for any mocked reply whose status is undeclared or whose body doesn't match its schema. `afterEach` fails the test on any violation, or when `fetch` reached an origin other than the mock. The package-derived contract only types `2XX` (plus `412` on login), so every error reply must say `outOfContract: true`. Use the `apiError()` helper, which still validates the body against the published `ApiErrorResponse` model. The proxy block builds requests and replies with `contract.sample(schema)` for **every** contract operation, so a package bump with new routes is covered automatically.
- Mock-server gotchas:
  - The login route reads `COOKIE_DOMAIN` when the module loads, so it is required in `before()`. The BFF URL is resolved per request by `src/lib/bff-user.ts`.
  - Timeouts are simulated by shortening `AbortSignal.timeout` together with `delayMs`, and network failures with `dropConnection`.
  - HEAD is validated as the matching GET.
  - `/openapi.json` is allowed through `allowUndeclared`.
- `network-calls.test.cjs` walks the TypeScript AST of `src/**` and fails on any network API other than `fetch`. Each `fetch` must be one of:
  - `fetch(bffUserUrl('<path>'), { method: '<LIT>' })` hitting a contract operation;
  - a same-origin literal (`fetch('/api/…')`) matching an existing `src/app/**/route.ts` export or a contract operation;
  - the single dynamic `fetch(target)` in `bff-proxy.ts`.

  The expected server and browser call lists are pinned, so adding a network call means updating this test. The same file checks that BFF User is the only BFF: `BFF_USER_API_URL` / `USER_BFF_URL` are the only BFF environment variables, read only in `src/lib/bff-user.ts`, and the proxy forwards to `configuredBffUrl()`.
- `package-contract.test.cjs` checks four things:
  - `@mairie360/bff-user-openapi` is pinned to an exact `X.Y.Z`, and the installed and locked versions match it;
  - it is the only `@mairie360/bff-*-openapi` dependency;
  - `contracts/openapi.json` equals the contract rebuilt from the installed package;
  - every `docker-compose*.yml` starts only `bff-user`, tagged with that same version.
- `proxy.test.cjs` and `login.test.cjs` are older `global.fetch` stub tests (binary bodies, basic cookie rules). `security-headers.test.cjs` covers the middleware nonce CSP, the dev-only `'unsafe-eval'` and the static headers in `next.config.ts`.

### Local dev stack

`docker compose watch` (needs `NODE_AUTH_TOKEN` exported, passed as a build secret) starts Postgres + Liquibase (`dev-latest` GHCR images), Redis, Core API (host 3000), BFF User (host 4000, `bff-user:<contract package version>`, overridable with `BFF_USER_IMAGE`) and this front built from `development.Dockerfile` in `next dev` mode, published on host **3001** (container port 3000), with `./src` synced. Set `PROJECT_FRONT_URL` for the post-login redirect.

### OpenAPI contract

The only contract is **BFF User's, as published in `@mairie360/bff-user-openapi`**, pinned to an exact version in `package.json`. Never copy it from a BFF checkout: the local `BFFs/BFF_user` can be ahead of the last release. The package is orval output (`endpoints/bffUser.ts` + `model/*.ts`, no `openapi.json`, and its `main` points to a missing `index.ts`), so:

- `scripts/orval-contract.mjs` rebuilds an OpenAPI document from it, using the TypeScript compiler API. It is an ESM port of `BFFs/BFF_user/tests/support/orval-contract.ts`. It writes that document to the committed `contracts/openapi.json`, which the proxy imports at build time and the tests load. Never hand-edit it.
- orval keeps paths, methods, parameters, bodies, success models and JSDoc constraints (`@minLength`, `@nullable`…).
  - It drops formats (email), examples, response headers and error statuses. Success is exposed as `2XX`. Only models named `<OperationId><status>` (`PostAuthLogin412`) document another status.
- Route handlers import their types straight from the package (`import type { LoginView } from '@mairie360/bff-user-openapi/model'`). There is no generated `.d.ts` any more.

```bash
npm install --save-exact @mairie360/bff-user-openapi@X.Y.Z   # bump: published releases only, never 0.0.0-dev/staging
npm run contracts:sync      # (= contracts:generate) rebuild contracts/openapi.json from the installed package
npm run contracts:check     # fail if the version isn't exact X.Y.Z, installed != package.json, a second bff-*-openapi exists, or the snapshot is stale
```

These commands run offline. After a bump, also move the `bff-user` image tags in the `docker-compose*.yml` files to the same version (`package-contract.test.cjs` enforces it), then adapt the route handlers.

## Architecture

- **Contract-gated catch-all proxy** — `src/app/[...path]/route.ts` exports `proxyBffRequest` (`src/lib/bff-proxy.ts`) for every method. It matches the path against `contracts/openapi.json` `paths` (brace segments are wildcards): unknown path → 404, method not declared → 405 with `Allow`, `.`/`..` segments → 400; `/openapi.json` and `/swagger.json` are always forwarded. **A BFF route is therefore reachable from the browser only once the synced contract declares it.**
- **`forwardToBff`** strips hop-by-hop headers and the `cookie` header, turns the `accessToken` cookie into `Authorization: Bearer` when no Authorization header is present, keeps the query string and raw (binary) body, uses `redirect: 'manual'`, a 15 s timeout and `Cache-Control: no-store`, preserves upstream status/headers (including `Set-Cookie`, empty 204/205/304 bodies) and returns a controlled 502 JSON error when the BFF is unreachable. `tests/proxy.test.cjs` and `tests/bff-contract.test.cjs` pin this behaviour. The proxy only gates path shape and method: it forwards query strings, path parameter values and bodies as-is, and the BFF validates them.
- **BFF URL** — BFF User is the only BFF. `src/lib/bff-user.ts` is the single place that resolves it: `BFF_USER_API_URL` → `USER_BFF_URL`, with fallback `http://localhost:4000`, read per request. The proxy uses `configuredBffUrl()`, and the route handlers call `fetch(bffUserUrl('/auth/…'))`.
- **Security headers** — `src/middleware.ts` (matcher excludes paths starting with `api`, `_next/static`, `_next/image` and paths with a dot, so proxied BFF paths do go through it) sets a per-request nonce `Content-Security-Policy` on every page (built in `src/lib/content-security-policy.ts`, forwarded to Next.js via request headers); there is no auth gate because the sign-in page is public. `src/app/layout.tsx` forces dynamic rendering for that reason: a prerendered page would carry no nonce and its scripts would be blocked. Any new external origin (images, fonts, browser-side API calls) must be added to that policy. `style-src-attr 'unsafe-inline'` exists only for the inline `style` attributes set by lib-components. The middleware injects `x-nonce` / `content-security-policy` request headers, which `forwardToBff` strips before calling the BFF.
- **Client calls** — pages call same-origin paths (e.g. `/me`, `/session/me`).
- `src/components/Login.tsx` (mounted by `src/app/page.tsx`, which passes `PROJECT_FRONT_URL` as the post-login destination) posts to the dedicated route handlers, not to the generic proxy. The `<form>` keeps `method="post"` so that a native submission (no JavaScript, crawlers such as the ZAP spider) never puts the credentials in the URL.
- `src/app/api/auth/login/route.ts`: validates the credentials before calling BFF User. `EMAIL_PATTERN` is the `z.email()` regex of BFF User's `LoginViewSchema`, a format the orval package no longer carries, and the password must be non-empty. It then sends `email`, `password` and the user-agent as `device_info` to BFF User `/auth/login`, falling back to `Navigateur inconnu` when the user-agent is empty, because `LoginView` requires `minLength 1`. The call has a 10 s timeout and distinguishes 502 from 504. Error responses carry front-owned French messages chosen by status. BFF User's `message` values (`Upstream service error`, raw Core API text) are technical English and are never shown. On success the **access token is taken only from the upstream `Authorization: Bearer` header** (never from a refresh token in the body) and stored in the `accessToken` cookie: HttpOnly, SameSite strict, path `/`, 24 h, Secure in production, `COOKIE_DOMAIN` when set (must match the other fronts so they can read it).
- A 412 with a body `token` means first login: the token goes into a `passwordChangeToken` cookie (HttpOnly, path `/api/auth`, 10 min) and the client gets `{ requiresPasswordChange: true }`. `api/auth/force-change-password/route.ts` maps `newPassword` → `new_password`, forwards that token and clears the cookie (also on upstream 401 — token refused by Core — and 403 — first-connection token unknown or expired in BFF User — which return `restartLogin: true`; other statuses are kept, with a French message). `api/auth/force_change_password/route.ts` is a re-export alias, but it is the URL `Login.tsx` actually calls, so don't remove it. After a successful change, the client immediately logs in again with the new password.
- `tests/bff-contract.test.cjs` (and the older `tests/login.test.cjs`) pin this cookie and error-mapping behaviour; keep them green when touching the login routes.
- `next.config.ts` sets `output: 'standalone'` (required by the Dockerfile), `poweredByHeader: false` and static security headers on every route (`tests/security-headers.test.cjs` pins them, and the ZAP baseline fails without them). `PROJECT_FRONT_URL` (post-login destination) is read at request time by `src/app/page.tsx`, not inlined at build time.

## CI/CD

- `.github/workflows/cicd.yml` calls `mairie360/CICD/.github/workflows/frontend-cicd.yml@<tag>` (`package_name: login-front`, `node_version: "23"`, `cicd_version` = the same tag, `secrets: inherit`). Renovate bumps the tag (`auto-approve.yml` approves its PRs); keep `uses:@` and `cicd_version` identical when editing by hand. Up to the dev release it runs: `npm ci` → `npm run lint` + `npm audit --audit-level=high` (high/critical advisories block) → `npm run build` → `npm test --if-present` (uploads `coverage/lcov.info` to Codecov) → on `main`, builds `Dockerfile` with `NODE_AUTH_TOKEN` as build-arg and pushes `ghcr.io/mairie360/login-front:dev-<sha>` / `dev-latest`. Some jobs set up Node without a registry, so the committed `.npmrc` must keep the `@mairie360` registry + `${NODE_AUTH_TOKEN}` lines.
- `.github/workflows/contracts.yml` (Node 22) runs `contracts:check` and `test:contracts` on every push/PR.
- `.github/workflows/nextjs.yml` additionally runs lint + build on Node 20 for pushes/PRs to `main` (redundant with the reusable CICD).
- `Dockerfile`: two-stage `node:<ver>-bookworm-slim` build, standalone output, non-root `nextjs` user, `PORT=5000`, `CMD node server.js`.

## Isolated security & performance tests

Same pattern as the APIs/BFFs, adapted to a web front. Not part of `npm test`; they need Docker and `NODE_AUTH_TOKEN` (the front image is built from the production `Dockerfile`).

- `./security_test.sh` → `docker-compose-security.yml`: full isolated upstream stack (Postgres + Liquibase + `init-test.sql` seed, Redis, Core API, BFF User; published GHCR images, versions overridable via `*_IMAGE` env vars) + this front, then `zap-baseline.py` (spider + passive scan) authenticated with a static `accessToken` cookie. Any WARN/FAIL alert not set to IGNORE in `.zap/rules.tsv` fails the run.
- `./performance_test.sh` → `docker-compose-performance.yml`: same stack + k6 running `load-test.js` (pages, `/health`, `/me`, `/session/me` through the proxy) with a JWT minted from `JWT_SECRET`; thresholds fail the run.
- Test user is id 2 (seeded in `init-test.sql`); every service shares `JWT_SECRET=b"secret"`. `TARGET_IMAGE` lets the stacks reuse a pre-built front image. These files are excluded from the image by `.dockerignore`.
