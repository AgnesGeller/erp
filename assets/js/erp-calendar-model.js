export const calendarKinds = ['workers', 'vehicles', 'tools', 'materials', 'templates', 'recurrences'];
export const calendarRoles = ['office', 'construction_lead', 'maintenance_lead', 'construction_worker', 'gardener', 'client'];
export function calendarText(value, max = 4000) { if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))
    throw Error('Hibás vagy túl hosszú szöveg.'); return value; }
export function calendarId(value) { const s = calendarText(value, 120); if (!s.trim() || ['__proto__', 'prototype', 'constructor'].includes(s))
    throw Error('Hiányzó vagy hibás azonosító.'); return s; }
export function calendarDate(value) { const s = calendarText(value, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s + 'T12:00:00Z')) || new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) !== s || s < '1900-01-01' || s > '2200-12-31')
    throw Error('Érvényes dátumot adj meg.'); return s; }
export function calendarClock(value, empty = false) { if (empty && (value == null || value === ''))
    return ''; const s = calendarText(value, 5); if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s))
    throw Error('Az időpont formátuma óó:pp legyen.'); return s; }
export function calendarOffset(day, days) { calendarDate(day); const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
export function calendarWeek(day) { const n = new Date(calendarDate(day) + 'T12:00:00Z').getUTCDay(); return calendarOffset(day, -((n + 2) % 7)); }
export const calendarSearch = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('hu');
const obj = (v) => { if (!v || typeof v !== 'object' || Array.isArray(v))
    throw Error('Hibás naptári adat.'); return v; };
const array = (v, max = 500) => { if (!Array.isArray(v) || v.length > max)
    throw Error('Hibás vagy túl nagy lista.'); return v; };
const ids = (v) => { const a = array(v ?? []).map(calendarId); if (new Set(a).size !== a.length)
    throw Error('Ismétlődő hivatkozás.'); return a; };
const text = (v, max = 4000) => calendarText(v ?? '', max);
const number = (v, min, max) => { const n = Number(v); if (!Number.isFinite(n) || n < min || n > max)
    throw Error('Hibás számérték.'); return n; };
export function calendarLocalInstant(day, time, offset) { calendarDate(day); calendarClock(time); const target = day + 'T' + time; const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); const matches = [60, 120].map(m => new Date(Date.parse(target + ':00Z') - m * 60000)).filter(d => fmt.format(d).replace(' ', 'T') === target); const selected = offset ? matches.find(d => d.toISOString() === offset) : matches.length === 1 ? matches[0] : undefined; if (!selected)
    throw Error(matches.length ? 'Óraátállítás miatt két ilyen időpont van; válassz egyértelmű időt.' : 'Ez a helyi időpont nem létezik.'); return selected.toISOString(); }
