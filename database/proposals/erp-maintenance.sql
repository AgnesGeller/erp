-- PDF 18: saját ERP-kertkarbantartási munkalap és elszámolás. Jóváhagyva 2026-11-04.
begin;
create table erp.maintenance_catalog(
 organization_id uuid not null references erp.organizations(id),code text not null check(length(code) between 1 and 100),label text not null check(length(btrim(label)) between 1 and 200),unit text not null check(length(btrim(unit)) between 1 and 40),
 unit_price numeric(22,2),confirmed boolean not null default false,active boolean not null default true,revision bigint not null default 1,source_kind text not null default 'erp',source_code text,source_updated_at timestamptz,updated_at timestamptz not null default clock_timestamp(),
 primary key(organization_id,code),check(unit_price is null or unit_price>=0));
create table erp.maintenance_catalog_versions(
 number bigint generated always as identity primary key,organization_id uuid not null,code text not null,revision bigint not null,actor_id uuid not null,request_id uuid not null,before_state jsonb,after_state jsonb not null,created_at timestamptz not null default clock_timestamp(),
 foreign key(organization_id,code) references erp.maintenance_catalog(organization_id,code),foreign key(organization_id,actor_id) references erp.persons(organization_id,id),unique(organization_id,code,revision));
create index maintenance_catalog_versions_actor on erp.maintenance_catalog_versions(organization_id,actor_id);
create index maintenance_catalog_versions_org on erp.maintenance_catalog_versions(organization_id,number desc);
create table erp.maintenance_requests(
 id uuid primary key,organization_id uuid not null,project_id uuid not null,author_id uuid not null,document jsonb not null,state text not null default 'requested' check(state in('requested','approved','withdrawn','rejected')),revision bigint not null default 1,decision_by uuid,decision_reason text not null default '',created_at timestamptz not null default clock_timestamp(),
 unique(organization_id,id),unique(organization_id,project_id),foreign key(organization_id,project_id) references erp.garden_projects(organization_id,id),foreign key(organization_id,author_id) references erp.persons(organization_id,id),foreign key(organization_id,decision_by) references erp.persons(organization_id,id));
create index maintenance_requests_author on erp.maintenance_requests(organization_id,author_id);
create index maintenance_requests_decision on erp.maintenance_requests(organization_id,decision_by);
create table erp.maintenance_worksheets(
 id uuid primary key,organization_id uuid not null,project_id uuid not null,work_date date not null,current_version bigint not null default 0,published_version bigint,
 state text not null default 'active' check(state in('active','withdrawn')),revision bigint not null default 1,author_id uuid not null,last_event uuid,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),
 unique(organization_id,id),foreign key(organization_id,project_id) references erp.garden_projects(organization_id,id),foreign key(organization_id,author_id) references erp.persons(organization_id,id));
create index maintenance_worksheets_project on erp.maintenance_worksheets(organization_id,project_id,work_date desc,id);
create index maintenance_worksheets_author on erp.maintenance_worksheets(organization_id,author_id);
create table erp.maintenance_worksheet_versions(
 organization_id uuid not null,worksheet_id uuid not null,version bigint not null,kind text not null check(kind in('draft','published')),work_date date not null,document jsonb not null,calculation jsonb not null,
 actor_id uuid not null,active_role text not null,created_at timestamptz not null default clock_timestamp(),primary key(worksheet_id,version),unique(organization_id,worksheet_id,version),
 foreign key(organization_id,worksheet_id) references erp.maintenance_worksheets(organization_id,id),foreign key(organization_id,actor_id) references erp.persons(organization_id,id));
create index maintenance_versions_sheet_fk on erp.maintenance_worksheet_versions(organization_id,worksheet_id);
create index maintenance_versions_actor on erp.maintenance_worksheet_versions(organization_id,actor_id);
create table erp.maintenance_worksheet_lines(
 organization_id uuid not null,worksheet_id uuid not null,version bigint not null,line_id text not null check(length(line_id) between 1 and 100),code text,kind text not null check(kind in('labor','catalog','other')),label text not null,unit text not null,quantity numeric(22,6) not null check(quantity>=0),unit_price numeric(22,2) not null check(unit_price>=0),divisor smallint not null check(divisor in(1,60)),amount numeric(22,2) not null check(amount>=0),
 primary key(worksheet_id,version,line_id),foreign key(organization_id,worksheet_id,version) references erp.maintenance_worksheet_versions(organization_id,worksheet_id,version),foreign key(organization_id,code) references erp.maintenance_catalog(organization_id,code));
create index maintenance_lines_version_fk on erp.maintenance_worksheet_lines(organization_id,worksheet_id,version);
create index maintenance_lines_catalog_fk on erp.maintenance_worksheet_lines(organization_id,code);
create table erp.maintenance_cash_claims(
 id uuid primary key,organization_id uuid not null,worksheet_id uuid not null,sheet_version bigint not null,finance_document_id uuid not null,amount numeric(22,2) not null check(amount>0),method text not null check(method in('cash','transfer')),work_date date not null,
 state text not null default 'pending' check(state in('pending','partial','confirmed','withdrawn','rejected')),confirmed_amount numeric(22,2) not null default 0,author_id uuid not null,last_payment_id uuid,reason text not null default '',created_at timestamptz not null default clock_timestamp(),
 unique(organization_id,id),unique(organization_id,finance_document_id),foreign key(organization_id,worksheet_id,sheet_version) references erp.maintenance_worksheet_versions(organization_id,worksheet_id,version),foreign key(organization_id,finance_document_id) references erp.finance_documents(organization_id,id),foreign key(organization_id,author_id) references erp.persons(organization_id,id),foreign key(organization_id,last_payment_id) references erp.payment_entries(organization_id,id));
create index maintenance_claims_sheet on erp.maintenance_cash_claims(organization_id,worksheet_id,sheet_version);
create index maintenance_claims_author on erp.maintenance_cash_claims(organization_id,author_id);
create index maintenance_claims_payment on erp.maintenance_cash_claims(organization_id,last_payment_id);
create table erp.maintenance_events(
 id uuid primary key,organization_id uuid not null,project_id uuid,worksheet_id uuid,actor_id uuid not null,actor_auth_id uuid not null,active_role text not null,kind text not null,request_hash text not null,command jsonb not null,data jsonb not null,result jsonb not null,created_at timestamptz not null default clock_timestamp(),
 unique(organization_id,id),foreign key(organization_id,project_id) references erp.garden_projects(organization_id,id),foreign key(organization_id,worksheet_id) references erp.maintenance_worksheets(organization_id,id),foreign key(organization_id,actor_id) references erp.persons(organization_id,id));
create index maintenance_events_project on erp.maintenance_events(organization_id,project_id,created_at desc,id);
create index maintenance_events_sheet on erp.maintenance_events(organization_id,worksheet_id,created_at desc,id);
create index maintenance_events_actor on erp.maintenance_events(organization_id,actor_id);
create table erp.maintenance_notifications(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,project_id uuid not null,worksheet_id uuid,event_id uuid not null,recipient_id uuid not null,kind text not null,created_at timestamptz not null default clock_timestamp(),completed_at timestamptz,
 unique(event_id,recipient_id),foreign key(organization_id,project_id) references erp.garden_projects(organization_id,id),foreign key(organization_id,worksheet_id) references erp.maintenance_worksheets(organization_id,id),foreign key(organization_id,event_id) references erp.maintenance_events(organization_id,id),foreign key(organization_id,recipient_id) references erp.persons(organization_id,id));
