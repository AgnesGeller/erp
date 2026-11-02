-- Csak ERP-szövegek és fájlmetaadatok. Nincs Storage-bucket vagy fájlfeltöltés.
begin;
do $$begin
 if not exists(select 1 from pg_auth_members m join pg_roles r on r.oid=m.roleid join pg_roles u on u.oid=m.member where r.rolname='erp_api' and u.rolname='postgres' and m.grantor=(select oid from pg_roles where rolname=current_user)) then
  grant erp_api to postgres with set true, inherit false granted by postgres;perform set_config('erp.survey_granted_membership','yes',true);
 end if;
 if not has_schema_privilege('erp_api','public','CREATE') then
  grant create on schema public to erp_api;perform set_config('erp.survey_granted_create','yes',true);
 end if;
end$$;
create table erp.surveys(
 id uuid not null,organization_id uuid not null references erp.organizations(id),
 source_customer_id uuid not null,source_location_id uuid not null,customer_name text not null,site_address text not null,
 document jsonb not null check(jsonb_typeof(document)='object' and octet_length(document::text)<=240000),
 revision integer not null check(revision>0),created_by uuid not null,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),
 primary key(organization_id,id),foreign key(organization_id,source_location_id,source_customer_id) references erp.work_sites(organization_id,source_location_id,source_customer_id)
);
create index surveys_customer_time on erp.surveys(organization_id,source_customer_id,updated_at desc);
create table erp.survey_versions(
 organization_id uuid not null,survey_id uuid not null,revision integer not null,document jsonb not null,
 request_id uuid not null,actor uuid not null,created_at timestamptz not null default clock_timestamp(),
 primary key(organization_id,survey_id,revision),unique(organization_id,request_id),foreign key(organization_id,survey_id) references erp.surveys(organization_id,id)
);
alter table erp.surveys enable row level security;alter table erp.surveys force row level security;
alter table erp.survey_versions enable row level security;alter table erp.survey_versions force row level security;
revoke all on erp.surveys,erp.survey_versions from public,anon,authenticated,service_role;
grant select on erp.surveys,erp.survey_versions to erp_api;
create policy surveys_office on erp.surveys for select to erp_api using(erp_private.is_office(organization_id));
create policy survey_versions_office on erp.survey_versions for select to erp_api using(erp_private.is_office(organization_id));
create function public.erp_surveys_list(p_org uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(s)) from(select id,customer_name,site_address,revision,updated_at,document->>'title' as title,document->>'work_type' as work_type from erp.surveys where organization_id=p_org order by updated_at desc limit 1000)s),'[]');
end$$;
alter function public.erp_surveys_list(uuid) owner to erp_api;
set local role erp_api;
revoke all on function public.erp_surveys_list(uuid) from public,anon,service_role;
grant execute on function public.erp_surveys_list(uuid) to authenticated;
reset role;
create function public.erp_survey_get(p_org uuid,p_id uuid,p_version integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare s erp.surveys;d jsonb;
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 select * into s from erp.surveys where organization_id=p_org and id=p_id;
 if not found then raise exception 'A felmérés nem érhető el.' using errcode='22023';end if;
 d:=s.document;
 if p_version is not null then select document into d from erp.survey_versions where organization_id=p_org and survey_id=p_id and revision=p_version;if not found then raise exception 'A változat nem érhető el.' using errcode='22023';end if;end if;
 return jsonb_build_object('id',s.id,'revision',s.revision,'document',d,'customer_name',s.customer_name,'site_address',s.site_address,'updated_at',s.updated_at,
 'history',coalesce((select jsonb_agg(jsonb_build_object('revision',v.revision,'created_at',v.created_at) order by v.revision desc) from erp.survey_versions v where v.organization_id=p_org and v.survey_id=p_id),'[]'),
 'file_storage','local-only');
end$$;
alter function public.erp_survey_get(uuid,uuid,integer) owner to erp_api;
set local role erp_api;
revoke all on function public.erp_survey_get(uuid,uuid,integer) from public,anon,service_role;
grant execute on function public.erp_survey_get(uuid,uuid,integer) to authenticated;
reset role;
create function public.erp_survey_save(p_org uuid,p_actor uuid,p_id uuid,p_request uuid,p_revision integer,p_document jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare old erp.surveys;prior erp.survey_versions;site erp.work_sites;cid uuid;lid uuid;next_revision integer;part jsonb;m jsonb;ext text;path text;
begin
 perform erp_private.require_customer_office(p_org,p_actor);
 if p_id is null or p_request is null or p_revision is null or p_revision<0 or jsonb_typeof(p_document) is distinct from 'object' or octet_length(p_document::text)>240000 then raise exception 'Érvénytelen felmérés.' using errcode='22023';end if;
 if coalesce(length(btrim(p_document->>'title')),0) not between 1 and 200 or (p_document->>'work_type') is null or p_document->>'work_type' not in ('construction','maintenance') or jsonb_typeof(p_document->'sections') is distinct from 'array' or jsonb_array_length(p_document->'sections') not between 1 and 100 then raise exception 'Hiányos felmérés.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_org::text||p_request::text,0));
 select * into prior from erp.survey_versions where organization_id=p_org and request_id=p_request;
 if found then
  if prior.survey_id is distinct from p_id or prior.revision<>p_revision+1 or prior.document is distinct from p_document or prior.actor<>p_actor then raise exception 'A mentési kérés megváltozott.' using errcode='40001';end if;
  return jsonb_build_object('id',p_id,'revision',prior.revision);
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_org::text||p_id::text,0));
 select * into old from erp.surveys where organization_id=p_org and id=p_id for update;
 if coalesce(old.revision,0)<>p_revision then raise exception 'A felmérést másik eszköz módosította.' using errcode='40001';end if;
 cid:=(p_document->>'customer_id')::uuid;lid:=(p_document->>'location_id')::uuid;
 select * into site from erp.work_sites where organization_id=p_org and source_location_id=lid and source_customer_id=cid and source_active and source_approved and checked_at>clock_timestamp()-interval '2 minutes';
 if not found then raise exception 'Ellenőrzött, aktív munkavégzési cím szükséges.' using errcode='22023';end if;
 if old.id is not null and (old.source_customer_id,old.source_location_id) is distinct from (cid,lid) then raise exception 'Az ügyfél és cím nem cserélhető.' using errcode='22023';end if;
 next_revision:=p_revision+1;
 insert into erp.surveys(id,organization_id,source_customer_id,source_location_id,customer_name,site_address,document,revision,created_by)
 values(p_id,p_org,cid,lid,(select p.display_name from erp.persons p join erp.customer_profiles c on c.organization_id=p.organization_id and c.person_id=p.id where c.organization_id=p_org and c.source_customer_id=cid),site.address,p_document,next_revision,p_actor)
 on conflict(organization_id,id) do update set document=excluded.document,revision=excluded.revision,updated_at=clock_timestamp();
 insert into erp.survey_versions(organization_id,survey_id,revision,document,request_id,actor) values(p_org,p_id,next_revision,p_document,p_request,p_actor);
 return jsonb_build_object('id',p_id,'revision',next_revision);
end$$;
revoke all on function public.erp_survey_save(uuid,uuid,uuid,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.erp_survey_save(uuid,uuid,uuid,uuid,integer,jsonb) to service_role;
do $$begin
 if current_setting('erp.survey_granted_create',true)='yes' then revoke create on schema public from erp_api;end if;
 if current_setting('erp.survey_granted_membership',true)='yes' then revoke erp_api from postgres granted by postgres;end if;
end$$;
commit;
