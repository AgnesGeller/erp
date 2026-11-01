-- Az ERP saját ügyfélkapcsolatai. A Munkalap objektumait NEM módosítja.
begin;
grant erp_api to postgres;
grant create on schema public to erp_api;
create table erp.customer_profiles (
 organization_id uuid not null references erp.organizations(id),
 source_customer_id uuid not null,
 person_id uuid not null,
 billing_name text not null default '' check(length(billing_name)<=200),
 billing_address text not null default '' check(length(billing_address)<=500),
 internal_notes text not null default '' check(length(internal_notes)<=4000),
 revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default now(),
 primary key(organization_id,source_customer_id),
 unique(organization_id,person_id),
 foreign key(organization_id,person_id) references erp.persons(organization_id,id)
);
create table erp_private.customer_requests (
 organization_id uuid not null references erp.organizations(id),
 request_id uuid not null,
 actor_id uuid not null references auth.users(id),
 source_customer_id uuid not null default gen_random_uuid(),
 source_location_id uuid not null default gen_random_uuid(),
 payload jsonb not null,
 status text not null default 'pending' check(status in ('pending','complete')),
 created_at timestamptz not null default clock_timestamp(),
 completed_at timestamptz,
 primary key(organization_id,request_id),
 unique(source_customer_id),unique(source_location_id)
);
create index customer_requests_pending on erp_private.customer_requests(organization_id,created_at) where status='pending';
alter table erp.customer_profiles enable row level security;
alter table erp.customer_profiles force row level security;
alter table erp_private.customer_requests enable row level security;
alter table erp_private.customer_requests force row level security;
revoke all on erp.customer_profiles,erp_private.customer_requests from public,anon,authenticated,service_role;
grant select,update on erp.customer_profiles to erp_api;
grant select,insert on erp_private.customer_requests to erp_api;
create policy customer_profiles_office_read on erp.customer_profiles for select to erp_api using(erp_private.is_office(organization_id));
create policy customer_profiles_office_update on erp.customer_profiles for update to erp_api using(erp_private.is_office(organization_id)) with check(erp_private.is_office(organization_id));
create policy customer_requests_office_read on erp_private.customer_requests for select to erp_api using(erp_private.is_office(organization_id));
create policy customer_requests_office_insert on erp_private.customer_requests for insert to erp_api with check(erp_private.is_office(organization_id) and actor_id=erp_private.request_user_id());

create function erp_private.require_customer_office(p_org uuid,p_actor uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if p_actor is null or not exists(select 1 from erp.user_accounts a join erp.persons p on p.organization_id=a.organization_id and p.id=a.person_id join erp.person_roles r on r.organization_id=a.organization_id and r.person_id=a.person_id where a.organization_id=p_org and a.auth_user_id=p_actor and a.active and p.active and r.role='office' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now())) then
 raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
end $$;
revoke all on function erp_private.require_customer_office(uuid,uuid) from public,anon,authenticated,service_role;

create function public.erp_customer_sync(p_org uuid,p_actor uuid,p_items jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item jsonb; person uuid; source_id uuid;
begin
 perform erp_private.require_customer_office(p_org,p_actor);
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)>5000 then raise exception 'Érvénytelen ügyféllista.' using errcode='22023';end if;
 -- A naplóban az ERP-kiszolgáló által igazolt tényleges irodai személy szerepel.
 perform set_config('request.jwt.claim.sub',p_actor::text,true);
 for item in select value from jsonb_array_elements(p_items) loop
  source_id:=(item->>'id')::uuid;
  if source_id is null or length(btrim(item->>'full_name')) not between 1 and 150 then raise exception 'Ellenőrizd az ügyfél nevét.' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_org::text||source_id::text,0));
  select person_id into person from erp.customer_profiles where organization_id=p_org and source_customer_id=source_id;
  if person is null then
   insert into erp.persons(organization_id,display_name) values(p_org,btrim(item->>'full_name')) returning id into person;
   insert into erp.person_roles(organization_id,person_id,role) values(p_org,person,'client');
   insert into erp.customer_profiles(organization_id,source_customer_id,person_id) values(p_org,source_id,person);
  else
   update erp.persons set display_name=btrim(item->>'full_name'),revision=revision+1,updated_at=clock_timestamp() where organization_id=p_org and id=person and display_name is distinct from btrim(item->>'full_name');
  end if;
 end loop;
 return coalesce((select jsonb_agg(to_jsonb(c)) from erp.customer_profiles c where c.organization_id=p_org),'[]'::jsonb);
