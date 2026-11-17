---
name: provjera
description: Potpuna provjera ARDOR aplikacije prije commita ili objave — typecheck, testovi, produkcijski build i klik kroz aplikaciju na lokalnoj bazi kao admin i kao trgovac. Koristi nakon svake izmjene koda i kad Vladimir kaže "testiraj".
---

# Provjera prije commita

1. `pnpm typecheck` — 0 grešaka.
2. `pnpm test` — svi testovi prolaze (trenutno 29). Ako si mijenjao novac, PDV, zalihe ili rokove u `src/lib/`, dodaj ili popravi test.
3. `pnpm build:node` — build prolazi. Upozorenje `INEFFECTIVE_DYNAMIC_IMPORT` za `pdf.ts` je poznato i bezopasno.
4. Pokreni `pnpm start:lokalno` (čita `.env`, lokalna baza) i otvori http://localhost:3000:
   - prijava kao admin → otvori stranice koje si mijenjao, napravi radnju, provjeri poruku i da se podatak spremio (osvježi stranicu);
   - prijava kao trgovac (ili druga ograničena uloga) → provjeri da ne vidi nabavne cijene, zaradu ni tuđi promet, i da nova funkcija radi ili je skrivena kako treba;
   - konzola preglednika bez crvenih grešaka; mobilni prikaz (širina ~390 px) nije razbijen.
5. Ako je funkcija mijenjala podatke: novi red u `MAP` u `src/server/audit.ts` i zapis vidljiv u Korisnici i pristup → Dnevnik.
6. Ako je dodana stranica ili veća funkcija: tema u `src/lib/help.ts`.
7. Ako je mijenjana shema: nova migracija u `netlify/database/migrations/` primijenjena na lokalnu bazu bez greške.

Na kraju javi Vladimiru u 2–4 rečenice: što je novo, kako to vidi u aplikaciji, i je li sve prošlo.
