-- Jóváhagyott ERP-bejegyzések. Csak saját sémák; nincs Auth-/forrásrendszer-módosítás.
begin;
create table erp.project_entries(
 id uuid primary key,organization_id uuid not null,project_id uuid not null,kind text not null check(kind in('extra','modify','remove','note','request','complaint','defect','damage')),
 author_id uuid not null,author_auth_id uuid not null,author_role text not null,state text not null,current_version bigint not null default 1,revision bigint not null default 1,
 visible_to_team boolean not null default false,recipient_id uuid,archived boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(organization_id,id),foreign key(organization_id,project_id) references erp.garden_projects(organization_id,id),foreign key(organization_id,author_id) references erp.persons(organization_id,id),foreign key(organization_id,recipient_id) references erp.persons(organization_id,id));
create index project_entries_scope on erp.project_entries(organization_id,project_id,updated_at desc,id);
create table erp.project_entry_versions(
 organization_id uuid not null,entry_id uuid not null,version bigint not null,base_quote_version bigint not null,payload jsonb not null,
 offer_kind text check(offer_kind in('customer','office')),offer_patch jsonb,offer_hash bytea,offer_summary jsonb,actor_id uuid not null,actor_role text not null,created_at timestamptz not null default now(),
 primary key(organization_id,entry_id,version),foreign key(organization_id,entry_id) references erp.project_entries(organization_id,id),check(pg_column_size(payload)<262144),check(offer_patch is null or pg_column_size(offer_patch)<2097152));
alter table erp.project_entries add constraint entry_current_version foreign key(organization_id,id,current_version) references erp.project_entry_versions(organization_id,entry_id,version) deferrable initially deferred;
create table erp.project_entry_events(
 id uuid primary key,organization_id uuid not null,project_id uuid not null,entry_id uuid not null,version bigint not null,actor_id uuid not null,actor_auth_id uuid not null,active_role text not null,
 kind text not null,request_hash bytea not null,data jsonb not null default '{}',result jsonb not null,created_at timestamptz not null default now(),
 foreign key(organization_id,entry_id,version) references erp.project_entry_versions(organization_id,entry_id,version));
create index entry_events_scope on erp.project_entry_events(organization_id,entry_id,created_at desc,id);
create index entry_events_project on erp.project_entry_events(project_id,created_at desc);
create table erp.project_entry_decisions(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,entry_id uuid not null,version bigint not null,purpose text not null check(purpose in('price','repair','liability')),
 party text not null check(party in('office','client')),accepted boolean not null,actor_id uuid not null,actor_auth_id uuid not null,active_role text not null,event_id uuid not null,created_at timestamptz not null default now(),
 unique(organization_id,entry_id,version,purpose,party),foreign key(organization_id,entry_id,version) references erp.project_entry_versions(organization_id,entry_id,version),foreign key(event_id) references erp.project_entry_events(id) deferrable initially deferred);
create table erp.project_change_applications(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,project_id uuid not null,entry_id uuid not null,entry_version bigint not null,quote_id uuid not null,from_version bigint not null,to_version bigint not null,
 actor_id uuid not null,event_id uuid not null,created_at timestamptz not null default now(),unique(organization_id,entry_id,entry_version),
 foreign key(organization_id,entry_id,entry_version) references erp.project_entry_versions(organization_id,entry_id,version),foreign key(organization_id,quote_id,from_version) references erp.quote_versions(organization_id,quote_id,version),foreign key(organization_id,quote_id,to_version) references erp.quote_versions(organization_id,quote_id,version));
create index entry_application_project on erp.project_change_applications(organization_id,project_id,to_version);
create table erp.project_task_terms(
 organization_id uuid not null,project_id uuid not null,task_id uuid not null,quote_id uuid not null,quote_version bigint not null,application_id uuid not null,active boolean not null,section text not null,calculation jsonb not null,
 primary key(organization_id,project_id,task_id,quote_version),foreign key(task_id) references erp.project_tasks(id),foreign key(application_id) references erp.project_change_applications(id),foreign key(organization_id,quote_id,quote_version) references erp.quote_versions(organization_id,quote_id,version));
create index entry_task_terms_latest on erp.project_task_terms(task_id,quote_version desc);
create index entry_task_terms_application on erp.project_task_terms(application_id);
create index entry_task_terms_quote on erp.project_task_terms(organization_id,quote_id,quote_version);
create function erp_private.entry_immutable() returns trigger language plpgsql security invoker set search_path='' as $$begin raise exception 'A bejegyzés előzménye nem írható át vagy törölhető.' using errcode='42501';end$$;
revoke all on function erp_private.entry_immutable() from public,anon,authenticated,service_role;
do $$declare t text;begin foreach t in array array['project_entries','project_entry_versions','project_entry_events','project_entry_decisions','project_change_applications','project_task_terms'] loop
 execute format('alter table erp.%I enable row level security',t);execute format('alter table erp.%I force row level security',t);execute format('revoke all on erp.%I from public,anon,authenticated,service_role',t);
 if t<>'project_entries' then execute format('create trigger entry_history before update or delete on erp.%I for each row execute function erp_private.entry_immutable()',t);end if;end loop;end$$;
