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
 assert.equal(api.signedIn,false);await api.login('office@example.invalid','local-test-value');
 assert.equal(api.signedIn,true);assert.equal(api.organizations[0].is_office,true);
 assert.equal(calls[0].options.headers.apikey,undefined);assert.equal(calls[0].options.cache,'no-store');
});
test('Failed login does not leave a previous session active',async()=>{
 let fail=false;const api=new ErpApi(async()=>fail?response({error:'Sikertelen belépés.'},401):response(token()));
 await api.login('office@example.invalid','test');fail=true;
 await assert.rejects(api.login('other@example.invalid','test'),e=>e instanceof ApiError&&e.status===401);assert.equal(api.signedIn,false);
});
test('A late login response cannot revive a cleared session',async()=>{
 let finish;const api=new ErpApi(()=>new Promise(resolve=>finish=resolve));
 const login=api.login('office@example.invalid','test');api.clear();finish(response(token()));
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
 await api.login('office@example.invalid','test');
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
 await api.login('office@example.invalid','test');
 await Promise.all([api.rpc('erp_list_people',{}),api.rpc('erp_list_projects',{})]);
 assert.equal(refreshes,1);assert.equal(rpcs,2);
});
test('Revoked membership clears the session on the next membership check',async()=>{
 const api=new ErpApi(async(url,options)=>JSON.parse(options.body).action==='login'?response(token()):response({error:'Nincs hozzáférés.'},403));
 await api.login('office@example.invalid','test');
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
