-- Kizárólag saját ERP-fogyasztók; a szakaszolás után, egy tranzakcióban telepítendő.
begin;
create function erp_private.execution_sync_parent(p_task uuid,p_removed boolean,p_scope_change boolean)returns void language plpgsql security definer set search_path='' as $$declare parent erp.project_tasks;plan erp.workplans;terms jsonb;stage uuid;parts jsonb;alloc_labor jsonb;alloc_minutes jsonb;partrow erp.execution_parts;begin
 select * into parent from erp.project_tasks where id=p_task;select * into plan from erp.workplans where id=parent.plan_id;if plan.execution_mode<>'parts'then return;end if;
 if p_removed then update erp.execution_parts set active=false,revision=revision+1 where parent_task_id=p_task;delete from erp.execution_dependencies d where d.plan_id=plan.id and (not exists(select 1 from erp.execution_parts p where p.id=d.part_id and p.active)or not exists(select 1 from erp.execution_parts p where p.id=d.requires_part and p.active));return;end if;
 terms:=erp_private.plan_task_json(parent);
 select jsonb_agg(jsonb_build_object('id',p.id,'labor_bps',p.labor_bps,'time_bps',p.time_bps))into parts from erp.execution_parts p where p.parent_task_id=p_task and p.active;
 if parts is null or p_scope_change then
 select id into stage from erp.execution_stages where plan_id=plan.id and active and unassigned order by sort limit 1;
 if stage is null then stage:=gen_random_uuid();insert into erp.execution_stages(organization_id,plan_id,id,name,number,sort,unassigned)select plan.organization_id,plan.id,stage,'Besorolásra vár',coalesce(max(number),0)+1,coalesce(max(sort),-1)+1,true from erp.execution_stages where plan_id=plan.id and active;end if;
 if parts is null then
 insert into erp.execution_parts(id,organization_id,plan_id,parent_task_id,stage_id,title,description,sort,quantity,unit,labor_bps,time_bps,labor,original_minutes,planned_minutes)values(gen_random_uuid(),plan.organization_id,plan.id,parent.id,stage,terms->>'contract_label',coalesce(terms->>'contract_info',''),parent.sort,(terms->>'quantity')::numeric,terms->>'unit',10000,10000,(terms->>'labor')::numeric,(terms->>'original_minutes')::numeric,(terms->>'planned_minutes')::numeric);return;
 end if;end if;
 alloc_labor:=erp_private.execution_alloc((terms->>'labor')::numeric,parts,'labor_bps',2);alloc_minutes:=erp_private.execution_alloc((terms->>'planned_minutes')::numeric,parts,'time_bps',6);
 for partrow in select * from erp.execution_parts where parent_task_id=p_task and active loop
 update erp.execution_parts set stage_id=case when p_scope_change then stage else stage_id end,labor=(alloc_labor->>partrow.id::text)::numeric,planned_minutes=case when p_scope_change then (alloc_minutes->>partrow.id::text)::numeric else planned_minutes end,state=case when p_scope_change then jsonb_build_object('round',(state->>'round')::int+1,'approvals','[]'::jsonb,'shares','[]'::jsonb,'share_lock',0)else state end,baseline_active=case when p_scope_change then false else baseline_active end,revision=revision+1 where id=partrow.id;end loop;
end$$;
revoke all on function erp_private.execution_sync_parent(uuid,boolean,boolean)from public,anon,authenticated,service_role;

