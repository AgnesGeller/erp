# Fejlesztési napló és döntések

## 2026. október 30. – Követelmények és adatbázisterv

### Elvégzett munka

- Az új, klónozott AgnesGeller/erp repository ellenőrzése; a kiinduló állapot tiszta volt.
- A teljes PDF, a kapott kiegészítés és a beszélgetésben rögzített döntések áttekintése.
- A két Supabase-projekt közös ügyféltörzsének, forráskapcsolatainak, jogosultsági határainak célzott, csak olvasási ellenőrzése.
- A csatolt Árajánlat kalkulátor.xlsx négy munkalapjának felmérése; 163 árlistasor, 22 kategória és három sablon ellenőrzése.
- Magyar README, adatbázisterv, kalkulátor-felmérés és magyarázó adatkapcsolati ábra elkészítése.

### Jóváhagyott döntések

| Téma | Döntés |
| --- | --- |
| Cél | A teljes PDF szerinti ERP elkészítése és tesztelése. |
| Technológia | TypeScript már a kezdetektől, HTML5/CSS3; Supabase PostgreSQL és szerveroldali TypeScript. |
| Arculat | Meglévő Díszkertek-logó zöld háttéren, DÍSZKERTEK név, egyeztetett teljes felirat és elérhetőségek. |
| Repository és deployment | Önálló erp repository; deploymentet a megrendelő készíti. Ellenőrzött változások automatikus commitja/pushja engedélyezett. |
| Régi alkalmazások | Csak olvashatók; működésük, meglévő kódjuk és adatbázis-objektumaik nem módosíthatók. |
| Ügyféltörzs | A Munkalapban kialakított közös ügyféllista marad az elsődleges forrás; a külön címeket meg kell őrizni. |
| Kassza és Munkabér | Külön alkalmazások maradnak; ERP-s pénzügyi/bérintegrációjuk nincs. |
| Előfizetés | Új előfizetés nem indítható. |

### Az elhelyezési döntés jóváhagyva

A részletes terv bemutatása után a megrendelő jóváhagyta a kap projekten belüli elkülönített ERP-sémák irányát. Ez még nem végrehajtott migráció: adatbázis-telepítés, ERP-fióklétrehozás, titokbeállítás és forrásírás nem történt.

A terv a meglévő kap projekten belül javasol új ERP-objektumokat; a közös ügyféltörzs a Kassza-projektben marad. A terv teljes részletei és a még hiányzó hozzáférések az adatbazisterv.md végén olvashatók.

### Ellenőrzések és korlátok

- Csak SELECT, szerkezeti lekérdezés, forrásfájl-olvasás és XLSX ZIP/XML-elemzés történt.
- Supabase-adatot, felhasználót, függvényt vagy jogosultságot nem módosítottunk.
- Az eredeti Excel és PDF nem módosult.
- A dokumentáció ellenőrzése nem alkalmazásteszt. Nincs még futtatható frontend és nincs deployment.
- Az első telepíthető frontend elkészültekor külön naplóbejegyzésben kell rögzíteni az indítást, a teszteket, a képernyőképeket és a deployment állapotát.
- A valódi üzleti adatokat és a csatolt fájlokat nem másoltuk a repositoryba.

## Dokumentálási rend a következő változtatásokhoz

Minden fejlesztési bejegyzés tartalmazza: mi változott; miért; melyik PDF-követelményt teljesíti; hogyan ellenőriztük; milyen adatbázishatása van; mi a korlátja; és hogyan folytatható a munka. A tervezett, megvalósított és teszttel igazolt állapotot külön kell megnevezni.

A README a nem fejlesztő olvasónak is érthető belépési pont. A részletes technikai leírás külön dokumentumba kerül, onnan hivatkozva. Képernyőkép csak tényleges működő képernyőről készülhet; az ábrát tervként kell megjelölni, ha még tervezett működést mutat.

## 2026. október 30. - Jóváhagyás és menthető dokumentáció

- Az adatbázis elhelyezési iránya jóváhagyva; új előfizetés nincs.
- Az első saját Iroda jogosultságú ERP-fiók e-mail-címe: info@diszkertek.hu. A fiók még nem létezik.
- A README a main ágon található, és hivatkozik az adatbázistervre, a kalkulátor-felmérésre és erre a naplóra.
- Három menthető PDF készült: adatbázisterv; README ábrával; kalkulátor-felmérés és fejlesztési napló együtt.
- A PDF-előállítás újra futtatható eszköze: tools/render-docs.py. A kimenet az output/pdf könyvtár.
- Az első ERP-fiók címének megadásakor még nem küldtünk meghívót és nem hoztunk létre felhasználót.
- A mostani változtatás kizárólag az ERP-dokumentációt érinti.

## 2026. október 30. – Első alkalmazáskezdőlap, 0.1.0

