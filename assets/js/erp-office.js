const setupOpening = new URLSearchParams(location.hash.slice(1)).has('office_setup') || document.documentElement.dataset.erpSetup === 'true';
const apiUrl = new URL('./erp-api.js?v=0.1.7', import.meta.url);
const datesUrl = new URL('./erp-dates.js?v=0.1.7', import.meta.url);
const { ErpApi, ApiError } = await import(apiUrl.href);
const { projectPeriod, todayBudapest, periodLabel } = await import(datesUrl.href);
const api = new ErpApi();
const get = (id) => document.getElementById(id);
const loginForm = get('login-form');
const workerForm = get('worker-form');
const roleForm = get('role-form');
const projectSelect = get('project-select');
const personSelect = get('assignment-person');
let current;
let people = [];
let projects = [];
let generation = 0;
let mutations = 0;
let dirty = false;
let loading = false;
let restoring = false;
let assignmentRequest = 0;
let workerRequest;
const roleNames = { crew_lead: 'Csoportvezető', construction_lead: 'Kertépítési vezető', worker: 'Résztvevő' };
function message(text, ok = null) {
    const target = get(get('login-area').hidden ? 'office-status' : 'login-feedback');
    target.textContent = (ok ? '✓ ' : '') + text;
    target.className = 'office-status ' + (ok === true ? 'success' : ok === false ? 'error' : '');
}
function formBusy(form, busy) {
    const fieldset = form.querySelector('fieldset');
    if (fieldset)
        fieldset.disabled = busy;
}
function resetView() {
    get('office-status').textContent = '';
    get('login-feedback').textContent = '';
    generation++;
    current = undefined;
    people = [];
    projects = [];
    dirty = false;
    workerRequest = undefined;
    get('office-app').hidden = true;
    get('login-area').hidden = false;
    get('public-identity').hidden = false;
    get('logout').hidden = true;
    for (const id of ['people-list', 'assignment-list', 'project-select', 'assignment-person', 'organization-select'])
        get(id).replaceChildren();
    workerForm.reset();
    roleForm.reset();
    get('login-password').value = '';
}
function showError(error) {
    if (!api.signedIn) {
        resetView();
    }
    message(error instanceof Error ? error.message : 'A művelet nem sikerült. Próbáld újra.', false);
}
function selectedOrganization() {
    return get('organization-select').value;
}
function renderPeople() {
    const previousPerson = personSelect.value;
    const list = get('people-list');
    list.replaceChildren();
    for (const person of people) {
        const row = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = person.display_name;
        row.append(name);
        if (!person.active) {
            const state = document.createElement('small');
            state.textContent = 'Inaktív';
            row.append(state);
        }
        list.append(row);
    }
    if (!people.length) {
        const row = document.createElement('li');
        row.textContent = 'Nincs megjeleníthető munkatárs.';
        list.append(row);
    }
    personSelect.replaceChildren(new Option('Válassz munkatársat', ''));
    for (const p of people.filter(p => p.active))
        personSelect.add(new Option(p.display_name, p.id));
    if (people.some(p => p.id === previousPerson && p.active))
        personSelect.value = previousPerson;
}
async function loadAssignments() {
    const list = get('assignment-list');
    list.replaceChildren();
    get('role-form').hidden = !current?.is_office || !projectSelect.value;
    if (!current || !projectSelect.value) {
        get('assignment-empty').textContent = 'Még nincs megjeleníthető munka.';
        return;
    }
    get('assignment-empty').textContent = 'Betöltés…';
    const epoch = generation;
    const request = ++assignmentRequest;
    const selectedProject = projectSelect.value;
    const rows = await api.rpc('erp_list_assignments', { p_org: current.organization_id, p_project: selectedProject });
    if (epoch !== generation || request !== assignmentRequest || projectSelect.value !== selectedProject)
        return;
    get('assignment-empty').textContent = rows.length ? '' : 'Ehhez a munkához még nincs megbízás.';
    for (const assignment of rows) {
        const row = document.createElement('li');
        const text = document.createElement('div');
        const who = people.find(p => p.id === assignment.person_id)?.display_name ?? 'Saját megbízás';
        const title = document.createElement('strong');
        title.textContent = who + ' · ' + (roleNames[assignment.role] ?? 'Megbízás');
        const detail = document.createElement('small');
        detail.textContent = periodLabel(assignment.valid_from, assignment.valid_until) + (assignment.revoked_at ? ' · Visszavonva' : '');
        text.append(title, detail);
        row.append(text);
        if (current.is_office && !assignment.revoked_at) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'quiet';
            button.textContent = 'Visszavonás';
            button.addEventListener('click', async () => {
                if (!current || mutations || loading)
                    return;
                if (!confirm('Visszavonod ezt a megbízást? Az előzménye megmarad.'))
                    return;
                mutations++;
                button.disabled = true;
                try {
                    await api.rpc('erp_revoke_assignment', { p_org: current.organization_id, p_assignment: assignment.id, p_revision: assignment.revision });
                    if (epoch === generation) {
                        await loadAssignments();
                        message('A megbízást visszavontuk.', true);
                    }
                }
                catch (error) {
                    if (epoch === generation)
                        showError(error);
                }
                finally {
                    mutations--;
                    button.disabled = false;
                }
            });
            row.append(button);
        }
        list.append(row);
    }
}
async function loadWorkspace() {
    if (loading || !api.signedIn)
        return;
    loading = true;
    const epoch = generation;
    get('organization-select').disabled = true;
    projectSelect.disabled = true;
    try {
        const memberships = await api.rpc('erp_session');
        if (epoch !== generation)
            return;
        const wanted = selectedOrganization() || current?.organization_id;
        current = memberships.find(m => m.organization_id === wanted) ?? memberships[0];
        if (!current)
            throw new ApiError('Nincs aktív ERP-hozzáférésed.', 403);
        const select = get('organization-select');
        select.replaceChildren(...memberships.map(m => new Option(m.organization_name, m.organization_id, false, m.organization_id === current.organization_id)));
        get('organization-label').hidden = memberships.length === 1;
        get('workspace-title').textContent = current.organization_name;
        get('workspace-role').textContent = current.is_office ? 'Irodai munkatér' : 'Saját munkák';
        get('people-section').hidden = !current.is_office;
        if (!current.is_office) {
            people = [];
            get('people-list').replaceChildren();
            workerForm.reset();
            dirty = false;
        }
        const result = await Promise.all([
            api.rpc('erp_list_projects', { p_org: current.organization_id }),
            current.is_office ? api.rpc('erp_list_people', { p_org: current.organization_id }) : Promise.resolve([])
        ]);
        if (epoch !== generation)
            return;
        projects = result[0];
        people = result[1];
        renderPeople();
        const previous = projectSelect.value;
        projectSelect.replaceChildren(new Option('Válassz munkát', ''));
        for (const p of projects.filter(p => p.active))
            projectSelect.add(new Option(p.name, p.id));
        if (projects.some(p => p.id === previous && p.active))
            projectSelect.value = previous;
        else if (projects.some(p => p.active))
            projectSelect.value = projects.find(p => p.active).id;
        projectSelect.disabled = !projects.some(p => p.active);
        get('office-app').hidden = false;
        get('login-area').hidden = true;
        get('public-identity').hidden = true;
        get('logout').hidden = false;
        await loadAssignments();
    }
    finally {
        loading = false;
        get('organization-select').disabled = false;
        projectSelect.disabled = !projects.some(p => p.active);
    }
}
loginForm.addEventListener('invalid', () => {
    message(!get('login-name').value ? 'Válaszd ki a nevedet.' : 'A saját ERP PIN-kódod 6–12 számjegy legyen.', false);
}, true);
get('login-name').addEventListener('change', () => {
    get('login-username').value = get('login-name').value;
    get('login-password').value = '';
    get('login-feedback').textContent = '';
});
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (mutations || loading || restoring)
        return;
    const name = get('login-name').value;
    if (name !== 'agi' && name !== 'tamas') {
        message('Válaszd ki a nevedet.', false);
        return;
    }
    const password = get('login-password').value;
    get('login-password').value = '';
    generation++;
    const epoch = generation;
    formBusy(loginForm, true);
    message('Belépés…');
    try {
        await api.login(name, password);
        if (epoch !== generation)
            return;
        await loadWorkspace();
        message(api.remembered ? 'Sikeres belépés. Az eszköz megjegyezte a belépésedet.' : 'Sikeres belépés. Az eszköz nem engedte megjegyezni a belépést; újranyitáskor ismét add meg a PIN-kódot.', true);
    }
    catch (error) {
        if (epoch === generation)
            showError(error);
    }
    finally {
        formBusy(loginForm, false);
    }
});
workerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!current?.is_office || mutations || loading)
        return;
    const name = get('worker-name').value.trim();
    if (!workerRequest || workerRequest.name !== name)
        workerRequest = { name, id: crypto.randomUUID() };
    const epoch = generation;
    mutations++;
    formBusy(workerForm, true);
    message('Mentés…');
    try {
        await api.rpc('erp_create_worker_request', { p_org: current.organization_id, p_name: name, p_request: workerRequest.id });
        if (epoch !== generation)
            return;
        workerForm.reset();
        workerRequest = undefined;
        dirty = false;
        await loadWorkspace();
        message('A munkatársat mentettük.', true);
    }
    catch (error) {
        if (epoch === generation)
            showError(error);
    }
    finally {
        mutations--;
        formBusy(workerForm, false);
    }
});
roleForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!current?.is_office || mutations || loading || !projectSelect.value)
        return;
    let period;
    try {
        period = projectPeriod(get('assignment-from').value, get('assignment-until').value);
    }
    catch (error) {
        showError(error);
        return;
    }
    const epoch = generation;
    mutations++;
    formBusy(roleForm, true);
    message('Megbízás mentése…');
    try {
        await api.rpc('erp_assign_project_role', { p_org: current.organization_id, p_project: projectSelect.value, p_person: personSelect.value, p_role: get('assignment-role').value, p_from: period.from, p_until: period.until });
        if (epoch !== generation)
            return;
        dirty = false;
        await loadAssignments();
        message('A megbízást mentettük.', true);
    }
    catch (error) {
        if (epoch === generation)
            showError(error);
    }
    finally {
        mutations--;
        formBusy(roleForm, false);
    }
});
get('logout').addEventListener('click', async () => {
    if (mutations || loading) {
        message('Várd meg a folyamatban lévő művelet végét.');
        return;
    }
    if (dirty && !confirm('Kijelentkezel? A még nem mentett mezők tartalma elvész.'))
        return;
    generation++;
    try {
        await api.logout();
        resetView();
        message('Sikeres kijelentkezés.', true);
    }
    catch (error) {
        resetView();
        showError(error);
    }
});
get('reload-workspace').addEventListener('click', () => { if (!mutations)
    loadWorkspace().then(() => message('A lista naprakész.', true)).catch(showError); });
