-- PDF 16–17: saját ERP pénzügy, eredmény és éves jutalék. Jóváhagyva 2026-11-04.
begin;
alter table erp.garden_projects drop constraint work_lifecycle;
alter table erp.garden_projects add constraint work_lifecycle check((work_type='construction' and work_status in('preparation','waiting_start','running','closed','cancelled')) or (work_type='maintenance' and work_status in('requested','confirmed','cancelled')));
create table erp.finance_accounts(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,project_id uuid not null,revision bigint not null default 1,
 closed boolean not null default false,paid_marked boolean not null default false,closed_at timestamptz,updated_at timestamptz not null default clock_timestamp(),
 unique(organization_id,id),unique(organization_id,project_id),foreign key(organization_id,project_id) references erp.garden_projects(organization_id,id));
create table erp.receivable_versions(
 organization_id uuid not null,account_id uuid not null,version bigint not null,source_event uuid,source_hash text not null,document jsonb not null,delta numeric(22,2) not null,created_at timestamptz not null default clock_timestamp(),
 primary key(account_id,version),foreign key(organization_id,account_id) references erp.finance_accounts(organization_id,id));
create table erp.finance_documents(
 id uuid primary key,organization_id uuid not null,account_id uuid not null,kind text not null check(kind in('intent','request','invoice_request')),
 amount numeric(22,2) not null check(amount>0),method text not null check(method in('cash','transfer')),billing_kind text not null check(billing_kind in('person','company','condominium')),
 billing_name text not null check(length(btrim(billing_name)) between 1 and 200),billing_address text not null default '' check(length(billing_address)<=500),tax_number text not null default '' check(length(tax_number)<=40),
 note text not null default '' check(length(note)<=4000),state text not null default 'open' check(state in('open','accepted','disputed','withdrawn','confirmed')),revision bigint not null default 1,
 author_id uuid not null,created_at timestamptz not null default clock_timestamp(),unique(organization_id,id),
 foreign key(organization_id,account_id) references erp.finance_accounts(organization_id,id),foreign key(organization_id,author_id) references erp.persons(organization_id,id));
create index finance_documents_account on erp.finance_documents(organization_id,account_id,created_at desc,id);
create index finance_documents_author on erp.finance_documents(organization_id,author_id);
create table erp.finance_decisions(
 id uuid primary key,organization_id uuid not null,document_id uuid not null,actor_id uuid not null,active_role text not null,decision text not null,reason text not null default '',created_at timestamptz not null default clock_timestamp(),
 foreign key(organization_id,document_id) references erp.finance_documents(organization_id,id),foreign key(organization_id,actor_id) references erp.persons(organization_id,id));
create index finance_decisions_document on erp.finance_decisions(organization_id,document_id,created_at,id);
create index finance_decisions_actor on erp.finance_decisions(organization_id,actor_id);
create table erp.payment_entries(
 id uuid primary key,organization_id uuid not null,account_id uuid not null,document_id uuid,kind text not null check(kind in('receipt','advance','refund','reverse')),
 amount numeric(22,2) not null check(amount<>0),method text not null check(method in('cash','transfer')),work_date date not null,
 billing_kind text not null check(billing_kind in('person','company','condominium')),billing_name text not null check(length(btrim(billing_name)) between 1 and 200),billing_address text not null default '',tax_number text not null default '',
 reference text not null default '' check(length(reference)<=200),reason text not null default '' check(length(reason)<=4000),reverses_id uuid unique,actor_id uuid not null,created_at timestamptz not null default clock_timestamp(),
 unique(organization_id,id),foreign key(organization_id,account_id) references erp.finance_accounts(organization_id,id),foreign key(organization_id,document_id) references erp.finance_documents(organization_id,id),
 foreign key(organization_id,reverses_id) references erp.payment_entries(organization_id,id),foreign key(organization_id,actor_id) references erp.persons(organization_id,id),
 check((kind in('receipt','advance') and amount>0) or (kind='refund' and amount<0) or kind='reverse'));
create index payment_entries_account on erp.payment_entries(organization_id,account_id,created_at desc,id);
create index payment_entries_document on erp.payment_entries(organization_id,document_id);
create index payment_entries_reverse on erp.payment_entries(organization_id,reverses_id);
create index payment_entries_actor on erp.payment_entries(organization_id,actor_id);
create table erp.finance_events(
 id uuid primary key,organization_id uuid not null,account_id uuid,actor_id uuid not null,actor_auth_id uuid not null,active_role text not null,kind text not null,
 request_hash text not null,document jsonb not null,result jsonb not null,created_at timestamptz not null default clock_timestamp(),
 unique(organization_id,id),foreign key(organization_id,account_id) references erp.finance_accounts(organization_id,id),foreign key(organization_id,actor_id) references erp.persons(organization_id,id));
