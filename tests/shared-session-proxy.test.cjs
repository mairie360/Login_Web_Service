const assert = require('node:assert/strict');
const path = require('node:path');
const { test, before, after, beforeEach, afterEach } = require('node:test');
const { NextRequest } = require('next/server');
const { forgetUserSession } = require('@mairie360/lib-components/next');
const { requireTs } = require('./support/load-ts.cjs');
const { OpenApiContract } = require('./support/openapi-contract.cjs');
const { ContractMockServer } = require('./support/contract-mock-server.cjs');
// The selected fixture contains the published Dev User session operations. The SDK stays at 0.5.0.
const contract = OpenApiContract.load(path.join(__dirname, 'fixtures/user-session-openapi.json'));
const bff = new ContractMockServer('PUBLISHED_USER_SESSION', contract);
const proxy = requireTs('src/app/api/bff/[...path]/route.ts');
const legacy = requireTs('src/app/[...path]/route.ts');
const refresh = requireTs('src/app/api/auth/refresh/route.ts');
const origin = 'https://login.mairie.test';
const saved = Object.fromEntries(['LOGIN_FRONT_URL','BFF_USER_API_URL','COOKIE_DOMAIN','NODE_ENV','TRUST_INGRESS_IP_HEADERS'].map(k=>[k,process.env[k]]));
const realFetch = global.fetch;
let ownerCalls, token, override;
before(()=>bff.start());
after(()=>bff.stop());
beforeEach(()=>{
 token='initial-refresh-'+Date.now()+'-'+Math.random();ownerCalls=[];override=undefined;bff.reset();
 process.env.LOGIN_FRONT_URL=origin;process.env.BFF_USER_API_URL=bff.url;process.env.COOKIE_DOMAIN='.mairie.test';process.env.NODE_ENV='production';delete process.env.TRUST_INGRESS_IP_HEADERS;
 global.fetch=async(input,init)=>{
  const url=new URL(String(input));
  if(url.origin===bff.url)return realFetch(input,init);
  assert.equal(url.origin,origin,'No real identity or unrelated service is reachable');
  assert.equal(url.pathname,'/api/auth/refresh');ownerCalls.push({url,init});
  return override ? override() : refresh.POST(new NextRequest(url,init));
 };
});
afterEach(()=>{
 forgetUserSession(bff.url,token);global.fetch=realFetch;
 for(const [key,value] of Object.entries(saved))value===undefined?delete process.env[key]:process.env[key]=value;
 assert.deepEqual(bff.violations,[]);
});
const read = (extra={}) => proxy.GET(new NextRequest(origin+'/api/bff/me?probe=1',{
 headers:{Origin:origin,'Sec-Fetch-Site':'same-origin',Cookie:`accessToken=expired-access; refreshToken=${token}`,Authorization:'Bearer stale-browser',...extra}
}),{params:Promise.resolve({path:['me']})});
const renewed = () => bff.on('POST','/auth/refresh',{body:{message:'JWT refreshed successfully'},headers:{'Set-Cookie':[
 `accessToken=renewed-access; Path=/; HttpOnly; Secure; SameSite=Strict`,
 `refreshToken=renewed-${token}; Path=/api; HttpOnly; Secure; SameSite=Strict`
]}});
const business = () => bff.on('GET','/me',req=>req.headers.authorization==='Bearer renewed-access'
 ? {body:contract.sample(contract.schema('SessionResponse'))}
 : {status:401,body:{message:'Access expired'},outOfContract:true});

