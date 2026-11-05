const fail = (s) => { throw Error(s); };
const row = (v) => {
    if (!v || typeof v !== 'object' || Array.isArray(v))
        fail('Hiányos kivitelezési adat.');
    return v;
};
const array = (v) => {
    if (!Array.isArray(v))
        fail('A részfolyamatok listája hiányzik.');
    return v;
};
const text = (v, max = 500) => {
    if (typeof v !== 'string' || v.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))
        fail('Hibás vagy túl hosszú szöveg.');
    return v.trim();
};
export const executionUuid = (v) => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const id = (v) => executionUuid(v) ? v : fail('Hiányzó vagy hibás kivitelezési azonosító.');
const integer = (v, min = 0, max = 2147483647) => Number.isSafeInteger(v) && Number(v) >= min && Number(v) <= max ? Number(v) : fail('Hibás sorszám vagy százalék.');
const unique = (xs, label) => {
    if (new Set(xs).size !== xs.length)
        fail('Ismétlődő ' + label + '.');
};
export function executionUnits(v, digits = 6) {
    const s = String(v ?? '').replace(',', '.');
    if (!/^\d+(?:\.\d+)?$/.test(s) || s.length > 30)
        fail('Nem negatív, pontos szám szükséges.');
    const [whole, fraction = ''] = s.split('.');
    if (fraction.length > digits)
        fail('Túl sok tizedesjegy.');
    return BigInt(whole) * 10n ** BigInt(digits) + BigInt(fraction.padEnd(digits, '0'));
}
export function executionAmount(v, digits = 6) { const u = 10n ** BigInt(digits); return String(v / u) + (digits ? '.' + String(v % u).padStart(digits, '0') : ''); }
export function allocateExecution(total, steps, key = 'labor_bps', digits = 2) {
    const sum = steps.reduce((s, p) => s + integer(p[key], 0, 10000), 0);
    if (sum !== 10000)
        fail('A részfeladatok aránya összesen pontosan 100% legyen.');
    if (total == null)
        return steps.map(() => null);
    const amount = executionUnits(total, digits), values = steps.map(p => amount * BigInt(p[key]) / 10000n);
    let remaining = amount - values.reduce((a, b) => a + b, 0n);
    const order = steps.map((p, i) => ({ i, id: String(p.id), rest: amount * BigInt(p[key]) % 10000n })).sort((a, b) => a.rest === b.rest ? a.id.localeCompare(b.id) : a.rest > b.rest ? -1 : 1);
    for (const p of order) {
        if (!remaining)
            break;
        values[p.i]++;
        remaining--;
    }
    return values.map(x => executionAmount(x, digits));
}
export function validateExecutionGraph(parts, stages) {
    const map = new Map(parts.map(p => [id(p.id), p]));
    if (map.size !== parts.length)
        fail('Ismétlődő részfeladat.');
    const incoming = new Map(), followers = new Map(), stageMap = new Map((stages ?? []).map(s => [s.id, s]));
    for (const p of parts) {
        const deps = p.dependencies ?? [];
        if (!Array.isArray(deps))
            fail('Hiányos előfeltétellista.');
        unique(deps, 'előfeltétel');
        if (deps.some((d) => d === p.id || !map.has(String(d))))
            fail('Idegen vagy önmagára mutató előfeltétel.');
        incoming.set(p.id, deps.length);
        for (const d of deps) {
            const before = map.get(d);
            if (stages && stageMap.get(before.stage_id)?.sort > stageMap.get(p.stage_id)?.sort)
                fail('Az előfeltétel nem kerülhet későbbi szakaszba.');
            const list = followers.get(d) ?? [];
            list.push(p.id);
            followers.set(d, list);
        }
    }
    const queue = parts.filter(p => !incoming.get(p.id)).map(p => p.id);
    let count = 0;
    for (let i = 0; i < queue.length; i++) {
        const at = queue[i];
        count++;
        for (const next of followers.get(at) ?? []) {
            incoming.set(next, incoming.get(next) - 1);
            if (!incoming.get(next))
                queue.push(next);
        }
    }
    if (count !== parts.length)
        fail('A részfeladatok előfeltételei körbe mutatnak.');
    return true;
}
export function normalizeExecutionProcess(value, stageIds) {
    const p = row(value);
    if (p.inherit === true)
        return { inherit: true, steps: [] };
    const steps = array(p.steps).map((raw, i) => {
        const s = row(raw), step = { id: id(s.id), title: text(s.title), stage_id: s.stage_id == null ? null : id(s.stage_id), sort: integer(s.sort ?? i), labor_bps: integer(s.labor_bps ?? (p.steps.length === 1 ? 10000 : NaN), 0, 10000), time_bps: integer(s.time_bps ?? s.labor_bps ?? (p.steps.length === 1 ? 10000 : NaN), 0, 10000), description: text(s.description ?? '', 12000), quantity_mode: s.quantity_mode ?? 'parent', dependencies: (s.dependencies ?? []).map(id) };
        if (!step.title)
            fail('A részfolyamat neve kötelező.');
        if (stageIds && step.stage_id && !stageIds.has(step.stage_id))
            fail('A részfolyamat idegen szakaszra hivatkozik.');
        if (!['parent', 'manual', 'field'].includes(step.quantity_mode))
            fail('Ismeretlen műveleti mennyiség.');
        if (step.quantity_mode === 'manual') {
            executionUnits(s.quantity);
            step.quantity = String(s.quantity).replace(',', '.');
            step.unit = text(s.unit, 30);
            if (!step.unit)
                fail('A műveleti mértékegység kötelező.');
        }
        if (step.quantity_mode === 'field') {
            if (!['quantity', 'area', 'volume', 'length', 'count'].includes(s.quantity_field))
                fail('Ismeretlen mennyiségi forrás.');
            step.quantity_field = s.quantity_field;
            step.unit = text(s.unit, 30);
            if (!step.unit)
                fail('A műveleti mértékegység kötelező.');
        }
        return step;
    });
    if (!steps.length)
        fail('Adj meg legalább egy részfolyamatot, vagy válaszd a kategória alapját.');
    unique(steps.map(s => s.id), 'részfolyamat');
    allocateExecution('0', steps);
    allocateExecution('0', steps, 'time_bps');
    validateExecutionGraph(steps);
    return { inherit: false, steps: steps.sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id)) };
}
export function normalizeExecutionCatalog(value) {
    const p = row(value), stages = array(p.stages).map((raw, i) => {
        const s = row(raw);
        const title = text(s.name, 200);
        if (!title)
            fail('A szakasz neve kötelező.');
        return { id: id(s.id), name: title, number: integer(s.number, 1), sort: integer(s.sort ?? i), opening: s.opening === true, closing: s.closing === true, active: s.active !== false };
    });
    unique(stages.map(s => s.id), 'szakasz');
    unique(stages.map(s => String(s.number)), 'szakaszsorszám');
    for (const flag of ['opening', 'closing'])
        if (stages.filter(s => s[flag] && s.active).length > 1)
            fail('Egyetlen aktív nyitó- és zárószakasz adható meg.');
    if (stages.some(s => s.opening && s.closing))
        fail('A nyitó- és zárószakasz különböző legyen.');
    const ids = new Set(stages.map(s => s.id));
    const categories = array(p.categories ?? []).map(raw => {
        const c = row(raw), name = text(c.name, 150);
        if (!name)
            fail('A kategória neve kötelező.');
        return { id: id(c.id), name, process: normalizeExecutionProcess(c.process, ids) };
    });
    unique(categories.map(c => c.id), 'kategóriaazonosító');
    unique(categories.map(c => c.name), 'kategórianév');
    return { version: 1, stages: stages.sort((a, b) => a.sort - b.sort || a.number - b.number), categories };
}
export function normalizeExecutionLayout(value, parents) {
    const input = row(value), source = new Map(parents.map(t => [id(t.id), t])), stages = array(input.stages).map((raw, i) => {
        const s = row(raw), name = text(s.name, 200);
        if (!name)
            fail('A szakasz neve kötelező.');
        return { id: id(s.id), source_key: s.source_key == null ? null : id(s.source_key), name, number: integer(s.number, 1), sort: integer(s.sort ?? i), opening: s.opening === true, closing: s.closing === true, unassigned: s.unassigned === true };
    });
    unique(stages.map(s => s.id), 'szakasz');
    unique(stages.map(s => String(s.number)), 'szakaszsorszám');
    unique(stages.map(s => String(s.sort)), 'szakaszsorrend');
    if (stages.length > 1000 || input.parts?.length > 10000)
        fail('A kivitelezési munkaterv túl nagy az egyidejű szerkesztéshez.');
    const stageMap = new Map(stages.map(s => [s.id, s]));
    const parts = array(input.parts).map((raw, i) => {
        const p = row(raw), parent = p.parent_task_id == null ? null : source.get(id(p.parent_task_id));
        if (p.parent_task_id && !parent)
            fail('Idegen vagy már nem aktív forrástétel.');
        const title = text(p.title);
        if (!title)
            fail('A részfeladat neve kötelező.');
        if (!stageMap.has(p.stage_id))
            fail('A részfeladat szakasza hiányzik.');
        const part = { id: id(p.id), parent_task_id: parent?.id ?? null, template_key: p.template_key == null ? null : id(p.template_key), derive_from_part_id: p.derive_from_part_id == null ? null : id(p.derive_from_part_id), stage_id: id(p.stage_id), title, description: text(p.description ?? '', 12000), sort: integer(p.sort ?? i), quantity: String(p.quantity ?? parent?.quantity ?? '0').replace(',', '.'), unit: text(p.unit ?? parent?.unit ?? '', 30), labor_bps: integer(p.labor_bps ?? (parent ? NaN : 0), 0, 10000), time_bps: integer(p.time_bps ?? p.labor_bps ?? (parent ? NaN : 0), 0, 10000), dependencies: (p.dependencies ?? []).map(id), start_date: p.start_date ?? null, end_date: p.end_date ?? null };
        executionUnits(part.quantity);
        if (!part.unit)
            fail('A részfeladat mértékegysége kötelező.');
        for (const day of [part.start_date, part.end_date])
            if (day && (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day + 'T12:00:00Z')) || new Date(day + 'T12:00:00Z').toISOString().slice(0, 10) !== day))
                fail('Hibás ütemezési dátum.');
        if (part.start_date && part.end_date && part.end_date < part.start_date)
            fail('A befejezés nem lehet a kezdés előtt.');
        if (!parent) {
            if (part.labor_bps || part.time_bps)
                fail('A belső kézi munkalépés nem kaphat ügyfélmunkadíjat.');
            part.labor = '0.00';
            part.original_minutes = '0.000000';
            part.planned_minutes = p.planned_minutes == null ? '0.000000' : executionAmount(executionUnits(p.planned_minutes));
        }
        return part;
    });
    unique(parts.map(p => p.id), 'részfeladat');
    for (const parent of parents) {
        const group = parts.filter(p => p.parent_task_id === parent.id);
        if (!group.length)
            fail('Az ajánlati sorhoz legalább egy részfeladat szükséges.');
        const labor = allocateExecution(parent.labor, group), original = allocateExecution(parent.original_minutes, group, 'time_bps', 6), planned = allocateExecution(parent.planned_minutes, group, 'time_bps', 6);
        group.forEach((p, i) => { p.labor = labor[i]; p.original_minutes = original[i]; p.planned_minutes = planned[i]; });
    }
    validateExecutionGraph(parts, stages);
    const issues = stages.filter(s => s.unassigned && parts.some(p => p.stage_id === s.id)).map(s => 'A „' + s.name + '” szakasz részfeladatait még be kell sorolni.');
    const ordered = [...stages].sort((a, b) => a.sort - b.sort);
    if (ordered.some((s, i) => s.opening && i !== 0 || s.closing && i !== ordered.length - 1))
        issues.push('A nyitó- és zárószakasz helyét ellenőrizd.');
    return { version: 1, stages: ordered, parts: parts.sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id)), issues };
}
export function buildExecutionLayout(parents, rawCatalog, idFor, processes = {}) {
    const catalog = normalizeExecutionCatalog(rawCatalog), stages = catalog.stages.filter(s => s.active).map(s => ({ ...s, source_key: s.id })), parts = [];
    const known = new Set(stages.map(s => s.id));
    let unsorted;
    const fallback = () => {
        if (!unsorted) {
            unsorted = { id: id(idFor('unassigned')), source_key: null, name: 'Besorolásra vár', number: Math.max(0, ...stages.map(s => s.number)) + 1, sort: stages.length, opening: false, closing: false, unassigned: true };
            stages.push(unsorted);
        }
        return unsorted.id;
    };
    for (const t of parents) {
        let raw = processes[t.id] ?? t.work_process;
        const category = catalog.categories.find(c => c.name === t.category);
        if (!raw || row(raw).inherit === true)
            raw = category?.process;
        const process = raw && row(raw).inherit !== true ? normalizeExecutionProcess(raw) : { steps: [{ id: idFor('template/' + t.id), title: t.title, stage_id: null, labor_bps: 10000, time_bps: 10000, sort: 0, description: t.internal_info ?? '', dependencies: [], quantity_mode: 'parent' }] };
        const local = new Map(process.steps.map(s => [s.id, id(idFor('part/' + t.id + '/' + s.id))]));
        for (const step of process.steps) {
            let quantity = t.quantity, unit = t.unit;
            if (step.quantity_mode === 'manual') {
                quantity = step.quantity;
                unit = step.unit;
            }
            else if (step.quantity_mode === 'field') {
                const n = t.metrics?.[step.quantity_field];
                if (n == null || Number(n) <= 0)
                    fail('Hiányzó műveleti mennyiség: ' + step.title);
                quantity = n;
                unit = step.unit;
            }
            parts.push({ id: local.get(step.id), parent_task_id: t.id, template_key: step.id, stage_id: known.has(step.stage_id) ? step.stage_id : fallback(), title: step.title, description: step.description ?? '', sort: parts.length, labor_bps: step.labor_bps, time_bps: step.time_bps, quantity, unit, start_date: t.start_date ?? null, end_date: t.end_date ?? null, dependencies: step.dependencies.map((x) => local.get(x)) });
        }
    }
    for (const t of parents) {
        const own = parts.filter(p => p.parent_task_id === t.id), before = parts.filter(p => (t.dependencies ?? []).includes(p.parent_task_id));
        for (const p of own)
            p.dependencies = [...new Set([...p.dependencies, ...before.map(x => x.id)])];
    }
    return normalizeExecutionLayout({ stages, parts }, parents);
}
export function moveExecutionPart(layout, partId, stageId, beforeId) {
    const copy = structuredClone(layout), part = copy.parts.find((p) => p.id === partId);
    if (!part || !copy.stages.some((s) => s.id === stageId))
        fail('A húzott részfeladat vagy célhely már nem elérhető.');
    const target = copy.parts.filter((p) => p.stage_id === stageId && p.id !== partId).sort((a, b) => a.sort - b.sort);
    if (beforeId && !target.some((p) => p.id === beforeId))
        fail('A célhely megváltozott.');
    part.stage_id = stageId;
    target.splice(beforeId ? target.findIndex((p) => p.id === beforeId) : target.length, 0, part);
    target.forEach((p, i) => p.sort = i);
    validateExecutionGraph(copy.parts, copy.stages);
    return copy;
}
/** Az új ajánlat saját, változatlan kivitelezési alapot kap. */
export function freezeExecutionQuote(raw, current) { const input = structuredClone(raw), snapshot = input.execution_catalog ?? current; const catalog = normalizeExecutionCatalog(snapshot.document ?? snapshot); const revision = integer(snapshot.revision ?? 0); input.execution_catalog = { revision, document: catalog }; for (const section of input.sections ?? [])
    for (const line of section.lines ?? []) {
        if (!line.pricing)
            continue;
        const own = line.pricing.work_process;
        if (own && own.inherit !== true)
            line.pricing.work_process = normalizeExecutionProcess(own, new Set(catalog.stages.map(s => s.id)));
        else {
            const category = catalog.categories.find(c => c.name === line.pricing.category);
            line.pricing.work_process = category && category.process.inherit !== true ? structuredClone(category.process) : { inherit: true, steps: [] };
        }
    } return input; }
