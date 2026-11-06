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

- Közzététel: 7942c55 commit/push a main ágra, sikeres Pages-telepítés, publikus verzió 0.1.6. Az éles webcímen mindkét irodai fiók belépése, automatikus újranyitása és kijelentkezése sikeres; a felső Frissítés újratöltött 0.1.6-ra, sikeres frissítés és automatikus belépés jelzéssel. Konzolhiba nincs. A teljes készlet 75 eredménye sikeres. A README nyilvános belépési képe frissült. A belépett munkatér képének publikálását az automatikus ellenőrzés elutasította; az a nyilvános repositoryba nem került. A tesztböngészőből kijelentkeztünk.

## 2026. november 1. – 0.1.7: nagy D betűs ERP-ikon

- A felhasználó jelezte: a régi KM telepítését ő eltávolította, ezután az ERP telepítése sikerült. A fejlesztés nem törölt és nem módosított más alkalmazást.
- A Munkalap Díszkertek M betűs ikonját és telepítési kódját csak olvastuk. Az ERP új ikonja a kért egyszerű zöld négyzet, nagy középre helyezett fehér D betűvel, díszítés nélkül.
- Új, verziózott PNG-fájlok: 32 px favicon, 180 px Apple-ikon, 192 és 512 px PWA-ikon. A korábbi képfájlok megmaradtak. A manifest, HTML és saját service worker hivatkozásai frissültek; id és scope továbbra is /erp/.
- A reprodukálható, kizárólag saját ERP-ikonokat előállító tools/generate-app-icons.py meglévő Pillow-t és Windows Arial Bold betűkészletet használ. Nincs csomagtelepítés, adatbázis-változtatás vagy új szolgáltatás.
- A 0.1.7 kiadás verzióhivatkozásai összhangban vannak. Sikeres TypeScript-build, 14 sikeres célzott PWA-teszt és vizuálisan ellenőrzött ikon. A már telepített Chrome/Windows-ikon frissítése még nem igazolt; ezt a böngésző külön kezeli.
- A magyar README az új ikont, az előállítást, a frissítés módját és a tényleges ellenőrzési korlátot is tartalmazza.
## 2026. november 1. – 0.1.8: Munkalap-alapú ügyfélnyilvántartás

- A PDF 6. fejezetének és a kiegészítés ügyféltörzs-előírásának feldolgozása. A megrendelő pontosította: a Munkalap az elsődleges közös lista, az ERP-ben felvett új ügyfél és cím oda is bekerülhet. Erre külön kifejezett engedély érkezett; meglévő forrásadat módosítása, törlése és más app fejlesztése továbbra is tilos.
- A forrás ügyfél-, cím-, ügyfélrészlet- és kapcsolattartótábláit olvastuk. 155 ügyfél: 152 nem archivált, 3 archivált; 157 cím, 25 nem archivált ügyfél cím nélkül. A 204-es darabszám nem igazolódott. Az ERP minden forrásügyfélhez saját személy-megfeleltetést tart fenn; nincs név szerinti automatikus összevonás.
- Új saját táblák: erp.customer_profiles és erp_private.customer_requests, mindkettő FORCE RLS-sel. A 2026. november 1-jei erp_customer_registry migráció a kap projektben kizárólag ERP-objektumokat érint. A normál irodai függvények a meglévő, RLS-t meg nem kerülő erp_api szerepet használják; a forrásból származó megfeleltetés és a befejezés visszaigazolása csak szerveroldali admin RPC.
- A saját erp-gateway olvassa a közös forrást. Új ügyfélhez három INSERT megengedett, nincs PATCH/PUT/DELETE vagy frissítő upsert. A szerver egyszer osztja ki az ügyfél/cím UUID-ját; az újrapróbálás ugyanezt folytatja. Részleges hálózati hiba nem válhat néma sikerjelzéssé. A közös kulcs szerveroldali, technikailag tágabb jogosultsága dokumentált korlát; forrásjogosultságot nem módosítottunk.
- Személyek menü: két karaktertől, ékezet- és kisbetű/nagybetű-független automatikus lenyíló névkereső, magyar ABC-sorrenddel. Cím/telefon/e-mail külön keresési beállítás. Az ügyféladatlap, a címek, kapcsolattartók, megjegyzések és új ügyfél mezőcsoportjai lenyithatók; nincs végig nyitott nagy űrlap.
- A munkatársak és a megbízási munkatársválasztó ABC-sorrendű lenyíló. A megadott kilencfős névsor rögzítve az ERP-ben; Ági, Márk és Tamás meglévő rekordja megmaradt, hat további megadott személy került be. A visszavont két név nem lett létrehozva. Új Auth-fiók vagy meghívó nem készült. Az erp_staff_active_directory migráció kizárólag a saját munkatárslista szűrését pontosítja; az inaktív történeti irodafiók nem választható dolgozóként, adata megmarad.
- A munkatárs-függvény felhős telepítése először tulajdonosi jogosultság miatt meghiúsult; az ERP meglévő migrációs mintájával, tranzakcióra korlátozott szereptagsággal sikerült. Ez nem forrásjogosultság-módosítás.
- Böngészős próba: tényleges ERP-belépés és automatikus újranyitás, 152 alapértelmezetten látható ügyfél, adatlapok, lapozás és keresés. Mobilon 390 px nézetnél nincs vízszintes kilógás. A valódi próba feltárta a gyors keresésváltás frissítési versenyét és a mezőneveket is kereső hibát; javítás és célzott regressziós tesztek készültek.
- 95 sikeres automatikus teszteredmény. A teljes készlet után a végső keresőpontosítás célzott tesztjei is sikeresek. Forrásoldali éles próbaügyfelet nem hoztunk létre; a forrás továbbra is 155 ügyfél. A Munkalap sémahozzáférési/RLS-lenyomata előtte és utána 7347566ce1df5b50923c561436ce8fea.
- A saját ERP a forrásnevekhez személyeket kapcsol, de a munkatársválasztót nem tölti fel az ügyfelekkel. A részletes közös adatok élő forrásolvasással érkeznek; az ERP-s számlázási kiegészítés és belső megjegyzés külön, verzióellenőrzött.
- README, adatbázisterv és önálló használati/biztonsági leírás frissítve. Ügyféladat, belépési adat és belső munkatérkép nem kerül a nyilvános repositoryba. A régi rendszerek saját frissítési mechanizmusa változatlan; azonnali, minden régi képernyőre kiterjedő frissítést nem állítunk.
- Éles közzététel: 3405c9e main commit/push, sikeres Pages-telepítés; a publikus verzió 0.1.8. Az éles oldalon saját belépés, 155 teljes ügyfél / 3 archivált összesítő, ékezet nélküli „maria” keresés 5 találattal, egy karakterre rejtett találati lista és 390 px mobilnézet kilógás nélkül ellenőrizve. A kilenc munkatárs ABC-sorrendű választója is igazolt. Konzolhiba nem látható. A felhasználó az éles böngészős nézetet használja; ezt nyitva hagytuk, privát ellenőrző kép nem kerül a repositoryba.
- A felhasználó utólag kérte a Kassza és a Napi feladatok ügyfélszámának összevetését. Csak a technikai forrást, meglévő szűréseket és összesített darabszámokat olvastuk. Közös törzs 155; Munkalap/ERP alapnézet 152; Kassza 152; Napi 149 jóváhagyott ügyfél. Három aktív, nem archivált ügyfél még nem jóváhagyott; az állapotokat nem módosítottuk. Napi: 116 jóváhagyott címsor és 46 jóváhagyott ügyfél megfelelő cím nélkül, a választó sorai további normalizáláson esnek át.
- Az egyedi függő ügyfélnevek további lekérését az automatikus ellenőrzés elutasította, mert a külön Kassza-ellenőrzés darabszámokra és technikai működésre szólt. Ezt nem kerültük meg; az igényelt összevetés összesített adatokkal elkészült. Egyedi ügyfélnevek nem kerültek a dokumentációba.
- Új külön kérdés: a munkánkénti szerepkörök megnevezése Csoportvezető, Projektvezető, Kertépítő, Kertkarbantartó legyen. A két vezető jogosultságának különbsége tisztázásra vár; kérdéskor a kért rendszerhangot kiadtuk. Ez még nem változtatja meg az éles jogosultsági modellt.
## 2026. november 1. – 0.1.9: PDF szerinti munkaszerepek

- A megrendelő kérésére újra kikerestük a PDF 4. oldali szerepköreit és a 9. oldali négyszintű átvételt. A külön Projektvezető nem szerepel bennük. A kiegészítés 4. pontja Építésvezető és Karbantartásvezető névre bontja a Csoportvezető munkaterületeit. A megrendelő ezután kifejezetten a dokumentumok szerinti megoldást kérte; az önálló, magasabb Projektvezető irányt ezzel lezárta.
- Új saját ERP-migráció: erp_pdf_work_roles. Két munkatípus, négy aktuális szerep, adatbázistriggerrel is ellenőrzött vezetői munkaterület. Csak az iroda oszthat szerepet; a Kertépítő/Kertész teljes operatív jogosultsága azonos. Több szerep és több vezető változatlanul lehetséges.
- A saját szerveroldali erp_project_role_access a hitelesített személyből, szervezeti tagságból, munkából és érvényes megbízásból számítja az engedélyeket. Nem ad a vezetőnek irodai szerepkiosztást, belső pénzügyet vagy törzsárszerkesztést. A teljes átvételi/pénzügyi modulok elkészültségét nem állítjuk.
- A lenyíló a helytelen munkaterületű vezetőt tiltja; munka nélkül a négy szerep látható, de mentés nem indítható. Az Új megbízás külön összecsukható rész. A korábbi megbízási értékek történeti megőrzése biztosított, új általános crew_lead/worker kiosztás tiltott.
- Telepítéskor nulla ERP-munka és nulla megbízás volt. Nem készült éles próbamunka vagy megbízás; meglévő munkát nem módosítottunk. A négy régi alkalmazás, a forrásügyfelek és az Auth-fiókok érintetlenek.
- Sikeres build és gateway-típusellenőrzés, 106 sikeres teszteredmény. Külön teszt: munkaterületi korlát közvetlen adatbázisírásnál, két dolgozói szerep engedélyegyezősége, több vezető, szervezeti elkülönítés, visszavonás és jövőbeli megbízás. README és részletes szerepkörleírás frissült.
## 2026. november 1. – 0.2.0: címhez kapcsolódó ERP-munkák

