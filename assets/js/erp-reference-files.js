import { normalizeReference, normalizeReferenceVariant, referenceHtml, referencePlain } from './erp-reference-model.js';
import { WorkMedia } from './erp-workplan-media.js';
import { SurveyStore } from './erp-survey-store.js';
import { checkMediaBytes } from './erp-survey-model.js';
import { downloadSurveyFile } from './erp-survey-archive.js';
export class ReferenceLocal {
    opened;
    db() { return this.opened ??= new Promise((resolve, reject) => { const r = indexedDB.open('diszkertek-erp-reference-drafts', 1); r.onupgradeneeded = () => r.result.createObjectStore('drafts', { keyPath: 'key' }); r.onsuccess = () => resolve(r.result); r.onerror = () => { this.opened = undefined; reject(Error('A referencia helyi tárhelye nem érhető el.')); }; }); }
    async list(owner) { const db = await this.db(); return new Promise((resolve, reject) => { const r = db.transaction('drafts').objectStore('drafts').getAll(); r.onsuccess = () => resolve(r.result.filter((x) => x.owner === owner)); r.onerror = () => reject(Error('A helyi referencia nem olvasható.')); }); }
    async put(owner, id, value, expected) { const db = await this.db(); return new Promise((resolve, reject) => { const tx = db.transaction('drafts', 'readwrite'), s = tx.objectStore('drafts'), r = s.get(owner + '/' + id); let conflict = false; r.onsuccess = () => { if ((r.result?.localVersion ?? 0) !== expected) {
        conflict = true;
        tx.abort();
        return;
    } s.put({ key: owner + '/' + id, owner, id, value: structuredClone(value), localVersion: expected + 1 }); }; tx.oncomplete = () => resolve(expected + 1); tx.onerror = tx.onabort = () => reject(Error(conflict ? 'Másik ablak módosította a helyi referenciát. Másold ki a szöveget, majd nyisd meg újra.' : 'A helyi mentés nem sikerült. Ne zárd be az ablakot.')); }); }
}
export class ReferenceFiles {
    media = new WorkMedia();
    surveys = new SurveyStore();
    async read(owner, id, ref) { const blob = await this.media.read('reference/' + owner, id, ref.id); if (blob && (blob.size !== ref.bytes || await this.hash(blob) !== ref.sha256))
        throw Error('A helyi kép nem egyezik a mentett változattal.'); return blob; }
    async hash(blob) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())), b => b.toString(16).padStart(2, '0')).join(''); }
    async add(owner, id, file, group) { const m = await this.media.add('reference/' + owner, id, file, 'team'); return { id: m.id, group, mime: 'image/jpeg', bytes: m.bytes, sha256: m.sha256, caption: '', alt: '' }; }
    async copy(owner, person, id, project, source, group) { const blob = source.source === 'survey' ? (await this.surveys.media(owner, source.id))?.blob : await this.media.read(person, project, source.id); if (!blob)
        throw Error('A forrásfotó nincs ezen az eszközön. Hozd át az eredeti csomagból, vagy válaszd ki képfájlként.'); if (source.sha256 && await this.hash(blob) !== source.sha256)
        throw Error('A forrásfotó ellenőrzőösszege eltér.'); return this.add(owner, id, new File([blob], source.id + '.jpg', { type: blob.type }), group); }
    async export(owner, id, doc, variants, platform) { const d = normalizeReference(doc); const selected = platform ? { [platform]: variants[platform] } : variants; const normalized = {}; for (const [k, v] of Object.entries(selected)) {
        if (!v)
            continue;
        normalized[k] = normalizeReferenceVariant(v.document ?? v, d);
    } if (platform && !normalized[platform])
        throw Error('Előbb készítsd el a kiválasztott változatot.'); const files = {}, missing = [], media = platform ? d.media.filter(m => normalized[platform].photos.some(p => p.media_id === m.id)) : d.media; let total = 0; for (const m of media) {
        const blob = await this.read(owner, id, m);
        if (!blob) {
            missing.push(m.id);
            continue;
        }
        total += blob.size;
        if (total > 64 * 1024 * 1024)
            throw Error('A csomag nagyobb 64 MB-nál. Kevesebb képpel töltsd le.');
        files['media/' + m.id + '.jpg'] = new Uint8Array(await blob.arrayBuffer());
    } if (platform && missing.length)
        throw Error('A posztcsomaghoz hiányzó képek vannak. Előbb töltsd vissza őket ezen az eszközön.'); for (const [k, v] of Object.entries(normalized)) {
        files[k + '.txt'] = new TextEncoder().encode(referencePlain(v));
        if (k === 'web') {
            const images = new Map(v.photos.filter(p => files['media/' + p.media_id + '.jpg']).map(p => [p.media_id, { url: 'media/' + p.media_id + '.jpg' }]));
            files['web.html'] = new TextEncoder().encode('<!doctype html><html lang="hu"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + v.title.replace(/[&<>"']/g, '') + '</title><body>' + referenceHtml(v, images) + '</body></html>');
        }
    } files['referencia.json'] = new TextEncoder().encode(JSON.stringify({ format: 'diszkertek-reference-1', id, document: platform ? { version: 1, title: normalized[platform].title, wishes: '', realization: '', materials: '', media } : d, variants: normalized, missing_files: missing })); const z = await import(new URL('../vendor/fflate-0.8.2.js', import.meta.url).href); downloadSurveyFile(new Blob([z.zipSync(files, { level: 0 })], { type: 'application/zip' }), 'Diszkertek_referencia_' + (platform ?? 'mentes') + '_' + id + '.zip'); return missing.length; }
    async import(owner, id, doc, file) { if (file.size > 70 * 1024 * 1024)
        throw Error('A csomag legfeljebb 70 MB lehet.'); let total = 0, count = 0; const allowed = new Map(doc.media.map(m => ['media/' + m.id + '.jpg', m])); const z = await import(new URL('../vendor/fflate-0.8.2.js', import.meta.url).href); const unpacked = z.unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: f => { if (f.name !== 'referencia.json' && !allowed.has(f.name))
            return false; if (++count > 202 || f.originalSize > 4194304 || (total += f.originalSize) > 70 * 1024 * 1024)
            throw Error('A kibontott csomag túl nagy.'); return true; } }); if (!unpacked['referencia.json'])
        throw Error('Hiányzik a csomag leírófájlja.'); const manifest = JSON.parse(new TextDecoder().decode(unpacked['referencia.json'])); if (manifest.format !== 'diszkertek-reference-1' || manifest.id !== id)
        throw Error('A csomag másik referenciához tartozik.'); const all = []; for (const [path, m] of allowed) {
        const bytes = unpacked[path];
        if (!bytes)
            continue;
        checkMediaBytes(bytes, m.mime);
        const blob = new Blob([bytes], { type: m.mime });
        if (blob.size !== m.bytes || await this.hash(blob) !== m.sha256)
            throw Error('A csomagban eltérő kép található.');
        all.push({ m, blob });
    } const view = { context: { role: 'office', project: { id } }, events: [{ media: all.map(({ m }) => ({ ...m, name: m.id + '.jpg', visibility: 'team' })) }] }; const files = { 'munkaterv.json': new TextEncoder().encode(JSON.stringify({ format: 'diszkertek-workplan-1', project_id: id, view })) }; for (const { m, blob } of all)
        files['media/' + m.id] = new Uint8Array(await blob.arrayBuffer()); const zip = await import(new URL('../vendor/fflate-0.8.2.js', import.meta.url).href); return this.media.import('reference/' + owner, view, new File([zip.zipSync(files, { level: 0 })], 'referencia.zip', { type: 'application/zip' })); }
}
