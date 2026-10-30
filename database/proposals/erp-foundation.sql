-- A 20261030145143 erp_foundation_access migráció megőrzött forrása.
-- Supabase MCP apply_migration telepítette; az identity és worker-request javítások utána szükségesek.
begin;
create role erp_identity nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
create role erp_api nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
grant erp_identity,erp_api to postgres;
create schema erp;
create schema erp_private;
grant create on schema public to erp_api;
grant create on schema erp_private to erp_identity;
revoke all on schema erp, erp_private from public, anon, authenticated, service_role;
grant usage on schema erp, erp_private, auth to erp_api, erp_identity;
grant execute on function auth.uid() to erp_api, erp_identity;

create table erp.organizations (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(btrim(name)) between 1 and 150)
);
create table erp.persons (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references erp.organizations(id),
 display_name text not null check (length(btrim(display_name)) between 1 and 150),
 active boolean not null default true,
 revision bigint not null default 1 check (revision>0),
 updated_at timestamptz not null default now(),
 unique(organization_id,id)
);
create table erp.user_accounts (
 organization_id uuid not null references erp.organizations(id),
 auth_user_id uuid not null references auth.users(id) on delete cascade,
 person_id uuid not null,
 active boolean not null default true,
 primary key(organization_id,auth_user_id),
 unique(organization_id,person_id),
 foreign key(organization_id,person_id) references erp.persons(organization_id,id)
);
create table erp.person_roles (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 person_id uuid not null,
 role text not null check(role in ('office','worker','client')),
 valid_from timestamptz not null default now(),
 valid_until timestamptz,
 revoked_at timestamptz,
 check(valid_until is null or valid_until>valid_from),
 foreign key(organization_id,person_id) references erp.persons(organization_id,id)
);
create index person_roles_lookup on erp.person_roles(organization_id,person_id,role) where revoked_at is null;
create table erp.garden_projects (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references erp.organizations(id),
 name text not null check(length(btrim(name)) between 1 and 200),
 active boolean not null default true,
 revision bigint not null default 1,
 unique(organization_id,id)
);
create table erp.project_assignments (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 project_id uuid not null,
 person_id uuid not null,
 role text not null check(role in ('crew_lead','construction_lead','worker')),
 valid_from timestamptz not null,
 valid_until timestamptz,
 revoked_at timestamptz,
 created_by uuid not null,
 created_at timestamptz not null default now(),
 revision bigint not null default 1,
 check(valid_until is null or valid_until>valid_from),
 foreign key(organization_id,project_id) references erp.garden_projects(organization_id,id),
 foreign key(organization_id,person_id) references erp.persons(organization_id,id)
);
create index assignments_access on erp.project_assignments(organization_id,person_id,project_id,valid_from) where revoked_at is null;
create index assignments_project on erp.project_assignments(organization_id,project_id,valid_from);
create table erp.audit_events (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references erp.organizations(id),
 actor_id uuid,
 happened_at timestamptz not null default now(),
 entity text not null,
 entity_id uuid not null,
 operation text not null,
 before_data jsonb,
 after_data jsonb
);
create index audit_org_time on erp.audit_events(organization_id,happened_at desc);
do $$ declare t text; begin
 foreach t in array array['organizations','persons','user_accounts','person_roles','garden_projects','project_assignments','audit_events'] loop
  execute format('alter table erp.%I enable row level security',t);
  execute format('alter table erp.%I force row level security',t);
  execute format('revoke all on erp.%I from public,anon,authenticated,service_role',t);
 end loop;
end $$;
grant select on erp.user_accounts,erp.persons,erp.person_roles to erp_identity;
grant select on all tables in schema erp to erp_api;
grant insert,update on erp.persons,erp.garden_projects,erp.project_assignments to erp_api;
grant insert on erp.person_roles,erp.audit_events to erp_api;

-- Az azonosító szerep csak a kérés küldőjét és annak saját tagságát olvashatja.
create policy identity_account on erp.user_accounts for select to erp_identity
 using(auth_user_id=(select auth.uid()) and active);
create policy identity_person on erp.persons for select to erp_identity
 using(exists(select 1 from erp.user_accounts a where a.organization_id=persons.organization_id and a.person_id=persons.id));
