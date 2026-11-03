-- Jóváhagyott saját ERP kertépítési munkalap, PDF 15. fejezet.
begin;
create table erp.construction_worksheets(
 id uuid primary key,organization_id uuid not null,project_id uuid not null,work_date date not null,arrival text not null,departure text not null,
 state text not null default 'active' check(state in('active','voided')),current_version bigint not null default 1,revision bigint not null default 1,
 author_id uuid not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(organization_id,id),unique(organization_id,id,project_id,work_date),foreign key(organization_id,project_id) references erp.garden_projects(organization_id,id),foreign key(organization_id,author_id) references erp.persons(organization_id,id));
create index worksheet_project_day on erp.construction_worksheets(organization_id,project_id,work_date desc,id desc);
create index worksheet_author_fk on erp.construction_worksheets(organization_id,author_id);
create table erp.construction_worksheet_versions(
 organization_id uuid not null,worksheet_id uuid not null,version bigint not null,document jsonb not null,state text not null check(state in('active','voided')),
 actor_id uuid not null,active_role text not null,created_at timestamptz not null default now(),
 primary key(organization_id,worksheet_id,version),foreign key(organization_id,worksheet_id) references erp.construction_worksheets(organization_id,id),check(pg_column_size(document)<524288));
alter table erp.construction_worksheets add constraint worksheet_current_fk foreign key(organization_id,id,current_version) references erp.construction_worksheet_versions(organization_id,worksheet_id,version) deferrable initially deferred;
create index worksheet_current_index on erp.construction_worksheets(organization_id,id,current_version);
create table erp.construction_worksheet_people(
 organization_id uuid not null,worksheet_id uuid not null,person_id uuid not null,project_id uuid not null,work_date date not null,
 start_minute int not null check(start_minute between 0 and 1439),end_minute int not null check(end_minute between 1 and 1439),
 minutes int generated always as (end_minute-start_minute) stored,overridden boolean not null,note text not null default '',
 primary key(organization_id,worksheet_id,person_id),check(end_minute>start_minute),check(length(note)<=2000),
 foreign key(organization_id,worksheet_id,project_id,work_date) references erp.construction_worksheets(organization_id,id,project_id,work_date),foreign key(organization_id,person_id) references erp.persons(organization_id,id));
create index worksheet_person_header_fk on erp.construction_worksheet_people(organization_id,worksheet_id,project_id,work_date);
create index worksheet_person_day on erp.construction_worksheet_people(organization_id,person_id,work_date,start_minute,end_minute);
create index worksheet_person_project on erp.construction_worksheet_people(organization_id,project_id,person_id);
create table erp.construction_worksheet_tasks(
 organization_id uuid not null,worksheet_id uuid not null,person_id uuid not null,task_id uuid not null,
 primary key(organization_id,worksheet_id,person_id,task_id),foreign key(organization_id,worksheet_id,person_id) references erp.construction_worksheet_people(organization_id,worksheet_id,person_id) on delete cascade,
 foreign key(task_id) references erp.project_tasks(id));
create index worksheet_task_fk on erp.construction_worksheet_tasks(task_id);
create table erp.construction_worksheet_events(
 id uuid primary key,organization_id uuid not null,worksheet_id uuid not null,version bigint not null,actor_id uuid not null,actor_auth_id uuid not null,active_role text not null,
 operation text not null check(operation in('create','revise','void','restore')),reason text not null default '',client_fingerprint text not null,result jsonb not null,created_at timestamptz not null default now(),
 foreign key(organization_id,worksheet_id,version) references erp.construction_worksheet_versions(organization_id,worksheet_id,version));
create index worksheet_events_history on erp.construction_worksheet_events(organization_id,worksheet_id,version,created_at desc,id desc);
do $$declare t text;begin foreach t in array array['construction_worksheets','construction_worksheet_versions','construction_worksheet_people','construction_worksheet_tasks','construction_worksheet_events'] loop
 execute format('alter table erp.%I enable row level security',t);execute format('alter table erp.%I force row level security',t);execute format('revoke all on erp.%I from public,anon,authenticated,service_role',t);end loop;end$$;
