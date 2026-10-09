import { describe, expect, it } from 'vitest';
import { checkNickname, findOffensiveTerm, normalizeForFilter } from '../src/index.ts';

describe('normalizeForFilter', () => {
  it.each([
    ['vittttu', 'vitu'],
    ['V1TTU', 'vitu'],
    ['p a s k a', 'paska'],
    ['f.u.c.k', 'fuck'],
    ['v_i-t t.u', 'vitu'],
    ['Jävla', 'jävla'], // å/ä/ö stay distinct
    ['Åsa Björk', 'åsabjörk'],
    ['Ébène', 'ebene'], // other diacritics fold
    ['Müller', 'muler'],
    ['Straße', 'strase'],
    ['Øystein Ærø', 'öysteinärö'], // ø/æ count as ö/ä
    ['ｆｕｃｋ', 'fuck'], // full-width letters
    ['𝐟𝐮𝐜𝐤', 'fuck'], // mathematical bold letters
    ['fuсk', 'fuck'], // Cyrillic es looks like a Latin c
    ['vіttu', 'vitu'], // Cyrillic i
    ['4@3!|0$5789', 'aeiostbg'], // the leetspeak table, then letter runs collapsed
    ['Anna-Liisa', 'analisa'],
    ['Kalle 2', 'kale'], // digits without a letter meaning are dropped
    ['Wittu', 'vitu'], // Finnish reads w as v
    ['Sexi', 'seksi'], // and x as ks
    ['', ''],
  ])('%j -> %j', (input, expected) => {
    expect(normalizeForFilter(input)).toBe(expected);
  });
});

/**
 * Names and words that must pass. Judgement calls (see the comment block at the top of
 * src/blocklist.ts) are marked.
 */
