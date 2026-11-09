# Következő fejlesztés: külön építésvezetői munkacsomag

2026. november 6-i terv; megvalósítva 2026. november 9-én, ERP 0.16.9. [Használat](munkacsomag.md).

## Kiindulás

A jelenlegi export három változatot készít: ár nélküli munkatársi, ügyféláras megrendelői és belső irodai. Az építésvezető jelenleg a munkatársi csomagot kapja. A főnök külön negyedik, nyomtatott és digitális vezetői csomagot kért.

Az eredeti fejlesztői PDF 0. és 3. fejezetének szerepköri korlátja irányadó: a vezető műszaki és beszerzési adatokat láthat, teljes belső pénzügyet nem. A később elfogadott szerepköri megfeleltetés szerint az ERP meglévő construction_lead megbízását használjuk; nem készül új belépés vagy szerepkör.

## Módosítás

1. A Kinek készül? választóban az iroda külön Építésvezetőnek lehetőséget kap. A kijelölt építésvezető csak a saját, jogosultságával elérhető kertépítés vezetői csomagját kérheti.
2. A vezetői csomag tartalma: munkaterületek és kivitelezési szakaszok, részfeladatok/sorrend/függőségek, négyszintű átvétel és visszautasítás, műszaki bejegyzések, a számára már hozzáférhető munkaidő, anyagigény és ráhagyásos beszerzés, részszállítások és beépítés. Megmarad a Kiss Csaba-minta szerinti letisztult szerkezet.
3. A kiszolgáló külön vezetői adatnézetet állít össze, kizárólag a meglévő ERP-olvasók szerepkör szerint engedélyezett adataiból. Teljes belső eredmény, éves jutalék, banki igazolás és ügyfél-pénzügyi csomag nem kerül bele. Az iroda által kért vezetői export is ugyanazt a korlátozott tartalmat kapja.
4. A nyomtatott PDF és a digitális előnézet ugyanabból az ellenőrzött adatmodellből készül, egyértelmű Építésvezetői munkacsomag felirattal. Nem elég a csapatcsomag címét átírni.
5. Érintett fájlok: src/erp-workpack.ts, supabase/functions/erp-gateway/workpack.ts, workpack-model.ts, workpack-pdf.ts és a hozzájuk tartozó workpack tesztek. Új tábla, migráció, Auth-változtatás, külső szolgáltatás vagy előfizetés nem szükséges. A Munkalap, Kassza, Napi és Munkabér érintetlen marad.

## Elfogadási ellenőrzés

- Négy ténylegesen különböző csomag, azonos munkához követhető közös feladat- és mennyiségadatokkal.
- Kiosztott építésvezető jogosult; más munka vezetője, dolgozó és ügyfél nem kérhet ilyen exportot. A kézzel hamisított szerepkör/mód is szerveroldalon tiltott.
- A vezetői PDF nem tartalmaz irodai eredményt vagy jutalékot; a dolgozói és ügyfélcsomag sem kap új belső adatot.
- A PDF minden oldalán megfelelő szerepfelirat; hosszú feladat/anyaglista esetén ismétlődő fejléc és olvasható tördelés.
- Ha az alapadat összeállítás közben változik, friss exportot kérünk, nem keverjük a verziókat.
- Tesztügyfélen végzett teljes export-, jogosultság- és vizuális ellenőrzés után külön ERP-kiadás. A mostani 0.16.8 még kizárólag a referenciajavítást és a videókat tartalmazza.

A jutalékarány feltüntetése, a központi földtérfogat-ráhagyás és a dolgozói színbeállítás külön következő feladat; ez a terv ezeket nem nyilvánítja késznek.
