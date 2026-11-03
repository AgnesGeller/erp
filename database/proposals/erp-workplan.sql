-- Jóváhagyott munkaterv és négyszintű átvétel. Csak ERP.
begin;
create table erp.workplans(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,project_id uuid not null,
 quote_id uuid not null,quote_version bigint not null,revision bigint not null default 1,
 created_by uuid not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(organization_id,id),unique(organization_id,project_id),
 foreign key(organization_id,project_id) references erp.garden_projects(organization_id,id),
 foreign key(organization_id,quote_id,quote_version) references erp.quote_versions(organization_id,quote_id,version));
create table erp.project_tasks(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,plan_id uuid not null,
 source_line_id text not null check(length(source_line_id) between 1 and 200),section text not null check(length(section) between 1 and 200),
 title text not null check(length(btrim(title)) between 1 and 500),original_title text not null,
 quantity numeric(22,6) not null check(quantity>=0),unit text not null,
 labor numeric(22,2) not null check(labor>=0),net numeric(22,2) not null check(net>=0),
 original_minutes numeric(22,6),planned_minutes numeric(22,6),internal_info text not null default '' check(length(internal_info)<=12000),
 sort integer not null check(sort>=0),start_date date,end_date date,revision bigint not null default 1,
 state jsonb not null default '{"round":0,"approvals":[],"shares":[],"share_lock":0}',
 check(original_minutes is null or original_minutes>=0),check(planned_minutes is null or planned_minutes>=0),
 check(end_date is null or start_date is null or end_date>=start_date),check(jsonb_typeof(state->'approvals')='array' and jsonb_typeof(state->'shares')='array'),
 unique(organization_id,plan_id,id),unique(plan_id,source_line_id),
 foreign key(organization_id,plan_id) references erp.workplans(organization_id,id));
create index project_tasks_order on erp.project_tasks(plan_id,sort,id);
create table erp.task_dependencies(
 organization_id uuid not null,plan_id uuid not null,task_id uuid not null,requires_task uuid not null,
 primary key(plan_id,task_id,requires_task),check(task_id<>requires_task),
 foreign key(organization_id,plan_id,task_id) references erp.project_tasks(organization_id,plan_id,id),
 foreign key(organization_id,plan_id,requires_task) references erp.project_tasks(organization_id,plan_id,id));
create index task_dependency_predecessor on erp.task_dependencies(plan_id,requires_task);
create table erp.task_events(
 id uuid primary key,organization_id uuid not null,project_id uuid not null,task_id uuid,
 actor_id uuid not null,actor_auth_id uuid not null,active_role text not null,
 kind text not null check(kind in ('init','graph','accept','reject','shares','time','color')),
 request_payload jsonb not null,data jsonb not null,result_revision bigint not null,
 created_at timestamptz not null default now(),
 unique(organization_id,id),foreign key(organization_id,project_id) references erp.garden_projects(organization_id,id),
 foreign key(task_id) references erp.project_tasks(id));
create index task_events_project_time on erp.task_events(organization_id,project_id,created_at desc,id);
create index task_events_task on erp.task_events(task_id,created_at desc);
create table erp.work_notifications(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,project_id uuid not null,task_id uuid,
 event_id uuid not null,recipient_id uuid not null,kind text not null check(kind in ('review','repair','info','attribution','assignment')),
 level smallint,created_at timestamptz not null default now(),read_at timestamptz,completed_at timestamptz,
 unique(event_id,recipient_id,kind),foreign key(organization_id,event_id) references erp.task_events(organization_id,id),
 foreign key(organization_id,recipient_id) references erp.persons(organization_id,id),
 foreign key(organization_id,project_id) references erp.garden_projects(organization_id,id));
