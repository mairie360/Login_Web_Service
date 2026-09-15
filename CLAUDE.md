# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Next.js 15 (App Router, React 19, TypeScript, Tailwind 4) web service for Mairie360 hosting the sign-in page, which issues the `accessToken` cookie used by every other front. The browser only talks to this app's own origin; the Next.js server forwards data calls to **BFF_user**. UI building blocks come from the private package `@mairie360/lib-components`. Docs are bilingual: `docs/en|fr/module.md` (functional) and `docs/en|fr/technical.md` (routes, config, troubleshooting) — update both languages together. `BFF.md` / `BACKEND.md` contain *proposed* backend needs; the OpenAPI snapshot is the source of truth for implemented behaviour.

## Commands

Private `@mairie360/*` packages come from GitHub Packages: `.npmrc` reads `NODE_AUTH_TOKEN`, so export a token with `read:packages` before installing or building images.

```bash
npm ci
npm run dev -- --port 5000         # needs the BFF(s) reachable, see "BFF URL" below
npm run build && npm run start -- --port 5000
npm run lint                             # next lint (next/core-web-vitals + next/typescript)
npm test                                 # node:test on tests/*.test.cjs + lcov in coverage/lcov.info (what CI runs)
npm run test:contracts                   # same tests, no coverage
node --test --test-name-pattern="<name>" tests/proxy.test.cjs   # single test
```

Tests are plain CommonJS `node:test` files: they transpile `src/**/*.ts` on the fly with `typescript.transpileModule` via a temporary `require.extensions['.ts']` hook and stub `global.fetch`. No Jest/Vitest, no DOM tests; new tests must follow that pattern and match `tests/*.test.cjs`. The hook does not resolve the `@/*` tsconfig alias, so a module loaded by a test must use relative runtime imports.

### OpenAPI contract

`contracts/openapi.json` is a committed copy of BFF_user's contract and `src/contracts/bff.d.ts` is generated from it (`openapi-typescript@7.10.1`, pinned in `scripts/contracts.mjs`). Never hand-edit either file.

```bash
BFF_CONTRACT_DIR=../../BFFs/BFF_user/contracts npm run contracts:sync   # copy the BFF contract and regenerate types
npm run contracts:generate  # regenerate types from the local snapshot
npm run contracts:check     # fail if types are stale, or if the BFF checkout at $BFF_CONTRACT_DIR has a different contract
```

The script's default source `../BFF_user/contracts` resolves to `Fronts/BFF_user`, which does not exist in the EIP checkout, so always set `BFF_CONTRACT_DIR` (without it, `check` silently skips the BFF comparison). All three commands `npm exec` `openapi-typescript`, so they need network access.

## Architecture