- Kifejezett megrendelői kérés: a PDF szerinti munkalétrehozás konkrét munkavégzési címhez, kizárólag az ERP-ben, magyar README-vel, commit/push engedéllyel.
- A PDF 12. pontjának kertépítési ajánlat-elfogadási és külön indítási kapuja megmarad. Az ajánlatmodul hiányában csak előkészítés rögzíthető; ebből nem lesz automatikus futó építés. A 18. pont szerint a karbantartási igény irodai jóváhagyással, külön munkanappal véglegesíthető.
- Az implementáció előtt az ERP garden_projects táblája üres volt. Új ERP-címtükör, eredeti ügyfél/cím UUID-k, összetett idegen kulcs, megváltoztathatatlan munkakötés és történeti címpillanatkép készült. A migráció nem engedi ellenőrizetlen meglévő munkák megfeleltetését.
- A forrás címadatai ehhez kizárólag olvashatók. Új munka, állapot és megbízás csak az ERP-ben íródik. KAP/Árajánlat-tesztadat, régi alkalmazáskód, jogosultság, Auth és forrásadat nem változik. Új csomagtelepítés nincs.
- Tömör, lenyíló munkalista, ügyféladatlapról indított címválasztás, opcionális kért nap/létszám/óraszám, karbantartási jóváhagyás, megerősített igényvisszavonás, ékezetfüggetlen munkakeresés. Megszakadt mentés azonos UUID-val folytatható; űrlapelhagyás és frissítés védett.
- A helyi adatbázisteszt még telepítés előtt feltárta a SELECT FOR SHARE szükségtelen táblaírási jogigényét; a felesleges sorzárat eltávolítottuk, nem bővítettük a jogosultságot. A kétperces ellenőrzési korlát és az ügyfél/cím-kötés megmarad.
- A teljes ellenőrzés 124 sikeres teszteredménnyel zárult; frontend-build és gateway-típusellenőrzés sikeres. Az erp_site_bound_works migráció és a saját gateway 9. verziója települt. Élő ellenőrzés: munkák száma 0, címtükör FORCE RLS, anonim létrehozás és böngészős címszinkron tiltott, cím nélküli korábbi létrehozás tiltott, erp_api nem kerüli meg az RLS-t.
- Éles böngészős ellenőrzés: 0.2.0 frissítés és sikeres automatikus belépés; a Munkák menü listája betöltődik, az ügyféladatlapról a megfelelő két külön cím választható. Több címnél nincs automatikus címválasztás. Üres kötelező mezők, lenyíló opcionális adatok és 390 px mobilnézet ellenőrizve, vízszintes kilógás és konzolhiba nélkül. Éles próbamunkát nem mentettünk. Az ellenőrző kép csak a privát munkaterületen marad, ügyféladat nem kerül a publikus repositoryba.
- Közzététel: ad78093 main commit/push, GitHub Pages completed/success, publikus verzió 0.2.0. Az új címtükör létrehozása nem írt a közös forrásadatokba. A normál böngészős használat saját ERP-munka- és igényadatokat rögzíthet.

## 2026. november 1. – 0.3.0: árajánlatmodul, helyben elkészítve

- Kifejezett kérés: PDF és csatolt Excel szerinti ajánlatmodul, kizárólag az ERP-ben, magyar README-vel, ellenőrzés után commit/push engedéllyel.
- A forrás-PDF 8–12. pontját és az eredeti XLSX celláit/képleteit újra olvastuk. Az Excel változatlan; 163 árazott típus, 22 kategória, három sablon. 163/163 alapképlet-összevetés sikeres. Az árak csak a kizárt helyi köztes fájlban vannak, nem a publikus forrásban.
- Irodai árajánlat-szerkesztő: ügyfél/cím, főtételek, sablonok, árlistás és egyedi sorok, élő számítás, minimumok, paraméteres és korlátozott egyedi képletek, anyagjegyzék, ráhagyás/csomag/fuvar, belső anyaglista-export, tervezési óradíj, automatikus piszkozatmentés és revízióvédelem.
- Árlista- és sablonkezelő, ismert XLSX-szerkezet feltöltése és ellenőrzött véglegesítése. Járda öt sorát a megrendelő az ERP-ben pontosítja; nincs találomra árazás.
- Valódi A4 PDF Kompakt/Normál nézettel, magyar ékezetes szabad licencű Noto Sans betűvel, ismételt táblázatfejléccel, főösszesítő/információk/részletezés sorrenddel. Belső információ és beszerzési adat külön engedélylistás vetülettel kizárva. 18 soros szintetikus ajánlat kétoldalas PDF-je vizuálisan is ellenőrizve; készpénzátvétel/aláírás blokk nincs.
- A Munkalap levélküldési technikáját csak olvastuk: az aktivált FormSubmit az irodai címre küld, nem az info@ postafiók SMTP-konfigurációja. A megrendelő ezután kifejezetten kézi levélküldést kért. Az ERP PDF-letöltést, mailto-előkészítést és külön, ismétlésvédett irodai kiküldési tényrögzítést ad; SMTP-t nem kapcsol be.
- Elfogadott ajánlatból indításra váró saját kertépítés, külön irodai indítási kapu; az elfogadott ajánlat nem szerkeszthető át. A helyi adatbázispróbák igazolták az ügyfél/cím kötést, verziókat, más szervezet/dolgozó tiltását, ismétlésvédelmet, indítás előtti megbízástiltást és az elfogadás utáni külön indítást.
- Teljes regressziós ellenőrzés az új célzott kiegészítésekkel 151 sikeres teszteredmény; frontend-build és gateway üzleti kódjának típusellenőrzése sikeres. Az új motor közös forrásból kerül a frontendbe és a gateway-be. A meglévő node_modules és más projektek érintetlenek; nincs npm-telepítés.
- Az erp_quotes_catalog_and_versions felhős migrációt az automatikus jóváhagyási ellenőrzés elutasította: az általános fejlesztési engedély nem bizonyította e konkrét éles adatbázismódosítás jóváhagyását. A migráció nem futott le; más végrehajtási utat nem próbálunk helyette. Konkrét élesítési terv készült. Gateway-frissítés, éles árlistabetöltés és 0.3.0 frontend-push még nem történt.
- Éles kitalált ügyfél/ajánlat/munka nem készült. A felületpróbához .local alatti, csak loopbacken futó olvasó kiszolgáló készült, elkülönített szintetikus ügyféllel, külső adatkapcsolat és tartós mentés nélkül. A 5194-es korábbi előnézettel való portütközés miatt a saját próbát 5217-re helyeztük; más folyamatot nem állítottunk le.

- A konkrét élesítési kérdésre a megrendelő kifejezetten igent mondott. Ezután a korábban elutasított migráció sikeresen lefutott; a 163/22/3 árlista forráslenyomattal visszaellenőrizve, saját gateway 10. verzió aktív. A napló saját olvasó RPC-je az irodai szerző nevét is megjeleníti. A korábbi elutasítást nem kerültük meg.
- A helyi böngészős teszt igazolta az ügyféladatlapról induló ajánlatot, a hat soros füvesítési sablont és a járdasablon öt pontosítandó sorát. A tényleges XLSX-feltöltés az XML-ben tárolt lebegőpontos anyagszorzó miatt túl finom tizedesformátumot jelzett; az import csak a numerikus tárolási zajt normalizálja, valódi hat tizedesnél finomabb értéket nem kerekít el hallgatólagosan.
- A megrendelő 8% maradék kreditnél kifejezetten azonnali push-t kért. A tesztelt változatot lezárjuk, a README és használati/élesítési leírás elkészült; újabb modulba ebben a lépésben nem kezdünk.

## 2026. november 2. – 0.3.0 éles ellenőrzés lezárása

- A 1739729 main commit felkerült; a GitHub Pages közzététel sikeres, az éles felület 0.3.0. A saját gateway legutóbbi telepített változata 11.
- Éles böngészős próba: saját automatikus belépés, üres ajánlatlista, védett árlista 163/22/3 adatszámmal, többcímes ügyfélhez külön címválasztás. Mentés nélkül összeállított egyedi ajánlatból az éles kiszolgáló valódi, magyar ékezetes PDF-et állított elő; a fájl letöltését, számítását és megjelenését is ellenőriztük.
- Az eredeti Excel beolvasása a korábbi numerikus tárolási zaj javítása után böngészőben is sikeres. Csak import-előkészítés történt, új árlistaváltozat mentése nem. A kizárólag ellenőrzéshez létrehozott nem mentett ajánlatot és import-előkészítést bezártuk.
- 390 px mobilnézet vízszintes kilógás nélkül. Teljes regresszió ismét 151 sikeres eredmény. Az ellenőrzés végén a böngésző konzolhibát és figyelmeztetést nem jelzett.
- A megrendelő pontosítása: a járdasablon öt nyitott sorát a főnök ajánlatkészítéskor választja ki. A README és a használati útmutató ezt rögzíti; a korábbi 0.2.0 állapotleírást és az elavult, jövő idejű árlistabetöltési szöveget javítottuk.
- Alkalmazáskód-, adatbázis-, Auth- és más alkalmazást érintő változtatás nem kellett. Próbaajánlat, próbamunka, új árlistaváltozat vagy kiküldési tény nem mentődött. A valódi kiküldés/elfogadás/indítás üzleti ellenőrzése az első tényleges ajánlatnál következik. Új modul fejlesztését ez az ellenőrzés nem indította el.

## 2026. november 2. – rövid README

A megrendelő kérésére a README rövid áttekintésre, használati hivatkozásokra és fejlesztési parancsokra szűkült. A teljes korábbi szöveg a [részletes projektleírásban](reszletes-projektleiras.md) megmaradt, a relatív hivatkozások az új helyhez igazítva. Alkalmazáskód vagy adatbázis nem változott. Ellenőrzés: helyi dokumentum- és képhivatkozások, Git-diff; build és üzleti teszt ismétlése nem szükséges.

