import { quoteNumber } from './erp-quote-tools.js';
const n = (tag, text = '') => { const e = document.createElement(tag); e.textContent = text; return e; };
function button(box, text, fn) { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.addEventListener('click', fn); box.append(b); return b; }
function fold(box, title, open = false) { const d = document.createElement('details'); d.className = 'erp-disclosure'; d.open = open; d.append(n('summary', title)); box.append(d); return d; }
function field(box, label, value = '', type = 'text') { const l = n('label', label), e = type === 'textarea' ? document.createElement('textarea') : document.createElement('input'); if (e instanceof HTMLInputElement)
    e.type = type; e.value = value; l.append(e); box.append(l); return e; }
function choice(box, label, values, value = '') { const l = n('label', label), e = document.createElement('select'); e.replaceChildren(...values.map(([v, t]) => new Option(t, v))); e.value = value || values[0]?.[0] || ''; l.append(e); box.append(l); return e; }
const clean = (v) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('hu');
const money = (v) => v == null ? '—' : quoteNumber(String(v)) + ' Ft';
const states = { requested: 'Irodai jóváhagyásra vár', confirmed: 'Jóváhagyva', cancelled: 'Visszavonva / elutasítva', draft: 'Piszkozat', published: 'Közzétéve', active: 'Aktív', withdrawn: 'Visszavonva', pending: 'Irodai igazolásra vár', partial: 'Részben igazolva', approved: 'Jóváhagyva', rejected: 'Elutasítva' };
export class MaintenanceDesk {
    api;
    onError;
    pdfLinks = new Map();
    owner;
    org;
    role = 'office';
    kind = 'office';
    epoch = 0;
    busy = false;
    reading = false;
    dirty = false;
    data;
    edit;
    pending;
    preview;
    command;
    undo = [];
    undoIndex = 0;
    financeHandler;
    dialog = document.createElement('dialog');
    status = n('p');
    body = n('div');
    editor = n('div');
    previewBox = n('div');
    toolbar = n('div');
    project = document.createElement('select');
    roleSelect = document.createElement('select');
    search = document.createElement('input');
    global = n('div');
    constructor(api, onError) {
        this.api = api;
        this.onError = onError;
        this.dialog.id = 'maintenance-dialog';
        this.dialog.className = 'workspace maintenance-dialog';
        this.dialog.setAttribute('aria-label', 'Kertkarbantartások');
        const head = n('div');
        head.className = 'maintenance-heading';
        head.append(n('h1', 'Kertkarbantartások'));
        const x = button(head, '×', () => this.close());
        x.setAttribute('aria-label', 'Karbantartási ablak bezárása');
        x.title = 'Bezárás';
        this.dialog.append(head);
        this.toolbar.className = 'maintenance-actions';
        this.roleSelect.setAttribute('aria-label', 'Karbantartási munkaszerep');
        this.search.type = 'search';
        this.search.placeholder = 'Munka vagy cím keresése';
        this.search.setAttribute('aria-label', 'Karbantartások keresése');
        this.project.setAttribute('aria-label', 'Karbantartás kiválasztása');
        this.toolbar.append(this.roleSelect, this.search, this.project);
        button(this.toolbar, 'Frissítés', () => { if (this.leave()) {
            this.clearEditor();
            void this.load();
        } });
        this.status.className = 'office-status';
        this.status.setAttribute('role', 'status');
        this.dialog.append(this.toolbar, this.status, this.global, this.body, this.editor, this.previewBox);
        document.body.append(this.dialog);
        document.getElementById('show-maintenance').addEventListener('click', () => { void this.open(); });
        this.dialog.addEventListener('cancel', e => { e.preventDefault(); this.close(); });
        this.project.addEventListener('change', () => { if (!this.leave()) {
            this.project.value = this.data?.context.project?.id ?? '';
            return;
        } this.clearEditor(); void this.load(); });
        this.roleSelect.addEventListener('change', () => { if (!this.leave()) {
            this.roleSelect.value = this.role;
            return;
        } this.role = this.roleSelect.value; this.project.value = ''; this.clearEditor(); void this.load(); });
        this.search.addEventListener('input', () => this.projects());
        this.dialog.addEventListener('input', e => { const target = e.target; if (this.previewBox.contains(target) || this.toolbar.contains(target) || this.editor.contains(target))
            return; this.dirty = true; this.command = undefined; this.preview = undefined; this.previewBox.replaceChildren(); });
        window.addEventListener('beforeunload', e => { if (this.dirty || this.pending || this.busy && !this.reading) {
            e.preventDefault();
            e.returnValue = '';
        } });
        window.addEventListener('erp:before-update', e => { if (this.dialog.open && !this.leave())
            e.preventDefault(); });
        setInterval(() => { if (this.dialog.open && !document.hidden && navigator.onLine && !this.busy && !this.dirty && !this.pending && !this.command)
            void this.load(this.data?.sheet?.id); }, 60000);
    }
    setFinanceHandler(fn) { this.financeHandler = fn; }
    setOwner(owner, org, kind) { if (this.owner !== owner || this.org !== org || this.kind !== kind) {
        this.reset();
        this.owner = owner;
        this.org = org;
        this.kind = kind;
        this.role = kind === 'staff' ? 'maintenance_lead' : kind;
        this.roleSelect.replaceChildren(...(kind === 'staff' ? [['maintenance_lead', 'Karbantartásvezető'], ['gardener', 'Kertész'], ['construction_worker', 'Kertépítő']] : [[kind, kind === 'office' ? 'Iroda' : 'Megrendelő']]).map(([v, t]) => new Option(t, v)));
        this.roleSelect.value = this.role;
    } document.getElementById('show-maintenance').hidden = !owner; }
    reset() { for (const p of this.pdfLinks.values())
        URL.revokeObjectURL(p.url); this.pdfLinks.clear(); this.epoch++; this.owner = undefined; this.org = undefined; this.data = undefined; this.busy = false; this.reading = false; this.clearEditor(); this.body.replaceChildren(); this.global.replaceChildren(); this.project.replaceChildren(); this.dialog.close(); document.getElementById('show-maintenance').hidden = true; }
    scope() { return { organization_id: this.org, project_id: this.project.value || null, role: this.role }; }
    key() { return 'diszkertek-erp-maintenance/' + this.owner + '/' + this.org + '/' + this.role + '/' + (this.project.value || 'global'); }
    message(text, success = false) { this.status.textContent = (success ? '✓ ' : '') + text; this.status.className = 'office-status' + (success ? ' success' : ''); }
    error(e) { if ([401, 403].includes(e?.status)) {
        this.data = undefined;
        this.body.replaceChildren();
        this.clearEditor();
        this.onError(e);
    } this.message(e instanceof Error ? e.message : 'A karbantartási művelet nem sikerült.'); }
    lock(value) { for (const e of Array.from(this.dialog.querySelectorAll('button,input,select,textarea')))
        if (e.getAttribute('aria-label') !== 'Karbantartási ablak bezárása')
            e.disabled = value; }
    persist() { try {
        localStorage.setItem(this.key(), JSON.stringify({ edit: this.edit, pending: this.pending }));
    }
    catch {
        this.message('A helyi piszkozatot nem sikerült tárolni. A mentésig ne zárd be az ablakot.');
    } }
    leave() { if (this.busy && !this.reading) {
        this.message('A mentés folyamatban van. Várd meg a visszaigazolást.');
        return false;
    } return !(this.dirty || this.pending) || confirm('Bezárod a szerkesztést? A még nem mentett űrlapadatokat elveszítheted. A külön tárolt munkalappiszkozat és az eredeti mentési kérés megmarad.'); }
    close() { if (!this.leave())
        return; if (this.reading)
        this.epoch++; this.busy = false; this.reading = false; this.clearEditor(); this.dialog.close(); }
    clearEditor() { this.edit = undefined; this.pending = undefined; this.command = undefined; this.preview = undefined; this.dirty = false; this.editor.replaceChildren(); this.previewBox.replaceChildren(); }
    async open() { if (!this.owner || this.busy)
        return; if (!this.dialog.open)
        this.dialog.showModal(); await this.load(); }
    async showProject(project, role, notification) { if (!this.owner || !this.leave())
        return; if (role && Array.from(this.roleSelect.options).some(o => o.value === role)) {
        this.role = role;
        this.roleSelect.value = role;
    } this.clearEditor(); this.project.replaceChildren(new Option('Betöltés…', project)); if (!this.dialog.open)
        this.dialog.showModal(); await this.load(); if (notification)
        try {
            await this.api.maintenance('maintenance_notifications', { notification_id: notification });
        }
        catch (e) {
            this.error(e);
        } }
    projects() { const selected = this.data?.context.project?.id ?? this.project.value, q = clean(this.search.value.trim()); const rows = (this.data?.projects ?? []).filter((p) => q.length < 2 || clean(p.name + ' ' + p.address + ' ' + p.customer).includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'hu') || a.address.localeCompare(b.address, 'hu')); this.project.replaceChildren(new Option('Válassz karbantartást', ''), ...rows.map((p) => new Option(p.name + ' · ' + p.customer + ' · ' + p.address, p.id))); this.project.value = rows.some((p) => p.id === selected) ? selected : ''; }
    async load(sheet, filter = {}, append = false) { if (this.busy || !this.org)
        return; const epoch = this.epoch; this.busy = true; this.reading = true; this.lock(true); this.message('Karbantartások betöltése…'); try {
        const value = await this.api.maintenance('maintenance_read', { ...this.scope(), worksheet_id: sheet ?? null, filter });
        if (epoch !== this.epoch)
            return;
        if (append && this.data) {
            for (const k of ['sheets', 'claims']) {
                const rows = new Map(this.data[k].map((r) => [r.id, r]));
                for (const r of value[k])
                    rows.set(r.id, r);
                value[k] = [...rows.values()];
            }
            if (value.sheet && this.data.sheet?.id === value.sheet.id) {
                const versions = new Map(this.data.sheet.versions.map((v) => [v.version, v]));
                for (const v of value.sheet.versions)
                    versions.set(v.version, v);
                value.sheet.versions = [...versions.values()];
            }
        }
        this.data = value;
        this.projects();
        this.render();
        this.message('A karbantartási adatok naprakészek.', true);
    }
    catch (e) {
        if (epoch === this.epoch)
            this.error(e);
    }
    finally {
        if (epoch === this.epoch) {
            this.busy = false;
            this.reading = false;
            this.lock(false);
        }
    } }
    render() {
        this.global.replaceChildren();
        this.body.replaceChildren();
        const d = this.data;
        if (!d)
            return;
        if (this.kind === 'client') {
            const r = fold(this.global, 'Új karbantartási igény vagy visszahívás');
            const site = choice(r, 'Munkavégzési cím', [['', 'Válassz címet'], ...d.sites.map((s) => [s.location_id, s.address])]);
            const type = choice(r, 'Igény típusa', [['maintenance', 'Karbantartást kérek'], ['callback', 'Visszahívást kérek']]);
            const desc = field(r, 'Kért feladatok / üzenet', '', 'textarea'), day = field(r, 'Kért nap (nem kötelező)', '', 'date'), people = field(r, 'Kért létszám (nem kötelező)', '', 'number'), hours = field(r, 'Kért óraszám (nem kötelező)');
            if (d.context.date_requests === false) {
                day.parentElement.hidden = true;
                day.value = '';
                r.append(n('p', 'Az időpontot az iroda egyezteti veled.'));
            }
            r.append(n('p', 'Az igény irodai visszaigazolás után válik egyeztetett munkává. A kért nap még nem foglalás.'));
            button(r, 'Igény előnézete', () => { if (!this.leave())
                return; this.clearEditor(); void this.prepare({ kind: 'request', location_id: site.value, request_type: type.value, description: desc.value, day: day.value, people: people.value, hours: hours.value }, true); });
        }
        if (this.role === 'office') {
            const cat = fold(this.global, 'Karbantartási árlista');
            const options = [['', 'Új tétel'], ...d.catalog.map((c) => [c.code, c.label + ' · ' + money(c.unit_price) + (c.confirmed ? '' : ' · Ellenőrizendő')])];
            const chosen = choice(cat, 'Tétel', options);
            const code = field(cat, 'Kód'), label = field(cat, 'Megnevezés'), unit = field(cat, 'Mértékegység'), price = field(cat, 'Végleges ügyfél-egységár – Ft');
            const confirmed = field(cat, 'Ellenőrzött ár', '', 'checkbox'), active = field(cat, 'Aktív tétel', '', 'checkbox');
            active.checked = true;
            chosen.onchange = () => { const c = d.catalog.find((x) => x.code === chosen.value); code.value = c?.code ?? ''; code.readOnly = Boolean(c); label.value = c?.label ?? ''; unit.value = c?.unit ?? ''; price.value = c?.unit_price ?? ''; confirmed.checked = c?.confirmed ?? false; active.checked = c?.active ?? true; };
            button(cat, 'Árlista-módosítás előnézete', () => { void this.prepare({ kind: 'catalog', code: code.value, label: label.value, unit: unit.value, unit_price: price.value.replace(',', '.'), confirmed: confirmed.checked, active: active.checked, catalog_revision: d.catalog_revision }, true); });
            cat.append(n('p', 'Ezek végleges ügyfélárak. Módosításuk a már mentett munkalapok árait nem írja át.'));
        }
        this.restoreButton();
        const project = d.context.project;
        if (!project) {
            this.body.append(n('p', d.projects.length ? 'Válassz karbantartást a lenyíló listából.' : this.role === 'office' ? 'Még nincs karbantartás. Az Ügyfelek menüben válassz munkavégzési címet, és hozz létre kertkarbantartást.' : 'Még nincs elérhető karbantartás.'));
            return;
        }
        this.body.append(n('h2', project.name), n('p', project.customer + ' · ' + project.address), n('p', states[project.status] ?? project.status));
        const req = d.request;
        if (req) {
            const box = fold(this.body, 'Karbantartási igény');
            box.append(n('p', req.document.description ?? ''), n('p', 'Kért nap: ' + (req.document.day || 'Nincs megadva') + ' · Létszám: ' + (req.document.people || 'Nincs megadva') + ' · Óraszám: ' + (req.document.hours ? quoteNumber(req.document.hours) : 'Nincs megadva')));
            if (req.decision_reason)
                box.append(n('p', req.decision_reason));
        }
        if (project.status === 'requested') {
            const box = fold(this.body, 'Igény kezelése', true);
            if (this.role === 'office') {
                const day = field(box, 'Egyeztetett munkanap', project.scheduled_date ?? '', 'date');
                button(box, 'Irodai jóváhagyás előnézete', () => { void this.prepare({ kind: 'approve', revision: project.revision, day: day.value }); });
            }
            if (['office', 'client'].includes(this.role)) {
                const reason = field(box, 'Elutasítás / visszavonás indoka', '', 'textarea');
                button(box, this.role === 'office' ? 'Igény elutasításának előnézete' : 'Saját igény visszavonása', () => { void this.prepare({ kind: this.role === 'office' ? 'reject' : 'withdraw_request', revision: project.revision, reason: reason.value }); });
            }
        }
        if (d.context.can_write && project.status === 'confirmed')
            button(this.body, 'Új napi karbantartási munkalap', () => this.startEdit());
        if (['office', 'client'].includes(this.role))
            button(this.body, 'Karbantartás pénzügyei', () => { if (this.leave())
                this.financeHandler?.(project.id); });
        const list = fold(this.body, 'Munkalapok (' + d.sheets.length + ')', true);
        for (const w of d.sheets)
            button(list, w.work_date + ' · ' + states[w.state] + (w.published_version ? ' · Közzétett v' + w.published_version : ' · Piszkozat'), () => { if (this.leave()) {
                this.clearEditor();
                void this.load(w.id);
            } });
        if (d.sheets.length && d.sheets.length % 100 === 0) {
            const last = d.sheets.at(-1);
            button(list, 'Korábbi munkalapok', () => { void this.load(d.sheet?.id, { before_day: last.work_date, before_id: last.id }, true); });
        }
        if (!d.sheets.length)
            list.append(n('p', 'Még nincs rögzített munkalap.'));
        const s = d.sheet;
        if (s) {
            const box = fold(this.body, s.work_date + ' · ' + states[s.kind] + ' · v' + s.version, true);
            if (s.state === 'withdrawn')
                box.append(n('strong', 'Visszavont munkalap – az aktuális fizetendő összegben nem szerepel.'));
            this.renderSheet(box, s);
            button(box, 'PDF megnyitása / letöltése', () => { void this.pdf(s.id, s.version); });
            this.pdfActions(box, s.id, s.version);
            const versions = choice(box, 'Korábbi változat', s.versions.map((v) => [String(v.version), 'v' + v.version + ' · ' + states[v.kind]]), String(s.version));
            versions.onchange = () => { if (this.leave()) {
                this.clearEditor();
                void this.load(s.id, { version: Number(versions.value) });
            } };
            if (s.versions.length && s.versions.length % 100 === 0)
                button(box, 'Korábbi változatok betöltése', () => { void this.load(s.id, { before_version: s.versions.at(-1).version }, true); });
            if (d.context.can_write && s.state === 'active') {
                button(box, 'Javítás új változatként', () => this.startEdit(s));
                if (s.version === s.current_version && s.kind === 'draft')
                    button(box, 'Árak ellenőrzése és közzététel', () => { void this.prepare({ kind: 'publish', worksheet_id: s.id, revision: s.revision, catalog_revision: d.catalog_revision, work_date: s.work_date, document: s.document }); });
                const reason = field(box, 'Visszavonás indoka');
                button(box, 'Munkalap visszavonásának előnézete', () => { void this.prepare({ kind: 'withdraw_sheet', worksheet_id: s.id, revision: s.revision, reason: reason.value }); });
            }
            if (this.role === 'office' && s.state === 'withdrawn') {
                const reason = field(box, 'Helyreállítás indoka');
                button(box, 'Munkalap helyreállítása', () => { void this.prepare({ kind: 'restore_sheet', worksheet_id: s.id, revision: s.revision, reason: reason.value }); });
            }
            if (['office', 'maintenance_lead', 'client'].includes(this.role) && s.published_version && s.state === 'active')
                this.claimForm(box, s);
        }
        if (d.claims.length) {
            const claims = fold(this.body, 'Fizetési jelzések és irodai igazolások');
            for (const c of d.claims) {
                const row = fold(claims, c.work_date + ' · ' + money(c.amount) + ' · ' + states[c.state]);
                row.append(n('p', (c.method === 'cash' ? 'Készpénz' : 'Átutalás') + ' · Irodán igazolt: ' + money(c.confirmed_amount)), n('p', c.reason || ''));
                if (['office', 'maintenance_lead', 'client'].includes(this.role) && c.state === 'pending') {
                    const reason = field(row, 'Visszavonás / elutasítás indoka');
                    button(row, this.role === 'office' ? 'Jelzés elutasítása' : 'Saját jelzés visszavonása', () => { const w = d.sheets.find((w) => w.id === c.worksheet_id); if (!w) {
                        this.message('Nyisd meg a kapcsolódó munkalapot.');
                        return;
                    } void this.prepare({ kind: this.role === 'office' ? 'reject_claim' : 'withdraw_claim', worksheet_id: c.worksheet_id, revision: w.revision, claim_id: c.id, reason: reason.value }); });
                }
                if (this.role === 'office')
                    button(row, 'Tényleges befizetés igazolása a pénzügyekben', () => this.financeHandler?.(project.id));
            }
            if (d.claims.length % 100 === 0) {
                const last = d.claims.at(-1);
                button(claims, 'Korábbi fizetési jelzések', () => { void this.load(d.sheet?.id, { claim_time: last.created_at, claim_id: last.id }, true); });
            }
        }
    }
    restoreButton() { try {
        const saved = JSON.parse(localStorage.getItem(this.key()) ?? 'null');
        if (!saved)
            return;
        const box = fold(this.global, 'Helyi piszkozat / korábbi mentés');
        if (saved.pending)
            button(box, 'Korábbi mentés eredményének ellenőrzése', () => { if (!this.leave())
                return; this.pending = saved.pending; void this.save(true); });
        if (saved.edit)
            button(box, 'Helyi piszkozat megnyitása', () => { if (!this.leave())
                return; this.clearEditor(); this.edit = saved.edit; this.dirty = true; this.undo = [structuredClone(this.edit)]; this.undoIndex = 0; this.renderEditor(); });
    }
    catch { } }
    renderSheet(box, s) { const doc = s.document ?? {}, calc = s.calculation ?? {}; box.append(n('p', doc.description ?? '')); for (const [i, t] of (doc.teams ?? []).entries())
        box.append(n('p', 'Csapat ' + (i + 1) + ': ' + t.size + ' fő · ' + t.arrival + '–' + t.departure)); if (calc.people_minutes != null)
        box.append(n('p', 'Összes munkaidő: ' + quoteNumber(String(Number(calc.people_minutes) / 60)) + ' főóra')); if (doc.subcontractor)
        box.append(n('p', 'Alvállalkozó: ' + doc.subcontractor)); for (const r of doc.rentals ?? [])
        if (r)
            box.append(n('p', 'Gépbérlés: ' + r)); const wrap = n('div'); wrap.className = 'maintenance-table'; const table = document.createElement('table'); const full = calc.gross !== undefined, headers = ['Megnevezés', 'Mennyiség', 'M.e.', ...(full ? ['Egységár (Ft)', 'Végösszeg (Ft)'] : [])]; const tr = document.createElement('tr'); tr.className = 'maintenance-column-head'; for (const t of headers)
        tr.append(n('th', t)); table.append(tr); for (const line of calc.lines ?? []) {
        const row = document.createElement('tr');
        row.className = 'maintenance-data-row';
        let cellIndex = 0;
        for (const value of [line.name, quoteNumber(line.kind === 'labor' ? String(Number(line.quantity) / 60) : line.quantity), line.kind === 'labor' ? 'főóra' : line.unit, ...(full ? [money(line.unit_price), money(line.amount)] : [])]) {
            const cell = n('td', String(value));
            cell.dataset.label = headers[cellIndex++];
            row.append(cell);
        }
        table.append(row);
    } wrap.append(table); box.append(wrap); if (full)
        box.append(n('p', 'Anyag és egyéb: ' + money(calc.material) + ' · Munkadíj: ' + money(calc.labor)), n('strong', 'Fizetendő végösszeg: ' + money(calc.gross)), n('p', 'A feltüntetett árak a végleges ügyfélárak. Újabb áfa nem kerül rájuk.')); for (const issue of calc.issues ?? [])
        box.append(n('p', issue)); if (doc.note)
        box.append(n('p', doc.note)); }
    startEdit(s) { if (!this.leave() || !this.data)
        return; this.clearEditor(); const date = new Date().toLocaleDateString('sv-SE'); this.edit = { worksheet_id: s?.id ?? crypto.randomUUID(), revision: s?.revision ?? 0, catalog_revision: this.data.catalog_revision, work_date: s?.work_date ?? date, document: structuredClone(s?.document ?? { description: '', teams: [], lines: [], note: '', subcontractor: '', rentals: [] }) }; this.dirty = true; this.undo = [structuredClone(this.edit)]; this.undoIndex = 0; this.persist(); this.renderEditor(); }
    changed() { this.dirty = true; this.command = undefined; this.preview = undefined; this.previewBox.replaceChildren(); this.undo = this.undo.slice(0, this.undoIndex + 1); this.undo.push(structuredClone(this.edit)); if (this.undo.length > 60)
        this.undo.shift(); this.undoIndex = this.undo.length - 1; this.persist(); }
    renderEditor() {
        const edit = this.edit;
        if (!edit || !this.data)
            return;
        this.editor.replaceChildren();
        const box = fold(this.editor, 'Napi munkalap szerkesztése', true);
        button(box, 'Szerkesztő bezárása', () => { if (this.leave())
            this.clearEditor(); });
        const move = (delta) => { const index = this.undoIndex + delta; if (index < 0 || index >= this.undo.length)
            return; this.undoIndex = index; this.edit = structuredClone(this.undo[index]); this.dirty = true; this.command = undefined; this.previewBox.replaceChildren(); this.persist(); this.renderEditor(); };
        button(box, 'Visszavonás', () => move(-1));
        button(box, 'Újra', () => move(1));
        const day = field(box, 'Munkanap', edit.work_date, 'date');
        day.oninput = () => { edit.work_date = day.value; this.changed(); };
        for (const [key, title] of [['description', 'Elvégzett feladatok'], ['note', 'Megjegyzés'], ['subcontractor', 'Alvállalkozó']]) {
            const e = field(box, title, edit.document[key] ?? '', key === 'subcontractor' ? 'text' : 'textarea');
            e.oninput = () => { edit.document[key] = e.value; this.changed(); };
        }
        const teams = fold(box, 'Csapatok és időpontok (' + edit.document.teams.length + ')', true);
        edit.document.teams.forEach((team, i) => { const row = fold(teams, 'Csapat ' + (i + 1), true); for (const [key, label, type] of [['size', 'Létszám', 'number'], ['arrival', 'Érkezés', 'time'], ['departure', 'Távozás', 'time']]) {
            const e = field(row, label, String(team[key] ?? ''), type);
            e.oninput = () => { team[key] = key === 'size' ? Number(e.value) : e.value; if (key === 'size')
                team.people = []; this.changed(); };
        } if (this.role === 'office') {
            const price = field(row, 'Irodai munkadíj – Ft / főóra (elhagyható)', team.unit_price ?? '');
            price.oninput = () => { if (price.value) {
                team.unit_price = price.value.replace(',', '.');
                team.price_confirmed = true;
            }
            else {
                delete team.unit_price;
                delete team.price_confirmed;
            } this.changed(); };
        } button(row, 'Csapat eltávolítása', () => { edit.document.teams.splice(i, 1); this.changed(); this.renderEditor(); }); });
        if (edit.document.teams.length < 3)
            button(teams, 'Csapat hozzáadása', () => { edit.document.teams.push({ id: crypto.randomUUID(), size: 1, arrival: '08:00', departure: '16:00', people: [] }); this.changed(); this.renderEditor(); });
        const rows = fold(box, 'Felhasznált anyagok és egyéb tételek (' + edit.document.lines.length + ')', true);
        edit.document.lines.forEach((line, i) => {
            const row = fold(rows, line.kind === 'other' ? line.name || 'Egyéb tétel' : this.data.catalog.find((c) => c.code === line.code)?.label ?? 'Válassz tételt', true);
            if (line.kind === 'other') {
                for (const [key, label] of [['name', 'Megnevezés'], ['unit', 'Mértékegység'], ['unit_price', 'Végleges egységár – Ft']]) {
                    const e = field(row, label, line[key] ?? '');
                    e.oninput = () => { line[key] = e.value; this.changed(); };
                }
            }
            else {
                const search = field(row, 'Tétel keresése – legalább két betű');
                const catalog = choice(row, 'Katalógustétel', [], line.code);
                const fill = () => { const q = clean(search.value), all = this.data.catalog.filter((c) => c.code !== 'labor' && (c.active || c.code === line.code) && (q.length < 2 || clean(c.label).includes(q))).sort((a, b) => a.label.localeCompare(b.label, 'hu')); catalog.replaceChildren(new Option('Válassz tételt', ''), ...all.map((c) => new Option(c.label + ' · ' + c.unit, c.code))); catalog.value = all.some((c) => c.code === line.code) ? line.code : ''; };
                fill();
                search.oninput = fill;
                catalog.onchange = () => { line.code = catalog.value; delete line.unit_price; delete line.price_confirmed; this.changed(); };
                if (this.role === 'office') {
                    const p = field(row, 'Irodai egyedi egységár – Ft (elhagyható)', line.unit_price ?? '');
                    p.oninput = () => { if (p.value) {
                        line.unit_price = p.value.replace(',', '.');
                        line.price_confirmed = true;
                    }
                    else {
                        delete line.unit_price;
                        delete line.price_confirmed;
                    } this.changed(); };
                }
            }
            const qty = field(row, 'Mennyiség', line.quantity ?? '');
            qty.oninput = () => { line.quantity = qty.value; this.changed(); };
            button(row, 'Tétel eltávolítása', () => { edit.document.lines.splice(i, 1); this.changed(); this.renderEditor(); });
        });
        if (edit.document.lines.length < 200) {
            button(rows, 'Katalógustétel hozzáadása', () => { edit.document.lines.push({ id: crypto.randomUUID(), kind: 'catalog', code: '', quantity: '1' }); this.changed(); this.renderEditor(); });
            button(rows, 'Egyéb tétel hozzáadása', () => { edit.document.lines.push({ id: crypto.randomUUID(), kind: 'other', name: '', unit: 'db', quantity: '1', unit_price: '' }); this.changed(); this.renderEditor(); });
        }
        const rentals = fold(box, 'Gépbérlések');
        for (let i = 0; i < 3; i++) {
            const e = field(rentals, 'Gépbérlés ' + (i + 1), edit.document.rentals?.[i] ?? '');
            e.oninput = () => { edit.document.rentals ??= []; edit.document.rentals[i] = e.value; this.changed(); };
        }
        button(box, 'Munkalap mentési előnézete', () => { void this.prepare({ kind: 'save', ...structuredClone(this.edit) }); });
    }
    claimForm(box, s) { const d = fold(box, this.role === 'client' ? 'Fizetés és számlázás jelzése' : 'Elszámoltam a megrendelővel / fizetési jelzés'); d.append(n('p', 'A jelzés még nem igazolt befizetés. A tényleges beérkezést az iroda ellenőrzi.')); const amount = field(d, 'Jelzett összeg – Ft'), method = choice(d, 'Fizetési mód', [['cash', this.role === 'client' ? 'Készpénzzel fizetek / fizettem' : 'Készpénzt átvettem'], ['transfer', 'Átutalási jelzés']]), kind = choice(d, 'Számlázás', [['person', 'Magánszemély'], ['company', 'Cég'], ['condominium', 'Társasház']]), name = field(d, 'Számlázási név', this.data.context.project.customer), address = field(d, 'Számlázási cím'), tax = field(d, 'Adószám (ha szükséges)'), day = field(d, 'Fizetés / átvétel napja', new Date().toLocaleDateString('sv-SE'), 'date'); button(d, 'Fizetési jelzés előnézete', () => { void this.prepare({ kind: 'cash_claim', worksheet_id: s.id, revision: s.revision, amount: amount.value.replace(',', '.'), method: method.value, billing_kind: kind.value, billing_name: name.value, billing_address: address.value, tax_number: tax.value, work_date: day.value }); }); }
    async prepare(command, global = false) { if (this.busy || this.pending)
        return; if (!navigator.onLine) {
        this.persist();
        this.message('Internet nélkül a helyi piszkozat megmarad. Mentéshez és közzétételhez internet szükséges.');
        return;
    } const epoch = this.epoch; this.busy = true; this.lock(true); try {
        const scope = { ...this.scope(), ...(global ? { project_id: null } : {}) };
        const preview = await this.api.maintenance('maintenance_preview', { ...scope, command });
        if (epoch !== this.epoch)
            return;
        this.command = { ...scope, command };
        this.preview = preview;
        this.previewBox.replaceChildren();
        const box = fold(this.previewBox, command.kind === 'publish' ? 'Teljes áras közzétételi előnézet' : 'Művelet előnézete', true);
        if (preview.preview.computed)
            this.renderSheet(box, preview.preview.computed);
        else if (command.kind === 'catalog')
            box.append(n('p', command.label + ' · ' + command.unit + ' · ' + money(command.unit_price)));
        else if (command.kind === 'cash_claim')
            box.append(n('strong', (command.method === 'cash' && this.role !== 'client' ? 'Elszámoltam a megrendelővel, a pénzt átvettem: ' : 'Fizetési jelzés: ') + money(command.amount)), n('p', 'Irodai igazolásig nem számít befizetésnek.'));
        else if (command.kind === 'request')
            box.append(n('p', command.description), n('p', 'Kért nap: ' + (command.day || 'Nincs megadva') + ' · Irodai jóváhagyás szükséges.'));
        else
            box.append(n('p', { approve: 'Karbantartás jóváhagyása: ' + command.day, reject: 'Igény elutasítása', withdraw_request: 'Saját igény visszavonása', withdraw_sheet: 'Munkalap visszavonása az aktuális elszámolásból', restore_sheet: 'Munkalap helyreállítása az elszámolásba', withdraw_claim: 'Fizetési jelzés visszavonása', reject_claim: 'Fizetési jelzés elutasítása' }[command.kind] ?? ''), n('p', command.reason ?? ''));
        const confirm = field(box, command.kind === 'publish' ? 'Ellenőriztem a teljes munkalapot és valamennyi árat.' : 'Ellenőriztem az adatokat.', '', 'checkbox');
        button(box, command.kind === 'publish' ? 'Közzététel az ügyfélnek' : command.kind === 'save' ? 'Piszkozat mentése' : 'Megerősítés és mentés', () => { if (!confirm.checked) {
            this.message('Mentés előtt pipáld be az adatok ellenőrzését.');
            return;
        } void this.save(); });
        button(box, 'Vissza a szerkesztéshez', () => { this.command = undefined; this.preview = undefined; this.previewBox.replaceChildren(); });
        box.scrollIntoView({ block: 'nearest' });
    }
    catch (e) {
        if (epoch === this.epoch)
            this.error(e);
    }
    finally {
        if (epoch === this.epoch) {
            this.busy = false;
            this.lock(false);
        }
    } }
    async save(retry = false) { if (this.busy || !this.org || !this.owner)
        return; if (!retry) {
        if (!this.preview || !this.command)
            return;
        this.pending = { ...structuredClone(this.command), request_id: crypto.randomUUID(), preview_token: this.preview.token, confirmed: true };
        this.persist();
    } if (!this.pending || this.pending.organization_id !== this.org || this.pending.role !== this.role)
        return; const epoch = this.epoch, key = this.key(); this.busy = true; this.reading = false; this.lock(true); try {
        const result = await this.api.maintenance('maintenance_write', this.pending);
        if (epoch !== this.epoch)
            return;
        try {
            localStorage.removeItem(key);
        }
        catch { }
        this.clearEditor();
        if (result.project_id && !this.project.value)
            this.project.replaceChildren(new Option('Betöltés…', result.project_id));
        this.busy = false;
        await this.load(result.worksheet_id ?? undefined);
        this.message(result.kind === 'publish' ? 'A munkalapot közzétettük; a jogosult ügyfél már látja.' : result.kind === 'cash_claim' ? 'A fizetési jelzést rögzítettük. Irodai igazolásra vár.' : 'A karbantartási műveletet sikeresen mentettük.', true);
    }
    catch (e) {
        if (epoch !== this.epoch)
            return;
        if ([409, 422].includes(e?.status)) {
            this.pending = undefined;
            this.command = undefined;
            this.preview = undefined;
            this.previewBox.replaceChildren();
            this.persist();
        }
        else {
            this.previewBox.replaceChildren();
            button(this.previewBox, 'Az eredeti mentés újrapróbálása', () => { void this.save(true); });
        }
        this.error(e);
    }
    finally {
        if (epoch === this.epoch) {
            this.busy = false;
            this.lock(false);
        }
    } }
    pdfActions(box, sheet, version) { const p = this.pdfLinks.get(sheet + '/' + version); if (!p)
        return; const d = fold(box, 'Elkészült PDF', true); const a = document.createElement('a'); a.href = p.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'PDF megnyitása'; const b = document.createElement('a'); b.href = p.url; b.download = p.filename; b.textContent = 'PDF letöltése'; d.append(a, n('span', ' · '), b); }
    async pdf(sheet, version) { if (this.busy)
        return; const epoch = this.epoch; this.busy = true; this.reading = true; this.lock(true); try {
        const value = await this.api.maintenance('maintenance_pdf', { ...this.scope(), worksheet_id: sheet, filter: { version } });
        if (epoch !== this.epoch)
            return;
        const bytes = Uint8Array.from(atob(value.pdf), (c) => c.charCodeAt(0)), url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        const key = sheet + '/' + version, old = this.pdfLinks.get(key);
        if (old)
            URL.revokeObjectURL(old.url);
        this.pdfLinks.set(key, { url, filename: value.filename });
        if (this.pdfLinks.size > 10) {
            const first = this.pdfLinks.keys().next().value;
            URL.revokeObjectURL(this.pdfLinks.get(first).url);
            this.pdfLinks.delete(first);
        }
        this.pdfActions(this.body, sheet, version);
        this.message('A PDF elkészült. A megnyitási vagy letöltési hivatkozással eléred.', true);
    }
    catch (e) {
        if (epoch === this.epoch)
            this.error(e);
    }
    finally {
        if (epoch === this.epoch) {
            this.busy = false;
            this.reading = false;
            this.lock(false);
        }
    } }
}
