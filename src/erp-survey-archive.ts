import type {LocalSurvey,LocalMedia} from './erp-survey-store.js';
import type {SurveyDocument} from './erp-survey-model.js';
const {validateSurvey,checkMediaBytes,surveyMime,surveyUuid}=await import(new URL('./erp-survey-model.js?v=0.8.0',import.meta.url).href) as typeof import('./erp-survey-model.js');
type ZipModule={zipSync:(files:Record<string,Uint8Array>,options?:{level:number})=>Uint8Array;unzipSync:(data:Uint8Array,options:{filter:(file:{name:string;originalSize:number})=>boolean})=>Record<string,Uint8Array>};
const zip=async()=>await import(new URL('../vendor/fflate-0.8.2.js',import.meta.url).href) as ZipModule;
export async function surveyHash(blob:Blob){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export function downloadSurveyFile(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
export async function exportSurvey(row:LocalSurvey,read:(id:string)=>Promise<LocalMedia|undefined>){
 const document=validateSurvey(row.document),files:Record<string,Uint8Array>={};let total=0,missing:string[]=[];
 for(const section of document.sections)for(const m of section.media){const local=await read(m.id);if(!local){missing.push(m.id);continue;}
 total+=local.blob.size;if(total>64*1024*1024)throw Error('A teljes csomag nagyobb 64 MB-nál. A mellékleteket külön töltsd le.');
 if(await surveyHash(local.blob)!==m.sha256)throw Error('Egy helyi melléklet ellenőrzőösszege eltér.');
 files['media/'+m.id+'.'+surveyMime[m.mime].extension]=new Uint8Array(await local.blob.arrayBuffer());}
 const manifest={format:'diszkertek-survey-1',id:row.id,revision:row.revision,customer_name:row.customer_name,site_address:row.site_address,document,missing_files:missing};
 files['felmeres.json']=new TextEncoder().encode(JSON.stringify(manifest));
 const {zipSync}=await zip();return {blob:new Blob([new Uint8Array(zipSync(files,{level:0})).buffer],{type:'application/zip'}),missing:missing.length};
}
export async function importSurvey(file:File):Promise<{id:string;revision:number;document:SurveyDocument;customer_name:string;site_address:string;media:{id:string;blob:Blob}[]}>{
 if(file.size>80*1024*1024)throw Error('A csomag legfeljebb 80 MB lehet.');
 const {unzipSync}=await zip();let total=0,count=0;
 const files=unzipSync(new Uint8Array(await file.arrayBuffer()),{filter:entry=>{if(++count>201||entry.originalSize>12*1024*1024||(total+=entry.originalSize)>65*1024*1024)throw Error('A kicsomagolt állomány túl nagy.');
 if(entry.name!=='felmeres.json'&&!/^media\/[0-9a-f-]{36}\.(jpg|png|webp|webm|ogg|m4a|wav)$/.test(entry.name))throw Error('Ismeretlen fájl a felmérési csomagban.');
 if(entry.name==='felmeres.json'&&entry.originalSize>240000)throw Error('Túl nagy felmérési leírás.');return true;}});
 if(!files['felmeres.json'])throw Error('A csomagból hiányzik a felmérési leírás.');
 const data=JSON.parse(new TextDecoder().decode(files['felmeres.json']));if(data?.format!=='diszkertek-survey-1'||!surveyUuid(data.id)||!Number.isSafeInteger(data.revision)||data.revision<0)throw Error('Ismeretlen felmérési csomag.');
 const document=validateSurvey(data.document),media:{id:string;blob:Blob}[]=[];
 for(const section of document.sections)for(const m of section.media){const bytes=files['media/'+m.id+'.'+surveyMime[m.mime].extension];if(!bytes)continue;if(bytes.length!==m.size)throw Error('Eltérő fájlméret.');checkMediaBytes(bytes,m.mime);const blob=new Blob([new Uint8Array(bytes).buffer],{type:m.mime});if(await surveyHash(blob)!==m.sha256)throw Error('A melléklet ellenőrzőösszege eltér.');media.push({id:m.id,blob});}
 return {id:data.id,revision:data.revision,document,customer_name:typeof data.customer_name==='string'?data.customer_name.slice(0,200):'',site_address:typeof data.site_address==='string'?data.site_address.slice(0,4000):'',media};
}
