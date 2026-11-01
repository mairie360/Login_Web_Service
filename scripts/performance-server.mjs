import { createServer, request as proxyRequest } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, openSync, closeSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const fixtureFile = fileURLToPath(new URL('../tests/fixtures/performance.json', import.meta.url));
export const fixture = JSON.parse(readFileSync(fixtureFile, 'utf8'));
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

/** Loopback-only laboratory fixture. Production frontend code is unchanged. */
export async function startPerformancePreview(source, { port = 0, log = 'performance-server.log' } = {}) {
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const nextPort = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  let child;
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/_next/') && !/\.[a-z0-9]+$/i.test(url.pathname)) console.log('LAB', req.method, url.pathname);
    if (url.pathname === '/qa/session') {
      const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
      const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: '1', exp: 4102444800 })}.laboratory`;
      res.writeHead(302, { 'Location': '/', 'Cache-Control': 'no-store', ...(fixture.module === 'Login' ? {} : { 'Set-Cookie': `mairie360_lab_session=${token}; Path=/; HttpOnly; SameSite=Lax` }) });
      res.end(); return;
    }
    if (fixture.routes[url.pathname]) {
      await delay(100);
      if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(fixture.routes[url.pathname])); return;
    }
    if (fixture.module === 'Messages' && url.pathname === '/stream') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Mairie360-Stream-Account': encodeURIComponent(String(fixture.routes['/messaging/bootstrap'].currentUser.id)) });
      res.write(': keep-alive\n\n');
      const timer = setInterval(() => res.write(': keep-alive\n\n'), 10000);
      req.once('close', () => clearInterval(timer)); return;
    }
    const labCookie = (req.headers.cookie ?? '').split(';').map(value => value.trim()).find(value => value.startsWith('mairie360_lab_session='));
    const proxyHeaders = { ...req.headers, cookie: labCookie ? `accessToken=${labCookie.slice('mairie360_lab_session='.length)}` : '' };
    if (url.pathname !== '/' && !url.pathname.startsWith('/_next/') && !/\.[a-z0-9]+$/i.test(url.pathname)) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: { message: 'No laboratory fixture for this route' } })); return; }
    const upstream = proxyRequest({ hostname: '127.0.0.1', port: nextPort, path: req.url, method: req.method, headers: proxyHeaders }, response => {
      res.writeHead(response.statusCode, response.headers); response.pipe(res);
    });
    upstream.once('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    req.pipe(upstream);
  });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  const origin = `http://${process.env.PERFORMANCE_BROWSER_HOST ?? 'localhost'}:${server.address().port}`;
  const environment = { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', COOKIE_DOMAIN: '' };
  delete environment.NODE_AUTH_TOKEN;
  for (const prefix of ['LOGIN', 'PROJECT', 'CALENDAR', 'MESSAGE', 'ELEARNING', 'ADMINISTRATION', 'DASHBOARD', 'SETTINGS']) environment[`${prefix}_FRONT_URL`] = origin;
  const fd = openSync(log, 'w');
  child = spawn(process.execPath, [path.join(source, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(nextPort)], { cwd: source, env: environment, stdio: ['ignore', fd, fd] });
  closeSync(fd);
  const close = async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (child.exitCode !== null) return;
    const exit = new Promise(resolve => child.once('exit', resolve));
    child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    await exit; clearTimeout(timer);
  };
  try {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (child.exitCode !== null) throw new Error('Production server stopped before readiness; inspect its log.');
      try { await fetch(`http://127.0.0.1:${nextPort}/favicon.ico`); ready = true; break; } catch { await delay(250); }
    }
    if (!ready) throw new Error('Production server did not become ready.');
    return { origin, close };
  } catch (error) { await close(); throw error; }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const preview = await startPerformancePreview(path.resolve(process.env.PERFORMANCE_SOURCE ?? '.'), { port: Number(process.env.PERFORMANCE_PORT ?? 0) });
  console.log(`${fixture.module}: ${preview.origin}/qa/session`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await preview.close(); process.exit(); });
}
