-- Dolgozói belépés: kizárólag ERP, meglévő dolgozói személyhez; kézi meghívó.
begin;
grant erp_identity,erp_api to postgres with set true,inherit false;
grant create on schema erp_private to erp_identity;grant create on schema public to erp_api;
create table erp_private.staff_accounts(
 id uuid primary key,organization_id uuid not null references erp.organizations(id),person_id uuid not null,
 login_email text not null unique check(login_email=lower(btrim(login_email)) and length(login_email) between 3 and 254),
 auth_user_id uuid unique references auth.users(id),active boolean not null default true,setup_pending boolean not null default false,
 generation bigint not null default 0,revision bigint not null default 1,creation_payload jsonb not null,
 failures int not null default 0,locked_until timestamptz,created_at timestamptz not null default now(),
 unique(organization_id,id),foreign key(organization_id,person_id) references erp.persons(organization_id,id));
create table erp_private.staff_setup_links(
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),account_id uuid not null references erp_private.staff_accounts(id),
 purpose text not null check(purpose in ('invite','recover')),generation bigint not null,expires_at timestamptz not null,
 used_at timestamptz,revoked_at timestamptz,claim_id uuid,claimed_until timestamptz,created_by uuid not null,created_at timestamptz not null default now());
create table erp_private.staff_sessions(
 session_id uuid primary key,account_id uuid not null references erp_private.staff_accounts(id),generation bigint not null,
 revoked_at timestamptz,expires_at timestamptz not null default now()+interval '90 days',created_at timestamptz not null default now());
create table erp_private.staff_recovery_requests(
 id uuid primary key default gen_random_uuid(),account_id uuid not null references erp_private.staff_accounts(id),
 created_at timestamptz not null default now(),handled_at timestamptz);
alter table erp_private.staff_accounts add unique(organization_id,person_id);
create index staff_sessions_account on erp_private.staff_sessions(account_id) where revoked_at is null;
create index staff_links_account on erp_private.staff_setup_links(account_id);
create unique index staff_one_recovery on erp_private.staff_recovery_requests(account_id) where handled_at is null;
do $$declare t text;begin foreach t in array array['staff_accounts','staff_setup_links','staff_sessions','staff_recovery_requests'] loop
 execute format('alter table erp_private.%I enable row level security',t);execute format('alter table erp_private.%I force row level security',t);execute format('revoke all on erp_private.%I from public,anon,authenticated,service_role',t);end loop;end$$;
