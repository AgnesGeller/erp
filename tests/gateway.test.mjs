import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../supabase/functions/erp-gateway/handler.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {createGateway}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const origin='https://agnesgeller.github.io';
const tokens={access_token:'test-user-jwt',refresh_token:'test-refresh-value',expires_in:3600};
const session=[{organization_id:'test-org',organization_name:'Helyi teszt',person_id:'test-person',is_office:true}];
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
const request=(body,token,originValue=origin)=>new Request('https://example.invalid/erp-gateway',{method:'POST',headers:{Origin:originValue,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
function setup(handler) {
 const calls=[];const gateway=createGateway({url:'https://example.invalid',anonKey:'server-only-test-key',fetchImpl:async(url,options)=>{calls.push({url,options});return handler(String(url),options);}});
 return {gateway,calls};
}
test('Login returns tokens only after a real ERP membership check',async()=>{
 const h=setup(url=>url.includes('/token?')?json(tokens):url.includes('/rpc/erp_session')?json(session):assert.fail(url));
 const result=await h.gateway(request({action:'login',email:'office@example.invalid',password:'local-test-value'}));
 assert.equal(result.status,200);assert.equal((await result.json()).session[0].is_office,true);
 assert.equal(h.calls[1].options.headers.Authorization,'Bearer test-user-jwt');
 assert.equal(result.headers.get('Cache-Control'),'no-store');
});
test('Legacy Auth account without ERP membership gets no token',async()=>{
 const h=setup(url=>url.includes('/token?')?json(tokens):url.includes('/rpc/erp_session')?json({code:'42501'},403):url.includes('/logout?scope=local')?new Response(null,{status:204}):assert.fail(url));
 const response=await h.gateway(request({action:'login',email:'other@example.invalid',password:'local-test-value'}));
 assert.equal(response.status,403);const body=await response.json();assert.equal(body.access_token,undefined);
 assert.ok(h.calls.some(c=>c.url.endsWith('/logout?scope=local')));
 assert.ok(h.calls.every(c=>!c.url.includes('scope=global')));
});
test('Public config, wrong origin and unknown RPC cannot expose keys or legacy data',async()=>{
 const h=setup(()=>assert.fail('Upstream should not be called'));
 assert.equal((await h.gateway(request({action:'config'}))).status,401);
 assert.equal((await h.gateway(request({action:'rpc',name:'quote_clients_list',args:{}},'test-user-jwt'))).status,400);
 assert.equal((await h.gateway(request({action:'login',email:'x@y.invalid',password:'test'},undefined,'https://wrong.invalid'))).status,403);
 assert.equal(h.calls.length,0);
});
test('RPC requires validated user and forwards only the caller JWT',async()=>{
 const h=setup(url=>url.endsWith('/auth/v1/user')?json({id:'test-user'}):url.includes('/rpc/erp_list_people')?json([]):assert.fail(url));
 const response=await h.gateway(request({action:'rpc',name:'erp_list_people',args:{p_org:'test-org'}},'test-user-jwt'));
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{data:[]});
 assert.equal(h.calls.length,2);
 assert.ok(h.calls.every(c=>c.options.headers.Authorization==='Bearer test-user-jwt'));
 assert.ok(h.calls.every(c=>c.options.headers.apikey==='server-only-test-key'));
});
test('Invalid JWT cannot execute a database RPC',async()=>{
 const h=setup(url=>url.endsWith('/auth/v1/user')?json({},401):assert.fail(url));
 const response=await h.gateway(request({action:'rpc',name:'erp_list_people',args:{}},'expired-test-jwt'));
 assert.equal(response.status,401);assert.equal(h.calls.length,1);
});
test('Database denial and stale revision stay errors with no SQL detail disclosure',async()=>{
 const h=setup(url=>url.endsWith('/auth/v1/user')?json({id:'test-user'}):json({code:'40001',message:'private database details'},400));
 const response=await h.gateway(request({action:'rpc',name:'erp_revoke_assignment',args:{}},'test-user-jwt'));
 assert.equal(response.status,409);assert.doesNotMatch(await response.text(),/private database details/);
});
test('Logout targets only this session',async()=>{
 const h=setup(url=>{assert.ok(url.endsWith('/logout?scope=local'));return new Response(null,{status:204});});
 assert.equal((await h.gateway(request({action:'logout'},'test-user-jwt'))).status,200);
});
test('Rate limit, malformed input and network failure receive safe messages',async()=>{
 const h=setup(()=>json({error:'internal'},429));
 assert.equal((await h.gateway(request({action:'login',email:'x@y.invalid',password:'test'}))).status,429);
 assert.equal((await h.gateway(request({action:'login',email:[],password:'test'}))).status,400);
 const down=setup(()=>{throw Error('private network detail');});
 const response=await down.gateway(request({action:'login',email:'x@y.invalid',password:'test'}));
 assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/private network detail/);
});