create function erp_private.entry_scope(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_entry uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$declare ctx jsonb;e erp.project_entries;begin
 ctx:=erp_private.plan_scope(p_actor,p_session,p_project,p_role);
 if p_entry is not null then select * into e from erp.project_entries where id=p_entry and project_id=p_project and organization_id=(ctx->>'organization_id')::uuid;
 if not found or (p_role not in('office','client') and not e.visible_to_team and e.author_id<>(ctx->>'person_id')::uuid and e.recipient_id is distinct from (ctx->>'person_id')::uuid) then raise exception 'A bejegyzés nem érhető el.' using errcode='42501';end if;end if;return ctx;end$$;
revoke all on function erp_private.entry_scope(uuid,uuid,uuid,text,uuid) from public,anon,authenticated,service_role;
create function public.erp_entry_read(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_entry uuid default null,p_version bigint default null,p_archived boolean default false,p_before timestamptz default null,p_before_id uuid default null,p_event_before timestamptz default null,p_event_before_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ctx jsonb;g erp.garden_projects;q erp.quote_versions;e erp.project_entries;v erp.project_entry_versions;result jsonb;last_entry jsonb;last_event jsonb;begin
 ctx:=erp_private.entry_scope(p_actor,p_session,p_project,p_role,p_entry);select * into g from erp.garden_projects where id=p_project;
 select * into q from erp.quote_versions where organization_id=g.organization_id and quote_id=g.accepted_quote_id and version=g.accepted_quote_version;
 if p_entry is not null then select * into e from erp.project_entries where id=p_entry;select * into v from erp.project_entry_versions where entry_id=p_entry and version=coalesce(p_version,e.current_version);if not found then raise exception 'Nincs ilyen bejegyzésváltozat.' using errcode='22023';end if;end if;
 result:=jsonb_build_object('context',ctx,'quote',to_jsonb(q),'book',case when p_role='office' then (select document from erp.price_books where organization_id=g.organization_id) else null end,
 'entries',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'kind',x.kind,'state',x.state,'revision',x.revision,'version',x.current_version,'archived',x.archived,'author_id',x.author_id,'author_role',x.author_role,'visible_to_team',x.visible_to_team,'recipient_id',x.recipient_id,'created_at',x.created_at,'updated_at',x.updated_at,'body',left(ev.payload->>'body',180)) order by x.updated_at desc,x.id desc) from (select * from erp.project_entries a where a.organization_id=g.organization_id and a.project_id=p_project and (p_archived or not a.archived) and (p_before is null or (a.updated_at,a.id)<(p_before,p_before_id)) and (p_role in('office','client') or a.visible_to_team or a.author_id=(ctx->>'person_id')::uuid or a.recipient_id=(ctx->>'person_id')::uuid) order by a.updated_at desc,a.id desc limit 100)x join erp.project_entry_versions ev on ev.entry_id=x.id and ev.version=x.current_version),'[]'),
 'entry',case when e.id is null then null else to_jsonb(e)||jsonb_build_object('version',to_jsonb(v),'base_quote',(select to_jsonb(b) from erp.quote_versions b where b.organization_id=g.organization_id and b.quote_id=g.accepted_quote_id and b.version=v.base_quote_version),
 'decisions',coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at) from erp.project_entry_decisions d where d.entry_id=e.id and d.version=v.version),'[]'),
 'versions',coalesce((select jsonb_agg(jsonb_build_object('version',a.version,'created_at',a.created_at,'actor_id',a.actor_id,'actor_role',a.actor_role,'offer_summary',a.offer_summary,'base_quote_version',a.base_quote_version) order by a.version desc) from erp.project_entry_versions a where a.entry_id=e.id),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id) from(select id,version,actor_id,active_role,kind,data,created_at from erp.project_entry_events z where z.entry_id=e.id and (p_event_before is null or (z.created_at,z.id)<(p_event_before,p_event_before_id)) order by z.created_at desc,z.id desc limit 100)x),'[]')) end);
last_entry:=(result->'entries')->-1;last_event:=(result->'entry'->'events')->-1;
 result:=result||jsonb_build_object('entry_cursor',case when jsonb_array_length(result->'entries')=100 then jsonb_build_object('time',last_entry->>'updated_at','id',last_entry->>'id') else null end);
 if e.id is not null then result:=jsonb_set(result,'{entry,event_cursor}',case when jsonb_array_length(result->'entry'->'events')=100 then jsonb_build_object('time',last_event->>'created_at','id',last_event->>'id') else 'null'::jsonb end);end if;
 return result;
end$$;
create function erp_private.entry_task_active(p_task uuid) returns boolean language sql stable security definer set search_path='' as $$select coalesce((select t.active from erp.project_task_terms t join erp.garden_projects p on p.id=t.project_id where t.task_id=p_task and t.quote_version<=p.accepted_quote_version order by t.quote_version desc limit 1),true)$$;
revoke all on function erp_private.entry_task_active(uuid) from public,anon,authenticated,service_role;

alter table erp.task_events drop constraint task_events_kind_check;
alter table erp.task_events add constraint task_events_kind_check check(kind in('init','graph','accept','reject','shares','time','color','contract'));
create function erp_private.entry_apply(p_entry uuid,p_actor uuid,p_person uuid,p_role text,p_event uuid,p_input jsonb,p_calculation jsonb,p_scope_changes jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare e erp.project_entries;v erp.project_entry_versions;g erp.garden_projects;q erp.quotes;old erp.quote_versions;plan erp.workplans;app uuid;nextversion bigint;t erp.project_tasks;line jsonb;sectionname text;oldstate jsonb;oldterms jsonb;newstate jsonb;changed boolean;ev uuid;nextsort int;recipient uuid;beforedeps jsonb;begin
 select * into e from erp.project_entries where id=p_entry for update;select * into v from erp.project_entry_versions evv where evv.entry_id=e.id and evv.version=e.current_version;
 if e.kind not in('extra','modify','remove') or v.offer_hash is null or (select count(*) from erp.project_entry_decisions d where d.entry_id=e.id and d.version=e.current_version and d.purpose='price' and d.accepted)<>2 then raise exception 'Kétoldalú, pontos árelfogadás szükséges.' using errcode='42501';end if;
 if v.offer_hash is distinct from sha256(convert_to(p_input::text||p_calculation::text,'UTF8')) then raise exception 'Az elfogadott ajánlati tartalom eltér.' using errcode='40001';end if;
 select * into g from erp.garden_projects where id=e.project_id for update;select * into q from erp.quotes where id=g.accepted_quote_id for update;
 if g.accepted_quote_version<>v.base_quote_version or q.current_version<>v.base_quote_version or q.status<>'accepted' or g.work_status not in('waiting_start','running') then raise exception 'Az aktuális megállapodás vagy a munka állapota megváltozott.' using errcode='40001';end if;
 select * into old from erp.quote_versions where organization_id=e.organization_id and quote_id=q.id and version=q.current_version;
 nextversion:=q.current_version+1;
 insert into erp.quote_versions(organization_id,quote_id,version,input,calculation,customer,actor_id) values(e.organization_id,q.id,nextversion,p_input,p_calculation,old.customer,p_actor);
 update erp.quotes set current_version=nextversion,revision=revision+1,updated_at=now() where id=q.id;
 update erp.garden_projects set accepted_quote_version=nextversion,revision=revision+1 where id=g.id;
 insert into erp.quote_events(organization_id,quote_id,version,actor_id,event,details) values(e.organization_id,q.id,nextversion,p_actor,'entry_change_accepted',jsonb_build_object('entry_id',e.id,'entry_version',e.current_version,'previous_version',v.base_quote_version));
 insert into erp.project_change_applications(organization_id,project_id,entry_id,entry_version,quote_id,from_version,to_version,actor_id,event_id) values(e.organization_id,g.id,e.id,e.current_version,q.id,v.base_quote_version,nextversion,p_actor,p_event) returning id into app;
 select * into plan from erp.workplans where project_id=g.id for update;
 if found then
 select coalesce(jsonb_agg(to_jsonb(d)),'[]') into beforedeps from erp.task_dependencies d where d.plan_id=plan.id;
 for t in select * from erp.project_tasks x where x.plan_id=plan.id and erp_private.entry_task_active(x.id) order by x.sort loop
  line:=null;sectionname:=null;select l.value,ss->>'name' into line,sectionname from jsonb_array_elements(p_calculation->'sections')ss cross join lateral jsonb_array_elements(ss->'lines')l where l.value->>'id'=t.source_line_id;
  oldstate:=t.state;oldterms:=erp_private.plan_task_json(t);changed:=coalesce((p_scope_changes->>t.source_line_id)::boolean,false);
  if line is null then
   insert into erp.project_task_terms values(e.organization_id,g.id,t.id,q.id,nextversion,app,false,t.section,erp_private.plan_task_json(t));
  else
   insert into erp.project_task_terms values(e.organization_id,g.id,t.id,q.id,nextversion,app,true,sectionname,line);
  end if;
  if line is null or changed then newstate:=jsonb_build_object('round',(oldstate->>'round')::int+1,'approvals','[]'::jsonb,'shares','[]'::jsonb,'share_lock',0);else newstate:=oldstate;end if;
   update erp.project_tasks set state=newstate,planned_minutes=case when line is null then planned_minutes when changed or (line->>'labor')::numeric is distinct from (oldterms->>'labor')::numeric then (line->>'planned_minutes')::numeric else planned_minutes end,revision=revision+1 where id=t.id;
  ev:=gen_random_uuid();insert into erp.task_events(id,organization_id,project_id,task_id,actor_id,actor_auth_id,active_role,kind,request_payload,data,result_revision)
   values(ev,e.organization_id,g.id,t.id,p_person,p_actor,p_role,'contract',jsonb_build_object('entry',e.id,'version',e.current_version),jsonb_build_object('entry_id',e.id,'quote_version',nextversion,'scope_changed',changed,'removed',line is null,'visibility','client','reason','Jóváhagyott ajánlati változás','before',oldstate,'after',newstate,'dependency_before',beforedeps),(select revision from erp.project_tasks where id=t.id));
  for recipient in select distinct a.person_id from erp.project_assignments a where a.organization_id=e.organization_id and a.project_id=g.id and a.revoked_at is null and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now()) loop
   insert into erp.work_notifications(organization_id,project_id,task_id,event_id,recipient_id,kind) values(e.organization_id,g.id,t.id,ev,recipient,'info') on conflict do nothing;end loop;
 end loop;
 nextsort:=(select coalesce(max(sort),0) from erp.project_tasks where plan_id=plan.id);
 for sectionname,line in select ss->>'name',l.value from jsonb_array_elements(p_calculation->'sections')ss cross join lateral jsonb_array_elements(ss->'lines')l loop
  if not exists(select 1 from erp.project_tasks x where x.plan_id=plan.id and x.source_line_id=line->>'id') then
   nextsort:=nextsort+1;
   insert into erp.project_tasks(organization_id,plan_id,source_line_id,section,title,original_title,quantity,unit,labor,net,original_minutes,planned_minutes,internal_info,sort)
    values(e.organization_id,plan.id,line->>'id',sectionname,line->>'label',line->>'label',(line->>'quantity')::numeric,line->>'unit',(line->>'labor')::numeric,(line->>'net')::numeric,(line->>'planned_minutes')::numeric,(line->>'planned_minutes')::numeric,coalesce(line->>'internal_info',''),nextsort) returning * into t;
   insert into erp.project_task_terms values(e.organization_id,g.id,t.id,q.id,nextversion,app,true,sectionname,line);
  elsif not erp_private.entry_task_active((select id from erp.project_tasks x where x.plan_id=plan.id and x.source_line_id=line->>'id')) then raise exception 'Régi, törölt sorazonosító nem használható új extrához.' using errcode='40001';end if;
 end loop;
 delete from erp.task_dependencies d where d.plan_id=plan.id and (not erp_private.entry_task_active(d.task_id) or not erp_private.entry_task_active(d.requires_task));
 update erp.workplans set revision=revision+1,updated_at=now() where id=plan.id;
 end if;
 update erp.project_entries set state='applied' where id=e.id;
 return jsonb_build_object('application_id',app,'quote_version',nextversion);
