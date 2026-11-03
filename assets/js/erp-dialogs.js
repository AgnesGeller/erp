/** Egységes bezárás: az ablak saját mentésvédelmét is lefuttatja. */
export function requestDialogClose(dialog) {
    if (!dialog.open)
        return true;
    if (!dialog.dispatchEvent(new Event('cancel', { cancelable: true })))
        return false;
    if (dialog.open)
        dialog.close();
    return true;
}
export function addDialogDismiss(dialog) {
    if (dialog.querySelector('[data-erp-dismiss]'))
        return;
    const bar = document.createElement('div');
    bar.className = 'dialog-dismiss-bar';
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'dialog-dismiss';
    x.dataset.erpDismiss = 'true';
    x.textContent = '×';
    x.title = 'Ablak bezárása';
    x.setAttribute('aria-label', 'Ablak bezárása');
    x.addEventListener('click', () => requestDialogClose(dialog));
    bar.append(x);
    dialog.prepend(bar);
}
for (const dialog of Array.from(document.querySelectorAll('dialog')))
    addDialogDismiss(dialog);
const preview = document.getElementById('quote-pdf-dialog');
if (preview && !preview.querySelector('[data-erp-dismiss]')) {
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'dialog-dismiss';
    x.dataset.erpDismiss = 'true';
    x.textContent = '×';
    x.title = 'PDF-előnézet bezárása';
    x.setAttribute('aria-label', 'PDF-előnézet bezárása');
    x.addEventListener('click', () => document.getElementById('quote-pdf-close')?.click());
    preview.prepend(x);
}