create index work_notifications_person on erp.work_notifications(organization_id,recipient_id,created_at desc);
create index work_notifications_task on erp.work_notifications(task_id) where completed_at is null;
create table erp.person_colors(
 organization_id uuid not null,person_id uuid not null,color text not null check(color ~ '^#[a-fA-F0-9]{6}$'),
 source_kind text not null check(source_kind in ('napi','manual','default')),source_ref text,revision bigint not null default 1,
 updated_at timestamptz not null default now(),primary key(organization_id,person_id),
 foreign key(organization_id,person_id) references erp.persons(organization_id,id));
do $$declare t text;begin foreach t in array array['workplans','project_tasks','task_dependencies','task_events','work_notifications','person_colors'] loop
 execute format('alter table erp.%I enable row level security',t);execute format('alter table erp.%I force row level security',t);execute format('revoke all on erp.%I from public,anon,authenticated,service_role',t);end loop;end$$;
create function erp_private.task_baseline_guard() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if (new.organization_id,new.plan_id,new.source_line_id,new.quantity,new.unit,new.labor,new.net,new.original_minutes,new.original_title) is distinct from (old.organization_id,old.plan_id,old.source_line_id,old.quantity,old.unit,old.labor,old.net,old.original_minutes,old.original_title) then raise exception 'Az elfogadott ajánlat és az eredeti tervadat nem írható át.' using errcode='22023';end if;return new;end$$;
revoke all on function erp_private.task_baseline_guard() from public,anon,authenticated,service_role;
create trigger task_baseline before update on erp.project_tasks for each row execute function erp_private.task_baseline_guard();
create function erp_private.task_event_immutable() returns trigger language plpgsql security invoker set search_path='' as $$begin raise exception 'Az átvételi előzmény megőrzött, nem írható át vagy törölhető.' using errcode='42501';end$$;
revoke all on function erp_private.task_event_immutable() from public,anon,authenticated,service_role;
create trigger task_event_history before update or delete on erp.task_events for each row execute function erp_private.task_event_immutable();
create function erp_private.plan_scope(p_actor uuid,p_session uuid,p_project uuid,p_role text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare project erp.garden_projects;person uuid;office boolean;client erp_private.client_accounts;staff erp_private.staff_accounts;roles jsonb;subjects jsonb;people jsonb;begin
 select * into project from erp.garden_projects where id=p_project;if not found or project.work_type<>'construction' or project.accepted_quote_id is null then raise exception 'A kertépítés nem elérhető.' using errcode='42501';end if;
 select a.person_id into person from erp.user_accounts a join erp.persons p on p.organization_id=a.organization_id and p.id=a.person_id where a.organization_id=project.organization_id and a.auth_user_id=p_actor and a.active and p.active;
 if person is null then raise exception 'Nincs aktív ERP-hozzáférés.' using errcode='42501';end if;
 office:=exists(select 1 from erp.person_roles r where r.organization_id=project.organization_id and r.person_id=person and r.role='office' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now()));
 if office then roles:='["office","construction_lead","construction_worker","gardener"]';
 elsif p_role='client' then
  client:=erp_private.require_client_session(p_actor,p_session);
  if client.organization_id<>project.organization_id or not exists(select 1 from erp.client_site_access s where s.organization_id=project.organization_id and s.account_id=client.id and s.active and s.source_customer_id=project.source_customer_id and s.source_location_id=project.source_location_id) then raise exception 'Ez nem a hozzád rendelt munkavégzési cím.' using errcode='42501';end if;roles:='["client"]';
 else
  staff:=erp_private.require_staff_session(p_actor,p_session);
  if staff.organization_id<>project.organization_id or project.work_status<>'running' then raise exception 'A munka még nem indult el vagy nem elérhető.' using errcode='42501';end if;
  select coalesce(jsonb_agg(distinct a.role),'[]') into roles from erp.project_assignments a where a.organization_id=project.organization_id and a.project_id=project.id and a.person_id=person and a.role in ('construction_lead','construction_worker','gardener') and a.revoked_at is null and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now());
 end if;
 if p_role is null or not roles ? p_role then raise exception 'Ez a munkaszerep nincs érvényesen kiosztva.' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.display_name,'active',p.active,'color_revision',coalesce(c.revision,0),'color_source',coalesce(c.source_kind,'default'),'color',coalesce(c.color,case when exists(select 1 from erp.person_roles r where r.organization_id=p.organization_id and r.person_id=p.id and r.role='office' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now())) then '#ffffff' else '#56636b' end)) order by p.display_name),'[]') into people from erp.persons p left join erp.person_colors c on c.organization_id=p.organization_id and c.person_id=p.id where p.organization_id=project.organization_id and exists(select 1 from erp.person_roles r where r.organization_id=p.organization_id and r.person_id=p.id and r.role in ('worker','office') and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now()));
 subjects:=jsonb_build_object(
 '0',coalesce((select jsonb_agg(p.id order by p.id) from erp.persons p where p.organization_id=project.organization_id and p.active and exists(select 1 from erp.person_roles r where r.organization_id=p.organization_id and r.person_id=p.id and r.role in ('worker','office') and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now()))),'[]'),
 '1',coalesce((select jsonb_agg(p.id order by p.id) from erp.persons p where p.organization_id=project.organization_id and p.active and (exists(select 1 from erp.person_roles r where r.organization_id=p.organization_id and r.person_id=p.id and r.role='office' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now())) or exists(select 1 from erp.project_assignments a where a.organization_id=p.organization_id and a.project_id=project.id and a.person_id=p.id and a.role='construction_lead' and a.revoked_at is null and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now())))),'[]'),
 '2',coalesce((select jsonb_agg(p.id order by p.id) from erp.persons p where p.organization_id=project.organization_id and p.active and exists(select 1 from erp.person_roles r where r.organization_id=p.organization_id and r.person_id=p.id and r.role='office' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now()))),'[]'),
 '3',coalesce((select jsonb_agg(c.person_id order by c.person_id) from erp_private.client_accounts c join erp.persons p on p.organization_id=c.organization_id and p.id=c.person_id where c.organization_id=project.organization_id and c.active and p.active and exists(select 1 from erp.client_site_access s where s.account_id=c.id and s.organization_id=c.organization_id and s.active and s.source_customer_id=project.source_customer_id and s.source_location_id=project.source_location_id)),'[]'));
 if p_role='client' then
 subjects:=jsonb_set(subjects,'{0}',coalesce((select jsonb_agg(p.id order by p.id) from erp.persons p where p.organization_id=project.organization_id and p.active and (exists(select 1 from erp.person_roles r where r.organization_id=p.organization_id and r.person_id=p.id and r.role='office' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now())) or exists(select 1 from erp.project_assignments a where a.organization_id=p.organization_id and a.project_id=project.id and a.person_id=p.id and a.revoked_at is null and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now())))),'[]'));
 end if;
 people:=people||coalesce((select jsonb_agg(jsonb_build_object('id',c.person_id,'name',p.display_name,'active',c.active,'color',coalesce(pc.color,'#287b83'),'color_revision',coalesce(pc.revision,0),'color_source',coalesce(pc.source_kind,'default'))) from erp_private.client_accounts c join erp.persons p on p.id=c.person_id left join erp.person_colors pc on pc.organization_id=c.organization_id and pc.person_id=c.person_id where c.organization_id=project.organization_id and exists(select 1 from erp.client_site_access a where a.account_id=c.id and a.organization_id=c.organization_id and a.active and a.source_customer_id=project.source_customer_id and a.source_location_id=project.source_location_id)),'[]');
 return jsonb_build_object('organization_id',project.organization_id,'person_id',person,'role',p_role,'roles',roles,'office',office,'can_act',project.work_status='running','can_edit',p_role='office' and project.work_status in ('waiting_start','running'),'subjects',subjects,'people',people,'at',clock_timestamp(),'project',jsonb_build_object('id',project.id,'name',project.name,'address',project.site_address,'status',project.work_status,'quote_id',project.accepted_quote_id,'quote_version',project.accepted_quote_version));
