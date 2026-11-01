# Shared UI release adoption

Consume the exact verified published 0.9.0 release of `@mairie360/lib-components`, aligned across the eight active frontends. Login retains its standalone layout; the seven authenticated modules retain their trusted role and external-dialog adapters. Public modular entry points and the published stylesheet supply the common theme, loading placeholders, labelled empty states and dismissible action feedback.

The shared skip link precedes repeated navigation and targets the sole real main region. External modal state uses explicit shell properties. Confirmed receipts reuse existing operation outcomes; read failures, uncertain writes and drafts retain contextual recovery.

The release fixture records registry publication, source commit, tarball integrity, all distributed file hashes and the exact modular export map. The installed-artifact verifier checks these values against the lock and actual package bytes. The source-tracked development-only braces backport retains its MIT notice, provenance and bounded subprocess regression tests; security and coverage gates remain enforced.

Validate with clean npm ci, npm test, TypeScript, lint, published contract checks, production builds and full/production audits. Browser acceptance covers responsive layout, light/dark colours, keyboard navigation and actual modal/receipt interactions.

Related work: MAIR-526, MAIR-515, MAIR-539, MAIR-540.