create trigger worksheet_version_history before update or delete on erp.construction_worksheet_versions for each row execute function erp_private.entry_immutable();
create trigger worksheet_event_history before update or delete on erp.construction_worksheet_events for each row execute function erp_private.entry_immutable();
create function erp_private.worksheet_minute(p_value text) returns int language plpgsql immutable security invoker set search_path='' as $$begin
 if p_value is null or p_value !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Az időpont óra:perc alakú legyen.' using errcode='22023';end if;
 return substring(p_value,1,2)::int*60+substring(p_value,4,2)::int;end$$;
revoke all on function erp_private.worksheet_minute(text) from public,anon,authenticated,service_role;
create function erp_private.worksheet_scope(p_actor uuid,p_session uuid,p_project uuid,p_role text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare ctx jsonb;begin
 ctx:=erp_private.plan_scope(p_actor,p_session,p_project,p_role);
 return ctx||jsonb_build_object('sheet_can_write',p_role in('office','construction_lead') and ctx->'project'->>'status'='running','sheet_people',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.display_name,'active',p.active) order by p.display_name,p.id) from erp.persons p where p.organization_id=(ctx->>'organization_id')::uuid and p.active and (exists(select 1 from erp.person_roles r where r.organization_id=p.organization_id and r.person_id=p.id and r.role='office' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now())) or exists(select 1 from erp.project_assignments a where a.organization_id=p.organization_id and a.project_id=p_project and a.person_id=p.id and a.revoked_at is null and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now())))),'[]'));