end$$;
revoke all on function erp_private.plan_scope(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.erp_plan_projects(p_actor uuid,p_session uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare person uuid;org uuid;office boolean;result jsonb:='[]';row record;roles jsonb;begin
 for row in select a.organization_id,a.person_id from erp.user_accounts a join erp.persons p on p.organization_id=a.organization_id and p.id=a.person_id where a.auth_user_id=p_actor and a.active and p.active loop
 org:=row.organization_id;person:=row.person_id;office:=exists(select 1 from erp.person_roles r where r.organization_id=org and r.person_id=person and r.role='office' and r.revoked_at is null and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now()));
 if not office then if exists(select 1 from erp_private.staff_accounts where auth_user_id=p_actor) then perform erp_private.require_staff_session(p_actor,p_session);elsif exists(select 1 from erp_private.client_accounts where auth_user_id=p_actor) then perform erp_private.require_client_session(p_actor,p_session);else raise exception 'Saját ERP-belépés szükséges.' using errcode='42501';end if;end if;
 result:=result||coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'organization_id',p.organization_id,'name',p.name,'address',p.site_address,'status',p.work_status,'roles',case when office then '["office","construction_lead","construction_worker","gardener"]'::jsonb when exists(select 1 from erp_private.client_accounts c where c.auth_user_id=p_actor and c.organization_id=org) then '["client"]'::jsonb else coalesce((select jsonb_agg(distinct a.role) from erp.project_assignments a where a.organization_id=org and a.project_id=p.id and a.person_id=person and a.role in ('construction_lead','construction_worker','gardener') and a.revoked_at is null and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now())),'[]') end,'has_plan',exists(select 1 from erp.workplans w where w.organization_id=p.organization_id and w.project_id=p.id)) order by p.created_at desc) from erp.garden_projects p where p.organization_id=org and p.work_type='construction' and p.accepted_quote_id is not null and (office or (p.work_status='running' and exists(select 1 from erp.project_assignments a where a.organization_id=org and a.project_id=p.id and a.person_id=person and a.role in ('construction_lead','construction_worker','gardener') and a.revoked_at is null and a.valid_from<=now() and (a.valid_until is null or a.valid_until>now()))) or exists(select 1 from erp_private.client_accounts c join erp.client_site_access s on s.organization_id=c.organization_id and s.account_id=c.id where c.organization_id=org and c.auth_user_id=p_actor and c.active and s.active and s.source_customer_id=p.source_customer_id and s.source_location_id=p.source_location_id))),'[]');end loop;return result;end$$;
