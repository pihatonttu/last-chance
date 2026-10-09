import { fi } from './fi.ts';

export type MessageKey = keyof typeof fi;
export type Params = Readonly<Record<string, string | number>>;

/** Keys that have both a `.one` and an `.other` form, without the suffix. */
export type PluralKey = {
  [K in MessageKey]: K extends `${infer Base}.one` ? (`${Base}.other` extends MessageKey ? Base : never) : never;
}[MessageKey];

const messages: Readonly<Record<string, string>> = fi;

export const LOCALE = 'fi-FI';

const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });

/** Finnish number: 1 234, 1,25. Whole numbers never show decimals. */
export function formatNumber(value: number): string {
  return Number.isInteger(value) ? integer.format(value) : decimal.format(value);
}

function interpolate(template: string, params: Params): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    if (value === undefined) return match;
    return typeof value === 'number' ? formatNumber(value) : value;
  });
}

/** Translated string for `key`, with {param} placeholders filled in. */
export function t(key: MessageKey, params?: Params): string {
  const template = messages[key];
  if (template === undefined) return key;
  return params ? interpolate(template, params) : template;
}

/** Plural form: `${base}.one` when n is exactly 1, otherwise `${base}.other`. {n} is n. */
export function tp(base: PluralKey, n: number, params?: Params): string {
  const key = `${base}.${n === 1 ? 'one' : 'other'}` as MessageKey;
  return t(key, { n, ...params });
}

/** True when a key exists; for tests and for data-driven keys. */
export function hasMessage(key: string): boolean {
  return Object.hasOwn(messages, key);
}

export function allMessageKeys(): string[] {
  return Object.keys(messages);
}
