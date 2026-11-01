import {calculateQuote,customerQuote,validateBook,quoteChanges,type Obj} from './quote-engine.ts';
type Result={data?:unknown;error?:string;status?:number};
type Options={url:string;key:string;fetchImpl?:typeof fetch;context:(org:string,customer:string,token:string,actor:string,memberships:unknown)=>Promise<Result>;pdf:(data:any,normal:boolean)=>Promise<Uint8Array>};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
class QuoteError extends Error{constructor(public status:number,message:string){super(message);}}
const encode=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
export function createQuotes(options:Options){
 const request=options.fetchImpl??fetch;
 async function rpc(name:string,args:Obj,token:string,admin=false):Promise<any>{
  let r:Response;try{r=await request(options.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:options.key,Authorization:'Bearer '+(admin?options.key:token),'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(15000)});}catch{throw new QuoteError(503,'Az ajánlat mentésének visszaigazolása nem érkezett meg. Ugyanazzal a kéréssel újrapróbálhatod.');}
  let data:any;try{data=await r.json();}catch{throw new QuoteError(503,'Az ajánlati szolgáltatás válasza nem olvasható.');}
  if(!r.ok){const code=String(data?.code??'');throw new QuoteError(code==='40001'||code==='23505'?409:code==='42501'?403:['22023','23514','22P02'].includes(code)?422:503,code==='40001'||code==='23505'?'Az adatok megváltoztak. Frissítsd a listát; az eredeti változat megmaradt.':code==='42501'?'Ehhez a művelethez nincs irodai hozzáférésed.':['22023','23514','22P02'].includes(code)?'Ellenőrizd az ajánlat állapotát, a hiányzó mezőket és a munkavégzési címet.':'Az ajánlat kezelése most nem sikerült. Próbáld újra később.');}return data;
 }
 async function context(org:string,id:string,token:string,actor:string,memberships:unknown){const result=await options.context(org,id,token,actor,memberships);if(result.error)throw new QuoteError(result.status??503,result.error);return result.data as Obj;}
 function requireInput(input:Obj){if(!uuid(input.customer_id)||!uuid(input.location_id))throw new QuoteError(422,'Válassz ügyfelet és munkavégzési címet.');return calculateQuote(input);}
 return async(input:Obj,token:string,actor:string,memberships:unknown):Promise<Result>=>{
  try{
   const org=input.organization_id;if(!uuid(org)||!Array.isArray(memberships)||!memberships.some(m=>m.organization_id===org&&m.is_office===true))throw new QuoteError(403,'Irodai jogosultság szükséges.');
   const common={p_org:org,p_actor:actor};
   if(input.action==='quote_catalog')return {data:{book:await rpc('erp_quote_catalog',{p_org:org},token),manual_email:true}};
   if(input.action==='quote_list')return {data:await rpc('erp_quotes_list',{p_org:org},token)};
   if(input.action==='quote_context')return {data:await context(org,input.customer_id,token,actor,memberships)};
   if(input.action==='quote_catalog_save'){
    const document=validateBook(input.document);if(!Number.isSafeInteger(input.revision))throw Error('Érvénytelen árlista-revízió.');return {data:await rpc('erp_quote_catalog_save',{...common,p_revision:input.revision,p_document:document},token,true)};
   }
   if(input.action==='quote_save'){
    if(!uuid(input.request_id)||input.quote_id!==null&&!uuid(input.quote_id)||!Number.isSafeInteger(input.revision))throw Error('Érvénytelen mentési azonosító.');
    const payload=structuredClone(input.payload);const calculation=requireInput(payload);const customer=await context(org,payload.customer_id,token,actor,memberships);const site=customer.sites.find((s:Obj)=>s.id===payload.location_id);if(!site)throw new QuoteError(422,'A munkavégzési cím nem érhető el.');
    return {data:await rpc('erp_quote_save',{...common,p_request:input.request_id,p_quote:input.quote_id,p_revision:input.revision,p_input:payload,p_calculation:calculation,p_customer:{name:customer.customer_name,address:site.address,email:customer.email??'',phone:customer.phone??'',billing_name:customer.billing_name??'',billing_address:customer.billing_address??'',tax_number:customer.tax_number??''}},token,true)};
   }
   if(input.action==='quote_pdf'&&input.payload){const output=requireInput(input.payload);const customer=await context(org,input.payload.customer_id,token,actor,memberships);const site=customer.sites.find((s:Obj)=>s.id===input.payload.location_id);if(!site)throw new QuoteError(422,'Válassz munkavégzési címet.');const bytes=await options.pdf({number:'PISZKOZAT',date:new Date().toISOString(),title:input.payload.title,customer:{name:customer.customer_name,address:site.address,email:customer.email,phone:customer.phone,billing_name:customer.billing_name,billing_address:customer.billing_address,tax_number:customer.tax_number},calculation:customerQuote(output)},input.normal===true);return {data:{pdf:encode(bytes),filename:'Diszkertek_piszkozat.pdf'}};}
   if(!uuid(input.quote_id))throw new QuoteError(422,'Válassz árajánlatot.');
   const saved=await rpc('erp_quote_get',{p_org:org,p_quote:input.quote_id},token);const quote=saved.quote;const versions=saved.versions as Obj[];const current=versions.find(v=>v.version===quote.current_version)!;
   if(input.action==='quote_get'){saved.changes=versions.slice(1).map((v,i)=>({date:v.created_at,actor:v.actor_name,from:versions[i].version,to:v.version,rows:quoteChanges(versions[i].input,v.input)}));return {data:saved};}
   if(input.action==='quote_transition'){
    if(!Number.isSafeInteger(input.revision)||!['ready','draft','revise','accept','reject','withdraw','start'].includes(input.transition)||input.confirmed!==true)throw Error('Ellenőrizd és erősítsd meg a műveletet.');
    return {data:await rpc('erp_quote_transition',{...common,p_quote:quote.id,p_revision:input.revision,p_action:input.transition},token,true)};
   }
   if(input.action==='quote_pdf'||input.action==='quote_manual_sent'){
    if(input.action==='quote_manual_sent'&&input.confirmed!==true)throw new QuoteError(422,'Csak a tényleges kézi kiküldést igazold vissza.');
    const bytes=await options.pdf({number:quote.number,date:current.created_at,title:quote.title,customer:current.customer,calculation:customerQuote(current.calculation)},input.normal===true);
    if(input.action==='quote_pdf')return {data:{pdf:encode(bytes),filename:quote.number+'.pdf'}};
    if(!uuid(input.request_id)||!Number.isSafeInteger(input.revision)||typeof input.recipient!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.recipient)||typeof input.subject!=='string'||!input.subject.trim()||input.subject.length>200||/[\r\n]/.test(input.subject)||typeof input.body!=='string'||input.body.length>20000)throw Error('Ellenőrizd a címzettet, tárgyat és levélszöveget.');
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer))).map(v=>v.toString(16).padStart(2,'0')).join('');
    await rpc('erp_quote_manual_sent',{...common,p_quote:quote.id,p_revision:input.revision,p_request:input.request_id,p_recipient:input.recipient,p_subject:input.subject,p_body:input.body,p_sha:hash,p_confirmed:true},token,true);return {data:{sent:true}};
   }
   throw new QuoteError(400,'Nem engedélyezett ajánlati művelet.');
  }catch(error){return {status:error instanceof QuoteError?error.status:422,error:error instanceof Error?error.message:'Az ajánlat kezelése nem sikerült.'};}
 };
}