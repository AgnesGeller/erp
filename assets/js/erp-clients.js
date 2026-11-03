const el = (id) => document.getElementById(id);
const node = (tag, text = '') => { const x = document.createElement(tag); x.textContent = text; return x; };
const button = (text, run) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'quiet'; b.textContent = text; b.addEventListener('click', run); return b; };
const statuses = { waiting_start: 'Indításra vár', running: 'Kertépítés folyamatban', requested: 'Időpontigény beérkezett', confirmed: 'Visszaigazolt munka', cancelled: 'Visszavont munka', sent: 'Kiküldött ajánlat', accepted: 'Elfogadott ajánlat', rejected: 'Elutasított ajánlat', withdrawn: 'Visszavont ajánlat' };
const { quoteNumber } = await import(new URL('./erp-quote-tools.js?v=0.6.1', import.meta.url).href);
const money = (v) => quoteNumber(v) + ' Ft';
export class ClientAdmin {
    api;
    onError;
    org;
    epoch = 0;
    accounts = [];
    sites = [];
    context;
    freshId = crypto.randomUUID();
    selected;
    busy = false;
    dirty = false;
    constructor(api, onError) {
        this.api = api;
        this.onError = onError;
        el('client-account').addEventListener('change', () => { if (this.dirty && !confirm('Másik fiókot választasz? A még nem mentett módosítások elvesznek.')) {
            el('client-account').value = this.selected?.id ?? '';
            return;
        } this.select(); });
        el('client-access-form').addEventListener('input', e => { if (e.target.id === 'client-account')
            return; this.dirty = true; this.clearLink(); this.lock(false); });
        el('client-access-form').addEventListener('submit', e => { e.preventDefault(); void this.save(); });
        el('client-access-close').addEventListener('click', () => { if (!this.busy && (!this.dirty || confirm('Bezárod a hozzáférés szerkesztését? A még nem mentett mezők elvesznek.'))) {
            this.dirty = false;
            this.clearLink();
            el('client-access-dialog').close();
        } });
        el('client-access-dialog').addEventListener('cancel', e => { if (this.busy || (this.dirty && !confirm('Bezárod? A nem mentett hozzáférési mezők elvesznek.')))
            e.preventDefault();
        else {
            this.dirty = false;
            this.clearLink();
        } });
        el('client-recovery-requests').addEventListener('click', () => { void this.openRequests(); });
        el('client-issue').addEventListener('click', () => { void this.issue(); });
        el('client-link-copy').addEventListener('click', () => { void this.copyLink(); });
    }
    message(text, success = false) { const x = el('client-access-feedback'); x.textContent = (success ? '✓ ' : '') + text; x.className = 'office-status ' + (success ? 'success' : 'error'); }
    clearLink() { el('client-link-panel').hidden = true; el('client-link').value = ''; el('client-link-email').removeAttribute('href'); }
    reset() { this.epoch++; this.org = undefined; this.accounts = []; this.sites = []; this.selected = undefined; this.context = undefined; this.busy = false; this.dirty = false; this.clearLink(); el('client-access-dialog').close(); el('client-site-options').replaceChildren(); }
    setOrganization(org) { if (this.org !== org) {
        this.reset();
        this.org = org;
    } }
    async open(customer, name) {
        if (!this.org || this.busy)
            return;
        const epoch = ++this.epoch;
        this.busy = true;
        this.clearLink();
        this.context = { customer_id: customer, customer_name: name };
        el('client-access-title').textContent = 'Ügyfél-hozzáférés · ' + name;
        el('client-access-dialog').showModal();
        this.message('Címek és hozzáférések betöltése…');
        this.lock(true);
        try {
            const [context, accounts] = await Promise.all([this.api.customers('work_sites', { organization_id: this.org, customer_id: customer }), this.api.client('client_admin_list', { organization_id: this.org })]);
            if (epoch !== this.epoch)
                return;
            this.context = context;
            this.accounts = accounts;
            this.freshId = crypto.randomUUID();
            const choose = el('client-account');
            choose.replaceChildren(new Option('Új, saját ERP-ügyfélfiók', ''));
            for (const a of accounts)
                choose.add(new Option(a.name + ' · ' + a.email + (a.active ? '' : ' · Inaktív') + (a.recovery_requested ? ' · Jelszó-visszaállítást kér' : ''), a.id));
            const matches = accounts.filter(a => a.sites.some((s) => s.customer_id === customer));
            choose.value = matches.length === 1 ? matches[0].id : '';
            this.select();
            this.message('Jelöld ki, mely címek munkáit láthatja a fiók. A mentés nem küld levelet.', true);
        }
        catch (e) {
            if (epoch === this.epoch) {
                this.message(e instanceof Error ? e.message : 'A betöltés nem sikerült.');
                this.onError(e);
            }
        }
        finally {
            if (epoch === this.epoch) {
                this.busy = false;
                this.lock(false);
            }
        }
    }
    async refreshRequests() { if (!this.org || this.busy)
        return; const epoch = this.epoch; try {
        const rows = await this.api.client('client_admin_list', { organization_id: this.org });
        if (epoch !== this.epoch)
            return;
        const count = rows.filter(r => r.recovery_requested).length;
        el('client-recovery-requests').textContent = 'Ügyfél-jelszókérések' + (count ? ' (' + count + ')' : '');
    }
    catch { /* A jelzés hibája nem akadályozza a már működő irodai munkát. */ } }
    async openRequests() { if (!this.org || this.busy)
        return; const epoch = ++this.epoch; this.busy = true; this.dirty = false; this.clearLink(); this.context = { sites: [] }; el('client-access-title').textContent = 'Ügyfél-jelszó-visszaállítási kérések'; el('client-access-dialog').showModal(); this.lock(true); try {
        this.accounts = await this.api.client('client_admin_list', { organization_id: this.org });
        if (epoch !== this.epoch)
            return;
        const requested = this.accounts.filter(a => a.recovery_requested);
        const select = el('client-account');
        select.replaceChildren(new Option('Válassz ügyfélfiókot', ''), ...this.accounts.map(a => new Option(a.name + ' · ' + a.email + (a.recovery_requested ? ' · Visszaállítást kér' : ''), a.id)));
        select.value = requested[0]?.id ?? '';
        this.select();
        this.message(requested.length ? 'A kiválasztott ügyfélnek készíts új beállító hivatkozást, és kézzel küldd el.' : 'Nincs függőben jelszó-visszaállítási kérés.', true);
    }
    catch (e) {
        if (epoch === this.epoch)
            this.message(e instanceof Error ? e.message : 'A kérések nem tölthetők be.');
    }
    finally {
        if (epoch === this.epoch) {
            this.busy = false;
            this.lock(false);
        }
    } }
    lock(value) { el('client-access-fields').disabled = value; el('client-issue').disabled = value || !this.selected || this.dirty; el('client-email').disabled = value || !!this.selected; }
    select() {
        if (!el('client-account').value)
            this.freshId = crypto.randomUUID();
        this.selected = this.accounts.find(a => a.id === el('client-account').value);
        this.dirty = false;
        this.clearLink();
        el('client-person-name').value = this.selected?.name ?? this.context?.customer_name ?? '';
        el('client-email').value = this.selected?.email ?? this.context?.email ?? '';
        el('client-active').checked = this.selected?.active ?? true;
        const all = new Map();
        for (const s of this.selected?.sites ?? [])
            all.set(s.location_id, s);
        for (const s of this.context?.sites ?? [])
            all.set(s.id, { customer_id: this.context.customer_id, location_id: s.id, address: s.address });
        this.sites = [...all.values()].sort((a, b) => a.address.localeCompare(b.address, 'hu'));
        const list = el('client-site-options');
        list.replaceChildren();
        for (const s of this.sites) {
            const label = node('label', s.address), check = document.createElement('input');
            check.type = 'checkbox';
            check.className = 'inline-check';
            check.value = s.location_id;
            check.checked = !!this.selected?.sites.some((v) => v.location_id === s.location_id);
            check.addEventListener('change', () => { this.dirty = true; this.clearLink(); this.lock(false); });
            label.prepend(check);
            list.append(label);
        }
        if (!this.sites.length)
            list.append(node('p', 'Nincs kijelölhető, aktív munkavégzési cím.'));
        this.lock(this.busy);
    }
    async save() {
        if (!this.org || this.busy)
            return;
        const active = el('client-active').checked;
        if (this.selected?.active && !active && !confirm('Inaktiválod ezt az ERP-ügyfélfiókot? A hozzáférése minden eszközén megszűnik, az előzmények megmaradnak.'))
            return;
        const chosen = new Set(Array.from(el('client-site-options').querySelectorAll('input:checked')).map(x => x.value));
        const account = this.selected?.id ?? this.freshId;
        const epoch = this.epoch;
        this.busy = true;
        this.lock(true);
        this.message('Hozzáférés mentése…');
        try {
            await this.api.client('client_manage', { organization_id: this.org, account_id: account, revision: this.selected?.revision ?? 0, name: el('client-person-name').value.trim(), email: el('client-email').value.trim(), sites: this.sites.filter(s => chosen.has(s.location_id)).map(s => ({ customer_id: s.customer_id, location_id: s.location_id })), active });
            if (epoch !== this.epoch)
                return;
            this.accounts = await this.api.client('client_admin_list', { organization_id: this.org });
            if (epoch !== this.epoch)
                return;
            const choose = el('client-account');
            choose.replaceChildren(new Option('Új, saját ERP-ügyfélfiók', ''), ...this.accounts.map(a => new Option(a.name + ' · ' + a.email, a.id)));
            choose.value = account;
            this.select();
            this.message('A kijelölt címek hozzáférését mentettük. A beállító hivatkozást külön készítheted el.', true);
        }
        catch (e) {
            if (epoch === this.epoch) {
                this.message(e instanceof Error ? e.message : 'A mentés nem sikerült.');
                this.onError(e);
            }
        }
        finally {
            if (epoch === this.epoch) {
                this.busy = false;
                this.lock(false);
            }
        }
    }
    async issue() { if (!this.org || !this.selected || this.busy || this.dirty)
        return; if (!confirm('Új, egyszer használható ERP-jelszóbeállító hivatkozást készítesz ' + this.selected.email + ' részére? A korábbi, még fel nem használt hivatkozás érvénytelen lesz.'))
        return; const epoch = this.epoch; this.busy = true; this.lock(true); try {
        const result = await this.api.client('client_issue', { organization_id: this.org, account_id: this.selected.id, revision: this.selected.revision, confirmed: true });
        if (epoch !== this.epoch)
            return;
        el('client-link').value = result.url;
        el('client-link-panel').hidden = false;
        const body = 'Kedves ' + this.selected.name + '!\n\nAz alábbi, 24 órán belül egyszer használható hivatkozással állíthatod be a saját Díszkertek ERP-jelszavadat:\n' + result.url + '\n\nHa nem te kérted a hozzáférést vagy a jelszócserét, ne használd a hivatkozást, és jelezd az irodának.\n\nDíszkertek\n+36 70 634 9630';
        el('client-link-email').href = 'mailto:' + encodeURIComponent(result.email) + '?subject=' + encodeURIComponent('Díszkertek – saját ERP-hozzáférés') + '&body=' + encodeURIComponent(body);
        this.message('A hivatkozás elkészült. Csak a megadott ügyfélnek küldd el; 24 óráig, egyszer használható.', true);
    }
    catch (e) {
        if (epoch === this.epoch)
            this.message(e instanceof Error ? e.message : 'A hivatkozás nem készült el.');
    }
    finally {
        if (epoch === this.epoch) {
            this.busy = false;
            this.lock(false);
        }
    } }
    async copyLink() { try {
        await navigator.clipboard.writeText(el('client-link').value);
        this.message('A beállító hivatkozást másoltuk. A címzettnek a saját leveleződben küldd el.', true);
    }
    catch {
        this.message('A másolás nem sikerült. Jelöld ki és másold ki a hivatkozást a mezőből.');
    } }
}
export class ClientPortal {
    api;
    onError;
    epoch = 0;
    owner;
    urls = [];
    poll;
    request = 0;
    busy = false;
    constructor(api, onError) {
        this.api = api;
        this.onError = onError;
        el('client-refresh').addEventListener('click', () => { void this.load(); });
    }
    reset() { this.epoch++; this.request++; this.owner = undefined; this.busy = false; clearInterval(this.poll); this.poll = undefined; this.clear(); el('client-workspace').hidden = true; }
    clear() { for (const u of this.urls)
        URL.revokeObjectURL(u); this.urls = []; el('client-projects').replaceChildren(); el('client-quotes').replaceChildren(); el('client-sites').replaceChildren(); }
    async open(owner) { if (this.owner !== owner) {
        this.reset();
        this.owner = owner;
        this.poll = setInterval(() => { if (!document.hidden && navigator.onLine && !this.busy)
            void this.load(); }, 60000);
    } el('client-workspace').hidden = false; await this.load(); }
    async load() {
        if (!this.owner || this.busy)
            return;
        const epoch = this.epoch, request = ++this.request;
        this.busy = true;
        el('client-portal-feedback').textContent = 'Saját munkák frissítése…';
        try {
            const data = await this.api.client('client_portal');
            if (epoch !== this.epoch || request !== this.request)
                return;
            const opened = new Set(Array.from(el('client-workspace').querySelectorAll('details[data-client-key][open]')).map(d => d.dataset.clientKey));
            this.clear();
            el('client-greeting').textContent = data.name;
            for (const s of data.sites)
                el('client-sites').append(node('li', s.address));
            for (const p of data.projects) {
                const d = document.createElement('details');
                d.className = 'erp-disclosure';
                d.dataset.clientKey = 'project-' + p.id;
                d.open = opened.has(d.dataset.clientKey);
                d.append(node('summary', p.name + ' · ' + (statuses[p.status] ?? 'Egyeztetés alatt')), node('p', p.address));
                if (p.scheduled_date)
                    d.append(node('p', 'Egyeztetett nap: ' + p.scheduled_date));
                if (p.updated_at)
                    d.append(node('small', 'Adatok utolsó módosítása: ' + new Date(p.updated_at).toLocaleString('hu-HU')));
                el('client-projects').append(d);
            }
            if (!data.projects.length)
                el('client-projects').append(node('p', 'A kijelölt címekhez még nincs megjeleníthető munka.'));
            for (const q of data.quotes) {
                const d = document.createElement('details');
                d.className = 'erp-disclosure';
                d.dataset.clientKey = 'quote-' + q.id;
                d.open = opened.has(d.dataset.clientKey);
                d.append(node('summary', q.number + ' · ' + q.title + ' · ' + (statuses[q.status] ?? 'Árajánlat')), node('p', q.customer.address), node('p', 'Bruttó végösszeg: ' + money(q.calculation.gross)));
                d.append(button('Ajánlat PDF-jének előkészítése', () => { void this.pdf(q.id, d, epoch); }));
                const totals = node('p', 'ÁFA vetítési alap: ' + money(q.calculation.tax_base) + ' · ÁFA: ' + money(q.calculation.vat));
                totals.className = 'quote-totals';
                d.append(totals);
                for (const s of q.calculation.sections) {
                    const section = document.createElement('details');
                    section.className = 'erp-disclosure';
                    section.dataset.clientKey = 'quote-' + q.id + '-' + s.name;
                    section.open = opened.has(section.dataset.clientKey);
                    section.append(node('summary', s.name + ' · ' + money(s.net)));
                    for (const l of s.lines)
                        section.append(node('p', l.label + ' · ' + quoteNumber(l.quantity) + ' ' + l.unit + ' · Anyag: ' + money(l.material) + ' · Munkadíj: ' + money(l.labor) + ' · Együtt: ' + money(l.net)));
                    d.append(section);
                }
                if (q.calculation.information)
                    d.append(node('p', q.calculation.information));
                d.append(node('small', 'Kiküldött változat: ' + q.version + ' · ' + new Date(q.date).toLocaleDateString('hu-HU')));
                el('client-quotes').append(d);
            }
            if (!data.quotes.length)
                el('client-quotes').append(node('p', 'Még nincs kiküldött, számodra hozzáférhető ajánlat.'));
            el('client-portal-feedback').textContent = '✓ A saját munkáid adatai naprakészek.';
        }
        catch (e) {
            if (epoch === this.epoch) {
                this.clear();
                el('client-portal-feedback').textContent = e instanceof Error ? e.message : 'A frissítés nem sikerült. Az adatok most nem jeleníthetők meg.';
                this.onError(e);
            }
        }
        finally {
            if (epoch === this.epoch)
                this.busy = false;
        }
    }
    async pdf(id, parent, epoch) { try {
        el('client-portal-feedback').textContent = 'PDF előkészítése…';
        const result = await this.api.client('client_pdf', { quote_id: id });
        if (epoch !== this.epoch || !parent.isConnected)
            return;
        const bytes = Uint8Array.from(atob(result.pdf), c => c.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        this.urls.push(url);
        parent.querySelector('[data-client-pdf]')?.remove();
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        link.textContent = 'PDF letöltése / megnyitása';
        link.dataset.clientPdf = 'true';
        parent.append(link);
        el('client-portal-feedback').textContent = '✓ A PDF elkészült. A hivatkozásra kattintva megnyithatod vagy elmentheted.';
    }
    catch (e) {
        if (epoch === this.epoch) {
            parent.querySelector('[data-client-pdf]')?.remove();
            el('client-portal-feedback').textContent = e instanceof Error ? e.message : 'A PDF nem készíthető el.';
        }
    } }
}
