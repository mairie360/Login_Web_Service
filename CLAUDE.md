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

`npm test` fails below 60% lines/branches/functions, but Node only counts modules a test actually loads. A new server module under `src/` must be required by a test, or it is silently left out of coverage. `src/components/Login.tsx` is loaded and measured by `tests/login-page-html.test.cjs` only.

Suites:
- `bff-contract.test.cjs` is the main one. It loads the login and force-change route handlers, the alias and the catch-all route, and runs them with the **real** `fetch` against a fake BFF User. The fake BFF is `tests/support/contract-mock-server.cjs`, a real HTTP server on `127.0.0.1:0` driven by `contracts/openapi.json` through `tests/support/openapi-contract.cjs`. Both are CommonJS ports of `BFFs/BFF_user/tests/support/*.ts`, so keep the logic aligned. The mock records a violation for any request outside the contract (path, method, path/query parameter, JSON body) and for any mocked reply whose status is undeclared or whose body doesn't match its schema. `afterEach` fails the test on any violation, or when `fetch` reached an origin other than the mock. The package-derived contract only types `2XX` (plus `412` on login), so every error reply must say `outOfContract: true`. Use the `apiError()` helper, which still validates the body against the published `ErrorResponse` model (`{ error: { code, message, details } }`). The proxy block builds requests and replies with `contract.sample(schema)` for **every** contract operation, so a package bump with new routes is covered automatically.
- Mock-server gotchas:
  - The login route reads `COOKIE_DOMAIN` when the module loads, so it is required in `before()`. The BFF URL is resolved per request by `src/lib/bff-user.ts`.
  - Timeouts are simulated by shortening `AbortSignal.timeout` together with `delayMs`, and network failures with `dropConnection`.
  - HEAD is validated as the matching GET.
  - `/openapi.json` is allowed through `allowUndeclared`.
- `login-page-html.test.cjs` renders the real page (`src/app/page.tsx` → `Login.tsx`) through `tests/support/server-view.cjs` (`react-dom/server` with hook state kept between passes, same file in every front, see `../CLAUDE.md`) and `tests/support/browser-front.cjs`, which dispatches the page's same-origin `fetch` to the real `src/app/api/auth/*` handlers with a cookie jar and lets them reach only the mock BFF User. Typing (`view.fire(id, 'onChange')`), submitting, the success/error messages, the `accessToken` cookie, the first-connection password change and the redirect (`window.location.assign`) are asserted on the HTML. `next/image` is stubbed to a plain `<img>` (its loader needs the Next.js runtime).
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

`docker compose watch` (needs `NODE_AUTH_TOKEN` exported, passed as a build secret) starts Postgres + Liquibase (`dev-latest` GHCR images), Redis, Core API (host 3000), BFF User (host 4000, `bff-user:<contract package version>`, overridable with `BFF_USER_IMAGE`) and this front built from `development.Dockerfile` in `next dev` mode, published on host **3001** (container port 3000), with `./src` synced. Set `DASHBOARD_FRONT_URL` for the default post-login redirect; `PROJECT_FRONT_URL` remains an allowed explicit return origin.

### OpenAPI contract

The only contract is **BFF User's, as published in `@mairie360/bff-user-openapi`**, pinned to an exact version in `package.json`: a release `X.Y.Z`, or the `0.0.0-dev.<sha>` package the CICD publishes for each commit of BFF User `main` (used since MAIR-509 while no release is cut), or, once that commit is released on staging, the `0.0.0-staging.<sha40>` package of the same commit, preferred on a staging release for readability (MAIR-600; `scripts/contract-version.mjs` is the policy, `0.0.0-staging.<short sha>` and ranges are refused). Never copy it from a BFF checkout: the local `BFFs/BFF_user` can be ahead of what is published. The package is orval output (`endpoints/bffUser.ts` + `model/*.ts`, no `openapi.json`, and its `main` points to a missing `index.ts`), so:

