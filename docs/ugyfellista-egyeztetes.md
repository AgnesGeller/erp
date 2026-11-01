# Ügyféllista-egyeztetés – Munkalap, Kassza, Napi feladatok, ERP

2026. november 1. Csak olvasásos ellenőrzés; a régi alkalmazásokban és adatbázis-objektumaikban nem történt módosítás.

## Eredmény

Mindhárom régi alkalmazás ugyanazt a Munkalap-ügyféltörzset használja a közös Supabase-projektben. Az új ERP saját kiszolgálója is ezt olvassa. A megjelenített darabszámok eltérhetnek, mert az alkalmazások különböző állapotokra szűrnek.

| Nézet | Ügyfélszám | Szűrés |
| --- | ---: | --- |
| Teljes közös törzs / ERP archiváltakkal | 155 | Minden forrásügyfél, ebből 3 archivált. |
| Munkalap irodai lista / ERP alapnézet | 152 | Nem archivált ügyfelek; az iroda az ellenőrzésre várókat is látja. |
| Kassza választó | 152 | Aktív és nem archivált ügyfelek. A függő jóváhagyás önmagában nem zárja ki az ügyfelet. |
| Napi feladatok | 149 | Csak aktív, jóváhagyott és nem archivált ügyfelek. |

A Napi feladatok és a Kassza közötti 3 ügyfél különbsége a jóváhagyási szűrésből adódik. A közös forrásban három aktív, nem archivált ügyfél még nem jóváhagyott. Állapotukat nem módosítottuk. A 204-es ügyfélszámot ebben a közös törzsben nem igazoltuk.

## Címek és ügyfelek külön száma

A közös forrásban 157 címsor van. A Napi feladatok ezekből 116 aktív, jóváhagyott címsort olvas a jóváhagyott ügyfelekhez; 46 jóváhagyott ügyfélhez nincs a szűrésnek megfelelő cím, ezért a program cím nélküli ügyfélválasztási sort készít. A választóban ugyanaz az ügyfél több cím miatt többször szerepelhet. A program ezenfelül ügyfélazonosító és ékezet-normalizált cím alapján kiszűri az ismétlődő választási sorokat.

Ezért a címsorok vagy a választó sorainak száma nem azonos az ügyfelek számával. A 149 a Napi által lekért külön ügyfélazonosítók száma; nem egy adott eszköz helyi gyorsítótárának megszámolása.

## Frissítés az eszközökön

- **ERP:** belépés/adatbetöltés, előtérbe kerülés, kézi frissítés és látható ügyfélnézetben 30 másodperces ellenőrzés, ha nincs szerkesztés.
- **Kassza:** ügyféllista betöltése, valamint előtérbe visszatéréskor kényszerített újralekérés. Átmeneti hiba esetén maradhat korábban betöltött lista.
- **Napi feladatok:** saját ügyféllista-kapcsolat és munkamenet szükséges; betöltéskor, előtérbe kerüléskor, fókusznál, pageshow eseménynél és kézi Lista frissítése művelettel egyeztet. Hálózati vagy munkamenethiba esetén jelzett helyi gyorsítótárat használhat.
- **Munkalap:** a saját következő ügyféladat-betöltését használja. Már nyitott listán szükség lehet a saját Frissítés gombra/újranyitásra.

Az új ERP-ügyfél jóváhagyott, aktív rekordként kerülhet a közös törzsbe, jóváhagyott első címmel, ezért a meglévő szűrések szerint a Kassza és Napi feladatok is fel tudja venni a következő sikeres adatlekéréskor. Ezt a kód és a szűrési feltételek igazolják; éles próbaügyfelet nem hoztunk létre. Minden dolgozó tényleges eszközén külön szinkronpróba nem történt.

## Ellenőrzési alap

- Munkalap: munkalap-data.js listCustomers, a négy ügyféltábla sémája és összesített forrásszámok.
- Kassza: supabase-data.js customers → list_cash_customers; a tényleges adatbázisfüggvény szűrése; app.js előtérbe kerülési frissítése.
- Napi feladatok: js/customer-directory.js list és js/app.js syncCustomerDirectory / refreshSharedDataSilently.
- ERP: saját 155 személy-megfeleltetés; közös forrás olvasása; nulla éles újügyfél-mentési tesztkérés.

Az ellenőrzés nem kérdezett le Kassza-bevételeket, kiadásokat, egyenlegeket vagy munkabéradatokat. Az eredmény nem jelent engedélyt a régi rendszerek módosítására vagy az ellenőrzésre váró ügyfelek automatikus jóváhagyására.