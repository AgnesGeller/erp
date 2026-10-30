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
function setup(handler,extra={emailFlowsEnabled:true}) {
 const calls=[];const gateway=createGateway({url:'https://example.invalid',anonKey:'server-only-test-key',serviceKey:'server-admin-test-key',...extra,fetchImpl:async(url,options)=>{calls.push({url,options});if(String(url).endsWith('/erp_office_login_target'))return json({allowed:true,email:'agi@erp.diszkertek.hu',user_id:'test-user'});if(String(url).endsWith('/erp_office_login_success'))return json(null);return handler(String(url),options);}});
 return {gateway,calls};
}
test('Login returns tokens only after a real ERP membership check',async()=>{
 const h=setup(url=>url.includes('/token?')?json(tokens):url.includes('/rpc/erp_session')?json(session):assert.fail(url));
 const result=await h.gateway(request({action:'login',login_name:'agi',password:'112233'}));
 assert.equal(result.status,200);assert.equal((await result.json()).session[0].is_office,true);
 assert.equal(h.calls.find(c=>c.url.endsWith('/erp_session')).options.headers.Authorization,'Bearer test-user-jwt');
 assert.equal(result.headers.get('Cache-Control'),'no-store');
});
test('Legacy Auth account without ERP membership gets no token',async()=>{
 const h=setup(url=>url.includes('/token?')?json(tokens):url.includes('/rpc/erp_session')?json({code:'42501'},403):url.includes('/logout?scope=local')?new Response(null,{status:204}):assert.fail(url));
 const response=await h.gateway(request({action:'login',login_name:'agi',password:'112233'}));
 assert.equal(response.status,403);const body=await response.json();assert.equal(body.access_token,undefined);
 assert.ok(h.calls.some(c=>c.url.endsWith('/logout?scope=local')));
 assert.ok(h.calls.every(c=>!c.url.includes('scope=global')));
});
test('Public config, wrong origin and unknown RPC cannot expose keys or legacy data',async()=>{
 const h=setup(()=>assert.fail('Upstream should not be called'));
 assert.equal((await h.gateway(request({action:'config'}))).status,401);
 assert.equal((await h.gateway(request({action:'rpc',name:'quote_clients_list',args:{}},'test-user-jwt'))).status,400);
 assert.equal((await h.gateway(request({action:'login',login_name:'agi',password:'112233'},undefined,'https://wrong.invalid'))).status,403);
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
 assert.equal((await h.gateway(request({action:'login',login_name:'agi',password:'112233'}))).status,429);
 assert.equal((await h.gateway(request({action:'login',email:[],password:'test'}))).status,400);
 const down=setup(()=>{throw Error('private network detail');});
 const response=await down.gateway(request({action:'login',login_name:'agi',password:'112233'}));
 assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/private network detail/);
});


