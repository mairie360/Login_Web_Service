const test = require('node:test');
const assert = require('node:assert/strict');
const { createAuthSessionResponse } = require('./support/load-ts.cjs').requireTs('src/lib/auth-session.ts');
test('sign-in and reset sessions keep a persistent 30-day refresh cookie under /api',()=>{
  const token='e30.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+600})).toString('base64url')+'.signature';
  const response=createAuthSessionResponse(token,'disposable-refresh');
  const cookie=response.cookies.get('refreshToken');
  assert.equal(cookie.maxAge,2592000);assert.equal(cookie.path,'/api');assert.equal(cookie.httpOnly,true);assert.equal(cookie.sameSite,'strict');
  assert.equal(response.headers.get('cache-control'),'no-store');
});
