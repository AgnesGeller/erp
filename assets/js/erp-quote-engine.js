const SCALE = 1000000n;
export function decimal(value, label = 'Érték') {
    const text = String(value ?? '').trim().replace(',', '.');
    if (!/^\d{1,12}(?:\.\d{1,6})?$/.test(text))
        throw Error(label + ': nem negatív számot adj meg, legfeljebb 6 tizedessel.');
    const [a, b = ''] = text.split('.');
    return BigInt(a) * SCALE + BigInt(b.padEnd(6, '0'));
}
const mul = (a, b) => (a * b + SCALE / 2n) / SCALE;
const div = (a, b) => { if (b <= 0n)
    throw Error('A nevező legyen pozitív.'); return (a * SCALE + b / 2n) / b; };
export function formatted(value, digits = 6) { const rounded = digits === 2 ? (value + 5000n) / 10000n : value; const unit = 10n ** BigInt(digits); return (rounded / unit).toString() + (digits ? '.' + (rounded % unit).toString().padStart(digits, '0') : ''); }
const money = (a) => formatted(a, 2);
const max = (a, b) => a > b ? a : b;
const text = (value, maxLength, label) => { if (typeof value !== 'string' || value.length > maxLength)
    throw Error(label + ': túl hosszú vagy hiányzó szöveg.'); return value.trim(); };