test('Email flows remain closed until delivery and ERP redirect are checked',async()=>{
 const h=setup(()=>assert.fail('No upstream before readiness'),{emailFlowsEnabled:false});
 assert.deepEqual(await (await h.gateway(request({action:'auth_options'}))).json(),{email_enabled:false});
 assert.equal((await h.gateway(request({action:'recover_email',email:'office@example.invalid'}))).status,503);
 assert.equal((await h.gateway(request({action:'register_email',email:'new@example.invalid'}))).status,503);
 assert.equal(h.calls.length,0);
});
test('Registration email can create only Auth identity, never staff membership or caller redirect',async()=>{
 const h=setup(()=>json({}),{emailFlowsEnabled:true});
 const response=await h.gateway(request({action:'register_email',email:'new@example.invalid',redirect_to:'https://wrong.invalid',is_office:true}));
 assert.equal(response.status,200);assert.equal(h.calls.length,1);
 const url=new URL(h.calls[0].url);assert.equal(url.pathname,'/auth/v1/otp');
 assert.equal(url.searchParams.get('redirect_to'),'https://agnesgeller.github.io/erp/');
 assert.deepEqual(JSON.parse(h.calls[0].options.body),{email:'new@example.invalid',create_user:true});
 assert.equal((await response.json()).access_token,undefined);
});
test('Recovery uses standard endpoint and does not disclose whether an account exists',async()=>{
 const h=setup(()=>json({error_code:'user_not_found'},400),{emailFlowsEnabled:true});
 const response=await h.gateway(request({action:'recover_email',email:'missing@example.invalid'}));
 assert.equal(response.status,200);assert.ok(h.calls[0].url.includes('/auth/v1/recover?'));
 assert.deepEqual(JSON.parse(h.calls[0].options.body),{email:'missing@example.invalid'});
 assert.doesNotMatch(await response.text(),/user_not_found|missing@example/);
});
test('Rate limit and invalid email cannot yield false success',async()=>{
 const h=setup(()=>json({},429),{emailFlowsEnabled:true});
 assert.equal((await h.gateway(request({action:'register_email',email:'x@y.invalid'}))).status,429);
 assert.equal((await h.gateway(request({action:'recover_email',email:[]}))).status,400);
 assert.equal(h.calls.length,1);
});
test('Disabled SMTP or signup gets a real service error',async()=>{
 const h=setup(()=>json({error_code:'email_address_not_authorized'},403),{emailFlowsEnabled:true});
 assert.equal((await h.gateway(request({action:'register_email',email:'x@y.invalid'}))).status,503);
});
test('Password setting requires bearer token, long password and verified email',async()=>{
 const h=setup(()=>json({id:'user',email_confirmed_at:null}));
 assert.equal((await h.gateway(request({action:'set_password',password:'long-local-value'}))).status,401);
 assert.equal((await h.gateway(request({action:'set_password',password:'short'},'test-jwt'))).status,422);
 assert.equal((await h.gateway(request({action:'set_password',password:'long-local-value'},'test-jwt'))).status,403);
 assert.equal(h.calls.length,1);
});
test('Email-link password setting updates only the JWT owner then closes the local session',async()=>{
 const h=setup((url,options)=>{
  if(options.method==='GET')return json({id:'verified-user',email_confirmed_at:'2026-10-30T00:00:00Z'});
  if(options.method==='PUT')return json({id:'verified-user'});
  assert.ok(url.endsWith('/logout?scope=local'));return new Response(null,{status:204});
 });
 const response=await h.gateway(request({action:'set_password',password:'long-local-value',user_id:'another-user'},'test-jwt'));
 assert.equal(response.status,200);assert.equal(h.calls.length,3);
 assert.deepEqual(JSON.parse(h.calls[1].options.body),{password:'long-local-value'});
 assert.ok(h.calls.every(c=>c.options.headers.Authorization==='Bearer test-jwt'));
 assert.ok(h.calls.every(c=>!c.url.includes('/rpc/')&&!c.url.includes('/admin/')));
});
test('Failed password save neither logs out nor reports success',async()=>{
 const h=setup((url,options)=>options.method==='GET'?json({id:'u',email_confirmed_at:'ok'}):json({error_code:'weak_password',message:'private details'},422));
 const response=await h.gateway(request({action:'set_password',password:'long-local-value'},'test-jwt'));
 assert.equal(response.status,422);assert.equal(h.calls.length,2);assert.doesNotMatch(await response.text(),/private details/);
});
test('Successful password save remains successful if local logout transport fails',async()=>{
 const h=setup((url,options)=>{
  if(url.includes('/logout?'))throw Error('local outage');
  return json(options.method==='GET'?{id:'u',email_confirmed_at:'ok'}:{id:'u'});
 });
 assert.equal((await h.gateway(request({action:'set_password',password:'long-local-value'},'test-jwt'))).status,200);
});


test('Shared old email can never be used as an office login identifier',async()=>{
 const h=setup(()=>assert.fail('Old Auth must not be called'));
 assert.equal((await h.gateway(request({action:'login',email:'info@diszkertek.hu',password:'112233'}))).status,400);
 assert.equal(h.calls.length,0);
});
test('An invalid setup link never creates or changes an Auth user',async()=>{
 const h=setup(url=>{assert.ok(url.endsWith('/erp_office_setup_claim'));return json({allowed:false});});
 const response=await h.gateway(request({action:'office_setup',login_name:'agi',setup_token:'a'.repeat(64),password:'112233'}));
 assert.equal(response.status,403);assert.equal(h.calls.length,1);
});
test('Only a valid ERP setup claim may create a dedicated office identity',async()=>{
 const h=setup((url,options)=>{
  if(url.endsWith('/erp_office_setup_claim'))return json({allowed:true,email:'agi@erp.diszkertek.hu',generation:'local-generation',claim_id:'local-claim',account_id:null});
  if(url.endsWith('/auth/v1/admin/users')){const body=JSON.parse(options.body);assert.equal(body.email,'agi@erp.diszkertek.hu');assert.equal(body.email_confirm,true);assert.equal(body.app_metadata.erp_office_setup,'local-generation');return json({id:'new-erp-user'});}
  if(url.endsWith('/erp_office_setup_finish')){assert.equal(JSON.parse(options.body).p_user,'new-erp-user');return json(null);}
  assert.fail(url);
 });
 const response=await h.gateway(request({action:'office_setup',login_name:'agi',setup_token:'a'.repeat(64),password:'112233',email:'wrong@old.invalid'}));
 assert.equal(response.status,200);assert.equal(h.calls.length,3);
 assert.ok(h.calls.every(c=>c.options.headers.apikey==='server-admin-test-key'));
 assert.deepEqual(await response.json(),{success:true});
});
test('Setup failure releases its own claim without deleting any account',async()=>{
 const h=setup(url=>url.endsWith('/erp_office_setup_claim')?json({allowed:true,email:'agi@erp.diszkertek.hu',generation:'g',claim_id:'c'}):url.endsWith('/erp_office_setup_release')?json(null):json({},422));
 assert.equal((await h.gateway(request({action:'office_setup',login_name:'agi',setup_token:'a'.repeat(64),password:'112233'}))).status,422);
 assert.ok(h.calls.some(c=>c.url.endsWith('/erp_office_setup_release')));assert.ok(h.calls.every(c=>c.options.method!=='DELETE'));
});
