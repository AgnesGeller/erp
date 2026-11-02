-- Kizárólag ERP: jóváhagyott ügyfél-hozzáférés és kézi meghívó. Nem módosít más alkalmazást.
begin;
-- Ideiglenes saját ERP-szerkesztési jogok; a tranzakció végén visszavonjuk a saját grantot.
grant erp_identity,erp_api to postgres with set true,inherit false;
grant create on schema erp_private to erp_identity;grant create on schema public to erp_api;
create table erp_private.client_accounts(
 id uuid primary key,organization_id uuid not null references erp.organizations(id),person_id uuid not null,
 login_email text not null unique check(login_email=lower(btrim(login_email)) and length(login_email) between 3 and 254),
 auth_user_id uuid unique references auth.users(id),active boolean not null default true,setup_pending boolean not null default false,
 generation bigint not null default 0,revision bigint not null default 1,creation_payload jsonb not null,
 failures int not null default 0,locked_until timestamptz,created_at timestamptz not null default now(),
 unique(organization_id,id),foreign key(organization_id,person_id) references erp.persons(organization_id,id));
create table erp.client_site_access(
 organization_id uuid not null,account_id uuid not null,source_customer_id uuid not null,source_location_id uuid not null,
 active boolean not null default true,created_by uuid not null,updated_at timestamptz not null default now(),
 primary key(organization_id,account_id,source_location_id),foreign key(organization_id,account_id) references erp_private.client_accounts(organization_id,id),
 foreign key(organization_id,source_location_id,source_customer_id) references erp.work_sites(organization_id,source_location_id,source_customer_id));
create index client_scope_location on erp.client_site_access(organization_id,source_customer_id,source_location_id) where active;
create table erp_private.client_setup_links(
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),account_id uuid not null references erp_private.client_accounts(id),
 purpose text not null check(purpose in ('invite','recover')),generation bigint not null,expires_at timestamptz not null,
 used_at timestamptz,revoked_at timestamptz,claim_id uuid,claimed_until timestamptz,created_by uuid not null,created_at timestamptz not null default now());
create index client_links_account on erp_private.client_setup_links(account_id);
create table erp_private.client_sessions(
 session_id uuid primary key,account_id uuid not null references erp_private.client_accounts(id),generation bigint not null,
 revoked_at timestamptz,expires_at timestamptz not null default now()+interval '90 days',created_at timestamptz not null default now());
create index client_sessions_account on erp_private.client_sessions(account_id) where revoked_at is null;
create table erp_private.client_recovery_requests(
 id uuid primary key default gen_random_uuid(),account_id uuid not null references erp_private.client_accounts(id),
 created_at timestamptz not null default now(),handled_at timestamptz);
create unique index client_one_recovery on erp_private.client_recovery_requests(account_id) where handled_at is null;
do $$declare t text;begin foreach t in array array['client_accounts','client_setup_links','client_sessions','client_recovery_requests'] loop
 execute format('alter table erp_private.%I enable row level security',t);execute format('alter table erp_private.%I force row level security',t);
 execute format('revoke all on erp_private.%I from public,anon,authenticated,service_role',t);end loop;end$$;
