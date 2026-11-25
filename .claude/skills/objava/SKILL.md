---
name: objava
description: Objava nove verzije ARDOR aplikacije na Hetzner server (push na main) i provjera da radi uživo. Koristi kad Vladimir kaže "objavi", "pushaj" ili "stavi uživo".
---

# Objava (Hetzner)

Push na `main` = objava na https://app.ardornamjestaj.com — server svake minute provjeri GitHub i sam izgradi novu verziju. Aplikaciju koriste zaposlenici u salonu.

1. Prvo odradi skill `provjera`. Ne objavljuj ako išta ne prolazi.
2. `git status` — u commitu ne smiju biti `.env`, lozinke, ključevi ni dokumenti iz `../ardor-handoff/`.
3. Ako se mijenjao `package.json`, provjeri da je `pnpm-lock.yaml` ažuran (`pnpm install` lokalno, pa commit oba).
4. Commit poruka na bosanskom, jedna rečenica o tome što je novo za korisnika.
5. Ako Vladimir u ovom razgovoru nije izričito rekao da objaviš, pitaj ga prije `git push origin main`.
6. Nakon pusha: objava traje 1–3 minute. Provjeri da stranica odgovara i da se vidi nova funkcija. Tijek i greške: `ssh -i ~/.ssh/ardor_hetzner root@app.ardornamjestaj.com tail -50 /home/ardor/deploy.log` (neuspjela izgradnja ne dira staru verziju; ručni povratak: `sudo -iu ardor /home/ardor/rollback.sh`).
7. Javi Vladimiru: što je objavljeno i na što zaposlenici trebaju obratiti pažnju.

Migracije baze primijene se same pri pokretanju (`deploy.sh` → `scripts/migrate.mjs`, prije prebacivanja). Ako migracija padne, nova verzija se ne prebaci — stara ostaje aktivna; popravi migraciju novim commitom, nikad ručno u produkcijskoj bazi bez Vladimirova odobrenja.
