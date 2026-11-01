import type {ErpApi} from './erp-api.js';
interface Site{id:string;address:string;label:string;}
interface Work{id:string;name:string;work_type:'construction'|'maintenance';work_status:string;customer_id:string;location_id:string;customer_name:string;site_address:string;description:string;requested_date:string|null;scheduled_date:string|null;people:number|null;hours:number|null;revision:number;}
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const labels:Record<string,string>={preparation:'Kertépítési előkészítés',requested:'Jóváhagyásra váró karbantartási igény',confirmed:'Jóváhagyott karbantartás',cancelled:'Visszavont igény'};
function item(tag:string,value:string){const n=document.createElement(tag);n.textContent=value;return n;}
export class SiteWorks {
 private org:string|undefined;private epoch=0;private loading=false;private saving=false;private changed=false;private customerId:string|undefined;private customerName='';private requestId:string|undefined;private pending:Record<string,string>|undefined;private rows:Work[]=[];private approvalDays=new Map<string,string>();
 readonly form=el<HTMLFormElement>('work-new-form');
 constructor(private api:ErpApi,private authError:(error:unknown)=>void,private completed:()=>Promise<void>,private chooseCustomer:()=>void){
  el('show-works').addEventListener('click',()=>this.open());
  el('work-choose-customer').addEventListener('click',()=>{if(this.leave())this.chooseCustomer();});
  el('work-refresh').addEventListener('click',()=>{if(!this.busy&&!this.dirty)void this.load();else this.message('Előbb fejezd be a megkezdett rögzítést.');});
  el('work-new-cancel').addEventListener('click',()=>{if(this.leave())el('work-new-panel').hidden=true;});
  el('work-search').addEventListener('input',()=>this.render());el('work-status-filter').addEventListener('change',()=>this.render());
  this.form.addEventListener('input',()=>{this.changed=true;});this.form.addEventListener('submit',event=>{event.preventDefault();void this.create();});
  window.addEventListener('beforeunload',event=>{if(this.dirty||this.busy){event.preventDefault();event.returnValue='';}});
  window.addEventListener('focus',()=>{if(this.org&&!el('work-view').hidden&&!this.dirty&&!this.busy)void this.load(true);});
 }
 get dirty(){return this.changed||!!this.pending||this.approvalDays.size>0;}get busy(){return this.loading||this.saving;}
 private message(value:string,kind=''){el('work-feedback').textContent=(kind==='success'?'✓ ':'')+value;el('work-feedback').className='office-status '+kind;}
 private lock(value:boolean){this.form.querySelector('fieldset')!.disabled=value;}
 private clear(){this.approvalDays.clear();this.changed=false;this.pending=undefined;this.requestId=undefined;this.customerId=undefined;this.customerName='';this.form.reset();this.lock(false);for(const n of Array.from(this.form.querySelectorAll<HTMLInputElement>('input,select,textarea')))n.disabled=false;el('work-new-panel').hidden=true;el('work-customer-name').textContent='';el<HTMLSelectElement>('work-location').replaceChildren();el<HTMLButtonElement>('work-save').textContent='Igény mentése';}
 reset(){this.epoch++;this.org=undefined;this.loading=false;this.saving=false;this.rows=[];this.clear();el('work-view').hidden=true;el('work-list').replaceChildren();el('work-feedback').textContent='';el<HTMLInputElement>('work-search').value='';el<HTMLSelectElement>('work-status-filter').value='';}
 setOrganization(org:string|undefined){if(this.org!==org){this.reset();this.org=org;}}
 leave(){if(this.busy)return false;if(this.dirty&&!confirm('A még nem mentett munka adatai elvesznek. Folytatod?'))return false;this.clear();return true;}
 open(refresh=true){if(!this.org)return;el('work-view').hidden=false;el('customer-view').hidden=true;el('team-view').hidden=true;for(const name of ['works','customers','team'])el('show-'+name).setAttribute('aria-pressed',String(name==='works'));if(refresh&&!this.busy)void this.load();}
 async selectCustomer(id:string,name:string){
  if(!this.org||!this.leave())return;this.open(false);const epoch=this.epoch;this.loading=true;this.customerId=id;this.customerName=name;this.message('Munkavégzési címek betöltése…');
  try{const data=await this.api.customers<{customer_name:string;sites:Site[]}>('work_sites',{organization_id:this.org,customer_id:id});if(epoch!==this.epoch)return;
   this.customerName=data.customer_name;el('work-customer-name').textContent=data.customer_name;
   const select=el<HTMLSelectElement>('work-location');select.replaceChildren(new Option('Válassz munkavégzési címet',''));for(const site of data.sites)select.add(new Option(site.address+(site.label?' · '+site.label:''),site.id));if(data.sites.length===1)select.value=data.sites[0].id;
   el('work-new-panel').hidden=false;el<HTMLDetailsElement>('work-new-panel').open=true;el<HTMLButtonElement>('work-save').disabled=!data.sites.length;
   this.message(data.sites.length?'Válaszd ki a címet, és add meg a munka adatait.':'Ehhez az ügyfélhez nincs aktív, jóváhagyott munkavégzési cím. A címet előbb a közös ügyfélnyilvántartásban kell rendezni.');
  }catch(error){if(epoch===this.epoch){this.clear();this.error(error);}}finally{if(epoch===this.epoch)this.loading=false;}
 }
 async load(silent=false){
  if(!this.org||this.busy)return;const epoch=this.epoch;this.loading=true;if(!silent)this.message('Munkák betöltése…');
  try{const rows=await this.api.rpc<Work[]>('erp_list_site_works',{p_org:this.org});if(epoch!==this.epoch)return;this.rows=rows;this.render();if(!silent)this.message('A munkák listája naprakész.','success');}
  catch(error){if(epoch===this.epoch)this.error(error);}finally{if(epoch===this.epoch)this.loading=false;}
 }
 private error(error:unknown){this.message(error instanceof Error?error.message:'A művelet nem sikerült. Próbáld újra.','error');this.authError(error);}
 private async create(){
  if(!this.org||!this.customerId||this.busy)return;const epoch=this.epoch;
  const value=(id:string)=>el<HTMLInputElement>(id).value;
  this.pending??={customer_id:this.customerId,location_id:value('work-location'),name:value('work-name'),work_type:value('work-type'),description:value('work-description'),requested_date:value('work-requested-day'),people:value('work-people'),hours:value('work-hours')};this.requestId??=crypto.randomUUID();
  this.saving=true;this.lock(true);this.message('Igény mentése…');
  try{await this.api.customers('work_create',{organization_id:this.org,request_id:this.requestId,payload:this.pending});if(epoch!==this.epoch)return;this.clear();this.saving=false;await this.load();this.message('Az igényt elmentettük a kiválasztott munkavégzési címhez.','success');}
  catch(error){if(epoch===this.epoch){const status=error&&typeof error==='object'&&'status'in error?error.status:0;if(status===422||status===403){this.pending=undefined;this.requestId=undefined;this.lock(false);}else{this.form.querySelector('fieldset')!.disabled=false;for(const n of Array.from(this.form.querySelectorAll<HTMLInputElement>('input,select,textarea')))n.disabled=true;el<HTMLButtonElement>('work-save').textContent='Mentés újrapróbálása';}this.error(error);}}
  finally{if(epoch===this.epoch)this.saving=false;}
 }
 private render(){
  const list=el('work-list');list.replaceChildren();const search=el<HTMLInputElement>('work-search').value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('hu');const status=el<HTMLSelectElement>('work-status-filter').value;
  const rows=this.rows.filter(w=>(!status||w.work_status===status)&&[w.name,w.customer_name,w.site_address].join(' ').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('hu').includes(search));
  el('work-count').textContent=rows.length+' / '+this.rows.length+' munka vagy igény';
  if(!rows.length)list.append(item('p','Nincs megjeleníthető munka vagy igény.'));
  for(const work of rows){const fold=document.createElement('details');fold.className='erp-disclosure work-record';const summary=document.createElement('summary');summary.append(item('strong',work.name),item('span',work.customer_name+' · '+work.site_address),item('small',labels[work.work_status]??work.work_status));fold.append(summary);
   if(work.description)fold.append(item('p',work.description));const details=[work.requested_date?'Kért nap: '+work.requested_date:'',work.scheduled_date?'Jóváhagyott nap: '+work.scheduled_date:'',work.people?'Kért létszám: '+work.people+' fő':'',work.hours?'Kért időtartam: '+work.hours+' óra':''].filter(Boolean);if(details.length)fold.append(item('p',details.join(' · ')));
   if(work.work_status==='preparation')fold.append(item('p','A kertépítés elfogadott árajánlatból és külön irodai indítással indulhat.'));
   if(work.work_status==='requested'){const form=document.createElement('form');const label=item('label','Jóváhagyott munkanap');const day=document.createElement('input');day.type='date';day.required=true;day.value=this.approvalDays.get(work.id)??work.requested_date??'';day.addEventListener('input',()=>this.approvalDays.set(work.id,day.value));label.append(day);const approve=document.createElement('button');approve.type='submit';approve.textContent='Karbantartás jóváhagyása';form.append(label,approve);form.addEventListener('submit',event=>{event.preventDefault();if(!this.busy&&!this.changed&&!this.pending&&confirm('Jóváhagyod a karbantartást erre a napra: '+day.value+'?'))void this.action(work,'confirm',day.value);else if(this.dirty)this.message('Előbb fejezd be a megkezdett rögzítést.');});fold.append(form);}
   if(['preparation','requested'].includes(work.work_status)){const cancel=document.createElement('button');cancel.type='button';cancel.className='quiet';cancel.textContent='Igény visszavonása';cancel.addEventListener('click',()=>{if(!this.busy&&!this.dirty&&confirm('Visszavonod ezt az igényt? Az előzménye megmarad.'))void this.action(work,'cancel');});fold.append(cancel);}list.append(fold);
  }
 }
 private async action(work:Work,action:'confirm'|'cancel',day?:string){
  if(!this.org||this.busy)return;const epoch=this.epoch;this.saving=true;this.message('Igény módosítása…');
  try{if(action==='confirm')await this.api.customers('work_confirm',{organization_id:this.org,work_id:work.id,revision:work.revision,day});else await this.api.rpc('erp_site_work_action',{p_org:this.org,p_work:work.id,p_revision:work.revision,p_action:'cancel'});
   if(epoch!==this.epoch)return;this.approvalDays.delete(work.id);this.saving=false;await this.load();this.saving=true;await this.completed();if(epoch!==this.epoch)return;this.message(action==='confirm'?'A karbantartást jóváhagytuk. A munkához már megadhatók a megbízások.':'Az igényt visszavontuk; az előzménye megmaradt.','success');
  }catch(error){if(epoch===this.epoch)this.error(error);}finally{if(epoch===this.epoch)this.saving=false;}
 }
}