grant select on erp_private.staff_accounts,erp_private.staff_sessions to erp_identity;
create policy staff_identity_account on erp_private.staff_accounts for select to erp_identity using(auth_user_id=erp_private.request_user_id());
create policy staff_identity_session on erp_private.staff_sessions for select to erp_identity using(exists(select 1 from erp_private.staff_accounts c where c.id=account_id and c.auth_user_id=erp_private.request_user_id()));
set local role erp_identity;
create or replace function erp_private.current_person(p_org uuid) returns uuid language sql stable security definer set search_path='' as $$
 select a.person_id from erp.user_accounts a join erp.persons p on p.organization_id=a.organization_id and p.id=a.person_id
 where a.organization_id=p_org and a.active and p.active and a.auth_user_id=erp_private.request_user_id()
 and (not exists(select 1 from erp_private.client_accounts c where c.auth_user_id=a.auth_user_id)
 or exists(select 1 from erp_private.client_accounts c join erp_private.client_sessions s on s.account_id=c.id and s.generation=c.generation
 where c.auth_user_id=a.auth_user_id and c.organization_id=p_org and c.active and not c.setup_pending and s.revoked_at is null and s.expires_at>now()
 and s.session_id=nullif(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id','')::uuid))
 and (not exists(select 1 from erp_private.staff_accounts c where c.auth_user_id=a.auth_user_id)
 or exists(select 1 from erp_private.staff_accounts c join erp_private.staff_sessions s on s.account_id=c.id and s.generation=c.generation
 where c.auth_user_id=a.auth_user_id and c.organization_id=p_org and c.active and not c.setup_pending and s.revoked_at is null and s.expires_at>now()
 and s.session_id=nullif(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id','')::uuid))
$$;
reset role;
create function erp_private.require_staff_session(p_actor uuid,p_session uuid) returns erp_private.staff_accounts language plpgsql stable security definer set search_path='' as $$
declare a erp_private.staff_accounts;begin
 select c.* into a from erp_private.staff_accounts c join erp_private.staff_sessions s on s.account_id=c.id and s.generation=c.generation
 join erp.persons p on p.organization_id=c.organization_id and p.id=c.person_id
 join erp.user_accounts u on u.auth_user_id=c.auth_user_id and u.organization_id=c.organization_id and u.person_id=c.person_id
 where c.auth_user_id=p_actor and c.active and not c.setup_pending and p.active and u.active and s.session_id=p_session and s.revoked_at is null and s.expires_at>now()
 and exists(select 1 from erp.person_roles r where r.organization_id=c.organization_id and r.person_id=c.person_id and r.role='worker' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now()));
 if not found then raise exception 'Az ügyfél-hozzáférés lejárt vagy visszavonták.' using errcode='42501';end if;return a;end$$;
revoke all on function erp_private.require_staff_session(uuid,uuid) from public,anon,authenticated,service_role;
create function public.erp_staff_manage(p_org uuid,p_actor uuid,p_account uuid,p_person uuid,p_revision bigint,p_email text,p_active boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare a erp_private.staff_accounts;clean text:=lower(btrim(p_email));payload jsonb;begin
 perform erp_private.require_customer_office(p_org,p_actor);
 if p_account is null or p_person is null or p_revision is null or p_active is null or clean is null or length(clean)>254 or clean !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$' then raise exception 'Ellenőrizd a dolgozót és az e-mail-címet.' using errcode='22023';end if;
 if not exists(select 1 from erp.persons p join erp.person_roles r on r.organization_id=p.organization_id and r.person_id=p.id where p.organization_id=p_org and p.id=p_person and p.active and r.role='worker' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now())) or exists(select 1 from erp.person_roles r where r.organization_id=p_org and r.person_id=p_person and r.role='office' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now())) then raise exception 'Aktív dolgozót válassz. Az iroda a meglévő saját fiókját használja.' using errcode='22023';end if;
 payload:=jsonb_build_object('person_id',p_person,'email',clean,'active',p_active);
 select * into a from erp_private.staff_accounts where id=p_account for update;
 if found then
  if a.organization_id<>p_org or a.person_id<>p_person then raise exception 'Nem elérhető fiók.' using errcode='42501';end if;
  if p_revision=0 and a.creation_payload=payload then return jsonb_build_object('id',a.id,'revision',a.revision);end if;
  if a.revision<>p_revision then raise exception 'A hozzáférés megváltozott.' using errcode='40001';end if;
  if a.login_email<>clean then raise exception 'A belépési cím nem cserélhető.' using errcode='22023';end if;
  update erp_private.staff_accounts set active=p_active,revision=revision+1 where id=a.id returning * into a;
 else
  if p_revision<>0 then raise exception 'A hozzáférés megváltozott.' using errcode='40001';end if;
  if exists(select 1 from erp.user_accounts where organization_id=p_org and person_id=p_person) then raise exception 'A személynek már van saját ERP-fiókja.' using errcode='22023';end if;
  insert into erp_private.staff_accounts(id,organization_id,person_id,login_email,active,creation_payload) values(p_account,p_org,p_person,clean,p_active,payload) returning * into a;
 end if;
 if not p_active then update erp_private.staff_sessions set revoked_at=now() where account_id=a.id and revoked_at is null;update erp_private.staff_setup_links set revoked_at=now() where account_id=a.id and used_at is null and revoked_at is null;end if;
 insert into erp.audit_events(organization_id,actor_id,entity,entity_id,operation,after_data) values(p_org,p_actor,'staff_access',a.id,'SAVE',jsonb_build_object('active',p_active,'person_id',p_person));
 return jsonb_build_object('id',a.id,'revision',a.revision);end$$;
create function public.erp_staff_admin_list(p_org uuid,p_actor uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 perform erp_private.require_customer_office(p_org,p_actor);
 return jsonb_build_object('people',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.display_name) order by p.display_name) from erp.persons p where p.organization_id=p_org and p.active and exists(select 1 from erp.person_roles r where r.organization_id=p_org and r.person_id=p.id and r.role='worker' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now())) and not exists(select 1 from erp.person_roles r where r.organization_id=p_org and r.person_id=p.id and r.role='office' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now()))),'[]'),
 'accounts',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'person_id',c.person_id,'name',p.display_name,'email',c.login_email,'active',c.active,'revision',c.revision,'registered',c.auth_user_id is not null,'recovery_requested',exists(select 1 from erp_private.staff_recovery_requests r where r.account_id=c.id and r.handled_at is null)) order by p.display_name) from erp_private.staff_accounts c join erp.persons p on p.organization_id=c.organization_id and p.id=c.person_id where c.organization_id=p_org),'[]'));
 end$$;
