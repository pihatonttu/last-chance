/**
 * Block lists for nicknames (P12). Data only: src/filter.ts normalises every entry at
 * module load with the same pipeline as the names (src/normalize.ts), so entries are
 * written in plain spelling and can be added here without touching any logic.
 * test/blocklist.test.ts checks that every entry blocks itself and that every allow-list
 * word passes.
 *
 * HOW ENTRIES MATCH
 *   substring  Blocked anywhere in the name, also inside compounds ("vittupää",
 *              "paskahousu") and across spaces ("p a s k a"). For strong words whose
 *              letters do not occur inside innocent words, or do so only in words on ALLOW.
 *   word       Blocked only as a whole word: one token, or several tokens that spell it
 *              out ("h o m o"). For short or ambiguous stems ("anal" in "Anna-Liisa",
 *              "kuk" in "kukka", "ope" in "Hope"). Inflected forms are listed explicitly.
 *   Flags (prefix):
 *   ~  Letter doubling matters. Matched with runs of 3+ letters shortened to 2 instead of 1,
 *      and a single letter must stay single, because collapsing would merge the word with an
 *      innocent one: kusi/kuusi (spruce, six), ryssä/rysä (fish trap), hintti/Hintikka,
 *      nigger/Niger, mamu/Mammu, ass/as, coon/con. Stretched spellings are listed
 *      separately where they matter ("niigg").
 *   !  å/ä/ö must be typed as such: the entry is not matched against the å->a, ä->a, ö->o
 *      folded name, because the folded word is innocent: läski/laski (counted),
 *      ämmä/amma, ääliö/Valio, kåt/Kat, röv/rov (prey), bög/bog.
 *   Every other entry is matched both with å/ä/ö kept and folded, so "javla" and "Päskä"
 *   are caught.
 *
 * JUDGEMENT CALLS (blocked unless marked ALLOWED)
 *   - perkele, saatana, helvetti, jumalauta: real swear words, blocked. Euphemisms are
 *     ALLOWED: hitto, hemmetti, helkkari, himskatti, saakeli, perhana, pahus, jestas.
 *   - tyhmä, ruma, läski, urpo, idiootti, ääliö, luuseri, dorka: insults, blocked. A
 *     nickname like "Kalle on tyhmä" usually targets a classmate. Mild self-mocking words
 *     are ALLOWED: hölmö, hullu, pöljä, tollo, hassu, sika, lehmä, aasi.
 *   - Children's toilet words are ALLOWED: kakka, pieru, pylly, peppu, pissa (but "pissis",
 *     an insult for teenage girls, is blocked).
 *   - Body slang is blocked: tissi(t) (whole word), pippeli, pimppi, snopp, snippa, kives
 *     (whole word; "kivessä" = in a stone passes).
 *   - Mulkku: blocked. Nekku: ALLOWED (a pet name; the slur is "nekru"). Vitikka: ALLOWED
 *     (a surname, no bad stem). Kusti: ALLOWED.
 *   - Dick: blocked as a whole word. As an English first name it is practically unused by
 *     Finnish pupils; "Dickens" passes.
 *   - Fanny: ALLOWED. A common Nordic first name; the English slang meaning is mild.
 *   - Ass: blocked as a whole word only (Assi, Bass, Assassin pass); asshole, dumbass and
 *     jackass are blocked anywhere. Badass: ALLOWED (mild, mostly positive slang).
 *   - homo, gay, lesbo, lesbian: blocked as whole words. Not because the words are bad, but
 *     because as a classroom nickname they are almost always aimed at someone. "Homo
 *     sapiens" is blocked too. queer and trans are ALLOWED (rarely playground insults here).
 *   - Swedish "fan" (devil) is ALLOWED on its own because it collides with English "fan";
 *     "fy fan" is blocked. English/Swedish "satan" is a whole word, Finnish "saatana" a
 *     substring.
 *   - Russian "suka" is NOT listed: collapsed it equals Finnish "sukka" (sock). "cyka blyat"
 *     is caught through "blyat" and "cyka".
 *   - Penisilliini is blocked: "penis" is a substring and nobody needs the word as a name.
 *     Kuvitus, Pornainen, Helvetica, Perseus, Shiitake, Heroine, Therapist and Pipeline
 *     are on ALLOW.
 *   - Adolf: blocked as a whole word. Aryan: ALLOWED (a common South Asian first name).
 *     Isis: ALLOWED (a name and a goddess). Pepe: ALLOWED. SS on its own: ALLOWED (initials);
 *     "Waffen-SS" is blocked.
 *   - Numbers: 88 and 1488 (neo-Nazi codes), 69 (sex joke) and 420 (cannabis) are blocked
 *     as whole numbers; 14 (a common age) and years like 1988 pass. KKK is blocked.
 *   - Gypsy, mustalainen, zigenare, tattare: blocked (offensive to Roma). "Manne" is ALLOWED
 *     (a common nickname). "Kike" is blocked even though it is a Spanish nickname.
 *   - pilvi (cloud, also cannabis slang) is ALLOWED; piri (speed) is blocked as a whole
 *     word only, so Piritta and Pirkko pass.
 *   - Staff impersonation is blocked as a whole word anywhere in the name ("Ope Kalle"),
 *     not as a substring ("Hope", "Penelope", "Badminton" pass).
 *   - Violence and self-harm (outside the brief, added on purpose): kouluampuja (school
 *     shooter), itsemurha, suicide, kys, "tapa itsesi", "kill yourself", terrorist(i).
 *     "ampuja" alone passes (jousiampuja, archer).
 *   - The filter reads w as v and x as ks ("wittu", "sexi"). Known side effects, accepted:
 *     Swedish "kurva" (curve) is blocked as Polish "kurwa"; Finnish translative forms such
 *     as "ilmaiseksi" contain "seksi" and are blocked (nobody picks them as a nickname).
 *     Swedish "tvätt" is on ALLOW because folded it reads "tvat" (twat).
 *   - Known, accepted false positives among English words: Matsushita, Penistone,
 *     Lightwater, Sniggle, Pussycat, Perseverance. The teacher's rename button (P13) covers
 *     what the filter cannot judge, in both directions.
 */

