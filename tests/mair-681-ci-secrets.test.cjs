const assert = require('node:assert/strict');
const { existsSync, readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

// The release secrets live in the Prod environment (main only) and reach the prod promotion
// alone; pull request runs only get the low-quota key of the AI reviews.
const root = join(__dirname, '..');
const dir = join(root, '.github/workflows');
const workflows = readdirSync(dir)
  .filter((file) => /\.ya?ml$/.test(file))
  .map((file) => ({ file, text: readFileSync(join(dir, file), 'utf8') }));
const RELEASE_ONLY = ['promote-prod.yml'];

test('MAIR-681: no workflow hands every secret to a reusable workflow', () => {
  for (const { file, text } of workflows) {
    assert.doesNotMatch(text, /secrets:\s*inherit/, file);
  }
});

test('MAIR-681: the release secrets only reach the prod promotion', () => {
  for (const { file, text } of workflows.filter(({ file }) => !RELEASE_ONLY.includes(file))) {
    assert.doesNotMatch(text, /^\s+(RELEASE_APP_ID|RELEASE_APP_PK|ANTHROPIC_API_KEY):/m, file);
  }
});

test('MAIR-681: the AI review of the pull requests gets its dedicated key', () => {
  const gdpr = workflows.find(({ file }) => file === 'gdpr-pr.yml');
  assert.ok(gdpr, 'gdpr-pr.yml calls the GDPR review');
  assert.match(gdpr.text, /^ {6}ANTHROPIC_REVIEW_API_KEY: \$\{\{ secrets\.ANTHROPIC_REVIEW_API_KEY \}\}$/m);
});

test('MAIR-681: the release journal is no longer committed', () => {
  assert.equal(existsSync(join(root, 'RELEASE_JOURNAL.md')), false);
});
