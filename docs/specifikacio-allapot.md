# A fejlesztői PDF teljesítési állapota

Ellenőrzés: **2026. november 6. – ERP 0.16.5**. Alap: a 15 oldalas teljes fejlesztői specifikáció, a kiegészítés és az azóta jóváhagyott döntések. Ez állapotfelmérés, nem készre jelentés. A teljes megbízásból az alábbi hátralévő részek is megvalósítandók.

| Terület / PDF-fejezet | Jelenlegi állapot | Mi hiányzik még? |
| --- | --- | --- |
| Alapok, emberek, jogosultságok | Saját Ági/Tamás irodai és külön ügyfélbelépés; irodai címkijelölés, kézi meghívó/visszaállítás; időben változó munkatársi megbízások | Saját dolgozói belépés, kézi meghívó és munkánkénti szerepválasztás kész. Első valódi dolgozó/ügyfél meghívása és a teljes üzleti lánc próbája az iroda valós munkáival szükséges. |
| Ügyfelek, munkavégzési címek | Munkalap-központú ügyfélolvasás; külön engedéllyel új ügyfél és első cím mentése; címhez kötött saját ERP-munkák | Teljes átállási adat- és eszközszinkron-ellenőrzés; meglévő forrásadatot módosító szinkron nincs engedélyezve |
| Felmérések – 7. fejezet | Kézi jegyzetek, méretek, eredeti szöveg, helyi fotó/hang, csomagletöltés, szöveges verziók, kézi ajánlatindítás | Saját Groq-kulccsal valós magyar hang-/jegyzetrendezési próba; folyamatos diktálás, MI-s típusillesztés és ajánlatjavaslat; teljes offline belépési/ütközési próba |
| Árlista, képletek, sablonok – 8–10. | Az Excel 163 típusa, 22 kategóriája, három sablon; pontos számítás, minimumdíjak, anyagjegyzék, szerkeszthető árlistaváltozatok | Tetszőleges beszállítói Excel oszlopmegfeleltetése. A közös anyagtörzs 0.10.0-ban elkészült. A járdasablon rétegeit a főnök az adott ajánlatnál választja ki |
| Ajánlatszerkesztés, PDF – 11. | Két PDF-mód, folyamatosan nyitva tartható/frissülő előnézet, hiányos munkaváltozat, kiemelt összesítők, két tizedes megjelenítés; törölhető sorok, Visszavonás/Újra az ajánlatban és árlistában | Valódi üzleti ajánlat közös átvételi próbája; MI-s kísérőlevél-javaslat |
| Kézi levelezés – 11. | Választható levelező, másolás és PDF-mellékletes EML, kézi küldés tényének külön visszaigazolása | Automatikus küldőszolgáltatás nincs bekapcsolva, a felhasználó kifejezetten kézi küldést kért |
| Ajánlat-életciklus – 12. | Piszkozat → elkészült → kézi kiküldés visszaigazolása → elfogadás/elutasítás; revízió, visszavonás, megőrzött pillanatképek; külön kertépítés-indítás | Saját ügyfélportál a kiküldött ajánlatok és munkastátuszok követésére kész; a négyszintű átvétel kész; a kétoldalú változáskezelés 0.8.0-ban elkészült |
| Nyolc bejegyzéstípus – 13. | Nyolc típus, kétoldalú pontos jóváhagyás, változatnapló, hiba/kár, munkatervi kapcsolat és helyi fotócsomag kész | Valódi üzleti munka közös átadási próbája |
| Kivitelezés – 14–15. | Vizuális munkaterv, függőségek és dátumos idővonal, négyszintű átvétel, négy személyszínes sáv, zárolt megosztás, javítás, teendők és statisztika kész | A saját ERP-munkalap és az ötödik, tényleges idő sávja 0.9.0-ban kész. A tényleges anyagmozgások és anyagelőrehaladás 0.10.0-ban kész; közös üzleti átadási próba szükséges |
| Munkalap, beszerzés, pénzügy – 15–18. | Az ajánlati tervértékek, saját kertépítési munkalap, személyenkénti tényleges idő, anyagmozgások/100–70–0 anyagköltségalap és megőrzött javítás/visszavonás kész | Saját ERP-előleg, részfizetés, fizetési igény/szándék, irodai igazolás, korrekció, belső eredmény és éves jutalék 0.11.0-ban elkészült. Valódi üzleti átadási próba szükséges; külső számlázó/banki/Kassza-könyvelés nincs bekapcsolva. |
| Kertkarbantartás – 18. | Saját igény/visszahívás, irodai jóváhagyás, csapatidős munkalap, védett egységárak/Egyéb, kötelező teljes áras előnézet, közzétett PDF, ügyfél-fizetési jelzés és külön irodai igazolás 0.12.0-ban kész | Valódi üzleti átadási próba; 25 aktív átvett törzsár irodai ellenőrzése; régi munkalapok/elszámolások külön átállási átvétele |
| Naptár és Napi feladatok – 19. | Napi/heti/havi irodai naptár, teljes egyirányú Napi-import, szerkesztés, PDF/ZIP, törzsek/ismétlések, kapacitás/blokkok, saját emlékeztetők és alapból kikapcsolt szerepkapcsolók 0.14.0-ban kész | Irodai munkaablakok/végidők megadása; valódi eszközös értesítési és közös üzleti próba. A dolgozói/ügyfélkapcsolók kikapcsoltak. |
| Referenciák – 20. | 0.16.0: irodai szerkesztő, tényleges teljesítési/anyagforrás, négy helyi képcsoport, külön web/FB/Instagram-változat, ZIP, előzmény/archiválás; védett WordPress-adapter helyi szimulátorral tesztelve | WordPress-hozzáférés november 6-án sikeresen ellenőrizve; a valódi sablon-/SEO-illesztés, piszkozat és kézi közzététel véglegesítése még hátravan; opcionális MI-vázlat saját Groq-kulccsal. [Használat](referenciamunkak.md) |
| Adatvédelem, offline, törlés – 21–23. | Saját ERP-sémák; szerveroldali ellenőrzések, mentési revízió/idempotencia; helyi felmérési fájlok | Teljes szerepkörös/offline próbák, összetett projekt-/médiatörlés függőségvizsgálattal, pénzügyi megőrzéssel; minden modulra kiterjedő törlés/visszavonás még nincs kész |
| Átadás – 24–27. | Modulonkénti tesztek és napló | A 28 átvételi forgatókönyv teljes lánca; felmérés → ajánlat → kivitelezés → átvétel → pénzügy → lezárás → referencia, és a karbantartási lánc éles átadási próbája |

