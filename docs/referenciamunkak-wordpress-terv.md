# Referenciamunkák és WordPress – részletes megvalósítási terv

**2026. november 5. · Tervezési állapot, még nem telepített modul.** Alap: a teljes fejlesztői PDF 20. fejezete (12. oldal), a kapcsolódó adatvédelmi/offline előírások és a későbbi felhasználói pontosítások. A 0.15.0 szakaszolási kiadás már elkészült és online van; ez a következő önálló fejlesztési egység.

## Röviden, mit fog tudni az iroda?

1. Kiválaszt egy meglévő kertépítést, és megnyitja a **Referenciamunka készítése** felületet.
2. Ellenőrzi az átvett ügyfélelképzelést, a valóban elkészült munkákat és a beépített anyagokat. Minden szöveget szerkeszthet.
3. Saját képeket választ az Előtte / Kivitelezés közben / Elkészült / Későbbi állapot csoportokhoz. A képek rendezhetők, feliratozhatók, külön eltávolíthatók.
4. Külön szerkeszti és menti a weboldal-, Facebook- és Instagram-változatot. Letöltés és másolás közvetlenül használható lesz.
5. A WordPress-kapcsolat ellenőrzött beállítása után először piszkozatot készít; nyilvános közzétételt csak külön ellenőrzés és gomb indíthat.

A modul az **Iroda és beállítások** alatt, összecsukható részekkel jelenik meg. A fejlécben mindig elérhető bezárás és mentési állapot lesz; a bezárás nem törlés. Mobilon a húzás mellett fel/le gombok is használhatók.

## Ellenőrzött kiindulópont

Csak nyilvános GET-kérések történtek, bejelentkezés, feltöltés és WordPress-módosítás nélkül.

- A `www.diszkertek.hu` főoldal a `diszkertek.hu` címre irányít. A WordPress REST API nyilvánosan olvasható.
- A típuslista tartalmaz hagyományos `post`, `page`, `attachment`, Elementor- és `al_product` típust. **Az egyedi típus létezése önmagában nem jelenti, hogy az a referenciák helye.**
- Az ellenőrzött kertépítési bemutató hagyományos `post`, kiemelt képpel és hat képpel a tartalomban; a megjelenített tartalom Elementor-jelölést tartalmaz. Az `al_product` lekérdezés egy mintaoldalt adott vissza, ezért nem ezt választjuk automatikusan célként.
- A REST-útvonaltérkép SEOPress névtérre és külön cím/leírás végpontra utal. Az írhatóságot, jogosultságot és a konkrét mezőket még hitelesített, olvasási próbával kell ellenőrizni.
- A valószínű cél a hagyományos bejegyzés, de a végleges sablont, kategóriát, képgalériát és SEO-mezőket a WordPress szerkesztői struktúrájával összevetve kell rögzíteni. A publikus HTML nem bizonyítja a teljes belső mezőszerkezetet.

**Lényeges következmény:** meglévő Elementor-tartalmat nem írhatunk felül egyszerű HTML-exporttal. Az első saját ERP-piszkozatnak igazoltan a webhely meglévő megjelenésébe kell illeszkednie. WordPress-bővítmény, sablon vagy jogosultság módosítása nem része az ERP-n belüli fejlesztési engedélynek.

## Forrásadatok és hiteles tartalom

