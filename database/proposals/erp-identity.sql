-- Az ERP saját azonosítási segédfüggvénye a PostgREST által ellenőrzött JWT-ből.
-- Nem változtatja meg az auth sémát vagy más alkalmazás jogosultságait.
begin;
grant erp_identity,erp_api to postgres;
create function erp_private.request_user_id() returns uuid
language sql stable security invoker set search_path='' as $$
 select coalesce(
  nullif(current_setting('request.jwt.claim.sub',true),''),
  nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub'
 )::uuid
$$;
revoke all on function erp_private.request_user_id() from public,anon,authenticated,service_role;
grant execute on function erp_private.request_user_id() to erp_api,erp_identity;

create or replace function erp_private.current_person(p_org uuid) returns uuid
 language sql stable security definer set search_path='' as $$
 select a.person_id from erp.user_accounts a join erp.persons p
 on p.organization_id=a.organization_id and p.id=a.person_id
 where a.organization_id=p_org and a.active and p.active and a.auth_user_id=erp_private.request_user_id()
 $$;

create or replace function erp_private.audit_change() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into erp.audit_events(organization_id,actor_id,entity,entity_id,operation,before_data,after_data)
 values(new.organization_id,erp_private.request_user_id(),tg_table_name,new.id,tg_op,
 case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;

create or replace function public.erp_assign_project_role(p_org uuid,p_project uuid,p_person uuid,p_role text,p_from timestamptz,p_until timestamptz default null) returns uuid language plpgsql security definer set search_path='' as $$
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
 values(p_org,p_project,p_person,p_role,p_from,p_until,erp_private.request_user_id()) returning id into assignment;
 return assignment;
end $$;


alter policy identity_account on erp.user_accounts using(auth_user_id=(select erp_private.request_user_id()) and active);
alter policy assignments_insert on erp.project_assignments with check(erp_private.is_office(organization_id) and created_by=(select erp_private.request_user_id()));
alter policy audit_insert on erp.audit_events with check(erp_private.is_office(organization_id) and actor_id=(select erp_private.request_user_id()));
revoke erp_identity,erp_api from postgres;
commit;