- `scripts/orval-contract.mjs` rebuilds an OpenAPI document from it, using the TypeScript compiler API. It is an ESM port of `BFFs/BFF_user/tests/support/orval-contract.ts`. It writes that document to the committed `contracts/openapi.json`, which the proxy imports at build time and the tests load. Never hand-edit it.
- orval keeps paths, methods, parameters, bodies, success models and JSDoc constraints (`@minLength`, `@nullable`…).
  - It drops formats (email), examples, response headers and error statuses. Success is exposed as `2XX`. Only models named `<OperationId><status>` (`PostAuthLogin412`) document another status. Nullable orval enums (`typeof X[keyof typeof X] | null`) become `{ type: ['string','null'], enum: [..., null] }`.
- Route handlers import their types straight from the package (`import type { LoginView } from '@mairie360/bff-user-openapi/model'`). There is no generated `.d.ts` any more.

```bash
npm install --save-exact @mairie360/bff-user-openapi@<version>   # bump: a release X.Y.Z, a published 0.0.0-dev.<sha40> or 0.0.0-staging.<sha40> (MAIR-600)
npm run contracts:sync      # (= contracts:generate) rebuild contracts/openapi.json from the installed package
npm run contracts:check     # fail if the version isn't an accepted exact version, installed != package.json, a second bff-*-openapi exists, or the snapshot is stale
```

These commands run offline. After a bump, also move the `bff-user` image tags in the `docker-compose*.yml` files to the image built from the same commit (`X.Y.Z` for a release, `dev-<sha7>` for a dev package, `staging-<sha7>` for a staging package; `package-contract.test.cjs` enforces it through `imageTagForContractVersion`), then adapt the route handlers. The stacks also pin dev images of Core API and the database; the dev Core API needs `JWT_ALLOW_WEAK_SECRET` for the shared test secret and `RATE_LIMIT_ENABLED=false`, BFF User needs `JWT_SECRET` and `AUTH_RATE_LIMIT_ENABLED=false` for ZAP, and `init-test.sql` must seed argon2id password hashes.

## Figma mockup

