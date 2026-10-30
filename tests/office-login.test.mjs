import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function admin(sql,args=[]) {await db.exec('reset role');return db.query(sql,args);}
async function role(name,sql,args=[]) {await db.exec('set role '+name);try{return await db.query(sql,args);}finally{await db.exec('reset role');}}
await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_app_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,public to anon,authenticated,service_role;
create table public.legacy_record(id integer primary key);alter table public.legacy_record enable row level security;
`);
for(const file of ['erp-foundation.sql','erp-identity.sql','erp-worker-request.sql'])await db.exec(await readFile(new URL('../database/proposals/'+file,import.meta.url),'utf8'));
await admin("insert into erp.organizations(id,name) values($1,'DÍSZKERTEK')",[uid(1)]);
await admin("insert into auth.users(id,email,email_confirmed_at) values($1,'info@diszkertek.hu',now()),($2,'worker@example.invalid',now())",[uid(10),uid(11)]);
await admin("insert into erp.persons(id,organization_id,display_name) values($1,$3,'Régi iroda'),($2,$3,'Másik személy')",[uid(20),uid(21),uid(1)]);
await admin('insert into erp.user_accounts(organization_id,auth_user_id,person_id) values($1,$2,$3),($1,$4,$5)',[uid(1),uid(10),uid(20),uid(11),uid(21)]);
await admin("insert into erp.person_roles(organization_id,person_id,role) values($1,$2,'office')",[uid(1),uid(20)]);
const before=(await admin("select relacl::text,relrowsecurity from pg_class where oid='public.legacy_record'::regclass")).rows;
await db.exec(await readFile(new URL('../database/proposals/erp-office-login.sql',import.meta.url),'utf8'));
await test('Saját irodai fiókok és egyszer használható beállítás',async t=>{
 await t.test('Csak a korábbi info ERP-tagság inaktív, az Auth és más tagság változatlan',async()=>{
  const rows=(await admin('select auth_user_id,active from erp.user_accounts order by auth_user_id')).rows;
  assert.equal(rows.find(r=>r.auth_user_id===uid(10)).active,false);assert.equal(rows.find(r=>r.auth_user_id===uid(11)).active,true);
  assert.equal((await admin('select count(*)::int as n from auth.users')).rows[0].n,2);
  assert.deepEqual((await admin("select relacl::text,relrowsecurity from pg_class where oid='public.legacy_record'::regclass")).rows,before);
 });
 await t.test('A privát táblához és admin RPC-hez nincs publikus hozzáférés',async()=>{
  for(const r of ['anon','authenticated'])await assert.rejects(role(r,"select public.erp_office_setup_claim('agi','x')"),e=>e.code==='42501');
  await assert.rejects(role('service_role','select * from erp_private.office_logins'),e=>e.code==='42501');
 });
 await t.test('Hibás vagy lejárt egyszeri hivatkozás nem használható',async()=>{
  const result=(await role('service_role',"select public.erp_office_setup_claim('agi','wrong') as r")).rows[0].r;assert.equal(result.allowed,false);
  await admin("update erp_private.office_logins set setup_hash=sha256(convert_to($1,'UTF8')),setup_expires=now()-interval '1 minute' where login_key='agi'",['a'.repeat(64)]);
  assert.equal((await role('service_role',"select public.erp_office_setup_claim('agi',$1) as r",['a'.repeat(64)])).rows[0].r.allowed,false);
 });
 let claim;
 await t.test('Egy egyszeri hivatkozást egyszerre csak egy kérés foglalhat',async()=>{
  await admin("update erp_private.office_logins set setup_expires=now()+interval '1 hour' where login_key='agi'");
  claim=(await role('service_role',"select public.erp_office_setup_claim('agi',$1) as r",['a'.repeat(64)])).rows[0].r;assert.equal(claim.allowed,true);
  assert.equal((await role('service_role',"select public.erp_office_setup_claim('agi',$1) as r",['a'.repeat(64)])).rows[0].r.busy,true);
 });
 await t.test('Régi vagy idegen Auth-fiók nem kapcsolható az új irodai fiókhoz',async()=>{
  await assert.rejects(role('service_role',"select public.erp_office_setup_finish('agi',$1,$2)",[claim.claim_id,uid(10)]),e=>e.code==='42501');
 });
 await t.test('Csak saját, új ERP-azonosítóval fejezhető be, ismételni nem lehet',async()=>{
  await admin("insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values($1,'agi@erp.diszkertek.hu',now(),$2)",[uid(12),JSON.stringify({erp_office_setup:claim.generation,erp_office_login:'agi'})]);
  await role('service_role',"select public.erp_office_setup_finish('agi',$1,$2)",[claim.claim_id,uid(12)]);
  await assert.rejects(role('service_role',"select public.erp_office_setup_finish('agi',$1,$2)",[claim.claim_id,uid(12)]),e=>e.code==='42501');
  assert.equal((await role('service_role',"select public.erp_office_setup_claim('agi',$1) as r",['a'.repeat(64)])).rows[0].r.allowed,false);
  await admin("select set_config('request.jwt.claim.sub',$1,false)",[uid(12)]);
  assert.equal((await role('authenticated','select public.erp_session() as r')).rows[0].r[0].is_office,true);
  await admin("select set_config('request.jwt.claim.sub',$1,false)",[uid(10)]);
  await assert.rejects(role('authenticated','select public.erp_session()'),e=>e.code==='42501');
 });
 await t.test('Öt próbálkozás után korlátoz, siker után vagy 15 perc múlva felold',async()=>{
  for(let i=0;i<5;i++)assert.equal((await role('service_role',"select public.erp_office_login_target('agi') as r")).rows[0].r.allowed,true);
  assert.equal((await role('service_role',"select public.erp_office_login_target('agi') as r")).rows[0].r.locked,true);
  await role('service_role',"select public.erp_office_login_success('agi')");
  assert.equal((await role('service_role',"select public.erp_office_login_target('agi') as r")).rows[0].r.allowed,true);
  await admin("update erp_private.office_logins set attempts=5,attempt_window=now()-interval '16 minutes' where login_key='agi'");
  assert.equal((await role('service_role',"select public.erp_office_login_target('agi') as r")).rows[0].r.allowed,true);
 });
});
await db.close();
