export const workRoleRank = (role) => role === 'office' ? 3 : role === 'construction_lead' || role === 'maintenance_lead' ? 2 : role === 'client' ? 4 : 1;
const fail = (message) => { throw Error(message); };
export function decimalUnits(value, precision = 2) {
    const s = String(value ?? '');
    if (!/^\d+(?:\.\d+)?$/.test(s) || s.length > 24)
        fail('Nem negatív, pontos szám szükséges.');
    const [whole, fraction = ''] = s.split('.');
    if (fraction.length > precision)
        fail('Túl sok tizedesjegy.');
    return BigInt(whole) * 10n ** BigInt(precision) + BigInt((fraction + '0'.repeat(precision)).slice(0, precision));
}
function amount(value, precision = 2) { const base = 10n ** BigInt(precision); return String(value / base) + '.' + String(value % base).padStart(precision, '0'); }
const unique = (xs) => [...new Set(xs)].sort();
function text(value, max) { if (typeof value !== 'string' || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))
    fail('Érvénytelen szöveges adat.'); return value; }
export function equalShares(people) { const ids = unique(people); if (!ids.length || ids.length > 100)
    fail('Válassz legalább egy, legfeljebb száz résztvevőt.'); const base = Math.floor(10000 / ids.length), rest = 10000 % ids.length; return ids.map((person_id, i) => ({ person_id, basis_points: base + (i < rest ? 1 : 0) })); }
export function validShares(input, allowed) {
    if (!Array.isArray(input) || !input.length || input.length > 100)
        fail('Adj meg résztvevőket és 100%-os megosztást.');
    const seen = new Set();
    let sum = 0;
    for (const s of input) {
        if (!allowed.includes(s.person_id) || seen.has(s.person_id) || !Number.isInteger(s.basis_points) || s.basis_points <= 0 || s.basis_points > 10000)
            fail('Hibás résztvevő vagy teljesítményarány.');
        seen.add(s.person_id);
        sum += s.basis_points;
    }
    if (sum !== 10000)
        fail('A teljesítménymegosztás összege pontosan 100% legyen.');
    return [...input].map(x => ({ ...x })).sort((a, b) => a.person_id.localeCompare(b.person_id));
}
function mediaRefs(input = []) { if (!Array.isArray(input) || input.length > 12)
    fail('Legfeljebb tizenkét kép kapcsolható egy eseményhez.'); const ids = new Set(); return input.map(m => { if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(m.id) || ids.has(m.id) || !['image/jpeg', 'image/png', 'image/webp'].includes(m.mime) || !Number.isSafeInteger(m.bytes) || m.bytes < 1 || m.bytes > 4 * 1024 * 1024 || !['team', 'client'].includes(m.visibility))
    fail('Érvénytelen helyi képhivatkozás.'); ids.add(m.id); return { id: m.id, name: text(m.name, 180), mime: m.mime, bytes: m.bytes, visibility: m.visibility }; }); }