create function public.erp_staff_issue(p_org uuid,p_actor uuid,p_account uuid,p_revision bigint,p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$declare a erp_private.staff_accounts;begin
 perform erp_private.require_customer_office(p_org,p_actor);if p_hash !~ '^[a-f0-9]{64}$' then raise exception 'Érvénytelen hivatkozás.' using errcode='22023';end if;
 select * into a from erp_private.staff_accounts where id=p_account and organization_id=p_org and active for update;
 if not found or a.revision<>p_revision then raise exception 'A hozzáférés megváltozott vagy inaktív.' using errcode='40001';end if;
 if exists(select 1 from erp_private.staff_setup_links where account_id=a.id and used_at is null and revoked_at is null and claimed_until>now()) then raise exception 'A jelszóbeállítás folyamatban van.' using errcode='40001';end if;
 update erp_private.staff_setup_links set revoked_at=now() where account_id=a.id and used_at is null and revoked_at is null;
 insert into erp_private.staff_setup_links(token_hash,account_id,purpose,generation,expires_at,created_by) values(p_hash,a.id,case when a.auth_user_id is null then 'invite' else 'recover' end,a.generation,now()+interval '24 hours',p_actor);
 insert into erp.audit_events(organization_id,actor_id,entity,entity_id,operation,after_data) values(p_org,p_actor,'staff_access',a.id,'LINK',jsonb_build_object('expires_in_hours',24));
 return jsonb_build_object('email',a.login_email,'expires_in_hours',24);end$$;
create function public.erp_staff_claim(p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$declare l erp_private.staff_setup_links;a erp_private.staff_accounts;claim uuid:=gen_random_uuid();begin
 select * into l from erp_private.staff_setup_links where token_hash=p_hash for update;
 if not found or l.used_at is not null or l.revoked_at is not null or l.expires_at<=now() then return jsonb_build_object('allowed',false);end if;
 if l.claimed_until>now() then return jsonb_build_object('allowed',false,'busy',true);end if;
 select * into a from erp_private.staff_accounts where id=l.account_id and active and generation=l.generation for update;
 if not found then return jsonb_build_object('allowed',false);end if;
 update erp_private.staff_setup_links set claim_id=claim,claimed_until=now()+interval '2 minutes' where token_hash=p_hash;
 update erp_private.staff_accounts set setup_pending=true where id=a.id;
 update erp_private.staff_sessions set revoked_at=now() where account_id=a.id and revoked_at is null;
 return jsonb_build_object('allowed',true,'claim_id',claim,'account_id',a.id,'auth_user_id',a.auth_user_id,'email',a.id::text||'@staff.erp.diszkertek.hu');end$$;
create function public.erp_staff_auth_lookup(p_account uuid,p_claim uuid) returns uuid language plpgsql stable security definer set search_path='' as $$begin
 if not exists(select 1 from erp_private.staff_setup_links where account_id=p_account and claim_id=p_claim and claimed_until>now() and used_at is null and revoked_at is null) then raise exception 'Lejárt beállítás.' using errcode='42501';end if;
 return (select u.id from auth.users u where u.email=p_account::text||'@staff.erp.diszkertek.hu' and u.raw_app_meta_data->>'erp_staff_id'=p_account::text);end$$;
create function public.erp_staff_finish(p_account uuid,p_claim uuid,p_user uuid) returns void language plpgsql security definer set search_path='' as $$declare a erp_private.staff_accounts;l erp_private.staff_setup_links;begin
 select * into l from erp_private.staff_setup_links where account_id=p_account and claim_id=p_claim and used_at is null and revoked_at is null and claimed_until>now() for update;
 if not found then raise exception 'A beállítási hivatkozás lejárt.' using errcode='42501';end if;
 select * into a from erp_private.staff_accounts where id=p_account and active and generation=l.generation for update;
 if not found or public.erp_staff_auth_lookup(p_account,p_claim) is distinct from p_user then raise exception 'Nem saját ERP-fiók.' using errcode='42501';end if;
 insert into erp.user_accounts(organization_id,auth_user_id,person_id) values(a.organization_id,p_user,a.person_id) on conflict(organization_id,auth_user_id) do update set active=true where erp.user_accounts.person_id=excluded.person_id;
 if not found then raise exception 'Eltérő személyhez kötött fiók.' using errcode='42501';end if;
 update erp_private.staff_accounts set auth_user_id=p_user,setup_pending=false,generation=generation+1,failures=0,locked_until=null where id=a.id;
 update erp_private.staff_setup_links set used_at=now(),claimed_until=null where token_hash=l.token_hash;
 update erp_private.staff_recovery_requests set handled_at=now() where account_id=a.id and handled_at is null;
 insert into erp.audit_events(organization_id,actor_id,entity,entity_id,operation) values(a.organization_id,p_user,'staff_access',a.id,'PASSWORD_SET');end$$;
create function public.erp_staff_login_target(p_email text) returns jsonb language plpgsql security definer set search_path='' as $$declare a erp_private.staff_accounts;begin
 select * into a from erp_private.staff_accounts where login_email=lower(btrim(p_email)) and active and not setup_pending and auth_user_id is not null for update;
 if not found or a.locked_until>now() then return jsonb_build_object('allowed',false);end if;
 update erp_private.staff_accounts set failures=case when locked_until is not null and locked_until<=now() then 1 else failures+1 end,locked_until=case when failures>=9 and (locked_until is null or locked_until>now()) then now()+interval '15 minutes' else null end where id=a.id;
 return jsonb_build_object('allowed',true,'account_id',a.id,'generation',a.generation,'user_id',a.auth_user_id,'email',a.id::text||'@staff.erp.diszkertek.hu');end$$;
create function public.erp_staff_session_open(p_account uuid,p_generation bigint,p_user uuid,p_session uuid) returns void language plpgsql security definer set search_path='' as $$declare a erp_private.staff_accounts;begin
 select * into a from erp_private.staff_accounts where id=p_account and auth_user_id=p_user and generation=p_generation and active and not setup_pending for update;
 if not found or p_session is null then raise exception 'Megváltozott ügyfél-hozzáférés.' using errcode='42501';end if;
 insert into erp_private.staff_sessions(session_id,account_id,generation) values(p_session,a.id,a.generation) on conflict(session_id) do nothing;
 if not exists(select 1 from erp_private.staff_sessions where session_id=p_session and account_id=a.id and generation=a.generation and revoked_at is null and expires_at>now()) then raise exception 'Lejárt munkamenet.' using errcode='42501';end if;
 update erp_private.staff_accounts set failures=0,locked_until=null where id=a.id;end$$;
create function public.erp_staff_session_check(p_user uuid,p_session uuid) returns void language plpgsql stable security definer set search_path='' as $$begin
 if exists(select 1 from erp_private.staff_accounts where auth_user_id=p_user) then perform erp_private.require_staff_session(p_user,p_session);end if;end$$;
create function public.erp_staff_recover(p_email text) returns void language plpgsql security definer set search_path='' as $$begin
 insert into erp_private.staff_recovery_requests(account_id) select id from erp_private.staff_accounts where login_email=lower(btrim(p_email)) and active and auth_user_id is not null
 on conflict(account_id) where handled_at is null do nothing;end$$;

create function public.erp_staff_session_close(p_user uuid,p_session uuid) returns void language sql security definer set search_path='' as $$
 update erp_private.staff_sessions s set revoked_at=coalesce(s.revoked_at,now()) from erp_private.staff_accounts c where c.id=s.account_id and c.auth_user_id=p_user and s.session_id=p_session
$$;
revoke all on function public.erp_staff_session_close(uuid,uuid) from public,anon,authenticated;
grant execute on function public.erp_staff_session_close(uuid,uuid) to service_role;
set local role erp_api;
create or replace function public.erp_session() returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 select jsonb_agg(jsonb_build_object('organization_id',o.id,'organization_name',o.name,'person_id',erp_private.current_person(o.id),'is_office',erp_private.is_office(o.id),'is_staff',not erp_private.is_office(o.id) and exists(select 1 from erp.person_roles s where s.organization_id=o.id and s.person_id=erp_private.current_person(o.id) and s.role='worker' and s.revoked_at is null and s.valid_from<=now() and (s.valid_until is null or s.valid_until>now())),'is_client',exists(select 1 from erp.person_roles r where r.organization_id=o.id and r.person_id=erp_private.current_person(o.id) and r.role='client' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now())))) into result from erp.organizations o;
 if result is null then raise exception 'Nincs aktív ERP-hozzáférésed.' using errcode='42501';end if;return result;end$$;
reset role;
do $$declare f record;begin for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'erp_staff_%' loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to service_role',f.signature);end loop;end$$;
revoke create on schema public from erp_api;revoke create on schema erp_private from erp_identity;
revoke erp_identity,erp_api from postgres granted by postgres;
commit;
