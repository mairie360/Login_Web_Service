const assert = require('node:assert/strict');
const path = require('node:path');
const { after, afterEach, before, beforeEach, test } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
const { OpenApiContract } = require('./support/openapi-contract.cjs');
const { ContractMockServer } = require('./support/contract-mock-server.cjs');

installReactRuntime();
const React = require('react');
const Logout = requireTs('src/components/Logout.tsx').default;
const owner = requireTs('src/app/api/auth/logout/route.ts');
const contract = OpenApiContract.load(path.join(__dirname, 'fixtures/user-session-openapi.json'));
const bff = new ContractMockServer('DISPOSABLE_LOGOUT_OWNER', contract);
const realFetch = global.fetch;
const origin = 'http://localhost:5000';
const saved = Object.fromEntries(['BFF_USER_API_URL','USER_BFF_URL','LOGIN_FRONT_URL','COOKIE_DOMAIN','NODE_ENV'].map(k=>[k,process.env[k]]));
const savedWindow = global.window;
let view, calls, navigations, cookies, gate, frontendReceiptFault;
const success = (revoked = true, extras = {}) => ({body:{message:'Disposable logout result',session_revoked:revoked,...extras}});
const fault = status => {
  const op = contract.match('POST','/auth/logout');
  const response = contract.responseSchema(op,status);
  return {status,body:contract.sample(response.schema ?? contract.schema('ErrorResponse')),outOfContract:!response.documented};
};
before(async()=>{await bff.start();});
after(async()=>{global.fetch=realFetch;for(const [k,v] of Object.entries(saved))v===undefined?delete process.env[k]:process.env[k]=v;await bff.stop();if(savedWindow===undefined)delete global.window;else global.window=savedWindow;});
afterEach(()=>assert.deepEqual(bff.violations,[]));
beforeEach(()=>{
  bff.reset();process.env.BFF_USER_API_URL=bff.url;delete process.env.USER_BFF_URL;process.env.LOGIN_FRONT_URL=origin;process.env.COOKIE_DOMAIN='localhost';process.env.NODE_ENV='production';
  calls=[];navigations=[];gate=undefined;frontendReceiptFault=undefined;cookies=new Map([['accessToken','disposable-session'],['refreshToken','disposable-refresh']]);
  global.window={location:{replace:href=>navigations.push(href)}};
  global.fetch=async(input,init={})=>{
    const url=new URL(String(input),origin);if(url.origin===bff.url)return realFetch(input,init);assert.equal(url.origin,origin,'No real identity service is reachable');assert.equal(url.pathname,'/api/auth/logout');
    calls.push({path:url.pathname,init});if(gate)await gate.promise;
    const headers=new Headers(init.headers);headers.set('origin',origin);headers.set('sec-fetch-site','same-origin');headers.set('cookie',[...cookies].map(([k,v])=>`${k}=${v}`).join('; '));
    const result=await owner.POST(new NextRequest(url,{...init,headers}));for(const header of result.headers.getSetCookie()){const [pair]=header.split(';');const [name,value]=pair.split('=');if(/;\s*Max-Age=0(?:;|$)/i.test(header))cookies.delete(name);else cookies.set(name,value);}
    // A disposable frontend transport fault, never a new User BFF response shape.
    return frontendReceiptFault === undefined ? result : Response.json(frontendReceiptFault);
  };
});
const render=()=>{view=mount(React.createElement(Logout,{navigate:href=>navigations.push(href)}));};
const command=label=>view.fire((_props,text,tag)=>tag==='button'&&text===label,'onClick');
const settled=()=>view.waitFor(html=>html.includes('role="alert"')||navigations.length>0);
const confirmed=()=>{
 assert.equal(calls.length,1);assert.equal(calls[0].init.method,'POST');assert.equal(calls[0].init.body,'{}');assert.equal(bff.requests.length,1);assert.equal(bff.requests[0].headers.authorization,'Bearer disposable-session');assert.equal(bff.requests[0].headers.cookie,undefined);assert.deepEqual(bff.requests[0].body,{refresh_token:'disposable-refresh'});assert.equal(cookies.size,0);assert.deepEqual(navigations,['/']);
};

test('opening the standalone logout page waits without mutation or navigation',async()=>{
 bff.on('POST','/auth/logout',success());render();await view.act(()=>undefined);assert.equal(calls.length,0);assert.equal(bff.requests.length,0);assert.equal(cookies.size,2);assert.deepEqual(navigations,[]);assert.doesNotMatch(view.html,/<header|<aside|<footer|Déconnexion en cours/);
});

