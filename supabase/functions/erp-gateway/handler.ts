type GatewayOptions = { url: string; anonKey: string; fetchImpl?: typeof fetch };
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
    async function call(path: string, body?: unknown, token?: string): Promise<{ response: Response; data: unknown }> {
      const h: Record<string,string> = {'apikey':options.anonKey,'Content-Type':'application/json'};
      if (token) h.Authorization = 'Bearer '+token;
      const response = await upstreamFetch(base+path,{
        method:body===undefined?'GET':'POST',headers:h,
        ...(body===undefined?{}:{body:JSON.stringify(body)}),
        signal:AbortSignal.timeout(15000)
      });
      const text = await response.text();
      let data: unknown = null;
      try { data=text?JSON.parse(text):null; } catch { /* A hibaválasz nem feltétlenül JSON. */ }
      return {response,data};
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
      if (input.action==='login' || input.action==='refresh') {
        let path: string; let body: Record<string,string>;
        if (input.action==='login') {
          if (typeof input.email!=='string' || input.email.length>254 || !input.email.includes('@') || typeof input.password!=='string' || !input.password || input.password.length>1024)
            return reply({error:'Add meg az e-mail-címet és a jelszót.'},400);
          path='/auth/v1/token?grant_type=password';
          body={email:input.email.trim(),password:input.password};
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
        return reply({access_token:tokens.access_token,refresh_token:tokens.refresh_token,expires_in:tokens.expires_in,session});
      }
      const bearer=req.headers.get('Authorization')??'';
      if (!/^Bearer [^\s]+$/.test(bearer)) return reply({error:'Jelentkezz be a folytatáshoz.'},401);
      const token=bearer.slice(7);
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
