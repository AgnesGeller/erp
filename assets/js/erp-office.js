const clientSetupParams = new URLSearchParams(location.hash.slice(1));
const clientSetupKind = clientSetupParams.has('staff_setup') ? 'staff' : 'client';
let clientSetupToken = clientSetupParams.get(clientSetupKind === 'staff' ? 'staff_setup' : 'client_setup');
const clientSetupOpening = clientSetupToken !== null;
if (clientSetupOpening)
    history.replaceState(null, '', location.pathname + location.search);
const setupOpening = clientSetupOpening || new URLSearchParams(location.hash.slice(1)).has('office_setup') || document.documentElement.dataset.erpSetup === 'true';
const apiUrl = new URL('./erp-api.js?v=0.16.7', import.meta.url);
const datesUrl = new URL('./erp-dates.js?v=0.16.7', import.meta.url);
const [{ ErpApi, ApiError }, { projectPeriod, todayBudapest, periodLabel }, { projectRoleNames: roleNames, selectableProjectRoles }] = await Promise.all([import(apiUrl.href), import(datesUrl.href), import(new URL('./erp-project-roles.js?v=0.16.7', import.meta.url).href)]);
const api = new ErpApi();
const [{ CustomerDirectory }, { SiteWorks }, { QuoteDesk }, { SurveyDesk, surveysEnabled }, { ClientAdmin, ClientPortal }, { StaffAdmin }, { WorkPlanDesk }, { MaterialDesk }, { WorksheetDesk }, { EntryDesk }, { FinanceDesk }, { WorkpackDesk }, { CalendarDesk }, { ReferenceDesk }, { MaintenanceDesk }, { OfficeNavigation }] = await Promise.all([
    import(new URL('./erp-customers.js?v=0.16.7', import.meta.url).href),
    import(new URL('./erp-site-works.js?v=0.16.7', import.meta.url).href),
    import(new URL('./erp-quotes.js?v=0.16.7', import.meta.url).href),
    import(new URL('./erp-surveys.js?v=0.16.7', import.meta.url).href),
    import(new URL('./erp-clients.js?v=0.16.7', import.meta.url).href),
    import(new URL('./erp-staff.js?v=0.16.7', import.meta.url).href),
    import(new URL('./erp-workplans.js?v=0.16.7', import.meta.url).href),
    import(new URL('./erp-materials.js?v=0.16.7', import.meta.url).href),
    import(new URL('./erp-worksheets.js?v=0.16.7', import.meta.url).href),
    import(new URL('./erp-entries.js?v=0.16.7', import.meta.url).href),
    import(new URL('./erp-finance.js?v=0.16.7', import.meta.url).href),
    import(new URL('./erp-workpack.js?v=0.16.7', import.meta.url).href),
    import(new URL('./erp-calendar.js?v=0.16.7', import.meta.url).href),
    import(new URL('./erp-references.js?v=0.16.7', import.meta.url).href),
    import(new URL('./erp-maintenance.js?v=0.16.7', import.meta.url).href),
    import(new URL('./erp-office-navigation.js?v=0.16.7', import.meta.url).href)
]);
const finance = new FinanceDesk(api, showError);
const workpack = new WorkpackDesk(api, showError);
const calendar = new CalendarDesk(api, showError);
const references = new ReferenceDesk(api, showError);
const maintenance = new MaintenanceDesk(api, showError);
maintenance.setFinanceHandler(project => { void finance.showProject(project); });
const staffAdmin = new StaffAdmin(api);
const workplans = new WorkPlanDesk(api, showError);
workplans.setWorkpackDesk(workpack);
workplans.setMaintenanceHandler((project, role, notification) => { void maintenance.showProject(project, role, notification); });
workplans.setFinanceHandler((project, role) => { void finance.showProject(project, role); });
const entries = new EntryDesk(api, showError, project => { void workplans.refreshAfterEntry(); if (project?.quote_id)
    void quotes.refreshAfterContractChange(project.quote_id); });
workplans.setEntryDesk(entries);
const materials = new MaterialDesk(api, showError, () => { void workplans.refreshAfterEntry(); void worksheets.refreshMaterials(); });
workplans.setMaterialDesk(materials);
const worksheets = new WorksheetDesk(api, showError, () => { void workplans.refreshAfterEntry(); });
workplans.setWorksheetDesk(worksheets);
worksheets.setMaterialDesk(materials);
const clientAdmin = new ClientAdmin(api, error => { if (!api.signedIn)
    showError(error); });
