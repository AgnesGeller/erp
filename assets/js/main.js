const install = document.querySelector('#install');
const update = document.querySelector('#update');
const guide = document.querySelector('#install-guide');
let promptEvent;
let registration;
const installed = () => window.matchMedia('(display-mode: standalone)').matches ||
    Boolean(navigator.standalone);
function status(id, message, type = '') {
    const element = document.getElementById(id);
    element.textContent = (type === 'success' ? '✓ ' : '') + message;
    element.className = 'status ' + type;
}
function markInstalled() {
    install.querySelector('span').textContent = 'Alkalmazás telepítve';
    status('install-status', 'Sikeres telepítés.', 'success');
}
if (installed())
    markInstalled();
window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    promptEvent = event;
});
window.addEventListener('appinstalled', () => {
    promptEvent = undefined;
    markInstalled();
});
document.getElementById('close-guide').addEventListener('click', () => guide.close());
install.addEventListener('click', async () => {
    if (installed()) {
        markInstalled();
        return;
    }
    if (!promptEvent) {
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        document.getElementById('guide-content').textContent = ios
            ? 'Safariban nyisd meg a Megosztás menüt, majd válaszd a „Főképernyőhöz adás” lehetőséget.'
            : 'A böngésző menüjében válaszd az „Alkalmazás telepítése” vagy „Hozzáadás a kezdőképernyőhöz” lehetőséget. Ha nem jelenik meg, nyisd meg az oldalt Chrome-ban vagy Edge-ben. A webes felület telepítés nélkül is elérhető.';
        guide.showModal();
        status('install-status', 'Kövesd a megjelenő telepítési útmutatót.');
        return;
    }
    install.disabled = true;
    status('install-status', 'Telepítés megnyitása…');
    try {
        const pending = promptEvent;
        promptEvent = undefined;
        await pending.prompt();
        const result = await pending.userChoice;
        // Only appinstalled or standalone confirms completion.
        if (result.outcome === 'dismissed')
            status('install-status', 'A telepítést megszakítottad.');
        else if (!installed() && !document.querySelector('#install-status.success'))
            status('install-status', 'Telepítés elfogadva. Várakozás a böngésző visszaigazolására…');
    }
    catch {
        status('install-status', 'Nem sikerült elindítani a telepítést. Próbáld a böngésző menüjéből.', 'error');
    }
    finally {
        install.disabled = false;
    }
});
let applying = false;
navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (applying) {
        sessionStorage.setItem('erp-update-completed', '1');
        location.reload();
    }
});
const workerReady = 'serviceWorker' in navigator ? navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
    .then((value) => { registration = value; return value; })
    .catch(() => undefined) : Promise.resolve(undefined);
async function waitForInstallation(worker) {
    if (worker.state === 'installed')
        return;
    if (worker.state === 'redundant')
        throw new Error('worker failed');
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { worker.removeEventListener('statechange', changed); reject(new Error('timeout')); }, 20000);
        function changed() {
            if (worker.state === 'installed' || worker.state === 'redundant') {
                clearTimeout(timer);
                worker.removeEventListener('statechange', changed);
                worker.state === 'installed' ? resolve() : reject(new Error('worker failed'));
            }
        }
        worker.addEventListener('statechange', changed);
    });
}
update.addEventListener('click', async () => {
    update.disabled = true;
    status('update-status', 'Frissítések ellenőrzése…');
    try {
        const response = await fetch('./version.json?check=' + Date.now(), { cache: 'no-store', signal: AbortSignal.timeout(15000) });
        if (!response.ok)
            throw new Error('version unavailable');
        const release = await response.json();
        if (!release || typeof release !== 'object' || !('version' in release) || typeof release.version !== 'string')
            throw new Error('invalid version');
        registration = await workerReady;
        if ('serviceWorker' in navigator && !registration)
            throw new Error('worker unavailable');
        if (registration) {
            await registration.update();
            if (registration.installing)
                await waitForInstallation(registration.installing);
            if (registration.waiting) {
                applying = true;
                status('update-status', 'Új verzió betöltése…');
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                setTimeout(() => {
                    if (applying) {
                        applying = false;
                        update.disabled = false;
                        status('update-status', 'A frissítés nem fejeződött be. Próbáld újra.', 'error');
                    }
                }, 15000);
                return;
            }
        }
        if (release.version !== '0.1.1') {
            sessionStorage.setItem('erp-update-completed', '1');
            location.reload();
            return;
        }
        status('update-status', 'Sikeres ellenőrzés. Az alkalmazás naprakész.', 'success');
    }
    catch {
        status('update-status', 'A frissítés nem ellenőrizhető. Ellenőrizd az internetkapcsolatot, majd próbáld újra.', 'error');
    }
    finally {
        if (!applying)
            update.disabled = false;
    }
});
if (sessionStorage.getItem('erp-update-completed')) {
    sessionStorage.removeItem('erp-update-completed');
    status('update-status', 'Sikeres frissítés.', 'success');
}
document.getElementById('version').textContent = 'DÍSZKERTEK · 0.1.1';
export {};