create index finance_events_account on erp.finance_events(organization_id,account_id,created_at desc,id);
create index finance_events_actor on erp.finance_events(organization_id,actor_id);
create table erp.finance_notifications(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,account_id uuid not null,event_id uuid not null,recipient_id uuid not null,created_at timestamptz not null default clock_timestamp(),completed_at timestamptz,
 unique(event_id,recipient_id),foreign key(organization_id,account_id) references erp.finance_accounts(organization_id,id),foreign key(organization_id,event_id) references erp.finance_events(organization_id,id),foreign key(organization_id,recipient_id) references erp.persons(organization_id,id));
create index finance_notes_recipient on erp.finance_notifications(organization_id,recipient_id,created_at,id);
create index finance_notes_account on erp.finance_notifications(organization_id,account_id);
create table erp.profit_snapshots(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,account_id uuid not null,version bigint not null,source_hash text not null,kind text not null check(kind in('live','close','correction')),
 document jsonb not null,reason text not null default '',actor_id uuid,created_at timestamptz not null default clock_timestamp(),
 unique(organization_id,id),unique(account_id,version),foreign key(organization_id,account_id) references erp.finance_accounts(organization_id,id),foreign key(organization_id,actor_id) references erp.persons(organization_id,id));
create index profit_snapshots_actor on erp.profit_snapshots(organization_id,actor_id);
create table erp.finance_policy_versions(
 organization_id uuid not null references erp.organizations(id),version bigint not null,profit_worker boolean not null default false,profit_lead boolean not null default false,commission_active boolean not null default false,
 commission_basis text not null default 'both' check(commission_basis in('labor','material','both')),actor_id uuid not null,reason text not null default '',created_at timestamptz not null default clock_timestamp(),
 primary key(organization_id,version),foreign key(organization_id,actor_id) references erp.persons(organization_id,id));
create index finance_policy_actor on erp.finance_policy_versions(organization_id,actor_id);
create table erp.commission_project_versions(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,account_id uuid not null,profit_id uuid not null,year integer not null check(year between 2000 and 9999),version bigint not null,
 source_hash text not null,basis text not null,amount numeric(22,2),complete boolean not null,source jsonb not null,created_at timestamptz not null default clock_timestamp(),
 unique(organization_id,id),unique(account_id,version),foreign key(organization_id,account_id) references erp.finance_accounts(organization_id,id),foreign key(organization_id,profit_id) references erp.profit_snapshots(organization_id,id));
create index commission_project_profit on erp.commission_project_versions(organization_id,profit_id);
create index commission_project_year on erp.commission_project_versions(organization_id,year,account_id,version desc);
create table erp.commission_person_entries(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,project_version_id uuid not null,person_id uuid not null,amount numeric(22,2) not null,weight numeric(40,6) not null,created_at timestamptz not null default clock_timestamp(),
 unique(project_version_id,person_id),foreign key(organization_id,project_version_id) references erp.commission_project_versions(organization_id,id),foreign key(organization_id,person_id) references erp.persons(organization_id,id));
create index commission_person_owner on erp.commission_person_entries(organization_id,person_id,project_version_id);
create table erp.commission_year_settlements(
 id uuid primary key,organization_id uuid not null,person_id uuid not null,year integer not null check(year between 2000 and 9999),kind text not null check(kind in('settle','payout','reverse')),
 amount numeric(22,2) not null,source jsonb not null,reverses_id uuid unique,actor_id uuid not null,reason text not null default '',created_at timestamptz not null default clock_timestamp(),
 unique(organization_id,id),foreign key(organization_id,person_id) references erp.persons(organization_id,id),foreign key(organization_id,actor_id) references erp.persons(organization_id,id),foreign key(organization_id,reverses_id) references erp.commission_year_settlements(organization_id,id));
create index commission_year_owner on erp.commission_year_settlements(organization_id,person_id,year,created_at desc,id);
create index commission_year_actor on erp.commission_year_settlements(organization_id,actor_id);
create index commission_year_reverse on erp.commission_year_settlements(organization_id,reverses_id);
do $$declare t text;begin foreach t in array array['finance_accounts','receivable_versions','finance_documents','finance_decisions','payment_entries','finance_events','finance_notifications','profit_snapshots','finance_policy_versions','commission_project_versions','commission_person_entries','commission_year_settlements'] loop
 execute format('alter table erp.%I enable row level security',t);execute format('alter table erp.%I force row level security',t);execute format('revoke all on erp.%I from public,anon,authenticated,service_role',t);end loop;end$$;
