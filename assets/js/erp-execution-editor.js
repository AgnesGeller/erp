import { normalizeExecutionCatalog, moveExecutionPart, validateExecutionGraph } from './erp-execution-model.js';
import { attachSorter } from './erp-sortable.js';
const n = (tag, text = '') => { const x = document.createElement(tag); x.textContent = text; return x; };
const num = (v) => new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 2 }).format(Number(v ?? 0));
function btn(parent, title, run) { const b = n('button', title); b.type = 'button'; b.className = 'quiet'; b.onclick = run; parent.append(b); return b; }
function input(parent, title, value, change, type = 'text') { const l = n('label', title), x = document.createElement(type === 'textarea' ? 'textarea' : 'input'); if (type !== 'textarea')
    x.type = type; x.value = String(value ?? ''); if (type === 'number') {
    x.min = '0';
    x.step = 'any';
} x.oninput = () => change(x.value); l.append(x); parent.append(l); return x; }
function pick(parent, title, value, options, change) { const l = n('label', title), x = document.createElement('select'); x.replaceChildren(...options.map(([id, name]) => new Option(name, id))); x.value = value; x.onchange = () => change(x.value); l.append(x); parent.append(l); return x; }
function fold(parent, title, open = false) { const d = document.createElement('details'); d.className = 'erp-disclosure'; d.open = open; d.append(n('summary', title)); parent.append(d); return d; }
function reorder(items, at, delta) { const copy = [...items], to = at + delta; if (to < 0 || to >= copy.length)
    return copy; [copy[at], copy[to]] = [copy[to], copy[at]]; return copy; }
