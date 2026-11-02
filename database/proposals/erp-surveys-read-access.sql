-- Csak az új ERP-felmérés olvasó függvényeinek végrehajtási jogai.
begin;
do $$begin
 if not exists(select 1 from pg_auth_members m join pg_roles r on r.oid=m.roleid join pg_roles u on u.oid=m.member where r.rolname='erp_api' and u.rolname='postgres' and m.grantor=(select oid from pg_roles where rolname=current_user)) then
  grant erp_api to postgres with set true, inherit false granted by postgres;
  perform set_config('erp.survey_granted_membership','yes',true);
 end if;
end$$;
set local role erp_api;
revoke all on function public.erp_surveys_list(uuid), public.erp_survey_get(uuid,uuid,integer) from public,anon,service_role;
grant execute on function public.erp_surveys_list(uuid), public.erp_survey_get(uuid,uuid,integer) to authenticated;
reset role;
do $$begin
 if current_setting('erp.survey_granted_membership',true)='yes' then revoke erp_api from postgres granted by postgres;end if;
end$$;
commit;
