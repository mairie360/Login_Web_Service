const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');
const { proxyBffRequest } = requireTs('src/lib/bff-proxy.ts');
const originalFetch = global.fetch;
const saved = Object.fromEntries(['BFF_USER_API_URL','LOGIN_FRONT_URL','TRUST_INGRESS_IP_HEADERS'].map(k=>[k,process.env[k]]));
afterEach(() => {
  global.fetch = originalFetch;
  for (const [key,value] of Object.entries(saved)) value === undefined ? delete process.env[key] : process.env[key] = value;
});
const call = (request, path) => {
  process.env.BFF_USER_API_URL = 'http://bff.example';
  return proxyBffRequest(request, { params: Promise.resolve({ path: path.split('/').filter(Boolean) }) });
};

test('proxy preserves query, data and status with the shared cookie authoritative', async () => {
  let called;
  global.fetch = async (url,init) => { called={url:String(url),init}; return Response.json({id:'42',value:null},{status:201}); };
  const response=await call(new NextRequest('http://localhost/health?q=a%26b',{headers:{cookie:'accessToken=test-session',Authorization:'Bearer stale-session'}}),'/health');
  assert.equal(response.status,201); assert.deepEqual(await response.json(),{id:'42',value:null});
  assert.equal(new URL(called.url).search,'?q=a%26b'); assert.equal(called.init.headers.get('Authorization'),'Bearer test-session');
  assert.equal(called.init.headers.get('cookie'),null); assert.equal(called.init.redirect,'manual');
});
test('a published write preserves body bytes and empty responses', async () => {
  const bytes=Uint8Array.from([0,255,128,13]); let init;
  global.fetch=async(_url,options)=>{init=options;return new Response(null,{status:204});};
  const response=await call(new NextRequest('http://localhost/bff/admin/users',{method:'POST',headers:{'Content-Type':'multipart/form-data; boundary=test',cookie:'accessToken=test-session'},body:bytes}),'/bff/admin/users');
  assert.equal(response.status,204);assert.equal(await response.text(),'');assert.deepEqual(new Uint8Array(init.body),bytes);
  assert.equal(init.headers.get('Authorization'),'Bearer test-session');assert.equal(init.headers.get('Content-Type'),'multipart/form-data; boundary=test');
});
test('forged IP headers stay stripped unless the ingress is explicitly trusted', async () => {
  delete process.env.TRUST_INGRESS_IP_HEADERS;let headers;
  global.fetch=async(_url,options)=>{headers=options.headers;return Response.json({ok:true});};
  const request=new NextRequest('http://localhost/health',{headers:{'X-Forwarded-For':'198.51.100.20','X-Real-IP':'198.51.100.20'}});
  await call(request,'/health');assert.equal(headers.get('x-forwarded-for'),null);assert.equal(headers.get('x-real-ip'),null);
  process.env.TRUST_INGRESS_IP_HEADERS='true';await call(request,'/health');
  assert.equal(headers.get('x-forwarded-for'),'198.51.100.20');assert.equal(headers.get('x-real-ip'),'198.51.100.20');
});
test('unknown paths and methods are rejected before network', async () => {
  global.fetch=async()=>{throw new Error('must not be called');};
  assert.equal((await call(new NextRequest('http://localhost/unknown'),'/unknown')).status,404);
  const wrong=await call(new NextRequest('http://localhost/health',{method:'DELETE'}),'/health');assert.equal(wrong.status,405);assert.match(wrong.headers.get('Allow'),/GET/);
});
test('ordinary BFF errors cannot overwrite the browser session cookies', async () => {
  global.fetch=async()=>Response.json({message:'Denied'},{status:403,headers:{'Set-Cookie':'accessToken=; Max-Age=0; Path=/; HttpOnly'}});
  const result=await call(new NextRequest('http://localhost/me'),'/me');
  assert.equal(result.status,403);assert.deepEqual(await result.json(),{message:'Denied'});assert.equal(result.headers.get('Set-Cookie'),null);
});
test('an unavailable BFF remains a controlled error', async () => {
  global.fetch=async()=>{throw new Error('connection refused');};
  const result=await call(new NextRequest('http://localhost/health'),'/health');assert.equal(result.status,502);assert.equal(result.headers.get('Cache-Control'),'no-store');
});

test('the legacy login alias uses the validated UI handler and never exposes the token pair', async () => {
  let sent;
  global.fetch=async(url,init)=>{sent={url:String(url),init};return Response.json({refresh_token:'fixture-refresh'},{headers:{Authorization:'Bearer fixture-access'}});};
  const request=new NextRequest('https://login.example.test/auth/login',{method:'POST',headers:{'Sec-Fetch-Site':'same-origin','Content-Type':'application/json','User-Agent':'Disposable alias test'},body:JSON.stringify({email:'agent@example.test',password:'fixture-password',device_info:'untrusted'})});
  const response=await call(request,'/auth/login');assert.equal(response.status,200);assert.deepEqual(await response.json(),{success:true});
  assert.equal(sent.url,'http://bff.example/auth/login');assert.deepEqual(JSON.parse(sent.init.body),{email:'agent@example.test',password:'fixture-password',device_info:'Disposable alias test'});
  assert.equal(response.cookies.get('accessToken').value,'fixture-access');assert.equal(response.cookies.get('refreshToken').path,'/api');
});
test('the password alias takes the one-time token from its cookie rather than a caller body', async () => {
  let sent;
  global.fetch=async(url,init)=>{sent={url:String(url),init};return new Response(null,{status:204});};
  const request=new NextRequest('https://login.example.test/auth/force_change_password',{method:'POST',headers:{'Sec-Fetch-Site':'same-origin','Content-Type':'application/json',Cookie:'passwordChangeToken=fixture-one-time'},body:JSON.stringify({newPassword:'fixture-new-password',token:'untrusted-body-token'})});
  const response=await call(request,'/auth/force_change_password');assert.equal(response.status,200);assert.deepEqual(await response.json(),{success:true});
  assert.equal(sent.url,'http://bff.example/auth/force_change_password');assert.deepEqual(JSON.parse(sent.init.body),{new_password:'fixture-new-password',token:'fixture-one-time'});
  assert.equal(response.cookies.get('passwordChangeToken').maxAge,0);
});
test('the password alias cannot replace a missing one-time cookie with a body token', async () => {
  global.fetch=async()=>{throw new Error('must not be called');};
  const response=await call(new NextRequest('https://login.example.test/auth/force_change_password',{method:'POST',headers:{'Sec-Fetch-Site':'same-origin','Content-Type':'application/json'},body:JSON.stringify({newPassword:'fixture-new-password',token:'untrusted-body-token'})}),'/auth/force_change_password');
  assert.equal(response.status,400);assert.equal((await response.json()).restartLogin,true);
});