create policy identity_roles on erp.person_roles for select to erp_identity
 using(exists(select 1 from erp.user_accounts a where a.organization_id=person_roles.organization_id and a.person_id=person_roles.person_id));
create function erp_private.current_person(p_org uuid) returns uuid
 language sql stable security definer set search_path='' as $$
 select a.person_id from erp.user_accounts a join erp.persons p
 on p.organization_id=a.organization_id and p.id=a.person_id
 where a.organization_id=p_org and a.active and p.active and a.auth_user_id=auth.uid()
 $$;
create function erp_private.is_office(p_org uuid) returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from erp.person_roles r where r.organization_id=p_org
 and r.person_id=erp_private.current_person(p_org) and r.role='office' and r.revoked_at is null
 and r.valid_from<=now() and (r.valid_until is null or now()<r.valid_until))
 $$;
alter function erp_private.current_person(uuid) owner to erp_identity;
alter function erp_private.is_office(uuid) owner to erp_identity;
revoke all on function erp_private.current_person(uuid),erp_private.is_office(uuid) from public,anon,authenticated,service_role;
grant execute on function erp_private.current_person(uuid),erp_private.is_office(uuid) to erp_api,erp_identity;

create policy org_read on erp.organizations for select to erp_api using(erp_private.current_person(id) is not null);
create policy people_read on erp.persons for select to erp_api using(erp_private.is_office(organization_id) or id=erp_private.current_person(organization_id));
create policy people_insert on erp.persons for insert to erp_api with check(erp_private.is_office(organization_id));
create policy people_update on erp.persons for update to erp_api using(erp_private.is_office(organization_id)) with check(erp_private.is_office(organization_id));
create policy accounts_read on erp.user_accounts for select to erp_api using(erp_private.is_office(organization_id) or person_id=erp_private.current_person(organization_id));
create policy roles_read on erp.person_roles for select to erp_api using(erp_private.is_office(organization_id) or person_id=erp_private.current_person(organization_id));
create policy roles_insert on erp.person_roles for insert to erp_api with check(erp_private.is_office(organization_id) and role='worker');
create policy assignments_read on erp.project_assignments for select to erp_api
 using(erp_private.is_office(organization_id) or (person_id=erp_private.current_person(organization_id) and revoked_at is null and valid_from<=now() and (valid_until is null or now()<valid_until)));
create policy assignments_insert on erp.project_assignments for insert to erp_api with check(erp_private.is_office(organization_id) and created_by=(select auth.uid()));
create policy assignments_update on erp.project_assignments for update to erp_api using(erp_private.is_office(organization_id)) with check(erp_private.is_office(organization_id));
create policy projects_read on erp.garden_projects for select to erp_api
 using(erp_private.is_office(organization_id) or (active and exists(select 1 from erp.project_assignments a where a.organization_id=garden_projects.organization_id and a.project_id=garden_projects.id and a.person_id=erp_private.current_person(garden_projects.organization_id))));
create policy projects_insert on erp.garden_projects for insert to erp_api with check(erp_private.is_office(organization_id));
create policy projects_update on erp.garden_projects for update to erp_api using(erp_private.is_office(organization_id)) with check(erp_private.is_office(organization_id));
create policy audit_read on erp.audit_events for select to erp_api using(erp_private.is_office(organization_id));
create policy audit_insert on erp.audit_events for insert to erp_api with check(erp_private.is_office(organization_id) and actor_id=(select auth.uid()));