## A PDF óta jóváhagyott pontosítások

- A meglévő Munkalap, Kassza, Napi feladatok és Munkabér működését nem módosítjuk. KAP/teszt-árajánlat adatait nem vesszük át. Az ERP a kap Supabase-projekt saját sémáiban működik.
- Fotó/hang/ZIP egyelőre helyben marad és letölthető; Supabase-ben csak szöveges adatok és fájlazonosítók. Ez tudatos eltérés a PDF Storage-javaslatától.
- A levélküldés egyelőre manuális. A levelező megnyitása nem jelent elküldést. Webes levelezőnél a PDF külön csatolandó; az EML használata a levelező támogatásától függ.
- Legfeljebb két tizedes látható a szokásos számmezőkben és PDF-ben. A számítás és az apró belső anyagszorzók pontosak maradnak.
- A visszavonás a jelenlegi szerkesztési munkamenetben működik. A régi mentett pillanatképek megmaradnak; kiküldött/elfogadott megállapodást nem írunk át egyszerű Undo művelettel.

**Jelenlegi következő ellenőrzési pont:** a 0.16.5 referenciamodul valódi WordPress-piszkozatának megjelenési jóváhagyása és a közös üzleti átadás. A kapcsolat és a jogosultság ellenőrzése sikeres; a szerkesztés oldalanként egy teendővel, Vissza/Tovább gombokkal történik. A szerkesztő, helyi képek és három exportváltozat elkészült; [rövid használat](referenciamunkak.md). A 19. fejezet naptára 0.14.0-ban elkészült; [rövid használat](naptar-napi-feladatok.md). A 18. fejezet karbantartási munkalapja és elszámolása 0.12.0-ban elkészült; [használata](kertkarbantartas.md). A 16–17. fejezet saját ERP-pénzügyei 0.11.0-ban elkészültek; [használat](penzugyi-elszamolas.md). Az anyagbeszerzés, részszállítás és anyagelőrehaladás 0.10.0-ban elkészült; [használata](anyagkezeles.md). A saját kertépítési munkalap és az ötödik időjelző sáv 0.9.0-ban elkészült; [használata](munkalap-munkaido.md). A 13. fejezet bejegyzés- és változáskezelése 0.8.0-ban elkészült; [használata](bejegyzesek.md). A munkaterv és négyszintű átvétel 0.7.0-ban elkészült; [használata](munkaterv-es-atvetel.md). Az ügyfélportálhoz az öt saját ERP-nyilvántartást és a kézi meghívót/visszaállítást a felhasználó jóváhagyta; saját migráció és gateway telepítve. [Ügyfélportál használata](ugyfelbelepes.md).

