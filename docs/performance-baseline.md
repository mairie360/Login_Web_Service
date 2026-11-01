# Performance baseline dependency provenance

The reviewed baseline source already contains dependency declarations whose original lock fails `npm ci`. The performance workflow keeps that exact application commit and its declarations. For the one base recorded in `scripts/performance-baseline-lock-repair.json`, it copies only the lock from the first reviewed lock-repair commit. That commit predates the candidate's local Zod backport and source-map tooling changes.

The guard requires the exact base and repair commits, a single repair parent equal to the base, a full diff containing only `package-lock.json`, identical reviewed `package.json` blobs, both lock hashes, and the repaired lock blob. It refuses a dirty baseline or any changed application file. Every other base keeps its own original lock. No new dependency resolution occurs in this step.

The resulting comparison uses unchanged baseline application source with a reconstructed, reviewed dependency graph. It does **not** measure the original incompatible lock graph. In Login and Projects, that reviewed lock repair also changes NanoID from 3.3.18 to 3.3.20; Calendars and Elearning have no production version change in that repair.

`performance/baseline/lock-provenance.json` records the source commit, repair commit, package manifest blob, original lock hash, effective lock hash, lock blob, and whether the overlay was applied. It is archived with the measurements. The baseline still runs ordinary `npm ci`, production compilation, measurement and the original blocking comparison. An install, build or threshold failure continues to fail the workflow.