- Minden referencia saját ERP-kertépítéshez és szervezethez kötött. A régi appokból ehhez nincs új adatátvétel vagy visszaírás.
- Az ügyfélelképzelés az elfogadott ajánlat `source_survey` kapcsolatának megfelelő felmérési változatából származik. Hiányzó vagy többértelmű kapcsolatnál az iroda választ forrást; puszta név-/címegyezés nem kapcsol össze rekordokat.
- A megvalósítás forrása az aktuális elfogadott ajánlat és az elfogadott tartalmi változások, összevetve az aktuális tényleges átvételekkel. Az ajánlatban szereplés önmagában nem bizonyít elvégzett munkát. Átvételre váró vagy vitatott rész nem nevezhető késznek; eltérésnél irodai ellenőrzés szükséges.
- Az új részfeladatos és a korábbi munkatervet is kezelni kell; egy ajánlati sor több részfeladatából nem keletkezhet többszörözött teljesítés.
- Az anyaglista a tényleges nettó beépített mennyiséget követi, az érvényes visszavonásokkal/korrekciókkal. Megrendelt, raktári, úton lévő vagy csak helyszínre szállított anyag nem lesz automatikusan felhasznált anyag. Eltérő mértékegységű sorok nem adhatók össze.
- A generált kiindulószöveg forrásazonosítókat és forrásváltozatokat őriz. Újabb projektadat esetén összehasonlítható frissítési javaslat készül; a kézzel javított szöveg nem íródik felül csendben.
- Elsőként kiszámítható, szerkeszthető szakmai alapváltozat készül. Az opcionális MI-vázlat külön művelet, kizárólag ellenőrzött tényekből. A korábban választott Groq ingyenes próba használható a saját kulcs biztonságos beállítása és az adatküldés ellenőrzése után; új fizetős szolgáltatás nem kapcsolódik be.

## Saját ERP-adattárolás – javaslat

Kilenc új nyilvántartás; a pontos SQL és migráció a következő megvalósítási lépésben készül. Minden idegen kulcs szervezeti összetartozást is ellenőriz, a gyermekadat nem kapcsolható másik szervezet rekordjához.

1. **erp.references:** kertépítéskapcsolat, belső megnevezés, aktuális változat, archiválás és módosító.
2. **erp.reference_versions:** megőrzött alapdokumentum; elképzelés, megvalósítás, beépített anyagok, forráslenyomat és szerző. Nem tárolja le a teljes, belső árakat tartalmazó projektet.
3. **erp.reference_variants:** külön web/Facebook/Instagram dokumentumazonosító, aktuális revízió és származtatott alapváltozat; a három változat egymástól független.
4. **erp.reference_variant_versions:** verziózott platformszöveg, SEO/címkék, képsorrend és képfeliratok. Kifejezett visszaállítás új változatot képez.
5. **erp.reference_media:** csak fájlazonosító, ellenőrző lenyomat, méret/MIME, csoport, sorrend, felirat, forráskapcsolat és eltávolításjelzés. Fotóbájt és hang nincs a Supabase-ben.
6. **erp.reference_publication_approvals:** az iroda dokumentált ellenőrzése és a szükséges hozzájárulások hivatkozása, pontos szöveg-/képváltozathoz és célhoz kötve. Ez nem helyettesíti és nem találja ki az érintett hozzájárulását.
7. **erp_private.reference_commands:** kérésazonosító, szereplő, műveletlenyomat és eredmény; azonos kérés eltérő adattal nem hajtható végre.
8. **erp_private.reference_publications:** WordPress-oldal/típus/rekordazonosító, utolsó ellenőrzött távoli változat, feltöltési fázisok, médiaazonosítók, helyi változat és hibaállapot. Nincs jelszó vagy token az üzleti rekordban.
9. **erp_private.reference_publication_events:** hozzáfűzhető feltöltési, piszkozat-, jóváhagyási, publikálási és helyreállítási napló; titkok és képbájtok nélkül.

A meglévő ERP-irodai jogosultság és munkamenet-ellenőrzés marad. A modul olvasása és módosítása is irodai; ügyfél/dolgozó nem kap közvetlen referencia-szerkesztési API-hozzáférést. Saját védett gateway-műveletek, adatbázisoldali szervezet-/irodaellenőrzés, rögzített `search_path`, RLS/FORCE RLS és tiltott közvetlen táblajog szükséges. Új Auth-fiók, régi appot érintő trigger vagy előfizetés nem készül. A meglévő projekt-/ár-/átvételi rekordokhoz ez a modul csak olvasással kapcsolódik.

