# Published UI artifact verification (MAIR-437)

The exact stable version is selected in package.json. A single installed-package check compares it with the root lock entry and installed package, then verifies the tarball URL, SHA-512 integrity, published source commit, package entry points and SHA-256 hashes of every recorded dist file. Existing AppShell/Footer rendering and contract/security tests remain separate.

The test fixture records metadata from the genuinely published GitHub Packages release and hashes from its downloaded artifact. For a reviewed upgrade, add the verified new registry record and artifact hashes to tests/fixtures/shared-ui-releases.json; do not invent a release or loosen the checks. Tests use no registry credential or network request. Product pins and npm age/security policy stay in their existing files.
