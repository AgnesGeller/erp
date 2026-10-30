const ENDPOINT = 'https://cszsxjsiwaaibrocibyd.supabase.co/functions/v1/erp-gateway';
export class ApiError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
export class ErpApi {
    requestFetch;
    tokens;
    expiresAt = 0;
    refreshPending;
    epoch = 0;
    constructor(requestFetch = fetch) {
        this.requestFetch = requestFetch;
    }
    get organizations() { return this.tokens?.session ?? []; }
    get signedIn() { return Boolean(this.tokens); }
    async request(body, token) {
        let response;
        try {
            response = await this.requestFetch(ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
                body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(20000)
            });
        }
        catch {
            throw new ApiError('Nem sikerült elérni a szolgáltatást. Ellenőrizd az internetkapcsolatot.', 0);
        }
        let data;
        try {
            data = await response.json();
        }
        catch {
            throw new ApiError('A szolgáltatás hibás választ küldött. Próbáld újra később.', 502);
        }
        if (!response.ok) {
            const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : 'A művelet nem sikerült.';
            throw new ApiError(message, response.status);
        }
        return data;
    }
    accept(value) {
        if (!value || typeof value.access_token !== 'string' || typeof value.refresh_token !== 'string' ||
            !Number.isFinite(value.expires_in) || value.expires_in <= 0 || !Array.isArray(value.session) || value.session.length === 0 ||
            value.session.some(s => typeof s.organization_id !== 'string' || typeof s.organization_name !== 'string' || typeof s.person_id !== 'string' || typeof s.is_office !== 'boolean'))
            throw new ApiError('A belépés visszaigazolása hiányos.', 502);
        this.tokens = value;
        this.expiresAt = Date.now() + value.expires_in * 1000;
    }
    async login(email, password) {
        this.clear();
        const epoch = this.epoch;
        const result = await this.request({ action: 'login', email, password });
        if (epoch !== this.epoch)
            throw new ApiError('A munkamenet megváltozott. Jelentkezz be újra.', 401);
        this.accept(result);
    }
    async accessToken() {
        if (!this.tokens)
            throw new ApiError('Jelentkezz be a folytatáshoz.', 401);
        if (this.expiresAt - Date.now() < 60000) {
            if (!this.refreshPending) {
                const epoch = this.epoch;
                this.refreshPending = this.request({ action: 'refresh', refresh_token: this.tokens.refresh_token })
                    .then(value => { if (epoch !== this.epoch)
                    throw new ApiError('A munkamenet megváltozott.', 401); this.accept(value); })
                    .catch(error => { if (epoch === this.epoch)
                    this.clear(); throw error; })
                    .finally(() => { if (epoch === this.epoch)
                    this.refreshPending = undefined; });
            }
            await this.refreshPending;
        }
        return this.tokens.access_token;
    }
    async rpc(name, args = {}) {
        const epoch = this.epoch;
        const token = await this.accessToken();
        if (epoch !== this.epoch || !this.tokens)
            throw new ApiError('A munkamenet megváltozott.', 401);
        try {
            const result = await this.request({ action: 'rpc', name, args }, token);
            if (epoch !== this.epoch)
                throw new ApiError('A munkamenet megváltozott.', 401);
            return result.data;
        }
        catch (error) {
            if (error instanceof ApiError && (error.status === 401 || (name === 'erp_session' && error.status === 403)) && epoch === this.epoch)
                this.clear();
            throw error;
        }
    }
    async logout() {
        const token = this.tokens?.access_token;
        this.clear();
        if (token)
            await this.request({ action: 'logout' }, token);
    }
    clear() { this.epoch++; this.tokens = undefined; this.expiresAt = 0; this.refreshPending = undefined; }
}
