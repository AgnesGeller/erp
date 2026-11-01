# A csatolt árajánlat-kalkulátor felmérése

Dátum: 2026. október 30. · Módszer: az eredeti XLSX ZIP/XML-adatainak, cellaértékeinek és képleteinek olvasása. A munkafüzet nem módosult és nem lett újramentve.

## Mit találtunk?

| Munkalap | Szerep |
| --- | --- |
| Kalkulátor | Kategória és típus kiválasztása, két mennyiségi mező, külön anyag- és munkadíj, nettó és ÁFA. |
| Adatbázis | 163 árazott típus 22 kategóriában; leírás, megjegyzés, mértékegységek és anyagösszetevők. |
| Részletező | Egyes munkák anyag- és munkadíjának szakmai költségbontása. |
| Minták | Három munkasablon kiinduló munkalistája. |

A 163 típus közül 144-nek nincs második mértékegysége. A többi 19 második mértékegysége: 8 cm, 5 t, 4 db és 2 m³. Az altípus-megnevezések között a vizsgált árlistasorokban nem találtunk pontos szöveges ismétlődést.

## Alapképletek

Második mértékegység nélkül:

- Anyagösszeg = anyag-egységár × első mennyiség.
- Munkadíjösszeg = munka-egységár × első mennyiség.

Második mértékegységgel:

- Anyagösszeg = anyag-egységár × első mennyiség × második mennyiség.
- Munkadíjösszeg = munka-egységár × első mennyiség × második mennyiség.

Nettó sorérték = anyagösszeg + munkadíjösszeg. Az ÁFA a nettó sorérték és az ÁFA-kulcs szorzata.

Az Excel több képletet shared formula formában tárol: az üres képletszöveg egyes celláknál nem bizonyít kézzel rögzített összeget. Az importálónak a megosztott képleteket és a hivatkozásokat is kezelnie kell.

Az új program a PDF szerinti paraméteres mennyiségekkel, rétegvastagság-kezeléssel, minimumdíjakkal, anyagjegyzékkel, ráhagyással és tervidővel bővíti ezt. A forrás árképzését nem cseréljük webes piaci árakra.

## A Minták lap megfeleltetése

| Sablon | Árlistához pontosan kapcsolható sorok | Állapot |
| --- | --- | --- |
| Füvesítés termőföld rátöltéssel | 6 / 6 | A kategória és típus szövege minden sornál pontosan egyezik. |
| Füvesítés rotakapálással, komposzttal | 7 / 7 | A kategória és típus szövege minden sornál pontosan egyezik. A forrás címében elírás van, megjelenítéskor javítható. |
| Járda építés | 1 / 6 | A Térkő rakás kapcsolható pontosan; öt sort szakmailag tisztázni kell. |

A Járda építés pontos megfeleltetés nélküli megnevezései:
- Tükör készítés.
- Szegély építés.
- Teherhordó réteg készítés.
- Ágyazó réteg készítés.
- Besöprés, vibrálás 3x.

Ezek általános munkanevek: az anyag, vastagság és kivitelezési mód nem választható ki pusztán hasonló megnevezés alapján. Nem készítünk belőlük kitalált, beárazott sablont. Az ERP szerkeszthető sablonként tudja majd kezelni a megrendelő által véglegesített változatokat.

## Fontos importszabályok

- Az eredeti kategória/típus, forráslap, forrássor és importazonosító megmarad; a felületen Kategória → Típus szerepel.
- A forrás régi vállalkozás- és készítőfeliratai nem kerülnek az új alkalmazásba.
- Az Adatbázis lap A oszlopában több #VALUE! érték van. Ez nem jelenti automatikusan a B–I árlistamezők hibáját; az A segédoszlop nem importálható jó típusazonosítóként.
- A végleges ajánlat nem kezelheti a hiányzó árat vagy szükséges mennyiséget észrevétlenül nullaként, még ha az Excel IFERROR ága ezt teszi is.
- Az Adatbázis J–U oszlopai négy név/mennyiség/mértékegység csoportot tartalmaznak; az ERP korlátlan anyagkapcsolatot kezel, az eredeti összetevők megőrzésével.
- A munkafüzetben 32 beágyazott médiafájl van. Ezek tartalmát és átvehetőségét külön kell megvizsgálni; nem másolhatók automatikusan nyilvános repositoryba.
- A munkafüzet üzleti áradatait nem tesszük a publikus frontendbe vagy GitHubra. Az import felhasználói hitelesítéshez és iroda szerephez kötött.
- A munkafüzetet ebben a vizsgálatban nem számoltuk újra Excelben. A teljes képletparitást a majdani számítási motor önálló tesztjeivel és ellenőrzött Excel-esetekkel kell bizonyítani.

## Megvalósítás előtti ellenőrzések

A 163 sor importja után ellenőrizni kell a megnevezést, kategóriát, mindkét mértékegységet, anyagárat, munkadíjat, megjegyzést és összetevőket. A megfelelő import nem csak a rekorddarabszám egyezését jelenti.

A három sablon minden sora visszavezethető legyen az árlistára vagy egy iroda által jóváhagyott egyedi sorra. A hiányzó járda-megfeleltetéseket a véglegesített sablonok előtt rendezni kell.

## 0.3.0 megvalósítási frissítés – 2026. november 1.

Az eredeti munkafüzet ismételt, csak olvasó ellenőrzése azonos forráslenyomatot és 163 / 22 / 3 darabszámot adott. Az új motor mind a 163 árlistasornál egyező alapár-szorzást adott. A második mértékegység nélküli és két mennyiséges eset külön tesztelt; a PDF első mennyisége nem keveredik a szorzott árazási tényezővel.

Az öt járdasablonsor pontos típusát a megrendelő kifejezett válasza szerint az ERP-ben választja ki. Az Excelből nem vettünk át KAP/Árajánlat-adatot vagy készítői feliratot. A részletes új működés: [Árajánlatmodul](arajanlatmodul.md). A felhős adatbázis-telepítés külön jóváhagyásra vár.
