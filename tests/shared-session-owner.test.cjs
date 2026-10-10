const assert = require('node:assert/strict');
const { afterEach, beforeEach, test } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');
const { OpenApiContract } = require('./support/openapi-contract.cjs');
const { POST } = requireTs('src/app/api/auth/refresh/route.ts');
const contract = OpenApiContract.load(require('node:path').join(__dirname, 'fixtures/user-session-openapi.json'));
const fronts = { LOGIN_FRONT_URL:'login', DASHBOARD_FRONT_URL:'dashboard', PROJECT_FRONT_URL:'projects', CALENDAR_FRONT_URL:'calendar', MESSAGE_FRONT_URL:'messages', ELEARNING_FRONT_URL:'formation', SETTINGS_FRONT_URL:'settings', ADMINISTRATION_FRONT_URL:'administration' };
const saved = Object.fromEntries([...Object.keys(fronts),'COOKIE_DOMAIN','NODE_ENV','BFF_USER_API_URL'].map(k=>[k,process.env[k]]));
const realFetch=global.fetch;
let token=0;
beforeEach(()=>{ for(const [k,v] of Object.entries(fronts)) process.env[k]=`https://${v}.dev.mairie360-eip.fr/`;process.env.COOKIE_DOMAIN='.dev.mairie360-eip.fr';process.env.NODE_ENV='production';process.env.BFF_USER_API_URL='https://bff.example.test';token++; });
afterEach(()=>{ global.fetch=realFetch;for(const [k,v] of Object.entries(saved))v===undefined?delete process.env[k]:process.env[k]=v; });
const request = (origin='https://login.dev.mairie360-eip.fr',headers={})=>new NextRequest('https://login.dev.mairie360-eip.fr/api/auth/refresh',{method:'POST',headers:{Origin:origin,'Sec-Fetch-Site':'same-site','Content-Type':'application/json',Cookie:`refreshToken=disposable-old-${token}`,...headers},body:'{}'});
const renewed=()=>{ const body={message:'JWT refreshed successfully'};assert.deepEqual(contract.validate(contract.schema('RefreshResponse'),body),[]);const r=Response.json(body);r.headers.append('Set-Cookie',`accessToken=disposable-access-${token}; Path=/auth; Max-Age=300; HttpOnly`);r.headers.append('Set-Cookie',`refreshToken=disposable-new-${token}; Path=/auth; HttpOnly`);return r; };

test('all eight configured frontend origins share one concurrent User rotation and rewritten browser cookies',async()=>{
 let calls=0;global.fetch=async(url,init)=>{calls++;assert.equal(url,'https://bff.example.test/auth/refresh');assert.equal(init.headers.Authorization,undefined);assert.equal(init.headers.Cookie,undefined);assert.deepEqual(JSON.parse(init.body),{refresh_token:`disposable-old-${token}`});assert.deepEqual(contract.validate(contract.schema('RefreshView'),JSON.parse(init.body)),[]);return renewed();};
 const responses=await Promise.all(Object.values(fronts).map(front=>POST(request(`https://${front}.dev.mairie360-eip.fr`))));assert.equal(calls,1);
 for(const r of responses){assert.equal(r.status,200);assert.deepEqual(await r.json(),{message:'Session renouvelée.'});assert.equal(r.cookies.get('accessToken').path,'/');assert.equal(r.cookies.get('refreshToken').path,'/api');assert.equal(r.cookies.get('refreshToken').maxAge,undefined);assert.equal(r.cookies.get('refreshToken').secure,true);assert.equal(r.cookies.get('refreshToken').domain,'.dev.mairie360-eip.fr');}
});

test('foreign, absent and cross-site origins cannot invoke the shared owner',async()=>{
 let calls=0;global.fetch=async()=>{calls++;return renewed();};
 for(const [origin,headers] of [['https://foreign.example.test',{}],['',{}],['https://login.dev.mairie360-eip.fr',{'Sec-Fetch-Site':'cross-site'}]]){const r=await POST(request(origin,headers));assert.equal(r.status,403);assert.equal(r.headers.get('set-cookie'),null);}assert.equal(calls,0);
});

test('simple form media cannot invoke renewal even from a known origin',async()=>{
 let calls=0;global.fetch=async()=>{calls++;return renewed();};const r=await POST(request(undefined,{'Content-Type':'text/plain'}));assert.equal(r.status,415);assert.equal(calls,0);
});

for(const status of [401,429,503]) test(`User refresh${status} does not create a session`,async()=>{
 global.fetch=async()=>Response.json({message:'Disposable refusal'},{status});const r=await POST(request());assert.equal(r.status,status);assert.equal(r.headers.get('set-cookie'),null);
});

test('a malformed or nonrotating published response remains a502',async()=>{
 global.fetch=async()=>Response.json({message:'Unexpected response'});const r=await POST(request());assert.equal(r.status,502);assert.equal(r.headers.get('set-cookie'),null);
});
