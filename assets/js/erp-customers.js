const node = (id) => document.getElementById(id);
const searchLength = (value) => Array.from(value.trim().normalize('NFD').replace(/\p{M}/gu, '')).length;
function text(tag, value) { const item = document.createElement(tag); item.textContent = value; return item; }
export class CustomerDirectory {
    api;
    authError;
    startWork;
    startQuote;
    suggestionsOpen = false;
    org;
    epoch = 0;
    request = 0;
    page = 0;
    rows = [];
    selected;
    editing = false;
    creating = false;
    loading = false;
    refreshQueued = false;
    saving = false;
    createRequest;
    createPayload;
    timer;
    newForm = node('customer-new-form');
    profileForm = node('customer-profile-form');
    constructor(api, authError, startWork, startQuote) {
        this.api = api;
        this.authError = authError;
        this.startWork = startWork;
        this.startQuote = startQuote;
        node('show-customers').addEventListener('click', () => this.open());
        node('show-team').addEventListener('click', () => this.team());
        node('customer-new').addEventListener('click', () => this.startNew());
        node('customer-new-cancel').addEventListener('click', () => this.closeForm());
        node('customer-refresh').addEventListener('click', () => { if (!this.busy && !this.dirty)
            void this.load();
        else
            this.message('Előbb mentsd az adatlapot, vagy zárd be a szerkesztést.'); });
        node('customer-previous').addEventListener('click', () => { if (this.page && !this.busy) {
            this.page--;
            void this.load();
        } });
        node('customer-next').addEventListener('click', () => { if (!this.busy) {
            this.page++;
            void this.load();
        } });
        node('customer-include-archived').addEventListener('change', () => { this.page = 0; this.request++; void this.load(); });
        node('customer-search-field').addEventListener('change', () => { this.page = 0; this.request++; this.suggestionsOpen = true; node('customer-list').hidden = true; void this.load(); });
        node('customer-search').addEventListener('input', () => { clearTimeout(this.timer); this.page = 0; this.request++; this.suggestionsOpen = true; node('customer-list').hidden = true; node('customer-search').setAttribute('aria-expanded', 'false'); this.timer = setTimeout(() => { void this.load(); }, 350); });
        node('customer-search').addEventListener('keydown', event => { const key = event.key; if (key === 'Escape') {
            this.suggestionsOpen = false;
            node('customer-list').hidden = true;
            node('customer-search').setAttribute('aria-expanded', 'false');
        } if ((key === 'ArrowDown' || key === 'Enter') && !node('customer-list').hidden) {
            event.preventDefault();
            node('customer-list').querySelector('button')?.focus();
        } });
        node('customer-list').addEventListener('keydown', event => { const key = event.key; const buttons = Array.from(node('customer-list').querySelectorAll('button')); const active = buttons.indexOf(document.activeElement); if (key === 'ArrowDown' || key === 'ArrowUp') {
            event.preventDefault();
            buttons[(active + (key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
        } if (key === 'Escape') {
            this.suggestionsOpen = false;
            node('customer-list').hidden = true;
            node('customer-search').setAttribute('aria-expanded', 'false');
            node('customer-search').focus();
        } });
        this.newForm.addEventListener('input', () => { this.creating = true; });
        this.profileForm.addEventListener('input', () => { this.editing = true; });
        this.newForm.addEventListener('submit', event => { event.preventDefault(); void this.create(); });
        this.profileForm.addEventListener('submit', event => { event.preventDefault(); void this.saveProfile(); });
        window.addEventListener('beforeunload', event => { if (this.dirty || this.saving) {
            event.preventDefault();
            event.returnValue = '';
        } });
        setInterval(() => { if (document.visibilityState === 'visible' && this.org && !node('customer-view').hidden && !this.dirty && !this.busy)
            void this.load(true); }, 30000);
    }
    get dirty() { return this.editing || this.creating; }
    get busy() { return this.saving || this.loading; }
    message(value, kind = '') { const target = node('customer-status'); target.textContent = (kind === 'success' ? '✓ ' : '') + value; target.className = 'office-status ' + kind; }
    reset() { this.epoch++; this.org = undefined; this.rows = []; this.selected = undefined; this.editing = false; this.creating = false; this.createRequest = undefined; this.createPayload = undefined; this.loading = false; this.refreshQueued = false; this.saving = false; this.page = 0; clearTimeout(this.timer); this.newForm.reset(); this.profileForm.reset(); this.unlockNew(); node('customer-list').replaceChildren(); node('customer-pending').replaceChildren(); node('customer-details').replaceChildren(); node('customer-detail-panel').hidden = true; node('customer-list').hidden = true; this.suggestionsOpen = false; node('customer-view').hidden = true; node('customer-new-panel').hidden = true; node('customer-profile-panel').hidden = true; node('customer-status').textContent = ''; node('customer-count').textContent = ''; node('customer-sync-time').textContent = ''; node('customer-search').value = ''; node('customer-include-archived').checked = false; }
    async setOrganization(org) { if (this.org !== org) {
        this.reset();
        this.org = org;
    } node('people-navigation').hidden = !org; if (!org) {
        node('team-view').hidden = false;
        return;
    } if (!node('team-view').hidden || !node('work-view').hidden || !node('quote-view').hidden || !node('prices-view').hidden)
        return; node('customer-view').hidden = false; if (!this.dirty && !this.busy)
        await this.load(); }
    confirmLeave() { return !this.dirty || confirm('A még nem mentett ügyféladatok elvesznek. Folytatod?'); }
    open() { if (this.busy)
        return; node('quote-view').hidden = true; node('prices-view').hidden = true; node('show-quotes').setAttribute('aria-pressed', 'false'); node('show-prices').setAttribute('aria-pressed', 'false'); node('work-view').hidden = true; node('show-works').setAttribute('aria-pressed', 'false'); node('team-view').hidden = true; node('customer-view').hidden = false; node('show-customers').setAttribute('aria-pressed', 'true'); node('show-team').setAttribute('aria-pressed', 'false'); if (this.org)
        void this.load(); }
    team() { if (this.busy || !this.confirmLeave())
        return; node('quote-view').hidden = true; node('prices-view').hidden = true; node('show-quotes').setAttribute('aria-pressed', 'false'); node('show-prices').setAttribute('aria-pressed', 'false'); node('work-view').hidden = true; node('show-works').setAttribute('aria-pressed', 'false'); this.closeForm(true); node('customer-view').hidden = true; node('team-view').hidden = false; node('show-customers').setAttribute('aria-pressed', 'false'); node('show-team').setAttribute('aria-pressed', 'true'); }
    leave() { if (this.busy || !this.confirmLeave())
        return false; this.closeForm(true); return true; }
    closeForm(force = false) { if (this.saving || (!force && !this.confirmLeave()))
        return; this.editing = false; this.creating = false; this.createRequest = undefined; this.createPayload = undefined; this.newForm.reset(); this.unlockNew(); node('customer-new-panel').hidden = true; node('customer-profile-panel').hidden = true; }
    unlockNew() { for (const input of Array.from(this.newForm.querySelectorAll('input,select,textarea')))
        input.disabled = false; this.newForm.querySelector('button[type=submit]').textContent = 'Ügyfél mentése'; }
    startNew() { if (this.busy || !this.confirmLeave())
        return; this.closeForm(true); this.selected = undefined; node('customer-details').replaceChildren(); node('customer-detail-panel').hidden = true; node('customer-new-panel').hidden = false; node('customer-new-panel').open = true; node('customer-name').focus(); }
    async load(silent = false) {
        if (!this.org)
            return;
        if (this.loading || this.saving) {
            this.refreshQueued = true;
            return;
        }
        const epoch = this.epoch;
        const request = ++this.request;
        this.loading = true;
        if (!silent)
            this.message('Ügyféllista betöltése…');
        try {
            const data = await this.api.customers('customers_list', { organization_id: this.org, query: node('customer-search').value, page: this.page, include_archived: node('customer-include-archived').checked, field: node('customer-search-field').value });
            if (epoch !== this.epoch || request !== this.request)
                return;
            if (!Array.isArray(data.rows) || !Array.isArray(data.pending))
                throw new Error('Az ügyféllista válasza hiányos.');
            this.rows = data.rows;
            this.render(data);
            if (!silent)
                this.message('Az ügyféllista naprakész.', 'success');
        }
        catch (error) {
            if (epoch === this.epoch && request === this.request) {
                this.message(error instanceof Error ? error.message : 'Az ügyféllista nem tölthető be.', 'error');
                this.authError(error);
            }
        }
        finally {
            if (epoch === this.epoch) {
                this.loading = false;
                if (this.refreshQueued && !this.saving) {
                    this.refreshQueued = false;
                    void this.load(silent);
                }
            }
        }
    }
    render(data) {
        const list = node('customer-list');
        list.replaceChildren();
        for (const customer of this.rows) {
            const row = document.createElement('li');
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'customer-row';
            button.setAttribute('role', 'option');
            button.setAttribute('aria-selected', String(this.selected?.id === customer.id));
            button.append(text('strong', customer.full_name), text('span', customer.locations.filter(l => l.active).map(l => l.address).join(' · ') || 'Nincs megadott munkavégzési cím'));
            const contact = [customer.details.phone, customer.details.email].filter(Boolean).join(' · ');
            if (contact)
                button.append(text('small', contact));
            if (customer.archived_at)
                button.append(text('small', 'Archivált'));
            if (!customer.active || customer.review_status !== 'approved')
                button.append(text('small', !customer.active ? 'Inaktív' : 'Ellenőrzésre vár'));
            button.addEventListener('click', () => this.show(customer));
            row.append(button);
            list.append(row);
        }
        const ready = searchLength(node('customer-search').value) >= 2;
        if (ready && !this.rows.length)
            list.append(text('li', 'Nincs a keresésnek megfelelő ügyfél.'));
        list.hidden = !ready || !this.suggestionsOpen;
        node('customer-search').setAttribute('aria-expanded', String(!list.hidden));
        node('customer-directory-total').textContent = data.directory_total + ' ügyfél a közös nyilvántartásban · ' + data.archived_total + ' archivált';
        const start = data.total ? data.page * data.page_size + 1 : 0;
        node('customer-count').textContent = ready ? (start + '–' + (start ? start + this.rows.length - 1 : 0) + ' / ' + data.total + ' találat') : 'Írj be legalább 2 karaktert.';
        node('customer-previous').hidden = !ready;
        node('customer-next').hidden = !ready;
        node('customer-previous').disabled = data.page === 0;
        node('customer-next').disabled = (data.page + 1) * data.page_size >= data.total;
        node('customer-sync-time').textContent = 'Frissítve: ' + new Date(data.synced_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
        const pending = node('customer-pending');
        pending.replaceChildren();
        if (data.pending.length)
            pending.append(text('h3', 'Befejezésre váró ügyfélmentések'));
        for (const item of data.pending) {
            const line = document.createElement('div');
            line.className = 'pending-customer';
            line.append(text('span', item.full_name));
            const resume = document.createElement('button');
            resume.type = 'button';
            resume.className = 'quiet';
            resume.textContent = 'Mentés folytatása';
            resume.addEventListener('click', () => { void this.resume(item.request_id); });
            line.append(resume);
            pending.append(line);
        }
        if (this.selected && !this.dirty) {
            const fresh = this.rows.find(c => c.id === this.selected.id);
            if (fresh)
                this.show(fresh, true);
        }
    }
    show(customer, force = false) {
        if (!force && (this.saving || !this.confirmLeave()))
            return;
        const detailOpen = node('customer-detail-panel').open;
        const profileOpen = node('customer-profile-panel').open;
        this.closeForm(true);
        this.selected = customer;
        node('customer-detail-panel').hidden = false;
        node('customer-detail-panel').open = force ? detailOpen : true;
        node('customer-detail-title').textContent = customer.full_name;
        if (!force) {
            node('customer-search').value = customer.full_name;
            this.suggestionsOpen = false;
            node('customer-list').hidden = true;
            node('customer-search').setAttribute('aria-expanded', 'false');
        }
        const panel = node('customer-details');
        panel.replaceChildren();
        if (this.startQuote && customer.active && customer.review_status === 'approved' && !customer.archived_at) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'quiet';
            button.textContent = 'Új árajánlat ehhez az ügyfélhez';
            button.addEventListener('click', () => { if (this.leave())
                this.startQuote(customer.id, customer.full_name); });
            panel.append(button);
        }
        if (this.startWork && customer.active && customer.review_status === 'approved' && !customer.archived_at) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'quiet';
            button.textContent = 'Új munka / igény ehhez az ügyfélhez';
            button.addEventListener('click', () => { if (this.leave())
                this.startWork(customer.id, customer.full_name); });
            panel.append(button);
        }
        const terms = { 'Típus': customer.details.customer_type ?? '', 'Kapcsolattartó': customer.details.contact_name ?? '', 'Telefon': customer.details.phone ?? '', 'E-mail': customer.details.email ?? '', 'Adószám': customer.details.tax_number ?? '' };
        const details = document.createElement('dl');
        for (const [label, value] of Object.entries(terms))
            if (value) {
                details.append(text('dt', label), text('dd', value));
            }
        panel.append(details);
        const addressFold = document.createElement('details');
        addressFold.className = 'erp-disclosure';
        addressFold.append(text('summary', 'Munkavégzési címek (' + customer.locations.length + ')'));
        const addresses = document.createElement('ul');
        for (const address of customer.locations)
            addresses.append(text('li', address.address + (address.active ? '' : ' · Inaktív')));
        if (!customer.locations.length)
            addresses.append(text('li', 'Nincs megadott cím.'));
        addressFold.append(addresses);
        panel.append(addressFold);
        const contacts = customer.contacts.filter(c => c.active !== false);
        if (contacts.length) {
            const contactFold = document.createElement('details');
            contactFold.className = 'erp-disclosure';
            contactFold.append(text('summary', 'További kapcsolattartók (' + contacts.length + ')'));
            for (const c of contacts)
                contactFold.append(text('p', [c.contact_name, c.phone, c.email].filter(Boolean).join(' · ')));
            panel.append(contactFold);
        }
        if (customer.details.notes) {
            const notesFold = document.createElement('details');
            notesFold.className = 'erp-disclosure';
            notesFold.append(text('summary', 'Ügyfélmegjegyzés'), text('p', customer.details.notes));
            panel.append(notesFold);
        }
        node('customer-billing-name').value = customer.profile.billing_name || '';
        node('customer-billing-address').value = customer.profile.billing_address || '';
        node('customer-internal-notes').value = customer.profile.internal_notes || '';
        node('customer-profile-panel').hidden = false;
        node('customer-profile-panel').open = force ? profileOpen : false;
        this.editing = false;
    }
    payload() { const data = new FormData(this.newForm); return Object.fromEntries(['full_name', 'address', 'customer_type', 'contact_name', 'email', 'phone', 'tax_number', 'billing_name', 'billing_address', 'internal_notes'].map(key => [key, String(data.get(key) ?? '')])); }
    async create() {
        if (!this.org || this.busy)
            return;
        const epoch = this.epoch;
        const payload = this.createPayload ?? this.payload();
        this.createPayload = payload;
        this.createRequest ??= crypto.randomUUID();
        this.saving = true;
        this.message('Ügyfél mentése a közös listába…');
        try {
            await this.api.customers('customer_create', { organization_id: this.org, request_id: this.createRequest, payload });
            if (epoch !== this.epoch)
                return;
            this.creating = false;
            this.createRequest = undefined;
            this.createPayload = undefined;
            this.newForm.reset();
            this.unlockNew();
            node('customer-new-panel').hidden = true;
            this.saving = false;
            this.page = 0;
            node('customer-search').value = String(payload.full_name);
            await this.load();
            this.message('Az új ügyfelet és címét elmentettük a közös listába.', 'success');
        }
        catch (error) {
            if (epoch === this.epoch) {
                const status = error && typeof error === 'object' && 'status' in error ? error.status : 0;
                if (status === 409 || status === 422) {
                    this.createRequest = undefined;
                    this.createPayload = undefined;
                    this.unlockNew();
                }
                else {
                    for (const input of Array.from(this.newForm.querySelectorAll('input,select,textarea')))
                        input.disabled = true;
                    this.newForm.querySelector('button[type=submit]').textContent = 'Mentés folytatása';
                }
                this.message(error instanceof Error ? error.message : 'A mentés nem sikerült.', 'error');
                this.authError(error);
            }
        }
        finally {
            if (epoch === this.epoch)
                this.saving = false;
        }
    }
    async resume(requestId) {
        if (!this.org || this.busy || !this.confirmLeave())
            return;
        const epoch = this.epoch;
        this.saving = true;
        this.message('A megkezdett ügyfélmentés folytatása…');
        try {
            await this.api.customers('customer_resume', { organization_id: this.org, request_id: requestId });
            if (epoch !== this.epoch)
                return;
            this.saving = false;
            this.closeForm(true);
            await this.load();
            this.message('Az ügyfél mentése befejeződött.', 'success');
        }
        catch (error) {
            if (epoch === this.epoch) {
                this.message(error instanceof Error ? error.message : 'A mentés nem fejeződött be.', 'error');
                this.authError(error);
            }
        }
        finally {
            if (epoch === this.epoch)
                this.saving = false;
        }
    }
    async saveProfile() {
        if (!this.org || !this.selected || this.busy)
            return;
        const epoch = this.epoch;
        this.saving = true;
        this.message('Számlázási kiegészítés mentése…');
        try {
            await this.api.rpc('erp_customer_profile_save', { p_org: this.org, p_customer: this.selected.id, p_revision: this.selected.profile.revision, p_billing_name: node('customer-billing-name').value, p_billing_address: node('customer-billing-address').value, p_notes: node('customer-internal-notes').value });
            if (epoch !== this.epoch)
                return;
            this.editing = false;
            this.saving = false;
            await this.load();
            this.message('A számlázási kiegészítést és a belső megjegyzést mentettük.', 'success');
        }
        catch (error) {
            if (epoch === this.epoch) {
                this.message(error instanceof Error ? error.message : 'A kiegészítés mentése nem sikerült.', 'error');
                this.authError(error);
            }
        }
        finally {
            if (epoch === this.epoch)
                this.saving = false;
        }
    }
}