alter table erp.client_site_access enable row level security;alter table erp.client_site_access force row level security;
revoke all on erp.client_site_access from public,anon,authenticated,service_role;
grant select on erp_private.client_accounts,erp_private.client_sessions to erp_identity;
create policy client_identity_account on erp_private.client_accounts for select to erp_identity using(auth_user_id=erp_private.request_user_id());
create policy client_identity_session on erp_private.client_sessions for select to erp_identity using(exists(select 1 from erp_private.client_accounts c where c.id=account_id and c.auth_user_id=erp_private.request_user_id()));
set local role erp_identity;
create or replace function erp_private.current_person(p_org uuid) returns uuid language sql stable security definer set search_path='' as $$
 select a.person_id from erp.user_accounts a join erp.persons p on p.organization_id=a.organization_id and p.id=a.person_id
 where a.organization_id=p_org and a.active and p.active and a.auth_user_id=erp_private.request_user_id()
 and (not exists(select 1 from erp_private.client_accounts c where c.auth_user_id=a.auth_user_id)
 or exists(select 1 from erp_private.client_accounts c join erp_private.client_sessions s on s.account_id=c.id and s.generation=c.generation
 where c.auth_user_id=a.auth_user_id and c.organization_id=p_org and c.active and not c.setup_pending and s.revoked_at is null and s.expires_at>now()
 and s.session_id=nullif(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id','')::uuid))
$$;
reset role;
-- Az eredeti függvény tulajdonosa erp_identity marad; nem kap szélesebb adatbázis-jogot.
create function erp_private.require_client_session(p_actor uuid,p_session uuid) returns erp_private.client_accounts language plpgsql stable security definer set search_path='' as $$
declare a erp_private.client_accounts;begin
 select c.* into a from erp_private.client_accounts c join erp_private.client_sessions s on s.account_id=c.id and s.generation=c.generation
 join erp.persons p on p.organization_id=c.organization_id and p.id=c.person_id
 join erp.user_accounts u on u.auth_user_id=c.auth_user_id and u.organization_id=c.organization_id and u.person_id=c.person_id
 where c.auth_user_id=p_actor and c.active and not c.setup_pending and p.active and u.active and s.session_id=p_session and s.revoked_at is null and s.expires_at>now()
 and exists(select 1 from erp.person_roles r where r.organization_id=c.organization_id and r.person_id=c.person_id and r.role='client' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now()));
 if not found then raise exception 'Az ügyfél-hozzáférés lejárt vagy visszavonták.' using errcode='42501';end if;return a;end$$;
revoke all on function erp_private.require_client_session(uuid,uuid) from public,anon,authenticated,service_role;
create function public.erp_client_manage(p_org uuid,p_actor uuid,p_account uuid,p_revision bigint,p_name text,p_email text,p_scopes jsonb,p_active boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare a erp_private.client_accounts;person uuid;item jsonb;clean text:=lower(btrim(p_email));data jsonb;begin
 perform erp_private.require_customer_office(p_org,p_actor);
 if p_account is null or p_revision is null or p_active is null or length(btrim(p_name)) not between 1 and 150 or length(clean)>254 or clean !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$' or jsonb_typeof(p_scopes) is distinct from 'array' or jsonb_array_length(p_scopes)>500 then raise exception 'Ellenőrizd a nevet, e-mail-címet és a címkijelölést.' using errcode='22023';end if;
 if p_active and jsonb_array_length(p_scopes)=0 then raise exception 'Jelölj ki legalább egy munkavégzési címet.' using errcode='22023';end if;
 data:=jsonb_build_object('name',btrim(p_name),'email',clean,'scopes',p_scopes,'active',p_active);
 select * into a from erp_private.client_accounts where id=p_account for update;
 if found then
  if a.organization_id<>p_org then raise exception 'Nem elérhető fiók.' using errcode='42501';end if;
  if p_revision=0 and a.creation_payload=data then return jsonb_build_object('id',a.id,'revision',a.revision);end if;
  if a.revision<>p_revision then raise exception 'A hozzáférés megváltozott.' using errcode='40001';end if;
  if a.login_email<>clean then raise exception 'Meglévő fiók belépési e-mail-címe nem cserélhető. Készíts külön új hozzáférést.' using errcode='22023';end if;
  person:=a.person_id;
 else
  if p_revision<>0 then raise exception 'A hozzáférés megváltozott.' using errcode='40001';end if;
  insert into erp.persons(organization_id,display_name) values(p_org,btrim(p_name)) returning id into person;
  insert into erp.person_roles(organization_id,person_id,role) values(p_org,person,'client');
  insert into erp_private.client_accounts(id,organization_id,person_id,login_email,creation_payload) values(p_account,p_org,person,clean,data);
 end if;
 update erp.client_site_access set active=false,updated_at=now() where organization_id=p_org and account_id=p_account;
 for item in select * from jsonb_array_elements(p_scopes) loop
  if not exists(select 1 from erp.work_sites w where w.organization_id=p_org and w.source_customer_id=(item->>'customer_id')::uuid and w.source_location_id=(item->>'location_id')::uuid and w.source_active and w.source_approved) then raise exception 'Csak aktív, jóváhagyott munkavégzési cím jelölhető ki.' using errcode='22023';end if;
  insert into erp.client_site_access(organization_id,account_id,source_customer_id,source_location_id,created_by) values(p_org,p_account,(item->>'customer_id')::uuid,(item->>'location_id')::uuid,p_actor)
  on conflict(organization_id,account_id,source_location_id) do update set active=true,updated_at=now();
 end loop;
 update erp.persons set display_name=btrim(p_name),revision=revision+1,updated_at=now() where organization_id=p_org and id=person;
 update erp_private.client_accounts set active=p_active,revision=case when a.id is null then 1 else revision+1 end where id=p_account returning * into a;
 if not p_active then update erp_private.client_setup_links set revoked_at=now() where account_id=p_account and used_at is null and revoked_at is null;update erp_private.client_sessions set revoked_at=now() where account_id=p_account and revoked_at is null;end if;
 insert into erp.audit_events(organization_id,actor_id,entity,entity_id,operation,after_data) values(p_org,p_actor,'client_access',p_account,'SAVE',jsonb_build_object('active',p_active,'sites',p_scopes));
 return jsonb_build_object('id',p_account,'revision',a.revision);end$$;
create function public.erp_client_admin_list(p_org uuid,p_actor uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 perform erp_private.require_customer_office(p_org,p_actor);
 return coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',p.display_name,'email',c.login_email,'active',c.active,'revision',c.revision,'registered',c.auth_user_id is not null,'setup_pending',c.setup_pending,
 'recovery_requested',exists(select 1 from erp_private.client_recovery_requests r where r.account_id=c.id and r.handled_at is null),
 'sites',coalesce((select jsonb_agg(jsonb_build_object('customer_id',s.source_customer_id,'location_id',s.source_location_id,'address',w.address) order by w.address) from erp.client_site_access s join erp.work_sites w on w.organization_id=s.organization_id and w.source_location_id=s.source_location_id where s.organization_id=p_org and s.account_id=c.id and s.active),'[]')) order by p.display_name) from erp_private.client_accounts c join erp.persons p on p.organization_id=c.organization_id and p.id=c.person_id where c.organization_id=p_org),'[]');end$$;