Pénzügyi pontosítás: éven átnyúló kertépítés jutaléka a lezárás évéhez tartozik; addig előzetes. A teljes vezetői áttekintés, külön csoportosított Teendőim, push értesítés, Adataim és önálló dolgozói projektcsatlakozás továbbra is nyitott feladat. A meglévő típusonkénti 100-as anyagkorlát eltér a PDF korlátlan igényétől.

## 0.13.0 – Munkacsomag és áttekinthetőbb navigáció

Az eredeti üzleti szabályok megtartásával elkészült a Kiss Csaba-minta szerinti munkacsomag: külön ár nélküli csapat-, saját ügyféláras megrendelői és belső irodai PDF. A részfeladatok négyszintű átvétele változatlan. Négy kezdőlapi út és három munkatervnézet segíti a használatot; [rövid útmutató](munkacsomag.md). Az előző táblázat további hiányai és a teljes üzleti átadás még nyitottak.


## 0.14.1 – Munkanapi anyagkapcsolat és következő pontosítás

A kertépítési napi munkalapon elérhető az adott nap beszállítás/beépítés összesítése és rögzítőfelülete, valamint az irodai anyagtörzs. A korábbi időlap-export nem tartalmazza automatikusan az anyagnaplót. A főnök új, területeken átívelő sorszámos részszakaszai és azok szabad, húzással történő szerkesztése még következő fejlesztés; [rögzített követelmények](fonoki-szakaszolas-pontositas.md).


## 0.15.0 – Kivitelezési szakaszok és részfolyamatok

Elkészült a területeken átívelő, sorszámos szakaszolás; a kategória-/típusszintű részfolyamatok; a rögzített ajánlati alap; a kézi/húzásos és billentyűzetes rendezés. Az átvétel, napi munkaidő, pénzügyi/jutaléksúly és PDF a saját részfeladatokat követi. A meglévő munkák csak külön, irodai ellenőrzés után válthatók át. [Rövid használat](szakaszolas-hasznalat.md).

A korábban rögzített további főnöki kérésekből az önálló negyedik, építésvezetői munkacsomag, a jutalékarány, a központi földtérfogat-ráhagyás és a külön dolgozói színbeállító felület még hátravan. A teljes ERP és üzleti átadás további nyitott pontjai továbbra is érvényesek.


## 0.16.0 – Referenciamunkák és összefüggő bemutatóteszt

Kilenc saját ERP-tábla, védett irodai műveletek, ténylegesen átvett munkák és beépített anyagok, szerkeszthető szöveg, négy helyi képcsoport, három független platformváltozat, előnézet/ZIP, helyi mentés és megőrzött változatelőzmények. A WordPress-adapter alapból kikapcsolt; nem történt valódi képfeltöltés vagy publikálás. A teljes helyi üzleti lánc külön tesztben végigfutott; [bemutatási útmutató és ellenőrzési határok](bemutato-2026-11-10.md).


## 0.16.9 – Külön építésvezetői munkacsomag

Elkészült a negyedik digitális/nyomtatható változat, külön beszerzési áttekintéssel és közös visszautasítási indokokkal, meglévő munkamegbízáshoz kötött szerveres ellenőrzéssel. Belső eredményt és jutalékot nem tartalmaz. A korábbi hiánylistából ez a pont lezárult; a jutalékarány és a központi beállítások továbbra is nyitottak. [Rövid használat](munkacsomag.md).