create function erp_private.plan_task_json(t erp.project_tasks) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',t.id,'source_line_id',t.source_line_id,'section',t.section,'title',t.title,'original_title',t.original_title,'quantity',t.quantity::text,'unit',t.unit,'labor',t.labor::text,'net',t.net::text,'original_minutes',t.original_minutes::text,'planned_minutes',t.planned_minutes::text,'internal_info',t.internal_info,'sort',t.sort,'start_date',t.start_date,'end_date',t.end_date,'dependencies',coalesce((select jsonb_agg(d.requires_task order by d.requires_task) from erp.task_dependencies d where d.plan_id=t.plan_id and d.task_id=t.id),'[]'),'round',t.state->'round','approvals',t.state->'approvals','shares',t.state->'shares','share_lock',t.state->'share_lock','revision',t.revision)
$$;
revoke all on function erp_private.plan_task_json(erp.project_tasks) from public,anon,authenticated,service_role;
create function public.erp_plan_read(p_actor uuid,p_session uuid,p_project uuid,p_role text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare ctx jsonb;plan erp.workplans;begin
 ctx:=erp_private.plan_scope(p_actor,p_session,p_project,p_role);select * into plan from erp.workplans where project_id=p_project;
 return jsonb_build_object('context',ctx,'plan',case when plan.id is null then null else jsonb_build_object('id',plan.id,'revision',plan.revision,'quote_id',plan.quote_id,'quote_version',plan.quote_version) end,'tasks',coalesce((select jsonb_agg(erp_private.plan_task_json(t) order by t.sort,t.id) from erp.project_tasks t where t.plan_id=plan.id),'[]'),
 'events',coalesce((select jsonb_agg(x.value order by x.created_at desc,x.id desc) from(select e.id,e.created_at,jsonb_build_object('id',e.id,'task_id',e.task_id,'actor_id',e.actor_id,'active_role',e.active_role,'kind',e.kind,'created_at',e.created_at,'data',e.data) as value from erp.task_events e where e.organization_id=plan.organization_id and e.project_id=p_project order by e.created_at desc,e.id desc limit 100)x),'[]'));
end$$;
create function public.erp_plan_init(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare ctx jsonb;project erp.garden_projects;plan erp.workplans;v erp.quote_versions;s jsonb;l jsonb;position int:=0;begin
 ctx:=erp_private.plan_scope(p_actor,p_session,p_project,p_role);if not (ctx->>'can_edit')::boolean or p_request is null then raise exception 'Irodai munkaszerep és szerkeszthető projekt szükséges.' using errcode='42501';end if;
 select * into project from erp.garden_projects where id=p_project for update;
 select * into plan from erp.workplans where project_id=p_project;if found then return jsonb_build_object('id',plan.id,'revision',plan.revision);end if;
 select * into v from erp.quote_versions where organization_id=project.organization_id and quote_id=project.accepted_quote_id and version=project.accepted_quote_version;
 if not found or coalesce(jsonb_array_length(v.calculation->'issues'),0)<>0 then raise exception 'Nem teljes az elfogadott ajánlat pillanatképe.' using errcode='22023';end if;
 insert into erp.workplans(organization_id,project_id,quote_id,quote_version,created_by) values(project.organization_id,p_project,v.quote_id,v.version,p_actor) returning * into plan;
 for s in select * from jsonb_array_elements(v.calculation->'sections') loop for l in select * from jsonb_array_elements(s->'lines') loop
 if coalesce((l->>'incomplete')::boolean,false) then raise exception 'Hiányos ajánlati sor.' using errcode='22023';end if;position:=position+1;if position>1000 then raise exception 'Legfeljebb ezer munkafázis kezelhető egy tervben.' using errcode='22023';end if;
 insert into erp.project_tasks(organization_id,plan_id,source_line_id,section,title,original_title,quantity,unit,labor,net,original_minutes,planned_minutes,internal_info,sort)
 values(project.organization_id,plan.id,l->>'id',s->>'name',l->>'label',l->>'label',(l->>'quantity')::numeric,l->>'unit',(l->>'labor')::numeric,(l->>'net')::numeric,(l->>'planned_minutes')::numeric,(l->>'planned_minutes')::numeric,coalesce(l->>'internal_info',''),position);
 end loop;end loop;
 if position=0 then raise exception 'Az ajánlat nem tartalmaz munkafázist.' using errcode='22023';end if;
 if (select sum(labor) from erp.project_tasks where plan_id=plan.id) is distinct from (v.calculation->>'labor')::numeric then raise exception 'A terv munkadíja eltér az elfogadott ajánlattól.' using errcode='22023';end if;
 insert into erp.task_events(id,organization_id,project_id,actor_id,actor_auth_id,active_role,kind,request_payload,data,result_revision) values(p_request,project.organization_id,p_project,(ctx->>'person_id')::uuid,p_actor,p_role,'init','{}',jsonb_build_object('tasks',position,'quote_version',v.version),plan.revision);
 return jsonb_build_object('id',plan.id,'revision',plan.revision);end$$;
create function public.erp_plan_graph_save(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_request uuid,p_revision bigint,p_tasks jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare ctx jsonb;plan erp.workplans;prior erp.task_events;row jsonb;before jsonb;ids uuid[];recipient uuid;begin
 ctx:=erp_private.plan_scope(p_actor,p_session,p_project,p_role);if not (ctx->>'can_edit')::boolean then raise exception 'A munkatervet csak irodai munkaszereppel szerkesztheted.' using errcode='42501';end if;
 select * into plan from erp.workplans where project_id=p_project for update;if not found then raise exception 'A munkaterv nincs létrehozva.' using errcode='22023';end if;
 select * into prior from erp.task_events where id=p_request;if found then if prior.project_id<>p_project or prior.actor_auth_id<>p_actor or prior.active_role<>p_role or prior.kind<>'graph' or prior.request_payload<>p_tasks then raise exception 'Eltérő ismételt kérés.' using errcode='40001';end if;return jsonb_build_object('revision',prior.result_revision,'replayed',true);end if;
 if p_revision is null or p_revision<>plan.revision then raise exception 'A munkaterv megváltozott.' using errcode='40001';end if;
 if p_request is null or jsonb_typeof(p_tasks) is distinct from 'array' or jsonb_array_length(p_tasks)<>(select count(*) from erp.project_tasks where plan_id=plan.id) then raise exception 'A munkafázisok hiányosak.' using errcode='22023';end if;
 select array_agg((x->>'id')::uuid) into ids from jsonb_array_elements(p_tasks)x;
 if cardinality(ids)<>(select count(distinct x) from unnest(ids)x) or exists(select 1 from unnest(ids)x where not exists(select 1 from erp.project_tasks t where t.id=x and t.plan_id=plan.id)) then raise exception 'Idegen vagy ismételt munkafázis.' using errcode='42501';end if;
 select jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'sort',t.sort,'start_date',t.start_date,'end_date',t.end_date,'internal_info',t.internal_info,'dependencies',coalesce((select jsonb_agg(d.requires_task order by d.requires_task) from erp.task_dependencies d where d.task_id=t.id),'[]')) order by t.sort,t.id) into before from erp.project_tasks t where t.plan_id=plan.id;
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
create function public.erp_plan_task_context(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_task uuid,p_request uuid,p_command jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$declare ctx jsonb;t erp.project_tasks;prior erp.task_events;begin
 ctx:=erp_private.plan_scope(p_actor,p_session,p_project,p_role);if not (ctx->>'can_act')::boolean then raise exception 'Átvétel csak külön elindított kertépítésen rögzíthető.' using errcode='42501';end if;
 select * into t from erp.project_tasks where id=p_task and plan_id in(select id from erp.workplans where project_id=p_project);if not found then raise exception 'A munkafázis nem elérhető.' using errcode='42501';end if;
 select * into prior from erp.task_events where id=p_request;if found then if prior.task_id<>p_task or prior.actor_auth_id<>p_actor or prior.active_role<>p_role or prior.request_payload<>p_command then raise exception 'Eltérő ismételt kérés.' using errcode='40001';end if;return jsonb_build_object('replayed',true,'revision',prior.result_revision);end if;
 return jsonb_build_object('context',ctx,'task',erp_private.plan_task_json(t));end$$;
create function public.erp_plan_task_save(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_task uuid,p_request uuid,p_revision bigint,p_command jsonb,p_state jsonb,p_event jsonb,p_minutes text) returns jsonb language plpgsql security definer set search_path='' as $$
declare ctx jsonb;taskrow erp.project_tasks;plan erp.workplans;prior erp.task_events;action_kind text:=p_command->>'type';rank int;level int;subject uuid;recipient uuid;last_approval jsonb;highest int;person uuid;future_day timestamptz;begin
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
create function public.erp_plan_notifications(p_actor uuid,p_session uuid,p_notification uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$declare row record;result jsonb:='[]';scope jsonb;begin
 for row in select a.organization_id,a.person_id from erp.user_accounts a join erp.persons p on p.organization_id=a.organization_id and p.id=a.person_id where a.auth_user_id=p_actor and a.active and p.active loop
 if exists(select 1 from erp_private.staff_accounts where auth_user_id=p_actor) then perform erp_private.require_staff_session(p_actor,p_session);end if;
 if exists(select 1 from erp_private.client_accounts where auth_user_id=p_actor) then perform erp_private.require_client_session(p_actor,p_session);end if;
 if p_notification is not null then update erp.work_notifications set read_at=coalesce(read_at,now()) where id=p_notification and organization_id=row.organization_id and recipient_id=row.person_id;end if;
 result:=result||coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'project_id',n.project_id,'task_id',n.task_id,'kind',n.kind,'level',n.level,'created_at',n.created_at,'read_at',n.read_at,'completed_at',n.completed_at) order by n.created_at desc) from (select * from erp.work_notifications x where x.organization_id=row.organization_id and x.recipient_id=row.person_id order by x.created_at desc limit 100)n),'[]');end loop;
 return result;end$$;