end$$;
revoke all on function erp_private.worksheet_scope(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
create function erp_private.worksheet_summary(p_project uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare g erp.garden_projects;planned numeric;actual bigint;people jsonb;begin
 select * into g from erp.garden_projects where id=p_project;
 if exists(select 1 from erp.workplans where project_id=g.id) then
  select case when count(*) filter(where t.planned_minutes is null)>0 then null else coalesce(sum(t.planned_minutes),0) end into planned from erp.project_tasks t join erp.workplans p on p.id=t.plan_id where p.project_id=g.id and erp_private.entry_task_active(t.id);
 else
  select case when count(*)=0 or count(*) filter(where l->>'planned_minutes' is null)>0 then null else coalesce(sum((l->>'planned_minutes')::numeric),0) end into planned from erp.quote_versions q cross join lateral jsonb_array_elements(q.calculation->'sections')s cross join lateral jsonb_array_elements(s->'lines')l where q.organization_id=g.organization_id and q.quote_id=g.accepted_quote_id and q.version=g.accepted_quote_version;
 end if;
 select coalesce(sum(p.minutes),0) into actual from erp.construction_worksheet_people p join erp.construction_worksheets w on w.id=p.worksheet_id where w.organization_id=g.organization_id and w.project_id=g.id and w.state='active';
 select coalesce(jsonb_agg(jsonb_build_object('id',x.person_id,'name',x.display_name,'color',coalesce(c.color,'#287b83'),'minutes',x.minutes::text) order by x.display_name,x.person_id),'[]') into people from(select p.person_id,n.display_name,sum(p.minutes) as minutes from erp.construction_worksheet_people p join erp.construction_worksheets w on w.id=p.worksheet_id join erp.persons n on n.id=p.person_id where w.organization_id=g.organization_id and w.project_id=g.id and w.state='active' group by p.person_id,n.display_name)x left join erp.person_colors c on c.organization_id=g.organization_id and c.person_id=x.person_id;
 return jsonb_build_object('actual_minutes',actual::text,'planned_minutes',planned::text,'people',people);
end$$;
revoke all on function erp_private.worksheet_summary(uuid) from public,anon,authenticated,service_role;
create function erp_private.worksheet_prepare(p_ctx jsonb,p_sheet uuid,p_document jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare org uuid;project uuid;day date;row jsonb;person uuid;personname text;first int;last int;basefirst int;baselast int;people jsonb:='[]';tasks jsonb;task uuid;seen uuid[]:='{}';seen_tasks uuid[];doc jsonb;begin
 org:=(p_ctx->>'organization_id')::uuid;project:=(p_ctx->'project'->>'id')::uuid;
 if jsonb_typeof(p_document) is distinct from 'object' or p_document->>'work_date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Érvénytelen munkanap.' using errcode='22023';end if;day:=(p_document->>'work_date')::date;if day is null then raise exception 'Hiányzó munkanap.' using errcode='22023';end if;
 basefirst:=erp_private.worksheet_minute(p_document->>'arrival');baselast:=erp_private.worksheet_minute(p_document->>'departure');
 if baselast<=basefirst or jsonb_typeof(p_document->'people') is distinct from 'array' or jsonb_array_length(p_document->'people') not between 1 and 100 or length(coalesce(p_document->>'note',''))>12000 then raise exception 'Ellenőrizd az időpárt és a dolgozókat.' using errcode='22023';end if;
 for row in select value from jsonb_array_elements(p_document->'people') loop
  person:=(row->>'person_id')::uuid;
  if person is null or person=any(seen) or (not exists(select 1 from jsonb_array_elements(p_ctx->'sheet_people')p where p->>'id'=person::text) and not exists(select 1 from erp.construction_worksheet_versions v cross join lateral jsonb_array_elements(v.document->'people')p where v.organization_id=org and v.worksheet_id=p_sheet and p->>'person_id'=person::text)) then raise exception 'Idegen, nem hozzárendelt vagy ismétlődő dolgozó.' using errcode='42501';end if;
  seen:=array_append(seen,person);select display_name into personname from erp.persons where organization_id=org and id=person;
  first:=case when coalesce((row->>'override')::boolean,false) then erp_private.worksheet_minute(row->>'arrival') else basefirst end;
  last:=case when coalesce((row->>'override')::boolean,false) then erp_private.worksheet_minute(row->>'departure') else baselast end;
  if last<=first or length(coalesce(row->>'note',''))>2000 or jsonb_typeof(row->'task_ids') is distinct from 'array' or jsonb_array_length(row->'task_ids')>1000 then raise exception 'Ellenőrizd a dolgozó időpárját és munkafázisait.' using errcode='22023';end if;
  tasks:='[]';seen_tasks:='{}';
  for task in select value::uuid from jsonb_array_elements_text(row->'task_ids') loop
   if task=any(seen_tasks) or not exists(select 1 from erp.project_tasks t join erp.workplans p on p.id=t.plan_id where t.id=task and p.project_id=project and (erp_private.entry_task_active(t.id) or exists(select 1 from erp.construction_worksheet_versions old cross join lateral jsonb_array_elements(old.document->'people') op where old.organization_id=org and old.worksheet_id=p_sheet and op->>'person_id'=person::text and op->'task_ids' ? t.id::text))) then raise exception 'Idegen, nem aktuális vagy ismételt munkafázis.' using errcode='42501';end if;
   seen_tasks:=array_append(seen_tasks,task);
   tasks:=tasks||jsonb_build_array((select jsonb_build_object('id',t.id,'title',erp_private.plan_task_json(t)->>'contract_label','section',erp_private.plan_task_json(t)->>'section') from erp.project_tasks t where t.id=task));
  end loop;
  people:=people||jsonb_build_array(jsonb_build_object('person_id',person,'name',personname,'override',coalesce((row->>'override')::boolean,false),'arrival',lpad((first/60)::text,2,'0')||':'||lpad((first%60)::text,2,'0'),'departure',lpad((last/60)::text,2,'0')||':'||lpad((last%60)::text,2,'0'),'start_minute',first,'end_minute',last,'minutes',last-first,'note',btrim(coalesce(row->>'note','')),'task_ids',to_jsonb(seen_tasks),'tasks',tasks));
 end loop;
 select jsonb_agg(p order by p->>'person_id') into people from jsonb_array_elements(people)p;
 doc:=jsonb_build_object('work_date',day,'arrival',p_document->>'arrival','departure',p_document->>'departure','note',btrim(coalesce(p_document->>'note','')),'people',people);
 return doc;
end$$;
revoke all on function erp_private.worksheet_prepare(jsonb,uuid,jsonb) from public,anon,authenticated,service_role;
create function erp_private.worksheet_overlap(p_ctx jsonb,p_sheet uuid,p_document jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$declare rows jsonb;signature text;begin
 select coalesce(jsonb_agg(jsonb_build_object('worksheet_id',w.id,'revision',w.revision,'person_id',p.person_id,'name',n.display_name,'start',p.start_minute,'end',p.end_minute,'own_project',w.project_id=(p_ctx->'project'->>'id')::uuid,'project_name',case when p_ctx->>'role'='office' or w.project_id=(p_ctx->'project'->>'id')::uuid then g.name else null end) order by w.id,p.person_id),'[]') into rows
 from erp.construction_worksheet_people p join erp.construction_worksheets w on w.id=p.worksheet_id join erp.persons n on n.id=p.person_id join erp.garden_projects g on g.id=w.project_id
 join jsonb_array_elements(p_document->'people')x on x->>'person_id'=p.person_id::text
 where w.organization_id=(p_ctx->>'organization_id')::uuid and w.state='active' and w.id<>p_sheet and p.work_date=(p_document->>'work_date')::date and p.start_minute<(x->>'end_minute')::int and p.end_minute>(x->>'start_minute')::int;
 signature:=encode(sha256(convert_to(rows::text,'UTF8')),'hex');return jsonb_build_object('signature',signature,'rows',rows,'count',jsonb_array_length(rows));
end$$;
revoke all on function erp_private.worksheet_overlap(jsonb,uuid,jsonb) from public,anon,authenticated,service_role;

create function public.erp_sheet_read(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_sheet uuid default null,p_version bigint default null,p_from date default null,p_until date default null,p_before date default null,p_before_id uuid default null,p_voided boolean default false,p_event_before timestamptz default null,p_event_before_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ctx jsonb;w erp.construction_worksheets;v erp.construction_worksheet_versions;person uuid;fullview boolean;list jsonb;versions jsonb;events jsonb;doc jsonb;lastrow jsonb;begin
 ctx:=erp_private.worksheet_scope(p_actor,p_session,p_project,p_role);person:=(ctx->>'person_id')::uuid;fullview:=p_role in('office','construction_lead');
 if p_from>p_until or p_version<1 then raise exception 'Érvénytelen időszak vagy változat.' using errcode='22023';end if;
 if p_role='client' and p_sheet is not null then raise exception 'A személyes munkalap nem megrendelői adat.' using errcode='42501';end if;
 if p_sheet is not null then
  select * into w from erp.construction_worksheets where id=p_sheet and organization_id=(ctx->>'organization_id')::uuid and project_id=p_project;
  if not found then raise exception 'A munkalap nem érhető el.' using errcode='42501';end if;
  if not fullview and not exists(select 1 from erp.construction_worksheet_versions x cross join lateral jsonb_array_elements(x.document->'people')p where x.worksheet_id=w.id and p->>'person_id'=person::text) then raise exception 'Ez nem saját munkalap.' using errcode='42501';end if;
  select * into v from erp.construction_worksheet_versions where worksheet_id=w.id and version=coalesce(p_version,w.current_version);
  if not found then raise exception 'Nincs ilyen munkalapváltozat.' using errcode='22023';end if;doc:=v.document;
  if not fullview then
   if p_version is not null and p_version<>w.current_version and not exists(select 1 from jsonb_array_elements(doc->'people')p where p->>'person_id'=person::text) then raise exception 'Ebben a változatban nincs saját sor.' using errcode='42501';end if;
   doc:=jsonb_build_object('work_date',doc->'work_date','people',coalesce((select jsonb_agg(p) from jsonb_array_elements(doc->'people')p where p->>'person_id'=person::text),'[]'));
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('version',x.version,'state',x.state,'created_at',x.created_at,'actor_role',x.active_role,'actor_name',p.display_name) order by x.version desc),'[]') into versions from erp.construction_worksheet_versions x left join erp.persons p on p.id=x.actor_id where x.worksheet_id=w.id and (fullview or x.version=w.current_version or exists(select 1 from jsonb_array_elements(x.document->'people')z where z->>'person_id'=person::text));
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc),'[]') into events from(select e.id,e.version,e.operation,e.active_role,e.created_at,p.display_name as actor_name,case when fullview then e.reason else '' end as reason from erp.construction_worksheet_events e left join erp.persons p on p.id=e.actor_id where e.worksheet_id=w.id and (p_event_before is null or (e.created_at,e.id)<(p_event_before,p_event_before_id)) order by e.created_at desc,e.id desc limit 100)x;
 end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.work_date desc,x.id desc),'[]') into list from(select h.id,h.work_date,h.current_version,h.revision,h.state,h.created_at,h.updated_at,n.display_name as author_name,
 (select coalesce(sum(p.minutes),0) from erp.construction_worksheet_people p where p.worksheet_id=h.id and (fullview or p.person_id=person)) as minutes,
 (select count(*) from erp.construction_worksheet_people p where p.worksheet_id=h.id and (fullview or p.person_id=person)) as people_count
 from erp.construction_worksheets h join erp.persons n on n.id=h.author_id where h.organization_id=(ctx->>'organization_id')::uuid and h.project_id=p_project and p_role<>'client' and (p_voided or h.state='active') and (p_from is null or h.work_date>=p_from) and (p_until is null or h.work_date<=p_until) and (p_before is null or (h.work_date,h.id)<(p_before,p_before_id)) and
 (fullview or exists(select 1 from erp.construction_worksheet_versions z cross join lateral jsonb_array_elements(z.document->'people')p where z.worksheet_id=h.id and p->>'person_id'=person::text)) order by h.work_date desc,h.id desc limit 100)x;
 lastrow:=list->-1;
 return jsonb_build_object('context',ctx,'time',erp_private.worksheet_summary(p_project),'sheets',list,'cursor',case when jsonb_array_length(list)=100 then jsonb_build_object('day',lastrow->>'work_date','id',lastrow->>'id') else null end,
 'tasks',case when p_role='client' then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'title',erp_private.plan_task_json(t)->>'contract_label','section',erp_private.plan_task_json(t)->>'section','active',erp_private.entry_task_active(t.id)) order by t.sort,t.id) from erp.project_tasks t join erp.workplans p on p.id=t.plan_id where p.project_id=p_project),'[]') end,
 'sheet',case when w.id is null then null else jsonb_build_object('id',w.id,'state',w.state,'revision',w.revision,'current_version',w.current_version,'version',v.version,'version_state',v.state,'document',doc,'actor_role',v.active_role,'actor_name',(select display_name from erp.persons where id=v.actor_id),'created_at',v.created_at,'versions',versions,'events',events,'event_cursor',case when jsonb_array_length(events)=100 then jsonb_build_object('time',(events->-1)->>'created_at','id',(events->-1)->>'id') else null end) end);
