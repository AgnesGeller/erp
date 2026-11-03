# Munkaterv és négyszintű átvétel

## Megnyitás

Belépés után a felső **Munkaterv és teendők** gombot válaszd. A munka és az aktív munkaszerep lenyíló listából választható. Dolgozóként kizárólag a munkánál érvényesen kiosztott szerepek jelennek meg. Az iroda az alsó belső szinteken is eljárhat, a tényleges gombnyomó naplózásával.

A munkaterv alapja az elfogadott ajánlat. Az iroda Indításra vár állapotban is összeállíthatja; a dolgozó csak a kertépítés külön elindítása után fér hozzá. Az ügyfél a számára engedélyezett munkavégzési címek kertépítéseit látja.

## Sorrend és ütemezés

Az iroda a munkafázisokat a főtétel szerint csoportosított lenyílókban rendezi: húzással vagy **Feljebb / Lejjebb** gombokkal. Beállítható kezdő és befejező nap, előfeltétel és belső munkautasítás. Az idővonalon az azonos időszakra tett munkák párhuzamosan láthatók. Önmagára mutató vagy körkörös függőség nem menthető.

A **Munkaterv mentése** rögzíti a változást. A helyi szerkesztésnél **Visszavonás / Újra**, az előzményeknél korábbi sorrend új változatként történő visszatöltése használható. Elfogadott ajánlati fázist ebből a nézetből nem törlünk; az ügyfélárat a sorrend és időterv változtatása nem írja át. Az eredeti tervidő mindig megmarad.

## Átvétel és megosztás

A négy szint: **Kertész/Kertépítő → Építésvezető → Iroda → Megrendelő**. A fázisnál nyisd le az Átvétel és javítás részt, szükség esetén válassz szintet és tényleges résztvevőket, majd rögzítsd az átvételt.

A pipa tényleges átvételt jelöl. A magasabb átvétel növeli az alsó számított teljesítményt is, de hiányzó alsó pipát nem hoz létre. A színes sávok a fázisok ajánlati munkadíjával súlyoznak; ugyanaz a fázis több résztvevő esetén is csak egyszer számít. A nullás munkadíjú fázisok külön darabszámként szerepelnek.

A teljesítménymegosztás összesen 100%. Vezetői módosítás után vezető/iroda, irodai módosítás után csak iroda szerkesztheti. A megosztás módosítása nem jelent új ügyfélárat vagy új átvételt. A személyszínek irodai szerepben módosíthatók.

## Javítás és teendők

Visszaküldéshez indok kell; több fotó és más javítási címzett is megadható. Ha korábban nem volt alsó átvétel, a címzettet külön válaszd ki. Új átvételi kör kezdődik, az érintett előrehaladás visszaesik, az előző kör eseményei megmaradnak. A tényleges korábbi pipálók és a javítás címzettje külön szerepelnek a nyilvántartásban.

A Teendőim értesítés ugyanahhoz a fázishoz vezet, ahol a művelet elvégezhető. A statisztika napra, hétre, hónapra, évre vagy egyéni dátumokra szűrhető az adott munkán belül. A dolgozó a saját, a vezető és iroda a projektcsapat statisztikáját látja. Az ügyfél nem kap belső statisztikát, utasítást, részesedést vagy beszerzési adatot.

## Dolgozói belépés

Az iroda **Dolgozói hozzáférések** alatt kiválasztja a már meglévő munkatársat, megadja a belépési e-mail-címet, menti a hozzáférést, majd beállító hivatkozást készít. A hivatkozást kézzel küldi el. A munkatárs saját, legalább 12 karakteres ERP-jelszót állít be, utána a **Dolgozói belépés** gombbal lép be. Az irodai PIN és a megrendelői belépés külön marad.

Az elfelejtett jelszó kérése az irodának szól; nem állítunk automatikus levélküldést. A lejáró, egyszer használható hivatkozás új ERP-fiókhoz vagy bizonyítottan saját ERP-jelszó cseréjéhez használható. Más alkalmazás jelszava nem változik.

## Fotók, csomag és hálózati hiba

A fotók az eszközön maradnak, a Supabase csak azonosítókat és ellenőrzőadatokat kap. **Munkaterv és fotók letöltése**: a megjelenített előzményekhez tartozó, jogosultan látható fájlok csomagja. Régi fotókhoz előbb töltsd be a korábbi előzményeket. A hiányzó fájlokat a rendszer jelzi; másik eszközre a csomag importálható. Az import nem ad új jogosultságot, és eltérő meglévő helyi képet nem ír felül.

Bizonytalan mentési eredménynél az **Előző mentés újrapróbálása** ugyanazt a kérést küldi újra; nem készít második átvételt. Ha az eszköz engedi a helyi tárolást, a függő kérés a saját ERP-személyhez kötve újranyitáskor is visszatölthető. A még nem mentett mezőkre bezáráskor figyelmeztetünk.

## Tényleges munkaidő

A 0.9.0-s verzióban a munkatervnél **Munkalapok és munkaidő** nyitható. Az ötödik sáv az érvényes ERP-munkalapok tényleges személyes idejét mutatja, a négy átvételi sáv módosítása nélkül. [Rögzítés, javítás és hozzáférés](munkalap-munkaido.md).
