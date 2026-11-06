import { ExecutionDesk } from './erp-execution-editor.js';
const { quoteNumber, EditHistory } = await import(new URL('./erp-quote-tools.js?v=0.16.5', import.meta.url).href);
const { WorkMedia } = await import(new URL('./erp-workplan-media.js?v=0.16.5', import.meta.url).href);
const el = (id) => document.getElementById(id);
const node = (tag, text = '') => { const x = document.createElement(tag); x.textContent = text; return x; };
const names = { office: 'Iroda', construction_lead: 'Építésvezető', construction_worker: 'Kertépítő', gardener: 'Kertész', client: 'Megrendelő' };
const levels = ['Kertész / Kertépítő', 'Építésvezető', 'Iroda', 'Megrendelő'];
const eventNames = { init: 'Munkaterv létrehozva', graph: 'Munkasorrend vagy ütemezés módosítva', accept: 'Átvétel', reject: 'Javításra visszaküldve', shares: 'Teljesítménymegosztás módosítva', time: 'Munkaidőterv módosítva', color: 'Személyszín módosítva', contract: 'Jóváhagyott ajánlati változás' };
const rank = (role) => role === 'client' ? 4 : role === 'office' ? 3 : role === 'construction_lead' ? 2 : 1;
const hours = (v) => v === null || v === undefined ? 'Nincs megadva' : quoteNumber(Number(v) / 60) + ' emberóra';
function button(parent, text, run) { const b = node('button', text); b.type = 'button'; b.className = 'quiet'; b.addEventListener('click', run); parent.append(b); return b; }
function fold(parent, title, open = false) { const d = document.createElement('details'); d.className = 'erp-disclosure'; d.open = open; d.append(node('summary', title)); parent.append(d); return d; }
function field(parent, label, value, change, type = 'text') { const l = node('label', label), x = document.createElement(type === 'textarea' ? 'textarea' : 'input'); if (type !== 'textarea')
    x.type = type; x.value = value; x.addEventListener('input', () => change(x.value)); l.append(x); parent.append(l); return x; }
