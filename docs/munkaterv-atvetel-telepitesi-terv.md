# Részletes munkaterv és négyszintű átvétel – telepítési terv

2026. november 2. **A felhasználó jóváhagyta a terv szerinti megvalósítást és tesztek utáni ERP-élesítést. A jóváhagyott telepítés 2026. november 3-án megtörtént; használat: [Munkaterv és átvétel](munkaterv-es-atvetel.md).** Alap: a teljes PDF 14–15. fejezete, a 22. fejezet invariánsai és a 25. fejezet 11., 14–17. és 28. átvételi próbája. A kiegészítés Építésvezető/Karbantartásvezető megnevezései és azonos Kertész/Kertépítő engedélyei érvényesek.

## Az elkészítendő működés

- Az elfogadott ajánlat tételes pillanatképéből készülő munkafázisok, főtételek szerint csoportosítva. Az ajánlati munkadíj és eredeti tervidő megmarad; munkarendezés vagy időterv-módosítás nem ír ügyfélárat.
- Húzással és érintőképernyős fel/le gombokkal rendezhető sorrend, előfeltételek, párhuzamos feladatok, egyeztetett idővonal. Körkörös vagy saját magára mutató függőség tiltott. A terv az irodának Indításra vár állapotban is szerkeszthető, a dolgozók csak külön indítás után férnek hozzá.
- Négy tényleges átvétel: Kertész/Kertépítő → Építésvezető → Iroda → Megrendelő. Minden műveletnél a személy, az aktív szerep, az időpont és a képviselt/teljesítményt kapó emberek külön naplózottak.
- Felsőbb átvétel az alsóbb sávok számított eredményét is növeli; hiányzó alsó pipát nem gyárt. A sáv a tényleges jóváhagyó színével indul, majd az alsó tényleges résztvevők megosztásához igazodik.
- Egy munkafázis munkadíja egyszer számít bele a projektbe. A részesedés alapból egyenlő, vagy kézzel összesen 100%; legfeljebb két tizedesű százalék. Vezetői módosítás után csak vezető/iroda, irodai módosítás után csak iroda módosíthatja. A belső megosztás változása nem ír ügyfélárat vagy átvételt.
- Visszaküldés indokkal, választható javítási címzettel és több helyi fotóval. Új átvételi kör kezdődik: a régi pipák történetként megmaradnak, a fázis aktuális teljesítése visszaesik, és új tényleges átvételek szükségesek. Minden érintett korábbi alsó pipáló értesítést kap; a statisztika a korábbi pipálókat és a javítási címzettet külön mutatja.
- Négy munkadíjjal súlyozott teljesítménysáv, személyszínekkel; eredeti és módosított tervezett emberperc. Nullás munkadíjú fázis külön darabszámos tájékoztatót ad, nem okoz nullával osztást.
- Személyes Teendőim és értesítések ugyanahhoz az egy szerveroldali eseményhez kapcsolódnak; a teendőből és a munkalapról végzett azonos művelet nem duplázódik.
- A megrendelő saját kijelölt címének munkatervét és átvételét látja. Az ügyfél átvétele elszámolhatóságot jelent, nem igazolt befizetést. Belső anyagbeszerzés, haszon, jutalék és munkautasítás nem kerül az ügyfélnézetbe.

## Dolgozói belépés – szükséges előfeltétel

A dolgozóknak és vezetőknek jelenleg van ERP-személyük és munkamegbízásuk, de saját ERP-belépésük még nincs. Emiatt a négyszintű folyamatot nem lenne helyes kizárólag az irodai felület gombjaival késznek jelenteni.

Javaslat: az iroda a meglévő dolgozót kiválasztva adjon neki külön ERP-fiókot. Belépés valódi e-mail-címmel és legalább 12 karakteres saját jelszóval; kézi meghívó/visszaállítás, egyszer használható lejáró hivatkozás. A dolgozó a saját munkáján kizárólag a neki kiosztott, érvényes szerepek közül választhat. Az iroda saját PIN-fiókja és az ügyfélbelépés megmarad. Más alkalmazás fiókját vagy jelszavát nem használjuk fel.

