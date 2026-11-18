/** Savjet za uređenje doma na ekranu za prijavu — svaki dan drugi, ista za sve. Teme prate aktualne trendove (2026). */
export const SAVJETI = [
  'Boja od poda do stropa (color drenching): jedna topla nijansa na zidovima, vratima i letvicama stvara miran i topao prostor.',
  'Topli neutralni tonovi (bež, krem, pijesak) zamjenjuju hladne sive. Dodaj jedan zemljani akcenat, npr. terakota ili maslinasto zelena.',
  'Kreč (limewash) i teksture na zidu. Ravan bijeli zid danas djeluje dosadno, a blaga tekstura dodaje dubinu.',
  'Zaobljeni namještaj: okrugli stol, zakrivljena sofa ili fotelja smekšaju prostor i čine ga udobnijim.',
  'Slojevita rasvjeta: plafonska, zidna i podna svjetla s različitom jačinom. Tako soba izgleda toplo i uvečer.',
  'Vintage komadi s karakterom: jedan stari ormarić ili lampa iz second hand prodavnice daju kući osobnost.',
  'Zelenilo u prostoru: viša biljka u uglu ili vaza sa zelenim granama vrijedi više od deset sitnih ukrasa.',
  'Ribbed i letvane površine: vertikalne letve na ormaru ili zidu daju modernu, a opet toplu notu.',
  'Art Deco detalji: mesing, geometrijski uzorak ili staklo u boji oživljavaju i jednostavnu sobu.',
  'Ne kupuj sve odjednom. Trend u dekoraciji i rasvjeti mijenjaj lako, a veliki komad namještaja bira bez roka trajanja.',
  'Tepisi preko cijele sobe grade toplinu i dijele prostor na zone za sjedenje, rad i odmor.',
  'Ogledalo na nasuprotnom zidu širi prostor i širi svjetlo po sobi. Stavi ga nasuprot prozora.',
  'Jastuci u tri različite teksture (lan, vuna, baršun) u istoj boji izgledaju bogato bez puno truda.',
  'Dnevna soba treba jedno žarište: kamin, veliki sliker ili zid s policama. Ostalo podredi tom mjestu.',
  'Spavaća soba je mjesto za odmor: prigušena svjetla, mekani tekstil i bez radnog stola u pogledu.',
  'Kuhinja s toplim drvom (hrast, orah) uz bijele ili zemljane fronte izgleda moderno i gostoljubivo.',
  'Police s manje predmeta djeluju smirenije. Ostavi praznine i grupiši predmete po tri ili pet.',
  'Prirodni materijali (lan, pamuk, kamen, drvo, glina) drže dom ugodnim i dugo izgledaju dobro.',
  'Ulaz je prvi dojam: vješalica, ogledalo i tepih ili klupa za obuću pokažu red od prvog koraka.',
  'Višenamjenski namještaj, npr. sofa-krevet ili stol s ladicama, dobar je izbor za manje stanove.',
  'Zavjese do poda visi viša soba. Stavi karnišu što bliže stropu i širu od prozora.',
  'Umjetnost na zidu ne mora biti skupa: grafike u istom okviru, poredane u red, izgledaju profinjeno.',
  'Mirisi su dio dekoracije: sveća ili difuzor s drvenim notama stvaraju osjećaj doma.',
  'Stolica koja se sjedi, a ne samo gleda: ako gosti rijetko sjede na jednom komadu, zamijeni ga udobnijim.',
  'Boje iz prirode (šumska zelena, zemlja, pijesak, plavo more) lako se kombinuju i ne zamaraju oči.',
  'Namještaj uz zid nije obavezan. Sofa ili komoda postavljena malo od zida daje sobi dubinu.',
  'Kupaonica s tamnim akcentom (crna slavina, tamna fuga) izgleda elegantno uz bijele pločice.',
  'Stolna lampa na pultu ili na komodi uz zid daje topao sjaj bez jakog plafonskog svjetla.',
  'Prije kupovine izmjeri prostor i nacrtaj tlocrt. Tako sofa i stol stanu bez guranja i sporih rješenja.',
  'Pravilo tri boje: jedna dominantna, jedna sporedna i jedna akcentna. Lako se pamti i uvijek izgleda skladno.',
  'Staro i novo zajedno: drveni stol iz nasljeđa uz moderne stolice prave prostor s pričom.',
]

/** Savjeti za zadani datum (YYYY-MM-DD): četiri uzastopna iz liste, pomaknuta u odnosu na poruku dana. */
export function tipsFor(dateIso: string, count = 4) {
  const day = Math.floor(Date.parse(`${dateIso}T12:00:00Z`) / 86_400_000)
  const start = (day + 13) % SAVJETI.length
  return Array.from({ length: count }, (_, k) => SAVJETI[(start + k + SAVJETI.length) % SAVJETI.length])
}