create index maintenance_notes_project on erp.maintenance_notifications(organization_id,project_id);
create index maintenance_notes_sheet on erp.maintenance_notifications(organization_id,worksheet_id);
create index maintenance_notes_event on erp.maintenance_notifications(organization_id,event_id);
create index maintenance_notes_person on erp.maintenance_notifications(organization_id,recipient_id,created_at,id);
do $$declare t text;begin foreach t in array array['maintenance_catalog','maintenance_catalog_versions','maintenance_requests','maintenance_worksheets','maintenance_worksheet_versions','maintenance_worksheet_lines','maintenance_cash_claims','maintenance_events','maintenance_notifications'] loop execute format('alter table erp.%I enable row level security',t);execute format('alter table erp.%I force row level security',t);execute format('revoke all on erp.%I from public,anon,authenticated,service_role',t);end loop;
end$$;
create function erp_private.maint_scope(p_org uuid,p_actor uuid,p_session uuid,p_project uuid,p_role text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare person uuid;office boolean;lead boolean:=false;g erp.garden_projects;c erp_private.client_accounts;s erp_private.staff_accounts;begin
 select a.person_id into person from erp.user_accounts a join erp.persons p on p.organization_id=a.organization_id and p.id=a.person_id where a.organization_id=p_org and a.auth_user_id=p_actor and a.active and p.active;
 if person is null then raise exception 'Saját ERP-belépés szükséges.' using errcode='42501';end if;
 office:=exists(select 1 from erp.person_roles r where r.organization_id=p_org and r.person_id=person and r.role='office' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now()));
 if p_role='office' then if not office then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 elsif p_role='client' then c:=erp_private.require_client_session(p_actor,p_session);if c.organization_id<>p_org then raise exception 'Idegen szervezet.' using errcode='42501';end if;
 elsif p_role in('maintenance_lead','construction_worker','gardener') then s:=erp_private.require_staff_session(p_actor,p_session);if s.organization_id<>p_org then raise exception 'Idegen szervezet.' using errcode='42501';end if;
 else raise exception 'Érvénytelen munkaszerep.' using errcode='42501';end if;
 if p_project is not null then
 select * into g from erp.garden_projects where id=p_project and organization_id=p_org and work_type='maintenance';if not found then raise exception 'A karbantartás nem elérhető.' using errcode='42501';end if;
 if p_role='client' and not exists(select 1 from erp.client_site_access a where a.organization_id=p_org and a.account_id=c.id and a.active and a.source_customer_id=g.source_customer_id and a.source_location_id=g.source_location_id) then raise exception 'Ez nem a saját munkád.' using errcode='42501';end if;
 if p_role in('maintenance_lead','construction_worker','gardener') and (g.work_status<>'confirmed' or not exists(select 1 from erp.project_assignments a where a.organization_id=p_org and a.project_id=g.id and a.person_id=person and a.role=p_role and a.revoked_at is null and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now()))) then raise exception 'Nincs érvényes karbantartási megbízás.' using errcode='42501';end if;
 end if;
 lead:=p_role='maintenance_lead' and (p_project is not null or exists(select 1 from erp.project_assignments a join erp.garden_projects assigned_work on assigned_work.organization_id=a.organization_id and assigned_work.id=a.project_id where a.organization_id=p_org and a.person_id=person and a.role='maintenance_lead' and a.revoked_at is null and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now()) and assigned_work.work_type='maintenance' and assigned_work.work_status='confirmed'));
 return jsonb_build_object('organization_id',p_org,'person_id',person,'role',p_role,'can_write',p_role='office' or lead,'can_prices',p_role in('office','client') or lead,'project',case when p_project is null then null else jsonb_build_object('id',g.id,'name',g.name,'address',g.site_address,'customer',g.customer_name,'customer_id',g.source_customer_id,'location_id',g.source_location_id,'status',g.work_status,'scheduled_date',g.scheduled_date,'revision',g.revision) end);
end$$;
create function erp_private.maint_catalog_revision(p_org uuid) returns bigint language sql stable security definer set search_path='' as $$select coalesce(max(number),0) from erp.maintenance_catalog_versions where organization_id=p_org$$;
create function erp_private.maint_contract(p_project uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare g erp.garden_projects;rows jsonb:='[]';rec record;l jsonb;amount numeric:=0;labor numeric:=0;material numeric:=0;begin
 select * into g from erp.garden_projects where id=p_project and work_type='maintenance';if not found then raise exception 'Idegen karbantartás.' using errcode='42501';end if;
 for rec in select w.id,w.published_version,v.work_date,v.calculation from erp.maintenance_worksheets w join erp.maintenance_worksheet_versions v on v.worksheet_id=w.id and v.version=w.published_version where w.project_id=p_project and w.organization_id=g.organization_id and w.state='active' order by v.work_date,w.id loop
 if not (rec.calculation->>'ready')::boolean or rec.calculation->>'gross' is null then raise exception 'Hiányos közzétett munkalap.' using errcode='22023';end if;
 amount:=amount+(rec.calculation->>'gross')::numeric;labor:=labor+(rec.calculation->>'labor')::numeric;material:=material+(rec.calculation->>'material')::numeric;
 for l in select value from jsonb_array_elements(rec.calculation->'lines') loop rows:=rows||jsonb_build_array(jsonb_build_object('line_id',rec.id::text||':'||(l->>'id'),'worksheet_id',rec.id,'worksheet_version',rec.published_version,'section','Karbantartási munkalap – '||rec.work_date::text,'title',l->>'name','net',null,'vat',null,'gross',l->>'amount','accepted',true));end loop;end loop;
 return jsonb_build_object('work_type','maintenance','price_basis','gross','material',material::text,'labor',labor::text,'net',null,'vat',null,'gross',amount::text,'vat_mode','included','accepted_net',null,'accepted_gross',amount::text,'lines',rows,'total_known',jsonb_array_length(rows)>0);
end$$;
create function public.erp_maintenance_read(p_org uuid,p_actor uuid,p_session uuid,p_project uuid,p_role text,p_sheet uuid default null,p_filter jsonb default '{}') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ctx jsonb;g record;projects jsonb:='[]';sites jsonb:='[]';w erp.maintenance_worksheets;v erp.maintenance_worksheet_versions;selected bigint;fullwrite boolean;sheet jsonb;person uuid;catalog jsonb;begin
 ctx:=erp_private.maint_scope(p_org,p_actor,p_session,p_project,p_role);person:=(ctx->>'person_id')::uuid;fullwrite:=(ctx->>'can_write')::boolean;
 for g in select id from erp.garden_projects where organization_id=p_org and work_type='maintenance' order by name,id loop begin projects:=projects||jsonb_build_array(erp_private.maint_scope(p_org,p_actor,p_session,g.id,p_role)->'project');exception when insufficient_privilege then null;end;end loop;
 if p_role='client' then select coalesce(jsonb_agg(jsonb_build_object('customer_id',a.source_customer_id,'location_id',a.source_location_id,'address',ws.address) order by ws.address),'[]') into sites from erp.client_site_access a join erp_private.client_accounts c on c.organization_id=a.organization_id and c.id=a.account_id join erp.work_sites ws on ws.organization_id=a.organization_id and ws.source_location_id=a.source_location_id where c.person_id=person and c.active and a.active and a.organization_id=p_org and ws.source_active and ws.source_approved;end if;
 select coalesce(jsonb_agg(case when p_role='office' or (p_role='maintenance_lead' and (ctx->>'can_prices')::boolean) then to_jsonb(c)||jsonb_build_object('unit_price',c.unit_price::text) else jsonb_build_object('code',c.code,'label',c.label,'unit',c.unit,'active',c.active) end order by c.label,c.code),'[]') into catalog from erp.maintenance_catalog c where c.organization_id=p_org;
 if p_sheet is not null then
 select * into w from erp.maintenance_worksheets where id=p_sheet and organization_id=p_org and project_id=p_project;if not found then raise exception 'Idegen munkalap.' using errcode='42501';end if;
 selected:=coalesce((p_filter->>'version')::bigint,case when fullwrite then w.current_version else w.published_version end);
 select * into v from erp.maintenance_worksheet_versions where worksheet_id=w.id and version=selected and (fullwrite or kind='published');if not found then raise exception 'A munkalapváltozat nem elérhető.' using errcode='42501';end if;
 sheet:=jsonb_build_object('id',w.id,'revision',w.revision,'state',w.state,'work_date',v.work_date,'current_version',w.current_version,'published_version',w.published_version,'version',v.version,'kind',v.kind,'document',v.document,'calculation',v.calculation,'created_at',v.created_at,'versions',coalesce((select jsonb_agg(jsonb_build_object('version',z.version,'kind',z.kind,'created_at',z.created_at) order by z.version desc) from(select version,kind,created_at from erp.maintenance_worksheet_versions where worksheet_id=w.id and (fullwrite or kind='published') and (p_filter->>'before_version' is null or version<(p_filter->>'before_version')::bigint) order by version desc limit 100)z),'[]'));
 end if;
 return jsonb_build_object('context',ctx,'projects',projects,'sites',sites,'catalog',catalog,'catalog_revision',erp_private.maint_catalog_revision(p_org),'sheet',sheet,
 'sheets',coalesce((select jsonb_agg(jsonb_build_object('id',z.id,'work_date',z.work_date,'state',z.state,'revision',z.revision,'current_version',z.current_version,'published_version',z.published_version) order by z.work_date desc,z.id desc) from(select * from erp.maintenance_worksheets x where x.organization_id=p_org and x.project_id=p_project and (fullwrite or x.published_version is not null) and (p_filter->>'before_day' is null or (x.work_date,x.id)<((p_filter->>'before_day')::date,(p_filter->>'before_id')::uuid)) order by x.work_date desc,x.id desc limit 100)z),'[]'),
 'request',(select jsonb_build_object('id',r.id,'state',r.state,'revision',r.revision,'document',r.document,'decision_reason',r.decision_reason) from erp.maintenance_requests r where r.project_id=p_project and r.organization_id=p_org),
 'claims',case when p_role in('office','maintenance_lead','client') then coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'worksheet_id',x.worksheet_id,'sheet_version',x.sheet_version,'amount',x.amount::text,'method',x.method,'state',x.state,'confirmed_amount',x.confirmed_amount::text,'work_date',x.work_date,'finance_document_id',x.finance_document_id,'created_at',x.created_at,'reason',x.reason) order by x.created_at desc,x.id desc) from(select c.* from erp.maintenance_cash_claims c join erp.maintenance_worksheets z on z.id=c.worksheet_id where c.organization_id=p_org and z.project_id=p_project and (p_sheet is null or c.worksheet_id=p_sheet) and (p_filter->>'claim_time' is null or (c.created_at,c.id)<((p_filter->>'claim_time')::timestamptz,(p_filter->>'claim_id')::uuid)) order by c.created_at desc,c.id desc limit 100)x),'[]') else '[]' end);