## 2026. november 2. – 0.4.0: felmérések, helyi fájlok és Groq-előkészítés

- A PDF 7. pontja alapján új, tömör kézi felmérés készült: ügyfél/cím, ügyfél elképzelései, ismételhető és rendezhető főtételek, opcionális méretek, eredeti jegyzet, fotó és hang. Ár és kategória nem kötelező.
- A megrendelő elutasította a nagy fájlok Supabase-tárolását. A kezdeti, még nem telepített médiatáblát és feltöltési tervet ehhez igazítottuk: fotó és hang csak saját helyi IndexedDB-ben, külön letöltéssel és teljes ZIP-csomaggal; eszközök között fájlimport. A helyi és szerveres sikerjelzés különbözik. Másik fiókhoz késői adat nem jelenhet meg.
- Külön, kifejezett jóváhagyás érkezett két új ERP-táblára: csak felmérés és szöveges előzmény, kis fájlmetaadatokkal. Nincs új Storage-bucket. Az erp_local_media_surveys és erp_survey_read_access migráció települt. A saját gateway 12., az új erp-survey-ai 2. változata aktív. A régi appok és Auth változatlan.
- Az első migráció SET ROLE-joghiány miatt visszagördült. Kiderült: az ERP-szerep meglévő supabase_admin-féle tagsága admin=true, inherit=false, set=false. Az új telepítés külön, ideiglenes postgres-grantorral dolgozik, azt visszavonja; az eredeti tagság megmarad. Az új olvasófüggvények ACL-jét saját tulajdonosi szerepben állítottuk be. Éles visszamérés: anonim olvasás false, böngészős közvetlen írás false, éles felmérés 0.
- A megrendelő a Groq ingyenes csomag kipróbálását választotta. Magyar befejezett-hang átírás és külön, ember által ellenőrzött jegyzetrendezési javaslat készült. Az eredeti hang és kézi jegyzet megmarad. Saját ERP_GROQ_API_KEY nélkül nincs valódi hívás és nincs működést színlelő MI-gomb. Fizetős csomagra automatikus váltás nincs. A saját kulcs beállítása a tulajdonos következő teendője; kulcsot nem kérünk üzenetben.
- Kézi ajánlatátadás: szinkron után önálló ajánlati piszkozat, másolt főtételek/méretek/belső jegyzet/fájlkapcsolat és eredeti felmérés-verzió. Ár nem keletkezik találgatásból.
- 173 sikeres teszt, frontend-fordítás és kiszolgálói típusellenőrzés. Az elkülönített böngészős próba igazolta a szöveg és fotó helyi megmaradását újranyitás után és az ajánlatba átadást. Nem használt éles ügyfelet vagy valódi külső MI-t. A böngésző fájlkezelési automatizálása több alkalommal hosszú várakozást okozott; ezt nem az alkalmazás sikerjelzésének tekintettük.
- A README rövid marad; a használat, telepítés, titokbeállítás, tesztek és tényleges korlátok a felmeresek.md dokumentumban vannak. Teljesen bezárt alkalmazás offline belépése, folyamatos élő átirat és automatikus, árlistához illesztett MI-ajánlat még hátravan. Ezeket nem jelöltük késznek.

## 2026. november 2. – 0.4.1: fókuszváltás és menükattintás

Az éles böngészős ellenőrzésben az ismétlődő fókuszváltás teljes munkatérfrissítést indított, amely a betöltés idejére megfoghatta a Felmérések menügombot. A fókusz által kért frissítés most legalább 30 másodperces időközt tart; a kézi frissítés nem korlátozott. Két új, a tényleges eseménykezelőt futtató teszt ellenőrzi a gyors ismétlést és a folyamatban levő felmérés védelmét. Összesen 175 sikeres teszteredmény. A 473f641 alapkiadás push és Pages-közzététel kész, a célzott javítás külön commitban követi. A README 43 soros marad.

## 2026. november 2. – átadás előtti megállás

A 8a3a052 commit GitHub Pages-közzététele sikeres, a publikus verzió 0.4.1. A saját irodai automatikus belépés és az új Felmérések menüpont megjelenése élesben látható. A menü megnyitásának utolsó UI-próbája nem zárult le: az automatizált kattintás nem váltott nézetet, ezért nem állítjuk, hogy a fókuszkorlát ezt élesben bizonyítottan megoldotta. Az elkülönített helyi próba korábbi megerősítése is felmerült lehetséges akadályként, de ezt nem bizonyítottuk. Az automatikus jóváhagyási ellenőrzés a tesztlap feltételes megerősítés-elfogadását nem engedte nem mentett adat elvesztésének kockázata miatt; az elutasított műveletet nem hajtottuk végre és nem kerültük meg. A felhasználó távollétében kérdésnél megállást kért. Következő alkalom: a kizárólag szintetikus helyi tesztlap állapotának biztonságos rendezése, az éles menüpróba lezárása, majd a saját ERP_GROQ_API_KEY beállítása és valódi magyar MI-próba. Kulcs vagy új fizetős szolgáltatás nem lett beállítva.

## 2026. november 2. – 0.5.0: ajánlati javítások és PDF-követelményaudit

- Legfeljebb két tizedes a megjelenítésben, pontos belső anyagszorzók és számítás megtartásával.
- Mindig elérhető tételtörlés, ajánlati és árlista-/sablonszerkesztési Visszavonás/Újra; az elfogadott pénzügyi pillanatkép védett marad.
- Nyitva tartható, szerkesztés után frissülő PDF-panel; későn érkező válaszok eldobása, hibavisszajelzés; hiányos, egyértelműen jelölt munkaváltozat hamis nulla összegek nélkül.
- ÁFA-vetítési alap, ÁFA/bruttó kiemelése, név szerinti főtétel-részösszeg; teljes sorok együtt tartása az oldaltörésnél, ha elférnek.
- Választható kézi levelező, másolás, PDF-mellékletes EML; automatikus küldés nincs.
- Külön specifikációs állapotlista készült: a teljes ERP nem kész, az ügyfélportál és kivitelezési folyamat még hátravan. README rövid maradt.
- Új adatbázis-, Auth- vagy jogosultságmódosítás nincs; másik alkalmazás nem változott.

Ellenőrzés: 188 regressziós teszt, TypeScript- és gateway-típusellenőrzés, 163/163 Excel-paritás, Kompakt/Normál/hiányos PDF helyi előállítása és képi ellenőrzése. Elkülönített felületpróba: becsukott sorból törlés → Visszavonás; szerkesztés nyitott PDF-panel mellett; hibás/késői PDF-válasz tesztelve. Az új EML valódi levelezővel végzett megnyitási próbája és az ügyfélportál még hátravan. Saját gateway: v13 ACTIVE, séma-/Auth-változtatás nélkül.

## 2026. november 2. – 0.6.0: saját ügyfélbelépés és munkakövetés

- Az iroda pipával jelöli ki az egy fiókhoz tartozó címeket; több külön forrásrekord is tudatosan ugyanahhoz a fiókhoz rendelhető. Nincs automatikus név szerinti összevonás és nincs közös forrásadat-írás.
- Saját, külön ERP-technikai Auth-azonosítók; a felületen valódi e-mail és saját jelszó. A korábbi alkalmazások fiókjai/jelszavai nem kerülnek át.
- Felhasználói jóváhagyás: az iroda kézzel küldi a lejáró, egyszer használható meghívó- és visszaállító hivatkozásokat; az ügyfél maga állítja be jelszavát. Nincs új SMTP vagy fizetős szolgáltatás. Irodai gomb jelzi a visszaállítási kéréseket.
- Öt saját ERP-tábla FORCE RLS-sel; minden új admin RPC anon/authenticated számára tiltott, csak szerver hívhatja. Az eredeti két saját azonosítási függvény tulajdonosa megmaradt; az ideiglenes ERP-szerep-/CREATE-jogokat visszaállítottuk.
- Ügyfélhez kötött saját munkamenet: jelszócsere kezdetekor minden régi ügyfélmunkamenet visszavonva, kijelentkezéskor csak az adott eszközé. A visszavont munkamenet régi/frissített JWT-vel sem kap új ERP-hozzáférést.
- Saját címek, tényleges kertépítés/karbantartás-állapot, egyeztetett nap, legutóbb kiküldött ajánlat és PDF. A készülő irodai revízió, belső beszerzés, Hasznos információk, jutalék és más ügyfél adata nem kerül az ügyfélhez. Frissítés percenként; nyitott lenyílók megmaradnak.
- Helyi szintetikus adatbázis- és felületpróbák; asztali és 390 px mobilnézet; korábbi belépés visszaállítása és a beállító token címsorból eltávolítása ellenőrizve. Valódi ügyfél-/Auth-próbarekord nem készült.
- 212 regressziós teszt, TypeScript- és edge-típusellenőrzés. Telepített saját gateway: v15 ACTIVE. Éles adatbázisban irodai jogosultság ellenőrizve; új ügyfél-RPC-k és saját táblák közvetlen olvasása/írása tiltott. Az új objektumok advisor-jelzése csak három INFO szintű, szándékosan policy nélküli, alapból tiltott szerveroldali tábla; új saját WARN nincs.
- Az első valódi meghívó, jelszóbeállítás és ügyfél-PDF közös éles átvételi próbája az iroda/ügyfél feladata. A részletes munkaterv, négyszintű átvétel, nyolc bejegyzéstípus és pénzügy még megvalósítandó, nem jelentjük késznek. README rövid maradt.

## 2026. november 2. – mentési pont: munkaterv és négyszintű átvétel

