type Row=Record<string,unknown>;
type Options={url:string;key:string;sourceKey:string;fetchImpl?:typeof fetch};
class DirectoryError extends Error {constructor(public status:number,message:string){super(message);}}
const SOURCE='https://wojgdfojupnfldrmqaht.supabase.co';
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const fields:Record<string,number>={full_name:150,address:500,customer_type:150,contact_name:150,email:254,phone:40,tax_number:40,billing_name:200,billing_address:500,internal_notes:4000};
export const normalizeCustomerSearch=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('hu-HU');
export function customerPayload(raw:unknown):Record<string,string>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new DirectoryError(422,'Ellenőrizd az ügyfél adatait.');
 const value=raw as Row;const result:Record<string,string>={};
 for(const [field,max] of Object.entries(fields)){
  if(value[field]!==undefined&&typeof value[field]!=='string')throw new DirectoryError(422,'Ellenőrizd az ügyfél adatait.');
  const text=String(value[field]??'').trim();
  result[field]=field==='full_name'?text.replace(/\s+/g,' '):text;
  if(result[field].length>max)throw new DirectoryError(422,'A megadott adat túl hosszú.');
 }
 if(result.full_name.length<2||result.address.length<3||!['person','company','condominium'].includes(result.customer_type))throw new DirectoryError(422,'Add meg az ügyfél nevét, típusát és munkavégzési címét.');
 if(result.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))throw new DirectoryError(422,'Ellenőrizd az e-mail-címet.');
 return result;
}
export function createCustomerDirectory(options:Options){
 const requestFetch=options.fetchImpl??fetch;
 async function json(url:string,headers:Record<string,string>,method='GET',body?:unknown):Promise<unknown>{
  let r:Response;
  try{r=await requestFetch(url,{method,headers:{...headers,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});}catch{throw new DirectoryError(503,'Az ügyfélnyilvántartás most nem érhető el. A megkezdett mentést később folytathatod.');}
  let data:unknown;try{data=await r.json();}catch{throw new DirectoryError(503,'Az ügyfélnyilvántartás válasza nem olvasható.');}
  if(!r.ok){const validation=data&&typeof data==='object'&&'code'in data&&['22023','23514','23503','22P02','22007','22008'].includes(String(data.code));if(validation)throw new DirectoryError(422,'Ellenőrizd az adatokat és a munkavégzési címet, majd frissítsd a listát.');const code=data&&typeof data==='object'?'code'in data?String(data.code):'':'';throw new DirectoryError(r.status===409||code==='23505'||code==='40001'?409:r.status===403||code==='42501'?403:503,r.status===409||code==='23505'||code==='40001'?'Az ügyfél már létezik, vagy az adatai időközben megváltoztak. Frissítsd a listát.':r.status===403||code==='42501'?'Irodai jogosultság szükséges.':'Az ügyféladatok mentése vagy betöltése nem sikerült. A mentést újrapróbálhatod.');}
  return data;
 }
 const ownHeaders=(token:string)=>({apikey:options.key,Authorization:'Bearer '+token});
 const adminHeaders=()=>({apikey:options.key,Authorization:'Bearer '+options.key});
 async function rpc(name:string,args:unknown,token:string,admin=false){return json(options.url+'/rest/v1/rpc/'+name,admin?adminHeaders():ownHeaders(token),'POST',args);}
 const sourceHeaders=()=>({apikey:options.sourceKey,Authorization:'Bearer '+options.sourceKey,'Accept-Profile':'munkalap','Content-Profile':'munkalap'});
 async function sourceRows(table:string,query:Record<string,string>={},all=false):Promise<Row[]>{
  if(!['customers','customer_locations','customer_details','customer_contacts'].includes(table))throw new DirectoryError(400,'Nem engedélyezett ügyfélművelet.');
  const rows:Row[]=[];
  for(let offset=0;;offset+=500){
   const search=new URLSearchParams({select:'*',order:table==='customer_details'?'customer_id.asc':'id.asc',limit:all?'500':'2',offset:String(offset),...query});
   const data=await json(SOURCE+'/rest/v1/'+table+'?'+search,sourceHeaders());
   if(!Array.isArray(data))throw new DirectoryError(503,'Az ügyféllista nem tölthető be.');
   rows.push(...data);
   if(!all||data.length<500)break;
   if(rows.length>=5000)throw new DirectoryError(503,'Az ügyféllista feldolgozása további beállítást igényel.');
  }
  return rows;
 }
 async function sourceInsert(table:string,row:Row){
  // Kizárólag INSERT, soha PATCH/PUT/DELETE, sem upsert-frissítés.
  return json(SOURCE+'/rest/v1/'+table,{...sourceHeaders(),Prefer:'return=representation'},'POST',row);
 }
 function exact(row:Row,expected:Row,ignore:readonly string[]=[]){
  if(Object.entries(expected).some(([k,v])=>!ignore.includes(k)&&(k.endsWith('_at')?new Date(String(row[k])).getTime()!==new Date(String(v)).getTime():row[k]!==v)))throw new DirectoryError(409,'A megkezdett ügyfélmentés adatai eltérnek a közös listától. Nem írunk felül meglévő adatot.');
 }
 async function ensureInsert(table:string,idField:string,row:Row){
  const existing=await sourceRows(table,{[idField]:'eq.'+row[idField]});
  if(existing.length){exact(existing[0],row);return;}
  try{await sourceInsert(table,row);}catch(error){
   // Elveszett visszaigazolás vagy párhuzamos ismétlés: csak a SAJÁT előre kiosztott UUID ellenőrizhető.
   const check=await sourceRows(table,{[idField]:'eq.'+row[idField]});
   if(!check.length)throw error;exact(check[0],row);
  }
 }
 async function saveRequest(saved:Row,org:string,actor:string){
  if(saved.status==='complete')return {customer_id:saved.source_customer_id};
  const p=customerPayload(saved.payload);const customerId=String(saved.source_customer_id);
  if(!uuid(customerId)||!uuid(saved.source_location_id))throw new DirectoryError(503,'A mentés azonosítója hibás.');
  const marker={created_at:saved.created_at};
  const own=await sourceRows('customers',{id:'eq.'+customerId});
  if(!own.length){
   // Egyező név esetén nem egyesítünk személyt, és nem írunk a meglévő ügyfélhez.
   const duplicate=await sourceRows('customers',{normalized_name:'eq.'+p.full_name.toLowerCase()});
   if(duplicate.length)throw new DirectoryError(409,'Ilyen nevű ügyfél már szerepel a közös listában. Keresd meg a meglévő ügyfelet; azonos név alapján nem vonunk össze személyeket.');
  }
  await ensureInsert('customers','id',{id:customerId,full_name:p.full_name,active:true,review_status:'approved',source_app:'erp',...marker});
  const type={person:'Magánszemély',company:'Cég',condominium:'Társasház'}[p.customer_type]!;
  await ensureInsert('customer_details','customer_id',{customer_id:customerId,customer_type:type,contact_name:p.contact_name,email:p.email,phone:p.phone,tax_number:p.tax_number,billing_mode:'per_job',...marker});
  await ensureInsert('customer_locations','id',{id:saved.source_location_id,customer_id:customerId,address:p.address,active:true,review_status:'approved',...marker});
  await rpc('erp_customer_finish',{p_org:org,p_actor:actor,p_request:saved.request_id},'',true);
  return {customer_id:customerId};
 }
 async function workSites(org:string,actor:string,customerId:unknown){
  if(!uuid(customerId))throw new DirectoryError(422,'Válassz ügyfelet.');
  const customers=await sourceRows('customers',{id:'eq.'+customerId});const customer=customers[0];
  if(!customer||customer.active!==true||customer.review_status!=='approved'||customer.archived_at)throw new DirectoryError(422,'Aktív, jóváhagyott ügyfelet válassz.');
  const locations=await sourceRows('customer_locations',{customer_id:'eq.'+customerId},true);
  const sites=await rpc('erp_sync_work_sites',{p_org:org,p_actor:actor,p_customer:customer,p_locations:locations},'',true);
  return {customer_id:customerId,customer_name:customer.full_name,sites};
 }
 return async(input:Row,token:string,actor:string,memberships:unknown):Promise<{data?:unknown;error?:string;status?:number}>=>{
  try{
   const org=input.organization_id;
   if(!uuid(org)||!Array.isArray(memberships)||!memberships.some(m=>m.organization_id===org&&m.is_office===true))throw new DirectoryError(403,'Irodai jogosultság szükséges.');
   if(!options.sourceKey||!options.key)throw new DirectoryError(503,'A közös ügyféllista adatkapcsolata még nem érhető el.');
   if(input.action==='quote_context'){const data=await workSites(org,actor,input.customer_id);const details=(await sourceRows('customer_details',{customer_id:'eq.'+input.customer_id}))[0]??{};const profiles=await rpc('erp_customer_sync',{p_org:org,p_actor:actor,p_items:[{id:input.customer_id,full_name:data.customer_name}]},'',true) as Row[];const profile=profiles[0]??{};return {data:{...data,email:details.email??'',phone:details.phone??'',tax_number:details.tax_number??'',billing_name:profile.billing_name??'',billing_address:profile.billing_address??''}};}
   if(input.action==='work_sites')return {data:await workSites(org,actor,input.customer_id)};
   if(input.action==='work_create'){
    if(!uuid(input.request_id)||!input.payload||typeof input.payload!=='object'||Array.isArray(input.payload))throw new DirectoryError(422,'Érvénytelen munkaadatok.');
    const p=input.payload as Row;
    if(!uuid(p.customer_id)||!uuid(p.location_id)||!['construction','maintenance'].includes(String(p.work_type))||typeof p.name!=='string'||p.name.trim().length<2||p.name.trim().length>200||typeof p.description!=='string'||p.description.length>4000)throw new DirectoryError(422,'Add meg az ügyfelet, címet, munkatípust és a munka nevét.');
    const day=String(p.requested_date??'');const people=String(p.people??'');const hours=String(p.hours??'');
    if(day&&(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day))throw new DirectoryError(422,'Érvénytelen kért időpont.');
    if(people&&(!/^\d+$/.test(people)||Number(people)<1||Number(people)>1000)||hours&&(!/^\d+(?:\.\d{1,2})?$/.test(hours)||Number(hours)<=0||Number(hours)>10000))throw new DirectoryError(422,'Ellenőrizd a létszámot és az óraszámot.');
    const payload={customer_id:p.customer_id,location_id:p.location_id,work_type:p.work_type,name:p.name.trim(),description:p.description.trim(),requested_date:day,people,hours};
    await workSites(org,actor,p.customer_id);
    return {data:await rpc('erp_create_site_work',{p_org:org,p_request:input.request_id,p_data:payload},token)};
   }
   if(input.action==='work_confirm'){
    if(!uuid(input.work_id)||!Number.isSafeInteger(input.revision)||typeof input.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.day)||!Number.isFinite(Date.parse(input.day))||new Date(input.day).toISOString().slice(0,10)!==input.day)throw new DirectoryError(422,'Add meg a jóváhagyott munkanapot.');
    const rows=await rpc('erp_list_site_works',{p_org:org},token) as Row[];const work=rows.find(w=>w.id===input.work_id);
    if(!work)throw new DirectoryError(403,'A munka nem érhető el.');
    await workSites(org,actor,work.customer_id);
    return {data:await rpc('erp_site_work_action',{p_org:org,p_work:input.work_id,p_revision:input.revision,p_action:'confirm',p_day:input.day},token)};
   }
   if(input.action==='customer_create'){
    if(!uuid(input.request_id))throw new DirectoryError(422,'A mentés azonosítója hibás.');
    const payload=customerPayload(input.payload);
    const prior=await rpc('erp_customer_resume',{p_org:org,p_request:input.request_id},token);
    if(!prior&&(await sourceRows('customers',{normalized_name:'eq.'+payload.full_name.toLowerCase()})).length)throw new DirectoryError(409,'Ilyen nevű ügyfél már szerepel a közös listában. Keresd meg a meglévő ügyfelet; azonos név alapján nem vonunk össze személyeket.');
    const saved=await rpc('erp_customer_begin',{p_org:org,p_request:input.request_id,p_payload:payload},token) as Row;
    return {data:await saveRequest(saved,org,actor)};
   }
   if(input.action==='customer_resume'){
    if(!uuid(input.request_id))throw new DirectoryError(422,'A mentés azonosítója hibás.');
    const saved=await rpc('erp_customer_resume',{p_org:org,p_request:input.request_id},token) as Row|null;
    if(!saved)throw new DirectoryError(404,'A megkezdett mentés nem található.');
    return {data:await saveRequest(saved,org,actor)};
   }
   const field=typeof input.field==='string'?input.field:'name';
   if(!['name','address','phone','email'].includes(field))throw new DirectoryError(422,'Érvénytelen keresési mező.');
   const query=typeof input.query==='string'?normalizeCustomerSearch(input.query.trim()):'';
   const page=typeof input.page==='number'?input.page:0;
   if(query.length>150||!Number.isInteger(page)||page<0||page>10000)throw new DirectoryError(422,'Érvénytelen keresés.');
   const [customers,locations,details,contacts]=await Promise.all([sourceRows('customers',{},true),sourceRows('customer_locations',{},true),sourceRows('customer_details',{},true),sourceRows('customer_contacts',{},true)]);
   if(input.include_archived!==undefined&&typeof input.include_archived!=='boolean')throw new DirectoryError(422,'Érvénytelen szűrés.');
   const visible=customers.filter(c=>input.include_archived===true||!c.archived_at);
   // A nyers forrásadatok nem a böngészőtől érkeznek; az import csak kiszolgálói RPC.
   const profiles=await rpc('erp_customer_sync',{p_org:org,p_actor:actor,p_items:customers.map(c=>({id:c.id,full_name:c.full_name}))},'',true) as Row[];
   const detailMap=new Map(details.map(d=>[d.customer_id,d]));const profileMap=new Map(profiles.map(p=>[p.source_customer_id,p]));
   const rows=visible.map((c):Row=>({...c,details:detailMap.get(c.id)??{},profile:profileMap.get(c.id)??{},locations:locations.filter(l=>l.customer_id===c.id),contacts:contacts.filter(k=>k.customer_id===c.id)}))
    .filter(c=>!query||normalizeCustomerSearch((field==='name'?[c.full_name]:field==='address'?(c.locations as Row[]).flatMap(l=>[l.address,l.label]):[(c.details as Row)[field],...(c.contacts as Row[]).map(k=>k[field])]).filter(Boolean).join(' ')).includes(query))
    .sort((a,b)=>String(a.full_name).localeCompare(String(b.full_name),'hu')||String(a.id).localeCompare(String(b.id)));
   const pending=await rpc('erp_customer_pending',{p_org:org},token);
   return {data:{rows:query.length>=2?rows.slice(page*30,page*30+30):[],total:rows.length,directory_total:customers.length,archived_total:customers.filter(c=>c.archived_at).length,page,page_size:30,synced_at:new Date().toISOString(),pending}};
  }catch(error){return {error:error instanceof DirectoryError?error.message:'Az ügyfélnyilvántartás nem érhető el. Próbáld újra később.',status:error instanceof DirectoryError?error.status:503};}
 };
}