create function erp_private.finance_immutable() returns trigger language plpgsql security invoker set search_path='' as $$begin raise exception 'A pénzügyi előzmény megőrzött; külön korrekciót rögzíts.' using errcode='42501';end$$;
do $$declare t text;begin foreach t in array array['receivable_versions','finance_decisions','payment_entries','finance_events','profit_snapshots','finance_policy_versions','commission_project_versions','commission_person_entries','commission_year_settlements'] loop execute format('create trigger finance_history before update or delete on erp.%I for each row execute function erp_private.finance_immutable()',t);end loop;end$$;
create function erp_private.finance_policy(p_org uuid) returns jsonb language sql stable security definer set search_path='' as $$select coalesce((select jsonb_build_object('version',version,'profit_worker',profit_worker,'profit_lead',profit_lead,'commission_active',commission_active,'commission_basis',commission_basis) from erp.finance_policy_versions where organization_id=p_org order by version desc limit 1),'{"version":0,"profit_worker":false,"profit_lead":false,"commission_active":false,"commission_basis":"both"}'::jsonb)$$;
create function erp_private.finance_scope(p_org uuid,p_actor uuid,p_session uuid,p_project uuid,p_role text) returns jsonb language plpgsql stable security definer set search_path='' as $$
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
 select * into g from erp.garden_projects where organization_id=p_org and id=p_project and work_type='construction' and accepted_quote_id is not null;if not found then raise exception 'A kertépítés nem elérhető.' using errcode='42501';end if;
 if p_role='client' and not exists(select 1 from erp.client_site_access s where s.organization_id=p_org and s.account_id=ca.id and s.active and s.source_customer_id=g.source_customer_id and s.source_location_id=g.source_location_id) then raise exception 'Ez nem a saját munkád.' using errcode='42501';end if;
 if p_role in('construction_worker','gardener','construction_lead') and not office and not exists(select 1 from erp.project_assignments a where a.organization_id=p_org and a.project_id=g.id and a.person_id=person and a.role=p_role and a.revoked_at is null and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now())) then raise exception 'Nincs érvényes munkamegbízás.' using errcode='42501';end if;
 end if;
 return jsonb_build_object('organization_id',p_org,'person_id',person,'role',p_role,'office',p_role='office','can_finance',p_role in('office','client'),'can_profit',p_role='office' or (p_role='construction_lead' and (policy->>'profit_lead')::boolean) or (p_role in('construction_worker','gardener') and (policy->>'profit_worker')::boolean),'can_commission',p_role='office' or (p_role in('construction_worker','gardener','construction_lead') and (policy->>'commission_active')::boolean),'policy',case when p_role='client' then '{}'::jsonb else policy end,'project',case when p_project is null then null else jsonb_build_object('id',g.id,'name',g.name,'address',g.site_address,'customer',g.customer_name,'status',g.work_status) end);