const INNOCENT: readonly string[] = [
  // From the task brief.
  'Hilkka',
  'Kalle',
  'Assi',
  'Kusti',
  'Peniina',
  'Sakke',
  'Vitikka', // judgement: a Finnish surname, no bad stem in it
  'Pekka',
  'Satu',
  'Anna-Liisa', // "anal" hides in "annaliisa": anal is whole-word only
  'Åsa',
  'Björn',
  'Häkkinen',
  'Kukka', // Swedish "kuk" is whole-word only
  'Pippuri',
  'Nekku', // judgement: a pet name, not a slur ("nekru" is the slur)
  'Hessu',
  'Fanny', // judgement: a common Nordic first name; the English slang meaning is mild
  'Sanna',
  'Analyysi',
  'Kassi',
  'Passi',
  'Lassi',
  'Musta kissa',
  'Punainen kettu',
  // Common Finnish first names.
  'Aino',
  'Eetu',
  'Onni',
  'Venla',
  'Ilona',
  'Elias',
  'Lenni',
  'Aada',
  'Niilo',
  'Siiri',
  'Väinö',
  'Matti',
  'Jussi',
  'Pasi',
  'Tuukka',
  'Pilvi', // "pilvi" (cloud) is also cannabis slang: not blocked
  'Tiina',
  'Annika',
  'Hanna',
  'Helmi',
  'Helvi', // not "helvetti"
  'Hellevi',
  'Kirsi',
  'Saku',
  'Rasmus',
  'Fanni',
  'Peppi',
  'Jalmari',
  'Ukko',
  'Akseli',
  'Santeri',
  'Iida',
  'Lumi',
  'Oona',
  'Veeti',
  'Nooa',
  'Leevi',
  'Eino',
  'Toivo',
  'Ilmari',
  'Piritta', // "piri" (speed) is whole-word only
  'Pirkko',
  'Mammu', // "mamu" (slur) keeps its letter doubling
  'Manne',
  'Natalia',
  'Inkeri',
  'Vittorio',
  'Saana',
  'Kanerva',
  'Väinämöinen',
  // Finnish surnames.
  'Kuusisto', // "kusi" keeps its letter doubling, so "kuusi" (spruce, six) is fine
  'Kuusinen',
  'Hintikka', // "hintti" keeps its letter doubling
  'Kokkonen',
  'Kakkonen',
  'Pikkarainen',
  'Mustonen',
  'Hämäläinen',
  'Seppälä',
  'Laitinen',
  'Lahtinen',
  'Heikkinen',
  'Kivelä',
  'Rautio',
  // Finnish words that contain a bad stem (Scunthorpe tests).
  'Kuusi',
  'Kukkula',
  'Kukko',
  'Kuka',
  'Kuvitus', // contains "vitu"; on the allow-list
  'Pianisti', // "nisti" (junkie) is whole-word only
  'Torpedo', // "pedo" is whole-word only
  'Horoskooppi', // "horo" is whole-word only
  'Kullervo', // "kulli" keeps its letter doubling
  'Pornainen', // a municipality; on the allow-list
  'Rysä', // a fish trap; "ryssä" keeps its letter doubling
  'Tämä', // "ämmä" is whole-word only
  'Hämmästys',
  'Kämmen',
  'Valio', // "ääliö" needs the real ä
  'Laski', // "läski" needs the real ä
  'Laskettelu',
  'Taskusi', // "kusi" is whole-word only
  'Persikka',
  'Persoona',
  'Ananas',
  'Banaani',
  'Mansikka',
  'Mustikka',
  'Puolukka',
  'Pikkukakkonen', // judgement: toilet words for children (kakka, pieru) are not blocked
  'Kivessä', // "kives" is whole-word only
  'Sukka', // Russian "suka" is not listed because collapsed it equals "sukka"
  'Homma',
  'Satakieli',
  'Musta laiva', // not "mustalainen"
  'Mongolia', // "mongo" is whole-word only
  'Hullu kana', // judgement: mild self-mocking words (hullu, hölmö, sika, lehmä) pass
  'Hölmö hiiri',
  'Iloinen lehmä',
  'Kurki',
  // Swedish names and words.
  'Sixten',
  'Ebba',
  'Elsa',
  'Hugo',
  'Linnéa',
  'Måns',
  'Göran',
  'Fredrik',
  'Kerstin',
  'Sigrid',
  'Ulf',
  'Thora', // "hora" is whole-word only
  'Horatio',
  'Pernilla',
  'Ingrid',
  'Hasse',
  'Jöns',
  'Kåta', // a Sámi hut; "kåt" is whole-word only
  'Sexton', // Swedish "sixteen"; "sex" is whole-word only
  'Slutspel', // Swedish "slut" (end); English "slut" is whole-word only
  'Kanelbulle',
  'Kakan',
  // English and international names and words.
  'Scunthorpe',
  'Essex',
  'Sussex',
  'Arsenal', // "arse" is whole-word only
  'Classic',
  'Assassin', // "ass" is whole-word only
  'Bass',
  'Grass',
  'Cassandra',
  'Grape', // "rape" is whole-word only
  'Therapist', // contains "rapist"; on the allow-list
  'Shiitake', // contains "shit"; on the allow-list
  'Heroine', // contains "heroin"; on the allow-list
  'Helvetica', // contains "helvet"; on the allow-list
  'Perseus', // contains "perse"; on the allow-list
  'Pipeline', // contains "pippeli" when collapsed; on the allow-list
  'Hancock', // "cock" is whole-word only
  'Peacock',
  'Cockatoo',
  'Dickens', // "dick" is whole-word only
  'Badminton', // "admin" is whole-word only
  'Hope', // "ope" is whole-word only
  'Penelope',
  'Montenegro', // "negro" is whole-word only
  'Niger', // "nigger" keeps its letter doubling
  'Nigeria',
  'Spice',
  'Cumulus',
  'Closer', // "loser" is whole-word only
  'Fatima', // "fat" is whole-word only
  'Dumbo',
  'Mississippi',
  'Nazira', // contains "nazi"; on the allow-list
  'Nazir',
  'Aryan', // judgement: a common South Asian first name
  'Isis', // judgement: a name and a goddess
  'Pepe',
  'Scrap',
  'Analyst',
  'Butterfly',
  'Bitcoin',
  'Badass', // judgement: mild, mostly positive slang; "ass" alone and asshole/dumbass/jackass are blocked
  'Fuji',
  'Kalle 14', // 14 is a common age; only 88 and 1488 are blocked as numbers
  'Ville 1988',
  'Pekka 7',
  // w and x are read as v and ks; names with them still pass.
  'Wilma',
  'Waltteri',
  'Max',
  'Alex',
  'Felix',
  'Axel',
  'Xavier',
  'Tvättbjörn', // Swedish "raccoon": folded "tvat" would hit "twat"; on the allow-list
  'Jousiampuja', // archer: "ampuja" alone is fine
];