end$$;
revoke all on function erp_private.entry_apply(uuid,uuid,uuid,text,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;
create function public.erp_entry_write(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_request uuid,p_entry uuid,p_revision bigint,p_operation text,p_payload jsonb default '{}',p_input jsonb default null,p_calculation jsonb default null,p_flags jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare ctx jsonb;e erp.project_entries;v erp.project_entry_versions;g erp.garden_projects;prior erp.project_entry_events;person uuid;party text;signature bytea;kind text;payload jsonb;version bigint;purpose text;accepted boolean;newstate text;result jsonb;summary jsonb;hash bytea;begin
 ctx:=erp_private.entry_scope(p_actor,p_session,p_project,p_role,case when p_operation='create' then null else p_entry end);person:=(ctx->>'person_id')::uuid;
 if p_request is null or p_entry is null or p_revision is null or p_operation not in('create','revise','price','approve','reject','comment','status','react','withdraw','archive','restore') then raise exception 'Érvénytelen bejegyzésművelet.' using errcode='22023';end if;
 signature:=sha256(convert_to(jsonb_build_object('entry',p_entry,'revision',p_revision,'operation',p_operation,'payload',p_payload,'input',p_input,'calculation',p_calculation,'flags',p_flags)::text,'UTF8'));
 select * into prior from erp.project_entry_events where id=p_request;
 if found then if prior.project_id<>p_project or prior.actor_auth_id<>p_actor or prior.active_role<>p_role or prior.request_hash<>signature then raise exception 'Eltérő ismételt kérés.' using errcode='40001';end if;return prior.result||jsonb_build_object('replayed',true);end if;
 select * into g from erp.garden_projects where id=p_project for update;
 if p_operation='create' then
  if p_role not in('office','construction_lead','client') or p_revision<>0 or g.work_status not in('waiting_start','running') then raise exception 'Ebben a szerepben nem hozhatsz létre bejegyzést.' using errcode='42501';end if;
  kind:=p_flags->>'kind';if kind not in('extra','modify','remove','note','request','complaint','defect','damage') then raise exception 'Válassz bejegyzéstípust.' using errcode='22023';end if;
  newstate:=case when kind in('extra','modify','remove') then 'needs_office' else 'reported' end;
  insert into erp.project_entries(id,organization_id,project_id,kind,author_id,author_auth_id,author_role,state,visible_to_team,recipient_id) values(p_entry,g.organization_id,g.id,kind,person,p_actor,p_role,newstate,coalesce((p_payload->>'visible_to_team')::boolean,false),(p_payload->>'recipient_id')::uuid) returning * into e;
 else
  select * into e from erp.project_entries where id=p_entry for update;
  if e.revision<>p_revision then raise exception 'A bejegyzés megváltozott.' using errcode='40001';end if;
  select * into v from erp.project_entry_versions evv where evv.entry_id=e.id and evv.version=e.current_version;
  kind:=e.kind;newstate:=e.state;
  if p_operation<>'react' and p_role not in('office','construction_lead','client') then raise exception 'Csak olvasási hozzáférésed van.' using errcode='42501';end if;
  if e.archived and p_operation<>'restore' then raise exception 'Előbb állítsd vissza az archivált bejegyzést.' using errcode='22023';end if;
 end if;
 version:=e.current_version;payload:=p_payload;
 if p_operation in('create','revise','price') then
  if p_operation<>'create' then
   if e.state in('applied','closed','liability_agreed','withdrawn') or p_operation='price' and (p_role<>'office' or kind not in('extra','modify','remove')) or p_operation='revise' and p_role<>'office' and e.author_id<>person then raise exception 'A megőrzött megállapodáshoz új kérelem szükséges.' using errcode='42501';end if;version:=version+1;
  end if;
  if jsonb_typeof(payload) is distinct from 'object' or length(coalesce(payload->>'body','')) not between 1 and 12000 or jsonb_typeof(payload->'media') is distinct from 'array' or jsonb_array_length(payload->'media')>12 then raise exception 'Hibás szöveg vagy fotóhivatkozás.' using errcode='22023';end if;
  if payload->>'recipient_id' is not null and not exists(select 1 from jsonb_array_elements(ctx->'people')p where p->>'id'=payload->>'recipient_id' and (p->>'active')::boolean) then raise exception 'Idegen vagy inaktív címzett.' using errcode='42501';end if;
  if kind in('extra','modify','remove') and (p_flags->>'quote_version')::bigint is distinct from g.accepted_quote_version then raise exception 'Az ajánlat megváltozott; újraellenőrzés szükséges.' using errcode='40001';end if;
  hash:=null;summary:=null;
  if p_input is not null or p_calculation is not null then
   if p_role not in('office','client') or kind not in('extra','modify','remove') or p_role='client' and kind='extra' or p_input is null or p_calculation is null or jsonb_array_length(p_calculation->'issues')<>0 then raise exception 'Teljes, ellenőrzött árajánlat szükséges.' using errcode='42501';end if;
   hash:=sha256(convert_to(p_input::text||p_calculation::text,'UTF8'));summary:=jsonb_build_object('material',p_calculation->'material','labor',p_calculation->'labor','tax_base',p_calculation->'tax_base','vat',p_calculation->'vat','gross',p_calculation->'gross');
  end if;
  insert into erp.project_entry_versions(organization_id,entry_id,version,base_quote_version,payload,offer_kind,offer_patch,offer_hash,offer_summary,actor_id,actor_role) values(e.organization_id,e.id,version,g.accepted_quote_version,payload,case when hash is null then null when p_role='office' then 'office' else 'customer' end,p_flags->'offer_patch',hash,summary,person,p_role);
  newstate:=case when kind in('extra','modify','remove') then case when hash is not null and p_role='office' then 'needs_client' else 'needs_office' end else 'reported' end;
  if hash is not null then insert into erp.project_entry_decisions(organization_id,entry_id,version,purpose,party,accepted,actor_id,actor_auth_id,active_role,event_id) values(e.organization_id,e.id,version,'price',case when p_role='office' then 'office' else 'client' end,true,person,p_actor,p_role,p_request);end if;
  update erp.project_entries set current_version=version,visible_to_team=coalesce((payload->>'visible_to_team')::boolean,false),recipient_id=(payload->>'recipient_id')::uuid where id=e.id;
 elsif p_operation in('approve','reject') then
  if coalesce((p_flags->>'confirmed')::boolean,false) is not true then raise exception 'A döntést külön meg kell erősíteni.' using errcode='22023';end if;
  purpose:=case when kind in('extra','modify','remove') then 'price' when kind='damage' then 'liability' when kind='defect' and e.state='repaired' then 'repair' else null end;
  if purpose is null or p_role not in('office','client') or purpose='repair' and p_role<>'client' or e.state in('applied','closed','withdrawn','liability_agreed','rejected') then raise exception 'Ehhez a döntéshez nincs jogosultság vagy megfelelő állapot.' using errcode='42501';end if;
  if purpose='price' and (v.offer_hash is null or v.base_quote_version<>g.accepted_quote_version) then raise exception 'Előbb pontos, aktuális ajánlat szükséges.' using errcode='40001';end if;
  party:=case when p_role='office' then 'office' else 'client' end;accepted:=p_operation='approve';
  insert into erp.project_entry_decisions(organization_id,entry_id,version,purpose,party,accepted,actor_id,actor_auth_id,active_role,event_id) values(e.organization_id,e.id,version,purpose,party,accepted,person,p_actor,p_role,p_request);
  if not accepted then newstate:=case when purpose='liability' then 'disputed' when purpose='repair' then 'reopened' else 'rejected' end;
  elsif purpose='repair' then newstate:='closed';
  elsif (select count(*) from erp.project_entry_decisions d where d.entry_id=e.id and d.version=version and d.purpose=purpose and d.accepted)=2 then
   if purpose='price' then result:=erp_private.entry_apply(e.id,p_actor,person,p_role,p_request,p_input,p_calculation,p_flags->'scope_changes');newstate:='applied';else newstate:='liability_agreed';end if;
  else newstate:=case when kind='damage' then 'liability_proposed' else e.state end;end if;
 elsif p_operation='comment' then
  if length(coalesce(p_payload->>'body','')) not between 1 and 4000 then raise exception 'Írj megjegyzést.' using errcode='22023';end if;
 elsif p_operation='react' then
  if e.recipient_id is distinct from person or p_payload->>'reaction' not in('seen','in_progress','done') then raise exception 'Csak a neked címzett kérésre reagálhatsz.' using errcode='42501';end if;
 elsif p_operation='status' then
  if kind in('extra','modify','remove','note') then raise exception 'Ehhez a típushoz másik művelet szükséges.' using errcode='22023';end if;
  newstate:=p_flags->>'state';
  if kind='defect' then
   if p_role in('office','construction_lead') and ((e.state in('reported','reopened') and newstate='investigating') or (e.state in('reported','reopened','investigating') and newstate='repairing') or (e.state in('reported','reopened','investigating','repairing') and newstate='repaired')) then null;
   elsif p_role='client' and e.state in('repaired','closed') and newstate='reopened' then null;else raise exception 'Nem engedélyezett hibajavítási állapotváltás.' using errcode='42501';end if;
  elsif kind in('request','complaint') then
   if newstate not in('answered','closed','reopened') or newstate='answered' and p_role not in('office','construction_lead') or newstate in('closed','reopened') and p_role<>'client' and e.author_id<>person then raise exception 'Nem engedélyezett visszajelzés.' using errcode='42501';end if;
  else raise exception 'A felelősséget külön, közös döntéssel kell megállapítani.' using errcode='22023';end if;
  version:=version+1;insert into erp.project_entry_versions(organization_id,entry_id,version,base_quote_version,payload,actor_id,actor_role) values(e.organization_id,e.id,version,g.accepted_quote_version,p_payload,person,p_role);update erp.project_entries set current_version=version where id=e.id;
 elsif p_operation='withdraw' then
  if e.state in('applied','closed','liability_agreed') or p_role<>'office' and e.author_id<>person then raise exception 'Ez a megállapodás csak új kérelemmel vonható vissza.' using errcode='42501';end if;newstate:='withdrawn';
 elsif p_operation='archive' then
  if p_role<>'office' or e.state not in('applied','closed','rejected','withdrawn','liability_agreed') then raise exception 'Csak lezárt bejegyzés archiválható az irodában.' using errcode='42501';end if;update erp.project_entries set archived=true where id=e.id;
 elsif p_operation='restore' then
  if p_role<>'office' then raise exception 'Irodai jogosultság szükséges.' using errcode='42501';end if;update erp.project_entries set archived=false where id=e.id;
 end if;
 update erp.project_entries set state=newstate,revision=revision+case when p_operation='create' then 0 else 1 end,updated_at=clock_timestamp() where id=e.id returning * into e;
 result:=coalesce(result,'{}')||jsonb_build_object('id',e.id,'revision',e.revision,'version',e.current_version,'state',e.state);
 insert into erp.project_entry_events(id,organization_id,project_id,entry_id,version,actor_id,actor_auth_id,active_role,kind,request_hash,data,result) values(p_request,e.organization_id,g.id,e.id,e.current_version,person,p_actor,p_role,p_operation,signature,(case when p_operation in('comment','react','status','withdraw') then p_payload else jsonb_build_object('state',e.state,'version',e.current_version,'purpose',purpose) end)||jsonb_build_object('client_fingerprint',p_flags->>'client_fingerprint'),result);
 return result;
end$$;
revoke all on function public.erp_entry_read(uuid,uuid,uuid,text,uuid,bigint,boolean,timestamptz,uuid,timestamptz,uuid),public.erp_entry_write(uuid,uuid,uuid,text,uuid,uuid,bigint,text,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.erp_entry_read(uuid,uuid,uuid,text,uuid,bigint,boolean,timestamptz,uuid,timestamptz,uuid),public.erp_entry_write(uuid,uuid,uuid,text,uuid,uuid,bigint,text,jsonb,jsonb,jsonb,jsonb) to service_role;

create or replace function erp_private.plan_task_json(t erp.project_tasks) returns jsonb language plpgsql stable security definer set search_path='' as $$declare effective erp.project_task_terms;v jsonb;begin
 select x.* into effective from erp.project_task_terms x join erp.garden_projects p on p.id=x.project_id where x.task_id=t.id and x.quote_version<=p.accepted_quote_version order by x.quote_version desc limit 1;v:=effective.calculation;
 return jsonb_build_object('id',t.id,'source_line_id',t.source_line_id,'section',coalesce(effective.section,t.section),'title',t.title,'contract_label',coalesce(v->>'label',t.original_title),'original_title',t.original_title,'quantity',coalesce(v->>'quantity',t.quantity::text),'unit',coalesce(v->>'unit',t.unit),'labor',coalesce(v->>'labor',t.labor::text),'net',coalesce(v->>'net',t.net::text),'original_minutes',t.original_minutes::text,'planned_minutes',t.planned_minutes::text,'internal_info',t.internal_info,'sort',t.sort,'start_date',t.start_date,'end_date',t.end_date,'dependencies',coalesce((select jsonb_agg(d.requires_task order by d.requires_task) from erp.task_dependencies d where d.plan_id=t.plan_id and d.task_id=t.id),'[]'),'round',t.state->'round','approvals',t.state->'approvals','shares',t.state->'shares','share_lock',t.state->'share_lock','revision',t.revision);
end$$;

create or replace function public.erp_plan_read(p_actor uuid,p_session uuid,p_project uuid,p_role text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare ctx jsonb;plan erp.workplans;begin
 ctx:=erp_private.plan_scope(p_actor,p_session,p_project,p_role);select * into plan from erp.workplans where project_id=p_project;
 return jsonb_build_object('context',ctx,'plan',case when plan.id is null then null else jsonb_build_object('id',plan.id,'revision',plan.revision,'quote_id',plan.quote_id,'quote_version',plan.quote_version) end,'tasks',coalesce((select jsonb_agg(erp_private.plan_task_json(t) order by t.sort,t.id) from erp.project_tasks t where t.plan_id=plan.id and erp_private.entry_task_active(t.id)),'[]'),
 'events',coalesce((select jsonb_agg(x.value order by x.created_at desc,x.id desc) from(select e.id,e.created_at,jsonb_build_object('id',e.id,'task_id',e.task_id,'actor_id',e.actor_id,'active_role',e.active_role,'kind',e.kind,'created_at',e.created_at,'data',e.data) as value from erp.task_events e where e.organization_id=plan.organization_id and e.project_id=p_project order by e.created_at desc,e.id desc limit 100)x),'[]'));
end$$;
create or replace function public.erp_plan_graph_save(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_request uuid,p_revision bigint,p_tasks jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare ctx jsonb;plan erp.workplans;prior erp.task_events;row jsonb;before jsonb;ids uuid[];recipient uuid;begin
 ctx:=erp_private.plan_scope(p_actor,p_session,p_project,p_role);if not (ctx->>'can_edit')::boolean then raise exception 'A munkatervet csak irodai munkaszereppel szerkesztheted.' using errcode='42501';end if;
 select * into plan from erp.workplans where project_id=p_project for update;if not found then raise exception 'A munkaterv nincs létrehozva.' using errcode='22023';end if;
 select * into prior from erp.task_events where id=p_request;if found then if prior.project_id<>p_project or prior.actor_auth_id<>p_actor or prior.active_role<>p_role or prior.kind<>'graph' or prior.request_payload<>p_tasks then raise exception 'Eltérő ismételt kérés.' using errcode='40001';end if;return jsonb_build_object('revision',prior.result_revision,'replayed',true);end if;
 if p_revision is null or p_revision<>plan.revision then raise exception 'A munkaterv megváltozott.' using errcode='40001';end if;
 if p_request is null or jsonb_typeof(p_tasks) is distinct from 'array' or jsonb_array_length(p_tasks)<>(select count(*) from erp.project_tasks t where t.plan_id=plan.id and erp_private.entry_task_active(t.id)) then raise exception 'A munkafázisok hiányosak.' using errcode='22023';end if;
 select array_agg((x->>'id')::uuid) into ids from jsonb_array_elements(p_tasks)x;
 if cardinality(ids)<>(select count(distinct x) from unnest(ids)x) or exists(select 1 from unnest(ids)x where not exists(select 1 from erp.project_tasks t where t.id=x and t.plan_id=plan.id and erp_private.entry_task_active(t.id))) then raise exception 'Idegen vagy ismételt munkafázis.' using errcode='42501';end if;
 select jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'sort',t.sort,'start_date',t.start_date,'end_date',t.end_date,'internal_info',t.internal_info,'dependencies',coalesce((select jsonb_agg(d.requires_task order by d.requires_task) from erp.task_dependencies d where d.task_id=t.id),'[]')) order by t.sort,t.id) into before from erp.project_tasks t where t.plan_id=plan.id and erp_private.entry_task_active(t.id);
 delete from erp.task_dependencies where plan_id=plan.id;
 for row in select * from jsonb_array_elements(p_tasks) loop
 if jsonb_typeof(row->'dependencies') is distinct from 'array' or jsonb_array_length(row->'dependencies')>1000 or exists(select 1 from jsonb_object_keys(row)k where k not in ('id','title','sort','start_date','end_date','dependencies','internal_info')) then raise exception 'Nem szerkeszthető tervadat.' using errcode='22023';end if;
 update erp.project_tasks set title=btrim(row->>'title'),sort=(row->>'sort')::integer,start_date=(row->>'start_date')::date,end_date=(row->>'end_date')::date,internal_info=coalesce(row->>'internal_info',''),revision=revision+1 where plan_id=plan.id and id=(row->>'id')::uuid;
 insert into erp.task_dependencies(organization_id,plan_id,task_id,requires_task) select plan.organization_id,plan.id,(row->>'id')::uuid,value::uuid from jsonb_array_elements_text(row->'dependencies');
 end loop;
 if (select count(*) from erp.task_dependencies where plan_id=plan.id)>5000 then raise exception 'Túl sok előfeltétel.' using errcode='22023';end if;
 if exists(with recursive paths(root,node) as (select task_id,requires_task from erp.task_dependencies where plan_id=plan.id union select p.root,d.requires_task from paths p join erp.task_dependencies d on d.task_id=p.node and d.plan_id=plan.id) select 1 from paths where root=node) then raise exception 'Körkörös előfeltétel nem menthető.' using errcode='22023';end if;
 update erp.workplans set revision=revision+1,updated_at=now() where id=plan.id returning * into plan;
 insert into erp.task_events(id,organization_id,project_id,actor_id,actor_auth_id,active_role,kind,request_payload,data,result_revision) values(p_request,plan.organization_id,p_project,(ctx->>'person_id')::uuid,p_actor,p_role,'graph',p_tasks,jsonb_build_object('before',before,'after',p_tasks),plan.revision);
 for recipient in select distinct a.person_id from erp.project_assignments a where a.organization_id=plan.organization_id and a.project_id=p_project and a.revoked_at is null and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now()) loop
 insert into erp.work_notifications(organization_id,project_id,event_id,recipient_id,kind) values(plan.organization_id,p_project,p_request,recipient,'info') on conflict do nothing;end loop;
 return jsonb_build_object('revision',plan.revision);end$$;
create or replace function public.erp_plan_task_context(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_task uuid,p_request uuid,p_command jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$declare ctx jsonb;t erp.project_tasks;prior erp.task_events;begin
 if not erp_private.entry_task_active(p_task) then raise exception 'A munkafázis már nem az aktuális megállapodás része.' using errcode='40001';end if;
 ctx:=erp_private.plan_scope(p_actor,p_session,p_project,p_role);if not (ctx->>'can_act')::boolean then raise exception 'Átvétel csak külön elindított kertépítésen rögzíthető.' using errcode='42501';end if;
 select * into t from erp.project_tasks where id=p_task and plan_id in(select id from erp.workplans where project_id=p_project);if not found then raise exception 'A munkafázis nem elérhető.' using errcode='42501';end if;
 select * into prior from erp.task_events where id=p_request;if found then if prior.task_id<>p_task or prior.actor_auth_id<>p_actor or prior.active_role<>p_role or prior.request_payload<>p_command then raise exception 'Eltérő ismételt kérés.' using errcode='40001';end if;return jsonb_build_object('replayed',true,'revision',prior.result_revision);end if;
 return jsonb_build_object('context',ctx,'task',erp_private.plan_task_json(t));end$$;
create or replace function public.erp_plan_task_save(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_task uuid,p_request uuid,p_revision bigint,p_command jsonb,p_state jsonb,p_event jsonb,p_minutes text) returns jsonb language plpgsql security definer set search_path='' as $$
declare ctx jsonb;taskrow erp.project_tasks;plan erp.workplans;prior erp.task_events;action_kind text:=p_command->>'type';rank int;level int;subject uuid;recipient uuid;last_approval jsonb;highest int;person uuid;future_day timestamptz;begin
 if not erp_private.entry_task_active(p_task) then raise exception 'A munkafázis már nem az aktuális megállapodás része.' using errcode='40001';end if;
 ctx:=erp_private.plan_scope(p_actor,p_session,p_project,p_role);if not (ctx->>'can_act')::boolean then raise exception 'Átvétel csak futó kertépítésen rögzíthető.' using errcode='42501';end if;
 person:=(ctx->>'person_id')::uuid;rank:=case p_role when 'office' then 3 when 'construction_lead' then 2 when 'client' then 4 else 1 end;
 select * into plan from erp.workplans where project_id=p_project for update;
 select * into taskrow from erp.project_tasks where id=p_task and plan_id=plan.id for update;if not found then raise exception 'Idegen munkafázis.' using errcode='42501';end if;
 select * into prior from erp.task_events where id=p_request;if found then if prior.task_id<>p_task or prior.actor_auth_id<>p_actor or prior.active_role<>p_role or prior.request_payload<>p_command then raise exception 'Eltérő ismételt kérés.' using errcode='40001';end if;return jsonb_build_object('revision',prior.result_revision,'replayed',true);end if;
 if p_request is null or p_revision is null or p_revision<>taskrow.revision then raise exception 'A fázis megváltozott. Frissítsd az adatokat.' using errcode='40001';end if;
 if p_event->>'id' is distinct from p_request::text or p_event->>'task_id' is distinct from p_task::text or p_event->>'actor_id' is distinct from person::text or p_event->>'role' is distinct from p_role or p_event->>'kind' is distinct from action_kind or p_event->'before'->'approvals' is distinct from taskrow.state->'approvals' or p_event->'before'->'shares' is distinct from taskrow.state->'shares' then raise exception 'Érvénytelen eseménykapcsolat.' using errcode='22023';end if;
 if jsonb_typeof(p_state->'approvals') is distinct from 'array' or jsonb_typeof(p_state->'shares') is distinct from 'array' or (p_state->>'share_lock')::int not between 0 and 3 or jsonb_array_length(p_state->'approvals')>400 or jsonb_array_length(p_state->'shares')>100 then raise exception 'Érvénytelen átvételi állapot.' using errcode='22023';end if;
 if action_kind='accept' then
  last_approval:=p_state->'approvals'->(jsonb_array_length(p_state->'approvals')-1);level:=(last_approval->>'level')::int;
  if jsonb_array_length(p_state->'approvals')<>jsonb_array_length(taskrow.state->'approvals')+1 or (p_state->'approvals')-(jsonb_array_length(p_state->'approvals')-1) is distinct from taskrow.state->'approvals' or last_approval->>'actor_id' is distinct from person::text or last_approval->>'role' is distinct from p_role or last_approval->>'id' is distinct from p_request::text or level not between 0 and 3 or (p_role='client' and level<>3) or (p_role<>'client' and (level=3 or level>=rank)) then raise exception 'Jogosulatlan átvételi szint.' using errcode='42501';end if;
  if jsonb_array_length(last_approval->'subjects')<1 then raise exception 'Hiányzó tényleges személy.' using errcode='22023';end if;
  for subject in select value::uuid from jsonb_array_elements_text(last_approval->'subjects') loop if not (ctx->'subjects'->level::text) ? subject::text or ((rank=1 or p_role='client') and subject<>person) then raise exception 'Jogosulatlan képviselt személy.' using errcode='42501';end if;end loop;
  if exists(select 1 from jsonb_array_elements(taskrow.state->'approvals')a where a->>'actor_id'=person::text and (a->>'level')::int=level and a->'subjects'=last_approval->'subjects') then raise exception 'Ezt az átvételt már rögzítettük.' using errcode='40001';end if;
 elsif action_kind='reject' then
  level:=case p_role when 'client' then 3 when 'office' then 2 when 'construction_lead' then 1 else 0 end;
  if level=0 or length(btrim(coalesce(p_event->>'reason','')))=0 or jsonb_array_length(p_state->'approvals')<>0 or (p_state->>'round')::bigint<>(taskrow.state->>'round')::bigint+1 or p_state->'shares' is distinct from taskrow.state->'shares' or p_state->'share_lock' is distinct from taskrow.state->'share_lock' then raise exception 'Érvénytelen visszaküldés.' using errcode='42501';end if;
  recipient:=(p_event->>'recipient')::uuid;if recipient is null or not (ctx->'subjects'->'0') ? recipient::text then raise exception 'Nem jogosult javítási címzett.' using errcode='42501';end if;
 elsif action_kind='shares' then
  if p_role='client' or rank<(taskrow.state->>'share_lock')::int or p_state->'approvals' is distinct from taskrow.state->'approvals' or (rank=1 and not exists(select 1 from jsonb_array_elements(taskrow.state->'approvals')a where (a->>'level')::int=0 and a->'subjects' ? person::text)) then raise exception 'A megosztás magasabb szinten zárolt vagy nem saját munkafázis.' using errcode='42501';end if;
 elsif action_kind='time' then
  if p_role<>'office' or p_minutes is null or p_state->'approvals' is distinct from taskrow.state->'approvals' or p_state->'shares' is distinct from taskrow.state->'shares' or p_state->'share_lock' is distinct from taskrow.state->'share_lock' then raise exception 'Az időtervet csak az iroda módosíthatja.' using errcode='42501';end if;
 else raise exception 'Ismeretlen átvételi művelet.' using errcode='22023';end if;
 if action_kind<>'reject' and p_state->'round' is distinct from taskrow.state->'round' then raise exception 'Az átvételi kör nem írható át.' using errcode='22023';end if;
 if action_kind='shares' or (action_kind='accept' and p_state->'shares' is distinct from taskrow.state->'shares') then
  if rank>3 or rank<(taskrow.state->>'share_lock')::int or (p_state->>'share_lock')::int<>greatest(rank,(taskrow.state->>'share_lock')::int) or jsonb_array_length(p_state->'shares')=0 or (select sum((s->>'basis_points')::int) from jsonb_array_elements(p_state->'shares')s)<>10000 or exists(select 1 from jsonb_array_elements(p_state->'shares')s where (s->>'basis_points')::int not between 1 and 10000) or (select count(distinct s->>'person_id') from jsonb_array_elements(p_state->'shares')s)<>jsonb_array_length(p_state->'shares') then raise exception 'Hibás vagy zárolt teljesítménymegosztás.' using errcode='42501';end if;
  for subject in select (s->>'person_id')::uuid from jsonb_array_elements(p_state->'shares')s loop
   if not (ctx->'subjects'->'0') ? subject::text and not exists(select 1 from jsonb_array_elements(taskrow.state->'shares')s where s->>'person_id'=subject::text) then raise exception 'Idegen teljesítményrészesedés.' using errcode='42501';end if;
   if rank=1 and not exists(select 1 from jsonb_array_elements(p_state->'approvals')a where (a->>'level')::int=0 and a->'subjects' ? subject::text) then raise exception 'Dolgozó csak a fázis tényleges résztvevőit oszthatja meg.' using errcode='42501';end if;
  end loop;
 end if;
 update erp.project_tasks set state=p_state,planned_minutes=case when action_kind='time' then p_minutes::numeric else planned_minutes end,revision=revision+1 where id=p_task returning * into taskrow;
 update erp.workplans set revision=revision+1,updated_at=now() where id=plan.id;
 insert into erp.task_events(id,organization_id,project_id,task_id,actor_id,actor_auth_id,active_role,kind,request_payload,data,result_revision) values(p_request,plan.organization_id,p_project,p_task,person,p_actor,p_role,action_kind,p_command,p_event,taskrow.revision);
 if action_kind='reject' then
  update erp.work_notifications n set completed_at=now() where n.task_id=p_task and n.kind in ('review','repair','attribution') and n.completed_at is null;
  insert into erp.work_notifications(organization_id,project_id,task_id,event_id,recipient_id,kind,level) values(plan.organization_id,p_project,p_task,p_request,recipient,'repair',0);
  for subject in select distinct value::uuid from jsonb_array_elements_text(coalesce(p_event->'affected_actors','[]')||coalesce(p_event->'affected_subjects','[]')) loop
   if exists(select 1 from erp.persons where organization_id=plan.organization_id and id=subject) then insert into erp.work_notifications(organization_id,project_id,task_id,event_id,recipient_id,kind) values(plan.organization_id,p_project,p_task,p_request,subject,'info') on conflict do nothing;end if;end loop;
 elsif action_kind='accept' then
  select max((a->>'level')::int) into highest from jsonb_array_elements(p_state->'approvals')a;
  update erp.work_notifications n set completed_at=now() where n.task_id=p_task and n.completed_at is null and ((n.kind='review' and n.level<=highest) or (n.kind='repair' and highest>=0));
  if level<3 and highest<level+1 then
   for recipient in select value::uuid from jsonb_array_elements_text(ctx->'subjects'->(level+1)::text) loop
    if recipient<>person then insert into erp.work_notifications(organization_id,project_id,task_id,event_id,recipient_id,kind,level) values(plan.organization_id,p_project,p_task,p_request,recipient,'review',level+1) on conflict do nothing;end if;end loop;
  end if;
 elsif action_kind='shares' then
  for recipient in select distinct (s->>'person_id')::uuid from jsonb_array_elements(coalesce(p_event->'before'->'shares','[]')||p_state->'shares')s loop
   insert into erp.work_notifications(organization_id,project_id,task_id,event_id,recipient_id,kind) values(plan.organization_id,p_project,p_task,p_request,recipient,'info') on conflict do nothing;end loop;
 end if;
 if action_kind in ('shares','accept') and rank>=2 then
  for subject in select (s->>'person_id')::uuid from jsonb_array_elements(p_state->'shares')s loop
   if not exists(select 1 from erp.project_assignments a where a.organization_id=plan.organization_id and a.project_id=p_project and a.person_id=subject and a.revoked_at is null and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now())) and not exists(select 1 from erp.person_roles r where r.organization_id=plan.organization_id and r.person_id=subject and r.role='office' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now())) then
    if p_role='office' then
     select min(a.valid_from) into future_day from erp.project_assignments a where a.organization_id=plan.organization_id and a.project_id=p_project and a.person_id=subject and a.revoked_at is null and a.valid_from>now();
     insert into erp.project_assignments(organization_id,project_id,person_id,role,valid_from,valid_until,created_by) values(plan.organization_id,p_project,subject,'construction_worker',now(),future_day,p_actor);
    else for recipient in select value::uuid from jsonb_array_elements_text(ctx->'subjects'->'2') loop insert into erp.work_notifications(organization_id,project_id,task_id,event_id,recipient_id,kind) values(plan.organization_id,p_project,p_task,p_request,recipient,'assignment') on conflict do nothing;end loop;end if;
   end if;
  end loop;
 end if;
 return jsonb_build_object('revision',taskrow.revision);end$$;
create or replace function public.erp_client_portal(p_user uuid,p_session uuid,p_quote uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$declare a erp_private.client_accounts;begin
 a:=erp_private.require_client_session(p_user,p_session);
 return jsonb_build_object('name',(select display_name from erp.persons where organization_id=a.organization_id and id=a.person_id),'organization_id',a.organization_id,
 'sites',coalesce((select jsonb_agg(jsonb_build_object('id',s.source_location_id,'address',w.address)) from erp.client_site_access s join erp.work_sites w on w.organization_id=s.organization_id and w.source_location_id=s.source_location_id where s.account_id=a.id and s.active),'[]'),
 'projects',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'work_type',p.work_type,'status',p.work_status,'address',p.site_address,'location_id',p.source_location_id,'scheduled_date',p.scheduled_date,'quote_id',p.accepted_quote_id,'updated_at',p.updated_at) order by p.created_at desc) from erp.garden_projects p where p.organization_id=a.organization_id and p.work_status<>'preparation' and exists(select 1 from erp.client_site_access s where s.account_id=a.id and s.active and s.source_customer_id=p.source_customer_id and s.source_location_id=p.source_location_id)),'[]'),
 'quotes',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'number',q.number,'status',case when q.status in ('draft','ready') then 'sent' else q.status end,'title',v.input->>'title','date',e.created_at,'version',v.version,'customer',v.customer,'calculation',v.calculation) order by e.created_at desc)
 from erp.quotes q join lateral(select qe.version,qe.created_at from erp.quote_events qe where qe.organization_id=q.organization_id and qe.quote_id=q.id and qe.event in ('manual_send_confirmed','mail_sent','entry_change_accepted') order by qe.created_at desc,qe.version desc limit 1)e on true join erp.quote_versions v on v.organization_id=q.organization_id and v.quote_id=q.id and v.version=e.version
 where q.organization_id=a.organization_id and (p_quote is null or q.id=p_quote) and exists(select 1 from erp.client_site_access s where s.account_id=a.id and s.active and s.source_customer_id=q.source_customer_id and s.source_location_id=q.source_location_id)),'[]'));
 end$$;
