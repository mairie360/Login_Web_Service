# Executable branding checks

MAIR-437: the branding tests execute the existing root layout and its metadata exports. Equivalent source formatting stays valid, while an incorrect title or icon cannot pass by appearing in a comment. Binary icon/manifest guards remain unchanged. Calendars and Messages also render the real shell and installed shared UI to check the visible navigation logo.

The helper reuses the current TypeScript loader and real React/ReactDOM/provider implementations. Only Next build-time CSS and font transforms are stubbed; these tests do not certify font pixels, responsive geometry, authentication or persistence. Product sources, contracts, dependency pins, workflow and RGAA controls are unchanged. Browser evidence remains a separate, versioned check.
