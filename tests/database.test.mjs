import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const id = n => '00000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function admin(sql,args=[]) { await db.exec('reset role'); return db.query(sql,args); }
async function asUser(user,sql,args=[],role='authenticated') {
 await db.exec('reset role');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);
 await db.exec('set role '+role);
 try { return await db.query(sql,args); } finally { await db.exec('reset role'); }
}
await db.exec(`
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,public to anon,authenticated,service_role;
create table public.legacy_records(id integer primary key,value text);
alter table public.legacy_records enable row level security;
create policy legacy_none on public.legacy_records for select to authenticated using(false);
grant select on public.legacy_records to authenticated;
insert into public.legacy_records values(1,'Elszigetelt tesztrekord');
create function public.legacy_function() returns integer language sql as $$ select 7 $$;
`);
const before=await db.query("select pg_get_functiondef('public.legacy_function()'::regprocedure) as definition, relacl::text from pg_class where oid='public.legacy_records'::regclass");
await db.exec(await readFile(new URL('../database/proposals/erp-foundation.sql',import.meta.url),'utf8'));
// A Supabase auth sémáján az új, saját szerepek nem kapnak USAGE jogot.
// A helyi tesztnek ezt a felhős körülményt is modelleznie kell.
await db.exec('revoke usage on schema auth from erp_api,erp_identity');
await db.exec(await readFile(new URL('../database/proposals/erp-identity.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../database/proposals/erp-worker-request.sql',import.meta.url),'utf8'));