export interface WordList {
  /** Strong words: blocked anywhere, also inside compounds and across spaces. */
  readonly substring: readonly string[];
  /** Short or ambiguous words: blocked only as a whole word (or spelled out with spaces). */
  readonly word: readonly string[];
}

export type Language = 'fi' | 'sv' | 'en' | 'other';

export const LISTS: Readonly<Record<Language, WordList>> = {
  fi: {
    substring: [
      // Profanity
      'vittu',
      'perkele',
      'saatana',
      'helvet', // helvetti, helvetin; also Swedish helvete
      'jumalauta',
      'perse',
      'paska',
      'paskiai', // paskiainen, paskiaiset (no "paska" in it)
      '~kusip', // kusipää
      '~kusett', // kusettaa
      '~kusetus',
      'huora',
      'lutka',
      'hutsu',
      'narttu',
      'runkata',
      '~runkk', // runkkari, runkkaa, runkku (not runko, trunk)
      // Sexual terms
      'mulkku',
      'kyrpä',
      'pillu',
      '~kulli', // not kuuli (heard)
      'pimppi',
      'pippeli',
      'penis',
      'vagina',
      'klitoris',
      'seksi',
      'porno',
      'kondomi',
      'orgasmi',
      'masturb',
      'sperma',
      'pedofiili',
      'raiska', // raiskaus, raiskaaja
      'insesti',
      'pedari',
      '~nuss', // nussia, nussija
      // Slurs: ethnic, homophobic, ableist
      'neekeri',
      'nekru',
      'mutakuono',
      '~ryss', // ryssä, ryssät; not rysä (fish trap)
      'vinosilmä',
      'mustalainen',
      'jutku',
      '~hintt', // hintti, hinttari; not Hintikka
      'homppeli',
      'homoil', // homoilija, homoilu
      'vammainen', // also cp-vammainen
      'vammanen',
      'kehari',
      'spasti', // spastikko, spastinen
      'autisti',
      // Insults
      'idiootti',
      '!ääliö',
      'luuseri',
      'tyhmä',
      '!läski',
      'imbesilli',
      'debiili',
      'typerys',
      'pissapää',
      // Drug terms
      'kannabis',
      'amfetamiini',
      'heroiini',
      'kokaiini',
      'narkkari',
      'narkomaani',
      'spiidi',
      'marihuana',
      'jointti',
      'pössy', // pössyttely
      'subutex',
      // Nazi and hate terms
      'natsi',
      'hakaristi',
      'kansallissosialisti',
      // Violence and self-harm
      'kouluamp', // kouluampuja, kouluampuminen
      'kouluammu', // kouluammuskelu
      'itsemurha',
      'tapa itsesi',
    ],
    word: [
      '~kusi', // not kuusi, Kuusisto, taskusi
      'horo', // not horoskooppi
      'horot',
      '!ämmä', // not tämä, hämmästys
      '!ämmät',
      'pissis',
      'pissikset',
      'tissi',
      'tissit',
      'kives',
      'kivekset',
      'anaali',
      'homo',
      'homot',
      'homoja',
      'homon',
      'homoa',
      'homojen',
      '~hintit', // plural and genitive lose the double t
      '~hintin',
      'lesbo',
      'lesbot',
      'transu',
      '~mamu', // not Mammu
      '~mamut',
      'somppu',
      'mongo',
      'mongot',
      'cp',
      'urpo',
      'dorka',
      'ruma',
      'hasis',
      'piri',
      'nisti', // not pianisti
      'huume',
      'huumeet',
    ],
  },
  sv: {
    substring: [
      // Profanity
      'jävla',
      'jävel',
      'fy fan',
      'skitstövel',
      'arsle',
      'rövhål',
      // Sexual terms
      'kuksug', // kuksugare, kuksuger
      'kukhuvud',
      'fitta',
      'fitthuvud',
      'horunge',
      'slyna',
      'knull', // knulla
      // Slurs
      'fjolla',
      'neger',
      'svartskalle',
      '~blatte',
      'zigenare',
      '~tattare',
      'efterbliven',
      // Insults
      'tjockis',
      'dumskalle',
      // Drug terms
      'knark',
      'hasch',
      'tjack',
      'pundare',
      // Hate terms
      'vit makt',
    ],
    word: [
      'satans',
      'skit', // not skitsofrenia
      'kuk', // not kukka, kukko, kuka
      'kukar',
      'kuken',
      'fittor',
      'hora', // not Thora, Horatio
      'horor',
      'horan',
      '!kåt', // not kåta (Sámi hut), Kat
      '!röv',
      '!bög',
      '!bögar',
      'flata',
      'pucko',
      'fetto',
      'äckel',
      'pattar',
      'snopp',
      'snippa',
      '~porr', // not porras (stairs)
      'sexig',
    ],
  },
  en: {
    substring: [
      // Profanity
      'fuck',
      'fuking',
      'phuck',
      'fakju',
      'shit',
      'bitch',
      'biatch',
      'bastard',
      'asshole',
      'arsehole',
      'dumbass',
      'jackass',
      'cunt',
      'cocksuck',
      'dickhead',
      'twat',
      'wanker',
      'bollocks',
      'douchebag',
      'goddamn',
      'butthole',
      // Sexual terms
      'pussy',
      'whore',
      'porn',
      'milf',
      'hentai',
      'dildo',
      'vibrator',
      'orgasm',
      'blowjob',
      'handjob',
      'cumshot',
      'jizz',
      'rapist',
      'pedophil',
      'paedophil',
      'incest',
      // Slurs
      '~nigg', // nigger, nigga; not Niger, Nigeria
      '~niigg',
      'wetback',
      'raghead',
      'towelhead',
      '~fagg', // faggot; not fagotti (bassoon)
      'tranny',
      'retard',
      'cripple',
      'midget',
      'mongoloid',
      'autist',
      'spastic',
      // Insults
      'idiot',
      'moron',
      'stupid',
      'imbecil',
      // Drug terms
      'cocain',
      'heroin',
      'cannabis',
      'marijuana',
      'hashish',
      'ketamin',
      'fentanyl',
      'xanax',
      'opium',
      // Nazi and hate terms
      'nazi',
      'hitler',
      'sieg heil',
      'swastika',
      'hakenkreuz',
      'führer',
      'auschwitz',
      'ku klux',
      'white power',
      'white pride',
      'rahowa',
      'waffen-ss',
      // Violence and self-harm
      'school shoot',
      'suicide',
      'kill yourself',
      'terrorist', // also Finnish terroristi
    ],
    word: [
      // Profanity
      'fuk',
      'fck',
      'fuq',
      'fak',
      '~ass', // not as, Assi, Bass
      'arse', // not Arsenal
      '~piss',
      'crap',
      'damn',
      'wtf',
      'stfu',
      'omfg',
      'bugger',
      'douche',
      'prick',
      'wank',
      'satan',
      // Sexual terms
      'dick', // not Dickens
      'dicks',
      'cock', // not Hancock, peacock
      'cocks',
      'slut', // not Swedish slutspel
      'sluts',
      'hooker',
      'thot',
      'sex', // not Swedish sexton, Essex
      'sexy',
      '~boob',
      '~boobs',
      '~boobies',
      'tit',
      'tits',
      'titty',
      'titties',
      'nude',
      'nudes',
      'horny',
      'boner',
      'cum', // not cumulus
      'anal', // not Anna-Liisa, analyysi
      'anus', // not Janus, manus
      'rape', // not grape
      'raped',
      'pedo', // not torpedo
      'paedo',
      // Slurs
      'negro', // not Montenegro
      '~coon',
      'chink',
      '~gook',
      'paki',
      'spic',
      'kike',
      'beaner',
      'jap',
      'gypsy',
      'fag',
      'fags',
      'dyke',
      'gay',
      'lesbian',
      'tard',
      'spaz',
      'downie',
      // Insults
      'loser', // not closer
      'losers',
      'dumb', // not Dumbo
      'ugly',
      'fat', // not Fatima
      'fatso',
      'fatty',
      // Drug terms
      '~weed',
      'meth',
      'crack',
      'dope',
      'stoner',
      'lsd',
      'mdma',
      'thc',
      'ecstasy',
      // Nazi and hate terms
      'heil',
      'adolf',
      'acab',
      // Self-harm
      'kys', // "kill yourself"
    ],
  },
  other: {
    substring: [
      'kurwa', // Polish
      'blyat', // Russian, transliterated
      'bljat',
      'blyad',
      'cyka',
      'pizda',
      'scheisse', // German
      'arschloch',
      'cazzo', // Italian
      'orospu', // Turkish
      'siktir',
      'kahba', // Arabic
      'sharmuta',
      'jebac', // Polish, also jebać
    ],
    word: ['puta', 'putas', 'puto', 'hure', 'chuj', 'merde'],
  },
};

