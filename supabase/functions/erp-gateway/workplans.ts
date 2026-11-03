import {verifiedSession} from './clients.ts';
import {transitionTask,progressSummary,effectiveAcceptance,validateTaskGraph,type TaskState,type TaskCommand,type WorkRole} from './workplan-model.ts';
type Obj=Record<string,any>;type Options={url:string;key:string;fetchImpl?:typeof fetch};
const uuid=(x:unknown):x is string=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(x);
const roles=['office','construction_lead','construction_worker','gardener','client'];
class PlanError extends Error{constructor(public status:number,message:string){super(message);}}
function eventView(e:Obj,role:string){
 const d=e.data??{};if(role==='client'){
  if(['shares','time','color'].includes(e.kind))return null;
  return {id:e.id,task_id:e.task_id,kind:e.kind,created_at:e.created_at,role:e.active_role,level:d.level??null,reason:d.visibility==='client'?d.reason:'',media:d.visibility==='client'?(d.media??[]).filter((m:Obj)=>m.visibility==='client'):[]};
 }
 return {id:e.id,task_id:e.task_id,kind:e.kind,created_at:e.created_at,actor_id:e.actor_id,role:e.active_role,level:d.level??null,reason:d.reason??'',recipient:d.recipient??null,affected_actors:d.affected_actors??[],affected_subjects:d.affected_subjects??[],visibility:d.visibility??'team',media:d.media??[],before:d.before,after:d.after};
}
export function workplanView(raw:Obj){
 const ctx=raw.context,role=ctx.role,client=role==='client';const people=ctx.people??[];const byId=new Map<string,Obj>(people.map((p:Obj)=>[p.id,p]));
 const bands=progressSummary(raw.tasks as TaskState[]).map(b=>({level:b.level,percent:b.percent,completed_minutes:b.completed_minutes,remaining_minutes:b.remaining_minutes,zero_done:b.zero_done,zero_total:b.zero_total,segments:b.people.map((p,index)=>({id:client?String(index):p.person_id,name:client?'Résztvevő':byId.get(p.person_id)?.name??'Korábbi résztvevő',color:byId.get(p.person_id)?.color??'#287b83',percent:p.percent})),...(role==='office'?{completed_labor:b.completed_labor,total_labor:b.total_labor}:{})}));
 return {context:{person_id:ctx.person_id,role,roles:ctx.roles,can_edit:ctx.can_edit,can_act:ctx.can_act,project:ctx.project},plan:raw.plan,bands,layout:validateTaskGraph(raw.tasks),
 people:client?[]:people,
 repair_recipients:people.filter((p:Obj)=>ctx.subjects['0'].includes(p.id)&&p.active).map((p:Obj)=>({id:p.id,name:p.name})),
 subjects:client?{'3':[ctx.person_id]}:ctx.subjects,
 tasks:raw.tasks.map((t:TaskState)=>({id:t.id,source_line_id:(t as any).source_line_id,contract_label:(t as any).contract_label,title:t.title,section:t.section,quantity:t.quantity,unit:t.unit,sort:t.sort,start_date:t.start_date,end_date:t.end_date,dependencies:t.dependencies,original_minutes:t.original_minutes,planned_minutes:t.planned_minutes,revision:t.revision,round:t.round,
 acceptance:([0,1,2,3] as const).map(level=>{const s=effectiveAcceptance(t,level);return {level,accepted:s.accepted,explicit:s.explicit,own:t.approvals.some(a=>a.level===level&&a.actor_id===ctx.person_id),...(client?{}:{actors:t.approvals.filter(a=>a.level===level).map(a=>({actor_id:a.actor_id,subjects:a.subjects,at:a.at,role:a.role}))})};}),
 ...(client?{labor:t.labor,net:t.net}:{shares:t.shares,share_lock:t.share_lock,internal_info:t.internal_info,...(role==='office'?{labor:t.labor,net:t.net}:{})})})),events:raw.events.map((e:Obj)=>eventView(e,role)).filter(Boolean)};
}
export function createWorkPlans(options:Options){const request=options.fetchImpl??fetch;
 async function rpc(name:string,args:Obj){let r:Response;try{r=await request(options.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:options.key,Authorization:'Bearer '+options.key,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(20000)});}catch{throw new PlanError(503,'A mentés visszaigazolása nem érkezett meg. Az eredeti kéréssel újrapróbálhatod.');}let data:any;try{data=r.status===204?null:await r.json();}catch{throw new PlanError(503,'A munkaterv szolgáltatása hibás választ küldött.');}if(!r.ok){if(r.status>=500)throw new PlanError(503,'A mentés visszaigazolása nem érkezett meg. Az eredeti kéréssel újrapróbálhatod.');const code=data?.code;throw new PlanError(code==='42501'?403:['40001','23505'].includes(code)?409:422,code==='42501'?'Ehhez a munkához vagy művelethez nincs érvényes jogosultságod.':['40001','23505'].includes(code)?'A munkafázis vagy a munkaterv megváltozott. Frissítsd az adatokat.':'Ellenőrizd az adatokat, az előfeltételeket és a munka állapotát. Az eredeti ajánlat nem írható át.');}return data;}
 return async(input:Obj,token:string,actor:string,memberships:unknown)=>{try{
  const verified=verifiedSession(token);if(verified.user!==actor)throw new PlanError(401,'Érvénytelen munkamenet.');const base={p_actor:actor,p_session:verified.session};
  if(input.action==='plan_projects')return {data:await rpc('erp_plan_projects',base)};
  if(input.action==='plan_notifications'){if(input.notification_id!=null&&!uuid(input.notification_id))throw new PlanError(422,'Érvénytelen értesítés.');return {data:await rpc('erp_plan_notifications',{...base,p_notification:input.notification_id??null})};}
  if(input.action==='plan_color'){
   if(!Array.isArray(memberships)||!memberships.some(m=>m.organization_id===input.organization_id&&m.is_office===true)||!uuid(input.person_id)||!/^#[a-f0-9]{6}$/i.test(input.color)||!Number.isSafeInteger(input.revision))throw new PlanError(403,'Személyszínt csak az iroda módosíthat.');return {data:await rpc('erp_plan_color_save',{p_org:input.organization_id,p_actor:actor,p_person:input.person_id,p_color:input.color,p_revision:input.revision,p_source:'manual',p_ref:null})};
  }
  if(!uuid(input.project_id)||!roles.includes(input.role))throw new PlanError(422,'Válassz munkát és érvényes munkaszerepet.');
  const common={...base,p_project:input.project_id,p_role:input.role};
  if(input.action==='plan_read')return {data:workplanView(await rpc('erp_plan_read',common))};
  if(input.action==='plan_history'){
   const cursor=input.cursor;if(cursor&&(!uuid(cursor.id)||!Number.isFinite(Date.parse(cursor.time))))throw new PlanError(422,'Érvénytelen előzményhivatkozás.');const raw=await rpc('erp_plan_history',{...common,p_before:cursor?.time??null,p_before_id:cursor?.id??null});return {data:{events:raw.events.map((e:Obj)=>eventView(e,input.role)).filter(Boolean),cursor:raw.cursor}};
  }
  if(input.action==='plan_statistics'){
   if(input.role==='client')throw new PlanError(403,'A belső statisztikák megrendelőként nem érhetők el.');for(const v of [input.from,input.until])if(v!=null&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T12:00:00Z'))))throw new PlanError(422,'Adj meg érvényes időszakot.');return {data:await rpc('erp_plan_statistics',{...common,p_from:input.from??null,p_until:input.until??null})};
  }
  if(!uuid(input.request_id))throw new PlanError(422,'Hiányzó egyszeri műveletazonosító.');
  if(input.action==='plan_init')return {data:await rpc('erp_plan_init',{...common,p_request:input.request_id})};
  if(input.action==='plan_graph'){
   if(!Number.isSafeInteger(input.revision)||!Array.isArray(input.tasks)||input.tasks.length>1000)throw new PlanError(422,'Érvénytelen munkaterv.');const raw=await rpc('erp_plan_read',common);if(!raw.context.can_edit)throw new PlanError(403,'A munkatervet csak az iroda szerkesztheti.');
   const original=new Map<string,TaskState>(raw.tasks.map((t:TaskState)=>[t.id,t]));if(input.tasks.length!==original.size)throw new PlanError(422,'Az elfogadott ajánlati munkafázis nem törölhető innen.');const seen=new Set<string>();const changed=input.tasks.map((t:Obj)=>{if(!uuid(t.id)||seen.has(t.id)||!original.has(t.id)||Object.keys(t).some(k=>!['id','title','sort','start_date','end_date','dependencies','internal_info'].includes(k)))throw new PlanError(422,'Idegen vagy nem szerkeszthető munkafázisadat.');seen.add(t.id);if(typeof t.internal_info!=='string'||t.internal_info.length>12000)throw new PlanError(422,'A belső munkautasítás túl hosszú.');return {...original.get(t.id),...t} as TaskState;});validateTaskGraph(changed);
   return {data:await rpc('erp_plan_graph_save',{...common,p_request:input.request_id,p_revision:input.revision,p_tasks:input.tasks})};
  }
  if(input.action==='plan_task'){
   const command=input.command as TaskCommand;if(!uuid(input.task_id)||!command||typeof command!=='object'||Array.isArray(command)||Object.keys(command).some(k=>!['type','level','subjects','shares','minutes','reason','recipient','visibility','media'].includes(k)))throw new PlanError(422,'Érvénytelen munkafázis-művelet.');
   const raw=await rpc('erp_plan_task_context',{...common,p_task:input.task_id,p_request:input.request_id,p_command:command});if(raw.replayed)return {data:raw};
   if(input.revision!==raw.task.revision||input.quote_version!==raw.context.project.quote_version)throw new PlanError(409,'A munkafázis vagy az ajánlat megváltozott. Frissítsd, majd ellenőrizd újra az átvételt.');
   const ctx=raw.context;const result=transitionTask(raw.task,command,{actor_id:ctx.person_id,role:input.role as WorkRole,at:ctx.at,event_id:input.request_id,allowed_subjects:ctx.subjects,repair_recipients:ctx.subjects['0']});
   return {data:await rpc('erp_plan_task_save',{...common,p_task:input.task_id,p_request:input.request_id,p_revision:raw.task.revision,p_command:command,p_state:{round:result.task.round,approvals:result.task.approvals,shares:result.task.shares,share_lock:result.task.share_lock},p_event:result.event,p_minutes:result.task.planned_minutes})};
  }
  throw new PlanError(400,'Nem támogatott munkatervművelet.');
 }catch(e){return {status:e instanceof PlanError?e.status:422,error:e instanceof Error?e.message:'A munkaterv kezelése nem sikerült.'};}};
}
