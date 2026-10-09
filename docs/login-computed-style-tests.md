# Login document style regressions

The presentation tests apply the actual application stylesheet to an isolated
JSDOM document and inspect its computed root font size and body font family.
They detect a changed 17px reference scale or body font without depending on
CSS whitespace, comments, declaration order or the spelling of an unused theme
token. Parsed stylesheet declarations and import paths retain the policy against
demo preference variables and imports. The document is closed after each test.
JSDOM uses its default resource policy: no external stylesheet is downloaded.
The declaration policy uses the existing PostCSS dependency resolved from Next's
package, including Tailwind theme blocks that JSDOM does not interpret.

This check covers CSS properties supported by JSDOM. It does not run the Tailwind
compiler, resolve every custom property, apply responsive media queries, measure
geometry or certify browser interactions. Native browser checks on the actual
main snapshot remain separate evidence, with their widths and dates recorded.
The existing sign-in, first-password, unavailable-configuration and logout tests
continue to execute the real page code. No production stylesheet, authentication
flow, dependency, API/BFF contract, workflow or RGAA configuration is changed.

Tracking: MAIR-437. The broader source-reading test audit remains open.