function dragHandle(parent, title) { const head = parent.querySelector(':scope > summary') ?? parent; const h = btn(head, '↕', () => { }); h.onclick = e => { e.preventDefault(); e.stopPropagation(); }; h.dataset.sortHandle = 'true'; h.className = 'sort-handle quiet'; h.setAttribute('aria-label', title + ' húzása'); h.title = 'Húzd a fogantyút; billentyűzettel a Feljebb / Lejjebb gombokat használd.'; }
/** Kategória és típusszintű részfolyamatok közös szerkesztője. */
export function renderProcessEditor(parent, holder, stages, change, inherited = true) {
    const box = fold(parent, 'Kivitelezési részfolyamatok');
    let cleanup;
    const paint = () => {
        cleanup?.();
        box.replaceChildren(n('summary', 'Kivitelezési részfolyamatok'));
        const own = holder.work_process && holder.work_process.inherit !== true;
        pick(box, 'Részfolyamatok forrása', own ? 'own' : 'inherit', inherited ? [['inherit', 'Kategória alapbeállítása'], ['own', 'Saját részfolyamatok']] : [['inherit', 'Még nincs megadva'], ['own', 'Saját részfolyamatok']], v => { holder.work_process = v === 'inherit' ? { inherit: true, steps: [] } : { inherit: false, steps: [] }; change(); paint(); });
        if (!own)
            return;
        const steps = holder.work_process.steps ??= [];
        const run = (fn) => { fn(); holder.work_process.steps.forEach((p, i) => p.sort = i); change(); paint(); };
        box.append(n('p', 'A munkadíj- és időarány összesen külön-külön 100% legyen. A meglévő ajánlatok alapját ez nem írja át.'));
        const list = n('div');
        list.dataset.sortContainer = 'process';
        box.append(list);
        steps.forEach((s, i) => { const d = fold(list, (i + 1) + '. ' + (s.title || 'Új részfolyamat')); d.dataset.sortId = s.id; dragHandle(d, 'Részfolyamat'); input(d, 'Részfolyamat neve', s.title, v => { s.title = v; change(); }); pick(d, 'Kivitelezési szakasz', s.stage_id ?? '', [['', 'Besorolásra vár'], ...stages.filter(x => x.active !== false).map(x => [x.id, x.number + '. ' + x.name])], v => { s.stage_id = v || null; change(); }); for (const [key, label] of [['labor_bps', 'Munkadíjarány (%)'], ['time_bps', 'Időarány (%)']]) {
            const x = input(d, label, Number(s[key] ?? 0) / 100, v => { s[key] = Math.round(Number(v) * 100); change(); }, 'number');
            x.max = '100';
            x.step = '0.01';
        } pick(d, 'Műveleti mennyiség', s.quantity_mode ?? 'parent', [['parent', 'Az ajánlati sor mennyisége'], ['manual', 'Kézzel megadott mennyiség'], ['field', 'Kiszámított méret']], v => run(() => { s.quantity_mode = v; s.quantity ??= '0'; s.unit ??= 'm²'; s.quantity_field ??= 'area'; })); if (s.quantity_mode === 'manual')
            input(d, 'Mennyiség', s.quantity, v => { s.quantity = v; change(); }, 'number'); if (s.quantity_mode === 'field')
            pick(d, 'Mennyiség forrása', s.quantity_field, [['quantity', 'Számított mennyiség'], ['area', 'Terület'], ['volume', 'Térfogat'], ['length', 'Hossz'], ['count', 'Darabszám']], v => { s.quantity_field = v; change(); }); if (s.quantity_mode !== 'parent')
            input(d, 'Mértékegység', s.unit, v => { s.unit = v; change(); }); input(d, 'Belső munkautasítás', s.description, v => { s.description = v; change(); }, 'textarea'); const deps = fold(d, 'Előfeltételek'); for (const other of steps.filter((x) => x.id !== s.id)) {
            const l = n('label', other.title || 'Részfolyamat'), x = document.createElement('input');
            x.type = 'checkbox';
            x.className = 'inline-check';
            x.checked = (s.dependencies ?? []).includes(other.id);
            x.onchange = () => { s.dependencies = x.checked ? [...(s.dependencies ?? []), other.id] : (s.dependencies ?? []).filter((id) => id !== other.id); change(); };
            l.prepend(x);
            deps.append(l);
        } btn(d, 'Feljebb', () => run(() => holder.work_process.steps = reorder(steps, i, -1))).disabled = i === 0; btn(d, 'Lejjebb', () => run(() => holder.work_process.steps = reorder(steps, i, 1))).disabled = i === steps.length - 1; btn(d, 'Részfolyamat kivétele', () => run(() => { holder.work_process.steps = steps.filter((x) => x !== s); for (const x of holder.work_process.steps)
            x.dependencies = (x.dependencies ?? []).filter((id) => id !== s.id); })); });
        btn(box, '+ Részfolyamat', () => run(() => steps.push({ id: crypto.randomUUID(), title: '', stage_id: null, sort: steps.length, labor_bps: steps.length ? 0 : 10000, time_bps: steps.length ? 0 : 10000, description: '', quantity_mode: 'parent', dependencies: [] })));
        cleanup = attachSorter(list, m => run(() => { const p = steps.find((x) => x.id === m.id), rest = steps.filter((x) => x.id !== m.id); rest.splice(m.before ? rest.findIndex((x) => x.id === m.before) : rest.length, 0, p); holder.work_process.steps = rest; }));
    };
    paint();
    return () => cleanup?.();
}
export class ExecutionDesk {
    api;
    afterSave;
    dialog;
    main;
    status;
    bar;
    epoch = 0;
    busy = false;
    changed = false;
    owner;
    org;
    mode = 'catalog';
    data;
    draft;
    scope = {};
    undo = [];
    redo = [];
    pending;
    sorters = [];
    constructor(api, afterSave) {
        this.api = api;
        this.afterSave = afterSave;
        this.dialog = document.createElement('dialog');
        this.dialog.className = 'office-dialog execution-dialog';
        this.dialog.setAttribute('aria-label', 'Kivitelezési szakaszok');
        const head = n('header');
        head.className = 'execution-head';
        head.append(n('h2', 'Kivitelezési szakaszok'));
        btn(head, '× Bezárás', () => this.close()).setAttribute('aria-label', 'Kivitelezési ablak bezárása');
        this.status = n('p');
        this.status.className = 'office-status';
        this.status.setAttribute('role', 'status');
        this.bar = n('div');
        this.bar.className = 'plan-actions';
        this.main = n('div');
        this.dialog.append(head, this.status, this.bar, this.main);
        document.body.append(this.dialog);
        this.dialog.addEventListener('cancel', e => { e.preventDefault(); this.close(); });
        window.addEventListener('beforeunload', e => { if (this.dirty) {
            e.preventDefault();
            e.returnValue = '';
        } });
        window.addEventListener('erp:before-update', e => { if (this.dirty)
            e.preventDefault(); });
    }
    get open() { return this.dialog.open; }
    get dirty() { return this.open && (this.changed || this.busy || !!this.pending); }
    setOwner(owner, org) { if (owner !== this.owner || org !== this.org) {
        this.epoch++;
        this.dialog.close();
        this.main.replaceChildren();
        this.draft = undefined;
        this.data = undefined;
        this.changed = false;
        this.busy = false;
        this.pending = undefined;
        this.cleanSorters();
    } this.owner = owner; this.org = org; }
    cleanSorters() { this.sorters.splice(0).forEach(fn => fn()); }
    leave() { if (this.busy) {
        this.message('A mentés folyamatban van. Várd meg a visszajelzést.');
        return false;
    } return !this.changed && !this.pending || confirm(this.pending ? 'A mentés eredménye még nem ismert. Bezárod az ablakot? Az eredeti kérés újrapróbálható.' : 'Bezárod a még nem mentett szakaszszerkesztést?'); }
    close() { if (!this.leave())
        return; this.epoch++; this.cleanSorters(); this.dialog.close(); this.changed = false; }
    message(text, ok = false) { this.status.textContent = (ok ? '✓ ' : '') + text; this.status.className = 'office-status' + (ok ? ' success' : ''); }
    edit(fn, render = false) { if (!this.draft || this.busy || this.pending)
        return; this.undo.push(structuredClone(this.draft)); if (this.undo.length > 80)
        this.undo.shift(); this.redo = []; fn(); this.changed = true; if (render)
        this.draw(); }
    async showPlan(owner, org, scope) { if (this.dirty && !this.leave())
        return; this.setOwner(owner, org); this.mode = 'plan'; this.scope = scope; await this.load('execution_edit'); }
    async showCatalog(owner, org) { if (this.dirty && !this.leave())
        return; this.setOwner(owner, org); this.mode = 'catalog'; this.scope = {}; await this.load('execution_catalog_read'); }
    args() { return this.mode === 'catalog' ? { organization_id: this.org } : this.scope; }
    pendingKey() { return 'diszkertek-erp-execution-pending/' + this.owner + '/' + this.org + '/' + this.mode + '/' + (this.scope.project_id ?? 'catalog'); }
    rememberPending() { if (!this.owner)
        return; try {
        if (this.pending)
            localStorage.setItem(this.pendingKey(), JSON.stringify({ pending: this.pending, data: this.data, draft: this.draft }));
        else
            localStorage.removeItem(this.pendingKey());
    }
    catch {
        this.message('A helyi megőrzés nem sikerült. A mentést ebben az ablakban újrapróbálhatod; a visszaigazolásig ne zárd be.');
    } }
    recoverPending() { try {
        const value = JSON.parse(localStorage.getItem(this.pendingKey()) ?? 'null');
        if (!value?.pending || !value.data || !value.draft || !['execution_write', 'execution_catalog_write'].includes(value.pending.action))
            return false;
        const args = value.pending.args;
        if (this.mode === 'plan' && (args.project_id !== this.scope.project_id || args.role !== this.scope.role) || this.mode === 'catalog' && args.organization_id !== this.org)
            return false;
        this.pending = value.pending;
        this.data = value.data;
        this.draft = value.draft;
        this.changed = true;
        return true;
    }
    catch {
        return false;
    } }
    async load(action, extra = {}) { if (!this.owner || this.busy)
        return; if (!this.dialog.open)
        this.dialog.showModal(); const epoch = ++this.epoch; this.busy = true; this.cleanSorters(); this.bar.replaceChildren(); this.main.replaceChildren(); this.message('Szakaszok betöltése…'); try {
        const data = await this.api.execution(action, { ...this.args(), ...extra });
        if (epoch !== this.epoch)
            return;
        this.data = data;
        this.draft = structuredClone(this.mode === 'catalog' ? data.document : data.layout);
        this.undo = [];
        this.redo = [];
        this.changed = false;
        this.pending = undefined;
        if (this.recoverPending())
            this.message('Korábbi mentés vár visszaigazolásra. Az eredeti kérést próbáld újra; az adatait megőriztük.');
        else
            this.message('A szakaszok betöltve. A módosítás külön mentéssel lép életbe.', true);
    }
    catch (e) {
        if (epoch === this.epoch)
            this.message(e instanceof Error ? e.message : 'A szakaszok nem tölthetők be.');
    }
    finally {
        if (epoch === this.epoch) {
            this.busy = false;
            this.draw();
        }
    } }
    draw() {
        this.cleanSorters();
        this.bar.replaceChildren();
        this.main.replaceChildren();
        if (!this.draft || !this.data)
            return;
        btn(this.bar, 'Mentés és ellenőrzés', () => void this.save()).disabled = this.busy;
        btn(this.bar, 'Visszavonás', () => { if (this.busy || this.pending || !this.undo.length)
            return; this.redo.push(structuredClone(this.draft)); this.draft = this.undo.pop(); this.changed = true; this.draw(); }).disabled = !this.undo.length || this.busy;
        btn(this.bar, 'Újra', () => { if (this.busy || this.pending || !this.redo.length)
            return; this.undo.push(structuredClone(this.draft)); this.draft = this.redo.pop(); this.changed = true; this.draw(); }).disabled = !this.redo.length || this.busy;
        if (this.pending)
            btn(this.bar, 'Mentés újrapróbálása', () => void this.send(this.pending));
        if (this.mode === 'catalog')
            this.catalog();
        else
            this.plan();
        if (this.busy || this.pending)
            this.main.querySelectorAll('input,textarea,select,button').forEach(x => x.disabled = true);
    }
    catalog() { const d = this.draft, stages = d.stages; this.main.append(n('p', 'A kategória és a típus részfolyamatainál a szakasz sorszáma határozza meg a közös munkarendet. A változtatás az új ajánlatokhoz használható.')); this.stageList(this.main, stages); const list = fold(this.main, 'Kategóriák alapértelmezett részfolyamatai'); for (const c of d.categories) {
        const box = fold(list, c.name || 'Új kategória');
        input(box, 'Kategória neve', c.name, v => this.edit(() => c.name = v));
        const holder = { work_process: structuredClone(c.process) };
        let prior = structuredClone(this.draft);
        renderProcessEditor(box, holder, stages, () => { this.undo.push(prior); this.redo = []; c.process = structuredClone(holder.work_process); this.changed = true; prior = structuredClone(this.draft); }, false);
        btn(box, 'Kategória kivétele', () => this.edit(() => d.categories = d.categories.filter((x) => x !== c), true));
    } btn(list, '+ Kategória', () => this.edit(() => d.categories.push({ id: crypto.randomUUID(), name: '', process: { inherit: true, steps: [] } }), true)); }
    stageList(parent, stages) { const list = fold(parent, 'Szakaszok sorrendje és neve'); const container = n('div'); container.dataset.sortContainer = 'stages'; list.append(container); stages.forEach((s, i) => { const box = fold(container, s.number + '. ' + s.name); box.dataset.sortId = s.id; dragHandle(box, 'Szakasz'); input(box, 'Szakasz neve', s.name, v => this.edit(() => s.name = v)); input(box, 'Szakasz sorszáma', s.number, v => this.edit(() => s.number = Number(v)), 'number'); for (const [key, label] of [['opening', 'Nyitószakasz'], ['closing', 'Zárószakasz']]) {
        const l = n('label', label), x = document.createElement('input');
        x.type = 'checkbox';
        x.className = 'inline-check';
        x.checked = s[key] === true;
        x.onchange = () => this.edit(() => s[key] = x.checked);
        l.prepend(x);
        box.append(l);
    } if (s.unassigned) {
        const l = n('label', 'A szakasz besorolása végleges'), x = document.createElement('input');
        x.type = 'checkbox';
        x.className = 'inline-check';
        x.onchange = () => this.edit(() => s.unassigned = !x.checked);
        l.prepend(x);
        box.append(l);
    } const shift = (delta) => this.edit(() => { const next = reorder(stages, i, delta); stages.splice(0, stages.length, ...next); stages.forEach((x, j) => x.sort = j); }, true); btn(box, 'Feljebb', () => shift(-1)).disabled = i === 0; btn(box, 'Lejjebb', () => shift(1)).disabled = i === stages.length - 1; btn(box, 'Üres szakasz kivétele', () => { if (this.mode === 'plan' && this.draft.parts.some((p) => p.stage_id === s.id)) {
        this.message('Előbb helyezd át a szakasz részfeladatait.');
        return;
    } this.edit(() => { stages.splice(i, 1); stages.forEach((x, j) => x.sort = j); }, true); }); }); btn(list, '+ Szakasz', () => this.edit(() => stages.push({ id: crypto.randomUUID(), name: '', number: Math.max(0, ...stages.map((s) => s.number)) + 1, sort: stages.length, opening: false, closing: false, active: true }), true)); this.sorters.push(attachSorter(container, m => { this.edit(() => { const item = stages.find((s) => s.id === m.id), rest = stages.filter((s) => s.id !== m.id); rest.splice(m.before ? rest.findIndex((s) => s.id === m.before) : rest.length, 0, item); stages.splice(0, stages.length, ...rest); stages.forEach((s, i) => s.sort = i); }, true); }, t => this.message(t))); }
    plan() {
        const d = this.draft, source = new Map((this.data.source_tasks ?? []).map((t) => [t.id, t]));
        this.main.append(n('p', 'Az ajánlati területek és árak változatlanok. Itt a kivitelezés közös szakaszait, részfeladatait és sorrendjét állítod össze.'));
        if (this.data.plan.execution_mode === 'legacy')
            this.main.append(n('p', 'A régi munkaterv az ellenőrzött átállásig továbbra is használható. A korábbi átvételek hivatkozott előzményként maradnak meg.'));
        btn(this.main, 'Újraszerkesztés a jelenlegi részfolyamat-alapokból', () => { if (this.changed && !confirm('Újra összeállítod a helyi szerkesztést? A mentett munkaterv ettől még nem változik.'))
            return; void this.load('execution_generate', { use_current_catalog: true }); });
        const versions = fold(this.main, 'Korábbi elrendezések szerkesztése');
        versions.append(n('p', 'A visszaállítás új, ellenőrzött mentés lesz; az átvételeket és előzményeket nem törli.'));
        let revision = '';
        pick(versions, 'Mentett elrendezés', '', [['', 'Válassz változatot'], ...(this.data.history ?? []).map((h) => [String(h.revision), h.revision + '. változat · ' + new Date(h.created_at).toLocaleString('hu-HU')])], v => revision = v);
        input(versions, 'Korábbi változatszám', revision, v => revision = v, 'number');
        btn(versions, 'Korábbi elrendezés megnyitása', () => { if (!revision || this.changed && !confirm('Megnyitod a korábbi elrendezést a helyi szerkesztés helyett?'))
            return; void this.load('execution_edit', { layout_revision: Number(revision) }); });
        this.stageList(this.main, d.stages);
        const root = n('div');
        root.className = 'execution-board';
        this.main.append(root);
        for (const stage of d.stages) {
            const box = fold(root, stage.number + '. ' + stage.name, true), list = n('div');
            list.className = 'execution-stage';
            list.dataset.sortContainer = stage.id;
            box.append(list);
            const parts = d.parts.filter((p) => p.stage_id === stage.id).sort((a, b) => a.sort - b.sort);
            if (!parts.length)
                list.append(n('p', 'Ide húzhatsz részfeladatot.'));
            for (const p of parts) {
                const src = source.get(p.parent_task_id), row = fold(list, (src ? src.section + ' / ' + src.title + ' · ' : '') + (p.title || 'Új részfeladat'));
                row.dataset.sortId = p.id;
                dragHandle(row, 'Részfeladat');
                row.append(n('p', src ? src.section + ' · ' + src.title : 'Belső munkalépés'), n('small', num(p.quantity) + ' ' + p.unit + ' · ' + num(p.labor) + ' Ft munkadíjsúly'));
                input(row, 'Részfeladat neve', p.title, v => this.edit(() => p.title = v));
                input(row, 'Belső munkautasítás', p.description, v => this.edit(() => p.description = v), 'textarea');
                pick(row, 'Szakasz', p.stage_id, d.stages.map((s) => [s.id, s.number + '. ' + s.name]), v => this.move(p.id, v, null));
                if ((this.data.plan.execution_mode !== 'parts' || p.derive_from_part_id) && p.parent_task_id) {
                    for (const [key, label] of [['labor_bps', 'Munkadíjarány (%)'], ['time_bps', 'Időarány (%)']]) {
                        const x = input(row, label, Number(p[key]) / 100, v => this.edit(() => p[key] = Math.round(Number(v) * 100)), 'number');
                        x.max = '100';
                        x.step = '0.01';
                    }
                }
                for (const [key, label, type] of [['quantity', 'Műveleti mennyiség', 'number'], ['unit', 'Mértékegység', 'text'], ['start_date', 'Tervezett kezdés', 'date'], ['end_date', 'Tervezett befejezés', 'date']])
                    input(row, label, p[key], v => this.edit(() => p[key] = v || (['start_date', 'end_date'].includes(key) ? null : '')), type);
                const deps = fold(row, 'Előfeltételek – nélkülük párhuzamosan is kezdhető');
                for (const other of d.parts.filter((x) => x.id !== p.id)) {
                    const l = n('label', other.title), x = document.createElement('input');
                    x.type = 'checkbox';
                    x.className = 'inline-check';
                    x.checked = (p.dependencies ?? []).includes(other.id);
                    x.onchange = () => this.edit(() => p.dependencies = x.checked ? [...(p.dependencies ?? []), other.id] : (p.dependencies ?? []).filter((id) => id !== other.id));
                    l.prepend(x);
                    deps.append(l);
                }
                const at = parts.indexOf(p);
                btn(row, 'Feljebb', () => this.move(p.id, stage.id, parts[at - 1]?.id ?? p.id)).disabled = at === 0;
                btn(row, 'Lejjebb', () => this.move(p.id, stage.id, parts[at + 2]?.id ?? null)).disabled = at === parts.length - 1;
                if (p.parent_task_id)
                    btn(row, 'Részfeladat bontása', () => this.edit(() => { const clone = structuredClone(p); if (this.data.plan.execution_mode === 'parts' && !p.derive_from_part_id) {
                        const original = p.id;
                        p.id = crypto.randomUUID();
                        p.derive_from_part_id = original;
                        clone.derive_from_part_id = original;
                    } clone.id = crypto.randomUUID(); clone.template_key = crypto.randomUUID(); clone.title = ''; clone.labor_bps = 0; clone.time_bps = 0; clone.dependencies = []; clone.sort = p.sort + 1; d.parts.push(clone); }, true));
                if (!p.parent_task_id || this.data.plan.execution_mode !== 'parts')
                    btn(row, 'Részfeladat kivétele', () => this.edit(() => { d.parts = d.parts.filter((x) => x.id !== p.id); for (const x of d.parts)
                        x.dependencies = (x.dependencies ?? []).filter((id) => id !== p.id); }, true));
            }
            btn(box, '+ Belső munkalépés', () => this.edit(() => d.parts.push({ id: crypto.randomUUID(), parent_task_id: null, template_key: null, stage_id: stage.id, title: '', description: '', sort: parts.length, quantity: '1', unit: 'alkalom', labor_bps: 0, time_bps: 0, planned_minutes: '0', dependencies: [], start_date: null, end_date: null }), true));
        }
        this.sorters.push(attachSorter(root, m => this.move(m.id, m.container, m.before), t => this.message(t)));
    }
    move(id, stage, before) { try {
        const moved = moveExecutionPart(this.draft, id, stage, before);
        this.edit(() => this.draft = moved, true);
    }
    catch (e) {
        this.message(e instanceof Error ? e.message : 'Az áthelyezés nem lehetséges.');
    } }
    async save() { if (!this.owner || !this.draft || !this.data || this.busy)
        return; if (this.pending) {
        await this.send(this.pending);
        return;
    } try {
        if (this.mode === 'catalog') {
            const document = normalizeExecutionCatalog(this.draft);
            await this.send({ action: 'execution_catalog_write', args: { ...this.args(), request_id: crypto.randomUUID(), revision: this.data.revision, document } });
            return;
        }
        validateExecutionGraph(this.draft.parts, this.draft.stages);
        const epoch = this.epoch;
        this.busy = true;
        this.draw();
        this.message('Átvételek, időkeretek és munkadíjsúlyok ellenőrzése…');
        const preview = await this.api.execution('execution_preview', { ...this.args(), revision: this.data.plan.revision, layout: this.draft });
        if (epoch !== this.epoch)
            return;
        this.busy = false;
        this.draw();
        if (!preview.checks.preserved)
            throw Error('A módosítás megváltoztatná a korábbi átvételeket vagy időkeretet. Ellenőrizd a bontási arányokat.');
        if (preview.layout.issues.length)
            throw Error(preview.layout.issues.join(' '));
        if (!confirm('Mentjük a szakaszokat és a részfeladatokat? Az ellenőrzés szerint az átvételi alapok és időkeretek megmaradnak.'))
            return;
        await this.send({ action: 'execution_write', args: { ...this.args(), request_id: crypto.randomUUID(), revision: this.data.plan.revision, layout: this.draft, fingerprint: preview.fingerprint, catalog_revision: this.data.catalog.revision, activate: true } });
    }
    catch (e) {
        this.busy = false;
        this.draw();
        this.message(e instanceof Error ? e.message : 'A módosítás nem menthető.');
    } }
    async send(pending) { if (this.busy || !this.owner)
        return; this.pending = structuredClone(pending); this.rememberPending(); this.busy = true; const epoch = this.epoch; this.draw(); this.main.querySelectorAll('input,textarea,select,button').forEach(x => x.disabled = true); this.message('Mentés…'); try {
        await this.api.execution(pending.action, pending.args);
        if (epoch !== this.epoch)
            return;
        this.pending = undefined;
        this.rememberPending();
        this.changed = false;
        this.busy = false;
        await this.load(this.mode === 'catalog' ? 'execution_catalog_read' : 'execution_edit');
        this.message('A kivitelezési beállításokat mentettük.', true);
        this.afterSave();
    }
    catch (e) {
        if (epoch !== this.epoch)
            return;
        const status = e && typeof e === 'object' && 'status' in e ? Number(e.status) : 0;
        if ([400, 401, 403, 409, 422].includes(status)) {
            this.pending = undefined;
            this.rememberPending();
        }
        this.busy = false;
        this.draw();
        this.message(e instanceof Error ? e.message : 'A mentés eredménye nem ismert. Próbáld újra az eredeti kéréssel.');
    } }
}