const clientPortal = new ClientPortal(api, showError);
const customers = new CustomerDirectory(api, error => { if (!api.signedIn)
    showError(error); }, (id, name) => { void works.selectCustomer(id, name); }, (id, name) => { void quotes.selectCustomer(id, name); }, surveysEnabled ? (id, name) => { void surveys.selectCustomer(id, name); } : undefined, (id, name) => { void clientAdmin.open(id, name); });
const works = new SiteWorks(api, error => { if (!api.signedIn)
    showError(error); }, loadWorkspace, () => { customers.open(); get('customer-search').focus(); });
const quotes = new QuoteDesk(api, error => { if (!api.signedIn)
    showError(error); }, () => { customers.open(); get('customer-search').focus(); }, loadWorkspace, media => surveys.showMedia(media));
let officeNavigation;
const surveys = new SurveyDesk(api, error => { if (!api.signedIn)
    showError(error); }, () => { customers.open(); get('customer-search').focus(); }, async (payload) => { await quotes.selectSurvey(payload); });
officeNavigation = new OfficeNavigation(async () => { if (mutations || loading || !quotes.leave() || !customers.leave() || !works.leave() || !workplans.leave() || !calendar.leave() || !references.leave())
    return false; if (!await surveys.leave())
    return false; if (dirty && !confirm('Visszalépsz a kezdőlapra a még nem mentett űrlapadatok mellett?'))
    return false; return true; }, () => { if (!quotes.dirty && !surveys.dirty && !dirty)
    void workplans.open();
else
    message('Előbb fejezd be vagy mentsd a jelenlegi szerkesztést.'); }, () => { if (!quotes.dirty && !surveys.dirty && !dirty)
    void maintenance.open();
else
    message('Előbb fejezd be vagy mentsd a jelenlegi szerkesztést.'); });
document.getElementById('show-materials').addEventListener('click', () => { if (current?.is_office && !workplans.busy && !workplans.entryBusy && !quotes.dirty && !surveys.dirty)
    void materials.show(current.person_id, current.organization_id);
else
    message('Előbb fejezd be vagy mentsd a jelenlegi szerkesztést.'); });
document.getElementById('show-surveys').hidden = !surveysEnabled;
for (const id of ['show-customers', 'show-team', 'show-works', 'show-quotes', 'show-prices', 'show-surveys']) {
    const b = document.getElementById(id);
    b.addEventListener('click', event => { if (surveys.busy || surveys.dirty) {
        event.preventDefault();
        event.stopImmediatePropagation();
        void surveys.leave().then(ok => { if (ok)
            b.click(); });
    } }, { capture: true });
}
for (const id of ['show-customers', 'show-team', 'show-works', 'show-quotes', 'show-prices', 'show-surveys'])
    document.getElementById(id).addEventListener('click', event => { if (!quotes.leave() || ((id === 'show-quotes' || id === 'show-prices' || id === 'show-surveys') && (!customers.leave() || !works.leave()))) {
        event.preventDefault();
        event.stopImmediatePropagation();
    } }, { capture: true });
for (const id of ['show-customers', 'show-team'])
    document.getElementById(id).addEventListener('click', event => { if (!works.leave()) {
        event.preventDefault();
        event.stopImmediatePropagation();
    } }, { capture: true });
