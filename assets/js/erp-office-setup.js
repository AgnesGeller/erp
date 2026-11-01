const setupParams = new URLSearchParams(location.hash.slice(1));
const setupToken = setupParams.get('office_setup');
const setupName = setupParams.get('manager');
if (setupToken !== null) {
    document.documentElement.dataset.erpSetup = 'true';
    history.replaceState(null, '', location.pathname + location.search);
}
const setupApiUrl = new URL('./erp-api.js?v=0.2.0', import.meta.url);
const { ErpApi } = await import(setupApiUrl.href);
const setupApi = new ErpApi();
const setupGet = (id) => document.getElementById(id);
const setupForm = setupGet('office-setup-form');
let setupBusy = false;
let setupDirty = false;
function setupMessage(text, ok = false) { const p = setupGet('office-setup-status'); p.textContent = (ok ? '✓ ' : '') + text; p.className = 'office-status ' + (ok ? 'success' : 'error'); }
if (setupToken !== null) {
    setupGet('login-area').hidden = true;
    setupGet('office-setup').hidden = false;
    if ((setupName !== 'agi' && setupName !== 'tamas') || !/^[a-f0-9]{64}$/.test(setupToken)) {
        setupMessage('A beállító hivatkozás érvénytelen. Kérj új hivatkozást az irodától.');
        setupForm.querySelector('fieldset').disabled = true;
    }
    else
        setupGet('office-setup-title').textContent = (setupName === 'agi' ? 'Ági' : 'Tamás') + ' · első ERP-belépés';
}
setupForm.addEventListener('input', () => { setupDirty = true; });
setupForm.addEventListener('invalid', () => setupMessage('A PIN-kód mindkét mezőben 6–12 számjegy legyen.'), true);
setupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (setupBusy || !setupToken || (setupName !== 'agi' && setupName !== 'tamas'))
        return;
    const pin = setupGet('setup-pin').value;
    if (pin !== setupGet('setup-pin-repeat').value) {
        setupMessage('A két PIN-kód nem egyezik.');
        return;
    }
    setupBusy = true;
    setupForm.querySelector('fieldset').disabled = true;
    setupGet('office-setup-status').textContent = 'Beállítás…';
    try {
        await setupApi.setupOffice(setupName, setupToken, pin);
        setupDirty = false;
        setupForm.reset();
        setupGet('office-setup').hidden = true;
        setupGet('login-area').hidden = false;
        setupGet('login-name').value = setupName;
        setupGet('login-username').value = setupName;
        setupGet('login-feedback').textContent = '✓ A saját ERP PIN-kódodat beállítottad. Most beléphetsz.';
        setupGet('login-feedback').className = 'office-status success';
    }
    catch (error) {
        setupMessage(error instanceof Error ? error.message : 'A beállítás nem sikerült.');
    }
    finally {
        setupBusy = false;
        setupForm.querySelector('fieldset').disabled = false;
    }
});
window.addEventListener('erp:before-update', event => { if (setupBusy) {
    event.preventDefault();
    setupMessage('Várd meg a beállítás végét.');
}
else if (setupDirty && !confirm('Frissíted az alkalmazást? A még nem mentett PIN-kód elvész.'))
    event.preventDefault(); });
export {};
