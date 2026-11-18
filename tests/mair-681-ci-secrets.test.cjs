const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

// The release secrets live in the Prod environment (main only) and reach the prod promotion
// alone; pull request runs only get the low-quota key of the AI reviews. The workflows are read
// job by job, so a quoted `inherit`, a key mapped from another secret or a release secret read by
// another job of the same file are caught too.
const root = join(__dirname, '..');
const dir = join(root, '.github/workflows');
const RELEASE_JOBS = ['promote-prod.yml:promote'];
const RELEASE = /secrets\.(RELEASE_APP_ID|RELEASE_APP_PK|ANTHROPIC_API_KEY)\b/g;
const REVIEW_CALLERS =
  /mairie360\/CICD\/\.github\/workflows\/(APIs_cicd|BFFs-cicd|front-libs-cicd|gdpr-pr-cicd|promote-prod)\.yml@/;

const stripComment = (line) => line.replace(/(^|\s)#.*$/, '').trimEnd();

function parseJobs(file, text) {
  const jobs = [];
  let inJobs = false;
  let inSecrets = false;
  let job = null;
  for (const raw of text.split('\n')) {
    const line = stripComment(raw);
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true;
      continue;
    }
    if (!inJobs || !line.trim()) continue;
    if (/^\S/.test(line)) {
      inJobs = false;
      job = null;
      continue;
    }
    const header = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (header) {
      job = { where: `${file}:${header[1]}`, uses: '', secrets: null, lines: [] };
      jobs.push(job);
      inSecrets = false;
      continue;
    }
    if (!job) continue;
    job.lines.push(line);
    const indent = line.length - line.trimStart().length;
    if (inSecrets && indent <= 4) inSecrets = false;
    if (inSecrets) {
      const entry = /^\s+([A-Za-z0-9_]+):\s*(.+)$/.exec(line);
      if (entry) job.secrets[entry[1]] = entry[2].trim();
      continue;
    }
    const uses = /^ {4}uses:\s*(\S+)/.exec(line);
    if (uses) job.uses = uses[1].replace(/^['"]|['"]$/g, '');
    const secrets = /^ {4}secrets:\s*(.*)$/.exec(line);
    if (secrets) {
      const value = secrets[1].trim().replace(/^['"]|['"]$/g, '');
      job.secrets = value || {};
      inSecrets = !value;
    }
  }
  return jobs;
}

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
const releaseReads = (text) => text.match(RELEASE)?.length ?? 0;

const readsOnly = (expression, key) =>
  (expression.match(/secrets\.[A-Za-z0-9_]+/g) ?? []).join(',') === `secrets.${key}`;

test('MAIR-681: no reusable workflow call inherits every secret', () => {
  const inheriting = jobs.filter((job) => typeof job.secrets === 'string');
  assert.deepEqual(inheriting.map((job) => `${job.where}: ${job.secrets}`), []);
});

test('MAIR-681: each secret handed to a reusable workflow is read from the secret of the same name', () => {
  const remapped = jobs.flatMap((job) =>
    Object.entries(mapping(job))
      .filter(([key, expression]) => !readsOnly(expression, key))
      .map(([key, expression]) => `${job.where}: ${key} reads ${expression}`),
  );
  assert.deepEqual(remapped, []);
});

test('MAIR-681: the release secrets are only read by the prod promotion job', () => {
  for (const workflow of workflows) {
    const inReleaseJobs = workflow.jobs
      .filter((job) => RELEASE_JOBS.includes(job.where))
      .reduce((count, job) => count + releaseReads(job.lines.join('\n')), 0);
    assert.equal(releaseReads(workflow.live), inReleaseJobs, workflow.file);
  }
});

test('MAIR-681: every AI review gets its dedicated key', () => {
  const missing = jobs.filter(
    (job) => REVIEW_CALLERS.test(job.uses) && !('ANTHROPIC_REVIEW_API_KEY' in mapping(job)),
  );
  assert.deepEqual(missing.map((job) => job.where), []);
  assert.ok(jobs.some((job) => job.uses.includes('gdpr-pr-cicd.yml@')), 'a job calls gdpr-pr-cicd.yml');
});

test('MAIR-681: the release journal is no longer tracked', () => {
  const tracked = execFileSync('git', ['ls-files', '--', 'RELEASE_JOURNAL.md'], { cwd: root, encoding: 'utf8' });
  assert.equal(tracked.trim(), '');
});
