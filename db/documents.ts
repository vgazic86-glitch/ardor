/**
 * Početni opći dokumenti salona Ardor (Markdown).
 * Upisuju se u bazu jednom; poslije se uređuju u aplikaciji (Dokumenti).
 * Napomena: ovo su radni prijedlozi — prije usvajanja uskladiti s pravilnikom
 * o radu, ugovorima i važećim propisima.
 */
export interface SeedDocument {
  slug: string
  title: string
  category: string
  summary: string
  version: string
  sortOrder: number
  body: string
}

/** Sažetak službene knjige grafičkih standarda (ARDOR_KGS, 4. 9. 2019.). Originalni PDF je prilog dokumenta. */
export const KGS_BODY = `> Za dosljednu primjenu logotipa i boja u svim vidovima vizuelne komunikacije neophodno je pridržavati se pravila koja su jasno definisana i ne mogu se mijenjati. Ovo je sažetak — **originalna knjiga (PDF, 33 str.) je u prilogu** ovog dokumenta (dugme gore desno).

## 1. Logotip

[[logo]]

Ključni element logotipa je **kvadrat sa dvije zaobljene ivice** — kao savršen simbol četiri zida (prostorije i doma), a oblik koji u potpunosti izjednačava estetiku i funkcionalnost dizajna. Naglašavanjem oblika na način da je dva puta postavljen — jednom u simbol, a jednom u tipografiju (slovo O) — ukazuje se na važnost prihvatanja estetike i funkcionalnosti u radu Ardora.

| Dio | Značenje |
|---|---|
| Kvadrat sa zaobljenim ivicama (narandžasta) | **Estetika** i udobnost |
| Kvadrat s oštrim ivicama (siva) | **Funkcionalnost** i profesionalnost |
| Preklapanje dva kvadrata | Jedinstvo estetike i funkcionalnosti |

## 2. Konstrukcija i zona integriteta

- Logotip se konstruiše na mreži; kada nije moguće koristiti elektronski zapis, prenosi se pomoću mreže.
- **Zona integriteta** (prazan prostor oko logotipa) jednaka je veličini označenoj s *x* u knjizi — u njoj nema teksta, slika ni drugih elemenata, kako bi logotip uvijek bio vidljiv i čitljiv.

## 3. Alternativni znak i slogan

- **Alternativni znak** — samo znak (dva kvadrata) ili samo natpis „ARDOR”. Koristi se kao propratni element na mjestima gdje nije potreban osnovni logotip, ali treba naglasiti povezanost (npr. uzorak, kesa, fascikla, favicon aplikacije).
- **Logotip sa sloganom**: **NAMJEŠTAJ ZA SVAČIJI DŽEP** — slogan stoji ispod logotipa, poravnat prema konstrukciji iz knjige.

## 4. Definicija boja

Boje nose dva značenja: **estetiku** (narandžasta) i **funkcionalnost i profesionalni pristup** (siva). Nije dozvoljeno korištenje alternativnih varijanti ili drugih nijansi.

[[colors]]

| Boja | CMYK | RGB | HEX |
|---|---|---|---|
| **ARDOR narandžasta** | C0 M80 Y95 K0 | 241 / 90 / 42 | #F15A29 |
| **ARDOR žuta** | C0 M50 Y95 K0 | 247 / 147 / 40 | #F79328 |
| **ARDOR siva** | C0 M0 Y0 K80 | 88 / 89 / 91 | #58595B |

U aplikaciji Ardor boje brenda koriste se za akcente (dugmad, istaknuti brojevi, grafikoni), a topli smeđi tonovi (orah, papir) za podloge — kao dopunska paleta, ne umjesto boja brenda.

## 5. Pozitiv, negativ i podloge

- **Pozitiv** — logotip u boji ili jednobojno tamno na svijetloj podlozi.
- **Negativ** — bijeli logotip na tamnoj podlozi.
- Na jednobojnim podlogama u bojama brenda (narandžasta, žuta, siva) koristi se logotip prilagođen podlozi prema str. 15 knjige.
- Logotip u **bijeloj boji** koristi se na podlogama od **40–100 % crne**. Na fotografijama vidljivost podloge treba sniziti; ako su dominantne boje podloge slične bojama brenda, logotip se primjenjuje u pozitivu ili negativu.

## 6. Nedozvoljene primjene

- mijenjanje boja unutar logotipa,
- pozicioniranje elemenata logotipa na druge načine,
- samo horizontalno ili samo vertikalno razvlačenje logotipa,
- dodavanje efekata (sjene, obrisi, 3D).

Dozvoljene su samo varijante prikazane u knjizi (osnovni logotip, natpis bez znaka, samo znak).

## 7. Tipografija

Primarna tipografija je **Ubuntu** u svojim težinskim varijantama — **Light, Regular, Medium i Bold**. **Kurziv nije dozvoljen** za primarno pismo. Ubuntu je besplatan font (Google Fonts) i koristi se i u aplikaciji Ardor.

## 8. Poslovna dokumentacija

| Materijal | Pravilo |
|---|---|
| Vizit karta | Prednja strana bijela s imenom, funkcijom i kontaktima; uz desni rub veliki znak; poleđina siva s negativ logotipom. |
| Memorandum | Logotip gore lijevo, linijski znak gore desno, u dnu podaci firme i traka u tri boje brenda (kolor i monohromatska verzija). |
| Koverta | Logotip gore lijevo, linijski znak na poleđini. |
| Blok A5, fascikla, olovke | Narandžasta podloga s uzorkom znaka ili bijela s logotipom; olovke narandžaste, crne i bijele s logotipom. |
| Kesa | Bijela s logotipom i velikim znakom te adresom www.ardornamjestaj.com. |

## 9. Uzorak (pattern)

Znak se ponavlja kao uzorak — u boji na bijeloj podlozi ili kao linijski crtež na sivoj podlozi. Koristi se za ambalažu, poleđine, pozadine i promotivni materijal.

## 10. Brendiranje prodajnog centra

| Element | Sadržaj |
|---|---|
| Radno vrijeme | PON–PET 08:00–20:30 · SUBOTA 08:00–19:00 |
| Ograda | Fotografija, logotip i putokaz s udaljenošću (npr. „350 m”) |
| Ulaz / kapija | „Dobrodošli” i „Hvala na posjeti.” uz znak |
| Reklama na krovu | Logotip „ARDOR namještaj” i natpis PRODAJNI CENTAR |
| Naljepnica na ulaznim vratima | PRODAJNI CENTAR · logotip · Vojvode Pere Krece 21, Banja Luka |
`

