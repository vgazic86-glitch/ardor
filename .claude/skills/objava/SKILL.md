---
name: objava
description: Objava nove verzije ARDOR aplikacije na Render (push na main) i provjera da radi uživo. Koristi kad Vladimir kaže "objavi", "pushaj" ili "stavi uživo".
---

# Objava na Render

Push na `main` odmah pokreće objavu na https://ardor-4mdu.onrender.com — aplikaciju koriste zaposlenici u salonu.

1. Prvo odradi skill `provjera`. Ne objavljuj ako išta ne prolazi.
2. `git status` — u commitu ne smiju biti `.env`, lozinke, ključevi ni dokumenti iz `../ardor-handoff/`.
3. Ako se mijenjao `package.json`, provjeri da je `pnpm-lock.yaml` ažuran (`pnpm install` lokalno, pa commit oba).
4. Commit poruka na bosanskom, jedna rečenica o tome što je novo za korisnika.
5. Ako Vladimir u ovom razgovoru nije izričito rekao da objaviš, pitaj ga prije `git push origin main`.
6. Nakon pusha: Render gradi 3–5 minuta. Provjeri da stranica odgovara i da se vidi nova funkcija (prvo učitavanje na free planu može trajati do 1 min). Ako ne radi, Vladimir u Render Dashboardu → servis `ardor` → Events/Logs vidi grešku; zamoli ga za tekst greške.
7. Javi Vladimiru: što je objavljeno i na što zaposlenici trebaju obratiti pažnju.

Migracije baze primijene se same pri pokretanju (`npm run start` → `scripts/migrate.mjs`). Ako migracija padne, servis se ne podigne — tada stara verzija ostaje aktivna; popravi migraciju novim commitom, nikad ručno u produkcijskoj bazi bez Vladimirova odobrenja.