create function public.erp_plan_color_save(p_org uuid,p_actor uuid,p_person uuid,p_color text,p_revision bigint,p_source text default 'manual',p_ref text default null) returns jsonb language plpgsql security definer set search_path='' as $$declare c erp.person_colors;begin
 perform erp_private.require_customer_office(p_org,p_actor);
 if p_color !~ '^#[a-fA-F0-9]{6}$' or p_source not in ('manual','napi','default') or p_revision is null then raise exception 'Érvénytelen személyszín.' using errcode='22023';end if;
 if not exists(select 1 from erp.persons where organization_id=p_org and id=p_person) then raise exception 'Idegen személy.' using errcode='42501';end if;
 select * into c from erp.person_colors where organization_id=p_org and person_id=p_person for update;
 if found then if c.revision<>p_revision then raise exception 'A személyszín megváltozott.' using errcode='40001';end if;update erp.person_colors set color=lower(p_color),source_kind=p_source,source_ref=p_ref,revision=revision+1,updated_at=now() where organization_id=p_org and person_id=p_person returning * into c;
 else if p_revision<>0 then raise exception 'A személyszín megváltozott.' using errcode='40001';end if;insert into erp.person_colors(organization_id,person_id,color,source_kind,source_ref) values(p_org,p_person,lower(p_color),p_source,p_ref) returning * into c;end if;
 insert into erp.audit_events(organization_id,actor_id,entity,entity_id,operation,after_data) values(p_org,p_actor,'person_color',p_person,'SAVE',jsonb_build_object('color',p_color,'source',p_source,'source_ref',p_ref));return jsonb_build_object('revision',c.revision);end$$;