A dolgozói fiók a meglévő személyhez kötődik, nem hoz létre második dolgozói személyt. Az irodai személy a meglévő saját fiókjával válthat az engedélyezett munkaszerepeire; nem kap második, az irodai PIN-t felülíró fiókot.

## Tíz új, kizárólag ERP-s tábla

| Objektum | Tartalom |
| --- | --- |
| erp.workplans | Projekthez és elfogadott ajánlatverzióhoz kötött terv, revízió és létrehozási előzmény. |
| erp.project_tasks | Forrássorhoz kötött fázis, sorrend/időterv, eredeti és aktuális tervezett perc, belső munkautasítás, tényleges átvételi állapot, részesedés és zárolási szint. |
| erp.task_dependencies | Munkafázisok közti előfeltételek, ugyanahhoz a tervhez kötve, körök nélkül. |
| erp.task_events | Megőrzött átvételi/visszaküldési/terv-/megosztási események, előző/új állapot, tényleges gombnyomó, aktív szerep, képviselt személyek és egyszeri kérésazonosító. A megosztás változatelőzménye is itt marad. |
| erp.work_notifications | Személyes teendők és értesítések, címzett, projekt/fázis/esemény, olvasási és intézési állapot. |
| erp.person_colors | Személyszínek és eredetük, irodai módosítási előzménnyel. A Napi feladatok színforrását csak olvassuk. |
| erp_private.staff_accounts | A meglévő dolgozóhoz kötött új saját belépés, technikai Auth-azonosító, aktív állapot, revízió és hitelesítési generáció. Jelszó nincs benne. |
| erp_private.staff_setup_links | Egyszer használható meghívó/visszaállító token lenyomata és lejárata, párhuzamos beállítás elleni zárolás. |
| erp_private.staff_sessions | Saját dolgozói munkamenetek érvényessége és visszavonása, tokenek tárolása nélkül. |
| erp_private.staff_recovery_requests | Kézi irodai jelszó-visszaállítási kérések, fiók-felsorolást nem engedő nyilvános válasszal. |

Minden új tábla RLS/FORCE RLS védett. Új, szerepkörönként szűrt ERP-végpontok készülnek. Az ERP saját azonosítási segédje és munkamenet-ellenőrzése a dolgozói ággal bővül; az ügyfél/iroda viselkedését regressziós tesztek védik. A régi alkalmazások táblái, jogosultságai, Auth-beállításai és kódja nem változnak.

## Fájlok és költség

Fotó nem kerül Supabase Storage-be. A képek az adott eszköz saját ERP-tárában maradnak, és jogosultság szerint szűrt letölthető csomaggal adhatók át. A szerveren csak fájlazonosító/név és a szöveges esemény szerepel. Fájlátadás nélkül a másik eszköz nem ígérhet megnyitható képet. Új előfizetés, SMTP vagy külső szolgáltató nincs.

## Biztonság és ellenőrzés

1. Helyi szintetikus adatbázis: másik projekt/ügyfél/szervezet kizárása, lejárt és visszavont megbízás, indítás előtti dolgozói tiltás, saját munkamenetek és szerepváltás.
2. PDF 850 000 / 8 500 Ft-os példája; magasabb átvétel hamis pipa nélkül; megrendelő közvetlen átvétele; 70/30 és 60/40 megosztás; egyszeres beszámítás és jogosultsági zárolás.
3. Több korábbi pipáló visszaküldése, statisztika és értesítések, módosított javítási címzett, új átvételi kör. Az aktuális elfogadás és a történeti esemény külön marad.
4. Párhuzamos és ismételt mentés, elveszett válasz utáni újrapróbálás, körkörös függőség, mobil és asztali nézet, helyi fotók hiánya/eszközök közti csomagátadás.
5. Az eredeti ERP-jogosultsági függvények és saját szerepjogok mentése; tranzakciós telepítés és ellenőrzött saját gateway; a 212 meglévő teszt regressziója. Ezután rövid README-frissítés, main commit és push.

A teljes munkaidős ötödik sáv, a tényleges anyagmozgások és pénzügyi elszámolás saját következő moduljuk adataiból épülnek; a munkaterv nem helyettesíti ezeket kitalált nullaértékekkel. A részletes feladatgráf és a négy tényleges átvételi szint ebben a fejlesztési egységben készül el.