export function normalizeCalendarPlan(value, day) {
    const p = obj(value);
    const date = calendarDate(day ?? p.date);
    if (p.date != null && p.date !== date)
        throw Error('A terv dátuma eltér a kiválasztott naptól.');
    const tasks = array(p.tasks ?? []).map(raw => { const t = obj(raw), id = calendarId(t.id); const workers = ids(t.workerIds), vehicles = ids(t.vehicleIds), tools = ids(t.toolIds); const quantities = {}; for (const tool of tools) {
        const q = String(t.toolQuantities?.[tool] ?? '1');
        number(q.replace(',', '.'), 0, 1000000);
        quantities[tool] = q;
    } const start = calendarClock(t.startTime, true), end = calendarClock(t.endTime, true), endDate = t.endDate ? calendarDate(t.endDate) : date; if (end) {
        if (!start)
            throw Error('A befejezéshez kezdési idő is kell.');
        const a = calendarLocalInstant(date, start), b = calendarLocalInstant(endDate, end);
        if (Date.parse(b) <= Date.parse(a) || Date.parse(b) - Date.parse(a) > 7 * 86400000)
            throw Error('A befejezésnek a kezdés után, hét napon belül kell lennie.');
    } const task = { id, teamId: calendarId(t.teamId ?? id), entryType: t.entryType === 'todo' ? 'todo' : 'customer', customerId: t.customerId ? calendarId(t.customerId) : null, locationId: t.locationId ? calendarId(t.locationId) : null, customerName: text(t.customerName, 200), address: text(t.address, 500), startTime: start, endTime: end, endDate, workerIds: workers, vehicleIds: vehicles, toolIds: tools, toolQuantities: quantities, extraTools: text(t.extraTools), jobs: array(t.jobs ?? []).map(j => ({ id: calendarId(j.id), templateId: j.templateId ? calendarId(j.templateId) : null, name: text(j.name, 300), note: text(j.note, 12000), steps: array(j.steps ?? [], 1000).map(x => text(x, 4000)) })), materials: array(t.materials ?? []).map(m => ({ materialId: m.materialId ? calendarId(m.materialId) : null, name: text(m.name, 300), source: text(m.source ?? m.purchaseLocation ?? m.address, 500), quantity: text(String(m.quantity ?? ''), 100), unit: text(m.unit, 80) })), workLogRequired: t.workLogRequired !== false, workIntensity: number(t.workIntensity ?? 3, 1, 5), workQuality: number(t.workQuality ?? 3, 1, 5), notes: text(t.notes, 12000), project_id: t.project_id ? calendarId(t.project_id) : null, booking_id: t.booking_id ? calendarId(t.booking_id) : null, work_type: ['construction', 'maintenance', 'internal'].includes(t.work_type) ? t.work_type : 'internal', recurrenceId: t.recurrenceId ? calendarId(t.recurrenceId) : null }; return task; });
    const workItems = array(p.workItems ?? []).map(w => ({ id: calendarId(w.id), type: ['work', 'survey', 'meeting', 'personal'].includes(w.type) ? w.type : 'work', customerId: w.customerId ? calendarId(w.customerId) : null, locationId: w.locationId ? calendarId(w.locationId) : null, customerName: text(w.customerName, 200), address: text(w.address, 500), note: text(w.note, 12000), appointmentTime: calendarClock(w.appointmentTime, true), reminderTimes: ids(w.reminderTimes ?? []).map(v => calendarClock(v)), personIds: ids(w.personIds ?? []), private: w.private === true || w.type === 'personal' }));
    for (const list of [tasks, workItems])
        if (new Set(list.map(t => t.id)).size !== list.length)
            throw Error('Ismétlődő tételazonosító.');
    return { id: calendarId(p.id), date, meeting: text(p.meeting, 500), stops: text(p.stops, 1000), generalNote: text(p.generalNote, 12000), tasks, workItems, deletedWorkItemIds: ids(p.deletedWorkItemIds ?? []) };
}
export function normalizeCalendarCatalog(kind, value) { if (!calendarKinds.includes(kind))
    throw Error('Ismeretlen törzstípus.'); const v = obj(value); const r = { ...v, id: calendarId(v.id), name: text(v.name ?? v.jobName, 300), active: v.active !== false, order: number(v.order ?? 0, 0, 1000000) }; for (const k of Object.keys(r))
    if (['__proto__', 'prototype', 'constructor'].includes(k))
        delete r[k]; if (['workers', 'vehicles'].includes(kind)) {
    if (!/^#[a-f0-9]{6}$/i.test(v.color ?? ''))
        throw Error('A személy- vagy autószín hiányzik vagy hibás.');
    r.color = v.color;
} if (kind === 'templates') {
    r.toolIds = ids(v.toolIds ?? []);
    r.steps = array(v.steps ?? [], 1000).map(x => text(x, 4000));
    r.note = text(v.note, 12000);
    r.materials = array(v.materials ?? []);
} if (kind === 'recurrences') {
    calendarDate(v.startDate);
    calendarDate(v.endDate);
    if (v.startDate > v.endDate)
        throw Error('Az ismétlés zárónapja túl korai.');
} if (JSON.stringify(r).length > 120000)
    throw Error('Túl nagy törzsadat.'); return r; }
export function calendarRecurrenceDates(value, from, to) { calendarDate(from); calendarDate(to); if (from > to || Date.parse(to) - Date.parse(from) > 366 * 86400000)
    throw Error('Legfeljebb egyéves időszakot válassz.'); const start = calendarDate(value.startDate), end = calendarDate(value.endDate); const frequency = value.frequency ?? 'weekly', out = []; for (let date = from; date <= to; date = calendarOffset(date, 1)) {
    if (date < start || date > end)
        continue;
    const d = new Date(date + 'T12:00:00Z'), elapsed = Math.round((Date.parse(date) - Date.parse(start)) / 86400000);
    let yes = false;
    if (frequency === 'custom')
        yes = (value.customDates ?? []).includes(date);
    else if (frequency === 'monthly') {
        const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
        yes = d.getUTCDate() === Math.min(Number(value.monthDay ?? start.slice(8, 10)), last);
    }
    else if (['weekly', 'biweekly'].includes(frequency))
        yes = d.getUTCDay() === Number(value.weekday) && Math.floor(elapsed / 7) % (frequency === 'biweekly' ? 2 : 1) === 0;
    else
        throw Error('Ismeretlen ismétlődés.');
    if (yes)
        out.push(date);
} return out; }
export function calendarSourceManifest(config, rows) { const counts = { plans: 0, deleted: 0, tasks: 0, workItems: 0, catalog: {} }; for (const k of calendarKinds)
    counts.catalog[k] = array(config[k] ?? [], 50000).length; const seen = new Set(); for (const row of rows) {
    const date = calendarDate(row.plan_date);
    if (seen.has(date))
        throw Error('Több forrásterv tartozik ugyanahhoz a naphoz.');
    seen.add(date);
    if (row.payload?.deleted === true) {
        counts.deleted++;
        continue;
    }
    const p = normalizeCalendarPlan(row.payload, date);
    counts.plans++;
    counts.tasks += p.tasks.length;
    counts.workItems += p.workItems.length;
} return counts; }
export function calendarDaySlots(plan) { const p = normalizeCalendarPlan(plan); return p.tasks.map((t) => ({ task_id: t.id, project_id: t.project_id, work_type: t.work_type, workers: t.workerIds, vehicles: t.vehicleIds, headcount: t.workerIds.length, start: t.startTime && t.endTime ? calendarLocalInstant(p.date, t.startTime) : null, end: t.startTime && t.endTime ? calendarLocalInstant(t.endDate, t.endTime) : null, uncertain: t.workerIds.length > 0 && !t.endTime, padding: t.work_type === 'maintenance' ? 60 : 0 })); }
export const calendarIntensityDescriptions = { "1": "Lassú tempó – kényelmesebb munkavégzés, több pihenőidővel.", "2": "Kímélő tempó – folyamatos, de nyugodt munkavégzés, sietség nélkül.", "3": "Normál tempó – átlagos, megszokott, folyamatos és egyenletes haladás.", "4": "Fokozott tempó – lendületes munkavégzés, kevés pihenővel és nagyobb koncentrációval.", "5": "Maximális tempó – nagyon gyors, koncentrált munkavégzés; a mielőbbi befejezés kiemelt." };
export const calendarQualityDescriptions = { "1": "Minimális kivitelezési szint – a feladat legyen elvégezve; a részletek nem elsődlegesek.", "2": "Alap kivitelezési szint – rendezett összkép, apró pontatlanságok elfogadhatók.", "3": "Normál minőség – a megszokott szakmai színvonalon, rendezetten kell dolgozni.", "4": "Igényes kivitelezés – fokozott figyelem a részletekre, szélekre és befejezésekre.", "5": "Prémium kivitelezés – maximális precizitás; minden részlet legyen pontos és kifogástalan." };