await admin(`insert into auth.users(id) values($1),($2),($3),($4);`,[id(101),id(102),id(103),id(104)]);
await admin('insert into erp.organizations(id,name) values($1,$2),($3,$4)',[id(1),'Teszt A',id(2),'Teszt B']);
await admin('insert into erp.persons(id,organization_id,display_name) values($1,$2,$3),($4,$2,$5),($6,$7,$8)',[id(11),id(1),'Iroda teszt',id(12),'Dolgozó teszt',id(21),id(2),'Másik iroda']);
await admin('insert into erp.user_accounts(organization_id,auth_user_id,person_id) values($1,$2,$3),($1,$4,$5),($6,$7,$8)',[id(1),id(101),id(11),id(102),id(12),id(2),id(103),id(21)]);
await admin("insert into erp.person_roles(organization_id,person_id,role) values($1,$2,'office'),($1,$3,'worker'),($4,$5,'office')",[id(1),id(11),id(12),id(2),id(21)]);
let project,assignment;
await test('ERP jogosultságok és időszakos munkamegbízások',async t=>{
 await t.test('A saját ERP-azonosítás auth sémahozzáférés nélkül működik',async()=>{
  const rows=(await admin("select has_schema_privilege('erp_api','auth','usage') as api,has_schema_privilege('erp_identity','auth','usage') as identity")).rows;
  assert.equal(rows[0].api,false);assert.equal(rows[0].identity,false);
  const current=(await asUser(id(101),'select public.erp_session() as data')).rows[0].data;
  assert.equal(current[0].person_id,id(11));
 });
 await t.test('A JSON JWT sub mezője is támogatott, az önbevallott szerepkör figyelmen kívül marad',async()=>{
  await admin("select set_config('request.jwt.claim.sub','',false)");
  await admin("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id(102),user_metadata:{role:'office'}})]);
  await db.exec('set role authenticated');
  try {
   const result=await db.query('select public.erp_session() as data');
   assert.equal(result.rows[0].data[0].person_id,id(12));
   assert.equal(result.rows[0].data[0].is_office,false);
  } finally {await admin("select set_config('request.jwt.claims','{}',false)");}
 });
 await t.test('Meglévő séma és függvény változatlan',async()=>{
  const after=await admin("select pg_get_functiondef('public.legacy_function()'::regprocedure) as definition, relacl::text from pg_class where oid='public.legacy_records'::regclass");
  assert.deepEqual(after.rows,before.rows);
  assert.equal((await admin('select value from public.legacy_records')).rows[0].value,'Elszigetelt tesztrekord');
 });
 await t.test('Anonim és tagság nélküli fiók nem kap ERP-hozzáférést',async()=>{
  await assert.rejects(asUser(null,'select public.erp_session()',[],'anon'),e=>e.code==='42501');
  await assert.rejects(asUser(id(104),'select public.erp_session()'),e=>e.code==='42501');
  await assert.rejects(asUser(null,'select public.erp_session()'),e=>e.code==='42501');
 });
 await t.test('Közvetlen táblaelérés és belső segédfüggvény nem engedélyezett',async()=>{
  await assert.rejects(asUser(id(101),'select * from erp.persons'),e=>e.code==='42501');
  await assert.rejects(asUser(id(101),'select erp_private.is_office($1)',[id(1)]),e=>e.code==='42501');
 });
 await t.test('Azonosítás és szervezeti elkülönítés az adatbázisban történik',async()=>{
  const session=(await asUser(id(101),'select public.erp_session() as data')).rows[0].data;
  assert.equal(session.length,1);assert.equal(session[0].organization_id,id(1));assert.equal(session[0].is_office,true);
  await assert.rejects(asUser(id(101),'select public.erp_list_people($1)',[id(2)]),e=>e.code==='42501');
  await assert.rejects(asUser(id(102),'select public.erp_list_people($1)',[id(1)]),e=>e.code==='42501');
 });
 await t.test('Iroda létrehozhat dolgozót és munkát; dolgozó nem',async()=>{
  await assert.rejects(asUser(id(102),'select public.erp_create_project($1,$2)',[id(1),'Tiltott']),e=>e.code==='42501');
  const person=(await asUser(id(101),'select public.erp_create_worker($1,$2) as id',[id(1),'Új tesztdolgozó'])).rows[0].id;
  assert.ok(person);
  project=(await asUser(id(101),'select public.erp_create_project($1,$2) as id',[id(1),'Helyi tesztmunka'])).rows[0].id;
  assert.equal((await asUser(id(102),'select public.erp_list_projects($1) as data',[id(1)])).rows[0].data.length,0);
 });
 await t.test('Azonos kérés újraküldése nem hoz létre új munkatársat',async()=>{
  const args=[id(1),'Ismétlés teszt',id(900)];
  const first=(await asUser(id(101),'select public.erp_create_worker_request($1,$2,$3) as id',args)).rows[0].id;
  const second=(await asUser(id(101),'select public.erp_create_worker_request($1,$2,$3) as id',args)).rows[0].id;
  assert.equal(first,second);
  assert.equal((await admin('select count(*)::int as count from erp.audit_events where entity_id=$1',[first])).rows[0].count,1);
  await assert.rejects(asUser(id(101),'select public.erp_create_worker_request($1,$2,$3)',[id(1),'Másik adat',id(900)]),e=>e.code==='22023');
 });
 await t.test('Aktív munkamegbízás hozzáférést ad, több vezető és szerep lehetséges',async()=>{
  const args=[id(1),project,id(12),'crew_lead'];
  assignment=(await asUser(id(101),"select public.erp_assign_project_role($1,$2,$3,$4,now()-interval '1 hour',now()+interval '1 hour') as id",args)).rows[0].id;
  await asUser(id(101),"select public.erp_assign_project_role($1,$2,$3,$4,now()-interval '1 hour',null)",[id(1),project,id(11),'crew_lead']);
  await asUser(id(101),"select public.erp_assign_project_role($1,$2,$3,$4,now()-interval '1 hour',null)",[id(1),project,id(12),'construction_lead']);
  assert.equal((await asUser(id(102),'select public.erp_list_projects($1) as data',[id(1)])).rows[0].data.length,1);
  await assert.rejects(asUser(id(102),"select public.erp_assign_project_role($1,$2,$3,$4,now(),null)",args),e=>e.code==='42501');
  await assert.rejects(asUser(id(101),"select public.erp_assign_project_role($1,$2,$3,$4,now(),null)",args),e=>e.code==='23505');
 });
 await t.test('Másik szervezet személye nem rendelhető a munkához',async()=>{
  await assert.rejects(asUser(id(101),"select public.erp_assign_project_role($1,$2,$3,'worker',now(),null)",[id(1),project,id(21)]),e=>e.code==='22023');
  await assert.rejects(asUser(id(103),'select public.erp_list_assignments($1,$2)',[id(1),project]),e=>e.code==='42501');
 });
 await t.test('Jövőbeli és lejárt megbízás nem ad hozzáférést',async()=>{
  const p=(await asUser(id(101),'select public.erp_create_project($1,$2) as id',[id(1),'Időhatár teszt'])).rows[0].id;
  await asUser(id(101),"select public.erp_assign_project_role($1,$2,$3,'worker',now()+interval '1 day',null)",[id(1),p,id(12)]);
  assert.equal((await asUser(id(102),'select public.erp_list_projects($1) as data',[id(1)])).rows[0].data.length,1);
  await admin("update erp.project_assignments set valid_from=now()-interval '2 day',valid_until=now()-interval '1 day' where project_id=$1",[p]);
  assert.equal((await asUser(id(102),'select public.erp_list_projects($1) as data',[id(1)])).rows[0].data.length,1);
 });
 await t.test('Visszavonás azonnal hat, története és valódi végrehajtója megmarad',async()=>{
  await asUser(id(101),'select public.erp_revoke_assignment($1,$2,1)',[id(1),assignment]);
  await assert.rejects(asUser(id(101),'select public.erp_revoke_assignment($1,$2,1)',[id(1),assignment]),e=>e.code==='40001');
  const other=(await admin("select id from erp.project_assignments where project_id=$1 and person_id=$2 and role='construction_lead'",[project,id(12)])).rows[0].id;
  await asUser(id(101),'select public.erp_revoke_assignment($1,$2,1)',[id(1),other]);
  assert.equal((await asUser(id(102),'select public.erp_list_projects($1) as data',[id(1)])).rows[0].data.length,0);
  const audit=(await admin("select * from erp.audit_events where entity_id=$1 and operation='UPDATE'",[assignment])).rows[0];
  assert.equal(audit.actor_id,id(101));assert.equal(audit.before_data.revoked_at,null);assert.ok(audit.after_data.revoked_at);
  assert.equal((await admin('select revision from erp.project_assignments where id=$1',[assignment])).rows[0].revision,2);
 });
 await t.test('Letiltott személy és fiók azonnal elveszíti a hozzáférését',async()=>{
  await admin('update erp.user_accounts set active=false where auth_user_id=$1',[id(102)]);
  await assert.rejects(asUser(id(102),'select public.erp_session()'),e=>e.code==='42501');
  await admin('update erp.persons set active=false where id=$1',[id(21)]);
  await assert.rejects(asUser(id(103),'select public.erp_session()'),e=>e.code==='42501');
 });
 await t.test('Minden ERP-tábla FORCE RLS; az RPC-tulajdonosok nem kerülhetik meg',async()=>{
  const bad=(await admin("select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='erp' and c.relkind='r' and (not relrowsecurity or not relforcerowsecurity)")).rows;
  assert.equal(bad.length,0);
  const roles=(await admin("select rolname,rolbypassrls,rolsuper,rolcanlogin from pg_roles where rolname in ('erp_api','erp_identity')")).rows;
  assert.equal(roles.length,2);assert.ok(roles.every(r=>!r.rolbypassrls&&!r.rolsuper&&!r.rolcanlogin));
  const badFns=(await admin("select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'erp_%' and (has_function_privilege('anon',p.oid,'execute') or p.proowner<>(select oid from pg_roles where rolname='erp_api'))")).rows;
  assert.equal(badFns.length,0);
 });
});
await db.close();
