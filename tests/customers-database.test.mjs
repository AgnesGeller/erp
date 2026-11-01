import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,public to anon,authenticated,service_role;
create schema munkalap;create table munkalap.customers(id uuid primary key,full_name text);insert into munkalap.customers values('${id(900)}','Érintetlen forrás');`);
for(const name of ['erp-foundation','erp-identity','erp-worker-request','erp-customers','erp-staff-directory'])await db.exec(await readFile(new URL('../database/proposals/'+name+'.sql',import.meta.url),'utf8'));
await db.exec(`insert into auth.users values('${id(101)}'),('${id(102)}'),('${id(103)}');insert into erp.organizations values('${id(1)}','Teszt A'),('${id(2)}','Teszt B');
insert into erp.persons(id,organization_id,display_name) values('${id(11)}','${id(1)}','Iroda'),('${id(12)}','${id(1)}','Dolgozó');
insert into erp.user_accounts(organization_id,auth_user_id,person_id) values('${id(1)}','${id(101)}','${id(11)}'),('${id(1)}','${id(102)}','${id(12)}');
insert into erp.person_roles(organization_id,person_id,role) values('${id(1)}','${id(11)}','office'),('${id(1)}','${id(12)}','worker');`);
async function as(user,role,sql,args=[]){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);await db.exec('set role '+role);try{return await db.query(sql,args);}finally{await db.exec('reset role');}}
const payload={full_name:'Teszt ügyfél',address:'Teszt cím 1.',customer_type:'person',contact_name:'',email:'',phone:'',tax_number:'',billing_name:'',billing_address:'',internal_notes:''};
await test('Ügyféltörzs, eredeti azonosítók és szervezeti elkülönítés',async t=>{
 await t.test('Nincs forrásmódosítás, az új táblák FORCE RLS védelműek',async()=>{
  assert.equal((await db.query('select full_name from munkalap.customers')).rows[0].full_name,'Érintetlen forrás');
  const protection=await db.query("select relrowsecurity,relforcerowsecurity from pg_class where oid in ('erp.customer_profiles'::regclass,'erp_private.customer_requests'::regclass)");assert.ok(protection.rows.every(r=>r.relrowsecurity&&r.relforcerowsecurity));
  await assert.rejects(as(id(101),'authenticated','select * from erp.customer_profiles'),e=>e.code==='42501');
 });
 await t.test('Csak az igazolt kiszolgáló vehet át forrásügyfelet; az iroda és az ügyfél nem hamisíthat importot',async()=>{
  const items=JSON.stringify([{id:id(301),full_name:'Azonos nevű személy'},{id:id(302),full_name:'Azonos nevű személy'}]);
  await assert.rejects(as(id(101),'authenticated','select public.erp_customer_sync($1,$2,$3)',[id(1),id(101),items]),e=>e.code==='42501');
  await assert.rejects(as(null,'service_role','select public.erp_customer_sync($1,$2,$3)',[id(1),id(102),items]),e=>e.code==='42501');
  await assert.rejects(as(null,'service_role','select public.erp_customer_sync($1,$2,$3)',[id(2),id(101),items]),e=>e.code==='42501');
  await as(null,'service_role','select public.erp_customer_sync($1,$2,$3)',[id(1),id(101),items]);
  assert.equal((await db.query('select * from erp.customer_profiles')).rows.length,2);
  await as(null,'service_role','select public.erp_customer_sync($1,$2,$3)',[id(1),id(101),items]);
  assert.equal((await db.query('select * from erp.customer_profiles')).rows.length,2);
  assert.equal((await as(id(101),'authenticated','select public.erp_list_people($1) as data',[id(1)])).rows[0].data.length,2);
 });
 await t.test('Az irodai kiegészítés nem írja a forrást; a párhuzamos mentés ütközést jelez',async()=>{
  await as(id(101),'authenticated','select public.erp_customer_profile_save($1,$2,1,$3,$4,$5)',[id(1),id(301),'Számlanév','Számlázási cím','Belső megjegyzés']);
  await assert.rejects(as(id(101),'authenticated','select public.erp_customer_profile_save($1,$2,1,$3,$4,$5)',[id(1),id(301),'Másik név','','']),e=>e.code==='40001');
  await assert.rejects(as(id(102),'authenticated','select public.erp_customer_profile_save($1,$2,2,$3,$4,$5)',[id(1),id(301),'Tiltott','','']),e=>e.code==='42501');
  await as(null,'service_role','select public.erp_customer_sync($1,$2,$3)',[id(1),id(101),JSON.stringify([{id:id(301),full_name:'Forrásban javított név'}])]);
  const profile=(await db.query('select * from erp.customer_profiles where source_customer_id=$1',[id(301)])).rows[0];assert.equal(profile.billing_name,'Számlanév');assert.equal(profile.revision,2);
 });
 await t.test('Megkezdett mentés ismétlése azonos, módosított tartalom elutasított',async()=>{
  await assert.rejects(as(id(102),'authenticated','select public.erp_customer_begin($1,$2,$3)',[id(1),id(401),JSON.stringify(payload)]),e=>e.code==='42501');
  const first=(await as(id(101),'authenticated','select public.erp_customer_begin($1,$2,$3) as data',[id(1),id(401),JSON.stringify(payload)])).rows[0].data;
  const again=(await as(id(101),'authenticated','select public.erp_customer_begin($1,$2,$3) as data',[id(1),id(401),JSON.stringify(payload)])).rows[0].data;
  assert.equal(first.source_customer_id,again.source_customer_id);assert.notEqual(first.source_customer_id,id(401));
  await assert.rejects(as(id(101),'authenticated','select public.erp_customer_begin($1,$2,$3)',[id(1),id(401),JSON.stringify({...payload,full_name:'Más név'})]),e=>e.code==='40001');
  assert.equal((await as(id(101),'authenticated','select public.erp_customer_pending($1) as data',[id(1)])).rows[0].data.length,1);
  await assert.rejects(as(id(102),'authenticated','select public.erp_customer_resume($1,$2)',[id(1),id(401)]),e=>e.code==='42501');
  await assert.rejects(as(id(101),'authenticated','select public.erp_customer_finish($1,$2,$3)',[id(1),id(101),id(401)]),e=>e.code==='42501');
  await as(null,'service_role','select public.erp_customer_finish($1,$2,$3)',[id(1),id(101),id(401)]);
  await as(null,'service_role','select public.erp_customer_finish($1,$2,$3)',[id(1),id(101),id(401)]);
  assert.equal((await as(id(101),'authenticated','select public.erp_customer_pending($1) as data',[id(1)])).rows[0].data.length,0);
 });
});
await db.close();