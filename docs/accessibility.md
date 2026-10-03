# Login browser accessibility scope — MAIR-318 / GitHub #138

This document describes **only Login_Web_Service**. It does not declare RGAA
compliance, backend authorization, deployment acceptance, or visual parity with
the old local Login, whose production reference is not exploitable. Login remains
standalone: no AppShell, header, sidebar or footer before authentication.

## Route and state inventory

The UI routes are `/` and `/logout`, corresponding to the two `page.tsx` files
under `src/app`. `/api/auth/*` and the `[...path]` proxy are HTTP handlers, not UI
pages. They are not omitted UI routes or accessibility exemptions.

| UI route | State exercised against real compiled markup/CSS | Interaction/evidence |
| --- | --- | --- |
| `/` | Sign-in | Labels, tab order, native required validation, focus, no POST for empty submission |
| `/` | Sign-in pending | Delayed disposable response, disabled submit, visible loading label |
| `/` | Refused credentials | HTTP 401, real alert, submit re-enabled |
| `/` | Mandatory first connection | Password and confirmation labels/tab order, new-password autocomplete |
| `/` | Password mismatch | Alert, no password-change request |
| `/` | Password-change pending | Disabled submit and loading label |
| `/` | Password-change refusal | HTTP 400, alert, retry remains operable |
| `/` | Expired mandatory change | HTTP 401/restartLogin, original form restored, alert |
| `/` | Password changed/reconnecting | Real live status, second sign-in body uses updated synthetic password |
| `/` → Dashboard | Sign-in success | Actual successful navigation and existing request bodies; destination is intercepted test HTML. Transient final status is not scan-certified (see limits) |
| `/` | Transport unavailable | Aborted isolated request, service-unavailable alert |
| `/` | Destination configuration unavailable | Separate frontend process without Dashboard URL, meaningful heading/message, no form |
| `/logout` | Pending | Delayed first response, real live status |
| `/logout` | Upstream refused | HTTP 503, alert/retry, local cookie-expiry request not attempted |
| `/logout` | Local expiry refused | HTTP 503, alert/retry, no navigation |
| `/logout` → `/` | Success after keyboard retry | Existing request order, observed root navigation and sign-in rendered |

Each scenario runs at desktop **1280×720**, **320×720**, native browser **200%
zoom** at a 1280×720 physical viewport, and **320×720 with text spacing**. Each
stable named state is scanned across the entire page with axe's default rules and **all
violation impacts**. No `exclude`, disabled rule, tag restriction, serious-only
filter, snapshots of accepted violations or `continue-on-error` are used.

Native zoom is configured in a newly generated disposable Chromium profile, using
the default storage partition's `partition.default_zoom_level.x` preference.
The tests require `devicePixelRatio≈2`, CSS `innerWidth≈640`, and root CSS zoom=1:
an ignored preference, CSS zoom, DPR-only emulation or pinch-only magnification
cannot masquerade as a passing 200% browser zoom test. See Chromium's
[zoom preference implementation](https://raw.githubusercontent.com/chromium/chromium/main/chrome/browser/ui/zoom/chrome_zoom_level_prefs.cc).

Text spacing sets line height=1.5, letter spacing=.12em, word spacing=.16em and
paragraph trailing margin=2em. Computed styles are asserted. The test-only style
uses the page's existing nonce; CSP and production CSS remain unchanged.

Every scan records full axe results (**including `incomplete`**), screenshot,
layout metrics and console/network events. Tests assert meaningful page identity,
no AppShell/framework overlay, horizontal reflow, positive visible control boxes,
and operability through actual keyboard/click/focus interactions. Expected
browser resource-error logs are retained and explicitly classified only for the
exact intercepted failing endpoint/status; other warnings/errors fail the test.

## Isolation, run and CI

```sh
npm ci
npx --no-install playwright install --with-deps chromium
npm run build
npm run test:accessibility
```

Use Node **24.21.0**, the same version as frontend CI. Runs use one worker, no
retries, bounded 768 MB Node heaps, one frontend process and one browser at a
time. Each owned process/context is closed by fixture teardown. Reports and
generated browser profiles are outside production sources; profiles are removed
after context closure. Set `LOGIN_A11Y_OUTPUT_DIR` to a disposable report path.
Local investigations may set `LOGIN_A11Y_RUNTIME_DIR` to an already compiled
frontend copy only after verifying its production source matches the candidate;
CI never sets this override and always builds its actual checkout.

All auth calls are intercepted before requests leave the browser. Fixtures use
`agent@example.invalid` and synthetic test passwords only. There is no auth/BFF
server, no real token or stored session, no production write and no committed
business demo data. Unexpected outgoing requests are aborted **and fail** the
test; no forwarding/`route.fetch()` is used. Frontend server BFF URLs are empty.
The existing proxy/cookie/auth/redirect implementation and OpenAPI contracts are
not modified; their Node/contract tests are complementary, not replaced.

`.github/workflows/accessibility.yml` runs actual browser tests in a separate
read-only CI job and preserves temporary evidence as a seven-day artifact. The
existing shared security/audit workflow is unchanged. A passing accessibility
job does not authorize merging a PR with any failing security requirement.

## Still outside this automated proof

- The transient final `Connexion réussie.` status immediately followed by
  `window.location.assign`: the initial browser run reproduced that holding the
  destination request does not produce a reliably scannable old document. Tests
  verify the real successful navigation, and scan the stable password-changed /
  reconnecting status before the final response; they **do not certify** an axe
  scan or screen-reader announcement of that final transient message. No
  artificial navigation delay or altered authentication flow is introduced.
- Human assessment of screen-reader announcements, logical focus recovery after
  asynchronous state replacement, visual clipping/overlap, reading order,
  usability and all axe `incomplete` cases. Positive boxes/reflow alone do not
  prove no overlap or exhaustive visual correctness.
- Browser/assistive-technology combinations other than this Chromium build;
  native high contrast, forced colors, text-only zoom and magnification above 200%.
- Actual authentication, tokens/cookies, BFF authorization/revocation and deployed
  acceptance. Intercepted test success is not a real sign-in.
- MAIR-316's transverse route/criterion classification and the seven other active
  frontends; no human/non-applicable criterion is silently classified here.
- Exact merged-main/local-current proof remains mandatory before #138 closes;
  publishing tests or a passing isolated run alone does not satisfy delivery.

The approach follows Playwright's
[full-page accessibility checks](https://playwright.dev/docs/accessibility-testing)
and [isolated response mocking](https://playwright.dev/docs/mock). Automated
findings are only one part of the required accessibility assessment.
