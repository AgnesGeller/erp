# Telepítés és frissítés – a működő alkalmazások összehasonlítása

Dátum: 2026. október 30. Kizárólag a helyi forrásfájlok olvasása történt. A Napi feladatok, Munkalap, Kassza és Munkabér alkalmazás nem módosult.

| Alkalmazás | Felület és telepítés | Átvehető megoldás |
| --- | --- | --- |
| Napi feladatok | HTML, CSS, JavaScript; manifest, sw.js, beforeinstallprompt és appinstalled | Egyértelmű /napi/ alkalmazásazonosító; natív telepítő kezelése és elérhetőségének követése. |
| Munkalap | HTML, CSS, JavaScript; verziózott fájlok és service-worker.js | Verzióparaméteres statikus fájlok és indítás; külön telefonos/számítógépes telepítési segítség. |
| Kassza | HTML, CSS, JavaScript; natív telepítő és telepítési súgó | Bejelentkezéstől független gombok; frissítés saját gyorsítótárnévvel. |
| Munkabér | HTML, CSS, JavaScript; manifest és service-worker.js | Egyszerű PWA-felépítés, külön keretrendszer nélkül. |

## Az ERP-ben feltárt hiba

Az ERP manifestjében az id értéke ./ volt. A manifest szabványa ezt a start_url **originjéhez**, nem annak könyvtárához viszonyítja. Így a korábbi érték https://agnesgeller.github.io/ azonosítót jelentett; nem https://agnesgeller.github.io/erp/ értéket. A korábbi ellenőrzés hibás URL-feloldást használt.

Javítás: az ERP id és scope értéke /erp/. Az azonosító állandó, verziót nem tartalmaz. Az indítás és a statikus fájlok verzióparamétert kapnak. A más alkalmazással való azonosítóütközés lehetőségét ez megszünteti az ERP oldalán, más app módosítása nélkül.

Az automatikus teszt a szabvány szerinti originhez viszonyított feloldást ellenőrzi, így a korábbi hiba ismételt bevezetését is észleli.

## Megőrzött biztonsági határok

- Az ERP kizárólag a diszkertek-erp- nevű saját gyorsítótárait takarítja.
- Más alkalmazás service workerét nem törli és nem regisztrálja át.
- A saját verziózott indítóoldal internet nélkül is betölthető a sikeres első betöltés után.
- API-adat és a frissítést ellenőrző version.json nem kerül offline gyorsítótárba.
- Telepítési siker csak böngészői visszaigazoláskor; frissítési siker csak a kért verzió tényleges betöltésekor jelenhet meg.
- A helyi forrásvizsgálat és az eseményszimuláció nem egyenértékű a valódi eszközön befejezett telepítés próbájával.

## Helyi előnézet

A python tools/preview.py paranccsal az ERP a http://127.0.0.1:5194/erp/ címen nyílik meg. A kiszolgáló a valódi GitHub Pages /erp/ útvonalát követi; más projektek mappáit nem szolgálja ki. Leállítás: Ctrl+C.

## Elsődleges dokumentáció

- [MDN: a manifest id feloldása](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/id)
- [Chrome: PWA-azonosítók](https://developer.chrome.com/docs/capabilities/pwa-manifest-id)