end$$;
create function erp_private.finance_contract(p_project uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare g erp.garden_projects;v erp.quote_versions;s jsonb;l jsonb;t erp.project_tasks;lines jsonb:='[]';cumulative numeric:=0;vat_before numeric:=0;line_vat numeric;net numeric;base numeric;vat numeric;accepted boolean;accepted_net numeric:=0;accepted_gross numeric:=0;begin
 select * into g from erp.garden_projects where id=p_project;select * into v from erp.quote_versions where organization_id=g.organization_id and quote_id=g.accepted_quote_id and version=g.accepted_quote_version;
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
create function erp_private.finance_profit(p_project uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare g erp.garden_projects;v erp.quote_versions;tim jsonb;mat jsonb;rate numeric;labor numeric;material numeric;complete boolean;begin
 select * into g from erp.garden_projects where id=p_project;select * into v from erp.quote_versions where organization_id=g.organization_id and quote_id=g.accepted_quote_id and version=g.accepted_quote_version;
 tim:=erp_private.worksheet_summary(p_project);mat:=erp_private.material_cost(g.organization_id,p_project);rate:=(v.input->>'hourly_rate')::numeric;
 labor:=case when rate>0 and tim->>'planned_minutes' is not null then round(((tim->>'planned_minutes')::numeric-(tim->>'actual_minutes')::numeric)/60*rate,2) else null end;
 material:=(mat->>'difference')::numeric;complete:=labor is not null and material is not null and (mat->>'complete')::boolean;
 return jsonb_build_object('quote_version',g.accepted_quote_version,'hourly_rate',rate::text,'planned_minutes',tim->>'planned_minutes','actual_minutes',tim->>'actual_minutes','labor',labor::text,'material',material::text,'total',case when complete then (labor+material)::text else null end,'complete',complete,'missing_prices',mat->'missing_prices','material_policy',mat->'policy','material_charged',mat->>'charged','material_quoted',mat->>'quoted');
end$$;
create function erp_private.finance_refresh(p_account uuid,p_event uuid default null,p_actor uuid default null,p_kind text default 'live',p_reason text default '') returns void language plpgsql security definer set search_path='' as $$
declare a erp.finance_accounts;contract jsonb;oldcontract erp.receivable_versions;profit jsonb;ps erp.profit_snapshots;oldprofit erp.profit_snapshots;policy jsonb;pool numeric;weights jsonb:='{}';task erp.project_tasks;doc jsonb;share jsonb;subject uuid;weight numeric;total_weight numeric:=0;assigned numeric:=0;cv uuid;cvnum bigint;signature text;prior_signature text;yearnum int;cum numeric:=0;allocated numeric:=0;part numeric;item record;final boolean;begin
 select * into a from erp.finance_accounts where id=p_account for update;if not found then return;end if;
 contract:=erp_private.finance_contract(a.project_id);select * into oldcontract from erp.receivable_versions where account_id=a.id order by version desc limit 1;
 if oldcontract.source_hash is distinct from md5(contract::text) then
 insert into erp.receivable_versions(organization_id,account_id,version,source_event,source_hash,document,delta) values(a.organization_id,a.id,coalesce(oldcontract.version,0)+1,p_event,md5(contract::text),contract,(contract->>'accepted_gross')::numeric-coalesce((oldcontract.document->>'accepted_gross')::numeric,0));
 update erp.finance_accounts set revision=revision+1,paid_marked=false,updated_at=clock_timestamp() where id=a.id;
 end if;
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
create function erp_private.finance_source_change() returns trigger language plpgsql security definer set search_path='' as $$
declare project uuid;org uuid;acc record;actor uuid;event uuid;begin
 if tg_table_name in('task_events','construction_worksheet_events') then project:=new.project_id;event:=new.id;
 elsif tg_table_name='material_movements' then select p.project_id into project from erp.material_lots lot join erp.project_material_lines l on l.id=lot.line_id join erp.project_material_plans p on p.id=l.plan_id where lot.id=new.lot_id;event:=new.id;
 elsif tg_table_name='garden_projects' then project:=new.id;
 else org:=new.organization_id;end if;
 for acc in select id from erp.finance_accounts where (project is not null and project_id=project) or (org is not null and organization_id=org) order by id loop perform erp_private.finance_refresh(acc.id,event);end loop;return new;
end$$;
create trigger finance_task_source after insert on erp.task_events for each row execute function erp_private.finance_source_change();
create trigger finance_time_source after insert on erp.construction_worksheet_events for each row execute function erp_private.finance_source_change();
create trigger finance_material_source after insert on erp.material_movements for each row execute function erp_private.finance_source_change();
create trigger finance_material_policy after insert on erp.material_cost_policy_versions for each row execute function erp_private.finance_source_change();
create trigger finance_project_source after update of accepted_quote_version,work_status on erp.garden_projects for each row execute function erp_private.finance_source_change();
create trigger finance_policy_source after insert on erp.finance_policy_versions for each row execute function erp_private.finance_source_change();
create function erp_private.finance_payment_root(p_id uuid) returns text language sql stable security definer set search_path='' as $$with recursive chain as(select id,reverses_id,kind from erp.payment_entries where id=p_id union all select p.id,p.reverses_id,p.kind from erp.payment_entries p join chain c on p.id=c.reverses_id) select kind from chain where reverses_id is null limit 1$$;
create function erp_private.finance_state(p_account uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare a erp.finance_accounts;c jsonb;paid numeric;advance numeric;begin
 select * into a from erp.finance_accounts where id=p_account;c:=erp_private.finance_contract(a.project_id);
 select coalesce(sum(amount),0),coalesce(sum(amount) filter(where erp_private.finance_payment_root(id)='advance'),0) into paid,advance from erp.payment_entries where account_id=a.id;
 return jsonb_build_object('account_id',a.id,'revision',a.revision,'closed',a.closed,'paid_marked',a.paid_marked,'closed_at',a.closed_at,'contract',c,'paid',paid::text,'advance',advance::text,'balance',((c->>'accepted_gross')::numeric-paid)::text,'total_outstanding',((c->>'gross')::numeric-paid)::text,'can_mark_paid',paid>=(c->>'gross')::numeric);
end$$;
create function public.erp_finance_read(p_org uuid,p_actor uuid,p_session uuid,p_project uuid,p_role text,p_filter jsonb default '{}') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ctx jsonb;a erp.finance_accounts;state jsonb;profit jsonb;frozen erp.profit_snapshots;rows jsonb;begin
 ctx:=erp_private.finance_scope(p_org,p_actor,p_session,p_project,p_role);
 if not (ctx->>'can_finance')::boolean and not (ctx->>'can_profit')::boolean then raise exception 'Ehhez a kimutatáshoz nincs hozzáférésed.' using errcode='42501';end if;
 select * into a from erp.finance_accounts where organization_id=p_org and project_id=p_project;
 if a.id is null then return jsonb_build_object('context',ctx,'account',null);end if;
 state:=erp_private.finance_state(a.id);
 if (ctx->>'can_profit')::boolean then profit:=erp_private.finance_profit(p_project);select * into frozen from erp.profit_snapshots where account_id=a.id order by version desc limit 1;end if;
 return jsonb_build_object('context',ctx,'account',case when (ctx->>'can_finance')::boolean then state else jsonb_build_object('account_id',a.id,'revision',a.revision,'closed',a.closed) end,
 'profit',profit,'profit_snapshot',case when frozen.id is null then null else jsonb_build_object('id',frozen.id,'version',frozen.version,'kind',frozen.kind,'document',frozen.document,'correction_needed',a.closed and frozen.source_hash<>md5(profit::text)) end,
 'documents',case when (ctx->>'can_finance')::boolean then coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc) from(select d.id,d.kind,d.amount::text,d.method,d.billing_kind,d.billing_name,d.billing_address,d.tax_number,d.note,d.state,d.revision,d.created_at,d.author_id from erp.finance_documents d where d.account_id=a.id and (p_filter->>'before_time' is null or (d.created_at,d.id)<((p_filter->>'before_time')::timestamptz,(p_filter->>'before_id')::uuid)) order by d.created_at desc,d.id desc limit 100)x),'[]') else '[]' end,
 'payments',case when (ctx->>'can_finance')::boolean then coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc) from(select p.id,p.document_id,p.kind,p.amount::text,p.method,p.work_date,p.billing_kind,p.billing_name,p.billing_address,p.tax_number,p.reference,p.reason,p.reverses_id,p.created_at from erp.payment_entries p where p.account_id=a.id and (p_filter->>'payment_time' is null or (p.created_at,p.id)<((p_filter->>'payment_time')::timestamptz,(p_filter->>'payment_id')::uuid)) order by p.created_at desc,p.id desc limit 100)x),'[]') else '[]' end,
 'history',case when (ctx->>'can_finance')::boolean then coalesce((select jsonb_agg(to_jsonb(x) order by x.version desc) from(select version,delta::text,created_at,document->>'accepted_gross' accepted_gross from erp.receivable_versions where account_id=a.id and (p_filter->>'before_version' is null or version<(p_filter->>'before_version')::bigint) order by version desc limit 100)x),'[]') else '[]' end,
 'decisions',case when (ctx->>'can_finance')::boolean then coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc) from(select d.id,d.document_id,d.decision,d.reason,d.active_role,d.created_at from erp.finance_decisions d join erp.finance_documents fd on fd.id=d.document_id where fd.account_id=a.id and (p_filter->>'decision_time' is null or (d.created_at,d.id)<((p_filter->>'decision_time')::timestamptz,(p_filter->>'decision_id')::uuid)) order by d.created_at desc,d.id desc limit 100)x),'[]') else '[]' end);