A felhasználó jóváhagyta a tíz saját ERP-táblát, a dolgozói saját belépést és a tesztek utáni élesítést. A pontos számítási/átvételi modell, a dolgozói adatbázisalap és a munkaterv tranzakciós végpontjai helyben elkészültek. Sikeres: 13 modellteszt, 6 dolgozói adatbázisteszt, 10 munkaterv-adatbázisteszt. A Napi személyszíneit csak olvastuk. Új éles adatbázis- vagy Auth-módosítás nincs, az élő rendszer 0.6.0 marad. A felület, fotócsomagok, teljes kiszolgáló-bekötés és végső regresszió még hátravan. A 10%-os kreditjelzés miatt mentési commit/push készül; részletek: [folytatási pont](munkaterv-folytatasi-pont.md).

## 2026. november 3. – 0.6.1, számok megjelenítése

- A PDF 14–15. fejezete és a munkaterv folytatási pontja újra ellenőrizve. A következő nagy egység a részletes munkaterv és négyszintű átvétel befejezése.
- Az ajánlati és PDF-formázó már elhagyta a záró tizedesnullákat; a felmérési méretmezők is ezt használják. Fókuszban az eredeti pontos érték szerkeszthető, puszta megtekintés nem módosít mentett adatot.
- A megjelenítéshez célzott regressziós próbák; a belső szorzók, számítás, adatbázis és jogosultságok változatlanok.
- Ellenőrzés: 36 célzott teszt, sikeres TypeScript-build és típusellenőrzés; helyi böngészőben 10 / 12,5 / 1,24, szerkesztéskor megőrzött 1.2357.

## 2026. november 3. – 0.7.0, munkaterv és négyszintű átvétel

- Jóváhagyott tíz új ERP-tábla; saját dolgozói belépés meglévő személyhez, kézi meghívó/visszaállítás. Az irodai PIN és az ügyfélbelépés változatlan. Kiemelt visszalépési gomb az irodai belépéshez.
- Elfogadott ajánlatból védett fázisok; húzás/mobil rendezés, előfeltételek, dátumos idővonal, eredeti időkeret, helyi Undo/Redo és történeti terv új változatként.
- Négy tényleges átvétel, súlyozott személyszínes sávok, 100%-os megosztás és zárolás; visszaküldési kör, értesítés és statisztika. A tényleges pipák és a magasabb átvételből számított teljesítés külön marad.
- Fotó helyben, SHA-256 ellenőrzőadattal; szűrt ZIP-átvitel, hiányzó képek jelzése, import felülírás nélkül. Bizonytalan mentés személyhez kötött helyi újrapróbálással, stabil kérésazonosítóval.
- Saját éles azonosítás és gateway helyi mentése, visszagörgetett telepítési próba, jóváhagyott ERP-migráció és gateway v17. Tulajdonosok/jogok/eredeti tagságok visszaellenőrizve; új éles tesztfiók és tesztmunka nem készült.
- 271 sikeres helyi teszt; TypeScript/edge ellenőrzés; asztali/mobil szintetikus böngészőpróba. A mobilos rejtett azonosítómező kilógása javítva. Éles office ERP-hozzáférés megmaradt, nyilvános munkaterv-hozzáférés tiltott. Biztonsági advisor: az új ERP-objektumoknál nincs WARN/ERROR; INFO default-deny RLS jelzések a service-only tábláknál. Az új táblák kapcsolati indexei kiegészítve.
- Napi feladatok: csak név/azonosító/szín olvasás, nyolc egyértelmű megfeleltetés az ERP saját színtáblájába. A forrásalkalmazásokhoz sem kód-, sem adatbázismódosítás nem történt.
- Következő teljesítendő egység: nyolc bejegyzéstípus és kétoldalú változásjóváhagyás; saját munkalap/tényleges munkaidő, beszerzés és pénzügy továbbra is a teljes megbízás része.

## 2026. november 3. – 0.7.1, ablakok bezárása

- A felhasználó jelzése alapján az ügyfél-jelszókérési ablak olvasási betöltése azonnal bezárható. A későn érkező válasz nem nyithatja vissza és nem állíthatja vissza a régi adatot.
- Minden natív párbeszédablakra felső × gomb került; a PDF-előnézet is külön × gombot kapott. A bezárás a saját mentésvédelmi eseményt használja, a nem mentett adat eldobására megerősítés kell; folyamatban lévő tényleges mentést nem állítunk le látszólag.
- Dolgozói hozzáférések és munkaterv olvasásakor is megszakítható a várakozás. A levelezőablak nem mentett szövegét külön megerősítés védi. A bezárás nem ügyfél-, munka- vagy fájltörlés.
- A nyolcféle bejegyzés és kétoldalú változáskezelés helyi fejlesztése közben előrevett javítás. A bejegyzésmodul még nincs élesítve; ehhez a javításhoz adatbázis/Edge módosítás nem szükséges.
- Ellenőrzés: a teljes korábbi futás 275/276 próbája sikeres volt; a hiányzó késői-válasz állapotvédelmet javítva mind a 34 érintett próba sikeres. TypeScript-build kész, böngészőben a felső × ténylegesen bezárja a jelszókérő ablakot.


## 2026. november 3. – Bejegyzések: ellenőrzött fejlesztési mentés

A felhasználó jóváhagyta a hat saját ERP-táblás változáskezelési tervet és a tesztek utáni élesítést. Elkészült a helyi adatbázis- és kiszolgálóréteg, kétoldalú és pontos változathoz kötött atomi alkalmazással, történetvédelemmel és adatszűréssel. A teljes regresszió 300/300 sikeres; az utána hozzáadott négy próbával a 21 érintett modell-/adatbázispróba is sikeres. Fordítás és edge típusellenőrzés sikeres. **Ez még nem éles funkció:** felület, böngészőpróba és saját ERP-telepítés hátravan. [Folytatás és pontos határok](bejegyzesek-fejlesztesi-allapot.md). Másik app és éles adatbázis nem módosult; függőséget nem telepítettünk.


## 2026. november 3. – Bejegyzésfelület és fotócsomag fejlesztési mentése

Elkészült az új, még be nem kapcsolt bejegyzésablak és a munkatervi csatlakozás előkészítése. Helyi piszkozat, Visszavonás/Újra, pontos árelőnézet, felső ×, hálózati újrapróba, verziók, hiba-/káradatok és saját helyi fotócsomag. A teljes regresszió 316/316 sikeres; az utána bővített lapozási és hozzáférési próbákkal a 26 érintett teszt is sikeres. A böngészőben az árazás, piszkozat-visszaállítás és javított áfaösszeg igazolt, a közzététel megerősítésénél az IAB vezérlés időtúllépést jelzett. **Élesítés nem történt.** A felület további ellenőrzései és pontos bekötése a [folytatási jegyzetben](bejegyzesek-fejlesztesi-allapot.md) szerepelnek.


## 2026. november 3. – 0.8.0: bejegyzések és kétoldalú változásjóváhagyás

A jóváhagyott hat saját ERP-tábla és a teljes bejegyzésfelület elkészült. Pontos ajánlatváltozathoz kötött irodai/megrendelői döntés, ellenajánlat, atomi egyszeri alkalmazás, régi ajánlatok és valódi átvételek megőrzése. Árváltozáskor pipa marad; munkatartalom, mennyiség, egység, beépített anyag vagy nyilvános munkaleírás változásakor új kör. Extra/törlés a jelenlegi munkatervet és számított anyagigényt frissíti. Megnyitott ajánlat és PDF frissül; másik mentetlen szerkesztés nem íródik felül.

Nyolc típus, tényleges szerzőnév/szerep/időpont, címzett, csapatláthatóság, komment, javítás megrendelői lezárása/újranyitása, vitatott felelősség és opcionális tényleges kár. Felső ×, mentésvédelem, Visszavonás/Újra, személy/projekt/szerep szerinti helyi piszkozat, azonos kéréssel hálózati újrapróba, lapozott előzmények. Helyi fotócsomag bejegyzés-/szerep-/ellenőrzőösszeg-védelemmel; fájl Supabase-be nem kerül.

**Végső teljes ellenőrzés: 327/327 sikeres teszt**, frontend-fordítás és edge TypeScript-ellenőrzés. Szintetikus asztali böngészőben irodai ajánlat → megrendelői elfogadás → alkalmazás igazolt; 390 px mobilnézetben nincs vízszintes kilógás, a felső × működik. A korábbi IAB-confirm probléma csak a tesztoldalon kezelt automatizált megerősítéssel lett megkerülve; a valódi alkalmazás megerősítései változatlanul megmaradtak.

Saját helyi mentés után a visszagörgetett próba 6 új táblát adott, rollback után 0 maradt. Éles migráció: `erp_project_entries`, majd névmegjelenítés: `erp_entry_actor_labels`. Gateway v19 ACTIVE, 15 fájl. Hat új tábla RLS/FORCE RLS védett, közvetlen anon/authenticated elérés nincs; az új függvények is tiltottak e szerepeknek. Belépés nélküli éles végpont HTTP 401. Új modulnál advisor WARN/ERROR és hiányzó FK-index nincs; a várható alaptiltó-RLS/újindex INFO jelzések és a projekt korábbi háttérjelzései megmaradtak.

A rövid README és a [használati útmutató](bejegyzesek.md) frissült. A meglévő négy alkalmazás, a KAP/teszt-árajánlat adatai és az Auth-beállítások nem változtak. Csomagtelepítés nem történt; csak az ERP saját csomagverziója emelkedett 0.8.0-ra. Következő egység a saját ERP-munkalap és tényleges munkaidő.

## 2026. november 3. – Saját kertépítési munkalap és munkaidő, 0.9.0

