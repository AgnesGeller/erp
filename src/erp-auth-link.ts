export interface AuthLink {token?:string; error?:string; cleanedUrl:string; recognized:boolean;}
export function readAuthLink(value:string):AuthLink {
 const url=new URL(value);const params=new URLSearchParams(url.hash.slice(1));
 const recognized=['access_token','refresh_token','error','error_code','error_description','token_type'].some(key=>params.has(key));
 const cleanedUrl=url.origin+url.pathname+url.search;
 if(!recognized)return {cleanedUrl:value,recognized:false};
 if(params.has('error')||params.has('error_code'))return {recognized:true,cleanedUrl,error:'A hivatkozás lejárt vagy már felhasználták. Kérj új beállító e-mailt.'};
 const token=params.get('access_token');const type=params.get('type');
 if(!token||token.length>8192||/\s/.test(token)||!['recovery','signup','invite','magiclink'].includes(type??''))
  return {recognized:true,cleanedUrl,error:'Érvénytelen jelszóbeállító hivatkozás. Kérj új beállító e-mailt.'};
 return {recognized:true,cleanedUrl,token};
}
