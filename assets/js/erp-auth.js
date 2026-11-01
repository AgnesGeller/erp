const linkModule = new URL('./erp-auth-link.js?v=0.1.7', import.meta.url);
const { readAuthLink } = await import(linkModule.href);
const callback = readAuthLink(location.href);
if (callback.recognized)
    history.replaceState(null, '', callback.cleanedUrl);
const apiModule = new URL('./erp-api.js?v=0.1.7', import.meta.url);
const { ErpApi } = await import(apiModule.href);
const api = new ErpApi();
const el = (id) => document.getElementById(id);
const emailForm = el('auth-email-form');
const passwordForm = el('new-password-form');
let kind = 'recover';
let busy = false;
let recoveryToken = callback.token;
let passwordDirty = false;
function feedback(text, success = false) {
    const p = el('auth-status');
    p.textContent = (success ? '✓ ' : '') + text;
    p.className = 'office-status ' + (success ? 'success' : 'error');
}
function show(panel) {
    el('login-area').hidden = panel !== 'login';
    el('auth-email-area').hidden = panel !== 'email';
    el('new-password-area').hidden = panel !== 'password';
}
async function openEmail(mode) {
    if (busy)
        return;
    kind = mode;
    show('email');
    el('auth-status').textContent = '';
    el('auth-email-title').textContent = mode === 'register' ? 'Regisztráció' : 'Elfelejtett jelszó';
    el('auth-email-description').textContent = mode === 'register' ? 'Add meg az e-mail-címedet. A levélben kapott hivatkozással saját jelszót állíthatsz be. A munkákhoz való hozzáférést az iroda adja meg.' : 'Add meg a fiókod e-mail-címét. E-mailben kapsz hivatkozást az új jelszó beállításához.';
    el('auth-email').value = el('login-email').value.trim();
    el('auth-email').focus();
    busy = true;
    emailForm.querySelector('fieldset').disabled = true;
    try {
        const options = await api.emailOptions();
        if (!options.email_enabled)
            feedback('Az e-mailes jelszóbeállítás jelenleg nem érhető el. Kérj segítséget az irodától.');
    }
    catch (error) {
        feedback(error instanceof Error ? error.message : 'Az e-mailes ügyintézés nem érhető el.');
    }
    finally {
        busy = false;
        emailForm.querySelector('fieldset').disabled = false;
    }
}
el('register').addEventListener('click', () => { void openEmail('register'); });
el('forgot-password').addEventListener('click', () => { void openEmail('recover'); });
for (const id of ['auth-back', 'password-back'])
    el(id).addEventListener('click', () => {
        if (busy)
            return;
        if (passwordDirty && !confirm('Visszalépsz? A még nem mentett jelszó elvész.'))
            return;
        recoveryToken = undefined;
        passwordDirty = false;
        passwordForm.reset();
        show('login');
        el('auth-status').textContent = '';
    });
emailForm.addEventListener('invalid', () => feedback('Adj meg egy érvényes e-mail-címet.'), true);
emailForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy)
        return;
    busy = true;
    emailForm.querySelector('fieldset').disabled = true;
    const email = el('auth-email').value.trim();
    el('auth-status').textContent = 'Kérés küldése…';
    try {
        const result = await api.requestEmail(email, kind);
        feedback(result.message, true);
    }
    catch (error) {
        feedback(error instanceof Error ? error.message : 'Az e-mail küldése nem sikerült.');
    }
    finally {
        busy = false;
        emailForm.querySelector('fieldset').disabled = false;
    }
});
passwordForm.addEventListener('input', () => { passwordDirty = true; });
passwordForm.addEventListener('invalid', () => feedback('Adj meg legalább 12 karakteres jelszót mindkét mezőben.'), true);
passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy)
        return;
    const password = el('new-password').value;
    const repeated = el('repeat-password').value;
    if (password !== repeated) {
        feedback('A két jelszó nem egyezik.');
        return;
    }
    if (!recoveryToken) {
        feedback('Kérj új jelszóbeállító e-mailt.');
        return;
    }
    busy = true;
    passwordForm.querySelector('fieldset').disabled = true;
    el('auth-status').textContent = 'Jelszó mentése…';
    try {
        await api.setPassword(password, recoveryToken);
        recoveryToken = undefined;
        passwordDirty = false;
        passwordForm.reset();
        show('login');
        feedback('Sikeresen beállítottad a jelszavadat. Most beléphetsz az e-mail-címeddel és az új jelszóval. A munkákhoz az iroda által megadott jogosultság szükséges.', true);
    }
    catch (error) {
        feedback(error instanceof Error ? error.message : 'A jelszó beállítása nem sikerült.');
    }
    finally {
        busy = false;
        passwordForm.querySelector('fieldset').disabled = false;
    }
});
window.addEventListener('erp:before-update', event => {
    if (busy) {
        event.preventDefault();
        feedback('Várd meg a folyamatban lévő művelet végét.');
    }
    else if (passwordDirty && !confirm('Frissíted az alkalmazást? A még nem mentett jelszó elvész.'))
        event.preventDefault();
});
if (callback.error) {
    show('email');
    feedback(callback.error);
}
else if (recoveryToken) {
    show('password');
    el('new-password').focus();
}
export {};
