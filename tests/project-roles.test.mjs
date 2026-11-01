import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;create table public.legacy_table(id int);insert into public.legacy_table values(7);`);
for(const name of ['erp-foundation','erp-identity','erp-worker-request'])await db.exec(await readFile(new URL('../database/proposals/'+name+'.sql',import.meta.url),'utf8'));
await db.exec(`insert into erp.organizations values('${id(1)}','A'),('${id(2)}','B');`);
for(let n=101;n<=106;n++){const org=n===106?id(2):id(1),person=id(n-90);await db.query('insert into auth.users values($1)',[id(n)]);await db.query('insert into erp.persons(id,organization_id,display_name) values($1,$2,$3)',[person,org,'Teszt '+n]);await db.query('insert into erp.user_accounts(organization_id,auth_user_id,person_id) values($1,$2,$3)',[org,id(n),person]);await db.query('insert into erp.person_roles(organization_id,person_id,role) values($1,$2,$3)',[org,person,n===101||n===106?'office':'worker']);}
await db.exec(`insert into erp.garden_projects(id,organization_id,name) values('${id(90)}','${id(1)}','Történeti munka');insert into erp.project_assignments(id,organization_id,project_id,person_id,role,valid_from,created_by) values('${id(91)}','${id(1)}','${id(90)}','${id(12)}','crew_lead',now()-interval '1 day','${id(101)}');`);
await db.exec(await readFile(new URL('../database/proposals/erp-work-roles.sql',import.meta.url),'utf8'));
await db.exec(`insert into erp.garden_projects(id,organization_id,name,work_type) values('${id(201)}','${id(1)}','Kertépítés','construction'),('${id(202)}','${id(1)}','Karbantartás','maintenance'),('${id(203)}','${id(1)}','Jövőbeli','construction');`);
async function as(user,sql,args=[],role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);await db.exec('set role '+role);try{return await db.query(sql,args);}finally{await db.exec('reset role');}}
const assign=(person,project,role)=>as(id(101),"select public.erp_assign_project_role($1,$2,$3,$4,now()-interval '1 hour',null) as id",[id(1),id(project),id(person),role]);
const access=async(user,project)=>(await as(id(user),'select public.erp_project_role_access($1,$2) as data',[id(1),id(project)])).rows[0].data;
let constructionLead;
await test('PDF szerinti munkánkénti szerepek',async t=>{
 await t.test('A korábbi megbízás és más objektum megmarad, új általános vezető nem adható',async()=>{
  assert.equal((await db.query('select role from erp.project_assignments where id=$1',[id(91)])).rows[0].role,'crew_lead');assert.equal((await db.query('select * from public.legacy_table')).rows[0].id,7);
  for(const role of ['crew_lead','worker','project_lead'])await assert.rejects(assign(12,201,role),e=>e.code==='22023');
 });
 await t.test('Kertépítő és Kertész mindkét munkaterületen dolgozhat, joguk azonos',async()=>{
  for(const project of [201,202]){await assign(12,project,'construction_worker');await assign(13,project,'gardener');const a=await access(102,project),b=await access(103,project);assert.deepEqual(a,b);assert.equal(a.can_view_technical,true);assert.equal(a.can_view_procurement,false);assert.equal(a.can_review_work,false);assert.equal(a.can_view_internal_finances,false);assert.equal(a.can_assign_roles,false);}
 });
 await t.test('A két vezető kizárólag a saját munkaterületén kap vezetői jogot',async()=>{
  constructionLead=(await assign(14,201,'construction_lead')).rows[0].id;await assign(15,202,'maintenance_lead');
  const construction=await access(104,201),maintenance=await access(105,202);assert.equal(construction.can_review_work,true);assert.equal(maintenance.can_review_work,true);assert.equal(construction.can_view_procurement,true);assert.equal(maintenance.can_view_procurement,true);assert.equal(construction.can_view_maintenance_customer_prices,false);assert.equal(maintenance.can_view_maintenance_customer_prices,true);
  for(const rights of [construction,maintenance]){assert.equal(rights.can_view_internal_finances,false);assert.equal(rights.can_edit_master_prices,false);assert.equal(rights.can_assign_roles,false);}
  await assert.rejects(assign(14,202,'construction_lead'),e=>e.code==='22023');await assert.rejects(assign(15,201,'maintenance_lead'),e=>e.code==='22023');
 });
 await t.test('A munkatárs és más szervezet nem oszthat szerepet; az iroda teljes belső jogú',async()=>{
  await assert.rejects(as(id(102),"select public.erp_assign_project_role($1,$2,$3,'construction_lead',now(),null)",[id(1),id(201),id(12)]),e=>e.code==='42501');await assert.rejects(access(106,201),e=>e.code==='42501');
  const office=await access(101,201);assert.equal(office.can_assign_roles,true);assert.equal(office.can_view_internal_finances,true);assert.equal(office.can_edit_master_prices,true);
 });
 await t.test('Több vezető engedélyezett, átfedő azonos megbízás nem',async()=>{
  await assign(11,201,'construction_lead');await assert.rejects(assign(14,201,'construction_lead'),e=>e.code==='23505');
 });
 await t.test('A munkatípus-korlát közvetlen adatbázisírásnál is érvényes',async()=>{
  await assert.rejects(db.query("insert into erp.project_assignments(organization_id,project_id,person_id,role,valid_from,created_by) values($1,$2,$3,'maintenance_lead',now(),$4)",[id(1),id(201),id(12),id(101)]),e=>e.code==='22023');
  await assert.rejects(db.query("update erp.garden_projects set work_type='maintenance' where id=$1",[id(201)]),e=>e.code==='22023');
 });
 await t.test('Visszavonás és jövőbeli megbízás nem ad vezetői hozzáférést',async()=>{
  await as(id(101),'select public.erp_revoke_assignment($1,$2,1)',[id(1),constructionLead]);await assert.rejects(access(104,201),e=>e.code==='42501');
  await as(id(101),"select public.erp_assign_project_role($1,$2,$3,'construction_lead',now()+interval '1 day',null)",[id(1),id(203),id(14)]);await assert.rejects(access(104,203),e=>e.code==='42501');
  await as(id(101),'select public.erp_revoke_assignment($1,$2,1)',[id(1),id(91)]);assert.ok((await db.query('select revoked_at from erp.project_assignments where id=$1',[id(91)])).rows[0].revoked_at);
 });
 await t.test('Anonim hívó és közvetlen táblakérés nem engedélyezett',async()=>{
  await assert.rejects(as(null,'select public.erp_project_role_access($1,$2)',[id(1),id(201)],'anon'),e=>e.code==='42501');await assert.rejects(as(id(101),'select * from erp.project_assignments'),e=>e.code==='42501');
 });
});await db.close();