create function public.erp_plan_statistics(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_from date default null,p_until date default null) returns jsonb language plpgsql stable security definer set search_path='' as $$declare ctx jsonb;begin
 ctx:=erp_private.plan_scope(p_actor,p_session,p_project,p_role);if p_role='client' then raise exception 'A belső személyes statisztika ügyfélként nem érhető el.' using errcode='42501';end if;
 if p_from is not null and p_until is not null and p_until<p_from then raise exception 'Hibás időszak.' using errcode='22023';end if;
 return coalesce((with affected as (
 select distinct e.id,e.task_id,x.value::uuid as person_id,e.actor_id as returned_by,(e.data->>'recipient')::uuid as recipient from erp.task_events e cross join lateral jsonb_array_elements_text(coalesce(e.data->'affected_actors','[]'))x where e.project_id=p_project and e.kind='reject' and (p_from is null or e.created_at>=p_from::timestamp at time zone 'Europe/Budapest') and (p_until is null or e.created_at<(p_until+1)::timestamp at time zone 'Europe/Budapest')
 ),completed as (
 select t.id as task_id from erp.project_tasks t join erp.workplans p on p.id=t.plan_id where p.project_id=p_project and exists(select 1 from jsonb_array_elements(t.state->'approvals')a where (a->>'level')::int=3 and (p_from is null or (a->>'at')::timestamptz>=p_from::timestamp at time zone 'Europe/Budapest') and (p_until is null or (a->>'at')::timestamptz<(p_until+1)::timestamp at time zone 'Europe/Budapest'))
 ),participants as (
 select distinct e.actor_id as person_id,e.task_id from erp.task_events e join completed c on c.task_id=e.task_id where e.project_id=p_project and e.kind='accept' and (e.data->>'level')::int<3
 ),who as (select person_id from affected union select person_id from participants)
 select jsonb_agg(jsonb_build_object('person_id',p.id,'name',p.display_name,'returns',(select count(*) from affected a where a.person_id=p.id),'completed_tasks',(select count(*) from participants a where a.person_id=p.id),'first_pass_tasks',(select count(*) from participants a where a.person_id=p.id and not exists(select 1 from erp.task_events e where e.project_id=p_project and e.task_id=a.task_id and e.kind='reject' and e.data->'affected_actors' ? p.id::text)),
 'returned_by',coalesce((select jsonb_agg(jsonb_build_object('person_id',x.returned_by,'name',r.display_name,'count',x.n)) from (select a.returned_by,count(*) as n from affected a where a.person_id=p.id group by a.returned_by)x join erp.persons r on r.id=x.returned_by),'[]'),
 'repair_recipients',coalesce((select jsonb_agg(jsonb_build_object('person_id',x.recipient,'name',r.display_name,'count',x.n)) from (select a.recipient,count(*) as n from affected a where a.person_id=p.id group by a.recipient)x join erp.persons r on r.id=x.recipient),'[]')) order by p.display_name) from who w join erp.persons p on p.id=w.person_id where p_role in ('office','construction_lead') or p.id=(ctx->>'person_id')::uuid),'[]');end$$;