/**
 * Inputs that must be refused as offensive. Judgement calls are marked; the full list of
 * them is at the top of src/blocklist.ts.
 */
const OFFENSIVE: readonly string[] = [
  // Finnish profanity, with leetspeak, spacing, repeats and umlaut evasion.
  'vittu',
  'Vittu',
  'VITTU',
  'v1ttu',
  'vittttu',
  'v i t t u',
  'vittupää',
  'Voi vittu',
  'vitun idiootti',
  'kuvitusvittu', // the allow-list only covers the "vitu" inside "kuvitus"
  'paska',
  'p a s k a',
  'p4sk4',
  'Päskä',
  'paskahousu',
  'Paskiainen',
  'perkele', // judgement: a mild but real swear word, blocked
  'Perkele',
  'saatana',
  'Saatanan',
  's44t4n4',
  'helvetti',
  'Helvetin',
  'jumalauta',
  'perse',
  'Persereikä',
  'kusi',
  'Kusipää',
  'kusettaa',
  'runkkari',
  'Runkata',
  'huora',
  'Huora',
  'lutka',
  'narttu',
  'horo',
  'Vanha ämmä',
  // Finnish sexual terms.
  'pillu',
  'kyrpä',
  'kyrpa',
  'kulli',
  'mulkku', // judgement: blocked
  'Mulkku',
  'penis',
  'Peni5',
  'vagina',
  'Tissi', // judgement: blocked as a whole word (plain body slang on a projector)
  'Tissit',
  'Pippeli', // judgement: blocked (children's word for penis)
  'Pimppi',
  'seksi',
  'Seksikäs',
  'porno',
  'Pornhub',
  'nussija',
  'Kondomi',
  'dildo',
  'Kives',
  'Anaali',
  'Pedofiili',
  'Pedo',
  'Raiskaaja',
  'Insesti',
  'Penisilliini', // judgement: the allow-list does not cover it; nobody needs it as a nickname
  // Finnish slurs and insults.
  'homo',
  'H0m0',
  'h o m o',
  'Kalle homo',
  'homot',
  'Homon',
  'Homoilija',
  'Hintit',
  'Pissapää',
  'Pössyttely',
  'hintti',
  'homppeli',
  'Lesbo',
  'Transu',
  'neekeri',
  'n e e k e r i',
  'nekru',
  'Mutakuono',
  'ryssä',
  'Ryssä',
  'Vinosilmä',
  'Mamu',
  'Mustalainen',
  'mongo',
  'Mongoloidi',
  'cp-vammainen',
  'CP',
  'Vammainen',
  'Kehari',
  'Spastikko',
  'Autisti',
  'idiootti',
  'ääliö',
  'urpo',
  'Dorka',
  'Luuseri',
  'tyhmä', // judgement: a mild insult, blocked ("Kalle on tyhmä" targets a classmate)
  'Tyhmä Kalle',
  'Kalle on tyhmä',
  'läski',
  'Läski',
  'Ruma',
  'Imbesilli',
  'Debiili',
  // Finnish drug terms.
  'kannabis',
  'Hasis',
  'Piri', // judgement: blocked as a whole word (speed); Piritta and Pirkko pass
  'amfetamiini',
  'heroiini',
  'Kokaiini',
  'Narkkari',
  'Nisti',
  'Spiidi',
  'Marihuana',
  'Jointti',
  // English.
  'fuck',
  'FUCK',
  'f.u.c.k',
  'f u c k',
  'fuuuck',
  'Fück',
  'ｆｕｃｋ',
  '𝐟𝐮𝐜𝐤',
  'fuсk', // Cyrillic es
  'Motherfucker',
  'fuck you',
  'fak ju',
  'Fuk',
  'Fck',
  'Fuking',
  'shit',
  'Sh1t',
  'Bullshit',
  'bitch',
  'B1tch',
  'bastard',
  'asshole',
  'Ass',
  'A s s',
  'Dumbass',
  'Jackass',
  'cunt',
  'Cock',
  'Cocksucker',
  'Dick', // judgement: blocked; as an English first name it is practically unused by Finnish pupils
  'Dickhead',
  'Pussy',
  'Twat',
  'Wanker',
  'Whore',
  'Slut',
  'Sex',
  'Sexy',
  'Boobs',
  'Tits',
  'Porn',
  'Milf',
  'Anal',
  'Anus',
  'Rape',
  'Rapist',
  'Horny',
  'nigger',
  'n1gger',
  'Niiigger',
  'Nigga',
  'Sandnigger',
  'Negro',
  'Chink',
  'Paki',
  'Spic',
  'Kike',
  'Gypsy', // judgement: blocked (offensive to Roma)
  'faggot',
  'Fag',
  'Dyke',
  'Tranny',
  'Gay', // judgement: identity words used as playground insults are blocked as names
  'Retard',
  'Retarded',
  'Spaz',
  'Idiot',
  'Moron',
  'Stupid',
  'Loser',
  'Ugly',
  'Fatso',
  'Weed',
  'Cocaine',
  'Heroin',
  'Meth',
  'LSD',
  'MDMA',
  'Ecstasy',
  'Damn', // judgement: mild, blocked
  'WTF',
  'STFU',
  // Swedish.
  'jävla',
  'Javla',
  'jävel',
  'Fy fan',
  'helvete',
  'skit',
  'Skitstövel',
  'kuk',
  'kuksuger',
  'kuksugare',
  'Kukhuvud',
  'fitta',
  'Fittan',
  'Fittor',
  'Kukar',
  'hora',
  'Hora',
  'Horunge',
  'Slyna',
  'knulla',
  'Kåt',
  'Röv',
  'Rövhål',
  'Arsle',
  'bög',
  'Bögjävel',
  'Fjolla',
  'neger',
  'Svartskalle',
  'Blatte',
  'Zigenare',
  'Efterbliven',
  'Pucko',
  'Tjockis',
  'Knark',
  'Hasch',
  // Other languages heard in Finnish schools.
  'kurwa',
  'Kurwa',
  'Blyat',
  'Cyka blyat',
  'Pizda',
  'Scheisse',
  'Puta',
  // Nazi and hate terms.
  'hitler',
  'H1tler',
  'Adolf', // judgement: blocked as a whole word
  'Adolf Hitler',
  'sieg heil',
  'Heil',
  'natsi',
  'Nazi',
  'Neonazi',
  'Hakaristi',
  'Swastika',
  'Führer',
  'Auschwitz',
  'KKK',
  'Kalle 88',
  'Kalle1488',
  'White power',
  'Waffen-SS',
  'Kalle 69', // judgement: the sex-joke number is blocked
  'Kalle 420', // judgement: the cannabis number is blocked
  // Finnish spelling evasions: w for v, x for ks.
  'Wittu',
  'Witun',
  'Sexi',
  'Sexikäs',
  'Pedari',
  // Violence and self-harm (judgement: outside the brief, blocked).
  'Kouluampuja',
  'School shooter',
  'Itsemurha',
  'Suicide',
  'Kys',
  'Tapa itsesi',
  'Kill yourself',
  'Terroristi',
  // Staff impersonation (whole words).
  'Opettaja',
  'ope',
  'OPE',
  '0pe',
  'Ope Kalle',
  'Opettaja Ville',
  'Rehtori',
  'Teacher',
  'Admin',
  'Moderaattori',
  'Moderator',
  'Ylläpitäjä',
  'Lärare',
  'Rektor',
];

describe('offensive-word filter: innocent names pass', () => {
  it.each(INNOCENT)('%j passes', (name) => {
    expect(findOffensiveTerm(name), `matched list entry for ${name}`).toBeNull();
    expect(checkNickname(name)).toEqual({ ok: true, nickname: name });
  });

  it('has a broad innocent table', () => {
    expect(INNOCENT.length).toBeGreaterThanOrEqual(150);
    expect(new Set(INNOCENT).size).toBe(INNOCENT.length);
  });
});

describe('offensive-word filter: offensive names are blocked', () => {
  it.each(OFFENSIVE)('%j is blocked', (name) => {
    expect(findOffensiveTerm(name), `no list entry matched ${name}`).not.toBeNull();
    expect(checkNickname(name)).toEqual({ ok: false, reason: 'offensive' });
  });

  it('has a broad offensive table', () => {
    expect(OFFENSIVE.length).toBeGreaterThanOrEqual(250);
    expect(new Set(OFFENSIVE).size).toBe(OFFENSIVE.length);
  });
});