- A felhasználó a [konkrét öt-táblás tervet](munkalap-munkaido-terv.md) és tesztek utáni saját ERP-élesítését jóváhagyta.
- Saját napi munkalap, közös és egyéni érkezés/távozás; egyszeri személyes percszámítás, pipálható fázisok, opcionális magyarázat, átfedés-előnézet és külön megerősítés.
- Változatok és események megőrzése; javítás, indokolt visszavonás, visszaállítás; revízióvédelem, személyenként rendezett zárak, azonos kérés újrapróbálása.
- Szerepkörönként szűrt kiszolgálás: iroda/Építésvezető rögzít, dolgozó saját sorokat olvas, megrendelő csak projektidő-összesítést kap. Saját korábbi idő a megbízás megszűnése után is elérhető.
- Tényleges munkaidő ötödik sávja; 100% fölötti érték és negatív maradék. Az eredeti terv, ügyfélár és a négy valódi átvételi sáv változatlan.
- Helyi piszkozat/függő kérés elkülönítve; offline nincs színlelt mentés. CSV/JSON és helyi nyomtatás/PDF, új fájltároló vagy szolgáltatás nélkül.
- 367 automatikus teszt, TypeScript- és edge-ellenőrzés; helyi szintetikus böngészőpróba: 13 órás PDF-példa mentése, visszavonása és visszaállítása, dolgozói szűrés, ügyfél-összesítés, 390 px mobilnézet. Száz sor feletti lapozás és korábbi saját változat is ellenőrizve.
- Az élesítés előtt a saját gateway 19-es verziója és a módosított saját munkaterv-olvasó függvény helyi mentést kapott; az új DDL visszagörgetett próbája sikeres. Más apphoz, Auth-hoz, forrásügyfelekhez és függőségtelepítéshez nem nyúltunk.

[Használati útmutató](munkalap-munkaido.md). A teljes üzleti lánc közös átadási próbája a hátralévő anyag- és pénzügyi modulok után szükséges.

Élesítés: az öt saját ERP-tábla és a saját munkaterv-olvasó bővítése telepítve; az `erp-gateway` 20-as verziója aktív. Az élesítés nem hozott létre próbamunkalapot. A Supabase biztonsági ellenőrzés saját tábláknál jelzett RLS/policy információja szándékos alapértelmezett tiltás: a hozzáférés a szerepet ellenőrző RPC-n keresztül történik.

## 2026. november 3. – Anyagmozgások előkészítése

A PDF 3., 10., 15–16., 21–22. fejezetének és a 25/19–20., 27–28. próbáknak az ellenőrzése után elkészült a [konkrét tíz-táblás terv](anyagmozgas-anyagelorehaladas-terv.md). Saját ERP-metaadatok olvasása igazolta, hogy külön beszerzési/anyagmozgási táblák még nincsenek. A terv részszállítást, szerepkörös ár-/költségvédelmet, extra anyagokat, ajánlatverzióhoz kötött igényt és 100/70/0 költségalapot tartalmaz. Az AGENTS.md 13. pontja alapján adatbázis-jóváhagyásra vár; éles adat vagy szerkezet nem változott. A rövid README a tervre hivatkozik. Függőséget nem telepítettünk.

## 2026. november 3. – Anyagmozgások és anyagelőrehaladás, 0.10.0

- A felhasználó jóváhagyta a konkrét tíztáblás tervet, a saját ajánlatváltozási triggert és a tesztek utáni ERP-élesítést.
- Saját anyag- és beszállítótörzs, ajánlatból származó verziózott terv, törzsazonosító szerinti összevont lista; külön extra igény és naplózott kapcsolás jóváhagyott ajánlati anyaghoz, dupla igény nélkül.
- Szállítmányonkénti részérkezés, telephelyi átvétel, helyszínre szállítás, beépítés, visszaszállítás, ellenmozgás/visszaállítás és irodai árkorrekció. Rendezett sorzárak, revízió/előnézet, pontos UUID-s ismétlésvédelem.
- Saját telephelyi teendők és értesítések a munkatervben, személy-/projekt-/szerepkör-ellenőrzéssel. Beépítési/beszerzési/szállítási mutatók, 100% felett is. Nettó beszerzési és 100/70/0 elszámolt anyagköltség, hiányzó ár jelzése, verziózott irodai súlybeállítás.
- Irodai Anyagbeszerzés menü, munkatervi kapcsolat, közös törzsanyagválasztó az ajánlatban, mobilnézet; saját helyi piszkozat, mentési konfliktus feloldása megőrzött beírt adatokkal, szerepkör szerint szűrt CSV/JSON és helyi PDF-nyomtatás.
- 403 automatikus teszt sikeres; frontend- és edge-TypeScript ellenőrzés. A helyi böngészőpróbában 60 egység érkezése, 40 átvétele, 12 kiszállítása és 10 beépítése, valamint a 11 400 Ft-os elszámolt költség is igazolt. Ügyféloldali árvédelem és 390 px-es mobilnézet ellenőrizve.
- Élesítés előtti mentés: saját gateway 20-as verziója. A tíz új tábla DDL-jének éles adatbázison végzett, visszagörgetett próbája sikeres. Más alkalmazás, Auth, forrásügyfél és meglévő külső táblák változatlanok; függőséget nem telepítettünk.

[Használati útmutató](anyagkezeles.md) · [Mai vezetői összefoglaló és kipróbálás](mai-fejlesztesek-2026-11-03.md). A teljes üzleti lánc közös átvételi próbája a hátralévő modulok után szükséges.

Az éles saját ERP-adatbázis tíz táblája és ajánlatváltozási triggere telepítve. Az anyagelőzmények utolsó oldalának lezárása külön, csak a saját olvasófüggvényt érintő migrációban pontosítva; száz sor fölötti teszttel ellenőrizve. Az ERP-gateway 22-es verziója aktív. Éles próbamozgás nem készült.


## 2026. november 4. – Pénzügyi elszámolás, eredmény és éves jutalék – 0.11.0

- A megrendelő jóváhagyta a penzugyi-elszamolas-terv.md szerinti 12 új saját táblát, legfeljebb hat saját eseményindítót és a tesztek utáni ERP-élesítést. Külön döntése: éven átnyúló kertépítés jutaléka a lezárás évébe kerül, addig előzetes.
- Külön Pénzügyek nézet: megrendelt és ügyfél által átvett érték, előleg, részfizetés, fizetési szándék/igény és számlakérés, ellenoldali döntés, kizárólag irodai tényleges pénzigazolás, visszafizetés és megőrzött ellenesemény. Átvétel-visszanyitás nem törli a befizetést.
- Nettó belső munka-/anyageredmény, hiányosságjelzés, külön munkaátadás és teljes fizetettség, zárási pillanatkép és naplózott korrekció. A saját kertépítési állapotkorlát a lezárt állapottal bővült; más alkalmazás objektuma nem változott.
- Éves jutalék saját, munkadíjjal súlyozott tényleges végrehajtói részesedéssel, negatív eredménnyel, külön láthatósági kapcsolókkal, személyes összesítővel és projektes bontással. Évközi kifizetés tiltott; régi éves elszámolás/kifizetés megőrzött. Nincs automatikus munkabérlevonás vagy külső pénzátutalás.
- Meglévő ERP-teendőkhöz kapcsolt pénzügyi értesítések; 100 tételes lapozás, előnézet, stabil kéréses újrapróbálás, személyhez/szervezethez/szerephez/munkához kötött helyi piszkozat, Visszavonás/Újra, friss jogosultsággal készülő JSON/CSV és nyomtatható PDF-nézet. Az ügyfél nem kap belső eredményt, óradíjat vagy jutalékot; a dolgozó külön engedéllyel is csak saját jutalékát kapja.
- Ellenőrzés: 424/424 teszt sikeres, frontend-build és szigorú gateway-típusellenőrzés. A teljes regresszió által jelzett PWA-verzióeltérést célzottan javítottuk; mind a 15 PWA-teszt is sikeres. Új pénzügyi esetek: PDF 85 000/0, előleg miatti negatív egyenleg, részfizetés, áfaegyezőség, ismétlés/ütközés, ellenoldali döntés, korrekció, lezárási év, negatív jutalék, évközi kifizetés tiltása, 100 feletti lapozás és jogosulatlan hozzáférés.
- Helyi, szintetikus böngészőpróba: valódi RPC/gateway mellett indítás, 10 000,50 Ft előleg magyar bevitellel, mentési előnézet, sikerjelzés, negatív ügyfélegyenleg, külön ügyfélnézet és felső bezárás. Mobil 390 × 844: oldal 391, ablak 366,6, tartalom 350 px; nincs vízszintes kilógás. A böngészőpróba nem éles pénzügyi adat.
- Élesítés előtti saját mentés: .local/pre-finance-release-20261104.json, korábbi gateway v22 (19 fájl) és saját munkatábla-korlátok. Tranzakciós erp_financial_settlement_profit_commission migráció sikeres; saját gateway v23 ACTIVE, 20 fájl. Éles ellenőrzés: 12 FORCE RLS tábla, közvetlen anon/authenticated jog nélkül; hét service-only pénzügyi RPC; hat saját ERP-forrástrigger; nulla új pénzügyi számla és nulla pénzmozgás. Jogosult irodai olvasás működik, egy saját kertépítés elérhető; bejelentkezés nélküli pénzügyi API 401. Új objektumokra csak szándékos alapból tiltó RLS és még nem használt index INFO-jelzés, új WARN/ERROR nem volt.
- A README rövid magyar összefoglaló maradt; használati részletek: penzugyi-elszamolas.md. Nincs új függőség, előfizetés, Auth-módosítás, régi alkalmazásba vagy közös ügyféladatba írás. Teljes valós üzleti átadási próba továbbra is szükséges.


## 2026. november 4. – 0.12.0, kertkarbantartási munkalap és elszámolás