projectSelect.addEventListener('change', () => { loadAssignments().catch(showError); });
get('organization-select').addEventListener('change', () => { if (!mutations)
    loadWorkspace().catch(showError); });
for (const form of [workerForm, roleForm])
    form.addEventListener('input', () => { dirty = true; });
window.addEventListener('erp:before-update', event => {
    if (mutations || loading || restoring) {
        event.preventDefault();
        message('Várd meg a folyamatban lévő művelet végét.');
    }
    else if (dirty && !confirm('Frissíted az alkalmazást? A még nem mentett mezők tartalma elvész.'))
        event.preventDefault();
});
window.addEventListener('focus', () => { if (api.signedIn && !mutations && !dirty)
    loadWorkspace().catch(showError); });
get('assignment-from').value = todayBudapest();
async function restoreOffice() {
    if (setupOpening || restoring || api.signedIn)
        return;
    restoring = true;
    const epoch = generation;
    formBusy(loginForm, true);
    try {
        if (!api.remembered)
            return;
        message('Korábbi belépés ellenőrzése…');
        const restored = await api.restore();
        restoring = false;
        if (epoch !== generation || !restored)
            return;
        await loadWorkspace();
        message('Sikeres automatikus belépés.', true);
    }
    catch (error) {
        if (epoch === generation)
            showError(error);
    }
    finally {
        restoring = false;
        formBusy(loginForm, false);
    }
}
void restoreOffice();
export {};