create function erp_private.audit_change() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into erp.audit_events(organization_id,actor_id,entity,entity_id,operation,before_data,after_data)
 values(new.organization_id,auth.uid(),tg_table_name,new.id,tg_op,
 case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
revoke all on function erp_private.audit_change() from public,anon,authenticated,service_role;
create trigger assignment_audit after insert or update on erp.project_assignments for each row execute function erp_private.audit_change();
create trigger person_audit after insert or update on erp.persons for each row execute function erp_private.audit_change();
create trigger project_audit after insert or update on erp.garden_projects for each row execute function erp_private.audit_change();

create function public.erp_session() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 select jsonb_agg(jsonb_build_object('organization_id',o.id,'organization_name',o.name,'person_id',erp_private.current_person(o.id),'is_office',erp_private.is_office(o.id))) into result from erp.organizations o;
 if result is null then raise exception 'Nincs aktív ERP-hozzáférésed.' using errcode='42501'; end if;
 return result;
end $$;
create function public.erp_list_people(p_org uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(p) order by p.display_name) from erp.persons p where p.organization_id=p_org),'[]');
end $$;
create function public.erp_create_worker(p_org uuid,p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare person uuid;
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 insert into erp.persons(organization_id,display_name) values(p_org,btrim(p_name)) returning id into person;
 insert into erp.person_roles(organization_id,person_id,role) values(p_org,person,'worker');
 return person;
end $$;
create function public.erp_create_project(p_org uuid,p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare project uuid;
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 insert into erp.garden_projects(organization_id,name) values(p_org,btrim(p_name)) returning id into project;
 return project;
end $$;
create function public.erp_list_projects(p_org uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if erp_private.current_person(p_org) is null then raise exception 'Nincs aktív ERP-hozzáférésed.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(p) order by p.name) from erp.garden_projects p where p.organization_id=p_org),'[]');
end $$;
create function public.erp_list_assignments(p_org uuid,p_project uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from erp.garden_projects p where p.organization_id=p_org and p.id=p_project) then raise exception 'A munka nem elérhető.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(a) order by a.valid_from) from erp.project_assignments a where a.organization_id=p_org and a.project_id=p_project),'[]');
end $$;
create function public.erp_assign_project_role(p_org uuid,p_project uuid,p_person uuid,p_role text,p_from timestamptz,p_until timestamptz default null) returns uuid language plpgsql security definer set search_path='' as $$
declare assignment uuid;
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 if p_role is null or p_role not in ('crew_lead','construction_lead','worker') or p_from is null or (p_until is not null and p_until<=p_from) then raise exception 'Érvénytelen szerepkör vagy időszak.' using errcode='22023';end if;
 -- Munkánkénti sorzár: a párhuzamos irodai mentések sem hoznak létre átfedő azonos megbízást.
 perform 1 from erp.garden_projects p where p.organization_id=p_org and p.id=p_project and p.active for update;
 if not found then raise exception 'A munka nem elérhető.' using errcode='42501';end if;
 if not exists(select 1 from erp.persons p join erp.person_roles r on r.organization_id=p.organization_id and r.person_id=p.id where p.organization_id=p_org and p.id=p_person and p.active and r.role in ('worker','office') and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or now()<r.valid_until)) then raise exception 'Aktív dolgozót válassz.' using errcode='22023';end if;
 if exists(select 1 from erp.project_assignments a where a.organization_id=p_org and a.project_id=p_project and a.person_id=p_person and a.role=p_role and a.revoked_at is null and tstzrange(a.valid_from,a.valid_until,'[)') && tstzrange(p_from,p_until,'[)')) then raise exception 'Erre az időszakra már van ilyen megbízás.' using errcode='23505';end if;
 insert into erp.project_assignments(organization_id,project_id,person_id,role,valid_from,valid_until,created_by)
 values(p_org,p_project,p_person,p_role,p_from,p_until,auth.uid()) returning id into assignment;
 return assignment;
end $$;
create function public.erp_revoke_assignment(p_org uuid,p_assignment uuid,p_revision bigint) returns void language plpgsql security definer set search_path='' as $$
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 update erp.project_assignments set revoked_at=clock_timestamp(),revision=revision+1
 where organization_id=p_org and id=p_assignment and revision=p_revision and revoked_at is null;
 if not found then raise exception 'A megbízás megváltozott vagy nem elérhető. Frissítsd a listát.' using errcode='40001';end if;
end $$;
-- Csak az itt létrehozott RPC-k jogait állítjuk; korábbi függvényhez nem nyúlunk.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('erp_session','erp_list_people','erp_create_worker','erp_create_project','erp_list_projects','erp_list_assignments','erp_assign_project_role','erp_revoke_assignment') loop
  execute format('alter function %s owner to erp_api',f.signature);
  execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
  execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end $$;
revoke create on schema public from erp_api;
revoke create on schema erp_private from erp_identity;
revoke erp_identity,erp_api from postgres;
commit;