end $$;
revoke all on function public.erp_customer_sync(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.erp_customer_sync(uuid,uuid,jsonb) to service_role;

create function public.erp_customer_begin(p_org uuid,p_request uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare saved erp_private.customer_requests; field text; limit_length integer;
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 if p_request is null or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>12000 then raise exception 'Érvénytelen ügyféladatok.' using errcode='22023';end if;
 foreach field in array array['full_name','address','customer_type','contact_name','email','phone','tax_number','billing_name','billing_address','internal_notes'] loop
  limit_length:=case when field in ('address','billing_address') then 500 when field='internal_notes' then 4000 when field='email' then 254 when field='phone' then 40 when field='tax_number' then 40 when field='billing_name' then 200 else 150 end;
  if jsonb_typeof(p_payload->field) is distinct from 'string' or length(p_payload->>field)>limit_length then raise exception 'Érvénytelen ügyféladatok.' using errcode='22023';end if;
 end loop;
 if length(btrim(p_payload->>'full_name'))<2 or length(btrim(p_payload->>'address'))<3 or p_payload->>'customer_type' not in ('person','company','condominium') or (select count(*) from jsonb_object_keys(p_payload))<>10 then raise exception 'Ellenőrizd az ügyfél nevét, típusát és címét.' using errcode='22023';end if;
 insert into erp_private.customer_requests(organization_id,request_id,actor_id,payload) values(p_org,p_request,erp_private.request_user_id(),p_payload) on conflict do nothing;
 select * into saved from erp_private.customer_requests where organization_id=p_org and request_id=p_request;
 if saved.payload<>p_payload then raise exception 'A megkezdett mentés adatai eltérnek. Folytasd az eredeti mentést.' using errcode='40001';end if;
 return to_jsonb(saved);
end $$;
alter function public.erp_customer_begin(uuid,uuid,jsonb) owner to erp_api;
revoke all on function public.erp_customer_begin(uuid,uuid,jsonb) from public,anon,service_role;
grant execute on function public.erp_customer_begin(uuid,uuid,jsonb) to authenticated;

create function public.erp_customer_pending(p_org uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('request_id',r.request_id,'full_name',r.payload->>'full_name','created_at',r.created_at) order by r.created_at) from erp_private.customer_requests r where r.organization_id=p_org and r.status='pending'),'[]'::jsonb);
end $$;
alter function public.erp_customer_pending(uuid) owner to erp_api;
revoke all on function public.erp_customer_pending(uuid) from public,anon,service_role;
grant execute on function public.erp_customer_pending(uuid) to authenticated;

create function public.erp_customer_resume(p_org uuid,p_request uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 return (select to_jsonb(r) from erp_private.customer_requests r where r.organization_id=p_org and r.request_id=p_request);
end $$;
alter function public.erp_customer_resume(uuid,uuid) owner to erp_api;
revoke all on function public.erp_customer_resume(uuid,uuid) from public,anon,service_role;
grant execute on function public.erp_customer_resume(uuid,uuid) to authenticated;

create function public.erp_customer_finish(p_org uuid,p_actor uuid,p_request uuid) returns void language plpgsql security definer set search_path='' as $$
declare saved erp_private.customer_requests;
begin
 perform erp_private.require_customer_office(p_org,p_actor);
 select * into saved from erp_private.customer_requests where organization_id=p_org and request_id=p_request for update;
 if not found then raise exception 'A mentés nem található.' using errcode='22023';end if;
 if saved.status='complete' then return;end if;
 perform public.erp_customer_sync(p_org,p_actor,jsonb_build_array(jsonb_build_object('id',saved.source_customer_id,'full_name',saved.payload->>'full_name')));
 update erp.customer_profiles set billing_name=saved.payload->>'billing_name',billing_address=saved.payload->>'billing_address',internal_notes=saved.payload->>'internal_notes',revision=revision+1,updated_at=clock_timestamp() where organization_id=p_org and source_customer_id=saved.source_customer_id;
 update erp_private.customer_requests set status='complete',completed_at=clock_timestamp() where organization_id=p_org and request_id=p_request;
 insert into erp.audit_events(organization_id,actor_id,entity,entity_id,operation,after_data) values(p_org,p_actor,'customer_create',saved.source_customer_id,'COMPLETE',jsonb_build_object('request_id',p_request,'location_id',saved.source_location_id));
end $$;
revoke all on function public.erp_customer_finish(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.erp_customer_finish(uuid,uuid,uuid) to service_role;

create function public.erp_customer_profile_save(p_org uuid,p_customer uuid,p_revision bigint,p_billing_name text,p_billing_address text,p_notes text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 if p_billing_name is null or p_billing_address is null or p_notes is null or length(p_billing_name)>200 or length(p_billing_address)>500 or length(p_notes)>4000 then raise exception 'Ellenőrizd a számlázási adatokat.' using errcode='22023';end if;
 update erp.customer_profiles set billing_name=btrim(p_billing_name),billing_address=btrim(p_billing_address),internal_notes=btrim(p_notes),revision=revision+1,updated_at=clock_timestamp() where organization_id=p_org and source_customer_id=p_customer and revision=p_revision;
 if not found then raise exception 'Az adatlap megváltozott. Frissítsd a listát.' using errcode='40001';end if;
 insert into erp.audit_events(organization_id,actor_id,entity,entity_id,operation,after_data) values(p_org,erp_private.request_user_id(),'customer_profile',p_customer,'UPDATE',jsonb_build_object('billing_name',p_billing_name,'billing_address',p_billing_address,'internal_notes',p_notes));
end $$;
alter function public.erp_customer_profile_save(uuid,uuid,bigint,text,text,text) owner to erp_api;
revoke all on function public.erp_customer_profile_save(uuid,uuid,bigint,text,text,text) from public,anon,service_role;
grant execute on function public.erp_customer_profile_save(uuid,uuid,bigint,text,text,text) to authenticated;

-- A Személyek törzs közös; a meglévő munkatárs-választó továbbra is csak dolgozókat mutat.
create or replace function public.erp_list_people(p_org uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(p) order by p.display_name) from erp.persons p where p.organization_id=p_org and exists(select 1 from erp.person_roles r where r.organization_id=p_org and r.person_id=p.id and r.role in ('office','worker') and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now()))),'[]'::jsonb);
end $$;
revoke create on schema public from erp_api;
revoke erp_api from postgres;
commit;