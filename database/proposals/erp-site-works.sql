-- Címhez kötött munkák: kizárólag ERP. Kertépítés elfogadott ajánlat nélkül nem indítható.
begin;
grant erp_api to postgres;
grant create on schema public to erp_api;
do $$begin if exists(select 1 from erp.garden_projects) then raise exception 'A meglévő munkák ellenőrzött megfeleltetése szükséges.';end if;end$$;
create table erp.work_sites(
 organization_id uuid not null,source_location_id uuid not null,source_customer_id uuid not null,
 address text not null check(length(btrim(address)) between 1 and 4000),label text not null default '',
 source_active boolean not null,source_approved boolean not null,checked_at timestamptz not null default clock_timestamp(),
 primary key(organization_id,source_location_id),unique(organization_id,source_location_id,source_customer_id),
 foreign key(organization_id,source_customer_id) references erp.customer_profiles(organization_id,source_customer_id)
);
create index work_sites_customer on erp.work_sites(organization_id,source_customer_id);
alter table erp.work_sites enable row level security;
alter table erp.work_sites force row level security;
revoke all on erp.work_sites from public,anon,authenticated,service_role;
grant select on erp.work_sites to erp_api;
create policy work_sites_office on erp.work_sites for select to erp_api using(erp_private.is_office(organization_id));
alter table erp.garden_projects
 add column source_customer_id uuid not null,add column source_location_id uuid not null,
 add column customer_name text not null,add column site_address text not null,
 add column work_status text not null default 'preparation',add column description text not null default '' check(length(description)<=4000),
 add column requested_date date,add column scheduled_date date,
 add column requested_people integer check(requested_people between 1 and 1000),
 add column requested_hours numeric(8,2) check(requested_hours>0 and requested_hours<=10000),
 add column creation_request uuid not null,add column creation_payload jsonb not null,
 add column created_by uuid not null,add column created_at timestamptz not null default clock_timestamp(),
 add column updated_at timestamptz not null default clock_timestamp(),
 add constraint work_creation_unique unique(organization_id,creation_request),
 add constraint work_site_link foreign key(organization_id,source_location_id,source_customer_id) references erp.work_sites(organization_id,source_location_id,source_customer_id),
 add constraint work_lifecycle check((work_type='construction' and work_status in ('preparation','cancelled')) or (work_type='maintenance' and work_status in ('requested','confirmed','cancelled'))),
 add constraint work_activity check(active=(work_status='confirmed')),
 add constraint confirmed_day check(work_status<>'confirmed' or scheduled_date is not null);
alter table erp.garden_projects alter column active set default false;
create index works_customer_site on erp.garden_projects(organization_id,source_customer_id,source_location_id,created_at desc);

