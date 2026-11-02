# Ügyfélbelépés és saját munkák – 0.6.0

## Irodai lépések

1. Az Ügyfelek menüben válaszd ki a megrendelőt, majd az **Ügyfél-hozzáférés beállítása** gombot.
2. Hozz létre új saját ERP-ügyfélfiókot névvel és valódi e-mail-címmel, vagy válassz meglévő ügyfélfiókot. A korábbi tesztalkalmazások belépéseit nem használjuk.
3. Pipáld be, mely munkavégzési címeket láthatja. Egy fiók több címet is kaphat. Azonos nevű ügyfeleket nem vonunk össze automatikusan; több külön forrásrekord címét is csak az iroda rendeli ugyanahhoz a fiókhoz.
4. **Hozzáférés mentése**, majd **Jelszóbeállító hivatkozás készítése**. A hivatkozást másold ki és küldd el kizárólag a megadott címzettnek a saját leveleződben. A Levél előkészítése gomb az alapértelmezett levelezőt nyitja; másik levelezőbe a másolás használható. A rendszer nem küld levelet automatikusan.
5. A hivatkozás 24 óráig, egyszer használható. Új készítése érvényteleníti az előző fel nem használt hivatkozást. A hivatkozás érzékeny adat: ne kerüljön csoportos beszélgetésbe, képernyőképbe vagy a GitHubra.

Az **Ügyfél-jelszókérések** gomb jelzi a beérkezett visszaállítási kéréseket. Válaszd ki a kérő fiókot, és készíts új hivatkozást. A kérés az új jelszó sikeres beállításakor lezárul. Nem állítunk be jelszót az ügyfél helyett.

Egy cím pipa nélküli mentése megszünteti az adott cím hozzáférését. Az Aktív ügyfél-hozzáférés kikapcsolása minden eszközről letiltja a fiókot, és visszavonja a régi munkameneteket és fel nem használt beállító hivatkozásokat. Az ajánlat és a munka előzményei megmaradnak. A meglévő belépési e-mail nem cserélhető; másik személy külön fiókot kap.

## Ügyfél lépései

1. Nyisd meg a személyesen kapott beállító hivatkozást. Adj meg saját, legalább 12 karakteres jelszót kétszer.
2. Az ERP kezdőlapján válaszd a **Megrendelői belépés** gombot, majd írd be a valódi e-mail-címedet és az új ERP-jelszavadat.
3. A Saját munkáim felületen lenyitva láthatod a kijelölt címekhez kapcsolódó kertépítés/karbantartás állapotát, egyeztetett napját, valamint kiküldött ajánlataid részleteit és PDF-jét.
4. A rendszer percenként, látható és online oldalon frissíti a nézetet; az **Adatok frissítése** gombbal azonnal is lekérheted. A már lenyitott részek frissítéskor is nyitva maradnak.
5. Elfelejtett jelszónál add meg az e-mail-címedet és nyomd meg az **Elfelejtett jelszó** gombot. Az iroda kapja meg a kérést és ő küldi el az új beállító hivatkozást; a levél nem automatikusan érkezik. A jelszóbeállítás megkezdésekor a régi ERP-ügyfélmunkamenetek megszűnnek.

Az eszköz csak az ERP saját munkamenetét jegyzi meg, legfeljebb 90 napra. A Kijelentkezés eltávolítja a megjegyzést és az adott eszköz saját ERP-ügyfélmunkamenetét azonnal visszavonja. Új eszközön ugyanazzal az ERP-jelszóval lehet belépni. A megrendelő nem kap hozzáférést a közös teljes ügyféllistához, más ügyfélhez vagy az irodai menükhöz.

## Mit jelent most a követés?

A tényleges, szerverre mentett állapot és az egyeztetett nap látható; az elfogadott ajánlatból létrejött kertépítés Indításra vár állapotban is megjelenhet, a kivitelezőknek való megnyitás továbbra is külön irodai indítás. Nem készítünk kitalált százalékos előrehaladást.

Az ügyfél kizárólag a legutóbb ténylegesen kiküldött ajánlatváltozatot kapja meg. Az iroda által közben szerkesztett új piszkozat/revízió rejtett. A következő munkafázis a részletes munkaterv, négyszintű átvétel és kétoldalú változáskezelés; ezeket a jelen kiadás nem jelenti késznek. A kifizetések, nyolc bejegyzéstípus és referenciák saját moduljai továbbra is a teljes PDF szerint megvalósítandók.

## Üzemeltetés és határok

A jóváhagyott megoldás öt saját ERP-nyilvántartást használ: [telepítési és biztonsági terv](ugyfelportal-telepitesi-terv.md). Nincs új SMTP, előfizetés vagy külső szolgáltató. A KAP más adatait/fiókjait, a Munkalap, Kassza, Napi feladatok és Munkabér kódját/adatstruktúráját nem módosítja. A hozzáférés létrehozása nem ír a közös ügyfélforrásba.

Az első valódi ügyfél meghívását az iroda végzi, a jelszót maga az ügyfél adja meg. Fejlesztési teszthez nem hozunk létre valódi ügyfél- vagy Auth-próbafiókot. A helyi felületpróba kizárólag szintetikus adatokat használ.