- A felhasználó jóváhagyta a kilenc saját ERP-táblát, két saját ERP-triggert és a tesztek utáni élesítést. Megerősítette: a Munkalap árai végleges ügyfélárak.
- Elkészült az ügyféligény/visszahívás, irodai elfogadás, három csapat érkezése–távozása, pontos mennyiség-/árszámítás, védett törzsár és szabad Egyéb tétel.
- Kötelező teljes áras előnézet és kifejezett közzététel; külön megőrzött piszkozat/közzétett változat, ügyfél-PDF, javítás/visszavonás/helyreállítás, helyi piszkozat és változatlan kéréses újrapróbálás.
- A készpénzátvételi/átutalási jelzés különül az igazolt befizetéstől; részbeni igazolás és ellenesemény követhető. A karbantartási végösszeg saját pénzügyi ág, nettó/áfa kitalálása nélkül; a kertépítési eredmény/jutalék változatlan.
- A régi Munkalap 83 katalógustételének kezdeti olvasásos másolása védett ERP-táblába, valódi árak Gitbe mentése nélkül. 82 aktív, 57 ellenőrzött, 25 aktív ár ellenőrzésre vár. Más régi adat nem került át.
- Az élesítési ellenőrzés globális vezetői szerep választásánál árlistajogosultsági rést talált. Külön megbízásellenőrzés és célzott regressziós teszt készült; a javított saját ERP-függvény települt.
- ERP-migrációk: erp_maintenance_worksheets_settlement és erp_maintenance_scope_guard; saját erp-gateway v24. Kilenc tábla FORCE RLS-szel, közvetlen anon/authenticated/service_role táblajog nélkül; öt service-only RPC. Auth/előfizetés és más alkalmazás változatlan.
- Szintetikus irodai és ügyfél-böngészőpróba, mobilos táblázattördelés, többoldalas árakat tartalmazó és ár nélküli dolgozói PDF ellenőrzése. Éles munkalap és pénzmozgás nem készült. A README rövidült; részletes használat külön dokumentumban.
- Végső kiadási ellenőrzés: 449/449 teszt sikeres, frontend-build és szigorú kiszolgáló-típusellenőrzés sikeres. Külön ellenőrzés igazolta, hogy az új karbantartási ág mellett a kertépítés nettó/áfa-, előleg- és címszűrése működik. A 19. fejezet naptári/Napi feladatok integrációja a következő egység.

## 2026. november 4. – 0.13.0 munkacsomag és navigáció

- A felhasználó jóváhagyása szerint az eredeti PDF üzleti működése maradt; a Kiss Csaba-minta kizárólag a munkacsomag szerkezetét és zöld-fehér megjelenését adja.
- Saját, csak olvasó workpack_pdf kiszolgálóág a meglévő munkaterv-, anyag-, bejegyzés-, munkalap- és pénzügyi olvasókon. Teljes lapozás, hosszú bejegyzések, forrásváltozás felismerése; munkaterv nélkül nincs rejtett inicializálás.
- Külön csapat/megrendelő/irodai adatmodell, szerveroldali szerep- és munkakapcsolat-ellenőrzés. A csapatcsomagban nincs pénzügyi adat; ügyfél nem kérhet belső csomagot. A PDF új tárolót vagy adatbázisobjektumot nem igényel.
- Munkacsomag: négyszintű részfeladatos átvétel, háromoszlopos lista, anyag- és változástörténet, tényleges idő, öt üres nap/lap; külön ügyfélpénzügy és belső eredménylap. Üres lap nem számít mentett munkalapnak.
- Négy irodai kezdőlapi feladat; ritkább adminműveletek lenyithatóan; három munkatervnézet. Meglévő mentésvédelmek és funkciók megmaradnak. Mobilpróba 390 × 844 méreten, vízszintes kilógás nélkül; felső ×/Esc működik.
- Új függőség, adatbázis-, Auth- vagy szerepkörmódosítás nincs. Kizárólag ERP-fájlok változtak. A tesztadatokra megkapott engedély szerint szükség esetén Teszt vagy Geller Ágnes ügyfél használható, árakkal és megőrzött adatokkal; e kiadás ellenőrzése szintetikus helyi adatokkal történt.
- 463/463 teszt sikeres, build és check:edge sikeres. Szintetikus csapat-PDF 18, ügyfél-PDF 15, belső eredménylap 1 oldal; tördelés, adatleválasztás és 20 üres nap ellenőrizve. Rövid magyar README és használati útmutató képekkel.
- ERP-kiszolgáló: v24-ről v25-re telepítve, 25 saját fájllal, előző verzió helyi mentésével. Engedélyezett webes eredetről belépés nélkül az új PDF és a munkaterv is 401-et ad; idegen eredet 403-at kap. Az adatbázis, meglévő belépések és más appok változatlanok. A közös projekt meglévő általános biztonsági jelzései nem változtak; új RPC vagy hozzáférési engedély nem készült.

## 2026. november 4. – Naptár és Napi feladatok, terv jóváhagyásra

- A PDF 19. fejezete, kapcsolódó 18. fejezete és 25/24. tesztje, valamint a Napi app napi/heti/havi, törzs-, export-, ismétlődés- és emlékeztető-funkciói célzottan, csak olvasással felmérve.
- A forrás ellenőrzéskori állapota: 43 napi rekord, ebből 38 aktív és 5 törlési jel; 181 feladat, 16 előjegyzés; 8 munkatárs, 5 autó, 12 eszköz, 8 anyag, 17 sablon. Befejezési idők hiányoznak; szabad kapacitást nem találunk ki.
- Elkészült a [konkrét terv](naptar-napi-feladatok-terv.md): 15 saját ERP-tábla, egyirányú forrásimport, irodai alapkapcsoló, blokkok, 1+1 órás kapacitáspuffer, karbantartási kapcsolódás és külön saját ERP-emlékeztetők. Meglévő app, adatbázisobjektum, Auth és szolgáltatás nem módosult.
- Csak terv/dokumentáció készült; éles naptár, adatimport és új adatbázisobjektum nincs. A README verziójelzése a tényleges 0.13.0-ra javítva. Megvalósítás és tesztek utáni telepítés a 13. szabály szerinti tervjóváhagyás után.


## 2026. november 4. – Naptár és Napi feladatok, 0.14.0

- A felhasználó jóváhagyta a részletes tervet és a tesztek utáni ERP-élesítést. A korábbi tervbejegyzés akkori, nem jelenlegi állapotot ír le.
- Napi/heti/havi nézet, csapatok, teljes napi szerkesztő, sablonok, ismétlések, eredeti színek, eszközök/anyagok/elvárások, visszavonás/előzmény, szerepszűrt PDF és teljes időszaki ZIP/JSON készült. A PDF végső vizuális próbájában javítva a szakaszcím előtti távolság.
- 15 saját ERP-tábla, 8 védett RPC, 2 saját trigger; az ERP saját karbantartási kapacitáskapcsolata és 1+1 órás, nem számlázható puffer. Minden forrásírás tiltott. Induláskor csak office naptárszerep, booking=false; nem találunk ki régi végidőket.
- Saját migráció és négy kapcsolati index telepítve; gateway v26, erp-calendar-reminders v1; saját cron job és három új saját Vault-titok. Régi Auth, titok, cron és app nem módosult. A teljes korábbi ERP-kiadás ZIP-mentése a Gitből kizárt helyi mappában megmarad.
- A friss forráscsomag: 45 napi rekord, 40 aktív/5 törlési jel, 197 feladat, 16 előjegyzés; 8 munkatárs, 5 autó, 12 eszköz, 8 anyag, 17 sablon. 96 forrásrekord archiválva, import state=applied, nincs ütközés. Az eredeti tartalmak/árak/titkok nem kerülnek a GitHubra. Az összes ERP adatbázismérete az ellenőrzéskor 98 MB.
- 500/500 teszt, build és teljes check:edge sikeres. Szintetikus böngészőben napi szerkesztés/Undo/Redo/mentés, heti/havi és 390 px-es mobilpróba, ZIP-letöltés; szerepkörös magyar PDF és 29 oldalas hosszú PDF ellenőrizve. Az indexek után célzott adatbázispróba. A külön npm: PDF-importot a helyi általános tsc nem oldja fel; a tényleges PDF-runtime és Edge-telepítés sikeres, új csomagtelepítés nem történt.
- Éles ellenőrzés: import 40/197/16, 0 közvetlen táblajog és publikus RPC-jog; scheduler üresjáratban nem küld; érvényes saját emlékeztető-hívás 200, processed=0, hibás hitelesítés 401; új és meglévő gateway-művelet belépés nélkül 401. Új biztonsági WARN/ERROR nincs. A policy nélküli RLS INFO szándékos közvetlen tiltás; új hiányzó FK-index nem maradt. Valódi telefonos push és teljes üzleti átadás még emberi eszközpróba.
- A főnök új munkacsomag-kérése ebben a kiadásban csak felmérés tárgya, nem megvalósítás. A következő nagy eredeti PDF-egység a referencia/WordPress-kapcsolat; a teljes állapotlista továbbra is irányadó.


## 2026. november 4. – Munkanapi anyagok közvetlen elérése, 0.14.1

A felhasználó jelezte, hogy a kertépítés Napi munkalapján hiányzik a beszállított/beépített anyag és az anyagtörzs közvetlen elérése. A meglévő anyagmodult kötöttük a munkanaphoz; új táblát, szerepkört, Auth-beállítást vagy üzleti készletképletet nem vezettünk be.

- Munkanapi, lenyitható anyagösszesítő, szállítás/beépítés rögzítése a kijelölt dátummal, külön irodai anyagtörzsgomb. A munkalappiszkozat megmarad az anyagablak használata és mentése közben. A napló késői válaszai nap-/személyváltáskor nem kerülnek másik munkába.
- A meglévő saját ERP-anyagolvasás opcionális work_date szűrőt kapott, a százsoros lapozás ELŐTT. A kiszolgáló szigorúan ellenőrzi a dátumot. Az RPC jogosultságai és többi mezője változatlan; a gateway 27. verziója telepítve. A védett, idempotens módosítás a database/proposals/erp-material-workday-filter.sql fájlban követhető. Más apphoz nem írtunk.
- Az összesítő a tényleges helyszíni/beépítési készletváltozásokból számol, a visszavonásokkal együtt. Több munkalap ugyanazon napja ugyanazt az anyagnaplót mutatja. Az időlap exportja nem állítja, hogy anyagmellékletet is tartalmaz; az külön anyagkimutatás.
- A teljes 506 teszt, build és check:edge sikeres; a végső lenyitásmegőrzés után 33 kapcsolódó teszt újra sikeres. Valódi kiszolgálómintájú helyi PGlite-böngészőpróba: 50 m² helyszínre érkezés, 12,5 + 2,5 m² beépítés; a munkalapon 50/15 m², a megjegyzéspiszkozat megmarad; anyagtörzs elérhető; 390 px-en nincs vízszintes túlcsordulás. Éles próbában az olvasás sikeres, anon RPC-jog nincs. Az első tesztfutás két PWA-verziópróbája jelezte az elmaradt APP_VERSION-emelést, ezt javítottuk, utána teljes futás 506/506 sikeres.
- Az Építésvezető-választásnál jelzett tiltás oka a kiválasztott karbantartási Tesztelés munka volt; a felhasználó megerősítette. A PDF szerinti vezetői határokat nem változtattuk meg.
- A főnök új szakaszolási pontosítása külön dokumentumba került; ebben a javításban nincs árazási/munkatervi adatmodell-átalakítás. [A következő fejlesztés követelményei](fonoki-szakaszolas-pontositas.md).