- Probléma: a Pages index.html hiányában a README-t jelenítette meg. Saját index.html és .nojekyll került a gyökérbe; a dokumentáció külön marad.
- Elkészült a magyar kezdőfelület, a Díszkertek-logó zöld háttéren, favicon, appikonok, megosztási kép és metaadatok.
- A telepítés és frissítés gombjai bejelentkezés nélkül elérhetők, súgóval, folyamat-, siker- és hibajelzéssel. Telepítési sikert csak visszaigazolás után mutatunk.
- A service worker kizárólag saját statikus ERP-fájlokat kezel, saját cache-névtérben. API-válaszhoz és más app gyorsítótárához nem nyúl.
- Ellenőrzés: TypeScript-fordítás; hét célzott automatikus teszt; tényleges böngészős frissítésellenőrzés és telepítési útmutató; 320 és 768 képpontos nézetben nincs vízszintes túllógás. Asztali és mobil képernyőkép készült.
- Korlát: üzleti modulok, ERP-belépés és adatbázis-migráció még nem készültek el. A natív Chrome/Edge és iOS telepítés még külön eszköztesztet igényel.
- Adatbázishatás: nincs. Supabase/Auth-beállítás, régi alkalmazáskód és adat nem változott.
- Pontosítás: a kap Árajánlat friss tesztalkalmazás; az ERP elkészülése után megőrzés és ellenőrzés mellett eltávolítható. Most nem töröltük.
- Fejlesztőkörnyezeti incidens: egy npm-telepítés a bootcamp szülőmappát választotta, és annak korábbi, külön manifest nélküli node_modules állományait ritkította. Az új ERP-függőségeket és a hozzájuk tartozó új manifesteket az ERP-be helyeztük. A korábbi 127 eltávolított csomag pontos verziói nem állíthatók helyre a megmaradt manifestből; ez helyi fejlesztőkörnyezeti korlát, nem éles adatbázis-módosítás. A további parancsok explicit ERP-célmappával futnak.

- Tiszta ERP-telepítés ellenőrizve: npm ci --ignore-scripts, TypeScript-build és mind a hét teszt sikeres. Az önmagára mutató téves csomaghivatkozás eltávolítva a manifestből és a lockfájlból. A GitHub Pages csomagépítése sikeres; az első közzététel a vizsgálat idején waiting állapotban volt, ezért a publikus frissülés még nem igazolt.


## 2026. október 30. – 0.1.1: háttér nélküli webes logó

- A megrendelő kérésére a fejléc és a kezdőfelület az eredeti átlátszó logófájlt használja.
- A favicon és a telepített app ikonja továbbra is zöld hátterű; az ikonfájlok nem módosultak.
- A service worker az átlátszó logót is tárolja az offline megjelenítéshez; a kiadásszám frissült.
- Ellenőrzés: a PNG alfa-csatornája átlátszó, TypeScript-build és célzott PWA-tesztek. Új függőséget nem telepítettünk; adatbázist és más appot nem módosítottunk.


## 2026. október 30. – Letisztult megosztási előnézet

- A sötét hátterű, apró feliratokat tartalmazó megosztási kép helyett világos háttérre nagy, eredeti logó került. A teljes felirat a metaadatokban megmaradt.
- Új képfájlnév, Open Graph méret-, típus- és képleírás, Twitter/X képleírás és kanonikus webcím.
- Ellenőrzés: 1200×630-as PNG, vizuális ellenőrzés és a metaadatok célzott vizsgálata. Új függőség, adatbázis- vagy más alkalmazásmódosítás nincs. A már elküldött üzenetek gyorsítótárát a megosztó platform kezeli.


## 2026. október 30. – 0.1.2: felső menü és telepítés

- A Telepítés és Frissítés a felső, görgetéskor is elérhető menübe került.
- Eszközfüggő telepítési segítség; támogatott böngészőben közvetlen telepítési kérés. Viber esetén külső böngészős megnyitás.
- Ellenőrzés: TypeScript-build, kilenc célzott PWA-teszt; helyi böngészőben működő frissítésellenőrzés, telepítési útmutató és 320/768 képpontos nézet túllógás nélkül. A tényleges natív telepítés ellenőrzése az érintett eszköz/böngésző azonosítása után következik.
- A helyben korábban elkészült menü közzététele elmaradt; most külön frontend-commitban történik. Az adatbázis-fejlesztés függőben lévő fájljait ez a commit nem tartalmazza.


## 2026. október 30. – 0.1.3: telepítési azonosító és verziózott betöltés

