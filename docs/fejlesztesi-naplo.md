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