document.getElementById('show-works').addEventListener('click', event => { if (!customers.leave()) {
    event.preventDefault();
    event.stopImmediatePropagation();
} }, { capture: true });
const get = (id) => document.getElementById(id);
document.getElementById('logout').addEventListener('click', e => { if (!calendar.leave() || !references.leave()) {
    e.preventDefault();
    e.stopImmediatePropagation();
} }, { capture: true });
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
let lastWorkspaceRefresh = 0;
let teamLoadedFor;
let teamLoadedAt = 0;
let restoring = false;
let assignmentRequest = 0;
let workerRequest;
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
    teamLoadedFor = undefined;
    teamLoadedAt = 0;
    references.reset();
    calendar.reset();
    officeNavigation.reset();
    workpack.reset();
    maintenance.reset();
    finance.reset();
    staffAdmin.reset();
    workplans.reset();
    get('show-materials').hidden = true;
    clientAdmin.reset();
    clientPortal.reset();
    customers.reset();
    works.reset();
    quotes.reset();
    surveys.reset();
    current = undefined;
    people = [];
    projects = [];
    dirty = false;
    workerRequest = undefined;
    get('staff-workspace').hidden = true;
    get('office-app').hidden = true;
    get('client-login-area').hidden = true;
    get('client-setup-area').hidden = true;
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
    const selected = list.value;
    people.sort((a, b) => a.display_name.localeCompare(b.display_name, 'hu', { sensitivity: 'base' }));
    list.replaceChildren(new Option('Válassz munkatársat', ''));
    for (const person of people)
        list.add(new Option(person.display_name + (person.active ? '' : ' · Inaktív'), person.id));
    if (people.some(p => p.id === selected))
        list.value = selected;
    personSelect.replaceChildren(new Option('Válassz munkatársat', ''));
    for (const person of people.filter(p => p.active))
        personSelect.add(new Option(person.display_name, person.id));
    if (people.some(p => p.id === previousPerson && p.active))
        personSelect.value = previousPerson;
}
async function loadAssignments() {
    const list = get('assignment-list');
    list.replaceChildren();
    get('role-form').hidden = !current?.is_office;
    const roleSelect = get('assignment-role');
    const oldRole = roleSelect.value;
    const workType = projects.find(p => p.id === projectSelect.value)?.work_type;
    const choices = selectableProjectRoles(workType);
    roleSelect.replaceChildren(...choices.map(choice => { const option = new Option(choice.label, choice.value); option.disabled = choice.disabled; return option; }));
    roleSelect.value = choices.find(c => c.value === oldRole && !c.disabled)?.value ?? choices.find(c => !c.disabled).value;
    get('assignment-save').disabled = !projectSelect.value;
    get('assignment-work-type').textContent = workType === 'construction' ? 'Kertépítés – az Építésvezető vezetői jogosultságával.' : workType === 'maintenance' ? 'Kertkarbantartás – a Karbantartásvezető vezetői jogosultságával.' : 'Megbízás mentéséhez előbb válassz munkát. A Kertépítő és a Kertész mindkét munkaterületen dolgozhat.';
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
async function loadWorkspace(freshMemberships) {
    if (loading || !api.signedIn)
        return;
    loading = true;
    lastWorkspaceRefresh = Date.now();
    const epoch = generation;
    get('organization-select').disabled = true;
    projectSelect.disabled = true;
    try {
        // Csak az éppen sikeres szerveres belépés/helyreállítás válasza adható át; nem helyi jogosultságmásolat.
        const memberships = freshMemberships ?? await api.rpc('erp_session');
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
        get('show-materials').hidden = !current.is_office;
        maintenance.setOwner(current.person_id, current.organization_id, current.is_office ? 'office' : current.is_client ? 'client' : 'staff');
        finance.setOwner(current.person_id, current.organization_id, current.is_office ? 'office' : current.is_client ? 'client' : 'staff');
        officeNavigation.setOwner(current.person_id, current.organization_id, current.is_office);
        calendar.setOwner(current.person_id, current.organization_id, current.is_office);
        references.setOwner(current.person_id, current.organization_id, current.is_office);
        workplans.setOwner(current.person_id, current.organization_id, current.is_client === true && !current.is_office);
        staffAdmin.setOrganization(current.is_office ? current.organization_id : undefined);
        get('staff-workspace').hidden = true;
        if (current.is_staff && !current.is_office) {
            clientAdmin.setOrganization(undefined);
            clientPortal.reset();
            customers.reset();
            works.reset();
            quotes.reset();
            surveys.reset();
            get('office-app').hidden = true;
            get('login-area').hidden = true;
            get('client-login-area').hidden = true;
            get('client-setup-area').hidden = true;
            get('public-identity').hidden = true;
            get('logout').hidden = false;
            get('staff-workspace').hidden = false;
            return;
        }
        if (current.is_client) {
            clientAdmin.setOrganization(undefined);
            customers.reset();
            works.reset();
            quotes.reset();
            surveys.reset();
            get('office-app').hidden = true;
            get('login-area').hidden = true;
            get('client-login-area').hidden = true;
            get('client-setup-area').hidden = true;
            get('public-identity').hidden = true;
            get('logout').hidden = false;
            await clientPortal.open(current.person_id);
            return;
        }
        clientPortal.reset();
        clientAdmin.setOrganization(current.is_office ? current.organization_id : undefined);
        get('client-login-area').hidden = true;
        surveys.setOrganization(current.is_office ? current.organization_id : undefined, current.person_id);
        quotes.setOrganization(current.is_office ? current.organization_id : undefined);
        works.setOrganization(current.is_office ? current.organization_id : undefined);
        if (current.is_office && !get('office-home').hidden) {
            await customers.setOrganization(current.organization_id, true);
            if (epoch !== generation)
                return;
            if (teamLoadedFor !== current.organization_id) {
                people = [];
                projects = [];
                projectSelect.replaceChildren();
                personSelect.replaceChildren();
                get('people-list').replaceChildren();
                get('assignment-list').replaceChildren();
            }
            get('office-app').hidden = false;
            get('login-area').hidden = true;
            get('public-identity').hidden = true;
            get('logout').hidden = false;
            return;
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
        await customers.setOrganization(current.is_office ? current.organization_id : undefined);
        if (current.is_office)
            await clientAdmin.refreshRequests();
        teamLoadedFor = current.organization_id;
        teamLoadedAt = Date.now();
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
        await loadWorkspace(api.organizations);
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
    if (!workplans.leave() || !staffAdmin.leave())
        return;
    if (mutations || loading || clientAdmin.busy || clientPortal.busy || customers.busy || works.busy || quotes.busy || surveys.busy) {
        message('Várd meg a folyamatban lévő művelet végét.');
        return;
    }
    if ((dirty || clientAdmin.dirty || customers.dirty || works.dirty || quotes.dirty || surveys.dirty) && !confirm('Kijelentkezel? A még nem mentett mezők tartalma elvész.'))
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
get('show-team').addEventListener('click', () => { if (current?.is_office && !loading && !mutations && !dirty && (teamLoadedFor !== current.organization_id || Date.now() - teamLoadedAt >= 30000))
    void loadWorkspace().catch(showError); });
get('reload-workspace').addEventListener('click', () => { if (!mutations)
    loadWorkspace().then(() => message('A lista naprakész.', true)).catch(showError); });
projectSelect.addEventListener('change', () => { loadAssignments().catch(showError); });
get('organization-select').addEventListener('change', () => { if (!mutations)
    loadWorkspace().catch(showError); });
for (const form of [workerForm, roleForm])
    form.addEventListener('input', () => { dirty = true; });
window.addEventListener('erp:before-update', event => {
    if (mutations || loading || restoring || workplans.busy || workplans.entryBusy || staffAdmin.busy || clientAdmin.busy || clientPortal.busy || customers.busy || works.busy || quotes.busy || surveys.busy) {
        event.preventDefault();
        message(restoring ? 'Az automatikus belépés még folyamatban van.' : loading ? 'A munkatér adatai még töltődnek.' : 'Mentés vagy más művelet van folyamatban. Várd meg a visszajelzést.');
    }
    else if ((dirty || clientAdmin.dirty || customers.dirty || works.dirty || quotes.dirty || surveys.dirty) && !confirm('Frissíted az alkalmazást? A még nem mentett mezők tartalma elvész.'))
        event.preventDefault();
});
window.addEventListener('focus', () => { if (Date.now() - lastWorkspaceRefresh >= 30000 && api.signedIn && !workplans.busy && !workplans.entryBusy && !workplans.dirty && !staffAdmin.busy && !mutations && !dirty && !clientAdmin.dirty && !clientAdmin.busy && !clientPortal.busy && !customers.dirty && !works.dirty && !quotes.dirty && !surveys.dirty && !customers.busy && !works.busy && !quotes.busy && !surveys.busy)
    loadWorkspace().catch(showError); });
const clientForm = get('client-login-form'), clientSetupForm = get('client-setup-form');
let clientAuthBusy = false;
let clientSetupDirty = false;
let loginKind = 'client';
function clientFeedback(text, success = false) { const x = get(!get('client-setup-area').hidden ? 'client-setup-feedback' : 'client-login-feedback'); x.textContent = (success ? '✓ ' : '') + text; x.className = 'office-status ' + (success ? 'success' : 'error'); }
function showPublicLogin(kind, force = false) { if (!force && (clientAuthBusy || loading || restoring))
    return; loginKind = kind; get('login-area').hidden = true; get('client-login-area').hidden = false; get('client-login-description').textContent = kind === 'staff' ? 'Saját kertépítéseid és teendőid, a munkánként kiosztott szerepköröddel.' : 'Saját ajánlataid és munkáid követése, az iroda által kijelölt címekhez.'; get('client-login-title').textContent = kind === 'staff' ? 'Dolgozói belépés' : 'Megrendelői belépés'; get('switch-client-kind').textContent = kind === 'staff' ? 'Megrendelői belépés' : 'Dolgozói belépés'; get('client-login-feedback').textContent = ''; get('client-login-password').value = ''; get('client-login-email').focus(); }
get('show-client-login').addEventListener('click', () => showPublicLogin('client'));
get('show-staff-login').addEventListener('click', () => showPublicLogin('staff'));
get('switch-client-kind').addEventListener('click', () => showPublicLogin(loginKind === 'staff' ? 'client' : 'staff'));
get('show-office-login').addEventListener('click', () => { if (clientAuthBusy)
    return; get('client-login-area').hidden = true; get('login-area').hidden = false; get('client-login-password').value = ''; });
clientForm.addEventListener('invalid', () => clientFeedback('Add meg az irodával egyeztetett e-mail-címet és a legalább 12 karakteres saját ERP-jelszót.'), true);
clientForm.addEventListener('submit', async (e) => { e.preventDefault(); if (clientAuthBusy || loading)
    return; clientAuthBusy = true; formBusy(clientForm, true); const email = get('client-login-email').value.trim(), password = get('client-login-password').value; get('client-login-password').value = ''; const epoch = ++generation; clientFeedback('Belépés…'); try {
    if (loginKind === 'staff')
        await api.loginStaff(email, password);
    else
        await api.loginClient(email, password);
    if (epoch !== generation)
        return;
    await loadWorkspace(api.organizations);
}
catch (error) {
    if (epoch === generation)
        clientFeedback(error instanceof Error ? error.message : 'A belépés nem sikerült.');
}
finally {
    clientAuthBusy = false;
    formBusy(clientForm, false);
} });
get('client-forgot').addEventListener('click', async () => { if (clientAuthBusy)
    return; const email = get('client-login-email'); if (!email.reportValidity())
    return; clientAuthBusy = true; formBusy(clientForm, true); try {
    const result = loginKind === 'staff' ? await api.staffPublic('staff_recover', { email: email.value.trim() }) : await api.clientPublic('client_recover', { email: email.value.trim() });
    clientFeedback(result.message, true);
}
catch (error) {
    clientFeedback(error instanceof Error ? error.message : 'A kérés nem sikerült.');
}
finally {
    clientAuthBusy = false;
    formBusy(clientForm, false);
} });
clientSetupForm.addEventListener('input', () => { clientSetupDirty = true; });
clientSetupForm.addEventListener('submit', async (e) => { e.preventDefault(); if (clientAuthBusy || !clientSetupToken)
    return; const password = get('client-new-password').value; if (password !== get('client-repeat-password').value) {
    clientFeedback('A két jelszó nem egyezik.');
    return;
} clientAuthBusy = true; formBusy(clientSetupForm, true); try {
    if (clientSetupKind === 'staff')
        await api.staffPublic('staff_setup', { setup_token: clientSetupToken, password });
    else
        await api.clientPublic('client_setup', { setup_token: clientSetupToken, password });
    clientSetupToken = null;
    clientSetupDirty = false;
    clientSetupForm.reset();
    get('client-setup-area').hidden = true;
    showPublicLogin(clientSetupKind, true);
    get('client-login-feedback').textContent = '✓ A saját ERP-jelszavadat beállítottad. Most beléphetsz az irodával egyeztetett e-mail-címeddel.';
}
catch (error) {
    clientFeedback(error instanceof Error ? error.message : 'A jelszó nem állítható be.');
}
finally {
    clientAuthBusy = false;
    formBusy(clientSetupForm, false);
} });
window.addEventListener('erp:before-update', event => { if (clientAuthBusy) {
    event.preventDefault();
    clientFeedback('Várd meg a folyamatban lévő belépési művelet végét.');
}
else if (clientSetupDirty && !confirm('Frissíted az alkalmazást? A még nem mentett jelszómezők tartalma elvész.'))
    event.preventDefault(); });
window.addEventListener('beforeunload', e => { if (clientAuthBusy || clientSetupDirty || clientAdmin.dirty) {
    e.preventDefault();
    e.returnValue = '';
} });
if (clientSetupOpening) {
    if (clientSetupKind === 'staff')
        get('client-setup-title').textContent = 'Saját dolgozói jelszó beállítása';
    get('login-area').hidden = true;
    get('client-setup-area').hidden = false;
    if (!/^[a-f0-9]{64}$/.test(clientSetupToken ?? '')) {
        clientFeedback('A beállító hivatkozás érvénytelen. Kérj újat az irodától.');
        formBusy(clientSetupForm, true);
    }
}
get('assignment-from').value = todayBudapest();
async function restoreOffice() {
    if (setupOpening || restoring || api.signedIn) {
        window.dispatchEvent(new Event('erp:startup-ready'));
        return;
    }
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
        await loadWorkspace(api.organizations);
        if (epoch !== generation || !api.signedIn)
            return;
        message('Sikeres automatikus belépés.', true);
    }
    catch (error) {
        if (epoch === generation)
            showError(error);
    }
    finally {
        restoring = false;
        formBusy(loginForm, false);
        window.dispatchEvent(new Event('erp:startup-ready'));
    }
}
void restoreOffice();
export {};
