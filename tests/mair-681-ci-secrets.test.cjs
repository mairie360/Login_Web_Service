const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

// The release secrets live in the Prod environment (main only) and reach the prod promotion
// alone; pull request runs only get the low-quota key of the AI reviews. The workflows are read
// job by job (quoted keys included): every call of a mairie360/CICD workflow passes exactly the
// secrets that workflow reads, each as a direct `${{ secrets.<same name> }}`, and no other job
// reads a release secret, whatever the notation.
const root = join(__dirname, '..');
const dir = join(root, '.github/workflows');
const RELEASE_JOBS = ['promote-prod.yml:promote'];
const RELEASE_SECRETS = ['RELEASE_APP_ID', 'RELEASE_APP_PK', 'ANTHROPIC_API_KEY'];
const SECRET_READ = /secrets\s*(?:\.\s*([A-Za-z0-9_]+)|\[\s*['"]([A-Za-z0-9_]+)['"]\s*\])/gi;
const REVIEW = ['ANTHROPIC_REVIEW_API_KEY', 'ANTHROPIC_WORKSPACE_ID'];
const BUILD = ['CODECOV_TOKEN', 'N8N_WEBHOOK_SECRET'];
const RELEASE_APP = ['RELEASE_APP_ID', 'RELEASE_APP_PK'];
// Secrets each mairie360/CICD reusable workflow reads, by called workflow (`[dry-run]`: nightly gates).
const EXPECTED = {
  'APIs_cicd.yml': [...REVIEW, ...BUILD],
  'BFFs-cicd.yml': [...REVIEW, ...BUILD],
  'front-libs-cicd.yml': [...REVIEW, ...BUILD],
  'back-lib-cicd.yml': ['CARGO_REGISTRY_TOKEN', ...BUILD, ...RELEASE_APP],
  'bffs-lib-cicd.yml': BUILD,
  'database_cicd.yml': BUILD,
  'frontend-cicd.yml': BUILD,
  'auto-approve.yml': [],
  'frontend-dev-exception.yml': [],
  'gdpr-pr-cicd.yml': REVIEW,
  'promote-prod.yml': ['ANTHROPIC_API_KEY', 'N8N_WEBHOOK_SECRET', ...REVIEW, ...RELEASE_APP],
  'promote-prod.yml [dry-run]': ['N8N_WEBHOOK_SECRET', ...REVIEW],
  'promote-staging.yml': ['N8N_WEBHOOK_SECRET'],
  'promote-staging.yml [dry-run]': ['N8N_WEBHOOK_SECRET'],
  'terraform_cicd.yml': ['N8N_WEBHOOK_SECRET'],
};
// The nightly prod dry run only hands the review key over when it asks for the AI review.
const DRY_RUN_REVIEW = "${{ needs.check.outputs.ai == 'true' && secrets.ANTHROPIC_REVIEW_API_KEY || '' }}";
const CICD_WORKFLOW = /^mairie360\/CICD\/\.github\/workflows\/([^@]+)@/;

const stripComment = (line) => line.replace(/(^|\s)#.*$/, '').trimEnd();

const unquote = (text) => {
  const value = text.trim();
  const quoted = value.length >= 2 && value[0] === value[value.length - 1] && `'"`.includes(value[0]);
  return quoted ? value.slice(1, -1) : value;
};

// `key: value` of a block mapping line, the key unquoted; null for another line.
const keyValue = (line) => {
  const match = /^\s*("[^"]*"|'[^']*'|[^\s:'"][^:]*?)\s*:(?:\s+(.*))?$/.exec(line);
  return match ? [unquote(match[1]), (match[2] ?? '').trim()] : null;
};

function parseJobs(file, text) {
  const jobs = [];
  let inJobs = false;
  let inSecrets = false;
  let job = null;
  for (const raw of text.split('\n')) {
    const line = stripComment(raw);
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    const entry = keyValue(line);
    if (indent === 0) {
      inJobs = entry !== null && entry[0] === 'jobs' && !entry[1];
      job = null;
      continue;
    }
    if (!inJobs) continue;
    if (indent === 2 && entry && !entry[1]) {
      job = { where: `${file}:${entry[0]}`, file, uses: '', secrets: null, lines: [] };
      jobs.push(job);
      inSecrets = false;
      continue;
    }
    if (!job) continue;
    job.lines.push(line);
    if (inSecrets && indent <= 4) inSecrets = false;
    if (inSecrets) {
      if (entry && job.secrets) job.secrets[entry[0]] = unquote(entry[1]);
      continue;
    }
    if (indent === 4 && entry?.[0] === 'uses') job.uses = unquote(entry[1]);
    if (indent === 4 && entry?.[0] === 'secrets') {
      const value = unquote(entry[1]);
      job.secrets = value || {};
      inSecrets = !value;
    }
  }
  return jobs;
}

const releaseReads = (text) =>
  (text.match(SECRET_READ) ?? []).filter((read) => {
    const name = /([A-Za-z0-9_]+)['"]?\s*\]?$/.exec(read)?.[1] ?? '';
    return RELEASE_SECRETS.includes(name.toUpperCase());
  }).length;

const workflows = readdirSync(dir)
  .filter((file) => /\.ya?ml$/.test(file))
  .map((file) => {
    const text = readFileSync(join(dir, file), 'utf8');
    const live = text.split('\n').map(stripComment).join('\n');
    return { file, live, jobs: parseJobs(file, text) };
  });
const jobs = workflows.flatMap((workflow) => workflow.jobs);
const mapping = (job) =>
  typeof job.secrets === 'object' && job.secrets ? job.secrets : {};
const callee = (job) => {
  const called = CICD_WORKFLOW.exec(job.uses);
  if (!called) return null;
  return job.file === 'nightly-gates.yml' ? `${called[1]} [dry-run]` : called[1];
};
const expectedValue = (job, key) =>
  callee(job) === 'promote-prod.yml [dry-run]' && key === 'ANTHROPIC_REVIEW_API_KEY'
    ? DRY_RUN_REVIEW
    : `\${{ secrets.${key} }}`;
// `dry_run: true` (a YAML boolean) among the `with:` inputs of the call.
const passesDryRun = (job) => {
  let parent = '';
  return job.lines.some((line) => {
    const key = /^ {4}([A-Za-z0-9_-]+):/.exec(line);
    if (key) parent = key[1];
    return parent === 'with' && /^ {6}dry_run:\s*true$/.test(line);
  });
};
const cicdCalls = jobs.filter((job) => callee(job) !== null);
const sameKeys = (job) =>
  JSON.stringify(Object.keys(mapping(job)).sort()) ===
  JSON.stringify([...(EXPECTED[callee(job) ?? ''] ?? ['?'])].sort());

test('MAIR-681: every workflow with jobs is read', () => {
  const unread = workflows.filter(({ live, jobs: found }) => /^['"]?jobs['"]?\s*:/m.test(live) && !found.length);
  assert.deepEqual(unread.map(({ file }) => file), []);
});

test('MAIR-681: no job inherits every secret or lists them inline', () => {
  const scalars = jobs.filter((job) => typeof job.secrets === 'string');
  assert.deepEqual(scalars.map((job) => `${job.where}: ${job.secrets}`), []);
});

test('MAIR-681: each mairie360/CICD call passes exactly the secrets the workflow reads', () => {
  const wrong = cicdCalls
    .filter((job) => !sameKeys(job))
    .map((job) => `${job.where}: ${Object.keys(mapping(job)).join(',')}`);
  assert.deepEqual(wrong, []);
});

test('MAIR-681: each secret handed over is a direct read of the secret of the same name', () => {
  const wrong = cicdCalls.flatMap((job) =>
    Object.entries(mapping(job))
      .filter(([key, value]) => value !== expectedValue(job, key))
      .map(([key, value]) => `${job.where}: ${key}: ${value}`),
  );
  assert.deepEqual(wrong, []);
});

test('MAIR-681: the release secrets are only read by the prod promotion job', () => {
  for (const workflow of workflows) {
    const inReleaseJobs = workflow.jobs
      .filter((job) => RELEASE_JOBS.includes(job.where))
      .reduce((count, job) => count + releaseReads(job.lines.join('\n')), 0);
    assert.equal(releaseReads(workflow.live), inReleaseJobs, workflow.file);
  }
});

test('MAIR-681: the pull requests get their GDPR review', () => {
  assert.ok(cicdCalls.some((job) => callee(job) === 'gdpr-pr-cicd.yml'));
});

test('MAIR-681: the nightly promotions run as dry runs', () => {
  const live = cicdCalls.filter(
    (job) =>
      (callee(job) ?? '').endsWith('[dry-run]') &&
      !passesDryRun(job),
  );
  assert.deepEqual(live.map((job) => job.where), []);
});

test('MAIR-681: the release journal is no longer tracked', () => {
  const tracked = execFileSync('git', ['ls-files', '--', 'RELEASE_JOURNAL.md'], { cwd: root, encoding: 'utf8' });
  assert.equal(tracked.trim(), '');
});