end$$;
create function public.erp_finance_projects(p_org uuid,p_actor uuid,p_session uuid,p_role text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare ctx jsonb;g record;result jsonb:='[]';begin
 ctx:=erp_private.finance_scope(p_org,p_actor,p_session,null,p_role);
 for g in select * from erp.garden_projects where organization_id=p_org and work_type='construction' and accepted_quote_id is not null order by name,id loop
 begin ctx:=erp_private.finance_scope(p_org,p_actor,p_session,g.id,p_role);if (ctx->>'can_finance')::boolean or (ctx->>'can_profit')::boolean then result:=result||jsonb_build_array(ctx->'project');end if;exception when insufficient_privilege then null;end;end loop;return result;
end$$;
create function public.erp_finance_year(p_org uuid,p_actor uuid,p_session uuid,p_role text,p_year integer,p_filter jsonb default '{}') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ctx jsonb;rows jsonb;settlements jsonb;summary jsonb;rowcount int;settlementcount int;offsetrow int:=coalesce((p_filter->>'offset')::int,0);offsetsettlement int:=coalesce((p_filter->>'settlement_offset')::int,0);begin
 ctx:=erp_private.finance_scope(p_org,p_actor,p_session,null,p_role);if not (ctx->>'can_commission')::boolean then raise exception 'A jutalék jelenleg nem látható.' using errcode='42501';end if;
 if offsetrow<0 or offsetsettlement<0 then raise exception 'Érvénytelen lapozás.' using errcode='22023';end if;
 if p_year<2000 or p_year>9999 then raise exception 'Érvénytelen év.' using errcode='22023';end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.name,x.project_name,x.person_id),'[]') into rows from(
 select e.person_id,n.display_name name,g.name project_name,g.id project_id,v.year,e.amount::text,v.complete,(v.source->>'final')::boolean final,v.id version_id,v.source->>'unallocated_weight' unallocated_weight
 from erp.commission_project_versions v join erp.finance_accounts a on a.id=v.account_id join erp.garden_projects g on g.id=a.project_id join erp.commission_person_entries e on e.project_version_id=v.id join erp.persons n on n.organization_id=e.organization_id and n.id=e.person_id
 where v.organization_id=p_org and v.year=p_year and v.version=(select max(z.version) from erp.commission_project_versions z where z.account_id=v.account_id) and (p_role='office' or e.person_id=(ctx->>'person_id')::uuid))x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc),'[]') into settlements from(select id,person_id,year,kind,amount::text,reverses_id,reason,created_at from erp.commission_year_settlements where organization_id=p_org and year=p_year and (p_role='office' or person_id=(ctx->>'person_id')::uuid) order by created_at desc,id desc)x;
 rowcount:=jsonb_array_length(rows);settlementcount:=jsonb_array_length(settlements);
 select coalesce(jsonb_agg(jsonb_build_object('person_id',x.person_id,'name',x.name,'final',x.final::text,'preliminary',x.preliminary::text) order by x.name,x.person_id),'[]') into summary from(select value->>'person_id' person_id,value->>'name' name,coalesce(sum((value->>'amount')::numeric) filter(where (value->>'final')::boolean),0) final,coalesce(sum((value->>'amount')::numeric) filter(where not (value->>'final')::boolean),0) preliminary from jsonb_array_elements(rows) group by value->>'person_id',value->>'name')x;
 if p_filter->>'full' is distinct from 'true' then
 rows:=coalesce((select jsonb_agg(value order by ordinality) from jsonb_array_elements(rows) with ordinality where ordinality>offsetrow and ordinality<=offsetrow+100),'[]');
 settlements:=coalesce((select jsonb_agg(value order by ordinality) from jsonb_array_elements(settlements) with ordinality where ordinality>offsetsettlement and ordinality<=offsetsettlement+100),'[]');end if;
 return jsonb_build_object('context',ctx,'year',p_year,'rows',rows,'settlements',settlements,'summary',summary,'warnings',case when p_role='office' then coalesce((select jsonb_agg(jsonb_build_object('project_id',g.id,'name',g.name)) from erp.commission_project_versions v join erp.finance_accounts a on a.id=v.account_id join erp.garden_projects g on g.id=a.project_id where v.organization_id=p_org and v.year=p_year and not v.complete and v.version=(select max(z.version) from erp.commission_project_versions z where z.account_id=v.account_id)),'[]') else '[]' end,'row_cursor',case when offsetrow+100<rowcount then offsetrow+100 else null end,'settlement_cursor',case when offsetsettlement+100<settlementcount then offsetsettlement+100 else null end,'people',case when p_role='office' then coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.display_name) order by p.display_name,p.id) from erp.persons p where p.organization_id=p_org and exists(select 1 from erp.person_roles r where r.person_id=p.id and r.organization_id=p_org and r.role in('worker','office'))),'[]') else '[]' end);
