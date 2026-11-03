const el = (id) => document.getElementById(id);
export class StaffAdmin {
    api;
    org;
    epoch = 0;
    accounts = [];
    requestId = '';
    dirty = false;
    personChoice = '';
    busy = false;
    constructor(api) {
        this.api = api;
        el('staff-admin-open').addEventListener('click', () => { void this.open(); });
        el('staff-admin-close').addEventListener('click', () => { if (this.leave()) {
            this.dirty = false;
            this.clearLink();
            el('staff-admin-dialog').close();
        } });
        el('staff-admin-dialog').addEventListener('cancel', e => { if (!this.leave())
            e.preventDefault();
        else {
            this.dirty = false;
            this.clearLink();
        } });
        el('staff-account-person').addEventListener('change', () => { if (this.leave())
            this.select();
        else
            el('staff-account-person').value = this.personChoice; });
        el('staff-admin-form').addEventListener('input', e => { if (e.target.id === 'staff-account-person')
            return; this.dirty = true; this.clearLink(); });
        el('staff-admin-form').addEventListener('submit', e => { e.preventDefault(); void this.save(); });
        el('staff-issue').addEventListener('click', () => { void this.issue(); });
        el('staff-link-copy').addEventListener('click', () => { void this.copy(); });
        window.addEventListener('beforeunload', e => { if (this.busy || this.dirty) {
            e.preventDefault();
            e.returnValue = '';
        } });
        window.addEventListener('erp:before-update', e => { if (!this.leave())
            e.preventDefault();
        else {
            this.dirty = false;
            this.clearLink();
        } });
    }
    setOrganization(org) { if (this.org !== org) {
        this.reset();
        this.org = org;
    } el('staff-admin-open').hidden = !org; }
    reset() { this.epoch++; this.org = undefined; this.accounts = []; this.dirty = false; this.busy = false; this.clearLink(); el('staff-admin-dialog').close(); }
    leave() { return !this.busy && (!this.dirty || confirm('Bezárod a dolgozói hozzáférést a még nem mentett változtatások nélkül?')); }
    message(text, ok = false) { el('staff-admin-status').textContent = (ok ? '✓ ' : '') + text; }
    clearLink() { el('staff-link-panel').hidden = true; el('staff-link').value = ''; el('staff-link-mail').removeAttribute('href'); }
    lock(value) { el('staff-admin-fields').disabled = value; el('staff-issue').disabled = value || this.dirty || !this.selected; }
    get selected() { return this.accounts.find(a => a.person_id === el('staff-account-person').value); }
    select() { this.personChoice = el('staff-account-person').value; const a = this.selected; this.requestId = crypto.randomUUID(); this.dirty = false; el('staff-account-email').value = a?.email ?? ''; el('staff-account-email').disabled = !!a; el('staff-account-active').checked = a?.active ?? true; this.clearLink(); this.lock(this.busy); this.message(a?.recovery_requested ? 'Ez a munkatárs új jelszóbeállító hivatkozást kért.' : 'A meghívót az iroda kézzel küldi el.'); }
    async open() { if (!this.org || this.busy)
        return; const epoch = this.epoch; this.busy = true; el('staff-admin-dialog').showModal(); this.lock(true); try {
        const r = await this.api.staff('staff_admin_list', { organization_id: this.org });
        if (epoch !== this.epoch)
            return;
        this.accounts = r.accounts;
        const s = el('staff-account-person');
        s.replaceChildren(new Option('Válassz munkatársat', ''), ...r.people.sort((a, b) => a.name.localeCompare(b.name, 'hu')).map((p) => new Option(p.name + (r.accounts.some((a) => a.person_id === p.id && a.recovery_requested) ? ' · Jelszót kér' : ''), p.id)));
        this.select();
    }
    catch (e) {
        if (epoch === this.epoch)
            this.message(e instanceof Error ? e.message : 'A hozzáférések nem tölthetők be.');
    }
    finally {
        if (epoch === this.epoch) {
            this.busy = false;
            this.lock(false);
        }
    } }
    async save() { if (!this.org || this.busy)
        return; const selected = this.selected; if (selected?.active && !el('staff-account-active').checked && !confirm('Inaktiválod ezt az ERP-dolgozói hozzáférést minden eszközön?'))
        return; const epoch = this.epoch; this.busy = true; this.lock(true); try {
        await this.api.staff('staff_manage', { organization_id: this.org, account_id: selected?.id ?? this.requestId, person_id: el('staff-account-person').value, revision: selected?.revision ?? 0, email: el('staff-account-email').value.trim(), active: el('staff-account-active').checked });
        if (epoch !== this.epoch)
            return;
        const r = await this.api.staff('staff_admin_list', { organization_id: this.org });
        if (epoch !== this.epoch)
            return;
        this.accounts = r.accounts;
        this.dirty = false;
        this.select();
        this.message('A saját ERP-hozzáférést mentettük. A meghívót külön készítheted el.', true);
    }
    catch (e) {
        if (epoch === this.epoch)
            this.message(e instanceof Error ? e.message : 'A mentés nem sikerült.');
    }
    finally {
        if (epoch === this.epoch) {
            this.busy = false;
            this.lock(false);
        }
    } }
    async issue() { if (!this.org || this.busy || this.dirty || !this.selected || !confirm('Új, egyszer használható beállító hivatkozást készítesz ' + this.selected.email + ' részére? A korábbi, fel nem használt hivatkozás érvénytelen lesz.'))
        return; const epoch = this.epoch; this.busy = true; this.lock(true); try {
        const r = await this.api.staff('staff_issue', { organization_id: this.org, account_id: this.selected.id, revision: this.selected.revision, confirmed: true });
        if (epoch !== this.epoch)
            return;
        el('staff-link').value = r.url;
        el('staff-link-panel').hidden = false;
        el('staff-link-mail').href = 'mailto:' + encodeURIComponent(r.email) + '?subject=' + encodeURIComponent('Díszkertek – saját dolgozói ERP-belépés') + '&body=' + encodeURIComponent('Szia ' + this.selected.name + '!\n\nSaját ERP-jelszavadat ezzel a 24 óráig, egyszer használható hivatkozással állíthatod be:\n' + r.url + '\n\nDíszkertek');
        this.message('A hivatkozás elkészült. Kézzel küldd el a megadott munkatársnak.', true);
    }
    catch (e) {
        if (epoch === this.epoch)
            this.message(e instanceof Error ? e.message : 'A hivatkozás nem készült el.');
    }
    finally {
        if (epoch === this.epoch) {
            this.busy = false;
            this.lock(false);
        }
    } }
    async copy() { try {
        await navigator.clipboard.writeText(el('staff-link').value);
        this.message('A hivatkozást másoltuk.', true);
    }
    catch {
        this.message('Jelöld ki és másold ki a hivatkozást a mezőből.');
    } }
}
