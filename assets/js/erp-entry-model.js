import { calculateQuote, customerQuote, decimal } from './erp-quote-engine.js';
export const entryKinds = { extra: 'Extra munka', modify: 'Meglévő munka módosítása', remove: 'Tétel törlése', note: 'Megjegyzés', request: 'Kérés', complaint: 'Panasz', defect: 'Hibabejelentés', damage: 'Káresemény' };
export const financialKinds = ['extra', 'modify', 'remove'];
export const entryUuid = (v) => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const text = (v, max, label) => { if (typeof v !== 'string' || v.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v))
    throw Error(label + ': hibás vagy túl hosszú érték.'); return v.trim(); };
const numeric = (v, label) => { decimal(v, label); return String(v).trim().replace(',', '.'); };
export function validateEntryPayload(raw, kind) {
    if (!Object.keys(entryKinds).includes(kind) || !raw || typeof raw !== 'object' || Array.isArray(raw))
        throw Error('Válassz bejegyzéstípust.');
    const body = text(raw.body, 12000, 'Bejegyzés');
    if (!body)
        throw Error('Írd le a bejegyzés tartalmát.');
    const data = { body, visible_to_team: raw.visible_to_team === true, recipient_id: raw.recipient_id ?? null, target_line_id: raw.target_line_id ?? null, media: [] };
    if (data.recipient_id !== null && !entryUuid(data.recipient_id))
        throw Error('Érvénytelen címzett.');
    if (data.target_line_id !== null && (typeof data.target_line_id !== 'string' || data.target_line_id.length > 200))
        throw Error('Érvénytelen ajánlati sor.');
    if (['modify', 'remove'].includes(kind) && !data.target_line_id)
        throw Error('Válaszd ki az érintett ajánlati sort.');
    if (!Array.isArray(raw.media ?? []) || (raw.media ?? []).length > 12)
        throw Error('Legfeljebb tizenkét fotó csatolható.');
    const ids = new Set();
    data.media = (raw.media ?? []).map((m) => { if (!entryUuid(m.id) || ids.has(m.id) || !['image/jpeg', 'image/png', 'image/webp'].includes(m.mime) || !Number.isSafeInteger(m.bytes) || m.bytes < 1 || m.bytes > 4 * 1024 * 1024 || m.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(m.sha256))
        throw Error('Érvénytelen helyi fotó.'); ids.add(m.id); return { id: m.id, name: text(m.name, 180, 'Fájlnév'), mime: m.mime, bytes: m.bytes, visibility: 'client', ...(m.sha256 ? { sha256: m.sha256 } : {}) }; });
    if (kind === 'modify' && raw.suggestion) {
        const x = raw.suggestion, p = { params: {} };
        for (const key of ['quantity', 'material_unit', 'labor_unit'])
            if (x[key] !== undefined && x[key] !== '')
                p[key] = numeric(x[key], key);
        for (const [key, value] of Object.entries(x.params ?? {})) {
            if (!/^[a-z][a-z0-9_]{0,30}$/.test(key))
                throw Error('Érvénytelen paraméter.');
            p.params[key] = numeric(value, 'Paraméter');
        }
        if (Object.keys(p.params).length > 16)
            throw Error('Túl sok paraméter.');
        data.suggestion = p;
    }
    if (kind === 'damage') {
        const d = raw.damage ?? {};
        data.damage = { location: text(d.location ?? '', 500, 'Kár helye'), occurred_at: d.occurred_at ?? '', cause: text(d.cause ?? '', 4000, 'Feltételezett ok'), responsible: d.responsible ?? 'unknown', responsible_name: text(d.responsible_name ?? '', 200, 'Érintett neve'), estimated: d.estimated === '' || d.estimated == null ? null : numeric(d.estimated, 'Becsült kár'), actual: d.actual === '' || d.actual == null ? null : numeric(d.actual, 'Tényleges kár') };
        if (!['contractor', 'client', 'third_party', 'unknown'].includes(data.damage.responsible) || data.damage.occurred_at && !Number.isFinite(Date.parse(data.damage.occurred_at)))
            throw Error('Ellenőrizd a kár idejét és feltételezett felelősét.');
    }
    return data;
}
export const canonical = (value) => JSON.stringify(value, (_key, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
export function quoteLines(input, calculation) { return input.sections.flatMap((s) => s.lines.filter((l) => l.enabled !== false).map((line) => ({ section: s, line, result: calculation.sections.flatMap((c) => c.lines).find((r) => r.id === line.id) }))); }
export function publicEntryQuote(input, calculation) { return { ...customerQuote(calculation), title: input.title, vat: input.vat, lines: quoteLines(input, calculation).map(({ section, line, result }) => ({ id: line.id, section: section.name, label: result.label, quantity: result.quantity, unit: result.unit, material_unit: result.material_unit, labor_unit: result.labor_unit, material: result.material, labor: result.labor, net: result.net, params: publicParams(section, line, result), fields: parameterFields(line.pricing) })) }; }
export function parameterFields(t) { return t.mode === 'custom' ? t.fields.map((f) => ({ key: f.key, label: f.label, unit: f.unit })) : t.mode === 'excel' ? [{ key: 'q1', label: 'Mennyiség', unit: t.unit }, ...(t.unit2 ? [{ key: 'q2', label: 'Második mennyiség', unit: t.unit2 }] : [])] : [{ key: 'length', label: 'Hossz', unit: 'm' }, { key: 'width', label: 'Szélesség', unit: 'm' }, ...(['volume', 'layered'].includes(t.mode) ? [{ key: 'thickness', label: 'Vastagság', unit: 'cm' }] : []), ...(t.mode === 'density' ? [{ key: 'density', label: 'Növénysűrűség', unit: 'db/m²' }] : [])]; }
export function publicParams(section, line, result) { const t = line.pricing, p = {}; for (const f of parameterFields(t))
    p[f.key] = line.params?.[f.key] ?? t.defaults?.[f.key] ?? ''; if (line.inherit) {
    if (t.mode === 'excel' && ['m²', 'm2'].includes(t.unit))
        p.q1 = result.quantity;
    else if (t.mode === 'custom') {
        for (const f of t.fields)
            if (f.inherit && section[f.inherit])
                p[f.key] = section[f.inherit];
    }
    else if (t.mode !== 'excel') {
        p.length = section.length;
        p.width = section.width;
    }
} return p; }
export function customerChange(base, kind, payload, entryId, version) { if (!['modify', 'remove'].includes(kind))
    return null; const input = structuredClone(base), calc = calculateQuote(input), found = quoteLines(input, calc).find((r) => r.line.id === payload.target_line_id); if (!found)
    throw Error('Az ajánlati sor már nem aktuális.'); if (kind === 'remove') {
    found.section.lines = found.section.lines.filter((l) => l.id !== payload.target_line_id);
    input.sections = input.sections.filter((s) => s.lines.length);
}
else {
    const s = payload.suggestion ?? {}, line = found.line;
    line.params = publicParams(found.section, line, found.result);
    line.inherit = false;
    const allowed = parameterFields(line.pricing).map((f) => f.key);
    for (const key of Object.keys(s.params ?? {})) {
        if (!allowed.includes(key))
            throw Error('Ismeretlen paraméter.');
        line.params[key] = s.params[key];
    }
    if (s.quantity !== undefined) {
        if (line.pricing.mode === 'excel' || line.pricing.mode === 'custom' && line.pricing.quantity_formula === 'q1')
            line.params.q1 = s.quantity;
        else if (decimal(calculateQuote(input).sections.flatMap((s) => s.lines).find((l) => l.id === line.id)?.quantity) !== decimal(s.quantity))
            return null;
    }
    if (s.material_unit !== undefined || s.labor_unit !== undefined)
        line.agreement = { ...(line.agreement ?? {}), entry_id: entryId, version, ...(s.material_unit !== undefined ? { material_unit: s.material_unit } : {}), ...(s.labor_unit !== undefined ? { labor_unit: s.labor_unit } : {}) };
} return completeOffer(base, input, kind, payload.target_line_id); }
export function completeOffer(base, candidate, kind, target) { if (!financialKinds.includes(kind))
    throw Error('Ez nem pénzügyi változás.'); const input = structuredClone(candidate); for (const key of Object.keys(base))
    if (key !== 'sections' && canonical(base[key]) !== canonical(input[key]))
        throw Error('Csak az érintett ajánlati sorok módosíthatók; az ajánlat többi adata változatlan.'); const old = quoteLines(base, calculateQuote(base)), next = quoteLines(input, calculateQuote(input)), ids = new Set(); for (const r of next) {
    if (typeof r.line.id !== 'string' || !r.line.id || ids.has(r.line.id))
        throw Error('Hiányzó vagy ismétlődő sorazonosító.');
    ids.add(r.line.id);
} if (kind === 'extra') {
    for (const r of old) {
        const n = next.find((n) => n.line.id === r.line.id);
        if (!n || canonical(n.line) !== canonical(r.line) || n.section.name !== r.section.name || canonical(n.result) !== canonical(r.result))
            throw Error('Extra munka nem írhat át meglévő sort.');
    }
    if (next.length <= old.length)
        throw Error('Adj hozzá legalább egy új költségvetési sort.');
}
else {
    for (const r of old.filter((r) => r.line.id !== target)) {
        const n = next.find((n) => n.line.id === r.line.id);
        if (!n || canonical(n.line) !== canonical(r.line) || n.section.name !== r.section.name || canonical(n.result) !== canonical(r.result))
            throw Error('Csak a kijelölt sor változtatható.');
    }
    if (!old.some((r) => r.line.id === target) || next.some((r) => !old.some((o) => o.line.id === r.line.id)) || kind === 'remove' && next.some((r) => r.line.id === target) || kind === 'modify' && !next.some((r) => r.line.id === target))
        throw Error('Ellenőrizd a kijelölt sort és a változástípust.');
} const calculation = calculateQuote(input); if (calculation.issues.length)
    throw Error(calculation.issues.join(' ')); return { input, calculation }; }
export function changesScope(oldInput, newInput, oldCalc, newCalc, lineId) { const before = quoteLines(oldInput, oldCalc).find((r) => r.line.id === lineId), after = quoteLines(newInput, newCalc).find((r) => r.line.id === lineId); if (!before || !after)
    return true; const physical = (r) => [decimal(r.result.quantity).toString(), r.result.unit, r.result.label, Object.fromEntries(Object.entries(publicParams(r.section, r.line, r.result)).map(([k, v]) => [k, v === '' ? '' : decimal(v).toString()])), (r.result.materials ?? []).map((m) => ({ name: m.name, unit: m.unit, installed: decimal(m.installed).toString() }))]; return canonical(physical(before)) !== canonical(physical(after)); }
export function pricePatch(base, patch, kind, target, entryId, version) { const input = structuredClone(base); if (kind === 'remove')
    return customerChange(base, kind, { target_line_id: target }, entryId, version); if (!Array.isArray(patch?.rows) || patch.rows.length < 1 || patch.rows.length > 200 || kind === 'modify' && patch.rows.length !== 1)
    throw Error('Adj meg árazott költségvetési sort.'); if (kind === 'modify')
    for (const s of input.sections)
        s.lines = s.lines.filter((l) => l.id !== target); for (const row of patch.rows) {
    let section;
    if (row.section_index === -1) {
        section = input.sections.find((s) => s.id === row.section_id);
        if (!section) {
            if (!entryUuid(row.section_id) || typeof row.section_name !== 'string' || !row.section_name.trim())
                throw Error('Nevezd el az új főtételt.');
            section = { id: row.section_id, name: row.section_name.trim(), lines: [] };
            input.sections.push(section);
        }
    }
    else {
        if (!Number.isSafeInteger(row.section_index) || row.section_index < 0 || row.section_index >= base.sections.length)
            throw Error('Érvénytelen főtétel.');
        section = input.sections[row.section_index];
    }
    const line = structuredClone(row.line);
    if (!line || typeof line !== 'object')
        throw Error('Hiányzó típus.');
    line.id = kind === 'modify' ? target : line.id;
    if (line.agreement)
        line.agreement = { ...line.agreement, entry_id: entryId, version };
    section.lines.push(line);
} input.sections = input.sections.filter((s) => s.lines.length); return completeOffer(base, input, kind, target); }
export function offerSummary(base, offer) { const before = calculateQuote(base), after = offer.calculation; return { material: after.material, labor: after.labor, tax_base: after.tax_base, vat: after.vat, gross: after.gross, previous_gross: before.gross }; }
