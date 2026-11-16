/** Poruka dana na ekranu za prijavu — svaki dan druga, ista za sve. */
export const MESSAGES = [
  'Svaki kupac koji izađe zadovoljan dovest će sljedećeg. Danas radimo za oba.',
  'Dobar dan počinje urednim salonom, toplim pozdravom i osmijehom na vratima.',
  'Ne prodajemo samo namještaj — pomažemo ljudima da se osjećaju kao kod kuće.',
  'Slušaj dvaput više nego što pričaš. Kupac će ti sam reći šta mu treba.',
  'Mali koraci svaki dan prave veliki mjesec. Kreni od prvog kupca.',
  'Tačno obećanje vrijedi više od brzog obećanja. Rok koji damo — poštujemo.',
  'Danas je dobar dan da neko pronađe kauč iz snova. Možda baš uz tvoju pomoć.',
  'Najbolja reklama je kupac koji nas preporuči komšiji.',
  'Tim koji pomaže jedni drugima nikad ne ostaje bez rješenja.',
  'Svaka ponuda je prilika. Svaki „možda” je razlog da se javiš ponovo.',
  'Pitaj kupca kako živi, a ne samo šta traži. Tako se prodaje pravi komad.',
  'Uredna primka danas znači mirnu inventuru sutra.',
  'Kad nešto pođe po zlu, kupac pamti kako smo to riješili — ne grešku.',
  'Energija je zarazna. Neka danas tvoja bude ona koju svi primijete.',
  'Namještaj za svačiji džep počinje razumijevanjem svačijih potreba.',
  'Nije važno koliko je kupaca ušlo, nego koliko ih se vratilo.',
  'Danas završi jednu stvar koju odgađaš. Ostatak dana ide lakše.',
  'Pohvali kolegu. Dobar dan u timu prelije se na svakog kupca.',
  'Svaki dobro izmjeren stan je jedna reklamacija manje.',
  'Ljubaznost ne košta ništa, a vraća se svaki put.',
  'Cilj nije prodati najskuplje, nego prodati pravo. Tad se kupci vraćaju.',
  'Pogledaj salon očima kupca koji ulazi prvi put. Šta bi popravio?',
  'Odličan servis je kad kupac dobije malo više nego što je očekivao.',
  'Ne čekaj savršen dan za dobar rezultat. Napravi ga od ovog.',
  'Svaka dostava na vrijeme gradi povjerenje koje se ne može kupiti.',
  'Znanje o proizvodu je tvoj najjači alat. Nauči danas nešto novo o jednom artiklu.',
  'Kupac kupuje od ljudi kojima vjeruje. Budi taj čovjek.',
  'Nakon svakog „ne” dolazi neko „da”. Samo nastavi.',
  'Dobar posao danas je najbolja priprema za sutra.',
  'Smiješak se čuje i preko telefona. Javi se kao da te zove najbolji kupac.',
  'Zajedno smo brži, pametniji i bolji. Pitaj ako ne znaš — pomozi ako znaš.',
  'Red u papirima, red u robi, mir u glavi.',
  'Svaki kutak salona priča priču. Neka danas priča bude lijepa.',
  'Pratimo brojke, ali pamtimo ljude.',
  'Danas pokušaj nekome olakšati odluku, a ne samo prodati.',
  'Mjesec se ne osvaja zadnjeg dana, nego svakog dana pomalo.',
  'Prepoznaj stalne kupce imenom. To se ne zaboravlja.',
  'Kvalitet se vidi u detaljima — i u namještaju i u usluzi.',
  'Ako kupac odlazi bez kupovine, neka ode s dobrim utiskom. Vratit će se.',
  'Svaki dan je nova prilika da budemo prvi izbor u gradu.',
  'Ono što danas uradiš pažljivo, sutra nećeš morati raditi ponovo.',
  'Dobar savjet je najbolji poklon koji kupac može dobiti u salonu.',
  'Uspjeh je zbir malih stvari urađenih kako treba.',
  'Budi strpljiv s neodlučnim kupcem — najčešće je to budući stalni kupac.',
  'Danas je savršen dan da premašimo plan.',
  'Dom počinje od jedne stolice, jednog stola, jednog kreveta. I jednog dobrog prodavača.',
  'Kad radimo s ponosom, kupci to osjete.',
  'Javi se kupcu kome kasni isporuka prije nego što on pozove tebe.',
  'Ne uspoređuj se s drugima — uporedi se s onim kakav si bio jučer.',
  'Čist salon, jasne cijene, iskren savjet. To je naš recept.',
  'Svako „hvala” kupcu je ulaganje u sljedeću prodaju.',
  'Danas uradi bar jednu stvar bolje nego jučer.',
  'Najbolji rezultati dolaze kad volimo ono što radimo.',
  'Pitanja nisu smetnja — ona su kupčev način da kaže da je zainteresovan.',
  'Planiraj dan, ali ostavi prostora za kupca koji uđe bez najave.',
  'Pozitivan stav pretvara običan dan u dobar dan.',
  'Mi ne opremamo samo stanove. Opremamo uspomene koje će se tu stvarati.',
  'Kad je teško, sjeti se zadnjeg zadovoljnog kupca. Zato radimo ovo.',
  'Danas budi razlog zbog kojeg će neko reći: „U ARDOR-u su me divno usluživali.”',
  'Novi dan, nova prilika, isti visoki standard.',
]

/** Poruka za zadani datum (YYYY-MM-DD); redoslijed se ne ponavlja dva mjeseca. */
export function messageFor(dateIso: string) {
  const day = Math.floor(Date.parse(`${dateIso}T12:00:00Z`) / 86_400_000)
  return MESSAGES[((day % MESSAGES.length) + MESSAGES.length) % MESSAGES.length]
}

/** Današnji datum u Banjoj Luci. */
export function todayBL() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sarajevo' }).format(new Date())
}
