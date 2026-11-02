import {validateSurvey,surveyUuid} from './survey-model.ts';
type Obj=Record<string,any>;
type Options={url:string;key:string;fetchImpl?:typeof fetch;context:(org:string,customer:string,token:string,actor:string,memberships:unknown)=>Promise<{data?:unknown;error?:string;status?:number}>};
class SurveyError extends Error{constructor(public status:number,message:string){super(message);}}
export function createSurveys(options:Options){
 const request=options.fetchImpl??fetch,base=options.url.replace(/\/$/,'');
 async function rpc(name:string,args:Obj,token:string,admin=false):Promise<any>{
  const response=await request(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:options.key,Authorization:'Bearer '+(admin?options.key:token),'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(15000)});
  const data=await response.json();if(!response.ok){const status=data?.code==='40001'?409:data?.code==='42501'?403:['22023','23514','22P02','23503'].includes(data?.code)?422:503;
   throw new SurveyError(status,status===409?'A felmérést másik eszköz módosította. A helyi jegyzet megmaradt; hasonlítsd össze a szerver változatával.':status===403?'Irodai jogosultság szükséges.':status===422?'Ellenőrizd a felmérés adatait és az aktív munkavégzési címet.':'A felmérés most nem érhető el.');}return data;
 }
 return async(input:Obj,token:string,actor:string,memberships:unknown)=>{
  try{
   const org=input.organization_id;if(!surveyUuid(org)||!Array.isArray(memberships)||!memberships.some(x=>x.organization_id===org&&x.is_office===true))throw new SurveyError(403,'Irodai jogosultság szükséges.');
   if(input.action==='survey_list')return {data:await rpc('erp_surveys_list',{p_org:org},token)};
   if(!surveyUuid(input.survey_id))throw new SurveyError(422,'Válassz felmérést.');
   const args={p_org:org,p_actor:actor};
   if(input.action==='survey_save'){
    if(!surveyUuid(input.request_id)||!Number.isSafeInteger(input.revision)||input.revision<0)throw new SurveyError(422,'Hibás mentési azonosító.');
    const doc=validateSurvey(input.document);const ctx=await options.context(org,doc.customer_id,token,actor,memberships);if(ctx.error)throw new SurveyError(ctx.status??503,ctx.error);
    if(!(ctx.data as Obj)?.sites?.some((s:Obj)=>s.id===doc.location_id))throw new SurveyError(422,'A munkavégzési cím nem érhető el.');
    return {data:await rpc('erp_survey_save',{...args,p_id:input.survey_id,p_request:input.request_id,p_revision:input.revision,p_document:doc},token,true)};
   }
   if(input.action==='survey_get'){
    if(input.version!==undefined&&(!Number.isSafeInteger(input.version)||input.version<1))throw new SurveyError(422,'Hibás változatszám.');
    return {data:await rpc('erp_survey_get',{p_org:org,p_id:input.survey_id,p_version:input.version??null},token)};
   }
   throw new SurveyError(400,'Nem támogatott felmérési művelet.');
  }catch(error){return {status:error instanceof SurveyError?error.status:422,error:error instanceof SurveyError?error.message:error instanceof Error&&error.name==='TypeError'?'A felmérés szolgáltatása most nem érhető el. A helyi jegyzet megmaradt.':error instanceof Error?error.message:'A felmérés kezelése nem sikerült.'};}
 };
}