- A négy éles app telepítési kódjának összehasonlítása kizárólag olvasással történt. A választott minta a Napi feladatok kifejezett azonosítója és a Munkalap verziózott fájlbetöltése; az ERP TypeScriptből fordított JavaScriptet használ, új keretrendszer vagy függőség nélkül.
- Konkrét hiba: az ERP manifest id=./ értéke az originhez viszonyítva a domain gyökerét jelölte. A korábbi ellenőrzés hibásan a start_url könyvtárához számította. Javítás: állandó id=/erp/, scope=/erp/.
- A 0.1.3 kiadásnál verziózott HTML-indítás, JS, CSS, manifest és service worker. Offline indításnál az ERP saját kezdőlapja töltődik be verzióparaméterrel is.
- A Frissítés sikere a betöltött verzióval ellenőrzött. Elavult kód betöltésekor nincs téves sikerjelzés.
- Ellenőrzés: sikeres TypeScript-build, 14 célzott PWA-teszt, helyi böngészőben 0.1.3 és sikeres frissítésellenőrzés, konzolhiba nélkül.
- A natív Chrome/Edge telepítés végső próbája még nem igazolt. Az azonosítóhiba javítása és a böngésző tényleges telepítési eredménye külön ellenőrzési pont.
- A jelen változtatás kizárólag az ERP fájljait érinti; másik app, node_modules vagy adatbázis nem változott. A korábban megkezdett adatbázis-fejlesztés szünetel.

- Publikus ellenőrzés: a GitHub Pages a6c9eb4 kiadása sikeresen közzétéve. A valódi ERP-webcímen betöltődött a 0.1.3; a Frissítés gomb után újratöltés és zöld pipás Sikeres frissítés jelzés látszott. Konzolhiba nem jelentkezett. A README asztali képernyőképe erre az állapotra frissült.


## 2026. október 30. – 0.1.4: saját irodai belépés és megbízások

- Az ERP saját hét alaptáblája, FORCE RLS védelme, szűk függvénytulajdonosai és az első irodai tagság a jóváhagyott kap környezetbe kerültek. Az info@diszkertek.hu meglévő igazolt Auth-fiókjának jelszava nem változott. Nem küldtünk e-mailt vagy meghívót.
- A felhős session-próba jogosultsági hibát talált: az új NOLOGIN szerepekhez adott auth-sémajog a szolgáltatott környezetben nem érvényesült. Kizárólag az ERP saját segédje és szabályai módosultak: a PostgREST által ellenőrzött JWT-ből történik azonosítás. Az auth séma és a közös Auth-beállítás változatlan.
- Saját erp-gateway Edge Function: belépés, megújítás, helyi kijelentkezés, engedélyezett ERP RPC-k. A szerver nem használ service_role-t, a tényleges JWT-t továbbítja. A frontend nem tartalmaz API-kulcsot, nem ment tartósan hitelesítési adatot. Újratöltés után új belépés szükséges.
- Reszponzív irodai felület: személy felvétele; meglévő ERP-munka kiválasztása; időszakos csoportvezető, kertépítési vezető vagy résztvevő hozzárendelése; naplózott visszavonás revízióval. A személy felvétele nem jelent Auth-fióklétrehozást. Több párhuzamos vezető és munka támogatott.
- A munkatársmentés stabil kérésazonosítóval ismétlésvédett. A budapesti naptári napok inkluzív vége a következő nap kezdetét kizáró adatbázishatárra fordul. A felület véd a kijelentkezés után későn visszaérő kérésektől és a nem mentett adatok véletlen frissítésétől.
- Ellenőrzés: 44 automatikus teszteredmény sikeres; TypeScript-build és külön szigorú gateway-típusellenőrzés; valós gateway 204/401/400/403 hibahatárok. A felhős irodai session és listajogosultság SQL-próbája sikeres. A valós jelszavas böngészős belépés még tulajdonosi ellenőrzésre vár.
- 320/768 képpont körüli belépési nézet: nincs vízszintes túllógás; minimum 48 képpontos menügombok és mezők; üres űrlap natív ellenőrzése; konzolhiba nélkül.
- A kap korábbi public tábláinak jogosultsági/RLS-lenyomata f8295b138e021c7e167107ad44acb9cf; public szabályai 426847824645a85b7ddae5ce32da3372; nem ERP public/quote_private függvényei 620c8527adef1490bf07f0921c70fa4c. A javítások előtt és után azonosak. A régi Edge Functionöket nem változtattuk meg.
- A Supabase kilenc saját authenticated SECURITY DEFINER API-függvényre figyelmeztet; indoklás és a meglévő projektfigyelmeztetések a belépési dokumentumban. Nem állítjuk, hogy minden projektfigyelmeztetés megszűnt.
- Adatállapot: egy szervezet, egy személy, egy fiók; nulla munka, nulla megbízás. Sem KAP/Árajánlat, sem Munkalap/Napi üzleti adatimport nem történt. A négy éles alkalmazás nem módosult. Nincs új függőség vagy csomagtelepítés; a korábban helyreállított szülő node_modules mappához nem nyúltunk.
- README, adatbázisterv és önálló belépési leírás frissítve. A korábbi PDF-ek megőrzött pillanatképek. A helyi egyszeri szerkesztési segéd megmaradt, nincs verziókezelve; fájlt nem töröltünk.

