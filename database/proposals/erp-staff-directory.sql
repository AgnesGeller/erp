begin;
grant erp_api to postgres;
-- Kizárólag az ERP saját munkatárslistájának szűrése.
create or replace function public.erp_list_people(p_org uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not erp_private.is_office(p_org) then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(p) order by p.display_name) from erp.persons p where p.organization_id=p_org and exists(select 1 from erp.person_roles r where r.organization_id=p_org and r.person_id=p.id and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now()) and (r.role='worker' or (r.role='office' and exists(select 1 from erp.user_accounts a where a.organization_id=p_org and a.person_id=p.id and a.active))))),'[]'::jsonb);
end $$;
revoke erp_api from postgres;
commit;