Figma is the source of truth: design and agree any UI change on **Mairie360 – Login_Web_Service** (https://www.figma.com/design/nBzRonQklXlr4qaakqP7mn) first, then code it. Shared components come from the lib mockup https://www.figma.com/design/T7vetUfuzPEXk5TxjHRiO2 and are instantiated, never redrawn. Login has no application shell (no sidebar / top bar), so MAIR-578 only adds this link here.

## Architecture

- **Contract-gated catch-all proxy** — `src/app/[...path]/route.ts` exports `proxyBffRequest` (`src/lib/bff-proxy.ts`) for every method. It matches the path against `contracts/openapi.json` `paths` (brace segments are wildcards): unknown path → 404, method not declared → 405 with `Allow`, `.`/`..` segments → 400; `/openapi.json` and `/swagger.json` are always forwarded. **A BFF route is therefore reachable from the browser only once the synced contract declares it.**
- **`forwardToBff`** strips hop-by-hop headers and the `cookie` header, turns the `accessToken` cookie into `Authorization: Bearer` when no Authorization header is present, keeps the query string and raw (binary) body, uses `redirect: 'manual'`, a 15 s timeout and `Cache-Control: no-store`, preserves upstream status/headers (including `Set-Cookie`, empty 204/205/304 bodies) and returns a controlled 502 JSON error when the BFF is unreachable. `tests/proxy.test.cjs` and `tests/bff-contract.test.cjs` pin this behaviour. The proxy only gates path shape and method: it forwards query strings, path parameter values and bodies as-is, and the BFF validates them.
- **BFF URL** — BFF User is the only BFF. `src/lib/bff-user.ts` resolves `BFF_USER_API_URL` → `USER_BFF_URL` per request; an explicit HTTP(S) URL is required. Missing or invalid configuration returns an uncached 503 without an upstream call. The proxy uses `configuredBffUrl()`, and the route handlers call `fetch(bffUserUrl('/auth/…'))` after checking the configuration.
- **Security headers** — `src/middleware.ts` (matcher excludes paths starting with `api`, `_next/static`, `_next/image` and paths with a dot, so proxied BFF paths do go through it) sets a per-request nonce `Content-Security-Policy` on every page (built in `src/lib/content-security-policy.ts`, forwarded to Next.js via request headers); there is no auth gate because the sign-in page is public. `src/app/layout.tsx` forces dynamic rendering for that reason: a prerendered page would carry no nonce and its scripts would be blocked. Any new external origin (images, fonts, browser-side API calls) must be added to that policy. `style-src-attr 'unsafe-inline'` exists only for the inline `style` attributes set by lib-components. The middleware injects `x-nonce` / `content-security-policy` request headers, which `forwardToBff` strips before calling the BFF.
- **Client calls** — pages call same-origin paths (e.g. `/me`, `/session/me`).
- `src/components/Login.tsx` (mounted by `src/app/page.tsx`, which passes a validated return URL or `DASHBOARD_FRONT_URL` as the post-login destination) posts to the dedicated route handlers, not to the generic proxy. The `<form>` keeps `method="post"` so that a native submission (no JavaScript, crawlers such as the ZAP spider) never puts the credentials in the URL.
- `src/app/api/auth/login/route.ts`: validates the credentials before calling BFF User. `EMAIL_PATTERN` is the `z.email()` regex of BFF User's `LoginViewSchema`, a format the orval package no longer carries, and the password must be non-empty. It then sends `email`, `password` and the user-agent as `device_info` to BFF User `/auth/login`, falling back to `Navigateur inconnu` when the user-agent is empty, because `LoginView` requires `minLength 1`. The call has a 10 s timeout and distinguishes 502 from 504. Error responses carry front-owned French messages chosen by status. BFF User's `message` values (`Upstream service error`, raw Core API text) are technical English and are never shown. On success the tokens are read from the upstream `Set-Cookie` pair `accessToken`/`refreshToken` (`readBffCookieSession`, the only protocol of the current contract, whose body is `AuthSessionResponse { message }`); a reply without session cookies falls back to the `0.5.0` protocol (`Authorization: Bearer` header + `refresh_token` body). The access token is stored in the `accessToken` cookie: HttpOnly, SameSite strict, path `/`, 24 h, Secure in production, `COOKIE_DOMAIN` when set (must match the other fronts so they can read it).
- A 412 with a body `token` means first login: the token goes into a `passwordChangeToken` cookie (HttpOnly, path `/api/auth`, 10 min) and the client gets `{ requiresPasswordChange: true }`. `api/auth/force-change-password/route.ts` maps `newPassword` → `new_password`, forwards that token and clears the cookie (also on upstream 401 — token refused by Core — and 403 — first-connection token unknown or expired in BFF User — which return `restartLogin: true`; other statuses are kept, with a French message). `api/auth/force_change_password/route.ts` is a re-export alias, but it is the URL `Login.tsx` actually calls, so don't remove it. After a successful change, the client immediately logs in again with the new password.
- `tests/bff-contract.test.cjs` (and the older `tests/login.test.cjs`) pin this cookie and error-mapping behaviour; keep them green when touching the login routes.
- **Keycloak sign-in (MAIR-153)** — `src/app/api/auth/keycloak/route.ts` (start) and `…/keycloak/callback/route.ts` (return) run the OIDC code flow with PKCE (`src/lib/keycloak-login.ts`): state, nonce and verifier live in the `keycloakLogin` cookie (HttpOnly, Lax, path `/api/auth/keycloak`, 10 min); the callback redeems the code through BFF User `POST /auth/keycloak` with `KEYCLOAK_CLIENT_ID` = Core's client (`core-api`), sets the same session cookies as the password login (`setAuthSessionCookies`) and 303s to the module, or back to `/?keycloakError=<kind>` (messages in `KEYCLOAK_ERRORS`). The button only renders when `KEYCLOAK_REALM_URL`, `KEYCLOAK_CLIENT_ID` and `LOGIN_FRONT_URL` are set; password sign-in always stays. `tests/keycloak-login.test.cjs` pins the flow against the contract mock, `login-page-html.test.cjs` the button and messages.
- `next.config.ts` sets `output: 'standalone'` (required by the Dockerfile), `poweredByHeader: false` and static security headers on every route (`tests/security-headers.test.cjs` pins them, and the ZAP baseline fails without them). `DASHBOARD_FRONT_URL` (default post-login destination) is read at request time by `src/app/page.tsx`, not inlined at build time.

## CI/CD

- `.github/workflows/cicd.yml` calls `mairie360/CICD/.github/workflows/frontend-cicd.yml@<sha>` pinned to a CICD commit (`package_name: login-front`, `node_version: "24.21.0"`, `cicd_version` = the same sha, each followed by a `# vX.Y.Z` comment so Renovate bumps them together with `dev-dependency-exception.yml`; `tests/cicd-pin.test.cjs` checks they agree) and passes only the `CODECOV_TOKEN` and `N8N_WEBHOOK_SECRET` secrets plus the release-journal ones (`ANTHROPIC_API_KEY`, `RELEASE_APP_ID`, `RELEASE_APP_PK`, org secrets used by CICD to commit `RELEASE_JOURNAL.md` on `main` after each release). It runs on `pull_request`, `workflow_dispatch` and on `push` to `main` only, so a PR branch no longer runs the pipeline twice (MAIR-436). The workflow token is read-only by default (`permissions: contents: read`); only the `CICD` job gets `contents`/`packages`/`id-token: write`, the cap the reusable workflow needs for its release jobs (dev image push + cosign signature, prod tag). `tests/workflow-permissions.test.cjs` (identical in the eight fronts) pins both rules. A separate read-only `required_security_scan` job runs Semgrep and Gitleaks under the legacy required check name. The reusable pipeline runs `npm ci` → `npm run lint` + `npm audit --omit=dev --audit-level=high` (blocking; the full audit is report-only) + Semgrep/Gitleaks → `npm run build` + `npm test` (Codecov) → on `main`, builds `Dockerfile` with the token as the BuildKit secret `node_auth_token` (never a build arg), scans it with Trivy, signs it with cosign and pushes `ghcr.io/mairie360/login-front:dev-<sha>`. Some jobs set up Node without a registry, so the committed `.npmrc` must keep the `@mairie360` registry + `${NODE_AUTH_TOKEN}` lines.
- `.github/workflows/contracts.yml` (exact Node 24.21.0) runs `contracts:check` and `test:contracts` on every PR and on pushes to `main`.
- `.github/workflows/nextjs.yml` additionally runs lint + build on Node 20 for pushes/PRs to `main` (redundant with the reusable CICD).
- `Dockerfile`: two-stage `node:<ver>-bookworm-slim` build, standalone output, non-root `nextjs` user, `PORT=5000`, `CMD node server.js`.

## Isolated security & performance tests

Same pattern as the APIs/BFFs, adapted to a web front. Not part of `npm test`; they need Docker and `NODE_AUTH_TOKEN` (the front image is built from the production `Dockerfile`).

- `./security_test.sh` → `docker-compose-security.yml`: full isolated upstream stack (Postgres + Liquibase + `init-test.sql` seed, Redis, Core API, BFF User; published GHCR images, versions overridable via `*_IMAGE` env vars) + this front, then `zap-baseline.py` (classic spider + AJAX spider `-j`, which renders the page in a headless browser so the `/api/auth/*` routes and the BFF contract routes fetched by the bundle are scanned too, + passive scan) authenticated with a static `accessToken` cookie. Any WARN/FAIL alert not set to IGNORE in `.zap/rules.tsv` fails the run; since MAIR-516 the server-error rule (100000) is no longer ignored, so a 5xx relayed by the proxy fails the scan.
- `./performance_test.sh` → `docker-compose-performance.yml`: same stack + k6 running `load-test.js`: a `reads` scenario (pages, `/health`, `/me`, `/session/me` through the proxy) with a JWT minted from `JWT_SECRET`, and a `writes` scenario (MAIR-516) that signs in through `POST /api/auth/login` with the seeded credentials (`PERF_USER_EMAIL` / `PERF_USER_PASSWORD`, the clear text of the template hash) and signs out through `POST /api/auth/logout` with the cookies the front issued; strict status checks and per-endpoint thresholds fail the run. Both stacks set `COOKIE_DOMAIN`, which the production image requires to issue the cookie.
- Test user is id 2 (seeded in `init-test.sql`); every service shares `JWT_SECRET=b"secret"`. `TARGET_IMAGE` lets the stacks reuse a pre-built front image. These files are excluded from the image by `.dockerignore`.

## Pull request reviewers

Every PR requests a review from the whole team, minus its author: `CarolinHugo`, `LAURETbenjamin`, `MathTek` and `Quentintnrl` (`gh pr create … --reviewer CarolinHugo,LAURETbenjamin,MathTek`). `.github/CODEOWNERS` makes GitHub request them automatically as well.