create function public.erp_client_issue(p_org uuid,p_actor uuid,p_account uuid,p_revision bigint,p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$declare a erp_private.client_accounts;begin
 perform erp_private.require_customer_office(p_org,p_actor);if p_hash !~ '^[a-f0-9]{64}$' then raise exception 'Érvénytelen hivatkozás.' using errcode='22023';end if;
 select * into a from erp_private.client_accounts where id=p_account and organization_id=p_org and active for update;
 if not found or a.revision<>p_revision then raise exception 'A hozzáférés megváltozott vagy inaktív.' using errcode='40001';end if;
 if exists(select 1 from erp_private.client_setup_links where account_id=a.id and used_at is null and revoked_at is null and claimed_until>now()) then raise exception 'A jelszóbeállítás folyamatban van.' using errcode='40001';end if;
 update erp_private.client_setup_links set revoked_at=now() where account_id=a.id and used_at is null and revoked_at is null;
 insert into erp_private.client_setup_links(token_hash,account_id,purpose,generation,expires_at,created_by) values(p_hash,a.id,case when a.auth_user_id is null then 'invite' else 'recover' end,a.generation,now()+interval '24 hours',p_actor);
 insert into erp.audit_events(organization_id,actor_id,entity,entity_id,operation,after_data) values(p_org,p_actor,'client_access',a.id,'LINK',jsonb_build_object('expires_in_hours',24));
 return jsonb_build_object('email',a.login_email,'expires_in_hours',24);end$$;
create function public.erp_client_claim(p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$declare l erp_private.client_setup_links;a erp_private.client_accounts;claim uuid:=gen_random_uuid();begin
 select * into l from erp_private.client_setup_links where token_hash=p_hash for update;
 if not found or l.used_at is not null or l.revoked_at is not null or l.expires_at<=now() then return jsonb_build_object('allowed',false);end if;
 if l.claimed_until>now() then return jsonb_build_object('allowed',false,'busy',true);end if;
 select * into a from erp_private.client_accounts where id=l.account_id and active and generation=l.generation for update;
 if not found then return jsonb_build_object('allowed',false);end if;
 update erp_private.client_setup_links set claim_id=claim,claimed_until=now()+interval '2 minutes' where token_hash=p_hash;
 update erp_private.client_accounts set setup_pending=true where id=a.id;
 update erp_private.client_sessions set revoked_at=now() where account_id=a.id and revoked_at is null;
 return jsonb_build_object('allowed',true,'claim_id',claim,'account_id',a.id,'auth_user_id',a.auth_user_id,'email',a.id::text||'@client.erp.diszkertek.hu');end$$;
create function public.erp_client_auth_lookup(p_account uuid,p_claim uuid) returns uuid language plpgsql stable security definer set search_path='' as $$begin
 if not exists(select 1 from erp_private.client_setup_links where account_id=p_account and claim_id=p_claim and claimed_until>now() and used_at is null and revoked_at is null) then raise exception 'Lejárt beállítás.' using errcode='42501';end if;
 return (select u.id from auth.users u where u.email=p_account::text||'@client.erp.diszkertek.hu' and u.raw_app_meta_data->>'erp_client_id'=p_account::text);end$$;
create function public.erp_client_finish(p_account uuid,p_claim uuid,p_user uuid) returns void language plpgsql security definer set search_path='' as $$declare a erp_private.client_accounts;l erp_private.client_setup_links;begin
 select * into l from erp_private.client_setup_links where account_id=p_account and claim_id=p_claim and used_at is null and revoked_at is null and claimed_until>now() for update;
 if not found then raise exception 'A beállítási hivatkozás lejárt.' using errcode='42501';end if;
 select * into a from erp_private.client_accounts where id=p_account and active and generation=l.generation for update;
 if not found or public.erp_client_auth_lookup(p_account,p_claim) is distinct from p_user then raise exception 'Nem saját ERP-fiók.' using errcode='42501';end if;
 insert into erp.user_accounts(organization_id,auth_user_id,person_id) values(a.organization_id,p_user,a.person_id) on conflict(organization_id,auth_user_id) do update set active=true where erp.user_accounts.person_id=excluded.person_id;
 if not found then raise exception 'Eltérő személyhez kötött fiók.' using errcode='42501';end if;
 update erp_private.client_accounts set auth_user_id=p_user,setup_pending=false,generation=generation+1,failures=0,locked_until=null where id=a.id;
 update erp_private.client_setup_links set used_at=now(),claimed_until=null where token_hash=l.token_hash;
 update erp_private.client_recovery_requests set handled_at=now() where account_id=a.id and handled_at is null;
 insert into erp.audit_events(organization_id,actor_id,entity,entity_id,operation) values(a.organization_id,p_user,'client_access',a.id,'PASSWORD_SET');end$$;
create function public.erp_client_login_target(p_email text) returns jsonb language plpgsql security definer set search_path='' as $$declare a erp_private.client_accounts;begin
 select * into a from erp_private.client_accounts where login_email=lower(btrim(p_email)) and active and not setup_pending and auth_user_id is not null for update;
 if not found or a.locked_until>now() then return jsonb_build_object('allowed',false);end if;
 update erp_private.client_accounts set failures=case when locked_until is not null and locked_until<=now() then 1 else failures+1 end,locked_until=case when failures>=9 and (locked_until is null or locked_until>now()) then now()+interval '15 minutes' else null end where id=a.id;
 return jsonb_build_object('allowed',true,'account_id',a.id,'generation',a.generation,'user_id',a.auth_user_id,'email',a.id::text||'@client.erp.diszkertek.hu');end$$;
create function public.erp_client_session_open(p_account uuid,p_generation bigint,p_user uuid,p_session uuid) returns void language plpgsql security definer set search_path='' as $$declare a erp_private.client_accounts;begin
 select * into a from erp_private.client_accounts where id=p_account and auth_user_id=p_user and generation=p_generation and active and not setup_pending for update;
 if not found or p_session is null then raise exception 'Megváltozott ügyfél-hozzáférés.' using errcode='42501';end if;
 insert into erp_private.client_sessions(session_id,account_id,generation) values(p_session,a.id,a.generation) on conflict(session_id) do nothing;
 if not exists(select 1 from erp_private.client_sessions where session_id=p_session and account_id=a.id and generation=a.generation and revoked_at is null and expires_at>now()) then raise exception 'Lejárt munkamenet.' using errcode='42501';end if;
 update erp_private.client_accounts set failures=0,locked_until=null where id=a.id;end$$;
create function public.erp_client_session_check(p_user uuid,p_session uuid) returns void language plpgsql stable security definer set search_path='' as $$begin
 if exists(select 1 from erp_private.client_accounts where auth_user_id=p_user) then perform erp_private.require_client_session(p_user,p_session);end if;end$$;
create function public.erp_client_recover(p_email text) returns void language plpgsql security definer set search_path='' as $$begin
 insert into erp_private.client_recovery_requests(account_id) select id from erp_private.client_accounts where login_email=lower(btrim(p_email)) and active and auth_user_id is not null
 on conflict(account_id) where handled_at is null do nothing;end$$;
-- Csak megbízható kiszolgálónak: szűrt címkör, publikált verzió, belső adat az ügyfélböngészőbe innen sem juthat közvetlenül.
create function public.erp_client_portal(p_user uuid,p_session uuid,p_quote uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$declare a erp_private.client_accounts;begin
 a:=erp_private.require_client_session(p_user,p_session);
 return jsonb_build_object('name',(select display_name from erp.persons where organization_id=a.organization_id and id=a.person_id),'organization_id',a.organization_id,
 'sites',coalesce((select jsonb_agg(jsonb_build_object('id',s.source_location_id,'address',w.address)) from erp.client_site_access s join erp.work_sites w on w.organization_id=s.organization_id and w.source_location_id=s.source_location_id where s.account_id=a.id and s.active),'[]'),
 'projects',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'work_type',p.work_type,'status',p.work_status,'address',p.site_address,'location_id',p.source_location_id,'scheduled_date',p.scheduled_date,'quote_id',p.accepted_quote_id,'updated_at',p.updated_at) order by p.created_at desc) from erp.garden_projects p where p.organization_id=a.organization_id and p.work_status<>'preparation' and exists(select 1 from erp.client_site_access s where s.account_id=a.id and s.active and s.source_customer_id=p.source_customer_id and s.source_location_id=p.source_location_id)),'[]'),
 'quotes',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'number',q.number,'status',case when q.status in ('draft','ready') then 'sent' else q.status end,'title',v.input->>'title','date',e.created_at,'version',v.version,'customer',v.customer,'calculation',v.calculation) order by e.created_at desc)
 from erp.quotes q join lateral(select qe.version,qe.created_at from erp.quote_events qe where qe.organization_id=q.organization_id and qe.quote_id=q.id and qe.event in ('manual_send_confirmed','mail_sent') order by qe.created_at desc,qe.version desc limit 1)e on true join erp.quote_versions v on v.organization_id=q.organization_id and v.quote_id=q.id and v.version=e.version
 where q.organization_id=a.organization_id and (p_quote is null or q.id=p_quote) and exists(select 1 from erp.client_site_access s where s.account_id=a.id and s.active and s.source_customer_id=q.source_customer_id and s.source_location_id=q.source_location_id)),'[]'));
 end$$;
set local role erp_api;
create or replace function public.erp_session() returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 select jsonb_agg(jsonb_build_object('organization_id',o.id,'organization_name',o.name,'person_id',erp_private.current_person(o.id),'is_office',erp_private.is_office(o.id),'is_client',exists(select 1 from erp.person_roles r where r.organization_id=o.id and r.person_id=erp_private.current_person(o.id) and r.role='client' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now())))) into result from erp.organizations o;
 if result is null then raise exception 'Nincs aktív ERP-hozzáférésed.' using errcode='42501';end if;return result;end$$;
reset role;
-- Mindegyik új admin/adatlekérő funkció kizárólag a szerver service_role-jával hívható.
do $$declare f record;begin for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('erp_client_manage','erp_client_admin_list','erp_client_issue','erp_client_claim','erp_client_auth_lookup','erp_client_finish','erp_client_login_target','erp_client_session_open','erp_client_session_check','erp_client_recover','erp_client_portal') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to service_role',f.signature);end loop;end$$;
revoke create on schema public from erp_api;revoke create on schema erp_private from erp_identity;
revoke erp_identity,erp_api from postgres granted by postgres;
commit;