end$$;
create function erp_private.maint_prepare(p_org uuid,p_actor uuid,p_session uuid,p_project uuid,p_role text,p_command jsonb,p_computed jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ctx jsonb;kind text:=p_command->>'kind';w erp.maintenance_worksheets;r erp.maintenance_requests;c erp.maintenance_cash_claims;s erp.work_sites;d jsonb;l jsonb;oldline jsonb;master erp.maintenance_catalog;day date;amount numeric;begin
 ctx:=erp_private.maint_scope(p_org,p_actor,p_session,p_project,p_role);
 if kind is null or kind not in('request','approve','reject','withdraw_request','catalog','save','publish','withdraw_sheet','restore_sheet','cash_claim','withdraw_claim','reject_claim') then raise exception 'Ismeretlen karbantartási művelet.' using errcode='22023';end if;
 if kind in('approve','reject','catalog','restore_sheet','reject_claim') and p_role<>'office' then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 if kind in('save','publish','withdraw_sheet') and not (ctx->>'can_write')::boolean then raise exception 'Munkalapot iroda vagy Karbantartásvezető kezelhet.' using errcode='42501';end if;
 if kind in('cash_claim','withdraw_claim','withdraw_request') and p_role not in('office','maintenance_lead','client') then raise exception 'Nincs jogosultság.' using errcode='42501';end if;
 if length(coalesce(p_command->>'reason',''))>4000 then raise exception 'Túl hosszú megjegyzés.' using errcode='22023';end if;
 if kind='request' then
 if p_role not in('office','client') or p_project is not null then raise exception 'Érvénytelen karbantartási igény.' using errcode='42501';end if;
 select * into s from erp.work_sites where organization_id=p_org and source_location_id=(p_command->>'location_id')::uuid and source_active and source_approved;
 if s.organization_id is null then raise exception 'Aktív, jóváhagyott címet válassz.' using errcode='22023';end if;
 if p_role='client' and not exists(select 1 from erp.client_site_access a join erp_private.client_accounts ca on ca.organization_id=a.organization_id and ca.id=a.account_id where a.organization_id=p_org and ca.person_id=(ctx->>'person_id')::uuid and ca.active and a.active and a.source_customer_id=s.source_customer_id and a.source_location_id=s.source_location_id) then raise exception 'Csak a saját kijelölt címre kérhetsz karbantartást.' using errcode='42501';end if;
 if p_command->>'request_type' is null or p_command->>'request_type' not in('callback','maintenance') or length(btrim(coalesce(p_command->>'description',''))) not between 1 and 4000 or (nullif(p_command->>'people','') is not null and (p_command->>'people')::int not between 1 and 1000) or (nullif(p_command->>'hours','') is not null and (p_command->>'hours')::numeric not between 0.01 and 10000) then raise exception 'Írd le az igényt, és ellenőrizd a létszámot és időt.' using errcode='22023';end if;
 day:=nullif(p_command->>'day','')::date;if day is not null and (day<'2000-01-01' or day>'9998-12-31') then raise exception 'Érvénytelen nap.' using errcode='22023';end if;
 return jsonb_build_object('context',ctx,'kind',kind,'site',to_jsonb(s),'command',p_command);end if;
 if kind='catalog' then
 if (p_command->>'catalog_revision')::bigint is distinct from erp_private.maint_catalog_revision(p_org) then raise exception 'A katalógus megváltozott.' using errcode='40001';end if;
 if length(btrim(coalesce(p_command->>'code',''))) not between 1 and 100 or length(btrim(coalesce(p_command->>'label',''))) not between 1 and 200 or length(btrim(coalesce(p_command->>'unit',''))) not between 1 and 40 or coalesce(p_command->>'unit_price','') !~ '^[0-9]{1,16}(\.[0-9]{1,2})?$' or jsonb_typeof(p_command->'confirmed') is distinct from 'boolean' or jsonb_typeof(p_command->'active') is distinct from 'boolean' then raise exception 'Ellenőrizd a katalógustétel adatait.' using errcode='22023';end if;
 select * into master from erp.maintenance_catalog where organization_id=p_org and code=p_command->>'code';return jsonb_build_object('context',ctx,'before',to_jsonb(master),'command',p_command);end if;
 if p_project is null then raise exception 'Válassz karbantartást.' using errcode='22023';end if;
 if kind in('approve','reject','withdraw_request') then
 select * into r from erp.maintenance_requests where organization_id=p_org and project_id=p_project;
 if (p_command->>'revision')::bigint is distinct from (ctx->'project'->>'revision')::bigint then raise exception 'A munka megváltozott.' using errcode='40001';end if;
 if ctx->'project'->>'status'<>'requested' or (r.id is not null and r.state<>'requested') then raise exception 'Csak függőben lévő igényről dönthetsz.' using errcode='22023';end if;
 if kind='withdraw_request' and p_role<>'office' and r.author_id is distinct from (ctx->>'person_id')::uuid then raise exception 'Csak saját igényt vonhatsz vissza.' using errcode='42501';end if;
 if kind='approve' then
 day:=(p_command->>'day')::date;if day is null or day<'2000-01-01' or day>'9998-12-31' then raise exception 'Jóváhagyáshoz munkanap szükséges.' using errcode='22023';end if;
 select * into s from erp.work_sites where organization_id=p_org and source_location_id=(ctx->'project'->>'location_id')::uuid and source_customer_id=(ctx->'project'->>'customer_id')::uuid and source_active and source_approved and checked_at>clock_timestamp()-interval '2 minutes';if not found then raise exception 'Az iroda előbb frissítse a munkavégzési címet.' using errcode='22023';end if;
 elsif length(btrim(coalesce(p_command->>'reason','')))=0 then raise exception 'Az elutasítás vagy visszavonás indokát írd le.' using errcode='22023';end if;
 return jsonb_build_object('context',ctx,'command',p_command,'request',to_jsonb(r));end if;
 select * into w from erp.maintenance_worksheets where id=(p_command->>'worksheet_id')::uuid and organization_id=p_org and project_id=p_project;
 if kind='save' and w.id is null then if p_command->>'worksheet_id' is null or (p_command->>'revision')::bigint is distinct from 0::bigint then raise exception 'Érvénytelen új munkalap.' using errcode='40001';end if;
 elsif w.id is null then raise exception 'Idegen munkalap.' using errcode='42501';
 elsif (p_command->>'revision')::bigint is distinct from w.revision then raise exception 'A munkalap megváltozott.' using errcode='40001';end if;
 if kind in('save','publish') then
 if ctx->'project'->>'status'<>'confirmed' or (w.id is not null and w.state<>'active') then raise exception 'Előbb az iroda hagyja jóvá a karbantartást.' using errcode='22023';end if;
 if (p_command->>'catalog_revision')::bigint is distinct from erp_private.maint_catalog_revision(p_org) then raise exception 'A katalógus megváltozott. Ellenőrizd az új előnézetet.' using errcode='40001';end if;
 day:=(p_command->>'work_date')::date;if day is null or day<'2000-01-01' or day>(clock_timestamp() at time zone 'Europe/Budapest')::date then raise exception 'A munkalap napja nem lehet jövőbeli.' using errcode='22023';end if;
 if p_computed->'document' is null or p_computed->'calculation'->>'rounding'<>'exact-sum-divisor-then-2' then raise exception 'Kiszámított munkalap szükséges.' using errcode='22023';end if;
 if kind='publish' and (p_computed->'calculation'->>'ready')::boolean is distinct from true then raise exception 'A munkalap még hiányos; nem tehető közzé.' using errcode='22023';end if;
 if kind='publish' and (w.id is null or p_command->'document' is distinct from (select document from erp.maintenance_worksheet_versions where worksheet_id=w.id and version=w.current_version)) then raise exception 'Közzététel előtt mentsd és ellenőrizd a munkalapot.' using errcode='40001';end if;
 if p_role='maintenance_lead' then for l in select value from jsonb_array_elements(p_computed->'calculation'->'lines') loop
 if l->>'code' is not null then select x into oldline from erp.maintenance_worksheet_versions v cross join lateral jsonb_array_elements(v.calculation->'lines')x where v.worksheet_id=w.id and v.version=w.current_version and x->>'id'=l->>'id' and x->>'code'=l->>'code';select * into master from erp.maintenance_catalog where organization_id=p_org and code=l->>'code';if (l->>'unit_price')::numeric is distinct from coalesce((oldline->>'unit_price')::numeric,master.unit_price) then raise exception 'Meglévő egységárat csak az iroda módosíthat.' using errcode='42501';end if;end if;end loop;end if;
 return jsonb_build_object('context',ctx,'command',p_command,'computed',p_computed);end if;
 if kind in('withdraw_sheet','restore_sheet') then
 if (kind='withdraw_sheet' and w.state<>'active') or (kind='restore_sheet' and w.state<>'withdrawn') or length(btrim(coalesce(p_command->>'reason','')))=0 then raise exception 'Ellenőrizd az állapotot, és írd le az indokot.' using errcode='22023';end if;
 return jsonb_build_object('context',ctx,'command',p_command,'sheet',to_jsonb(w));end if;
 if kind='cash_claim' then
 if p_role not in('office','maintenance_lead','client') or w.published_version is null or w.state<>'active' then raise exception 'Csak közzétett munkalaphoz jelezhető fizetés.' using errcode='42501';end if;
 if coalesce(p_command->>'amount','') !~ '^[0-9]{1,16}(\.[0-9]{1,2})?$' or (p_command->>'amount')::numeric<=0 or p_command->>'method' is null or p_command->>'method' not in('cash','transfer') then raise exception 'Pozitív összeget és fizetési módot adj meg.' using errcode='22023';end if;
 amount:=(p_command->>'amount')::numeric;
 if amount+coalesce((select sum(case when x.state in('withdrawn','rejected') then x.confirmed_amount else greatest(x.amount,x.confirmed_amount) end) from erp.maintenance_cash_claims x where x.worksheet_id=w.id),0)>(select (calculation->>'gross')::numeric from erp.maintenance_worksheet_versions where worksheet_id=w.id and version=w.published_version) then raise exception 'A jelzés a munkalap még nem jelzett összegénél nagyobb.' using errcode='22023';end if;
 day:=(p_command->>'work_date')::date;if day is null or day<'2000-01-01' or day>(clock_timestamp() at time zone 'Europe/Budapest')::date then raise exception 'A fizetési jelzés napja nem lehet jövőbeli.' using errcode='22023';end if;
 if p_command->>'billing_kind' is null or p_command->>'billing_kind' not in('person','company','condominium') or length(btrim(coalesce(p_command->>'billing_name',''))) not between 1 and 200 or length(coalesce(p_command->>'billing_address',''))>500 or length(coalesce(p_command->>'tax_number',''))>40 then raise exception 'Ellenőrizd a számlázási adatokat.' using errcode='22023';end if;
 return jsonb_build_object('context',ctx,'command',p_command,'published_version',w.published_version);end if;
 select * into c from erp.maintenance_cash_claims where id=(p_command->>'claim_id')::uuid and worksheet_id=w.id and organization_id=p_org;
 if c.id is null or c.state not in('pending','partial') or c.confirmed_amount<>0 then raise exception 'Igazolt pénzmozgás csak a pénzügyekben vonható vissza.' using errcode='22023';end if;
 if kind='withdraw_claim' and p_role<>'office' and c.author_id<>(ctx->>'person_id')::uuid then raise exception 'Csak saját fizetési jelzést vonhatsz vissza.' using errcode='42501';end if;
 if length(btrim(coalesce(p_command->>'reason','')))=0 then raise exception 'Írd le a visszavonás vagy elutasítás indokát.' using errcode='22023';end if;
 return jsonb_build_object('context',ctx,'command',p_command,'claim',to_jsonb(c));
end$$;
create function public.erp_maintenance_preview(p_org uuid,p_actor uuid,p_session uuid,p_project uuid,p_role text,p_command jsonb,p_computed jsonb default '{}') returns jsonb language plpgsql stable security definer set search_path='' as $$declare d jsonb;begin d:=erp_private.maint_prepare(p_org,p_actor,p_session,p_project,p_role,p_command,p_computed);return jsonb_build_object('token',md5(d::text),'preview',d);end$$;
create function erp_private.maint_notify(p_org uuid,p_project uuid,p_sheet uuid,p_event uuid,p_kind text,p_author uuid) returns void language plpgsql security definer set search_path='' as $$begin
 insert into erp.maintenance_notifications(organization_id,project_id,worksheet_id,event_id,recipient_id,kind)
 select p_org,p_project,p_sheet,p_event,x.id,p_kind from erp.persons x where x.organization_id=p_org and x.active and x.id<>p_author and (
 exists(select 1 from erp.person_roles r where r.organization_id=p_org and r.person_id=x.id and r.role='office' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now()))
 or (p_kind in('published','withdraw_sheet','restore_sheet','approve','reject','payment_confirmation') and exists(select 1 from erp_private.client_accounts c join erp.client_site_access a on a.organization_id=c.organization_id and a.account_id=c.id join erp.garden_projects g on g.organization_id=a.organization_id and g.source_customer_id=a.source_customer_id and g.source_location_id=a.source_location_id where g.id=p_project and c.person_id=x.id and c.active and a.active))
 or (p_kind in('approve','published') and exists(select 1 from erp.project_assignments a where a.organization_id=p_org and a.project_id=p_project and a.person_id=x.id and a.revoked_at is null and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now())))) on conflict(event_id,recipient_id) do nothing;
