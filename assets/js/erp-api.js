const SESSION_KEY = 'diszkertek-erp-office-session-v1';
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
    storage;
    tokens;
    expiresAt = 0;
    refreshPending;
    epoch = 0;
    constructor(requestFetch = fetch, storage = browserStorage()) {
        this.requestFetch = requestFetch;
        this.storage = storage;
    }
    get remembered() { try {
        return Boolean(this.storage?.getItem(SESSION_KEY));
    }
    catch {
        return false;
    } }
    remember(refreshToken) { try {
        this.storage?.setItem(SESSION_KEY, JSON.stringify({ version: 1, refresh_token: refreshToken }));
    }
    catch { /* Korlátozott tárhely esetén csak az aktuális belépés marad meg. */ } }
    async restore() {
        if (this.signedIn)
            return true;
        let saved;
        try {
            const raw = this.storage?.getItem(SESSION_KEY);
            if (!raw)
                return false;
            saved = JSON.parse(raw);
        }
        catch {
            this.clear();
            return false;
        }
        if (!saved || typeof saved !== 'object' || !('version' in saved) || saved.version !== 1 || !('refresh_token' in saved) || typeof saved.refresh_token !== 'string' || !saved.refresh_token || saved.refresh_token.length > 4096) {
            this.clear();
            return false;
        }
        const epoch = this.epoch;
        try {
            const value = await this.request({ action: 'refresh', refresh_token: saved.refresh_token });
            if (epoch !== this.epoch)
                return false;
            this.accept(value);
            return true;
        }
        catch (error) {
            if (epoch === this.epoch && error instanceof ApiError && (error.status === 401 || error.status === 403))
                this.clear();
            throw error;
        }
    }
    async setupOffice(loginName, setupToken, password) {
        await this.request({ action: 'office_setup', login_name: loginName, setup_token: setupToken, password });
    }
    get organizations() { return this.tokens?.session ?? []; }
    get signedIn() { return Boolean(this.tokens); }
    async request(body, token) {
        // Az AbortController szélesebb körben támogatott, mint az AbortSignal.timeout.
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        try {
            let response;
            try {
                response = await this.requestFetch.call(globalThis, ENDPOINT, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
                    body: JSON.stringify(body), cache: 'no-store', signal: controller.signal
                });
            }
            catch {
                throw new ApiError(controller.signal.aborted ? 'A kapcsolódás túl sokáig tartott. Próbáld újra.' : 'Nem sikerült elérni a szolgáltatást. Ellenőrizd az internetkapcsolatot.', 0);
            }
            let data;
            try {
                data = await response.json();
            }
            catch {
                throw new ApiError(controller.signal.aborted ? 'A válasz túl sokáig tartott. Próbáld újra.' : 'A szolgáltatás hibás választ küldött. Próbáld újra később.', 502);
            }
            if (!response.ok) {
                const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : 'A művelet nem sikerült.';
                throw new ApiError(message, response.status);
            }
            return data;
        }
        finally {
            clearTimeout(timer);
        }
    }
    async emailOptions() { return this.request({ action: 'auth_options' }); }
    async requestEmail(email, kind) {
        return this.request({ action: kind === 'register' ? 'register_email' : 'recover_email', email });
    }
    async setPassword(password, accessToken) {
        await this.request({ action: 'set_password', password }, accessToken);
    }
    accept(value) {
        if (!value || typeof value.access_token !== 'string' || typeof value.refresh_token !== 'string' ||
            !Number.isFinite(value.expires_in) || value.expires_in <= 0 || !Array.isArray(value.session) || value.session.length === 0 ||
            value.session.some(s => typeof s.organization_id !== 'string' || typeof s.organization_name !== 'string' || typeof s.person_id !== 'string' || typeof s.is_office !== 'boolean'))
            throw new ApiError('A belépés visszaigazolása hiányos.', 502);
        this.tokens = value;
        this.expiresAt = Date.now() + value.expires_in * 1000;
        this.remember(value.refresh_token);
    }
    async login(loginName, password) {
        this.clear();
        const epoch = this.epoch;
        const result = await this.request({ action: 'login', login_name: loginName, password });
        if (epoch !== this.epoch)
            throw new ApiError('A munkamenet megváltozott. Jelentkezz be újra.', 401);
        this.accept(result);
    }
    async loginClient(email, password) { this.clear(); const epoch = this.epoch; const value = await this.request({ action: 'client_login', email, password }); if (epoch !== this.epoch)
        throw new ApiError('A munkamenet megváltozott.', 401); this.accept(value); }
    async loginStaff(email, password) { this.clear(); const epoch = this.epoch; const value = await this.request({ action: 'staff_login', email, password }); if (epoch !== this.epoch)
        throw new ApiError('A munkamenet megváltozott.', 401); this.accept(value); }
    async staffPublic(action, args) { return this.request({ action, ...args }); }
    async staff(action, args) { return this.feature(action, args); }
    async plan(action, args = {}) { if (!/^plan_(projects|read|init|graph|task|notifications|history|statistics|color)$/.test(action))
        throw new ApiError('Ismeretlen munkatervművelet.', 400); return this.feature(action, args); }
    async material(action, args = {}) { return this.feature(action, args); }
    async sheet(action, args) { return this.feature(action, args); }
    async entry(action, args) { return this.feature(action, args); }
    async feature(action, args) { const epoch = this.epoch, token = await this.accessToken(); if (epoch !== this.epoch)
        throw new ApiError('A munkamenet megváltozott.', 401); try {
        const result = await this.request({ ...args, action }, token);
        if (epoch !== this.epoch)
            throw new ApiError('A munkamenet megváltozott.', 401);
        return result.data;
    }
    catch (e) {
        if (epoch === this.epoch && e instanceof ApiError && e.status === 401)
            this.clear();
        throw e;
    } }
    async clientPublic(action, args) { return this.request({ action, ...args }); }
    async client(action, args = {}) { const epoch = this.epoch, token = await this.accessToken(); if (epoch !== this.epoch)
        throw new ApiError('A munkamenet megváltozott.', 401); try {
        const result = await this.request({ ...args, action }, token);
        if (epoch !== this.epoch)
            throw new ApiError('A munkamenet megváltozott.', 401);
        return result.data;
    }
    catch (e) {
        if (epoch === this.epoch && e instanceof ApiError && (e.status === 401 || (action === 'client_portal' && e.status === 403)))
            this.clear();
        throw e;
    } }
    async accessToken() {
        if (!this.tokens)
            throw new ApiError('Jelentkezz be a folytatáshoz.', 401);
        if (this.expiresAt - Date.now() < 60000) {
            if (!this.refreshPending) {
                const epoch = this.epoch;
                this.refreshPending = this.request({ action: 'refresh', refresh_token: this.tokens.refresh_token })
                    .then(value => { if (epoch !== this.epoch)
                    throw new ApiError('A munkamenet megváltozott.', 401); this.accept(value); })
                    .catch(error => { if (epoch === this.epoch && error instanceof ApiError && (error.status === 401 || error.status === 403))
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
    async customers(action, args) {
        const epoch = this.epoch;
        const token = await this.accessToken();
        if (epoch !== this.epoch || !this.tokens)
            throw new ApiError('A munkamenet megváltozott.', 401);
        try {
            const result = await this.request({ ...args, action }, token);
            if (epoch !== this.epoch)
                throw new ApiError('A munkamenet megváltozott.', 401);
            return result.data;
        }
        catch (error) {
            if (epoch === this.epoch && error instanceof ApiError && error.status === 401)
                this.clear();
            throw error;
        }
    }
    async surveyAi(organizationId, input) {
        const epoch = this.epoch, token = await this.accessToken();
        if (epoch !== this.epoch || !this.tokens)
            throw new ApiError('A munkamenet megváltozott.', 401);
        const multipart = input instanceof FormData;
        if (multipart)
            input.set('organization_id', organizationId);
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 60000);
        try {
            let response;
            try {
                response = await this.requestFetch.call(globalThis, ENDPOINT.replace('/erp-gateway', '/erp-survey-ai'), { method: 'POST', headers: { Authorization: 'Bearer ' + token, ...(multipart ? {} : { 'Content-Type': 'application/json' }) }, body: multipart ? input : JSON.stringify({ ...input, organization_id: organizationId }), cache: 'no-store', signal: controller.signal });
            }
            catch {
                throw new ApiError('Az MI-szolgáltatás most nem érhető el. A hang és a jegyzet megmaradt.', 0);
            }
            const result = await response.json();
            if (epoch !== this.epoch)
                throw new ApiError('A munkamenet megváltozott.', 401);
            if (!response.ok) {
                if (response.status === 401)
                    this.clear();
                throw new ApiError(result?.error ?? 'Az MI-feldolgozás nem sikerült.', response.status);
            }
            return result;
        }
        finally {
            clearTimeout(timer);
        }
    }
    async logout() {
        const token = this.tokens?.access_token;
        this.clear();
        if (token)
            await this.request({ action: 'logout' }, token);
    }
    clear() { this.epoch++; this.tokens = undefined; this.expiresAt = 0; this.refreshPending = undefined; try {
        this.storage?.removeItem(SESSION_KEY);
    }
    catch { /* Más alkalmazás tárolóját nem érintjük. */ } }
}
function browserStorage() { try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
}
catch {
    return undefined;
} }
