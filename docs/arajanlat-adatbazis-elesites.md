# Árajánlatmodul – konkrét élesítési terv

Állapot: helyben tesztelt, a megrendelő kifejezetten jóváhagyta a nyolc saját tábla, az ERP-munkakapcsolat, az árlistabetöltés és a kiszolgáló/frontend élesítését. Az automatikus jóváhagyási ellenőrzés a felhős migrációt elutasította, mert az általános modulfejlesztési engedélyt nem tekintette e konkrét éles sémamódosítás jóváhagyásának. A visszautasított migráció nem futott le. Más végrehajtási úton nem kerüljük meg.

## Pontosan mi változna?

A már jóváhagyott kap infrastruktúrában, kizárólag az ERP saját objektumai között:

| Új objektum | Cél |
| --- | --- |
| erp.price_books | Aktuális irodai árlista, munkasablonok és információsablonok |
| erp.price_book_versions | Korábbi, változatlan árlistapillanatképek |
| erp.quotes | Ajánlatazonosító, ügyfél/cím, aktuális változat és állapot |
| erp.quote_versions | Megváltoztathatatlan tételes ajánlat-, kalkuláció- és ügyfélpillanatképek |
| erp.quote_events | Mentés, kiküldési visszaigazolás, döntés és indítás eseményei |
| erp_private.quote_requests | Ismételt mentés elleni védelem |
| erp_private.quote_counters | Párhuzamosan is egyedi ajánlatsorszám |
| erp_private.quote_mail_jobs | Kézi kiküldés rögzítése: címzett, tárgy, szöveg, PDF-lenyomat és kezelő |

Az erp.garden_projects kizárólag saját ERP-táblája két ajánlatkapcsolati mezővel és idegen kulccsal egészül ki. A munkastátusz-korlát az Indításra váró és Futó kertépítést is engedi, kizárólag elfogadott ajánlatkapcsolattal. Elfogadás inaktív, indításra váró munkát ad; külön irodai indítás aktiválja. A már meglévő karbantartási/előké­szi­tési szabály megmarad. A vizsgálatkor nulla ERP-munka volt; a migráció nem töröl és nem egyesít munkát.

Új public.erp_quote_* és public.erp_quotes_list függvények jönnek létre. Anonim futtatási jog nincs. Közvetlen böngészős táblahozzáférés nincs. Az új táblák FORCE RLS-sel védettek. A normál olvasás erp_api szereppel és aktív irodai ellenőrzéssel működik; számított adatot kizárólag a saját gateway írhat, ismételt irodai jogosultságellenőrzéssel.

## Mi tölthető be?

A megrendelő csatolt Exceljéből 163 árazott típus, 22 kategória és három sablon. A betöltés a saját irodai árlistába történik; üzleti ár nem kerül a publikus GitHubra. A három sablonból a járdasablon öt sorát a megrendelő az ERP-ben pontosítja. Régi KAP- vagy Árajánlat-alkalmazási adatot nem veszünk át.

## Mi marad érintetlen?

A régi Munkalap, Kassza, Napi feladatok és Munkabér kódja, táblái, jogosultságai, függvényei és adatai. Auth-fiókot, PIN-t, belépési rendszert nem módosítunk. A meglévő ügyfél/címadatot csak olvassuk. Nincs automatikus Kassza-könyvelés vagy Munkabér-kapcsolat. Nincs SMTP-beállítás, tényleges automatikus e-mail vagy új előfizetés.

## Végrehajtási és ellenőrzési sorrend jóváhagyás után

1. A helyben ellenőrzött database/proposals/erp-quotes.sql migráció telepítése kizárólag az ERP infrastruktúrájába.
2. FORCE RLS, anonim/közvetlen hozzáférés és service-only írás ellenőrzése; az új saját objektumok jogosultságainak vizsgálata.
3. Az Excelből előkészített árlista betöltése az ERP saját irodai árlistájába, 163 típus / 22 kategória / 3 sablon és forráslenyomat visszaellenőrzésével.
4. A saját erp-gateway frissítése, azonos bejelentkezési szabállyal. A PDF-könyvtárak csak az ERP saját funkciójában működnek.
5. README és fejlesztési napló aktualizálása, commit és push a main ágra. Csak működő kiszolgáló után kerül online az új frontend; az API nélküli felületet nem tesszük ki.
6. Online belépés, árlista/sablonok, címválasztás, ajánlati szerkesztő, PDF és reszponzivitás ellenőrzése. Éles kitalált üzleti rekordot nem hozunk létre ellenőrzés címén.

A telepítés új táblákat és üzleti állapotszabályt hoz létre. Ezért szükséges a kifejezett jóváhagyás; a commit/push korábbi engedélyét nem tekintjük az automatikusan elutasított adatbázisművelet felülbírálásának.

## Jóváhagyás és végrehajtás

A megrendelő válasza: „Igen, ezt az ERP-élesítést jóváhagyom”. Ezután ugyanaz a migráció sikeresen lefutott; az irodai árlista 1. változatába 163 típus, 22 kategória és három sablon került. Forráslenyomat: 0eee6b84fdedf83cf32a46b807a989e49ddba483e295addb10db727b4ba020ef. Az erp_quote_audit_display_names saját kiegészítés a napló emberi szerzőnevét adja vissza a már engedélyezett irodai fiók/személy kapcsolatból; más alkalmazás jogosultsága nem változik. A saját gateway 10. verziója aktív.