end$$;
create function public.erp_maintenance_write(p_org uuid,p_actor uuid,p_session uuid,p_project uuid,p_role text,p_request uuid,p_fingerprint text,p_command jsonb,p_computed jsonb,p_preview text,p_confirmed boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare ctx jsonb;prior erp.maintenance_events;prepared jsonb;person uuid;kind text:=p_command->>'kind';w erp.maintenance_worksheets;s erp.work_sites;project uuid:=p_project;sheet uuid:=(p_command->>'worksheet_id')::uuid;v bigint;l jsonb;acc uuid;result jsonb;beforecat erp.maintenance_catalog;aftercat erp.maintenance_catalog;claim erp.maintenance_cash_claims;begin
 ctx:=erp_private.maint_scope(p_org,p_actor,p_session,p_project,p_role);person:=(ctx->>'person_id')::uuid;
 if p_request is null or coalesce(p_fingerprint,'') !~ '^[a-f0-9]{64}$' or p_confirmed is distinct from true then raise exception 'Előnézet és kifejezett megerősítés szükséges.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('maintenance-request:'||p_request::text,0));select * into prior from erp.maintenance_events where id=p_request;
 if found then if prior.organization_id<>p_org or prior.actor_auth_id<>p_actor or prior.active_role<>p_role or prior.request_hash<>p_fingerprint or prior.command<>p_command or prior.data->>'source_project' is distinct from p_project::text then raise exception 'Eltérő ismételt kérés.' using errcode='40001';end if;return prior.result||jsonb_build_object('replayed',true);end if;
 perform pg_advisory_xact_lock(hashtextextended('maintenance-catalog:'||p_org::text,0));
 if p_project is not null then perform 1 from erp.garden_projects where id=p_project and organization_id=p_org for update;end if;
 if sheet is not null then select * into w from erp.maintenance_worksheets where id=sheet for update;end if;
 prepared:=public.erp_maintenance_preview(p_org,p_actor,p_session,p_project,p_role,p_command,p_computed);if prepared->>'token' is distinct from p_preview then raise exception 'Az előnézet megváltozott. Ellenőrizd újra.' using errcode='40001';end if;prepared:=prepared->'preview';
 if kind='request' then
 s:=jsonb_populate_record(null::erp.work_sites,prepared->'site');project:=gen_random_uuid();
 insert into erp.garden_projects(id,organization_id,name,work_type,active,work_status,source_customer_id,source_location_id,customer_name,site_address,description,requested_date,requested_people,requested_hours,creation_request,creation_payload,created_by)
 select project,p_org,case when p_command->>'request_type'='callback' then 'Karbantartási visszahívás' else 'Kertkarbantartás' end,'maintenance',false,'requested',s.source_customer_id,s.source_location_id,p.display_name,s.address,p_command->>'description',nullif(p_command->>'day','')::date,nullif(p_command->>'people','')::int,nullif(p_command->>'hours','')::numeric,p_request,p_command,p_actor from erp.customer_profiles cp join erp.persons p on p.organization_id=cp.organization_id and p.id=cp.person_id where cp.organization_id=p_org and cp.source_customer_id=s.source_customer_id;
 if not found then raise exception 'Az ügyféladat nem elérhető.' using errcode='22023';end if;
 insert into erp.maintenance_requests(id,organization_id,project_id,author_id,document) values(p_request,p_org,project,person,p_command);
 elsif kind='catalog' then
 select * into beforecat from erp.maintenance_catalog where organization_id=p_org and code=p_command->>'code';
 insert into erp.maintenance_catalog(organization_id,code,label,unit,unit_price,confirmed,active) values(p_org,p_command->>'code',btrim(p_command->>'label'),btrim(p_command->>'unit'),(p_command->>'unit_price')::numeric,(p_command->>'confirmed')::boolean,(p_command->>'active')::boolean)
 on conflict(organization_id,code) do update set label=excluded.label,unit=excluded.unit,unit_price=excluded.unit_price,confirmed=excluded.confirmed,active=excluded.active,revision=erp.maintenance_catalog.revision+1,updated_at=clock_timestamp() returning * into aftercat;
 insert into erp.maintenance_catalog_versions(organization_id,code,revision,actor_id,request_id,before_state,after_state) values(p_org,aftercat.code,aftercat.revision,person,p_request,to_jsonb(beforecat),to_jsonb(aftercat));
 elsif kind in('approve','reject','withdraw_request') then
 update erp.garden_projects set work_status=case when kind='approve' then 'confirmed' else 'cancelled' end,active=kind='approve',scheduled_date=case when kind='approve' then (p_command->>'day')::date else scheduled_date end,revision=revision+1,updated_at=clock_timestamp() where id=project;
 update erp.maintenance_requests set state=case kind when 'approve' then 'approved' when 'reject' then 'rejected' else 'withdrawn' end,revision=revision+1,decision_by=person,decision_reason=coalesce(p_command->>'reason','') where project_id=project;
 elsif kind in('save','publish') then
 if w.id is null then insert into erp.maintenance_worksheets(id,organization_id,project_id,work_date,author_id) values(sheet,p_org,project,(p_command->>'work_date')::date,person) returning * into w;end if;
 v:=w.current_version+1;
 insert into erp.maintenance_worksheet_versions(organization_id,worksheet_id,version,kind,work_date,document,calculation,actor_id,active_role) values(p_org,sheet,v,case when kind='publish' then 'published' else 'draft' end,(p_command->>'work_date')::date,p_computed->'document',p_computed->'calculation',person,p_role);
 for l in select value from jsonb_array_elements(p_computed->'calculation'->'lines') loop
 insert into erp.maintenance_worksheet_lines(organization_id,worksheet_id,version,line_id,code,kind,label,unit,quantity,unit_price,divisor,amount) values(p_org,sheet,v,l->>'id',l->>'code',l->>'kind',l->>'name',l->>'unit',(l->>'quantity')::numeric,(l->>'unit_price')::numeric,(l->>'divisor')::int,(l->>'amount')::numeric);end loop;
 update erp.maintenance_worksheets set current_version=v,published_version=case when kind='publish' then v else published_version end,work_date=(p_command->>'work_date')::date,revision=revision+1,last_event=p_request,updated_at=clock_timestamp() where id=sheet;
 elsif kind in('withdraw_sheet','restore_sheet') then update erp.maintenance_worksheets set state=case when kind='withdraw_sheet' then 'withdrawn' else 'active' end,revision=revision+1,last_event=p_request,updated_at=clock_timestamp() where id=sheet;
 elsif kind='cash_claim' then
 insert into erp.finance_accounts(organization_id,project_id) values(p_org,project) on conflict(organization_id,project_id) do nothing;select id into acc from erp.finance_accounts where organization_id=p_org and project_id=project;
 insert into erp.finance_documents(id,organization_id,account_id,kind,amount,method,billing_kind,billing_name,billing_address,tax_number,note,author_id) values(p_request,p_org,acc,'intent',(p_command->>'amount')::numeric,p_command->>'method',p_command->>'billing_kind',btrim(p_command->>'billing_name'),coalesce(p_command->>'billing_address',''),coalesce(p_command->>'tax_number',''),case when p_role='client' then 'Ügyfél fizetési jelzése' when p_command->>'method'='cash' then 'Elszámoltam a megrendelővel, a pénzt átvettem – irodai igazolásra vár' else 'Átutalási jelzés – irodai igazolásra vár' end,person);
 insert into erp.maintenance_cash_claims(id,organization_id,worksheet_id,sheet_version,finance_document_id,amount,method,work_date,author_id) values(p_request,p_org,sheet,w.published_version,p_request,(p_command->>'amount')::numeric,p_command->>'method',(p_command->>'work_date')::date,person);
 update erp.finance_accounts set revision=revision+1 where id=acc;
 else
 select * into claim from erp.maintenance_cash_claims where id=(p_command->>'claim_id')::uuid;
 update erp.maintenance_cash_claims set state=case when kind='reject_claim' then 'rejected' else 'withdrawn' end,reason=p_command->>'reason' where id=claim.id;
 update erp.finance_documents set state=case when kind='reject_claim' then 'disputed' else 'withdrawn' end,revision=revision+1 where id=claim.finance_document_id;
 update erp.finance_accounts set revision=revision+1 where id=(select account_id from erp.finance_documents where id=claim.finance_document_id);
 end if;
 result:=jsonb_build_object('project_id',project,'worksheet_id',sheet,'version',v,'request_id',p_request,'kind',kind);
 insert into erp.maintenance_events(id,organization_id,project_id,worksheet_id,actor_id,actor_auth_id,active_role,kind,request_hash,command,data,result) values(p_request,p_org,project,sheet,person,p_actor,p_role,kind,p_fingerprint,p_command,jsonb_build_object('source_project',p_project,'preview',p_preview),result);
 if project is not null and kind<>'save' then perform erp_private.maint_notify(p_org,project,sheet,p_request,case when kind='publish' then 'published' else kind end,person);end if;
 return result;
end$$;
create function public.erp_maintenance_import(p_org uuid,p_actor uuid,p_session uuid,p_request uuid,p_rows jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare ctx jsonb;person uuid;r jsonb;c erp.maintenance_catalog;n int:=0;old erp.maintenance_events;hash text:=md5(p_rows::text);begin
 ctx:=erp_private.maint_scope(p_org,p_actor,p_session,null,'office');person:=(ctx->>'person_id')::uuid;
 if p_request is null or jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)>1000 then raise exception 'Érvénytelen katalógus.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('maintenance-catalog:'||p_org::text,0));select * into old from erp.maintenance_events where id=p_request;
 if found then if old.organization_id<>p_org or old.actor_auth_id<>p_actor or old.request_hash<>hash or old.kind<>'catalog_import' then raise exception 'Eltérő importismétlés.' using errcode='40001';end if;return old.result;end if;
 if exists(select 1 from erp.maintenance_catalog where organization_id=p_org) then raise exception 'A kezdeti katalógus már be van töltve. Módosítsd az ERP saját árlistáját.' using errcode='22023';end if;
 for r in select value from jsonb_array_elements(p_rows) loop
 insert into erp.maintenance_catalog(organization_id,code,label,unit,unit_price,confirmed,active,source_kind,source_code,source_updated_at) values(p_org,r->>'code',r->>'label',r->>'unit',(r->>'unit_price')::numeric,coalesce((r->>'confirmed')::boolean,false),coalesce((r->>'active')::boolean,false),'munkalap_readonly',r->>'code',(r->>'updated_at')::timestamptz) returning * into c;
 insert into erp.maintenance_catalog_versions(organization_id,code,revision,actor_id,request_id,after_state) values(p_org,c.code,c.revision,person,p_request,to_jsonb(c));n:=n+1;end loop;
 insert into erp.maintenance_events(id,organization_id,actor_id,actor_auth_id,active_role,kind,request_hash,command,data,result) values(p_request,p_org,person,p_actor,'office','catalog_import',hash,'{}','{}',jsonb_build_object('count',n));return jsonb_build_object('count',n);
end$$;
create function public.erp_maintenance_notifications(p_actor uuid,p_session uuid,p_complete uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare m record;n record;role text;ctx jsonb;result jsonb:='[]';begin
 for m in select organization_id,person_id from erp.user_accounts where auth_user_id=p_actor and active loop
 for n in select * from erp.maintenance_notifications where organization_id=m.organization_id and recipient_id=m.person_id and (completed_at is null or id=p_complete) order by created_at,id limit 100 loop
 foreach role in array array['office','client','maintenance_lead','construction_worker','gardener'] loop begin
 ctx:=erp_private.maint_scope(m.organization_id,p_actor,p_session,n.project_id,role);
 if n.id=p_complete then update erp.maintenance_notifications set completed_at=clock_timestamp() where id=n.id;end if;
 result:=result||jsonb_build_array(jsonb_build_object('id',n.id,'project_id',n.project_id,'worksheet_id',n.worksheet_id,'kind','maintenance','title',ctx->'project'->>'name','role',role,'created_at',n.created_at,'completed_at',n.completed_at));exit;exception when insufficient_privilege then null;end;end loop;end loop;end loop;return result;
end$$;

create or replace function erp_private.finance_scope(p_org uuid,p_actor uuid,p_session uuid,p_project uuid,p_role text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare person uuid;office boolean;g erp.garden_projects;ca erp_private.client_accounts;sa erp_private.staff_accounts;policy jsonb;begin
 select a.person_id into person from erp.user_accounts a join erp.persons n on n.id=a.person_id and n.organization_id=a.organization_id where a.organization_id=p_org and a.auth_user_id=p_actor and a.active and n.active;
 if person is null then raise exception 'Saját ERP-belépés szükséges.' using errcode='42501';end if;
 office:=exists(select 1 from erp.person_roles r where r.organization_id=p_org and r.person_id=person and r.role='office' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now()));
 policy:=erp_private.finance_policy(p_org);
 if p_role='office' and not office then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;
 if p_role='client' then ca:=erp_private.require_client_session(p_actor,p_session);if ca.organization_id<>p_org then raise exception 'Idegen szervezet.' using errcode='42501';end if;
 elsif p_role in('construction_worker','gardener','construction_lead') and not office then sa:=erp_private.require_staff_session(p_actor,p_session);if sa.organization_id<>p_org then raise exception 'Idegen szervezet.' using errcode='42501';end if;
 elsif p_role<>'office' and not office then raise exception 'Érvénytelen szerepkör.' using errcode='42501';end if;
 if p_role is null or p_role not in('office','client','construction_worker','gardener','construction_lead') then raise exception 'Érvénytelen szerepkör.' using errcode='42501';end if;
 if p_project is not null then
 select * into g from erp.garden_projects where organization_id=p_org and id=p_project and ((work_type='construction' and accepted_quote_id is not null) or (work_type='maintenance' and p_role in('office','client')));if not found then raise exception 'A kertépítés nem elérhető.' using errcode='42501';end if;
 if p_role='client' and not exists(select 1 from erp.client_site_access s where s.organization_id=p_org and s.account_id=ca.id and s.active and s.source_customer_id=g.source_customer_id and s.source_location_id=g.source_location_id) then raise exception 'Ez nem a saját munkád.' using errcode='42501';end if;
 if p_role in('construction_worker','gardener','construction_lead') and not office and not exists(select 1 from erp.project_assignments a where a.organization_id=p_org and a.project_id=g.id and a.person_id=person and a.role=p_role and a.revoked_at is null and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now())) then raise exception 'Nincs érvényes munkamegbízás.' using errcode='42501';end if;
 end if;
 return jsonb_build_object('organization_id',p_org,'person_id',person,'role',p_role,'office',p_role='office','can_finance',p_role in('office','client'),'can_profit',coalesce(g.work_type,'construction')='construction' and (p_role='office' or (p_role='construction_lead' and (policy->>'profit_lead')::boolean) or (p_role in('construction_worker','gardener') and (policy->>'profit_worker')::boolean)),'can_commission',p_role='office' or (p_role in('construction_worker','gardener','construction_lead') and (policy->>'commission_active')::boolean),'policy',case when p_role='client' then '{}'::jsonb else policy end,'project',case when p_project is null then null else jsonb_build_object('id',g.id,'work_type',g.work_type,'name',g.name,'address',g.site_address,'customer',g.customer_name,'status',g.work_status) end);
end$$;

create or replace function erp_private.finance_contract(p_project uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare g erp.garden_projects;v erp.quote_versions;s jsonb;l jsonb;t erp.project_tasks;lines jsonb:='[]';cumulative numeric:=0;vat_before numeric:=0;line_vat numeric;net numeric;base numeric;vat numeric;accepted boolean;accepted_net numeric:=0;accepted_gross numeric:=0;begin
 select * into g from erp.garden_projects where id=p_project;if g.work_type='maintenance' then return erp_private.maint_contract(p_project);end if;select * into v from erp.quote_versions where organization_id=g.organization_id and quote_id=g.accepted_quote_id and version=g.accepted_quote_version;
 base:=(v.calculation->>'tax_base')::numeric;vat:=(v.calculation->>'vat')::numeric;
 if base is null or vat is null or v.calculation->>'gross' is null or jsonb_array_length(coalesce(v.calculation->'issues','[]'))>0 then raise exception 'Hiányos elfogadott ajánlat; pénzügyi alap nem készíthető.' using errcode='22023';end if;
 for s in select value from jsonb_array_elements(v.calculation->'sections') loop for l in select value from jsonb_array_elements(s->'lines') loop
 net:=(l->>'net')::numeric;cumulative:=cumulative+net;line_vat:=case when base>0 then round(cumulative/base*vat,2)-vat_before else 0 end;vat_before:=vat_before+line_vat;
 select x.* into t from erp.project_tasks x join erp.workplans w on w.id=x.plan_id where w.project_id=g.id and x.source_line_id=l->>'id';
 accepted:=found and erp_private.entry_task_active(t.id) and exists(select 1 from jsonb_array_elements(t.state->'approvals')a where (a->>'level')::int=3);
 if accepted then accepted_net:=accepted_net+net;accepted_gross:=accepted_gross+net+line_vat;end if;
 lines:=lines||jsonb_build_array(jsonb_build_object('line_id',l->>'id','task_id',t.id,'section',s->>'name','title',l->>'label','net',net::text,'vat',line_vat::text,'gross',(net+line_vat)::text,'accepted',accepted));
 end loop;end loop;
 if cumulative<>base or round(base+vat,2)<>(v.calculation->>'gross')::numeric then raise exception 'Az ajánlati összesítés nem egyezik a tételekkel.' using errcode='22023';end if;
 return jsonb_build_object('quote_id',g.accepted_quote_id,'quote_version',g.accepted_quote_version,'material',v.calculation->>'material','labor',v.calculation->>'labor','net',base::text,'vat',vat::text,'gross',v.calculation->>'gross','vat_mode',v.calculation->>'vat_mode','accepted_net',accepted_net::text,'accepted_gross',accepted_gross::text,'lines',lines);
end$$;

create or replace function erp_private.finance_profit(p_project uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare g erp.garden_projects;v erp.quote_versions;tim jsonb;mat jsonb;rate numeric;labor numeric;material numeric;complete boolean;begin
 select * into g from erp.garden_projects where id=p_project;if g.work_type='maintenance' then return null;end if;select * into v from erp.quote_versions where organization_id=g.organization_id and quote_id=g.accepted_quote_id and version=g.accepted_quote_version;
 tim:=erp_private.worksheet_summary(p_project);mat:=erp_private.material_cost(g.organization_id,p_project);rate:=(v.input->>'hourly_rate')::numeric;
 labor:=case when rate>0 and tim->>'planned_minutes' is not null then round(((tim->>'planned_minutes')::numeric-(tim->>'actual_minutes')::numeric)/60*rate,2) else null end;
 material:=(mat->>'difference')::numeric;complete:=labor is not null and material is not null and (mat->>'complete')::boolean;
 return jsonb_build_object('quote_version',g.accepted_quote_version,'hourly_rate',rate::text,'planned_minutes',tim->>'planned_minutes','actual_minutes',tim->>'actual_minutes','labor',labor::text,'material',material::text,'total',case when complete then (labor+material)::text else null end,'complete',complete,'missing_prices',mat->'missing_prices','material_policy',mat->'policy','material_charged',mat->>'charged','material_quoted',mat->>'quoted');
end$$;

create or replace function erp_private.finance_refresh(p_account uuid,p_event uuid default null,p_actor uuid default null,p_kind text default 'live',p_reason text default '') returns void language plpgsql security definer set search_path='' as $$
declare a erp.finance_accounts;contract jsonb;oldcontract erp.receivable_versions;profit jsonb;ps erp.profit_snapshots;oldprofit erp.profit_snapshots;policy jsonb;pool numeric;weights jsonb:='{}';task erp.project_tasks;doc jsonb;share jsonb;subject uuid;weight numeric;total_weight numeric:=0;assigned numeric:=0;cv uuid;cvnum bigint;signature text;prior_signature text;yearnum int;cum numeric:=0;allocated numeric:=0;part numeric;item record;final boolean;begin
 select * into a from erp.finance_accounts where id=p_account for update;if not found then return;end if;
 contract:=erp_private.finance_contract(a.project_id);select * into oldcontract from erp.receivable_versions where account_id=a.id order by version desc limit 1;
 if oldcontract.source_hash is distinct from md5(contract::text) then
 insert into erp.receivable_versions(organization_id,account_id,version,source_event,source_hash,document,delta) values(a.organization_id,a.id,coalesce(oldcontract.version,0)+1,p_event,md5(contract::text),contract,(contract->>'accepted_gross')::numeric-coalesce((oldcontract.document->>'accepted_gross')::numeric,0));
 update erp.finance_accounts set revision=revision+1,paid_marked=false,updated_at=clock_timestamp() where id=a.id;
 end if;
 if exists(select 1 from erp.garden_projects where id=a.project_id and work_type='maintenance') then return;end if;
 profit:=erp_private.finance_profit(a.project_id);select * into oldprofit from erp.profit_snapshots where account_id=a.id order by version desc limit 1;
 if a.closed and p_kind='live' then return;end if;
 if oldprofit.source_hash is distinct from md5(profit::text) or p_kind<>'live' then
 insert into erp.profit_snapshots(organization_id,account_id,version,source_hash,kind,document,reason,actor_id) values(a.organization_id,a.id,coalesce(oldprofit.version,0)+1,md5(profit::text),p_kind,profit,p_reason,p_actor) returning * into ps;
 else ps:=oldprofit;end if;
 policy:=erp_private.finance_policy(a.organization_id);pool:=case policy->>'commission_basis' when 'labor' then (profit->>'labor')::numeric when 'material' then (profit->>'material')::numeric else (profit->>'total')::numeric end;
 for task in select t.* from erp.project_tasks t join erp.workplans w on w.id=t.plan_id where w.project_id=a.project_id and erp_private.entry_task_active(t.id) order by t.id loop
 doc:=erp_private.plan_task_json(task);weight:=(doc->>'labor')::numeric;total_weight:=total_weight+weight;
 -- Csak tényleges kertész-szintű teljesítmény, nem örökölt magasabb jóváhagyás.
 if exists(select 1 from jsonb_array_elements(task.state->'approvals')v where (v->>'level')::int=0) then
 for share in select value from jsonb_array_elements(task.state->'shares') loop subject:=(share->>'person_id')::uuid;
 if exists(select 1 from erp.persons where organization_id=a.organization_id and id=subject) then
 weights:=jsonb_set(weights,array[subject::text],to_jsonb(coalesce((weights->>subject::text)::numeric,0)+weight*(share->>'basis_points')::numeric/10000));
 end if;end loop;end if;end loop;
 select coalesce(sum(value::numeric),0) into assigned from jsonb_each_text(weights);
 final:=a.closed;yearnum:=extract(year from coalesce(a.closed_at,clock_timestamp()) at time zone 'Europe/Budapest');
 doc:=jsonb_build_object('profit_id',ps.id,'basis',policy->>'commission_basis','weights',weights,'total_weight',total_weight::text,'assigned_weight',assigned::text,'unallocated_weight',(total_weight-assigned)::text,'final',final,'policy_version',policy->'version');signature:=md5(doc::text);
 select source_hash into prior_signature from erp.commission_project_versions where account_id=a.id order by version desc limit 1;
 if signature=prior_signature then return;end if;
 select coalesce(max(version),0)+1 into cvnum from erp.commission_project_versions where account_id=a.id;
 insert into erp.commission_project_versions(organization_id,account_id,profit_id,year,version,source_hash,basis,amount,complete,source) values(a.organization_id,a.id,ps.id,yearnum,cvnum,signature,policy->>'commission_basis',pool,pool is not null and total_weight>0 and assigned=total_weight,doc) returning id into cv;
 if pool is not null and total_weight>0 then for item in select key,value from jsonb_each_text(weights) order by key loop
 cum:=cum+item.value::numeric;part:=round(pool*cum/total_weight,2)-allocated;allocated:=allocated+part;
 insert into erp.commission_person_entries(organization_id,project_version_id,person_id,amount,weight) values(a.organization_id,cv,item.key::uuid,part,item.value::numeric);
 end loop;end if;
 update erp.finance_accounts set revision=revision+1,updated_at=clock_timestamp() where id=a.id;
end$$;

create or replace function public.erp_finance_projects(p_org uuid,p_actor uuid,p_session uuid,p_role text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare ctx jsonb;g record;result jsonb:='[]';begin
 ctx:=erp_private.finance_scope(p_org,p_actor,p_session,null,p_role);
 for g in select * from erp.garden_projects where organization_id=p_org and ((work_type='construction' and accepted_quote_id is not null) or (work_type='maintenance' and p_role in('office','client')))  order by name,id loop
 begin ctx:=erp_private.finance_scope(p_org,p_actor,p_session,g.id,p_role);if (ctx->>'can_finance')::boolean or (ctx->>'can_profit')::boolean then result:=result||jsonb_build_array(ctx->'project');end if;exception when insufficient_privilege then null;end;end loop;return result;
end$$;

create or replace function erp_private.finance_state(p_account uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare a erp.finance_accounts;c jsonb;paid numeric;advance numeric;begin
 select * into a from erp.finance_accounts where id=p_account;c:=erp_private.finance_contract(a.project_id);
 select coalesce(sum(amount),0),coalesce(sum(amount) filter(where erp_private.finance_payment_root(id)='advance'),0) into paid,advance from erp.payment_entries where account_id=a.id;
 return jsonb_build_object('account_id',a.id,'revision',a.revision,'closed',a.closed,'paid_marked',a.paid_marked,'closed_at',a.closed_at,'contract',c,'paid',paid::text,'advance',advance::text,'balance',((c->>'accepted_gross')::numeric-paid)::text,'total_outstanding',((c->>'gross')::numeric-paid)::text,'can_mark_paid',coalesce((c->>'total_known')::boolean,true) and paid>=(c->>'gross')::numeric);
end$$;

create or replace function erp_private.finance_prepare(p_ctx jsonb,p_command jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare org uuid:=(p_ctx->>'organization_id')::uuid;project uuid:=(p_ctx->'project'->>'id')::uuid;person uuid:=(p_ctx->>'person_id')::uuid;role text:=p_ctx->>'role';kind text:=p_command->>'kind';a erp.finance_accounts;d erp.finance_documents;old erp.payment_entries;state jsonb;profit jsonb;value numeric;day date;policy jsonb;yearrow jsonb;ys erp.commission_year_settlements;yearnum int;yearend date;balance numeric;paid numeric;expected numeric;lastsource jsonb;begin
 if kind is null or kind not in('init','document','decision','receipt','advance','refund','reverse','close','reopen','paid','correct','policy','settle','payout','year_reverse') then raise exception 'Ismeretlen pénzügyi művelet.' using errcode='22023';end if;
 if kind not in('document','decision') and role<>'office' then raise exception 'Ezt csak az iroda végezheti.' using errcode='42501';end if;
 if kind in('document','decision') and role not in('office','client') then raise exception 'Nincs pénzügyi jogosultság.' using errcode='42501';end if;
 if length(coalesce(p_command->>'reason',''))>4000 then raise exception 'Túl hosszú megjegyzés.' using errcode='22023';end if;
 if kind='policy' then
 if (p_command->>'revision')::bigint is distinct from (p_ctx->'policy'->>'version')::bigint or p_command->>'commission_basis' is null or p_command->>'commission_basis' not in('labor','material','both') or jsonb_typeof(p_command->'profit_worker') is distinct from 'boolean' or jsonb_typeof(p_command->'profit_lead') is distinct from 'boolean' or jsonb_typeof(p_command->'commission_active') is distinct from 'boolean' then raise exception 'A beállítás megváltozott vagy hiányos.' using errcode='40001';end if;
 return jsonb_build_object('kind',kind,'before',p_ctx->'policy','after',p_command-'kind');end if;
 if kind in('settle','payout','year_reverse') then
 yearnum:=(p_command->>'year')::int;if yearnum is null or yearnum<2000 or yearnum>9998 or not exists(select 1 from erp.persons where organization_id=org and id=(p_command->>'person_id')::uuid) then raise exception 'Érvénytelen év vagy személy.' using errcode='22023';end if;
 yearend:=make_date(yearnum,12,31);if (clock_timestamp() at time zone 'Europe/Budapest')::date<yearend then raise exception 'Év közben nincs jutalékkifizetés vagy végelszámolás.' using errcode='22023';end if;
 yearrow:=public.erp_finance_year(org,(p_ctx->>'actor')::uuid,(p_ctx->>'session')::uuid,'office',yearnum,'{"full":true}'::jsonb);
 yearrow:=jsonb_build_object('year',yearnum,'person_id',p_command->>'person_id','rows',coalesce((select jsonb_agg(x) from jsonb_array_elements(yearrow->'rows')x where (x->>'person_id')::uuid=(p_command->>'person_id')::uuid and (x->>'final')::boolean),'[]'));
 select coalesce(sum((x->>'amount')::numeric),0) into value from jsonb_array_elements(yearrow->'rows')x where (x->>'person_id')::uuid=(p_command->>'person_id')::uuid and (x->>'final')::boolean;
 if exists(select 1 from jsonb_array_elements(yearrow->'rows')x where (x->>'person_id')::uuid=(p_command->>'person_id')::uuid and (x->>'final')::boolean and not (x->>'complete')::boolean) then raise exception 'Hiányos lezárt projektből nincs végleges jutalék.' using errcode='22023';end if;
 select z.* into ys from erp.commission_year_settlements z where z.organization_id=org and z.person_id=(p_command->>'person_id')::uuid and z.year=yearnum and z.kind='settle' and not exists(select 1 from erp.commission_year_settlements r where r.reverses_id=z.id) order by z.created_at desc limit 1;
 if kind='settle' and ys.id is not null and ys.amount=value and ys.source->'rows'=yearrow->'rows' then raise exception 'Ez az éves elszámolás már rögzítve van.' using errcode='22023';end if;
 if kind='payout' then
 if ys.id is null or ys.amount<>value or ys.source->'rows'<>yearrow->'rows' then raise exception 'Előbb rögzítsd a naprakész éves elszámolást.' using errcode='22023';end if;
 select coalesce(sum(case when z.kind='payout' then z.amount when z.kind='reverse' then -z.amount else 0 end),0) into paid from erp.commission_year_settlements z where z.organization_id=org and z.person_id=(p_command->>'person_id')::uuid and z.year=yearnum and (z.kind='payout' or (z.kind='reverse' and z.reverses_id in(select x.id from erp.commission_year_settlements x where x.kind='payout')));
 if p_command->>'amount' is null or p_command->>'amount' !~ '^[0-9]{1,20}(\.[0-9]{1,2})?$' then raise exception 'Pontos forintösszeg szükséges.' using errcode='22023';end if;
 expected:=(p_command->>'amount')::numeric;if expected<=0 or expected>greatest(value-paid,0) then raise exception 'A kifizetés meghaladja az éves pozitív egyenleget.' using errcode='22023';end if;value:=expected;
 elsif kind='year_reverse' then
 select * into ys from erp.commission_year_settlements where organization_id=org and id=(p_command->>'reverses_id')::uuid and person_id=(p_command->>'person_id')::uuid and year=yearnum;
 if ys.id is null or ys.kind='reverse' or exists(select 1 from erp.commission_year_settlements where reverses_id=ys.id) or length(btrim(coalesce(p_command->>'reason','')))=0 then raise exception 'Nem visszavonható éves esemény vagy hiányzó indok.' using errcode='22023';end if;value:=ys.amount;
 end if;
 return jsonb_build_object('kind',kind,'year',yearnum,'person_id',p_command->>'person_id','amount',value::text,'source',yearrow,'reason',coalesce(p_command->>'reason',''));
 end if;
 if p_ctx->'project'->>'work_type'='maintenance' and kind in('close','reopen','correct') then raise exception 'A kertépítési eredményzárás nem karbantartási művelet.' using errcode='22023';end if;
 if project is null then raise exception 'Válassz kertépítést.' using errcode='22023';end if;
 select * into a from erp.finance_accounts where organization_id=org and project_id=project;
 if kind='init' then
 if a.id is not null then raise exception 'A pénzügyi nyilvántartás már elkészült.' using errcode='40001';end if;
 return jsonb_build_object('kind',kind,'contract',erp_private.finance_contract(project),'profit',erp_private.finance_profit(project));end if;
 if a.id is null then raise exception 'Az iroda előbb indítsa el a pénzügyi nyilvántartást.' using errcode='22023';end if;
 if (p_command->>'revision')::bigint is distinct from a.revision then raise exception 'A pénzügyi adatok megváltoztak. Kérj új előnézetet.' using errcode='40001';end if;
 state:=erp_private.finance_state(a.id);profit:=erp_private.finance_profit(project);
 if kind='document' then
 if p_command->>'document_kind' not in('intent','request','invoice_request') or (role='client' and p_command->>'document_kind'<>'intent') then raise exception 'Nem engedélyezett igény.' using errcode='42501';end if;
 elsif kind='decision' then
 select * into d from erp.finance_documents where organization_id=org and account_id=a.id and id=(p_command->>'document_id')::uuid;
 if d.id is null then raise exception 'Idegen pénzügyi igény.' using errcode='42501';end if;
 if d.revision is distinct from (p_command->>'document_revision')::bigint or d.state not in('open','disputed','accepted') then raise exception 'Az igény megváltozott.' using errcode='40001';end if;
 if p_command->>'decision' not in('accepted','disputed','withdrawn') then raise exception 'Érvénytelen döntés.' using errcode='22023';end if;
 if p_command->>'decision'='withdrawn' then if d.author_id<>person and role<>'office' then raise exception 'Csak saját igényt vonhatsz vissza.' using errcode='42501';end if;
 elsif (d.kind='intent' and role<>'office') or (d.kind in('request','invoice_request') and role<>'client') then raise exception 'Az ellenoldal döntése szükséges.' using errcode='42501';end if;
 if p_command->>'decision'='disputed' and length(btrim(coalesce(p_command->>'reason','')))=0 then raise exception 'Vitatáskor írd le az indokot.' using errcode='22023';end if;
 return jsonb_build_object('kind',kind,'document',to_jsonb(d),'after',p_command->>'decision','account_revision',a.revision);
 end if;
 if kind in('document','receipt','advance','refund') then
 if p_command->>'amount' is null or p_command->>'amount' !~ '^[0-9]{1,20}(\.[0-9]{1,2})?$' or (p_command->>'amount')::numeric<=0 or (p_command->>'amount')::numeric>=1e20 then raise exception 'Pozitív forintösszeget adj meg, legfeljebb két tizedessel.' using errcode='22023';end if;
 if p_command->>'method' not in('cash','transfer') or p_command->>'billing_kind' not in('person','company','condominium') or length(btrim(coalesce(p_command->>'billing_name',''))) not between 1 and 200 or length(coalesce(p_command->>'billing_address',''))>500 or length(coalesce(p_command->>'tax_number',''))>40 then raise exception 'Ellenőrizd a fizetési és számlázási adatokat.' using errcode='22023';end if;
 value:=(p_command->>'amount')::numeric;
 if kind<>'document' then
 day:=(p_command->>'work_date')::date;if day is null or day>(clock_timestamp() at time zone 'Europe/Budapest')::date or day<'2000-01-01' then raise exception 'A pénzmozgás napja nem lehet jövőbeli.' using errcode='22023';end if;
 if kind='refund' then if length(btrim(coalesce(p_command->>'reason','')))=0 or value>(state->>'paid')::numeric then raise exception 'Visszafizetéshez indok és elegendő korábbi befizetés szükséges.' using errcode='22023';end if;value:=-value;end if;
 if p_command->>'document_id' is not null then
 select * into d from erp.finance_documents where organization_id=org and account_id=a.id and id=(p_command->>'document_id')::uuid;
 if exists(select 1 from erp.maintenance_cash_claims mc where mc.finance_document_id=d.id and (mc.state in('withdrawn','rejected') or mc.method<>p_command->>'method')) then raise exception 'A jelzés visszavont, elutasított vagy más fizetési módhoz tartozik.' using errcode='22023';end if;
 if d.id is null or d.state in('withdrawn','confirmed') then raise exception 'A kapcsolt igény nem igazolható.' using errcode='22023';end if;end if;
 end if;
 return jsonb_build_object('kind',kind,'amount',value::text,'balance_after',((state->>'balance')::numeric-case when kind='document' then 0 else value end)::text,'document',p_command,'account_revision',a.revision);
 end if;
 if kind='reverse' then
 select * into old from erp.payment_entries where organization_id=org and account_id=a.id and id=(p_command->>'reverses_id')::uuid;
 if old.id is null then raise exception 'Idegen pénztétel.' using errcode='42501';end if;
 if exists(select 1 from erp.payment_entries where reverses_id=old.id) or length(btrim(coalesce(p_command->>'reason','')))=0 then raise exception 'A tétel már visszavont vagy hiányzik az indok.' using errcode='22023';end if;
 value:=-old.amount;if (state->>'paid')::numeric+value<0 then raise exception 'Ez a visszavonás negatív tényleges befizetést eredményezne.' using errcode='22023';end if;
 return jsonb_build_object('kind',kind,'original',to_jsonb(old),'amount',value::text,'balance_after',((state->>'balance')::numeric-value)::text,'account_revision',a.revision);end if;
 if kind='close' then
 if a.closed or p_ctx->'project'->>'status'<>'running' or exists(select 1 from jsonb_array_elements(state->'contract'->'lines')x where not (x->>'accepted')::boolean) or not (profit->>'complete')::boolean then raise exception 'Lezáráshoz futó munka, minden ügyfélátvétel és teljes eredményszámítás szükséges.' using errcode='22023';end if;
 elsif kind='reopen' then if not a.closed or length(btrim(coalesce(p_command->>'reason','')))=0 then raise exception 'Újranyitáshoz lezárt munka és indok szükséges.' using errcode='22023';end if;
 elsif kind='correct' then if not a.closed or not (profit->>'complete')::boolean or length(btrim(coalesce(p_command->>'reason','')))=0 then raise exception 'Zárási korrekcióhoz teljes adat és indok szükséges.' using errcode='22023';end if;
 elsif kind='paid' then if not (state->>'can_mark_paid')::boolean then raise exception 'A teljes munka még nincs igazoltan kifizetve.' using errcode='22023';end if;
 end if;
 return jsonb_build_object('kind',kind,'account',state,'profit',profit,'reason',coalesce(p_command->>'reason',''));
end$$;

create function erp_private.maint_sheet_finance() returns trigger language plpgsql security definer set search_path='' as $$declare acc uuid;begin
 if new.published_version is null or (old.published_version is not distinct from new.published_version and old.state=new.state) then return new;end if;
 insert into erp.finance_accounts(organization_id,project_id) values(new.organization_id,new.project_id) on conflict(organization_id,project_id) do nothing;
 select id into acc from erp.finance_accounts where organization_id=new.organization_id and project_id=new.project_id;perform erp_private.finance_refresh(acc,new.last_event,new.author_id);return new;
end$$;
create trigger maintenance_finance_publication after update of published_version,state on erp.maintenance_worksheets for each row execute function erp_private.maint_sheet_finance();
create function erp_private.maint_payment_confirmation() returns trigger language plpgsql security definer set search_path='' as $$declare claim erp.maintenance_cash_claims;value numeric;project uuid;person uuid;actor uuid;event uuid:=gen_random_uuid();begin
 for claim in select c.* from erp.maintenance_cash_claims c join erp.finance_documents d on d.organization_id=c.organization_id and d.id=c.finance_document_id where d.account_id=new.account_id order by c.id for update of c loop
 select coalesce(sum(p.amount),0) into value from erp.payment_entries p where p.document_id=claim.finance_document_id and erp_private.finance_payment_root(p.id) in('receipt','advance');
 if claim.confirmed_amount is not distinct from value then continue;end if;
 update erp.maintenance_cash_claims set confirmed_amount=value,state=case when value>=amount then 'confirmed' when value>0 then 'partial' else 'pending' end,last_payment_id=new.id where id=claim.id;
 select project_id into project from erp.maintenance_worksheets where id=claim.worksheet_id;select auth_user_id into actor from erp.user_accounts where organization_id=new.organization_id and person_id=new.actor_id limit 1;
 if actor is not null then
 insert into erp.maintenance_events(id,organization_id,project_id,worksheet_id,actor_id,actor_auth_id,active_role,kind,request_hash,command,data,result) values(event,new.organization_id,project,claim.worksheet_id,new.actor_id,actor,'office','payment_confirmation',md5(new.id::text),'{}',jsonb_build_object('payment_id',new.id,'claim_id',claim.id),jsonb_build_object('confirmed_amount',value::text));
 perform erp_private.maint_notify(new.organization_id,project,claim.worksheet_id,event,'payment_confirmation',new.actor_id);event:=gen_random_uuid();end if;
 end loop;return new;
end$$;
create trigger maintenance_payment_confirmation after insert on erp.payment_entries for each row execute function erp_private.maint_payment_confirmation();
-- Alapértelmezetten minden közvetlen elérés tiltott; csak az ellenőrzött ERP-kiszolgáló hívhatja az RPC-ket.
do $$declare r record;begin
 for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='erp_private' and p.proname like 'maint_%') or (n.nspname='public' and p.proname like 'erp_maintenance_%') loop execute format('revoke all on function %s from public,anon,authenticated,service_role',r.signature);if r.signature::text like 'erp_maintenance_%' or r.signature::text like 'public.erp_maintenance_%' then execute format('grant execute on function %s to service_role',r.signature);end if;end loop;
end$$;
commit;
