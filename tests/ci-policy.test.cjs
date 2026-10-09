const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const root = join(__dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('third-party workflow actions use immutable commits', () => {
  const workflows = ['auto-approve.yml', 'contracts.yml', 'nextjs.yml'];
  const actions = workflows.flatMap((file) => [...read(`.github/workflows/${file}`)
    .matchAll(/uses:\s*([^\s@]+)@([^\s#]+)/g)]);
  assert.deepEqual(actions.map((match) => match[1]).sort(), [
    'actions/checkout', 'actions/checkout', 'actions/checkout',
    'actions/setup-node', 'actions/setup-node', 'actions/setup-node',
    'hmarr/auto-approve-action',
  ]);
  for (const [, name, ref] of actions) {
    assert.match(ref, /^[a-f0-9]{40}$/, `${name} must use a full commit SHA`);
  }
});

test('the reusable frontend workflow receives only its declared named secrets', () => {
  const workflow = read('.github/workflows/cicd.yml');
  assert.doesNotMatch(workflow, /secrets:\s*inherit/);
  const mappings = [...workflow.matchAll(/^ {6}([A-Z0-9_]+):[ \t]*\$\{\{[ \t]*secrets\.([A-Z0-9_]+)[ \t]*\}\}[ \t]*$/gm)];
  assert.deepEqual(mappings.map(([, name, source]) => [name, source]), [
    ['CODECOV_TOKEN', 'CODECOV_TOKEN'],
    ['N8N_WEBHOOK_SECRET', 'N8N_WEBHOOK_SECRET'],
  ]);
  assert.doesNotMatch(workflow, /semgrep_fail_on_findings:\s*false|semgrep_config:|continue-on-error:/);
});

test('the legacy required security name runs real immutable blocking scanners', () => {
  const workflow = read('.github/workflows/cicd.yml');
  const job = workflow.split('  required_security_scan:\n')[1]?.split('\n  CICD:')[0];
  assert.ok(job, 'the legacy required check needs its own executable scan job');
  assert.match(job, /name: CICD \/ Code Security Audit \(Semgrep\)/);
  assert.match(job, /permissions:\s*\n      contents: read\s*\n    steps:/);
  assert.match(job, /timeout-minutes: 20/);
  assert.doesNotMatch(job, /continue-on-error:|\bif:|\bsecrets:|\btoken:|security-events:|packages:|id-token:|\brun:|\bexclude:|\bpaths:/);
  const actions = [...job.matchAll(/uses: ([^\s@]+)@([^\s#]+)/g)];
  assert.equal(actions.length, 2);
  for (const [, name, sha] of actions) {
    assert.equal(name, 'actions/checkout');
    assert.equal(sha, '3d3c42e5aac5ba805825da76410c181273ba90b1');
  }
  assert.match(job, /fetch-depth: 0/);
  assert.equal([...job.matchAll(/persist-credentials: false/g)].length, 2);
  assert.match(job, /repository: mairie360\/CICD\s*\n          ref: f5ea4257ac51aa2969f9ddb84730fbebce8f42a7/);
  assert.match(job, /uses: \.\/cicd-repo\/actions\/frontend-semgrep-pypi/);
  assert.match(job, /config: p\/typescript p\/react p\/owasp-top-ten p\/secrets p\/dockerfile p\/github-actions/);
  assert.match(job, /artifact_name: semgrep-required-check-sarif/);
  assert.match(job, /uses: \.\/cicd-repo\/actions\/frontend-gitleaks/);
  assert.equal([...job.matchAll(/fail_on_findings: "true"/g)].length, 2);
});

test('npm resolution keeps the seven-day window except for the internal UI package', () => {
  const config = read('.npmrc');
  assert.match(config, /^min-release-age\s*=\s*7\s*$/m);
  const exclusions = [...config.matchAll(/^\s*min-release-age-exclude(\[\])?\s*=\s*(.+?)\s*$/gm)];
  assert.deepEqual(exclusions.map(([, list, name]) => [list, name]), [
    ['[]', '@mairie360/lib-components'],
  ]);
  assert.doesNotMatch(config, /^\s*before\b/m);
  assert.match(config, /^@mairie360:registry=https:\/\/npm\.pkg\.github\.com\s*$/m);
});

test('CI uses Node 24 and the toolchain supports npm release-age policy', () => {
  assert.match(read('.github/workflows/cicd.yml'), /node_version:\s*"24\.21\.0"/);
  assert.match(read('.github/workflows/contracts.yml'), /node-version:\s*'24\.21\.0'/);
  assert.equal([...read('.github/workflows/nextjs.yml').matchAll(/node-version:\s*24\.21\.0\s*$/gm)].length, 2);
  const version = execFileSync('npm', ['--version'], { cwd: root, encoding: 'utf8' }).trim();
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  assert.ok(match, 'npm must report a stable version');
  assert.ok(Number(match[1]) > 11 || (Number(match[1]) === 11 && Number(match[2]) >= 10),
    'npm >=11.10 is required for min-release-age; use the documented Node 24 toolchain');
});

test('Docker dependency installation requires ephemeral secret and policy mounts', () => {
  const dockerfile = read('Dockerfile');
  assert.match(dockerfile, /^# syntax=docker\/dockerfile:1$/m);
  assert.doesNotMatch(dockerfile, /^(?:ARG|ENV)\s+NODE_AUTH_TOKEN\b/m);
  assert.doesNotMatch(dockerfile, /echo.*(?:_authToken|NODE_AUTH_TOKEN)|npm config set.*(?:token|auth)/i);
  assert.match(dockerfile, /RUN --mount=type=secret,id=node_auth_token,env=NODE_AUTH_TOKEN,required=true \\\n\s+--mount=type=bind,source=\.npmrc,target=\/app\/\.npmrc \\\n\s+npm ci\s*\n/);
  assert.equal([...dockerfile.matchAll(/\bnpm ci\b/g)].length, 1);
  assert.match(read('.npmrc'), /^\/\/npm\.pkg\.github\.com\/:_authToken=\$\{NODE_AUTH_TOKEN\}$/m);
  assert.doesNotMatch(read('.npmrc'), /_authToken=(?!\$\{NODE_AUTH_TOKEN\})\S+/);
  const runner = dockerfile.split('FROM runtime-base AS runner\n')[1];
  assert.ok(runner);
  assert.doesNotMatch(runner, /\.npmrc|NODE_AUTH_TOKEN|\/run\/secrets|COPY \. \./);
  assert.match(runner, /^USER nextjs$/m);
  assert.match(runner, /^CMD \["node", "server\.js"\]$/m);
});

test('Docker and all frontend workflows use the same exact pinned Node LTS release', () => {
  const dockerfile = read('Dockerfile');
  const nodeVersion = dockerfile.match(/^ARG NODE_VERSION=(\d+\.\d+\.\d+)$/m)?.[1];
  assert.equal(nodeVersion, '24.21.0');
  const bases = [...dockerfile.matchAll(/^FROM node:\$\{NODE_VERSION\}-bookworm-slim@sha256:([a-f0-9]{64}) AS ([\w-]+)$/gm)];
  assert.deepEqual(bases.map(([, digest, stage]) => [digest, stage]), [
    ['0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6', 'dependencies'],
    ['0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6', 'runtime-base'],
  ]);
  assert.match(dockerfile, /^FROM dependencies AS builder$/m);
  assert.match(dockerfile, /^FROM runtime-base AS runner$/m);
  assert.equal(read('.github/workflows/cicd.yml').match(/node_version:\s*"([^"]+)"/)?.[1], nodeVersion);
  assert.equal(read('.github/workflows/contracts.yml').match(/node-version:\s*'([^']+)'/)?.[1], nodeVersion);
  assert.deepEqual([...read('.github/workflows/nextjs.yml').matchAll(/node-version:\s*(\S+)/g)].map(([, version]) => version), [nodeVersion, nodeVersion]);
});

test('Docker excludes local environments and CI artifacts but keeps tracked npm policy', () => {
  const ignored = read('.dockerignore').split(/\r?\n/).map(line => line.trim());
  for (const pattern of ['node_modules', '.next', '.git', '.env*', '.npmrc.*', 'cicd-repo', 'coverage', 'test-results', 'playwright-report']) {
    assert.ok(ignored.includes(pattern), `${pattern} must be excluded from the build context`);
  }
  assert.ok(!ignored.includes('.npmrc') && !ignored.includes('.npmrc*'));
});

test('isolated stacks pass only a build secret to the frontend', () => {
  for (const file of ['docker-compose-security.yml', 'docker-compose-performance.yml']) {
    const compose = read(file);
    assert.match(compose, /^secrets:\n  node_auth_token:\n    environment: NODE_AUTH_TOKEN\n/m);
    const frontend = compose.split('  login-front:\n')[1]?.split('\n  security-scan:')[0]?.split('\n  k6-perf-test:')[0];
    assert.ok(frontend);
    assert.match(frontend, /build:\n      context: \.\n      dockerfile: Dockerfile\n      secrets:\n        - node_auth_token\n/);
    assert.doesNotMatch(compose, /NODE_AUTH_TOKEN:\s*\$\{|\bbuild-arg\b/);
    assert.doesNotMatch(frontend, /args:|environment:[\s\S]*NODE_AUTH_TOKEN|\/run\/secrets/);
  }
});

test('the runtime removes only unused global package managers without weakening scans', () => {
  const dockerfile = read('Dockerfile');
  const runtime = dockerfile.split(' AS runtime-base\n')[1]?.split('\nFROM runtime-base AS runner')[0];
  assert.ok(runtime);
  assert.match(runtime, /rm -rf \/usr\/local\/lib\/node_modules\/npm \/usr\/local\/lib\/node_modules\/corepack \/opt\/yarn-v1\.22\.22/);
  assert.match(runtime, /rm -f \/usr\/local\/bin\/npm \/usr\/local\/bin\/npx \/usr\/local\/bin\/corepack \/usr\/local\/bin\/yarn \/usr\/local\/bin\/yarnpkg/);
  assert.doesNotMatch(runtime, /rm[^\n]*\/app|rm[^\n]*\/usr\/local\/bin\/node\b/);
  assert.doesNotMatch(dockerfile.split('FROM runtime-base AS runner\n')[1], /npm|npx|yarn|corepack/);
  assert.doesNotMatch(read('.github/workflows/cicd.yml'), /image_scan_fail_on_findings:|scan_fail_on_findings:|continue-on-error:/);
});
