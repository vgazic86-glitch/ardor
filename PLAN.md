# Ardor — plan razvoja

Interna aplikacija salona namještaja ARDOR (Banja Luka). Uživo na Renderu; svaki push na `main` je nova verzija.

## Napravljeno (stanje 17. 11. 2026)
- **Osnova:** prodaja s tokom statusa, uplate, dostave i montaža, zalihe iz kretanja robe, primke, artikli sa slikama, inventura, dobavljači i kartice, izvještaji s Excel izvozom, troškovi i mjesečna zarada, kadrovska (ugovori, plaće, bonusi), firmini dokumenti, vizualni identitet ARDOR.
- **Prijava i uloge:** admin, uprava, voditelj salona, operativa, trgovac; aktivacijski kod pri prvoj prijavi; sesije s automatskom odjavom (10 min neaktivnosti, zatvaranje preglednika); zaključavanje nakon 5 pogrešnih lozinki; dnevnik izmjena i prijava; prisutnost korisnika.
- **Rad u salonu:** kupci, ponuda/predračun/otpremnica u PDF-u, jutarnji brifing, obavijesti u zvoncu, plan prometa, dnevni pazar i dnevni zaključak u PDF-u, radni zadaci, radno vrijeme i odsustva, QR naljepnice i skeniranje, katalog za kupca na tabletu, varijante artikla, poruke kupcu (WhatsApp/Viber/SMS), automatski zadaci za praćenje ponuda.
- **Nabava:** narudžbe dobavljačima s PDF memorandumom, prijedlog narudžbe dobavljaču, ulazni PDV (knjiga ulaznih računa).
- **Reklamacije:** fotografije, rok, zapisnik u PDF-u.
- **Promjene cijena:** historija, oznaka „nova cijena”, obavijest 7 dana.
- **Prodaja / Narudžbe kupaca / Nabava od dobavljača** razdvojeni; oznaka „čeka robu”.
- **Ostalo:** pomoć na svakoj stranici i stranica Pomoć, AI asistent (Claude API, bez ključa lokalna pretraga), sat i vremenska prognoza za 7 dana u zaglavlju, instalacija na mobitel (PWA), kopija svih podataka u Excel.

## Sljedeće (redom)
1. **Upravljanje:** sedmični izvještaj e-poštom upravi; naplata potraživanja (rokovi, podsjetnici, rate); AI asistent s podacima o prodaji za upravu.
2. **Pravilo statusa:** ne dozvoliti status „Spremna” dok prodaja čeka robu (čeka odluku vlasnika).
3. **Sitnice:** tamni način rada; sat u zaglavlju na mobitelu.
4. **Održavanje:** README s potpunim popisom ekrana; E2E testovi (Playwright) za ključne tokove — prijava, nova prodaja, primka, uplata, reklamacija.
