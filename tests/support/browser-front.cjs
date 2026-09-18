const { NextRequest } = require('next/server');
const { requireTs } = require('./load-ts.cjs');

// Browser and Next.js server simulated around the real route handlers of src/app/api/auth/*, without a
// build or a DOM: a same-origin `fetch` issued by the page is dispatched to the matching handler with the
// cookies the browser holds (including the ones set by previous responses), a `fetch` issued by a handler
// may only reach the mocked BFF User, and any other network call is refused and recorded as a violation.

const ORIGIN = 'http://localhost:5000';
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0';
const ROUTES = {
  '/api/auth/login': 'src/app/api/auth/login/route.ts',
  '/api/auth/force-change-password': 'src/app/api/auth/force-change-password/route.ts',
  '/api/auth/force_change_password': 'src/app/api/auth/force_change_password/route.ts',
};

class BrowserFront {
  constructor(bff) {
    this.bff = bff;
    this.cookies = new Map();
    this.browserCalls = [];
    this.violations = [];
    this.handlers = {};
  }

  install() {
    this.realFetch = global.fetch;
    // Read by src/lib/bff-user.ts at request time, and by the login route at load time for COOKIE_DOMAIN.
    process.env.BFF_USER_API_URL = `${this.bff.url}/`;
    delete process.env.COOKIE_DOMAIN;
    for (const [route, file] of Object.entries(ROUTES)) this.handlers[route] = requireTs(file);
    global.fetch = (input, init) => this.fetch(input, init);
    return this;
  }

  uninstall() {
    global.fetch = this.realFetch;
  }

  reset() {
    this.cookies.clear();
    this.browserCalls.length = 0;
    this.violations.length = 0;
  }

  async fetch(input, init = {}) {
    const raw = input instanceof Request ? input.url : String(input);
    const url = new URL(raw, ORIGIN);
    const method = (init.method ?? 'GET').toUpperCase();
    if (url.origin !== ORIGIN) {
      if (url.origin === new URL(this.bff.url).origin) return this.realFetch(input, init);
      this.violations.push(`network call outside BFF User: ${method} ${url.href}`);
      throw new TypeError('fetch failed');
    }
    this.browserCalls.push({ method, path: url.pathname });
    const handlers = this.handlers[url.pathname];
    if (!handlers) return new Response(null, { status: 404 });
    const handler = handlers[method];
    if (typeof handler !== 'function') return new Response(null, { status: 405 });

    const headers = new Headers(init.headers);
    headers.set('user-agent', USER_AGENT);
    if (this.cookies.size) headers.set('cookie', [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; '));
    const response = await handler(new NextRequest(url, { method, headers, body: init.body }));
    for (const header of response.headers.getSetCookie()) {
      const [pair, ...attributes] = header.split(';');
      const [name, ...rest] = pair.split('=');
      const expired = attributes.some((attribute) => /^\s*max-age=0\s*$/i.test(attribute));
      if (expired || rest.join('=') === '') this.cookies.delete(name.trim());
      else this.cookies.set(name.trim(), rest.join('='));
    }
    return response;
  }
}

module.exports = { BrowserFront, ORIGIN, ROUTES, USER_AGENT };
