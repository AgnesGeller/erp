import {calendarKinds,calendarDate,calendarSourceManifest,normalizeCalendarPlan,normalizeCalendarCatalog,type CalendarRow as Row} from './calendar-model.ts';
const sourceUrl='https://wojgdfojupnfldrmqaht.supabase.co/rest/v1/';
export const calendarCanonical=(v:unknown):string=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
export async function calendarHash(v:unknown){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(calendarCanonical(v))))).map(v=>v.toString(16).padStart(2,'0')).join('');}
export async function prepareCalendarImport(config:Row,plans:Row[],owner:string|null,source='cloud'){
 const manifest=calendarSourceManifest(config,plans),rows:Row[]=[];
 const add=async(row:Row)=>{row.hash=await calendarHash(row.raw);rows.push(row);};
 await add({key:'config',kind:'archive',raw:config,updated_at:null});
 for(const kind of calendarKinds){const seen=new Set();for(const raw of config[kind]??[]){const document=normalizeCalendarCatalog(kind,raw);if(seen.has(document.id))throw Error('Ismétlődő törzsazonosító: '+kind);seen.add(document.id);await add({key:kind+':'+document.id,kind:'catalog',catalog_kind:kind,document,raw,updated_at:null});}}
 for(const raw of [...plans].sort((a,b)=>a.plan_date.localeCompare(b.plan_date))){const day=calendarDate(raw.plan_date);await add({key:'plan:'+day,kind:'plan',day,raw:raw.payload,updated_at:raw.updated_at??null,deleted:raw.payload?.deleted===true,document:raw.payload?.deleted===true?null:normalizeCalendarPlan(raw.payload,day)});}
 const fingerprint=await calendarHash({owner,config,plans:[...plans].sort((a,b)=>a.plan_date.localeCompare(b.plan_date))});return {rows,owner,fingerprint,manifest:{...manifest,source,_entries:rows.map(r=>({key:r.key,hash:r.hash}))}};
}
export function createCalendarSource(options:{key:string;fetchImpl?:typeof fetch;allowedOrganization:string}){
 const request=options.fetchImpl??fetch;
 async function get(path:string){if(!options.key)throw Error('A Napi feladatok olvasási kapcsolata nincs beállítva.');const r=await request(sourceUrl+path,{method:'GET',headers:{apikey:options.key,Authorization:'Bearer '+options.key,Accept:'application/json','Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('A régi Napi feladatok adatai most nem olvashatók. Nem módosítottuk őket.');const data=await r.json();if(!Array.isArray(data))throw Error('A Napi adatválasza hibás.');return data as Row[];}
 async function snapshot(){const configs=await get('napi_app_config?select=owner_id,payload,updated_at&limit=2');if(configs.length!==1)throw Error('A Napi forrástulajdonos nem azonosítható egyértelműen.');const config=configs[0],rows:Row[]=[];let after:string|null=null;
 for(let page=0;page<1000;page++){const path='napi_daily_plans?select=plan_date,payload,updated_at&owner_id=eq.'+encodeURIComponent(config.owner_id)+'&order=plan_date.asc&limit=500'+(after?'&plan_date=gt.'+after:'');const chunk=await get(path);rows.push(...chunk);if(chunk.length===0)return {owner:config.owner_id,config:config.payload,plans:rows,config_updated_at:config.updated_at};const next=chunk.at(-1)!.plan_date;if(after&&next<=after)throw Error('A teljes forráslapozás nem igazolható.');after=next;}
 throw Error('A teljes forrás nem olvasható be egy menetben; importálj ellenőrzött időszaki exportot.');}
 return async(org:string)=>{if(org!==options.allowedOrganization)throw Error('Ehhez a szervezethez nincs Napi-forrás kapcsolva.');const a=await snapshot(),b=await snapshot();if(await calendarHash(a)!==await calendarHash(b))throw Error('A Napi adatai olvasás közben változtak. Próbáld újra az importot.');return prepareCalendarImport(a.config,a.plans,a.owner);};
}