export class WorkPlanDesk {
    api;
    onError;
    workTab = 'tasks';
    groupByStage = true;
    execution;
    workpack;
    setWorkpackDesk(desk) { this.workpack = desk; }
    openWorkpack() { if (this.busy || !this.owner || !this.organization || !this.view || !this.workpack)
        return; if (this.dirty) {
        this.message('Előbb mentsd vagy fejezd be a szerkesztést.');
        return;
    } this.workpack.show(this.owner, this.organization, this.scope()); }
    materials;
    sheets;
    organization;
    isClient = false;
    entries;
    epoch = 0;
    request = 0;
    owner;
    projects = [];
    view;
    draft = [];
    history = new EditHistory();
    changed = false;
    pending;
    media = new WorkMedia();
    dragged;
    forms = new Map();
    formChanged = new Set();
    locked = new Map();
    cursor = null;
    allHistory = false;
    reading = false;
    busy = false;
    constructor(api, onError) {
        this.api = api;
        this.onError = onError;
        this.execution = new ExecutionDesk(api, () => { void this.refreshAfterEntry(); });
        el('show-workplan').addEventListener('click', () => { void this.open(); });
        el('plan-close').addEventListener('click', () => { if (this.leave()) {
            this.cancelRead();
            el('plan-dialog').close();
        } });
        el('plan-dialog').addEventListener('cancel', e => { if (!this.leave())
            e.preventDefault();
        else
            this.cancelRead(); });
        el('plan-project').addEventListener('change', () => { if (this.leave())
            void this.selectProject();
        else
            el('plan-project').value = this.view?.context.project.id ?? ''; });
        el('plan-role').addEventListener('change', () => { if (this.leave())
            void this.load();
        else
            el('plan-role').value = this.view?.context.role ?? ''; });
        el('plan-refresh').addEventListener('click', () => { if (this.leave())
            void this.load(); });
        setInterval(() => { if (el('plan-dialog').open && !document.hidden && navigator.onLine && !this.busy && !this.dirty && !this.entries?.open && !this.sheets?.open && !this.materials?.open && !this.execution.open)
            void this.load(); }, 60000);
        el('plan-retry').addEventListener('click', () => { if (this.pending)
            void this.send(this.pending.action, this.pending.args, true); });
        window.addEventListener('beforeunload', e => { if (this.dirty || this.busy) {
            e.preventDefault();
            e.returnValue = '';
        } });
        window.addEventListener('erp:before-update', e => { if (this.busy || (this.dirty && !confirm('Frissíted az alkalmazást? A még nem mentett munkatervi módosítások elvésznek.')))
            e.preventDefault(); });
    }
    setMaterialDesk(desk) { this.materials = desk; desk.setOwner(this.owner, this.organization); }
    openMaterials(line) { if (!this.owner || !this.organization || !this.view || !this.materials || this.busy)
        return; if (this.dirty) {
        this.message('Előbb fejezd be vagy mentsd a jelenlegi szerkesztést.');
        return;
    } void this.materials.show(this.owner, this.organization, this.scope(), line); }
    setWorksheetDesk(desk) { this.sheets = desk; desk.setOwner(this.owner, this.organization); }
    openSheets() { if (!this.owner || !this.organization || !this.view || !this.sheets || this.busy)
        return; if (this.dirty) {
        this.message('Előbb fejezd be vagy mentsd a jelenlegi szerkesztést.');
        return;
    } void this.sheets.show(this.owner, this.organization, this.scope()); }
    setEntryDesk(desk) { this.entries = desk; desk.setOwner(this.owner); }
    async refreshAfterEntry() { if (this.owner && !this.busy && !this.dirty)
        await this.load(); }
    openEntries(entry, target) { if (!this.entries || !this.owner || !this.view || this.busy)
        return; if (this.dirty) {
        this.message('Előbb mentsd a munkaterv szerkesztését és az esetleges függő műveletet.');
        return;
    } void this.entries.show(this.owner, this.scope(), entry, target); }
    get entryBusy() { return this.materials?.saving === true || this.entries?.saving === true || this.sheets?.saving === true; }
    get dirty() { return this.execution.dirty || this.materials?.open === true && this.materials?.dirty === true || this.sheets?.open === true && this.sheets?.dirty === true || this.entries?.dirty === true || this.changed || !!this.pending || this.formChanged.size > 0; }
    setOwner(owner, organization, isClient = false) { if (this.owner !== owner || this.organization !== organization) {
        this.reset();
        this.owner = owner;
        if (owner) {
            try {
                const raw = localStorage.getItem('diszkertek-erp-plan-pending/' + owner);
                if (raw) {
                    const p = JSON.parse(raw);
                    if (['plan_init', 'plan_graph', 'plan_task', 'plan_color'].includes(p.action) && p.args && typeof p.args === 'object')
                        this.pending = p;
                }
            }
            catch { /* A hálózati újrapróbálás ebben a munkamenetben továbbra is elérhető. */ }
        }
    } this.organization = organization; this.execution.setOwner(owner, organization); this.isClient = isClient; this.materials?.setOwner(owner, organization); this.sheets?.setOwner(owner, organization); this.entries?.setOwner(owner); el('show-workplan').hidden = !owner; }
    reset() { this.execution?.setOwner(undefined); this.workTab = 'tasks'; this.workpack?.reset(); this.materials?.setOwner(undefined); this.sheets?.setOwner(undefined); this.organization = undefined; this.isClient = false; this.entries?.setOwner(undefined); this.epoch++; this.request++; this.owner = undefined; this.view = undefined; this.projects = []; this.draft = []; this.changed = false; this.pending = undefined; this.busy = false; this.reading = false; this.history.reset(); this.forms.clear(); this.formChanged.clear(); this.locked.clear(); el('plan-view').replaceChildren(); el('plan-notifications').replaceChildren(); el('show-workplan').hidden = true; el('plan-dialog').close(); }
    cancelRead() { if (this.reading) {
        this.epoch++;
        this.request++;
        this.busy = false;
        this.reading = false;
        this.lock(false);
    } }
    leave() { if (this.execution.open && !this.execution.leave())
        return false; if (this.materials?.open && !this.materials.leave())
        return false; if (this.sheets?.open && !this.sheets.leave())
        return false; if (this.entries?.open && !this.entries.leave())
        return false; if (this.busy && !this.reading) {
        this.message('A mentés még folyamatban van. Várd meg a visszajelzést.');
        return false;
    } return (!this.dirty || confirm(this.pending ? 'A mentés eredménye még nem ismert. Megnézed újra az adatokat? Az eredeti kérés újrapróbálható marad.' : 'Elhagyod a még nem mentett munkatervi szerkesztést?')); }
    message(text, ok = false) { el('plan-feedback').textContent = (ok ? '✓ ' : '') + text; el('plan-feedback').className = 'office-status ' + (ok ? 'success' : ''); el('plan-retry').hidden = !this.pending; }
    lock(value) { if (value) {
        for (const x of Array.from(el('plan-dialog').querySelectorAll('input,textarea,button,select'))) {
            if (x.id === 'plan-close' || x.hasAttribute('data-erp-dismiss'))
                continue;
            if (!this.locked.has(x))
                this.locked.set(x, x.disabled);
            x.disabled = true;
        }
    }
    else {
        for (const [x, disabled] of this.locked)
            x.disabled = disabled;
        this.locked.clear();
    } }
    scope() { return { project_id: el('plan-project').value, role: el('plan-role').value }; }
    async open() { if (!this.owner || this.busy)
        return; const dialog = el('plan-dialog'); if (!dialog.open)
        dialog.showModal(); const epoch = this.epoch; this.busy = true; this.reading = true; this.lock(true); this.message('Kertépítések és teendők betöltése…'); try {
        const [projects, notes] = await Promise.all([this.api.plan('plan_projects'), this.api.plan('plan_notifications')]);
        if (epoch !== this.epoch)
            return;
        this.projects = projects;
        const old = this.view?.context.project.id, select = el('plan-project');
        select.replaceChildren(new Option('Válassz kertépítést', ''), ...projects.sort((a, b) => a.name.localeCompare(b.name, 'hu')).map(p => new Option(p.name + ' · ' + p.address, p.id)));
        select.value = projects.some(p => p.id === old) ? old : projects[0]?.id ?? '';
        this.renderNotes(notes);
        this.message(projects.length ? 'Válassz munkát és szerepkört.' : 'Még nincs hozzád rendelt, ajánlatból indított kertépítés.');
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
    } if (epoch === this.epoch && this.projects.length)
        await this.selectProject();
    else if (epoch === this.epoch) {
        this.view = undefined;
        el('plan-view').replaceChildren();
    } }
    async selectProject() { const p = this.projects.find(p => p.id === el('plan-project').value), select = el('plan-role'); const wanted = this.view?.context.role; select.replaceChildren(...(p?.roles ?? []).map((r) => new Option(names[r] ?? r, r))); if (p?.roles.includes(wanted))
        select.value = wanted; await this.load(); }
    async load() { if (!this.owner || this.busy)
        return; const scope = this.scope(); if (!scope.project_id || !scope.role) {
        el('plan-view').replaceChildren();
        return;
    } const epoch = this.epoch, request = ++this.request; this.busy = true; this.reading = true; this.lock(true); try {
        const view = await this.api.plan('plan_read', scope);
        if (epoch !== this.epoch || request !== this.request)
            return;
        this.view = view;
        this.draft = view.tasks.map((t) => ({ id: t.id, title: t.title, sort: t.sort, start_date: t.start_date, end_date: t.end_date, dependencies: [...t.dependencies], internal_info: t.internal_info ?? '' }));
        this.history.reset(this.draft);
        this.forms.clear();
        this.formChanged.clear();
        this.changed = false;
        this.cursor = null;
        this.allHistory = false;
        this.render();
        this.message('A munkaterv adatai naprakészek.', true);
    }
    catch (e) {
        if (epoch === this.epoch) {
            this.view = undefined;
            el('plan-view').replaceChildren();
            this.error(e);
        }
    }
    finally {
        if (epoch === this.epoch) {
            this.busy = false;
            this.reading = false;
            this.lock(false);
        }
    } }
    error(e) { this.message(e instanceof Error ? e.message : 'A munkaterv nem tölthető be.'); if (!this.api.signedIn)
        this.onError(e); }
    touch(group) { this.changed = true; this.history.remember(this.draft, group); }
    rememberPending() { if (!this.owner)
        return; try {
        const key = 'diszkertek-erp-plan-pending/' + this.owner;
        if (this.pending)
            localStorage.setItem(key, JSON.stringify(this.pending));
        else
            localStorage.removeItem(key);
    }
    catch { /* A bezárásvédelmet és a memóriabeli újrapróbálást megtartjuk. */ } }
    async send(action, args, retry = false) { if (this.busy || !this.owner)
        return; if (!retry && [...this.formChanged].some(id => action !== 'plan_task' || id !== args.task_id) && !confirm('A mentés után újratöltjük a munkát. Elveted a más munkafázisokhoz tartozó, még nem rögzített mezőket?'))
        return; if (this.pending && !retry) {
        this.message('Előbb próbáld újra az előző mentést, hogy ne legyen kettős rögzítés.');
        return;
    } const epoch = this.epoch; this.pending = { action, args: structuredClone(args) }; this.rememberPending(); this.reading = false; this.busy = true; this.lock(true); this.message('Mentés…'); let success = false; try {
        await this.api.plan(action, args);
        if (epoch !== this.epoch)
            return;
        this.pending = undefined;
        this.rememberPending();
        success = true;
        this.changed = false;
    }
    catch (e) {
        if (epoch === this.epoch) {
            if (e && typeof e === 'object' && 'status' in e && [400, 401, 403, 409, 422].includes(Number(e.status))) {
                this.pending = undefined;
                this.rememberPending();
            }
            this.error(e);
        }
    }
    finally {
        if (epoch === this.epoch) {
            this.busy = false;
            this.reading = false;
            this.lock(false);
        }
    } if (success && epoch === this.epoch) {
        await this.load();
        if (epoch === this.epoch)
            this.message('A műveletet mentettük.', true);
    } }
    renderNotes(notes) { const box = el('plan-notifications'); box.replaceChildren(); if (this.sheets && this.owner && this.organization && !this.isClient)
        button(box, 'Saját rögzített munkaidő', () => { if (!this.busy && this.owner && this.organization)
            void this.sheets.showMine(this.owner, this.organization); }); const d = fold(box, 'Teendőim és értesítéseim (' + notes.filter(n => !n.completed_at).length + ')'); for (const n of notes) {
        const p = this.projects.find(p => p.id === n.project_id);
        const row = node('div');
        row.className = 'plan-note';
        const labels = { review: 'Átvételre vár', repair: 'Javítás szükséges', attribution: 'Résztvevők pontosítása', assignment: 'Munkatársi hozzárendelés szükséges', info: 'Változás a munkán', entry: 'Bejegyzés feldolgozásra vár', material: 'Anyag átvehető a telephelyen', finance: 'Pénzügyi teendő', maintenance: 'Karbantartási teendő' };
        button(row, (labels[n.kind] ?? 'Értesítés') + ' · ' + (p?.name ?? n.title ?? 'Korábbi munka') + (n.completed_at ? ' · Elintézve' : ''), () => { if ((!p && !['maintenance', 'finance'].includes(n.kind)) || !this.leave())
            return; void this.goNote(n); });
        row.append(node('small', new Date(n.created_at).toLocaleString('hu-HU')));
        d.append(row);
    } if (!notes.length)
        d.append(node('p', 'Nincs új értesítés.')); }
    maintenanceHandler;
    setMaintenanceHandler(fn) { this.maintenanceHandler = fn; }
    financeHandler;
    setFinanceHandler(fn) { this.financeHandler = fn; }
    async goNote(n) { if (n.kind === 'maintenance') {
        this.maintenanceHandler?.(n.project_id, n.role, n.id);
        return;
    } if (n.kind === 'finance') {
        this.financeHandler?.(n.project_id, n.role);
        return;
    } const epoch = this.epoch; try {
        await this.api.plan('plan_notifications', { notification_id: n.id });
        if (epoch !== this.epoch)
            return;
        el('plan-project').value = n.project_id;
        await this.selectProject();
        if (n.kind === 'material') {
            if (n.role && Array.from(el('plan-role').options).some(o => o.value === n.role)) {
                el('plan-role').value = n.role;
                await this.load();
            }
            this.openMaterials(n.line_id);
            return;
        }
        if (n.entry_id) {
            if (n.role && Array.from(el('plan-role').options).some(o => o.value === n.role)) {
                el('plan-role').value = n.role;
                await this.load();
            }
            this.openEntries(n.entry_id);
            return;
        }
        const detail = el('plan-view').querySelector('[data-task-id="' + n.task_id + '"]');
        if (detail) {
            detail.open = true;
            detail.scrollIntoView({ block: 'nearest' });
        }
    }
    catch (e) {
        if (epoch === this.epoch)
            this.error(e);
    } }
    graphControls(parent) { if (!this.view?.context.can_edit || this.view.execution)
        return; const bar = node('div'); bar.className = 'plan-actions'; button(bar, 'Munkaterv mentése', () => { void this.send('plan_graph', { ...this.scope(), request_id: crypto.randomUUID(), revision: this.view.plan.revision, tasks: this.draft }); }); button(bar, 'Visszavonás', () => { const d = this.history.undo(); if (d) {
        this.draft = d;
        this.changed = true;
        this.render();
    } }); button(bar, 'Újra', () => { const d = this.history.redo(); if (d) {
        this.draft = d;
        this.changed = true;
        this.render();
    } }); button(bar, 'Helyi módosítások visszaállítása', () => { if (!this.dirty || confirm('Visszaállítod a legutóbb betöltött munkatervet?')) {
        this.draft = this.view.tasks.map((t) => ({ id: t.id, title: t.title, sort: t.sort, start_date: t.start_date, end_date: t.end_date, dependencies: [...t.dependencies], internal_info: t.internal_info ?? '' }));
        this.history.reset(this.draft);
        this.changed = false;
        this.render();
    } }); parent.append(bar); }
    render() {
        if (!this.view)
            return;
        const v = this.view, root = el('plan-view'), opened = new Set(Array.from(root.querySelectorAll('details[data-task-id][open]')).map(d => d.dataset.taskId));
        root.replaceChildren();
        root.append(node('h2', v.context.project.name), node('p', v.context.project.address));
        if (v.context.can_edit && this.owner && this.organization) {
            button(root, 'Szakaszok és részfeladatok', () => { if (!this.dirty && !this.busy)
                void this.execution.showPlan(this.owner, this.organization, this.scope());
            else
                this.message('Előbb fejezd be vagy mentsd a szerkesztést.'); });
            button(root, 'Szakaszok alapbeállításai', () => { if (!this.dirty && !this.busy)
                void this.execution.showCatalog(this.owner, this.organization);
            else
                this.message('Előbb fejezd be vagy mentsd a szerkesztést.'); });
        }
        if (this.workpack)
            button(root, 'Munkacsomag / PDF', () => this.openWorkpack());
        if (['office', 'client'].includes(v.context.role))
            button(root, 'Pénzügyek', () => { if (!this.busy && !this.dirty)
                this.financeHandler?.(v.context.project.id, v.context.role);
            else
                this.message('Előbb fejezd be vagy mentsd a szerkesztést.'); });
        if (this.entries)
            button(root, 'Változások és kérések', () => this.openEntries());
        if (this.sheets && v.context.role !== 'client')
            button(root, 'Napi munkalap', () => this.openSheets());
        if (this.materials)
            button(root, 'Anyagok', () => this.openMaterials());
        if (!v.plan) {
            this.renderTime(root);
            root.append(node('p', 'A részletes munkaterv még nincs összeállítva.'));
            if (v.context.can_edit)
                button(root, 'Munkaterv létrehozása az elfogadott ajánlatból', () => { void this.send('plan_init', { ...this.scope(), request_id: crypto.randomUUID() }); });
            return;
        }
        const taskPanel = node('div'), progressPanel = node('div'), historyPanel = node('div'), tabs = node('nav');
        tabs.className = 'plan-view-tabs';
        tabs.setAttribute('aria-label', 'A kiválasztott kertépítés részei');
        const panels = { tasks: taskPanel, progress: progressPanel, history: historyPanel };
        for (const [key, title] of [['tasks', 'Feladatok és átvétel'], ['progress', 'Előrehaladás és munkaidő'], ['history', 'Előzmények és statisztika']]) {
            const b = button(tabs, title, () => { this.workTab = key; for (const [id, panel] of Object.entries(panels))
                panel.hidden = id !== key; for (const x of Array.from(tabs.querySelectorAll('button')))
                x.setAttribute('aria-pressed', String(x === b)); });
            b.setAttribute('aria-pressed', String(key === this.workTab));
            panels[key].hidden = key !== this.workTab;
        }
        root.append(tabs, taskPanel, progressPanel, historyPanel);
        const bands = node('div');
        bands.className = 'plan-bands';
        for (const b of v.bands) {
            const row = node('div');
            row.append(node('strong', levels[b.level] + ' · ' + (b.percent === null ? 'Nincs súlyozható munkadíj' : quoteNumber(b.percent) + '%')));
            const track = node('div');
            track.className = 'plan-track';
            track.setAttribute('role', 'meter');
            track.setAttribute('aria-label', levels[b.level]);
            track.setAttribute('aria-valuemin', '0');
            track.setAttribute('aria-valuemax', '100');
            if (b.percent !== null)
                track.setAttribute('aria-valuenow', String(b.percent));
            for (const s of b.segments) {
                const seg = node('span');
                seg.style.width = Math.max(0, Math.min(100, s.percent ?? 0)) + '%';
                seg.style.backgroundColor = s.color;
                seg.title = s.name + ' · ' + quoteNumber(s.percent) + '%';
                track.append(seg);
            }
            row.append(track, node('small', 'Teljesített tervidő: ' + hours(b.completed_minutes) + ' · Hátralévő: ' + hours(b.remaining_minutes) + (b.zero_total ? ' · Nullás munkadíjú fázisok: ' + b.zero_done + '/' + b.zero_total : '')));
            bands.append(row);
        }
        progressPanel.append(bands);
        this.renderTime(progressPanel);
        if (v.context.role !== 'client') {
            const people = fold(progressPanel, 'Személyenkénti teljesítés és színek');
            for (const b of v.bands)
                for (const s of b.segments) {
                    const row = node('p', levels[b.level] + ' · ' + s.name + ': ' + quoteNumber(s.percent) + '%');
                    const swatch = node('span');
                    swatch.className = 'plan-swatch';
                    swatch.style.backgroundColor = s.color;
                    row.prepend(swatch);
                    people.append(row);
                }
            if (v.context.role === 'office')
                for (const p of v.people) {
                    const x = field(people, p.name + ' színe', p.color, () => { }, 'color');
                    button(people, 'Szín mentése – ' + p.name, () => { void this.send('plan_color', { organization_id: this.projects.find(p => p.id === v.context.project.id)?.organization_id, person_id: p.id, color: x.value, revision: p.color_revision ?? 0 }); });
                }
        }
        taskPanel.append(node('p', v.context.can_act ? 'Az átvétel a kiválasztott munkaszerepeddel történik.' : 'A kertépítés még nem indult el; átvétel most nem rögzíthető.'));
        if (!v.execution) {
            const editPanel = fold(taskPanel, 'Munkasorrend és ütemezés szerkesztése');
            this.graphControls(editPanel);
        }
        else {
            const grouping = node('label', 'Feladatok megjelenítése'), pick = document.createElement('select');
            pick.add(new Option('Kivitelezési szakaszok szerint', 'stages'));
            pick.add(new Option('Eredeti területek szerint', 'areas'));
            pick.value = this.groupByStage ? 'stages' : 'areas';
            pick.onchange = () => { this.groupByStage = pick.value === 'stages'; this.render(); };
            grouping.append(pick);
            taskPanel.append(grouping);
        }
        const timeline = fold(taskPanel, 'Idővonal és párhuzamos munkafázisok');
        this.calendar(timeline);
        for (const t of this.draft.slice().sort((a, b) => a.sort - b.sort)) {
            const depth = v.layout.find((x) => x.id === t.id)?.lane ?? 0;
            const row = node('div');
            row.className = 'plan-timeline-row';
            row.style.setProperty('--lane', String(Math.min(depth, 8)));
            row.append(node('strong', t.title), node('span', (t.start_date ?? 'Kezdés nincs megadva') + ' → ' + (t.end_date ?? 'Befejezés nincs megadva')), node('small', t.dependencies.length ? 'Előfeltétel: ' + t.dependencies.map(id => this.draft.find(t => t.id === id)?.title ?? 'Fázis').join('; ') : 'Önállóan, párhuzamosan is kezdhető'));
            timeline.append(row);
        }
        const tasks = node('div');
        tasks.className = 'plan-tasks';
        const ordered = this.draft.slice().sort((a, b) => v.execution && this.groupByStage ? ((v.stages.find((s) => s.id === v.tasks.find((t) => t.id === a.id)?.stage_id)?.sort ?? 0) - (v.stages.find((s) => s.id === v.tasks.find((t) => t.id === b.id)?.stage_id)?.sort ?? 0) || a.sort - b.sort) : a.sort - b.sort);
        let lastGroup = '';
        for (const draft of ordered) {
            const t = v.tasks.find((t) => t.id === draft.id), stage = v.stages?.find((s) => s.id === t.stage_id), group = v.execution && this.groupByStage ? (stage?.number + '. ' + stage?.name) : t.section;
            if (v.execution && group !== lastGroup) {
                tasks.append(node('h3', group));
                lastGroup = group;
            }
            const d = fold(tasks, t.section + ' · ' + (v.execution && t.source_title ? t.source_title + ' → ' : '') + draft.title, opened.has(t.id));
            d.dataset.taskId = t.id;
            if (v.context.can_edit && !v.execution) {
                d.draggable = true;
                d.addEventListener('dragstart', e => { if (e.target.closest('input,textarea,select,button')) {
                    e.preventDefault();
                    return;
                } this.dragged = t.id; });
                d.addEventListener('dragover', e => e.preventDefault());
                d.addEventListener('drop', e => { e.preventDefault(); if (this.dragged)
                    this.moveTo(this.dragged, t.id); this.dragged = undefined; });
            }
            d.append(node('p', quoteNumber(t.quantity) + ' ' + t.unit + ' · Átvételi kör: ' + (t.round + 1)), node('p', 'Eredeti tervidő: ' + hours(t.original_minutes) + ' · Aktuális tervidő: ' + hours(t.planned_minutes)));
            const checks = node('div');
            checks.className = 'plan-checks';
            for (const a of t.acceptance) {
                const c = node('span', levels[a.level] + ': ' + (a.explicit ? '✓' : '—'));
                c.title = a.explicit ? 'Ténylegesen rögzített átvétel' : a.reference ? 'A korábbi valódi átvétel hivatkozott alapként számít; ezen a részfeladaton még nincs új pipa.' : a.accepted ? 'A számított előrehaladást a magasabb átvétel már növeli; ezen a szinten még nincs tényleges pipa.' : 'Még nincs átvétel.';
                checks.append(c);
            }
            d.append(checks);
            if (this.entries)
                button(d, 'Bejegyzés ehhez a munkafázishoz', () => this.openEntries(undefined, t.source_line_id));
            if (t.contract_label && t.contract_label !== t.title)
                d.append(node('p', 'Aktuális ajánlati tartalom: ' + t.contract_label));
            if (v.context.role === 'office')
                d.append(node('p', 'Ajánlati munkadíj: ' + quoteNumber(t.labor) + ' Ft'));
            if (t.contract_note)
                d.append(node('p', t.contract_note));
            if (t.contract_info && t.contract_info !== t.internal_info)
                d.append(node('p', 'Aktuális ajánlati munkautasítás: ' + t.contract_info));
            if (t.internal_info)
                d.append(node('p', t.internal_info));
            if (v.context.can_edit && !v.execution)
                this.editTask(d, draft);
            if (t.baseline_active)
                d.append(node('small', 'A számított előrehaladás a korábbi valódi átvételekre hivatkozik; új pipa csak külön átvétellel keletkezik.'));
            if (t.needs_classification)
                d.append(node('p', 'Az iroda még ellenőrzi és besorolja a módosított munkatartalmat. Átvétel ezután rögzíthető.'));
            else if (v.context.can_act)
                this.taskActions(d, t);
        }
        taskPanel.append(tasks);
        this.renderHistory(historyPanel);
        if (v.context.role !== 'client')
            this.statistics(historyPanel);
        const media = fold(historyPanel, 'Fotók átvitele másik eszközre');
        media.append(node('p', 'A fotók ezen az eszközön maradnak. A csomag a megjelenített előzményekhez tartozó, számodra látható fotókat viszi át. A régebbi fotókhoz előbb töltsd be a korábbi előzményeket.'));
        button(media, 'Munkaterv és fotók letöltése', () => { void this.transfer(); });
        const upload = field(media, 'Munkatervcsomag megnyitása', '', () => { }, 'file');
        upload.accept = '.zip,application/zip';
        upload.addEventListener('change', () => { if (upload.files?.[0])
            void this.transfer(upload.files[0]); });
    }
    renderTime(parent) { const t = this.view?.time; if (!t)
        return; const box = node('section'); box.className = 'sheet-time-band'; box.append(node('strong', 'Tényleges munkaidő · ' + (t.percent === null ? 'Nincs megadott, pozitív tervidő' : quoteNumber(t.percent) + '%'))); if (t.percent !== null) {
        const pct = Number(t.percent), scale = Math.max(100, Math.ceil(pct / 100) * 100), track = node('div');
        track.className = 'plan-track sheet-time-track';
        track.setAttribute('role', 'meter');
        track.setAttribute('aria-label', 'Tényleges munkaidő felhasználása');
        track.setAttribute('aria-valuemin', '0');
        track.setAttribute('aria-valuemax', String(scale));
        track.setAttribute('aria-valuenow', String(pct));
        track.setAttribute('aria-valuetext', quoteNumber(t.percent) + ' százalék');
        for (const segment of t.segments) {
            const span = node('span');
            span.style.width = (Number(t.planned_minutes) > 0 ? Number(segment.minutes) / Number(t.planned_minutes) * 100 / scale * 100 : 0) + '%';
            span.style.backgroundColor = segment.color;
            span.title = segment.name + ' · ' + hours(segment.minutes);
            track.append(span);
        }
        const target = node('i');
        target.className = 'sheet-time-marker';
        target.style.left = (100 / scale * 100) + '%';
        target.title = 'Tervezett idő: 100%';
        track.append(target);
        box.append(track, node('small', '0% → ' + quoteNumber(scale) + '% · jelölő: 100%'));
    } box.append(node('p', 'Felhasznált: ' + hours(t.actual_minutes) + ' · Aktuális terv: ' + hours(t.planned_minutes) + ' · Fennmaradó: ' + hours(t.remaining_minutes)), node('small', '7 óra = 1 munkanap · 5 munkanap = 1 munkahét')); if (this.view.context.role !== 'client') {
        const details = fold(box, 'Munkaidő részletezése');
        for (const p of t.segments)
            details.append(node('p', p.name + ' · ' + hours(p.minutes)));
    } parent.append(box); }
    calendar(parent) { const dated = this.draft.filter(t => t.start_date && t.end_date); if (!dated.length)
        return; const day = (s) => Date.parse(s + 'T12:00:00Z') / 86400000, min = Math.min(...dated.map(t => day(t.start_date))), max = Math.max(...dated.map(t => day(t.end_date))), span = Math.max(1, max - min + 1); parent.append(node('p', new Date(min * 86400000).toISOString().slice(0, 10) + ' → ' + new Date(max * 86400000).toISOString().slice(0, 10))); for (const t of dated) {
        const row = node('div');
        row.className = 'plan-calendar-row';
        row.append(node('small', t.title));
        const track = node('div');
        track.className = 'plan-calendar-track';
        const bar = node('span');
        bar.style.marginLeft = ((day(t.start_date) - min) / span * 100) + '%';
        bar.style.width = (Math.max(1, day(t.end_date) - day(t.start_date) + 1) / span * 100) + '%';
        bar.title = t.start_date + ' → ' + t.end_date;
        track.append(bar);
        row.append(track);
        parent.append(row);
    } }
    editTask(parent, t) { const edit = fold(parent, 'Sorrend, ütemezés és belső utasítás'); for (const [key, label, type] of [['title', 'Munkafázis neve', 'text'], ['start_date', 'Tervezett kezdés', 'date'], ['end_date', 'Tervezett befejezés', 'date'], ['internal_info', 'Belső munkautasítás', 'textarea']]) {
        const x = field(edit, label, String(t[key] ?? ''), value => { t[key] = value || (['start_date', 'end_date'].includes(key) ? null : ''); this.touch(x); }, type);
        x.maxLength = key === 'internal_info' ? 12000 : 500;
    } const deps = fold(edit, 'Előfeltételek'); for (const other of this.draft.filter(x => x.id !== t.id)) {
        const label = node('label', other.title), x = document.createElement('input');
        x.type = 'checkbox';
        x.className = 'inline-check';
        x.checked = t.dependencies.includes(other.id);
        x.addEventListener('change', () => { t.dependencies = x.checked ? [...t.dependencies, other.id] : t.dependencies.filter(id => id !== other.id); this.touch(); });
        label.prepend(x);
        deps.append(label);
    } button(edit, 'Feljebb', () => this.move(t.id, -1)); button(edit, 'Lejjebb', () => this.move(t.id, 1)); }
    move(id, delta) { const list = this.draft.slice().sort((a, b) => a.sort - b.sort), index = list.findIndex(t => t.id === id), target = index + delta; if (target < 0 || target >= list.length)
        return; [list[index], list[target]] = [list[target], list[index]]; list.forEach((t, i) => t.sort = i); this.draft = list; this.touch(); this.render(); }
    moveTo(id, target) { if (id === target)
        return; const list = this.draft.slice().sort((a, b) => a.sort - b.sort), moving = list.find(t => t.id === id); if (!moving)
        return; const remaining = list.filter(t => t.id !== id); remaining.splice(remaining.findIndex(t => t.id === target), 0, moving); remaining.forEach((t, i) => t.sort = i); this.draft = remaining; this.touch(); this.render(); }
    taskActions(parent, t) {
        const cached = this.forms.get(t.id);
        if (cached) {
            parent.append(cached);
            return;
        }
        const wrapper = node('div');
        wrapper.addEventListener('input', () => this.formChanged.add(t.id));
        wrapper.addEventListener('change', () => this.formChanged.add(t.id));
        parent.append(wrapper);
        this.forms.set(t.id, wrapper);
        parent = wrapper;
        const v = this.view, role = v.context.role, r = rank(role), form = fold(parent, 'Átvétel és javítás');
        let level = r - 1;
        const label = node('label', 'Átvételi szint'), select = document.createElement('select');
        for (const l of role === 'client' ? [3] : Array.from({ length: r }, (_, i) => i))
            select.add(new Option(levels[l], String(l)));
        select.value = String(level);
        label.append(select);
        form.append(label);
        const subjects = fold(form, 'Kinek számoljuk el az átvételt?');
        const paintSubjects = () => { subjects.replaceChildren(node('summary', 'Kinek számoljuk el az átvételt?')); level = Number(select.value); const ids = (v.subjects[String(level)] ?? []).filter((id) => r === 1 || role === 'client' ? id === v.context.person_id : true); for (const id of ids) {
            const label = node('label', v.people.find((p) => p.id === id)?.name ?? 'Saját átvétel'), x = document.createElement('input');
            x.type = 'checkbox';
            x.className = 'inline-check';
            x.value = id;
            x.checked = id === v.context.person_id;
            label.prepend(x);
            subjects.append(label);
        } };
        paintSubjects();
        select.addEventListener('change', paintSubjects);
        const reason = field(form, 'Megjegyzés / visszaküldés indoka', '', () => { }, 'textarea');
        reason.maxLength = 4000;
        const visible = node('label', 'A megjegyzést és fotókat a megrendelő is láthatja'), visibility = document.createElement('input');
        visibility.type = 'checkbox';
        visibility.className = 'inline-check';
        visibility.checked = role === 'client';
        visibility.disabled = role === 'client';
        visible.prepend(visibility);
        if (role !== 'client')
            form.append(visible);
        let photos = [];
        let removedPhoto;
        const photoList = node('div'), photo = field(form, 'Fotók – több kép is választható', '', () => { }, 'file');
        photo.accept = 'image/jpeg,image/png,image/webp';
        photo.multiple = true;
        photo.addEventListener('change', () => { void addPhotos(); });
        form.append(photoList);
        const paintPhotos = () => { photoList.replaceChildren(); for (const m of photos) {
            const row = node('p', m.name);
            button(row, 'Kép kivétele', () => { removedPhoto = m; photos = photos.filter(x => x.id !== m.id); this.formChanged.add(t.id); paintPhotos(); });
            photoList.append(row);
        } if (removedPhoto)
            button(photoList, 'Kép visszaállítása', () => { photos.push(removedPhoto); removedPhoto = undefined; this.formChanged.add(t.id); paintPhotos(); }); };
        const addPhotos = async () => { if (this.busy || !this.owner)
            return; const owner = this.owner, project = v.context.project.id, epoch = this.epoch; this.busy = true; this.lock(true); try {
            for (const file of Array.from(photo.files ?? [])) {
                if (photos.length >= 12)
                    throw Error('Egy művelethez legfeljebb 12 fotót válassz.');
                const ref = await this.media.add(owner, project, file, visibility.checked ? 'client' : 'team');
                if (epoch !== this.epoch)
                    return;
                photos.push(ref);
                this.formChanged.add(t.id);
            }
            paintPhotos();
            this.message('A fotókat erre az eszközre mentettük. Az átvételt vagy visszaküldést külön rögzítsd.', true);
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
                photo.value = '';
            }
        } };
        const command = (type, extra = {}) => { if (this.changed) {
            this.message('Előbb mentsd a munkaterv szerkesztését.');
            return;
        } void this.send('plan_task', { ...this.scope(), task_id: t.id, execution_part: t.execution_part === true, revision: t.revision, quote_version: v.context.project.quote_version, request_id: crypto.randomUUID(), command: { type, reason: reason.value, visibility: visibility.checked ? 'client' : 'team', media: photos.map(m => ({ ...m, visibility: visibility.checked ? 'client' : 'team' })), ...extra } }); };
        button(form, role === 'client' ? 'Munkafázis átvétele' : 'Átvétel rögzítése', () => { const selected = Array.from(subjects.querySelectorAll('input:checked')).map(x => x.value); if (!selected.length) {
            this.message('Válaszd ki az átvételhez tartozó személyt.');
            return;
        } command('accept', { level, subjects: selected }); });
        if (r >= 2) {
            const recipientLabel = node('label', 'Javítás címzettje'), recipient = document.createElement('select');
            recipient.add(new Option('Automatikus címzett', ''));
            for (const p of v.repair_recipients)
                recipient.add(new Option(p.name, p.id));
            recipientLabel.append(recipient);
            form.append(recipientLabel);
            button(form, 'Javításra visszaküldés', () => { if (!reason.value.trim()) {
                this.message('Írd le a javításra visszaküldés okát.');
                reason.focus();
                return;
            } if (!confirm('Javításra visszaküldöd ezt a munkafázist? Új átvételi kör kezdődik, a korábbi átvételek megmaradnak az előzményekben.'))
                return; command('reject', recipient.value ? { recipient: recipient.value } : {}); });
        }
        if (role !== 'client') {
            const shares = fold(parent, 'Teljesítménymegosztás · ' + (t.share_lock === 3 ? 'csak iroda' : t.share_lock === 2 ? 'vezető / iroda' : 'munkavégzők is módosíthatják'));
            if (r < t.share_lock) {
                shares.append(node('p', 'Ezt a megosztást magasabb jogosultsági szint zárolta.'));
            }
            else {
                const inputs = [];
                const ids = r === 1 ? [...new Set(t.acceptance[0].actors?.flatMap((a) => a.subjects) ?? [])] : v.subjects['0'];
                for (const id of ids) {
                    const person = v.people.find((p) => p.id === id);
                    const x = field(shares, person?.name ?? 'Korábbi résztvevő', quoteNumber((t.shares.find((s) => s.person_id === id)?.basis_points ?? 0) / 100, false), () => { }, 'number');
                    x.min = '0';
                    x.max = '100';
                    x.step = '0.01';
                    inputs.push({ person_id: id, input: x });
                }
                button(shares, 'Megosztás mentése', () => { const result = inputs.filter(x => Number(x.input.value) > 0).map(x => ({ person_id: x.person_id, basis_points: Math.round(Number(x.input.value) * 100) })); if (result.reduce((s, x) => s + x.basis_points, 0) !== 10000) {
                    this.message('A megosztás összege pontosan 100% legyen.');
                    return;
                } command('shares', { shares: result }); });
            }
        }
        if (role === 'office') {
            const time = fold(parent, 'Munkaidőterv módosítása');
            const minutes = field(time, 'Tervezett emberperc', t.planned_minutes === null ? '' : quoteNumber(t.planned_minutes, false), () => { }, 'number');
            minutes.min = '0';
            minutes.step = 'any';
            button(time, 'Időterv mentése', () => command('time', { minutes: minutes.value }));
        }
    }
    renderHistory(parent) { const v = this.view, history = fold(parent, 'Előzmények és fotók'); for (const e of v.events) {
        const row = node('div');
        row.className = 'plan-history-row';
        const title = new Date(e.created_at).toLocaleString('hu-HU') + ' · ' + (eventNames[e.kind] ?? 'Módosítás') + ' · ' + (v.people.find((p) => p.id === e.actor_id)?.name ?? names[e.role] ?? 'Résztvevő');
        row.append(node('strong', title));
        if (e.task_id)
            row.append(node('p', v.tasks.find((t) => t.id === e.task_id)?.title ?? 'Munkafázis'));
        if (e.reason)
            row.append(node('p', e.reason));
        if (e.recipient)
            row.append(node('p', 'Javítás címzettje: ' + (v.people.find((p) => p.id === e.recipient)?.name ?? 'Korábbi résztvevő')));
        if (e.after?.shares?.length)
            row.append(node('p', 'Megosztás: ' + e.after.shares.map((s) => (v.people.find((p) => p.id === s.person_id)?.name ?? 'Résztvevő') + ' ' + quoteNumber(s.basis_points / 100) + '%').join('; ')));
        for (const m of e.media ?? [])
            button(row, 'Fotó letöltése – ' + m.name, () => { if (this.owner)
                void this.media.show(this.owner, v.context.project.id, m).catch(error => this.error(error)); });
        if (v.context.can_edit && e.kind === 'graph' && Array.isArray(e.before))
            button(row, 'Ezt a korábbi munkatervet szerkesztem', () => { if (this.leave() && confirm('A korábbi sorrendet és ütemezést töltöd be szerkesztésre? Csak új mentés után lép életbe, az átvételek megmaradnak.')) {
                this.draft = structuredClone(e.before);
                this.touch();
                this.render();
            } });
        history.append(row);
    } if (!this.allHistory)
        button(history, 'Korábbi előzmények betöltése', () => { void this.moreHistory(); }); }
    async moreHistory() { if (!this.view || this.busy)
        return; const epoch = this.epoch; this.busy = true; this.reading = true; this.lock(true); try {
        const r = this.view.execution ? await this.api.execution('execution_history', { ...this.scope(), cursor: this.cursor }) : await this.api.plan('plan_history', { ...this.scope(), cursor: this.cursor });
        if (epoch !== this.epoch)
            return;
        this.cursor = r.cursor;
        this.allHistory = !r.cursor;
        const seen = new Set(this.view.events.map((e) => e.id));
        this.view.events.push(...r.events.filter((e) => !seen.has(e.id)));
        this.render();
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
    statistics(parent) { const d = fold(parent, 'Visszaküldések és elsőre elfogadott munkák'); const from = field(d, 'Időszak kezdete', '', () => { }, 'date'), until = field(d, 'Időszak vége', '', () => { }, 'date'), output = node('div'); const label = node('label', 'Gyors időszak'), period = document.createElement('select'); for (const [id, name] of [['custom', 'Egyéni'], ['day', 'Mai nap'], ['week', 'Ezen a héten'], ['month', 'Ebben a hónapban'], ['year', 'Ebben az évben']])
        period.add(new Option(name, id)); label.append(period); d.prepend(label); period.addEventListener('change', () => { if (period.value === 'custom')
        return; const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Budapest' }).format(new Date()), date = new Date(today + 'T12:00:00Z'); until.value = today; if (period.value === 'week')
        date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7); if (period.value === 'month')
        date.setUTCDate(1); if (period.value === 'year') {
        date.setUTCMonth(0);
        date.setUTCDate(1);
    } from.value = date.toISOString().slice(0, 10); }); button(d, 'Statisztika lekérése', () => { void (async () => { if (this.busy)
        return; const epoch = this.epoch; this.busy = true; this.reading = true; this.lock(true); try {
        const rows = await this.api.plan('plan_statistics', { ...this.scope(), from: from.value || null, until: until.value || null });
        if (epoch !== this.epoch)
            return;
        output.replaceChildren();
        for (const r of rows) {
            output.append(node('p', r.name + ' · Visszaküldések: ' + r.returns + ' · Elsőre elfogadott: ' + (r.completed_tasks ? quoteNumber(r.first_pass_tasks / r.completed_tasks * 100) + '%' : 'Még nincs adat')));
            for (const s of r.returned_by ?? [])
                output.append(node('small', 'Visszaküldő: ' + s.name + ' · ' + s.count + ' alkalom'));
            for (const s of r.repair_recipients ?? [])
                output.append(node('small', 'Javítási címzett: ' + s.name + ' · ' + s.count + ' alkalom'));
        }
        if (!rows.length)
            output.append(node('p', 'Ebben az időszakban még nincs megjeleníthető esemény.'));
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
    } })(); }); d.append(output); }
    async transfer(file) { if (!this.owner || !this.view || this.busy)
        return; const epoch = this.epoch, owner = this.owner, view = this.view; this.busy = true; this.lock(true); try {
        const count = file ? await this.media.import(owner, view, file) : await this.media.export(owner, view);
        if (epoch === this.epoch)
            this.message(file ? 'A csomagból ' + count + ' fotót mentettünk erre az eszközre.' : count ? 'A csomag letöltése elindult; ' + count + ' fotó nincs ezen az eszközön.' : 'A munkatervcsomag letöltése elindult.', true);
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
