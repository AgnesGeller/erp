import {customerQuote,type Obj} from './quote-engine.ts';
type Reply={data?:any;error?:string;status?:number};
type Options={kind?:'client'|'staff';url:string;key:string;anonKey:string;fetchImpl?:typeof fetch;pdf:(data:any,normal:boolean)=>Promise<Uint8Array>};
const id=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const email=(v:unknown):v is string=>typeof v==='string'&&v.length<=254&&/^[^\s@<>\x00-\x1f]+@[^\s@<>\x00-\x1f]+\.[^\s@<>\x00-\x1f]+$/.test(v);
const sha=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,'0')).join('');
const encode=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
class ClientError extends Error{constructor(public status:number,message:string){super(message);}}
/** Csak az Auth által igazolt tokenből, nem önálló hitelesítésként használható. */
export function verifiedSession(token:string){try{const raw=token.split('.')[1];const claims=JSON.parse(atob(raw.replace(/-/g,'+').replace(/_/g,'/')));if(!id(claims.sub)||!id(claims.session_id))throw Error();return {user:claims.sub as string,session:claims.session_id as string};}catch{throw new ClientError(401,'A munkamenet nem használható. Jelentkezz be újra.');}}
export function clientPortalView(raw:Obj){return {name:String(raw.name??''),sites:(raw.sites??[]).map((s:Obj)=>({id:s.id,address:s.address})),projects:(raw.projects??[]).map((p:Obj)=>({id:p.id,name:p.name,work_type:p.work_type,status:p.status,address:p.address,location_id:p.location_id,scheduled_date:p.scheduled_date,quote_id:p.quote_id,updated_at:p.updated_at})),quotes:(raw.quotes??[]).map((q:Obj)=>({id:q.id,number:q.number,status:q.status,title:q.title,date:q.date,version:q.version,customer:{name:q.customer?.name,address:q.customer?.address},calculation:customerQuote(q.calculation)}))};}
export function createClientAccess(options:Options){
 const kind=options.kind??'client';const request=options.fetchImpl??fetch;
 async function call(path:string,body:unknown,admin=true,method='POST'):Promise<any>{let response:Response;try{response=await request(options.url+path,{method,headers:{apikey:admin?options.key:options.anonKey,'Content-Type':'application/json',...(admin?{Authorization:'Bearer '+options.key}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});}catch{throw new ClientError(503,'A visszaigazolás nem érkezett meg. Várj két percet, majd ugyanazzal a hivatkozással újrapróbálhatod.');}let data:any;try{data=response.status===204?null:await response.json();}catch{throw new ClientError(503,'A szolgáltatás válasza nem olvasható.');}if(!response.ok){if(path.startsWith('/auth/v1/token'))throw new ClientError(response.status===429?429:401,'A belépés nem sikerült. Ellenőrizd az e-mail-címet és a jelszót.');const code=data?.code;throw new ClientError(code==='40001'||code==='23505'?409:code==='42501'?403:422,code==='40001'||code==='23505'?'Az adatok megváltoztak vagy az e-mail már foglalt. Frissítsd az adatokat.':code==='42501'?'Ehhez nincs aktív ügyfél-hozzáférésed.':'A művelet nem sikerült. Ellenőrizd az adatokat; beállítási hiba esetén két perc múlva újrapróbálhatod.');}return data;}
 const rpc=(name:string,args:Obj)=>call('/rest/v1/rpc/'+(kind==='staff'?name.replace(/^erp_client_/,'erp_staff_'):name),args);
 async function check(token:string){const c=verifiedSession(token);await rpc('erp_client_session_check',{p_user:c.user,p_session:c.session});}
 async function publicAction(input:Obj):Promise<Obj>{
  if(input.action==='client_recover'){if(!email(input.email))throw new ClientError(422,'Adj meg egy érvényes e-mail-címet.');await rpc('erp_client_recover',{p_email:input.email});return {success:true,message:'Ha van ilyen aktív ERP-ügyfélfiók, az iroda megkapta a kérésedet, és elküldi a jelszóbeállító hivatkozást. A levél nem automatikusan érkezik.'};}
  if(input.action==='client_setup'){
   if(typeof input.setup_token!=='string'||!/^[a-f0-9]{64}$/.test(input.setup_token)||typeof input.password!=='string'||input.password.length<12||input.password.length>256)throw new ClientError(422,'Érvényes beállító hivatkozás és legalább 12 karakteres jelszó szükséges.');
   const claim=await rpc('erp_client_claim',{p_hash:await sha(input.setup_token)});if(!claim.allowed)throw new ClientError(claim.busy?409:403,claim.busy?'A jelszóbeállítás folyamatban van. Várj két percet.':'A beállító hivatkozás lejárt, visszavonták vagy már felhasználták. Kérj újat az irodától.');
   let user=await rpc('erp_client_auth_lookup',{p_account:claim.account_id,p_claim:claim.claim_id});
   if(claim.auth_user_id&&user!==claim.auth_user_id)throw new ClientError(403,'A fiók azonosítása nem sikerült. Kérj segítséget az irodától.');
   const account=await call('/auth/v1/admin/users'+(user?'/'+user:''),user?{password:input.password}:{email:claim.email,password:input.password,email_confirm:true,app_metadata:{[kind==='staff'?'erp_staff_id':'erp_client_id']:claim.account_id}},true,user?'PUT':'POST');
   user=account.id??account.user?.id;if(!id(user))throw new ClientError(503,'Hiányos jelszóbeállítási visszaigazolás. Ugyanazzal a hivatkozással újrapróbálhatod.');
   await rpc('erp_client_finish',{p_account:claim.account_id,p_claim:claim.claim_id,p_user:user});return {success:true};
  }
  if(input.action==='client_login'){
   if(!email(input.email)||typeof input.password!=='string'||input.password.length<12||input.password.length>256)throw new ClientError(401,'Add meg a saját e-mail-címedet és jelszavadat.');
   const target=await rpc('erp_client_login_target',{p_email:input.email});if(!target.allowed)throw new ClientError(401,'A belépés nem sikerült. Ellenőrizd az adatokat; ismételt próbálkozás után várj 15 percet, vagy kérj segítséget az irodától.');
   const tokens=await call('/auth/v1/token?grant_type=password',{email:target.email,password:input.password},false);const c=verifiedSession(tokens.access_token);if(c.user!==target.user_id)throw new ClientError(401,'A fiók azonosítása nem sikerült.');
   await rpc('erp_client_session_open',{p_account:target.account_id,p_generation:target.generation,p_user:c.user,p_session:c.session});
   const sessionResponse=await request(options.url+'/rest/v1/rpc/erp_session',{method:'POST',headers:{apikey:options.anonKey,Authorization:'Bearer '+tokens.access_token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});const session=await sessionResponse.json();if(!sessionResponse.ok||!Array.isArray(session)||!session.length||session.some(s=>!s.person_id||s.is_office))throw new ClientError(403,'Nincs aktív ügyfél-hozzáférésed.');
   return {...tokens,session:session.map(s=>({...s,...(kind==='staff'?{is_staff:true,is_client:false}:{is_client:true})}))};
  }
  throw new ClientError(400,'Nem támogatott ügyfélművelet.');
 }
 async function authenticated(input:Obj,token:string,actor:string,memberships:unknown):Promise<Obj>{
  const c=verifiedSession(token);if(c.user!==actor)throw new ClientError(401,'Érvénytelen munkamenet.');
  if(input.action==='client_portal'||input.action==='client_pdf'){
   if(input.action==='client_pdf'&&!id(input.quote_id))throw new ClientError(422,'Válassz árajánlatot.');
   const raw=await rpc('erp_client_portal',{p_user:actor,p_session:c.session,p_quote:input.action==='client_pdf'?input.quote_id:null});
   if(input.action==='client_portal')return clientPortalView(raw);
   const q=raw.quotes?.find((v:Obj)=>v.id===input.quote_id);if(!q)throw new ClientError(403,'Ez az ajánlat nem érhető el.');
   const bytes=await options.pdf({number:q.number,date:q.date,title:q.title,customer:Object.fromEntries(['name','address','phone','email','billing_name','billing_address','tax_number'].map(k=>[k,typeof q.customer?.[k]==='string'?q.customer[k]:''])),calculation:customerQuote(q.calculation)},input.normal===true);return {pdf:encode(bytes),filename:q.number+'.pdf'};
  }
  if(!id(input.organization_id)||!Array.isArray(memberships)||!memberships.some(m=>m.organization_id===input.organization_id&&m.is_office===true))throw new ClientError(403,'Irodai jogosultság szükséges.');
  const common={p_org:input.organization_id,p_actor:actor};
  if(input.action==='client_admin_list')return rpc('erp_client_admin_list',common);
  if(input.action==='client_manage'){
   if(!id(input.account_id)||!Number.isSafeInteger(input.revision)||typeof input.name!=='string'||!input.name.trim()||input.name.length>150||!email(input.email)||!Array.isArray(input.sites)||input.sites.length>500||input.sites.some((s:Obj)=>!id(s.customer_id)||!id(s.location_id))||typeof input.active!=='boolean')throw new ClientError(422,'Ellenőrizd a nevet, e-mail-címet és a kijelölt címeket.');
   return rpc('erp_client_manage',{...common,p_account:input.account_id,p_revision:input.revision,p_name:input.name,p_email:input.email,p_scopes:input.sites,p_active:input.active});
  }
  if(input.action==='client_issue'){
   if(!id(input.account_id)||!Number.isSafeInteger(input.revision)||input.confirmed!==true)throw new ClientError(422,'Erősítsd meg a saját ERP-beállító hivatkozás elkészítését.');
   const secret=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(v=>v.toString(16).padStart(2,'0')).join('');const result=await rpc('erp_client_issue',{...common,p_account:input.account_id,p_revision:input.revision,p_hash:await sha(secret)});return {...result,url:'https://agnesgeller.github.io/erp/#client_setup='+secret};
  }
  throw new ClientError(400,'Nem támogatott ügyfélművelet.');
 }
 async function close(token:string,actor:string){const c=verifiedSession(token);if(c.user!==actor)throw new ClientError(401,'Érvénytelen munkamenet.');await rpc('erp_client_session_close',{p_user:actor,p_session:c.session});}
 return {check,close,handle:async(input:Obj,token?:string,actor?:string,memberships?:unknown):Promise<Reply>=>{try{const result=token&&actor?await authenticated(input,token,actor,memberships):await publicAction(input);if(kind==='staff'&&typeof result.message==='string')result.message=result.message.replaceAll('ügyfél','dolgozói');return {data:result};}catch(e){return {status:e instanceof ClientError?e.status:503,error:e instanceof ClientError?(kind==='staff'?e.message.replaceAll('ügyfél','munkatárs').replaceAll('Ügyfél','Munkatárs'):e.message):'Az ügyfélművelet most nem végezhető el. Próbáld újra később.'};}}};
}
