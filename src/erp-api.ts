const SESSION_KEY='diszkertek-erp-office-session-v1';
const ENDPOINT='https://cszsxjsiwaaibrocibyd.supabase.co/functions/v1/erp-gateway';
export interface OrganizationSession { organization_id:string; organization_name:string; person_id:string; is_office:boolean; }
interface Tokens { access_token:string; refresh_token:string; expires_in:number; session:OrganizationSession[]; }
export class ApiError extends Error { constructor(message:string,public status:number) {super(message);} }
export class ErpApi {
  private tokens:Tokens|undefined;
  private expiresAt=0;
  private refreshPending:Promise<void>|undefined;
  private epoch=0;
  constructor(private requestFetch:typeof fetch=fetch,private storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>|undefined=browserStorage()) {}
  get remembered():boolean {try{return Boolean(this.storage?.getItem(SESSION_KEY));}catch{return false;}}
  private remember(refreshToken:string):void {try{this.storage?.setItem(SESSION_KEY,JSON.stringify({version:1,refresh_token:refreshToken}));}catch{/* Korlátozott tárhely esetén csak az aktuális belépés marad meg. */}}
  async restore():Promise<boolean> {
    if(this.signedIn)return true;
    let saved:unknown;
    try{const raw=this.storage?.getItem(SESSION_KEY);if(!raw)return false;saved=JSON.parse(raw);}catch{this.clear();return false;}
    if(!saved||typeof saved!=='object'||!('version' in saved)||saved.version!==1||!('refresh_token' in saved)||typeof saved.refresh_token!=='string'||!saved.refresh_token||saved.refresh_token.length>4096){this.clear();return false;}
    const epoch=this.epoch;
    try{const value=await this.request<Tokens>({action:'refresh',refresh_token:saved.refresh_token});if(epoch!==this.epoch)return false;this.accept(value);return true;}
    catch(error){if(epoch===this.epoch&&error instanceof ApiError&&(error.status===401||error.status===403))this.clear();throw error;}
  }
  async setupOffice(loginName:'agi'|'tamas',setupToken:string,password:string):Promise<void> {
    await this.request({action:'office_setup',login_name:loginName,setup_token:setupToken,password});
  }
  get organizations():OrganizationSession[] {return this.tokens?.session??[];}
  get signedIn():boolean {return Boolean(this.tokens);}
  private async request<T>(body:unknown,token?:string):Promise<T> {
    // Az AbortController szélesebb körben támogatott, mint az AbortSignal.timeout.
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),20000);
    try {
      let response:Response;
      try {response=await this.requestFetch.call(globalThis,ENDPOINT,{
        method:'POST',headers:{'Content-Type':'application/json',...(token?{'Authorization':'Bearer '+token}:{})},
        body:JSON.stringify(body),cache:'no-store',signal:controller.signal
      });} catch {throw new ApiError(controller.signal.aborted?'A kapcsolódás túl sokáig tartott. Próbáld újra.':'Nem sikerült elérni a szolgáltatást. Ellenőrizd az internetkapcsolatot.',0);}
      let data:unknown;
      try {data=await response.json();} catch {throw new ApiError(controller.signal.aborted?'A válasz túl sokáig tartott. Próbáld újra.':'A szolgáltatás hibás választ küldött. Próbáld újra később.',502);}
      if (!response.ok) {
        const message=data&&typeof data==='object'&&'error' in data&&typeof data.error==='string'?data.error:'A művelet nem sikerült.';
        throw new ApiError(message,response.status);
      }
      return data as T;
    } finally {clearTimeout(timer);}
  }
  async emailOptions():Promise<{email_enabled:boolean}> {return this.request({action:'auth_options'});}
  async requestEmail(email:string,kind:'register'|'recover'):Promise<{success:boolean;message:string}> {
    return this.request({action:kind==='register'?'register_email':'recover_email',email});
  }
  async setPassword(password:string,accessToken:string):Promise<void> {
    await this.request({action:'set_password',password},accessToken);
  }
  private accept(value:Tokens):void {
    if (!value || typeof value.access_token!=='string' || typeof value.refresh_token!=='string' ||
      !Number.isFinite(value.expires_in) || value.expires_in<=0 || !Array.isArray(value.session) || value.session.length===0 ||
      value.session.some(s=>typeof s.organization_id!=='string'||typeof s.organization_name!=='string'||typeof s.person_id!=='string'||typeof s.is_office!=='boolean'))
      throw new ApiError('A belépés visszaigazolása hiányos.',502);
    this.tokens=value;this.expiresAt=Date.now()+value.expires_in*1000;this.remember(value.refresh_token);
  }
  async login(loginName:'agi'|'tamas',password:string):Promise<void> {
    this.clear();const epoch=this.epoch;
    const result=await this.request<Tokens>({action:'login',login_name:loginName,password});
    if(epoch!==this.epoch)throw new ApiError('A munkamenet megváltozott. Jelentkezz be újra.',401);
    this.accept(result);
  }
  private async accessToken():Promise<string> {
    if (!this.tokens) throw new ApiError('Jelentkezz be a folytatáshoz.',401);
    if (this.expiresAt-Date.now()<60000) {
      if (!this.refreshPending) {
        const epoch=this.epoch;
        this.refreshPending=this.request<Tokens>({action:'refresh',refresh_token:this.tokens.refresh_token})
          .then(value=>{if(epoch!==this.epoch)throw new ApiError('A munkamenet megváltozott.',401);this.accept(value);})
          .catch(error=>{if(epoch===this.epoch&&error instanceof ApiError&&(error.status===401||error.status===403))this.clear();throw error;})
          .finally(()=>{if(epoch===this.epoch)this.refreshPending=undefined;});
      }
      await this.refreshPending;
    }
    return this.tokens!.access_token;
  }
  async rpc<T>(name:string,args:Record<string,unknown>={}):Promise<T> {
    const epoch=this.epoch;const token=await this.accessToken();
    if(epoch!==this.epoch||!this.tokens)throw new ApiError('A munkamenet megváltozott.',401);
    try {
      const result=await this.request<{data:T}>({action:'rpc',name,args},token);
      if(epoch!==this.epoch)throw new ApiError('A munkamenet megváltozott.',401);
      return result.data;
    }
    catch(error) {if(error instanceof ApiError&&(error.status===401||(name==='erp_session'&&error.status===403))&&epoch===this.epoch)this.clear();throw error;}
  }
  async customers<T>(action:'customers_list'|'customer_create'|'customer_resume',args:Record<string,unknown>):Promise<T> {
    const epoch=this.epoch;const token=await this.accessToken();
    if(epoch!==this.epoch||!this.tokens)throw new ApiError('A munkamenet megváltozott.',401);
    try{const result=await this.request<{data:T}>({action,...args},token);if(epoch!==this.epoch)throw new ApiError('A munkamenet megváltozott.',401);return result.data;}
    catch(error){if(epoch===this.epoch&&error instanceof ApiError&&error.status===401)this.clear();throw error;}
  }
  async logout():Promise<void> {
    const token=this.tokens?.access_token;this.clear();
    if(token)await this.request({action:'logout'},token);
  }
  clear():void {this.epoch++;this.tokens=undefined;this.expiresAt=0;this.refreshPending=undefined;try{this.storage?.removeItem(SESSION_KEY);}catch{/* Más alkalmazás tárolóját nem érintjük. */}}
}

function browserStorage():Storage|undefined {try{return typeof localStorage==='undefined'?undefined:localStorage;}catch{return undefined;}}
