import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';
async function moduleFrom(path) {
 const source=await readFile(new URL(path,import.meta.url),'utf8');
 const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
 return import('data:text/javascript;base64,'+Buffer.from(output).toString('base64'));
}
const {ErpApi,ApiError}=await moduleFrom('../src/erp-api.ts');
const {projectPeriod}=await moduleFrom('../src/erp-dates.ts');
const session=[{organization_id:'test-org',organization_name:'Teszt',person_id:'test-person',is_office:true}];
const token=(expires=3600)=>({access_token:'test-user-token',refresh_token:'test-refresh-token',expires_in:expires,session});
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
test('API authenticates through the ERP gateway without shipping an API key',async()=>{
 const calls=[];const api=new ErpApi(async(url,options)=>{calls.push({url,options});return response(token());});
 assert.equal(api.signedIn,false);await api.login('agi','local-test-value');
 assert.equal(api.signedIn,true);assert.equal(api.organizations[0].is_office,true);
 assert.equal(calls[0].options.headers.apikey,undefined);assert.equal(calls[0].options.cache,'no-store');
});
test('Failed login does not leave a previous session active',async()=>{
 let fail=false;const api=new ErpApi(async()=>fail?response({error:'Sikertelen belépés.'},401):response(token()));
 await api.login('agi','test');fail=true;
 await assert.rejects(api.login('other@example.invalid','test'),e=>e instanceof ApiError&&e.status===401);assert.equal(api.signedIn,false);
});
test('A late login response cannot revive a cleared session',async()=>{
 let finish;const api=new ErpApi(()=>new Promise(resolve=>finish=resolve));
 const login=api.login('agi','test');api.clear();finish(response(token()));
 await assert.rejects(login,e=>e.status===401);assert.equal(api.signedIn,false);
});
test('A delayed data response cannot appear after logout',async()=>{
 let finish;let requested;const started=new Promise(resolve=>requested=resolve);
 const api=new ErpApi(async(url,options)=>{
  const body=JSON.parse(options.body);
  if(body.action==='login')return response(token());
  if(body.action==='logout')return response({success:true});
  requested();return new Promise(resolve=>finish=resolve);
 });
 await api.login('agi','test');
 const pending=api.rpc('erp_list_people',{p_org:'test-org'});await started;
 await api.logout();finish(response({data:['private-test-data']}));
 await assert.rejects(pending,e=>e.status===401);assert.equal(api.signedIn,false);
});
test('Concurrent requests share one refresh and use its new token',async()=>{
 let refreshes=0;let rpcs=0;
 const api=new ErpApi(async(url,options)=>{
  const body=JSON.parse(options.body);
  if(body.action==='login')return response(token(1));
  if(body.action==='refresh'){refreshes++;return response({...token(),access_token:'new-test-token'});}
  rpcs++;assert.equal(options.headers.Authorization,'Bearer new-test-token');return response({data:[]});
 });
 await api.login('agi','test');
 await Promise.all([api.rpc('erp_list_people',{}),api.rpc('erp_list_projects',{})]);
 assert.equal(refreshes,1);assert.equal(rpcs,2);
});
test('Revoked membership clears the session on the next membership check',async()=>{
 const api=new ErpApi(async(url,options)=>JSON.parse(options.body).action==='login'?response(token()):response({error:'Nincs hozzáférés.'},403));
 await api.login('agi','test');
 await assert.rejects(api.rpc('erp_session'),e=>e.status===403);assert.equal(api.signedIn,false);
});
test('Assignment dates use inclusive days and an explicit Budapest timezone',()=>{
 assert.deepEqual(projectPeriod('2026-03-29','2026-03-29'),{from:'2026-03-29 00:00:00 Europe/Budapest',until:'2026-03-30 00:00:00 Europe/Budapest'});
 assert.deepEqual(projectPeriod('2026-10-25','2026-10-25'),{from:'2026-10-25 00:00:00 Europe/Budapest',until:'2026-10-26 00:00:00 Europe/Budapest'});
 assert.equal(projectPeriod('2028-02-29','2028-02-29').until,'2028-03-01 00:00:00 Europe/Budapest');
 assert.equal(projectPeriod('2026-10-30','').until,null);
 assert.throws(()=>projectPeriod('2026-02-29',''));
 assert.throws(()=>projectPeriod('2026-10-30','2026-10-29'));
});