- **Contract-gated catch-all proxy** — `src/app/[...path]/route.ts` exports `proxyBffRequest` (`src/lib/bff-proxy.ts`) for every method. It matches the path against `contracts/openapi.json` `paths` (brace segments are wildcards): unknown path → 404, method not declared → 405 with `Allow`, `.`/`..` segments → 400; `/openapi.json` and `/swagger.json` are always forwarded. **A BFF route is therefore reachable from the browser only once the synced contract declares it.**
- **`forwardToBff`** strips hop-by-hop headers and the `cookie` header, turns the `accessToken` cookie into `Authorization: Bearer` when no Authorization header is present, keeps the query string and raw (binary) body, uses `redirect: 'manual'`, a 15 s timeout and `Cache-Control: no-store`, preserves upstream status/headers (including `Set-Cookie`, empty 204/205/304 bodies) and returns a controlled 502 JSON error when the BFF is unreachable. `tests/proxy.test.cjs` pins this behaviour.
- **BFF URL** — `BFF_USER_API_URL` → `USER_BFF_URL` (fallback `http://localhost:4000`); resolved at request time on the server.
- **Security headers** — `src/middleware.ts` (matcher excludes `/api`, `/_next/*` and paths with a dot) sets a per-request nonce `Content-Security-Policy` on every page (built in `src/lib/content-security-policy.ts`, forwarded to Next.js via request headers); there is no auth gate because the sign-in page is public. `src/app/layout.tsx` forces dynamic rendering for that reason: a prerendered page would carry no nonce and its scripts would be blocked. Any new external origin (images, fonts, browser-side API calls) must be added to that policy.
- **Client calls** — pages call same-origin paths (e.g. `/me`, `/session/me`).
- `src/components/Login.tsx` (mounted by `src/app/page.tsx`, which passes `PROJECT_FRONT_URL` as the post-login destination) posts to the dedicated route handlers, not to the generic proxy. The `<form>` keeps `method="post"` so that a native submission (no JavaScript, crawlers such as the ZAP spider) never puts the credentials in the URL.
- `src/app/api/auth/login/route.ts`: sends `email`, `password` and the user-agent as `device_info` to BFF User `/auth/login` (10 s timeout, 502 vs 504 distinguished). On success the **access token is taken only from the upstream `Authorization: Bearer` header** (never from a refresh token in the body) and stored in the `accessToken` cookie: HttpOnly, SameSite strict, path `/`, 24 h, Secure in production, `COOKIE_DOMAIN` when set (must match the other fronts so they can read it).
- A 412 with a body `token` means first login: the token goes into a `passwordChangeToken` cookie (HttpOnly, path `/api/auth`, 10 min) and the client gets `{ requiresPasswordChange: true }`. `api/auth/force-change-password/route.ts` maps `newPassword` → `new_password`, forwards that token and clears the cookie; `api/auth/force_change_password/route.ts` is only a re-export alias.
- `tests/login.test.cjs` pins this cookie behaviour; keep it green when touching the login routes.
- `next.config.ts` sets `output: 'standalone'` (required by the Dockerfile), `poweredByHeader: false` and static security headers on every route (`tests/security-headers.test.cjs` pins them, and the ZAP baseline fails without them). `PROJECT_FRONT_URL` (post-login destination) is read at request time by `src/app/page.tsx`, not inlined at build time.

## CI/CD

- `.github/workflows/cicd.yml` calls `mairie360/CICD/.github/workflows/frontend-cicd.yml@v2.0.0` (`package_name: login-front`, `node_version: "23"`, `cicd_version: v2.0.0`, `secrets: inherit`). Up to the dev release it runs: `npm ci` → `npm run lint` + `npm audit --audit-level=high` (high/critical advisories block) → `npm run build` → `npm test --if-present` (uploads `coverage/lcov.info` to Codecov) → on `main`, builds `Dockerfile` with `NODE_AUTH_TOKEN` as build-arg and pushes `ghcr.io/mairie360/login-front:dev-<sha>` / `dev-latest`. Some jobs set up Node without a registry, so the committed `.npmrc` must keep the `@mairie360` registry + `${NODE_AUTH_TOKEN}` lines.
- `.github/workflows/contracts.yml` (Node 22) runs `contracts:check` and `test:contracts` on every push/PR.
- `.github/workflows/nextjs.yml` additionally runs lint + build on Node 20 for pushes/PRs to `main` (redundant with the reusable CICD).
- `Dockerfile`: two-stage `node:<ver>-bookworm-slim` build, standalone output, non-root `nextjs` user, `PORT=5000`, `CMD node server.js`.

## Isolated security & performance tests

Same pattern as the APIs/BFFs, adapted to a web front. Not part of `npm test`; they need Docker and `NODE_AUTH_TOKEN` (the front image is built from the production `Dockerfile`).

- `./security_test.sh` → `docker-compose-security.yml`: full isolated upstream stack (Postgres + Liquibase + `init-test.sql` seed, Redis, Core API, BFF User; published GHCR images, versions overridable via `*_IMAGE` env vars) + this front, then `zap-baseline.py` (spider + passive scan) authenticated with a static `accessToken` cookie. Any WARN/FAIL alert not set to IGNORE in `.zap/rules.tsv` fails the run.
- `./performance_test.sh` → `docker-compose-performance.yml`: same stack + k6 running `load-test.js` (pages, `/health`, `/me`, `/session/me` through the proxy) with a JWT minted from `JWT_SECRET`; thresholds fail the run.
- Test user is id 2 (seeded in `init-test.sql`); every service shares `JWT_SECRET=b"secret"`. `TARGET_IMAGE` lets the stacks reuse a pre-built front image. These files are excluded from the image by `.dockerignore`.