## Helyi képek és adatvédelem

- A korábbi felhasználói döntés szerint fotó/hang/ZIP nem kerül Supabase Storage-be. A meglévő saját helyi fájlkezelést használjuk, letölthető referencia-csomaggal és ellenőrzött manifesttel.
- Másik eszközön a szöveg és fájlazonosító szinkronizálható; a hiányzó képet a csomagból vissza kell tölteni. A felület nem állíthatja, hogy a helyi fotó automatikusan minden eszközön megvan.
- Projekthez rendelt helyi fényképek csak kifejezett kiválasztással kerülnek a referenciába. Képeltávolítás alapból a referencia-kapcsolatot veszi ki, nem törli a felmérés vagy bejegyzés eredeti példányát.
- A referencia minden változata saját kijelölt képlistával rendelkezik. Az egyik platform listájának módosítása nem rendezi át a másikét.
- Az eredeti képből külön optimalizált, újrakódolt publikációs példány készül; EXIF/helyadat nem mehet ki. Az eredeti saját fájl megmarad. Átnevezett, ellenőrzött képfájltípus; nincs SVG/HTML és nincs tetszőleges távoli URL-feltöltés.
- Név, pontos cím, arc, rendszám vagy más felismerhető adat esetén dokumentált megfelelő jóváhagyás és irodai ellenőrzés kell; a program nem ígér automatikus személyesadat-felismerést.
- **A WordPress-piszkozat képfájljának URL-je is lehet nyilvánosan elérhető. Ezért a képek nyilvánosságra hozhatóságát már a feltöltés előtt ellenőrizni kell, nem csak a Publikálás gombnál.**
- A kimenet szűk engedélylistából épül; ügyféltörzs, pontos cím, munkatárslista, munkalap, belső ár, árrés, jutalék és Hasznos információk mező nem kerül automatikusan bele. A kézzel írt szöveg és képi tartalom ellenőrzése az iroda külön feladata.

## WordPress-kapcsolat és hibabiztos publikálás

- Csak a jóváhagyott saját `https://diszkertek.hu` cél és rögzített API-útvonalak használhatók; nincs szabad cél-URL vagy más hosztra követett hitelesített átirányítás.
- WordPress alkalmazásjelszó kizárólag szerveroldali titokként, a szükséges legszűkebb hozzáféréssel. Titkot nem kérünk a beszélgetésbe, nem mentünk böngészőbe, üzleti táblába vagy Gitbe. A WordPress- és ERP-belépés külön marad.
- Először hitelesített, csak olvasási képesség-/mezőellenőrzés, majd kifejezetten tesztnek kijelölt saját ERP-referencia piszkozatpróbája. A már létező weboldalbeállításokat és cikkeket nem írjuk át próbaként.
- Az első képfeltöltéshez is az adott tartalomra érvényes irodai ellenőrzés kell. Utána médiaazonosítónként folytatható feltöltés, ellenőrzött képgaléria és SEO-mentés; részhiba látható, nem jelenthető késznek.
- Új referenciánál `draft` a kezdeti állapot. A tényleges közzététel önálló, friss jogosultság- és változatellenőrzést kérő művelet. Offline kattintás nem jelent publikálást.
- **Már publikált cikk szerkesztése nem állíthatja piszkozatra a nyilvános oldalt, és nem változtathatja meg azonnal a látogatóknak látható tartalmat.** Az ERP külön szerkesztési változatot/előnézetet tart; a meglévő WP-azonosítót csak a külön jóváhagyott frissítés írhatja. Távoli közben szerkesztés esetén ütközést jelez.
- A távoli kérés előtt műveletnapló és determinisztikus egyeztetési azonosító készül. Elveszett válasznál előbb a meglévő távoli rekordot kell azonosítani; nem küldünk vakon új létrehozást. Ha a WP nem támogat biztonságos azonosító szerinti visszakeresést, a bizonytalan művelet kézi egyeztetést kér. Ezt a képességet külön próbával kell igazolni.
- Helyi visszavonás nem állítja, hogy egy már közzétett távoli változtatást is visszacsinált. WordPress-rekord/média törlése vagy visszavonása külön, egyértelmű megerősítést és használati függőségvizsgálatot igényel.
- Publikált URL, utolsó sikeres helyi/távoli változat, függő módosítás és javítható magyar hibaüzenet megjelenik. Technikai hiba vagy hiányzó SEO nem kaphat zöld sikerjelzést.