test('API and legacy entries preserve the same published contract gate',async()=>{
 for(const method of ['GET','POST','PUT','PATCH','DELETE','HEAD'])assert.equal(proxy[method],legacy[method]);
 for(const name of ['openapi.json','swagger.json','auth/refresh']){
  const response=await proxy.GET(new NextRequest(origin+'/api/bff/'+name),{params:Promise.resolve({path:name.split('/')})});
  assert.equal(response.status,404);assert.equal(response.headers.get('set-cookie'),null);
 }
 assert.equal(bff.requests.length,0);assert.equal(ownerCalls.length,0);
});
test('expired access rotates at the Login owner once and retries the exact published read',async()=>{
 renewed();business();const response=await read();assert.equal(response.status,200);
 assert.deepEqual(bff.calls('/me').map(x=>x.headers.authorization),['Bearer expired-access','Bearer renewed-access']);
 assert.ok(bff.calls('/me').every(x=>x.url.search==='?probe=1'&&x.headers.cookie===undefined));
 assert.deepEqual(bff.calls('/auth/refresh')[0].body,{refresh_token:token});assert.equal(bff.calls('/auth/refresh')[0].headers.authorization,undefined);
 assert.equal(ownerCalls.length,1);assert.equal(ownerCalls[0].init.headers.Cookie,`refreshToken=${token}`);
 assert.equal(response.headers.getSetCookie().length,2);assert.match(response.headers.getSetCookie()[1],/Path=\/api/);
});
test('concurrent reads receive one shared rotation and the same cookie pair',async()=>{
 renewed();business();const responses=await Promise.all([read(),read(),read()]);
 assert.ok(responses.every(x=>x.status===200));assert.equal(bff.calls('/auth/refresh').length,1);assert.equal(bff.calls('/me').length,6);
 const pairs=response=>response.headers.getSetCookie().map(x=>x.split(';')[0]);
 for(const response of responses){assert.deepEqual(pairs(response),pairs(responses[0]));const cookies=response.headers.getSetCookie();assert.match(cookies[0],/Path=\/;/);assert.match(cookies[1],/Path=\/api;/);assert.ok(cookies.every(x=>x.includes('HttpOnly')&&x.includes('Secure')&&x.includes('Domain=.mairie.test')));}
});
test('missing access with refresh never forwards a stale browser bearer',async()=>{
 renewed();business();const response=await read({Cookie:`refreshToken=${token}`});assert.equal(response.status,200);
 assert.equal(bff.calls('/me')[0].headers.authorization,undefined);assert.equal(bff.calls('/me')[1].headers.authorization,'Bearer renewed-access');
});
for(const status of [401,503])test(`renewal ${status} preserves cookies and never invokes logout`,async()=>{
 business();override=()=>Response.json({message:'Disposable refusal'},{status});const response=await read();
 assert.equal(response.status,status);assert.equal(response.headers.get('set-cookie'),null);assert.equal(bff.calls('/me').length,1);
 assert.equal(response.headers.get('X-Mairie360-Login-Required'),status===401?'true':null);assert.equal(bff.calls('/auth/logout').length,0);
});
test('a second 401 stops after one replay',async()=>{
 renewed();bff.on('GET','/me',{status:401,body:{message:'Rejected'},outOfContract:true});const response=await read();
 assert.equal(response.status,401);assert.equal(response.headers.get('X-Mairie360-Login-Required'),'true');assert.equal(bff.calls('/me').length,2);assert.equal(bff.calls('/auth/refresh').length,1);
});
test('a published mutation retries with the exact original JSON body',async()=>{
 renewed();const body=contract.sample(contract.schema('AdminSessionRevokeBody'));
 bff.on('POST','/bff/admin/sessions/revoke',req=>req.headers.authorization==='Bearer renewed-access'?{body:contract.sample(contract.schema('CoreResponse'))}:{status:401,body:{message:'Expired'},outOfContract:true});
 const response=await proxy.POST(new NextRequest(origin+'/api/bff/bff/admin/sessions/revoke',{method:'POST',headers:{Origin:origin,'Sec-Fetch-Site':'same-origin','Content-Type':'application/json',Cookie:`accessToken=expired-access; refreshToken=${token}`},body:JSON.stringify(body)}),{params:Promise.resolve({path:['bff','admin','sessions','revoke']})});
 assert.equal(response.status,200);assert.deepEqual(bff.calls('/bff/admin/sessions/revoke').map(x=>x.body),[body,body]);assert.equal(bff.calls('/auth/refresh').length,1);
});
test('foreign origins cannot reach User or the owner',async()=>{
 const response=await read({Origin:'https://foreign.test'});assert.equal(response.status,403);assert.equal(response.headers.get('set-cookie'),null);assert.equal(bff.requests.length,0);assert.equal(ownerCalls.length,0);
});
test('the legacy logout alias revokes through the guarded owner and preserves failed cookies',async()=>{
 process.env.TRUST_INGRESS_IP_HEADERS='true';
 const logoutRequest=()=>new NextRequest(origin+'/auth/logout',{method:'POST',headers:{Origin:origin,'Sec-Fetch-Site':'same-origin','Content-Type':'application/json','X-Forwarded-For':'198.51.100.20',Cookie:`accessToken=valid-access; refreshToken=${token}`},body:'{}'});
 bff.on('POST','/auth/logout',{status:503,body:{message:'Unavailable'},outOfContract:true});
 const failed=await legacy.POST(logoutRequest(),{params:Promise.resolve({path:['auth','logout']})});assert.equal(failed.status,503);assert.equal(failed.headers.get('set-cookie'),null);
 bff.on('POST','/auth/logout',{body:{message:'Closed',session_revoked:true}});
 const response=await legacy.POST(logoutRequest(),{params:Promise.resolve({path:['auth','logout']})});assert.equal(response.status,200);assert.equal((await response.json()).session_revoked,true);
 assert.equal(response.headers.getSetCookie().length,2);assert.ok(response.headers.getSetCookie().every(x=>x.includes('Max-Age=0')));
 for(const request of bff.calls('/auth/logout')){assert.deepEqual(request.body,{refresh_token:token});assert.equal(request.headers.authorization,'Bearer valid-access');assert.equal(request.headers['x-forwarded-for'],'198.51.100.20');}
});
