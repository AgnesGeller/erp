const { cleanName, validateBook } = await import(new URL('./erp-quote-engine.js?v=0.3.0', import.meta.url).href);
export async function readCalculator(file) {
    if (!/\.xlsx$/i.test(file.name) || file.size > 25000000)
        throw Error('Legfeljebb 25 MB méretű XLSX-kalkulátort válassz.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { unzipSync } = await import(new URL('../vendor/fflate-0.8.2.js', import.meta.url).href);
    let total = 0;
    const files = unzipSync(bytes, { filter: f => { const wanted = /^xl\/(?:sharedStrings\.xml|workbook\.xml|_rels\/workbook\.xml\.rels|worksheets\/sheet\d+\.xml)$/.test(f.name); if (wanted) {
            total += f.originalSize;
            if (f.originalSize > 5000000 || total > 12000000)
                throw Error('Az Excel kicsomagolt cellaadata túl nagy.');
        } return wanted; } });
    const xml = (name) => { const data = files[name]; if (!data)
        throw Error('Hiányzó Excel-munkalap: ' + name); const source = new TextDecoder().decode(data); if (/<!DOCTYPE|<!ENTITY/i.test(source))
        throw Error('Nem támogatott Excel XML.'); const doc = new DOMParser().parseFromString(source, 'application/xml'); if (doc.getElementsByTagName('parsererror').length)
        throw Error('Sérült Excel XML.'); return doc; };
    const elements = (doc, name) => Array.from(doc.getElementsByTagNameNS('*', name));
    const strings = files['xl/sharedStrings.xml'] ? elements(xml('xl/sharedStrings.xml'), 'si').map(si => elements(si, 't').map(t => t.textContent ?? '').join('')) : [];
    const relationships = new Map(elements(xml('xl/_rels/workbook.xml.rels'), 'Relationship').map(r => [r.getAttribute('Id'), r.getAttribute('Target')]));
    const paths = new Map();
    for (const sheet of elements(xml('xl/workbook.xml'), 'sheet')) {
        const target = relationships.get(sheet.getAttribute('r:id'));
        if (target)
            paths.set(sheet.getAttribute('name') ?? '', new URL(target, 'https://xlsx.invalid/xl/workbook.xml').pathname.slice(1));
    }
    const cells = (name) => { const path = paths.get(name); if (!path)
        throw Error('A feltöltéshez az eredeti kalkulátor Adatbázis és Minták lapja szükséges.'); const rows = new Map(); for (const cell of elements(xml(path), 'c')) {
        const address = cell.getAttribute('r') ?? '', row = Number(address.replace(/\D/g, '')), col = address.replace(/\d/g, '');
        const value = elements(cell, 'v')[0]?.textContent ?? '';
        const text = cell.getAttribute('t') === 's' ? strings[Number(value)] ?? '' : cell.getAttribute('t') === 'inlineStr' ? elements(cell, 't').map(t => t.textContent ?? '').join('') : value;
        if (!rows.has(row))
            rows.set(row, {});
        rows.get(row)[col] = text;
    } return rows; };
    const numeric = (v) => { const value = Number(v); if (!v || !Number.isFinite(value) || value < 0)
        throw Error('Hiányzó vagy hibás numerikus érték az Excelben.'); const fixed = value.toFixed(6); if (Math.abs(Number(fixed) - value) > 1e-9)
        throw Error('Az Excel egyik értéke hat tizedesnél finomabb pontosságot igényel.'); return fixed.replace(/\.?0+$/, '') || '0'; };
    const data = cells('Adatbázis'), types = [], lookup = new Map();
    const unit = (value) => cleanName(value ?? '').replace(/m2/g, 'm²').replace(/m3/g, 'm³');
    for (const [row, c] of data) {
        if (row < 3 || !c.B || !c.C)
            continue;
        if (!c.H || !c.I || !Number.isFinite(Number(c.H)) || !Number.isFinite(Number(c.I)))
            throw Error(row + '. sor: hiányzó vagy nem kiszámolt ár. Nyisd meg, számold újra és mentsd az Excelt.');
        const materials = [];
        for (const [a, b, u] of [['J', 'K', 'L'], ['M', 'N', 'O'], ['P', 'Q', 'R'], ['S', 'T', 'U']])
            if (c[a])
                materials.push({ name: cleanName(c[a]), factor: numeric(c[b]), unit: unit(c[u]), basis: 'quantity', waste: '0', pack: '0', capacity: '0', unit_price: '0', supplier: '' });
        const t = { id: 'xlsx:' + row, name: cleanName(c.C), category: cleanName(c.B), unit: unit(c.F), unit2: unit(c.G), mode: 'excel', main: numeric(c.H), labor: numeric(c.I), auxiliary: '0', transport: '0', material_cm: '0', labor_cm: '0', material_min: '0', labor_min: '0', total_min: '0', internal_info: [c.D, c.E].filter(Boolean).join('\n'), materials, defaults: {}, source: { sheet: 'Adatbázis', row, category: c.B, name: c.C } };
        types.push(t);
        lookup.set(c.B + '\0' + c.C, t.id);
    }
    if (!types.length || types.length > 1000)
        throw Error('Nem található feldolgozható árlista.');
    const examples = cells('Minták'), templates = [];
    for (const [i, a, b, title] of [[1, 'A', 'B', 'A'], [2, 'C', 'D', 'C'], [3, 'E', 'F', 'F']]) {
        const name = examples.get(1)?.[title];
        if (!name)
            continue;
        const lines = [];
        for (const [row, c] of examples) {
            if (row < 2 || !c[b])
                continue;
            const type = lookup.get(c[a] + '\0' + c[b]);
            lines.push({ type_id: type ?? null, unresolved: type ? '' : cleanName(c[b]), params: {}, optional: false });
        }
        templates.push({ id: 'xlsx-template:' + i, name: cleanName(name), lines });
    }
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.buffer))).map(v => v.toString(16).padStart(2, '0')).join('');
    return validateBook({ source_sha256: digest, source_name: file.name, types, templates, info_templates: [] });
}
