# Zod 3.25.76 local security backport

This private package retains Zod's v3 root API and all published v3/v4 entry
points. `3.25.76+mairie360.1` identifies a local revision with SemVer build metadata;
it is not an upstream security release. Build metadata also preserves the v3
peer range `^3.23.0` required by `@mairie360/lib-components@1.0.3`.

The source is the npm `zod@3.25.76` archive, verified against the lockfile's
SHA512 integrity. Upstream test and benchmark directories are omitted; runtime,
declarations, source entry points, metadata and the MIT license are retained.

GHSA-mrhx-c7xc-m3w5 is addressed for constrained collections:

- The v3 array maximum/exact length and set maximum checks return before walking
  elements. This follows the proposed v3 fix linked from upstream issue 6653:
  https://github.com/dokson/zod/commit/9f5b6c52 . That proposal is not merged and
  no new upstream v3 release is claimed.
- The embedded v4 array, set and map parsers reject an oversized collection at
  their leading upper bounds before walking elements. This adapts the approach
  published in Zod 4.6.6 to the older embedded v4 run/check architecture:
  https://github.com/colinhacks/zod/commit/a0ebf970f2d752e5f58527cd2942ff48be4f46bd .
  An earlier transform/refinement prevents the early size optimization.

As in upstream 4.6.6, these bounds apply to raw input, before element coercion or
Set deduplication. A leading size check's `when` predicate therefore sees raw
input; if it skips early rejection, normal post-parse validation can call it
again. This is an intentional change from the original embedded v4 behavior,
covered by regression tests. Applications using these conditional checks must account for that documented
raw-input behavior.

Unbounded collections retain their original behavior. Applications accepting
untrusted collections still need their own size constraints.

`security-backport.patch` records all six implementation/source changes against
the verified archive. `vendor/security-patches.json` records the original
integrity and hashes every retained file. The security gate checks those hashes,
all locked/installed Zod resolutions and current advisories for the original
version; any additional advisory or changed metadata for the reviewed advisory blocks
the gate. The gate also checks each installed dependency or peer consumer. Behavioral
tests cover v3, v4, Mini, CJS, ESM, synchronous/asynchronous parsing and the real
React Hook Form Zod resolver contract used by the shared UI dependency.
