import { normalizeReference, normalizeReferenceVariant, referenceFromSource, makeReferenceVariant, referencePlain, moveReferencePhoto, referenceGroups } from './erp-reference-model.js';
import { ReferenceFiles, ReferenceLocal } from './erp-reference-files.js';
import { addDialogDismiss } from './erp-dialogs.js';
import { attachSorter, sortableHandle } from './erp-sortable.js';
const n = (tag, text = '') => { const e = document.createElement(tag); e.textContent = text; return e; };
function button(parent, title, action) { const b = document.createElement('button'); b.type = 'button'; b.className = 'quiet'; b.textContent = title; b.onclick = action; parent.append(b); return b; }
function fold(parent, title, open = false) { const d = document.createElement('details'); d.className = 'erp-disclosure'; d.open = open; d.append(n('summary', title)); parent.append(d); return d; }
const labels = { web: 'Weboldal', facebook: 'Facebook', instagram: 'Instagram', before: 'Előtte', during: 'Kivitelezés közben', after: 'Elkészült', later: 'Későbbi állapot' };
export class ReferenceDesk {
    api;
    onError;
    org;
    person;
    owner;
    epoch = 0;
    busy = false;
    writing = false;
    active = 'wizard';
    step = 0;
    state;
    pending;
    list = { projects: [], references: [] };
    archived = false;
    undo = [];
    redo = [];
    urls = [];
    sortCleanup;
    timer;
    queue = Promise.resolve();
    versions = new Map();
    local = new ReferenceLocal();
    files = new ReferenceFiles();
    dialog = document.createElement('dialog');
    body = n('div');
    status = n('p');
    launcher = document.createElement('button');
    constructor(api, onError) {
        this.api = api;
        this.onError = onError;
        this.launcher.type = 'button';
        this.launcher.id = 'show-references';
        this.launcher.textContent = 'Referenciamunkák';
        this.launcher.hidden = true;
        document.getElementById('office-admin-actions').append(this.launcher);
        this.launcher.onclick = () => void this.open();
        this.dialog.className = 'reference-dialog';
        this.dialog.setAttribute('aria-label', 'Referenciamunkák');
        this.status.setAttribute('role', 'status');
        this.dialog.append(n('h2', 'Referenciamunkák'), this.status, this.body);
        document.body.append(this.dialog);
        addDialogDismiss(this.dialog);
        this.dialog.addEventListener('cancel', e => { if (this.writing) {
            e.preventDefault();
            this.message('A mentés folyamatban van. Várd meg a visszajelzést.');
        }
        else
            void this.persist().catch(() => { }); });
        window.addEventListener('beforeunload', e => { if (this.writing || this.state?.dirty) {
            e.preventDefault();
            e.returnValue = '';
        } });
    }
    setOwner(person, org, office) { const owner = office && org && person ? org + '/' + person : undefined; if (owner !== this.owner) {
        this.reset();
        this.org = office ? org : undefined;
        this.person = person;
        this.owner = owner;
    } this.launcher.hidden = !owner; }
    reset() { void this.persist().catch(() => { }); clearTimeout(this.timer); this.epoch++; this.owner = undefined; this.org = undefined; this.person = undefined; this.state = undefined; this.pending = undefined; this.busy = false; this.writing = false; this.undo = []; this.redo = []; this.dialog.close(); this.body.replaceChildren(); this.launcher.hidden = true; this.dispose(); }
    leave() { if (this.writing) {
        this.message('A mentés még folyamatban van.');
        return false;
    } void this.persist().catch(() => { }); return true; }
    dispose() { this.sortCleanup?.(); this.sortCleanup = undefined; for (const u of this.urls)
        URL.revokeObjectURL(u); this.urls = []; }
    message(text, ok = false) { this.status.textContent = (ok ? '✓ ' : '') + text; this.status.className = 'office-status' + (ok ? ' success' : ''); }
    error(e) { this.message(e instanceof Error ? e.message : 'A referenciaművelet nem sikerült.'); this.status.scrollIntoView({ block: 'nearest' }); if (e?.status === 401)
        this.onError(e); }
    async run(task) { if (this.busy)
        return; const epoch = this.epoch; this.busy = true; this.lock(); try {
        await task();
    }
    catch (e) {
        if (epoch === this.epoch)
            this.error(e);
    }
    finally {
        if (epoch === this.epoch) {
            this.busy = false;
            this.lock();
        }
    } }
    lock() { for (const e of Array.from(this.body.querySelectorAll('button,input,textarea,select')))
        e.disabled = this.busy || !!this.pending && e.dataset.retry !== 'true'; }
    snapshot() { const s = this.state; return structuredClone({ document: s.document, variants: s.variants, source_hash: s.source_hash, source_changed: s.source_changed, survey_id: s.survey_id }); }
    edit(action, paint = false) { if (this.pending)
        return; this.undo.push(this.snapshot()); if (this.undo.length > 100)
        this.undo.shift(); this.redo = []; action(); this.touch(); if (paint)
        this.render(); }
    touch() { if (!this.state)
        return; this.state.dirty = true; clearTimeout(this.timer); this.timer = setTimeout(() => void this.persist().catch(() => { }), 350); }
    persist() { clearTimeout(this.timer); if (!this.owner || !this.state)
        return this.queue; const owner = this.owner, id = this.state.id, key = owner + '/' + id, value = structuredClone({ ...this.state, pending: this.pending, wizard_step: this.step }); this.queue = this.queue.catch(() => { }).then(async () => { const version = await this.local.put(owner, id, value, this.versions.get(key) ?? 0); this.versions.set(key, version); }).catch(e => { this.error(e); throw e; }); return this.queue; }
    saved(view) { return { document: structuredClone(view.document), variants: Object.fromEntries(Object.entries(view.variants).map(([k, v]) => [k, structuredClone(v.document)])) }; }
    isChanged() { const s = this.state; return !s.saved || JSON.stringify(s.document) !== JSON.stringify(s.saved.document) || JSON.stringify(Object.fromEntries(Object.entries(s.variants).map(([k, v]) => [k, v.document]))) !== JSON.stringify(s.saved.variants); }
    async listRemote() { const epoch = this.epoch, list = await this.api.reference('reference_list', { organization_id: this.org, archived: this.archived }); if (epoch === this.epoch)
        this.list = list; }
    async open() { if (!this.owner)
        return; if (!this.dialog.open)
        this.dialog.showModal(); await this.run(async () => { await this.listRemote(); this.render(); this.message(this.state ? '' : 'Válassz kertépítést vagy mentett referenciát.'); this.dialog.scrollTop = 0; }); }
    async load(id) { await this.persist(); const epoch = this.epoch, owner = this.owner, remote = await this.api.reference('reference_read', { organization_id: this.org, reference_id: id }); const local = (await this.local.list(owner)).find(x => x.id === id); if (epoch !== this.epoch)
        return; this.versions.set(owner + '/' + id, local?.localVersion ?? 0); this.state = local?.value?.dirty || local?.value?.pending ? local.value : { ...remote, dirty: false, saved: this.saved(remote) }; this.pending = this.state.pending; this.active = 'wizard'; this.step = Math.max(0, Math.min(8, Number(local?.value?.wizard_step) || 0)); if (this.step > 2 && !this.state.variants.web)
        this.step = 0; this.undo = []; this.redo = []; this.render(); this.message(this.state.revision !== remote.revision ? 'A szerveren frissebb változat van. A helyi szöveg megmaradt; az Előzményeknél hasonlíthatod össze.' : this.pending ? 'A korábbi mentés eredménye még nem ismert. Próbáld újra az eredeti kérést.' : this.state.dirty ? 'Saját helyi piszkozat megnyitva.' : 'A referencia betöltve.'); this.dialog.scrollTop = 0; }
    async create(project) { if (!project)
        throw Error('Válassz kertépítést.'); await this.persist(); const epoch = this.epoch, source = await this.api.reference('reference_source', { organization_id: this.org, project_id: project }); if (epoch !== this.epoch)
        return; this.state = { id: crypto.randomUUID(), project_id: project, revision: 0, base_revision: 0, document: referenceFromSource(source), variants: {}, source, source_hash: source.hash, source_changed: true, history: [], variant_history: [], approvals: [], publications: [], dirty: true }; this.pending = undefined; this.undo = []; this.redo = []; this.active = 'wizard'; this.step = 0; await this.persist(); this.render(); this.message(''); this.dialog.scrollTop = 0; }
    field(parent, title, value, change, area = false) { const label = n('label', title), input = document.createElement(area ? 'textarea' : 'input'); input.value = value; if (area)
        input.rows = 4; input.oninput = () => { if (change)
        this.edit(() => change(input.value)); }; label.append(input); parent.append(label); return input; }
    choice(parent, title, value, items, change) { const label = n('label', title), select = document.createElement('select'); for (const [id, text] of items)
        select.add(new Option(text, id)); select.value = value; select.onchange = () => change(select.value); label.append(select); parent.append(label); return select; }
    render() {
        const openStates = new Map(Array.from(this.body.querySelectorAll('details')).map(d => [d.querySelector('summary')?.textContent ?? '', d.open]));
        this.dispose();
        this.body.replaceChildren();
        const s = this.state;
        if (!s) {
            const make = fold(this.body, 'Új referencia kertépítésből', true), project = this.choice(make, 'Kertépítés', '', [['', 'Válassz munkát'], ...this.list.projects.map((p) => [p.id, p.name + ' · ' + p.address])], () => { });
            button(make, 'Referencia készítése', () => void this.run(() => this.create(project.value)));
            const list = fold(this.body, 'Mentett referenciák');
            this.choice(list, 'Lista', this.archived ? 'archive' : 'active', [['active', 'Aktív'], ['archive', 'Archivált']], v => { this.archived = v === 'archive'; void this.run(async () => { await this.listRemote(); this.render(); }); });
            for (const r of this.list.references)
                button(list, r.title, () => void this.run(() => this.load(r.id)));
            button(list, 'Lista frissítése', () => void this.run(async () => { await this.listRemote(); this.render(); }));
            button(list, 'Helyi piszkozatok megnyitása', () => void this.run(async () => { const rows = await this.local.list(this.owner); const box = fold(this.body, 'Saját piszkozatok ezen az eszközön', true); for (const row of rows.filter(r => r.value.dirty || r.value.pending))
                button(box, row.value.document.title, () => void this.run(async () => { this.versions.set(this.owner + '/' + row.id, row.localVersion); this.state = row.value; this.pending = row.value.pending; this.active = 'wizard'; this.step = 0; this.render(); })); if (!box.querySelector('button'))
                box.append(n('p', 'Nincs függő helyi piszkozat.')); }));
            this.connection(this.body);
            return;
        }
        const project = this.list.projects.find((p) => p.id === s.project_id), context = n('p', 'Munka: ' + (project ? project.name + (project.address ? ' · ' + project.address : '') : 'A referenciához kapcsolt kertépítés'));
        context.className = 'reference-context';
        this.body.append(context);
        if (this.pending) {
            const b = button(this.body, 'Korábbi mentés ellenőrzése', () => void this.run(() => this.retry()));
            b.dataset.retry = 'true';
        }
        if (this.active === 'wizard')
            this.wizard();
        else {
            button(this.body, '← Vissza a referenciához', () => { this.active = 'wizard'; this.render(); this.dialog.scrollTop = 0; });
            if (this.active === 'history')
                this.history();
            else
                this.variant(this.active);
        }
        const tools = fold(this.body, 'További műveletek');
        button(tools, 'Másik munka vagy referencia választása', () => void this.run(() => this.chooseAnother()));
        for (const [id, title] of [['facebook', 'Facebook-változat'], ['instagram', 'Instagram-változat'], ['history', 'Előzmények']])
            button(tools, title, () => { this.active = id; this.render(); this.dialog.scrollTop = 0; });
        const actions = n('div');
        actions.className = 'reference-actions';
        button(actions, 'Visszavonás', () => { if (!this.undo.length)
            return; this.redo.push(this.snapshot()); Object.assign(s, this.undo.pop()); this.touch(); this.render(); });
        button(actions, 'Újra', () => { if (!this.redo.length)
            return; this.undo.push(this.snapshot()); Object.assign(s, this.redo.pop()); this.touch(); this.render(); });
        button(actions, 'Saját mentési csomag letöltése', () => void this.run(async () => { const missing = await this.files.export(this.owner, s.id, s.document, s.variants); this.message(missing ? 'A letöltés elindult; ' + missing + ' kép nincs ezen az eszközön.' : 'A mentési csomag letöltése elindult.', !missing); }));
        if (s.revision)
            button(actions, s.archived ? 'Archiválás visszavonása' : 'Referencia archiválása', () => { if (confirm(s.archived ? 'Visszaállítod a referenciát?' : 'Archiválod a referenciát? A munka, a fájlok és pénzügyei megmaradnak.'))
                void this.run(() => this.save({ kind: 'archive', archived: !s.archived })); });
        tools.append(actions);
        const transfer = fold(tools, 'Képek visszatöltése másik eszközről'), file = document.createElement('input');
        file.type = 'file';
        file.accept = '.zip';
        file.setAttribute('aria-label', 'Referenciacsomag kiválasztása');
        file.onchange = () => void this.run(async () => { if (!file.files?.[0])
            return; const count = await this.files.import(this.owner, s.id, s.document, file.files[0]); this.render(); this.message(count + ' kép visszatöltve. A szövegek nem változtak.', true); });
        transfer.append(n('p', 'Az adott referencia mentési ZIP-fájljából a hiányzó képeket tölti vissza.'), file);
        for (const d of Array.from(this.body.querySelectorAll('details'))) {
            const key = d.querySelector('summary')?.textContent ?? '';
            if (openStates.has(key))
                d.open = openStates.get(key);
        }
        this.lock();
    }
    wizard() { const titles = ['Megnevezés', 'Bemutató szöveg', 'Fényképek', 'A honlap szövege', 'Megjelenés a keresőben', 'A honlap képei', 'Előnézet', 'Tartalom jóváhagyása', 'WordPress-piszkozat'], hints = ['Adj nevet a referenciának.', 'Írd le röviden, mi készült el.', 'Adj hozzá bemutatásra szánt képeket. Kép nélkül is továbbléphetsz.', 'Ezt a címet és szöveget látják majd a honlapon.', 'Ez a cím és rövid leírás jelenhet meg a kereső találatai között.', 'Pipáld ki a honlapra szánt képeket, és ellenőrizd a leírásukat.', 'Nézd át, mit szeretnél megmutatni. Javításhoz használd a Vissza gombot.', 'Rögzítsd, hogy a szöveg és a képek bemutathatók.', 'Készíts ellenőrizhető piszkozatot. Ez még nem nyilvános bejegyzés.']; this.body.append(n('p', (this.step + 1) + ' / ' + titles.length + ' lépés'), n('h3', titles[this.step]), n('p', hints[this.step])); if (this.step < 3)
        this.base(['name', 'text', 'photos'][this.step]);
    else
        this.variant('web', ['content', 'search', 'photos', 'preview', 'approval', 'wordpress'][this.step - 3]); const nav = n('div'); nav.className = 'reference-actions reference-wizard-nav'; button(nav, '← Vissza', () => void this.run(async () => { if (this.step === 0) {
        await this.chooseAnother();
        return;
    } await this.persist(); this.step--; this.render(); this.message(''); this.dialog.scrollTop = 0; })); button(nav, this.step === 8 ? 'Befejezés' : 'Tovább →', () => void this.run(() => this.nextStep())); if (this.step < 6)
        this.body.append(n('p', 'A Tovább gomb elmenti az adatokat.')); this.body.append(nav); }
    async nextStep() {
        const s = this.state, epoch = this.epoch;
        if (this.pending)
            throw Error('Előbb ellenőrizd a korábbi mentés eredményét.');
        if (this.step === 8) {
            await this.persist();
            this.dialog.close();
            return;
        }
        if (this.step < 3) {
            if (!s.document.title.trim())
                throw Error('Írd be a Megnevezés mezőt.');
            if (!s.saved || JSON.stringify(s.document) !== JSON.stringify(s.saved.document))
                await this.save({ kind: 'save', document: normalizeReference(s.document), ...(s.source_changed ? { source_hash: s.source_hash, ...(s.survey_id ? { survey_id: s.survey_id } : {}) } : {}) });
            if (epoch !== this.epoch)
                return;
            if (this.step === 2 && !s.variants.web)
                this.edit(() => s.variants.web = { revision: 0, base_revision: s.base_revision, document: makeReferenceVariant(s.document, 'web') });
        }
        else if (this.step <= 5) {
            const v = s.variants.web?.document;
            if (!v)
                throw Error('Előbb készítsd el a referencia alapját.');
            if (this.step === 4 && (!v.seo_title.trim() || !v.seo_description.trim()))
                throw Error('Töltsd ki a Találati cím és Rövid leírás mezőt.');
            if (!s.saved?.variants.web || JSON.stringify(v) !== JSON.stringify(s.saved.variants.web))
                await this.save({ kind: 'variant', document: normalizeReferenceVariant(v, s.document) });
        }
        else if (this.step === 7) {
            const approved = (s.approvals ?? []).some((a) => a.platform === 'web' && a.reference_revision === s.revision && a.variant_revision === s.variants.web?.revision);
            if (this.isChanged() || !approved)
                throw Error('Előbb rögzítsd a tartalom jóváhagyását ezen az oldalon.');
        }
        if (epoch !== this.epoch)
            return;
        this.step++;
        await this.persist();
        this.render();
        this.message('');
        this.dialog.scrollTop = 0;
    }
    async chooseAnother() { if (!confirm('Másik munkát vagy referenciát választasz? A mostani szerkesztés ezen az eszközön megmarad.'))
        return; await this.persist(); this.state = undefined; this.pending = undefined; this.active = 'wizard'; this.step = 0; await this.listRemote(); this.render(); this.message('Válassz munkát vagy nyiss meg mentett referenciát.'); this.dialog.scrollTop = 0; }
    base(part) {
        const s = this.state, d = s.document;
        const box = n('section');
        this.body.append(box);
        if (part === 'name') {
            this.field(box, 'Megnevezés', d.title, v => d.title = v);
            return;
        }
        if (part === 'text') {
            this.field(box, 'Mi készült el?', d.realization, v => d.realization = v, true);
            const more = fold(box, 'További részletek');
            this.field(more, 'Az ügyfél elképzelései', d.wishes, v => d.wishes = v, true);
            this.field(more, 'Ténylegesen beépített anyagok', d.materials, v => d.materials = v, true);
            const source = fold(this.body, 'Forrás ellenőrzése');
            if (s.source_hash !== s.source.hash)
                source.append(n('p', 'A projekt forrásadata a mentett alap óta megváltozott.'));
            for (const t of s.source.tasks ?? [])
                source.append(n('p', (t.accepted ? '✓ Átvett: ' : 'Átvételre vár: ') + t.section + ' · ' + t.title));
            if (!s.source.survey_id)
                source.append(n('p', 'Nincs egyértelműen kapcsolt felmérés. Az elképzelést kézzel is megadhatod.'));
            const survey = this.choice(source, 'Felmérés', s.survey_id ?? '', [['', 'Az ajánlathoz kapcsolt felmérés'], ...(s.source.surveys ?? []).map((x) => [x.id, x.title])], () => { });
            button(source, 'Friss forrás összehasonlítása', () => void this.run(async () => { const epoch = this.epoch, raw = await this.api.reference('reference_source', { organization_id: this.org, project_id: s.project_id, ...(survey.value ? { survey_id: survey.value } : {}) }); if (epoch !== this.epoch)
                return; const preview = referenceFromSource(raw), pane = fold(source, 'Friss forrásból javasolt szöveg', true); pane.append(n('pre', [preview.wishes, preview.realization, preview.materials].join('\n\n'))); button(pane, 'Javasolt alap átvétele', () => this.edit(() => { s.document = { ...preview, title: d.title, media: d.media }; s.source = raw; s.source_hash = raw.hash; s.source_changed = true; s.survey_id = survey.value || undefined; }, true)); this.message('A javaslat megnyílt. Csak külön gombbal váltja le a saját szöveget.'); }));
            return;
        }
        const photos = fold(this.body, 'Fényképek', true);
        photos.append(n('p', 'A képek ezen az eszközön maradnak; másik eszközre mentési csomaggal vihetők át.'));
        for (const group of referenceGroups) {
            const groupBox = fold(photos, labels[group]);
            groupBox.dataset.sortContainer = group;
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/jpeg,image/png,image/webp';
            input.setAttribute('aria-label', labels[group] + ' képek hozzáadása');
            input.onchange = () => void this.run(async () => { const epoch = this.epoch, owner = this.owner, id = s.id; this.undo.push(this.snapshot()); for (const f of Array.from(input.files ?? [])) {
                const m = await this.files.add(owner, id, f, group);
                if (epoch !== this.epoch)
                    return;
                d.media.push(m);
                this.touch();
                await this.persist();
            } this.render(); this.message('A képek helyben mentve. Mentsd a referencia alapját is.', true); });
            groupBox.append(input);
            for (const m of d.media.filter(x => x.group === group)) {
                const row = fold(groupBox, m.caption || 'Fénykép');
                row.dataset.sortId = m.id;
                sortableHandle(row);
                this.photo(row, m, m.alt || labels[group]);
                this.field(row, 'Képfelirat', m.caption, v => m.caption = v);
                this.field(row, 'Kép leírása (alt)', m.alt, v => m.alt = v);
                this.choice(row, 'Képcsoport', m.group, referenceGroups.map(x => [x, labels[x]]), v => this.edit(() => m.group = v, true));
                for (const [delta, title] of [[-1, 'Feljebb'], [1, 'Lejjebb']])
                    button(row, title, () => this.edit(() => { const same = d.media.filter(x => x.group === m.group), at = same.indexOf(m), to = at + delta; if (to >= 0 && to < same.length)
                        d.media = moveReferencePhoto(d.media, m.id, delta < 0 ? same[to].id : same[to + 1]?.id ?? null); }, true));
                button(row, 'Kép kivétele a referenciából', () => { if (Object.values(s.variants).some((v) => v.document.photos.some((p) => p.media_id === m.id))) {
                    this.message('Előbb vedd ki a képet a külön platformváltozatokból, és mentsd őket.');
                    return;
                } this.edit(() => d.media = d.media.filter(x => x.id !== m.id), true); });
            }
        }
        this.sortCleanup = attachSorter(photos, move => this.edit(() => { const m = d.media.find(x => x.id === move.id); if (m) {
            m.group = move.container;
            d.media = moveReferencePhoto(d.media, move.id, move.before);
        } }, true));
        const reuse = fold(photos, 'Kép átvétele a projektből');
        for (const m of s.source.photos ?? [])
            button(reuse, (m.source === 'survey' ? 'Felmérés' : 'Projekt') + ' · ' + m.id.slice(0, 8), () => void this.run(async () => { const epoch = this.epoch, mapped = await this.files.copy(this.owner, this.person, s.id, s.project_id, m, 'before'); if (epoch !== this.epoch)
                return; this.undo.push(this.snapshot()); d.media.push(mapped); this.touch(); await this.persist(); this.render(); }));
        if (!(s.source.photos ?? []).length)
            reuse.append(n('p', 'Nincs kapcsolt forrásfotó. A képcsoportnál képfájlt választhatsz.'));
    }
    photo(parent, m, alt) { const image = document.createElement('img'); image.className = 'reference-photo'; image.loading = 'lazy'; image.alt = alt; parent.append(image); const epoch = this.epoch, id = this.state.id; void this.files.read(this.owner, id, m).then(blob => { if (epoch !== this.epoch || !image.isConnected)
        return; if (!blob) {
        image.replaceWith(n('p', 'Ez a kép nincs ezen az eszközön. Töltsd vissza a mentési csomagból.'));
        return;
    } const url = URL.createObjectURL(blob); this.urls.push(url); image.src = url; }).catch(e => this.error(e)); }
    variant(platform, part) {
        const s = this.state, d = s.document, item = s.variants[platform], box = n('section');
        this.body.append(box);
        if (!part)
            button(box, item ? 'Új szövegjavaslat' : 'Változat készítése', () => { if (!s.revision) {
                this.message('Előbb mentsd a referencia alapját.');
                return;
            } const proposed = makeReferenceVariant(d, platform); if (item) {
                const pane = fold(box, 'Új javaslat', true);
                pane.append(n('pre', referencePlain(proposed)));
                button(pane, 'Javaslat átvétele', () => this.edit(() => s.variants[platform] = { ...item, document: proposed }, true));
            }
            else
                this.edit(() => s.variants[platform] = { revision: 0, base_revision: s.base_revision, document: proposed }, true); });
        if (!item) {
            box.append(n('p', 'Előbb fejezd be a referencia alapját.'));
            return;
        }
        const v = item.document;
        if (!part || part === 'content') {
            this.field(box, 'Honlapon megjelenő cím', v.title, x => v.title = x);
            this.field(box, 'Bemutató szöveg', v.body, x => v.body = x, true);
            if (platform !== 'web')
                this.field(box, 'Címkék, vesszővel elválasztva', v.tags.join(', '), x => v.tags = x.split(',').map(x => x.trim()).filter(Boolean));
        }
        if (platform === 'web' && (!part || part === 'search')) {
            this.field(box, 'Találati cím', v.seo_title, x => v.seo_title = x);
            this.field(box, 'Rövid leírás', v.seo_description, x => v.seo_description = x, true);
        }
        if (!part || part === 'photos') {
            const photos = fold(box, 'Kijelölt képek és sorrend', part === 'photos');
            photos.dataset.sortContainer = 'variant';
            for (const m of d.media) {
                const label = n('label', labels[m.group] + ' · ' + (m.caption || m.id.slice(0, 8))), c = document.createElement('input');
                c.type = 'checkbox';
                c.className = 'inline-check';
                c.checked = v.photos.some(p => p.media_id === m.id);
                c.onchange = () => this.edit(() => v.photos = c.checked ? [...v.photos, { media_id: m.id, caption: m.caption, alt: m.alt }] : v.photos.filter(p => p.media_id !== m.id), true);
                label.prepend(c);
                photos.append(label);
            }
            v.photos.forEach((p, i) => { const row = fold(photos, (i + 1) + '. ' + (p.caption || 'Kijelölt kép')); row.dataset.sortId = p.media_id; sortableHandle(row); this.field(row, 'Képfelirat ebben a változatban', p.caption, x => p.caption = x); this.field(row, 'Alt szöveg ebben a változatban', p.alt, x => p.alt = x); for (const [delta, title] of [[-1, 'Feljebb'], [1, 'Lejjebb']])
                button(row, title, () => this.edit(() => { const to = i + delta; if (to >= 0 && to < v.photos.length)
                    [v.photos[i], v.photos[to]] = [v.photos[to], v.photos[i]]; }, true)); });
            this.sortCleanup = attachSorter(photos, move => this.edit(() => v.photos = moveReferencePhoto(v.photos.map(p => ({ ...p, id: p.media_id })), move.id, move.before).map(({ id, ...p }) => p), true));
        }
        if (!part)
            button(box, 'Változat mentése', () => void this.run(() => this.save({ kind: 'variant', document: normalizeReferenceVariant(v, d) })));
        if (!part || part === 'preview') {
            const preview = fold(box, 'Előnézet', true);
            button(preview, 'Előnézet frissítése', () => this.render());
            preview.append(n('h3', v.title), n('pre', v.body), n('p', v.tags.join(' ')));
            for (const p of v.photos) {
                const m = d.media.find(x => x.id === p.media_id);
                if (m)
                    this.photo(preview, m, p.alt);
                preview.append(n('p', p.caption));
            }
            button(preview, 'Szöveg másolása', () => void this.run(async () => { await navigator.clipboard.writeText(referencePlain(v)); this.message('A szöveg a vágólapra került.', true); }));
            button(preview, 'Posztcsomag letöltése', () => void this.run(async () => { await this.files.export(this.owner, s.id, d, s.variants, platform); this.message('A posztcsomag letöltése elindult.', true); }));
        }
        if (!part || part === 'approval') {
            const approval = n('section');
            box.append(approval);
            approval.append(n('p', 'Csak bemutatható szöveget és engedélyezett képeket hagyj jóvá. A feltöltött képek már a piszkozatnál is nyilvánosak lehetnek.'));
            const evidence = this.field(approval, 'Ki és mikor ellenőrizte? Hozzájárulás hivatkozása, ha szükséges', ''), label = n('label', 'A szöveg, képek és nyilvánosságra hozhatóság ellenőrizve.'), checked = document.createElement('input');
            checked.type = 'checkbox';
            checked.className = 'inline-check';
            label.prepend(checked);
            approval.append(label);
            button(approval, 'Jóváhagyás rögzítése', () => void this.run(async () => { if (this.isChanged())
                throw Error('Előbb lépj vissza, és mentsd a módosított szöveget vagy képeket a Tovább gombbal.'); await this.save({ kind: 'approve', platform, evidence: evidence.value, checked: checked.checked }); }));
            if ((s.approvals ?? []).some((a) => a.platform === platform))
                approval.append(n('p', '✓ Az aktuális mentett változat irodai ellenőrzése rögzítve.'));
        }
        if (part === 'wordpress')
            this.wordpress(box);
    }
    connection(parent) { const box = fold(parent, 'WordPress-kapcsolat'); if (!this.list.wordpress_configured) {
        box.append(n('p', 'A WordPress-hozzáférés még nincs beállítva.'));
        return;
    } button(box, 'WordPress-kapcsolat ellenőrzése', () => void this.run(async () => { const epoch = this.epoch, result = await this.api.reference('reference_wp_check', { organization_id: this.org }); if (epoch !== this.epoch)
        return; this.message(result.ready ? 'A WordPress-belépés és jogosultság ellenőrizve. Közzététel továbbra is csak külön gombbal és megerősítéssel.' : 'A WordPress-belépés és jogosultság ellenőrizve. Piszkozat készíthető; a nyilvános közzététel a megjelenés jóváhagyására vár.', true); })); box.append(n('p', 'Ez az ellenőrzés csak olvas; nem tölt fel képet és nem hoz létre bejegyzést.')); }
    wordpress(parent) { const s = this.state, box = n('section'); parent.append(box); this.connection(box); if (!this.list.wordpress_configured) {
        box.append(n('p', 'A WordPress-kapcsolat beállítására vár. A referencia mentése, előnézete és letöltése már használható.'));
        return;
    } if (!this.list.wordpress_ready)
        box.append(n('p', 'Piszkozat készíthető és előnézetben ellenőrizhető. A nyilvános közzététel a megjelenés jóváhagyására vár.')); button(box, 'WordPress-piszkozat készítése', () => void this.run(async () => { const id = s.id, epoch = this.epoch; for (const p of s.variants.web.document.photos) {
        const m = s.document.media.find((m) => m.id === p.media_id), blob = await this.files.read(this.owner, id, m);
        if (!blob)
            throw Error('Hiányzó helyi kép. Töltsd vissza a mentési csomagot.');
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        for (const b of bytes)
            binary += String.fromCharCode(b);
        await this.wp('reference_wp_media', { media_id: m.id, bytes: btoa(binary) }, false);
        if (epoch !== this.epoch)
            return;
    } await this.wp('reference_wp_draft'); })); if (this.list.wordpress_ready)
        button(box, 'Közzététel / nyilvános referencia frissítése', () => { if (confirm('A webes változat nyilvánosan megjelenik a diszkertek.hu oldalon. Közzéteszed?'))
            void this.run(() => this.wp('reference_wp_publish', { confirmed: true })); }); for (const p of s.publications ?? []) {
        const row = n('p', { media: 'Kép', draft: 'Piszkozat', publish: 'Közzététel' }[p.kind] + ' · ' + { succeeded: 'Sikeres', started: 'Ellenőrzésre vár', uncertain: 'Bizonytalan eredmény', failed: 'Sikertelen' }[p.status]);
        if (p.error)
            row.append(n('span', ' · ' + p.error));
        if (/^https:\/\/diszkertek\.hu\//.test(p.remote_url ?? '')) {
            const a = document.createElement('a');
            a.href = p.remote_url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = p.kind === 'draft' ? ' Piszkozat előnézete' : ' Megnyitás';
            row.append(a);
        }
        box.append(row);
    } }
    async wp(action, extra = {}, paint = true) { const s = this.state, epoch = this.epoch; if (this.isChanged())
        throw Error('Előbb mentsd az alapot és a külön változatokat.'); const result = await this.api.reference(action, { organization_id: this.org, reference_id: s.id, revision: s.revision, request_id: crypto.randomUUID(), ...extra }); if (epoch !== this.epoch)
        return; const remote = await this.api.reference('reference_read', { organization_id: this.org, reference_id: s.id }); if (epoch !== this.epoch)
        return; s.publications = remote.publications; await this.persist(); if (paint)
        this.render(); this.message(result.message ?? 'A WordPress-művelet ellenőrizve.', true); }
    history() { const s = this.state, box = fold(this.body, 'Mentett előzmények', true); box.append(n('p', 'A korábbi változat helyi szerkesztésként nyílik meg; külön mentéssel lesz belőle új változat.')); for (const v of s.history ?? [])
        button(box, 'Alap · ' + v.revision + ' · ' + new Date(v.created_at).toLocaleString('hu-HU'), () => void this.run(async () => { const epoch = this.epoch, x = await this.api.reference('reference_read', { organization_id: this.org, reference_id: s.id, filter: { base_revision: v.revision } }); if (epoch !== this.epoch)
            return; this.edit(() => s.document = x.document); this.active = 'wizard'; this.step = 0; this.render(); })); for (const v of s.variant_history ?? [])
        button(box, labels[v.platform] + ' · ' + v.revision, () => void this.run(async () => { const epoch = this.epoch, x = await this.api.reference('reference_read', { organization_id: this.org, reference_id: s.id, filter: { platform: v.platform, variant_revision: v.revision } }); if (epoch !== this.epoch)
            return; this.edit(() => s.variants[v.platform] = { ...s.variants[v.platform], document: x.variants[v.platform].document }); this.active = v.platform; this.render(); })); button(box, 'További előzmények', () => void this.run(async () => { const offset = s.history_offset = (s.history_offset ?? 0) + 50, x = await this.api.reference('reference_read', { organization_id: this.org, reference_id: s.id, filter: { offset } }); s.history.push(...x.history); s.variant_history.push(...x.variant_history); this.render(); this.message(x.history.length || x.variant_history.length ? 'További előzmények betöltve.' : 'Nincs több előzmény.'); })); button(box, 'Friss szerverpéldány összehasonlítása', () => void this.run(async () => { const epoch = this.epoch, x = await this.api.reference('reference_read', { organization_id: this.org, reference_id: s.id }); if (epoch !== this.epoch)
        return; const pane = fold(box, 'Szerverpéldány – a helyi szöveg megmarad', true); pane.append(n('pre', JSON.stringify({ document: x.document, variants: x.variants }, null, 2))); button(pane, 'Szerverpéldány megnyitása', () => { if (!confirm('A helyi szerkesztést a szerverpéldány váltja fel. Előbb töltsd le a saját mentést, ha megőriznéd.'))
        return; this.state = { ...x, dirty: false, saved: this.saved(x) }; this.pending = undefined; this.active = 'wizard'; this.step = 0; void this.persist().catch(() => { }); this.render(); }); })); }
    async save(command) { if (this.pending)
        throw Error('Előbb ellenőrizd az eredeti mentés eredményét.'); const s = this.state; this.pending = { organization_id: this.org, reference_id: s.id, project_id: s.project_id, request_id: crypto.randomUUID(), revision: s.revision, command }; await this.persist(); await this.retry(); }
    async retry() { if (!this.state || !this.pending)
        return; const s = this.state, request = this.pending, epoch = this.epoch; this.writing = true; try {
        await this.api.reference('reference_write', request);
        if (epoch !== this.epoch)
            return;
        const remote = await this.api.reference('reference_read', { organization_id: this.org, reference_id: s.id });
        if (epoch !== this.epoch)
            return;
        const saved = s.saved ?? { document: undefined, variants: {} };
        if (request.command.kind === 'save') {
            saved.document = structuredClone(request.command.document);
            s.source_changed = false;
        }
        if (request.command.kind === 'variant')
            saved.variants[request.command.document.platform] = structuredClone(request.command.document);
        s.saved = saved;
        for (const k of ['revision', 'base_revision', 'archived', 'history', 'variant_history', 'approvals', 'publications', 'source_hash', 'source'])
            s[k] = remote[k];
        for (const [k, v] of Object.entries(remote.variants))
            s.variants[k] = { ...v, document: s.variants[k]?.document ?? v.document };
        this.pending = undefined;
        delete s.pending;
        s.dirty = this.isChanged();
        await this.persist();
        this.render();
        this.message('A mentés sikeres. A többi változat szövege megmaradt.', true);
    }
    catch (e) {
        if (epoch === this.epoch) {
            if ([400, 403, 409, 422].includes(e?.status)) {
                this.pending = undefined;
                delete s.pending;
                await this.persist();
            }
            this.render();
        }
        throw e;
    }
    finally {
        if (epoch === this.epoch)
            this.writing = false;
    } }
}
