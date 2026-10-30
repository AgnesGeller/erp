-- Jóváhagyott, saját ERP-irodai fiókok. Meglévő Auth-fiókot/jelszót nem módosít.
begin;
create table erp_private.office_logins(
 login_key text primary key check(login_key in('agi','tamas')),
 display_name text not null, auth_email text not null unique,
 organization_id uuid not null references erp.organizations(id), person_id uuid not null,
 auth_user_id uuid unique references auth.users(id),
 generation uuid not null default gen_random_uuid(), setup_hash bytea, setup_expires timestamptz,
 claim_id uuid, claimed_at timestamptz, active boolean not null default true,
 attempts integer not null default 0, attempt_window timestamptz,
 foreign key(organization_id,person_id) references erp.persons(organization_id,id)
);
alter table erp_private.office_logins enable row level security;
alter table erp_private.office_logins force row level security;
revoke all on erp_private.office_logins from public,anon,authenticated,service_role;
-- Adminisztratív első belépés; kizárólag a kiszolgáló service_role jogosultsága hívhatja.
-- A normál ERP üzleti RPC-k továbbra is a felhasználó JWT-jét és FORCE RLS-t használják.
create function public.erp_office_setup_claim(p_login text,p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r erp_private.office_logins; account uuid;
begin
 select * into r from erp_private.office_logins where login_key=p_login for update;
 if not found or not r.active or r.auth_user_id is not null or r.setup_hash is null or r.setup_expires is null or r.setup_expires<=now()
 or r.setup_hash is distinct from sha256(convert_to(p_token,'UTF8')) then return jsonb_build_object('allowed',false);end if;
 if r.claimed_at>now()-interval '3 minutes' then return jsonb_build_object('allowed',false,'busy',true);end if;
 select u.id into account from auth.users u where lower(u.email)=lower(r.auth_email)
 and u.raw_app_meta_data->>'erp_office_setup'=r.generation::text and u.raw_app_meta_data->>'erp_office_login'=r.login_key;
 r.claim_id:=gen_random_uuid();
 update erp_private.office_logins set claim_id=r.claim_id,claimed_at=clock_timestamp() where login_key=p_login;
 return jsonb_build_object('allowed',true,'claim_id',r.claim_id,'generation',r.generation,'email',r.auth_email,'account_id',account);
end $$;
create function public.erp_office_setup_finish(p_login text,p_claim uuid,p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r erp_private.office_logins;
begin
 select * into r from erp_private.office_logins where login_key=p_login for update;
 if not found or not r.active or r.claim_id is distinct from p_claim or r.auth_user_id is not null or r.setup_expires is null or r.setup_expires<=now()
 then raise exception 'A beállítás érvénytelen.' using errcode='42501';end if;
 if not exists(select 1 from auth.users u where u.id=p_user and lower(u.email)=lower(r.auth_email) and u.email_confirmed_at is not null
 and u.raw_app_meta_data->>'erp_office_setup'=r.generation::text and u.raw_app_meta_data->>'erp_office_login'=r.login_key)
 then raise exception 'Ez nem saját ERP-fiók.' using errcode='42501';end if;
 insert into erp.user_accounts(organization_id,auth_user_id,person_id) values(r.organization_id,p_user,r.person_id);
 insert into erp.person_roles(organization_id,person_id,role) values(r.organization_id,r.person_id,'office');
 update erp_private.office_logins set auth_user_id=p_user,setup_hash=null,setup_expires=null,claim_id=null,claimed_at=null where login_key=p_login;
end $$;
create function public.erp_office_setup_release(p_login text,p_claim uuid) returns void
language sql security definer set search_path='' as $$
 update erp_private.office_logins set claim_id=null,claimed_at=null where login_key=p_login and claim_id=p_claim and auth_user_id is null;
$$;
create function public.erp_office_login_target(p_login text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r erp_private.office_logins;
begin
 select * into r from erp_private.office_logins where login_key=p_login for update;
 if not found or not r.active or r.auth_user_id is null then return jsonb_build_object('allowed',false);end if;
 if r.attempt_window is null or r.attempt_window<=now()-interval '15 minutes' then r.attempts:=0;r.attempt_window:=now();end if;
 if r.attempts>=5 then return jsonb_build_object('allowed',false,'locked',true);end if;
 update erp_private.office_logins set attempts=r.attempts+1,attempt_window=r.attempt_window where login_key=p_login;
 return jsonb_build_object('allowed',true,'email',r.auth_email,'user_id',r.auth_user_id);
end $$;
create function public.erp_office_login_success(p_login text) returns void
language sql security definer set search_path='' as $$
 update erp_private.office_logins set attempts=0,attempt_window=null where login_key=p_login;
$$;
do $$ declare f record;begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
 and p.proname in('erp_office_setup_claim','erp_office_setup_finish','erp_office_setup_release','erp_office_login_target','erp_office_login_success') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
-- Kizárólag a jóváhagyott, korábban tévesen kapcsolt info@ ERP-tagság inaktiválása.
update erp.user_accounts a set active=false from auth.users u,erp.organizations o
where a.auth_user_id=u.id and a.organization_id=o.id and o.name='DÍSZKERTEK' and lower(u.email)='info@diszkertek.hu';
do $$ declare org uuid;person uuid;login text;label text;begin
 select id into strict org from erp.organizations where name='DÍSZKERTEK';
 foreach login in array array['agi','tamas'] loop
 label:=case login when 'agi' then 'Ági' else 'Tamás' end;
 insert into erp.persons(organization_id,display_name) values(org,label) returning id into person;
 insert into erp_private.office_logins(login_key,display_name,auth_email,organization_id,person_id)
 values(login,label,login||'@erp.diszkertek.hu',org,person);
 end loop;
end $$;
commit;