export const seedDocuments: SeedDocument[] = [
  {
    slug: 'kodeks-ponasanja',
    title: 'Kodeks ponašanja',
    category: 'Pravila i ponašanje',
    summary:
      'Vrijednosti salona i pravila ponašanja prema kupcima, kolegama, dobavljačima i imovini salona.',
    version: '1.0',
    sortOrder: 10,
    body: `> Radni prijedlog. Prije usvajanja uskladiti s pravilnikom o radu i ugovorima o radu. Kodeks potpisuje svaki zaposlenik pri zapošljavanju.

## 1. Zašto imamo kodeks

Ardor prodaje namještaj u kojem ljudi žive godinama. Kupac nam vjeruje da ćemo ga dobro savjetovati, isporučiti ono što smo obećali i stati iza proizvoda. Ovaj kodeks opisuje kako se ponašamo da bismo to povjerenje zaslužili — prema kupcima, jedni prema drugima i prema partnerima.

Kodeks vrijedi za sve zaposlene, bez obzira na radno mjesto i vrstu ugovora, kao i za studente i sezonske radnike.

## 2. Naše vrijednosti

| Vrijednost | Šta to znači u praksi |
|---|---|
| **Iskrenost** | Kupcu kažemo pravi rok isporuke, prave mjere i stvarne mogućnosti proizvoda — i kada to znači manju prodaju. |
| **Briga o detalju** | Mjerimo dvaput, provjeravamo narudžbu prije potvrde, ostavljamo prostor kupca urednijim nego što smo ga zatekli. |
| **Odgovornost** | Ono što obećamo, uradimo. Ako pogriješimo, kažemo to odmah i predložimo rješenje. |
| **Timski rad** | Uspjeh salona je zajednički. Pomažemo kolegama, dijelimo znanje i ne „otimamo” kupce. |

## 3. Odnos prema kupcima

- Svakog kupca pozdravljamo u roku od jedne minute od ulaska u salon, i kada smo zauzeti („Dobar dan, odmah sam s vama”).
- Ne dajemo obećanja koja ne možemo ispuniti: rok isporuke potvrđujemo tek nakon provjere zalihe ili roka dobavljača u aplikaciji Ardor.
- Cijene, popuste i uslove plaćanja iznosimo jasno i u pisanom obliku (ponuda iz aplikacije).
- Ne vršimo pritisak na kupca niti koristimo netačne tvrdnje („posljednji komad”, „cijena važi samo danas”) ako nisu istinite.
- Prigovore primamo mirno i bez prepiranja; postupamo po *Proceduri reklamacija i povrata*.
- Kupcu se obraćamo sa „Vi”, osim ako on sam ne predloži drugačije.

## 4. Odnos prema kolegama

- Poštujemo jedni druge bez obzira na spol, nacionalnost, vjeru, godine, invaliditet ili bilo koju drugu ličnu osobinu.
- Nema vrijeđanja, ponižavanja, uznemiravanja ni seksualnog uznemiravanja — ni uživo, ni porukama, ni na društvenim mrežama.
- Prodaja pripada prodavaču koji je kupca uslužio. Ako se kupac vrati drugom kolegi, prodaja se dijeli ili ostaje prvom prodavaču — dogovor rješava voditelj salona.
- Nesuglasice rješavamo razgovorom, a ako to ne uspije — kod voditelja salona, ne pred kupcima.

## 5. Sukob interesa, pokloni i provizije

- Ne primamo novac, poklone ni usluge od dobavljača ili kupaca u vrijednosti većoj od simbolične (npr. kalendar, rokovnik, kafa).
- Popust za sebe, porodicu ili prijatelje odobrava isključivo voditelj salona i evidentira se u aplikaciji.
- Ne radimo za konkurenciju niti preusmjeravamo kupce drugim prodavcima namještaja.
- Svaki mogući sukob interesa prijavljujemo voditelju salona prije nego što odlučimo.

## 6. Novac, roba i evidencija

- Svaka prodaja, uplata i izlaz robe evidentira se u aplikaciji Ardor **u trenutku kada se desi** — ne naknadno i ne „za kolegu”.
- Gotovinu primamo samo uz fiskalni račun. Blagajna se zaključuje na kraju dana.
- Roba izlazi iz salona samo uz evidentiranu narudžbu ili otpremnicu.
- Inventuru i prijem robe radimo pošteno — razlike prijavljujemo, ne „peglamo”.

## 7. Povjerljivost i zaštita podataka

- Podaci kupaca (ime, telefon, adresa) koriste se samo za narudžbu, dostavu i servis.
- Ne fotografišemo kupčeve stanove osim kad je to potrebno za montažu, i tada uz njegovu saglasnost.
- Plaće, ugovori i lični podaci zaposlenih su povjerljivi; pristup imaju samo ovlaštene osobe.
- Lozinke za aplikaciju i sisteme ne dijelimo ni s kim.

## 8. Izgled i radno okruženje

- Na poslu nosimo radnu odjeću u skladu s *Knjigom grafičkih standarda*; ekipa dostave nosi zaštitnu obuću.
- Izložbeni prostor je uvijek uredan: na kraju smjene vraćamo uzorke na mjesto, brišemo prašinu s izloženih komada.
- Pušenje, alkohol i opojna sredstva na poslu i u vozilima salona nisu dozvoljeni.

## 9. Društvene mreže

Smijemo dijeliti objave salona. Ne objavljujemo podatke kupaca, fotografije iz njihovih domova bez dozvole, interne cijene, nabavne cijene ni komentare o kolegama i konkurenciji u ime salona.

## 10. Prijava kršenja

Ko primijeti kršenje kodeksa, prijavljuje ga voditelju salona ili direktoru — usmeno ili pisano. Prijava u dobroj namjeri ne može imati negativne posljedice za onoga ko prijavljuje.

Kršenje kodeksa može dovesti do upozorenja, gubitka varijabilnog dijela plaće za taj mjesec ili mjera predviđenih pravilnikom o radu i zakonom.

## 11. Potvrda

*Pročitao/la sam Kodeks ponašanja salona Ardor, razumijem ga i pridržavat ću ga se.*

Ime i prezime: ______________________ Datum: ____________ Potpis: ______________________
`,
  },
  {
    slug: 'knjiga-grafickih-standarda',
    title: 'Knjiga grafičkih standarda',
    category: 'Brend i komunikacija',
    summary:
      'Službena knjiga grafičkih standarda ARDOR namještaj (2019): logotip, znak, boje, tipografija i primjena. Originalni PDF je u prilogu.',
    version: '2019',
    sortOrder: 20,
    body: KGS_BODY,
  },
  {
    slug: 'prirucnik-za-prodavace',
    title: 'Priručnik za prodavače',
    category: 'Prodaja',
    summary:
      'Od pozdrava do naplate: kako vodimo kupca kroz salon, pravimo ponudu, odobravamo popust i unosimo prodaju u Ardor.',
    version: '1.0',
    sortOrder: 30,
    body: `> Cilj priručnika: da svaki kupac, bez obzira kojem prodavaču dođe, dobije isti nivo usluge — i da svaka prodaja bude tačno evidentirana.

## 1. Prodajni put u sedam koraka

1. **Pozdrav** — u roku od jedne minute. Kontakt očima, osmijeh, „Dobar dan, dobro došli u Ardor.” Ne pitamo odmah „Mogu li pomoći?” — damo kupcu minutu da razgleda.
2. **Otvaranje razgovora** — pitanje vezano uz ono što kupac gleda: „Uređujete dnevni boravak?”
3. **Analiza potreba** — slušamo više nego što pričamo (vidi tačku 2).
4. **Prijedlog** — najviše tri opcije, od one koja najbolje odgovara potrebi, ne od najskuplje.
5. **Ponuda** — u aplikaciji Ardor (Nova prodaja → status *Ponuda*), odštampana ili poslana kupcu.
6. **Zaključenje** — potvrda narudžbe, avans, termin dostave.
7. **Praćenje** — poziv dan prije dostave i nakon montaže („Je li sve kako treba?”).

## 2. Pitanja za analizu potreba

| Tema | Pitanja |
|---|---|
| Prostor | Koje su mjere prostorije? Gdje su vrata, prozori, radijatori, utičnice? Na kojem je spratu, ima li lift? |
| Korištenje | Ko koristi namještaj? Djeca, kućni ljubimci? Svakodnevno spavanje na garnituri? |
| Stil i boje | Šta već imate u prostoru? Pod, zidovi, ostali namještaj — fotografija s mobitela pomaže. |
| Budžet i rok | Do kada vam treba? Koliko ste planirali izdvojiti? Plaćanje odjednom ili na rate? |

Mjere uvijek zapisujemo u napomenu narudžbe. Za kuhinje i ugradbeni namještaj zakazujemo besplatno mjerenje na terenu.

## 3. Poznavanje proizvoda

Prije nego što predložite artikal, provjerite u aplikaciji (**Zalihe** ili **Ctrl+K**):

- **Slobodna količina** — na stanju minus rezervisano. Ako je 0, roba se naručuje: rok = rok isporuke dobavljača + 3 dana za dostavu.
- **Materijal i dimenzije** — iz kartice artikla i kataloga dobavljača.
- **Uslovi garancije** — 2 godine na namještaj, duže ako dobavljač daje (madraci često 5–10 godina).

Ne izmišljamo podatke. Ako ne znate — „Provjerit ću i javiti vam danas do 17 h” — i javite se.

## 4. Popusti

| Ko odobrava | Najviše | Napomena |
|---|---|---|
| Prodavač | do **10 %** po stavci | Upisuje se u narudžbu kao popust %, ne kao niža cijena |
| Voditelj salona | do **20 %** | Za veće narudžbe, izložbene komade, stalne kupce |
| Direktor | iznad 20 % | Samo uz pisano obrazloženje |

Popusti smanjuju maržu i ulaze u obračun varijabilnog dijela plaće: ako je prosječni popust prodavača u mjesecu veći od dogovorene granice, varijabilni dio se umanjuje (vidi *Pravila za bonuse* u kadrovskom dijelu).

## 5. Unos prodaje u aplikaciju Ardor

1. Dolje lijevo provjerite da ste **vi** izabrani kao korisnik.
2. **Nova prodaja** (gore desno).
3. Izaberite kupca ili **+ Novi kupac** (ime, telefon, adresa, grad — adresa je obavezna za dostavu).
4. Dodajte artikle, količine i eventualni popust.
5. Status: *Ponuda* ako kupac još razmišlja, *Potvrđena* kad je dogovoreno.
6. Unesite avans i način plaćanja.
7. Ako kupac odmah nosi robu: označite **„Kupac odmah preuzima robu”** — roba se automatski skida sa zalihe.
8. Za dostavu: datum, termin (08–12, 12–16, 16–20), ekipa, montaža da/ne.
9. U napomenu: mjere, boja, sprat, lift, posebni zahtjevi.

**Pravilo:** prodaja koja nije u aplikaciji — ne postoji. Ne ulazi u promet, proviziju ni bonus.

## 6. Plaćanje

- **Avans** najmanje 30 % za robu koja se naručuje, 100 % za robu po mjeri ako to traži dobavljač.
- **Gotovina i kartica** — fiskalni račun odmah.
- **Virman** — predračun iz aplikacije; roba izlazi tek kad uplata legne na račun.
- **Rate** — prema uslovima banke/partnera; prodavač provjerava da je zahtjev odobren prije potvrde narudžbe.
- Ostatak iznosa naplaćuje se najkasnije pri isporuci. Ekipa dostave ne izdaje robu bez potvrde o plaćanju ili odobrenja voditelja.

## 7. Ponude koje čekaju

Svaka ponuda starija od 3 dana dobija poziv kupcu. Aplikacija ih prikazuje u **Pregled → Treba pažnju**. Nakon 30 dana neaktivnosti ponuda se otkazuje.

## 8. Najčešće greške

- Obećan rok bez provjere zalihe.
- Mjere „otprilike” — posljedica je povrat i trošak dvostruke dostave.
- Popust dogovoren usmeno, a nije upisan.
- Prodaja upisana na kolegu jer je on bio prijavljen u aplikaciji.
- Nije naplaćen ostatak, a roba je izašla.

## 9. Prigovori kupaca u prodaji

| Kupac kaže | Odgovor |
|---|---|
| „Skupo je.” | „Razumijem. Da vam pokažem šta dobijate za tu cijenu — i jednu povoljniju opciju da uporedite?” |
| „Razmislit ću.” | „Naravno. Napravit ću vam ponudu da imate sve na papiru. Mogu li vas nazvati u četvrtak?” |
| „Na internetu je jeftinije.” | „Moguće. Kod nas je u cijeni dostava, montaža i garancija na koju se možete osloniti. Da uporedimo zajedno?” |
`,
  },
  {
    slug: 'standard-dostave-i-montaze',
    title: 'Standard dostave i montaže',
    category: 'Dostava i servis',
    summary:
      'Priprema, utovar, ponašanje kod kupca, montaža, primopredaja i evidencija statusa u aplikaciji.',
    version: '1.0',
    sortOrder: 40,
    body: `## 1. Dan prije dostave

- Voditelj salona ili prodavač potvrđuje termin telefonom: datum, vremenski okvir (08–12, 12–16 ili 16–20 h), sprat, lift, parking.
- Ekipa provjerava u aplikaciji **Dostave** raspored za sutra i napomene uz narudžbu.
- Ostatak iznosa: provjeriti je li plaćen. Ako nije — kupca obavijestiti kako plaća pri isporuci (gotovina/kartica na terminalu).

## 2. Utovar

- Roba se utovara prema redoslijedu dostava (zadnja dostava ide prva u kombi).
- Svaki paket se provjerava prema narudžbi: šifra artikla, broj paketa, boja.
- Oštećena ambalaža se fotografiše i prijavljuje prije polaska.

## 3. Statusi u aplikaciji

| Trenutak | Šta označiti | Šta se dešava |
|---|---|---|
| Kombi kreće iz salona | **Krenuli** | Roba se skida sa zalihe |
| Montaža završena, kupac preuzeo | **Dostavljeno** | Narudžba postaje *Isporučena* |
| Kupac nije tu / problem | **Odgođeno** | Roba se vraća na zalihu, voditelj zakazuje novi termin |

Status se mijenja **odmah**, s terena — ne na kraju dana.

## 4. Kod kupca

- Pozvati kupca 30 minuta prije dolaska.
- Pozdraviti se, predstaviti („Dobar dan, ekipa Ardor, donosimo vam…”).
- Zaštitne navlake za obuću u stanu; podloga ispod alata i dijelova.
- Ne komentarisati stan, druge kupce ni kolege.
- Ne pušiti, ne koristiti kupčevo kupatilo bez pitanja.

## 5. Montaža

- Montaža prema uputstvu proizvođača; višak dijelova se ne baca — vraća se u salon.
- Kuhinje i ormari pričvršćuju se za zid kad to uputstvo traži (sigurnost djece).
- Nakon montaže: poravnati vrata i ladice, provjeriti mehanizme, obrisati površine.
- Ambalažu odnosimo, osim ako kupac želi zadržati kutije.

## 6. Primopredaja

1. Kupac pregleda namještaj s ekipom.
2. Eventualna oštećenja ili nedostaci se fotografišu i upisuju na otpremnicu.
3. Kupac potpisuje otpremnicu.
4. Ekipa ostavlja kontakt salona i kratko objasni održavanje (čišćenje tkanine, zatezanje vijaka nakon mjesec dana).

## 7. Sigurnost

- Teški elementi (preko 40 kg) nose se u dvoje; koristi se pojas za nošenje.
- Zaštitne cipele obavezne, rukavice pri rukovanju staklom.
- Vozilo se ne ostavlja otključano; roba se ne ostavlja bez nadzora na ulici.
- Svaka povreda se odmah prijavljuje voditelju.
`,
  },
  {
    slug: 'procedura-reklamacija-i-povrata',
    title: 'Procedura reklamacija i povrata',
    category: 'Dostava i servis',
    summary:
      'Kako primamo, evidentiramo i rješavamo reklamacije kupaca i povrate robe, s rokovima.',
    version: '1.0',
    sortOrder: 50,
    body: `> Uskladiti s važećim propisima o zaštiti potrošača i uslovima garancije dobavljača.

## 1. Prijem reklamacije

Reklamacija se prima u salonu, telefonom ili e-mailom. Prima je svaki zaposlenik — ne odbijamo kupca jer „to nije moj kupac”.

Bilježimo:

- broj narudžbe (Ctrl+K u aplikaciji), ime i telefon kupca,
- opis problema i kada je primijećen,
- fotografije (kupac ih može poslati porukom),
- šta kupac traži (popravak, zamjenu, povrat novca, umanjenje cijene).

Kupcu potvrđujemo prijem i rok u kojem ćemo se javiti: **najkasnije 3 radna dana**.

## 2. Procjena

| Vrsta problema | Ko procjenjuje | Rok |
|---|---|---|
| Oštećenje pri dostavi | Ekipa dostave + voditelj salona | 2 radna dana |
| Greška u proizvodnji | Voditelj salona, po potrebi dobavljač | 8 radnih dana |
| Pogrešna mjera / boja (naša greška) | Voditelj salona | 2 radna dana |
| Pogrešna mjera (kupčeva greška) | Voditelj salona | Dogovor s kupcem, uz trošak |

## 3. Rješenja

1. **Popravak na licu mjesta** — najbrže; ekipa izlazi u dogovorenom terminu.
2. **Zamjena dijela ili artikla** — naručuje se kod dobavljača; kupac dobija pisanu potvrdu roka.
3. **Umanjenje cijene** — ako kupac zadržava artikal s manjim nedostatkom; evidentira se kao popust ili povrat dijela uplate.
4. **Povrat robe i novca** — roba se vraća u salon, u aplikaciji se narudžba otkazuje (roba se automatski vraća na zalihu kao „Povrat”), novac se vraća istim načinom plaćanja.

## 4. Povrat bez greške (predomišljanje)

Za robu sa zalihe salon može, kao dobru volju, prihvatiti povrat u roku od 14 dana ako je roba neoštećena i u originalnoj ambalaži. Troškove dostave snosi kupac. Roba izrađena po mjeri ili naručena posebno za kupca ne vraća se, osim ako to propisi drugačije ne određuju.

## 5. Evidencija

- Svaka reklamacija upisuje se u napomenu narudžbe s datumom i ishodom.
- Mjesečno voditelj pregleda reklamacije po artiklu i dobavljaču — ako se isti problem ponavlja, artikal se povlači iz ponude.

## 6. Komunikacija

Kupca obavještavamo o svakom koraku, i kada nema novosti („Dobavljač još nije potvrdio rok, javljamo se u petak”). Ljubazno, bez prebacivanja krivice na kupca, dobavljača ili kolege.
`,
  },
  {
    slug: 'uvod-za-nove-zaposlenike',
    title: 'Uvod za nove zaposlenike',
    category: 'Zaposlenici',
    summary:
      'Plan prvih 30 dana, kontrolna lista dokumenata i obuka za rad u aplikaciji Ardor.',
    version: '1.0',
    sortOrder: 60,
    body: `## Dobro došli u Ardor

Drago nam je da ste s nama. Ovaj dokument vodi vas kroz prvi mjesec: šta trebate donijeti, šta ćete naučiti i ko vam pomaže.

**Vaš mentor** je iskusni kolega koji vam je dodijeljen prvi dan — njega pitate sve.

## Prije prvog dana — dokumenti

- [ ] Lična karta / CIPS prijava prebivališta
- [ ] Broj tekućeg računa
- [ ] Ljekarsko uvjerenje (ako ga zahtijeva radno mjesto)
- [ ] Diploma / svjedočanstvo
- [ ] Za vozače: vozačka dozvola

Ugovor o radu, potpisani Kodeks ponašanja i ostali kadrovski dokumenti čuvaju se u aplikaciji, u zaštićenom dijelu **Kadrovska**.

## Prvi dan

- Upoznavanje s timom i obilazak salona i skladišta.
- Radna odjeća, ključevi, pristup aplikaciji Ardor.
- Čitanje: *Kodeks ponašanja*, *Knjiga grafičkih standarda* (logotip, boje, tipografija).
- Potpis Kodeksa ponašanja.

## Prva sedmica

| Dan | Prodavači | Dostava i montaža |
|---|---|---|
| 1–2 | Asortiman: kategorije, top 20 artikala, materijali | Vozila, alat, sigurnost |
| 3 | Aplikacija: pretraga, zalihe, kartica artikla | Aplikacija: raspored dostava, statusi |
| 4 | Prati mentora u prodaji | Ide na dostave s iskusnom ekipom |
| 5 | Prva ponuda uz mentora | Prva samostalna montaža uz nadzor |

Obavezno pročitati: *Priručnik za prodavače* ili *Standard dostave i montaže*, te *Proceduru reklamacija i povrata*.

## Prvih 30 dana

- Samostalna prodaja / dostava uz povremenu provjeru mentora.
- Upoznavanje s pravilima varijabilnog dijela plaće (cilj, popusti, bonus).
- Razgovor s voditeljem salona na kraju mjeseca: šta ide dobro, šta treba popraviti, ciljevi za naredni period.

## Korisni kontakti

| Za šta | Ko |
|---|---|
| Raspored, odsustva, godišnji | Voditelj salona |
| Plaća, ugovor, dokumenti | Direktor / računovodstvo |
| Aplikacija Ardor | Voditelj salona |
`,
  },
]