test('Email requests and password setting never create an office session in the browser',async()=>{
 const calls=[];const api=new ErpApi(async(url,options)=>{calls.push(options);return response({success:true,message:'Kérés fogadva.'});});
 await api.requestEmail('office@example.invalid','recover');await api.requestEmail('new@example.invalid','register');
 await api.setPassword('long-local-value','email-link-token');
 assert.deepEqual(calls.slice(0,2).map(c=>JSON.parse(c.body).action),['recover_email','register_email']);
 assert.equal(calls[2].headers.Authorization,'Bearer email-link-token');
 assert.equal(api.signedIn,false);assert.deepEqual(api.organizations,[]);
 assert.ok(calls.every(c=>c.cache==='no-store'));
});
const {readAuthLink}=await moduleFrom('../src/erp-auth-link.ts');
test('Email link token is extracted only in memory and URL cleanup strips every credential',()=>{
 const link=readAuthLink('https://example.invalid/erp/?app-version=0.1.5#access_token=local-token&refresh_token=local-refresh&type=recovery&provider_token=private');
 assert.equal(link.token,'local-token');assert.equal(link.cleanedUrl,'https://example.invalid/erp/?app-version=0.1.5');
 assert.equal(link.recognized,true);assert.equal(link.refresh_token,undefined);
});
test('Expired and malformed link errors never echo server descriptions or tokens',()=>{
 const expired=readAuthLink('https://example.invalid/erp/#error=access_denied&error_description=secret-marker');
 assert.ok(expired.error);assert.equal(expired.token,undefined);assert.doesNotMatch(expired.error,/secret-marker/);
 assert.ok(readAuthLink('https://example.invalid/erp/#access_token=local-token&type=unsupported').error);
 assert.ok(readAuthLink('https://example.invalid/erp/#access_token=bad%20token&type=recovery').error);
 const unrelated='https://example.invalid/erp/#section';assert.equal(readAuthLink(unrelated).cleanedUrl,unrelated);
});


function memoryStorage(seed={}) {const values=new Map(Object.entries(seed));return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
const storageKey='diszkertek-erp-office-session-v1';
test('Office login remembers only an ERP refresh token, never PIN or cached authority',async()=>{
 const storage=memoryStorage({'other-app-auth':'untouched'});const api=new ErpApi(async()=>response(token()),storage);
 await api.login('agi','112233');const saved=JSON.parse(storage.values.get(storageKey));
 assert.deepEqual(saved,{version:1,refresh_token:'test-refresh-token'});assert.equal(storage.values.get('other-app-auth'),'untouched');
 assert.equal(api.remembered,true);assert.doesNotMatch(storage.values.get(storageKey),/112233|is_office|access_token/);
});
test('A fresh page restores only after the server has revalidated its refresh token',async()=>{
 const storage=memoryStorage({[storageKey]:JSON.stringify({version:1,refresh_token:'saved-value'})});const calls=[];
 const api=new ErpApi(async(url,options)=>{calls.push(JSON.parse(options.body));return response(token());},storage);
 assert.equal(api.signedIn,false);assert.equal(await api.restore(),true);assert.equal(calls[0].action,'refresh');
 assert.equal(calls[0].refresh_token,'saved-value');assert.equal(api.signedIn,true);
});
test('Logout forgets only ERP; expired restore is cleared while an offline restore can retry',async()=>{
 const storage=memoryStorage({[storageKey]:JSON.stringify({version:1,refresh_token:'saved-value'}),'other-app-auth':'untouched'});
 let offline=true;const api=new ErpApi(async()=>{if(offline)throw Error('offline');return response({error:'Lejárt.'},401);},storage);
 await assert.rejects(api.restore());assert.equal(api.remembered,true);
 offline=false;await assert.rejects(api.restore());assert.equal(api.remembered,false);assert.equal(storage.values.get('other-app-auth'),'untouched');
});
test('A late restore cannot reopen a session after logout',async()=>{
 let resolve;const storage=memoryStorage({[storageKey]:JSON.stringify({version:1,refresh_token:'saved-value'})});
 const api=new ErpApi(()=>new Promise(r=>{resolve=r;}),storage);const restoring=api.restore();await api.logout();resolve(response(token()));
 assert.equal(await restoring,false);assert.equal(api.signedIn,false);assert.equal(api.remembered,false);
});
test('Unavailable storage does not prevent a valid first login',async()=>{
 const storage={getItem(){throw Error('denied');},setItem(){throw Error('denied');},removeItem(){throw Error('denied');}};
 const api=new ErpApi(async()=>response(token()),storage);await api.login('agi','112233');assert.equal(api.signedIn,true);assert.equal(api.remembered,false);
});


test('Office login works without AbortSignal.timeout browser support',async()=>{
 const original=Object.getOwnPropertyDescriptor(AbortSignal,'timeout');let calls=0;
 Object.defineProperty(AbortSignal,'timeout',{configurable:true,value:undefined});
 try{const api=new ErpApi(async()=>{calls++;return response(token());});await api.login('agi','local-test-value');assert.equal(calls,1);assert.equal(api.signedIn,true);}
 finally{Object.defineProperty(AbortSignal,'timeout',original);}
});


test('Browser fetch is invoked with its global receiver',async()=>{
 const api=new ErpApi(async function(){assert.equal(this,globalThis,'A böngésző fetch függvénye a Window környezetét igényli.');return response(token());});
 await api.login('agi','local-test-value');assert.equal(api.signedIn,true);
});