create function public.erp_plan_history(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_before timestamptz default null,p_before_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$declare ctx jsonb;events jsonb;lasttime timestamptz;lastid uuid;begin
 ctx:=erp_private.plan_scope(p_actor,p_session,p_project,p_role);
 select jsonb_agg(jsonb_build_object('id',e.id,'task_id',e.task_id,'actor_id',e.actor_id,'active_role',e.active_role,'kind',e.kind,'created_at',e.created_at,'data',e.data) order by e.created_at desc,e.id desc) into events from(select * from erp.task_events x where x.project_id=p_project and (p_before is null or (x.created_at,x.id)<(p_before,p_before_id)) order by x.created_at desc,x.id desc limit 100)e;
 if jsonb_array_length(coalesce(events,'[]'))=100 then lasttime:=(events->99->>'created_at')::timestamptz;lastid:=(events->99->>'id')::uuid;end if;
 return jsonb_build_object('events',coalesce(events,'[]'),'cursor',case when lastid is null then null else jsonb_build_object('time',lasttime,'id',lastid) end);end$$;
do $$declare f record;begin for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('erp_plan_projects','erp_plan_read','erp_plan_init','erp_plan_graph_save','erp_plan_task_context','erp_plan_task_save','erp_plan_notifications','erp_plan_color_save','erp_plan_statistics','erp_plan_history') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to service_role',f.signature);end loop;end$$;
create index if not exists task_dependency_owner_task on erp.task_dependencies(organization_id,plan_id,task_id);
create index if not exists task_dependency_owner_required on erp.task_dependencies(organization_id,plan_id,requires_task);
create index if not exists work_notification_project on erp.work_notifications(organization_id,project_id);
create index if not exists work_notification_event on erp.work_notifications(organization_id,event_id);
create index if not exists workplan_quote_version on erp.workplans(organization_id,quote_id,quote_version);
create index if not exists workplan_project_lookup on erp.workplans(project_id);
commit;