## Export, mentés és visszavonás

Webes előnézet és letölthető, optimalizált képeket tartalmazó csomag; külön Facebook-/Instagram-szöveg, képsorrend és másolás. Közvetlen FB-/Instagram-küldés nem indul, nincs új közösségi fiókkapcsolat.

A szerkesztési munkamenetben Visszavonás/Újra, a mentett változatoknál külön korábbi változat visszaállítása készül. Archiválás visszaállítható; pénzügyet, eredeti projektet és más forrásfájlt nem töröl. Revízióellenőrzés és idempotens kérés védi a többeszközös mentést. Hálózati hibánál megmarad a saját piszkozat, ütközésnél különbségnézet szükséges. Kijelentkezés/fiókváltás után más szereplő nem férhet hozzá az előző szerkesztő képeihez vagy szövegéhez.

## Megvalósítási és ellenőrzési sorrend

1. Forrásból előállított, ár- és személyesadat-mentes referenciamodell; három független változat; szintetikus egységtesztek.
2. A kilenc saját ERP-nyilvántartás és védett API helyi megvalósítása; szervezethatár, közvetlen táblajog, elavult revízió, ismételt kérés és nem irodai szerepek elutasításának adatbázistesztjei.
3. Mobil/asztali szerkesztő, helyi képválogatás, húzás és billentyűzet, bezárás, visszavonás, hiányzó fájl, csomag ki-/betöltés és egymástól független platformelőnézet.
4. Hitelesítés nélküli helyi WordPress-szimulátor: 401/403/429/5xx, megszakadt válasz, részleges kép-/SEO-mentés, duplikáció, szerveroldali célkorlátozás és távoli ütközés. Belső ár, jutalék, cím és titok kimeneti szivárgásának negatív tesztjei.
5. Saját ERP-telepítés csak tesztek és az adott adatbázisterv ellenőrzése után. A WordPress-kapcsolat bekapcsolásához valódi, biztonságosan beállított szerkesztői hozzáférés és sablonillesztési próba szükséges. Ez jelenleg nincs meg; a tesztekhez nem kérünk és nem találunk ki jelszót.
6. Teszt ügyfél/Geller Ágnes kijelölt munkája: forrás → szerkesztés → képcsoportok → három külön változat → letöltés → engedélyezett WP-piszkozat → külön ellenőrzött publikálás. A valódi nyilvános publikálás nem automatikus tesztlépés.

**Jelenleg kész:** PDF-összevetés, saját ERP-forráskapcsolatok és nyilvános WordPress-szerkezet felmérése, ez a terv. **Még nem kész:** a referencia-modul kódja, táblái, bekötése és üzleti próbája. A 0.15.0 készre jelentése ezeket nem foglalja magában.

## Ellenőrzött elsődleges források

- Helyi eredeti PDF: 20–21. fejezet, 12. oldal.
- [A saját weboldal nyilvános REST-típuslistája](https://diszkertek.hu/wp-json/wp/v2/types) és [útvonaltérképe](https://diszkertek.hu/wp-json/), csak olvasva 2026. november 5-én.
- [WordPress: REST-hitelesítés és alkalmazásjelszavak](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/).
- [WordPress: bejegyzések és állapotuk](https://developer.wordpress.org/rest-api/reference/posts/).
- [WordPress: média és képfelirat/alt szöveg](https://developer.wordpress.org/rest-api/reference/media/).