/** Names that impersonate school staff or game admins, blocked as whole words. */
export const STAFF_NAMES: readonly string[] = [
  'opettaja',
  'opettajat',
  'ope',
  'rehtori',
  'apulaisrehtori',
  'vararehtori',
  'moderaattori',
  'ylläpitäjä',
  'ylläpito',
  'admin',
  'administrator',
  'teacher',
  'moderator',
  'principal',
  'headmaster',
  'lärare',
  'läraren',
  'rektor',
  'rektorn',
];

/**
 * Innocent words that contain a substring entry. A substring hit that lies entirely
 * inside one of these is ignored; any other hit in the same name still counts
 * ("kuvitusvittu" is blocked).
 */
export const ALLOW: readonly string[] = [
  'kuvitu', // kuvitus, kuvitukset (vittu)
  'helvetica', // helvet
  'helvetia',
  'perseus', // perse
  'persefone',
  'persephone',
  'pipeline', // pippeli
  'scunthorpe', // cunt
  'shiitake', // shit
  'heroine', // heroin
  'pornainen', // porn (a municipality)
  'therapist', // rapist
  'nazir', // nazi (Arabic first names Nazir, Nazira)
  'nazim',
  'tvätt', // twat, once w reads as v and ä is folded (Swedish tvättbjörn, raccoon)
];

/**
 * Number and letter codes, as regular expressions matched against whole runs of letters
 * or digits before leetspeak ("Kalle88" has the runs "kalle" and "88").
 */
export const CODE_TOKENS: readonly string[] = ['88', '1488', '69', '420', 'k{3,}'];