export function transitionTask(original, command, ctx) {
    const task = structuredClone(original), rank = workRoleRank(ctx.role);
    if (!ctx.actor_id || !ctx.event_id || !Number.isFinite(Date.parse(ctx.at)))
        fail('Hiányzó eseményazonosító.');
    const before = { approvals: structuredClone(task.approvals), shares: structuredClone(task.shares), share_lock: task.share_lock, planned_minutes: task.planned_minutes };
    const reason = text(command.reason ?? '', 4000).trim(), media = mediaRefs(command.media);
    const visibility = ctx.role === 'client' ? 'client' : command.visibility ?? 'team';
    if (!['team', 'client'].includes(visibility) || visibility === 'team' && media.some(m => m.visibility === 'client'))
        fail('A megjegyzés és a képek láthatóságát egyeztesd.');
    if (ctx.role === 'client' && media.some(m => m.visibility !== 'client'))
        fail('Megrendelői kép csak az ügyfélnek is látható eseményhez kapcsolható.');
    const affected_actors = [], affected_subjects = [];
    let recipient = null;
    let level = null;
    if (command.type === 'accept') {
        level = command.level ?? (rank === 4 ? 3 : rank === 3 ? 2 : rank === 2 ? 1 : 0);
        if (![0, 1, 2, 3].includes(level) || ctx.role === 'client' && level !== 3 || ctx.role !== 'client' && (level === 3 || level >= rank))
            fail('Ezen az átvételi szinten nem hagyhatsz jóvá.');
        const subjects = unique(command.subjects ?? [ctx.actor_id]);
        if (!subjects.length || subjects.some(id => !ctx.allowed_subjects[level].includes(id)))
            fail('A kiválasztott személy nem jogosult ezen a szinten.');
        if ((rank === 1 || ctx.role === 'client') && (subjects.length !== 1 || subjects[0] !== ctx.actor_id))
            fail('Csak saját magad nevében jelölhetsz.');
        if (task.approvals.some(a => a.level === level && a.actor_id === ctx.actor_id && JSON.stringify(a.subjects) === JSON.stringify(subjects)))
            fail('Ezt az átvételt már rögzítettük. Frissítsd az adatokat.');
        task.approvals.push({ id: ctx.event_id, level, actor_id: ctx.actor_id, role: ctx.role, subjects, at: ctx.at, round: task.round });
        if (level === 0) {
            const contributors = unique(task.approvals.filter(a => a.level === 0).flatMap(a => a.subjects));
            if (command.shares) {
                if (rank < task.share_lock)
                    fail('A megosztást magasabb jogosultsági szint zárolta.');
                task.shares = validShares(command.shares, ctx.allowed_subjects[0]);
                task.share_lock = Math.max(rank, task.share_lock);
            }
            else if (task.share_lock <= 1) {
                task.shares = equalShares(contributors);
                task.share_lock = Math.max(rank, task.share_lock);
            }
        }
    }
    else if (command.type === 'reject') {
        level = ctx.role === 'client' ? 3 : ctx.role === 'office' ? 2 : rank === 2 ? 1 : fail('A munkavégző javításra visszaküldést nem rögzíthet.');
        if (!reason)
            fail('Írd le a javításra visszaküldés okát.');
        const lower = task.approvals.filter(a => a.level < level);
        affected_actors.push(...unique(lower.map(a => a.actor_id)));
        affected_subjects.push(...unique(lower.flatMap(a => a.subjects)));
        const last = lower.at(-1);
        recipient = command.recipient ?? last?.subjects[0] ?? ctx.repair_recipients[0] ?? null;
        if (!recipient || !ctx.repair_recipients.includes(recipient))
            fail('Válassz jogosult javítási címzettet.');
        task.round++;
        task.approvals = [];
    }
    else if (command.type === 'shares') {
        if (ctx.role === 'client' || rank < task.share_lock)
            fail('A megosztást csak a zárolási szintnek megfelelő vezető vagy iroda módosíthatja.');
        const allowed = rank === 1 ? unique(task.approvals.filter(a => a.level === 0).flatMap(a => a.subjects)) : ctx.allowed_subjects[0];
        if (rank === 1 && !allowed.includes(ctx.actor_id))
            fail('Csak olyan fázis megosztását szerkesztheted, amelyen részt vettél.');
        task.shares = validShares(command.shares ?? [], allowed);
        task.share_lock = Math.max(rank, task.share_lock);
    }
    else if (command.type === 'time') {
        if (ctx.role !== 'office')
            fail('A munkaidőtervet csak az iroda módosíthatja.');
        decimalUnits(command.minutes, 6);
        task.planned_minutes = command.minutes;
    }
    else
        fail('Ismeretlen munkafázis-művelet.');
    task.revision++;
    const event = { id: ctx.event_id, task_id: task.id, kind: command.type, round: task.round, level, actor_id: ctx.actor_id, role: ctx.role, at: ctx.at, reason, recipient, visibility, media, affected_actors, affected_subjects, before, after: { approvals: structuredClone(task.approvals), shares: structuredClone(task.shares), share_lock: task.share_lock, planned_minutes: task.planned_minutes } };
    return { task, event };
}
export function effectiveAcceptance(task, level) {
    const exact = task.approvals.filter(a => a.level === level);
    let source = exact;
    if (!source.length)
        for (let i = level + 1; i <= 3; i++) {
            source = task.approvals.filter(a => a.level === i);
            if (source.length)
                break;
        }
    if (!source.length)
        return { accepted: false, explicit: false, shares: [] };
    const shares = level === 0 && task.shares.length ? structuredClone(task.shares) : exact.length ? equalShares(exact.flatMap(a => a.subjects)) : equalShares(source.map(a => a.actor_id));
    return { accepted: true, explicit: exact.length > 0, shares };
}
export function progressSummary(tasks) {
    const total = tasks.reduce((sum, t) => sum + decimalUnits(t.labor), 0n), known = tasks.every(t => t.planned_minutes !== null), minutes = tasks.reduce((sum, t) => sum + (t.planned_minutes === null ? 0n : decimalUnits(t.planned_minutes, 6)), 0n);
    return [0, 1, 2, 3].map(level => {
        let complete = 0n, doneMinutes = 0n;
        let zeroDone = 0, zeroTotal = 0;
        const perPerson = new Map();
        for (const task of tasks) {
            const state = effectiveAcceptance(task, level), weight = decimalUnits(task.labor);
            if (weight === 0n) {
                zeroTotal++;
                if (state.accepted)
                    zeroDone++;
            }
            if (!state.accepted)
                continue;
            complete += weight;
            if (task.planned_minutes !== null)
                doneMinutes += decimalUnits(task.planned_minutes, 6);
            for (const share of state.shares)
                perPerson.set(share.person_id, (perPerson.get(share.person_id) ?? 0n) + weight * BigInt(share.basis_points));
        }
        const ratio = (weight) => total ? Number((weight * 10000n + total / 2n) / total) / 100 : null;
        return { level, percent: ratio(complete), completed_labor: amount(complete), total_labor: amount(total), completed_minutes: known ? amount(doneMinutes, 6) : null, remaining_minutes: known ? amount(minutes - doneMinutes, 6) : null, zero_done: zeroDone, zero_total: zeroTotal, people: [...perPerson].map(([person_id, numerator]) => ({ person_id, percent: total ? Number((numerator * 100n + total / 2n) / total) / 10000 : null })) };
    });
}
export function validateTaskGraph(tasks) {
    if (!Array.isArray(tasks) || tasks.length > 1000)
        fail('Egy terv legfeljebb ezer munkafázist tartalmazhat.');
    const map = new Map(tasks.map(t => [t.id, t]));
    if (map.size !== tasks.length)
        fail('Ismételt munkafázis-azonosító.');
    const incoming = new Map(), followers = new Map();
    for (const t of tasks) {
        if (!t.id || !text(t.title, 300).trim() || !text(t.section, 200).trim() || !Number.isSafeInteger(t.sort) || t.sort < 0)
            fail('Ellenőrizd a munkafázis nevét és sorrendjét.');
        decimalUnits(t.labor);
        decimalUnits(t.net);
        if (t.planned_minutes !== null)
            decimalUnits(t.planned_minutes, 6);
        for (const day of [t.start_date, t.end_date])
            if (day !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day + 'T12:00:00Z')) || new Date(day + 'T12:00:00Z').toISOString().slice(0, 10) !== day))
                fail('Érvénytelen ütemezési nap.');
        if (t.start_date && t.end_date && t.end_date < t.start_date)
            fail('A befejezés nem lehet a kezdés előtt.');
        if (!Array.isArray(t.dependencies) || new Set(t.dependencies).size !== t.dependencies.length || t.dependencies.some(d => d === t.id || !map.has(d)))
            fail('Érvénytelen előfeltétel.');
        incoming.set(t.id, t.dependencies.length);
        for (const d of t.dependencies) {
            const xs = followers.get(d) ?? [];
            xs.push(t.id);
            followers.set(d, xs);
        }
    }
    const queue = tasks.filter(t => !incoming.get(t.id)).sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id)), ordered = [], depth = new Map();
    while (queue.length) {
        const t = queue.shift();
        ordered.push(t);
        depth.set(t.id, t.dependencies.length ? Math.max(...t.dependencies.map(d => depth.get(d))) + 1 : 0);
        for (const id of followers.get(t.id) ?? []) {
            incoming.set(id, incoming.get(id) - 1);
            if (!incoming.get(id)) {
                queue.push(map.get(id));
                queue.sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));
            }
        }
    }
    if (ordered.length !== tasks.length)
        fail('A feladatok előfeltételei körbe mutatnak.');
    return ordered.map(t => ({ id: t.id, lane: depth.get(t.id) }));
}