end$$;
create function erp_private.finance_prepare(p_ctx jsonb,p_command jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
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
create function public.erp_finance_preview(p_org uuid,p_actor uuid,p_session uuid,p_project uuid,p_role text,p_command jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$declare ctx jsonb;prepared jsonb;begin
 ctx:=erp_private.finance_scope(p_org,p_actor,p_session,p_project,p_role)||jsonb_build_object('actor',p_actor,'session',p_session);
 prepared:=erp_private.finance_prepare(ctx,p_command);return jsonb_build_object('token',md5(jsonb_build_array(ctx->>'person_id',p_role,p_project,p_command,prepared)::text),'document',prepared);
end$$;
create function public.erp_finance_write(p_org uuid,p_actor uuid,p_session uuid,p_project uuid,p_role text,p_request uuid,p_fingerprint text,p_command jsonb,p_preview text,p_confirmed boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare ctx jsonb;prepared jsonb;prior erp.finance_events;a erp.finance_accounts;kind text:=p_command->>'kind';person uuid;policy jsonb;old erp.payment_entries;d erp.finance_documents;result jsonb;recipient uuid;begin
 ctx:=erp_private.finance_scope(p_org,p_actor,p_session,p_project,p_role)||jsonb_build_object('actor',p_actor,'session',p_session);person:=(ctx->>'person_id')::uuid;
 if p_request is null or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' or p_confirmed is distinct from true then raise exception 'Előnézet és kifejezett megerősítés szükséges.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('finance-request:'||p_request::text,0));
 select * into prior from erp.finance_events where id=p_request;if found then
 if prior.organization_id<>p_org or prior.actor_auth_id<>p_actor or prior.active_role<>p_role or prior.request_hash<>p_fingerprint or prior.document<>p_command or (select project_id from erp.finance_accounts where id=prior.account_id) is distinct from p_project then raise exception 'Eltérő ismételt kérés.' using errcode='40001';end if;return prior.result||jsonb_build_object('replayed',true);end if;
 if p_project is not null then perform 1 from erp.garden_projects where organization_id=p_org and id=p_project for update;else perform pg_advisory_xact_lock(hashtextextended('finance-policy:'||p_org::text,0));end if;
 select * into a from erp.finance_accounts where organization_id=p_org and project_id=p_project for update;
 prepared:=public.erp_finance_preview(p_org,p_actor,p_session,p_project,p_role,p_command);
 if prepared->>'token' is distinct from p_preview then raise exception 'Az előnézet megváltozott. Ellenőrizd újra.' using errcode='40001';end if;prepared:=prepared->'document';
 if kind='init' then
 insert into erp.finance_accounts(organization_id,project_id) values(p_org,p_project) returning * into a;perform erp_private.finance_refresh(a.id,p_request,person);
 elsif kind='policy' then
 insert into erp.finance_policy_versions(organization_id,version,profit_worker,profit_lead,commission_active,commission_basis,actor_id,reason) values(p_org,(ctx->'policy'->>'version')::bigint+1,(p_command->>'profit_worker')::boolean,(p_command->>'profit_lead')::boolean,(p_command->>'commission_active')::boolean,p_command->>'commission_basis',person,coalesce(p_command->>'reason',''));
 elsif kind in('settle','payout','year_reverse') then
 insert into erp.commission_year_settlements(id,organization_id,person_id,year,kind,amount,source,reverses_id,actor_id,reason) values(p_request,p_org,(p_command->>'person_id')::uuid,(p_command->>'year')::int,case when kind='year_reverse' then 'reverse' else kind end,(prepared->>'amount')::numeric,prepared->'source',(p_command->>'reverses_id')::uuid,person,coalesce(p_command->>'reason',''));
 elsif kind='document' then
 insert into erp.finance_documents(id,organization_id,account_id,kind,amount,method,billing_kind,billing_name,billing_address,tax_number,note,author_id) values(p_request,p_org,a.id,p_command->>'document_kind',(p_command->>'amount')::numeric,p_command->>'method',p_command->>'billing_kind',btrim(p_command->>'billing_name'),coalesce(p_command->>'billing_address',''),coalesce(p_command->>'tax_number',''),coalesce(p_command->>'reason',''),person);
 elsif kind='decision' then
 insert into erp.finance_decisions(id,organization_id,document_id,actor_id,active_role,decision,reason) values(p_request,p_org,(p_command->>'document_id')::uuid,person,p_role,p_command->>'decision',coalesce(p_command->>'reason',''));
 update erp.finance_documents set state=p_command->>'decision',revision=revision+1 where id=(p_command->>'document_id')::uuid and account_id=a.id;
 elsif kind in('receipt','advance','refund') then
 insert into erp.payment_entries(id,organization_id,account_id,document_id,kind,amount,method,work_date,billing_kind,billing_name,billing_address,tax_number,reference,reason,actor_id) values(p_request,p_org,a.id,(p_command->>'document_id')::uuid,kind,(prepared->>'amount')::numeric,p_command->>'method',(p_command->>'work_date')::date,p_command->>'billing_kind',btrim(p_command->>'billing_name'),coalesce(p_command->>'billing_address',''),coalesce(p_command->>'tax_number',''),coalesce(p_command->>'reference',''),coalesce(p_command->>'reason',''),person);
 if p_command->>'document_id' is not null then
 select * into d from erp.finance_documents where id=(p_command->>'document_id')::uuid;
 if (select coalesce(sum(amount),0) from erp.payment_entries where document_id=d.id)>=d.amount then update erp.finance_documents set state='confirmed',revision=revision+1 where id=d.id;end if;end if;
 elsif kind='reverse' then
 select * into old from erp.payment_entries where id=(p_command->>'reverses_id')::uuid;
 insert into erp.payment_entries(id,organization_id,account_id,document_id,kind,amount,method,work_date,billing_kind,billing_name,billing_address,tax_number,reference,reason,reverses_id,actor_id) values(p_request,p_org,a.id,old.document_id,'reverse',-old.amount,old.method,(clock_timestamp() at time zone 'Europe/Budapest')::date,old.billing_kind,old.billing_name,old.billing_address,old.tax_number,old.reference,p_command->>'reason',old.id,person);
 if old.document_id is not null then update erp.finance_documents set state=case when (select coalesce(sum(amount),0) from erp.payment_entries where document_id=old.document_id)>=amount then 'confirmed' else 'open' end,revision=revision+1 where id=old.document_id;end if;
 elsif kind='close' then
 update erp.finance_accounts set closed=true,closed_at=clock_timestamp() where id=a.id;
 update erp.garden_projects set work_status='closed',active=false,revision=revision+1,updated_at=clock_timestamp() where id=p_project;
 perform erp_private.finance_refresh(a.id,p_request,person,'close',coalesce(p_command->>'reason',''));
 elsif kind='reopen' then
 update erp.finance_accounts set closed=false,closed_at=null,paid_marked=false where id=a.id;
 update erp.garden_projects set work_status='running',active=true,revision=revision+1,updated_at=clock_timestamp() where id=p_project;
 perform erp_private.finance_refresh(a.id,p_request,person,'correction',p_command->>'reason');
 elsif kind='correct' then perform erp_private.finance_refresh(a.id,p_request,person,'correction',p_command->>'reason');
 elsif kind='paid' then update erp.finance_accounts set paid_marked=true where id=a.id;
 end if;
 if a.id is not null then update erp.finance_accounts set revision=revision+1,updated_at=clock_timestamp(),paid_marked=case when kind='paid' then true when kind in('receipt','advance','refund','reverse') then false else paid_marked end where id=a.id;end if;
 result:=jsonb_build_object('success',true,'id',p_request,'kind',kind,'account_id',a.id);
 insert into erp.finance_events(id,organization_id,account_id,actor_id,actor_auth_id,active_role,kind,request_hash,document,result) values(p_request,p_org,a.id,person,p_actor,p_role,kind,p_fingerprint,p_command,result);
 if a.id is not null then
 if kind='decision' or (kind in('receipt','advance') and exists(select 1 from erp.finance_documents where id=(p_command->>'document_id')::uuid and state='confirmed')) then update erp.finance_notifications set completed_at=clock_timestamp() where account_id=a.id and event_id=(p_command->>'document_id')::uuid and completed_at is null;end if;
 for recipient in select p.id from erp.persons p where p.organization_id=p_org and p.active and p.id<>person and ((p_role='client' and exists(select 1 from erp.person_roles r where r.organization_id=p_org and r.person_id=p.id and r.role='office' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now()))) or (p_role='office' and exists(select 1 from erp_private.client_accounts c join erp.client_site_access s on s.account_id=c.id join erp.garden_projects g on g.id=p_project where c.person_id=p.id and c.active and s.active and s.organization_id=p_org and s.source_customer_id=g.source_customer_id and s.source_location_id=g.source_location_id))) loop
 if kind in('document','decision','receipt','advance','refund','reverse') then insert into erp.finance_notifications(organization_id,account_id,event_id,recipient_id,completed_at) values(p_org,a.id,p_request,recipient,case when kind='document' then null else clock_timestamp() end);end if;end loop;end if;
 return result;
end$$;
create function public.erp_finance_notifications(p_actor uuid,p_session uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare m record;n record;ctx jsonb;result jsonb:='[]';role text;begin
 for m in select a.organization_id,a.person_id from erp.user_accounts a join erp.persons p on p.id=a.person_id and p.organization_id=a.organization_id where a.auth_user_id=p_actor and a.active and p.active loop
 role:=case when exists(select 1 from erp.person_roles r where r.organization_id=m.organization_id and r.person_id=m.person_id and r.role='office' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now())) then 'office' else 'client' end;
 for n in select fnote.*,a.project_id from erp.finance_notifications fnote join erp.finance_accounts a on a.id=fnote.account_id where fnote.organization_id=m.organization_id and fnote.recipient_id=m.person_id order by fnote.created_at desc,fnote.id desc limit 100 loop
 begin ctx:=erp_private.finance_scope(m.organization_id,p_actor,p_session,n.project_id,role);result:=result||jsonb_build_array(jsonb_build_object('id',n.id,'project_id',n.project_id,'kind','finance','role',role,'created_at',n.created_at,'completed_at',n.completed_at));exception when insufficient_privilege then null;end;
 end loop;end loop;return result;
end$$;
create function public.erp_finance_options(p_org uuid,p_actor uuid,p_session uuid,p_role text) returns jsonb language sql stable security definer set search_path='' as $$select erp_private.finance_scope(p_org,p_actor,p_session,null,p_role)$$;
create index receivable_account_fk on erp.receivable_versions(organization_id,account_id);
create index profit_account_fk on erp.profit_snapshots(organization_id,account_id);
create index commission_account_fk on erp.commission_project_versions(organization_id,account_id);
create index commission_entry_version_fk on erp.commission_person_entries(organization_id,project_version_id);
create index finance_note_event_fk on erp.finance_notifications(organization_id,event_id);
-- A privilegizált függvényeket csak az ERP-kiszolgáló hívhatja; közvetlen kliensjog nincs.
do $$declare f record;begin for f in select p.oid::regprocedure identity,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','erp_private') and (p.proname like 'erp_finance_%' or p.proname like 'finance_%') loop
 execute format('revoke all on function %s from public,anon,authenticated,service_role',f.identity);if f.nspname='public' then execute format('grant execute on function %s to service_role',f.identity);end if;end loop;end$$;
commit;
