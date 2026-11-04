export class WorkpackDesk {
    api;
    onError;
    owner;
    org;
    scope;
    epoch = 0;
    busy = false;
    url;
    dialog = document.createElement('dialog');
    status = document.createElement('p');
    mode = document.createElement('select');
    days = document.createElement('input');
    preview = document.createElement('div');
    controls = document.createElement('div');
    make = document.createElement('button');
    constructor(api, onError) {
        this.api = api;
        this.onError = onError;
        this.dialog.className = 'workspace workpack-dialog';
        this.dialog.id = 'workpack-dialog';
        this.dialog.setAttribute('aria-label', 'Munkacsomag és PDF');
        const head = document.createElement('div');
        head.className = 'workpack-heading';
        const h = document.createElement('h1');
        h.textContent = 'Munkacsomag és PDF';
        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = '×';
        close.setAttribute('aria-label', 'Munkacsomag bezárása');
        close.title = 'Bezárás';
        close.onclick = () => this.close();
        head.append(h, close);
        this.status.setAttribute('role', 'status');
        const label = document.createElement('label');
        label.textContent = 'Kinek készül?';
        label.append(this.mode);
        const days = document.createElement('label');
        days.textContent = 'Kitöltendő napi lapok száma';
        this.days.type = 'number';
        this.days.min = '0';
        this.days.max = '100';
        this.days.step = '1';
        this.days.value = '20';
        days.append(this.days);
        this.controls.append(label, days);
        this.make.type = 'button';
        this.make.textContent = 'Munkacsomag elkészítése';
        this.make.onclick = () => { void this.generate(); };
        this.controls.append(this.make);
        this.mode.onchange = () => { days.hidden = this.mode.value !== 'team'; this.clearPreview(); };
        this.days.oninput = () => this.clearPreview();
        const help = document.createElement('p');
        help.textContent = 'A csapatcsomag árak nélkül készül. A megrendelő saját ügyfélárai külön csomagban szerepelnek; a belső eredménylap kizárólag irodai.';
        this.dialog.append(head, help, this.controls, this.status, this.preview);
        this.dialog.addEventListener('cancel', e => { e.preventDefault(); this.close(); });
        document.body.append(this.dialog);
    }
    setOwner(owner, org) { if (this.owner !== owner || this.org !== org) {
        this.reset();
        this.owner = owner;
        this.org = org;
    } }
    reset() { this.epoch++; this.owner = undefined; this.org = undefined; this.scope = undefined; this.busy = false; this.make.disabled = false; this.mode.disabled = false; this.days.disabled = false; this.dialog.close(); this.clearPreview(); }
    clearPreview() { if (this.url)
        URL.revokeObjectURL(this.url); this.url = undefined; this.preview.replaceChildren(); }
    close() { this.epoch++; this.busy = false; this.make.disabled = false; this.mode.disabled = false; this.days.disabled = false; this.dialog.close(); this.clearPreview(); }
    show(owner, org, scope) { this.setOwner(owner, org); this.epoch++; this.busy = false; this.make.disabled = false; this.mode.disabled = false; this.days.disabled = false; this.scope = { project_id: scope.project_id, role: scope.role }; this.clearPreview(); const role = scope.role; this.mode.replaceChildren(...(role === 'office' ? [['team', 'Munkatársaknak – árak nélkül'], ['client', 'Megrendelőnek – ügyfélárakkal'], ['office', 'Belső irodai eredménylap']] : role === 'client' ? [['client', 'Saját megrendelői munkacsomag']] : [['team', 'Munkatársi munkacsomag – árak nélkül']]).map(([v, t]) => new Option(t, v))); this.days.parentElement.hidden = this.mode.value !== 'team'; this.days.value = '20'; this.status.textContent = 'Válaszd ki a csomagot, majd készítsd el a friss PDF-et.'; if (!this.dialog.open)
        this.dialog.showModal(); }
    async generate() { if (this.busy || !this.owner || !this.org || !this.scope)
        return; if (!navigator.onLine) {
        this.status.textContent = 'A munkacsomag elkészítéséhez internetkapcsolat és friss jogosultság-ellenőrzés szükséges.';
        return;
    } const days = this.mode.value === 'team' ? Number(this.days.value) : 0; if (!Number.isSafeInteger(days) || days < 0 || days > 100) {
        this.status.textContent = '0 és 100 közötti egész napszámot adj meg.';
        return;
    } const epoch = this.epoch; this.busy = true; this.make.disabled = true; this.mode.disabled = true; this.days.disabled = true; this.clearPreview(); this.status.textContent = 'A friss munkaadatok és a PDF összeállítása…'; try {
        const result = await this.api.workpack('workpack_pdf', { organization_id: this.org, ...this.scope, mode: this.mode.value, blank_days: days });
        if (epoch !== this.epoch)
            return;
        const bytes = Uint8Array.from(atob(result.pdf), (c) => c.charCodeAt(0));
        this.url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        const links = document.createElement('div');
        links.className = 'workpack-links';
        const open = document.createElement('a');
        open.href = this.url;
        open.target = '_blank';
        open.rel = 'noopener';
        open.textContent = 'PDF megnyitása';
        const save = document.createElement('a');
        save.href = this.url;
        save.download = result.filename;
        save.textContent = 'PDF letöltése';
        links.append(open, save);
        const iframe = document.createElement('iframe');
        iframe.title = 'Munkacsomag PDF-előnézet';
        iframe.src = this.url;
        this.preview.append(links, iframe);
        this.status.textContent = '✓ A munkacsomag elkészült. Megnyithatod vagy letöltheted.';
    }
    catch (e) {
        if (epoch === this.epoch) {
            this.status.textContent = e instanceof Error ? e.message : 'A PDF nem készíthető el.';
            if (e?.status === 401 || !this.api.signedIn)
                this.onError(e);
        }
    }
    finally {
        if (epoch === this.epoch) {
            this.busy = false;
            this.make.disabled = false;
            this.mode.disabled = false;
            this.days.disabled = false;
        }
    } }
}
