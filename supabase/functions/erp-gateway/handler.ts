type GatewayOptions = { url: string; anonKey: string; serviceKey?: string; emailFlowsEnabled?: boolean; fetchImpl?: typeof fetch };
const allowedOrigins = new Set(['https://agnesgeller.github.io','http://127.0.0.1:5194','http://localhost:5194']);
const allowedRpc = new Set(['erp_session','erp_list_people','erp_create_worker_request','erp_list_projects','erp_list_assignments','erp_assign_project_role','erp_revoke_assignment']);
type TokenResult = { access_token: string; refresh_token: string; expires_in: number };
class GatewayError extends Error {
  constructor(public status: number, message: string, public code = '') { super(message); }
}
export function createGateway(options: GatewayOptions): (req: Request) => Promise<Response> {
  const base = options.url.replace(/\/$/, '');
  const upstreamFetch = options.fetchImpl ?? fetch;
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('Origin') ?? '';
    const headers: Record<string,string> = { 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin' };
    if (allowedOrigins.has(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'authorization, content-type';
    }
    const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status,headers});
    if (!allowedOrigins.has(origin)) return reply({error:'Ez a megnyitási mód nem támogatott.'},403);
    if (req.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (req.method !== 'POST') return reply({error:'Nem támogatott kérés.'},405);
    if (!base || !options.anonKey) return reply({error:'A bejelentkezési szolgáltatás nem érhető el.'},503);
    async function call(path: string, body?: unknown, token?: string, method?: string, admin=false): Promise<{ response: Response; data: unknown }> {
      const h: Record<string,string> = {'apikey':admin?(options.serviceKey??''):options.anonKey,'Content-Type':'application/json'};
      if (admin) {if(!options.serviceKey)throw new GatewayError(503,'Az irodai belépés nem érhető el.');h.Authorization='Bearer '+options.serviceKey;}
      else if (token) h.Authorization = 'Bearer '+token;
      const response = await upstreamFetch(base+path,{
        method:method??(body===undefined?'GET':'POST'),headers:h,
        ...(body===undefined?{}:{body:JSON.stringify(body)}),
        signal:AbortSignal.timeout(15000)
      });
      const text = await response.text();
      let data: unknown = null;
      try { data=text?JSON.parse(text):null; } catch { /* A hibaválasz nem feltétlenül JSON. */ }
      return {response,data};
    }
    async function officeAdmin(name:string,args:unknown):Promise<Record<string,unknown>> {
      const {response,data}=await call('/rest/v1/rpc/'+name,args,undefined,undefined,true);
      if(!response.ok)throw new GatewayError(503,'Az irodai művelet most nem végezhető el. Próbáld újra később.');
      return (data??{}) as Record<string,unknown>;
    }
    async function rpc(name: string, args: unknown, token: string): Promise<unknown> {
      const {response,data} = await call('/rest/v1/rpc/'+name,args,token);
      if (!response.ok) {
        const code = data && typeof data==='object' && 'code' in data ? String(data.code) : '';
        if (response.status===401) throw new GatewayError(401,'A munkamenet lejárt. Jelentkezz be újra.');
        if (response.status===403 || code==='42501') throw new GatewayError(403,'Nincs jogosultságod ehhez a művelethez.',code);
        if (code==='23505' || code==='40001') throw new GatewayError(409,'Az adatok megváltoztak vagy a bejegyzés már létezik. Frissítsd a listát.',code);
        if (code==='22023' || code==='23514' || code==='23503' || code==='22P02') throw new GatewayError(422,'Ellenőrizd a megadott adatokat és az időszakot.',code);
        throw new GatewayError(503,'A művelet most nem végezhető el. Próbáld újra később.');
      }
      return data;
    }
    try {
      const raw=await req.text();
      if (new TextEncoder().encode(raw).length>32768) return reply({error:'Túl nagy kérés.'},413);
      let input: Record<string,unknown>;
      try {
        const value: unknown=JSON.parse(raw);
        if (!value || typeof value!=='object' || Array.isArray(value)) throw new Error();
        input=value as Record<string,unknown>;
      } catch { return reply({error:'Érvénytelen kérés.'},400); }
      if(input.action==='office_setup') {
        if(!['agi','tamas'].includes(String(input.login_name))||typeof input.setup_token!=='string'||! /^[a-f0-9]{64}$/.test(input.setup_token)
        ||typeof input.password!=='string'||! /^[0-9]{6,12}$/.test(input.password))return reply({error:'Érvénytelen beállítás. A PIN-kód 6–12 számjegy legyen.'},400);
        const claim=await officeAdmin('erp_office_setup_claim',{p_login:input.login_name,p_token:input.setup_token});
        if(!claim.allowed)return reply({error:claim.busy?'A beállítás folyamatban van. Várj néhány percet.':'A beállító hivatkozás lejárt vagy már felhasználták.'},claim.busy?409:403);
        try {
          const create=!claim.account_id;
          const path='/auth/v1/admin/users'+(create?'':'/'+encodeURIComponent(String(claim.account_id)));
          const body=create?{email:claim.email,password:input.password,email_confirm:true,app_metadata:{erp_office_setup:claim.generation,erp_office_login:input.login_name}}:{password:input.password};
          const {response,data}=await call(path,body,undefined,create?'POST':'PUT',true);
          if(!response.ok)throw new GatewayError(response.status===429?429:422,'Nem sikerült beállítani a PIN-kódot. Válassz hosszabb, egyedi kódot, vagy próbáld újra később.');
          const account=data as {id?:unknown;user?:{id?:unknown}}|null;const id=account?.id??account?.user?.id;
          if(typeof id!=='string')throw new GatewayError(503,'A beállítás visszaigazolása hiányos. Próbáld újra később.');
          await officeAdmin('erp_office_setup_finish',{p_login:input.login_name,p_claim:claim.claim_id,p_user:id});
          return reply({success:true});
        }catch(error){try{await officeAdmin('erp_office_setup_release',{p_login:input.login_name,p_claim:claim.claim_id});}catch{/* Várakozás után ismételhető. */}throw error;}
      }
      if (input.action==='auth_options') return reply({email_enabled:options.emailFlowsEnabled===true});
      if (input.action==='register_email' || input.action==='recover_email') {
        if (!options.emailFlowsEnabled) return reply({error:'Az e-mailes jelszóbeállítás jelenleg nem érhető el. Kérj segítséget az irodától.'},503);
        if (typeof input.email!=='string' || input.email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))
          return reply({error:'Adj meg egy érvényes e-mail-címet.'},400);
        // Kizárólag az ERP-re irányítunk; a beküldött redirect URL-t nem használjuk.
        const redirect=encodeURIComponent('https://agnesgeller.github.io/erp/');
        const path=input.action==='register_email'?'/auth/v1/otp':'/auth/v1/recover';
        const body=input.action==='register_email'?{email:input.email.trim(),create_user:true}:{email:input.email.trim()};
        const {response,data}=await call(path+'?redirect_to='+redirect,body);
        const code=data&&typeof data==='object'&&'code' in data?String(data.code):'';
        const errorCode=data&&typeof data==='object'&&'error_code' in data?String(data.error_code):code;
        if (response.status===429) return reply({error:'Túl sok e-mail-kérés történt. Várj néhány percet, majd próbáld újra.'},429);
        if (errorCode==='email_address_not_authorized' || errorCode==='email_provider_disabled' || errorCode==='signup_disabled')
          return reply({error:'Az e-mailes ügyintézés nem érhető el. Kérj segítséget az irodától.'},503);
        // Nincs felhasználófelsorolás: nem közöljük, melyik cím van regisztrálva.
        if (!response.ok && !['user_not_found','user_already_exists','email_exists'].includes(errorCode))
          return reply({error:'Nem sikerült elküldeni a beállító e-mailt. Próbáld újra később.'},503);
        return reply({success:true,message:input.action==='register_email'?'Ha a regisztráció engedélyezett, e-mailben megkapod a jelszóbeállítás hivatkozását.':'Ha a címhez tartozik fiók, e-mailben megkapod az új jelszó beállításához szükséges hivatkozást.'});
      }
      if (input.action==='login' || input.action==='refresh') {
        let path: string; let body: Record<string,string>;
        if (input.action==='login') {
          if(!['agi','tamas'].includes(String(input.login_name))||typeof input.password!=='string'||! /^[0-9]{6,12}$/.test(input.password))
            return reply({error:'Válaszd ki a nevedet, és add meg a saját ERP PIN-kódodat.'},400);
          const target=await officeAdmin('erp_office_login_target',{p_login:input.login_name});
          if(!target.allowed)return reply({error:target.locked?'Túl sok próbálkozás történt. Várj 15 percet.':'A belépés nem sikerült. Ellenőrizd a nevet és a PIN-kódot; első belépés előtt használd a saját beállító hivatkozásodat.'},target.locked?429:401);
          path='/auth/v1/token?grant_type=password';body={email:String(target.email),password:input.password};
        } else {
          if (typeof input.refresh_token!=='string' || !input.refresh_token || input.refresh_token.length>4096)
            return reply({error:'Jelentkezz be újra.'},401);
          path='/auth/v1/token?grant_type=refresh_token';
          body={refresh_token:input.refresh_token};
        }
        const {response,data}=await call(path,body);
        if (response.status===429) return reply({error:'Túl sok próbálkozás történt. Várj néhány percet.'},429);
        if (!response.ok) return reply({error:input.action==='login'?'Sikertelen belépés. Ellenőrizd az adatokat.':'A munkamenet lejárt. Jelentkezz be újra.'},response.status>=500?503:401);
        const tokens=data as Partial<TokenResult> | null;
        if (!tokens || typeof tokens.access_token!=='string' || typeof tokens.refresh_token!=='string' || typeof tokens.expires_in!=='number')
          throw new GatewayError(503,'A bejelentkezés most nem végezhető el.');
        let session: unknown;
        try {
          session=await rpc('erp_session',{},tokens.access_token);
          if (!Array.isArray(session) || session.length===0) throw new GatewayError(403,'Nincs aktív ERP-hozzáférésed.');
        } catch (error) {
          // Csak az imént nyitott/megújított ERP-munkamenetet zárjuk, más appét nem.
          try { await call('/auth/v1/logout?scope=local',{},tokens.access_token); } catch { /* Nincs titok naplózva. */ }
          throw error;
        }
        if(input.action==='login'){try{await officeAdmin('erp_office_login_success',{p_login:input.login_name});}catch{/* A belépés ettől még sikeres. */}}
        return reply({access_token:tokens.access_token,refresh_token:tokens.refresh_token,expires_in:tokens.expires_in,session});
      }
      const bearer=req.headers.get('Authorization')??'';
      if (!/^Bearer [^\s]+$/.test(bearer)) return reply({error:'Jelentkezz be a folytatáshoz.'},401);
      const token=bearer.slice(7);
      if (input.action==='set_password') {
        if(!options.emailFlowsEnabled)return reply({error:'Az e-mailes jelszóbeállítás még nem elérhető.'},503);
        if (typeof input.password!=='string' || input.password.length<12 || input.password.length>1024)
          return reply({error:'Az új jelszó legalább 12 karakter legyen.'},422);
        const {response:verified,data:account}=await call('/auth/v1/user',undefined,token);
        if (!verified.ok || !account || typeof account!=='object' || !('id' in account))
          return reply({error:'A hivatkozás lejárt vagy érvénytelen. Kérj új jelszóbeállító e-mailt.'},401);
        if (!('email_confirmed_at' in account) || !account.email_confirmed_at || ('is_anonymous' in account && account.is_anonymous))
          return reply({error:'Először erősítsd meg az e-mail-címedet.'},403);
        const {response:updated,data:passwordResult}=await call('/auth/v1/user',{password:input.password},token,'PUT');
        if (updated.status===429) return reply({error:'Túl sok próbálkozás történt. Várj néhány percet.'},429);
        const passwordCode=passwordResult&&typeof passwordResult==='object'&&'code' in passwordResult?String(passwordResult.code):'';
        if (!updated.ok) {
          if (updated.status===401) return reply({error:'A hivatkozás lejárt. Kérj új jelszóbeállító e-mailt.'},401);
          if (updated.status===422 || updated.status===400 || passwordCode==='weak_password')
            return reply({error:'Ezt a jelszót nem lehet beállítani. Válassz új, hosszabb jelszót; szükség esetén kérj új e-mailt.'},422);
          return reply({error:'A jelszó beállítása nem sikerült. Próbáld újra később.'},503);
        }
        // A jelszó már megváltozott. A helyi kijelentkezés külön hibája miatt nem állítunk sikertelen mentést.
        try { await call('/auth/v1/logout?scope=local',{},token); } catch { /* A böngésző is eldobja az egyszeri tokent. */ }
        return reply({success:true});
      }
      if (input.action==='logout') {
        const {response}=await call('/auth/v1/logout?scope=local',{},token);
        if (!response.ok && response.status!==401) throw new GatewayError(503,'A kijelentkezés visszaigazolása nem érkezett meg.');
        return reply({success:true});
      }
      if (input.action!=='rpc' || typeof input.name!=='string' || !allowedRpc.has(input.name))
        return reply({error:'Nem engedélyezett művelet.'},400);
      if (!input.args || typeof input.args!=='object' || Array.isArray(input.args))
        return reply({error:'Érvénytelen adatok.'},400);
      const {response:userResponse,data:user}=await call('/auth/v1/user',undefined,token);
      if (!userResponse.ok || !user || typeof user!=='object' || !('id' in user)) return reply({error:'A munkamenet lejárt. Jelentkezz be újra.'},401);
      return reply({data:await rpc(input.name,input.args,token)});
    } catch (error) {
      if (error instanceof GatewayError) return reply({error:error.message,code:error.code},error.status);
      return reply({error:'A szolgáltatás nem érhető el. Ellenőrizd az internetkapcsolatot, majd próbáld újra.'},503);
    }
  };
}
