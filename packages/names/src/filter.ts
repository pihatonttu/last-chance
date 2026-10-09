/**
 * The offensive-word matcher. Compiles src/blocklist.ts once at module load; see the
 * comment block there for how substring/word entries and the ~ and ! flags behave.
 */

import { ALLOW, CODE_TOKENS, LISTS, STAFF_NAMES } from './blocklist.ts';
import { codeTokens, collapseRuns, filterTokens, foldNordic, squeezeRuns } from './normalize.ts';

type Mode = 'substring' | 'word';
/** collapsed: runs of a letter shortened to 1 (the default); squeezed: to 2 (the ~ flag). */
type Form = 'collapsed' | 'squeezed';

interface Entry {
  /** The entry as written in the list, without flags. */
  readonly term: string;
  readonly mode: Mode;
  readonly form: Form;
  /** Normalised with å/ä/ö kept. */
  readonly kept: string;
  /** Normalised and Nordic-folded; null for !-entries, which need the real å/ä/ö. */
  readonly folded: string | null;
}

const shape = (s: string, form: Form): string => (form === 'squeezed' ? squeezeRuns(s) : collapseRuns(s));

function compile(source: string, mode: Mode): Entry {
  const flags = /^[~!]*/.exec(source)?.[0] ?? '';
  const term = source.slice(flags.length);
  const form: Form = flags.includes('~') ? 'squeezed' : 'collapsed';
  const raw = filterTokens(term).join('');
  const kept = shape(raw, form);
  if (kept.length < 2) throw new Error(`Block-list entry normalises to almost nothing: "${source}"`);
  const folded = flags.includes('!') ? null : shape(foldNordic(raw), form);
  return { term, mode, form, kept, folded };
}

const ENTRIES: readonly Entry[] = [
  ...Object.values(LISTS).flatMap((list) => [
    ...list.substring.map((s) => compile(s, 'substring')),
    ...list.word.map((s) => compile(s, 'word')),
  ]),
  ...STAFF_NAMES.map((s) => compile(s, 'word')),
];

type AllowForms = Readonly<Record<Form, readonly string[]>>;

/** Allow-list words normalised for each of the four (variant, form) combinations. */
const ALLOWED: Readonly<Record<'kept' | 'folded', AllowForms>> = (() => {
  const raws = ALLOW.map((w) => filterTokens(w).join(''));
  const build = (fold: boolean, form: Form): string[] =>
    raws.map((r) => shape(fold ? foldNordic(r) : r, form));
  return {
    kept: { collapsed: build(false, 'collapsed'), squeezed: build(false, 'squeezed') },
    folded: { collapsed: build(true, 'collapsed'), squeezed: build(true, 'squeezed') },
  };
})();

const CODES: readonly RegExp[] = CODE_TOKENS.map((source) => new RegExp(`^(?:${source})$`, 'u'));

/** Longest run of tokens joined for whole-word matching; nicknames have at most 8 tokens. */
const MAX_TOKEN_SPAN = 24;

interface Shaped {
  /** All tokens joined, then shaped. */
  readonly joined: string;
  /** Every contiguous run of tokens, joined then shaped (single tokens included). */
  readonly words: ReadonlySet<string>;
}

type Prepared = Readonly<Record<Form, Shaped>>;

function prepare(tokens: readonly string[]): Prepared {
  const build = (form: Form): Shaped => {
    const words = new Set<string>();
    for (let i = 0; i < tokens.length; i++) {
      let run = '';
      for (let j = i; j < tokens.length && j < i + MAX_TOKEN_SPAN; j++) {
        run += tokens[j];
        words.add(shape(run, form));
      }
    }
    return { joined: shape(tokens.join(''), form), words };
  };
  return { collapsed: build('collapsed'), squeezed: build('squeezed') };
}

/**
 * For ~-entries a single letter at either end of the term must not continue into a
 * longer run in the name: "kusi" must not match inside "akkusi".
 */
function runEdgesMatch(hay: string, at: number, term: string): boolean {
  const first = term[0];
  const last = term[term.length - 1];
  const startsSingle = term[1] !== first;
  const endsSingle = term[term.length - 2] !== last;
  if (startsSingle && at > 0 && hay[at - 1] === first) return false;
  const end = at + term.length;
  if (endsSingle && end < hay.length && hay[end] === last) return false;
  return true;
}

function coveredByAllow(hay: string, at: number, length: number, allows: readonly string[]): boolean {
  for (const word of allows) {
    const start = hay.indexOf(word, Math.max(0, at + length - word.length));
    if (start !== -1 && start <= at) return true;
  }
  return false;
}

function hasSubstringHit(hay: string, term: string, form: Form, allows: readonly string[]): boolean {
  for (let at = hay.indexOf(term); at !== -1; at = hay.indexOf(term, at + 1)) {
    if (form === 'squeezed' && !runEdgesMatch(hay, at, term)) continue;
    if (!coveredByAllow(hay, at, term.length, allows)) return true;
  }
  return false;
}

function matches(entry: Entry, input: Prepared, term: string, allows: AllowForms): boolean {
  const shaped = input[entry.form];
  if (entry.mode === 'word') return shaped.words.has(term);
  return hasSubstringHit(shaped.joined, term, entry.form, allows[entry.form]);
}

/**
 * The block-list entry that `name` hits, or null. Meant for nickname-sized strings.
 * Never show the result to players; it exists for tests and server logs.
 */
export function findOffensiveTerm(name: string): string | null {
  for (const token of codeTokens(name)) {
    for (let i = 0; i < CODES.length; i++) {
      if (CODES[i]?.test(token)) return CODE_TOKENS[i] ?? token;
    }
  }

  const tokens = filterTokens(name);
  if (tokens.length === 0) return null;
  const kept = prepare(tokens);
  const foldedTokens = tokens.map(foldNordic);
  const folded = foldedTokens.join('') === tokens.join('') ? kept : prepare(foldedTokens);

  for (const entry of ENTRIES) {
    if (matches(entry, kept, entry.kept, ALLOWED.kept)) return entry.term;
    if (entry.folded !== null && matches(entry, folded, entry.folded, ALLOWED.folded)) return entry.term;
  }
  return null;
}

export function isOffensive(name: string): boolean {
  return findOffensiveTerm(name) !== null;
}
