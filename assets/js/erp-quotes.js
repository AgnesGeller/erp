const { calculateQuote } = await import(new URL('./erp-quote-engine.js?v=0.3.0', import.meta.url).href);
const el = (id) => document.getElementById(id);
const labels = { draft: 'Piszkozat', ready: 'Elkészült, kiküldésre vár', sent: 'Kiküldött', accepted: 'Elfogadott', rejected: 'Elutasított', withdrawn: 'Visszavont' };
const eventNames = { save: 'Mentés', ready: 'Elkészültnek jelölve', draft: 'Visszaállítva szerkesztésre', revise: 'Revízió indítva', accept: 'Árajánlat elfogadva', reject: 'Ajánlat elutasítva', withdraw: 'Ajánlat visszavonva', start: 'Kertépítés elindítva', mail_processing: 'Kiküldési rögzítés', mail_sent: 'Kiküldés visszaigazolva', manual_send_confirmed: 'Kézi kiküldés irodai visszaigazolása' };
const modes = { excel: 'Excel: mennyiség × második mennyiség', area: 'Terület: hossz × szélesség', volume: 'Térfogat: hossz × szélesség × cm / 100', density: 'Növény: terület × db/m², felfelé kerekítve', layered: 'Réteges: terület × (alapár + cm-felár)', custom: 'Egyedi paraméterek és matematikai képlet' };
const uuid = () => crypto.randomUUID();
const money = (v) => v === null || v === undefined ? 'Nem számítható' : Number(v).toLocaleString('hu-HU', { maximumFractionDigits: 2 }) + ' Ft';
function n(tag, value = '') { const item = document.createElement(tag); item.textContent = value; return item; }
function button(label, run) { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.className = 'quiet'; b.addEventListener('click', run); return b; }
function input(parent, label, value, change, kind = 'text', max = 200) { const l = n('label', label), field = document.createElement(kind === 'textarea' ? 'textarea' : 'input'); field.value = String(value ?? ''); if (kind !== 'textarea')
    field.type = kind; field.maxLength = max; if (kind === 'number') {
    field.min = '0';
    field.step = 'any';
} if (kind === 'textarea')
    field.rows = 3; field.addEventListener('input', () => change(field.value)); l.append(field); parent.append(l); return field; }
function select(parent, label, value, options, change) { const l = n('label', label), field = document.createElement('select'); for (const [v, title] of options)
    field.add(new Option(title, v)); field.value = value; field.addEventListener('change', () => change(field.value)); l.append(field); parent.append(l); return field; }