create or replace function erp_private.finance_contract(p_project uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare g erp.garden_projects;v erp.quote_versions;s jsonb;l jsonb;t erp.project_tasks;lines jsonb:='[]';cumulative numeric:=0;vat_before numeric:=0;line_vat numeric;net numeric;base numeric;vat numeric;accepted boolean;accepted_net numeric:=0;accepted_gross numeric:=0;begin
 select * into g from erp.garden_projects where id=p_project;if g.work_type='maintenance' then return erp_private.maint_contract(p_project);end if;select * into v from erp.quote_versions where organization_id=g.organization_id and quote_id=g.accepted_quote_id and version=g.accepted_quote_version;
 base:=(v.calculation->>'tax_base')::numeric;vat:=(v.calculation->>'vat')::numeric;
 if base is null or vat is null or v.calculation->>'gross' is null or jsonb_array_length(coalesce(v.calculation->'issues','[]'))>0 then raise exception 'Hiányos elfogadott ajánlat; pénzügyi alap nem készíthető.' using errcode='22023';end if;
 for s in select value from jsonb_array_elements(v.calculation->'sections') loop for l in select value from jsonb_array_elements(s->'lines') loop
 net:=(l->>'net')::numeric;cumulative:=cumulative+net;line_vat:=case when base>0 then round(cumulative/base*vat,2)-vat_before else 0 end;vat_before:=vat_before+line_vat;
 select x.* into t from erp.project_tasks x join erp.workplans w on w.id=x.plan_id where w.project_id=g.id and x.source_line_id=l->>'id';
 accepted:=erp_private.execution_parent_accepted(t.id);
 if accepted then accepted_net:=accepted_net+net;accepted_gross:=accepted_gross+net+line_vat;end if;
 lines:=lines||jsonb_build_array(jsonb_build_object('line_id',l->>'id','task_id',t.id,'section',s->>'name','title',l->>'label','net',net::text,'vat',line_vat::text,'gross',(net+line_vat)::text,'accepted',accepted));
 end loop;end loop;
 if cumulative<>base or round(base+vat,2)<>(v.calculation->>'gross')::numeric then raise exception 'Az ajánlati összesítés nem egyezik a tételekkel.' using errcode='22023';end if;
 return jsonb_build_object('quote_id',g.accepted_quote_id,'quote_version',g.accepted_quote_version,'material',v.calculation->>'material','labor',v.calculation->>'labor','net',base::text,'vat',vat::text,'gross',v.calculation->>'gross','vat_mode',v.calculation->>'vat_mode','accepted_net',accepted_net::text,'accepted_gross',accepted_gross::text,'lines',lines);
end$$;

create or replace function erp_private.finance_refresh(p_account uuid,p_event uuid default null,p_actor uuid default null,p_kind text default 'live',p_reason text default '') returns void language plpgsql security definer set search_path='' as $$
declare a erp.finance_accounts;contract jsonb;oldcontract erp.receivable_versions;profit jsonb;ps erp.profit_snapshots;oldprofit erp.profit_snapshots;policy jsonb;pool numeric;weights jsonb:='{}';task erp.project_tasks;doc jsonb;share jsonb;subject uuid;weight numeric;total_weight numeric:=0;assigned numeric:=0;cv uuid;cvnum bigint;signature text;prior_signature text;yearnum int;cum numeric:=0;allocated numeric:=0;part numeric;item record;final boolean;begin
 select * into a from erp.finance_accounts where id=p_account for update;if not found then return;end if;
 contract:=erp_private.finance_contract(a.project_id);select * into oldcontract from erp.receivable_versions where account_id=a.id order by version desc limit 1;
 if oldcontract.source_hash is distinct from md5(contract::text) then
 insert into erp.receivable_versions(organization_id,account_id,version,source_event,source_hash,document,delta) values(a.organization_id,a.id,coalesce(oldcontract.version,0)+1,p_event,md5(contract::text),contract,(contract->>'accepted_gross')::numeric-coalesce((oldcontract.document->>'accepted_gross')::numeric,0));
 update erp.finance_accounts set revision=revision+1,paid_marked=false,updated_at=clock_timestamp() where id=a.id;
 end if;
 if exists(select 1 from erp.garden_projects where id=a.project_id and work_type='maintenance')then return;end if;
 profit:=erp_private.finance_profit(a.project_id);select * into oldprofit from erp.profit_snapshots where account_id=a.id order by version desc limit 1;
 if a.closed and p_kind='live' then return;end if;
 if oldprofit.source_hash is distinct from md5(profit::text) or p_kind<>'live' then
 insert into erp.profit_snapshots(organization_id,account_id,version,source_hash,kind,document,reason,actor_id) values(a.organization_id,a.id,coalesce(oldprofit.version,0)+1,md5(profit::text),p_kind,profit,p_reason,p_actor) returning * into ps;
 else ps:=oldprofit;end if;
 policy:=erp_private.finance_policy(a.organization_id);pool:=case policy->>'commission_basis' when 'labor' then (profit->>'labor')::numeric when 'material' then (profit->>'material')::numeric else (profit->>'total')::numeric end;
 for doc in select value from jsonb_array_elements(erp_private.execution_project_units(a.project_id))loop
 weight:=(doc->>'labor')::numeric;total_weight:=total_weight+weight;
 if exists(select 1 from jsonb_array_elements(doc->'approvals')v where (v->>'level')::int=0)then
 for share in select value from jsonb_array_elements(doc->'shares')loop subject:=(share->>'person_id')::uuid;
 if exists(select 1 from erp.persons where organization_id=a.organization_id and id=subject)then weights:=jsonb_set(weights,array[subject::text],to_jsonb(coalesce((weights->>subject::text)::numeric,0)+weight*(share->>'basis_points')::numeric/10000));end if;end loop;end if;end loop;
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

create or replace function erp_private.worksheet_summary(p_project uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare g erp.garden_projects;planned numeric;actual bigint;people jsonb;begin
 select * into g from erp.garden_projects where id=p_project;
 if exists(select 1 from erp.workplans where project_id=g.id and execution_mode='parts')then select case when count(*)filter(where x->>'planned_minutes' is null)>0 then null else coalesce(sum((x->>'planned_minutes')::numeric),0)end into planned from erp.workplans w cross join lateral jsonb_array_elements(erp_private.execution_current_units(w.id))x where w.project_id=g.id;
 elsif exists(select 1 from erp.workplans where project_id=g.id) then
  select case when count(*) filter(where t.planned_minutes is null)>0 then null else coalesce(sum(t.planned_minutes),0) end into planned from erp.project_tasks t join erp.workplans p on p.id=t.plan_id where p.project_id=g.id and erp_private.entry_task_active(t.id);
 else
  select case when count(*)=0 or count(*) filter(where l->>'planned_minutes' is null)>0 then null else coalesce(sum((l->>'planned_minutes')::numeric),0) end into planned from erp.quote_versions q cross join lateral jsonb_array_elements(q.calculation->'sections')s cross join lateral jsonb_array_elements(s->'lines')l where q.organization_id=g.organization_id and q.quote_id=g.accepted_quote_id and q.version=g.accepted_quote_version;
 end if;
 select coalesce(sum(p.minutes),0) into actual from erp.construction_worksheet_people p join erp.construction_worksheets w on w.id=p.worksheet_id where w.organization_id=g.organization_id and w.project_id=g.id and w.state='active';
 select coalesce(jsonb_agg(jsonb_build_object('id',x.person_id,'name',x.display_name,'color',coalesce(c.color,'#287b83'),'minutes',x.minutes::text) order by x.display_name,x.person_id),'[]') into people from(select p.person_id,n.display_name,sum(p.minutes) as minutes from erp.construction_worksheet_people p join erp.construction_worksheets w on w.id=p.worksheet_id join erp.persons n on n.id=p.person_id where w.organization_id=g.organization_id and w.project_id=g.id and w.state='active' group by p.person_id,n.display_name)x left join erp.person_colors c on c.organization_id=g.organization_id and c.person_id=x.person_id;
 return jsonb_build_object('actual_minutes',actual::text,'planned_minutes',planned::text,'people',people);
end$$;

create or replace function erp_private.entry_apply(p_entry uuid,p_actor uuid,p_person uuid,p_role text,p_event uuid,p_input jsonb,p_calculation jsonb,p_scope_changes jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
  perform erp_private.execution_sync_parent(t.id,line is null,changed);
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
   perform erp_private.execution_sync_parent(t.id,false,true);
  elsif not erp_private.entry_task_active((select id from erp.project_tasks x where x.plan_id=plan.id and x.source_line_id=line->>'id')) then raise exception 'Régi, törölt sorazonosító nem használható új extrához.' using errcode='40001';end if;
 end loop;
 delete from erp.task_dependencies d where d.plan_id=plan.id and (not erp_private.entry_task_active(d.task_id) or not erp_private.entry_task_active(d.requires_task));
 update erp.workplans set revision=revision+1,updated_at=now() where id=plan.id;
 end if;
 update erp.project_entries set state='applied' where id=e.id;
 return jsonb_build_object('application_id',app,'quote_version',nextversion);
end$$;

create or replace function erp_private.worksheet_prepare(p_ctx jsonb,p_sheet uuid,p_document jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare org uuid;project uuid;day date;row jsonb;person uuid;personname text;first int;last int;basefirst int;baselast int;people jsonb:='[]';tasks jsonb;task uuid;seen uuid[]:='{}';seen_tasks uuid[];doc jsonb;parts jsonb;part uuid;seen_parts uuid[];begin
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
  if exists(select 1 from erp.construction_worksheet_versions old cross join lateral jsonb_array_elements(old.document->'people')op where old.worksheet_id=p_sheet and old.version=(select current_version from erp.construction_worksheets where id=p_sheet)and jsonb_array_length(coalesce(op->'part_ids','[]'))>0)and p_document->>'execution_version' is distinct from '1'then raise exception 'Új részfeladatos munkalap érhető el. Frissítsd a nézetet.' using errcode='40001';end if;
  parts:='[]';seen_parts:='{}';if jsonb_typeof(coalesce(row->'part_ids','[]')) is distinct from 'array'or jsonb_array_length(coalesce(row->'part_ids','[]'))>1000 then raise exception 'Hibás részfeladatlista.'using errcode='22023';end if;
  for part in select value::uuid from jsonb_array_elements_text(coalesce(row->'part_ids','[]'))loop
   if part=any(seen_parts)or not exists(select 1 from erp.execution_parts ep join erp.workplans w on w.id=ep.plan_id where ep.id=part and w.project_id=project and w.execution_mode='parts'and(ep.active or exists(select 1 from erp.construction_worksheet_versions old cross join lateral jsonb_array_elements(old.document->'people')op where old.worksheet_id=p_sheet and op->>'person_id'=person::text and op->'part_ids'?part::text)))then raise exception 'Idegen vagy nem aktuális részfeladat.'using errcode='42501';end if;
   seen_parts:=array_append(seen_parts,part);parts:=parts||jsonb_build_array((select jsonb_build_object('id',ep.id,'title',ep.title,'section',s.number||'. '||s.name,'parent_task_id',ep.parent_task_id)from erp.execution_parts ep join erp.execution_stages s on s.plan_id=ep.plan_id and s.id=ep.stage_id where ep.id=part));
  end loop;
  people:=people||jsonb_build_array(jsonb_build_object('person_id',person,'name',personname,'override',coalesce((row->>'override')::boolean,false),'arrival',lpad((first/60)::text,2,'0')||':'||lpad((first%60)::text,2,'0'),'departure',lpad((last/60)::text,2,'0')||':'||lpad((last%60)::text,2,'0'),'start_minute',first,'end_minute',last,'minutes',last-first,'note',btrim(coalesce(row->>'note','')),'task_ids',to_jsonb(seen_tasks),'tasks',tasks)||case when p_document->>'execution_version'='1'or cardinality(seen_parts)>0 then jsonb_build_object('part_ids',to_jsonb(seen_parts),'parts',parts)else '{}'::jsonb end);
 end loop;
 select jsonb_agg(p order by p->>'person_id') into people from jsonb_array_elements(people)p;
 doc:=jsonb_build_object('work_date',day,'arrival',p_document->>'arrival','departure',p_document->>'departure','note',btrim(coalesce(p_document->>'note','')),'people',people);
 if p_document->>'execution_version'='1'then doc:=doc||'{"execution_version":1}';end if;return doc;
end$$;

create or replace function public.erp_sheet_read(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_sheet uuid default null,p_version bigint default null,p_from date default null,p_until date default null,p_before date default null,p_before_id uuid default null,p_voided boolean default false,p_event_before timestamptz default null,p_event_before_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
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
 'execution_mode',coalesce((select execution_mode from erp.workplans where project_id=p_project),'legacy'),'parts',case when p_role='client'then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('id',ep.id,'title',ep.title,'section',s.number||'. '||s.name,'active',ep.active,'parent_task_id',ep.parent_task_id)order by s.sort,ep.sort,ep.id)from erp.execution_parts ep join erp.execution_stages s on s.plan_id=ep.plan_id and s.id=ep.stage_id join erp.workplans wp on wp.id=ep.plan_id where wp.project_id=p_project and wp.execution_mode='parts'),'[]')end,
 'sheet',case when w.id is null then null else jsonb_build_object('id',w.id,'state',w.state,'revision',w.revision,'current_version',w.current_version,'version',v.version,'version_state',v.state,'document',doc,'actor_role',v.active_role,'actor_name',(select display_name from erp.persons where id=v.actor_id),'created_at',v.created_at,'versions',versions,'events',events,'event_cursor',case when jsonb_array_length(events)=100 then jsonb_build_object('time',(events->-1)->>'created_at','id',(events->-1)->>'id') else null end) end);
end$$;

create or replace function public.erp_sheet_write(p_actor uuid,p_session uuid,p_project uuid,p_role text,p_request uuid,p_sheet uuid,p_revision bigint,p_operation text,p_document jsonb,p_overlap text,p_confirmed boolean,p_fingerprint text,p_reason text default '') returns jsonb language plpgsql security definer set search_path='' as $$
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
  for task in select value::uuid from jsonb_array_elements_text(coalesce(row->'part_ids','[]'))loop insert into erp.construction_worksheet_part_links select org,p_sheet,(row->>'person_id')::uuid,ep.plan_id,task from erp.execution_parts ep where ep.id=task;end loop;
 end loop;
 select jsonb_build_object('id',h.id,'project_id',h.project_id,'revision',h.revision,'version',h.current_version,'state',h.state,'minutes',(select sum(p.minutes) from erp.construction_worksheet_people p where p.worksheet_id=h.id)) into result from erp.construction_worksheets h where h.id=p_sheet;
 insert into erp.construction_worksheet_events(id,organization_id,worksheet_id,version,actor_id,actor_auth_id,active_role,operation,reason,client_fingerprint,result) values(p_request,org,p_sheet,version,(ctx->>'person_id')::uuid,p_actor,p_role,p_operation,btrim(coalesce(p_reason,'')),p_fingerprint,result);
 return result;
end$$;

create or replace function erp_private.finance_source_change() returns trigger language plpgsql security definer set search_path='' as $$
declare project uuid;org uuid;acc record;actor uuid;event uuid;begin
 if tg_table_name='task_events'then project:=new.project_id;event:=new.id;
 elsif tg_table_name='construction_worksheet_events'then select project_id into project from erp.construction_worksheets where id=new.worksheet_id;event:=new.id;
 elsif tg_table_name='material_movements' then select p.project_id into project from erp.material_lots lot join erp.project_material_lines l on l.id=lot.line_id join erp.project_material_plans p on p.id=l.plan_id where lot.id=new.lot_id;event:=new.id;
 elsif tg_table_name='garden_projects' then project:=new.id;
 else org:=new.organization_id;end if;
 for acc in select id from erp.finance_accounts where (project is not null and project_id=project) or (org is not null and organization_id=org) order by id loop perform erp_private.finance_refresh(acc.id,event);end loop;return new;
end$$;

commit;