## 2026. november 4. – Szakaszolás és rendezés: részletes terv, jóváhagyott indulás

A felhasználó először részletes tervet kért, majd kifejezetten engedélyezte a leírás szerinti megvalósítást. Elkészült a [részletes műszaki és használati terv](szakaszolas-es-huzassal-rendezes-terv.md): területi nézet megőrzése, külön szakaszok/részfeladatok, kategória-/típusalapú munkafolyamatok, pontos arányosítás, hét saját ERP-nyilvántartás, hétnél nem több új RPC és megőrzött átvételi alapú átállás. A dokumentáció készítése nem módosította az alkalmazást vagy az éles adatbázist. A megvalósítás állapotát a következő bejegyzések rögzítik; addig a publikus alkalmazás 0.14.1.

A főnöki irodai pipa utáni megrendelői kapu a tervben jelzett üzleti pontosítás. Új előfizetés, framework vagy más app módosítása nincs tervben. Jóváhagyás után először a helyi modell és az adatbázis-ellenőrzések készülnek. Az új szakaszolás elkészülte után a felhasználó kérte a PDF szerinti korábbi fejlesztési sor folytatását, ha a rendelkezésre álló keret engedi; a teljes ERP nyitott tételei a specifikációállapot-listában maradnak követhetők.


## 2026. november 5. – Kivitelezési szakaszok és közös rendezés (0.15.0)

- A jóváhagyott hét saját ERP-tábla és hét védett művelet elkészült; a régi munkák külön előnézettel válthatók át.
- Központi szakaszok, kategóriaalapok és típusszintű részfolyamatok, ajánlati pillanatképpel; pontos munkadíj-/időfelosztás és ellenőrzött bontás.
- Szakaszos/területi nézet, fogantyús húzás, billentyűzetes sorrend, visszavonás és megőrzött elrendezés megnyitása. A bizonytalan mentés eredeti kérését a saját helyi tároló megőrzi.
- Részfeladatos valódi átvétel és elutasítás; új ügyfélpipa csak iroda után; a korábbi tényleges átvétel hivatkozás, nem másolt pipa.
- Napi munkalap részfeladat-kijelöléssel, egyszer számolt emberpercekkel; teljes ajánlati sorra összesített pénzügy és kanonikus személyi/jutaléksúlyok.
- A kapcsolódó helyi teszt feltárta és javította a saját ERP pénzügyi értesítőjének munkalap-projektazonosító hibáját. A karbantartási pénzügy külön ágát az éles definícióval összevetve megőriztük és közzétett helyi lappal teszteltük.
- Az ajánlati/sablon- és napi feladatsorrend ugyanazt a saját rendezőt használja. Nincs új függőség vagy más alkalmazásban végzett módosítás.
- Szintetikus böngészőpróba: mentett átállás, megkülönböztethető forrástételek, húzás, fel/le és visszavonás sikeres. Mobilon talált kilógás javítva; a javítás ismételt vizuális ellenőrzését az IAB kapcsolatának elakadása megakasztotta. Ez külön nyitott ellenőrzési pont.
- PDF: csapat-, ügyfél- és irodai változat elkészült helyi próbára; szerepszűrés ellenőrizve, üres részletezőoldal megszüntetve, szakasz/rész sorszámozás és eredeti területi lista megőrizve.
- Élesítés előtt: teljes regresszió, végleges típusellenőrzés, a saját távoli függvények és gateway eltérésellenőrzése. E bejegyzés írásakor az új éles telepítés még nem történt meg.

### Helyi ellenőrzött mentési pont

- Végleges fordítás: sikeres; kiszolgáló TypeScript-ellenőrzés: sikeres; teljes regresszió: **553/553 sikeres**.
- A kiinduló éles gateway v27 mind a 29 fájlja egyezik a korábban feltöltött Git-verzióval. Az érintett saját adatbázisfüggvények ellenőrzése megtörtént; a karbantartási kivétel megmaradt. A két saját migráció egyetlen, 13 definíció-ellenőrzéssel védett helyi csomagban is elő van készítve.
- **Nincs új éles adatbázismódosítás, gateway-telepítés vagy push.** Az online alkalmazás továbbra is 0.14.1. A 0.15.0 helyi kiadásjelölt.
- Következő lépés: a tesztböngésző helyreállítása után a javított mobilnézet utolsó szemrevételezése, majd ellenőrzött saját ERP-élesítés, visszaellenőrzés és main push. Más fejlesztési témát nem kezdtünk el a nyitott ellenőrzés előtt.


### A 0.15.0 kiadás ellenőrzött élesítése

- Az újraindítás után az utolsó mobilpróba is sikeres. A 390 px-es próbában a párbeszédablak `clientWidth` és `scrollWidth` értéke egyaránt 342 px; a bezárás működik. A gombok kényelmes sorba tördelődnek.
- A 13 kiinduló saját függvény lenyomata változatlan volt; a hét új tábla még nem létezett. A két migráció egy, ellenőrző feltételekkel védett tranzakcióban települt.
- Saját `erp-gateway` v28: 32 fájl, telepítés után mind visszaolvasva és egyezőnek ellenőrizve. A meglévő saját hitelesítés megmaradt; Auth-fiók és más alkalmazás nem változott.
- Mind a hét új tábla RLS/FORCE RLS védelemmel, közvetlen anon/authenticated/service_role táblajog nélkül működik. A védett katalógus olvasási próbája sikeres, a belépés nélküli HTTP-kérés 401-et kapott.
- A [RLS-ellenőrző tájékoztatója](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) szerinti policy nélküli jelzés itt a kizárólag védett saját függvényekre épülő modell része; a táblák közvetlen jogai külön ellenőrizve tiltottak. A friss indexek használatlansága tájékoztató jelzés, új hiányzó idegenkulcs-indexet nem jelzett az ellenőrző.
- A korábbi helyi kiadásjelöltről szóló bejegyzés történeti mentési pont; a mobilos akadály megszűnt. A rövid README és a képes használat aktualizálva.


### Online ellenőrzés és a következő PDF-fejezet előkészítése

