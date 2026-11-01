-- PDF + kiegészítés: kizárólag az ERP saját munkaszerepei.
begin;
grant erp_api to postgres;
grant create on schema public to erp_api;
alter table erp.garden_projects add column work_type text not null default 'construction' check(work_type in ('construction','maintenance'));
alter table erp.project_assignments drop constraint project_assignments_role_check;
-- Korábbi értékek csak a történeti sorok megőrzésére.
alter table erp.project_assignments add constraint project_assignments_role_check check(role in ('crew_lead','worker','construction_lead','maintenance_lead','construction_worker','gardener'));
create function erp_private.project_role_band(p_role text,p_type text) returns text language sql immutable security invoker set search_path='' as $$
 select case when p_role in ('construction_worker','gardener') and p_type in ('construction','maintenance') then 'worker' when (p_role='construction_lead' and p_type='construction') or (p_role='maintenance_lead' and p_type='maintenance') then 'lead' else null end
$$;
revoke all on function erp_private.project_role_band(text,text) from public,anon,authenticated,service_role;
grant execute on function erp_private.project_role_band(text,text) to erp_api;
create function erp_private.validate_project_assignment() returns trigger language plpgsql security invoker set search_path='' as $$
declare work_type text;
begin
 if tg_op='UPDATE' and new.role=old.role and new.role in ('crew_lead','worker') then return new;end if;
 select p.work_type into work_type from erp.garden_projects p where p.organization_id=new.organization_id and p.id=new.project_id;
 if erp_private.project_role_band(new.role,work_type) is null then raise exception 'A szerepkör nem illik a munka típusához.' using errcode='22023';end if;
 return new;
end $$;
revoke all on function erp_private.validate_project_assignment() from public,anon,authenticated,service_role;
create trigger assignment_work_type before insert or update on erp.project_assignments for each row execute function erp_private.validate_project_assignment();
create function erp_private.protect_project_work_type() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.work_type is distinct from old.work_type and exists(select 1 from erp.project_assignments a where a.organization_id=old.organization_id and a.project_id=old.id) then raise exception 'Megbízással rendelkező munka típusa nem változtatható meg.' using errcode='22023';end if;
 return new;
end $$;
revoke all on function erp_private.protect_project_work_type() from public,anon,authenticated,service_role;
create trigger project_work_type_guard before update of work_type on erp.garden_projects for each row execute function erp_private.protect_project_work_type();
create or replace function public.erp_assign_project_role(p_org uuid,p_project uuid,p_person uuid,p_role text,p_from timestamptz,p_until timestamptz default null) returns uuid language plpgsql security definer set search_path='' as $$
declare assignment uuid; work_type text;
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 if p_role is null or p_role not in ('construction_lead','maintenance_lead','construction_worker','gardener') or p_from is null or (p_until is not null and p_until<=p_from) then raise exception 'Érvénytelen szerepkör vagy időszak.' using errcode='22023';end if;
 -- Munkánkénti sorzár: a párhuzamos irodai mentések sem hoznak létre átfedő azonos megbízást.
 select p.work_type into work_type from erp.garden_projects p where p.organization_id=p_org and p.id=p_project and p.active for update;
 if not found then raise exception 'A munka nem elérhető.' using errcode='42501';end if;
 if erp_private.project_role_band(p_role,work_type) is null then raise exception 'A szerepkör nem illik a munka típusához.' using errcode='22023';end if;
 if not exists(select 1 from erp.persons p join erp.person_roles r on r.organization_id=p.organization_id and r.person_id=p.id where p.organization_id=p_org and p.id=p_person and p.active and r.role in ('worker','office') and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or now()<r.valid_until)) then raise exception 'Aktív dolgozót válassz.' using errcode='22023';end if;
 if exists(select 1 from erp.project_assignments a where a.organization_id=p_org and a.project_id=p_project and a.person_id=p_person and a.role=p_role and a.revoked_at is null and tstzrange(a.valid_from,a.valid_until,'[)') && tstzrange(p_from,p_until,'[)')) then raise exception 'Erre az időszakra már van ilyen megbízás.' using errcode='23505';end if;
 insert into erp.project_assignments(organization_id,project_id,person_id,role,valid_from,valid_until,created_by)
 values(p_org,p_project,p_person,p_role,p_from,p_until,erp_private.request_user_id()) returning id into assignment;
 return assignment;
end $$;
create function public.erp_project_role_access(p_org uuid,p_project uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare work_type text;office boolean;lead boolean;work_active boolean;
begin
 if erp_private.current_person(p_org) is null then raise exception 'Nincs aktív ERP-hozzáférésed.' using errcode='42501';end if;
 select p.work_type,p.active into work_type,work_active from erp.garden_projects p where p.organization_id=p_org and p.id=p_project;
 if not found then raise exception 'A munka nem elérhető.' using errcode='42501';end if;
 office:=erp_private.is_office(p_org);
 select exists(select 1 from erp.project_assignments a where a.organization_id=p_org and a.project_id=p_project and a.person_id=erp_private.current_person(p_org) and a.revoked_at is null and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now()) and erp_private.project_role_band(a.role,work_type)='lead') into lead;
 return jsonb_build_object('work_type',work_type,'can_view_technical',true,'can_review_work',work_active and (office or lead),'can_manage_purchases',work_active and (office or lead),'can_view_procurement',office or lead,'can_view_maintenance_customer_prices',office or (lead and work_type='maintenance'),'can_view_internal_finances',office,'can_edit_master_prices',office,'can_assign_roles',office and work_active);
end $$;
alter function public.erp_project_role_access(uuid,uuid) owner to erp_api;
revoke all on function public.erp_project_role_access(uuid,uuid) from public,anon,service_role;
grant execute on function public.erp_project_role_access(uuid,uuid) to authenticated;
revoke create on schema public from erp_api;
revoke erp_api from postgres;
commit;