end$$;
revoke all on function public.erp_sheet_read(uuid,uuid,uuid,text,uuid,bigint,date,date,date,uuid,boolean,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.erp_sheet_read(uuid,uuid,uuid,text,uuid,bigint,date,date,date,uuid,boolean,timestamptz,uuid) to service_role;
create function public.erp_sheet_preview(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_sheet uuid,p_revision bigint,p_operation text,p_document jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$declare ctx jsonb;w erp.construction_worksheets;doc jsonb;begin
 ctx:=erp_private.worksheet_scope(p_actor,p_session,p_project,p_role);
 if not (ctx->>'sheet_can_write')::boolean or p_operation not in('create','revise','restore') then raise exception 'Ehhez nincs munkalaprögzítési jogosultság.' using errcode='42501';end if;
 if p_operation='create' then if p_revision<>0 or exists(select 1 from erp.construction_worksheets where id=p_sheet) then raise exception 'Eltérő új munkalap.' using errcode='40001';end if;
 else
  select * into w from erp.construction_worksheets where id=p_sheet and organization_id=(ctx->>'organization_id')::uuid and project_id=p_project;
  if not found then raise exception 'A munkalap nem érhető el.' using errcode='42501';end if;
  if w.revision<>p_revision or p_operation='restore' and w.state<>'voided' or p_operation='revise' and w.state<>'active' then raise exception 'A munkalap megváltozott.' using errcode='40001';end if;
 end if;
 if p_operation='restore' then select document into p_document from erp.construction_worksheet_versions where worksheet_id=w.id and version=w.current_version;end if;
 doc:=erp_private.worksheet_prepare(ctx,p_sheet,p_document);
 return jsonb_build_object('document',doc,'minutes',(select sum((p->>'minutes')::int) from jsonb_array_elements(doc->'people')p),'overlap',erp_private.worksheet_overlap(ctx,p_sheet,doc));
end$$;
revoke all on function public.erp_sheet_preview(uuid,uuid,uuid,text,uuid,bigint,text,jsonb) from public,anon,authenticated;
grant execute on function public.erp_sheet_preview(uuid,uuid,uuid,text,uuid,bigint,text,jsonb) to service_role;
create function public.erp_sheet_replay(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_request uuid,p_fingerprint text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare ctx jsonb;e erp.construction_worksheet_events;begin
 ctx:=erp_private.worksheet_scope(p_actor,p_session,p_project,p_role);
 if p_role not in('office','construction_lead') then raise exception 'Nem rögzíthetsz munkalapot.' using errcode='42501';end if;
 select * into e from erp.construction_worksheet_events where id=p_request;if not found then return null;end if;
 if e.actor_auth_id<>p_actor or e.active_role<>p_role or e.client_fingerprint<>p_fingerprint or not exists(select 1 from erp.construction_worksheets w where w.id=e.worksheet_id and w.project_id=p_project and w.organization_id=(ctx->>'organization_id')::uuid) then raise exception 'Eltérő ismételt munkalapkérés.' using errcode='40001';end if;
 return e.result||jsonb_build_object('replayed',true);
end$$;
revoke all on function public.erp_sheet_replay(uuid,uuid,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.erp_sheet_replay(uuid,uuid,uuid,text,uuid,text) to service_role;
create function public.erp_sheet_write(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_request uuid,p_sheet uuid,p_revision bigint,p_operation text,p_document jsonb,p_overlap text,p_confirmed boolean,p_fingerprint text,p_reason text default '') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare ctx jsonb;w erp.construction_worksheets;doc jsonb;conflicts jsonb;person uuid;row jsonb;task uuid;org uuid;version bigint;next_state text;result jsonb;replay jsonb;begin
 ctx:=erp_private.worksheet_scope(p_actor,p_session,p_project,p_role);org:=(ctx->>'organization_id')::uuid;
 replay:=public.erp_sheet_replay(p_actor,p_session,p_project,p_role,p_request,p_fingerprint);if replay is not null then return replay;end if;
 if not (ctx->>'sheet_can_write')::boolean then raise exception 'Munkalap csak futó kertépítésben rögzíthető.' using errcode='42501';end if;
 if p_request is null or p_sheet is null or p_revision is null or p_operation not in('create','revise','void','restore') or p_confirmed is not true or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' or length(coalesce(p_reason,''))>4000 then raise exception 'Hiányos vagy nem megerősített munkalapművelet.' using errcode='22023';end if;
 perform 1 from erp.garden_projects where id=p_project for update;
 ctx:=erp_private.worksheet_scope(p_actor,p_session,p_project,p_role);
 replay:=public.erp_sheet_replay(p_actor,p_session,p_project,p_role,p_request,p_fingerprint);if replay is not null then return replay;end if;
 if not (ctx->>'sheet_can_write')::boolean then raise exception 'A munka vagy jogosultság megváltozott.' using errcode='42501';end if;
 if p_operation='create' then
  if p_revision<>0 or exists(select 1 from erp.construction_worksheets where id=p_sheet) then raise exception 'A munkalap már létezik.' using errcode='40001';end if;version:=1;next_state:='active';
 else
  select * into w from erp.construction_worksheets where id=p_sheet and organization_id=org and project_id=p_project for update;
  if not found then raise exception 'A munkalap nem érhető el.' using errcode='42501';end if;
  if w.revision<>p_revision or p_operation in('revise','void') and w.state<>'active' or p_operation='restore' and w.state<>'voided' then raise exception 'A munkalap megváltozott.' using errcode='40001';end if;version:=w.current_version+1;next_state:=case when p_operation='void' then 'voided' else 'active' end;
  if p_operation in('void','restore') then select document into p_document from erp.construction_worksheet_versions where worksheet_id=w.id and version=w.current_version;end if;
  if p_operation='void' and length(btrim(coalesce(p_reason,'')))=0 then raise exception 'Írd le a visszavonás indokát.' using errcode='22023';end if;
 end if;
 -- A személyeket azonos sorrendben zároljuk: két külön projekten sem marad észrevétlen az átfedő mentés.
 for person in select p.id from erp.persons p where p.organization_id=org and (p.id in(select (x->>'person_id')::uuid from jsonb_array_elements(p_document->'people')x) or p.id in(select old.person_id from erp.construction_worksheet_people old where old.worksheet_id=p_sheet)) order by p.id for update loop null;end loop;
 doc:=erp_private.worksheet_prepare(ctx,p_sheet,p_document);conflicts:=erp_private.worksheet_overlap(ctx,p_sheet,doc);
 if p_operation<>'void' and ((conflicts->>'count')::int>0 and p_overlap is null or p_overlap is not null and p_overlap<>conflicts->>'signature') then raise exception 'Az átfedésellenőrzés megváltozott. Kérj új előnézetet és erősítsd meg.' using errcode='40001';end if;
 if p_operation='create' then
  insert into erp.construction_worksheets(id,organization_id,project_id,work_date,arrival,departure,author_id) values(p_sheet,org,p_project,(doc->>'work_date')::date,doc->>'arrival',doc->>'departure',(ctx->>'person_id')::uuid);
 else
  delete from erp.construction_worksheet_people where worksheet_id=w.id;
  update erp.construction_worksheets set work_date=(doc->>'work_date')::date,arrival=doc->>'arrival',departure=doc->>'departure',state=next_state,current_version=version,revision=revision+1,updated_at=clock_timestamp() where id=w.id;
 end if;
 insert into erp.construction_worksheet_versions(organization_id,worksheet_id,version,document,state,actor_id,active_role) values(org,p_sheet,version,doc,next_state,(ctx->>'person_id')::uuid,p_role);
 for row in select value from jsonb_array_elements(doc->'people') loop
  insert into erp.construction_worksheet_people(organization_id,worksheet_id,person_id,project_id,work_date,start_minute,end_minute,overridden,note) values(org,p_sheet,(row->>'person_id')::uuid,p_project,(doc->>'work_date')::date,(row->>'start_minute')::int,(row->>'end_minute')::int,(row->>'override')::boolean,row->>'note');
  for task in select value::uuid from jsonb_array_elements_text(row->'task_ids') loop insert into erp.construction_worksheet_tasks values(org,p_sheet,(row->>'person_id')::uuid,task);end loop;
 end loop;
 select jsonb_build_object('id',h.id,'project_id',h.project_id,'revision',h.revision,'version',h.current_version,'state',h.state,'minutes',(select sum(p.minutes) from erp.construction_worksheet_people p where p.worksheet_id=h.id)) into result from erp.construction_worksheets h where h.id=p_sheet;
 insert into erp.construction_worksheet_events(id,organization_id,worksheet_id,version,actor_id,actor_auth_id,active_role,operation,reason,client_fingerprint,result) values(p_request,org,p_sheet,version,(ctx->>'person_id')::uuid,p_actor,p_role,p_operation,btrim(coalesce(p_reason,'')),p_fingerprint,result);
 return result;
end$$;
revoke all on function public.erp_sheet_write(uuid,uuid,uuid,text,uuid,uuid,bigint,text,jsonb,text,boolean,text,text) from public,anon,authenticated;
grant execute on function public.erp_sheet_write(uuid,uuid,uuid,text,uuid,uuid,bigint,text,jsonb,text,boolean,text,text) to service_role;

create function public.erp_sheet_mine(p_org uuid,p_actor uuid,p_session uuid,p_from date default null,p_until date default null,p_before date default null) returns jsonb language plpgsql stable security definer set search_path='' as $$declare person uuid;days jsonb;total bigint;begin
 select a.person_id into person from erp.user_accounts a join erp.persons p on p.id=a.person_id and p.organization_id=a.organization_id where a.organization_id=p_org and a.auth_user_id=p_actor and a.active and p.active;
 if person is null or p_session is null or exists(select 1 from erp_private.client_accounts where auth_user_id=p_actor) then raise exception 'Nincs saját dolgozói időnézet.' using errcode='42501';end if;
 if exists(select 1 from erp_private.staff_accounts where auth_user_id=p_actor) then perform erp_private.require_staff_session(p_actor,p_session);
 elsif not exists(select 1 from erp.person_roles r where r.organization_id=p_org and r.person_id=person and r.role='office' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now())) then raise exception 'Nincs saját időnézeti jogosultság.' using errcode='42501';end if;
 if p_from>p_until then raise exception 'Érvénytelen időszak.' using errcode='22023';end if;
 select coalesce(sum(p.minutes),0) into total from erp.construction_worksheet_people p join erp.construction_worksheets w on w.id=p.worksheet_id where p.organization_id=p_org and p.person_id=person and w.state='active' and (p_from is null or p.work_date>=p_from) and (p_until is null or p.work_date<=p_until);
 select coalesce(jsonb_agg(to_jsonb(x) order by x.work_date desc),'[]') into days from(select p.work_date,sum(p.minutes)::text as minutes,count(*) as worksheets from erp.construction_worksheet_people p join erp.construction_worksheets w on w.id=p.worksheet_id where p.organization_id=p_org and p.person_id=person and w.state='active' and (p_from is null or p.work_date>=p_from) and (p_until is null or p.work_date<=p_until) and (p_before is null or p.work_date<p_before) group by p.work_date order by p.work_date desc limit 100)x;
 return jsonb_build_object('days',days,'total_minutes',total::text,'cursor',case when jsonb_array_length(days)=100 then (days->-1)->>'work_date' else null end);
end$$;
revoke all on function public.erp_sheet_mine(uuid,uuid,uuid,date,date,date) from public,anon,authenticated;
grant execute on function public.erp_sheet_mine(uuid,uuid,uuid,date,date,date) to service_role;

create or replace function public.erp_plan_read(p_actor uuid,p_session uuid,p_project uuid,p_role text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare ctx jsonb;plan erp.workplans;begin
 ctx:=erp_private.plan_scope(p_actor,p_session,p_project,p_role);select * into plan from erp.workplans where project_id=p_project;
 return jsonb_build_object('context',ctx,'time',erp_private.worksheet_summary(p_project),'plan',case when plan.id is null then null else jsonb_build_object('id',plan.id,'revision',plan.revision,'quote_id',plan.quote_id,'quote_version',plan.quote_version) end,'tasks',coalesce((select jsonb_agg(erp_private.plan_task_json(t) order by t.sort,t.id) from erp.project_tasks t where t.plan_id=plan.id and erp_private.entry_task_active(t.id)),'[]'),
 'events',coalesce((select jsonb_agg(x.value order by x.created_at desc,x.id desc) from(select e.id,e.created_at,jsonb_build_object('id',e.id,'task_id',e.task_id,'actor_id',e.actor_id,'active_role',e.active_role,'kind',e.kind,'created_at',e.created_at,'data',e.data) as value from erp.task_events e where e.organization_id=plan.organization_id and e.project_id=p_project order by e.created_at desc,e.id desc limit 100)x),'[]'));
end$$;

commit;
