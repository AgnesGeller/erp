# Munkaterv és négyszintű átvétel – folytatási pont

2026. november 2. **Mentési pont, nem készre jelentés. Az élő alkalmazás továbbra is 0.6.0.**

## Jóváhagyás és határok

A felhasználó jóváhagyta a [részletes tervet](munkaterv-atvetel-telepitesi-terv.md): tíz saját ERP-tábla, munkaterv/függőségek, négyszintű átvétel, megosztások, teendők, személyszínek és a meglévő dolgozóhoz kötött külön ERP-belépés, saját e-mail/jelszóval és kézi meghívással. Tesztek után saját ERP-élesítés, main commit/push engedélyezett. Más alkalmazás csak olvasható. Fotó továbbra is helyben/letölthető csomagban, nincs új Storage/SMTP/előfizetés.

## Elkészült helyi alapok

- `src/erp-workplan-model.ts`: pontos munkadíj-súlyozás; tényleges pipa és magasabb átvételből számított teljesítés külön; 100%-os megosztás és vezetői/irodai zárolás; új átvételi kör visszaküldéskor; eredeti tervidő védelme; körmentes függőségi gráf.
- `database/proposals/erp-staff-access.sql`: négy saját dolgozói belépési tábla és végpontok. Meglévő személyhez kötés; irodai PIN-fiókot nem írhat felül; saját Auth-marker, egyszeri hivatkozás és munkamenet-visszavonás.
- `database/proposals/erp-workplan.sql`: hat saját munkatervi tábla, elfogadott ajánlati alapadatok védelme, szerepenkénti projekt-hozzáférés, egyszeri kérésazonosító, gráf, átvétel/visszaküldés/megosztás/időterv, értesítések, statisztika, színek és lapozható előzmény.
- `supabase/functions/erp-gateway/workplans.ts` és `staff.ts`: előkészített kiszolgálók. A `clients.ts` kipróbált jelszófolyamata kiszolgáló által választott, külön staff névtérrel újrahasznosítható; alapértelmezett ügyfélág változatlan.
- Build frissíti a saját `workplan-model.ts` kiszolgálói másolatot. Generált JS helyi fordítással elkészült.
- 13 modellteszt, 6 dolgozói adatbázisteszt és 10 munkaterv-adatbázisteszt sikeres. A 0.6.0 korábbi teljes regressziója 212 sikeres teszt volt; az új modullal bővített teljes regresszió még hátravan.

## Pontos következő lépések

1. Kiszolgáló- és adatvédelmi tesztek: staff névtér, hamis szerep, ügyfélből kizárt belső mezők, munkadíjak kizárása dolgozói nézetből, ismételt kérés/hálózati hiba, lejárt/visszavont megbízás. A backend új fájljai még nincsenek a gateway `index.ts`/`handler.ts` fájljaiba bekötve.
2. Dolgozói belépés és irodai meghívófelület; munkánkénti szerepválasztás. `ErpApi` kiegészítése. Az irodai és ügyfélbelépés maradjon működőképes.
3. Részletes munkaterv-felület: lenyílók, húzás és mobil fel/le gombok, előfeltételek/idővonal, négy színes sáv, tényleges pipák, 100%-os megosztás, javítási címzett, saját statisztika, Teendőim. Helyi Undo és korábbi terv új revízióként visszaállítása; nem törlünk elfogadott ajánlati munkafázist.
4. Több helyi kép és jogosultság szerint szűrt ZIP-átadás/import. A szerver csak fájlazonosítót/metadatot kapjon; hiányzó helyi fájlra érthető jelzés szükséges. Ügyfél belső fotót vagy belső megjegyzést nem kaphat.
5. Teljes regresszió, típusellenőrzés, mobil/asztali szintetikus felületpróba. Az új SQL-migrációk még NINCSENEK élesítve; valódi dolgozói vagy munkatervi tesztrekord nem készült.
6. Telepítés előtt saját azonosítási függvények/tulajdonosok/jogok mentése; külön tranzakciós próba és visszagörgetés, majd jóváhagyott ERP-migrációk, gateway, ellenőrzés/advisor és frontend verzióemelés. README maradjon rövid, majd commit/push és Pages-ellenőrzés.

## Fontos részletek a folytatáshoz

- Supabase ERP: `cszsxjsiwaaibrocibyd`, saját erp/erp_private sémák; jelenlegi éles gateway v15. A Napi feladatok színforrása a másik projekt `public.napi_app_config.payload.workers` mezője; kizárólag a személyszín-adatokat olvastuk, munkákat nem.
- Az élő Napi-színek eltérnek a kódban maradt seedektől. A helyi `.local/napi-worker-colors-20261102.json` csak színátvételi pillanatkép, nem kerül GitHubra. A színátvételhez az ERP meglévő személyazonosítóját kell egyértelműen megfeleltetni; azonos névből nem lehet személyösszevonás.
- Postgresban az ERP-szerepek postgres tagságának eredeti grantora supabase_admin; INHERIT/SET false. Telepítéskor csak saját ideiglenes grant adható és vonható vissza, az eredeti maradjon meg. A CREATE-jogokat és függvénytulajdonosokat is meg kell őrizni.
- A modell `shares` eseménye tényleges munkavégzőt írhat jóvá alsó pipa nélkül, ha már van magasabb átvétel: a sáv színe változik, az alsó pipa hiányzó marad. Ez a PDF kifejezett előírása.
- Visszaküldés új kört nyit, a régi események nem törlődnek. A tényleges pipáló, a jóváírt résztvevő és a javítási címzett külön adat; ezek nem keverhetők össze.
- Ügyfélnek ne kerüljön belső munkautasítás, részesedési/hibastatisztika, vagy más projekthez tartozó személyadat a JSON-ba sem. A `workplanView` szűrés további célzott tesztet igényel.
- Az ötödik, tényleges munkaidős sáv és a beszerzési/pénzügyi modul nem készülhet kitalált nullaértékekkel. Ezek saját későbbi modulszakaszok, a teljes PDF részei maradnak.
