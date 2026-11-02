export type SurveyMedia={id:string;kind:'photo'|'audio';mime:string;size:number;sha256:string};
export type SurveySection={id:string;name:string;length:string;width:string;area:string;notes:string;media:SurveyMedia[]};
export type SurveyDocument={customer_id:string;location_id:string;title:string;work_type:'construction'|'maintenance';wishes:string;sections:SurveySection[]};
export const surveyUuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export const surveyMime:Record<string,{kind:'photo'|'audio';extension:string;limit:number}>={
'image/jpeg':{kind:'photo',extension:'jpg',limit:6*1024*1024},
'image/png':{kind:'photo',extension:'png',limit:6*1024*1024},
'image/webp':{kind:'photo',extension:'webp',limit:6*1024*1024},
'audio/webm':{kind:'audio',extension:'webm',limit:12*1024*1024},
'audio/ogg':{kind:'audio',extension:'ogg',limit:12*1024*1024},
'audio/mp4':{kind:'audio',extension:'m4a',limit:12*1024*1024},
'audio/wav':{kind:'audio',extension:'wav',limit:12*1024*1024}};
function text(value:unknown,max:number,label:string){if(typeof value!=='string'||value.length>max)throw Error(label+': túl hosszú vagy hibás érték.');return value;}
function measure(value:unknown){const v=text(value,20,'Méret').trim().replace(',','.');if(v!==''&&(!/^\d{1,6}(\.\d{1,4})?$/.test(v)||Number(v)<=0||Number(v)>100000))throw Error('A méret legyen pozitív szám, legfeljebb 100 000.');return v;}
export function validateSurvey(value:unknown):SurveyDocument{
 if(!value||typeof value!=='object')throw Error('Hiányos felmérés.');const v=value as SurveyDocument;
 if(!surveyUuid(v.customer_id)||!surveyUuid(v.location_id))throw Error('Válassz ügyfelet és munkavégzési címet.');
 const title=text(v.title,200,'Megnevezés').trim();if(!title)throw Error('Add meg a felmérés megnevezését.');
 if(!['construction','maintenance'].includes(v.work_type))throw Error('Válassz munkaterületet.');
 if(!Array.isArray(v.sections)||v.sections.length<1||v.sections.length>100)throw Error('Legalább egy, legfeljebb 100 főtétel szükséges.');
 const ids=new Set<string>(),mediaIds=new Set<string>();
 const sections=v.sections.map(s=>{if(!s||!surveyUuid(s.id)||ids.has(s.id))throw Error('Hibás vagy ismétlődő főtételazonosító.');ids.add(s.id);
 const name=text(s.name,200,'Főtétel neve').trim();if(!name)throw Error('Nevezd el a főtételeket.');
 if(!Array.isArray(s.media)||s.media.length>50)throw Error('Főtételenként legfeljebb 50 melléklet adható meg.');
 const media=s.media.map(m=>{const rule=surveyMime[m?.mime];if(!m||!surveyUuid(m.id)||mediaIds.has(m.id)||!rule||rule.kind!==m.kind||!Number.isSafeInteger(m.size)||m.size<1||m.size>rule.limit||!/^[a-f0-9]{64}$/.test(m.sha256))throw Error('Hibás melléklet vagy túl nagy fájl.');mediaIds.add(m.id);return {id:m.id,kind:m.kind,mime:m.mime,size:m.size,sha256:m.sha256};});
 return {id:s.id,name,length:measure(s.length),width:measure(s.width),area:measure(s.area),notes:text(s.notes,20000,'Jegyzet'),media};});
 const result={customer_id:v.customer_id,location_id:v.location_id,title,work_type:v.work_type,wishes:text(v.wishes,10000,'Az ügyfél elképzelései'),sections};
 if(mediaIds.size>200||new TextEncoder().encode(JSON.stringify(result)).length>220000)throw Error('A felmérés túl nagy. Oszd külön felmérésekre.');return result;
}
export function surveyToQuote(doc:SurveyDocument,id:string,revision:number){
 const d=validateSurvey(doc);if(!surveyUuid(id)||!Number.isSafeInteger(revision)||revision<1)throw Error('Előbb szinkronizáld a felmérést.');
 return {title:d.title,customer_id:d.customer_id,location_id:d.location_id,vat:'0',hourly_rate:'',information:'',source_survey:{id,revision,wishes:d.wishes},
 sections:d.sections.map(s=>({id:crypto.randomUUID(),name:s.name,length:s.length,width:s.width,area:s.area||(s.length&&s.width?String(Math.round(Number(s.length)*Number(s.width)*10000)/10000):''),survey_note:s.notes,survey_media:s.media.map(m=>({...m})),lines:[]}))};
}
export function checkMediaBytes(bytes:Uint8Array,mime:string){
 const a=(...n:number[])=>n.every((v,i)=>bytes[i]===v),word=(at:number,n:number)=>new TextDecoder().decode(bytes.subarray(at,at+n));
 const valid=mime==='image/jpeg'?a(255,216,255):mime==='image/png'?a(137,80,78,71,13,10,26,10):mime==='image/webp'?word(0,4)==='RIFF'&&word(8,4)==='WEBP':mime==='audio/webm'?a(26,69,223,163):mime==='audio/ogg'?word(0,4)==='OggS':mime==='audio/mp4'?word(4,4)==='ftyp':mime==='audio/wav'?word(0,4)==='RIFF'&&word(8,4)==='WAVE':false;
 if(!valid)throw Error('A fájl tartalma nem egyezik a megadott típussal.');
}
