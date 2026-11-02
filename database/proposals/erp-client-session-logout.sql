-- Saját ERP-ügyfélmunkamenet azonnali visszavonása kijelentkezéskor.
begin;
create function public.erp_client_session_close(p_user uuid,p_session uuid) returns void language sql security definer set search_path='' as $$
 update erp_private.client_sessions s set revoked_at=coalesce(s.revoked_at,now()) from erp_private.client_accounts c where c.id=s.account_id and c.auth_user_id=p_user and s.session_id=p_session
$$;
revoke all on function public.erp_client_session_close(uuid,uuid) from public,anon,authenticated;
grant execute on function public.erp_client_session_close(uuid,uuid) to service_role;
commit;