function fold(parent, title, open = false) { const d = document.createElement('details'); d.className = 'erp-disclosure'; d.open = open; d.append(n('summary', title)); parent.append(d); return d; }
function fieldsFor(t) { return t.mode === 'custom' ? (t.fields ?? []).map((f) => [f.key, f.label + ' (' + f.unit + ')']) : t.mode === 'excel' ? [['q1', 'Mennyiség (' + t.unit + ')'], ...(t.unit2 ? [['q2', 'Második mennyiség (' + t.unit2 + ')']] : [])] : [['length', 'Hossz (m)'], ['width', 'Szélesség (m)'], ...(t.mode === 'layered' || t.mode === 'volume' ? [['thickness', 'Vastagság (cm)']] : []), ...(t.mode === 'density' ? [['density', 'Növénysűrűség (db/m²)']] : [])]; }
export class QuoteDesk {
    api;
    authError;
    chooseCustomer;
    completed;
    org;
    epoch = 0;
    edit = 0;
    changed = false;
    catalogChanged = false;
    loading = false;
    saving = false;
    timer;
    book;
    bookRevision = 0;
    input;
    current;
    customer;
    sites = [];
    pending;
    rows = [];
    output;
    objectUrl;
    mailRequest;
    typeId = '';
    templateId = '';
    constructor(api, authError, chooseCustomer, completed) {
        this.api = api;
        this.authError = authError;
        this.chooseCustomer = chooseCustomer;
        this.completed = completed;
        el('show-quotes').addEventListener('click', () => { void this.open(); });
        el('show-prices').addEventListener('click', () => { void this.open(true); });
        el('quote-new').addEventListener('click', () => { if (this.leave())
            this.chooseCustomer(); });
        el('quote-refresh').addEventListener('click', () => { if (!this.dirty && !this.busy)
            void this.list();
        else
            this.message('Előbb mentsd vagy fejezd be a szerkesztést.'); });
        el('quote-search').addEventListener('input', () => this.renderList());
        el('quote-status-filter').addEventListener('change', () => this.renderList());
        el('quote-material-export').addEventListener('click', () => this.exportMaterials());
        el('quote-save').addEventListener('click', () => { void this.save(); });
        el('quote-add-section').addEventListener('click', () => { if (!this.input || !this.editable)
            return; this.input.sections.push({ id: uuid(), name: '', area: '', length: '', width: '', lines: [] }); this.touch(); this.renderSections(); });
        for (const [id, key] of [['quote-title', 'title'], ['quote-vat', 'vat'], ['quote-hourly', 'hourly_rate'], ['quote-information', 'information']])
            el(id).addEventListener('input', () => { if (this.input) {
                this.input[key] = el(id).value;
                this.touch();
            } });
        el('quote-location').addEventListener('change', () => { if (this.input) {
            this.input.location_id = el('quote-location').value;
            this.touch();
        } });
        el('quote-preview').addEventListener('click', () => { void this.pdf(false); });
        el('quote-download').addEventListener('click', () => { void this.pdf(true); });
        el('quote-pdf-close').addEventListener('click', () => el('quote-pdf-dialog').close());
        el('quote-pdf-mode').addEventListener('change', () => { void this.pdf(false); });
        el('quote-mail').addEventListener('click', () => this.mail());
        el('quote-mail-close').addEventListener('click', () => { if (!this.busy)
            el('quote-mail-dialog').close(); });
        el('quote-mail-form').addEventListener('submit', e => { e.preventDefault(); void this.manualSent(); });
        for (const id of ['quote-mail-to', 'quote-mail-subject', 'quote-mail-body'])
            el(id).addEventListener('input', () => this.mailLink());
        el('price-import').addEventListener('click', () => { void this.importExcel(); });
        el('price-save').addEventListener('click', () => { void this.saveBook(); });
        el('price-type').addEventListener('change', () => { this.typeId = el('price-type').value; this.renderType(); });
        el('price-new-type').addEventListener('click', () => { if (!this.book)
            return; const t = this.blankType(); this.book.types.push(t); this.typeId = t.id; this.catalogChanged = true; this.renderBook(); });
        el('price-template').addEventListener('change', () => { this.templateId = el('price-template').value; this.renderTemplate(); });
        el('price-new-template').addEventListener('click', () => { if (!this.book)
            return; const t = { id: uuid(), name: '', lines: [] }; this.book.templates.push(t); this.templateId = t.id; this.catalogChanged = true; this.renderBook(); });
        el('price-info-new').addEventListener('click', () => { this.book?.info_templates.push({ id: uuid(), name: '', body: '' }); this.catalogChanged = true; this.renderInfo(); });
        el('quote-info-template').addEventListener('change', () => { if (!this.input || !this.editable)
            return; const t = this.book?.info_templates.find((v) => v.id === el('quote-info-template').value); if (t) {
            this.input.information = [this.input.information, t.body].filter(Boolean).join('\n\n');
            el('quote-information').value = this.input.information;
            this.touch();
        } el('quote-info-template').value = ''; });
        window.addEventListener('beforeunload', e => { if (this.dirty || this.busy) {
            e.preventDefault();
            e.returnValue = '';
        } });
        window.addEventListener('focus', () => { if (this.org && !el('quote-view').hidden && !this.dirty && !this.busy)
            void this.list(true); });
    }
    get dirty() { return this.changed || this.catalogChanged || !!this.pending; }
    get busy() { return this.loading || this.saving; }
    get editable() { return !this.current || this.current.quote.status === 'draft'; }
    message(value, kind = '') { const target = el(!el('prices-view').hidden ? 'price-feedback' : 'quote-feedback'); target.textContent = (kind === 'success' ? '✓ ' : '') + value; target.className = 'office-status ' + kind; }
    error(error) { this.message(error instanceof Error ? error.message : 'A művelet nem sikerült.', 'error'); this.authError(error); }
    reset() { this.epoch++; clearTimeout(this.timer); this.org = undefined; this.changed = false; this.catalogChanged = false; this.loading = false; this.saving = false; this.input = undefined; this.current = undefined; this.pending = undefined; this.book = undefined; this.customer = undefined; this.rows = []; this.sites = []; this.bookRevision = 0; this.mailRequest = undefined; for (const id of ['quote-view', 'prices-view', 'quote-editor'])
        el(id).hidden = true; for (const id of ['quote-list', 'quote-sections', 'price-type-editor', 'price-template-editor', 'price-info-editor', 'quote-history', 'quote-actions'])
        el(id).replaceChildren(); for (const id of ['quote-pdf-dialog', 'quote-mail-dialog'])
        el(id).close(); if (this.objectUrl)
        URL.revokeObjectURL(this.objectUrl); this.objectUrl = undefined; el('quote-pdf-frame').src = 'about:blank'; }
    setOrganization(org) { if (this.org !== org) {
        this.reset();
        this.org = org;
    } }
    leave() { if (this.busy)
        return false; if (this.dirty && !confirm('A még nem mentett ajánlati vagy árlista-módosítások elvesznek. Folytatod?'))
        return false; clearTimeout(this.timer); this.changed = false; this.catalogChanged = false; this.pending = undefined; this.input = undefined; this.current = undefined; this.book = undefined; el('quote-editor').hidden = true; return true; }
    async open(prices = false, refresh = true) { if (!this.org)
        return; for (const id of ['customer-view', 'team-view', 'work-view'])
        el(id).hidden = true; el('quote-view').hidden = prices; el('prices-view').hidden = !prices; for (const name of ['customers', 'team', 'works', 'quotes', 'prices'])
        el('show-' + name).setAttribute('aria-pressed', String(name === (prices ? 'prices' : 'quotes'))); if (refresh && !this.busy) {
        if (prices)
            await this.loadBook();
        else
            await this.list();
    } }
    async loadBook() { if (!this.org)
        return; const epoch = this.epoch; this.loading = true; try {
        const data = await this.api.customers('quote_catalog', { organization_id: this.org });
        if (epoch !== this.epoch)
            return;
        if (!data.book)
            throw Error('Az árlista még nincs feltöltve.');
        this.book = data.book.document;
        this.bookRevision = data.book.revision;
        this.renderBook();
    }
    catch (e) {
        if (epoch === this.epoch)
            this.error(e);
    }
    finally {
        if (epoch === this.epoch)
            this.loading = false;
    } }
    async selectCustomer(id, name) { if (!this.org || !this.leave())
        return; await this.open(false, false); const epoch = this.epoch; this.loading = true; this.message('Ügyféladatok és árlista betöltése…'); try {
        const [context, catalog] = await Promise.all([this.api.customers('quote_context', { organization_id: this.org, customer_id: id }), this.api.customers('quote_catalog', { organization_id: this.org })]);
        if (epoch !== this.epoch)
            return;
        if (!catalog.book)
            throw Error('Az árlista még nincs feltöltve.');
        this.book = catalog.book.document;
        this.bookRevision = catalog.book.revision;
        this.customer = { name: context.customer_name, ...context };
        this.sites = context.sites;
        this.input = { title: '', customer_id: id, location_id: this.sites.length === 1 ? this.sites[0].id : '', vat: '0', hourly_rate: '', information: '', sections: [] };
        this.current = undefined;
        this.renderEditor();
        this.message(this.sites.length ? 'Válaszd ki a címet, és add meg az ajánlat megnevezését.' : 'Az ügyfélhez nincs aktív, jóváhagyott munkavégzési cím.');
    }
    catch (e) {
        if (epoch === this.epoch)
            this.error(e);
    }
    finally {
        if (epoch === this.epoch)
            this.loading = false;
    } }
    async list(silent = false) { if (!this.org || this.busy)
        return; const epoch = this.epoch; this.loading = true; try {
        this.rows = await this.api.customers('quote_list', { organization_id: this.org });
        if (epoch !== this.epoch)
            return;
        this.renderList();
        if (!silent)
            this.message('Az ajánlatlista naprakész.', 'success');
    }
    catch (e) {
        if (epoch === this.epoch)
            this.error(e);
    }
    finally {
        if (epoch === this.epoch)
            this.loading = false;
    } }
    renderList() { const list = el('quote-list'); list.replaceChildren(); const query = el('quote-search').value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase(); const state = el('quote-status-filter').value; for (const q of this.rows.filter(q => (!state || q.status === state) && [q.number, q.title, q.customer_name, q.address].join(' ').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().includes(query))) {
        const b = button('', () => { void this.loadQuote(q.id); });
        b.className = 'customer-row';
        b.append(n('strong', q.number + ' · ' + q.title), n('span', q.customer_name + ' · ' + q.address), n('small', labels[q.status] + ' · ' + money(q.gross)));
        list.append(b);
    } if (!list.children.length)
        list.append(n('p', 'Nincs megjeleníthető árajánlat.')); }
    async loadQuote(id, preserve = false) { if (!this.org || (!preserve && !this.leave()))
        return; const epoch = this.epoch; this.loading = true; try {
        const [saved, catalog] = await Promise.all([this.api.customers('quote_get', { organization_id: this.org, quote_id: id }), this.api.customers('quote_catalog', { organization_id: this.org })]);
        if (epoch !== this.epoch)
            return;
        this.current = saved;
        this.book = catalog.book.document;
        this.bookRevision = catalog.book.revision;
        const v = saved.versions.find((v) => v.version === saved.quote.current_version);
        if (!preserve) {
            this.input = structuredClone(v.input);
            this.customer = v.customer;
            this.sites = [{ id: saved.quote.source_location_id, address: v.customer.address }];
            this.changed = false;
        }
        this.renderEditor();
        this.message('Az ajánlat betöltve.', 'success');
    }
    catch (e) {
        if (epoch === this.epoch)
            this.error(e);
    }
    finally {
        if (epoch === this.epoch)
            this.loading = false;
    } }
    touch() { this.edit++; this.changed = true; this.calculate(); clearTimeout(this.timer); if (this.current?.quote.status === 'draft' && !this.pending)
        this.timer = setTimeout(() => { if (!this.busy)
            void this.save(true); }, 2500); }
    calculate() { if (!this.input)
        return; try {
        this.output = calculateQuote(this.input);
        for (const field of Array.from(el('quote-sections').querySelectorAll('input[data-quote-param]'))) {
            for (const section of this.input.sections) {
                const line = section.lines.find((l) => l.id === field.dataset.lineId);
                if (!line)
                    continue;
                const key = field.dataset.quoteParam;
                let value = line.params[key] ?? '';
                if (line.inherit) {
                    if (key === 'q1' && line.pricing.mode === 'excel' && ['m²', 'm2'].includes(line.pricing.unit)) {
                        const result = this.output.sections.flatMap((s) => s.lines).find((r) => r.id === line.id);
                        value = result && !result.incomplete ? result.quantity : section.area ?? '';
                    }
                    else if (key === 'length' || key === 'width')
                        value = section[key] ?? '';
                }
                if (field !== document.activeElement)
                    field.value = String(value);
            }
        }
        el('quote-totals').textContent = this.output.issues.length ? 'Az ajánlat még nem teljes.' : 'Anyag: ' + money(this.output.material) + ' · Munkadíj: ' + money(this.output.labor) + ' · ÁFA vetítési alap: ' + money(this.output.tax_base) + ' · Bruttó: ' + money(this.output.gross);
        el('quote-issues').replaceChildren(...this.output.issues.map((x) => n('li', x)));
        const details = el('quote-calculation-details');
        details.replaceChildren();
        for (const section of this.output.sections) {
            const d = fold(details, section.name);
            for (const line of section.lines) {
                if (line.incomplete)
                    continue;
                d.append(n('p', line.label + ' · ' + Number(line.quantity).toLocaleString('hu-HU') + ' ' + line.unit + ' · Anyag egységára: ' + money(line.material_unit) + ' · Munka egységára: ' + money(line.labor_unit) + ' · Anyag: ' + money(line.material) + ' · Munkadíj: ' + money(line.labor) + ' · Együtt: ' + money(line.net) + (line.planned_minutes ? ' · Tervezett emberperc: ' + Number(line.planned_minutes).toLocaleString('hu-HU') : '')));
                for (const m of line.materials)
                    d.append(n('p', m.name + ' · Beépítendő: ' + Number(m.installed).toLocaleString('hu-HU') + ' ' + m.unit + ' · Beszerzendő: ' + Number(m.purchase).toLocaleString('hu-HU') + ' ' + m.unit + (m.trips ? ' · Fuvar: ' + m.trips : '') + ' · Belső beszerzési érték: ' + money(m.purchase_cost)));
            }
        }
    }
    catch (e) {
        this.output = undefined;
        el('quote-totals').textContent = 'Az ajánlat még nem számítható.';
        el('quote-issues').replaceChildren(n('li', e instanceof Error ? e.message : 'Ellenőrizd a mezőket.'));
    } }
    renderEditor() { if (!this.input)
        return; el('quote-editor').hidden = false; el('quote-editor-title').textContent = (this.current?.quote.number ?? 'Új árajánlat') + ' · ' + (this.customer?.name ?? ''); for (const [id, key] of [['quote-title', 'title'], ['quote-vat', 'vat'], ['quote-hourly', 'hourly_rate'], ['quote-information', 'information']])
        el(id).value = String(this.input[key] ?? ''); const address = el('quote-location'); address.replaceChildren(new Option('Válassz munkavégzési címet', '')); for (const site of this.sites)
        address.add(new Option(site.address, site.id)); address.value = this.input.location_id; address.disabled = !!this.current; el('quote-fields').disabled = !this.editable; el('quote-save').disabled = !this.editable; el('quote-add-section').disabled = !this.editable; const infos = el('quote-info-template'); infos.replaceChildren(new Option('Válassz információsablont', '')); for (const t of this.book?.info_templates ?? [])
        infos.add(new Option(t.name, t.id)); this.renderSections(); this.calculate(); this.renderActions(); this.renderHistory(); }
    blankType() { return { id: uuid(), name: '', category: 'Egyéb', unit: 'db', unit2: '', mode: 'excel', main: '', auxiliary: '0', transport: '0', labor: '', material_cm: '0', labor_cm: '0', material_min: '0', labor_min: '0', total_min: '0', materials: [], defaults: {}, internal_info: '' }; }
    pricing(parent, t, change) { for (const [key, label] of [['main', 'Főanyag egységára (Ft)'], ['auxiliary', 'Segédanyag egységára (Ft)'], ['transport', 'Szállítás egységára (Ft)'], ['labor', 'Munka egységára (Ft)'], ...(t.mode === 'layered' ? [['material_cm', 'Anyag felára Ft/cm'], ['labor_cm', 'Munkadíj felára Ft/cm']] : []), ['material_min', 'Anyagminimum (Ft)'], ['labor_min', 'Munkadíjminimum (Ft)'], ['total_min', 'Teljes tételminimum (Ft)']])
        input(parent, label, t[key], v => { t[key] = v; change(); }, 'number'); select(parent, 'Teljes minimum kiegészítésének helye – ha szükséges', t.total_min_target ?? '', [['', 'Válassz bontást'], ['material', 'Anyagköltség'], ['labor', 'Munkadíj']], v => { t.total_min_target = v; change(); }); }
    typePicker(parent, current, chosen) { const types = this.book?.types ?? []; let category = types.find((t) => t.id === current)?.category ?? ''; select(parent, 'Kategória', category, [['', 'Válassz kategóriát'], ...Array.from(new Set(types.map((t) => t.category))).sort((a, b) => a.localeCompare(b, 'hu')).map(c => [c, c])], v => { category = v; rebuild(); }); const typ = select(parent, 'Típus', current, [], id => { const t = types.find((t) => t.id === id); if (t)
        chosen(t); }); const rebuild = () => { typ.replaceChildren(new Option('Válassz típust', '')); for (const t of types.filter((t) => t.category === category).sort((a, b) => a.name.localeCompare(b.name, 'hu')))
        typ.add(new Option(t.name, t.id)); typ.value = current; }; rebuild(); }
    renderSections() {
        const container = el('quote-sections');
        const opened = new Set(Array.from(container.querySelectorAll('details[data-section][open]')).map(d => d.dataset.section));
        container.replaceChildren();
        if (!this.input)
            return;
        for (const section of this.input.sections) {
            const d = fold(container, section.name || 'Főtétel megnevezése szükséges', opened.has(section.id) || this.input.sections.length === 1);
            d.dataset.section = section.id;
            const field = document.createElement('fieldset');
            field.disabled = !this.editable;
            d.append(field);
            input(field, 'Főtétel megnevezése', section.name, v => { section.name = v; d.querySelector('summary').textContent = v || 'Főtétel megnevezése szükséges'; this.touch(); });
            const dimensions = fold(field, 'Főtétel méretei');
            for (const [key, label] of [['area', 'Terület (m²)'], ['length', 'Hossz (m)'], ['width', 'Szélesség (m)']])
                input(dimensions, label, section[key], v => { section[key] = v; this.touch(); }, 'number');
            select(field, 'Munkasablon', '', [['', 'Válassz sablont'], ...(this.book?.templates ?? []).map((t) => [t.id, t.name])], id => { const t = this.book?.templates.find((v) => v.id === id); if (t) {
                for (const l of t.lines) {
                    const type = this.book?.types.find((v) => v.id === l.type_id);
                    section.lines.push({ id: uuid(), type_id: l.type_id, pricing: type ? structuredClone(type) : null, unresolved: l.unresolved, params: { ...(type?.defaults ?? {}), ...l.params }, inherit: !!type && ['m²', 'm2'].includes(type.unit), enabled: !l.optional });
                }
                this.touch();
                this.renderSections();
            } });
            const add = fold(field, 'Árlistás tétel hozzáadása');
            this.typePicker(add, '', t => { section.lines.push({ id: uuid(), type_id: t.id, pricing: structuredClone(t), params: { ...t.defaults }, inherit: false, enabled: true, public_note: '' }); this.touch(); this.renderSections(); });
            field.append(button('+ Egyedi tétel', () => { section.lines.push({ id: uuid(), pricing: this.blankType(), params: {}, inherit: false, enabled: true, public_note: '' }); this.touch(); this.renderSections(); }));
            for (const line of section.lines) {
                const l = fold(field, line.unresolved ? 'Pontosítandó: ' + line.unresolved : (line.pricing?.category + ' – ' + line.pricing?.name));
                const included = n('label', 'Tétel szerepeljen az ajánlatban'), check = document.createElement('input');
                check.type = 'checkbox';
                check.checked = line.enabled !== false;
                check.className = 'inline-check';
                check.addEventListener('change', () => { line.enabled = check.checked; this.touch(); });
                included.prepend(check);
                l.append(included);
                if (line.unresolved) {
                    this.typePicker(l, '', t => { line.pricing = structuredClone(t); line.type_id = t.id; line.unresolved = ''; line.params = { ...t.defaults }; this.touch(); this.renderSections(); });
                }
                else {
                    const t = line.pricing;
                    if (!line.type_id) {
                        for (const [key, label] of [['name', 'Tétel megnevezése'], ['category', 'Kategória'], ['unit', 'Mértékegység']])
                            input(l, label, t[key], v => { t[key] = v; this.touch(); });
                    }
                    if (['m²', 'm2'].includes(t.unit) || t.mode !== 'excel') {
                        const label = n('label', 'Főtétel méreteinek átvétele'), c = document.createElement('input');
                        c.type = 'checkbox';
                        c.className = 'inline-check';
                        c.dataset.inherit = 'true';
                        c.checked = line.inherit === true;
                        c.addEventListener('change', () => { line.inherit = c.checked; this.touch(); });
                        label.prepend(c);
                        l.append(label);
                    }
                    for (const [key, label] of fieldsFor(t)) {
                        const field = input(l, label, line.params[key], v => { line.params[key] = v; line.inherit = false; const check = l.querySelector('input[data-inherit]'); if (check)
                            check.checked = false; this.touch(); }, 'number');
                        field.dataset.quoteParam = key;
                        field.dataset.lineId = line.id;
                    }
                    this.pricing(fold(l, 'Ajánlati egységárak és minimumdíjak'), t, () => this.touch());
                    this.materials(fold(l, 'Anyagjegyzék és belső beszerzési adatok'), t, () => this.touch());
                    input(l, 'Egyéb megjegyzés – az ügyfél is látja', line.public_note, v => { line.public_note = v; this.touch(); }, 'textarea', 4000);
                    fold(l, 'Hasznos információk – belső munkautasítás').append(n('p', t.internal_info || 'Ehhez a típushoz nincs belső munkautasítás.'));
                }
                l.append(button('Tétel kivétele', () => { if (confirm('Kiveszed ezt a tételt a szerkesztett ajánlatból?')) {
                    section.lines = section.lines.filter((v) => v.id !== line.id);
                    this.touch();
                    this.renderSections();
                } }));
            }
            field.append(button('Főtétel kivétele', () => { if (confirm('Kiveszed ezt a főtételt és sorait a szerkesztett ajánlatból?')) {
                this.input.sections = this.input.sections.filter((s) => s.id !== section.id);
                this.touch();
                this.renderSections();
            } }));
        }
    }
    materials(parent, t, change) { const render = () => { parent.querySelectorAll(':scope > div').forEach(v => v.remove()); const box = document.createElement('div'); for (const m of t.materials) {
        const d = fold(box, m.name || 'Anyag megnevezése szükséges');
        for (const [key, label, kind] of [['name', 'Anyagnév', 'text'], ['factor', 'Szükséges mennyiség egységnyi alapra', 'number'], ['unit', 'Mértékegység', 'text'], ['waste', 'Ráhagyás (%)', 'number'], ['pack', 'Csomagméret – 0: nincs', 'number'], ['capacity', 'Egy fuvar kapacitása – 0: nincs', 'number'], ['unit_price', 'Belső beszerzési egységár (Ft)', 'number'], ['supplier', 'Beszerzési hely / beszállító', 'text']])
            input(d, label, m[key], v => { m[key] = v; change(); }, kind);
        input(d, 'Egyedi anyagmennyiség-képlet – elhagyható', m.quantity_formula, v => { m.quantity_formula = v; change(); }, 'text', 300);
        select(d, 'Számítás alapja', m.basis, [['quantity', 'Tétel számított mennyisége'], ['area', 'Terület (m²)'], ['volume', 'Térfogat (m³)'], ['length', 'Hossz (m)'], ['count', 'Darabszám']], v => { m.basis = v; change(); });
        select(d, 'Beszerzés felelőse', m.owner ?? 'workers', [['workers', 'Kivitelezők szerzik be'], ['office', 'Iroda szerzi be – telephelyen átvehető']], v => { m.owner = v; change(); });
        d.append(button('Anyag kivétele', () => { t.materials = t.materials.filter((v) => v !== m); change(); render(); }));
    } box.append(button('+ Anyag hozzáadása', () => { t.materials.push({ name: '', unit: '', factor: '1', basis: 'quantity', waste: '0', pack: '0', capacity: '0', unit_price: '0', supplier: '', owner: 'workers' }); change(); render(); })); parent.append(box); }; render(); }
    async save(automatic = false) { if (!this.org || !this.input || this.busy || !this.editable)
        return; clearTimeout(this.timer); const epoch = this.epoch; this.pending ??= { edit: this.edit, request_id: uuid(), quote_id: this.current?.quote.id ?? null, revision: this.current?.quote.revision ?? 0, payload: structuredClone(this.input) }; const edit = this.pending.edit; this.saving = true; if (!automatic)
        this.message('Ajánlat mentése…'); try {
        const id = this.pending.result ?? await this.api.customers('quote_save', { organization_id: this.org, ...this.pending });
        if (epoch !== this.epoch)
            return;
        this.pending.result = id;
        const saved = await this.api.customers('quote_get', { organization_id: this.org, quote_id: id });
        if (epoch !== this.epoch)
            return;
        this.current = saved;
        this.pending = undefined;
        if (edit === this.edit)
            this.changed = false;
        this.renderActions();
        this.renderHistory();
        el('quote-editor-title').textContent = saved.quote.number + ' · ' + (this.customer?.name ?? '');
        this.message(automatic ? 'Automatikus mentés kész.' : 'Az ajánlatot mentettük.', 'success');
    }
    catch (e) {
        if (epoch === this.epoch) {
            const status = e && typeof e === 'object' && 'status' in e ? e.status : 0;
            if (status === 422 || status === 403)
                this.pending = undefined;
            this.error(e);
        }
    }
    finally {
        if (epoch === this.epoch) {
            this.saving = false;
            if (this.changed && !this.pending && this.current?.quote.status === 'draft' && edit !== this.edit)
                this.timer = setTimeout(() => { void this.save(true); }, 2500);
        }
    } }
    renderActions() { const actions = el('quote-actions'); actions.replaceChildren(); if (!this.current)
        return; const q = this.current.quote; actions.append(n('p', labels[q.status] + ' · ' + q.current_version + '. változat')); const add = (label, transition) => actions.append(button(label, () => { void this.transition(transition); })); if (q.status === 'draft')
        add('Elkészült, kiküldésre vár', 'ready'); if (q.status === 'ready')
        add('Vissza szerkesztésre', 'draft'); if (q.status === 'sent') {
        add('Árajánlat elfogadva', 'accept');
        add('Árajánlat elutasítva', 'reject');
        add('Új revízió készítése', 'revise');
    } if (q.status === 'rejected')
        add('Új revízió készítése', 'revise'); if (q.status === 'accepted' && this.current.project?.status === 'waiting_start')
        add('Kertépítés indítása', 'start'); if (['draft', 'ready', 'sent', 'rejected'].includes(q.status))
        add('Ajánlat visszavonása', 'withdraw'); el('quote-mail').disabled = q.status !== 'ready'; }
    async transition(action) { if (!this.current || !this.org || this.busy)
        return; if (this.changed || this.pending) {
        this.message('Előbb mentsd az ajánlatot.');
        return;
    } const names = { ready: 'Elkészültnek jelölöd az ajánlatot?', draft: 'Ismét szerkeszthető legyen?', revise: 'Új revíziót készítesz? A korábbi kiküldött tartalom megmarad.', accept: 'Rögzíted, hogy az ügyfél elfogadta az ajánlatot? Ebből indításra váró kertépítés keletkezik.', reject: 'Rögzíted az ügyfél elutasítását?', withdraw: 'Visszavonod az ajánlatot? Az előzménye megmarad.', start: 'Elindítod a kertépítést? Ettől kezdve kioszthatók a munkatársi megbízások.' }; if (!confirm(names[action]))
        return; const epoch = this.epoch, id = this.current.quote.id; this.saving = true; el('quote-fields').disabled = true; for (const field of Array.from(el('quote-sections').querySelectorAll('fieldset')))
        field.disabled = true; el('quote-add-section').disabled = true; try {
        await this.api.customers('quote_transition', { organization_id: this.org, quote_id: id, revision: this.current.quote.revision, transition: action, confirmed: true });
        if (epoch !== this.epoch)
            return;
        this.saving = false;
        await this.loadQuote(id, true);
        await this.completed();
        this.message('A műveletet rögzítettük.', 'success');
    }
    catch (e) {
        if (epoch === this.epoch)
            this.error(e);
    }
    finally {
        if (epoch === this.epoch) {
            this.saving = false;
            this.renderEditor();
        }
    } }
    renderHistory() { const box = el('quote-history'); box.replaceChildren(); for (const e of this.current?.events ?? [])
        box.append(n('p', new Date(e.created_at).toLocaleString('hu-HU') + ' · ' + (e.actor_name ?? 'Irodai felhasználó') + ' · ' + (eventNames[e.event] ?? 'Ajánlati esemény'))); for (const c of this.current?.changes ?? []) {
        const d = fold(box, c.from + '. → ' + c.to + '. változat · ' + new Date(c.date).toLocaleString('hu-HU') + ' · ' + (c.actor ?? 'Irodai felhasználó'));
        for (const row of c.rows)
            d.append(n('p', row.kind === 'metadata' ? row.line + ' · ' + row.before + ' → ' + row.after : row.line + ' · Mennyiség: ' + (row.before?.params?.q1 ?? '–') + ' → ' + (row.after?.params?.q1 ?? '–') + ' · Anyag egységára: ' + money(row.before?.pricing?.main) + ' → ' + money(row.after?.pricing?.main) + ' · Munka egységára: ' + money(row.before?.pricing?.labor) + ' → ' + money(row.after?.pricing?.labor)));
    } }
    async pdf(download) { if (!this.org || !this.input || this.busy)
        return; const epoch = this.epoch, edit = this.edit; this.saving = true; this.message('PDF készítése…'); try {
        const args = this.current && !this.changed ? { quote_id: this.current.quote.id } : { payload: structuredClone(this.input) };
        const result = await this.api.customers('quote_pdf', { organization_id: this.org, ...args, normal: el('quote-pdf-mode').value === 'normal' });
        if (epoch !== this.epoch || edit !== this.edit)
            return;
        const bytes = Uint8Array.from(atob(result.pdf), c => c.charCodeAt(0));
        if (this.objectUrl)
            URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        const a = el('quote-pdf-save');
        a.href = this.objectUrl;
        a.download = result.filename;
        el('quote-pdf-frame').src = this.objectUrl;
        if (download)
            a.click();
        else if (!el('quote-pdf-dialog').open)
            el('quote-pdf-dialog').showModal();
        this.message(download ? 'A PDF elkészült, a letöltés elindult.' : 'A PDF-előnézet elkészült.', 'success');
    }
    catch (e) {
        if (epoch === this.epoch)
            this.error(e);
    }
    finally {
        if (epoch === this.epoch)
            this.saving = false;
    } }
    mail() { if (!this.current || this.current.quote.status !== 'ready' || this.dirty) {
        this.message('Előbb mentsd és jelöld elkészültnek az ajánlatot.');
        return;
    } const v = this.current.versions.find((v) => v.version === this.current.quote.current_version); el('quote-mail-to').value = v.customer.email ?? ''; el('quote-mail-subject').value = 'DÍSZKERTEK – ' + this.current.quote.number + ' – ' + this.current.quote.title; el('quote-mail-body').value = 'Kedves ' + v.customer.name + '!\n\nCsatolva küldjük a megbeszélt munkákra vonatkozó árajánlatunkat. Kérdés esetén örömmel állunk rendelkezésedre.\n\nÜdvözlettel:\nDíszkertek\n+36 70 634 9630'; el('quote-mail-confirm').checked = false; this.mailRequest = undefined; this.mailLink(); el('quote-mail-dialog').showModal(); }
    mailLink() { el('quote-mail-open').href = 'mailto:' + encodeURIComponent(el('quote-mail-to').value) + '?subject=' + encodeURIComponent(el('quote-mail-subject').value) + '&body=' + encodeURIComponent(el('quote-mail-body').value); }
    async manualSent() { if (!this.org || !this.current || this.busy || !el('quote-mail-confirm').checked)
        return; const epoch = this.epoch, id = this.current.quote.id; this.mailRequest ??= uuid(); this.saving = true; try {
        await this.api.customers('quote_manual_sent', { organization_id: this.org, quote_id: id, revision: this.current.quote.revision, request_id: this.mailRequest, recipient: el('quote-mail-to').value, subject: el('quote-mail-subject').value, body: el('quote-mail-body').value, confirmed: true });
        if (epoch !== this.epoch)
            return;
        el('quote-mail-dialog').close();
        this.saving = false;
        await this.loadQuote(id, true);
        this.message('A kézi kiküldés irodai visszaigazolását rögzítettük.', 'success');
    }
    catch (e) {
        if (epoch === this.epoch)
            this.error(e);
    }
    finally {
        if (epoch === this.epoch)
            this.saving = false;
    } }
    renderBook() { if (!this.book)
        return; const types = el('price-type'); types.replaceChildren(new Option('Válassz típust', '')); for (const t of [...this.book.types].sort((a, b) => (a.category + ' ' + a.name).localeCompare(b.category + ' ' + b.name, 'hu')))
        types.add(new Option(t.category + ' – ' + t.name, t.id)); types.value = this.typeId; el('price-count').textContent = this.book.types.length + ' típus · ' + new Set(this.book.types.map((t) => t.category)).size + ' kategória · ' + this.bookRevision + '. árlistaváltozat'; const templates = el('price-template'); templates.replaceChildren(new Option('Válassz sablont', '')); for (const t of this.book.templates)
        templates.add(new Option(t.name || 'Megnevezés szükséges', t.id)); templates.value = this.templateId; this.renderType(); this.renderTemplate(); this.renderInfo(); }
    renderType() { const editor = el('price-type-editor'); editor.replaceChildren(); const t = this.book?.types.find((v) => v.id === this.typeId); if (!t)
        return; const change = () => { this.catalogChanged = true; }; for (const [key, label] of [['category', 'Kategória'], ['name', 'Típus'], ['unit', 'Mértékegység'], ['unit2', 'Második mértékegység – ha szükséges']])
        input(editor, label, t[key], v => { t[key] = v; change(); }); select(editor, 'Számítási mód', t.mode, Object.entries(modes), v => { t.mode = v; if (v === 'custom') {
        t.fields ??= [{ key: 'q1', label: 'Mennyiség', unit: t.unit, required: true, inherit: '' }];
        t.quantity_formula ??= 'q1';
    }
    else if (v !== 'excel')
        t.unit = v === 'volume' ? 'm³' : v === 'density' ? 'db' : 'm²'; change(); this.renderType(); }); if (t.mode === 'custom') {
        const custom = fold(editor, 'Egyedi paraméterek és képletek');
        for (const f of t.fields) {
            const d = fold(custom, f.label || 'Paraméter neve szükséges');
            for (const [key, label] of [['key', 'Képletben használt név – ékezet nélkül'], ['label', 'Megjelenő név'], ['unit', 'Mértékegység']])
                input(d, label, f[key], v => { f[key] = v; change(); });
            select(d, 'Átvétel a főtételből', f.inherit ?? '', [['', 'Nincs átvétel'], ['area', 'Terület (m²)'], ['length', 'Hossz (m)'], ['width', 'Szélesség (m)']], v => { f.inherit = v; change(); });
            d.append(button('Paraméter kivétele', () => { t.fields = t.fields.filter((v) => v !== f); change(); this.renderType(); }));
        }
        custom.append(button('+ Paraméter', () => { t.fields.push({ key: 'q' + (t.fields.length + 1), label: '', unit: '', required: true, inherit: '' }); change(); this.renderType(); }));
        for (const [key, label] of [['quantity_formula', 'Mennyiség képlete'], ['material_formula', 'Anyagösszeg képlete – üresen: mennyiség × anyag egységár'], ['labor_formula', 'Munkaösszeg képlete – üresen: mennyiség × munka egységár']])
            input(custom, label, t[key], v => { t[key] = v; change(); }, 'text', 300);
        select(custom, 'Mennyiség kerekítése', t.round_quantity ?? 'none', [['none', 'Nincs egészre kerekítés'], ['ceil', 'Egész darabra felfelé']], v => { t.round_quantity = v; change(); });
        custom.append(n('p', 'Műveletek: +, -, *, / és zárójelek. Ármezők: main, auxiliary, transport, labor. Számított mennyiség: quantity.'));
    } this.pricing(fold(editor, 'Árösszetevők és minimumdíjak'), t, change); const defaults = fold(editor, 'Paraméterek alapértékei'); for (const [key, label] of fieldsFor(t))
        input(defaults, label, t.defaults?.[key], v => { t.defaults ??= {}; t.defaults[key] = v; change(); }, 'number'); this.materials(fold(editor, 'Anyagjegyzék és ráhagyás'), t, change); input(editor, 'Hasznos információk – csak belső munkautasítás', t.internal_info, v => { t.internal_info = v; change(); }, 'textarea', 12000); if (t.source)
        editor.append(n('p', 'Forrás: ' + t.source.sheet + ' · ' + t.source.row + '. sor')); }
    renderTemplate() { const editor = el('price-template-editor'); editor.replaceChildren(); const t = this.book?.templates.find((v) => v.id === this.templateId); if (!t)
        return; const change = () => { this.catalogChanged = true; }; input(editor, 'Sablon neve', t.name, v => { t.name = v; change(); }); for (const row of t.lines) {
        const type = this.book?.types.find((v) => v.id === row.type_id);
        const d = fold(editor, type ? type.category + ' – ' + type.name : 'Pontosítandó: ' + row.unresolved);
        this.typePicker(d, row.type_id ?? '', type => { row.type_id = type.id; row.unresolved = ''; change(); this.renderTemplate(); });
        if (type)
            for (const [key, label] of fieldsFor(type))
                input(d, label, row.params?.[key], v => { row.params ??= {}; row.params[key] = v; change(); }, 'number');
        const optional = n('label', 'Opcionális, alapból ne szerepeljen'), check = document.createElement('input');
        check.type = 'checkbox';
        check.className = 'inline-check';
        check.checked = !!row.optional;
        check.addEventListener('change', () => { row.optional = check.checked; change(); });
        optional.prepend(check);
        d.append(optional, button('Sor kivétele', () => { t.lines = t.lines.filter((v) => v !== row); change(); this.renderTemplate(); }));
    } const add = fold(editor, 'Új sablonsor'); this.typePicker(add, '', type => { t.lines.push({ type_id: type.id, params: { ...type.defaults }, optional: false }); change(); this.renderTemplate(); }); }
    renderInfo() { const editor = el('price-info-editor'); editor.replaceChildren(); for (const t of this.book?.info_templates ?? []) {
        const d = fold(editor, t.name || 'Információsablon megnevezése szükséges');
        input(d, 'Sablon neve', t.name, v => { t.name = v; this.catalogChanged = true; });
        input(d, 'Az ügyfélnek szánt tájékoztató szöveg', t.body, v => { t.body = v; this.catalogChanged = true; }, 'textarea', 20000);
    } }
    exportMaterials() { if (!this.output || this.output.issues.length) {
        this.message('Előbb javítsd az ajánlat hiányzó adatait.');
        return;
    } const rows = [['Főtétel', 'Tétel', 'Anyag', 'Mértékegység', 'Beépítendő', 'Beszerzendő', 'Ráhagyás (%)', 'Csomagméret', 'Fuvarok', 'Belső egységár (Ft)', 'Belső beszerzési érték (Ft)', 'Beszerzési hely', 'Felelős']]; for (const s of this.output.sections)
        for (const l of s.lines)
            for (const m of l.materials)
                rows.push([s.name, l.label, m.name, m.unit, m.installed, m.purchase, m.waste, m.pack, m.trips ?? '', m.unit_price, m.purchase_cost, m.supplier ?? '', m.owner === 'office' ? 'Iroda' : 'Kivitelezők']); const cell = (v) => { let text = String(v ?? ''); if (/^[=+\-@\t\r]/.test(text))
        text = "'" + text; return '\"' + text.replace(/\"/g, '\"\"') + '\"'; }; const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(r => r.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'Diszkertek_beszerzesi_lista.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); this.message('A belső anyaglista exportja elkészült.', 'success'); }
    async importExcel() { if (!this.org || this.busy)
        return; const file = el('price-file').files?.[0]; if (!file) {
        this.message('Válaszd ki az XLSX-kalkulátort.');
        return;
    } if (this.catalogChanged && !confirm('A még nem mentett árlista-módosításokat felváltja az import. Folytatod?'))
        return; const epoch = this.epoch; this.loading = true; try {
        const { readCalculator } = await import(new URL('./erp-calculator-import.js?v=0.3.0', import.meta.url).href);
        const imported = await readCalculator(file);
        if (epoch !== this.epoch)
            return;
        if (!confirm(imported.types.length + ' típus és ' + imported.templates.length + ' sablon beolvasva. Betöltöd szerkesztésre? A véglegesítéshez a Változat mentése gomb szükséges.'))
            return;
        imported.info_templates = this.book?.info_templates ?? [];
        this.book = imported;
        this.catalogChanged = true;
        this.typeId = '';
        this.templateId = '';
        this.renderBook();
        this.message('Az import előkészítve. Ellenőrizd az adatokat, majd mentsd az új változatot.');
    }
    catch (e) {
        if (epoch === this.epoch)
            this.error(e);
    }
    finally {
        if (epoch === this.epoch)
            this.loading = false;
    } }
    async saveBook() { if (!this.org || !this.book || this.busy)
        return; const epoch = this.epoch; this.saving = true; const controls = Array.from(el('prices-view').querySelectorAll('input,select,textarea,button')); for (const control of controls)
        control.disabled = true; try {
        const revision = await this.api.customers('quote_catalog_save', { organization_id: this.org, revision: this.bookRevision, document: this.book });
        if (epoch !== this.epoch)
            return;
        this.bookRevision = revision;
        this.catalogChanged = false;
        this.renderBook();
        this.message('Az árlista és sablonok új változatát mentettük. A korábbi ajánlatok nem változtak.', 'success');
    }
    catch (e) {
        if (epoch === this.epoch)
            this.error(e);
    }
    finally {
        if (epoch === this.epoch) {
            this.saving = false;
            for (const control of controls)
                control.disabled = false;
        }
    } }
}