test('one explicit command revokes through the real HTTP mock and then expires both cookies',async()=>{
 bff.on('POST','/auth/logout',success());render();await command('Se déconnecter');await settled();confirmed();
});

for(const status of [401,403,503])test(`logout${status} preserves both cookies and offers an explicit retry`,async()=>{
 bff.on('POST','/auth/logout',fault(status));render();await command('Se déconnecter');await settled();assert.match(view.html,/La déconnexion n’a pas abouti|Réessayer/);assert.equal(cookies.size,2);assert.deepEqual(navigations,[]);assert.equal(calls.length,1);
});

test('an explicit retry after an outage makes one new call and can close the session',async()=>{
 bff.on('POST','/auth/logout',fault(503));render();await command('Se déconnecter');await settled();bff.on('POST','/auth/logout',success());await command('Réessayer');await settled();assert.equal(calls.length,2);assert.equal(bff.requests.length,2);assert.equal(cookies.size,0);assert.deepEqual(navigations,['/']);
});

test('concurrent and cached commands cannot replay a pending or completed logout',async()=>{
 bff.on('POST','/auth/logout',success());let release;gate={promise:new Promise(resolve=>{release=resolve;})};render();const action=view.hostElements((_props,text,tag)=>tag==='button'&&text==='Se déconnecter')[0].props.onClick;
 try{await view.act(()=>{action();action();});await view.waitFor(()=>calls.length===1);assert.equal(cookies.size,2);assert.deepEqual(navigations,[]);assert.match(view.html,/Déconnexion en cours/);}finally{release();await settled();}confirmed();await view.act(()=>action());assert.equal(calls.length,1);
});

test('unconfirmed Core closure expires local cookies but displays the limit before explicit return',async()=>{
 bff.on('POST','/auth/logout',success(false));render();await command('Se déconnecter');await settled();assert.equal(cookies.size,0);assert.deepEqual(navigations,[]);assert.match(view.html,/session serveur n’a pas pu être confirmée/);await command('Retour à la connexion');assert.deepEqual(navigations,['/']);assert.equal(bff.requests.length,1);
});

test('the validated Keycloak end-session URL is visited after real owner confirmation',async()=>{
 const url='https://auth.localhost/realms/mairie360/protocol/openid-connect/logout?client_id=mairie360';bff.on('POST','/auth/logout',success(true,{logout_url:url}));render();await command('Se déconnecter');await settled();assert.equal(cookies.size,0);assert.deepEqual(navigations,[url]);assert.equal(bff.requests.length,1);
});

test('an untrusted IdP receipt preserves cookies and remains a visible failure',async()=>{
 bff.on('POST','/auth/logout',success(true,{logout_url:'https://foreign.example/realms/mairie360/protocol/openid-connect/logout?client_id=mairie360'}));render();await command('Se déconnecter');await settled();assert.equal(cookies.size,2);assert.deepEqual(navigations,[]);assert.match(view.html,/La déconnexion n’a pas abouti/);
});

test('an upstream network failure offers retry without false cookie expiry',async()=>{
 bff.on('POST','/auth/logout',{dropConnection:true});render();await command('Se déconnecter');await settled();assert.equal(cookies.size,2);assert.deepEqual(navigations,[]);assert.match(view.html,/Réessayer/);
});

for (const [name, receipt] of [
  ['null receipt', null],
  ['missing revocation result', { message: 'Invalid frontend receipt' }],
  ['nonboolean revocation result', { session_revoked: 'true' }],
  ['nonstring destination', { session_revoked: true, logout_url: 42 }],
  ['unsafe destination', { session_revoked: true, logout_url: 'javascript:alert(1)' }],
]) test(`a ${name} from frontend transport cannot trigger navigation or claim closure`, async () => {
  bff.on('POST', '/auth/logout', success());
  frontendReceiptFault = receipt;
  render();
  await command('Se déconnecter');
  await settled();
  assert.deepEqual(navigations, []);
  assert.match(view.html, /La déconnexion n’a pas abouti/);
  assert.equal(view.hostElements((_props, text, tag) => tag === 'button' && text === 'Réessayer').length, 1);
  assert.equal(bff.requests.length, 1);
});