- A 0.15.0 kiadás a main ágra pusholva: `94b4ee832c840f3205646435140220819d296d5f`. A GitHub Pages [42021574637 futása](https://github.com/AgnesGeller/erp/actions/runs/42021574637) sikeres, a publikus alkalmazás és version.json is 0.15.0-t ad vissza.
- A PDF 20. fejezetéhez elkészült a [referencia-/WordPress-terv](referenciamunkak-wordpress-terv.md). A nyilvános REST-felmérés hagyományos, Elementor-tartalmú bemutatócikket, külön mintatermék-típust és SEOPress-útvonalakat talált; a végleges szerkesztői illesztés hitelesített olvasási ellenőrzést igényel.
- A terv külön kezeli a helyi képeket, a három független platformváltozatot, a ténylegesen beépített anyagokat, a már publikált oldal változatlanul hagyását az új szerkesztés alatt, valamint a piszkozat képfájljainak esetleges nyilvánosságát. Kilenc saját ERP-nyilvántartás a javaslat, még nincs telepítve.
- A tervhez csak nyilvános GET-kérés történt; WordPress-feltöltés, publikálás, új szolgáltatás vagy további adatbázismódosítás nincs. Csak dokumentáció változott, ezért a már sikeres 553 tesztet nem futtattuk újra; hivatkozás- és diffellenőrzés készült.


## 2026. november 5. – Referenciamunkák (0.16.0)

- A felhasználó jóváhagyta a referenciamodul folytatását az eredeti PDF és a részletes terv szerint, majd az összefüggő bemutatótesztet. Kizárólag saját ERP-fájlok és ERP-adatbázis-objektumok változtak.
- Kilenc új saját nyilvántartás; öt védett publikus RPC és saját privát segédek. Minden új táblán RLS/FORCE RLS, tiltott közvetlen anon/authenticated/service_role táblajog; a gateway és az adatbázis is ellenőrzi az irodai jogosultságot.
- Csak jelenlegi tényleges ügyfélátvétellel rendelkező munka és nettó beépített anyag kerül az alapjavaslatba. Kapcsolt vagy kifejezetten kiválasztott, ugyanahhoz az ügyfélhez/címhez tartozó felmérés; szűk forrásmezők, ár és munkautasítás nélkül. Elavult forrásból külső publikáció nem indítható.
- Külön alap és külön web/Facebook/Instagram változatok; helyi piszkozat, revízió/idempotencia, összehasonlítás, Visszavonás/Újra, verzió-visszaállítás és visszaállítható archiválás. A képek a saját helyi tárban maradnak; optimalizált, EXIF nélküli másolatok és ZIP átadás, Supabase-fájltároló nélkül.
- A böngészős próba során javítva a képkijelöléskor becsukódó lenyílók. Mentés/újranyitás, külön platformszövegek, két kép/csoport és képes ZIP ellenőrizve. Mobil 390 px: `clientWidth=scrollWidth=358 px`; × működik; képes használat elmentve.
- Saját WordPress-adapter rögzített HTTPS-célhoz, csak szerveroldali konfigurációval, sablonellenőrzési kapuval; külön tartós küldési napló, változathoz kötött jóváhagyás, piszkozat/publikálás szétválasztva, távoli ütközés és bizonytalan eredmény védelme. Nincs valódi WordPress-hitelesítés vagy publikáció. A [SEOPress hivatalos leírása](https://www.seopress.org/support/guides/get-started-with-the-seopress-rest-api/) alapján cím/leírás végpont, visszaolvasott eredményellenőrzéssel; az élő sablonillesztés még külön feladat.
- Végleges teljes regresszió: **576/576 sikeres**, frontendfordítás és kiszolgáló-típusellenőrzés sikeres. Az offline teszt jelzett egy hiányzó új modult; a gyorsítótár frissítve és sikeresen újratesztelve. A teljes üzleti lánc külön helyi tesztben eljutott az új ajánlattól a pénzügyi lezáráson át a referenciáig.
- Az éles saját gateway kiinduló 32 fájlja SHA-256 szerint egyezett a kiadott Git-verzióval. A referenciamigráció és saját fedőindex települt; gateway v29, 35 fájl visszaolvasva és pontosan egyező. A védett irodai olvasás sikeres; megfelelő Origin mellett auth_options 200, bejelentkezés nélküli reference_list 401. Auth és más alkalmazás nem módosult.
- A Supabase ellenőrző egy új [hiányzó fedőindexet](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys) talált a reference_variants alapváltozat-kapcsolatánál; saját indexmigrációval javítva. A [policy nélküli RLS INFO](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) a kizárólag védett függvényekkel elérhető saját modell része; a közvetlen jogok tiltása külön igazolva. A régi indexekhez és más appokhoz nem nyúltunk.
- A rövid magyar README és az állapotlista frissült; [referenciahasználat](referenciamunkak.md) és [november 10-i bemutatási útmutató](bemutato-2026-11-10.md) készült. A helyi tesztadatok nem kerültek az éles ügyfél-/pénzügyi táblákba.


## 2026. november 6. – WordPress hozzáférés és csak olvasási ellenőrzés (0.16.1)

- A felhasználó jóváhagyta a külön, Szerző jogosultságú diszkertek_erp WordPress-fiókot és a Wordfence alkalmazásjelszó-tiltásának feloldását. A beállításokat saját maga végezte; a kapott képen a két ERP-titok mentése látszik. Titokérték nem került a beszélgetésbe vagy a repositoryba.
- A szerver külön jelzi a beállított hitelesítést és a jóváhagyott megjelenéshez kötött küldési készültséget. Az irodai kapcsolatpróba mentett referencia nélkül is hívható; továbbra is ellenőrzött ERP-felhasználó és friss adatbázisoldali irodai jogosultság kell.
- Megjelenési jóváhagyás előtt kizárólag GET/OPTIONS megengedett a rögzített WordPress-célhoz; minden feltöltés, piszkozatírás és publikálás tiltott. Az ellenőrzés nem kapcsolja be automatikusan a küldést. A felhasználó kérése szerinti külön kézi közzétételi gomb és megerősítés megmaradt.
- Fordítás és kiszolgáló-típusellenőrzés sikeres; 70 célzott API-, gateway-, WordPress- és offline regressziós teszt sikeres. A korábbi teljes kiadás 576 tesztje megmaradt; a két új esetre fókuszáltunk, a teljes készletet nem ismételtük indokolatlanul. Nincs új adatbázis-, Auth-, jogosultság- vagy más alkalmazást érintő változtatás.
- A valódi WordPress-belépés és a sablon-/SEO-illesztés ellenőrzése még hátravan; a titokbeállítások képe önmagában nem bizonyítja a sikeres kapcsolatot.

- Az éles saját gateway kiinduló v30 csomaglenyomata egyezett a korábban teljesen visszaellenőrzött v29 kiadással. A csak olvasási próba v31-ként települt; mind a 35 fájl visszaolvasva és egyezőnek ellenőrizve.

## 2026. november 6. – Ellenőrizhető WordPress-piszkozat, kézi közzététel (0.16.2)

- A felhasználó az éles ERP sikeres WordPress-belépés/jogosultság visszajelzését megadta. A korábbi közös kapu a megjelenés ellenőrzéséhez szükséges piszkozatot is tiltotta; ezt javítottuk.
- Beállított szerveroldali hozzáféréssel, friss irodai jogosultsággal és pontos változathoz kötött ellenőrzéssel képfeltöltés és piszkozatkészítés engedett. A megjelenési kapu a nyilvános publikálást továbbra is szerveroldalon tiltja; a felületen nincs hozzá gomb a kapu feloldásáig. Az adapter külön is védi a nyilvános tartalom és SEO módosítását.
- A post/SEO-mentés utáni végállapot visszaolvasva; piszkozathoz kifejezett előnézeti hivatkozás. Bizonytalan eredménynél továbbra sincs vak ismétlés.
- 31 célzott helyi teszt sikeres: WordPress-adapter, védett gateway és jóváhagyás, kézi publikálás tiltása, offline működés, teljes szintetikus bemutatófolyamat. Frontendfordítás és kiszolgáló-típusellenőrzés sikeres. A korábbi teljes 576 tesztes kiadás tényét nem helyettesítjük teljes új futás állításával.
- Nincs adatbázis-, Auth-, más alkalmazást érintő módosítás vagy függőségtelepítés. Valódi WordPress-bejegyzést a fejlesztési ellenőrzés nem hozott létre; a felhasználóval végzendő piszkozat-/sablon-/SEO-próba hátravan.
- Éles saját gateway v32: a kiinduló v31-hez képest csak két WordPress-modul változott; mind a 35 telepített fájl pontosan egyezik. Olvasási HTTP-próba: auth_options 200, bejelentkezés nélküli reference_wp_check 401.

## 2026. november 6. – Követhető referenciakészítés és becsukódó menü (0.16.3)

- Az Iroda és beállítások lenyíló menüpont választásakor becsukódik; a később létrehozott menüpontokra is érvényes. A menü üres részére kattintás nem választ műveletet.
- Az aktív referenciafül jól látható zöld kiemelést kapott. Ismételt választáskor a hozzá tartozó becsukott szerkesztőrész újra megnyílik és látható helyre kerül. Ez megszünteti az Alap és képek látszólag hatástalan kattintását.
- Négy lépéses lenyitható használati segítség, aktuális teendő és a mentések melletti Tovább gombok vezetik végig a szöveg/képek → weboldal-változat → irodai ellenőrzés → WordPress-piszkozat folyamatot. A mentést vagy ellenőrzést nem hagyják észrevétlenül ki.
- 19 célzott helyi teszt és frontendfordítás sikeres. Saját helyi böngészőben, szintetikus adatokkal: becsukott rész újranyitása, mentés előtti továbblépés jelzése, alap/változat mentése, 3–4. lépés célzott megnyitása, bezárás ellenőrizve. Mobil 390 px: clientWidth=scrollWidth=358 px. Asztali és mobilos képernyőkép készült; a használati leírásban az asztali próba látható.
- Csak ERP-felület és saját dokumentáció változott. Nincs adatbázis-, kiszolgáló-, Auth- vagy más alkalmazást érintő módosítás; valódi WordPress-bejegyzés nem készült.

## 2026. november 6. – Folyamatos automatikus indulás (0.16.4)

- Megjegyzett munkamenetnél korábban a belépőoldal már a szerveres helyreállítás előtt látszott; a részenként megjelenő nézetek ugrálást okoztak. Korai, külön betöltési jelzés takarja az indulást a végleges nézet elkészültéig. A jogosultságvizsgálat és tokenkezelés változatlan.
- A független frontendmodulok két párhuzamos csoportban töltődnek a hosszú soros importlánc helyett. Nincs mesterséges várakozás vagy új függőség. A hálózati ellenőrzés idejének megszűnését nem ígérjük.
- Harminc másodperc után külön elakadási jelzés és újrapróbálás; belépési hibánál normál belépő és érthető hiba. Az indulás alatti frissítés nem szakítja félbe a folyamatot. A korábbi általános várakozási üzenet helyett belépési/adatbetöltési/mentési magyarázat látszik.
- Fordítás és 46 célzott helyi teszt sikeres. Teljes frontend saját helyi szintetikus végponttal: késleltetett helyreállítás alatt csak a megnyitási jelzés, utána közvetlen kezdőlap, első látogatásnál belépő, lejárt munkamenetnél belépő és hiba; nincs konzolhiba. A dinamikus Referenciamunkák menüpont kiválasztása után a menü becsukódását a tényleges böngészőben is ellenőriztük.
- Kizárólag ERP-frontend és dokumentáció változott; nincs szerver-/adatbázis-/jogosultságmódosítás. Képernyőkép: [indulás](kepek/erp-indulas-0164.png).

## 2026. november 6. – Oldalanként egy teendős referenciaszerkesztő (0.16.5)

- Felhasználói visszajelzés alapján megszűnt az Alap és képek fül és a hosszú négypontos útmutató. Kilenc rövid, önálló oldal; Vissza/Tovább, a Tovább ment, a munka neve/címe állandó összefüggést ad. A Megnevezés felirat mindenhol következetes.
- A munkaváltás a További műveletek alá került és megerősítést kér; a szerkesztés saját helyi piszkozatként megmarad. A haladási pont helyben megőrzött. Facebook/Instagram, előzmény, visszavonás, ZIP és archiválás megmaradt.
- A honlapváltozat első elkészítése külön zavaró gomb nélkül történik; meglévő szöveget nem írunk felül. A WordPress-piszkozat egyetlen kifejezett művelet: kijelölt képek feltöltése, majd piszkozat. A pontos változathoz kötött jóváhagyás és a nyilvános közzététel szerveres tiltása változatlan.
- 40 célzott helyi modell/gateway/WordPress/offline/folyamat teszt sikeres, frontendfordítás sikeres. Helyi böngészőben a teljes kilenclépéses folyamat végigment a szimulált WordPress-piszkozatig; hiányzó keresőleírás és jóváhagyás nélküli továbblépés blokkolva, visszalépés megőrzi a szöveget, bezárás/folytatás működik. A natív megerősítésnél a tesztböngésző egyszer megakadt; a saját próbafül bezárásával helyreállt, a munkaváltási védelem külön automatizáltan ellenőrizve. Mobil 390 px: nincs vízszintes kilógás, képernyőkép megőrizve.
- Nincs adatbázis-, Auth-, kiszolgáló- vagy más alkalmazást érintő módosítás. Valódi WordPress-bejegyzés nem készült. Rövid magyar README, használat, aktuális állapotlista és külön közérthető vezetői összefoglaló frissült.
