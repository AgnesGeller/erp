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

### Döntésre vár

Az adatbázis helye még nem jóváhagyott. A megrendelő a külön erp séma létrehozása előtt részletes tervet kért. Emiatt nincs adatbázis-migráció, ERP-fióklétrehozás, titokbeállítás vagy forrásírás.

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
