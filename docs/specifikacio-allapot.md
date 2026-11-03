# A fejlesztői PDF teljesítési állapota

Ellenőrzés: **2026. november 3. – ERP 0.7.0**. Alap: a 15 oldalas teljes fejlesztői specifikáció, a kiegészítés és az azóta jóváhagyott döntések. Ez állapotfelmérés, nem készre jelentés. A teljes megbízásból az alábbi hátralévő részek is megvalósítandók.

| Terület / PDF-fejezet | Jelenlegi állapot | Mi hiányzik még? |
| --- | --- | --- |
| Alapok, emberek, jogosultságok | Saját Ági/Tamás irodai és külön ügyfélbelépés; irodai címkijelölés, kézi meghívó/visszaállítás; időben változó munkatársi megbízások | Saját dolgozói belépés, kézi meghívó és munkánkénti szerepválasztás kész. Első valódi dolgozó/ügyfél meghívása és a teljes üzleti lánc próbája az iroda valós munkáival szükséges. |
| Ügyfelek, munkavégzési címek | Munkalap-központú ügyfélolvasás; külön engedéllyel új ügyfél és első cím mentése; címhez kötött saját ERP-munkák | Teljes átállási adat- és eszközszinkron-ellenőrzés; meglévő forrásadatot módosító szinkron nincs engedélyezve |
| Felmérések – 7. fejezet | Kézi jegyzetek, méretek, eredeti szöveg, helyi fotó/hang, csomagletöltés, szöveges verziók, kézi ajánlatindítás | Saját Groq-kulccsal valós magyar hang-/jegyzetrendezési próba; folyamatos diktálás, MI-s típusillesztés és ajánlatjavaslat; teljes offline belépési/ütközési próba |
| Árlista, képletek, sablonok – 8–10. | Az Excel 163 típusa, 22 kategóriája, három sablon; pontos számítás, minimumdíjak, anyagjegyzék, szerkeszthető árlistaváltozatok | Tetszőleges beszállítói Excel oszlopmegfeleltetése; a teljes közös beszerzési anyagtörzs. A járdasablon rétegeit a főnök az adott ajánlatnál választja ki |
| Ajánlatszerkesztés, PDF – 11. | Két PDF-mód, folyamatosan nyitva tartható/frissülő előnézet, hiányos munkaváltozat, kiemelt összesítők, két tizedes megjelenítés; törölhető sorok, Visszavonás/Újra az ajánlatban és árlistában | Valódi üzleti ajánlat közös átvételi próbája; MI-s kísérőlevél-javaslat |
| Kézi levelezés – 11. | Választható levelező, másolás és PDF-mellékletes EML, kézi küldés tényének külön visszaigazolása | Automatikus küldőszolgáltatás nincs bekapcsolva, a felhasználó kifejezetten kézi küldést kért |
| Ajánlat-életciklus – 12. | Piszkozat → elkészült → kézi kiküldés visszaigazolása → elfogadás/elutasítás; revízió, visszavonás, megőrzött pillanatképek; külön kertépítés-indítás | Saját ügyfélportál a kiküldött ajánlatok és munkastátuszok követésére kész; a négyszintű átvétel kész; a jóváhagyott pénzügyi változáskérelmek összekötése még hiányzik |
| Nyolc bejegyzéstípus – 13. | Még nincs kész | Extra, módosítás, törlési kérelem, megjegyzés, kérés, panasz, hiba, káresemény; kétoldalú jóváhagyás és napló |
| Kivitelezés – 14–15. | Vizuális munkaterv, függőségek és dátumos idővonal, négyszintű átvétel, négy személyszínes sáv, zárolt megosztás, javítás, teendők és statisztika kész | Tényleges munkaidő ötödik sávja a saját ERP-munkalapból; anyagelőrehaladás és jóváhagyott ajánlatváltozások összekötése |
| Munkalap, beszerzés, pénzügy – 15–18. | Az ajánlatból tervezett munka-/anyagérték rendelkezésre áll | Saját ERP-munkalap, tényleges anyagmozgások, előleg/kifizetés/jóváhagyás, eredmény és éves jutalék; nincs kész pénzügyi könyvelés |
| Kertkarbantartás – 19. | Címhez kötött igény és irodai elfogadás alapja kész | Teljes karbantartási munkalap és elszámolási folyamat |
| Naptár, referenciák – 20. | Nem kész funkciók nem érhetők el | Irodai naptár és kapcsolók, referencia-szerkesztés, web/FB/Instagram-változatok, WordPress-piszkozat szinkron és külön publikálás |
| Adatvédelem, offline, törlés – 21–23. | Saját ERP-sémák; szerveroldali ellenőrzések, mentési revízió/idempotencia; helyi felmérési fájlok | Teljes szerepkörös/offline próbák, összetett projekt-/médiatörlés függőségvizsgálattal, pénzügyi megőrzéssel; minden modulra kiterjedő törlés/visszavonás még nincs kész |
| Átadás – 24–27. | Modulonkénti tesztek és napló | A 28 átvételi forgatókönyv teljes lánca; felmérés → ajánlat → kivitelezés → átvétel → pénzügy → lezárás → referencia, és a karbantartási lánc éles átadási próbája |

## A PDF óta jóváhagyott pontosítások

- A meglévő Munkalap, Kassza, Napi feladatok és Munkabér működését nem módosítjuk. KAP/teszt-árajánlat adatait nem vesszük át. Az ERP a kap Supabase-projekt saját sémáiban működik.
- Fotó/hang/ZIP egyelőre helyben marad és letölthető; Supabase-ben csak szöveges adatok és fájlazonosítók. Ez tudatos eltérés a PDF Storage-javaslatától.
- A levélküldés egyelőre manuális. A levelező megnyitása nem jelent elküldést. Webes levelezőnél a PDF külön csatolandó; az EML használata a levelező támogatásától függ.
- Legfeljebb két tizedes látható a szokásos számmezőkben és PDF-ben. A számítás és az apró belső anyagszorzók pontosak maradnak.
- A visszavonás a jelenlegi szerkesztési munkamenetben működik. A régi mentett pillanatképek megmaradnak; kiküldött/elfogadott megállapodást nem írunk át egyszerű Undo művelettel.

**Következő nagy fejlesztési egység:** a 13. fejezet nyolc bejegyzéstípusa és kétoldalú változáskezelés, majd saját ERP-munkalap és tényleges munkaidő. A munkaterv és négyszintű átvétel 0.7.0-ban elkészült; [használata](munkaterv-es-atvetel.md). Az ügyfélportálhoz az öt saját ERP-nyilvántartást és a kézi meghívót/visszaállítást a felhasználó jóváhagyta; saját migráció és gateway telepítve. [Ügyfélportál használata](ugyfelbelepes.md).