create function public.erp_sync_work_sites(p_org uuid,p_actor uuid,p_customer jsonb,p_locations jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare source_id uuid; item jsonb;
begin
 perform erp_private.require_customer_office(p_org,p_actor);
 source_id:=(p_customer->>'id')::uuid;
 if source_id is null or (p_customer->>'active')::boolean is distinct from true or (p_customer->>'review_status') is distinct from 'approved' or nullif(p_customer->>'archived_at','') is not null then raise exception 'Aktív, jóváhagyott ügyfelet válassz.' using errcode='22023';end if;
 if jsonb_typeof(p_locations) is distinct from 'array' or jsonb_array_length(p_locations)>5000 then raise exception 'Érvénytelen címlista.' using errcode='22023';end if;
 perform public.erp_customer_sync(p_org,p_actor,jsonb_build_array(p_customer));
 for item in select value from jsonb_array_elements(p_locations) loop
  if (item->>'customer_id')::uuid is distinct from source_id then raise exception 'A cím másik ügyfélhez tartozik.' using errcode='22023';end if;
  insert into erp.work_sites(organization_id,source_location_id,source_customer_id,address,label,source_active,source_approved)
  values(p_org,(item->>'id')::uuid,source_id,btrim(item->>'address'),coalesce(item->>'label',''),coalesce((item->>'active')::boolean,false),coalesce(item->>'review_status'='approved',false))
  on conflict(organization_id,source_location_id) do update set address=excluded.address,label=excluded.label,source_active=excluded.source_active,source_approved=excluded.source_approved,checked_at=clock_timestamp()
  where erp.work_sites.source_customer_id=excluded.source_customer_id;
  if not found then raise exception 'A címazonosító másik ügyfélhez tartozik.' using errcode='22023';end if;
 end loop;
 update erp.work_sites s set source_active=false,checked_at=clock_timestamp() where s.organization_id=p_org and s.source_customer_id=source_id and not exists(select 1 from jsonb_array_elements(p_locations) l where (l->>'id')::uuid=s.source_location_id);
 return coalesce((select jsonb_agg(jsonb_build_object('id',s.source_location_id,'address',s.address,'label',s.label) order by s.address) from erp.work_sites s where s.organization_id=p_org and s.source_customer_id=source_id and s.source_active and s.source_approved),'[]'::jsonb);
end $$;
revoke all on function public.erp_sync_work_sites(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.erp_sync_work_sites(uuid,uuid,jsonb,jsonb) to service_role;

create function erp_private.protect_work_binding() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if (new.organization_id,new.source_customer_id,new.source_location_id,new.customer_name,new.site_address,new.work_type,new.creation_request,new.creation_payload,new.created_by,new.created_at) is distinct from (old.organization_id,old.source_customer_id,old.source_location_id,old.customer_name,old.site_address,old.work_type,old.creation_request,old.creation_payload,old.created_by,old.created_at) then raise exception 'A munka ügyfél- és címkapcsolata nem írható át.' using errcode='22023';end if;
 return new;
end $$;
revoke all on function erp_private.protect_work_binding() from public,anon,authenticated,service_role;
create trigger work_binding_guard before update on erp.garden_projects for each row execute function erp_private.protect_work_binding();

create function public.erp_create_site_work(p_org uuid,p_request uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare old_work erp.garden_projects;site erp.work_sites;customer_name text;work_id uuid;work_type text;clean_name text;
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 if p_request is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Érvénytelen munkaadatok.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_org::text||p_request::text,0));
 select * into old_work from erp.garden_projects where organization_id=p_org and creation_request=p_request;
 if found then if old_work.creation_payload<>p_data then raise exception 'A megkezdett mentés adatai eltérnek.' using errcode='40001';end if;return old_work.id;end if;
 work_type:=p_data->>'work_type';clean_name:=btrim(p_data->>'name');
 if work_type is null or work_type not in ('construction','maintenance') or clean_name is null or length(clean_name) not between 2 and 200 or length(coalesce(p_data->>'description',''))>4000 then raise exception 'Ellenőrizd a munka nevét, típusát és leírását.' using errcode='22023';end if;
 select * into site from erp.work_sites where organization_id=p_org and source_location_id=(p_data->>'location_id')::uuid and source_customer_id=(p_data->>'customer_id')::uuid and source_active and source_approved and checked_at>clock_timestamp()-interval '2 minutes';
 if not found then raise exception 'Frissítsd az ügyfél munkavégzési címeit.' using errcode='22023';end if;
 select p.display_name into customer_name from erp.customer_profiles c join erp.persons p on p.organization_id=c.organization_id and p.id=c.person_id where c.organization_id=p_org and c.source_customer_id=site.source_customer_id;
 insert into erp.garden_projects(organization_id,name,work_type,active,work_status,source_customer_id,source_location_id,customer_name,site_address,description,requested_date,requested_people,requested_hours,creation_request,creation_payload,created_by)
 values(p_org,clean_name,work_type,false,case when work_type='construction' then 'preparation' else 'requested' end,site.source_customer_id,site.source_location_id,customer_name,site.address,coalesce(p_data->>'description',''),nullif(p_data->>'requested_date','')::date,nullif(p_data->>'people','')::integer,nullif(p_data->>'hours','')::numeric,p_request,p_data,erp_private.request_user_id()) returning id into work_id;
 return work_id;
end $$;
alter function public.erp_create_site_work(uuid,uuid,jsonb) owner to erp_api;
revoke all on function public.erp_create_site_work(uuid,uuid,jsonb) from public,anon,service_role;
grant execute on function public.erp_create_site_work(uuid,uuid,jsonb) to authenticated;
revoke execute on function public.erp_create_project(uuid,text) from authenticated;

create function public.erp_list_site_works(p_org uuid,p_customer uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'work_type',w.work_type,'work_status',w.work_status,'customer_id',w.source_customer_id,'location_id',w.source_location_id,'customer_name',w.customer_name,'site_address',w.site_address,'description',w.description,'requested_date',w.requested_date,'scheduled_date',w.scheduled_date,'people',w.requested_people,'hours',w.requested_hours,'revision',w.revision,'created_at',w.created_at) order by w.created_at desc,w.id) from erp.garden_projects w where w.organization_id=p_org and (p_customer is null or w.source_customer_id=p_customer)),'[]'::jsonb);
end $$;
alter function public.erp_list_site_works(uuid,uuid) owner to erp_api;
revoke all on function public.erp_list_site_works(uuid,uuid) from public,anon,service_role;
grant execute on function public.erp_list_site_works(uuid,uuid) to authenticated;

create function public.erp_site_work_action(p_org uuid,p_work uuid,p_revision bigint,p_action text,p_day date default null) returns void language plpgsql security definer set search_path='' as $$
declare work erp.garden_projects;
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 select * into work from erp.garden_projects where organization_id=p_org and id=p_work for update;
 if not found then raise exception 'A munka nem érhető el.' using errcode='42501';end if;
 if work.revision is distinct from p_revision then raise exception 'A munka megváltozott. Frissítsd a listát.' using errcode='40001';end if;
 if p_action='confirm' and work.work_type='maintenance' and work.work_status='requested' and p_day is not null then
  if not exists(select 1 from erp.work_sites s where s.organization_id=p_org and s.source_location_id=work.source_location_id and s.source_customer_id=work.source_customer_id and s.source_active and s.source_approved and s.checked_at>clock_timestamp()-interval '2 minutes') then raise exception 'Frissítsd a munkavégzési címet.' using errcode='22023';end if;
  update erp.garden_projects set work_status='confirmed',active=true,scheduled_date=p_day,revision=revision+1,updated_at=clock_timestamp() where organization_id=p_org and id=p_work;
 elsif p_action='cancel' and work.work_status in ('preparation','requested') then
  update erp.garden_projects set work_status='cancelled',active=false,revision=revision+1,updated_at=clock_timestamp() where organization_id=p_org and id=p_work;
 else raise exception 'Ez az állapotváltás nem engedélyezett. Kertépítéshez elfogadott árajánlat szükséges.' using errcode='22023';end if;
end $$;
alter function public.erp_site_work_action(uuid,uuid,bigint,text,date) owner to erp_api;
revoke all on function public.erp_site_work_action(uuid,uuid,bigint,text,date) from public,anon,service_role;
grant execute on function public.erp_site_work_action(uuid,uuid,bigint,text,date) to authenticated;
-- A dolgozói munkaválasztó nem kapja meg a belső mentési payloadot vagy az irodai metaadatokat.
create or replace function public.erp_list_projects(p_org uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'active',p.active,'work_type',p.work_type) order by p.name),'[]'::jsonb) from erp.garden_projects p where p.organization_id=p_org
$$;
revoke create on schema public from erp_api;
revoke erp_api from postgres;
commit;