const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const root = join(__dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('third-party workflow actions use immutable commits', () => {
  const workflows = ['auto-approve.yml', 'contracts.yml'];
  const actions = workflows.flatMap((file) => [...read(`.github/workflows/${file}`)
    .matchAll(/uses:\s*([^\s@]+)@([^\s#]+)/g)]);
  assert.deepEqual(actions.map((match) => match[1]).sort(), [
    'actions/checkout',
    'actions/setup-node',
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
    ['ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY'],
    ['RELEASE_APP_ID', 'RELEASE_APP_ID'],
    ['RELEASE_APP_PK', 'RELEASE_APP_PK'],
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
  assert.match(job, /repository: mairie360\/CICD\s*\n          ref: e314bc0c41ed45157cdd928c25358fee82b0c4f6 # v5\.1\.0/);
  assert.match(job, /uses: \.\/cicd-repo\/actions\/security\/semgrep-pypi/);
  assert.match(job, /config: p\/typescript p\/react p\/owasp-top-ten p\/secrets p\/dockerfile p\/github-actions/);
  assert.match(job, /artifact_name: semgrep-required-check-sarif/);
  assert.match(job, /uses: \.\/cicd-repo\/actions\/security\/gitleaks-binary/);
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
  assert.match(read('.github/workflows/cicd.yml'), /node_version:\s*"24\.22\.1"/);
  assert.match(read('.github/workflows/contracts.yml'), /node-version:\s*'24\.22\.1'/);
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
  assert.equal(nodeVersion, '24.22.1');
  const bases = [...dockerfile.matchAll(/^FROM node:\$\{NODE_VERSION\}-bookworm-slim@sha256:([a-f0-9]{64}) AS ([\w-]+)$/gm)];
  assert.deepEqual(bases.map(([, digest, stage]) => [digest, stage]), [
    ['55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205', 'dependencies'],
    ['55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205', 'runtime-base'],
  ]);
  assert.match(dockerfile, /^FROM dependencies AS builder$/m);
  assert.match(dockerfile, /^FROM runtime-base AS runner$/m);
  assert.equal(read('.github/workflows/cicd.yml').match(/node_version:\s*"([^"]+)"/)?.[1], nodeVersion);
  assert.equal(read('.github/workflows/contracts.yml').match(/node-version:\s*'([^']+)'/)?.[1], nodeVersion);
});

test('Docker excludes local environments and CI artifacts but keeps tracked npm policy', () => {
  const ignored = read('.dockerignore').split(/\r?\n/).map(line => line.trim());
  for (const pattern of ['node_modules', '.next', '.git', '.env*', '.npmrc.*', 'cicd-repo', 'rgaa-report', '.rgaa-ai-cache', 'rgaa.yaml', 'accessibility_test.sh', 'init-accessibility.sql', 'coverage', 'test-results', 'playwright-report']) {
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

test('MAIR-316: the RGAA stack runs the image under test and the script builds it with a secret only', () => {
  const compose = read('docker-compose-accessibility.yml');
  const frontend = compose.split('  login-front:\n')[1]?.split('\n  a11y:')[0];
  assert.ok(frontend, 'docker-compose-accessibility.yml must keep the frontend service');
  // promote-prod.yml exports IMAGE_REF=<image>@<staging digest>: the stack never rebuilds it.
  assert.match(frontend, /image: \$\{IMAGE_REF:\?/);
  assert.doesNotMatch(frontend, /build:|args:|NODE_AUTH_TOKEN|\/run\/secrets/);
  const code = compose.split('\n').filter((line) => !line.trimStart().startsWith('#')).join('\n');
  assert.doesNotMatch(code, /NODE_AUTH_TOKEN|\bbuild-arg\b/);
  for (const file of ['docker-compose-security.yml', 'docker-compose-performance.yml']) {
    assert.doesNotMatch(read(file), /IMAGE_REF/, file);
  }
  const shell = read('accessibility_test.sh');
  assert.match(shell, /docker build -t login-front:local --secret id=node_auth_token,env=NODE_AUTH_TOKEN \./);
  assert.doesNotMatch(shell, /--build-arg|up -d --build/);
});

test('MAIR-316: accessibility_test.sh fetches the RGAA engine at a pinned commit SHA, not only a tag', () => {
  const shell = read('accessibility_test.sh');
  // `git clone --branch` refuses a SHA, and cicd.yml pins mairie360/CICD by SHA.
  assert.doesNotMatch(shell, /git clone[^\n]*--branch/);
  assert.match(shell, /git -C "\$CICD_DIR" fetch --quiet --depth 1 https:\/\/github\.com\/mairie360\/CICD "\$CICD_VERSION"/);
  assert.match(shell, /checkout --quiet FETCH_HEAD/);
});

test('MAIR-316: promote-prod passes the secrets of the RGAA AI pre-audit by name', () => {
  const workflow = read('.github/workflows/promote-prod.yml');
  assert.doesNotMatch(workflow, /secrets:\s*inherit/);
  assert.match(workflow, /^\s+stack: fronts\s*$/m);
  for (const name of ['ANTHROPIC_API_KEY', 'ANTHROPIC_WORKSPACE_ID']) {
    assert.match(workflow, new RegExp(`^ {6}${name}: \\$\\{\\{ secrets\\.${name} \\}\\}\\s*$`, 'm'), name);
  }
});

test('MAIR-316: the RGAA seed users have no plaintext password and the stack loads them after init-test.sql', () => {
  const seed = read('init-accessibility.sql');
  const users = seed.split(/INSERT INTO users[^;]*VALUES/)[1]?.split('ON CONFLICT')[0];
  assert.ok(users, 'init-accessibility.sql must insert its users');
  for (const row of users.match(/\([^()]*\)/g) ?? []) {
    const password = row.split(',')[4]?.trim();
    assert.ok(password === 'NULL' || /^'\$argon2id\$/.test(password), `password must be NULL or an argon2id hash: ${row}`);
  }
  const compose = read('docker-compose-accessibility.yml');
  assert.match(compose, /- \.\/init-accessibility\.sql:\/init-accessibility\.sql:ro/);
  for (const file of ['docker-compose-security.yml', 'docker-compose-performance.yml']) {
    assert.doesNotMatch(read(file), /init-accessibility\.sql/, file);
  }
});
test('MAIR-316: a local engine copy is fetched again when the cicd_version pin changes', () => {
  const { mkdtempSync, mkdirSync, writeFileSync, readFileSync: readAbs, existsSync, rmSync } = require('node:fs');
  const { execFileSync } = require('node:child_process');
  const { tmpdir } = require('node:os');
  const shell = read('accessibility_test.sh');
  const block = shell.slice(shell.indexOf('CICD_DIR="cicd-repo"'), shell.indexOf('A11Y_RUNNER_IMAGE="$(cat'));
  const run = (setup) => {
    const dir = mkdtempSync(join(tmpdir(), 'rgaa-ref-'));
    try {
      mkdirSync(join(dir, '.github/workflows'), { recursive: true });
      writeFileSync(join(dir, '.github/workflows/cicd.yml'), '      cicd_version: "new-sha" # v9.9.9\n');
      mkdirSync(join(dir, 'bin'));
      // Fake git: records the calls; `checkout` lays out the engine like a real fetch would.
      writeFileSync(join(dir, 'bin/git'), '#!/bin/sh\necho "$*" >> "$LOG"\ncase "$*" in *checkout*) mkdir -p cicd-repo/tests/a11y && touch cicd-repo/tests/a11y/run.sh;; esac\n', { mode: 0o755 });
      setup(dir);
      execFileSync('bash', ['-c', block], { cwd: dir, env: { ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}`, LOG: join(dir, 'git.log'), CICD_VERSION: '' } });
      const log = existsSync(join(dir, 'git.log')) ? readAbs(join(dir, 'git.log'), 'utf8') : '';
      const ref = existsSync(join(dir, 'cicd-repo/.rgaa-ref')) ? readAbs(join(dir, 'cicd-repo/.rgaa-ref'), 'utf8').trim() : null;
      return { log, ref };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
  const engine = (dir, ref) => {
    mkdirSync(join(dir, 'cicd-repo/tests/a11y'), { recursive: true });
    writeFileSync(join(dir, 'cicd-repo/tests/a11y/run.sh'), '');
    if (ref) writeFileSync(join(dir, 'cicd-repo/.rgaa-ref'), `${ref}\n`);
  };
  // No copy: fetched at the pin, which is recorded.
  assert.deepEqual(run(() => {}).ref, 'new-sha');
  // A copy fetched for an older pin: fetched again.
  const stale = run((dir) => engine(dir, 'old-sha'));
  assert.match(stale.log, /fetch --quiet --depth 1 https:\/\/github\.com\/mairie360\/CICD new-sha/);
  assert.equal(stale.ref, 'new-sha');
  // Same pin: reused. The CI's own checkout (no marker): reused.
  assert.equal(run((dir) => engine(dir, 'new-sha')).log, '');
  assert.equal(run((dir) => engine(dir, null)).log, '');
});

test('MAIR-316: the RGAA runner opens the front on a trustworthy origin, so sign-in sends Sec-Fetch-Site', () => {
  // src/lib/auth-request.ts refuses a sign-in without Sec-Fetch-Site: same-origin, which Chromium
  // only sends on a trustworthy origin: http://localhost through the front's network namespace.
  const compose = read('docker-compose-accessibility.yml');
  const runner = compose.split('\n  a11y:\n')[1];
  assert.match(runner, /network_mode: "service:login-front"/);
  assert.match(compose, /LOGIN_FRONT_URL: http:\/\/localhost:5000/);
  assert.match(read('rgaa.yaml'), /^target: http:\/\/localhost:5000$/m);
});
