const APP_VERSION = '0.1.4';
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
const install = document.querySelector<HTMLButtonElement>('#install')!;
const update = document.querySelector<HTMLButtonElement>('#update')!;
const guide = document.querySelector<HTMLDialogElement>('#install-guide')!;
let promptEvent: InstallPrompt | undefined;
let registration: ServiceWorkerRegistration | undefined;
const installed = () => window.matchMedia('(display-mode: standalone)').matches ||
  Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
function status(id: string, message: string, type = ''): void {
  const element = document.getElementById(id)!;
  element.textContent = (type === 'success' ? '✓ ' : '') + message;
  element.className = 'status ' + type;
}
function markInstalled(): void {
  install.querySelector('span')!.textContent = 'Alkalmazás telepítve';
  status('install-status', 'Sikeres telepítés.', 'success');
}
if (installed()) markInstalled();
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  promptEvent = event as InstallPrompt;
});
window.addEventListener('appinstalled', () => {
  promptEvent = undefined;
  markInstalled();
});
function installationGuide(ua: string, platform: string, touchPoints: number): { title: string; message: string } {
  const address = 'https://agnesgeller.github.io/erp/';
  if (/Viber|FBAN|FBAV|Instagram|Line\//i.test(ua)) return {
    title: 'Megnyitás telepítéshez',
    message: '1. A link menüjében válaszd a Megnyitás böngészőben lehetőséget.\n2. Az ott megnyíló Díszkertek oldalon nyomd meg a Telepítés gombot.\n\nWebcím: ' + address
  };
  if (/iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && touchPoints > 1)) return {
    title: 'Telepítés iPhone-ra vagy iPadre',
    message: '1. Nyisd meg ezt az oldalt Safariban.\n2. Koppints a Megosztás gombra.\n3. Válaszd a Főképernyőhöz adás lehetőséget, majd a Hozzáadás gombot.\n\nEzután a Díszkertek ikonjával indíthatod az alkalmazást.\nWebcím: ' + address
  };
  if (/Android/.test(ua)) return {
    title: 'Telepítés Androidra',
    message: '1. Nyisd meg az oldalt a telefon böngészőjében.\n2. A böngésző menüjében válaszd az Alkalmazás telepítése vagy a Hozzáadás a kezdőképernyőhöz lehetőséget.\n3. Erősítsd meg a Telepítés vagy Hozzáadás gombbal.\n\nHa a menü nem kínál telepítést, nyisd meg a webcímet Chrome-ban vagy Edge-ben.\nWebcím: ' + address
  };
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) return {
    title: 'Telepítés Macre',
    message: '1. Safari menü: Fájl → Hozzáadás a Dockhoz.\n2. Ellenőrizd a Díszkertek nevet, majd válaszd a Hozzáadás gombot.\n\nHa a Safari verziódban ez nem érhető el, Chrome-ból vagy Edge-ből telepítheted.\nWebcím: ' + address
  };
  return {
    title: 'Telepítés számítógépre',
    message: '1. Chrome-ban vagy Edge-ben nyisd meg a Díszkertek webcímét.\n2. A címsor jobb oldalán válaszd a telepítés ikont, vagy a böngésző menüjében az alkalmazás telepítését.\n3. Erősítsd meg a Telepítés gombbal.\n\nAsztali Firefoxból és beágyazott böngészőből a közvetlen telepítés nem mindenhol támogatott.\nWebcím: ' + address
  };
}
document.getElementById('close-guide')!.addEventListener('click', () => guide.close());
install.addEventListener('click', async () => {
  if (!promptEvent && installed()) { markInstalled(); return; }
  if (!promptEvent) {
    const help = installationGuide(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
    document.getElementById('guide-title')!.textContent = help.title;
    document.getElementById('guide-content')!.textContent = help.message;
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
    if (result.outcome === 'dismissed') status('install-status', 'A telepítést megszakítottad.');
    else if (!installed() && !document.querySelector('#install-status.success'))
      status('install-status', 'Telepítés elfogadva. Várakozás a böngésző visszaigazolására…');
  } catch {
    status('install-status', 'Nem sikerült elindítani a telepítést. Próbáld a böngésző menüjéből.', 'error');
  } finally { install.disabled = false; }
});
let applying = false;
let targetVersion: string | undefined;
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (applying) {
    sessionStorage.setItem('erp-update-completed', targetVersion ?? APP_VERSION);
    const next = new URL(location.href);
    next.searchParams.set('app-version', targetVersion ?? APP_VERSION);
    location.replace(next.href);
  }
});
const workerReady: Promise<ServiceWorkerRegistration | undefined> =
  'serviceWorker' in navigator ? navigator.serviceWorker.register('./sw.js?v=' + APP_VERSION, { scope: './', updateViaCache: 'none' })
    .then((value) => { registration = value; return value; })
    .catch(() => undefined) : Promise.resolve(undefined);
async function waitForInstallation(worker: ServiceWorker): Promise<void> {
  if (worker.state === 'installed') return;
  if (worker.state === 'redundant') throw new Error('worker failed');
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { worker.removeEventListener('statechange', changed); reject(new Error('timeout')); }, 20000);
    function changed(): void {
      if (worker.state === 'installed' || worker.state === 'redundant') {
        clearTimeout(timer); worker.removeEventListener('statechange', changed);
        worker.state === 'installed' ? resolve() : reject(new Error('worker failed'));
      }
    }
    worker.addEventListener('statechange', changed);
  });
}
update.addEventListener('click', async () => {
  if(!window.dispatchEvent(new Event('erp:before-update',{cancelable:true})))return;
  update.disabled = true;
  status('update-status', 'Frissítések ellenőrzése…');
  try {
    const response = await fetch('./version.json?check=' + Date.now(), { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('version unavailable');
    const release: unknown = await response.json();
    if (!release || typeof release !== 'object' || !('version' in release) || typeof release.version !== 'string')
      throw new Error('invalid version');
    targetVersion = release.version;
    registration = await workerReady;
    if ('serviceWorker' in navigator && !registration) throw new Error('worker unavailable');
    if (registration) {
      await registration.update();
      if (registration.installing) await waitForInstallation(registration.installing);
      if (registration.waiting) {
        applying = true;
        status('update-status', 'Új verzió betöltése…');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        setTimeout(() => {
          if (applying) { applying = false; update.disabled = false; status('update-status', 'A frissítés nem fejeződött be. Próbáld újra.', 'error'); }
        }, 15000);
        return;
      }
    }
    if (release.version !== APP_VERSION) {
      sessionStorage.setItem('erp-update-completed', release.version);
      const next = new URL(location.href);
      next.searchParams.set('app-version', release.version);
      location.replace(next.href);
      return;
    }
    status('update-status', 'Sikeres ellenőrzés. Az alkalmazás naprakész.', 'success');
  } catch {
    status('update-status', 'A frissítés nem ellenőrizhető. Ellenőrizd az internetkapcsolatot, majd próbáld újra.', 'error');
  } finally { if (!applying) update.disabled = false; }
});
const expectedVersion = sessionStorage.getItem('erp-update-completed');
if (expectedVersion) {
  sessionStorage.removeItem('erp-update-completed');
  if (expectedVersion === APP_VERSION) status('update-status', 'Sikeres frissítés.', 'success');
  else status('update-status', 'A kívánt verzió még nem töltődött be. Válaszd újra a Frissítés gombot.', 'error');
}
document.getElementById('version')!.textContent = 'DÍSZKERTEK · ' + APP_VERSION;
export {};