export const cleanName = (value) => value.replace(/_/g, ' ').replace(/Füvesités/gi, 'Füvesítés').replace(/kompossztal/gi, 'komposzttal').replace(/\s+/g, ' ').trim();
// Korlátozott matematikai nyelv: nincs eval, függvényhívás, objektumelérés vagy kódvégrehajtás.
export function formula(source, variables) {
    if (typeof source !== 'string' || source.length > 300)
        throw Error('A képlet legfeljebb 300 karakter lehet.');
    const clean = source.replace(/\s/g, '').replace(/,/g, '.');
    const tokens = clean.match(/\d+(?:\.\d+)?|[a-z][a-z0-9_]*|[()+*\/-]/g) ?? [];
    if (tokens.join('') !== clean || tokens.length > 100 || !tokens.length)
        throw Error('A képletben csak mezőnév, szám, zárójel és + − × / használható.');
    let at = 0, depth = 0;
    const atom = () => { if (++depth > 16)
        throw Error('A képlet túl mély.'); let value; const token = tokens[at++]; if (token === '(') {
        value = expression();
        if (tokens[at++] !== ')')
            throw Error('Hiányzó zárójel.');
    }
    else if (/^\d/.test(token ?? ''))
        value = decimal(token);
    else if (Object.prototype.hasOwnProperty.call(variables, token))
        value = variables[token];
    else
        throw Error('Ismeretlen képletmező: ' + String(token)); depth--; return value; };
    const product = () => { let value = atom(); while (tokens[at] === '*' || tokens[at] === '/') {
        const operator = tokens[at++], right = atom();
        value = operator === '*' ? mul(value, right) : div(value, right);
        if (value > 10n ** 30n || value < -(10n ** 30n))
            throw Error('Irreális képleteredmény.');
    } return value; };
    const expression = () => { let value = product(); while (tokens[at] === '+' || tokens[at] === '-') {
        const op = tokens[at++], right = product();
        value = op === '+' ? value + right : value - right;
    } return value; };
    const result = expression();
    if (at !== tokens.length || result < 0n)
        throw Error('Érvénytelen vagy negatív képleteredmény.');
    return result;
}
export function validateType(raw) {
    const type = structuredClone(raw);
    type.name = text(type.name, 200, 'Típus');
    type.category = text(type.category, 150, 'Kategória');
    type.unit = text(type.unit, 30, 'Mértékegység');
    decimal(type.main, 'Anyag egységár');
    decimal(type.labor, 'Munka egységár');
    if (!type.name || !type.category || !type.unit)
        throw Error('A kategória, típus és mértékegység kötelező.');
    if (!['excel', 'area', 'volume', 'density', 'layered', 'custom'].includes(type.mode))
        throw Error('Ismeretlen számítási mód.');
    for (const key of ['main', 'auxiliary', 'transport', 'labor', 'material_cm', 'labor_cm', 'material_min', 'labor_min', 'total_min'])
        decimal(type[key] ?? '0', key);
    if (!Array.isArray(type.materials) || type.materials.length > 100)
        throw Error('Legfeljebb 100 anyag kapcsolható egy típushoz.');
    type.materials = type.materials.map((m) => { const row = { ...m, name: text(m.name, 200, 'Anyagnév'), unit: text(m.unit, 30, 'Anyag mértékegysége') }; decimal(m.factor, 'Anyagszorzó'); decimal(m.waste ?? '0', 'Ráhagyás'); decimal(m.pack ?? '0', 'Csomagméret'); decimal(m.capacity ?? '0', 'Fuvar kapacitása'); decimal(m.unit_price ?? '0', 'Beszerzési egységár'); if (!['quantity', 'area', 'volume', 'length', 'count'].includes(m.basis))
        throw Error('Érvénytelen anyagképlet.'); return row; });
    if (type.mode === 'custom') {
        if (!Array.isArray(type.fields) || !type.fields.length || type.fields.length > 16)
            throw Error('Az egyedi típushoz 1–16 paraméter szükséges.');
        const seen = new Set();
        for (const f of type.fields) {
            if (!/^[a-z][a-z0-9_]{0,30}$/.test(f.key) || ['main', 'auxiliary', 'transport', 'labor', 'quantity'].includes(f.key) || seen.has(f.key))
                throw Error('Érvénytelen vagy ismétlődő paraméternév.');
            seen.add(f.key);
            if (!text(f.label, 100, 'Paraméternév') || !text(f.unit, 30, 'Paraméter mértékegysége'))
                throw Error('Add meg a paraméter nevét és mértékegységét.');
        }
        text(type.quantity_formula, 300, 'Mennyiségképlet');
    }
    type.internal_info = text(type.internal_info ?? '', 12000, 'Hasznos információk');
    return type;
}
export function validateBook(raw) {
    if (!raw || !Array.isArray(raw.types) || raw.types.length > 1000 || !Array.isArray(raw.templates) || raw.templates.length > 200)
        throw Error('Érvénytelen árlista vagy sablonlista.');
    const book = structuredClone(raw);
    const seen = new Set();
    book.types = book.types.map((t) => { if (typeof t.id !== 'string' || seen.has(t.id))
        throw Error('Ismétlődő típusazonosító.'); seen.add(t.id); return validateType(t); });
    for (const template of book.templates) {
        text(template.name, 200, 'Sablon');
        if (!Array.isArray(template.lines) || template.lines.length > 200)
            throw Error('Érvénytelen sablonsorok.');
        for (const l of template.lines) {
            if (l.type_id && !seen.has(l.type_id))
                throw Error('A sablon típusa nem található.');
        }
    }
    if (!Array.isArray(book.info_templates) || book.info_templates.length > 100)
        throw Error('Érvénytelen információsablonok.');
    for (const info of book.info_templates) {
        text(info.name, 200, 'Sablonnév');
        text(info.body, 20000, 'Információsablon');
    }
    return book;
}
export function calculateQuote(input) {
    if (!input || !Array.isArray(input.sections) || input.sections.length > 100)
        throw Error('Legfeljebb 100 főtétel rögzíthető.');
    if (!['0', '27', 'aam'].includes(String(input.vat)))
        throw Error('Válassz 0%, 27% vagy alanyi adómentes adózást.');
    if (!text(input.title, 200, 'Ajánlat megnevezése'))
        throw Error('Add meg az ajánlat megnevezését.');
    text(input.information ?? '', 30000, 'Ajánlati információk');
    const issues = [];
    let totalMaterial = 0n, totalLabor = 0n;
    let count = 0;
    const sections = input.sections.map((section, si) => {
        const title = text(section.name, 200, 'Főtétel');
        if (!title)
            issues.push((si + 1) + '. főtétel: adj meg megnevezést.');
        if (!Array.isArray(section.lines) || section.lines.length > 200)
            throw Error('Legfeljebb 200 sor lehet egy főtételben.');
        let material = 0n, labor = 0n;
        const lines = section.lines.filter((line) => line.enabled !== false).map((line, li) => {
            if (++count > 1000)
                throw Error('Az ajánlat legfeljebb 1000 sort tartalmazhat.');
            try {
                if (line.unresolved)
                    throw Error('Válassz pontos típust ehhez a sablonsorhoz: ' + String(line.unresolved));
                const t = validateType(line.pricing);
                const p = { ...(line.params ?? {}) };
                if (line.inherit === true) {
                    if (t.mode === 'excel' && ['m²', 'm2'].includes(t.unit)) {
                        if (!section.area && (!section.length || !section.width))
                            throw Error('Add meg a főtétel területét, vagy hosszát és szélességét.');
                        p.q1 = section.area || formatted(mul(decimal(section.length, 'Főtétel hossza'), decimal(section.width, 'Főtétel szélessége')));
                    }
                    else if (t.mode !== 'excel' && t.mode !== 'custom') {
                        p.length = section.length;
                        p.width = section.width;
                    }
                }
                const required = (key, label) => { const value = decimal(p[key], label); if (value <= 0n)
                    throw Error(label + ': nullánál nagyobb érték szükséges.'); return value; };
                let displayQuantity, second = 0n;
                let customVars = {};
                let quantity = 0n, area = 0n, volume = 0n, length = 0n, countQty = 0n, thickness = 0n;
                if (t.mode === 'custom') {
                    for (const f of t.fields) {
                        let value = p[f.key] ?? t.defaults?.[f.key];
                        if (line.inherit && f.inherit && (['area', 'length', 'width'].includes(f.inherit)) && ((f.inherit === 'area' && ['m²', 'm2'].includes(f.unit)) || (f.inherit !== 'area' && f.unit === 'm')))
                            value = section[f.inherit];
                        customVars[f.key] = decimal(value === '' && f.required === false ? '0' : value, f.label);
                    }
                    length = customVars.length ?? 0n;
                    area = customVars.area ?? (length > 0n && customVars.width ? mul(length, customVars.width) : 0n);
                    volume = customVars.volume ?? (area > 0n && customVars.thickness ? div(mul(area, customVars.thickness), 100n * SCALE) : 0n);
                    quantity = formula(t.quantity_formula, customVars);
                    if (quantity <= 0n)
                        throw Error('A számított mennyiség legyen pozitív.');
                    if (t.round_quantity === 'ceil')
                        quantity = ((quantity + SCALE - 1n) / SCALE) * SCALE;
                    if (['m²', 'm2'].includes(t.unit))
                        area = quantity;
                    if (['m³', 'm3'].includes(t.unit))
                        volume = quantity;
                    if (['m', 'fm'].includes(t.unit))
                        length = quantity;
                    if (t.unit === 'db')
                        countQty = quantity;
                }
                else if (t.mode === 'excel') {
                    quantity = required('q1', 'Mennyiség');
                    if (t.unit2) {
                        displayQuantity = quantity;
                        second = required('q2', 'Második mennyiség');
                        quantity = mul(quantity, second);
                    }
                    if (t.unit === 'm²' || t.unit === 'm2')
                        area = required('q1', 'Mennyiség');
                    if (t.unit === 'fm' || t.unit === 'm')
                        length = required('q1', 'Mennyiség');
                    if (t.unit === 'db')
                        countQty = required('q1', 'Mennyiség');
                }
                else {
                    length = required('length', 'Hossz');
                    area = mul(length, required('width', 'Szélesség'));
                    if (t.mode === 'volume' || t.mode === 'layered') {
                        thickness = required('thickness', 'Vastagság');
                        volume = div(mul(area, thickness), 100n * SCALE);
                    }
                    if (t.mode === 'density') {
                        quantity = mul(area, required('density', 'Növénysűrűség'));
                        quantity = ((quantity + SCALE - 1n) / SCALE) * SCALE;
                        countQty = quantity;
                    }
                    else
                        quantity = t.mode === 'volume' ? volume : area;
                }
                let materialUnit = decimal(t.main ?? '0') + decimal(t.auxiliary ?? '0') + decimal(t.transport ?? '0'), laborUnit = decimal(t.labor ?? '0');
                if (t.mode === 'layered') {
                    materialUnit += mul(decimal(t.material_cm ?? '0'), thickness);
                    laborUnit += mul(decimal(t.labor_cm ?? '0'), thickness);
                }
                const vars = { quantity, area, volume, length, count: countQty, ...customVars, main: decimal(t.main), auxiliary: decimal(t.auxiliary ?? '0'), transport: decimal(t.transport ?? '0'), labor: decimal(t.labor) };
                const rawMaterial = t.material_formula ? formula(t.material_formula, vars) : mul(quantity, materialUnit), rawLabor = t.labor_formula ? formula(t.labor_formula, vars) : mul(quantity, laborUnit);
                if (t.material_formula)
                    materialUnit = div(rawMaterial, quantity);
                if (t.labor_formula)
                    laborUnit = div(rawLabor, quantity);
                let mat = max(rawMaterial, decimal(t.material_min ?? '0')), lab = max(rawLabor, decimal(t.labor_min ?? '0'));
                const uplift = max(0n, decimal(t.total_min ?? '0') - mat - lab);
                if (uplift > 0n) {
                    if (t.total_min_target === 'material')
                        mat += uplift;
                    else if (t.total_min_target === 'labor')
                        lab += uplift;
                    else
                        throw Error('Állítsd be, hogy a teljes minimum kiegészítése anyagköltség vagy munkadíj legyen.');
                }
                const materials = t.materials.map((m) => { const basis = { quantity, area, volume, length, count: countQty }[m.basis]; if ((basis === undefined || basis <= 0n) && !m.quantity_formula)
                    throw Error('Az anyagképlethez hiányzik a(z) ' + m.basis + ' mennyiség: ' + m.name); const installed = m.quantity_formula ? formula(m.quantity_formula, vars) : mul(basis, decimal(m.factor)); let purchase = mul(installed, SCALE + div(decimal(m.waste ?? '0'), 100n * SCALE)); const pack = decimal(m.pack ?? '0'); if (pack > 0n)
                    purchase = ((purchase + pack - 1n) / pack) * pack; const capacity = decimal(m.capacity ?? '0'); return { ...m, installed: formatted(installed), purchase: formatted(purchase), purchase_cost: money(mul(purchase, decimal(m.unit_price ?? '0'))), trips: capacity > 0n ? ((purchase + capacity - 1n) / capacity).toString() : null }; });
                // Minden sor két tizedesre kerekedik; az ÁFA a teljes vetítési alapból számolódik.
                const minimumApplied = mat + lab - rawMaterial - rawLabor;
                mat = decimal(money(mat));
                lab = decimal(money(lab));
                material += mat;
                labor += lab;
                const rate = input.hourly_rate ? decimal(input.hourly_rate, 'Ügyfélnek számlázott óradíj') : 0n;
                const minutes = rate > 0n ? formatted(div(mul(lab, 60n * SCALE), rate)) : null;
                return { id: line.id, label: cleanName(t.category) + ' – ' + cleanName(t.name), quantity: formatted(displayQuantity ?? quantity), unit: t.unit, parameter_note: second > 0n ? 'Második mennyiség: ' + formatted(second) + ' ' + t.unit2 : '', material_unit: money(second > 0n ? mul(materialUnit, second) : materialUnit), labor_unit: money(second > 0n ? mul(laborUnit, second) : laborUnit), material: money(mat), labor: money(lab), net: money(mat + lab), minimum_adjustment: money(minimumApplied), public_note: text(line.public_note ?? '', 4000, 'Egyéb megjegyzés'), materials, planned_minutes: minutes, internal_info: t.internal_info, trace: { raw_material: money(rawMaterial), raw_labor: money(rawLabor), area: formatted(area), volume: formatted(volume), thickness_cm: formatted(thickness) } };
            }
            catch (error) {
                issues.push((si + 1) + '. főtétel, ' + (li + 1) + '. sor: ' + (error instanceof Error ? error.message : 'Hibás tétel.'));
                return { id: line.id, label: String(line.unresolved ?? line.pricing?.name ?? 'Hiányos tétel'), incomplete: true };
            }
        });
        if (!lines.length)
            issues.push((si + 1) + '. főtétel: adj hozzá legalább egy sort.');
        totalMaterial += material;
        totalLabor += labor;
        return { id: section.id, name: title, material: money(material), labor: money(labor), net: money(material + labor), lines };
    });
    if (!sections.length)
        issues.push('Adj hozzá legalább egy főtételt.');
    const base = totalMaterial + totalLabor;
    const vat = input.vat === '27' ? decimal(money(mul(base, 270000n))) : 0n;
    return { engine_version: '1', rounding: 'line-2-vat-total-2', sections, issues, material: issues.length ? null : money(totalMaterial), labor: issues.length ? null : money(totalLabor), tax_base: issues.length ? null : money(base), vat: issues.length ? null : money(vat), gross: issues.length ? null : money(base + vat), vat_mode: String(input.vat), information: input.information ?? '' };
}
// Kizárólag ez a kifejezett engedélylista kerülhet ügyfél-PDF-be vagy ügyfélexportba.
export function customerQuote(output) {
    if (output.issues?.length)
        throw Error('A PDF-hez előbb javítsd az összes hiányzó vagy hibás tételt.');
    return { engine_version: output.engine_version, material: output.material, labor: output.labor, tax_base: output.tax_base, vat: output.vat, gross: output.gross, vat_mode: output.vat_mode, information: output.information, sections: output.sections.map((s) => ({ name: s.name, material: s.material, labor: s.labor, net: s.net, lines: s.lines.map((l) => ({ label: l.label, quantity: l.quantity, unit: l.unit, parameter_note: l.parameter_note, material_unit: l.material_unit, labor_unit: l.labor_unit, material: l.material, labor: l.labor, net: l.net, minimum_adjustment: l.minimum_adjustment, public_note: l.public_note, materials: l.materials.map((m) => ({ name: m.name, unit: m.unit, installed: m.installed })) })) })) };
}
export function quoteChanges(before, after) { const old = new Map(); for (const section of before.sections ?? [])
    for (const l of section.lines ?? [])
        old.set(l.id, l); const changes = []; for (const [key, label] of Object.entries({ title: 'Ajánlat megnevezése', vat: 'ÁFA-beállítás', hourly_rate: 'Belső tervezési óradíj', information: 'Ajánlati információk' })) {
    if (before[key] !== after[key])
        changes.push({ kind: 'metadata', line: label, before: String(before[key] ?? ''), after: String(after[key] ?? '') });
} for (const section of after.sections ?? [])
    for (const l of section.lines ?? []) {
        const prior = old.get(l.id);
        if (JSON.stringify(prior) !== JSON.stringify(l))
            changes.push({ line: section.name + ' / ' + String(l.pricing?.name ?? l.unresolved ?? ''), before: prior ?? null, after: l });
        old.delete(l.id);
    } for (const l of old.values())
    changes.push({ line: String(l.pricing?.name ?? l.unresolved ?? ''), before: l, after: null }); return changes; }
