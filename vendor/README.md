# Local braces development-tool security backport

`braces` is a root local development dependency and the `$braces` override makes
actual `micromatch` consumers resolve it. These bytes are the exact reviewed
library fork, based on upstream `braces@3.0.3`, with its original MIT notice and
authorship preserved. The scoped package metadata explicitly names a local fork;
this is not an official patched upstream release. See `braces-provenance.json`
for original source hashes, registry integrity and the exact canonical file hashes.

The correction bounds brace/parenthesis parser nesting and supplied AST container
depth at 128, detects child cycles iteratively and bounds repeated AST visits at
65,536. Terminal leaves at the boundary remain valid; shared acyclic nodes remain
supported. Expansion determines queue ownership from actual child traversal,
without following caller-supplied `parent` pointers or external queues. Invalid
structure raises `SyntaxError` with code `ERR_BRACES_COMPLEXITY`.

`tests/tooling-patches.test.cjs` is picked up by the existing Node test commands.
It verifies actual transitive source resolution plus ordinary matching and hostile
string/AST behavior in subprocesses with a three-second deadline, 128 MiB heap and
512 KiB stack. A renamed vulnerable source cannot pass those runtime checks.
The negative control was run before any source/override change in this frontend.

The local development dependency and `$` root override are both required for
portable npm lockfile links; a bare relative nested file override can resolve
against the parent package directory. Keep `vendor/` available before `npm ci`.
Existing Docker dependency stages already copy it. Root library overrides do not
propagate automatically into frontend projects, which is why this root owns its
copy. No audit threshold or security gate is changed.

This patch bounds structural recursion/traversal, not every Cartesian expansion,
generated regular expression, arbitrary AST getter/proxy or array-valued text.
Callers must handle invalid input as with existing length/range errors. Replace
this fork only with a verified official fix that passes the same tests. No sprintf
fork is included because this frontend's fresh audit only identifies braces.


## Compatible Zod 3 production security backport

The shared UI package requires the Zod `^3.23.0` peer API. The root local
`zod` dependency and `$zod` override select the reviewed
`3.25.76+mairie360.1` backport for production consumers as well as tests.
The build metadata identifies a private local revision, not an official release.
See `zod/SECURITY-PATCH.md`, its exact patch, upstream MIT license and
`security-patches.json` for source provenance and every retained file hash.

Native npm audit omits local file links. `verify-security-backports.mjs` therefore
verifies the complete Zod tree, lockfile links and actual installed peer/ordinary
consumers, then separately queries the official npm advisory service for the
original 3.25.76 version. Only the exact reviewed GHSA metadata is accepted;
new advisories, changed metadata and service errors fail the gate. `postinstall`
runs that complete gate, including in the existing Docker dependency stage.
`prebuild` and `pretest` recheck installed integrity. Existing native audit
thresholds and CI checks are retained.

Behavioral tests cover all retained public CJS/ESM entry points, constrained
collections, synchronous/asynchronous parsing, raw-input bound semantics and
the real React Hook Form resolver used by the shared UI peer. Unbounded
collections keep their upstream behavior and still need application size limits.
