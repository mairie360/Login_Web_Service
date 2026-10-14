# Frontend experience and performance — MAIR-548 to MAIR-553

Desktop commands can collapse while retaining accessible names, hover/focus tooltips and Escape dismissal. The versioned `mairie360_sidebar` preference uses a validated parent `COOKIE_DOMAIN`. Mobile navigation retains the published focus trap and focus restoration. Authentication cookies use the existing published transport.

Validated URL state restores Settings tabs; Project search/status/priority/due date/view/page; Calendar date/view and existing event links; Message conversation selection; historical E-learning search/category/status; Administration tabs and user search/page. Server searches debounce for 250 ms and obsolete reads are cancelled/ignored. Coalesced foreground refresh retains same-account drafts and confirmed data; on foreground refresh, Settings does not merge a draft across a changed confirmed email scope; explicit retry preserves edited fields.

Project receipts update the view immediately; a silent read of the filtered page reconciles totals/options that are absent from mutation receipts. There is no whole-page reload. A dedicated first-load state prevents late filters from moving painted content. Messages use the published SSE operation with the existing session protocol, a bounded handshake and an unbounded cancellable body, Last-Event-ID, bounded deduplication, at most five retries, foreground recovery and an explicit retry action. Unsupported reception retains the existing polling behavior. Events trigger authoritative reads rather than inventing confirmed mutations.

Calendar caches at most six periods for 60 seconds per mounted, identified account. Bootstrap supplies context, `/calendar/period` supplies later ranges. Confirmed mutations invalidate the cache; stale responses cannot populate it. One adjacent range is prefetched during browser idle time. Manual retry and foreground recovery read authoritative context. Private data is not persisted.

## Reproduce the laboratory run

Run `npm ci`, `node node_modules/playwright-core/cli.js install --with-deps chromium --only-shell`, `npm run build -- --webpack`, then `npm run performance:report -- --output performance/candidate/report.json`.

Node 24.21.0; exact locked Next/SDK versions; Playwright Core 1.64.0 pins the browser. Three fresh contexts use 390x844, CPU x4, 100 ms network latency, 200000 bytes/s download and 93750 bytes/s upload. The business date is fixed without changing performance clocks. The Next-supplied Web Vitals collector is identified by SHA-256. Missing measurements fail instead of becoming artificial zeroes.

Only loopback servers and fictitious fixtures are used. `mairie360_lab_session` is translated by the laboratory proxy; actual session cookies are never forwarded. Writes are not simulated. Production frontend source, middleware and CSP are compiled unchanged; local build concurrency is limited to one worker. This measures the frontend under controlled data latency, not a deployed backend or real-user percentiles.

Reports distinguish total produced JavaScript from initially requested JavaScript, raw and gzip level 9. They contain samples, median LCP/INP/CLS, layout-shift attribution, screenshots, build and environment identifiers. CI builds baseline and candidate on the same runner and archives results. `node scripts/compare-performance.mjs baseline.json candidate.json comparison.json` rejects non-comparable profiles.

Proposed budgets remain observational until retained in MAIR-549: initial JS at most measured baseline +10%; LCP 2500 ms, INP 200 ms, CLS 0.1. The latter values are [Web Vitals quality targets](https://web.dev/articles/vitals), not evidence of field compliance. This workflow enables no blocking performance thresholds before acceptance.

## Packaging choices and remaining validation

SDK imports retain their generated entry points. UI 0.8.0 exposes no supported per-module UI entry points; none are invented. Shared CSS remains in all eight frontends and the library. Next marks `optimizePackageImports` experimental; this delivery retains supported client/server boundaries while documenting the baseline. Server-side private bootstrap would need to preserve authentication recovery and CSP rules.

The shared component and theme are prepared in the existing library PR. Frontends retain compatibility wrappers until an exact new release can pass the existing security gates. No audit, coverage threshold or branch protection is weakened. No BFF/API production source or manual Stage/Production deployment is changed.

Laboratory screenshots do not certify global RGAA compliance. Screen-reader and deployed business acceptance still require validation; no usable development account is available. Proposed budgets do not establish an activation date.
