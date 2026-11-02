export class SurveyStore {
    opening;
    db() {
        return this.opening ??= new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                reject(Error('A böngésző nem engedi a helyi felmérésmentést.'));
                return;
            }
            const r = indexedDB.open('diszkertek-erp-surveys-v1', 1);
            r.onupgradeneeded = () => { r.result.createObjectStore('surveys', { keyPath: 'key' }); r.result.createObjectStore('media', { keyPath: 'key' }); };
            r.onsuccess = () => { const db = r.result; db.onversionchange = () => { db.close(); this.opening = undefined; }; resolve(db); };
            r.onerror = () => { this.opening = undefined; reject(Error('A helyi tárhely nem nyitható meg.')); };
            r.onblocked = () => reject(Error('Zárd be az ERP másik régi ablakát a helyi tárhely frissítéséhez.'));
        });
    }
    async list(owner) { const db = await this.db(); return new Promise((resolve, reject) => { const r = db.transaction('surveys').objectStore('surveys').getAll(); r.onsuccess = () => resolve(r.result.filter((x) => x.owner === owner)); r.onerror = () => reject(Error('A helyi felmérések nem olvashatók.')); }); }
    async put(row, expected) {
        const db = await this.db();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('surveys', 'readwrite'), store = tx.objectStore('surveys'), r = store.get(row.owner + '/' + row.id);
            let conflict = false;
            r.onsuccess = () => { if ((r.result?.localVersion ?? 0) !== expected) {
                conflict = true;
                tx.abort();
                return;
            } store.put({ ...row, key: row.owner + '/' + row.id, localVersion: expected + 1 }); };
            tx.oncomplete = () => resolve(expected + 1);
            tx.onabort = tx.onerror = () => reject(Error(conflict ? 'Ezt a helyi felmérést másik ablak módosította. Nyisd meg újra; a jelenlegi szöveget előbb másold ki.' : 'A helyi mentés nem sikerült. Ellenőrizd a szabad tárhelyet; ne zárd be az ablakot.'));
        });
    }
    async putMedia(row) { const db = await this.db(); return new Promise((resolve, reject) => { const tx = db.transaction('media', 'readwrite'); tx.objectStore('media').put(row); tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(Error('A melléklet nem menthető helyben. Ellenőrizd a szabad tárhelyet.')); }); }
    async media(owner, id) { const db = await this.db(); return new Promise((resolve, reject) => { const r = db.transaction('media').objectStore('media').get(owner + '/' + id); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(Error('A helyi melléklet nem olvasható.')); }); }
}
