const { checkMediaBytes } = await import(new URL('./erp-survey-model.js?v=0.14.0', import.meta.url).href);
const { downloadSurveyFile } = await import(new URL('./erp-survey-archive.js?v=0.14.0', import.meta.url).href);
const hash = async (blob) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))).map(x => x.toString(16).padStart(2, '0')).join('');
const zip = async () => await import(new URL('../vendor/fflate-0.8.2.js', import.meta.url).href);
export function workMediaReferences(view) { const refs = new Map(); for (const e of view.events ?? [])
    for (const m of e.media ?? [])
        if (view.context.role !== 'client' || m.visibility === 'client')
            refs.set(m.id, m); return [...refs.values()]; }
export function workplanArchiveView(view) {
    if (view.context.role !== 'client')
        return structuredClone(view);
    const pick = (v, keys) => Object.fromEntries(keys.filter(k => v[k] !== undefined).map(k => [k, v[k]]));
    return { context: { ...pick(view.context, ['person_id', 'role']), project: pick(view.context.project, ['id', 'name', 'address', 'status', 'quote_id', 'quote_version']) }, plan: view.plan ? pick(view.plan, ['id', 'revision', 'quote_id', 'quote_version']) : null,
        bands: (view.bands ?? []).map((b) => ({ ...pick(b, ['level', 'percent', 'completed_minutes', 'remaining_minutes', 'zero_done', 'zero_total']), segments: (b.segments ?? []).map((s) => pick(s, ['color', 'percent'])) })),
        tasks: (view.tasks ?? []).map((t) => ({ ...pick(t, ['id', 'title', 'section', 'quantity', 'unit', 'sort', 'start_date', 'end_date', 'dependencies', 'original_minutes', 'planned_minutes', 'revision', 'round', 'labor', 'net']), acceptance: (t.acceptance ?? []).map((a) => pick(a, ['level', 'accepted', 'explicit', 'own'])) })),
        events: (view.events ?? []).filter((e) => !['shares', 'time', 'color'].includes(e.kind)).map((e) => ({ ...pick(e, ['id', 'task_id', 'kind', 'created_at', 'role', 'level']), reason: e.visibility === 'team' ? '' : e.reason ?? '', media: (e.media ?? []).filter((m) => m.visibility === 'client') })) };
}
export class WorkMedia {
    database;
    db() { return this.database ??= new Promise((resolve, reject) => { const r = indexedDB.open('diszkertek-erp-work-media', 1); r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'key' }); r.onsuccess = () => resolve(r.result); r.onerror = () => { this.database = undefined; reject(Error('A helyi képtár nem nyitható meg. A böngészőben engedélyezd a helyi tárolást.')); }; }); }
    async put(row) { const db = await this.db(); return new Promise((resolve, reject) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put(row); tx.oncomplete = () => resolve(); tx.onerror = () => reject(Error('A fotó nem menthető az eszközre. Ellenőrizd a szabad tárhelyet.')); }); }
    async read(owner, project, id) { const db = await this.db(); return new Promise((resolve, reject) => { const r = db.transaction('files').objectStore('files').get(owner + '/' + project + '/' + id); r.onsuccess = () => resolve(r.result?.blob); r.onerror = () => reject(Error('A helyi fotó nem olvasható.')); }); }
    async add(owner, project, file, visibility) { if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024)
        throw Error('JPEG, PNG vagy WebP fotót válassz, legfeljebb 20 MB méretben.'); const url = URL.createObjectURL(file); try {
        const img = new Image();
        img.src = url;
        await img.decode();
        if (img.width * img.height > 40000000)
            throw Error('A fotó felbontása túl nagy.');
        const scale = Math.min(1, 1600 / Math.max(img.width, img.height)), canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(Error('A fotó átalakítása nem sikerült.')), 'image/jpeg', 0.85));
        if (blob.size > 4 * 1024 * 1024)
            throw Error('Az átalakított fotó is túl nagy.');
        const id = crypto.randomUUID();
        await this.put({ key: owner + '/' + project + '/' + id, owner, project, id, blob });
        return { id, name: file.name.slice(0, 180), mime: 'image/jpeg', bytes: blob.size, visibility, sha256: await hash(blob) };
    }
    finally {
        URL.revokeObjectURL(url);
    } }
    async show(owner, project, ref) { const blob = await this.read(owner, project, ref.id); if (!blob)
        throw Error('Ez a fotó nincs ezen az eszközön. A másik eszközön letöltött munkatervcsomagból hozhatod át.'); downloadSurveyFile(blob, ref.id + '.jpg'); }
    async export(owner, view, entry = false) { view = entry ? entryArchiveView(view) : workplanArchiveView(view); const refs = workMediaReferences(view), files = {}, missing = []; let bytes = 0; for (const ref of refs) {
        const blob = await this.read(owner, view.context.project.id, ref.id);
        if (!blob) {
            missing.push(ref.id);
            continue;
        }
        bytes += blob.size;
        if (bytes > 64 * 1024 * 1024)
            throw Error('A csomag nagyobb 64 MB-nál. Töltsd le a fotókat külön.');
        if (ref.sha256 && await hash(blob) !== ref.sha256)
            throw Error('A helyi fotó ellenőrzőösszege eltér.');
        files['media/' + ref.id] = new Uint8Array(await blob.arrayBuffer());
    } files['munkaterv.json'] = new TextEncoder().encode(JSON.stringify({ format: entry ? 'diszkertek-entry-1' : 'diszkertek-workplan-1', project_id: view.context.project.id, entry_id: entry ? view.entry.id : undefined, view, missing_files: missing })); const z = await zip(); downloadSurveyFile(new Blob([z.zipSync(files, { level: 0 })], { type: 'application/zip' }), (entry ? 'Diszkertek_bejegyzes_' + view.entry.id : 'Diszkertek_munkaterv_' + view.context.project.id) + '.zip'); return missing.length; }
    async import(owner, view, file, entry = false) { if (entry)
        view = entryArchiveView(view); if (file.size > 70 * 1024 * 1024)
        throw Error('A csomag legfeljebb 70 MB lehet.'); const refs = workMediaReferences(view), allowed = new Map(refs.map(r => ['media/' + r.id, r])); let size = 0, count = 0; const z = await zip(); const unpacked = z.unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: f => { if (f.name !== 'munkaterv.json' && !allowed.has(f.name))
            return false; if (++count > 1000 || f.originalSize > 5 * 1024 * 1024 || (size += f.originalSize) > 70 * 1024 * 1024)
            throw Error('A kibontott csomag túl nagy.'); return true; } }); const manifest = JSON.parse(new TextDecoder().decode(unpacked['munkaterv.json'])); if (manifest.format !== (entry ? 'diszkertek-entry-1' : 'diszkertek-workplan-1') || manifest.project_id !== view.context.project.id || entry && manifest.entry_id !== view.entry.id)
        throw Error('Ez a csomag másik munkához tartozik.'); let added = 0; for (const [path, ref] of allowed) {
        const bytes = unpacked[path];
        if (!bytes)
            continue;
        if (bytes.length !== ref.bytes)
            throw Error('A fotó mérete eltér a mentett hivatkozástól.');
        checkMediaBytes(bytes, ref.mime);
        if (ref.sha256 && await hash(new Blob([bytes])) !== ref.sha256)
            throw Error('A fotó ellenőrzőösszege eltér a mentett hivatkozástól.');
        const existing = await this.read(owner, view.context.project.id, ref.id);
        if (existing) {
            const a = new Uint8Array(await existing.arrayBuffer());
            if (a.length !== bytes.length || !a.every((b, i) => b === bytes[i]))
                throw Error('Eltérő helyi fotóazonosító. A meglévő képet nem írtuk felül.');
        }
        else {
            await this.put({ key: owner + '/' + view.context.project.id + '/' + ref.id, owner, project: view.context.project.id, id: ref.id, blob: new Blob([bytes], { type: ref.mime }) });
            added++;
        }
    } return added; }
}
export function entryArchiveView(view) { const pick = (x, keys) => Object.fromEntries(keys.filter(k => x?.[k] !== undefined).map(k => [k, x[k]])); const e = view.entry, client = view.context.role === 'client', money = ['office', 'client'].includes(view.context.role); const payload = (p) => ({ ...pick(p, ['body', 'target_line_id', 'media']), ...(money ? pick(p, ['damage', 'suggestion']) : p?.damage ? { damage: pick(p.damage, ['location', 'occurred_at']) } : {}) }); const version = { ...pick(e.version, ['version', 'base_quote_version', 'actor_role', 'created_at']), payload: payload(e.version.payload) }; return { context: { role: view.context.role, project: pick(view.context.project, ['id', 'name', 'address', 'quote_id', 'quote_version']) }, entry: { ...pick(e, ['id', 'kind', 'state', 'current_version', 'created_at', 'updated_at']), version, decisions: (e.decisions ?? []).map((d) => pick(d, ['purpose', 'party', 'accepted', 'created_at', 'active_role'])), ...(money ? pick(e, ['offer', 'summary']) : {}), events: (e.events ?? []).map((x) => ({ ...pick(x, ['id', 'kind', 'version', 'created_at', 'active_role', 'state']), data: payload(x.data) })) }, events: (view.events ?? []).map((x) => ({ media: (x.media ?? []).filter((m) => !client || m.visibility === 'client') })) }; }
