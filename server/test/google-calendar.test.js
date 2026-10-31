// Purpose: verify read-only OAuth boundaries without any real accounts or network.
// Called by npm test; calls the Google module with fake fetch and Node HTTP.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const { createGoogleCalendar, encrypt, decrypt, wallTime, eventView, SCOPE } = require('../google-calendar');

const env = { GOOGLE_CLIENT_ID:'<GOOGLE_CLIENT_ID>', GOOGLE_CLIENT_SECRET:'<GOOGLE_CLIENT_SECRET>',
  GOOGLE_REDIRECT_URI:'http://localhost/google/callback', TOKEN_ENCRYPTION_KEY:crypto.randomBytes(32).toString('hex') };
const users = { studentA:{id:'studentA',timezone:'America/Los_Angeles'}, studentB:{id:'studentB',timezone:'Asia/Tokyo'} };
let clock = Date.now(), saved = 0, calls = [], failure = null, tokenGate = null;
const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, {'Content-Type':type});
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
};
async function fakeFetch(url, opts) {
  calls.push({ url:String(url), method:opts.method || 'GET', body:opts.body, headers:opts.headers });
  if (failure) return new Response(JSON.stringify({error:failure}), {status:failure === 'invalid_grant' ? 400 : 503});
  if (String(url).includes('/revoke')) return new Response('{}');
  if (String(url).endsWith('/token')) {
    if (tokenGate) { const gate = tokenGate; tokenGate = null; await gate; }
    return new Response(JSON.stringify({
      access_token:'<ACCESS_TOKEN>', refresh_token:'<REFRESH_TOKEN>', expires_in:3600, scope:SCOPE,
    }));
  }
  const parsed = new URL(url);
  if (parsed.pathname.endsWith('/calendarList')) return new Response(JSON.stringify({items:[
    {id:'study',summary:'Study'}, {id:'classes',summary:'Classes'}, {id:'personal',summary:'Personal'}, {id:'extra',summary:'Extra'},
  ]}));
  if (parsed.searchParams.has('pageToken')) return new Response(JSON.stringify({ items:[
    {id:'cancelled',status:'cancelled'}, {id:'second',summary:'Second',start:{dateTime:'2026-11-01T10:00:00Z'},end:{dateTime:'2026-11-01T11:00:00Z'}},
  ] }));
  return new Response(JSON.stringify({items:[
    {id:'lecture',summary:'Lecture',start:{dateTime:'2026-11-01T08:00:00Z'},end:{dateTime:'2026-11-01T09:00:00Z'}},
    {id:'break',summary:'All day',start:{date:'2026-11-01'},end:{date:'2026-11-03'}},
  ],nextPageToken:'page-two'}));
}
const google = createGoogleCalendar({env,users,save:()=>saved++,authenticate:req=>users[(req.headers.authorization || '').slice(7)],send,fetchImpl:fakeFetch,now:()=>clock});
const server = http.createServer((req,res)=>google.handle(req,res,new URL(req.url,'http://localhost')));
let base;
test.before(async()=>{await new Promise(resolve=>server.listen(0,resolve));base=`http://localhost:${server.address().port}`;});
test.after(()=>server.close());
const request = (path, {user='studentA',method='GET',body,cookie}={}) => fetch(base+path,{
  method,redirect:'manual',headers:{...(user?{Authorization:`Bearer ${user}`} : {}),...(cookie?{Cookie:cookie}:{}),
    ...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,
});
async function begin(user='studentA') {
  const login = await request('/google/login',{method:'POST',user});
  assert.equal(login.status,200);
  const {authorizationUrl} = await login.json();
  assert.ok(!authorizationUrl.includes(user));
  const launch = new URL(authorizationUrl);
  const redirect = await request(launch.pathname+launch.search,{user:null});
  assert.equal(redirect.status,302);
  const auth = new URL(redirect.headers.get('location'));
  return {auth,cookie:redirect.headers.get('set-cookie').split(';')[0],launch:launch.pathname+launch.search};
}
const finish = (flow, cookie=flow.cookie) => request('/google/callback?state='+encodeURIComponent(flow.auth.searchParams.get('state'))+'&code=demo-code',{user:null,cookie});

test('missing or invalid setup disables only Google and discloses no secrets', async()=>{
  for (const config of [{}, {...env,TOKEN_ENCRYPTION_KEY:'invalid'}, {...env,GOOGLE_REDIRECT_URI:'http://example.invalid/google/callback'}]) {
    const disabled = createGoogleCalendar({env:config,users,save:()=>{},authenticate:()=>null,send});
    const capture = () => ({headers:{},setHeader(k,v){this.headers[k]=v;},writeHead(status){this.status=status;},end(body){this.body=body;}});
    const status = capture();await disabled.handle({method:'GET'},status,new URL('https://example.invalid/google/status'));
    assert.deepEqual(JSON.parse(status.body),{configured:false});
    const list = capture();await disabled.handle({method:'GET'},list,new URL('https://example.invalid/google/calendars'));
    assert.equal(list.status,503);assert.equal(JSON.parse(list.body).error,'Not set up yet');
  }
});
test('Google routes require existing Bearer auth, not query keys',async()=>{
  assert.equal((await request('/google/login',{method:'POST',user:null})).status,401);
  assert.equal((await request('/google/calendars?key=studentA',{user:null})).status,401);
  assert.equal((await request('/google/calendars')).status,200);
});
test('encryption is authenticated, randomized and bound to the student',()=>{
  const key=Buffer.from(env.TOKEN_ENCRYPTION_KEY,'hex');
  const encrypted=encrypt('<REFRESH_TOKEN>','studentA',key);
  assert.ok(!encrypted.includes('<REFRESH_TOKEN>'));
  assert.notEqual(encrypted,encrypt('<REFRESH_TOKEN>','studentA',key));
  assert.equal(decrypt(encrypted,'studentA',key),'<REFRESH_TOKEN>');
  assert.throws(()=>decrypt(encrypted,'studentB',key));
  assert.throws(()=>decrypt(encrypted.slice(0,-2)+'AA','studentA',key));
});
test('OAuth has one-time state, browser binding, PKCE and only the read-only scope',async()=>{
  const flow=await begin();
  assert.equal(flow.auth.searchParams.get('scope'),SCOPE);
  assert.equal(flow.auth.searchParams.get('access_type'),'offline');
  assert.equal(flow.auth.searchParams.get('code_challenge_method'),'S256');
  assert.ok(!flow.auth.searchParams.has('include_granted_scopes'));
  assert.equal((await request(flow.launch,{user:null})).status,400);
  const ok=await finish(flow);assert.equal(ok.status,200);
  assert.ok(!(await ok.text()).includes('<REFRESH_TOKEN>'));
  const exchange=calls.find(call=>call.body?.get('grant_type')==='authorization_code');
  assert.equal(crypto.createHash('sha256').update(exchange.body.get('code_verifier')).digest('base64url'),flow.auth.searchParams.get('code_challenge'));
  assert.ok(users.studentA.googleCalendar.refreshToken);
  assert.ok(!users.studentA.googleCalendar.refreshToken.includes('<REFRESH_TOKEN>'));
  assert.equal((await finish(flow)).status,400);
  const wrong=await begin();assert.equal((await finish(wrong,'wrong=cookie')).status,400);
  const expired=await begin();clock+=300001;assert.equal((await finish(expired)).status,400);clock-=300001;
});
test('calendar selection is per-student and limited to three actual calendars',async()=>{
  assert.equal((await request('/google/calendars',{method:'POST',body:{calendarIds:['study','classes','personal','extra']}})).status,400);
  assert.equal((await request('/google/calendars',{method:'POST',body:{calendarIds:['not-yours']}})).status,400);
  assert.equal((await request('/google/calendars',{method:'POST',body:{calendarIds:['study','study']}})).status,400);
  assert.equal((await request('/google/calendars',{method:'POST',body:{calendarIds:['study']}})).status,200);
  const other=await (await request('/google/calendars',{user:'studentB'})).json();
  assert.equal(other.connected,false);assert.deepEqual(other.calendars,[]);
  assert.equal((await request('/google/events?from=2026-11-01T00:00:00Z&to=2026-11-03T00:00:00Z',{user:'studentB'})).status,409);
});
test('events expand recurring instances, follow pagination, preserve all-day and local timezone',async()=>{
  calls=[];
  const result=await request('/google/events?from=2026-11-01T00:00:00Z&to=2026-11-03T00:00:00Z&timezone=America%2FLos_Angeles');
  assert.equal(result.status,200);
  const body=await result.json();
  assert.equal(body.events.length,3);
  assert.equal(body.events.find(event=>event.title==='Lecture').start,'2026-11-01T01:00');
  const allDay=body.events.find(event=>event.title==='All day');
  assert.equal(allDay.start,'2026-11-01');assert.equal(allDay.end,'2026-11-03');assert.equal(allDay.allDay,true);
  assert.ok(body.events.every(event=>event.readOnly&&event.kind==='google'));
  assert.ok(!JSON.stringify(body).includes('<ACCESS_TOKEN>'));
  const eventCalls=calls.filter(call=>call.url.includes('/events?'));
  assert.equal(eventCalls.length,2);
  assert.equal(new URL(eventCalls[0].url).searchParams.get('singleEvents'),'true');
  assert.equal(new URL(eventCalls[0].url).searchParams.get('timeZone'),'America/Los_Angeles');
  assert.ok(calls.some(call=>call.body?.get('grant_type')==='refresh_token'));
});
test('invalid ranges/zones and provider errors fail explicitly without provider details',async()=>{
  for(const query of ['from=bad&to=bad','from=2026-01-01T00:00:00Z&to=2027-01-01T00:00:00Z','from=2026-01-01T00:00&to=2026-01-02T00:00','from=2026-01-01T00:00:00Z&to=2026-01-02T00:00:00Z&timezone=Not_A_Zone']){
    assert.equal((await request('/google/events?'+query)).status,400);
  }
  failure='provider-error-contains-no-real-data';
  const failed=await request('/google/calendars');
  assert.equal(failed.status,502);
  const body=await failed.json();
  assert.equal(body.connected,true);
  assert.ok(!JSON.stringify(body).includes(failure));
  failure=null;
});
test('timezone conversion covers DST and does not shift all-day dates',()=>{
  assert.equal(wallTime('2026-03-08T09:30:00Z','America/Los_Angeles'),'2026-03-08T01:30');
  assert.equal(wallTime('2026-03-08T10:30:00Z','America/Los_Angeles'),'2026-03-08T03:30');
  assert.equal(wallTime('2026-11-01T09:30:00Z','America/Los_Angeles'),'2026-11-01T01:30');
  assert.equal(wallTime('2026-01-01T23:00:00Z','Asia/Tokyo'),'2026-01-02T08:00');
  assert.equal(eventView({id:'all',start:{date:'2026-01-01'},end:{date:'2026-01-02'}},'study','Asia/Tokyo').start,'2026-01-01');
});
test('disconnect invalidates pending callbacks even during token exchange',async()=>{
  const flow=await begin('studentB');
  let release;tokenGate=new Promise(resolve=>release=resolve);
  const pending=finish(flow);
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal((await request('/google/disconnect',{method:'POST',user:'studentB'})).status,200);
  release();
  assert.equal((await pending).status,409);
  assert.equal(users.studentB.googleCalendar,undefined);
  assert.equal((await request('/google/disconnect',{method:'POST'})).status,200);
  assert.equal(users.studentA.googleCalendar,undefined);
  assert.ok(saved>0);
  assert.ok(calls.some(call=>call.url.endsWith('/revoke')));
});
