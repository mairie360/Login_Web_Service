import http from 'k6/http';
import { check, sleep, group } from 'k6';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';

// ---------------------------------------------------------------------------
// k6 load test of the Login front (Login_Web_Service).
// Two scenarios run side by side against the routes the Next.js server really serves:
//   * `reads`: the sign-in page, /health, then the session reads /me and /session/me relayed by
//     the same-origin proxy to BFF User, with the accessToken cookie a browser would hold;
//   * `writes` (MAIR-516): the browser sign-in flow, POST /api/auth/login (BFF User -> Core API,
//     argon2id verification, session creation) followed by POST /api/auth/logout, with the cookies
//     the front issued, so the write path is measured and a 401/412/redirect fails the run.
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
// Must match the JWT_SECRET of the core-api / bff-user services of the test stack.
const JWT_SECRET = __ENV.JWT_SECRET || 'b"secret"';
// User inserted by init-test.sql (token `sub`, sign-in credentials).
const USER_ID = __ENV.PERF_USER_ID || '2';
const USER_EMAIL = __ENV.PERF_USER_EMAIL || 'perf-tester@mairie360.fr';
// Clear text of the argon2id template hash seeded by init-test.sql (Database repository).
const USER_PASSWORD = __ENV.PERF_USER_PASSWORD || 'password_template';

const STAGES = [
  { duration: '30s', target: 20 }, // ramp up
  { duration: '1m', target: 20 }, // plateau
  { duration: '10s', target: 0 }, // ramp down
];

export const options = {
  scenarios: {
    reads: { executor: 'ramping-vus', startVUs: 0, stages: STAGES, exec: 'reads', gracefulRampDown: '5s' },
    // Few VUs on purpose: every iteration hashes a password on Core API and opens a session.
    writes: { executor: 'constant-vus', vus: 3, duration: '1m40s', exec: 'writes' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // < 1% of HTTP errors
    checks: ['rate>0.99'], // a redirect (307) is not an HTTP error: the checks catch it
    'http_req_duration{endpoint:page}': ['p(95)<800'], // Next.js page render
    'http_req_duration{endpoint:health}': ['p(95)<150'], // same-origin proxy -> BFF /health
    'http_req_duration{endpoint:user}': ['p(95)<500'], // proxy + BFF aggregation + upstream
    'http_req_duration{endpoint:login}': ['p(95)<1500'], // argon2id verification + session creation
    'http_req_duration{endpoint:logout}': ['p(95)<800'], // session revocation through BFF User
  },
};

function b64url(value) {
  return encoding.b64encode(value, 'rawurl');
}

// Minimal HS256 JWT accepted by Core API / BFF User (claims sub + role + exp).
function mintJwt() {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ sub: USER_ID, role: 'user', exp: now + 3600 }));
  const signingInput = `${header}.${payload}`;
  const signature = crypto.hmac('sha256', JWT_SECRET, signingInput, 'base64rawurl');
  return `${signingInput}.${signature}`;
}

// The authentication route handlers only accept same-origin browser requests (rejectUnsafeAuthRequest).
const BROWSER_HEADERS = {
  Accept: 'application/json',
  Origin: BASE_URL,
  'Sec-Fetch-Site': 'same-origin',
  'User-Agent': 'k6 load test',
};

export function setup() {
  return { token: mintJwt() };
}

export function reads(data) {
  const cookie = { Cookie: `accessToken=${data.token}` };
  // redirects: 0 : a redirect (e.g. to the Login page when the cookie is refused)
  // must fail the check instead of being followed outside the stack.
  const pageParams = { headers: cookie, redirects: 0, tags: { endpoint: 'page' } };
  const dataParams = { headers: { ...cookie, Accept: 'application/json' }, redirects: 0, tags: { endpoint: 'user' } };

  group('pages', () => {
    const home = http.get(`${BASE_URL}/`, pageParams);
    check(home, { 'page / 200': (r) => r.status === 200 });
    const forgot = http.get(`${BASE_URL}/forgot-password`, pageParams);
    check(forgot, { 'page /forgot-password 200': (r) => r.status === 200 && r.body.includes('Email professionnel') });
    // A disposable, invalid token exercises the landing/error state without sending email or changing passwords.
    const reset = http.get(`${BASE_URL}/reset-password?token=invalid-load-test-token`, pageParams);
    check(reset, { 'page /reset-password 200': (r) => r.status === 200 && r.body.includes('Demander un nouveau lien') });
  });

  group('health', () => {
    const res = http.get(`${BASE_URL}/health`, { headers: cookie, redirects: 0, tags: { endpoint: 'health' } });
    check(res, { 'health 200': (r) => r.status === 200 });
  });

  group('user reads', () => {
    const me = http.get(`${BASE_URL}/me`, dataParams);
    check(me, { '/me 200': (r) => r.status === 200 });

    const sessionMe = http.get(`${BASE_URL}/session/me`, dataParams);
    check(sessionMe, { '/session/me 200': (r) => r.status === 200 });
  });

  sleep(1);
}

// `accessToken=…; refreshToken=…` from the Set-Cookie headers of the sign-in reply, or '' when none.
function sessionCookies(response) {
  const names = ['accessToken', 'refreshToken'];
  const pairs = [];
  for (const name of names) {
    const cookie = response.cookies[name] && response.cookies[name][0];
    if (cookie && cookie.value) pairs.push(`${name}=${cookie.value}`);
  }
  return pairs.length && pairs[0].startsWith('accessToken=') ? pairs.join('; ') : '';
}

export function writes() {
  // Each iteration is a fresh browser: no cookie survives from the previous sign-in.
  http.cookieJar().clear(BASE_URL);

  group('sign-in', () => {
    const login = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD }),
      { headers: { ...BROWSER_HEADERS, 'Content-Type': 'application/json' }, redirects: 0, tags: { endpoint: 'login' } },
    );
    const session = sessionCookies(login);
    const signedIn = check(login, {
      'POST /api/auth/login 200': (r) => r.status === 200,
      'POST /api/auth/login opens a session': (r) => Boolean(session) && !r.json('requiresPasswordChange'),
    });
    if (!signedIn) return;

    // The front issues Secure cookies (production image), which the k6 jar drops over plain HTTP:
    // replay them explicitly, exactly as the browser would send them on HTTPS. The handler
    // only accepts a JSON body (415 otherwise), like the page's fetch.
    const logout = http.post(`${BASE_URL}/api/auth/logout`, '{}', {
      headers: { ...BROWSER_HEADERS, 'Content-Type': 'application/json', Cookie: session },
      redirects: 0,
      tags: { endpoint: 'logout' },
    });
    check(logout, { 'POST /api/auth/logout 200': (r) => r.status === 200 });
  });

  sleep(1);
}
