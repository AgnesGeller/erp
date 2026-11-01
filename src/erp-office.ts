import type { OrganizationSession } from './erp-api.js';
const setupOpening=new URLSearchParams(location.hash.slice(1)).has('office_setup')||document.documentElement.dataset.erpSetup==='true';
const apiUrl=new URL('./erp-api.js?v=0.2.0',import.meta.url);
const datesUrl=new URL('./erp-dates.js?v=0.2.0',import.meta.url);
const {ErpApi,ApiError}=await import(apiUrl.href) as typeof import('./erp-api.js');
const {projectPeriod,todayBudapest,periodLabel}=await import(datesUrl.href) as typeof import('./erp-dates.js');
const {projectRoleNames:roleNames,selectableProjectRoles}=await import(new URL('./erp-project-roles.js?v=0.2.0',import.meta.url).href) as typeof import('./erp-project-roles.js');
const api=new ErpApi();
const {CustomerDirectory}=await import(new URL('./erp-customers.js?v=0.2.0',import.meta.url).href) as typeof import('./erp-customers.js');
const {SiteWorks}=await import(new URL('./erp-site-works.js?v=0.2.0',import.meta.url).href) as typeof import('./erp-site-works.js');
const customers=new CustomerDirectory(api,error=>{if(!api.signedIn)showError(error);},(id,name)=>{void works.selectCustomer(id,name);});
const works=new SiteWorks(api,error=>{if(!api.signedIn)showError(error);},loadWorkspace,()=>{customers.open();get<HTMLInputElement>('customer-search').focus();});
for(const id of ['show-customers','show-team'])document.getElementById(id)!.addEventListener('click',event=>{if(!works.leave()){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
document.getElementById('show-works')!.addEventListener('click',event=>{if(!customers.leave()){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
const get=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const loginForm=get<HTMLFormElement>('login-form');
const workerForm=get<HTMLFormElement>('worker-form');
const roleForm=get<HTMLFormElement>('role-form');
const projectSelect=get<HTMLSelectElement>('project-select');
const personSelect=get<HTMLSelectElement>('assignment-person');
let current:OrganizationSession|undefined;
let people:Person[]=[];
let projects:Project[]=[];
let generation=0;
let mutations=0;
let dirty=false;
let loading=false;
let restoring=false;
let assignmentRequest=0;
let workerRequest: {name:string;id:string}|undefined;
interface Person {id:string;display_name:string;active:boolean;revision:number;}
interface Project {id:string;name:string;active:boolean;work_type:'construction'|'maintenance';}
interface Assignment {id:string;person_id:string;role:string;valid_from:string;valid_until:string|null;revoked_at:string|null;revision:number;}

function message(text:string,ok:boolean|null=null):void {
 const target=get(get('login-area').hidden?'office-status':'login-feedback');target.textContent=(ok?'✓ ':'')+text;target.className='office-status '+(ok===true?'success':ok===false?'error':'');
}
function formBusy(form:HTMLFormElement,busy:boolean):void {
 const fieldset=form.querySelector('fieldset');if(fieldset)fieldset.disabled=busy;
}
function resetView():void {
 get('office-status').textContent='';get('login-feedback').textContent='';
 generation++;customers.reset();works.reset();current=undefined;people=[];projects=[];dirty=false;workerRequest=undefined;
 get('office-app').hidden=true;get('login-area').hidden=false;get('public-identity').hidden=false;get('logout').hidden=true;
 for(const id of ['people-list','assignment-list','project-select','assignment-person','organization-select'])get(id).replaceChildren();
 workerForm.reset();roleForm.reset();get<HTMLInputElement>('login-password').value='';
}
function showError(error:unknown):void {
 if(!api.signedIn){resetView();}
 message(error instanceof Error?error.message:'A művelet nem sikerült. Próbáld újra.',false);
}
function selectedOrganization():string {
 return get<HTMLSelectElement>('organization-select').value;
}
function renderPeople():void {
 const previousPerson=personSelect.value;const list=get<HTMLSelectElement>('people-list');const selected=list.value;
 people.sort((a,b)=>a.display_name.localeCompare(b.display_name,'hu',{sensitivity:'base'}));
 list.replaceChildren(new Option('Válassz munkatársat',''));
 for(const person of people)list.add(new Option(person.display_name+(person.active?'':' · Inaktív'),person.id));
 if(people.some(p=>p.id===selected))list.value=selected;
 personSelect.replaceChildren(new Option('Válassz munkatársat',''));
 for(const person of people.filter(p=>p.active))personSelect.add(new Option(person.display_name,person.id));
 if(people.some(p=>p.id===previousPerson&&p.active))personSelect.value=previousPerson;
}
async function loadAssignments():Promise<void> {
 const list=get('assignment-list');list.replaceChildren();get('role-form').hidden=!current?.is_office;
 const roleSelect=get<HTMLSelectElement>('assignment-role');const oldRole=roleSelect.value;const workType=projects.find(p=>p.id===projectSelect.value)?.work_type;
 const choices=selectableProjectRoles(workType);roleSelect.replaceChildren(...choices.map(choice=>{const option=new Option(choice.label,choice.value);option.disabled=choice.disabled;return option;}));
 roleSelect.value=choices.find(c=>c.value===oldRole&&!c.disabled)?.value??choices.find(c=>!c.disabled)!.value;
 get<HTMLButtonElement>('assignment-save').disabled=!projectSelect.value;
 get('assignment-work-type').textContent=workType==='construction'?'Kertépítés – az Építésvezető vezetői jogosultságával.':workType==='maintenance'?'Kertkarbantartás – a Karbantartásvezető vezetői jogosultságával.':'Megbízás mentéséhez előbb válassz munkát. A Kertépítő és a Kertész mindkét munkaterületen dolgozhat.';
 if(!current||!projectSelect.value){get('assignment-empty').textContent='Még nincs megjeleníthető munka.';return;}
 get('assignment-empty').textContent='Betöltés…';const epoch=generation;const request=++assignmentRequest;const selectedProject=projectSelect.value;
 const rows=await api.rpc<Assignment[]>('erp_list_assignments',{p_org:current.organization_id,p_project:selectedProject});
 if(epoch!==generation||request!==assignmentRequest||projectSelect.value!==selectedProject)return;
 get('assignment-empty').textContent=rows.length?'':'Ehhez a munkához még nincs megbízás.';
 for(const assignment of rows){
  const row=document.createElement('li');const text=document.createElement('div');
  const who=people.find(p=>p.id===assignment.person_id)?.display_name??'Saját megbízás';
  const title=document.createElement('strong');title.textContent=who+' · '+(roleNames[assignment.role]??'Megbízás');
  const detail=document.createElement('small');detail.textContent=periodLabel(assignment.valid_from,assignment.valid_until)+(assignment.revoked_at?' · Visszavonva':'');
  text.append(title,detail);row.append(text);
  if(current.is_office&&!assignment.revoked_at){
   const button=document.createElement('button');button.type='button';button.className='quiet';button.textContent='Visszavonás';
   button.addEventListener('click',async()=>{
    if(!current||mutations||loading)return;
    if(!confirm('Visszavonod ezt a megbízást? Az előzménye megmarad.'))return;
    mutations++;button.disabled=true;
    try{await api.rpc('erp_revoke_assignment',{p_org:current.organization_id,p_assignment:assignment.id,p_revision:assignment.revision});if(epoch===generation){await loadAssignments();message('A megbízást visszavontuk.',true);}}
    catch(error){if(epoch===generation)showError(error);}
    finally{mutations--;button.disabled=false;}
   });
   row.append(button);
  }
  list.append(row);
 }
}
async function loadWorkspace():Promise<void> {
 if(loading||!api.signedIn)return;loading=true;const epoch=generation;get<HTMLSelectElement>('organization-select').disabled=true;projectSelect.disabled=true;
 try{
  const memberships=await api.rpc<OrganizationSession[]>('erp_session');
  if(epoch!==generation)return;
  const wanted=selectedOrganization()||current?.organization_id;
  current=memberships.find(m=>m.organization_id===wanted)??memberships[0];
  if(!current)throw new ApiError('Nincs aktív ERP-hozzáférésed.',403);
  const select=get<HTMLSelectElement>('organization-select');
  select.replaceChildren(...memberships.map(m=>new Option(m.organization_name,m.organization_id,false,m.organization_id===current!.organization_id)));
  get('organization-label').hidden=memberships.length===1;
  get('workspace-title').textContent=current.organization_name;
  get('workspace-role').textContent=current.is_office?'Irodai munkatér':'Saját munkák';
  get('people-section').hidden=!current.is_office;
  if(!current.is_office){people=[];get('people-list').replaceChildren();workerForm.reset();dirty=false;}
  const result=await Promise.all([
   api.rpc<Project[]>('erp_list_projects',{p_org:current.organization_id}),
   current.is_office?api.rpc<Person[]>('erp_list_people',{p_org:current.organization_id}):Promise.resolve([])
  ]);
  if(epoch!==generation)return;
  projects=result[0];people=result[1];renderPeople();
  const previous=projectSelect.value;
  projectSelect.replaceChildren(new Option('Válassz munkát',''));
  for(const p of projects.filter(p=>p.active))projectSelect.add(new Option(p.name,p.id));
  if(projects.some(p=>p.id===previous&&p.active))projectSelect.value=previous;
  else if(projects.some(p=>p.active))projectSelect.value=projects.find(p=>p.active)!.id;
  projectSelect.disabled=!projects.some(p=>p.active);
  get('office-app').hidden=false;get('login-area').hidden=true;get('public-identity').hidden=true;get('logout').hidden=false;
  await loadAssignments();
  works.setOrganization(current.is_office?current.organization_id:undefined);
  await customers.setOrganization(current.is_office?current.organization_id:undefined);
 }finally{loading=false;get<HTMLSelectElement>('organization-select').disabled=false;projectSelect.disabled=!projects.some(p=>p.active);}
}
loginForm.addEventListener('invalid',()=>{
 message(!get<HTMLSelectElement>('login-name').value?'Válaszd ki a nevedet.':'A saját ERP PIN-kódod 6–12 számjegy legyen.',false);
},true);
get('login-name').addEventListener('change',()=>{
 get<HTMLInputElement>('login-username').value=get<HTMLSelectElement>('login-name').value;
 get<HTMLInputElement>('login-password').value='';get('login-feedback').textContent='';
});
loginForm.addEventListener('submit',async event=>{
 event.preventDefault();if(mutations||loading||restoring)return;
 const name=get<HTMLSelectElement>('login-name').value;
 if(name!=='agi'&&name!=='tamas'){message('Válaszd ki a nevedet.',false);return;}
 const password=get<HTMLInputElement>('login-password').value;get<HTMLInputElement>('login-password').value='';
 generation++;const epoch=generation;formBusy(loginForm,true);message('Belépés…');
 try{await api.login(name,password);if(epoch!==generation)return;await loadWorkspace();message(api.remembered?'Sikeres belépés. Az eszköz megjegyezte a belépésedet.':'Sikeres belépés. Az eszköz nem engedte megjegyezni a belépést; újranyitáskor ismét add meg a PIN-kódot.',true);}
 catch(error){if(epoch===generation)showError(error);}finally{formBusy(loginForm,false);}
});
workerForm.addEventListener('submit',async event=>{
 event.preventDefault();if(!current?.is_office||mutations||loading)return;
 const name=get<HTMLInputElement>('worker-name').value.trim();
 if(!workerRequest||workerRequest.name!==name)workerRequest={name,id:crypto.randomUUID()};
 const epoch=generation;mutations++;formBusy(workerForm,true);message('Mentés…');
 try{
  await api.rpc('erp_create_worker_request',{p_org:current.organization_id,p_name:name,p_request:workerRequest.id});
  if(epoch!==generation)return;
  workerForm.reset();workerRequest=undefined;dirty=false;await loadWorkspace();message('A munkatársat mentettük.',true);
 }catch(error){if(epoch===generation)showError(error);}
 finally{mutations--;formBusy(workerForm,false);}
});
roleForm.addEventListener('submit',async event=>{
 event.preventDefault();if(!current?.is_office||mutations||loading||!projectSelect.value)return;
 let period;try{period=projectPeriod(get<HTMLInputElement>('assignment-from').value,get<HTMLInputElement>('assignment-until').value);}catch(error){showError(error);return;}
 const epoch=generation;mutations++;formBusy(roleForm,true);message('Megbízás mentése…');
 try{
  await api.rpc('erp_assign_project_role',{p_org:current.organization_id,p_project:projectSelect.value,p_person:personSelect.value,p_role:get<HTMLSelectElement>('assignment-role').value,p_from:period.from,p_until:period.until});
  if(epoch!==generation)return;
  dirty=false;await loadAssignments();message('A megbízást mentettük.',true);
 }catch(error){if(epoch===generation)showError(error);}
 finally{mutations--;formBusy(roleForm,false);}
});
get('logout').addEventListener('click',async()=>{
 if(mutations||loading||customers.busy||works.busy){message('Várd meg a folyamatban lévő művelet végét.');return;}
 if((dirty||customers.dirty||works.dirty)&&!confirm('Kijelentkezel? A még nem mentett mezők tartalma elvész.'))return;
 generation++;
 try{await api.logout();resetView();message('Sikeres kijelentkezés.',true);}catch(error){resetView();showError(error);}
});
get('reload-workspace').addEventListener('click',()=>{if(!mutations)loadWorkspace().then(()=>message('A lista naprakész.',true)).catch(showError);});
projectSelect.addEventListener('change',()=>{loadAssignments().catch(showError);});
get('organization-select').addEventListener('change',()=>{if(!mutations)loadWorkspace().catch(showError);});
for(const form of [workerForm,roleForm])form.addEventListener('input',()=>{dirty=true;});
window.addEventListener('erp:before-update',event=>{
 if(mutations||loading||restoring||customers.busy||works.busy){event.preventDefault();message('Várd meg a folyamatban lévő művelet végét.');}
 else if((dirty||customers.dirty||works.dirty)&&!confirm('Frissíted az alkalmazást? A még nem mentett mezők tartalma elvész.'))event.preventDefault();
});
window.addEventListener('focus',()=>{if(api.signedIn&&!mutations&&!dirty&&!customers.dirty&&!works.dirty&&!customers.busy&&!works.busy)loadWorkspace().catch(showError);});
get<HTMLInputElement>('assignment-from').value=todayBudapest();
async function restoreOffice():Promise<void> {
 if(setupOpening||restoring||api.signedIn)return;restoring=true;const epoch=generation;formBusy(loginForm,true);
 try{if(!api.remembered)return;message('Korábbi belépés ellenőrzése…');const restored=await api.restore();restoring=false;
 if(epoch!==generation||!restored)return;await loadWorkspace();message('Sikeres automatikus belépés.',true);}
 catch(error){if(epoch===generation)showError(error);}finally{restoring=false;formBusy(loginForm,false);}
}
void restoreOffice();
export {};