create function public.erp_entry_replay(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_request uuid,p_fingerprint text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare prior erp.project_entry_events;begin
 perform erp_private.entry_scope(p_actor,p_session,p_project,p_role,null);
 select * into prior from erp.project_entry_events where id=p_request;
 if not found then return null;end if;
 perform erp_private.entry_scope(p_actor,p_session,p_project,p_role,prior.entry_id);
 if prior.project_id<>p_project or prior.actor_auth_id<>p_actor or prior.active_role<>p_role or prior.data->>'client_fingerprint' is distinct from p_fingerprint then raise exception 'Eltérő ismételt kérés.' using errcode='40001';end if;
 return prior.result||jsonb_build_object('replayed',true);
end$$;
revoke all on function public.erp_entry_replay(uuid,uuid,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.erp_entry_replay(uuid,uuid,uuid,text,uuid,text) to service_role;

create or replace function public.erp_plan_notifications(p_actor uuid,p_session uuid,p_notification uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$declare row record;result jsonb:='[]';scope jsonb;project_row jsonb;entry_row record;active_role text;begin
 for row in select a.organization_id,a.person_id from erp.user_accounts a join erp.persons p on p.organization_id=a.organization_id and p.id=a.person_id where a.auth_user_id=p_actor and a.active and p.active loop
 if exists(select 1 from erp_private.staff_accounts where auth_user_id=p_actor) then perform erp_private.require_staff_session(p_actor,p_session);end if;
 if exists(select 1 from erp_private.client_accounts where auth_user_id=p_actor) then perform erp_private.require_client_session(p_actor,p_session);end if;
 if p_notification is not null then update erp.work_notifications set read_at=coalesce(read_at,now()) where id=p_notification and organization_id=row.organization_id and recipient_id=row.person_id;end if;
 result:=result||coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'project_id',n.project_id,'task_id',n.task_id,'kind',n.kind,'level',n.level,'created_at',n.created_at,'read_at',n.read_at,'completed_at',n.completed_at) order by n.created_at desc) from (select * from erp.work_notifications x where x.organization_id=row.organization_id and x.recipient_id=row.person_id order by x.created_at desc limit 100)n),'[]');end loop;

 for project_row in select value from jsonb_array_elements(public.erp_plan_projects(p_actor,p_session)) loop
 active_role:=case when project_row->'roles' ? 'office' then 'office' when project_row->'roles' ? 'client' then 'client' when project_row->'roles' ? 'construction_lead' then 'construction_lead' when project_row->'roles' ? 'construction_worker' then 'construction_worker' else 'gardener' end;
 scope:=erp_private.entry_scope(p_actor,p_session,(project_row->>'id')::uuid,active_role,null);
 for entry_row in select e.* from erp.project_entries e where e.project_id=(project_row->>'id')::uuid and not e.archived and e.state not in('applied','closed','withdrawn','rejected','liability_agreed') and
 ((e.recipient_id=(scope->>'person_id')::uuid) or (e.state='needs_office' and active_role='office') or (e.state='needs_client' and active_role='client') or (e.kind in('request','complaint','defect') and active_role in('office','construction_lead') and (active_role='office' or e.visible_to_team)) or (e.kind='defect' and e.state='repaired' and active_role='client') or (e.kind='damage' and active_role in('office','client'))) order by e.updated_at desc limit 100 loop
 result:=result||jsonb_build_array(jsonb_build_object('id',entry_row.id,'entry_id',entry_row.id,'project_id',entry_row.project_id,'kind','entry','role',active_role,'state',entry_row.state,'created_at',entry_row.updated_at,'completed_at',null));
 end loop;end loop;
 return result;end$$;

commit;
