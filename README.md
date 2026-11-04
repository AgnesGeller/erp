# DÍSZKERTEK

**Integrált vállalatirányítási és ügyfélkapcsolati alkalmazás**

[Alkalmazás megnyitása](https://agnesgeller.github.io/erp/) · **0.12.0**

## Mi használható?

- Saját irodai, dolgozói és ügyfélbelépés; munkánkénti megbízás és kijelölt ügyfélcímek.
- Ügyfelek, munkavégzési címek, helyszíni felmérések és helyi fájlcsomagok.
- Excel-alapú árajánlat, árlisták/sablonok, PDF-előnézet és kézi levélküldés.
- Kertépítési munkaterv, négyszintű átvétel és kétoldalú változáskezelés.
- Saját munkalap, tényleges munkaidő, anyagmozgások és anyagelőrehaladás.
- Előleg, részfizetés, irodai pénzigazolás, kertépítési eredmény és éves jutalék.
- **Kertkarbantartás:** igény, irodai jóváhagyás, napi munkalap, közzétett PDF és elszámolás.
- Telepítés/frissítés a felső menüből; mobilon is használható felület.

A teljes ERP fejlesztése folyamatban van. [Elkészült és hátralévő részek](docs/specifikacio-allapot.md).

## Használati segítség

[Karbantartás – rövid kipróbálás](docs/kertkarbantartas.md) · [Pénzügyek](docs/penzugyi-elszamolas.md) · [Munkaterv és átvétel](docs/munkaterv-es-atvetel.md) · [Munkalap és munkaidő](docs/munkalap-munkaido.md) · [Anyagkezelés](docs/anyagkezeles.md)

[Belépés](docs/irodai-belepes.md) · [Ügyfélportál](docs/ugyfelbelepes.md) · [Ügyfelek](docs/ugyfelnyilvantartas.md) · [Árajánlatok](docs/arajanlatmodul.md) · [Felmérések](docs/felmeresek.md)

![Az alkalmazás belépési felülete](docs/kepek/kezdo-desktop.png)

## Fejlesztés és biztonság

HTML, CSS, TypeScript; Supabase saját ERP-sémákkal. Az eredeti fejlesztői PDF és a jóváhagyott pontosítások az irányadók. A Munkalap az elsődleges ügyféllista; az ERP a külön engedély szerint új ügyfelet és első címet menthet bele. A többi alkalmazást nem módosítjuk. Ügyféladat, valódi árlista és jelszó nem kerülhet a GitHubra.

Az ERP saját mappájában: `npm run build`, `npm test`, `npm run check:edge`.

Legutóbbi ellenőrzés: **2026. november 4., 449 sikeres teszt**, fordítás, kiszolgáló-típusellenőrzés és szintetikus böngésző-/PDF-próba.

[Adatbázisterv](docs/adatbazisterv.md) · [Jogosultságok](docs/szerepkorok.md) · [Fejlesztési napló](docs/fejlesztesi-naplo.md) · [Részletes dokumentáció](docs/reszletes-projektleiras.md)

+36 70 634 9630 · [info@diszkertek.hu](mailto:info@diszkertek.hu) · [www.diszkertek.hu](https://www.diszkertek.hu/)
