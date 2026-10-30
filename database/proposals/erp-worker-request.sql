-- Az ERP saját személyfelvételének ismétlésvédelme.
begin;
grant erp_api to postgres;
grant create on schema public to erp_api;
alter table erp.persons add column create_request_id uuid;
alter table erp.persons add constraint persons_create_request unique(organization_id,create_request_id);
create function public.erp_create_worker_request(p_org uuid,p_name text,p_request uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare person uuid; previous_name text;
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 if p_request is null then raise exception 'Hiányzó műveletazonosító.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_org::text||':worker:'||p_request::text,0));
 select p.id,p.display_name into person,previous_name from erp.persons p where p.organization_id=p_org and p.create_request_id=p_request;
 if found then
  if previous_name is distinct from btrim(p_name) then raise exception 'A műveletazonosító más adathoz tartozik.' using errcode='22023';end if;
  return person;
 end if;
 insert into erp.persons(organization_id,display_name,create_request_id)
 values(p_org,btrim(p_name),p_request) returning id into person;
 insert into erp.person_roles(organization_id,person_id,role) values(p_org,person,'worker');
 return person;
end $$;
alter function public.erp_create_worker_request(uuid,text,uuid) owner to erp_api;
revoke all on function public.erp_create_worker_request(uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.erp_create_worker_request(uuid,text,uuid) to authenticated;
revoke create on schema public from erp_api;
revoke erp_api from postgres;
commit;