- Publikus ellenőrzés: cf34861 Pages-telepítése sikeres. A valódi webcímen 0.1.4 és az Irodai belépés látható; a felső Frissítés után az új verzió töltődött be, Sikeres frissítés jelzéssel, konzolhiba nélkül. A README képe a tényleges publikus, üres belépési űrlapot mutatja.


## 2026. október 30. – 0.1.5: Ági és Tamás saját ERP-fiókja

- Jóváhagyott irány: az ERP marad a kap infrastruktúrájában, saját sémákban és saját nyilvántartással. A KAP/Árajánlat üzleti adatai és korábbi fiókjai nem felhasználhatók. Más appok csak olvasott technikai minták.
- A Munkalap névválasztás + PIN + saját tárolóban megjegyzett munkamenet mintáját olvastuk. Kódját és adatbázisát nem módosítottuk.
- A megrendelő külön jóváhagyta agi@erp.diszkertek.hu és tamas@erp.diszkertek.hu belső azonosítóit, az egyszeri beállítást, a megjegyzett ERP-munkamenetet, valamint kizárólag a korábbi info@ ERP-tagság inaktiválását.
- A PIN-eket a megrendelő adta meg, Tamás kódját külön javította; csak a végleges kód lett beállítva. A PIN-ek nem kerültek fájlba, forrásba vagy dokumentációba. A közvetlen parancssori átadást az automatikus ellenőrzés elutasította; helyette maszkolt SecureString-bevitel és felhasználóhoz kötött Windows-titkosítás történt.
- Új saját privát irodai nyilvántartás és öt, csak service_role által hívható adminisztratív ERP RPC. A normál üzleti API továbbra is a felhasználó JWT-jét használja. Az egyszeri beállítások már felhasználva, lezárva.
- Sikeres TypeScript-build, szigorú gateway-típusellenőrzés, 73 automatikus teszteredmény. Mindkét valódi ERP-fiók HTTPS-belépése, irodai adatolvasása és helyi kijelentkezése sikeres; a CORS-előkérés helyes.
- A beépített böngésző nem érte el a külső API-t. A tényleges saját eszközös automatikus újranyitás még ellenőrizendő; nem állítunk teljes böngészős belépési sikert ennek helyében.
- A korábbi public jogosultságok, RLS-szabályok, nem ERP függvények és a régi Auth-fiókok állapotlenyomata változatlan. Ügyfél- vagy munkaimport, e-mailküldés, új előfizetés és csomagtelepítés nincs. Fájlt nem töröltünk.


## 2026. november 1. – 0.1.6: tényleges böngészős belépési hiba javítása

- A 0.1.5 kiadás már közzé volt téve; a két új irodai fiók aktív és zárolás nélküli. Új fiók vagy PIN-változtatás nem kellett. A Munkalap belépését és a Supabase kliens fetch-kezelését csak olvasással hasonlítottuk össze.
- Pontos hiba: az API-osztály eltárolta a natív fetch függvényt, majd saját metódusaként hívta. A valódi böngésző az eltérő this-környezet miatt Illegal invocation hibát adott, még a kérés elküldése előtt. A korábbi mock-függvényes tesztek ezt nem modellezték.
- Javítás: requestFetch.call(globalThis, ...) megőrzi a natív böngésző által megkövetelt globális környezetet. Külön regressziós teszt ellenőrzi ezt. Az AbortSignal.timeout helyett AbortController és lezárt időzítő kezeli a határidőt, a JSON-válasz beolvasására is kiterjedően. A hiányzó AbortSignal.timeout miatt korábban elbukó teszt most sikeres.
- Ideiglenes helyi, titokmentes konzoldiagnosztika mutatta meg a tényleges hibát; ez nem maradt a kiadásban. A kijelentkezés törli az előző munkatér visszajelzését is.
- Helyi valódi böngészőpróba: Ági belépése sikeres, újratöltés után automatikusan megnyílt a munkatér; kijelentkezés után Tamás belépése és automatikus újranyitása szintén sikeres. A kijelentkezés visszaadta a név/PIN űrlapot. Üzleti adatot nem rögzítettünk.
- Az előző natív Chrome-vezérlési próbát az eszköz URL-azonosítási védelme leállította. A javítást ezután a forrásból és a működő alkalmazás technikai mintájából végeztük el, majd a beépített böngészőben ténylegesen ellenőriztük.
- Adatbázis, RLS, más appok, meglévő Auth-fiókok és PIN-ek nem módosultak. Nincs csomagtelepítés, új szolgáltatás, törlés vagy előfizetés. A magyar README és a belépési leírás frissült.
